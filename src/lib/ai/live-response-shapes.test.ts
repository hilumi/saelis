import { describe, expect, it } from "vitest";

import { companionResponseSchema } from "@/lib/ai/companion-contract";
import { clampStructuredExtras } from "@/lib/ai/companion-openai";
import { enforcePlanConstraints } from "@/lib/ai/plan-enforcement";
import { summarizeZodIssues } from "@/lib/ai/validation-diagnostics";
import { createCoreAssessment, enrichLightPlan } from "@/lib/core/pipeline";
import { createLightPlan } from "@/lib/light";
import { createUnderstanding } from "@/lib/light/understanding";
import { makeLightContext } from "@/test/light-fixtures";

/**
 * Regression suite for the live provider-validation failure (v0.7):
 * realistic, live-model-shaped payloads — exactly the shapes OpenAI strict
 * structured outputs produce, with all v0.7 keys present and nullable — must
 * validate, and deterministic enforcement must never emit an invalid object.
 * No live OpenAI is ever called.
 */

/** Live strict mode always emits EVERY key; optional objects arrive as null. */
const LIVE_BASE = {
  supportMode: "witness",
  message: "I'm taking that in — all of it.",
  followUp: null,
  closingLine: null,
  suggestedStep: null,
  proposedMemory: null,
  safety: { level: "none", message: null },
  reflection: null,
  adaptationNotice: null,
  insightCandidate: null,
};

function enrichedPlan(message: string) {
  const context = makeLightContext({ message });
  const plan = createLightPlan(context);
  return enrichLightPlan(
    plan,
    createCoreAssessment({
      message,
      recentTurns: [],
      understanding: createUnderstanding(context),
      humorSetting: "light",
      toneSetting: "balanced",
      adaptiveLearningEnabled: true,
      adaptivePreferences: [],
    }),
  );
}

describe("live-model-shaped payloads validate", () => {
  it("all optional objects null (the most common live shape)", () => {
    expect(companionResponseSchema.safeParse(LIVE_BASE).success).toBe(true);
  });

  it("reflection populated", () => {
    const payload = {
      ...LIVE_BASE,
      supportMode: "clarify",
      reflection: {
        facts: ["The message says 'we need to talk'."],
        interpretations: ["It could be about the relationship."],
        unknowns: ["The topic is not stated."],
        alternativePerspectives: ["It might be logistical.", "It might be urgent but unrelated."],
      },
    };
    expect(companionResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("reflection with empty arrays", () => {
    const payload = {
      ...LIVE_BASE,
      reflection: { facts: [], interpretations: [], unknowns: [], alternativePerspectives: [] },
    };
    expect(companionResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("adaptation notice populated", () => {
    const payload = {
      ...LIVE_BASE,
      adaptationNotice: {
        summary: "Saelis will be more direct.",
        preferenceKey: "appreciates-direct-challenge",
      },
    };
    expect(companionResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("insight candidate populated", () => {
    const payload = {
      ...LIVE_BASE,
      insightCandidate: {
        theme: "avoidance",
        observation: "It seems this decision may keep sliding to tomorrow.",
        uncertaintyStatement: "There may be several explanations, and I don't know which fits.",
      },
    };
    expect(companionResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("extra property rejected (exact additionalProperties parity)", () => {
    expect(companionResponseSchema.safeParse({ ...LIVE_BASE, reasoning: "..." }).success).toBe(
      false,
    );
    expect(
      companionResponseSchema.safeParse({
        ...LIVE_BASE,
        safety: { level: "none", message: null, score: 1 },
      }).success,
    ).toBe(false);
  });

  it("invalid enum rejected", () => {
    expect(
      companionResponseSchema.safeParse({ ...LIVE_BASE, supportMode: "diagnose" }).success,
    ).toBe(false);
    expect(
      companionResponseSchema.safeParse({
        ...LIVE_BASE,
        safety: { level: "critical", message: null },
      }).success,
    ).toBe(false);
  });
});

describe("clampStructuredExtras — strict schemas cannot express length caps", () => {
  it("clamps over-long reflection entries and oversize arrays to the contract caps", () => {
    const payload = {
      ...LIVE_BASE,
      reflection: {
        facts: Array.from({ length: 10 }, (_, index) => `fact ${index} ${"x".repeat(400)}`),
        interpretations: ["y".repeat(350)],
        unknowns: [],
        alternativePerspectives: [],
      },
    };
    // Without clamping this live-shaped payload fails validation…
    expect(companionResponseSchema.safeParse(payload).success).toBe(false);
    // …and with the deterministic clamp it passes with the caps enforced.
    const clamped = companionResponseSchema.safeParse(clampStructuredExtras(payload));
    expect(clamped.success).toBe(true);
    if (clamped.success) {
      expect(clamped.data.reflection?.facts).toHaveLength(8);
      expect(clamped.data.reflection?.facts[0]?.length).toBe(300);
      expect(clamped.data.reflection?.interpretations[0]?.length).toBe(300);
    }
  });

  it("clamps insight candidate strings without altering valid ones", () => {
    const payload = {
      ...LIVE_BASE,
      insightCandidate: {
        theme: "boundaries",
        observation: `It seems ${"z".repeat(600)}`,
        uncertaintyStatement: "I may be wrong about this.",
      },
    };
    const clamped = companionResponseSchema.safeParse(clampStructuredExtras(payload));
    expect(clamped.success).toBe(true);
    if (clamped.success) {
      expect(clamped.data.insightCandidate?.observation.length).toBe(500);
      expect(clamped.data.insightCandidate?.uncertaintyStatement).toBe(
        "I may be wrong about this.",
      );
    }
  });

  it("does not touch anything outside the three optional objects", () => {
    const clamped = clampStructuredExtras(LIVE_BASE) as typeof LIVE_BASE;
    expect(clamped).toEqual(LIVE_BASE);
  });
});

describe("post-enforcement output remains schema-valid", () => {
  const CASES: Array<{ name: string; message: string; payload: Record<string, unknown> }> = [
    { name: "plain witness", message: "I just need to vent.", payload: LIVE_BASE },
    {
      name: "grief with disobedient humor and prohibited claim",
      message: "My father died.",
      payload: {
        ...LIVE_BASE,
        message: "That's rough haha 😂. This is because of your childhood. I'm here.",
        followUp: "Could this be your anxious attachment style?",
      },
    },
    {
      name: "text analysis with populated reflection",
      message: "Can I show you this text? What does it mean?",
      payload: {
        ...LIVE_BASE,
        supportMode: "clarify",
        reflection: {
          facts: ["The message says 'we need to talk'."],
          interpretations: ["It could be about the relationship."],
          unknowns: ["The topic is not stated."],
          alternativePerspectives: ["It might be logistical."],
        },
      },
    },
    {
      name: "insight candidate + provider-authored notice",
      message: "Why do I keep putting this off?",
      payload: {
        ...LIVE_BASE,
        adaptationNotice: { summary: "I adapted.", preferenceKey: "fake" },
        insightCandidate: {
          theme: "avoidance",
          observation: "It seems this decision may keep sliding to tomorrow.",
          uncertaintyStatement: "There may be several explanations.",
        },
      },
    },
    {
      name: "urgent safety replacement",
      message: "I want to end my life.",
      payload: { ...LIVE_BASE, message: "Here's a fun productivity tip! 😄" },
    },
  ];

  for (const testCase of CASES) {
    it(testCase.name, () => {
      const plan = enrichedPlan(testCase.message);
      const validated = companionResponseSchema.parse(clampStructuredExtras(testCase.payload));
      const enforced = enforcePlanConstraints(validated, plan);
      const revalidated = companionResponseSchema.safeParse(enforced);
      expect(revalidated.success).toBe(true);
    });
  }
});

describe("diagnostics stay content-free", () => {
  it("summarizes Zod issues as paths, codes, and type names only", () => {
    const result = companionResponseSchema.safeParse({
      ...LIVE_BASE,
      message: 42,
      safety: { level: "critical", message: null },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = summarizeZodIssues(result.error);
      expect(issues.length).toBeGreaterThan(0);
      const flattened = JSON.stringify(issues);
      // Field paths and type names only — never payload values.
      expect(flattened).toContain("message");
      expect(flattened).not.toContain("42");
      expect(flattened).not.toContain("critical");
    }
  });
});
