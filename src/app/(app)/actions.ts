"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { deleteAllArrivals, createArrival } from "@/lib/db/queries/arrivals";
import { deleteAllConversations } from "@/lib/db/queries/conversations";
import { deleteAllHorizonSteps, setHorizonStepCompleted } from "@/lib/db/queries/horizon";
import { deleteAllMemories } from "@/lib/db/queries/memories";
import {
  getPrivacySettings,
  updateCompanionProfile,
  updatePrivacySettings,
  updateProfile,
} from "@/lib/db/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { arrivalSchema } from "@/lib/validation/arrival";
import {
  companionSettingsSchema,
  privacySettingsSchema,
  profileSettingsSchema,
} from "@/lib/validation/profile";

import type { ActionResult } from "@/types/actions";

/**
 * Server actions. Every action:
 *  - derives identity from the server session (never from the input),
 *  - validates input with Zod,
 *  - returns calm, content-free errors,
 *  - relies on RLS as the final authority.
 */

const CALM_ERROR = "That didn't save. Nothing was lost — please try again.";

export async function submitArrival(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = arrivalSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Something about that check-in didn't look right." };
    }
    const supabase = await createClient();
    await createArrival(supabase, user.id, parsed.data);
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

const companionSettingsActionSchema = z.object({
  preferredName: profileSettingsSchema.shape.preferredName,
  preferences: companionSettingsSchema,
});

export async function saveCompanionSettings(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = companionSettingsActionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Some of those preferences didn't look right." };
    }
    const supabase = await createClient();
    await updateProfile(supabase, user.id, { preferred_name: parsed.data.preferredName });
    await updateCompanionProfile(supabase, user.id, {
      tone_preference: parsed.data.preferences.tonePreference,
      response_length: parsed.data.preferences.responseLength,
      default_support_preference: parsed.data.preferences.defaultSupportPreference,
      humor_level: parsed.data.preferences.humorLevel,
      faith_preference: parsed.data.preferences.faithPreference,
      planning_style: parsed.data.preferences.planningStyle,
      encouragement_style: parsed.data.preferences.encouragementStyle,
      adaptive_learning_enabled: parsed.data.preferences.adaptiveLearningEnabled,
    });
    revalidatePath("/settings/companion");
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

export async function savePrivacySettings(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = privacySettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "Those settings didn't look right." };
    }
    const supabase = await createClient();
    await updatePrivacySettings(supabase, user.id, {
      save_conversation_history: parsed.data.saveConversationHistory,
      allow_companion_memory: parsed.data.allowCompanionMemory,
      allow_product_analytics: parsed.data.allowProductAnalytics,
    });
    revalidatePath("/settings/privacy");
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

import { memoryApprovalSchema } from "@/lib/validation/memory";
import { isProhibitedMemoryCategory } from "@/lib/light/memory-policy";
import { recordStewardshipEvent } from "@/lib/db/queries/stewardship";

/**
 * The ONLY path by which a proposed memory becomes real: explicit user
 * approval. The companion API never saves proposals.
 */
export async function approveProposedMemory(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = memoryApprovalSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "That memory couldn't be read." };
    }
    if (isProhibitedMemoryCategory(parsed.data.category)) {
      return { ok: false, error: "That kind of detail is never kept as a memory." };
    }
    const supabase = await createClient();
    const privacy = await getPrivacySettings(supabase, user.id);
    if (privacy && !privacy.allow_companion_memory) {
      return { ok: false, error: "Companion memory is turned off in your privacy settings." };
    }
    const { error } = await supabase.from("companion_memories").insert({
      user_id: user.id,
      category: parsed.data.category,
      content: parsed.data.content,
      kind: parsed.data.kind,
      title: parsed.data.title,
      reason: parsed.data.reason,
      source: "user-approved-inference",
      status: "active",
      user_approved: true,
    });
    if (error) return { ok: false, error: CALM_ERROR };
    if (privacy?.allow_product_analytics) {
      await recordStewardshipEvent(supabase, user.id, {
        event_type: parsed.data.edited ? "memory_proposal_edited" : "memory_proposal_accepted",
        memory_kind: parsed.data.kind,
      });
    }
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

export async function toggleHorizonStep(stepId: string, completed: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (typeof stepId !== "string" || stepId.length > 64) {
      return { ok: false, error: CALM_ERROR };
    }
    const supabase = await createClient();
    await setHorizonStepCompleted(supabase, user.id, stepId, Boolean(completed));
    revalidatePath("/horizon");
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

// ---------------------------------------------------------------------------
// Data deletion (development section of privacy settings)
// ---------------------------------------------------------------------------

export async function deleteAllConversationsAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    await deleteAllConversations(supabase, user.id);
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

export async function deleteAllArrivalsAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    await deleteAllArrivals(supabase, user.id);
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

export async function deleteAllHorizonStepsAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    await deleteAllHorizonSteps(supabase, user.id);
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

export async function deleteAllMemoriesAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    await deleteAllMemories(supabase, user.id);
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

/**
 * Full account deletion. Requires the privileged server-only admin client
 * (SUPABASE_SECRET_KEY). The UI disables this action until configured.
 * Deleting the auth user cascades to all user-owned rows via foreign keys.
 */
export async function deleteAccountAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!process.env.SUPABASE_SECRET_KEY) {
      return {
        ok: false,
        error: "Account deletion isn't configured on this server yet.",
      };
    }
    // Imported lazily so the privileged module is only loaded when needed.
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return { ok: false, error: CALM_ERROR };

    const supabase = await createClient();
    await supabase.auth.signOut();
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}
