import { describe, expect, it } from "vitest";

import {
  CLOSING_LINES,
  COMPLETION_LINE,
  createClosingPolicy,
  selectClosingContext,
  selectClosingLine,
} from "@/lib/light/closing";
import { createUnderstanding } from "@/lib/light/understanding";
import { makeLightContext } from "@/test/light-fixtures";

const SOME_TURNS = Array.from({ length: 6 }, (_, index) => ({
  role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
  content: `turn ${index}`,
}));

describe("closing policy", () => {
  it("adds no closing line to a fresh exchange", () => {
    const context = makeLightContext({ message: "Today was awful." });
    const policy = createClosingPolicy(createUnderstanding(context), context);
    expect(policy.context).toBe("no-closing");
    expect(policy.line).toBeNull();
  });

  it("closes a settled moment with a mode-appropriate line", () => {
    const context = makeLightContext({ message: "Today was awful.", recentTurns: SOME_TURNS });
    const policy = createClosingPolicy(createUnderstanding(context), context);
    expect(policy.context).toBe("moment-concluded");
    expect(CLOSING_LINES.witness).toContain(policy.line);
  });

  it("celebration concludes the moment even early", () => {
    const context = makeLightContext({ message: "I did it! I got the job." });
    const policy = createClosingPolicy(createUnderstanding(context), context);
    expect(policy.context).toBe("moment-concluded");
    expect(policy.line).toBe("Let this joy stay with you for a while.");
  });

  it("never closes an urgent safety response", () => {
    const context = makeLightContext({
      message: "I'm thinking about harming myself.",
      recentTurns: SOME_TURNS,
    });
    const policy = createClosingPolicy(createUnderstanding(context), context);
    expect(policy.context).toBe("no-closing");
    expect(policy.line).toBeNull();
  });

  it("selects deterministically for the same seed", () => {
    const first = selectClosingLine("comfort", "moment-concluded", "user-1:6:comfort");
    const second = selectClosingLine("comfort", "moment-concluded", "user-1:6:comfort");
    expect(first).toBe(second);
    expect(CLOSING_LINES.comfort).toContain(first);
  });

  it("reserves the completion line for completed steps and goodbyes", () => {
    expect(selectClosingLine("act", "step-completed", "any")).toBe(COMPLETION_LINE);
    expect(selectClosingLine("witness", "conversation-ended", "any")).toBe(COMPLETION_LINE);
  });

  it("returns no line for the no-closing context", () => {
    expect(selectClosingLine("comfort", "no-closing", "any")).toBeNull();
    expect(
      selectClosingContext(
        createUnderstanding(makeLightContext({ message: "hi" })),
        makeLightContext({ message: "hi" }),
      ),
    ).toBe("no-closing");
  });
});
