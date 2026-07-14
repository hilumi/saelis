# OpenAI Provider

The live language engine beneath the Light Engine. The model renders language inside a LightPlan;
it never defines Saelis's identity, and every response is Zod-validated and plan-enforced before
anything is shown or persisted.

## Setup

1. Create an OpenAI API project and a **restricted** API key (Responses API access only) with a
   monthly usage limit.
2. In `.env.local` (never committed, never pasted into chat):
   ```
   OPENAI_API_KEY=sk-…            # server-only, never NEXT_PUBLIC_*
   OPENAI_MODEL=<your model id>
   COMPANION_PROVIDER=openai
   ```
3. Optional tuning: `OPENAI_REQUEST_TIMEOUT_MS` (default 30000), `OPENAI_MAX_OUTPUT_TOKENS`
   (default 900), `OPENAI_MAX_RETRIES` (default 1), `OPENAI_STORE_RESPONSES` (default false).
4. Restart the dev server and check `/api/health` → `"openAIConfigured": true`.
5. Return to mock mode any time with `COMPANION_PROVIDER=mock`.

## Server-only key handling

- The key is read only in `src/lib/ai/openai-client.ts`, which carries `import "server-only"` — a
  client-component import is a build error.
- The client is lazily initialized; builds succeed with blank variables and no connection is
  attempted at build time.
- The key is never logged, never returned to components, never exposed via `NEXT_PUBLIC_*`.
- Unknown `COMPANION_PROVIDER` values raise a typed configuration error.

## Request shape (Responses API)

- `model` from `OPENAI_MODEL`; no model is hardcoded.
- `instructions` = Light Engine developer instruction (constitution + voice + faith rule + output
  contract) + injection-resilience instruction + contextual instruction. User content lives ONLY
  in `input` turns and is treated as untrusted.
- `input` = budgeted recent turns + the current user message.
- `max_output_tokens` bounded; `store: false` by default; **no tools of any kind** (no web
  search, no file search, no code interpreter, no background mode).
- Structured output: strict `json_schema` (`src/lib/ai/openai-schema.ts`) mirroring
  `companionResponseSchema`; parity is proven by tests. Structured output is requested, never
  trusted — the full JSON is re-validated with Zod, then deterministically plan-enforced
  (`src/lib/ai/plan-enforcement.ts`).
- Never sent: database IDs beyond what's operationally required, emails, tokens, cookies, secret
  config, deleted/rejected/unapproved memories, hidden chain-of-thought, application logs.

## Error and retry behavior

Typed errors (`src/lib/ai/provider-errors.ts`) map to calm public messages; raw SDK errors, HTTP
bodies, and stack traces never reach the client. Retries: at most `OPENAI_MAX_RETRIES`, bounded
exponential backoff with jitter, `retry-after` honored, transient failures only (429/5xx/network/
timeout). Never retried: auth failures, validation failures, user abort, invalid requests, safety
overrides, configuration errors, or any attempt after user-visible text has streamed.

## Safety

The deterministic urgent pre-check runs BEFORE generation; urgent messages never reach the model
— the approved crisis response is returned instead (no memory proposal, no closing line, no
banter). The keyword pre-check remains incomplete and is never represented as comprehensive risk
detection. A future sprint layers provider-side safety classification behind the same override
semantics.
