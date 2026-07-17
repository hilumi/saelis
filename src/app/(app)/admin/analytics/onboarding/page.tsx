import { AdminShell } from "@/components/admin/admin-shell";
import { DateRangeControls } from "@/components/admin/date-range-controls";
import { FunnelView } from "@/components/admin/funnel";
import { MetricCard } from "@/components/admin/metric-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { loadAdminAnalyticsOverview } from "@/lib/analytics/admin-service";
import { requireAdminAccess } from "@/lib/auth/admin-access";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Onboarding" };

export default async function AdminOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const access = await requireAdminAccess("analytics");
  const data = await loadAdminAnalyticsOverview(await searchParams).catch(() => null);

  return (
    <AdminShell
      title="Onboarding"
      subtitle="Where people begin, pause, and finish setting up Saelis Her."
      current="/admin/analytics/onboarding"
      canViewOperations={access.can("operations")}
    >
      {!data ? (
        <GlassSurface>
          <p className="text-sm text-ink-soft">Analytics aren&apos;t available yet.</p>
        </GlassSurface>
      ) : (
        <>
          <DateRangeControls
            basePath="/admin/analytics/onboarding"
            activeLabel={data.range.label}
          />
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard
              label="Started"
              value={data.funnel.started}
              previous={data.previous.onboardingStarted}
            />
            <MetricCard
              label="Completed"
              value={data.funnel.completed}
              previous={data.previous.onboardingCompleted}
            />
            <MetricCard label="Completion rate" value={data.funnel.completionRate} unit="%" />
            <MetricCard label="Abandonment rate" value={data.funnel.abandonmentRate} unit="%" />
          </section>
          <GlassSurface>
            <h2 className="mb-3 font-semibold text-ink">Step-by-step funnel</h2>
            <FunnelView funnel={data.funnel} />
            <p className="mt-3 text-xs text-ink-muted">
              Restore-specific funnels appear only when the Restore cohort meets the minimum size (
              {data.minCohort} users); step counts include every user who completed the step at
              least once in the period.
            </p>
          </GlassSurface>
        </>
      )}
    </AdminShell>
  );
}
