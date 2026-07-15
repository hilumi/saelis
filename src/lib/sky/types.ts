/**
 * The Living Sky — typed contracts.
 *
 * The sky is a quiet representation of time, space, and return. It is driven
 * by LOCAL DEVICE TIME ONLY: no location, no weather service, no mood, no
 * message content, no arrival answers, no analytics. It never diagnoses or
 * represents the user's emotions.
 */

export type SkyPhase =
  "pre-dawn" | "dawn" | "morning" | "day" | "golden-hour" | "sunset" | "twilight" | "night";

/** Visual tone The Light may borrow from the sky. Never changes behavior. */
export type LightSkyTone =
  "silver" | "pearl" | "warm-pearl" | "golden" | "blush" | "moonlit" | "aurora";

export interface SkyPalette {
  skyTop: string;
  skyMiddle: string;
  skyBottom: string;
  horizon: string;
  cloudLight: string;
  cloudShadow: string;
  mist: string;
  celestialGlow: string;
  starColor: string;
  textOverlay: string;
  glassTint: string;
}

export interface SkyState {
  phase: SkyPhase;
  nextPhase: SkyPhase;
  /** 0..1 — how far the current palette has blended toward the next phase. */
  transitionProgress: number;
  palette: SkyPalette;
  showSun: boolean;
  showMoon: boolean;
  showStars: boolean;
  showAurora: boolean;
  lightTone: LightSkyTone;
}

export interface SkyStar {
  id: string;
  /** Percent coordinates within the sky viewport. */
  x: number;
  y: number;
  /** Pixel size. */
  size: number;
  opacity: number;
  /** Animation delay in seconds (ignored under reduced motion). */
  delay: number;
}
