import type { EvidenceReference, EvidenceSourceType } from "@/lib/core/types";

/**
 * Evidence references — content-free by construction.
 *
 * Every evidence summary is selected from a fixed catalog of neutral,
 * user-ownable descriptions keyed by cue name. Raw user text never enters an
 * evidence record; this is the mechanism (not a convention) that keeps
 * adaptation data from becoming a shadow transcript.
 */

const EVIDENCE_SUMMARIES: Record<string, string> = {
  "explicit-directness": "You explicitly asked for direct feedback.",
  "explicit-reality-check": "You asked for a reality check.",
  "explicit-concise": "You explicitly asked for shorter responses.",
  "explicit-no-emoji": "You asked Saelis to stop using emojis.",
  "explicit-more-direct": "You asked Saelis to be more direct.",
  "explicit-examples": "You asked for examples.",
  "explicit-options": "You asked to see options before a recommendation.",
  "explicit-bullets": "You asked for bullet points.",
  "humor-received-well": "A playful exchange went well.",
  "humor-declined": "You said a joke didn't land.",
  "celebration-energy": "You shared good news with high energy.",
  "needs-secondary-in-conflict": "A conflict moment where your own needs came last.",
  "self-critical-after-setback": "A hard professional moment followed by self-criticism.",
  "processing-before-planning": "You preferred to process before planning.",
  "delayed-decision": "A difficult decision was postponed.",
  "courage-in-unfamiliar": "You stepped into something unfamiliar.",
  "shared-phrase-used": "A phrase you use often appeared again.",
  "user-confirmed": "You confirmed this directly.",
};

let evidenceCounter = 0;

/** Deterministic-enough id for in-memory evidence (database rows use uuids). */
function nextEvidenceId(): string {
  evidenceCounter += 1;
  return `evidence-${evidenceCounter}`;
}

/** Reset the counter (tests only). */
export function resetEvidenceCounterForTests(): void {
  evidenceCounter = 0;
}

/**
 * Create a content-free evidence reference from a known cue. Returns null for
 * unknown cues — unknown observations may not become evidence at all.
 */
export function createEvidenceReference(
  sourceType: EvidenceSourceType,
  cue: string,
  occurredAt: string = new Date().toISOString(),
): EvidenceReference | null {
  const summary = EVIDENCE_SUMMARIES[cue];
  if (!summary) return null;
  return { id: nextEvidenceId(), sourceType, occurredAt, summary };
}

/** The catalog is exported so tests can prove no summary carries user content. */
export function knownEvidenceCues(): string[] {
  return Object.keys(EVIDENCE_SUMMARIES);
}

export function evidenceSummaryForCue(cue: string): string | null {
  return EVIDENCE_SUMMARIES[cue] ?? null;
}
