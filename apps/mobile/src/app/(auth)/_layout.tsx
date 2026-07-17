import { Redirect, Stack } from "expo-router";

import { LaunchScreen } from "@/components/launch-screen";
import { guardAuthGroup } from "@/lib/auth/guards";
import { useSession } from "@/lib/session";

/** Auth group: signed-in users are sent to the app, never left here. */
export default function AuthLayout() {
  const { status } = useSession();
  const decision = guardAuthGroup(status);

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
