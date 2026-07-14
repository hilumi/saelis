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

## Known gaps (tracked for future phases)

- Content-Security-Policy is not yet strict.
- In-memory rate limiting is per-instance only.
- The safety pre-check is a keyword prototype and is documented as incomplete — it must never be
  represented as comprehensive crisis detection.
