import { describe, expect, it } from "vitest";

import { companionResponseSchema } from "@/lib/ai/companion-contract";
import { COMPANION_RESPONSE_JSON_SCHEMA } from "@/lib/ai/openai-schema";
import { SUPPORT_MODES } from "@/lib/constants";

/**
 * Parity proof between the explicit JSON schema (OpenAI structured outputs)
 * and the Zod contract — required because Zod v3 has no native converter.
 */
describe("COMPANION_RESPONSE_JSON_SCHEMA parity", () => {
  const schema = COMPANION_RESPONSE_JSON_SCHEMA;

  it("lists exactly the Zod contract's keys, all required, no extras allowed", () => {
    const zodKeys = Object.keys(companionResponseSchema.shape).sort();
    expect([...schema.required].sort()).toEqual(zodKeys);
    expect(Object.keys(schema.properties).sort()).toEqual(zodKeys);
    expect(schema.additionalProperties).toBe(false);
  });

  it("matches the support-mode and safety-level enums", () => {
    expect(schema.properties.supportMode.enum).toEqual([...SUPPORT_MODES]);
    expect(schema.properties.safety.properties.level.enum).toEqual(["none", "support", "urgent"]);
  });

  it("marks nullable fields as nullable exactly where Zod does", () => {
    expect(schema.properties.followUp.type).toEqual(["string", "null"]);
    expect(schema.properties.closingLine.type).toEqual(["string", "null"]);
    expect(schema.properties.safety.properties.message.type).toEqual(["string", "null"]);
    const stepBranches = schema.properties.suggestedStep.anyOf.map((b) => b.type);
    expect(stepBranches).toContain("null");
    const memoryBranches = schema.properties.proposedMemory.anyOf.map((b) => b.type);
    expect(memoryBranches).toContain("null");
  });

  it("closes every nested object to additional properties", () => {
    const step = schema.properties.suggestedStep.anyOf[0];
    const memory = schema.properties.proposedMemory.anyOf[0];
    expect(step.additionalProperties).toBe(false);
    expect(memory.additionalProperties).toBe(false);
    expect(schema.properties.safety.additionalProperties).toBe(false);
    expect(schema.properties.reflection.anyOf[0].additionalProperties).toBe(false);
    expect(schema.properties.adaptationNotice.anyOf[0].additionalProperties).toBe(false);
    expect(schema.properties.insightCandidate.anyOf[0].additionalProperties).toBe(false);
  });

  it("v0.7 optional objects are required-nullable with fully required nested keys", () => {
    for (const key of ["reflection", "adaptationNotice", "insightCandidate"] as const) {
      expect(schema.required).toContain(key);
      const branches = schema.properties[key].anyOf.map((branch) => branch.type);
      expect(branches).toContain("null");
      expect(branches).toContain("object");
    }
    expect([...schema.properties.reflection.anyOf[0].required].sort()).toEqual([
      "alternativePerspectives",
      "facts",
      "interpretations",
      "unknowns",
    ]);
    expect([...schema.properties.adaptationNotice.anyOf[0].required].sort()).toEqual([
      "preferenceKey",
      "summary",
    ]);
    expect([...schema.properties.insightCandidate.anyOf[0].required].sort()).toEqual([
      "observation",
      "theme",
      "uncertaintyStatement",
    ]);
  });

  it("objects that satisfy the JSON schema shape also satisfy Zod (spot checks)", () => {
    const minimal = {
      supportMode: "presence",
      message: "I'm here.",
      followUp: null,
      closingLine: null,
      suggestedStep: null,
      proposedMemory: null,
      safety: { level: "none", message: null },
    };
    const full = {
      supportMode: "act",
      message: "One small step.",
      followUp: "Does that fit?",
      closingLine: "One clear step is enough.",
      suggestedStep: { title: "Step", description: "Small.", estimatedMinutes: 10 },
      proposedMemory: { category: "shared-context", content: "Fact", reason: "Asked." },
      safety: { level: "support", message: "Support note." },
    };
    expect(companionResponseSchema.safeParse(minimal).success).toBe(true);
    expect(companionResponseSchema.safeParse(full).success).toBe(true);
  });

  it("rejects with Zod what the schema would reject (extra keys, bad enums, bounds)", () => {
    expect(
      companionResponseSchema.safeParse({
        supportMode: "presence",
        message: "hi",
        followUp: null,
        closingLine: null,
        suggestedStep: null,
        proposedMemory: null,
        safety: { level: "none", message: null },
        extra: true,
      }).success,
      // Exact parity with additionalProperties:false — unknown keys reject.
    ).toBe(false);
    expect(
      companionResponseSchema.safeParse({
        supportMode: "diagnose",
        message: "hi",
        followUp: null,
        closingLine: null,
        suggestedStep: null,
        proposedMemory: null,
        safety: { level: "none", message: null },
      }).success,
    ).toBe(false);
    expect(
      companionResponseSchema.safeParse({
        supportMode: "act",
        message: "hi",
        followUp: null,
        closingLine: null,
        suggestedStep: { title: "x", description: "y", estimatedMinutes: 600 },
        proposedMemory: null,
        safety: { level: "none", message: null },
      }).success,
    ).toBe(false);
  });
});
