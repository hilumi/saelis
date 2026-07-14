# Company Principles — The Eight Pillars

These pillars govern product, engineering, and copy decisions. Each includes a review question to
be asked of any new feature, screen, metric, or sentence.

## 1. Presence over performance

**Meaning.** Being fully received matters more than being impressively answered.

**Product implications.** Receiving states (listening, witnessing, presence) are first-class
features, not loading states. "Stay Here" and "Stillness" ship with no goals attached.

**Engineering implications.** The Light Engine routes to witness/presence before any action mode.
Response latency work never introduces artificial urgency (typing theatrics, countdowns).

**Violations.** Answering a vent with a plan. Filling silence with content. Optimizing for
response "impressiveness" scores.

**Review question.** _Did we receive this person before we responded to them?_

## 2. Trust before intelligence

**Meaning.** A trustworthy companion of modest intelligence beats a brilliant one that cannot be
trusted.

**Product implications.** Privacy controls are visible, plain-language, and honored immediately.
Saelis admits uncertainty rather than performing confidence.

**Engineering implications.** RLS on every table, consent-gated memory, no content in logs, no
hidden reasoning stored. Provider claims are validated against the contract before display.

**Violations.** Silent data collection. Overstating understanding. Shipping intelligence features
ahead of their consent model.

**Review question.** _Would we be comfortable if the user watched exactly what this does with
their words?_

## 3. Beauty serves calm

**Meaning.** Every visual choice exists to lower the shoulders, not to dazzle.

**Product implications.** Slow motion, soft palettes, reduced-motion parity. Nothing blinks,
counts down, or demands.

**Engineering implications.** Animations use transform/opacity, respect `prefers-reduced-motion`,
and are simplified on small devices. Performance budgets protect the calm.

**Violations.** Attention-grabbing effects. Celebration that turns into confetti pressure. Visual
noise justified as "delight."

**Review question.** _Does this create calm, or does it manufacture urgency?_

## 4. Memory is earned

**Meaning.** Remembering is a privilege the user grants, item by item.

**Product implications.** Every memory is proposed, approved, visible, and deletable. "Would you
like me to remember that?" is the only doorway.

**Engineering implications.** No code path persists a memory without explicit approval. Database
constraints enforce it. Prohibited categories are rejected regardless of consent phrasing.

**Violations.** Inferring facts silently. Re-proposing rejected memories. Using memory to
demonstrate cleverness.

**Review question.** _Did the user knowingly hand us this, and can they take it back in one step?_

## 5. Hope is offered, never imposed

**Meaning.** Saelis holds hope for people without requiring them to feel it.

**Product implications.** No forced reframes, no silver linings, no "at least." Encouragement
style is a user preference, including "quiet."

**Engineering implications.** The constitution prohibits forced positivity; heuristics never
route distress to cheerfulness.

**Violations.** "Everything happens for a reason." Rushing grief. Marking sad conversations as
problems to solve.

**Review question.** _Are we sitting with this person, or trying to talk them out of where they
are?_

## 6. Growth is gentle

**Meaning.** Change happens in seasons, with setbacks, at the person's own pace.

**Product implications.** One manageable step at a time. No streaks, levels, or progress
pressure. Returning after a long absence is greeted, never guilted.

**Engineering implications.** No engagement mechanics, no retention hooks, no notification
pressure. Horizon caps ambition rather than expanding it.

**Violations.** "You haven't been here in 12 days." Escalating step counts. Completion-rate
optimization.

**Review question.** _Would this still feel kind on someone's worst week?_

## 7. Silence has value

**Meaning.** Not every moment needs words, and not every message needs a long reply.

**Product implications.** Stillness is a feature. Presence mode says less on purpose. Closing
lines appear only when a moment truly concludes.

**Engineering implications.** The closing-line policy defaults to "no closing." Response length
follows user preference, and brevity is never treated as a defect.

**Violations.** Filling every response to a target length. Appending signature phrases to
everything. Treating short sessions as failures.

**Review question.** _Is this sentence for the user, or for us?_

## 8. Leave every soul a little lighter

**Meaning.** The only outcome that finally matters: leaving feels a little lighter than arriving.

**Product implications.** Every journey ends with a free exit. Goodbyes are honored, not
intercepted.

**Engineering implications.** Success metrics are qualitative (felt understood, gained clarity,
comfortable leaving) — never session length or message count.

**Violations.** Retention tricks. Exit friction. Measuring the product by how long it can hold
someone.

**Review question.** _When this person closes the app, did we make their day lighter or merely
longer?_
