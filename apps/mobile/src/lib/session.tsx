import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * Placeholder session for Sprint 1.
 *
 * Holds an in-memory signed-in flag so the launch state, the auth screen, and
 * the protected route group can be exercised end to end. Sprint 2 replaces the
 * internals with real Supabase auth (secure token storage, refresh, sign-out)
 * without changing this context's shape.
 */

type SessionStatus = "loading" | "signedOut" | "signedIn";

interface SessionContextValue {
  status: SessionStatus;
  /** Placeholder sign-in: accepts any input, creates a local session. */
  signIn: () => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");

  useEffect(() => {
    // Placeholder "restore session" moment so the launch state is honest.
    const timer = setTimeout(() => {
      setStatus((current) => (current === "loading" ? "signedOut" : current));
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const signIn = useCallback(() => setStatus("signedIn"), []);
  const signOut = useCallback(() => setStatus("signedOut"), []);

  const value = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider.");
  }
  return context;
}
