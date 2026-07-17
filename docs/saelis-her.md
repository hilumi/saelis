# Saelis Her

> Wellness for every version of you.

Saelis Her is the umbrella women's wellness product: modular pathways (Phoenix, Restore, Strong,
Nourish, Rhythm, Reset) for planning, tracking, and education. This document covers the Phase 2
architecture: routes, onboarding, enrollment lifecycle, privacy, and how to extend it. Read
CLAUDE.md first — the neutral-naming rule, Restore isolation, and safety rules are binding.

## Route structure

All routes are protected (middleware `PROTECTED_PREFIXES` includes `/wellness`).

| Route                          | Purpose                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `/wellness`                    | Redirects to `/wellness/her` (no duplicate navigation)                                             |
| `/wellness/her`                | Her home — enrollment-aware; pre-onboarding invitation, post-onboarding overview + readiness entry |
| `/wellness/her/onboarding`     | Resumable onboarding (`?step=` URL-safe navigation)                                                |
| `/wellness/her/pathways`       | Enrollment management (add / pause / resume / set aside)                                           |
| `/wellness/her/pathways/[key]` | Pathway landing pages (six keys via `generateStaticParams`)                                        |
| `/wellness/her/settings`       | Her settings (profile, tracking, reminders, Restore, Rhythm)                                       |

`/home` (the primary dashboard) gains one quiet Saelis Her entry card — never a competing
dashboard. The pathway registry (`src/lib/wellness/pathways/`) stores each pathway's route;
components read it from there.

## Onboarding architecture

- **State**: server-side only, in `wellness_onboarding_drafts` (one row per user, RLS-protected,
  Zod-validated JSONB, 16 KB cap). Nothing is stored in localStorage. `completed_at` marks
  completion; completing clears the draft payload so in-progress Restore answers never linger
  outside `postpartum_profiles`.
- **Step engine**: `src/lib/wellness/onboarding.ts` — pure and deterministic. Canonical order:
  welcome → pathways → goals → body → movement → nutrition → [restore] → [rhythm] → [phoenix] →
  notifications → review. Bracketed steps appear only when that pathway is selected.
- **Validation**: `src/lib/validation/wellness-onboarding.ts`. Every slice is optional (resume
  anywhere, skip sensitive questions); `pathways` and `goals` (plus the pathway-specific slices
  for selected pathways) are required at completion — enforced by `canComplete` in the UI and
  again inside `completeOnboarding` on the server.
- **Resume**: `resumeStep(data)` returns the first step needing attention. Backward navigation
  never discards data; each transition persists via `saveOnboardingProgress`.
- **Completion** (`src/lib/wellness/complete-onboarding.ts`): creates enrollments (skipping
  already-active ones), the shared profile, goals (only when none exist), notification
  preferences, the Restore profile (Restore only, via the isolated postpartum service), and a
  generation-ready **draft program** whose `safety_tier` is `restricted` when Restore clearance
  is not reported as `cleared` — the Phase 3 plan engine must honor that hold deterministically.
- **Pace guidance**: `src/lib/wellness/pace.ts` flags requested weight change above 1.5 lbs/week
  and shows shame-free copy promising nothing and pointing to individualized professional
  guidance. It never blocks or rejects.

## Pathway enrollment lifecycle

`wellness_enrollments` rows move through `active → paused → active`, `completed`, or `archived`.
A partial unique index allows at most one ACTIVE enrollment per (user, pathway); duplicates
return the calm "already enrolled" error. Pause/resume/archive are pure status flips — **no
lifecycle operation ever deletes data**. Reset activates like any pathway and overlays the
others; archiving Reset returns users to their prior plan untouched. Adding Restore always
routes through onboarding (`?step=pathways`) so the intake happens before any postpartum record
exists.

## Restore onboarding separation

The Restore step renders only when Restore is selected; postpartum-worded goals
(`postpartum_recovery`, `pelvic_floor_support`) are hidden otherwise; non-Restore users never
see postpartum language anywhere (component-tested). Draft Restore answers live in the
RLS-protected draft; on completion they are written to `postpartum_profiles` through
`src/lib/db/queries/postpartum/` (which verifies an active Restore enrollment — as does RLS) and
removed from the draft. The Restore settings section renders only with an active Restore
enrollment. `medical_clearance_status` is always self-reported; the app never auto-classifies
anyone as cleared, and non-cleared users get education/nourishment/check-ins/recovery guidance
only.

## Privacy behavior

Per-user RLS on every table; server-derived identity in every action; calm content-free errors;
no logging of profile, symptom, or onboarding content; weight and calorie tracking optional
forever; pausing/archiving preserves records; account deletion cascades through all wellness
tables. Notification choices are preferences only — browser permission is never requested
without an explicit button press (no permission code exists in Phase 2 at all).

## Validation rules

Enumerated values live in `src/lib/wellness/constants.ts` and mirror database check constraints
exactly. JSONB is `.strict()` and parsed at every boundary (draft, enrollment settings, plans).
Ranges: check-in scales 1–5 / soreness 0–5 / pain 0–10; calorie floor 1200; workout days 0–7;
quiet hours 0–23; ≤10 notifications/day.

## How to test onboarding

```sh
npm test                              # full suite
npx vitest run src/lib/wellness src/lib/validation src/components/her
```

Manual: sign in → `/wellness/her` → "Build my plan". Leave mid-flow and return (resume), go
backward (data kept), select Restore (intake + safety context appears), deselect it (intake
disappears), finish (enrollments/profile/goals/draft program created; redirect to
`/wellness/her`).

## The deterministic intelligence layer (Phase 3)

Rules-based, typed, pure, and authoritative. **No LLM is required — or permitted — for safety
decisions, calorie safeguards, exercise eligibility, or plan generation.** Every threshold lives
in `src/lib/wellness/rules.ts`; engines contain logic, never magic numbers.

### Safety engine (`src/lib/wellness/safety/engine.ts`)

Runs first, always. Five tiers in strict order: `urgent_support` (chest pain, sudden shortness
of breath, fainting, severe headache, heavy bleeding, severe abdominal/pelvic pain, calf
pain/swelling, self-harm concern, incision complication) → blocks all exercise and plan
generation, returns non-minimizing urgent messaging (crisis resources per
`src/lib/ai/safety.ts`, 911/988), and explicitly never diagnoses. `hold_and_contact_professional`
(not cleared; early postpartum + unknown clearance beyond gentle intensity; incision concern;
pelvic pressure/heaviness; repeated leaking; recurring doming; repeated exercise pain; pain ≥ 7)
→ education/nourishment/hydration/check-ins/recovery only, pelvic-floor PT suggested where
relevant. `recovery_only` (moderate pain, illness, elevated soreness, poor sleep, significant
fatigue, high workload) → gentle movement only. `modify` (low energy, limited time, stress, mild
soreness, return after a gap) → shorter/simpler sessions. `normal` otherwise. Typed
`reasonCodes` document every decision; `safePlanModules` tells the planner what may render.
Self-harm concern suspends all wellness planning in favor of crisis support. Postpartum rules
run only when Restore is active; postpartum elapsed time alone never establishes readiness, and
pelvic-floor contractions are never universally prescribed.

### Readiness engine (`src/lib/wellness/readiness.ts`)

A planning indicator, never a medical score. Energized → standard (progression possible via the
progression rules); okay → normal; tired → ~30% shorter, gentler, simpler; overwhelmed →
minimum-viable day (≤3 actions, 5–15 min movement, nourishment first, never framed as failure);
in pain → the safety engine decides (recovery or hold), exercise is never automatic. Safety
verdicts always dominate.

### Program generator (`src/lib/wellness/programs/`)

Deterministic 12-week programs: shared phases Foundation → Build → Progress → Sustain, or
Restore A–D (foundation / reconnect / rebuild / return) when Restore is active. Deloads every
6th week. Pathway weighting: Phoenix (balance + strength + cardio + habits; scale only when
enabled), Strong (resistance emphasis, no weight-loss requirement), Nourish (protein/fiber/
hydration/meal structure; calories only when chosen), Reset (minimal, preserves the prior
program), Restore (symptom-led, clearance-gated: `restricted` tier zeroes strength/cardio).
Progression eligibility (`isProgressionEligible`) requires completion ≥ 60%, zero recent symptom
flags, tolerable exertion (≤ 8/10), acceptable recovery, and no safety hold — never elapsed time.

### Workout engine (`src/lib/wellness/workouts/engine.ts`)

Selects from the seeded template/exercise libraries by safety tier, phase, location, equipment,
time, and difficulty; supports quick selections (10/20 minutes, Planet Fitness, Peloton, home,
no-floor, tired, overwhelmed, sore, replace). Symptom flags swap exercises to their seeded
regressions (or drop them) via `avoid_when` tags; sessions shorten deterministically to fit
time; effort guidance is plain-language reps-in-reserve (never maximal); Restore users get the
full stop-condition list (pain, pressure, heaviness, leaking, doming, bleeding, incision
discomfort, dizziness, unusual shortness of breath, feeling unwell) — never "push through".
Inactivity ≥ 10 days returns at 70% volume, without punishment framing.

### Nutrition, hydration, meal plans (`src/lib/wellness/nutrition/`)

Modes: `calorie_range`, `protein_first`, `portion_guidance`, `habit_based`, `meal_structure`.
Mifflin–St Jeor is used strictly as an estimate; insufficient data → habit-based, never invented
precision. Safeguards (all in `rules.ts`): floor 1200 kcal (1800 while breastfeeding/pumping),
deficit cap 500 (300 breastfeeding), no exercise-calorie arithmetic, no promised loss rates.
Protein 0.6–0.8 g/lb of reference weight, capped at 150 g openers, gradual start at 70%, spread
across meals. Hydration: editable guidance (64 oz + training/feeding bonuses, capped at 120).
Fiber: toward 25 g at +3 g/week with water alongside. Iron concern → iron-rich meals + vitamin-C
pairing + clinical evaluation, never supplement doses. The weekly meal-plan generator is seeded
by (user, week) — deterministic regeneration, absolute allergen exclusion, dietary-pattern
respect, ingredient reuse, deliberate repeats, quick options, `replaceMealInPlan` for one-meal
swaps.

### Daily plan engine (`src/lib/wellness/planner/`)

`computeDailyPlan` (pure): safety → readiness → Reset/minimum-viable-day → module assembly
(movement, nutrition, hydration, recovery, postpartum-only-for-Restore) → next best action + ≤2
additional actions. `generateDailyPlanForUser` (service) is **idempotent**: an existing
(user, date) plan is returned untouched unless `refresh` is explicit, which replaces it via the
unique-key upsert. Urgent overrides everything; holds block exercise; Reset simplifies without
deleting; guilt language is absent by test.

### Milestones (`src/lib/wellness/milestones-engine.ts`)

Deterministic detection with double deduplication (engine key-set + DB unique constraint).
Weight milestones exist only when weight tracking is on; non-scale progress leads; Restore
milestones are Restore-only and never claim medical recovery.

### Testing strategy

Each engine has its own co-located suite (105 tests across 11 wellness files) covering every
safety tier, urgent/self-harm overrides, Restore clearance gating, readiness states, all pathway
program combinations, deloads, progression limits, quick selections, symptom substitution,
calorie floors, breastfeeding safeguards, allergen exclusion, idempotent determinism, and
milestone gating. Engines are pure, so tests need no mocks beyond typed fixtures.

### Limitations

Estimation formulas are population averages; individual needs vary and the copy says so.
The safety engine is a deterministic floor, not comprehensive detection, and never claims to
be. Milestone context for hydration/protein consistency and weight progress is partially wired
(full metrics aggregation lands with the Phase 4 UI). Timezone handling still uses server-local
dates pending the timezone utility.

## The product experience (Phase 4)

### Dashboard architecture

`/wellness/her` is Saelis Her Today (the main `/home` sanctuary keeps its single quiet entry
card — no competing dashboard). Server page → idempotent plan generation → `presentStoredPlan`
(pure) → `HerToday` (client). Priority order is fixed: 1 safety/urgent message · 2 readiness
check-in · 3 next best action · 4 movement/recovery · 5 nourishment + hydration · 6 progress/
milestone · 7 additional actions (reflection). Progressive disclosure everywhere (optional
check-in detail, exercise adjustments, stop conditions, grocery list live behind `<details>`).
Safety precedence in the UI mirrors the engine: urgent hides everything but the message;
a hold removes workout cards and workout quick-actions entirely.

Additional routes: `/wellness/her/meals` (weekly plan: regenerate week, swap one meal, log a
meal, grocery highlights, prep/leftovers guidance, filters label, estimate notices) and
`/wellness/her/progress` (rolling averages, consistency dots, honest "not enough data yet",
weight views only when tracking is on, Restore activity framed as tolerance — never medical
proof; milestones list).

### Check-ins and quick actions

The readiness check-in (five states + optional sleep/energy/stress/soreness/pain/time inputs)
saves via `saveDailyCheckInAction`, which refreshes the day's plan; the dashboard re-renders via
`router.refresh()` and explains the adaptation ("Your plan was shortened and simplified based on
today's energy and sleep." / "Today has been reduced to three meaningful actions." / pain →
paused-while-checking copy). Quick actions (10/20 minutes, Planet Fitness, Peloton, home,
no-floor, exhausted, overwhelmed, log water/protein, replace workout, choose a meal, talk to
Saelis) all call the deterministic plan/safety services — the companion is never the only path.

### Logging

Workout card: warm-up → ordered exercises (sets/reps/rest/cues) → stop conditions → cool-down.
Actions: start, mark done, adjust weight, use modification, skip, pause, complete or finish
partially, report pain/doming/pelvic symptoms (Restore users), notes, post-session feel rating.
Completion logs the workout + exercise entries, runs the milestone sweep, and never pretends to
count calories burned. Nutrition card: protein/hydration progress bars (labeled estimates),
quick adds (+8/+16 oz, ~25 g protein, snack), meal logging with `logged_via` provenance —
`ai_estimate` entries are labeled and editable; no AI estimation ships yet, and nothing sends
health detail to any model for it.

### Notifications

`src/lib/wellness/notifications/planner.ts` is the authoritative, fully tested policy layer:
master switch, per-category preferences, pathway gating (Restore notifications never reach
non-Restore users and never carry postpartum detail — lock-screen-safe by construction),
timezone-aware quiet hours, daily cap, per-day dedupe keys, completed-action suppression, and
a 3-day back-off for unresponsive users. Copy bans shaming phrases by test. **Delivery
transport (service worker, push subscriptions, scheduling) does not exist yet** — no browser
permission is ever requested; the planner is what that infrastructure will call.

### Companion boundaries

`loadHerCompanionContext` builds the only wellness data the companion sees: pathway keys,
primary goal, phase/week, readiness category, adaptation level, a title-level plan summary,
completion counts, tracking preferences, latest milestone message. No symptom detail, no free
text, no raw records — the type has no fields for them. Under a safety hold, only the permitted
safety summary is sent. `HER_COMPANION_BOUNDARIES` is appended to the developer instruction:
the model may explain/encourage/substitute/help-reflect, and may never override holds, diagnose,
restore blocked exercise, undercut calorie floors, prescribe supplements, claim medical
expertise, or produce postpartum programming outside the rules engine. Wiring is additive in
both companion routes and never throws; non-enrolled users get exactly the previous behavior.
Deterministic post-validation (`plan-enforcement.ts`) still runs on all model output.

### Privacy and deletion

Her settings explain what is tracked, Restore data use, lock-screen visibility, pausing,
notification opt-outs, and deletion. "Remove all my wellness data" (dialog-confirmed) deletes
every wellness/postpartum table through the user's own RLS session — no separate insecure
pathway; full account deletion continues to cascade through `profiles`. Nothing sensitive is
ever logged (symptoms, nutrition text, reflections, endpoints, secrets).

### Environment, migrations, local development

No new environment variables. Migrations: `00007` + `00008` (both unapplied) via
`npx supabase db push`, then regenerate types (`supabase gen types` → reconcile the hand-written
boundary). Local dev: `nvm use && npm install && cp .env.example .env.local` (fill Supabase
values) `&& npm run dev`. Tests: `npm test` or targeted `npx vitest run src/lib/wellness
src/components/her`. Deployment follows `docs/03-engineering/deployment-checklist.md` — plus:
apply Her migrations, verify RLS on all wellness tables, run the full suite, and confirm the
Her routes render for a fresh account before inviting users.

### Known limitations and roadmap

Push delivery infrastructure, real AI meal estimation, metric-unit input, weekly progression
application (advancing `current_week`/phases from `isProgressionEligible`), richer strength
analytics, evening-reflection history views, and internationalized crisis resources remain
future work. The safety engine stays a conservative floor over self-reported data; nutrition
numbers remain estimates and say so.

## How to add a future pathway

1. Add the key to `PATHWAY_KEYS` and a full definition in
   `src/lib/wellness/pathways/registry.ts` (route under `/wellness/her/pathways/<key>`).
2. Seed the `wellness_pathways` row in a new migration (same fields as 00007's seed).
3. If the pathway needs its own onboarding step: add the step to `ONBOARDING_STEPS`, a slice to
   the draft schema, the conditional mapping in `CONDITIONAL_STEPS`, and a step section in
   `her-onboarding-flow.tsx`.
4. Add data-use and plan-effect copy to `pathway-management.tsx`.
5. Isolated data (like Restore's) gets its own tables + services — never shared ones.
6. The seed-consistency test (`registry.test.ts`) will fail until registry and seed agree.
