import { describe, expect, it } from "vitest";

import {
  dailyCheckInSchema,
  dailyPlanSchema,
  mealPlanDataSchema,
  milestoneSchema,
  movementPlanSchema,
  nutritionTargetsSchema,
  pathwayEnrollmentSchema,
  postpartumCheckInSchema,
  postpartumProfileSchema,
  wellnessGoalSchema,
  womenWellnessProfileSchema,
} from "./wellness";

const validUuid = "11111111-2222-4333-8444-555555555555";

describe("pathwayEnrollmentSchema", () => {
  it("accepts each valid pathway key", () => {
    for (const key of ["phoenix", "restore", "strong", "nourish", "rhythm", "reset"] as const) {
      expect(pathwayEnrollmentSchema.safeParse({ pathwayKey: key }).success).toBe(true);
    }
  });

  it("rejects invalid pathway keys", () => {
    for (const key of ["mama", "postpartum", "PHOENIX", ""]) {
      expect(pathwayEnrollmentSchema.safeParse({ pathwayKey: key }).success).toBe(false);
    }
  });
});

describe("womenWellnessProfileSchema", () => {
  it("accepts an empty profile — weight and calorie tracking are optional", () => {
    const parsed = womenWellnessProfileSchema.parse({});
    expect(parsed.currentWeightLbs ?? null).toBeNull();
    expect(parsed.movementExperience).toBe("beginner");
    expect(parsed.notificationStyle).toBe("gentle");
    expect(parsed.postpartumPathwayRelevant).toBe(false);
  });

  it("allows opting out of calorie and weight tracking", () => {
    const parsed = womenWellnessProfileSchema.parse({
      tracksCalories: false,
      tracksWeight: false,
    });
    expect(parsed.tracksCalories).toBe(false);
    expect(parsed.tracksWeight).toBe(false);
  });

  it("rejects out-of-range values", () => {
    expect(womenWellnessProfileSchema.safeParse({ preferredWorkoutDays: 8 }).success).toBe(false);
    expect(womenWellnessProfileSchema.safeParse({ heightInches: 300 }).success).toBe(false);
    expect(womenWellnessProfileSchema.safeParse({ movementExperience: "expert" }).success).toBe(
      false,
    );
  });
});

describe("postpartumProfileSchema (Restore only)", () => {
  const base = { enrollmentId: validUuid, postpartumStage: "6_to_12_weeks" };

  it("accepts a minimal intake and never defaults to cleared", () => {
    const parsed = postpartumProfileSchema.parse(base);
    expect(parsed.medicalClearanceStatus).toBe("unknown");
    expect(parsed.feedingStatus).toBe("prefer_not_to_say");
  });

  it("accepts every stage, delivery type, and feeding status", () => {
    expect(
      postpartumProfileSchema.safeParse({
        ...base,
        postpartumStage: "prefer_not_to_say",
        deliveryType: "multiple_cesareans",
        feedingStatus: "combination_feeding",
        incisionStatus: "healing",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown enum values", () => {
    expect(postpartumProfileSchema.safeParse({ ...base, postpartumStage: "week-2" }).success).toBe(
      false,
    );
    expect(
      postpartumProfileSchema.safeParse({ ...base, medicalClearanceStatus: "auto" }).success,
    ).toBe(false);
  });
});

describe("dailyCheckInSchema ranges", () => {
  const base = { checkInDate: "2026-07-17" };

  it("enforces 1-5 for sleep quality, energy, mood, and stress", () => {
    for (const field of ["sleepQuality", "energy", "mood", "stress"]) {
      expect(dailyCheckInSchema.safeParse({ ...base, [field]: 3 }).success).toBe(true);
      expect(dailyCheckInSchema.safeParse({ ...base, [field]: 0 }).success).toBe(false);
      expect(dailyCheckInSchema.safeParse({ ...base, [field]: 6 }).success).toBe(false);
    }
  });

  it("enforces 0-5 soreness and 0-10 pain", () => {
    expect(dailyCheckInSchema.safeParse({ ...base, soreness: 0 }).success).toBe(true);
    expect(dailyCheckInSchema.safeParse({ ...base, soreness: 6 }).success).toBe(false);
    expect(dailyCheckInSchema.safeParse({ ...base, painLevel: 10 }).success).toBe(true);
    expect(dailyCheckInSchema.safeParse({ ...base, painLevel: 11 }).success).toBe(false);
  });

  it("accepts readiness values and rejects unknown ones", () => {
    expect(dailyCheckInSchema.safeParse({ ...base, readiness: "overwhelmed" }).success).toBe(true);
    expect(dailyCheckInSchema.safeParse({ ...base, readiness: "crushed" }).success).toBe(false);
  });

  it("requires an ISO check-in date", () => {
    expect(dailyCheckInSchema.safeParse({ checkInDate: "07/17/2026" }).success).toBe(false);
  });
});

describe("postpartumCheckInSchema", () => {
  it("defaults every red flag to false", () => {
    const parsed = postpartumCheckInSchema.parse({
      enrollmentId: validUuid,
      checkInDate: "2026-07-17",
    });
    expect(parsed.heavyBleeding).toBe(false);
    expect(parsed.calfPainOrSwelling).toBe(false);
    expect(parsed.domingOrConing).toBe(false);
  });
});

describe("wellnessGoalSchema", () => {
  it("accepts all goal types", () => {
    for (const goalType of ["weight_management", "pelvic_floor_support", "postpartum_recovery"]) {
      expect(wellnessGoalSchema.safeParse({ goalType }).success).toBe(true);
    }
  });

  it("rejects unknown goal types and bad priorities", () => {
    expect(wellnessGoalSchema.safeParse({ goalType: "six-pack" }).success).toBe(false);
    expect(wellnessGoalSchema.safeParse({ goalType: "strength", priority: 0 }).success).toBe(false);
  });
});

describe("JSONB plan schemas", () => {
  it("movement plan is strict — unknown keys are rejected", () => {
    expect(movementPlanSchema.safeParse({ restDay: true }).success).toBe(true);
    expect(movementPlanSchema.safeParse({ restDay: true, llmOverride: true }).success).toBe(false);
  });

  it("nutrition targets enforce the conservative calorie floor", () => {
    expect(nutritionTargetsSchema.safeParse({ calorieTarget: 1500 }).success).toBe(true);
    expect(nutritionTargetsSchema.safeParse({ calorieTarget: 1100 }).success).toBe(false);
    expect(nutritionTargetsSchema.safeParse({ calorieRangeLow: 900 }).success).toBe(false);
  });

  it("nutrition targets always carry the estimate notice", () => {
    const parsed = nutritionTargetsSchema.parse({});
    expect(parsed.estimateNotice).toBe(true);
    expect(nutritionTargetsSchema.safeParse({ estimateNotice: false }).success).toBe(false);
  });

  it("daily plan validates adaptation levels including safety_hold", () => {
    const base = {
      planDate: "2026-07-17",
      movementPlan: { restDay: true },
      nutritionPlan: {},
      hydrationPlan: {},
      recoveryPlan: {},
    };
    expect(dailyPlanSchema.safeParse({ ...base, adaptationLevel: "safety_hold" }).success).toBe(
      true,
    );
    expect(dailyPlanSchema.safeParse({ ...base, adaptationLevel: "push-through" }).success).toBe(
      false,
    );
  });

  it("daily plan leaves the postpartum payload optional for non-Restore users", () => {
    const parsed = dailyPlanSchema.parse({
      planDate: "2026-07-17",
      movementPlan: { restDay: true },
      nutritionPlan: {},
      hydrationPlan: {},
      recoveryPlan: {},
    });
    expect(parsed.postpartumPlan ?? null).toBeNull();
  });

  it("meal plan data requires days and the estimate notice", () => {
    expect(
      mealPlanDataSchema.safeParse({
        days: [{ date: "2026-07-20" }],
      }).success,
    ).toBe(true);
    expect(mealPlanDataSchema.safeParse({ days: [] }).success).toBe(false);
    expect(
      mealPlanDataSchema.safeParse({ days: [{ date: "2026-07-20" }], estimateNotice: false })
        .success,
    ).toBe(false);
  });
});

describe("milestoneSchema", () => {
  it("requires kebab-case milestone keys", () => {
    expect(
      milestoneSchema.safeParse({ milestoneKey: "first-workout", milestoneType: "consistency" })
        .success,
    ).toBe(true);
    expect(
      milestoneSchema.safeParse({ milestoneKey: "First Workout!", milestoneType: "consistency" })
        .success,
    ).toBe(false);
  });
});
