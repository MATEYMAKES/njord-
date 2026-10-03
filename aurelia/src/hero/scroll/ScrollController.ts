import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class ScrollController {
  private trigger: ScrollTrigger;

  constructor(pinTarget: HTMLElement, scrollDistanceVh: number, onProgress: (progress: number) => void) {
    this.trigger = ScrollTrigger.create({
      trigger: pinTarget,
      start: 'top top',
      end: `+=${scrollDistanceVh}%`,
      pin: true,
      scrub: true,
      anticipatePin: 1,
      onUpdate: (self) => onProgress(self.progress),
    });
  }

  refresh(): void {
    ScrollTrigger.refresh();
  }

  /**
   * Jumps the real scroll position straight to the end of the pin range,
   * releasing it immediately. Used once SlideController has taken over —
   * scroll position no longer drives anything visual at that point, so
   * there's no reason to make the user keep scrolling through whatever's
   * left of the trailing buffer before the pin lets go.
   */
  jumpToEnd(): void {
    this.trigger.scroll(this.trigger.end);
  }

  dispose(): void {
    this.trigger.kill();
  }
}
