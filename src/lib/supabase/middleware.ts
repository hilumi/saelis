import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublishableKey, getSupabaseUrl, hasSupabaseEnv } from "@/lib/supabase/config";

import type { User } from "@supabase/supabase-js";

/**
 * Refresh the Supabase session for the current request and report the user.
 * Used by src/middleware.ts. When Supabase env vars are absent (fresh clone
 * before setup) we treat the visitor as unauthenticated instead of crashing.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });

  if (!hasSupabaseEnv()) {
    return { response, user: null };
  }

  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser() validates the JWT against Supabase Auth on the server.
  // Do not replace with getSession(), which trusts the cookie without validation.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
