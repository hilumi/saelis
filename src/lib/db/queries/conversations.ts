import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables, TablesInsert } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export async function createConversation(
  supabase: Client,
  userId: string,
  title: string | null = null,
): Promise<Tables<"conversations">> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title })
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not start a conversation.");
  return data;
}

export async function getConversation(
  supabase: Client,
  userId: string,
  conversationId: string,
): Promise<Tables<"conversations"> | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load that conversation.");
  return data;
}

/** Most recent turns for context, returned oldest-first. */
export async function getRecentTurns(
  supabase: Client,
  userId: string,
  conversationId: string,
  limit = 12,
): Promise<Tables<"conversation_turns">[]> {
  const { data, error } = await supabase
    .from("conversation_turns")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load the conversation.");
  return (data ?? []).reverse();
}

export async function saveTurn(
  supabase: Client,
  turn: TablesInsert<"conversation_turns">,
): Promise<Tables<"conversation_turns">> {
  const { data, error } = await supabase
    .from("conversation_turns")
    .insert(turn)
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not save that turn.");
  return data;
}

export async function deleteAllConversations(supabase: Client, userId: string): Promise<void> {
  // conversation_turns cascade from conversations.
  const { error } = await supabase.from("conversations").delete().eq("user_id", userId);
  if (error) throw new Error("Could not delete your conversations.");
}
