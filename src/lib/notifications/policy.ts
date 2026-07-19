import type { CompanionNotificationPreferencesRow } from "@/types/database";

import type { NotificationCategory } from "./copy";

/**
 * Proactive-notification policy — pure, deterministic, fully unit-tested.
 *
 * Beta rules:
 *  - at most ONE proactive notification per user per day (user-created
 *    reminders excluded from the cap);
 *  - nothing during quiet hours;
 *  - proactive frequency further gates days (daily / few_per_week / weekly);
 *  - delivery only within the send window after the user's preferred local
 *    time (so an hourly job sends once, shortly after the chosen time).
 */

export const PROACTIVE_CATEGORIES: NotificationCategory[] = [
  "gentle_check_in",
  "wellness_reminder",
  "evening_reflection",
];

/** Minutes since local midnight for `now` in an IANA timezone (UTC fallback). */
export function localMinutes(now: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(now);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
    return hour * 60 + minute;
  } catch {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}

/** Local calendar date (YYYY-MM-DD) for `now` in an IANA timezone (UTC fallback). */
export function localDateKey(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** Local weekday (0 = Sunday … 6 = Saturday) in an IANA timezone. */
export function localWeekday(now: Date, timezone: string): number {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(now);
    const index = names.indexOf(name);
    return index === -1 ? now.getUTCDay() : index;
  } catch {
    return now.getUTCDay();
  }
}

/** Quiet hours may wrap midnight (e.g. 21:00 → 08:00). Start inclusive, end exclusive. */
export function isWithinQuietHours(
  minutesOfDay: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (startMinutes === endMinutes) return false; // no quiet window configured
  if (startMinutes < endMinutes) {
    return minutesOfDay >= startMinutes && minutesOfDay < endMinutes;
  }
  return minutesOfDay >= startMinutes || minutesOfDay < endMinutes;
}

/** Frequency gate for proactive sends, by local weekday. */
export function frequencyAllowsDay(
  frequency: CompanionNotificationPreferencesRow["proactive_frequency"],
  weekday: number,
): boolean {
  if (frequency === "daily") return true;
  if (frequency === "few_per_week") return weekday === 1 || weekday === 3 || weekday === 5;
  return weekday === 1; // weekly → Mondays
}

/** Deterministic idempotency key: one proactive send per user per local day. */
export function buildIdempotencyKey(
  userId: string,
  category: NotificationCategory,
  dateKey: string,
): string {
  return `${userId}:${category}:${dateKey}`;
}

/** How long after the preferred time the hourly job may still deliver. */
export const SEND_WINDOW_MINUTES = 75;

export interface ProactiveDecision {
  send: boolean;
  category: NotificationCategory | null;
  /** Content-free reason, used for suppression analytics. */
  reason:
    | "ok"
    | "disabled"
    | "no_categories"
    | "quiet_hours"
    | "outside_window"
    | "frequency"
    | "already_sent_today";
}

/**
 * Decide whether a proactive notification should be sent for this user right
 * now. Pure: identical inputs always produce the identical decision.
 */
export function decideProactiveSend(input: {
  prefs: Pick<
    CompanionNotificationPreferencesRow,
    | "enabled"
    | "gentle_check_ins"
    | "wellness_reminders"
    | "evening_reflections"
    | "preferred_time_minutes"
    | "timezone"
    | "quiet_hours_start_minutes"
    | "quiet_hours_end_minutes"
    | "proactive_frequency"
  >;
  now: Date;
  /** True when a proactive delivery already exists for this local day. */
  alreadySentToday: boolean;
}): ProactiveDecision {
  const { prefs, now, alreadySentToday } = input;

  if (!prefs.enabled) return { send: false, category: null, reason: "disabled" };

  // Category priority: evening reflections when the preferred time is in the
  // evening; otherwise gentle check-ins; wellness reminders as fallback.
  const category: NotificationCategory | null = (() => {
    const evening = prefs.preferred_time_minutes >= 17 * 60;
    if (evening && prefs.evening_reflections) return "evening_reflection";
    if (prefs.gentle_check_ins) return "gentle_check_in";
    if (prefs.wellness_reminders) return "wellness_reminder";
    if (prefs.evening_reflections) return "evening_reflection";
    return null;
  })();
  if (!category) return { send: false, category: null, reason: "no_categories" };

  if (alreadySentToday) return { send: false, category, reason: "already_sent_today" };

  const weekday = localWeekday(now, prefs.timezone);
  if (!frequencyAllowsDay(prefs.proactive_frequency, weekday)) {
    return { send: false, category, reason: "frequency" };
  }

  const minutes = localMinutes(now, prefs.timezone);
  if (isWithinQuietHours(minutes, prefs.quiet_hours_start_minutes, prefs.quiet_hours_end_minutes)) {
    return { send: false, category, reason: "quiet_hours" };
  }

  const sincePreferred = minutes - prefs.preferred_time_minutes;
  if (sincePreferred < 0 || sincePreferred > SEND_WINDOW_MINUTES) {
    return { send: false, category, reason: "outside_window" };
  }

  return { send: true, category, reason: "ok" };
}
