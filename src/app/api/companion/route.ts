import { NextResponse } from "next/server";

import { companionResponseSchema, type CompanionResponse } from "@/lib/ai/companion-contract";
import { getCompanionProvider } from "@/lib/ai/provider";
import { URGENT_RESPONSE_MESSAGE } from "@/lib/ai/safety";
import { toCompanionPreferences } from "@/lib/companion-defaults";
import { COMPANION_MAX_BODY_BYTES } from "@/lib/constants";
import { listRecentArrivals } from "@/lib/db/queries/arrivals";
import {
  createConversation,
  getConversation,
  getRecentTurns,
  saveTurn,
} from "@/lib/db/queries/conversations";
import { listApprovedActiveMemories } from "@/lib/db/queries/memories";
import { getCompanionProfile, getPrivacySettings } from "@/lib/db/queries/profile";
import { createLightPlan, LightContextError } from "@/lib/light";
import { checkRateLimit } from "@/lib/rate-limit";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { companionRequestSchema } from "@/lib/validation/companion";

import type { LightContext } from "@/lib/light";

export const dynamic = "force-dynamic";

const CALM_ERROR = "Saelis had trouble responding just now. Nothing you wrote was lost.";

/**
 * POST /api/companion — the single companion endpoint.
 *
 * The Light Engine sits between this route and every provider:
 *  1. authenticate (server session — client-supplied IDs are never trusted)
 *  2. rate-limit (in-memory; NOT sufficient for multi-instance production)
 *  3. enforce request-size limit, parse and validate with Zod
 *  4. load companion profile, privacy settings, approved memories, recent
 *     turns, and the latest arrival
 *  5. build a LightContext and run createLightPlan (safety pre-check,
 *     understanding, reflection, memory policy, prompt composition, closing)
 *  6. URGENT SAFETY: return the crisis response directly — the ordinary
 *     provider is never called
 *  7. otherwise call the configured provider with the request AND the plan
 *  8. validate the provider response against the contract
 *  9. apply the closing-line policy
 * 10. persist turns only if privacy allows; NEVER persist a proposed memory
 */
export async function POST(request: Request) {
  try {
    if (!hasSupabaseEnv()) {
      return NextResponse.json(
        { error: "Saelis isn't fully set up on this server yet. Please try again later." },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in to talk with Saelis." }, { status: 401 });
    }

    const rate = checkRateLimit(`companion:${user.id}`, { limit: 20, windowMs: 60_000 });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "You're moving quickly — give it a short moment and try again." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > COMPANION_MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "That message is too large for one turn." },
        { status: 413 },
      );
    }
    const rawBody = await request.text();
    if (rawBody.length > COMPANION_MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "That message is too large for one turn." },
        { status: 413 },
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "That request couldn't be read." }, { status: 400 });
    }

    const parsed = companionRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "That request didn't look right." }, { status: 400 });
    }
    const input = parsed.data;

    // Verify conversation ownership when one is referenced.
    let conversationId = input.conversationId;
    if (conversationId) {
      const conversation = await getConversation(supabase, user.id, conversationId);
      if (!conversation) {
        return NextResponse.json({ error: "That conversation wasn't found." }, { status: 404 });
      }
    }

    const [companionProfile, privacy] = await Promise.all([
      getCompanionProfile(supabase, user.id),
      getPrivacySettings(supabase, user.id),
    ]);
    const allowMemory = privacy?.allow_companion_memory ?? true;
    const saveHistory = privacy?.save_conversation_history ?? true;

    const [memories, recentTurns, recentArrivals] = await Promise.all([
      allowMemory ? listApprovedActiveMemories(supabase, user.id) : Promise.resolve([]),
      conversationId ? getRecentTurns(supabase, user.id, conversationId) : Promise.resolve([]),
      listRecentArrivals(supabase, user.id, 1),
    ]);
    const latestArrival = recentArrivals[0];

    // Build the Light Engine context. Only user-approved, active memories are
    // ever supplied, and the engine drops them again if memory is disabled.
    const lightContext: LightContext = {
      userId: user.id,
      message: input.message,
      recentTurns: recentTurns
        .filter((turn) => turn.role !== "system")
        .map((turn) => ({ role: turn.role as "user" | "assistant", content: turn.content })),
      companionProfile: toCompanionPreferences(companionProfile),
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
      privacy: {
        saveConversationHistory: saveHistory,
        allowCompanionMemory: allowMemory,
      },
    };

    let plan;
    try {
      plan = createLightPlan(lightContext);
    } catch (error) {
      if (error instanceof LightContextError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    let response: CompanionResponse;

    if (plan.understanding.safetyLevel === "urgent") {
      // Urgent safety interrupts ordinary companionship entirely: the
      // provider is not called, no memory is proposed, no closing line.
      response = {
        supportMode: "presence",
        message: URGENT_RESPONSE_MESSAGE,
        followUp: null,
        closingLine: null,
        suggestedStep: null,
        proposedMemory: null,
        safety: { level: "urgent", message: URGENT_RESPONSE_MESSAGE },
      };
    } else {
      const provider = getCompanionProvider();
      const providerResponse = await provider.respond(
        {
          userId: user.id,
          conversationId,
          message: input.message,
          includeFaithReflection: input.includeFaithReflection,
          supportHint: input.supportHint,
          preferences: lightContext.companionProfile,
          approvedMemories: plan.memory.mayUseApprovedMemories ? lightContext.approvedMemories : [],
          recentTurns: lightContext.recentTurns,
        },
        plan,
      );

      const validated = companionResponseSchema.safeParse(providerResponse);
      if (!validated.success) {
        // Log the failure shape only — never response content.
        console.error("companion provider returned an invalid response");
        return NextResponse.json({ error: CALM_ERROR }, { status: 502 });
      }
      response = validated.data;

      // Closing-line policy: closings are earned, not appended to everything.
      if (plan.closingPolicy.context === "no-closing") {
        response = { ...response, closingLine: null };
      } else if (!response.closingLine && plan.closingPolicy.line) {
        response = { ...response, closingLine: plan.closingPolicy.line };
      }
    }

    if (saveHistory) {
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
    }

    // IMPORTANT: response.proposedMemory is returned to the client for the
    // user to accept or decline. It is NEVER saved here.
    return NextResponse.json({
      conversationId,
      response,
      lightState: plan.reflection.suggestedLightState,
    });
  } catch (error) {
    // Log error type only — routine logs must not contain message content.
    console.error("companion route error:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: CALM_ERROR }, { status: 500 });
  }
}
