import type {
  PostureControls,
  PosturePlan,
  ResponsePosture,
  RoomAssessment,
} from "@/lib/core/types";
import type { UnderstandingResult } from "@/lib/light/types";

/**
 * Response posture — one primary posture (and an optional secondary) derived
 * deterministically from the RoomAssessment. Posture labels are internal;
 * they shape cadence, directness, humor permission, question count, and
 * whether facts and interpretations should be separated. They are never shown
 * to the user by default.
 */

function primaryPosture(room: RoomAssessment, understanding: UnderstandingResult): ResponsePosture {
  if (room.safetyLevel === "urgent") return "ground";
  if (room.urgency === "time-sensitive") return "challenge"; // harmful proposed action
  if (room.userGoal === "celebrate") return "celebrate";
  if (room.userGoal === "stay-present") return "presence";
  if (room.userGoal === "be-heard") {
    return understanding.supportMode === "comfort" || room.cues.includes("grief-present")
      ? "comfort"
      : "witness";
  }
  if (room.userGoal === "reality-check") return "challenge";
  if (room.userGoal === "plan") return "plan";
  if (room.userGoal === "decide") return "clarify";
  if (room.userGoal === "respond") return "clarify";
  if (room.userGoal === "understand") {
    return understanding.purpose === "reflect" ? "reflect" : "explore";
  }
  return "explore";
}

function secondaryPosture(primary: ResponsePosture, room: RoomAssessment): ResponsePosture | null {
  switch (primary) {
    case "witness":
      return "reflect";
    case "ground":
      return room.safetyLevel === "urgent" ? "presence" : "clarify";
    case "challenge":
      return room.userGoal === "plan" || room.urgency === "time-sensitive" ? "plan" : null;
    case "celebrate":
      return room.humorAppropriate ? "play" : null;
    case "comfort":
      return "presence";
    case "explore":
      return room.evidenceSufficientForConclusion ? "reflect" : null;
    case "clarify":
      return null;
    default:
      return null;
  }
}

function buildControls(
  primary: ResponsePosture,
  room: RoomAssessment,
  toneSetting: "gentle" | "balanced" | "direct",
): PostureControls {
  const analysisPosture =
    primary === "clarify" ||
    primary === "explore" ||
    primary === "reflect" ||
    primary === "challenge";

  return {
    // Begin with resonance; end with perspective. Only pure planning or
    // celebration skips the receiving beat entirely.
    openWithResonance: primary !== "plan" || room.witnessFirst,
    directness: room.directnessRequested
      ? "direct"
      : room.vulnerability === "high"
        ? "gentle"
        : toneSetting,
    humorPermitted: room.humorAppropriate && primary !== "ground" && primary !== "comfort",
    maxQuestions:
      primary === "presence" || primary === "ground" || room.safetyLevel === "urgent" ? 0 : 1,
    offerAlternatives: analysisPosture && room.userGoal !== "be-heard",
    suggestAction:
      primary === "plan" || (primary === "challenge" && room.urgency === "time-sensitive"),
    separateFactsFromInterpretations:
      (room.userGoal === "understand" ||
        room.userGoal === "reality-check" ||
        room.userGoal === "decide") &&
      room.cues.includes("text-analysis") === true
        ? true
        : room.userGoal === "reality-check" || room.cues.includes("text-analysis"),
    challengeRequiresPermission:
      primary === "challenge"
        ? !room.directnessRequested &&
          room.userGoal !== "reality-check" &&
          room.urgency !== "time-sensitive"
        : true,
  };
}

export function choosePosture(
  room: RoomAssessment,
  understanding: UnderstandingResult,
  toneSetting: "gentle" | "balanced" | "direct" = "balanced",
): PosturePlan {
  const primary = primaryPosture(room, understanding);
  return {
    primary,
    secondary: secondaryPosture(primary, room),
    controls: buildControls(primary, room, toneSetting),
  };
}
