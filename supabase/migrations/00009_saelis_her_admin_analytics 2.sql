-- Saelis Her v0.10 — Phase 6: privacy-preserving admin analytics and
-- operational observability.
--
-- Commitments (see CLAUDE.md and docs/admin-analytics.md):
--   * Aggregated, de-identified product analytics only. No symptom text, no
--     journal text, no companion messages, no meal descriptions, no clearance
--     notes, no notification endpoints, no tokens, and no IP addresses can be
--     stored here — the application-side Zod allowlist is the write boundary,
--     and this schema stores only names, coarse categories, and counters.
--   * DENY BY DEFAULT: RLS is enabled on every analytics table with ZERO
--     policies. Ordinary authenticated users can neither read nor write these
--     tables through the API. All writes and reads happen through server-only
--     code using the service-role client, after explicit server-side
--     authorization for reads (admin / product_analytics roles).
--   * Roles are NEVER self-assigned. app_roles keeps no insert/update/delete
--     policies; assignment remains a privileged manual database action.
--   * Idempotent DDL; sequential numbering; no data is deleted automatically.
--     Proposed retention (documented, not enforced here): 13 months for raw
--     analytics_events; de-identified rollups may be retained longer.

-- ---------------------------------------------------------------------------
-- 1. Administrative roles for analytics.
--    Extends the existing minimal role model (founder / admin / support) with
--    'product_analytics' (aggregated analytics read-only) and 'support_admin'
--    (reserved; no analytics access in this phase). Existing rows are
--    unaffected. Assignment stays manual (SQL editor / service role).
-- ---------------------------------------------------------------------------
alter table public.app_roles
  drop constraint if exists app_roles_role_check;
alter table public.app_roles
  add constraint app_roles_role_check check (role in (
    'founder', 'admin', 'support', 'product_analytics', 'support_admin'
  ));

-- ---------------------------------------------------------------------------
-- 2. analytics_events — raw, minimized product events.
--    user_id is NULLABLE and set to NULL when the profile is deleted: the
--    aggregate count survives, the identity does not (de-identification on
--    deletion; deviates deliberately from the cascade convention and is
--    documented in docs/admin-analytics.md). A user can also detach their
--    events at any time via anonymize_my_analytics_events() below, which the
--    in-app wellness deletion flow calls.
--    metadata is a strictly allowlisted, size-capped JSONB written only by
--    the server after Zod validation — never accepted raw from clients.
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (char_length(event_name) between 3 and 80),
  event_version integer not null default 1 check (event_version >= 1),
  occurred_at timestamptz not null default now(),
  user_id uuid references public.profiles (id) on delete set null,
  anonymous_session_id uuid,
  pathway_keys text[] not null default '{}',
  source text not null check (source in (
    'web', 'server', 'cron', 'notification_worker', 'companion', 'migration', 'test'
  )),
  route text check (char_length(route) <= 120),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Size guard (defense in depth; the Zod boundary enforces a smaller cap).
do $$ begin
  alter table public.analytics_events
    add constraint analytics_events_metadata_size check (pg_column_size(metadata) <= 8192);
exception when duplicate_object then null; end $$;

create index if not exists analytics_events_name_occurred_idx
  on public.analytics_events (event_name, occurred_at desc);
create index if not exists analytics_events_occurred_idx
  on public.analytics_events (occurred_at desc);
create index if not exists analytics_events_user_occurred_idx
  on public.analytics_events (user_id, occurred_at desc);
create index if not exists analytics_events_source_occurred_idx
  on public.analytics_events (source, occurred_at desc);
create index if not exists analytics_events_pathways_gin_idx
  on public.analytics_events using gin (pathway_keys);

-- DENY BY DEFAULT: RLS on, no policies. Service-role (server-only) access only.
alter table public.analytics_events enable row level security;

-- ---------------------------------------------------------------------------
-- 3. analytics_daily_rollups — pre-aggregated daily metrics.
--    De-identified by construction: only metric keys, dimensions, and numeric
--    values. Dimension values below the minimum cohort size are never written
--    (enforced by the rollup job's allowlist + threshold logic).
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_daily_rollups (
  rollup_date date not null,
  metric_key text not null check (char_length(metric_key) between 3 and 80),
  dimension_key text not null default 'all' check (char_length(dimension_key) <= 40),
  dimension_value text not null default 'all' check (char_length(dimension_value) <= 80),
  metric_value numeric not null,
  unique_users integer,
  metadata jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  primary key (rollup_date, metric_key, dimension_key, dimension_value)
);

create index if not exists analytics_daily_rollups_metric_idx
  on public.analytics_daily_rollups (metric_key, rollup_date desc);

alter table public.analytics_daily_rollups enable row level security;

-- ---------------------------------------------------------------------------
-- 4. analytics_job_runs — operational job observability.
--    Broad error categories only; no secrets, no raw error bodies, no
--    stack traces (application logging handles technical diagnostics).
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null check (char_length(job_key) between 3 and 60),
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('running', 'completed', 'partial', 'failed')),
  processed_count integer,
  success_count integer,
  failure_count integer,
  error_category text check (char_length(error_category) <= 60),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_job_runs_key_started_idx
  on public.analytics_job_runs (job_key, started_at desc);
create index if not exists analytics_job_runs_status_idx
  on public.analytics_job_runs (status, started_at desc);

alter table public.analytics_job_runs enable row level security;

-- ---------------------------------------------------------------------------
-- 5. User-controlled de-identification.
--    Lets a signed-in user detach their identity from all of their analytics
--    events without deleting aggregate history. Called by the in-app
--    "Remove all my wellness data" flow (and safe to call any time).
--    SECURITY DEFINER because analytics_events has no user policies;
--    the scope is strictly auth.uid().
-- ---------------------------------------------------------------------------
create or replace function public.anonymize_my_analytics_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;
  update public.analytics_events
    set user_id = null, anonymous_session_id = null
    where user_id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Admin audit events — reuse the existing content-free stewardship system.
--    Categories only; no filters' values, no query results, no exported data.
-- ---------------------------------------------------------------------------
alter table public.stewardship_events
  drop constraint if exists stewardship_events_event_type_check;
alter table public.stewardship_events
  add constraint stewardship_events_event_type_check check (event_type in (
    'companion_request_succeeded', 'companion_request_failed', 'companion_retry',
    'safety_urgent_override', 'safety_support_detected',
    'memory_proposal_shown', 'memory_proposal_accepted', 'memory_proposal_edited',
    'memory_proposal_rejected', 'memory_deleted', 'horizon_step_added',
    'response_feedback_positive', 'response_feedback_negative',
    'adaptation_enabled', 'adaptation_disabled', 'adaptation_corrected',
    'adaptation_reset', 'pattern_insight_surfaced', 'pattern_insight_accepted',
    'pattern_insight_rejected', 'humor_feedback_negative', 'challenge_feedback_negative',
    -- Phase 6 admin audit (content-free; recorded for the admin's own actions)
    'admin_analytics_viewed', 'admin_operations_viewed', 'admin_export_generated',
    'admin_rollup_triggered', 'admin_access_denied'
  ));
