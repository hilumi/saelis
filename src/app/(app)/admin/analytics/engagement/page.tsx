import { AdminShell } from "@/components/admin/admin-shell";
import { DateRangeControls } from "@/components/admin/date-range-controls";
import { MetricCard } from "@/components/admin/metric-card";
import { TrendChart } from "@/components/admin/trend-chart";
import { GlassSurface } from "@/components/ui/glass-surface";
import { loadAdminAnalyticsOverview } from "@/lib/analytics/admin-service";
import { requireAdminAccess } from "@/lib/auth/admin-access";

import type { Metadata } from "next";
import type { CohortValue } from "@/lib/analytics/metrics";

export const metadata: Metadata = { title: "Admin — Engagement" };

function retention(value: CohortValue): string {
  return value.kind === "value" ? `${value.value}%` : "Insufficient data";
}

export default async function AdminEngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const access = await requireAdminAccess("analytics");
  const data = await loadAdminAnalyticsOverview(await searchParams).catch(() => null);

  return (
    <AdminShell
      title="Engagement"
      subtitle="How actively people use their plans, workouts, and nutrition tools."
      current="/admin/analytics/engagement"
      canViewOperations={access.can("operations")}
    >
      {!data ? (
        <GlassSurface>
          <p className="text-sm text-ink-soft">Analytics aren&apos;t available yet.</p>
        </GlassSurface>
      ) : (
        <>
          <DateRangeControls
            basePath="/admin/analytics/engagement"
            activeLabel={data.range.label}
          />
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard
              label="Active users"
              value={data.current.activeUsers}
              previous={data.previous.activeUsers}
            />
            <MetricCard
              label="Plans generated"
              value={data.current.plansGenerated}
              previous={data.previous.plansGenerated}
            />
            <MetricCard
              label="Meals logged"
              value={data.current.mealsLogged}
              previous={data.previous.mealsLogged}
            />
            <MetricCard
              label="Hydration actions"
              value={data.current.hydrationActions}
              previous={data.previous.hydrationActions}
            />
            <MetricCard
              label="Protein actions"
              value={data.current.proteinActions}
              previous={data.previous.proteinActions}
            />
            <MetricCard
              label="Workouts completed"
              value={data.current.workoutsCompleted}
              previous={data.previous.workoutsCompleted}
            />
            <MetricCard
              label="Workout replacement rate"
              value={data.current.workoutReplacementRate}
              unit="%"
            />
            <MetricCard
              label="Milestones achieved"
              value={data.current.milestoneAchievements}
              previous={data.previous.milestoneAchievements}
            />
          </section>
          <GlassSurface>
            <h2 className="mb-3 font-semibold text-ink">Trends</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <TrendChart title="Active users" points={data.activeUserTrend} />
              <TrendChart title="Daily plans" points={data.planTrend} />
              <TrendChart title="Workouts" points={data.workoutTrend} />
              <TrendChart title="Nutrition actions" points={data.nutritionTrend} />
            </div>
          </GlassSurface>
          <GlassSurface>
            <h2 className="mb-2 font-semibold text-ink">Retention after onboarding</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <dt className="text-ink-soft">Day 1</dt>
              <dd className="tabular-nums text-ink">{retention(data.retention.day1)}</dd>
              <dt className="text-ink-soft">Day 7</dt>
              <dd className="tabular-nums text-ink">{retention(data.retention.day7)}</dd>
              <dt className="text-ink-soft">Day 14</dt>
              <dd className="tabular-nums text-ink">{retention(data.retention.day14)}</dd>
              <dt className="text-ink-soft">Day 30</dt>
              <dd className="tabular-nums text-ink">{retention(data.retention.day30)}</dd>
            </dl>
            <p className="mt-2 text-xs text-ink-muted">
              Share of onboarding completers with a qualifying activity event N+ days later, within
              the selected window. Cohort: {data.retention.cohortSize} users.
            </p>
          </GlassSurface>
        </>
      )}
    </AdminShell>
  );
}
