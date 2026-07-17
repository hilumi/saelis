import type { AuthStatus } from "./state";

/**
 * Pure routing decisions for the two route groups. Layouts call these so the
 * rules stay in one tested place:
 * - unauthenticated users never see protected screens (no flash: `loading`
 *   renders the launch state, not the screen);
 * - authenticated users never stay on auth screens.
 */

export type GuardDecision =
  | { kind: "render" }
  | { kind: "launch" }
  | { kind: "redirect"; href: "/(auth)/sign-in" | "/(app)/(tabs)" };

/** For screens inside the protected (app) group. */
export function guardProtectedGroup(status: AuthStatus): GuardDecision {
  if (status === "loading") return { kind: "launch" };
  if (status === "signedOut") return { kind: "redirect", href: "/(auth)/sign-in" };
  return { kind: "render" };
}

/** For screens inside the (auth) group. */
export function guardAuthGroup(status: AuthStatus): GuardDecision {
  if (status === "loading") return { kind: "launch" };
  if (status === "signedIn") return { kind: "redirect", href: "/(app)/(tabs)" };
  return { kind: "render" };
}
