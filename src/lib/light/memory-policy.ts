import type {
  ApprovedMemory,
  LightPrivacy,
  MemoryDecision,
  UnderstandingResult,
} from "@/lib/light/types";

/**
 * Memory policy — consent is the whole design.
 *
 * The Light Engine never writes memories. It only decides whether approved
 * memories may be supplied to the provider and whether a proposal may be
 * offered to the user. Persistence remains the job of the existing approval
 * flow (approveProposedMemory), which requires the user's explicit yes.
 */

/** Categories that must never be stored, even with apparent consent via inference. */
export const PROHIBITED_MEMORY_CATEGORIES = [
  "diagnosis",
  "medical-condition",
  "trauma-history",
  "sexuality",
  "political-belief",
  "religious-identity",
  "precise-location",
  "financial-account",
  "authentication-secret",
  "private-relationship-detail",
  "inferred-protected-characteristic",
] as const;

export function isProhibitedMemoryCategory(category: string): boolean {
  const normalized = category
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  return PROHIBITED_MEMORY_CATEGORIES.some(
    (prohibited) => normalized === prohibited || normalized.includes(prohibited),
  );
}

const REMEMBER_REQUEST = /(remember|don'?t forget) (that|this|me)?/i;

export interface MemoryProposalCandidate {
  category: string;
  content: string;
  reason: string;
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Extract a proposal candidate from an explicit "remember that…" request.
 * Returns null when there is no explicit request or the fact is already an
 * approved memory (avoiding repeated proposals for the same fact).
 */
export function createMemoryProposalCandidate(
  message: string,
  approvedMemories: ApprovedMemory[],
): MemoryProposalCandidate | null {
  const match = REMEMBER_REQUEST.exec(message);
  if (!match) return null;

  const afterRequest = message.slice((match.index ?? 0) + match[0].length).trim();
  const content = (afterRequest.length > 0 ? afterRequest : message).slice(0, 500);

  const normalizedContent = normalizeForComparison(content);
  const duplicate = approvedMemories.some((memory) => {
    const existing = normalizeForComparison(memory.content);
    return existing.includes(normalizedContent) || normalizedContent.includes(existing);
  });
  if (duplicate) return null;

  return {
    category: "shared-context",
    content,
    reason: "You asked me to remember this.",
  };
}

export interface MemoryPolicyInput {
  privacy: LightPrivacy;
  understanding: UnderstandingResult;
  message: string;
  approvedMemories: ApprovedMemory[];
}

export function evaluateMemoryPolicy(input: MemoryPolicyInput): MemoryDecision {
  const { privacy, understanding, message, approvedMemories } = input;

  const mayUseApprovedMemories = privacy.allowCompanionMemory;

  // Proposals are blocked when: memory is disabled, the exchange touches any
  // safety level (never harvest memory from a crisis), or confidence is low.
  const proposalsAllowed =
    privacy.allowCompanionMemory &&
    understanding.safetyLevel === "none" &&
    understanding.confidence >= 0.6;

  const candidate = proposalsAllowed
    ? createMemoryProposalCandidate(message, approvedMemories)
    : null;

  return {
    mayUseApprovedMemories,
    mayProposeMemory: candidate !== null,
    prohibitedCategories: [...PROHIBITED_MEMORY_CATEGORIES],
    proposalReason: candidate?.reason,
  };
}
