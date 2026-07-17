# Saelis Her — Phase 2 Report (Entry, Onboarding, Enrollment, Settings)

Date: 2026-07-17 · Status: complete · Not committed, not pushed, not deployed, no migration applied.

Phase 2 delivers the Saelis Her entry experience, resumable onboarding (general + Restore +
Rhythm + Phoenix), enrollment management, settings, and Home integration. The workout, nutrition,
and adaptive daily-plan engines remain Phase 3, per scope.

## Routes created

`/wellness` (redirect), `/wellness/her` (enrollment-aware home + readiness entry),
`/wellness/her/onboarding` (`?step=` URL navigation), `/wellness/her/pathways` (management),
`/wellness/her/pathways/[key]` (six static landing pages), `/wellness/her/settings`. Middleware
now protects `/wellness`; navigation gains a "Her" item; `/home` gains one quiet entry card (the
sanctuary contract is untouched — all 9 home tests still pass). Registry and 00007 seed routes
were aligned to `/wellness/her/pathways/<key>` (safe: 00007 is unapplied and uncommitted).

## Components created (src/components/her/)

`fields.tsx` (accessible TextField/NumberField/DateField/RadioChips/TagListField),
`her-onboarding-flow.tsx` (11-step resumable flow with per-step validation, save states,
aria-live progress announcements, focus management, aggressive-pace notice, Restore intake with
non-diagnostic context), `pathway-management.tsx` (add/pause/resume/set-aside with dialog
confirmations + per-pathway data-use and plan-effect explanations), `her-settings.tsx` (pathways,
general profile, movement, nutrition, progress tracking, reminders, Restore section only when
active, Rhythm section only when active, privacy explanation), `readiness-entry.tsx` (basic
daily readiness check-in writing `wellness_daily_check_ins`).

## Services and actions created

- Migration **00008_saelis_her_onboarding.sql**: `wellness_onboarding_drafts` (server-side
  resumable draft, Zod-validated JSONB, 16 KB cap), `wellness_notification_preferences`, and 8
  optional preference columns on `women_wellness_profiles` — all with own-row RLS + triggers.
- Pure logic: `src/lib/wellness/onboarding.ts` (deterministic step engine),
  `src/lib/wellness/pace.ts` (conservative-pace rule, shame-free copy),
  `src/lib/wellness/complete-onboarding.ts` (completion orchestrator; sets draft-program
  `safety_tier: restricted` when Restore clearance isn't reported cleared — a deterministic
  hold for the Phase 3 engine).
- Schemas: `src/lib/validation/wellness-onboarding.ts` (draft/step/notification schemas);
  `wellness.ts` extended (profile columns, enrollment settings phoenixStyle/rhythmMode).
- Queries: `wellness/onboarding.ts`, `wellness/notifications.ts`; `enrollments.ts` gains
  `archiveEnrollment` + `updateEnrollmentSettings`; `profiles.ts` maps the new columns.
- Server actions (`src/app/(app)/wellness-actions.ts`): enroll/pause/resume/archive pathway,
  save pathway settings, save Her profile, save Restore profile (active-Restore-enrollment
  required), save goal, save notification preferences, save onboarding progress, finish
  onboarding, save readiness check-in, plus authenticated reads. All: requireUser → Zod →
  user-scoped service → calm errors; no profile/symptom/onboarding content is ever logged.

## Files modified

`src/middleware.ts` (+/wellness), `src/components/layout/celestial-navigation.tsx` (+Her),
`src/components/home/home-view.tsx` (+entry card, 23 lines), `src/lib/supabase/types.ts`
(2 new tables), `src/types/wellness.ts`, `src/lib/wellness/constants.ts`,
`src/lib/wellness/pathways/registry.ts` (routes), `supabase/migrations/00007_...sql` (seed
routes), `src/lib/db/queries/wellness/{enrollments,profiles}.ts`,
`src/lib/validation/wellness.ts`. Pre-existing uncommitted stream-route and conversation-view
changes remain untouched.

## Tests created (4 new files + extensions — 34 new tests; suite: 63 files, 659 tests, green)

- `onboarding.test.ts` (10): conditional steps (Restore hidden unless selected; Rhythm optional;
  Reset standalone), navigation, completion requirements incl. Restore/Rhythm/Phoenix, resume
  logic, backward-without-loss.
- `pace.test.ts` (5): optional-weight silence, gentle pass, aggressive flag both directions,
  shame-free promise-free copy.
- `wellness-onboarding.test.ts` (9): pathway selection, primary-goal membership, empty draft,
  optional weight, strict slices, Restore never-auto-cleared, Rhythm modes (no fertility
  fields), notification bounds.
- `her-onboarding-flow.test.tsx` (7): six pathways multi-select with no auto-selection, no
  postpartum language without Restore, postpartum goals/step with Restore, non-diagnostic
  Restore context, backward data retention, screen-reader step announcements.
- `enrollments.test.ts` +2: archive is a status flip (never delete) with user scoping; temporary
  Reset activation (enroll/pause/resume, no deletes). Existing tests already cover enrollment
  dedup, profile scoping, and the Restore-enrollment requirement.

## Validation results

format:check ✓ · lint ✓ (0 errors/warnings) · typecheck ✓ · tests ✓ (63 files / 659 passing) ·
build ✓ (all /wellness routes compiled; six pathway pages prerendered).

## Migration added

`supabase/migrations/00008_saelis_her_onboarding.sql` (plus seed-route alignment inside the
still-unapplied 00007). Neither migration has been applied anywhere.

## Manual setup required

```sh
npx supabase db push        # applies 00007 + 00008 — review first
npx supabase gen types typescript --project-id <id> --schema public \
  > src/lib/supabase/generated.types.ts   # then reconcile the hand-written boundary
npm run lint && npm run typecheck && npm test && npm run build
```

No local Postgres exists in this environment, so the SQL has not been executed — review before
pushing.

## Known limitations

- Notification preferences are stored choices only; no delivery/scheduling/browser-permission
  code exists (by design — permission requires a future explicit enable button).
- Rhythm collects only a participation mode; no cycle data model exists (intentional minimum).
- Quiet-hours end is fixed at UI level only via schema; the onboarding UI exposes start hour and
  daily cap (end-hour editing lands with the notification system).
- Metric units are stored as a preference; inputs currently collect imperial values.
- Settings sections share one profile save action (a save in one section saves the whole
  profile draft); per-section optimistic diffs can come later.
- The "generation-ready" program row is a placeholder — no weeks/plans until Phase 3.
- Draft resume relies on server state; unsaved in-step edits are lost on hard navigation before
  Continue (each step transition persists).

## Recommended focus for Phase 3

1. Deterministic daily-plan rules engine honoring `safety_tier` (restricted → education/recovery
   only) and daily/postpartum red flags → `safety_hold`; the LLM never overrides it.
2. Program generation from the profile (weeks, phases, deloads) using the seeded exercise and
   template libraries; Reset overlay behavior on live plans.
3. Full daily check-in UI feeding the engine; plan rendering on `/wellness/her`.
4. Workout and nutrition logging UI on top of the Phase 1 log services; milestone detection.
5. Timezone-aware "user's local day" (populate `profiles.timezone`) before date-keyed plans.
6. Extend the in-app data-deletion section to wellness tables.
