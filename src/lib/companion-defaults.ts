import type { CompanionProfileRow } from "@/types/database";
import type { CompanionPreferences } from "@/types/companion";

/** Defaults mirror the database column defaults. */
export const DEFAULT_COMPANION_PREFERENCES: CompanionPreferences = {
  tonePreference: "balanced",
  responseLength: "moderate",
  defaultSupportPreference: "listen-first",
  humorLevel: "light",
  faithPreference: "ask",
  planningStyle: "one-step",
  encouragementStyle: "warm",
  adaptiveLearningEnabled: true,
};

/** Map a database row (or a missing one) to app-shape preferences. */
export function toCompanionPreferences(row: CompanionProfileRow | null): CompanionPreferences {
  if (!row) return DEFAULT_COMPANION_PREFERENCES;
  return {
    tonePreference: row.tone_preference,
    responseLength: row.response_length,
    defaultSupportPreference: row.default_support_preference,
    humorLevel: row.humor_level,
    faithPreference: row.faith_preference,
    planningStyle: row.planning_style,
    encouragementStyle: row.encouragement_style,
    adaptiveLearningEnabled: row.adaptive_learning_enabled,
  };
}
