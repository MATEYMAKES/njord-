import * as THREE from 'three';
import { mulberry32, randomPointInSphereShell } from '../utils/random';

export interface ParticleSample {
  count: number;
  /** Final resting position on the jewelry surface (xyz per particle). */
  targetPositions: Float32Array;
  /** Loose starting position in the ambient cloud (xyz per particle). */
  scatterPositions: Float32Array;
  /** Per-particle phase/frequency seed for independent drift noise (xyz). */
  seeds: Float32Array;
}

const SAMPLE_SEED = 1337;

/**
 * Deterministically samples N points on the surface of `geometry`,
 * area-weighted per triangle, plus a matching loose "scattered" position for
 * each point in the ambient cloud around it. Same seed -> same cloud, always.
 */
export function sampleParticles(geometry: THREE.BufferGeometry, count: number): ParticleSample {
  const rng = mulberry32(SAMPLE_SEED);

  const index = geometry.index;
  if (!index) throw new Error('sampleParticles requires an indexed geometry');
  const position = geometry.attributes.position;

  const triCount = index.count / 3;
  const triAreas = new Float64Array(triCount);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  let totalArea = 0;
  for (let t = 0; t < triCount; t++) {
    const i0 = index.getX(t * 3);
    const i1 = index.getX(t * 3 + 1);
    const i2 = index.getX(t * 3 + 2);
    a.fromBufferAttribute(position, i0);
    b.fromBufferAttribute(position, i1);
    c.fromBufferAttribute(position, i2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    cross.crossVectors(ab, ac);
    const area = cross.length() * 0.5;
    triAreas[t] = area;
    totalArea += area;
  }

  const cumulative = new Float64Array(triCount);
  let running = 0;
  for (let t = 0; t < triCount; t++) {
    running += triAreas[t];
    cumulative[t] = running;
  }

  const boundingSphere = geometry.boundingSphere ?? new THREE.Sphere(new THREE.Vector3(), 3);
  const scatterInner = boundingSphere.radius * 2.2;
  const scatterOuter = boundingSphere.radius * 4.2;

  // Camera looks straight down -Z at the origin, so this roughly corresponds
  // to where the headline sits on screen (upper-center). Particles sampled
  // near it are probabilistically re-rolled so density falls off naturally
  // around the type instead of leaving a hard, obviously-empty circle.
  const avoidCenterY = boundingSphere.radius * 1.1;
  const avoidInner = boundingSphere.radius * 0.55;
  const avoidOuter = boundingSphere.radius * 1.85;
  const maxResampleAttempts = 6;

  // A weak, invisible pull toward each particle's own target position: the
  // resting cloud loosely traces the ring's shape without ever reading as an
  // obvious donut, so the transformation feels like it was hinted at from
  // the start rather than arriving from nowhere.
  const ringPullStrength = 0.16;

  const targetPositions = new Float32Array(count * 3);
  const scatterPositions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);

  const scatterScratch: [number, number, number] = [0, 0, 0];

  for (let p = 0; p < count; p++) {
    const target = rng() * totalArea;
    let lo = 0;
    let hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const tri = lo;

    const i0 = index.getX(tri * 3);
    const i1 = index.getX(tri * 3 + 1);
    const i2 = index.getX(tri * 3 + 2);
    a.fromBufferAttribute(position, i0);
    b.fromBufferAttribute(position, i1);
    c.fromBufferAttribute(position, i2);

    const r1 = rng();
    const r2 = rng();
    const sqrtR1 = Math.sqrt(r1);
    const u = 1 - sqrtR1;
    const v = sqrtR1 * (1 - r2);
    const w = sqrtR1 * r2;

    const px = u * a.x + v * b.x + w * c.x;
    const py = u * a.y + v * b.y + w * c.y;
    const pz = u * a.z + v * b.z + w * c.z;

    targetPositions[p * 3] = px;
    targetPositions[p * 3 + 1] = py;
    targetPositions[p * 3 + 2] = pz;

    for (let attempt = 0; attempt < maxResampleAttempts; attempt++) {
      randomPointInSphereShell(rng, scatterInner, scatterOuter, scatterScratch);
      const dx = scatterScratch[0];
      const dy = scatterScratch[1] - avoidCenterY;
      const dz = scatterScratch[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const t = THREE.MathUtils.clamp((dist - avoidInner) / (avoidOuter - avoidInner), 0, 1);
      const keepProbability = t * t * (3 - 2 * t);
      if (rng() < keepProbability) break;
    }
    scatterPositions[p * 3] = scatterScratch[0] * (1 - ringPullStrength) + px * ringPullStrength;
    scatterPositions[p * 3 + 1] = scatterScratch[1] * (1 - ringPullStrength) + py * ringPullStrength;
    scatterPositions[p * 3 + 2] = scatterScratch[2] * (1 - ringPullStrength) + pz * ringPullStrength;

    seeds[p * 3] = rng() * 100;
    seeds[p * 3 + 1] = rng() * 100;
    seeds[p * 3 + 2] = rng();
  }

  return { count, targetPositions, scatterPositions, seeds };
}
