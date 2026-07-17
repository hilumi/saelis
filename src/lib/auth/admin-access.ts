import "server-only";

import { notFound } from "next/navigation";

import { analyticsFlags } from "@/lib/analytics/config";
import { getOptionalUser } from "@/lib/auth/require-user";
import { listAppRoles, type AppRole } from "@/lib/db/queries/roles";
import { recordStewardshipEvent } from "@/lib/db/queries/stewardship";
import { createClient } from "@/lib/supabase/server";

import type { User } from "@supabase/supabase-js";

/**
 * Saelis — server-only administrative authorization (Phase 6).
 *
 * DENY BY DEFAULT. Every admin page, server action, API route, and data
 * query calls this helper independently; navigation visibility, client
 * checks, and feature flags are never a substitute. Roles live in the
 * RLS-protected app_roles table, are readable only by their owner, and can
 * only be assigned manually through a privileged database action — never by
 * the application (see docs/admin-analytics.md for the assignment process).
 *
 * Capability model:
 *  - analytics:  aggregated product analytics (founder, admin, product_analytics)
 *  - operations: system/job health and diagnostics (founder, admin)
 *  - export:     aggregated CSV export (founder, admin) — also flag-gated
 *  - support_admin holds NO analytics or operations access in this phase.
 */

export type AdminCapability = "analytics" | "operations" | "export";

const CAPABILITY_ROLES: Readonly<Record<AdminCapability, readonly AppRole[]>> = {
  analytics: ["founder", "admin", "product_analytics"],
  operations: ["founder", "admin"],
  export: ["founder", "admin"],
};

export interface AdminAccess {
  user: User;
  roles: AppRole[];
  can: (capability: AdminCapability) => boolean;
}

/** Load the current user's admin access, or null. Never throws. */
export async function getAdminAccess(): Promise<AdminAccess | null> {
  const user = await getOptionalUser();
  if (!user) return null;
  const supabase = await createClient();
  const roles = await listAppRoles(supabase, user.id);
  const can = (capability: AdminCapability) =>
    CAPABILITY_ROLES[capability].some((role) => roles.includes(role));
  if (!can("analytics") && !can("operations")) return null;
  return { user, roles, can };
}

/**
 * Require a capability or respond 404 (the repository's convention for
 * unauthorized privileged surfaces — see /founder). Failed attempts by
 * authenticated users are audited content-free through stewardship events.
 */
export async function requireAdminAccess(capability: AdminCapability): Promise<AdminAccess> {
  if (capability === "analytics" && !analyticsFlags().adminAnalyticsEnabled) notFound();

  const user = await getOptionalUser();
  if (!user) notFound();

  const supabase = await createClient();
  const roles = await listAppRoles(supabase, user.id);
  const can = (cap: AdminCapability) => CAPABILITY_ROLES[cap].some((role) => roles.includes(role));

  if (!can(capability)) {
    // Content-free audit of the denied attempt (own-row insert; best effort).
    await recordStewardshipEvent(supabase, user.id, { event_type: "admin_access_denied" });
    notFound();
  }

  return { user, roles, can };
}
