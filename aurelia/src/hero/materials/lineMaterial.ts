import * as THREE from 'three';
import { NOISE_GLSL } from './noiseGLSL';
import { POSITION_GLSL } from './positionGLSL';

export function createLineMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uColorGold: { value: new THREE.Color('#c9962f') },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute vec3 aScatterPos;
      attribute vec3 aSeed;

      uniform float uProgress;
      uniform float uTime;

      varying float vTravel;

      ${NOISE_GLSL}
      ${POSITION_GLSL}

      void main() {
        float travel;
        vec3 displaced = computeDisplaced(position, aScatterPos, aSeed, uProgress, uTime, travel);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        vTravel = travel;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorGold;

      varying float vTravel;

      void main() {
        // Connections fade in as points start converging, then fade back
        // out as they close in on their final positions — the tighter the
        // cluster, the less visible the network holding it together.
        float fadeIn = smoothstep(0.05, 0.3, vTravel);
        float closeness = smoothstep(0.55, 0.95, vTravel);
        float alpha = fadeIn * (1.0 - closeness) * 0.45;

        gl_FragColor = vec4(uColorGold, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
}
