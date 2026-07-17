import { describe, expect, it } from "vitest";

import { computeNutritionTargets } from "./engine";
import { generateMealPlan, replaceMealInPlan, type MealPlanGeneratorInput } from "./meal-plan";

import type { MealTemplateRow } from "@/types/wellness";

let idCounter = 0;
const now = "2026-07-17T00:00:00Z";

function meal(
  partial: Partial<MealTemplateRow> & {
    slug: string;
    name: string;
    meal_type: MealTemplateRow["meal_type"];
  },
): MealTemplateRow {
  return {
    id: `meal-${idCounter++}`,
    description: `${partial.name} description`,
    preparation_minutes: 15,
    servings: 2,
    estimated_calories: 400,
    protein_grams: 30,
    carbohydrates_grams: 40,
    fat_grams: 12,
    fiber_grams: 5,
    iron_rich: false,
    pathway_tags: ["phoenix", "nourish"],
    breastfeeding_compatible: true,
    freezer_friendly: false,
    budget_tier: "low",
    dietary_tags: [],
    allergen_tags: [],
    ingredients: ["chicken", "rice", "spinach"],
    instructions: ["Cook."],
    active: true,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

const mealTemplates: MealTemplateRow[] = [
  meal({
    slug: "protein-oatmeal",
    name: "Protein oatmeal",
    meal_type: "breakfast",
    allergen_tags: ["dairy", "gluten"],
  }),
  meal({
    slug: "yogurt-bowl",
    name: "Greek yogurt bowl",
    meal_type: "breakfast",
    allergen_tags: ["dairy"],
  }),
  meal({
    slug: "egg-wrap",
    name: "Egg wrap",
    meal_type: "breakfast",
    allergen_tags: ["egg", "gluten"],
  }),
  meal({ slug: "chicken-bowl", name: "Chicken rice bowl", meal_type: "lunch" }),
  meal({
    slug: "tuna-salad",
    name: "Tuna and bean salad",
    meal_type: "lunch",
    allergen_tags: ["fish"],
  }),
  meal({
    slug: "beef-bowl",
    name: "Iron-supportive beef bowl",
    meal_type: "dinner",
    iron_rich: true,
    ingredients: ["beef", "lentils", "rice"],
  }),
  meal({ slug: "sheet-pan-chicken", name: "Sheet-pan chicken", meal_type: "dinner" }),
  meal({
    slug: "shrimp-bowl",
    name: "Shrimp bowl",
    meal_type: "dinner",
    allergen_tags: ["shellfish"],
  }),
  meal({
    slug: "cottage-plate",
    name: "Cottage cheese plate",
    meal_type: "snack",
    allergen_tags: ["dairy"],
  }),
];

const targets = computeNutritionTargets({
  ageYears: 34,
  heightInches: 65,
  currentWeightLbs: 180,
  targetWeightLbs: 155,
  goalTypes: ["weight_management"],
  activePathways: ["phoenix", "nourish"],
  weeklyTrainingDays: 3,
  tracksCalories: true,
});

const base: MealPlanGeneratorInput = {
  userId: "user-1",
  weekStartDate: "2026-07-20",
  mealTemplates,
  targets,
  activePathways: ["phoenix", "nourish"],
  tracksCalories: true,
};

describe("meal-plan generator", () => {
  it("builds seven days with meals, snacks, grocery list, and prep plan", () => {
    const plan = generateMealPlan(base);
    expect(plan.planInput.planData.days).toHaveLength(7);
    expect(plan.planInput.planData.days[0]!.breakfastSlug).toBeTruthy();
    expect(plan.groceryList.length).toBeGreaterThan(0);
    expect(plan.prepPlan.length).toBeGreaterThan(0);
    expect(plan.planInput.planData.estimateNotice).toBe(true);
  });

  it("is deterministic per user + week", () => {
    expect(generateMealPlan(base)).toEqual(generateMealPlan(base));
    expect(generateMealPlan({ ...base, weekStartDate: "2026-07-27" })).not.toEqual(
      generateMealPlan(base),
    );
  });

  it("excludes allergens absolutely", () => {
    const plan = generateMealPlan({ ...base, foodAllergies: ["shellfish", "fish"] });
    const slugs = plan.planInput.planData.days.flatMap((day) => [
      day.breakfastSlug,
      day.lunchSlug,
      day.dinnerSlug,
      ...day.snackSlugs,
    ]);
    expect(slugs).not.toContain("shrimp-bowl");
    expect(slugs).not.toContain("tuna-salad");
  });

  it("respects vegetarian dietary patterns", () => {
    const plan = generateMealPlan({ ...base, dietaryPattern: "vegetarian" });
    const slugs = plan.planInput.planData.days.flatMap((day) => [day.lunchSlug, day.dinnerSlug]);
    expect(slugs).not.toContain("chicken-bowl");
    expect(slugs).not.toContain("beef-bowl");
  });

  it("omits calorie numbers when tracking is disabled", () => {
    const noCalories = generateMealPlan({
      ...base,
      tracksCalories: false,
      targets: {
        ...targets,
        estimatedCalorieTarget: null,
        calorieRangeLow: null,
        calorieRangeHigh: null,
      },
    });
    expect(noCalories.planInput.calorieTarget).toBeNull();
    expect(noCalories.approximateDailyCalories).toBeNull();
  });

  it("prioritizes iron-rich dinners when iron support is relevant", () => {
    const plan = generateMealPlan({ ...base, ironSupportive: true });
    const dinners = plan.planInput.planData.days.map((day) => day.dinnerSlug);
    expect(dinners).toContain("beef-bowl");
  });

  it("replaces one meal without touching the rest of the week", () => {
    const plan = generateMealPlan(base);
    const day = plan.planInput.planData.days[2]!;
    const updated = replaceMealInPlan(plan.planInput.planData, day.date, "dinner", base);
    expect(updated.days[2]!.dinnerSlug).not.toBe(day.dinnerSlug);
    expect(updated.days[2]!.breakfastSlug).toBe(day.breakfastSlug);
    expect(updated.days[0]).toEqual(plan.planInput.planData.days[0]);
  });
});
