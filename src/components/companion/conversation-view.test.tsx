import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConversationView, drainSseBuffer } from "@/components/companion/conversation-view";

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseResponse(frames: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

const COMPLETE_RESPONSE = {
  supportMode: "witness",
  message: "Hello there.",
  followUp: null,
  closingLine: "Be gentle with what this asked of you.",
  suggestedStep: null,
  proposedMemory: { category: "shared-context", content: "A kept fact", reason: "You asked." },
  safety: { level: "none", message: null },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe("drainSseBuffer", () => {
  it("parses complete frames and keeps the remainder", () => {
    const { events, rest } = drainSseBuffer(
      `${sse("start", { requestId: "r" })}event: delta\ndata: {"text":"partial`,
    );
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe("start");
    expect(rest).toContain("partial");
  });
});

describe("ConversationView streaming", () => {
  const approveMemory = vi.fn(async () => ({ ok: true as const }));

  it("streams text, finalizes the response, and offers memory consent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          sse("start", { requestId: "r1" }),
          sse("delta", { text: "Hello " }),
          sse("delta", { text: "there." }),
          sse("complete", {
            conversationId: "22222222-2222-4222-8222-222222222222",
            response: COMPLETE_RESPONSE,
            lightState: "listening",
          }),
        ]),
      ),
    );

    const user = userEvent.setup();
    render(<ConversationView approveMemoryAction={approveMemory} />);
    await user.type(screen.getByLabelText("Your message"), "I just need to vent.");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Hello there.")).toBeInTheDocument();
    expect(screen.getByText("Be gentle with what this asked of you.")).toBeInTheDocument();
    // Memory consent UI appears only because the validated response permitted it.
    expect(screen.getByRole("group", { name: "Memory proposal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, remember this" })).toBeInTheDocument();
    // The composer cleared after a successful send.
    expect(screen.getByLabelText("Your message")).toHaveValue("");
  });

  it("shows a calm error, preserves the draft, and offers retry on stream failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          sse("start", { requestId: "r2" }),
          sse("error", {
            code: "provider-unavailable",
            message: "I couldn't meet you clearly in that moment. Please try once more.",
            retryable: true,
          }),
        ]),
      ),
    );

    const user = userEvent.setup();
    render(<ConversationView approveMemoryAction={approveMemory} />);
    await user.type(screen.getByLabelText("Your message"), "hello there");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("I couldn't meet you clearly in that moment. Please try once more."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    // Draft preserved — nothing the user wrote was lost.
    expect(screen.getByLabelText("Your message")).toHaveValue("hello there");
    // No technical details leak.
    expect(screen.queryByText(/provider-unavailable/)).not.toBeInTheDocument();
  });

  it("shows the calm rejection message when the request is refused before streaming", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: "Saelis needs a brief pause before responding again." }),
            {
              status: 429,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );

    const user = userEvent.setup();
    render(<ConversationView approveMemoryAction={approveMemory} />);
    await user.type(screen.getByLabelText("Your message"), "hello there");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Saelis needs a brief pause before responding again."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Your message")).toHaveValue("hello there");
  });
});

describe("ConversationView reliability (v0.8)", () => {
  const approveMemory = vi.fn(async () => ({ ok: true as const }));

  it("offline: sends nothing, keeps the draft, says so calmly", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);

    const user = userEvent.setup();
    render(<ConversationView approveMemoryAction={approveMemory} />);
    await user.type(screen.getByLabelText("Your message"), "still here");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText(/You look offline right now/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Your message")).toHaveValue("still here");
  });

  it("network failure mid-request reads as connectivity, never a raw error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    const user = userEvent.setup();
    render(<ConversationView approveMemoryAction={approveMemory} />);
    await user.type(screen.getByLabelText("Your message"), "hello there");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText(/You look offline right now/)).toBeInTheDocument();
    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your message")).toHaveValue("hello there");
  });

  it("expired session offers sign-in instead of retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "Please sign in to talk with Saelis." }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    const user = userEvent.setup();
    render(<ConversationView approveMemoryAction={approveMemory} />);
    await user.type(screen.getByLabelText("Your message"), "hello there");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText(/Your session ended/)).toBeInTheDocument();
    const signIn = screen.getByRole("link", { name: "Sign in again" });
    expect(signIn).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your message")).toHaveValue("hello there");
  });

  it("offers the v0.8 'Not quite' categories without storing any text", async () => {
    const feedback = vi.fn(async () => ({ ok: true as const }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sseResponse([
          sse("start", { requestId: "r9" }),
          sse("delta", { text: "Hello there." }),
          sse("complete", {
            conversationId: "22222222-2222-4222-8222-222222222222",
            response: { ...COMPLETE_RESPONSE, proposedMemory: null },
            lightState: "listening",
          }),
        ]),
      ),
    );

    const user = userEvent.setup();
    render(<ConversationView approveMemoryAction={approveMemory} feedbackAction={feedback} />);
    await user.type(screen.getByLabelText("Your message"), "hello there");
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Hello there.");

    await user.click(screen.getByRole("button", { name: "Not quite" }));
    for (const label of [
      "Too soft",
      "Too direct",
      "Too long",
      "Too generic",
      "Missed what I needed",
      "Humor didn't land",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    await user.click(screen.getByRole("button", { name: "Too direct" }));
    expect(feedback).toHaveBeenCalledWith({ helpful: false, category: "too-direct" });
  });
});
