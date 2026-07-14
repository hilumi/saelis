# Streaming Protocol

`POST /api/companion/stream` returns **Server-Sent Events** (`text/event-stream`). This is the
single chosen format.

## Events

```text
event: start
data: {"requestId":"..."}

event: delta
data: {"text":"..."}

event: complete
data: {"conversationId":"...","response":{...CompanionResponse},"lightState":"listening"}

event: error
data: {"code":"provider-timeout","message":"calm public message","retryable":true}
```

## Two-layer design

The Responses API streams the strict-JSON structured output as text deltas. The server:

1. assembles the complete JSON,
2. extracts ONLY the `message` field's decoded text incrementally
   (`src/lib/ai/message-streamer.ts`) and forwards it as `delta` events — raw partial JSON never
   reaches the client,
3. on completion, Zod-validates the full object, applies plan enforcement and the closing policy,
   and emits it in the `complete` event.

Partial JSON is never treated as application state. One provider request serves both layers.

## Request

JSON body: `{ message, conversationId|null, requestId }`. `requestId` is a client-generated,
non-secret idempotency key (8–64 chars, `[a-zA-Z0-9-]`). Duplicates and concurrent generations
are rejected with 409 (see `src/lib/idempotency.ts`; in-memory, single-instance — a shared store
is required for multi-instance deployments).

## Transaction policy

**Nothing is persisted until the final structured response validates.** On success (and only when
the user's privacy settings allow history), the user turn and assistant turn are saved together.
On failure or abort, nothing is saved and the client preserves the draft — an incomplete
assistant turn cannot exist. Memory proposals are never persisted by this route; only the
explicit user-approval action writes memories.

## Abort

The client uses `AbortController`; "Stop for now" aborts the fetch. Browser disconnects cancel
the provider request via the route's abort plumbing. Aborts close the stream quietly — no error
event, no persistence, The Light returns to resting.

## Headers

`Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache, no-transform`,
`X-Accel-Buffering: no`. The stream closes after `complete` or `error`.

## Mock mode

In `COMPANION_PROVIDER=mock`, the same endpoint emits the deterministic mock response as a single
`delta` followed by `complete`, so the UI has exactly one code path.
