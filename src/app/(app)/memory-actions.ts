"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { createHorizonStep } from "@/lib/db/queries/horizon";
import {
  createUserMemory,
  deleteMemoryPermanently,
  listReviewableMemories,
  updateMemory,
} from "@/lib/db/queries/memories";
import { getPrivacySettings } from "@/lib/db/queries/profile";
import { recordStewardshipEvent } from "@/lib/db/queries/stewardship";
import { createClient } from "@/lib/supabase/server";
import {
  containsSecretMaterial,
  feedbackSchema,
  horizonHandoffSchema,
  memoryCreateSchema,
  memoryEditSchema,
} from "@/lib/validation/memory";

import type { ActionResult } from "@/types/actions";

const CALM_ERROR = "That didn't save. Nothing was lost — please try again.";

async function analyticsAllowed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const privacy = await getPrivacySettings(supabase, userId);
  return privacy?.allow_product_analytics ?? false;
}

/** Edit title, content, reason, or kind. Ownership is server-derived + RLS. */
export async function updateMemoryAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = memoryEditSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That edit didn't look right." };
    if (containsSecretMaterial(parsed.data.content)) {
      return {
        ok: false,
        error: "Passwords, keys, and account secrets can't be kept as memories.",
      };
    }
    const supabase = await createClient();
    await updateMemory(supabase, user.id, parsed.data.memoryId, {
      kind: parsed.data.kind,
      title: parsed.data.title,
      content: parsed.data.content,
      reason: parsed.data.reason,
    });
    revalidatePath("/settings/memories");
    revalidatePath("/constellations");
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

/** Create a memory directly (North Star or Constellation) — always explicit. */
export async function createMemoryAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = memoryCreateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Those words didn't look right." };
    if (containsSecretMaterial(parsed.data.content)) {
      return {
        ok: false,
        error: "Passwords, keys, and account secrets can't be kept as memories.",
      };
    }
    const supabase = await createClient();
    await createUserMemory(supabase, user.id, parsed.data);
    revalidatePath("/settings/memories");
    revalidatePath("/constellations");
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

export async function deleteMemoryAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = z.object({ memoryId: z.string().uuid() }).safeParse(input);
    if (!parsed.success) return { ok: false, error: CALM_ERROR };
    const supabase = await createClient();
    await deleteMemoryPermanently(supabase, user.id, parsed.data.memoryId);
    if (await analyticsAllowed(supabase, user.id)) {
      await recordStewardshipEvent(supabase, user.id, { event_type: "memory_deleted" });
    }
    revalidatePath("/settings/memories");
    revalidatePath("/constellations");
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

/**
 * User-initiated export of the user's own memories. Contains no user IDs,
 * database IDs, provider IDs, or internal moderation details.
 */
export async function exportMemoriesAction(): Promise<
  | { ok: true; exportedAt: string; memories: Array<Record<string, string | null>> }
  | { ok: false; error: string }
> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const memories = await listReviewableMemories(supabase, user.id);
    return {
      ok: true,
      exportedAt: new Date().toISOString(),
      memories: memories
        .filter((memory) => memory.status === "active")
        .map((memory) => ({
          kind: memory.kind,
          title: memory.title,
          content: memory.content,
          reason: memory.reason,
          createdAt: memory.created_at,
          updatedAt: memory.updated_at,
        })),
    };
  } catch {
    return { ok: false, error: "The export couldn't be prepared. Please try again." };
  }
}

/** Explicit "Add this to Horizon" hand-off. Idempotent per conversation+title. */
export async function addSuggestedStepToHorizon(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = horizonHandoffSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "That step didn't look right." };
    const supabase = await createClient();

    // Duplicate protection: the same suggested step from the same conversation
    // is added once, however many times the control is clicked.
    const { data: existing } = await supabase
      .from("horizon_steps")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", parsed.data.title)
      .eq("completed", false)
      .limit(1);
    if (existing && existing.length > 0) {
      return { ok: true };
    }

    await createHorizonStep(supabase, user.id, {
      title: parsed.data.title,
      description: parsed.data.description,
      estimatedMinutes: parsed.data.estimatedMinutes,
      conversationId: parsed.data.conversationId,
    });
    if (await analyticsAllowed(supabase, user.id)) {
      await recordStewardshipEvent(supabase, user.id, { event_type: "horizon_step_added" });
    }
    revalidatePath("/horizon");
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}

/** Optional, understated response feedback. Opt-in analytics only; no text. */
export async function recordResponseFeedback(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = feedbackSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: CALM_ERROR };
    const supabase = await createClient();
    if (!(await analyticsAllowed(supabase, user.id))) {
      // Respect the opt-out silently — the user's click still "worked."
      return { ok: true };
    }
    await recordStewardshipEvent(supabase, user.id, {
      event_type: parsed.data.helpful ? "response_feedback_positive" : "response_feedback_negative",
      feedback_category: parsed.data.helpful ? null : parsed.data.category,
    });
    // Aggregate-only signals for the humor and challenge calibrations (v0.7
    // stewardship categories). Still content-free — a category, never text.
    if (!parsed.data.helpful && parsed.data.category === "humor-did-not-land") {
      await recordStewardshipEvent(supabase, user.id, { event_type: "humor_feedback_negative" });
    }
    if (!parsed.data.helpful && parsed.data.category === "too-direct") {
      await recordStewardshipEvent(supabase, user.id, {
        event_type: "challenge_feedback_negative",
      });
    }
    return { ok: true };
  } catch {
    return { ok: false, error: CALM_ERROR };
  }
}
