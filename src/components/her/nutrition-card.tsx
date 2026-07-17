"use client";

import Link from "next/link";
import { useState } from "react";

import { logHydration, logMeal, quickAddProtein } from "@/app/(app)/wellness-plan-actions";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";

export interface NutritionCardProps {
  today: string;
  focus: string | null;
  proteinTargetGrams: number | null;
  proteinSoFarGrams: number;
  hydrationTargetOunces: number | null;
  hydrationSoFarOunces: number;
  calorieRange: { low: number; high: number } | null; // only when tracking on
  mealsLoggedToday: number;
  onLogged?: () => void;
}

function ProgressLine({
  label,
  current,
  target,
  unit,
}: {
  label: string;
  current: number;
  target: number | null;
  unit: string;
}) {
  const percent = target ? Math.min(100, Math.round((current / target) * 100)) : null;
  return (
    <div className="flex flex-col gap-1">
      <p className="flex justify-between text-sm text-ink">
        <span>{label}</span>
        <span>
          {Math.round(current)}
          {target ? ` / ~${target}` : ""} {unit}
        </span>
      </p>
      {percent !== null ? (
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${percent}% of today's estimate`}
          className="h-2 w-full rounded-full bg-cloud-lilac"
        >
          <div className="h-2 rounded-full bg-accent-lilac" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function NutritionCard(props: NutritionCardProps) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [water, setWater] = useState(props.hydrationSoFarOunces);
  const [protein, setProtein] = useState(props.proteinSoFarGrams);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setState("saving");
    setError(null);
    const result = await action();
    setState(result.ok ? "saved" : "error");
    if (!result.ok) setError(result.error ?? "That didn't save — please try again.");
    else props.onLogged?.();
    return result.ok;
  }

  return (
    <section
      aria-label="Nourishment and hydration"
      className="glass-surface flex flex-col gap-4 p-5"
    >
      <h2 className="text-lg font-semibold text-ink">Nourishment</h2>
      {props.focus ? <p className="text-ink-soft">{props.focus}</p> : null}
      {props.calorieRange ? (
        <p className="text-sm text-ink-soft">
          Estimated range: about {props.calorieRange.low}–{props.calorieRange.high} kcal. Estimates
          only — never a grade.
        </p>
      ) : null}

      <ProgressLine label="Protein" current={protein} target={props.proteinTargetGrams} unit="g" />
      <ProgressLine label="Water" current={water} target={props.hydrationTargetOunces} unit="oz" />

      <div className="flex flex-wrap gap-2" aria-label="Quick add">
        <Button
          variant="soft"
          disabled={state === "saving"}
          onClick={async () => {
            const next = water + 8;
            if (await run(() => logHydration({ metricDate: props.today, waterOunces: next })))
              setWater(next);
          }}
        >
          +8 oz water
        </Button>
        <Button
          variant="soft"
          disabled={state === "saving"}
          onClick={async () => {
            const next = water + 16;
            if (await run(() => logHydration({ metricDate: props.today, waterOunces: next })))
              setWater(next);
          }}
        >
          +16 oz water
        </Button>
        <Button
          variant="soft"
          disabled={state === "saving"}
          onClick={async () => {
            if (
              await run(() =>
                quickAddProtein({
                  logDate: props.today,
                  description: "Protein serving (quick add)",
                  proteinGrams: 25,
                }),
              )
            )
              setProtein((current) => current + 25);
          }}
        >
          + Protein serving (~25 g)
        </Button>
        <Button
          variant="soft"
          disabled={state === "saving"}
          onClick={() =>
            run(() =>
              logMeal({
                logDate: props.today,
                mealType: "snack",
                description: "Snack (quick log)",
                loggedVia: "quick_add",
                ironRich: false,
                estimationNotice: true,
              }),
            )
          }
        >
          Log a snack
        </Button>
      </div>

      <p aria-live="polite" className="text-sm text-ink-soft">
        {state === "saving" ? "Saving…" : state === "saved" ? "✓ Logged" : ""}
      </p>
      {state === "error" && error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

      <p className="text-sm text-ink-soft">
        {props.mealsLoggedToday > 0
          ? `${props.mealsLoggedToday} ${props.mealsLoggedToday === 1 ? "entry" : "entries"} logged today.`
          : "Nothing logged yet — no pressure, just a place when you want it."}{" "}
        <Link href="/wellness/her/meals" className="underline underline-offset-4">
          Weekly meal plan
        </Link>
      </p>
    </section>
  );
}
