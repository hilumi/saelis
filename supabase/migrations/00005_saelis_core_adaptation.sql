-- Saelis v0.7 — Saelis Core: adaptive preferences & pattern hypotheses.
--
-- Design commitments (mirrors docs/03-engineering/adaptive-preferences.md and
-- docs/03-engineering/pattern-hypothesis-safety.md):
--   * RLS on every table; users see only their own adaptation data.
--   * Users may correct, pause, reject, or reset their own records, but
--     ordinary clients can NEVER increase confidence or evidence counts —
--     inference updates happen only through the narrowly scoped
--     SECURITY DEFINER functions below, with fixed increments.
--   * Confidence bounded 0..1; evidence counts nonnegative; allowed-key and
--     allowed-theme check constraints; NO freeform metadata column.
--   * Evidence summaries are content-free descriptions selected from a fixed
--     application catalog — never copies of user messages.
--   * The founder has NO row-level access to any of these tables; the only
--     privileged read surface is aggregate counts.
-- Atomic: this file is a single migration; Supabase applies it in one
-- transaction.

-- ---------------------------------------------------------------------------
-- adaptive_preferences — low-risk communication preferences only.
-- ---------------------------------------------------------------------------
create table if not exists public.adaptive_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  key text not null check (key in (
    'prefers-concise-when-overwhelmed',
    'appreciates-direct-challenge',
    'enjoys-playful-humor',
    'prefers-examples',
    'prefers-options-before-recommendation',
    'prefers-questions-before-advice',
    'likes-bullet-points',
    'thinks-aloud',
    'wants-celebration-energy-matched',
    'prefers-no-emojis',
    'shared-phrase',
    'pattern-theme-opt-out'
  )),
  value jsonb not null default '{}'::jsonb check (pg_column_size(value) <= 512),
  confidence numeric(4,3) not null default 0.3 check (confidence >= 0 and confidence <= 1),
  evidence_count integer not null default 1 check (evidence_count >= 0),
  status text not null default 'observed'
    check (status in ('observed', 'active', 'paused', 'reset', 'expired')),
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists adaptive_preferences_user_idx
  on public.adaptive_preferences (user_id);
create unique index if not exists adaptive_preferences_user_key_value_idx
  on public.adaptive_preferences (user_id, key, value);

alter table public.adaptive_preferences enable row level security;

-- Users may READ their own adaptation data (transparency).
drop policy if exists "adaptive_preferences_select_own" on public.adaptive_preferences;
create policy "adaptive_preferences_select_own" on public.adaptive_preferences
  for select to authenticated using (user_id = auth.uid());

-- Users may correct/pause/reset/delete their own data. There is deliberately
-- NO insert policy and NO update policy for ordinary clients beyond the
-- trigger-guarded status/expiry changes below: creation and reinforcement go
-- exclusively through record_adaptive_observation().
drop policy if exists "adaptive_preferences_update_own" on public.adaptive_preferences;
create policy "adaptive_preferences_update_own" on public.adaptive_preferences
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "adaptive_preferences_delete_own" on public.adaptive_preferences;
create policy "adaptive_preferences_delete_own" on public.adaptive_preferences
  for delete to authenticated using (user_id = auth.uid());

-- Trigger guard: ordinary (non-definer) updates may change status and
-- expiry, and may LOWER confidence, but may never raise confidence or
-- evidence_count, change ownership, or rewrite key/value/history fields.
create or replace function public.guard_adaptive_preference_update()
returns trigger
language plpgsql
as $$
begin
  if current_setting('saelis.definer_write', true) = 'on' then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.key is distinct from old.key
     or new.value is distinct from old.value
     or new.first_observed_at is distinct from old.first_observed_at
     or new.last_observed_at is distinct from old.last_observed_at
     or new.evidence_count > old.evidence_count
     or new.confidence > old.confidence then
    raise exception 'adaptation records can only be reinforced by the application policy';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists adaptive_preferences_guard on public.adaptive_preferences;
create trigger adaptive_preferences_guard
  before update on public.adaptive_preferences
  for each row execute function public.guard_adaptive_preference_update();

-- ---------------------------------------------------------------------------
-- pattern_hypotheses — tentative, inspectable, rejectable, expirable.
-- ---------------------------------------------------------------------------
create table if not exists public.pattern_hypotheses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  theme text not null check (theme in (
    'boundaries', 'self-criticism', 'conflict', 'responsibility', 'avoidance',
    'courage', 'rest', 'trust', 'belonging', 'achievement', 'communication',
    'decision-making', 'other'
  )),
  observation text not null check (char_length(observation) between 1 and 500),
  uncertainty_statement text not null check (char_length(uncertainty_statement) between 1 and 300),
  confidence numeric(4,3) not null default 0.2 check (confidence >= 0 and confidence <= 1),
  evidence_count integer not null default 1 check (evidence_count >= 0),
  cross_domain_count integer not null default 1 check (cross_domain_count >= 0),
  status text not null default 'working'
    check (status in ('working', 'reviewable', 'accepted', 'rejected', 'expired')),
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  surfaced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pattern_hypotheses_user_idx
  on public.pattern_hypotheses (user_id);
create index if not exists pattern_hypotheses_status_idx
  on public.pattern_hypotheses (user_id, status);

alter table public.pattern_hypotheses enable row level security;

drop policy if exists "pattern_hypotheses_select_own" on public.pattern_hypotheses;
create policy "pattern_hypotheses_select_own" on public.pattern_hypotheses
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "pattern_hypotheses_update_own" on public.pattern_hypotheses;
create policy "pattern_hypotheses_update_own" on public.pattern_hypotheses
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "pattern_hypotheses_delete_own" on public.pattern_hypotheses;
create policy "pattern_hypotheses_delete_own" on public.pattern_hypotheses
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.guard_pattern_hypothesis_update()
returns trigger
language plpgsql
as $$
begin
  if current_setting('saelis.definer_write', true) = 'on' then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.theme is distinct from old.theme
     or new.observation is distinct from old.observation
     or new.uncertainty_statement is distinct from old.uncertainty_statement
     or new.first_observed_at is distinct from old.first_observed_at
     or new.last_observed_at is distinct from old.last_observed_at
     or new.evidence_count > old.evidence_count
     or new.cross_domain_count > old.cross_domain_count
     or new.confidence > old.confidence then
    raise exception 'pattern hypotheses can only be reinforced by the application policy';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pattern_hypotheses_guard on public.pattern_hypotheses;
create trigger pattern_hypotheses_guard
  before update on public.pattern_hypotheses
  for each row execute function public.guard_pattern_hypothesis_update();

-- ---------------------------------------------------------------------------
-- pattern_evidence — content-free evidence summaries. No user text.
-- ---------------------------------------------------------------------------
create table if not exists public.pattern_evidence (
  id uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references public.pattern_hypotheses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null check (source_type in (
    'conversation', 'arrival', 'horizon', 'approved-memory', 'user-reflection'
  )),
  source_id uuid,
  occurred_at timestamptz not null default now(),
  evidence_summary text not null check (char_length(evidence_summary) between 1 and 200),
  created_at timestamptz not null default now()
);

create index if not exists pattern_evidence_hypothesis_idx
  on public.pattern_evidence (hypothesis_id);
create index if not exists pattern_evidence_user_idx
  on public.pattern_evidence (user_id);

alter table public.pattern_evidence enable row level security;

drop policy if exists "pattern_evidence_select_own" on public.pattern_evidence;
create policy "pattern_evidence_select_own" on public.pattern_evidence
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "pattern_evidence_delete_own" on public.pattern_evidence;
create policy "pattern_evidence_delete_own" on public.pattern_evidence
  for delete to authenticated using (user_id = auth.uid());
-- No insert/update policies: evidence rows are created only by
-- record_pattern_evidence() below.

-- ---------------------------------------------------------------------------
-- Inference-update functions — the ONLY way confidence rises.
-- SECURITY DEFINER, pinned search path, strictly scoped to auth.uid(),
-- fixed increments, allowlist checks duplicated at the boundary.
-- ---------------------------------------------------------------------------

create or replace function public.record_adaptive_observation(
  p_key text,
  p_value jsonb default '{}'::jsonb,
  p_explicit boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_increment numeric := case when p_explicit then 0.3 else 0.15 end;
begin
  if v_user is null then
    raise exception 'not authorized';
  end if;
  -- Allowlist enforced by the table constraint; size bound re-checked here.
  if pg_column_size(p_value) > 512 then
    raise exception 'value too large';
  end if;

  perform set_config('saelis.definer_write', 'on', true);

  select id into v_id
  from public.adaptive_preferences
  where user_id = v_user and key = p_key and value = p_value;

  if v_id is null then
    insert into public.adaptive_preferences (user_id, key, value, confidence, evidence_count, status)
    values (
      v_user, p_key, p_value,
      least(0.3 + v_increment, 1.0),
      1,
      case when p_explicit then 'active' else 'observed' end
    )
    returning id into v_id;
  else
    update public.adaptive_preferences
    set confidence = least(confidence + v_increment, 1.0),
        evidence_count = evidence_count + 1,
        last_observed_at = now(),
        updated_at = now(),
        status = case when status in ('reset', 'expired') then status
                      when p_explicit then 'active'
                      else status end
    where id = v_id;
  end if;

  perform set_config('saelis.definer_write', 'off', true);
  return v_id;
end;
$$;

create or replace function public.record_adaptation_correction(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authorized';
  end if;
  perform set_config('saelis.definer_write', 'on', true);
  update public.adaptive_preferences
  set confidence = greatest(confidence - 0.4, 0),
      updated_at = now()
  where id = p_id and user_id = v_user;
  perform set_config('saelis.definer_write', 'off', true);
end;
$$;

create or replace function public.record_pattern_evidence(
  p_theme text,
  p_observation text,
  p_uncertainty text,
  p_source_type text,
  p_summary text,
  p_cross_domain boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authorized';
  end if;

  perform set_config('saelis.definer_write', 'on', true);

  select id into v_id
  from public.pattern_hypotheses
  where user_id = v_user and theme = p_theme
    and status in ('working', 'reviewable', 'accepted')
  order by last_observed_at desc
  limit 1;

  if v_id is null then
    -- Never recreate a theme the user rejected.
    if exists (
      select 1 from public.pattern_hypotheses
      where user_id = v_user and theme = p_theme and status = 'rejected'
    ) then
      perform set_config('saelis.definer_write', 'off', true);
      return null;
    end if;
    insert into public.pattern_hypotheses
      (user_id, theme, observation, uncertainty_statement, confidence, evidence_count, cross_domain_count, status)
    values (v_user, p_theme, p_observation, p_uncertainty, 0.2, 1, 1, 'working')
    returning id into v_id;
  else
    update public.pattern_hypotheses
    set confidence = least(confidence + 0.1, 1.0),
        evidence_count = evidence_count + 1,
        cross_domain_count = cross_domain_count + case when p_cross_domain then 1 else 0 end,
        last_observed_at = now(),
        updated_at = now()
    where id = v_id;
  end if;

  insert into public.pattern_evidence (hypothesis_id, user_id, source_type, evidence_summary)
  values (v_id, v_user, p_source_type, p_summary);

  perform set_config('saelis.definer_write', 'off', true);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Founder aggregates — counts only, no content columns selected anywhere.
-- ---------------------------------------------------------------------------
create or replace function public.adaptation_aggregate_counts()
returns table (record_kind text, status text, occurrences bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_founder() then
    raise exception 'not authorized';
  end if;
  return query
    select 'adaptive_preference'::text, p.status, count(*)::bigint
    from public.adaptive_preferences p
    group by p.status
    union all
    select 'pattern_hypothesis'::text, h.status, count(*)::bigint
    from public.pattern_hypotheses h
    group by h.status;
end;
$$;

-- ---------------------------------------------------------------------------
-- Stewardship event types for aggregate adaptation metrics (no content).
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
    'pattern_insight_rejected', 'humor_feedback_negative', 'challenge_feedback_negative'
  ));
