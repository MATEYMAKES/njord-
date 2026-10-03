import * as THREE from 'three';
import { generateBandGeometry, bandOuterRadius, DEFAULT_BAND_PARAMS, type BandParams } from './generateBandGeometry';

export interface RingGeometryResult {
  geometry: THREE.BufferGeometry;
  /** World-space point the band grows from during the reveal stage. */
  seedPoint: THREE.Vector3;
}

/**
 * The single source of truth for the jewelry: one indexed BufferGeometry
 * (the band) that the particle sampler, connection graph, and solid mesh
 * all read from, so every stage aligns exactly.
 */
export function generateRingGeometry(bandParams: BandParams = DEFAULT_BAND_PARAMS): RingGeometryResult {
  const geometry = generateBandGeometry(bandParams);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const seedPoint = new THREE.Vector3(0, -bandOuterRadius(bandParams), 0);

  return { geometry, seedPoint };
}
