import { describe, expect, it } from "vitest";

import {
  canComplete,
  isStepComplete,
  nextStep,
  previousStep,
  resumeStep,
  stepsFor,
} from "./onboarding";

import type { OnboardingDraftData } from "@/lib/validation/wellness-onboarding";

const baseDraft: OnboardingDraftData = {
  pathways: ["strong", "nourish"],
  goals: { goalTypes: ["strength", "nutrition"], primaryGoal: "strength" },
};

describe("onboarding step engine", () => {
  it("hides Restore, Rhythm, and Phoenix steps unless those pathways are selected", () => {
    const steps = stepsFor(["strong", "nourish"]);
    expect(steps).not.toContain("restore");
    expect(steps).not.toContain("rhythm");
    expect(steps).not.toContain("phoenix");
    expect(steps).toEqual([
      "welcome",
      "pathways",
      "goals",
      "body",
      "movement",
      "nutrition",
      "notifications",
      "review",
    ]);
  });

  it("adds the Restore step only when Restore is selected", () => {
    expect(stepsFor(["restore"])).toContain("restore");
    expect(stepsFor(["phoenix", "restore", "nourish"])).toContain("restore");
    expect(stepsFor(["phoenix", "nourish"])).not.toContain("restore");
  });

  it("keeps Rhythm strictly optional and Reset standalone-capable", () => {
    expect(stepsFor(["reset"])).toEqual([
      "welcome",
      "pathways",
      "goals",
      "body",
      "movement",
      "nutrition",
      "notifications",
      "review",
    ]);
    expect(stepsFor(["rhythm"])).toContain("rhythm");
  });

  it("navigates forward and backward through the selected steps", () => {
    const selected = ["phoenix"] as const;
    expect(nextStep("nutrition", selected)).toBe("phoenix");
    expect(nextStep("phoenix", selected)).toBe("notifications");
    expect(previousStep("notifications", selected)).toBe("phoenix");
    expect(previousStep("welcome", selected)).toBeNull();
    expect(nextStep("review", selected)).toBeNull();
  });

  it("treats optional steps as complete when skipped entirely", () => {
    expect(isStepComplete("body", {})).toBe(true);
    expect(isStepComplete("movement", {})).toBe(true);
    expect(isStepComplete("nutrition", {})).toBe(true);
    expect(isStepComplete("notifications", {})).toBe(true);
  });

  it("requires pathway and goal choices before completion", () => {
    expect(canComplete({})).toBe(false);
    expect(canComplete({ pathways: ["strong"] })).toBe(false);
    expect(canComplete(baseDraft)).toBe(true);
  });

  it("requires the Restore intake when Restore is selected", () => {
    const withRestore: OnboardingDraftData = {
      ...baseDraft,
      pathways: ["restore"],
      goals: { goalTypes: ["postpartum_recovery"], primaryGoal: "postpartum_recovery" },
    };
    expect(canComplete(withRestore)).toBe(false);
    expect(
      canComplete({
        ...withRestore,
        restore: {
          postpartumStage: "6_to_12_weeks",
          feedingStatus: "prefer_not_to_say",
          medicalClearanceStatus: "unknown",
          pelvicFloorSymptoms: false,
          suspectedDiastasis: false,
          diastasisAssessedByProfessional: false,
          abdominalDomingOrConing: false,
          chronicPain: false,
          ironDeficiencyOrAnemia: false,
          fatigueConcern: false,
          floorTransitionsUncomfortable: false,
        },
      }),
    ).toBe(true);
  });

  it("requires the Rhythm and Phoenix selections when those pathways are chosen", () => {
    const withRhythm: OnboardingDraftData = { ...baseDraft, pathways: ["rhythm", "strong"] };
    expect(canComplete(withRhythm)).toBe(false);
    expect(canComplete({ ...withRhythm, rhythm: { mode: "prefer-not-to-track" } })).toBe(true);

    const withPhoenix: OnboardingDraftData = { ...baseDraft, pathways: ["phoenix"] };
    expect(canComplete(withPhoenix)).toBe(false);
    expect(canComplete({ ...withPhoenix, phoenix: { style: "non-scale" } })).toBe(true);
  });

  it("resumes at the first step needing attention, without discarding data", () => {
    expect(resumeStep({})).toBe("pathways");
    expect(resumeStep({ pathways: ["strong"] })).toBe("goals");
    expect(resumeStep(baseDraft)).toBe("review");
    const withRestore: OnboardingDraftData = {
      ...baseDraft,
      pathways: ["restore", "strong"],
    };
    expect(resumeStep(withRestore)).toBe("restore");
    // Resuming never mutates the draft — pure inspection only.
    expect(withRestore.goals?.primaryGoal).toBe("strength");
  });
});
