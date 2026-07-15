import { useMemo } from "react";

import { createSeededRandom } from "@/lib/sky";

/**
 * Volumetric cloud bands, deterministically placed from a constant seed so
 * clouds stay put across renders, routes, and sessions — no popping, no
 * distracting variation. Tinting comes from the phase palette CSS variables.
 */

interface CloudSpec {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

function buildClouds(band: "far" | "mid", count: number): CloudSpec[] {
  const random = createSeededRandom(`saelis-clouds:${band}`);
  return Array.from({ length: count }, (_, index) => ({
    id: `${band}-${index}`,
    left: Math.round(random() * 110 - 15), // -15%..95%
    top: Math.round(band === "far" ? 4 + random() * 30 : 30 + random() * 45),
    width: Math.round(34 + random() * 40), // vw
    height: Math.round(10 + random() * 12), // vh
  }));
}

export function SkyClouds({ band }: { band: "far" | "mid" }) {
  const clouds = useMemo(() => buildClouds(band, band === "far" ? 3 : 3), [band]);

  return (
    <div aria-hidden="true">
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className={`sky-cloud sky-cloud--${band}`}
          style={{
            left: `${cloud.left}%`,
            top: `${cloud.top}%`,
            width: `${cloud.width}vw`,
            height: `${cloud.height}vh`,
          }}
        />
      ))}
    </div>
  );
}
