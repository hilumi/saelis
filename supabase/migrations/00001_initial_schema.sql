-- Saelis — initial schema
-- Tables are user-owned; every table here is protected by RLS (see 00003).
-- Idempotent where practical: uses IF NOT EXISTS / OR REPLACE.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically by trigger (00002).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  preferred_name text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One profile per auth user. Created automatically when the auth user is created.';

-- ---------------------------------------------------------------------------
-- companion_profiles: per-user companion preferences.
-- ---------------------------------------------------------------------------
create table if not exists public.companion_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  tone_preference text not null default 'balanced'
    check (tone_preference in ('gentle', 'balanced', 'direct')),
  response_length text not null default 'moderate'
    check (response_length in ('brief', 'moderate', 'expansive')),
  default_support_preference text not null default 'listen-first'
    check (default_support_preference in ('listen-first', 'ask-first', 'guide-first')),
  humor_level text not null default 'light'
    check (humor_level in ('none', 'light', 'playful')),
  faith_preference text not null default 'ask'
    check (faith_preference in ('never', 'ask', 'welcome')),
  planning_style text not null default 'one-step'
    check (planning_style in ('one-step', 'small-plan', 'no-plans')),
  encouragement_style text not null default 'warm'
    check (encouragement_style in ('quiet', 'warm', 'bright')),
  adaptive_learning_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- arrivals: how the user arrived (mood / energy / support need).
-- ---------------------------------------------------------------------------
create table if not exists public.arrivals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mood text not null
    check (mood in ('heavy', 'tender', 'flat', 'steady', 'hopeful', 'bright', 'tangled')),
  energy text not null
    check (energy in ('empty', 'low', 'enough', 'full')),
  support_need text not null
    check (support_need in (
      'listen', 'comfort', 'clarify', 'decide', 'communicate',
      'celebrate', 'faith', 'presence', 'next-step', 'stillness'
    )),
  message text,
  include_faith_reflection boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- conversation_turns
-- No private chain-of-thought or hidden model reasoning is ever stored here.
-- ---------------------------------------------------------------------------
create table if not exists public.conversation_turns (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  support_mode text
    check (support_mode in (
      'witness', 'explore', 'comfort', 'clarify', 'act',
      'celebrate', 'connect', 'reflect', 'presence'
    )),
  closing_line text,
  provider_response_id text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- horizon_steps: one manageable next step at a time.
-- ---------------------------------------------------------------------------
create table if not exists public.horizon_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  arrival_id uuid references public.arrivals (id) on delete set null,
  title text not null,
  description text not null,
  estimated_minutes integer not null
    check (estimated_minutes between 1 and 120),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- companion_memories
-- Memory rules (enforced in application code, reflected here):
--   * No memory becomes 'active' without explicit user approval.
--   * Soft-deleted memories are never supplied to the model.
--   * Users can review and permanently delete memories.
-- ---------------------------------------------------------------------------
create table if not exists public.companion_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  content text not null,
  source text not null
    check (source in ('explicit', 'preference-setting', 'user-approved-inference')),
  status text not null default 'active'
    check (status in ('proposed', 'active', 'rejected', 'deleted')),
  user_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A memory may only be 'active' when the user has approved it.
  constraint active_requires_approval
    check (status <> 'active' or user_approved = true)
);

-- ---------------------------------------------------------------------------
-- user_privacy_settings
-- ---------------------------------------------------------------------------
create table if not exists public.user_privacy_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  save_conversation_history boolean not null default true,
  allow_companion_memory boolean not null default true,
  allow_product_analytics boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists arrivals_user_id_idx on public.arrivals (user_id);
create index if not exists arrivals_created_at_idx on public.arrivals (created_at desc);

create index if not exists conversations_user_id_idx on public.conversations (user_id);
create index if not exists conversations_status_idx on public.conversations (status);
create index if not exists conversations_created_at_idx on public.conversations (created_at desc);

create index if not exists conversation_turns_conversation_id_idx
  on public.conversation_turns (conversation_id);
create index if not exists conversation_turns_user_id_idx on public.conversation_turns (user_id);
create index if not exists conversation_turns_created_at_idx
  on public.conversation_turns (created_at desc);

create index if not exists horizon_steps_user_id_idx on public.horizon_steps (user_id);
create index if not exists horizon_steps_conversation_id_idx
  on public.horizon_steps (conversation_id);
create index if not exists horizon_steps_created_at_idx on public.horizon_steps (created_at desc);

create index if not exists companion_memories_user_id_idx on public.companion_memories (user_id);
create index if not exists companion_memories_status_idx on public.companion_memories (status);
