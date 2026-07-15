# Changelog

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
