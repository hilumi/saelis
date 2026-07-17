/**
 * Saelis Her — deterministic plan presentation.
 *
 * Derives display guidance (next best action, additional actions, adaptation
 * explanation) from a STORED validated plan, so idempotent reads and fresh
 * generations present identically. Pure; shared by the dashboard and tests.
 * Copy never shames.
 */
import { READINESS_RULES } from "@/lib/wellness/rules";

import type {
  HydrationPlan,
  MovementPlan,
  NutritionPlan,
  ReadinessSnapshot,
  RecoveryPlan,
} from "@/lib/validation/wellness";
import type { AdaptationLevel } from "@/lib/wellness/constants";

export interface StoredPlanView {
  planDate: string;
  adaptationLevel: AdaptationLevel;
  safetyMessage: string | null;
  movementPlan: MovementPlan;
  nutritionPlan: NutritionPlan;
  hydrationPlan: HydrationPlan;
  recoveryPlan: RecoveryPlan;
  readinessSnapshot: ReadinessSnapshot | null;
  resetActive: boolean;
}

export interface PlanPresentation {
  urgent: boolean;
  safetyHold: boolean;
  minimumViableDay: boolean;
  nextBestAction: string;
  additionalActions: string[];
  adaptationExplanation: string | null;
}

const MVD_ACTIONS = [
  "Eat one nourishing meal with a protein source.",
  "Drink a manageable amount of water.",
  "If it feels safe, five to fifteen minutes of gentle movement or rest — either counts.",
] as const;

export function presentStoredPlan(plan: StoredPlanView): PlanPresentation {
  const readiness = plan.readinessSnapshot?.readiness ?? null;
  const safetyHold = plan.adaptationLevel === "safety_hold";
  const urgent =
    safetyHold &&
    (plan.readinessSnapshot?.redFlagPresent ?? false) &&
    plan.safetyMessage != null &&
    plan.safetyMessage.toLowerCase().includes("prompt");
  const minimumViableDay =
    !safetyHold &&
    (readiness === "overwhelmed" || (plan.resetActive && plan.adaptationLevel !== "standard"));

  const adaptationExplanation = safetyHold
    ? readiness === "in_pain"
      ? "Your movement plan is paused while Saelis checks for symptoms that may need professional support."
      : null // the safetyMessage itself explains
    : readiness === "tired"
      ? "Your plan was shortened and simplified based on today's energy and sleep."
      : minimumViableDay
        ? "Today has been reduced to three meaningful actions."
        : plan.adaptationLevel === "recovery"
          ? "Today is a recovery day — gentle movement and rest count fully."
          : null;

  if (safetyHold) {
    return {
      urgent,
      safetyHold,
      minimumViableDay: false,
      nextBestAction: urgent
        ? "Reach the support described above — that is the only item today."
        : "Nourishment, hydration, and rest are the plan while things get checked.",
      additionalActions: urgent ? [] : ["One nourishing meal.", "Water within reach."],
      adaptationExplanation,
    };
  }

  if (minimumViableDay) {
    return {
      urgent: false,
      safetyHold: false,
      minimumViableDay: true,
      nextBestAction: MVD_ACTIONS[0],
      additionalActions: [MVD_ACTIONS[1], MVD_ACTIONS[2]],
      adaptationExplanation,
    };
  }

  const movement = plan.movementPlan;
  const nextBestAction = movement.restDay
    ? "A short gentle walk or true rest — your choice, both right."
    : `Your ${movement.approximateMinutes ?? READINESS_RULES.minimumViableMovementMinutesHigh}-minute ${(movement.focus ?? "movement").toLowerCase()}.`;

  return {
    urgent: false,
    safetyHold: false,
    minimumViableDay: false,
    nextBestAction,
    additionalActions: [
      plan.nutritionPlan.focus ?? "Protein at each meal.",
      plan.hydrationPlan.targetOunces != null
        ? `Water: about ${plan.hydrationPlan.targetOunces} oz across the day (estimate, adjust freely).`
        : "Water nearby all day.",
    ],
    adaptationExplanation,
  };
}
