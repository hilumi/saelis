import { describe, expect, it } from "vitest";

import { generateProgram, isProgressionEligible, type ProgramGeneratorInput } from "./generator";

const base: ProgramGeneratorInput = {
  activePathways: ["phoenix"],
  primaryGoal: "weight_management",
  goalTypes: ["weight_management", "energy"],
  movementExperience: "beginner",
  preferredWorkoutDays: 3,
  preferredWorkoutMinutes: 30,
  tracksCalories: true,
  tracksWeight: true,
  startDate: "2026-07-20",
};

describe("program generator", () => {
  it("builds 12 weeks across four named phases for Phoenix", () => {
    const { program, weeks } = generateProgram(base);
    expect(program.totalWeeks).toBe(12);
    expect(weeks).toHaveLength(12);
    expect(new Set(weeks.map((week) => week.phaseName))).toEqual(
      new Set(["Foundation", "Build", "Progress", "Sustain"]),
    );
    expect(program.safetyTier).toBe("standard");
    expect(weeks[0]!.strengthSessionsTarget).toBeGreaterThan(0);
    expect(weeks[0]!.cardioSessionsTarget).toBeGreaterThanOrEqual(0);
  });

  it("Strong emphasizes resistance work without any weight-loss requirement", () => {
    const { program, weeks } = generateProgram({
      ...base,
      activePathways: ["strong"],
      primaryGoal: "strength",
      goalTypes: ["strength"],
      tracksCalories: false,
      preferredWorkoutDays: 4,
    });
    expect(weeks[4]!.strengthSessionsTarget).toBeGreaterThanOrEqual(3);
    expect(program.nutritionStrategy).toBe("habit_based");
    expect(program.rationale ?? "").not.toMatch(/weight loss/i);
  });

  it("Nourish alone still produces a coherent program with nutrition strategy", () => {
    const { program } = generateProgram({
      ...base,
      activePathways: ["nourish"],
      primaryGoal: "nutrition",
      goalTypes: ["nutrition", "hydration"],
    });
    expect(program.nutritionStrategy).toBe("estimated_calorie_range");
    expect(program.activePathwayKeys).toEqual(["nourish"]);
  });

  it("Restore uses Restore phases and a postpartum tier when cleared", () => {
    const { program, weeks } = generateProgram({
      ...base,
      activePathways: ["restore"],
      primaryGoal: "postpartum_recovery",
      goalTypes: ["postpartum_recovery"],
      medicalClearanceStatus: "cleared",
    });
    expect(program.safetyTier).toBe("postpartum");
    expect(weeks[0]!.phaseName).toContain("Restore A");
    expect(weeks[11]!.phaseName).toContain("Restore D");
    expect(program.rationale).toContain("symptom-led");
  });

  it("Restore without clearance is restricted: no strength or cardio targets", () => {
    const { program, weeks } = generateProgram({
      ...base,
      activePathways: ["restore"],
      primaryGoal: "postpartum_recovery",
      goalTypes: ["postpartum_recovery"],
      medicalClearanceStatus: "unknown",
    });
    expect(program.safetyTier).toBe("restricted");
    for (const week of weeks) {
      expect(week.strengthSessionsTarget).toBe(0);
      expect(week.cardioSessionsTarget).toBe(0);
      expect(week.recoverySessionsTarget).toBeGreaterThan(0);
    }
  });

  it("Phoenix + Restore inherits Restore phases and clearance gating", () => {
    const { program } = generateProgram({
      ...base,
      activePathways: ["phoenix", "restore"],
      medicalClearanceStatus: "not_cleared",
    });
    expect(program.safetyTier).toBe("restricted");
  });

  it("Phoenix + Strong + Nourish blends emphases", () => {
    const { weeks, program } = generateProgram({
      ...base,
      activePathways: ["phoenix", "strong", "nourish"],
      preferredWorkoutDays: 5,
    });
    expect(program.activePathwayKeys).toHaveLength(3);
    expect(weeks[4]!.strengthSessionsTarget).toBeGreaterThanOrEqual(3);
  });

  it("Reset alone produces a gentle minimal program that preserves nothing aggressive", () => {
    const { program, weeks } = generateProgram({
      ...base,
      activePathways: ["reset"],
      primaryGoal: "consistency",
      goalTypes: ["consistency"],
    });
    expect(program.safetyTier).toBe("gentle");
    for (const week of weeks) {
      expect(week.strengthSessionsTarget).toBe(0);
      expect(week.recoverySessionsTarget).toBeGreaterThan(0);
    }
  });

  it("schedules deload weeks with softened targets", () => {
    const { weeks } = generateProgram(base);
    const deloads = weeks.filter((week) => week.deloadWeek);
    expect(deloads.map((week) => week.weekNumber)).toEqual([6, 12]);
    const regular = weeks.find((week) => week.weekNumber === 5)!;
    const deload = weeks.find((week) => week.weekNumber === 6)!;
    expect(deload.strengthSessionsTarget).toBeLessThanOrEqual(regular.strengthSessionsTarget);
    expect(deload.weeklyFocus.toLowerCase()).toContain("lighter week");
  });

  it("is deterministic — identical inputs, identical output", () => {
    expect(generateProgram(base)).toEqual(generateProgram(base));
  });
});

describe("progression eligibility", () => {
  const eligible = {
    plannedSessions: 3,
    completedSessions: 2,
    recentSymptomFlags: 0,
    maxReportedExertion: 7,
    recoveryQuality: 4,
    safetyHold: false,
  };

  it("requires completion, symptom-free weeks, tolerable exertion, recovery, and no hold", () => {
    expect(isProgressionEligible(eligible)).toBe(true);
    expect(isProgressionEligible({ ...eligible, safetyHold: true })).toBe(false);
    expect(isProgressionEligible({ ...eligible, recentSymptomFlags: 1 })).toBe(false);
    expect(isProgressionEligible({ ...eligible, completedSessions: 1 })).toBe(false);
    expect(isProgressionEligible({ ...eligible, maxReportedExertion: 9 })).toBe(false);
    expect(isProgressionEligible({ ...eligible, recoveryQuality: 2 })).toBe(false);
  });
});
