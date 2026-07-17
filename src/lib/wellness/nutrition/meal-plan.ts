/**
 * Saelis Her — deterministic weekly meal-plan generator.
 *
 * Pure: the caller supplies the seeded meal templates. Selection is seeded by
 * (userId, weekStartDate) so the same week regenerates identically, allergens
 * are excluded absolutely, and every nutrition value stays labeled as an
 * estimate. One meal can be replaced without regenerating the week.
 */
import { createSeededRandom } from "@/lib/sky/stars";

import type { MealTemplateRow } from "@/types/wellness";
import type { MealPlanInput } from "@/lib/validation/wellness";
import type { NutritionTargetsResult } from "@/lib/wellness/nutrition/engine";
import type { PathwayKey } from "@/lib/wellness/pathways/types";

export interface MealPlanGeneratorInput {
  userId: string;
  weekStartDate: string; // ISO Monday (or any chosen start)
  mealTemplates: readonly MealTemplateRow[];
  targets: NutritionTargetsResult;
  activePathways: readonly PathwayKey[];
  dietaryPattern?: string | null;
  foodAllergies?: readonly string[];
  foodDislikes?: readonly string[];
  budgetPreference?: string | null;
  mealPrepPreference?: string | null;
  quickMealsPreferred?: boolean;
  freezerFriendlyPreferred?: boolean;
  familyStyleMeals?: boolean;
  breastfeedingRelevant?: boolean;
  ironSupportive?: boolean;
  tracksCalories: boolean;
}

export interface GeneratedMealPlan {
  planInput: MealPlanInput;
  groceryList: string[];
  prepPlan: string[];
  leftoversStrategy: string;
  substitutionNotes: string[];
  approximateDailyProteinGrams: number | null;
  approximateDailyCalories: number | null;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function excluded(template: MealTemplateRow, input: MealPlanGeneratorInput): boolean {
  const allergies = (input.foodAllergies ?? []).map((a) => a.toLowerCase());
  const dislikes = (input.foodDislikes ?? []).map((d) => d.toLowerCase());
  if (
    template.allergen_tags.some((tag) =>
      allergies.some((a) => tag.toLowerCase().includes(a) || a.includes(tag.toLowerCase())),
    )
  ) {
    return true;
  }
  const haystack = `${template.name} ${template.description}`.toLowerCase();
  if (allergies.some((a) => haystack.includes(a))) return true;
  if (dislikes.some((d) => haystack.includes(d))) return true;
  const pattern = (input.dietaryPattern ?? "").toLowerCase();
  if (pattern.includes("vegetarian") || pattern.includes("vegan")) {
    const meaty = ["chicken", "beef", "turkey", "salmon", "shrimp", "tuna", "fish"];
    if (meaty.some((m) => haystack.includes(m))) return true;
  }
  if (input.breastfeedingRelevant && template.breastfeeding_compatible === false) return true;
  return false;
}

function pool(input: MealPlanGeneratorInput, mealType: string): MealTemplateRow[] {
  const filtered = input.mealTemplates
    .filter((template) => template.active && template.meal_type === mealType)
    .filter((template) => !excluded(template, input))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  // Preference ordering (stable): iron-supportive first when relevant, then
  // quick / freezer / budget preferences.
  return filtered.sort((a, b) => {
    const score = (t: MealTemplateRow) =>
      (input.ironSupportive && t.iron_rich ? -4 : 0) +
      (input.quickMealsPreferred && (t.preparation_minutes ?? 99) <= 10 ? -2 : 0) +
      (input.freezerFriendlyPreferred && t.freezer_friendly ? -1 : 0) +
      (input.budgetPreference === "low" && t.budget_tier === "low" ? -1 : 0);
    return score(a) - score(b) || a.slug.localeCompare(b.slug);
  });
}

/** Deterministic pick with limited variety and deliberate repeats. */
function pickFor(
  candidates: readonly MealTemplateRow[],
  random: () => number,
  dayIndex: number,
  repeatEvery: number,
): MealTemplateRow | null {
  if (candidates.length === 0) return null;
  const rotation = Math.min(candidates.length, Math.max(2, repeatEvery));
  const offset = Math.floor(random() * rotation);
  return candidates[(dayIndex + offset) % rotation] ?? candidates[0] ?? null;
}

export function generateMealPlan(input: MealPlanGeneratorInput): GeneratedMealPlan {
  const random = createSeededRandom(`her-meals:${input.userId}:${input.weekStartDate}`);
  const breakfasts = pool(input, "breakfast");
  const lunches = pool(input, "lunch");
  const dinners = pool(input, "dinner");
  const snacks = pool(input, "snack");

  const batch = (input.mealPrepPreference ?? "").includes("batch");
  const repeatEvery = batch ? 2 : 3; // repeats reduce cost, waste, and decisions

  const days: MealPlanInput["planData"]["days"] = [];
  const usedSlugs = new Set<string>();
  const substitutionNotes: string[] = [];

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const date = addDays(input.weekStartDate, dayIndex);
    const breakfast = pickFor(breakfasts, random, dayIndex, repeatEvery);
    let lunch = pickFor(lunches, random, dayIndex, repeatEvery);
    const dinner = pickFor(dinners, random, dayIndex, repeatEvery);
    // Leftovers: with batch prep, yesterday's dinner becomes today's lunch.
    if (batch && dayIndex > 0 && days[dayIndex - 1]?.dinnerSlug) {
      lunch = input.mealTemplates.find((t) => t.slug === days[dayIndex - 1]?.dinnerSlug) ?? lunch;
    }
    const snack = pickFor(snacks, random, dayIndex, 2);
    for (const slug of [breakfast?.slug, lunch?.slug, dinner?.slug, snack?.slug]) {
      if (slug) usedSlugs.add(slug);
    }
    days.push({
      date,
      breakfastSlug: breakfast?.slug ?? null,
      lunchSlug: lunch?.slug ?? null,
      dinnerSlug: dinner?.slug ?? null,
      snackSlugs: snack ? [snack.slug] : [],
      notes: null,
    });
  }

  if (input.familyStyleMeals) {
    substitutionNotes.push(
      "Every dinner works family-style — plate components separately so each person builds their own.",
    );
  }
  substitutionNotes.push(
    "Any meal can be swapped for a repeat of another day — repeats are a feature, not a shortcut.",
  );
  if (input.quickMealsPreferred) {
    substitutionNotes.push("Quick options are prioritized; nothing requires a complex recipe.");
  }

  // Grocery highlights: union of ingredients from used templates (deduped).
  const grocery = new Set<string>();
  for (const slug of usedSlugs) {
    const template = input.mealTemplates.find((t) => t.slug === slug);
    if (!template || !Array.isArray(template.ingredients)) continue;
    for (const ingredient of template.ingredients) {
      if (typeof ingredient === "string") grocery.add(ingredient);
    }
  }

  const used = [...usedSlugs]
    .map((slug) => input.mealTemplates.find((t) => t.slug === slug))
    .filter((t): t is MealTemplateRow => t != null);
  const proteinAvg =
    used.length > 0
      ? Math.round((used.reduce((sum, t) => sum + (t.protein_grams ?? 0), 0) / used.length) * 3)
      : null;
  const calorieAvg =
    input.tracksCalories && used.length > 0
      ? Math.round(
          (used.reduce((sum, t) => sum + (t.estimated_calories ?? 0), 0) / used.length) * 3,
        )
      : null;

  const planInput: MealPlanInput = {
    weekStartDate: input.weekStartDate,
    activePathwayKeys: [...input.activePathways],
    calorieTarget: input.tracksCalories ? input.targets.estimatedCalorieTarget : null,
    calorieRangeLow: input.tracksCalories ? input.targets.calorieRangeLow : null,
    calorieRangeHigh: input.tracksCalories ? input.targets.calorieRangeHigh : null,
    proteinTargetGrams: input.targets.proteinTargetHighGrams,
    hydrationTargetOunces: input.targets.hydrationTargetOunces,
    planData: {
      days,
      groceryHighlights: [...grocery].slice(0, 40),
      estimateNotice: true,
    },
    generatedBy: "rules_engine",
  };

  return {
    planInput,
    groceryList: [...grocery],
    prepPlan: batch
      ? [
          "One batch session covers most of the week: cook dinner proteins and grains in doubles.",
          "Freeze anything you will not eat within three days.",
        ]
      : ["Cook fresh most days; keep two quick fallbacks (freezer burrito, snack plate) on hand."],
    leftoversStrategy: batch
      ? "Dinners are sized to become the next day's lunch."
      : "Double any dinner you love and carry it forward a day.",
    substitutionNotes,
    approximateDailyProteinGrams: proteinAvg,
    approximateDailyCalories: calorieAvg,
  };
}

/** Replace one meal without touching the rest of the week. Deterministic. */
export function replaceMealInPlan(
  planData: MealPlanInput["planData"],
  date: string,
  mealType: "breakfast" | "lunch" | "dinner",
  input: MealPlanGeneratorInput,
): MealPlanInput["planData"] {
  const candidates = pool(input, mealType);
  const day = planData.days.find((d) => d.date === date);
  if (!day || candidates.length === 0) return planData;
  const currentSlug =
    mealType === "breakfast"
      ? day.breakfastSlug
      : mealType === "lunch"
        ? day.lunchSlug
        : day.dinnerSlug;
  const next = candidates.find((t) => t.slug !== currentSlug) ?? candidates[0] ?? null;
  if (!next) return planData;
  return {
    ...planData,
    days: planData.days.map((d) =>
      d.date === date
        ? {
            ...d,
            breakfastSlug: mealType === "breakfast" ? next.slug : d.breakfastSlug,
            lunchSlug: mealType === "lunch" ? next.slug : d.lunchSlug,
            dinnerSlug: mealType === "dinner" ? next.slug : d.dinnerSlug,
          }
        : d,
    ),
  };
}
