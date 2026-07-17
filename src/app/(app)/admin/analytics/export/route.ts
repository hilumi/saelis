import { NextResponse, type NextRequest } from "next/server";

import { loadAdminAnalyticsOverview } from "@/lib/analytics/admin-service";
import { analyticsFlags } from "@/lib/analytics/config";
import { buildAggregatedCsv, exportFilename, type AggregatedExportRow } from "@/lib/analytics/csv";
import { requireAdminAccess } from "@/lib/auth/admin-access";
import { recordStewardshipEvent } from "@/lib/db/queries/stewardship";
import { createClient } from "@/lib/supabase/server";

/**
 * Aggregated CSV export (Phase 6). GET /admin/analytics/export?range=30d
 *
 * Admin/founder only, and additionally gated by ANALYTICS_EXPORTS_ENABLED
 * (default OFF). The export contains pre-aggregated metrics only: no user
 * ids, no emails, no metadata, no wellness records — the row type cannot
 * carry them. Every export is audited content-free.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!analyticsFlags().exportsEnabled) {
    return NextResponse.json({ error: "exports disabled" }, { status: 404 });
  }

  const access = await requireAdminAccess("export");

  const params = request.nextUrl.searchParams;
  const data = await loadAdminAnalyticsOverview({
    range: params.get("range") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  }).catch(() => null);
  if (!data) return NextResponse.json({ error: "analytics unavailable" }, { status: 503 });

  const fromDate = data.range.fromISO.slice(0, 10);
  const toDate = data.range.toISO.slice(0, 10);
  const period = `${fromDate}..${toDate}`;

  const rows: AggregatedExportRow[] = [];
  const counters: Array<[string, number | null]> = [
    ["active_users", data.current.activeUsers],
    ["onboarding_started", data.current.onboardingStarted],
    ["onboarding_completed", data.current.onboardingCompleted],
    ["onboarding_completion_rate_pct", data.current.onboardingCompletionRate],
    ["daily_plans_generated", data.current.plansGenerated],
    ["workouts_completed", data.current.workoutsCompleted],
    ["workout_completion_rate_pct", data.current.workoutCompletionRate],
    ["workout_replacement_rate_pct", data.current.workoutReplacementRate],
    ["meal_plans_generated", data.current.mealPlansGenerated],
    ["meals_logged", data.current.mealsLogged],
    ["hydration_actions", data.current.hydrationActions],
    ["protein_actions", data.current.proteinActions],
    ["reset_activations", data.current.resetActivations],
    ["milestone_achievements", data.current.milestoneAchievements],
    ["pathway_enrollments", data.current.pathwayEnrollments],
    ["notification_open_rate_pct", data.current.notificationOpenRate],
    ["system_failures", data.current.systemFailures],
    ["safety_hold_count", data.current.safetyHolds],
    ["urgent_support_count", data.current.urgentSupportCount],
  ];
  for (const [metric, value] of counters) {
    rows.push({ metric, dimension: "all", date: period, value: value ?? "" });
  }
  // Cohort-protected distributions only (small groups already suppressed).
  for (const entry of data.pathwayDistribution.entries) {
    rows.push({
      metric: "pathway_enrollments",
      dimension: entry.value,
      date: period,
      value: entry.count,
    });
  }
  for (const point of data.activeUserTrend) {
    rows.push({
      metric: "daily_active_users",
      dimension: "all",
      date: point.date,
      value: point.users,
    });
  }

  // Content-free audit of the export action.
  const supabase = await createClient();
  await recordStewardshipEvent(supabase, access.user.id, { event_type: "admin_export_generated" });

  const csv = buildAggregatedCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(fromDate, toDate)}"`,
      "Cache-Control": "no-store",
    },
  });
}
