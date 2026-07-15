# Memory Stewardship Architecture

**Model.** `companion_memories` gains `kind` ('constellation' | 'north-star'; `garden-seed` and
`reflection` are documented future values, not activated), `title`, `reason`, `position_seed`,
`last_used_at`, `use_count` (reserved; not written this milestone). Check constraints enforce
kinds, lengths, non-negative counts, and active-requires-approval. Coordinates are never stored —
`assignMemoryStars` (src/lib/constellations/assign.ts) derives stable placement from the memory
seed with deterministic collision probing inside a safe visual zone.

**Consent flow (unchanged).** Propose → user approves (optionally edits, explicitly selects
kind) → active. The API never persists a proposal; `approveProposedMemory` and the Memory Center
actions re-validate ownership (server session + RLS), prohibited categories, and secret material.

**Usage transparency.** When approved memories accompany a successful provider request, the
stream route stamps `last_used_at` and the UI may show "Saelis used one memory you approved."
Never engagement data, never a score.

**Deletion.** Individual and clear-all are permanent; no application-accessible archive exists.
