import { describe, expect, it } from "vitest";

import { enforcePlanConstraints, isFaithAllowedByPlan } from "@/lib/ai/plan-enforcement";
import { createLightPlan } from "@/lib/light";
import { makeLightContext } from "@/test/light-fixtures";

import type { CompanionResponse } from "@/lib/ai/companion-contract";

function disobedientResponse(overrides: Partial<CompanionResponse> = {}): CompanionResponse {
  return {
    supportMode: "witness",
    message: "A rendered response.",
    followUp: null,
    closingLine: "An uninvited closing.",
    suggestedStep: {
      title: "Do a thing",
      description: "A step nobody asked for.",
      estimatedMinutes: 10,
    },
    proposedMemory: { category: "shared-context", content: "A fact", reason: "Because." },
    safety: { level: "none", message: null },
    ...overrides,
  };
}

describe("enforcePlanConstraints", () => {
  it("witness removes unsolicited action", () => {
    const plan = createLightPlan(makeLightContext({ message: "I just need to vent." }));
    const enforced = enforcePlanConstraints(disobedientResponse(), plan);
    expect(enforced.suggestedStep).toBeNull();
  });

  it("presence removes action", () => {
    const plan = createLightPlan(makeLightContext({ message: "Can you just stay with me?" }));
    const enforced = enforcePlanConstraints(disobedientResponse({ supportMode: "presence" }), plan);
    expect(enforced.suggestedStep).toBeNull();
  });

  it("keeps a step when action was explicitly requested", () => {
    const plan = createLightPlan(makeLightContext({ message: "Give me three steps." }));
    const enforced = enforcePlanConstraints(disobedientResponse({ supportMode: "act" }), plan);
    expect(enforced.suggestedStep).not.toBeNull();
  });

  it("memory-disabled removes the proposal", () => {
    const plan = createLightPlan(
      makeLightContext({
        message: "Please remember that my dog is named Bo.",
        privacy: { saveConversationHistory: true, allowCompanionMemory: false },
      }),
    );
    const enforced = enforcePlanConstraints(disobedientResponse(), plan);
    expect(enforced.proposedMemory).toBeNull();
  });

  it("prohibited memory categories are stripped even when proposals are allowed", () => {
    const plan = createLightPlan(
      makeLightContext({ message: "Please remember that my dog is named Bo." }),
    );
    expect(plan.memory.mayProposeMemory).toBe(true);
    const enforced = enforcePlanConstraints(
      disobedientResponse({
        proposedMemory: { category: "diagnosis", content: "A label", reason: "No." },
      }),
      plan,
    );
    expect(enforced.proposedMemory).toBeNull();
  });

  it("no-closing policy removes the closing line", () => {
    const plan = createLightPlan(makeLightContext({ message: "Today was awful." }));
    expect(plan.closingPolicy.context).toBe("no-closing");
    const enforced = enforcePlanConstraints(disobedientResponse(), plan);
    expect(enforced.closingLine).toBeNull();
  });

  it("fills the plan's closing line when the moment concluded and the model omitted one", () => {
    const turns = Array.from({ length: 6 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `turn ${i}`,
    }));
    const plan = createLightPlan(
      makeLightContext({ message: "Today was awful.", recentTurns: turns }),
    );
    const enforced = enforcePlanConstraints(disobedientResponse({ closingLine: null }), plan);
    expect(enforced.closingLine).toBe(plan.closingPolicy.line);
  });

  it("faith-disabled strips unauthorized faith reflection from optional fields", () => {
    const plan = createLightPlan(makeLightContext({ message: "Today was awful." }));
    expect(isFaithAllowedByPlan(plan)).toBe(false);
    const enforced = enforcePlanConstraints(
      disobedientResponse({
        followUp: "Would you like to pray about it?",
        closingLine: "God bless you tonight.",
      }),
      plan,
    );
    expect(enforced.followUp).toBeNull();
    expect(enforced.closingLine).toBeNull();
  });

  it("keeps faith content when explicitly invited", () => {
    const turns = Array.from({ length: 6 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `turn ${i}`,
    }));
    const plan = createLightPlan(
      makeLightContext({ message: "Would you pray with me?", recentTurns: turns }),
    );
    expect(isFaithAllowedByPlan(plan)).toBe(true);
    const enforced = enforcePlanConstraints(
      disobedientResponse({ followUp: "Would you like to pray together in your own words?" }),
      plan,
    );
    expect(enforced.followUp).toContain("pray");
  });

  it("urgent safety replaces ordinary provider output entirely", () => {
    const plan = createLightPlan(makeLightContext({ message: "I want to die." }));
    const enforced = enforcePlanConstraints(
      disobedientResponse({ message: "Here's a fun plan!" }),
      plan,
    );
    expect(enforced.safety.level).toBe("urgent");
    expect(enforced.message).toContain("988");
    expect(enforced.suggestedStep).toBeNull();
    expect(enforced.proposedMemory).toBeNull();
    expect(enforced.closingLine).toBeNull();
  });

  it("never downgrades a support-level safety reading", () => {
    const plan = createLightPlan(makeLightContext({ message: "Everything feels hopeless." }));
    expect(plan.understanding.safetyLevel).toBe("support");
    const enforced = enforcePlanConstraints(
      disobedientResponse({ safety: { level: "none", message: null } }),
      plan,
    );
    expect(enforced.safety.level).toBe("support");
  });
});
