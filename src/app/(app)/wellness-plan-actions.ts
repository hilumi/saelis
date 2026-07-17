"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { upsertPostpartumCheckIn } from "@/lib/db/queries/postpartum/check-ins";
import { upsertDailyCheckIn } from "@/lib/db/queries/wellness/check-ins";
import { listActiveEnrollments } from "@/lib/db/queries/wellness/enrollments";
import {
  addExerciseLogs,
  createNutritionLog,
  createWorkoutLog,
  listWorkoutLogs,
} from "@/lib/db/queries/wellness/logs";
import { upsertDailyMetrics } from "@/lib/db/queries/wellness/metrics";
import { listMilestones, recordMilestone } from "@/lib/db/queries/wellness/milestones";
import { createClient } from "@/lib/supabase/server";
import { detectMilestones, type MilestoneContext } from "@/lib/wellness/milestones-engine";
import {
  generateDailyPlanForUser,
  generateMealPlanForUser,
  regenerateProgramForUser,
  replaceMealForUser,
} from "@/lib/wellness/planner/service";
import {
  dailyCheckInSchema,
  dailyMetricsSchema,
  exerciseLogSchema,
  milestoneSchema,
  nutritionLogSchema,
  postpartumCheckInSchema,
  workoutLogSchema,
} from "@/lib/validation/wellness";

import type { ActionResult } from "@/types/actions";

/**
 * Saelis Her — Phase 3 plan operations. Same contract as every action file:
 * server-derived identity, Zod at the boundary, user scoping, calm errors,
 * and no logging of health content. The deterministic engines are the only
 * decision-makers; no LLM participates in any of these paths.
 */

const CALM_ERROR = "That didn't save. Nothing was lost — please try again.";

function failure(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : CALM_ERROR };
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function requireHerEnrollment(): Promise<{ userId: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  const enrollments = await listActiveEnrollments(supabase, user.id);
  if (enrollments.length === 0) {
    throw new Error("Choose a pathway first — Saelis Her plans start there.");
  }
  return { userId: user.id };
}

// --- Programs ---------------------------------------------------------------

const programInputSchema = z.object({ startDate: isoDate });

export async function createHerProgram(input: unknown): Promise<ActionResult> {
  try {
    await requireHerEnrollment();
    const user = await requireUser();
    const parsed = programInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: CALM_ERROR };
    const supabase = await createClient();
    await regenerateProgramForUser(supabase, user.id, parsed.data.startDate);
    revalidatePath("/wellness/her");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function regenerateHerProgram(input: unknown): Promise<ActionResult> {
  return createHerProgram(input);
}

// --- Check-ins --------------------------------------------------------------

export async function saveDailyCheckInAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = dailyCheckInSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That check-in didn't look right." };
    const supabase = await createClient();
    await upsertDailyCheckIn(supabase, user.id, parsed.data);
    // A new check-in invalidates today's stored plan inputs → refresh.
    await generateDailyPlanForUser(supabase, user.id, parsed.data.checkInDate, { refresh: true });
    revalidatePath("/wellness/her");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function saveRestoreCheckInAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = postpartumCheckInSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That check-in didn't look right." };
    const supabase = await createClient();
    await upsertPostpartumCheckIn(supabase, user.id, parsed.data);
    await generateDailyPlanForUser(supabase, user.id, parsed.data.checkInDate, { refresh: true });
    revalidatePath("/wellness/her");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// --- Daily plans ------------------------------------------------------------

const planRequestSchema = z.object({
  date: isoDate,
  refresh: z.boolean().default(false),
  quickSelection: z
    .enum([
      "ten_minutes",
      "twenty_minutes",
      "planet_fitness",
      "peloton",
      "home",
      "no_floor",
      "tired",
      "overwhelmed",
      "sore",
      "replace_today",
    ])
    .nullable()
    .optional(),
  availableMinutes: z.number().int().min(0).max(300).nullable().optional(),
  location: z.string().trim().max(50).nullable().optional(),
});

export async function generateTodayPlan(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = planRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: CALM_ERROR };
    const supabase = await createClient();
    await generateDailyPlanForUser(supabase, user.id, parsed.data.date, {
      refresh: parsed.data.refresh || parsed.data.quickSelection === "replace_today",
      quickSelection:
        parsed.data.quickSelection === "replace_today" ? null : parsed.data.quickSelection,
      availableMinutesOverride: parsed.data.availableMinutes ?? null,
      locationOverride: parsed.data.location ?? null,
    });
    revalidatePath("/wellness/her");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Adapt today's plan to the time actually available (explicit replacement). */
export async function adaptPlanForTime(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = planRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: CALM_ERROR };
    const supabase = await createClient();
    await generateDailyPlanForUser(supabase, user.id, parsed.data.date, {
      refresh: true,
      availableMinutesOverride: parsed.data.availableMinutes ?? null,
      quickSelection: parsed.data.quickSelection ?? null,
      locationOverride: parsed.data.location ?? null,
    });
    revalidatePath("/wellness/her");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function replaceTodaysWorkout(input: unknown): Promise<ActionResult> {
  return adaptPlanForTime(input);
}

export async function changeWorkoutLocation(input: unknown): Promise<ActionResult> {
  return adaptPlanForTime(input);
}

// --- Workout + exercise logging --------------------------------------------

const completeWorkoutSchema = z.object({
  workout: workoutLogSchema,
  exercises: z.array(exerciseLogSchema).max(20).default([]),
});

export async function completeWorkout(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = completeWorkoutSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That workout log didn't look right." };
    const supabase = await createClient();
    const log = await createWorkoutLog(supabase, user.id, parsed.data.workout);
    if (parsed.data.exercises.length > 0) {
      await addExerciseLogs(supabase, user.id, log.id, parsed.data.exercises);
    }
    await checkMilestones(user.id);
    revalidatePath("/wellness/her");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// --- Nutrition, hydration, metrics -----------------------------------------

export async function logMeal(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = nutritionLogSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That entry didn't look right." };
    const supabase = await createClient();
    await createNutritionLog(supabase, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

const quickProteinSchema = z.object({
  logDate: isoDate,
  description: z.string().trim().min(1).max(200),
  proteinGrams: z.number().min(1).max(100),
});

export async function quickAddProtein(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = quickProteinSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That entry didn't look right." };
    const supabase = await createClient();
    await createNutritionLog(supabase, user.id, {
      logDate: parsed.data.logDate,
      mealType: "snack",
      description: parsed.data.description,
      proteinGrams: parsed.data.proteinGrams,
      loggedVia: "quick_add",
      ironRich: false,
      estimationNotice: true,
    });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

const hydrationSchema = z.object({
  metricDate: isoDate,
  waterOunces: z.number().min(0).max(500),
});

export async function logHydration(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = hydrationSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That entry didn't look right." };
    const supabase = await createClient();
    await upsertDailyMetrics(supabase, user.id, {
      metricDate: parsed.data.metricDate,
      waterOunces: parsed.data.waterOunces,
    });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function saveDailyMetricsAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = dailyMetricsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Those measurements didn't look right." };
    const supabase = await createClient();
    await upsertDailyMetrics(supabase, user.id, parsed.data);
    await checkMilestones(user.id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// --- Meal plans -------------------------------------------------------------

const mealPlanRequestSchema = z.object({
  weekStartDate: isoDate,
  refresh: z.boolean().default(false),
});

export async function generateWeeklyMealPlan(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = mealPlanRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: CALM_ERROR };
    const supabase = await createClient();
    await generateMealPlanForUser(supabase, user.id, parsed.data.weekStartDate, {
      refresh: parsed.data.refresh,
    });
    revalidatePath("/wellness/her");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

const replaceMealSchema = z.object({
  weekStartDate: isoDate,
  date: isoDate,
  mealType: z.enum(["breakfast", "lunch", "dinner"]),
});

export async function replaceMeal(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = replaceMealSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: CALM_ERROR };
    const supabase = await createClient();
    await replaceMealForUser(
      supabase,
      user.id,
      parsed.data.weekStartDate,
      parsed.data.date,
      parsed.data.mealType,
    );
    revalidatePath("/wellness/her");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// --- Milestones -------------------------------------------------------------

export async function createMilestone(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = milestoneSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: CALM_ERROR };
    const supabase = await createClient();
    await recordMilestone(supabase, user.id, parsed.data);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Deterministic milestone sweep after meaningful events. Never throws. */
async function checkMilestones(userId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { getWomenWellnessProfile } = await import("@/lib/db/queries/wellness/profiles");
    const { listRecentCheckIns } = await import("@/lib/db/queries/wellness/check-ins");
    const [existing, workouts, enrollments, herProfile, recentCheckIns] = await Promise.all([
      listMilestones(supabase, userId),
      listWorkoutLogs(supabase, userId, 30),
      listActiveEnrollments(supabase, userId),
      getWomenWellnessProfile(supabase, userId),
      listRecentCheckIns(supabase, userId, 30),
    ]);
    const completed = workouts.filter((log) => log.completion_status === "completed");
    const now = Date.now();
    const last7 = completed.filter(
      (log) => now - new Date(`${log.workout_date}T00:00:00Z`).getTime() < 7 * 24 * 60 * 60 * 1000,
    );
    const context: MilestoneContext = {
      // The sweep only runs after real activity, which requires enrollment.
      onboardingComplete: enrollments.length > 0,
      checkInCount: recentCheckIns.length,
      completedWorkoutCount: completed.length,
      completedWorkoutSources: [...new Set(completed.map((log) => log.source))],
      distinctWorkoutDaysLast7: new Set(last7.map((log) => log.workout_date)).size,
      hydrationLoggedDaysLast7: 0,
      proteinTargetDaysLast7: 0,
      completedFirstProgramWeek: completed.length >= 3,
      // Weight milestones stay OFF unless the user tracks weight (product rule).
      tracksWeight: herProfile?.tracks_weight ?? false,
      absoluteWeightProgressLbs: null, // weight milestones need metrics aggregation (future)
      hadSymptomFreeModifiedWorkout: completed.some(
        (log) =>
          !log.pain_during &&
          !log.doming_or_coning &&
          !log.pelvic_floor_symptom &&
          log.completion_status === "completed" &&
          log.notes?.toLowerCase().includes("modified") === true,
      ),
      restoreActive: enrollments.some((enrollment) => enrollment.pathway_key === "restore"),
      restoreOnboardingComplete: enrollments.some(
        (enrollment) => enrollment.pathway_key === "restore",
      ),
      completedRestoreWeeks: 0,
      returnedAfterBreak: false,
      existingKeys: new Set(existing.map((milestone) => milestone.milestone_key)),
    };
    for (const milestone of detectMilestones(context)) {
      await recordMilestone(supabase, userId, milestone);
    }
  } catch {
    // Milestones must never break a save.
  }
}
