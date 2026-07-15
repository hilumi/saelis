import { createSeededRandom } from "@/lib/sky/stars";

import type { SkyStar } from "@/lib/sky/types";
import type { MemoryKind } from "@/types/companion";

/**
 * Deterministic Constellation placement.
 *
 * Each approved memory is assigned to one of the Living Sky's deterministic
 * star positions using a stable per-memory seed (position_seed, falling back
 * to the memory id). Placement never uses Math.random(), never changes for
 * the same memory, and never encodes chronology. Collisions resolve by
 * deterministic linear probing over the available positions.
 */

export interface MemorySummary {
  id: string;
  title: string | null;
  content: string;
  kind: MemoryKind;
  positionSeed: string | null;
}

export interface MemoryStar {
  memoryId: string;
  label: string;
  kind: MemoryKind;
  x: number;
  y: number;
  size: number;
}

/** Safe visual zone: keep interactive stars away from header and edges. */
const MIN_Y = 12;
const MAX_Y = 62;
const MIN_X = 4;
const MAX_X = 96;

function inSafeZone(star: SkyStar): boolean {
  return star.x >= MIN_X && star.x <= MAX_X && star.y >= MIN_Y && star.y <= MAX_Y;
}

export function memoryLabel(memory: MemorySummary): string {
  if (memory.title) return memory.title;
  const words = memory.content.split(/\s+/).slice(0, 6).join(" ");
  return words.length < memory.content.length ? `${words}…` : words;
}

export function assignMemoryStars(
  memories: MemorySummary[],
  availableStars: SkyStar[],
): MemoryStar[] {
  const slots = availableStars.filter(inSafeZone);
  if (slots.length === 0) return [];

  const taken = new Set<number>();
  const assigned: MemoryStar[] = [];

  // Sort by id so assignment order is stable regardless of query order.
  const ordered = [...memories].sort((a, b) => a.id.localeCompare(b.id));

  for (const memory of ordered) {
    const random = createSeededRandom(`constellation:${memory.positionSeed ?? memory.id}`);
    let index = Math.floor(random() * slots.length);
    let probes = 0;
    while (taken.has(index) && probes < slots.length) {
      index = (index + 1) % slots.length;
      probes += 1;
    }
    if (probes >= slots.length) break; // more memories than safe slots
    taken.add(index);
    const slot = slots[index] as SkyStar;
    assigned.push({
      memoryId: memory.id,
      label: memoryLabel(memory),
      kind: memory.kind,
      x: slot.x,
      y: slot.y,
      size: memory.kind === "north-star" ? 18 : 12,
    });
  }

  return assigned;
}
