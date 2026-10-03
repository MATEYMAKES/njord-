import * as THREE from 'three';
import { generateBandGeometry, bandOuterRadius, type BandParams } from './generateBandGeometry';

/**
 * A bangle bracelet is structurally the same shape as the ring's band — a
 * flat-inner/domed-outer profile swept into a loop — just wrist-sized and
 * thinner. Reusing generateBandGeometry keeps this honest instead of
 * duplicating the lathe-profile math for a shape that's already correct.
 */
export const DEFAULT_BRACELET_PARAMS: BandParams = {
  innerRadius: 3.1,
  halfWidth: 0.16,
  domeSegments: 20,
  revolutionSegments: 180,
};

export function generateBraceletGeometry(params: BandParams = DEFAULT_BRACELET_PARAMS): THREE.BufferGeometry {
  const geometry = generateBandGeometry(params);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function braceletOuterRadius(params: BandParams = DEFAULT_BRACELET_PARAMS): number {
  return bandOuterRadius(params);
}
