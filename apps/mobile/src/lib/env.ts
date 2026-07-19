import { z } from "zod";

/**
 * Environment-variable validation for the mobile client.
 *
 * Only `EXPO_PUBLIC_*` values ever reach this bundle — they are inlined at
 * build time and must be referenced statically. Secret keys (OpenAI, Supabase
 * secret key) are SERVER ONLY and must never appear here or in app config.
 *
 * All values are optional during Sprint 1 (auth and live chat are not wired
 * up yet). Call `requireEnv(...)` from features that need a value at runtime;
 * it fails with a calm, actionable message instead of an undefined crash.
 */

const publicEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z
    .string()
    .url("EXPO_PUBLIC_SUPABASE_URL must be a valid URL (see apps/mobile/.env.example).")
    .optional(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_SAELIS_API_URL: z
    .string()
    .url("EXPO_PUBLIC_SAELIS_API_URL must be a valid URL (see apps/mobile/.env.example).")
    .optional(),
  /** EAS project id (public identifier) — required for Expo push tokens. */
  EXPO_PUBLIC_EAS_PROJECT_ID: z.string().min(1).optional(),
});

export type PublicEnv = z.output<typeof publicEnvSchema>;

/** Treat empty strings (unfilled placeholders) as absent. */
function emptyToUndefined(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

const parsed = publicEnvSchema.safeParse({
  // Static references only — Expo inlines these at build time.
  EXPO_PUBLIC_SUPABASE_URL: emptyToUndefined(process.env.EXPO_PUBLIC_SUPABASE_URL),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: emptyToUndefined(
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  EXPO_PUBLIC_SAELIS_API_URL: emptyToUndefined(process.env.EXPO_PUBLIC_SAELIS_API_URL),
  EXPO_PUBLIC_EAS_PROJECT_ID: emptyToUndefined(process.env.EXPO_PUBLIC_EAS_PROJECT_ID),
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => issue.message).join(" ");
  throw new Error(`Invalid mobile environment configuration. ${issues}`);
}

export const env: PublicEnv = parsed.data;

/** Returns a required env value or throws with a setup hint. */
export function requireEnv(key: keyof PublicEnv): string {
  const value = env[key];
  if (!value) {
    throw new Error(
      `Missing ${key}. Copy apps/mobile/.env.example to apps/mobile/.env and fill it in.`,
    );
  }
  return value;
}
