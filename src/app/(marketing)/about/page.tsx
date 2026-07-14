import { OpenHorizon } from "@/components/brand/open-horizon";
import { MISSION } from "@/lib/constants";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 pt-10">
      <OpenHorizon size={56} animated />
      <h1 className="text-3xl font-semibold text-ink">About Saelis</h1>
      <p className="text-lg text-ink-soft">
        Saelis (SAY-liss) is an adaptive personal companion — a quiet place to feel understood,
        think clearly, and find what comes next.
      </p>
      <div className="glass-surface flex flex-col gap-4 p-8">
        <p className="text-ink">
          Our mission: <em>“{MISSION}”</em>
        </p>
        <p className="text-ink-soft">
          Saelis can simply listen, sit with you, help you untangle a decision, find the words for
          something hard, celebrate what went right, or — only if you ask — reflect with you in
          faith. Sometimes it offers one manageable next step. Often, presence is the whole point.
        </p>
        <p className="text-ink-soft">
          You control what Saelis remembers. Nothing is remembered without your approval, and
          everything can be reviewed and deleted. Saelis is not a therapist and never diagnoses;
          when things are heavier than a companion should hold, it points you to real human support.
        </p>
      </div>
    </article>
  );
}
