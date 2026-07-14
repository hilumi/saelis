import { describe, expect, it } from "vitest";

import { companionResponseSchema } from "@/lib/ai/companion-contract";

const validResponse = {
  supportMode: "comfort",
  message: "I'm here with you.",
  followUp: null,
  closingLine: null,
  suggestedStep: null,
  proposedMemory: null,
  safety: { level: "none", message: null },
};

describe("companionResponseSchema", () => {
  it("accepts a minimal valid response", () => {
    expect(companionResponseSchema.parse(validResponse)).toEqual(validResponse);
  });

  it("accepts a fully populated response", () => {
    const full = {
      ...validResponse,
      supportMode: "act",
      followUp: "What feels most present?",
      closingLine: "Be gentle with yourself.",
      suggestedStep: {
        title: "One step",
        description: "Do the small thing.",
        estimatedMinutes: 10,
      },
      proposedMemory: { category: "context", content: "Prefers mornings", reason: "You said so." },
      safety: { level: "support", message: "Support is available." },
    };
    expect(companionResponseSchema.parse(full)).toEqual(full);
  });

  it("rejects an unknown support mode", () => {
    expect(
      companionResponseSchema.safeParse({ ...validResponse, supportMode: "diagnose" }).success,
    ).toBe(false);
  });

  it("rejects an empty message", () => {
    expect(companionResponseSchema.safeParse({ ...validResponse, message: "" }).success).toBe(
      false,
    );
  });

  it("rejects a missing safety block", () => {
    expect(companionResponseSchema.safeParse({ ...validResponse, safety: undefined }).success).toBe(
      false,
    );
  });

  it("rejects out-of-range estimated minutes", () => {
    const bad = {
      ...validResponse,
      suggestedStep: {
        title: "Too big",
        description: "A whole life overhaul.",
        estimatedMinutes: 600,
      },
    };
    expect(companionResponseSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an invalid safety level", () => {
    expect(
      companionResponseSchema.safeParse({
        ...validResponse,
        safety: { level: "panic", message: null },
      }).success,
    ).toBe(false);
  });
});
