-- Saelis Her v0.10 — Phase 2: onboarding drafts, notification preferences,
-- and movement/nutrition preference columns.
--
-- Commitments (see CLAUDE.md):
--   * Neutral naming; no postpartum data outside postpartum_* tables. The
--     onboarding DRAFT may hold in-progress Restore answers as user-owned,
--     RLS-protected JSONB (server-side persistence — never localStorage);
--     completing onboarding moves them into postpartum_profiles and clears
--     the draft.
--   * RLS own-row policies on every new table; USING and WITH CHECK on update.
--   * Idempotent DDL; updated_at via the shared set_updated_at() trigger.

-- ===========================================================================
-- A. women_wellness_profiles — additional optional preference columns.
--    All nullable or defaulted; nothing here is ever required.
-- ===========================================================================
alter table public.women_wellness_profiles
  add column if not exists movement_limitations text[] not null default '{}',
  add column if not exists movement_dislikes text[] not null default '{}',
  add column if not exists floor_transitions_difficult boolean not null default false,
  add column if not exists prefers_beginner_explanations boolean not null default false,
  add column if not exists quick_meals_preferred boolean not null default false,
  add column if not exists protein_familiarity text,
  add column if not exists portion_guidance_preferred boolean not null default false,
  add column if not exists family_style_meals boolean not null default false;

do $$ begin
  alter table public.women_wellness_profiles
    add constraint women_wellness_profiles_protein_familiarity_check
      check (protein_familiarity in ('new', 'some', 'confident'));
exception when duplicate_object then null; end $$;

-- ===========================================================================
-- B. wellness_onboarding_drafts — resumable, server-side onboarding state.
--    One draft per user. data is a Zod-validated JSONB snapshot of in-progress
--    answers (src/lib/validation/wellness-onboarding.ts). Size-capped.
-- ===========================================================================
create table if not exists public.wellness_onboarding_drafts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_step text not null default 'welcome' check (current_step in (
    'welcome', 'pathways', 'goals', 'body', 'movement', 'nutrition',
    'restore', 'rhythm', 'phoenix', 'notifications', 'review'
  )),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 16384),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wellness_onboarding_drafts is
  'Resumable Saelis Her onboarding. Draft answers live server-side under RLS; completion writes real records and stamps completed_at. Never stored in localStorage.';

-- ===========================================================================
-- C. wellness_notification_preferences — Saelis Her reminder preferences.
--    Delivery infrastructure does not exist yet; these are user choices only.
--    Browser permission is only ever requested after an explicit button press.
-- ===========================================================================
create table if not exists public.wellness_notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  reminder_style text not null default 'gentle'
    check (reminder_style in ('gentle', 'direct', 'celebratory', 'minimal')),
  morning_check_in boolean not null default false,
  workout_reminders boolean not null default false,
  nourishment_reminders boolean not null default false,
  hydration_reminders boolean not null default false,
  evening_reflection boolean not null default false,
  quiet_hours_start integer check (quiet_hours_start between 0 and 23),
  quiet_hours_end integer check (quiet_hours_end between 0 and 23),
  max_daily_notifications integer not null default 3
    check (max_daily_notifications between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===========================================================================
-- Triggers and RLS (same explicit own-row policy set as 00003/00007).
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['wellness_onboarding_drafts', 'wellness_notification_preferences'] loop
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
