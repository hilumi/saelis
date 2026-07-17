import { describe, expect, it } from "vitest";

import {
  computeNutritionTargets,
  estimateMaintenanceCalories,
  type NutritionEngineInput,
} from "./engine";
import { CALORIE_RULES } from "../rules";

const base: NutritionEngineInput = {
  ageYears: 34,
  heightInches: 65,
  currentWeightLbs: 180,
  targetWeightLbs: 155,
  goalTypes: ["weight_management"],
  activePathways: ["phoenix", "nourish"],
  weeklyTrainingDays: 3,
  tracksCalories: true,
};

describe("nutrition target engine", () => {
  it("falls back to habit-based guidance with insufficient data", () => {
    const result = computeNutritionTargets({ ...base, currentWeightLbs: null, heightInches: null });
    expect(result.mode).toBe("habit_based");
    expect(result.estimatedCalorieTarget).toBeNull();
    expect(result.safeguards).toContain("insufficient_data_no_calorie_target");
    expect(result.estimationNotice).toBe(true);
  });

  it("produces a conservative calorie range for weight management", () => {
    const result = computeNutritionTargets(base);
    expect(result.mode).toBe("calorie_range");
    const maintenance = estimateMaintenanceCalories({
      ageYears: 34,
      heightInches: 65,
      weightLbs: 180,
      weeklyTrainingDays: 3,
    });
    expect(result.estimatedCalorieTarget).toBe(maintenance - CALORIE_RULES.maximumDailyDeficit);
    expect(result.calorieRangeLow).toBeLessThan(result.calorieRangeHigh!);
    expect(result.safeguards).toContain("conservative_deficit_cap");
    // The copy explicitly disavows promised outcomes.
    expect(result.rationale.join(" ")).toContain("no rate of change is promised");
    expect(result.rationale.join(" ")).not.toMatch(/guarantee/i);
  });

  it("applies the absolute calorie floor — never starvation-level targets", () => {
    const result = computeNutritionTargets({
      ...base,
      currentWeightLbs: 105,
      targetWeightLbs: 95,
      heightInches: 58,
      ageYears: 60,
    });
    expect(result.estimatedCalorieTarget).toBeGreaterThanOrEqual(
      CALORIE_RULES.minimumDailyCalories,
    );
    expect(result.calorieRangeLow).toBeGreaterThanOrEqual(CALORIE_RULES.minimumDailyCalories);
    expect(result.safeguards).toContain("calorie_floor_applied");
  });

  it("softens deficits and raises the floor while breastfeeding", () => {
    const result = computeNutritionTargets({
      ...base,
      activePathways: ["restore", "nourish"],
      feedingStatus: "exclusively_breastfeeding",
    });
    const maintenance = estimateMaintenanceCalories({
      ageYears: 34,
      heightInches: 65,
      weightLbs: 180,
      weeklyTrainingDays: 3,
    });
    expect(result.estimatedCalorieTarget).toBe(
      Math.max(
        CALORIE_RULES.minimumDailyCaloriesBreastfeeding,
        maintenance - CALORIE_RULES.maximumDailyDeficitBreastfeeding,
      ),
    );
    expect(result.safeguards).toContain("breastfeeding_deficit_softened");
    const text = result.rationale.join(" ").toLowerCase();
    expect(text).toContain("vary");
    expect(text).toContain("dietitian");
    expect(text).not.toContain("milk supply will");
  });

  it("watches fatigue and low intake patterns while breastfeeding", () => {
    const result = computeNutritionTargets({
      ...base,
      feedingStatus: "pumping",
      fatigueConcern: true,
    });
    expect(result.safeguards).toContain("fatigue_or_low_intake_watch");
  });

  it("respects calorie tracking being off", () => {
    const result = computeNutritionTargets({ ...base, tracksCalories: false });
    expect(result.mode).toBe("habit_based");
    expect(result.estimatedCalorieTarget).toBeNull();
    const portion = computeNutritionTargets({
      ...base,
      tracksCalories: false,
      portionGuidancePreferred: true,
    });
    expect(portion.mode).toBe("portion_guidance");
  });

  it("uses protein-first mode for Strong without a loss goal", () => {
    const result = computeNutritionTargets({
      ...base,
      activePathways: ["strong"],
      goalTypes: ["strength"],
      targetWeightLbs: null,
    });
    expect(result.mode).toBe("protein_first");
  });

  it("sets gradual protein targets, never extreme openers", () => {
    const result = computeNutritionTargets(base);
    expect(result.proteinTargetHighGrams).toBeLessThanOrEqual(150);
    expect(result.gradualStartProteinGrams).toBeLessThan(result.proteinTargetLowGrams);
    expect(result.rationale.join(" ")).toContain("gradually");
  });

  it("offers editable hydration guidance scaled by training and feeding", () => {
    const resting = computeNutritionTargets({ ...base, weeklyTrainingDays: 0 });
    const training = computeNutritionTargets({ ...base, weeklyTrainingDays: 5 });
    const feeding = computeNutritionTargets({ ...base, feedingStatus: "combination_feeding" });
    expect(training.hydrationTargetOunces).toBeGreaterThan(resting.hydrationTargetOunces);
    expect(feeding.hydrationTargetOunces).toBeGreaterThan(resting.hydrationTargetOunces);
    expect(feeding.hydrationTargetOunces).toBeLessThanOrEqual(120);
  });

  it("iron support surfaces food strategies and clinical follow-up, never doses", () => {
    const result = computeNutritionTargets({ ...base, ironConcern: true });
    expect(result.ironSupport?.join(" ")).toContain("vitamin C");
    expect(result.ironSupport?.join(" ").toLowerCase()).toContain("clinical evaluation");
    expect(result.ironSupport?.join(" ").toLowerCase()).not.toMatch(/\d+\s*mg/);
    expect(computeNutritionTargets(base).ironSupport).toBeNull();
  });

  it("keeps fiber guidance gradual with hydration alongside", () => {
    const result = computeNutritionTargets(base);
    expect(result.fiberGuidance.toLowerCase()).toContain("gradually");
    expect(result.fiberGuidance.toLowerCase()).toContain("water");
  });
});
