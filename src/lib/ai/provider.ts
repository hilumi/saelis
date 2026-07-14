import "server-only";

import { MockCompanionProvider } from "@/lib/ai/companion-mock";
import { OpenAICompanionProvider } from "@/lib/ai/companion-openai";
import { ProviderNotConfiguredError } from "@/lib/ai/provider-errors";

import type { CompanionProvider, CompanionRequest } from "@/lib/ai/companion-contract";
import type { CompanionProviderResult, StreamOptions } from "@/lib/ai/companion-openai";
import type { LightPlan } from "@/lib/light/types";

/**
 * Provider factory.
 * - COMPANION_PROVIDER=mock   → deterministic mock (default when unset)
 * - COMPANION_PROVIDER=openai → live OpenAI provider (server-only)
 * - anything else             → typed configuration error
 *
 * No provider connection is attempted at build time — construction is cheap
 * and the OpenAI client itself is lazy.
 */
export function getCompanionProvider(): CompanionProvider {
  const configured = process.env.COMPANION_PROVIDER ?? "mock";

  if (configured === "openai") {
    return new OpenAICompanionProvider();
  }
  if (configured === "mock") {
    return new MockCompanionProvider();
  }
  throw new ProviderNotConfiguredError(
    `Unknown COMPANION_PROVIDER "${configured}". Use "mock" or "openai".`,
  );
}

export function isMockCompanion(): boolean {
  return (process.env.COMPANION_PROVIDER ?? "mock") !== "openai";
}

/** Streaming-capable provider surface (currently only the OpenAI provider). */
export interface StreamingCompanionProvider extends CompanionProvider {
  respondStream(
    input: CompanionRequest,
    plan: LightPlan,
    options: StreamOptions,
  ): Promise<CompanionProviderResult>;
}

export function supportsStreaming(
  provider: CompanionProvider,
): provider is StreamingCompanionProvider {
  return typeof (provider as Partial<StreamingCompanionProvider>).respondStream === "function";
}
