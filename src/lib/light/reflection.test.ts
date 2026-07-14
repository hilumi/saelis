import { describe, expect, it } from "vitest";

import { createReflection } from "@/lib/light/reflection";
import { createUnderstanding } from "@/lib/light/understanding";
import { makeLightContext } from "@/test/light-fixtures";

import type { UnderstandingResult } from "@/lib/light/types";

function reflect(message: string) {
  return createReflection(createUnderstanding(makeLightContext({ message })));
}

describe("createReflection — mode strategies", () => {
  it("witness receives without offering a step", () => {
    const strategy = reflect("I just need to vent.");
    expect(strategy.shouldOfferAction).toBe(false);
    expect(strategy.shouldAskQuestion).toBe(true);
    expect(strategy.suggestedLightState).toBe("listening");
  });

  it("comfort stabilizes with presence, no questions, no steps", () => {
    const strategy = reflect("I'm exhausted, but I don't want advice.");
    expect(strategy.shouldOfferAction).toBe(false);
    expect(strategy.shouldAskQuestion).toBe(false);
    expect(strategy.shouldOfferPresence).toBe(true);
    expect(strategy.suggestedLightState).toBe("receiving");
  });

  it("clarify summarizes before advising", () => {
    const strategy = reflect("I can't decide whether to stay or leave.");
    expect(strategy.shouldOfferAction).toBe(false);
    expect(strategy.responseGoal).toContain("summarize");
    expect(strategy.suggestedLightState).toBe("reflecting");
  });

  it("act offers a manageable step", () => {
    const strategy = reflect("Give me three steps.");
    expect(strategy.shouldOfferAction).toBe(true);
    expect(strategy.suggestedLightState).toBe("guiding");
  });

  it("celebrate matches joy without redirecting to productivity", () => {
    const strategy = reflect("I did it! I got the job.");
    expect(strategy.shouldCelebrate).toBe(true);
    expect(strategy.shouldOfferAction).toBe(false);
    expect(strategy.suggestedLightState).toBe("celebrating");
  });

  it("connect gathers communication context", () => {
    const strategy = reflect("Help me write a message to my daughter.");
    expect(strategy.shouldAskQuestion).toBe(true);
    expect(strategy.responseGoal).toContain("recipient");
  });

  it("presence forces nothing", () => {
    const strategy = reflect("Can you just stay with me for a minute?");
    expect(strategy.shouldOfferAction).toBe(false);
    expect(strategy.shouldAskQuestion).toBe(false);
    expect(strategy.shouldOfferPresence).toBe(true);
    expect(strategy.suggestedLightState).toBe("still");
  });

  it("explicit action request permits a step even from a non-act mode", () => {
    const explicit: UnderstandingResult = {
      purpose: "seek-plan",
      supportMode: "clarify",
      emotionalTone: "uncertain",
      actionReadiness: "explicitly-requested",
      confidence: 0.9,
      cues: ["explicit-action"],
      requiresClarification: false,
      safetyLevel: "none",
    };
    expect(createReflection(explicit).shouldOfferAction).toBe(true);
  });

  it("urgent safety collapses to still presence", () => {
    const strategy = reflect("I'm thinking about harming myself.");
    expect(strategy.shouldOfferAction).toBe(false);
    expect(strategy.shouldAskQuestion).toBe(false);
    expect(strategy.suggestedLightState).toBe("still");
    expect(strategy.primaryNeed).toContain("human support");
  });
});
