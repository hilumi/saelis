/**
 * Saelis Her — workout-selection and modification engine.
 *
 * Pure: the caller supplies the seeded libraries (templates, template
 * exercises, exercise map); the engine deterministically selects a template,
 * scales it to available time, swaps or drops exercises whose avoid_when tags
 * match reported symptoms, and attaches plain-language effort guidance and
 * stop conditions. Safety verdicts are honored absolutely: no exercise is
 * produced under a hold or urgent tier.
 */
import {
  EFFORT_GUIDANCE,
  GENERAL_STOP_CONDITIONS,
  PROGRESSION_RULES,
  RESTORE_STOP_CONDITIONS,
} from "@/lib/wellness/rules";

import type {
  ExerciseLibraryRow,
  WorkoutTemplateExerciseRow,
  WorkoutTemplateRow,
} from "@/types/wellness";
import type { PathwayKey } from "@/lib/wellness/pathways/types";
import type { ReadinessResult } from "@/lib/wellness/readiness";
import type { SafetyAssessment } from "@/lib/wellness/safety/engine";

export type QuickSelection =
  | "ten_minutes"
  | "twenty_minutes"
  | "planet_fitness"
  | "peloton"
  | "home"
  | "no_floor"
  | "tired"
  | "overwhelmed"
  | "sore"
  | "replace_today";

export interface WorkoutEngineInput {
  templates: readonly WorkoutTemplateRow[];
  templateExercises: readonly WorkoutTemplateExerciseRow[];
  exercises: readonly ExerciseLibraryRow[];
  activePathways: readonly PathwayKey[];
  safety: SafetyAssessment;
  readiness: ReadinessResult;
  phaseNumber: number;
  preferredLocation?: string | null;
  availableEquipment?: readonly string[];
  availableMinutes?: number | null;
  experience?: string;
  floorTransitionsDifficult?: boolean;
  prefersBeginnerExplanations?: boolean;
  /** Symptom flags that trigger exercise-level modification. */
  symptoms?: { domingOrConing?: boolean; pelvicFloorSymptom?: boolean; painDuring?: boolean };
  restoreActive?: boolean;
  quickSelection?: QuickSelection | null;
  /** Slug of a template to avoid (used by "replace today's workout"). */
  excludeTemplateSlug?: string | null;
}

export interface WorkoutExercisePrescription {
  exerciseId: string;
  name: string;
  order: number;
  sets: number | null;
  repsLow: number | null;
  repsHigh: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  intensityGuidance: string | null;
  coachingCues: string[];
  selectedRegression: string | null;
  selectedProgression: string | null;
  modificationNotes: string | null;
  safetyTags: string[];
}

export interface WorkoutPlan {
  templateSlug: string;
  title: string;
  workoutType: string;
  pathwayKeys: PathwayKey[];
  durationMinutes: number;
  location: string;
  equipment: string[];
  warmup: string;
  exercises: WorkoutExercisePrescription[];
  cooldown: string;
  intensityGuidance: string;
  progressionGuidance: string;
  modifications: string[];
  stopConditions: string[];
  rationale: string;
}

function parseReps(reps: string | null): { low: number | null; high: number | null } {
  if (!reps) return { low: null, high: null };
  const match = reps.match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (!match) return { low: null, high: null };
  const low = Number(match[1]);
  const high = match[2] ? Number(match[2]) : low;
  return { low, high };
}

interface QuickConstraints {
  maxMinutes?: number;
  location?: string;
  requiresTag?: string;
  requiresSafetyTag?: string;
  gentle?: boolean;
  category?: string;
}

function quickConstraints(selection: QuickSelection | null | undefined): QuickConstraints {
  switch (selection) {
    case "ten_minutes":
      return { maxMinutes: 12 };
    case "twenty_minutes":
      return { maxMinutes: 22 };
    case "planet_fitness":
      return { location: "gym" };
    case "peloton":
      return { requiresTag: "peloton" };
    case "home":
      return { location: "home" };
    case "no_floor":
      return { requiresSafetyTag: "no-floor-position" };
    case "tired":
      return { maxMinutes: 20, gentle: true };
    case "overwhelmed":
      return { maxMinutes: 15, gentle: true };
    case "sore":
      return { gentle: true, category: "recovery" };
    default:
      return {};
  }
}

/**
 * Deterministic template choice: filter by safety/phase/location/time, then
 * pick the first candidate by (phase fit, duration fit, slug) ordering.
 */
export function selectWorkout(input: WorkoutEngineInput): WorkoutPlan | null {
  const { safety, readiness } = input;
  if (!safety.allowExercise || readiness.adaptationLevel === "safety_hold") return null;

  const gentleOnly =
    safety.allowedIntensity === "gentle" || readiness.recommendedIntensity === "gentle";
  const quick = quickConstraints(input.quickSelection);
  const minutesAvailable =
    quick.maxMinutes ??
    (input.availableMinutes != null
      ? input.availableMinutes
      : Math.round(45 * readiness.recommendedDurationMultiplier) || 10);

  const exerciseById = new Map(input.exercises.map((exercise) => [exercise.id, exercise]));
  const exerciseBySlug = new Map(input.exercises.map((exercise) => [exercise.slug, exercise]));

  const candidates = input.templates
    .filter((template) => template.active)
    .filter((template) => template.slug !== (input.excludeTemplateSlug ?? ""))
    .filter((template) =>
      input.restoreActive
        ? true
        : !template.pathway_tags.includes("restore") || template.pathway_tags.length > 1,
    )
    .filter((template) =>
      // Pathway overlap (Reset templates are open to everyone in Reset mode).
      template.pathway_tags.some((tag) =>
        (input.activePathways as readonly string[]).includes(tag),
      ),
    )
    .filter((template) => template.phase_min <= input.phaseNumber)
    .filter((template) => (quick.location ? template.location === quick.location : true))
    .filter((template) =>
      input.preferredLocation && !quick.location && input.quickSelection == null
        ? template.location === input.preferredLocation || template.location === "outdoors"
        : true,
    )
    .filter((template) =>
      quick.requiresSafetyTag ? template.safety_tags.includes(quick.requiresSafetyTag) : true,
    )
    .filter((template) => (quick.requiresTag ? template.slug.includes(quick.requiresTag) : true))
    .filter((template) =>
      gentleOnly || quick.gentle ? ["gentle", "beginner"].includes(template.difficulty) : true,
    )
    .filter((template) =>
      input.floorTransitionsDifficult
        ? template.safety_tags.includes("no-floor-position") ||
          template.location === "outdoors" ||
          template.slug.includes("peloton") ||
          template.slug.includes("walking")
        : true,
    )
    .filter((template) => template.approximate_minutes <= Math.max(10, minutesAvailable + 5));

  const chosen = [...candidates].sort((a, b) => {
    // Prefer closest duration fit, then higher phase specificity, then slug.
    const durationDelta =
      Math.abs(a.approximate_minutes - minutesAvailable) -
      Math.abs(b.approximate_minutes - minutesAvailable);
    if (durationDelta !== 0) return durationDelta;
    if (a.phase_min !== b.phase_min) return b.phase_min - a.phase_min;
    return a.slug.localeCompare(b.slug);
  })[0];

  if (!chosen) return null;

  const rows = input.templateExercises
    .filter((row) => row.template_id === chosen.id)
    .sort((a, b) => a.sequence_number - b.sequence_number);

  const modifications: string[] = [];
  const timeFactor = Math.min(1, minutesAvailable / chosen.approximate_minutes);
  const keepCount = Math.max(2, Math.round(rows.length * timeFactor));
  if (keepCount < rows.length) {
    modifications.push(
      `Shortened to fit ${minutesAvailable} minutes — the later movements wait for another day.`,
    );
  }

  const symptoms = input.symptoms ?? {};
  const exercises: WorkoutExercisePrescription[] = [];
  let order = 1;
  for (const row of rows.slice(0, keepCount)) {
    const exercise = exerciseById.get(row.exercise_id);
    if (!exercise) continue;

    // Symptom-based eligibility: swap to regression or drop entirely.
    let selected = exercise;
    let modificationNote = row.modification_notes;
    const triggered =
      (symptoms.domingOrConing && exercise.avoid_when.includes("doming_or_coning")) ||
      (symptoms.pelvicFloorSymptom && exercise.avoid_when.includes("pelvic_symptoms")) ||
      (symptoms.painDuring && exercise.avoid_when.includes("acute_pain"));
    if (triggered) {
      const regression = exercise.regression_slug
        ? exerciseBySlug.get(exercise.regression_slug)
        : null;
      if (regression) {
        selected = regression;
        modificationNote = `Swapped from ${exercise.name} in response to what you reported — the gentler version is the right version today.`;
        modifications.push(`${exercise.name} → ${regression.name} (symptom-aware substitution).`);
      } else {
        modifications.push(`${exercise.name} skipped today in response to what you reported.`);
        continue;
      }
    }

    const reps = parseReps(row.reps);
    exercises.push({
      exerciseId: selected.id,
      name: selected.name,
      order: order,
      sets: gentleOnly && row.sets ? Math.max(1, row.sets - 1) : row.sets,
      repsLow: reps.low,
      repsHigh: reps.high,
      durationSeconds: row.duration_seconds,
      restSeconds: row.rest_seconds,
      intensityGuidance: row.intensity_guidance,
      coachingCues: input.prefersBeginnerExplanations
        ? [selected.instructions, ...selected.coaching_cues]
        : [...selected.coaching_cues],
      selectedRegression: selected.regression_slug,
      selectedProgression: selected.progression_slug,
      modificationNotes: modificationNote,
      safetyTags: [...selected.safety_tags],
    });
    order += 1;
  }

  if (exercises.length === 0) return null;

  const intensity = gentleOnly
    ? EFFORT_GUIDANCE.gentle
    : readiness.recommendedIntensity === "moderate"
      ? EFFORT_GUIDANCE.moderate
      : EFFORT_GUIDANCE.standard;

  return {
    templateSlug: chosen.slug,
    title: chosen.name,
    workoutType:
      chosen.slug.includes("peloton") || chosen.slug.includes("walking")
        ? "cardio"
        : chosen.difficulty === "gentle"
          ? "recovery"
          : "strength",
    pathwayKeys: input.activePathways.filter((key) =>
      chosen.pathway_tags.includes(key),
    ) as PathwayKey[],
    durationMinutes: Math.min(chosen.approximate_minutes, Math.max(10, minutesAvailable)),
    location: chosen.location,
    equipment: [
      ...new Set(
        exercises.flatMap((prescription) => {
          const row = exerciseById.get(prescription.exerciseId);
          return row ? row.equipment : [];
        }),
      ),
    ],
    warmup:
      "Begin with two to three easy minutes — gentle walking or light movement — until your body feels ready.",
    exercises,
    cooldown: "Finish with a couple of quiet minutes of easy stretching and slow breathing.",
    intensityGuidance: intensity,
    progressionGuidance:
      "Progress one thing at a time — a little more weight, one more rep, or one more set, never all at once, and only after a comfortable, symptom-free week. Lighter weeks are planned on purpose. Nothing is ever taken to a maximum.",
    modifications,
    stopConditions: input.restoreActive
      ? [...RESTORE_STOP_CONDITIONS]
      : [...GENERAL_STOP_CONDITIONS],
    rationale: `Chosen for ${chosen.location}, about ${minutesAvailable} minutes, phase ${input.phaseNumber}, and how you said today feels.`,
  };
}

/** Conservative-return helper (resume after inactivity — never punishment). */
export function conservativeReturnMultiplier(daysInactive: number | null | undefined): number {
  if (daysInactive == null) return 1;
  return daysInactive >= PROGRESSION_RULES.inactivityDaysBeforeConservativeReturn
    ? PROGRESSION_RULES.conservativeReturnMultiplier
    : 1;
}
