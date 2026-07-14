import { describe, expect, it } from "vitest";

import { applyContextBudget, CONTEXT_BUDGET } from "@/lib/ai/context-budget";

describe("applyContextBudget", () => {
  it("caps memories and memory length", () => {
    const memories = Array.from({ length: 30 }, (_, i) => ({
      category: "shared-context",
      content: `memory ${i} ${"x".repeat(600)}`,
    }));
    const budgeted = applyContextBudget([], memories);
    expect(budgeted.approvedMemories).toHaveLength(CONTEXT_BUDGET.maxApprovedMemories);
    for (const memory of budgeted.approvedMemories) {
      expect(memory.content.length).toBeLessThanOrEqual(CONTEXT_BUDGET.maxMemoryContentLength);
    }
  });

  it("trims the oldest turns first when over the character budget", () => {
    const turns = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `turn ${i} ${"y".repeat(3000)}`,
    }));
    const budgeted = applyContextBudget(turns, []);
    expect(budgeted.recentTurns.length).toBeLessThan(12);
    expect(budgeted.recentTurns.at(-1)?.content.startsWith("turn 11")).toBe(true);
    const total = budgeted.recentTurns.reduce((sum, t) => sum + t.content.length, 0);
    expect(total).toBeLessThanOrEqual(CONTEXT_BUDGET.maxContextCharacters);
  });

  it("leaves small contexts untouched", () => {
    const turns = [{ role: "user" as const, content: "short" }];
    const memories = [{ category: "shared-context", content: "tiny" }];
    expect(applyContextBudget(turns, memories)).toEqual({
      recentTurns: turns,
      approvedMemories: memories,
    });
  });
});
