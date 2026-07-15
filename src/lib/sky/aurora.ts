import { createSeededRandom } from "@/lib/sky/stars";

import type { SkyPhase } from "@/lib/sky/types";

/**
 * Aurora — rare, subtle, deterministic, never a reward.
 * Eligible only at night or twilight. Roughly 3% of eligible days, stable for
 * the whole calendar day (date-seeded). Never announced, never tied to mood,
 * never surfaced as a probability to users.
 */

const AURORA_FREQUENCY = 0.03;

export function shouldShowAurora(seed: string, phase: SkyPhase): boolean {
  if (phase !== "night" && phase !== "twilight") return false;
  const random = createSeededRandom(`aurora:${seed}`);
  return random() < AURORA_FREQUENCY;
}
