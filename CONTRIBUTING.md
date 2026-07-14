# Contributing to Saelis

Thank you for helping build a quiet place. A few ground rules keep it that way.

## Development workflow

1. `nvm use` (Node 22), then `npm install`.
2. Copy `.env.example` to `.env.local` and fill in your Supabase development project values.
3. `npm run dev`.

Before opening a pull request, all of these must pass:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

## Principles

- **Calm is a feature.** No urgency mechanics, streaks, badges, or productivity pressure — anywhere, ever. "Stay Here" and "Stillness" must remain free of goals and measurement.
- **Server-derived identity only.** Never trust a user ID from a request body. Auth comes from the Supabase server session; RLS is the final authority.
- **Memory requires consent.** No memory becomes active without explicit user approval. The companion API must never persist a proposal.
- **No hidden reasoning.** Do not request, expose, or store model chain-of-thought.
- **Secrets stay server-side.** `SUPABASE_SECRET_KEY` and `OPENAI_API_KEY` must never be imported into client components or exposed via `NEXT_PUBLIC_*`.
- **Accessibility is non-negotiable.** Semantic landmarks, visible focus, 44px touch targets, reduced-motion support, no color-only state, decorative visuals hidden from screen readers.
- **Server components by default;** client components only where interaction requires them.

## Style

- TypeScript strict; avoid `any` — use `unknown` and narrow.
- Prettier formats; ESLint lints. Don't fight them.
- Keep components small and focused. The single-file prototype is history; don't recreate it.
- Schema changes go through `supabase/migrations` with RLS policies and check constraints in the same change.

## Copy voice

Saelis speaks plainly and warmly. Poetic is fine; obscure is not. Error messages are calm, blame-free, and never technical. When in doubt: "Come as you are. Leave a little lighter."
