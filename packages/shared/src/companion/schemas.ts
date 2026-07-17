import { z } from "zod";

import { COMPANION_MAX_MESSAGE_LENGTH, SUPPORT_MODES } from "./constants";

/**
 * Request body accepted by POST /api/companion.
 * Mirrors `src/lib/validation/companion.ts` (web is authoritative).
 * Deliberately contains NO user id — identity comes from the server session.
 */
export const companionRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Say anything — even a single word is a fine place to start.")
    .max(COMPANION_MAX_MESSAGE_LENGTH, "That message is a little long for one turn."),
  conversationId: z.string().uuid().nullable().optional().default(null),
  supportHint: z.enum(SUPPORT_MODES).nullable().optional().default(null),
  includeFaithReflection: z.boolean().optional().default(false),
});

export type CompanionApiRequest = z.output<typeof companionRequestSchema>;

/**
 * Request body for POST /api/companion/stream.
 * `requestId` is a client-generated, non-secret idempotency key used to
 * reject duplicate submissions and enforce one active generation per user.
 */
export const companionStreamRequestSchema = companionRequestSchema.extend({
  requestId: z
    .string()
    .trim()
    .min(8, "Request id too short.")
    .max(64, "Request id too long.")
    .regex(/^[a-zA-Z0-9-]+$/, "Request id has an unexpected format."),
});

export type CompanionStreamApiRequest = z.output<typeof companionStreamRequestSchema>;
