import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables, TablesUpdate } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * All queries take the request-scoped, RLS-enforced client and filter by the
 * server-derived user id. Errors are re-thrown with calm, content-free text.
 */

export async function getProfile(
  supabase: Client,
  userId: string,
): Promise<Tables<"profiles"> | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load your profile.");
  return data;
}

export async function updateProfile(
  supabase: Client,
  userId: string,
  values: Pick<TablesUpdate<"profiles">, "preferred_name" | "timezone">,
): Promise<void> {
  const { error } = await supabase.from("profiles").update(values).eq("id", userId);
  if (error) throw new Error("Could not save your profile.");
}

/** Mark onboarding complete (idempotent — the timestamp is set once). */
export async function markOnboarded(supabase: Client, userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", userId)
    .is("onboarded_at", null);
  if (error) throw new Error("Could not finish setup.");
}

export async function getCompanionProfile(
  supabase: Client,
  userId: string,
): Promise<Tables<"companion_profiles"> | null> {
  const { data, error } = await supabase
    .from("companion_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load your companion preferences.");
  return data;
}

export async function updateCompanionProfile(
  supabase: Client,
  userId: string,
  values: Omit<TablesUpdate<"companion_profiles">, "user_id">,
): Promise<void> {
  const { error } = await supabase.from("companion_profiles").update(values).eq("user_id", userId);
  if (error) throw new Error("Could not save your companion preferences.");
}

export async function getPrivacySettings(
  supabase: Client,
  userId: string,
): Promise<Tables<"user_privacy_settings"> | null> {
  const { data, error } = await supabase
    .from("user_privacy_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load your privacy settings.");
  return data;
}

export async function updatePrivacySettings(
  supabase: Client,
  userId: string,
  values: Omit<TablesUpdate<"user_privacy_settings">, "user_id">,
): Promise<void> {
  const { error } = await supabase
    .from("user_privacy_settings")
    .update(values)
    .eq("user_id", userId);
  if (error) throw new Error("Could not save your privacy settings.");
}
