import Link from "next/link";

import { InlineNotice } from "@/components/ui/inline-notice";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

/** Plain-language terms draft. Concise on purpose; legal review pending. */
export default function TermsPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-3xl font-semibold text-ink">Terms of Use</h1>
      <InlineNotice tone="info">
        This is a plain-language draft. It requires legal review before public launch and may
        change.
      </InlineNotice>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">The service</h2>
        <p className="text-ink-soft">
          Saelis is an AI companion for reflection, support, and everyday thinking. It is provided
          as a beta: things may change, break, or be imperfect. You must be at least 18 to use
          Saelis during the beta.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">What Saelis is not</h2>
        <p className="text-ink-soft">
          Saelis is not a medical, psychological, legal, or financial professional, and nothing it
          says is professional advice, diagnosis, or treatment. It is not an emergency service. If
          you may be in danger, call 911; if you are in crisis, call or text 988 (US), any hour.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">Your part</h2>
        <p className="text-ink-soft">
          Keep your account credentials to yourself, use Saelis only for lawful purposes, and
          don&apos;t attempt to break, probe, or overload the service or other people&apos;s data.
          Your words remain yours; you give us only the permission needed to operate the service for
          you.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">Our part</h2>
        <p className="text-ink-soft">
          We run Saelis with care and honesty, protect your data as described in the{" "}
          <Link href="/privacy" className="underline decoration-accent-lilac underline-offset-4">
            Privacy
          </Link>{" "}
          page, and never sell it or show you ads. The service is provided &quot;as is&quot; during
          beta, without warranties, and our liability is limited to the extent the law allows.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-ink">Leaving</h2>
        <p className="text-ink-soft">
          You can delete your account at any time in Settings; deletion removes your data. We may
          suspend accounts that abuse the service, and we&apos;ll tell you if we materially change
          these terms.
        </p>
      </section>
    </article>
  );
}
