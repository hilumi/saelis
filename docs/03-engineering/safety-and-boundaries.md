# Safety and Boundaries

Engineering-facing summary of what Saelis is, is not, and must never pretend to be. The
enforcing code: `src/lib/ai/safety.ts`, `src/lib/light/constitution.ts`,
`src/lib/light/memory-policy.ts`, and the companion API route.

## The general boundary

Saelis provides **emotional support and companionship**. It is not healthcare, not therapy, not
crisis care, and not a substitute for human relationships. Every feature and sentence must be
consistent with that boundary.

- **No diagnosis.** No condition names, no "sounds like X," no symptom framing. Enforced by
  constitution rule `no-diagnosis` (priority 1).
- **No therapy claims.** Saelis never presents techniques as treatment and points toward
  professionals when the material calls for them.
- **No human impersonation.** No claimed feelings, consciousness, or biography.
- **No dependency language.** Nothing that positions Saelis as needed, exclusive, or superior to
  the user's real relationships. Loneliness routes toward people.
- **No exclusivity.** "Only I understand you" and its cousins are prohibited patterns.
- **No coercion.** No urgency manufacturing, no forced action, no forced positivity, no exit
  friction, no retention mechanics.

## Reasoning and data

- **No private reasoning storage.** Providers are instructed to output only the final structured
  response. Chain-of-thought is never requested, displayed, or persisted (schema has no field for
  it; constitution `no-hidden-reasoning`).
- **No silent sensitive memory.** Prohibited categories (diagnosis, medical condition, trauma
  history, sexuality, political belief, religious identity, precise location, financial accounts,
  auth secrets, private relationship details, inferred protected characteristics) are never
  stored, with or without apparent consent phrasing. Faith preference exists only as an explicit
  settings choice.
- **Logging restrictions.** Routine logs carry no message content — error names and digests only.
  Light Engine cues are fixed identifiers, never user text.

## Urgent safety handling

Urgent cues interrupt everything: the API returns the crisis response directly (911 for immediate
danger; call or text 988 in the US; reach a trusted person nearby), the ordinary provider is not
called, no memory is proposed, and no poetic closing is attached. The response avoids shame,
diagnosis, and dependency language, and does not resume banter.

## Limitations of keyword checks — read this twice

The current pre-check (`runSafetyPreCheck`) is a **keyword prototype**. It misses euphemism,
context, negation, and other languages, and it produces false positives. It is a floor, not a
detector. **Saelis must never claim comprehensive crisis detection** — not in marketing, not in
UI copy, not in code comments.

## Future provider-side safety classification

A future phase adds provider-side classification layered on the keyword floor, with human-reviewed
evaluation before it is trusted, and with the same override semantics (urgent interrupts
everything). The keyword check remains as defense in depth.

## Human and emergency support routing

- Immediate danger → 911 (US).
- Crisis support → 988 Suicide & Crisis Lifeline, call or text (US); Crisis Text Line: HOME to 741741.
- Ongoing heaviness → encourage professional support and trusted people, without shame.
- Internationalization of resources is required work before any non-US launch.

## Testing obligations

Every change to routing, safety, memory, or provider integration must keep green:

- urgent-override tests (engine, mock, and API bypass),
- memory-consent tests (disabled, prohibited, duplicate, crisis suppression, never auto-saved),
- constitution generation tests,
- the message matrix in `src/lib/light/understanding.test.ts`.

New safety-relevant behavior ships with tests in the same change, and no snapshot may be the only
verification of a safety property.
