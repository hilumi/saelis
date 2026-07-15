import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { MockCompanionProvider } from "@/lib/ai/companion-mock";
import { OpenAICompanionProvider } from "@/lib/ai/companion-openai";
import { getCompanionProvider, isMockCompanion, supportsStreaming } from "@/lib/ai/provider";

/**
 * Provider factory selection. Construction is side-effect free (the OpenAI
 * client is lazy), so instanceof checks here can never trigger a live call.
 * Environment values are set explicitly per test and restored afterwards —
 * production selection behavior is asserted, not modified.
 */
const ORIGINAL = process.env.COMPANION_PROVIDER;

afterAll(() => {
  if (ORIGINAL === undefined) {
    delete process.env.COMPANION_PROVIDER;
  } else {
    process.env.COMPANION_PROVIDER = ORIGINAL;
  }
});

beforeEach(() => {
  delete process.env.COMPANION_PROVIDER;
});

describe("getCompanionProvider", () => {
  it("defaults to the mock provider when unset", () => {
    expect(getCompanionProvider()).toBeInstanceOf(MockCompanionProvider);
    expect(isMockCompanion()).toBe(true);
  });

  it("selects the mock provider explicitly", () => {
    process.env.COMPANION_PROVIDER = "mock";
    expect(getCompanionProvider()).toBeInstanceOf(MockCompanionProvider);
  });

  it("selects the OpenAI provider when explicitly configured (no connection attempted)", () => {
    process.env.COMPANION_PROVIDER = "openai";
    const provider = getCompanionProvider();
    expect(provider).toBeInstanceOf(OpenAICompanionProvider);
    expect(supportsStreaming(provider)).toBe(true);
    expect(isMockCompanion()).toBe(false);
  });

  it("re-reads the environment on every call — no cached singleton to reset", () => {
    process.env.COMPANION_PROVIDER = "openai";
    expect(getCompanionProvider()).toBeInstanceOf(OpenAICompanionProvider);
    process.env.COMPANION_PROVIDER = "mock";
    expect(getCompanionProvider()).toBeInstanceOf(MockCompanionProvider);
  });

  it("rejects unknown provider values with a typed configuration error", () => {
    process.env.COMPANION_PROVIDER = "clippy";
    expect(() => getCompanionProvider()).toThrowError(/Unknown COMPANION_PROVIDER/);
  });
});
