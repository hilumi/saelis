import { describe, expect, it } from "vitest";

import { observeCommunicationStyle } from "@/lib/core/communication-style";
import { readTheRoom } from "@/lib/core/room-reader";
import { createUnderstanding } from "@/lib/light/understanding";
import { makeLightContext } from "@/test/light-fixtures";

import type { RelationshipContext, RoomAssessment } from "@/lib/core/types";

function newRelationship(overrides: Partial<RelationshipContext> = {}): RelationshipContext {
  return {
    stage: "new",
    userExplicitlyWelcomesHumor: false,
    userExplicitlyWelcomesChallenge: false,
    recentCorrectionCount: 0,
    successfulPlayfulExchangeCount: 0,
    recentSupportModes: [],
    ...overrides,
  };
}

function assess(
  message: string,
  overrides: {
    relationship?: Partial<RelationshipContext>;
    humorSetting?: "none" | "light" | "playful";
  } = {},
): RoomAssessment {
  const context = makeLightContext({ message });
  const understanding = createUnderstanding(context);
  return readTheRoom({
    message,
    understanding,
    style: observeCommunicationStyle(message),
    relationship: newRelationship(overrides.relationship),
    humorSetting: overrides.humorSetting ?? "light",
  });
}

describe("readTheRoom — explicit intent overrides inference", () => {
  it("venting: witness first, no humor without user humor, be-heard goal", () => {
    const room = assess("I just need to vent.");
    expect(room.userGoal).toBe("be-heard");
    expect(room.witnessFirst).toBe(true);
    expect(room.humorAppropriate).toBe(false);
    expect(room.challengeAppropriate).toBe(false);
  });

  it("grief: no humor, no challenge, high vulnerability, steadied energy", () => {
    const room = assess("My father died.");
    expect(room.cues).toContain("grief-present");
    expect(room.vulnerability).toBe("high");
    expect(room.humorAppropriate).toBe(false);
    expect(room.challengeAppropriate).toBe(false);
    expect(room.matchEnergy).toBe(false);
  });

  it("grief phrasing 'my mom died today' is caught", () => {
    const room = assess("My mom died today.");
    expect(room.cues).toContain("grief-present");
    expect(room.humorAppropriate).toBe(false);
  });

  it("celebration: matches energy, celebrate goal, humor may open", () => {
    const room = assess("I did it! I got the job!!!!");
    expect(room.userGoal).toBe("celebrate");
    expect(room.matchEnergy).toBe(true);
  });

  it("anger: witness first, no automatic challenge", () => {
    const room = assess("I'm so angry at my brother.");
    expect(room.witnessFirst).toBe(true);
    expect(room.challengeAppropriate).toBe(false);
  });

  it("shame: humor prohibited even with playful setting", () => {
    const room = assess("I'm such a failure.", { humorSetting: "playful" });
    expect(room.humorAppropriate).toBe(false);
  });

  it("directness request opens the challenge window", () => {
    const room = assess("Don't be soft with me. What do you think?");
    expect(room.directnessRequested).toBe(true);
    expect(room.challengeAppropriate).toBe(true);
  });

  it("humor request via user humor: playful message opens humor window", () => {
    const room = assess("Girl… absolutely not. 😂");
    expect(room.humorAppropriate).toBe(true);
    expect(room.vulnerability).toBe("low");
  });

  it("advice request maps to plan goal", () => {
    const room = assess("Give me three steps to get started.");
    expect(room.userGoal).toBe("plan");
  });

  it("presence request maps to stay-present with no questions pressure", () => {
    const room = assess("Can you just stay with me for a bit?");
    expect(room.userGoal).toBe("stay-present");
  });

  it("reality-check request permits direct challenge", () => {
    const room = assess("Tell me if I'm being ridiculous.");
    expect(room.userGoal).toBe("reality-check");
    expect(room.challengeAppropriate).toBe(true);
  });

  it("text analysis: understand goal and facts separation cue", () => {
    const room = assess("Can I show you this text from my sister?");
    expect(room.userGoal).toBe("understand");
    expect(room.cues).toContain("text-analysis");
  });

  it("email analysis via third-party quote", () => {
    const room = assess("My boss said 'circle back later.' What does that mean?");
    expect(room.userGoal).toBe("understand");
    expect(room.cues).toContain("text-analysis");
    expect(room.evidenceSufficientForConclusion).toBe(false);
  });

  it("decision support maps to decide", () => {
    const room = assess("I can't decide whether to stay or leave.");
    expect(room.userGoal).toBe("decide");
  });

  it("ambiguous third-party intent never yields conclusion-grade evidence", () => {
    const room = assess("We need to talk, he wrote. That's it.");
    expect(room.evidenceSufficientForConclusion).toBe(false);
  });

  it("harmful proposed action: time-sensitive urgency, challenge window", () => {
    const room = assess("I'm so angry. I'm going to send this cruel message right now.");
    expect(room.urgency).toBe("time-sensitive");
    expect(room.cues).toContain("harmful-action-proposed");
    expect(room.challengeAppropriate).toBe(true);
    expect(room.humorAppropriate).toBe(false);
  });

  it("safety override collapses everything", () => {
    const room = assess("I want to end my life.");
    expect(room.urgency).toBe("safety");
    expect(room.safetyLevel).toBe("urgent");
    expect(room.humorAppropriate).toBe(false);
    expect(room.challengeAppropriate).toBe(false);
    expect(room.vulnerability).toBe("high");
  });

  it("humor setting 'none' closes the humor window unconditionally", () => {
    const room = assess("Girl… absolutely not. 😂", { humorSetting: "none" });
    expect(room.humorAppropriate).toBe(false);
  });

  it("support-level safety closes the humor window", () => {
    const room = assess("I had a panic attack at work lol", { humorSetting: "playful" });
    expect(room.humorAppropriate).toBe(false);
  });

  it("established humor preference alone is not enough in a heavy moment", () => {
    const room = assess("Today was awful and I'm falling apart.", {
      relationship: { userExplicitlyWelcomesHumor: true },
      humorSetting: "playful",
    });
    expect(room.humorAppropriate).toBe(false);
  });
});
