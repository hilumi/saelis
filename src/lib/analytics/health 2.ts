/**
 * Saelis Her — deterministic operational health (Phase 6). Pure functions
 * over job-run rows; thresholds live centrally in ./config.ts. This view is a
 * convenience signal, NOT a substitute for full application monitoring.
 */
import { OPERATIONS_HEALTH_RULES, type HealthStatus } from "@/lib/analytics/config";

export interface JobRunLite {
  job_key: string;
  started_at: string;
  completed_at: string | null;
  status: "running" | "completed" | "partial" | "failed";
  failure_count: number | null;
  error_category: string | null;
}

export interface JobHealth {
  jobKey: string;
  status: HealthStatus;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  staleRunning: boolean;
  recentFailureRate: number;
  repeatedErrorCategory: string | null;
}

/** Health for one job key from its recent runs (newest first). */
export function computeJobHealth(jobKey: string, runs: JobRunLite[], now = new Date()): JobHealth {
  const own = runs.filter((run) => run.job_key === jobKey);
  if (own.length === 0) {
    return {
      jobKey,
      status: "unknown",
      lastRunAt: null,
      lastSuccessAt: null,
      staleRunning: false,
      recentFailureRate: 0,
      repeatedErrorCategory: null,
    };
  }

  const nowMs = now.getTime();
  const staleMs = OPERATIONS_HEALTH_RULES.staleRunningMinutes * 60_000;
  const staleRunning = own.some(
    (run) => run.status === "running" && nowMs - Date.parse(run.started_at) > staleMs,
  );

  const lastRunAt = own[0]?.started_at ?? null;
  const lastSuccess = own.find((run) => run.status === "completed");
  const lastSuccessAt = lastSuccess?.completed_at ?? null;

  const window = own.slice(0, 20);
  const failures = window.filter((run) => run.status === "failed").length;
  const recentFailureRate = window.length > 0 ? failures / window.length : 0;

  const categories = new Map<string, number>();
  for (const run of window) {
    if (run.error_category) {
      categories.set(run.error_category, (categories.get(run.error_category) ?? 0) + 1);
    }
  }
  const repeated = [...categories.entries()].find(([, count]) => count >= 3);

  let status: HealthStatus = "healthy";
  const unknownMs = OPERATIONS_HEALTH_RULES.unknownAfterHours * 60 * 60_000;
  if (lastRunAt && nowMs - Date.parse(lastRunAt) > unknownMs) status = "unknown";
  else if (staleRunning || recentFailureRate >= OPERATIONS_HEALTH_RULES.failingFailureRate) {
    status = "failing";
  } else if (recentFailureRate >= OPERATIONS_HEALTH_RULES.degradedFailureRate) {
    status = "degraded";
  }

  return {
    jobKey,
    status,
    lastRunAt,
    lastSuccessAt,
    staleRunning,
    recentFailureRate: Math.round(recentFailureRate * 1000) / 10,
    repeatedErrorCategory: repeated?.[0] ?? null,
  };
}

/** Duration in whole seconds, or null while running. */
export function jobDurationSeconds(run: JobRunLite): number | null {
  if (!run.completed_at) return null;
  const ms = Date.parse(run.completed_at) - Date.parse(run.started_at);
  return ms >= 0 ? Math.round(ms / 1000) : null;
}
