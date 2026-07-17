"use client";

import { useEffect, useMemo } from "react";

import { SkyAurora } from "@/components/sky/sky-aurora";
import { SkyClouds } from "@/components/sky/sky-clouds";
import { SkyHorizonGlow } from "@/components/sky/sky-horizon-glow";
import { SkyLayer } from "@/components/sky/sky-layer";
import { SkyMoon } from "@/components/sky/sky-moon";
import { SkyStars } from "@/components/sky/sky-stars";
import { SkySun } from "@/components/sky/sky-sun";
import { useSky } from "@/components/sky/use-sky";
import { dateSeed, STAR_DENSITY } from "@/lib/sky";
import { cn } from "@/lib/utils";

import type { CSSProperties } from "react";

/**
 * The Living Sky — Saelis's global atmosphere.
 *
 * One fixed, decorative, pointer-transparent backdrop behind every route.
 * Layer order (back → front): base gradient, horizon glow, distant haze, far
 * clouds, sun/moon, stars, optional aurora, mid clouds, near mist. Content
 * and navigation render above it. Palette changes arrive as tiny per-minute
 * interpolation steps — no flashes, no remounts.
 */
export function LivingSky() {
  const { state, reducedMotion, highContrast } = useSky();
  const palette = state.palette;

  // Star seed is the local calendar date: stable all day, new sky each night.
  // Stars only render after the client clock takes over, so SSR never differs.
  const starSeed = useMemo(() => dateSeed(new Date()), []);

  // Content-facing adaptation (glass tint, overlay text) travels via :root so
  // surfaces outside this subtree can consume it.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sky-glass", palette.glassTint);
    root.style.setProperty("--sky-text-overlay", palette.textOverlay);
    root.dataset.skyPhase = state.phase;

    return () => {
      delete root.dataset.skyPhase;
    };
  }, [palette.glassTint, palette.textOverlay, state.phase]);

  const style = {
    "--sky-top": palette.skyTop,
    "--sky-middle": palette.skyMiddle,
    "--sky-bottom": palette.skyBottom,
    "--sky-horizon": palette.horizon,
    "--sky-cloud-light": palette.cloudLight,
    "--sky-cloud-shadow": palette.cloudShadow,
    "--sky-mist": palette.mist,
    "--sky-glow": palette.celestialGlow,
    "--sky-star": palette.starColor,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      data-testid="living-sky"
      data-phase={state.phase}
      className={cn(
        "living-sky",
        reducedMotion && "sky-reduced-motion",
        highContrast && "sky-high-contrast",
      )}
      style={style}
    >
      <SkyHorizonGlow />
      <SkyLayer className="sky-haze" />
      <SkyClouds band="far" />
      {state.showSun ? <SkySun phase={state.phase} /> : null}
      {state.showMoon ? <SkyMoon /> : null}
      {state.showStars ? <SkyStars seed={starSeed} density={STAR_DENSITY[state.phase]} /> : null}
      {state.showAurora ? <SkyAurora /> : null}
      <SkyClouds band="mid" />
      <SkyLayer className="sky-mist-layer" />
    </div>
  );
}
