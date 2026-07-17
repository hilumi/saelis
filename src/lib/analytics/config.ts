/**
 * Saelis Her — analytics configuration (Phase 6). Centralized, deterministic
 * settings: cohort protection, size limits, retention proposal, feature
 * flags, and operational health thresholds. Every consumer reads from here —
 * no scattered magic numbers.
 */

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Minimum cohort size for any dimensional breakdown (pathways, combinations,
 * device categories, Restore vs non-Restore funnels, …). Groups smaller than
 * this render as "Insufficient data" and are never written to rollups.
 * Configurable via ANALYTICS_MIN_COHORT_SIZE; default 5.
 */
export function minCohortSize(): number {
  return readPositiveInt(process.env.ANALYTICS_MIN_COHORT_SIZE, 5);
}

/** Metadata boundary: serialized size cap (bytes) and property-count cap. */
export const ANALYTICS_MAX_METADATA_BYTES = 2048;
export const ANALYTICS_MAX_METADATA_KEYS = 12;

/** Per-user recording rate limit (events per minute) — abuse protection. */
export const ANALYTICS_RATE_LIMIT = { limit: 60, windowMs: 60_000 } as const;

/**
 * Retention PROPOSAL (documented, not automatically enforced — the repository
 * has no retention mechanism and Phase 6 does not delete production data):
 * raw analytics_events 13 months; de-identified rollups may persist longer.
 * See docs/admin-analytics.md for the safe retention-job design.
 */
export const ANALYTICS_RAW_RETENTION_MONTHS = 13;

/**
 * Feature flags — server-side environment switches. They gate behavior but
 * NEVER replace authorization: every admin surface re-checks roles
 * server-side regardless of flag state. Defaults: enabled, except exports.
 */
export function analyticsFlags(): {
  adminAnalyticsEnabled: boolean;
  eventIngestionEnabled: boolean;
  rollupsEnabled: boolean;
  exportsEnabled: boolean;
} {
  const off = (value: string | undefined) => value === "false" || value === "0";
  return {
    adminAnalyticsEnabled: !off(process.env.ADMIN_ANALYTICS_ENABLED),
    eventIngestionEnabled: !off(process.env.ANALYTICS_EVENT_INGESTION_ENABLED),
    rollupsEnabled: !off(process.env.ANALYTICS_ROLLUPS_ENABLED),
    exportsEnabled: process.env.ANALYTICS_EXPORTS_ENABLED === "true",
  };
}

/** Operational health thresholds — deterministic and centralized. */
export const OPERATIONS_HEALTH_RULES = {
  /** A "running" job older than this is considered stale. */
  staleRunningMinutes: 30,
  /** A job whose last completed run is older than this is "unknown". */
  unknownAfterHours: 48,
  /** Failure-rate boundaries over the evaluation window. */
  degradedFailureRate: 0.05,
  failingFailureRate: 0.25,
} as const;

export type HealthStatus = "healthy" | "degraded" | "failing" | "unknown";

/** Bucket a duration in minutes into coarse, non-precise labels. */
export function durationBucket(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes) || minutes < 0) return "unknown";
  if (minutes <= 10) return "0-10";
  if (minutes <= 20) return "11-20";
  if (minutes <= 30) return "21-30";
  if (minutes <= 45) return "31-45";
  if (minutes <= 60) return "46-60";
  return "60+";
}

/** Day bucket (UTC) for coarse timestamps in safety analytics. */
export function dayBucket(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}
