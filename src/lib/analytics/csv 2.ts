/**
 * Saelis Her — aggregated CSV export (Phase 6). Pure builder.
 *
 * Only pre-aggregated rows can pass through here: the row type has no place
 * for user ids, emails, metadata, or free text. Every cell is escaped and
 * formula-injection-proofed (leading = + - @ tab are prefixed), so a value
 * can never execute in a spreadsheet application.
 */

export interface AggregatedExportRow {
  metric: string;
  dimension: string;
  date: string;
  value: number | string;
}

function sanitizeCell(raw: string | number): string {
  const value = String(raw);
  // CSV injection protection: neutralize leading formula characters.
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  // Standard escaping.
  if (/[",\n\r]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`;
  return guarded;
}

export function buildAggregatedCsv(rows: AggregatedExportRow[]): string {
  const header = "metric,dimension,date,value";
  const lines = rows.map((row) =>
    [
      sanitizeCell(row.metric),
      sanitizeCell(row.dimension),
      sanitizeCell(row.date),
      sanitizeCell(row.value),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

/** Safe, fixed-shape filename: no user input beyond validated ISO dates. */
export function exportFilename(fromDate: string, toDate: string): string {
  const safe = (value: string) => value.replace(/[^0-9-]/g, "");
  return `saelis-her-analytics_${safe(fromDate)}_${safe(toDate)}.csv`;
}
