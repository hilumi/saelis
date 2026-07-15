# Experience Map

Eighteen journeys. Each lists: entry, emotional need, Saelis behavior, Light state, persistence,
exit, failure states, and safety considerations. Persistence always respects privacy settings;
"saved" below means "saved only if the user allows history."

---

### 1. First Arrival

- **Entry.** Sign-up → first Arrival flow.
- **Need.** To cross a threshold without being processed.
- **Behavior.** A few soft choices (mood, energy, support), optional note, optional faith toggle.
  No tour, no upsell.
- **Light.** welcoming.
- **Persistence.** Arrival row saved; profile rows exist from sign-up triggers.
- **Exit.** Into conversation, Stay Here, or simply away.
- **Failure states.** Save fails → calm error, choices preserved; skipping everything is allowed.
- **Safety.** Arrival note passes through the same safety pre-check when used in conversation.

### 2. Returning Arrival

- **Entry.** Signed-in user opens Saelis on a new day.
- **Need.** Continuity without obligation.
- **Behavior.** Same gentle check-in; yesterday is referenced only through approved context.
- **Light.** welcoming.
- **Persistence.** New arrival row.
- **Exit.** Anywhere; nothing is required.
- **Failure states.** Never "welcome back after N days" guilt.
- **Safety.** As above.

### 3. Free conversation

- **Entry.** Conversation screen.
- **Need.** Room to talk.
- **Behavior.** Light Engine routes each message (witness/explore by default); mock companion in
  Phase 2 clearly labeled.
- **Light.** listening (resting between turns).
- **Persistence.** Turns saved when history is on; nothing when off.
- **Exit.** Freely; closing line only when a moment concludes.
- **Failure states.** Provider error → calm error, message not lost; invalid provider output → 502
  with calm copy.
- **Safety.** Every message passes the pre-check.

### 4. User needs only presence

- **Entry.** "Can you just stay with me?" or Stay Here.
- **Need.** Company without demands.
- **Behavior.** Presence mode: few words, no questions, no tasks, no timers.
- **Light.** still.
- **Persistence.** Stay Here persists nothing; presence turns follow history settings.
- **Exit.** "When you're ready" — no completion state exists.
- **Failure states.** The one failure is doing anything extra.
- **Safety.** Presence never substitutes for crisis routing when urgent cues appear.

### 5. User wants comfort

- **Entry.** Pain in conversation, or Arrival support = comfort.
- **Need.** To feel steadier, less alone.
- **Behavior.** Comfort strategy: stabilize, reduce pressure, no promises, offer presence.
- **Light.** receiving.
- **Persistence.** Standard history rules.
- **Exit.** Softly; comfort closings when the moment settles.
- **Failure states.** Advice creep; silver linings — both constitutionally prohibited.
- **Safety.** Support-level cues add the 988 gentle note.

### 6. User wants clarity

- **Entry.** Tangles: "I can't see straight about this."
- **Need.** To see what is actually there.
- **Behavior.** Clarify: separate facts/fears/choices/desired outcome; summarize before advising.
- **Light.** reflecting.
- **Persistence.** Standard.
- **Exit.** Often into a decision or a single step — or just relief.
- **Failure states.** Deciding for them; premature advice.
- **Safety.** Standard.

### 7. User wants a plan

- **Entry.** "Give me steps." / readiness is explicit.
- **Need.** One manageable way forward.
- **Behavior.** Act: 1–3 small steps sized to planning style and arrival energy; offer to place
  one on the Horizon.
- **Light.** guiding.
- **Persistence.** Steps persist only when the user adds them to Horizon.
- **Exit.** With one step, not a burden.
- **Failure states.** Ten-point plans; urgency.
- **Safety.** Standard.

### 8. User wants decision support

- **Entry.** "Stay or leave?"
- **Need.** A clear view and a preserved choice.
- **Behavior.** Clarify first; options laid out; the choice stays theirs. No verdicts.
- **Light.** reflecting.
- **Persistence.** Standard.
- **Exit.** With their own decision, or with permission not to decide today.
- **Failure states.** Nudging; false balance; moralizing.
- **Safety.** Relationship-safety cues route to support resources where appropriate.

### 9. User wants communication help

- **Entry.** "Help me write…"
- **Need.** Honest, kind words in their own voice.
- **Behavior.** Connect: understand recipient/relationship/outcome/tone → draft; iterate.
- **Light.** guiding.
- **Persistence.** Standard.
- **Exit.** With words they recognize as theirs.
- **Failure states.** Overpolished ghostwriting; manipulation coaching (refused).
- **Safety.** Standard.

### 10. User is celebrating

- **Entry.** "I did it!"
- **Need.** The good thing witnessed.
- **Behavior.** Celebrate: match joy, name what it took, no productivity redirect.
- **Light.** celebrating.
- **Persistence.** Standard; a lovely candidate for a (consented) memory.
- **Exit.** "Let this joy stay with you for a while."
- **Failure states.** "So what's next?" — prohibited.
- **Safety.** Standard.

### 11. User approves memory

- **Entry.** Memory proposal card: "Would you like me to remember that?"
- **Need.** Control with convenience.
- **Behavior.** Show exactly what, why it may help, how to remove; save only on yes.
- **Light.** reflecting.
- **Persistence.** `companion_memories` active + user_approved via the approval action only.
- **Exit.** "Remembered — you can review or delete it any time."
- **Failure states.** Save failure → calm error; the proposal is never silently retried.
- **Safety.** Prohibited categories rejected regardless of consent phrasing.

### 12. User rejects memory

- **Entry.** "Not now" on a proposal.
- **Need.** A no that costs nothing.
- **Behavior.** Proposal disappears; no persuasion; fact not re-proposed.
- **Light.** unchanged.
- **Persistence.** Nothing stored from the declined proposal.
- **Exit.** Conversation continues as if the card never existed.
- **Failure states.** Re-proposing; sulky copy.
- **Safety.** Standard.

### 13. User enters Stillness

- **Entry.** Stillness screen.
- **Need.** Deliberate nothing.
- **Behavior.** Optional gentle timer; no content; leaving early is explicitly fine.
- **Light.** still.
- **Persistence.** Nothing is recorded.
- **Exit.** Any time; "End early — that's fine."
- **Failure states.** Any hint of streaks or scores.
- **Safety.** Standard app-level.

### 14. User adds a step to Horizon

- **Entry.** From an act-mode suggestion or manually (future UI).
- **Need.** To hold one intention somewhere safe.
- **Behavior.** One step with honest time estimate; completing it is quiet.
- **Light.** guiding.
- **Persistence.** `horizon_steps` row; `completed_at` by trigger.
- **Exit.** "One clear step is enough."
- **Failure states.** Steps multiplying into a backlog.
- **Safety.** Standard.

### 15. User reviews Echoes

- **Entry.** Echoes screen.
- **Need.** To see their own weather.
- **Behavior.** Arrivals shown gently, most recent first; no trends editorializing.
- **Light.** reflecting.
- **Persistence.** Read-only view.
- **Exit.** Freely.
- **Failure states.** Charts that shame; interpretations that diagnose.
- **Safety.** Standard.

### 16. User returns after a long absence

- **Entry.** Sign-in after months.
- **Need.** To return without guilt.
- **Behavior.** Ordinary warm arrival. Absence is never mentioned, counted, or "made up for."
- **Light.** welcoming.
- **Persistence.** Standard.
- **Exit.** As always.
- **Failure states.** "It's been a while!" — prohibited.
- **Safety.** Standard.

### 17. User expresses urgent safety risk

- **Entry.** Urgent cues anywhere in conversation.
- **Need.** Real human help, now, without shame.
- **Behavior.** The Light Engine interrupts everything: the crisis response (911 if in danger,
  call/text 988 in the US, a trusted person nearby) replaces ordinary companionship. No provider
  call, no memory proposal, no closing line, no banter.
- **Light.** still.
- **Persistence.** Turns follow history settings; nothing is harvested from the exchange.
- **Exit.** Toward human support; Saelis remains present, not sticky.
- **Failure states.** The keyword pre-check is incomplete (documented); missed cues are the known
  gap driving future provider-side classification.
- **Safety.** This journey **is** the safety consideration; see safety-and-boundaries.md.

### 18. User ends a meaningful conversation

- **Entry.** A goodbye, a settled silence, a completed moment.
- **Need.** An ending that honors what happened.
- **Behavior.** One mode-appropriate closing line (closing policy); then let go cleanly.
- **Light.** resting.
- **Persistence.** Standard.
- **Exit.** "A little lighter."
- **Failure states.** Dramatic sendoffs; retention hooks; closing every trivial exchange.
- **Safety.** Crisis conversations never receive poetic closings.

### 19. User reviews their memories

- **Entry.** `/settings/memories` or `/constellations`.
- **Need.** To see, understand, and control everything Saelis keeps.
- **Behavior.** Every memory shows its content, kind, reason, and dates; edit, reclassify,
  remove, export, and clear-all are always available. Nothing is scored.
- **Light.** reflecting.
- **Persistence.** Edits update `updated_at`; deletion is permanent.
- **Exit.** Freely; "Keep only what still feels useful."
- **Failure states.** Any hint that more memories are "better"; quantity rewards — prohibited.
- **Safety.** Prohibited categories and credential material are rejected on edit and approval.

### 20. Founder stewards the product

- **Entry.** `/founder`, only with the server-verified founder role.
- **Need.** Operational awareness without surveillance.
- **Behavior.** Aggregate counts and configuration status only; no user content of any kind.
- **Failure states.** Any per-user drill-down or content exposure — structurally impossible by
  policy and by the counts-only aggregate functions.

### 21. User comes Home

- **Entry.** Sign-in lands on `/home`; the wordmark returns there from anywhere.
- **Need.** To arrive somewhere, not at a to-do list.
- **Behavior.** Greeting by chosen name and time of day; four quiet doors; at most one gentle,
  dismissible continuation; glimpses of Horizon and the memory sky; a quiet way to step away.
- **Light.** welcoming, settling to resting; listening when a door is focused.
- **Persistence.** Nothing new — a device-local last-visit timestamp only.
- **Exit.** Free, with one optional Last Light line. "Take only what feels useful."
- **Failure states.** Anything resembling a dashboard, streak, or demand — prohibited.
- **Safety.** No mood inference; no content on screen the user didn't choose to keep visible.
