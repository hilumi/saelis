-- Saelis v0.8 — Web Beta Readiness.
-- Lean launch-blocker migration: onboarding flag, updated feedback categories,
-- and a founder-only aggregate for feedback categories. No new data models.

-- ---------------------------------------------------------------------------
-- Onboarding: one timestamp on the existing profile row. Completed (or
-- skipped) once, never shown again. Existing beta users see onboarding once.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists onboarded_at timestamptz;

-- ---------------------------------------------------------------------------
-- Feedback categories: replace the "Not quite" category set with the beta
-- wording. Old values remain valid so existing rows keep satisfying the
-- constraint; no content column is added — feedback stores NO conversation
-- text, by schema.
-- ---------------------------------------------------------------------------
alter table public.stewardship_events
  drop constraint if exists stewardship_events_feedback_category_check;
alter table public.stewardship_events
  add constraint stewardship_events_feedback_category_check check (feedback_category in (
    -- v0.8 beta categories
    'too-soft', 'too-direct', 'too-long', 'too-generic', 'missed-need',
    'humor-did-not-land',
    -- legacy values (existing rows)
    'too-much-advice', 'tone', 'other'
  ));

-- ---------------------------------------------------------------------------
-- Founder aggregate: "Not quite" category counts. Counts only; authorization
-- checked in the body; search path pinned; no content column selected.
-- ---------------------------------------------------------------------------
create or replace function public.feedback_category_counts(days integer default 30)
returns table (feedback_category text, occurrences bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_founder() then
    raise exception 'not authorized';
  end if;
  return query
    select e.feedback_category, count(*)::bigint
    from public.stewardship_events e
    where e.event_type = 'response_feedback_negative'
      and e.feedback_category is not null
      and e.created_at > now() - make_interval(days => days)
    group by e.feedback_category;
end;
$$;
