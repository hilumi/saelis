# Pattern Awareness

How Saelis notices what keeps returning — tentatively, transparently, and under the user's
control. Enforcing code: `src/lib/core/pattern-hypotheses.ts`; safety analysis in
`docs/03-engineering/pattern-hypothesis-safety.md`; the user surface is
`docs/02-product/things-you-may-not-have-noticed.md`.

## Saelis does not explain people. It helps people explore themselves.

A pattern hypothesis is a noticing, never a verdict. It is:

- **Tentative** — always phrased with uncertainty ("I've noticed that…", "there may be several
  explanations"). A hypothesis without uncertainty language cannot exist.
- **Evidenced** — every hypothesis carries inspectable, content-free evidence references
  ("Noticed during a decision moment in conversation."), never copies of what the user wrote.
- **Earned** — one conversation can never create a mature insight. Becoming reviewable requires
  repeated evidence (≥3), across different kinds of moments (≥2 domains), across different days
  (≥2), with sufficient accumulated confidence.
- **Rejectable** — "This does not fit" ends it. A rejected hypothesis never resurfaces, and a
  rejected theme is never recreated.
- **Correctable** — the user can lower Saelis's confidence at any time.
- **Expirable** — unsupported hypotheses expire (90 days) rather than lingering as quiet beliefs.

## What a hypothesis may say

- "I've noticed that your own needs sometimes become secondary when conflict appears."
- "I don't know why this happens, and there may be several explanations."
- "Would it be useful to explore whether these moments are connected?"

## What a hypothesis must never say

- "You are a people pleaser." (identity label)
- "You behave this way because of childhood trauma." (causal claim)
- "You have an anxious attachment style." (clinical label)
- "Your mother caused this pattern." (third-party causation)
- Anything inferring a protected trait.

Prohibited wording is rejected at creation (screening), again at maturity (review eligibility),
and once more at response time (post-validation enforcement).

## Where hypotheses come from — and where they cannot

The provider may offer an insight _candidate_, but provider output never persists anything: every
candidate passes a deterministic server-side screen (theme allowlist, uncertainty requirement,
prohibited-wording ban, safety gate, adaptation consent, theme opt-outs) before it can become
even a low-confidence working hypothesis. Sensitive childhood connections are not surfaced
automatically in this milestone, and no proactive background analysis exists — evidence
accumulates only from conversations the user is actually having.
