import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { getSaelisApi } from "@/lib/api/saelis";
import { env } from "@/lib/env";

/**
 * Mobile push plumbing. Contains NO notification copy and NO personality —
 * the server owns content, policy, and scheduling. This module only:
 *  - reports whether push is supported/permitted on this device,
 *  - requests OS permission (ONLY ever called after an explicit user tap),
 *  - obtains the Expo push token and registers it with the server,
 *  - unregisters on sign-out or when the user turns this device off.
 */

export type PushSetupResult =
  | { status: "registered"; token: string }
  | { status: "denied" }
  | { status: "dismissed" }
  | { status: "unsupported"; reason: "simulator" | "missing_project_id" }
  | { status: "token_failed" }
  | { status: "register_failed" };

/** Foreground presentation: quiet banner, no sound bombardment. */
export function configureForegroundBehavior(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Full opt-in flow, called ONLY from the explicit "Turn on notifications"
 * action. Handles: unsupported environment, permission denied/dismissed,
 * token failure, and server registration failure. Registration replaces any
 * previous token for this device (server upserts by token).
 */
export async function enablePushForThisDevice(): Promise<PushSetupResult> {
  if (!Device.isDevice) return { status: "unsupported", reason: "simulator" };
  const projectId = env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return { status: "unsupported", reason: "missing_project_id" };

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
    if (status !== "granted") {
      return requested.canAskAgain ? { status: "dismissed" } : { status: "denied" };
    }
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch {
    return { status: "token_failed" };
  }

  try {
    await getSaelisApi().requestJson("/api/notifications/tokens", {
      method: "POST",
      body: { token, platform: Platform.OS === "ios" ? "ios" : "android" },
    });
  } catch {
    return { status: "register_failed" };
  }

  return { status: "registered", token };
}

/** Best-effort unregistration (sign-out, or turning this device off). */
export async function disablePushForThisDevice(): Promise<void> {
  try {
    const projectId = env.EXPO_PUBLIC_EAS_PROJECT_ID;
    if (!projectId || !Device.isDevice) return;
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await getSaelisApi().requestJson("/api/notifications/tokens", {
      method: "DELETE",
      body: { token },
    });
  } catch {
    // Best effort: the server also revokes tokens the provider reports dead.
  }
}
