import { fetch as expoFetch } from "expo/fetch";

import { requireEnv } from "@/lib/env";
import { getSupabase } from "@/lib/supabase";

import { createApiClient } from "./client";
import type { ApiClient, FetchLike } from "./client";

/**
 * The app's Saelis API client: expo/fetch (streaming-capable), the Supabase
 * session as the bearer-token source, and EXPO_PUBLIC_SAELIS_API_URL as the
 * base URL. Lazy singleton — a missing env var surfaces when the first
 * message is sent, as a calm error, not at import time.
 */

let client: ApiClient | null = null;

export function getSaelisApi(): ApiClient {
  if (client) return client;

  client = createApiClient({
    baseUrl: requireEnv("EXPO_PUBLIC_SAELIS_API_URL"),
    fetchFn: expoFetch as unknown as FetchLike,
    async getAccessToken() {
      const { data } = await getSupabase().auth.getSession();
      return data.session?.access_token ?? null;
    },
    async refreshAccessToken() {
      const { data } = await getSupabase().auth.refreshSession();
      return data.session?.access_token ?? null;
    },
  });
  return client;
}
