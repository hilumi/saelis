/**
 * Saelis Her — planner persistence service.
 *
 * Bridges the pure engines and the database. Idempotent: generating a plan
 * for a (user, date) returns the stored plan unless an explicit refresh is
 * requested, in which case the stored plan is replaced (upsert on the unique
 * (user, plan_date) key). Nothing sensitive is ever logged.
 */
import { getPostpartumCheckIn } from "@/lib/db/queries/postpartum/check-ins";
import { getPostpartumProfile } from "@/lib/db/queries/postpartum/profile";
import { getDailyCheckIn } from "@/lib/db/queries/wellness/check-ins";
import { listActiveEnrollments } from "@/lib/db/queries/wellness/enrollments";
import { listGoals } from "@/lib/db/queries/wellness/goals";
import {
  listExercises,
  listMealTemplates,
  listWorkoutTemplates,
} from "@/lib/db/queries/wellness/libraries";
import { getMealPlan, upsertMealPlan } from "@/lib/db/queries/wellness/meal-plans";
import {
  createProgramWithWeeks,
  getActiveProgram,
  getCurrentProgramWeek,
} from "@/lib/db/queries/wellness/programs";
import {
  getDailyPlan,
  upsertDailyPlan,
  type ValidatedDailyPlan,
} from "@/lib/db/queries/wellness/plans";
import { getWomenWellnessProfile } from "@/lib/db/queries/wellness/profiles";
import { listWorkoutLogs } from "@/lib/db/queries/wellness/logs";
import { computeDailyPlan, type DailyPlanEngineResult } from "@/lib/wellness/planner/daily-plan";
import { computeNutritionTargets } from "@/lib/wellness/nutrition/engine";
import { generateMealPlan, replaceMealInPlan } from "@/lib/wellness/nutrition/meal-plan";
import { generateProgram } from "@/lib/wellness/programs/generator";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/types";
import type { FeedingStatus, GoalType, ReadinessState } from "@/lib/wellness/constants";
import type { PathwayKey } from "@/lib/wellness/pathways/types";
import type { QuickSelection } from "@/lib/wellness/workouts/engine";

type Client = SupabaseClient<Database>;

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const born = new Date(`${dob}T00:00:00Z`).getTime();
  if (Number.isNaN(born)) return null;
  return Math.floor((Date.now() - born) / (365.25 * 24 * 60 * 60 * 1000));
}

interface PlannerContext {
  pathways: PathwayKey[];
  profile: Tables<"women_wellness_profiles"> | null;
  postpartum: Tables<"postpartum_profiles"> | null;
  checkIn: Tables<"wellness_daily_check_ins"> | null;
  ppCheckIn: Tables<"postpartum_check_ins"> | null;
  goals: Tables<"wellness_goals">[];
  recentWorkouts: Tables<"wellness_workout_logs">[];
}

async function loadContext(
  supabase: Client,
  userId: string,
  date: string,
): Promise<PlannerContext> {
  const enrollments = await listActiveEnrollments(supabase, userId);
  const pathways = enrollments.map((enrollment) => enrollment.pathway_key);
  const restoreActive = pathways.includes("restore");
  const [profile, checkIn, goals, recentWorkouts, postpartum, ppCheckIn] = await Promise.all([
    getWomenWellnessProfile(supabase, userId),
    getDailyCheckIn(supabase, userId, date),
    listGoals(supabase, userId),
    listWorkoutLogs(supabase, userId, 10),
    restoreActive ? getPostpartumProfile(supabase, userId) : Promise.resolve(null),
    restoreActive ? getPostpartumCheckIn(supabase, userId, date) : Promise.resolve(null),
  ]);
  return { pathways, profile, postpartum, checkIn, ppCheckIn, goals, recentWorkouts };
}

function nutritionTargetsFrom(context: PlannerContext) {
  const goalTypes = context.goals.map((goal) => goal.goal_type) as GoalType[];
  return computeNutritionTargets({
    ageYears: ageFromDob(context.profile?.date_of_birth ?? null),
    heightInches: context.profile?.height_inches ?? null,
    currentWeightLbs: context.profile?.current_weight_lbs ?? null,
    targetWeightLbs: context.profile?.target_weight_lbs ?? null,
    goalTypes,
    activePathways: context.pathways,
    weeklyTrainingDays: context.profile?.preferred_workout_days ?? 3,
    tracksCalories: context.profile?.tracks_calories ?? true,
    portionGuidancePreferred: context.profile?.portion_guidance_preferred ?? false,
    feedingStatus: (context.postpartum?.feeding_status ?? null) as FeedingStatus | null,
    fatigueConcern: context.postpartum?.fatigue_concern ?? false,
    ironConcern: context.postpartum?.iron_deficiency_or_anemia ?? false,
  });
}

export interface GeneratePlanOptions {
  refresh?: boolean;
  quickSelection?: QuickSelection | null;
  availableMinutesOverride?: number | null;
  locationOverride?: string | null;
}

export interface DailyPlanOutcome {
  plan: ValidatedDailyPlan;
  engine: DailyPlanEngineResult | null; // null when returning a stored plan untouched
}

export async function generateDailyPlanForUser(
  supabase: Client,
  userId: string,
  date: string,
  options: GeneratePlanOptions = {},
): Promise<DailyPlanOutcome> {
  // Idempotency: an existing plan is returned as-is unless refresh is explicit.
  const existing = await getDailyPlan(supabase, userId, date);
  if (existing && !options.refresh) return { plan: existing, engine: null };

  const context = await loadContext(supabase, userId, date);
  const [templates, templateExercises, exercises, weekInfo] = await Promise.all([
    listWorkoutTemplates(supabase),
    // Load all template exercises via per-template queries is wasteful; the
    // RLS-safe list endpoint returns rows for active templates.
    listAllTemplateExercises(supabase),
    listExercises(supabase),
    getCurrentProgramWeek(supabase, userId, date),
  ]);

  const week = weekInfo?.week ?? null;
  const targets = nutritionTargetsFrom(context);
  const checkIn = context.checkIn;
  const recentSymptoms = context.recentWorkouts.slice(0, 3).map((log) => ({
    painDuring: log.pain_during,
    domingOrConing: log.doming_or_coning,
    pelvicFloorSymptom: log.pelvic_floor_symptom,
  }));
  const lastWorkout = context.recentWorkouts[0] ?? null;
  const daysSinceLastWorkout = lastWorkout
    ? Math.floor(
        (new Date(`${date}T00:00:00Z`).getTime() -
          new Date(`${lastWorkout.workout_date}T00:00:00Z`).getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : null;

  const result = computeDailyPlan({
    planDate: date,
    activePathways: context.pathways,
    restoreActive: context.pathways.includes("restore"),
    programWeekId: week?.id ?? null,
    phaseNumber: week?.phase_number ?? 1,
    nutritionTargets: targets,
    safetyInput: {
      activePathways: context.pathways,
      checkIn: checkIn
        ? {
            painLevel: checkIn.pain_level,
            soreness: checkIn.soreness,
            energy: checkIn.energy,
            stress: checkIn.stress,
            sleepHours: checkIn.sleep_hours,
            sleepQuality: checkIn.sleep_quality,
            readiness: checkIn.readiness as ReadinessState | null,
            availableMinutes: options.availableMinutesOverride ?? checkIn.available_minutes,
            illnessOrInjuryConcern: checkIn.illness_or_injury_concern,
            chestPain: checkIn.chest_pain,
            dizzinessOrFainting: checkIn.dizziness_or_fainting,
            shortnessOfBreath: checkIn.shortness_of_breath,
            severeHeadache: checkIn.severe_headache,
            selfHarmConcern: checkIn.self_harm_concern,
          }
        : null,
      postpartumProfile: context.postpartum
        ? {
            postpartumStage: context.postpartum.postpartum_stage,
            medicalClearanceStatus: context.postpartum.medical_clearance_status,
            reportedRestrictions: context.postpartum.reported_restrictions,
            pelvicFloorSymptoms: context.postpartum.pelvic_floor_symptoms,
            suspectedDiastasis: context.postpartum.suspected_diastasis,
            abdominalDomingOrConing: context.postpartum.abdominal_doming_or_coning,
            chronicPain: context.postpartum.chronic_pain,
            incisionStatus: context.postpartum.incision_status,
            fatigueConcern: context.postpartum.fatigue_concern,
          }
        : null,
      postpartumCheckIn: context.ppCheckIn
        ? {
            bleedingConcern: context.ppCheckIn.bleeding_concern,
            heavyBleeding: context.ppCheckIn.heavy_bleeding,
            incisionConcern: context.ppCheckIn.incision_concern,
            pelvicHeavinessOrPressure: context.ppCheckIn.pelvic_heaviness_or_pressure,
            urinaryOrBowelSymptom: context.ppCheckIn.urinary_or_bowel_symptom,
            calfPainOrSwelling: context.ppCheckIn.calf_pain_or_swelling,
            severeAbdominalOrPelvicPain: context.ppCheckIn.severe_abdominal_or_pelvic_pain,
            breastOrFeedingConcern: context.ppCheckIn.breast_or_feeding_concern,
            domingOrConing: context.ppCheckIn.doming_or_coning,
          }
        : null,
      recentWorkoutSymptoms: recentSymptoms,
      recentWorkoutCount: context.recentWorkouts.filter((log) => {
        const delta =
          new Date(`${date}T00:00:00Z`).getTime() -
          new Date(`${log.workout_date}T00:00:00Z`).getTime();
        return delta >= 0 && delta < 7 * 24 * 60 * 60 * 1000;
      }).length,
      daysSinceLastWorkout,
    },
    workoutLibrary: {
      templates,
      templateExercises,
      exercises,
      preferredLocation:
        options.locationOverride ??
        checkIn?.available_location ??
        context.profile?.preferred_training_locations?.[0] ??
        null,
      availableEquipment: context.profile?.available_equipment ?? [],
      availableMinutes:
        options.availableMinutesOverride ??
        checkIn?.available_minutes ??
        context.profile?.preferred_workout_minutes ??
        null,
      experience: context.profile?.movement_experience,
      floorTransitionsDifficult: context.profile?.floor_transitions_difficult ?? false,
      prefersBeginnerExplanations: context.profile?.prefers_beginner_explanations ?? false,
      symptoms: {
        domingOrConing:
          (context.ppCheckIn?.doming_or_coning ?? false) ||
          (context.postpartum?.abdominal_doming_or_coning ?? false),
        pelvicFloorSymptom: context.postpartum?.pelvic_floor_symptoms ?? false,
        painDuring: recentSymptoms.some((s) => s.painDuring),
      },
      quickSelection: options.quickSelection ?? null,
      excludeTemplateSlug: options.refresh
        ? (existing?.movementPlan.workoutTemplateSlug ?? null)
        : null,
    },
  });

  const stored = await upsertDailyPlan(supabase, userId, result.planInput);
  return { plan: stored, engine: result };
}

/** All template exercises for active templates (single query). */
async function listAllTemplateExercises(supabase: Client) {
  const { data, error } = await supabase
    .from("workout_template_exercises")
    .select("*")
    .order("sequence_number", { ascending: true });
  if (error) throw new Error("Could not load the workout library.");
  return data ?? [];
}

export async function regenerateProgramForUser(
  supabase: Client,
  userId: string,
  startDate: string,
): Promise<Tables<"wellness_programs">> {
  const context = await loadContext(supabase, userId, startDate);
  if (context.pathways.length === 0) {
    throw new Error("Choose at least one pathway before building a program.");
  }
  const goalTypes = context.goals.map((goal) => goal.goal_type) as GoalType[];
  const primary =
    context.goals.find((goal) => goal.priority === 1)?.goal_type ?? goalTypes[0] ?? "consistency";
  const targets = nutritionTargetsFrom(context);
  const generated = generateProgram({
    activePathways: context.pathways,
    primaryGoal: primary as GoalType,
    goalTypes,
    movementExperience: context.profile?.movement_experience ?? "beginner",
    preferredWorkoutDays: context.profile?.preferred_workout_days ?? 3,
    preferredWorkoutMinutes: context.profile?.preferred_workout_minutes ?? 30,
    tracksCalories: context.profile?.tracks_calories ?? true,
    tracksWeight: context.profile?.tracks_weight ?? true,
    averageDailySteps: context.profile?.average_daily_steps ?? null,
    proteinTargetGrams: targets.proteinTargetHighGrams,
    hydrationTargetOunces: targets.hydrationTargetOunces,
    calorieTarget: targets.estimatedCalorieTarget,
    medicalClearanceStatus: context.postpartum?.medical_clearance_status ?? null,
    hasActiveSymptoms:
      (context.postpartum?.pelvic_floor_symptoms ?? false) ||
      (context.postpartum?.abdominal_doming_or_coning ?? false),
    startDate,
  });
  return createProgramWithWeeks(
    supabase,
    userId,
    {
      status: generated.program.status,
      version: 1,
      start_date: generated.program.startDate,
      end_date: generated.program.endDate,
      total_weeks: generated.program.totalWeeks,
      primary_goal: generated.program.primaryGoal,
      weekly_training_days: generated.program.weeklyTrainingDays,
      nutrition_strategy: generated.program.nutritionStrategy,
      safety_tier: generated.program.safetyTier,
      active_pathway_keys: generated.program.activePathwayKeys,
      generated_from_profile_version: new Date().toISOString(),
      rationale: generated.program.rationale ?? null,
    },
    generated.weeks.map((week) => ({
      week_number: week.weekNumber,
      phase_number: week.phaseNumber,
      phase_name: week.phaseName,
      weekly_focus: week.weeklyFocus,
      active_pathway_keys: week.activePathwayKeys,
      strength_sessions_target: week.strengthSessionsTarget,
      cardio_sessions_target: week.cardioSessionsTarget,
      mobility_sessions_target: week.mobilitySessionsTarget,
      recovery_sessions_target: week.recoverySessionsTarget,
      step_target: week.stepTarget ?? null,
      protein_target_grams: week.proteinTargetGrams ?? null,
      hydration_target_ounces: week.hydrationTargetOunces ?? null,
      calorie_target: week.calorieTarget ?? null,
      deload_week: week.deloadWeek,
      notes: week.notes ?? null,
    })),
  );
}

export async function generateMealPlanForUser(
  supabase: Client,
  userId: string,
  weekStartDate: string,
  options: { refresh?: boolean } = {},
) {
  const existing = await getMealPlan(supabase, userId, weekStartDate);
  if (existing && !options.refresh) return existing;

  const context = await loadContext(supabase, userId, weekStartDate);
  const mealTemplates = await listMealTemplates(supabase);
  const targets = nutritionTargetsFrom(context);
  const generated = generateMealPlan({
    userId,
    weekStartDate,
    mealTemplates,
    targets,
    activePathways: context.pathways,
    dietaryPattern: context.profile?.dietary_pattern ?? null,
    foodAllergies: context.profile?.food_allergies ?? [],
    foodDislikes: context.profile?.food_dislikes ?? [],
    budgetPreference: context.profile?.budget_preference ?? null,
    mealPrepPreference: context.profile?.meal_prep_preference ?? null,
    quickMealsPreferred: context.profile?.quick_meals_preferred ?? false,
    freezerFriendlyPreferred: (context.profile?.meal_prep_preference ?? "").includes("batch"),
    familyStyleMeals: context.profile?.family_style_meals ?? false,
    breastfeedingRelevant:
      context.postpartum != null &&
      ["exclusively_breastfeeding", "combination_feeding", "pumping"].includes(
        context.postpartum.feeding_status,
      ),
    ironSupportive: context.postpartum?.iron_deficiency_or_anemia ?? false,
    tracksCalories: context.profile?.tracks_calories ?? true,
  });
  return upsertMealPlan(supabase, userId, generated.planInput);
}

export async function replaceMealForUser(
  supabase: Client,
  userId: string,
  weekStartDate: string,
  date: string,
  mealType: "breakfast" | "lunch" | "dinner",
) {
  const existing = await getMealPlan(supabase, userId, weekStartDate);
  if (!existing) throw new Error("There is no meal plan for that week yet.");
  const context = await loadContext(supabase, userId, weekStartDate);
  const mealTemplates = await listMealTemplates(supabase);
  const targets = nutritionTargetsFrom(context);
  const nextPlanData = replaceMealInPlan(existing.planData, date, mealType, {
    userId,
    weekStartDate,
    mealTemplates,
    targets,
    activePathways: context.pathways,
    dietaryPattern: context.profile?.dietary_pattern ?? null,
    foodAllergies: context.profile?.food_allergies ?? [],
    foodDislikes: context.profile?.food_dislikes ?? [],
    tracksCalories: context.profile?.tracks_calories ?? true,
  });
  return upsertMealPlan(supabase, userId, {
    weekStartDate,
    activePathwayKeys: existing.row.active_pathway_keys as PathwayKey[],
    calorieTarget: existing.row.calorie_target,
    calorieRangeLow: existing.row.calorie_range_low,
    calorieRangeHigh: existing.row.calorie_range_high,
    proteinTargetGrams: existing.row.protein_target_grams,
    hydrationTargetOunces: existing.row.hydration_target_ounces,
    planData: nextPlanData,
    generatedBy: "rules_engine",
  });
}

export { getActiveProgram };
