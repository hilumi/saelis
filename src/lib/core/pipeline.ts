import {
  resolveActivePreferences,
  resolveApprovedSharedPhrases,
} from "@/lib/core/adaptation-policy";
import { evaluateChallengePolicy } from "@/lib/core/challenge-policy";
import { observeCommunicationStyle } from "@/lib/core/communication-style";
import { deriveRelationshipContext } from "@/lib/core/relationship-context";
import { buildResponseGuidance } from "@/lib/core/response-guidance";
import { choosePosture } from "@/lib/core/response-posture";
import { readTheRoom } from "@/lib/core/room-reader";

import type { CoreInput, SaelisCoreAssessment } from "@/lib/core/types";
import type { LightPlan, SupportMode } from "@/lib/light/types";

/**
 * The Saelis Core pipeline.
 *
 * Authenticated request → existing validation → safety pre-check → context
 * normalization → existing Light understanding → relationship context →
 * read the room → response posture → challenge policy → linguistic guidance →
 * adaptation policy → ENRICHED LightPlan → provider → Zod validation →
 * deterministic post-validation enforcement → persistence.
 *
 * Saelis Core does not replace the Light Engine — it consumes the Light
 * Engine's deterministic understanding and enriches the LightPlan the
 * provider receives. It is synchronous, deterministic, and does no I/O.
 */

/** A LightPlan carrying the Saelis Core assessment for enforcement. */
export type EnrichedLightPlan = LightPlan & { core: SaelisCoreAssessment };

export function hasCoreAssessment(plan: LightPlan): plan is EnrichedLightPlan {
  return "core" in plan && (plan as EnrichedLightPlan).core !== undefined;
}

export function createCoreAssessment(input: CoreInput): SaelisCoreAssessment {
  const recentUserTurns = input.recentTurns
    .filter((turn) => turn.role === "user")
    .map((turn) => turn.content);
  const recentSupportModes: SupportMode[] = [];

  // 1. Adaptation policy filters what may shape this exchange at all.
  const activePreferences = resolveActivePreferences(
    input.adaptivePreferences,
    input.adaptiveLearningEnabled,
  );

  // 2. Relationship context (coarse, count-based, content-free).
  const relationship = deriveRelationshipContext({
    recentTurnCount: input.recentTurns.length,
    adaptivePreferences: input.adaptiveLearningEnabled ? input.adaptivePreferences : [],
    recentSupportModes,
  });

  // 3. Communication style — form only.
  const style = observeCommunicationStyle(input.message, recentUserTurns);

  // 4. Read the room. Explicit intent overrides inference.
  const room = readTheRoom({
    message: input.message,
    understanding: input.understanding,
    style,
    relationship,
    humorSetting: input.humorSetting,
  });

  // 5. Response posture.
  const posture = choosePosture(room, input.understanding, input.toneSetting);

  // 6. Constructive challenge policy.
  const challenge = evaluateChallengePolicy(room, relationship);

  // 7. Compose compact guidance.
  const approvedSharedPhrases = input.adaptiveLearningEnabled
    ? resolveApprovedSharedPhrases(activePreferences)
    : [];
  const guidance = buildResponseGuidance({
    room,
    posture,
    challenge,
    style,
    activePreferences,
    approvedSharedPhrases,
    adaptationEnabled: input.adaptiveLearningEnabled,
  });

  return {
    style,
    relationship,
    room,
    posture,
    challenge,
    guidance,
    adaptationEnabled: input.adaptiveLearningEnabled,
  };
}

/**
 * Enrich an existing LightPlan with Saelis Core guidance. The Light Engine's
 * plan is never replaced — guidance is appended to the contextual instruction
 * and the assessment travels with the plan for post-validation enforcement.
 * Urgent safety plans pass through untouched: nothing may soften a crisis
 * response.
 */
export function enrichLightPlan(
  plan: LightPlan,
  assessment: SaelisCoreAssessment,
): EnrichedLightPlan {
  if (plan.understanding.safetyLevel === "urgent") {
    return { ...plan, core: assessment };
  }
  return {
    ...plan,
    contextualInstruction: [plan.contextualInstruction, ...assessment.guidance.lines].join("\n"),
    core: assessment,
  };
}
