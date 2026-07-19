-- ===========================================================================
-- Saelis — Sprint 4: companion push notifications (mobile).
--
-- Three tables:
--   * push_tokens                        — one row per registered Expo push
--     token. Own-row RLS; tokens are written by the authenticated device via
--     the server API (never another user's id — RLS enforces auth.uid()).
--   * companion_notification_preferences — platform-level companion
--     notification choices (distinct from wellness_notification_preferences,
--     which remain Saelis Her reminder choices). Own-row RLS.
--   * notification_deliveries            — operational delivery log written
--     ONLY by the server delivery job (deny-by-default RLS: enabled, zero
--     policies — the same posture as analytics_* tables). Carries metadata
--     only: category, timestamps, provider status, idempotency key. Never a
--     full notification body, never conversation or wellness content.
--
-- Beta delivery policy (enforced in application code, reflected here):
--   * at most ONE proactive Saelis notification per user per day
--     (user-created reminders excluded);
--   * nothing during quiet hours;
--   * no guilt, streak, or attachment language (tested copy catalog).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- push_tokens
-- ---------------------------------------------------------------------------
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Expo push token (e.g. ExponentPushToken[...]). Not a secret, but scoped
  -- to its owner by RLS. Unique: a device token belongs to one user; signing
  -- into a second account re-registers (replaces) the row.
  token text not null unique,
  platform text not null default 'unknown'
    check (platform in ('ios', 'android', 'unknown')),
  -- Set when the provider reports the token dead (DeviceNotRegistered) or the
  -- user signs out on that device. Revoked tokens are never sent to.
  revoked_at timestamptz,
  last_registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

-- ---------------------------------------------------------------------------
-- companion_notification_preferences
-- ---------------------------------------------------------------------------
create table if not exists public.companion_notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- Master switch. Default OFF: notifications are strictly opt-in.
  enabled boolean not null default false,
  gentle_check_ins boolean not null default true,
  wellness_reminders boolean not null default false,
  evening_reflections boolean not null default false,
  -- User-created reminders (excluded from the proactive daily cap).
  user_reminders boolean not null default true,
  -- Preferred local delivery time for proactive check-ins, minutes from
  -- midnight (0..1439) in the user's timezone.
  preferred_time_minutes integer not null default 540
    check (preferred_time_minutes between 0 and 1439),
  -- IANA timezone name, e.g. 'America/Chicago'. Free text validated
  -- server-side against Intl; unknown zones fall back to UTC at send time.
  timezone text not null default 'UTC',
  quiet_hours_start_minutes integer not null default 1260
    check (quiet_hours_start_minutes between 0 and 1439),
  quiet_hours_end_minutes integer not null default 480
    check (quiet_hours_end_minutes between 0 and 1439),
  -- 'private' shows a generic line; 'detailed' shows category-specific copy
  -- (still never conversation or wellness content).
  preview_mode text not null default 'private'
    check (preview_mode in ('private', 'detailed')),
  -- Proactive cadence. Beta cap of one per day applies regardless.
  proactive_frequency text not null default 'daily'
    check (proactive_frequency in ('daily', 'few_per_week', 'weekly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notification_deliveries — server-only operational log (deny-by-default).
-- ---------------------------------------------------------------------------
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null
    check (category in (
      'gentle_check_in', 'wellness_reminder', 'evening_reflection',
      'user_reminder', 'test'
    )),
  -- Deterministic key (user + category + local date) making delivery
  -- idempotent across job retries. Unique: a retry can never double-send.
  idempotency_key text not null unique,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  failed_at timestamptz,
  -- Coarse provider outcome ('ok', 'DeviceNotRegistered', 'error:<code>').
  provider_status text,
  token_expired boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_deliveries_user_id_idx
  on public.notification_deliveries (user_id);
create index if not exists notification_deliveries_queued_at_idx
  on public.notification_deliveries (queued_at desc);

-- ---------------------------------------------------------------------------
-- Triggers and RLS.
-- push_tokens + companion_notification_preferences: explicit own-row policies
-- (same set as 00003/00007/00008). notification_deliveries: RLS enabled with
-- ZERO policies — only the server-side service (service role) touches it.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['push_tokens', 'companion_notification_preferences'] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format(
      'create policy "%s_select_own" on public.%I
         for select to authenticated using (user_id = auth.uid())', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format(
      'create policy "%s_insert_own" on public.%I
         for insert to authenticated with check (user_id = auth.uid())', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format(
      'create policy "%s_update_own" on public.%I
         for update to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);
    execute format(
      'create policy "%s_delete_own" on public.%I
         for delete to authenticated using (user_id = auth.uid())', t, t);
  end loop;
end $$;

drop trigger if exists set_notification_deliveries_updated_at on public.notification_deliveries;
create trigger set_notification_deliveries_updated_at
  before update on public.notification_deliveries
  for each row execute function public.set_updated_at();

alter table public.notification_deliveries enable row level security;
-- Deny-by-default: no policies on notification_deliveries, intentionally.
