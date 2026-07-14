-- Saelis — row-level security
--
-- Security model:
--   * Every user-owned table has RLS enabled.
--   * Authenticated users may only read/write rows whose user_id (or id, for
--     profiles) equals auth.uid(). There are no broad `using (true)` policies.
--   * conversation_turns additionally verifies that the parent conversation
--     belongs to the same authenticated user, so a turn can never be attached
--     to someone else's conversation even if user_id were forged.
--   * The application never relies on client-supplied user IDs; RLS is the
--     final authority, and the app layer filters on the server-derived user.

alter table public.profiles enable row level security;
alter table public.companion_profiles enable row level security;
alter table public.arrivals enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_turns enable row level security;
alter table public.horizon_steps enable row level security;
alter table public.companion_memories enable row level security;
alter table public.user_privacy_settings enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using (id = auth.uid());

-- companion_profiles ---------------------------------------------------------
drop policy if exists "companion_profiles_select_own" on public.companion_profiles;
create policy "companion_profiles_select_own" on public.companion_profiles
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "companion_profiles_insert_own" on public.companion_profiles;
create policy "companion_profiles_insert_own" on public.companion_profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "companion_profiles_update_own" on public.companion_profiles;
create policy "companion_profiles_update_own" on public.companion_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "companion_profiles_delete_own" on public.companion_profiles;
create policy "companion_profiles_delete_own" on public.companion_profiles
  for delete to authenticated using (user_id = auth.uid());

-- arrivals --------------------------------------------------------------------
drop policy if exists "arrivals_select_own" on public.arrivals;
create policy "arrivals_select_own" on public.arrivals
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "arrivals_insert_own" on public.arrivals;
create policy "arrivals_insert_own" on public.arrivals
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "arrivals_update_own" on public.arrivals;
create policy "arrivals_update_own" on public.arrivals
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "arrivals_delete_own" on public.arrivals;
create policy "arrivals_delete_own" on public.arrivals
  for delete to authenticated using (user_id = auth.uid());

-- conversations ---------------------------------------------------------------
drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own" on public.conversations
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own" on public.conversations
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own" on public.conversations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own" on public.conversations
  for delete to authenticated using (user_id = auth.uid());

-- conversation_turns ------------------------------------------------------------
-- Ownership is confirmed BOTH via the turn's own user_id AND via the parent
-- conversation belonging to the same authenticated user.
drop policy if exists "conversation_turns_select_own" on public.conversation_turns;
create policy "conversation_turns_select_own" on public.conversation_turns
  for select to authenticated using (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "conversation_turns_insert_own" on public.conversation_turns;
create policy "conversation_turns_insert_own" on public.conversation_turns
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "conversation_turns_update_own" on public.conversation_turns;
create policy "conversation_turns_update_own" on public.conversation_turns
  for update to authenticated using (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  ) with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "conversation_turns_delete_own" on public.conversation_turns;
create policy "conversation_turns_delete_own" on public.conversation_turns
  for delete to authenticated using (
    user_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- horizon_steps -----------------------------------------------------------------
drop policy if exists "horizon_steps_select_own" on public.horizon_steps;
create policy "horizon_steps_select_own" on public.horizon_steps
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "horizon_steps_insert_own" on public.horizon_steps;
create policy "horizon_steps_insert_own" on public.horizon_steps
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "horizon_steps_update_own" on public.horizon_steps;
create policy "horizon_steps_update_own" on public.horizon_steps
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "horizon_steps_delete_own" on public.horizon_steps;
create policy "horizon_steps_delete_own" on public.horizon_steps
  for delete to authenticated using (user_id = auth.uid());

-- companion_memories --------------------------------------------------------------
drop policy if exists "companion_memories_select_own" on public.companion_memories;
create policy "companion_memories_select_own" on public.companion_memories
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "companion_memories_insert_own" on public.companion_memories;
create policy "companion_memories_insert_own" on public.companion_memories
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "companion_memories_update_own" on public.companion_memories;
create policy "companion_memories_update_own" on public.companion_memories
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "companion_memories_delete_own" on public.companion_memories;
create policy "companion_memories_delete_own" on public.companion_memories
  for delete to authenticated using (user_id = auth.uid());

-- user_privacy_settings -------------------------------------------------------------
drop policy if exists "user_privacy_settings_select_own" on public.user_privacy_settings;
create policy "user_privacy_settings_select_own" on public.user_privacy_settings
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "user_privacy_settings_insert_own" on public.user_privacy_settings;
create policy "user_privacy_settings_insert_own" on public.user_privacy_settings
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "user_privacy_settings_update_own" on public.user_privacy_settings;
create policy "user_privacy_settings_update_own" on public.user_privacy_settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_privacy_settings_delete_own" on public.user_privacy_settings;
create policy "user_privacy_settings_delete_own" on public.user_privacy_settings
  for delete to authenticated using (user_id = auth.uid());
