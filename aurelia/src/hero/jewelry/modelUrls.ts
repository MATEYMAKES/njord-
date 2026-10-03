/**
 * Drop a .glb/.gltf file at these paths under /public (e.g.
 * public/models/bracelet.glb) to replace that piece's procedural
 * placeholder automatically on next reload — no other code changes needed.
 * Missing files are expected (nothing uploaded yet) and just fall back.
 */
export const MODEL_URLS = {
  bracelet: '/models/bracelet.glb',
} as const;
