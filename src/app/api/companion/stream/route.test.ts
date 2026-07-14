import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(() => {
    throw new Error("The stream route must never write outside the mocked query layer.");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
}));

vi.mock("@/lib/db/queries/profile", () => ({
  getCompanionProfile: vi.fn(async () => null),
  getPrivacySettings: vi.fn(async () => null),
}));

vi.mock("@/lib/db/queries/memories", () => ({
  listApprovedActiveMemories: vi.fn(async () => []),
}));

vi.mock("@/lib/db/queries/arrivals", () => ({
  listRecentArrivals: vi.fn(async () => []),
}));

vi.mock("@/lib/db/queries/conversations", () => ({
  createConversation: vi.fn(async () => ({ id: "11111111-1111-4111-8111-111111111111" })),
  getConversation: vi.fn(async () => null),
  getRecentTurns: vi.fn(async () => []),
  saveTurn: vi.fn(async () => ({})),
}));

import { POST } from "@/app/api/companion/stream/route";
import { companionResponseSchema } from "@/lib/ai/companion-contract";
import { createConversation, saveTurn } from "@/lib/db/queries/conversations";
import { getPrivacySettings } from "@/lib/db/queries/profile";
import { resetIdempotencyForTests } from "@/lib/idempotency";
import { resetRateLimiter } from "@/lib/rate-limit";

import type { Tables } from "@/lib/supabase/types";

const USER = { id: "00000000-0000-4000-8000-000000000001" };

let requestCounter = 0;
function nextRequestId(): string {
  requestCounter += 1;
  return `test-request-${requestCounter}`;
}

function streamRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/companion/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId: nextRequestId(), ...body }),
  });
}

interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

async function readSse(response: Response): Promise<SseEvent[]> {
  const text = await response.text();
  const events: SseEvent[] = [];
  for (const frame of text.split("\n\n")) {
    if (!frame.trim()) continue;
    let eventName = "message";
    let dataText = "";
    for (const line of frame.split("\n")) {
      if (line.startsWith("event: ")) eventName = line.slice(7).trim();
      if (line.startsWith("data: ")) dataText += line.slice(6);
    }
    if (dataText) events.push({ event: eventName, data: JSON.parse(dataText) });
  }
  return events;
}

function privacyRow(
  overrides: Partial<Tables<"user_privacy_settings">>,
): Tables<"user_privacy_settings"> {
  return {
    user_id: USER.id,
    save_conversation_history: true,
    allow_companion_memory: true,
    allow_product_analytics: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrivacySettings).mockResolvedValue(null); // defaults: history + memory on
  resetRateLimiter();
  resetIdempotencyForTests();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  delete process.env.COMPANION_PROVIDER; // default: mock
  mockGetUser.mockResolvedValue({ data: { user: USER } });
});

describe("POST /api/companion/stream", () => {
  it("requires authentication", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(streamRequest({ message: "hello" }));
    expect(response.status).toBe(401);
  });

  it("rejects invalid input (missing request id)", async () => {
    const response = await POST(
      new Request("http://localhost/api/companion/stream", {
        method: "POST",
        body: JSON.stringify({ message: "hello" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects oversized requests", async () => {
    const response = await POST(streamRequest({ message: "x".repeat(40_000) }));
    expect(response.status).toBe(413);
  });

  it("streams start, delta, and a validated complete event with correct headers", async () => {
    const response = await POST(streamRequest({ message: "I just need to vent." }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(response.headers.get("Cache-Control")).toContain("no-cache");

    const events = await readSse(response);
    expect(events[0]?.event).toBe("start");
    expect(events.some((event) => event.event === "delta")).toBe(true);

    const complete = events.find((event) => event.event === "complete");
    expect(complete).toBeDefined();
    expect(companionResponseSchema.safeParse(complete?.data.response).success).toBe(true);
    expect((complete?.data.response as { supportMode: string }).supportMode).toBe("witness");
    expect(complete?.data.lightState).toBe("listening");
    expect(complete?.data.conversationId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("persists both turns only after completion when history is enabled", async () => {
    await readSse(await POST(streamRequest({ message: "hello there" })));
    expect(createConversation).toHaveBeenCalledTimes(1);
    expect(saveTurn).toHaveBeenCalledTimes(2);
    const roles = vi.mocked(saveTurn).mock.calls.map(([, turn]) => turn.role);
    expect(roles).toEqual(["user", "assistant"]);
  });

  it("persists nothing when history is disabled", async () => {
    vi.mocked(getPrivacySettings).mockResolvedValue(
      privacyRow({ save_conversation_history: false }),
    );
    const events = await readSse(await POST(streamRequest({ message: "hello there" })));
    expect(events.some((event) => event.event === "complete")).toBe(true);
    expect(createConversation).not.toHaveBeenCalled();
    expect(saveTurn).not.toHaveBeenCalled();
  });

  it("never auto-saves a proposed memory", async () => {
    const events = await readSse(
      await POST(streamRequest({ message: "Please remember that my dog is named Bo." })),
    );
    const complete = events.find((event) => event.event === "complete");
    const companion = complete?.data.response as { proposedMemory: { content: string } | null };
    expect(companion.proposedMemory).not.toBeNull();
    // No write outside the (turn-only) mocked query layer occurred.
    expect(mockFrom).not.toHaveBeenCalled();
    const roles = vi.mocked(saveTurn).mock.calls.map(([, turn]) => turn.role);
    expect(roles).toEqual(["user", "assistant"]);
  });

  it("bypasses ordinary generation for urgent safety", async () => {
    const events = await readSse(
      await POST(streamRequest({ message: "I'm thinking about harming myself." })),
    );
    const complete = events.find((event) => event.event === "complete");
    const companion = complete?.data.response as {
      safety: { level: string };
      message: string;
      closingLine: string | null;
      proposedMemory: unknown;
    };
    expect(companion.safety.level).toBe("urgent");
    expect(companion.message).toContain("988");
    expect(companion.closingLine).toBeNull();
    expect(companion.proposedMemory).toBeNull();
    expect(complete?.data.lightState).toBe("still");
  });

  it("rejects a duplicate request id", async () => {
    const requestId = "duplicate-request-id-1";
    await readSse(
      await POST(
        new Request("http://localhost/api/companion/stream", {
          method: "POST",
          body: JSON.stringify({ message: "hello there", requestId }),
        }),
      ),
    );
    const second = await POST(
      new Request("http://localhost/api/companion/stream", {
        method: "POST",
        body: JSON.stringify({ message: "hello there", requestId }),
      }),
    );
    expect(second.status).toBe(409);
  });

  it("rate limits rapid-fire requests", async () => {
    let lastStatus = 200;
    for (let index = 0; index < 25; index += 1) {
      const response = await POST(streamRequest({ message: `message ${index}` }));
      lastStatus = response.status;
      if (response.status === 200) await response.text();
    }
    expect(lastStatus).toBe(429);
  });
});
