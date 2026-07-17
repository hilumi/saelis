import { AdminShell } from "@/components/admin/admin-shell";
import { GlassSurface } from "@/components/ui/glass-surface";
import { computeJobHealth, jobDurationSeconds } from "@/lib/analytics/health";
import { ROLLUP_JOB_KEY } from "@/lib/analytics/rollup";
import { requireAdminAccess } from "@/lib/auth/admin-access";
import { countEventsPerDay } from "@/lib/db/queries/analytics/events";
import { listRecentJobRuns } from "@/lib/db/queries/analytics/job-runs";
import { recordStewardshipEvent } from "@/lib/db/queries/stewardship";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";
import type { Tables } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Admin — Operations" };

/**
 * Operational health: job runs, failure counts, ingestion volume. A
 * convenience signal for product operations — NOT a replacement for full
 * application monitoring or logs. Founder/admin only.
 */
const KNOWN_JOB_KEYS = [ROLLUP_JOB_KEY, "notification_delivery", "plan_generation_sweep"];

const HEALTH_LABELS: Record<string, string> = {
  healthy: "● Healthy",
  degraded: "◐ Degraded",
  failing: "▲ Failing",
  unknown: "○ Unknown",
};

export default async function AdminOperationsPage() {
  const access = await requireAdminAccess("operations");

  const supabase = await createClient();
  await recordStewardshipEvent(supabase, access.user.id, { event_type: "admin_operations_viewed" });

  let runs: Tables<"analytics_job_runs">[] = [];
  let ingestion: Array<{ date: string; count: number }> = [];
  let available = true;
  try {
    const admin = createAdminClient();
    const now = new Date();
    [runs, ingestion] = await Promise.all([
      listRecentJobRuns(admin, 50),
      countEventsPerDay(admin, {
        fromISO: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        toISO: now.toISOString(),
      }),
    ]);
  } catch {
    available = false;
  }

  const failedRuns = runs.filter((run) => run.status === "failed").slice(0, 10);

  return (
    <AdminShell
      title="Operations"
      subtitle="Job health and event ingestion. Not a substitute for full monitoring."
      current="/admin/operations"
      canViewOperations={true}
    >
      {!available ? (
        <GlassSurface>
          <p className="text-sm text-ink-soft">
            Operational data isn&apos;t available. This usually means migration 00009 hasn&apos;t
            been applied or the service-role key isn&apos;t configured.
          </p>
        </GlassSurface>
      ) : (
        <>
          <GlassSurface>
            <h2 className="mb-2 font-semibold text-ink">Job health</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {KNOWN_JOB_KEYS.map((jobKey) => {
                const health = computeJobHealth(jobKey, runs);
                return (
                  <li key={jobKey} className="flex flex-wrap justify-between gap-2 text-ink-soft">
                    <span>{jobKey.replace(/_/g, " ")}</span>
                    <span className="text-ink">
                      {HEALTH_LABELS[health.status]}
                      {health.staleRunning ? " · stale run detected" : ""}
                      {health.repeatedErrorCategory
                        ? ` · repeated: ${health.repeatedErrorCategory}`
                        : ""}
                      {health.lastSuccessAt
                        ? ` · last success ${health.lastSuccessAt.slice(0, 16).replace("T", " ")}`
                        : " · no successful run yet"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-ink-muted">
              Statuses use central deterministic thresholds. Jobs that have never run report
              &quot;Unknown&quot; — the notification worker and plan sweep do not exist yet.
            </p>
          </GlassSurface>

          <GlassSurface>
            <h2 className="mb-2 font-semibold text-ink">Recent job runs</h2>
            {runs.length === 0 ? (
              <p className="text-sm text-ink-muted">No job runs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-ink-muted">
                      <th className="py-1 pr-3 font-normal">Job</th>
                      <th className="py-1 pr-3 font-normal">Status</th>
                      <th className="py-1 pr-3 font-normal">Started</th>
                      <th className="py-1 pr-3 font-normal">Duration</th>
                      <th className="py-1 pr-3 font-normal">Processed</th>
                      <th className="py-1 pr-3 font-normal">Failures</th>
                      <th className="py-1 font-normal">Error category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.slice(0, 15).map((run) => (
                      <tr key={run.id} className="text-ink-soft">
                        <td className="py-1 pr-3">{run.job_key}</td>
                        <td className="py-1 pr-3 text-ink">{run.status}</td>
                        <td className="py-1 pr-3 tabular-nums">
                          {run.started_at.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="py-1 pr-3 tabular-nums">
                          {jobDurationSeconds(run) != null ? `${jobDurationSeconds(run)}s` : "—"}
                        </td>
                        <td className="py-1 pr-3 tabular-nums">{run.processed_count ?? "—"}</td>
                        <td className="py-1 pr-3 tabular-nums">{run.failure_count ?? "—"}</td>
                        <td className="py-1">{run.error_category ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassSurface>

          {failedRuns.length > 0 ? (
            <GlassSurface>
              <h2 className="mb-2 font-semibold text-ink">Recent failures</h2>
              <ul className="flex flex-col gap-1 text-sm text-ink-soft">
                {failedRuns.map((run) => (
                  <li key={run.id}>
                    {run.job_key} · {run.started_at.slice(0, 16).replace("T", " ")} ·{" "}
                    {run.error_category ?? "uncategorized"}
                  </li>
                ))}
              </ul>
            </GlassSurface>
          ) : null}

          <GlassSurface>
            <h2 className="mb-2 font-semibold text-ink">Event ingestion (14 days)</h2>
            {ingestion.length === 0 ? (
              <p className="text-sm text-ink-muted">No events ingested yet.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-ink-soft">
                {ingestion.map((day) => (
                  <li key={day.date} className="flex justify-between">
                    <span>{day.date}</span>
                    <span className="tabular-nums text-ink">{day.count} events</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-ink-muted">
              Invalid or rejected events never reach the table; rejection reasons appear
              content-free in server logs.
            </p>
          </GlassSurface>
        </>
      )}
    </AdminShell>
  );
}
