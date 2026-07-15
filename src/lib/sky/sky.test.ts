import { afterEach, describe, expect, it, vi } from "vitest";

import { computeSkyState, dateSeed, getInitialSkyState } from "@/lib/sky/engine";
import { interpolatePalette, lerpColor, SKY_PALETTES } from "@/lib/sky/palette";
import {
  getNextPhase,
  getPhaseForMinutes,
  getTransitionProgress,
  minutesUntilNextPhase,
  SKY_PHASES,
} from "@/lib/sky/phases";
import { shouldShowAurora } from "@/lib/sky/aurora";
import { generateStars, STAR_COUNT_FULL, STAR_COUNT_MOBILE } from "@/lib/sky/stars";

import type { SkyPalette } from "@/lib/sky/types";

function at(hours: number, minutes = 0): Date {
  return new Date(2026, 5, 15, hours, minutes, 0, 0);
}

afterEach(() => vi.restoreAllMocks());

describe("sky phases", () => {
  it("maps every window, including exact boundaries", () => {
    expect(getPhaseForMinutes(4 * 60)).toBe("pre-dawn"); // 04:00 boundary
    expect(getPhaseForMinutes(4 * 60 - 1)).toBe("night"); // 03:59
    expect(getPhaseForMinutes(5 * 60 + 30)).toBe("dawn"); // 05:30
    expect(getPhaseForMinutes(7 * 60)).toBe("morning"); // 07:00
    expect(getPhaseForMinutes(11 * 60)).toBe("day"); // 11:00
    expect(getPhaseForMinutes(16 * 60)).toBe("golden-hour"); // 16:00
    expect(getPhaseForMinutes(18 * 60 + 30)).toBe("sunset"); // 18:30
    expect(getPhaseForMinutes(20 * 60)).toBe("twilight"); // 20:00
    expect(getPhaseForMinutes(21 * 60 + 30)).toBe("night"); // 21:30
  });

  it("wraps midnight into night", () => {
    expect(getPhaseForMinutes(0)).toBe("night");
    expect(getPhaseForMinutes(2 * 60)).toBe("night");
  });

  it("orders next phases in a full cycle", () => {
    expect(getNextPhase("night")).toBe("pre-dawn");
    expect(getNextPhase("sunset")).toBe("twilight");
    let phase = SKY_PHASES[0] as (typeof SKY_PHASES)[number];
    for (let step = 0; step < SKY_PHASES.length; step += 1) phase = getNextPhase(phase);
    expect(phase).toBe(SKY_PHASES[0]);
  });

  it("computes the wraparound distance to pre-dawn from late night", () => {
    expect(minutesUntilNextPhase(23 * 60)).toBe(60 + 4 * 60); // 23:00 → 04:00
  });

  it("keeps transition progress within [0, 1] and confined to the window", () => {
    expect(getTransitionProgress(21 * 60)).toBe(0); // 21:00, boundary at 21:30
    expect(getTransitionProgress(21 * 60 + 15)).toBeCloseTo(0.5, 5);
    expect(getTransitionProgress(21 * 60 + 29)).toBeGreaterThan(0.9);
    for (let minutes = 0; minutes < 24 * 60; minutes += 7) {
      const progress = getTransitionProgress(minutes);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });
});

describe("sky palettes", () => {
  const COLOR_KEYS: Array<keyof SkyPalette> = [
    "skyTop",
    "skyMiddle",
    "skyBottom",
    "horizon",
    "cloudLight",
    "cloudShadow",
    "mist",
    "celestialGlow",
    "starColor",
  ];

  it("every phase has a complete palette", () => {
    for (const phase of SKY_PHASES) {
      const palette = SKY_PALETTES[phase];
      for (const key of COLOR_KEYS) {
        expect(palette[key]).toMatch(/^#[0-9a-f]{6}$/i);
      }
      expect(palette.textOverlay).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette.glassTint).toContain("rgba(");
    }
  });

  it("night remains calm and readable — never black, ink text preserved", () => {
    const night = SKY_PALETTES.night;
    expect(night.skyTop).not.toBe("#000000");
    expect(night.textOverlay).toBe("#2D3650");
    expect(night.glassTint).toBeTruthy();
  });

  it("lerps colors and clamps t", () => {
    expect(lerpColor("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(lerpColor("#112233", "#112233", 0.7)).toBe("#112233");
    expect(lerpColor("#000000", "#ffffff", -1)).toBe("#000000");
    expect(lerpColor("#000000", "#ffffff", 2)).toBe("#ffffff");
  });

  it("interpolates adjacent phases into valid colors", () => {
    for (const phase of SKY_PHASES) {
      const next = getNextPhase(phase);
      const blended = interpolatePalette(SKY_PALETTES[phase], SKY_PALETTES[next], 0.4);
      for (const key of COLOR_KEYS) {
        expect(blended[key]).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe("stars", () => {
  it("is deterministic per seed and differs across seeds", () => {
    expect(generateStars("2026-06-15", 40)).toEqual(generateStars("2026-06-15", 40));
    expect(generateStars("2026-06-15", 40)).not.toEqual(generateStars("2026-06-16", 40));
  });

  it("keeps coordinates, size, and opacity within bounds", () => {
    for (const star of generateStars("bounds", STAR_COUNT_FULL)) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(100);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(70);
      expect(star.opacity).toBeGreaterThanOrEqual(0.25);
      expect(star.opacity).toBeLessThanOrEqual(0.85);
      expect(star.size).toBeGreaterThanOrEqual(1);
      expect(star.size).toBeLessThanOrEqual(2.6);
    }
  });

  it("caps the count and defines a mobile cap", () => {
    expect(generateStars("cap", 500)).toHaveLength(STAR_COUNT_FULL);
    expect(STAR_COUNT_MOBILE).toBeLessThan(STAR_COUNT_FULL);
  });

  it("never touches Math.random", () => {
    const spy = vi.spyOn(Math, "random");
    generateStars("no-random", STAR_COUNT_FULL);
    shouldShowAurora("no-random", "night");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("aurora", () => {
  it("is stable for a date seed and only eligible at night/twilight", () => {
    expect(shouldShowAurora("2026-06-15", "night")).toBe(shouldShowAurora("2026-06-15", "night"));
    expect(shouldShowAurora("2026-06-15", "day")).toBe(false);
    expect(shouldShowAurora("2026-06-15", "morning")).toBe(false);
    expect(shouldShowAurora("2026-06-15", "golden-hour")).toBe(false);
  });

  it("remains rare over a broad deterministic sample", () => {
    let shown = 0;
    for (let day = 0; day < 1000; day += 1) {
      if (shouldShowAurora(`seed-${day}`, "night")) shown += 1;
    }
    expect(shown).toBeGreaterThan(2); // it does happen…
    expect(shown).toBeLessThan(80); // …and stays rare (~3%)
  });
});

describe("sky engine", () => {
  it("is deterministic for a supplied date", () => {
    expect(computeSkyState(at(14, 30))).toEqual(computeSkyState(at(14, 30)));
  });

  it("shows the sun by day and the moon and stars by night", () => {
    const day = computeSkyState(at(12));
    expect(day.phase).toBe("day");
    expect(day.showSun).toBe(true);
    expect(day.showMoon).toBe(false);
    expect(day.showStars).toBe(false);
    expect(day.lightTone).toBe("pearl");

    const night = computeSkyState(at(23));
    expect(night.phase).toBe("night");
    expect(night.showSun).toBe(false);
    expect(night.showMoon).toBe(true);
    expect(night.showStars).toBe(true);
    expect(["moonlit", "aurora"]).toContain(night.lightTone);
  });

  it("reports the correct next phase and tones per phase", () => {
    expect(computeSkyState(at(17)).phase).toBe("golden-hour");
    expect(computeSkyState(at(17)).lightTone).toBe("golden");
    expect(computeSkyState(at(19)).lightTone).toBe("blush");
    expect(computeSkyState(at(6)).lightTone).toBe("warm-pearl");
    expect(computeSkyState(at(12)).nextPhase).toBe("golden-hour");
  });

  it("supports forced phase and forced aurora for development preview only", () => {
    const forced = computeSkyState(at(12), { forcedPhase: "night", forceAurora: true });
    expect(forced.phase).toBe("night");
    expect(forced.showAurora).toBe(true);
    expect(forced.lightTone).toBe("aurora");
    // Aurora can never be forced outside eligible phases.
    expect(computeSkyState(at(12), { forceAurora: true }).showAurora).toBe(false);
  });

  it("has no emotion, message, or location inputs — a Date and options only", () => {
    expect(computeSkyState.length).toBeLessThanOrEqual(2);
    const state = computeSkyState(at(9), { seed: "fixed" });
    expect(state.palette).toBeDefined();
  });

  it("provides a stable initial state for server rendering", () => {
    expect(getInitialSkyState()).toEqual(getInitialSkyState());
    expect(getInitialSkyState().phase).toBe("day");
    expect(getInitialSkyState().showAurora).toBe(false);
  });

  it("derives the seed from the local calendar date", () => {
    expect(dateSeed(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
