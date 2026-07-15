import { describe, expect, it, vi } from "vitest";

import { assignMemoryStars, memoryLabel, type MemorySummary } from "@/lib/constellations/assign";
import { generateStars } from "@/lib/sky";

const STARS = generateStars("constellations:test-user", 90);

function memory(id: string, kind: "constellation" | "north-star" = "constellation"): MemorySummary {
  return { id, title: null, content: `memory ${id} content words here`, kind, positionSeed: null };
}

describe("assignMemoryStars", () => {
  const memories = ["a1", "b2", "c3", "d4", "e5"].map((id) => memory(id));

  it("is deterministic and stable across calls and input order", () => {
    const first = assignMemoryStars(memories, STARS);
    const second = assignMemoryStars([...memories].reverse(), STARS);
    expect(first).toEqual(assignMemoryStars(memories, STARS));
    expect(second).toEqual(first);
  });

  it("never collides and stays within the safe visual zone", () => {
    const many = Array.from({ length: 40 }, (_, index) => memory(`m-${index}`));
    const assigned = assignMemoryStars(many, STARS);
    const positions = new Set(assigned.map((star) => `${star.x}:${star.y}`));
    expect(positions.size).toBe(assigned.length);
    for (const star of assigned) {
      expect(star.y).toBeGreaterThanOrEqual(12);
      expect(star.y).toBeLessThanOrEqual(62);
      expect(star.x).toBeGreaterThanOrEqual(4);
      expect(star.x).toBeLessThanOrEqual(96);
    }
  });

  it("keeps the same memory in the same place", () => {
    const one = assignMemoryStars([memory("stable-id")], STARS)[0];
    const again = assignMemoryStars([memory("stable-id")], STARS)[0];
    expect(one).toEqual(again);
  });

  it("distinguishes North Stars by size, not only color", () => {
    const assigned = assignMemoryStars([memory("n1", "north-star"), memory("c1")], STARS);
    const north = assigned.find((star) => star.kind === "north-star");
    const constellation = assigned.find((star) => star.kind === "constellation");
    expect(north?.size).toBeGreaterThan(constellation?.size ?? 0);
  });

  it("never uses Math.random", () => {
    const spy = vi.spyOn(Math, "random");
    assignMemoryStars(memories, STARS);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("labels use the title or a short excerpt", () => {
    expect(memoryLabel({ ...memory("x"), title: "Bo the dog" })).toBe("Bo the dog");
    expect(memoryLabel(memory("y")).length).toBeLessThan(50);
  });
});
