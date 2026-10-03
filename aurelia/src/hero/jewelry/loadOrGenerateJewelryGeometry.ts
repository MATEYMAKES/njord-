import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface JewelryGeometryResult {
  geometry: THREE.BufferGeometry;
  /** 'model' if a real uploaded file was used, 'procedural' if it fell back. */
  source: 'model' | 'procedural';
}

/**
 * Tries to load a real .glb/.gltf model from `modelUrl`. If the file is
 * missing (the common case — nothing has been uploaded yet), fails to
 * parse, or has no mesh geometry, falls back to `generateFallback()`
 * instead. This is the whole upgrade path: drop a file at the given path
 * (see MODEL_URLS below) and it's used automatically next reload — no other
 * code changes required.
 */
export async function loadOrGenerateJewelryGeometry(
  modelUrl: string | null,
  generateFallback: () => THREE.BufferGeometry
): Promise<JewelryGeometryResult> {
  if (modelUrl) {
    try {
      const gltf = await new GLTFLoader().loadAsync(modelUrl);
      const geometry = extractMergedGeometry(gltf.scene);
      if (geometry) return { geometry, source: 'model' };
    } catch {
      // No file uploaded yet, or it failed to load/parse — use the fallback.
    }
  }
  return { geometry: generateFallback(), source: 'procedural' };
}

function extractMergedGeometry(root: THREE.Object3D): THREE.BufferGeometry | null {
  root.updateMatrixWorld(true);

  const geometries: THREE.BufferGeometry[] = [];
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geom = mesh.geometry.clone();
      geom.applyMatrix4(mesh.matrixWorld);
      geometries.push(geom);
    }
  });

  if (geometries.length === 0) return null;
  if (geometries.length === 1) return finalize(geometries[0]);

  try {
    const merged = mergeGeometries(geometries, false);
    if (merged) return finalize(merged);
  } catch {
    // Meshes had incompatible attribute sets — fall back to just the first one
    // rather than discarding an otherwise-usable upload entirely.
  }
  return finalize(geometries[0]);
}

function finalize(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.center();
  return geometry;
}
