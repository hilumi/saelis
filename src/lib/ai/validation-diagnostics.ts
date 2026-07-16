import type { ZodError } from "zod";

/**
 * Development-only, content-free diagnostics for structured-output validation
 * failures.
 *
 * Logged: failing field paths, Zod issue codes, expected/received TYPE names,
 * whether JSON parsing failed, and the provider status / incomplete reason.
 * NEVER logged: prompts, user text, assistant text, field values, API keys,
 * or any part of the raw response body.
 */

export interface ValidationIssueSummary {
  path: string;
  code: string;
  expected?: string;
  received?: string;
}

export interface ValidationDiagnostics {
  stage: "parse" | "schema" | "post-enforcement";
  jsonParseFailed: boolean;
  issues: ValidationIssueSummary[];
  responseStatus?: string;
  incompleteReason?: string;
}

/** Reduce a ZodError to paths + codes + type names only. No values. */
export function summarizeZodIssues(error: ZodError): ValidationIssueSummary[] {
  return error.issues.slice(0, 20).map((issue) => {
    const summary: ValidationIssueSummary = {
      path: issue.path.join(".") || "(root)",
      code: issue.code,
    };
    // Only invalid_type carries TYPE NAMES in expected/received. Other issue
    // kinds (e.g. invalid enum) put raw payload VALUES there — never log those.
    if (issue.code === "invalid_type") {
      if ("expected" in issue && typeof issue.expected === "string") {
        summary.expected = issue.expected;
      }
      if ("received" in issue && typeof issue.received === "string") {
        summary.received = issue.received;
      }
    }
    return summary;
  });
}

/** Emit one structured, content-free line — development builds only. */
export function logValidationDiagnostics(diagnostics: ValidationDiagnostics): void {
  if (process.env.NODE_ENV !== "development") return;
  console.warn("[companion-validation]", JSON.stringify(diagnostics));
}
