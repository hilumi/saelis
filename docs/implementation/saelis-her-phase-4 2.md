# Saelis Her — Phase 4 Report (Product Experience)

Date: 2026-07-17 · Status: complete · Not committed, not pushed, not deployed, no migration applied.

## Implementation summary

Phase 4 surfaces the deterministic engines as the user-facing product: a proactive,
priority-ordered Saelis Her Today experience, adaptive check-ins that regenerate the plan and
explain themselves, full workout display/logging, nutrition and hydration logging with quick
adds, the weekly meal-plan screen, honest progress analytics, milestone display, discreet
Restore cards with symptom check-ins, Reset/minimum-viable-day mode, the deterministic
notification policy layer, bounded companion integration, privacy/data controls with wellness
deletion, timezone-correct local days, and empty/loading/error states throughout. `/home`
remains the sanctuary with its single quiet entry card — no competing dashboard was created.

## Routes created / reshaped

- `/wellness/her` — Her Today (rebuilt): safety banner → readiness check-in (5 states +
  optional detail disclosure) → next best action → workout/recovery card → nourishment →
  Restore card (Restore only) → milestone → evening reflection; quick-action row; pre-onboarding
  and no-pathway empty states; plan-error fallback.
- `/wellness/her/meals` — weekly plan: build/regenerate week, per-meal Log and Swap, grocery
  highlights, prep/leftovers guidance, filters label, estimate notices everywhere.
- `/wellness/her/progress` — consistency dots (movement/walking/protein/hydration), rolling
  averages for weight/energy/sleep with "not enough data yet" states, weight fully hidden when
  tracking is off, Restore activity-tolerance framing (never medical proof), milestone history.

## Components created (src/components/her/)

`her-today.tsx` (orchestrator + readiness + quick actions + reflection), `workout-card.tsx`
(start/done/skip/weight/modification/pause/complete/partial + pain/doming/pelvic reporting +
feel rating; no calorie-burn precision), `nutrition-card.tsx` (progress bars + quick adds),
`restore-card.tsx` (discreet summary; symptoms behind explicit disclosure), `meal-plan-view.tsx`,
`progress-view.tsx`. Settings gained the privacy/data section (tracking explanation, lock-screen
note, dialog-confirmed wellness deletion).

## Services / engines integrated

- `src/lib/wellness/dates.ts` — timezone-correct local day, Monday week start, local hour.
- `src/lib/wellness/planner/present.ts` — pure stored-plan presentation (identical output for
  idempotent reads and fresh generations; the §2 adaptation explanations live here).
- `src/lib/wellness/notifications/planner.ts` — deterministic notification policy (all §10
  rules: master switch, categories, pathway gating, quiet hours in user timezone, daily cap,
  per-day dedup, completed-action suppression, 3-day back-off, banned-phrase screen,
  lock-screen-safe Restore copy).
- `src/lib/wellness/progress.ts` — rolling averages, insufficient-data gates, disabled metrics,
  consistency counts, average-based weight progress.
- `src/lib/wellness/companion-context.ts` + `companion-context-service.ts` — minimal structured
  context, `HER_COMPANION_BOUNDARIES`, safety-hold-only serialization, additive `withHerContext`.
- `src/lib/db/queries/wellness/deletion.ts` — RLS-session wellness deletion (no new pathway).

## Server actions created

`saveEveningReflection` (column-scoped upsert into the day's check-in), `deleteAllHerData`
(literal-true confirmation). Existing Phase 3 actions power everything else (check-ins refresh
the plan; quick selections; workout/meal/hydration/metric logging; meal-plan generate/replace).

## Notification changes

Policy layer + preferences only. **Delivery transport (service worker, push subscriptions,
scheduler) does not exist** — the Phase 2 preferences table and this planner are what it will
call, and no browser permission is ever requested. Documented as a production-readiness gap.

## Companion changes

Both companion routes append Her context after Saelis Core enrichment — additively, guarded,
null for non-enrolled users (previous behavior byte-identical for them). Context contains only:
pathway keys, primary goal, phase/week, readiness category, adaptation level, plan title
summary, completion count, tracking prefs, milestone message. Under a hold, only the safety
summary is sent. Boundaries appended to the developer instruction forbid overriding holds,
diagnosis, restoring blocked exercise, sub-floor calorie advice, supplement prescriptions,
medical-expertise claims, and out-of-engine postpartum programming. Deterministic
post-validation still applies to all model output.

## Tests created (7 new files, 46 tests — full suite ≈ 77 files / 772 tests, all green)

- `notifications/planner.test.ts` (9): master/cap/quiet-hours, Restore exclusion + generic
  lock-screen copy, completed-action suppression, dedup + cap, hold/Reset gating, back-off,
  banned phrases.
- `companion-context.test.ts` (5): structured serialization, sensitive-data omission by
  construction, hold-only summary, boundary enforcement text, leak-free plan summaries.
- `progress.test.ts` (5): rolling averages vs single weigh-ins, insufficient data, disabled
  metrics, consistency, average-based weight progress.
- `planner/present.test.ts` (5): standard/tired/overwhelmed/in-pain-hold/Reset presentations
  with exact §2 explanation copy.
- `dates.test.ts` (4): local day vs server day, invalid-timezone fallback, week start, local hour.
- `her-today.test.tsx` (7): priority order, no postpartum content for non-Restore users,
  discreet Restore card, safety-hold precedence (workout card + quick actions removed), urgent
  single-action view, Reset ≤3 actions with hidden metrics and no shame language, skippable
  reflection.
- Companion route tests gained an explicit "not enrolled" mock so their strict
  no-raw-client-access guarantee stays intact (11 authorization/scoping tests from earlier
  phases continue to cover user isolation).

## Documentation created

`docs/saelis-her.md` completed per §18: dashboard architecture and safety precedence, check-ins
and quick actions, logging, notifications, companion boundaries, privacy/deletion, environment,
migration process, local development, test commands, deployment checklist additions, known
limitations, roadmap. README untouched (nothing there is invalidated).

## Files modified

`src/app/api/companion/route.ts` (+8), `stream/route.ts` (+10 for Her context; the other 10
lines are your pre-existing changes, preserved), both route tests (+7 mock block each),
`her-settings.tsx`, `wellness-actions.ts`, `/wellness/her/page.tsx` (rebuilt). Pre-existing
uncommitted `conversation-view.tsx` changes remain untouched.

## Migration files

None added in Phase 4. `00007` and `00008` remain the only Her migrations — both still
unapplied.

## Environment variables required

None new. Existing Supabase/companion variables unchanged; `.env.local` untouched.

## Manual commands to run

```sh
npx supabase db push            # applies 00007 + 00008 — review first (no local Postgres here)
npx supabase gen types typescript --project-id <id> --schema public \
  > src/lib/supabase/generated.types.ts
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

## Validation results

format:check ✓ · lint ✓ (0 errors/warnings) · typecheck ✓ · tests ✓ (all shards green,
including the two companion-route suites after the additive mock) · build ✓ (all
/wellness/her/* routes compile; six pathway pages prerendered). git diff --stat: 9 modified
tracked files, 206 insertions; the rest is new untracked Saelis Her code.

## Remaining limitations

Push delivery infrastructure (service worker, subscription storage, scheduling, permission
button) is unbuilt; the planner and preferences await it. No AI meal estimation ships (the
`ai_estimate` provenance and labeling are ready). Metric units are a stored preference; inputs
are imperial. Weekly progression (`isProgressionEligible` → advancing weeks/phases) is not yet
applied on a schedule. Reflection history has no dedicated view. Milestone context for
hydration/protein consistency uses partial data until a metrics aggregation pass. Crisis
resources remain US-centric. Dark mode follows the existing design system's single celestial
theme (no separate dark theme exists app-wide). SQL still unexecuted locally.

## Recommended production-readiness steps

1. Apply migrations to a staging Supabase project; regenerate and reconcile types; run the
   suite against real schema; manual pass through onboarding → plan → log → progress on mobile.
2. Build push delivery (subscription table + service worker + scheduled sender calling
   `planNotifications`; explicit permission button; invalid-subscription cleanup).
3. Schedule weekly progression + milestone aggregation (cron or edge function).
4. Legal/clinical review of all safety, Restore, and nutrition copy before launch (as ROADMAP
   already requires for the wider app), plus internationalized crisis resources.
5. Replace the in-memory rate limiter/idempotency with the managed versions already flagged in
   the repo, and re-run the deployment checklist end to end.
