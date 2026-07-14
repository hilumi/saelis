import { SUPPORT_RESPONSE_MESSAGE, URGENT_RESPONSE_MESSAGE } from "@/lib/ai/safety";
import { isProhibitedMemoryCategory } from "@/lib/light/memory-policy";

import type { CompanionResponse } from "@/lib/ai/companion-contract";
import type { LightPlan } from "@/lib/light/types";

/**
 * Post-validation enforcement of LightPlan constraints.
 *
 * Structured output + Zod validation prove the SHAPE of a provider response;
 * they do not prove obedience. This deterministic layer enforces the plan even
 * when the model ignores instructions. It runs after Zod validation and before
 * anything is shown or persisted.
 */

const MAX_MEMORY_CONTENT_LENGTH = 500;
const FAITH_PATTERN = /\b(pray|prayer|praying|scripture|bless(ing|ed)?|amen|god|jesus|allah)\b/i;

const CRISIS_RESPONSE: CompanionResponse = {
  supportMode: "presence",
  message: URGENT_RESPONSE_MESSAGE,
  followUp: null,
  closingLine: null,
  suggestedStep: null,
  proposedMemory: null,
  safety: { level: "urgent", message: URGENT_RESPONSE_MESSAGE },
};

/** Faith permission is encoded in the plan's developer instruction (deterministic). */
export function isFaithAllowedByPlan(plan: LightPlan): boolean {
  return plan.developerInstruction.includes("Faith reflection is welcome here");
}

export function enforcePlanConstraints(
  response: CompanionResponse,
  plan: LightPlan,
): CompanionResponse {
  // 1. Urgent safety was decided before generation; ordinary provider output
  //    is never used for a crisis, whatever the model produced.
  if (plan.understanding.safetyLevel === "urgent") {
    return CRISIS_RESPONSE;
  }

  const enforced: CompanionResponse = { ...response };

  // 2. Actions only when the strategy permits them (covers presence and
  //    witness-without-request automatically).
  if (!plan.reflection.shouldOfferAction) {
    enforced.suggestedStep = null;
  }

  // 3. Memory proposals only when policy permits; and even then, never
  //    prohibited categories, oversized content, or empty proposals.
  if (!plan.memory.mayProposeMemory) {
    enforced.proposedMemory = null;
  } else if (enforced.proposedMemory) {
    const memory = enforced.proposedMemory;
    if (
      isProhibitedMemoryCategory(memory.category) ||
      memory.content.length > MAX_MEMORY_CONTENT_LENGTH ||
      memory.content.trim().length === 0
    ) {
      enforced.proposedMemory = null;
    }
  }

  // 4. Closing lines are earned. No-closing strips them; an allowed closing
  //    falls back to the plan's deterministic line when the model omitted one.
  if (plan.closingPolicy.context === "no-closing") {
    enforced.closingLine = null;
  } else if (!enforced.closingLine && plan.closingPolicy.line) {
    enforced.closingLine = plan.closingPolicy.line;
  }

  // 5. Faith stays opt-in. When not allowed, strip faith language from the
  //    optional fields. (The main message cannot be rewritten deterministically
  //    — a documented limitation; the instruction layer is the primary control.)
  if (!isFaithAllowedByPlan(plan)) {
    if (enforced.followUp && FAITH_PATTERN.test(enforced.followUp)) {
      enforced.followUp = null;
    }
    if (enforced.closingLine && FAITH_PATTERN.test(enforced.closingLine)) {
      enforced.closingLine = null;
    }
    if (enforced.proposedMemory && FAITH_PATTERN.test(enforced.proposedMemory.category)) {
      enforced.proposedMemory = null;
    }
  }

  // 6. The safety level may never be downgraded below the pre-check's reading.
  if (plan.understanding.safetyLevel === "support" && enforced.safety.level === "none") {
    enforced.safety = { level: "support", message: SUPPORT_RESPONSE_MESSAGE };
  }

  return enforced;
}
