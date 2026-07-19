import { getSaelisApi } from "@/lib/api/saelis";

/**
 * Notification preferences over the authenticated server API (camelCase API
 * shape; the server owns storage and validation).
 */

export interface NotificationPreferences {
  enabled: boolean;
  gentleCheckIns: boolean;
  wellnessReminders: boolean;
  eveningReflections: boolean;
  userReminders: boolean;
  preferredTimeMinutes: number;
  timezone: string;
  quietHoursStartMinutes: number;
  quietHoursEndMinutes: number;
  previewMode: "private" | "detailed";
  proactiveFrequency: "daily" | "few_per_week" | "weekly";
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await getSaelisApi().requestJson<{ preferences: NotificationPreferences }>(
    "/api/notifications/preferences",
  );
  return response.preferences;
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<void> {
  await getSaelisApi().requestJson("/api/notifications/preferences", {
    method: "PUT",
    body: preferences,
  });
}

export async function sendTestNotification(): Promise<number> {
  const response = await getSaelisApi().requestJson<{ delivered: number }>(
    "/api/notifications/test",
    { method: "POST", body: {} },
  );
  return response.delivered;
}

/** Device timezone (IANA), with a safe fallback. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
