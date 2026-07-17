import "server-only";

import { minCohortSize } from "@/lib/analytics/config";
import {
  computeActiveUserTrend,
  computeDistribution,
  computeOnboardingFunnel,
  computeOverview,
  computePathwayCombinations,
  computePathwayDistribution,
  computeRetention,
  computeSafetyAggregation,
  computeTrend,
  type AnalyticsEventLite,
  type Distribution,
  type OnboardingFunnel,
  type OverviewMetrics,
  type RetentionMetrics,
  type SafetyAggregation,
  type TrendPoint,
} from "@/lib/analytics/metrics";
import { listAnalyticsEvents } from "@/lib/db/queries/analytics/events";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Saelis Her — admin analytics data service (Phase 6). SERVER-ONLY.
 *
 * Callers MUST have passed requireAdminAccess() before calling anything here
 * (every admin page and route does; see src/lib/auth/admin-access.ts). This
 * module then reads the deny-by-default analytics tables with the
 * service-role client and returns AGGREGATES ONLY — no row-level data, no
 * user identifiers, no metadata leaves this boundary.
 */

export interface DateRange {
  fromISO: string;
  toISO: string;
  label: string;
}

export type RangeKey = "7d" | "30d" | "90d";

export interface RangeParams {
  range?: string;
  from?: string;
  to?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Resolve a validated date range from search params: a preset key
 * (7d/30d/90d) or a custom from/to pair of ISO dates (capped at 366 days).
 * Anything malformed falls back to the last 30 days.
 */
export function resolveRange(
  params: RangeParams | string | undefined,
  now = new Date(),
): DateRange {
  const normalized: RangeParams = typeof params === "string" ? { range: params } : (params ?? {});

  if (
    normalized.from &&
    normalized.to &&
    ISO_DATE.test(normalized.from) &&
    ISO_DATE.test(normalized.to)
  ) {
    const fromMs = Date.parse(`${normalized.from}T00:00:00.000Z`);
    const toMs = Date.parse(`${normalized.to}T00:00:00.000Z`) + 24 * 60 * 60 * 1000;
    if (
      Number.isFinite(fromMs) &&
      Number.isFinite(toMs) &&
      toMs > fromMs &&
      toMs - fromMs <= 366 * 24 * 60 * 60 * 1000
    ) {
      return {
        fromISO: new Date(fromMs).toISOString(),
        toISO: new Date(Math.min(toMs, now.getTime())).toISOString(),
        label: `${normalized.from} to ${normalized.to}`,
      };
    }
  }

  const days = normalized.range === "90d" ? 90 : normalized.range === "7d" ? 7 : 30;
  const to = now.toISOString();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  return { fromISO: from, toISO: to, label: `Last ${days} days` };
}

/** The equivalent immediately-preceding period, for comparisons. */
export function previousRange(range: DateRange): DateRange {
  const fromMs = Date.parse(range.fromISO);
  const toMs = Date.parse(range.toISO);
  const span = toMs - fromMs;
  return {
    fromISO: new Date(fromMs - span).toISOString(),
    toISO: range.fromISO,
    label: "Previous period",
  };
}

export interface AdminAnalyticsOverview {
  range: DateRange;
  minCohort: number;
  current: OverviewMetrics;
  previous: OverviewMetrics;
  funnel: OnboardingFunnel;
  activeUserTrend: TrendPoint[];
  planTrend: TrendPoint[];
  workoutTrend: TrendPoint[];
  nutritionTrend: TrendPoint[];
  resetTrend: TrendPoint[];
  pathwayDistribution: Distribution;
  pathwayCombinations: Distribution;
  workoutTypeDistribution: Distribution;
  workoutReplacedTypeDistribution: Distribution;
  milestoneDistribution: Distribution;
  notificationCategoryDistribution: Distribution;
  suppressionReasonDistribution: Distribution;
  safety: SafetyAggregation;
  retention: RetentionMetrics;
  eventCount: number;
}

function metadataString(key: string) {
  return (event: AnalyticsEventLite): string | null => {
    const value = event.metadata[key];
    return typeof value === "string" ? value : null;
  };
}

/** Load and aggregate everything the admin analytics pages render. */
export async function loadAdminAnalyticsOverview(
  rangeParams: RangeParams | string | undefined,
): Promise<AdminAnalyticsOverview> {
  const admin = createAdminClient();
  const range = resolveRange(rangeParams);
  const prior = previousRange(range);
  const minCohort = minCohortSize();

  const [events, previousEvents] = await Promise.all([
    listAnalyticsEvents(admin, range),
    listAnalyticsEvents(admin, prior),
  ]);

  return {
    range,
    minCohort,
    current: computeOverview(events),
    previous: computeOverview(previousEvents),
    funnel: computeOnboardingFunnel(events, minCohort),
    activeUserTrend: computeActiveUserTrend(events),
    planTrend: computeTrend(events, ["daily_plan_generated", "daily_plan_refreshed"]),
    workoutTrend: computeTrend(events, ["workout_completed", "workout_partially_completed"]),
    nutritionTrend: computeTrend(events, ["meal_logged", "protein_quick_added"]),
    resetTrend: computeTrend(events, ["reset_activated"]),
    pathwayDistribution: computePathwayDistribution(events, minCohort),
    pathwayCombinations: computePathwayCombinations(events, minCohort),
    workoutTypeDistribution: computeDistribution(
      events,
      ["workout_completed", "workout_partially_completed", "workout_skipped"],
      metadataString("workout_type"),
      minCohort,
    ),
    workoutReplacedTypeDistribution: computeDistribution(
      events,
      ["workout_replaced"],
      metadataString("workout_type"),
      minCohort,
    ),
    milestoneDistribution: computeDistribution(
      events,
      ["milestone_achieved"],
      metadataString("milestone_type"),
      minCohort,
    ),
    notificationCategoryDistribution: computeDistribution(
      events,
      ["notification_scheduled", "notification_delivered", "notification_opened"],
      metadataString("notification_category"),
      minCohort,
    ),
    suppressionReasonDistribution: computeDistribution(
      events,
      ["notification_suppressed"],
      metadataString("suppression_reason"),
      minCohort,
    ),
    safety: computeSafetyAggregation(events, minCohort),
    retention: computeRetention(events, minCohort),
    eventCount: events.length,
  };
}
