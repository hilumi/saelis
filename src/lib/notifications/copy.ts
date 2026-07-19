/**
 * Notification copy catalog — the ONLY source of notification text.
 *
 * Rules (tested in copy.test.ts):
 *  - no guilt, streak, urgency, or attachment language;
 *  - never medical details, disclosures, conversation excerpts, or any
 *    private wellness data — copy is fully static;
 *  - "private" preview mode shows one generic line for every category;
 *  - "detailed" preview mode shows category-specific copy that still reveals
 *    nothing about the user.
 */

export type NotificationCategory =
  "gentle_check_in" | "wellness_reminder" | "evening_reflection" | "user_reminder" | "test";

export const PRIVATE_PREVIEW_BODY = "Saelis has a gentle reminder for you.";

interface NotificationCopy {
  title: string;
  /** Rotating bodies; the sender picks deterministically by day. */
  bodies: string[];
}

export const NOTIFICATION_COPY: Record<NotificationCategory, NotificationCopy> = {
  gentle_check_in: {
    title: "Saelis",
    bodies: [
      "Hey, how are you really feeling today?",
      "No pressure. Saelis is here whenever you feel like checking in.",
      "A quiet moment for you, whenever you're ready.",
    ],
  },
  wellness_reminder: {
    title: "Saelis",
    bodies: [
      "You planned a little time for yourself. Still want to protect that space?",
      "A gentle nudge toward the plan you made — only if today allows.",
    ],
  },
  evening_reflection: {
    title: "Saelis",
    bodies: [
      "Before the day ends—anything you want to put down for tonight?",
      "A minute to close the day quietly, if you'd like one.",
    ],
  },
  user_reminder: {
    title: "Saelis",
    bodies: ["A reminder you set for yourself is due."],
  },
  test: {
    title: "Saelis",
    bodies: ["This is a test notification. Everything is working."],
  },
};

/**
 * Language that must never appear in any notification. Checked by tests
 * against the whole catalog; also available for future runtime guards.
 */
export const PROHIBITED_NOTIFICATION_PATTERNS = [
  "i miss you",
  "miss you",
  "why haven't you",
  "don't leave",
  "i need you",
  "you broke your streak",
  "streak",
  "i'm lonely",
  "waiting for you",
  "last chance",
  "hurry",
  "you should have",
];

export interface NotificationContent {
  title: string;
  body: string;
}

/**
 * Deterministic copy selection: same category, preview mode, and day always
 * produce the same text (idempotent retries send identical content).
 */
export function buildNotificationContent(
  category: NotificationCategory,
  previewMode: "private" | "detailed",
  dayKey: string,
): NotificationContent {
  if (previewMode === "private") {
    return { title: "Saelis", body: PRIVATE_PREVIEW_BODY };
  }
  const copy = NOTIFICATION_COPY[category];
  const daySeed = [...dayKey].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const body = copy.bodies[daySeed % copy.bodies.length] ?? copy.bodies[0] ?? PRIVATE_PREVIEW_BODY;
  return { title: copy.title, body };
}

/**
 * Deep-link path for each category (existing saelis:// scheme; Expo Router
 * strips route groups, so "/conversation" resolves to the conversation tab
 * and "/" to home).
 */
export const NOTIFICATION_DEEP_LINKS: Record<NotificationCategory, string> = {
  gentle_check_in: "/conversation",
  wellness_reminder: "/",
  evening_reflection: "/conversation",
  user_reminder: "/notification-settings",
  test: "/notification-settings",
};
