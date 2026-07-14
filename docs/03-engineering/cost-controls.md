# Cost Controls

Server-enforced boundaries on every live generation. Exact model pricing changes over time and is
deliberately not hardcoded into application copy or code.

## Boundaries

| Control                                                          | Value                                    | Where                           |
| ---------------------------------------------------------------- | ---------------------------------------- | ------------------------------- |
| Max user-message length                                          | 4,000 chars (rejected, never trimmed)    | `companionRequestSchema`        |
| Max request body                                                 | 32 KB                                    | both companion routes           |
| Max recent turns                                                 | 12                                       | Light Engine + `context-budget` |
| Max total context characters                                     | 16,000 (turns + memories)                | `applyContextBudget`            |
| Max approved memories supplied                                   | 10                                       | context normalization + budget  |
| Max individual memory length                                     | 500 chars (provider-bound)               | `applyContextBudget`            |
| Max output tokens                                                | `OPENAI_MAX_OUTPUT_TOKENS` (default 900) | provider request                |
| Concurrent generations per user                                  | 1                                        | `idempotency.ts`                |
| Requests per minute / hour                                       | 20 / 150 (configurable at call sites)    | `rate-limit.ts`                 |
| Provider-side storage                                            | `store: false` by default                | provider request                |
| Tools / web search / file search / code interpreter / background | none, ever (this sprint)                 | provider request                |

## Context budget priority

When trimming is required, priority order (highest kept first):

1. Constitutional instruction
2. Current user message (**never silently trimmed** — overlength is rejected with a clear
   validation response)
3. Latest relevant Arrival
4. Companion profile
5. Most recent conversation turns (oldest trimmed first)
6. Approved memories (count- and length-capped)

## Idempotency

A client-generated `requestId` prevents double-click duplicates and double-charging: an in-flight
or recently completed id is rejected with 409, and a reused idempotent submission is never billed
twice because it never reaches the provider. In-memory only — documented single-instance
limitation.

## Usage visibility

Token counts and latency are logged as development-only structured telemetry without any message
content (`src/lib/telemetry.ts`) and surfaced to the client only as limited metadata in
development builds.
