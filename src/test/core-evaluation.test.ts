import { describe, expect, it } from "vitest";

import { extractExplicitObservations } from "@/lib/core/adaptation-policy";
import { createCoreAssessment } from "@/lib/core/pipeline";
import { createUnderstanding } from "@/lib/light/understanding";
import { CORE_EVALUATION_CASES } from "@/test/core-evaluation-cases";
import { makeLightContext } from "@/test/light-fixtures";

/**
 * Deterministic Saelis Core evaluation — every case pins posture, humor
 * permission, challenge ruling, adaptation observation, pattern eligibility,
 * and safety level for one realistic message. Runs entirely offline; no
 * provider is ever called.
 */
describe("Saelis Core evaluation cases", () => {
  it("has at least 50 cases", () => {
    expect(CORE_EVALUATION_CASES.length).toBeGreaterThanOrEqual(50);
  });

  for (const testCase of CORE_EVALUATION_CASES) {
    it(testCase.name, () => {
      const context = makeLightContext({ message: testCase.message });
      const understanding = createUnderstanding(context);
      const assessment = createCoreAssessment({
        message: testCase.message,
        recentTurns: [],
        understanding,
        humorSetting: testCase.humorSetting ?? "light",
        toneSetting: "balanced",
        adaptiveLearningEnabled: testCase.adaptiveLearningEnabled ?? true,
        adaptivePreferences: [],
      });

      expect(assessment.room.safetyLevel).toBe(testCase.expected.safetyLevel);
      expect(assessment.posture.primary).toBe(testCase.expected.posture);
      expect(assessment.guidance.humorPermitted).toBe(testCase.expected.humorPermitted);
      expect(assessment.challenge.ruling).toBe(testCase.expected.challengeRuling);
      expect(assessment.guidance.patternObservationEligible).toBe(
        testCase.expected.patternEligible,
      );

      const observations = extractExplicitObservations(testCase.message, understanding.safetyLevel);
      expect(observations.length > 0).toBe(testCase.expected.adaptationObserved);
    });
  }
});
