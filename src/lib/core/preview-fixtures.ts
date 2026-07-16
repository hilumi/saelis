import type { AdaptivePreference, PatternHypothesis } from "@/lib/core/types";

/**
 * DEVELOPMENT-ONLY preview fixtures for Saelis Core surfaces.
 *
 * Entirely fictional, never persisted, and never available in production —
 * pages must gate on `process.env.NODE_ENV !== "production"` before using
 * anything in this module (the same pattern as /home?preview=…).
 */

const now = () => new Date().toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const CORE_PREVIEWS = new Set([
  "new-relationship",
  "developing-relationship",
  "familiar-playful",
  "direct-feedback",
  "concise-overwhelm",
  "analytical-style",
  "playful-style",
  "mature-pattern",
  "rejected-pattern",
  "no-adaptation",
]);

function preference(overrides: Partial<AdaptivePreference>): AdaptivePreference {
  return {
    id: "00000000-0000-4000-8000-00000000aaaa",
    key: "prefers-examples",
    value: {},
    confidence: 0.75,
    evidenceCount: 4,
    status: "active",
    firstObservedAt: daysAgo(30),
    lastObservedAt: daysAgo(2),
    expiresAt: null,
    ...overrides,
  };
}

function hypothesis(overrides: Partial<PatternHypothesis>): PatternHypothesis {
  return {
    id: "00000000-0000-4000-8000-00000000bbbb",
    theme: "boundaries",
    observation:
      "I've noticed that your own needs sometimes seem to become secondary when conflict appears.",
    uncertaintyStatement: "I don't know why this happens, and there may be several explanations.",
    confidence: 0.7,
    evidenceCount: 4,
    crossDomainCount: 2,
    status: "reviewable",
    firstObservedAt: daysAgo(40),
    lastObservedAt: daysAgo(3),
    evidence: [
      {
        id: "evidence-preview-1",
        sourceType: "conversation",
        occurredAt: daysAgo(40),
        summary: "Noticed during a communicate moment in conversation.",
      },
      {
        id: "evidence-preview-2",
        sourceType: "conversation",
        occurredAt: daysAgo(20),
        summary: "Noticed during a make decision moment in conversation.",
      },
      {
        id: "evidence-preview-3",
        sourceType: "conversation",
        occurredAt: daysAgo(3),
        summary: "Noticed during a process moment in conversation.",
      },
    ],
    ...overrides,
  };
}

export function previewAdaptivePreferences(preview: string): AdaptivePreference[] {
  switch (preview) {
    case "direct-feedback":
      return [
        preference({ key: "appreciates-direct-challenge", confidence: 0.85, evidenceCount: 5 }),
      ];
    case "concise-overwhelm":
      return [
        preference({
          key: "prefers-concise-when-overwhelmed",
          confidence: 0.8,
          evidenceCount: 4,
        }),
      ];
    case "familiar-playful":
    case "playful-style":
      return [
        preference({ key: "enjoys-playful-humor", confidence: 0.8, evidenceCount: 6 }),
        preference({
          id: "00000000-0000-4000-8000-00000000aab2",
          key: "shared-phrase",
          value: { phrase: "future me" },
          confidence: 0.75,
          evidenceCount: 4,
        }),
      ];
    case "analytical-style":
      return [
        preference({ key: "prefers-options-before-recommendation", confidence: 0.75 }),
        preference({
          id: "00000000-0000-4000-8000-00000000aab3",
          key: "likes-bullet-points",
          confidence: 0.7,
          evidenceCount: 3,
        }),
      ];
    case "developing-relationship":
      return [preference({ key: "prefers-examples", confidence: 0.5, evidenceCount: 2 })];
    case "new-relationship":
    case "no-adaptation":
    default:
      return [];
  }
}

export function previewPatternHypotheses(preview: string): PatternHypothesis[] {
  switch (preview) {
    case "mature-pattern":
      return [hypothesis({})];
    case "rejected-pattern":
      return [hypothesis({ status: "rejected", lastObservedAt: now() })];
    default:
      return [];
  }
}
