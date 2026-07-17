import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";

import { requireEnv } from "@/lib/env";

/**
 * Mobile Supabase client.
 *
 * - Public credentials only (URL + publishable key); all data access is
 *   constrained by row-level security, exactly as on the web.
 * - Sessions are persisted with expo-secure-store (iOS Keychain / Android
 *   Keystore-encrypted storage) — never browser localStorage.
 * - PKCE flow: email links carry a one-time `code` that only this client
 *   (holding the verifier in secure storage) can exchange.
 * - Token auto-refresh runs while the app is foregrounded (AppState wiring
 *   below); an unrecoverable refresh emits SIGNED_OUT, which the session
 *   provider treats as an expired session.
 */

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

let client: SupabaseClient | null = null;
let appStateWired = false;

/**
 * Lazy singleton. Throws a calm, actionable error when env vars are missing —
 * callers surface it as a configuration notice instead of crashing at import.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = requireEnv("EXPO_PUBLIC_SUPABASE_URL");
  const key = requireEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  client = createClient(url, key, {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      // Native app: there is no browser URL to inspect.
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });

  // Refresh tokens only while the app is in the foreground (Supabase's
  // recommended React Native wiring). Registered once per process.
  if (!appStateWired) {
    appStateWired = true;
    const current = client;
    if (AppState.currentState === "active") {
      current.auth.startAutoRefresh();
    }
    AppState.addEventListener("change", (state) => {
      if (state === "active") {
        current.auth.startAutoRefresh();
      } else {
        current.auth.stopAutoRefresh();
      }
    });
  }

  return client;
}
