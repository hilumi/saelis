import { cn } from "@/lib/utils";

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
  size = 96,
  reducedMotion = false,
  ariaLabel,
  className,
}: TheLightProps) {
  return (
    <span
      data-testid="the-light"
      data-state={state}
      role={ariaLabel ? "status" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn("the-light", `the-light--${state}`, reducedMotion && "motion-off", className)}
      style={{ width: size, height: size }}
    />
  );
}
