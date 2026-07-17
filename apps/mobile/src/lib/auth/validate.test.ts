import { describe, expect, it } from "vitest";

import { isValidEmail, validateNewPassword, validateSignIn, validateSignUp } from "./validate";

describe("isValidEmail", () => {
  it("accepts ordinary addresses (with surrounding whitespace)", () => {
    expect(isValidEmail("sophie@example.com")).toBe(true);
    expect(isValidEmail("  sophie@example.com  ")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("sophie")).toBe(false);
    expect(isValidEmail("sophie@")).toBe(false);
    expect(isValidEmail("sophie@example")).toBe(false);
    expect(isValidEmail("so phie@example.com")).toBe(false);
  });
});

describe("validateSignIn", () => {
  it("requires a valid email and a password", () => {
    expect(validateSignIn("nope", "secret")).not.toBeNull();
    expect(validateSignIn("sophie@example.com", "")).not.toBeNull();
    expect(validateSignIn("sophie@example.com", "secret")).toBeNull();
  });
});

describe("validateSignUp", () => {
  it("enforces the shared 8-character minimum (matches web)", () => {
    expect(validateSignUp("sophie@example.com", "short", "short")).toMatch(/at least 8/);
  });

  it("requires matching confirmation", () => {
    expect(validateSignUp("sophie@example.com", "longenough", "different")).toMatch(/match/);
  });

  it("passes for valid input", () => {
    expect(validateSignUp("sophie@example.com", "longenough", "longenough")).toBeNull();
  });
});

describe("validateNewPassword", () => {
  it("applies the same rules as sign-up", () => {
    expect(validateNewPassword("short", "short")).toMatch(/at least 8/);
    expect(validateNewPassword("longenough", "nope")).toMatch(/match/);
    expect(validateNewPassword("longenough", "longenough")).toBeNull();
  });
});
