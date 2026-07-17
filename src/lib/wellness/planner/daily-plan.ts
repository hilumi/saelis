/**
 * Saelis Her — central daily-plan engine (pure core).
 *
 * Order of authority, absolute and deterministic:
 *   1. Safety engine (urgent support overrides everything; holds block exercise)
 *   2. Readiness engine
 *   3. Reset / minimum-viable-day simplification
 *   4. Module assembly (movement, nutrition, hydration, recovery, postpartum)
 *
 * Postpartum fields exist ONLY when Restore is active. No guilt language,
 * ever. The persistence wrapper (service.ts) makes generation idempotent per
 * (user, date).
 */
import { assessReadiness, type ReadinessResult } from "@/lib/wellness/readiness";
import {
  assessSafety,
  type SafetyAssessment,
  type SafetyInput,
} from "@/lib/wellness/safety/engine";
import {
  selectWorkout,
  type WorkoutEngineInput,
  type WorkoutPlan,
} from "@/lib/wellness/workouts/engine";
import { READINESS_RULES } from "@/lib/wellness/rules";

import type { DailyPlanInput } from "@/lib/validation/wellness";
import type { NutritionTargetsResult } from "@/lib/wellness/nutrition/engine";
import type { PathwayKey } from "@/lib/wellness/pathways/types";

export interface DailyPlanEngineInput {
  planDate: string;
  activePathways: readonly PathwayKey[];
  safetyInput: SafetyInput;
  nutritionTargets: NutritionTargetsResult;
  programWeekId?: string | null;
  phaseNumber: number;
  workoutLibrary: Omit<
    WorkoutEngineInput,
    "safety" | "readiness" | "activePathways" | "phaseNumber" | "restoreActive"
  >;
  restoreActive: boolean;
  /** Restore stage-appropriate gentle movement slugs (already filtered). */
  restoreGentleMovementSlugs?: readonly string[];
}

export interface DailyPlanEngineResult {
  planInput: DailyPlanInput;
  safety: SafetyAssessment;
  readiness: ReadinessResult;
  workout: WorkoutPlan | null;
  nextBestAction: string;
  additionalActions: string[];
  explanation: string[];
}

const MVD_ACTIONS = [
  "Eat one nourishing meal with a protein source.",
  "Drink a manageable amount of water.",
  "If it feels safe, five to fifteen minutes of gentle movement or rest — either counts.",
] as const;

export function computeDailyPlan(input: DailyPlanEngineInput): DailyPlanEngineResult {
  // 1. Safety first — always.
  const safety = assessSafety(input.safetyInput);
  const readiness = assessReadiness({
    ...(input.safetyInput.checkIn ?? {}),
    readiness: (input.safetyInput.checkIn?.readiness ?? null) as
      ReadinessResult["readinessCategory"] | null,
    recentWorkoutCount: input.safetyInput.recentWorkoutCount,
    safety,
  });

  const resetActive = input.activePathways.includes("reset");
  const minimumViableDay =
    readiness.readinessCategory === "overwhelmed" ||
    (resetActive && readiness.adaptationLevel !== "standard") ||
    (resetActive && input.activePathways.length === 1);

  const explanation: string[] = [];
  const targets = input.nutritionTargets;

  // 2. Movement module (blocked entirely under urgent/hold).
  let workout: WorkoutPlan | null = null;
  if (safety.allowExercise && readiness.adaptationLevel !== "safety_hold") {
    workout = selectWorkout({
      ...input.workoutLibrary,
      activePathways: input.activePathways,
      safety,
      readiness,
      phaseNumber: input.phaseNumber,
      restoreActive: input.restoreActive,
      quickSelection: minimumViableDay
        ? "overwhelmed"
        : (input.workoutLibrary.quickSelection ?? null),
    });
    explanation.push(
      workout
        ? `Movement chosen for how today actually feels (${readiness.readinessCategory}).`
        : "No structured workout today — gentle movement or rest is the plan.",
    );
  } else {
    explanation.push("Structured exercise is paused by the safety check — care comes first.");
  }

  const restDay = workout === null;
  const movementPlan = {
    focus: restDay
      ? safety.allowExercise
        ? "Gentle movement or rest — both count fully."
        : null
      : workout!.title,
    workoutTemplateSlug: workout?.templateSlug ?? null,
    approximateMinutes:
      workout?.durationMinutes ??
      (safety.allowExercise ? READINESS_RULES.minimumViableMovementMinutesHigh : 0),
    exercises: (workout?.exercises ?? []).map((exercise) => ({
      exerciseSlug: exercise.name
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-|-$/g, ""),
      displayName: exercise.name,
      sequenceNumber: exercise.order,
      sets: exercise.sets,
      reps:
        exercise.repsLow != null
          ? exercise.repsHigh != null && exercise.repsHigh !== exercise.repsLow
            ? `${exercise.repsLow}-${exercise.repsHigh}`
            : `${exercise.repsLow}`
          : null,
      durationSeconds: exercise.durationSeconds,
      restSeconds: exercise.restSeconds,
      intensityGuidance: exercise.intensityGuidance,
      modificationNotes: exercise.modificationNotes,
    })),
    restDay,
    notes: workout?.intensityGuidance ?? null,
  };

  // 3. Nutrition / hydration modules (always safe modules).
  const nutritionPlan = {
    targets: {
      calorieTarget: targets.estimatedCalorieTarget,
      calorieRangeLow: targets.calorieRangeLow,
      calorieRangeHigh: targets.calorieRangeHigh,
      proteinTargetGrams: minimumViableDay
        ? targets.gradualStartProteinGrams
        : targets.proteinTargetHighGrams,
      fiberTargetGrams: targets.fiberTargetGrams,
      estimateNotice: true as const,
    },
    mealTemplateSlugs: [],
    focus: minimumViableDay
      ? "One nourishing meal with protein is today's whole nutrition goal."
      : targets.mode === "habit_based" || targets.mode === "portion_guidance"
        ? "Protein at each meal, plants where easy, water nearby."
        : "Land inside your estimated range without weighing every choice.",
    notes: null,
  };

  const hydrationPlan = {
    targetOunces: minimumViableDay
      ? Math.min(targets.hydrationTargetOunces, 48)
      : targets.hydrationTargetOunces,
    notes: minimumViableDay ? "Any amount counts today." : null,
  };

  const recoveryPlan = {
    activities:
      readiness.recoveryPriority === "high"
        ? ["easy breathing", "short walk if welcome", "early night if possible"]
        : ["gentle stretching", "unhurried evening"],
    sleepFocus:
      readiness.recoveryPriority === "high" ? "Protect tonight's sleep where you can." : null,
    notes: null,
  };

  // 4. Postpartum module — Restore ONLY.
  const postpartumPlan = input.restoreActive
    ? {
        stageAppropriateFocus:
          safety.safetyTier === "normal" || safety.safetyTier === "modify"
            ? "Breath first, then gentle reconnection — progress is symptom-led, never calendar-led."
            : "Rest and recovery are the work right now.",
        breathworkMinutes: 5,
        gentleMovementSlugs: safety.allowExercise
          ? [...(input.restoreGentleMovementSlugs ?? ["360-breathing", "short-recovery-walk"])]
          : [],
        providerGuidanceNote: safety.professionalReferralSuggested
          ? "What you reported is worth discussing with your provider or a pelvic-health professional."
          : null,
        notes: null,
      }
    : null;

  // 5. Adaptation + messaging.
  const adaptationLevel = readiness.adaptationLevel;
  const adaptationReason =
    safety.reasonCodes[0] === "no_concerns"
      ? (readiness.explanationCodes[0] ?? null)
      : safety.reasonCodes.join(",").slice(0, 500);

  const nextBestAction = safety.urgent
    ? "Reach the support in the message above — that is the only item today."
    : minimumViableDay
      ? MVD_ACTIONS[0]
      : restDay
        ? "A short gentle walk or true rest — your choice, both right."
        : `Your ${workout!.durationMinutes}-minute ${workout!.title.toLowerCase()}.`;

  const additionalActions = safety.urgent
    ? []
    : minimumViableDay
      ? [MVD_ACTIONS[1], MVD_ACTIONS[2]]
      : [
          nutritionPlan.focus ?? "Protein at each meal.",
          `Water: about ${hydrationPlan.targetOunces} oz across the day (estimate, adjust freely).`,
        ].slice(0, 2);

  if (minimumViableDay) {
    explanation.push(
      "Minimum-viable day: three small acts of care. This is intention, not failure.",
    );
  }

  const planInput: DailyPlanInput = {
    planDate: input.planDate,
    programWeekId: input.programWeekId ?? null,
    activePathwayKeys: [...input.activePathways],
    readinessSnapshot: {
      readiness: readiness.readinessCategory,
      energy: input.safetyInput.checkIn?.energy ?? null,
      painLevel: input.safetyInput.checkIn?.painLevel ?? null,
      availableMinutes: input.safetyInput.checkIn?.availableMinutes ?? null,
      redFlagPresent: safety.urgent || safety.safetyTier === "hold_and_contact_professional",
    },
    planStatus: "active",
    movementPlan,
    nutritionPlan,
    hydrationPlan,
    recoveryPlan,
    postpartumPlan,
    adaptationLevel,
    adaptationReason,
    safetyMessage: safety.userMessage ? safety.userMessage.slice(0, 1000) : null,
    generatedBy: "rules_engine",
  };

  return { planInput, safety, readiness, workout, nextBestAction, additionalActions, explanation };
}
