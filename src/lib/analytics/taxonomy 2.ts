/**
 * Saelis Her — analytics event taxonomy (Phase 6).
 *
 * Typed, versioned, and closed: an event either appears here or it cannot be
 * recorded. Names are coarse product facts ("workout_completed"), never
 * content. The metadata each event may carry is allowlisted per event in
 * ./schemas.ts; anything else is rejected at the boundary.
 *
 * SERVER-AUTHORITATIVE events (safety, notifications, system, jobs) can only
 * be recorded by server code — they are rejected for client-originated
 * sources by the recording service.
 */

export const ANALYTICS_SOURCES = [
  "web",
  "server",
  "cron",
  "notification_worker",
  "companion",
  "migration",
  "test",
] as const;
export type AnalyticsSource = (typeof ANALYTICS_SOURCES)[number];

/** Sources a browser-originated request may claim. Everything else is server-authoritative. */
export const CLIENT_SOURCES: readonly AnalyticsSource[] = ["web"];

export const ONBOARDING_EVENTS = [
  "saelis_her_onboarding_started",
  "saelis_her_onboarding_step_viewed",
  "saelis_her_onboarding_step_completed",
  "saelis_her_onboarding_resumed",
  "saelis_her_onboarding_completed",
  "saelis_her_onboarding_abandoned",
] as const;

export const PATHWAY_EVENTS = [
  "pathway_enrolled",
  "pathway_paused",
  "pathway_resumed",
  "pathway_archived",
  "reset_activated",
  "reset_deactivated",
] as const;

export const DAILY_PLANNING_EVENTS = [
  "daily_check_in_started",
  "daily_check_in_completed",
  "daily_plan_generated",
  "daily_plan_refreshed",
  "daily_plan_reduced",
  "daily_plan_recovery_only",
  "daily_plan_safety_hold",
  "daily_plan_completed",
  "daily_plan_partially_completed",
  "daily_plan_skipped",
  "daily_plan_replaced",
] as const;

export const MOVEMENT_EVENTS = [
  "workout_viewed",
  "workout_started",
  "workout_completed",
  "workout_partially_completed",
  "workout_skipped",
  "workout_replaced",
  "exercise_replaced",
  "exercise_modified",
  "workout_pain_reported",
  "workout_symptom_reported",
] as const;

export const NUTRITION_EVENTS = [
  "meal_plan_generated",
  "meal_plan_regenerated",
  "meal_replaced",
  "meal_logged",
  "protein_quick_added",
  "hydration_quick_added",
  "nutrition_target_viewed",
  "grocery_list_viewed",
] as const;

export const PROGRESS_EVENTS = [
  "progress_dashboard_viewed",
  "milestone_achieved",
  "milestone_viewed",
  "weight_tracking_enabled",
  "weight_tracking_disabled",
  "calorie_tracking_enabled",
  "calorie_tracking_disabled",
] as const;

export const NOTIFICATION_EVENTS = [
  "notification_scheduled",
  "notification_delivered",
  "notification_opened",
  "notification_dismissed",
  "notification_suppressed",
  "notification_failed",
  "push_subscription_invalidated",
] as const;

export const COMPANION_EVENTS = [
  "companion_opened_from_wellness",
  "companion_wellness_context_requested",
  "companion_safety_boundary_applied",
  "companion_response_failed",
] as const;

export const SAFETY_EVENTS = [
  "safety_assessment_completed",
  "safety_tier_normal",
  "safety_tier_modify",
  "safety_tier_recovery_only",
  "safety_tier_hold_and_contact_professional",
  "safety_tier_urgent_support",
] as const;

export const SYSTEM_EVENTS = [
  "api_operation_failed",
  "plan_generation_failed",
  "meal_plan_generation_failed",
  "notification_job_started",
  "notification_job_completed",
  "notification_job_failed",
  "scheduled_job_started",
  "scheduled_job_completed",
  "scheduled_job_failed",
  "database_operation_failed",
] as const;

export const ANALYTICS_EVENT_NAMES = [
  ...ONBOARDING_EVENTS,
  ...PATHWAY_EVENTS,
  ...DAILY_PLANNING_EVENTS,
  ...MOVEMENT_EVENTS,
  ...NUTRITION_EVENTS,
  ...PROGRESS_EVENTS,
  ...NOTIFICATION_EVENTS,
  ...COMPANION_EVENTS,
  ...SAFETY_EVENTS,
  ...SYSTEM_EVENTS,
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export const ANALYTICS_EVENT_NAME_SET: ReadonlySet<string> = new Set(ANALYTICS_EVENT_NAMES);

/**
 * Server-authoritative events. Never accepted from client-originated sources:
 * safety tiers come from the deterministic engine, notification delivery from
 * the worker, and job/system events from server infrastructure only.
 */
export const SERVER_ONLY_EVENTS: ReadonlySet<AnalyticsEventName> = new Set([
  ...SAFETY_EVENTS,
  ...NOTIFICATION_EVENTS,
  ...SYSTEM_EVENTS,
  "daily_plan_generated",
  "daily_plan_refreshed",
  "daily_plan_reduced",
  "daily_plan_recovery_only",
  "daily_plan_safety_hold",
  "milestone_achieved",
]);

/**
 * Explicit event versions. Bump a version when an event's meaning or metadata
 * shape changes; queries can then segment by version instead of guessing.
 */
export const ANALYTICS_EVENT_VERSIONS: Readonly<Record<AnalyticsEventName, number>> =
  Object.fromEntries(ANALYTICS_EVENT_NAMES.map((name) => [name, 1])) as Record<
    AnalyticsEventName,
    number
  >;

/**
 * Events that count toward "active user" status. Passive impressions and
 * delivery events are deliberately excluded — activity means the user did
 * something. The definition is documented in docs/admin-analytics.md.
 */
export const ACTIVE_USER_QUALIFYING_EVENTS: ReadonlySet<AnalyticsEventName> = new Set([
  "daily_check_in_completed",
  "daily_plan_generated",
  "workout_started",
  "workout_completed",
  "workout_partially_completed",
  "meal_logged",
  "protein_quick_added",
  "hydration_quick_added",
  "pathway_enrolled",
  "pathway_paused",
  "pathway_resumed",
  "pathway_archived",
  "reset_activated",
  "progress_dashboard_viewed",
  "companion_opened_from_wellness",
  "saelis_her_onboarding_completed",
] as AnalyticsEventName[]);

/**
 * Broad safety reason categories — the ONLY safety detail analytics may
 * carry. Maps the engine's typed reason codes to coarse groups; the exact
 * code, and any symptom detail behind it, never reaches analytics.
 */
export const SAFETY_REASON_CATEGORIES = [
  "cardiovascular_or_acute_symptom",
  "postpartum_symptom",
  "mental_health_concern",
  "pain",
  "clearance_or_recovery_status",
  "fatigue_or_capacity",
  "no_concerns",
  "other",
] as const;
export type SafetyReasonCategory = (typeof SAFETY_REASON_CATEGORIES)[number];

const REASON_CODE_TO_CATEGORY: Readonly<Record<string, SafetyReasonCategory>> = {
  chest_pain: "cardiovascular_or_acute_symptom",
  shortness_of_breath: "cardiovascular_or_acute_symptom",
  fainting_or_dizziness: "cardiovascular_or_acute_symptom",
  severe_headache: "cardiovascular_or_acute_symptom",
  calf_pain_or_swelling: "cardiovascular_or_acute_symptom",
  heavy_bleeding: "postpartum_symptom",
  severe_abdominal_or_pelvic_pain: "postpartum_symptom",
  incision_complication: "postpartum_symptom",
  incision_concern: "postpartum_symptom",
  pelvic_pressure_or_heaviness: "postpartum_symptom",
  leaking_during_exercise: "postpartum_symptom",
  recurring_doming_or_coning: "postpartum_symptom",
  persistent_pelvic_floor_symptoms: "postpartum_symptom",
  self_harm_concern: "mental_health_concern",
  pain_during_exercise: "pain",
  significant_pain: "pain",
  moderate_pain: "pain",
  minor_discomfort: "pain",
  not_medically_cleared: "clearance_or_recovery_status",
  early_postpartum_unknown_clearance: "clearance_or_recovery_status",
  return_after_gap: "clearance_or_recovery_status",
  significant_fatigue: "fatigue_or_capacity",
  poor_sleep: "fatigue_or_capacity",
  mild_illness: "fatigue_or_capacity",
  elevated_soreness: "fatigue_or_capacity",
  overwhelmed: "fatigue_or_capacity",
  high_recent_workload: "fatigue_or_capacity",
  low_energy: "fatigue_or_capacity",
  limited_time: "fatigue_or_capacity",
  moderate_stress: "fatigue_or_capacity",
  mild_soreness: "fatigue_or_capacity",
  no_concerns: "no_concerns",
};

/** Coarsen an engine reason code to its broad analytics category. */
export function toSafetyReasonCategory(reasonCode: string): SafetyReasonCategory {
  return REASON_CODE_TO_CATEGORY[reasonCode] ?? "other";
}

/**
 * Metadata keys that must never appear in analytics metadata, regardless of
 * event. A defense-in-depth screen behind the per-event allowlists: even a
 * future allowlist mistake cannot admit these.
 */
export const PROHIBITED_METADATA_KEY_FRAGMENTS = [
  "symptom_text",
  "note",
  "notes",
  "journal",
  "reflection",
  "message",
  "content",
  "description",
  "email",
  "name",
  "phone",
  "address",
  "ip",
  "token",
  "secret",
  "endpoint",
  "subscription",
  "auth",
  "password",
  "dob",
  "birth",
  "delivery_date",
  "weight_lbs",
  "clearance_note",
  "restriction",
  "pain_location",
  "free_text",
  "body",
  "payload",
  "stack",
] as const;

/** True when a metadata key matches a prohibited fragment. */
export function isProhibitedMetadataKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return PROHIBITED_METADATA_KEY_FRAGMENTS.some(
    (fragment) =>
      normalized === fragment ||
      normalized.startsWith(`${fragment}_`) ||
      normalized.endsWith(`_${fragment}`) ||
      normalized.includes(`_${fragment}_`),
  );
}

/**
 * Route normalization: strip query strings and fragments (never store
 * parameters), collapse UUID-like or numeric segments, and cap length.
 */
export function normalizeRoute(route: string | null | undefined): string | null {
  if (!route) return null;
  const withoutQuery = route.split(/[?#]/)[0] ?? "";
  const collapsed = withoutQuery
    .split("/")
    .map((segment) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
      /^\d+$/.test(segment)
        ? ":id"
        : segment,
    )
    .join("/");
  const trimmed = collapsed.slice(0, 120);
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
