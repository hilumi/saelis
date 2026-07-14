import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

/**
 * Browser Supabase client. Uses only public (publishable) credentials;
 * all data access is constrained by row-level security.
 */
export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabasePublishableKey());
}
