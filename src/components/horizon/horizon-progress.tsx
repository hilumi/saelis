export interface HorizonProgressProps {
  completed: number;
  total: number;
}

/** Quiet progress — a fact, not a scoreboard. */
export function HorizonProgress({ completed, total }: HorizonProgressProps) {
  if (total === 0) return null;
  const percent = Math.round((completed / total) * 100);

  return (
    <div className="mb-4">
      <p className="mb-1 text-sm text-ink-soft">
        {completed} of {total} steps done — each one counts.
      </p>
      <div
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Horizon steps completed"
        className="h-2 w-full overflow-hidden rounded-full bg-cloud-lilac"
      >
        <div className="h-full rounded-full bg-horizon-gold" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
