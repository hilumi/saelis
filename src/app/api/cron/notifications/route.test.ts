import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockClaimDelivery,
  mockHasProactive,
  mockMarkOutcome,
  mockRevoke,
  mockSendExpoPush,
  mockAdmin,
} = vi.hoisted(() => {
  const mockAdmin = {
    from: vi.fn(),
  };
  return {
    mockClaimDelivery: vi.fn(),
    mockHasProactive: vi.fn(),
    mockMarkOutcome: vi.fn(async () => undefined),
    mockRevoke: vi.fn(async () => undefined),
    mockSendExpoPush: vi.fn(async () => ({ status: "ok", tokenExpired: false })),
    mockAdmin,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

vi.mock("@/lib/db/queries/notifications", () => ({
  claimDelivery: mockClaimDelivery,
  hasProactiveDeliveryToday: mockHasProactive,
  markDeliveryOutcome: mockMarkOutcome,
  revokePushToken: mockRevoke,
}));

vi.mock("@/lib/notifications/expo-push", () => ({
  sendExpoPush: mockSendExpoPush,
}));

vi.mock("@/lib/analytics/record", () => ({
  recordNotificationAnalyticsEvent: vi.fn(async () => ({ recorded: true })),
  recordSystemAnalyticsEvent: vi.fn(async () => ({ recorded: true })),
}));

import { GET, POST } from "@/app/api/cron/notifications/route";
import type { NextRequest } from "next/server";

/** Prefs row that decides "send" at the frozen time below (09:30 UTC). */
const SENDABLE_PREFS = {
  user_id: "user-1",
  enabled: true,
  gentle_check_ins: true,
  wellness_reminders: false,
  evening_reflections: false,
  user_reminders: true,
  preferred_time_minutes: 9 * 60,
  timezone: "UTC",
  quiet_hours_start_minutes: 21 * 60,
  quiet_hours_end_minutes: 8 * 60,
  preview_mode: "private",
  proactive_frequency: "daily",
};

/** Chainable, awaitable fake for the two admin table reads in the route. */
function stubAdminTables(prefsRows: unknown[], tokenRows: unknown[]) {
  mockAdmin.from.mockImplementation((table: string) => {
    const result =
      table === "companion_notification_preferences"
        ? { data: prefsRows, error: null }
        : { data: tokenRows, error: null };
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is"]) {
      chain[method] = () => chain;
    }
    chain.limit = () => Promise.resolve(result);
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return chain;
  });
}

function cronRequest(authorization?: string): NextRequest {
  return new Request("https://example.com/api/cron/notifications", {
    method: "GET",
    headers: authorization ? { Authorization: authorization } : {},
  }) as unknown as NextRequest;
}

describe("GET /api/cron/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "cron-secret-1");
    // Wednesday 2026-07-15, 09:30 UTC — inside the send window for 09:00.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 15, 9, 30)));
    stubAdminTables([SENDABLE_PREFS], [{ id: "tok-1", token: "ExponentPushToken[a]" }]);
    mockHasProactive.mockResolvedValue(false);
    mockClaimDelivery.mockResolvedValue({ claimed: true, deliveryId: "d-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("succeeds with the authenticated GET Vercel Cron sends", async () => {
    const response = await GET(cronRequest("Bearer cron-secret-1"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; sent: number };
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(mockSendExpoPush).toHaveBeenCalledTimes(1);
  });

  it("rejects a GET with no authorization", async () => {
    const response = await GET(cronRequest());
    expect(response.status).toBe(401);
    expect(mockSendExpoPush).not.toHaveBeenCalled();
  });

  it("rejects a GET with an invalid bearer token", async () => {
    const response = await GET(cronRequest("Bearer wrong-secret"));
    expect(response.status).toBe(401);
    expect(mockSendExpoPush).not.toHaveBeenCalled();
  });

  it("returns 503 (never runs) when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await GET(cronRequest("Bearer anything"));
    expect(response.status).toBe(503);
  });

  it("stays idempotent across duplicate invocations (one send per user per day)", async () => {
    // First run delivers and records the delivery…
    mockHasProactive.mockResolvedValueOnce(false).mockResolvedValue(true);

    const first = await GET(cronRequest("Bearer cron-secret-1"));
    const second = await GET(cronRequest("Bearer cron-secret-1"));

    expect(((await first.json()) as { sent: number }).sent).toBe(1);
    expect(((await second.json()) as { sent: number }).sent).toBe(0);
    expect(mockSendExpoPush).toHaveBeenCalledTimes(1);
  });

  it("cannot double-send even when runs race past the daily check (claim loses)", async () => {
    // Both runs see "nothing sent today", but the unique idempotency claim
    // succeeds only once.
    mockHasProactive.mockResolvedValue(false);
    mockClaimDelivery
      .mockResolvedValueOnce({ claimed: true, deliveryId: "d-1" })
      .mockResolvedValue({ claimed: false, deliveryId: null });

    await GET(cronRequest("Bearer cron-secret-1"));
    const second = await GET(cronRequest("Bearer cron-secret-1"));

    expect(((await second.json()) as { sent: number }).sent).toBe(0);
    expect(mockSendExpoPush).toHaveBeenCalledTimes(1);
  });

  it("POST delegates to the same secured handler (local testing)", async () => {
    const ok = await POST(cronRequest("Bearer cron-secret-1"));
    expect(ok.status).toBe(200);
    const denied = await POST(cronRequest("Bearer wrong"));
    expect(denied.status).toBe(401);
  });
});
