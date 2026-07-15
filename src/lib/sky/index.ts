/** The Living Sky — public API. Time in, atmosphere out. Nothing else. */

export { computeSkyState, dateSeed, getInitialSkyState } from "@/lib/sky/engine";
export type { SkyEngineOptions } from "@/lib/sky/engine";
export {
  SKY_PHASES,
  PHASE_STARTS,
  TRANSITION_WINDOW_MINUTES,
  STAR_DENSITY,
  PHASE_LIGHT_TONE,
  getPhaseForMinutes,
  getNextPhase,
  getTransitionProgress,
  minutesUntilNextPhase,
  isSunVisible,
  isMoonVisible,
  areStarsVisible,
} from "@/lib/sky/phases";
export { SKY_PALETTES, interpolatePalette, lerpColor } from "@/lib/sky/palette";
export {
  generateStars,
  createSeededRandom,
  STAR_COUNT_FULL,
  STAR_COUNT_MOBILE,
} from "@/lib/sky/stars";
export { shouldShowAurora } from "@/lib/sky/aurora";
export {
  REDUCED_MOTION_QUERY,
  HIGH_CONTRAST_QUERY,
  currentMediaPreference,
  observeMediaPreference,
} from "@/lib/sky/accessibility";
export type { SkyPhase, SkyPalette, SkyState, SkyStar, LightSkyTone } from "@/lib/sky/types";
