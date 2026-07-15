# Privacy-Safe Telemetry

`stewardship_events` records **aggregate-only, content-free** events. The table schema is the
allowlist: event type (13 fixed values), provider, model, latency bucket, support mode, safety
level, error category, memory kind, feedback category, app version, timestamp. There is **no
freeform metadata column**, so arbitrary data cannot be attached even by mistake.

Never recorded: message text, memory text, preferred names, emails, IPs, precise location,
prompts, responses, or conversation IDs. `user_id` exists solely for RLS ownership and cascade
deletion; founder-facing surfaces receive only counts via the security-definer aggregates.

**Opt-in.** Events are written only when the user's existing "product analytics" privacy setting
is on (default off); feedback clicks succeed silently either way. No third-party analytics exist.
Console telemetry (src/lib/telemetry.ts) remains a separate, content-free operational log.
