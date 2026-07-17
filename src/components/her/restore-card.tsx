"use client";

import { useState } from "react";

import { saveRestoreCheckInAction } from "@/app/(app)/wellness-plan-actions";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Toggle } from "@/components/ui/toggle";

export interface RestoreCardProps {
  today: string;
  enrollmentId: string;
  phaseName: string | null;
  clearanceLabel: string;
  checkInDone: boolean;
  holdActive: boolean;
  professionalSupportSuggested: boolean;
  recoveryAction: string | null;
  onSaved?: () => void;
}

/**
 * Discreet Restore card — shown ONLY when Restore is active. Summary states
 * only; detailed symptoms never appear on the general dashboard, and the
 * check-in questions live behind an explicit disclosure.
 */
export function RestoreCard(props: RestoreCardProps) {
  const [open, setOpen] = useState(false);
  const [flags, setFlags] = useState({
    bleedingConcern: false,
    heavyBleeding: false,
    incisionConcern: false,
    pelvicHeavinessOrPressure: false,
    urinaryOrBowelSymptom: false,
    calfPainOrSwelling: false,
    severeAbdominalOrPelvicPain: false,
    breastOrFeedingConcern: false,
    domingOrConing: false,
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setState("saving");
    setError(null);
    const result = await saveRestoreCheckInAction({
      enrollmentId: props.enrollmentId,
      checkInDate: props.today,
      ...flags,
    });
    if (result.ok) {
      setState("saved");
      setOpen(false);
      props.onSaved?.();
    } else {
      setState("error");
      setError(result.error);
    }
  }

  const labels: Record<keyof typeof flags, string> = {
    bleedingConcern: "Bleeding feels different or concerning",
    heavyBleeding: "Heavy bleeding",
    incisionConcern: "Incision concern",
    pelvicHeavinessOrPressure: "Pelvic heaviness or pressure",
    urinaryOrBowelSymptom: "Leaking or bowel symptom",
    calfPainOrSwelling: "Calf pain or one-sided swelling",
    severeAbdominalOrPelvicPain: "Severe abdominal or pelvic pain",
    breastOrFeedingConcern: "Breast or feeding concern",
    domingOrConing: "Doming or coning during effort",
  };

  return (
    <section aria-label="Restore" className="flex flex-col gap-3 rounded-3xl bg-cloud-pink/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Restore</h2>
        {props.phaseName ? (
          <span className="rounded-full bg-white/60 px-3 py-1 text-xs text-ink">
            {props.phaseName}
          </span>
        ) : null}
      </div>
      <p className="text-sm text-ink-soft">Clearance you reported: {props.clearanceLabel}.</p>

      {props.holdActive ? (
        <InlineNotice tone="info">
          Structured exercise is resting for now. It can resume after appropriate evaluation or once
          symptoms settle, following your plan&apos;s rules — this is care, not a judgment, and not
          a diagnosis. Nourishment, hydration, and gentle recovery remain yours.
        </InlineNotice>
      ) : props.recoveryAction ? (
        <p className="text-ink">{props.recoveryAction}</p>
      ) : null}

      {props.professionalSupportSuggested ? (
        <InlineNotice tone="info">
          What you have shared recently is worth discussing with your provider or a pelvic-health
          physical therapist.
        </InlineNotice>
      ) : null}

      <p className="text-sm text-ink-soft">
        A quiet reminder: exhale through effort, and let pressure be information.
      </p>

      {props.checkInDone && state !== "saved" ? (
        <p className="text-sm text-ink-soft">✓ Today&apos;s recovery check-in is done.</p>
      ) : state === "saved" ? (
        <p className="text-sm text-ink-soft" role="status">
          ✓ Check-in saved. Thank you for the honesty.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <Button variant="soft" onClick={() => setOpen((value) => !value)}>
            {open ? "Close check-in" : "Gentle recovery check-in"}
          </Button>
          {open ? (
            <fieldset className="flex flex-col gap-1 rounded-2xl bg-white/50 p-3">
              <legend className="text-sm font-medium text-ink">
                Anything present today? All optional; nothing here diagnoses.
              </legend>
              {(Object.keys(flags) as (keyof typeof flags)[]).map((key) => (
                <Toggle
                  key={key}
                  label={labels[key]}
                  checked={flags[key]}
                  onChange={(checked) => setFlags((current) => ({ ...current, [key]: checked }))}
                />
              ))}
              <div className="mt-2">
                <Button disabled={state === "saving"} onClick={save}>
                  {state === "saving" ? "Saving…" : "Save check-in"}
                </Button>
              </div>
              {state === "error" && error ? (
                <InlineNotice tone="error">{error}</InlineNotice>
              ) : null}
            </fieldset>
          ) : null}
        </div>
      )}
    </section>
  );
}
