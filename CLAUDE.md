# CLAUDE.md — Saelis repository guide

**Read this file before modifying the repository.** It encodes the conventions discovered in the
Phase 0 audit (`docs/implementation/saelis-her-phase-0-audit.md`) and the rules for Saelis Her.

## What this repository is

Saelis is a personal AI companion (Next.js 15 App Router, React 19, TypeScript strict, Tailwind
v4, Supabase, Zod, Vitest). **Saelis Her** is the umbrella women's wellness product built on the
same foundation: modular wellness pathways for planning, tracking, and education.

## Saelis Her pathways

| Key       | Purpose                                                                                 |
| --------- | --------------------------------------------------------------------------------------- |
| `phoenix` | Sustainable weight management, fitness, strength, healthy habits, body recomposition    |
| `restore` | Dedicated postpartum recovery and return-to-fitness pathway                             |
| `strong`  | Progressive strength training without requiring weight-loss goals                       |
| `nourish` | Nutrition, meal planning, protein, fiber, hydration, sustainable eating habits          |
| `rhythm`  | Optional menstrual-cycle-aware wellness and energy support                              |
| `reset`   | Simplified wellness mode for low energy, overwhelm, stress, illness, disrupted routines |

- Users may enroll in **multiple pathways simultaneously**. Reset may overlay other pathways.
- Rhythm is always optional. Phoenix is never required for Strong or Nourish.
- The pathway registry (`src/lib/wellness/pathways/`) is the single source of truth; general
  components read behavior from the registry, never from scattered hard-coded pathway checks.

## The neutral-naming rule

Shared platform architecture uses **neutral wellness naming**: `wellness_*` tables,
`women_wellness_profiles`, `src/lib/wellness/*`, `src/components/her/*`. **Never** use "mama",
"postpartum", or "restore" naming for shared tables, services, types, routes, or components.

## Restore isolation

Restore is the dedicated postpartum pathway. Postpartum-specific data lives only in dedicated
tables (`postpartum_profiles`, `postpartum_check_ins`) and services
(`src/lib/db/queries/postpartum/`, `src/lib/wellness/restore/`). Postpartum questions, language,
restrictions, and recommendations must **never** reach users who have not activated Restore.

## Safety rules (non-negotiable)

- **Deterministic safety logic is authoritative. The LLM must never override a safety hold.**
  (Precedent: `src/lib/ai/safety.ts` pre-check + `src/lib/ai/plan-enforcement.ts` post-validation.)
- Saelis Her is wellness education/planning/tracking. It never claims to be a physician,
  obstetrician, dietitian, physical therapist (incl. pelvic-floor PT), certified trainer,
  mental-health clinician, or diagnostic application.
- Never: diagnose; auto-classify users as medically cleared; tell users to exercise through
  significant pain; recommend extreme calorie restriction, compensatory exercise, laxatives,
  detoxes, or fat burners; encourage aggressive deficits while breastfeeding; present calorie
  estimates as precise; use shame, punishment, or "bounce back" language; treat pelvic-floor
  contractions as universally appropriate.
- **Weight and calorie tracking are optional** — nullable, user-controlled, never required.

## Architecture and conventions

- **Reuse existing architecture before creating parallel systems.**
- Server Components by default; client components only where interaction requires them.
- Data flow: server action (`src/app/(group)/*actions.ts`, `"use server"`) → Zod parse →
  repository function in `src/lib/db/queries/<domain>/` (takes the RLS client + server-derived
  userId) → `ActionResult<{ok, error}>` with calm, content-free error copy.
- Identity always comes from the server session (`requireUser()` in `src/lib/auth/require-user.ts`),
  never from client input. Protected routes are listed in `src/middleware.ts` `PROTECTED_PREFIXES`.
- API routes only for streaming/AI (`/api/companion*`) and health.

### Preferred locations

| Thing        | Location                                                       |
| ------------ | -------------------------------------------------------------- |
| Routes       | `src/app/(app)/...` (add prefix to middleware when protected)  |
| Components   | `src/components/<domain>/` (shared UI in `src/components/ui/`) |
| Domain logic | `src/lib/<domain>/` — pure, synchronous, heavily tested        |
| Data access  | `src/lib/db/queries/<domain>/`                                 |
| Zod schemas  | `src/lib/validation/`                                          |
| Domain types | `src/types/`                                                   |
| Tests        | co-located `*.test.ts(x)`; evaluation suites in `src/test/`    |
| Migrations   | `supabase/migrations/NNNNN_name.sql` (sequential, idempotent)  |

### Supabase and types

- Migrations: sequential numbering, idempotent DDL (`if not exists` / `or replace` /
  `do $$ ... exception when duplicate_object`), commented, one migration per milestone. Shared
  reference/library data is seeded in migrations; `supabase/seed.sql` is dev-only.
- Every user-owned table: uuid PK (`gen_random_uuid()`), `user_id` FK with `on delete cascade`,
  text + check constraints (not pg enums), `created_at`/`updated_at` with the shared
  `set_updated_at()` trigger, indexes on `(user_id)` and date columns.
- **RLS on every user-owned table**, per-operation own-row policies (`auth.uid()`), USING and
  WITH CHECK on updates, no `using (true)`. Global libraries: read-only for authenticated users
  (active rows), no client write policies.
- Types: hand-written boundary in `src/types/database.ts` (+ `src/types/wellness.ts`) mirrored
  into `src/lib/supabase/types.ts` until regeneration:
  `npx supabase gen types typescript --project-id <id> --schema public > src/lib/supabase/generated.types.ts`
  after migrations are applied to a live project. Treat drift as a bug.
- **Validate all JSONB with Zod at every application boundary.** Never pass unchecked JSONB to
  components.

### Client vs. server boundaries

- Server secrets live only in `server-only` modules (`src/lib/supabase/admin.ts`,
  `src/lib/ai/openai-client.ts`). Never import them into client components.
- Browser receives only `NEXT_PUBLIC_*` values. Never add secrets with that prefix.
- The admin client (secret key, bypasses RLS) is for privileged operations (account deletion)
  only — never for normal user queries.

### Security and privacy

- Scope every user-owned query by the authenticated user; RLS is the final authority.
- **Never log sensitive wellness or symptom data**, message content, memory content, or secrets.
  Telemetry is content-free by schema (`stewardship_events`) and analytics is opt-in.
- Postpartum data must never be exposed between users or to non-Restore code paths.
- Account deletion must cascade through all user-owned tables (wellness included).
- **Do not modify `.env.local` values.** `.env.example` documents placeholders only.

## Process rules

- **Do not commit, push, deploy, or apply production migrations unless explicitly instructed.**
- After implementation work, always run:

```sh
npm run format:check   # or npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

- Phase reports live in `docs/implementation/saelis-her-phase-*.md`.
