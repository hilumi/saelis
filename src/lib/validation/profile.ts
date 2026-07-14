import { z } from "zod";

import {
  ENCOURAGEMENT_STYLES,
  FAITH_PREFERENCES,
  HUMOR_LEVELS,
  PLANNING_STYLES,
  RESPONSE_LENGTHS,
  SUPPORT_PREFERENCES,
  TONE_PREFERENCES,
} from "@/lib/constants";

/** Profile basics (preferred name, timezone). */
export const profileSettingsSchema = z.object({
  preferredName: z
    .string()
    .trim()
    .max(80, "Preferred name must be 80 characters or fewer.")
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
  timezone: z
    .string()
    .trim()
    .max(64)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
});

/** Companion preference settings — mirrors database check constraints. */
export const companionSettingsSchema = z.object({
  tonePreference: z.enum(TONE_PREFERENCES),
  responseLength: z.enum(RESPONSE_LENGTHS),
  defaultSupportPreference: z.enum(SUPPORT_PREFERENCES),
  humorLevel: z.enum(HUMOR_LEVELS),
  faithPreference: z.enum(FAITH_PREFERENCES),
  planningStyle: z.enum(PLANNING_STYLES),
  encouragementStyle: z.enum(ENCOURAGEMENT_STYLES),
  adaptiveLearningEnabled: z.boolean(),
});

/** Privacy settings. */
export const privacySettingsSchema = z.object({
  saveConversationHistory: z.boolean(),
  allowCompanionMemory: z.boolean(),
  allowProductAnalytics: z.boolean(),
});

export type ProfileSettingsInput = z.output<typeof profileSettingsSchema>;
export type CompanionSettingsInput = z.output<typeof companionSettingsSchema>;
export type PrivacySettingsInput = z.output<typeof privacySettingsSchema>;
