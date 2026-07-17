import type { ActionResult } from "@saelis/shared";
import * as Linking from "expo-linking";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { createAuthController } from "@/lib/auth/controller";
import { authErrorMessage } from "@/lib/auth/errors";
import { initialAuthState } from "@/lib/auth/state";
import type { AuthState, AuthStatus, SessionInfo } from "@/lib/auth/state";
import { getSupabase } from "@/lib/supabase";

/**
 * Real Supabase session provider.
 *
 * Restores the persisted session during launch (status stays "loading" until
 * restoration finishes, so protected screens never flash), keeps a single
 * auth-state subscription for the app's lifetime, and exposes calm
 * ActionResult-shaped auth actions. Identity never comes from client input —
 * the Supabase session is the only source of truth, the same account and
 * data as the web app (RLS-scoped).
 */

interface SessionContextValue {
  status: AuthStatus;
  session: SessionInfo | null;
  /** Set when Supabase env vars are missing on this device. */
  configError: string | null;
  signIn: (email: string, password: string) => Promise<ActionResult>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<ActionResult | { ok: true; awaitingConfirmation: boolean }>;
  requestPasswordReset: (email: string) => Promise<ActionResult>;
  updatePassword: (password: string) => Promise<ActionResult>;
  /** Exchange a PKCE `code` from a saelis:// email link for a session. */
  completeAuthFromCode: (code: string) => Promise<ActionResult>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Deep link used in auth emails; resolves to saelis://auth/callback in builds. */
function authCallbackUrl(queryParams?: Record<string, string>): string {
  return Linking.createURL("auth/callback", { queryParams });
}

function failure(error: unknown): { ok: false; error: string } {
  return { ok: false, error: authErrorMessage(error as { message?: string }) };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialAuthState);

  // One controller (and therefore one subscription) per provider lifetime.
  const controllerRef = useRef<ReturnType<typeof createAuthController> | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = createAuthController(getSupabase, setState);
  }

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    void controller.start();
    return () => controller.stop();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<ActionResult> => {
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return failure(error);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await getSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: authCallbackUrl() },
      });
      if (error) return failure(error);
      // No session yet means Supabase sent a confirmation email.
      return { ok: true as const, awaitingConfirmation: data.session === null };
    } catch (error) {
      return failure(error);
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<ActionResult> => {
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: authCallbackUrl({ type: "recovery" }),
      });
      if (error) return failure(error);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<ActionResult> => {
    try {
      const { error } = await getSupabase().auth.updateUser({ password });
      if (error) return failure(error);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  }, []);

  const completeAuthFromCode = useCallback(async (code: string): Promise<ActionResult> => {
    try {
      const { error } = await getSupabase().auth.exchangeCodeForSession(code);
      if (error) return failure(error);
      return { ok: true };
    } catch (error) {
      return failure(error);
    }
  }, []);

  const signOut = useCallback(async () => {
    await controllerRef.current?.signOut();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status: state.status,
      session: state.session,
      configError: state.configError,
      signIn,
      signUp,
      requestPasswordReset,
      updatePassword,
      completeAuthFromCode,
      signOut,
    }),
    [state, signIn, signUp, requestPasswordReset, updatePassword, completeAuthFromCode, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider.");
  }
  return context;
}
