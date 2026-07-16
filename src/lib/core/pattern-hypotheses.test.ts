import { describe, expect, it } from "vitest";

import {
  hasUncertaintyLanguage,
  isEligibleForReview,
  isProhibitedHypothesisWording,
  screenHypothesisCandidate,
  selectHypothesesForPrompt,
  selectReviewableHypotheses,
  shouldExpire,
} from "@/lib/core/pattern-hypotheses";

import type { EvidenceReference, PatternHypothesis } from "@/lib/core/types";

function evidence(day: string, id: string): EvidenceReference {
  return {
    id,
    sourceType: "conversation",
    occurredAt: `${day}T12:00:00Z`,
    summary: "Noticed during a conversation moment.",
  };
}

function hypothesis(overrides: Partial<PatternHypothesis> = {}): PatternHypothesis {
  return {
    id: "h1",
    theme: "boundaries",
    observation:
      "I've noticed that your own needs sometimes seem to become secondary when conflict appears.",
    uncertaintyStatement: "I don't know why this happens, and there may be several explanations.",
    confidence: 0.7,
    evidenceCount: 4,
    crossDomainCount: 2,
    status: "working",
    firstObservedAt: "2026-06-01T00:00:00Z",
    lastObservedAt: "2026-07-10T00:00:00Z",
    evidence: [
      evidence("2026-06-01", "e1"),
      evidence("2026-06-20", "e2"),
      evidence("2026-07-10", "e3"),
    ],
    ...overrides,
  };
}

describe("prohibited wording — never diagnoses, causes, or identities", () => {
  it("bans identity labels", () => {
    expect(isProhibitedHypothesisWording("You are a people-pleaser.")).toBe(true);
  });
  it("bans childhood causation", () => {
    expect(isProhibitedHypothesisWording("You behave this way because of childhood trauma.")).toBe(
      true,
    );
    expect(isProhibitedHypothesisWording("Your mother caused this pattern.")).toBe(true);
  });
  it("bans attachment-style claims", () => {
    expect(isProhibitedHypothesisWording("You have an anxious attachment style.")).toBe(true);
  });
  it("bans diagnoses", () => {
    expect(isProhibitedHypothesisWording("You have depression.")).toBe(true);
  });
  it("bans protected-trait inference", () => {
    expect(isProhibitedHypothesisWording("Given you're religious, this explains your guilt.")).toBe(
      true,
    );
  });
  it("allows tentative noticing language", () => {
    expect(
      isProhibitedHypothesisWording(
        "I've noticed your own needs sometimes become secondary when conflict appears.",
      ),
    ).toBe(false);
  });
});

describe("screenHypothesisCandidate — provider output never persists directly", () => {
  const base = {
    theme: "boundaries",
    observation: "It seems your needs sometimes come last during conflict.",
    uncertaintyStatement: "There may be several explanations, and I don't know which fits.",
    optedOutThemes: [] as string[],
    safetyLevel: "none" as const,
    adaptationEnabled: true,
  };

  it("accepts a well-formed tentative candidate", () => {
    expect(screenHypothesisCandidate(base).accepted).toBe(true);
  });

  it("rejects when adaptation is disabled", () => {
    expect(screenHypothesisCandidate({ ...base, adaptationEnabled: false }).accepted).toBe(false);
  });

  it("rejects during any safety level", () => {
    expect(screenHypothesisCandidate({ ...base, safetyLevel: "support" }).accepted).toBe(false);
    expect(screenHypothesisCandidate({ ...base, safetyLevel: "urgent" }).accepted).toBe(false);
  });

  it("rejects unknown themes", () => {
    expect(screenHypothesisCandidate({ ...base, theme: "attachment" }).accepted).toBe(false);
  });

  it("rejects opted-out themes", () => {
    expect(screenHypothesisCandidate({ ...base, optedOutThemes: ["boundaries"] }).accepted).toBe(
      false,
    );
  });

  it("rejects prohibited wording", () => {
    expect(
      screenHypothesisCandidate({
        ...base,
        observation: "You are a people-pleaser because of your childhood.",
      }).accepted,
    ).toBe(false);
  });

  it("requires uncertainty language", () => {
    expect(
      screenHypothesisCandidate({
        ...base,
        observation: "Your needs come last during conflict.",
        uncertaintyStatement: "This is established.",
      }).accepted,
    ).toBe(false);
    expect(hasUncertaintyLanguage("It may be one of several explanations.")).toBe(true);
  });
});

describe("maturity — one conversation can never create a reviewable insight", () => {
  it("accepts a hypothesis with repeated, cross-domain, multi-day evidence", () => {
    expect(isEligibleForReview(hypothesis())).toBe(true);
  });

  it("rejects a single-event hypothesis", () => {
    expect(
      isEligibleForReview(
        hypothesis({
          evidenceCount: 1,
          crossDomainCount: 1,
          evidence: [evidence("2026-07-10", "e1")],
        }),
      ),
    ).toBe(false);
  });

  it("requires cross-domain evidence", () => {
    expect(isEligibleForReview(hypothesis({ crossDomainCount: 1 }))).toBe(false);
  });

  it("requires the evidence-count minimum", () => {
    expect(isEligibleForReview(hypothesis({ evidenceCount: 2 }))).toBe(false);
  });

  it("requires evidence across distinct days", () => {
    expect(
      isEligibleForReview(
        hypothesis({
          evidence: [
            evidence("2026-07-10", "e1"),
            evidence("2026-07-10", "e2"),
            evidence("2026-07-10", "e3"),
          ],
        }),
      ),
    ).toBe(false);
  });

  it("requires the confidence minimum", () => {
    expect(isEligibleForReview(hypothesis({ confidence: 0.3 }))).toBe(false);
  });

  it("requires an uncertainty statement", () => {
    expect(
      isEligibleForReview(hypothesis({ uncertaintyStatement: "This is definitely a pattern." })),
    ).toBe(false);
  });
});

describe("selection — rejected and expired hypotheses never resurface", () => {
  it("rejected insight is not reviewable", () => {
    expect(selectReviewableHypotheses([hypothesis({ status: "rejected" })])).toEqual([]);
  });

  it("expired insight is excluded", () => {
    expect(selectReviewableHypotheses([hypothesis({ status: "expired" })])).toEqual([]);
  });

  it("prompt inclusion requires the user to be exploring, accepted status, and caps at one", () => {
    const accepted = hypothesis({ status: "accepted" });
    expect(selectHypothesesForPrompt([accepted], false)).toEqual([]);
    expect(
      selectHypothesesForPrompt([accepted, hypothesis({ id: "h2", status: "accepted" })], true),
    ).toHaveLength(1);
    expect(selectHypothesesForPrompt([hypothesis({ status: "rejected" })], true)).toEqual([]);
    expect(selectHypothesesForPrompt([hypothesis({ status: "working" })], true)).toEqual([]);
  });

  it("expires hypotheses unsupported for over 90 days", () => {
    expect(
      shouldExpire(hypothesis({ lastObservedAt: "2026-01-01T00:00:00Z" }), new Date("2026-07-15")),
    ).toBe(true);
    expect(
      shouldExpire(hypothesis({ lastObservedAt: "2026-07-01T00:00:00Z" }), new Date("2026-07-15")),
    ).toBe(false);
  });
});
