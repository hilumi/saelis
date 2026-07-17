/**
 * Saelis Her — pure, deterministic onboarding step engine (Phase 2).
 *
 * Registry-driven: pathway-specific steps (restore / rhythm / phoenix) appear
 * only when the matching pathway is selected. Synchronous, no I/O, heavily
 * tested — the UI and server actions both consult this module so step logic
 * lives in exactly one place.
 */
import {
  ONBOARDING_STEPS,
  onboardingBodySchema,
  onboardingGoalsSchema,
  onboardingMovementSchema,
  onboardingNutritionSchema,
  onboardingPathwaysSchema,
  onboardingRestoreSchema,
  onboardingRhythmSchema,
  onboardingPhoenixSchema,
  notificationPreferencesSchema,
  type OnboardingDraftData,
  type OnboardingStep,
} from "@/lib/validation/wellness-onboarding";
import type { PathwayKey } from "@/lib/wellness/pathways/types";

export { ONBOARDING_STEPS };
export type { OnboardingStep };

/** Human labels, used for headings and screen-reader progress announcements. */
export const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: "Welcome",
  pathways: "Choose your pathways",
  goals: "Your goals",
  body: "Body and progress preferences",
  movement: "How you like to move",
  nutrition: "How you like to eat",
  restore: "Restore — your recovery",
  rhythm: "Rhythm — your preference",
  phoenix: "Phoenix — your focus",
  notifications: "Reminders",
  review: "Review",
};

const CONDITIONAL_STEPS: Partial<Record<OnboardingStep, PathwayKey>> = {
  restore: "restore",
  rhythm: "rhythm",
  phoenix: "phoenix",
};

/** The ordered steps for a given pathway selection. */
export function stepsFor(selected: readonly PathwayKey[]): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((step) => {
    const requiredPathway = CONDITIONAL_STEPS[step];
    return requiredPathway === undefined || selected.includes(requiredPathway);
  });
}

export function nextStep(
  current: OnboardingStep,
  selected: readonly PathwayKey[],
): OnboardingStep | null {
  const steps = stepsFor(selected);
  const index = steps.indexOf(current);
  if (index === -1) return steps[0] ?? null;
  return steps[index + 1] ?? null;
}

/** Going backward never loses data — the draft keeps every slice. */
export function previousStep(
  current: OnboardingStep,
  selected: readonly PathwayKey[],
): OnboardingStep | null {
  const steps = stepsFor(selected);
  const index = steps.indexOf(current);
  if (index <= 0) return null;
  return steps[index - 1] ?? null;
}

export function stepIndex(current: OnboardingStep, selected: readonly PathwayKey[]): number {
  return Math.max(0, stepsFor(selected).indexOf(current));
}

/**
 * Whether a step's requirements are met. Most steps are optional by design
 * (sensitive questions may always be skipped); only pathway choice, goals,
 * and the pathway-specific selectors have minimum requirements.
 */
export function isStepComplete(step: OnboardingStep, data: OnboardingDraftData): boolean {
  switch (step) {
    case "welcome":
    case "review":
      return true;
    case "pathways":
      return onboardingPathwaysSchema.safeParse(data.pathways).success;
    case "goals":
      return onboardingGoalsSchema.safeParse(data.goals).success;
    case "body":
      return onboardingBodySchema.safeParse(data.body ?? {}).success;
    case "movement":
      return onboardingMovementSchema.safeParse(data.movement ?? {}).success;
    case "nutrition":
      return onboardingNutritionSchema.safeParse(data.nutrition ?? {}).success;
    case "restore":
      return onboardingRestoreSchema.safeParse(data.restore).success;
    case "rhythm":
      return onboardingRhythmSchema.safeParse(data.rhythm).success;
    case "phoenix":
      return onboardingPhoenixSchema.safeParse(data.phoenix).success;
    case "notifications":
      return notificationPreferencesSchema.safeParse(data.notifications ?? {}).success;
  }
}

/** Everything completion requires; the completion action enforces this again. */
export function canComplete(data: OnboardingDraftData): boolean {
  const selected = data.pathways ?? [];
  if (!onboardingPathwaysSchema.safeParse(selected).success) return false;
  if (!onboardingGoalsSchema.safeParse(data.goals).success) return false;
  if (selected.includes("restore") && !onboardingRestoreSchema.safeParse(data.restore).success) {
    return false;
  }
  if (selected.includes("rhythm") && !onboardingRhythmSchema.safeParse(data.rhythm).success) {
    return false;
  }
  if (selected.includes("phoenix") && !onboardingPhoenixSchema.safeParse(data.phoenix).success) {
    return false;
  }
  return true;
}

/**
 * The first step that still needs attention — where a returning user resumes.
 * Falls back to review when everything required is present.
 */
export function resumeStep(data: OnboardingDraftData): OnboardingStep {
  const selected = data.pathways ?? [];
  for (const step of stepsFor(selected)) {
    if (step === "welcome" || step === "review") continue;
    if (!isStepComplete(step, data)) return step;
  }
  return canComplete(data) ? "review" : "pathways";
}
