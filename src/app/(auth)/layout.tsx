import Link from "next/link";

import { OpenHorizon } from "@/components/brand/open-horizon";
import { SaelisWordmark } from "@/components/brand/saelis-wordmark";
import { CelestialEnvironment } from "@/components/celestial/celestial-environment";

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <CelestialEnvironment />
      <header className="mx-auto flex w-full max-w-md items-center px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full">
          <OpenHorizon size={32} label="Saelis home" />
          <SaelisWordmark />
        </Link>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-md px-4 pb-16">
        <div className="glass-surface p-8">{children}</div>
      </main>
    </div>
  );
}
