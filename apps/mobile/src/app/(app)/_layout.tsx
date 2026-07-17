import { Redirect, Stack } from "expo-router";

import { LaunchScreen } from "@/components/launch-screen";
import { useSession } from "@/lib/session";

/**
 * Protected route group: everything under (app) requires a session.
 * Deterministic gate — screens inside never need their own auth checks.
 */
export default function AppLayout() {
  const { status } = useSession();

  if (status === "loading") {
    return <LaunchScreen />;
  }
  if (status !== "signedIn") {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
    />
  );
}
