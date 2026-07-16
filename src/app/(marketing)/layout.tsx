import Link from "next/link";

import { OpenHorizon } from "@/components/brand/open-horizon";
import { SaelisWordmark } from "@/components/brand/saelis-wordmark";
import { TrustLinks } from "@/components/layout/trust-links";

import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-5">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full">
          <OpenHorizon size={32} label="Saelis home" />
          <SaelisWordmark />
        </Link>
        <nav aria-label="Site" className="flex items-center gap-2">
          <Link
            href="/about"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-ink-soft hover:bg-cloud-lilac/60 hover:text-ink"
          >
            About
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex min-h-11 items-center rounded-full bg-cloud-lilac px-5 text-sm font-medium text-ink hover:bg-sky-lilac"
          >
            Sign in
          </Link>
        </nav>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-4xl px-4 pb-10">
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-4xl flex-col gap-1 px-4 pb-10">
        <TrustLinks />
        <p className="px-3 text-xs text-ink-muted">
          Saelis is an AI companion — not therapy or a crisis service. In an emergency call 911; in
          crisis, call or text 988 (US).
        </p>
      </footer>
    </div>
  );
}
