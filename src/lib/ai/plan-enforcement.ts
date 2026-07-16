import { SUPPORT_RESPONSE_MESSAGE, URGENT_RESPONSE_MESSAGE } from "@/lib/ai/safety";
import { hasCoreAssessment } from "@/lib/core/pipeline";
import { screenHypothesisCandidate } from "@/lib/core/pattern-hypotheses";
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
 *
 * v0.7 additions (Saelis Core): humor stripping when not permitted, removal
 * of causal trauma claims / diagnoses / protected-trait inferences /
 * unsupported certainty about third parties, pattern-insight gating, shared-
 * language gating, and discarding provider-authored adaptation notices.
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
  reflection: null,
  adaptationNotice: null,
  insightCandidate: null,
};

// ---------------------------------------------------------------------------
// Deterministic content rules (always on, provider-independent)
// ---------------------------------------------------------------------------

/**
 * Clinical, causal, and identity claims Saelis must never make, whatever the
 * model produced. Sentence-level: a sentence matching any of these patterns is
 * removed from the message; optional fields containing one are nulled.
 */
export const PROHIBITED_CLAIM_PATTERNS: RegExp[] = [
  // Diagnoses and clinical labels.
  /\byou (have|might have|probably have|are showing signs of) (depression|anxiety|adhd|ocd|ptsd|bpd|bipolar|a disorder|abandonment issues|attachment issues)\b/i,
  /\b(anxious|avoidant|disorganized|insecure) attachment( style)?\b/i,
  /\byou('re| are) (a narcissist|codependent|a people[- ]pleaser|delusional|manic)\b/i,
  /\bthis is a (symptom|sign) of\b/i,
  // Causal trauma claims.
  /\b(because of|caused by|stems from|rooted in|explained by) (your )?(childhood|trauma|upbringing|your (mother|father|parents))\b/i,
  /\byour (mother|father|parents?|childhood) (caused|created|made|explains?) (this|you|it)\b/i,
  // Protected-trait inference.
  /\b(because|given|since) (you('re| are)|your) (black|white|asian|latino|latina|gay|lesbian|queer|trans|christian|muslim|jewish|hindu|religious|conservative|liberal|poor|wealthy|disabled)\b/i,
  // Certainty about the user's identity or another person's motives.
  /\bi know exactly why you\b/i,
  /\byou always do this\b/i,
  /\b(he|she|they|your (partner|boss|mother|father|friend)) (is|are) (definitely|certainly|clearly|obviously) (manipulating|lying|cheating|leaving|ending)\b/i,
];

const HUMOR_MARKER_PATTERN = /\b(haha+|hehe+|lol|lmao)\b/gi;
const EMOJI_ONLY_PATTERN = /\p{Extended_Pictographic}/gu;

/**
 * Shared-language candidates the system recognizes. Any of these appearing in
 * a response without user-approved history is stripped (sentence-level) — a
 * phrase becomes "ours" only through repeated, positively received use.
 */
export const SHARED_LANGUAGE_REGISTRY = [
  "co-founder",
  "we're cooking",
  "we are cooking",
  "one of those days",
  "future me",
] as const;

const FALLBACK_MESSAGE =
  "I want to stay careful and honest with you here, so I'll hold back from guessing. Tell me a little more about how this is sitting with you.";

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/).filter((part) => part.trim().length > 0);
}

function matchesAnyProhibitedClaim(text: string): boolean {
  return PROHIBITED_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

/** Remove sentences containing prohibited clinical/causal/certainty claims. */
export function stripProhibitedClaims(message: string): string {
  if (!matchesAnyProhibitedClaim(message)) return message;
  const kept = splitSentences(message).filter((sentence) => !matchesAnyProhibitedClaim(sentence));
  const result = kept.join(" ").trim();
  return result.length > 0 ? result : FALLBACK_MESSAGE;
}

/** Remove humor markers (emoji, laughter tokens) deterministically. */
export function stripHumorMarkers(text: string): string {
  const stripped = text
    .replace(EMOJI_ONLY_PATTERN, "")
    .replace(HUMOR_MARKER_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    .trim();
  return stripped.length > 0 ? stripped : text.trim();
}

/** Remove sentences using unapproved shared language from the registry. */
export function stripUnapprovedSharedLanguage(
  message: string,
  approvedPhrases: readonly string[],
): string {
  const lower = message.toLowerCase();
  const unapproved = SHARED_LANGUAGE_REGISTRY.filter(
    (phrase) => lower.includes(phrase) && !approvedPhrases.includes(phrase),
  );
  if (unapproved.length === 0) return message;
  const kept = splitSentences(message).filter(
    (sentence) => !unapproved.some((phrase) => sentence.toLowerCase().includes(phrase)),
  );
  const result = kept.join(" ").trim();
  return result.length > 0 ? result : FALLBACK_MESSAGE;
}

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

  // -------------------------------------------------------------------------
  // 7. Saelis Core deterministic content rules (v0.7).
  // -------------------------------------------------------------------------

  // 7a. Prohibited claims are stripped ALWAYS — with or without a Core
  //     assessment. Diagnoses, causal trauma claims, protected-trait
  //     inferences, and unsupported certainty never reach the user.
  enforced.message = stripProhibitedClaims(enforced.message);
  if (enforced.followUp && matchesAnyProhibitedClaim(enforced.followUp)) {
    enforced.followUp = null;
  }
  if (enforced.closingLine && matchesAnyProhibitedClaim(enforced.closingLine)) {
    enforced.closingLine = null;
  }
  if (enforced.reflection) {
    const lists = [
      ...enforced.reflection.facts,
      ...enforced.reflection.interpretations,
      ...enforced.reflection.unknowns,
      ...enforced.reflection.alternativePerspectives,
    ];
    if (lists.some((entry) => matchesAnyProhibitedClaim(entry))) {
      enforced.reflection = null;
    }
  }

  // 7b. Provider-authored adaptation notices are ALWAYS discarded. Only the
  //     deterministic server policy may claim an adaptation happened.
  enforced.adaptationNotice = null;

  const core = hasCoreAssessment(plan) ? plan.core : undefined;

  if (core) {
    // 7c. Humor stripping when the room does not permit it (covers sarcasm
    //     under high vulnerability — humor is never permitted there).
    if (!core.guidance.humorPermitted) {
      enforced.message = stripHumorMarkers(enforced.message);
      if (enforced.followUp) enforced.followUp = stripHumorMarkers(enforced.followUp);
      if (enforced.closingLine) enforced.closingLine = stripHumorMarkers(enforced.closingLine);
    }

    // 7d. Shared language must be earned: strip registry phrases without
    //     approved history.
    enforced.message = stripUnapprovedSharedLanguage(
      enforced.message,
      core.guidance.approvedSharedPhrases,
    );

    // 7e. Reflection blocks appear only when the plan asked for
    //     facts-versus-interpretation separation.
    if (enforced.reflection && !core.guidance.separateFactsFromInterpretations) {
      enforced.reflection = null;
    }

    // 7f. Insight candidates pass the deterministic screen or disappear.
    if (enforced.insightCandidate) {
      const screening = screenHypothesisCandidate({
        theme: enforced.insightCandidate.theme,
        observation: enforced.insightCandidate.observation,
        uncertaintyStatement: enforced.insightCandidate.uncertaintyStatement,
        optedOutThemes: [],
        safetyLevel: plan.understanding.safetyLevel,
        adaptationEnabled: core.adaptationEnabled,
      });
      if (!screening.accepted || !core.guidance.patternObservationEligible) {
        enforced.insightCandidate = null;
      }
    }
  } else {
    // Without a Core assessment (legacy callers), the conservative default
    // is to withhold all Core-era optional content.
    enforced.reflection = null;
    enforced.insightCandidate = null;
  }

  return enforced;
}
