import type { LightSkyTone, SkyPhase } from "@/lib/sky/types";

/**
 * Sky phase windows — atmospheric defaults, NOT astronomical claims.
 * Actual sunrise/sunset support may arrive later only through explicit,
 * opt-in location access. This sprint never asks for location.
 */

export const SKY_PHASES: readonly SkyPhase[] = [
  "pre-dawn",
  "dawn",
  "morning",
  "day",
  "golden-hour",
  "sunset",
  "twilight",
  "night",
];

/** Phase start times in minutes since local midnight, in day order. */
export const PHASE_STARTS: ReadonlyArray<{ phase: SkyPhase; start: number }> = [
  { phase: "pre-dawn", start: 4 * 60 }, // 04:00
  { phase: "dawn", start: 5 * 60 + 30 }, // 05:30
  { phase: "morning", start: 7 * 60 }, // 07:00
  { phase: "day", start: 11 * 60 }, // 11:00
  { phase: "golden-hour", start: 16 * 60 }, // 16:00
  { phase: "sunset", start: 18 * 60 + 30 }, // 18:30
  { phase: "twilight", start: 20 * 60 }, // 20:00
  { phase: "night", start: 21 * 60 + 30 }, // 21:30 → wraps to 04:00
];

const MINUTES_PER_DAY = 24 * 60;

/** How many minutes before a boundary the palette begins blending forward. */
export const TRANSITION_WINDOW_MINUTES = 30;

export function getPhaseForMinutes(minutesOfDay: number): SkyPhase {
  const minutes = ((minutesOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  let current: SkyPhase = "night"; // 00:00–04:00 wraps from the previous night
  for (const window of PHASE_STARTS) {
    if (minutes >= window.start) current = window.phase;
  }
  return current;
}

export function getNextPhase(phase: SkyPhase): SkyPhase {
  const index = SKY_PHASES.indexOf(phase);
  return SKY_PHASES[(index + 1) % SKY_PHASES.length] as SkyPhase;
}

/** Minutes until the next phase boundary (handles the night → pre-dawn wrap). */
export function minutesUntilNextPhase(minutesOfDay: number): number {
  const minutes = ((minutesOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  for (const window of PHASE_STARTS) {
    if (window.start > minutes) return window.start - minutes;
  }
  // Past 21:30 — the next boundary is 04:00 tomorrow.
  const firstStart = PHASE_STARTS[0]?.start ?? 240;
  return MINUTES_PER_DAY - minutes + firstStart;
}

/** 0 outside the transition window, rising to 1 at the boundary. */
export function getTransitionProgress(minutesOfDay: number): number {
  const remaining = minutesUntilNextPhase(minutesOfDay);
  if (remaining >= TRANSITION_WINDOW_MINUTES) return 0;
  const progress = 1 - remaining / TRANSITION_WINDOW_MINUTES;
  return Math.min(1, Math.max(0, progress));
}

const SUN_PHASES: readonly SkyPhase[] = ["dawn", "morning", "day", "golden-hour", "sunset"];
const MOON_PHASES: readonly SkyPhase[] = ["twilight", "night", "pre-dawn"];
const STAR_PHASES: readonly SkyPhase[] = ["pre-dawn", "dawn", "twilight", "night"];

export function isSunVisible(phase: SkyPhase): boolean {
  return SUN_PHASES.includes(phase);
}

export function isMoonVisible(phase: SkyPhase): boolean {
  return MOON_PHASES.includes(phase);
}

export function areStarsVisible(phase: SkyPhase): boolean {
  return STAR_PHASES.includes(phase);
}

/** Relative star density by phase (1 = full night sky). */
export const STAR_DENSITY: Record<SkyPhase, number> = {
  "pre-dawn": 0.5,
  dawn: 0.2,
  morning: 0,
  day: 0,
  "golden-hour": 0,
  sunset: 0,
  twilight: 0.6,
  night: 1,
};

/** Sky tone The Light borrows per phase. Visual only — never behavioral. */
export const PHASE_LIGHT_TONE: Record<SkyPhase, LightSkyTone> = {
  "pre-dawn": "silver",
  dawn: "warm-pearl",
  morning: "pearl",
  day: "pearl",
  "golden-hour": "golden",
  sunset: "blush",
  twilight: "moonlit",
  night: "moonlit",
};
