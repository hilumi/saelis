import Link from "next/link";

/**
 * Date controls: preset links (7/30/90 days) plus a custom from/to GET form.
 * Server-rendered; state lives in the URL, so pages stay Server Components.
 */
export function DateRangeControls({
  basePath,
  activeLabel,
}: {
  basePath: string;
  activeLabel: string;
}) {
  const presets: Array<{ key: string; label: string }> = [
    { key: "7d", label: "Last 7 days" },
    { key: "30d", label: "Last 30 days" },
    { key: "90d", label: "Last 90 days" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="flex gap-2" role="group" aria-label="Preset date ranges">
        {presets.map((preset) => (
          <Link
            key={preset.key}
            href={`${basePath}?range=${preset.key}`}
            aria-current={activeLabel === preset.label ? "true" : undefined}
            className={
              activeLabel === preset.label
                ? "rounded-full bg-white/15 px-3 py-1 font-medium text-ink"
                : "rounded-full px-3 py-1 text-ink-soft hover:text-ink"
            }
          >
            {preset.label}
          </Link>
        ))}
      </div>
      <form method="get" action={basePath} className="flex items-center gap-2">
        <label className="text-ink-muted" htmlFor="admin-range-from">
          From
        </label>
        <input
          id="admin-range-from"
          type="date"
          name="from"
          className="rounded border border-white/15 bg-transparent px-2 py-1 text-ink"
        />
        <label className="text-ink-muted" htmlFor="admin-range-to">
          To
        </label>
        <input
          id="admin-range-to"
          type="date"
          name="to"
          className="rounded border border-white/15 bg-transparent px-2 py-1 text-ink"
        />
        <button
          type="submit"
          className="rounded-full border border-white/15 px-3 py-1 text-ink-soft hover:text-ink"
        >
          Apply
        </button>
      </form>
      <span className="text-xs text-ink-muted">Showing: {activeLabel}</span>
    </div>
  );
}
