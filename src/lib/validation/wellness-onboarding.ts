/**
 * Saelis Her — onboarding draft schemas (Phase 2).
 *
 * The draft is server-persisted JSONB (wellness_onboarding_drafts.data) and
 * is validated here on every read and write. Every slice is optional so the
 * flow is resumable at any point; per-step requirements are enforced by
 * src/lib/wellness/onboarding.ts before advancing, and again at completion.
 * Sensitive answers are never stored in localStorage.
 */
import { z } from "zod";

import {
  GOAL_TYPES,
  MOVEMENT_EXPERIENCES,
  NOTIFICATION_STYLES,
  PHOENIX_STYLES,
  PROTEIN_FAMILIARITY_LEVELS,
  RHYTHM_MODES,
  UNITS_PREFERENCES,
} from "@/lib/wellness/constants";
import { PATHWAY_KEYS } from "@/lib/wellness/pathways/types";
import { postpartumProfileSchema } from "@/lib/validation/wellness";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD).");
const tag = z.string().trim().min(1).max(50);

export const ONBOARDING_STEPS = [
  "welcome",
  "pathways",
  "goals",
  "body",
  "movement",
  "nutrition",
  "restore",
  "rhythm",
  "phoenix",
  "notifications",
  "review",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export const onboardingStepSchema = z.enum(ONBOARDING_STEPS);

export const onboardingPathwaysSchema = z
  .array(z.enum(PATHWAY_KEYS))
  .min(1, "Choose at least one pathway.")
  .max(6);

export const onboardingGoalsSchema = z
  .object({
    goalTypes: z.array(z.enum(GOAL_TYPES)).min(1, "Choose at least one goal.").max(14),
    primaryGoal: z.enum(GOAL_TYPES),
  })
  .refine((value) => value.goalTypes.includes(value.primaryGoal), {
    message: "Your primary goal should be one of your selected goals.",
    path: ["primaryGoal"],
  });

/** Every field optional — weight is never required. */
export const onboardingBodySchema = z
  .object({
    dateOfBirth: isoDate.nullable().optional(),
    heightInches: z.number().min(36).max(90).nullable().optional(),
    currentWeightLbs: z.number().min(50).max(1000).nullable().optional(),
    targetWeightLbs: z.number().min(50).max(1000).nullable().optional(),
    goalTimeframeMonths: z.number().int().min(1).max(60).nullable().optional(),
    unitsPreference: z.enum(UNITS_PREFERENCES).optional(),
    tracksWeight: z.boolean().optional(),
    tracksCalories: z.boolean().optional(),
    weighsDaily: z.boolean().optional(),
  })
  .strict();

export const onboardingMovementSchema = z
  .object({
    movementExperience: z.enum(MOVEMENT_EXPERIENCES).optional(),
    preferredWorkoutDays: z.number().int().min(0).max(7).optional(),
    preferredWorkoutMinutes: z.number().int().min(5).max(180).optional(),
    trainingLocations: z.array(tag).max(10).optional(),
    homeEquipment: z.array(tag).max(30).optional(),
    planetFitnessAccess: z.boolean().optional(),
    pelotonAccess: z.boolean().optional(),
    walkingPreferred: z.boolean().optional(),
    movementLimitations: z.array(tag).max(20).optional(),
    movementDislikes: z.array(tag).max(30).optional(),
    floorTransitionsDifficult: z.boolean().optional(),
    prefersBeginnerExplanations: z.boolean().optional(),
  })
  .strict();

export const onboardingNutritionSchema = z
  .object({
    dietaryPattern: z.string().trim().max(100).nullable().optional(),
    foodAllergies: z.array(tag).max(30).optional(),
    foodDislikes: z.array(tag).max(50).optional(),
    householdMealPreferences: z.string().trim().max(500).nullable().optional(),
    budgetPreference: z.enum(["low", "medium", "high"]).nullable().optional(),
    mealPrepPreference: z.string().trim().max(50).nullable().optional(),
    quickMealsPreferred: z.boolean().optional(),
    proteinFamiliarity: z.enum(PROTEIN_FAMILIARITY_LEVELS).nullable().optional(),
    tracksCalories: z.boolean().optional(),
    portionGuidancePreferred: z.boolean().optional(),
    familyStyleMeals: z.boolean().optional(),
  })
  .strict();

/**
 * Restore intake — RESTORE ONLY. Draft variant of the postpartum profile
 * (no enrollment exists yet while onboarding). Completion maps this into
 * postpartum_profiles via the isolated postpartum service, then clears it.
 */
export const onboardingRestoreSchema = postpartumProfileSchema.omit({ enrollmentId: true }).extend({
  floorTransitionsUncomfortable: z.boolean().default(false),
});

/** Rhythm — minimum necessary data. No fertility tracking, ever. */
export const onboardingRhythmSchema = z
  .object({
    mode: z.enum(RHYTHM_MODES),
  })
  .strict();

export const onboardingPhoenixSchema = z
  .object({
    style: z.enum(PHOENIX_STYLES),
  })
  .strict();

export const notificationPreferencesSchema = z
  .object({
    reminderStyle: z.enum(NOTIFICATION_STYLES).default("gentle"),
    morningCheckIn: z.boolean().default(false),
    workoutReminders: z.boolean().default(false),
    nourishmentReminders: z.boolean().default(false),
    hydrationReminders: z.boolean().default(false),
    eveningReflection: z.boolean().default(false),
    quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
    quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
    maxDailyNotifications: z.number().int().min(0).max(10).default(3),
  })
  .strict();

/** The full draft payload — every slice optional so any step can resume. */
export const onboardingDraftDataSchema = z
  .object({
    pathways: onboardingPathwaysSchema.optional(),
    goals: onboardingGoalsSchema.optional(),
    body: onboardingBodySchema.optional(),
    movement: onboardingMovementSchema.optional(),
    nutrition: onboardingNutritionSchema.optional(),
    restore: onboardingRestoreSchema.optional(),
    rhythm: onboardingRhythmSchema.optional(),
    phoenix: onboardingPhoenixSchema.optional(),
    notifications: notificationPreferencesSchema.optional(),
  })
  .strict();

export const onboardingDraftSchema = z.object({
  currentStep: onboardingStepSchema.default("welcome"),
  data: onboardingDraftDataSchema.default({}),
});

export type OnboardingDraftData = z.output<typeof onboardingDraftDataSchema>;
export type OnboardingDraft = z.output<typeof onboardingDraftSchema>;
export type OnboardingGoalsInput = z.output<typeof onboardingGoalsSchema>;
export type OnboardingRestoreInput = z.output<typeof onboardingRestoreSchema>;
export type NotificationPreferencesInput = z.output<typeof notificationPreferencesSchema>;
