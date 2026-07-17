import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/types";
import type { PathwayKey } from "@/lib/wellness/pathways/types";
import type { PathwayEnrollmentInput } from "@/lib/validation/wellness";

type Client = SupabaseClient<Database>;

export async function listEnrollments(
  supabase: Client,
  userId: string,
): Promise<Tables<"wellness_enrollments">[]> {
  const { data, error } = await supabase
    .from("wellness_enrollments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error("Could not load your pathways.");
  return data ?? [];
}

/** Multiple simultaneously active enrollments are fully supported. */
export async function listActiveEnrollments(
  supabase: Client,
  userId: string,
): Promise<Tables<"wellness_enrollments">[]> {
  const { data, error } = await supabase
    .from("wellness_enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Could not load your pathways.");
  return data ?? [];
}

export async function getActiveEnrollmentForPathway(
  supabase: Client,
  userId: string,
  pathwayKey: PathwayKey,
): Promise<Tables<"wellness_enrollments"> | null> {
  const { data, error } = await supabase
    .from("wellness_enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("pathway_key", pathwayKey)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error("Could not load that pathway.");
  return data;
}

/**
 * Creates an enrollment. The database's partial unique index rejects a second
 * ACTIVE enrollment for the same pathway; that case returns a calm error.
 */
export async function createEnrollment(
  supabase: Client,
  userId: string,
  input: PathwayEnrollmentInput,
): Promise<Tables<"wellness_enrollments">> {
  const { data, error } = await supabase
    .from("wellness_enrollments")
    .insert({
      user_id: userId,
      pathway_key: input.pathwayKey,
      goal_summary: input.goalSummary ?? null,
      program_length_weeks: input.programLengthWeeks ?? null,
      settings: input.settings ?? {},
    })
    .select("*")
    .single();
  if (error || !data) {
    if (error?.code === "23505") {
      throw new Error("You are already enrolled in that pathway.");
    }
    throw new Error("Could not start that pathway.");
  }
  return data;
}

async function setEnrollmentStatus(
  supabase: Client,
  userId: string,
  enrollmentId: string,
  status: Tables<"wellness_enrollments">["status"],
  completedOn: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from("wellness_enrollments")
    .update({ status, completed_on: completedOn })
    .eq("id", enrollmentId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not update that pathway.");
}

export async function pauseEnrollment(
  supabase: Client,
  userId: string,
  enrollmentId: string,
): Promise<void> {
  await setEnrollmentStatus(supabase, userId, enrollmentId, "paused");
}

export async function resumeEnrollment(
  supabase: Client,
  userId: string,
  enrollmentId: string,
): Promise<void> {
  await setEnrollmentStatus(supabase, userId, enrollmentId, "active");
}

/** Archiving keeps every record — nothing is deleted when a pathway is set aside. */
export async function archiveEnrollment(
  supabase: Client,
  userId: string,
  enrollmentId: string,
): Promise<void> {
  await setEnrollmentStatus(supabase, userId, enrollmentId, "archived");
}

/** Replaces the enrollment's settings JSONB (already Zod-validated upstream). */
export async function updateEnrollmentSettings(
  supabase: Client,
  userId: string,
  enrollmentId: string,
  settings: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("wellness_enrollments")
    .update({ settings: settings as Tables<"wellness_enrollments">["settings"] })
    .eq("id", enrollmentId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not update that pathway.");
}

export async function completeEnrollment(
  supabase: Client,
  userId: string,
  enrollmentId: string,
): Promise<void> {
  await setEnrollmentStatus(
    supabase,
    userId,
    enrollmentId,
    "completed",
    new Date().toISOString().slice(0, 10),
  );
}
