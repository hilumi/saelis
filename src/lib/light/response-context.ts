import type { SafetyLevel } from "@/lib/ai/safety";
import type { ConversationPurpose, EmotionalTone } from "@/lib/light/types";

/**
 * Contextual response modes — lightweight, deterministic, server-side
 * guidance layered on top of the constitution. One Saelis voice throughout;
 * these are situational emphases, never separate characters, and they are
 * never shown to the user.
 */

export type ResponseContextMode =
  | "everyday"
  | "emotional-support"
  | "practical-planning"
  | "wellness-coaching"
  | "accountability"
  | "celebration"
  | "grief-distress";

export const RESPONSE_CONTEXT_GUIDANCE: Record<ResponseContextMode, string> = {
  everyday:
    "Everyday conversation: relaxed and natural. Short replies are fine; no agenda, no forced depth.",
  "emotional-support":
    "Emotional support: listen first. Stay with the feeling without rushing to fix it; no lists, no plans unless asked.",
  "practical-planning":
    "Practical planning: be concrete and useful without sounding clinical. Small, realistic steps; check what feels doable.",
  "wellness-coaching":
    "Wellness coaching: encouraging and grounded. Specific, sustainable suggestions; never pressure, never shame, defer to deterministic safety limits.",
  accountability:
    "Accountability: they asked to be kept honest. Follow up on what they committed to, kindly and directly — no guilt if it slipped, just an honest look at what's next.",
  celebration:
    "Celebration: name the specific thing they did and why it mattered. Genuine, proportionate delight — no generic cheerleading.",
  "grief-distress":
    "Grief or distress: slow down. Presence over solutions; short, warm, unhurried replies. Nothing to fix right now.",
};

export interface ResponseContextInput {
  purpose: ConversationPurpose;
  emotionalTone: EmotionalTone;
  safetyLevel: SafetyLevel;
  actionReadiness: "not-ready" | "uncertain" | "ready" | "explicitly-requested";
  /** True when the exchange is anchored in wellness plans (arrival support need or Her enrollment). */
  wellnessFocus?: boolean;
}

/** Deterministic: identical input always selects the same mode. */
export function selectResponseContext(input: ResponseContextInput): ResponseContextMode {
  // Safety concerns and heavy grief always take the slowest posture.
  if (input.safetyLevel !== "none") return "grief-distress";
  if (input.emotionalTone === "distressed") return "grief-distress";

  if (input.purpose === "celebrate") return "celebration";

  if (
    input.purpose === "vent" ||
    input.purpose === "seek-comfort" ||
    input.purpose === "seek-presence"
  ) {
    return "emotional-support";
  }
  if (input.emotionalTone === "heavy") return "emotional-support";

  if (
    input.purpose === "seek-plan" ||
    input.purpose === "make-decision" ||
    input.purpose === "seek-advice"
  ) {
    return input.wellnessFocus ? "wellness-coaching" : "practical-planning";
  }

  // Reflecting on commitments while ready to act: keep them honest, kindly.
  if (input.purpose === "reflect" && input.actionReadiness === "ready") {
    return "accountability";
  }

  if (
    input.purpose === "process" ||
    input.purpose === "reflect" ||
    input.purpose === "seek-clarity"
  ) {
    return "emotional-support";
  }

  return "everyday";
}

export function buildResponseContextInstruction(mode: ResponseContextMode): string {
  return RESPONSE_CONTEXT_GUIDANCE[mode];
}
