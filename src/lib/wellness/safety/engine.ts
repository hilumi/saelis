/**
 * Saelis Her — deterministic safety engine.
 *
 * Pure, synchronous, authoritative. Runs BEFORE any plan or workout
 * generation; its verdict can never be overridden by an LLM, a template, or
 * user-interface convenience. It never diagnoses, never minimizes symptoms,
 * and never claims comprehensive detection — it is a floor, not a clinician.
 *
 * Crisis conventions follow src/lib/ai/safety.ts (911 / 988 in the US).
 */
import { US_CRISIS_RESOURCES } from "@/lib/ai/safety";
import { READINESS_RULES } from "@/lib/wellness/rules";

import type { MedicalClearanceStatus, PostpartumStage } from "@/lib/wellness/constants";
import type { PathwayKey } from "@/lib/wellness/pathways/types";

export const SAFETY_ENGINE_TIERS = [
  "normal",
  "modify",
  "recovery_only",
  "hold_and_contact_professional",
  "urgent_support",
] as const;
export type SafetyEngineTier = (typeof SAFETY_ENGINE_TIERS)[number];

export const SAFETY_REASON_CODES = [
  "chest_pain",
  "shortness_of_breath",
  "fainting_or_dizziness",
  "severe_headache",
  "heavy_bleeding",
  "severe_abdominal_or_pelvic_pain",
  "calf_pain_or_swelling",
  "self_harm_concern",
  "incision_complication",
  "not_medically_cleared",
  "early_postpartum_unknown_clearance",
  "incision_concern",
  "pelvic_pressure_or_heaviness",
  "leaking_during_exercise",
  "recurring_doming_or_coning",
  "pain_during_exercise",
  "persistent_pelvic_floor_symptoms",
  "significant_pain",
  "significant_fatigue",
  "poor_sleep",
  "mild_illness",
  "elevated_soreness",
  "moderate_pain",
  "overwhelmed",
  "high_recent_workload",
  "low_energy",
  "limited_time",
  "moderate_stress",
  "mild_soreness",
  "return_after_gap",
  "minor_discomfort",
  "no_concerns",
] as const;
export type SafetyReasonCode = (typeof SAFETY_REASON_CODES)[number];

export const PLAN_MODULES = [
  "movement",
  "nutrition",
  "hydration",
  "recovery",
  "education",
  "check_in",
] as const;
export type PlanModule = (typeof PLAN_MODULES)[number];

export interface SafetyCheckInInput {
  painLevel?: number | null;
  soreness?: number | null;
  energy?: number | null;
  stress?: number | null;
  sleepHours?: number | null;
  sleepQuality?: number | null;
  readiness?: string | null;
  availableMinutes?: number | null;
  illnessOrInjuryConcern?: boolean;
  chestPain?: boolean;
  dizzinessOrFainting?: boolean;
  shortnessOfBreath?: boolean;
  severeHeadache?: boolean;
  selfHarmConcern?: boolean;
}

export interface SafetyPostpartumCheckInInput {
  bleedingConcern?: boolean;
  heavyBleeding?: boolean;
  incisionConcern?: boolean;
  pelvicHeavinessOrPressure?: boolean;
  urinaryOrBowelSymptom?: boolean;
  calfPainOrSwelling?: boolean;
  severeAbdominalOrPelvicPain?: boolean;
  breastOrFeedingConcern?: boolean;
  domingOrConing?: boolean;
}

export interface SafetyPostpartumProfileInput {
  postpartumStage?: PostpartumStage | null;
  medicalClearanceStatus?: MedicalClearanceStatus | null;
  reportedRestrictions?: string | null;
  pelvicFloorSymptoms?: boolean;
  suspectedDiastasis?: boolean;
  abdominalDomingOrConing?: boolean;
  chronicPain?: boolean;
  incisionStatus?: string | null;
  fatigueConcern?: boolean;
}

export interface RecentWorkoutSymptoms {
  painDuring: boolean;
  domingOrConing: boolean;
  pelvicFloorSymptom: boolean;
}

export interface SafetyInput {
  activePathways: readonly PathwayKey[];
  checkIn?: SafetyCheckInInput | null;
  /** Present only when Restore is active. */
  postpartumProfile?: SafetyPostpartumProfileInput | null;
  /** Present only when Restore is active. */
  postpartumCheckIn?: SafetyPostpartumCheckInInput | null;
  recentWorkoutSymptoms?: readonly RecentWorkoutSymptoms[];
  /** Sessions in the last 7 days, for workload awareness. */
  recentWorkoutCount?: number;
  /** Days since the last completed workout. */
  daysSinceLastWorkout?: number | null;
  /** Intensity the user is asking for right now. */
  requestedIntensity?: "gentle" | "moderate" | "vigorous";
}

export interface SafetyAssessment {
  safetyTier: SafetyEngineTier;
  allowExercise: boolean;
  allowedIntensity: "none" | "gentle" | "moderate" | "standard";
  blockedActivities: string[];
  recommendedActions: string[];
  userMessage: string;
  urgent: boolean;
  professionalReferralSuggested: boolean;
  reasonCodes: SafetyReasonCode[];
  safePlanModules: PlanModule[];
}

const EARLY_STAGES: PostpartumStage[] = ["less_than_6_weeks", "6_to_12_weeks"];

function urgentMessage(selfHarm: boolean): string {
  if (selfHarm) {
    return (
      "Thank you for being honest — that matters more than any plan today. Saelis is not a " +
      "crisis service, and you deserve real support right now: " +
      `${US_CRISIS_RESOURCES.lifelineInstruction}, or call ${US_CRISIS_RESOURCES.emergencyNumber} ` +
      "if you are in immediate danger. A trusted person nearby can help too. Your plan will be " +
      "here whenever you return."
    );
  }
  return (
    "Some of what you reported deserves prompt medical attention — these symptoms should be " +
    "evaluated by a professional today, before any exercise. Please contact your clinician, " +
    `urgent care, or ${US_CRISIS_RESOURCES.emergencyNumber} if symptoms are severe or sudden. ` +
    "This is not a diagnosis; it is simply not something to work out through."
  );
}

/** Deterministic safety assessment. Order: urgent → hold → recovery → modify → normal. */
export function assessSafety(input: SafetyInput): SafetyAssessment {
  const reasons: SafetyReasonCode[] = [];
  const checkIn = input.checkIn ?? {};
  const pp = input.postpartumProfile ?? null;
  const ppCheckIn = input.postpartumCheckIn ?? null;
  const restoreActive = input.activePathways.includes("restore");
  const pain = checkIn.painLevel ?? null;

  // --- Tier 5: urgent support -------------------------------------------
  const selfHarm = checkIn.selfHarmConcern === true;
  if (selfHarm) reasons.push("self_harm_concern");
  if (checkIn.chestPain) reasons.push("chest_pain");
  if (checkIn.shortnessOfBreath) reasons.push("shortness_of_breath");
  if (checkIn.dizzinessOrFainting) reasons.push("fainting_or_dizziness");
  if (checkIn.severeHeadache) reasons.push("severe_headache");
  if (restoreActive && ppCheckIn?.heavyBleeding) reasons.push("heavy_bleeding");
  if (restoreActive && ppCheckIn?.severeAbdominalOrPelvicPain)
    reasons.push("severe_abdominal_or_pelvic_pain");
  if (restoreActive && ppCheckIn?.calfPainOrSwelling) reasons.push("calf_pain_or_swelling");
  if (restoreActive && pp?.incisionStatus === "concern" && ppCheckIn?.incisionConcern)
    reasons.push("incision_complication");

  if (reasons.length > 0) {
    return {
      safetyTier: "urgent_support",
      allowExercise: false,
      allowedIntensity: "none",
      blockedActivities: ["all_exercise", "workout_cards", "plan_generation"],
      recommendedActions: selfHarm
        ? ["reach_crisis_support", "contact_trusted_person"]
        : ["seek_prompt_medical_evaluation"],
      userMessage: urgentMessage(selfHarm),
      urgent: true,
      professionalReferralSuggested: true,
      reasonCodes: reasons,
      safePlanModules: selfHarm ? ["check_in"] : ["hydration", "check_in"],
    };
  }

  // --- Tier 4: hold and contact a professional ---------------------------
  const holdReasons: SafetyReasonCode[] = [];
  if (restoreActive) {
    if (pp?.medicalClearanceStatus === "not_cleared") holdReasons.push("not_medically_cleared");
    if (
      pp?.postpartumStage &&
      EARLY_STAGES.includes(pp.postpartumStage) &&
      (pp.medicalClearanceStatus === "unknown" || pp.medicalClearanceStatus == null) &&
      input.requestedIntensity !== undefined &&
      input.requestedIntensity !== "gentle"
    ) {
      holdReasons.push("early_postpartum_unknown_clearance");
    }
    if (ppCheckIn?.incisionConcern) holdReasons.push("incision_concern");
    if (ppCheckIn?.pelvicHeavinessOrPressure) holdReasons.push("pelvic_pressure_or_heaviness");
    const recent = input.recentWorkoutSymptoms ?? [];
    if (recent.filter((w) => w.pelvicFloorSymptom).length >= 2)
      holdReasons.push("leaking_during_exercise");
    if ((ppCheckIn?.domingOrConing ? 1 : 0) + recent.filter((w) => w.domingOrConing).length >= 2) {
      holdReasons.push("recurring_doming_or_coning");
    }
    if (pp?.pelvicFloorSymptoms && ppCheckIn?.urinaryOrBowelSymptom)
      holdReasons.push("persistent_pelvic_floor_symptoms");
  }
  const recentPain = (input.recentWorkoutSymptoms ?? []).filter((w) => w.painDuring).length;
  if (recentPain >= 2) holdReasons.push("pain_during_exercise");
  if (pain !== null && pain >= READINESS_RULES.significantPainThreshold)
    holdReasons.push("significant_pain");

  if (holdReasons.length > 0) {
    return {
      safetyTier: "hold_and_contact_professional",
      allowExercise: false,
      allowedIntensity: "none",
      blockedActivities: ["structured_exercise", "progression"],
      recommendedActions: [
        "contact_clinician_or_relevant_professional",
        ...(holdReasons.some((r) =>
          [
            "pelvic_pressure_or_heaviness",
            "leaking_during_exercise",
            "recurring_doming_or_coning",
            "persistent_pelvic_floor_symptoms",
          ].includes(r),
        )
          ? ["consider_pelvic_floor_physical_therapy"]
          : []),
      ],
      userMessage:
        "Your plan is on a gentle hold — not as a setback, but because what you shared deserves " +
        "a professional's eyes before structured exercise continues. Nourishment, hydration, " +
        "easy daily movement, and check-ins are all still here for you. This is not a diagnosis.",
      urgent: false,
      professionalReferralSuggested: true,
      reasonCodes: holdReasons,
      safePlanModules: ["nutrition", "hydration", "recovery", "education", "check_in"],
    };
  }

  // --- Tier 3: recovery only ---------------------------------------------
  const recoveryReasons: SafetyReasonCode[] = [];
  if (pain !== null && pain >= READINESS_RULES.moderatePainThreshold)
    recoveryReasons.push("moderate_pain");
  if (checkIn.illnessOrInjuryConcern) recoveryReasons.push("mild_illness");
  if (restoreActive && pp?.fatigueConcern && (checkIn.energy ?? 3) <= 2)
    recoveryReasons.push("significant_fatigue");
  if (
    (checkIn.sleepHours ?? 8) < READINESS_RULES.lowSleepHoursThreshold &&
    (checkIn.sleepQuality ?? 3) <= READINESS_RULES.poorSleepQualityThreshold
  ) {
    recoveryReasons.push("poor_sleep");
  }
  if ((checkIn.soreness ?? 0) >= READINESS_RULES.elevatedSorenessThreshold)
    recoveryReasons.push("elevated_soreness");
  if (checkIn.readiness === "overwhelmed" && (checkIn.energy ?? 3) <= 1)
    recoveryReasons.push("overwhelmed");
  if ((input.recentWorkoutCount ?? 0) >= 6) recoveryReasons.push("high_recent_workload");

  if (recoveryReasons.length > 0) {
    return {
      safetyTier: "recovery_only",
      allowExercise: true,
      allowedIntensity: "gentle",
      blockedActivities: ["strength_progression", "vigorous_cardio"],
      recommendedActions: ["gentle_recovery_movement", "prioritize_rest_and_nourishment"],
      userMessage:
        "Today asks for recovery, and recovery is productive. A short walk, easy stretching, or " +
        "simply resting well all count fully.",
      urgent: false,
      professionalReferralSuggested: false,
      reasonCodes: recoveryReasons,
      safePlanModules: ["movement", "nutrition", "hydration", "recovery", "education", "check_in"],
    };
  }

  // --- Tier 2: modify ------------------------------------------------------
  const modifyReasons: SafetyReasonCode[] = [];
  if ((checkIn.energy ?? 3) <= READINESS_RULES.lowEnergyThreshold) modifyReasons.push("low_energy");
  if (
    checkIn.availableMinutes != null &&
    checkIn.availableMinutes <= READINESS_RULES.shortSessionMinutes
  ) {
    modifyReasons.push("limited_time");
  }
  if ((checkIn.stress ?? 1) >= READINESS_RULES.highStressThreshold)
    modifyReasons.push("moderate_stress");
  if ((checkIn.soreness ?? 0) >= 2) modifyReasons.push("mild_soreness");
  if (
    input.daysSinceLastWorkout != null &&
    input.daysSinceLastWorkout >= 10 &&
    (input.recentWorkoutCount ?? 0) === 0
  ) {
    modifyReasons.push("return_after_gap");
  }
  if (pain !== null && pain >= 1 && pain < READINESS_RULES.moderatePainThreshold)
    modifyReasons.push("minor_discomfort");
  if (checkIn.readiness === "overwhelmed") modifyReasons.push("overwhelmed");

  if (modifyReasons.length > 0) {
    return {
      safetyTier: "modify",
      allowExercise: true,
      allowedIntensity: "moderate",
      blockedActivities: [],
      recommendedActions: ["shorter_or_simpler_session", "favor_familiar_movements"],
      userMessage:
        "Today's plan bends to fit you — a lighter, simpler version still counts completely.",
      urgent: false,
      professionalReferralSuggested: false,
      reasonCodes: modifyReasons,
      safePlanModules: ["movement", "nutrition", "hydration", "recovery", "education", "check_in"],
    };
  }

  // --- Tier 1: normal ------------------------------------------------------
  return {
    safetyTier: "normal",
    allowExercise: true,
    allowedIntensity: "standard",
    blockedActivities: [],
    recommendedActions: [],
    userMessage: "",
    urgent: false,
    professionalReferralSuggested: false,
    reasonCodes: ["no_concerns"],
    safePlanModules: ["movement", "nutrition", "hydration", "recovery", "education", "check_in"],
  };
}
