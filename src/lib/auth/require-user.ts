import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import type { User } from "@supabase/supabase-js";

/**
 * Server-side auth guard for protected pages and actions.
 * Redirects to /sign-in when no valid user exists. Identity always comes from
 * the validated server session — never from client-supplied IDs.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

/** Like requireUser, but returns null instead of redirecting. */
export async function getOptionalUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
