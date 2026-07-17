import { describe, expect, it } from "vitest";

import { localDayISO, localHour, weekStartISO } from "./dates";

describe("timezone-aware dates", () => {
  const lateUTC = new Date("2026-07-17T03:30:00Z");

  it("computes the user's local day, not the server's", () => {
    expect(localDayISO("UTC", lateUTC)).toBe("2026-07-17");
    // Chicago is still on the 16th at 03:30 UTC.
    expect(localDayISO("America/Chicago", lateUTC)).toBe("2026-07-16");
  });

  it("falls back safely for missing or invalid timezones", () => {
    expect(localDayISO(null, lateUTC)).toBe("2026-07-17");
    expect(localDayISO("Not/AZone", lateUTC)).toBe("2026-07-17");
  });

  it("finds the Monday week start", () => {
    expect(weekStartISO("2026-07-17")).toBe("2026-07-13"); // Friday → Monday
    expect(weekStartISO("2026-07-13")).toBe("2026-07-13");
    expect(weekStartISO("2026-07-19")).toBe("2026-07-13"); // Sunday → prior Monday
  });

  it("reports the local hour for quiet-hours checks", () => {
    expect(localHour("UTC", lateUTC)).toBe(3);
    expect(localHour("America/Chicago", lateUTC)).toBe(22);
  });
});
