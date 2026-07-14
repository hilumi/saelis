import "server-only";

import type {
  CompanionProvider,
  CompanionRequest,
  CompanionResponse,
} from "@/lib/ai/companion-contract";

/**
 * PLACEHOLDER — the live OpenAI provider is intentionally NOT implemented in
 * Phase 1. No OpenAI SDK is installed and no external AI request is made.
 *
 * When implemented, this provider must:
 *  - run only on the server (OPENAI_API_KEY is never exposed to the browser),
 *  - validate output with companionResponseSchema before returning it,
 *  - never request, expose, or store chain-of-thought.
 */
export class OpenAICompanionProvider implements CompanionProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface conformance; unused until implemented
  respond(_input: CompanionRequest): Promise<CompanionResponse> {
    throw new Error(
      "The OpenAI companion provider is not configured in this phase. Set COMPANION_PROVIDER=mock, or implement OpenAICompanionProvider in a future phase.",
    );
  }
}
