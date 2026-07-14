/**
 * Saelis safety foundation.
 *
 * IMPORTANT — PROTOTYPE PRE-CHECK, KNOWN TO BE INCOMPLETE.
 * The keyword pre-check below catches only obvious phrasing. It misses
 * euphemism, context, other languages, and negation, and it will sometimes
 * flag benign text. It is a floor, not a detector. Saelis must never claim
 * comprehensive crisis detection. Future phases should layer provider-side
 * safety classification and human-reviewed evaluation on top of this.
 */

export type SafetyLevel = "none" | "support" | "urgent";

export interface SafetyPreCheckResult {
  level: SafetyLevel;
}

/** United States crisis resources. */
export const US_CRISIS_RESOURCES = {
  emergencyNumber: "911",
  lifelineNumber: "988",
  lifelineLabel: "988 Suicide & Crisis Lifeline",
  lifelineInstruction: "Call or text 988 (United States)",
  crisisTextLine: "Text HOME to 741741 to reach the Crisis Text Line",
} as const;

/**
 * Urgent response copy. Deliberately: no shame, no diagnosis, no dependency
 * language, no continuation of normal companion banter.
 */
export const URGENT_RESPONSE_MESSAGE = [
  "What you're carrying right now sounds heavier than anything I can hold with you here.",
  "If you might be in immediate danger, please call 911 now.",
  "You can also call or text 988 to reach the 988 Suicide & Crisis Lifeline — a real person, any hour, in the United States.",
  "If someone you trust is nearby, consider letting them know what's happening. You don't have to say it perfectly.",
  "You deserve support from people equipped to give it, and reaching for it is a steady thing to do.",
].join("\n\n");

export const SUPPORT_RESPONSE_MESSAGE =
  "That sounds like a lot to carry. I'm here, and there's no rush. If it ever feels like more than you can hold, the 988 Suicide & Crisis Lifeline (call or text 988 in the United States) is there any hour.";

/**
 * Patterns that indicate the person may be in crisis. Prototype only —
 * see the module comment. Deliberately conservative and case-insensitive.
 */
const URGENT_PATTERNS: RegExp[] = [
  /\bkill(ing)? myself\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend(ing)? my (own )?life\b/i,
  /\bwant(ed)? to die\b/i,
  /\bdon'?t want to (be alive|live|wake up)\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bself[- ]?harm\b/i,
  /\bno reason to (live|go on)\b/i,
  /\bbetter off without me\b/i,
];

const SUPPORT_PATTERNS: RegExp[] = [
  /\bhopeless\b/i,
  /\bcan'?t (go on|keep going|do this anymore)\b/i,
  /\bfalling apart\b/i,
  /\bpanic attack\b/i,
  /\bnobody (cares|would notice)\b/i,
];

/**
 * Prototype safety pre-check. Returns the highest matched level.
 * INCOMPLETE by design — see module comment.
 */
export function runSafetyPreCheck(text: string): SafetyPreCheckResult {
  if (URGENT_PATTERNS.some((pattern) => pattern.test(text))) {
    return { level: "urgent" };
  }
  if (SUPPORT_PATTERNS.some((pattern) => pattern.test(text))) {
    return { level: "support" };
  }
  return { level: "none" };
}
