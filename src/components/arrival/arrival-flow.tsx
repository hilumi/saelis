"use client";

import Link from "next/link";
import { useState } from "react";

import { EnergyChoices } from "@/components/arrival/energy-choices";
import { FaithChoice } from "@/components/arrival/faith-choice";
import { MoodChoices } from "@/components/arrival/mood-choices";
import { SupportChoices } from "@/components/arrival/support-choices";
import { TheLight } from "@/components/brand/the-light";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { TextareaField } from "@/components/ui/textarea";

import type { ActionResult } from "@/types/actions";
import type { ArrivalInput, Energy, Mood, SupportNeed } from "@/types/arrival";

type Step = "mood" | "energy" | "support" | "note" | "done";

export interface ArrivalFlowProps {
  onComplete: (input: ArrivalInput) => Promise<ActionResult>;
}

export function ArrivalFlow({ onComplete }: ArrivalFlowProps) {
  const [step, setStep] = useState<Step>("mood");
  const [mood, setMood] = useState<Mood | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [supportNeed, setSupportNeed] = useState<SupportNeed | null>(null);
  const [message, setMessage] = useState("");
  const [includeFaithReflection, setIncludeFaithReflection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!mood || !energy || !supportNeed || saving) return;
    setSaving(true);
    setError(null);
    const result = await onComplete({
      mood,
      energy,
      supportNeed,
      message: message.trim() === "" ? null : message.trim(),
      includeFaithReflection,
    });
    setSaving(false);
    if (result.ok) {
      setStep("done");
    } else {
      setError(result.error);
    }
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <TheLight state="welcoming" size={110} />
        <p className="text-lg text-ink">Thank you for arriving. There&apos;s no hurry from here.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/conversation"
            className="inline-flex min-h-11 items-center rounded-full bg-accent-lilac px-6 font-medium text-white"
          >
            Start talking
          </Link>
          <Link
            href="/stay-here"
            className="inline-flex min-h-11 items-center rounded-full bg-cloud-lilac px-6 font-medium text-ink"
          >
            Just stay here
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {step === "mood" ? (
        <>
          <MoodChoices value={mood} onChange={setMood} />
          <Button onClick={() => setStep("energy")} disabled={!mood}>
            Continue
          </Button>
        </>
      ) : null}

      {step === "energy" ? (
        <>
          <EnergyChoices value={energy} onChange={setEnergy} />
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep("mood")}>
              Back
            </Button>
            <Button onClick={() => setStep("support")} disabled={!energy}>
              Continue
            </Button>
          </div>
        </>
      ) : null}

      {step === "support" ? (
        <>
          <SupportChoices value={supportNeed} onChange={setSupportNeed} />
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep("energy")}>
              Back
            </Button>
            <Button onClick={() => setStep("note")} disabled={!supportNeed}>
              Continue
            </Button>
          </div>
        </>
      ) : null}

      {step === "note" ? (
        <>
          <TextareaField
            id="arrival-note"
            label="Anything you'd like to set down? (optional)"
            hint="A word or a paragraph — whatever fits."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={2000}
          />
          <FaithChoice value={includeFaithReflection} onChange={setIncludeFaithReflection} />
          {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep("support")}>
              Back
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? "Arriving…" : "Arrive"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
