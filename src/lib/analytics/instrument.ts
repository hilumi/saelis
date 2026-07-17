import "server-only";

import { durationBucket } from "@/lib/analytics/config";
import {
  recordAuthenticatedAnalyticsEvent,
  recordSafetyAnalyticsEvent,
} from "@/lib/analytics/record";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { DailyPlanOutcome } from "@/lib/wellness/planner/service";
import type { PathwayKey } from "@/lib/wellness/pathways/types";
import type { AnalyticsEventName } from "@/lib/analytics/taxonomy";

type Client = SupabaseClient<Database>;

/**
 * Saelis Her — analytics instrumentation helpers (Phase 6).
 *
 * Thin, guarded adapters between authoritative product moments (a stored
 * plan, a persisted workout log, a deduplicated milestone) and the recording
 * service. Every function is fire-safe: it never throws and never blocks a
 * user workflow on analytics. Only coarse categories leave this module —
 * titles, notes, descriptions, and symptoms never do.
 */

/** Coarsen a free-ish label into an identifier-safe, short category value. */
export function coarseLabel(value: string | null | undefined): string {
  if (!value) return "unknown";
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return cleaned.length > 0 ? cleaned : "unknown";
}

/**
 * Record the outcome of an ACTUAL daily-plan generation (outcome.engine is
 * null when a stored plan was returned untouched — nothing is recorded then,
 * which is exactly the no-duplicate guarantee).
 */
export async function recordDailyPlanOutcome(
  supabase: Client,
  userId: string,
  planDate: string,
  outcome: DailyPlanOutcome,
  options: { refresh?: boolean; replaced?: boolean } = {},
): Promise<void> {
  try {
    const engine = outcome.engine;
    if (!engine) return;

    const pathwayKeys = engine.planInput.activePathwayKeys as PathwayKey[];
    const adaptationLevel = engine.planInput.adaptationLevel;
    const baseEvent: AnalyticsEventName = options.replaced
      ? "daily_plan_replaced"
      : options.refresh
        ? "daily_plan_refreshed"
        : "daily_plan_generated";

    await recordAuthenticatedAnalyticsEvent(supabase, userId, {
      eventName: baseEvent,
      pathwayKeys,
      metadata: {
        adaptation_level: adaptationLevel,
        safety_tier: engine.safety.safetyTier,
        refresh: options.refresh ?? false,
      },
      dedupeKey:
        baseEvent === "daily_plan_generated" ? `plan_generated:${userId}:${planDate}` : undefined,
    });

    // Adaptation-shape events (coarse, deduplicated per user/day/shape).
    const shapeEvent: AnalyticsEventName | null =
      adaptationLevel === "safety_hold"
        ? "daily_plan_safety_hold"
        : adaptationLevel === "recovery"
          ? "daily_plan_recovery_only"
          : adaptationLevel === "reduced"
            ? "daily_plan_reduced"
            : null;
    if (shapeEvent) {
      await recordAuthenticatedAnalyticsEvent(supabase, userId, {
        eventName: shapeEvent,
        pathwayKeys,
        metadata: { adaptation_level: adaptationLevel },
        dedupeKey: `plan_shape:${userId}:${planDate}:${shapeEvent}`,
      });
    }

    // Safety tier — straight from the deterministic engine's output.
    await recordSafetyAnalyticsEvent(
      supabase,
      userId,
      { tier: engine.safety.safetyTier, reasonCodes: engine.safety.reasonCodes },
      pathwayKeys,
      planDate,
    );
  } catch {
    // Instrumentation must never break plan generation.
  }
}

/** Record workout completion events from the PERSISTED workout log input. */
export async function recordWorkoutLogEvents(
  supabase: Client,
  userId: string,
  workout: {
    pathwayKeys: readonly string[];
    workoutType: string;
    completionStatus: "planned" | "completed" | "partial" | "skipped";
    actualDurationMinutes?: number | null;
    painDuring: boolean;
    domingOrConing: boolean;
    pelvicFloorSymptom: boolean;
  },
): Promise<void> {
  try {
    const statusEvent: AnalyticsEventName | null =
      workout.completionStatus === "completed"
        ? "workout_completed"
        : workout.completionStatus === "partial"
          ? "workout_partially_completed"
          : workout.completionStatus === "skipped"
            ? "workout_skipped"
            : null;
    const metadata = {
      workout_type: coarseLabel(workout.workoutType),
      duration_bucket: durationBucket(workout.actualDurationMinutes),
      completion_status: workout.completionStatus,
    };
    const pathwayKeys = workout.pathwayKeys as PathwayKey[];
    if (statusEvent) {
      await recordAuthenticatedAnalyticsEvent(supabase, userId, {
        eventName: statusEvent,
        pathwayKeys,
        metadata,
      });
    }
    if (workout.painDuring) {
      await recordAuthenticatedAnalyticsEvent(supabase, userId, {
        eventName: "workout_pain_reported",
        pathwayKeys,
        metadata: { workout_type: metadata.workout_type },
      });
    }
    if (workout.domingOrConing || workout.pelvicFloorSymptom) {
      // A symptom happened — WHICH symptom stays out of analytics.
      await recordAuthenticatedAnalyticsEvent(supabase, userId, {
        eventName: "workout_symptom_reported",
        pathwayKeys,
        metadata: { workout_type: metadata.workout_type },
      });
    }
  } catch {
    // Never break a workout save.
  }
}

/** Record milestone achievements AFTER deduplicated creation. */
export async function recordMilestoneEvents(
  supabase: Client,
  userId: string,
  milestones: ReadonlyArray<{ milestoneKey: string; milestoneType: string }>,
): Promise<void> {
  try {
    for (const milestone of milestones) {
      await recordAuthenticatedAnalyticsEvent(supabase, userId, {
        eventName: "milestone_achieved",
        metadata: { milestone_type: coarseLabel(milestone.milestoneType) },
        dedupeKey: `milestone:${userId}:${milestone.milestoneKey}`,
      });
    }
  } catch {
    // Never break a milestone sweep.
  }
}

/** Enrollment lifecycle events (pathway key only — no settings, no reasons). */
export async function recordEnrollmentEvent(
  supabase: Client,
  userId: string,
  pathway: PathwayKey,
  action: "enrolled" | "paused" | "resumed" | "archived",
): Promise<void> {
  try {
    const eventName = `pathway_${action}` as AnalyticsEventName;
    await recordAuthenticatedAnalyticsEvent(supabase, userId, {
      eventName,
      pathwayKeys: [pathway],
      metadata: { pathway },
    });
    if (pathway === "reset" && (action === "enrolled" || action === "resumed")) {
      await recordAuthenticatedAnalyticsEvent(supabase, userId, {
        eventName: "reset_activated",
      });
    }
    if (pathway === "reset" && (action === "paused" || action === "archived")) {
      await recordAuthenticatedAnalyticsEvent(supabase, userId, {
        eventName: "reset_deactivated",
      });
    }
  } catch {
    // Never break enrollment management.
  }
}
