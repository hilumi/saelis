# Changelog

## v0.8.0 — Web Beta Readiness (2026-07)

- New-user onboarding: four brief, skippable screens (what Saelis is, honest AI disclosure,
  initial directness + light-humor choice, begin) — shown exactly once (`profiles.onboarded_at`)
- Public trust pages: `/privacy`, `/terms` (both labeled drafts pending legal review),
  `/ai-disclosure`, `/support`; linked from sign-up, privacy settings, and the public footer
- Feedback: Helpful / Not quite with optional v0.8 categories (too soft, too direct, too long,
  too generic, missed what I needed, humor didn't land); content-free by schema; founder console
  gains a categories-only aggregate (`feedback_category_counts`)
- Reliability: calm offline handling (draft preserved, nothing sent), expired-session path to
  sign-in, connectivity-aware error copy; composer drafts survive reloads via sessionStorage
- Mobile: viewport-fit=cover + safe-area insets, keyboard-resizing viewport, sticky composer,
  `overflow-x: clip`, wrap-anywhere text (manual device pass still recommended)
- Deployment: `docs/03-engineering/deployment-checklist.md` (Vercel + Supabase runbook); env
  docs refreshed; middleware now also guards /onboarding, /insights, /constellations, /founder
- Migration 00006: `profiles.onboarded_at`, updated feedback-category allowlist, founder-only
  feedback aggregate. Feature freeze otherwise — no new intelligence systems

## v0.7.0 — Saelis Core: Relational Intelligence Foundation (2026-07)

- Saelis Core (`src/lib/core/`): one coherent pipeline that reads the room, chooses a response
  posture, calibrates humor/sarcasm and constructive challenge, and mirrors communication form —
  enriching the existing LightPlan (the Light Engine is extended, never replaced)
- Moment-aware response posture (witness, ground, explore, clarify, challenge, plan, celebrate,
  play, comfort, reflect, presence); explicit user intent always overrides inference
- Linguistic mirroring of FORM only (energy, rhythm, emoji, structure) — no identity inference,
  no dialect mimicry, no cultural caricature, by construction and by test
- Constructive challenge policy: deterministic rulings (allowed / requires-permission /
  prohibited / humor-assisted / safety-mandated); feelings validated, harmful actions challenged
- Facts-versus-interpretation reflection for analyzing texts, emails, and decisions (new optional
  `reflection` field in the CompanionResponse contract)
- Low-risk adaptive preferences: allowlisted keys only, transparent deterministic confidence
  model with decay, explicit-statement observation only, visible transparency notices, full user
  control (keep / adjust / reset / stop / clear all) in Settings → "How we communicate"
- Pattern hypotheses: tentative, uncertainty-phrased, content-free evidence, maturity gates
  (repeated + cross-domain + multi-day evidence), rejectable, theme opt-out, 90-day expiry
- "Things you may not have noticed" (`/insights`): quiet review surface with inspectable evidence
- Deterministic post-validation enforcement: humor stripping, prohibited-claim removal
  (diagnoses, trauma causation, protected-trait inference, third-party certainty), shared-language
  gating, provider adaptation-notices discarded, insight candidates screened
- Migration 00005: `adaptive_preferences`, `pattern_hypotheses`, `pattern_evidence` — RLS,
  bounded confidence, trigger-guarded updates, SECURITY DEFINER inference functions, founder
  aggregates (counts only)
- Founder Console: adaptation stewardship aggregates (status counts only, no drill-down)
- 200+ new deterministic tests including a 55-case Saelis Core evaluation set

## v0.6.0 — Home (2026-07)

- `/home`: a sanctuary landing after sign-in — Living Sky + The Light + time-aware greeting
- Four quiet doors (Talk, Arrive, Stay Here, Find one step); no dashboard, no grid of demands
- At most one dismissible continuation (conversation > horizon > arrival > North Star), private-content-free
- Horizon and Constellations glimpses with calm empty states; no overdue/shame language
- Quiet return context (coarse, device-local; no streaks, counts, or guilt)
- Last Light groundwork: one optional closing line on stepping away
- Navigation reordered around Home; sign-in/callback now land on `/home`
- Dev previews: `/home?preview=…` (fictional, development-only)

## v0.5.0 — Constellations & Stewardship (2026-07)

- Constellations: approved memories as deterministic, keyboard-accessible stars (`/constellations`)
- North Stars: explicit values and long-term intentions, shape-distinct, never inferred
- Memory Center (`/settings/memories`): search, filter, sort, edit, reclassify, delete, clear all, JSON export
- Upgraded memory proposals: edit before saving, explicit kind selection
- Memory-use transparency (`last_used_at`, gentle in-conversation note)
- Suggested step → Horizon hand-off (explicit, idempotent)
- Founder Console (`/founder`): role-gated, aggregate-only stewardship
- `app_roles` + privacy-safe `stewardship_events` (opt-in, content-free, schema-as-allowlist)
- Optional "Helpful / Not quite" response feedback

## v0.4.0 — Living Sky

Time-driven global atmosphere: eight phases, palette interpolation, deterministic stars, sun,
moon, rare aurora, Light tone sync, reduced-motion/high-contrast/mobile rules. No location, no
weather, no mood.

## v0.3.0 — Awakening

Live OpenAI provider (Responses API, strict structured outputs) beneath the Light Engine; SSE
streaming with stop/retry; plan enforcement; typed provider errors; cost controls; idempotency.

## v0.2.0 — Light Engine

Provider-independent behavioral layer (understanding, reflection, memory policy, prompt
composition, closing policy) plus ten foundational philosophy documents.

## v0.1.0 — Foundation

Next.js + Supabase secure foundation: auth, RLS on every table, consent-based memory model,
celestial design system, mock companion, full test suite.
