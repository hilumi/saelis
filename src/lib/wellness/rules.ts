/**
 * Saelis Her — central rule constants for the deterministic engines.
 *
 * Every threshold used by the safety, readiness, program, workout, nutrition,
 * hydration, and planner engines lives HERE, in one configurable module —
 * never scattered through engine code. These rules are authoritative: no LLM
 * is involved in (or may override) safety decisions, calorie safeguards,
 * exercise eligibility, or plan generation.
 */

// --- Calorie safeguards (all values are estimates, never precision claims) --
export const CALORIE_RULES = {
  /** Absolute lower safeguard — never recommend below this. */
  minimumDailyCalories: 1200,
  /** Lower safeguard while breastfeeding, combination feeding, or pumping. */
  minimumDailyCaloriesBreastfeeding: 1800,
  /** Maximum daily deficit from estimated maintenance. */
  maximumDailyDeficit: 500,
  /** Gentler maximum deficit while breastfeeding/pumping. */
  maximumDailyDeficitBreastfeeding: 300,
  /** Half-width of a presented calorie range (target ± halfWidth). */
  rangeHalfWidth: 100,
  /** Upper bound presented anywhere. */
  maximumDailyCalories: 6000,
} as const;

// --- Protein (grams; ranges, gradual starts) -------------------------------
export const PROTEIN_RULES = {
  /** g per lb of reference weight (target weight when set, else current). */
  gramsPerPoundLow: 0.6,
  gramsPerPoundHigh: 0.8,
  /** Never open with an extreme target. */
  maximumInitialTargetGrams: 150,
  minimumTargetGrams: 50,
  /** Gradual start: begin at this fraction of the full target. */
  gradualStartFraction: 0.7,
  /** Suggested meals to spread protein across. */
  mealsPerDay: 3,
} as const;

// --- Fiber (gradual; pair with hydration) ----------------------------------
export const FIBER_RULES = {
  baselineGrams: 18,
  targetGrams: 25,
  weeklyIncreaseGrams: 3,
} as const;

// --- Hydration (editable general guidance, not a prescription) -------------
export const HYDRATION_RULES = {
  baselineOunces: 64,
  perTrainingDayBonusOunces: 8,
  breastfeedingBonusOunces: 16,
  maximumSuggestedOunces: 120,
  gradualStepOunces: 8,
} as const;

// --- Readiness → plan adaptation -------------------------------------------
export const READINESS_RULES = {
  tiredDurationMultiplier: 0.7, // ≈ 20–35% reduction
  overwhelmedDurationMultiplier: 0.4,
  overwhelmedMaxActions: 3,
  minimumViableMovementMinutesLow: 5,
  minimumViableMovementMinutesHigh: 15,
  lowSleepHoursThreshold: 5.5,
  poorSleepQualityThreshold: 2, // 1–5 scale, ≤
  lowEnergyThreshold: 2, // 1–5 scale, ≤
  highStressThreshold: 4, // 1–5 scale, ≥
  elevatedSorenessThreshold: 4, // 0–5 scale, ≥
  moderatePainThreshold: 4, // 0–10; ≥ → recovery-only territory
  significantPainThreshold: 7, // 0–10; ≥ → hold and contact professional
  shortSessionMinutes: 15,
} as const;

// --- Progression / deload ---------------------------------------------------
export const PROGRESSION_RULES = {
  /** Fraction of planned sessions completed to be progression-eligible. */
  minimumCompletionRate: 0.6,
  /** Any symptom flags in this many recent workouts blocks progression. */
  symptomLookbackWorkouts: 3,
  /** Reported exertion above this (1–10 RIR-style RPE) delays progression. */
  maximumTolerableExertion: 8,
  deloadEveryNthWeek: 6,
  /** Conservative return: reduce volume after this many inactive days. */
  inactivityDaysBeforeConservativeReturn: 10,
  conservativeReturnMultiplier: 0.7,
} as const;

// --- Program shape ----------------------------------------------------------
export const PROGRAM_RULES = {
  defaultTotalWeeks: 12,
  weeksPerPhase: 3,
  restoreWeeksPerPhase: 3,
  defaultTrainingDays: 3,
  maximumStepTarget: 12000,
  baselineStepTarget: 6000,
} as const;

// --- Plain-language effort guidance (no maximal lifting, RIR-based) --------
export const EFFORT_GUIDANCE = {
  gentle: "Effort stays easy — you could hold a full conversation the whole time.",
  moderate: "Comfortably challenging — always two or more easy reps left in reserve.",
  standard: "Working sets stop with two reps in reserve. Nothing is ever taken to a maximum.",
} as const;

// --- Restore stop conditions (never "push through") ------------------------
export const RESTORE_STOP_CONDITIONS = [
  "Pain",
  "Pelvic pressure or heaviness",
  "Leaking",
  "Bulging, doming, or coning through the midline",
  "Increased bleeding",
  "Incision discomfort",
  "Dizziness",
  "Unusual shortness of breath",
  "Simply feeling unwell",
] as const;

export const GENERAL_STOP_CONDITIONS = [
  "Sharp or worsening pain",
  "Chest pain or pressure",
  "Dizziness or lightheadedness",
  "Unusual shortness of breath",
] as const;
