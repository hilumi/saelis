import { buildChallengeGuidance } from "@/lib/core/challenge-policy";
import { buildMirroringGuidance } from "@/lib/core/communication-style";

import type {
  AdaptivePreference,
  ChallengeDecision,
  CommunicationStyleObservation,
  PosturePlan,
  ResponseGuidance,
  RoomAssessment,
} from "@/lib/core/types";

/**
 * Response guidance — the compact, structured instruction block Saelis Core
 * contributes to the provider request. Budget-controlled: a handful of short
 * lines, never the adaptation history, never raw confidence numbers, never
 * rejected/expired hypotheses, never chain-of-thought.
 */

const POSTURE_OPENINGS: Record<string, string> = {
  witness: "Receive what was said fully before anything else; no fixing.",
  ground: "Steady the moment first: slow, concrete, low-demand.",
  explore: "Stay curious and follow the user's thread without steering it.",
  clarify: "Untangle what is actually at stake before any advice.",
  challenge: "After receiving, offer honest perspective the user asked for.",
  plan: "Offer practical, right-sized help.",
  celebrate: "Match the joy; no productivity redirection.",
  play: "Lightness is welcome.",
  comfort: "Stabilize and reduce pressure; no problem-solving.",
  reflect: "Make room for meaning without forcing conclusions.",
  presence: "Just be here; no questions, no tasks.",
};

const FACTS_GUIDANCE =
  "When analyzing a message, situation, or decision: separate what is directly observable from what is interpretation, name what remains unknown, offer at least one alternative explanation, and never claim certainty about another person's intentions.";

const UNCERTAINTY_GUIDANCE =
  "State uncertainty plainly. Do not present inference as fact, do not explain the user to themselves, and do not make causal claims about their past.";

const PREFERENCE_LINES: Partial<Record<string, string>> = {
  "prefers-concise-when-overwhelmed": "The user prefers concise responses when things feel heavy.",
  "appreciates-direct-challenge": "The user appreciates direct, honest feedback.",
  "enjoys-playful-humor": "Playful humor has been welcome with this user in light moments.",
  "prefers-examples": "The user prefers concrete examples.",
  "prefers-options-before-recommendation": "Offer several options before any recommendation.",
  "prefers-questions-before-advice": "Ask before advising.",
  "likes-bullet-points": "Short lists are welcome when they help clarity.",
  "thinks-aloud": "The user thinks aloud; not every statement needs an answer.",
  "wants-celebration-energy-matched": "Match the user's energy when they celebrate.",
  "prefers-no-emojis": "Do not use emojis with this user.",
};

export interface GuidanceInput {
  room: RoomAssessment;
  posture: PosturePlan;
  challenge: ChallengeDecision;
  style: CommunicationStyleObservation;
  activePreferences: AdaptivePreference[];
  approvedSharedPhrases: string[];
  adaptationEnabled: boolean;
}

export function buildResponseGuidance(input: GuidanceInput): ResponseGuidance {
  const { room, posture, challenge, style, activePreferences } = input;
  const lines: string[] = [];

  // 1. Room and posture (compact, no internal jargon leaking to the user).
  lines.push(
    `Moment: ${room.emotionalTemperature}; the user most needs ${room.userGoal.replace(/-/g, " ")}.`,
  );
  const primaryOpening = POSTURE_OPENINGS[posture.primary];
  if (primaryOpening) lines.push(primaryOpening);
  const secondaryOpening = posture.secondary ? POSTURE_OPENINGS[posture.secondary] : undefined;
  if (secondaryOpening) {
    lines.push(`If space allows: ${secondaryOpening.toLowerCase()}`);
  }
  if (posture.controls.openWithResonance) {
    lines.push("Begin with resonance; end with perspective.");
  }
  if (room.matchEnergy) {
    lines.push("Match the user's energy rather than steadying it.");
  } else if (room.emotionalTemperature === "tense" || room.emotionalTemperature === "heavy") {
    lines.push("Keep your energy steadier and quieter than the user's.");
  }

  // 2. Directness.
  if (posture.controls.directness === "direct") {
    lines.push("The user asked for directness: be plain, kind, and unhedged.");
  } else if (posture.controls.directness === "gentle") {
    lines.push("Stay gentle; this is not a moment for bluntness.");
  }

  // 3. Humor — explicit permission or explicit prohibition, never implicit.
  if (posture.controls.humorPermitted) {
    lines.push(
      "Light, affectionate humor is permitted (optional, at most a touch; never at the user's worth, never minimizing harm).",
    );
  } else {
    lines.push("No humor or sarcasm in this response.");
  }

  // 4. Challenge ruling.
  lines.push(...buildChallengeGuidance(challenge));

  // 5. Facts vs interpretations.
  if (posture.controls.separateFactsFromInterpretations) {
    lines.push(FACTS_GUIDANCE);
  }

  // 6. Mirroring (form only).
  lines.push(...buildMirroringGuidance(style));

  // 7. Approved adaptive preferences (friendly lines; no scores, no history).
  if (input.adaptationEnabled) {
    for (const preference of activePreferences.slice(0, 5)) {
      const line = PREFERENCE_LINES[preference.key];
      if (line) lines.push(line);
    }
    if (input.approvedSharedPhrases.length > 0) {
      lines.push(
        `Phrases you may use naturally because the user uses and enjoys them: ${input.approvedSharedPhrases
          .slice(0, 3)
          .map((phrase) => `"${phrase}"`)
          .join(", ")}. Never force them in.`,
      );
    }
  }

  // 8. Uncertainty requirements — always present.
  lines.push(UNCERTAINTY_GUIDANCE);

  const patternObservationEligible =
    input.adaptationEnabled && room.safetyLevel === "none" && room.vulnerability !== "high";

  return {
    lines,
    humorPermitted: posture.controls.humorPermitted,
    challengeRuling: challenge.ruling,
    separateFactsFromInterpretations: posture.controls.separateFactsFromInterpretations,
    approvedSharedPhrases: input.approvedSharedPhrases,
    patternObservationEligible,
  };
}
