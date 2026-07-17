import Link from "next/link";

import { HerToday, type HerTodayProps } from "@/components/her/her-today";
import { ScreenHeader } from "@/components/layout/screen-header";
import { requireUser } from "@/lib/auth/require-user";
import { getPostpartumCheckIn } from "@/lib/db/queries/postpartum/check-ins";
import { getPostpartumProfile } from "@/lib/db/queries/postpartum/profile";
import { getDailyCheckIn } from "@/lib/db/queries/wellness/check-ins";
import { listActiveEnrollments } from "@/lib/db/queries/wellness/enrollments";
import { listNutritionLogs } from "@/lib/db/queries/wellness/logs";
import { getDailyMetrics } from "@/lib/db/queries/wellness/metrics";
import { listMilestones } from "@/lib/db/queries/wellness/milestones";
import { getOnboardingState } from "@/lib/db/queries/wellness/onboarding";
import { getCurrentProgramWeek } from "@/lib/db/queries/wellness/programs";
import { getProfile } from "@/lib/db/queries/profile";
import { getWomenWellnessProfile } from "@/lib/db/queries/wellness/profiles";
import { createClient } from "@/lib/supabase/server";
import { localDayISO } from "@/lib/wellness/dates";
import { getPathway } from "@/lib/wellness/pathways";
import { generateDailyPlanForUser } from "@/lib/wellness/planner/service";
import { presentStoredPlan } from "@/lib/wellness/planner/present";
import { GENERAL_STOP_CONDITIONS, RESTORE_STOP_CONDITIONS } from "@/lib/wellness/rules";

import type { Metadata } from "next";
import type { ReadinessState } from "@/lib/wellness/constants";

export const metadata: Metadata = { title: "Saelis Her — Today" };

/**
 * Saelis Her Today — the proactive daily experience. Enrollment-aware;
 * postpartum content renders ONLY for active Restore users; safety verdicts
 * order the page.
 */
export default async function HerPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Pre-onboarding / empty states -----------------------------------------
  let onboarded = false;
  let enrollments: Awaited<ReturnType<typeof listActiveEnrollments>> = [];
  let timezone: string | null = null;
  let preferredName: string | null = null;
  try {
    const [profileRow, onboarding, active] = await Promise.all([
      getProfile(supabase, user.id),
      getOnboardingState(supabase, user.id),
      listActiveEnrollments(supabase, user.id),
    ]);
    timezone = profileRow?.timezone ?? null;
    preferredName = profileRow?.preferred_name ?? null;
    onboarded = onboarding.completedAt !== null;
    enrollments = active;
  } catch {
    // Migrations not applied — invitation state below.
  }

  const today = localDayISO(timezone);
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone ?? "UTC",
  }).format(new Date());

  if (!onboarded || enrollments.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <ScreenHeader title="Saelis Her" subtitle="Wellness for every version of you." />
        <section className="glass-surface flex flex-col gap-4 p-6">
          <p className="text-ink">
            {onboarded
              ? "No active pathways right now — that is a valid season too. Add one whenever you like."
              : "Adaptive wellness plans shaped around your season of life — movement, nourishment, recovery, and rest, on your terms."}
          </p>
          {!onboarded ? (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-soft">
              <li>Choose one pathway or several; change them anytime.</li>
              <li>You decide what to track. Weight and calories are always optional.</li>
              <li>General educational support — never a replacement for individualized care.</li>
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Link
              href={onboarded ? "/wellness/her/pathways" : "/wellness/her/onboarding"}
              className="inline-flex min-h-11 items-center rounded-full bg-accent-lilac px-6 text-base font-medium text-white hover:opacity-90"
            >
              {onboarded ? "Choose a pathway" : "Build my plan"}
            </Link>
            <Link
              href="/wellness/her/pathways"
              className="inline-flex min-h-11 items-center rounded-full bg-cloud-lilac px-5 text-sm font-medium text-ink hover:bg-sky-lilac"
            >
              Browse pathways
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // Daily plan (idempotent) + supporting data ------------------------------
  const pathways = enrollments.map((enrollment) => enrollment.pathway_key);
  const restoreEnrollment = enrollments.find((e) => e.pathway_key === "restore") ?? null;
  const resetActive = pathways.includes("reset");

  let plan: HerTodayProps["plan"] = null;
  let planError = false;
  let stored: Awaited<ReturnType<typeof generateDailyPlanForUser>>["plan"] | null = null;
  try {
    const outcome = await generateDailyPlanForUser(supabase, user.id, today);
    stored = outcome.plan;
    // Analytics only when a plan was ACTUALLY generated (engine non-null) —
    // returning the stored plan records nothing. Guarded; never blocks render.
    if (outcome.engine) {
      const { recordDailyPlanOutcome } = await import("@/lib/analytics/instrument");
      await recordDailyPlanOutcome(supabase, user.id, today, outcome);
    }
    plan = {
      presentation: presentStoredPlan({
        planDate: stored.row.plan_date,
        adaptationLevel: stored.row.adaptation_level,
        safetyMessage: stored.row.safety_message,
        movementPlan: stored.movementPlan,
        nutritionPlan: stored.nutritionPlan,
        hydrationPlan: stored.hydrationPlan,
        recoveryPlan: stored.recoveryPlan,
        readinessSnapshot: stored.readinessSnapshot,
        resetActive,
      }),
      safetyMessage: stored.row.safety_message,
      adaptationLevel: stored.row.adaptation_level,
      movement: stored.movementPlan,
      recovery: stored.recoveryPlan,
      intensityNote: stored.movementPlan.notes ?? null,
    };
  } catch {
    planError = true;
  }

  let checkInDone = false;
  let initialReadiness: ReadinessState | null = null;
  let reflectionSaved = false;
  let nutrition: HerTodayProps["nutrition"] = {
    focus: null,
    proteinTargetGrams: null,
    proteinSoFarGrams: 0,
    hydrationTargetOunces: null,
    hydrationSoFarOunces: 0,
    calorieRange: null,
    mealsLoggedToday: 0,
  };
  let restoreCard: HerTodayProps["restore"] = null;
  let programWeek: HerTodayProps["programWeek"] = null;
  let milestoneMessage: string | null = null;

  try {
    const [checkIn, metrics, logs, weekInfo, milestones, herProfile] = await Promise.all([
      getDailyCheckIn(supabase, user.id, today),
      getDailyMetrics(supabase, user.id, today),
      listNutritionLogs(supabase, user.id, today),
      getCurrentProgramWeek(supabase, user.id, today),
      listMilestones(supabase, user.id),
      getWomenWellnessProfile(supabase, user.id),
    ]);
    checkInDone = checkIn !== null && checkIn.readiness !== null;
    initialReadiness = (checkIn?.readiness ?? null) as ReadinessState | null;
    reflectionSaved = (checkIn?.notes ?? null) !== null;
    if (weekInfo) {
      programWeek = {
        weekNumber: weekInfo.week.week_number,
        phaseName: weekInfo.week.phase_name,
        deload: weekInfo.week.deload_week,
      };
    }
    const tracksCalories = herProfile?.tracks_calories ?? true;
    // Targets come from the stored, already-validated plan payloads.
    const storedNutrition = stored?.nutritionPlan ?? null;
    nutrition = {
      focus: storedNutrition?.focus ?? null,
      proteinTargetGrams: storedNutrition?.targets?.proteinTargetGrams ?? null,
      proteinSoFarGrams: logs.reduce((sum, log) => sum + (log.protein_grams ?? 0), 0),
      hydrationTargetOunces: stored?.hydrationPlan.targetOunces ?? null,
      hydrationSoFarOunces: metrics?.water_ounces ?? 0,
      calorieRange:
        tracksCalories &&
        storedNutrition?.targets?.calorieRangeLow != null &&
        storedNutrition?.targets?.calorieRangeHigh != null
          ? {
              low: storedNutrition.targets.calorieRangeLow,
              high: storedNutrition.targets.calorieRangeHigh,
            }
          : null,
      mealsLoggedToday: logs.length,
    };

    const recent = milestones.find(
      (milestone) =>
        Date.now() - new Date(milestone.achieved_at).getTime() < 7 * 24 * 60 * 60 * 1000,
    );
    milestoneMessage = recent?.celebration_message ?? null;

    if (restoreEnrollment) {
      const [postpartum, ppCheckIn] = await Promise.all([
        getPostpartumProfile(supabase, user.id),
        getPostpartumCheckIn(supabase, user.id, today),
      ]);
      const clearance = postpartum?.medical_clearance_status ?? "unknown";
      restoreCard = {
        enrollmentId: restoreEnrollment.id,
        phaseName: programWeek?.phaseName ?? null,
        clearanceLabel:
          clearance === "cleared"
            ? "cleared"
            : clearance === "restrictions"
              ? "cleared with restrictions"
              : clearance === "not_cleared"
                ? "not yet cleared"
                : "not yet discussed",
        checkInDone: ppCheckIn !== null,
        holdActive: (stored?.row.adaptation_level ?? "") === "safety_hold",
        professionalSupportSuggested: stored?.postpartumPlan?.providerGuidanceNote != null,
        recoveryAction:
          stored?.postpartumPlan?.stageAppropriateFocus ??
          "Breath first, then gentle reconnection.",
      };
    }
  } catch {
    // Partial data — the dashboard renders what it can.
  }

  const props: HerTodayProps = {
    today,
    dateLabel,
    greetingName: preferredName,
    pathwayNames: pathways.map((key) => getPathway(key).displayName),
    pathways,
    programWeek,
    checkInDone,
    initialReadiness,
    plan,
    planError,
    nutrition,
    restore: restoreCard,
    resetActive,
    stopConditions: restoreEnrollment ? [...RESTORE_STOP_CONDITIONS] : [...GENERAL_STOP_CONDITIONS],
    milestoneMessage,
    reflectionSaved,
  };

  return (
    <div className="mx-auto max-w-2xl">
      <HerToday {...props} />
      <nav aria-label="Saelis Her sections" className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          href="/wellness/her/meals"
          className="glass-surface flex min-h-11 items-center px-5 py-3 text-ink hover:bg-cloud-lilac/50"
        >
          Meal plan
        </Link>
        <Link
          href="/wellness/her/progress"
          className="glass-surface flex min-h-11 items-center px-5 py-3 text-ink hover:bg-cloud-lilac/50"
        >
          Progress
        </Link>
        <Link
          href="/wellness/her/settings"
          className="glass-surface flex min-h-11 items-center px-5 py-3 text-ink hover:bg-cloud-lilac/50"
        >
          Settings
        </Link>
      </nav>
    </div>
  );
}
