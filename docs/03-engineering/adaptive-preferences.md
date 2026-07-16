# Adaptive Preferences

The engineering contract for low-risk communication adaptation.
**Saelis may adapt freely, infer cautiously, and remember transparently.**

## Three layers

1. **Current context** — the present conversation only. Style mirroring, posture, humor and
   challenge windows. Nothing persists.
2. **Adaptive preferences** — low-risk communication preferences that may update gradually. All
   of them are visible in Settings → "How we communicate", editable, resettable, and they weaken
   (time decay) when evidence stops supporting them.
3. **Enduring understanding candidates** — personal facts, values, relationships, life
   experiences. These belong to the existing memory-proposal flow (Memory Charter): reviewable
   before becoming durable, and NEVER silently promoted.

## The allowlist is the mechanism

The only keys that can exist — enforced in TypeScript (`ADAPTIVE_PREFERENCE_KEYS`) and again by a
database check constraint:

`prefers-concise-when-overwhelmed`, `appreciates-direct-challenge`, `enjoys-playful-humor`,
`prefers-examples`, `prefers-options-before-recommendation`, `prefers-questions-before-advice`,
`likes-bullet-points`, `thinks-aloud`, `wants-celebration-energy-matched`, `prefers-no-emojis`,
`shared-phrase`, `pattern-theme-opt-out`.

There is deliberately no key under which childhood experiences, trauma, diagnoses, faith,
politics, sexuality, health, relationship narratives, finances, precise location, or any inferred
protected trait could be stored. `value` is a size-bounded jsonb object (≤512 bytes) — no
freeform metadata exists.

## Confidence model — transparent and deterministic

Confidence lives in [0, 1] (database-enforced) and moves only by fixed rules:

| Event                                               | Δ                                                         |
| --------------------------------------------------- | --------------------------------------------------------- |
| Repeated evidence                                   | +0.15                                                     |
| Explicit confirmation / explicit statement          | +0.30                                                     |
| Contradictory evidence                              | −0.25                                                     |
| User correction ("Adjust", "that joke didn't land") | −0.40                                                     |
| Time decay                                          | −0.10 per 30 days without support (computed at read time) |

Thresholds: **< 0.35** — no persistent adaptation; **0.35–0.7** — temporary, current-context
adaptation only; **≥ 0.7** — eligible as a reviewable adaptive preference. Raw numbers are never
shown to ordinary users.

## Write paths

- Confidence and evidence counts RISE only through `record_adaptive_observation()` — a
  SECURITY DEFINER function scoped to `auth.uid()`, with fixed increments.
- Ordinary authenticated updates are trigger-guarded: status changes (keep/pause/reset) and
  confidence decreases only. Clients — including a compromised one — cannot raise confidence,
  rewrite keys/values, or touch another user's rows (RLS).
- In v0.7, observations come exclusively from EXPLICIT user statements ("be more direct",
  "stop using emojis", "keep it short", "use bullet points", "show me options"). Nothing is
  inferred from tone or mood. Every recorded observation produces a visible
  `adaptationNotice` in the response, and the provider's own `adaptationNotice` output is always
  discarded.
- Nothing is recorded from any exchange with a non-`none` safety level.

## Consent alignment

Adaptation runs only when BOTH the companion setting "Allow Saelis to adapt how it communicates
with me" (default on, as before) AND the privacy setting "companion memory" allow it. Disabling
either stops reads and writes. "Clear everything Saelis has adapted" deletes all adaptation rows.
