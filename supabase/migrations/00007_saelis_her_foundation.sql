-- Saelis Her v0.9 — foundational schema for the women's wellness product.
--
-- Design commitments (see CLAUDE.md and docs/implementation/saelis-her-phase-0-audit.md):
--   * Neutral naming for all shared architecture (wellness_*); postpartum data
--     is isolated in dedicated postpartum_* tables used only by Restore.
--   * RLS on every user-owned table; own-row per-operation policies; global
--     libraries are read-only to authenticated users.
--   * user_id references public.profiles (repo convention; profiles cascades
--     from auth.users, so account deletion cascades through every table here).
--   * Text + check constraints (not pg enums); updated_at via set_updated_at().
--   * Weight and calorie tracking are OPTIONAL — those columns are nullable
--     and never required by the application.
--   * No sensitive free-text health details are ever logged by the app; the
--     columns below are user-owned data protected by RLS, not telemetry.
--   * Idempotent where practical.

-- ===========================================================================
-- A. wellness_pathways — global pathway catalog (mirrors the TS registry).
-- ===========================================================================
create table if not exists public.wellness_pathways (
  key text primary key,
  display_name text not null,
  description text not null,
  category text not null,
  route text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wellness_pathways is
  'Global Saelis Her pathway catalog. Source of truth for behavior is the TS registry (src/lib/wellness/pathways); this table backs enrollment FKs and future dynamic content.';

insert into public.wellness_pathways (key, display_name, description, category, route, sort_order) values
  ('phoenix', 'Phoenix', 'Sustainable weight management, fitness, strength, healthy habits, and body recomposition.', 'body-recomposition', '/wellness/her/pathways/phoenix', 1),
  ('restore', 'Restore', 'Dedicated postpartum recovery and return-to-fitness pathway.', 'postpartum-recovery', '/wellness/her/pathways/restore', 2),
  ('strong', 'Strong', 'Progressive strength training without requiring weight-loss goals.', 'strength', '/wellness/her/pathways/strong', 3),
  ('nourish', 'Nourish', 'Nutrition, meal planning, protein, fiber, hydration, and sustainable eating habits.', 'nutrition', '/wellness/her/pathways/nourish', 4),
  ('rhythm', 'Rhythm', 'Optional menstrual-cycle-aware wellness and energy support.', 'cycle-support', '/wellness/her/pathways/rhythm', 5),
  ('reset', 'Reset', 'Simplified wellness mode for low energy, overwhelm, stress, illness recovery, or disrupted routines.', 'recovery-mode', '/wellness/her/pathways/reset', 6)
on conflict (key) do nothing;

-- ===========================================================================
-- B. wellness_enrollments — user x pathway; several active pathways allowed,
--    but at most ONE active enrollment per (user, pathway).
-- ===========================================================================
create table if not exists public.wellness_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pathway_key text not null references public.wellness_pathways (key),
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed', 'archived')),
  started_on date not null default current_date,
  completed_on date,
  current_phase integer not null default 1 check (current_phase >= 1),
  current_week integer not null default 1 check (current_week >= 1),
  program_length_weeks integer check (program_length_weeks between 1 and 104),
  goal_summary text check (char_length(goal_summary) <= 500),
  settings jsonb not null default '{}'::jsonb check (pg_column_size(settings) <= 8192),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wellness_enrollments_one_active_idx
  on public.wellness_enrollments (user_id, pathway_key)
  where status = 'active';

create index if not exists wellness_enrollments_user_idx on public.wellness_enrollments (user_id);
create index if not exists wellness_enrollments_pathway_idx on public.wellness_enrollments (pathway_key);
create index if not exists wellness_enrollments_status_idx on public.wellness_enrollments (status);

-- ===========================================================================
-- C. women_wellness_profiles — opt-in shared Her profile (neutral naming).
--    Weight/calorie fields are nullable and OPTIONAL by design.
-- ===========================================================================
create table if not exists public.women_wellness_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth date,
  height_inches numeric check (height_inches between 36 and 90),
  current_weight_lbs numeric check (current_weight_lbs between 50 and 1000),
  target_weight_lbs numeric check (target_weight_lbs between 50 and 1000),
  desired_weight_change_lbs numeric check (desired_weight_change_lbs between -500 and 500),
  goal_timeframe_months integer check (goal_timeframe_months between 1 and 60),
  movement_experience text not null default 'beginner'
    check (movement_experience in ('beginner', 'returning', 'intermediate', 'advanced')),
  preferred_training_locations text[] not null default '{}',
  available_equipment text[] not null default '{}',
  preferred_workout_days integer not null default 3
    check (preferred_workout_days between 0 and 7),
  preferred_workout_minutes integer not null default 30
    check (preferred_workout_minutes between 5 and 180),
  average_daily_steps integer check (average_daily_steps between 0 and 100000),
  dietary_pattern text,
  food_allergies text[] not null default '{}',
  food_dislikes text[] not null default '{}',
  household_meal_preferences text check (char_length(household_meal_preferences) <= 500),
  budget_preference text,
  meal_prep_preference text,
  tracks_calories boolean not null default true,
  tracks_weight boolean not null default true,
  weighs_daily boolean not null default false,
  cycle_tracking_enabled boolean not null default false,
  postpartum_pathway_relevant boolean not null default false,
  notification_style text not null default 'gentle'
    check (notification_style in ('gentle', 'direct', 'celebratory', 'minimal')),
  units_preference text not null default 'imperial'
    check (units_preference in ('imperial', 'metric')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.women_wellness_profiles is
  'Opt-in Saelis Her profile. Created only when a user activates Her — never by the new-user trigger. Weight and calorie tracking are optional.';

-- ===========================================================================
-- D. postpartum_profiles — RESTORE ONLY. Isolated postpartum data.
-- ===========================================================================
create table if not exists public.postpartum_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  enrollment_id uuid not null references public.wellness_enrollments (id) on delete cascade,
  postpartum_stage text not null check (postpartum_stage in (
    'less_than_6_weeks', '6_to_12_weeks', '3_to_6_months', '6_to_12_months',
    '1_to_2_years', 'more_than_2_years', 'prefer_not_to_say'
  )),
  delivery_date date,
  delivery_type text check (delivery_type in (
    'vaginal', 'assisted_vaginal', 'cesarean', 'multiple_cesareans', 'other', 'prefer_not_to_say'
  )),
  cesarean_count integer check (cesarean_count between 0 and 10),
  feeding_status text not null default 'prefer_not_to_say' check (feeding_status in (
    'exclusively_breastfeeding', 'combination_feeding', 'pumping', 'weaning',
    'not_breastfeeding', 'prefer_not_to_say'
  )),
  -- Self-reported only. The application NEVER infers or auto-sets 'cleared'.
  medical_clearance_status text not null default 'unknown'
    check (medical_clearance_status in ('cleared', 'restrictions', 'not_cleared', 'unknown')),
  reported_restrictions text check (char_length(reported_restrictions) <= 1000),
  pelvic_floor_symptoms boolean not null default false,
  pelvic_floor_details text check (char_length(pelvic_floor_details) <= 1000),
  suspected_diastasis boolean not null default false,
  diastasis_assessed_by_professional boolean not null default false,
  abdominal_doming_or_coning boolean not null default false,
  chronic_pain boolean not null default false,
  pain_details text check (char_length(pain_details) <= 1000),
  iron_deficiency_or_anemia boolean not null default false,
  fatigue_concern boolean not null default false,
  incision_status text check (incision_status in (
    'not_applicable', 'healed', 'healing', 'concern', 'prefer_not_to_say'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.postpartum_profiles is
  'RESTORE ONLY. Self-reported postpartum intake. medical_clearance_status is user-reported; the app never auto-classifies anyone as cleared. Never surfaced to non-Restore users, never logged.';

create index if not exists postpartum_profiles_enrollment_idx
  on public.postpartum_profiles (enrollment_id);

-- ===========================================================================
-- E. wellness_goals
-- ===========================================================================
create table if not exists public.wellness_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  enrollment_id uuid references public.wellness_enrollments (id) on delete cascade,
  pathway_key text references public.wellness_pathways (key),
  goal_type text not null check (goal_type in (
    'weight_management', 'strength', 'energy', 'core_recovery', 'pelvic_floor_support',
    'cardiovascular_fitness', 'consistency', 'mobility', 'nutrition', 'hydration',
    'sleep', 'confidence', 'stress_management', 'postpartum_recovery'
  )),
  target_numeric numeric,
  target_unit text check (char_length(target_unit) <= 32),
  target_date date,
  priority integer not null default 1 check (priority between 1 and 10),
  status text not null default 'active'
    check (status in ('active', 'achieved', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wellness_goals_user_idx on public.wellness_goals (user_id);
create index if not exists wellness_goals_enrollment_idx on public.wellness_goals (enrollment_id);
create index if not exists wellness_goals_pathway_idx on public.wellness_goals (pathway_key);
create index if not exists wellness_goals_status_idx on public.wellness_goals (status);

-- ===========================================================================
-- F. wellness_daily_check_ins — shared, neutral daily check-in.
--    Red-flag booleans feed the deterministic safety gate (rules engine);
--    the LLM never overrides a safety hold derived from them.
-- ===========================================================================
create table if not exists public.wellness_daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  check_in_date date not null,
  sleep_hours numeric check (sleep_hours between 0 and 24),
  sleep_quality integer check (sleep_quality between 1 and 5),
  energy integer check (energy between 1 and 5),
  mood integer check (mood between 1 and 5),
  stress integer check (stress between 1 and 5),
  soreness integer check (soreness between 0 and 5),
  pain_level integer check (pain_level between 0 and 10),
  pain_location text[] not null default '{}',
  readiness text check (readiness in ('energized', 'okay', 'tired', 'overwhelmed', 'in_pain')),
  available_minutes integer check (available_minutes between 0 and 300),
  available_location text,
  illness_or_injury_concern boolean not null default false,
  chest_pain boolean not null default false,
  dizziness_or_fainting boolean not null default false,
  shortness_of_breath boolean not null default false,
  severe_headache boolean not null default false,
  self_harm_concern boolean not null default false,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wellness_daily_check_ins_user_date_key unique (user_id, check_in_date)
);

create index if not exists wellness_daily_check_ins_user_idx
  on public.wellness_daily_check_ins (user_id);
create index if not exists wellness_daily_check_ins_date_idx
  on public.wellness_daily_check_ins (check_in_date desc);

-- ===========================================================================
-- G. postpartum_check_ins — RESTORE ONLY. Red flags feed the Restore safety
--    gate; concerning symptoms route to provider guidance, never to workouts.
-- ===========================================================================
create table if not exists public.postpartum_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  enrollment_id uuid not null references public.wellness_enrollments (id) on delete cascade,
  check_in_date date not null,
  bleeding_concern boolean not null default false,
  heavy_bleeding boolean not null default false,
  incision_concern boolean not null default false,
  pelvic_heaviness_or_pressure boolean not null default false,
  urinary_or_bowel_symptom boolean not null default false,
  calf_pain_or_swelling boolean not null default false,
  severe_abdominal_or_pelvic_pain boolean not null default false,
  breast_or_feeding_concern boolean not null default false,
  doming_or_coning boolean not null default false,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint postpartum_check_ins_user_date_key unique (user_id, check_in_date)
);

create index if not exists postpartum_check_ins_user_idx on public.postpartum_check_ins (user_id);
create index if not exists postpartum_check_ins_enrollment_idx
  on public.postpartum_check_ins (enrollment_id);
create index if not exists postpartum_check_ins_date_idx
  on public.postpartum_check_ins (check_in_date desc);

-- ===========================================================================
-- H. wellness_programs
-- ===========================================================================
create table if not exists public.wellness_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active'
    check (status in ('draft', 'active', 'superseded', 'completed')),
  version integer not null default 1 check (version >= 1),
  start_date date not null,
  end_date date not null,
  total_weeks integer not null check (total_weeks between 1 and 104),
  primary_goal text not null,
  weekly_training_days integer not null check (weekly_training_days between 0 and 7),
  nutrition_strategy text not null,
  safety_tier text not null,
  active_pathway_keys text[] not null default '{}',
  generated_from_profile_version timestamptz,
  rationale text check (char_length(rationale) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wellness_programs_date_order check (end_date >= start_date)
);

create index if not exists wellness_programs_user_idx on public.wellness_programs (user_id);
create index if not exists wellness_programs_status_idx on public.wellness_programs (status);

-- ===========================================================================
-- I. wellness_program_weeks
-- ===========================================================================
create table if not exists public.wellness_program_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.wellness_programs (id) on delete cascade,
  week_number integer not null check (week_number >= 1),
  phase_number integer not null check (phase_number >= 1),
  phase_name text not null,
  weekly_focus text not null,
  active_pathway_keys text[] not null default '{}',
  strength_sessions_target integer not null default 0 check (strength_sessions_target between 0 and 7),
  cardio_sessions_target integer not null default 0 check (cardio_sessions_target between 0 and 7),
  mobility_sessions_target integer not null default 0 check (mobility_sessions_target between 0 and 7),
  recovery_sessions_target integer not null default 0 check (recovery_sessions_target between 0 and 7),
  step_target integer check (step_target between 0 and 100000),
  protein_target_grams integer check (protein_target_grams between 0 and 400),
  hydration_target_ounces integer check (hydration_target_ounces between 0 and 300),
  calorie_target integer check (calorie_target between 1200 and 6000),
  calorie_range_low integer check (calorie_range_low >= 1200),
  calorie_range_high integer check (calorie_range_high <= 6000),
  deload_week boolean not null default false,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  constraint wellness_program_weeks_program_week_key unique (program_id, week_number),
  constraint wellness_program_weeks_calorie_range_order
    check (calorie_range_low is null or calorie_range_high is null
           or calorie_range_low <= calorie_range_high)
);

create index if not exists wellness_program_weeks_program_idx
  on public.wellness_program_weeks (program_id);

-- ===========================================================================
-- J. wellness_daily_plans — JSONB plan payloads are Zod-validated at every
--    application boundary (src/lib/validation/wellness.ts).
-- ===========================================================================
create table if not exists public.wellness_daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_date date not null,
  program_week_id uuid references public.wellness_program_weeks (id),
  active_pathway_keys text[] not null default '{}',
  readiness_snapshot jsonb,
  plan_status text not null default 'active'
    check (plan_status in ('active', 'completed', 'partially_completed', 'skipped', 'replaced')),
  movement_plan jsonb not null default '{}'::jsonb,
  nutrition_plan jsonb not null default '{}'::jsonb,
  hydration_plan jsonb not null default '{}'::jsonb,
  recovery_plan jsonb not null default '{}'::jsonb,
  -- RESTORE ONLY payload; null for everyone else.
  postpartum_plan jsonb,
  adaptation_level text not null default 'standard'
    check (adaptation_level in ('standard', 'reduced', 'recovery', 'safety_hold')),
  adaptation_reason text check (char_length(adaptation_reason) <= 500),
  safety_message text check (char_length(safety_message) <= 1000),
  generated_by text not null default 'rules_engine',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wellness_daily_plans_user_date_key unique (user_id, plan_date)
);

create index if not exists wellness_daily_plans_user_idx on public.wellness_daily_plans (user_id);
create index if not exists wellness_daily_plans_date_idx
  on public.wellness_daily_plans (plan_date desc);
create index if not exists wellness_daily_plans_week_idx
  on public.wellness_daily_plans (program_week_id);

-- ===========================================================================
-- K. wellness_workout_logs
-- ===========================================================================
create table if not exists public.wellness_workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  daily_plan_id uuid references public.wellness_daily_plans (id) on delete set null,
  workout_date date not null,
  pathway_keys text[] not null default '{}',
  workout_type text not null,
  title text not null check (char_length(title) <= 200),
  source text not null
    check (source in ('saelis', 'peloton', 'planet_fitness', 'walking', 'manual')),
  planned_duration_minutes integer check (planned_duration_minutes between 1 and 300),
  actual_duration_minutes integer check (actual_duration_minutes between 0 and 300),
  completion_status text not null
    check (completion_status in ('planned', 'completed', 'partial', 'skipped')),
  perceived_exertion integer check (perceived_exertion between 1 and 10),
  pain_during boolean not null default false,
  doming_or_coning boolean not null default false,
  pelvic_floor_symptom boolean not null default false,
  notes text check (char_length(notes) <= 2000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wellness_workout_logs_user_idx on public.wellness_workout_logs (user_id);
create index if not exists wellness_workout_logs_date_idx
  on public.wellness_workout_logs (workout_date desc);
create index if not exists wellness_workout_logs_plan_idx
  on public.wellness_workout_logs (daily_plan_id);

-- ===========================================================================
-- L. wellness_exercise_logs — owned via the parent workout log (RLS checks
--    the parent, mirroring the conversation_turns pattern).
-- ===========================================================================
create table if not exists public.wellness_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.wellness_workout_logs (id) on delete cascade,
  exercise_id uuid,
  exercise_name text not null check (char_length(exercise_name) <= 200),
  sequence_number integer not null check (sequence_number >= 1),
  sets_completed integer check (sets_completed between 0 and 20),
  reps_completed text check (char_length(reps_completed) <= 50),
  weight_used_lbs numeric check (weight_used_lbs between 0 and 2000),
  duration_seconds integer check (duration_seconds between 0 and 14400),
  distance text check (char_length(distance) <= 50),
  modification_used text check (char_length(modification_used) <= 300),
  notes text check (char_length(notes) <= 1000)
);

create index if not exists wellness_exercise_logs_workout_idx
  on public.wellness_exercise_logs (workout_log_id);

-- ===========================================================================
-- M. wellness_nutrition_logs — calories/macros are ESTIMATES, never precise.
-- ===========================================================================
create table if not exists public.wellness_nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  meal_type text not null
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'beverage')),
  description text not null check (char_length(description) <= 1000),
  estimated_calories integer check (estimated_calories between 0 and 10000),
  protein_grams numeric check (protein_grams between 0 and 500),
  carbohydrates_grams numeric check (carbohydrates_grams between 0 and 1500),
  fat_grams numeric check (fat_grams between 0 and 500),
  fiber_grams numeric check (fiber_grams between 0 and 200),
  iron_rich boolean not null default false,
  fruit_or_vegetable_servings numeric check (fruit_or_vegetable_servings between 0 and 30),
  logged_via text not null default 'manual'
    check (logged_via in ('manual', 'quick_add', 'ai_estimate')),
  estimation_notice boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wellness_nutrition_logs_user_idx
  on public.wellness_nutrition_logs (user_id);
create index if not exists wellness_nutrition_logs_date_idx
  on public.wellness_nutrition_logs (log_date desc);

-- ===========================================================================
-- N. wellness_daily_metrics — all measurements optional by design.
-- ===========================================================================
create table if not exists public.wellness_daily_metrics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  metric_date date not null,
  weight_lbs numeric check (weight_lbs between 50 and 1000),
  waist_inches numeric check (waist_inches between 10 and 120),
  hip_inches numeric check (hip_inches between 10 and 120),
  chest_inches numeric check (chest_inches between 10 and 120),
  thigh_inches numeric check (thigh_inches between 5 and 60),
  steps integer check (steps between 0 and 200000),
  water_ounces numeric check (water_ounces between 0 and 500),
  protein_grams numeric check (protein_grams between 0 and 500),
  calories integer check (calories between 0 and 10000),
  fiber_grams numeric check (fiber_grams between 0 and 200),
  sleep_hours numeric check (sleep_hours between 0 and 24),
  resting_heart_rate numeric check (resting_heart_rate between 20 and 250),
  active_minutes integer check (active_minutes between 0 and 1440),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, metric_date)
);

create index if not exists wellness_daily_metrics_date_idx
  on public.wellness_daily_metrics (metric_date desc);

-- ===========================================================================
-- O. wellness_meal_plans — plan_data is Zod-validated JSONB.
-- ===========================================================================
create table if not exists public.wellness_meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start_date date not null,
  active_pathway_keys text[] not null default '{}',
  calorie_target integer check (calorie_target between 1200 and 6000),
  calorie_range_low integer check (calorie_range_low >= 1200),
  calorie_range_high integer check (calorie_range_high <= 6000),
  protein_target_grams integer check (protein_target_grams between 0 and 400),
  hydration_target_ounces integer check (hydration_target_ounces between 0 and 300),
  plan_data jsonb not null,
  generated_by text not null default 'rules_engine',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wellness_meal_plans_user_week_key unique (user_id, week_start_date),
  constraint wellness_meal_plans_calorie_range_order
    check (calorie_range_low is null or calorie_range_high is null
           or calorie_range_low <= calorie_range_high)
);

create index if not exists wellness_meal_plans_user_idx on public.wellness_meal_plans (user_id);
create index if not exists wellness_meal_plans_week_idx
  on public.wellness_meal_plans (week_start_date desc);

-- ===========================================================================
-- P. wellness_milestones — celebration, never pressure. No streak mechanics.
-- ===========================================================================
create table if not exists public.wellness_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pathway_key text references public.wellness_pathways (key),
  milestone_key text not null check (char_length(milestone_key) <= 100),
  milestone_type text not null check (char_length(milestone_type) <= 50),
  achieved_at timestamptz not null default now(),
  numeric_value numeric,
  celebration_message text check (char_length(celebration_message) <= 500),
  notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wellness_milestones_user_key_key unique (user_id, milestone_key)
);

create index if not exists wellness_milestones_user_idx on public.wellness_milestones (user_id);
create index if not exists wellness_milestones_pathway_idx
  on public.wellness_milestones (pathway_key);

-- ===========================================================================
-- Q. Global libraries: exercise_library, workout_templates,
--    workout_template_exercises, meal_templates.
--    Read-only for authenticated users; maintained only via migrations or
--    the server-only admin client. No equivalents existed before Phase 1.
-- ===========================================================================
create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  movement_pattern text,
  primary_muscles text[] not null default '{}',
  equipment text[] not null default '{}',
  locations text[] not null default '{}',
  difficulty text not null check (difficulty in ('gentle', 'beginner', 'intermediate', 'advanced')),
  instructions text not null,
  coaching_cues text[] not null default '{}',
  common_mistakes text[] not null default '{}',
  regression_slug text,
  progression_slug text,
  pathway_tags text[] not null default '{}',
  safety_tags text[] not null default '{}',
  avoid_when text[] not null default '{}',
  video_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exercise_library_category_idx on public.exercise_library (category);
create index if not exists exercise_library_active_idx on public.exercise_library (active);

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  pathway_tags text[] not null default '{}',
  location text not null,
  approximate_minutes integer not null check (approximate_minutes between 5 and 180),
  phase_min integer not null default 1 check (phase_min >= 1),
  phase_max integer not null default 99 check (phase_max >= 1),
  difficulty text not null check (difficulty in ('gentle', 'beginner', 'intermediate', 'advanced')),
  safety_tags text[] not null default '{}',
  intensity_guidance text not null,
  modification_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_templates_phase_order check (phase_min <= phase_max)
);

create index if not exists workout_templates_location_idx on public.workout_templates (location);
create index if not exists workout_templates_active_idx on public.workout_templates (active);

create table if not exists public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id uuid not null references public.exercise_library (id) on delete cascade,
  sequence_number integer not null check (sequence_number >= 1),
  sets integer check (sets between 1 and 10),
  reps text check (char_length(reps) <= 50),
  duration_seconds integer check (duration_seconds between 5 and 3600),
  rest_seconds integer check (rest_seconds between 0 and 600),
  intensity_guidance text check (char_length(intensity_guidance) <= 300),
  modification_notes text check (char_length(modification_notes) <= 300),
  constraint workout_template_exercises_order_key unique (template_id, sequence_number)
);

create index if not exists workout_template_exercises_template_idx
  on public.workout_template_exercises (template_id);
create index if not exists workout_template_exercises_exercise_idx
  on public.workout_template_exercises (exercise_id);

create table if not exists public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  meal_type text not null
    check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'beverage')),
  -- All nutrition values in this table are ESTIMATES and are labeled as such
  -- in the UI (estimated_* naming is intentional).
  description text not null,
  preparation_minutes integer check (preparation_minutes between 0 and 240),
  servings integer not null default 1 check (servings between 1 and 24),
  estimated_calories integer check (estimated_calories between 0 and 3000),
  protein_grams integer check (protein_grams between 0 and 200),
  carbohydrates_grams integer check (carbohydrates_grams between 0 and 400),
  fat_grams integer check (fat_grams between 0 and 200),
  fiber_grams integer check (fiber_grams between 0 and 100),
  iron_rich boolean not null default false,
  pathway_tags text[] not null default '{}',
  breastfeeding_compatible boolean,
  freezer_friendly boolean not null default false,
  budget_tier text check (budget_tier in ('low', 'medium', 'high')),
  dietary_tags text[] not null default '{}',
  allergen_tags text[] not null default '{}',
  ingredients jsonb not null default '[]'::jsonb,
  instructions text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_templates_meal_type_idx on public.meal_templates (meal_type);
create index if not exists meal_templates_active_idx on public.meal_templates (active);

-- ===========================================================================
-- updated_at triggers (reuses public.set_updated_at from 00002).
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'wellness_pathways', 'wellness_enrollments', 'women_wellness_profiles',
    'postpartum_profiles', 'wellness_goals', 'wellness_daily_check_ins',
    'postpartum_check_ins', 'wellness_programs', 'wellness_daily_plans',
    'wellness_workout_logs', 'wellness_nutrition_logs', 'wellness_daily_metrics',
    'wellness_meal_plans', 'exercise_library', 'workout_templates', 'meal_templates'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ===========================================================================
-- Row-level security.
--
-- User-owned tables get the standard four own-row policies (select / insert /
-- update / delete scoped to auth.uid()), generated below for consistency —
-- the loop produces exactly the same explicit policies as migrations 00003+
-- (USING and WITH CHECK on update; no broad policies).
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'wellness_enrollments', 'women_wellness_profiles', 'postpartum_profiles',
    'wellness_goals', 'wellness_daily_check_ins', 'postpartum_check_ins',
    'wellness_programs', 'wellness_daily_plans', 'wellness_workout_logs',
    'wellness_nutrition_logs', 'wellness_daily_metrics', 'wellness_meal_plans',
    'wellness_milestones'
  ] loop
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

-- postpartum tables: additionally require that the referenced enrollment is
-- the user's own RESTORE enrollment (defense in depth for Restore isolation).
drop policy if exists "postpartum_profiles_insert_own" on public.postpartum_profiles;
create policy "postpartum_profiles_insert_own" on public.postpartum_profiles
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.wellness_enrollments e
      where e.id = enrollment_id and e.user_id = auth.uid() and e.pathway_key = 'restore'
    )
  );

drop policy if exists "postpartum_profiles_update_own" on public.postpartum_profiles;
create policy "postpartum_profiles_update_own" on public.postpartum_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.wellness_enrollments e
      where e.id = enrollment_id and e.user_id = auth.uid() and e.pathway_key = 'restore'
    )
  );

drop policy if exists "postpartum_check_ins_insert_own" on public.postpartum_check_ins;
create policy "postpartum_check_ins_insert_own" on public.postpartum_check_ins
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.wellness_enrollments e
      where e.id = enrollment_id and e.user_id = auth.uid() and e.pathway_key = 'restore'
    )
  );

drop policy if exists "postpartum_check_ins_update_own" on public.postpartum_check_ins;
create policy "postpartum_check_ins_update_own" on public.postpartum_check_ins
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.wellness_enrollments e
      where e.id = enrollment_id and e.user_id = auth.uid() and e.pathway_key = 'restore'
    )
  );

-- wellness_exercise_logs: ownership via the parent workout log (both sides),
-- mirroring the conversation_turns parent-check pattern.
alter table public.wellness_exercise_logs enable row level security;

drop policy if exists "wellness_exercise_logs_select_own" on public.wellness_exercise_logs;
create policy "wellness_exercise_logs_select_own" on public.wellness_exercise_logs
  for select to authenticated using (
    exists (
      select 1 from public.wellness_workout_logs w
      where w.id = workout_log_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "wellness_exercise_logs_insert_own" on public.wellness_exercise_logs;
create policy "wellness_exercise_logs_insert_own" on public.wellness_exercise_logs
  for insert to authenticated with check (
    exists (
      select 1 from public.wellness_workout_logs w
      where w.id = workout_log_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "wellness_exercise_logs_update_own" on public.wellness_exercise_logs;
create policy "wellness_exercise_logs_update_own" on public.wellness_exercise_logs
  for update to authenticated
  using (
    exists (
      select 1 from public.wellness_workout_logs w
      where w.id = workout_log_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.wellness_workout_logs w
      where w.id = workout_log_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "wellness_exercise_logs_delete_own" on public.wellness_exercise_logs;
create policy "wellness_exercise_logs_delete_own" on public.wellness_exercise_logs
  for delete to authenticated using (
    exists (
      select 1 from public.wellness_workout_logs w
      where w.id = workout_log_id and w.user_id = auth.uid()
    )
  );

-- Global libraries: authenticated users read ACTIVE rows only; no client
-- write policies exist (maintained via migrations / server-only admin client).
do $$
declare t text;
begin
  foreach t in array array[
    'wellness_pathways', 'exercise_library', 'workout_templates', 'meal_templates'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_select_active" on public.%I', t, t);
    execute format(
      'create policy "%s_select_active" on public.%I
         for select to authenticated using (active = true)', t, t);
  end loop;
end $$;

-- workout_template_exercises: readable when the parent template is active.
alter table public.workout_template_exercises enable row level security;

drop policy if exists "workout_template_exercises_select_active"
  on public.workout_template_exercises;
create policy "workout_template_exercises_select_active" on public.workout_template_exercises
  for select to authenticated using (
    exists (
      select 1 from public.workout_templates t
      where t.id = template_id and t.active = true
    )
  );

-- ===========================================================================
-- SEED: exercise_library (32 exercises).
-- Notes:
--   * No exercise here presents pelvic-floor contractions as universally
--     appropriate; pelvic-floor guidance always notes that symptoms may
--     involve weakness, coordination difficulty, or overactivity and may
--     require individualized professional evaluation.
--   * avoid_when values feed the deterministic safety gate.
-- ===========================================================================
insert into public.exercise_library
  (slug, name, category, movement_pattern, primary_muscles, equipment, locations, difficulty,
   instructions, coaching_cues, common_mistakes, regression_slug, progression_slug,
   pathway_tags, safety_tags, avoid_when)
values
  ('walking', 'Walking', 'cardio', 'gait', '{legs,heart}', '{}', '{outdoors,home}', 'gentle',
   'Walk at a comfortable, sustainable pace. Start where you are; even a few minutes counts.',
   '{"Relaxed shoulders","Comfortable stride","Breathe easily"}',
   '{"Starting too fast"}', null, 'treadmill-walking',
   '{phoenix,restore,strong,nourish,reset}', '{low-impact,joint-friendly}', '{}'),
  ('treadmill-walking', 'Treadmill walking', 'cardio', 'gait', '{legs,heart}', '{treadmill}',
   '{gym,home}', 'beginner',
   'Walk on a treadmill at a pace where you could hold a conversation. Add gentle incline only when flat walking feels easy.',
   '{"Stand tall","Light hold on rails only if needed for balance"}',
   '{"Gripping the rails and leaning back","Too much incline too soon"}',
   'walking', null, '{phoenix,restore,strong,reset}', '{low-impact,joint-friendly}', '{}'),
  ('peloton-low-impact-ride', 'Low-impact Peloton ride', 'cardio', 'cycling', '{legs,heart}',
   '{stationary-bike}', '{home}', 'beginner',
   'Choose a low-impact class and stay seated throughout. Resistance stays light to moderate; effort stays conversational.',
   '{"Stay seated","Light resistance","Smooth circles"}',
   '{"Chasing the leaderboard on a recovery day"}', 'peloton-recovery-ride', null,
   '{phoenix,strong,reset}', '{low-impact,joint-friendly}', '{}'),
  ('peloton-recovery-ride', 'Recovery Peloton ride', 'recovery', 'cycling', '{legs}',
   '{stationary-bike}', '{home}', 'gentle',
   'A short, easy spin with minimal resistance. The goal is gentle movement and circulation, not effort.',
   '{"Very easy pace","This should feel refreshing, not tiring"}',
   '{"Turning recovery into a workout"}', null, 'peloton-low-impact-ride',
   '{phoenix,strong,restore,reset}', '{low-impact,joint-friendly}', '{}'),
  ('sit-to-stand', 'Sit-to-stand', 'strength', 'squat', '{quads,glutes}', '{chair}',
   '{home,gym}', 'gentle',
   'From sitting on a sturdy chair, stand up with control, then lower back down slowly. Use hands on thighs for help if needed.',
   '{"Feet flat and hip-width","Nose over toes to rise","Lower with control"}',
   '{"Dropping into the chair","Knees collapsing inward"}', null, 'bodyweight-squat-to-bench',
   '{restore,reset,phoenix,strong}', '{low-impact,no-floor-position,postpartum-early-stage}',
   '{acute_pain}'),
  ('bodyweight-squat-to-bench', 'Bodyweight squat to bench', 'strength', 'squat',
   '{quads,glutes}', '{bench}', '{home,gym}', 'beginner',
   'Stand in front of a bench, sit back until you lightly touch it, then stand. The bench keeps depth consistent and safe.',
   '{"Sit back, not just down","Light touch, no rest","Push through whole foot"}',
   '{"Plopping onto the bench","Heels lifting"}', 'sit-to-stand', 'goblet-squat-to-bench',
   '{phoenix,strong,restore}', '{joint-friendly}', '{acute_pain}'),
  ('goblet-squat-to-bench', 'Goblet squat to bench', 'strength', 'squat', '{quads,glutes,core}',
   '{dumbbell,bench}', '{home,gym}', 'beginner',
   'Hold one dumbbell at your chest and squat to a light bench touch. Choose a weight that leaves two easy reps in reserve.',
   '{"Elbows inside knees","Chest tall","Exhale as you stand"}',
   '{"Weight too heavy too soon","Holding breath"}', 'bodyweight-squat-to-bench', null,
   '{phoenix,strong}', '{core-pressure-aware}', '{doming_or_coning,acute_pain}'),
  ('leg-press', 'Leg press', 'strength', 'squat', '{quads,glutes}', '{leg-press-machine}',
   '{gym}', 'beginner',
   'Adjust the seat so knees start near 90 degrees. Press through the whole foot and return with control; do not lock knees hard.',
   '{"Control the return","Knees track over toes","Steady breathing"}',
   '{"Range too deep for comfort","Locking out hard"}', 'bodyweight-squat-to-bench', null,
   '{phoenix,strong}', '{joint-friendly}', '{acute_pain}'),
  ('seated-hamstring-curl', 'Seated hamstring curl', 'strength', 'hinge', '{hamstrings}',
   '{hamstring-curl-machine}', '{gym}', 'beginner',
   'Adjust the pad above the heels and curl down with control, then return slowly.',
   '{"Slow on the way back","Full comfortable range"}',
   '{"Using momentum"}', null, 'romanian-deadlift', '{phoenix,strong}', '{joint-friendly}',
   '{acute_pain}'),
  ('hip-abduction-machine', 'Hip abduction machine', 'strength', 'lateral', '{glutes,hips}',
   '{abduction-machine}', '{gym}', 'beginner',
   'Sit tall and press the pads outward with control, then return slowly.',
   '{"Tall posture","Smooth, controlled reps"}', '{"Rushing the reps"}', null, null,
   '{phoenix,strong,restore}', '{joint-friendly,postpartum-later-stage}', '{acute_pain}'),
  ('supported-split-squat', 'Supported split squat', 'strength', 'lunge', '{quads,glutes}',
   '{chair}', '{home,gym}', 'beginner',
   'Hold a chair or rail for balance in a split stance. Lower a few inches with control, then press back up; depth grows over time.',
   '{"Short range first","Front heel stays down","Use the support freely"}',
   '{"Too deep too soon","Front knee drifting inward"}', 'sit-to-stand', 'step-up',
   '{phoenix,strong,restore}', '{joint-friendly,postpartum-later-stage}',
   '{acute_pain,pelvic_symptoms}'),
  ('romanian-deadlift', 'Romanian deadlift', 'strength', 'hinge', '{hamstrings,glutes,back}',
   '{dumbbell}', '{home,gym}', 'intermediate',
   'With soft knees, hinge at the hips and slide the weights down your thighs, then stand tall. Range is set by hamstring stretch, not the floor.',
   '{"Hips back, chest proud","Weights close to legs","Exhale to stand"}',
   '{"Rounding the back","Turning it into a squat"}', 'glute-bridge', null,
   '{phoenix,strong}', '{core-pressure-aware}', '{doming_or_coning,acute_pain}'),
  ('step-up', 'Step-up', 'strength', 'lunge', '{quads,glutes}', '{step}', '{home,gym}',
   'beginner',
   'Step onto a low, stable surface, press through the whole foot to stand, then step down with control. Raise the height gradually.',
   '{"Whole foot on the step","Control the way down","Use a rail if helpful"}',
   '{"Pushing off the back leg","Step too high too soon"}', 'sit-to-stand', null,
   '{phoenix,strong,restore}', '{joint-friendly,no-floor-position,postpartum-later-stage}',
   '{acute_pain,pelvic_symptoms}'),
  ('glute-bridge', 'Glute bridge', 'strength', 'hinge', '{glutes,hamstrings}', '{mat}',
   '{home,gym}', 'beginner',
   'Lying on your back with knees bent, exhale and lift hips until your body forms a line from shoulders to knees, then lower slowly.',
   '{"Exhale as you lift","Ribs stay down","Squeeze at the top gently"}',
   '{"Arching the lower back","Pushing through the neck"}', null, 'romanian-deadlift',
   '{phoenix,strong,restore,reset}', '{postpartum-early-stage,core-pressure-aware}',
   '{acute_pain}'),
  ('machine-chest-press', 'Machine chest press', 'strength', 'push', '{chest,triceps,shoulders}',
   '{chest-press-machine}', '{gym}', 'beginner',
   'Adjust the seat so handles sit at mid-chest. Press forward with control and return slowly without letting the weight stack slam.',
   '{"Shoulders relaxed, down","Exhale on the press"}',
   '{"Flaring elbows hard","Half-range reps from a bad seat height"}', 'incline-push-up', null,
   '{phoenix,strong}', '{joint-friendly}', '{acute_pain}'),
  ('wall-push-up', 'Wall push-up', 'strength', 'push', '{chest,shoulders,core}', '{}',
   '{home}', 'gentle',
   'Hands on a wall at shoulder height, walk feet back slightly, lower your chest toward the wall with a straight body, then press away.',
   '{"Long line from head to heels","Exhale as you press","Gentle belly support"}',
   '{"Hips sagging","Shrugging shoulders"}', null, 'incline-push-up',
   '{restore,reset,phoenix,strong}',
   '{no-floor-position,postpartum-early-stage,core-pressure-aware}',
   '{doming_or_coning,acute_pain}'),
  ('incline-push-up', 'Incline push-up', 'strength', 'push', '{chest,shoulders,core}',
   '{bench}', '{home,gym}', 'beginner',
   'Hands on a sturdy elevated surface, body in one line, lower with control and press back up. Lower the surface height as you get stronger.',
   '{"Body moves as one piece","Watch for belly doming and raise the surface if it appears"}',
   '{"Hips piking or sagging","Surface too low too soon"}', 'wall-push-up',
   'machine-chest-press', '{phoenix,strong,restore}',
   '{core-pressure-aware,postpartum-later-stage}', '{doming_or_coning,acute_pain}'),
  ('seated-cable-row', 'Seated cable row', 'strength', 'pull', '{back,biceps}',
   '{cable-machine}', '{gym}', 'beginner',
   'Sit tall, pull the handle toward your lower ribs, squeeze the shoulder blades, then return with control.',
   '{"Tall spine","Lead with the elbows","Slow return"}',
   '{"Leaning far back to heave","Shrugging"}', null, null, '{phoenix,strong}',
   '{joint-friendly}', '{acute_pain}'),
  ('lat-pulldown', 'Lat pulldown', 'strength', 'pull', '{back,biceps}', '{cable-machine}',
   '{gym}', 'beginner',
   'Grip slightly wider than shoulders, pull the bar to the upper chest while staying tall, then return with control.',
   '{"Chest up","Elbows down and back","No swinging"}',
   '{"Pulling behind the neck","Using body momentum"}', null, null, '{phoenix,strong}',
   '{joint-friendly}', '{acute_pain}'),
  ('seated-dumbbell-shoulder-press', 'Seated dumbbell shoulder press', 'strength', 'push',
   '{shoulders,triceps}', '{dumbbell,bench}', '{gym,home}', 'beginner',
   'Seated with back supported, press dumbbells overhead with control and lower to about ear height.',
   '{"Ribs down","Exhale on the press","Smooth tempo"}',
   '{"Arching the lower back","Clanging the weights"}', 'wall-push-up', null,
   '{phoenix,strong}', '{core-pressure-aware}', '{doming_or_coning,acute_pain}'),
  ('farmer-carry', 'Farmer carry', 'strength', 'carry', '{grip,core,legs}', '{dumbbell}',
   '{gym,home}', 'beginner',
   'Hold a weight in each hand and walk tall for a set distance or time. Start light; posture is the exercise.',
   '{"Walk tall, eyes ahead","Shoulders quiet","Breathe normally"}',
   '{"Leaning to one side","Holding breath"}', null, null, '{phoenix,strong,restore}',
   '{core-pressure-aware,postpartum-later-stage,no-floor-position}',
   '{pelvic_symptoms,doming_or_coning,acute_pain}'),
  ('pallof-press', 'Pallof press', 'core', 'anti-rotation', '{core,obliques}',
   '{cable-machine,band}', '{gym,home}', 'beginner',
   'Stand side-on to a band or cable at chest height. Press hands straight out, resist the pull to rotate, then return.',
   '{"Ribs stacked over hips","Exhale as you press","Resist the twist quietly"}',
   '{"Shoulders creeping up","Leaning away instead of resisting"}', null, null,
   '{phoenix,strong,restore}', '{core-pressure-aware,postpartum-later-stage}',
   '{doming_or_coning,acute_pain}'),
  ('mobility-flow', 'Mobility flow', 'mobility', 'multi', '{hips,spine,shoulders}', '{mat}',
   '{home,gym}', 'gentle',
   'A gentle sequence of joint circles and easy reaches through comfortable ranges. Nothing should feel forced.',
   '{"Move slowly","Stay inside comfort","Breathe through each shape"}',
   '{"Bouncing into stretch"}', null, null, '{phoenix,strong,restore,rhythm,reset}',
   '{low-impact,joint-friendly}', '{}'),
  ('thoracic-mobility', 'Thoracic mobility', 'mobility', 'rotation', '{upper-back}', '{mat}',
   '{home,gym}', 'gentle',
   'Seated or side-lying, rotate gently through the upper back with slow breaths, opening a little further on each exhale.',
   '{"Rotate from the ribs, not the lower back","Exhale into the turn"}',
   '{"Forcing range"}', null, null, '{phoenix,strong,restore,reset}',
   '{low-impact,joint-friendly}', '{}'),
  ('gentle-stretching', 'Gentle stretching', 'mobility', 'static', '{full-body}', '{mat}',
   '{home}', 'gentle',
   'Hold easy stretches for the major muscle groups at mild tension only, breathing slowly. This is care, not effort.',
   '{"Mild tension, never pain","Long, slow exhales"}', '{"Stretching into pain"}',
   null, null, '{phoenix,strong,restore,rhythm,reset}', '{low-impact}', '{}'),
  ('diaphragmatic-breathing', 'Diaphragmatic breathing', 'breathwork', 'breathing',
   '{diaphragm,core}', '{}', '{home}', 'gentle',
   'Seated or lying comfortably, breathe low and wide so the belly and lower ribs expand, then exhale slowly and fully.',
   '{"Inhale low and wide","Long soft exhale","No forcing"}',
   '{"Breathing only into the chest","Gripping the belly"}', null, '360-breathing',
   '{restore,reset,rhythm,phoenix,strong,nourish}', '{postpartum-early-stage,low-impact}',
   '{}'),
  ('360-breathing', '360 breathing', 'breathwork', 'breathing', '{diaphragm,core,pelvic-floor}',
   '{}', '{home}', 'gentle',
   'Breathe into the belly, sides, and back of the ribs like filling a cylinder, then exhale slowly and let everything soften. A gentle foundation for reconnecting breath and deep core after birth. Pelvic-floor symptoms are not all the same — they may involve weakness, coordination difficulty, or overactivity — so this practice stays gentle and never prescribes contractions; persistent symptoms deserve an individualized evaluation by a qualified professional.',
   '{"Ribs expand in all directions","Exhale fully and soften","Never strain or brace"}',
   '{"Forcing the breath","Treating it as a workout"}', 'diaphragmatic-breathing', null,
   '{restore,reset}', '{postpartum-early-stage,low-impact,pelvic-floor-aware}', '{}'),
  ('supported-heel-slide', 'Supported heel slide', 'core', 'stability', '{deep-core}', '{mat}',
   '{home}', 'gentle',
   'Lying with knees bent, exhale and slide one heel slowly along the floor, then return. The rest of the body stays quiet and relaxed.',
   '{"Move only the leg","Exhale on the slide","Stop if the belly domes"}',
   '{"Holding breath","Rushing"}', null, 'supported-marching', '{restore}',
   '{postpartum-early-stage,core-pressure-aware,pelvic-floor-aware}',
   '{doming_or_coning,acute_pain}'),
  ('bent-knee-fallout', 'Bent-knee fallout', 'core', 'stability', '{deep-core,obliques}',
   '{mat}', '{home}', 'gentle',
   'Lying with knees bent, exhale and let one knee fall slowly outward a comfortable distance, then return without the pelvis rocking. If pelvic-floor symptoms are present, keep the range small and unhurried — symptoms can reflect weakness, coordination difficulty, or overactivity, and persistent ones are best guided by an individualized professional evaluation.',
   '{"Pelvis stays level","Small range first","Slow exhale throughout"}',
   '{"Letting the pelvis roll","Range too big too soon"}', 'supported-heel-slide', null,
   '{restore}', '{postpartum-early-stage,core-pressure-aware,pelvic-floor-aware}',
   '{doming_or_coning,acute_pain}'),
  ('supported-marching', 'Supported marching', 'core', 'stability', '{deep-core,hip-flexors}',
   '{mat}', '{home}', 'gentle',
   'Lying with knees bent, exhale and float one foot a few inches off the floor, hold briefly, then lower with control and switch sides.',
   '{"Exhale as the foot lifts","Lower back stays settled","Alternate slowly"}',
   '{"Belly doming","Both feet at once too soon"}', 'supported-heel-slide',
   'bird-dog-regression', '{restore,reset}',
   '{postpartum-early-stage,core-pressure-aware}', '{doming_or_coning,acute_pain}'),
  ('bird-dog-regression', 'Bird-dog regression', 'core', 'stability', '{deep-core,back,glutes}',
   '{mat}', '{home}', 'beginner',
   'On hands and knees, slide one leg back along the floor with an exhale, then return; progress to lifting the leg only when the trunk stays quiet.',
   '{"Hips stay level","Slide before you lift","Exhale on the reach"}',
   '{"Arching to lift higher","Wobbling through the trunk"}', 'supported-marching', null,
   '{restore,strong,phoenix}', '{core-pressure-aware,postpartum-later-stage}',
   '{doming_or_coning,acute_pain}'),
  ('short-recovery-walk', 'Short recovery walk', 'recovery', 'gait', '{legs}', '{}',
   '{outdoors,home}', 'gentle',
   'A brief, easy walk of five to fifteen minutes at a truly comfortable pace. Fresh air and gentle motion are the whole point.',
   '{"Easy pace","Stop while it still feels good"}', '{"Turning it into a workout"}',
   null, 'walking', '{restore,reset,phoenix,strong,nourish,rhythm}',
   '{low-impact,postpartum-early-stage}', '{}')
on conflict (slug) do nothing;

-- ===========================================================================
-- SEED: workout_templates (14 templates).
-- ===========================================================================
insert into public.workout_templates
  (slug, name, description, pathway_tags, location, approximate_minutes, phase_min, phase_max,
   difficulty, safety_tags, intensity_guidance, modification_notes)
values
  ('reset-10-minute-movement', '10-minute Reset movement',
   'A tiny, kind session for hard days: easy movement, gentle stretch, slow breath. Doing it at all is the win.',
   '{reset}', 'home', 10, 1, 99, 'gentle', '{low-impact,no-equipment}',
   'Effort stays at 2-3 out of 10. Stop early any time; partial counts fully.',
   'Every piece can be done seated. Skip anything that does not feel kind today.'),
  ('home-foundation-15', '15-minute home foundation',
   'A short full-body starter for home: sit-to-stands, wall push-ups, bridges, and a gentle finish.',
   '{phoenix,strong}', 'home', 15, 1, 2, 'beginner', '{low-impact,no-equipment}',
   'Effort 4-5 out of 10; two easy reps always left in reserve.',
   'Reduce reps freely; the schedule matters more than the numbers.'),
  ('home-full-body-20', '20-minute home full body',
   'A compact full-body session with squat, push, hinge, and core patterns using minimal equipment.',
   '{phoenix,strong}', 'home', 20, 1, 3, 'beginner', '{low-impact}',
   'Effort 5-6 out of 10; stop each set with reps in reserve.',
   'Swap incline push-ups for wall push-ups any day; shorten rounds when time is tight.'),
  ('home-full-body-30', '30-minute home full body',
   'A fuller home session: lower body, upper body, carry, and core with unhurried rest.',
   '{phoenix,strong}', 'home', 30, 2, 99, 'intermediate', '{}',
   'Effort 6-7 out of 10 on work sets; never to failure.',
   'Any exercise can drop back to its regression without changing the session.'),
  ('pf-beginner-full-body-a', 'Planet Fitness beginner full body A',
   'Machine-guided full body: leg press, chest press, cable row, and a carry to finish.',
   '{phoenix,strong}', 'gym', 35, 1, 3, 'beginner', '{machine-guided,joint-friendly}',
   'Choose weights leaving 2-3 reps in reserve; rest about a minute between sets.',
   'Every machine has a lighter setting than you think you need — start there.'),
  ('pf-beginner-full-body-b', 'Planet Fitness beginner full body B',
   'The partner session to A: hamstring curl, lat pulldown, shoulder press, and hip abduction.',
   '{phoenix,strong}', 'gym', 35, 1, 3, 'beginner', '{machine-guided,joint-friendly}',
   'Choose weights leaving 2-3 reps in reserve; rest about a minute between sets.',
   'Alternate with session A across the week.'),
  ('pf-lower-body', 'Planet Fitness lower body',
   'A focused lower-body session: leg press, hamstring curl, hip abduction, step-ups.',
   '{phoenix,strong}', 'gym', 30, 2, 99, 'beginner', '{machine-guided}',
   'Effort 6 out of 10; add small weight increases only when all reps feel smooth.',
   'Step-ups can use the lowest step or be swapped for supported split squats.'),
  ('pf-upper-body', 'Planet Fitness upper body',
   'A focused upper-body session: chest press, cable row, lat pulldown, shoulder press.',
   '{phoenix,strong}', 'gym', 30, 2, 99, 'beginner', '{machine-guided}',
   'Effort 6 out of 10; smooth reps, quiet shoulders.',
   'Shoulder press can be swapped for incline push-ups.'),
  ('peloton-low-impact-20', '20-minute low-impact Peloton day',
   'One low-impact ride plus a short stretch. Seated, steady, conversational.',
   '{phoenix,strong,reset}', 'home', 25, 1, 99, 'beginner', '{low-impact}',
   'Stay conversational throughout; resistance light to moderate.',
   'Shorten to a 10- or 15-minute class freely.'),
  ('peloton-recovery-day', 'Peloton recovery day',
   'A gentle recovery spin and unhurried stretching. Circulation, not effort.',
   '{phoenix,strong,restore,reset}', 'home', 20, 1, 99, 'gentle', '{low-impact}',
   'Effort 2-3 out of 10. This should feel better at the end than the start.',
   'Swap the ride for a short walk on any day.'),
  ('restore-gentle-recovery', 'Restore gentle recovery',
   'Early postpartum reconnection: 360 breathing, heel slides, supported marching, and a short walk. No floor rush, no pressure.',
   '{restore}', 'home', 15, 1, 1, 'gentle',
   '{postpartum-early-stage,low-impact,no-equipment,pelvic-floor-aware}',
   'Everything stays easy and unhurried; breath leads every movement. Stop with anything that increases bleeding, pain, heaviness, or doming.',
   'Each movement can shrink or be skipped. Symptoms that persist deserve a conversation with your provider or a pelvic-health professional.'),
  ('restore-return-to-strength', 'Restore return-to-strength foundation',
   'A later-stage Restore session: sit-to-stands, wall or incline push-ups, glute bridges, bird-dog regressions, and a walk.',
   '{restore}', 'home', 20, 2, 99, 'beginner',
   '{postpartum-later-stage,low-impact,core-pressure-aware}',
   'Effort 4-5 out of 10; watch for doming, heaviness, or leaking and scale back if they appear.',
   'Regressions are always available and always respectable.'),
  ('walking-mobility-day', 'Walking and mobility day',
   'A walk at a comfortable pace plus a short mobility flow. Simple, repeatable, restorative.',
   '{phoenix,strong,nourish,rhythm,reset,restore}', 'outdoors', 30, 1, 99, 'gentle',
   '{low-impact,no-equipment}',
   'Conversational pace; mobility stays inside comfortable ranges.',
   'Split the walk into two shorter walks whenever that fits life better.'),
  ('no-floor-transition-workout', 'No-floor-transition workout',
   'A full session with zero getting up and down from the floor: sit-to-stands, wall push-ups, step-ups, supported split squats, farmer carry.',
   '{phoenix,strong,restore,reset}', 'home', 20, 1, 99, 'beginner',
   '{no-floor-position,low-impact,joint-friendly}',
   'Effort 4-6 out of 10; every movement starts standing or seated.',
   'Built for days when floor transitions are painful or impractical.')
on conflict (slug) do nothing;


-- ===========================================================================
-- SEED: workout_template_exercises (ordered prescriptions).
-- ===========================================================================
insert into public.workout_template_exercises
  (template_id, exercise_id, sequence_number, sets, reps, duration_seconds, rest_seconds,
   intensity_guidance, modification_notes)
select t.id, e.id, x.seq, x.sets, x.reps, x.dur, x.rest, x.intensity, x.modification
from (values
  -- 10-minute Reset movement
  ('reset-10-minute-movement', 'short-recovery-walk', 1, null, null, 240, 0, 'Very easy', 'March gently in place if staying in'),
  ('reset-10-minute-movement', 'gentle-stretching', 2, null, null, 240, 0, 'Mild tension only', 'Seated versions welcome'),
  ('reset-10-minute-movement', 'diaphragmatic-breathing', 3, null, null, 120, 0, 'Slow and soft', null),
  -- 15-minute home foundation
  ('home-foundation-15', 'sit-to-stand', 1, 2, '8', null, 60, 'Leave 2 easy reps in reserve', 'Hands on thighs to assist'),
  ('home-foundation-15', 'wall-push-up', 2, 2, '8', null, 60, 'Smooth and controlled', null),
  ('home-foundation-15', 'glute-bridge', 3, 2, '10', null, 60, 'Gentle squeeze at top', null),
  ('home-foundation-15', 'gentle-stretching', 4, null, null, 180, 0, 'Easy finish', null),
  -- 20-minute home full body
  ('home-full-body-20', 'bodyweight-squat-to-bench', 1, 3, '10', null, 60, 'Reps in reserve', 'Sit-to-stand if needed'),
  ('home-full-body-20', 'incline-push-up', 2, 3, '8', null, 60, 'Raise surface if belly domes', 'Wall push-up any day'),
  ('home-full-body-20', 'glute-bridge', 3, 3, '12', null, 60, 'Exhale to lift', null),
  ('home-full-body-20', 'supported-marching', 4, 2, '8 per side', null, 45, 'Slow and quiet', null),
  ('home-full-body-20', 'gentle-stretching', 5, null, null, 120, 0, 'Easy finish', null),
  -- 30-minute home full body
  ('home-full-body-30', 'goblet-squat-to-bench', 1, 3, '10', null, 75, 'Two reps in reserve', 'Bodyweight version any day'),
  ('home-full-body-30', 'incline-push-up', 2, 3, '10', null, 75, 'Controlled tempo', null),
  ('home-full-body-30', 'romanian-deadlift', 3, 3, '10', null, 75, 'Hinge, do not squat', 'Glute bridge as regression'),
  ('home-full-body-30', 'farmer-carry', 4, 3, null, 30, 60, 'Posture is the exercise', 'Lighter weights welcome'),
  ('home-full-body-30', 'pallof-press', 5, 2, '10 per side', null, 45, 'Quiet resistance', null),
  ('home-full-body-30', 'gentle-stretching', 6, null, null, 180, 0, 'Easy finish', null),
  -- Planet Fitness A
  ('pf-beginner-full-body-a', 'treadmill-walking', 1, null, null, 300, 0, 'Warm-up pace', null),
  ('pf-beginner-full-body-a', 'leg-press', 2, 3, '10', null, 75, '2-3 reps in reserve', null),
  ('pf-beginner-full-body-a', 'machine-chest-press', 3, 3, '10', null, 75, '2-3 reps in reserve', null),
  ('pf-beginner-full-body-a', 'seated-cable-row', 4, 3, '10', null, 75, '2-3 reps in reserve', null),
  ('pf-beginner-full-body-a', 'farmer-carry', 5, 2, null, 30, 60, 'Walk tall', null),
  -- Planet Fitness B
  ('pf-beginner-full-body-b', 'treadmill-walking', 1, null, null, 300, 0, 'Warm-up pace', null),
  ('pf-beginner-full-body-b', 'seated-hamstring-curl', 2, 3, '10', null, 75, '2-3 reps in reserve', null),
  ('pf-beginner-full-body-b', 'lat-pulldown', 3, 3, '10', null, 75, '2-3 reps in reserve', null),
  ('pf-beginner-full-body-b', 'seated-dumbbell-shoulder-press', 4, 3, '10', null, 75, '2-3 reps in reserve', 'Incline push-up swap'),
  ('pf-beginner-full-body-b', 'hip-abduction-machine', 5, 2, '12', null, 60, 'Smooth reps', null),
  -- PF lower
  ('pf-lower-body', 'treadmill-walking', 1, null, null, 300, 0, 'Warm-up pace', null),
  ('pf-lower-body', 'leg-press', 2, 3, '10', null, 75, 'Small increases only', null),
  ('pf-lower-body', 'seated-hamstring-curl', 3, 3, '10', null, 75, 'Slow return', null),
  ('pf-lower-body', 'hip-abduction-machine', 4, 3, '12', null, 60, 'Tall posture', null),
  ('pf-lower-body', 'step-up', 5, 2, '8 per side', null, 60, 'Lowest step first', 'Supported split squat swap'),
  -- PF upper
  ('pf-upper-body', 'treadmill-walking', 1, null, null, 300, 0, 'Warm-up pace', null),
  ('pf-upper-body', 'machine-chest-press', 2, 3, '10', null, 75, 'Quiet shoulders', null),
  ('pf-upper-body', 'seated-cable-row', 3, 3, '10', null, 75, 'Lead with elbows', null),
  ('pf-upper-body', 'lat-pulldown', 4, 3, '10', null, 75, 'No swinging', null),
  ('pf-upper-body', 'seated-dumbbell-shoulder-press', 5, 2, '10', null, 75, 'Ribs down', 'Incline push-up swap'),
  -- Peloton days
  ('peloton-low-impact-20', 'peloton-low-impact-ride', 1, null, null, 1200, 0, 'Conversational', 'Shorter class welcome'),
  ('peloton-low-impact-20', 'gentle-stretching', 2, null, null, 300, 0, 'Easy finish', null),
  ('peloton-recovery-day', 'peloton-recovery-ride', 1, null, null, 900, 0, 'Very easy', 'Short walk swap'),
  ('peloton-recovery-day', 'gentle-stretching', 2, null, null, 300, 0, 'Mild tension only', null),
  -- Restore gentle recovery
  ('restore-gentle-recovery', '360-breathing', 1, null, null, 180, 0, 'Breath leads', null),
  ('restore-gentle-recovery', 'supported-heel-slide', 2, 2, '6 per side', null, 45, 'Slow, quiet body', 'Shrink the range freely'),
  ('restore-gentle-recovery', 'supported-marching', 3, 2, '6 per side', null, 45, 'Stop if doming appears', null),
  ('restore-gentle-recovery', 'short-recovery-walk', 4, null, null, 300, 0, 'Truly easy', 'Optional some days'),
  -- Restore return to strength
  ('restore-return-to-strength', '360-breathing', 1, null, null, 120, 0, 'Settle in', null),
  ('restore-return-to-strength', 'sit-to-stand', 2, 2, '10', null, 60, 'Controlled pace', null),
  ('restore-return-to-strength', 'incline-push-up', 3, 2, '8', null, 60, 'Raise surface if doming', 'Wall push-up any day'),
  ('restore-return-to-strength', 'glute-bridge', 4, 2, '12', null, 60, 'Exhale to lift', null),
  ('restore-return-to-strength', 'bird-dog-regression', 5, 2, '6 per side', null, 45, 'Slide before you lift', 'Supported marching swap'),
  ('restore-return-to-strength', 'short-recovery-walk', 6, null, null, 300, 0, 'Comfortable pace', null),
  -- Walking and mobility
  ('walking-mobility-day', 'walking', 1, null, null, 1500, 0, 'Conversational pace', 'Split into two walks'),
  ('walking-mobility-day', 'mobility-flow', 2, null, null, 420, 0, 'Comfortable ranges', null),
  -- No-floor-transition
  ('no-floor-transition-workout', 'sit-to-stand', 1, 3, '10', null, 60, 'Control the lower', null),
  ('no-floor-transition-workout', 'wall-push-up', 2, 3, '10', null, 60, 'Long body line', null),
  ('no-floor-transition-workout', 'step-up', 3, 3, '8 per side', null, 60, 'Low step', 'Hold a rail'),
  ('no-floor-transition-workout', 'supported-split-squat', 4, 2, '8 per side', null, 60, 'Short range first', null),
  ('no-floor-transition-workout', 'farmer-carry', 5, 2, null, 30, 60, 'Walk tall', null)
) as x(template_slug, exercise_slug, seq, sets, reps, dur, rest, intensity, modification)
join public.workout_templates t on t.slug = x.template_slug
join public.exercise_library e on e.slug = x.exercise_slug
on conflict (template_id, sequence_number) do nothing;

-- ===========================================================================
-- SEED: meal_templates (18 meals). ALL nutrition values are ESTIMATES; the
-- application labels them as such everywhere they appear.
-- ===========================================================================
insert into public.meal_templates
  (slug, name, meal_type, description, preparation_minutes, servings, estimated_calories,
   protein_grams, carbohydrates_grams, fat_grams, fiber_grams, iron_rich, pathway_tags,
   breastfeeding_compatible, freezer_friendly, budget_tier, dietary_tags, allergen_tags,
   ingredients, instructions)
values
  ('egg-white-breakfast-wrap', 'Egg and egg-white breakfast wrap', 'breakfast',
   'A warm tortilla with one egg plus egg whites, cheese, and spinach. Values are estimates.',
   10, 1, 340, 28, 30, 12, 4, false, '{phoenix,nourish,strong}', true, false, 'low',
   '{vegetarian}', '{egg,dairy,gluten}',
   '["1 whole egg", "3/4 cup egg whites", "1 whole-wheat tortilla", "1/4 cup shredded cheese", "handful spinach"]',
   '{"Scramble the egg and whites with spinach.","Warm the tortilla, add eggs and cheese, and roll."}'),
  ('greek-yogurt-protein-bowl', 'Greek yogurt protein bowl', 'breakfast',
   'Plain Greek yogurt with berries, a spoon of honey, and crunchy topping. Values are estimates.',
   5, 1, 320, 24, 38, 8, 5, false, '{phoenix,nourish,strong,rhythm}', true, false, 'low',
   '{vegetarian,no-cook}', '{dairy}',
   '["1 cup plain Greek yogurt", "3/4 cup mixed berries", "1 tsp honey", "2 tbsp granola or nuts"]',
   '{"Layer yogurt, berries, honey, and topping in a bowl."}'),
  ('protein-oatmeal', 'Protein oatmeal', 'breakfast',
   'Oats cooked with milk and stirred with protein powder and fruit. Values are estimates.',
   8, 1, 380, 28, 50, 8, 7, false, '{phoenix,nourish,strong,restore}', true, false, 'low',
   '{vegetarian}', '{dairy,gluten}',
   '["1/2 cup rolled oats", "1 cup milk", "1 scoop protein powder", "1/2 banana or berries", "cinnamon"]',
   '{"Cook oats in milk.","Off heat, stir in protein powder.","Top with fruit and cinnamon."}'),
  ('berry-protein-smoothie', 'Berry protein smoothie', 'breakfast',
   'A quick blended smoothie with berries, protein, and spinach. Values are estimates.',
   5, 1, 290, 26, 34, 5, 6, false, '{phoenix,nourish,rhythm,reset,restore}', true, false, 'low',
   '{vegetarian,no-cook}', '{dairy}',
   '["1 cup frozen mixed berries", "1 scoop protein powder", "1 cup milk or fortified alternative", "handful spinach", "1/2 banana"]',
   '{"Blend everything until smooth."}'),
  ('freezer-breakfast-burrito', 'Freezer breakfast burrito', 'breakfast',
   'Make-ahead burritos with eggs, beans, and cheese — freeze and reheat. Values are estimates.',
   30, 6, 380, 22, 40, 14, 6, true, '{phoenix,nourish,restore}', true, true, 'low',
   '{vegetarian,meal-prep}', '{egg,dairy,gluten}',
   '["8 eggs", "1 can black beans", "6 tortillas", "1 cup shredded cheese", "salsa"]',
   '{"Scramble eggs; warm beans.","Fill tortillas with eggs, beans, cheese, salsa; roll tightly.","Wrap individually and freeze; reheat as needed."}'),
  ('rotisserie-chicken-rice-bowl', 'Rotisserie chicken rice bowl', 'lunch',
   'Shredded rotisserie chicken over rice with a quick vegetable. Values are estimates.',
   10, 1, 430, 35, 45, 10, 4, false, '{phoenix,nourish,strong}', true, false, 'low',
   '{gluten-free-option,no-cook-option}', '{}',
   '["1 cup shredded rotisserie chicken", "3/4 cup cooked rice", "1 cup steam-bag vegetables", "1 tbsp sauce of choice"]',
   '{"Warm rice and vegetables.","Top with chicken and sauce."}'),
  ('turkey-taco-bowl', 'Turkey taco bowl', 'dinner',
   'Seasoned lean ground turkey with rice, beans, and toppings. Values are estimates.',
   20, 4, 450, 34, 48, 12, 8, true, '{phoenix,nourish,strong}', true, true, 'low',
   '{gluten-free-option,meal-prep}', '{dairy-optional}',
   '["1 lb lean ground turkey", "taco seasoning", "2 cups cooked rice", "1 can black beans", "lettuce, tomato, yogurt or cheese"]',
   '{"Brown turkey with seasoning.","Serve over rice and beans with toppings."}'),
  ('tuna-white-bean-salad', 'Tuna and white-bean salad', 'lunch',
   'A no-cook bowl of tuna, white beans, olive oil, and lemon. Values are estimates.',
   8, 2, 330, 28, 28, 11, 8, true, '{phoenix,nourish}', true, false, 'low',
   '{no-cook,gluten-free,dairy-free}', '{fish}',
   '["2 cans tuna", "1 can white beans", "1 tbsp olive oil", "lemon juice", "red onion, parsley"]',
   '{"Drain tuna and beans.","Toss everything together; season to taste."}'),
  ('chicken-caesar-wrap', 'Chicken Caesar wrap', 'lunch',
   'A quick wrap with chicken, romaine, parmesan, and light Caesar. Values are estimates.',
   10, 1, 420, 34, 35, 15, 4, false, '{phoenix,nourish,strong}', true, false, 'medium',
   '{}', '{gluten,dairy,egg,fish}',
   '["1 cup cooked chicken", "1 large tortilla", "romaine", "2 tbsp light Caesar dressing", "1 tbsp parmesan"]',
   '{"Toss chicken and romaine with dressing.","Fill the tortilla, add parmesan, and roll."}'),
  ('sheet-pan-chicken-vegetables', 'Sheet-pan chicken and vegetables', 'dinner',
   'Chicken thighs or breast roasted with potatoes and vegetables on one pan. Values are estimates.',
   40, 4, 460, 36, 38, 16, 6, false, '{phoenix,nourish,strong,restore}', true, true, 'medium',
   '{gluten-free,dairy-free,meal-prep}', '{}',
   '["1.5 lb chicken", "1 lb baby potatoes", "2 cups broccoli or green beans", "olive oil", "seasoning"]',
   '{"Toss everything with oil and seasoning.","Roast at 425 F until chicken is cooked through."}'),
  ('salmon-potatoes-greens', 'Salmon, potatoes, and a green vegetable', 'dinner',
   'Baked salmon with roasted potatoes and a simple green vegetable. Values are estimates.',
   30, 2, 480, 34, 40, 18, 6, false, '{phoenix,nourish,strong,rhythm}', true, false, 'high',
   '{gluten-free,dairy-free}', '{fish}',
   '["2 salmon fillets", "3/4 lb potatoes", "green vegetable of choice", "olive oil", "lemon"]',
   '{"Roast potatoes; add salmon partway through.","Steam or roast the green vegetable; finish with lemon."}'),
  ('lean-beef-stir-fry', 'Lean beef stir-fry', 'dinner',
   'Quick-seared lean beef with frozen stir-fry vegetables over rice. Iron-supportive. Values are estimates.',
   20, 3, 440, 32, 44, 14, 5, true, '{phoenix,nourish,strong,restore}', true, false, 'medium',
   '{dairy-free}', '{soy,gluten-optional}',
   '["1 lb lean beef strips", "1 bag stir-fry vegetables", "2 tbsp stir-fry sauce", "2 cups cooked rice"]',
   '{"Sear beef in batches.","Add vegetables and sauce; serve over rice."}'),
  ('turkey-meatballs-pasta', 'Turkey meatballs and pasta', 'dinner',
   'Lean turkey meatballs in marinara over pasta. Freezer-friendly. Values are estimates.',
   35, 4, 470, 33, 52, 13, 7, true, '{phoenix,nourish,strong}', true, true, 'low',
   '{meal-prep}', '{gluten,egg}',
   '["1 lb lean ground turkey", "breadcrumbs and 1 egg", "1 jar marinara", "8 oz whole-wheat pasta"]',
   '{"Form and bake meatballs.","Simmer in marinara; serve over pasta."}'),
  ('shrimp-rice-bowl', 'Shrimp rice bowl', 'dinner',
   'Fast-cooking shrimp with rice, edamame, and a simple sauce. Values are estimates.',
   15, 2, 410, 32, 48, 9, 5, true, '{phoenix,nourish}', true, false, 'medium',
   '{dairy-free}', '{shellfish,soy}',
   '["3/4 lb shrimp", "1.5 cups cooked rice", "1 cup edamame", "soy-ginger sauce", "cucumber"]',
   '{"Sear shrimp quickly.","Assemble bowls with rice, edamame, cucumber, and sauce."}'),
  ('cottage-cheese-snack-plate', 'Cottage-cheese snack plate', 'snack',
   'Cottage cheese with fruit and whole-grain crackers. Values are estimates.',
   5, 1, 250, 20, 24, 8, 3, false, '{phoenix,nourish,strong,reset}', true, false, 'low',
   '{vegetarian,no-cook}', '{dairy,gluten-optional}',
   '["3/4 cup cottage cheese", "1/2 cup pineapple or berries", "whole-grain crackers"]',
   '{"Arrange on a plate. Done."}'),
  ('yogurt-protein-pudding', 'Yogurt protein pudding', 'snack',
   'Greek yogurt whipped with protein powder and cocoa — dessert-like, high protein. Values are estimates.',
   5, 1, 220, 25, 18, 4, 2, false, '{phoenix,nourish,strong,rhythm}', true, false, 'low',
   '{vegetarian,no-cook}', '{dairy}',
   '["3/4 cup plain Greek yogurt", "1/2 scoop protein powder", "1 tsp cocoa powder", "berries on top"]',
   '{"Stir vigorously until smooth; chill if you have time."}'),
  ('iron-supportive-beef-bowl', 'Iron-supportive lean beef bowl', 'dinner',
   'Lean beef with lentils, spinach, and rice — built around iron-rich foods with vitamin-C pairing. Values are estimates.',
   25, 3, 460, 35, 46, 13, 9, true, '{restore,nourish,phoenix,rhythm}', true, true, 'medium',
   '{dairy-free,meal-prep}', '{}',
   '["3/4 lb lean ground beef", "1 cup cooked lentils", "2 cups spinach", "1.5 cups cooked rice", "bell pepper or citrus for vitamin C"]',
   '{"Brown beef; wilt in spinach.","Fold in lentils; serve over rice with pepper or citrus."}'),
  ('lentil-chicken-soup', 'Lentil and chicken soup', 'dinner',
   'A big pot of lentil and chicken soup — fiber, iron, and freezer-friendly comfort. Values are estimates.',
   45, 6, 340, 28, 38, 8, 10, true, '{nourish,restore,phoenix,reset}', true, true, 'low',
   '{dairy-free,gluten-free,meal-prep}', '{}',
   '["1 lb chicken thighs", "1.5 cups dry lentils", "carrots, celery, onion", "8 cups broth", "seasoning"]',
   '{"Simmer everything until lentils are tender.","Shred chicken back into the pot; season and serve or freeze."}')
on conflict (slug) do nothing;

-- wellness_program_weeks: owned via the parent program (both sides), like
-- wellness_exercise_logs above.
alter table public.wellness_program_weeks enable row level security;

drop policy if exists "wellness_program_weeks_select_own" on public.wellness_program_weeks;
create policy "wellness_program_weeks_select_own" on public.wellness_program_weeks
  for select to authenticated using (
    exists (
      select 1 from public.wellness_programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "wellness_program_weeks_insert_own" on public.wellness_program_weeks;
create policy "wellness_program_weeks_insert_own" on public.wellness_program_weeks
  for insert to authenticated with check (
    exists (
      select 1 from public.wellness_programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "wellness_program_weeks_update_own" on public.wellness_program_weeks;
create policy "wellness_program_weeks_update_own" on public.wellness_program_weeks
  for update to authenticated
  using (
    exists (
      select 1 from public.wellness_programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.wellness_programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "wellness_program_weeks_delete_own" on public.wellness_program_weeks;
create policy "wellness_program_weeks_delete_own" on public.wellness_program_weeks
  for delete to authenticated using (
    exists (
      select 1 from public.wellness_programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  );
