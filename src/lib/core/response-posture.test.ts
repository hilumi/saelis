import { describe, expect, it } from "vitest";

import { observeCommunicationStyle } from "@/lib/core/communication-style";
import { choosePosture } from "@/lib/core/response-posture";
import { readTheRoom } from "@/lib/core/room-reader";
import { createUnderstanding } from "@/lib/light/understanding";
import { makeLightContext } from "@/test/light-fixtures";

import type { RelationshipContext } from "@/lib/core/types";

const RELATIONSHIP: RelationshipContext = {
  stage: "new",
  userExplicitlyWelcomesHumor: false,
  userExplicitlyWelcomesChallenge: false,
  recentCorrectionCount: 0,
  successfulPlayfulExchangeCount: 0,
  recentSupportModes: [],
};

function posture(message: string, humorSetting: "none" | "light" | "playful" = "light") {
  const understanding = createUnderstanding(makeLightContext({ message }));
  const room = readTheRoom({
    message,
    understanding,
    style: observeCommunicationStyle(message),
    relationship: RELATIONSHIP,
    humorSetting,
  });
  return choosePosture(room, understanding);
}

describe("choosePosture — one primary, optional secondary", () => {
  it("venting → witness (+ reflect), no action, resonance first", () => {
    const plan = posture("I just need to vent.");
    expect(plan.primary).toBe("witness");
    expect(plan.secondary).toBe("reflect");
    expect(plan.controls.suggestAction).toBe(false);
    expect(plan.controls.openWithResonance).toBe(true);
  });

  it("celebration → celebrate, may add play when humor is open", () => {
    const plan = posture("I got the job!!!! 😂", "playful");
    expect(plan.primary).toBe("celebrate");
    expect(plan.secondary).toBe("play");
  });

  it("grief → comfort + presence, gentle directness, zero humor", () => {
    const plan = posture("My father died.");
    expect(plan.primary).toBe("comfort");
    expect(plan.secondary).toBe("presence");
    expect(plan.controls.humorPermitted).toBe(false);
    expect(plan.controls.directness).toBe("gentle");
  });

  it("urgent safety → ground + presence, no questions", () => {
    const plan = posture("I want to end my life.");
    expect(plan.primary).toBe("ground");
    expect(plan.secondary).toBe("presence");
    expect(plan.controls.maxQuestions).toBe(0);
  });

  it("reality check → challenge without a permission gate", () => {
    const plan = posture("Tell me if I'm being ridiculous.");
    expect(plan.primary).toBe("challenge");
    expect(plan.controls.challengeRequiresPermission).toBe(false);
    expect(plan.controls.separateFactsFromInterpretations).toBe(true);
  });

  it("harmful action → challenge + plan with an action allowed", () => {
    const plan = posture("I'm going to send this cruel message right now.");
    expect(plan.primary).toBe("challenge");
    expect(plan.secondary).toBe("plan");
    expect(plan.controls.suggestAction).toBe(true);
  });

  it("decision support → clarify with alternatives", () => {
    const plan = posture("I can't decide whether to stay or leave.");
    expect(plan.primary).toBe("clarify");
    expect(plan.controls.offerAlternatives).toBe(true);
  });

  it("text analysis → separates facts from interpretations", () => {
    const plan = posture("Can I show you this text from my sister?");
    expect(plan.controls.separateFactsFromInterpretations).toBe(true);
  });

  it("presence → no questions, no action", () => {
    const plan = posture("Can you just stay with me?");
    expect(plan.primary).toBe("presence");
    expect(plan.controls.maxQuestions).toBe(0);
    expect(plan.controls.suggestAction).toBe(false);
  });

  it("explicit plan request → plan posture with action", () => {
    const plan = posture("Give me three steps.");
    expect(plan.primary).toBe("plan");
    expect(plan.controls.suggestAction).toBe(true);
  });
});
