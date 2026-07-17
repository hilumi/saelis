import { describe, expect, it } from "vitest";

import { consistencyCount, rollingAverage, summarizeTrend, weightProgress } from "./progress";

const series = (values: number[], startDay = 1) =>
  values.map((value, index) => ({
    date: `2026-07-${String(startDay + index).padStart(2, "0")}`,
    value,
  }));

describe("progress analytics", () => {
  it("uses rolling averages, not single weigh-ins", () => {
    const trend = summarizeTrend(series([180, 181, 179, 183, 180, 179, 181, 178, 185]));
    expect(trend.status).toBe("ok");
    // The 185 spike moves the average only slightly — no overreaction.
    expect(trend.rollingAverage).toBeLessThan(182);
    expect(rollingAverage([180, 185], 7)).toBe(182.5);
  });

  it("reports insufficient data instead of a misleading chart", () => {
    const trend = summarizeTrend(series([180, 181]));
    expect(trend.status).toBe("insufficient_data");
    expect(trend.rollingAverage).toBeNull();
  });

  it("supports disabled metrics with no numbers at all", () => {
    const trend = summarizeTrend(series([180, 181, 182, 183, 184]), false);
    expect(trend.status).toBe("disabled");
    expect(trend.latest).toBeNull();
    expect(trend.points).toHaveLength(0);
    expect(weightProgress(series([180, 181, 182, 183]), false).status).toBe("disabled");
  });

  it("computes weekly consistency from distinct days", () => {
    expect(consistencyCount(["2026-07-15", "2026-07-15", "2026-07-16"], 7, "2026-07-17")).toBe(2);
    expect(consistencyCount(["2026-07-01"], 7, "2026-07-17")).toBe(0);
  });

  it("measures weight progress from rolling averages", () => {
    const progress = weightProgress(
      series([200, 199.5, 199.8, 199.2, 198, 197.5, 197, 196.2, 195.8, 195]),
      true,
    );
    expect(progress.status).toBe("ok");
    expect(progress.absoluteChangeFromStart).toBeGreaterThan(2);
  });
});
