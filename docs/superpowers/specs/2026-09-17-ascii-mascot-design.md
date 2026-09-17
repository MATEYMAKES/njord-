# NJORD Contact-Section Mascot — Appearance, Formation & Personality

Status: approved for implementation, revised 2026-09-17 after design
review. Appearance/formation/personality/interaction-shell only — the
actual helper/contact assistant experience behind the click is
explicitly **out of scope** for this spec.

**Guiding principle (governs every section below):** do not make him
look or behave like a robot, chatbot, button, or polished mascot. He is
a tiny, imperfect person who happens to be made out of the website's
own ASCII material. The signal-green point is a NJORD artifact that
happens to be lodged in him, not a glowing robot eye or status light.
His personality comes entirely from tiny physical reactions — looking,
shifting weight, watching a nearby particle, noticing the cursor — never
from UI effects like glowing, highlighting, or brightening.

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
  inspect/interact with nearby stray characters) that is mostly calm, not
  constantly animating. Continuous (never thresholded) reaction to cursor
  proximity, expressed only through subtle head movement — never through
  brightness, glow, or highlighting.
- Click triggers a **placeholder** reaction only, revised after review: he
  looks directly at the cursor and straightens up — no text fragment, no
  button chrome, no chat bubble, no floating widget, no real contact/
  helper logic. This is deliberately the seed of a future transition
  (idle → clicked → notices you → helper conversation begins), not a
  disposable animation.
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
canvas and its own small (~47-particle: 22 body + 25 stray) pool,
entirely independent of `AsciiOrganism`.

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

**Body points (fixed silhouette, 22 total)** — expanded from an earlier
15-point pass that read as a bare stick figure; each point is tagged with
a `part` used by the idle-animation, stagger, and cursor-tracking logic
below:

```
head  (6 pts): a small square outline + 2 interior points —
               (-0.08,-1.02) (0.08,-1.02) (-0.08,-0.86) (0.08,-0.86)
               corners, plus (0,-0.98) (0,-0.90) interior
torso (4 pts): (0,-0.62), (0,-0.48), (0,-0.34), (0,-0.20)
armL  (3 pts): shoulder(-0.14,-0.58), elbow(-0.22,-0.42), hand(-0.30,-0.24)
armR  (3 pts): shoulder(0.14,-0.58), elbow(0.22,-0.42), hand(0.30,-0.24)
legL  (3 pts): hip(-0.09,-0.06), knee(-0.12,0.16), foot(-0.16,0.38)
legR  (3 pts): hip(0.09,-0.06), knee(0.12,0.16), foot(0.16,0.38)
```

Enough points for a recognizable square head, torso, and jointed limbs
while still reading as loose ASCII fragments rather than a filled
illustration.

**The signal-green detail is not an eye and is not centered on the
face.** One head corner point — fixed at construction, e.g. the
top-right corner `(0.08,-1.02)` — is flagged `accent: true` and rendered
in NJORD's signal green. It reads as a stray fragment of the
environment that happens to be lodged in his head, not a robot
indicator light or a face part, and it is placed off to one side
specifically so it doesn't default into looking like an eye. Two of the
head's interior points may render at a very low, barely-visible
intensity as an almost-absent suggestion of a face — deliberately never
bold enough to read as a clear expression. No point is positioned or
described as an eye. Every non-accent point renders in the page's own
ink color (`getInkColor()`, matching `AsciiOrganism`/`FormationPortrait`),
so light/dark mode is automatic.

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

**Per-part stagger** — revised after review so the body does not
interpolate in lockstep (which read as "a particle morph preset" rather
than something assembling itself). Each `part` gets its own fixed offset
into the same global `p`, seeded once, deliberately asymmetric between
left/right:

```
STAGGER = { head: 0.00, torso: 0.05, armR: 0.08, legR: 0.10, armL: 0.14, legL: 0.18 }
partP(part) = smoothstep(0, 1, clamp((p - STAGGER[part]) / (1 - STAGGER[part]), 0, 1))
```

The head becomes recognizable first; the left arm and leg noticeably lag
the right side — a deliberate asymmetry, not a mirrored pair.

Per body point, per frame (using its own `partP`, not the raw global `p`):

```
noiseAmp   = lerp(0.35, 0.02, partP)      // shrinks as this part forms; never fully zero (texture)
basePos    = lerp(scatterPos, silhouettePos, partP)
renderPos  = basePos + noise(seed, t) * noiseAmp + idleOffset(part, t, partP)  // idle: see Component 3
```

**Flicker dropout** — two specific points, one on `legL` and one on
`armL` (the same laggard limbs, reinforcing the "still figuring itself
out" read), get one extra rule: while that point's own `partP` is
between 0.35 and 0.55, its intensity multiplies by a seeded on/off
flicker (dropping briefly to near-zero once or twice) before locking in
solid past 0.55 — a character that hasn't "caught" yet, not a rendering
bug. Only active during that specific formation band for those two
points; never while fully scattered or fully formed.

Stray points always render (never gated by `p`); their blend toward
`home` is itself `lerp(fartherWanderRadius, home, p * settleWeight)`
(using the global `p`, since strays are ambient rather than part of the
staggered body), so low-settle-weight strays barely move in and
high-settle-weight ones tuck in close — a natural-looking scatter of
"some remained nearby" rather than a binary in/out state.

Scrolling back up runs `p` (and every derived `partP`) back down through
the same formulas — no separate reverse animation needed, matching the
rest of the codebase's "reversible by construction" formations.

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
  in progress is suppressed while cursor attention (Component 5) is above
  a small threshold, so he doesn't glance away from a cursor that's
  actively near him, and is also suppressed while a stray encounter
  (Component 4) is active — the encounter's own head-target takes over
  instead of fighting it.

## Component 4 — Stray encounters

New behavior added after review so the ambient strays have more purpose
than passive wandering — this is what sells "he belongs to the ASCII
environment" rather than sitting next to it.

Every 15–30s (randomized, re-rolled after each encounter finishes), pick
one currently free-wandering stray (excluding ones already resting close
in with a high `settle` weight) and one encounter `type`, uniformly at
random:

- **watch** — the stray eases toward a point roughly at head height in
  front of him over ~1s; his head targets it (overriding idle glance) for
  ~1.5s; the stray eases back to its normal wander home over ~1s. No
  physical contact.
- **nudge** — the stray eases toward a point near a foot over ~1s; that
  foot gets a small one-off targeted offset toward it, as if nudging it;
  the stray gets a small displacement away and resumes normal wandering.
- **catch** — the stray eases toward a hand point over ~1s, then its
  position locks to that hand (plus a tiny fixed offset) for ~1.5–2s —
  it briefly sticks to him — before releasing and easing back to its
  normal wander home over ~1s.

Total encounter duration is ~3.5–5s, well inside the 15–30s gap between
them, so it reads as a rare, noticed moment rather than a repeating tic.

## Component 5 — Cursor awareness

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
- **Removed after review: no intensity/brightness change from cursor
  proximity at all.** Head movement alone carries "he noticed you" —
  brightening read as a UI hover effect (a button lighting up), which
  works against the whole point of him being a creature rather than a
  control. Attention manifests only as movement, never as lighting.

## Component 6 — Click reaction & accessibility

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

On click or Enter/Space activation (guarded so a new activation while
already alerted just refreshes the hold timer rather than stacking):

- He turns to look directly at the cursor's current position — a
  stronger, sustained version of the ambient head-pull from Component 5
  (`MAX_PULL` roughly doubled) — and "straightens up": idle sway
  amplitude on torso/limbs eases down toward zero and the silhouette
  eases toward a slightly more upright variant of its resting pose.
- This "alerted" state holds for a few seconds (~3–4s), refreshing on
  repeat activation, then eases back to ordinary idle. While alerted,
  idle glancing (Component 3) and stray encounters (Component 4) are
  suppressed so nothing competes with the reaction.
- Revised after review: no text fragment, no note element, no popup —
  removed the earlier "...", "?" fragment idea entirely. This alerted
  state is deliberately the seed of a future transition (idle → clicked
  → notices you → helper conversation begins), not a disposable
  animation, so it's worth building cleanly now rather than throwing it
  away later.

This is explicitly a dead end for now beyond that — no click payload, no
follow-up UI, no dialogue. The real assistant/questionnaire experience is
future work.

## Integration points (files touched)

- `ascii-engine.js` — new `AsciiMascot` class (geometry, formation,
  idle, cursor, reaction, render), exported alongside the existing
  classes. No existing class or formation is modified.
- `index.html` — inside `#contact`, near `.site-footer`: a small wrapper
  (`<div class="mascot">`) containing the canvas and the hit-target
  button only — no note/text element (removed after review).
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
  `mascot.triggerReaction()`, start/stop it via the existing
  `whenVisible()` helper.
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
   (scattered → vague → recognizable → formed) read distinctly, that the
   head settles before the left arm/leg (asymmetric stagger, not
   lockstep), that the `legL`/`armL` flicker-dropout is visible but reads
   as "still assembling" rather than broken, and that scrolling back up
   dissolves him the same way in reverse.
2. Confirm stray characters remain visibly wandering near him after full
   formation, not just his exact silhouette, and confirm the green accent
   point reads as an off-center artifact, not a centered eye/face.
3. Sit still once formed and confirm calm sway + an occasional glance
   toward a nearby stray point happen without excessive motion, and that
   no face/expression is legible beyond a faint suggestion.
4. Wait through a full 15–30s window and confirm a stray encounter
   (watch/nudge/catch, randomly chosen) plays once, reads as rare and
   intentional, and that idle glancing pauses correctly during it.
5. Move the cursor toward him from a distance and confirm a continuous
   (not stepped) head-tracking response with **no brightness/intensity
   change anywhere on his body**; confirm a glance in progress is
   suppressed while the cursor is close.
6. Click him (mouse) and Tab+Enter him (keyboard) and confirm he looks
   directly at the cursor and straightens up (no text, no popup), that
   the alerted state holds a few seconds then eases back to idle, and
   that repeat activation refreshes rather than stacks.
7. Confirm `:focus-visible` outline appears correctly on Tab.
8. Toggle `prefers-reduced-motion` and confirm instant fully-formed idle
   state with no scroll-driven assembly.
9. Check mobile width (< 720px) doesn't clip or overlap footer text.
10. Toggle dark mode and confirm ink/signal colors swap automatically
    (no hardcoded hex colors in the new code).
11. Confirm the existing GLOBE reformation, ambient field, footer layout,
    and contact form are visually unchanged from before this feature.
