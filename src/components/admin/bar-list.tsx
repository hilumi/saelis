import type { Distribution } from "@/lib/analytics/metrics";

/**
 * Accessible horizontal distribution list: every bar carries its numeric
 * value as text (never color-only), suppressed small cohorts are summarized
 * as "Insufficient data", and empty sets say so plainly.
 */
export function BarList({
  title,
  distribution,
  unitLabel = "events",
}: {
  title: string;
  distribution: Distribution;
  unitLabel?: string;
}) {
  const max = Math.max(1, ...distribution.entries.map((entry) => entry.count));
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-ink">{title}</h3>
      {distribution.entries.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {distribution.suppressedGroups > 0
            ? "Insufficient data — groups below the minimum cohort size are not shown."
            : "No data in this period."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {distribution.entries.map((entry) => (
            <li key={entry.value} className="flex items-center gap-2 text-sm">
              <span className="w-40 shrink-0 truncate text-ink-soft" title={entry.value}>
                {entry.value.replace(/_/g, " ")}
              </span>
              <span
                className="h-2 rounded-full bg-white/25"
                style={{ width: `${Math.max(4, (entry.count / max) * 100)}%` }}
                aria-hidden="true"
              />
              <span className="shrink-0 tabular-nums text-ink">
                {entry.count} {unitLabel} · {entry.users} users
              </span>
            </li>
          ))}
        </ul>
      )}
      {distribution.entries.length > 0 && distribution.suppressedGroups > 0 ? (
        <p className="mt-2 text-xs text-ink-muted">
          {distribution.suppressedGroups} smaller group
          {distribution.suppressedGroups === 1 ? "" : "s"} hidden (below minimum cohort size).
        </p>
      ) : null}
    </div>
  );
}
