"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { markOnboarded, updateCompanionProfile } from "@/lib/db/queries/profile";
import { createClient } from "@/lib/supabase/server";

import type { ActionResult } from "@/types/actions";

const CALM_ERROR = "That didn't save. Nothing was lost — please try again.";

const onboardingSchema = z.object({
  /** Chosen on the "How should Saelis speak?" screen; absent when skipped. */
  tonePreference: z.enum(["gentle", "balanced", "direct"]).optional(),
  /** Whether light humor is welcome; absent when skipped. */
  humorWelcome: z.boolean().optional(),
});

/**
 * Complete (or skip) onboarding. Sets the once-only `onboarded_at` flag and,
 * when the user made choices, seeds the matching companion preferences.
 * Everything remains changeable later in Settings.
 */
export async function completeOnboarding(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = onboardingSchema.safeParse(input ?? {});
    if (!parsed.success) return { ok: false, error: "Those choices didn't look right." };

    const supabase = await createClient();

    if (parsed.data.tonePreference !== undefined || parsed.data.humorWelcome !== undefined) {
      await updateCompanionProfile(supabase, user.id, {
        ...(parsed.data.tonePreference !== undefined
          ? { tone_preference: parsed.data.tonePreference }
          : {}),
        ...(parsed.data.humorWelcome !== undefined
          ? { humor_level: parsed.data.humorWelcome ? "light" : "none" }
          : {}),
      });
    }

    await markOnboarded(supabase, user.id);
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}
