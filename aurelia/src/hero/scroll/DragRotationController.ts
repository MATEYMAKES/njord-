/**
 * Free, inertial drag rotation for the fully-formed jewelry. Only active
 * once `enabled` is set (formation complete). No angular clamp — the piece
 * can be spun all the way around, in any direction, and coasts on release.
 */
export class DragRotationController {
  enabled = false;

  private rotation = { x: 0, y: 0 };
  private velocity = { x: 0, y: 0 };
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };

  private readonly sensitivity = 0.006;
  private readonly friction = 0.94;
  private readonly element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
    element.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled) return;
    this.dragging = true;
    this.lastPointer = { x: e.clientX, y: e.clientY };
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging || !this.enabled) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };

    this.velocity.y = dx * this.sensitivity;
    this.velocity.x = dy * this.sensitivity;
  };

  private onPointerUp = (): void => {
    this.dragging = false;
  };

  update(): { x: number; y: number } {
    if (!this.dragging) {
      this.velocity.x *= this.friction;
      this.velocity.y *= this.friction;
    }

    this.rotation.x += this.velocity.x;
    this.rotation.y += this.velocity.y;

    return this.rotation;
  }

  dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }
}
