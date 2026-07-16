# Security Policy — Saelis

Saelis holds personal, sometimes tender, user writing. Treat every security issue as serious.

## Reporting a vulnerability

Please do not open a public issue for security problems. Email the maintainer directly with
reproduction steps. You'll get an acknowledgment within a few days.

## Security model (Phase 1)

- **Authentication**: Supabase Auth (email/password). Sessions are refreshed in middleware and
  validated server-side with `auth.getUser()` — cookie contents are never trusted unverified.
- **Authorization**: Row-Level Security on every user-owned table. Policies allow users to
  select/insert/update/delete only their own rows; `conversation_turns` additionally verifies the
  parent conversation's ownership. No `using (true)` policies exist.
- **Identity**: user IDs are always derived from the server session. Request bodies contain no
  user ID field, and any that appeared would be ignored.
- **Secrets**:
  - `NEXT_PUBLIC_*` values are browser-safe by design (publishable key, project URL).
  - `SUPABASE_SECRET_KEY` and `OPENAI_API_KEY` are server-only. The privileged Supabase client
    lives in a `server-only` module (`src/lib/supabase/admin.ts`) and is used solely for account
    deletion.
  - No secrets are committed. `.env.local` is gitignored.
- **Input validation**: all request bodies and server-action inputs are validated with Zod.
  The companion API also enforces a request-size limit.
- **Rate limiting**: in-memory limiter for development. NOT sufficient for multi-instance
  production — replace with a managed limiter before scaling (documented in
  `src/lib/rate-limit.ts`).
- **Logging**: routine logs never include message content. Errors log types/digests only.
- **Headers**: nosniff, frame-deny, referrer and permissions policies set in `next.config.ts`.
  A strict CSP is future hardening work.
- **Redirects**: auth callback validates `next` as a same-origin relative path.

## Live AI provider (Phase 3)

- `OPENAI_API_KEY` is server-only: read exclusively inside a `server-only` module, lazily, never
  logged, never bundled for the browser, never exposed via `NEXT_PUBLIC_*`. No client component
  calls the model.
- The provider never queries the database; the application layer owns all persistence, still
  gated by privacy settings, and memory proposals are never auto-saved.
- Model output is untrusted: strict structured outputs are re-validated with Zod, then
  deterministically enforced against the Light Engine plan (no unsolicited actions, no forbidden
  memory proposals, no uninvited faith content, urgent-safety replacement).
- Prompt injection: user content is confined to input turns and explicitly declared untrusted;
  instructions forbid revealing developer prompts, private reasoning, or secrets; behavioral
  fixtures cover injection attempts.
- Urgent safety bypasses generation entirely — crisis messages are never sent to the provider.
- Requests set `store:false` by default, enable no tools, and are bounded by timeouts, output
  tokens, context budgets, per-user rate limits, and a one-active-generation guard.
- Provider errors map to typed classes with calm public copy; raw SDK errors, status bodies, and
  stack traces never reach the client.

## Roles and stewardship (Phase 5)

- `app_roles` has RLS with select-own only and NO write policies: roles cannot be self-assigned
  or client-asserted; assignment is a manual privileged database action. Founder routes verify
  the role server-side and 404 otherwise.
- The founder role grants no bypass of user-data RLS. Founder aggregates come exclusively from
  narrowly scoped SECURITY DEFINER functions that check authorization, pin search_path, and
  return counts only.
- `stewardship_events` is content-free by schema (fixed columns, no metadata field) and written
  only with the user's analytics opt-in. Memory edits re-check prohibited categories and reject
  obvious credential material.

## Adaptation and pattern data (v0.7 — Saelis Core)

- `adaptive_preferences`, `pattern_hypotheses`, and `pattern_evidence` all carry RLS
  (owner-only). Users can read, correct, pause, reset, and delete everything about themselves.
- Confidence and evidence counts can only INCREASE through two narrowly scoped SECURITY DEFINER
  functions (`record_adaptive_observation`, `record_pattern_evidence`) with fixed increments,
  scoped to `auth.uid()`, with pinned search_path. Ordinary updates are trigger-guarded to status
  changes and confidence DECREASES — a hostile client cannot inflate what Saelis "believes".
- Confidence is database-bounded to [0,1]; counts nonnegative; preference keys and pattern themes
  are check-constraint allowlists; preference values are size-capped jsonb; there is no freeform
  metadata column anywhere.
- Evidence summaries are content-free, length-capped descriptions selected by the application —
  user message text is never copied into adaptation storage (no shadow transcripts).
- Provider output never persists adaptation or pattern records: candidates pass a deterministic
  server-side screen (theme allowlist, uncertainty requirement, prohibited-wording ban, safety
  gate, consent gate, theme opt-outs), and provider-authored adaptation notices are discarded.
- Deterministic post-validation strips diagnoses, trauma-causation claims, protected-trait
  inferences, and third-party-certainty sentences from every response, and removes humor where
  the moment prohibits it.
- The founder has no row-level access to any adaptation table; the only privileged surface is
  `adaptation_aggregate_counts()` — counts by status, no content columns selected.
- Adaptation runs only with BOTH the adaptive-learning setting and companion-memory privacy
  setting enabled, and never harvests anything from an exchange with a non-`none` safety level.

## Known gaps (tracked for future phases)

- Content-Security-Policy is not yet strict.
- In-memory rate limiting is per-instance only.
- The safety pre-check is a keyword prototype and is documented as incomplete — it must never be
  represented as comprehensive crisis detection.
