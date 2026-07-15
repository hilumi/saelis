"use client";

import { createContext, useEffect, useMemo, useState } from "react";

import {
  computeSkyState,
  currentMediaPreference,
  getInitialSkyState,
  HIGH_CONTRAST_QUERY,
  observeMediaPreference,
  REDUCED_MOTION_QUERY,
  SKY_PHASES,
} from "@/lib/sky";

import type { SkyEngineOptions, SkyPhase, SkyState } from "@/lib/sky";
import type { ReactNode } from "react";

export interface SkyContextValue {
  state: SkyState;
  reducedMotion: boolean;
  highContrast: boolean;
}

/** Default = the stable server-render sky; consumers work without a provider. */
export const SkyContext = createContext<SkyContextValue>({
  state: getInitialSkyState(),
  reducedMotion: false,
  highContrast: false,
});

/**
 * DEVELOPMENT-ONLY phase preview: `?sky=<phase>` or `?sky=aurora`.
 * Compiled out of production builds, never persisted, never affects user data.
 */
function readDevOverride(): SkyEngineOptions {
  if (process.env.NODE_ENV !== "development") return {};
  if (typeof window === "undefined") return {};
  const value = new URLSearchParams(window.location.search).get("sky");
  if (!value) return {};
  if (value === "aurora") return { forcedPhase: "night", forceAurora: true };
  if ((SKY_PHASES as readonly string[]).includes(value)) {
    return { forcedPhase: value as SkyPhase };
  }
  return {};
}

/**
 * Global sky state. Mounted once at the root layout so the sky is continuous
 * across routes; children remain server components. Time is recomputed at
 * most once per minute — never in animation frames — and the initial render
 * matches the server exactly (no hydration mismatch).
 */
export function SkyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SkyState>(getInitialSkyState);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const override = readDevOverride();
    const update = () => setState(computeSkyState(new Date(), override));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setReducedMotion(currentMediaPreference(REDUCED_MOTION_QUERY));
    setHighContrast(currentMediaPreference(HIGH_CONTRAST_QUERY));
    const unsubscribeMotion = observeMediaPreference(REDUCED_MOTION_QUERY, setReducedMotion);
    const unsubscribeContrast = observeMediaPreference(HIGH_CONTRAST_QUERY, setHighContrast);
    return () => {
      unsubscribeMotion();
      unsubscribeContrast();
    };
  }, []);

  const value = useMemo(
    () => ({ state, reducedMotion, highContrast }),
    [state, reducedMotion, highContrast],
  );

  return <SkyContext.Provider value={value}>{children}</SkyContext.Provider>;
}
