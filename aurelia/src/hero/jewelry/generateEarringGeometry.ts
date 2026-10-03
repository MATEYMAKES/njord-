import * as THREE from 'three';

/**
 * A single earring: a low-poly faceted gold bead. IcosahedronGeometry at
 * detail 0 gives 20 flat triangular facets, each with its own vertices
 * (non-indexed by default) — a proper faceted look rather than the smoothed
 * appearance a shared/indexed normal would produce.
 */
export function generateEarringGeometry(radius: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, 0);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
