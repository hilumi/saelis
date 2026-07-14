import "server-only";

import { MockCompanionProvider } from "@/lib/ai/companion-mock";
import { OpenAICompanionProvider } from "@/lib/ai/companion-openai";

import type { CompanionProvider } from "@/lib/ai/companion-contract";

/**
 * Provider selection. Phase 1 supports only the mock provider; the OpenAI
 * provider is a placeholder that throws until a future phase implements it.
 */
export function getCompanionProvider(): CompanionProvider {
  const configured = process.env.COMPANION_PROVIDER ?? "mock";

  if (configured === "openai") {
    return new OpenAICompanionProvider();
  }

  return new MockCompanionProvider();
}

export function isMockCompanion(): boolean {
  return (process.env.COMPANION_PROVIDER ?? "mock") !== "openai";
}
