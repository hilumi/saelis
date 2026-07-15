import { OpenHorizon } from "@/components/brand/open-horizon";
import { MISSION } from "@/lib/constants";
import { APP_VERSION } from "@/lib/version";

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
      <p className="text-xs text-ink-muted">Saelis v{APP_VERSION}</p>
      {process.env.NODE_ENV === "development" ? (
        <aside className="glass-surface p-6 text-sm text-ink-soft">
          <h2 className="mb-1 font-semibold text-ink">Read the philosophy</h2>
          <p>
            Development only: Saelis&apos;s foundational documents live in the repository under{" "}
            <code className="rounded bg-cloud-lilac px-1 py-0.5">docs/</code> — start with{" "}
            <code className="rounded bg-cloud-lilac px-1 py-0.5">
              docs/00-foundations/the-book-of-saelis.md
            </code>{" "}
            and{" "}
            <code className="rounded bg-cloud-lilac px-1 py-0.5">
              docs/01-the-light/constitution.md
            </code>
            . This note does not appear in production builds.
          </p>
        </aside>
      ) : null}
    </article>
  );
}
