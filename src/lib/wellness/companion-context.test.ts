import { describe, expect, it } from "vitest";

import {
  HER_COMPANION_BOUNDARIES,
  serializeHerContext,
  summarizePlanForCompanion,
  type HerCompanionContext,
} from "./companion-context";

const base: HerCompanionContext = {
  activePathwayKeys: ["phoenix", "nourish"],
  primaryGoal: "weight_management",
  programPhaseName: "Foundation",
  currentWeekNumber: 2,
  readinessCategory: "okay",
  safetyTier: "normal",
  adaptationLevel: "standard",
  blockedActivities: [],
  todayPlanSummary: "Home full body (~20 min, standard)",
  recentCompletionSummary: "2 workouts completed in the last 7 days",
  nutritionMode: "calorie_range",
  preferences: { tracksWeight: true, tracksCalories: true, beginnerExplanations: false },
  milestoneSummary: "Three workouts — a pattern is forming.",
  safetyHoldActive: false,
};

describe("companion context", () => {
  it("serializes a compact structured summary", () => {
    const serialized = serializeHerContext(base);
    expect(serialized).toContain("pathways=phoenix+nourish");
    expect(serialized).toContain("primaryGoal=weight_management");
    expect(serialized).toContain("phase=Foundation (week 2)");
    expect(serialized).toContain("prefs=weight:on,calories:on");
  });

  it("omits sensitive raw data by construction — no symptom or free-text fields exist", () => {
    const serialized = serializeHerContext(base);
    for (const banned of ["bleeding", "pelvic", "incision", "diastasis", "notes=", "symptom"]) {
      expect(serialized.toLowerCase()).not.toContain(banned);
    }
    // The context type has no field that could carry free-text health records.
    expect(Object.keys(base)).not.toEqual(
      expect.arrayContaining(["symptomNotes", "postpartumDetails", "rawCheckIn"]),
    );
  });

  it("sends ONLY the permitted safety summary under a hold", () => {
    const held = serializeHerContext({
      ...base,
      safetyHoldActive: true,
      blockedActivities: ["structured_exercise"],
    });
    expect(held).toContain("safetyHold=active");
    expect(held).toContain("blocked=structured_exercise");
    expect(held).not.toContain("primaryGoal");
    expect(held).not.toContain("today=");
    expect(held).not.toContain("milestone=");
  });

  it("boundaries forbid overrides, diagnosis, restored exercise, deficits, and supplements", () => {
    const text = HER_COMPANION_BOUNDARIES.toLowerCase();
    expect(text).toContain("never");
    expect(text).toContain("override or soften a safety hold");
    expect(text).toContain("diagnose");
    expect(text).toContain("restore blocked exercise");
    expect(text).toContain("aggressive deficit");
    expect(text).toContain("supplements");
    expect(text).toContain("postpartum exercise programming outside the rules engine");
    expect(text).toContain("deterministic engines are authoritative");
  });

  it("summarizes plans without detail leakage", () => {
    expect(
      summarizePlanForCompanion({
        movementFocus: "Restore gentle recovery",
        restDay: false,
        approximateMinutes: 15,
        adaptationLevel: "reduced",
      }),
    ).toBe("Restore gentle recovery (~15 min, reduced)");
    expect(
      summarizePlanForCompanion({
        movementFocus: null,
        restDay: true,
        approximateMinutes: null,
        adaptationLevel: "recovery",
      }),
    ).toBe("rest-or-gentle-movement day");
  });
});
