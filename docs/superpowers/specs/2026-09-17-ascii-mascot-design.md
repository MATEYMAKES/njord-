# NJORD Contact-Section Mascot — Appearance, Formation & Personality

Status: approved for implementation (2026-09-17). Appearance/formation/
personality/interaction-shell only — the actual helper/contact assistant
experience behind the click is explicitly **out of scope** for this spec.

## Why

The contact section currently closes the page with the organism reforming
into GLOBE (the hero's own opening formation, a narrative bookend) plus a
drifting ambient particle field. The brief asks for a small, easily-missed
character — assembled from the same ASCII material as the rest of the site
— to live near the footer as a "hidden inhabitant," with his own restrained
personality, purely as groundwork for a future contact assistant that is
NOT being built yet.

## Non-negotiables (from the brief + brainstorming)

- Extremely minimal, slightly imperfect — not a polished mascot/chatbot icon.
  Thin black geometric body, small square-ish head, ONE restrained NJORD
  signal-green detail. Small enough to feel incidental, not illustrative.
- Formation is progressive with scroll: scattered → vague → recognizable →
  fully formed. Some stray characters remain wandering near him permanently
  after formation — he must read as emerged from the field, not faded in.
- Scrolling back away from the contact section **reverses** the formation
  (dissolves back to scattered) — confirmed with the user; matches the
  site's existing "nothing is one-shot, everything reverses with scroll"
  rule used by every other formation.
- Once formed: idle personality (look around occasionally, weight shift,
  inspect nearby stray characters) that is mostly calm, not constantly
  animating. Continuous (never thresholded) reaction to cursor proximity;
  subtle head/face tracking of the cursor as it nears.
- Click triggers a **placeholder** reaction only (confirmed with the user):
  a brief startled-jitter of his own particles, plus a tiny fading ASCII
  text fragment near his head (e.g. "...", "?"). No button chrome, no chat
  bubble, no floating widget, no real contact/helper logic.
- Preserve the current contact section, typography, spacing, colors,
  existing ASCII artwork (GLOBE reformation + ambient field) and overall
  creative direction untouched. This is an addition, not a redesign.
- Placement: a small corner near the footer (`.site-footer`), confirmed
  with the user — NOT inside the main organism's existing particle cloud.

## Architecture decision

**A standalone `AsciiMascot` class**, added to `ascii-engine.js` as a
sibling to the existing `FormationPortrait`/`StaticGlyphField` classes —
same file, same rendering conventions (char ramp, font, color handling,
shared `ticker`, `mulberry32`, `lerp`, `smoothstep` helpers), but its own
canvas and its own small (~40-particle) pool, entirely independent of
`AsciiOrganism`.

Rejected alternative: adding `mascot` as a new formation case inside
`AsciiOrganism`'s shared particle pool/zone system. Every existing
formation there is a **stateless function of (formation name, particle
index, elapsed time)** — none has hover state, click handling, or
"notice the cursor and react" logic. Retrofitting that onto the shared
820-particle pool used by every other formation would mean bolting
genuinely stateful, interactive behavior onto a system explicitly
designed to have none, risking the well-tuned core file for a feature
that structurally doesn't fit its model. It would also mean competing
for the same anchor point as the closing GLOBE reformation, which
conflicts with the confirmed footer-corner placement anyway.

## Component 1 — Skeleton & identity (constructed once)

All positions are in the mascot's own local unit space (roughly a
`[-1, 1]` box, rendered via `cx + x*scale, cy + y*scale`, matching
`FormationPortrait`'s existing coordinate convention).

**Body points (fixed silhouette, 15 total)** — each tagged with a `part`
used by the idle-animation and cursor-tracking logic below:

```
head   (4 pts): (0,-0.95) accent-eye, (-0.06,-1.0), (0.06,-1.0), (0,-0.88)
torso  (3 pts): (0,-0.6), (0,-0.4), (0,-0.2)
armL   (2 pts): (-0.14,-0.55) shoulder, (-0.28,-0.25) hand
armR   (2 pts): (0.14,-0.55) shoulder, (0.28,-0.25) hand
legL   (2 pts): (-0.08,-0.05) hip, (-0.14,0.35) foot
legR   (2 pts): (0.08,-0.05) hip, (0.14,0.35) foot
```

One head point (the `(0,-0.95)` "eye") is flagged `accent: true` — the
single restrained signal-green detail. Every other point renders in the
page's own ink color (`getInkColor()`, matching `AsciiOrganism`/
`FormationPortrait`), so light/dark mode is automatic.

**Stray points (25 total)** — each has a fixed `home` position (seeded
random point at radius 1.0–1.7 from center, `mulberry32` seed dedicated
to the mascot so layout is stable across reloads/resizes like every other
formation in the file), a fixed wander phase/speed/amplitude, and a fixed
`settle` weight (`~30%` of strays get a high settle weight and drift to
rest just outside the silhouette once formed; the rest keep wandering
loosely at their home radius regardless of formation progress) — this is
what keeps loose characters visibly hanging around him permanently
rather than every particle locking into the body.

**Scatter start positions**: each body point also gets a fixed random
scatter position (seeded, radius 1.4–2.2 from center) — its "unformed"
resting place.

## Component 2 — Formation staging (scroll-driven)

Progress `p ∈ [0,1]` is computed every frame from the mascot's own
wrapper element's `getBoundingClientRect()` (no dependency on
`AsciiOrganism`'s zone system):

```
MASCOT_FORM_START_FRAC = 0.85   // element top at 85% down the viewport → p starts rising
MASCOT_FORM_END_FRAC   = 0.30   // element top at 30% down the viewport → p = 1
raw = 1 - clamp((rect.top/vh - MASCOT_FORM_END_FRAC) /
                (MASCOT_FORM_START_FRAC - MASCOT_FORM_END_FRAC), 0, 1)
p = smoothstep(0, 1, raw)
```

(Naming mirrors the existing `TYPE_START_FRAC`/`TYPE_END_FRAC` pattern in
`main.js`'s roadmap typewriter — same technique, new constants.)

Per body point, per frame:

```
noiseAmp   = lerp(0.35, 0.02, p)          // shrinks as he forms; never fully zero (texture)
basePos    = lerp(scatterPos, silhouettePos, p)
renderPos  = basePos + noise(seed, t) * noiseAmp + idleOffset(part, t, p)  // idle: see Component 3
```

Stray points always render (never gated by `p`); their blend toward
`home` is itself `lerp(fartherWanderRadius, home, p * settleWeight)`, so
low-settle-weight strays barely move in and high-settle-weight ones tuck
in close — a natural-looking scatter of "some remained nearby" rather
than a binary in/out state.

Scrolling back up runs `p` back down through the same formula — no
separate reverse animation needed, matching the rest of the codebase's
"reversible by construction" formations.

## Component 3 — Idle personality (only once mostly/fully formed)

Idle amplitude is gated by `idleAmp = smoothstep(0.85, 1, p)`, so
personality fades in/out with formation rather than popping.

- **Continuous calm sway** (always-on, tiny): every body point gets
  `sin(t*freq + jitterSeed)*amp*idleAmp` on both axes, `freq`/`amp` varying
  slightly per `part` (torso/legs sway a touch slower and smaller than
  arms/head) so it doesn't read as one rigid unit wobbling in lockstep —
  this is the "shift his weight" / "spend most of his time calmly
  existing" baseline.
- **Occasional glance** (discrete event, ~6–11s random interval): the
  head points' target briefly (0.6s ease in, ~0.4s hold, 0.6s ease out)
  offsets toward the current position of a randomly chosen nearby stray
  point (small offset, capped at 0.06 local units) — this is the "looks
  around occasionally" / "inspects nearby ASCII characters" beat. A glance
  in progress is suppressed while cursor attention (Component 4) is above
  a small threshold, so he doesn't glance away from a cursor that's
  actively near him.

## Component 4 — Cursor awareness

Pointer position is tracked in raw viewport pixels (reusing the same
`pointermove`/`touchmove` wiring already set up in `main.js` for
`organism.setPointer`, just also forwarded to the mascot). Each frame:

```
dist       = distance(pointerPx, mascotCanvasCenterPx)
attention  = 1 - clamp(dist / NOTICE_RADIUS_PX, 0, 1)   // NOTICE_RADIUS_PX = 260
attention  = smoothstep(0, 1, attention)                 // continuous, no threshold jump
```

- Head points get an added pull toward the cursor's direction, scaled by
  `attention * MAX_PULL` (`MAX_PULL ≈ 0.05` local units) — subtle
  head/face tracking, strongest when the cursor is close.
- All body-point intensity gets a small continuous boost
  (`intensity *= 1 + attention * 0.15`) — a restrained "he notices you"
  brightening with no hard on/off "hover" state.

## Component 5 — Click placeholder & accessibility

A real, transparent, focusable `<button>` sits exactly over the mascot's
canvas (same size, stacked via CSS, no per-frame position tracking needed
since this element doesn't move around the page like the roadmap's
DOM-tracked nodes do) — decorative canvas stays `aria-hidden="true"`, the
button carries the accessible name (`data-i18n-aria="mascot.ariaLabel"`,
new EN/SQ key in `i18n.js`) and gets the site's existing `:focus-visible`
treatment automatically, same pattern the rest of the site uses to keep
real interactive semantics in DOM elements layered over decorative canvas
(project modal's full-bleed background canvas + real buttons is the
existing precedent).

On click or Enter/Space activation (guarded so a reaction already playing
blocks a new one from stacking):

- All body points get a brief (~0.4s) boosted noise-amplitude jitter —
  the "startled" physical reaction — then settle back to normal idle.
- A small `<span class="mascot__note" aria-live="polite">` (same
  fade-via-`.is-visible` convention as `.contact-form__note` /
  `.project-modal__cta-note` elsewhere in the codebase — no new UI
  pattern) shows one randomly picked fragment from a short pool
  (`"...", ". . .", "?"`) for ~1.2s then fades. These fragments are
  punctuation, not language-bearing text, so no i18n entry is needed for
  them; only the button's `aria-label` is translated.

This is explicitly a dead end for now — no state machine beyond "is a
reaction currently playing," no click payload, no follow-up UI. The real
assistant/questionnaire experience is future work.

## Integration points (files touched)

- `ascii-engine.js` — new `AsciiMascot` class (geometry, formation,
  idle, cursor, reaction, render), exported alongside the existing
  classes. No existing class or formation is modified.
- `index.html` — inside `#contact`, near `.site-footer`: a small wrapper
  (`<div class="mascot">`) containing the canvas, the hit-target button,
  and the note span.
- `style.css` — new `.mascot*` rules: small fixed size (roughly
  64–96px depending on viewport, exact size tuned visually during
  implementation, consistent with this codebase's existing practice of
  dialing a couple of values in by eye — see `HANDOFF.md`'s own note on
  `.work-row:last-child`'s padding), absolutely positioned in the
  bottom-left corner of `.contact-inner`, straddling the footer's own
  top border line so he reads as standing near it without overlapping
  the footer text. `.site-footer` gains `position: relative` if needed
  for that anchor (no other change to its layout).
- `main.js` — instantiate `AsciiMascot`, forward the existing pointer
  listeners to it, wire the hit-target's click/keyboard activation to
  `mascot.triggerReaction()` plus the note text, start/stop it via the
  existing `whenVisible()` helper.
- `i18n.js` — one new key, `mascot.ariaLabel` (EN + Albanian).

## Performance & accessibility

- `prefersReducedMotion()` (already exported, reused as-is): skip the
  scroll-driven assembly entirely, render once in the fully-formed idle
  pose with idle motion frozen at a settled frame — same degradation
  pattern `AsciiOrganism.start()` and `FormationPortrait` already use.
- Registers with the shared `ticker` rather than its own `rAF` loop,
  matching every other live field in this file.
- Paused via `whenVisible()` when the mascot's own element scrolls out of
  view — same convention as the rest of the site, and cheap anyway given
  ~40 particles on a small canvas.
- `devicePixelRatio` capped the same way as `AsciiOrganism`/
  `FormationPortrait` (2 on desktop, 1 on mobile widths).
- Keyboard: native `<button>` gets Enter/Space activation and the site's
  global `:focus-visible` outline for free — no custom key handling
  needed beyond the click handler itself (a `click` event covers both
  mouse and keyboard activation of a real button).

## Explicitly out of scope

- Any real contact/helper/questionnaire logic behind the click.
- Any dialogue system, chat UI, or persisted mascot state.
- Any change to the existing GLOBE closing reformation, the ambient
  particle field, or any other formation in `AsciiOrganism`.

## Testing / verification plan

Manual, via the Claude in Chrome browser tool against the local dev
server (`_dev_server.py`) — this feature needs a real page, not the
claude.ai Artifact preview:

1. Scroll slowly into `#contact` and confirm the four staging looks
   (scattered → vague → recognizable → formed) read distinctly, and that
   scrolling back up dissolves him the same way in reverse.
2. Confirm stray characters remain visibly wandering near him after full
   formation, not just his exact silhouette.
3. Sit still once formed and confirm calm sway + an occasional glance
   toward a nearby stray point happen without excessive motion.
4. Move the cursor toward him from a distance and confirm a continuous
   (not stepped) brightening/head-tracking response; confirm a glance in
   progress is suppressed while the cursor is close.
5. Click him (mouse) and Tab+Enter him (keyboard) and confirm the same
   jitter + fading fragment reaction, and that rapid repeat clicks don't
   stack reactions.
6. Confirm `:focus-visible` outline appears correctly on Tab.
7. Toggle `prefers-reduced-motion` and confirm instant fully-formed idle
   state with no scroll-driven assembly.
8. Check mobile width (< 720px) doesn't clip or overlap footer text.
9. Toggle dark mode and confirm ink/signal colors swap automatically
   (no hardcoded hex colors in the new code).
10. Confirm the existing GLOBE reformation, ambient field, footer layout,
    and contact form are visually unchanged from before this feature.
