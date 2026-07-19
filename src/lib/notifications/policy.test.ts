import { describe, expect, it } from "vitest";

import {
  buildIdempotencyKey,
  decideProactiveSend,
  frequencyAllowsDay,
  isWithinQuietHours,
  localDateKey,
  localMinutes,
  SEND_WINDOW_MINUTES,
} from "./policy";

const basePrefs = {
  enabled: true,
  gentle_check_ins: true,
  wellness_reminders: false,
  evening_reflections: false,
  preferred_time_minutes: 9 * 60, // 09:00
  timezone: "UTC",
  quiet_hours_start_minutes: 21 * 60,
  quiet_hours_end_minutes: 8 * 60,
  proactive_frequency: "daily" as const,
};

/** 2026-07-15 is a Wednesday. */
function utc(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 6, 15, hour, minute));
}

describe("quiet hours", () => {
  it("handles windows that wrap midnight (21:00 → 08:00)", () => {
    expect(isWithinQuietHours(22 * 60, 21 * 60, 8 * 60)).toBe(true);
    expect(isWithinQuietHours(3 * 60, 21 * 60, 8 * 60)).toBe(true);
    expect(isWithinQuietHours(9 * 60, 21 * 60, 8 * 60)).toBe(false);
    expect(isWithinQuietHours(20 * 60, 21 * 60, 8 * 60)).toBe(false);
  });

  it("handles same-day windows and the empty window", () => {
    expect(isWithinQuietHours(13 * 60, 12 * 60, 14 * 60)).toBe(true);
    expect(isWithinQuietHours(15 * 60, 12 * 60, 14 * 60)).toBe(false);
    expect(isWithinQuietHours(12 * 60, 12 * 60, 12 * 60)).toBe(false);
  });
});

describe("timezone helpers", () => {
  it("computes local minutes in a named timezone", () => {
    // 14:00 UTC on 2026-07-15 is 09:00 in Chicago (CDT, UTC-5).
    expect(localMinutes(utc(14), "America/Chicago")).toBe(9 * 60);
  });

  it("falls back to UTC for unknown zones", () => {
    expect(localMinutes(utc(14), "Not/AZone")).toBe(14 * 60);
    expect(localDateKey(utc(14), "Not/AZone")).toBe("2026-07-15");
  });
});

describe("frequency gate", () => {
  it("daily allows every day; few_per_week Mon/Wed/Fri; weekly Mondays", () => {
    expect(frequencyAllowsDay("daily", 0)).toBe(true);
    expect(frequencyAllowsDay("few_per_week", 3)).toBe(true);
    expect(frequencyAllowsDay("few_per_week", 2)).toBe(false);
    expect(frequencyAllowsDay("weekly", 1)).toBe(true);
    expect(frequencyAllowsDay("weekly", 4)).toBe(false);
  });
});

describe("decideProactiveSend — beta policy", () => {
  it("sends inside the window after the preferred time", () => {
    const decision = decideProactiveSend({
      prefs: basePrefs,
      now: utc(9, 30),
      alreadySentToday: false,
    });
    expect(decision).toEqual({ send: true, category: "gentle_check_in", reason: "ok" });
  });

  it("never sends more than one proactive notification per day", () => {
    const decision = decideProactiveSend({
      prefs: basePrefs,
      now: utc(9, 30),
      alreadySentToday: true,
    });
    expect(decision.send).toBe(false);
    expect(decision.reason).toBe("already_sent_today");
  });

  it("never sends during quiet hours", () => {
    const decision = decideProactiveSend({
      prefs: { ...basePrefs, preferred_time_minutes: 22 * 60 },
      now: utc(22, 15),
      alreadySentToday: false,
    });
    expect(decision.send).toBe(false);
    expect(decision.reason).toBe("quiet_hours");
  });

  it("never sends when notifications are disabled", () => {
    const decision = decideProactiveSend({
      prefs: { ...basePrefs, enabled: false },
      now: utc(9, 30),
      alreadySentToday: false,
    });
    expect(decision).toMatchObject({ send: false, reason: "disabled" });
  });

  it("stays silent outside the send window (before and long after)", () => {
    expect(
      decideProactiveSend({ prefs: basePrefs, now: utc(8, 30), alreadySentToday: false }).reason,
    ).toBe("outside_window");
    expect(
      decideProactiveSend({
        prefs: basePrefs,
        now: utc(9, SEND_WINDOW_MINUTES + 20),
        alreadySentToday: false,
      }).reason,
    ).toBe("outside_window");
  });

  it("respects the frequency gate deterministically", () => {
    // 2026-07-15 is a Wednesday → few_per_week allows, weekly does not.
    expect(
      decideProactiveSend({
        prefs: { ...basePrefs, proactive_frequency: "few_per_week" },
        now: utc(9, 30),
        alreadySentToday: false,
      }).send,
    ).toBe(true);
    expect(
      decideProactiveSend({
        prefs: { ...basePrefs, proactive_frequency: "weekly" },
        now: utc(9, 30),
        alreadySentToday: false,
      }).reason,
    ).toBe("frequency");
  });

  it("prefers evening reflections for evening preferred times", () => {
    const decision = decideProactiveSend({
      prefs: {
        ...basePrefs,
        evening_reflections: true,
        preferred_time_minutes: 19 * 60,
        quiet_hours_start_minutes: 22 * 60,
      },
      now: utc(19, 15),
      alreadySentToday: false,
    });
    expect(decision.category).toBe("evening_reflection");
  });
});

describe("idempotency key", () => {
  it("is unique per user, category, and local day — and stable", () => {
    const key = buildIdempotencyKey("user-1", "gentle_check_in", "2026-07-15");
    expect(key).toBe("user-1:gentle_check_in:2026-07-15");
    expect(buildIdempotencyKey("user-1", "gentle_check_in", "2026-07-15")).toBe(key);
    expect(buildIdempotencyKey("user-1", "gentle_check_in", "2026-07-16")).not.toBe(key);
  });
});
