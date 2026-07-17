/**
 * Saelis Her — progress analytics (pure).
 *
 * Honest math: rolling averages instead of single-weigh-in reactions,
 * explicit "not enough data yet" states instead of misleading charts,
 * non-scale progress first, weight views only when tracking is enabled, and
 * no claims that symptom improvement proves medical recovery.
 */

export interface DatedValue {
  date: string; // ISO
  value: number;
}

export interface TrendSummary {
  status: "ok" | "insufficient_data" | "disabled";
  latest: number | null;
  rollingAverage: number | null;
  previousAverage: number | null;
  /** Negative = decreasing. Rounded to one decimal. */
  change: number | null;
  points: DatedValue[];
}

export const PROGRESS_RULES = {
  /** Minimum values before a rolling average is shown. */
  minimumValuesForAverage: 4,
  rollingWindow: 7,
} as const;

export function rollingAverage(values: readonly number[], window: number): number | null {
  if (values.length === 0) return null;
  const slice = values.slice(-window);
  return Math.round((slice.reduce((sum, v) => sum + v, 0) / slice.length) * 10) / 10;
}

/**
 * Summarize a metric series. `enabled=false` (e.g. weight tracking off)
 * returns a disabled summary with no numbers at all.
 */
export function summarizeTrend(points: readonly DatedValue[], enabled = true): TrendSummary {
  if (!enabled) {
    return {
      status: "disabled",
      latest: null,
      rollingAverage: null,
      previousAverage: null,
      change: null,
      points: [],
    };
  }
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((p) => p.value);
  if (values.length < PROGRESS_RULES.minimumValuesForAverage) {
    return {
      status: "insufficient_data",
      latest: values.at(-1) ?? null,
      rollingAverage: null,
      previousAverage: null,
      change: null,
      points: sorted,
    };
  }
  const current = rollingAverage(values, PROGRESS_RULES.rollingWindow);
  const previousWindow = values.slice(0, -Math.min(values.length, PROGRESS_RULES.rollingWindow));
  const previous =
    previousWindow.length >= PROGRESS_RULES.minimumValuesForAverage
      ? rollingAverage(previousWindow, PROGRESS_RULES.rollingWindow)
      : null;
  return {
    status: "ok",
    latest: values.at(-1) ?? null,
    rollingAverage: current,
    previousAverage: previous,
    change: current != null && previous != null ? Math.round((current - previous) * 10) / 10 : null,
    points: sorted,
  };
}

/** Days (of the last `window`) on which a condition was met. */
export function consistencyCount(
  dates: readonly string[],
  window = 7,
  today = new Date().toISOString().slice(0, 10),
): number {
  const cutoff = new Date(`${today}T00:00:00Z`).getTime() - window * 24 * 60 * 60 * 1000;
  return new Set(
    dates.filter((date) => {
      const time = new Date(`${date}T00:00:00Z`).getTime();
      return time > cutoff && time <= new Date(`${today}T00:00:00Z`).getTime();
    }),
  ).size;
}

/** Weight progress toward a target using rolling averages, never single points. */
export function weightProgress(
  points: readonly DatedValue[],
  enabled: boolean,
): { status: TrendSummary["status"]; absoluteChangeFromStart: number | null } {
  const trend = summarizeTrend(points, enabled);
  if (trend.status !== "ok") return { status: trend.status, absoluteChangeFromStart: null };
  const firstWindow = rollingAverage(
    trend.points.slice(0, PROGRESS_RULES.minimumValuesForAverage).map((p) => p.value),
    PROGRESS_RULES.rollingWindow,
  );
  return {
    status: "ok",
    absoluteChangeFromStart:
      firstWindow != null && trend.rollingAverage != null
        ? Math.round(Math.abs(trend.rollingAverage - firstWindow) * 10) / 10
        : null,
  };
}
