import { cn } from "@/lib/utils";

import type { LightSkyTone } from "@/lib/sky/types";

export type LightState =
  | "resting"
  | "welcoming"
  | "listening"
  | "receiving"
  | "reflecting"
  | "guiding"
  | "celebrating"
  | "still";

export interface TheLightProps {
  state?: LightState;
  /**
   * Optional sky-derived visual tone (see the Living Sky). Modifies only the
   * glow palette — the emotional state remains primary and time of day never
   * changes The Light's behavior or conversational meaning.
   */
  skyTone?: LightSkyTone;
  /** Pixel diameter. */
  size?: number;
  /** Force animation off regardless of OS setting (OS reduced-motion always wins too). */
  reducedMotion?: boolean;
  /** Provide only when The Light communicates meaningful status; otherwise it is decorative. */
  ariaLabel?: string;
  className?: string;
}

/**
 * The Light — Saelis's quiet presence. Decorative by default and hidden from
 * assistive technology unless an ariaLabel gives it meaning.
 */
export function TheLight({
  state = "resting",
  skyTone,
  size = 96,
  reducedMotion = false,
  ariaLabel,
  className,
}: TheLightProps) {
  return (
    <span
      data-testid="the-light"
      data-state={state}
      data-sky-tone={skyTone}
      role={ariaLabel ? "status" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn(
        "the-light",
        `the-light--${state}`,
        skyTone && skyTone !== "pearl" && `the-light--tone-${skyTone}`,
        reducedMotion && "motion-off",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
