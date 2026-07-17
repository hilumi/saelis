import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables, TablesInsert } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export async function getActiveProgram(
  supabase: Client,
  userId: string,
): Promise<Tables<"wellness_programs"> | null> {
  const { data, error } = await supabase
    .from("wellness_programs")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not load your program.");
  return data;
}

/**
 * Persists a generated program atomically-in-effect: supersedes any existing
 * draft/active program, inserts the new program, then its weeks (cascade
 * removes weeks if the program row is deleted; a failed week insert removes
 * the new program to avoid a half-written state).
 */
export async function createProgramWithWeeks(
  supabase: Client,
  userId: string,
  program: Omit<TablesInsert<"wellness_programs">, "user_id">,
  weeks: Omit<TablesInsert<"wellness_program_weeks">, "program_id">[],
): Promise<Tables<"wellness_programs">> {
  const { error: supersedeError } = await supabase
    .from("wellness_programs")
    .update({ status: "superseded" })
    .eq("user_id", userId)
    .in("status", ["draft", "active"]);
  if (supersedeError) throw new Error("Could not update your program.");

  const { data: created, error } = await supabase
    .from("wellness_programs")
    .insert({ ...program, user_id: userId })
    .select("*")
    .single();
  if (error || !created) throw new Error("Could not create your program.");

  const { error: weeksError } = await supabase
    .from("wellness_program_weeks")
    .insert(weeks.map((week) => ({ ...week, program_id: created.id })));
  if (weeksError) {
    await supabase.from("wellness_programs").delete().eq("id", created.id).eq("user_id", userId);
    throw new Error("Could not create your program.");
  }
  return created;
}

/** The program week covering a given ISO date, for the user's active program. */
export async function getCurrentProgramWeek(
  supabase: Client,
  userId: string,
  isoDate: string,
): Promise<{
  program: Tables<"wellness_programs">;
  week: Tables<"wellness_program_weeks">;
} | null> {
  const program = await getActiveProgram(supabase, userId);
  if (!program) return null;
  const start = new Date(`${program.start_date}T00:00:00Z`).getTime();
  const today = new Date(`${isoDate}T00:00:00Z`).getTime();
  const weekNumber = Math.floor((today - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
  if (weekNumber < 1 || weekNumber > program.total_weeks) return null;
  const { data, error } = await supabase
    .from("wellness_program_weeks")
    .select("*")
    .eq("program_id", program.id)
    .eq("week_number", weekNumber)
    .maybeSingle();
  if (error) throw new Error("Could not load your program week.");
  return data ? { program, week: data } : null;
}

export async function listProgramWeeks(
  supabase: Client,
  userId: string,
  programId: string,
): Promise<Tables<"wellness_program_weeks">[]> {
  // Ownership check via the parent program (RLS is the final authority).
  const { data: program, error: programError } = await supabase
    .from("wellness_programs")
    .select("id")
    .eq("id", programId)
    .eq("user_id", userId)
    .maybeSingle();
  if (programError || !program) throw new Error("Could not load your program.");

  const { data, error } = await supabase
    .from("wellness_program_weeks")
    .select("*")
    .eq("program_id", programId)
    .order("week_number", { ascending: true });
  if (error) throw new Error("Could not load your program weeks.");
  return data ?? [];
}
