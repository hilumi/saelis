import type { OnboardingFunnel } from "@/lib/analytics/metrics";

/** Onboarding funnel: per-step counts + conversion, abandonment, median time. */
export function FunnelView({ funnel }: { funnel: OnboardingFunnel }) {
  const max = Math.max(1, funnel.started, ...funnel.steps.map((step) => step.users));
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
        <span>
          Started: <strong className="tabular-nums text-ink">{funnel.started}</strong>
        </span>
        <span>
          Completed: <strong className="tabular-nums text-ink">{funnel.completed}</strong>
        </span>
        <span>
          Completion:{" "}
          <strong className="tabular-nums text-ink">
            {funnel.completionRate != null ? `${funnel.completionRate}%` : "—"}
          </strong>
        </span>
        <span>
          Abandonment:{" "}
          <strong className="tabular-nums text-ink">
            {funnel.abandonmentRate != null ? `${funnel.abandonmentRate}%` : "—"}
          </strong>
        </span>
        <span>
          Median time to complete:{" "}
          <strong className="tabular-nums text-ink">
            {funnel.medianCompletionMinutes != null
              ? `${funnel.medianCompletionMinutes} min`
              : "Insufficient data"}
          </strong>
        </span>
      </div>
      {funnel.steps.length === 0 ? (
        <p className="text-sm text-ink-muted">No onboarding step activity in this period.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {funnel.steps.map((step) => (
            <li key={step.step} className="flex items-center gap-2 text-sm">
              <span className="w-28 shrink-0 text-ink-soft">{step.step}</span>
              <span
                className="h-2 rounded-full bg-white/25"
                style={{ width: `${Math.max(3, (step.users / max) * 100)}%` }}
                aria-hidden="true"
              />
              <span className="shrink-0 tabular-nums text-ink">
                {step.users} users
                {step.conversionFromPrevious != null
                  ? ` · ${step.conversionFromPrevious}% from previous`
                  : ""}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
