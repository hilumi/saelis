# Saelis mobile — foundation

The native Saelis app: Expo / React Native with Expo Router, living beside the existing Next.js
web app in one npm workspace. Sprint 1 delivered the shell — navigation, design language, and
shared packages. Sprint 2 replaced the placeholder session with real Supabase authentication
against the same project, account, and data as the web app.

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

## Environment variables

Defined in `apps/mobile/.env.example`, validated with zod in `apps/mobile/src/lib/env.ts`
(empty placeholders are treated as absent; features that need a value call `requireEnv`):

| Variable                               | Purpose                                                 |
| -------------------------------------- | ------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`             | Supabase project URL — **required for auth**            |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key — **required for auth** (RLS)  |
| `EXPO_PUBLIC_SAELIS_API_URL`           | Base URL of the Saelis web API (used in a later sprint) |

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

- **Live chat.** Connect the conversation screen to `POST /api/companion/stream` using the
  request schemas already in `@saelis/shared` (client-generated `requestId`, no user id in the
  payload — identity comes from the server session). Enable the composer's send button, render
  streamed turns, handle interruption/reconnect.
- Later: push notifications, biometric unlock, EAS native builds, TestFlight / Play
  distribution, and moving the web app into `apps/web`.
