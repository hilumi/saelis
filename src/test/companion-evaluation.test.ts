import { describe, expect, it } from "vitest";

import { DEFAULT_COMPANION_PREFERENCES } from "@/lib/companion-defaults";
import { createLightPlan, LightContextError } from "@/lib/light";
import { COMPANION_EVALUATION_CASES } from "@/test/companion-evaluation-cases";
import { makeLightContext } from "@/test/light-fixtures";

describe("companion evaluation fixtures", () => {
  it("covers at least 30 deterministic cases", () => {
    expect(COMPANION_EVALUATION_CASES.length).toBeGreaterThanOrEqual(30);
  });

  for (const evaluation of COMPANION_EVALUATION_CASES) {
    it(evaluation.name, () => {
      const plan = createLightPlan(
        makeLightContext({
          message: evaluation.message,
          recentTurns: evaluation.recentTurns ?? [],
          companionProfile: { ...DEFAULT_COMPANION_PREFERENCES, ...evaluation.profile },
          privacy: {
            saveConversationHistory: true,
            allowCompanionMemory: true,
            ...evaluation.privacy,
          },
        }),
      );
      expect(plan.understanding.supportMode).toBe(evaluation.expected.supportMode);
      expect(plan.reflection.shouldOfferAction).toBe(evaluation.expected.allowAction);
      expect(plan.memory.mayProposeMemory).toBe(evaluation.expected.allowMemory);
      expect(plan.understanding.safetyLevel).toBe(evaluation.expected.safetyLevel);
      expect(plan.reflection.suggestedLightState).toBe(evaluation.expected.lightState);
    });
  }

  it("rejects empty input with a clear validation error", () => {
    expect(() => createLightPlan(makeLightContext({ message: "   " }))).toThrow(LightContextError);
  });
});
