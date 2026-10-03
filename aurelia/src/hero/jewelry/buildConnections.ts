/**
 * Deterministic k-nearest-neighbour graph over the sampled particle target
 * positions, computed with a uniform spatial hash so it stays roughly O(N)
 * instead of the naive O(N^2). This *is* the "wireframe": because it's built
 * from the same target positions the particles converge to, the connections
 * necessarily trace the jewelry's surface once formation completes.
 */
export function buildConnections(targetPositions: Float32Array, count: number, neighborsPerPoint = 2): Uint32Array {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = targetPositions[i * 3];
    const y = targetPositions[i * 3 + 1];
    const z = targetPositions[i * 3 + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  const spanX = Math.max(maxX - minX, 1e-4);
  const spanY = Math.max(maxY - minY, 1e-4);
  const spanZ = Math.max(maxZ - minZ, 1e-4);
  const volume = spanX * spanY * spanZ;
  const cellSize = Math.max(Math.cbrt(volume / count) * 1.8, 1e-3);

  const cellOf = (i: number): string => {
    const cx = Math.floor((targetPositions[i * 3] - minX) / cellSize);
    const cy = Math.floor((targetPositions[i * 3 + 1] - minY) / cellSize);
    const cz = Math.floor((targetPositions[i * 3 + 2] - minZ) / cellSize);
    return `${cx},${cy},${cz}`;
  };

  const grid = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    const key = cellOf(i);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(i);
  }

  const edgeSet = new Set<number>();
  const edges: number[] = [];
  const candidateDist: number[] = [];
  const candidateIdx: number[] = [];

  for (let i = 0; i < count; i++) {
    const xi = targetPositions[i * 3];
    const yi = targetPositions[i * 3 + 1];
    const zi = targetPositions[i * 3 + 2];
    const cx = Math.floor((xi - minX) / cellSize);
    const cy = Math.floor((yi - minY) / cellSize);
    const cz = Math.floor((zi - minZ) / cellSize);

    candidateDist.length = 0;
    candidateIdx.length = 0;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!bucket) continue;
          for (const j of bucket) {
            if (j === i) continue;
            const dxp = targetPositions[j * 3] - xi;
            const dyp = targetPositions[j * 3 + 1] - yi;
            const dzp = targetPositions[j * 3 + 2] - zi;
            const d2 = dxp * dxp + dyp * dyp + dzp * dzp;
            candidateDist.push(d2);
            candidateIdx.push(j);
          }
        }
      }
    }

    const order = candidateIdx.map((_, k) => k).sort((a, b) => candidateDist[a] - candidateDist[b]);
    const limit = Math.min(neighborsPerPoint, order.length);
    for (let k = 0; k < limit; k++) {
      const j = candidateIdx[order[k]];
      const lo = Math.min(i, j);
      const hi = Math.max(i, j);
      const key = lo * count + hi;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push(lo, hi);
    }
  }

  return new Uint32Array(edges);
}
