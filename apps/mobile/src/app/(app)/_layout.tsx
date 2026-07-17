import { Redirect, Stack } from "expo-router";

import { LaunchScreen } from "@/components/launch-screen";
import { guardProtectedGroup } from "@/lib/auth/guards";
import { useSession } from "@/lib/session";

/**
 * Protected route group: everything under (app) requires a session.
 * Deterministic gate (see guardProtectedGroup) — screens inside never need
 * their own auth checks, and unauthenticated users never see a flash of
 * protected content.
 */
export default function AppLayout() {
  const { status } = useSession();
  const decision = guardProtectedGroup(status);

  if (decision.kind === "launch") {
    return <LaunchScreen />;
  }
  if (decision.kind === "redirect") {
    return <Redirect href={decision.href} />;
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
    />
  );
}
