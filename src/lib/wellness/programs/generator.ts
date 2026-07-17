/**
 * Saelis Her — deterministic multi-week program generator.
 *
 * Pure and synchronous: same inputs, same program. Postpartum elapsed time
 * NEVER advances anything by itself — Restore phases are symptom-led and
 * clearance-aware, and a restricted safety tier produces a recovery-focused
 * program with no structured exercise progression.
 */
import { PROGRAM_RULES, PROGRESSION_RULES } from "@/lib/wellness/rules";

import type {
  GoalType,
  MedicalClearanceStatus,
  MovementExperience,
  SafetyTier,
} from "@/lib/wellness/constants";
import type { PathwayKey } from "@/lib/wellness/pathways/types";
import type { WellnessProgramInput, WellnessProgramWeekInput } from "@/lib/validation/wellness";

export interface ProgramGeneratorInput {
  activePathways: readonly PathwayKey[];
  primaryGoal: GoalType;
  goalTypes: readonly GoalType[];
  movementExperience: MovementExperience;
  preferredWorkoutDays: number;
  preferredWorkoutMinutes: number;
  tracksCalories: boolean;
  tracksWeight: boolean;
  averageDailySteps?: number | null;
  proteinTargetGrams?: number | null;
  hydrationTargetOunces?: number | null;
  calorieTarget?: number | null;
  /** Restore only. */
  medicalClearanceStatus?: MedicalClearanceStatus | null;
  /** Restore only — any current symptom flags (pressure, doming, pain…). */
  hasActiveSymptoms?: boolean;
  startDate: string; // ISO date
}

export interface GeneratedProgram {
  program: WellnessProgramInput;
  weeks: WellnessProgramWeekInput[];
}

const SHARED_PHASES = [
  {
    name: "Foundation",
    focus: "Consistency, movement technique, baseline recovery, and achievable nutrition actions.",
  },
  {
    name: "Build",
    focus: "Gradual strength volume, cardio consistency, protein consistency, progressive habits.",
  },
  {
    name: "Progress",
    focus: "Controlled strength progression, increased capacity, variety, habit consolidation.",
  },
  {
    name: "Sustain",
    focus: "Maintenance skills, flexible scheduling, planned recovery, long-term adherence.",
  },
] as const;

const RESTORE_PHASES = [
  {
    name: "Restore A — Foundation",
    focus:
      "Clearance- and symptom-aware foundation: breathing, pressure awareness, walking tolerance, mobility, daily-function strength.",
  },
  {
    name: "Restore B — Reconnect",
    focus:
      "Foundational low-impact strength, gradually longer sessions, movement confidence, symptom monitoring.",
  },
  {
    name: "Restore C — Rebuild",
    focus:
      "Progressive full-body strength, low-impact cardio, selected core progressions, continued symptom monitoring.",
  },
  {
    name: "Restore D — Return",
    focus:
      "Gradual return to preferred activities with progressive strength and continued recovery support.",
  },
] as const;

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function determineSafetyTier(input: ProgramGeneratorInput): SafetyTier {
  const restore = input.activePathways.includes("restore");
  if (restore && input.medicalClearanceStatus !== "cleared") return "restricted";
  if (restore) return "postpartum";
  if (input.activePathways.includes("reset") && input.activePathways.length === 1) return "gentle";
  return "standard";
}

/** Deterministic session targets for one week. */
function weekTargets(input: ProgramGeneratorInput, phaseIndex: number, tier: SafetyTier) {
  const days = Math.max(
    0,
    Math.min(7, input.preferredWorkoutDays || PROGRAM_RULES.defaultTrainingDays),
  );
  const resetOnly = input.activePathways.includes("reset") && input.activePathways.length === 1;
  const strengthEmphasis = input.activePathways.includes("strong") ? 1 : 0;

  if (tier === "restricted") {
    // Education, hydration, nourishment, check-ins, gentle recovery only.
    return { strength: 0, cardio: 0, mobility: Math.min(2, days), recovery: Math.min(3, days + 1) };
  }
  if (resetOnly || tier === "gentle") {
    return { strength: 0, cardio: Math.min(1, days), mobility: 1, recovery: 2 };
  }
  if (tier === "postpartum") {
    // Symptom-led; volume grows only via phase, never via elapsed time.
    const strength =
      phaseIndex >= 1 ? Math.min(2 + (phaseIndex >= 2 ? 1 : 0), days) : Math.min(1, days);
    return {
      strength,
      cardio: Math.min(phaseIndex >= 2 ? 2 : 1, Math.max(0, days - strength)),
      mobility: 1,
      recovery: 2,
    };
  }
  const strengthBase = Math.min(2 + strengthEmphasis + (phaseIndex >= 1 ? 1 : 0), days);
  const cardio = input.activePathways.includes("phoenix")
    ? Math.min(2, Math.max(0, days - strengthBase))
    : Math.min(1, Math.max(0, days - strengthBase));
  return { strength: strengthBase, cardio, mobility: 1, recovery: 1 };
}

export function generateProgram(input: ProgramGeneratorInput): GeneratedProgram {
  const tier = determineSafetyTier(input);
  const restore = input.activePathways.includes("restore");
  const phases = restore ? RESTORE_PHASES : SHARED_PHASES;
  const totalWeeks = PROGRAM_RULES.defaultTotalWeeks;
  const weeksPerPhase = PROGRAM_RULES.weeksPerPhase;

  const nutritionStrategy = input.activePathways.includes("nourish")
    ? input.tracksCalories
      ? "estimated_calorie_range"
      : "habit_based"
    : input.tracksCalories
      ? "estimated_calorie_range"
      : "habit_based";

  const weeks: WellnessProgramWeekInput[] = [];
  for (let week = 1; week <= totalWeeks; week += 1) {
    const phaseIndex = Math.min(phases.length - 1, Math.floor((week - 1) / weeksPerPhase));
    const phase = phases[phaseIndex]!;
    const deload = week % PROGRESSION_RULES.deloadEveryNthWeek === 0;
    const targets = weekTargets(input, phaseIndex, tier);
    const deloadFactor = deload ? 0.6 : 1;
    const stepBase = Math.min(
      PROGRAM_RULES.maximumStepTarget,
      Math.max(
        PROGRAM_RULES.baselineStepTarget,
        input.averageDailySteps ?? PROGRAM_RULES.baselineStepTarget,
      ),
    );

    weeks.push({
      weekNumber: week,
      phaseNumber: phaseIndex + 1,
      phaseName: phase.name,
      weeklyFocus: deload
        ? `${phase.focus} This is a planned lighter week — recovery is part of the program.`
        : phase.focus,
      activePathwayKeys: [...input.activePathways],
      strengthSessionsTarget: Math.round(targets.strength * deloadFactor),
      cardioSessionsTarget: Math.round(targets.cardio * deloadFactor),
      mobilitySessionsTarget: targets.mobility,
      recoverySessionsTarget: targets.recovery,
      stepTarget: tier === "restricted" ? null : stepBase,
      proteinTargetGrams: input.proteinTargetGrams ?? null,
      hydrationTargetOunces: input.hydrationTargetOunces ?? null,
      calorieTarget: input.tracksCalories ? (input.calorieTarget ?? null) : null,
      calorieRangeLow: null,
      calorieRangeHigh: null,
      deloadWeek: deload,
      notes: null,
    });
  }

  const program: WellnessProgramInput = {
    status: "active",
    version: 1,
    startDate: input.startDate,
    endDate: addDays(input.startDate, totalWeeks * 7 - 1),
    totalWeeks,
    primaryGoal: input.primaryGoal,
    weeklyTrainingDays: Math.min(7, Math.max(0, input.preferredWorkoutDays)),
    nutritionStrategy,
    safetyTier: tier,
    activePathwayKeys: [...input.activePathways],
    rationale:
      tier === "restricted"
        ? "Structured exercise is on hold until clearance is reported — this program focuses on education, nourishment, hydration, check-ins, and gentle recovery. Progression is symptom-led, never time-led."
        : restore
          ? "Restore progression is symptom-led and clearance-aware; postpartum timing alone never advances a phase."
          : `Built from your goals (${input.primaryGoal}), ${input.preferredWorkoutDays} preferred training days, and ${input.preferredWorkoutMinutes}-minute sessions. Progression is gradual — one variable at a time, with planned lighter weeks.`,
  };

  return { program, weeks };
}

// ---------------------------------------------------------------------------
// Progression eligibility — completion + symptoms + exertion + recovery,
// never elapsed time. A safety hold always blocks progression.
// ---------------------------------------------------------------------------
export interface ProgressionInput {
  plannedSessions: number;
  completedSessions: number;
  recentSymptomFlags: number;
  /** Highest reported exertion (1–10) across the week's sessions. */
  maxReportedExertion?: number | null;
  /** Average recovery feel (1–5, higher is better), if reported. */
  recoveryQuality?: number | null;
  safetyHold: boolean;
}

export function isProgressionEligible(input: ProgressionInput): boolean {
  if (input.safetyHold) return false;
  if (input.recentSymptomFlags > 0) return false;
  if (input.plannedSessions <= 0) return false;
  const completionRate = input.completedSessions / input.plannedSessions;
  if (completionRate < PROGRESSION_RULES.minimumCompletionRate) return false;
  if (
    input.maxReportedExertion != null &&
    input.maxReportedExertion > PROGRESSION_RULES.maximumTolerableExertion
  ) {
    return false;
  }
  if (input.recoveryQuality != null && input.recoveryQuality <= 2) return false;
  return true;
}
