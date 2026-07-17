import { MealPlanView } from "@/components/her/meal-plan-view";
import { ScreenHeader } from "@/components/layout/screen-header";
import { requireUser } from "@/lib/auth/require-user";
import { listMealTemplates } from "@/lib/db/queries/wellness/libraries";
import { getMealPlan } from "@/lib/db/queries/wellness/meal-plans";
import { getProfile } from "@/lib/db/queries/profile";
import { getWomenWellnessProfile } from "@/lib/db/queries/wellness/profiles";
import { createClient } from "@/lib/supabase/server";
import { localDayISO, weekStartISO } from "@/lib/wellness/dates";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Saelis Her — Meals" };

export default async function HerMealsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  let timezone: string | null = null;
  let tracksCalories = true;
  let filters: string[] = [];
  let planData = null;
  let calorieRange: { low: number; high: number } | null = null;
  let proteinTarget: number | null = null;
  const mealNames: Record<
    string,
    { name: string; proteinGrams: number | null; calories: number | null; ironRich: boolean }
  > = {};
  let grocery: string[] = [];

  try {
    const [profileRow, herProfile] = await Promise.all([
      getProfile(supabase, user.id),
      getWomenWellnessProfile(supabase, user.id),
    ]);
    timezone = profileRow?.timezone ?? null;
    tracksCalories = herProfile?.tracks_calories ?? true;
    filters = [
      ...(herProfile?.food_allergies ?? []).map((allergy) => `no ${allergy}`),
      ...(herProfile?.dietary_pattern ? [herProfile.dietary_pattern] : []),
    ];

    const weekStart = weekStartISO(localDayISO(timezone));
    const [plan, templates] = await Promise.all([
      getMealPlan(supabase, user.id, weekStart),
      listMealTemplates(supabase),
    ]);
    for (const template of templates) {
      mealNames[template.slug] = {
        name: template.name,
        proteinGrams: template.protein_grams,
        calories: template.estimated_calories,
        ironRich: template.iron_rich,
      };
    }
    if (plan) {
      planData = plan.planData;
      grocery = plan.planData.groceryHighlights;
      proteinTarget = plan.row.protein_target_grams;
      calorieRange =
        tracksCalories && plan.row.calorie_range_low != null && plan.row.calorie_range_high != null
          ? { low: plan.row.calorie_range_low, high: plan.row.calorie_range_high }
          : null;
    }
  } catch {
    // Renders the empty/build state below.
  }

  const today = localDayISO(timezone);
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        title="This week's meals"
        subtitle="Practical, repeatable, and always an estimate — never a rulebook."
      />
      <MealPlanView
        weekStartDate={weekStartISO(today)}
        today={today}
        nutritionModeLabel={
          tracksCalories ? "Estimated calorie range" : "Habit-based (no calorie counting)"
        }
        tracksCalories={tracksCalories}
        proteinTargetGrams={proteinTarget}
        calorieRange={calorieRange}
        planData={planData}
        mealNames={mealNames}
        groceryList={grocery}
        filtersLabel={filters.length > 0 ? filters.join(", ") : null}
      />
    </div>
  );
}
