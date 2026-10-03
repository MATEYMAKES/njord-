# Collections Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new pinned, discrete-step, 4-collection section (Exclusive / Diamond Line / Juveler / Boutique) directly after the hero, with a minimal color-coded 4-line indicator whose length and color continuously ease with the active transition, and a purely decorative gold particle background.

**Architecture:** A new `CollectionsSection` orchestrator class (mirroring `HeroScene`'s structure, much smaller) owns its own Three.js renderer/scene/camera/particle-background render loop, a reused `SlideController` for discrete step navigation (`slideCount: 4, loop: false`), and a new small `CollectionsPinController` (GSAP `ScrollTrigger` wrapper) for pin/release timing. No 3D jewelry, no scroll-scrubbed continuous panning, no particle/jewelry interaction — text panels + an indicator only.

**Tech Stack:** TypeScript, Three.js (reusing `src/hero/particles/ParticleSystem.ts` unchanged), GSAP `ScrollTrigger`, Vite. No test framework exists in this project (`package.json` has no test script) — verification is `npx tsc --noEmit` plus manual checks in the running dev server (`npm run dev`, currently already running at `http://localhost:5173`), matching how every prior feature in this codebase has been verified.

**Spec:** `docs/superpowers/specs/2026-09-24-collections-section-design.md`

## Global Constraints

- No 3D jewelry geometry per collection — text panels only (spec: Content).
- Navigation is discrete-step (one wheel tick/swipe/arrow key = one collection), not continuous scroll-scrubbed panning (spec: Non-goals).
- The particle background is purely decorative — `formationProgress` is always `0`, particles never form/dissolve into anything (spec: Non-goals, Structure).
- Indicator has no numbers/labels/dots/containers/backgrounds — just the four line elements themselves (spec: Indicator).
- Indicator line width and color must be continuously eased (per-frame lerp), never a binary state change (spec: Indicator).
- Collection colors: Exclusive `#16233F`, Diamond Line `#8FBCD4`, Juveler `#1F6F4A`, Boutique `#9C2B3C`. Neutral inactive color: `rgba(26, 21, 18, 0.25)` (spec: Indicator).

---

## Task 1: Markup + CSS scaffold

**Files:**
- Modify: `index.html:132-135` (replace the `#after-hero` placeholder)
- Modify: `src/style.css` (append new rules; remove the old `#after-hero` rule)

**Interfaces:**
- Produces: DOM structure and element IDs that Task 4 (`main.ts`) queries: `#collections-canvas`, `#collections-wrapper`, `.collections-panel` (×4, each with a `.name` and `.tagline` child), `.collections-nav-line` (×4).

- [ ] **Step 1: Replace the `#after-hero` section in `index.html`**

Find this block (currently right after `#hero-wrapper`'s closing `</div>`):

```html
    <section id="after-hero">
      <p>The rest of the Aurelia site continues here.</p>
    </section>
```

Replace it with:

```html
    <section id="collections-wrapper">
      <canvas id="collections-canvas"></canvas>

      <div class="collections-panels">
        <div class="collections-panel">
          <p class="name">Exclusive</p>
          <p class="tagline">Rare pieces, singular ownership.</p>
        </div>
        <div class="collections-panel">
          <p class="name">Diamond Line</p>
          <p class="tagline">Precision-cut, endlessly worn.</p>
        </div>
        <div class="collections-panel">
          <p class="name">Juveler</p>
          <p class="tagline">Craft passed from hand to hand.</p>
        </div>
        <div class="collections-panel">
          <p class="name">Boutique</p>
          <p class="tagline">The everyday, made deliberate.</p>
        </div>
      </div>

      <div class="collections-nav">
        <span class="collections-nav-line"></span>
        <span class="collections-nav-line"></span>
        <span class="collections-nav-line"></span>
        <span class="collections-nav-line"></span>
      </div>
    </section>
    <section id="after-collections">
      <p>The rest of the Aurelia site continues here.</p>
    </section>
```

- [ ] **Step 2: Add the CSS**

In `src/style.css`, replace the existing `#after-hero` rule:

```css
#after-hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(26, 21, 18, 0.55);
}
```

with:

```css
#after-collections {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(26, 21, 18, 0.55);
}

/* ---------- Collections section ----------
   Pinned, discrete-step 4-collection carousel. Positioning/sizing mirrors
   #hero-wrapper/#hero-canvas exactly. All panel/indicator motion is written
   as inline styles every frame by CollectionsSection — no CSS transitions
   here, since the eased value driving them is already smoothed per-frame. */

#collections-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #ffffff;
}

#collections-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.collections-panels {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.collections-panel {
  position: absolute;
  text-align: center;
  font-family: 'Georgia', 'Times New Roman', serif;
}

.collections-panel .name {
  margin: 0 0 0.6rem;
  font-size: clamp(2rem, 5vw, 3.4rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1a1512;
}

.collections-panel .tagline {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.06em;
  color: rgba(26, 21, 18, 0.55);
}

.collections-nav {
  position: absolute;
  right: clamp(2rem, 6vw, 4rem);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 14px;
  pointer-events: none;
}

.collections-nav-line {
  display: block;
  height: 1px;
  background: rgba(26, 21, 18, 0.25);
}
```

- [ ] **Step 3: Verify**

Run `npx tsc --noEmit -p tsconfig.json` — should still pass (this step touches no `.ts` files). Load `http://localhost:5173` in the dev server, scroll past the hero: you should see a white section with the four collection names statically overlapping (no JS yet, so they'll all render stacked at once — that's expected until Task 4) and four short gray lines on the right edge. No console errors.

- [ ] **Step 4: Commit**

No git repo in this project — skip. (If one exists by the time this runs, `git add index.html src/style.css && git commit -m "Add collections section markup and CSS scaffold"`.)

---

## Task 2: `CollectionsPinController`

**Files:**
- Create: `src/collections/CollectionsPinController.ts`

**Interfaces:**
- Consumes: `gsap`, `gsap/ScrollTrigger` (already a project dependency, already registered as a plugin elsewhere — see `src/hero/scroll/ScrollController.ts:1-4` for the exact registration pattern to follow).
- Produces:
  ```ts
  export interface CollectionsPinControllerOptions {
    pinTarget: HTMLElement;
    scrollDistanceVh: number;
    onEnter: () => void;
    onEnterBack: () => void;
    onLeave: () => void;
    onLeaveBack: () => void;
  }

  export class CollectionsPinController {
    constructor(opts: CollectionsPinControllerOptions);
    jumpToEnd(): void;
    jumpToStart(): void;
    refresh(): void;
    dispose(): void;
  }
  ```
  Consumed by Task 6 (`CollectionsSection`'s constructor and `onSlideExitForward`/`onSlideExitBackward`).

- [ ] **Step 1: Write the file**

```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface CollectionsPinControllerOptions {
  pinTarget: HTMLElement;
  scrollDistanceVh: number;
  onEnter: () => void;
  onEnterBack: () => void;
  onLeave: () => void;
  onLeaveBack: () => void;
}

/**
 * Pins the collections section for a fixed scroll distance, purely for
 * pin/release timing — unlike the hero's ScrollController, nothing here
 * reads a continuous scrub progress, since collection navigation is
 * discrete-step (see SlideController), not scroll-position-driven.
 */
export class CollectionsPinController {
  private trigger: ScrollTrigger;

  constructor(opts: CollectionsPinControllerOptions) {
    this.trigger = ScrollTrigger.create({
      trigger: opts.pinTarget,
      start: 'top top',
      end: `+=${opts.scrollDistanceVh}%`,
      pin: true,
      scrub: true,
      anticipatePin: 1,
      onEnter: opts.onEnter,
      onEnterBack: opts.onEnterBack,
      onLeave: opts.onLeave,
      onLeaveBack: opts.onLeaveBack,
    });
  }

  /** Releases the pin forward — used once SlideController has exited past the last collection. */
  jumpToEnd(): void {
    this.trigger.scroll(this.trigger.end);
  }

  /** Releases the pin backward — used once SlideController has exited before the first collection. */
  jumpToStart(): void {
    this.trigger.scroll(this.trigger.start);
  }

  refresh(): void {
    ScrollTrigger.refresh();
  }

  dispose(): void {
    this.trigger.kill();
  }
}
```

- [ ] **Step 2: Verify**

Run `npx tsc --noEmit -p tsconfig.json` — must pass with no errors (this file isn't imported anywhere yet, so it just needs to type-check standalone).

- [ ] **Step 3: Commit**

Skip (no git repo) — see Task 1 Step 4.

---

## Task 3: `CollectionsSection` — particle background + render loop

**Files:**
- Create: `src/collections/CollectionsSection.ts`

**Interfaces:**
- Consumes:
  - `ParticleSystem` from `src/hero/particles/ParticleSystem.ts` — constructor `(ringGeometry: THREE.BufferGeometry, particleCount: number, baseSize: number)`, methods `update(progress: number, elapsedTime: number): void`, `setPixelRatio(dpr: number): void`, `dispose(): void`. (See `src/hero/particles/ParticleSystem.ts:14-45`.)
  - `generateRingGeometry` from `src/hero/jewelry/generateRingGeometry.ts` — used only as the shape `ParticleSystem` samples toward; since `formationProgress` is always `0`, particles never actually reach it (see Global Constraints).
  - `getLodProfile` from `src/hero/mobile/lod.ts` — same particle-count/size/DPR profile the hero uses (see `src/hero/HeroScene.ts:147` for its usage pattern: `const lod = getLodProfile();` then `lod.particleCount`, `lod.pointBaseSize`, `lod.dpr`).
- Produces (this task only): a `CollectionsSection` class with a constructor `(canvas: HTMLCanvasElement, pinTarget: HTMLElement)` that renders the atmospheric particle field and a `dispose()` method. Task 5 will extend the constructor's config parameter and the render loop; Task 6 will extend it further. This task intentionally leaves out panel/indicator/navigation wiring — verify with the particle background alone first.

- [ ] **Step 1: Write the file**

```ts
import * as THREE from 'three';
import { generateRingGeometry } from '../hero/jewelry/generateRingGeometry';
import { ParticleSystem } from '../hero/particles/ParticleSystem';
import { getLodProfile } from '../hero/mobile/lod';

export class CollectionsSection {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly particleSystem: ParticleSystem;

  private rafId = 0;

  constructor(canvas: HTMLCanvasElement, _pinTarget: HTMLElement) {
    const lod = getLodProfile();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(lod.dpr);
    this.renderer.setClearColor(0xffffff, 1);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);

    // Reused purely as the shape ParticleSystem's curl-noise biases toward —
    // formationProgress is always held at 0 in renderLoop, so the particles
    // never actually converge into it. See Global Constraints.
    const ring = generateRingGeometry();
    this.particleSystem = new ParticleSystem(ring.geometry, lod.particleCount, lod.pointBaseSize);
    this.scene.add(this.particleSystem.points, this.particleSystem.lines);

    this.resize();
    window.addEventListener('resize', this.resize);

    this.renderLoop();
  }

  private resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.particleSystem.setPixelRatio(this.renderer.getPixelRatio());
  };

  private renderLoop = (): void => {
    this.rafId = requestAnimationFrame(this.renderLoop);

    const elapsed = this.clock.getElapsedTime();
    this.particleSystem.update(0, elapsed);

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resize);
    this.particleSystem.dispose();
    this.renderer.dispose();
  }
}
```

- [ ] **Step 2: Wire it up temporarily in `main.ts` to verify, then leave it in (Task 6 will extend this same call)**

Add to `src/main.ts` (after the existing `new HeroScene(...)` call):

```ts
import { CollectionsSection } from './collections/CollectionsSection';

const collectionsCanvas = document.querySelector<HTMLCanvasElement>('#collections-canvas')!;
const collectionsWrapper = document.querySelector<HTMLElement>('#collections-wrapper')!;

new CollectionsSection(collectionsCanvas, collectionsWrapper);
```

- [ ] **Step 3: Verify**

Run `npx tsc --noEmit -p tsconfig.json` — must pass. In the dev server, scroll past the hero into the collections section: you should see the same drifting gold particle cloud as the hero's pre-scroll state, never converging into a ring or any shape, sitting behind the (still-static, unpositioned) panel text from Task 1. No console errors.

- [ ] **Step 4: Commit**

Skip (no git repo) — see Task 1 Step 4.

---

## Task 4: Collection data + panel cross-fade

**Files:**
- Modify: `src/collections/CollectionsSection.ts`

**Interfaces:**
- Consumes: the `CollectionsSection` class from Task 3 (extends it in place — no new file).
- Produces:
  ```ts
  export interface CollectionsSectionConfig {
    panelEls?: HTMLElement[];
  }
  ```
  added as a third constructor parameter (defaulting to `{}`, matching `HeroSceneConfig`'s pattern in `src/hero/HeroScene.ts:64-76`). Consumed by Task 6's `main.ts` wiring.

- [ ] **Step 1: Add the collection data, config type, and slide-transition timing state**

In `src/collections/CollectionsSection.ts`, add near the top (after the imports):

```ts
const SLIDE_TRANSITION_DURATION = 0.75;

interface CollectionData {
  name: string;
  color: [number, number, number];
}

const COLLECTIONS: CollectionData[] = [
  { name: 'Exclusive', color: [0x16, 0x23, 0x3f] },
  { name: 'Diamond Line', color: [0x8f, 0xbc, 0xd4] },
  { name: 'Juveler', color: [0x1f, 0x6f, 0x4a] },
  { name: 'Boutique', color: [0x9c, 0x2b, 0x3b] },
];

export interface CollectionsSectionConfig {
  panelEls?: HTMLElement[];
}
```

- [ ] **Step 2: Add the config parameter and panel-transition state to the class**

Change the constructor signature and add fields:

```ts
export class CollectionsSection {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly particleSystem: ParticleSystem;
  private readonly config: CollectionsSectionConfig;

  private activeIndex = 0;
  private smoothedIndex = 0;
  private transitionStart = 0;
  private transitionFrom = 0;

  private rafId = 0;

  constructor(canvas: HTMLCanvasElement, _pinTarget: HTMLElement, config: CollectionsSectionConfig = {}) {
    this.config = config;
    const lod = getLodProfile();

    // ... (renderer/camera/particleSystem setup unchanged from Task 3) ...
```

(Everything else in the constructor body stays exactly as Task 3 wrote it — only the signature and the two new lines `this.config = config;` at the top change.)

- [ ] **Step 3: Add a method to update panel positions, and call it every frame**

Add this method to the class:

```ts
  /**
   * Cross-fades/slides each panel based on its distance from smoothedIndex
   * — no wrap-around (loop: false), so this is a plain linear delta, unlike
   * the hero's modular wrap. Written as inline styles every frame, same
   * technique as HeroScene.updateAnnotations.
   */
  private updatePanels(): void {
    const panels = this.config.panelEls;
    if (!panels) return;

    panels.forEach((el, i) => {
      const delta = i - this.smoothedIndex;
      const opacity = THREE.MathUtils.clamp(1 - Math.abs(delta) * 1.4, 0, 1);
      const translateX = delta * 60;
      el.style.opacity = String(opacity);
      el.style.transform = `translateX(${translateX}px)`;
      el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
    });
  }
```

- [ ] **Step 4: Advance `smoothedIndex` and call `updatePanels()` in the render loop**

Replace the render loop's body:

```ts
  private renderLoop = (): void => {
    this.rafId = requestAnimationFrame(this.renderLoop);

    const elapsed = this.clock.getElapsedTime();
    this.particleSystem.update(0, elapsed);

    const t = THREE.MathUtils.clamp((elapsed - this.transitionStart) / SLIDE_TRANSITION_DURATION, 0, 1);
    const easeT = t * t * (3 - 2 * t);
    this.smoothedIndex = THREE.MathUtils.lerp(this.transitionFrom, this.activeIndex, easeT);

    this.updatePanels();

    this.renderer.render(this.scene, this.camera);
  };
```

- [ ] **Step 5: Add an `onIndexChange` handler that Task 5 (SlideController) will call, and initialize panel positions immediately**

Add this method:

```ts
  private onIndexChange(next: number): void {
    this.activeIndex = next;
    this.transitionStart = this.clock.getElapsedTime();
    this.transitionFrom = this.smoothedIndex;
  }
```

At the end of the constructor (after `this.renderLoop();`), add:

```ts
    this.updatePanels();
```

so the four panels are positioned correctly (panel 0 centered, opacity 1; others faded out to the sides) on first paint, before any navigation happens — otherwise they'd render all-centered-and-stacked from the CSS defaults for one frame.

- [ ] **Step 6: Verify**

Run `npx tsc --noEmit -p tsconfig.json` — will report `onIndexChange` as an unused private method, which is expected and fine (Task 5 wires it up next); confirm there are no other errors. In the dev server, refresh: the "Exclusive" panel should now be centered and fully opaque, with the other three faded out and shifted to the sides (no longer all stacked at full opacity like in Task 1's screenshot).

- [ ] **Step 7: Commit**

Skip (no git repo) — see Task 1 Step 4.

---

## Task 5: Indicator lines

**Files:**
- Modify: `src/collections/CollectionsSection.ts`

**Interfaces:**
- Consumes: `COLLECTIONS` array and `smoothedIndex` field from Task 4.
- Produces: extends `CollectionsSectionConfig` with `navLineEls?: HTMLElement[]`, consumed by Task 6's `main.ts` wiring.

- [ ] **Step 1: Extend the config interface**

```ts
export interface CollectionsSectionConfig {
  panelEls?: HTMLElement[];
  navLineEls?: HTMLElement[];
}
```

- [ ] **Step 2: Add the indicator constants near `SLIDE_TRANSITION_DURATION`**

```ts
const NAV_LINE_SHORT_PX = 18;
const NAV_LINE_LONG_PX = 44;
const NAV_LINE_NEUTRAL_RGB: [number, number, number] = [26, 21, 18]; // matches rgba(26,21,18,*) used elsewhere; alpha handled separately below
```

- [ ] **Step 3: Add the indicator update method**

```ts
  /**
   * Each line's width and color are lerped by the same closeness-to-active
   * value every frame — growth and recoloring happen together, continuously,
   * tied to the same eased smoothedIndex driving the panels. Never a binary
   * swap (see Global Constraints).
   */
  private updateNavLines(): void {
    const lines = this.config.navLineEls;
    if (!lines) return;

    lines.forEach((el, i) => {
      const closeness = THREE.MathUtils.clamp(1 - Math.abs(this.smoothedIndex - i), 0, 1);
      const width = THREE.MathUtils.lerp(NAV_LINE_SHORT_PX, NAV_LINE_LONG_PX, closeness);
      const [nr, ng, nb] = NAV_LINE_NEUTRAL_RGB;
      const [cr, cg, cb] = COLLECTIONS[i].color;
      const r = Math.round(THREE.MathUtils.lerp(nr, cr, closeness));
      const g = Math.round(THREE.MathUtils.lerp(ng, cg, closeness));
      const b = Math.round(THREE.MathUtils.lerp(nb, cb, closeness));
      // Neutral resting state uses the same 0.25 alpha as the rest of the
      // site's neutral line color (see Global Constraints); full color at
      // closeness 1 renders fully opaque so it actually reads as that
      // collection's identifying color rather than a tint.
      const alpha = THREE.MathUtils.lerp(0.25, 1, closeness);
      el.style.width = `${width}px`;
      el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    });
  }
```

- [ ] **Step 4: Call it from the render loop and on initial paint**

In `renderLoop`, right after `this.updatePanels();`, add:

```ts
    this.updateNavLines();
```

And in the constructor, right after the `this.updatePanels();` line added in Task 4 Step 5, add:

```ts
    this.updateNavLines();
```

- [ ] **Step 5: Verify**

Run `npx tsc --noEmit -p tsconfig.json` — must pass. In the dev server, refresh: the first indicator line should now render long and in the "Exclusive" navy color, the other three short and neutral gray. (Navigation to change which one is active comes in Task 6.)

- [ ] **Step 6: Commit**

Skip (no git repo) — see Task 1 Step 4.

---

## Task 6: Wire discrete navigation + pin release + `main.ts`

**Files:**
- Modify: `src/collections/CollectionsSection.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes:
  - `SlideController` from `src/hero/scroll/SlideController.ts` — constructor takes `SlideControllerOptions` (`slideCount: number; lockDurationMs: number; loop: boolean; onIndexChange: (index: number, previousIndex: number, direction: 1 | -1) => void; onExitForward: () => void; onExitBackward?: () => void;`), plus `enabled: boolean` field and `dispose(): void` method. (See `src/hero/scroll/SlideController.ts:4-12` and `:23-24`.)
  - `CollectionsPinController` from Task 2.
- Produces: a fully working `CollectionsSection` — final public interface `constructor(canvas: HTMLCanvasElement, pinTarget: HTMLElement, config?: CollectionsSectionConfig)`, `dispose(): void`.

- [ ] **Step 1: Import the two controllers**

At the top of `src/collections/CollectionsSection.ts`:

```ts
import { SlideController } from '../hero/scroll/SlideController';
import { CollectionsPinController } from './CollectionsPinController';
```

- [ ] **Step 2: Add the pin distance constant and the two controller fields**

```ts
const COLLECTIONS_SCROLL_VH = 350;
```

Add fields to the class:

```ts
  private readonly slideController: SlideController;
  private readonly pinController: CollectionsPinController;
```

- [ ] **Step 3: Construct both controllers at the end of the constructor**

Replace the constructor's final lines (`this.resize(); window.addEventListener('resize', this.resize); this.renderLoop(); this.updatePanels(); this.updateNavLines();`) with:

```ts
    this.resize();
    window.addEventListener('resize', this.resize);

    this.slideController = new SlideController({
      slideCount: COLLECTIONS.length,
      lockDurationMs: SLIDE_TRANSITION_DURATION * 1000 + 900,
      loop: false,
      onIndexChange: (next) => this.onIndexChange(next),
      onExitForward: () => this.onExitForward(),
      onExitBackward: () => this.onExitBackward(),
    });

    this.pinController = new CollectionsPinController({
      pinTarget,
      scrollDistanceVh: COLLECTIONS_SCROLL_VH,
      onEnter: () => {
        this.slideController.enabled = true;
      },
      onEnterBack: () => {
        this.slideController.enabled = true;
      },
      onLeave: () => {
        this.slideController.enabled = false;
      },
      onLeaveBack: () => {
        this.slideController.enabled = false;
      },
    });

    this.renderLoop();
    this.updatePanels();
    this.updateNavLines();
```

Also change the constructor's second parameter name from `_pinTarget` to `pinTarget` (it's now used, instead of the placeholder unused-param name from Task 3):

```ts
  constructor(canvas: HTMLCanvasElement, pinTarget: HTMLElement, config: CollectionsSectionConfig = {}) {
```

- [ ] **Step 4: Add the exit handlers**

```ts
  /** Past the last collection: release the pin forward into whatever follows (#after-collections). */
  private onExitForward(): void {
    this.slideController.enabled = false;
    this.pinController.jumpToEnd();
  }

  /** Before the first collection: release the pin backward into the hero. */
  private onExitBackward(): void {
    this.slideController.enabled = false;
    this.pinController.jumpToStart();
  }
```

- [ ] **Step 5: Dispose both controllers**

Update `dispose()`:

```ts
  dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resize);
    this.slideController.dispose();
    this.pinController.dispose();
    this.particleSystem.dispose();
    this.renderer.dispose();
  }
```

- [ ] **Step 6: Wire real config in `main.ts`**

Replace the temporary Task 3 wiring:

```ts
new CollectionsSection(collectionsCanvas, collectionsWrapper);
```

with:

```ts
new CollectionsSection(collectionsCanvas, collectionsWrapper, {
  panelEls: Array.from(document.querySelectorAll<HTMLElement>('.collections-panel')),
  navLineEls: Array.from(document.querySelectorAll<HTMLElement>('.collections-nav-line')),
});
```

- [ ] **Step 7: Verify — full manual QA pass**

Run `npx tsc --noEmit -p tsconfig.json` — must pass with zero errors.

In the dev server (`http://localhost:5173`):

1. Scroll through the hero to the end (past the earrings, releasing the hero's pin) — confirm it now scrolls into the collections section and pins there.
2. Scroll/wheel forward one step at a time through all 4 collections: confirm each step is a single discrete jump (not proportional to scroll speed/distance), the panel text cross-fades and shifts, and the indicator line for the new active collection grows and takes on its color while the previous one shrinks and fades back to neutral — watch closely that this happens gradually over the transition, not instantly.
3. From the 4th collection (Boutique), scroll forward once more: confirm the pin releases and you continue scrolling into `#after-collections`.
4. Scroll back up from `#after-collections` into Boutique, then step backward through all 4 back to Exclusive.
5. From Exclusive (index 0), scroll backward once more: confirm the pin releases backward and you scroll back up into the hero (specifically back into the earrings, the hero's last slide).
6. Confirm no console errors throughout, and confirm the particle background never converges into any shape at any point in this section.

- [ ] **Step 8: Commit**

Skip (no git repo) — see Task 1 Step 4.

---

## Self-Review Notes

- **Spec coverage:** Structure (Task 1, 3, 6), particle background reuse (Task 3), indicator continuous easing + colors (Task 5), content/copy (Task 1), pin/release symmetry (Task 2, 6), testing approach (every task's Verify step) — all covered.
- **No placeholders:** every step has literal code, not descriptions.
- **Type consistency:** `CollectionsSectionConfig.panelEls`/`navLineEls` names match between Task 4/5 (definition) and Task 6 (`main.ts` usage); `CollectionsPinControllerOptions` field names match between Task 2 (definition) and Task 6 (usage); `onIndexChange`/`onExitForward`/`onExitBackward` signatures match `SlideControllerOptions` as already defined in the existing `src/hero/scroll/SlideController.ts`.
