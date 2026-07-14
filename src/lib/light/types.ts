import type { SafetyLevel } from "@/lib/ai/safety";
import type { Energy, Mood, SupportNeed } from "@/types/arrival";
import type { CompanionPreferences, SupportMode } from "@/types/companion";

/**
 * The Light Engine — typed contracts.
 *
 * The Light Engine sits between the application and every AI provider. It is
 * deliberately independent of any provider SDK: nothing in src/lib/light may
 * import OpenAI, Anthropic, Gemini, or any other vendor code. Saelis defines
 * how the provider behaves; the provider does not define Saelis.
 */

export type { SupportMode };

export type EmotionalTone =
  "distressed" | "heavy" | "uncertain" | "neutral" | "hopeful" | "joyful" | "energized";

export type ActionReadiness = "not-ready" | "uncertain" | "ready" | "explicitly-requested";

export type ConversationPurpose =
  | "vent"
  | "process"
  | "seek-comfort"
  | "seek-clarity"
  | "seek-advice"
  | "seek-plan"
  | "make-decision"
  | "communicate"
  | "celebrate"
  | "reflect"
  | "seek-presence"
  | "unknown";

/** Mirrors the states of the visual Light component. */
export type LightStateName =
  | "resting"
  | "welcoming"
  | "listening"
  | "receiving"
  | "reflecting"
  | "guiding"
  | "celebrating"
  | "still";

export interface LightTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ApprovedMemory {
  category: string;
  content: string;
}

export interface ArrivalContext {
  mood: Mood;
  energy: Energy;
  supportNeed: SupportNeed;
  includeFaithReflection: boolean;
}

export interface LightPrivacy {
  saveConversationHistory: boolean;
  allowCompanionMemory: boolean;
}

/** Everything the engine may know about one exchange. Nothing more. */
export interface LightContext {
  userId: string;
  preferredName?: string;
  message: string;
  recentTurns: LightTurn[];
  companionProfile: CompanionPreferences;
  approvedMemories: ApprovedMemory[];
  latestArrival?: ArrivalContext;
  privacy: LightPrivacy;
}

/**
 * Deterministic reading of the user's message. This is NOT genuine emotional
 * comprehension — it is transparent heuristics over explicit user language.
 */
export interface UnderstandingResult {
  purpose: ConversationPurpose;
  supportMode: SupportMode;
  emotionalTone: EmotionalTone;
  actionReadiness: ActionReadiness;
  /** 0..1 — how strongly explicit cues supported this reading. */
  confidence: number;
  /** Names of matched cues, e.g. "explicit-vent". Never raw user content. */
  cues: string[];
  requiresClarification: boolean;
  safetyLevel: SafetyLevel;
}

/** Response strategy derived from understanding. */
export interface ReflectionResult {
  primaryNeed: string;
  responseGoal: string;
  shouldOfferAction: boolean;
  shouldAskQuestion: boolean;
  shouldOfferPresence: boolean;
  shouldCelebrate: boolean;
  suggestedLightState: LightStateName;
}

/** Consent-aware memory decision. The engine never persists memories. */
export interface MemoryDecision {
  mayUseApprovedMemories: boolean;
  mayProposeMemory: boolean;
  prohibitedCategories: string[];
  proposalReason?: string;
}

export type ClosingContext =
  "no-closing" | "moment-concluded" | "conversation-ended" | "step-completed" | "returning-later";

export interface ClosingPolicy {
  context: ClosingContext;
  /** Deterministically selected line, or null when no closing belongs here. */
  line: string | null;
}

/** The full provider-independent plan for one exchange. */
export interface LightPlan {
  understanding: UnderstandingResult;
  reflection: ReflectionResult;
  memory: MemoryDecision;
  /** Compact constitutional + voice instruction (stable per profile/mode). */
  developerInstruction: string;
  /** Compact per-exchange instruction (purpose, strategy, boundaries). */
  contextualInstruction: string;
  closingPolicy: ClosingPolicy;
}
