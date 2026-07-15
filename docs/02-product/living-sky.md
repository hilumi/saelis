# The Living Sky

The Living Sky is Saelis's global atmosphere: one continuous celestial place whose colors change
quietly with the time of day. It exists so that arriving at Saelis feels like stepping into
somewhere — a place that helps you exhale before anything is asked of you.

## Why time, not emotion

The sky is deliberately driven by **local device time only**. It is not a weather report, not mood
detection, not gamification. Tying the atmosphere to a user's emotional state would make the
product a mirror held up to their worst moments — and would require exactly the kind of emotional
profiling Saelis refuses to do. Time is honest, universal, and asks nothing.

## Privacy boundaries

The Living Sky may use: local device time, the calendar date, reduced-motion preference, and
contrast preference. It must never use: location, IP-derived location, weather APIs, camera,
microphone, user messages, mood, Arrival answers, conversation sentiment, memory content, or
analytics profiling. There is no code path from the companion or Light Engine into the Sky
Engine — its entire input is a `Date`.

## Phases

Eight atmospheric phases (defaults, not astronomical claims): pre-dawn 04:00, dawn 05:30, morning
07:00, day 11:00, golden hour 16:00, sunset 18:30, twilight 20:00, night 21:30 (wrapping to
04:00). Real sunrise/sunset support may come later only through explicit opt-in location access —
never requested in this milestone.

Each phase has a complete typed palette (sky bands, horizon, cloud light/shadow, mist, celestial
glow, star color, text overlay, glass tint), grown from the Saelis token palette. Palettes blend
smoothly across a 30-minute window before each boundary; the sky updates at most once per minute.
Night stays a soft desaturated celestial blue — never black, never neon — and the standard ink
text remains readable in every phase (the app never inverts into a dark theme).

## The sky's inhabitants

- **Sun** (dawn → sunset): soft, diffused, mist-veiled; drifts gradually by phase; never a hard
  yellow circle, never dominant.
- **Moon** (twilight, night, pre-dawn): a quiet pearl disc, softly misted; no lunar-phase math yet.
- **Stars** (pre-dawn, dawn faintly, twilight, night): deterministically seeded from the calendar
  date — the same sky all day, a new one each night. They breathe very slowly; no blinking. These
  stars are the future spatial foundation for Constellations (approved memories among the stars),
  which are **not** implemented yet.
- **Clouds**: volumetric, multi-depth, phase-tinted, extremely slow, placed by a constant seed so
  they never pop between routes.
- **Aurora**: rare (roughly 3% of eligible nights, date-seeded and stable all day), muted lilac /
  mint / pale cyan, extremely slow. Never announced, never a reward, never tied to mood.

## The Light synchronization

The Light may borrow a visual tone from the sky — silver, pearl, warm-pearl, golden, blush,
moonlit, aurora — affecting only its glow palette. Its emotional states (resting, welcoming,
listening, receiving, reflecting, guiding, celebrating, still) remain primary, and time of day
never changes The Light's behavior or conversational meaning.

## Accessibility

Reduced motion stops cloud drift, star breathing, aurora movement, and sun breathing while
preserving the full still atmosphere and phase colors. High contrast quiets the atmospheric
layers, solidifies glass surfaces, and keeps focus indicators visible. No flashing, no brightness
pulsing, no rapidly changing gradients — the fastest thing in the sky takes 90+ seconds.

## Development preview

In development only: append `?sky=<phase>` (e.g. `?sky=dawn`, `?sky=sunset`, `?sky=night`) or
`?sky=aurora` to any URL. Invalid values are ignored; nothing persists; the mechanism is compiled
out of production builds.

## Explicitly deferred

Real weather, user location, emotional atmosphere, Weather Within, personal-growth Seasons,
Constellation memories, the Garden, rain/snow/thunder, audio, user-selectable themes, manual sky
controls, and founder-controlled events.
