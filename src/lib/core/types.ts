import type { SafetyLevel } from "@/lib/ai/safety";
import type { SupportMode, UnderstandingResult } from "@/lib/light/types";

/**
 * Saelis Core — typed contracts for the relational intelligence foundation.
 *
 * Saelis Core sits ABOVE the Light Engine's deterministic understanding and
 * BELOW the provider. It never replaces the Light Engine; it enriches the
 * LightPlan with moment-aware guidance. Everything in this module is
 * deterministic and conservative by design: explicit user intent always
 * overrides inference, and none of these heuristics claim genuine emotional
 * understanding.
 *
 * None of these internal terms are shown prominently to ordinary users, and
 * nothing here is a psychological profile, an emotional score, or a
 * diagnosis of any kind.
 */

// ---------------------------------------------------------------------------
// Response posture
// ---------------------------------------------------------------------------

export const RESPONSE_POSTURES = [
  "witness",
  "ground",
  "explore",
  "clarify",
  "challenge",
  "plan",
  "celebrate",
  "play",
  "comfort",
  "reflect",
  "presence",
] as const;

export type ResponsePosture = (typeof RESPONSE_POSTURES)[number];

// ---------------------------------------------------------------------------
// Communication style (form only — never identity)
// ---------------------------------------------------------------------------

export type CommunicationEnergy = "quiet" | "steady" | "animated" | "high-energy";

export type DirectnessLevel = "gentle" | "balanced" | "direct";

/** Humor calibration inside Saelis Core (distinct from the settings HumorLevel). */
export type HumorCalibration = "none" | "light" | "playful" | "sarcastic-light";

export type StructurePreference =
  "conversational" | "brief" | "bulleted" | "stepwise" | "analytical" | "story-based";

/**
 * A deterministic observation of communication FORM in the current exchange.
 * It observes rhythm, punctuation, and structure — never race, ethnicity,
 * nationality, religion, sexual orientation, political affiliation,
 * disability, medical condition, or socioeconomic class.
 */
export interface CommunicationStyleObservation {
  energy: CommunicationEnergy;
  directness: DirectnessLevel;
  humor: HumorCalibration;
  structure: StructurePreference;
  emojiDensity: "none" | "light" | "frequent";
  sentenceRhythm: "short" | "mixed" | "long";
  colloquialIntensity: "none" | "light" | "strong";
  /** 0..1 — strength of the explicit cues behind this observation. */
  confidence: number;
  evidenceCount: number;
}

// ---------------------------------------------------------------------------
// Relationship context
// ---------------------------------------------------------------------------

export type RelationshipStage = "new" | "developing" | "familiar";

export interface RelationshipContext {
  stage: RelationshipStage;
  userExplicitlyWelcomesHumor: boolean;
  userExplicitlyWelcomesChallenge: boolean;
  recentCorrectionCount: number;
  successfulPlayfulExchangeCount: number;
  recentSupportModes: SupportMode[];
}

// ---------------------------------------------------------------------------
// Room assessment
// ---------------------------------------------------------------------------

export type EmotionalTemperature =
  "low" | "heavy" | "tense" | "neutral" | "hopeful" | "joyful" | "energized";

export type VulnerabilityLevel = "low" | "moderate" | "high";

export type RoomUrgency = "none" | "time-sensitive" | "safety";

export type UserGoal =
  | "be-heard"
  | "understand"
  | "reality-check"
  | "decide"
  | "plan"
  | "respond"
  | "celebrate"
  | "connect"
  | "stay-present"
  | "unknown";

export interface RoomAssessment {
  emotionalTemperature: EmotionalTemperature;
  vulnerability: VulnerabilityLevel;
  urgency: RoomUrgency;
  userGoal: UserGoal;
  humorAppropriate: boolean;
  challengeAppropriate: boolean;
  /** The user should be received before any analysis is offered. */
  witnessFirst: boolean;
  /** Match the user's energy (celebration) vs. steady it (distress). */
  matchEnergy: boolean;
  /** The user explicitly asked for directness ("be honest with me"). */
  directnessRequested: boolean;
  /** Enough explicit evidence exists to support a conclusion. */
  evidenceSufficientForConclusion: boolean;
  ambiguityLevel: "low" | "moderate" | "high";
  /** Names of matched cues (e.g. "explicit-directness"). Never raw user content. */
  cues: string[];
  safetyLevel: SafetyLevel;
}

// ---------------------------------------------------------------------------
// Posture plan
// ---------------------------------------------------------------------------

export interface PostureControls {
  /** Begin with resonance before any perspective. */
  openWithResonance: boolean;
  directness: DirectnessLevel;
  humorPermitted: boolean;
  maxQuestions: 0 | 1;
  offerAlternatives: boolean;
  suggestAction: boolean;
  separateFactsFromInterpretations: boolean;
  challengeRequiresPermission: boolean;
}

export interface PosturePlan {
  primary: ResponsePosture;
  secondary: ResponsePosture | null;
  controls: PostureControls;
}

// ---------------------------------------------------------------------------
// Constructive challenge
// ---------------------------------------------------------------------------

export type ChallengeRuling =
  "prohibited" | "requires-permission" | "allowed" | "humor-assisted" | "safety-mandated";

export interface ChallengeDecision {
  ruling: ChallengeRuling;
  /** Content-free reasons, e.g. "grief-present". Never raw user content. */
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Evidence & pattern hypotheses
// ---------------------------------------------------------------------------

export type EvidenceSourceType =
  "conversation" | "arrival" | "horizon" | "approved-memory" | "user-reflection";

/**
 * A reference to one moment of evidence. `summary` is a content-free
 * description ("User explicitly requested concise responses.") — never a copy
 * of the user's message.
 */
export interface EvidenceReference {
  id: string;
  sourceType: EvidenceSourceType;
  occurredAt: string;
  summary: string;
}

export const PATTERN_THEMES = [
  "boundaries",
  "self-criticism",
  "conflict",
  "responsibility",
  "avoidance",
  "courage",
  "rest",
  "trust",
  "belonging",
  "achievement",
  "communication",
  "decision-making",
  "other",
] as const;

export type PatternTheme = (typeof PATTERN_THEMES)[number];

export type PatternHypothesisStatus =
  "working" | "reviewable" | "accepted" | "rejected" | "expired";

export interface PatternHypothesis {
  id: string;
  theme: PatternTheme;
  observation: string;
  uncertaintyStatement: string;
  /** 0..1 — deterministic, transparent. Never shown as a percentage to users. */
  confidence: number;
  evidenceCount: number;
  crossDomainCount: number;
  status: PatternHypothesisStatus;
  firstObservedAt: string;
  lastObservedAt: string;
  evidence: EvidenceReference[];
}

// ---------------------------------------------------------------------------
// Adaptive preferences (low-risk communication preferences only)
// ---------------------------------------------------------------------------

/**
 * The complete allowlist of adaptive-preference keys. Anything not on this
 * list can never be adapted, stored, or suggested — including every sensitive
 * category (trauma, faith, politics, sexuality, health, finances, location,
 * protected traits). The list itself is the safety mechanism, mirrored by a
 * database check constraint.
 */
export const ADAPTIVE_PREFERENCE_KEYS = [
  "prefers-concise-when-overwhelmed",
  "appreciates-direct-challenge",
  "enjoys-playful-humor",
  "prefers-examples",
  "prefers-options-before-recommendation",
  "prefers-questions-before-advice",
  "likes-bullet-points",
  "thinks-aloud",
  "wants-celebration-energy-matched",
  "prefers-no-emojis",
  "shared-phrase",
  "pattern-theme-opt-out",
] as const;

export type AdaptivePreferenceKey = (typeof ADAPTIVE_PREFERENCE_KEYS)[number];

export type AdaptivePreferenceStatus = "observed" | "active" | "paused" | "reset" | "expired";

export interface AdaptivePreference {
  id: string;
  key: AdaptivePreferenceKey;
  /** Small structured value (e.g. { phrase: "future me" }). Never freeform prose. */
  value: Record<string, string | number | boolean>;
  confidence: number;
  evidenceCount: number;
  status: AdaptivePreferenceStatus;
  firstObservedAt: string;
  lastObservedAt: string;
  expiresAt: string | null;
}

/** Relational confidence thresholds — transparent and deterministic. */
export const RELATIONAL_CONFIDENCE = {
  /** Below this: do not adapt persistently. */
  low: 0.35,
  /** At or above `low` and below `high`: temporary, current-context adaptation only. */
  high: 0.7,
  /** Pattern hypotheses require all of the following before becoming reviewable. */
  patternMinimumEvidence: 3,
  patternMinimumCrossDomain: 2,
  patternMinimumDistinctDays: 2,
  patternMinimumConfidence: 0.6,
} as const;

// ---------------------------------------------------------------------------
// Guidance & assessment
// ---------------------------------------------------------------------------

/** Compact, structured guidance appended to the LightPlan's instructions. */
export interface ResponseGuidance {
  lines: string[];
  humorPermitted: boolean;
  challengeRuling: ChallengeRuling;
  separateFactsFromInterpretations: boolean;
  /** Shared phrases approved for natural use (repeated + positively received). */
  approvedSharedPhrases: string[];
  /** Whether a pattern insight candidate may be considered at all this turn. */
  patternObservationEligible: boolean;
}

/**
 * The full deterministic output of the Saelis Core pipeline for one exchange.
 * Attached to the LightPlan (never sent to the client, never persisted).
 */
export interface SaelisCoreAssessment {
  style: CommunicationStyleObservation;
  relationship: RelationshipContext;
  room: RoomAssessment;
  posture: PosturePlan;
  challenge: ChallengeDecision;
  guidance: ResponseGuidance;
  /** Whether adaptation may be observed or applied at all this exchange. */
  adaptationEnabled: boolean;
}

/** Inputs Saelis Core needs beyond the LightContext + UnderstandingResult. */
export interface CoreInput {
  message: string;
  recentTurns: { role: "user" | "assistant"; content: string }[];
  understanding: UnderstandingResult;
  /** Companion settings (humor level, tone, adaptive learning toggle). */
  humorSetting: "none" | "light" | "playful";
  toneSetting: "gentle" | "balanced" | "direct";
  adaptiveLearningEnabled: boolean;
  /** Approved, active adaptive preferences (already policy-filtered). */
  adaptivePreferences: AdaptivePreference[];
}
