import { describe, expect, it } from "vitest";

import { buildAggregatedCsv, exportFilename } from "@/lib/analytics/csv";

describe("aggregated CSV export", () => {
  it("builds a header plus aggregate rows", () => {
    const csv = buildAggregatedCsv([
      { metric: "active_users", dimension: "all", date: "2026-07-01..2026-07-16", value: 42 },
    ]);
    expect(csv.split("\n")[0]).toBe("metric,dimension,date,value");
    expect(csv).toContain("active_users,all,2026-07-01..2026-07-16,42");
  });

  it("neutralizes formula-injection attempts", () => {
    const csv = buildAggregatedCsv([
      { metric: "=SUM(A1:A9)", dimension: "+cmd", date: "-2", value: "@evil" },
    ]);
    const line = csv.split("\n")[1];
    expect(line).toContain("'=SUM(A1:A9)");
    expect(line).toContain("'+cmd");
    expect(line).toContain("'-2");
    expect(line).toContain("'@evil");
  });

  it("escapes quotes, commas, and newlines", () => {
    const csv = buildAggregatedCsv([{ metric: 'a"b', dimension: "c,d", date: "e\nf", value: 1 }]);
    expect((csv.split("\n")[1] ?? "").startsWith('"a""b","c,d"')).toBe(true);
  });

  it("produces a safe filename from dates only", () => {
    expect(exportFilename("2026-07-01", "2026-07-16")).toBe(
      "saelis-her-analytics_2026-07-01_2026-07-16.csv",
    );
    expect(exportFilename("../../etc", "x;rm")).toBe("saelis-her-analytics__.csv");
  });
});
