import { describe, expect, it } from "vitest";

import { conservativeReturnMultiplier, selectWorkout, type WorkoutEngineInput } from "./engine";
import { assessReadiness } from "../readiness";
import { assessSafety } from "../safety/engine";

import type {
  ExerciseLibraryRow,
  WorkoutTemplateExerciseRow,
  WorkoutTemplateRow,
} from "@/types/wellness";

// --- Fixtures mirroring the seeded library shapes ---------------------------
let idCounter = 0;
const uid = () => `fixture-${idCounter++}`;
const now = "2026-07-17T00:00:00Z";

function exercise(
  partial: Partial<ExerciseLibraryRow> & { slug: string; name: string },
): ExerciseLibraryRow {
  return {
    id: uid(),
    category: "strength",
    movement_pattern: null,
    primary_muscles: [],
    equipment: [],
    locations: ["home"],
    difficulty: "beginner",
    instructions: `${partial.name} instructions.`,
    coaching_cues: ["cue one"],
    common_mistakes: [],
    regression_slug: null,
    progression_slug: null,
    pathway_tags: ["phoenix", "strong"],
    safety_tags: [],
    avoid_when: [],
    video_url: null,
    active: true,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

function template(
  partial: Partial<WorkoutTemplateRow> & { slug: string; name: string },
): WorkoutTemplateRow {
  return {
    id: uid(),
    description: "fixture",
    pathway_tags: ["phoenix", "strong"],
    location: "home",
    approximate_minutes: 20,
    phase_min: 1,
    phase_max: 99,
    difficulty: "beginner",
    safety_tags: [],
    intensity_guidance: "steady",
    modification_notes: null,
    active: true,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

function templateExercise(
  templateRow: WorkoutTemplateRow,
  exerciseRow: ExerciseLibraryRow,
  sequence: number,
): WorkoutTemplateExerciseRow {
  return {
    id: uid(),
    template_id: templateRow.id,
    exercise_id: exerciseRow.id,
    sequence_number: sequence,
    sets: 3,
    reps: "8-10",
    duration_seconds: null,
    rest_seconds: 60,
    intensity_guidance: "2 reps in reserve",
    modification_notes: null,
  };
}

const wallPushUp = exercise({
  slug: "wall-push-up",
  name: "Wall push-up",
  safety_tags: ["no-floor-position"],
});
const inclinePushUp = exercise({
  slug: "incline-push-up",
  name: "Incline push-up",
  regression_slug: "wall-push-up",
  avoid_when: ["doming_or_coning"],
});
const squat = exercise({ slug: "bw-squat", name: "Bodyweight squat" });
const legPress = exercise({ slug: "leg-press", name: "Leg press", locations: ["gym"] });
const ride = exercise({ slug: "peloton-ride", name: "Low-impact ride", category: "cardio" });

const homeTemplate = template({ slug: "home-full-body-20", name: "Home full body" });
const gymTemplate = template({
  slug: "pf-full-body",
  name: "Planet Fitness full body",
  location: "gym",
  approximate_minutes: 35,
});
const pelotonTemplate = template({
  slug: "peloton-low-impact-20",
  name: "Peloton day",
  approximate_minutes: 25,
});
const noFloorTemplate = template({
  slug: "no-floor-transition-workout",
  name: "No-floor workout",
  safety_tags: ["no-floor-position"],
});
const shortTemplate = template({
  slug: "reset-10",
  name: "Ten minute reset",
  approximate_minutes: 10,
  difficulty: "gentle",
  pathway_tags: ["reset", "phoenix", "strong"],
});

const templates = [homeTemplate, gymTemplate, pelotonTemplate, noFloorTemplate, shortTemplate];
const exercises = [wallPushUp, inclinePushUp, squat, legPress, ride];
const templateExercises: WorkoutTemplateExerciseRow[] = [
  templateExercise(homeTemplate, squat, 1),
  templateExercise(homeTemplate, inclinePushUp, 2),
  templateExercise(gymTemplate, legPress, 1),
  templateExercise(gymTemplate, inclinePushUp, 2),
  templateExercise(pelotonTemplate, ride, 1),
  templateExercise(noFloorTemplate, wallPushUp, 1),
  templateExercise(noFloorTemplate, squat, 2),
  templateExercise(shortTemplate, squat, 1),
  templateExercise(shortTemplate, wallPushUp, 2),
];

const normalSafety = assessSafety({
  activePathways: ["phoenix"],
  checkIn: { energy: 4, stress: 2 },
});
const normalReadiness = assessReadiness({ readiness: "okay", safety: normalSafety });

const baseInput: WorkoutEngineInput = {
  templates,
  templateExercises,
  exercises,
  activePathways: ["phoenix", "strong"],
  safety: normalSafety,
  readiness: normalReadiness,
  phaseNumber: 1,
  availableMinutes: 25,
};

describe("workout engine", () => {
  it("selects a Planet Fitness workout on request", () => {
    const plan = selectWorkout({
      ...baseInput,
      quickSelection: "planet_fitness",
      availableMinutes: 40,
    });
    expect(plan?.location).toBe("gym");
    expect(plan?.templateSlug).toBe("pf-full-body");
  });

  it("selects a Peloton workout on request", () => {
    const plan = selectWorkout({ ...baseInput, quickSelection: "peloton" });
    expect(plan?.templateSlug).toBe("peloton-low-impact-20");
  });

  it("selects a home workout on request", () => {
    const plan = selectWorkout({ ...baseInput, quickSelection: "home" });
    expect(plan?.location).toBe("home");
  });

  it("honors the no-floor option", () => {
    const plan = selectWorkout({ ...baseInput, quickSelection: "no_floor" });
    expect(plan?.templateSlug).toBe("no-floor-transition-workout");
  });

  it("floor-transition difficulty filters to floor-free options automatically", () => {
    const plan = selectWorkout({ ...baseInput, floorTransitionsDifficult: true });
    expect(["no-floor-transition-workout", "peloton-low-impact-20"]).toContain(plan?.templateSlug);
  });

  it("shortens a workout to fit ten minutes", () => {
    const plan = selectWorkout({ ...baseInput, quickSelection: "ten_minutes" });
    expect(plan?.durationMinutes).toBeLessThanOrEqual(12);
    expect(plan?.templateSlug).toBe("reset-10");
  });

  it("swaps symptom-triggering exercises for their regressions", () => {
    const plan = selectWorkout({
      ...baseInput,
      quickSelection: "home",
      availableMinutes: 20,
      symptoms: { domingOrConing: true },
      restoreActive: true,
      activePathways: ["phoenix", "strong", "restore"],
    });
    const names = plan?.exercises.map((e) => e.name) ?? [];
    expect(names).not.toContain("Incline push-up");
    expect(names).toContain("Wall push-up");
    expect(plan?.modifications.join(" ")).toContain("symptom-aware substitution");
  });

  it("returns no workout under a safety hold or urgent tier", () => {
    const hold = assessSafety({
      activePathways: ["restore"],
      postpartumProfile: { medicalClearanceStatus: "not_cleared" },
    });
    const readiness = assessReadiness({ readiness: "okay", safety: hold });
    expect(selectWorkout({ ...baseInput, safety: hold, readiness })).toBeNull();
  });

  it("keeps effort guidance plain-language and never maximal", () => {
    const plan = selectWorkout({ ...baseInput, quickSelection: "home" });
    expect(plan?.intensityGuidance.toLowerCase()).toContain("reps in reserve");
    expect(plan?.progressionGuidance.toLowerCase()).toContain("one thing at a time");
    expect(plan?.progressionGuidance.toLowerCase()).not.toContain("max out");
  });

  it("attaches Restore stop conditions for Restore users, without push-through language", () => {
    const plan = selectWorkout({
      ...baseInput,
      restoreActive: true,
      activePathways: ["restore", "phoenix", "strong"],
      quickSelection: "home",
    });
    expect(plan?.stopConditions).toEqual(expect.arrayContaining(["Leaking", "Dizziness"]));
    expect(JSON.stringify(plan).toLowerCase()).not.toContain("push through");
  });

  it("returns conservatively after inactivity", () => {
    expect(conservativeReturnMultiplier(14)).toBeLessThan(1);
    expect(conservativeReturnMultiplier(3)).toBe(1);
  });
});
