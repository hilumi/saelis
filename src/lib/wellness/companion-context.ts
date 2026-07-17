/**
 * Saelis Her — companion context and boundaries.
 *
 * Builds the ONLY wellness information the companion may see: a compact,
 * structured summary. No raw health records, no symptom notes, no free text.
 * The deterministic engines remain authoritative — the boundaries below are
 * appended to the developer instruction, and post-validation enforcement
 * still applies to everything the model returns.
 *
 * When a safety hold is active, only the permitted safety summary is sent.
 */
import type { AdaptationLevel, GoalType, SafetyTier } from "@/lib/wellness/constants";
import type { NutritionMode } from "@/lib/wellness/nutrition/engine";
import type { PathwayKey } from "@/lib/wellness/pathways/types";

export interface HerCompanionContext {
  activePathwayKeys: PathwayKey[];
  primaryGoal: GoalType | null;
  programPhaseName: string | null;
  currentWeekNumber: number | null;
  readinessCategory: string | null;
  safetyTier: SafetyTier | "safety_hold" | "normal" | string;
  adaptationLevel: AdaptationLevel | null;
  blockedActivities: string[];
  todayPlanSummary: string | null;
  recentCompletionSummary: string | null;
  nutritionMode: NutritionMode | null;
  preferences: { tracksWeight: boolean; tracksCalories: boolean; beginnerExplanations: boolean };
  milestoneSummary: string | null;
  safetyHoldActive: boolean;
}

/** Developer-instruction block enforcing the companion's boundaries. */
export const HER_COMPANION_BOUNDARIES = [
  "SAELIS HER BOUNDARIES (deterministic engines are authoritative):",
  "You may explain the plan, encourage, offer allowed substitutions, help choose meals, help reflect, cautiously discuss trends, and help break a hard day into small steps.",
  "You must NEVER: override or soften a safety hold; diagnose anything; restore blocked exercise; suggest calorie targets below the plan's stated range or any aggressive deficit; prescribe supplements or doses; claim medical expertise; or produce postpartum exercise programming outside the rules engine.",
  "If asked to work around a safety hold, decline warmly and point to professional evaluation. Weight and calories are optional and never moral. All nutrition numbers are estimates.",
].join(" ");

/** Serialize the context for the provider prompt (compact, single line). */
export function serializeHerContext(context: HerCompanionContext): string {
  if (context.safetyHoldActive) {
    // Safety-hold mode: only the permitted safety summary — nothing else.
    return [
      "SaelisHer:",
      `pathways=${context.activePathwayKeys.join("+") || "none"}`,
      "safetyHold=active",
      `blocked=${context.blockedActivities.join("|") || "structured_exercise"}`,
      "note=Support the user without restoring blocked activities; encourage the professional follow-up the plan already recommends.",
    ].join(" ");
  }
  const parts = [
    "SaelisHer:",
    `pathways=${context.activePathwayKeys.join("+") || "none"}`,
    context.primaryGoal ? `primaryGoal=${context.primaryGoal}` : null,
    context.programPhaseName
      ? `phase=${context.programPhaseName} (week ${context.currentWeekNumber ?? "?"})`
      : null,
    context.readinessCategory ? `readiness=${context.readinessCategory}` : null,
    context.adaptationLevel ? `adaptation=${context.adaptationLevel}` : null,
    context.todayPlanSummary ? `today=${context.todayPlanSummary}` : null,
    context.recentCompletionSummary ? `recent=${context.recentCompletionSummary}` : null,
    context.nutritionMode ? `nutritionMode=${context.nutritionMode}` : null,
    `prefs=weight:${context.preferences.tracksWeight ? "on" : "off"},calories:${context.preferences.tracksCalories ? "on" : "off"}${context.preferences.beginnerExplanations ? ",beginner-friendly" : ""}`,
    context.milestoneSummary ? `milestone=${context.milestoneSummary}` : null,
  ].filter((part): part is string => part !== null);
  return parts.join(" ");
}

/**
 * Compact plan summary for the context — titles and counts only, never
 * symptom detail or free text.
 */
export function summarizePlanForCompanion(plan: {
  movementFocus: string | null;
  restDay: boolean;
  approximateMinutes: number | null;
  adaptationLevel: string;
}): string {
  if (plan.restDay) return "rest-or-gentle-movement day";
  return `${plan.movementFocus ?? "movement"} (~${plan.approximateMinutes ?? "?"} min, ${plan.adaptationLevel})`;
}
