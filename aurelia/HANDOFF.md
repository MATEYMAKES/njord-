# Aurelia — Handoff

Current-state snapshot only. No changelog/bug history — just how it works right now.

## Stack

- Vite + TypeScript, vanilla (no UI framework)
- Three.js for the 3D hero
- GSAP + ScrollTrigger — used **only** to scrub the ring's initial formation

## Project structure

```
index.html                     hero markup: nav, center headline, collections
                                index, ring/bracelet info panels, annotations
src/style.css                  all styling, incl. the --hero-progress CSS-
                                variable-driven fade/dissolve system
src/main.ts                    wires DOM refs into HeroScene's config
src/hero/HeroScene.ts          orchestrator — nearly all runtime state lives here
src/hero/jewelry/              geometry generators (ring band, bracelet,
                                landmark points) + GLTF model loader
src/hero/particles/            particle system driving ring formation
src/hero/materials/            shaders: particles, connection lines, solid gold
src/hero/scroll/                ScrollController   (GSAP scrub, formation only)
                                SlideController    (event-driven slide nav)
                                DragRotationController (free drag + inertia)
                                ScrollLock.ts       UNUSED — superseded by
                                                    SlideController's own lock,
                                                    safe to delete
src/hero/lighting/PointerLight.ts   cursor-tracking specular light
src/hero/utils/                random (seeded PRNG), wrapChars (per-char DOM split)
public/models/bracelet.glb     drop a real model here to replace the
                                procedural bracelet (see below)
```

## End-to-end behavior

1. **Pre-scroll**: thousands of small gold particles drift in a loose cloud
   (curl-noise, very slow), weakly biased toward the ring's eventual shape
   (invisible pull — never reads as an obvious donut), with depth-of-field
   (near = larger/softer, far = smaller/crisp) and density thinned out behind
   the headline text.

2. **Scroll-scrubbed formation** (0 → `RING_SCROLL_VH` = 400vh, GSAP
   ScrollTrigger `scrub + pin` on `#hero-wrapper`): particles converge →
   connecting lines form a wireframe → solid gold ring grows outward from a
   seed point. This is the **only** part of the experience still driven by
   raw scroll position, intentionally — it's meant to be continuously
   scrubbable.

3. **Trailing scroll buffer** (`SCROLL_BUFFER_VH` = 250vh of dead scroll room
   added after formation completes, before the pin can physically release).
   Purely a safety margin: without it, a fast scroll fling could carry
   scrollY past the pin's end before the render loop's next frame notices
   formation finished and engages the slide-lock, letting the user skip
   activation entirely.

4. **Formation completes → permanent latch**: `ringEverFormed` is set once
   and never unset — the ring can never revert to scattered particles again,
   no matter how the user scrolls afterward. The left info panel ("THE RING
   / AURELIA 01 / 18K GOLD…") plays a staggered reveal (line draws, then
   each field appears in sequence, not all at once). From this instant,
   scroll position stops being read entirely — `SlideController` takes over.

5. **Event-driven slide navigation** (`SlideController`, index-based: 0 =
   ring, 1 = bracelet, 2 = earrings): each wheel tick / touch swipe /
   arrow-key press is a **discrete trigger**, not a position to read. It
   advances or retreats the index. Every transition is a fixed 0.75s timed
   ease from wherever the visual currently sits to the new target — never
   tied to scroll speed or magnitude. After any transition, input is locked
   out for ~2.2s (settle hold) so the new piece is actually noticed before
   you can move again. Retreating past index 0 **loops** to the last index
   (earrings) — since the ring can't unform, there's nothing "before" it to
   scroll back into.

6. **Ring ↔ Bracelet ↔ Earrings slide**: all three are real `THREE.Group`s
   that physically translate in world space (not CSS), positioned via a
   wrapped-distance formula (`HeroScene.renderLoop`, using a continuous
   unwrapped `carouselOffset`) so any piece parks correctly relative to any
   other, including across the loop-back wrap, without ever sweeping through
   an unrelated piece's position — ~6.5× the ring's bounding radius
   offscreen at rest. The side panel swaps to that piece's copy (same
   layout/CSS, different content), and the inspection annotation labels swap
   too.

7. **Earrings orbit**: the pair (`generateEarringGeometry.ts`, faceted gold
   beads) continuously revolves around their shared center — but *only*
   while the earrings are the active slide, and it freezes during inspection
   (so its annotation points, computed live from each bead's current orbit
   position, stay legible). It resumes from wherever it left off, never
   resets. Clicking either bead raycast-hit-tests both (`activeHitTargets`).

8. **Drag + inspection** (works identically on whichever piece is active):
   mouse-drag rotates with inertia, subtle cursor-tilt always applies.
   Clicking the active object directly (raycast hit-test) or its "EXPLORE
   OBJECT →" button toggles inspection mode: the camera dollies closer
   (distance computed from the object's real bounding sphere + current
   FOV/aspect — `INSPECT_FRAMING_MULTIPLIER` ≈ 1.4 targets ~71% viewport
   height fill with margin on every side, never a hardcoded zoom), most UI
   hides, and three annotation labels attach to real projected points on the
   geometry via world-to-screen projection each frame, with leader lines
   pointing outward from the object's center into open space and clamped to
   stay fully on-screen.

9. **Exiting the hero**: advancing past the last slide (earrings) releases
   the pin and hands scroll back to native, continuing into `#after-hero`.
   Scrolling back up re-arms slide navigation only once the user has
   genuinely scrolled back 150px+ from the exact exit point (a real
   confirmed gesture — not just "progress reads ~1", which is ambiguous
   right at the pin boundary and previously caused a re-enable/block flap).

10. **Bracelet is upload-ready**: `loadOrGenerateJewelryGeometry()`
   (`src/hero/jewelry/loadOrGenerateJewelryGeometry.ts`) tries `GLTFLoader`
   against the path in `src/hero/jewelry/modelUrls.ts`
   (`/models/bracelet.glb`, under `public/`), merging all mesh geometries
   found. Falls back silently to a procedural bangle (reuses the ring's own
   band-geometry generator at bracelet proportions) if the file is missing,
   fails to parse, or has no meshes. Once loaded, it's auto-scaled by the
   ratio of the ring's bounding-sphere radius to the model's own — an
   uploaded file at any native scale ends up reading at the same on-screen
   size as the ring, no manual unit-matching required.

## Key tuning constants (all top of `HeroScene.ts`)

| Constant | Role |
|---|---|
| `RING_SCROLL_VH` / `SCROLL_BUFFER_VH` | formation scroll distance / trailing safety buffer |
| `SLIDE_TRANSITION_DURATION` / `SLIDE_LOCK_MS` | slide-carousel timing |
| `FORMED_ENTER` / `FORMED_EXIT` | hysteresis thresholds for "ring is formed" |
| `INSPECT_FRAMING_MULTIPLIER` | inspection camera framing target |
| `ANNOTATION_RING_CLEARANCE` / `ANNOTATION_SCREEN_MARGIN` / `ANNOTATION_ANGLE_NUDGE_DEG` | annotation label placement |
| `SLIDE_DISTANCE_MULTIPLIER` | how far offscreen each piece slides |
| `EARRING_ORBIT_RADIUS_FRACTION` / `EARRING_BEAD_RADIUS_FRACTION` | earring pair sizing (fractions of ring bounding radius) |
| `EARRING_ORBIT_SPEED` | earring pair revolution speed (rad/s) while active |

## Known state / open items

- Material is gold. (Was swapped to silver and back per an earlier request —
  no silver code remains.)
- **Three** real collection pieces exist (Ring, Bracelet, Earrings), and the
  left collections index UI now lists exactly those three. Adding a fourth
  piece means bumping `SlideController`'s `slideCount` and adding the
  equivalent geometry/panel/annotation set + collections-list entry (the
  carousel positioning math in `HeroScene.renderLoop` already generalizes to
  any slide count via wrapped distance — no changes needed there).
- Inspection annotations don't fade/hide when their point rotates to the
  back of the object (no occlusion test) — they'll stay visible even when
  facing away from camera.
- Leader lines use a fixed per-annotation angular nudge to avoid overlap,
  not true collision avoidance between labels.
- `src/hero/scroll/ScrollLock.ts` is dead code, safe to delete.
