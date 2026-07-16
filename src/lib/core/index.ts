/**
 * Saelis Core — public API.
 *
 * The relational intelligence foundation: one coherent internal system that
 * reads the room, chooses a response posture, calibrates humor and challenge,
 * mirrors communication form, and manages transparent, user-controlled
 * adaptation. It extends the Light Engine; it never replaces it.
 */

export {
  createCoreAssessment,
  enrichLightPlan,
  hasCoreAssessment,
  type EnrichedLightPlan,
} from "@/lib/core/pipeline";
export { readTheRoom } from "@/lib/core/room-reader";
export { choosePosture } from "@/lib/core/response-posture";
export { evaluateChallengePolicy, buildChallengeGuidance } from "@/lib/core/challenge-policy";
export {
  observeCommunicationStyle,
  buildMirroringGuidance,
  requestsDirectness,
} from "@/lib/core/communication-style";
export { deriveRelationshipContext } from "@/lib/core/relationship-context";
export { buildResponseGuidance } from "@/lib/core/response-guidance";
export {
  adaptationTier,
  applyContradiction,
  applyRepeatedEvidence,
  applyTimeDecay,
  applyUserCorrection,
  CONFIDENCE_DELTAS,
  extractExplicitObservations,
  isAllowedPreferenceKey,
  isHumorCorrection,
  resolveActivePreferences,
  resolveApprovedSharedPhrases,
  resolveOptedOutThemes,
} from "@/lib/core/adaptation-policy";
export {
  hasUncertaintyLanguage,
  isEligibleForReview,
  isKnownTheme,
  isProhibitedHypothesisWording,
  PROHIBITED_HYPOTHESIS_PATTERNS,
  screenHypothesisCandidate,
  selectHypothesesForPrompt,
  selectReviewableHypotheses,
  shouldExpire,
} from "@/lib/core/pattern-hypotheses";
export {
  createEvidenceReference,
  evidenceSummaryForCue,
  knownEvidenceCues,
} from "@/lib/core/evidence";

export {
  ADAPTIVE_PREFERENCE_KEYS,
  PATTERN_THEMES,
  RELATIONAL_CONFIDENCE,
  RESPONSE_POSTURES,
} from "@/lib/core/types";

export type {
  AdaptivePreference,
  AdaptivePreferenceKey,
  AdaptivePreferenceStatus,
  ChallengeDecision,
  ChallengeRuling,
  CommunicationEnergy,
  CommunicationStyleObservation,
  CoreInput,
  DirectnessLevel,
  EmotionalTemperature,
  EvidenceReference,
  EvidenceSourceType,
  HumorCalibration,
  PatternHypothesis,
  PatternHypothesisStatus,
  PatternTheme,
  PostureControls,
  PosturePlan,
  RelationshipContext,
  RelationshipStage,
  ResponseGuidance,
  ResponsePosture,
  RoomAssessment,
  RoomUrgency,
  SaelisCoreAssessment,
  StructurePreference,
  UserGoal,
  VulnerabilityLevel,
} from "@/lib/core/types";
