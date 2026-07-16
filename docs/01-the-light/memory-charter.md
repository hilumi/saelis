# The Memory Charter

Memory is a privilege the user grants — never a capability Saelis exercises. This charter defines
the classes of memory, their lifecycle, and the lines that are never crossed. The enforcing code
lives in `src/lib/light/memory-policy.ts`, the schema in `supabase/migrations`, and the approval
flow in the application's `approveProposedMemory` action.

## Memory classes

### 1. Passing Cloud

Context that exists only inside the current request: the message, recent turns, today's arrival.
Used to respond well, then gone. **Not retained** beyond what conversation-history settings
already govern. _(Maps to: the LightContext — never written anywhere by the engine.)_

### 2. Gentle Breeze — _future capability_

Short-lived context that may expire automatically ("this week is finals week"). Not implemented;
when built, it will be proposed and approved like any memory and will visibly expire.

### 3. Constellation — _implemented (v0.5)_

A user-approved meaningful memory: a sister's name, a dog, a hope. Always visible to the user,
always removable. _(Maps to: `companion_memories` with `status='active', user_approved=true`.)_

### 4. North Star — _implemented (v0.5)_

An explicitly approved core preference or identity detail — the highest-sensitivity class, e.g.
faith preference. **Never inferred silently.** _(Maps to: `companion_profiles` fields the user
sets directly, e.g. `faith_preference`; and explicitly approved identity-level memories.)_

These conceptual classes map onto the existing database model without schema changes.

## Lifecycle

- **Proposal.** The companion may propose one memory when policy permits. The exact approval
  language is: **"Would you like me to remember that?"**
- **User approval.** The only doorway. No approval, no memory. The interface must always make
  clear: _what_ will be remembered, _why it may help_, and _how to remove it_.
- **Active memory.** Approved memories are supplied to the companion (unless memory is disabled)
  and are listed for review.
- **Rejected memory.** A declined proposal is recorded as rejected and is never supplied to the
  model, and the same fact is not re-proposed.
- **Deleted memory.** Deletion is permanent (MVP policy; no legal retention applies). Deleted
  memories are never supplied to the model.
- **Expiration.** Reserved for Gentle Breeze (future); expiry will be visible, never silent.
- **Review.** Implemented: the Memory Center (`/settings/memories`) lists every memory with
  search, filter, sort, and per-item edit/reclassify/delete; Constellations shows them in the sky.
- **Editing.** Users may re-state a memory; the old one is deleted, the new one approved fresh.
- **Export.** Implemented: user-initiated JSON export containing no internal identifiers.
- **Deletion.** One step, immediate, no persuasion.

## Sensitive information — never automatically stored

The following are never stored automatically, regardless of phrasing, and are rejected as memory
categories even when a proposal slips through (`PROHIBITED_MEMORY_CATEGORIES`):

- Diagnosis or medical condition
- Trauma history
- Sexuality
- Political belief
- Religious identity
- Precise location
- Financial account data
- Authentication secrets
- Private relationship details
- Inferred protected characteristics

**Faith preference** may be stored only when the user explicitly selects it in companion settings
— never harvested from conversation.

## Adaptive preferences (v0.7 — a class of their own)

Low-risk communication preferences ("prefers shorter answers", "appreciates direct feedback",
"no emojis") are NOT memories: they hold no personal facts, only how Saelis should speak. They
follow their own charter (`docs/03-engineering/adaptive-preferences.md`):

- Learned from **explicit statements only** in this milestone; every observation produces a
  visible notice.
- Keys come from a closed allowlist — no sensitive category can exist by construction.
- Confidence is deterministic, decays without support, and only ever rises through bounded
  server-side policy — never through provider output.
- All of them are visible, adjustable, pausable, and erasable in Settings → "How we communicate".
- **Enduring understanding candidates** (facts, values, relationships, life experiences) remain
  governed by this charter's proposal-and-approval flow. Nothing is ever silently promoted from
  adaptation to memory.

Pattern hypotheses similarly store only content-free evidence summaries — never conversation
text — and are reviewable, rejectable, and expirable (`docs/01-the-light/pattern-awareness.md`).

## Additional protections

- No memory proposal in or near a crisis exchange (safety level ≠ none).
- No proposal when understanding confidence is low — Saelis does not guess at what matters to you.
- No repeated proposals for a fact already approved or already declined.
- The Light Engine never writes to the database; only the user-approval flow persists memories.
- Companion memory can be disabled entirely in privacy settings; when disabled, no memories are
  supplied and none are proposed.
