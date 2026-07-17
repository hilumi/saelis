/**
 * Saelis Her — deterministic milestone engine.
 *
 * Detection is pure; deduplication is guaranteed twice (here by key, and by
 * the (user, milestone_key) unique constraint). Weight milestones exist ONLY
 * when weight tracking is enabled, non-scale progress is celebrated first,
 * and no milestone ever claims medical recovery.
 */
import type { MilestoneInput } from "@/lib/validation/wellness";

export interface MilestoneContext {
  onboardingComplete: boolean;
  checkInCount: number;
  completedWorkoutCount: number;
  completedWorkoutSources: readonly string[]; // e.g. ["saelis", "planet_fitness"]
  distinctWorkoutDaysLast7: number;
  hydrationLoggedDaysLast7: number;
  proteinTargetDaysLast7: number;
  completedFirstProgramWeek: boolean;
  tracksWeight: boolean;
  /** Negative = loss; positive = gain toward a gain goal. Absolute progress. */
  absoluteWeightProgressLbs: number | null;
  hadSymptomFreeModifiedWorkout: boolean;
  restoreActive: boolean;
  restoreOnboardingComplete: boolean;
  completedRestoreWeeks: number;
  returnedAfterBreak: boolean;
  /** Keys already recorded — the engine never re-emits them. */
  existingKeys: ReadonlySet<string>;
}

interface Candidate {
  key: string;
  type: string;
  message: string;
  numericValue?: number | null;
  when: boolean;
  /** Restore-only milestones never surface for non-Restore users. */
  restoreOnly?: boolean;
  weightGated?: boolean;
}

export function detectMilestones(context: MilestoneContext): MilestoneInput[] {
  const candidates: Candidate[] = [
    {
      key: "onboarding-complete",
      type: "beginning",
      message: "You set this up for yourself. That counts.",
      when: context.onboardingComplete,
    },
    {
      key: "first-check-in",
      type: "consistency",
      message: "First check-in — showing up starts here.",
      when: context.checkInCount >= 1,
    },
    {
      key: "first-workout",
      type: "movement",
      message: "First workout done. The hardest one is behind you.",
      when: context.completedWorkoutCount >= 1,
    },
    {
      key: "first-home-workout",
      type: "movement",
      message: "First home workout — your space works.",
      when:
        context.completedWorkoutSources.includes("saelis") ||
        context.completedWorkoutSources.includes("manual"),
    },
    {
      key: "first-planet-fitness-workout",
      type: "movement",
      message: "First Planet Fitness session — you walked in and did it.",
      when: context.completedWorkoutSources.includes("planet_fitness"),
    },
    {
      key: "first-peloton-workout",
      type: "movement",
      message: "First Peloton ride logged.",
      when: context.completedWorkoutSources.includes("peloton"),
    },
    {
      key: "three-workouts",
      type: "consistency",
      message: "Three workouts — a pattern is forming.",
      when: context.completedWorkoutCount >= 3,
    },
    {
      key: "seven-day-consistency",
      type: "consistency",
      message: "You moved on most days this week. Quiet, real progress.",
      when: context.distinctWorkoutDaysLast7 >= 4,
    },
    {
      key: "hydration-consistency",
      type: "nourishment",
      message: "Hydration handled most days this week.",
      when: context.hydrationLoggedDaysLast7 >= 5,
    },
    {
      key: "protein-consistency",
      type: "nourishment",
      message: "Protein showed up most days this week — that is how habits root.",
      when: context.proteinTargetDaysLast7 >= 5,
    },
    {
      key: "first-program-week",
      type: "consistency",
      message: "One full program week complete.",
      when: context.completedFirstProgramWeek,
    },
    {
      key: "five-pound-progress",
      type: "progress",
      message: "Five pounds of progress — steady and sustainable.",
      numericValue: 5,
      when: context.absoluteWeightProgressLbs != null && context.absoluteWeightProgressLbs >= 5,
      weightGated: true,
    },
    {
      key: "ten-pound-progress",
      type: "progress",
      message: "Ten pounds of progress, the patient way.",
      numericValue: 10,
      when: context.absoluteWeightProgressLbs != null && context.absoluteWeightProgressLbs >= 10,
      weightGated: true,
    },
    {
      key: "first-symptom-free-modified-workout",
      type: "movement",
      message:
        "A modified workout that felt right the whole way through — listening to your body IS the skill.",
      when: context.hadSymptomFreeModifiedWorkout,
    },
    {
      key: "restore-onboarding-complete",
      type: "beginning",
      message: "Restore is set up around you — gently, at your pace.",
      when: context.restoreOnboardingComplete,
      restoreOnly: true,
    },
    {
      key: "first-restore-week",
      type: "consistency",
      message: "A first full Restore week, on your terms.",
      when: context.completedRestoreWeeks >= 1,
      restoreOnly: true,
    },
    {
      key: "return-to-routine",
      type: "consistency",
      message: "You came back. Coming back is the whole skill.",
      when: context.returnedAfterBreak,
    },
  ];

  return candidates
    .filter((candidate) => candidate.when)
    .filter((candidate) => !(candidate.weightGated && !context.tracksWeight))
    .filter((candidate) => !(candidate.restoreOnly && !context.restoreActive))
    .filter((candidate) => !context.existingKeys.has(candidate.key))
    .map((candidate) => ({
      milestoneKey: candidate.key,
      milestoneType: candidate.type,
      celebrationMessage: candidate.message,
      numericValue: candidate.numericValue ?? null,
      pathwayKey: null,
    }));
}
