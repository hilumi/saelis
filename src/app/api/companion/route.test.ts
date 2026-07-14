import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(() => {
    throw new Error("The companion route must never write outside the mocked query layer.");
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

vi.mock("@/lib/db/queries/conversations", () => ({
  createConversation: vi.fn(async () => ({ id: "11111111-1111-4111-8111-111111111111" })),
  getConversation: vi.fn(async () => null),
  getRecentTurns: vi.fn(async () => []),
  saveTurn: vi.fn(async () => ({})),
}));

import { POST } from "@/app/api/companion/route";
import { companionResponseSchema } from "@/lib/ai/companion-contract";
import { createConversation, saveTurn } from "@/lib/db/queries/conversations";
import { getPrivacySettings } from "@/lib/db/queries/profile";
import { resetRateLimiter } from "@/lib/rate-limit";

import type { Tables } from "@/lib/supabase/types";

const USER = { id: "00000000-0000-4000-8000-000000000001" };

function companionRequest(body: unknown): Request {
  return new Request("http://localhost/api/companion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
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
  resetRateLimiter();
  // The route checks for Supabase configuration before authenticating.
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  mockGetUser.mockResolvedValue({ data: { user: USER } });
});

describe("POST /api/companion", () => {
  it("rejects unauthenticated requests with 401", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(companionRequest({ message: "hello" }));
    expect(response.status).toBe(401);
    expect(saveTurn).not.toHaveBeenCalled();
  });

  it("rejects an invalid body with 400", async () => {
    const response = await POST(companionRequest({ message: "" }));
    expect(response.status).toBe(400);
    expect(saveTurn).not.toHaveBeenCalled();
  });

  it("rejects unreadable JSON with 400", async () => {
    const response = await POST(
      new Request("http://localhost/api/companion", { method: "POST", body: "{broken" }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects oversized requests with 413", async () => {
    const response = await POST(companionRequest({ message: "x".repeat(40_000) }));
    expect(response.status).toBe(413);
  });

  it("returns a contract-valid mock response and saves both turns", async () => {
    const response = await POST(companionRequest({ message: "I'm overwhelmed, too much to do" }));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { conversationId: string; response: unknown };
    expect(companionResponseSchema.safeParse(payload.response).success).toBe(true);
    expect(payload.conversationId).toBe("11111111-1111-4111-8111-111111111111");
    expect(createConversation).toHaveBeenCalledTimes(1);
    expect(saveTurn).toHaveBeenCalledTimes(2);
  });

  it("never auto-saves a proposed memory", async () => {
    const response = await POST(companionRequest({ message: "please remember that my dog is Bo" }));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      response: { proposedMemory: { content: string } | null };
    };
    // The proposal is returned to the client for explicit user approval…
    expect(payload.response.proposedMemory).not.toBeNull();
    // …and no write happens outside the (turn-only) query layer.
    expect(mockFrom).not.toHaveBeenCalled();
    const savedRoles = vi.mocked(saveTurn).mock.calls.map(([, turn]) => turn.role);
    expect(savedRoles).toEqual(["user", "assistant"]);
  });

  it("saves nothing when conversation history is turned off", async () => {
    vi.mocked(getPrivacySettings).mockResolvedValue(
      privacyRow({ save_conversation_history: false }),
    );
    const response = await POST(companionRequest({ message: "hello there" }));
    expect(response.status).toBe(200);
    expect(createConversation).not.toHaveBeenCalled();
    expect(saveTurn).not.toHaveBeenCalled();
  });

  it("rate limits rapid-fire requests with 429", async () => {
    let lastStatus = 200;
    for (let i = 0; i < 25; i += 1) {
      const response = await POST(companionRequest({ message: `message ${i}` }));
      lastStatus = response.status;
    }
    expect(lastStatus).toBe(429);
  });
});
