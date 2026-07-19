import { getSupabase } from "@/lib/supabase";

/**
 * Companion-memory controls, over the same RLS-protected tables the web app
 * uses (auth.uid() own-row policies; no user id ever passed from the client).
 *
 * Model (mirrors the web):
 *  - a memory is only ever used when status='active' AND user_approved=true;
 *  - user-added memories here are explicit → created active + approved;
 *  - deletion is permanent (existing MVP policy);
 *  - the master switch is user_privacy_settings.allow_companion_memory.
 */

export interface CompanionMemoryItem {
  id: string;
  category: string;
  content: string;
  status: string;
  createdAt: string;
}

export interface MemorySettings {
  allowCompanionMemory: boolean;
  preferredName: string | null;
}

export async function fetchMemorySettings(): Promise<MemorySettings> {
  const supabase = getSupabase();
  const [{ data: privacy }, { data: profile }] = await Promise.all([
    supabase.from("user_privacy_settings").select("allow_companion_memory").maybeSingle(),
    supabase.from("profiles").select("preferred_name").maybeSingle(),
  ]);
  return {
    allowCompanionMemory:
      (privacy as { allow_companion_memory?: boolean } | null)?.allow_companion_memory ?? true,
    preferredName: (profile as { preferred_name?: string | null } | null)?.preferred_name ?? null,
  };
}

export async function setAllowCompanionMemory(userId: string, allow: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from("user_privacy_settings")
    .upsert({ user_id: userId, allow_companion_memory: allow }, { onConflict: "user_id" });
  if (error) throw new Error("Could not update the memory setting.");
}

export async function setPreferredName(name: string): Promise<void> {
  const trimmed = name.trim().slice(0, 60);
  const { error } = await getSupabase()
    .from("profiles")
    .update({ preferred_name: trimmed.length > 0 ? trimmed : null })
    .not("id", "is", null); // own row only — RLS restricts to auth.uid()
  if (error) throw new Error("Could not save your name.");
}

export async function listMemories(): Promise<CompanionMemoryItem[]> {
  const { data, error } = await getSupabase()
    .from("companion_memories")
    .select("id, category, content, status, created_at")
    .eq("status", "active")
    .eq("user_approved", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load memories.");
  return (
    (data ?? []) as {
      id: string;
      category: string;
      content: string;
      status: string;
      created_at: string;
    }[]
  ).map((row) => ({
    id: row.id,
    category: row.category,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
  }));
}

/** Explicit "please remember this" — created approved, category shared-context. */
export async function addMemory(userId: string, content: string): Promise<void> {
  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > 500) {
    throw new Error("Please keep a memory between 1 and 500 characters.");
  }
  const { error } = await getSupabase().from("companion_memories").insert({
    user_id: userId,
    category: "shared-context",
    content: trimmed,
    source: "explicit",
    status: "active",
    user_approved: true,
  });
  if (error) throw new Error("Could not save that memory.");
}

/** Permanent deletion (existing MVP policy). */
export async function deleteMemory(id: string): Promise<void> {
  const { error } = await getSupabase().from("companion_memories").delete().eq("id", id);
  if (error) throw new Error("Could not delete that memory.");
}

export async function clearAllMemories(userId: string): Promise<void> {
  const { error } = await getSupabase().from("companion_memories").delete().eq("user_id", userId);
  if (error) throw new Error("Could not clear your memories.");
}
