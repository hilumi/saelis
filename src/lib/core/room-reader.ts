import { requestsDirectness } from "@/lib/core/communication-style";

import type {
  CommunicationStyleObservation,
  EmotionalTemperature,
  RelationshipContext,
  RoomAssessment,
  UserGoal,
  VulnerabilityLevel,
} from "@/lib/core/types";
import type { UnderstandingResult } from "@/lib/light/types";

/**
 * Read the room — deterministic, conservative, explicit-intent-first.
 *
 * This is NOT deep emotional understanding. It is a transparent mapping from
 * (a) explicit user requests, (b) the Light Engine's existing deterministic
 * understanding, and (c) observable communication form, into a single
 * RoomAssessment that the response posture, humor policy, and challenge
 * policy consume.
 *
 * Ordering contract (tested):
 *   1. Safety overrides everything.
 *   2. Explicit user intent overrides every inference.
 *   3. Inferred emotional cues never unlock humor or challenge on their own.
 */

// --- explicit intent cues ----------------------------------------------------

const REALITY_CHECK_PATTERN =
  /\b(am i (being )?(ridiculous|crazy|overreacting|unreasonable|missing something)|tell me if i'?m (being )?(ridiculous|wrong|overreacting)|reality[- ]check|i think i'?m overreacting)\b/i;

const HARMFUL_ACTION_PATTERN =
  /\b(going to send (this|that|it)|about to send|send this (cruel|angry|nasty) (message|text|email)|hit send (right now|tonight)|going to tell (him|her|them) (exactly what|off))\b/i;

const TEXT_ANALYSIS_PATTERN =
  /\b(can i show you (this|a) (text|message|email)|help me understand (this|his|her|their) (email|text|message)|what does (this|that|it|"[^"]*"|'[^']*') mean|read this (text|email|message)|my (boss|friend|mom|dad|partner) (said|wrote|texted))\b/i;

const GRIEF_PATTERN =
  /\b((my|our) (mom|mother|dad|father|brother|sister|husband|wife|partner|son|daughter|friend|grandma|grandmother|grandpa|grandfather|dog|cat) (died|passed away|just died)|died today|passed away (today|yesterday|last night))\b/i;

const SELF_PATTERN_QUESTION =
  /\b(why do i (keep|always)|i keep (putting|doing|choosing|avoiding)|why am i like this)\b/i;

const CONNECT_PATTERN = /\b(can you just stay with me|keep me company|just be (here|with me))\b/i;

// --- assessment --------------------------------------------------------------

export interface RoomReaderInput {
  message: string;
  understanding: UnderstandingResult;
  style: CommunicationStyleObservation;
  relationship: RelationshipContext;
  /** Companion settings humor level ("none" disables humor entirely). */
  humorSetting: "none" | "light" | "playful";
}

function readTemperature(
  understanding: UnderstandingResult,
  style: CommunicationStyleObservation,
): EmotionalTemperature {
  switch (understanding.emotionalTone) {
    case "distressed":
      return "tense";
    case "heavy":
      return "heavy";
    case "uncertain":
      return "neutral";
    case "hopeful":
      return "hopeful";
    case "joyful":
      return "joyful";
    case "energized":
      return "energized";
    default:
      return style.energy === "high-energy" ? "energized" : "neutral";
  }
}

function readVulnerability(
  understanding: UnderstandingResult,
  griefPresent: boolean,
): VulnerabilityLevel {
  if (understanding.safetyLevel !== "none" || griefPresent) return "high";
  if (
    understanding.emotionalTone === "distressed" ||
    understanding.emotionalTone === "heavy" ||
    understanding.cues.includes("shame") ||
    understanding.cues.includes("grief")
  ) {
    return "moderate";
  }
  return "low";
}

function readGoal(
  understanding: UnderstandingResult,
  message: string,
  griefPresent: boolean,
): UserGoal {
  // Explicit request cues first — they always win.
  if (REALITY_CHECK_PATTERN.test(message)) return "reality-check";
  if (SELF_PATTERN_QUESTION.test(message)) return "understand";
  if (TEXT_ANALYSIS_PATTERN.test(message)) return "understand";
  if (CONNECT_PATTERN.test(message)) return "stay-present";

  switch (understanding.purpose) {
    case "vent":
      return "be-heard";
    case "process":
      return "be-heard";
    case "seek-comfort":
      return "be-heard";
    case "seek-clarity":
      return "understand";
    case "seek-advice":
      return "decide";
    case "seek-plan":
      return "plan";
    case "make-decision":
      return "decide";
    case "communicate":
      return "respond";
    case "celebrate":
      return "celebrate";
    case "reflect":
      return "understand";
    case "seek-presence":
      return "stay-present";
    default:
      // Fresh grief with no explicit request is a moment to be received,
      // whatever the keyword heuristics missed.
      return griefPresent ? "be-heard" : "unknown";
  }
}

export function readTheRoom(input: RoomReaderInput): RoomAssessment {
  const { message, understanding, style, relationship } = input;
  const cues: string[] = [];

  const griefPresent = GRIEF_PATTERN.test(message) || understanding.cues.includes("grief");
  if (griefPresent) cues.push("grief-present");

  const directnessRequested = requestsDirectness(message);
  if (directnessRequested) cues.push("explicit-directness");

  const realityCheckRequested = REALITY_CHECK_PATTERN.test(message);
  if (realityCheckRequested) cues.push("explicit-reality-check");

  const harmfulActionProposed = HARMFUL_ACTION_PATTERN.test(message);
  if (harmfulActionProposed) cues.push("harmful-action-proposed");

  const textAnalysisRequested = TEXT_ANALYSIS_PATTERN.test(message);
  if (textAnalysisRequested) cues.push("text-analysis");

  const temperature = readTemperature(understanding, style);
  const vulnerability = readVulnerability(understanding, griefPresent);
  const goal = readGoal(understanding, message, griefPresent);

  // Safety first: urgent collapses everything to presence around real help.
  const urgency: RoomAssessment["urgency"] =
    understanding.safetyLevel === "urgent"
      ? "safety"
      : harmfulActionProposed
        ? "time-sensitive"
        : "none";

  // --- humor -----------------------------------------------------------------
  // Humor is a privilege, not a default. Every condition must hold:
  //   settings allow it, safety is none, vulnerability is not high, the moment
  //   is not grief/shame/crisis, and either the user is using humor right now
  //   or has an established (approved) humor preference in a familiar-enough
  //   relationship.
  const momentExcludesHumor =
    griefPresent ||
    understanding.cues.includes("shame") ||
    understanding.cues.includes("faith-invited") ||
    understanding.safetyLevel !== "none";
  const userUsingHumorNow = style.humor !== "none";
  const humorAppropriate =
    input.humorSetting !== "none" &&
    urgency === "none" &&
    vulnerability !== "high" &&
    !momentExcludesHumor &&
    (userUsingHumorNow || (relationship.userExplicitlyWelcomesHumor && vulnerability === "low"));
  if (humorAppropriate) cues.push("humor-window");

  // --- challenge ---------------------------------------------------------------
  // Appropriate when explicitly invited (reality check / directness request /
  // established preference), or when a harmful action needs naming. Never
  // during immediate grief unless safety requires grounding.
  const challengeAppropriate =
    understanding.safetyLevel !== "urgent" &&
    !griefPresent &&
    (realityCheckRequested ||
      directnessRequested ||
      harmfulActionProposed ||
      (relationship.userExplicitlyWelcomesChallenge && vulnerability === "low"));
  if (challengeAppropriate) cues.push("challenge-window");

  // Witnessing before analysis: heavy/tense moments, venting, grief.
  const witnessFirst =
    goal === "be-heard" ||
    griefPresent ||
    vulnerability === "high" ||
    temperature === "heavy" ||
    temperature === "tense";

  // Celebration matches energy; distress steadies it.
  const matchEnergy =
    goal === "celebrate" || temperature === "joyful" || temperature === "energized";

  // Evidence sufficiency: a single low-confidence reading never supports a
  // conclusion about the user or a third party.
  const evidenceSufficientForConclusion =
    understanding.confidence >= 0.85 && !understanding.requiresClarification;

  const ambiguityLevel: RoomAssessment["ambiguityLevel"] =
    understanding.confidence >= 0.85
      ? "low"
      : understanding.confidence >= 0.6
        ? "moderate"
        : "high";

  return {
    emotionalTemperature: temperature,
    vulnerability,
    urgency,
    userGoal: goal,
    humorAppropriate,
    challengeAppropriate,
    witnessFirst,
    matchEnergy,
    directnessRequested,
    evidenceSufficientForConclusion,
    ambiguityLevel,
    cues: [...understanding.cues, ...cues],
    safetyLevel: understanding.safetyLevel,
  };
}
