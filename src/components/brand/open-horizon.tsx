import { cn } from "@/lib/utils";

export interface OpenHorizonProps {
  /** Pixel size of the square symbol. */
  size?: number;
  /** When decorative (default) the symbol is hidden from assistive technology. */
  label?: string;
  /** Subtle rise animation (disabled automatically under reduced motion). */
  animated?: boolean;
  className?: string;
}

/**
 * The Open Horizon — a low sun meeting a quiet line. Pure CSS.
 * Pass `label` only when the symbol acts as a control or conveys meaning;
 * otherwise it stays aria-hidden.
 */
export function OpenHorizon({ size = 40, label, animated = false, className }: OpenHorizonProps) {
  return (
    <span
      data-testid="open-horizon"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("open-horizon", animated && "open-horizon--animated", className)}
      style={{ width: size, height: size }}
    >
      <span className="open-horizon__sun" />
      <span className="open-horizon__line" />
    </span>
  );
}
