/**
 * Saelis Her — timezone-aware date helpers.
 *
 * "Today" is the user's local day (profiles.timezone when set), never the
 * server's. Falls back safely to UTC when the timezone is missing/invalid.
 */

export function localDayISO(timezone: string | null | undefined, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone ?? "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/** The Monday of the week containing the given ISO date. */
export function weekStartISO(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const day = date.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

/** Local hour (0–23) in the user's timezone, for quiet-hours checks. */
export function localHour(timezone: string | null | undefined, at: Date = new Date()): number {
  try {
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone ?? "UTC",
      hour: "numeric",
      hour12: false,
    }).format(at);
    const parsed = Number(hour === "24" ? "0" : hour);
    return Number.isNaN(parsed) ? at.getUTCHours() : parsed;
  } catch {
    return at.getUTCHours();
  }
}
