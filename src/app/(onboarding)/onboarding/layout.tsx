import { OpenHorizon } from "@/components/brand/open-horizon";
import { SaelisWordmark } from "@/components/brand/saelis-wordmark";
import { requireUser } from "@/lib/auth/require-user";

import type { ReactNode } from "react";

/**
 * Minimal onboarding shell: no navigation, no demands — just the four brief
 * screens. Server-side auth check mirrors the app layout.
 */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="mx-auto flex w-full max-w-md items-center px-4 py-6">
        <span className="inline-flex items-center gap-2">
          <OpenHorizon size={32} label="Saelis" />
          <SaelisWordmark />
        </span>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-md px-4 pb-16">
        {children}
      </main>
    </div>
  );
}
