/**
 * Saelis Her — analytics payload validation (Phase 6).
 *
 * Every event's metadata is validated against a STRICT per-event Zod schema:
 * unknown properties are rejected, values are coarse enums/buckets/counters,
 * and no free text longer than a short identifier can pass. A defense-in-depth
 * screen additionally rejects any key that even resembles sensitive content
 * (see PROHIBITED_METADATA_KEY_FRAGMENTS) and any oversized payload — so a
 * future allowlist mistake still cannot admit symptom text, journal entries,
 * companion messages, meal descriptions, endpoints, or secrets.
 */
import { z } from "zod";

import { ANALYTICS_MAX_METADATA_BYTES, ANALYTICS_MAX_METADATA_KEYS } from "@/lib/analytics/config";
import {
  ANALYTICS_EVENT_NAME_SET,
  ANALYTICS_EVENT_VERSIONS,
  ANALYTICS_SOURCES,
  SAFETY_REASON_CATEGORIES,
  isProhibitedMetadataKey,
  normalizeRoute,
  type AnalyticsEventName,
} from "@/lib/analytics/taxonomy";
import { PATHWAY_KEYS } from "@/lib/wellness/pathways/types";
import { SAFETY_ENGINE_TIERS, PLAN_MODULES } from "@/lib/wellness/safety/engine";

// --- Coarse building blocks --------------------------------------------------

const shortKey = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9_:-]+$/i, "identifier-like values only");

const pathwayKey = z.enum(PATHWAY_KEYS);
const safetyTier = z.enum(SAFETY_ENGINE_TIERS);
const planModule = z.enum([...PLAN_MODULES, "all", "none"]);
const reasonCategory = z.enum(SAFETY_REASON_CATEGORIES);
const smallCount = z.number().int().min(0).max(1000);

const onboardingStep = z.enum([
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
]);

/** Optional context keys every event may carry — still coarse, still typed. */
const commonMetadata = {
  app_version: z.string().trim().max(20).optional(),
  device_category: z.enum(["mobile", "tablet", "desktop", "unknown"]).optional(),
  client_type: z.enum(["web", "server"]).optional(),
};

const emptyMetadata = z.object({ ...commonMetadata }).strict();

// --- Per-event metadata allowlists ------------------------------------------

const onboardingStepMetadata = z.object({ ...commonMetadata, step: onboardingStep }).strict();

const onboardingCompletionMetadata = z
  .object({
    ...commonMetadata,
    pathway_count: z.number().int().min(1).max(6),
    step: onboardingStep.optional(),
  })
  .strict();

const pathwayMetadata = z.object({ ...commonMetadata, pathway: pathwayKey }).strict();

const planMetadata = z
  .object({
    ...commonMetadata,
    adaptation_level: z.enum(["standard", "reduced", "recovery", "safety_hold"]).optional(),
    safety_tier: safetyTier.optional(),
    quick_selection: shortKey.optional(),
    refresh: z.boolean().optional(),
  })
  .strict();

const checkInMetadata = z
  .object({
    ...commonMetadata,
    readiness: z.enum(["energized", "okay", "tired", "overwhelmed", "in_pain"]).optional(),
  })
  .strict();

const workoutMetadata = z
  .object({
    ...commonMetadata,
    workout_type: shortKey.optional(),
    workout_location: shortKey.optional(),
    duration_bucket: z
      .enum(["0-10", "11-20", "21-30", "31-45", "46-60", "60+", "unknown"])
      .optional(),
    completion_status: z.enum(["planned", "completed", "partial", "skipped"]).optional(),
  })
  .strict();

const nutritionMetadata = z
  .object({
    ...commonMetadata,
    meal_type: z.enum(["breakfast", "lunch", "dinner", "snack", "beverage"]).optional(),
    logged_via: z.enum(["manual", "quick_add", "ai_estimate"]).optional(),
    nutrition_mode: shortKey.optional(),
    refresh: z.boolean().optional(),
  })
  .strict();

const milestoneMetadata = z.object({ ...commonMetadata, milestone_type: shortKey }).strict();

const notificationMetadata = z
  .object({
    ...commonMetadata,
    notification_category: shortKey,
    suppression_reason: shortKey.optional(),
    error_category: shortKey.optional(),
  })
  .strict();

const companionMetadata = z
  .object({ ...commonMetadata, under_safety_hold: z.boolean().optional() })
  .strict();

/**
 * Safety analytics carry ONLY: tier (also encoded in the event name), one
 * broad reason category, the plan module affected, and a day bucket. Active
 * pathway keys live on the envelope. Nothing else can pass this schema.
 */
const safetyMetadata = z
  .object({
    ...commonMetadata,
    reason_category: reasonCategory,
    module_affected: planModule.optional(),
    day_bucket: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

const systemMetadata = z
  .object({
    ...commonMetadata,
    error_category: shortKey.optional(),
    job_key: shortKey.optional(),
    operation: shortKey.optional(),
    processed_count: smallCount.optional(),
    failure_count: smallCount.optional(),
  })
  .strict();

type MetadataSchema = z.ZodType<Record<string, unknown>>;

const METADATA_SCHEMAS: Readonly<Record<AnalyticsEventName, MetadataSchema>> = {
  // Onboarding
  saelis_her_onboarding_started: emptyMetadata,
  saelis_her_onboarding_step_viewed: onboardingStepMetadata,
  saelis_her_onboarding_step_completed: onboardingStepMetadata,
  saelis_her_onboarding_resumed: onboardingStepMetadata,
  saelis_her_onboarding_completed: onboardingCompletionMetadata,
  saelis_her_onboarding_abandoned: onboardingStepMetadata,
  // Pathways
  pathway_enrolled: pathwayMetadata,
  pathway_paused: pathwayMetadata,
  pathway_resumed: pathwayMetadata,
  pathway_archived: pathwayMetadata,
  reset_activated: emptyMetadata,
  reset_deactivated: emptyMetadata,
  // Daily planning
  daily_check_in_started: checkInMetadata,
  daily_check_in_completed: checkInMetadata,
  daily_plan_generated: planMetadata,
  daily_plan_refreshed: planMetadata,
  daily_plan_reduced: planMetadata,
  daily_plan_recovery_only: planMetadata,
  daily_plan_safety_hold: planMetadata,
  daily_plan_completed: planMetadata,
  daily_plan_partially_completed: planMetadata,
  daily_plan_skipped: planMetadata,
  daily_plan_replaced: planMetadata,
  // Movement
  workout_viewed: workoutMetadata,
  workout_started: workoutMetadata,
  workout_completed: workoutMetadata,
  workout_partially_completed: workoutMetadata,
  workout_skipped: workoutMetadata,
  workout_replaced: workoutMetadata,
  exercise_replaced: workoutMetadata,
  exercise_modified: workoutMetadata,
  workout_pain_reported: workoutMetadata,
  workout_symptom_reported: workoutMetadata,
  // Nutrition and hydration
  meal_plan_generated: nutritionMetadata,
  meal_plan_regenerated: nutritionMetadata,
  meal_replaced: nutritionMetadata,
  meal_logged: nutritionMetadata,
  protein_quick_added: nutritionMetadata,
  hydration_quick_added: nutritionMetadata,
  nutrition_target_viewed: nutritionMetadata,
  grocery_list_viewed: nutritionMetadata,
  // Progress and milestones
  progress_dashboard_viewed: emptyMetadata,
  milestone_achieved: milestoneMetadata,
  milestone_viewed: milestoneMetadata,
  weight_tracking_enabled: emptyMetadata,
  weight_tracking_disabled: emptyMetadata,
  calorie_tracking_enabled: emptyMetadata,
  calorie_tracking_disabled: emptyMetadata,
  // Notifications
  notification_scheduled: notificationMetadata,
  notification_delivered: notificationMetadata,
  notification_opened: notificationMetadata,
  notification_dismissed: notificationMetadata,
  notification_suppressed: notificationMetadata,
  notification_failed: notificationMetadata,
  push_subscription_invalidated: emptyMetadata,
  // Companion experience (Sprint 4) — content-free coarse facts only.
  notification_permission_prompted: emptyMetadata,
  notification_permission_granted: emptyMetadata,
  notification_permission_denied: emptyMetadata,
  notification_preference_updated: emptyMetadata,
  conversation_starter_used: z.object({ ...commonMetadata, starter_key: shortKey }).strict(),
  memory_enabled: emptyMetadata,
  memory_disabled: emptyMetadata,
  memory_deleted: emptyMetadata,
  temporary_mode_enabled: emptyMetadata,
  // Companion
  companion_opened_from_wellness: companionMetadata,
  companion_wellness_context_requested: companionMetadata,
  companion_safety_boundary_applied: companionMetadata,
  companion_response_failed: companionMetadata,
  // Safety aggregation
  safety_assessment_completed: safetyMetadata,
  safety_tier_normal: safetyMetadata,
  safety_tier_modify: safetyMetadata,
  safety_tier_recovery_only: safetyMetadata,
  safety_tier_hold_and_contact_professional: safetyMetadata,
  safety_tier_urgent_support: safetyMetadata,
  // System operations
  api_operation_failed: systemMetadata,
  plan_generation_failed: systemMetadata,
  meal_plan_generation_failed: systemMetadata,
  notification_job_started: systemMetadata,
  notification_job_completed: systemMetadata,
  notification_job_failed: systemMetadata,
  scheduled_job_started: systemMetadata,
  scheduled_job_completed: systemMetadata,
  scheduled_job_failed: systemMetadata,
  database_operation_failed: systemMetadata,
};

// --- Envelope ----------------------------------------------------------------

export const analyticsEventEnvelopeSchema = z
  .object({
    eventName: z.string().refine((name) => ANALYTICS_EVENT_NAME_SET.has(name), {
      message: "unknown analytics event",
    }),
    eventVersion: z.number().int().min(1).optional(),
    occurredAt: z.string().datetime({ offset: true }).optional(),
    userId: z.string().uuid().nullable().optional(),
    anonymousSessionId: z.string().uuid().nullable().optional(),
    pathwayKeys: z.array(pathwayKey).max(6).default([]),
    source: z.enum(ANALYTICS_SOURCES),
    route: z.string().max(300).nullable().optional(),
    metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  })
  .strict();

export type AnalyticsEventEnvelope = z.infer<typeof analyticsEventEnvelopeSchema>;

export interface ValidatedAnalyticsEvent {
  event_name: AnalyticsEventName;
  event_version: number;
  occurred_at: string;
  user_id: string | null;
  anonymous_session_id: string | null;
  pathway_keys: string[];
  source: (typeof ANALYTICS_SOURCES)[number];
  route: string | null;
  metadata: Record<string, string | number | boolean>;
}

export type AnalyticsValidationResult =
  { ok: true; event: ValidatedAnalyticsEvent } | { ok: false; reason: string };

/**
 * Full boundary validation. Never throws. The caller supplies the SERVER-
 * derived userId — any userId inside `input` is ignored by the recording
 * service before this function is called.
 */
export function validateAnalyticsEvent(input: unknown): AnalyticsValidationResult {
  const envelope = analyticsEventEnvelopeSchema.safeParse(input);
  if (!envelope.success) return { ok: false, reason: "invalid_envelope" };

  const eventName = envelope.data.eventName as AnalyticsEventName;
  const expectedVersion = ANALYTICS_EVENT_VERSIONS[eventName];
  if (envelope.data.eventVersion != null && envelope.data.eventVersion !== expectedVersion) {
    return { ok: false, reason: "invalid_event_version" };
  }

  const metadata = envelope.data.metadata;
  const keys = Object.keys(metadata);
  if (keys.length > ANALYTICS_MAX_METADATA_KEYS) return { ok: false, reason: "oversized_metadata" };
  if (keys.some(isProhibitedMetadataKey)) return { ok: false, reason: "prohibited_metadata_key" };
  if (JSON.stringify(metadata).length > ANALYTICS_MAX_METADATA_BYTES) {
    return { ok: false, reason: "oversized_metadata" };
  }

  const schema = METADATA_SCHEMAS[eventName];
  const parsedMetadata = schema.safeParse(metadata);
  if (!parsedMetadata.success) return { ok: false, reason: "invalid_metadata" };

  return {
    ok: true,
    event: {
      event_name: eventName,
      event_version: expectedVersion,
      occurred_at: envelope.data.occurredAt ?? new Date().toISOString(),
      user_id: envelope.data.userId ?? null,
      anonymous_session_id: envelope.data.anonymousSessionId ?? null,
      pathway_keys: envelope.data.pathwayKeys,
      source: envelope.data.source,
      route: normalizeRoute(envelope.data.route),
      metadata: parsedMetadata.data as Record<string, string | number | boolean>,
    },
  };
}
