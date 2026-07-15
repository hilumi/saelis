-- Saelis v0.5 — Constellations & Stewardship
-- Idempotent where practical. Consent model unchanged: no memory becomes
-- active without user approval, and users see everything kept about them.

-- ---------------------------------------------------------------------------
-- companion_memories: typed classification + user-facing stewardship fields.
-- position_seed derives a stable Constellation star placement (coordinates
-- are never stored). use_count exists for future transparency work; only
-- last_used_at is written in this milestone.
-- ---------------------------------------------------------------------------
alter table public.companion_memories
  add column if not exists kind text not null default 'constellation',
  add column if not exists title text,
  add column if not exists reason text,
  add column if not exists position_seed text,
  add column if not exists last_used_at timestamptz,
  add column if not exists use_count integer not null default 0;

do $$ begin
  alter table public.companion_memories
    add constraint companion_memories_kind_check
      check (kind in ('constellation', 'north-star'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.companion_memories
    add constraint companion_memories_title_length check (char_length(title) <= 120);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.companion_memories
    add constraint companion_memories_content_length check (char_length(content) <= 1000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.companion_memories
    add constraint companion_memories_reason_length check (char_length(reason) <= 1000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.companion_memories
    add constraint companion_memories_use_count_nonnegative check (use_count >= 0);
exception when duplicate_object then null; end $$;

create index if not exists companion_memories_kind_idx on public.companion_memories (kind);
create index if not exists companion_memories_updated_at_idx
  on public.companion_memories (updated_at desc);

-- ---------------------------------------------------------------------------
-- app_roles: minimal authorization model.
-- Users may only SEE their own roles. There are deliberately NO insert/update/
-- delete policies: role assignment happens exclusively through a privileged
-- manual action (SQL editor / service role), so no user or client can ever
-- self-assign a role. No founder role bypasses memory/conversation RLS.
-- ---------------------------------------------------------------------------
create table if not exists public.app_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('founder', 'admin', 'support')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.app_roles enable row level security;

drop policy if exists "app_roles_select_own" on public.app_roles;
create policy "app_roles_select_own" on public.app_roles
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- stewardship_events: privacy-safe aggregate telemetry.
-- A strict column allowlist — there is NO freeform metadata column, and no
-- content-bearing column exists by construction. Analytics remains opt-in;
-- the application only inserts when the user allows product analytics.
-- ---------------------------------------------------------------------------
create table if not exists public.stewardship_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in (
    'companion_request_succeeded', 'companion_request_failed', 'companion_retry',
    'safety_urgent_override', 'safety_support_detected',
    'memory_proposal_shown', 'memory_proposal_accepted', 'memory_proposal_edited',
    'memory_proposal_rejected', 'memory_deleted', 'horizon_step_added',
    'response_feedback_positive', 'response_feedback_negative'
  )),
  provider text,
  model text,
  latency_bucket text check (latency_bucket in ('fast', 'normal', 'slow', 'very-slow')),
  support_mode text,
  safety_level text check (safety_level in ('none', 'support', 'urgent')),
  error_category text,
  memory_kind text check (memory_kind in ('constellation', 'north-star')),
  feedback_category text check (feedback_category in (
    'too-much-advice', 'too-long', 'too-generic', 'missed-need', 'tone', 'other'
  )),
  app_version text,
  created_at timestamptz not null default now()
);

create index if not exists stewardship_events_type_idx on public.stewardship_events (event_type);
create index if not exists stewardship_events_created_at_idx
  on public.stewardship_events (created_at desc);

alter table public.stewardship_events enable row level security;

drop policy if exists "stewardship_events_insert_own" on public.stewardship_events;
create policy "stewardship_events_insert_own" on public.stewardship_events
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "stewardship_events_select_own" on public.stewardship_events;
create policy "stewardship_events_select_own" on public.stewardship_events
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Founder aggregates: narrowly scoped SECURITY DEFINER functions.
-- They check founder authorization explicitly, pin the search path, and
-- return AGGREGATE COUNTS ONLY — no content-bearing column is selected
-- anywhere in their bodies. This is the only privileged read surface.
-- ---------------------------------------------------------------------------
create or replace function public.is_founder()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_roles
    where user_id = auth.uid() and role = 'founder'
  );
$$;

create or replace function public.stewardship_event_counts(days integer default 30)
returns table (event_type text, occurrences bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_founder() then
    raise exception 'not authorized';
  end if;
  return query
    select e.event_type, count(*)::bigint
    from public.stewardship_events e
    where e.created_at > now() - make_interval(days => days)
    group by e.event_type;
end;
$$;

create or replace function public.stewardship_memory_counts()
returns table (kind text, status text, occurrences bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_founder() then
    raise exception 'not authorized';
  end if;
  return query
    select m.kind, m.status, count(*)::bigint
    from public.companion_memories m
    group by m.kind, m.status;
end;
$$;
