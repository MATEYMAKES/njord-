import * as THREE from 'three';
import { NOISE_GLSL } from './noiseGLSL';
import { POSITION_GLSL } from './positionGLSL';

export function createParticleMaterial(baseSize: number): THREE.ShaderMaterial {
  const uniforms: { [key: string]: THREE.IUniform } = {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uBaseSize: { value: baseSize },
    uColorGold: { value: new THREE.Color('#c9962f') },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute vec3 aScatterPos;
      attribute vec3 aSeed;

      uniform float uProgress;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uBaseSize;

      varying float vTravel;
      varying float vSeedZ;
      varying float vPulse;
      varying float vDepthNear;

      ${NOISE_GLSL}
      ${POSITION_GLSL}

      void main() {
        float travel;
        vec3 displaced = computeDisplaced(position, aScatterPos, aSeed, uProgress, uTime, travel);

        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Perpetual breathing sparkle while unformed: each particle drifts
        // between a full-bright/crisp peak and a shrunken, soft trough on
        // its own phase, so the cloud never looks static. It settles to a
        // steady peak as the particle finishes traveling to its target.
        float pulsePhase = aSeed.z * 6.2831853;
        float pulseFreq = 0.5 + fract(aSeed.x) * 0.6;
        float pulseRaw = sin(uTime * pulseFreq + pulsePhase) * 0.5 + 0.5;
        float pulse = mix(pulseRaw, 1.0, travel);
        vPulse = pulse;

        // Depth of field: particles close to the camera read as larger, softer,
        // out-of-focus points; distant ones stay tiny and crisp. The near band
        // is narrow (depth 4-9) so only the closest slice of the cloud goes
        // soft — most particles read as small and sharp, keeping the "raw
        // material" feel rather than a field of glowing bokeh.
        float viewDepth = -mvPosition.z;
        float depthNorm = smoothstep(4.0, 9.0, viewDepth);
        vDepthNear = 1.0 - depthNorm;

        float dofSize = mix(0.55, 1.7, vDepthNear);
        float sizeFactor = mix(1.5, 0.85, travel) * mix(0.3, 1.0, pulse) * dofSize;
        gl_PointSize = uBaseSize * sizeFactor * uPixelRatio * (1.0 / -mvPosition.z) * 220.0;

        vTravel = travel;
        vSeedZ = aSeed.z;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uProgress;
      uniform vec3 uColorGold;

      varying float vTravel;
      varying float vSeedZ;
      varying float vPulse;
      varying float vDepthNear;

      void main() {
        vec2 centered = gl_PointCoord - 0.5;
        float dist = length(centered);
        if (dist > 0.5) discard;

        float edgeStart = mix(0.08, 0.36, vPulse);
        float dofEdgeStart = mix(edgeStart, 0.05, vDepthNear * 0.6);
        float core = 1.0 - smoothstep(dofEdgeStart, 0.5, dist);
        vec3 color = uColorGold * (0.85 + vSeedZ * 0.3);

        float opacityPulse = mix(0.3, 1.0, vPulse);
        float dofOpacity = mix(1.0, 0.7, vDepthNear);
        float dissolveOut = 1.0 - smoothstep(0.7, 0.88, uProgress);
        float alpha = core * mix(0.65, 1.0, vTravel) * opacityPulse * dofOpacity * dissolveOut;

        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
}
