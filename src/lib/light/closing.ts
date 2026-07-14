import type {
  ClosingContext,
  ClosingPolicy,
  LightContext,
  SupportMode,
  UnderstandingResult,
} from "@/lib/light/types";

/**
 * Closing-line policy. A closing line is a small ritual, not a signature on
 * every message — most exchanges end without one. Selection is deterministic
 * (stable hash of stable context) so behavior is testable and calm.
 */

export const CLOSING_LINES: Record<SupportMode, readonly string[]> = {
  witness: [
    "Be gentle with what this asked of you.",
    "You do not have to carry all of it tonight.",
  ],
  explore: ["Take whatever felt truest and let the rest wait."],
  comfort: [
    "Let the rest of today meet you softly.",
    "There was nothing you needed to prove here.",
  ],
  clarify: ["The whole sky does not have to clear at once."],
  act: ["One clear step is enough."],
  celebrate: ["Let this joy stay with you for a while."],
  connect: ["You can be honest and still be kind."],
  reflect: ["Keep the part that brought you closer to yourself."],
  presence: ["There was nothing you needed to solve here."],
};

/** Reserved for completed Horizon steps and true goodbyes. */
export const COMPLETION_LINE = "A little lighter.";

/** How many exchanged turns make a moment "settled" enough to close. */
const TURNS_BEFORE_CLOSING = 4;

export function selectClosingContext(
  understanding: UnderstandingResult,
  context: LightContext,
): ClosingContext {
  // Crisis responses carry their own language; no poetic closing.
  if (understanding.safetyLevel === "urgent") return "no-closing";
  // Celebration is a natural conclusion of a moment.
  if (understanding.supportMode === "celebrate") return "moment-concluded";
  // A longer exchange has had time to settle into something worth closing.
  if (context.recentTurns.length >= TURNS_BEFORE_CLOSING) return "moment-concluded";
  return "no-closing";
}

/** Small deterministic string hash (djb2) for stable line selection. */
function hashString(value: string): number {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return Math.abs(hash);
}

export function selectClosingLine(
  mode: SupportMode,
  closingContext: ClosingContext,
  seed: string,
): string | null {
  if (closingContext === "no-closing") return null;
  if (closingContext === "step-completed" || closingContext === "conversation-ended") {
    return COMPLETION_LINE;
  }
  const lines = CLOSING_LINES[mode];
  const line = lines[hashString(seed) % lines.length];
  return line ?? null;
}

export function createClosingPolicy(
  understanding: UnderstandingResult,
  context: LightContext,
): ClosingPolicy {
  const closingContext = selectClosingContext(understanding, context);
  const seed = `${context.userId}:${context.recentTurns.length}:${understanding.supportMode}`;
  return {
    context: closingContext,
    line: selectClosingLine(understanding.supportMode, closingContext, seed),
  };
}
