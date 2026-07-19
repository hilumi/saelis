/**
 * @saelis/shared — types and validation schemas shared between the web app
 * and the mobile app.
 *
 * Rules:
 * - Framework-free: no Next.js, React, or browser/DOM APIs. Zod only.
 * - Mirrors the authoritative web contracts (`src/lib/validation/companion.ts`,
 *   `src/lib/constants.ts`, `src/types/actions.ts`). The web server remains
 *   the source of truth; treat drift as a bug.
 * - No user identity in request shapes — identity always comes from the
 *   server session, never from client input.
 */

export {
  COMPANION_MAX_MESSAGE_LENGTH,
  SUPPORT_MODES,
  TURN_ROLES,
  type SupportMode,
  type TurnRole,
} from "./companion/constants";
export {
  companionRequestSchema,
  companionStreamRequestSchema,
  type CompanionApiRequest,
  type CompanionStreamApiRequest,
} from "./companion/schemas";
export type { ActionResult, ApiFailure, ApiResult, ApiSuccess } from "./api/result";
export { apiErrorBodySchema, parseApiError } from "./api/errors";
export type { ApiErrorBody, ParsedApiError } from "./api/errors";
export {
  STREAM_EVENT_NAMES,
  parseStreamEvent,
  streamCompleteDataSchema,
  streamDeltaDataSchema,
  streamErrorDataSchema,
  streamResponseSchema,
  streamStartDataSchema,
} from "./companion/stream";
export type {
  CompanionStreamEvent,
  StreamCompleteData,
  StreamDeltaData,
  StreamErrorData,
  StreamEventName,
  StreamResponse,
  StreamStartData,
} from "./companion/stream";
export type {
  ConversationStatus,
  ConversationSummary,
  ConversationTurn,
} from "./conversation/types";
