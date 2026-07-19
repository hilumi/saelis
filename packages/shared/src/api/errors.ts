import { z } from "zod";

/**
 * Structured API error contract. Every Saelis API error body is
 * `{ "error": "<calm, user-readable copy>" }`; the HTTP status carries the
 * category. Clients show `error` verbatim — the server owns the voice.
 */

export const apiErrorBodySchema = z.object({ error: z.string() }).passthrough();

export type ApiErrorBody = z.output<typeof apiErrorBodySchema>;

export interface ParsedApiError {
  status: number;
  /** Calm server-provided copy, when the body was structured. */
  message: string | null;
  /** Seconds to wait, from Retry-After, when the server asked for a pause. */
  retryAfterSeconds: number | null;
}

/** Parse a non-OK HTTP response body/headers into a structured error. */
export function parseApiError(
  status: number,
  body: string,
  retryAfterHeader?: string | null,
): ParsedApiError {
  let message: string | null = null;
  try {
    const parsed = apiErrorBodySchema.safeParse(JSON.parse(body));
    if (parsed.success) message = parsed.data.error;
  } catch {
    // Non-JSON body (proxy page, empty) — no server copy available.
  }
  const retryAfter = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : Number.NaN;
  return {
    status,
    message,
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : null,
  };
}
