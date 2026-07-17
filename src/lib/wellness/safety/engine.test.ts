import { describe, expect, it } from "vitest";

import { assessSafety, type SafetyInput } from "./engine";

const base: SafetyInput = { activePathways: ["phoenix"] };

describe("safety engine — urgent support", () => {
  it.each([
    ["chest pain", { chestPain: true }, "chest_pain"],
    ["shortness of breath", { shortnessOfBreath: true }, "shortness_of_breath"],
    ["fainting/dizziness", { dizzinessOrFainting: true }, "fainting_or_dizziness"],
    ["severe headache", { severeHeadache: true }, "severe_headache"],
  ] as const)("%s triggers urgent support and blocks exercise", (_label, checkIn, code) => {
    const result = assessSafety({ ...base, checkIn });
    expect(result.safetyTier).toBe("urgent_support");
    expect(result.urgent).toBe(true);
    expect(result.allowExercise).toBe(false);
    expect(result.blockedActivities).toContain("plan_generation");
    expect(result.reasonCodes).toContain(code);
    expect(result.professionalReferralSuggested).toBe(true);
    // No minimizing language.
    expect(result.userMessage.toLowerCase()).not.toMatch(/probably fine|nothing to worry/);
    // Never a diagnosis.
    expect(result.userMessage.toLowerCase()).toContain("not a diagnosis");
  });

  it("self-harm concern overrides everything with crisis support, no planning", () => {
    const result = assessSafety({ ...base, checkIn: { selfHarmConcern: true } });
    expect(result.safetyTier).toBe("urgent_support");
    expect(result.reasonCodes).toContain("self_harm_concern");
    expect(result.userMessage).toContain("988");
    expect(result.userMessage).toContain("911");
    expect(result.safePlanModules).toEqual(["check_in"]);
    expect(result.userMessage.toLowerCase()).not.toMatch(/diagnos|therapy session/);
  });

  it("heavy bleeding / severe pelvic pain / calf swelling are urgent for Restore users", () => {
    for (const flag of [
      "heavyBleeding",
      "severeAbdominalOrPelvicPain",
      "calfPainOrSwelling",
    ] as const) {
      const result = assessSafety({
        activePathways: ["restore"],
        postpartumProfile: { medicalClearanceStatus: "cleared" },
        postpartumCheckIn: { [flag]: true },
      });
      expect(result.safetyTier).toBe("urgent_support");
    }
  });
});

describe("safety engine — hold and contact professional", () => {
  it("not_cleared blocks structured exercise but keeps supportive modules", () => {
    const result = assessSafety({
      activePathways: ["restore"],
      postpartumProfile: { medicalClearanceStatus: "not_cleared" },
    });
    expect(result.safetyTier).toBe("hold_and_contact_professional");
    expect(result.allowExercise).toBe(false);
    expect(result.safePlanModules).toEqual(
      expect.arrayContaining(["nutrition", "hydration", "recovery", "education", "check_in"]),
    );
    expect(result.userMessage.toLowerCase()).toContain("not a diagnosis");
  });

  it("early postpartum + unknown clearance holds only beyond gentle intensity", () => {
    const withVigorous = assessSafety({
      activePathways: ["restore"],
      postpartumProfile: {
        postpartumStage: "less_than_6_weeks",
        medicalClearanceStatus: "unknown",
      },
      requestedIntensity: "moderate",
    });
    expect(withVigorous.safetyTier).toBe("hold_and_contact_professional");
    const gentleOnly = assessSafety({
      activePathways: ["restore"],
      postpartumProfile: {
        postpartumStage: "less_than_6_weeks",
        medicalClearanceStatus: "unknown",
      },
      requestedIntensity: "gentle",
    });
    expect(gentleOnly.safetyTier).not.toBe("hold_and_contact_professional");
  });

  it("pelvic pressure, repeated leaking, and recurring doming suggest pelvic-floor PT", () => {
    const result = assessSafety({
      activePathways: ["restore"],
      postpartumProfile: { medicalClearanceStatus: "cleared", pelvicFloorSymptoms: true },
      postpartumCheckIn: { pelvicHeavinessOrPressure: true, urinaryOrBowelSymptom: true },
      recentWorkoutSymptoms: [
        { painDuring: false, domingOrConing: false, pelvicFloorSymptom: true },
        { painDuring: false, domingOrConing: false, pelvicFloorSymptom: true },
      ],
    });
    expect(result.safetyTier).toBe("hold_and_contact_professional");
    expect(result.recommendedActions).toContain("consider_pelvic_floor_physical_therapy");
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining(["pelvic_pressure_or_heaviness", "leaking_during_exercise"]),
    );
  });

  it("recurring doming or coning holds exercise", () => {
    const result = assessSafety({
      activePathways: ["restore"],
      postpartumProfile: { medicalClearanceStatus: "cleared" },
      postpartumCheckIn: { domingOrConing: true },
      recentWorkoutSymptoms: [
        { painDuring: false, domingOrConing: true, pelvicFloorSymptom: false },
      ],
    });
    expect(result.safetyTier).toBe("hold_and_contact_professional");
    expect(result.reasonCodes).toContain("recurring_doming_or_coning");
  });

  it("significant pain (>=7) or repeated exercise pain holds", () => {
    expect(assessSafety({ ...base, checkIn: { painLevel: 8 } }).safetyTier).toBe(
      "hold_and_contact_professional",
    );
    expect(
      assessSafety({
        ...base,
        recentWorkoutSymptoms: [
          { painDuring: true, domingOrConing: false, pelvicFloorSymptom: false },
          { painDuring: true, domingOrConing: false, pelvicFloorSymptom: false },
        ],
      }).safetyTier,
    ).toBe("hold_and_contact_professional");
  });
});

describe("safety engine — recovery, modify, normal", () => {
  it("moderate pain without red flags → recovery only", () => {
    const result = assessSafety({ ...base, checkIn: { painLevel: 5 } });
    expect(result.safetyTier).toBe("recovery_only");
    expect(result.allowExercise).toBe(true);
    expect(result.allowedIntensity).toBe("gentle");
  });

  it("elevated soreness or mild illness → recovery only, framed kindly", () => {
    const soreness = assessSafety({ ...base, checkIn: { soreness: 5 } });
    expect(soreness.safetyTier).toBe("recovery_only");
    expect(soreness.userMessage.toLowerCase()).toContain("recovery is productive");
    expect(assessSafety({ ...base, checkIn: { illnessOrInjuryConcern: true } }).safetyTier).toBe(
      "recovery_only",
    );
  });

  it("low energy or mild soreness → modify", () => {
    expect(assessSafety({ ...base, checkIn: { energy: 2 } }).safetyTier).toBe("modify");
    expect(assessSafety({ ...base, checkIn: { soreness: 2 } }).safetyTier).toBe("modify");
  });

  it("no concerns → normal with full modules", () => {
    const result = assessSafety({ ...base, checkIn: { energy: 4, stress: 2 } });
    expect(result.safetyTier).toBe("normal");
    expect(result.allowedIntensity).toBe("standard");
    expect(result.reasonCodes).toEqual(["no_concerns"]);
  });

  it("postpartum rules never fire for users without Restore", () => {
    const result = assessSafety({
      activePathways: ["phoenix", "strong"],
      // Even if stray postpartum data were passed, restore is not active:
      postpartumCheckIn: { heavyBleeding: true },
      postpartumProfile: { medicalClearanceStatus: "not_cleared" },
      checkIn: { energy: 4, stress: 1 },
    });
    expect(result.safetyTier).toBe("normal");
  });
});
