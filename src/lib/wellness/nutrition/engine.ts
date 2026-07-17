/**
 * Saelis Her — nutrition-target, hydration, and fiber engine.
 *
 * Everything here is an ESTIMATE, framed as such, with conservative
 * safeguards from src/lib/wellness/rules.ts. Calorie tracking is optional;
 * with insufficient data the engine falls back to habit-based guidance rather
 * than inventing precision. No starvation-level targets, no promised rates of
 * loss, no exercise-calorie arithmetic in either direction.
 */
import { CALORIE_RULES, FIBER_RULES, HYDRATION_RULES, PROTEIN_RULES } from "@/lib/wellness/rules";

import type { FeedingStatus, GoalType } from "@/lib/wellness/constants";
import type { PathwayKey } from "@/lib/wellness/pathways/types";

export const NUTRITION_MODES = [
  "calorie_range",
  "protein_first",
  "portion_guidance",
  "habit_based",
  "meal_structure",
] as const;
export type NutritionMode = (typeof NUTRITION_MODES)[number];

export interface NutritionEngineInput {
  ageYears?: number | null;
  heightInches?: number | null;
  currentWeightLbs?: number | null;
  targetWeightLbs?: number | null;
  goalTypes: readonly GoalType[];
  activePathways: readonly PathwayKey[];
  weeklyTrainingDays: number;
  tracksCalories: boolean;
  portionGuidancePreferred?: boolean;
  /** Restore only. */
  feedingStatus?: FeedingStatus | null;
  fatigueConcern?: boolean;
  ironConcern?: boolean;
  /** Average recent daily intake estimate, when logs exist. */
  recentAverageCalories?: number | null;
}

export interface NutritionTargetsResult {
  mode: NutritionMode;
  estimatedCalorieTarget: number | null;
  calorieRangeLow: number | null;
  calorieRangeHigh: number | null;
  proteinTargetLowGrams: number;
  proteinTargetHighGrams: number;
  /** Gentle opening target (gradual start). */
  gradualStartProteinGrams: number;
  fiberGuidance: string;
  fiberTargetGrams: number;
  hydrationTargetOunces: number;
  mealStructure: string[];
  rationale: string[];
  /** Always true — every number is an estimate. */
  estimationNotice: true;
  safeguards: string[];
  ironSupport: string[] | null;
}

const KG_PER_LB = 0.453592;
const CM_PER_INCH = 2.54;

function isBreastfeeding(status: FeedingStatus | null | undefined): boolean {
  return (
    status === "exclusively_breastfeeding" ||
    status === "combination_feeding" ||
    status === "pumping"
  );
}

/** Mifflin–St Jeor (female constant), used strictly as an estimate. */
export function estimateMaintenanceCalories(input: {
  ageYears: number;
  heightInches: number;
  weightLbs: number;
  weeklyTrainingDays: number;
}): number {
  const kg = input.weightLbs * KG_PER_LB;
  const cm = input.heightInches * CM_PER_INCH;
  const bmr = 10 * kg + 6.25 * cm - 5 * input.ageYears - 161;
  const activityFactor =
    input.weeklyTrainingDays >= 5 ? 1.55 : input.weeklyTrainingDays >= 3 ? 1.45 : 1.3;
  return Math.round(bmr * activityFactor);
}

export function computeNutritionTargets(input: NutritionEngineInput): NutritionTargetsResult {
  const rationale: string[] = [];
  const safeguards: string[] = [];
  const breastfeeding = isBreastfeeding(input.feedingStatus);
  const weightLossGoal =
    input.goalTypes.includes("weight_management") &&
    input.targetWeightLbs != null &&
    input.currentWeightLbs != null &&
    input.targetWeightLbs < input.currentWeightLbs;

  // --- Protein (reference: target weight when set, else current) ----------
  const referenceWeight = input.targetWeightLbs ?? input.currentWeightLbs ?? 150; // neutral default reference
  const proteinLow = Math.min(
    PROTEIN_RULES.maximumInitialTargetGrams,
    Math.max(
      PROTEIN_RULES.minimumTargetGrams,
      Math.round(referenceWeight * PROTEIN_RULES.gramsPerPoundLow),
    ),
  );
  const proteinHigh = Math.min(
    PROTEIN_RULES.maximumInitialTargetGrams,
    Math.max(proteinLow, Math.round(referenceWeight * PROTEIN_RULES.gramsPerPoundHigh)),
  );
  const gradualStartProtein = Math.round(proteinLow * PROTEIN_RULES.gradualStartFraction);
  rationale.push(
    `Protein aims for roughly ${proteinLow}–${proteinHigh} g/day, spread across about ${PROTEIN_RULES.mealsPerDay} meals — starting nearer ${gradualStartProtein} g and building gradually.`,
  );

  // --- Hydration -----------------------------------------------------------
  let hydration =
    HYDRATION_RULES.baselineOunces +
    Math.min(3, input.weeklyTrainingDays) * HYDRATION_RULES.perTrainingDayBonusOunces;
  if (breastfeeding) hydration += HYDRATION_RULES.breastfeedingBonusOunces;
  hydration = Math.min(HYDRATION_RULES.maximumSuggestedOunces, hydration);

  // --- Calories ------------------------------------------------------------
  const haveData =
    input.ageYears != null && input.heightInches != null && input.currentWeightLbs != null;

  let mode: NutritionMode;
  let calorieTarget: number | null = null;
  let rangeLow: number | null = null;
  let rangeHigh: number | null = null;

  if (!input.tracksCalories) {
    mode = input.portionGuidancePreferred ? "portion_guidance" : "habit_based";
    rationale.push(
      "Calorie tracking is off, so guidance stays habit-based: protein at each meal, plenty of plants, unhurried eating, and consistency over perfection.",
    );
  } else if (!haveData) {
    mode = "habit_based";
    rationale.push(
      "There is not enough information for a responsible calorie estimate, so guidance stays habit-based rather than inventing precision.",
    );
    safeguards.push("insufficient_data_no_calorie_target");
  } else {
    mode =
      input.activePathways.includes("strong") && !weightLossGoal
        ? "protein_first"
        : "calorie_range";
    const maintenance = estimateMaintenanceCalories({
      ageYears: input.ageYears!,
      heightInches: input.heightInches!,
      weightLbs: input.currentWeightLbs!,
      weeklyTrainingDays: input.weeklyTrainingDays,
    });
    const maxDeficit = breastfeeding
      ? CALORIE_RULES.maximumDailyDeficitBreastfeeding
      : CALORIE_RULES.maximumDailyDeficit;
    const floor = breastfeeding
      ? CALORIE_RULES.minimumDailyCaloriesBreastfeeding
      : CALORIE_RULES.minimumDailyCalories;
    const deficit = weightLossGoal ? maxDeficit : 0;
    calorieTarget = Math.max(
      floor,
      Math.min(CALORIE_RULES.maximumDailyCalories, maintenance - deficit),
    );
    rangeLow = Math.max(floor, calorieTarget - CALORIE_RULES.rangeHalfWidth);
    rangeHigh = Math.min(
      CALORIE_RULES.maximumDailyCalories,
      calorieTarget + CALORIE_RULES.rangeHalfWidth,
    );
    rationale.push(
      `Estimated from standard energy equations — a starting range, not a measurement. ${
        weightLossGoal
          ? "The deficit is deliberately conservative; results vary and no rate of change is promised."
          : "Centered near estimated maintenance."
      }`,
    );
    if (maintenance - deficit < floor) safeguards.push("calorie_floor_applied");
    safeguards.push("conservative_deficit_cap");
    if (breastfeeding) safeguards.push("breastfeeding_deficit_softened");
  }

  if (breastfeeding) {
    rationale.push(
      "While breastfeeding or pumping, energy needs vary meaningfully from person to person — aggressive deficits are avoided, and a clinician or dietitian is the right partner for individualized targets. (No claim is made about milk-supply outcomes.)",
    );
    if (
      input.fatigueConcern ||
      (input.recentAverageCalories != null &&
        rangeLow != null &&
        input.recentAverageCalories < rangeLow)
    ) {
      safeguards.push("fatigue_or_low_intake_watch");
      rationale.push(
        "Recent fatigue or low intake is worth gentle attention — please eat enough, and mention persistent fatigue to your provider.",
      );
    }
  }

  // --- Iron support (never supplement dosing) ------------------------------
  const ironSupport = input.ironConcern
    ? [
        "Iron-rich meals are surfaced in your plan (lean beef, lentils, spinach).",
        "Pairing plant iron with vitamin C (citrus, peppers, berries) helps absorption.",
        "Iron concerns deserve clinical evaluation and lab follow-up — Saelis never suggests supplement doses.",
      ]
    : null;

  return {
    mode,
    estimatedCalorieTarget: calorieTarget,
    calorieRangeLow: rangeLow,
    calorieRangeHigh: rangeHigh,
    proteinTargetLowGrams: proteinLow,
    proteinTargetHighGrams: proteinHigh,
    gradualStartProteinGrams: gradualStartProtein,
    fiberGuidance: `Build toward about ${FIBER_RULES.targetGrams} g of fiber gradually — roughly ${FIBER_RULES.weeklyIncreaseGrams} g more per week, with extra water alongside.`,
    fiberTargetGrams: FIBER_RULES.targetGrams,
    hydrationTargetOunces: hydration,
    mealStructure: [
      "Three meals with a protein source each",
      "One or two snacks if hungry",
      "Water with each meal",
    ],
    rationale,
    estimationNotice: true,
    safeguards,
    ironSupport,
  };
}
