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

export const suggestedStepSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  estimatedMinutes: z.number().int().min(1).max(120),
});

export const proposedMemorySchema = z.object({
  category: z.string().min(1).max(100),
  content: z.string().min(1).max(1000),
  reason: z.string().min(1).max(1000),
});

export const companionSafetySchema = z.object({
  level: z.enum(["none", "support", "urgent"]),
  message: z.string().nullable(),
});

export const companionResponseSchema = z.object({
  supportMode: z.enum(SUPPORT_MODES),
  message: z.string().min(1),
  followUp: z.string().nullable(),
  closingLine: z.string().nullable(),
  suggestedStep: suggestedStepSchema.nullable(),
  proposedMemory: proposedMemorySchema.nullable(),
  safety: companionSafetySchema,
});

export type CompanionResponse = z.infer<typeof companionResponseSchema>;
export type SuggestedStep = z.infer<typeof suggestedStepSchema>;
export type ProposedMemory = z.infer<typeof proposedMemorySchema>;

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
