# Deployment Checklist — Web Beta (Vercel + Supabase)

A concise, ordered runbook. No native wrapper, PWA service worker, analytics vendor, waitlist,
or monitoring vendor ships in this milestone.

## 1. Supabase

- [ ] Create (or reuse) the production project.
- [ ] Apply ALL migrations in order: `supabase/migrations/00001` → `00006`
      (`npx supabase link --project-ref <ref> && npx supabase db push`).
- [ ] Verify RLS is enabled on every user-owned table (Dashboard → Table editor → each table).
- [ ] Auth → URL Configuration: Site URL = production `APP_URL`; redirect URLs include
      `https://<domain>/auth/callback` (plus preview/localhost patterns as needed).
- [ ] Auth → email confirmations enabled; SMTP or default sender verified.
- [ ] Assign the founder role manually (SQL editor): insert into `app_roles` — roles can never
      be self-assigned from the app.

## 2. Vercel

- [ ] Import the repository (framework preset: Next.js; defaults fine).
- [ ] Environment variables (Production AND Preview):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY` (server only — enables account deletion)
  - `COMPANION_PROVIDER` (`openai` for the live beta; `mock` for previews if preferred)
  - `OPENAI_API_KEY`, `OPENAI_MODEL` (when provider is `openai`)
  - `OPENAI_STORE_RESPONSES=false` (keep provider-side storage off)
  - `APP_URL` (canonical production URL)
- [ ] Confirm no secret uses a `NEXT_PUBLIC_` prefix.
- [ ] Deploy a preview first; production only with explicit authorization.

## 3. Post-deploy verification

- [ ] `GET /api/health` returns `status: "ok"`, the expected provider, and
      `supabaseConfigured: true` / `openAIConfigured: true` (presence flags only — it never
      exposes values).
- [ ] Sign up a fresh account → onboarding appears once (4 screens, Skip works) → lands on
      `/home` → onboarding never reappears.
- [ ] Send one conversation message; watch streaming; confirm a calm error (not a raw one) if
      the provider key is intentionally wrong in a preview.
- [ ] `/privacy`, `/terms`, `/ai-disclosure`, `/support` load publicly; Terms and Privacy show
      the draft-pending-legal-review notice.
- [ ] Founder Console loads for the founder account only (all other accounts 404) and shows
      aggregates only.
- [ ] Mobile pass at 320 / 375 / 390 / 430 px: no horizontal scroll on Home, Conversation,
      Settings, Constellations, onboarding; composer stays above the keyboard; touch targets
      ≥ 44px.

## 4. Known launch caveats (accepted for beta)

- Legal review of Terms/Privacy is REQUIRED before public (non-beta) launch — both pages say so.
- `robots` remains `noindex` by design until public launch (src/app/layout.tsx).
- In-memory rate limiting and idempotency are per-instance; keep the Vercel deployment at a
  single region/instance profile for beta, or accept looser limits.
- The safety pre-check is a documented floor, not comprehensive crisis detection.
