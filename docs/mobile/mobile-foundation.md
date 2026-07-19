# Saelis mobile — foundation

The native Saelis app: Expo / React Native with Expo Router, living beside the existing Next.js
web app in one npm workspace. Sprint 1 delivered the shell — navigation, design language, and
shared packages. Sprint 2 replaced the placeholder session with real Supabase authentication
against the same project, account, and data as the web app. Sprint 3 connected the live Saelis
conversation to the existing web backend — streaming, history, retry, and cancel. Sprint 4
delivered the companion experience: a warmer centralized constitution, opt-in push
notifications, onboarding + conversation starters, and user-controlled memory.

## Architecture

```text
apps/
  mobile/                  Expo app (TypeScript strict, Expo Router, src/ layout)
packages/
  shared/                  @saelis/shared — types + zod schemas mirrored from the web contracts
  design-tokens/           @saelis/design-tokens — colors, spacing, radii, type scale, shadows, motion
(repo root)                Next.js web app (unchanged; moves into apps/ in a later sprint)
```

Key points:

- **Workspace.** The root `package.json` declares `workspaces: ["apps/*", "packages/*"]`. The web
  app still lives at the root and all existing web commands are unchanged; root `tsconfig.json`,
  `eslint.config.mjs`, and `.prettierignore` exclude `apps/` and `packages/`, which own their
  configs.
- **Routing (`apps/mobile/src/app/`).** `index.tsx` gates on the session: launch state while
  restoring, then `(auth)/sign-in` or the protected `(app)` group. `(app)/_layout.tsx` is the
  single deterministic auth gate; `(app)/(tabs)/` holds Home, Conversation, and Settings behind
  bottom tabs.
- **Session (`src/lib/session.tsx` + `src/lib/auth/`).** Real Supabase auth. A pure,
  fully-tested core (`state.ts` machine, `guards.ts` route decisions, `errors.ts` calm error
  mapping, `controller.ts` lifecycle) sits under a thin React provider. See
  "Authentication" below.
- **Design (`src/theme`, `src/components/`).** A native interpretation of the Saelis language,
  built from `@saelis/design-tokens` — never hard-coded values and never copied browser
  components: `LivingSky` (gradient + slow cloud drift, still under reduced motion),
  `GlassSurface` (pearl-glass cards), `SaelisText` (Manrope hierarchy), `SaelisButton`,
  `Screen` (sky + safe-area shell). Manrope loads via `@expo-google-fonts/manrope`; ink-on-sky
  contrast follows the web palette; keyboard-safe layouts use `KeyboardAvoidingView`.
- **Shared packages.** Both export TypeScript source directly (Metro transpiles workspace
  packages). `@saelis/shared` mirrors the web companion contracts — the web server remains the
  source of truth; treat drift as a bug. No business logic has been extracted yet, on purpose.
- **Identifiers.** `name: Saelis`, `slug: saelis`, `scheme: saelis`,
  `ios.bundleIdentifier` / `android.package: com.ingenuus.saelis` — permanent; do not change.

## Local setup

1. Install Node 22 (`.nvmrc`) and run `npm install` at the repo root (installs every workspace).
2. Copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill in the Supabase values
   (required for sign-in; the app runs without them but shows a configuration notice).
3. Start: `npm run mobile:start`, then press `i` (iOS simulator), `a` (Android emulator), or scan
   the QR code with Expo Go.

## Authentication

### Architecture

- **Client (`src/lib/supabase.ts`).** `@supabase/supabase-js` with public credentials only
  (URL + publishable key; RLS constrains all data). Sessions persist in **expo-secure-store**
  (iOS Keychain / Android Keystore-encrypted storage — never browser localStorage). PKCE flow;
  token auto-refresh runs while the app is foregrounded (AppState wiring). Lazy singleton: a
  missing `.env` surfaces as a calm notice on sign-in instead of a crash.
- **State (`src/lib/auth/state.ts`).** Pure reducer: `loading → signedIn | signedOut`, driven by
  `restored`, `sessionChanged`, `signedOut`, and `configError` events.
- **Lifecycle (`src/lib/auth/controller.ts`).** Framework-free: restores the persisted session at
  launch, holds exactly one `onAuthStateChange` subscription (subscribed before restore so no
  event is missed; idempotent `start`), treats failed refreshes / server sign-outs (`SIGNED_OUT`)
  as expired sessions, and signs out locally first so the UI never sticks even if the network
  call fails.
- **Guards (`src/lib/auth/guards.ts`).** Both group layouts call pure guard functions: `loading`
  renders the launch screen (no protected-content flash), signed-out users are redirected out of
  `(app)`, signed-in users are redirected out of `(auth)`.
- **Same account as the web.** One Supabase project; profiles are created by the existing
  `handle_new_user` trigger; all queries are RLS-scoped to `auth.uid()`. There is no separate
  mobile user system.

### Supported flows

| Flow                     | Where                       | Notes                                                      |
| ------------------------ | --------------------------- | ---------------------------------------------------------- |
| Email + password sign-in | `(auth)/sign-in`            | Same calm error copy as the web                            |
| Registration             | `(auth)/sign-up`            | Password ≥ 8 chars; email-confirmation state when required |
| Forgot password          | `(auth)/forgot-password`    | Never reveals whether an email exists                      |
| Set new password         | `(app)/reset-password`      | Reached from the recovery email link                       |
| Email links              | `src/app/auth/callback.tsx` | `saelis://auth/callback` deep link, PKCE code exchange     |
| Sign-out                 | Settings                    | Clears local state immediately, then the server session    |

No social login (matches the web). PKCE means email links must be opened **on the device that
requested them** — the code verifier lives in that device's secure storage.

### Supabase dashboard steps (manual, one-time)

In the Supabase project → **Authentication → URL Configuration → Redirect URLs**, add:

```text
saelis://auth/callback
```

For development testing in **Expo Go**, also add the dev-client URL printed by
`Linking.createURL("auth/callback")` (it looks like `exp://192.168.x.x:8081/--/auth/callback`;
shown in the Metro logs / shell output when the app starts). Development builds and production
builds use `saelis://auth/callback`. No other dashboard changes are needed — email templates,
providers, and the web redirect URLs stay as they are.

### Testing procedure

Automated: `npm run mobile:test` covers auth-state transitions, route protection, session
restoration, expired sessions, sign-out, and error mapping (pure core, no library mocking).

Manual, on a simulator or device with `.env` filled in:

1. Cold start signed out → launch state, then sign-in screen (no flash of the app).
2. Sign in with a real web account → lands on Home; Settings shows the account email (same
   account as the web).
3. Kill and relaunch the app → session restores straight into the app.
4. Sign out from Settings → returned to sign-in; relaunch stays signed out.
5. Sign up with a new email → "confirmation link" state; open the emailed link on the same
   device → app opens via `saelis://auth/callback` and lands signed in.
6. Forgot password → request link → open it on the same device → "Choose a new password" →
   save → still signed in; sign out and back in with the new password.
7. Wrong password → calm inline error; sign-in button disabled while pending.

## Live conversation

### Architecture

One backend, two clients. The mobile app talks to the **existing** web conversation endpoint —
there is no separate mobile AI backend, and the mobile client never calls OpenAI or holds any
model credentials. The Saelis voice, safety pipeline, memory policy, rate limits, and analytics
all remain centralized server-side; the mobile client sends only the structured request the
backend already supports (`message`, `conversationId`, `requestId`).

```text
apps/mobile/src/lib/
  api/sse.ts                 incremental SSE decoder (pure, chunk-boundary safe)
  api/client.ts              typed API client: bearer attachment, 401 refresh-and-retry,
                             streaming, cancellation, connect/idle timeouts, structured errors
  api/saelis.ts              wire-up: expo/fetch + Supabase token + EXPO_PUBLIC_SAELIS_API_URL
  conversation/store.ts      pure state machine: send/stream/retry/cancel, duplicate-send
                             prevention, partial-text preservation, deterministic ordering
  conversation/history.ts    conversation list + turns, read via RLS with the user's own JWT
  conversation/provider.tsx  React context for the (app) group; restores the most recent
                             conversation after relaunch (history lives server-side only)
src/app/(app)/(tabs)/conversation.tsx   the live chat screen
src/app/(app)/conversations.tsx         history: pick a conversation or start fresh
```

### Backend endpoint

`POST /api/companion/stream` (SSE: `start` → `delta`* → `complete` | `error`). One server
change was made for mobile: both companion routes now resolve identity through
`src/lib/supabase/request-auth.ts` — a verified `Authorization: Bearer <access token>` when
present (mobile), otherwise the existing cookie session (web, unchanged). The bearer token is
verified against Supabase Auth before any data access, and the resulting client forwards the
same user JWT on every query, so RLS own-row policies hold exactly as on the web. History reads
(`conversations`, `conversation_turns`) go straight to Supabase under RLS — no new endpoints.

### Streaming behavior

- Deltas render into the assistant bubble as they arrive; the final `complete` message is
  authoritative (server-side plan enforcement may adjust text).
- The server persists **nothing** unless the stream completes — so failed or cancelled
  exchanges keep their partial text on screen, clearly marked "not saved", and retry re-sends
  with a fresh `requestId` (completed ids are remembered server-side; reuse would be rejected).
- Duplicate sends are refused while a generation is in flight (client) and by the one-active-
  generation guard (server). Blank submissions are refused.
- Cancel (stop button) aborts the fetch; the server's abort handling saves nothing.
- Timeouts: 20s to first byte, 45s idle gap between chunks — both surface calm, retryable
  errors; network failures show connection-check copy with retry.

### Manual test procedure

With the web app running (`npm run dev`) and `apps/mobile/.env` filled in — including
`EXPO_PUBLIC_SAELIS_API_URL` (simulator: `http://localhost:3000`; physical device: your
machine's LAN IP, e.g. `http://192.168.x.x:3000`):

1. Sign in → Conversation tab shows the empty state (or your most recent conversation).
2. Send a message → thinking indicator, then streamed text; message pair persists.
3. Kill and relaunch the app → the same conversation is restored from the server.
4. History (clock icon) → past conversations listed; tap one → its turns load in order;
   "Start a new conversation" → empty composer, next message creates a new conversation
   (visible on the web too — same account).
5. Send, then tap stop mid-stream → partial text stays, marked "Stopped — not saved"; retry
   regenerates without duplicating anything.
6. Stop the web dev server and send → calm connection error, user message marked "Not sent";
   restart the server, tap "Try again" → succeeds, exactly one copy of the message.
7. Airplane mode → same failed/retry path; long-press a message → copied (light haptic).

### Known limitations

- The web dev server must be reachable from the device (LAN IP for physical devices).
- Rate limiting and idempotency are in-memory single-instance on the server (existing,
  documented limitation — unchanged by this sprint).
- Conversation titles are not auto-generated (the list falls back to dates); no offline queue
  (messages fail calmly and can be retried); no delete-conversation on mobile yet
  (privacy tools remain on the web).
- `packages/shared` mirrors the web contracts (stream events, error shape, request schemas);
  the web still imports its own copies — rewiring web imports through the workspace package
  needs a `transpilePackages` change and was deliberately left out of this sprint.

## Companion experience (Sprint 4)

### Conversational constitution (server-only)

The Saelis voice lives exclusively in `src/lib/light/constitution.ts` +
`src/lib/light/response-context.ts` on the server — the mobile client contains zero personality
or prompt text. Sprint 4 added: an inviolable no-attachment rule (never "I miss you", streak or
guilt language), a natural-voice rule (contractions, concise, style-matching, no formulaic
restating, banned robotic phrases), listen-before-solving (one question max, the
"advice or talk it through?" clarifier, no auto-lists for emotional disclosures), measured
warmth, and seven deterministic contextual modes (everyday, emotional support, practical
planning, wellness coaching, accountability, celebration, grief/distress) selected from the
existing understanding pipeline and never shown to users. All existing safety, crisis, privacy,
and memory-consent rules are unchanged and covered by tests
(`src/lib/light/companion-voice.test.ts`).

### Push notifications

- **Strictly opt-in.** The OS permission prompt appears only after the explicit
  "Turn on notifications" tap on the in-app explainer (`(app)/notification-settings`).
- **Data** (migration `00010_companion_notifications.sql`): `push_tokens` and
  `companion_notification_preferences` (own-row RLS), `notification_deliveries`
  (deny-by-default RLS, server-only operational metadata + idempotency key — never bodies).
- **Server**: bearer-authenticated `/api/notifications/tokens` (POST register/replace, DELETE),
  `/api/notifications/preferences` (GET/PUT), `/api/notifications/test` (POST); delivery via
  `GET /api/cron/notifications` (CRON_SECRET, constant-time check, idempotent, Expo push API
  server-side; POST delegates to the same secured handler for local testing).
- **Beta policy** (pure, tested `src/lib/notifications/policy.ts`): max ONE proactive
  notification per user per day (user reminders excluded), never during quiet hours,
  frequency gating (daily / few per week / weekly), 75-minute send window after the preferred
  local time, timezone-aware. Copy comes only from the tested catalog
  (`src/lib/notifications/copy.ts`) — no guilt/streak/attachment language, private previews by
  default ("Saelis has a gentle reminder for you.").
- **Deep links**: notification taps open known internal paths only (`/conversation`, `/`,
  `/notification-settings`) via the existing `saelis://` scheme.
- **Lifecycle**: sign-out removes this device's token; account deletion cascades via FK;
  `DeviceNotRegistered` revokes tokens server-side; re-registration upserts by token.

**Vercel cron**: `vercel.json` (checked in) schedules `/api/cron/notifications` hourly —
Vercel Cron invokes it with **GET** and automatically sends
`Authorization: Bearer $CRON_SECRET` when the `CRON_SECRET` environment variable is set on the
project. Nothing runs until that variable is configured. For deliberate local testing:
`curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/notifications`.

### Onboarding and starters

Six brief, skippable cards (`(app)/onboarding.tsx`) shown once (secure-store flag; replayable
from Settings): talk naturally, advice-or-support, wellness goals, memory control,
notifications/privacy, and the AI-companion boundary (with 911/988). Conversation starters
appear on the empty conversation state and submit through the ordinary stream flow.

### Memory controls

`(app)/memory-settings.tsx` — calm, transparent, on the existing `companion_memories` +
`user_privacy_settings` architecture (no new tables): companion-memory master switch, preferred
name, "ask Saelis to remember something" (explicit → active + approved, `shared-context`),
saved-memory list with per-item delete and clear-all (permanent, matching web policy), and a
temporary-conversation toggle. Temporary mode sends `temporary: true` on the stream request; the
server then disables adaptation writes and strips any memory proposal — nothing new can be
remembered from that session. Conversation history is separate from companion memory and is
unchanged.

## Environment variables

Defined in `apps/mobile/.env.example`, validated with zod in `apps/mobile/src/lib/env.ts`
(empty placeholders are treated as absent; features that need a value call `requireEnv`):

| Variable                               | Purpose                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `EXPO_PUBLIC_SUPABASE_URL`             | Supabase project URL — **required for auth**                       |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key — **required for auth** (RLS)             |
| `EXPO_PUBLIC_SAELIS_API_URL`           | Base URL of the Saelis web app/API — **required for conversation** |

Use the **same** URL and publishable key as the web app's `NEXT_PUBLIC_*` values — that is what
makes mobile sign-ins land in the existing account and data.

Only `EXPO_PUBLIC_*` values may reach the mobile bundle. OpenAI and Supabase **secret** keys are
server-only and must never appear in app config, env files, or code here.

## Commands (from the repo root)

| Command                       | What it does                      |
| ----------------------------- | --------------------------------- |
| `npm run mobile:start`        | Expo dev server                   |
| `npm run mobile:ios`          | Dev server + iOS simulator        |
| `npm run mobile:android`      | Dev server + Android emulator     |
| `npm run mobile:test`         | Vitest (auth core unit tests)     |
| `npm run mobile:typecheck`    | `tsc --noEmit` for the app        |
| `npm run mobile:lint`         | `expo lint` (ESLint, expo config) |
| `npm run mobile:format`       | Prettier write                    |
| `npm run mobile:format:check` | Prettier check                    |

Web commands (`npm run dev/build/test/lint/typecheck/format`) are unchanged.

## What remains (deliberately out of scope so far)

- Push notifications, biometric unlock, voice input, offline message queuing, conversation
  deletion/privacy tools on mobile, EAS native builds, TestFlight / Play distribution, and
  moving the web app into `apps/web`.
