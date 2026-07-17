/**
 * Saelis Her — readiness engine.
 *
 * A planning indicator, not a medical measurement: it translates today's
 * check-in and the safety assessment into plan-shaping guidance. No numeric
 * pseudo-medical score is exposed.
 */
import { READINESS_RULES } from "@/lib/wellness/rules";

import type { SafetyAssessment } from "@/lib/wellness/safety/engine";
import type { AdaptationLevel, ReadinessState } from "@/lib/wellness/constants";

export interface ReadinessInput {
  readiness?: ReadinessState | null;
  energy?: number | null;
  sleepHours?: number | null;
  sleepQuality?: number | null;
  mood?: number | null;
  stress?: number | null;
  soreness?: number | null;
  painLevel?: number | null;
  availableMinutes?: number | null;
  /** Sessions completed in the last 7 days. */
  recentWorkoutCount?: number;
  safety: SafetyAssessment;
}

export const READINESS_EXPLANATIONS = [
  "safety_hold_applies",
  "urgent_support_applies",
  "pain_reported",
  "recovery_day_recommended",
  "energized_progression_possible",
  "steady_normal_plan",
  "tired_reduced_plan",
  "overwhelmed_minimum_viable_day",
  "short_on_time",
  "high_recent_load",
] as const;
export type ReadinessExplanation = (typeof READINESS_EXPLANATIONS)[number];

export interface ReadinessResult {
  readinessCategory: ReadinessState;
  adaptationLevel: AdaptationLevel;
  /** Multiplier applied to the planned session duration. */
  recommendedDurationMultiplier: number;
  recommendedIntensity: "none" | "gentle" | "moderate" | "standard";
  complexityPreference: "standard" | "simple" | "minimal";
  recoveryPriority: "low" | "medium" | "high";
  explanationCodes: ReadinessExplanation[];
}

function inferCategory(input: ReadinessInput): ReadinessState {
  if (input.readiness) return input.readiness;
  if ((input.painLevel ?? 0) >= READINESS_RULES.moderatePainThreshold) return "in_pain";
  const energy = input.energy ?? 3;
  const stress = input.stress ?? 3;
  if (energy >= 4 && stress <= 2) return "energized";
  if (energy <= READINESS_RULES.lowEnergyThreshold) return "tired";
  if (stress >= READINESS_RULES.highStressThreshold && energy <= 2) return "overwhelmed";
  return "okay";
}

export function assessReadiness(input: ReadinessInput): ReadinessResult {
  const category = inferCategory(input);
  const explanations: ReadinessExplanation[] = [];
  const { safety } = input;

  // Safety verdicts always dominate readiness.
  if (safety.safetyTier === "urgent_support") {
    return {
      readinessCategory: category,
      adaptationLevel: "safety_hold",
      recommendedDurationMultiplier: 0,
      recommendedIntensity: "none",
      complexityPreference: "minimal",
      recoveryPriority: "high",
      explanationCodes: ["urgent_support_applies"],
    };
  }
  if (safety.safetyTier === "hold_and_contact_professional") {
    return {
      readinessCategory: category,
      adaptationLevel: "safety_hold",
      recommendedDurationMultiplier: 0,
      recommendedIntensity: "none",
      complexityPreference: "minimal",
      recoveryPriority: "high",
      explanationCodes: ["safety_hold_applies"],
    };
  }
  if (safety.safetyTier === "recovery_only" || category === "in_pain") {
    if (category === "in_pain") explanations.push("pain_reported");
    explanations.push("recovery_day_recommended");
    return {
      readinessCategory: category,
      adaptationLevel: "recovery",
      recommendedDurationMultiplier: 0.5,
      recommendedIntensity: "gentle",
      complexityPreference: "simple",
      recoveryPriority: "high",
      explanationCodes: explanations,
    };
  }

  const shortOnTime =
    input.availableMinutes != null && input.availableMinutes <= READINESS_RULES.shortSessionMinutes;
  if (shortOnTime) explanations.push("short_on_time");
  if ((input.recentWorkoutCount ?? 0) >= 5) explanations.push("high_recent_load");

  switch (category) {
    case "energized":
      explanations.push("energized_progression_possible");
      return {
        readinessCategory: category,
        adaptationLevel: "standard",
        recommendedDurationMultiplier: shortOnTime ? 0.6 : 1,
        recommendedIntensity: safety.allowedIntensity === "moderate" ? "moderate" : "standard",
        complexityPreference: "standard",
        recoveryPriority: "low",
        explanationCodes: explanations,
      };
    case "okay":
      explanations.push("steady_normal_plan");
      return {
        readinessCategory: category,
        adaptationLevel: safety.safetyTier === "modify" ? "reduced" : "standard",
        recommendedDurationMultiplier: shortOnTime ? 0.6 : 1,
        recommendedIntensity: safety.allowedIntensity === "moderate" ? "moderate" : "standard",
        complexityPreference: "standard",
        recoveryPriority: "low",
        explanationCodes: explanations,
      };
    case "tired":
      explanations.push("tired_reduced_plan");
      return {
        readinessCategory: category,
        adaptationLevel: "reduced",
        recommendedDurationMultiplier: READINESS_RULES.tiredDurationMultiplier,
        recommendedIntensity: "gentle",
        complexityPreference: "simple",
        recoveryPriority: "medium",
        explanationCodes: explanations,
      };
    case "overwhelmed":
      explanations.push("overwhelmed_minimum_viable_day");
      return {
        readinessCategory: category,
        adaptationLevel: "reduced",
        recommendedDurationMultiplier: READINESS_RULES.overwhelmedDurationMultiplier,
        recommendedIntensity: "gentle",
        complexityPreference: "minimal",
        recoveryPriority: "high",
        explanationCodes: explanations,
      };
  }
}
