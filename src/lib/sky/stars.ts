import type { SkyStar } from "@/lib/sky/types";

/**
 * Deterministic star generation. Seeded PRNG only — Math.random() is never
 * used at render time, so the same seed produces the same sky (no hydration
 * mismatch, stable across rerenders and throughout the same calendar day).
 *
 * These stars may later become the spatial foundation for Constellations
 * (approved memories placed among them). Memories are NOT implemented as
 * stars in this milestone.
 */

export const STAR_COUNT_FULL = 90;
/** Mobile cap (applied via CSS below ~480px and available for direct use). */
export const STAR_COUNT_MOBILE = 36;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
export function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateStars(seed: string, count: number): SkyStar[] {
  const random = createSeededRandom(`stars:${seed}`);
  const bounded = Math.max(0, Math.min(count, STAR_COUNT_FULL));
  const stars: SkyStar[] = [];
  for (let index = 0; index < bounded; index += 1) {
    stars.push({
      id: `star-${index}`,
      x: Math.round(random() * 1000) / 10, // 0–100%
      y: Math.round(random() * 700) / 10, // upper 0–70% of the sky
      size: Math.round((1 + random() * 1.6) * 10) / 10, // 1–2.6px
      opacity: Math.round((0.25 + random() * 0.6) * 100) / 100, // 0.25–0.85
      delay: Math.round(random() * 80) / 10, // 0–8s breathing offset
    });
  }
  return stars;
}
