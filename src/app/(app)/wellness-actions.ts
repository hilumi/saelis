"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { upsertPostpartumProfile } from "@/lib/db/queries/postpartum/profile";
import { upsertDailyCheckIn } from "@/lib/db/queries/wellness/check-ins";
import {
  archiveEnrollment,
  createEnrollment,
  pauseEnrollment,
  resumeEnrollment,
  updateEnrollmentSettings,
} from "@/lib/db/queries/wellness/enrollments";
import { createGoal } from "@/lib/db/queries/wellness/goals";
import { upsertNotificationPreferences } from "@/lib/db/queries/wellness/notifications";
import { saveOnboardingDraft } from "@/lib/db/queries/wellness/onboarding";
import { upsertWomenWellnessProfile } from "@/lib/db/queries/wellness/profiles";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/lib/wellness/complete-onboarding";
import {
  dailyCheckInSchema,
  enrollmentSettingsSchema,
  pathwayEnrollmentSchema,
  postpartumProfileSchema,
  wellnessGoalSchema,
  womenWellnessProfileSchema,
} from "@/lib/validation/wellness";
import {
  notificationPreferencesSchema,
  onboardingDraftDataSchema,
  onboardingStepSchema,
} from "@/lib/validation/wellness-onboarding";

import type { ActionResult } from "@/types/actions";

/**
 * Saelis Her server actions. Every action derives identity from the server
 * session, validates with Zod, scopes queries to that user (RLS is the final
 * authority), returns calm content-free errors, and NEVER logs profile,
 * symptom, or onboarding content.
 */

const CALM_ERROR = "That didn't save. Nothing was lost — please try again.";

function failure(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : CALM_ERROR };
}

const HER_PATHS = ["/wellness", "/wellness/her", "/wellness/her/pathways", "/home"];

function revalidateHer(): void {
  for (const path of HER_PATHS) revalidatePath(path);
}

// --- Enrollment management -------------------------------------------------

export async function enrollInPathway(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = pathwayEnrollmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That pathway choice didn't look right." };
    const supabase = await createClient();
    await createEnrollment(supabase, user.id, parsed.data);
    revalidateHer();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

const enrollmentIdSchema = z.object({ enrollmentId: z.string().uuid() });

async function setEnrollmentState(
  input: unknown,
  operation: "pause" | "resume" | "archive",
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = enrollmentIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: CALM_ERROR };
    const supabase = await createClient();
    if (operation === "pause") await pauseEnrollment(supabase, user.id, parsed.data.enrollmentId);
    if (operation === "resume") await resumeEnrollment(supabase, user.id, parsed.data.enrollmentId);
    if (operation === "archive")
      await archiveEnrollment(supabase, user.id, parsed.data.enrollmentId);
    revalidateHer();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function pausePathway(input: unknown): Promise<ActionResult> {
  return setEnrollmentState(input, "pause");
}

export async function resumePathway(input: unknown): Promise<ActionResult> {
  return setEnrollmentState(input, "resume");
}

export async function archivePathway(input: unknown): Promise<ActionResult> {
  return setEnrollmentState(input, "archive");
}

const enrollmentSettingsInputSchema = z.object({
  enrollmentId: z.string().uuid(),
  settings: enrollmentSettingsSchema,
});

export async function savePathwaySettings(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = enrollmentSettingsInputSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Those settings didn't look right." };
    const supabase = await createClient();
    await updateEnrollmentSettings(
      supabase,
      user.id,
      parsed.data.enrollmentId,
      parsed.data.settings,
    );
    revalidateHer();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// --- Profiles and goals ----------------------------------------------------

export async function saveHerProfile(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = womenWellnessProfileSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Some of those details didn't look right." };
    const supabase = await createClient();
    await upsertWomenWellnessProfile(supabase, user.id, parsed.data);
    revalidateHer();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Restore profile writes require the user's own ACTIVE Restore enrollment —
 * verified in the postpartum service and again by RLS. Never available to
 * non-Restore users.
 */
export async function saveRestoreProfile(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = postpartumProfileSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Some of those details didn't look right." };
    const supabase = await createClient();
    await upsertPostpartumProfile(supabase, user.id, parsed.data);
    revalidatePath("/wellness/her/settings");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function saveHerGoal(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = wellnessGoalSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That goal didn't look right." };
    const supabase = await createClient();
    await createGoal(supabase, user.id, parsed.data);
    revalidateHer();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function saveHerNotificationPreferences(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = notificationPreferencesSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Those preferences didn't look right." };
    const supabase = await createClient();
    await upsertNotificationPreferences(supabase, user.id, parsed.data);
    revalidatePath("/wellness/her/settings");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// --- Onboarding ------------------------------------------------------------

const onboardingProgressSchema = z.object({
  currentStep: onboardingStepSchema,
  data: onboardingDraftDataSchema,
});

export async function saveOnboardingProgress(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = onboardingProgressSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Something on this step didn't look right yet." };
    }
    const supabase = await createClient();
    await saveOnboardingDraft(supabase, user.id, parsed.data.currentStep, parsed.data.data);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function finishOnboarding(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = onboardingDraftDataSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "A few steps still need attention before setup can finish." };
    }
    const supabase = await createClient();
    await completeOnboarding(supabase, user.id, parsed.data);
    revalidateHer();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// --- Readiness check-in (basic entry; the full engine is Phase 3) ----------

const readinessCheckInSchema = dailyCheckInSchema.pick({
  checkInDate: true,
  readiness: true,
  energy: true,
  availableMinutes: true,
});

export async function saveReadinessCheckIn(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = readinessCheckInSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That check-in didn't look right." };
    const supabase = await createClient();
    await upsertDailyCheckIn(supabase, user.id, dailyCheckInSchema.parse(parsed.data));
    revalidatePath("/wellness/her");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// --- Evening reflection (stored in the day's check-in notes; skippable) ----

const reflectionSchema = z.object({
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reflection: z.string().trim().min(1).max(500),
});

export async function saveEveningReflection(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = reflectionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That reflection didn't save." };
    const supabase = await createClient();
    // Upsert sets only the provided columns — other check-in answers survive.
    const { error } = await supabase.from("wellness_daily_check_ins").upsert(
      {
        user_id: user.id,
        check_in_date: parsed.data.checkInDate,
        notes: parsed.data.reflection,
      },
      { onConflict: "user_id,check_in_date" },
    );
    if (error) return { ok: false, error: CALM_ERROR };
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// --- Wellness data deletion (existing deletion architecture, RLS session) --

const deletionConfirmSchema = z.object({ confirm: z.literal(true) });

export async function deleteAllHerData(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = deletionConfirmSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: CALM_ERROR };
    const supabase = await createClient();
    const { deleteAllWellnessData } = await import("@/lib/db/queries/wellness/deletion");
    await deleteAllWellnessData(supabase, user.id);
    revalidateHer();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
