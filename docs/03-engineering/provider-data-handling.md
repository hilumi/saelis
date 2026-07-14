# Provider Data Handling

Assumptions and boundaries for sending conversation content to OpenAI. **A legal/privacy review
of these assumptions is required before any public beta.**

## What is sent to the provider

Per request: the Light Engine's instructions, the budgeted recent turns, the current user
message, and (only when policy permits) user-approved active memories. Nothing else — no emails,
no auth material, no database internals, no deleted/rejected/unapproved memories, no hidden
reasoning.

## Storage posture

- `store: false` is the default (`OPENAI_STORE_RESPONSES=false`), so responses are not retained
  in provider-managed state where the API supports that control.
- **No provider-managed persistent conversation state is used.** Saelis's own database is the
  sole source of conversation context; `previous_response_id` is not used for core history.
- The provider response ID is stored only where the existing schema already supports it
  (`conversation_turns.provider_response_id`) and only for diagnostics.

## Assumptions requiring review

1. API traffic with `store:false` is handled under OpenAI's API data-usage terms (not used for
   training, bounded retention for abuse monitoring). Verify current terms before beta.
2. User content sent for generation is a disclosure to a processor; privacy policy and user-facing
   copy must say so plainly before beta.
3. Regional/data-residency requirements are unaddressed in this phase.
4. The urgent-safety bypass means crisis messages are NOT sent to the provider; this should be
   preserved by any future change.

## Application-side guarantees (unchanged)

Privacy settings gate persistence; memory requires explicit approval; routine logs carry no
message content; the API key exists only in server environment configuration.
