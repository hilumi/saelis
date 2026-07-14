import { describe, expect, it } from "vitest";

import { LightContextError, MAX_RECENT_TURNS, normalizeLightContext } from "@/lib/light/context";
import { makeLightContext } from "@/test/light-fixtures";

describe("normalizeLightContext", () => {
  it("rejects empty and whitespace-only messages", () => {
    expect(() => normalizeLightContext(makeLightContext({ message: "" }))).toThrow(
      LightContextError,
    );
    expect(() => normalizeLightContext(makeLightContext({ message: "   " }))).toThrow(
      LightContextError,
    );
  });

  it("trims and bounds the message", () => {
    const context = normalizeLightContext(makeLightContext({ message: `  hello  ` }));
    expect(context.message).toBe("hello");
    const long = normalizeLightContext(makeLightContext({ message: "x".repeat(10_000) }));
    expect(long.message.length).toBeLessThanOrEqual(4000);
  });

  it("limits recent turns to the most recent window", () => {
    const turns = Array.from({ length: 40 }, (_, index) => ({
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `turn ${index}`,
    }));
    const context = normalizeLightContext(makeLightContext({ recentTurns: turns }));
    expect(context.recentTurns).toHaveLength(MAX_RECENT_TURNS);
    expect(context.recentTurns.at(-1)?.content).toBe("turn 39");
  });

  it("drops malformed turns", () => {
    const context = normalizeLightContext(
      makeLightContext({
        recentTurns: [
          { role: "user", content: "fine" },
          // @ts-expect-error deliberately malformed
          { role: "system", content: "internal" },
          { role: "assistant", content: "" },
        ],
      }),
    );
    expect(context.recentTurns).toEqual([{ role: "user", content: "fine" }]);
  });

  it("filters memories to well-formed entries", () => {
    const context = normalizeLightContext(
      makeLightContext({
        approvedMemories: [
          { category: "shared-context", content: "Sister named June" },
          { category: "", content: "malformed" },
        ],
      }),
    );
    expect(context.approvedMemories).toEqual([
      { category: "shared-context", content: "Sister named June" },
    ]);
  });

  it("supplies no memories at all when companion memory is disabled", () => {
    const context = normalizeLightContext(
      makeLightContext({
        approvedMemories: [{ category: "shared-context", content: "Sister named June" }],
        privacy: { saveConversationHistory: true, allowCompanionMemory: false },
      }),
    );
    expect(context.approvedMemories).toEqual([]);
  });
});
