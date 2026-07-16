import { describe, expect, it } from "vitest";

import { buildChallengeGuidance, evaluateChallengePolicy } from "@/lib/core/challenge-policy";
import { observeCommunicationStyle } from "@/lib/core/communication-style";
import { readTheRoom } from "@/lib/core/room-reader";
import { createUnderstanding } from "@/lib/light/understanding";
import { makeLightContext } from "@/test/light-fixtures";

import type { RelationshipContext } from "@/lib/core/types";

function relationship(overrides: Partial<RelationshipContext> = {}): RelationshipContext {
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

function decide(message: string, rel: RelationshipContext = relationship()) {
  const understanding = createUnderstanding(makeLightContext({ message }));
  const room = readTheRoom({
    message,
    understanding,
    style: observeCommunicationStyle(message),
    relationship: rel,
    humorSetting: "light",
  });
  return evaluateChallengePolicy(room, rel);
}

describe("evaluateChallengePolicy — deterministic rulings", () => {
  it("harmful proposed action mandates challenge", () => {
    const decision = decide("I'm about to send this cruel message tonight.");
    expect(decision.ruling).toBe("safety-mandated");
  });

  it("direct feedback when requested", () => {
    const decision = decide("Be honest with me: is this plan realistic?");
    expect(decision.ruling).toBe("allowed");
    expect(decision.reasons).toContain("directness-requested");
  });

  it("reality-check request allows challenge", () => {
    const decision = decide("Tell me if I'm being ridiculous about this.");
    expect(decision.ruling).toBe("allowed");
  });

  it("no challenge during immediate grief", () => {
    const decision = decide("My mother died yesterday. Everyone else moved on already.");
    expect(decision.ruling).toBe("prohibited");
    expect(decision.reasons).toContain("grief-present");
  });

  it("urgent safety prohibits ordinary challenge entirely", () => {
    const decision = decide("I want to end my life.");
    expect(decision.ruling).toBe("prohibited");
    expect(decision.reasons).toContain("urgent-safety");
  });

  it("established preference in a calm moment allows challenge", () => {
    const decision = decide(
      "I think everyone at work secretly resents me, that's just a fact.",
      relationship({ userExplicitlyWelcomesChallenge: true }),
    );
    expect(["allowed", "requires-permission"]).toContain(decision.ruling);
  });

  it("high vulnerability prohibits challenge without safety need", () => {
    const decision = decide("I'm falling apart and can't do this anymore.");
    expect(decision.ruling).toBe("prohibited");
  });

  it("humor-assisted only when invited AND humor is welcome", () => {
    const decision = decide(
      "Be honest with me 😂 am I doing the thing again?",
      relationship({ userExplicitlyWelcomesHumor: true }),
    );
    expect(decision.ruling).toBe("humor-assisted");
  });
});

describe("buildChallengeGuidance — dignity and agency preserved", () => {
  it("every non-prohibited ruling forbids diagnosis, motives-as-fact, and childhood causes", () => {
    for (const ruling of [
      "allowed",
      "requires-permission",
      "humor-assisted",
      "safety-mandated",
    ] as const) {
      const guidance = buildChallengeGuidance({ ruling, reasons: [] }).join(" ");
      expect(guidance).toMatch(/never insult, diagnose/i);
      expect(guidance).toMatch(/validate feelings/i);
      expect(guidance).toMatch(/decision with the user/i);
    }
  });

  it("requires-permission phrasing asks first", () => {
    const guidance = buildChallengeGuidance({
      ruling: "requires-permission",
      reasons: [],
    }).join(" ");
    expect(guidance).toMatch(/ask permission first/i);
    expect(guidance).toMatch(/can i push back a little\?/i);
  });

  it("safety-mandated validates the feeling and challenges the action", () => {
    const guidance = buildChallengeGuidance({ ruling: "safety-mandated", reasons: [] }).join(" ");
    expect(guidance).toMatch(/validate the feeling/i);
    expect(guidance).toMatch(/pause or revision/i);
  });

  it("prohibited means receive only", () => {
    const guidance = buildChallengeGuidance({ ruling: "prohibited", reasons: [] }).join(" ");
    expect(guidance).toMatch(/do not challenge/i);
  });
});
