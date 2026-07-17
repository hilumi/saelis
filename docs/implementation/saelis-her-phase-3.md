# Saelis Her — Phase 3 Report (Deterministic Intelligence Layer)

Date: 2026-07-17 · Status: complete · Not committed, not pushed, not deployed, no migration applied.

Phase 3 delivers the rules-based engines: safety, readiness, program generation, workout
selection/modification, nutrition targets, hydration, meal planning, the central daily-plan
engine, Restore safeguards, Reset minimum-viable-day mode, and milestones. Every engine is
typed, pure, deterministic, and authoritative — **no LLM is required or permitted for safety
decisions, calorie safeguards, exercise eligibility, or plan generation.**

## Engine modules created (src/lib/wellness/)

- `rules.ts` — every configurable threshold in one module (see below).
- `safety/engine.ts` — `assessSafety` → typed `SafetyAssessment` (5 tiers, 30+ reason codes,
  `safePlanModules`, blocked activities, non-minimizing urgent messaging, crisis resources via
  the existing `src/lib/ai/safety.ts` conventions). Self-harm suspends all planning for crisis
  support. Restore rules: clearance gating, early-postpartum intensity gating, incision/
  pressure/leaking/doming holds, pelvic-floor PT suggestions, never diagnosis, never
  time-alone-readiness, never universal pelvic-floor contractions.
- `readiness.ts` — `assessReadiness` → category, adaptation level, duration multiplier
  (tired ≈ −30%, overwhelmed ≈ −60%), intensity, complexity, recovery priority, explanation
  codes. Safety verdicts always dominate; pain never auto-prescribes exercise; no
  pseudo-medical score is exposed.
- `programs/generator.ts` — 12-week deterministic programs; shared phases
  Foundation/Build/Progress/Sustain or Restore A–D; deloads at weeks 6/12; pathway weighting
  (Phoenix balance, Strong resistance without weight-loss, Nourish nutrition-first, Reset
  minimal + program-preserving, Restore symptom-led); `restricted` tier zeroes all structured
  exercise; `isProgressionEligible` (completion ≥ 60%, zero symptom flags, exertion ≤ 8/10,
  recovery quality, no hold — never elapsed time).
- `workouts/engine.ts` — `selectWorkout` over the seeded libraries: location/equipment/time/
  phase/difficulty filtering, ten quick selections, symptom-driven regression swaps via
  `avoid_when` tags, deterministic time-scaling, plain-language reps-in-reserve guidance (no
  maximal lifting), Restore stop-condition list (no push-through), beginner explanations,
  no-floor support, conservative return after ≥ 10 inactive days.
- `nutrition/engine.ts` — five modes; Mifflin–St Jeor as estimate only; insufficient data →
  habit-based; conservative deficit caps and calorie floors; breastfeeding softening +
  fatigue/low-intake watch + no milk-supply promises; gradual protein (0.6–0.8 g/lb reference,
  70% start, meal distribution); editable hydration guidance; gradual fiber with water; iron
  support (foods + vitamin-C pairing + clinical referral, never doses).
- `nutrition/meal-plan.ts` — seeded-deterministic 7-day plans; absolute allergen exclusion;
  dietary-pattern respect; ingredient reuse + deliberate repeats + leftovers strategy; grocery
  list + prep plan; family-style notes; `replaceMealInPlan` swaps one meal only.
- `planner/daily-plan.ts` — `computeDailyPlan`: safety → readiness → Reset/MVD → modules.
  Urgent overrides everything (single action); holds block exercise but keep nourishment/
  hydration/recovery/education; overwhelmed/Reset → ≤ 3 primary actions framed as intentional
  care; postpartum module exists only for Restore; no guilt language (tested).
- `planner/service.ts` — persistence wrapper: idempotent `generateDailyPlanForUser` (stored
  plan returned unless explicit refresh → versioned replacement via unique-key upsert),
  `regenerateProgramForUser`, `generateMealPlanForUser`, `replaceMealForUser`.
- `milestones-engine.ts` — deterministic detection, double deduplication, weight milestones
  gated on tracking, Restore-only milestones, no medical-recovery claims.

## Rule constants created (src/lib/wellness/rules.ts)

`CALORIE_RULES` (floor 1200 / 1800 breastfeeding; deficit cap 500 / 300; range ±100),
`PROTEIN_RULES` (0.6–0.8 g/lb, 150 g opener cap, 70% gradual start), `FIBER_RULES` (18→25 g at
+3 g/week), `HYDRATION_RULES` (64 oz base, +8/training day, +16 breastfeeding, 120 cap),
`READINESS_RULES` (multipliers, thresholds, MVD limits), `PROGRESSION_RULES` (60% completion,
symptom lookback, RPE cap 8, deload every 6th week, 10-day conservative return at 70%),
`PROGRAM_RULES`, `EFFORT_GUIDANCE`, `RESTORE_STOP_CONDITIONS`, `GENERAL_STOP_CONDITIONS`.

## Server actions created (src/app/(app)/wellness-plan-actions.ts)

createHerProgram / regenerateHerProgram, saveDailyCheckInAction + saveRestoreCheckInAction
(each refreshes today's plan), generateTodayPlan, adaptPlanForTime, replaceTodaysWorkout,
changeWorkoutLocation, completeWorkout (+ exercise logs + milestone sweep), logMeal,
quickAddProtein, logHydration, saveDailyMetricsAction, generateWeeklyMealPlan, replaceMeal,
createMilestone. All: requireUser → Zod → user-scoped services → calm errors; pathway
eligibility via `requireHerEnrollment`; milestone sweep never breaks a save; no sensitive
logging anywhere. Query additions: `programs.ts` (`createProgramWithWeeks` with
supersede-then-rollback semantics, `getCurrentProgramWeek`), new `meal-plans.ts` (validated
JSONB read/write).

## Tests created (8 new files, 66 tests — full suite: 71 files, 736 tests, all green)

- `safety/engine.test.ts` (14): every tier; each urgent trigger incl. self-harm (crisis
  resources, no diagnosis/minimizing); Restore clearance, incision, bleeding, pressure,
  leaking, doming; soreness → recovery; postpartum rules inert without Restore.
- `readiness.test.ts` (7): energized/okay/tired/overwhelmed/in-pain/short-time/hold-dominance.
- `programs/generator.test.ts` (11): Phoenix, Strong, Nourish, Restore (cleared + restricted),
  Phoenix+Restore, Phoenix+Strong+Nourish, Reset overlay, deload behavior, determinism,
  progression eligibility matrix.
- `workouts/engine.test.ts` (11): PF/Peloton/home/no-floor/short selections, floor-difficulty
  filtering, symptom regression swaps, hold → null, plain-language effort, Restore stop
  conditions without push-through, conservative return.
- `nutrition/engine.test.ts` (12): insufficient data, calorie range, floors, breastfeeding
  safeguards + fatigue watch, tracking-off, protein-first, gradual protein, hydration scaling,
  iron support without doses, fiber gradualism.
- `nutrition/meal-plan.test.ts` (7): structure, determinism, allergen exclusion, vegetarian,
  calories-off, iron-supportive dinners, single-meal replacement.
- `planner/daily-plan.test.ts` (10): standard/reduced/recovery/hold/urgent plans, MVD ≤ 3
  actions without guilt, Reset simplification, Restore-module exclusion for non-Restore users,
  deterministic idempotency foundation, explicit-replacement semantics (service upsert).
- `milestones-engine.test.ts` (5): dedup, weight-gating, non-scale celebration, Restore-only
  isolation, threshold checks.

## Files modified

`src/lib/db/queries/wellness/programs.ts` (+2 functions), new `meal-plans.ts`,
`docs/saelis-her.md` (full Phase 3 section: flows, reason codes, safeguards, testing strategy,
limitations). Nothing else touched; pre-existing uncommitted stream-route/conversation-view
changes preserved. No new migration was needed — Phase 1's schema already carries programs,
weeks, plans, logs, metrics, meal plans, and milestones.

## Validation results

format:check ✓ · lint ✓ (0 errors/warnings) · typecheck ✓ · tests ✓ (71 files / 736) ·
build ✓. `git diff --stat`: same 6 modified tracked files as Phase 2 (174 insertions) plus new
untracked directories.

## Safety limitations (stated honestly)

The safety engine is a deterministic floor over self-reported data — it is not comprehensive
detection, cannot see unreported symptoms, and never claims otherwise. Urgent messaging uses US
crisis conventions (911/988) per the existing application; internationalization remains open.
Symptom thresholds (e.g. two leaking reports → hold) are conservative editorial choices in
`rules.ts`, not clinical standards. Nothing in the layer diagnoses.

## Nutrition-estimation limitations

Mifflin–St Jeor and activity multipliers are population estimates with wide individual
variance; every surface says so. Breastfeeding energy adjustment is handled by softer deficits
and higher floors rather than added allowances (deliberately conservative). Meal-template
macros are label-style estimates. No micronutrient analysis exists beyond fiber/iron guidance.

## Manual actions required

```sh
npx supabase db push        # still applies 00007 + 00008 (unchanged this phase) — review first
npx supabase gen types typescript --project-id <id> --schema public \
  > src/lib/supabase/generated.types.ts
npm run lint && npm run typecheck && npm test && npm run build
```

No SQL executed locally (no Postgres in this environment). The engines run entirely from
already-typed rows, so they need no additional setup.

## Recommended focus for Phase 4

1. Surface the engines: daily-plan UI on `/wellness/her` (plan card, quick selections, workout
   player, stop-condition display), full check-in form, meal-plan and grocery views.
2. Timezone-correct "user's local day" (populate `profiles.timezone`) before plan dates ship
   to real users; wire `saveReadinessCheckIn` into the full check-in.
3. Milestone context completion (hydration/protein consistency + weight progress from
   `wellness_daily_metrics`) and a quiet celebration surface.
4. Progression application: use `isProgressionEligible` weekly to advance/hold program weeks,
   including Restore phase advancement and deload awareness.
5. Extend the in-app data-deletion section to wellness tables; notification delivery groundwork.
