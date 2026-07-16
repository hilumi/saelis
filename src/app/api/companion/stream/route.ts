import { companionResponseSchema, type CompanionResponse } from "@/lib/ai/companion-contract";
import { enforcePlanConstraints } from "@/lib/ai/plan-enforcement";
import { getCompanionProvider, supportsStreaming } from "@/lib/ai/provider";
import { ProviderError } from "@/lib/ai/provider-errors";
import { URGENT_RESPONSE_MESSAGE } from "@/lib/ai/safety";
import { toCompanionPreferences } from "@/lib/companion-defaults";
import { COMPANION_MAX_BODY_BYTES } from "@/lib/constants";
import {
  createCoreAssessment,
  enrichLightPlan,
  extractExplicitObservations,
  isHumorCorrection,
  resolveOptedOutThemes,
} from "@/lib/core";
import {
  listAdaptivePreferences,
  listPatternHypotheses,
  recordAdaptationCorrection,
  recordAdaptiveObservation,
  recordPatternEvidence,
} from "@/lib/db/queries/adaptation";
import { listRecentArrivals } from "@/lib/db/queries/arrivals";
import {
  createConversation,
  getConversation,
  getRecentTurns,
  saveTurn,
} from "@/lib/db/queries/conversations";
import { listApprovedActiveMemories, markMemoriesUsedNow } from "@/lib/db/queries/memories";
import { getCompanionProfile, getPrivacySettings } from "@/lib/db/queries/profile";
import { beginGeneration, endGeneration } from "@/lib/idempotency";
import { createLightPlan, LightContextError } from "@/lib/light";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { hashUserRef, logCompanionEvent } from "@/lib/telemetry";
import { companionStreamRequestSchema } from "@/lib/validation/companion";

import type { ProviderMetadata } from "@/lib/ai/companion-openai";
import type { AdaptivePreference, PatternHypothesis } from "@/lib/core";
import type { LightContext, LightPlan } from "@/lib/light";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const CALM_ERROR = "Saelis had trouble responding just now. Nothing you wrote was lost.";

/** Friendly, deterministic adaptation-notice summaries per preference key. */
const ADAPTATION_NOTICES: Partial<Record<string, string>> = {
  "prefers-concise-when-overwhelmed":
    "Saelis will keep responses shorter. You can change this any time in Settings.",
  "appreciates-direct-challenge":
    "Saelis will be more direct with you. You can change this any time in Settings.",
  "prefers-no-emojis": "Saelis will stop using emojis. You can change this any time in Settings.",
  "prefers-examples": "Saelis will lean on examples. You can change this any time in Settings.",
  "prefers-options-before-recommendation":
    "Saelis will offer options before recommendations. You can change this any time in Settings.",
  "likes-bullet-points":
    "Saelis will use short lists when they help. You can change this any time in Settings.",
};

/** Content-free evidence summaries per conversation purpose. */
function patternEvidenceSummary(purpose: string): string {
  return `Noticed during a ${purpose.replace(/-/g, " ")} moment in conversation.`;
}

/**
 * Post-response adaptation policy — deterministic, server-side, optional.
 * Explicit user statements (and only those) update adaptive preferences;
 * screened insight candidates become working pattern evidence. Every write
 * goes through the bounded database functions. Failures never interrupt the
 * conversation.
 */
async function applyPostResponseAdaptation(input: {
  supabase: SupabaseClient<Database>;
  message: string;
  safetyLevel: "none" | "support" | "urgent";
  purpose: string;
  response: CompanionResponse;
  adaptivePreferences: AdaptivePreference[];
  patternHypotheses: PatternHypothesis[];
}): Promise<CompanionResponse> {
  const { supabase, message, safetyLevel, purpose, adaptivePreferences } = input;
  let response = input.response;

  try {
    // 1. Explicit communication-preference observations.
    const observations = extractExplicitObservations(message, safetyLevel);
    for (const observation of observations) {
      await recordAdaptiveObservation(supabase, observation.key, observation.value, true);
    }
    const first = observations[0];
    if (first && ADAPTATION_NOTICES[first.key]) {
      response = {
        ...response,
        adaptationNotice: {
          summary: ADAPTATION_NOTICES[first.key] as string,
          preferenceKey: first.key,
        },
      };
    }

    // 2. Humor correction ("that joke didn't land") lowers humor confidence.
    if (isHumorCorrection(message)) {
      const humorPreference = adaptivePreferences.find(
        (preference) => preference.key === "enjoys-playful-humor",
      );
      if (humorPreference) {
        await recordAdaptationCorrection(supabase, humorPreference.id);
      }
    }

    // 3. Screened insight candidates become working-hypothesis evidence.
    //    (Wording, theme, safety, and eligibility were already enforced
    //    deterministically in plan enforcement; theme opt-outs apply here.)
    if (response.insightCandidate) {
      const optedOut = resolveOptedOutThemes(adaptivePreferences);
      if (optedOut.includes(response.insightCandidate.theme)) {
        response = { ...response, insightCandidate: null };
      } else {
        // Cross-domain: this theme already has evidence, and none of it came
        // from the same kind of moment (deterministic, summary-based).
        const summary = patternEvidenceSummary(purpose);
        const existing = input.patternHypotheses.find(
          (hypothesis) =>
            hypothesis.theme === response.insightCandidate?.theme &&
            (hypothesis.status === "working" || hypothesis.status === "reviewable"),
        );
        const crossDomain =
          existing !== undefined &&
          !existing.evidence.some((reference) => reference.summary === summary);
        await recordPatternEvidence(supabase, {
          theme: response.insightCandidate.theme,
          observation: response.insightCandidate.observation,
          uncertainty: response.insightCandidate.uncertaintyStatement,
          sourceType: "conversation",
          summary,
          crossDomain,
        });
      }
    }
  } catch {
    // Adaptation is strictly optional — never let it break a conversation.
  }

  return response;
}

function json(body: unknown, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/**
 * POST /api/companion/stream — Server-Sent Events companion endpoint.
 *
 * Protocol (documented in docs/03-engineering/streaming-protocol.md):
 *   event: start     data: {"requestId":"..."}
 *   event: delta     data: {"text":"..."}
 *   event: complete  data: {"conversationId":..., "response":{...}, "lightState":"..."}
 *   event: error     data: {"code":"...","message":"...","retryable":true}
 *
 * Transaction policy: NOTHING is persisted until the final structured
 * response validates. On success, the user turn and assistant turn are saved
 * together (history permitting). On failure or abort, nothing is saved and
 * the client keeps the draft — no incomplete assistant turn can ever exist.
 */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return json(
      { error: "Saelis isn't fully set up on this server yet. Please try again later." },
      503,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json({ error: "Please sign in to talk with Saelis." }, 401);
  }

  const minuteRate = checkRateLimit(`companion:${user.id}`, { limit: 20, windowMs: 60_000 });
  const hourRate = checkRateLimit(`companion-hour:${user.id}`, {
    limit: 150,
    windowMs: 3_600_000,
  });
  if (!minuteRate.allowed || !hourRate.allowed) {
    const retryAfter = Math.max(minuteRate.retryAfterSeconds, hourRate.retryAfterSeconds);
    return json({ error: "Saelis needs a brief pause before responding again." }, 429, {
      "Retry-After": String(retryAfter),
    });
  }

  const rawBody = await request.text();
  if (rawBody.length > COMPANION_MAX_BODY_BYTES) {
    return json({ error: "That message is too large for one turn." }, 413);
  }
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return json({ error: "That request couldn't be read." }, 400);
  }
  const parsed = companionStreamRequestSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return json({ error: "That request didn't look right." }, 400);
  }
  const input = parsed.data;

  // Idempotency + one active generation per user.
  const begin = beginGeneration(user.id, input.requestId);
  if (!begin.ok) {
    return json(
      {
        error:
          begin.reason === "duplicate"
            ? "That message is already on its way."
            : "One moment — Saelis is still finishing the last thought.",
      },
      409,
    );
  }

  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      endGeneration(user.id, input.requestId);
    }
  };

  try {
    let conversationId = input.conversationId;
    if (conversationId) {
      const conversation = await getConversation(supabase, user.id, conversationId);
      if (!conversation) {
        release();
        return json({ error: "That conversation wasn't found." }, 404);
      }
    }

    const [companionProfile, privacy] = await Promise.all([
      getCompanionProfile(supabase, user.id),
      getPrivacySettings(supabase, user.id),
    ]);
    const allowMemory = privacy?.allow_companion_memory ?? true;
    const saveHistory = privacy?.save_conversation_history ?? true;
    const preferences = toCompanionPreferences(companionProfile);
    // Adaptation aligns with existing consent: the explicit adaptive-learning
    // setting AND companion memory must both be on.
    const adaptationEnabled = preferences.adaptiveLearningEnabled && allowMemory;

    const [memories, recentTurns, recentArrivals, adaptivePreferences, patternHypotheses] =
      await Promise.all([
        allowMemory ? listApprovedActiveMemories(supabase, user.id) : Promise.resolve([]),
        conversationId ? getRecentTurns(supabase, user.id, conversationId) : Promise.resolve([]),
        listRecentArrivals(supabase, user.id, 1),
        adaptationEnabled
          ? listAdaptivePreferences(supabase, user.id).catch(() => [])
          : Promise.resolve([]),
        adaptationEnabled
          ? listPatternHypotheses(supabase, user.id).catch(() => [])
          : Promise.resolve([]),
      ]);
    const latestArrival = recentArrivals[0];

    const lightContext: LightContext = {
      userId: user.id,
      message: input.message,
      recentTurns: recentTurns
        .filter((turn) => turn.role !== "system")
        .map((turn) => ({ role: turn.role as "user" | "assistant", content: turn.content })),
      companionProfile: preferences,
      approvedMemories: memories.map((memory) => ({
        category: memory.category,
        content: memory.content,
      })),
      latestArrival: latestArrival
        ? {
            mood: latestArrival.mood,
            energy: latestArrival.energy,
            supportNeed: latestArrival.support_need,
            includeFaithReflection: latestArrival.include_faith_reflection,
          }
        : undefined,
      privacy: { saveConversationHistory: saveHistory, allowCompanionMemory: allowMemory },
    };

    let plan: LightPlan;
    try {
      plan = createLightPlan(lightContext);
    } catch (error) {
      release();
      if (error instanceof LightContextError) {
        return json({ error: error.message }, 400);
      }
      throw error;
    }

    // Saelis Core: read the room and enrich the LightPlan (deterministic;
    // urgent-safety plans pass through untouched).
    const coreAssessment = createCoreAssessment({
      message: lightContext.message,
      recentTurns: lightContext.recentTurns,
      understanding: plan.understanding,
      humorSetting: preferences.humorLevel,
      toneSetting: preferences.tonePreference,
      adaptiveLearningEnabled: adaptationEnabled,
      adaptivePreferences,
    });
    plan = enrichLightPlan(plan, coreAssessment);

    // Abort plumbing: browser disconnect or explicit stop cancels generation.
    const abortController = new AbortController();
    request.signal.addEventListener("abort", () => abortController.abort());

    const encoder = new TextEncoder();
    const startedAt = Date.now();

    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        const persist = async (response: CompanionResponse): Promise<string | null> => {
          if (!saveHistory) return conversationId ?? null;
          if (!conversationId) {
            const conversation = await createConversation(supabase, user.id);
            conversationId = conversation.id;
          }
          await saveTurn(supabase, {
            conversation_id: conversationId,
            user_id: user.id,
            role: "user",
            content: input.message,
          });
          await saveTurn(supabase, {
            conversation_id: conversationId,
            user_id: user.id,
            role: "assistant",
            content: response.message,
            support_mode: response.supportMode,
            closing_line: response.closingLine,
          });
          return conversationId;
        };

        try {
          send("start", { requestId: input.requestId });

          let response: CompanionResponse;
          let metadata: ProviderMetadata | undefined;

          if (plan.understanding.safetyLevel === "urgent") {
            // Urgent safety bypasses ordinary generation entirely.
            response = {
              supportMode: "presence",
              message: URGENT_RESPONSE_MESSAGE,
              followUp: null,
              closingLine: null,
              suggestedStep: null,
              proposedMemory: null,
              safety: { level: "urgent", message: URGENT_RESPONSE_MESSAGE },
            };
            send("delta", { text: response.message });
            logCompanionEvent({
              requestId: input.requestId,
              userRef: hashUserRef(user.id),
              provider: "light-engine",
              outcome: "urgent-bypass",
              safetyLevel: "urgent",
              latencyMs: Date.now() - startedAt,
            });
          } else {
            const provider = getCompanionProvider();
            const companionRequest = {
              userId: user.id,
              conversationId: conversationId ?? null,
              message: input.message,
              includeFaithReflection: input.includeFaithReflection,
              supportHint: input.supportHint,
              preferences: lightContext.companionProfile,
              approvedMemories: plan.memory.mayUseApprovedMemories
                ? lightContext.approvedMemories
                : [],
              recentTurns: lightContext.recentTurns,
            };

            if (supportsStreaming(provider)) {
              const result = await provider.respondStream(companionRequest, plan, {
                signal: abortController.signal,
                onDelta: (text) => send("delta", { text }),
              });
              response = result.response;
              metadata = result.metadata;
            } else {
              // Mock (and any non-streaming provider): validate, then apply
              // the full deterministic plan enforcement (closing policy,
              // Saelis Core content rules), then emit one delta.
              const providerResponse = await provider.respond(companionRequest, plan);
              const validated = companionResponseSchema.safeParse(providerResponse);
              if (!validated.success) {
                throw new ProviderError(
                  "provider-validation",
                  "I couldn't meet you clearly in that moment. Please try once more.",
                );
              }
              response = enforcePlanConstraints(validated.data, plan);
              send("delta", { text: response.message });
            }

            logCompanionEvent({
              requestId: input.requestId,
              userRef: hashUserRef(user.id),
              provider: metadata?.provider ?? "mock",
              model: metadata?.model,
              outcome: "success",
              latencyMs: Date.now() - startedAt,
              inputTokens: metadata?.inputTokens,
              outputTokens: metadata?.outputTokens,
              supportMode: response.supportMode,
              safetyLevel: response.safety.level,
              retryCount: metadata?.retryCount,
            });
          }

          // Saelis Core adaptation policy: explicit observations, humor
          // corrections, and screened pattern evidence. Strictly optional;
          // provider output never persists anything directly.
          if (plan.understanding.safetyLevel !== "urgent" && adaptationEnabled) {
            response = await applyPostResponseAdaptation({
              supabase,
              message: input.message,
              safetyLevel: plan.understanding.safetyLevel,
              purpose: plan.understanding.purpose,
              response,
              adaptivePreferences,
              patternHypotheses,
            });
          }

          // Transparency, never engagement data: note when approved memories
          // actually accompanied a successful request.
          const memoriesUsed =
            plan.understanding.safetyLevel === "urgent" || !plan.memory.mayUseApprovedMemories
              ? 0
              : memories.length;
          if (memoriesUsed > 0) {
            await markMemoriesUsedNow(
              supabase,
              user.id,
              memories.map((memory) => memory.id),
            );
          }

          // Persist ONLY after full validation — never an incomplete turn,
          // and never a proposed memory (that requires user approval).
          const persistedConversationId = await persist(response);

          send("complete", {
            conversationId: persistedConversationId,
            response,
            memoriesUsed,
            lightState: plan.reflection.suggestedLightState,
            // Limited metadata for the development diagnostics panel only.
            ...(process.env.NODE_ENV === "development" && metadata
              ? { metadata: { latencyMs: metadata.latencyMs, retryCount: metadata.retryCount } }
              : {}),
          });
        } catch (error) {
          if (abortController.signal.aborted) {
            // Quiet close — the UI returns to a ready state; nothing saved.
            logCompanionEvent({
              requestId: input.requestId,
              userRef: hashUserRef(user.id),
              provider: "unknown",
              outcome: "aborted",
              latencyMs: Date.now() - startedAt,
            });
          } else {
            const providerError = error instanceof ProviderError ? error : null;
            logCompanionEvent({
              requestId: input.requestId,
              userRef: hashUserRef(user.id),
              provider: "unknown",
              outcome: "error",
              errorCode: providerError?.code ?? "unknown",
              latencyMs: Date.now() - startedAt,
            });
            send("error", {
              code: providerError?.code ?? "unknown",
              message: providerError?.publicMessage || CALM_ERROR,
              retryable: providerError?.retryable ?? true,
            });
          }
        } finally {
          release();
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      },
      cancel: () => {
        abortController.abort();
        release();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    release();
    console.error("companion stream error:", error instanceof Error ? error.name : "unknown");
    return json({ error: CALM_ERROR }, 500);
  }
}
