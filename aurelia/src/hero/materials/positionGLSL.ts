/**
 * Shared vertex displacement logic used by BOTH the particle points and the
 * connection lines, so they read the same attributes and land in the exact
 * same place every frame — no drift between the two draw calls.
 */
export const POSITION_GLSL = /* glsl */ `
float easeTravel(float progress) {
  return smoothstep(0.25, 0.75, progress);
}

vec3 computeDisplaced(vec3 targetPos, vec3 scatterPos, vec3 seed, float progress, float time, out float travel) {
  travel = easeTravel(progress);
  float driftFade = 1.0 - travel;

  vec3 base = mix(scatterPos, targetPos, travel);

  vec3 noiseCoord = targetPos * 0.55 + vec3(seed.x, seed.y, seed.x * 0.37) + time * 0.022;
  vec3 drift = curlNoise(noiseCoord) * 0.13 * driftFade;

  vec3 radial = scatterPos - targetPos;
  vec3 arcAxis = normalize(cross(radial + vec3(0.0001, 0.0, 0.0), vec3(0.0, 1.0, 0.0)));
  float arcSign = seed.z > 0.5 ? 1.0 : -1.0;
  float arcAmount = sin(travel * 3.14159265) * 0.32 * arcSign;

  return base + drift + arcAxis * arcAmount;
}
`;
