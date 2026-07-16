import "server-only";

import { companionResponseSchema } from "@/lib/ai/companion-contract";
import { applyContextBudget } from "@/lib/ai/context-budget";
import { INJECTION_RESILIENCE_INSTRUCTION } from "@/lib/ai/injection";
import { MessageFieldStreamer } from "@/lib/ai/message-streamer";
import { getOpenAIClient, getOpenAIConfig } from "@/lib/ai/openai-client";
import {
  COMPANION_RESPONSE_JSON_SCHEMA,
  COMPANION_RESPONSE_SCHEMA_NAME,
} from "@/lib/ai/openai-schema";
import { enforcePlanConstraints } from "@/lib/ai/plan-enforcement";
import {
  classifyProviderError,
  ProviderIncompleteError,
  ProviderNotConfiguredError,
  ProviderValidationError,
} from "@/lib/ai/provider-errors";
import { logValidationDiagnostics, summarizeZodIssues } from "@/lib/ai/validation-diagnostics";

import type {
  CompanionProvider,
  CompanionRequest,
  CompanionResponse,
} from "@/lib/ai/companion-contract";
import type { LightPlan } from "@/lib/light/types";

/**
 * OpenAICompanionProvider — the live language engine BENEATH the Light Engine.
 *
 * The model renders language inside the LightPlan; it never defines Saelis's
 * identity. This module:
 *  - runs only on the server (server-only marker; key never leaves here),
 *  - uses the Responses API with strict structured outputs,
 *  - streams visible message text while assembling the full JSON server-side,
 *  - validates with Zod, then deterministically enforces the plan,
 *  - never queries the database, never persists anything,
 *  - never requests or forwards hidden reasoning,
 *  - sends store:false by default and enables no tools of any kind.
 */

export interface ProviderMetadata {
  provider: string;
  model: string;
  providerResponseId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  retryCount: number;
}

export interface CompanionProviderResult {
  response: CompanionResponse;
  metadata: ProviderMetadata;
}

export interface StreamOptions {
  signal?: AbortSignal;
  onDelta?: (text: string) => void;
}

/** Minimal local view of Responses API stream events (SDK types stay internal). */
interface ResponsesStreamEvent {
  type: string;
  delta?: string;
  response?: {
    id?: string;
    status?: string;
    incomplete_details?: { reason?: string };
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  };
}

interface ResponsesResult {
  id?: string;
  status?: string;
  incomplete_details?: { reason?: string };
  output_text?: string;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
}

// ---------------------------------------------------------------------------
// Structured-output normalization
// ---------------------------------------------------------------------------

/** Contract size caps for the v0.7 optional objects (mirrors the Zod schema). */
const EXTRA_FIELD_CAPS = {
  reflectionEntry: 300,
  reflectionItems: 8,
  noticeSummary: 300,
  noticeKey: 60,
  insightTheme: 40,
  insightObservation: 500,
  insightUncertainty: 300,
} as const;

function clampStringList(value: unknown, maxItems: number, maxLength: number): unknown {
  if (!Array.isArray(value)) return value;
  return value
    .slice(0, maxItems)
    .map((entry) => (typeof entry === "string" ? entry.slice(0, maxLength) : entry));
}

/**
 * Deterministically clamp the v0.7 optional objects to their contract caps
 * BEFORE validation. OpenAI strict schemas cannot express string/array length
 * bounds, so a well-formed live response can exceed them; truncating to the
 * documented caps is the correct handling (the caps still hold), whereas
 * rejecting the entire response over an over-long reflection entry is not.
 * Nothing else in the payload is touched, and validation itself is unchanged.
 */
export function clampStructuredExtras(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const record = { ...(value as Record<string, unknown>) };

  const reflection = record.reflection;
  if (typeof reflection === "object" && reflection !== null && !Array.isArray(reflection)) {
    const source = reflection as Record<string, unknown>;
    record.reflection = {
      ...source,
      facts: clampStringList(
        source.facts,
        EXTRA_FIELD_CAPS.reflectionItems,
        EXTRA_FIELD_CAPS.reflectionEntry,
      ),
      interpretations: clampStringList(
        source.interpretations,
        EXTRA_FIELD_CAPS.reflectionItems,
        EXTRA_FIELD_CAPS.reflectionEntry,
      ),
      unknowns: clampStringList(
        source.unknowns,
        EXTRA_FIELD_CAPS.reflectionItems,
        EXTRA_FIELD_CAPS.reflectionEntry,
      ),
      alternativePerspectives: clampStringList(
        source.alternativePerspectives,
        EXTRA_FIELD_CAPS.reflectionItems,
        EXTRA_FIELD_CAPS.reflectionEntry,
      ),
    };
  }

  const notice = record.adaptationNotice;
  if (typeof notice === "object" && notice !== null && !Array.isArray(notice)) {
    const source = notice as Record<string, unknown>;
    record.adaptationNotice = {
      ...source,
      summary:
        typeof source.summary === "string"
          ? source.summary.slice(0, EXTRA_FIELD_CAPS.noticeSummary)
          : source.summary,
      preferenceKey:
        typeof source.preferenceKey === "string"
          ? source.preferenceKey.slice(0, EXTRA_FIELD_CAPS.noticeKey)
          : source.preferenceKey,
    };
  }

  const insight = record.insightCandidate;
  if (typeof insight === "object" && insight !== null && !Array.isArray(insight)) {
    const source = insight as Record<string, unknown>;
    record.insightCandidate = {
      ...source,
      theme:
        typeof source.theme === "string"
          ? source.theme.slice(0, EXTRA_FIELD_CAPS.insightTheme)
          : source.theme,
      observation:
        typeof source.observation === "string"
          ? source.observation.slice(0, EXTRA_FIELD_CAPS.insightObservation)
          : source.observation,
      uncertaintyStatement:
        typeof source.uncertaintyStatement === "string"
          ? source.uncertaintyStatement.slice(0, EXTRA_FIELD_CAPS.insightUncertainty)
          : source.uncertaintyStatement,
    };
  }

  return record;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs && retryAfterMs > 0 && retryAfterMs <= 20_000) return retryAfterMs;
  const base = 500 * 2 ** attempt;
  return base + Math.floor(Math.random() * 250);
}

export class OpenAICompanionProvider implements CompanionProvider {
  /** Standard non-streaming completion (existing CompanionProvider contract). */
  async respond(input: CompanionRequest, plan?: LightPlan): Promise<CompanionResponse> {
    if (!plan) {
      throw new ProviderNotConfiguredError(
        "The OpenAI provider requires a LightPlan — it never runs outside the Light Engine.",
      );
    }
    const { response } = await this.generate(input, plan, {});
    return response;
  }

  /** Streaming completion: visible message deltas + validated final response. */
  async respondStream(
    input: CompanionRequest,
    plan: LightPlan,
    options: StreamOptions,
  ): Promise<CompanionProviderResult> {
    return this.generate(input, plan, options, true);
  }

  private async generate(
    input: CompanionRequest,
    plan: LightPlan,
    options: StreamOptions,
    stream = false,
  ): Promise<CompanionProviderResult> {
    const config = getOpenAIConfig();
    let attempt = 0;

    // Bounded retry with jitter — transient failures only, never after abort,
    // and never once streaming has begun emitting user-visible text.
    for (;;) {
      const started = Date.now();
      let emittedText = false;
      try {
        const result = await this.attempt(input, plan, config.model, config, {
          ...options,
          onDelta: options.onDelta
            ? (text) => {
                emittedText = true;
                options.onDelta?.(text);
              }
            : undefined,
          stream,
        });
        return {
          response: result.response,
          metadata: { ...result.metadata, latencyMs: Date.now() - started, retryCount: attempt },
        };
      } catch (error) {
        const providerError = classifyProviderError(error);
        const abortRequested = options.signal?.aborted === true;
        const canRetry =
          providerError.retryable && !abortRequested && !emittedText && attempt < config.maxRetries;
        if (!canRetry) throw providerError;
        await sleep(backoffDelay(attempt, providerError.retryAfterMs));
        attempt += 1;
      }
    }
  }

  private async attempt(
    input: CompanionRequest,
    plan: LightPlan,
    model: string,
    config: { timeoutMs: number; maxOutputTokens: number; storeResponses: boolean },
    options: StreamOptions & { stream: boolean },
  ): Promise<{
    response: CompanionResponse;
    metadata: Omit<ProviderMetadata, "latencyMs" | "retryCount">;
  }> {
    const client = getOpenAIClient();

    const timeoutSignal = AbortSignal.timeout(config.timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;

    // Approved memories and turns pass through the server-side context budget.
    const budgeted = applyContextBudget(
      input.recentTurns,
      plan.memory.mayUseApprovedMemories ? input.approvedMemories : [],
    );

    // Developer-level instructions carry Saelis's identity; user content stays
    // strictly in the input turns and is treated as untrusted.
    const instructions = [
      plan.developerInstruction,
      INJECTION_RESILIENCE_INSTRUCTION,
      plan.contextualInstruction,
    ].join("\n\n");

    const request = {
      model,
      instructions,
      input: [
        ...budgeted.recentTurns.map((turn) => ({
          role: turn.role,
          content: turn.content,
        })),
        { role: "user" as const, content: input.message },
      ],
      max_output_tokens: config.maxOutputTokens,
      store: config.storeResponses,
      text: {
        format: {
          type: "json_schema" as const,
          name: COMPANION_RESPONSE_SCHEMA_NAME,
          strict: true,
          schema: COMPANION_RESPONSE_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    };

    let rawJson = "";
    let responseId: string | undefined;
    let usage: { input_tokens?: number; output_tokens?: number; total_tokens?: number } | undefined;
    let responseStatus: string | undefined;
    let incompleteReason: string | undefined;

    if (options.stream) {
      const streamResponse = (await client.responses.create(
        { ...request, stream: true },
        { signal },
      )) as AsyncIterable<ResponsesStreamEvent>;

      const extractor = new MessageFieldStreamer();
      for await (const event of streamResponse) {
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          rawJson += event.delta;
          const visible = extractor.push(event.delta);
          if (visible) options.onDelta?.(visible);
        } else if (event.type === "response.completed" && event.response) {
          responseId = event.response.id;
          responseStatus = event.response.status ?? "completed";
          usage = event.response.usage;
        } else if (event.type === "response.incomplete") {
          // The model stopped early (e.g. max_output_tokens). This is NOT a
          // validation failure and never an authentication failure.
          responseId = event.response?.id;
          responseStatus = "incomplete";
          incompleteReason = event.response?.incomplete_details?.reason ?? "unknown";
          usage = event.response?.usage;
        } else if (event.type === "response.failed" || event.type === "error") {
          throw new ProviderValidationError();
        }
      }
    } else {
      const result = (await client.responses.create(request, { signal })) as ResponsesResult;
      rawJson = result.output_text ?? "";
      responseId = result.id;
      responseStatus = result.status;
      usage = result.usage;
      if (result.status === "incomplete") {
        incompleteReason = result.incomplete_details?.reason ?? "unknown";
      }
    }

    if (incompleteReason !== undefined) {
      logValidationDiagnostics({
        stage: "parse",
        jsonParseFailed: false,
        issues: [],
        responseStatus,
        incompleteReason,
      });
      throw new ProviderIncompleteError(incompleteReason);
    }

    // Structured output is requested, never trusted: parse, clamp the v0.7
    // optional objects to their contract caps, Zod-validate, then
    // deterministically enforce the plan.
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawJson);
    } catch {
      logValidationDiagnostics({
        stage: "parse",
        jsonParseFailed: true,
        issues: [],
        responseStatus,
        incompleteReason,
      });
      throw new ProviderValidationError();
    }
    const validated = companionResponseSchema.safeParse(clampStructuredExtras(parsedJson));
    if (!validated.success) {
      logValidationDiagnostics({
        stage: "schema",
        jsonParseFailed: false,
        issues: summarizeZodIssues(validated.error),
        responseStatus,
      });
      throw new ProviderValidationError();
    }
    const response = enforcePlanConstraints(validated.data, plan);

    // The deterministic enforcement layer must itself yield a contract-valid
    // object; prove it before anything is shown or persisted.
    const revalidated = companionResponseSchema.safeParse(response);
    if (!revalidated.success) {
      logValidationDiagnostics({
        stage: "post-enforcement",
        jsonParseFailed: false,
        issues: summarizeZodIssues(revalidated.error),
        responseStatus,
      });
      throw new ProviderValidationError();
    }

    return {
      response,
      metadata: {
        provider: "openai",
        model,
        providerResponseId: responseId,
        inputTokens: usage?.input_tokens,
        outputTokens: usage?.output_tokens,
        totalTokens: usage?.total_tokens,
      },
    };
  }
}
