import * as THREE from 'three';
import { mulberry32 } from '../utils/random';

const FORM_ORDER_SEED = 4242;
const JITTER = 0.12;

/**
 * Per-vertex scalar in [0,1] describing when that point of the mesh
 * "solidifies" during the reveal stage. Grows outward from `seedPoint` (the
 * gem's culet) so the solid stage reads as crystal growth rather than a
 * uniform fade-in. Deterministic: same geometry + seed point -> same order.
 */
export function computeFormOrder(geometry: THREE.BufferGeometry, seedPoint: THREE.Vector3): Float32Array {
  const position = geometry.attributes.position;
  const count = position.count;
  const rng = mulberry32(FORM_ORDER_SEED);

  const order = new Float32Array(count);
  let maxDist = 0;
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(position, i);
    const d = v.distanceTo(seedPoint);
    order[i] = d;
    if (d > maxDist) maxDist = d;
  }

  for (let i = 0; i < count; i++) {
    const normalized = maxDist > 0 ? order[i] / maxDist : 0;
    const jitter = (rng() - 0.5) * JITTER;
    order[i] = THREE.MathUtils.clamp(normalized + jitter, 0, 1);
  }

  return order;
}
