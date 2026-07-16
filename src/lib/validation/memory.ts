import { z } from "zod";

import { MEMORY_KINDS } from "@/lib/constants";

/** Obvious credential material is never allowed inside a memory. */
const SECRET_PATTERN =
  /(password|passcode|api[-_ ]?key|secret key|private key|\bsk-[a-z0-9]{8,}|\bbearer\s+[a-z0-9._-]{10,}|\bssn\b|social security number)/i;

export function containsSecretMaterial(text: string): boolean {
  return SECRET_PATTERN.test(text);
}

export const memoryKindSchema = z.enum(MEMORY_KINDS);

/** Editing an existing memory (title, content, reason, kind). */
export const memoryEditSchema = z.object({
  memoryId: z.string().uuid(),
  kind: memoryKindSchema,
  title: z
    .string()
    .trim()
    .max(120, "Titles stay short — 120 characters at most.")
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
  content: z
    .string()
    .trim()
    .min(1, "A memory needs some words to keep.")
    .max(1000, "Memories stay small — 1000 characters at most."),
  reason: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
});

/** Creating a memory directly (North Star or Constellation). */
export const memoryCreateSchema = memoryEditSchema.omit({ memoryId: true });

/** Approving a proposal, optionally edited, with an explicit kind. */
export const memoryApprovalSchema = z.object({
  category: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(1000),
  kind: memoryKindSchema.default("constellation"),
  title: z
    .string()
    .trim()
    .max(120)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional()
    .default(null),
  reason: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional()
    .default(null),
  edited: z.boolean().optional().default(false),
});

/** Explicit hand-off of a suggested step into Horizon. */
export const horizonHandoffSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  estimatedMinutes: z.number().int().min(1).max(120),
  conversationId: z.string().uuid().nullable().optional().default(null),
});

export const feedbackSchema = z.object({
  helpful: z.boolean(),
  // v0.8 beta categories. Content-free by design: feedback never carries
  // conversation text, only one category from this allowlist.
  category: z
    .enum([
      "too-soft",
      "too-direct",
      "too-long",
      "too-generic",
      "missed-need",
      "humor-did-not-land",
    ])
    .nullable()
    .optional()
    .default(null),
});
