import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

/**
 * PRIVILEGED administrative client. SERVER ONLY.
 *
 * - Uses SUPABASE_SECRET_KEY, which bypasses row-level security.
 * - Must NEVER be imported from client code (the "server-only" import above
 *   makes that a build error).
 * - Must NOT be used for normal user queries — use the request-scoped client
 *   from lib/supabase/server.ts, which enforces RLS.
 * - Its only intended Phase 1 use is full account deletion
 *   (auth.admin.deleteUser), which cannot be performed by the user session.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not configured. Privileged operations (such as full account deletion) are unavailable until it is set in the server environment.",
    );
  }

  return createSupabaseClient<Database>(getSupabaseUrl(), secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
