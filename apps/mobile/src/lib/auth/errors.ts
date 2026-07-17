/**
 * Maps auth failures to calm, content-free copy — the same voice as the web
 * auth screens. Never reveals whether an email exists, never echoes raw
 * library messages to users, never logs credentials.
 */

export type AuthErrorKind =
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "weakPassword"
  | "userExists"
  | "rateLimited"
  | "network"
  | "config"
  | "linkExpired"
  | "unknown";

interface ErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

/** Classify a thrown/returned auth error without depending on exact library types. */
export function classifyAuthError(error: ErrorLike | null | undefined): AuthErrorKind {
  if (!error) return "unknown";
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "invalidCredentials";
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "emailNotConfirmed";
  }
  if (code === "weak_password" || message.includes("password should be")) {
    return "weakPassword";
  }
  if (code === "user_already_exists" || message.includes("already registered")) {
    return "userExists";
  }
  if (
    code === "over_request_rate_limit" ||
    error.status === 429 ||
    message.includes("rate limit")
  ) {
    return "rateLimited";
  }
  if (
    code === "flow_state_not_found" ||
    code === "flow_state_expired" ||
    message.includes("expired") ||
    message.includes("invalid flow state")
  ) {
    return "linkExpired";
  }
  if (message.includes("missing expo_public_") || message.includes("copy apps/mobile/.env")) {
    return "config";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "network";
  }
  return "unknown";
}

const COPY: Record<AuthErrorKind, string> = {
  invalidCredentials: "That email and password didn’t match. Take your time and try again.",
  emailNotConfirmed: "Please confirm your email first — the link is in your inbox.",
  weakPassword: "Please choose a password of at least 8 characters.",
  userExists: "We couldn’t create your account with those details. Please try again.",
  rateLimited: "A short pause is needed. Please try again in a minute.",
  network: "We couldn’t reach Saelis just now. Please check your connection and try again.",
  config:
    "Saelis isn’t configured on this device yet. Add the Supabase values to apps/mobile/.env.",
  linkExpired: "That link has expired or was already used. Request a fresh one and try again.",
  unknown: "Something didn’t work just now. Please try again in a moment.",
};

export function authErrorMessage(error: ErrorLike | null | undefined): string {
  return COPY[classifyAuthError(error)];
}
