import "server-only";

import { minCohortSize } from "@/lib/analytics/config";
import {
  activeUsers,
  computeOverview,
  computePathwayDistribution,
  distinctUsers,
  type AnalyticsEventLite,
} from "@/lib/analytics/metrics";
import { completeJobRun, failJobRun, recordJobRun } from "@/lib/analytics/record";
import { listAnalyticsEvents } from "@/lib/db/queries/analytics/events";
import { upsertDailyRollups } from "@/lib/db/queries/analytics/rollups";
import { createAdminClient } from "@/lib/supabase/admin";

import type { TablesInsert } from "@/lib/supabase/types";

/**
 * Saelis Her — daily analytics rollup (Phase 6).
 *
 * Aggregates ONE UTC day of raw events into analytics_daily_rollups.
 * De-identified by construction (metric keys + numeric values), idempotent by
 * upsert on the composite primary key, and dimension-allowlisted: only the
 * dimensions below can ever be written. Dimension values under the minimum
 * cohort are never written at all.
 *
 * Late events: because reruns REPLACE the day's rows, re-running the rollup
 * for a past date after late events arrive brings that day up to date. The
 * cron route accepts an explicit ?date= for exactly this backfill purpose.
 */

export const ROLLUP_JOB_KEY = "analytics_daily_rollup";

/** The ONLY dimension keys a rollup row may carry. */
export const ROLLUP_DIMENSION_ALLOWLIST = ["all", "pathway"] as const;

export const ROLLUP_METRIC_KEYS = [
  "onboarding_started",
  "onboarding_completed",
  "daily_active_wellness_users",
  "daily_plans_generated",
  "workouts_completed",
  "workouts_replaced",
  "meal_plans_generated",
  "meals_logged",
  "hydration_actions",
  "protein_actions",
  "reset_activation_count",
  "milestone_achievements",
  "safety_hold_count",
  "urgent_support_count",
  "plan_generation_failures",
  "pathway_enrollments",
] as const;
export type RollupMetricKey = (typeof ROLLUP_METRIC_KEYS)[number];

/** Pure: compute one day's rollup rows from that day's events. */
export function computeDailyRollupRows(
  rollupDate: string,
  events: AnalyticsEventLite[],
  minCohort: number,
): TablesInsert<"analytics_daily_rollups">[] {
  const overview = computeOverview(events);
  const rows: TablesInsert<"analytics_daily_rollups">[] = [];

  const push = (
    metricKey: RollupMetricKey,
    value: number,
    uniqueUsersCount: number | null = null,
    dimensionKey: (typeof ROLLUP_DIMENSION_ALLOWLIST)[number] = "all",
    dimensionValue = "all",
  ) => {
    if (!ROLLUP_DIMENSION_ALLOWLIST.includes(dimensionKey)) return;
    rows.push({
      rollup_date: rollupDate,
      metric_key: metricKey,
      dimension_key: dimensionKey,
      dimension_value: dimensionValue,
      metric_value: value,
      unique_users: uniqueUsersCount,
      metadata: {},
    });
  };

  push("onboarding_started", overview.onboardingStarted, overview.onboardingStarted);
  push("onboarding_completed", overview.onboardingCompleted, overview.onboardingCompleted);
  push("daily_active_wellness_users", activeUsers(events), activeUsers(events));
  push(
    "daily_plans_generated",
    overview.plansGenerated,
    distinctUsers(events, "daily_plan_generated"),
  );
  push(
    "workouts_completed",
    overview.workoutsCompleted,
    distinctUsers(events, "workout_completed"),
  );
  push("workouts_replaced", overview.workoutsReplaced, distinctUsers(events, "workout_replaced"));
  push("meal_plans_generated", overview.mealPlansGenerated, null);
  push("meals_logged", overview.mealsLogged, distinctUsers(events, "meal_logged"));
  push(
    "hydration_actions",
    overview.hydrationActions,
    distinctUsers(events, "hydration_quick_added"),
  );
  push("protein_actions", overview.proteinActions, distinctUsers(events, "protein_quick_added"));
  push("reset_activation_count", overview.resetActivations, null);
  push("milestone_achievements", overview.milestoneAchievements, null);
  push("safety_hold_count", overview.safetyHolds, null);
  push("urgent_support_count", overview.urgentSupportCount, null);
  push("plan_generation_failures", overview.planGenerationFailures, null);
  push("pathway_enrollments", overview.pathwayEnrollments, null);

  // Pathway-dimensioned enrollments — cohort-protected: small groups are
  // simply never written.
  const pathwayDistribution = computePathwayDistribution(events, minCohort);
  for (const entry of pathwayDistribution.entries) {
    push("pathway_enrollments", entry.count, entry.users, "pathway", entry.value);
  }

  // Sanity: nothing below the cohort minimum in a dimensioned row.
  return rows.filter(
    (row) =>
      row.dimension_key === "all" || (row.unique_users != null && row.unique_users >= minCohort),
  );
}

export interface RollupResult {
  ok: boolean;
  rollupDate: string;
  rowsWritten: number;
  errorCategory?: string;
}

/** Yesterday (UTC) — the default rollup target. */
export function defaultRollupDate(now = new Date()): string {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return yesterday.toISOString().slice(0, 10);
}

/**
 * Run the rollup for one UTC day. Records its own job run; safe to re-run
 * (idempotent upsert). Never throws.
 */
export async function runDailyAnalyticsRollup(rollupDate?: string): Promise<RollupResult> {
  const date = rollupDate ?? defaultRollupDate();
  const jobRunId = await recordJobRun(ROLLUP_JOB_KEY, { rollup_date: date });
  try {
    const admin = createAdminClient();
    const nextDay = new Date(Date.parse(`${date}T00:00:00.000Z`) + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const events = await listAnalyticsEvents(admin, {
      fromISO: `${date}T00:00:00.000Z`,
      toISO: `${nextDay}T00:00:00.000Z`,
    });
    const rows = computeDailyRollupRows(date, events, minCohortSize());
    await upsertDailyRollups(admin, rows);
    await completeJobRun(jobRunId, { processed: events.length, succeeded: rows.length });
    return { ok: true, rollupDate: date, rowsWritten: rows.length };
  } catch {
    await failJobRun(jobRunId, "rollup_failed");
    return { ok: false, rollupDate: date, rowsWritten: 0, errorCategory: "rollup_failed" };
  }
}
