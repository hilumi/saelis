import { z } from "zod";

import { SUPPORT_MODES } from "@/lib/constants";
import type { LightPlan } from "@/lib/light/types";
import type { CompanionPreferences, SupportMode } from "@/types/companion";

/**
 * The production contract for companion responses.
 *
 * Rules:
 *  - A memory proposal is never saved automatically; the client must ask the
 *    user whether to remember it.
 *  - No hidden reasoning or chain-of-thought is requested, exposed, or stored.
 *  - suggestedStep, followUp, and closingLine may all be null. Presence and
 *    witness responses should usually carry no action.
 */

export const suggestedStepSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    estimatedMinutes: z.number().int().min(1).max(120),
  })
  .strict();

export const proposedMemorySchema = z
  .object({
    category: z.string().min(1).max(100),
    content: z.string().min(1).max(1000),
    reason: z.string().min(1).max(1000),
  })
  .strict();

export const companionSafetySchema = z
  .object({
    level: z.enum(["none", "support", "urgent"]),
    message: z.string().nullable(),
  })
  .strict();

/**
 * Optional facts-versus-interpretations reflection (Saelis Core, v0.7). Only
 * requested when the user is analyzing a message, situation, or decision.
 * Every list may be empty; nothing here is a conclusion about a third party's
 * intent.
 */
export const reflectionSchema = z
  .object({
    facts: z.array(z.string().min(1).max(300)).max(8),
    interpretations: z.array(z.string().min(1).max(300)).max(8),
    unknowns: z.array(z.string().min(1).max(300)).max(8),
    alternativePerspectives: z.array(z.string().min(1).max(300)).max(8),
  })
  .strict();

/**
 * Server-derived transparency notice when an explicit communication
 * preference was observed. Provider-suggested notices are always discarded;
 * only the deterministic server policy may set this.
 */
export const adaptationNoticeSchema = z
  .object({
    summary: z.string().min(1).max(300),
    preferenceKey: z.string().min(1).max(60),
  })
  .strict();

/**
 * A tentative pattern observation candidate. NEVER persisted directly:
 * it must pass the deterministic screening in src/lib/core before it can
 * become even a working hypothesis.
 */
export const insightCandidateSchema = z
  .object({
    theme: z.string().min(1).max(40),
    observation: z.string().min(1).max(500),
    uncertaintyStatement: z.string().min(1).max(300),
  })
  .strict();

export const companionResponseSchema = z
  .object({
    supportMode: z.enum(SUPPORT_MODES),
    message: z.string().min(1),
    followUp: z.string().nullable(),
    closingLine: z.string().nullable(),
    suggestedStep: suggestedStepSchema.nullable(),
    proposedMemory: proposedMemorySchema.nullable(),
    safety: companionSafetySchema,
    // v0.7 Saelis Core additions — optional for compatibility, nullable for
    // OpenAI strict mode (which requires every property to be present).
    reflection: reflectionSchema.nullable().optional(),
    adaptationNotice: adaptationNoticeSchema.nullable().optional(),
    insightCandidate: insightCandidateSchema.nullable().optional(),
  })
  // Mirror `additionalProperties: false`: unknown keys are rejected, not
  // silently stripped — exact parity with the OpenAI JSON schema.
  .strict();

export type CompanionResponse = z.infer<typeof companionResponseSchema>;
export type SuggestedStep = z.infer<typeof suggestedStepSchema>;
export type ProposedMemory = z.infer<typeof proposedMemorySchema>;
export type CompanionReflection = z.infer<typeof reflectionSchema>;
export type AdaptationNotice = z.infer<typeof adaptationNoticeSchema>;
export type InsightCandidate = z.infer<typeof insightCandidateSchema>;

/** Context supplied to a provider. Only user-approved, active memories belong here. */
export interface CompanionMemoryContext {
  category: string;
  content: string;
}

export interface CompanionTurnContext {
  role: "user" | "assistant";
  content: string;
}

export interface CompanionRequest {
  /** Server-derived user id — never taken from the request body. */
  userId: string;
  conversationId: string | null;
  message: string;
  includeFaithReflection: boolean;
  supportHint: SupportMode | null;
  preferences: CompanionPreferences;
  approvedMemories: CompanionMemoryContext[];
  recentTurns: CompanionTurnContext[];
}

/**
 * Every provider receives the request plus the Light Engine's plan. The plan
 * carries Saelis's identity (constitution, strategy, memory policy, closing
 * policy); the provider only renders within it. `plan` is optional so legacy
 * callers and tests remain valid — providers must behave sensibly without it.
 */
export interface CompanionProvider {
  respond(input: CompanionRequest, plan?: LightPlan): Promise<CompanionResponse>;
}
