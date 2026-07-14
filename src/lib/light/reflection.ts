import type { ReflectionResult, SupportMode, UnderstandingResult } from "@/lib/light/types";

/**
 * Reflection — convert an UnderstandingResult into a response strategy.
 * Pure and deterministic: same understanding, same strategy.
 */

const STRATEGIES: Record<SupportMode, ReflectionResult> = {
  witness: {
    primaryNeed: "to be received without being fixed",
    responseGoal: "receive the emotional meaning and offer one specific observation",
    shouldOfferAction: false,
    shouldAskQuestion: true, // at most one gentle question
    shouldOfferPresence: false,
    shouldCelebrate: false,
    suggestedLightState: "listening",
  },
  explore: {
    primaryNeed: "room to think out loud",
    responseGoal: "stay curious and follow the user's thread without steering it",
    shouldOfferAction: false,
    shouldAskQuestion: true,
    shouldOfferPresence: false,
    shouldCelebrate: false,
    suggestedLightState: "listening",
  },
  comfort: {
    primaryNeed: "to feel steadier and less alone",
    responseGoal: "stabilize, reduce pressure, avoid promises, offer presence",
    shouldOfferAction: false,
    shouldAskQuestion: false,
    shouldOfferPresence: true,
    shouldCelebrate: false,
    suggestedLightState: "receiving",
  },
  clarify: {
    primaryNeed: "to untangle facts, fears, choices, and the desired outcome",
    responseGoal: "summarize what is actually at stake before any advice",
    shouldOfferAction: false,
    shouldAskQuestion: true,
    shouldOfferPresence: false,
    shouldCelebrate: false,
    suggestedLightState: "reflecting",
  },
  act: {
    primaryNeed: "one manageable way forward",
    responseGoal:
      "offer one to three small steps that respect the user's planning style and energy",
    shouldOfferAction: true,
    shouldAskQuestion: false,
    shouldOfferPresence: false,
    shouldCelebrate: false,
    suggestedLightState: "guiding",
  },
  celebrate: {
    primaryNeed: "to have the good thing witnessed",
    responseGoal: "match the joy without redirecting into productivity",
    shouldOfferAction: false,
    shouldAskQuestion: true,
    shouldOfferPresence: false,
    shouldCelebrate: true,
    suggestedLightState: "celebrating",
  },
  connect: {
    primaryNeed: "to find words that stay true to their own voice",
    responseGoal: "understand recipient, relationship, and desired outcome, then help draft",
    shouldOfferAction: false,
    shouldAskQuestion: true,
    shouldOfferPresence: false,
    shouldCelebrate: false,
    suggestedLightState: "guiding",
  },
  reflect: {
    primaryNeed: "space for meaning",
    responseGoal: "create room to look at the deeper thread; keep faith strictly opt-in",
    shouldOfferAction: false,
    shouldAskQuestion: true,
    shouldOfferPresence: false,
    shouldCelebrate: false,
    suggestedLightState: "reflecting",
  },
  presence: {
    primaryNeed: "company without demands",
    responseGoal: "be here; no questions, no tasks, no push toward completion",
    shouldOfferAction: false,
    shouldAskQuestion: false,
    shouldOfferPresence: true,
    shouldCelebrate: false,
    suggestedLightState: "still",
  },
};

export function createReflection(understanding: UnderstandingResult): ReflectionResult {
  // Urgent safety: pure presence around the crisis response — nothing else.
  if (understanding.safetyLevel === "urgent") {
    return {
      primaryNeed: "immediate human support",
      responseGoal: "deliver the crisis response calmly; route to real help",
      shouldOfferAction: false,
      shouldAskQuestion: false,
      shouldOfferPresence: true,
      shouldCelebrate: false,
      suggestedLightState: "still",
    };
  }

  const base = STRATEGIES[understanding.supportMode];

  return {
    ...base,
    // Explicit user request for steps always permits an action.
    shouldOfferAction:
      base.shouldOfferAction || understanding.actionReadiness === "explicitly-requested",
    // Low confidence favors one gentle clarifying question.
    shouldAskQuestion: base.shouldAskQuestion || understanding.requiresClarification,
  };
}
