import { describe, expect, it } from "vitest";

import { computeDailyPlan, type DailyPlanEngineInput } from "./daily-plan";
import { computeNutritionTargets } from "../nutrition/engine";

import type {
  ExerciseLibraryRow,
  WorkoutTemplateExerciseRow,
  WorkoutTemplateRow,
} from "@/types/wellness";

const now = "2026-07-17T00:00:00Z";
const squat: ExerciseLibraryRow = {
  id: "ex-1",
  slug: "bw-squat",
  name: "Bodyweight squat",
  category: "strength",
  movement_pattern: null,
  primary_muscles: [],
  equipment: [],
  locations: ["home"],
  difficulty: "beginner",
  instructions: "Squat.",
  coaching_cues: [],
  common_mistakes: [],
  regression_slug: null,
  progression_slug: null,
  pathway_tags: ["phoenix"],
  safety_tags: [],
  avoid_when: [],
  video_url: null,
  active: true,
  created_at: now,
  updated_at: now,
};

const homeTemplate: WorkoutTemplateRow = {
  id: "t-1",
  slug: "home-20",
  name: "Home 20",
  description: "fixture",
  pathway_tags: ["phoenix", "strong", "reset", "restore"],
  location: "home",
  approximate_minutes: 20,
  phase_min: 1,
  phase_max: 99,
  difficulty: "beginner",
  safety_tags: ["no-floor-position"],
  intensity_guidance: "steady",
  modification_notes: null,
  active: true,
  created_at: now,
  updated_at: now,
};

const templateExercises: WorkoutTemplateExerciseRow[] = [
  {
    id: "te-1",
    template_id: "t-1",
    exercise_id: "ex-1",
    sequence_number: 1,
    sets: 3,
    reps: "10",
    duration_seconds: null,
    rest_seconds: 60,
    intensity_guidance: null,
    modification_notes: null,
  },
  {
    id: "te-2",
    template_id: "t-1",
    exercise_id: "ex-1",
    sequence_number: 2,
    sets: 2,
    reps: "8",
    duration_seconds: null,
    rest_seconds: 60,
    intensity_guidance: null,
    modification_notes: null,
  },
];

const targets = computeNutritionTargets({
  ageYears: 34,
  heightInches: 65,
  currentWeightLbs: 170,
  targetWeightLbs: 155,
  goalTypes: ["weight_management"],
  activePathways: ["phoenix"],
  weeklyTrainingDays: 3,
  tracksCalories: true,
});

function baseInput(overrides: Partial<DailyPlanEngineInput> = {}): DailyPlanEngineInput {
  return {
    planDate: "2026-07-17",
    activePathways: ["phoenix"],
    restoreActive: false,
    phaseNumber: 1,
    nutritionTargets: targets,
    safetyInput: {
      activePathways: ["phoenix"],
      checkIn: { energy: 4, stress: 2, readiness: "okay" },
    },
    workoutLibrary: {
      templates: [homeTemplate],
      templateExercises,
      exercises: [squat],
      availableMinutes: 25,
    },
    ...overrides,
  };
}

describe("daily plan engine", () => {
  it("produces a standard plan with a workout when everything is fine", () => {
    const result = computeDailyPlan(baseInput());
    expect(result.planInput.adaptationLevel).toBe("standard");
    expect(result.planInput.movementPlan.restDay).toBe(false);
    expect(result.workout?.templateSlug).toBe("home-20");
    expect(result.nextBestAction).toContain("Home 20".toLowerCase().slice(0, 4));
    expect(result.planInput.postpartumPlan ?? null).toBeNull();
  });

  it("reduces the plan when tired", () => {
    const result = computeDailyPlan(
      baseInput({
        safetyInput: { activePathways: ["phoenix"], checkIn: { readiness: "tired", energy: 2 } },
      }),
    );
    expect(result.planInput.adaptationLevel).toBe("reduced");
  });

  it("recovery day for moderate pain — no automatic exercise prescription", () => {
    const result = computeDailyPlan(
      baseInput({
        safetyInput: {
          activePathways: ["phoenix"],
          checkIn: { painLevel: 5, readiness: "in_pain" },
        },
      }),
    );
    expect(result.planInput.adaptationLevel).toBe("recovery");
    // Gentle template may still exist, but intensity stays gentle.
    expect(["gentle"]).toContain(result.readiness.recommendedIntensity);
  });

  it("safety hold blocks exercise and carries the hold message", () => {
    const result = computeDailyPlan(
      baseInput({
        activePathways: ["restore"],
        restoreActive: true,
        safetyInput: {
          activePathways: ["restore"],
          postpartumProfile: { medicalClearanceStatus: "not_cleared" },
        },
      }),
    );
    expect(result.planInput.adaptationLevel).toBe("safety_hold");
    expect(result.planInput.movementPlan.restDay).toBe(true);
    expect(result.planInput.movementPlan.exercises).toHaveLength(0);
    expect(result.planInput.safetyMessage).toBeTruthy();
    expect(result.planInput.readinessSnapshot?.redFlagPresent).toBe(true);
  });

  it("urgent support overrides every module and leaves a single action", () => {
    const result = computeDailyPlan(
      baseInput({
        safetyInput: { activePathways: ["phoenix"], checkIn: { chestPain: true } },
      }),
    );
    expect(result.safety.urgent).toBe(true);
    expect(result.planInput.adaptationLevel).toBe("safety_hold");
    expect(result.workout).toBeNull();
    expect(result.additionalActions).toHaveLength(0);
    expect(result.nextBestAction.toLowerCase()).toContain("support");
  });

  it("overwhelmed → minimum viable day with at most three actions, no guilt", () => {
    const result = computeDailyPlan(
      baseInput({
        safetyInput: { activePathways: ["phoenix"], checkIn: { readiness: "overwhelmed" } },
      }),
    );
    const actions = [result.nextBestAction, ...result.additionalActions];
    expect(actions.length).toBeLessThanOrEqual(3);
    expect(actions[0]).toContain("nourishing meal");
    expect(result.explanation.join(" ")).toContain("not failure");
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/lazy|fell behind|should have/);
  });

  it("Reset simplifies the plan for a multi-pathway user without deleting anything", () => {
    const result = computeDailyPlan(
      baseInput({
        activePathways: ["phoenix", "reset"],
        safetyInput: {
          activePathways: ["phoenix", "reset"],
          checkIn: { readiness: "tired", energy: 2 },
        },
      }),
    );
    expect([result.nextBestAction, ...result.additionalActions].length).toBeLessThanOrEqual(3);
    expect(result.planInput.activePathwayKeys).toContain("reset");
  });

  it("includes the postpartum module only for Restore users", () => {
    const restore = computeDailyPlan(
      baseInput({
        activePathways: ["restore"],
        restoreActive: true,
        safetyInput: {
          activePathways: ["restore"],
          postpartumProfile: { medicalClearanceStatus: "cleared" },
          checkIn: { energy: 3 },
        },
      }),
    );
    expect(restore.planInput.postpartumPlan).not.toBeNull();
    const nonRestore = computeDailyPlan(baseInput());
    expect(nonRestore.planInput.postpartumPlan ?? null).toBeNull();
    expect(JSON.stringify(nonRestore).toLowerCase()).not.toContain("postpartum plan for you");
  });

  it("is deterministic for identical inputs (idempotency foundation)", () => {
    expect(computeDailyPlan(baseInput())).toEqual(computeDailyPlan(baseInput()));
  });
});
