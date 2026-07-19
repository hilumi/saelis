import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import {
  recordNotificationAnalyticsEvent,
  recordSystemAnalyticsEvent,
} from "@/lib/analytics/record";
import {
  claimDelivery,
  hasProactiveDeliveryToday,
  markDeliveryOutcome,
  revokePushToken,
} from "@/lib/db/queries/notifications";
import { buildNotificationContent, NOTIFICATION_DEEP_LINKS } from "@/lib/notifications/copy";
import { sendExpoPush } from "@/lib/notifications/expo-push";
import {
  buildIdempotencyKey,
  decideProactiveSend,
  localDateKey,
  PROACTIVE_CATEGORIES,
} from "@/lib/notifications/policy";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Constant-time bearer comparison. Both sides are hashed to equal-length
 * digests first, so neither content nor length differences shortcut the
 * comparison.
 */
function isAuthorizedCronRequest(header: string | null, secret: string): boolean {
  const presented = createHash("sha256")
    .update(header ?? "")
    .digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(presented, expected);
}

/**
 * GET /api/cron/notifications — proactive companion-notification delivery.
 *
 * Vercel Cron invokes cron paths with HTTP GET, so GET is the primary
 * method (see vercel.json). POST delegates to the same secured handler for
 * deliberate local testing (e.g. curl -X POST). Both are authorized by
 * `Authorization: Bearer ${CRON_SECRET}` (constant-time comparison), the
 * route is disabled (503) until CRON_SECRET is configured, and nothing runs
 * automatically without the scheduler.
 *
 * Idempotent: each proactive send claims a unique idempotency key
 * (user:category:localDate) BEFORE sending; retries and overlapping runs can
 * never double-send. Beta policy (one proactive/day, quiet hours, frequency,
 * send window) is decided by the pure policy module. Bodies come only from
 * the tested copy catalog — never user content.
 */
async function runNotificationDelivery(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "notifications not configured" }, { status: 503 });
  }
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "notifications not configured" }, { status: 503 });
  }

  const now = new Date();
  void recordSystemAnalyticsEvent({ eventName: "notification_job_started", source: "cron" });

  let considered = 0;
  let sent = 0;
  let suppressed = 0;
  let failed = 0;

  try {
    // Users who opted in. Small beta cohort; paginate later if needed.
    const { data: prefRows, error } = await admin
      .from("companion_notification_preferences")
      .select("*")
      .eq("enabled", true)
      .limit(500);
    if (error) throw new Error("preferences query failed");

    for (const prefs of prefRows ?? []) {
      considered += 1;
      const dateKey = localDateKey(now, prefs.timezone);

      const alreadySentToday = await hasProactiveDeliveryToday(
        admin,
        prefs.user_id,
        dateKey,
        PROACTIVE_CATEGORIES,
      );
      const decision = decideProactiveSend({ prefs, now, alreadySentToday });
      if (!decision.send || !decision.category) {
        if (decision.reason !== "outside_window" && decision.reason !== "disabled") {
          suppressed += 1;
          void recordNotificationAnalyticsEvent(admin, prefs.user_id, "notification_suppressed", {
            notification_category: decision.category ?? "none",
            suppression_reason: decision.reason,
          });
        }
        continue;
      }

      // Claim BEFORE sending — the unique key makes retries safe.
      const claim = await claimDelivery(admin, {
        userId: prefs.user_id,
        category: decision.category,
        idempotencyKey: buildIdempotencyKey(prefs.user_id, decision.category, dateKey),
      });
      if (!claim.claimed || !claim.deliveryId) continue;

      const { data: tokens } = await admin
        .from("push_tokens")
        .select("*")
        .eq("user_id", prefs.user_id)
        .is("revoked_at", null);
      if (!tokens || tokens.length === 0) {
        await markDeliveryOutcome(admin, claim.deliveryId, {
          sent: false,
          providerStatus: "no_active_token",
          tokenExpired: false,
        });
        failed += 1;
        continue;
      }

      const content = buildNotificationContent(decision.category, prefs.preview_mode, dateKey);
      let anyOk = false;
      let lastStatus = "unknown";
      let tokenExpired = false;
      for (const token of tokens) {
        const outcome = await sendExpoPush({
          to: token.token,
          title: content.title,
          body: content.body,
          data: { url: NOTIFICATION_DEEP_LINKS[decision.category], category: decision.category },
        });
        lastStatus = outcome.status;
        if (outcome.status === "ok") anyOk = true;
        if (outcome.tokenExpired) {
          tokenExpired = true;
          await revokePushToken(admin, token.id);
        }
      }

      await markDeliveryOutcome(admin, claim.deliveryId, {
        sent: anyOk,
        providerStatus: anyOk ? "ok" : lastStatus,
        tokenExpired,
      });
      if (anyOk) {
        sent += 1;
        void recordNotificationAnalyticsEvent(admin, prefs.user_id, "notification_delivered", {
          notification_category: decision.category,
        });
      } else {
        failed += 1;
        void recordNotificationAnalyticsEvent(admin, prefs.user_id, "notification_failed", {
          notification_category: decision.category,
        });
      }
    }

    void recordSystemAnalyticsEvent({ eventName: "notification_job_completed", source: "cron" });
    return NextResponse.json({ ok: true, considered, sent, suppressed, failed });
  } catch {
    void recordSystemAnalyticsEvent({ eventName: "notification_job_failed", source: "cron" });
    return NextResponse.json({ error: "delivery run failed" }, { status: 500 });
  }
}

/** Primary method — Vercel Cron invokes cron paths with GET. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return runNotificationDelivery(request);
}

/** Retained for deliberate local testing only; same secured handler. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return runNotificationDelivery(request);
}
