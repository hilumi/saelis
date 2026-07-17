# Saelis Her — Phase 0 Audit (Implementation-Readiness Report)

Date: 2026-07-17 · Scope: audit only — no files modified, no packages installed, no migrations created.

Saelis Her is the umbrella women's wellness product ("Wellness for every version of you") with
six modular pathways — Phoenix, Restore, Strong, Nourish, Rhythm, Reset — that users may enroll
in simultaneously. Shared platform architecture must use neutral wellness naming; postpartum
specifics are isolated to the Restore pathway.

**Phase report convention.** Reports for each implementation phase are saved as:

- `docs/implementation/saelis-her-phase-0-audit.md` (this file)
- `docs/implementation/saelis-her-phase-1.md`
- `docs/implementation/saelis-her-phase-2.md`
- `docs/implementation/saelis-her-phase-3.md`
- `docs/implementation/saelis-her-phase-4.md`
- `docs/implementation/saelis-her-phase-5-audit.md`

---

## 1. Current architecture summary

Next.js 15.3 App Router + React 19, TypeScript strict (incl. `noUncheckedIndexedAccess`),
Tailwind v4 (PostCSS, no config file; design tokens in `src/app/globals.css`), Zod 3, Vitest 3 +
React Testing Library, Node 22 (`.nvmrc`). No CLAUDE.md exists — README.md (comprehensive) plus
`docs/00–03` currently serve that role (see §6 Phase 1 and §11).

Supabase via `@supabase/ssr` with four clients:

- `src/lib/supabase/client.ts` — browser (publishable key only)
- `src/lib/supabase/server.ts` — request-scoped, RLS-enforced
- `src/lib/supabase/middleware.ts` — session refresh for `src/middleware.ts`
- `src/lib/supabase/admin.ts` — `server-only`, secret key, account deletion only

Six migrations (`00001`–`00006`; sequential numeric naming, idempotent DDL, heavily commented).
Tables: `profiles`, `companion_profiles`, `arrivals`, `conversations`, `conversation_turns`,
`horizon_steps`, `companion_memories`, `user_privacy_settings`, `app_roles`,
`stewardship_events`, `adaptive_preferences`, `pattern_hypotheses` (+ evidence). RLS on every
table with per-operation own-row policies (`auth.uid()`), no `using (true)` anywhere; privileged
writes go through SECURITY DEFINER functions with in-body auth checks and trigger guards that
prevent ordinary clients from raising confidence/evidence values.

Data flow: server actions (`(group)/actions.ts`, `"use server"`) → Zod parse → repository
functions in `src/lib/db/queries/*` (take the RLS client + server-derived userId, throw calm
content-free errors) → `ActionResult<{ok, error}>`. API routes exist only for the companion chat
(`POST /api/companion`, `POST /api/companion/stream` SSE) and `GET /api/health`. Auth via
`requireUser()` / `getOptionalUser()` plus middleware `PROTECTED_PREFIXES`.

AI: provider-agnostic `CompanionProvider` contract; deterministic Light Engine + Saelis Core
pipeline wraps the model; an urgent safety pre-check bypasses the provider entirely;
post-validation `plan-enforcement.ts` strips disallowed output after Zod validation. This is
exactly the "deterministic safety logic is authoritative; the LLM never overrides a safety hold"
pattern Saelis Her requires.

## 2. Existing components that can be reused

- **Auth/authz**: `requireUser`, middleware guard, `app_roles`, RLS patterns — reuse as-is.
- **Profile trigger**: `handle_new_user()` bootstrap — extend for a `women_wellness_profiles`
  row only on opt-in (do not auto-create; Her is opt-in).
- **`horizon_steps`** — reusable as the "one next step" mechanic inside pathways.
- **`arrivals`** — a daily mood/energy check-in already exists; `wellness_daily_check_ins` can
  follow its shape (or extend it — see §10).
- **Safety architecture**: `safety.ts` urgent pre-check + `plan-enforcement.ts` post-validation
  stripping — the template for Restore safety rules and eating-disorder/overtraining guardrails.
- **Server action + query-module pattern**, `ActionResult`, calm error copy, `set_updated_at()`
  trigger, idempotency lib, rate limiter, content-free `stewardship_events` telemetry (extend
  the event allowlist rather than adding a new analytics system).
- **UI kit** (`src/components/ui/*`: button, choice, dialog, toggle, glass-surface,
  inline-notice), app shell, Living Sky, settings-form patterns, onboarding-flow pattern for
  pathway enrollment.
- **Test scaffolding**: Vitest config, evaluation-case suites (mirror
  `src/test/companion-evaluation-cases.ts` for pathway safety cases), route tests.
- **Privacy/deletion**: `user_privacy_settings`, data-deletion section, admin full-delete —
  wellness tables must be added to both deletion paths.

## 3. Architectural conflicts and risks

- **No pathway/program/goal/nutrition/workout architecture exists.** Everything in the planned
  table list must be net-new except check-ins (`arrivals`) and steps (`horizon_steps`).
- **No notification system exists** — no tables, no scheduler, no push/email infrastructure.
  The "notification foundation" is 0% complete.
- **No feature-flag system** — only env switches (`COMPANION_PROVIDER`). Pathway gating needs a
  decision (enrollment rows can serve as the gate).
- **`/today` does not exist; `/home` does**, and it is philosophically "never a dashboard" (no
  streaks, no metrics, no guilt — codified in ROADMAP's "never" list). A metrics-forward
  wellness dashboard conflicts with Home's design contract. Recommendation: keep `/home`
  untouched; add a distinct Her surface (e.g. `/her`) and at most one quiet Home glimpse.
- **Type drift risk**: `src/lib/supabase/generated.types.ts` (real, generated) exists, but
  `src/lib/supabase/types.ts` is still the hand-written "temporary boundary" and does not
  re-export it. New tables mean hand-maintaining three layers (`migrations`,
  `src/types/database.ts`, `types.ts`) unless the generated file is wired in first.
- **JSONB is not Zod-validated today** (`adaptive_preferences.value` is typed as
  `Record<string, string | number | boolean>` plus a 512-byte pg constraint). Her's JSONB fields
  (goal config, plan payloads) require Zod schemas — a new convention, not an existing one.
- **In-memory rate limiting / idempotency** — single-instance only; fine for now, flagged for
  production.
- **Timezone support is thin**: `profiles.timezone` exists but is barely used; `src/lib/dates.ts`
  is display-only and device-local. Daily plans/check-ins need a real "user's local day" utility.
- **Dirty working tree**: `src/app/api/companion/stream/route.ts` and
  `src/components/companion/conversation-view.tsx` are modified, plus one untracked test. Land
  or stash before Her work begins.
- **Tone collision**: companion voice guides are emotional-support oriented; wellness coaching
  language (protein targets, progressive overload) needs its own voice rules to avoid both
  clinical-claim and "bounce back" failure modes.

## 4. Recommended database changes

All new tables; no existing table is renamed or repurposed. Follow existing conventions: uuid
PKs (`gen_random_uuid()`), `user_id → profiles(id) on delete cascade`, text + check constraints
(not enums), `created_at`/`updated_at` + `set_updated_at` trigger, per-operation RLS policies,
indexes on `(user_id)` and `(created_at desc)`, idempotent DDL, one numbered migration per phase
(`00007_...` onward).

Shared (neutral-named) tables:

- `wellness_pathways` — static catalog (phoenix, restore, strong, nourish, rhythm, reset);
  could alternatively be a code-level constant (see §10).
- `wellness_enrollments` — user × pathway, status (active/paused/completed); supports multiple
  simultaneous rows; Reset layers via its own enrollment row.
- `women_wellness_profiles` — opt-in Her profile (units, activity level, optional height; no
  diagnosis fields). Weight and calorie tracking are optional — nullable fields, never required.
- `wellness_goals` — goal-type allowlist via check constraint; JSONB config validated with Zod;
  extreme-deficit values excluded by constraint.
- `wellness_programs` + `wellness_daily_plans` — program/plan structure, JSONB payloads
  Zod-validated.
- `wellness_daily_check_ins`, `wellness_daily_metrics`, `wellness_workout_logs`,
  `wellness_nutrition_logs` — logs; calorie fields stored as user-entered estimates, never
  presented as precise.

Restore-isolated tables (only meaningful when a Restore enrollment exists; enforce in the
service layer and optionally in RLS via an enrollment `exists` check mirroring the
`conversation_turns` parent-check pattern):

- `postpartum_profiles`, `postpartum_check_ins`; Restore safety rules implemented as
  deterministic code (like `plan-enforcement.ts`), never LLM-driven. Postpartum questions,
  language, restrictions, and recommendations must never reach non-Restore users.

Also: extend the `stewardship_events` event-type allowlist for Her events (same content-free
schema — never log sensitive wellness or symptom data), add wellness tables to both deletion
paths, and regenerate `generated.types.ts` after each migration.

## 5. Recommended route and service structure

- Routes: a new subtree under `(app)` — e.g. `/her` (overview), `/her/enroll`, `/her/check-in`,
  `/her/plan`, `/her/log`, `/settings/her`. Add prefixes to middleware `PROTECTED_PREFIXES`.
  Do not duplicate `/home`.
- **Server actions + query modules are the established preference** — use
  `src/app/(app)/her-actions.ts` (or per-feature action files) →
  `src/lib/db/queries/wellness/*.ts` and `src/lib/db/queries/postpartum/*.ts` (separate
  directory per the isolation rule). API routes only if streaming/AI is involved.
- Domain logic in `src/lib/wellness/*` (pathway rules, plan generation, deterministic safety
  gates) and `src/lib/wellness/restore/*` (postpartum logic) — pure and synchronous like
  `src/lib/light` / `src/lib/core`, with the same test density.
- Validation in `src/lib/validation/wellness.ts` (+ Zod schemas for every JSONB payload).
- Safety: a deterministic `wellness-safety.ts` gate that runs before and after any LLM
  involvement — pain-stop rules, deficit floors, breastfeeding guards, banned-language
  stripping — modeled on `plan-enforcement.ts`. The LLM must never override a safety hold.

## 6. Recommended implementation phases

**Phase 1 — Foundation.** First documented deliverable: **create root-level `CLAUDE.md`**
(specification in §11 — not created during this audit-only phase). Then: wire generated types
into `types.ts`; migration 00007 (women_wellness_profiles, pathways/enrollments, goals) + RLS;
enrollment actions/queries; `/her` shell + settings; deletion-path coverage. Report:
`docs/implementation/saelis-her-phase-1.md`.

**Phase 2 — Check-ins & daily plans.** Check-in, daily-plan, and daily-metric tables;
timezone-aware "user's local day" utility; plan rendering. Report: `saelis-her-phase-2.md`.

**Phase 3 — Phoenix + Nourish + Strong content.** Programs, workout/nutrition logs,
deterministic plan logic, safety gates, disclaimers. Report: `saelis-her-phase-3.md`.

**Phase 4 — Restore.** Postpartum tables/services fully isolated; Restore safety rules;
activation flow with explicit consent. Report: `saelis-her-phase-4.md`.

**Phase 5 — Rhythm + Reset + companion integration + audit.** Cycle-aware layer (opt-in,
private), Reset overlay logic, Her context into the Light Engine behind the existing safety
contract, wellness evaluation-case suite, closing audit. Report:
`saelis-her-phase-5-audit.md`.

Each phase ends with the validation commands in §7 and its own tests.

## 7. Exact validation commands

Run after all implementation work, every phase:

```sh
npm run format:check   # or npm run format to write
npm run lint
npm run typecheck
npm test
npm run build
```

Types regeneration when schema changes:

```sh
npx supabase gen types typescript --project-id <project-id> --schema public \
  > src/lib/supabase/generated.types.ts
```

## 8. Files likely to be created

- `CLAUDE.md` (Phase 1, first deliverable — see §11)
- `supabase/migrations/00007_her_foundation.sql` (then 00008+ per phase)
- `src/app/(app)/her/page.tsx`, `her/enroll/page.tsx`, `her/check-in/page.tsx`,
  `her/plan/page.tsx`, `src/app/(app)/her-actions.ts`, `src/app/(app)/settings/her/page.tsx`
- `src/lib/db/queries/wellness/{profiles,enrollments,goals,check-ins,plans,logs,metrics}.ts`,
  `src/lib/db/queries/postpartum/*.ts`
- `src/lib/wellness/{pathways,plan-engine,safety}.ts` (+ tests),
  `src/lib/wellness/restore/*.ts` (+ tests)
- `src/lib/validation/wellness.ts`, `src/types/wellness.ts`
- `src/components/her/*` (enrollment flow, check-in form, plan view, log forms)
- `src/test/wellness-safety-cases.ts` (+ evaluation test)
- Docs: `docs/02-product/saelis-her.md`, `docs/03-engineering/her-architecture.md`,
  `docs/03-engineering/her-safety.md`, `docs/implementation/saelis-her-phase-*.md`

## 9. Files likely to be modified

- `src/middleware.ts` (protected prefixes), `src/lib/supabase/types.ts` (wire generated types /
  add tables), `src/types/database.ts`, `src/lib/supabase/generated.types.ts` (regenerated)
- `src/app/(app)/actions.ts` + `src/components/settings/data-deletion-section.tsx` (deletion
  coverage), account-deletion path
- `src/components/layout/celestial-navigation.tsx` / app shell (nav entry),
  `src/lib/home/loader.ts` + `home-view.tsx` (one quiet glimpse, optional)
- `stewardship_events` allowlist (via migration), `README.md`, `CHANGELOG.md`, `ROADMAP.md`
- Possibly `handle_new_user()` — only if any Her bootstrap is desired (recommend not; keep
  opt-in)

## 10. Decisions requiring clarification

1. **Her surface route name**: `/her`, `/wellness`, or something on-brand — and how visible it
   is from `/home` given Home's anti-dashboard contract.
2. **Pathway catalog: table vs. code constant.** Six static pathways may not warrant a DB
   table; a check-constraint allowlist on `wellness_enrollments.pathway` + a code catalog
   matches how `arrivals.mood` etc. are done. A `wellness_pathways` table only pays off if
   pathways gain dynamic content.
3. **Extend `arrivals` vs. new `wellness_daily_check_ins`**: arrivals already capture
   mood/energy daily; separate wellness check-in (recommended, keeps companion and wellness
   domains apart) or one unified check-in?
4. **Feature flag**: is enrollment itself the gate, or is an env/DB flag wanted to hide Her
   entirely pre-launch?
5. **Companion integration scope for v1**: should Her data reach the Light Engine at all
   initially, or ship tracking/planning deterministically first (recommended)?
6. **Restore RLS strictness**: enforce Restore activation in RLS policies (postpartum rows
   require an active Restore enrollment) or service-layer only?
7. **Timezone source of truth**: populate and use `profiles.timezone` for "daily" boundaries,
   or stay device-local like Home/Sky?
8. **Uncommitted stream-route changes**: land or stash before Her work starts?

## 11. Phase 1 deliverable: CLAUDE.md specification

`CLAUDE.md` is **not** created during Phase 0 (audit only). It is the **first documented
deliverable of Phase 1**, at the repository root, and must instruct any agent or contributor to
**read CLAUDE.md before modifying the repository**. Required content:

**Product rules**

- Saelis Her is the umbrella women's wellness product.
- Pathway definitions: Phoenix (sustainable weight management, fitness, strength, habits, body
  recomposition), Restore (dedicated postpartum recovery and return-to-fitness), Strong
  (progressive strength training without weight-loss goals), Nourish (nutrition, meal planning,
  protein, fiber, hydration, sustainable eating), Rhythm (optional menstrual-cycle-aware
  wellness and energy support), Reset (simplified mode for low energy, overwhelm, stress,
  illness recovery, disrupted routines).
- Users may enroll in multiple pathways simultaneously.
- **Neutral-naming rule**: shared architecture must use neutral wellness naming
  (`wellness_*`, `women_wellness_profiles`). Never use "mama", "postpartum", or "restore"
  naming for shared tables, services, types, routes, or components.
- **Restore isolation**: Restore is the dedicated postpartum pathway. Postpartum-specific data
  and behavior (tables, questions, language, restrictions, recommendations) must remain
  isolated from non-Restore users.
- Weight and calorie tracking are optional — never required, never presented as precise.

**Safety rules**

- Deterministic safety logic is authoritative; the LLM must never override a safety hold.
- Saelis Her never claims to be a clinician of any kind, never diagnoses, never auto-classifies
  users as medically cleared, never tells users to exercise through significant pain, never
  recommends extreme restriction/compensatory exercise/laxatives/detoxes/fat burners, never
  encourages aggressive deficits while breastfeeding, and never uses shame or "bounce back"
  language.

**Engineering conventions (from this audit)**

- Architecture and naming conventions per §1 and §4; reuse existing architecture before
  creating parallel systems.
- Preferred locations: routes under `src/app/(app)/...` with middleware protection; components
  in `src/components/<domain>/`; services/domain logic in `src/lib/<domain>/`; data access in
  `src/lib/db/queries/<domain>/`; Zod schemas in `src/lib/validation/`; tests co-located as
  `*.test.ts(x)` plus evaluation suites in `src/test/`; migrations in `supabase/migrations/`
  with sequential numbering.
- Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`,
  `npm run format:check` — run all after implementation work.
- Supabase: idempotent numbered migrations; RLS per-operation own-row policies on every
  user-owned table; regenerate `generated.types.ts` after schema changes.
- Client/server boundaries: RSC by default; `"use server"` actions; `server-only` modules for
  secrets; browser gets only `NEXT_PUBLIC_*` values; keep server secrets out of client
  components.
- Security/privacy: scope all user-owned data by the authenticated user (server-derived
  identity, RLS final authority); validate all input and all JSONB with Zod; never log
  sensitive wellness or symptom data; do not modify `.env.local` values.
- Process: do not commit, push, deploy, or apply production migrations unless explicitly
  instructed.
