import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Request authentication for API routes that serve both clients:
 *
 * - Web: the existing cookie-bound server client (unchanged behavior).
 * - Mobile: `Authorization: Bearer <supabase access token>`. The token is
 *   verified against Supabase Auth before any data access, and the returned
 *   client forwards the SAME user JWT on every query, so RLS own-row policies
 *   apply exactly as they do for the web client.
 *
 * Identity always comes from the verified token or cookie session — never
 * from a client-supplied user id. Only the publishable key is used here;
 * no service-role credentials.
 */

export interface RequestAuth {
  supabase: SupabaseClient<Database>;
  user: User | null;
}

function bearerTokenFrom(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

/** RLS client that forwards the user's own JWT with every request. */
function createBearerClient(token: string): SupabaseClient<Database> {
  return createSupabaseJsClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Resolve the caller. Bearer tokens (mobile) take precedence when present;
 * otherwise the cookie session (web) is used. An invalid or expired bearer
 * token yields `user: null` — routes respond 401 as they always have.
 */
export async function resolveRequestAuth(request: Request): Promise<RequestAuth> {
  const token = bearerTokenFrom(request);

  if (token) {
    const supabase = createBearerClient(token);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    return { supabase, user };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
