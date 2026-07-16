import { describe, expect, it } from "vitest";

import {
  enforcePlanConstraints,
  stripHumorMarkers,
  stripProhibitedClaims,
  stripUnapprovedSharedLanguage,
} from "@/lib/ai/plan-enforcement";
import { createCoreAssessment, enrichLightPlan } from "@/lib/core/pipeline";
import { createLightPlan } from "@/lib/light";
import { createUnderstanding } from "@/lib/light/understanding";
import { makeLightContext } from "@/test/light-fixtures";

import type { CompanionResponse } from "@/lib/ai/companion-contract";
import type { EnrichedLightPlan } from "@/lib/core/pipeline";

function enrichedPlan(
  message: string,
  overrides: { adaptiveLearningEnabled?: boolean } = {},
): EnrichedLightPlan {
  const context = makeLightContext({ message });
  const plan = createLightPlan(context);
  const assessment = createCoreAssessment({
    message,
    recentTurns: [],
    understanding: createUnderstanding(context),
    humorSetting: "light",
    toneSetting: "balanced",
    adaptiveLearningEnabled: overrides.adaptiveLearningEnabled ?? true,
    adaptivePreferences: [],
  });
  return enrichLightPlan(plan, assessment);
}

function response(overrides: Partial<CompanionResponse> = {}): CompanionResponse {
  return {
    supportMode: "witness",
    message: "I hear you.",
    followUp: null,
    closingLine: null,
    suggestedStep: null,
    proposedMemory: null,
    safety: { level: "none", message: null },
    reflection: null,
    adaptationNotice: null,
    insightCandidate: null,
    ...overrides,
  };
}

describe("post-validation — humor and sarcasm stripping", () => {
  it("removes humor markers when the room does not permit humor (grief)", () => {
    const plan = enrichedPlan("My father died.");
    expect(plan.core.guidance.humorPermitted).toBe(false);
    const enforced = enforcePlanConstraints(
      response({ message: "That's rough haha 😂 but hey, chin up." }),
      plan,
    );
    expect(enforced.message).not.toMatch(/haha|😂/);
  });

  it("removes sarcasm markers when vulnerability is high (trauma-adjacent distress)", () => {
    const plan = enrichedPlan("I'm falling apart and can't do this anymore.");
    expect(plan.core.room.vulnerability).toBe("high");
    const enforced = enforcePlanConstraints(
      response({ message: "Well done, another meltdown 😄 lol.", followUp: "Funny, right? 😂" }),
      plan,
    );
    expect(enforced.message).not.toMatch(/😄|lol/i);
    expect(enforced.followUp).not.toMatch(/😂/);
  });

  it("keeps humor when the room permits it (celebration with user humor)", () => {
    const plan = enrichedPlan("I got the job!!! 😂");
    expect(plan.core.guidance.humorPermitted).toBe(true);
    const enforced = enforcePlanConstraints(
      response({ supportMode: "celebrate", message: "YES! 😄 This one's yours." }),
      plan,
    );
    expect(enforced.message).toContain("😄");
  });
});

describe("post-validation — prohibited claims are removed always", () => {
  it("strips causal trauma claims from the message", () => {
    const plan = enrichedPlan("Why do I keep doing this?");
    const enforced = enforcePlanConstraints(
      response({
        message:
          "That sounds heavy. This happens because of your childhood. Let's look at it together.",
      }),
      plan,
    );
    expect(enforced.message).not.toMatch(/because of your childhood/i);
    expect(enforced.message).toContain("That sounds heavy.");
  });

  it("strips diagnoses", () => {
    const plan = enrichedPlan("I feel off lately.");
    const enforced = enforcePlanConstraints(
      response({ message: "You have depression. Consider what helps." }),
      plan,
    );
    expect(enforced.message).not.toMatch(/you have depression/i);
  });

  it("strips attachment-style labels", () => {
    const plan = enrichedPlan("Why do I keep choosing unavailable people?");
    const enforced = enforcePlanConstraints(
      response({ message: "You have an anxious attachment style. It shows in this choice." }),
      plan,
    );
    expect(enforced.message).not.toMatch(/attachment style/i);
  });

  it("strips protected-trait inference", () => {
    const plan = enrichedPlan("Help me understand this.");
    const enforced = enforcePlanConstraints(
      response({ message: "Given you're religious, guilt drives you. Let's slow down." }),
      plan,
    );
    expect(enforced.message).not.toMatch(/given you're religious/i);
  });

  it("strips unsupported certainty about third parties", () => {
    const plan = enrichedPlan("He wrote 'we need to talk'.");
    const enforced = enforcePlanConstraints(
      response({ message: "He is definitely leaving. The message says 'we need to talk'." }),
      plan,
    );
    expect(enforced.message).not.toMatch(/definitely leaving/i);
    expect(enforced.message).toContain("we need to talk");
  });

  it("falls back to a careful message when everything was prohibited", () => {
    const plan = enrichedPlan("Explain me to myself.");
    const enforced = enforcePlanConstraints(response({ message: "You have depression." }), plan);
    expect(enforced.message.length).toBeGreaterThan(0);
    expect(enforced.message).not.toMatch(/depression/i);
  });

  it("nulls followUp and closingLine carrying prohibited claims", () => {
    const plan = enrichedPlan("Rough week.");
    const enforced = enforcePlanConstraints(
      response({
        followUp: "Could this be because of your childhood?",
        closingLine: "Remember: you always do this.",
      }),
      plan,
    );
    expect(enforced.followUp).toBeNull();
    expect(enforced.closingLine).toBeNull();
  });
});

describe("post-validation — Core-era optional fields", () => {
  it("discards provider-authored adaptation notices unconditionally", () => {
    const plan = enrichedPlan("Keep it short please.");
    const enforced = enforcePlanConstraints(
      response({
        adaptationNotice: { summary: "I will adapt now.", preferenceKey: "made-up-key" },
      }),
      plan,
    );
    expect(enforced.adaptationNotice).toBeNull();
  });

  it("removes reflection blocks when facts-vs-interpretation was not requested", () => {
    const plan = enrichedPlan("I just need to vent.");
    expect(plan.core.guidance.separateFactsFromInterpretations).toBe(false);
    const enforced = enforcePlanConstraints(
      response({
        reflection: {
          facts: ["x"],
          interpretations: [],
          unknowns: [],
          alternativePerspectives: [],
        },
      }),
      plan,
    );
    expect(enforced.reflection).toBeNull();
  });

  it("keeps reflection for text analysis, unless it carries prohibited claims", () => {
    const plan = enrichedPlan("Can I show you this text? What does it mean?");
    expect(plan.core.guidance.separateFactsFromInterpretations).toBe(true);
    const clean = enforcePlanConstraints(
      response({
        reflection: {
          facts: ["The message says 'we need to talk'."],
          interpretations: ["It could be about the relationship."],
          unknowns: ["The topic is not stated."],
          alternativePerspectives: ["It might be logistical."],
        },
      }),
      plan,
    );
    expect(clean.reflection).not.toBeNull();

    const dirty = enforcePlanConstraints(
      response({
        reflection: {
          facts: ["The message exists."],
          interpretations: ["She is definitely leaving you."],
          unknowns: [],
          alternativePerspectives: [],
        },
      }),
      plan,
    );
    expect(dirty.reflection).toBeNull();
  });

  it("removes insight candidates below the deterministic screen", () => {
    const plan = enrichedPlan("Why do I keep putting this off?");
    const enforced = enforcePlanConstraints(
      response({
        insightCandidate: {
          theme: "avoidance",
          observation: "You are a procrastinator because of your childhood.",
          uncertaintyStatement: "This is certain.",
        },
      }),
      plan,
    );
    expect(enforced.insightCandidate).toBeNull();
  });

  it("removes insight candidates when adaptation is disabled", () => {
    const plan = enrichedPlan("Why do I keep putting this off?", {
      adaptiveLearningEnabled: false,
    });
    const enforced = enforcePlanConstraints(
      response({
        insightCandidate: {
          theme: "avoidance",
          observation: "It seems this decision may keep sliding to tomorrow.",
          uncertaintyStatement: "There may be several explanations.",
        },
      }),
      plan,
    );
    expect(enforced.insightCandidate).toBeNull();
  });

  it("keeps a well-formed insight candidate when eligible", () => {
    const plan = enrichedPlan("Why do I keep putting this off?");
    const enforced = enforcePlanConstraints(
      response({
        insightCandidate: {
          theme: "avoidance",
          observation: "It seems this decision may keep sliding to tomorrow.",
          uncertaintyStatement: "There may be several explanations, and I don't know which fits.",
        },
      }),
      plan,
    );
    expect(enforced.insightCandidate).not.toBeNull();
  });

  it("legacy plans without a Core assessment withhold Core-era fields", () => {
    const plan = createLightPlan(makeLightContext({ message: "Hello." }));
    const enforced = enforcePlanConstraints(
      response({
        reflection: { facts: [], interpretations: [], unknowns: [], alternativePerspectives: [] },
        insightCandidate: {
          theme: "rest",
          observation: "It seems rest may be scarce lately.",
          uncertaintyStatement: "I may be wrong about this.",
        },
      }),
      plan,
    );
    expect(enforced.reflection).toBeNull();
    expect(enforced.insightCandidate).toBeNull();
  });
});

describe("post-validation — shared language and safety preservation", () => {
  it("strips unapproved shared language", () => {
    const plan = enrichedPlan("Work update: shipped the thing.");
    const enforced = enforcePlanConstraints(
      response({ message: "Look at you, co-founder. The launch went well." }),
      plan,
    );
    expect(enforced.message).not.toMatch(/co-founder/i);
    expect(enforced.message).toContain("The launch went well.");
  });

  it("keeps approved shared language (unit rule)", () => {
    expect(
      stripUnapprovedSharedLanguage("Nice work, co-founder. Onward.", ["co-founder"]),
    ).toContain("co-founder");
  });

  it("urgent safety still overrides everything, Core or not", () => {
    const plan = enrichedPlan("I want to end my life.");
    const enforced = enforcePlanConstraints(
      response({ message: "Here's a productivity tip! 😄", supportMode: "act" }),
      plan,
    );
    expect(enforced.supportMode).toBe("presence");
    expect(enforced.safety.level).toBe("urgent");
    expect(enforced.insightCandidate ?? null).toBeNull();
    expect(enforced.adaptationNotice ?? null).toBeNull();
  });

  it("support-level safety can never be downgraded", () => {
    const plan = enrichedPlan("I had a panic attack at work.");
    const enforced = enforcePlanConstraints(
      response({ safety: { level: "none", message: null } }),
      plan,
    );
    expect(enforced.safety.level).toBe("support");
  });
});

describe("stripping utilities — deterministic behavior", () => {
  it("stripHumorMarkers removes emoji and laughter but preserves the sentence", () => {
    expect(stripHumorMarkers("That's a lot 😂 haha, truly.")).toBe("That's a lot, truly.");
  });

  it("stripProhibitedClaims leaves clean text untouched", () => {
    const text = "That sounds heavy, and it makes sense that it hurts.";
    expect(stripProhibitedClaims(text)).toBe(text);
  });
});
