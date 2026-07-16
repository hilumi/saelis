"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassSurface } from "@/components/ui/glass-surface";
import { InlineNotice } from "@/components/ui/inline-notice";

import type { PatternHypothesis } from "@/lib/core/types";
import type { ActionResult } from "@/types/actions";

export interface InsightsViewProps {
  hypotheses: PatternHypothesis[];
  action?: (input: {
    hypothesisId: string;
    decision: "explore" | "not-now" | "does-not-fit" | "stop-theme";
    theme?: string;
  }) => Promise<ActionResult>;
  previewMode?: boolean;
}

const THEME_LABELS: Record<string, string> = {
  boundaries: "boundaries",
  "self-criticism": "how you speak to yourself",
  conflict: "conflict",
  responsibility: "responsibility",
  avoidance: "putting things off",
  courage: "courage",
  rest: "rest",
  trust: "trust",
  belonging: "belonging",
  achievement: "achievement",
  communication: "communication",
  "decision-making": "decisions",
  other: "a recurring thread",
};

/**
 * "Things you may not have noticed" — quiet, reviewable observations.
 * Not an alert feed: no badges, no urgency, no scores. Every card is
 * tentative, shows its evidence, and can be declined or switched off.
 */
export function InsightsView({ hypotheses, action, previewMode = false }: InsightsViewProps) {
  const [decided, setDecided] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [openEvidence, setOpenEvidence] = useState<Record<string, boolean>>({});

  async function decide(
    hypothesis: PatternHypothesis,
    decision: "explore" | "not-now" | "does-not-fit" | "stop-theme",
  ) {
    setError(null);
    if (previewMode || !action) {
      setDecided((current) => ({ ...current, [hypothesis.id]: decision }));
      return;
    }
    const result = await action({
      hypothesisId: hypothesis.id,
      decision,
      theme: hypothesis.theme,
    });
    if (result.ok) {
      setDecided((current) => ({ ...current, [hypothesis.id]: decision }));
    } else {
      setError(result.error);
    }
  }

  const visible = hypotheses.filter((hypothesis) => !decided[hypothesis.id]);

  if (visible.length === 0 && Object.keys(decided).length === 0) {
    return (
      <EmptyState
        title="Nothing waiting here"
        body="When Saelis gently notices something that keeps returning across different moments, it will appear here for you to look at — or not. Nothing is concluded without you."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

      {visible.map((hypothesis) => (
        <GlassSurface key={hypothesis.id}>
          <p className="text-sm text-ink-muted">
            Something about {THEME_LABELS[hypothesis.theme] ?? hypothesis.theme}
          </p>
          <p className="mt-2 text-ink">{hypothesis.observation}</p>
          <p className="mt-2 text-sm text-ink-soft">{hypothesis.uncertaintyStatement}</p>
          <p className="mt-2 text-xs text-ink-muted">
            Saelis is mentioning this only because it has appeared more than once, in different
            kinds of moments, over time. It may not fit — you know your life better than any
            pattern.
          </p>

          <button
            type="button"
            className="mt-3 text-sm font-medium text-ink underline decoration-accent-lilac underline-offset-4"
            onClick={() =>
              setOpenEvidence((current) => ({
                ...current,
                [hypothesis.id]: !current[hypothesis.id],
              }))
            }
          >
            {openEvidence[hypothesis.id] ? "Hide what Saelis noticed" : "Show me what you noticed"}
          </button>

          {openEvidence[hypothesis.id] ? (
            <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
              {hypothesis.evidence.map((reference) => (
                <li key={reference.id}>
                  {new Date(reference.occurredAt).toLocaleDateString()} — {reference.summary}
                </li>
              ))}
              {hypothesis.evidence.length === 0 ? (
                <li>The individual moments have been cleared, but the count remains.</li>
              ) : null}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="soft" onClick={() => void decide(hypothesis, "explore")}>
              Explore
            </Button>
            <Button variant="ghost" onClick={() => void decide(hypothesis, "not-now")}>
              Not now
            </Button>
            <Button variant="ghost" onClick={() => void decide(hypothesis, "does-not-fit")}>
              This doesn&apos;t fit
            </Button>
            <Button variant="danger" onClick={() => void decide(hypothesis, "stop-theme")}>
              Don&apos;t look for this again
            </Button>
          </div>
        </GlassSurface>
      ))}

      {Object.entries(decided).map(([id, decision]) => (
        <GlassSurface key={id}>
          <p className="text-sm text-ink-soft">
            {decision === "explore"
              ? "Noted — you can bring this up with Saelis whenever you're ready."
              : decision === "not-now"
                ? "Set aside. It may quietly return later."
                : "Understood. Saelis won't treat this as a pattern."}
          </p>
        </GlassSurface>
      ))}
    </div>
  );
}
