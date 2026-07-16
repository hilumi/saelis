import type {
  CommunicationEnergy,
  CommunicationStyleObservation,
  DirectnessLevel,
  HumorCalibration,
  StructurePreference,
} from "@/lib/core/types";

/**
 * Communication-style observation — FORM, never identity.
 *
 * This module reads observable properties of language: message length,
 * sentence rhythm, punctuation intensity, emoji density, lists, colloquial
 * energy, humor signals, and explicit requests for directness.
 *
 * It must never infer race, ethnicity, nationality, religion, sexual
 * orientation, political affiliation, disability, medical condition, or
 * socioeconomic class — and it has no inputs or outputs that could carry such
 * an inference. Mirroring follows the FUNCTION of language (energy, warmth,
 * playfulness), not its exact words: Saelis may meet "Girl… absolutely not.
 * 😂" with matched energy, but it does not repeat "girl", perform dialect, or
 * caricature anyone's way of speaking.
 */

const EMOJI_PATTERN = /\p{Extended_Pictographic}/gu;
const LAUGHTER_PATTERN = /\b(lol|lmao|haha+|hehe+)\b/i;
const SLANG_PATTERN =
  /\b(gonna|wanna|gotta|kinda|sorta|ain'?t|y'?all|omg|idk|tbh|ngl|fr|lowkey|highkey)\b/i;
const LIST_PATTERN = /(^|\n)\s*([-*•]|\d+[.)])\s+/;
const ANALYTICAL_PATTERN =
  /\b(objective|assessment|analysis|options?|constraints?|tradeoffs?|pros and cons|criteria|framework)\b/i;
const DIRECTNESS_REQUEST_PATTERN =
  /\b(be (more )?(honest|direct|blunt|straight)( with me)?\b|don'?t be soft|don'?t sugar ?coat|give it to me straight|tell me the truth|no sugar ?coating)/i;
const STORY_PATTERN = /\b(so then|and then|long story|it all started|let me tell you)\b/i;

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function readEnergy(
  message: string,
  exclamations: number,
  emojiCount: number,
): CommunicationEnergy {
  const capsWords = countMatches(message, /\b[A-Z]{3,}\b/g);
  const score = exclamations + capsWords * 2 + emojiCount;
  if (score >= 5) return "high-energy";
  if (score >= 2) return "animated";
  if (message.length < 40 && score === 0) return "quiet";
  return "steady";
}

function readRhythm(sentences: string[]): "short" | "mixed" | "long" {
  if (sentences.length === 0) return "mixed";
  const lengths = sentences.map((sentence) => sentence.trim().split(/\s+/).length);
  const average = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
  if (average <= 7) return "short";
  if (average >= 18) return "long";
  return "mixed";
}

function readStructure(message: string): StructurePreference {
  if (LIST_PATTERN.test(message)) return "bulleted";
  if (/\b(step[- ]by[- ]step|first.*then|stepwise)\b/i.test(message)) return "stepwise";
  if (ANALYTICAL_PATTERN.test(message)) return "analytical";
  if (STORY_PATTERN.test(message) && message.length > 240) return "story-based";
  if (message.length < 80) return "brief";
  return "conversational";
}

function readHumor(
  message: string,
  emojiCount: number,
  energy: CommunicationEnergy,
): HumorCalibration {
  const laughing = LAUGHTER_PATTERN.test(message) || /😂|🤣|😅|😄|😆/u.test(message);
  if (!laughing) return "none";
  if (energy === "high-energy" || energy === "animated") return "playful";
  if (emojiCount > 0) return "light";
  return "light";
}

/**
 * Observe communication form in the current message (with light context from
 * recent user turns for evidence counting). Deterministic and transparent.
 */
export function observeCommunicationStyle(
  message: string,
  recentUserTurns: string[] = [],
): CommunicationStyleObservation {
  const exclamations = countMatches(message, /!/g);
  const emojiCount = countMatches(message, EMOJI_PATTERN);
  const sentences = message.split(/[.!?…]+/).filter((part) => part.trim().length > 0);

  const energy = readEnergy(message, exclamations, emojiCount);
  const slangHits = countMatches(message, new RegExp(SLANG_PATTERN.source, "gi"));

  const directness: DirectnessLevel = DIRECTNESS_REQUEST_PATTERN.test(message)
    ? "direct"
    : ANALYTICAL_PATTERN.test(message)
      ? "balanced"
      : "gentle";

  // Evidence count: current message plus recent user turns showing the same
  // emoji habit (a coarse, transparent counter — not a behavioral model).
  const priorEmojiTurns = recentUserTurns.filter((turn) => EMOJI_PATTERN.test(turn)).length;

  const explicitSignals =
    (DIRECTNESS_REQUEST_PATTERN.test(message) ? 1 : 0) +
    (ANALYTICAL_PATTERN.test(message) ? 1 : 0) +
    (emojiCount > 0 ? 1 : 0) +
    (slangHits > 0 ? 1 : 0);

  return {
    energy,
    directness,
    humor: readHumor(message, emojiCount, energy),
    structure: readStructure(message),
    emojiDensity: emojiCount === 0 ? "none" : emojiCount <= 2 ? "light" : "frequent",
    sentenceRhythm: readRhythm(sentences),
    colloquialIntensity: slangHits === 0 ? "none" : slangHits <= 2 ? "light" : "strong",
    confidence: Math.min(0.3 + explicitSignals * 0.15, 0.9),
    evidenceCount: 1 + priorEmojiTurns,
  };
}

/** Whether the user explicitly asked for directness in this message. */
export function requestsDirectness(message: string): boolean {
  return DIRECTNESS_REQUEST_PATTERN.test(message);
}

/**
 * Build compact mirroring guidance for the provider. Mirrors function, not
 * words; never instructs dialect, slang repetition, or identity performance.
 */
export function buildMirroringGuidance(style: CommunicationStyleObservation): string[] {
  const lines: string[] = [];

  if (style.energy === "high-energy" || style.energy === "animated") {
    lines.push("Match the user's energy and warmth; brighter punctuation is welcome.");
  } else if (style.energy === "quiet") {
    lines.push("Keep the response quiet and unhurried; do not amplify energy.");
  }

  if (style.emojiDensity === "frequent") {
    lines.push("An occasional emoji is welcome (at most one).");
  } else if (style.emojiDensity === "none") {
    lines.push("Do not use emojis.");
  }

  if (style.structure === "analytical") {
    lines.push("Be structured and concise: name options, constraints, and tradeoffs plainly.");
  } else if (style.structure === "bulleted") {
    lines.push("A short list is welcome if it helps clarity.");
  }

  if (style.sentenceRhythm === "short") {
    lines.push("Prefer short sentences.");
  }

  if (style.colloquialIntensity !== "none") {
    lines.push(
      "The user speaks casually; be natural and warm in register, but do not repeat their slang, mimic dialect, or perform an identity.",
    );
  }

  lines.push("Mirror the function of the user's language, never a caricature of its words.");
  return lines;
}
