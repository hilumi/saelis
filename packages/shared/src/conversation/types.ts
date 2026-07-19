import type { TurnRole } from "../companion/constants";

/**
 * Conversation read-model shared across clients. Mirrors the
 * `conversations` / `conversation_turns` tables (camelCase app shape);
 * both are RLS-protected own-row tables.
 */

export type ConversationStatus = "active" | "completed" | "archived";

export interface ConversationSummary {
  id: string;
  title: string | null;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationTurn {
  id: string;
  conversationId: string;
  role: TurnRole;
  content: string;
  supportMode: string | null;
  createdAt: string;
}
