# Saelis Her — Phase 5 Final Production-Readiness Audit

Date: 2026-07-17 · Scope: complete Saelis Her implementation (Phases 0–4) · No major features added.
Not committed, not pushed, not deployed; no migrations applied; no secrets touched.

## 1. Overall readiness rating

**Ready for staging; conditionally ready for production.** Code quality, type safety, RLS
design, safety-engine behavior, Restore isolation, and test coverage are strong and verified.
Three gates remain before real users: (a) migrations have never executed against a real
Postgres, (b) push-notification delivery infrastructure is absent by design, and (c)
legal/clinical review of safety and Restore copy (already a repo-wide launch requirement) is
outstanding.

## 2. Critical issues found

Audit scans (secrets-in-client, server-only leakage, sensitive logging, RLS coverage script over
all 35 tables, naming isolation, JSONB boundaries, migration idempotency/FKs, dead code,
milestone gating) found **zero critical safety or security defects** and three lower-severity
defects:

1. Dead component `src/components/her/readiness-entry.tsx` (superseded by the Phase 4 dashboard).
2. Two unused exported server actions (`getMyEnrollments`, `getMyOnboardingState`) — unnecessary
   authenticated surface.
3. Milestone sweep used hardcoded context (`tracksWeight: true`, `checkInCount: 1`,
   `onboardingComplete: true`) — could not yet mis-fire a weight milestone (progress value was
   always null), but violated the weight-optional product rule in spirit.

## 3. Critical issues repaired

All three: dead component removed; unused actions and their imports pruned; milestone sweep now
loads the real profile (`tracks_weight`, defaulting to OFF), real check-in count, and derives
onboarding state from enrollment. Format/lint/typecheck/tests/build re-verified after repair.

## 4. Remaining risks

- SQL executed nowhere yet — syntax/behavioral verification on a live Postgres is mandatory
  before launch (no local Postgres exists in this environment).
- Hand-written type boundary vs future generated types (drift is a bug; regenerate after push).
- In-memory rate limiter and idempotency (single-instance; flagged in-repo for managed
  replacements before multi-instance production).
- US-only crisis resources; imperial-only inputs; single celestial theme (no separate dark mode
  app-wide). Weekly progression application and metrics aggregation for remaining milestone
  types are scheduled work, not defects.

## 5. Database and RLS status

35 tables total; RLS enabled on **every** table (script-verified, including loop-generated
policies). User-owned tables: four per-operation own-row policies (`auth.uid()`), USING + WITH
CHECK on updates. Parent-check policies for `wellness_exercise_logs` and
`wellness_program_weeks` (conversation_turns pattern). Postpartum insert/update additionally
require the user's own active Restore enrollment. Libraries: active-row SELECT only, zero
client write policies. No `using (true)` anywhere (the one textual match is a comment). All 15
user-owned wellness tables FK to `profiles(id) on delete cascade` → account deletion cascades;
in-app wellness deletion runs through the RLS session in FK-safe order. Migrations are
idempotent (74 guarded statements) with sequential numbering.

## 6. Safety-engine status

All critical safety tests pass, individually verified: chest pain, shortness of breath,
fainting/dizziness, severe headache, heavy postpartum bleeding, severe abdominal/pelvic pain,
and calf pain/swelling each produce `urgent_support` with exercise and plan generation blocked;
self-harm concern overrides all planning with 988/911 crisis support and no diagnosis;
`not_cleared` and early-postpartum-unknown-clearance produce professional holds;
pressure/leaking/doming route to pelvic-floor PT suggestions; pain ≥ 7 or repeated exercise
pain holds. Safety precedence is enforced at every layer: engine → planner → stored plan →
presentation → dashboard (workout cards and workout quick-actions vanish under holds) →
notifications (workout reminders suppressed) → companion (hold-only context). No minimizing or
diagnostic language; thresholds centralized in `rules.ts`.

## 7. Restore-isolation status

Verified end-to-end: postpartum data lives only in `postpartum_*` tables behind
Restore-enrollment RLS + service guards; the safety engine ignores postpartum inputs for
non-Restore users (tested); onboarding hides the Restore step and postpartum-worded goals
(component-tested); the dashboard shows no postpartum text for non-Restore users (tested);
Restore notifications are pathway-gated and lock-screen generic (tested); the companion context
has no fields capable of carrying symptoms; naming isolation is clean repo-wide; pausing/
archiving Restore preserves records; the deletion path removes postpartum tables first.

## 8. Notification status

Policy layer complete and fully tested (master switch, categories, pathway gating, timezone
quiet hours, daily cap, dedupe, completed-action suppression, unresponsive back-off,
banned-phrase screen). **No delivery transport exists** — no service worker, no subscription
storage, no cron, and therefore no push secrets to expose and no cron routes needing
authorization (N/A by absence; when built, follow the plan in §14 of this report). No browser
permission is ever requested.

## 9. Companion-safety status

Context is minimal and structured; hold state sends only the safety summary; boundaries
appended to the developer instruction forbid overriding holds, diagnosis, restoring blocked
exercise, sub-floor calorie advice, supplement dosing, medical-expertise claims, and
out-of-engine postpartum programming — all asserted by tests. Wiring is additive, guarded, and
byte-identical for non-enrolled users (companion route suites re-verified). Deterministic
post-validation enforcement still applies to every model response, and the urgent keyword
pre-check still bypasses the provider entirely.

## 10. Test results

77 files / **772 tests — all passing** (Her-specific: 29 files / ~244 tests across registry,
validation, engines, planner, notifications, companion context, progress, and components).
Authorization coverage: user-scoped query assertions, Restore-enrollment write guard, and the
companion routes' strict no-raw-client access guarantee.

## 11. Build results

`next build` ✓ (compiled successfully; all `/wellness/her/*` routes present; six pathway pages
prerendered). format:check ✓ · lint ✓ (0 errors/warnings) · typecheck ✓.

## 12. Manual commands still required

```sh
npx supabase db push                          # applies 00007 + 00008 — review first
npx supabase gen types typescript --project-id <id> --schema public \
  > src/lib/supabase/generated.types.ts       # then reconcile src/lib/supabase/types.ts
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

## 13. Environment values still required

None new for Saelis Her. Existing (`.env.example`, all documented): Supabase URL + publishable
key, `SUPABASE_SECRET_KEY` (account deletion), OpenAI variables when `COMPANION_PROVIDER=openai`,
`APP_URL`. `.env.local` untouched throughout.

## 14. Production deployment checklist

1. Apply 00007/00008 to staging; verify seeds (6 pathways, 32 exercises, 14 templates, 18
   meals) and RLS behavior with two test accounts (cross-user reads must fail).
2. Regenerate types; delete the hand-written wellness rows; re-run the full suite.
3. Manual mobile pass: onboarding (incl. Restore + resume) → plan → check-in adaptation →
   workout log → meals → progress → settings → wellness deletion.
4. Replace in-memory rate limiting/idempotency with managed equivalents (pre-existing repo
   requirement).
5. Legal/clinical review of safety, Restore, and nutrition copy (ROADMAP already gates launch
   on legal review); internationalize crisis resources if launching beyond the US.
6. When building push: subscription table w/ RLS, service worker, explicit permission button,
   scheduled sender that calls `planNotifications`, cron-route authorization header, and
   invalid-subscription cleanup — the policy layer is ready and tested.
7. Follow `docs/03-engineering/deployment-checklist.md` for the base app.

## 15. Recommended next release milestone

**v0.9 — "Saelis Her Live Beta"**: staging migration + type regeneration, weekly progression
application (advance weeks/phases via `isProgressionEligible`, deload awareness, Restore
phase advancement), metrics aggregation completing hydration/protein/weight milestone context,
push delivery on the existing policy layer, and the legal/clinical copy review — then a small
invite-only cohort through the full journey before any public availability.
