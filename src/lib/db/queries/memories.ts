import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables, TablesUpdate } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * Memory rules enforced here (mirrors schema constraint + app policy):
 *  - Only memories with status='active' AND user_approved=true are ever
 *    supplied to the companion.
 *  - Proposals are stored as status='proposed', user_approved=false and do
 *    nothing until the user approves them.
 *  - Deletion is permanent (MVP policy — no legal retention requirement).
 */

export async function listApprovedActiveMemories(
  supabase: Client,
  userId: string,
): Promise<Tables<"companion_memories">[]> {
  const { data, error } = await supabase
    .from("companion_memories")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("user_approved", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load memories.");
  return data ?? [];
}

export async function listReviewableMemories(
  supabase: Client,
  userId: string,
): Promise<Tables<"companion_memories">[]> {
  const { data, error } = await supabase
    .from("companion_memories")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load memories.");
  return data ?? [];
}

export async function approveMemory(
  supabase: Client,
  userId: string,
  memoryId: string,
): Promise<void> {
  const { error } = await supabase
    .from("companion_memories")
    .update({ status: "active", user_approved: true })
    .eq("id", memoryId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not approve that memory.");
}

export async function rejectMemory(
  supabase: Client,
  userId: string,
  memoryId: string,
): Promise<void> {
  const { error } = await supabase
    .from("companion_memories")
    .update({ status: "rejected", user_approved: false })
    .eq("id", memoryId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not set that memory aside.");
}

/** Permanent deletion — MVP policy when the user explicitly deletes. */
export async function deleteMemoryPermanently(
  supabase: Client,
  userId: string,
  memoryId: string,
): Promise<void> {
  const { error } = await supabase
    .from("companion_memories")
    .delete()
    .eq("id", memoryId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not delete that memory.");
}

export async function updateMemory(
  supabase: Client,
  userId: string,
  memoryId: string,
  values: Pick<TablesUpdate<"companion_memories">, "kind" | "title" | "content" | "reason">,
): Promise<void> {
  const { error } = await supabase
    .from("companion_memories")
    .update(values)
    .eq("id", memoryId)
    .eq("user_id", userId);
  if (error) throw new Error("Could not update that memory.");
}

/** User-created memory (e.g. a North Star): explicit, active, approved. */
export async function createUserMemory(
  supabase: Client,
  userId: string,
  values: {
    kind: "constellation" | "north-star";
    title: string | null;
    content: string;
    reason: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("companion_memories").insert({
    user_id: userId,
    category: values.kind === "north-star" ? "north-star" : "shared-context",
    content: values.content,
    kind: values.kind,
    title: values.title,
    reason: values.reason,
    source: "explicit",
    status: "active",
    user_approved: true,
  });
  if (error) throw new Error("Could not keep that memory.");
}

/** Transparency only — never engagement data. Sets last_used_at. */
export async function markMemoriesUsedNow(
  supabase: Client,
  userId: string,
  memoryIds: string[],
): Promise<void> {
  if (memoryIds.length === 0) return;
  try {
    await supabase
      .from("companion_memories")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("id", memoryIds);
  } catch {
    // Transparency metadata must never break a response.
  }
}

export async function deleteAllMemories(supabase: Client, userId: string): Promise<void> {
  const { error } = await supabase.from("companion_memories").delete().eq("user_id", userId);
  if (error) throw new Error("Could not delete your memories.");
}
