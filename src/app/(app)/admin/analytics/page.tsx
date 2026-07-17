import { AdminShell } from "@/components/admin/admin-shell";
import { BarList } from "@/components/admin/bar-list";
import { DateRangeControls } from "@/components/admin/date-range-controls";
import { FunnelView } from "@/components/admin/funnel";
import { MetricCard } from "@/components/admin/metric-card";
import { TrendChart } from "@/components/admin/trend-chart";
import { GlassSurface } from "@/components/ui/glass-surface";
import { loadAdminAnalyticsOverview } from "@/lib/analytics/admin-service";
import { requireAdminAccess } from "@/lib/auth/admin-access";
import { recordStewardshipEvent } from "@/lib/db/queries/stewardship";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Saelis Her Analytics" };

/**
 * Admin analytics overview. Server-authorized (deny-by-default 404),
 * aggregates only, cohort-protected, no raw event data in the HTML.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const access = await requireAdminAccess("analytics");
  const params = await searchParams;

  // Content-free access audit (own-row stewardship event; best effort).
  const supabase = await createClient();
  await recordStewardshipEvent(supabase, access.user.id, { event_type: "admin_analytics_viewed" });

  let data: Awaited<ReturnType<typeof loadAdminAnalyticsOverview>> | null = null;
  try {
    data = await loadAdminAnalyticsOverview(params);
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <AdminShell
        title="Saelis Her Analytics"
        subtitle="Aggregated product analytics — no personal records."
        current="/admin/analytics"
        canViewOperations={access.can("operations")}
      >
        <GlassSurface>
          <p className="text-sm text-ink-soft">
            Analytics aren&apos;t available. This usually means migration 00009 hasn&apos;t been
            applied or the server&apos;s service-role key isn&apos;t configured. Nothing is wrong
            with the user experience.
          </p>
        </GlassSurface>
      </AdminShell>
    );
  }

  const { current, previous } = data;

  return (
    <AdminShell
      title="Saelis Her Analytics"
      subtitle="Aggregated product analytics — no personal records."
      current="/admin/analytics"
      canViewOperations={access.can("operations")}
    >
      <DateRangeControls basePath="/admin/analytics" activeLabel={data.range.label} />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Active users"
          value={current.activeUsers}
          previous={previous.activeUsers}
        />
        <MetricCard
          label="Onboarding completion"
          value={current.onboardingCompletionRate}
          previous={previous.onboardingCompletionRate}
          unit="%"
        />
        <MetricCard
          label="Plan follow-through"
          value={current.planFollowThroughRate}
          previous={previous.planFollowThroughRate}
          unit="%"
          note="Completed workouts ÷ generated plans (approximation)"
        />
        <MetricCard
          label="Workout completion"
          value={current.workoutCompletionRate}
          previous={previous.workoutCompletionRate}
          unit="%"
        />
        <MetricCard
          label="Pathway enrollments"
          value={current.pathwayEnrollments}
          previous={previous.pathwayEnrollments}
        />
        <MetricCard
          label="Notification open rate"
          value={current.notificationOpenRate}
          previous={previous.notificationOpenRate}
          unit="%"
          note="Awaits push delivery infrastructure"
        />
        <MetricCard
          label="System failures"
          value={current.systemFailures}
          previous={previous.systemFailures}
        />
        <MetricCard
          label="Safety holds"
          value={current.safetyHolds}
          previous={previous.safetyHolds}
          note="Aggregate count — see Safety for trends"
        />
      </section>

      <GlassSurface>
        <h2 className="mb-3 font-semibold text-ink">Onboarding funnel</h2>
        <FunnelView funnel={data.funnel} />
      </GlassSurface>

      <GlassSurface>
        <h2 className="mb-3 font-semibold text-ink">Engagement trends</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TrendChart title="Active users" points={data.activeUserTrend} />
          <TrendChart title="Daily plans" points={data.planTrend} />
          <TrendChart title="Workouts" points={data.workoutTrend} />
          <TrendChart title="Nutrition actions" points={data.nutritionTrend} />
          <TrendChart title="Reset activations" points={data.resetTrend} />
        </div>
      </GlassSurface>

      <GlassSurface>
        <h2 className="mb-3 font-semibold text-ink">Pathways</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <BarList title="Pathway selection" distribution={data.pathwayDistribution} />
          <BarList
            title="Pathway combinations"
            distribution={data.pathwayCombinations}
            unitLabel="users"
          />
        </div>
      </GlassSurface>
    </AdminShell>
  );
}
