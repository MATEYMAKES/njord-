/* ================================================================
   NJORD — ASCII rendering engine
   A single reusable system that turns point clouds (spheres, glyphs,
   generative fields) into character compositions. Everything on the
   site that "is ASCII" runs through this file.
   ================================================================ */

/* ---- tiny deterministic PRNG so generative textures stay stable across
   resizes / re-renders instead of reshuffling every frame ---- */
export function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- central animation ticker: one rAF loop drives every live field,
   fields register/unregister as they enter/leave the viewport ---- */
class Ticker{
  constructor(){
    this._items = new Set();
    this._running = false;
    this._last = 0;
    this._tick = this._tick.bind(this);
  }
  add(fn){ this._items.add(fn); this._start(); }
  remove(fn){ this._items.delete(fn); if(this._items.size === 0) this._stop(); }
  _start(){
    if(this._running) return;
    this._running = true;
    this._last = performance.now();
    requestAnimationFrame(this._tick);
  }
  _stop(){ this._running = false; }
  _tick(t){
    if(!this._running) return;
    const dt = Math.min((t - this._last) / 1000, 0.05);
    this._last = t;
    for(const fn of this._items) fn(dt, t);
    requestAnimationFrame(this._tick);
  }
}
export const ticker = new Ticker();

export const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- pause/resume a callback based on viewport visibility ---- */
export function whenVisible(el, onEnter, onExit){
  const io = new IntersectionObserver((entries) => {
    for(const entry of entries){
      if(entry.isIntersecting) onEnter(); else onExit && onExit();
    }
  }, { threshold: 0.02 });
  io.observe(el);
  return io;
}

/* ----------------------------------------------------------------
   AsciiField — renders a flat array of points {x,y,i,a} (all 0..1,
   a = alpha, optional) onto a canvas using a character density ramp.
   Points are NOT snapped to a grid; each is placed independently,
   which is what lets the same engine render a sphere, a glyph, or a
   generative texture with identical code.
   ---------------------------------------------------------------- */
export class AsciiField{
  constructor(canvas, opts = {}){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = Object.assign({
      charSet: ' ·:-=+*#%@',
      fontSize: 12,
      fontFamily: "'JetBrains Mono', monospace",
      getColor: () => '#15150F',
    }, opts);
    this.points = [];
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas);
    this.resize();
  }
  resize(){
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w; this.h = h;
  }
  setPoints(points){ this.points = points; }
  destroy(){ this._ro.disconnect(); }
  render(){
    const { ctx, w, h } = this;
    if(!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    ctx.font = `${this.opts.fontSize}px ${this.opts.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.opts.getColor();
    const chars = this.opts.charSet;
    const lastIndex = chars.length - 1;
    let currentAlpha = 1;
    ctx.globalAlpha = 1;
    for(let n = 0; n < this.points.length; n++){
      const p = this.points[n];
      const a = p.a === undefined ? 1 : p.a;
      if(a <= 0.01) continue;
      if(a !== currentAlpha){ ctx.globalAlpha = a; currentAlpha = a; }
      const idx = idxClamp(p.i, lastIndex);
      ctx.fillText(chars[idx], p.x * w, p.y * h);
    }
    ctx.globalAlpha = 1;
  }
}
function idxClamp(i, lastIndex){
  const v = Math.floor(i * lastIndex);
  return v < 0 ? 0 : v > lastIndex ? lastIndex : v;
}

/* ----------------------------------------------------------------
   Point-set generators
   ---------------------------------------------------------------- */

/** Even distribution of points across a unit sphere (Fibonacci sphere).
 *  Each point doubles as its own surface normal. */
export function fibonacciSphere(n){
  const pts = new Array(n);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for(let i = 0; i < n; i++){
    const y = 1 - (i / (n - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts[i] = { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius };
  }
  return pts;
}

/** Sample a piece of text/glyphs rendered offscreen into a point cloud
 *  in 0..1 space, so the ASCII system can "draw" typography too. */
export function pointsFromGlyph(text, { size = 200, fontPx = 140, fontFamily = "'JetBrains Mono', monospace", step = 4, threshold = 90 } = {}){
  const off = document.createElement('canvas');
  off.width = size; off.height = size;
  const octx = off.getContext('2d');
  octx.clearRect(0, 0, size, size);
  octx.fillStyle = '#fff';
  octx.textAlign = 'center';
  octx.textBaseline = 'middle';
  octx.font = `700 ${fontPx}px ${fontFamily}`;
  octx.fillText(text, size / 2, size / 2 + fontPx * 0.04);
  const data = octx.getImageData(0, 0, size, size).data;
  const pts = [];
  for(let y = 0; y < size; y += step){
    for(let x = 0; x < size; x += step){
      const a = data[(y * size + x) * 4 + 3];
      if(a > threshold) pts.push({ x: x / size, y: y / size, i: a / 255 });
    }
  }
  return pts;
}

/* ----------------------------------------------------------------
   Shared 3D helpers for the organism's GLOBE and DIAMOND formations.
   ---------------------------------------------------------------- */
function rotate3(p, angleY, angleX){
  const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
  const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
  const x1 = p.x * cosY + p.z * sinY;
  const z1 = -p.x * sinY + p.z * cosY;
  const y1 = p.y * cosX - z1 * sinX;
  const z2 = p.y * sinX + z1 * cosX;
  return { x: x1, y: y1, z: z2 };
}
function project3(p, perspective){
  const factor = perspective / (perspective - p.z);
  return { x: p.x * factor, y: p.y * factor };
}
function smoothstep(edge0, edge1, x){
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
function lerp(a, b, t){ return a + (b - a) * t; }
// Catmull-Rom spline through 4 control points — used by the roadmap
// formation's path so it reads as genuinely curved rather than a
// piecewise-straight line between jittered points.
function catmullRom(p0, p1, p2, p3, t){
  const t2 = t * t, t3 = t2 * t;
  const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  return { x, y };
}

/* stylized, deliberately non-cartographic continent silhouettes —
   just enough for the rotating sphere to unmistakably read as Earth */
const EARTH_BLOBS = [
  { lonC: 15, latC: 8, lonR: 34, latR: 36 },    // Africa / Europe
  { lonC: 85, latC: 42, lonR: 68, latR: 28 },   // Asia
  { lonC: -100, latC: 46, lonR: 30, latR: 22 }, // North America
  { lonC: -65, latC: -12, lonR: 20, latR: 34 }, // South America
  { lonC: 134, latC: -26, lonR: 18, latR: 12 }, // Australia
];
function isLand(latDeg, lonDeg){
  for(const b of EARTH_BLOBS){
    const dx = (lonDeg - b.lonC) / b.lonR;
    const dy = (latDeg - b.latC) / b.latR;
    if(dx * dx + dy * dy < 1) return true;
  }
  return false;
}

/* a torus — a thin golden ring, parameterized by theta (position
   around the main loop) and phi (position around the tube's own
   cross-section). RING_MAJOR/RING_MINOR set its overall proportions;
   ringPoint/ringNormalAt are pure functions of (theta, phi) so any
   particle's position is a deterministic function of its own fixed
   identity, same as every other formation. */
const RING_MAJOR = 0.85, RING_MINOR = 0.24;
function ringPoint(theta, phi, major = RING_MAJOR, minor = RING_MINOR){
  const cosT = Math.cos(theta), sinT = Math.sin(theta);
  const cosP = Math.cos(phi), sinP = Math.sin(phi);
  const tubeR = major + minor * cosP;
  return { x: tubeR * cosT, y: minor * sinP, z: tubeR * sinT };
}
function ringNormalAt(theta, phi){
  const cosT = Math.cos(theta), sinT = Math.sin(theta);
  const cosP = Math.cos(phi), sinP = Math.sin(phi);
  return { x: cosP * cosT, y: sinP, z: cosP * sinT };
}

const ORGANISM_DENSE = ' .:-=+*#%@';
const ORGANISM_GEM = ' .:+*x#%@';

/* ----------------------------------------------------------------
   AsciiOrganism — the one continuous population of ASCII particles
   that travels through the entire page. Every particle has a fixed
   identity (an Earth surface sample, a diamond-facet position, a
   wave-line slot, a network role) computed once at construction, so
   "becoming" a different formation is a change of TARGET, never a
   respawn. Which formation is targeted, and how strongly it has
   resolved, is driven by proximity to registered page zones.
   ---------------------------------------------------------------- */
export class AsciiOrganism{
  constructor(canvas, opts = {}){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = prefersReducedMotion();
    this.getInkColor = opts.getInkColor || (() => '#15150F');
    // iOS Safari throttles sustained canvas work hard (this organism draws
    // hundreds of individual fillText glyphs every frame — exactly the kind
    // of continuous load that trips it), so mobile isn't just "fewer
    // particles," it's a genuinely lighter render path throughout: see
    // resize() (lower DPR) and _frame() (frame-rate throttle + cheaper
    // per-frame math) below.
    this.isMobile = window.innerWidth < 720;
    this.count = opts.count || (this.isMobile ? 260 : 820);
    const n = this.count;
    const rnd = mulberry32(1337);

    this.x = new Float32Array(n); this.y = new Float32Array(n);
    this.vx = new Float32Array(n); this.vy = new Float32Array(n);
    this.intensity = new Float32Array(n).fill(0.15);
    this.colorMix = new Float32Array(n);

    this.earthX = new Float32Array(n); this.earthY = new Float32Array(n); this.earthZ = new Float32Array(n);
    this.earthLand = new Uint8Array(n);
    fibonacciSphere(n).forEach((p, i) => {
      this.earthX[i] = p.x; this.earthY[i] = p.y; this.earthZ[i] = p.z;
      const lat = Math.asin(Math.max(-1, Math.min(1, p.y))) * 180 / Math.PI;
      const lon = Math.atan2(p.z, p.x) * 180 / Math.PI;
      this.earthLand[i] = isLand(lat, lon) ? 1 : 0;
    });

    // ring identity: theta is spread evenly around the loop (with a little
    // jitter so it doesn't read as a perfect grid), phi is free around the
    // tube's own cross-section — same "identity fixed at construction" rule
    this.ringTheta = new Float32Array(n);
    this.ringPhi = new Float32Array(n);
    for(let i = 0; i < n; i++){
      this.ringTheta[i] = (i / n) * Math.PI * 2 + (rnd() - 0.5) * (Math.PI * 2 / n);
      this.ringPhi[i] = rnd() * Math.PI * 2;
    }

    this.waveLine = new Uint8Array(n);
    this.waveT = new Float32Array(n);
    this.wavePhase = new Float32Array(n);
    for(let i = 0; i < n; i++){
      this.waveLine[i] = i % 3;
      this.waveT[i] = rnd();
      this.wavePhase[i] = rnd() * Math.PI * 2;
    }

    const nodeCount = 22;
    this.nodeCount = nodeCount;
    this.nodeAnchorX = new Float32Array(nodeCount);
    this.nodeAnchorY = new Float32Array(nodeCount);
    this.nodePhase = new Float32Array(nodeCount);
    this.nodePosX = new Float32Array(nodeCount);
    this.nodePosY = new Float32Array(nodeCount);
    this.nearestNode = new Int16Array(nodeCount);
    this.nearestNode2 = new Int16Array(nodeCount);
    for(let k = 0; k < nodeCount; k++){
      this.nodeAnchorX[k] = (rnd() - 0.5) * 0.95;
      this.nodeAnchorY[k] = (rnd() - 0.5) * 0.95;
      this.nodePhase[k] = rnd() * Math.PI * 2;
      this.nearestNode[k] = (k + 1) % nodeCount;
      this.nearestNode2[k] = (k + 2) % nodeCount;
    }
    // dense: most particles are nodes or connective tissue, only a small
    // fraction stay as loose ambient particulate around the network
    const stride = Math.max(6, Math.floor(n / nodeCount));
    this.networkRole = new Uint8Array(n); // 1 = node, 2 = edge-filler, 0 = free ambient
    this.networkNode = new Int16Array(n).fill(-1);
    for(let i = 0; i < n; i++){
      if(i % stride === 0 && Math.floor(i / stride) < nodeCount){
        this.networkRole[i] = 1;
        this.networkNode[i] = Math.floor(i / stride);
      } else if(i % 5 !== 0){
        this.networkRole[i] = 2;
      }
    }

    // CONSTELLATION (studio section) — the same seeded 9-node diagram that
    // used to render as its own small standalone canvas next to the studio
    // copy, now folded into the one persistent organism instead of being a
    // separate graphic. Seeded identically (11) so it's the same layout,
    // just performed by the shared particle pool. Deliberately static (no
    // drift/rotation of its own, unlike every other formation) — it reads
    // as a held diagram, which fits "systems, not styles."
    const CONST_NODE_COUNT = 9;
    const constRnd = mulberry32(11);
    this.constNodeX = new Float32Array(CONST_NODE_COUNT);
    this.constNodeY = new Float32Array(CONST_NODE_COUNT);
    for(let k = 0; k < CONST_NODE_COUNT; k++){
      this.constNodeX[k] = 0.12 + constRnd() * 0.76;
      this.constNodeY[k] = 0.12 + constRnd() * 0.76;
    }
    const constEdgePairs = [];
    for(let a = 0; a < CONST_NODE_COUNT; a++){
      for(let b = a + 1; b < CONST_NODE_COUNT; b++){
        if(constRnd() > 0.72) continue;
        constEdgePairs.push([a, b]);
      }
    }
    if(constEdgePairs.length === 0) constEdgePairs.push([0, CONST_NODE_COUNT - 1]);
    this.constEdgeCount = constEdgePairs.length;
    this.constEdgeA = new Int16Array(this.constEdgeCount);
    this.constEdgeB = new Int16Array(this.constEdgeCount);
    constEdgePairs.forEach(([a, b], idx) => { this.constEdgeA[idx] = a; this.constEdgeB[idx] = b; });

    // distribute the whole particle pool across the 9 nodes + their
    // connecting edges — same node-vs-connective-tissue split as NETWORK
    const constStride = Math.max(6, Math.floor(n / CONST_NODE_COUNT));
    this.constRole = new Uint8Array(n); // 1 = node, 2 = edge
    this.constNode = new Int16Array(n).fill(-1);
    this.constEdge = new Int16Array(n).fill(-1);
    this.constEdgeT = new Float32Array(n);
    for(let i = 0; i < n; i++){
      if(i % constStride === 0 && Math.floor(i / constStride) < CONST_NODE_COUNT){
        this.constRole[i] = 1;
        this.constNode[i] = Math.floor(i / constStride);
      } else {
        this.constRole[i] = 2;
        this.constEdge[i] = i % this.constEdgeCount;
        this.constEdgeT[i] = rnd();
      }
    }

    // per-particle phase for a small amount of organic wobble riding on
    // top of the resolved target — texture, not a competing state
    this.jitterSeed = new Float32Array(n);
    for(let i = 0; i < n; i++){ this.jitterSeed[i] = rnd() * Math.PI * 2; }
    for(let i = 0; i < n; i++){ this.x[i] = 0.5 + (rnd() - 0.5) * 0.2; this.y[i] = 0.5 + (rnd() - 0.5) * 0.2; }

    this._generateRoadmapLayout();
    this._generateMascotLayout(rnd);

    this.zones = [];
    this.getWaveform = null; // set via setWaveformSource() once audio exists
    this.seg = null; // last resolved timeline segment — read by the audio engine
    this.pointerSpeed = 0; // read by the audio engine
    this.time = 0;
    this.pointerX = 0.5; this.pointerY = 0.5;
    this.lastPointerX = 0.5; this.lastPointerY = 0.5;
    this.scrollTurbulence = 0;
    this.lastScrollY = window.scrollY || 0;

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas);
    this.resize();
    this._frame = this._frame.bind(this);
    this._burstFrame = this._burstFrame.bind(this);
    this._burstDur = 0.6;
    this._burstT = 0;
    this._burstDir = 1;
    this._burstAccentRGB = [203, 255, 61];
    this._burstRevealed = false;
    this._lastAnchorX = 0.5; this._lastAnchorY = 0.5;

    // MASCOT runtime state — idle glance/stray-encounter/click-alert
    // timers and the last-resolved cursor pull, all updated once per
    // frame in _updateMascotState() rather than per particle. Timers
    // only advance while 'mascot' is actually part of the current
    // timeline segment (see _updateMascotState), matching the
    // standalone version's old whenVisible()-gated start/stop.
    this._mascotGlanceElapsed = -1;
    this._mascotNextGlanceIn = mascotNextGlanceWait(Math.random);
    this._mascotGlanceTargetIdx = 0;
    this._mascotGlanceAmount = 0;
    this._mascotGlanceTarget = MASCOT_WATCH_PT;
    this._mascotEncounter = null;
    this._mascotNextEncounterIn = mascotNextEncounterWait(Math.random);
    this._mascotAlertElapsed = -1;
    this._mascotAlertAmount = 0;
    this._mascotPullX = 0; this._mascotPullY = 0;
    this._mascotAttention = 0;
    this._mascotTorsoShiftX = 0;
    this._mascotTorsoShiftY = 0;
    this._mascotIdleElapsed = 0;
    this._mascotIdleRoutineIndex = 0;
    this._mascotIdleForced = false;
    this._mascotJumpJackAmount = 0;
    this._mascotWaveAmount = 0;
    this._mascotHeadInspectAmount = 0;
    this._mascotBalanceAmount = 0;
    this._mascotBalanceWobble = 0;
    this._mascotFrame = { x: 0, y: 0, width: 0, height: 0 };
    this._mascotAnchor = { x: 0.5, y: 0.5 };
    // While the mascot conversation panel is open, he should hold his
    // fully-formed pose through a lot more upward scroll than usual
    // before starting to unform — see setMascotConvoOpen()/_timelineSegment.
    this._mascotHoldOpen = false;
  }

  setZones(zones){
    this.zones = zones; // [{ name, el, ranged? }]
    this._rangedZoneNames = new Set(zones.filter((z) => z.ranged).map((z) => z.name));
  }
  /* Injects a function returning a live audio-sample array (Float32Array,
     -1..1) so the WAVE formation can be driven by the generated audio
     system's real output instead of a synthetic sine — kept as a plain
     injected callback so this file stays audio-agnostic; see main.js and
     audio-engine.js for the actual wiring. */
  setWaveformSource(fn){ this.getWaveform = fn; }
  /** Called by main.js whenever the mascot conversation panel opens or
   *  closes (see mascot-convo.js's onOpenChange). See _timelineSegment
   *  for what this actually does to the scroll-to-formation mapping. */
  setMascotConvoOpen(open){ this._mascotHoldOpen = !!open; }
  setPointer(nx, ny){
    this.lastPointerX = this.pointerX; this.lastPointerY = this.pointerY;
    this.pointerX = nx; this.pointerY = ny;
  }
  resize(){
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    // capping at 1x on mobile (vs. 2x elsewhere) quarters the raster area
    // fillText has to cover — canvas text rendering is the actual expense
    // here, not the DOM/CSS size, and this is the single biggest lever on
    // that cost short of drawing fewer characters
    const dpr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 1 : 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
  }
  destroy(){
    this.stop();
    this._ro.disconnect();
    if(this._visHandler) document.removeEventListener('visibilitychange', this._visHandler);
  }

  start(){
    if(this.reduced){
      for(let k = 0; k < 40; k++) this._frame(0.05);
      return;
    }
    ticker.add(this._frame);
    // no point burning CPU/battery animating a canvas nobody can see —
    // also means iOS never gets a chance to build up the sustained
    // background load that triggers its own throttling in the first place
    if(!this._visHandler){
      this._visHandler = () => {
        if(document.hidden) ticker.remove(this._frame);
        else if(!this.reduced) ticker.add(this._frame);
      };
      document.addEventListener('visibilitychange', this._visHandler);
    }
  }
  stop(){ if(!this.reduced) ticker.remove(this._frame); }

  /* ----------------------------------------------------------------
     ROADMAP (Services section) — node x-positions and the path
     between them are randomized ONCE per page load (Math.random(), not
     mulberry32 — deliberately NOT seeded, so every refresh produces a
     different composition; every other formation in this file IS
     seeded for stability, this is the one intentional exception).
     Node y is fixed/evenly-spaced (order must always read top-to-
     bottom); only x varies. Stored as normalized 0-1 fractions so a
     resize reflows proportionally instead of re-rolling — this is what
     "fixed during the session" means once devicePixelRatio/viewport
     changes happen (including iOS's own toolbar-driven resize).
     ---------------------------------------------------------------- */
  _generateRoadmapLayout(){
    const NODE_COUNT = 5;
    this.roadmapNodeCount = NODE_COUNT;
    const xBand = this.isMobile ? [0.38, 0.62] : [0.18, 0.82];
    const minSep = this.isMobile ? 0.08 : 0.14;
    const nodes = [];
    for(let k = 0; k < NODE_COUNT; k++){
      let x = xBand[0] + Math.random() * (xBand[1] - xBand[0]);
      let attempts = 0;
      while(k > 0 && Math.abs(x - nodes[k - 1].x) < minSep && attempts < 12){
        x = xBand[0] + Math.random() * (xBand[1] - xBand[0]);
        attempts++;
      }
      nodes.push({ x, y: (k + 0.5) / NODE_COUNT });
    }
    this.roadmapNodes = nodes;

    // path: each node plus 5 jittered intermediate seeds per segment.
    // _roadmapPointAt below runs a Catmull-Rom spline through these
    // points for genuine curvature (not straight lerps); jitter is kept
    // modest so the spline bends smoothly rather than zigzagging.
    const seeds = [];
    const SEEDS_PER_SEGMENT = 5;
    for(let k = 0; k < NODE_COUNT - 1; k++){
      const A = nodes[k], B = nodes[k + 1];
      seeds.push({ x: A.x, y: A.y, node: k });
      const dx = B.x - A.x, dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      for(let s = 1; s <= SEEDS_PER_SEGMENT; s++){
        const u = s / (SEEDS_PER_SEGMENT + 1);
        const jitter = (Math.random() - 0.5) * 0.1;
        seeds.push({ x: A.x + dx * u + nx * jitter, y: A.y + dy * u + ny * jitter, node: -1 });
      }
    }
    seeds.push({ x: nodes[NODE_COUNT - 1].x, y: nodes[NODE_COUNT - 1].y, node: NODE_COUNT - 1 });
    this.roadmapSeeds = seeds;

    // per-particle identity along the path — computed once, like every
    // other formation's identity fields above
    const n = this.count;
    this.roadmapU = new Float32Array(n);
    this.roadmapDensity = new Float32Array(n);
    // a fixed perpendicular offset per particle spreads the route into a
    // visible band of characters instead of every particle stacking on
    // the exact same mathematical line — this is what actually reads as
    // "thickness" for a route made of scattered ASCII points
    this.roadmapOffset = new Float32Array(n);
    for(let i = 0; i < n; i++){
      const raw = Math.random();
      // low-frequency warp so density varies along the path (some
      // stretches dense, some sparse) instead of perfectly uniform.
      // Amplitude must stay low: this mapping's derivative is
      // (1 + amplitude*frequency*cos(...)) — once amplitude*frequency
      // exceeds 1, the derivative goes negative across part of the raw
      // domain, meaning a whole range of particles fold onto overlapping
      // output u values instead of spreading smoothly, producing a hard
      // density spike rather than gentle texture (this is what caused a
      // visible clump right around node 2 at a first-pass 0.15 amplitude
      // — 0.08 keeps amplitude*frequency safely under 1). If this
      // amplitude or the *3.1 frequency below is ever retuned, keep
      // their product under 1.
      const warp = 0.08 * Math.sin(raw * Math.PI * 3.1);
      this.roadmapU[i] = Math.max(0, Math.min(1, raw + warp));
      // "thicker" means more/denser ASCII characters packed into a
      // smaller span, not a wider band — see roadmapOffset below, which
      // stays narrow for the same reason.
      this.roadmapDensity[i] = (0.4 + Math.random() * 0.6) * 1.8;
      // averaging two random values (a triangular, not uniform,
      // distribution) concentrates particles near the centerline and
      // tapers off toward the edges — reads as a solid, filled stroke
      // rather than an evenly-scattered cloud of points.
      this.roadmapOffset[i] = (Math.random() + Math.random() - 1) * 0.019;
    }
  }

  _roadmapPointAt(u){
    const seeds = this.roadmapSeeds;
    const last = seeds.length - 1;
    const segCount = last;
    const pos = Math.max(0, Math.min(1, u)) * segCount;
    const idx = Math.min(segCount - 1, Math.floor(pos));
    const frac = pos - idx;
    const p0 = seeds[Math.max(0, idx - 1)];
    const p1 = seeds[idx];
    const p2 = seeds[Math.min(last, idx + 1)];
    const p3 = seeds[Math.min(last, idx + 2)];
    return catmullRom(p0, p1, p2, p3, frac);
  }

  // tangent direction at path position u, via a small finite difference —
  // used to offset particles PERPENDICULAR to the route (see roadmapOffset
  // above) rather than only along it
  _roadmapTangentAt(u){
    const d = 0.01;
    const a = this._roadmapPointAt(Math.max(0, u - d));
    const b = this._roadmapPointAt(Math.min(1, u + d));
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  /* ----------------------------------------------------------------
     MASCOT — assigns every particle a fixed identity within the
     mascot's silhouette (once, like every other formation's identity
     fields above): most join the dense body grid and a small minority
     remain ambient strays. Every particle receives a mascot target;
     none are hidden or replaced by a separate drawing layer, so the
     same cloud visibly retargets into and back out of the figure.
     ---------------------------------------------------------------- */
  _generateMascotLayout(rnd){
    const n = this.count;
    this.mascotStrays = mascotBuildStrays(rnd, 25);
    this.mascotKind = new Uint8Array(n);
    this.mascotIdx = new Int16Array(n);
    this.mascotMicroX = new Float32Array(n);
    this.mascotMicroY = new Float32Array(n);
    const strayCount = Math.max(12, Math.floor(n * 0.12));
    for(let i = 0; i < n; i++){
      const stray = i < strayCount;
      this.mascotKind[i] = stray ? 1 : 0;
      this.mascotIdx[i] = stray
        ? i % this.mascotStrays.length
        : (i - strayCount) % MASCOT_BODY_POINTS.length;
      const spread = stray ? 0.05 : 0.045;
      this.mascotMicroX[i] = (rnd() - 0.5) * spread * 2;
      this.mascotMicroY[i] = (rnd() - 0.5) * spread * 2;
    }
  }

  /* One continuous timeline instead of competing zones. The zones are
     registered in scroll order (globe, diamond, wave, network, constellation, globe);
     this finds exactly which TWO neighboring anchors the viewport's
     vertical center currently sits between, and how far along that one
     gap it is. Every particle's target is then a pure two-point blend
     of those two anchors — never three, never a muddy sum, never an
     undefined "in between" state. Smoothstep gives each anchor a
     natural hold near its own peak (the curve is flattest at its own
     ends) without any extra plateau logic. */
  _timelineSegment(){
    const scrollY = window.scrollY || 0;
    const vh = window.innerHeight || 1;
    if(this.zones.length === 0) return { a: 'globe', b: 'globe', t: 0, anchorX: 0.72, anchorY: 0.5 };

    const rangedNames = this._rangedZoneNames || new Set();
    const points = [];
    this.zones.forEach((z) => {
      const r = z.el.getBoundingClientRect();
      // Compact formations use the editorial 74% bias and stay inside
      // the usual safe band. The mascot's marker is already positioned
      // exactly where he belongs on the contact rule, so preserve it.
      const mascotTargetH = this.isMobile ? MASCOT_TARGET_HEIGHT_MOBILE_PX : MASCOT_TARGET_HEIGHT_PX;
      const mascotHalfW = mascotTargetH * 3 / 14;
      const rawAnchorX = z.name === 'mascot'
        ? (r.left + r.width / 2 - mascotHalfW) / this.w
        : (r.left + r.width * 0.74) / this.w;
      const anchorX = z.name === 'mascot'
        ? Math.max(0.02, Math.min(0.98, rawAnchorX))
        : Math.max(0.16, Math.min(0.8, rawAnchorX));
      // The mascot belongs to the document: his anchor tracks the real
      // scroll position rather than pinning to a fixed viewport band
      // like every other formation's. But #contact's own remaining
      // scroll room (past the anchor marker, through the form/footer)
      // isn't tall enough to ever carry him fully off the top of the
      // screen — the raw value bottoms out around 0.09 at max scroll —
      // and MASCOT_Y_OFFSET_PX's upward shift plus his own head-square
      // geometry need at least ~0.18 of headroom above that to keep the
      // head on-screen. A real bug hit during live verification: without
      // this floor, the head square rendered above the viewport entirely
      // (y < 0) once scrolled all the way down. Other formations keep
      // their own separate viewport safe-band clamp.
      const rawAnchorY = (r.top + r.height / 2) / vh;
      // On mobile the mascot conversation panel grows UP from him (see
      // updatePosition() in mascot-convo.js), so however much headroom
      // sits above his anchor point directly caps how much of his own
      // dialogue can show before the panel has to scroll internally.
      // NOTE: this floor is a MINIMUM, not a resting position — pushing
      // it up too far (a first attempt used 0.74) DETACHES him from the
      // real anchor line once raw scroll position rises above it, so he
      // ends up hovering at some arbitrary fixed screen fraction instead
      // of standing on the actual line between the heading and the email
      // (the .contact-row border-top, where .mascot-anchor sits — see
      // below). The real fix for "give him room + keep him on the line"
      // is the extra padding-bottom on .contact-head (style.css), which
      // buys room by moving the line itself further down the document,
      // not by clamping him away from it. Keep this floor small — just
      // enough to stop the head clipping off the top of the viewport.
      const mascotFloor = 0.20;
      const anchorY = z.name === 'mascot'
        ? Math.max(mascotFloor, rawAnchorY)
        : Math.max(0.1, Math.min(0.9, rawAnchorY));
      if(z.name === 'mascot') this._mascotAnchor = { x: anchorX, y: anchorY };
      if(z.ranged){
        // spans its own full scroll height instead of one pivot point —
        // contributes two points sharing its name, so the segment
        // BETWEEN them resolves as a same-ends span for the whole
        // section (see the sameEnds fast path in _frame), while normal
        // pairwise blending still drives the approach/exit transitions
        // on either side exactly like every other zone.
        points.push({ name: z.name, docY: scrollY + r.top, anchorX, anchorY });
        points.push({ name: z.name, docY: scrollY + r.top + r.height, anchorX, anchorY });
        // the element's raw viewport-relative rect, refreshed every
        // frame — _formationTarget('roadmap', ...) needs this to place
        // particles at the SAME absolute on-screen position the real
        // DOM node text uses (see main.js), since this element spans
        // many viewport-heights and the usual compact anchor+offset
        // math every other formation uses can't represent that spread
        this._roadmapRect = { top: r.top, left: r.left, width: r.width, height: r.height };
        // each node's CURRENT on-screen position (changes every frame as
        // the section scrolls) — computed once per frame here, not once
        // per particle, since _formationTarget uses it to repel nearby
        // particles away from the text the same way the cursor already
        // repels particles elsewhere in this file (see _frame's
        // desiredOffX/Y) rather than just dimming them.
        if(this.roadmapNodes){
          const vw = this.w || 1, vhPx = this.h || vh;
          this._roadmapNodeScreen = this.roadmapNodes.map((node) => ({
            x: (r.left + node.x * r.width) / vw,
            y: (r.top + node.y * r.height) / vhPx,
          }));
        }
      } else {
        points.push({ name: z.name, docY: scrollY + r.top + r.height / 2, anchorX, anchorY });
      }
    });
    let playheadY = scrollY + vh / 2;
    // While the mascot conversation is open, hold him fully-formed
    // through a large dead-zone of upward scroll before letting the
    // usual scroll-to-formation mapping resume — done by clamping the
    // EFFECTIVE playhead so it lags behind the real one by up to
    // MASCOT_HOLD_VH viewport-heights once the visitor starts scrolling
    // back up out of him, rather than unforming at the first pixel of
    // scroll the way every other formation transition does.
    if(this._mascotHoldOpen && points.length){
      const mascotPoint = points[points.length - 1];
      if(mascotPoint.name === 'mascot' && playheadY < mascotPoint.docY){
        const MASCOT_HOLD_VH = 1.15;
        const deficit = mascotPoint.docY - playheadY;
        playheadY = mascotPoint.docY - Math.max(0, deficit - vh * MASCOT_HOLD_VH);
      }
    }

    if(points.length === 1 || playheadY <= points[0].docY){
      const p = points[0];
      return { a: p.name, b: p.name, t: 0, anchorX: p.anchorX, anchorY: p.anchorY };
    }
    const last = points[points.length - 1];
    if(playheadY >= last.docY) return { a: last.name, b: last.name, t: 0, anchorX: last.anchorX, anchorY: last.anchorY };

    for(let k = 0; k < points.length - 1; k++){
      const A = points[k], B = points[k + 1];
      if(playheadY >= A.docY && playheadY <= B.docY){
        const raw = (playheadY - A.docY) / Math.max(1, B.docY - A.docY);
        // There is slightly less than half a viewport of document below
        // the final marker, so the playhead can stop a few pixels short
        // of it even at maximum scroll. Resolve the closing formation
        // before that unreachable endpoint and keep it firmly locked
        // until the user scrolls back above this final approach band.
        if(B === last && B.name === 'mascot' && raw >= 0.88){
          return { a: B.name, b: B.name, t: 0, anchorX: B.anchorX, anchorY: B.anchorY };
        }
        const t = smoothstep(0, 1, raw);
        const seg = { a: A.name, b: B.name, t, anchorX: lerp(A.anchorX, B.anchorX, t), anchorY: lerp(A.anchorY, B.anchorY, t) };
        if(A.name === B.name && rangedNames.has(A.name)){
          seg.localT = Math.max(0, Math.min(1, raw)); // linear, not smoothstepped — exact scroll correspondence for typing
        } else if(rangedNames.has(B.name)){
          seg.localT = 0; // approaching the ranged zone — it should read as "just starting"
        } else if(rangedNames.has(A.name)){
          seg.localT = 1; // leaving the ranged zone — it should read as "fully finished"
        }
        return seg;
      }
    }
    return { a: last.name, b: last.name, t: 0, anchorX: last.anchorX, anchorY: last.anchorY };
  }

  _formationTarget(name, i, t){
    switch(name){
      case 'globe': {
        const rp = rotate3({ x: this.earthX[i], y: this.earthY[i], z: this.earthZ[i] }, t * 0.05, 0.36);
        const proj = project3(rp, 2.6);
        const light = Math.max(0, rp.x * 0.4 + rp.y * 0.55 + rp.z * 0.73);
        const vis = smoothstep(-0.3, 0.05, rp.z);
        return {
          x: proj.x * 0.78, y: proj.y * 0.78,
          i: (this.earthLand[i] ? 0.22 + light * 0.78 : (0.08 + light * 0.42) * 0.75) * (0.15 + 0.85 * vis),
          c: 0,
        };
      }
      case 'diamond': { // now a golden rotating ring (torus), see ringPoint/ringNormalAt
        const theta = this.ringTheta[i], phi = this.ringPhi[i];
        const lp = ringPoint(theta, phi);
        const angle = t * 0.16;
        const rp = rotate3(lp, angle, 0.5);
        const rn = rotate3(ringNormalAt(theta, phi), angle, 0.5);
        const proj = project3(rp, 2.3);
        const light = Math.max(0, rn.x * 0.3 + rn.y * 0.5 + rn.z * 0.8);
        const vis = smoothstep(-0.25, 0.1, rn.z);
        const sparkle = smoothstep(0.72, 0.95, light);
        const litMul = lerp(0.85, 1.5, sparkle);
        return {
          x: proj.x * 0.42, y: proj.y * 0.42,
          i: (0.12 + light * litMul) * (0.12 + 0.88 * vis),
          c: 1,
        };
      }
      case 'wave': {
        // one clean line carries the signal; a second, fainter line trails
        // it as a soft echo — simpler and more legible than a stack of three
        const line = this.waveLine[i] === 2 ? 1 : this.waveLine[i];
        const amp = [0.48, 0.3][line];
        const speed = [1, 1][line];
        const freq = 2.6;
        const phaseOffset = line === 1 ? 0.35 : 0;
        const x = (this.waveT[i] - 0.5) * 2;
        const breathe = 0.6 + 0.4 * Math.sin(t * 0.28);
        let wave = Math.sin(x * freq + t * speed - phaseOffset + this.wavePhase[i] * 0.15);
        // when the generative audio system is live, this line's shape is
        // genuinely read from the PULSE voice's own output rather than
        // faked — a little of the synthetic sine still shows through so
        // the line stays legible when the audio is quiet or sound is off
        const samples = this.getWaveform && this.getWaveform();
        if(samples && samples.length){
          const readOffset = line === 1 ? (samples.length * 0.18) | 0 : 0;
          const idx = ((((x + 1) * 0.5 * samples.length) | 0) + readOffset) % samples.length;
          const s = samples[(idx + samples.length) % samples.length];
          wave = wave * 0.3 + s * 10 * 0.7;
        }
        const y = wave * amp * breathe;
        return {
          x: x * 0.85, y: y * 0.6,
          i: (line === 0 ? 0.28 : 0.16) + Math.abs(wave) * 0.62,
          c: 1,
        };
      }
      case 'network': {
        const role = this.networkRole[i];
        if(role === 1){
          const k = this.networkNode[i];
          return { x: this.nodePosX[k], y: this.nodePosY[k], i: 0.85, c: 0.4 };
        }
        if(role === 2){
          const a = i % this.nodeCount;
          const b = (i % 2 === 0) ? this.nearestNode[a] : this.nearestNode2[a];
          const et = ((i * 37) % 100) / 100;
          return {
            x: lerp(this.nodePosX[a], this.nodePosX[b], et),
            y: lerp(this.nodePosY[a], this.nodePosY[b], et),
            i: 0.3 + 0.12 * Math.sin(t * 1.4 + i), c: 0.4,
          };
        }
        const k = i % this.nodeCount;
        return {
          x: this.nodePosX[k] + Math.sin(t * 0.4 + this.jitterSeed[i]) * 0.22,
          y: this.nodePosY[k] + Math.cos(t * 0.35 + this.jitterSeed[i]) * 0.22,
          i: 0.12 + 0.08 * Math.sin(t + this.jitterSeed[i]), c: 0.4,
        };
      }
      case 'roadmap': {
        const seg = this.seg;
        const localT = seg && typeof seg.localT === 'number' ? seg.localT : 0;
        const u = this.roadmapU[i];
        // a lookahead margin so the LAST node isn't only revealed at the
        // exact final pixel of the section (localT===1) — without this,
        // node 5 barely rendered for a frame before the exit transition
        // into 'constellation' started scattering/fading it right away.
        // This gives it (and, more gently, every node) genuine settled
        // on-screen time before that happens.
        const revealed = u <= localT + 0.08;
        // not-yet-revealed particles wait right at the growing tip
        // (localT), not at the path's fixed start — once revealed they
        // smoothly extend the path forward from wherever it currently is
        const sampleU = revealed ? u : localT;
        const rawPt = this._roadmapPointAt(sampleU);
        // spread this particle PERPENDICULAR to the route by its own
        // fixed roadmapOffset, so the path reads as a band of characters
        // (visibly thick) instead of every particle stacking on one
        // mathematically-thin line
        const tangent = this._roadmapTangentAt(sampleU);
        const perpX = -tangent.y, perpY = tangent.x;
        const off = this.roadmapOffset[i];
        const samplePt = { x: rawPt.x + perpX * off, y: rawPt.y + perpY * off };

        // Every other formation is compact — it fits within roughly one
        // viewport around a single anchor point, so a small -1..1 local
        // offset added to that anchor is enough. This section spans many
        // viewport-heights (see .roadmap-nodes, style.css), so instead
        // this computes the particle's ABSOLUTE on-screen position from
        // the section's real, currently-scrolled bounding rect
        // (this._roadmapRect, refreshed every frame in _timelineSegment)
        // — the exact same math the real DOM .roadmap-node text uses to
        // position itself (main.js) — then back-solves what local
        // fx/fy the usual anchor-relative formula in _frame would need
        // to land exactly there. That keeps this formation pixel-aligned
        // with its own text while still blending smoothly through the
        // shared anchor system on the way in from 'network' and out to
        // 'constellation'.
        let fx, fy;
        const rect = this._roadmapRect;
        if(rect && seg && this.w && this.h){
          let absX = (rect.left + samplePt.x * rect.width) / this.w;
          let absY = (rect.top + samplePt.y * rect.height) / this.h;
          // repel away from whichever node's text is nearest, the same
          // way particles already repel away from the cursor elsewhere
          // in this file (_frame's desiredOffX/Y): a radius, a falloff
          // that's strongest at zero distance and fades to nothing at
          // the radius's edge, pushing radially outward from the point
          // being avoided. This is real displacement, not just a dimmer
          // render — the route visibly steps around the text instead of
          // rendering underneath it.
          const nodesScreen = this._roadmapNodeScreen;
          if(nodesScreen){
            let nearestDist = Infinity, nearestDx = 0, nearestDy = 0;
            for(let k = 0; k < nodesScreen.length; k++){
              const nd = nodesScreen[k];
              const ddx = absX - nd.x, ddy = absY - nd.y;
              const d = Math.hypot(ddx, ddy);
              if(d < nearestDist){ nearestDist = d; nearestDx = ddx; nearestDy = ddy; }
            }
            const REPEL_RADIUS = 0.1;
            if(nearestDist < REPEL_RADIUS){
              const dist = nearestDist || 0.0001;
              const falloff = 1 - dist / REPEL_RADIUS;
              const push = falloff * falloff * 0.11;
              absX += (nearestDx / dist) * push;
              absY += (nearestDy / dist) * push;
            }
          }
          const minDim = Math.min(this.w, this.h) || 1;
          const sx = (minDim / this.w) * 0.5 || 0.5;
          const sy = (minDim / this.h) * 0.5 || 0.5;
          fx = (absX - seg.anchorX) / sx;
          fy = (absY - seg.anchorY) / sy;
        } else {
          fx = (samplePt.x - 0.5) * 2;
          fy = (samplePt.y - 0.5) * 2;
        }

        if(!revealed){
          // a faint gathering point right at the growing tip, rather
          // than popping in once its own threshold is crossed
          return { x: fx, y: fy, i: 0.05, c: 0.5 };
        }
        const density = this.roadmapDensity[i];
        // barely any flicker — a solid, filled form needs to hold steady
        // rather than shimmer
        const flicker = 0.94 + 0.06 * Math.sin(t * 1.8 + this.jitterSeed[i] * 3.0);
        // each node's real DOM text sits exactly on this same point (see
        // main.js), so density is DAMPENED in a radius around each node
        // rather than boosted — the route stays visible right up to the
        // text without a dense cluster of characters rendering underneath
        // it and fighting it for legibility.
        const nearestNodeFrac = Math.round(u * (this.roadmapNodeCount - 1)) / (this.roadmapNodeCount - 1);
        const textClearance = Math.max(0, 1 - Math.abs(u - nearestNodeFrac) * 9);
        const baseIntensity = (0.58 + density * 0.35) * flicker;
        const intensity = Math.pow(Math.min(1, baseIntensity), 0.65) * lerp(1, 0.15, textClearance);
        // after the route is fully traversed and we're actually leaving
        // the section (seg.a is roadmap, seg.b is the NEXT formation),
        // scatter and fade the path — "loses structure and disperses"
        // rather than a plain positional blend into whatever's next
        const dissolve = (seg && seg.a === 'roadmap' && seg.b !== 'roadmap') ? seg.t : 0;
        const scatterAmt = dissolve * 0.5;
        const scatterX = Math.sin(this.jitterSeed[i] * 7.7 + t * 0.3) * scatterAmt;
        const scatterY = Math.cos(this.jitterSeed[i] * 5.3 + t * 0.25) * scatterAmt;
        return {
          x: fx + scatterX, y: fy + scatterY,
          i: intensity * (1 - dissolve * 0.6), c: 0.6 * (1 - dissolve * 0.4),
        };
      }
      case 'constellation': {
        // fixed layout (see constructor) — no drift of its own, only the
        // universal jitter wobble applied below in _frame reaches it
        if(this.constRole[i] === 1){
          const k = this.constNode[i];
          return { x: (this.constNodeX[k] - 0.5) * 2, y: (this.constNodeY[k] - 0.5) * 2, i: 0.85, c: 0.55 };
        }
        const e = this.constEdge[i];
        const a = this.constEdgeA[e], b = this.constEdgeB[e];
        const et = this.constEdgeT[i];
        return {
          x: (lerp(this.constNodeX[a], this.constNodeX[b], et) - 0.5) * 2,
          y: (lerp(this.constNodeY[a], this.constNodeY[b], et) - 0.5) * 2,
          i: 0.14 + 0.1 * Math.sin(t * 0.5 + this.jitterSeed[i]), c: 0.55,
        };
      }
      case 'mascot': {
        // assembly progress is just the organism's own timeline blend
        // toward 'mascot' — reversible by the exact same construction
        // as every other formation, no bespoke scroll math needed.
        const seg = this.seg;
        const p = (seg && seg.a === seg.b) ? 1 : (seg ? seg.t : 0);
        const idleAmp = smoothstep(0.85, 1, p) * (1 - this._mascotAlertAmount * 0.7);
        const kind = this.mascotKind[i], idx = this.mascotIdx[i];
        const scale = this._mascotScale, yOff = this._mascotYOffsetLocal;

        if(kind === 1){
          const s = this.mascotStrays[idx];
          const enc = this._mascotEncounter;
          let hx, hy;
          if(enc && enc.strayIdx === idx){
            const tp = enc.targetPt;
            if(enc.phase === 'hold'){ hx = tp.x; hy = tp.y; }
            else { hx = lerp(s.homeX, tp.x, enc.amount); hy = lerp(s.homeY, tp.y, enc.amount); }
          } else {
            const wander = 1 - p * s.settle;
            hx = s.homeX + Math.sin(t * s.speed + s.phase) * s.amp * wander;
            hy = s.homeY + Math.cos(t * s.speed * 0.8 + s.phase * 1.4) * s.amp * wander;
          }
          const intensity = 0.16 + 0.09 * Math.sin(t * 0.6 + this.jitterSeed[i]);
          hx += this.mascotMicroX[i];
          hy += this.mascotMicroY[i];
          return { x: hx * scale, y: hy * scale + yOff, i: Math.max(0.1, intensity), c: 0 };
        }

        const pt = MASCOT_BODY_POINTS[idx];
        let ox = pt.x + this.mascotMicroX[i];
        let oy = pt.y + this.mascotMicroY[i];
        const bob = Math.sin(t * 0.9) * 0.018 * idleAmp;
        const torsoX = this._mascotTorsoShiftX || 0;
        const torsoY = this._mascotTorsoShiftY || 0;
        const jack = this._mascotJumpJackAmount || 0;
        const wave = this._mascotWaveAmount || 0;
        const inspect = this._mascotHeadInspectAmount || 0;
        const balance = this._mascotBalanceAmount || 0;
        const balanceWobble = this._mascotBalanceWobble || 0;

        if(pt.part === 'torso'){
          // The torso follows the head as one coordinated upper-body
          // pose during every routine EXCEPT head-inspection, where the
          // waist deliberately stays put while the head leans away from it.
          ox += torsoX + balanceWobble * 0.025;
          oy += torsoY + bob - jack * 0.05 + balance * 0.015;
        } else if(pt.part === 'armL' || pt.part === 'armR'){
          const side = pt.part === 'armR' ? 1 : -1;
          // Every point in an arm uses the same shoulder pivot and angle.
          // The rectangle may rotate, but can never bend or curve.
          const greeting = side > 0 ? this._mascotAlertAmount : 0;
          const attentive = side > 0 ? this._mascotAttention : this._mascotAttention * 0.2;
          const helperLift = Math.max(greeting, attentive * 0.55);
          const pivotX = side * 0.27, pivotY = -0.06;
          let angle = -side * (jack * 2.35 + helperLift * (side > 0 ? 1.55 : 0.16));
          if(side > 0 && wave > 0) angle += -2.05 * wave + Math.sin(t * 14) * 0.16 * wave;
          angle -= side * balance * 1.55;
          if(side > 0) angle -= inspect * 0.85;
          const moved = mascotRigidLimbPoint(
            ox, oy, pivotX, pivotY, angle,
            torsoX + balanceWobble * 0.025,
            torsoY + bob - jack * 0.05 + balance * 0.015,
          );
          ox = moved.x; oy = moved.y;
        } else {
          // Legs follow the same rigid-limb rule: one hip pivot and one
          // shared angle per complete rectangular leg.
          const side = pt.part === 'legR' ? 1 : -1;
          const pivotX = side * 0.10, pivotY = 0.56;
          let angle = -side * jack * 0.45;
          if(side > 0) angle -= balance * 0.85;
          else angle += balanceWobble * 0.08;
          const moved = mascotRigidLimbPoint(
            ox, oy, pivotX, pivotY, angle,
            torsoX * 0.22, -jack * 0.05,
          );
          ox = moved.x; oy = moved.y;
        }

        const intensity = 0.72 + 0.18 * Math.sin(t * 0.45 + this.jitterSeed[i]);
        return { x: ox * scale, y: oy * scale + yOff, i: intensity, c: 0 };
      }
      default: return { x: 0, y: 0, i: 0.15, c: 0 };
    }
  }

  /* Advances the mascot's stateful timers (idle glance, stray
     encounters, click alert) and resolves cursor attention — all once
     per frame, not per particle, exactly mirroring how _timelineSegment
     computes shared per-frame state for 'roadmap'. Timers only advance
     while 'mascot' is actually part of the current segment, matching
     the old standalone class's whenVisible()-gated start/stop. */
  _updateMascotState(dt, seg){
    const active = seg.a === 'mascot' || seg.b === 'mascot';
    if(!active){
      this._mascotGlanceAmount = 0;
      this._mascotEncounter = null;
      this._mascotAlertAmount = 0;
      this._mascotPullX = 0; this._mascotPullY = 0;
      this._mascotAttention = 0;
      this._mascotTorsoShiftX = 0;
      this._mascotTorsoShiftY = 0;
      this._mascotIdleElapsed = 0;
      this._mascotJumpJackAmount = 0;
      this._mascotWaveAmount = 0;
      this._mascotHeadInspectAmount = 0;
      this._mascotBalanceAmount = 0;
      this._mascotBalanceWobble = 0;
      return;
    }
    const alerted = this._mascotAlertElapsed >= 0;
    const encountering = !!this._mascotEncounter;

    if(!alerted && !encountering){
      if(this._mascotGlanceElapsed >= 0){
        this._mascotGlanceElapsed += dt;
        if(this._mascotGlanceElapsed > MASCOT_GLANCE_DURATION_S){
          this._mascotGlanceElapsed = -1;
          this._mascotNextGlanceIn = mascotNextGlanceWait(Math.random);
        }
      } else {
        this._mascotNextGlanceIn -= dt;
        if(this._mascotNextGlanceIn <= 0){
          this._mascotGlanceElapsed = 0;
          this._mascotGlanceTargetIdx = Math.floor(Math.random() * this.mascotStrays.length);
        }
      }
    }
    const glanceActive = !alerted && !encountering && this._mascotGlanceElapsed >= 0;
    this._mascotGlanceAmount = glanceActive ? mascotGlanceAmount(this._mascotGlanceElapsed) : 0;
    if(glanceActive){
      const s = this.mascotStrays[this._mascotGlanceTargetIdx];
      this._mascotGlanceTarget = { x: s.homeX, y: s.homeY };
    }

    if(alerted){
      this._mascotEncounter = null;
    } else if(this._mascotEncounter){
      this._mascotEncounter.elapsed += dt;
      const dur = mascotEncounterDuration(this._mascotEncounter.type);
      if(this._mascotEncounter.elapsed > dur){
        this._mascotEncounter = null;
        this._mascotNextEncounterIn = mascotNextEncounterWait(Math.random);
      } else {
        const { phase, amount } = mascotEncounterPhase(this._mascotEncounter.type, this._mascotEncounter.elapsed);
        this._mascotEncounter.phase = phase;
        this._mascotEncounter.amount = amount;
      }
    } else {
      this._mascotNextEncounterIn -= dt;
      if(this._mascotNextEncounterIn <= 0){
        const type = MASCOT_ENCOUNTER_TYPES[Math.floor(Math.random() * MASCOT_ENCOUNTER_TYPES.length)];
        const strayIdx = Math.floor(Math.random() * this.mascotStrays.length);
        const targetPt = type === 'nudge' ? MASCOT_FOOT_R : (type === 'watch' ? MASCOT_WATCH_PT : MASCOT_HAND_R);
        this._mascotEncounter = { strayIdx, type, elapsed: 0, phase: 'approach', amount: 0, targetPt };
      }
    }

    if(this._mascotAlertElapsed >= 0){
      this._mascotAlertElapsed += dt;
      const totalDur = MASCOT_ALERT_IN_S + MASCOT_ALERT_HOLD_S + MASCOT_ALERT_OUT_S;
      if(this._mascotAlertElapsed > totalDur) this._mascotAlertElapsed = -1;
    }
    this._mascotAlertAmount = this._mascotAlertElapsed >= 0 ? mascotAlertAmount(this._mascotAlertElapsed) : 0;

    // cursor attention -> head pull. Direction comes from real pixel
    // space (so it's correct regardless of viewport aspect ratio);
    // magnitude is a small local-unit constant, same mix the standalone
    // version used. MASCOT_Y_OFFSET_PX shifts his whole on-screen
    // position up from the anchor's own resolved point (attention/pull,
    // the hit-target frame, and the per-particle render below all read
    // off this same shifted anchor, so everything moves together).
    const mascotResolved = seg.a === 'mascot' && seg.b === 'mascot';
    // The lime square is the stationary seed that the ASCII cloud grows
    // around. Keep it at the mascot's final anchor throughout either
    // transition; it only joins the character's motion once the body is
    // completely resolved.
    const baseAnchor = this._mascotAnchor || { x: seg.anchorX, y: seg.anchorY };
    const mascotYOffset = this.isMobile ? MASCOT_Y_OFFSET_MOBILE_PX : MASCOT_Y_OFFSET_PX;
    const anchorPxX = baseAnchor.x * this.w, anchorPxY = baseAnchor.y * this.h + mascotYOffset;
    const pointerPxX = this.pointerX * this.w, pointerPxY = this.pointerY * this.h;
    const dist = Math.hypot(pointerPxX - anchorPxX, pointerPxY - anchorPxY);
    const attention = mascotCursorAttention(dist);
    this._mascotAttention = attention;
    const userActive = !this._mascotIdleForced && (attention > 0.04 || alerted || !mascotResolved);
    if(userActive){
      this._mascotIdleElapsed = 0;
    } else {
      this._mascotIdleElapsed += dt;
      const routineDuration = mascotIdleRoutineDuration(this._mascotIdleRoutineIndex);
      if(this._mascotIdleElapsed >= MASCOT_IDLE_DELAY_S + routineDuration){
        this._mascotIdleElapsed = 0;
        this._mascotIdleForced = false;
        this._mascotIdleRoutineIndex = (this._mascotIdleRoutineIndex + 1) % MASCOT_IDLE_ROUTINES.length;
      }
    }
    const idlePose = mascotIdleRoutinePose(this._mascotIdleElapsed, this._mascotIdleRoutineIndex);
    if(idlePose.amount > 0){
      this._mascotEncounter = null;
      this._mascotGlanceAmount = 0;
    }
    this._mascotJumpJackAmount = idlePose.name === 'jumping-jacks' ? idlePose.amount : 0;
    this._mascotWaveAmount = idlePose.name === 'tiny-wave' ? idlePose.amount : 0;
    this._mascotHeadInspectAmount = idlePose.name === 'head-inspection' ? idlePose.amount : 0;
    this._mascotBalanceAmount = idlePose.name === 'balance-wobble' ? idlePose.amount : 0;
    this._mascotBalanceWobble = idlePose.name === 'balance-wobble'
      ? idlePose.amount * Math.sin(idlePose.localT * Math.PI * 6) : 0;
    let pullX = 0, pullY = 0;
    if(attention > 0.001){
      const d = dist || 1;
      pullX = ((pointerPxX - anchorPxX) / d) * attention * 0.05;
      pullY = ((pointerPxY - anchorPxY) / d) * attention * 0.05;
    }
    if(this._mascotAlertAmount > 0.001){
      const d = dist || 1;
      pullX = ((pointerPxX - anchorPxX) / d) * this._mascotAlertAmount * 0.10;
      pullY = ((pointerPxY - anchorPxY) / d) * this._mascotAlertAmount * 0.10;
    }
    this._mascotPullX = pullX; this._mascotPullY = pullY;

    // Fixed on-screen size (matching the original standalone canvas's
    // own fixed CSS box — 96px/76px tall desktop/mobile — rather than
    // scaling with viewport size like every other formation). Computed
    // fresh each frame from the CURRENT minDim so it stays exactly this
    // tall regardless of viewport: the local-space multiplier that
    // would otherwise be a fixed MASCOT_SCALE constant is solved for
    // here instead, then used both below (hit-target frame) and in
    // _formationTarget's 'mascot' case (this._mascotScale) so the
    // per-particle render matches exactly.
    const minDim = Math.min(this.w, this.h) || 1;
    const targetH = this.isMobile ? MASCOT_TARGET_HEIGHT_MOBILE_PX : MASCOT_TARGET_HEIGHT_PX;
    this._mascotScale = targetH / (1.4 * minDim * 0.5);
    // same conversion for the constant upward shift above, expressed as
    // a local-space delta so it survives the outer blend's own
    // minDim-dependent scaling and comes out as a true constant pixel
    // offset regardless of viewport.
    this._mascotYOffsetLocal = mascotYOffset / (minDim * 0.5);

    // publish his current on-screen bounding box (viewport px) so
    // main.js can position the real hit-target button over him —
    // needed every frame, not just on scroll, since idle sway/glances
    // keep him moving slightly even while the anchor itself is still.
    const pxPerUnit = this._mascotScale * minDim * 0.5; // === targetH / 1.4, by construction
    const bboxW = 0.60 * pxPerUnit, bboxH = 1.40 * pxPerUnit;
    const livePullX = mascotResolved ? this._mascotPullX : 0;
    const livePullY = mascotResolved ? this._mascotPullY : 0;
    this._mascotFrame = {
      x: anchorPxX + livePullX * pxPerUnit,
      y: anchorPxY + livePullY * pxPerUnit,
      width: bboxW, height: bboxH,
    };
    const now = performance.now() / 1000;
    const idleAmp = mascotResolved ? (1 - this._mascotAlertAmount * 0.7) : 0;
    let headX = this._mascotFrame.x + Math.sin(now * 0.5) * 0.02 * pxPerUnit * idleAmp;
    let headY = this._mascotFrame.y - 0.62 * pxPerUnit
      + Math.cos(now * 0.45) * 0.02 * pxPerUnit * idleAmp
      - this._mascotJumpJackAmount * 0.05 * pxPerUnit;
    if(mascotResolved && this._mascotGlanceAmount > 0){
      headX += this._mascotGlanceTarget.x * 0.15 * this._mascotGlanceAmount * pxPerUnit;
      headY += (this._mascotGlanceTarget.y + 0.62) * 0.15 * this._mascotGlanceAmount * pxPerUnit;
    }
    const enc = this._mascotEncounter;
    if(mascotResolved && enc && enc.type === 'watch'){
      const watchAmount = enc.phase === 'hold' ? 1 : enc.amount;
      headX += MASCOT_WATCH_PT.x * 0.15 * watchAmount * pxPerUnit;
      headY += (MASCOT_WATCH_PT.y + 0.62) * 0.15 * watchAmount * pxPerUnit;
    }
    // Balance moves the head with the torso; both remain part of the
    // same coordinated pose, so this is folded in BEFORE the torso-shift
    // coupling below is computed.
    headX += this._mascotBalanceWobble * 0.025 * pxPerUnit;
    if(mascotResolved){
      const headLocalX = (headX - this._mascotFrame.x) / pxPerUnit;
      const headLocalY = (headY - (this._mascotFrame.y - 0.62 * pxPerUnit)) / pxPerUnit;
      this._mascotTorsoShiftX = livePullX + headLocalX * 0.62;
      this._mascotTorsoShiftY = livePullY + headLocalY * 0.42;
    } else {
      this._mascotTorsoShiftX = 0;
      this._mascotTorsoShiftY = 0;
    }
    // During inspection the square leaves its neck position and travels
    // well out toward the raised right hand — added AFTER the torso-shift
    // coupling above (not before, like balance/glance/watch are) so the
    // waist deliberately holds still while only the head travels.
    headX += this._mascotHeadInspectAmount * 0.85 * pxPerUnit;
    headY += this._mascotHeadInspectAmount * 0.30 * pxPerUnit;
    this._mascotHead = { x: headX, y: headY, size: 0.44 * pxPerUnit };
  }

  /** Called on click/Enter/Space of the mascot's hit-target button
   *  (main.js). Refreshes rather than stacks on repeat activation. */
  triggerMascotReaction(){
    if(this.reduced){
      this._mascotAlertElapsed = MASCOT_ALERT_IN_S + MASCOT_ALERT_HOLD_S;
      this._frame(0.05);
      return;
    }
    this._mascotAlertElapsed = 0;
  }

  /** Temporary review hook: immediately plays idle routines 1–4. */
  triggerMascotIdleRoutine(shortcutNumber){
    const index = mascotShortcutRoutineIndex(shortcutNumber);
    if(index < 0) return false;
    this._mascotIdleRoutineIndex = index;
    this._mascotIdleElapsed = MASCOT_IDLE_DELAY_S + 0.02;
    this._mascotIdleForced = true;
    this._mascotAlertElapsed = -1;
    this._mascotEncounter = null;
    return true;
  }

  /** Current on-screen bounding box (viewport px) of the mascot
   *  formation, for positioning the real hit-target button. */
  getMascotFrame(){ return this._mascotFrame; }

  _frame(dtIn){
    let dt = this.reduced ? 0.05 : dtIn;
    // throttle to ~30fps on mobile instead of every display frame — halves
    // the fillText call volume (the actual expense, not particle count
    // alone), which is the lever that matters for staying under whatever
    // sustained-load threshold triggers iOS's own throttling. Using the
    // *accumulated* dt when a frame does fire keeps motion speed correct;
    // this skips render frequency, not simulation speed.
    if(this.isMobile && !this.reduced){
      this._mobileAccum = (this._mobileAccum || 0) + dt;
      if(this._mobileAccum < 1 / 30) return;
      dt = this._mobileAccum;
      this._mobileAccum = 0;
    }
    this.time += dt;
    const t = this.time;
    const n = this.count;
    const w = this.w, h = this.h;
    if(!w || !h) return;

    const minDim = Math.min(w, h);
    const sx = minDim / w, sy = minDim / h;

    const velX = this.pointerX - this.lastPointerX;
    const velY = this.pointerY - this.lastPointerY;
    const pointerSpeed = Math.min(1, Math.hypot(velX, velY) * 18);
    this.pointerSpeed = pointerSpeed; // public — polled by the audio engine

    if(!this.reduced){
      const sy2 = window.scrollY || 0;
      const delta = sy2 - this.lastScrollY;
      this.lastScrollY = sy2;
      this.scrollTurbulence = Math.min(1, this.scrollTurbulence * 0.9 + Math.min(1, Math.abs(delta) / 60) * 0.6);
    }
    const turbulence = this.reduced ? 0 : this.scrollTurbulence;

    for(let k = 0; k < this.nodeCount; k++){
      this.nodePosX[k] = this.nodeAnchorX[k] + Math.sin(t * 0.12 + this.nodePhase[k]) * 0.15;
      this.nodePosY[k] = this.nodeAnchorY[k] + Math.cos(t * 0.1 + this.nodePhase[k] * 1.3) * 0.15;
    }
    // O(nodeCount^2) every call — cheap on desktop, worth skimping on
    // mobile too since it's pure overhead when nothing's watching the
    // network formation (and results barely change frame-to-frame anyway,
    // since node drift is slow)
    const skipNeighbors = this.isMobile && ((this._neighborTick = (this._neighborTick || 0) + 1) % 2 !== 0);
    if(!skipNeighbors){
      for(let k = 0; k < this.nodeCount; k++){
        let bd = Infinity, bi = (k + 1) % this.nodeCount;
        let bd2 = Infinity, bi2 = (k + 2) % this.nodeCount;
        for(let j = 0; j < this.nodeCount; j++){
          if(j === k) continue;
          const dx = this.nodePosX[k] - this.nodePosX[j], dy = this.nodePosY[k] - this.nodePosY[j];
          const d = dx * dx + dy * dy;
          if(d < bd){ bd2 = bd; bi2 = bi; bd = d; bi = j; }
          else if(d < bd2){ bd2 = d; bi2 = j; }
        }
        this.nearestNode[k] = bi;
        this.nearestNode2[k] = bi2;
      }
    }

    const seg = this._timelineSegment();
    this._lastAnchorX = seg.anchorX; this._lastAnchorY = seg.anchorY;
    this.seg = seg; // public — polled by the audio engine
    this._updateMascotState(dt, seg);

    // globe is neutral (c: 0 in _formationTarget) and must contribute
    // NOTHING to the color blend, ever — weighting each side's accent by
    // its own color-intensity (not just seg.t) is what guarantees that,
    // instead of a yellow-green globe tint bleeding into every segment
    // that happens to touch it regardless of how "neutral" it claims to be
    // constellation reuses globe's own (otherwise-inert) RGB — that's NJORD's
    // own acid-signal-green, not a bug like the yellow-flash one above: this
    // is the one formation actually meant to carry the site's own identity
    // color, since it represents NJORD describing itself rather than a client
    const ACCENTS = { diamond: [212, 175, 55], wave: [122, 27, 51], network: [31, 76, 120], globe: [203, 255, 61], constellation: [203, 255, 61], roadmap: [203, 255, 61], mascot: [203, 255, 61] };
    const FORM_C = { globe: 0, diamond: 1, wave: 1, network: 0.4, constellation: 0.55, roadmap: 0.5, mascot: 1 };
    const cwA = (FORM_C[seg.a] ?? 0) * (1 - seg.t);
    const cwB = (FORM_C[seg.b] ?? 0) * seg.t;
    const cwSum = cwA + cwB;
    let ar = 0, ag = 0, ab = 0;
    if(cwSum > 0.0001){
      const A = ACCENTS[seg.a] || ACCENTS.globe, B = ACCENTS[seg.b] || ACCENTS.globe;
      ar = (A[0] * cwA + B[0] * cwB) / cwSum;
      ag = (A[1] * cwA + B[1] * cwB) / cwSum;
      ab = (A[2] * cwA + B[2] * cwB) / cwSum;
    }
    const sameEnds = seg.a === seg.b;

    const offEase = this.reduced ? 1 : 0.1;
    const wobble = 0.012 + turbulence * 0.01;
    const mascotBlend = seg.a === 'mascot' && seg.b === 'mascot'
      ? 1
      : seg.b === 'mascot' ? seg.t
      : seg.a === 'mascot' ? 1 - seg.t
      : 0;
    // Preserve the slow, organic morph between normal formations, but
    // register the particles quickly once the mascot's final state is
    // reached. At the old 0.045 rate he remained a cloud-shaped clump
    // for several seconds before his limb gaps became readable.
    const posEase = this.reduced ? 1 : (mascotBlend === 1 ? 0.22 : 0.045);

    for(let i = 0; i < n; i++){
      const fA = this._formationTarget(seg.a, i, t);
      const fB = sameEnds ? fA : this._formationTarget(seg.b, i, t);
      const fx = sameEnds ? fA.x : lerp(fA.x, fB.x, seg.t);
      const fy = sameEnds ? fA.y : lerp(fA.y, fB.y, seg.t);
      const fi = sameEnds ? fA.i : lerp(fA.i, fB.i, seg.t);
      const fc = sameEnds ? fA.c : lerp(fA.c, fB.c, seg.t);

      // a small amount of organic wobble riding on top of the resolved
      // target — texture, not a competing state, so it can never make
      // the shape read as unresolved or muddy
      const resolvedWobble = wobble * (1 - mascotBlend);
      const wx = Math.sin(t * 0.6 + this.jitterSeed[i]) * resolvedWobble;
      const wy = Math.cos(t * 0.5 + this.jitterSeed[i] * 1.3) * resolvedWobble;

      const targetX = seg.anchorX + (fx + wx) * sx * 0.5;
      const targetY = seg.anchorY + (fy + wy) * sy * 0.5;
      const targetIntensity = fi;
      const colorTarget = fc;

      // pure exponential approach on every axis — mathematically cannot
      // overshoot its target, so there is no spring bounce anywhere
      this.x[i] += (targetX - this.x[i]) * posEase;
      this.y[i] += (targetY - this.y[i]) * posEase;

      // cursor avoidance is itself an eased approach toward a "desired
      // offset" (zero once outside the radius) rather than an impulse —
      // so it releases as a smooth ease-out, never a kick-and-recoil
      let desiredOffX = 0, desiredOffY = 0;
      if(!this.reduced){
        const dispX = this.x[i] + this.vx[i], dispY = this.y[i] + this.vy[i];
        const dx = dispX - this.pointerX, dy = dispY - this.pointerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const radius = 0.11;
        if(dist < radius){
          const falloff = 1 - dist / radius;
          // Keep the shared cloud responsive while it forms, then make
          // its cursor displacement nearly imperceptible once it has
          // resolved into the mascot. Full-strength repulsion is large
          // enough to close the narrow gaps between his body blocks.
          const mascotCursorScale = lerp(1, 0.02, mascotBlend);
          const strength = falloff * falloff * (0.045 + pointerSpeed * 0.09) * mascotCursorScale;
          desiredOffX = (dx / dist) * strength;
          desiredOffY = (dy / dist) * strength;
        }
      }
      const resolvedOffEase = mascotBlend === 1 ? Math.max(offEase, 0.35) : offEase;
      this.vx[i] += (desiredOffX - this.vx[i]) * resolvedOffEase;
      this.vy[i] += (desiredOffY - this.vy[i]) * resolvedOffEase;

      this.intensity[i] += (targetIntensity - this.intensity[i]) * 0.06;
      this.colorMix[i] += (colorTarget - this.colorMix[i]) * 0.035;
    }

    this._render(ar, ag, ab);
  }

  _render(ar, ag, ab){
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    const organismFont = "700 13px 'JetBrains Mono', monospace";
    // Match the original block silhouette: the mascot keeps the exact
    // same point positions and dimensions, but each black block is made
    // from heavy, tightly overlapping hash characters. From a distance
    // they read almost solid; up close the ASCII construction remains
    // visible.
    const mascotBodyFont = "900 8px 'JetBrains Mono', monospace";
    ctx.font = organismFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const inkRGB = hexToRgb(this.getInkColor());
    const n = this.count;
    const seg = this.seg;
    let mascotPresence = 0;
    if(seg){
      if(seg.a === 'mascot' && seg.b === 'mascot') mascotPresence = 1;
      else if(seg.b === 'mascot') mascotPresence = seg.t;
      else if(seg.a === 'mascot') mascotPresence = 1 - seg.t;
    }
    let lastMixKey = -1, lastFill = '';
    for(let i = 0; i < n; i++){
      const inten = this.intensity[i];
      if(inten <= 0.02) continue;
      const chars = this.earthLand[i] ? ORGANISM_DENSE : ORGANISM_GEM;
      const idx = Math.max(0, Math.min(chars.length - 1, Math.floor(inten * (chars.length - 1))));
      // a true continuous lerp from ink to accent — no threshold, no jump;
      // a color can only ever be as present as colorMix actually is
      const mix = this.colorMix[i];
      const mixKey = Math.round(mix * 40);
      if(mixKey !== lastMixKey){
        lastMixKey = mixKey;
        const r = Math.round(lerp(inkRGB[0], ar, mix));
        const g = Math.round(lerp(inkRGB[1], ag, mix));
        const b = Math.round(lerp(inkRGB[2], ab, mix));
        lastFill = `rgb(${r},${g},${b})`;
      }
      ctx.globalAlpha = Math.min(1, inten + 0.1);
      ctx.fillStyle = lastFill;
      const mascotBodyParticle = mascotPresence > 0.35 && this.mascotKind[i] === 0;
      ctx.font = mascotBodyParticle ? mascotBodyFont : organismFont;
      ctx.fillText(mascotBodyParticle ? '#' : chars[idx], (this.x[i] + this.vx[i]) * w, (this.y[i] + this.vy[i]) * h);
    }
    const head = this._mascotHead;
    if(seg && head){
      let presence = 0;
      if(seg.a === 'mascot' && seg.b === 'mascot') presence = 1;
      else if(seg.b === 'mascot') presence = seg.t;
      else if(seg.a === 'mascot') presence = 1 - seg.t;
      if(presence > 0.01){
        // The square remains fully present while the cloud forms or
        // disperses. It is the fixed origin of the transformation.
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgb(203,255,61)';
        ctx.fillRect(head.x - head.size / 2, head.y - head.size / 2, head.size, head.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ----------------------------------------------------------------
     Portal transition. The SAME particles you were just looking at
     explode outward from wherever they currently are while the canvas
     floods with the project's own accent color; `unburst` runs the
     identical motion backward, converging the same frozen positions
     back into the exact formation they left — nothing respawns, and
     nothing resets to a default state.
     ---------------------------------------------------------------- */
  burst(accentHex, onReveal){
    if(this.reduced){ onReveal && onReveal(); return; }
    ticker.remove(this._frame);
    this._burstAccentRGB = hexToRgb(accentHex);
    this._burstDir = 1;
    this._burstT = 0;
    this._burstRevealed = false;
    this._burstOnReveal = onReveal;
    ticker.add(this._burstFrame);
  }
  unburst(accentHex, onDone){
    if(this.reduced){ onDone && onDone(); return; }
    ticker.remove(this._burstFrame);
    this._burstAccentRGB = hexToRgb(accentHex);
    this._burstDir = -1;
    this._burstT = this._burstDur;
    this._burstRevealed = true;
    this._burstOnDone = onDone;
    ticker.add(this._burstFrame);
  }
  _burstFrame(dt){
    this._burstT += dt * this._burstDir;
    const dur = this._burstDur;
    const p = Math.min(1, Math.max(0, this._burstT / dur));
    const eased = 1 - Math.pow(1 - p, 3);
    const { ctx, w, h } = this;
    if(!w || !h) return;

    if(this._burstDir > 0 && !this._burstRevealed && p > 0.5){
      this._burstRevealed = true;
      this._burstOnReveal && this._burstOnReveal();
    }

    // `p`/`eased` track "how exploded" the formation currently is (1 =
    // fully scattered) and are direction-agnostic on purpose — `spread`
    // below reads them directly, correctly scattering outward as `p`
    // rises during burst() and pulling back together as `p` falls during
    // unburst(), for free.
    //
    // The two colored fills are different: they're about masking the
    // *start* of whichever animation is currently running, so they need
    // their own progress value that always runs 0→1 over THIS call's
    // remaining lifetime, regardless of which direction `p` is moving —
    // `revealEased` is that. Real bug this fixed: both fills used to key
    // off raw `eased` directly, which meant during unburst() (p and eased
    // both *falling*) the flat color flood stayed near-fully-opaque for
    // almost the entire close animation and only cleared in the last
    // instant — while the modal's own CSS clip-path was collapsing
    // smoothly the whole time. The two no longer moved in step, which is
    // what read as choppy.
    const revealT = this._burstDir > 0 ? p : 1 - p;
    const revealEased = 1 - Math.pow(1 - revealT, 3);
    const floodAlpha = this._burstDir > 0
      ? Math.min(1, revealEased * 1.3)        // burst: color floods in, masking the click
      : Math.max(0, 1 - revealEased * 1.15);  // unburst: color fades out, matching the collapse
    const particleAlpha = this._burstDir > 0
      ? Math.max(0, 1 - revealEased * 1.15)   // burst: particles fade out as the flood takes over
      : Math.min(1, revealEased * 1.3);       // unburst: particles fade back in as the flood clears

    const [r, g, b] = this._burstAccentRGB;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${floodAlpha})`;
    ctx.fillRect(0, 0, w, h);

    ctx.font = "700 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ax = this._lastAnchorX, ay = this._lastAnchorY;
    const spread = 1 + eased * 3.4;
    const n = this.count;
    for(let i = 0; i < n; i++){
      const inten = this.intensity[i];
      if(inten <= 0.03) continue;
      const dx = (this.x[i] + this.vx[i]) - ax, dy = (this.y[i] + this.vy[i]) - ay;
      const ex = ax + dx * spread, ey = ay + dy * spread;
      const chars = this.earthLand[i] ? ORGANISM_DENSE : ORGANISM_GEM;
      const idx = Math.max(0, Math.min(chars.length - 1, Math.floor(inten * (chars.length - 1))));
      ctx.globalAlpha = particleAlpha * Math.min(1, inten + 0.3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(chars[idx], ex * w, ey * h);
    }
    ctx.globalAlpha = 1;

    if(this._burstDir > 0 && p >= 1){
      ticker.remove(this._burstFrame); // stay parked; the modal is opaque now
    }
    if(this._burstDir < 0 && p <= 0){
      ticker.remove(this._burstFrame);
      this._burstOnDone && this._burstOnDone();
      ticker.add(this._frame); // resume the organism's ordinary life
    }
  }
}
function hexToRgb(hex){
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const v = parseInt(full, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/* ----------------------------------------------------------------
   FormationPortrait — a standalone, denser render of one formation
   (the same diamond/wave/network math as the organism, just with
   more facets/lines/nodes and no zones to share a particle budget
   with) for a project page's visual panel. Drawn in the page's own
   ink color, so it reads as a texture engraved into that page's own
   background rather than a separate decorative graphic.
   ---------------------------------------------------------------- */
export class FormationPortrait{
  constructor(canvas, name, opts = {}){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.name = name;
    this.color = opts.color || '#FFFFFF';
    this.count = opts.count || 900;
    this.reduced = prefersReducedMotion();
    this.isMobile = window.innerWidth < 720; // see AsciiOrganism — same iOS throttling rationale
    const rnd = mulberry32(opts.seed || 77);
    const n = this.count;

    if(name === 'diamond'){ // golden rotating ring — see ringPoint/ringNormalAt
      this.ringTheta = new Float32Array(n);
      this.ringPhi = new Float32Array(n);
      for(let i = 0; i < n; i++){
        this.ringTheta[i] = (i / n) * Math.PI * 2 + (rnd() - 0.5) * (Math.PI * 2 / n);
        this.ringPhi[i] = rnd() * Math.PI * 2;
      }
    } else if(name === 'wave'){
      this.lineCount = 5; // more lines than the on-page organism's two
      this.line = new Uint8Array(n);
      this.t = new Float32Array(n);
      this.phase = new Float32Array(n);
      for(let i = 0; i < n; i++){ this.line[i] = i % this.lineCount; this.t[i] = rnd(); this.phase[i] = rnd() * Math.PI * 2; }
    } else if(name === 'network'){
      this.nodeCount = 34; // denser than the on-page organism's 22
      this.nodeAnchorX = new Float32Array(this.nodeCount);
      this.nodeAnchorY = new Float32Array(this.nodeCount);
      this.nodePhase = new Float32Array(this.nodeCount);
      this.nodePosX = new Float32Array(this.nodeCount);
      this.nodePosY = new Float32Array(this.nodeCount);
      this.nearest = new Int16Array(this.nodeCount);
      this.nearest2 = new Int16Array(this.nodeCount);
      // spread matched to the diamond/wave footprint below — network
      // used to read noticeably smaller than the other two formations
      for(let k = 0; k < this.nodeCount; k++){
        this.nodeAnchorX[k] = (rnd() - 0.5) * 2.3;
        this.nodeAnchorY[k] = (rnd() - 0.5) * 2.3;
        this.nodePhase[k] = rnd() * Math.PI * 2;
      }
      const stride = Math.max(4, Math.floor(n / this.nodeCount));
      this.role = new Uint8Array(n);
      this.nodeOf = new Int16Array(n).fill(-1);
      for(let i = 0; i < n; i++){
        if(i % stride === 0 && Math.floor(i / stride) < this.nodeCount){ this.role[i] = 1; this.nodeOf[i] = Math.floor(i / stride); }
        else if(i % 4 !== 0){ this.role[i] = 2; }
      }
      this.jitter = new Float32Array(n);
      for(let i = 0; i < n; i++) this.jitter[i] = rnd() * Math.PI * 2;
    }

    this.time = rnd() * 10;
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas);
    this.resize();
    this._frame = this._frame.bind(this);
  }
  resize(){
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, this.isMobile ? 1 : 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
  }
  start(){ if(this.reduced){ this._frame(0.05); return; } ticker.add(this._frame); }
  stop(){ if(!this.reduced) ticker.remove(this._frame); }
  destroy(){ this.stop(); this._ro.disconnect(); }

  _frame(dtIn){
    let dt = this.reduced ? 0 : dtIn;
    if(this.isMobile && !this.reduced){
      this._mobileAccum = (this._mobileAccum || 0) + dt;
      if(this._mobileAccum < 1 / 30) return;
      dt = this._mobileAccum;
      this._mobileAccum = 0;
    }
    this.time += dt;
    const t = this.time;
    const { ctx, w, h } = this;
    if(!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    ctx.font = "700 12px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.color;
    // sized to bleed off the edges of a full page rather than sit inside
    // a small panel — this is the on-page background layer, not a boxed graphic
    const scale = Math.max(w, h) * 0.62;
    const cx = w / 2, cy = h / 2;
    const chars = ' .:-=+*#%@';

    if(this.name === 'network'){
      for(let k = 0; k < this.nodeCount; k++){
        this.nodePosX[k] = this.nodeAnchorX[k] + Math.sin(t * 0.12 + this.nodePhase[k]) * 0.22;
        this.nodePosY[k] = this.nodeAnchorY[k] + Math.cos(t * 0.1 + this.nodePhase[k] * 1.3) * 0.22;
      }
      const skipNeighbors = this.isMobile && ((this._neighborTick = (this._neighborTick || 0) + 1) % 2 !== 0);
      if(!skipNeighbors) for(let k = 0; k < this.nodeCount; k++){
        let bd = Infinity, bi = (k + 1) % this.nodeCount;
        let bd2 = Infinity, bi2 = (k + 2) % this.nodeCount;
        for(let j = 0; j < this.nodeCount; j++){
          if(j === k) continue;
          const dx = this.nodePosX[k] - this.nodePosX[j], dy = this.nodePosY[k] - this.nodePosY[j];
          const d = dx * dx + dy * dy;
          if(d < bd){ bd2 = bd; bi2 = bi; bd = d; bi = j; }
          else if(d < bd2){ bd2 = d; bi2 = j; }
        }
        this.nearest[k] = bi; this.nearest2[k] = bi2;
      }
    }

    const n = this.count;
    for(let i = 0; i < n; i++){
      let x = 0, y = 0, inten = 0.3;
      if(this.name === 'diamond'){
        const theta = this.ringTheta[i], phi = this.ringPhi[i];
        const lp = ringPoint(theta, phi);
        const angle = t * 0.18;
        const rp = rotate3(lp, angle, 0.5);
        const rn = rotate3(ringNormalAt(theta, phi), angle, 0.5);
        const proj = project3(rp, 2.3);
        const light = Math.max(0, rn.x * 0.3 + rn.y * 0.5 + rn.z * 0.8);
        const vis = smoothstep(-0.25, 0.1, rn.z);
        const sparkle = smoothstep(0.72, 0.95, light);
        const litMul = lerp(0.85, 1.6, sparkle);
        x = proj.x; y = proj.y;
        inten = (0.14 + light * litMul) * (0.12 + 0.88 * vis);
      } else if(this.name === 'wave'){
        const line = this.line[i];
        const amp = 0.15 + line * 0.09;
        const speed = 0.8 + line * 0.08;
        const freq = 2.2 + line * 0.32;
        const xs = (this.t[i] - 0.5) * 2;
        const breathe = 0.6 + 0.4 * Math.sin(t * 0.28);
        const yv = Math.sin(xs * freq + t * speed + this.phase[i] * 0.2) * amp * breathe;
        x = xs * 0.95; y = yv;
        inten = 0.18 + Math.abs(Math.sin(xs * freq + t * speed + this.phase[i] * 0.2)) * 0.7;
      } else if(this.name === 'network'){
        const role = this.role[i];
        if(role === 1){
          const k = this.nodeOf[i];
          x = this.nodePosX[k]; y = this.nodePosY[k]; inten = 0.9;
        } else if(role === 2){
          const a = i % this.nodeCount;
          const b = (i % 2 === 0) ? this.nearest[a] : this.nearest2[a];
          const et = ((i * 37) % 100) / 100;
          x = lerp(this.nodePosX[a], this.nodePosX[b], et);
          y = lerp(this.nodePosY[a], this.nodePosY[b], et);
          inten = 0.32 + 0.12 * Math.sin(t * 1.4 + i);
        } else {
          const k = i % this.nodeCount;
          x = this.nodePosX[k] + Math.sin(t * 0.4 + this.jitter[i]) * 0.18;
          y = this.nodePosY[k] + Math.cos(t * 0.35 + this.jitter[i]) * 0.18;
          inten = 0.14 + 0.08 * Math.sin(t + this.jitter[i]);
        }
      }
      if(inten <= 0.02) continue;
      const idx = Math.max(0, Math.min(chars.length - 1, Math.floor(inten * (chars.length - 1))));
      ctx.globalAlpha = Math.min(1, inten + 0.15);
      ctx.fillText(chars[idx], cx + x * scale, cy + y * scale);
    }
    ctx.globalAlpha = 1;
  }
}

/* ----------------------------------------------------------------
   StaticGlyphField — small, mostly-still ASCII index numbers with a
   faint per-character shimmer so they read as "alive but controlled".
   ---------------------------------------------------------------- */
export class StaticGlyphField{
  // `step` controls how many points pointsFromGlyph samples from the
  // rasterized glyph (higher = sparser = calmer); `wobble` controls the
  // amplitude of the per-point opacity flicker. Both default to the
  // original desktop values — mobile call sites pass calmer numbers to
  // cut the "messy" look a dense, fast-flickering glyph reads as at the
  // canvas's much smaller (48px) mobile size.
  constructor(canvas, text, { color, seed = 7, step = 4, wobble = 0.15 } = {}){
    this.field = new AsciiField(canvas, {
      charSet: ' .:-=+*#%@',
      fontSize: 9,
      getColor: color,
    });
    this.basePoints = pointsFromGlyph(text, { fontPx: 150, step });
    this.wobble = wobble;
    this.rnd = mulberry32(seed);
    this.phases = this.basePoints.map(() => this.rnd() * Math.PI * 2);
    this.reduced = prefersReducedMotion();
    this._frame = this._frame.bind(this);
  }
  start(){ ticker.add(this._frame); if(this.reduced) this._frame(0); }
  stop(){ ticker.remove(this._frame); }
  destroy(){ this.stop(); this.field.destroy(); }
  _frame(dt, t){
    const time = this.reduced ? 0 : t / 1000;
    const pts = this.basePoints.map((p, i) => ({
      x: p.x, y: p.y,
      i: this.reduced ? p.i : Math.max(0.12, p.i * (0.85 + this.wobble * Math.sin(time * 1.4 + this.phases[i]))),
    }));
    this.field.setPoints(pts);
    this.field.render();
  }
}

/* ----------------------------------------------------------------
   MASCOT — the contact section's closing formation. Pure timing/geometry
   helpers below; the actual per-particle assembly, idle personality,
   stray encounters, cursor awareness and click reaction live in
   AsciiOrganism's 'mascot' case and _updateMascotState(), since he's
   now performed by the shared organism particle pool rather than a
   standalone canvas. See
   docs/superpowers/specs/2026-09-17-ascii-mascot-design.md for the
   original design rationale — most of the constants below encode a
   specific reviewed decision, not an arbitrary default. Formation
   progress itself is no longer a bespoke scroll calculation: it's
   just `seg.t` (or 1, once settled) from the organism's own
   constellation->mascot timeline segment, so it's reversible by the
   same construction as every other formation.
   ---------------------------------------------------------------- */

// per-part offset into the global progress so the body does not
// interpolate in lockstep — head resolves first, the left side lags
// the right on purpose (not a mirrored pair).
export const MASCOT_STAGGER = { head: 0, torso: 0.05, armR: 0.08, legR: 0.10, armL: 0.14, legL: 0.18 };

/** This part's own progress, derived from the global progress + its stagger offset. */
export function mascotPartProgress(p, stagger){
  const denom = 1 - stagger;
  const raw = denom <= 0 ? 1 : (p - stagger) / denom;
  return smoothstep(0, 1, Math.max(0, Math.min(1, raw)));
}

// flicker dropout band, in terms of a part's OWN partP — a flagged point
// in this band multiplies its intensity by an on/off flicker rather than
// rendering solid, reading as "hasn't caught yet" rather than a bug.
const MASCOT_FLICKER_LO = 0.35;
const MASCOT_FLICKER_HI = 0.55;

/** 1 = solid, 0.15 = dropped out, for a flagged flicker point at this partP. */
export function mascotFlickerIntensity(partP, seed){
  if(partP <= MASCOT_FLICKER_LO || partP >= MASCOT_FLICKER_HI) return 1;
  const span = MASCOT_FLICKER_HI - MASCOT_FLICKER_LO;
  const local = (partP - MASCOT_FLICKER_LO) / span; // 0..1 across the band
  const wave = Math.sin(local * Math.PI * 2 + seed);
  return wave < -0.2 ? 0.15 : 1;
}

const MASCOT_GLANCE_MIN_S = 6, MASCOT_GLANCE_MAX_S = 11;
const MASCOT_GLANCE_IN_S = 0.6, MASCOT_GLANCE_HOLD_S = 0.4, MASCOT_GLANCE_OUT_S = 0.6;
export const MASCOT_GLANCE_DURATION_S = MASCOT_GLANCE_IN_S + MASCOT_GLANCE_HOLD_S + MASCOT_GLANCE_OUT_S;

/** Random wait (seconds) until the next idle glance, given a 0..1 rnd() draw. */
export function mascotNextGlanceWait(rnd){
  return MASCOT_GLANCE_MIN_S + rnd() * (MASCOT_GLANCE_MAX_S - MASCOT_GLANCE_MIN_S);
}

/** Glance offset amount (0..1) at `elapsed` seconds since a glance was triggered. */
export function mascotGlanceAmount(elapsed){
  if(elapsed < 0) return 0;
  if(elapsed < MASCOT_GLANCE_IN_S) return smoothstep(0, 1, elapsed / MASCOT_GLANCE_IN_S);
  if(elapsed < MASCOT_GLANCE_IN_S + MASCOT_GLANCE_HOLD_S) return 1;
  const outElapsed = elapsed - MASCOT_GLANCE_IN_S - MASCOT_GLANCE_HOLD_S;
  if(outElapsed < MASCOT_GLANCE_OUT_S) return 1 - smoothstep(0, 1, outElapsed / MASCOT_GLANCE_OUT_S);
  return 0; // glance finished — caller schedules the next one
}

const MASCOT_ENCOUNTER_MIN_S = 15, MASCOT_ENCOUNTER_MAX_S = 30;
export const MASCOT_ENCOUNTER_TYPES = ['watch', 'nudge', 'catch'];
const MASCOT_ENCOUNTER_APPROACH_S = 1.0;
const MASCOT_ENCOUNTER_HOLD_S = { watch: 1.5, nudge: 0.2, catch: 1.75 };
const MASCOT_ENCOUNTER_RELEASE_S = 1.0;

/** Random wait (seconds) until the next stray encounter. */
export function mascotNextEncounterWait(rnd){
  return MASCOT_ENCOUNTER_MIN_S + rnd() * (MASCOT_ENCOUNTER_MAX_S - MASCOT_ENCOUNTER_MIN_S);
}
/** Total duration (seconds) of one encounter of this type. */
export function mascotEncounterDuration(type){
  return MASCOT_ENCOUNTER_APPROACH_S + MASCOT_ENCOUNTER_HOLD_S[type] + MASCOT_ENCOUNTER_RELEASE_S;
}
/** Phase and progress (0..1 within that phase) of an encounter of `type`
 *  at `elapsed` seconds since it started. */
export function mascotEncounterPhase(type, elapsed){
  const holdS = MASCOT_ENCOUNTER_HOLD_S[type];
  if(elapsed < 0) return { phase: 'done', amount: 0 };
  if(elapsed < MASCOT_ENCOUNTER_APPROACH_S){
    return { phase: 'approach', amount: smoothstep(0, 1, elapsed / MASCOT_ENCOUNTER_APPROACH_S) };
  }
  const holdElapsed = elapsed - MASCOT_ENCOUNTER_APPROACH_S;
  if(holdElapsed < holdS) return { phase: 'hold', amount: 1 };
  const releaseElapsed = holdElapsed - holdS;
  if(releaseElapsed < MASCOT_ENCOUNTER_RELEASE_S){
    return { phase: 'release', amount: 1 - smoothstep(0, 1, releaseElapsed / MASCOT_ENCOUNTER_RELEASE_S) };
  }
  return { phase: 'done', amount: 0 };
}

export const MASCOT_NOTICE_RADIUS_PX = 260;

/** Continuous 0..1 cursor attention — never thresholded, never used for brightness. */
export function mascotCursorAttention(distPx, radiusPx = MASCOT_NOTICE_RADIUS_PX){
  const raw = 1 - Math.max(0, Math.min(1, distPx / radiusPx));
  return smoothstep(0, 1, raw);
}

export const MASCOT_ALERT_HOLD_S = 3.5;
export const MASCOT_ALERT_IN_S = 0.3, MASCOT_ALERT_OUT_S = 0.6;

/** Alert (post-click) amount 0..1 at `elapsed` seconds since (re)trigger. */
export function mascotAlertAmount(elapsed){
  if(elapsed < 0) return 0;
  if(elapsed < MASCOT_ALERT_IN_S) return smoothstep(0, 1, elapsed / MASCOT_ALERT_IN_S);
  if(elapsed < MASCOT_ALERT_IN_S + MASCOT_ALERT_HOLD_S) return 1;
  const outElapsed = elapsed - MASCOT_ALERT_IN_S - MASCOT_ALERT_HOLD_S;
  if(outElapsed < MASCOT_ALERT_OUT_S) return 1 - smoothstep(0, 1, outElapsed / MASCOT_ALERT_OUT_S);
  return 0;
}

export const MASCOT_IDLE_DELAY_S = 8;
export const MASCOT_IDLE_JACK_DELAY_S = MASCOT_IDLE_DELAY_S;
export const MASCOT_IDLE_JACK_REPS = 3;
export const MASCOT_IDLE_JACK_REP_S = 1.05;
export const MASCOT_IDLE_JACK_DURATION_S = MASCOT_IDLE_JACK_REPS * MASCOT_IDLE_JACK_REP_S;
export const MASCOT_IDLE_ROUTINES = [
  'jumping-jacks',
  'tiny-wave',
  'head-inspection',
  'balance-wobble',
];

/** Temporary keyboard preview mapping: 1 wave, 2 inspect, 3 balance. */
export function mascotShortcutRoutineIndex(value){
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 3 ? number : -1;
}

const MASCOT_IDLE_ROUTINE_DURATIONS = [MASCOT_IDLE_JACK_DURATION_S, 2.8, 3.6, 3.5];

export function mascotIdleRoutineDuration(index){
  return MASCOT_IDLE_ROUTINE_DURATIONS[index % MASCOT_IDLE_ROUTINES.length];
}

/** Current named idle pose and its eased 0..1 action amount. */
export function mascotIdleRoutinePose(idleElapsed, index){
  const name = MASCOT_IDLE_ROUTINES[index % MASCOT_IDLE_ROUTINES.length];
  const duration = mascotIdleRoutineDuration(index);
  const localT = idleElapsed - MASCOT_IDLE_DELAY_S;
  if(localT < 0 || localT >= duration) return { name, amount: 0, localT: 0 };
  if(name === 'jumping-jacks'){
    return { name, amount: mascotJumpingJackAmount(idleElapsed), localT: localT / duration };
  }
  const edge = Math.min(1, localT / 0.45, (duration - localT) / 0.45);
  return { name, amount: smoothstep(0, 1, Math.max(0, edge)), localT: localT / duration };
}

/** 0..1 open-pose amount for a three-repetition idle jumping-jack routine. */
export function mascotJumpingJackAmount(idleElapsed){
  const routineT = idleElapsed - MASCOT_IDLE_JACK_DELAY_S;
  if(routineT < 0 || routineT >= MASCOT_IDLE_JACK_DURATION_S) return 0;
  const repT = (routineT % MASCOT_IDLE_JACK_REP_S) / MASCOT_IDLE_JACK_REP_S;
  // Smooth closed -> open -> closed motion for every repetition.
  return Math.sin(Math.PI * repT) ** 2;
}

/** Rotate a limb point around its joint, then translate the whole limb. */
export function mascotRigidLimbPoint(x, y, pivotX, pivotY, angle, tx = 0, ty = 0){
  const dx = x - pivotX, dy = y - pivotY;
  return {
    x: pivotX + dx * Math.cos(angle) - dy * Math.sin(angle) + tx,
    y: pivotY + dx * Math.sin(angle) + dy * Math.cos(angle) + ty,
  };
}

// Dense block silhouette, local unit space (~[-1,1] box), y-down like
// the rest of this file. The solid lime head is drawn separately; these
// points fill the reference's black body blocks with overlapping hash
// characters: a broad torso, detached arm columns, and parallel legs.
//
// Y is shifted +0.32 from the original standalone spec's coordinates
// so local y=0 (the anchor pivot, i.e. the border line under the
// contact heading) sits at the figure's own vertical CENTER rather
// than his waist. This matters because the anchor is clamped to
// [0.1, 0.9] of the viewport by the shared zone system (see
// _timelineSegment) — once you've scrolled well past the anchor
// marker (true for most of the scroll through the rest of the contact
// section), it pins near the TOP of the viewport, same as every other
// formation's own anchor does once its trigger element is above the
// fold. A figure centered on its anchor gets clipped evenly top/bottom
// in that state instead of losing its head off the top of the screen
// entirely (a real bug hit during live verification — the un-shifted
// waist-as-origin coordinates put his head ~160px above the viewport
// whenever the anchor was pinned near the top).
function mascotGrid(part, xs, ys){
  const points = [];
  ys.forEach((y) => xs.forEach((x) => points.push({ part, x, y })));
  return points;
}

const MASCOT_TORSO_X = [-0.10, 0, 0.10];
const MASCOT_TORSO_Y = [-0.12, -0.05, 0.02, 0.09, 0.16, 0.23, 0.30, 0.37, 0.44];
const MASCOT_ARM_Y = [-0.06, 0.01, 0.08, 0.15, 0.22, 0.29, 0.36, 0.43];
const MASCOT_LEG_Y = [0.56, 0.64, 0.72, 0.80, 0.88];

export const MASCOT_BODY_POINTS = [
  ...mascotGrid('torso', MASCOT_TORSO_X, MASCOT_TORSO_Y),
  ...mascotGrid('armL', [-0.27], MASCOT_ARM_Y),
  ...mascotGrid('armR', [0.27], MASCOT_ARM_Y),
  ...mascotGrid('legL', [-0.10], MASCOT_LEG_Y),
  ...mascotGrid('legR', [0.10], MASCOT_LEG_Y),
];

MASCOT_BODY_POINTS.find((pt) => pt.part === 'armL' && pt.y === 0.43).flicker = true;
MASCOT_BODY_POINTS.find((pt) => pt.part === 'legL' && pt.y === 0.72).flicker = true;
MASCOT_BODY_POINTS.find((pt) => pt.part === 'armR' && pt.y === 0.43).isHand = true;
MASCOT_BODY_POINTS.find((pt) => pt.part === 'legR' && pt.y === 0.88).isFoot = true;

// fixed reference points (right hand / right foot / a head-height spot
// in front of him) that stray encounters target — see
// AsciiOrganism._updateMascotState below.
export const MASCOT_HAND_R = { x: 0.27, y: 0.43 };
export const MASCOT_FOOT_R = { x: 0.10, y: 0.88 };
export const MASCOT_WATCH_PT = { x: 0, y: -0.43 };

// Fixed on-screen SIZE, independent of viewport (unlike every other
// formation, which scales with minDim) — matches the original
// standalone canvas's own fixed CSS box (72x96 desktop / 56x76
// mobile), computed dynamically per frame in
// AsciiOrganism._updateMascotState since the local-space multiplier
// needed to hit an exact pixel height changes with the CURRENT
// viewport's minDim. Height-based (width follows from the geometry's
// own aspect ratio) since height is the dominant/most visible
// dimension. Tune these first if he ever needs to read bigger/smaller.
export const MASCOT_TARGET_HEIGHT_PX = 96;
export const MASCOT_TARGET_HEIGHT_MOBILE_PX = 76;

// constant upward shift (viewport px, independent of scroll/anchor
// position) applied to his whole on-screen position — set by explicit
// request after the first live look.
export const MASCOT_Y_OFFSET_PX = -66;
// Mobile-only counterpart: -66 straddles the anchor line (head above it,
// legs still short of it, by design on desktop). Per explicit request his
// feet should actually rest ON that specific line on mobile instead — the
// exact math is -0.70 * mobile pxPerUnit (MASCOT_TARGET_HEIGHT_MOBILE_PX
// / 1.4, the bounding box's own half-height) = -38, which centers the
// whole figure on the line; nudged a few px past that (toward 0) so his
// feet land just past it rather than a hair short.
export const MASCOT_Y_OFFSET_MOBILE_PX = -48;

/** Ambient stray particles: fixed home position, wander motion, and
 *  settle weight (how close a given stray tucks in once formed). */
export function mascotBuildStrays(rnd, count = 25){
  const strays = [];
  for(let i = 0; i < count; i++){
    const angle = rnd() * Math.PI * 2;
    const radius = 1.0 + rnd() * 0.7;
    strays.push({
      homeX: Math.cos(angle) * radius,
      homeY: Math.sin(angle) * radius,
      phase: rnd() * Math.PI * 2,
      speed: 0.15 + rnd() * 0.2,
      amp: 0.08 + rnd() * 0.1,
      settle: rnd() < 0.3 ? 0.6 + rnd() * 0.4 : rnd() * 0.15,
      jitterSeed: rnd() * Math.PI * 2,
    });
  }
  return strays;
}
