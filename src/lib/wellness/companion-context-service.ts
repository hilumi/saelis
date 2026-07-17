import { listActiveEnrollments } from "@/lib/db/queries/wellness/enrollments";
import { listGoals } from "@/lib/db/queries/wellness/goals";
import { listMilestones } from "@/lib/db/queries/wellness/milestones";
import { getCurrentProgramWeek } from "@/lib/db/queries/wellness/programs";
import { getDailyPlan } from "@/lib/db/queries/wellness/plans";
import { getWomenWellnessProfile } from "@/lib/db/queries/wellness/profiles";
import { listWorkoutLogs } from "@/lib/db/queries/wellness/logs";
import {
  HER_COMPANION_BOUNDARIES,
  serializeHerContext,
  summarizePlanForCompanion,
  type HerCompanionContext,
} from "@/lib/wellness/companion-context";
import { localDayISO } from "@/lib/wellness/dates";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { GoalType } from "@/lib/wellness/constants";
import type { LightPlan } from "@/lib/light/types";

type Client = SupabaseClient<Database>;

/**
 * Loads the minimal Saelis Her context for the companion. Returns null for
 * users without active Her enrollments — the companion then behaves exactly
 * as before. Never throws (chat must never break on wellness data), never
 * includes symptom detail or free text, and sends only the safety summary
 * when a hold is active.
 */
export async function loadHerCompanionContext(
  supabase: Client,
  userId: string,
): Promise<HerCompanionContext | null> {
  try {
    const enrollments = await listActiveEnrollments(supabase, userId);
    if (enrollments.length === 0) return null;
    const pathways = enrollments.map((enrollment) => enrollment.pathway_key);

    const [profile, goals, weekInfo, milestones, recentWorkouts] = await Promise.all([
      getWomenWellnessProfile(supabase, userId),
      listGoals(supabase, userId),
      getCurrentProgramWeek(supabase, userId, localDayISO(null)),
      listMilestones(supabase, userId),
      listWorkoutLogs(supabase, userId, 7),
    ]);
    const today = localDayISO(null);
    const plan = await getDailyPlan(supabase, userId, today).catch(() => null);
    const safetyHoldActive = plan?.row.adaptation_level === "safety_hold";

    const completedThisWeek = recentWorkouts.filter(
      (log) => log.completion_status === "completed",
    ).length;
    const latestMilestone = milestones[0]?.celebration_message ?? null;

    return {
      activePathwayKeys: pathways,
      primaryGoal: (goals.find((goal) => goal.priority === 1)?.goal_type ??
        null) as GoalType | null,
      programPhaseName: weekInfo?.week.phase_name ?? null,
      currentWeekNumber: weekInfo?.week.week_number ?? null,
      readinessCategory: (plan?.readinessSnapshot?.readiness ?? null) as string | null,
      safetyTier: safetyHoldActive ? "safety_hold" : "normal",
      adaptationLevel: plan?.row.adaptation_level ?? null,
      blockedActivities: safetyHoldActive ? ["structured_exercise", "progression"] : [],
      todayPlanSummary: plan
        ? summarizePlanForCompanion({
            movementFocus: plan.movementPlan.focus ?? null,
            restDay: plan.movementPlan.restDay,
            approximateMinutes: plan.movementPlan.approximateMinutes ?? null,
            adaptationLevel: plan.row.adaptation_level,
          })
        : null,
      recentCompletionSummary: `${completedThisWeek} workouts completed in the last 7 days`,
      nutritionMode: null,
      preferences: {
        tracksWeight: profile?.tracks_weight ?? true,
        tracksCalories: profile?.tracks_calories ?? true,
        beginnerExplanations: profile?.prefers_beginner_explanations ?? false,
      },
      milestoneSummary: latestMilestone,
      safetyHoldActive,
    };
  } catch {
    return null;
  }
}

/** Appends Her context + boundaries to a LightPlan. Additive and safe. */
export function withHerContext(plan: LightPlan, context: HerCompanionContext): LightPlan {
  return {
    ...plan,
    developerInstruction: `${plan.developerInstruction}\n${HER_COMPANION_BOUNDARIES}`,
    contextualInstruction: `${plan.contextualInstruction}\n${serializeHerContext(context)}`,
  };
}
