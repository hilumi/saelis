import { shouldShowAurora } from "@/lib/sky/aurora";
import { interpolatePalette, SKY_PALETTES } from "@/lib/sky/palette";
import {
  areStarsVisible,
  getNextPhase,
  getPhaseForMinutes,
  getTransitionProgress,
  isMoonVisible,
  isSunVisible,
  PHASE_LIGHT_TONE,
} from "@/lib/sky/phases";

import type { SkyPhase, SkyState } from "@/lib/sky/types";

/**
 * The Sky Engine.
 *
 * Input: a Date (local device time) and an optional seed/override. That is the
 * ENTIRE API surface — no emotion, no messages, no arrival data, no location,
 * no weather. Deterministic: the same date and options always produce the
 * same state.
 */

export interface SkyEngineOptions {
  /** Stable seed; defaults to the local calendar date (YYYY-MM-DD). */
  seed?: string;
  /** Development preview only — forces a phase without touching the clock. */
  forcedPhase?: SkyPhase;
  /** Development preview only — forces the aurora during eligible phases. */
  forceAurora?: boolean;
}

export function dateSeed(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function computeSkyState(date: Date, options: SkyEngineOptions = {}): SkyState {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const phase = options.forcedPhase ?? getPhaseForMinutes(minutes);
  const nextPhase = getNextPhase(phase);
  const transitionProgress = options.forcedPhase ? 0 : getTransitionProgress(minutes);

  const from = SKY_PALETTES[phase];
  const to = SKY_PALETTES[nextPhase];
  const palette = transitionProgress > 0 ? interpolatePalette(from, to, transitionProgress) : from;

  const seed = options.seed ?? dateSeed(date);
  const showAurora =
    options.forceAurora === true
      ? phase === "night" || phase === "twilight"
      : shouldShowAurora(seed, phase);

  return {
    phase,
    nextPhase,
    transitionProgress,
    palette,
    showSun: isSunVisible(phase),
    showMoon: isMoonVisible(phase),
    showStars: areStarsVisible(phase),
    showAurora,
    lightTone: showAurora ? "aurora" : PHASE_LIGHT_TONE[phase],
  };
}

/**
 * Stable initial state for server rendering: a fixed mid-day sky with no
 * transition, no aurora, and no clock reading — identical on server and
 * client first paint, then softly replaced after mount.
 */
export function getInitialSkyState(): SkyState {
  return {
    phase: "day",
    nextPhase: "golden-hour",
    transitionProgress: 0,
    palette: SKY_PALETTES.day,
    showSun: true,
    showMoon: false,
    showStars: false,
    showAurora: false,
    lightTone: "pearl",
  };
}
