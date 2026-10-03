import * as THREE from 'three';

export interface SolidMaterialHandle {
  material: THREE.MeshPhysicalMaterial;
  uniforms: {
    uReveal: { value: number };
    uRimColor: { value: THREE.Color };
  };
}

/**
 * Physically based gold material that progressively "grows" into existence:
 * onBeforeCompile injects a per-vertex `aFormOrder` attribute (0 at the
 * seed point, 1 at the farthest point) and discards any fragment whose
 * form order hasn't been reached yet by `uReveal`, with a thin emissive rim
 * right at the growth boundary. Lighting/reflections stay fully PBR, with
 * smooth (non-flat) shading so the surface reads as one continuous curve
 * rather than visible facets.
 */
export function createSolidMaterial(envMap: THREE.Texture): SolidMaterialHandle {
  const uniforms = {
    uReveal: { value: 0 },
    uRimColor: { value: new THREE.Color('#fff2cf') },
  };

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e8b84b'),
    metalness: 1,
    roughness: 0.22,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
    envMap,
    envMapIntensity: 1.4,
    flatShading: false,
    transparent: false,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReveal = uniforms.uReveal;
    shader.uniforms.uRimColor = uniforms.uRimColor;

    shader.vertexShader = shader.vertexShader
      .replace(
        'varying vec3 vViewPosition;',
        'varying vec3 vViewPosition;\nattribute float aFormOrder;\nvarying float vFormOrder;'
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvFormOrder = aFormOrder;');

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <clipping_planes_pars_fragment>',
        '#include <clipping_planes_pars_fragment>\nuniform float uReveal;\nuniform vec3 uRimColor;\nvarying float vFormOrder;'
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );\n\t#include <clipping_planes_fragment>',
        'vec4 diffuseColor = vec4( diffuse, opacity );\n\t#include <clipping_planes_fragment>\n\tif ( vFormOrder > uReveal ) discard;'
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n\tfloat rimDist = uReveal - vFormOrder;\n\tfloat rim = 1.0 - smoothstep(0.0, 0.05, rimDist);\n\tfloat rimActive = 1.0 - smoothstep(0.97, 1.0, uReveal);\n\ttotalEmissiveRadiance += uRimColor * rim * rimActive * 0.6;'
      );
  };

  return { material, uniforms };
}
