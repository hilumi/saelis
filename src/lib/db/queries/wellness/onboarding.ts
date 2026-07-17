import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import {
  onboardingDraftDataSchema,
  onboardingStepSchema,
  type OnboardingDraftData,
  type OnboardingStep,
} from "@/lib/validation/wellness-onboarding";

type Client = SupabaseClient<Database>;

export interface OnboardingState {
  currentStep: OnboardingStep;
  data: OnboardingDraftData;
  completedAt: string | null;
}

/**
 * Server-side resumable onboarding state. Draft JSONB is Zod-validated on
 * every read and write; an unreadable draft resets to a clean state rather
 * than surfacing unchecked data. Draft contents are never logged.
 */
export async function getOnboardingState(
  supabase: Client,
  userId: string,
): Promise<OnboardingState> {
  const { data, error } = await supabase
    .from("wellness_onboarding_drafts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load your setup progress.");
  if (!data) return { currentStep: "welcome", data: {}, completedAt: null };

  const step = onboardingStepSchema.safeParse(data.current_step);
  const draft = onboardingDraftDataSchema.safeParse(data.data ?? {});
  return {
    currentStep: step.success ? step.data : "welcome",
    data: draft.success ? draft.data : {},
    completedAt: data.completed_at,
  };
}

export async function saveOnboardingDraft(
  supabase: Client,
  userId: string,
  currentStep: OnboardingStep,
  data: OnboardingDraftData,
): Promise<void> {
  const parsed = onboardingDraftDataSchema.parse(data);
  const { error } = await supabase.from("wellness_onboarding_drafts").upsert(
    {
      user_id: userId,
      current_step: currentStep,
      data: parsed,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Could not save your progress. Nothing was lost on this screen.");
}

/**
 * Stamps completion and clears the draft payload — real records now live in
 * their own tables, and in-progress Restore answers must not linger outside
 * postpartum_profiles.
 */
export async function markOnboardingComplete(supabase: Client, userId: string): Promise<void> {
  const { error } = await supabase.from("wellness_onboarding_drafts").upsert(
    {
      user_id: userId,
      current_step: "review",
      data: {},
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error("Could not finish setup.");
}
