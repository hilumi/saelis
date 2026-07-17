import "server-only";

import { checkRateLimit } from "@/lib/rate-limit";
import { analyticsFlags, ANALYTICS_RATE_LIMIT, dayBucket } from "@/lib/analytics/config";
import { validateAnalyticsEvent, type ValidatedAnalyticsEvent } from "@/lib/analytics/schemas";
import {
  CLIENT_SOURCES,
  SERVER_ONLY_EVENTS,
  toSafetyReasonCategory,
  type AnalyticsEventName,
  type AnalyticsSource,
} from "@/lib/analytics/taxonomy";
import { getPrivacySettings } from "@/lib/db/queries/profile";
import { createAdminClient } from "@/lib/supabase/admin";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { SafetyEngineTier } from "@/lib/wellness/safety/engine";
import type { PathwayKey } from "@/lib/wellness/pathways/types";

type Client = SupabaseClient<Database>;

/**
 * Saelis Her — server-side analytics recording service (Phase 6).
 *
 * ALL analytics writes go through this module. The analytics tables are
 * deny-by-default (RLS enabled, zero policies), so only the server-only
 * service-role client can write — clients can never insert events directly.
 *
 * Guarantees:
 *  - identity is server-derived; any caller-supplied user id is ignored
 *  - user-linked wellness events are recorded ONLY when the user's privacy
 *    settings allow product analytics (the repository's opt-in rule)
 *  - server-authoritative events (safety, notifications, system, jobs) are
 *    rejected for client-originated sources
 *  - every payload passes the strict Zod allowlist in ./schemas.ts
 *  - failures never throw and never break a user workflow; they are logged
 *    content-free, and repeated systemic failures escalate to a warning
 */

export interface RecordEventInput {
  eventName: AnalyticsEventName;
  source?: AnalyticsSource;
  pathwayKeys?: readonly PathwayKey[];
  route?: string | null;
  metadata?: Record<string, string | number | boolean>;
  occurredAt?: string;
  /** Optional in-memory dedupe key (single-instance best effort). */
  dedupeKey?: string;
}

export type RecordEventResult = { recorded: true } | { recorded: false; reason: string };

// Content-free operational logging with systemic-failure escalation.
let consecutiveFailures = 0;
const FAILURE_ESCALATION_THRESHOLD = 10;

function logAnalyticsFailure(reason: string): void {
  if (process.env.NODE_ENV === "test") return;
  consecutiveFailures += 1;
  console.info("[analytics]", JSON.stringify({ outcome: "failed", reason }));
  if (consecutiveFailures >= FAILURE_ESCALATION_THRESHOLD) {
    console.warn(
      "[analytics]",
      JSON.stringify({ outcome: "systemic_failure", consecutiveFailures }),
    );
    consecutiveFailures = 0;
  }
}

function logAnalyticsSuccess(): void {
  consecutiveFailures = 0;
}

// Best-effort in-memory dedupe (single instance — same documented limitation
// as the rate limiter). Keys expire after 24h.
const recentDedupeKeys = new Map<string, number>();
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;

function isDuplicate(key: string): boolean {
  const now = Date.now();
  if (recentDedupeKeys.size > 5000) {
    for (const [k, at] of recentDedupeKeys) {
      if (now - at > DEDUPE_TTL_MS) recentDedupeKeys.delete(k);
    }
  }
  const seen = recentDedupeKeys.get(key);
  if (seen != null && now - seen < DEDUPE_TTL_MS) return true;
  recentDedupeKeys.set(key, now);
  return false;
}

/** Test hook. */
export function resetAnalyticsDedupeForTests(): void {
  recentDedupeKeys.clear();
  consecutiveFailures = 0;
}

function adminClientOrNull(): Client | null {
  try {
    return createAdminClient();
  } catch {
    // No SUPABASE_SECRET_KEY in this environment — analytics is a no-op.
    return null;
  }
}

async function insertEvent(event: ValidatedAnalyticsEvent): Promise<RecordEventResult> {
  const admin = adminClientOrNull();
  if (!admin) return { recorded: false, reason: "analytics_unconfigured" };
  const { error } = await admin.from("analytics_events").insert(event);
  if (error) {
    logAnalyticsFailure("insert_failed");
    return { recorded: false, reason: "insert_failed" };
  }
  logAnalyticsSuccess();
  return { recorded: true };
}

/**
 * Core recorder. `userId` MUST come from the server session (or be null for
 * system events) — it is the only identity ever written.
 */
export async function recordAnalyticsEvent(
  userId: string | null,
  input: RecordEventInput,
): Promise<RecordEventResult> {
  try {
    if (!analyticsFlags().eventIngestionEnabled) {
      return { recorded: false, reason: "ingestion_disabled" };
    }

    const source = input.source ?? "server";

    // Server-authoritative events can never arrive from a client source.
    if (SERVER_ONLY_EVENTS.has(input.eventName) && CLIENT_SOURCES.includes(source)) {
      logAnalyticsFailure("server_only_event_from_client");
      return { recorded: false, reason: "server_only_event" };
    }

    // Abuse protection: per-user recording limit.
    if (userId) {
      const limit = checkRateLimit(`analytics:${userId}`, ANALYTICS_RATE_LIMIT);
      if (!limit.allowed) return { recorded: false, reason: "rate_limited" };
    }

    if (input.dedupeKey && isDuplicate(input.dedupeKey)) {
      return { recorded: false, reason: "duplicate" };
    }

    const validated = validateAnalyticsEvent({
      eventName: input.eventName,
      occurredAt: input.occurredAt,
      userId,
      pathwayKeys: input.pathwayKeys ?? [],
      source,
      route: input.route ?? null,
      metadata: input.metadata ?? {},
    });
    if (!validated.ok) {
      logAnalyticsFailure(validated.reason);
      return { recorded: false, reason: validated.reason };
    }

    return await insertEvent(validated.event);
  } catch {
    logAnalyticsFailure("unexpected");
    return { recorded: false, reason: "unexpected" };
  }
}

/**
 * User-linked recording with the repository's opt-in rule: the event is
 * written only when the user's privacy settings allow product analytics.
 * `supabase` is the user's RLS session client (for the settings read);
 * `userId` is the server-derived identity from requireUser().
 */
export async function recordAuthenticatedAnalyticsEvent(
  supabase: Client,
  userId: string,
  input: RecordEventInput,
): Promise<RecordEventResult> {
  try {
    const settings = await getPrivacySettings(supabase, userId);
    if (!settings?.allow_product_analytics) {
      return { recorded: false, reason: "analytics_not_allowed" };
    }
    return await recordAnalyticsEvent(userId, input);
  } catch {
    return { recorded: false, reason: "unexpected" };
  }
}

/** System/operational events — never user-linked. */
export async function recordSystemAnalyticsEvent(
  input: Omit<RecordEventInput, "source"> & {
    source?: Extract<
      AnalyticsSource,
      "server" | "cron" | "notification_worker" | "migration" | "test"
    >;
  },
): Promise<RecordEventResult> {
  return recordAnalyticsEvent(null, { ...input, source: input.source ?? "server" });
}

/** Notification analytics — recorded by server/worker code only. */
export async function recordNotificationAnalyticsEvent(
  supabase: Client,
  userId: string,
  eventName: Extract<
    AnalyticsEventName,
    | "notification_scheduled"
    | "notification_delivered"
    | "notification_opened"
    | "notification_dismissed"
    | "notification_suppressed"
    | "notification_failed"
  >,
  metadata: { notification_category: string; suppression_reason?: string },
): Promise<RecordEventResult> {
  return recordAuthenticatedAnalyticsEvent(supabase, userId, {
    eventName,
    source: "notification_worker",
    metadata,
  });
}

/**
 * Safety analytics from the deterministic engine's output ONLY. Records the
 * tier event with a single broad reason category, the affected module, active
 * pathway keys, and a day bucket — never a symptom, never free text.
 */
export async function recordSafetyAnalyticsEvent(
  supabase: Client,
  userId: string,
  safety: { tier: SafetyEngineTier; reasonCodes: readonly string[] },
  pathwayKeys: readonly PathwayKey[],
  planDate: string,
): Promise<RecordEventResult> {
  const tierEvent = `safety_tier_${safety.tier}` as AnalyticsEventName;
  const reasonCategory = toSafetyReasonCategory(safety.reasonCodes[0] ?? "no_concerns");
  const moduleAffected =
    safety.tier === "urgent_support"
      ? "all"
      : safety.tier === "hold_and_contact_professional" || safety.tier === "recovery_only"
        ? "movement"
        : "none";
  return recordAuthenticatedAnalyticsEvent(supabase, userId, {
    eventName: tierEvent,
    source: "server",
    pathwayKeys,
    metadata: {
      reason_category: reasonCategory,
      module_affected: moduleAffected,
      day_bucket: dayBucket(`${planDate}T00:00:00.000Z`),
    },
    // One safety-tier event per user per day per tier.
    dedupeKey: `safety:${userId}:${planDate}:${safety.tier}`,
  });
}

// --- Job runs ---------------------------------------------------------------

export async function recordJobRun(
  jobKey: string,
  metadata: Record<string, string | number | boolean> = {},
): Promise<string | null> {
  try {
    const admin = adminClientOrNull();
    if (!admin) return null;
    const { data, error } = await admin
      .from("analytics_job_runs")
      .insert({
        job_key: jobKey,
        started_at: new Date().toISOString(),
        status: "running",
        metadata,
      })
      .select("id")
      .single();
    if (error) {
      logAnalyticsFailure("job_run_insert_failed");
      return null;
    }
    return data.id;
  } catch {
    logAnalyticsFailure("unexpected");
    return null;
  }
}

export async function completeJobRun(
  jobRunId: string | null,
  counts: { processed?: number; succeeded?: number; failed?: number } = {},
): Promise<void> {
  if (!jobRunId) return;
  try {
    const admin = adminClientOrNull();
    if (!admin) return;
    const failed = counts.failed ?? 0;
    await admin
      .from("analytics_job_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: failed > 0 ? "partial" : "completed",
        processed_count: counts.processed ?? null,
        success_count: counts.succeeded ?? null,
        failure_count: failed,
      })
      .eq("id", jobRunId);
  } catch {
    logAnalyticsFailure("unexpected");
  }
}

export async function failJobRun(jobRunId: string | null, errorCategory: string): Promise<void> {
  if (!jobRunId) return;
  try {
    const admin = adminClientOrNull();
    if (!admin) return;
    // Broad category only — never a raw error body or stack trace.
    await admin
      .from("analytics_job_runs")
      .update({
        completed_at: new Date().toISOString(),
        status: "failed",
        error_category: errorCategory.slice(0, 60),
      })
      .eq("id", jobRunId);
  } catch {
    logAnalyticsFailure("unexpected");
  }
}
