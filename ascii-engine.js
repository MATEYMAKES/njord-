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

/* an 8-sided bipyramid — a "brilliant cut" simplified enough to stay
   perceptible as ASCII facets, flat-shaded per triangle */
function buildDiamondFacets(girdle = 8){
  // y is negative toward the TOP of the screen (canvas convention) — the
  // short crown must sit at negative y, the long pointed pavilion at
  // positive y, or the diamond renders upside down.
  const ring = [];
  for(let k = 0; k < girdle; k++){
    const a = (k / girdle) * Math.PI * 2;
    ring.push({ x: Math.cos(a), y: -0.1, z: Math.sin(a) });
  }
  const top = { x: 0, y: -0.55, z: 0 };
  const bottom = { x: 0, y: 1.15, z: 0 };
  const facets = [];
  for(let k = 0; k < girdle; k++){
    const a = ring[k], b = ring[(k + 1) % girdle];
    facets.push(makeFacet(top, a, b));
    facets.push(makeFacet(bottom, b, a));
  }
  return facets;
}
function makeFacet(v0, v1, v2){
  const ux = v1.x - v0.x, uy = v1.y - v0.y, uz = v1.z - v0.z;
  const vx = v2.x - v0.x, vy = v2.y - v0.y, vz = v2.z - v0.z;
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  nx /= len; ny /= len; nz /= len;
  return { v0, v1, v2, normal: { x: nx, y: ny, z: nz } };
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

    this.facets = buildDiamondFacets();
    this.diamondFacet = new Uint8Array(n);
    this.diamondU = new Float32Array(n);
    this.diamondV = new Float32Array(n);
    for(let i = 0; i < n; i++){
      this.diamondFacet[i] = i % this.facets.length;
      let u = rnd(), v = rnd();
      if(u + v > 1){ u = 1 - u; v = 1 - v; }
      this.diamondU[i] = u; this.diamondV[i] = v;
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

    // path: each node plus 3 jittered intermediate seeds per segment, so
    // the route bends rather than running straight between nodes
    const seeds = [];
    const SEEDS_PER_SEGMENT = 3;
    for(let k = 0; k < NODE_COUNT - 1; k++){
      const A = nodes[k], B = nodes[k + 1];
      seeds.push({ x: A.x, y: A.y, node: k });
      const dx = B.x - A.x, dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      for(let s = 1; s <= SEEDS_PER_SEGMENT; s++){
        const u = s / (SEEDS_PER_SEGMENT + 1);
        const jitter = (Math.random() - 0.5) * 0.09;
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
    for(let i = 0; i < n; i++){
      const raw = Math.random();
      // low-frequency warp so density varies along the path (some
      // stretches dense, some sparse) instead of perfectly uniform
      const warp = 0.15 * Math.sin(raw * Math.PI * 3.1);
      this.roadmapU[i] = Math.max(0, Math.min(1, raw + warp));
      this.roadmapDensity[i] = 0.4 + Math.random() * 0.6;
    }
  }

  _roadmapPointAt(u){
    const seeds = this.roadmapSeeds;
    const segCount = seeds.length - 1;
    const pos = Math.max(0, Math.min(1, u)) * segCount;
    const idx = Math.min(segCount - 1, Math.floor(pos));
    const frac = pos - idx;
    const A = seeds[idx], B = seeds[idx + 1];
    return { x: A.x + (B.x - A.x) * frac, y: A.y + (B.y - A.y) * frac };
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
      const anchorX = Math.max(0.16, Math.min(0.8, (r.left + r.width * 0.74) / this.w));
      const anchorY = Math.max(0.1, Math.min(0.9, (r.top + r.height / 2) / vh));
      if(z.ranged){
        // spans its own full scroll height instead of one pivot point —
        // contributes two points sharing its name, so the segment
        // BETWEEN them resolves as a same-ends span for the whole
        // section (see the sameEnds fast path in _frame), while normal
        // pairwise blending still drives the approach/exit transitions
        // on either side exactly like every other zone.
        points.push({ name: z.name, docY: scrollY + r.top, anchorX, anchorY });
        points.push({ name: z.name, docY: scrollY + r.top + r.height, anchorX, anchorY });
      } else {
        points.push({ name: z.name, docY: scrollY + r.top + r.height / 2, anchorX, anchorY });
      }
    });
    const playheadY = scrollY + vh / 2;

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
      case 'diamond': {
        const facet = this.facets[this.diamondFacet[i]];
        const u = this.diamondU[i], v = this.diamondV[i];
        const lp = {
          x: facet.v0.x * (1 - u - v) + facet.v1.x * u + facet.v2.x * v,
          y: facet.v0.y * (1 - u - v) + facet.v1.y * u + facet.v2.y * v,
          z: facet.v0.z * (1 - u - v) + facet.v1.z * u + facet.v2.z * v,
        };
        const angle = t * 0.16;
        const rp = rotate3(lp, angle, 0.5);
        const rn = rotate3(facet.normal, angle, 0.5);
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
        const revealed = u <= localT;
        if(!revealed){
          // held just off the path's own start, faint — reads as "hasn't
          // arrived yet" rather than popping in once its threshold is crossed
          const p0 = this.roadmapSeeds[0];
          return { x: (p0.x - 0.5) * 2, y: (p0.y - 0.5) * 2, i: 0.05, c: 0.5 };
        }
        const pt = this._roadmapPointAt(u);
        const density = this.roadmapDensity[i];
        const flicker = 0.5 + 0.5 * Math.sin(t * 1.8 + this.jitterSeed[i] * 3.0);
        const nearestNodeFrac = Math.round(u * (this.roadmapNodeCount - 1)) / (this.roadmapNodeCount - 1);
        const nodeCloseness = Math.max(0, 1 - Math.abs(u - nearestNodeFrac) * 14);
        const baseIntensity = (0.16 + density * 0.3) * flicker;
        const intensity = Math.max(baseIntensity, nodeCloseness * 0.85);
        // after the route is fully traversed and we're actually leaving
        // the section (seg.a is roadmap, seg.b is the NEXT formation),
        // scatter and fade the path — "loses structure and disperses"
        // rather than a plain positional blend into whatever's next
        const dissolve = (seg && seg.a === 'roadmap' && seg.b !== 'roadmap') ? seg.t : 0;
        const scatterAmt = dissolve * 0.5;
        const scatterX = Math.sin(this.jitterSeed[i] * 7.7 + t * 0.3) * scatterAmt;
        const scatterY = Math.cos(this.jitterSeed[i] * 5.3 + t * 0.25) * scatterAmt;
        return {
          x: (pt.x - 0.5) * 2 + scatterX, y: (pt.y - 0.5) * 2 + scatterY,
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
      default: return { x: 0, y: 0, i: 0.15, c: 0 };
    }
  }

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

    // globe is neutral (c: 0 in _formationTarget) and must contribute
    // NOTHING to the color blend, ever — weighting each side's accent by
    // its own color-intensity (not just seg.t) is what guarantees that,
    // instead of a yellow-green globe tint bleeding into every segment
    // that happens to touch it regardless of how "neutral" it claims to be
    // constellation reuses globe's own (otherwise-inert) RGB — that's NJORD's
    // own acid-signal-green, not a bug like the yellow-flash one above: this
    // is the one formation actually meant to carry the site's own identity
    // color, since it represents NJORD describing itself rather than a client
    const ACCENTS = { diamond: [61, 127, 240], wave: [122, 27, 51], network: [31, 76, 120], globe: [203, 255, 61], constellation: [203, 255, 61], roadmap: [203, 255, 61] };
    const FORM_C = { globe: 0, diamond: 1, wave: 1, network: 0.4, constellation: 0.55, roadmap: 0.5 };
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

    const posEase = this.reduced ? 1 : 0.045;
    const offEase = this.reduced ? 1 : 0.1;
    const wobble = 0.012 + turbulence * 0.01;

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
      const wx = Math.sin(t * 0.6 + this.jitterSeed[i]) * wobble;
      const wy = Math.cos(t * 0.5 + this.jitterSeed[i] * 1.3) * wobble;

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
          const strength = falloff * falloff * (0.045 + pointerSpeed * 0.09);
          desiredOffX = (dx / dist) * strength;
          desiredOffY = (dy / dist) * strength;
        }
      }
      this.vx[i] += (desiredOffX - this.vx[i]) * offEase;
      this.vy[i] += (desiredOffY - this.vy[i]) * offEase;

      this.intensity[i] += (targetIntensity - this.intensity[i]) * 0.06;
      this.colorMix[i] += (colorTarget - this.colorMix[i]) * 0.035;
    }

    this._render(ar, ag, ab);
  }

  _render(ar, ag, ab){
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.font = "700 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const inkRGB = hexToRgb(this.getInkColor());
    const n = this.count;
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
      ctx.fillText(chars[idx], (this.x[i] + this.vx[i]) * w, (this.y[i] + this.vy[i]) * h);
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

    if(name === 'diamond'){
      this.facets = buildDiamondFacets(14); // more facets than the on-page organism's diamond
      this.facetIdx = new Uint8Array(n);
      this.u = new Float32Array(n); this.v = new Float32Array(n);
      for(let i = 0; i < n; i++){
        this.facetIdx[i] = i % this.facets.length;
        let u = rnd(), v = rnd();
        if(u + v > 1){ u = 1 - u; v = 1 - v; }
        this.u[i] = u; this.v[i] = v;
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
        const facet = this.facets[this.facetIdx[i]];
        const u = this.u[i], v = this.v[i];
        const lp = {
          x: facet.v0.x * (1 - u - v) + facet.v1.x * u + facet.v2.x * v,
          y: facet.v0.y * (1 - u - v) + facet.v1.y * u + facet.v2.y * v,
          z: facet.v0.z * (1 - u - v) + facet.v1.z * u + facet.v2.z * v,
        };
        const angle = t * 0.18;
        const rp = rotate3(lp, angle, 0.5);
        const rn = rotate3(facet.normal, angle, 0.5);
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
