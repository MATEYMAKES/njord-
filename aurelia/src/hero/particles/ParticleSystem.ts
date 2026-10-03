import * as THREE from 'three';
import { sampleParticles } from '../jewelry/sampleParticles';
import { buildConnections } from '../jewelry/buildConnections';
import { createParticleMaterial } from '../materials/particleMaterial';
import { createLineMaterial } from '../materials/lineMaterial';

export class ParticleSystem {
  readonly points: THREE.Points;
  readonly lines: THREE.LineSegments;

  private readonly pointsMaterial: THREE.ShaderMaterial;
  private readonly linesMaterial: THREE.ShaderMaterial;

  constructor(ringGeometry: THREE.BufferGeometry, particleCount: number, baseSize: number) {
    const sample = sampleParticles(ringGeometry, particleCount);
    const edges = buildConnections(sample.targetPositions, sample.count, 2);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(sample.targetPositions, 3));
    geometry.setAttribute('aScatterPos', new THREE.BufferAttribute(sample.scatterPositions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(sample.seeds, 3));
    geometry.computeBoundingSphere();

    this.pointsMaterial = createParticleMaterial(baseSize);
    this.points = new THREE.Points(geometry, this.pointsMaterial);
    this.points.frustumCulled = false;

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', geometry.getAttribute('position'));
    lineGeometry.setAttribute('aScatterPos', geometry.getAttribute('aScatterPos'));
    lineGeometry.setAttribute('aSeed', geometry.getAttribute('aSeed'));
    lineGeometry.setIndex(new THREE.BufferAttribute(edges, 1));
    lineGeometry.boundingSphere = geometry.boundingSphere;

    this.linesMaterial = createLineMaterial();
    this.lines = new THREE.LineSegments(lineGeometry, this.linesMaterial);
    this.lines.frustumCulled = false;
  }

  update(progress: number, elapsedTime: number): void {
    this.pointsMaterial.uniforms.uProgress.value = progress;
    this.pointsMaterial.uniforms.uTime.value = elapsedTime;
    this.linesMaterial.uniforms.uProgress.value = progress;
    this.linesMaterial.uniforms.uTime.value = elapsedTime;
  }

  setPixelRatio(dpr: number): void {
    this.pointsMaterial.uniforms.uPixelRatio.value = dpr;
  }

  /**
   * Overrides one particle's starting (scattered) position — used to anchor
   * a specific particle to a UI element's screen location, so the element
   * can visually "hand off" to it as scrolling begins. The points and lines
   * geometries share this same attribute object, so both update together.
   */
  setAnchorScatterPosition(index: number, pos: THREE.Vector3): void {
    const attr = this.points.geometry.getAttribute('aScatterPos') as THREE.BufferAttribute;
    attr.setXYZ(index, pos.x, pos.y, pos.z);
    attr.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.lines.geometry.dispose();
    this.pointsMaterial.dispose();
    this.linesMaterial.dispose();
  }
}
