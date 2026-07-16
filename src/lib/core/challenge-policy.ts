import type { ChallengeDecision, RelationshipContext, RoomAssessment } from "@/lib/core/types";

/**
 * Constructive challenge policy — deterministic rules.
 *
 * Core principle: The Light does not agree merely to comfort. But challenge
 * is earned and bounded:
 *   - receive before challenging,
 *   - distinguish feelings (always valid) from factual conclusions (testable),
 *   - preserve dignity and agency,
 *   - never diagnose, never claim certainty about motives or causes.
 *
 * Rulings:
 *   "safety-mandated"      — a harmful proposed action must be named directly.
 *   "allowed"              — the user invited directness or a reality check.
 *   "humor-assisted"       — allowed AND the humor window is open.
 *   "requires-permission"  — challenge may help, but ask first
 *                            ("Can I push back a little?").
 *   "prohibited"           — grief, crisis, high vulnerability, or no basis.
 */

export function evaluateChallengePolicy(
  room: RoomAssessment,
  relationship: RelationshipContext,
): ChallengeDecision {
  const reasons: string[] = [];

  // Urgent safety: the crisis response replaces everything, including challenge.
  if (room.safetyLevel === "urgent") {
    return { ruling: "prohibited", reasons: ["urgent-safety"] };
  }

  // A harmful proposed action is the one case where challenge is mandated
  // even in a hard moment: validate the feeling, challenge the action.
  if (room.urgency === "time-sensitive") {
    return { ruling: "safety-mandated", reasons: ["harmful-action-proposed"] };
  }

  // Grief and high vulnerability prohibit ordinary challenge.
  if (room.cues.includes("grief-present")) {
    return { ruling: "prohibited", reasons: ["grief-present"] };
  }
  if (room.vulnerability === "high") {
    return { ruling: "prohibited", reasons: ["high-vulnerability"] };
  }

  // Explicit invitation: reality check or directness request.
  if (room.userGoal === "reality-check") reasons.push("reality-check-requested");
  if (room.directnessRequested) reasons.push("directness-requested");
  if (reasons.length > 0) {
    if (room.humorAppropriate && relationship.userExplicitlyWelcomesHumor) {
      return { ruling: "humor-assisted", reasons: [...reasons, "humor-window"] };
    }
    return { ruling: "allowed", reasons };
  }

  // Established preference in a low-vulnerability moment: allowed.
  if (relationship.userExplicitlyWelcomesChallenge && room.vulnerability === "low") {
    return { ruling: "allowed", reasons: ["established-challenge-preference"] };
  }

  // Otherwise a challenge may still serve the user (unsupported conclusion,
  // contradiction) — but only with permission, and only when the moment is
  // not fragile.
  if (room.vulnerability === "low" && room.challengeAppropriate) {
    return { ruling: "requires-permission", reasons: ["unsolicited-challenge"] };
  }

  return { ruling: "prohibited", reasons: ["no-invitation"] };
}

/**
 * Provider-facing guidance per ruling. Compact, deterministic, and explicit
 * about what challenge NEVER includes.
 */
export function buildChallengeGuidance(decision: ChallengeDecision): string[] {
  const never =
    "Never insult, diagnose, name attachment styles, claim childhood causes, or state another person's motives as fact. Validate feelings even when questioning conclusions. Explain your reasoning briefly and leave the decision with the user.";

  switch (decision.ruling) {
    case "safety-mandated":
      return [
        "The user is about to act in a way that may harm them or someone else. Validate the feeling behind it, then challenge the action directly and suggest a pause or revision before sending/acting.",
        never,
      ];
    case "allowed":
      return [
        "Direct, honest feedback is invited. If the evidence does not support the user's conclusion, say so plainly and kindly, and offer at least one alternative explanation.",
        never,
      ];
    case "humor-assisted":
      return [
        "Direct feedback is invited and light, affectionate humor may soften it (never at the user's worth).",
        never,
      ];
    case "requires-permission":
      return [
        'If you see an unsupported conclusion or contradiction worth naming, ask permission first (for example, "Can I push back a little?") and challenge only after receiving what was said.',
        never,
      ];
    case "prohibited":
      return ["Do not challenge, correct, or push back this turn. Receive what was said."];
  }
}
