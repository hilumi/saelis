import { describe, expect, it } from "vitest";

import {
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_EVENT_VERSIONS,
  NOTIFICATION_EVENTS,
  SAFETY_EVENTS,
  SERVER_ONLY_EVENTS,
  SYSTEM_EVENTS,
  isProhibitedMetadataKey,
  normalizeRoute,
  toSafetyReasonCategory,
} from "@/lib/analytics/taxonomy";

describe("analytics taxonomy", () => {
  it("has unique event names", () => {
    expect(new Set(ANALYTICS_EVENT_NAMES).size).toBe(ANALYTICS_EVENT_NAMES.length);
  });

  it("declares an explicit version for every event", () => {
    for (const name of ANALYTICS_EVENT_NAMES) {
      expect(ANALYTICS_EVENT_VERSIONS[name]).toBeGreaterThanOrEqual(1);
    }
  });

  it("treats all safety, notification, and system events as server-only", () => {
    for (const name of [...SAFETY_EVENTS, ...NOTIFICATION_EVENTS, ...SYSTEM_EVENTS]) {
      expect(SERVER_ONLY_EVENTS.has(name)).toBe(true);
    }
  });
});

describe("prohibited metadata keys", () => {
  it.each([
    "symptom_text",
    "journal",
    "journal_entry",
    "companion_message",
    "message",
    "meal_description",
    "notes",
    "push_endpoint",
    "subscription",
    "auth_token",
    "token",
    "user_email",
    "email",
    "delivery_date",
    "clearance_note",
    "pain_location",
    "stack_trace",
    "request_body",
  ])("rejects %s", (key) => {
    expect(isProhibitedMetadataKey(key)).toBe(true);
  });

  it.each(["step", "pathway", "workout_type", "duration_bucket", "reason_category"])(
    "allows coarse key %s",
    (key) => {
      expect(isProhibitedMetadataKey(key)).toBe(false);
    },
  );
});

describe("route normalization", () => {
  it("strips query strings and fragments", () => {
    expect(normalizeRoute("/wellness/her?utm_source=mail&token=abc#x")).toBe("/wellness/her");
  });

  it("collapses uuid and numeric segments", () => {
    expect(normalizeRoute("/wellness/her/pathways/123")).toBe("/wellness/her/pathways/:id");
    expect(normalizeRoute("/plans/0b8f6a1e-2222-4444-8888-1234567890ab")).toBe("/plans/:id");
  });

  it("returns null for empty input", () => {
    expect(normalizeRoute(null)).toBeNull();
  });
});

describe("safety reason coarsening", () => {
  it("maps engine codes to broad categories only", () => {
    expect(toSafetyReasonCategory("chest_pain")).toBe("cardiovascular_or_acute_symptom");
    expect(toSafetyReasonCategory("heavy_bleeding")).toBe("postpartum_symptom");
    expect(toSafetyReasonCategory("self_harm_concern")).toBe("mental_health_concern");
    expect(toSafetyReasonCategory("not_medically_cleared")).toBe("clearance_or_recovery_status");
    expect(toSafetyReasonCategory("no_concerns")).toBe("no_concerns");
  });

  it("never passes an unknown code through", () => {
    expect(toSafetyReasonCategory("some_new_detailed_symptom")).toBe("other");
  });
});
