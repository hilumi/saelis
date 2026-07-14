import { describe, expect, it } from "vitest";

import { createUnderstanding } from "@/lib/light/understanding";
import { makeLightContext } from "@/test/light-fixtures";

import type { SupportMode } from "@/lib/light/types";

function understand(message: string) {
  return createUnderstanding(makeLightContext({ message }));
}

describe("createUnderstanding — message matrix", () => {
  const matrix: Array<{
    message: string;
    supportMode: SupportMode;
    safetyLevel?: "none" | "support" | "urgent";
  }> = [
    { message: "I just need to vent.", supportMode: "witness" },
    { message: "Today was awful.", supportMode: "witness" },
    { message: "I feel completely unappreciated.", supportMode: "witness" },
    { message: "Can you help me figure out what to do next?", supportMode: "act" },
    { message: "Give me three steps.", supportMode: "act" },
    { message: "I can’t decide whether to stay or leave.", supportMode: "clarify" },
    { message: "Help me write a message to my daughter.", supportMode: "connect" },
    { message: "I did it! I got the job.", supportMode: "celebrate" },
    { message: "I’m so relieved.", supportMode: "celebrate" },
    { message: "Can you just stay with me for a minute?", supportMode: "presence" },
    { message: "I want to understand why this keeps affecting me.", supportMode: "reflect" },
    { message: "I’m exhausted, but I don’t want advice.", supportMode: "comfort" },
    { message: "Would you pray with me?", supportMode: "reflect" },
    {
      message: "I’m thinking about harming myself.",
      supportMode: "presence",
      safetyLevel: "urgent",
    },
  ];

  for (const row of matrix) {
    it(`routes "${row.message}" to ${row.supportMode}`, () => {
      const result = understand(row.message);
      expect(result.supportMode).toBe(row.supportMode);
      expect(result.safetyLevel).toBe(row.safetyLevel ?? "none");
    });
  }
});

describe("createUnderstanding — routing rules", () => {
  it("explicit vent never becomes an action plan", () => {
    const result = understand("I just need to vent about work, give me nothing to do");
    expect(result.supportMode).toBe("witness");
    expect(result.actionReadiness).toBe("not-ready");
  });

  it("explicit steps permit action", () => {
    const result = understand("Give me three steps.");
    expect(result.actionReadiness).toBe("explicitly-requested");
    expect(result.purpose).toBe("seek-plan");
  });

  it("decision language routes to clarify with uncertainty", () => {
    const result = understand("I can't decide whether to stay or leave.");
    expect(result.purpose).toBe("make-decision");
    expect(result.emotionalTone).toBe("uncertain");
  });

  it("communication writing routes to connect", () => {
    const result = understand("Help me write a message to my daughter.");
    expect(result.purpose).toBe("communicate");
  });

  it("celebration is joyful and not action-oriented", () => {
    const result = understand("I did it! I got the job.");
    expect(result.emotionalTone).toBe("joyful");
    expect(result.actionReadiness).toBe("not-ready");
  });

  it("distress without an action request does not default to action", () => {
    const result = understand("Everything is overwhelming and awful.");
    expect(result.supportMode).not.toBe("act");
    expect(result.actionReadiness).toBe("not-ready");
  });

  it("presence request selects presence", () => {
    const result = understand("Can you just stay with me for a minute?");
    expect(result.purpose).toBe("seek-presence");
  });

  it("low confidence falls back gently and asks for clarification", () => {
    const result = understand("hm.");
    expect(result.supportMode).toBe("explore");
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.requiresClarification).toBe(true);
  });

  it("urgent safety overrides every ordinary mode", () => {
    const result = understand("Give me three steps, I want to die.");
    expect(result.safetyLevel).toBe("urgent");
    expect(result.supportMode).toBe("presence");
    expect(result.cues).toEqual(["urgent-safety"]);
  });

  it("names cues without ever including raw user content", () => {
    const result = understand("I just need to vent.");
    expect(result.cues).toContain("explicit-vent");
    for (const cue of result.cues) {
      expect(cue).not.toContain("vent about");
    }
  });
});
