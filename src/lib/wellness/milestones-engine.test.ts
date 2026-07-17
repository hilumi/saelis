import { describe, expect, it } from "vitest";

import { detectMilestones, type MilestoneContext } from "./milestones-engine";

const base: MilestoneContext = {
  onboardingComplete: true,
  checkInCount: 2,
  completedWorkoutCount: 3,
  completedWorkoutSources: ["saelis", "planet_fitness"],
  distinctWorkoutDaysLast7: 4,
  hydrationLoggedDaysLast7: 5,
  proteinTargetDaysLast7: 5,
  completedFirstProgramWeek: true,
  tracksWeight: true,
  absoluteWeightProgressLbs: 6,
  hadSymptomFreeModifiedWorkout: true,
  restoreActive: false,
  restoreOnboardingComplete: false,
  completedRestoreWeeks: 0,
  returnedAfterBreak: true,
  existingKeys: new Set(),
};

describe("milestone engine", () => {
  it("emits non-scale milestones for consistency, movement, and nourishment", () => {
    const keys = detectMilestones(base).map((m) => m.milestoneKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        "onboarding-complete",
        "first-check-in",
        "first-workout",
        "first-planet-fitness-workout",
        "three-workouts",
        "seven-day-consistency",
        "hydration-consistency",
        "protein-consistency",
        "first-symptom-free-modified-workout",
        "return-to-routine",
      ]),
    );
  });

  it("never re-emits existing keys (deduplication)", () => {
    const first = detectMilestones(base);
    const again = detectMilestones({
      ...base,
      existingKeys: new Set(first.map((m) => m.milestoneKey)),
    });
    expect(again).toHaveLength(0);
  });

  it("disables weight milestones when weight tracking is off", () => {
    const withWeight = detectMilestones(base).map((m) => m.milestoneKey);
    expect(withWeight).toContain("five-pound-progress");
    const without = detectMilestones({ ...base, tracksWeight: false }).map((m) => m.milestoneKey);
    expect(without).not.toContain("five-pound-progress");
    expect(without).not.toContain("ten-pound-progress");
    // Non-scale celebrations remain.
    expect(without).toContain("seven-day-consistency");
  });

  it("keeps Restore milestones Restore-only and never claims medical recovery", () => {
    const nonRestore = detectMilestones({ ...base, restoreOnboardingComplete: true });
    expect(nonRestore.map((m) => m.milestoneKey)).not.toContain("restore-onboarding-complete");
    const restore = detectMilestones({
      ...base,
      restoreActive: true,
      restoreOnboardingComplete: true,
      completedRestoreWeeks: 1,
    });
    const keys = restore.map((m) => m.milestoneKey);
    expect(keys).toContain("restore-onboarding-complete");
    expect(keys).toContain("first-restore-week");
    for (const milestone of restore) {
      expect(milestone.celebrationMessage?.toLowerCase()).not.toMatch(/healed|recovered|cured/);
    }
  });

  it("ten-pound milestone requires ten pounds of absolute progress", () => {
    expect(
      detectMilestones({ ...base, absoluteWeightProgressLbs: 9 }).map((m) => m.milestoneKey),
    ).not.toContain("ten-pound-progress");
    expect(
      detectMilestones({ ...base, absoluteWeightProgressLbs: 10 }).map((m) => m.milestoneKey),
    ).toContain("ten-pound-progress");
  });
});
