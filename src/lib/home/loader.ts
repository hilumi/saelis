import { listRecentArrivals } from "@/lib/db/queries/arrivals";
import { getLatestConversationTimestamp } from "@/lib/db/queries/conversations";
import { listHorizonSteps } from "@/lib/db/queries/horizon";
import { listApprovedActiveMemories } from "@/lib/db/queries/memories";
import { getPrivacySettings, getProfile } from "@/lib/db/queries/profile";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Home — the quiet place a signed-in person arrives.
 *
 * The loader reads ONLY the authenticated user's own data, with strict
 * limits, and returns presentation-safe fields: no conversation text, no
 * memory content beyond what the user chose to title, no unapproved or
 * deleted memories, no telemetry, no provider metadata, no mood inference.
 */

export type GreetingPeriod = "early-morning" | "morning" | "afternoon" | "evening" | "night";

/** Device-local, computed client-side after mount (hydration-safe, like the Living Sky). */
export function getGreetingPeriod(date: Date): GreetingPeriod {
  const hours = date.getHours();
  if (hours < 5) return "night";
  if (hours < 8) return "early-morning";
  if (hours < 12) return "morning";
  if (hours < 17) return "afternoon";
  if (hours < 22) return "evening";
  return "night";
}

/** Restrained, time-aware copy. Never infers mood from the clock. */
export const GREETINGS: Record<GreetingPeriod, { title: string; line: string }> = {
  "early-morning": {
    title: "Good morning",
    line: "The day does not need everything from you yet.",
  },
  morning: { title: "Good morning", line: "Come as you are." },
  afternoon: { title: "Good afternoon", line: "We can begin wherever you are." },
  evening: { title: "Good evening", line: "You have carried enough to arrive here." },
  night: { title: "You made it here", line: "There is no rush." },
};

export interface HomeContinuation {
  type: "conversation" | "horizon" | "arrival" | "north-star";
  label: string;
  /** Safe detail only — a user-chosen step title, never message or memory content. */
  detail: string | null;
  href: string;
}

export interface HomeData {
  preferredName: string | null;
  latestArrival: { createdAt: string; supportNeed: string } | null;
  horizon: {
    activeCount: number;
    completedTodayCount: number;
    nextStep: { id: string; title: string; estimatedMinutes: number } | null;
  };
  memories: { constellationCount: number; northStarCount: number };
  hasRecentConversation: boolean;
  privacy: { saveConversationHistory: boolean; allowCompanionMemory: boolean };
  continuation: HomeContinuation | null;
}

const RECENT_CONVERSATION_DAYS = 7;
const RECENT_ARRIVAL_DAYS = 3;

const SUPPORT_NEED_LABELS: Record<string, string> = {
  listen: "someone to listen",
  comfort: "comfort",
  clarify: "clarity",
  decide: "help deciding",
  communicate: "the right words",
  celebrate: "celebration",
  faith: "faith reflection",
  presence: "company",
  "next-step": "one next step",
  stillness: "stillness",
};

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

/** Pure continuation choice — at most one, in the documented priority order. */
export function selectContinuation(input: {
  hasRecentConversation: boolean;
  nextStep: { title: string; estimatedMinutes: number } | null;
  latestArrival: { createdAt: string; supportNeed: string } | null;
  northStarCount: number;
}): HomeContinuation | null {
  if (input.hasRecentConversation) {
    return {
      type: "conversation",
      label: "Continue where you left off.",
      detail: null, // never message text
      href: "/conversation",
    };
  }
  if (input.nextStep) {
    return {
      type: "horizon",
      label: "One step is waiting on your horizon.",
      detail: `${input.nextStep.title} · about ${input.nextStep.estimatedMinutes} minutes`,
      href: "/horizon",
    };
  }
  if (input.latestArrival && daysSince(input.latestArrival.createdAt) <= RECENT_ARRIVAL_DAYS) {
    const need = SUPPORT_NEED_LABELS[input.latestArrival.supportNeed] ?? "support";
    return {
      type: "arrival",
      label: `You arrived here recently looking for ${need}.`,
      detail: null, // never the optional arrival note
      href: "/arrival",
    };
  }
  if (input.northStarCount > 0) {
    return {
      type: "north-star",
      label: "One direction you chose to remember.",
      detail: null, // never the memory content
      href: "/constellations",
    };
  }
  return null;
}

export async function loadHomeData(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<HomeData> {
  const [profile, privacy, steps, memories, arrivals, latestConversationAt] = await Promise.all([
    getProfile(supabase, userId),
    getPrivacySettings(supabase, userId),
    listHorizonSteps(supabase, userId),
    listApprovedActiveMemories(supabase, userId),
    listRecentArrivals(supabase, userId, 1),
    getLatestConversationTimestamp(supabase, userId),
  ]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const incomplete = steps.filter((step) => !step.completed);
  const next = incomplete.at(-1) ?? null; // oldest incomplete step first
  const completedTodayCount = steps.filter(
    (step) => step.completed && step.completed_at && new Date(step.completed_at) >= startOfToday,
  ).length;

  const latestArrivalRow = arrivals[0] ?? null;
  const latestArrival = latestArrivalRow
    ? { createdAt: latestArrivalRow.created_at, supportNeed: latestArrivalRow.support_need }
    : null;

  const hasRecentConversation =
    latestConversationAt !== null && daysSince(latestConversationAt) <= RECENT_CONVERSATION_DAYS;

  const northStarCount = memories.filter((memory) => memory.kind === "north-star").length;

  const data: Omit<HomeData, "continuation"> = {
    preferredName: profile?.preferred_name ?? null,
    latestArrival,
    horizon: {
      activeCount: incomplete.length,
      completedTodayCount,
      nextStep: next
        ? { id: next.id, title: next.title, estimatedMinutes: next.estimated_minutes }
        : null,
    },
    memories: {
      constellationCount: memories.length - northStarCount,
      northStarCount,
    },
    hasRecentConversation,
    privacy: {
      saveConversationHistory: privacy?.save_conversation_history ?? true,
      allowCompanionMemory: privacy?.allow_companion_memory ?? true,
    },
  };

  return {
    ...data,
    continuation: selectContinuation({
      hasRecentConversation,
      nextStep: data.horizon.nextStep,
      latestArrival,
      northStarCount,
    }),
  };
}
