import Link from "next/link";

import { OpenHorizon } from "@/components/brand/open-horizon";
import { SaelisWordmark } from "@/components/brand/saelis-wordmark";
import { CelestialEnvironment } from "@/components/celestial/celestial-environment";

import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <CelestialEnvironment />
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
      <main id="main-content" className="mx-auto w-full max-w-4xl px-4 pb-20">
        {children}
      </main>
    </div>
  );
}
