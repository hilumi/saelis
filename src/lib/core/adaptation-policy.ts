import {
  ADAPTIVE_PREFERENCE_KEYS,
  RELATIONAL_CONFIDENCE,
  type AdaptivePreference,
  type AdaptivePreferenceKey,
} from "@/lib/core/types";

/**
 * Adaptation policy — three layers, all deterministic:
 *
 *   1. Current context   — this conversation only; nothing persists.
 *   2. Adaptive prefs    — low-risk communication preferences; visible,
 *                          editable, resettable; they weaken without support.
 *   3. Enduring understanding candidates — handled by the existing memory
 *                          proposal flow; NEVER silently promoted.
 *
 * Confidence is transparent: fixed increments for repeated/explicit evidence,
 * fixed decrements for contradiction and correction, and time decay. It can
 * only move through the functions in this file (and their database mirrors);
 * nothing provider-generated touches confidence directly.
 */

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export const CONFIDENCE_DELTAS = {
  repeatedEvidence: 0.15,
  explicitConfirmation: 0.3,
  contradiction: -0.25,
  userCorrection: -0.4,
  /** Per 30 days without supporting evidence. */
  timeDecayPer30Days: -0.1,
} as const;

export function isAllowedPreferenceKey(key: string): key is AdaptivePreferenceKey {
  return (ADAPTIVE_PREFERENCE_KEYS as readonly string[]).includes(key);
}

export function applyRepeatedEvidence(confidence: number, explicit: boolean): number {
  return clamp(
    confidence +
      (explicit ? CONFIDENCE_DELTAS.explicitConfirmation : CONFIDENCE_DELTAS.repeatedEvidence),
  );
}

export function applyContradiction(confidence: number): number {
  return clamp(confidence + CONFIDENCE_DELTAS.contradiction);
}

export function applyUserCorrection(confidence: number): number {
  return clamp(confidence + CONFIDENCE_DELTAS.userCorrection);
}

/** Time decay, computed at read time — confidence weakens without support. */
export function applyTimeDecay(
  confidence: number,
  lastObservedAt: string,
  now: Date = new Date(),
): number {
  const elapsedMs = now.getTime() - new Date(lastObservedAt).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return clamp(confidence);
  const periods = Math.floor(elapsedMs / (30 * 24 * 60 * 60 * 1000));
  return clamp(confidence + periods * CONFIDENCE_DELTAS.timeDecayPer30Days);
}

export type AdaptationTier = "none" | "temporary" | "reviewable";

/** Which adaptation tier a confidence level earns. */
export function adaptationTier(confidence: number): AdaptationTier {
  if (confidence < RELATIONAL_CONFIDENCE.low) return "none";
  if (confidence < RELATIONAL_CONFIDENCE.high) return "temporary";
  return "reviewable";
}

/**
 * Resolve which stored preferences may actually shape this exchange:
 * adaptation must be enabled, the preference active, the key allowlisted,
 * and decayed confidence above the persistent-adaptation floor.
 */
export function resolveActivePreferences(
  preferences: AdaptivePreference[],
  adaptiveLearningEnabled: boolean,
  now: Date = new Date(),
): AdaptivePreference[] {
  if (!adaptiveLearningEnabled) return [];
  return preferences.filter((preference) => {
    if (preference.status !== "active") return false;
    if (!isAllowedPreferenceKey(preference.key)) return false;
    if (preference.expiresAt && new Date(preference.expiresAt).getTime() < now.getTime()) {
      return false;
    }
    const effective = applyTimeDecay(preference.confidence, preference.lastObservedAt, now);
    return adaptationTier(effective) !== "none";
  });
}

// ---------------------------------------------------------------------------
// Deterministic explicit-preference observations
// ---------------------------------------------------------------------------

/**
 * An observation extracted from EXPLICIT user language only. In this first,
 * conservative version, no preference is ever inferred from tone, mood, or
 * anything indirect — only from the user saying it.
 */
export interface ExplicitPreferenceObservation {
  key: AdaptivePreferenceKey;
  value: Record<string, string | number | boolean>;
  /** Cue name for the content-free evidence summary. */
  cue: string;
  /** Explicit statements earn the confirmation increment. */
  explicit: true;
}

interface ObservationRule {
  pattern: RegExp;
  key: AdaptivePreferenceKey;
  cue: string;
  value?: Record<string, string | number | boolean>;
}

const OBSERVATION_RULES: ObservationRule[] = [
  {
    pattern:
      /\b(keep (it|responses?) short(er)?|be (more )?concise|too long|shorter (please|answers))\b/i,
    key: "prefers-concise-when-overwhelmed",
    cue: "explicit-concise",
  },
  {
    pattern:
      /\b(be (more )?direct|don'?t be soft|be blunt|give it to me straight|don'?t sugar ?coat|no sugar ?coating)\b/i,
    key: "appreciates-direct-challenge",
    cue: "explicit-more-direct",
  },
  {
    pattern: /\b(stop (using|with the) emojis?|no emojis?( please)?|don'?t use emojis?)\b/i,
    key: "prefers-no-emojis",
    cue: "explicit-no-emoji",
  },
  {
    pattern: /\b(give me|show me|can i (get|have)|i('d| would) like) (an |some )?examples?\b/i,
    key: "prefers-examples",
    cue: "explicit-examples",
  },
  {
    pattern: /\b(give me|show me|i want|lay out) ((the|some|a few) )?options\b/i,
    key: "prefers-options-before-recommendation",
    cue: "explicit-options",
  },
  {
    pattern: /\b(use )?bullet points?( please)?\b/i,
    key: "likes-bullet-points",
    cue: "explicit-bullets",
  },
];

const HUMOR_CORRECTION_PATTERN =
  /\b(that joke didn'?t land|not funny|don'?t joke( about this)?|stop joking|too jokey)\b/i;

/**
 * Extract explicit preference observations from a message. Deterministic;
 * returns an empty list for anything ambiguous. Never fires on any safety
 * level other than "none" (adaptation is never harvested from a hard moment).
 */
export function extractExplicitObservations(
  message: string,
  safetyLevel: "none" | "support" | "urgent",
): ExplicitPreferenceObservation[] {
  if (safetyLevel !== "none") return [];
  const observations: ExplicitPreferenceObservation[] = [];
  for (const rule of OBSERVATION_RULES) {
    if (rule.pattern.test(message)) {
      observations.push({ key: rule.key, value: rule.value ?? {}, cue: rule.cue, explicit: true });
    }
  }
  return observations;
}

/** Whether the message is an explicit correction of humor ("that joke didn't land"). */
export function isHumorCorrection(message: string): boolean {
  return HUMOR_CORRECTION_PATTERN.test(message);
}

// ---------------------------------------------------------------------------
// Shared language
// ---------------------------------------------------------------------------

const SENSITIVE_PHRASE_PATTERN =
  /\b(trauma|diagnos|therap|god|jesus|allah|church|mosque|temple|gay|lesbian|queer|trans|republican|democrat|disabled|disease|salary|debt)\b/i;

/**
 * Shared phrases may only be used when they were observed repeatedly, are not
 * sensitive, are not insults, and the user responded positively — which in
 * practice means: an ACTIVE `shared-phrase` adaptive preference whose evidence
 * cleared the reviewable threshold. This resolves the approved set.
 */
export function resolveApprovedSharedPhrases(
  preferences: AdaptivePreference[],
  now: Date = new Date(),
): string[] {
  return preferences
    .filter(
      (preference) =>
        preference.key === "shared-phrase" &&
        preference.status === "active" &&
        preference.evidenceCount >= RELATIONAL_CONFIDENCE.patternMinimumEvidence &&
        adaptationTier(applyTimeDecay(preference.confidence, preference.lastObservedAt, now)) ===
          "reviewable",
    )
    .map((preference) => String(preference.value.phrase ?? ""))
    .filter((phrase) => phrase.length > 0 && phrase.length <= 40)
    .filter((phrase) => !SENSITIVE_PHRASE_PATTERN.test(phrase));
}

/** Themes the user has asked Saelis to stop looking for. */
export function resolveOptedOutThemes(preferences: AdaptivePreference[]): string[] {
  return preferences
    .filter(
      (preference) => preference.key === "pattern-theme-opt-out" && preference.status === "active",
    )
    .map((preference) => String(preference.value.theme ?? ""))
    .filter((theme) => theme.length > 0);
}
