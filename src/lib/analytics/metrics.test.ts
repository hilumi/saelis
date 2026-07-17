import { describe, expect, it } from "vitest";

import {
  activeUsers,
  computeActiveUserTrend,
  computeDistribution,
  computeOnboardingFunnel,
  computeOverview,
  computePathwayCombinations,
  computePathwayDistribution,
  computeRetention,
  computeSafetyAggregation,
  type AnalyticsEventLite,
} from "@/lib/analytics/metrics";

const MIN_COHORT = 5;

function event(
  name: string,
  userId: string | null,
  overrides: Partial<AnalyticsEventLite> = {},
): AnalyticsEventLite {
  return {
    event_name: name,
    occurred_at: "2026-07-10T10:00:00.000Z",
    user_id: userId,
    pathway_keys: [],
    metadata: {},
    ...overrides,
  };
}

function users(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `user-${index}`);
}

describe("overview metrics", () => {
  it("computes counts and rates from events", () => {
    const events: AnalyticsEventLite[] = [
      ...users(10).map((id) => event("saelis_her_onboarding_started", id)),
      ...users(6).map((id) => event("saelis_her_onboarding_completed", id)),
      ...users(8).map((id) => event("daily_plan_generated", id)),
      ...users(4).map((id) => event("workout_completed", id)),
      event("workout_skipped", "user-9"),
      event("workout_replaced", "user-9"),
      event("meal_logged", "user-1"),
      event("hydration_quick_added", "user-2"),
      event("reset_activated", "user-3"),
    ];
    const overview = computeOverview(events);
    expect(overview.onboardingStarted).toBe(10);
    expect(overview.onboardingCompleted).toBe(6);
    expect(overview.onboardingCompletionRate).toBe(60);
    expect(overview.plansGenerated).toBe(8);
    expect(overview.workoutsCompleted).toBe(4);
    expect(overview.workoutCompletionRate).toBe(80); // 4 of 5 outcomes
    expect(overview.workoutReplacementRate).toBeCloseTo(16.7, 1);
    expect(overview.planFollowThroughRate).toBe(50);
    expect(overview.mealsLogged).toBe(1);
    expect(overview.hydrationActions).toBe(1);
    expect(overview.resetActivations).toBe(1);
  });

  it("returns null rates instead of false precision on empty data", () => {
    const overview = computeOverview([]);
    expect(overview.onboardingCompletionRate).toBeNull();
    expect(overview.workoutCompletionRate).toBeNull();
    expect(overview.notificationOpenRate).toBeNull();
    expect(overview.activeUsers).toBe(0);
  });

  it("computes notification rates from lifecycle events", () => {
    const events = [
      ...users(10).map((id) => event("notification_scheduled", id)),
      ...users(8).map((id) => event("notification_delivered", id)),
      ...users(4).map((id) => event("notification_opened", id)),
      ...users(2).map((id) => event("notification_suppressed", id)),
    ];
    const overview = computeOverview(events);
    expect(overview.notificationDeliveryRate).toBe(80);
    expect(overview.notificationOpenRate).toBe(50);
    expect(overview.notificationSuppressionRate).toBe(20);
  });
});

describe("active users", () => {
  it("counts only qualifying events, never passive ones", () => {
    const events = [
      event("workout_completed", "a"),
      event("notification_delivered", "b"),
      event("saelis_her_onboarding_step_viewed", "c"),
      event("meal_logged", "a"),
    ];
    expect(activeUsers(events)).toBe(1);
    expect(computeActiveUserTrend(events)).toHaveLength(1);
  });
});

describe("onboarding funnel", () => {
  it("computes step counts, conversion, and completion", () => {
    const events: AnalyticsEventLite[] = [];
    for (const id of users(10)) {
      events.push(event("saelis_her_onboarding_started", id));
      events.push(
        event("saelis_her_onboarding_step_completed", id, { metadata: { step: "pathways" } }),
      );
    }
    for (const id of users(8)) {
      events.push(
        event("saelis_her_onboarding_step_completed", id, { metadata: { step: "goals" } }),
      );
    }
    for (const id of users(6)) {
      events.push(
        event("saelis_her_onboarding_completed", id, { occurred_at: "2026-07-10T10:30:00.000Z" }),
      );
    }
    const funnel = computeOnboardingFunnel(events, MIN_COHORT);
    expect(funnel.started).toBe(10);
    expect(funnel.completed).toBe(6);
    expect(funnel.completionRate).toBe(60);
    expect(funnel.abandonmentRate).toBe(40);
    const goals = funnel.steps.find((step) => step.step === "goals");
    expect(goals?.users).toBe(8);
    expect(goals?.conversionFromPrevious).toBe(80);
    expect(funnel.medianCompletionMinutes).toBe(30);
  });

  it("withholds median time for small cohorts", () => {
    const events = [
      event("saelis_her_onboarding_started", "a"),
      event("saelis_her_onboarding_completed", "a", { occurred_at: "2026-07-10T11:00:00.000Z" }),
    ];
    const funnel = computeOnboardingFunnel(events, MIN_COHORT);
    expect(funnel.medianCompletionMinutes).toBeNull();
  });
});

describe("small-cohort protection", () => {
  it("suppresses groups below the minimum cohort size", () => {
    const events = [
      ...users(6).map((id) => event("pathway_enrolled", id, { metadata: { pathway: "phoenix" } })),
      ...users(2).map((id) => event("pathway_enrolled", id, { metadata: { pathway: "restore" } })),
    ];
    const distribution = computePathwayDistribution(events, MIN_COHORT);
    expect(distribution.entries).toHaveLength(1);
    expect(distribution.entries[0]?.value).toBe("phoenix");
    expect(distribution.suppressedGroups).toBe(1);
    expect(JSON.stringify(distribution)).not.toContain("restore");
  });

  it("suppresses small pathway combinations", () => {
    const events = [
      ...users(6).map((id) =>
        event("daily_plan_generated", id, { pathway_keys: ["phoenix", "nourish"] }),
      ),
      ...users(2).map((id) =>
        event("daily_plan_generated", `restore-${id}`, { pathway_keys: ["restore"] }),
      ),
    ];
    const combos = computePathwayCombinations(events, MIN_COHORT);
    expect(combos.entries).toHaveLength(1);
    expect(combos.entries[0]?.value).toBe("nourish + phoenix");
    expect(combos.suppressedGroups).toBe(1);
  });

  it("computeDistribution counts distinct users per group", () => {
    const events = [
      ...users(5).map((id) =>
        event("workout_completed", id, { metadata: { workout_type: "strength" } }),
      ),
      event("workout_completed", "user-0", { metadata: { workout_type: "strength" } }),
    ];
    const distribution = computeDistribution(
      events,
      ["workout_completed"],
      (item) =>
        typeof item.metadata.workout_type === "string" ? item.metadata.workout_type : null,
      MIN_COHORT,
    );
    expect(distribution.entries[0]).toEqual({ value: "strength", count: 6, users: 5 });
  });
});

describe("safety aggregation", () => {
  it("aggregates tiers and applies cohort protection to pathway holds", () => {
    const events = [
      ...users(6).map((id) =>
        event("safety_tier_hold_and_contact_professional", id, { pathway_keys: ["phoenix"] }),
      ),
      ...users(2).map((id) =>
        event("safety_tier_urgent_support", `r-${id}`, { pathway_keys: ["restore"] }),
      ),
      ...users(3).map((id) => event("safety_tier_recovery_only", id)),
    ];
    const safety = computeSafetyAggregation(events, MIN_COHORT);
    expect(safety.holdCount).toBe(8);
    expect(safety.urgentSupportCount).toBe(2);
    expect(safety.recoveryOnlyCount).toBe(3);
    expect(safety.tierDistribution.find((t) => t.tier === "recovery_only")?.count).toBe(3);
    // Restore cohort (2) is below the minimum — suppressed from the breakdown.
    expect(safety.holdsByPathway.entries.map((entry) => entry.value)).toEqual(["phoenix"]);
    expect(safety.holdsByPathway.suppressedGroups).toBe(1);
    expect(safety.holdTrend).toHaveLength(1);
  });
});

describe("retention", () => {
  it("computes day-N retention with cohort protection", () => {
    const events: AnalyticsEventLite[] = [];
    for (const id of users(6)) {
      events.push(
        event("saelis_her_onboarding_completed", id, { occurred_at: "2026-07-01T00:00:00.000Z" }),
      );
    }
    // 3 of 6 active on day 7+.
    for (const id of users(3)) {
      events.push(event("workout_completed", id, { occurred_at: "2026-07-09T00:00:00.000Z" }));
    }
    const retention = computeRetention(events, MIN_COHORT);
    expect(retention.cohortSize).toBe(6);
    expect(retention.day7).toEqual({ kind: "value", value: 50 });
  });

  it("returns insufficient for small cohorts", () => {
    const events = [
      event("saelis_her_onboarding_completed", "a", { occurred_at: "2026-07-01T00:00:00.000Z" }),
    ];
    const retention = computeRetention(events, MIN_COHORT);
    expect(retention.day1).toEqual({ kind: "insufficient" });
  });
});
