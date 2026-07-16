import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockRespondStream } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRespondStream: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));
vi.mock("@/lib/db/queries/profile", () => ({
  getCompanionProfile: vi.fn(async () => null),
  getPrivacySettings: vi.fn(async () => null),
}));
vi.mock("@/lib/db/queries/memories", () => ({
  listApprovedActiveMemories: vi.fn(async () => []),
  markMemoriesUsedNow: vi.fn(async () => undefined),
}));
vi.mock("@/lib/db/queries/arrivals", () => ({
  listRecentArrivals: vi.fn(async () => []),
}));
vi.mock("@/lib/db/queries/adaptation", () => ({
  listAdaptivePreferences: vi.fn(async () => []),
  listPatternHypotheses: vi.fn(async () => []),
  recordAdaptiveObservation: vi.fn(async () => undefined),
  recordAdaptationCorrection: vi.fn(async () => undefined),
  recordPatternEvidence: vi.fn(async () => undefined),
}));
vi.mock("@/lib/db/queries/conversations", () => ({
  createConversation: vi.fn(async () => ({ id: "11111111-1111-4111-8111-111111111111" })),
  getConversation: vi.fn(async () => null),
  getRecentTurns: vi.fn(async () => []),
  saveTurn: vi.fn(async () => ({})),
}));
// A streaming provider we can make arbitrarily slow — never live OpenAI.
vi.mock("@/lib/ai/provider", () => ({
  getCompanionProvider: vi.fn(() => ({
    respond: vi.fn(),
    respondStream: mockRespondStream,
  })),
  supportsStreaming: () => true,
  isMockCompanion: () => true,
}));

import * as routeModule from "@/app/api/companion/stream/route";
import { resetIdempotencyForTests } from "@/lib/idempotency";
import { resetRateLimiter } from "@/lib/rate-limit";

import type { CompanionResponse } from "@/lib/ai/companion-contract";

const { POST } = routeModule;
const USER = { id: "00000000-0000-4000-8000-000000000001" };

const SLOW_RESPONSE: CompanionResponse = {
  supportMode: "celebrate",
  message: "That's real, and it's yours.",
  followUp: null,
  closingLine: null,
  suggestedStep: null,
  proposedMemory: null,
  safety: { level: "none", message: null },
  reflection: null,
  adaptationNotice: null,
  insightCandidate: null,
};

let requestCounter = 0;
function streamRequest(body: Record<string, unknown>, signal?: AbortSignal): Request {
  requestCounter += 1;
  return new Request("http://localhost/api/companion/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId: `timeout-test-${requestCounter}`, ...body }),
    ...(signal ? { signal } : {}),
  });
}

function parseEvents(text: string): string[] {
  return text
    .split("\n\n")
    .map((frame) => /event: (\S+)/.exec(frame)?.[1])
    .filter((name): name is string => Boolean(name));
}

// TEST ISOLATION: pin the mock provider regardless of local configuration.
const ORIGINAL_COMPANION_PROVIDER = process.env.COMPANION_PROVIDER;

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimiter();
  resetIdempotencyForTests();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  process.env.COMPANION_PROVIDER = "mock";
  mockGetUser.mockResolvedValue({ data: { user: USER } });
});

afterEach(() => {
  vi.useRealTimers();
  if (ORIGINAL_COMPANION_PROVIDER === undefined) {
    delete process.env.COMPANION_PROVIDER;
  } else {
    process.env.COMPANION_PROVIDER = ORIGINAL_COMPANION_PROVIDER;
  }
});

describe("streaming route duration configuration", () => {
  it("declares a 60s maximum duration on the Node.js runtime, still force-dynamic", () => {
    expect(routeModule.maxDuration).toBe(60);
    expect(routeModule.runtime).toBe("nodejs");
    expect(routeModule.dynamic).toBe("force-dynamic");
  });

  it("completes a generation lasting longer than 30 seconds (nothing aborts early)", async () => {
    vi.useFakeTimers();
    mockRespondStream.mockImplementation(
      (_input, _plan, options: { signal?: AbortSignal; onDelta?: (text: string) => void }) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            options.onDelta?.(SLOW_RESPONSE.message);
            resolve({
              response: SLOW_RESPONSE,
              metadata: { provider: "test", model: "slow", latencyMs: 31_000, retryCount: 0 },
            });
          }, 31_000); // > the old 30s expectations, < the 60s route budget
          options.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        }),
    );

    const response = await POST(streamRequest({ message: "OMG YES!!!!! We finally built it!" }));
    expect(response.status).toBe(200);
    const textPromise = response.text();
    await vi.advanceTimersByTimeAsync(31_000);
    const events = parseEvents(await textPromise);
    expect(events).toContain("start");
    expect(events).toContain("complete");
    expect(events).not.toContain("error");
  });

  it("user cancellation still aborts generation immediately (Stop is preserved)", async () => {
    vi.useFakeTimers();
    let providerSawAbort = false;
    mockRespondStream.mockImplementation(
      (_input, _plan, options: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () => {
            providerSawAbort = true;
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
          });
        }),
    );

    const userAbort = new AbortController();
    const response = await POST(
      streamRequest({ message: "OMG YES!!!!! We finally built it!" }, userAbort.signal),
    );
    expect(response.status).toBe(200);
    const textPromise = response.text();

    // The user presses Stop two (virtual) seconds in — long before 60s.
    await vi.advanceTimersByTimeAsync(2_000);
    userAbort.abort();
    await vi.advanceTimersByTimeAsync(0);

    const events = parseEvents(await textPromise);
    expect(providerSawAbort).toBe(true);
    // A quiet close: no error banner, no completed turn.
    expect(events).toContain("start");
    expect(events).not.toContain("complete");
    expect(events).not.toContain("error");
  });
});
