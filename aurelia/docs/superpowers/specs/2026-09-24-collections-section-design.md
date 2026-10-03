# Collections Section — Design

## Purpose

A new pinned, horizontally-scrolling section immediately after the hero,
presenting four editorial "collections" (Exclusive, Diamond Line, Juveler,
Boutique) as simple text panels, navigated the same discrete-step way the
hero's Ring/Bracelet/Earring carousel already works. A minimal four-line
indicator on the right edge shows which collection is active, with each
line's length and color continuously eased in sync with the active
transition — never a binary on/off state.

This section is independent of the hero's jewelry pieces: no 3D jewelry
objects, no formation, no interaction with the particle background beyond
using it as atmospheric decoration.

## Non-goals

- No 3D jewelry geometry per collection (text panels only).
- No scroll-scrubbed continuous panning — navigation is discrete-step
  (wheel tick / swipe / arrow key = one collection), matching the hero's
  `SlideController` pattern, not a raw-scroll-position carousel.
- No interaction between the particle background and the jewelry — the
  particles here are purely decorative and never form/dissolve into
  anything.

## Structure

### Markup (`index.html`)

Replaces the current placeholder `#after-hero` section with:

```html
<section id="collections-wrapper">
  <canvas id="collections-canvas"></canvas>
  <div class="collections-panels">
    <!-- one .collections-panel per collection: name + tagline -->
  </div>
  <div class="collections-nav">
    <!-- 4x .collections-nav-line, no container chrome -->
  </div>
</section>
```

### `src/collections/CollectionsSection.ts`

New orchestrator class, instantiated from `main.ts` after `HeroScene`,
mirroring `HeroScene`'s structure but much smaller:

- Renders the atmospheric particle background by reusing the existing
  `ParticleSystem` class from `src/hero/particles/ParticleSystem.ts`
  unchanged. It's constructed the same way the hero does (needs a target
  geometry for its curl-noise bias), but its `update(formationProgress, …)`
  is always called with `formationProgress = 0` — it never advances, so the
  particles stay in the same loose drifting cloud as the hero's pre-scroll
  state and never converge into a shape. No new particle code.
- Owns a `SlideController` (`slideCount: 4`, `loop: false`) for discrete
  step navigation — reused as-is from `src/hero/scroll/SlideController.ts`.
- Owns a new small `CollectionsPinController` (see below) for the
  scroll-pin mechanics, since the hero's `ScrollController` is built around
  continuous scrub progress this section doesn't need.
- On each `SlideController` index change, updates:
  - the active text panel (cross-fade/slide via the same
    lerp-and-ease-over-`SLIDE_TRANSITION_DURATION` pattern the hero uses
    for its info panels), and
  - the indicator (see below).

### `src/collections/CollectionsPinController.ts`

A GSAP `ScrollTrigger` wrapper distinct from the hero's `ScrollController`
because this section has no continuous progress to scrub — it only needs
pin/release timing:

- `pin: true`, `scrub: true`, over a fixed `COLLECTIONS_SCROLL_VH` (350vh)
  scroll distance — enough room that a single wheel tick reliably resolves
  to one discrete step without immediately releasing the pin.
- `onEnter` / `onEnterBack`: enable the section's `SlideController`.
- `onLeave` / `onLeaveBack`: disable it (mirrors the hero not reading
  scroll once `SlideController` has taken over).
- `jumpToEnd()` / `jumpToStart()`: force scroll position to the trigger's
  end/start, released by `SlideController.onExitForward` /
  `onExitBackward` respectively — the same "scroll position stops
  mattering, so don't make the user scroll through the rest of the pin
  range" reasoning as the hero's existing `jumpToEnd()`.

## Indicator

Four `<div class="collections-nav-line">` elements, absolutely
positioned, no wrapping container styling (no background/border/padding) —
just the four line elements themselves stacked with fixed spacing.

Each frame (driven by the section's own render loop, using the same
`smoothedCarousel`-style eased value `SlideController` transitions already
produce elsewhere in this codebase):

```
closeness_i = 1 - clamp(|smoothedIndex - i|, 0, 1)
width_i     = lerp(SHORT_PX, LONG_PX, closeness_i)
color_i     = lerp(NEUTRAL_RGB, COLLECTION_RGB[i], closeness_i)   // per-channel
```

Written directly as inline `style.width` / `style.backgroundColor` each
frame — the same "compute every frame, write inline styles" technique
`HeroScene.updateAnnotations` already uses, so growth and color-change
happen together, continuously, tied to the same eased transition curve as
the panel text — never a binary swap.

Collection colors (muted/editorial, not saturated brand colors):

| Collection    | Color     | Hex       |
|---------------|-----------|-----------|
| Exclusive     | Deep navy | `#16233F` |
| Diamond Line  | Light blue| `#8FBCD4` |
| Juveler       | Emerald   | `#1F6F4A` |
| Boutique      | Ruby      | `#9C2B3C` |

Neutral (inactive) line color: a muted neutral consistent with the site's
existing ink tone (`rgba(26, 21, 18, 0.25)`, matching `.hero-object-info
.spine`'s existing neutral line color for consistency).

## Content

Placeholder copy per collection (name + one-line tagline), styled
minimally — name in the same letter-spaced small-caps treatment as the
hero's object names, tagline smaller/lighter. Exact copy is placeholder
and easy to edit later; not treated as final marketing copy.

## Testing

- `npx tsc --noEmit` after implementation.
- Manual check in the running dev server: scroll into the section, step
  forward through all 4 collections and back, confirm the indicator lines
  grow/shrink and recolor smoothly (not instantly) in sync with each
  panel transition, confirm scrolling past the last collection releases
  into whatever follows and scrolling back up from the first releases back
  into the hero.
