import Link from "next/link";

import { TheLight } from "@/components/brand/the-light";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Saelis — A Reflection Companion" },
  description:
    "Saelis is an AI reflection companion designed to help you think more clearly, feel understood, explore another perspective, and move forward intentionally.",
};

const PRIMARY_CTA =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-accent-lilac px-8 py-3 font-medium text-white shadow-sm hover:opacity-90";
const SECONDARY_CTA =
  "inline-flex min-h-11 items-center justify-center rounded-full px-6 py-3 text-ink-soft hover:bg-cloud-lilac/60 hover:text-ink";

/**
 * The Saelis private-beta landing page.
 *
 * Calm by construction: one H1, generous space, pearl-glass used twice, the
 * Living Sky (from the root layout) as the only atmosphere, The Light present
 * but quiet. No cards-grid marketing, no fabricated numbers, no testimonials,
 * no pricing, no waitlist.
 */
export default function MarketingPage() {
  return (
    <div className="flex flex-col gap-20 pb-8 sm:gap-24">
      {/* ------------------------------------------------ hero */}
      <section
        aria-labelledby="hero-heading"
        className="flex flex-col items-center gap-8 pt-10 text-center"
      >
        <p className="inline-flex min-h-8 items-center rounded-full bg-cloud-lilac px-4 text-xs font-medium tracking-wide text-ink-soft">
          Private Beta
        </p>
        <TheLight state="welcoming" size={110} />
        <div className="flex max-w-2xl flex-col gap-4">
          <h1
            id="hero-heading"
            className="text-4xl font-semibold leading-tight text-ink sm:text-5xl"
          >
            Meet Saelis.
            <span className="mt-3 block text-2xl font-normal leading-snug text-ink-soft sm:text-3xl">
              A reflection companion for life&apos;s complicated moments.
            </span>
          </h1>
          <p className="text-lg text-ink-soft">
            Saelis helps you think more clearly, feel understood, consider another perspective, and
            move forward with greater intention.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-4 px-2">
          <Link href="/sign-up" className={PRIMARY_CTA}>
            Begin with Saelis
          </Link>
          <Link href="/sign-in" className={SECONDARY_CTA}>
            Sign in
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------ founder welcome */}
      <section aria-labelledby="founder-heading" className="mx-auto w-full max-w-2xl">
        <div className="glass-surface flex flex-col gap-4 p-6 sm:p-10">
          <h2 id="founder-heading" className="text-2xl font-semibold text-ink">
            Welcome to the earliest chapter of Saelis.
          </h2>
          <blockquote className="flex flex-col gap-3 text-ink-soft">
            <p>
              Saelis was created to be a calm place to bring the things life puts in front of
              you&mdash;the conversations you are replaying, the decisions you are weighing, the
              moments that feel heavy, and the moments worth celebrating.
            </p>
            <p>
              It is designed to listen, reflect, offer honest perspective, and gently challenge you
              when that may help.
            </p>
            <p>
              Saelis is an AI system. It may misunderstand, and it should never replace emergency,
              medical, legal, or mental-health professionals. Your feedback will help shape what it
              becomes.
            </p>
          </blockquote>
          <p className="text-sm text-ink">
            <span className="font-semibold">Sophia Greene</span>
            <span className="block text-ink-muted">Founder, Saelis</span>
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ what makes Saelis different */}
      <section aria-labelledby="different-heading" className="mx-auto w-full max-w-3xl px-2">
        <h2 id="different-heading" className="mb-8 text-center text-2xl font-semibold text-ink">
          What makes Saelis different
        </h2>
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          <div className="flex-1">
            <h3 className="mb-1 font-semibold text-ink">Supportive, not an echo chamber</h3>
            <p className="text-ink-soft">
              Saelis can comfort you without automatically agreeing with every conclusion.
            </p>
          </div>
          <div className="flex-1">
            <h3 className="mb-1 font-semibold text-ink">Adaptive, but transparent</h3>
            <p className="text-ink-soft">
              It can learn how you prefer to communicate while keeping important memories visible
              and controllable.
            </p>
          </div>
          <div className="flex-1">
            <h3 className="mb-1 font-semibold text-ink">Personal, but private</h3>
            <p className="text-ink-soft">
              Your conversations, memories, and settings remain protected by user-specific access
              controls.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ how Saelis may help */}
      <section aria-labelledby="help-heading" className="mx-auto w-full max-w-2xl px-2">
        <h2 id="help-heading" className="mb-6 text-center text-2xl font-semibold text-ink">
          How Saelis may help
        </h2>
        <ul className="mx-auto grid max-w-xl gap-3 text-ink-soft sm:grid-cols-2 sm:gap-x-12">
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 size-1.5 flex-none rounded-full bg-accent-lilac"
            />
            Talk through something difficult
          </li>
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 size-1.5 flex-none rounded-full bg-accent-blue"
            />
            Understand a text or conversation
          </li>
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 size-1.5 flex-none rounded-full bg-accent-blush"
            />
            Consider another perspective
          </li>
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 size-1.5 flex-none rounded-full bg-horizon-gold"
            />
            Prepare for a hard decision
          </li>
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 size-1.5 flex-none rounded-full bg-accent-lilac"
            />
            Receive constructive feedback
          </li>
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 size-1.5 flex-none rounded-full bg-accent-blue"
            />
            Celebrate something meaningful
          </li>
          <li className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2 size-1.5 flex-none rounded-full bg-quiet-mint"
            />
            Pause without needing to solve anything
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------ trust */}
      <section aria-labelledby="trust-heading" className="mx-auto w-full max-w-2xl">
        <div className="glass-surface flex flex-col gap-5 p-6 sm:p-10">
          <h2 id="trust-heading" className="text-2xl font-semibold text-ink">
            Built with restraint.
          </h2>
          <ul className="flex flex-col gap-2 text-ink-soft">
            <li>Saelis clearly identifies itself as AI.</li>
            <li>Memories remain reviewable and removable.</li>
            <li>Conversation history can be disabled.</li>
            <li>Saelis does not sell personal data.</li>
            <li>Founder tools do not expose private conversations.</li>
            <li>Account deletion and data controls are available.</li>
          </ul>
          <nav aria-label="Trust pages" className="flex flex-wrap gap-x-1 gap-y-0">
            <Link
              href="/privacy"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink underline decoration-accent-lilac underline-offset-4 hover:bg-cloud-lilac/60"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink underline decoration-accent-lilac underline-offset-4 hover:bg-cloud-lilac/60"
            >
              Terms
            </Link>
            <Link
              href="/ai-disclosure"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink underline decoration-accent-lilac underline-offset-4 hover:bg-cloud-lilac/60"
            >
              How Saelis uses AI
            </Link>
            <Link
              href="/support"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink underline decoration-accent-lilac underline-offset-4 hover:bg-cloud-lilac/60"
            >
              Support
            </Link>
          </nav>
        </div>
      </section>

      {/* ------------------------------------------------ beta expectations */}
      <section aria-labelledby="beta-heading" className="mx-auto w-full max-w-2xl px-2 text-center">
        <h2 id="beta-heading" className="mb-3 text-2xl font-semibold text-ink">
          You are helping shape Saelis.
        </h2>
        <p className="text-ink-soft">
          During the private beta, some responses may miss the mark, feel too soft, too direct, or
          simply not understand what you needed. Please use the feedback controls honestly. That
          feedback is more valuable than praise.
        </p>
      </section>

      {/* ------------------------------------------------ final call to action */}
      <section
        aria-labelledby="cta-heading"
        className="flex flex-col items-center gap-6 pb-6 text-center"
      >
        <TheLight state="resting" size={64} />
        <div>
          <h2 id="cta-heading" className="text-3xl font-semibold text-ink">
            Come as you are.
          </h2>
          <p className="mt-2 text-ink-soft">There is no perfect way to begin.</p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-4 px-2">
          <Link href="/sign-up" className={PRIMARY_CTA}>
            Create an account
          </Link>
          <Link href="/sign-in" className={SECONDARY_CTA}>
            Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
