import * as Notifications from "expo-notifications";
import { Redirect, Stack, useRouter } from "expo-router";
import { useEffect } from "react";

import { LaunchScreen } from "@/components/launch-screen";
import { guardProtectedGroup } from "@/lib/auth/guards";
import { ConversationProvider } from "@/lib/conversation/provider";
import { configureForegroundBehavior } from "@/lib/notifications/push";
import { useSession } from "@/lib/session";

const KNOWN_NOTIFICATION_PATHS = ["/", "/conversation", "/notification-settings"] as const;

/**
 * Route a notification tap to its native destination. Only known internal
 * paths are followed — never arbitrary URLs from payload data.
 */
function useNotificationDeepLinks(enabled: boolean): void {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    configureForegroundBehavior();

    const open = (data: unknown) => {
      const url = (data as { url?: unknown } | null)?.url;
      if (typeof url !== "string") return;
      const path = KNOWN_NOTIFICATION_PATHS.find((known) => known === url);
      if (path) router.push(path);
    };

    // Cold start: the tap that launched the app.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response.notification.request.content.data);
    });
    // Warm taps while running.
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      open(response.notification.request.content.data);
    });
    return () => subscription.remove();
  }, [enabled, router]);
}

/**
 * Protected route group: everything under (app) requires a session.
 * Deterministic gate (see guardProtectedGroup) — screens inside never need
 * their own auth checks, and unauthenticated users never see a flash of
 * protected content.
 */
export default function AppLayout() {
  const { status } = useSession();
  const decision = guardProtectedGroup(status);
  useNotificationDeepLinks(decision.kind === "render");

  if (decision.kind === "launch") {
    return <LaunchScreen />;
  }
  if (decision.kind === "redirect") {
    return <Redirect href={decision.href} />;
  }

  return (
    <ConversationProvider>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
      />
    </ConversationProvider>
  );
}
