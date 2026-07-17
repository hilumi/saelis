"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { saveEveningReflection } from "@/app/(app)/wellness-actions";
import { adaptPlanForTime, saveDailyCheckInAction } from "@/app/(app)/wellness-plan-actions";
import { NumberField, RadioChips } from "@/components/her/fields";
import { NutritionCard, type NutritionCardProps } from "@/components/her/nutrition-card";
import { RestoreCard, type RestoreCardProps } from "@/components/her/restore-card";
import { WorkoutCard } from "@/components/her/workout-card";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { READINESS_STATES, type ReadinessState } from "@/lib/wellness/constants";
import type { PlanPresentation } from "@/lib/wellness/planner/present";
import type { MovementPlan, RecoveryPlan } from "@/lib/validation/wellness";
import type { PathwayKey } from "@/lib/wellness/pathways/types";

export interface HerTodayProps {
  today: string;
  dateLabel: string;
  greetingName: string | null;
  pathwayNames: string[];
  pathways: PathwayKey[];
  programWeek: { weekNumber: number; phaseName: string; deload: boolean } | null;
  checkInDone: boolean;
  initialReadiness: ReadinessState | null;
  plan: {
    presentation: PlanPresentation;
    safetyMessage: string | null;
    adaptationLevel: string;
    movement: MovementPlan;
    recovery: RecoveryPlan;
    intensityNote: string | null;
  } | null;
  planError: boolean;
  nutrition: Omit<NutritionCardProps, "onLogged" | "today">;
  restore: Omit<RestoreCardProps, "onSaved" | "today"> | null;
  resetActive: boolean;
  stopConditions: string[];
  milestoneMessage: string | null;
  reflectionSaved: boolean;
}

const READINESS_LABELS: Record<ReadinessState, string> = {
  energized: "Energized",
  okay: "Okay",
  tired: "Tired",
  overwhelmed: "Overwhelmed",
  in_pain: "In pain",
};

const REFLECTION_PROMPTS = [
  "What is one thing you are proud of today?",
  "What felt easier than expected?",
  "What would make tomorrow more manageable?",
  "What did your body need today?",
] as const;

/**
 * Saelis Her Today — proactive, priority-ordered, progressively disclosed:
 * 1 safety · 2 readiness · 3 next best action · 4 movement/recovery ·
 * 5 nourishment · 6 progress/milestone · 7 additional actions.
 */
export function HerToday(props: HerTodayProps) {
  const router = useRouter();
  const [readiness, setReadiness] = useState<ReadinessState | null>(props.initialReadiness);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [extra, setExtra] = useState<{
    sleepHours: number | null;
    energy: number | null;
    stress: number | null;
    soreness: number | null;
    painLevel: number | null;
    availableMinutes: number | null;
  }>({
    sleepHours: null,
    energy: null,
    stress: null,
    soreness: null,
    painLevel: null,
    availableMinutes: null,
  });
  const [checkInState, setCheckInState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [quickBusy, setQuickBusy] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");
  const [reflectionState, setReflectionState] = useState<"idle" | "saving" | "saved" | "skipped">(
    props.reflectionSaved ? "saved" : "idle",
  );

  const presentation = props.plan?.presentation ?? null;
  const minimal = props.resetActive || (presentation?.minimumViableDay ?? false);

  async function submitCheckIn(value: ReadinessState) {
    setReadiness(value);
    setCheckInState("saving");
    setCheckInError(null);
    const result = await saveDailyCheckInAction({
      checkInDate: props.today,
      readiness: value,
      sleepHours: extra.sleepHours,
      energy: extra.energy,
      stress: extra.stress,
      soreness: extra.soreness,
      painLevel: extra.painLevel,
      availableMinutes: extra.availableMinutes,
      painLocation: [],
    });
    if (result.ok) {
      setCheckInState("saved");
      router.refresh(); // adapted plan re-renders without a full reload
    } else {
      setCheckInState("error");
      setCheckInError(result.error);
    }
  }

  async function quick(action: string, request: Parameters<typeof adaptPlanForTime>[0]) {
    setQuickBusy(action);
    await adaptPlanForTime(request);
    setQuickBusy(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">
          {props.greetingName ? `Today, ${props.greetingName}.` : "Today."}
        </h1>
        <p className="text-ink-soft">
          {props.dateLabel}
          {props.pathwayNames.length > 0 ? ` · ${props.pathwayNames.join(" · ")}` : ""}
          {props.programWeek
            ? ` · Week ${props.programWeek.weekNumber}, ${props.programWeek.phaseName}${props.programWeek.deload ? " (lighter week)" : ""}`
            : ""}
        </p>
      </header>

      {/* 1 — Safety first, always. */}
      {props.plan?.safetyMessage ? (
        <InlineNotice tone={presentation?.urgent ? "error" : "info"}>
          {props.plan.safetyMessage}
        </InlineNotice>
      ) : null}

      {/* 2 — Readiness check-in. */}
      {!presentation?.urgent ? (
        <section aria-label="Readiness check-in" className="glass-surface flex flex-col gap-3 p-5">
          <h2 className="text-lg font-semibold text-ink">How are you arriving today?</h2>
          <RadioChips
            legend="Readiness"
            options={READINESS_STATES.map((value) => ({
              value,
              label: READINESS_LABELS[value],
            }))}
            value={readiness}
            onChange={submitCheckIn}
          />
          <details
            open={detailsOpen}
            onToggle={(event) => setDetailsOpen((event.target as HTMLDetailsElement).open)}
            className="text-sm"
          >
            <summary className="min-h-6 cursor-pointer text-ink-soft">
              More detail (optional — sleep, stress, time, pain)
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Sleep hours"
                min={0}
                max={24}
                step={0.5}
                value={extra.sleepHours}
                onChange={(sleepHours) => setExtra((c) => ({ ...c, sleepHours }))}
              />
              <NumberField
                label="Energy (1–5)"
                min={1}
                max={5}
                value={extra.energy}
                onChange={(energy) => setExtra((c) => ({ ...c, energy }))}
              />
              <NumberField
                label="Stress (1–5)"
                min={1}
                max={5}
                value={extra.stress}
                onChange={(stress) => setExtra((c) => ({ ...c, stress }))}
              />
              <NumberField
                label="Soreness (0–5)"
                min={0}
                max={5}
                value={extra.soreness}
                onChange={(soreness) => setExtra((c) => ({ ...c, soreness }))}
              />
              <NumberField
                label="Pain (0–10)"
                min={0}
                max={10}
                value={extra.painLevel}
                onChange={(painLevel) => setExtra((c) => ({ ...c, painLevel }))}
              />
              <NumberField
                label="Minutes available"
                min={0}
                max={300}
                value={extra.availableMinutes}
                onChange={(availableMinutes) => setExtra((c) => ({ ...c, availableMinutes }))}
              />
            </div>
            {readiness ? (
              <Button
                className="mt-3"
                variant="soft"
                disabled={checkInState === "saving"}
                onClick={() => submitCheckIn(readiness)}
              >
                Update with details
              </Button>
            ) : null}
          </details>
          <p aria-live="polite" className="text-sm text-ink-soft">
            {checkInState === "saving"
              ? "Adapting today's plan…"
              : checkInState === "saved"
                ? (presentation?.adaptationExplanation ?? "Noted — today's plan listened.")
                : ""}
          </p>
          {checkInState === "error" && checkInError ? (
            <InlineNotice tone="error">{checkInError}</InlineNotice>
          ) : null}
        </section>
      ) : null}

      {/* 3 — Next best action. */}
      {presentation ? (
        <section aria-label="Next best action" className="glass-surface flex flex-col gap-2 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">
            {minimal ? "A care day — three things, nothing more" : "Next best action"}
          </h2>
          <p className="text-lg text-ink">{presentation.nextBestAction}</p>
          {presentation.additionalActions.map((action) => (
            <p key={action} className="text-ink-soft">
              · {action}
            </p>
          ))}
          {minimal ? (
            <p className="text-sm text-ink-soft">
              A reduced day is intentional care, not falling short.
            </p>
          ) : null}
        </section>
      ) : props.planError ? (
        <InlineNotice tone="info">
          Today&apos;s plan could not be prepared just now. Nothing is lost — try again in a moment,
          or simply start with water and a nourishing meal.
        </InlineNotice>
      ) : (
        <section className="glass-surface flex flex-col gap-2 p-5">
          <p className="text-ink">No plan yet for today.</p>
          <div>
            <Button
              disabled={quickBusy !== null}
              onClick={() => quick("generate", { date: props.today, refresh: false })}
            >
              {quickBusy ? "Preparing…" : "Prepare today's plan"}
            </Button>
          </div>
        </section>
      )}

      {/* Quick actions (deterministic services — never chat-only). */}
      {!presentation?.urgent && !presentation?.safetyHold ? (
        <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
          {(
            [
              ["10 minutes", { quickSelection: "ten_minutes" }],
              ["20 minutes", { quickSelection: "twenty_minutes" }],
              ["Planet Fitness", { quickSelection: "planet_fitness" }],
              ["Peloton", { quickSelection: "peloton" }],
              ["Home workout", { quickSelection: "home" }],
              ["No floor today", { quickSelection: "no_floor" }],
              ["I'm exhausted", { quickSelection: "tired" }],
              ["I'm overwhelmed", { quickSelection: "overwhelmed" }],
            ] as const
          ).map(([label, params]) => (
            <Button
              key={label}
              variant="soft"
              disabled={quickBusy !== null}
              onClick={() => quick(label, { date: props.today, refresh: true, ...params })}
            >
              {quickBusy === label ? "…" : label}
            </Button>
          ))}
          <Link
            href="/wellness/her/meals"
            className="inline-flex min-h-11 items-center rounded-full bg-cloud-lilac px-5 text-base font-medium text-ink hover:bg-sky-lilac"
          >
            Help me choose a meal
          </Link>
          <Link
            href="/conversation"
            className="inline-flex min-h-11 items-center rounded-full px-5 text-base text-ink-soft hover:bg-cloud-lilac/60"
          >
            Talk to Saelis
          </Link>
        </nav>
      ) : presentation?.safetyHold && !presentation.urgent ? (
        <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
          <Link
            href="/conversation"
            className="inline-flex min-h-11 items-center rounded-full bg-cloud-lilac px-5 text-base font-medium text-ink hover:bg-sky-lilac"
          >
            Talk to Saelis
          </Link>
        </nav>
      ) : null}

      {/* 4 — Movement / recovery (blocked cards never render under a hold). */}
      {props.plan && !presentation?.safetyHold && !props.plan.movement.restDay && !minimal ? (
        <WorkoutCard
          today={props.today}
          movement={props.plan.movement}
          intensityGuidance={props.plan.intensityNote}
          stopConditions={props.stopConditions}
          restoreActive={props.restore !== null}
          pathways={props.pathways}
          onLogged={() => router.refresh()}
        />
      ) : null}
      {props.plan && !presentation?.safetyHold && (props.plan.movement.restDay || minimal) ? (
        <section aria-label="Recovery" className="glass-surface flex flex-col gap-2 p-5">
          <h2 className="text-lg font-semibold text-ink">Recovery</h2>
          <p className="text-ink-soft">
            {props.plan.recovery.activities.length > 0
              ? props.plan.recovery.activities.join(" · ")
              : "Gentle movement or rest — both count fully."}
          </p>
          {props.plan.recovery.sleepFocus ? (
            <p className="text-sm text-ink-soft">{props.plan.recovery.sleepFocus}</p>
          ) : null}
        </section>
      ) : null}

      {/* 5 — Nourishment and hydration (hidden metrics on minimal days). */}
      {!presentation?.urgent && !minimal ? (
        <NutritionCard {...props.nutrition} today={props.today} onLogged={() => router.refresh()} />
      ) : null}

      {/* Restore — discreet, Restore-only. */}
      {props.restore && !presentation?.urgent ? (
        <RestoreCard {...props.restore} today={props.today} onSaved={() => router.refresh()} />
      ) : null}

      {/* 6 — Progress / milestone. */}
      {props.milestoneMessage && !presentation?.urgent ? (
        <section aria-label="Milestone" className="glass-surface flex items-center gap-3 p-4">
          <span aria-hidden="true">✦</span>
          <p className="text-ink">{props.milestoneMessage}</p>
          <Link
            href="/wellness/her/progress"
            className="ml-auto text-sm text-ink-soft underline underline-offset-4"
          >
            Progress
          </Link>
        </section>
      ) : null}

      {/* 7 — Evening reflection (optional, skippable). */}
      {!presentation?.urgent ? (
        <section
          id="reflection"
          aria-label="Evening reflection"
          className="glass-surface flex flex-col gap-2 p-5"
        >
          <h2 className="text-lg font-semibold text-ink">Evening reflection</h2>
          {reflectionState === "saved" ? (
            <p className="text-ink-soft" role="status">
              ✓ Kept. Reflections stay private to you.
            </p>
          ) : reflectionState === "skipped" ? (
            <p className="text-ink-soft">Skipped — always optional.</p>
          ) : (
            <>
              <p className="text-ink-soft">{REFLECTION_PROMPTS[0]}</p>
              <label className="flex flex-col gap-1 text-sm text-ink">
                A sentence is plenty
                <input
                  type="text"
                  maxLength={500}
                  value={reflection}
                  onChange={(event) => setReflection(event.target.value)}
                  className="glass-surface min-h-11 rounded-2xl px-4 py-2 text-ink"
                />
              </label>
              <div className="flex gap-2">
                <Button
                  variant="soft"
                  disabled={reflectionState === "saving" || reflection.trim().length === 0}
                  onClick={async () => {
                    setReflectionState("saving");
                    const result = await saveEveningReflection({
                      checkInDate: props.today,
                      reflection: reflection.trim(),
                    });
                    setReflectionState(result.ok ? "saved" : "idle");
                  }}
                >
                  Keep it
                </Button>
                <Button variant="ghost" onClick={() => setReflectionState("skipped")}>
                  Skip
                </Button>
              </div>
              <p className="text-xs text-ink-muted">
                Private to you; stored with today&apos;s check-in and deletable anytime.
              </p>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
