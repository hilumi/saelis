import { describe, expect, it } from "vitest";

import { buildConstitutionInstruction, CONSTITUTION_RULES } from "@/lib/light/constitution";
import { composePrompt } from "@/lib/light/prompt-composer";
import { RESPONSE_CONTEXT_GUIDANCE, selectResponseContext } from "@/lib/light/response-context";
import { DEFAULT_COMPANION_PREFERENCES } from "@/lib/companion-defaults";

import type {
  LightContext,
  MemoryDecision,
  ReflectionResult,
  UnderstandingResult,
} from "@/lib/light/types";

/**
 * Sprint 4 companion-voice tests: the warmer conversational constitution
 * stays centralized, dependency and robotic language is discouraged, safety
 * instructions remain, advice is never forced, and contextual guidance is
 * selected deterministically. No brittle exact-model-output assertions.
 */

function allProhibitedPatterns(): string[] {
  return CONSTITUTION_RULES.flatMap((rule) => rule.prohibitedPatterns);
}

describe("constitution — dependency and attachment language", () => {
  it("keeps the attachment rule inviolable and universal", () => {
    const rule = CONSTITUTION_RULES.find((r) => r.id === "no-attachment-language");
    expect(rule).toBeDefined();
    expect(rule?.priority).toBe(1);
    expect(rule?.applicableModes).toBe("all");
  });

  it("prohibits the specific dependency phrases", () => {
    const prohibited = allProhibitedPatterns();
    for (const phrase of [
      "i miss you",
      "i need you",
      "don't leave me",
      "why haven't you",
      "you broke your streak",
      "i'm lonely",
      "i'm always here for you",
    ]) {
      expect(prohibited).toContain(phrase);
    }
  });

  it("keeps the existing no-dependency and no-impersonation protections", () => {
    const ids = CONSTITUTION_RULES.map((rule) => rule.id);
    expect(ids).toContain("no-dependency");
    expect(ids).toContain("no-impersonation");
  });
});

describe("constitution — natural voice", () => {
  it("discourages robotic response patterns", () => {
    const prohibited = allProhibitedPatterns();
    for (const phrase of [
      "i understand that",
      "it is important to",
      "based on the information provided",
      "here are several strategies",
      "as an ai",
    ]) {
      expect(prohibited).toContain(phrase);
    }
  });

  it("instructs natural, concise, style-matched replies in every mode", () => {
    for (const mode of ["witness", "comfort", "act", "celebrate"] as const) {
      const instruction = buildConstitutionInstruction(mode);
      expect(instruction).toContain("contractions");
      expect(instruction).toMatch(/concise/i);
      expect(instruction).toMatch(/never open by restating/i);
    }
  });

  it("includes the advice-or-listen clarifier", () => {
    const instruction = buildConstitutionInstruction("witness");
    expect(instruction).toContain("Do you want advice, or do you mostly need to talk it through?");
    expect(instruction).toMatch(/at most one thoughtful question/i);
  });
});

describe("constitution — safety preserved", () => {
  it("retains crisis, diagnosis, privacy, and memory-consent rules", () => {
    const instruction = buildConstitutionInstruction("presence");
    expect(instruction).toContain("988");
    expect(instruction).toContain("Never diagnose");
    expect(instruction).toMatch(/never claim to be human/i);
    expect(instruction).toContain("Would you like me to remember that?");
  });
});

describe("response context — deterministic selection", () => {
  const base = {
    emotionalTone: "neutral",
    safetyLevel: "none",
    actionReadiness: "uncertain",
  } as const;

  it("maps purposes to contextual modes deterministically", () => {
    expect(selectResponseContext({ ...base, purpose: "celebrate" })).toBe("celebration");
    expect(selectResponseContext({ ...base, purpose: "vent" })).toBe("emotional-support");
    expect(selectResponseContext({ ...base, purpose: "seek-comfort" })).toBe("emotional-support");
    expect(selectResponseContext({ ...base, purpose: "seek-plan" })).toBe("practical-planning");
    expect(selectResponseContext({ ...base, purpose: "make-decision" })).toBe("practical-planning");
    expect(selectResponseContext({ ...base, purpose: "communicate" })).toBe("everyday");
    expect(selectResponseContext({ ...base, purpose: "unknown" })).toBe("everyday");
  });

  it("routes distress and safety concerns to the grief-distress posture", () => {
    expect(selectResponseContext({ ...base, purpose: "vent", emotionalTone: "distressed" })).toBe(
      "grief-distress",
    );
    expect(selectResponseContext({ ...base, purpose: "seek-plan", safetyLevel: "support" })).toBe(
      "grief-distress",
    );
  });

  it("selects wellness coaching and accountability from explicit signals", () => {
    expect(selectResponseContext({ ...base, purpose: "seek-plan", wellnessFocus: true })).toBe(
      "wellness-coaching",
    );
    expect(selectResponseContext({ ...base, purpose: "reflect", actionReadiness: "ready" })).toBe(
      "accountability",
    );
  });

  it("is stable: identical input, identical output", () => {
    const input = { ...base, purpose: "process" } as const;
    expect(selectResponseContext(input)).toBe(selectResponseContext(input));
  });
});

describe("prompt composition — centralized, advice never forced", () => {
  function makeInputs(overrides?: Partial<UnderstandingResult>) {
    const context: LightContext = {
      userId: "user-1",
      message: "I just need to vent about today.",
      recentTurns: [],
      companionProfile: DEFAULT_COMPANION_PREFERENCES,
      approvedMemories: [],
      privacy: { saveConversationHistory: true, allowCompanionMemory: true },
    };
    const understanding: UnderstandingResult = {
      purpose: "vent",
      supportMode: "witness",
      emotionalTone: "heavy",
      actionReadiness: "not-ready",
      confidence: 0.9,
      cues: ["explicit-vent"],
      requiresClarification: false,
      safetyLevel: "none",
      ...overrides,
    };
    const reflection: ReflectionResult = {
      primaryNeed: "to be heard",
      responseGoal: "receive without fixing",
      shouldOfferAction: false,
      shouldAskQuestion: false,
      shouldOfferPresence: true,
      shouldCelebrate: false,
      suggestedLightState: "listening",
    };
    const memory: MemoryDecision = {
      mayUseApprovedMemories: true,
      mayProposeMemory: false,
      prohibitedCategories: ["credentials", "medical-diagnoses"],
    };
    return { context, understanding, reflection, memory };
  }

  it("embeds the constitution and contextual guidance server-side", () => {
    const { context, understanding, reflection, memory } = makeInputs();
    const prompt = composePrompt(context, understanding, reflection, memory);
    expect(prompt.developerInstruction).toContain("You are Saelis");
    expect(prompt.contextualInstruction).toContain(RESPONSE_CONTEXT_GUIDANCE["emotional-support"]);
  });

  it("does not force advice for emotional disclosures", () => {
    const { context, understanding, reflection, memory } = makeInputs();
    const prompt = composePrompt(context, understanding, reflection, memory);
    expect(prompt.contextualInstruction).toContain("Do not offer steps or tasks.");
    expect(prompt.contextualInstruction).toContain("no plans unless asked");
  });
});
