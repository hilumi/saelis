import { Redirect, Stack } from "expo-router";

import { useSession } from "@/lib/session";

export default function AuthLayout() {
  const { status } = useSession();

  // Already signed in — never show auth screens.
  if (status === "signedIn") {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
    />
  );
}
