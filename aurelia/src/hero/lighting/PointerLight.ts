import * as THREE from 'three';

/**
 * A point light that follows the cursor across the viewport (mapped into a
 * plane in front of the jewelry), so specular highlights sweep across the
 * metal as the mouse moves — independent of the ring's own rotation.
 */
export class PointerLight {
  readonly light: THREE.PointLight;

  private ndcX = 0;
  private ndcY = 0;
  private readonly targetScratch = new THREE.Vector3();

  constructor(color = 0xfff4e0, intensity = 8, distance = 30, decay = 2) {
    this.light = new THREE.PointLight(color, intensity, distance, decay);
    window.addEventListener('pointermove', this.onPointerMove);
  }

  private onPointerMove = (e: PointerEvent): void => {
    this.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
    this.ndcY = -((e.clientY / window.innerHeight) * 2 - 1);
  };

  update(anchor: THREE.Vector3, spread: number, depth: number): void {
    this.targetScratch.set(anchor.x + this.ndcX * spread, anchor.y + this.ndcY * spread, depth);
    this.light.position.lerp(this.targetScratch, 0.18);
  }

  dispose(): void {
    window.removeEventListener('pointermove', this.onPointerMove);
  }
}
