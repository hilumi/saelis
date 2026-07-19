import * as SecureStore from "expo-secure-store";

/**
 * One-time onboarding flag. Stored on-device only (no server round trip);
 * versioned so a future, meaningfully different onboarding can show again.
 */

const KEY = "saelis.onboarding.v1.seen";

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(KEY)) === "true";
  } catch {
    return true; // never trap the user in onboarding on storage failure
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, "true");
  } catch {
    // Non-fatal: worst case the introduction shows once more.
  }
}
