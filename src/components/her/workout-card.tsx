"use client";

import { useState } from "react";

import { completeWorkout, replaceTodaysWorkout } from "@/app/(app)/wellness-plan-actions";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Toggle } from "@/components/ui/toggle";
import { NumberField } from "@/components/her/fields";
import { cn } from "@/lib/utils";

import type { MovementPlan } from "@/lib/validation/wellness";
import type { PathwayKey } from "@/lib/wellness/pathways/types";

export interface WorkoutCardProps {
  today: string;
  movement: MovementPlan;
  intensityGuidance: string | null;
  stopConditions: string[];
  restoreActive: boolean;
  pathways: PathwayKey[];
  onLogged?: () => void;
}

interface ExerciseState {
  done: boolean;
  skipped: boolean;
  usedModification: boolean;
  weightLbs: number | null;
}

/**
 * Workout display + logging. Warm-up, sequence, cues, modifications, stop
 * conditions, cooldown, rationale — with progressive disclosure so the card
 * never overwhelms. Completion never inflates calorie precision.
 */
export function WorkoutCard({
  today,
  movement,
  intensityGuidance,
  stopConditions,
  restoreActive,
  onLogged,
}: WorkoutCardProps) {
  const [started, setStarted] = useState(false);
  const [exerciseState, setExerciseState] = useState<Record<number, ExerciseState>>({});
  const [painDuring, setPainDuring] = useState(false);
  const [domingOrConing, setDomingOrConing] = useState(false);
  const [pelvicSymptom, setPelvicSymptom] = useState(false);
  const [notes, setNotes] = useState("");
  const [feltRating, setFeltRating] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);

  if (movement.restDay || movement.exercises.length === 0) return null;

  function patchExercise(sequence: number, patch: Partial<ExerciseState>) {
    setExerciseState((current) => ({
      ...current,
      [sequence]: {
        done: false,
        skipped: false,
        usedModification: false,
        weightLbs: null,
        ...current[sequence],
        ...patch,
      },
    }));
  }

  async function finish(status: "completed" | "partial") {
    setState("saving");
    setError(null);
    const doneCount = movement.exercises.filter(
      (e) => exerciseState[e.sequenceNumber]?.done,
    ).length;
    const result = await completeWorkout({
      workout: {
        workoutDate: today,
        workoutType: "strength",
        title: movement.focus ?? "Workout",
        source: "saelis",
        plannedDurationMinutes: movement.approximateMinutes,
        completionStatus: status,
        painDuring,
        domingOrConing,
        pelvicFloorSymptom: pelvicSymptom,
        perceivedExertion: feltRating,
        notes: notes.trim() ? notes.trim().slice(0, 2000) : null,
        pathwayKeys: [],
      },
      exercises: movement.exercises.map((exercise) => ({
        exerciseName: exercise.displayName,
        sequenceNumber: exercise.sequenceNumber,
        setsCompleted: exerciseState[exercise.sequenceNumber]?.done ? exercise.sets : 0,
        repsCompleted: exercise.reps,
        weightUsedLbs: exerciseState[exercise.sequenceNumber]?.weightLbs ?? null,
        modificationUsed: exerciseState[exercise.sequenceNumber]?.usedModification
          ? (exercise.modificationNotes ?? "modified")
          : null,
        notes: exerciseState[exercise.sequenceNumber]?.skipped ? "skipped" : null,
      })),
    });
    if (result.ok) {
      setState("done");
      onLogged?.();
    } else {
      setState("error");
      setError(result.error);
    }
    void doneCount;
  }

  if (state === "done") {
    return (
      <section aria-label="Workout complete" className="glass-surface flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold text-ink">Done. Quietly impressive.</h2>
        <p className="text-ink-soft">
          Your session is logged. Energy spent is real but never precisely countable — so Saelis
          does not pretend to count it.
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-ink">
            How did it feel? (1 easy – 10 hard)
          </legend>
          <div className="flex flex-wrap gap-2">
            {[2, 4, 6, 8].map((value) => (
              <Button
                key={value}
                variant={feltRating === value ? "primary" : "soft"}
                onClick={() => setFeltRating(value)}
              >
                {value <= 2 ? "Easy" : value <= 4 ? "Comfortable" : value <= 6 ? "Working" : "Hard"}
              </Button>
            ))}
          </div>
        </fieldset>
      </section>
    );
  }

  return (
    <section aria-label="Today's workout" className="glass-surface flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink">{movement.focus ?? "Today's movement"}</h2>
          <p className="text-sm text-ink-soft">
            ~{movement.approximateMinutes ?? 20} minutes{" "}
            {intensityGuidance ? `· ${intensityGuidance}` : ""}
          </p>
        </div>
        {!started ? (
          <div className="flex gap-2">
            <Button onClick={() => setStarted(true)}>Start workout</Button>
            <Button
              variant="ghost"
              disabled={replacing}
              onClick={async () => {
                setReplacing(true);
                await replaceTodaysWorkout({ date: today, refresh: true });
                setReplacing(false);
                onLogged?.();
              }}
            >
              {replacing ? "Finding another…" : "Replace"}
            </Button>
          </div>
        ) : null}
      </div>

      <p className="text-sm text-ink-soft">
        Warm-up: two to three easy minutes until your body feels ready.
      </p>

      <ol className="flex flex-col gap-3">
        {movement.exercises.map((exercise) => {
          const stateForExercise = exerciseState[exercise.sequenceNumber];
          return (
            <li
              key={exercise.sequenceNumber}
              className={cn(
                "rounded-2xl border border-transparent bg-white/40 p-3",
                stateForExercise?.done && "border-quiet-mint",
                stateForExercise?.skipped && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">
                    {exercise.sequenceNumber}. {exercise.displayName}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {exercise.sets ? `${exercise.sets} sets` : null}
                    {exercise.reps ? ` × ${exercise.reps}` : null}
                    {exercise.durationSeconds
                      ? ` ${Math.round(exercise.durationSeconds / 60)} min`
                      : null}
                    {exercise.restSeconds ? ` · rest ${exercise.restSeconds}s` : null}
                  </p>
                  {exercise.intensityGuidance ? (
                    <p className="text-xs text-ink-muted">{exercise.intensityGuidance}</p>
                  ) : null}
                </div>
                {started ? (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant={stateForExercise?.done ? "primary" : "soft"}
                      onClick={() =>
                        patchExercise(exercise.sequenceNumber, {
                          done: !stateForExercise?.done,
                          skipped: false,
                        })
                      }
                    >
                      {stateForExercise?.done ? "✓ Done" : "Mark done"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        patchExercise(exercise.sequenceNumber, { skipped: true, done: false })
                      }
                    >
                      Skip
                    </Button>
                  </div>
                ) : null}
              </div>
              {started ? (
                <details className="mt-2 text-sm text-ink-soft">
                  <summary className="min-h-6 cursor-pointer text-ink">
                    Adjust (weight, modification)
                  </summary>
                  <div className="mt-2 flex flex-col gap-2">
                    <NumberField
                      label="Weight used"
                      unit="lbs"
                      min={0}
                      max={2000}
                      value={stateForExercise?.weightLbs ?? null}
                      onChange={(weightLbs) =>
                        patchExercise(exercise.sequenceNumber, { weightLbs })
                      }
                    />
                    {exercise.modificationNotes ? (
                      <Toggle
                        label="Used the modification"
                        description={exercise.modificationNotes}
                        checked={stateForExercise?.usedModification ?? false}
                        onChange={(usedModification) =>
                          patchExercise(exercise.sequenceNumber, { usedModification })
                        }
                      />
                    ) : null}
                  </div>
                </details>
              ) : null}
            </li>
          );
        })}
      </ol>

      <details className="text-sm text-ink-soft">
        <summary className="min-h-6 cursor-pointer font-medium text-ink">
          Stop conditions — honored, never pushed through
        </summary>
        <ul className="mt-2 list-disc pl-5">
          {stopConditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      </details>

      <p className="text-sm text-ink-soft">
        Cool-down: a couple of quiet minutes of easy stretching and slow breathing.
      </p>

      {started ? (
        <div className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium text-ink">
              Anything to note? (Optional — this shapes tomorrow.)
            </legend>
            <Toggle label="Pain during the session" checked={painDuring} onChange={setPainDuring} />
            {restoreActive ? (
              <>
                <Toggle
                  label="Doming or coning"
                  checked={domingOrConing}
                  onChange={setDomingOrConing}
                />
                <Toggle
                  label="Pelvic-floor symptom (pressure, heaviness, leaking)"
                  checked={pelvicSymptom}
                  onChange={setPelvicSymptom}
                />
              </>
            ) : null}
            <label className="mt-1 flex flex-col gap-1 text-sm text-ink">
              Notes
              <input
                type="text"
                maxLength={500}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="glass-surface min-h-11 rounded-2xl px-4 py-2 text-ink"
              />
            </label>
          </fieldset>
          {(painDuring || domingOrConing || pelvicSymptom) && (
            <InlineNotice tone="info">
              Thank you for the honesty — stopping or modifying was exactly right. Saelis will
              gentle tomorrow&apos;s plan and, if this keeps happening, suggest professional
              support.
            </InlineNotice>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={state === "saving"} onClick={() => finish("completed")}>
              {state === "saving" ? "Saving…" : "Complete workout"}
            </Button>
            <Button variant="soft" disabled={state === "saving"} onClick={() => finish("partial")}>
              Finish here — partial counts
            </Button>
            <Button variant="ghost" onClick={() => setStarted(false)}>
              Pause
            </Button>
          </div>
          {state === "error" && error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
        </div>
      ) : null}
    </section>
  );
}
