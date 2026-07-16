import { describe, expect, it } from "vitest";

import { createCoreAssessment, enrichLightPlan, hasCoreAssessment } from "@/lib/core/pipeline";
import { createLightPlan } from "@/lib/light";
import { createUnderstanding } from "@/lib/light/understanding";
import { makeLightContext } from "@/test/light-fixtures";

import type { CoreInput } from "@/lib/core/types";

function coreInput(message: string, overrides: Partial<CoreInput> = {}): CoreInput {
  const context = makeLightContext({ message });
  return {
    message,
    recentTurns: [],
    understanding: createUnderstanding(context),
    humorSetting: "light",
    toneSetting: "balanced",
    adaptiveLearningEnabled: true,
    adaptivePreferences: [],
    ...overrides,
  };
}

describe("createCoreAssessment — one coherent pipeline", () => {
  it("is deterministic: same input, same assessment", () => {
    const a = createCoreAssessment(coreInput("I just need to vent."));
    const b = createCoreAssessment(coreInput("I just need to vent."));
    expect(a).toEqual(b);
  });

  it("produces guidance lines without raw user content", () => {
    const assessment = createCoreAssessment(
      coreInput("My boss Alexandra Verhoeven said I'm useless."),
    );
    expect(assessment.guidance.lines.join(" ")).not.toContain("Alexandra Verhoeven");
  });

  it("never includes confidence numbers in guidance", () => {
    const assessment = createCoreAssessment(coreInput("Tell me if I'm being ridiculous."));
    expect(assessment.guidance.lines.join(" ")).not.toMatch(/0\.\d+|confidence/i);
  });

  it("disabled adaptation removes preference guidance and pattern eligibility", () => {
    const assessment = createCoreAssessment(
      coreInput("Hello there.", { adaptiveLearningEnabled: false }),
    );
    expect(assessment.adaptationEnabled).toBe(false);
    expect(assessment.guidance.patternObservationEligible).toBe(false);
    expect(assessment.guidance.approvedSharedPhrases).toEqual([]);
  });

  it("keeps the context budget controlled (bounded guidance)", () => {
    const assessment = createCoreAssessment(
      coreInput("Can I show you this text? Be honest with me. " + "really ".repeat(300)),
    );
    expect(assessment.guidance.lines.length).toBeLessThanOrEqual(20);
    expect(assessment.guidance.lines.join("\n").length).toBeLessThanOrEqual(3000);
  });
});

describe("enrichLightPlan — extends, never replaces, the Light Engine", () => {
  it("appends guidance to the contextual instruction and attaches the assessment", () => {
    const context = makeLightContext({ message: "I just need to vent." });
    const plan = createLightPlan(context);
    const assessment = createCoreAssessment(coreInput("I just need to vent."));
    const enriched = enrichLightPlan(plan, assessment);

    expect(hasCoreAssessment(enriched)).toBe(true);
    expect(enriched.understanding).toEqual(plan.understanding);
    expect(enriched.reflection).toEqual(plan.reflection);
    expect(enriched.memory).toEqual(plan.memory);
    expect(enriched.developerInstruction).toEqual(plan.developerInstruction);
    expect(enriched.contextualInstruction.startsWith(plan.contextualInstruction)).toBe(true);
    expect(enriched.contextualInstruction.length).toBeGreaterThan(
      plan.contextualInstruction.length,
    );
  });

  it("leaves urgent-safety plans untouched except for the attached assessment", () => {
    const context = makeLightContext({ message: "I want to end my life." });
    const plan = createLightPlan(context);
    const assessment = createCoreAssessment(coreInput("I want to end my life."));
    const enriched = enrichLightPlan(plan, assessment);
    expect(enriched.contextualInstruction).toEqual(plan.contextualInstruction);
    expect(enriched.understanding.safetyLevel).toBe("urgent");
  });

  it("guidance never contains hidden reasoning requests or adaptation history", () => {
    const assessment = createCoreAssessment(coreInput("Help me understand this email."));
    const joined = assessment.guidance.lines.join(" ").toLowerCase();
    expect(joined).not.toContain("chain-of-thought");
    expect(joined).not.toContain("step by step reasoning");
    expect(joined).not.toContain("history");
  });
});
