# Saelis Her — Phase 6: Admin Analytics & Operational Observability

Date: 2026-07-17 · Scope: internal, privacy-preserving admin analytics + operations dashboard.
Not committed, not pushed, not deployed; no migrations applied; no secrets touched; no roles
assigned. Full feature documentation: `docs/admin-analytics.md`.

## What was built

A deny-by-default analytics pipeline and admin dashboard: a typed, versioned event taxonomy
(10 groups) with strict per-event Zod metadata allowlists and a prohibited-key screen; a
server-only recording service (service-role writes; user opt-in honored; server-authoritative
events unreachable from clients; rate-limited; dedup-keyed; never throws); instrumentation at
authoritative points in the existing Her flows; pure, tested aggregation (funnel, DAU/WAU
trends, distributions, combinations, retention, safety tiers) with centralized small-cohort
protection; an idempotent daily rollup behind a bearer-authorized cron route; server-authorized
admin pages built from the existing design system; content-free admin audit events on the
existing stewardship system; and documentation.

## Migration

`supabase/migrations/00009_saelis_her_admin_analytics.sql` (idempotent, unapplied):
`analytics_events`, `analytics_daily_rollups`, `analytics_job_runs` (all with RLS enabled and
ZERO policies — deny by default), indexes per access pattern (incl. GIN on pathway_keys),
`anonymize_my_analytics_events()` SECURITY DEFINER, `app_roles` check extended with
`product_analytics` / `support_admin`, `stewardship_events` check extended with five admin
audit types. `analytics_events.user_id` is nullable `on delete set null` — deliberate,
documented deviation from the cascade rule: deletion de-identifies without destroying
aggregates, and the in-app wellness deletion calls the anonymize function explicitly.

## Security model

Reused architecture: `app_roles` (manual assignment only; select-own RLS), 404-on-unauthorized
convention from `/founder`, stewardship audit events, `requireUser`/`getOptionalUser`, the
in-memory rate limiter, server-only admin client. New server-only helper
`src/lib/auth/admin-access.ts`: capability map (analytics: founder/admin/product_analytics;
operations + export: founder/admin; support_admin: nothing yet), deny by default, denial
auditing. Every admin page, the export route, and the cron route verify authorization
independently; `/admin` added to middleware `PROTECTED_PREFIXES` as an additional layer, never
the primary one. Feature flags gate behavior but never replace authorization.

## Privacy protections

Opt-in recording (`allow_product_analytics`, default off — user-linked events for consenting
users only); coarse allowlisted metadata with `.strict()` schemas; prohibited-key fragments as
defense in depth; identifier-shaped category values (free text cannot validate); 2 KB/12-key
app caps + 8 KB DB check; route normalization (query strings stripped, ids collapsed); safety
events reduced to tier + one broad reason category + module + day bucket, deduplicated per
user/day/tier; postpartum check-in content never reaches analytics; companion events carry no
text; minimum-cohort suppression (default 5, `ANALYTICS_MIN_COHORT_SIZE`) across every
dimensional view, rollup dimension, and export; "Insufficient data" states; no per-user
drill-down surface anywhere; exports aggregated-only, flag-gated, injection-proofed, audited.

## Events instrumented (authoritative points)

- Onboarding: started (welcome save, deduped), step completed (step key only), completed
  (after the completion transaction; pathway count).
- Pathways: enrolled/paused/resumed/archived (+ reset_activated/deactivated) after successful
  writes.
- Daily planning: check-in completed; plan generated/refreshed/replaced only when the engine
  actually ran (idempotent stored-plan returns record nothing); reduced/recovery-only/
  safety-hold shape events; safety tier from the deterministic engine's output.
- Movement: workout completed/partial/skipped from the persisted log; pain/symptom occurrence
  flags (which symptom never leaves the wellness tables); workout_replaced on explicit
  replacement.
- Nutrition: meal_logged (type + provenance only), protein/hydration quick adds, meal plan
  generated/regenerated (deduped per week), meal_replaced.
- Milestones: milestone_achieved after doubly-deduplicated creation (type only).
- Companion: context requested / safety boundary applied — fire-and-forget, no behavior change.
- Deferred (taxonomy ready, no authoritative point yet): notification delivery lifecycle (no
  transport exists), workout_viewed/started, exercise-level events, tracking toggles,
  onboarding_abandoned/resumed, progress_dashboard_viewed, daily-plan status transitions.

## Aggregation, rollups, operations

Pure tested metrics module (overview counters/rates, funnel with median-time cohort gate,
distributions, pathway combinations, active-user trend, retention D1/7/14/30, safety
aggregation); active-user definition centralized (`ACTIVE_USER_QUALIFYING_EVENTS` — no passive
events). `runDailyAnalyticsRollup`: previous UTC day, dimension allowlist (all|pathway),
cohort-thresholded, idempotent upsert on the composite PK, self-recording job runs, `?date=`
backfill for late events; POST `/api/cron/analytics-rollup` requires `Bearer ${CRON_SECRET}`
(503 until configured; nothing scheduled automatically). `/admin/operations`: deterministic
health thresholds (stale > 30 min, degraded ≥ 5%, failing ≥ 25%, unknown > 48 h silent),
recent runs (duration/counts/broad categories), 14-day ingestion volume; explicitly not a
monitoring replacement.

## Routes created

`/admin`, `/admin/analytics` (+ `saelis-her` alias, `onboarding`, `engagement`, `pathways`,
`notifications`, `safety`), `/admin/analytics/export` (GET, flag-gated), `/admin/operations`,
`/api/cron/analytics-rollup` (POST). UI: existing design system (GlassSurface/ScreenHeader),
server components throughout, URL-state date controls (7/30/90 days + custom range + previous-
period comparison), accessible SVG trends with textual summaries, no color-only distinctions,
empty/insufficient/unavailable states, responsive grids, privacy note on every page.

## Tests (13 new files, ~120 new tests, all passing)

taxonomy (uniqueness, versions, server-only sets, prohibited keys, route normalization, reason
coarsening) · schemas (accept/reject matrix: unknown events/properties/versions, oversized,
sensitive keys, smuggled user_id, free-text values, malformed pathways, safety metadata) ·
record (server identity, opt-in/opt-out, server-only-from-client rejection, dedupe, rate limit,
unconfigured no-op, safety coarsening end-to-end) · metrics (funnel, rates, distributions,
combinations, cohort suppression, retention, empty data) · rollup (determinism/idempotence, PK
uniqueness, dimension allowlist, cohort threshold, no identifiers) · health (stale/failing/
degraded/unknown) · csv (injection, escaping, filename) · admin-access (unauth/ordinary
denied + audited, per-role capabilities, flag behavior) · cron route (503/401/400/200, flag) ·
admin overview page (denied without server auth, aggregates render, audit recorded,
insufficient-data state, no identifiers, calm error state).

## Files

New: migration 00009; `src/lib/analytics/{taxonomy,schemas,config,record,instrument,metrics,
rollup,health,csv,admin-service}.ts` (+7 test files); `src/lib/db/queries/analytics/{events,
rollups,job-runs}.ts`; `src/lib/auth/admin-access.ts` (+test); `src/components/admin/{admin-
shell,admin-nav,metric-card,bar-list,trend-chart,funnel,date-range-controls}.tsx`; the admin
pages, the export route, and the cron route (+2 tests); `docs/admin-analytics.md`; this report.
Modified: `src/types/database.ts`, `src/lib/supabase/types.ts`, `src/lib/db/queries/roles.ts`,
`src/middleware.ts`, `src/app/(app)/wellness-actions.ts`, `src/app/(app)/wellness-plan-
actions.ts`, `src/app/(app)/wellness/her/page.tsx`, `src/lib/wellness/companion-context-
service.ts`, `CLAUDE.md`, `docs/saelis-her.md`, `.env.example`.

## Environment variables (all documented in .env.example; none required for user flows)

`CRON_SECRET` (rollup route), `ANALYTICS_MIN_COHORT_SIZE` (default 5),
`ADMIN_ANALYTICS_ENABLED` / `ANALYTICS_EVENT_INGESTION_ENABLED` / `ANALYTICS_ROLLUPS_ENABLED`
(default on) / `ANALYTICS_EXPORTS_ENABLED` (default OFF). Analytics writes/reads use the
existing `SUPABASE_SECRET_KEY`; without it, recording is a safe no-op.

## Manual steps

DB: `npx supabase db push` (00007–00009, staging first), then regenerate types and reconcile
the hand-written boundary. Roles: manual SQL inserts into `app_roles` only (process in
docs/admin-analytics.md). Rollups: set `CRON_SECRET`, schedule an external daily POST.

## Deferred items

Secure raw-event export (aggregated-only shipped; raw export deliberately not built);
notification lifecycle instrumentation (needs the push worker); rollup-backed dashboard reads;
retention deletion job (proposal documented); view-level events; plan-status transitions;
Restore vs non-Restore funnel split UI (cohort logic ready); managed rate limiting/dedupe for
multi-instance deployments (pre-existing repo-wide item).

## Remaining privacy/security risks

Opt-in undercount could tempt future weakening of the opt-in rule (don't); in-memory
dedupe/rate limits reset per instance; `workout_type` is coarsened from a short free field —
the identifier shape + 40-char cap keep it category-like, but keep an eye on cardinality;
admin pages aggregate at request time (bounded at 50k rows) until rollup-backed reads land;
the stewardship audit trail records that admin surfaces were used, not which filters/values.
SQL for 00009 has not executed against a live Postgres (repo-wide gate from Phase 5).

## Recommended Phase 7 focus

The v0.9 launch gates: staging migration + type regeneration, push-notification delivery on the
tested policy layer (which unlocks the notification analytics), weekly progression application,
rollup-backed dashboard reads + retention job, legal/clinical copy review — then the
invite-only cohort.
