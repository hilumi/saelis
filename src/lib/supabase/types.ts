/**
 * TEMPORARY TYPE BOUNDARY — hand-written Database type.
 *
 * Supabase can generate this file from a live project:
 *   npx supabase gen types typescript --project-id <project-id> --schema public \
 *     > src/lib/supabase/generated.types.ts
 *
 * Once generated, replace this Database definition with the generated one and
 * delete the hand-written table definitions. The row shapes in
 * src/types/database.ts mirror supabase/migrations exactly; any drift is a bug.
 */
import type {
  AdaptivePreferenceRow,
  AnalyticsDailyRollupRow,
  AnalyticsEventRow,
  AnalyticsJobRunRow,
  AppRoleRow,
  ArrivalRow,
  CompanionNotificationPreferencesRow,
  PatternEvidenceRow,
  PatternHypothesisRow,
  CompanionMemoryRow,
  CompanionProfileRow,
  ConversationRow,
  ConversationTurnRow,
  HorizonStepRow,
  NotificationDeliveryRow,
  ProfileRow,
  PushTokenRow,
  StewardshipEventRow,
  UserPrivacySettingsRow,
} from "@/types/database";
import type {
  ExerciseLibraryRow,
  MealTemplateRow,
  PostpartumCheckInRow,
  PostpartumProfileRow,
  WellnessDailyCheckInRow,
  WellnessDailyMetricsRow,
  WellnessDailyPlanRow,
  WellnessEnrollmentRow,
  WellnessExerciseLogRow,
  WellnessGoalRow,
  WellnessMealPlanRow,
  WellnessMilestoneRow,
  WellnessNotificationPreferencesRow,
  WellnessNutritionLogRow,
  WellnessOnboardingDraftRow,
  WellnessPathwayRow,
  WellnessProgramRow,
  WellnessProgramWeekRow,
  WellnessWorkoutLogRow,
  WomenWellnessProfileRow,
  WorkoutTemplateExerciseRow,
  WorkoutTemplateRow,
} from "@/types/wellness";

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

/** Insert helper: required keys + everything else optional. */
type InsertOf<Row, Required extends keyof Row> = Pick<Row, Required> & Partial<Omit<Row, Required>>;

type ProfileInsert = Pick<ProfileRow, "id"> &
  Partial<Pick<ProfileRow, "preferred_name" | "timezone" | "onboarded_at">>;

type CompanionProfileInsert = Pick<CompanionProfileRow, "user_id"> &
  Partial<Omit<CompanionProfileRow, "user_id" | "created_at" | "updated_at">>;

type ArrivalInsert = Pick<ArrivalRow, "user_id" | "mood" | "energy" | "support_need"> &
  Partial<Pick<ArrivalRow, "id" | "message" | "include_faith_reflection">>;

type ConversationInsert = Pick<ConversationRow, "user_id"> &
  Partial<Pick<ConversationRow, "id" | "title" | "status">>;

type ConversationTurnInsert = Pick<
  ConversationTurnRow,
  "conversation_id" | "user_id" | "role" | "content"
> &
  Partial<
    Pick<ConversationTurnRow, "id" | "support_mode" | "closing_line" | "provider_response_id">
  >;

type HorizonStepInsert = Pick<
  HorizonStepRow,
  "user_id" | "title" | "description" | "estimated_minutes"
> &
  Partial<Pick<HorizonStepRow, "id" | "conversation_id" | "arrival_id" | "completed">>;

type CompanionMemoryInsert = Pick<
  CompanionMemoryRow,
  "user_id" | "category" | "content" | "source"
> &
  Partial<
    Pick<
      CompanionMemoryRow,
      | "id"
      | "status"
      | "user_approved"
      | "kind"
      | "title"
      | "reason"
      | "position_seed"
      | "last_used_at"
      | "use_count"
    >
  >;

type AppRoleInsert = Pick<AppRoleRow, "user_id" | "role">;

// Adaptation tables have NO ordinary insert path (security-definer functions
// only), but the client type still needs an Insert shape.
type AdaptivePreferenceInsert = Pick<AdaptivePreferenceRow, "user_id" | "key"> &
  Partial<Omit<AdaptivePreferenceRow, "user_id" | "key">>;
type PatternHypothesisInsert = Pick<
  PatternHypothesisRow,
  "user_id" | "theme" | "observation" | "uncertainty_statement"
> &
  Partial<
    Omit<PatternHypothesisRow, "user_id" | "theme" | "observation" | "uncertainty_statement">
  >;
type PatternEvidenceInsert = Pick<
  PatternEvidenceRow,
  "hypothesis_id" | "user_id" | "source_type" | "evidence_summary"
> &
  Partial<
    Omit<PatternEvidenceRow, "hypothesis_id" | "user_id" | "source_type" | "evidence_summary">
  >;
type StewardshipEventInsert = Pick<StewardshipEventRow, "user_id" | "event_type"> &
  Partial<Omit<StewardshipEventRow, "id" | "user_id" | "event_type" | "created_at">>;

type UserPrivacySettingsInsert = Pick<UserPrivacySettingsRow, "user_id"> &
  Partial<
    Pick<
      UserPrivacySettingsRow,
      "save_conversation_history" | "allow_companion_memory" | "allow_product_analytics"
    >
  >;

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, ProfileInsert>;
      companion_profiles: Table<CompanionProfileRow, CompanionProfileInsert>;
      arrivals: Table<ArrivalRow, ArrivalInsert>;
      conversations: Table<ConversationRow, ConversationInsert>;
      conversation_turns: Table<ConversationTurnRow, ConversationTurnInsert>;
      horizon_steps: Table<HorizonStepRow, HorizonStepInsert>;
      companion_memories: Table<CompanionMemoryRow, CompanionMemoryInsert>;
      user_privacy_settings: Table<UserPrivacySettingsRow, UserPrivacySettingsInsert>;
      app_roles: Table<AppRoleRow, AppRoleInsert>;
      stewardship_events: Table<StewardshipEventRow, StewardshipEventInsert>;
      adaptive_preferences: Table<AdaptivePreferenceRow, AdaptivePreferenceInsert>;
      pattern_hypotheses: Table<PatternHypothesisRow, PatternHypothesisInsert>;
      pattern_evidence: Table<PatternEvidenceRow, PatternEvidenceInsert>;
      // --- Saelis Her (00007). Neutral naming for shared tables; postpartum
      // --- tables are Restore-only. See CLAUDE.md.
      wellness_pathways: Table<WellnessPathwayRow, InsertOf<WellnessPathwayRow, "key">>;
      wellness_enrollments: Table<
        WellnessEnrollmentRow,
        InsertOf<WellnessEnrollmentRow, "user_id" | "pathway_key">
      >;
      women_wellness_profiles: Table<
        WomenWellnessProfileRow,
        InsertOf<WomenWellnessProfileRow, "user_id">
      >;
      postpartum_profiles: Table<
        PostpartumProfileRow,
        InsertOf<PostpartumProfileRow, "user_id" | "enrollment_id" | "postpartum_stage">
      >;
      wellness_goals: Table<WellnessGoalRow, InsertOf<WellnessGoalRow, "user_id" | "goal_type">>;
      wellness_daily_check_ins: Table<
        WellnessDailyCheckInRow,
        InsertOf<WellnessDailyCheckInRow, "user_id" | "check_in_date">
      >;
      postpartum_check_ins: Table<
        PostpartumCheckInRow,
        InsertOf<PostpartumCheckInRow, "user_id" | "enrollment_id" | "check_in_date">
      >;
      wellness_programs: Table<
        WellnessProgramRow,
        InsertOf<
          WellnessProgramRow,
          | "user_id"
          | "start_date"
          | "end_date"
          | "total_weeks"
          | "primary_goal"
          | "weekly_training_days"
          | "nutrition_strategy"
          | "safety_tier"
        >
      >;
      wellness_program_weeks: Table<
        WellnessProgramWeekRow,
        InsertOf<
          WellnessProgramWeekRow,
          "program_id" | "week_number" | "phase_number" | "phase_name" | "weekly_focus"
        >
      >;
      wellness_daily_plans: Table<
        WellnessDailyPlanRow,
        InsertOf<WellnessDailyPlanRow, "user_id" | "plan_date">
      >;
      wellness_workout_logs: Table<
        WellnessWorkoutLogRow,
        InsertOf<
          WellnessWorkoutLogRow,
          "user_id" | "workout_date" | "workout_type" | "title" | "source" | "completion_status"
        >
      >;
      wellness_exercise_logs: Table<
        WellnessExerciseLogRow,
        InsertOf<WellnessExerciseLogRow, "workout_log_id" | "exercise_name" | "sequence_number">
      >;
      wellness_nutrition_logs: Table<
        WellnessNutritionLogRow,
        InsertOf<WellnessNutritionLogRow, "user_id" | "log_date" | "meal_type" | "description">
      >;
      wellness_daily_metrics: Table<
        WellnessDailyMetricsRow,
        InsertOf<WellnessDailyMetricsRow, "user_id" | "metric_date">
      >;
      wellness_meal_plans: Table<
        WellnessMealPlanRow,
        InsertOf<WellnessMealPlanRow, "user_id" | "week_start_date" | "plan_data">
      >;
      wellness_milestones: Table<
        WellnessMilestoneRow,
        InsertOf<WellnessMilestoneRow, "user_id" | "milestone_key" | "milestone_type">
      >;
      exercise_library: Table<
        ExerciseLibraryRow,
        InsertOf<ExerciseLibraryRow, "slug" | "name" | "category" | "difficulty" | "instructions">
      >;
      workout_templates: Table<
        WorkoutTemplateRow,
        InsertOf<
          WorkoutTemplateRow,
          | "slug"
          | "name"
          | "description"
          | "location"
          | "approximate_minutes"
          | "difficulty"
          | "intensity_guidance"
        >
      >;
      workout_template_exercises: Table<
        WorkoutTemplateExerciseRow,
        InsertOf<WorkoutTemplateExerciseRow, "template_id" | "exercise_id" | "sequence_number">
      >;
      meal_templates: Table<
        MealTemplateRow,
        InsertOf<MealTemplateRow, "slug" | "name" | "meal_type" | "description">
      >;
      wellness_onboarding_drafts: Table<
        WellnessOnboardingDraftRow,
        InsertOf<WellnessOnboardingDraftRow, "user_id">
      >;
      wellness_notification_preferences: Table<
        WellnessNotificationPreferencesRow,
        InsertOf<WellnessNotificationPreferencesRow, "user_id">
      >;
      // --- Phase 6 admin analytics (00009). Deny-by-default RLS (no
      // --- policies); server-only service-role access. See CLAUDE.md.
      analytics_events: Table<
        AnalyticsEventRow,
        InsertOf<AnalyticsEventRow, "event_name" | "source">
      >;
      analytics_daily_rollups: Table<
        AnalyticsDailyRollupRow,
        InsertOf<AnalyticsDailyRollupRow, "rollup_date" | "metric_key" | "metric_value">
      >;
      analytics_job_runs: Table<
        AnalyticsJobRunRow,
        InsertOf<AnalyticsJobRunRow, "job_key" | "started_at" | "status">
      >;
      // --- Sprint 4 companion notifications (00010). notification_deliveries
      // --- is deny-by-default (server-only); the other two are own-row RLS.
      push_tokens: Table<PushTokenRow, InsertOf<PushTokenRow, "user_id" | "token">>;
      companion_notification_preferences: Table<
        CompanionNotificationPreferencesRow,
        InsertOf<CompanionNotificationPreferencesRow, "user_id">
      >;
      notification_deliveries: Table<
        NotificationDeliveryRow,
        InsertOf<NotificationDeliveryRow, "user_id" | "category" | "idempotency_key">
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      is_founder: { Args: Record<string, never>; Returns: boolean };
      stewardship_event_counts: {
        Args: { days?: number };
        Returns: { event_type: string; occurrences: number }[];
      };
      stewardship_memory_counts: {
        Args: Record<string, never>;
        Returns: { kind: string; status: string; occurrences: number }[];
      };
      record_adaptive_observation: {
        Args: {
          p_key: string;
          p_value?: Record<string, string | number | boolean>;
          p_explicit?: boolean;
        };
        Returns: string;
      };
      record_adaptation_correction: {
        Args: { p_id: string };
        Returns: undefined;
      };
      record_pattern_evidence: {
        Args: {
          p_theme: string;
          p_observation: string;
          p_uncertainty: string;
          p_source_type: string;
          p_summary: string;
          p_cross_domain?: boolean;
        };
        Returns: string | null;
      };
      adaptation_aggregate_counts: {
        Args: Record<string, never>;
        Returns: { record_kind: string; status: string; occurrences: number }[];
      };
      feedback_category_counts: {
        Args: { days?: number };
        Returns: { feedback_category: string; occurrences: number }[];
      };
      anonymize_my_analytics_events: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
