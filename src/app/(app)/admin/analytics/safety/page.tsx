import { AdminShell } from "@/components/admin/admin-shell";
import { BarList } from "@/components/admin/bar-list";
import { DateRangeControls } from "@/components/admin/date-range-controls";
import { MetricCard } from "@/components/admin/metric-card";
import { TrendChart } from "@/components/admin/trend-chart";
import { GlassSurface } from "@/components/ui/glass-surface";
import { loadAdminAnalyticsOverview } from "@/lib/analytics/admin-service";
import { requireAdminAccess } from "@/lib/auth/admin-access";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Safety (aggregated)" };

/**
 * Aggregated safety observability. Deliberately plain presentation: safety
 * tiers are operational signals, never celebrated, never drillable, and
 * never accompanied by symptom detail — only tiers, broad categories, and
 * day-bucketed counts exist in the data.
 */
export default async function AdminSafetyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const access = await requireAdminAccess("analytics");
  const data = await loadAdminAnalyticsOverview(await searchParams).catch(() => null);

  return (
    <AdminShell
      title="Safety (aggregated)"
      subtitle="Tier frequencies and trends. No symptoms, no individuals, no drill-down."
      current="/admin/analytics/safety"
      canViewOperations={access.can("operations")}
    >
      {!data ? (
        <GlassSurface>
          <p className="text-sm text-ink-soft">Analytics aren&apos;t available yet.</p>
        </GlassSurface>
      ) : (
        <>
          <DateRangeControls basePath="/admin/analytics/safety" activeLabel={data.range.label} />
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <MetricCard
              label="Urgent support"
              value={data.safety.urgentSupportCount}
              previous={data.previous.urgentSupportCount}
            />
            <MetricCard
              label="Professional holds"
              value={data.current.safetyHolds}
              previous={data.previous.safetyHolds}
            />
            <MetricCard
              label="Recovery-only days"
              value={data.safety.recoveryOnlyCount}
              previous={data.previous.recoveryOnlyCount}
            />
          </section>
          <GlassSurface>
            <h2 className="mb-2 font-semibold text-ink">Tier distribution</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {data.safety.tierDistribution.map((tier) => (
                <li key={tier.tier} className="flex justify-between text-ink-soft">
                  <span>{tier.tier.replace(/_/g, " ")}</span>
                  <span className="tabular-nums text-ink">{tier.count}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-muted">
              One assessment per user per day at most. Counts reflect users who allow product
              analytics; the deterministic safety engine itself always runs for everyone.
            </p>
          </GlassSurface>
          <GlassSurface>
            <h2 className="mb-3 font-semibold text-ink">Holds over time</h2>
            <TrendChart title="Holds and urgent-support days" points={data.safety.holdTrend} />
          </GlassSurface>
          <GlassSurface>
            <BarList
              title="Holds by pathway (broad category)"
              distribution={data.safety.holdsByPathway}
            />
          </GlassSurface>
        </>
      )}
    </AdminShell>
  );
}
