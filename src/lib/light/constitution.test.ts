import { describe, expect, it } from "vitest";

import { buildConstitutionInstruction, CONSTITUTION_RULES } from "@/lib/light/constitution";

describe("CONSTITUTION_RULES", () => {
  it("includes every required rule", () => {
    const ids = CONSTITUTION_RULES.map((rule) => rule.id);
    for (const required of [
      "receive-first",
      "preserve-agency",
      "ask-before-memory",
      "no-diagnosis",
      "no-dependency",
      "no-impersonation",
      "no-forced-action",
      "no-forced-positivity",
      "admit-uncertainty",
      "protect-privacy",
      "faith-boundaries",
      "urgent-override",
      "no-hidden-reasoning",
    ]) {
      expect(ids).toContain(required);
    }
  });

  it("keeps inviolable rules at priority 1", () => {
    const inviolable = CONSTITUTION_RULES.filter((rule) => rule.priority === 1).map((r) => r.id);
    expect(inviolable).toContain("no-diagnosis");
    expect(inviolable).toContain("ask-before-memory");
    expect(inviolable).toContain("urgent-override");
  });
});

describe("buildConstitutionInstruction", () => {
  it("is deterministic for a given mode", () => {
    expect(buildConstitutionInstruction("witness")).toBe(buildConstitutionInstruction("witness"));
  });

  it("orders by priority and includes universal rules", () => {
    const instruction = buildConstitutionInstruction("comfort");
    expect(instruction).toContain("Never diagnose");
    expect(instruction).toContain("The user decides");
    expect(instruction.startsWith("You are Saelis")).toBe(true);
  });

  it("applies mode-scoped rules only to their modes", () => {
    const witness = buildConstitutionInstruction("witness");
    const act = buildConstitutionInstruction("act");
    // "no-forced-action" applies to receptive modes, not to act itself.
    expect(witness).toContain("only when the user is ready");
    expect(act).not.toContain("only when the user is ready");
  });

  it("stays compact — never the full prose documentation", () => {
    const instruction = buildConstitutionInstruction("witness");
    expect(instruction.length).toBeLessThan(2500);
  });
});
