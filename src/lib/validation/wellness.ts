/**
 * Saelis Her — Zod schemas.
 *
 * Every JSONB payload (plans, settings, readiness snapshots, meal-plan data)
 * MUST pass through these schemas at application boundaries — reads and
 * writes. Unchecked JSONB never reaches components. Enumerated values mirror
 * the database check constraints via src/lib/wellness/constants.ts.
 */
import { z } from "zod";

import {
  ADAPTATION_LEVELS,
  COMPLETION_STATUSES,
  DELIVERY_TYPES,
  ENROLLMENT_STATUSES,
  FEEDING_STATUSES,
  GOAL_STATUSES,
  GOAL_TYPES,
  INCISION_STATUSES,
  LOGGED_VIA_VALUES,
  MEAL_TYPES,
  MEDICAL_CLEARANCE_STATUSES,
  MOVEMENT_EXPERIENCES,
  NOTIFICATION_STYLES,
  PHOENIX_STYLES,
  PLAN_STATUSES,
  POSTPARTUM_STAGES,
  PROGRAM_STATUSES,
  READINESS_STATES,
  RHYTHM_MODES,
  SAFETY_TIERS,
  UNITS_PREFERENCES,
  WORKOUT_SOURCES,
} from "@/lib/wellness/constants";
import { PATHWAY_KEYS } from "@/lib/wellness/pathways/types";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------
export const pathwayKeySchema = z.enum(PATHWAY_KEYS);
export const readinessStateSchema = z.enum(READINESS_STATES);
export const adaptationLevelSchema = z.enum(ADAPTATION_LEVELS);
export const safetyTierSchema = z.enum(SAFETY_TIERS);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD).");
const shortText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

// ---------------------------------------------------------------------------
// Pathways and enrollment
// ---------------------------------------------------------------------------
export const wellnessPathwaySchema = z.object({
  key: pathwayKeySchema,
  displayName: shortText(80),
  description: shortText(500),
  category: shortText(50),
  route: shortText(100),
  active: z.boolean(),
  sortOrder: z.number().int().min(0),
});

/** Per-enrollment JSONB settings — small, allowlisted, no free-form health data. */
export const enrollmentSettingsSchema = z
  .object({
    weeklyTrainingDays: z.number().int().min(0).max(7).optional(),
    preferredLocation: z.string().trim().max(50).optional(),
    quietMode: z.boolean().optional(),
    /** Phoenix focus — a target weight is never required. */
    phoenixStyle: z.enum(PHOENIX_STYLES).optional(),
    /** Rhythm participation — always optional, symptom-led, no fertility tracking. */
    rhythmMode: z.enum(RHYTHM_MODES).optional(),
  })
  .strict();

export const pathwayEnrollmentSchema = z.object({
  pathwayKey: pathwayKeySchema,
  goalSummary: optionalText(500),
  programLengthWeeks: z.number().int().min(1).max(104).nullable().optional(),
  settings: enrollmentSettingsSchema.optional(),
});

export const enrollmentStatusSchema = z.enum(ENROLLMENT_STATUSES);

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
export const womenWellnessProfileSchema = z.object({
  dateOfBirth: isoDate.nullable().optional(),
  heightInches: z.number().min(36).max(90).nullable().optional(),
  // Weight and calorie tracking are OPTIONAL by product rule.
  currentWeightLbs: z.number().min(50).max(1000).nullable().optional(),
  targetWeightLbs: z.number().min(50).max(1000).nullable().optional(),
  desiredWeightChangeLbs: z.number().min(-500).max(500).nullable().optional(),
  goalTimeframeMonths: z.number().int().min(1).max(60).nullable().optional(),
  movementExperience: z.enum(MOVEMENT_EXPERIENCES).default("beginner"),
  preferredTrainingLocations: z.array(z.string().trim().max(50)).max(10).default([]),
  availableEquipment: z.array(z.string().trim().max(50)).max(30).default([]),
  preferredWorkoutDays: z.number().int().min(0).max(7).default(3),
  preferredWorkoutMinutes: z.number().int().min(5).max(180).default(30),
  averageDailySteps: z.number().int().min(0).max(100000).nullable().optional(),
  dietaryPattern: optionalText(100),
  foodAllergies: z.array(z.string().trim().max(50)).max(30).default([]),
  foodDislikes: z.array(z.string().trim().max(50)).max(50).default([]),
  householdMealPreferences: optionalText(500),
  budgetPreference: optionalText(50),
  mealPrepPreference: optionalText(50),
  tracksCalories: z.boolean().default(true),
  tracksWeight: z.boolean().default(true),
  weighsDaily: z.boolean().default(false),
  cycleTrackingEnabled: z.boolean().default(false),
  postpartumPathwayRelevant: z.boolean().default(false),
  notificationStyle: z.enum(NOTIFICATION_STYLES).default("gentle"),
  unitsPreference: z.enum(UNITS_PREFERENCES).default("imperial"),
  // Phase 2 (00008) — optional movement/nutrition preferences.
  movementLimitations: z.array(z.string().trim().max(50)).max(20).default([]),
  movementDislikes: z.array(z.string().trim().max(50)).max(30).default([]),
  floorTransitionsDifficult: z.boolean().default(false),
  prefersBeginnerExplanations: z.boolean().default(false),
  quickMealsPreferred: z.boolean().default(false),
  proteinFamiliarity: z.enum(["new", "some", "confident"]).nullable().optional(),
  portionGuidancePreferred: z.boolean().default(false),
  familyStyleMeals: z.boolean().default(false),
});

/** RESTORE ONLY — validated at the boundary of postpartum services. */
export const postpartumProfileSchema = z.object({
  enrollmentId: z.string().uuid(),
  postpartumStage: z.enum(POSTPARTUM_STAGES),
  deliveryDate: isoDate.nullable().optional(),
  deliveryType: z.enum(DELIVERY_TYPES).nullable().optional(),
  cesareanCount: z.number().int().min(0).max(10).nullable().optional(),
  feedingStatus: z.enum(FEEDING_STATUSES).default("prefer_not_to_say"),
  /** Self-reported. The application never infers or auto-sets 'cleared'. */
  medicalClearanceStatus: z.enum(MEDICAL_CLEARANCE_STATUSES).default("unknown"),
  reportedRestrictions: optionalText(1000),
  pelvicFloorSymptoms: z.boolean().default(false),
  pelvicFloorDetails: optionalText(1000),
  suspectedDiastasis: z.boolean().default(false),
  diastasisAssessedByProfessional: z.boolean().default(false),
  abdominalDomingOrConing: z.boolean().default(false),
  chronicPain: z.boolean().default(false),
  painDetails: optionalText(1000),
  ironDeficiencyOrAnemia: z.boolean().default(false),
  fatigueConcern: z.boolean().default(false),
  incisionStatus: z.enum(INCISION_STATUSES).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
export const wellnessGoalSchema = z.object({
  enrollmentId: z.string().uuid().nullable().optional(),
  pathwayKey: pathwayKeySchema.nullable().optional(),
  goalType: z.enum(GOAL_TYPES),
  targetNumeric: z.number().finite().nullable().optional(),
  targetUnit: optionalText(32),
  targetDate: isoDate.nullable().optional(),
  priority: z.number().int().min(1).max(10).default(1),
  status: z.enum(GOAL_STATUSES).default("active"),
});

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------
export const dailyCheckInSchema = z.object({
  checkInDate: isoDate,
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  sleepQuality: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  stress: z.number().int().min(1).max(5).nullable().optional(),
  soreness: z.number().int().min(0).max(5).nullable().optional(),
  painLevel: z.number().int().min(0).max(10).nullable().optional(),
  painLocation: z.array(z.string().trim().max(50)).max(10).default([]),
  readiness: readinessStateSchema.nullable().optional(),
  availableMinutes: z.number().int().min(0).max(300).nullable().optional(),
  availableLocation: optionalText(50),
  illnessOrInjuryConcern: z.boolean().default(false),
  chestPain: z.boolean().default(false),
  dizzinessOrFainting: z.boolean().default(false),
  shortnessOfBreath: z.boolean().default(false),
  severeHeadache: z.boolean().default(false),
  selfHarmConcern: z.boolean().default(false),
  notes: optionalText(2000),
});

/** RESTORE ONLY. */
export const postpartumCheckInSchema = z.object({
  enrollmentId: z.string().uuid(),
  checkInDate: isoDate,
  bleedingConcern: z.boolean().default(false),
  heavyBleeding: z.boolean().default(false),
  incisionConcern: z.boolean().default(false),
  pelvicHeavinessOrPressure: z.boolean().default(false),
  urinaryOrBowelSymptom: z.boolean().default(false),
  calfPainOrSwelling: z.boolean().default(false),
  severeAbdominalOrPelvicPain: z.boolean().default(false),
  breastOrFeedingConcern: z.boolean().default(false),
  domingOrConing: z.boolean().default(false),
  notes: optionalText(2000),
});

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------
export const wellnessProgramSchema = z.object({
  status: z.enum(PROGRAM_STATUSES).default("active"),
  version: z.number().int().min(1).default(1),
  startDate: isoDate,
  endDate: isoDate,
  totalWeeks: z.number().int().min(1).max(104),
  primaryGoal: shortText(200),
  weeklyTrainingDays: z.number().int().min(0).max(7),
  nutritionStrategy: shortText(200),
  safetyTier: safetyTierSchema,
  activePathwayKeys: z.array(pathwayKeySchema).max(6).default([]),
  rationale: optionalText(2000),
});

export const wellnessProgramWeekSchema = z.object({
  weekNumber: z.number().int().min(1),
  phaseNumber: z.number().int().min(1),
  phaseName: shortText(100),
  weeklyFocus: shortText(300),
  activePathwayKeys: z.array(pathwayKeySchema).max(6).default([]),
  strengthSessionsTarget: z.number().int().min(0).max(7).default(0),
  cardioSessionsTarget: z.number().int().min(0).max(7).default(0),
  mobilitySessionsTarget: z.number().int().min(0).max(7).default(0),
  recoverySessionsTarget: z.number().int().min(0).max(7).default(0),
  stepTarget: z.number().int().min(0).max(100000).nullable().optional(),
  proteinTargetGrams: z.number().int().min(0).max(400).nullable().optional(),
  hydrationTargetOunces: z.number().int().min(0).max(300).nullable().optional(),
  // Conservative calorie floor is a database constraint AND a product rule.
  calorieTarget: z.number().int().min(1200).max(6000).nullable().optional(),
  calorieRangeLow: z.number().int().min(1200).nullable().optional(),
  calorieRangeHigh: z.number().int().max(6000).nullable().optional(),
  deloadWeek: z.boolean().default(false),
  notes: optionalText(1000),
});

// ---------------------------------------------------------------------------
// JSONB plan payloads (validated on every read and write)
// ---------------------------------------------------------------------------
export const exercisePrescriptionSchema = z
  .object({
    exerciseSlug: shortText(100),
    displayName: shortText(200),
    sequenceNumber: z.number().int().min(1),
    sets: z.number().int().min(1).max(10).nullable().optional(),
    reps: optionalText(50),
    durationSeconds: z.number().int().min(5).max(3600).nullable().optional(),
    restSeconds: z.number().int().min(0).max(600).nullable().optional(),
    intensityGuidance: optionalText(300),
    modificationNotes: optionalText(300),
  })
  .strict();

export const movementPlanSchema = z
  .object({
    focus: optionalText(200),
    workoutTemplateSlug: optionalText(100),
    approximateMinutes: z.number().int().min(0).max(300).nullable().optional(),
    exercises: z.array(exercisePrescriptionSchema).max(20).default([]),
    /** Rest day is a fully valid plan. */
    restDay: z.boolean().default(false),
    notes: optionalText(500),
  })
  .strict();

export const nutritionTargetsSchema = z
  .object({
    /** Estimates only — never presented as precise. */
    calorieTarget: z.number().int().min(1200).max(6000).nullable().optional(),
    calorieRangeLow: z.number().int().min(1200).nullable().optional(),
    calorieRangeHigh: z.number().int().max(6000).nullable().optional(),
    proteinTargetGrams: z.number().int().min(0).max(400).nullable().optional(),
    fiberTargetGrams: z.number().int().min(0).max(100).nullable().optional(),
    estimateNotice: z.literal(true).default(true),
  })
  .strict();

export const nutritionPlanSchema = z
  .object({
    targets: nutritionTargetsSchema.optional(),
    mealTemplateSlugs: z.array(shortText(100)).max(10).default([]),
    focus: optionalText(300),
    notes: optionalText(500),
  })
  .strict();

export const hydrationPlanSchema = z
  .object({
    targetOunces: z.number().int().min(0).max(300).nullable().optional(),
    notes: optionalText(300),
  })
  .strict();

export const recoveryPlanSchema = z
  .object({
    activities: z.array(shortText(100)).max(10).default([]),
    sleepFocus: optionalText(300),
    notes: optionalText(500),
  })
  .strict();

/** RESTORE ONLY plan payload. */
export const postpartumPlanSchema = z
  .object({
    stageAppropriateFocus: optionalText(300),
    breathworkMinutes: z.number().int().min(0).max(60).nullable().optional(),
    gentleMovementSlugs: z.array(shortText(100)).max(10).default([]),
    /** Deterministic provider-guidance message; never generated by an LLM. */
    providerGuidanceNote: optionalText(500),
    notes: optionalText(500),
  })
  .strict();

export const readinessSnapshotSchema = z
  .object({
    readiness: readinessStateSchema.nullable().optional(),
    energy: z.number().int().min(1).max(5).nullable().optional(),
    painLevel: z.number().int().min(0).max(10).nullable().optional(),
    availableMinutes: z.number().int().min(0).max(300).nullable().optional(),
    redFlagPresent: z.boolean().default(false),
  })
  .strict();

export const dailyPlanSchema = z.object({
  planDate: isoDate,
  programWeekId: z.string().uuid().nullable().optional(),
  activePathwayKeys: z.array(pathwayKeySchema).max(6).default([]),
  readinessSnapshot: readinessSnapshotSchema.nullable().optional(),
  planStatus: z.enum(PLAN_STATUSES).default("active"),
  movementPlan: movementPlanSchema,
  nutritionPlan: nutritionPlanSchema,
  hydrationPlan: hydrationPlanSchema,
  recoveryPlan: recoveryPlanSchema,
  postpartumPlan: postpartumPlanSchema.nullable().optional(),
  adaptationLevel: adaptationLevelSchema.default("standard"),
  adaptationReason: optionalText(500),
  safetyMessage: optionalText(1000),
  generatedBy: z.string().trim().max(50).default("rules_engine"),
});

// ---------------------------------------------------------------------------
// Logs and metrics
// ---------------------------------------------------------------------------
export const workoutLogSchema = z.object({
  dailyPlanId: z.string().uuid().nullable().optional(),
  workoutDate: isoDate,
  pathwayKeys: z.array(pathwayKeySchema).max(6).default([]),
  workoutType: shortText(50),
  title: shortText(200),
  source: z.enum(WORKOUT_SOURCES),
  plannedDurationMinutes: z.number().int().min(1).max(300).nullable().optional(),
  actualDurationMinutes: z.number().int().min(0).max(300).nullable().optional(),
  completionStatus: z.enum(COMPLETION_STATUSES),
  perceivedExertion: z.number().int().min(1).max(10).nullable().optional(),
  painDuring: z.boolean().default(false),
  domingOrConing: z.boolean().default(false),
  pelvicFloorSymptom: z.boolean().default(false),
  notes: optionalText(2000),
});

export const exerciseLogSchema = z.object({
  exerciseId: z.string().uuid().nullable().optional(),
  exerciseName: shortText(200),
  sequenceNumber: z.number().int().min(1),
  setsCompleted: z.number().int().min(0).max(20).nullable().optional(),
  repsCompleted: optionalText(50),
  weightUsedLbs: z.number().min(0).max(2000).nullable().optional(),
  durationSeconds: z.number().int().min(0).max(14400).nullable().optional(),
  distance: optionalText(50),
  modificationUsed: optionalText(300),
  notes: optionalText(1000),
});

export const nutritionLogSchema = z.object({
  logDate: isoDate,
  mealType: z.enum(MEAL_TYPES),
  description: shortText(1000),
  /** Always an estimate; the UI labels it as such. */
  estimatedCalories: z.number().int().min(0).max(10000).nullable().optional(),
  proteinGrams: z.number().min(0).max(500).nullable().optional(),
  carbohydratesGrams: z.number().min(0).max(1500).nullable().optional(),
  fatGrams: z.number().min(0).max(500).nullable().optional(),
  fiberGrams: z.number().min(0).max(200).nullable().optional(),
  ironRich: z.boolean().default(false),
  fruitOrVegetableServings: z.number().min(0).max(30).nullable().optional(),
  loggedVia: z.enum(LOGGED_VIA_VALUES).default("manual"),
  estimationNotice: z.boolean().default(false),
});

export const dailyMetricsSchema = z.object({
  metricDate: isoDate,
  weightLbs: z.number().min(50).max(1000).nullable().optional(),
  waistInches: z.number().min(10).max(120).nullable().optional(),
  hipInches: z.number().min(10).max(120).nullable().optional(),
  chestInches: z.number().min(10).max(120).nullable().optional(),
  thighInches: z.number().min(5).max(60).nullable().optional(),
  steps: z.number().int().min(0).max(200000).nullable().optional(),
  waterOunces: z.number().min(0).max(500).nullable().optional(),
  proteinGrams: z.number().min(0).max(500).nullable().optional(),
  calories: z.number().int().min(0).max(10000).nullable().optional(),
  fiberGrams: z.number().min(0).max(200).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  restingHeartRate: z.number().min(20).max(250).nullable().optional(),
  activeMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  notes: optionalText(1000),
});

// ---------------------------------------------------------------------------
// Meal plans and milestones
// ---------------------------------------------------------------------------
export const mealPlanDaySchema = z
  .object({
    date: isoDate,
    breakfastSlug: optionalText(100),
    lunchSlug: optionalText(100),
    dinnerSlug: optionalText(100),
    snackSlugs: z.array(shortText(100)).max(5).default([]),
    notes: optionalText(300),
  })
  .strict();

export const mealPlanDataSchema = z
  .object({
    days: z.array(mealPlanDaySchema).min(1).max(7),
    groceryHighlights: z.array(shortText(100)).max(40).default([]),
    estimateNotice: z.literal(true).default(true),
  })
  .strict();

export const mealPlanSchema = z.object({
  weekStartDate: isoDate,
  activePathwayKeys: z.array(pathwayKeySchema).max(6).default([]),
  calorieTarget: z.number().int().min(1200).max(6000).nullable().optional(),
  calorieRangeLow: z.number().int().min(1200).nullable().optional(),
  calorieRangeHigh: z.number().int().max(6000).nullable().optional(),
  proteinTargetGrams: z.number().int().min(0).max(400).nullable().optional(),
  hydrationTargetOunces: z.number().int().min(0).max(300).nullable().optional(),
  planData: mealPlanDataSchema,
  generatedBy: z.string().trim().max(50).default("rules_engine"),
});

export const milestoneSchema = z.object({
  pathwayKey: pathwayKeySchema.nullable().optional(),
  milestoneKey: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Milestone keys are kebab-case."),
  milestoneType: shortText(50),
  numericValue: z.number().finite().nullable().optional(),
  celebrationMessage: optionalText(500),
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type WellnessPathwayInput = z.output<typeof wellnessPathwaySchema>;
export type PathwayEnrollmentInput = z.output<typeof pathwayEnrollmentSchema>;
export type WomenWellnessProfileInput = z.output<typeof womenWellnessProfileSchema>;
export type PostpartumProfileInput = z.output<typeof postpartumProfileSchema>;
export type WellnessGoalInput = z.output<typeof wellnessGoalSchema>;
export type DailyCheckInInput = z.output<typeof dailyCheckInSchema>;
export type PostpartumCheckInInput = z.output<typeof postpartumCheckInSchema>;
export type WellnessProgramInput = z.output<typeof wellnessProgramSchema>;
export type WellnessProgramWeekInput = z.output<typeof wellnessProgramWeekSchema>;
export type DailyPlanInput = z.output<typeof dailyPlanSchema>;
export type MovementPlan = z.output<typeof movementPlanSchema>;
export type ExercisePrescription = z.output<typeof exercisePrescriptionSchema>;
export type NutritionTargets = z.output<typeof nutritionTargetsSchema>;
export type NutritionPlan = z.output<typeof nutritionPlanSchema>;
export type HydrationPlan = z.output<typeof hydrationPlanSchema>;
export type RecoveryPlan = z.output<typeof recoveryPlanSchema>;
export type PostpartumPlan = z.output<typeof postpartumPlanSchema>;
export type ReadinessSnapshot = z.output<typeof readinessSnapshotSchema>;
export type WorkoutLogInput = z.output<typeof workoutLogSchema>;
export type ExerciseLogInput = z.output<typeof exerciseLogSchema>;
export type NutritionLogInput = z.output<typeof nutritionLogSchema>;
export type DailyMetricsInput = z.output<typeof dailyMetricsSchema>;
export type MealPlanInput = z.output<typeof mealPlanSchema>;
export type MilestoneInput = z.output<typeof milestoneSchema>;
