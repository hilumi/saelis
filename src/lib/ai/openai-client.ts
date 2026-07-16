import "server-only";

import OpenAI from "openai";

import { ProviderNotConfiguredError } from "@/lib/ai/provider-errors";

/**
 * Server-only OpenAI client and configuration.
 *
 * - OPENAI_API_KEY is read only here, only on the server, and never logged.
 * - The client is created lazily so builds and mock mode work with blank vars.
 * - Application components never receive the client — only the provider uses it.
 * - SDK-internal retries are disabled; the provider owns retry policy.
 */

export interface OpenAIProviderConfig {
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
  maxRetries: number;
  storeResponses: boolean;
}

const DEFAULT_TIMEOUT_MS = 30_000;
// v0.7 grew the structured response (reflection, adaptationNotice,
// insightCandidate are required nullable keys). 900 tokens routinely hit the
// cap and produced incomplete JSON; this budget leaves honest headroom.
const DEFAULT_MAX_OUTPUT_TOKENS = 1_600;
const DEFAULT_MAX_RETRIES = 1;

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
}

export function getOpenAIConfig(): OpenAIProviderConfig {
  if (!process.env.OPENAI_API_KEY) {
    throw new ProviderNotConfiguredError("OPENAI_API_KEY is not set.");
  }
  const model = process.env.OPENAI_MODEL;
  if (!model) {
    throw new ProviderNotConfiguredError(
      "OPENAI_MODEL is not set. Choose a model in .env.local when COMPANION_PROVIDER=openai.",
    );
  }
  return {
    model,
    timeoutMs: readPositiveInt("OPENAI_REQUEST_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
    maxOutputTokens: readPositiveInt("OPENAI_MAX_OUTPUT_TOKENS", DEFAULT_MAX_OUTPUT_TOKENS),
    maxRetries: readPositiveInt("OPENAI_MAX_RETRIES", DEFAULT_MAX_RETRIES),
    storeResponses: process.env.OPENAI_STORE_RESPONSES === "true",
  };
}

let client: OpenAI | null = null;

/** Lazy, memoized client. Throws a typed configuration error when unconfigured. */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ProviderNotConfiguredError("OPENAI_API_KEY is not set.");
  }
  if (!client) {
    client = new OpenAI({
      apiKey,
      // The provider implements its own bounded retry with jitter.
      maxRetries: 0,
    });
  }
  return client;
}

/** Test hook — clears the memoized client. */
export function resetOpenAIClientForTests(): void {
  client = null;
}
