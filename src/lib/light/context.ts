import { z } from "zod";

import { COMPANION_MAX_MESSAGE_LENGTH } from "@/lib/constants";

import type { LightContext, LightTurn } from "@/lib/light/types";

/**
 * Context normalization — the only gate through which conversation data
 * reaches the rest of the engine. Responsibilities:
 *  - trim and bound the message,
 *  - drop malformed turns and cap history,
 *  - include only approved memories, and none at all when the user has
 *    disabled companion memory,
 *  - never carry internal database fields, secrets, or hidden reasoning.
 */

export const MAX_RECENT_TURNS = 12;
export const MAX_APPROVED_MEMORIES = 10;

export class LightContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LightContextError";
  }
}

const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(COMPANION_MAX_MESSAGE_LENGTH),
});

const memorySchema = z.object({
  category: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(1000),
});

export function normalizeLightContext(context: LightContext): LightContext {
  const message = context.message.trim();
  if (message.length === 0) {
    throw new LightContextError("A message is required — even a single word is enough.");
  }
  const boundedMessage = message.slice(0, COMPANION_MAX_MESSAGE_LENGTH);

  const recentTurns: LightTurn[] = context.recentTurns
    .map((turn) => turnSchema.safeParse(turn))
    .filter((result): result is z.SafeParseSuccess<LightTurn> => result.success)
    .map((result) => result.data)
    .slice(-MAX_RECENT_TURNS);

  const approvedMemories = context.privacy.allowCompanionMemory
    ? context.approvedMemories
        .map((memory) => memorySchema.safeParse(memory))
        .filter((result) => result.success)
        .map((result) => result.data as { category: string; content: string })
        .slice(0, MAX_APPROVED_MEMORIES)
    : [];

  return {
    userId: context.userId,
    preferredName: context.preferredName?.trim() || undefined,
    message: boundedMessage,
    recentTurns,
    companionProfile: context.companionProfile,
    approvedMemories,
    latestArrival: context.latestArrival,
    privacy: {
      saveConversationHistory: context.privacy.saveConversationHistory,
      allowCompanionMemory: context.privacy.allowCompanionMemory,
    },
  };
}
