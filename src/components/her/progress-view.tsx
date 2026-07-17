import type { TrendSummary } from "@/lib/wellness/progress";

export interface ProgressViewProps {
  weight: TrendSummary & { unit: string };
  workoutDaysLast7: number;
  walkingDaysLast7: number;
  proteinDaysLast7: number;
  hydrationDaysLast7: number;
  energyTrend: TrendSummary;
  sleepTrend: TrendSummary;
  milestones: { key: string; message: string | null; achievedAt: string }[];
  restoreActive: boolean;
  restoreCompletedGentleSessions: number;
}

function TrendLine({ title, trend, unit }: { title: string; trend: TrendSummary; unit: string }) {
  if (trend.status === "disabled") return null;
  return (
    <div className="glass-surface flex flex-col gap-1 p-4">
      <h3 className="font-medium text-ink">{title}</h3>
      {trend.status === "insufficient_data" ? (
        <p className="text-sm text-ink-soft">
          Not enough data yet — a trend needs a few entries before it means anything.
        </p>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            Rolling average: {trend.rollingAverage} {unit}
            {trend.change != null
              ? ` · ${trend.change > 0 ? "+" : ""}${trend.change} ${unit} vs the earlier average`
              : ""}
          </p>
          <p className="text-xs text-ink-muted">
            Averages over single days — one reading never tells the story.
          </p>
        </>
      )}
    </div>
  );
}

function ConsistencyRow({ label, days }: { label: string; days: number }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-ink">{label}</span>
      <span aria-label={`${days} of 7 days`} className="text-sm text-ink-soft">
        {"●".repeat(days)}
        {"○".repeat(Math.max(0, 7 - days))} {days}/7
      </span>
    </li>
  );
}

/** Non-scale progress first; honest, quiet, accessible. Server component. */
export function ProgressView(props: ProgressViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Consistency" className="glass-surface flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold text-ink">This week</h2>
        <ul className="flex flex-col gap-2">
          <ConsistencyRow label="Movement days" days={props.workoutDaysLast7} />
          <ConsistencyRow label="Walking days" days={props.walkingDaysLast7} />
          <ConsistencyRow label="Protein logged" days={props.proteinDaysLast7} />
          <ConsistencyRow label="Hydration logged" days={props.hydrationDaysLast7} />
        </ul>
        <p className="text-xs text-ink-muted">Consistency is the real progress metric here.</p>
      </section>

      {props.restoreActive ? (
        <section
          aria-label="Restore activity"
          className="flex flex-col gap-1 rounded-3xl bg-cloud-pink/30 p-5"
        >
          <h2 className="text-lg font-semibold text-ink">Restore</h2>
          <p className="text-ink-soft">
            {props.restoreCompletedGentleSessions} gentle sessions completed and tolerated.
          </p>
          <p className="text-xs text-ink-muted">
            Growing activity tolerance is encouraging — it is not, by itself, medical proof of
            recovery, and your provider remains the guide.
          </p>
        </section>
      ) : null}

      <TrendLine title="Weight (rolling average)" trend={props.weight} unit={props.weight.unit} />
      {props.weight.status === "disabled" ? (
        <p className="text-sm text-ink-soft">
          Weight tracking is off — progress here is measured in consistency, energy, and strength
          instead. That is a complete picture.
        </p>
      ) : null}
      <TrendLine title="Energy" trend={props.energyTrend} unit="/5" />
      <TrendLine title="Sleep" trend={props.sleepTrend} unit="h" />

      <section aria-label="Milestones" className="glass-surface flex flex-col gap-2 p-5">
        <h2 className="text-lg font-semibold text-ink">Milestones</h2>
        {props.milestones.length === 0 ? (
          <p className="text-ink-soft">Your first milestones are ahead of you, not behind.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {props.milestones.map((milestone) => (
              <li key={milestone.key} className="flex items-start gap-2 text-ink">
                <span aria-hidden="true">✦</span>
                <span>
                  {milestone.message ?? milestone.key}
                  <span className="ml-2 text-xs text-ink-muted">
                    {milestone.achievedAt.slice(0, 10)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
