import { describe, expect, it } from "vitest";

import { computeJobHealth, jobDurationSeconds, type JobRunLite } from "@/lib/analytics/health";

const NOW = new Date("2026-07-17T12:00:00.000Z");

function run(overrides: Partial<JobRunLite>): JobRunLite {
  return {
    job_key: "analytics_daily_rollup",
    started_at: "2026-07-17T11:50:00.000Z",
    completed_at: "2026-07-17T11:51:00.000Z",
    status: "completed",
    failure_count: 0,
    error_category: null,
    ...overrides,
  };
}

describe("computeJobHealth", () => {
  it("reports unknown for jobs that never ran", () => {
    expect(computeJobHealth("missing_job", [run({})], NOW).status).toBe("unknown");
  });

  it("reports healthy for recent successful runs", () => {
    expect(computeJobHealth("analytics_daily_rollup", [run({})], NOW).status).toBe("healthy");
  });

  it("detects stale running jobs as failing", () => {
    const health = computeJobHealth(
      "analytics_daily_rollup",
      [run({ status: "running", started_at: "2026-07-17T10:00:00.000Z", completed_at: null })],
      NOW,
    );
    expect(health.staleRunning).toBe(true);
    expect(health.status).toBe("failing");
  });

  it("reports failing above the failure-rate threshold", () => {
    const runs = [
      run({ status: "failed", error_category: "rollup_failed" }),
      run({ status: "failed", error_category: "rollup_failed" }),
      run({ status: "failed", error_category: "rollup_failed" }),
      run({}),
    ];
    const health = computeJobHealth("analytics_daily_rollup", runs, NOW);
    expect(health.status).toBe("failing");
    expect(health.repeatedErrorCategory).toBe("rollup_failed");
  });

  it("reports unknown when the last run is too old", () => {
    const health = computeJobHealth(
      "analytics_daily_rollup",
      [run({ started_at: "2026-07-10T00:00:00.000Z", completed_at: "2026-07-10T00:01:00.000Z" })],
      NOW,
    );
    expect(health.status).toBe("unknown");
  });
});

describe("jobDurationSeconds", () => {
  it("computes duration and handles running jobs", () => {
    expect(jobDurationSeconds(run({}))).toBe(60);
    expect(jobDurationSeconds(run({ completed_at: null }))).toBeNull();
  });
});
