# NJORD Services Section V2 — Procedural ASCII Roadmap

Status: approved for implementation (2026-09-15). Supersedes the current
`#services` section entirely (hover-reveal ledger + mobile scroll-cap-2 +
tap-to-open-page system, all preserved untouched in `versions/v1-services/`
and as artifact version 55, restorable at any time).

No git repo exists in this project (file+Artifact-based workflow per
HANDOFF.md), so this doc is not committed — it lives as a plain file.

## Why

The current "What We Do" section (a plain hover-reveal ledger of five rows)
reads as flat and generic compared to the rest of the site, where the one
persistent ASCII particle organism is the whole visual identity. This
redesign turns Services into a scroll-driven moment where that same
organism visibly *constructs* a roadmap rather than sitting in a static
list next to it.

## Non-negotiables (from the brief)

- The **existing** organism transforms into the path — no second canvas,
  no new particle system.
- Node order (01→05) is fixed; node **x-position** is randomized once per
  page load (`Math.random()`, not seeded — differs every refresh).
- No standard timeline/cards. No fade-ins. Text types character-by-character,
  driven by scroll position (not a timed animation), so it un-types
  symmetrically on scroll-up.
- Mobile gets much less horizontal x-variation than desktop.
- Vanilla JS + Canvas + CSS + rAF only — no React/Next.js/GSAP (matches the
  rest of the codebase, confirmed with the user).
- Visual/animation prototype only — no CMS, no click-through detail pages
  for the nodes (that pattern is being removed, not extended).

## Content (replaces `services.01–05` in i18n.js)

| # | EN heading | EN support | SQ heading | SQ support |
|---|---|---|---|---|
| 01 | Branding & Identity | A visual identity built to carry a business, not just decorate it. | Brending & Identitet | Një identitet vizual i ndërtuar për ta mbajtur biznesin, jo vetëm për ta zbukuruar. |
| 02 | Website Design & UI/UX | Interfaces designed around how people actually use them. | Dizajn Webfaqeje & UI/UX | Ndërfaqe të dizajnuara sipas mënyrës si njerëzit vërtet i përdorin. |
| 03 | Development & Interaction | The build underneath — functionality, motion, everything that has to work. | Zhvillim & Ndërveprim | Ndërtimi nën sipërfaqe — funksionaliteti, lëvizja, gjithçka që duhet të funksionojë. |
| 04 | Hosting & Maintenance | Hosted on servers in Kosovo, kept fast and stable after launch. | Hosting & Mirëmbajtje | E hostuar në serverë në Kosovë, e mbajtur e shpejtë dhe stabile pas lansimit. |
| 05 | SEO & Ongoing Support | Optimized to be found, supported long after the handoff. | SEO & Përkrahje e Vazhdueshme | E optimizuar për t'u gjetur, e përkrahur gjatë kohës pas dorëzimit. |

## Architecture

### 1. Node position generation (`AsciiOrganism` constructor, once)

```
desktop x-band: 18%–82% of section width, min separation between
                consecutive nodes' x: 14% of width (re-roll on violation,
                capped retries, falls back to evenly-spaced jitter)
mobile  x-band: 38%–62% (max-width: 720px, same check used elsewhere in
                the codebase for mobile), min separation 8%
y: fixed per node slot — evenly spaced down the section's own scroll
   range, not randomized (order must read top-to-bottom)
```

Stored as **normalized fractions**, not px — a resize (including the iOS
toolbar-driven resize we just diagnosed) reflows proportionally instead of
re-rolling, satisfying "fixed during that session."

### 2. New `roadmap` formation

Registered in `main.js`'s zone list between `network` (Meridian) and
`constellation` (Studio):

```js
{ name: 'roadmap', el: document.getElementById('services') }
```

Every other formation is a pure two-point blend via `_timelineSegment()`.
`roadmap` needs finer resolution than "how far between two anchors" — it
needs to know *where inside the Services section* the viewport is. When
`_timelineSegment()` resolves to `roadmap` as the active/target formation,
it additionally computes `localT` (0–1 across the Services section's own
scroll range) and `_formationTarget('roadmap', i, t, localT)` maps that to
one of these stages:

```
0.00–0.08  intro   — network's tail shape relaxes toward the path's start
0.08–0.22  grow→01 — path extends toward node 1; node 1 appears at the end
0.22–0.24  type-01 — heading + support line type in (DOM overlay, not canvas)
0.24–0.38  grow→02 ...repeat pattern through node 05...
0.86–0.92  type-05
0.92–1.00  dissolve — path structure relaxes into scatter, blending toward
                      constellation's own opening state
```

(Exact breakpoints tunable during implementation/review — the *shape* of
the stage list, not the numbers, is the load-bearing part.)

**Path**: a randomized spline of seed points between consecutive nodes,
generated alongside node positions (same one-time random pass), with
per-segment perpendicular jitter so it "bends naturally" rather than
running straight. Particles are assigned a position-along-path (like wave's
`t`-position or the diamond's barycentric uv — identity computed once).
Only particles whose path-position ≤ current stage's reveal progress are
actually placed on the path; the rest continue blending from `network`'s
own shape, or sit in the not-yet-revealed pool. That's the mechanism that
makes it "grow" as you scroll. Density varies along the path via a coarse
noise function (some clusters dense, some sparse, per the brief), and the
organism's existing per-particle jitter wobble supplies the flicker/shift
texture — no new jitter mechanism needed.

### 3. Text — real DOM, not canvas

Five small absolutely-positioned `<div class="roadmap-node">` blocks (inside
`#services`, positioned via the same stored x/y fractions as their node),
each with a heading and a support line. A scroll-driven function sets
`charsShown = Math.floor(text.length * clamp01(nodeLocalProgress))` on each
line directly from scroll position every frame (no CSS transition, no
timed animation) — heading completes before the support line starts, per
the brief. A trailing `<span class="cursor">` blinks via a CSS
`@keyframes` opacity animation and moves to whichever line is currently
typing. Kept as real text (not canvas) per the brief, for accessibility —
screen readers get the full text immediately (`aria-hidden` on the
per-character reveal mechanics, real full text in a visually-hidden node
for AT, mirroring how `.work-row__index` etc. already separate decorative
canvas from real content elsewhere in this codebase).

### 4. Removed

- `#service-modal` markup, `.service-modal*` CSS, `openService`/
  `closeService`/`showServiceModal`/`serviceCopy` and the mobile
  scroll-position reveal-cap-2 JS block in `main.js`.
- `.service-row` ledger markup/CSS in `index.html`/`style.css`.
- `services.01–05.title/.desc` keys in `i18n.js` (replaced per the table
  above; `services.eyebrow`/`.h2`/`.note`/`.modalEyebrow` re-evaluated —
  `.modalEyebrow` and anything modal-specific is dropped, section heading
  copy likely kept or lightly adjusted since the section itself remains).
- The shared `animatePageReveal`/`trapTabKey` helpers stay — they're still
  used by the project-page portal, untouched.

### 5. Reduced motion / no-JS-canvas fallback

`prefers-reduced-motion` already short-circuits the organism to a single
static settled frame (`AsciiOrganism`'s existing `reduced` path) — the
roadmap formation's "settled" state (all nodes placed, full path drawn, all
text fully typed) is what renders for those users, consistent with how
every other formation already degrades.

## Testing plan

Since live device/browser testing isn't available in this session:
manual code trace + Chrome DevTools responsive-mode check (desktop and a
phone-width emulation) of: node spread not overlapping/clipping at a few
viewport widths, path growing/reversing smoothly on scroll up/down, typing
reveal being scroll-position-exact (jump scroll, not just slow scroll),
and the dissolve blending cleanly into `constellation`. Flagged to the user
as needing real on-device confirmation, same caveat pattern already used
elsewhere in HANDOFF.md for audio/mobile.
