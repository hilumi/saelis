import { z } from "zod";

import { COMPANION_MAX_MESSAGE_LENGTH, SUPPORT_MODES } from "@/lib/constants";

/**
 * Request body accepted by POST /api/companion.
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
