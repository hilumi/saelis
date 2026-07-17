import { describe, expect, it } from "vitest";

import { assessReadiness } from "./readiness";
import { assessSafety } from "./safety/engine";

const normalSafety = assessSafety({
  activePathways: ["phoenix"],
  checkIn: { energy: 4, stress: 2 },
});

describe("readiness engine", () => {
  it("energized → standard plan, progression possible", () => {
    const result = assessReadiness({ readiness: "energized", safety: normalSafety });
    expect(result.adaptationLevel).toBe("standard");
    expect(result.recommendedDurationMultiplier).toBe(1);
    expect(result.explanationCodes).toContain("energized_progression_possible");
  });

  it("okay → normal plan", () => {
    const result = assessReadiness({ readiness: "okay", safety: normalSafety });
    expect(result.adaptationLevel).toBe("standard");
    expect(result.recommendedIntensity).toBe("standard");
  });

  it("tired → 20–35% shorter, gentler, simpler", () => {
    const result = assessReadiness({ readiness: "tired", safety: normalSafety });
    expect(result.adaptationLevel).toBe("reduced");
    expect(result.recommendedDurationMultiplier).toBeGreaterThanOrEqual(0.65);
    expect(result.recommendedDurationMultiplier).toBeLessThanOrEqual(0.8);
    expect(result.recommendedIntensity).toBe("gentle");
    expect(result.complexityPreference).toBe("simple");
  });

  it("overwhelmed → minimum-viable-day posture, never framed as failure", () => {
    const result = assessReadiness({ readiness: "overwhelmed", safety: normalSafety });
    expect(result.complexityPreference).toBe("minimal");
    expect(result.recommendedDurationMultiplier).toBeLessThanOrEqual(0.5);
    expect(result.recoveryPriority).toBe("high");
    expect(result.explanationCodes).toContain("overwhelmed_minimum_viable_day");
  });

  it("in pain → recovery via the safety verdict, never automatic exercise", () => {
    const painSafety = assessSafety({ activePathways: ["phoenix"], checkIn: { painLevel: 5 } });
    const result = assessReadiness({ readiness: "in_pain", painLevel: 5, safety: painSafety });
    expect(result.adaptationLevel).toBe("recovery");
    expect(result.recommendedIntensity).toBe("gentle");
    expect(result.explanationCodes).toContain("pain_reported");
  });

  it("safety hold dominates any readiness", () => {
    const hold = assessSafety({
      activePathways: ["restore"],
      postpartumProfile: { medicalClearanceStatus: "not_cleared" },
    });
    const result = assessReadiness({ readiness: "energized", safety: hold });
    expect(result.adaptationLevel).toBe("safety_hold");
    expect(result.recommendedDurationMultiplier).toBe(0);
    expect(result.recommendedIntensity).toBe("none");
  });

  it("short available time shrinks the session", () => {
    const result = assessReadiness({
      readiness: "okay",
      availableMinutes: 10,
      safety: normalSafety,
    });
    expect(result.recommendedDurationMultiplier).toBeLessThan(1);
    expect(result.explanationCodes).toContain("short_on_time");
  });
});
