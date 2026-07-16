"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { isAllowedPreferenceKey } from "@/lib/core";
import {
  deleteAllAdaptationData,
  recordAdaptationCorrection,
  recordAdaptiveObservation,
  setAdaptivePreferenceStatus,
  setPatternHypothesisStatus,
} from "@/lib/db/queries/adaptation";
import { getPrivacySettings } from "@/lib/db/queries/profile";
import { recordStewardshipEvent } from "@/lib/db/queries/stewardship";
import { createClient } from "@/lib/supabase/server";

import type { ActionResult } from "@/types/actions";

/**
 * Server actions for adaptation controls. Identity always comes from the
 * server session; every write is bounded by RLS plus the database triggers
 * that prevent clients from raising confidence. Analytics events are
 * aggregate-only and recorded only with the user's product-analytics consent.
 */

const CALM_ERROR = "That didn't save. Nothing was lost — please try again.";

const preferenceDecisionSchema = z.object({
  preferenceId: z.string().uuid(),
  decision: z.enum(["keep", "adjust", "reset", "stop"]),
});

export async function decideAdaptivePreference(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = preferenceDecisionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That choice didn't look right." };
    const supabase = await createClient();

    switch (parsed.data.decision) {
      case "keep":
        await setAdaptivePreferenceStatus(supabase, user.id, parsed.data.preferenceId, "active");
        break;
      case "adjust":
        // "Adjust" lowers confidence (a correction) while keeping the
        // preference visible — Saelis becomes more tentative about it.
        await recordAdaptationCorrection(supabase, parsed.data.preferenceId);
        break;
      case "reset":
        await setAdaptivePreferenceStatus(supabase, user.id, parsed.data.preferenceId, "reset");
        break;
      case "stop":
        await setAdaptivePreferenceStatus(supabase, user.id, parsed.data.preferenceId, "paused");
        break;
    }

    const privacy = await getPrivacySettings(supabase, user.id);
    if (privacy?.allow_product_analytics) {
      await recordStewardshipEvent(supabase, user.id, {
        event_type: parsed.data.decision === "reset" ? "adaptation_reset" : "adaptation_corrected",
      });
    }
    revalidatePath("/settings/companion");
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

export async function resetAllAdaptationData(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    await deleteAllAdaptationData(supabase, user.id);
    const privacy = await getPrivacySettings(supabase, user.id);
    if (privacy?.allow_product_analytics) {
      await recordStewardshipEvent(supabase, user.id, { event_type: "adaptation_reset" });
    }
    revalidatePath("/settings/companion");
    revalidatePath("/insights");
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

const insightDecisionSchema = z.object({
  hypothesisId: z.string().uuid(),
  decision: z.enum(["explore", "not-now", "does-not-fit", "stop-theme"]),
  theme: z.string().max(40).optional(),
});

export async function decidePatternInsight(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = insightDecisionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That choice didn't look right." };
    const supabase = await createClient();
    const privacy = await getPrivacySettings(supabase, user.id);
    const analytics = privacy?.allow_product_analytics === true;

    switch (parsed.data.decision) {
      case "explore":
        await setPatternHypothesisStatus(
          supabase,
          user.id,
          parsed.data.hypothesisId,
          "accepted",
          true,
        );
        if (analytics) {
          await recordStewardshipEvent(supabase, user.id, {
            event_type: "pattern_insight_accepted",
          });
        }
        break;
      case "not-now":
        // Stays reviewable; just records that it was shown.
        await setPatternHypothesisStatus(
          supabase,
          user.id,
          parsed.data.hypothesisId,
          "reviewable",
          true,
        );
        break;
      case "does-not-fit":
        await setPatternHypothesisStatus(supabase, user.id, parsed.data.hypothesisId, "rejected");
        if (analytics) {
          await recordStewardshipEvent(supabase, user.id, {
            event_type: "pattern_insight_rejected",
          });
        }
        break;
      case "stop-theme": {
        await setPatternHypothesisStatus(supabase, user.id, parsed.data.hypothesisId, "rejected");
        // Remember the opt-out so this theme is never looked for again.
        const theme = parsed.data.theme ?? "";
        if (theme.length > 0 && isAllowedPreferenceKey("pattern-theme-opt-out")) {
          await recordAdaptiveObservation(supabase, "pattern-theme-opt-out", { theme }, true);
        }
        if (analytics) {
          await recordStewardshipEvent(supabase, user.id, {
            event_type: "pattern_insight_rejected",
          });
        }
        break;
      }
    }

    revalidatePath("/insights");
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}
