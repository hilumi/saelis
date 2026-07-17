import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/db/queries/profile", () => ({ getPrivacySettings: vi.fn() }));

import {
  recordAnalyticsEvent,
  recordAuthenticatedAnalyticsEvent,
  recordSafetyAnalyticsEvent,
  resetAnalyticsDedupeForTests,
} from "@/lib/analytics/record";
import { getPrivacySettings } from "@/lib/db/queries/profile";
import { resetRateLimiter } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const USER_ID = "00000000-0000-4000-8000-000000000001";

type InsertedRow = Record<string, unknown>;

function mockAdmin(inserted: InsertedRow[]) {
  return {
    from: vi.fn(() => ({
      insert: vi.fn(async (row: InsertedRow) => {
        inserted.push(row);
        return { error: null };
      }),
    })),
  };
}

function mockUserClient() {
  return {} as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetAnalyticsDedupeForTests();
  resetRateLimiter();
});

describe("recordAnalyticsEvent", () => {
  it("records a validated event with the SERVER-derived user id", async () => {
    const inserted: InsertedRow[] = [];
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin(inserted) as never);
    const result = await recordAnalyticsEvent(USER_ID, {
      eventName: "meal_logged",
      metadata: { meal_type: "lunch" },
    });
    expect(result).toEqual({ recorded: true });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]?.user_id).toBe(USER_ID);
    expect(inserted[0]?.event_name).toBe("meal_logged");
  });

  it("rejects server-authoritative events from a client source", async () => {
    const inserted: InsertedRow[] = [];
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin(inserted) as never);
    const result = await recordAnalyticsEvent(USER_ID, {
      eventName: "safety_tier_urgent_support",
      source: "web",
      metadata: { reason_category: "pain", day_bucket: "2026-07-16" },
    });
    expect(result).toEqual({ recorded: false, reason: "server_only_event" });
    expect(inserted).toHaveLength(0);
  });

  it("rejects invalid metadata and never throws", async () => {
    const inserted: InsertedRow[] = [];
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin(inserted) as never);
    const result = await recordAnalyticsEvent(USER_ID, {
      eventName: "meal_logged",
      metadata: { meal_description: "chicken and rice" },
    });
    expect(result.recorded).toBe(false);
    expect(inserted).toHaveLength(0);
  });

  it("deduplicates via dedupeKey", async () => {
    const inserted: InsertedRow[] = [];
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin(inserted) as never);
    const input = {
      eventName: "milestone_achieved" as const,
      metadata: { milestone_type: "x" },
      dedupeKey: "m:1",
    };
    expect((await recordAnalyticsEvent(USER_ID, input)).recorded).toBe(true);
    expect(await recordAnalyticsEvent(USER_ID, input)).toEqual({
      recorded: false,
      reason: "duplicate",
    });
    expect(inserted).toHaveLength(1);
  });

  it("applies the per-user rate limit", async () => {
    const inserted: InsertedRow[] = [];
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin(inserted) as never);
    let limited = 0;
    for (let index = 0; index < 70; index += 1) {
      const result = await recordAnalyticsEvent(USER_ID, {
        eventName: "meal_logged",
        metadata: {},
      });
      if (!result.recorded && result.reason === "rate_limited") limited += 1;
    }
    expect(limited).toBeGreaterThan(0);
    expect(inserted.length).toBeLessThanOrEqual(60);
  });

  it("is a safe no-op when the service-role key is unavailable", async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error("no key");
    });
    const result = await recordAnalyticsEvent(USER_ID, { eventName: "meal_logged", metadata: {} });
    expect(result).toEqual({ recorded: false, reason: "analytics_unconfigured" });
  });
});

describe("recordAuthenticatedAnalyticsEvent (opt-in rule)", () => {
  it("records nothing when the user has not allowed product analytics", async () => {
    const inserted: InsertedRow[] = [];
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin(inserted) as never);
    vi.mocked(getPrivacySettings).mockResolvedValue({
      allow_product_analytics: false,
    } as never);
    const result = await recordAuthenticatedAnalyticsEvent(mockUserClient(), USER_ID, {
      eventName: "meal_logged",
      metadata: {},
    });
    expect(result).toEqual({ recorded: false, reason: "analytics_not_allowed" });
    expect(inserted).toHaveLength(0);
  });

  it("records with the server-derived identity when allowed", async () => {
    const inserted: InsertedRow[] = [];
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin(inserted) as never);
    vi.mocked(getPrivacySettings).mockResolvedValue({ allow_product_analytics: true } as never);
    const result = await recordAuthenticatedAnalyticsEvent(mockUserClient(), USER_ID, {
      eventName: "meal_logged",
      metadata: { meal_type: "dinner" },
    });
    expect(result).toEqual({ recorded: true });
    expect(inserted[0]?.user_id).toBe(USER_ID);
  });
});

describe("recordSafetyAnalyticsEvent", () => {
  it("stores only the tier, one broad category, module, and day bucket", async () => {
    const inserted: InsertedRow[] = [];
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin(inserted) as never);
    vi.mocked(getPrivacySettings).mockResolvedValue({ allow_product_analytics: true } as never);
    const result = await recordSafetyAnalyticsEvent(
      mockUserClient(),
      USER_ID,
      { tier: "recovery_only", reasonCodes: ["heavy_bleeding", "moderate_pain"] },
      ["restore"],
      "2026-07-16",
    );
    expect(result).toEqual({ recorded: true });
    const event = inserted[0] ?? {};
    expect(event.event_name).toBe("safety_tier_recovery_only");
    const metadata = (event.metadata ?? {}) as Record<string, unknown>;
    expect(metadata.reason_category).toBe("postpartum_symptom");
    expect(metadata.day_bucket).toBe("2026-07-16");
    // The detailed reason codes never appear anywhere on the row.
    expect(JSON.stringify(event)).not.toContain("heavy_bleeding");
  });
});
