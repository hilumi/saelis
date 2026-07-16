"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { InlineNotice } from "@/components/ui/inline-notice";

import type { ActionResult } from "@/types/actions";

export interface OnboardingFlowProps {
  action: (input: {
    tonePreference?: "gentle" | "balanced" | "direct";
    humorWelcome?: boolean;
  }) => Promise<ActionResult>;
}

type Directness = "gentle" | "balanced" | "direct";

/**
 * Four brief screens. Skippable at every step; completing OR skipping routes
 * to /home and onboarding is never shown again. All choices remain editable
 * later in Settings.
 */
export function OnboardingFlow({ action }: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [directness, setDirectness] = useState<Directness>("balanced");
  const [humorWelcome, setHumorWelcome] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  async function finish(withChoices: boolean) {
    if (finishing) return;
    setFinishing(true);
    setError(null);
    const result = await action(withChoices ? { tonePreference: directness, humorWelcome } : {});
    if (result.ok) {
      router.push("/home");
      router.refresh();
    } else {
      setError(result.error);
      setFinishing(false);
    }
  }

  const skip = (
    <Button variant="ghost" disabled={finishing} onClick={() => void finish(false)}>
      Skip
    </Button>
  );

  const screens = [
    // 1 — what Saelis is
    <section key="what" aria-label="What Saelis is" className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-ink">A quiet place of your own.</h1>
      <p className="text-ink-soft">
        Saelis is a companion for the moments in between — for venting, thinking out loud,
        celebrating, untangling a decision, or just not being alone with something. It listens
        first. It never rushes you toward fixing.
      </p>
      <p className="text-ink-soft">
        You choose what it remembers, and you can see or delete all of it, any time.
      </p>
      <div className="flex items-center justify-between gap-2">
        {skip}
        <Button onClick={() => setStep(1)}>Next</Button>
      </div>
    </section>,

    // 2 — honest AI disclosure
    <section key="ai" aria-label="Saelis is AI" className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-ink">Saelis is AI — and honest about it.</h1>
      <p className="text-ink-soft">
        Saelis is an AI companion, not a person. It can misunderstand you, miss context, or simply
        get things wrong. When it&apos;s unsure, it will say so — and you should feel free to
        correct it.
      </p>
      <p className="text-ink-soft">
        Saelis is not therapy, medical care, or a crisis service. In an emergency, or if you&apos;re
        in crisis, please reach real people: 911 for immediate danger, or call or text 988 (US) any
        hour.
      </p>
      <p className="text-sm text-ink-muted">
        More detail lives in{" "}
        <Link
          href="/ai-disclosure"
          className="underline decoration-accent-lilac underline-offset-4"
        >
          How Saelis uses AI
        </Link>
        .
      </p>
      <div className="flex items-center justify-between gap-2">
        {skip}
        <Button onClick={() => setStep(2)}>Next</Button>
      </div>
    </section>,

    // 3 — initial voice choices
    <section key="voice" aria-label="How Saelis speaks" className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-ink">How should Saelis speak with you?</h1>
      <p className="text-ink-soft">A starting point — you can change this any time in Settings.</p>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium text-ink">Directness</legend>
        <Choice
          label="Gentle"
          description="Soft-spoken, extra room to breathe."
          selected={directness === "gentle"}
          onSelect={() => setDirectness("gentle")}
        />
        <Choice
          label="Balanced"
          description="Warm and honest in equal measure."
          selected={directness === "balanced"}
          onSelect={() => setDirectness("balanced")}
        />
        <Choice
          label="Direct"
          description="Plain words, kindly meant."
          selected={directness === "direct"}
          onSelect={() => setDirectness("direct")}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium text-ink">Light humor</legend>
        <Choice
          label="Welcome, in the right moments"
          description="Never in heavy ones."
          selected={humorWelcome}
          onSelect={() => setHumorWelcome(true)}
        />
        <Choice
          label="No humor, please"
          description="Saelis stays steady throughout."
          selected={!humorWelcome}
          onSelect={() => setHumorWelcome(false)}
        />
      </fieldset>

      <div className="flex items-center justify-between gap-2">
        {skip}
        <Button onClick={() => setStep(3)}>Next</Button>
      </div>
    </section>,

    // 4 — begin
    <section key="begin" aria-label="Ready" className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-ink">Come as you are.</h1>
      <p className="text-ink-soft">
        There&apos;s no wrong way to start — say anything, or nothing in particular. Nothing is
        remembered without your yes, and everything Saelis adapts stays visible in Settings.
      </p>
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      <div className="flex items-center justify-between gap-2">
        {skip}
        <Button disabled={finishing} onClick={() => void finish(true)}>
          {finishing ? "One moment…" : "Begin"}
        </Button>
      </div>
    </section>,
  ];

  return (
    <div className="glass-surface flex flex-col gap-4 p-6 sm:p-8">
      <p className="text-xs text-ink-muted" aria-label="Progress">
        {step + 1} of {screens.length}
      </p>
      {screens[step]}
    </div>
  );
}
