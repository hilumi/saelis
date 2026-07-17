import { AdminShell } from "@/components/admin/admin-shell";
import { BarList } from "@/components/admin/bar-list";
import { DateRangeControls } from "@/components/admin/date-range-controls";
import { MetricCard } from "@/components/admin/metric-card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { loadAdminAnalyticsOverview } from "@/lib/analytics/admin-service";
import { requireAdminAccess } from "@/lib/auth/admin-access";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Notifications" };

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const access = await requireAdminAccess("analytics");
  const data = await loadAdminAnalyticsOverview(await searchParams).catch(() => null);

  return (
    <AdminShell
      title="Notifications"
      subtitle="Delivery, opens, dismissals, and suppressions — categories only."
      current="/admin/analytics/notifications"
      canViewOperations={access.can("operations")}
    >
      {!data ? (
        <GlassSurface>
          <p className="text-sm text-ink-soft">Analytics aren&apos;t available yet.</p>
        </GlassSurface>
      ) : (
        <>
          <DateRangeControls
            basePath="/admin/analytics/notifications"
            activeLabel={data.range.label}
          />
          <GlassSurface>
            <p className="text-sm text-ink-soft">
              Push delivery infrastructure does not exist yet (by design — see the Phase 5 audit).
              The events and metrics below are wired and will populate once the notification worker
              ships; until then, most values will read zero.
            </p>
          </GlassSurface>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Scheduled" value={data.current.notificationsScheduled} />
            <MetricCard label="Delivered" value={data.current.notificationsDelivered} />
            <MetricCard
              label="Delivery rate"
              value={data.current.notificationDeliveryRate}
              unit="%"
            />
            <MetricCard label="Open rate" value={data.current.notificationOpenRate} unit="%" />
            <MetricCard label="Suppressed" value={data.current.notificationsSuppressed} />
            <MetricCard
              label="Suppression rate"
              value={data.current.notificationSuppressionRate}
              unit="%"
            />
            <MetricCard label="Failed" value={data.current.notificationsFailed} />
            <MetricCard
              label="Failure rate"
              value={data.current.notificationFailureRate}
              unit="%"
            />
          </section>
          <GlassSurface>
            <div className="grid gap-4 md:grid-cols-2">
              <BarList title="By category" distribution={data.notificationCategoryDistribution} />
              <BarList
                title="Suppression reasons"
                distribution={data.suppressionReasonDistribution}
              />
            </div>
          </GlassSurface>
        </>
      )}
    </AdminShell>
  );
}
