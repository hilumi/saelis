/**
 * Pure auth-state machine. No React, no Supabase imports — the session
 * provider feeds events in; screens read the derived status. Keeping this
 * pure makes every transition unit-testable.
 */

export type AuthStatus = "loading" | "signedOut" | "signedIn";

/** The minimal session shape the app cares about. */
export interface SessionInfo {
  userId: string;
  email: string | null;
}

export interface AuthState {
  status: AuthStatus;
  session: SessionInfo | null;
  /** Set when Supabase env vars are missing; sign-in surfaces it calmly. */
  configError: string | null;
}

export const initialAuthState: AuthState = {
  status: "loading",
  session: null,
  configError: null,
};

export type AuthEvent =
  /** Launch restore finished (session may be null). */
  | { type: "restored"; session: SessionInfo | null }
  /** Any auth-state change from the client (sign-in, token refresh, user update). */
  | { type: "sessionChanged"; session: SessionInfo | null }
  /** Explicit or server-driven sign-out, including expired sessions. */
  | { type: "signedOut" }
  /** Client could not be constructed (missing configuration). */
  | { type: "configError"; message: string };

export function authReducer(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case "restored":
    case "sessionChanged":
      return {
        ...state,
        status: event.session ? "signedIn" : "signedOut",
        session: event.session,
      };
    case "signedOut":
      return { ...state, status: "signedOut", session: null };
    case "configError":
      return { status: "signedOut", session: null, configError: event.message };
  }
}
