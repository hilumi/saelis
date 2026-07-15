import type { SkyPhase } from "@/lib/sky";

/**
 * A soft, diffused, mist-veiled sun — never a hard yellow circle, never
 * dominant. Position drifts gradually by phase; no astronomical claims.
 */
const SUN_POSITIONS: Partial<Record<SkyPhase, { left: string; top: string }>> = {
  dawn: { left: "20%", top: "56%" },
  morning: { left: "30%", top: "34%" },
  day: { left: "50%", top: "20%" },
  "golden-hour": { left: "66%", top: "44%" },
  sunset: { left: "74%", top: "58%" },
};

export function SkySun({ phase }: { phase: SkyPhase }) {
  const position = SUN_POSITIONS[phase] ?? SUN_POSITIONS.day;
  return <div aria-hidden="true" data-testid="sky-sun" className="sky-sun" style={position} />;
}
