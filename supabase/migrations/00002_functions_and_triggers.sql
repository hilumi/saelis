-- Saelis — functions and triggers

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_companion_profiles_updated_at on public.companion_profiles;
create trigger set_companion_profiles_updated_at
  before update on public.companion_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

drop trigger if exists set_horizon_steps_updated_at on public.horizon_steps;
create trigger set_horizon_steps_updated_at
  before update on public.horizon_steps
  for each row execute function public.set_updated_at();

drop trigger if exists set_companion_memories_updated_at on public.companion_memories;
create trigger set_companion_memories_updated_at
  before update on public.companion_memories
  for each row execute function public.set_updated_at();

drop trigger if exists set_user_privacy_settings_updated_at on public.user_privacy_settings;
create trigger set_user_privacy_settings_updated_at
  before update on public.user_privacy_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New-user bootstrap: profile + companion profile + privacy settings.
-- SECURITY DEFINER because it runs from an auth.users trigger and must write
-- into public tables regardless of the inserting role. search_path is pinned.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.companion_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_privacy_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Horizon step completion: keep completed_at consistent with completed.
-- ---------------------------------------------------------------------------
create or replace function public.set_horizon_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.completed and not old.completed then
    new.completed_at = now();
  elsif not new.completed then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists horizon_steps_completed_at on public.horizon_steps;
create trigger horizon_steps_completed_at
  before update on public.horizon_steps
  for each row execute function public.set_horizon_completed_at();
