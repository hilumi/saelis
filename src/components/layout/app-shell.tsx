import Link from "next/link";

import { OpenHorizon } from "@/components/brand/open-horizon";
import { SaelisWordmark } from "@/components/brand/saelis-wordmark";
import { CelestialNavigation } from "@/components/layout/celestial-navigation";

import type { ReactNode } from "react";

export interface AppShellProps {
  children: ReactNode;
  signOutAction?: () => Promise<void>;
}

/** Shared shell for the signed-in app: skip link, header, nav, main landmark. */
export function AppShell({ children, signOutAction }: AppShellProps) {
  return (
    <div className="app-depth-shell min-h-dvh">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {/* Atmosphere is provided globally by the Living Sky (root layout). */}
      <header className="app-depth-header mx-auto flex w-full max-w-4xl flex-wrap items-center gap-4 px-4 py-4">
        <Link href="/home" className="inline-flex items-center gap-2 rounded-full">
          <OpenHorizon size={32} label="Saelis home" />
          <SaelisWordmark />
        </Link>
        <div className="min-w-0 flex-1">
          <CelestialNavigation />
        </div>
        {signOutAction ? (
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-ink-soft hover:bg-cloud-lilac/60 hover:text-ink"
            >
              Sign out
            </button>
          </form>
        ) : null}
      </header>
      <main
        id="main-content"
        className="app-depth-content mx-auto w-full max-w-4xl px-4 pb-16 pt-4"
      >
        {children}
      </main>
    </div>
  );
}
