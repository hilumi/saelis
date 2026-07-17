/**
 * Saelis Her — pure analytics aggregation (Phase 6).
 *
 * Every function here is pure and synchronous: it takes minimized event rows
 * and returns aggregates. Small-cohort protection is applied wherever a
 * dimension could describe a small group — those return `insufficient` rather
 * than a number. Nothing in this module can access content: the rows carry
 * only names, coarse metadata, pathway keys, and (optional) user ids that
 * are used for distinct counts and never returned.
 */
import { ACTIVE_USER_QUALIFYING_EVENTS, type AnalyticsEventName } from "@/lib/analytics/taxonomy";

/** The minimized row shape the aggregators accept. */
export interface AnalyticsEventLite {
  event_name: string;
  occurred_at: string;
  user_id: string | null;
  pathway_keys: string[];
  metadata: Record<string, string | number | boolean>;
}

export type CohortValue = { kind: "value"; value: number } | { kind: "insufficient" };

export function cohortValue(users: number, minCohort: number, value: number): CohortValue {
  return users >= minCohort ? { kind: "value", value } : { kind: "insufficient" };
}

// --- Basic counters ---------------------------------------------------------

export function countEvents(events: AnalyticsEventLite[], ...names: string[]): number {
  const set = new Set(names);
  return events.reduce((sum, event) => (set.has(event.event_name) ? sum + 1 : sum), 0);
}

export function distinctUsers(events: AnalyticsEventLite[], ...names: string[]): number {
  const set = new Set(names);
  const users = new Set<string>();
  for (const event of events) {
    if ((set.size === 0 || set.has(event.event_name)) && event.user_id) users.add(event.user_id);
  }
  return users.size;
}

/** Distinct users with at least one QUALIFYING event (the active-user rule). */
export function activeUsers(events: AnalyticsEventLite[]): number {
  const users = new Set<string>();
  for (const event of events) {
    if (
      event.user_id &&
      ACTIVE_USER_QUALIFYING_EVENTS.has(event.event_name as AnalyticsEventName)
    ) {
      users.add(event.user_id);
    }
  }
  return users.size;
}

export function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10; // one decimal, %
}

// --- Overview ----------------------------------------------------------------

export interface OverviewMetrics {
  activeUsers: number;
  onboardingStarted: number;
  onboardingCompleted: number;
  onboardingCompletionRate: number | null;
  plansGenerated: number;
  plansRefreshed: number;
  planSafetyHolds: number;
  workoutsCompleted: number;
  workoutsPartiallyCompleted: number;
  workoutsSkipped: number;
  workoutsReplaced: number;
  workoutCompletionRate: number | null;
  workoutReplacementRate: number | null;
  /** Approximation, labeled as such in the UI: completed workouts ÷ generated plans. */
  planFollowThroughRate: number | null;
  mealPlansGenerated: number;
  mealsLogged: number;
  proteinActions: number;
  hydrationActions: number;
  resetActivations: number;
  milestoneAchievements: number;
  pathwayEnrollments: number;
  notificationsScheduled: number;
  notificationsDelivered: number;
  notificationsOpened: number;
  notificationsSuppressed: number;
  notificationsFailed: number;
  notificationDeliveryRate: number | null;
  notificationOpenRate: number | null;
  notificationSuppressionRate: number | null;
  notificationFailureRate: number | null;
  planGenerationFailures: number;
  planGenerationFailureRate: number | null;
  systemFailures: number;
  safetyHolds: number;
  urgentSupportCount: number;
  recoveryOnlyCount: number;
}

export function computeOverview(events: AnalyticsEventLite[]): OverviewMetrics {
  const onboardingStarted = distinctUsers(events, "saelis_her_onboarding_started");
  const onboardingCompleted = distinctUsers(events, "saelis_her_onboarding_completed");
  const plansGenerated = countEvents(events, "daily_plan_generated");
  const workoutsCompleted = countEvents(events, "workout_completed");
  const workoutsPartial = countEvents(events, "workout_partially_completed");
  const workoutsSkipped = countEvents(events, "workout_skipped");
  const workoutsReplaced = countEvents(events, "workout_replaced");
  const workoutOutcomes = workoutsCompleted + workoutsPartial + workoutsSkipped;
  const scheduled = countEvents(events, "notification_scheduled");
  const delivered = countEvents(events, "notification_delivered");
  const opened = countEvents(events, "notification_opened");
  const suppressed = countEvents(events, "notification_suppressed");
  const notificationFailed = countEvents(events, "notification_failed");
  const planFailures = countEvents(events, "plan_generation_failed");
  const holds = countEvents(events, "safety_tier_hold_and_contact_professional");
  const urgent = countEvents(events, "safety_tier_urgent_support");
  const recoveryOnly = countEvents(events, "safety_tier_recovery_only");

  return {
    activeUsers: activeUsers(events),
    onboardingStarted,
    onboardingCompleted,
    onboardingCompletionRate: rate(onboardingCompleted, onboardingStarted),
    plansGenerated,
    plansRefreshed: countEvents(events, "daily_plan_refreshed"),
    planSafetyHolds: countEvents(events, "daily_plan_safety_hold"),
    workoutsCompleted,
    workoutsPartiallyCompleted: workoutsPartial,
    workoutsSkipped,
    workoutsReplaced,
    workoutCompletionRate: rate(workoutsCompleted, workoutOutcomes),
    workoutReplacementRate: rate(workoutsReplaced, workoutOutcomes + workoutsReplaced),
    planFollowThroughRate: rate(workoutsCompleted, plansGenerated),
    mealPlansGenerated: countEvents(events, "meal_plan_generated", "meal_plan_regenerated"),
    mealsLogged: countEvents(events, "meal_logged"),
    proteinActions: countEvents(events, "protein_quick_added"),
    hydrationActions: countEvents(events, "hydration_quick_added"),
    resetActivations: countEvents(events, "reset_activated"),
    milestoneAchievements: countEvents(events, "milestone_achieved"),
    pathwayEnrollments: countEvents(events, "pathway_enrolled"),
    notificationsScheduled: scheduled,
    notificationsDelivered: delivered,
    notificationsOpened: opened,
    notificationsSuppressed: suppressed,
    notificationsFailed: notificationFailed,
    notificationDeliveryRate: rate(delivered, scheduled),
    notificationOpenRate: rate(opened, delivered),
    notificationSuppressionRate: rate(suppressed, scheduled),
    notificationFailureRate: rate(notificationFailed, scheduled),
    planGenerationFailures: planFailures,
    planGenerationFailureRate: rate(planFailures, plansGenerated + planFailures),
    systemFailures: countEvents(
      events,
      "api_operation_failed",
      "plan_generation_failed",
      "meal_plan_generation_failed",
      "database_operation_failed",
      "scheduled_job_failed",
      "notification_job_failed",
    ),
    safetyHolds: holds,
    urgentSupportCount: urgent,
    recoveryOnlyCount: recoveryOnly,
  };
}

// --- Onboarding funnel -------------------------------------------------------

export const ONBOARDING_FUNNEL_STEPS = [
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

export interface FunnelStep {
  step: string;
  users: number;
  conversionFromPrevious: number | null;
}

export interface OnboardingFunnel {
  started: number;
  completed: number;
  completionRate: number | null;
  abandonmentRate: number | null;
  steps: FunnelStep[];
  /** Median minutes from started to completed; null when unsafe (small n). */
  medianCompletionMinutes: number | null;
}

export function computeOnboardingFunnel(
  events: AnalyticsEventLite[],
  minCohort: number,
): OnboardingFunnel {
  const started = distinctUsers(events, "saelis_her_onboarding_started");
  const completed = distinctUsers(events, "saelis_her_onboarding_completed");

  const usersByStep = new Map<string, Set<string>>();
  for (const event of events) {
    if (event.event_name !== "saelis_her_onboarding_step_completed" || !event.user_id) continue;
    const step = typeof event.metadata.step === "string" ? event.metadata.step : null;
    if (!step) continue;
    const set = usersByStep.get(step) ?? new Set<string>();
    set.add(event.user_id);
    usersByStep.set(step, set);
  }

  const steps: FunnelStep[] = [];
  let previous: number | null = null;
  for (const step of ONBOARDING_FUNNEL_STEPS) {
    const users = usersByStep.get(step)?.size ?? 0;
    // Conditional steps (restore/rhythm/phoenix) are skipped when absent.
    if (users === 0 && ["restore", "rhythm", "phoenix"].includes(step)) continue;
    steps.push({
      step,
      users,
      conversionFromPrevious: previous != null ? rate(users, previous) : null,
    });
    previous = users > 0 ? users : previous;
  }

  // Median completion time — only when the cohort is large enough.
  const startedAt = new Map<string, number>();
  const completedAt = new Map<string, number>();
  for (const event of events) {
    if (!event.user_id) continue;
    const at = Date.parse(event.occurred_at);
    if (event.event_name === "saelis_her_onboarding_started") {
      const existing = startedAt.get(event.user_id);
      if (existing == null || at < existing) startedAt.set(event.user_id, at);
    }
    if (event.event_name === "saelis_her_onboarding_completed") {
      const existing = completedAt.get(event.user_id);
      if (existing == null || at < existing) completedAt.set(event.user_id, at);
    }
  }
  const durations: number[] = [];
  for (const [userId, doneAt] of completedAt) {
    const beganAt = startedAt.get(userId);
    if (beganAt != null && doneAt >= beganAt) durations.push((doneAt - beganAt) / 60_000);
  }
  durations.sort((a, b) => a - b);
  const medianDuration = durations[Math.floor(durations.length / 2)];
  const medianCompletionMinutes =
    durations.length >= minCohort && medianDuration !== undefined
      ? Math.round(medianDuration)
      : null;

  return {
    started,
    completed,
    completionRate: rate(completed, started),
    abandonmentRate: started > 0 ? rate(started - completed, started) : null,
    steps,
    medianCompletionMinutes,
  };
}

// --- Distributions (cohort-protected) ---------------------------------------

export interface DistributionEntry {
  value: string;
  count: number;
  users: number;
}

export interface Distribution {
  entries: DistributionEntry[];
  /** Number of groups hidden by small-cohort protection. */
  suppressedGroups: number;
}

/**
 * Generic cohort-protected distribution over a metadata key (or extractor).
 * Groups with fewer than `minCohort` distinct users are suppressed entirely.
 */
export function computeDistribution(
  events: AnalyticsEventLite[],
  eventNames: string[],
  extractor: (event: AnalyticsEventLite) => string | null,
  minCohort: number,
): Distribution {
  const names = new Set(eventNames);
  const groups = new Map<string, { count: number; users: Set<string> }>();
  for (const event of events) {
    if (!names.has(event.event_name)) continue;
    const value = extractor(event);
    if (!value) continue;
    const group = groups.get(value) ?? { count: 0, users: new Set<string>() };
    group.count += 1;
    if (event.user_id) group.users.add(event.user_id);
    groups.set(value, group);
  }
  const entries: DistributionEntry[] = [];
  let suppressedGroups = 0;
  for (const [value, group] of groups) {
    if (group.users.size < minCohort) {
      suppressedGroups += 1;
      continue;
    }
    entries.push({ value, count: group.count, users: group.users.size });
  }
  entries.sort((a, b) => b.count - a.count);
  return { entries, suppressedGroups };
}

/** Pathway distribution from enrollment events (cohort-protected). */
export function computePathwayDistribution(
  events: AnalyticsEventLite[],
  minCohort: number,
): Distribution {
  return computeDistribution(
    events,
    ["pathway_enrolled"],
    (event) => (typeof event.metadata.pathway === "string" ? event.metadata.pathway : null),
    minCohort,
  );
}

/**
 * Pathway combinations: each user's most recent plan-generation event carries
 * their active pathway set. Combinations smaller than the cohort minimum are
 * suppressed.
 */
export function computePathwayCombinations(
  events: AnalyticsEventLite[],
  minCohort: number,
): Distribution {
  const latestByUser = new Map<string, { at: number; combination: string }>();
  for (const event of events) {
    if (event.event_name !== "daily_plan_generated" || !event.user_id) continue;
    if (event.pathway_keys.length === 0) continue;
    const at = Date.parse(event.occurred_at);
    const existing = latestByUser.get(event.user_id);
    if (!existing || at > existing.at) {
      latestByUser.set(event.user_id, {
        at,
        combination: [...event.pathway_keys].sort().join(" + "),
      });
    }
  }
  const groups = new Map<string, number>();
  for (const { combination } of latestByUser.values()) {
    groups.set(combination, (groups.get(combination) ?? 0) + 1);
  }
  const entries: DistributionEntry[] = [];
  let suppressedGroups = 0;
  for (const [value, users] of groups) {
    if (users < minCohort) {
      suppressedGroups += 1;
      continue;
    }
    entries.push({ value, count: users, users });
  }
  entries.sort((a, b) => b.users - a.users);
  return { entries, suppressedGroups };
}

// --- Trends ------------------------------------------------------------------

export interface TrendPoint {
  date: string;
  count: number;
  users: number;
}

/** Daily trend for a set of events (activity by UTC day). */
export function computeTrend(events: AnalyticsEventLite[], eventNames: string[]): TrendPoint[] {
  const names = new Set(eventNames);
  const byDay = new Map<string, { count: number; users: Set<string> }>();
  for (const event of events) {
    if (!names.has(event.event_name)) continue;
    const day = event.occurred_at.slice(0, 10);
    const bucket = byDay.get(day) ?? { count: 0, users: new Set<string>() };
    bucket.count += 1;
    if (event.user_id) bucket.users.add(event.user_id);
    byDay.set(day, bucket);
  }
  return [...byDay.entries()]
    .map(([date, bucket]) => ({ date, count: bucket.count, users: bucket.users.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Daily active-user trend using the qualifying-event rule. */
export function computeActiveUserTrend(events: AnalyticsEventLite[]): TrendPoint[] {
  return computeTrend(
    events.filter((event) =>
      ACTIVE_USER_QUALIFYING_EVENTS.has(event.event_name as AnalyticsEventName),
    ),
    [...ACTIVE_USER_QUALIFYING_EVENTS],
  );
}

// --- Safety aggregation ------------------------------------------------------

export interface SafetyAggregation {
  tierDistribution: Array<{ tier: string; count: number }>;
  urgentSupportCount: number;
  recoveryOnlyCount: number;
  holdCount: number;
  holdsByPathway: Distribution;
  holdTrend: TrendPoint[];
}

const SAFETY_TIER_EVENTS = [
  "safety_tier_normal",
  "safety_tier_modify",
  "safety_tier_recovery_only",
  "safety_tier_hold_and_contact_professional",
  "safety_tier_urgent_support",
];

export function computeSafetyAggregation(
  events: AnalyticsEventLite[],
  minCohort: number,
): SafetyAggregation {
  const tierDistribution = SAFETY_TIER_EVENTS.map((name) => ({
    tier: name.replace("safety_tier_", ""),
    count: countEvents(events, name),
  }));
  const holdEvents = ["safety_tier_hold_and_contact_professional", "safety_tier_urgent_support"];
  return {
    tierDistribution,
    urgentSupportCount: countEvents(events, "safety_tier_urgent_support"),
    recoveryOnlyCount: countEvents(events, "safety_tier_recovery_only"),
    holdCount: countEvents(events, ...holdEvents),
    holdsByPathway: computeDistribution(
      events,
      holdEvents,
      // Broad pathway category only — one entry per pathway on the event.
      (event) => [...event.pathway_keys].sort()[0] ?? null,
      minCohort,
    ),
    holdTrend: computeTrend(events, holdEvents),
  };
}

// --- Retention ---------------------------------------------------------------

export interface RetentionMetrics {
  cohortSize: number;
  day1: CohortValue;
  day7: CohortValue;
  day14: CohortValue;
  day30: CohortValue;
}

/**
 * Retention relative to onboarding completion: the share of completers with a
 * qualifying event on/after N days later (within the provided window). All
 * four figures are cohort-protected.
 */
export function computeRetention(
  events: AnalyticsEventLite[],
  minCohort: number,
): RetentionMetrics {
  const completedAt = new Map<string, number>();
  for (const event of events) {
    if (event.event_name !== "saelis_her_onboarding_completed" || !event.user_id) continue;
    const at = Date.parse(event.occurred_at);
    const existing = completedAt.get(event.user_id);
    if (existing == null || at < existing) completedAt.set(event.user_id, at);
  }
  const activityByUser = new Map<string, number[]>();
  for (const event of events) {
    if (!event.user_id) continue;
    if (!ACTIVE_USER_QUALIFYING_EVENTS.has(event.event_name as AnalyticsEventName)) continue;
    const list = activityByUser.get(event.user_id) ?? [];
    list.push(Date.parse(event.occurred_at));
    activityByUser.set(event.user_id, list);
  }
  const day = 24 * 60 * 60 * 1000;
  const retainedAfter = (days: number): number => {
    let retained = 0;
    for (const [userId, doneAt] of completedAt) {
      const activity = activityByUser.get(userId) ?? [];
      if (activity.some((at) => at >= doneAt + days * day)) retained += 1;
    }
    return retained;
  };
  const cohortSize = completedAt.size;
  const value = (days: number): CohortValue =>
    cohortValue(cohortSize, minCohort, rate(retainedAfter(days), cohortSize) ?? 0);
  return {
    cohortSize,
    day1: value(1),
    day7: value(7),
    day14: value(14),
    day30: value(30),
  };
}
