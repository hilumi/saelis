/**
 * Aggregate metric card with an honest comparison indicator. No false
 * precision: rates carry one decimal at most, counts are integers, and
 * missing denominators render as "—" with a plain explanation.
 */
export function formatMetric(value: number | null, unit?: "%" | "count"): string {
  if (value == null) return "—";
  if (unit === "%") return `${value}%`;
  return new Intl.NumberFormat("en-US").format(value);
}

export function MetricCard({
  label,
  value,
  previous,
  unit = "count",
  note,
}: {
  label: string;
  value: number | null;
  previous?: number | null;
  unit?: "%" | "count";
  note?: string;
}) {
  const delta =
    value != null && previous != null && previous !== 0
      ? Math.round(((value - previous) / Math.abs(previous)) * 1000) / 10
      : null;
  const direction = delta == null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
        {formatMetric(value, unit)}
      </p>
      {direction != null ? (
        <p className="mt-1 text-xs text-ink-soft">
          {direction === "up" ? "▲" : direction === "down" ? "▼" : "◆"} {Math.abs(delta ?? 0)}% vs
          previous period
        </p>
      ) : (
        <p className="mt-1 text-xs text-ink-muted">No previous-period comparison</p>
      )}
      {note ? <p className="mt-1 text-xs text-ink-muted">{note}</p> : null}
    </div>
  );
}
