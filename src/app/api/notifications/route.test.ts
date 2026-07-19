import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockResolveRequestAuth, mockUpsertToken, mockDeleteToken, mockUpsertPrefs, mockGetPrefs } =
  vi.hoisted(() => ({
    mockResolveRequestAuth: vi.fn(),
    mockUpsertToken: vi.fn(async () => undefined),
    mockDeleteToken: vi.fn(async () => undefined),
    mockUpsertPrefs: vi.fn(async () => undefined),
    mockGetPrefs: vi.fn(async () => null),
  }));

vi.mock("@/lib/supabase/request-auth", () => ({
  resolveRequestAuth: mockResolveRequestAuth,
}));

vi.mock("@/lib/db/queries/notifications", () => ({
  upsertPushToken: mockUpsertToken,
  deletePushToken: mockDeleteToken,
  getNotificationPreferences: mockGetPrefs,
  upsertNotificationPreferences: mockUpsertPrefs,
  listActivePushTokens: vi.fn(async () => []),
}));

vi.mock("@/lib/analytics/record", () => ({
  recordAuthenticatedAnalyticsEvent: vi.fn(async () => ({ recorded: true })),
}));

import { DELETE as deleteToken, POST as postToken } from "@/app/api/notifications/tokens/route";
import { GET as getPrefs, PUT as putPrefs } from "@/app/api/notifications/preferences/route";
import { resetRateLimiter } from "@/lib/rate-limit";

function request(body: unknown, method = "POST"): Request {
  return new Request("https://example.com/api/notifications/tokens", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const VALID_PREFS = {
  enabled: true,
  gentleCheckIns: true,
  wellnessReminders: false,
  eveningReflections: false,
  userReminders: true,
  preferredTimeMinutes: 540,
  timezone: "America/Chicago",
  quietHoursStartMinutes: 1260,
  quietHoursEndMinutes: 480,
  previewMode: "private",
  proactiveFrequency: "daily",
};

describe("notification API routes", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable");
    resetRateLimiter();
    mockResolveRequestAuth.mockResolvedValue({
      supabase: {},
      user: { id: "user-1" },
    });
    vi.clearAllMocks();
    mockResolveRequestAuth.mockResolvedValue({ supabase: {}, user: { id: "user-1" } });
  });

  it("rejects unauthenticated token registration with 401", async () => {
    mockResolveRequestAuth.mockResolvedValue({ supabase: {}, user: null });
    const response = await postToken(request({ token: "ExponentPushToken[abc]" }));
    expect(response.status).toBe(401);
    expect(mockUpsertToken).not.toHaveBeenCalled();
  });

  it("registers a token for the verified user only (no client-supplied id)", async () => {
    const response = await postToken(
      request({ token: "ExponentPushToken[abc]", platform: "ios", userId: "someone-else" }),
    );
    expect(response.status).toBe(200);
    expect(mockUpsertToken).toHaveBeenCalledWith({}, "user-1", "ExponentPushToken[abc]", "ios");
  });

  it("rejects malformed token payloads", async () => {
    const response = await postToken(request({ token: "x" }));
    expect(response.status).toBe(400);
  });

  it("removes a token for the verified user (sign-out path)", async () => {
    const response = await deleteToken(request({ token: "ExponentPushToken[abc]" }, "DELETE"));
    expect(response.status).toBe(200);
    expect(mockDeleteToken).toHaveBeenCalledWith({}, "user-1", "ExponentPushToken[abc]");
  });

  it("rejects unauthenticated preference reads and writes", async () => {
    mockResolveRequestAuth.mockResolvedValue({ supabase: {}, user: null });
    expect((await getPrefs(request(undefined, "GET"))).status).toBe(401);
    expect((await putPrefs(request(VALID_PREFS, "PUT"))).status).toBe(401);
  });

  it("returns opt-in defaults when nothing is saved (enabled: false)", async () => {
    const response = await getPrefs(request(undefined, "GET"));
    const body = (await response.json()) as { preferences: { enabled: boolean } };
    expect(body.preferences.enabled).toBe(false);
  });

  it("saves valid preferences and rejects unknown timezones", async () => {
    expect((await putPrefs(request(VALID_PREFS, "PUT"))).status).toBe(200);
    expect(mockUpsertPrefs).toHaveBeenCalled();
    const bad = await putPrefs(request({ ...VALID_PREFS, timezone: "Not/AZone" }, "PUT"));
    expect(bad.status).toBe(400);
  });
});
