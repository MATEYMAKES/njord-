import { SlideController } from '../hero/scroll/SlideController';
import { CollectionsPinController } from './CollectionsPinController';

const SLIDE_TRANSITION_DURATION = 0.55;
const COLLECTIONS_SCROLL_VH = 350;

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
  navLineEls?: HTMLElement[];
}

const NAV_LINE_SHORT_PX = 18;
const NAV_LINE_LONG_PX = 44;
const NAV_LINE_NEUTRAL_RGB: [number, number, number] = [26, 21, 18]; // matches rgba(26,21,18,*) used elsewhere; alpha handled separately below

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Pure DOM/CSS — no Three.js. There's nothing left to render with a canvas
 * once the particle background was removed, so this just drives a couple of
 * inline-styled elements off a rAF-timed easing curve.
 */
export class CollectionsSection {
  private readonly config: CollectionsSectionConfig;
  private readonly slideController: SlideController;
  private readonly pinController: CollectionsPinController;

  private activeIndex = 0;
  private smoothedIndex = 0;
  private transitionStart = 0;
  private transitionFrom = 0;

  private rafId = 0;
  private readonly startTime = performance.now();

  constructor(pinTarget: HTMLElement, config: CollectionsSectionConfig = {}) {
    this.config = config;

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

    this.colorPanelTitles();
    this.renderLoop();
    this.updatePanels();
    this.updateNavLines();
  }

  /** Each title takes its own collection's identifying color — the same full-saturation color its indicator line reaches at closeness 1 — not a shared static tone. Set once; it never changes per-frame. */
  private colorPanelTitles(): void {
    const panels = this.config.panelEls;
    if (!panels) return;

    panels.forEach((el, i) => {
      const nameEl = el.querySelector<HTMLElement>('.name');
      const [r, g, b] = COLLECTIONS[i].color;
      if (nameEl) nameEl.style.color = `rgb(${r}, ${g}, ${b})`;
    });
  }

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
      const opacity = clamp(1 - Math.abs(delta), 0, 1);
      const translateX = delta * 60;
      el.style.opacity = String(opacity);
      el.style.transform = `translateX(${translateX}px)`;
      el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
    });
  }

  /**
   * Each line's width and color are lerped by the same closeness-to-active
   * value every frame — growth and recoloring happen together, continuously,
   * tied to the same eased smoothedIndex driving the panels. Never a binary
   * swap.
   */
  private updateNavLines(): void {
    const lines = this.config.navLineEls;
    if (!lines) return;

    lines.forEach((el, i) => {
      const closeness = clamp(1 - Math.abs(this.smoothedIndex - i), 0, 1);
      const width = lerp(NAV_LINE_SHORT_PX, NAV_LINE_LONG_PX, closeness);
      const [nr, ng, nb] = NAV_LINE_NEUTRAL_RGB;
      const [cr, cg, cb] = COLLECTIONS[i].color;
      const r = Math.round(lerp(nr, cr, closeness));
      const g = Math.round(lerp(ng, cg, closeness));
      const b = Math.round(lerp(nb, cb, closeness));
      // Neutral resting state uses the same 0.25 alpha as the rest of the
      // site's neutral line color; full color at closeness 1 renders fully
      // opaque so it actually reads as that collection's identifying color
      // rather than a tint.
      const alpha = lerp(0.25, 1, closeness);
      el.style.width = `${width}px`;
      el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    });
  }

  private onIndexChange(next: number): void {
    this.activeIndex = next;
    this.transitionStart = (performance.now() - this.startTime) / 1000;
    this.transitionFrom = this.smoothedIndex;
  }

  private renderLoop = (): void => {
    this.rafId = requestAnimationFrame(this.renderLoop);

    const elapsed = (performance.now() - this.startTime) / 1000;

    // Quintic smootherstep (not cubic smoothstep) — gentler acceleration in
    // and out of the transition, so the panel/indicator motion reads as
    // smooth rather than eased-but-still-snappy.
    const t = clamp((elapsed - this.transitionStart) / SLIDE_TRANSITION_DURATION, 0, 1);
    const easeT = t * t * t * (t * (t * 6 - 15) + 10);
    this.smoothedIndex = lerp(this.transitionFrom, this.activeIndex, easeT);

    this.updatePanels();
    this.updateNavLines();
  };

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.slideController.dispose();
    this.pinController.dispose();
  }
}
