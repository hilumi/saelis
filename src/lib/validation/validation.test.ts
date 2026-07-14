import { describe, expect, it } from "vitest";

import { arrivalSchema } from "@/lib/validation/arrival";
import { companionRequestSchema } from "@/lib/validation/companion";
import { companionSettingsSchema, profileSettingsSchema } from "@/lib/validation/profile";

describe("arrivalSchema", () => {
  it("accepts a valid arrival and normalizes an empty message to null", () => {
    const result = arrivalSchema.parse({
      mood: "steady",
      energy: "enough",
      supportNeed: "listen",
      message: "   ",
      includeFaithReflection: false,
    });
    expect(result.message).toBeNull();
    expect(result.mood).toBe("steady");
  });

  it("rejects an unknown mood", () => {
    expect(
      arrivalSchema.safeParse({
        mood: "furious",
        energy: "low",
        supportNeed: "listen",
      }).success,
    ).toBe(false);
  });

  it("rejects an over-long message", () => {
    expect(
      arrivalSchema.safeParse({
        mood: "steady",
        energy: "low",
        supportNeed: "listen",
        message: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });

  it("defaults includeFaithReflection to false", () => {
    const result = arrivalSchema.parse({
      mood: "bright",
      energy: "full",
      supportNeed: "celebrate",
    });
    expect(result.includeFaithReflection).toBe(false);
  });
});

describe("profile validation", () => {
  it("normalizes an empty preferred name to null", () => {
    const result = profileSettingsSchema.parse({ preferredName: "  ", timezone: null });
    expect(result.preferredName).toBeNull();
  });

  it("rejects an over-long preferred name", () => {
    expect(
      profileSettingsSchema.safeParse({ preferredName: "x".repeat(81), timezone: null }).success,
    ).toBe(false);
  });

  it("accepts valid companion settings", () => {
    const result = companionSettingsSchema.parse({
      tonePreference: "gentle",
      responseLength: "brief",
      defaultSupportPreference: "listen-first",
      humorLevel: "none",
      faithPreference: "never",
      planningStyle: "no-plans",
      encouragementStyle: "quiet",
      adaptiveLearningEnabled: false,
    });
    expect(result.tonePreference).toBe("gentle");
  });

  it("rejects an unknown tone", () => {
    expect(
      companionSettingsSchema.safeParse({
        tonePreference: "sarcastic",
        responseLength: "brief",
        defaultSupportPreference: "listen-first",
        humorLevel: "none",
        faithPreference: "never",
        planningStyle: "no-plans",
        encouragementStyle: "quiet",
        adaptiveLearningEnabled: false,
      }).success,
    ).toBe(false);
  });
});

describe("companionRequestSchema", () => {
  it("applies defaults", () => {
    const result = companionRequestSchema.parse({ message: "hello" });
    expect(result.conversationId).toBeNull();
    expect(result.supportHint).toBeNull();
    expect(result.includeFaithReflection).toBe(false);
  });

  it("rejects an empty message", () => {
    expect(companionRequestSchema.safeParse({ message: "   " }).success).toBe(false);
  });

  it("rejects a non-uuid conversation id", () => {
    expect(
      companionRequestSchema.safeParse({ message: "hi", conversationId: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("contains no user id field — identity comes from the session", () => {
    const parsed = companionRequestSchema.parse({ message: "hi" });
    expect("userId" in parsed).toBe(false);
  });
});
