import Link from "next/link";

import { InlineNotice } from "@/components/ui/inline-notice";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

/** Plain-language privacy draft. Concise on purpose; legal review pending. */
export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-3xl font-semibold text-ink">Privacy</h1>
      <InlineNotice tone="info">
        This is a plain-language draft. It requires legal review before public launch and may
        change.
      </InlineNotice>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">What we collect</h2>
        <p className="text-ink-soft">
          Your email address and password (handled by our authentication provider, Supabase), your
          conversations with Saelis (only if conversation history is enabled — you can turn it off),
          memories you explicitly approve, your settings, and optional check-ins. If you allow
          product analytics, we also record content-free counts of events (for example, &quot;a
          response was marked helpful&quot;) — never what you wrote.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">What we never do</h2>
        <p className="text-ink-soft">
          We don&apos;t sell your data. We don&apos;t show ads. We don&apos;t build advertising
          profiles. Nobody at Saelis can browse your conversations, memories, or personal patterns —
          the founder&apos;s own console shows only aggregate counts, enforced by database policy.
          Nothing is remembered about you without your explicit approval.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">AI processing</h2>
        <p className="text-ink-soft">
          When you talk with Saelis, your message and limited context (recent turns, memories you
          approved) are sent to our AI provider (OpenAI) to generate the response. We request that
          these API inputs are not stored by the provider or used to train models. See{" "}
          <Link
            href="/ai-disclosure"
            className="underline decoration-accent-lilac underline-offset-4"
          >
            How Saelis uses AI
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">Your controls</h2>
        <p className="text-ink-soft">
          In Settings you can: turn off conversation history, turn off companion memory, turn off
          analytics, review and delete any memory, clear everything Saelis has adapted, export your
          memories, delete conversations, and delete your entire account. Deletion is real deletion.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">Questions</h2>
        <p className="text-ink-soft">
          Visit{" "}
          <Link href="/support" className="underline decoration-accent-lilac underline-offset-4">
            Support
          </Link>{" "}
          to reach us about privacy or anything else.
        </p>
      </section>
    </article>
  );
}
