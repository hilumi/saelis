import type { AdaptivePreference, RelationshipContext, RelationshipStage } from "@/lib/core/types";
import type { SupportMode } from "@/lib/light/types";

/**
 * Relationship context — a coarse, deterministic reading of where this
 * relationship stands. It is built from counts and approved adaptive
 * preferences only. It carries no user content, no emotional score, and no
 * "trust score"; the stage exists solely so humor and challenge remain earned
 * rather than assumed.
 */

export interface RelationshipContextInput {
  /** Total assistant turns available in the current conversation history. */
  recentTurnCount: number;
  /** Approved adaptive preferences (already filtered by policy). */
  adaptivePreferences: AdaptivePreference[];
  /** Support modes seen in recent assistant turns, newest last. */
  recentSupportModes: SupportMode[];
}

function stageFromEvidence(recentTurnCount: number, preferenceEvidence: number): RelationshipStage {
  // Conservative: familiarity requires sustained, user-visible adaptation
  // evidence, not merely a long single conversation.
  if (preferenceEvidence >= 6) return "familiar";
  if (recentTurnCount >= 4 || preferenceEvidence >= 2) return "developing";
  return "new";
}

export function deriveRelationshipContext(input: RelationshipContextInput): RelationshipContext {
  const active = input.adaptivePreferences.filter((preference) => preference.status === "active");
  const preferenceEvidence = active.reduce((sum, preference) => sum + preference.evidenceCount, 0);

  const humorPreference = active.find((preference) => preference.key === "enjoys-playful-humor");
  const challengePreference = active.find(
    (preference) => preference.key === "appreciates-direct-challenge",
  );

  const recentCorrectionCount = input.adaptivePreferences.filter(
    (preference) => preference.status === "reset" || preference.status === "paused",
  ).length;

  return {
    stage: stageFromEvidence(input.recentTurnCount, preferenceEvidence),
    userExplicitlyWelcomesHumor: humorPreference !== undefined,
    userExplicitlyWelcomesChallenge: challengePreference !== undefined,
    recentCorrectionCount,
    successfulPlayfulExchangeCount: humorPreference?.evidenceCount ?? 0,
    recentSupportModes: input.recentSupportModes.slice(-6),
  };
}
