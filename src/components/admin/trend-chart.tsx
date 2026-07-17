import type { TrendPoint } from "@/lib/analytics/metrics";

/**
 * Small SVG bar trend with a textual summary — screen readers get the
 * summary sentence, sighted users get bars PLUS numbers (never color-only).
 * Empty periods render an explicit empty state.
 */
export function TrendChart({ title, points }: { title: string; points: TrendPoint[] }) {
  const latest = points[points.length - 1];
  if (points.length === 0 || latest === undefined) {
    return (
      <div>
        <h3 className="mb-1 text-sm font-medium text-ink">{title}</h3>
        <p className="text-sm text-ink-muted">No activity recorded in this period.</p>
      </div>
    );
  }

  const max = Math.max(1, ...points.map((point) => point.count));
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const summary = `${title}: ${total} total across ${points.length} days; peak ${max}/day; latest ${latest.count} on ${latest.date}.`;
  const width = Math.max(120, points.length * 8);

  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-ink">{title}</h3>
      <svg
        viewBox={`0 0 ${width} 44`}
        role="img"
        aria-label={summary}
        className="h-11 w-full max-w-full"
        preserveAspectRatio="none"
      >
        {points.map((point, index) => {
          const height = Math.max(2, (point.count / max) * 40);
          return (
            <rect
              key={point.date}
              x={index * 8 + 1}
              y={44 - height}
              width={6}
              height={height}
              rx={1.5}
              className="fill-white/40"
            />
          );
        })}
      </svg>
      <p className="mt-1 text-xs text-ink-muted">{summary}</p>
    </div>
  );
}
