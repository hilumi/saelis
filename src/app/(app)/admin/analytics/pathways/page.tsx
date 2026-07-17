import { AdminShell } from "@/components/admin/admin-shell";
import { BarList } from "@/components/admin/bar-list";
import { DateRangeControls } from "@/components/admin/date-range-controls";
import { MetricCard } from "@/components/admin/metric-card";
import { TrendChart } from "@/components/admin/trend-chart";
import { GlassSurface } from "@/components/ui/glass-surface";
import { loadAdminAnalyticsOverview } from "@/lib/analytics/admin-service";
import { requireAdminAccess } from "@/lib/auth/admin-access";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Pathways" };

export default async function AdminPathwaysPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const access = await requireAdminAccess("analytics");
  const data = await loadAdminAnalyticsOverview(await searchParams).catch(() => null);

  return (
    <AdminShell
      title="Pathways"
      subtitle="Which pathways people choose and how they combine them."
      current="/admin/analytics/pathways"
      canViewOperations={access.can("operations")}
    >
      {!data ? (
        <GlassSurface>
          <p className="text-sm text-ink-soft">Analytics aren&apos;t available yet.</p>
        </GlassSurface>
      ) : (
        <>
          <DateRangeControls basePath="/admin/analytics/pathways" activeLabel={data.range.label} />
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <MetricCard
              label="Enrollments"
              value={data.current.pathwayEnrollments}
              previous={data.previous.pathwayEnrollments}
            />
            <MetricCard
              label="Reset activations"
              value={data.current.resetActivations}
              previous={data.previous.resetActivations}
            />
            <MetricCard
              label="Workouts replaced"
              value={data.current.workoutsReplaced}
              previous={data.previous.workoutsReplaced}
            />
          </section>
          <GlassSurface>
            <div className="grid gap-4 md:grid-cols-2">
              <BarList title="Pathway selection" distribution={data.pathwayDistribution} />
              <BarList
                title="Pathway combinations"
                distribution={data.pathwayCombinations}
                unitLabel="users"
              />
            </div>
          </GlassSurface>
          <GlassSurface>
            <div className="grid gap-4 md:grid-cols-2">
              <BarList
                title="Workout types (completed / attempted)"
                distribution={data.workoutTypeDistribution}
              />
              <BarList
                title="Workout types most often replaced"
                distribution={data.workoutReplacedTypeDistribution}
              />
            </div>
          </GlassSurface>
          <GlassSurface>
            <TrendChart title="Reset usage" points={data.resetTrend} />
          </GlassSurface>
        </>
      )}
    </AdminShell>
  );
}
