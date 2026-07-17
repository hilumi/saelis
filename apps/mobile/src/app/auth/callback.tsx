import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { LaunchScreen } from "@/components/launch-screen";
import { useSession } from "@/lib/session";

/**
 * Deep-link landing for auth emails: saelis://auth/callback
 *
 * Handles both flows the app sends out:
 * - sign-up confirmation → exchange `code`, land in the app;
 * - password recovery (`type=recovery`) → exchange `code`, then the
 *   set-new-password screen.
 *
 * PKCE note: the exchange only succeeds on the device that requested the
 * email, because the code verifier lives in this device's secure storage.
 * Errors route back to sign-in with calm copy.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { completeAuthFromCode } = useSession();
  const params = useLocalSearchParams<{
    code?: string;
    type?: string;
    error?: string;
    error_description?: string;
  }>();
  const [failed, setFailed] = useState<string | null>(null);
  const handled = useRef(false);

  const code = typeof params.code === "string" ? params.code : undefined;
  const isRecovery = params.type === "recovery";

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    async function run() {
      if (!code) {
        setFailed("That link has expired or was already used. Request a fresh one and try again.");
        return;
      }
      const result = await completeAuthFromCode(code);
      if (!result.ok) {
        setFailed(result.error);
        return;
      }
      router.replace(isRecovery ? "/(app)/reset-password" : "/(app)/(tabs)");
    }
    void run();
  }, [code, isRecovery, completeAuthFromCode, router]);

  if (failed) {
    // Calm hand-off: back to sign-in; the notice param keeps copy in one place.
    return <Redirect href={{ pathname: "/(auth)/sign-in", params: { notice: failed } }} />;
  }

  return <LaunchScreen />;
}
