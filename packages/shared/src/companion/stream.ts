import { z } from "zod";

import { SUPPORT_MODES } from "./constants";

/**
 * Streamed companion protocol — the client-side contract for
 * POST /api/companion/stream (Server-Sent Events). Mirrors the server route
 * and docs/03-engineering/streaming-protocol.md; the web server remains the
 * source of truth.
 *
 *   event: start     data: {"requestId":"..."}
 *   event: delta     data: {"text":"..."}
 *   event: complete  data: {"conversationId":..., "response":{...}, ...}
 *   event: error     data: {"code":"...","message":"...","retryable":true}
 *
 * Schemas use `.passthrough()`-style tolerance (only the fields clients rely
 * on are validated) so additive server changes never break older clients.
 */

export const STREAM_EVENT_NAMES = ["start", "delta", "complete", "error"] as const;
export type StreamEventName = (typeof STREAM_EVENT_NAMES)[number];

export const streamStartDataSchema = z.object({ requestId: z.string() }).passthrough();

export const streamDeltaDataSchema = z.object({ text: z.string() }).passthrough();

/** The slice of the companion response mobile clients rely on. */
export const streamResponseSchema = z
  .object({
    message: z.string(),
    supportMode: z.enum([...SUPPORT_MODES, "presence"]).optional(),
    closingLine: z.string().nullable().optional(),
    safety: z.object({ level: z.string() }).passthrough().optional(),
    adaptationNotice: z.object({ summary: z.string() }).passthrough().nullable().optional(),
  })
  .passthrough();

export const streamCompleteDataSchema = z
  .object({
    conversationId: z.string().nullable(),
    response: streamResponseSchema,
    memoriesUsed: z.number().optional(),
    lightState: z.string().optional(),
  })
  .passthrough();

export const streamErrorDataSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  })
  .passthrough();

export type StreamStartData = z.output<typeof streamStartDataSchema>;
export type StreamDeltaData = z.output<typeof streamDeltaDataSchema>;
export type StreamResponse = z.output<typeof streamResponseSchema>;
export type StreamCompleteData = z.output<typeof streamCompleteDataSchema>;
export type StreamErrorData = z.output<typeof streamErrorDataSchema>;

/** A fully-parsed streamed event. */
export type CompanionStreamEvent =
  | { type: "start"; data: StreamStartData }
  | { type: "delta"; data: StreamDeltaData }
  | { type: "complete"; data: StreamCompleteData }
  | { type: "error"; data: StreamErrorData };

/**
 * Validate one raw SSE event (name + JSON payload) into a typed stream event.
 * Unknown event names and malformed payloads return null — clients skip them
 * rather than crash mid-stream.
 */
export function parseStreamEvent(eventName: string, rawData: string): CompanionStreamEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(rawData);
  } catch {
    return null;
  }
  switch (eventName) {
    case "start": {
      const parsed = streamStartDataSchema.safeParse(json);
      return parsed.success ? { type: "start", data: parsed.data } : null;
    }
    case "delta": {
      const parsed = streamDeltaDataSchema.safeParse(json);
      return parsed.success ? { type: "delta", data: parsed.data } : null;
    }
    case "complete": {
      const parsed = streamCompleteDataSchema.safeParse(json);
      return parsed.success ? { type: "complete", data: parsed.data } : null;
    }
    case "error": {
      const parsed = streamErrorDataSchema.safeParse(json);
      return parsed.success ? { type: "error", data: parsed.data } : null;
    }
    default:
      return null;
  }
}
