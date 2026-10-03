import * as THREE from 'three';
import { computeFormOrder } from './formOrder';
import { createSolidMaterial, type SolidMaterialHandle } from '../materials/solidMaterial';

export class JewelryMesh {
  readonly mesh: THREE.Mesh;
  private readonly handle: SolidMaterialHandle;

  constructor(ringGeometry: THREE.BufferGeometry, seedPoint: THREE.Vector3, envMap: THREE.Texture) {
    const formOrder = computeFormOrder(ringGeometry, seedPoint);
    ringGeometry.setAttribute('aFormOrder', new THREE.Float32BufferAttribute(formOrder, 1));

    this.handle = createSolidMaterial(envMap);
    this.mesh = new THREE.Mesh(ringGeometry, this.handle.material);
    this.mesh.frustumCulled = false;
  }

  /**
   * progress in [0,1] across the full scroll range. Reveal completes by 0.9,
   * not 1.0 — leaving a held buffer at the end of the scroll range so the
   * ring is guaranteed fully solid before the pin releases, instead of
   * racing the very last pixel of scroll.
   */
  update(progress: number): void {
    const reveal = THREE.MathUtils.smoothstep(progress, 0.75, 0.9);
    this.handle.uniforms.uReveal.value = reveal;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.handle.material.dispose();
  }
}
