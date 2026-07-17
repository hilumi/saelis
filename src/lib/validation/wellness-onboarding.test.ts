import { describe, expect, it } from "vitest";

import {
  notificationPreferencesSchema,
  onboardingDraftDataSchema,
  onboardingGoalsSchema,
  onboardingPathwaysSchema,
  onboardingRestoreSchema,
  onboardingRhythmSchema,
} from "./wellness-onboarding";

describe("onboarding pathway selection", () => {
  it("accepts one or many pathways", () => {
    expect(onboardingPathwaysSchema.safeParse(["reset"]).success).toBe(true);
    expect(onboardingPathwaysSchema.safeParse(["phoenix", "restore", "nourish"]).success).toBe(
      true,
    );
  });

  it("rejects empty and unknown selections", () => {
    expect(onboardingPathwaysSchema.safeParse([]).success).toBe(false);
    expect(onboardingPathwaysSchema.safeParse(["mama"]).success).toBe(false);
  });
});

describe("onboarding goals", () => {
  it("requires the primary goal to be among the selected goals", () => {
    expect(
      onboardingGoalsSchema.safeParse({
        goalTypes: ["strength", "energy"],
        primaryGoal: "strength",
      }).success,
    ).toBe(true);
    expect(
      onboardingGoalsSchema.safeParse({
        goalTypes: ["strength"],
        primaryGoal: "energy",
      }).success,
    ).toBe(false);
  });
});

describe("onboarding draft data", () => {
  it("accepts an empty draft — everything is resumable and optional", () => {
    expect(onboardingDraftDataSchema.safeParse({}).success).toBe(true);
  });

  it("keeps weight optional in the body slice", () => {
    expect(
      onboardingDraftDataSchema.safeParse({
        body: { tracksWeight: false, tracksCalories: false },
      }).success,
    ).toBe(true);
  });

  it("rejects unknown slices (strict — no unchecked JSONB)", () => {
    expect(onboardingDraftDataSchema.safeParse({ llmNotes: "x" }).success).toBe(false);
  });

  it("validates the Restore slice with never-auto-cleared defaults", () => {
    const parsed = onboardingRestoreSchema.parse({ postpartumStage: "3_to_6_months" });
    expect(parsed.medicalClearanceStatus).toBe("unknown");
    expect(parsed.floorTransitionsUncomfortable).toBe(false);
  });

  it("limits Rhythm to its three optional modes — no fertility fields exist", () => {
    for (const mode of ["symptom-led", "not-applicable", "prefer-not-to-track"] as const) {
      expect(onboardingRhythmSchema.safeParse({ mode }).success).toBe(true);
    }
    expect(onboardingRhythmSchema.safeParse({ mode: "fertility" }).success).toBe(false);
    expect(onboardingRhythmSchema.safeParse({ mode: "symptom-led", ovulation: true }).success).toBe(
      false,
    );
  });
});

describe("notification preferences", () => {
  it("applies calm defaults", () => {
    const parsed = notificationPreferencesSchema.parse({});
    expect(parsed.reminderStyle).toBe("gentle");
    expect(parsed.maxDailyNotifications).toBe(3);
    expect(parsed.morningCheckIn).toBe(false);
  });

  it("bounds quiet hours and daily volume", () => {
    expect(notificationPreferencesSchema.safeParse({ quietHoursStart: 24 }).success).toBe(false);
    expect(notificationPreferencesSchema.safeParse({ maxDailyNotifications: 11 }).success).toBe(
      false,
    );
    expect(
      notificationPreferencesSchema.safeParse({ quietHoursStart: 21, quietHoursEnd: 7 }).success,
    ).toBe(true);
  });
});
