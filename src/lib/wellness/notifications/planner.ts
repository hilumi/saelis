/**
 * Saelis Her — deterministic notification planner.
 *
 * Decides WHICH notifications are appropriate right now. Delivery transport
 * (service worker / push subscriptions) does not exist yet — this planner is
 * the authoritative policy layer it will call. Fully testable, and every rule
 * from the product spec is enforced here:
 * master switch, per-category preferences, pathway enrollment (Restore
 * notifications never reach non-Restore users), timezone-aware quiet hours,
 * daily cap, dedup, completed-action suppression, no repeated pressure, and
 * no sensitive lock-screen content (Restore payloads are generic by
 * construction).
 */
import { localHour } from "@/lib/wellness/dates";

import type { PathwayKey } from "@/lib/wellness/pathways/types";

export const NOTIFICATION_PLAN_CATEGORIES = [
  "daily_readiness",
  "workout_ready",
  "nourishment_check",
  "hydration_check",
  "recovery_check",
  "restore_check_in",
  "evening_reflection",
  "milestone",
  "reset_support",
] as const;
export type NotificationPlanCategory = (typeof NOTIFICATION_PLAN_CATEGORIES)[number];

export interface PlannedNotification {
  category: NotificationPlanCategory;
  title: string;
  body: string;
  /** Deep link to the relevant card or page. */
  url: string;
  /** Stable per-day key for deduplication. */
  dedupeKey: string;
}

export interface NotificationPlannerInput {
  date: string; // user's local day
  timezone: string | null;
  now?: Date;
  masterEnabled: boolean;
  preferences: {
    morningCheckIn: boolean;
    workoutReminders: boolean;
    nourishmentReminders: boolean;
    hydrationReminders: boolean;
    eveningReflection: boolean;
    quietHoursStart: number | null;
    quietHoursEnd: number | null;
    maxDailyNotifications: number;
  };
  activePathways: readonly PathwayKey[];
  /** Dedupe keys already sent today. */
  alreadySentKeys: ReadonlySet<string>;
  state: {
    checkInDone: boolean;
    workoutDone: boolean;
    workoutPlanned: boolean;
    mealLoggedToday: boolean;
    hydrationLoggedToday: boolean;
    restoreCheckInDone: boolean;
    readinessLow: boolean;
    resetModeActive: boolean;
    newMilestoneMessage: string | null;
    safetyHoldActive: boolean;
    /** Consecutive days of sent-but-unanswered reminders. */
    unresponsiveDays: number;
  };
}

/** Copy is calm and never shames. Restore copy carries no symptom detail. */
const COPY: Record<NotificationPlanCategory, { title: string; body: string; url: string }> = {
  daily_readiness: {
    title: "Your plan is ready",
    body: "Saelis can adapt it to the kind of day you're having.",
    url: "/wellness/her",
  },
  workout_ready: {
    title: "Movement plan ready",
    body: "Your movement plan is ready, with shorter options available.",
    url: "/wellness/her",
  },
  nourishment_check: {
    title: "Nourishment",
    body: "A gentle nudge toward your next nourishing meal.",
    url: "/wellness/her",
  },
  hydration_check: {
    title: "Water check",
    body: "A sip counts. A glass counts more.",
    url: "/wellness/her",
  },
  recovery_check: {
    title: "A gentler plan is available",
    body: "Low-energy day? A gentler plan is available.",
    url: "/wellness/her",
  },
  restore_check_in: {
    // Deliberately generic — never postpartum detail on a lock screen.
    title: "A gentle check-in is ready",
    body: "A gentle recovery check-in is ready when you are.",
    url: "/wellness/her",
  },
  evening_reflection: {
    title: "Evening reflection",
    body: "What is one thing you are proud of today?",
    url: "/wellness/her#reflection",
  },
  milestone: {
    title: "A quiet milestone",
    body: "You built consistency this week. That matters.",
    url: "/wellness/her/progress",
  },
  reset_support: {
    title: "Today can be simple",
    body: "Nourishment, water, and one small act of care.",
    url: "/wellness/her",
  },
};

const BANNED_PHRASES = [
  "you failed",
  "you missed again",
  "burn off",
  "no excuses",
  "bounce back",
  "get your body back",
  "summer body",
];

function inQuietHours(input: NotificationPlannerInput): boolean {
  const { quietHoursStart: start, quietHoursEnd: end } = input.preferences;
  if (start == null || end == null) return false;
  const hour = localHour(input.timezone, input.now ?? new Date());
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function planNotifications(input: NotificationPlannerInput): PlannedNotification[] {
  if (!input.masterEnabled) return [];
  if (input.preferences.maxDailyNotifications <= 0) return [];
  if (inQuietHours(input)) return [];
  // Respect an unresponsive user: after 3 quiet days, only the daily plan note.
  const backOff = input.state.unresponsiveDays >= 3;

  const { state, activePathways } = input;
  const restoreActive = activePathways.includes("restore");
  const candidates: { category: NotificationPlanCategory; when: boolean }[] = [
    { category: "daily_readiness", when: input.preferences.morningCheckIn && !state.checkInDone },
    {
      category: state.readinessLow ? "recovery_check" : "workout_ready",
      when:
        !backOff &&
        input.preferences.workoutReminders &&
        state.workoutPlanned &&
        !state.workoutDone &&
        !state.safetyHoldActive &&
        !state.resetModeActive,
    },
    {
      category: "nourishment_check",
      when: !backOff && input.preferences.nourishmentReminders && !state.mealLoggedToday,
    },
    {
      category: "hydration_check",
      when: !backOff && input.preferences.hydrationReminders && !state.hydrationLoggedToday,
    },
    {
      category: "restore_check_in",
      when:
        !backOff &&
        restoreActive && // NEVER for non-Restore users
        !state.restoreCheckInDone,
    },
    {
      category: "reset_support",
      when: state.resetModeActive,
    },
    {
      category: "evening_reflection",
      when: !backOff && input.preferences.eveningReflection,
    },
    {
      category: "milestone",
      when: !backOff && state.newMilestoneMessage != null,
    },
  ];

  const planned: PlannedNotification[] = [];
  const seenCategories = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate.when) continue;
    if (seenCategories.has(candidate.category)) continue; // in-batch dedup
    const copy = COPY[candidate.category];
    const dedupeKey = `${candidate.category}:${input.date}`;
    if (input.alreadySentKeys.has(dedupeKey)) continue; // cross-send dedup
    const body =
      candidate.category === "milestone" && input.state.newMilestoneMessage
        ? input.state.newMilestoneMessage
        : copy.body;
    if (BANNED_PHRASES.some((phrase) => body.toLowerCase().includes(phrase))) continue;
    planned.push({
      category: candidate.category,
      title: copy.title,
      body,
      url: copy.url,
      dedupeKey,
    });
    seenCategories.add(candidate.category);
    if (planned.length >= input.preferences.maxDailyNotifications) break; // daily cap
  }
  return planned;
}
