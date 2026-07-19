import type {
  ConversationStatus,
  ConversationSummary,
  ConversationTurn,
  TurnRole,
} from "@saelis/shared";

import { getSupabase } from "@/lib/supabase";

/**
 * Conversation history, read directly from the RLS-protected tables with the
 * user's own JWT — exactly the rows the web app reads server-side. RLS
 * own-row policies (auth.uid()) are the authority; no user id is ever passed
 * from the client.
 */

interface ConversationRow {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TurnRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  support_mode: string | null;
  created_at: string;
}

export async function listConversations(limit = 30): Promise<ConversationSummary[]> {
  const { data, error } = await getSupabase()
    .from("conversations")
    .select("id, title, status, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load your conversations.");
  return ((data ?? []) as ConversationRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status as ConversationStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/** Latest turns, returned oldest-first (deterministic render order). */
export async function listTurns(conversationId: string, limit = 80): Promise<ConversationTurn[]> {
  const { data, error } = await getSupabase()
    .from("conversation_turns")
    .select("id, conversation_id, role, content, support_mode, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Could not load the conversation.");
  return ((data ?? []) as TurnRow[])
    .map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role as TurnRole,
      content: row.content,
      supportMode: row.support_mode,
      createdAt: row.created_at,
    }))
    .reverse();
}

/** Most recent conversation, if any — used to restore after relaunch. */
export async function getMostRecentConversation(): Promise<ConversationSummary | null> {
  const conversations = await listConversations(1);
  return conversations[0] ?? null;
}
