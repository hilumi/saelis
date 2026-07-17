import { ProgressView, type ProgressViewProps } from "@/components/her/progress-view";
import { ScreenHeader } from "@/components/layout/screen-header";
import { requireUser } from "@/lib/auth/require-user";
import { listRecentCheckIns } from "@/lib/db/queries/wellness/check-ins";
import { listActiveEnrollments } from "@/lib/db/queries/wellness/enrollments";
import { listWorkoutLogs } from "@/lib/db/queries/wellness/logs";
import { listRecentMetrics } from "@/lib/db/queries/wellness/metrics";
import { listMilestones } from "@/lib/db/queries/wellness/milestones";
import { getProfile } from "@/lib/db/queries/profile";
import { getWomenWellnessProfile } from "@/lib/db/queries/wellness/profiles";
import { createClient } from "@/lib/supabase/server";
import { localDayISO } from "@/lib/wellness/dates";
import { consistencyCount, summarizeTrend } from "@/lib/wellness/progress";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Saelis Her — Progress" };

export default async function HerProgressPage() {
  const user = await requireUser();
  const supabase = await createClient();

  let props: ProgressViewProps = {
    weight: {
      status: "insufficient_data",
      latest: null,
      rollingAverage: null,
      previousAverage: null,
      change: null,
      points: [],
      unit: "lbs",
    },
    workoutDaysLast7: 0,
    walkingDaysLast7: 0,
    proteinDaysLast7: 0,
    hydrationDaysLast7: 0,
    energyTrend: {
      status: "insufficient_data",
      latest: null,
      rollingAverage: null,
      previousAverage: null,
      change: null,
      points: [],
    },
    sleepTrend: {
      status: "insufficient_data",
      latest: null,
      rollingAverage: null,
      previousAverage: null,
      change: null,
      points: [],
    },
    milestones: [],
    restoreActive: false,
    restoreCompletedGentleSessions: 0,
  };

  try {
    const [profileRow, herProfile, metrics, workouts, checkIns, milestones, enrollments] =
      await Promise.all([
        getProfile(supabase, user.id),
        getWomenWellnessProfile(supabase, user.id),
        listRecentMetrics(supabase, user.id, 60),
        listWorkoutLogs(supabase, user.id, 60),
        listRecentCheckIns(supabase, user.id, 30),
        listMilestones(supabase, user.id),
        listActiveEnrollments(supabase, user.id),
      ]);
    const today = localDayISO(profileRow?.timezone ?? null);
    const tracksWeight = herProfile?.tracks_weight ?? true;
    const completed = workouts.filter((log) => log.completion_status === "completed");

    props = {
      weight: {
        ...summarizeTrend(
          metrics
            .filter((m) => m.weight_lbs != null)
            .map((m) => ({ date: m.metric_date, value: m.weight_lbs! })),
          tracksWeight,
        ),
        unit:
          (herProfile?.units_preference ?? "imperial") === "metric" ? "kg (entered as lbs)" : "lbs",
      },
      workoutDaysLast7: consistencyCount(
        completed.map((log) => log.workout_date),
        7,
        today,
      ),
      walkingDaysLast7: consistencyCount(
        completed.filter((log) => log.source === "walking").map((log) => log.workout_date),
        7,
        today,
      ),
      proteinDaysLast7: consistencyCount(
        metrics.filter((m) => (m.protein_grams ?? 0) > 0).map((m) => m.metric_date),
        7,
        today,
      ),
      hydrationDaysLast7: consistencyCount(
        metrics.filter((m) => (m.water_ounces ?? 0) > 0).map((m) => m.metric_date),
        7,
        today,
      ),
      energyTrend: summarizeTrend(
        checkIns
          .filter((c) => c.energy != null)
          .map((c) => ({ date: c.check_in_date, value: c.energy! })),
      ),
      sleepTrend: summarizeTrend(
        checkIns
          .filter((c) => c.sleep_hours != null)
          .map((c) => ({ date: c.check_in_date, value: c.sleep_hours! })),
      ),
      milestones: milestones.slice(0, 10).map((milestone) => ({
        key: milestone.milestone_key,
        message: milestone.celebration_message,
        achievedAt: milestone.achieved_at,
      })),
      restoreActive: enrollments.some((enrollment) => enrollment.pathway_key === "restore"),
      restoreCompletedGentleSessions: completed.filter(
        (log) => !log.pain_during && !log.doming_or_coning && !log.pelvic_floor_symptom,
      ).length,
    };
  } catch {
    // Not-enough-data defaults render honestly.
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        title="Progress"
        subtitle="Consistency first. Averages over single days. Nothing here grades you."
      />
      <ProgressView {...props} />
    </div>
  );
}
