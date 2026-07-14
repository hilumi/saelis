"use client";

import Link from "next/link";
import { useState } from "react";

import { TheLight } from "@/components/brand/the-light";
import { Button } from "@/components/ui/button";

const GENTLE_WORDS = [
  "You don't have to do anything right now.",
  "Being here is enough.",
  "There's no clock in this room.",
  "Whatever you're carrying can rest for a minute too.",
] as const;

/**
 * Stay Here — presence without action. No timers, no goals, no productivity
 * pressure. The user leaves when they're ready.
 */
export function PresenceView() {
  const [wordIndex, setWordIndex] = useState(0);
  const currentWord = GENTLE_WORDS[wordIndex % GENTLE_WORDS.length] ?? GENTLE_WORDS[0];

  return (
    <div className="flex flex-col items-center gap-8 py-8 text-center">
      <TheLight state="resting" size={140} />
      <p aria-live="polite" className="max-w-md text-lg text-ink">
        {currentWord}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="soft" onClick={() => setWordIndex((index) => index + 1)}>
          A gentle word
        </Button>
        <Link
          href="/conversation"
          className="inline-flex min-h-11 items-center rounded-full px-6 text-ink-soft hover:bg-cloud-lilac/60 hover:text-ink"
        >
          When you&apos;re ready
        </Link>
      </div>
      <p className="text-sm text-ink-muted">Stay as long as you like. Nothing is being measured.</p>
    </div>
  );
}
