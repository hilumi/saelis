import {
  PATTERN_THEMES,
  RELATIONAL_CONFIDENCE,
  type PatternHypothesis,
  type PatternTheme,
} from "@/lib/core/types";

/**
 * Pattern hypotheses — tentative, inspectable, rejectable, expirable.
 *
 * A hypothesis is never a conclusion about who the user is. It is a noticing
 * with evidence attached, phrased with uncertainty, and it matures only
 * through repeated evidence across different domains and time periods. One
 * conversation can NEVER produce a reviewable insight.
 *
 * Hard bans (deterministic, tested): causal claims, diagnoses, attachment
 * labels, protected-trait inference, identity-defining statements.
 */

export const PROHIBITED_HYPOTHESIS_PATTERNS: RegExp[] = [
  /\byou (are|'re) (a|an) (people[- ]pleaser|narcissist|codependent|perfectionist)\b/i,
  /\b(because of|caused by|stems from|rooted in) (your )?(childhood|trauma|your (mother|father|parents))\b/i,
  /\byour (mother|father|parents?) (caused|created|made) (this|you)\b/i,
  /\b(anxious|avoidant|disorganized|insecure) attachment( style)?\b/i,
  /\byou have (depression|anxiety|adhd|ocd|ptsd|bpd|abandonment issues|attachment issues)\b/i,
  /\b(diagnos(is|e|ed)|disorder|syndrome|patholog)/i,
  /\bthis is (definitely|clearly|certainly) (why|because)\b/i,
  /\byou always\b/i,
  /\byou never\b/i,
  // Protected-trait inference language.
  /\b(because|given) (you('re| are)|your) (black|white|asian|latin|gay|lesbian|trans|christian|muslim|jewish|religious|conservative|liberal|poor|rich|disabled)\b/i,
];

const UNCERTAINTY_MARKERS =
  /\b(may|might|perhaps|sometimes|i('ve| have) noticed|it seems|i don'?t know|not sure|could be|several explanations|one possibility)\b/i;

export function isProhibitedHypothesisWording(text: string): boolean {
  return PROHIBITED_HYPOTHESIS_PATTERNS.some((pattern) => pattern.test(text));
}

export function hasUncertaintyLanguage(text: string): boolean {
  return UNCERTAINTY_MARKERS.test(text);
}

export function isKnownTheme(theme: string): theme is PatternTheme {
  return (PATTERN_THEMES as readonly string[]).includes(theme);
}

export interface HypothesisScreeningInput {
  theme: string;
  observation: string;
  uncertaintyStatement: string;
  /** Themes the user opted out of. */
  optedOutThemes: string[];
  safetyLevel: "none" | "support" | "urgent";
  adaptationEnabled: boolean;
}

export type HypothesisScreeningResult =
  { accepted: true; theme: PatternTheme } | { accepted: false; reason: string };

/**
 * Deterministic screening of a provider-suggested insight candidate. Provider
 * output NEVER persists directly — it must pass every gate here first, and
 * even then it only becomes a low-confidence WORKING hypothesis.
 */
export function screenHypothesisCandidate(
  input: HypothesisScreeningInput,
): HypothesisScreeningResult {
  if (!input.adaptationEnabled) return { accepted: false, reason: "adaptation-disabled" };
  if (input.safetyLevel !== "none") return { accepted: false, reason: "safety-active" };
  if (!isKnownTheme(input.theme)) return { accepted: false, reason: "unknown-theme" };
  if (input.optedOutThemes.includes(input.theme)) {
    return { accepted: false, reason: "theme-opted-out" };
  }
  if (input.observation.trim().length === 0 || input.observation.length > 500) {
    return { accepted: false, reason: "observation-size" };
  }
  if (input.uncertaintyStatement.trim().length === 0 || input.uncertaintyStatement.length > 300) {
    return { accepted: false, reason: "uncertainty-size" };
  }
  if (
    isProhibitedHypothesisWording(input.observation) ||
    isProhibitedHypothesisWording(input.uncertaintyStatement)
  ) {
    return { accepted: false, reason: "prohibited-wording" };
  }
  if (
    !hasUncertaintyLanguage(input.observation) &&
    !hasUncertaintyLanguage(input.uncertaintyStatement)
  ) {
    return { accepted: false, reason: "missing-uncertainty" };
  }
  return { accepted: true, theme: input.theme };
}

// ---------------------------------------------------------------------------
// Maturity
// ---------------------------------------------------------------------------

function distinctDays(timestamps: string[]): number {
  return new Set(timestamps.map((timestamp) => timestamp.slice(0, 10))).size;
}

/**
 * Whether a working hypothesis has matured enough to become reviewable —
 * i.e. eligible for "Things you may not have noticed". Requires repeated
 * evidence, cross-domain evidence, evidence across distinct days, and
 * sufficient confidence. Never satisfiable by a single conversation.
 */
export function isEligibleForReview(hypothesis: PatternHypothesis): boolean {
  if (hypothesis.status !== "working" && hypothesis.status !== "reviewable") return false;
  if (hypothesis.evidenceCount < RELATIONAL_CONFIDENCE.patternMinimumEvidence) return false;
  if (hypothesis.crossDomainCount < RELATIONAL_CONFIDENCE.patternMinimumCrossDomain) return false;
  if (hypothesis.confidence < RELATIONAL_CONFIDENCE.patternMinimumConfidence) return false;
  const days = distinctDays(hypothesis.evidence.map((reference) => reference.occurredAt));
  if (days < RELATIONAL_CONFIDENCE.patternMinimumDistinctDays) return false;
  if (isProhibitedHypothesisWording(hypothesis.observation)) return false;
  if (!hasUncertaintyLanguage(hypothesis.uncertaintyStatement)) return false;
  return true;
}

/** Which stored hypotheses may be shown on /insights. */
export function selectReviewableHypotheses(hypotheses: PatternHypothesis[]): PatternHypothesis[] {
  return hypotheses.filter(
    (hypothesis) =>
      (hypothesis.status === "reviewable" || hypothesis.status === "working") &&
      isEligibleForReview(hypothesis),
  );
}

/**
 * Which hypotheses may accompany a provider request — only ones the user is
 * actively exploring (accepted), never rejected or expired ones, and at most
 * one to keep the context budget controlled.
 */
export function selectHypothesesForPrompt(
  hypotheses: PatternHypothesis[],
  userIsExploringPatterns: boolean,
): PatternHypothesis[] {
  if (!userIsExploringPatterns) return [];
  return hypotheses
    .filter((hypothesis) => hypothesis.status === "accepted")
    .filter((hypothesis) => !isProhibitedHypothesisWording(hypothesis.observation))
    .slice(0, 1);
}

/** Expire a hypothesis when unsupported for too long (90 days). */
export function shouldExpire(hypothesis: PatternHypothesis, now: Date = new Date()): boolean {
  if (hypothesis.status === "rejected" || hypothesis.status === "expired") return false;
  const elapsed = now.getTime() - new Date(hypothesis.lastObservedAt).getTime();
  return Number.isFinite(elapsed) && elapsed > 90 * 24 * 60 * 60 * 1000;
}
