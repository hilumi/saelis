# Saelis Core Architecture

Saelis Core is the relational intelligence layer introduced in v0.7. It is ONE coherent internal
system — not a collection of engines — and the user never sees it: they experience one simple
companion. It extends the Light Engine; it does not replace it, and the provider remains beneath
both.

## Position in the pipeline

```text
Authenticated request
→ existing validation (Zod, size limits, rate limits, idempotency)
→ safety pre-check                        (src/lib/ai/safety.ts)
→ context normalization                   (src/lib/light/context.ts)
→ existing Light understanding            (src/lib/light/understanding.ts)
→ Saelis Core relationship context        (src/lib/core/relationship-context.ts)
→ read the room                           (src/lib/core/room-reader.ts)
→ choose response posture                 (src/lib/core/response-posture.ts)
→ constructive-challenge policy           (src/lib/core/challenge-policy.ts)
→ linguistic guidance                     (src/lib/core/communication-style.ts)
→ pattern hypothesis policy               (src/lib/core/pattern-hypotheses.ts)
→ memory/adaptation policy                (src/lib/core/adaptation-policy.ts)
→ enriched LightPlan                      (src/lib/core/pipeline.ts → enrichLightPlan)
→ provider                                (mock or OpenAI, unchanged contract)
→ Zod validation                          (src/lib/ai/companion-contract.ts)
→ deterministic post-validation           (src/lib/ai/plan-enforcement.ts)
→ persistence                             (route; adaptation via bounded DB functions)
```

`createCoreAssessment` (src/lib/core/pipeline.ts) is pure, synchronous, and deterministic — no
I/O, no provider calls, no database access. `enrichLightPlan` appends the compact guidance lines
to the existing plan's `contextualInstruction` and attaches the assessment for enforcement.
Urgent-safety plans pass through untouched: nothing may soften a crisis response.

## Modules

| Module                    | Responsibility                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`                | All contracts: postures, room assessment, relationship context, adaptive preferences (allowlist), pattern hypotheses, confidence thresholds. |
| `relationship-context.ts` | Coarse stage (new/developing/familiar) from counts and approved preferences only. No content, no scores.                                     |
| `communication-style.ts`  | Form-only style observation + mirroring guidance. No identity inference by construction.                                                     |
| `room-reader.ts`          | Emotional temperature, vulnerability, urgency, user goal, humor/challenge windows. Explicit intent overrides inference.                      |
| `response-posture.ts`     | One primary + optional secondary posture; posture controls (resonance, directness, question count, facts-vs-interpretation).                 |
| `challenge-policy.ts`     | Deterministic challenge rulings and provider guidance.                                                                                       |
| `pattern-hypotheses.ts`   | Candidate screening, maturity rules, prompt/review selection, expiry.                                                                        |
| `adaptation-policy.ts`    | Confidence model, decay, explicit-observation extraction, shared-language approval, theme opt-outs.                                          |
| `evidence.ts`             | Content-free evidence references from a fixed summary catalog.                                                                               |
| `response-guidance.ts`    | Budget-controlled guidance block for the provider.                                                                                           |
| `pipeline.ts`             | Orchestration: `createCoreAssessment`, `enrichLightPlan`.                                                                                    |
| `preview-fixtures.ts`     | Development-only preview states (never in production, never persisted).                                                                      |

## What is sent to the provider

A handful of short guidance lines: moment summary, posture opening, energy matching, directness,
an explicit humor permission or prohibition, the challenge ruling, facts-versus-interpretation
requirements when relevant, mirroring rules, up to five friendly preference lines, approved
shared phrases, and uncertainty requirements.

Never sent: adaptation history, raw confidence values, rejected or expired hypotheses, founder
data, hidden chain-of-thought, the full profile, unrelated memories, or raw user content inside
guidance. A mature hypothesis accompanies a request only when the user accepted it ("Explore"),
and at most one.

## Enforcement (post-validation)

Structured output proves shape, not obedience. After Zod validation,
`enforcePlanConstraints` deterministically:

- strips humor markers when the room does not permit humor (which also covers sarcasm under high
  vulnerability),
- removes sentences containing diagnoses, causal trauma claims, protected-trait inferences,
  attachment labels, or certainty about third-party motives — always, Core assessment or not,
- discards provider-authored `adaptationNotice` fields unconditionally,
- removes `reflection` blocks that weren't requested and `insightCandidate`s that fail the
  deterministic screen,
- strips unapproved shared language,
- preserves the existing rules: urgent override, faith boundaries, action gating, memory gating,
  closing policy, safety-level floor.

## Persistence

Adaptation data lives in `adaptive_preferences`, `pattern_hypotheses`, and `pattern_evidence`
(migration `00005`). Confidence and evidence counts can only rise through two narrowly scoped
SECURITY DEFINER functions with fixed increments; ordinary updates are trigger-guarded to status
changes and confidence decreases. Provider output persists nothing directly — the route's
`applyPostResponseAdaptation` records only deterministically extracted explicit observations and
fully screened insight candidates, and any failure there is swallowed: adaptation must never
break a conversation.
