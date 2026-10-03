import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { generateRingGeometry } from './jewelry/generateRingGeometry';
import { bandSurfacePoint } from './jewelry/generateBandGeometry';
import {
  generateBraceletGeometry,
  braceletOuterRadius,
  DEFAULT_BRACELET_PARAMS,
} from './jewelry/generateBraceletGeometry';
import { generateEarringGeometry } from './jewelry/generateEarringGeometry';
import { loadOrGenerateJewelryGeometry } from './jewelry/loadOrGenerateJewelryGeometry';
import { MODEL_URLS } from './jewelry/modelUrls';
import { ParticleSystem } from './particles/ParticleSystem';
import { JewelryMesh } from './jewelry/JewelryMesh';
import { createSolidMaterial, type SolidMaterialHandle } from './materials/solidMaterial';
import { ScrollController } from './scroll/ScrollController';
import { DragRotationController } from './scroll/DragRotationController';
import { SlideController } from './scroll/SlideController';
import { PointerLight } from './lighting/PointerLight';
import { getLodProfile } from './mobile/lod';

const PRESENTATION_TILT = { x: -0.18, y: 0.55 };
/**
 * Only the ring's own formation is scroll-scrubbed; navigating between
 * pieces afterward is event-driven (see SlideController). RING_SCROLL_VH is
 * where formation actually completes; SCROLL_BUFFER_VH is extra dead room
 * added AFTER that before the pin can physically release — without it, a
 * fast scroll fling can carry scrollY past the pin's end in the single
 * frame before the render loop notices formation finished and engages the
 * slide-lock, letting the user skip straight past activation.
 */
const RING_SCROLL_VH = 180;
const SCROLL_BUFFER_VH = 250;
const SCROLL_DISTANCE_VH = RING_SCROLL_VH + SCROLL_BUFFER_VH;
const FORMATION_FRACTION = RING_SCROLL_VH / SCROLL_DISTANCE_VH;
/** How far offscreen (× ring bounding radius) each piece starts/ends during a slide transition. */
const SLIDE_DISTANCE_MULTIPLIER = 6.5;
/** Fixed duration of each slide transition's timed ease, independent of scroll speed entirely. */
const SLIDE_TRANSITION_DURATION = 0.75;
/** How long input is ignored after a transition — covers the transition itself plus a settle hold to actually notice the new piece. */
const SLIDE_LOCK_MS = 2200;
const DRAG_ENABLE_THRESHOLD = 0.92;
const AUTO_SPIN_SPEED = 0.06;
const FORMED_ENTER = 0.97;
const FORMED_EXIT = 0.93;
const RING_SHIFT_FRACTION = 0.07;
/** 0 = ring, 1 = bracelet, 2 = earrings — the carousel's total slide count, used by the wrap-aware positioning math in renderLoop. */
const SLIDE_COUNT = 3;
/** distance = (radius / tan(fov/2)) * multiplier — multiplier ~1.4 targets ~71% viewport-height fill. */
const INSPECT_FRAMING_MULTIPLIER = 1.4;
/** How far beyond the object's projected edge every label is guaranteed to sit. */
const ANNOTATION_RING_CLEARANCE = 52;
const ANNOTATION_LABEL_GAP = 10;
const ANNOTATION_SCREEN_MARGIN = 64;
/** Per-annotation angular nudge (degrees) so nearby landmarks fan their labels apart. */
const ANNOTATION_ANGLE_NUDGE_DEG = [-22, 22, 0];
const RING_ANNOTATION_LABELS = ['18K GOLD<br />SURFACE', '2.1 MM<br />PROFILE', '750'];
const BRACELET_ANNOTATION_LABELS = ['18K GOLD<br />SURFACE', '3 MM<br />PROFILE', '750'];
const EARRING_ANNOTATION_LABELS = ['18K GOLD<br />SURFACE', 'ORBIT<br />PAIR', '750'];
/** Fraction of the ring's bounding radius used for the earrings' orbit radius / bead radius, so the pair reads at roughly the same on-screen scale as the ring/bracelet. */
const EARRING_ORBIT_RADIUS_FRACTION = 0.55;
const EARRING_BEAD_RADIUS_FRACTION = 0.22;
/** Radians/second the earring pair revolves around their shared center while active. */
const EARRING_ORBIT_SPEED = 0.9;

export interface HeroSceneConfig {
  anchorDots?: HTMLElement[];
  objectInfoEl?: HTMLElement;
  braceletInfoEl?: HTMLElement;
  objectIdEl?: HTMLElement;
  coordMarksEl?: HTMLElement;
  exploreButton?: HTMLElement;
  braceletExploreButton?: HTMLElement;
  earringInfoEl?: HTMLElement;
  earringExploreButton?: HTMLElement;
  annotationsEl?: HTMLElement;
  annotationEls?: HTMLElement[];
}

export class HeroScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly group = new THREE.Group();

  private readonly particleSystem: ParticleSystem;
  private readonly jewelryMesh: JewelryMesh;
  private readonly braceletGroup = new THREE.Group();
  private readonly braceletMaterial: SolidMaterialHandle;
  private braceletMesh: THREE.Mesh | null = null;
  private readonly earringsGroup = new THREE.Group();
  private readonly earringBeadA: THREE.Mesh;
  private readonly earringBeadB: THREE.Mesh;
  private readonly earringMaterial: SolidMaterialHandle;
  private readonly earringOrbitRadius: number;
  private readonly earringBeadRadius: number;
  private earringOrbitAngle = 0;
  private earringOrbitWasActive = false;
  private earringOrbitLastElapsed = 0;
  private readonly scrollController: ScrollController;
  private readonly dragController: DragRotationController;
  private readonly slideController: SlideController;
  private readonly pointerLight: PointerLight;
  private readonly ringCenter = new THREE.Vector3();
  private lightSpread = 0;
  private lightDepth = 0;

  private readonly wrapperEl: HTMLElement;
  private readonly config: HeroSceneConfig;
  private readonly fitDistance: number;
  private readonly boundingRadius: number;
  private dollyDistance: number;
  private viewShift = 0;
  private formed = false;
  /** Once the ring has fully formed once, it never un-forms again — the slide index (event-driven) takes over navigation. */
  private ringEverFormed = false;
  private inspecting = false;

  /** 0 = ring, 1 = bracelet, 2 = earrings — the ONLY source of truth for which piece is showing, set exclusively by SlideController events. */
  private slideIndex = 0;
  /** Continuous, unwrapped carousel position — animates by exactly ±1 per transition (even across a loop wrap), never snapping to a raw slide index. Lets per-piece screen position be computed generically for any slide count via wrapped distance. */
  private carouselOffset = 0;
  private smoothedCarousel = 0;
  private slideTransitionStart = 0;
  private slideTransitionFrom = 0;
  private slideTransitionTarget = 0;
  private exitScrollY = 0;

  private readonly annotationLocalPoints: THREE.Vector3[];
  private readonly braceletAnnotationLocalPoints: THREE.Vector3[];
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndcPointer = new THREE.Vector2();
  private readonly projectionScratch = new THREE.Vector3();
  private readonly originPoint = new THREE.Vector3(0, 0, 0);
  private readonly radiusProbePoint: THREE.Vector3;
  private readonly braceletRadiusProbePoint: THREE.Vector3;
  private readonly earringRadiusProbePoint: THREE.Vector3;
  private pointerDownAt = { x: 0, y: 0 };

  private progress = 0;
  private rafId = 0;
  private readonly baseCameraPos = new THREE.Vector3();
  private mouseNDC = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement, pinTarget: HTMLElement, config: HeroSceneConfig = {}) {
    this.wrapperEl = pinTarget;
    this.config = config;
    const lod = getLodProfile();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(lod.dpr);
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envMap;

    const ring = generateRingGeometry();

    this.particleSystem = new ParticleSystem(ring.geometry, lod.particleCount, lod.pointBaseSize);
    this.jewelryMesh = new JewelryMesh(ring.geometry, ring.seedPoint, envMap);

    this.group.add(this.particleSystem.points, this.particleSystem.lines, this.jewelryMesh.mesh);
    this.group.rotation.set(PRESENTATION_TILT.x, PRESENTATION_TILT.y, 0);
    this.scene.add(this.group);

    const sphere = ring.geometry.boundingSphere ?? new THREE.Sphere(new THREE.Vector3(), 3);
    this.boundingRadius = sphere.radius;
    this.radiusProbePoint = new THREE.Vector3(sphere.radius, 0, 0);
    this.fitDistance = (sphere.radius * 1.7) / Math.sin((this.camera.fov * Math.PI) / 360);
    this.dollyDistance = this.fitDistance;
    this.camera.position.set(0, sphere.center.y * 0.3, this.fitDistance);
    this.camera.lookAt(0, sphere.center.y * 0.4, 0);
    this.baseCameraPos.copy(this.camera.position);

    // Second collection piece. It doesn't form from particles — it slides in
    // already complete — and loads a real uploaded model if one exists at
    // MODEL_URLS.bracelet, falling back to the procedural bangle otherwise.
    // Scaled once loaded so an uploaded model of any native size reads at
    // the same on-screen weight as the ring.
    this.braceletMaterial = createSolidMaterial(envMap);
    this.braceletMaterial.uniforms.uReveal.value = 1;
    this.braceletGroup.rotation.set(PRESENTATION_TILT.x, PRESENTATION_TILT.y, 0);
    this.scene.add(this.braceletGroup);
    this.braceletRadiusProbePoint = new THREE.Vector3(braceletOuterRadius(), 0, 0);

    loadOrGenerateJewelryGeometry(MODEL_URLS.bracelet, generateBraceletGeometry).then((result) => {
      const geometry = result.geometry;
      if (!geometry.boundingSphere) geometry.computeBoundingSphere();
      const radius = geometry.boundingSphere?.radius || 1;

      this.braceletMesh = new THREE.Mesh(geometry, this.braceletMaterial.material);
      this.braceletGroup.add(this.braceletMesh);
      this.braceletGroup.scale.setScalar(this.boundingRadius / radius);
      this.braceletRadiusProbePoint.set(radius, 0, 0);
    });

    // Third collection piece: a pair of beads that continuously orbit their
    // shared center while active (see renderLoop). Unlike the ring/bracelet
    // it never forms/loads asynchronously — both beads exist immediately,
    // sized as fractions of the ring's own bounding radius so the pair reads
    // at the same on-screen weight as the other two pieces.
    this.earringOrbitRadius = this.boundingRadius * EARRING_ORBIT_RADIUS_FRACTION;
    this.earringBeadRadius = this.boundingRadius * EARRING_BEAD_RADIUS_FRACTION;
    this.earringMaterial = createSolidMaterial(envMap);
    this.earringMaterial.uniforms.uReveal.value = 1;
    const earringGeometry = generateEarringGeometry(this.earringBeadRadius);
    this.earringBeadA = new THREE.Mesh(earringGeometry, this.earringMaterial.material);
    this.earringBeadB = new THREE.Mesh(earringGeometry, this.earringMaterial.material);
    this.earringsGroup.add(this.earringBeadA, this.earringBeadB);
    this.earringsGroup.rotation.set(PRESENTATION_TILT.x, PRESENTATION_TILT.y, 0);
    this.scene.add(this.earringsGroup);
    this.earringRadiusProbePoint = new THREE.Vector3(this.earringOrbitRadius + this.earringBeadRadius, 0, 0);
    this.updateEarringOrbitPositions();

    this.anchorParticlesToDots(config.anchorDots ?? [], this.fitDistance, sphere.radius);

    this.annotationLocalPoints = [
      bandSurfacePoint(Math.PI / 2, 0),
      bandSurfacePoint(Math.PI / 2, Math.PI / 2),
      bandSurfacePoint(-Math.PI / 2 - 0.4, 0),
    ];
    this.braceletAnnotationLocalPoints = [
      bandSurfacePoint(Math.PI / 2, 0, DEFAULT_BRACELET_PARAMS),
      bandSurfacePoint(Math.PI / 2, Math.PI / 2, DEFAULT_BRACELET_PARAMS),
      bandSurfacePoint(-Math.PI / 2 - 0.4, 0, DEFAULT_BRACELET_PARAMS),
    ];

    window.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerdown', this.onCanvasPointerDown);
    canvas.addEventListener('pointerup', this.onCanvasPointerUp);
    config.exploreButton?.addEventListener('click', this.onExploreClick);
    config.braceletExploreButton?.addEventListener('click', this.onExploreClick);
    config.earringExploreButton?.addEventListener('click', this.onExploreClick);

    this.ringCenter.set(0, sphere.center.y * 0.4, 0);
    this.lightSpread = sphere.radius * 3;
    this.lightDepth = this.fitDistance * 0.55;

    this.pointerLight = new PointerLight();
    this.scene.add(this.pointerLight.light);

    // Formation stays scroll-scrubbed (a continuous, position-driven
    // transformation is the point). Once it completes, SlideController takes
    // over entirely — navigation between pieces from then on is triggered by
    // discrete wheel/touch/key events, never by reading scroll position.
    this.scrollController = new ScrollController(pinTarget, SCROLL_DISTANCE_VH, (p) => {
      this.progress = p;
    });

    this.slideController = new SlideController({
      slideCount: SLIDE_COUNT,
      lockDurationMs: SLIDE_TRANSITION_DURATION * 1000 + SLIDE_LOCK_MS,
      loop: true,
      onIndexChange: (next, _previous, direction) => this.onSlideChange(next, direction),
      onExitForward: () => this.onSlideExitForward(),
    });

    this.dragController = new DragRotationController(canvas);

    this.resize();
    window.addEventListener('resize', this.resize);

    this.renderLoop();
  }

  private anchorParticlesToDots(anchorDots: HTMLElement[], fitDistance: number, boundingRadius: number): void {
    const anchorDistance = fitDistance - boundingRadius * 3;
    const worldPoint = new THREE.Vector3();

    anchorDots.forEach((dotEl, index) => {
      const rect = dotEl.getBoundingClientRect();
      const ndcX = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
      const ndcY = -(((rect.top + rect.height / 2) / window.innerHeight) * 2 - 1);

      worldPoint.set(ndcX, ndcY, 0.5).unproject(this.camera);
      const direction = worldPoint.sub(this.camera.position).normalize();
      const anchorWorld = this.camera.position.clone().add(direction.multiplyScalar(anchorDistance));

      this.particleSystem.setAnchorScatterPosition(index, this.group.worldToLocal(anchorWorld));
    });
  }

  /** 0-1 over the ring's own formation scroll range (RING_SCROLL_VH) — saturates at 1 and holds through the trailing scroll buffer. */
  private get formationProgress(): number {
    return Math.min(this.progress / FORMATION_FRACTION, 1);
  }

  /** Same as formationProgress, but latched at 1 forever once the ring has ever fully formed — it can't unform. */
  private get effectiveFormationProgress(): number {
    return this.ringEverFormed ? 1 : this.formationProgress;
  }

  private get braceletFormed(): boolean {
    return this.slideIndex === 1;
  }

  private get earringsFormed(): boolean {
    return this.slideIndex === 2;
  }

  /** Raycast targets for the currently active piece — the earrings are two separate meshes, everything else is one. */
  private get activeHitTargets(): THREE.Object3D[] {
    if (this.earringsFormed) return [this.earringBeadA, this.earringBeadB];
    if (this.braceletFormed) return this.braceletMesh ? [this.braceletMesh] : [];
    return [this.jewelryMesh.mesh];
  }

  private get activeGroup(): THREE.Object3D {
    if (this.earringsFormed) return this.earringsGroup;
    return this.braceletFormed ? this.braceletGroup : this.group;
  }

  /**
   * Earring annotation points are derived live from each bead's current
   * orbit position (frozen while inspecting, see renderLoop) rather than a
   * fixed local point — the pair's shape isn't static like the ring/bracelet
   * band. Point 0/1 sit on each bead's outer edge, point 2 is a purity mark
   * at the shared orbit center.
   */
  private get activeAnnotationPoints(): THREE.Vector3[] {
    if (this.earringsFormed) {
      return [
        this.earringBeadA.position.clone().add(new THREE.Vector3(0, this.earringBeadRadius, 0)),
        this.earringBeadB.position.clone().add(new THREE.Vector3(0, this.earringBeadRadius, 0)),
        this.originPoint,
      ];
    }
    return this.braceletFormed ? this.braceletAnnotationLocalPoints : this.annotationLocalPoints;
  }

  private get activeRadiusProbe(): THREE.Vector3 {
    if (this.earringsFormed) return this.earringRadiusProbePoint;
    return this.braceletFormed ? this.braceletRadiusProbePoint : this.radiusProbePoint;
  }

  /** Called by SlideController the instant a transition is triggered — never by reading scroll position. */
  private onSlideChange(next: number, direction: 1 | -1): void {
    this.slideIndex = next;
    this.slideTransitionStart = this.clock.getElapsedTime();
    this.slideTransitionFrom = this.smoothedCarousel;
    this.slideTransitionTarget = this.carouselOffset + direction;
    this.carouselOffset = this.slideTransitionTarget;
    if (this.inspecting) this.setInspecting(false);

    // Each piece's info panel only shows its own text while it's the active
    // slide — objectInfoEl's initial reveal (updateFormedState) adds
    // is-formed once on formation, but never removes it on its own, so it
    // must be explicitly toggled off here too or it stays stacked on top of
    // whichever panel becomes active next.
    this.config.objectInfoEl?.classList.toggle('is-formed', next === 0);
    this.config.braceletInfoEl?.classList.toggle('is-formed', next === 1);
    this.config.earringInfoEl?.classList.toggle('is-formed', next === 2);

    if (next === 1) this.setAnnotationLabels(BRACELET_ANNOTATION_LABELS);
    else if (next === 2) this.setAnnotationLabels(EARRING_ANNOTATION_LABELS);
    else this.setAnnotationLabels(RING_ANNOTATION_LABELS);
  }

  /**
   * Past the last slide: hand control back to native scroll so the page
   * continues past the hero. Jumps straight to the end of the pin range
   * instead of nudging by a few px and waiting for the user to scroll
   * through whatever's left of the trailing buffer — scroll position stops
   * mattering the instant SlideController takes over, so the buffer has no
   * business gating this exit.
   */
  private onSlideExitForward(): void {
    this.slideController.enabled = false;
    this.scrollController.jumpToEnd();
    this.exitScrollY = window.scrollY;
  }

  private onPointerMove = (e: PointerEvent): void => {
    this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };

  private onCanvasPointerDown = (e: PointerEvent): void => {
    this.pointerDownAt = { x: e.clientX, y: e.clientY };
  };

  private onCanvasPointerUp = (e: PointerEvent): void => {
    const moved = Math.hypot(e.clientX - this.pointerDownAt.x, e.clientY - this.pointerDownAt.y);
    const targets = this.activeHitTargets;
    if (moved > 6 || targets.length === 0 || !(this.formed || this.braceletFormed || this.earringsFormed)) return;

    this.ndcPointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    this.raycaster.setFromCamera(this.ndcPointer, this.camera);
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length > 0) this.setInspecting(!this.inspecting);
  };

  private onExploreClick = (): void => {
    this.setInspecting(!this.inspecting);
  };

  private setInspecting(value: boolean): void {
    this.inspecting = value && (this.formed || this.braceletFormed || this.earringsFormed);
    this.wrapperEl.classList.toggle('is-inspecting', this.inspecting);
    this.config.annotationsEl?.classList.toggle('is-visible', this.inspecting);
  }

  private setAnnotationLabels(labels: string[]): void {
    this.config.annotationEls?.forEach((el, i) => {
      const label = el.querySelector<HTMLElement>('.label');
      if (label && labels[i]) label.innerHTML = labels[i];
    });
  }

  private updateFormedState(): void {
    if (!this.formed && this.formationProgress >= FORMED_ENTER) {
      this.formed = true;
      this.ringEverFormed = true;
      this.config.objectInfoEl?.classList.add('is-formed');
      this.config.objectIdEl?.classList.add('is-formed');
      this.config.coordMarksEl?.classList.add('is-formed');
      // Hand off from scroll-scrubbing to event-driven slide navigation —
      // scroll position stops mattering entirely from here on.
      this.slideController.enabled = true;
      this.slideController.lockFor(SLIDE_LOCK_MS);
    } else if (!this.ringEverFormed && this.formed && this.formationProgress < FORMED_EXIT) {
      // Only reachable before the ring has ever fully formed — reversing the
      // scrub is fine here since nothing has locked in yet.
      this.formed = false;
      this.config.objectInfoEl?.classList.remove('is-formed');
      this.config.objectIdEl?.classList.remove('is-formed');
      this.config.coordMarksEl?.classList.remove('is-formed');
      if (this.inspecting) this.setInspecting(false);
    }
  }

  /**
   * Camera distance so the ring's complete bounding sphere fits within the
   * viewport with margin on every side, in both landscape and portrait —
   * derived from the sphere radius and FOV, not a hardcoded zoom factor.
   * distance = (radius / tan(fov/2)) * framingMultiplier, picking whichever
   * of the height- or width-constrained distance is larger so the object
   * never crops on a narrow/tall viewport either.
   */
  private computeFramedDistance(multiplier: number): number {
    const halfFovRad = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const distanceForHeight = (this.boundingRadius / Math.tan(halfFovRad)) * multiplier;
    const distanceForWidth = distanceForHeight / this.camera.aspect;
    return Math.max(distanceForHeight, distanceForWidth);
  }

  /** Places both beads opposite each other on the orbit circle at the current `earringOrbitAngle`. */
  private updateEarringOrbitPositions(): void {
    const x = Math.cos(this.earringOrbitAngle) * this.earringOrbitRadius;
    const z = Math.sin(this.earringOrbitAngle) * this.earringOrbitRadius;
    this.earringBeadA.position.set(x, 0, z);
    this.earringBeadB.position.set(-x, 0, -z);
  }

  private projectToScreen(local: THREE.Vector3, group: THREE.Object3D, w: number, h: number): { x: number; y: number } {
    this.projectionScratch.copy(local).applyMatrix4(group.matrixWorld).project(this.camera);
    return {
      x: (this.projectionScratch.x * 0.5 + 0.5) * w,
      y: (1 - (this.projectionScratch.y * 0.5 + 0.5)) * h,
    };
  }

  /**
   * Positions each annotation's dot at its real projected 3D point, then
   * points a leader line outward (away from the object's projected center)
   * into the surrounding negative space, with the label clamped to stay
   * fully on-screen. The label's distance is anchored from the projected
   * CENTER (not the dot), so it always clears the object's edge by a
   * guaranteed margin regardless of exactly where the dot sits — and a
   * fixed per-annotation angular nudge keeps the two nearby landmarks
   * (surface / profile) from landing on top of each other.
   */
  private updateAnnotations(): void {
    const els = this.config.annotationEls;
    if (!els || !this.inspecting) return;

    const group = this.activeGroup;
    const points = this.activeAnnotationPoints;
    const radiusProbe = this.activeRadiusProbe;

    group.updateMatrixWorld();
    this.camera.updateMatrixWorld();

    const w = window.innerWidth;
    const h = window.innerHeight;

    const center = this.projectToScreen(this.originPoint, group, w, h);
    const edge = this.projectToScreen(radiusProbe, group, w, h);
    const screenRadius = Math.hypot(edge.x - center.x, edge.y - center.y);
    const labelDistance = screenRadius + ANNOTATION_RING_CLEARANCE;

    points.forEach((local, i) => {
      const el = els[i];
      if (!el) return;

      const dot = this.projectToScreen(local, group, w, h);

      let dirX = dot.x - center.x;
      let dirY = dot.y - center.y;
      const dist = Math.hypot(dirX, dirY) || 1;
      dirX /= dist;
      dirY /= dist;
      if (dist < 1) {
        const fallback = (i / points.length) * Math.PI * 2;
        dirX = Math.cos(fallback);
        dirY = Math.sin(fallback);
      }

      // Rotate the outward direction by a fixed per-annotation angle so
      // labels that start close together (surface/profile are near the same
      // spot on the band) fan out instead of overlapping.
      const nudgeRad = THREE.MathUtils.degToRad(ANNOTATION_ANGLE_NUDGE_DEG[i] ?? 0);
      const cos = Math.cos(nudgeRad);
      const sin = Math.sin(nudgeRad);
      const nudgedX = dirX * cos - dirY * sin;
      const nudgedY = dirX * sin + dirY * cos;

      let labelX = center.x + nudgedX * labelDistance;
      let labelY = center.y + nudgedY * labelDistance;
      labelX = THREE.MathUtils.clamp(labelX, ANNOTATION_SCREEN_MARGIN, w - ANNOTATION_SCREEN_MARGIN);
      labelY = THREE.MathUtils.clamp(labelY, ANNOTATION_SCREEN_MARGIN, h - ANNOTATION_SCREEN_MARGIN);

      const relX = labelX - dot.x;
      const relY = labelY - dot.y;
      const relDist = Math.hypot(relX, relY) || 1;
      const lineLen = Math.max(relDist - ANNOTATION_LABEL_GAP, 12);
      const angleDeg = (Math.atan2(relY, relX) * 180) / Math.PI;
      const pointsLeft = relX < 0;

      const leadEl = el.querySelector<HTMLElement>('.lead');
      const labelEl = el.querySelector<HTMLElement>('.label');

      el.style.transform = `translate(${dot.x}px, ${dot.y}px)`;
      if (leadEl) {
        leadEl.style.width = `${lineLen}px`;
        leadEl.style.transform = `rotate(${angleDeg}deg)`;
      }
      if (labelEl) {
        labelEl.style.textAlign = pointsLeft ? 'right' : 'left';
        labelEl.style.transform = pointsLeft
          ? `translate(calc(${relX}px - 100%), ${relY - 8}px)`
          : `translate(${relX}px, ${relY - 8}px)`;
      }
    });
  }

  private resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.particleSystem.setPixelRatio(this.renderer.getPixelRatio());
    this.scrollController.refresh();
  };

  private renderLoop = (): void => {
    this.rafId = requestAnimationFrame(this.renderLoop);

    const elapsed = this.clock.getElapsedTime();
    const formationProgress = this.effectiveFormationProgress;

    this.particleSystem.update(formationProgress, elapsed);
    this.jewelryMesh.update(formationProgress);

    this.updateFormedState();

    // Re-arm slide navigation once the user has confirmed scrolled back up a
    // real amount from where they exited — NOT just "progress reads ~1",
    // which is true both approaching AND already past the pin boundary and
    // would otherwise re-enable mid-scroll, immediately intercept the next
    // wheel tick, and feel like a soft lock right at the exit point.
    if (!this.slideController.enabled && this.ringEverFormed && window.scrollY < this.exitScrollY - 150) {
      this.slideController.enabled = true;
    }

    // The slide transition is a pure function of elapsed time since it was
    // triggered — never of scroll position — so it always completes in
    // SLIDE_TRANSITION_DURATION regardless of how the user scrolled/swiped.
    // smoothedCarousel is a continuous, unwrapped position (see
    // carouselOffset) — it animates by exactly ±1 per transition, even
    // across a loop wrap, so per-piece screen position (below) can be
    // computed generically without ever sweeping through an unrelated piece.
    const t = THREE.MathUtils.clamp((elapsed - this.slideTransitionStart) / SLIDE_TRANSITION_DURATION, 0, 1);
    const easeT = t * t * (3 - 2 * t);
    this.smoothedCarousel = THREE.MathUtils.lerp(this.slideTransitionFrom, this.slideTransitionTarget, easeT);
    const settled = Math.abs(this.smoothedCarousel - Math.round(this.smoothedCarousel)) < 0.015;

    this.dragController.enabled =
      (formationProgress >= DRAG_ENABLE_THRESHOLD && settled && this.slideIndex === 0) ||
      this.braceletFormed ||
      this.earringsFormed;
    const drag = this.dragController.update();
    const mouseTiltX = this.mouseNDC.y * 0.015;
    const mouseTiltY = this.mouseNDC.x * 0.025;

    // The earring pair orbits only while active (see updateEarringOrbitPositions)
    // and freezes while inspecting, so its annotation points (read from the
    // beads' live positions) stay put and legible.
    const earringOrbitActive = this.earringsFormed && !this.inspecting;
    if (earringOrbitActive) {
      if (this.earringOrbitWasActive) this.earringOrbitAngle += (elapsed - this.earringOrbitLastElapsed) * EARRING_ORBIT_SPEED;
      this.earringOrbitLastElapsed = elapsed;
    }
    this.earringOrbitWasActive = earringOrbitActive;
    this.updateEarringOrbitPositions();

    const slideDistance = this.boundingRadius * SLIDE_DISTANCE_MULTIPLIER;
    const groups: { object: THREE.Object3D; index: number }[] = [
      { object: this.group, index: 0 },
      { object: this.braceletGroup, index: 1 },
      { object: this.earringsGroup, index: 2 },
    ];
    for (const { object, index } of groups) {
      object.rotation.x = PRESENTATION_TILT.x + drag.x + mouseTiltX;
      object.rotation.y = PRESENTATION_TILT.y + drag.y + mouseTiltY + elapsed * AUTO_SPIN_SPEED;
      // Wrapped distance to the nearest representation of this piece's slot
      // (mod SLIDE_COUNT) — positions every piece correctly regardless of
      // how far the continuous carouselOffset has wandered, and never
      // sweeps a piece through a position it doesn't occupy.
      const delta = this.smoothedCarousel - index;
      const wrapped = delta - SLIDE_COUNT * Math.round(delta / SLIDE_COUNT);
      object.position.x = wrapped * slideDistance;
    }
    this.wrapperEl.classList.toggle('is-carousel', !settled);

    this.pointerLight.update(this.ringCenter, this.lightSpread, this.lightDepth);

    // Camera dolly for inspection mode — a real move-closer, not a CSS scale.
    // The target distance is derived from the ring's actual bounding sphere
    // and the current FOV/aspect every frame, so it stays correct on resize
    // and never crops the object regardless of viewport shape.
    const dollyTarget = this.inspecting ? this.computeFramedDistance(INSPECT_FRAMING_MULTIPLIER) : this.fitDistance;
    this.dollyDistance += (dollyTarget - this.dollyDistance) * 0.05;

    const targetX = this.baseCameraPos.x + this.mouseNDC.x * 0.35;
    const targetY = this.baseCameraPos.y + this.mouseNDC.y * 0.22;
    this.camera.position.x += (targetX - this.camera.position.x) * 0.04;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.04;
    this.camera.position.z = this.dollyDistance;

    // Shift the ring right of center as formation finishes, via an
    // asymmetric frustum offset (setViewOffset) rather than moving the
    // group — keeps the geometry undistorted and the rotation pivot correct.
    // Inspection mode recenters instead, for a balanced examination view
    // with annotations flanking both sides; the slide relaxes it back to
    // center too, since the bracelet settles into a centered frame.
    const ringDelta = this.smoothedCarousel;
    const ringCloseness =
      1 - THREE.MathUtils.clamp(Math.abs(ringDelta - SLIDE_COUNT * Math.round(ringDelta / SLIDE_COUNT)), 0, 1);
    const baseShift = THREE.MathUtils.smoothstep(formationProgress, 0.7, 1.0) * RING_SHIFT_FRACTION;
    const shiftTarget = this.inspecting ? 0 : baseShift * ringCloseness;
    this.viewShift += (shiftTarget - this.viewShift) * 0.06;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.setViewOffset(w, h, -this.viewShift * w, 0, w, h);

    this.updateAnnotations();

    document.documentElement.style.setProperty('--hero-progress', String(formationProgress));

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onPointerMove);
    this.scrollController.dispose();
    this.dragController.dispose();
    this.slideController.dispose();
    this.pointerLight.dispose();
    this.particleSystem.dispose();
    this.jewelryMesh.dispose();
    this.braceletMesh?.geometry.dispose();
    this.braceletMaterial.material.dispose();
    this.earringBeadA.geometry.dispose();
    this.earringMaterial.material.dispose();
    this.renderer.dispose();
  }
}
