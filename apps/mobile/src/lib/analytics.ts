import { getSaelisApi } from "@/lib/api/saelis";

/**
 * Client-originated analytics — best effort, content-free, consent-enforced
 * SERVER-side (allow_product_analytics). Only the allowlisted companion-
 * experience event names exist here; anything else is rejected by the server.
 * Never conversation content, memory text, or any sensitive metadata.
 */

export type ClientAnalyticsEvent =
  | "notification_permission_prompted"
  | "notification_permission_denied"
  | "conversation_starter_used"
  | "memory_enabled"
  | "memory_disabled"
  | "memory_deleted"
  | "temporary_mode_enabled";

export function trackEvent(
  eventName: ClientAnalyticsEvent,
  metadata?: Record<string, string | number | boolean>,
): void {
  // Fire and forget: analytics must never affect the experience.
  void getSaelisApi()
    .requestJson("/api/analytics/events", { method: "POST", body: { eventName, metadata } })
    .catch(() => undefined);
}
