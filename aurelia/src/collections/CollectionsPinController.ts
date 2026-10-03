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

  /**
   * Releases the pin backward — used once SlideController has exited before
   * the first collection. Scrolling to exactly `start` re-enters the pinned
   * range (GSAP treats `start` as inclusive), which would immediately
   * re-trigger onEnterBack and trap the user oscillating right at the
   * boundary — so this lands a few pixels above it instead, genuinely past
   * the pin, back into the hero.
   */
  jumpToStart(): void {
    this.trigger.scroll(Math.max(0, this.trigger.start - 2));
  }

  refresh(): void {
    ScrollTrigger.refresh();
  }

  dispose(): void {
    this.trigger.kill();
  }
}
