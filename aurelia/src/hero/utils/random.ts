/**
 * Deterministic PRNG (mulberry32). Same seed -> same sequence, always,
 * so the formation geometry is stable across reloads.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Uniform random point inside a sphere shell (loose cloud), not just the surface. */
export function randomPointInSphereShell(
  rng: () => number,
  innerRadius: number,
  outerRadius: number,
  out: [number, number, number]
): void {
  const u = rng();
  const v = rng();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = randRange(rng, innerRadius, outerRadius);
  out[0] = r * Math.sin(phi) * Math.cos(theta);
  out[1] = r * Math.sin(phi) * Math.sin(theta);
  out[2] = r * Math.cos(phi);
}
