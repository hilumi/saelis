/**
 * Companion constants shared across clients.
 * Mirrors `src/lib/constants.ts` in the web app (the source of truth).
 */

export const COMPANION_MAX_MESSAGE_LENGTH = 4000;

export const SUPPORT_MODES = [
  "witness",
  "explore",
  "comfort",
  "clarify",
  "act",
  "celebrate",
  "connect",
  "reflect",
] as const;

export const TURN_ROLES = ["user", "assistant", "system"] as const;

export type SupportMode = (typeof SUPPORT_MODES)[number];
export type TurnRole = (typeof TURN_ROLES)[number];
