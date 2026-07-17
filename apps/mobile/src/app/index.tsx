import { Redirect } from "expo-router";

import { LaunchScreen } from "@/components/launch-screen";
import { useSession } from "@/lib/session";

/**
 * Entry gate: show the launch state while the session restores, then route
 * to the protected app or the auth flow.
 */
export default function Index() {
  const { status } = useSession();

  if (status === "loading") {
    return <LaunchScreen />;
  }
  if (status === "signedIn") {
    return <Redirect href="/(app)/(tabs)" />;
  }
  return <Redirect href="/(auth)/sign-in" />;
}
