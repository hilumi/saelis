import { describe, expect, it } from "vitest";

import { presentStoredPlan, type StoredPlanView } from "./present";

function view(overrides: Partial<StoredPlanView> = {}): StoredPlanView {
  return {
    planDate: "2026-07-17",
    adaptationLevel: "standard",
    safetyMessage: null,
    movementPlan: {
      focus: "Home full body",
      workoutTemplateSlug: "home-20",
      approximateMinutes: 20,
      exercises: [],
      restDay: false,
      notes: null,
    },
    nutritionPlan: {
      targets: undefined,
      mealTemplateSlugs: [],
      focus: "Protein at each meal.",
      notes: null,
    },
    hydrationPlan: { targetOunces: 72, notes: null },
    recoveryPlan: { activities: [], sleepFocus: null, notes: null },
    readinessSnapshot: {
      readiness: "okay",
      energy: 3,
      painLevel: null,
      availableMinutes: null,
      redFlagPresent: false,
    },
    resetActive: false,
    ...overrides,
  };
}

describe("stored-plan presentation", () => {
  it("standard day: workout first, nourishment and hydration after", () => {
    const result = presentStoredPlan(view());
    expect(result.nextBestAction).toContain("20-minute home full body");
    expect(result.additionalActions).toHaveLength(2);
    expect(result.adaptationExplanation).toBeNull();
  });

  it("tired day explains the shortened plan without shame", () => {
    const result = presentStoredPlan(
      view({
        adaptationLevel: "reduced",
        readinessSnapshot: {
          readiness: "tired",
          energy: 2,
          painLevel: null,
          availableMinutes: null,
          redFlagPresent: false,
        },
      }),
    );
    expect(result.adaptationExplanation).toBe(
      "Your plan was shortened and simplified based on today's energy and sleep.",
    );
  });

  it("overwhelmed → three meaningful actions, framed as care", () => {
    const result = presentStoredPlan(
      view({
        adaptationLevel: "reduced",
        readinessSnapshot: {
          readiness: "overwhelmed",
          energy: 1,
          painLevel: null,
          availableMinutes: null,
          redFlagPresent: false,
        },
      }),
    );
    expect(result.minimumViableDay).toBe(true);
    expect([result.nextBestAction, ...result.additionalActions]).toHaveLength(3);
    expect(result.adaptationExplanation).toBe(
      "Today has been reduced to three meaningful actions.",
    );
  });

  it("in-pain hold explains the pause while symptoms are checked", () => {
    const result = presentStoredPlan(
      view({
        adaptationLevel: "safety_hold",
        safetyMessage: "Your plan is on a gentle hold …",
        readinessSnapshot: {
          readiness: "in_pain",
          energy: null,
          painLevel: 8,
          availableMinutes: null,
          redFlagPresent: true,
        },
      }),
    );
    expect(result.safetyHold).toBe(true);
    expect(result.adaptationExplanation).toContain("paused while Saelis checks");
  });

  it("Reset simplifies a reduced day into the three-action shape", () => {
    const result = presentStoredPlan(
      view({
        resetActive: true,
        adaptationLevel: "reduced",
        readinessSnapshot: {
          readiness: "tired",
          energy: 2,
          painLevel: null,
          availableMinutes: null,
          redFlagPresent: false,
        },
      }),
    );
    expect(result.minimumViableDay).toBe(true);
  });
});
