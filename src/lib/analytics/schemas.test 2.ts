import { describe, expect, it } from "vitest";

import { validateAnalyticsEvent } from "@/lib/analytics/schemas";

const base = {
  eventName: "workout_completed",
  source: "server",
  pathwayKeys: ["phoenix"],
  metadata: { workout_type: "strength", completion_status: "completed" },
};

describe("analytics event validation", () => {
  it("accepts a known event with allowlisted metadata", () => {
    const result = validateAnalyticsEvent(base);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.event_name).toBe("workout_completed");
      expect(result.event.event_version).toBe(1);
      expect(result.event.occurred_at).toBeTruthy();
    }
  });

  it("rejects unknown events", () => {
    const result = validateAnalyticsEvent({ ...base, eventName: "made_up_event" });
    expect(result).toEqual({ ok: false, reason: "invalid_envelope" });
  });

  it("rejects unknown metadata properties (strict allowlist)", () => {
    const result = validateAnalyticsEvent({
      ...base,
      metadata: { ...base.metadata, favorite_color: "blue" },
    });
    expect(result).toEqual({ ok: false, reason: "invalid_metadata" });
  });

  it("rejects a client-smuggled user_id in metadata", () => {
    const result = validateAnalyticsEvent({
      ...base,
      metadata: { ...base.metadata, user_id: "someone-else" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects oversized metadata", () => {
    const bloated: Record<string, string> = {};
    for (let index = 0; index < 20; index += 1) bloated[`key_${index}`] = "x";
    expect(validateAnalyticsEvent({ ...base, metadata: bloated })).toEqual({
      ok: false,
      reason: "oversized_metadata",
    });
  });

  it.each([
    ["symptom_text", "sharp pelvic pain"],
    ["journal", "today I felt…"],
    ["message", "raw companion text"],
    ["meal_description", "chicken salad"],
    ["push_endpoint", "https://fcm.example/abc"],
    ["auth_token", "eyJ…"],
  ])("rejects sensitive property %s before schema checks", (key, value) => {
    const result = validateAnalyticsEvent({ ...base, metadata: { [key]: value } });
    expect(result).toEqual({ ok: false, reason: "prohibited_metadata_key" });
  });

  it("rejects free-text metadata values on identifier fields", () => {
    const result = validateAnalyticsEvent({
      ...base,
      metadata: { workout_type: "I did a long walk and my incision hurt" },
    });
    expect(result).toEqual({ ok: false, reason: "invalid_metadata" });
  });

  it("rejects malformed pathway keys", () => {
    const result = validateAnalyticsEvent({ ...base, pathwayKeys: ["not-a-pathway"] });
    expect(result).toEqual({ ok: false, reason: "invalid_envelope" });
  });

  it("rejects an incorrect explicit event version", () => {
    const result = validateAnalyticsEvent({ ...base, eventVersion: 99 });
    expect(result).toEqual({ ok: false, reason: "invalid_event_version" });
  });

  it("normalizes routes and strips query strings", () => {
    const result = validateAnalyticsEvent({
      ...base,
      route: "/wellness/her?secret=1&email=a@b.c",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.event.route).toBe("/wellness/her");
  });

  it("safety metadata admits only broad categories", () => {
    const good = validateAnalyticsEvent({
      eventName: "safety_tier_recovery_only",
      source: "server",
      pathwayKeys: ["restore"],
      metadata: {
        reason_category: "postpartum_symptom",
        module_affected: "movement",
        day_bucket: "2026-07-16",
      },
    });
    expect(good.ok).toBe(true);

    const detailed = validateAnalyticsEvent({
      eventName: "safety_tier_recovery_only",
      source: "server",
      metadata: {
        reason_category: "postpartum_symptom",
        day_bucket: "2026-07-16",
        reason_code: "heavy_bleeding",
      },
    });
    expect(detailed.ok).toBe(false);
  });
});
