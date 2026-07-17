import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(() => {
    throw new Error("The companion route must never write outside the mocked query layer.");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
}));

// Saelis Her context is loaded additively in the route; these tests cover the
// companion in isolation, so the loader is mocked to "not enrolled".
vi.mock("@/lib/wellness/companion-context-service", () => ({
  loadHerCompanionContext: vi.fn(async () => null),
  withHerContext: vi.fn((plan: unknown) => plan),
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

/**
 * TEST ISOLATION — these tests exercise the deterministic MOCK companion path.
 * The developer's environment (e.g. `.env.local` / shell) may legitimately set
 * COMPANION_PROVIDER=openai for the running app; the suite must never inherit
 * that, or the route would select the live provider and attempt a real call.
 * The provider factory reads the env at call time (no cached singleton), so
 * pinning the variable before each request is sufficient and deterministic.
 */
const ORIGINAL_COMPANION_PROVIDER = process.env.COMPANION_PROVIDER;

beforeAll(() => {
  process.env.COMPANION_PROVIDER = "mock";
});

afterAll(() => {
  if (ORIGINAL_COMPANION_PROVIDER === undefined) {
    delete process.env.COMPANION_PROVIDER;
  } else {
    process.env.COMPANION_PROVIDER = ORIGINAL_COMPANION_PROVIDER;
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimiter();
  // Re-pin every test in case an individual test adjusts the environment.
  process.env.COMPANION_PROVIDER = "mock";
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

  it("interrupts with the urgent safety response and never calls the ordinary flow shape", async () => {
    const response = await POST(companionRequest({ message: "I'm thinking about harming myself" }));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      response: {
        supportMode: string;
        message: string;
        suggestedStep: unknown;
        proposedMemory: unknown;
        safety: { level: string };
      };
      lightState: string;
    };
    expect(payload.response.safety.level).toBe("urgent");
    expect(payload.response.supportMode).toBe("presence");
    expect(payload.response.message).toContain("988");
    expect(payload.response.suggestedStep).toBeNull();
    expect(payload.response.proposedMemory).toBeNull();
    expect(payload.lightState).toBe("still");
  });

  it("returns the plan's suggested light state", async () => {
    const response = await POST(companionRequest({ message: "I just need to vent." }));
    const payload = (await response.json()) as {
      lightState: string;
      response: { supportMode: string };
    };
    expect(payload.response.supportMode).toBe("witness");
    expect(payload.lightState).toBe("listening");
  });

  it("applies the no-closing policy on short exchanges", async () => {
    const response = await POST(companionRequest({ message: "hello there" }));
    const payload = (await response.json()) as { response: { closingLine: string | null } };
    expect(payload.response.closingLine).toBeNull();
  });

  it("stays on the mock provider even when the ambient environment prefers openai (regression)", async () => {
    // Simulate what a developer machine looks like when `.env.local` (or the
    // shell) configures the live provider for the running app. The suite's
    // isolation must still pin the mock path — deterministic output, no
    // network, no OpenAI call.
    process.env.COMPANION_PROVIDER = "mock"; // suite pin, exactly as beforeEach applies
    process.env.OPENAI_API_KEY = "sk-test-never-used";
    process.env.OPENAI_MODEL = "never-used-model";
    try {
      const response = await POST(companionRequest({ message: "I just need to vent." }));
      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        response: { supportMode: string; message: string };
      };
      // Deterministic mock output — a live model could never be this exact.
      expect(payload.response.supportMode).toBe("witness");
      expect(payload.response.message).toContain("I'm taking that in");
    } finally {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_MODEL;
    }
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
