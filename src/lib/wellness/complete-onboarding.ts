import {
  createEnrollment,
  getActiveEnrollmentForPathway,
} from "@/lib/db/queries/wellness/enrollments";
import { createGoal, listGoals } from "@/lib/db/queries/wellness/goals";
import { markOnboardingComplete } from "@/lib/db/queries/wellness/onboarding";
import { upsertNotificationPreferences } from "@/lib/db/queries/wellness/notifications";
import { upsertWomenWellnessProfile } from "@/lib/db/queries/wellness/profiles";
import { upsertPostpartumProfile } from "@/lib/db/queries/postpartum/profile";
import { canComplete } from "@/lib/wellness/onboarding";
import {
  notificationPreferencesSchema,
  onboardingDraftDataSchema,
  type OnboardingDraftData,
} from "@/lib/validation/wellness-onboarding";
import { womenWellnessProfileSchema } from "@/lib/validation/wellness";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { SafetyTier } from "@/lib/wellness/constants";

type Client = SupabaseClient<Database>;

/**
 * Completes Saelis Her onboarding: enrollments, profile, goals, notification
 * preferences, the Restore profile (Restore only), and a generation-ready
 * draft program record. Deterministic and idempotent-leaning: existing active
 * enrollments, goals, and programs are left alone.
 *
 * Safety: when Restore is selected and medical clearance is not 'cleared',
 * the draft program is created with safety_tier 'restricted' so the Phase 3
 * plan engine applies a safety hold / limited recovery guidance instead of
 * unrestricted exercise plans. That tier is deterministic — no LLM may
 * override it.
 */
export async function completeOnboarding(
  supabase: Client,
  userId: string,
  rawDraft: OnboardingDraftData,
): Promise<void> {
  const draft = onboardingDraftDataSchema.parse(rawDraft);
  if (!canComplete(draft)) {
    throw new Error("A few steps still need attention before setup can finish.");
  }
  const selected = draft.pathways ?? [];
  const goals = draft.goals;
  if (!goals) throw new Error("A few steps still need attention before setup can finish.");

  // 1. Enrollments (skip pathways that already have an active enrollment).
  const enrollmentIds = new Map<string, string>();
  for (const pathwayKey of selected) {
    const existing = await getActiveEnrollmentForPathway(supabase, userId, pathwayKey);
    if (existing) {
      enrollmentIds.set(pathwayKey, existing.id);
      continue;
    }
    const settings =
      pathwayKey === "phoenix" && draft.phoenix
        ? { phoenixStyle: draft.phoenix.style }
        : pathwayKey === "rhythm" && draft.rhythm
          ? { rhythmMode: draft.rhythm.mode }
          : {};
    const created = await createEnrollment(supabase, userId, { pathwayKey, settings });
    enrollmentIds.set(pathwayKey, created.id);
  }

  // 2. Shared profile (neutral — no postpartum details in here).
  const body = draft.body ?? {};
  const movement = draft.movement ?? {};
  const nutrition = draft.nutrition ?? {};
  const locations = new Set(movement.trainingLocations ?? []);
  if (movement.planetFitnessAccess) locations.add("planet_fitness");
  if (movement.walkingPreferred) locations.add("walking");
  const equipment = new Set(movement.homeEquipment ?? []);
  if (movement.pelotonAccess) equipment.add("peloton");

  const profileInput = womenWellnessProfileSchema.parse({
    dateOfBirth: body.dateOfBirth ?? null,
    heightInches: body.heightInches ?? null,
    currentWeightLbs: body.currentWeightLbs ?? null,
    targetWeightLbs: body.targetWeightLbs ?? null,
    goalTimeframeMonths: body.goalTimeframeMonths ?? null,
    unitsPreference: body.unitsPreference ?? "imperial",
    tracksWeight: body.tracksWeight ?? true,
    tracksCalories: nutrition.tracksCalories ?? body.tracksCalories ?? true,
    weighsDaily: body.weighsDaily ?? false,
    movementExperience: movement.movementExperience ?? "beginner",
    preferredTrainingLocations: [...locations],
    availableEquipment: [...equipment],
    preferredWorkoutDays: movement.preferredWorkoutDays ?? 3,
    preferredWorkoutMinutes: movement.preferredWorkoutMinutes ?? 30,
    movementLimitations: movement.movementLimitations ?? [],
    movementDislikes: movement.movementDislikes ?? [],
    floorTransitionsDifficult:
      (movement.floorTransitionsDifficult ?? false) ||
      (draft.restore?.floorTransitionsUncomfortable ?? false),
    prefersBeginnerExplanations: movement.prefersBeginnerExplanations ?? false,
    dietaryPattern: nutrition.dietaryPattern ?? null,
    foodAllergies: nutrition.foodAllergies ?? [],
    foodDislikes: nutrition.foodDislikes ?? [],
    householdMealPreferences: nutrition.householdMealPreferences ?? null,
    budgetPreference: nutrition.budgetPreference ?? null,
    mealPrepPreference: nutrition.mealPrepPreference ?? null,
    quickMealsPreferred: nutrition.quickMealsPreferred ?? false,
    proteinFamiliarity: nutrition.proteinFamiliarity ?? null,
    portionGuidancePreferred: nutrition.portionGuidancePreferred ?? false,
    familyStyleMeals: nutrition.familyStyleMeals ?? false,
    cycleTrackingEnabled: selected.includes("rhythm") && draft.rhythm?.mode === "symptom-led",
    postpartumPathwayRelevant: selected.includes("restore"),
    notificationStyle: draft.notifications?.reminderStyle ?? "gentle",
  });
  await upsertWomenWellnessProfile(supabase, userId, profileInput);

  // 3. Goals (only when none exist yet, so re-completion never duplicates).
  const existingGoals = await listGoals(supabase, userId);
  if (existingGoals.length === 0) {
    for (const goalType of goals.goalTypes) {
      await createGoal(supabase, userId, {
        goalType,
        priority: goalType === goals.primaryGoal ? 1 : 2,
        status: "active",
        targetNumeric: null,
        targetUnit: null,
        targetDate: null,
        enrollmentId: null,
        pathwayKey: null,
      });
    }
  }

  // 4. Notification preferences.
  await upsertNotificationPreferences(
    supabase,
    userId,
    notificationPreferencesSchema.parse(draft.notifications ?? {}),
  );

  // 5. Restore profile — only through the isolated postpartum service.
  if (selected.includes("restore") && draft.restore) {
    const restoreEnrollmentId = enrollmentIds.get("restore");
    if (!restoreEnrollmentId) throw new Error("Could not finish Restore setup.");
    // floorTransitionsUncomfortable already merged into the shared profile above.
    const intake = { ...draft.restore };
    delete (intake as { floorTransitionsUncomfortable?: boolean }).floorTransitionsUncomfortable;
    await upsertPostpartumProfile(supabase, userId, {
      ...intake,
      enrollmentId: restoreEnrollmentId,
    });
  }

  // 6. Generation-ready draft program (placeholder — Phase 3 builds the engine).
  const safetyTier: SafetyTier =
    selected.includes("restore") && draft.restore?.medicalClearanceStatus !== "cleared"
      ? "restricted"
      : selected.includes("restore")
        ? "postpartum"
        : "standard";
  const { data: existingProgram } = await supabase
    .from("wellness_programs")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["draft", "active"])
    .limit(1)
    .maybeSingle();
  if (!existingProgram) {
    const start = new Date();
    const end = new Date(start.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("wellness_programs").insert({
      user_id: userId,
      status: "draft",
      version: 1,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
      total_weeks: 12,
      primary_goal: goals.primaryGoal,
      weekly_training_days: movement.preferredWorkoutDays ?? 3,
      nutrition_strategy:
        (nutrition.tracksCalories ?? body.tracksCalories ?? true)
          ? "estimated_calorie_range"
          : "habit_based",
      safety_tier: safetyTier,
      active_pathway_keys: [...selected],
      generated_from_profile_version: new Date().toISOString(),
      rationale:
        safetyTier === "restricted"
          ? "Awaiting generation. Safety hold: medical clearance not reported as cleared — the plan engine will offer education, hydration, nourishment, check-ins, and gentle recovery guidance only."
          : "Awaiting generation by the Phase 3 plan engine.",
    });
    if (error) throw new Error("Could not prepare your program.");
  }

  // 7. Completion stamp (clears the draft payload, including Restore answers).
  await markOnboardingComplete(supabase, userId);
}
