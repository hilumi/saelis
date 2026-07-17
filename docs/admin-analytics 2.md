# Saelis Her — Admin Analytics & Operational Observability

Phase 6 adds an internal, privacy-preserving product-operations dashboard for authorized Saelis
administrators. Read CLAUDE.md first; its safety, Restore-isolation, and privacy rules bind this
feature too.

## Purpose — and non-purpose

The dashboard answers operational product questions (onboarding funnels, pathway adoption, plan
and workout engagement, notification performance, aggregated safety-tier frequency, job health).

It is **not**: a clinical or diagnostic dashboard, a user-surveillance tool, a browser for
individual wellness/postpartum/journal/companion records, or a replacement for application logs
and error monitoring. No per-person drill-down exists anywhere, by construction.

## Privacy principles

- **Data minimization.** Events carry names, coarse allowlisted categories, buckets, and
  counters. Never stored: symptom notes, postpartum free text, journal text, companion messages,
  meal descriptions, pain locations, exact delivery dates, clearance notes, push endpoints or
  subscription secrets, IP addresses, tokens, request bodies.
- **Opt-in.** User-linked wellness events are recorded only when the user's privacy settings
  allow product analytics (`user_privacy_settings.allow_product_analytics`, default OFF) — the
  same rule the existing stewardship telemetry follows. Metrics therefore describe the
  consenting cohort and undercount total usage; this is deliberate and documented on no page as
  a defect.
- **De-identification on deletion.** `analytics_events.user_id` is `on delete set null`, and the
  in-app "Remove all my wellness data" flow additionally calls
  `anonymize_my_analytics_events()` so a user can detach their identity at any time while
  aggregate history survives.
- **Small-cohort protection.** Any dimensional breakdown (pathway, combination, workout type,
  Restore vs non-Restore, …) suppresses groups with fewer than the minimum cohort size and shows
  "Insufficient data" instead. Default minimum: **5** (override: `ANALYTICS_MIN_COHORT_SIZE`),
  centralized in `src/lib/analytics/config.ts` (`minCohortSize()`).
- **Defense in depth.** Strict per-event Zod allowlists (`.strict()`), a prohibited-key screen
  (`PROHIBITED_METADATA_KEY_FRAGMENTS`) that rejects anything resembling sensitive content even
  if an allowlist were mistaken, size caps (2 KB app-side, 8 KB DB check), and identifier-only
  value shapes for category fields.

## Access roles

Roles live in the existing `app_roles` table (RLS: users read only their own; **no write
policies whatsoever** — assignment is a privileged manual database action).

| Capability                   | founder | admin | product_analytics | support_admin |
| ---------------------------- | ------- | ----- | ----------------- | ------------- |
| Aggregated analytics pages   | ✓       | ✓     | ✓                 | —             |
| Operations / job diagnostics | ✓       | ✓     | —                 | —             |
| Aggregated CSV export        | ✓       | ✓     | —                 | —             |

`support_admin` is reserved and currently grants nothing here. Every admin page, route handler,
and query independently calls `requireAdminAccess()` (`src/lib/auth/admin-access.ts`,
server-only); unauthorized visitors receive a 404 (repository convention, as with `/founder`).
Failed attempts by authenticated users are audited (`admin_access_denied`). Navigation
visibility and feature flags are never access control.

### Manual role assignment

Roles are **never** granted by the application. In the Supabase SQL editor (or via service
role), run e.g.:

```sql
insert into public.app_roles (user_id, role)
values ('<user-uuid>', 'product_analytics')
on conflict do nothing;
-- revoke:
delete from public.app_roles where user_id = '<user-uuid>' and role = 'product_analytics';
```

Record who was granted what, when, and why in your operations log.

## Route map

| Route                               | Content                                            | Capability  |
| ----------------------------------- | -------------------------------------------------- | ----------- |
| `/admin`                            | Redirect to `/admin/analytics`                     | analytics   |
| `/admin/analytics`                  | Overview: cards, funnel, trends, pathways          | analytics   |
| `/admin/analytics/saelis-her`       | Alias → `/admin/analytics`                         | analytics   |
| `/admin/analytics/onboarding`       | Funnel detail, completion/abandonment, median time | analytics   |
| `/admin/analytics/engagement`       | Activity trends, retention (D1/D7/D14/D30)         | analytics   |
| `/admin/analytics/pathways`         | Distribution, combinations, workout types          | analytics   |
| `/admin/analytics/notifications`    | Delivery/open/suppression (awaits push transport)  | analytics   |
| `/admin/analytics/safety`           | Aggregated tiers, trends — no symptoms, ever       | analytics   |
| `/admin/analytics/export` (GET)     | Aggregated CSV (flag-gated, audited)               | export      |
| `/admin/operations`                 | Job health, recent runs, ingestion volume          | operations  |
| `/api/cron/analytics-rollup` (POST) | Daily rollup trigger (bearer-authorized)           | CRON_SECRET |

`/admin` is in `PROTECTED_PREFIXES` (middleware) _and_ every page re-checks authorization
server-side.

## Event taxonomy and versioning

`src/lib/analytics/taxonomy.ts` defines the closed `AnalyticsEventName` union across ten groups
(onboarding, pathways, daily planning, movement, nutrition, progress, notifications, companion,
safety, system). Every event has an explicit version (`ANALYTICS_EVENT_VERSIONS`, all `1`
today). Bump an event's version when its meaning or metadata shape changes; never reuse a name
with different semantics at the same version. Unknown names are rejected at every boundary.

`SERVER_ONLY_EVENTS` (all safety, notification, and system events, plus plan-outcome and
milestone events) are rejected for client-originated sources — a client can never claim a
safety tier, a delivery, or a job outcome.

### Allowed metadata (allowlisted per event)

Onboarding step key · pathway key · pathway count · workout type/location · duration bucket ·
adaptation level · safety tier · broad reason category · nutrition mode · meal type · logged-via
· notification category · suppression reason · milestone type · error category · client/device
category · app version. Values on category fields must be identifier-shaped (max 60 chars).

### Prohibited metadata

Anything content-bearing: free text, symptoms, notes, journals, messages, descriptions, emails,
names, phones, addresses, IPs, tokens, secrets, endpoints, subscriptions, birth/delivery dates,
weights, clearance notes, restrictions, pain locations, request bodies, stack traces. Enforced
by the strict schemas AND the key-fragment screen; tested.

### Safety analytics limitations

Safety events carry ONLY the tier (event name), one broad reason category
(`toSafetyReasonCategory` collapses the engine's typed codes into eight coarse groups), the
plan module affected, active pathway keys, and a day bucket — deduplicated to one per user, day,
and tier. Counts reflect consenting users only. This is an operational frequency signal, not
clinical surveillance, and supports no drill-down.

## Database

Migration: `supabase/migrations/00009_saelis_her_admin_analytics.sql` (idempotent).

- `analytics_events` — raw minimized events. `user_id` nullable, `on delete set null`
  (de-identify, don't destroy aggregates — a deliberate, documented deviation from the cascade
  convention for user-owned tables). Indexes: (event_name, occurred_at), occurred_at,
  (user_id, occurred_at), (source, occurred_at), GIN on pathway_keys.
- `analytics_daily_rollups` — de-identified daily aggregates, PK (rollup_date, metric_key,
  dimension_key, dimension_value).
- `analytics_job_runs` — job observability (statuses: running/completed/partial/failed; broad
  error categories only).
- **RLS: enabled on all three with ZERO policies — deny by default.** No authenticated user can
  read or write them through the API. All access is server-only via the service-role client:
  writes through `src/lib/analytics/record.ts`, reads through the admin services after
  `requireAdminAccess`. There is deliberately NO client ingestion endpoint in this phase.
- `anonymize_my_analytics_events()` — SECURITY DEFINER, scoped to `auth.uid()`.
- `app_roles` check extended with `product_analytics`, `support_admin`.
- `stewardship_events` check extended with the admin audit types.

### Data-retention proposal (not auto-enforced)

Raw `analytics_events`: **13 months** (`ANALYTICS_RAW_RETENTION_MONTHS`). De-identified rollups
may be retained longer. The repository has no retention mechanism, and Phase 6 deletes nothing.
Safe design when you add it: a cron-authorized job that (1) records a job run, (2) deletes
`analytics_events` where `occurred_at < now() - interval '13 months'` in small batches with row
limits, (3) never touches rollups, (4) is idempotent and observable in `/admin/operations`.

## Recording service

`src/lib/analytics/record.ts` (server-only): `recordAnalyticsEvent`,
`recordAuthenticatedAnalyticsEvent` (opt-in check), `recordSystemAnalyticsEvent`,
`recordNotificationAnalyticsEvent`, `recordSafetyAnalyticsEvent`, `recordJobRun`,
`completeJobRun`, `failJobRun`. Guarantees: server-derived identity; strict validation;
server-only event source enforcement; per-user rate limit (60/min via the existing limiter);
best-effort dedupe keys (in-memory, single-instance — same documented limitation as the rate
limiter); never throws; content-free failure logging with escalation after repeated systemic
failures. `src/lib/analytics/instrument.ts` adapts authoritative product moments (stored plan,
persisted workout log, deduplicated milestone, enrollment change) into events.

## Metric definitions

- **Active user**: at least one qualifying event in the period —
  `ACTIVE_USER_QUALIFYING_EVENTS` (check-in completed, plan generated, workout started/
  completed/partial, meal/protein/hydration logged, pathway changes, Reset activated, progress
  viewed, companion opened, onboarding completed). Passive views and notification deliveries
  never qualify. DAU/WAU/MAU are this rule over 1/7/30-day windows.
- **Onboarding funnel**: distinct users per completed step, in the canonical order (welcome →
  pathways → goals → body → movement → nutrition → [restore] → [rhythm] → [phoenix] →
  notifications → review); conversion = step users ÷ previous step users; completion = completers
  ÷ starters; abandonment = 1 − completion; median start→completion time only when the cohort ≥
  minimum.
- **Workout completion rate** = completed ÷ (completed + partial + skipped).
  **Replacement rate** = replaced ÷ (outcomes + replaced).
  **Plan follow-through** = completed workouts ÷ generated plans (labeled an approximation —
  daily-plan status transitions have no product mechanism yet).
- **Notification rates** = delivered÷scheduled, opened÷delivered, suppressed÷scheduled,
  failed÷scheduled (all await the push transport).
- **Retention D1/D7/D14/D30**: share of onboarding completers with a qualifying event ≥ N days
  after completion, within the selected window; cohort-protected.
- Rates with a zero denominator render "—", never fake zeros or spurious precision.

## Rollup architecture

`src/lib/analytics/rollup.ts`: pure `computeDailyRollupRows` (dimension allowlist `all` |
`pathway`; cohort-thresholded) + `runDailyAnalyticsRollup` (records its own job run; upserts on
the composite PK → **idempotent reruns**; late events handled by re-running the day via
`?date=`). The dashboard currently aggregates raw events per request (fine at beta scale, hard
capped at 50k rows/query); rollups are the pre-aggregated path for longer horizons.

### Scheduling (manual — nothing runs automatically)

- Env: `CRON_SECRET` (server-only; route is 503 until set).
- Any external scheduler (e.g. a platform cron) POSTs daily after 00:10 UTC:
  `Authorization: Bearer $CRON_SECRET` → `/api/cron/analytics-rollup`.
- Local test: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
http://localhost:3000/api/cron/analytics-rollup`
- Backfill: append `?date=2026-07-01`. Retries are safe (idempotent upsert).

## Job monitoring

`/admin/operations` shows per-job health (healthy / degraded / failing / unknown) from central
deterministic thresholds (`OPERATIONS_HEALTH_RULES`: stale-running > 30 min; degraded ≥ 5%
failures; failing ≥ 25% or stale; unknown when silent > 48 h), recent runs (duration, counts,
broad error category), and 14-day ingestion volume. It is explicitly not a substitute for full
application monitoring; integrate a real monitoring platform for production.

## Export restrictions

`GET /admin/analytics/export` exists but is **disabled by default**
(`ANALYTICS_EXPORTS_ENABLED=true` to enable) and restricted to founder/admin. It emits only
pre-aggregated, cohort-protected rows (metric, dimension, date, value) — the row type cannot
carry user ids, emails, metadata, or free text. Cells are CSV-injection-proofed; the filename is
fixed-shape with validated dates; every export is audited (`admin_export_generated`). There is
no raw-event export, deliberately.

## Feature flags (server env; never a substitute for authorization)

`ADMIN_ANALYTICS_ENABLED` (default on) · `ANALYTICS_EVENT_INGESTION_ENABLED` (default on) ·
`ANALYTICS_ROLLUPS_ENABLED` (default on) · `ANALYTICS_EXPORTS_ENABLED` (default OFF).

## Environment variables

| Variable                    | Purpose                                   | Required      |
| --------------------------- | ----------------------------------------- | ------------- |
| `SUPABASE_SECRET_KEY`       | All analytics writes/reads (existing var) | for analytics |
| `CRON_SECRET`               | Rollup route authorization                | for rollups   |
| `ANALYTICS_MIN_COHORT_SIZE` | Minimum cohort (default 5)                | no            |
| Flags above                 | Behavior gates                            | no            |

Without `SUPABASE_SECRET_KEY`, recording is a safe no-op and admin pages show a calm
"unavailable" state — user workflows are never affected.

## Local testing & migration process

```sh
npx vitest run src/lib/analytics src/lib/auth "src/app/(app)/admin" src/app/api/cron
npx supabase db push        # applies 00007 + 00008 + 00009 — review first; staging first
npx supabase gen types typescript --project-id <id> --schema public \
  > src/lib/supabase/generated.types.ts   # then reconcile the hand-written boundary
```

## Production enablement checklist

1. Apply 00009 to staging; verify RLS denies authenticated reads/writes on all three tables.
2. Assign roles manually (above); verify a role-less account gets 404 on every /admin route.
3. Set `CRON_SECRET`; schedule the rollup; confirm a run appears in /admin/operations.
4. Leave exports disabled unless a concrete need passes privacy review.

## Incident-response considerations

If sensitive data is ever found in analytics (should be schema-impossible): treat as an
incident — snapshot the offending rows' ids only, delete the rows, add a failing test
reproducing the leak path, fix, and document. If an admin account is compromised, remove its
`app_roles` rows (access dies immediately server-side) and rotate `CRON_SECRET` /
`SUPABASE_SECRET_KEY`. Audit trails: `stewardship_events` admin_* types.

## Known limitations

Opt-in analytics undercounts (by design); in-memory rate limiting/dedupe are single-instance;
dashboard aggregation reads raw events per request (50k cap) pending rollup-backed reads;
notification metrics idle until push delivery exists; plan-completion is approximated;
workout_viewed/started, exercise-level, tracking-toggle, abandonment, and
companion_opened_from_wellness events are defined but not yet instrumented; retention needs
windows longer than the selected range to mature; no timezone-aware day bucketing (UTC days).
