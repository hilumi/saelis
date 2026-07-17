import { authReducer, initialAuthState } from "./state";
import type { AuthState, SessionInfo } from "./state";

/**
 * Framework-free session lifecycle controller.
 *
 * Owns launch restoration, the single auth-state subscription, and clean
 * sign-out. The React provider is a thin wrapper; everything here is testable
 * with a fake client. Structural typing keeps it decoupled from supabase-js
 * internals.
 */

export interface SupabaseSessionLike {
  user: { id: string; email?: string | null };
}

interface AuthResponseError {
  message?: string;
  code?: string;
  status?: number;
}

export interface AuthClientLike {
  auth: {
    getSession(): Promise<{
      data: { session: SupabaseSessionLike | null };
      error: AuthResponseError | null;
    }>;
    onAuthStateChange(callback: (event: string, session: SupabaseSessionLike | null) => void): {
      data: { subscription: { unsubscribe(): void } };
    };
    signOut(): Promise<{ error: AuthResponseError | null }>;
  };
}

export function toSessionInfo(session: SupabaseSessionLike | null): SessionInfo | null {
  if (!session) return null;
  return { userId: session.user.id, email: session.user.email ?? null };
}

export interface AuthController {
  /** Restore the persisted session and subscribe to changes. Idempotent. */
  start(): Promise<void>;
  /** Unsubscribe. Safe to call multiple times. */
  stop(): void;
  /** Sign out locally first (never leaves stale UI), then remotely. */
  signOut(): Promise<void>;
  getState(): AuthState;
}

export function createAuthController(
  getClient: () => AuthClientLike,
  onChange: (state: AuthState) => void,
): AuthController {
  let state: AuthState = initialAuthState;
  let subscription: { unsubscribe(): void } | null = null;
  let started = false;

  function dispatch(event: Parameters<typeof authReducer>[1]): void {
    state = authReducer(state, event);
    onChange(state);
  }

  return {
    async start() {
      if (started) return;
      started = true;

      let client: AuthClientLike;
      try {
        client = getClient();
      } catch (error) {
        dispatch({
          type: "configError",
          message: error instanceof Error ? error.message : "Supabase is not configured.",
        });
        return;
      }

      // Subscribe before restoring so no change between the two is missed.
      // Restoration events (INITIAL_SESSION / SIGNED_IN) also flow through
      // here; the reducer is idempotent for equivalent sessions.
      subscription = client.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT") {
          // Includes server-driven sign-outs and failed token refreshes
          // (expired sessions): drop straight to signedOut.
          dispatch({ type: "signedOut" });
          return;
        }
        dispatch({ type: "sessionChanged", session: toSessionInfo(session) });
      }).data.subscription;

      const { data, error } = await client.auth.getSession();
      if (error) {
        // A broken persisted session is treated as signed out — the user
        // simply signs in again; nothing crashes.
        dispatch({ type: "restored", session: null });
        return;
      }
      dispatch({ type: "restored", session: toSessionInfo(data.session) });
    },

    stop() {
      subscription?.unsubscribe();
      subscription = null;
      started = false;
    },

    async signOut() {
      // Local state clears immediately so protected screens are left at once,
      // even if the network call fails.
      dispatch({ type: "signedOut" });
      try {
        const client = getClient();
        await client.auth.signOut();
      } catch {
        // Already signed out locally; secure storage is cleared by the client
        // on the next launch restore returning no session.
      }
    },

    getState() {
      return state;
    },
  };
}
