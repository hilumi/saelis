import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/**
 * Server-side founder check. RLS lets users read only their OWN roles, and
 * app_roles has no insert/update/delete policies — assignment is a privileged
 * manual database action only. Never trust a role from client input.
 */
export async function hasFounderRole(supabase: Client, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "founder")
    .maybeSingle();
  if (error) return false;
  return data !== null;
}

export type AppRole = "founder" | "admin" | "support" | "product_analytics" | "support_admin";

/**
 * All roles held by a user (server-side lookup; RLS restricts reads to the
 * user's OWN roles, which is exactly what authorization checks need). Errors
 * degrade to "no roles" — deny by default.
 */
export async function listAppRoles(supabase: Client, userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("app_roles").select("role").eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map((row) => row.role as AppRole);
}
