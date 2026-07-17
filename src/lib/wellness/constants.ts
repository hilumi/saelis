/**
 * Saelis Her — enumerated values.
 * These mirror the database check constraints in
 * supabase/migrations/00007_saelis_her_foundation.sql exactly; drift is a bug.
 */

export const ENROLLMENT_STATUSES = ["active", "paused", "completed", "archived"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const MOVEMENT_EXPERIENCES = ["beginner", "returning", "intermediate", "advanced"] as const;
export type MovementExperience = (typeof MOVEMENT_EXPERIENCES)[number];

export const NOTIFICATION_STYLES = ["gentle", "direct", "celebratory", "minimal"] as const;
export type NotificationStyle = (typeof NOTIFICATION_STYLES)[number];

export const UNITS_PREFERENCES = ["imperial", "metric"] as const;
export type UnitsPreference = (typeof UNITS_PREFERENCES)[number];

export const POSTPARTUM_STAGES = [
  "less_than_6_weeks",
  "6_to_12_weeks",
  "3_to_6_months",
  "6_to_12_months",
  "1_to_2_years",
  "more_than_2_years",
  "prefer_not_to_say",
] as const;
export type PostpartumStage = (typeof POSTPARTUM_STAGES)[number];

export const DELIVERY_TYPES = [
  "vaginal",
  "assisted_vaginal",
  "cesarean",
  "multiple_cesareans",
  "other",
  "prefer_not_to_say",
] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export const FEEDING_STATUSES = [
  "exclusively_breastfeeding",
  "combination_feeding",
  "pumping",
  "weaning",
  "not_breastfeeding",
  "prefer_not_to_say",
] as const;
export type FeedingStatus = (typeof FEEDING_STATUSES)[number];

/** Self-reported only — the application never infers or auto-sets 'cleared'. */
export const MEDICAL_CLEARANCE_STATUSES = [
  "cleared",
  "restrictions",
  "not_cleared",
  "unknown",
] as const;
export type MedicalClearanceStatus = (typeof MEDICAL_CLEARANCE_STATUSES)[number];

export const INCISION_STATUSES = [
  "not_applicable",
  "healed",
  "healing",
  "concern",
  "prefer_not_to_say",
] as const;
export type IncisionStatus = (typeof INCISION_STATUSES)[number];

export const GOAL_TYPES = [
  "weight_management",
  "strength",
  "energy",
  "core_recovery",
  "pelvic_floor_support",
  "cardiovascular_fitness",
  "consistency",
  "mobility",
  "nutrition",
  "hydration",
  "sleep",
  "confidence",
  "stress_management",
  "postpartum_recovery",
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_STATUSES = ["active", "achieved", "paused", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const READINESS_STATES = ["energized", "okay", "tired", "overwhelmed", "in_pain"] as const;
export type ReadinessState = (typeof READINESS_STATES)[number];

export const PROGRAM_STATUSES = ["draft", "active", "superseded", "completed"] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const PLAN_STATUSES = [
  "active",
  "completed",
  "partially_completed",
  "skipped",
  "replaced",
] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

/**
 * Deterministic plan adaptation levels. 'safety_hold' is authoritative:
 * once the rules engine sets it, no LLM output may soften or override it.
 */
export const ADAPTATION_LEVELS = ["standard", "reduced", "recovery", "safety_hold"] as const;
export type AdaptationLevel = (typeof ADAPTATION_LEVELS)[number];

/** Program-level safety tier chosen deterministically from profile + pathway. */
export const SAFETY_TIERS = ["standard", "gentle", "postpartum", "restricted"] as const;
export type SafetyTier = (typeof SAFETY_TIERS)[number];

export const WORKOUT_SOURCES = [
  "saelis",
  "peloton",
  "planet_fitness",
  "walking",
  "manual",
] as const;
export type WorkoutSource = (typeof WORKOUT_SOURCES)[number];

export const COMPLETION_STATUSES = ["planned", "completed", "partial", "skipped"] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "beverage"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const LOGGED_VIA_VALUES = ["manual", "quick_add", "ai_estimate"] as const;
export type LoggedVia = (typeof LOGGED_VIA_VALUES)[number];

export const EXERCISE_DIFFICULTIES = ["gentle", "beginner", "intermediate", "advanced"] as const;
export type ExerciseDifficulty = (typeof EXERCISE_DIFFICULTIES)[number];

export const BUDGET_TIERS = ["low", "medium", "high"] as const;
export type BudgetTier = (typeof BUDGET_TIERS)[number];

// --- Phase 2 additions (mirror 00008 check constraints and enrollment settings) ---

export const PROTEIN_FAMILIARITY_LEVELS = ["new", "some", "confident"] as const;
export type ProteinFamiliarity = (typeof PROTEIN_FAMILIARITY_LEVELS)[number];

/** Phoenix focus styles — a target weight is never required. */
export const PHOENIX_STYLES = ["habit", "performance", "weight", "non-scale", "balanced"] as const;
export type PhoenixStyle = (typeof PHOENIX_STYLES)[number];

/**
 * Rhythm participation modes. Always optional; no regularity or menstruation
 * is ever assumed, and there is no fertility tracking.
 */
export const RHYTHM_MODES = ["symptom-led", "not-applicable", "prefer-not-to-track"] as const;
export type RhythmMode = (typeof RHYTHM_MODES)[number];
