import { describe, expect, it } from "vitest";

import {
  createMemoryProposalCandidate,
  evaluateMemoryPolicy,
  isProhibitedMemoryCategory,
  PROHIBITED_MEMORY_CATEGORIES,
} from "@/lib/light/memory-policy";
import { createUnderstanding } from "@/lib/light/understanding";
import { makeLightContext } from "@/test/light-fixtures";

import type { ApprovedMemory, LightPrivacy } from "@/lib/light/types";

const PRIVACY_ON: LightPrivacy = { saveConversationHistory: true, allowCompanionMemory: true };
const PRIVACY_OFF: LightPrivacy = { saveConversationHistory: true, allowCompanionMemory: false };

function evaluate(message: string, privacy = PRIVACY_ON, approvedMemories: ApprovedMemory[] = []) {
  const understanding = createUnderstanding(makeLightContext({ message }));
  return evaluateMemoryPolicy({ privacy, understanding, message, approvedMemories });
}

describe("evaluateMemoryPolicy", () => {
  it("permits a proposal for an explicit remember request", () => {
    const decision = evaluate("Please remember that my sister is named June.");
    expect(decision.mayProposeMemory).toBe(true);
    expect(decision.proposalReason).toBeTruthy();
  });

  it("never proposes when companion memory is disabled", () => {
    const decision = evaluate("Please remember that my sister is named June.", PRIVACY_OFF);
    expect(decision.mayProposeMemory).toBe(false);
    expect(decision.mayUseApprovedMemories).toBe(false);
  });

  it("never proposes memory from a crisis exchange", () => {
    const decision = evaluate("Remember that I want to die.");
    expect(decision.mayProposeMemory).toBe(false);
  });

  it("never proposes without an explicit request", () => {
    const decision = evaluate("My sister is named June and she is kind.");
    expect(decision.mayProposeMemory).toBe(false);
  });

  it("does not re-propose an already approved fact", () => {
    const decision = evaluate("Remember that my sister is named June.", PRIVACY_ON, [
      { category: "shared-context", content: "my sister is named June" },
    ]);
    expect(decision.mayProposeMemory).toBe(false);
  });

  it("always reports the prohibited categories", () => {
    const decision = evaluate("hello");
    expect(decision.prohibitedCategories).toEqual([...PROHIBITED_MEMORY_CATEGORIES]);
  });
});

describe("isProhibitedMemoryCategory", () => {
  it("rejects every prohibited category and common variants", () => {
    for (const category of PROHIBITED_MEMORY_CATEGORIES) {
      expect(isProhibitedMemoryCategory(category)).toBe(true);
    }
    expect(isProhibitedMemoryCategory("Trauma History")).toBe(true);
    expect(isProhibitedMemoryCategory("medical_condition")).toBe(true);
  });

  it("allows ordinary categories", () => {
    expect(isProhibitedMemoryCategory("shared-context")).toBe(false);
    expect(isProhibitedMemoryCategory("preference")).toBe(false);
  });
});

describe("createMemoryProposalCandidate", () => {
  it("extracts the fact after the remember request", () => {
    const candidate = createMemoryProposalCandidate("Remember that my dog is named Bo.", []);
    expect(candidate?.content).toContain("Bo");
    expect(candidate?.category).toBe("shared-context");
  });

  it("returns null when the fact is already approved (either direction)", () => {
    expect(
      createMemoryProposalCandidate("Remember that my dog is named Bo.", [
        { category: "shared-context", content: "My dog is named Bo. He is old." },
      ]),
    ).toBeNull();
  });

  it("returns null without an explicit request", () => {
    expect(createMemoryProposalCandidate("My dog is named Bo.", [])).toBeNull();
  });
});
