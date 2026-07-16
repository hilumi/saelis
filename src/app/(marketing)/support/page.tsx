import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Support" };

/** Simple support page — no ticket systems, just honest paths to help. */
export default function SupportPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-3xl font-semibold text-ink">Support</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">If you&apos;re in crisis</h2>
        <p className="text-ink-soft">
          Saelis is not an emergency service. If you may be in immediate danger, call 911. If
          you&apos;re struggling, call or text 988 (US) to reach the 988 Suicide &amp; Crisis
          Lifeline — a real person, any hour. You can also text HOME to 741741 (Crisis Text Line).
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">Getting help with Saelis</h2>
        <p className="text-ink-soft">
          Email us at <span className="font-medium text-ink">support@saelis.app</span> for anything
          — bugs, confusion, account trouble, privacy questions, or feedback about how Saelis
          responded. A human reads every message during the beta.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">Common questions</h2>
        <p className="text-ink-soft">
          <strong>Is Saelis a person?</strong> No — Saelis is AI, and honest about it. See{" "}
          <Link
            href="/ai-disclosure"
            className="underline decoration-accent-lilac underline-offset-4"
          >
            How Saelis uses AI
          </Link>
          .
        </p>
        <p className="text-ink-soft">
          <strong>What does Saelis remember?</strong> Only what you explicitly approve. You can
          review, edit, or delete everything in Settings → Memories, and turn memory off entirely in
          Settings → Privacy.
        </p>
        <p className="text-ink-soft">
          <strong>How do I delete my data?</strong> Settings → Privacy lets you delete
          conversations, check-ins, memories, or your whole account. Deletion is permanent.
        </p>
      </section>
    </article>
  );
}
