"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { InlineNotice } from "@/components/ui/inline-notice";

import type { AdaptivePreference } from "@/lib/core/types";
import type { ActionResult } from "@/types/actions";

export interface CommunicationAdaptationSectionProps {
  preferences: AdaptivePreference[];
  decideAction?: (input: {
    preferenceId: string;
    decision: "keep" | "adjust" | "reset" | "stop";
  }) => Promise<ActionResult>;
  resetAllAction?: () => Promise<ActionResult>;
  previewMode?: boolean;
}

/** Friendly summaries — never raw scores, never internal jargon. */
const PREFERENCE_SUMMARIES: Record<string, string> = {
  "prefers-concise-when-overwhelmed":
    "Saelis has been keeping responses shorter when things feel crowded.",
  "appreciates-direct-challenge":
    "You often prefer direct feedback after you've had space to explain.",
  "enjoys-playful-humor": "Playful humor seems welcome in lighter moments.",
  "prefers-examples": "Concrete examples seem to help.",
  "prefers-options-before-recommendation":
    "You tend to prefer several possibilities before a recommendation.",
  "prefers-questions-before-advice": "You seem to prefer being asked before being advised.",
  "likes-bullet-points": "Short lists seem to work well for you.",
  "thinks-aloud": "You often think out loud — not everything needs an answer.",
  "wants-celebration-energy-matched": "When you celebrate, Saelis celebrates with you.",
  "prefers-no-emojis": "Saelis keeps emojis out of responses for you.",
};

function summaryFor(preference: AdaptivePreference): string | null {
  if (preference.key === "shared-phrase") {
    const phrase = String(preference.value.phrase ?? "");
    return phrase ? `"${phrase}" has become a little bit of shared language.` : null;
  }
  if (preference.key === "pattern-theme-opt-out") {
    const theme = String(preference.value.theme ?? "");
    return theme ? `Saelis no longer looks for patterns about ${theme}.` : null;
  }
  return PREFERENCE_SUMMARIES[preference.key] ?? null;
}

/**
 * "How we communicate" — every adaptation Saelis has picked up, in plain
 * language, with the user fully in control: keep, adjust, reset, or stop.
 */
export function CommunicationAdaptationSection({
  preferences,
  decideAction,
  resetAllAction,
  previewMode = false,
}: CommunicationAdaptationSectionProps) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [handled, setHandled] = useState<Record<string, string>>({});

  const visible = preferences.filter(
    (preference) =>
      (preference.status === "active" || preference.status === "observed") &&
      summaryFor(preference) !== null &&
      !handled[preference.id],
  );

  async function decide(
    preference: AdaptivePreference,
    decision: "keep" | "adjust" | "reset" | "stop",
  ) {
    setResult(null);
    if (previewMode || !decideAction) {
      setHandled((current) => ({ ...current, [preference.id]: decision }));
      return;
    }
    const outcome = await decideAction({ preferenceId: preference.id, decision });
    setResult(outcome);
    if (outcome.ok) {
      setHandled((current) => ({ ...current, [preference.id]: decision }));
    }
  }

  async function resetAll() {
    setResult(null);
    if (previewMode || !resetAllAction) return;
    const outcome = await resetAllAction();
    setResult(outcome);
  }

  return (
    <section aria-labelledby="how-we-communicate" className="flex flex-col gap-4">
      <div>
        <h2 id="how-we-communicate" className="text-lg font-semibold text-ink">
          How we communicate
        </h2>
        <p className="text-sm text-ink-soft">
          Small things Saelis has noticed about how you like to talk. Nothing here is a conclusion
          about you — and all of it is yours to change or clear.
        </p>
      </div>

      {visible.length === 0 ? (
        <GlassSurface>
          <p className="text-sm text-ink-soft">
            Nothing yet. As you talk, Saelis may gently notice communication preferences — like
            wanting shorter answers or more direct feedback — and they&apos;ll appear here for your
            review.
          </p>
        </GlassSurface>
      ) : (
        visible.map((preference) => (
          <GlassSurface key={preference.id}>
            <p className="text-ink">{summaryFor(preference)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="soft" onClick={() => void decide(preference, "keep")}>
                Keep this
              </Button>
              <Button variant="ghost" onClick={() => void decide(preference, "adjust")}>
                Adjust
              </Button>
              <Button variant="ghost" onClick={() => void decide(preference, "reset")}>
                Reset
              </Button>
              <Button variant="danger" onClick={() => void decide(preference, "stop")}>
                Stop adapting this way
              </Button>
            </div>
          </GlassSurface>
        ))
      )}

      {result && !result.ok ? <InlineNotice tone="error">{result.error}</InlineNotice> : null}
      {result && result.ok ? (
        <InlineNotice tone="success">Done. Saelis will follow your lead.</InlineNotice>
      ) : null}

      {preferences.length > 0 ? (
        <div>
          <Button variant="danger" onClick={() => void resetAll()}>
            Clear everything Saelis has adapted
          </Button>
        </div>
      ) : null}
    </section>
  );
}
