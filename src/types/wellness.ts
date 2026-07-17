/**
 * Saelis Her — row shapes matching supabase/migrations/00007 exactly
 * (snake_case). Part of the TEMPORARY TYPE BOUNDARY (see src/types/database.ts);
 * regenerate real types once the migration is applied to a live project.
 *
 * JSONB columns are typed as WellnessJson here; the application NEVER consumes
 * them unchecked — every JSONB boundary is validated by the Zod schemas in
 * src/lib/validation/wellness.ts.
 */
import type { PathwayKey } from "@/lib/wellness/pathways/types";
import type {
  AdaptationLevel,
  BudgetTier,
  CompletionStatus,
  DeliveryType,
  EnrollmentStatus,
  ExerciseDifficulty,
  FeedingStatus,
  GoalStatus,
  GoalType,
  IncisionStatus,
  LoggedVia,
  MealType,
  MedicalClearanceStatus,
  MovementExperience,
  NotificationStyle,
  PlanStatus,
  PostpartumStage,
  ProgramStatus,
  ReadinessState,
  UnitsPreference,
  WorkoutSource,
} from "@/lib/wellness/constants";

export type WellnessJson =
  string | number | boolean | null | { [key: string]: WellnessJson | undefined } | WellnessJson[];

export type WellnessPathwayRow = {
  key: PathwayKey;
  display_name: string;
  description: string;
  category: string;
  route: string;
  active: boolean;
  sort_order: number;
  metadata: WellnessJson;
  created_at: string;
  updated_at: string;
};

export type WellnessEnrollmentRow = {
  id: string;
  user_id: string;
  pathway_key: PathwayKey;
  status: EnrollmentStatus;
  started_on: string;
  completed_on: string | null;
  current_phase: number;
  current_week: number;
  program_length_weeks: number | null;
  goal_summary: string | null;
  settings: WellnessJson;
  created_at: string;
  updated_at: string;
};

export type WomenWellnessProfileRow = {
  user_id: string;
  date_of_birth: string | null;
  height_inches: number | null;
  current_weight_lbs: number | null;
  target_weight_lbs: number | null;
  desired_weight_change_lbs: number | null;
  goal_timeframe_months: number | null;
  movement_experience: MovementExperience;
  preferred_training_locations: string[];
  available_equipment: string[];
  preferred_workout_days: number;
  preferred_workout_minutes: number;
  average_daily_steps: number | null;
  dietary_pattern: string | null;
  food_allergies: string[];
  food_dislikes: string[];
  household_meal_preferences: string | null;
  budget_preference: string | null;
  meal_prep_preference: string | null;
  tracks_calories: boolean;
  tracks_weight: boolean;
  weighs_daily: boolean;
  cycle_tracking_enabled: boolean;
  postpartum_pathway_relevant: boolean;
  notification_style: NotificationStyle;
  units_preference: UnitsPreference;
  // Phase 2 (00008) — optional movement/nutrition preferences.
  movement_limitations: string[];
  movement_dislikes: string[];
  floor_transitions_difficult: boolean;
  prefers_beginner_explanations: boolean;
  quick_meals_preferred: boolean;
  protein_familiarity: string | null;
  portion_guidance_preferred: boolean;
  family_style_meals: boolean;
  created_at: string;
  updated_at: string;
};

/** Resumable Saelis Her onboarding draft (00008). data is Zod-validated JSONB. */
export type WellnessOnboardingDraftRow = {
  user_id: string;
  current_step: string;
  data: WellnessJson;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Saelis Her reminder preferences (00008). Choices only — no delivery yet. */
export type WellnessNotificationPreferencesRow = {
  user_id: string;
  reminder_style: NotificationStyle;
  morning_check_in: boolean;
  workout_reminders: boolean;
  nourishment_reminders: boolean;
  hydration_reminders: boolean;
  evening_reflection: boolean;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  max_daily_notifications: number;
  created_at: string;
  updated_at: string;
};

/** RESTORE ONLY — never surfaced to non-Restore users, never logged. */
export type PostpartumProfileRow = {
  user_id: string;
  enrollment_id: string;
  postpartum_stage: PostpartumStage;
  delivery_date: string | null;
  delivery_type: DeliveryType | null;
  cesarean_count: number | null;
  feeding_status: FeedingStatus;
  medical_clearance_status: MedicalClearanceStatus;
  reported_restrictions: string | null;
  pelvic_floor_symptoms: boolean;
  pelvic_floor_details: string | null;
  suspected_diastasis: boolean;
  diastasis_assessed_by_professional: boolean;
  abdominal_doming_or_coning: boolean;
  chronic_pain: boolean;
  pain_details: string | null;
  iron_deficiency_or_anemia: boolean;
  fatigue_concern: boolean;
  incision_status: IncisionStatus | null;
  created_at: string;
  updated_at: string;
};

export type WellnessGoalRow = {
  id: string;
  user_id: string;
  enrollment_id: string | null;
  pathway_key: PathwayKey | null;
  goal_type: GoalType;
  target_numeric: number | null;
  target_unit: string | null;
  target_date: string | null;
  priority: number;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
};

export type WellnessDailyCheckInRow = {
  id: string;
  user_id: string;
  check_in_date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  energy: number | null;
  mood: number | null;
  stress: number | null;
  soreness: number | null;
  pain_level: number | null;
  pain_location: string[];
  readiness: ReadinessState | null;
  available_minutes: number | null;
  available_location: string | null;
  illness_or_injury_concern: boolean;
  chest_pain: boolean;
  dizziness_or_fainting: boolean;
  shortness_of_breath: boolean;
  severe_headache: boolean;
  self_harm_concern: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** RESTORE ONLY. */
export type PostpartumCheckInRow = {
  id: string;
  user_id: string;
  enrollment_id: string;
  check_in_date: string;
  bleeding_concern: boolean;
  heavy_bleeding: boolean;
  incision_concern: boolean;
  pelvic_heaviness_or_pressure: boolean;
  urinary_or_bowel_symptom: boolean;
  calf_pain_or_swelling: boolean;
  severe_abdominal_or_pelvic_pain: boolean;
  breast_or_feeding_concern: boolean;
  doming_or_coning: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WellnessProgramRow = {
  id: string;
  user_id: string;
  status: ProgramStatus;
  version: number;
  start_date: string;
  end_date: string;
  total_weeks: number;
  primary_goal: string;
  weekly_training_days: number;
  nutrition_strategy: string;
  safety_tier: string;
  active_pathway_keys: string[];
  generated_from_profile_version: string | null;
  rationale: string | null;
  created_at: string;
  updated_at: string;
};

export type WellnessProgramWeekRow = {
  id: string;
  program_id: string;
  week_number: number;
  phase_number: number;
  phase_name: string;
  weekly_focus: string;
  active_pathway_keys: string[];
  strength_sessions_target: number;
  cardio_sessions_target: number;
  mobility_sessions_target: number;
  recovery_sessions_target: number;
  step_target: number | null;
  protein_target_grams: number | null;
  hydration_target_ounces: number | null;
  calorie_target: number | null;
  calorie_range_low: number | null;
  calorie_range_high: number | null;
  deload_week: boolean;
  notes: string | null;
  created_at: string;
};

export type WellnessDailyPlanRow = {
  id: string;
  user_id: string;
  plan_date: string;
  program_week_id: string | null;
  active_pathway_keys: string[];
  readiness_snapshot: WellnessJson | null;
  plan_status: PlanStatus;
  movement_plan: WellnessJson;
  nutrition_plan: WellnessJson;
  hydration_plan: WellnessJson;
  recovery_plan: WellnessJson;
  postpartum_plan: WellnessJson | null;
  adaptation_level: AdaptationLevel;
  adaptation_reason: string | null;
  safety_message: string | null;
  generated_by: string;
  created_at: string;
  updated_at: string;
};

export type WellnessWorkoutLogRow = {
  id: string;
  user_id: string;
  daily_plan_id: string | null;
  workout_date: string;
  pathway_keys: string[];
  workout_type: string;
  title: string;
  source: WorkoutSource;
  planned_duration_minutes: number | null;
  actual_duration_minutes: number | null;
  completion_status: CompletionStatus;
  perceived_exertion: number | null;
  pain_during: boolean;
  doming_or_coning: boolean;
  pelvic_floor_symptom: boolean;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WellnessExerciseLogRow = {
  id: string;
  workout_log_id: string;
  exercise_id: string | null;
  exercise_name: string;
  sequence_number: number;
  sets_completed: number | null;
  reps_completed: string | null;
  weight_used_lbs: number | null;
  duration_seconds: number | null;
  distance: string | null;
  modification_used: string | null;
  notes: string | null;
};

export type WellnessNutritionLogRow = {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: MealType;
  description: string;
  estimated_calories: number | null;
  protein_grams: number | null;
  carbohydrates_grams: number | null;
  fat_grams: number | null;
  fiber_grams: number | null;
  iron_rich: boolean;
  fruit_or_vegetable_servings: number | null;
  logged_via: LoggedVia;
  estimation_notice: boolean;
  created_at: string;
  updated_at: string;
};

export type WellnessDailyMetricsRow = {
  user_id: string;
  metric_date: string;
  weight_lbs: number | null;
  waist_inches: number | null;
  hip_inches: number | null;
  chest_inches: number | null;
  thigh_inches: number | null;
  steps: number | null;
  water_ounces: number | null;
  protein_grams: number | null;
  calories: number | null;
  fiber_grams: number | null;
  sleep_hours: number | null;
  resting_heart_rate: number | null;
  active_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WellnessMealPlanRow = {
  id: string;
  user_id: string;
  week_start_date: string;
  active_pathway_keys: string[];
  calorie_target: number | null;
  calorie_range_low: number | null;
  calorie_range_high: number | null;
  protein_target_grams: number | null;
  hydration_target_ounces: number | null;
  plan_data: WellnessJson;
  generated_by: string;
  created_at: string;
  updated_at: string;
};

export type WellnessMilestoneRow = {
  id: string;
  user_id: string;
  pathway_key: PathwayKey | null;
  milestone_key: string;
  milestone_type: string;
  achieved_at: string;
  numeric_value: number | null;
  celebration_message: string | null;
  notification_sent_at: string | null;
  created_at: string;
};

export type ExerciseLibraryRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  movement_pattern: string | null;
  primary_muscles: string[];
  equipment: string[];
  locations: string[];
  difficulty: ExerciseDifficulty;
  instructions: string;
  coaching_cues: string[];
  common_mistakes: string[];
  regression_slug: string | null;
  progression_slug: string | null;
  pathway_tags: string[];
  safety_tags: string[];
  avoid_when: string[];
  video_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkoutTemplateRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  pathway_tags: string[];
  location: string;
  approximate_minutes: number;
  phase_min: number;
  phase_max: number;
  difficulty: ExerciseDifficulty;
  safety_tags: string[];
  intensity_guidance: string;
  modification_notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkoutTemplateExerciseRow = {
  id: string;
  template_id: string;
  exercise_id: string;
  sequence_number: number;
  sets: number | null;
  reps: string | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  intensity_guidance: string | null;
  modification_notes: string | null;
};

export type MealTemplateRow = {
  id: string;
  slug: string;
  name: string;
  meal_type: MealType;
  description: string;
  preparation_minutes: number | null;
  servings: number;
  estimated_calories: number | null;
  protein_grams: number | null;
  carbohydrates_grams: number | null;
  fat_grams: number | null;
  fiber_grams: number | null;
  iron_rich: boolean;
  pathway_tags: string[];
  breastfeeding_compatible: boolean | null;
  freezer_friendly: boolean;
  budget_tier: BudgetTier | null;
  dietary_tags: string[];
  allergen_tags: string[];
  ingredients: WellnessJson;
  instructions: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};
