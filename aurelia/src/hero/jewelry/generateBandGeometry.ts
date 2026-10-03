import * as THREE from 'three';

export interface BandParams {
  /** Radius of the flat inner face — the part that would touch a finger. */
  innerRadius: number;
  /** Half the band's width along its axis; the outer face domes out by this much. */
  halfWidth: number;
  /** Segments used for the domed cross-section curve. */
  domeSegments: number;
  /** Segments around the main loop. */
  revolutionSegments: number;
}

export const DEFAULT_BAND_PARAMS: BandParams = {
  innerRadius: 1.9,
  halfWidth: 0.16,
  domeSegments: 24,
  revolutionSegments: 160,
};

export function bandOuterRadius(params: BandParams = DEFAULT_BAND_PARAMS): number {
  return params.innerRadius + params.halfWidth;
}

/**
 * A point on the band's surface in the same local space as the final
 * geometry (post rotateZ), given a revolution angle `theta` (around the
 * loop) and a profile angle `phi` (around the cross-section, 0 = outer
 * dome peak, ±PI/2 = the flat inner edge). Used to attach inspection-mode
 * annotations to real, meaningful points on the object.
 */
export function bandSurfacePoint(theta: number, phi: number, params: BandParams = DEFAULT_BAND_PARAMS): THREE.Vector3 {
  const { innerRadius, halfWidth } = params;
  const profileX = innerRadius + halfWidth * Math.cos(phi);
  const x = profileX * Math.cos(theta);
  const y = halfWidth * Math.sin(phi);
  const z = profileX * Math.sin(theta);

  // Mirrors the geometry's own rotateZ(PI/2): (x,y,z) -> (-y,x,z).
  return new THREE.Vector3(-y, x, z);
}

/**
 * A wedding-band profile rather than a plain circular-tube torus: a flat
 * inner face (comfort-fit, would sit against a finger) and a half-round
 * domed outer face, swept into a loop with LatheGeometry. The profile is a
 * closed curve — flat inner edge, semicircular outer edge — so revolving it
 * produces a seamless band with no separate cap geometry needed.
 */
export function generateBandGeometry(params: BandParams = DEFAULT_BAND_PARAMS): THREE.BufferGeometry {
  const { innerRadius, halfWidth, domeSegments, revolutionSegments } = params;

  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= domeSegments; i++) {
    const phi = -Math.PI / 2 + (i / domeSegments) * Math.PI;
    profile.push(new THREE.Vector2(innerRadius + halfWidth * Math.cos(phi), halfWidth * Math.sin(phi)));
  }
  profile.push(new THREE.Vector2(innerRadius, -halfWidth)); // close the loop along the flat inner face

  const geometry = new THREE.LatheGeometry(profile, revolutionSegments);

  // Stand the band upright: revolution axis horizontal (X) instead of the
  // default Y, so it presents like a ring stood on its edge, viewed at a 3/4 angle.
  geometry.rotateZ(Math.PI / 2);

  return geometry;
}
