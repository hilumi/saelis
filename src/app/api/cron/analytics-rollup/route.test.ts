import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics/rollup", () => ({
  runDailyAnalyticsRollup: vi.fn(async (date?: string) => ({
    ok: true,
    rollupDate: date ?? "2026-07-16",
    rowsWritten: 3,
  })),
}));

import { POST } from "@/app/api/cron/analytics-rollup/route";
import { runDailyAnalyticsRollup } from "@/lib/analytics/rollup";

function request(headers: Record<string, string> = {}, query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/cron/analytics-rollup${query}`, {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-cron-secret";
});

afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.ANALYTICS_ROLLUPS_ENABLED;
});

describe("analytics rollup cron authorization", () => {
  it("returns 503 when no CRON_SECRET is configured (disabled by default)", async () => {
    delete process.env.CRON_SECRET;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(runDailyAnalyticsRollup).not.toHaveBeenCalled();
  });

  it("rejects missing or wrong bearer tokens", async () => {
    expect((await POST(request())).status).toBe(401);
    expect((await POST(request({ authorization: "Bearer wrong" }))).status).toBe(401);
    expect(runDailyAnalyticsRollup).not.toHaveBeenCalled();
  });

  it("runs the rollup with a valid bearer token", async () => {
    const response = await POST(request({ authorization: "Bearer test-cron-secret" }));
    expect(response.status).toBe(200);
    expect(runDailyAnalyticsRollup).toHaveBeenCalledWith(undefined);
  });

  it("supports explicit backfill dates and rejects malformed ones", async () => {
    const good = await POST(
      request({ authorization: "Bearer test-cron-secret" }, "?date=2026-07-01"),
    );
    expect(good.status).toBe(200);
    expect(runDailyAnalyticsRollup).toHaveBeenCalledWith("2026-07-01");

    const bad = await POST(
      request({ authorization: "Bearer test-cron-secret" }, "?date=DROP%20TABLE"),
    );
    expect(bad.status).toBe(400);
  });

  it("respects the rollups feature flag", async () => {
    process.env.ANALYTICS_ROLLUPS_ENABLED = "false";
    const response = await POST(request({ authorization: "Bearer test-cron-secret" }));
    expect(response.status).toBe(503);
    expect(runDailyAnalyticsRollup).not.toHaveBeenCalled();
  });
});
