# Pattern Hypothesis Safety

The safety analysis for pattern awareness (v0.7). Product behavior:
`docs/01-the-light/pattern-awareness.md`. Code: `src/lib/core/pattern-hypotheses.ts`,
migration `00005`.

## Threat model

Pattern inference is the most sensitive capability Saelis has. Failure modes considered:

1. **Psychological profiling** — the system quietly building a theory of who the user is.
2. **False authority** — a guess presented as understanding ("you have anxious attachment").
3. **Causal storytelling** — trauma/childhood narratives invented by a language model.
4. **Protected-trait inference** — patterns keyed to identity.
5. **Shadow transcripts** — "evidence" that re-stores user content outside conversation history.
6. **Provider-driven persistence** — model output writing beliefs directly to the database.
7. **Founder visibility** — anyone browsing an individual's patterns.
8. **Un-rejectable beliefs** — insights that return after the user said no.

## Mitigations, layer by layer

**Creation.** A provider `insightCandidate` is only ever a suggestion. The deterministic screen
(`screenHypothesisCandidate`) requires: adaptation enabled, safety level `none`, an allowlisted
theme, size bounds, uncertainty language present, no prohibited wording (diagnoses, causal
claims, attachment labels, identity labels, protected traits, "you always/never"), and no user
opt-out for the theme. Anything failing any gate disappears. Accepted candidates start as
low-confidence (0.2) _working_ hypotheses — invisible to the user surface.

**Evidence.** `pattern_evidence.evidence_summary` is a content-free description chosen by the
application ("Noticed during a decision moment in conversation.") and is length-capped (200) at
the database. User text is never copied into adaptation storage. Summaries are the user's to
inspect at any time ("Show me what you noticed").

**Maturity.** `isEligibleForReview` requires evidence count ≥ 3, cross-domain count ≥ 2, evidence
across ≥ 2 distinct days, confidence ≥ 0.6, valid uncertainty language, and clean wording. A
single conversation mathematically cannot produce a reviewable insight.

**Presentation.** Only mature, reviewable hypotheses reach `/insights`, phrased tentatively, with
the reason they surfaced and their evidence attached. No alerts, no badges, no scores. Sensitive
childhood connections are not surfaced automatically in this milestone.

**Response time.** Post-validation enforcement strips prohibited claims from every response and
removes insight candidates below threshold — even if every earlier layer were bypassed.

**Control.** "This does not fit" → status `rejected`; a rejected hypothesis is never selected
again, and `record_pattern_evidence()` refuses to recreate a rejected theme. "Don't look for this
pattern again" → a `pattern-theme-opt-out` preference consulted before any candidate is accepted.
Unsupported hypotheses expire after 90 days. All rows are deletable by the user.

**Database.** RLS on all three tables (owner-only). No insert/update path for evidence outside
the SECURITY DEFINER function; hypothesis updates are trigger-guarded (status changes and
confidence decreases only). Confidence bounded 0..1; counts nonnegative; themes and statuses
check-constrained. The founder's only surface is `adaptation_aggregate_counts()` — counts by
status, no content columns selected anywhere in its body.

## Honesty about limits

The screen is pattern-matching, not comprehension. It will occasionally reject valid phrasings
(acceptable) and cannot catch every harmful sentence a model could compose (why the prohibition
list is enforced again at response time, and why hypotheses remain rejectable and expirable).
This is a floor, deliberately conservative, not a claim of psychological competence.
