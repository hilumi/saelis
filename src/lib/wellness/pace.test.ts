import { describe, expect, it } from "vitest";

import { assessWeightPace, CONSERVATIVE_PACE_NOTICE } from "./pace";

describe("weight pace assessment", () => {
  it("stays quiet when weight fields are absent — weight is optional", () => {
    expect(
      assessWeightPace({
        currentWeightLbs: null,
        targetWeightLbs: null,
        goalTimeframeMonths: null,
      }).aggressive,
    ).toBe(false);
    expect(
      assessWeightPace({
        currentWeightLbs: 180,
        targetWeightLbs: null,
        goalTimeframeMonths: 6,
      }).aggressive,
    ).toBe(false);
  });

  it("accepts a gentle pace without comment", () => {
    // 24 lbs over 6 months ≈ 0.9 lb/week.
    const result = assessWeightPace({
      currentWeightLbs: 184,
      targetWeightLbs: 160,
      goalTimeframeMonths: 6,
    });
    expect(result.aggressive).toBe(false);
    expect(result.requestedLbsPerWeek).toBeLessThan(1.5);
  });

  it("flags an aggressive timeframe and plans a conservative range instead", () => {
    // 40 lbs in 2 months ≈ 4.6 lb/week.
    const result = assessWeightPace({
      currentWeightLbs: 200,
      targetWeightLbs: 160,
      goalTimeframeMonths: 2,
    });
    expect(result.aggressive).toBe(true);
    expect(result.conservativeLbsPerWeek).toBe(1.5);
  });

  it("treats weight gain goals identically (absolute change)", () => {
    const result = assessWeightPace({
      currentWeightLbs: 120,
      targetWeightLbs: 150,
      goalTimeframeMonths: 2,
    });
    expect(result.aggressive).toBe(true);
  });

  it("uses shame-free, promise-free copy", () => {
    const text = CONSERVATIVE_PACE_NOTICE.toLowerCase();
    for (const banned of ["shame", "fail", "cheat", "bounce back", "guarantee", "promise you"]) {
      expect(text).not.toContain(banned);
    }
    expect(text).toContain("estimates are never promises");
    expect(text).toContain("individualized");
  });
});
