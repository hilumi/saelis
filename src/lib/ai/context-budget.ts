import type { ApprovedMemory, LightTurn } from "@/lib/light/types";

/**
 * Server-enforced context budget for provider requests.
 *
 * Priority (highest first): constitutional instruction, current user message,
 * latest arrival, companion profile, most recent turns, approved memories.
 * The instruction/message/arrival/profile are small and never trimmed here;
 * turns are trimmed oldest-first and memories are capped. The current user
 * message is NEVER silently trimmed — overlength messages are rejected with a
 * clear validation error at the API boundary instead.
 */

export const CONTEXT_BUDGET = {
  maxRecentTurns: 12,
  maxApprovedMemories: 10,
  maxMemoryContentLength: 500,
  /** Approximate character budget for turns + memories combined. */
  maxContextCharacters: 16_000,
} as const;

export interface BudgetedContext {
  recentTurns: LightTurn[];
  approvedMemories: ApprovedMemory[];
}

export function applyContextBudget(
  recentTurns: LightTurn[],
  approvedMemories: ApprovedMemory[],
): BudgetedContext {
  const memories = approvedMemories.slice(0, CONTEXT_BUDGET.maxApprovedMemories).map((memory) => ({
    category: memory.category,
    content: memory.content.slice(0, CONTEXT_BUDGET.maxMemoryContentLength),
  }));

  let turns = recentTurns.slice(-CONTEXT_BUDGET.maxRecentTurns);

  const memoryCharacters = memories.reduce((sum, m) => sum + m.content.length, 0);
  const turnCharacters = () => turns.reduce((sum, t) => sum + t.content.length, 0);

  // Trim the OLDEST turns first until inside the budget.
  while (
    turns.length > 0 &&
    memoryCharacters + turnCharacters() > CONTEXT_BUDGET.maxContextCharacters
  ) {
    turns = turns.slice(1);
  }

  return { recentTurns: turns, approvedMemories: memories };
}
