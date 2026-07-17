"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { generateWeeklyMealPlan, logMeal, replaceMeal } from "@/app/(app)/wellness-plan-actions";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";

import type { MealPlanInput } from "@/lib/validation/wellness";

export interface MealPlanViewProps {
  weekStartDate: string;
  today: string;
  nutritionModeLabel: string;
  tracksCalories: boolean;
  proteinTargetGrams: number | null;
  calorieRange: { low: number; high: number } | null;
  planData: MealPlanInput["planData"] | null;
  mealNames: Record<
    string,
    { name: string; proteinGrams: number | null; calories: number | null; ironRich: boolean }
  >;
  groceryList: string[];
  filtersLabel: string | null;
}

export function MealPlanView(props: MealPlanViewProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function run(
    key: string,
    action: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
  ) {
    setBusy(key);
    setNotice(null);
    const result = await action();
    setBusy(null);
    setNotice(
      result.ok
        ? { tone: "success", text: success }
        : { tone: "error", text: result.error ?? "That didn't save — please try again." },
    );
    if (result.ok) router.refresh();
  }

  if (!props.planData) {
    return (
      <section className="glass-surface flex flex-col gap-4 p-6">
        <p className="text-ink">No meal plan for this week yet.</p>
        <p className="text-sm text-ink-soft">
          Saelis builds it from your preferences and allergies — deterministically, with estimates
          clearly labeled.
        </p>
        <div>
          <Button
            disabled={busy !== null}
            onClick={() =>
              run(
                "generate",
                () => generateWeeklyMealPlan({ weekStartDate: props.weekStartDate }),
                "Your week is ready.",
              )
            }
          >
            {busy ? "Preparing…" : "Build this week's meals"}
          </Button>
        </div>
        {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}
      </section>
    );
  }

  const meal = (slug: string | null) => (slug ? props.mealNames[slug] : undefined);

  return (
    <div className="flex flex-col gap-5">
      <section className="glass-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-ink">Week of {props.weekStartDate}</p>
          <p className="text-sm text-ink-soft">
            {props.nutritionModeLabel}
            {props.proteinTargetGrams ? ` · protein ~${props.proteinTargetGrams} g/day` : ""}
            {props.tracksCalories && props.calorieRange
              ? ` · ~${props.calorieRange.low}–${props.calorieRange.high} kcal`
              : ""}
          </p>
          {props.filtersLabel ? (
            <p className="text-xs text-ink-muted">Respecting: {props.filtersLabel}</p>
          ) : null}
        </div>
        <Button
          variant="soft"
          disabled={busy !== null}
          onClick={() =>
            run(
              "regenerate",
              () => generateWeeklyMealPlan({ weekStartDate: props.weekStartDate, refresh: true }),
              "The week was rebuilt.",
            )
          }
        >
          {busy === "regenerate" ? "Rebuilding…" : "Regenerate week"}
        </Button>
      </section>

      {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}
      <p className="text-sm text-ink-soft">
        All nutrition values are estimates — useful direction, never precision.
      </p>

      <ol className="flex flex-col gap-3">
        {props.planData.days.map((day) => (
          <li key={day.date} className="glass-surface flex flex-col gap-2 p-4">
            <p className="font-medium text-ink">
              {new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${day.date}T00:00:00Z`))}
              {day.date === props.today ? " · today" : ""}
            </p>
            {(
              [
                ["breakfast", day.breakfastSlug ?? null],
                ["lunch", day.lunchSlug ?? null],
                ["dinner", day.dinnerSlug ?? null],
              ] as const
            ).map(([mealType, slug]) => {
              const details = meal(slug);
              return (
                <div key={mealType} className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-ink">
                    <span className="text-ink-muted">{mealType}: </span>
                    {details?.name ?? "Your choice"}
                    {details?.ironRich ? (
                      <span className="ml-1 rounded-full bg-cloud-mint px-2 text-xs">
                        iron-rich
                      </span>
                    ) : null}
                    {details ? (
                      <span className="ml-1 text-xs text-ink-muted">
                        {details.proteinGrams ? `~${details.proteinGrams}g protein` : ""}
                        {props.tracksCalories && details.calories
                          ? ` · ~${details.calories} kcal`
                          : ""}
                      </span>
                    ) : null}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      disabled={busy !== null || !slug}
                      onClick={() =>
                        run(
                          `${day.date}-${mealType}-log`,
                          () =>
                            logMeal({
                              logDate: day.date,
                              mealType,
                              description: details?.name ?? mealType,
                              proteinGrams: details?.proteinGrams ?? null,
                              estimatedCalories: props.tracksCalories
                                ? (details?.calories ?? null)
                                : null,
                              ironRich: details?.ironRich ?? false,
                              loggedVia: "quick_add",
                              estimationNotice: true,
                            }),
                          "Logged.",
                        )
                      }
                    >
                      Log
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy !== null}
                      onClick={() =>
                        run(
                          `${day.date}-${mealType}-swap`,
                          () =>
                            replaceMeal({
                              weekStartDate: props.weekStartDate,
                              date: day.date,
                              mealType,
                            }),
                          "Swapped — the rest of the week is untouched.",
                        )
                      }
                    >
                      Swap
                    </Button>
                  </div>
                </div>
              );
            })}
            {day.snackSlugs.length > 0 ? (
              <p className="text-xs text-ink-soft">
                snack: {day.snackSlugs.map((slug) => meal(slug)?.name ?? slug).join(", ")}
              </p>
            ) : null}
          </li>
        ))}
      </ol>

      <details className="glass-surface p-4 text-sm text-ink-soft">
        <summary className="min-h-6 cursor-pointer font-medium text-ink">
          Grocery highlights ({props.groceryList.length})
        </summary>
        <ul className="mt-2 columns-2 gap-4">
          {props.groceryList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
      <p className="text-sm text-ink-soft">
        Repeats are deliberate — they lower cost, waste, and decision fatigue. Batch-prep dinners
        become the next day&apos;s lunch; any meal can become a favorite repeat.
      </p>
    </div>
  );
}
