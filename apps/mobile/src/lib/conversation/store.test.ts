import { describe, expect, it, vi } from "vitest";
import type { ConversationTurn } from "@saelis/shared";

import { createConversationStore } from "./store";
import type { SendStreamHandlers, SendStreamParams } from "./store";

type StreamScript = (params: SendStreamParams, handlers: SendStreamHandlers) => Promise<void>;

function makeStore(script: StreamScript) {
  const sendStream = vi.fn(script);
  const store = createConversationStore({ sendStream, onChange: () => undefined });
  return { store, sendStream };
}

const happyStream: StreamScript = async (params, { onEvent }) => {
  onEvent({ type: "start", data: { requestId: params.requestId } });
  onEvent({ type: "delta", data: { text: "Hel" } });
  onEvent({ type: "delta", data: { text: "lo" } });
  onEvent({
    type: "complete",
    data: { conversationId: "conv-1", response: { message: "Hello" } },
  });
};

describe("conversation store — sending", () => {
  it("streams deltas into an assistant message and finalizes on complete", async () => {
    const { store } = makeStore(happyStream);

    const accepted = await store.send("hi there");

    expect(accepted).toBe(true);
    const state = store.getState();
    expect(state.conversationId).toBe("conv-1");
    expect(state.phase).toBe("idle");
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]).toMatchObject({
      role: "user",
      content: "hi there",
      status: "complete",
    });
    expect(state.messages[1]).toMatchObject({
      role: "assistant",
      content: "Hello",
      status: "complete",
    });
  });

  it("prevents blank submissions", async () => {
    const { store, sendStream } = makeStore(happyStream);

    expect(await store.send("   ")).toBe(false);
    expect(sendStream).not.toHaveBeenCalled();
    expect(store.getState().messages).toHaveLength(0);
  });

  it("prevents duplicate sends while a generation is in flight", async () => {
    let release: () => void = () => undefined;
    const { store, sendStream } = makeStore(async (params, { onEvent }) => {
      onEvent({ type: "start", data: { requestId: params.requestId } });
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      onEvent({
        type: "complete",
        data: { conversationId: "conv-1", response: { message: "Done" } },
      });
    });

    const first = store.send("first");
    expect(await store.send("second")).toBe(false);
    release();
    await first;

    expect(sendStream).toHaveBeenCalledTimes(1);
    expect(store.getState().messages.filter((m) => m.role === "user")).toHaveLength(1);
  });

  it("uses a fresh requestId per attempt (server treats reuse as duplicate)", async () => {
    const { store, sendStream } = makeStore(async () => {
      throw new Error("boom");
    });

    await store.send("try one");
    await store.retry();

    expect(sendStream).toHaveBeenCalledTimes(2);
    const firstId = (sendStream.mock.calls[0]?.[0] as SendStreamParams).requestId;
    const secondId = (sendStream.mock.calls[1]?.[0] as SendStreamParams).requestId;
    expect(firstId).not.toBe(secondId);
    expect(firstId).toMatch(/^[a-zA-Z0-9-]{8,64}$/);
    expect(secondId).toMatch(/^[a-zA-Z0-9-]{8,64}$/);
  });
});

describe("conversation store — temporary mode", () => {
  it("sends temporary: false by default and true after enabling", async () => {
    const { store, sendStream } = makeStore(happyStream);

    await store.send("normal");
    expect((sendStream.mock.calls[0]?.[0] as SendStreamParams).temporary).toBe(false);

    store.setTemporaryMode(true);
    expect(store.getState().temporaryMode).toBe(true);
    await store.send("private thought");
    expect((sendStream.mock.calls[1]?.[0] as SendStreamParams).temporary).toBe(true);

    store.setTemporaryMode(false);
    await store.send("back to normal");
    expect((sendStream.mock.calls[2]?.[0] as SendStreamParams).temporary).toBe(false);
  });
});

describe("conversation store — failure and retry", () => {
  it("preserves partial streamed text when generation fails midway", async () => {
    const { store } = makeStore(async (params, { onEvent }) => {
      onEvent({ type: "start", data: { requestId: params.requestId } });
      onEvent({ type: "delta", data: { text: "A partial thou" } });
      onEvent({
        type: "error",
        data: { code: "provider", message: "Saelis had trouble responding.", retryable: true },
      });
    });

    await store.send("hello");

    const state = store.getState();
    expect(state.error).toBe("Saelis had trouble responding.");
    expect(state.canRetry).toBe(true);
    const assistant = state.messages.find((m) => m.role === "assistant");
    expect(assistant).toMatchObject({ content: "A partial thou", status: "failed" });
    const user = state.messages.find((m) => m.role === "user");
    expect(user?.status).toBe("failed");
  });

  it("marks the user message failed (distinct from sent) when nothing streamed", async () => {
    const { store } = makeStore(async () => {
      throw new Error("Network request failed");
    });

    await store.send("hello");

    const state = store.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({ role: "user", status: "failed" });
    expect(state.canRetry).toBe(true);
  });

  it("retry removes the failed exchange first — no duplicate messages", async () => {
    let attempts = 0;
    const { store } = makeStore(async (params, handlers) => {
      attempts += 1;
      if (attempts === 1) {
        handlers.onEvent({ type: "delta", data: { text: "partial" } });
        throw new Error("boom");
      }
      await happyStream(params, handlers);
    });

    await store.send("hello again");
    expect(store.getState().messages).toHaveLength(2);

    const ok = await store.retry();

    expect(ok).toBe(true);
    const state = store.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]).toMatchObject({
      role: "user",
      content: "hello again",
      status: "complete",
    });
    expect(state.messages[1]).toMatchObject({ role: "assistant", content: "Hello" });
    expect(state.error).toBeNull();
  });

  it("refuses retry when there is nothing to retry", async () => {
    const { store } = makeStore(happyStream);
    await store.send("fine");
    expect(await store.retry()).toBe(false);
  });
});

describe("conversation store — cancellation", () => {
  it("cancel aborts the stream and preserves partial text as stopped", async () => {
    const { store } = makeStore(async (params, { onEvent, signal }) => {
      onEvent({ type: "start", data: { requestId: params.requestId } });
      onEvent({ type: "delta", data: { text: "Partial ans" } });
      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    const sending = store.send("stop me");
    // Let the stream deliver its first events.
    await new Promise((resolve) => setTimeout(resolve, 0));
    store.cancel();
    await sending;

    const state = store.getState();
    expect(state.phase).toBe("idle");
    expect(state.error).toBeNull(); // user chose to stop — no error banner
    const assistant = state.messages.find((m) => m.role === "assistant");
    expect(assistant).toMatchObject({ content: "Partial ans", status: "cancelled" });
    expect(state.canRetry).toBe(true);
  });
});

describe("conversation store — ordering and restore", () => {
  it("loads history in deterministic createdAt order", () => {
    const { store } = makeStore(happyStream);
    const turns: ConversationTurn[] = [
      {
        id: "t2",
        conversationId: "c",
        role: "assistant",
        content: "Hi.",
        supportMode: null,
        createdAt: "2026-07-17T10:00:01Z",
      },
      {
        id: "t1",
        conversationId: "c",
        role: "user",
        content: "Hello?",
        supportMode: null,
        createdAt: "2026-07-17T10:00:00Z",
      },
      {
        id: "t3",
        conversationId: "c",
        role: "system",
        content: "internal",
        supportMode: null,
        createdAt: "2026-07-17T10:00:02Z",
      },
    ];

    store.loadConversation("c", turns);

    const state = store.getState();
    expect(state.conversationId).toBe("c");
    expect(state.messages.map((m) => m.localId)).toEqual(["t1", "t2"]); // system filtered
    expect(state.messages[0]?.role).toBe("user");
  });

  it("appends new exchanges after restored history in order", async () => {
    const { store } = makeStore(happyStream);
    store.loadConversation("c", [
      {
        id: "t1",
        conversationId: "c",
        role: "user",
        content: "Earlier",
        supportMode: null,
        createdAt: "2026-07-17T10:00:00Z",
      },
      {
        id: "t2",
        conversationId: "c",
        role: "assistant",
        content: "Yes.",
        supportMode: null,
        createdAt: "2026-07-17T10:00:01Z",
      },
    ]);

    await store.send("and now");

    const contents = store.getState().messages.map((m) => m.content);
    expect(contents).toEqual(["Earlier", "Yes.", "and now", "Hello"]);
  });

  it("startNew clears state for a fresh conversation", async () => {
    const { store } = makeStore(happyStream);
    await store.send("hello");

    store.startNew();

    expect(store.getState()).toMatchObject({
      conversationId: null,
      messages: [],
      phase: "idle",
      error: null,
    });
  });
});
