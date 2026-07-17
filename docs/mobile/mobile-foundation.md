# Saelis mobile — Sprint 1 foundation

The native Saelis app: Expo / React Native with Expo Router, living beside the existing Next.js
web app in one npm workspace. This sprint delivers the shell — navigation, design language, and
shared packages — with authentication and live chat deliberately stubbed.

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
- **Session (`src/lib/session.tsx`).** In-memory placeholder with the final shape
  (`loading | signedOut | signedIn`, `signIn`, `signOut`). Sprint 2 swaps the internals for
  Supabase auth without touching screens.
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
2. Copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill in values (all optional in
   Sprint 1).
3. Start: `npm run mobile:start`, then press `i` (iOS simulator), `a` (Android emulator), or scan
   the QR code with Expo Go.

## Environment variables

Defined in `apps/mobile/.env.example`, validated with zod in `apps/mobile/src/lib/env.ts`
(empty placeholders are treated as absent; features that need a value call `requireEnv`):

| Variable                               | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`             | Supabase project URL (client-safe)          |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (client-safe, RLS) |
| `EXPO_PUBLIC_SAELIS_API_URL`           | Base URL of the Saelis web API              |

Only `EXPO_PUBLIC_*` values may reach the mobile bundle. OpenAI and Supabase **secret** keys are
server-only and must never appear in app config, env files, or code here.

## Commands (from the repo root)

| Command                       | What it does                      |
| ----------------------------- | --------------------------------- |
| `npm run mobile:start`        | Expo dev server                   |
| `npm run mobile:ios`          | Dev server + iOS simulator        |
| `npm run mobile:android`      | Dev server + Android emulator     |
| `npm run mobile:typecheck`    | `tsc --noEmit` for the app        |
| `npm run mobile:lint`         | `expo lint` (ESLint, expo config) |
| `npm run mobile:format`       | Prettier write                    |
| `npm run mobile:format:check` | Prettier check                    |

Web commands (`npm run dev/build/test/lint/typecheck/format`) are unchanged.

## What remains (deliberately out of scope for Sprint 1)

- **Authentication.** Replace the placeholder session with Supabase auth: PKCE email flow,
  secure token storage (`expo-secure-store`), session refresh, and real sign-out. The gate in
  `(app)/_layout.tsx` and the `useSession` shape are already final.
- **Live chat.** Connect the conversation screen to `POST /api/companion/stream` using the
  request schemas already in `@saelis/shared` (client-generated `requestId`, no user id in the
  payload — identity comes from the server session). Enable the composer's send button, render
  streamed turns, handle interruption/reconnect.
- Later: push notifications, EAS native builds, TestFlight / Play distribution, and moving the
  web app into `apps/web`.
