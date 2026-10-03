const WHEEL_THRESHOLD = 6;
const TOUCH_THRESHOLD = 40;

export interface SlideControllerOptions {
  slideCount: number;
  /** How long a triggered transition + its settle-hold should block further input, in ms. */
  lockDurationMs: number;
  loop: boolean;
  /** direction is the raw gesture direction (1 = advance, -1 = retreat) — even across a loop wrap, so callers can position things along the actual navigation direction rather than the raw index delta. */
  onIndexChange: (index: number, previousIndex: number, direction: 1 | -1) => void;
  onExitForward: () => void;
  onExitBackward?: () => void;
}

/**
 * Event-driven slide navigation: each wheel tick / swipe / arrow key is a
 * discrete trigger that advances or retreats a slide INDEX, not a
 * continuous scroll position being read back. Once triggered, further
 * input is ignored for `lockDurationMs` (covering both the transition
 * animation and a settle hold), so one scroll gesture always resolves to
 * exactly one step — never a magnitude- or position-dependent jump.
 */
export class SlideController {
  index = 0;
  enabled = false;

  private locked = false;
  private lockTimeoutId = 0;
  private touchStartY = 0;
  private touchActive = false;
  private readonly opts: SlideControllerOptions;

  constructor(opts: SlideControllerOptions) {
    this.opts = opts;
    window.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
  }

  private onWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();
    if (this.locked) return;
    if (e.deltaY > WHEEL_THRESHOLD) this.advance(1);
    else if (e.deltaY < -WHEEL_THRESHOLD) this.advance(-1);
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (!this.enabled) return;
    this.touchStartY = e.touches[0]?.clientY ?? 0;
    this.touchActive = true;
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.enabled || !this.touchActive) return;
    e.preventDefault();
    if (this.locked) return;
    const y = e.touches[0]?.clientY ?? this.touchStartY;
    const delta = this.touchStartY - y;
    if (Math.abs(delta) > TOUCH_THRESHOLD) {
      this.touchActive = false;
      this.advance(delta > 0 ? 1 : -1);
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled || this.locked) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      this.advance(1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      this.advance(-1);
    }
  };

  private advance(direction: 1 | -1): void {
    const next = this.index + direction;

    if (next >= this.opts.slideCount) {
      this.opts.onExitForward();
      return;
    }
    if (next < 0) {
      if (this.opts.loop) {
        this.setIndex(this.opts.slideCount - 1, direction);
      } else {
        this.opts.onExitBackward?.();
      }
      return;
    }
    this.setIndex(next, direction);
  }

  private setIndex(next: number, direction: 1 | -1): void {
    const previous = this.index;
    this.index = next;
    this.opts.onIndexChange(next, previous, direction);
    this.lockFor(this.opts.lockDurationMs);
  }

  /** Blocks further triggers for `ms` without changing the index — used for the initial settle hold. */
  lockFor(ms: number): void {
    this.locked = true;
    window.clearTimeout(this.lockTimeoutId);
    this.lockTimeoutId = window.setTimeout(() => {
      this.locked = false;
    }, ms);
  }

  dispose(): void {
    window.clearTimeout(this.lockTimeoutId);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
