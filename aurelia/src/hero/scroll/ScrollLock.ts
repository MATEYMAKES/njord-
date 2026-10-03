const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);

/**
 * Freezes page scroll for a fixed duration — used to hold the viewport at
 * the fully-formed ring long enough for the side panel's staggered reveal
 * to actually play out, instead of letting a fast scroll gesture carry
 * straight past it. Blocks wheel/touch/keyboard input and snaps back if
 * scroll position drifts anyway (e.g. touch momentum already in flight).
 */
export class ScrollLock {
  private timeoutId = 0;
  private active = false;
  private lockY = 0;

  private readonly preventEvent = (e: Event): void => {
    e.preventDefault();
  };

  private readonly preventKey = (e: KeyboardEvent): void => {
    if (SCROLL_KEYS.has(e.key)) e.preventDefault();
  };

  private readonly resnap = (): void => {
    if (window.scrollY !== this.lockY) window.scrollTo(0, this.lockY);
  };

  engage(durationMs: number): void {
    if (this.active) window.clearTimeout(this.timeoutId);
    this.active = true;
    this.lockY = window.scrollY;

    window.addEventListener('wheel', this.preventEvent, { passive: false });
    window.addEventListener('touchmove', this.preventEvent, { passive: false });
    window.addEventListener('keydown', this.preventKey, { passive: false });
    window.addEventListener('scroll', this.resnap, { passive: true });

    this.timeoutId = window.setTimeout(() => this.release(), durationMs);
  }

  release(): void {
    if (!this.active) return;
    this.active = false;
    window.clearTimeout(this.timeoutId);
    window.removeEventListener('wheel', this.preventEvent);
    window.removeEventListener('touchmove', this.preventEvent);
    window.removeEventListener('keydown', this.preventKey);
    window.removeEventListener('scroll', this.resnap);
  }

  dispose(): void {
    this.release();
  }
}
