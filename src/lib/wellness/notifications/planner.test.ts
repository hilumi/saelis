import { describe, expect, it } from "vitest";

import { planNotifications, type NotificationPlannerInput } from "./planner";

function input(overrides: Partial<NotificationPlannerInput> = {}): NotificationPlannerInput {
  return {
    date: "2026-07-17",
    timezone: "UTC",
    now: new Date("2026-07-17T15:00:00Z"), // 15:00 UTC — outside quiet hours
    masterEnabled: true,
    preferences: {
      morningCheckIn: true,
      workoutReminders: true,
      nourishmentReminders: true,
      hydrationReminders: true,
      eveningReflection: true,
      quietHoursStart: 21,
      quietHoursEnd: 7,
      maxDailyNotifications: 5,
    },
    activePathways: ["phoenix"],
    alreadySentKeys: new Set(),
    state: {
      checkInDone: false,
      workoutDone: false,
      workoutPlanned: true,
      mealLoggedToday: false,
      hydrationLoggedToday: false,
      restoreCheckInDone: false,
      readinessLow: false,
      resetModeActive: false,
      newMilestoneMessage: null,
      safetyHoldActive: false,
      unresponsiveDays: 0,
    },
    ...overrides,
  };
}

describe("notification planner", () => {
  it("respects the master switch and zero daily cap", () => {
    expect(planNotifications(input({ masterEnabled: false }))).toHaveLength(0);
    expect(
      planNotifications(
        input({ preferences: { ...input().preferences, maxDailyNotifications: 0 } }),
      ),
    ).toHaveLength(0);
  });

  it("sends nothing during quiet hours (overnight window, user timezone)", () => {
    const quiet = planNotifications(input({ now: new Date("2026-07-17T22:30:00Z") }));
    expect(quiet).toHaveLength(0);
    const morningQuiet = planNotifications(input({ now: new Date("2026-07-17T06:30:00Z") }));
    expect(morningQuiet).toHaveLength(0);
  });

  it("never sends Restore notifications to non-Restore users", () => {
    const categories = planNotifications(input()).map((n) => n.category);
    expect(categories).not.toContain("restore_check_in");
    const withRestore = planNotifications(input({ activePathways: ["restore", "phoenix"] })).map(
      (n) => n.category,
    );
    expect(withRestore).toContain("restore_check_in");
  });

  it("keeps Restore lock-screen copy generic — no postpartum detail", () => {
    const restore = planNotifications(input({ activePathways: ["restore"] })).find(
      (n) => n.category === "restore_check_in",
    );
    expect(restore).toBeDefined();
    const text = `${restore!.title} ${restore!.body}`.toLowerCase();
    expect(text).not.toMatch(/postpartum|pelvic|bleeding|incision|symptom/);
  });

  it("suppresses reminders for completed actions", () => {
    const done = planNotifications(
      input({
        state: {
          ...input().state,
          checkInDone: true,
          workoutDone: true,
          mealLoggedToday: true,
          hydrationLoggedToday: true,
        },
      }),
    ).map((n) => n.category);
    expect(done).not.toContain("daily_readiness");
    expect(done).not.toContain("workout_ready");
    expect(done).not.toContain("nourishment_check");
    expect(done).not.toContain("hydration_check");
  });

  it("deduplicates against already-sent keys and enforces the daily cap", () => {
    const first = planNotifications(input());
    expect(first.length).toBeLessThanOrEqual(5);
    const again = planNotifications(
      input({ alreadySentKeys: new Set(first.map((n) => n.dedupeKey)) }),
    );
    expect(again.map((n) => n.dedupeKey)).not.toEqual(
      expect.arrayContaining(first.map((n) => n.dedupeKey)),
    );
    const capped = planNotifications(
      input({ preferences: { ...input().preferences, maxDailyNotifications: 2 } }),
    );
    expect(capped).toHaveLength(2);
  });

  it("workout reminder is blocked by safety hold and Reset, softened when readiness is low", () => {
    const hold = planNotifications(
      input({ state: { ...input().state, safetyHoldActive: true } }),
    ).map((n) => n.category);
    expect(hold).not.toContain("workout_ready");
    const low = planNotifications(input({ state: { ...input().state, readinessLow: true } }));
    expect(low.map((n) => n.category)).toContain("recovery_check");
    expect(low.find((n) => n.category === "recovery_check")!.body).toContain("gentler plan");
  });

  it("Reset mode sends supportive simplicity, and reflection asks a proud question", () => {
    const reset = planNotifications(input({ state: { ...input().state, resetModeActive: true } }));
    const resetNote = reset.find((n) => n.category === "reset_support");
    expect(resetNote?.body).toContain("one small act of care");
    const reflection = planNotifications(input()).find((n) => n.category === "evening_reflection");
    expect(reflection?.body).toContain("proud");
  });

  it("backs off an unresponsive user instead of pressuring", () => {
    const backedOff = planNotifications(
      input({ state: { ...input().state, unresponsiveDays: 4 } }),
    ).map((n) => n.category);
    expect(backedOff).toEqual(["daily_readiness"]);
  });

  it("never contains banned shaming phrases", () => {
    const all = planNotifications(input({ activePathways: ["restore", "phoenix", "reset"] }));
    for (const notification of all) {
      const text = `${notification.title} ${notification.body}`.toLowerCase();
      for (const banned of [
        "you failed",
        "you missed again",
        "burn off",
        "no excuses",
        "bounce back",
        "get your body back",
        "summer body",
      ]) {
        expect(text).not.toContain(banned);
      }
    }
  });
});
