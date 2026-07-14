import { describe, expect, it } from "vitest";

import { createLightPlan, LightContextError } from "@/lib/light";
import { makeLightContext } from "@/test/light-fixtures";

describe("createLightPlan", () => {
  it("builds a complete plan", () => {
    const plan = createLightPlan(makeLightContext({ message: "I just need to vent." }));
    expect(plan.understanding.supportMode).toBe("witness");
    expect(plan.reflection.suggestedLightState).toBe("listening");
    expect(plan.memory.mayUseApprovedMemories).toBe(true);
    expect(plan.developerInstruction).toContain("You are Saelis");
    expect(plan.contextualInstruction).toContain("Mode: witness");
    expect(plan.closingPolicy.context).toBe("no-closing");
  });

  it("rejects an empty message", () => {
    expect(() => createLightPlan(makeLightContext({ message: "  " }))).toThrow(LightContextError);
  });

  it("never requests hidden reasoning from the provider", () => {
    const plan = createLightPlan(makeLightContext({ message: "Help me decide what to do next." }));
    const combined = `${plan.developerInstruction}\n${plan.contextualInstruction}`.toLowerCase();
    // The instructions PROHIBIT hidden reasoning; they never request it.
    expect(combined).toContain("do not include chain-of-thought");
    expect(combined).not.toContain("think step by step and show");
    expect(combined).toContain("no explanation of your reasoning process");
  });

  it("shapes instructions from the companion profile", () => {
    const plan = createLightPlan(
      makeLightContext({
        message: "hello",
        companionProfile: {
          tonePreference: "gentle",
          responseLength: "brief",
          defaultSupportPreference: "listen-first",
          humorLevel: "none",
          faithPreference: "never",
          planningStyle: "no-plans",
          encouragementStyle: "quiet",
          adaptiveLearningEnabled: true,
        },
      }),
    );
    expect(plan.developerInstruction).toContain("tone=gentle");
    expect(plan.developerInstruction).toContain("length=brief");
    expect(plan.developerInstruction).toContain("planning=no-plans");
  });

  it("keeps faith out unless invited", () => {
    const plan = createLightPlan(makeLightContext({ message: "Today was awful." }));
    expect(plan.developerInstruction).toContain("Do not bring faith into this response");
  });

  it("welcomes faith when explicitly invited", () => {
    const plan = createLightPlan(makeLightContext({ message: "Would you pray with me?" }));
    expect(plan.developerInstruction).toContain("Faith reflection is welcome here");
    expect(plan.developerInstruction).toContain("never imply shared belief");
  });

  it("welcomes faith when the profile preference is welcome", () => {
    const plan = createLightPlan(
      makeLightContext({
        message: "Today was awful.",
        companionProfile: {
          tonePreference: "balanced",
          responseLength: "moderate",
          defaultSupportPreference: "listen-first",
          humorLevel: "light",
          faithPreference: "welcome",
          planningStyle: "one-step",
          encouragementStyle: "warm",
          adaptiveLearningEnabled: true,
        },
      }),
    );
    expect(plan.developerInstruction).toContain("Faith reflection is welcome here");
  });

  it("includes approved memories only when memory is enabled", () => {
    const memories = [{ category: "shared-context", content: "Sister named June" }];
    const withMemory = createLightPlan(
      makeLightContext({ message: "hello there friend", approvedMemories: memories }),
    );
    expect(withMemory.contextualInstruction).toContain("Sister named June");

    const withoutMemory = createLightPlan(
      makeLightContext({
        message: "hello there friend",
        approvedMemories: memories,
        privacy: { saveConversationHistory: true, allowCompanionMemory: false },
      }),
    );
    expect(withoutMemory.contextualInstruction).not.toContain("Sister named June");
    expect(withoutMemory.memory.mayUseApprovedMemories).toBe(false);
    expect(withoutMemory.contextualInstruction).toContain("Do not propose any memory");
  });

  it("suppresses memory proposals in an urgent exchange", () => {
    const plan = createLightPlan(
      makeLightContext({ message: "Remember that I want to die tonight." }),
    );
    expect(plan.understanding.safetyLevel).toBe("urgent");
    expect(plan.memory.mayProposeMemory).toBe(false);
    expect(plan.closingPolicy.line).toBeNull();
  });

  it("is deterministic — identical context yields an identical plan", () => {
    const context = makeLightContext({ message: "I can't decide whether to stay or leave." });
    expect(createLightPlan(context)).toEqual(createLightPlan(context));
  });
});
