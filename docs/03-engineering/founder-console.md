# Founder Console

`/founder` — _"Steward the experience without intruding on the people who trust it."_

**Authorization.** `app_roles` (founder | admin | support) with RLS: users may read only their own
roles, and no insert/update/delete policy exists — assignment is exclusively a privileged manual
database action. The page verifies the role **server-side** (middleware alone is never
sufficient); unauthorized visitors receive a 404 and no founder data is ever sent to their
client. No email or user ID is hardcoded anywhere.

**Can display:** app version, provider mode, configuration presence, feature flags, and aggregate
counts (quality, safety, memory stewardship, feedback) sourced from narrowly scoped
SECURITY DEFINER functions that check `is_founder()`, pin `search_path`, and select counts only.

**Can never display:** user messages, assistant messages, memory content, names, emails, profile
details, raw records, tokens, full user identifiers, or event narratives. There is no user
search, no conversation browsing, no per-person drill-down — by page design and by database
policy. Founder role grants no bypass of user-data RLS.

**Manual founder setup (one time):**

1. Supabase Dashboard → Authentication → find your user's UUID.
2. SQL editor: `insert into public.app_roles (user_id, role) values ('<your-user-uuid>', 'founder');`
3. Verify: `select * from public.app_roles;`
4. Sign out and back in, then open `/founder`.

Never commit the UUID; never build role assignment into the UI.
