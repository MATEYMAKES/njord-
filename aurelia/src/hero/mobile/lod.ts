export interface LodProfile {
  particleCount: number;
  dpr: number;
  pointBaseSize: number;
}

const DESKTOP: LodProfile = { particleCount: 2100, dpr: 2, pointBaseSize: 1.5 };
const MOBILE: LodProfile = { particleCount: 600, dpr: 1.75, pointBaseSize: 2.0 };

export function getLodProfile(): LodProfile {
  const isNarrow = window.innerWidth < 768;
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const profile = isNarrow || isCoarsePointer ? MOBILE : DESKTOP;
  return { ...profile, dpr: Math.min(window.devicePixelRatio || 1, profile.dpr) };
}
