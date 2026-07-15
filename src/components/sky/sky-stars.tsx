import { useMemo } from "react";

import { generateStars, STAR_COUNT_FULL } from "@/lib/sky";

import type { CSSProperties } from "react";

/**
 * Deterministic, seeded stars (see lib/sky/stars.ts) — same all day, no
 * runtime randomness, capped for mobile via CSS. Breathing is a very slow
 * opacity ease; reduced-motion users get static stars.
 */
export function SkyStars({ seed, density }: { seed: string; density: number }) {
  const stars = useMemo(
    () => generateStars(seed, Math.round(STAR_COUNT_FULL * Math.min(1, Math.max(0, density)))),
    [seed, density],
  );

  return (
    <div aria-hidden="true" data-testid="sky-stars">
      {stars.map((star) => (
        <span
          key={star.id}
          className="sky-star"
          style={
            {
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              "--star-opacity": star.opacity,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
