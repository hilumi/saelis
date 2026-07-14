import { createClosingPolicy } from "@/lib/light/closing";
import { normalizeLightContext } from "@/lib/light/context";
import { evaluateMemoryPolicy } from "@/lib/light/memory-policy";
import { composePrompt } from "@/lib/light/prompt-composer";
import { createReflection } from "@/lib/light/reflection";
import { createUnderstanding } from "@/lib/light/understanding";

import type { LightContext, LightPlan } from "@/lib/light/types";

/**
 * The Light Engine pipeline.
 *
 * User message → safety pre-check → context normalization → understanding →
 * support-mode reflection → memory policy → prompt composition → closing
 * policy → LightPlan.
 *
 * The pipeline NEVER calls a provider and never touches the database. It
 * prepares the provider request; the application layer owns I/O. Synchronous
 * by design — every stage is deterministic.
 */
export function createLightPlan(rawContext: LightContext): LightPlan {
  // 1. Normalize (also enforces privacy on supplied memories).
  const context = normalizeLightContext(rawContext);

  // 2–3. Safety pre-check + deterministic understanding.
  const understanding = createUnderstanding(context);

  // 4. Response strategy.
  const reflection = createReflection(understanding);

  // 5. Consent-aware memory decision.
  const memory = evaluateMemoryPolicy({
    privacy: context.privacy,
    understanding,
    message: context.message,
    approvedMemories: context.approvedMemories,
  });

  // 6–7. Constitutional + contextual provider instructions.
  const prompt = composePrompt(context, understanding, reflection, memory);

  // 8. Closing-line policy.
  const closingPolicy = createClosingPolicy(understanding, context);

  return {
    understanding,
    reflection,
    memory,
    developerInstruction: prompt.developerInstruction,
    contextualInstruction: prompt.contextualInstruction,
    closingPolicy,
  };
}
