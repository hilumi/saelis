/**
 * The Light Engine — public API.
 * Provider-independent behavioral layer between Saelis and every AI provider.
 */

export { createLightPlan } from "@/lib/light/pipeline";
export { normalizeLightContext, LightContextError, MAX_RECENT_TURNS } from "@/lib/light/context";
export { createUnderstanding } from "@/lib/light/understanding";
export { createReflection } from "@/lib/light/reflection";
export {
  evaluateMemoryPolicy,
  isProhibitedMemoryCategory,
  createMemoryProposalCandidate,
  PROHIBITED_MEMORY_CATEGORIES,
} from "@/lib/light/memory-policy";
export { buildConstitutionInstruction, CONSTITUTION_RULES } from "@/lib/light/constitution";
export {
  createClosingPolicy,
  selectClosingContext,
  selectClosingLine,
  CLOSING_LINES,
  COMPLETION_LINE,
} from "@/lib/light/closing";
export { composePrompt } from "@/lib/light/prompt-composer";

export type {
  ActionReadiness,
  ApprovedMemory,
  ArrivalContext,
  ClosingContext,
  ClosingPolicy,
  ConversationPurpose,
  EmotionalTone,
  LightContext,
  LightPlan,
  LightPrivacy,
  LightStateName,
  LightTurn,
  MemoryDecision,
  ReflectionResult,
  SupportMode,
  UnderstandingResult,
} from "@/lib/light/types";
