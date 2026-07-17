"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { finishOnboarding, saveOnboardingProgress } from "@/app/(app)/wellness-actions";
import {
  DateField,
  NumberField,
  RadioChips,
  TagListField,
  TextField,
} from "@/components/her/fields";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Toggle } from "@/components/ui/toggle";
import {
  canComplete,
  isStepComplete,
  nextStep,
  previousStep,
  STEP_LABELS,
  stepsFor,
  stepIndex,
} from "@/lib/wellness/onboarding";
import { assessWeightPace, CONSERVATIVE_PACE_NOTICE } from "@/lib/wellness/pace";
import { listActivePathways } from "@/lib/wellness/pathways";
import {
  DELIVERY_TYPES,
  FEEDING_STATUSES,
  GOAL_TYPES,
  INCISION_STATUSES,
  MEDICAL_CLEARANCE_STATUSES,
  MOVEMENT_EXPERIENCES,
  NOTIFICATION_STYLES,
  PHOENIX_STYLES,
  POSTPARTUM_STAGES,
  PROTEIN_FAMILIARITY_LEVELS,
  RHYTHM_MODES,
  type GoalType,
} from "@/lib/wellness/constants";

import type { OnboardingState } from "@/lib/db/queries/wellness/onboarding";
import type { OnboardingDraftData, OnboardingStep } from "@/lib/validation/wellness-onboarding";
import type { PathwayKey } from "@/lib/wellness/pathways/types";

/**
 * Saelis Her onboarding — resumable, server-persisted, one calm step at a
 * time. Every sensitive question is optional and skippable. Restore, Rhythm,
 * and Phoenix steps appear only when those pathways are chosen.
 */

const GOAL_LABELS: Partial<Record<GoalType, string>> = {
  weight_management: "Sustainable weight management",
  strength: "Build strength",
  energy: "Improve energy",
  cardiovascular_fitness: "Improve cardiovascular fitness",
  consistency: "Establish consistency",
  nutrition: "Improve nutrition and protein",
  hydration: "Improve hydration",
  mobility: "Improve mobility",
  stress_management: "Support stress management",
  confidence: "Improve confidence",
  sleep: "Improve sleep habits",
  core_recovery: "Rebuild core function",
  postpartum_recovery: "Support postpartum recovery",
};

/** Postpartum-worded goals are shown only when Restore is selected. */
const RESTORE_ONLY_GOALS: GoalType[] = ["postpartum_recovery", "pelvic_floor_support"];

const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, "0")}:00`,
}));

export interface HerOnboardingFlowProps {
  initialState: OnboardingState;
  initialStep?: OnboardingStep | null;
}

export function HerOnboardingFlow({ initialState, initialStep }: HerOnboardingFlowProps) {
  const router = useRouter();
  const [data, setData] = useState<OnboardingDraftData>(initialState.data);
  const [step, setStep] = useState<OnboardingStep>(initialStep ?? initialState.currentStep);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const selected: PathwayKey[] = data.pathways ?? [];
  const steps = stepsFor(selected);
  const index = stepIndex(step, selected);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function update(patch: Partial<OnboardingDraftData>) {
    setData((current) => ({ ...current, ...patch }));
    setSaveState("idle");
  }

  async function persist(nextStepValue: OnboardingStep, nextData: OnboardingDraftData) {
    setSaveState("saving");
    setError(null);
    const result = await saveOnboardingProgress({ currentStep: nextStepValue, data: nextData });
    if (result.ok) {
      setSaveState("saved");
    } else {
      setSaveState("error");
      setError(result.error);
    }
    return result.ok;
  }

  async function goTo(target: OnboardingStep) {
    setStep(target);
    router.replace(`/wellness/her/onboarding?step=${target}`, { scroll: true });
    await persist(target, data);
  }

  async function goForward() {
    if (!isStepComplete(step, data)) {
      setError("This step needs one more choice before continuing.");
      return;
    }
    const target = nextStep(step, selected);
    if (target) await goTo(target);
  }

  async function goBack() {
    const target = previousStep(step, selected);
    if (target) await goTo(target); // draft keeps every answer — nothing is lost
  }

  async function finish() {
    setFinishing(true);
    setError(null);
    const result = await finishOnboarding(data);
    if (result.ok) {
      router.push("/wellness/her");
    } else {
      setFinishing(false);
      setError(result.error);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <p aria-live="polite" className="text-sm text-ink-muted">
        Step {index + 1} of {steps.length}: {STEP_LABELS[step]}
      </p>

      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-ink outline-none">
        {STEP_LABELS[step]}
      </h2>

      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
      {saveState === "saved" && !error ? (
        <InlineNotice tone="success">
          Progress saved. You can leave and return anytime.
        </InlineNotice>
      ) : null}

      {step === "welcome" ? (
        <section className="glass-surface flex flex-col gap-3 p-6">
          <p className="text-ink">
            Saelis Her creates adaptive wellness plans that meet you where you are — and you stay in
            charge of what you track.
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-ink-soft">
            <li>You control what you track. Weight and calories are always optional.</li>
            <li>Sensitive questions may be skipped, always.</li>
            <li>
              Saelis Her offers general educational wellness support. It does not replace
              individualized medical care.
            </li>
          </ul>
        </section>
      ) : null}

      {step === "pathways" ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Choose one or more pathways</legend>
          <p className="text-ink-soft">
            Choose as many as fit this season. You can change pathways anytime.
          </p>
          {listActivePathways().map((pathway) => (
            <Choice
              key={pathway.key}
              label={pathway.displayName}
              description={pathway.shortDescription}
              selected={selected.includes(pathway.key)}
              onSelect={() =>
                update({
                  pathways: selected.includes(pathway.key)
                    ? selected.filter((key) => key !== pathway.key)
                    : [...selected, pathway.key],
                })
              }
            />
          ))}
        </fieldset>
      ) : null}

      {step === "goals" ? (
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="font-medium text-ink">What matters to you right now?</legend>
            {GOAL_TYPES.filter(
              (goal) =>
                GOAL_LABELS[goal] &&
                (!RESTORE_ONLY_GOALS.includes(goal) || selected.includes("restore")),
            ).map((goal) => (
              <Choice
                key={goal}
                label={GOAL_LABELS[goal] ?? goal}
                selected={data.goals?.goalTypes.includes(goal) ?? false}
                onSelect={() => {
                  const current = data.goals?.goalTypes ?? [];
                  const goalTypes = current.includes(goal)
                    ? current.filter((item) => item !== goal)
                    : [...current, goal];
                  const primaryGoal =
                    data.goals?.primaryGoal && goalTypes.includes(data.goals.primaryGoal)
                      ? data.goals.primaryGoal
                      : goalTypes[0];
                  update({
                    goals: primaryGoal ? { goalTypes, primaryGoal } : undefined,
                  });
                }}
              />
            ))}
          </fieldset>
          {(data.goals?.goalTypes.length ?? 0) > 1 ? (
            <RadioChips
              legend="Which one feels primary?"
              options={(data.goals?.goalTypes ?? []).map((goal) => ({
                value: goal,
                label: GOAL_LABELS[goal] ?? goal,
              }))}
              value={data.goals?.primaryGoal ?? null}
              onChange={(primaryGoal) =>
                update({
                  goals: { goalTypes: data.goals?.goalTypes ?? [primaryGoal], primaryGoal },
                })
              }
            />
          ) : null}
        </div>
      ) : null}

      {step === "body" ? (
        <div className="flex flex-col gap-4">
          <p className="text-ink-soft">
            Everything here is optional. Saelis Her works with whatever you feel like sharing.
          </p>
          <DateField
            label="Date of birth"
            value={data.body?.dateOfBirth ?? null}
            onChange={(dateOfBirth) => update({ body: { ...data.body, dateOfBirth } })}
          />
          <NumberField
            label="Height"
            unit="inches"
            min={36}
            max={90}
            value={data.body?.heightInches ?? null}
            onChange={(heightInches) => update({ body: { ...data.body, heightInches } })}
          />
          <NumberField
            label="Current weight"
            unit="lbs"
            min={50}
            max={1000}
            value={data.body?.currentWeightLbs ?? null}
            onChange={(currentWeightLbs) => update({ body: { ...data.body, currentWeightLbs } })}
          />
          <NumberField
            label="Target weight"
            unit="lbs"
            min={50}
            max={1000}
            hint="A direction, not a demand. Leave blank for habit or recomposition goals."
            value={data.body?.targetWeightLbs ?? null}
            onChange={(targetWeightLbs) => update({ body: { ...data.body, targetWeightLbs } })}
          />
          <NumberField
            label="Desired timeframe"
            unit="months"
            min={1}
            max={60}
            value={data.body?.goalTimeframeMonths ?? null}
            onChange={(goalTimeframeMonths) =>
              update({ body: { ...data.body, goalTimeframeMonths } })
            }
          />
          {assessWeightPace({
            currentWeightLbs: data.body?.currentWeightLbs,
            targetWeightLbs: data.body?.targetWeightLbs,
            goalTimeframeMonths: data.body?.goalTimeframeMonths,
          }).aggressive ? (
            <InlineNotice tone="info">{CONSERVATIVE_PACE_NOTICE}</InlineNotice>
          ) : null}
          <RadioChips
            legend="Units"
            options={[
              { value: "imperial", label: "Imperial (lbs, inches)" },
              { value: "metric", label: "Metric (kg, cm)" },
            ]}
            value={data.body?.unitsPreference ?? "imperial"}
            onChange={(unitsPreference) => update({ body: { ...data.body, unitsPreference } })}
          />
          <Toggle
            label="Track weight"
            description="You can change this anytime — progress never requires a scale."
            checked={data.body?.tracksWeight ?? true}
            onChange={(tracksWeight) => update({ body: { ...data.body, tracksWeight } })}
          />
          <Toggle
            label="Track calories"
            description="Estimates only, never precise. Nourish works without calories too."
            checked={data.body?.tracksCalories ?? true}
            onChange={(tracksCalories) => update({ body: { ...data.body, tracksCalories } })}
          />
          <Toggle
            label="Daily weigh-ins"
            description="Only if that genuinely helps you. Weekly or never are just as valid."
            checked={data.body?.weighsDaily ?? false}
            onChange={(weighsDaily) => update({ body: { ...data.body, weighsDaily } })}
          />
        </div>
      ) : null}

      {step === "movement" ? (
        <div className="flex flex-col gap-4">
          <RadioChips
            legend="Experience with structured movement"
            options={MOVEMENT_EXPERIENCES.map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            }))}
            value={data.movement?.movementExperience ?? null}
            onChange={(movementExperience) =>
              update({ movement: { ...data.movement, movementExperience } })
            }
          />
          <NumberField
            label="Workout days per week"
            min={0}
            max={7}
            value={data.movement?.preferredWorkoutDays ?? null}
            onChange={(value) =>
              update({
                movement: { ...data.movement, preferredWorkoutDays: value ?? undefined },
              })
            }
          />
          <NumberField
            label="Minutes you usually have"
            min={5}
            max={180}
            unit="minutes"
            value={data.movement?.preferredWorkoutMinutes ?? null}
            onChange={(value) =>
              update({
                movement: { ...data.movement, preferredWorkoutMinutes: value ?? undefined },
              })
            }
          />
          <TagListField
            label="Places you like to move"
            hint="Home, outdoors, a gym…"
            values={data.movement?.trainingLocations ?? []}
            onChange={(trainingLocations) =>
              update({ movement: { ...data.movement, trainingLocations } })
            }
          />
          <TagListField
            label="Home equipment"
            values={data.movement?.homeEquipment ?? []}
            onChange={(homeEquipment) => update({ movement: { ...data.movement, homeEquipment } })}
          />
          <Toggle
            label="Planet Fitness access"
            checked={data.movement?.planetFitnessAccess ?? false}
            onChange={(planetFitnessAccess) =>
              update({ movement: { ...data.movement, planetFitnessAccess } })
            }
          />
          <Toggle
            label="Peloton access"
            checked={data.movement?.pelotonAccess ?? false}
            onChange={(pelotonAccess) => update({ movement: { ...data.movement, pelotonAccess } })}
          />
          <Toggle
            label="Walking is a favorite"
            checked={data.movement?.walkingPreferred ?? false}
            onChange={(walkingPreferred) =>
              update({ movement: { ...data.movement, walkingPreferred } })
            }
          />
          <TagListField
            label="Anything to work around"
            hint="Injuries, joints that complain, movements to avoid."
            values={data.movement?.movementLimitations ?? []}
            onChange={(movementLimitations) =>
              update({ movement: { ...data.movement, movementLimitations } })
            }
          />
          <TagListField
            label="Movement you dislike"
            hint="You will not be asked to do these."
            values={data.movement?.movementDislikes ?? []}
            onChange={(movementDislikes) =>
              update({ movement: { ...data.movement, movementDislikes } })
            }
          />
          <Toggle
            label="Getting up and down from the floor is hard right now"
            checked={data.movement?.floorTransitionsDifficult ?? false}
            onChange={(floorTransitionsDifficult) =>
              update({ movement: { ...data.movement, floorTransitionsDifficult } })
            }
          />
          <Toggle
            label="Prefer beginner-friendly explanations"
            checked={data.movement?.prefersBeginnerExplanations ?? false}
            onChange={(prefersBeginnerExplanations) =>
              update({ movement: { ...data.movement, prefersBeginnerExplanations } })
            }
          />
        </div>
      ) : null}

      {step === "nutrition" ? (
        <div className="flex flex-col gap-4">
          <TextField
            label="Dietary pattern"
            hint="Vegetarian, mostly plants, no restrictions — whatever describes you."
            value={data.nutrition?.dietaryPattern ?? ""}
            onChange={(value) =>
              update({ nutrition: { ...data.nutrition, dietaryPattern: value || null } })
            }
          />
          <TagListField
            label="Food allergies"
            values={data.nutrition?.foodAllergies ?? []}
            onChange={(foodAllergies) =>
              update({ nutrition: { ...data.nutrition, foodAllergies } })
            }
          />
          <TagListField
            label="Foods you dislike"
            values={data.nutrition?.foodDislikes ?? []}
            onChange={(foodDislikes) => update({ nutrition: { ...data.nutrition, foodDislikes } })}
          />
          <TextField
            label="Household meal notes"
            hint="Who you cook for, picky eaters, shared dinners."
            maxLength={500}
            value={data.nutrition?.householdMealPreferences ?? ""}
            onChange={(value) =>
              update({
                nutrition: { ...data.nutrition, householdMealPreferences: value || null },
              })
            }
          />
          <RadioChips
            legend="Grocery budget"
            options={[
              { value: "low", label: "Budget-friendly" },
              { value: "medium", label: "Middle of the road" },
              { value: "high", label: "Flexible" },
            ]}
            value={data.nutrition?.budgetPreference ?? null}
            onChange={(budgetPreference) =>
              update({ nutrition: { ...data.nutrition, budgetPreference } })
            }
          />
          <RadioChips
            legend="Meal prep style"
            options={[
              { value: "batch", label: "Batch prep" },
              { value: "fresh", label: "Cook fresh" },
              { value: "mixed", label: "A little of both" },
            ]}
            value={
              (data.nutrition?.mealPrepPreference as "batch" | "fresh" | "mixed" | null) ?? null
            }
            onChange={(mealPrepPreference) =>
              update({ nutrition: { ...data.nutrition, mealPrepPreference } })
            }
          />
          <Toggle
            label="Quick meals matter to me"
            checked={data.nutrition?.quickMealsPreferred ?? false}
            onChange={(quickMealsPreferred) =>
              update({ nutrition: { ...data.nutrition, quickMealsPreferred } })
            }
          />
          <RadioChips
            legend="How familiar is protein planning?"
            options={PROTEIN_FAMILIARITY_LEVELS.map((value) => ({
              value,
              label:
                value === "new"
                  ? "New to me"
                  : value === "some"
                    ? "Somewhat familiar"
                    : "Confident",
            }))}
            value={data.nutrition?.proteinFamiliarity ?? null}
            onChange={(proteinFamiliarity) =>
              update({ nutrition: { ...data.nutrition, proteinFamiliarity } })
            }
          />
          <Toggle
            label="Track calories in Nourish"
            description="Optional. Estimates only — habit-based guidance works without numbers."
            checked={data.nutrition?.tracksCalories ?? data.body?.tracksCalories ?? true}
            onChange={(tracksCalories) =>
              update({ nutrition: { ...data.nutrition, tracksCalories } })
            }
          />
          <Toggle
            label="Portion guidance would help"
            checked={data.nutrition?.portionGuidancePreferred ?? false}
            onChange={(portionGuidancePreferred) =>
              update({ nutrition: { ...data.nutrition, portionGuidancePreferred } })
            }
          />
          <Toggle
            label="Family-style meals are important"
            checked={data.nutrition?.familyStyleMeals ?? false}
            onChange={(familyStyleMeals) =>
              update({ nutrition: { ...data.nutrition, familyStyleMeals } })
            }
          />
        </div>
      ) : null}

      {step === "restore" ? (
        <RestoreStep value={data.restore} onChange={(restore) => update({ restore })} />
      ) : null}

      {step === "rhythm" ? (
        <div className="flex flex-col gap-4">
          <p className="text-ink-soft">
            Rhythm is entirely optional and symptom-led. It never assumes regular cycles — or
            menstruation at all — and it makes no medical or fertility claims. You can turn it off
            anytime.
          </p>
          <RadioChips
            legend="How would you like Rhythm to work?"
            options={RHYTHM_MODES.map((value) => ({
              value,
              label:
                value === "symptom-led"
                  ? "Gentle, symptom-led awareness"
                  : value === "not-applicable"
                    ? "Not applicable to me"
                    : "Prefer not to track",
            }))}
            value={data.rhythm?.mode ?? null}
            onChange={(mode) => update({ rhythm: { mode } })}
          />
        </div>
      ) : null}

      {step === "phoenix" ? (
        <div className="flex flex-col gap-4">
          <p className="text-ink-soft">
            Phoenix never requires a target weight. Recomposition and habit goals count fully — with
            or without a scale.
          </p>
          <RadioChips
            legend="Which focus fits best right now?"
            options={PHOENIX_STYLES.map((value) => ({
              value,
              label:
                value === "habit"
                  ? "Habit-focused"
                  : value === "performance"
                    ? "Performance-focused"
                    : value === "weight"
                      ? "Weight-focused"
                      : value === "non-scale"
                        ? "Non-scale progress"
                        : "Balanced",
            }))}
            value={data.phoenix?.style ?? null}
            onChange={(style) => update({ phoenix: { style } })}
          />
        </div>
      ) : null}

      {step === "notifications" ? (
        <div className="flex flex-col gap-4">
          <RadioChips
            legend="Reminder style"
            options={NOTIFICATION_STYLES.map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            }))}
            value={data.notifications?.reminderStyle ?? "gentle"}
            onChange={(reminderStyle) =>
              update({
                notifications: {
                  reminderStyle,
                  morningCheckIn: data.notifications?.morningCheckIn ?? false,
                  workoutReminders: data.notifications?.workoutReminders ?? false,
                  nourishmentReminders: data.notifications?.nourishmentReminders ?? false,
                  hydrationReminders: data.notifications?.hydrationReminders ?? false,
                  eveningReflection: data.notifications?.eveningReflection ?? false,
                  quietHoursStart: data.notifications?.quietHoursStart ?? null,
                  quietHoursEnd: data.notifications?.quietHoursEnd ?? null,
                  maxDailyNotifications: data.notifications?.maxDailyNotifications ?? 3,
                },
              })
            }
          />
          {(
            [
              ["morningCheckIn", "Morning check-in"],
              ["workoutReminders", "Workout reminders"],
              ["nourishmentReminders", "Nourishment reminders"],
              ["hydrationReminders", "Hydration reminders"],
              ["eveningReflection", "Evening reflection"],
            ] as const
          ).map(([key, label]) => (
            <Toggle
              key={key}
              label={label}
              checked={data.notifications?.[key] ?? false}
              onChange={(checked) =>
                update({
                  notifications: {
                    reminderStyle: data.notifications?.reminderStyle ?? "gentle",
                    morningCheckIn: data.notifications?.morningCheckIn ?? false,
                    workoutReminders: data.notifications?.workoutReminders ?? false,
                    nourishmentReminders: data.notifications?.nourishmentReminders ?? false,
                    hydrationReminders: data.notifications?.hydrationReminders ?? false,
                    eveningReflection: data.notifications?.eveningReflection ?? false,
                    quietHoursStart: data.notifications?.quietHoursStart ?? null,
                    quietHoursEnd: data.notifications?.quietHoursEnd ?? null,
                    maxDailyNotifications: data.notifications?.maxDailyNotifications ?? 3,
                    [key]: checked,
                  },
                })
              }
            />
          ))}
          <RadioChips
            legend="Quiet hours start"
            optional
            options={HOUR_LABELS.slice(18).concat(HOUR_LABELS.slice(0, 2))}
            value={
              data.notifications?.quietHoursStart != null
                ? String(data.notifications.quietHoursStart)
                : null
            }
            onChange={(value) =>
              update({
                notifications: {
                  ...(data.notifications ?? { reminderStyle: "gentle" }),
                  reminderStyle: data.notifications?.reminderStyle ?? "gentle",
                  morningCheckIn: data.notifications?.morningCheckIn ?? false,
                  workoutReminders: data.notifications?.workoutReminders ?? false,
                  nourishmentReminders: data.notifications?.nourishmentReminders ?? false,
                  hydrationReminders: data.notifications?.hydrationReminders ?? false,
                  eveningReflection: data.notifications?.eveningReflection ?? false,
                  quietHoursEnd: data.notifications?.quietHoursEnd ?? null,
                  maxDailyNotifications: data.notifications?.maxDailyNotifications ?? 3,
                  quietHoursStart: Number(value),
                },
              })
            }
          />
          <NumberField
            label="Most notifications per day"
            min={0}
            max={10}
            optional={false}
            value={data.notifications?.maxDailyNotifications ?? 3}
            onChange={(value) =>
              update({
                notifications: {
                  reminderStyle: data.notifications?.reminderStyle ?? "gentle",
                  morningCheckIn: data.notifications?.morningCheckIn ?? false,
                  workoutReminders: data.notifications?.workoutReminders ?? false,
                  nourishmentReminders: data.notifications?.nourishmentReminders ?? false,
                  hydrationReminders: data.notifications?.hydrationReminders ?? false,
                  eveningReflection: data.notifications?.eveningReflection ?? false,
                  quietHoursStart: data.notifications?.quietHoursStart ?? null,
                  quietHoursEnd: data.notifications?.quietHoursEnd ?? null,
                  maxDailyNotifications: value ?? 3,
                },
              })
            }
          />
          <InlineNotice tone="info">
            These are preferences only. Saelis never asks your browser for notification permission
            unless you explicitly press an enable button later.
          </InlineNotice>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="flex flex-col gap-4">
          <ReviewSection
            title="Pathways"
            editStep="pathways"
            onEdit={goTo}
            value={selected.map((key) => STEP_LABELS_SAFE(key)).join(", ") || "None yet"}
          />
          <ReviewSection
            title="Primary goal"
            editStep="goals"
            onEdit={goTo}
            value={
              data.goals?.primaryGoal
                ? (GOAL_LABELS[data.goals.primaryGoal] ?? data.goals.primaryGoal)
                : "Not chosen yet"
            }
          />
          <ReviewSection
            title="Movement"
            editStep="movement"
            onEdit={goTo}
            value={`${data.movement?.preferredWorkoutDays ?? 3} days/week · ${
              data.movement?.preferredWorkoutMinutes ?? 30
            } minutes · ${data.movement?.movementExperience ?? "beginner"}`}
          />
          <ReviewSection
            title="Nutrition"
            editStep="nutrition"
            onEdit={goTo}
            value={
              (data.nutrition?.tracksCalories ?? data.body?.tracksCalories ?? true)
                ? "Estimated calorie range + habits"
                : "Habit-based (no calorie counting)"
            }
          />
          <ReviewSection
            title="Progress tracking"
            editStep="body"
            onEdit={goTo}
            value={`Weight: ${(data.body?.tracksWeight ?? true) ? "tracked" : "not tracked"} · Calories: ${
              (data.nutrition?.tracksCalories ?? data.body?.tracksCalories ?? true)
                ? "estimates"
                : "off"
            }`}
          />
          <ReviewSection
            title="Reminders"
            editStep="notifications"
            onEdit={goTo}
            value={`${data.notifications?.reminderStyle ?? "gentle"} · up to ${
              data.notifications?.maxDailyNotifications ?? 3
            }/day`}
          />
          {!canComplete(data) ? (
            <InlineNotice tone="info">
              A few steps still need attention — use Edit to revisit them.
            </InlineNotice>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={goBack} disabled={index === 0 || finishing}>
          Back
        </Button>
        <span aria-live="polite" className="text-sm text-ink-muted">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
        </span>
        {step === "review" ? (
          <Button onClick={finish} disabled={!canComplete(data) || finishing}>
            {finishing ? "Finishing…" : "Finish setup"}
          </Button>
        ) : (
          <Button onClick={goForward} disabled={finishing}>
            {step === "welcome" ? "Begin" : "Continue"}
          </Button>
        )}
      </div>
    </div>
  );
}

function STEP_LABELS_SAFE(key: PathwayKey): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function ReviewSection({
  title,
  value,
  editStep,
  onEdit,
}: {
  title: string;
  value: string;
  editStep: OnboardingStep;
  onEdit: (step: OnboardingStep) => void;
}) {
  return (
    <div className="glass-surface flex flex-wrap items-center justify-between gap-2 p-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">{title}</p>
        <p className="text-ink">{value}</p>
      </div>
      <Button variant="soft" onClick={() => onEdit(editStep)}>
        Edit
      </Button>
    </div>
  );
}

/** Restore intake — shown ONLY when Restore is selected. Softer treatment. */
function RestoreStep({
  value,
  onChange,
}: {
  value: OnboardingDraftData["restore"];
  onChange: (value: NonNullable<OnboardingDraftData["restore"]>) => void;
}) {
  const current = value ?? {
    postpartumStage: undefined as never,
    feedingStatus: "prefer_not_to_say" as const,
    medicalClearanceStatus: "unknown" as const,
    pelvicFloorSymptoms: false,
    suspectedDiastasis: false,
    diastasisAssessedByProfessional: false,
    abdominalDomingOrConing: false,
    chronicPain: false,
    ironDeficiencyOrAnemia: false,
    fatigueConcern: false,
    floorTransitionsUncomfortable: false,
  };

  function patch(partial: Partial<NonNullable<OnboardingDraftData["restore"]>>) {
    onChange({ ...current, ...partial } as NonNullable<OnboardingDraftData["restore"]>);
  }

  const stageLabels: Record<string, string> = {
    less_than_6_weeks: "Less than 6 weeks",
    "6_to_12_weeks": "6–12 weeks",
    "3_to_6_months": "3–6 months",
    "6_to_12_months": "6–12 months",
    "1_to_2_years": "1–2 years",
    more_than_2_years: "More than 2 years",
    prefer_not_to_say: "Prefer not to say",
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-cloud-pink/30 p-5">
      <p className="text-ink-soft">
        These questions help Restore meet you gently. Every one of them can be skipped or answered
        with “prefer not to say.” Nothing here diagnoses anything.
      </p>
      <RadioChips
        legend="How far postpartum are you?"
        optional={false}
        options={POSTPARTUM_STAGES.map((stage) => ({
          value: stage,
          label: stageLabels[stage] ?? stage,
        }))}
        value={current.postpartumStage ?? null}
        onChange={(postpartumStage) => patch({ postpartumStage })}
      />
      <InlineNotice tone="info">
        Postpartum timing alone does not establish exercise readiness — bodies recover on their own
        schedules.
      </InlineNotice>
      <DateField
        label="Delivery date"
        value={current.deliveryDate ?? null}
        onChange={(deliveryDate) => patch({ deliveryDate })}
      />
      <RadioChips
        legend="Delivery type"
        options={DELIVERY_TYPES.map((type) => ({
          value: type,
          label: stageLabels[type] ?? type.replaceAll("_", " "),
        }))}
        value={current.deliveryType ?? null}
        onChange={(deliveryType) => patch({ deliveryType })}
      />
      {current.deliveryType === "cesarean" || current.deliveryType === "multiple_cesareans" ? (
        <NumberField
          label="Number of C-sections"
          min={0}
          max={10}
          value={current.cesareanCount ?? null}
          onChange={(cesareanCount) => patch({ cesareanCount })}
        />
      ) : null}
      <RadioChips
        legend="Feeding"
        options={FEEDING_STATUSES.map((status) => ({
          value: status,
          label: status.replaceAll("_", " "),
        }))}
        value={current.feedingStatus ?? null}
        onChange={(feedingStatus) => patch({ feedingStatus })}
      />
      <RadioChips
        legend="Has a healthcare provider talked with you about returning to exercise?"
        options={MEDICAL_CLEARANCE_STATUSES.map((status) => ({
          value: status,
          label:
            status === "cleared"
              ? "Yes — cleared"
              : status === "restrictions"
                ? "Yes — with restrictions"
                : status === "not_cleared"
                  ? "Not yet cleared"
                  : "Not sure / not discussed",
        }))}
        value={current.medicalClearanceStatus ?? null}
        onChange={(medicalClearanceStatus) => patch({ medicalClearanceStatus })}
      />
      {current.medicalClearanceStatus !== "cleared" ? (
        <InlineNotice tone="info">
          You are welcome to continue. Until clearance is reported, Saelis keeps things to
          education, nourishment, hydration, check-ins, and gentle recovery guidance — no
          unrestricted exercise plans.
        </InlineNotice>
      ) : null}
      {current.medicalClearanceStatus === "restrictions" ? (
        <TextField
          label="Restrictions you would like Saelis to respect"
          maxLength={500}
          value={current.reportedRestrictions ?? ""}
          onChange={(value) => patch({ reportedRestrictions: value || null })}
        />
      ) : null}
      <Toggle
        label="Pelvic-floor symptoms (heaviness, pressure, leaking)"
        checked={current.pelvicFloorSymptoms ?? false}
        onChange={(pelvicFloorSymptoms) => patch({ pelvicFloorSymptoms })}
      />
      {current.pelvicFloorSymptoms ? (
        <InlineNotice tone="info">
          Pelvic-floor symptoms differ — they can involve weakness, coordination difficulty, or
          overactivity, so pelvic-floor contraction exercises are not universally appropriate.
          Persistent doming, pressure, pain, leaking, or heaviness may warrant an assessment by a
          pelvic-floor physical therapist.
        </InlineNotice>
      ) : null}
      <Toggle
        label="Suspected abdominal separation (diastasis)"
        checked={current.suspectedDiastasis ?? false}
        onChange={(suspectedDiastasis) => patch({ suspectedDiastasis })}
      />
      {current.suspectedDiastasis ? (
        <Toggle
          label="A professional has assessed it"
          checked={current.diastasisAssessedByProfessional ?? false}
          onChange={(diastasisAssessedByProfessional) => patch({ diastasisAssessedByProfessional })}
        />
      ) : null}
      <Toggle
        label="Belly doming or coning during effort"
        checked={current.abdominalDomingOrConing ?? false}
        onChange={(abdominalDomingOrConing) => patch({ abdominalDomingOrConing })}
      />
      <Toggle
        label="Persistent pain"
        checked={current.chronicPain ?? false}
        onChange={(chronicPain) => patch({ chronicPain })}
      />
      {current.chronicPain ? (
        <TextField
          label="Where, if you would like to share"
          maxLength={500}
          value={current.painDetails ?? ""}
          onChange={(value) => patch({ painDetails: value || null })}
        />
      ) : null}
      <RadioChips
        legend="Incision (if applicable)"
        options={INCISION_STATUSES.map((status) => ({
          value: status,
          label: status.replaceAll("_", " "),
        }))}
        value={current.incisionStatus ?? null}
        onChange={(incisionStatus) => patch({ incisionStatus })}
      />
      <Toggle
        label="Fatigue is a real concern right now"
        checked={current.fatigueConcern ?? false}
        onChange={(fatigueConcern) => patch({ fatigueConcern })}
      />
      <Toggle
        label="Iron deficiency or anemia concern"
        checked={current.ironDeficiencyOrAnemia ?? false}
        onChange={(ironDeficiencyOrAnemia) => patch({ ironDeficiencyOrAnemia })}
      />
      <Toggle
        label="Getting up and down from the floor is uncomfortable"
        checked={current.floorTransitionsUncomfortable ?? false}
        onChange={(floorTransitionsUncomfortable) => patch({ floorTransitionsUncomfortable })}
      />
      <InlineNotice tone="info">
        If anything feels urgent — heavy bleeding, chest pain, severe headache, calf pain or
        swelling — please seek prompt professional care first. Saelis is not a medical service.
      </InlineNotice>
    </div>
  );
}
