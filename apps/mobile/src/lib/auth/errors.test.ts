import { describe, expect, it } from "vitest";

import { authErrorMessage, classifyAuthError } from "./errors";

describe("classifyAuthError", () => {
  it("recognizes invalid credentials by code and by message", () => {
    expect(classifyAuthError({ code: "invalid_credentials" })).toBe("invalidCredentials");
    expect(classifyAuthError({ message: "Invalid login credentials" })).toBe("invalidCredentials");
  });

  it("recognizes unconfirmed email", () => {
    expect(classifyAuthError({ code: "email_not_confirmed" })).toBe("emailNotConfirmed");
  });

  it("recognizes weak passwords", () => {
    expect(classifyAuthError({ code: "weak_password" })).toBe("weakPassword");
    expect(classifyAuthError({ message: "Password should be at least 8 characters" })).toBe(
      "weakPassword",
    );
  });

  it("recognizes existing accounts", () => {
    expect(classifyAuthError({ code: "user_already_exists" })).toBe("userExists");
    expect(classifyAuthError({ message: "User already registered" })).toBe("userExists");
  });

  it("recognizes rate limiting by code and status", () => {
    expect(classifyAuthError({ code: "over_request_rate_limit" })).toBe("rateLimited");
    expect(classifyAuthError({ status: 429 })).toBe("rateLimited");
  });

  it("recognizes expired/used email links", () => {
    expect(classifyAuthError({ code: "flow_state_not_found" })).toBe("linkExpired");
    expect(classifyAuthError({ message: "Email link is invalid or has expired" })).toBe(
      "linkExpired",
    );
  });

  it("recognizes network failures", () => {
    expect(classifyAuthError({ message: "Network request failed" })).toBe("network");
    expect(classifyAuthError({ message: "fetch failed" })).toBe("network");
  });

  it("recognizes missing configuration", () => {
    expect(
      classifyAuthError({
        message: "Missing EXPO_PUBLIC_SUPABASE_URL. Copy apps/mobile/.env.example ...",
      }),
    ).toBe("config");
  });

  it("falls back to unknown", () => {
    expect(classifyAuthError(undefined)).toBe("unknown");
    expect(classifyAuthError({ message: "???" })).toBe("unknown");
  });
});

describe("authErrorMessage", () => {
  it("returns calm copy and never echoes raw library text", () => {
    const message = authErrorMessage({ message: "AuthApiError: invalid login credentials" });
    expect(message).not.toMatch(/AuthApiError/i);
    expect(message).toMatch(/didn’t match/);
  });

  it("never reveals whether an email exists on sign-up conflicts", () => {
    const message = authErrorMessage({ code: "user_already_exists" });
    expect(message.toLowerCase()).not.toContain("exists");
    expect(message.toLowerCase()).not.toContain("already registered");
  });

  it("always returns something readable for unknown errors", () => {
    expect(authErrorMessage(null).length).toBeGreaterThan(10);
  });
});
