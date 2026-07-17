import { ScreenHeader } from "@/components/layout/screen-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { GlassSurface } from "@/components/ui/glass-surface";

import type { ReactNode } from "react";

/**
 * Shared admin page chrome: header, section navigation, and the privacy
 * commitment. Rendered only AFTER requireAdminAccess has passed in the page.
 */
export function AdminShell({
  title,
  subtitle,
  current,
  canViewOperations,
  children,
}: {
  title: string;
  subtitle: string;
  current: string;
  canViewOperations: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <ScreenHeader title={title} subtitle={subtitle} />
      <AdminNav current={current} canViewOperations={canViewOperations} />
      {children}
      <GlassSurface>
        <p className="text-xs text-ink-muted">
          Privacy: every number on these pages is an aggregate over coarse product events. No
          personal wellness records, symptoms, journal entries, meal descriptions, companion
          messages, or per-person drill-downs exist on this surface — by design, by schema, and by
          database policy. Groups smaller than the minimum cohort size are never shown.
        </p>
      </GlassSurface>
    </div>
  );
}
