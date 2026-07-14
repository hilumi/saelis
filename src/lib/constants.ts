/**
 * Saelis domain constants.
 * These mirror the database check constraints in supabase/migrations — keep in sync.
 */

export const APP_NAME = "Saelis";
export const APP_TAGLINE =
  "A quiet place to feel understood, think clearly, and find what comes next.";
export const SIGNATURE_LINE = "Come as you are. Leave a little lighter.";
export const MISSION =
  "Create technology that leaves people feeling more human than when they arrived.";

export const MOODS = ["heavy", "tender", "flat", "steady", "hopeful", "bright", "tangled"] as const;

export const ENERGIES = ["empty", "low", "enough", "full"] as const;

export const SUPPORT_NEEDS = [
  "listen",
  "comfort",
  "clarify",
  "decide",
  "communicate",
  "celebrate",
  "faith",
  "presence",
  "next-step",
  "stillness",
] as const;

export const SUPPORT_MODES = [
  "witness",
  "explore",
  "comfort",
  "clarify",
  "act",
  "celebrate",
  "connect",
  "reflect",
  "presence",
] as const;

export const TONE_PREFERENCES = ["gentle", "balanced", "direct"] as const;
export const RESPONSE_LENGTHS = ["brief", "moderate", "expansive"] as const;
export const SUPPORT_PREFERENCES = ["listen-first", "ask-first", "guide-first"] as const;
export const HUMOR_LEVELS = ["none", "light", "playful"] as const;
export const FAITH_PREFERENCES = ["never", "ask", "welcome"] as const;
export const PLANNING_STYLES = ["one-step", "small-plan", "no-plans"] as const;
export const ENCOURAGEMENT_STYLES = ["quiet", "warm", "bright"] as const;

export const CONVERSATION_STATUSES = ["active", "completed", "archived"] as const;
export const TURN_ROLES = ["user", "assistant", "system"] as const;
export const MEMORY_STATUSES = ["proposed", "active", "rejected", "deleted"] as const;
export const MEMORY_SOURCES = [
  "explicit",
  "preference-setting",
  "user-approved-inference",
] as const;

/** Maximum accepted request body size for the companion API, in bytes. */
export const COMPANION_MAX_BODY_BYTES = 32 * 1024;

/** Maximum user message length accepted by the companion API. */
export const COMPANION_MAX_MESSAGE_LENGTH = 4000;
