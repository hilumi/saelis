import { describe, expect, it } from "vitest";

import {
  ROLLUP_DIMENSION_ALLOWLIST,
  computeDailyRollupRows,
  defaultRollupDate,
} from "@/lib/analytics/rollup";
import type { AnalyticsEventLite } from "@/lib/analytics/metrics";

const MIN_COHORT = 5;

function event(
  name: string,
  userId: string,
  metadata: Record<string, string | number | boolean> = {},
): AnalyticsEventLite {
  return {
    event_name: name,
    occurred_at: "2026-07-16T10:00:00.000Z",
    user_id: userId,
    pathway_keys: [],
    metadata,
  };
}

const FIXTURE: AnalyticsEventLite[] = [
  ...Array.from({ length: 6 }, (_, index) =>
    event("pathway_enrolled", `a-${index}`, { pathway: "phoenix" }),
  ),
  ...Array.from({ length: 2 }, (_, index) =>
    event("pathway_enrolled", `b-${index}`, { pathway: "restore" }),
  ),
  event("daily_plan_generated", "a-0"),
  event("workout_completed", "a-1"),
];

describe("computeDailyRollupRows", () => {
  it("is deterministic (idempotent reruns produce identical rows)", () => {
    const first = computeDailyRollupRows("2026-07-16", FIXTURE, MIN_COHORT);
    const second = computeDailyRollupRows("2026-07-16", FIXTURE, MIN_COHORT);
    expect(second).toEqual(first);
  });

  it("never emits duplicate primary keys (upsert-safe)", () => {
    const rows = computeDailyRollupRows("2026-07-16", FIXTURE, MIN_COHORT);
    const keys = rows.map(
      (row) => `${row.rollup_date}|${row.metric_key}|${row.dimension_key}|${row.dimension_value}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("only uses allowlisted dimensions", () => {
    const rows = computeDailyRollupRows("2026-07-16", FIXTURE, MIN_COHORT);
    for (const row of rows) {
      expect(ROLLUP_DIMENSION_ALLOWLIST).toContain(row.dimension_key);
    }
  });

  it("applies cohort thresholds to dimensioned rows", () => {
    const rows = computeDailyRollupRows("2026-07-16", FIXTURE, MIN_COHORT);
    const pathwayRows = rows.filter((row) => row.dimension_key === "pathway");
    expect(pathwayRows.map((row) => row.dimension_value)).toEqual(["phoenix"]);
    // The 2-user restore group never becomes a row.
    expect(JSON.stringify(pathwayRows)).not.toContain("restore");
  });

  it("contains no user identifiers anywhere", () => {
    const rows = computeDailyRollupRows("2026-07-16", FIXTURE, MIN_COHORT);
    const serialized = JSON.stringify(rows);
    expect(serialized).not.toContain("a-0");
    expect(serialized).not.toContain("b-0");
  });
});

describe("defaultRollupDate", () => {
  it("targets the previous UTC day", () => {
    expect(defaultRollupDate(new Date("2026-07-17T02:00:00.000Z"))).toBe("2026-07-16");
  });
});
