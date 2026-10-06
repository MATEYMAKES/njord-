/* ---- 00-imports.js ---- */
/* =====================================================================================================================
   Aurelia GL — the three.js engine (gl-engine: src/gl/00-59), the scenes (gl-scenes-a/b: 60-89) and try-on (90-99).
   Every src/gl/*.js file is joined, in file-name order, into ONE <script type="module">, so they share one scope.

   Top-level names declared by gl-engine (never redeclare them in a later file):
     THREE, mergeGeometries, mergeVertices, AU, KIT, GPX, and every name that starts with `gl` (glFail, glBoot, …),
     `Gl` (GlStage, GlShadow, GlGlints) or with an upper-case `G_` prefix. Later files: wrap each file in a block
     `{ … }` so your names stay private, and talk to the engine through KIT (see 10-kit.js) and the stage helpers.

   Boot (v2): nothing touches WebGL while the page is starting. The engine waits for the intro to finish
   (AU.on('intro:done'), or at once when the intro is not shown), then for the next paint and an idle slice, and only
   then publishes window.AUGL (AU.emit('gl', api)). Every heavy step after that (a stage's renderer, its lighting, a
   build, shader compiles) runs in its own idle slice through glIdle() (40-stage.js), so no task blocks the page for
   more than a few milliseconds. Any failure during boot is reported once with console.error and the page is told
   `AU.emit('gl', null)` so every 3D spot shows its fallback.
   ===================================================================================================================== */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const AU = window.AU || (window.AU = {});

let glFailed = false;
function glFail(err) {
  if (glFailed) return;
  glFailed = true;
  console.error('[Aurelia GL] 3D engine unavailable, showing fallbacks:', err);
  try { window.AUGL = null; } catch (e) { /* ignore */ }
  try { if (AU.emit) AU.emit('gl', null); } catch (e) { /* ignore */ }
}

/* The boot gate. The module is evaluated before the page's own ready handlers run, so the intro has not started yet:
   it will be shown unless the head script marked the session (html.no-intro), motion is reduced, or there is no
   #intro element. In that case the engine starts right after the first paint; otherwise it waits for 'intro:done'
   (with a safety net well inside core's 12 s AU.gl timeout, in case the intro never reports). */
function glGate(fn) {
  const html = document.documentElement;
  let opened = false;
  const open = function () {
    if (opened) return;
    opened = true;
    const run = function () { try { fn(); } catch (err) { glFail(err); } };
    // after the next paint, in an idle slice (never during the frame the intro hands over in)
    requestAnimationFrame(function () {
      if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 500 }); else setTimeout(run, 40);
    });
  };
  if (AU.shell && AU.shell.introDone) { open(); return; }
  if (AU.on) AU.on('intro:done', open);
  let reduced = false;
  try { reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  const intro = document.getElementById('intro');
  const skip = !intro || html.classList.contains('no-intro') || reduced || !AU.on;
  if (skip) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(open, 0); }, { once: true });
    else setTimeout(open, 0);
  }
  setTimeout(open, skip ? 1500 : 9000);
}

/* Start once the whole module body has been evaluated (glBoot lives in 49-api.js; function declarations are hoisted,
   so it exists even though it is defined further down) and the gate has opened. */
Promise.resolve().then(function () {
  try { glGate(glBoot); } catch (err) { glFail(err); }
});

/* ---- 10-kit.js ---- */
/* =====================================================================================================================
   KIT — the builder kit every jewelry model is made with (rings here in gl-core; bracelets, earrings and pendants
   in gl-pieces, src/gl/50-79). Read this block before writing a builder. The rings in 32-rings.js are worked
   examples of everything below.

   SCOPE AND NAMES
   - All src/gl files share ONE module scope. Already declared by gl-core (never redeclare): THREE, AU, KIT,
     mergeGeometries, mergeVertices (from three/addons/utils/BufferGeometryUtils.js), and every top-level name that
     starts with `gl` or `G_`. Wrap each of your files in a block `{ … }` and use only THREE, KIT and AU inside.
   - Register builders at the top level of your file (inside the block). The engine boots after the whole module
     has run, so your builders are in place before the first render. Never touch the DOM or WebGL from a builder.

   UNITS AND ORIENTATION
   - 1 unit = 1 millimetre. Build pieces at real size (a ring size 6 is 16.5 mm inside, a 1 ct round is 6.4 mm).
   - +Y is up, the viewer is at +Z looking towards -Z, +X is to the viewer's right.
   - Build each piece in its "display pose": the way it should stand in front of the camera at a turn of 0 (a ring
     stands upright with its finger axis along Z and the centre stone on top, table facing +Y; a pair of earrings
     hangs side by side facing +Z; a pendant hangs facing +Z; a bracelet stands like a ring or lies tilted).
   - Never position the piece for the camera: every stage measures the tight bounding sphere of whatever you return
     (so absolute size and offset do not matter), tilts it toward the camera (view.tilt, about X) and turns it about
     the vertical axis. A contact shadow is placed under its lowest point automatically.
   - Gem frame: a gem's origin is the centre of its girdle plane, table up (+Y), girdle width along X, length along Z
     (so an oval or pear made with ctx.gem() lies "north-south" along a finger without any rotation).
     To face a stone toward the viewer (studs, drops, pendants) rotate its setting group by rotation.x = PI/2:
     the table then faces +Z and the gem's +Z (a pear's point) hangs down (-Y).

   REGISTRY
     KIT.register(type, builder)              builder for every style of a type ('bracelet', 'earrings', 'pendant'…)
     KIT.register(type, style, builder)       builder for one style (takes precedence over the type builder)
     builder(spec, ctx) -> THREE.Object3D | { object, view }
       spec  normalised (see KIT.spec): every field present, valid values only
       ctx   the build context (below), one per build
       view  optional presentation hints, all optional (radians):
             { tilt: 0.5,                         hero/studio tilt of the piece toward the camera (about X)
               still: { tilt: 0.3, turn: -0.6 },  the three-quarter still / catalogue pose
               spinTilt: 0.32,                    tilt used by the 360° spin strips
               focus: Vector3 }                   point (piece frame) the studio drifts to when zooming in
             defaults per type: ring {0.52, {0.34,-0.62}, 0.34}; bracelet {0.35, {0.3,-0.5}, 0.3};
             earrings / pendant {0.12, {0.1,-0.35}, 0.1}
     A builder must not throw for odd specs: fall back to something sensible. If a builder throws, the error is
     logged and the engine shows a plain band; if no builder exists for a type, it shows a plain band too.

   SPEC AND SIZES
     KIT.spec(s) -> normalised copy: { type, style, metal, stone (null or name), cut, carat, accent, size, engraving }
     KIT.size(cut, carat) -> { width, length }   girdle size in mm (1 ct round = 6.4 mm; scales with carat^(1/3);
                                                  oval 5.7x7.8, pear 5.5x8.5, cushion 5.6x5.85, emerald 5.1x7.15 at 1 ct)
     KIT.ringInner(size)  -> inner radius in mm for a US ring size (6 -> 8.25)
     KIT.METALS  { yellow, rose, white }: { color, roughness, name }
     KIT.STONES  { diamond, ruby, emerald, sapphire }: optical constants used by the gem shader
     KIT.CUTS ['round','oval','pear','cushion','emerald']   KIT.TYPES, KIT.STYLES (per type, from 01-content.js)

   THE BUILD CONTEXT  (ctx — take materials and gems from here so the stage can light, fade and dispose them)
     ctx.spec, ctx.detail ('hero' | 'studio' | 'still'), ctx.lod (1 live, 0.6–0.85 for stills: scale your segment
     counts by it), ctx.THREE, ctx.KIT
     ctx.metal(name = spec.metal, { roughness, tint }) -> MeshPhysicalMaterial
        polished metal (metalness 1, faint natural roughness variation), one material per name per build.
     ctx.gem({ cut = spec.cut, stone = spec.stone || 'diamond', carat = spec.carat | width (mm), glints = true,
               bounces }) -> gem     one faceted stone (exact facet planes, ray-traced inside with dispersion)
        gem = { mesh, cut, stone, width, length, crown, table, pavilion, girdle, tableWidth   (all mm; crown/table
                = height of the table above y = 0, pavilion = depth of the culet below it)
                outline(az) -> Vector2 (x, z): the real girdle at azimuth az (from +X toward +Z)
                surfaceY(x, z) -> crown height at (x, z)    bottomY(x, z) -> pavilion surface (negative) at (x, z)
                prongs(n) -> claw azimuths that suit this cut (corners for emerald/cushion, the point for pear) }
        gem.mesh is already scaled; normally you do not add it yourself: ctx.setting() does.
     ctx.gems({ stone = 'diamond', width (mm, number or array), matrices, cut = 'melee', bounces }) -> InstancedMesh
        many small stones (pavé, halo, tennis lines, eternity). Each Matrix4 places one stone's gem frame (no
        scale: width is applied for you). 'melee' is a cheap single cut for stones under ~2 mm; pass cut: 'round'
        (or another cut) for larger repeated stones.
     ctx.setting(gem, { claws = 4, az, clawR, bottom, baseR, low, rails, railR, bezel, wall, material })
        -> THREE.Group, origin at the girdle centre (same frame as the gem). Contains the gem and its metal head.
        claws: count (0 for none; az = custom azimuths); tapered round claws rise from a narrow base (baseR mm from
        the axis, at height `bottom`, default just under the culet), follow the pavilion, grip the girdle and fold
        over the crown edge. A gallery rail ties them half way down the pavilion (rails: 0 to omit).
        low: compact head for studs / side stones. bezel: true gives a polished collet that hugs the girdle and
        laps over the crown (no claws unless you ask for them); wall = rim thickness in mm.
     ctx.beads(matrices | Vector3[], radius = 0.25) -> InstancedMesh   small metal beads (micro claws, milgrain)
     ctx.mesh(geometry, material = ctx.metal()) -> Mesh
     ctx.instanced(geometry, material = ctx.metal(), matrices) -> InstancedMesh
     ctx.glint(object, point, normal, size, instanceIndex?)  extra glint candidate (object-local point and normal).
        ctx.gem / ctx.gems already register their crown facets, so you rarely need this.
     ctx.track(disposable)   anything else to dispose with the piece (canvas textures, extra materials)

   GEOMETRY HELPERS (pure; BufferGeometry in mm with smooth normals; KIT.unit() results are shared: never dispose)
     KIT.band({ inner, width, thick, dome = 2.3, comfort = 2.8, segments = 256, profile = 36, arc })
        a band around the Z axis (circle in the XY plane): inner radius, width along Z, radial thickness. width and
        thick are numbers or functions of theta (radians from +X toward +Y; the top of the ring is PI/2), so a band
        can taper. dome / comfort: superellipse exponents of the outer and inner profile (lower = rounder).
        arc = [from, to] for an open piece (cuffs, hoops); open ends are capped flat. Bangles: scale the result.
     KIT.tube(points, radius, { radial = 14, segments = 48, closed = false, caps = [true, true], tension = 0.5 })
        a smooth centripetal Catmull-Rom tube through Vector3 points; radius is a number or fn(t 0..1), with
        analytic normals and round end caps. Claws, wires, ear posts, bails, chain wire.
     KIT.loop(points, radius, opts)   closed tube through the points (rails, jump rings, hoops)
     KIT.sweep(path, profile, { closed = true, up = +Y })
        extrude a closed 2D profile [[n, u], …] (n away from the path's centre, u along `up`) along a 3D path of
        Vector3 (frames, collets, channel walls, oval bangles).
     KIT.unit(name)   shared unit geometries: 'sphere' and 'bead' (r = 1), 'cylinder' (r 1, h 1, along Y),
        'torus' (R 1, tube 0.2, in XY), 'link' (cable-chain link 2.4 x 1.4, wire 0.22, in XY; scale per chain)

   TRANSFORM HELPERS
     KIT.m4(position, quaternion?, scale?) -> Matrix4        (scale is a number or Vector3)
     KIT.qUp(direction) -> Quaternion turning +Y to `direction`
     KIT.onBand(theta, radius, z = 0, spin = 0, scale = 1) -> Matrix4
        a frame on a circle around Z: +Y points radially out at angle theta, Z stays along the axis, `spin` turns
        about the local Y (PI/2 lays an elongated stone along the band). Also places links around a bracelet.
     KIT.TAU, KIT.V(x, y, z) -> Vector3

   RULES OF THUMB FOR A REAL LOOK
     - Metal is never thinner than 0.5 mm; claws are 0.7–1.2 mm round wire; rails 0.5–0.7 mm.
     - Stones always sit IN metal: claws over the crown, a collet, or the pavilion hidden in a frame or channel.
     - Use ctx.gems for anything repeated (> 3 stones) and ctx.instanced / ctx.beads for repeated metal parts.
     - Keep a whole piece under ~400k triangles; scale segment counts by ctx.lod.
     - Never add lights, environments or shadows: the stages do that (jeweller's lightbox, contact shadow, glints).

   ---------------------------------------------------------------------------------------------------------------------
   V2 ADDITIONS (all additive; everything above still holds)

   SPEC FIELDS
     KIT.spec(s) also keeps: model (a .glb/.gltf URL, see 47-models.js), engraveFont ('script' | 'serif' | 'roman',
     default 'serif'). stone accepts any name registered in KIT.STONES (gl-scenes-a adds garnet, amethyst, … pearl,
     opal), cut any name in KIT.CUTS (KIT.addCut adds more).

   EXTENDING STONES AND CUTS
     KIT.STONES[name] = { name, ior, rgb, absorb, gain, edge, gate, lightK, edgeTint, body, surf }   faceted stones use
        the gem shader (16-materials.js) with these optical constants. Optional:
        material(cut, opt, stoneName) -> THREE.Material   your own material instead (pearl lustre, opal play of colour).
           It must fade with the stage: either expose uniforms.uOpacity or use material.opacity (the stage sets
           transparent = true before compiling). G_ENV.value is the environment (CubeUV) at draw time.
        mesh(ctx, o) -> { mesh, width, length, crown, pavilion, girdle, tableWidth, outline, surfaceY, bottomY }
           optional: replace the faceted mesh entirely (a pearl is a sphere); ctx.gem() then returns this info.
     KIT.addCut(name, { length, kind: 'brilliant' | 'single' | 'step', outline(az) -> {x, y} (unit width; y is Z),
        o: { table, crown, pav, girdle, star, lower } | step: { girdle, crownRows, pavRows }, prongs(n) -> radians[] })
     KIT.cut(name) -> the cached cut (facets, trace planes, outline, surfaceY, bottomY): read only.

   QUALITY TIER
     KIT.tier = { level: 'high' | 'mid' | 'low', dprCap, dprMin, bounces, melee, env (PMREM cube size), msaa }.
     Decided once from the device (touch, memory, cores, screen); override for testing with
     localStorage['aurelia:gltier'] = '"low"'. Stages cap their pixel ratio with it and adapt it to the frame time.

   STAGE HOOKS FOR SCENES (gl-scenes-a/b, tryon). Build a scene on GlStage (40-stage.js):
     const st = new GlStage(container, { kind, label, fov, normalize, light: 'studio' })
        st.prepare() -> Promise         resolves once the stage's environment is ready (it is made in idle slices)
        await st.compile(built)         ALWAYS before mounting a new piece: shaders compile off the main thread
        st.mount(built) / st.unmountSlot(slot) / glSwap(st, built, { out, in }) / glSpecQueue(st, transition)
        st.update = (t, dt) => moving   your per-frame logic (return true while anything moves)
        st.keepAlive = () => bool       keep the frame loop running although nothing moves (e.g. following the DOM)
        st.setLight(name)               'studio' | 'daylight' | 'candle' | 'evening' (cross-fades the environment)
        st.invalidate() / st.dispose()  one render on demand / free everything (call it from your dispose)
        st.scene, st.camera, st.rig, st.tiltG, st.turnG, st.shadow (GlShadow), st.glints (GlGlints)
     glIdle(fn, estimateMs) -> Promise   run a heavy step (a build, a texture) in idle time, one job at a time. fn may be
                                         a generator function: each `yield` ends a step (at most ~8 ms each), yielding a
                                         Promise waits for it. Nothing runs while the page scrolls or changes page.
     glBuildPiece(spec, { detail, lod }) -> built       glMeasure(object) -> { center, radius, box, points }
     G_ENV.value / G_ENV_LIGHT.value     the environment the gem shader samples (set by the stage before drawing)
     glGemEnvAsync(renderer, light) -> Promise<texture>   (v2.3) the room a stone sees INSIDE itself for that light: dark
                                         with hard-edged panels and pins, the same in both modes. Draw with it like this:
                                         glGemDraw(gemTex, () => renderer.render(scene, camera)) (sets G_GEM_ENV and
                                         G_GEM_ON just for that draw); without it the gem shader uses G_ENV as before.
     queue = glSpecQueue(stage, transition, early)   queue(spec) -> Promise; queue.prebuild([specs]) builds and compiles
                                         likely next pieces in calm idle time; pieces that leave the stage are kept
                                         (built and compiled, up to 4), so returning to one is only a mount.
     glEnvAsync(renderer, light, mode) -> Promise<texture>   an environment for your own renderer (PMREM, cached).
        Prefer it to glEnvFor(renderer, mode), which still works but generates at once: on a fresh WebGL context that
        is one ~80 ms task (its shaders compile synchronously); glEnvAsync compiles them off the main thread first.
     glActivity(fn) -> off               fn() when the visitor comes back after > 1.5 s without input (G_ACT.t is the
                                         time of the last input: a turntable may rest after a long while, see 42-hero)
     glDrawLayered(renderer, scene, camera, slots, glintsGroup)   draw with solid fades (see 40-stage.js)

   PUBLISHING A SCENE'S API
     AUGL_EXT.gemLab = function (container, o) { … }   (49-api.js) — methods put on AUGL_EXT at the top level of your
     file are copied onto window.AUGL when the engine publishes it (after the intro). Attaching to the api in
     AU.on('gl', api => …) works too.

   CHECKING THE BUDGETS
     AUGL._dev.slow   every engine step that took longer than 16 ms: [what, ms, when]. Idle slices, stage frames and
                      still-queue steps are recorded; nothing should come near 50.
   ===================================================================================================================== */

const G_TAU = Math.PI * 2;
const G_UP = new THREE.Vector3(0, 1, 0);
const G_REG = new Map();

const KIT = {
  THREE: THREE,
  TAU: G_TAU,
  V: function (x, y, z) { return new THREE.Vector3(x || 0, y || 0, z || 0); },
  CUTS: ['round', 'oval', 'pear', 'cushion', 'emerald'],
  TYPES: ['ring', 'bracelet', 'earrings', 'pendant'],
  STYLES: {
    ring: ['solitaire', 'halo', 'three-stone', 'eternity', 'band'],
    bracelet: ['tennis', 'bangle', 'cuff'],
    earrings: ['stud', 'drop', 'hoop'],
    pendant: ['solitaire', 'drop']
  },

  register: function (type, style, fn) {
    if (typeof style === 'function') { fn = style; style = null; }
    if (typeof fn !== 'function') return;
    G_REG.set(style ? type + ':' + style : type, fn);
  },
  builderFor: function (spec) {
    return G_REG.get(spec.type + ':' + spec.style) || G_REG.get(spec.type) || null;
  },

  spec: function (s) {
    s = s || {};
    const o = {};
    o.type = KIT.TYPES.indexOf(s.type) >= 0 ? s.type : 'ring';
    const styles = KIT.STYLES[o.type];
    o.style = styles.indexOf(s.style) >= 0 ? s.style : (typeof s.style === 'string' && s.style ? s.style : styles[0]);
    o.metal = s.metal === 'rose' || s.metal === 'white' ? s.metal : 'yellow';
    // any stone the kit knows (gl-scenes-a registers more in KIT.STONES)
    o.stone = typeof s.stone === 'string' && KIT.STONES && Object.prototype.hasOwnProperty.call(KIT.STONES, s.stone) ? s.stone : null;
    o.cut = KIT.CUTS.indexOf(s.cut) >= 0 ? s.cut : 'round';
    const c = +s.carat;
    o.carat = isFinite(c) && c > 0 ? Math.min(5, Math.max(0.05, c)) : 1;
    o.accent = s.accent === 'diamond' ? 'diamond' : null;
    const z = +s.size;
    o.size = isFinite(z) && z > 0 ? Math.min(13, Math.max(3, z)) : 6;
    o.engraving = typeof s.engraving === 'string' ? s.engraving.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
    o.engraveFont = s.engraveFont === 'script' || s.engraveFont === 'roman' ? s.engraveFont : 'serif';
    o.model = typeof s.model === 'string' && /\.(glb|gltf)(\?|#|$)/i.test(s.model) || (typeof s.model === 'string' && /^blob:/.test(s.model)) ? s.model : null;
    return o;
  },
  cut: function (name) { return glCut(name); },
  addCut: function (name, def) {
    if (!name || !def || G_CUT_DEFS[name]) return;
    G_CUT_DEFS[name] = def;
    if (KIT.CUTS.indexOf(name) < 0) KIT.CUTS.push(name);
  },

  /* girdle size in mm: width (X) and length (Z) for a cut at a carat weight */
  SIZE1CT: { round: [6.4, 6.4], oval: [5.7, 7.8], pear: [5.5, 8.5], cushion: [5.6, 5.85], emerald: [5.1, 7.15], melee: [6.4, 6.4] },
  size: function (cut, carat) {
    const s = KIT.SIZE1CT[cut] || KIT.SIZE1CT.round;
    const k = Math.cbrt(Math.max(0.01, carat || 1));
    return { width: s[0] * k, length: s[1] * k };
  },
  ringInner: function (size) { return (11.63 + 0.8128 * (size || 6)) / 2; },

  /* ---------------- transforms ---------------- */
  m4: function (p, q, s) {
    const m = new THREE.Matrix4();
    const sc = s == null ? new THREE.Vector3(1, 1, 1) : (typeof s === 'number' ? new THREE.Vector3(s, s, s) : s);
    return m.compose(p || new THREE.Vector3(), q || new THREE.Quaternion(), sc);
  },
  qUp: function (dir) { return new THREE.Quaternion().setFromUnitVectors(G_UP, dir.clone().normalize()); },
  onBand: function (theta, radius, z, spin, scale) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), theta - Math.PI / 2);
    if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(G_UP, spin));
    return KIT.m4(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, z || 0), q, scale == null ? 1 : scale);
  }
};

/* ---- quality tier (idea 26: faster on phones). Decided once; stages read it for their pixel ratio, gems for their
   bounce count, environments for their size. ---- */
const G_TIER = (function () {
  let level = 'high';
  try {
    const touch = matchMedia('(hover: none), (pointer: coarse)').matches;
    const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
    const small = Math.min(screen.width || 1200, screen.height || 900) < 620;
    if (touch && small) level = 'low';
    else if (touch || mem <= 4 || cores <= 4) level = 'mid';
    const o = JSON.parse(localStorage.getItem('aurelia:gltier') || 'null');
    if (o === 'high' || o === 'mid' || o === 'low') level = o;
  } catch (e) { /* defaults */ }
  const T = {
    high: { dprCap: 2, dprMin: 1, bounces: 6, melee: 4, env: 256, msaa: 4 },
    mid: { dprCap: 1.75, dprMin: 1, bounces: 5, melee: 3, env: 256, msaa: 4 },
    low: { dprCap: 1.5, dprMin: 0.9, bounces: 4, melee: 3, env: 128, msaa: 2 }
  }[level];
  return Object.assign({ level: level }, T);
})();
KIT.tier = G_TIER;

/* ---- 11-geom.js ---- */
/* ---- KIT geometry helpers: band sweep, tapered tubes, profile sweeps, cached unit shapes ---- */

function glSgnPow(v, p) { return (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), p); }
function glFn(v, d) { return typeof v === 'function' ? v : function () { return v == null ? d : v; }; }

/* Make sure triangles face outward: compare the normal at vertex `vi` with an expected outward direction. */
function glOrient(geo, vi, dir) {
  const n = geo.attributes.normal;
  const v = new THREE.Vector3(n.getX(vi), n.getY(vi), n.getZ(vi));
  if (v.dot(dir) >= 0) return geo;
  const idx = geo.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  geo.index.needsUpdate = true;
  const na = n.array;
  for (let i = 0; i < na.length; i++) na[i] = -na[i];
  n.needsUpdate = true;
  return geo;
}

/* A ring band around the Z axis. Profile: a superellipse, domed outside (`dome`) and comfort-rounded inside. */
KIT.band = function (o) {
  o = o || {};
  const inner = o.inner != null ? o.inner : KIT.ringInner(6);
  const W = glFn(o.width, 2), T = glFn(o.thick, 1.6);
  const dome = o.dome || 2.3, comfort = o.comfort || 2.8;
  const segs = Math.max(8, Math.round(o.segments || 256)), prof = Math.max(8, Math.round(o.profile || 36));
  const arc = o.arc, closed = !arc;
  const a0 = arc ? arc[0] : 0, a1 = arc ? arc[1] : G_TAU;
  const nU = closed ? segs : segs + 1;
  const pos = [], idx = [];
  const prf = [];
  for (let j = 0; j < prof; j++) {
    const ph = j / prof * G_TAU, c = Math.cos(ph), s = Math.sin(ph);
    const n = s >= 0 ? dome : comfort;
    prf.push([glSgnPow(c, 2 / n), glSgnPow(s, 2 / n)]);
  }
  for (let i = 0; i < nU; i++) {
    const th = a0 + (a1 - a0) * i / segs, w = W(th), t = T(th), ct = Math.cos(th), st = Math.sin(th);
    for (let j = 0; j < prof; j++) {
      const a = w / 2 * prf[j][0], r = inner + t / 2 + t / 2 * prf[j][1];
      pos.push(r * ct, r * st, a);
    }
  }
  const id = function (i, j) { return (i % nU) * prof + (j % prof); };
  const iMax = closed ? nU : nU - 1;
  for (let i = 0; i < iMax; i++) {
    for (let j = 0; j < prof; j++) {
      const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
      idx.push(a, d, b, b, d, c);
    }
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const top = Math.round(prof / 4);   // phi = PI/2: the outer crest of the first section
  glOrient(geo, top, new THREE.Vector3(Math.cos(a0), Math.sin(a0), 0));
  if (!closed) geo = glCapBandEnds(geo, nU, prof, a0, a1);
  return geo;
};

/* flat caps on the open ends of an arc band (separate vertices so the cap stays crisp) */
function glCapBandEnds(geo, nU, prof, a0, a1) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const pos = Array.from(p.array), nor = Array.from(n.array), idx = Array.from(geo.index.array);
  [[0, a0, -1], [nU - 1, a1, 1]].forEach(function (e) {
    const ring = e[0], th = e[1], sg = e[2];
    const tn = [-Math.sin(th) * sg, Math.cos(th) * sg, 0];
    const base = pos.length / 3;
    let cx = 0, cy = 0, cz = 0;
    for (let j = 0; j < prof; j++) {
      const k = ring * prof + j;
      cx += p.getX(k); cy += p.getY(k); cz += p.getZ(k);
      pos.push(p.getX(k), p.getY(k), p.getZ(k)); nor.push(tn[0], tn[1], tn[2]);
    }
    pos.push(cx / prof, cy / prof, cz / prof); nor.push(tn[0], tn[1], tn[2]);
    const c = base + prof;
    for (let j = 0; j < prof; j++) {
      const a = base + j, b = base + (j + 1) % prof;
      // orientation: test with the cap normal
      const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
      const bx = pos[b * 3], by = pos[b * 3 + 1], bz = pos[b * 3 + 2];
      const ux = ax - cx / prof, uy = ay - cy / prof, uz = az - cz / prof, vx = bx - cx / prof, vy = by - cy / prof, vz = bz - cz / prof;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * tn[0] + ny * tn[1] + nz * tn[2] >= 0) idx.push(c, a, b); else idx.push(c, b, a);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  geo.dispose();
  return g;
}

/* A smooth tapered tube through points with round end caps and analytic normals. */
KIT.tube = function (points, radius, o) {
  o = o || {};
  const closed = !!o.closed;
  const curve = new THREE.CatmullRomCurve3(points, closed, o.curve || 'centripetal', o.tension == null ? 0.5 : o.tension);
  const segs = Math.max(2, Math.round(o.segments || 48)), rad = Math.max(5, Math.round(o.radial || 14));
  const R = glFn(radius, 0.5);
  const caps = closed ? [false, false] : (o.caps || [true, true]);
  const frames = curve.computeFrenetFrames(segs, closed);
  const len = curve.getLength();
  const rings = [];   // { c: center, T, N, B, r, k: normal tilt along T (cos, sin) }
  const nRing = closed ? segs : segs + 1;
  for (let i = 0; i < nRing; i++) {
    const t = i / segs;
    const e = 1 / segs * 0.5;
    const r = R(t);
    const slope = (R(Math.min(1, t + e)) - R(Math.max(0, t - e))) / (Math.max(1e-6, (Math.min(1, t + e) - Math.max(0, t - e)) * len));
    const a = Math.atan(slope);
    rings.push({ c: curve.getPointAt(t), T: frames.tangents[i], N: frames.normals[i], B: frames.binormals[i], r: r, cs: Math.cos(a), sn: -Math.sin(a) });
  }
  const K = Math.max(3, Math.round(rad / 3));
  const all = [];
  if (caps[0]) {
    const f = rings[0];
    for (let k = K; k >= 1; k--) {
      const al = k / K * Math.PI / 2;
      all.push({ c: f.c.clone().addScaledVector(f.T, -f.r * Math.sin(al)), T: f.T, N: f.N, B: f.B, r: f.r * Math.cos(al), cs: Math.cos(al), sn: -Math.sin(al) });
    }
  }
  for (let i = 0; i < rings.length; i++) all.push(rings[i]);
  if (caps[1]) {
    const l = rings[rings.length - 1];
    for (let k = 1; k <= K; k++) {
      const al = k / K * Math.PI / 2;
      all.push({ c: l.c.clone().addScaledVector(l.T, l.r * Math.sin(al)), T: l.T, N: l.N, B: l.B, r: l.r * Math.cos(al), cs: Math.cos(al), sn: Math.sin(al) });
    }
  }
  const pos = new Float32Array(all.length * rad * 3), nor = new Float32Array(all.length * rad * 3);
  const d = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let i = 0; i < all.length; i++) {
    const g = all[i];
    for (let v = 0; v < rad; v++) {
      const an = v / rad * G_TAU, ca = Math.cos(an), sa = Math.sin(an);
      d.copy(g.N).multiplyScalar(ca).addScaledVector(g.B, sa);
      const k = (i * rad + v) * 3;
      pos[k] = g.c.x + d.x * g.r; pos[k + 1] = g.c.y + d.y * g.r; pos[k + 2] = g.c.z + d.z * g.r;
      nn.copy(d).multiplyScalar(g.cs).addScaledVector(g.T, g.sn).normalize();
      nor[k] = nn.x; nor[k + 1] = nn.y; nor[k + 2] = nn.z;
    }
  }
  const idx = [];
  const nI = closed ? all.length : all.length - 1;
  for (let i = 0; i < nI; i++) {
    const i2 = (i + 1) % all.length;
    for (let v = 0; v < rad; v++) {
      const a = i * rad + v, b = i2 * rad + v, c = i2 * rad + (v + 1) % rad, dd = i * rad + (v + 1) % rad;
      idx.push(a, dd, b, b, dd, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
};
KIT.loop = function (points, radius, o) { return KIT.tube(points, radius, Object.assign({}, o, { closed: true })); };

/* Extrude a closed 2D profile [[n, u], …] along a path. n points away from the path's centre, u along `up`. */
KIT.sweep = function (path, profile, o) {
  o = o || {};
  const closed = o.closed !== false;
  const up = (o.up || G_UP).clone().normalize();
  const n = path.length, m = profile.length;
  const centroid = new THREE.Vector3();
  path.forEach(function (p) { centroid.add(p); });
  centroid.multiplyScalar(1 / n);
  const frames = [];
  let outSign = 0;
  for (let i = 0; i < n; i++) {
    const prev = path[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], next = path[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const T = next.clone().sub(prev).normalize();
    const U = up.clone().addScaledVector(T, -T.dot(up)).normalize();
    const N = new THREE.Vector3().crossVectors(T, U).normalize();
    outSign += N.dot(path[i].clone().sub(centroid));
    frames.push({ T: T, U: U, N: N });
  }
  const sg = outSign >= 0 ? 1 : -1;
  const pos = [];
  for (let i = 0; i < n; i++) {
    const f = frames[i], p = path[i];
    for (let j = 0; j < m; j++) {
      const q = p.clone().addScaledVector(f.N, profile[j][0] * sg).addScaledVector(f.U, profile[j][1]);
      pos.push(q.x, q.y, q.z);
    }
  }
  const idx = [];
  const nI = closed ? n : n - 1;
  for (let i = 0; i < nI; i++) {
    const i2 = (i + 1) % n;
    for (let j = 0; j < m; j++) {
      const a = i * m + j, b = i2 * m + j, c = i2 * m + (j + 1) % m, d = i * m + (j + 1) % m;
      idx.push(a, d, b, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  let jo = 0;
  for (let j = 1; j < m; j++) if (profile[j][0] > profile[jo][0]) jo = j;
  return glOrient(geo, jo, frames[0].N.clone().multiplyScalar(sg));
};

const G_UNIT = {};
KIT.unit = function (name) {
  if (G_UNIT[name]) return G_UNIT[name];
  let g;
  if (name === 'bead') g = new THREE.SphereGeometry(1, 14, 10);
  else if (name === 'cylinder') g = new THREE.CylinderGeometry(1, 1, 1, 20);
  else if (name === 'torus') g = new THREE.TorusGeometry(1, 0.2, 14, 56);
  else if (name === 'link') {
    // a cable-chain link: an oval loop 2.4 long (X) and 1.4 wide (Y), wire radius 0.22, centred, lying in XY
    const pts = [];
    for (let i = 0; i < 40; i++) { const a = i / 40 * G_TAU; pts.push(new THREE.Vector3(Math.cos(a) * 0.98, Math.sin(a) * 0.48, 0)); }
    g = KIT.loop(pts, 0.22, { radial: 10, segments: 40 });
  }
  else if (name === 'link-fine') {
    // a fine cable-chain link: heavier wire for its size (2.44 x 1.64 outside, wire radius 0.32): scaled to about 1 mm
    // it reads as a fine jeweller's chain instead of large open loops of thin wire
    const pts = [];
    for (let i = 0; i < 32; i++) { const a = i / 32 * G_TAU; pts.push(new THREE.Vector3(Math.cos(a) * 0.9, Math.sin(a) * 0.5, 0)); }
    g = KIT.loop(pts, 0.32, { radial: 9, segments: 32 });
  }
  else g = new THREE.SphereGeometry(1, 28, 18);
  g.userData.shared = true;
  G_UNIT[name] = g;
  return g;
};

/* ---- 12-hull.js ---- */
/* ---- Faceting engine: a gem is the intersection of the half-spaces of its facet planes (like gem-cutting CAD).
   A big cube is clipped by every plane in turn; what is left is an exact convex polyhedron whose faces are the
   facets. That gives perfectly planar facets, real meeting points and a scalloped girdle for free. ---- */

const G_EPS = 1e-7;

/* plane through three points, oriented so that `inside` is on the negative side; returns { n, d, tag } */
function glPlane3(a, b, c, inside, tag) {
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
  let d = n.dot(a);
  if (n.dot(inside) > d) { n.negate(); d = -d; }
  return { n: n, d: d, tag: tag || '' };
}
/* plane with outward normal n through point p */
function glPlaneNP(n, p, tag) { const nn = n.clone().normalize(); return { n: nn, d: nn.dot(p), tag: tag || '' }; }

function glOrderOnPlane(pts, n) {
  if (pts.length < 3) return pts;
  const c = new THREE.Vector3();
  pts.forEach(function (p) { c.add(p); });
  c.multiplyScalar(1 / pts.length);
  const u = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0).cross(n).normalize() : new THREE.Vector3(1, 0, 0).cross(n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u);
  return pts.map(function (p) { const q = p.clone().sub(c); return { p: p, a: Math.atan2(q.dot(v), q.dot(u)) }; })
    .sort(function (x, y) { return x.a - y.a; }).map(function (x) { return x.p; });
}
function glDedupe(pts, eps) {
  const out = [];
  eps = eps || 1e-6;
  pts.forEach(function (p) { if (!out.some(function (q) { return q.distanceToSquared(p) < eps * eps; })) out.push(p); });
  return out;
}
function glPolyArea(pts, n) {
  const s = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) s.add(new THREE.Vector3().crossVectors(pts[i], pts[(i + 1) % pts.length]));
  return Math.abs(s.dot(n)) / 2;
}

function glHull(planes, bound) {
  const B = bound || 4;
  const box = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? B : -B, i & 2 ? B : -B, i & 4 ? B : -B));
  let faces = box.map(function (a) {
    const n = new THREE.Vector3(a[0], a[1], a[2]);
    const pts = corners.filter(function (c) { return Math.abs(n.dot(c) - B) < 1e-9; });
    return { n: n, d: B, tag: 'box', pts: glOrderOnPlane(pts, n) };
  });
  planes.forEach(function (pl) {
    if (faces.some(function (f) { return f.n.dot(pl.n) > 1 - 1e-9 && Math.abs(f.d - pl.d) < 1e-7; })) return;
    const out = [], cap = [];
    faces.forEach(function (f) {
      const pts = f.pts, res = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const da = pl.n.dot(a) - pl.d, db = pl.n.dot(b) - pl.d;
        if (da <= G_EPS) res.push(a);
        if (Math.abs(da) <= G_EPS) cap.push(a);
        if ((da < -G_EPS && db > G_EPS) || (da > G_EPS && db < -G_EPS)) {
          const p = a.clone().lerp(b, da / (da - db));
          res.push(p); cap.push(p);
        }
      }
      const r = glDedupe(res, 1e-7);
      if (r.length >= 3 && glPolyArea(r, f.n) > 1e-10) out.push({ n: f.n, d: f.d, tag: f.tag, pts: r });
    });
    const c = glOrderOnPlane(glDedupe(cap, 1e-7), pl.n);
    if (c.length >= 3 && glPolyArea(c, pl.n) > 1e-10) out.push({ n: pl.n, d: pl.d, tag: pl.tag, pts: c });
    faces = out;
  });
  return faces.filter(function (f) { return f.tag !== 'box'; });
}

/* Facet polygons -> flat-shaded BufferGeometry. Each facet is a fan around its centroid; the `edge` attribute is
   0 on the facet outline and 1 at the centre, so the shader can draw crisp facet junctions with fwidth(). */
function glFacetGeometry(faces) {
  const pos = [], nor = [], edge = [];
  faces.forEach(function (f) {
    const c = new THREE.Vector3();
    f.pts.forEach(function (p) { c.add(p); });
    c.multiplyScalar(1 / f.pts.length);
    for (let i = 0; i < f.pts.length; i++) {
      const a = f.pts[i], b = f.pts[(i + 1) % f.pts.length];
      pos.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z);
      for (let k = 0; k < 3; k++) nor.push(f.n.x, f.n.y, f.n.z);
      edge.push(1, 0, 0);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('edge', new THREE.Float32BufferAttribute(edge, 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/* ---- 14-cuts.js ---- */
/* ---- Gem cuts. Unit space: girdle width 1 along X, length along Z, table up +Y, origin at the girdle centre.
   Each cut is a list of facet planes (see 12-hull.js). Results are cached per cut name. ---- */

const G_CUT_CACHE = {};
const G_DEG = Math.PI / 180;

/* outline helpers: pt(az) -> {x, y} where y is the Z coordinate; az from +X toward +Z */
function glRayPoly(poly, az) {
  const dx = Math.cos(az), dz = Math.sin(az);
  let best = null;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ex = b.x - a.x, ez = b.y - a.y;
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = (a.x * ez - a.y * ex) / den;          // distance along the ray
    const u = (a.x * dz - a.y * dx) / den;          // position along the edge
    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9 && (best == null || t < best)) best = t;
  }
  return { x: dx * (best || 0.5), y: dz * (best || 0.5) };
}
function glConvex2(points) {   // Andrew's monotone chain, CCW
  const p = points.slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; });
  const cr = function (o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); };
  const lo = [], up = [];
  p.forEach(function (q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
const G_OUTLINES = {
  round: function () { return function (az) { return { x: 0.5 * Math.cos(az), y: 0.5 * Math.sin(az) }; }; },
  oval: function (L) {
    const a = 0.5, b = 0.5 * L;
    return function (az) { const c = Math.cos(az), s = Math.sin(az), r = 1 / Math.sqrt((c / a) * (c / a) + (s / b) * (s / b)); return { x: r * c, y: r * s }; };
  },
  cushion: function (L, n) {
    const a = 0.5, b = 0.5 * L;
    return function (az) { const c = Math.cos(az), s = Math.sin(az); const r = Math.pow(Math.pow(Math.abs(c / a), n) + Math.pow(Math.abs(s / b), n), -1 / n); return { x: r * c, y: r * s }; };
  },
  pear: function (L) {
    // teardrop x = sin t * sin(t/2), z = cos t (tip at t = 0), scaled to width 1 and length L, tip toward +Z
    const pts = [];
    for (let i = 0; i < 720; i++) { const t = i / 720 * G_TAU; pts.push({ x: Math.sin(t) * Math.sin(t / 2), y: Math.cos(t) }); }
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    pts.forEach(function (p) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.y); z1 = Math.max(z1, p.y); });
    const sx = 1 / (x1 - x0), sz = L / (z1 - z0), cz = (z0 + z1) / 2;
    const shift = 0.07 * L;   // facet centre sits a little toward the round end
    const poly = glConvex2(pts.map(function (p) { return { x: (p.x - (x0 + x1) / 2) * sx, y: (p.y - cz) * sz + shift }; }));
    return function (az) { return glRayPoly(poly, az); };
  }
};

/* A brilliant (58-facet layout) on any convex outline: table, 8 stars, 8 bezels, 16 upper girdle halves, girdle,
   16 lower girdle halves, 8 pavilion mains, pointed culet. */
function glBrilliantPlanes(pt, o) {
  const M = 8, step = G_TAU / M, half = step / 2;
  const gh = o.girdle / 2;
  const hc = (1 - o.table) * 0.5 * Math.tan(o.crown * G_DEG);
  const pd = 0.5 * Math.tan(o.pav * G_DEG);
  const yT = gh + hc, yC = -gh - pd;
  const P = function (az, f, y) { const q = pt(az); return new THREE.Vector3(q.x * f, y, q.y * f); };
  const O = new THREE.Vector3(0, 0, 0);
  const at = function (pl, x, z) { return (pl.d - pl.n.x * x - pl.n.z * z) / pl.n.y; };
  /* plane through A and the girdle point B (at azimuth a) that contains the outline's own tangent at B, so the
     facet supports the girdle instead of cutting into it (matters for pears, ovals and cushions) */
  const tangentPlane = function (A, B, a, tag) {
    const e = 0.0015, p0 = pt(a - e), p1 = pt(a + e);
    const t = new THREE.Vector3(p1.x - p0.x, 0, p1.y - p0.y).normalize();
    return glPlane3(A, B, B.clone().add(t), O, tag);
  };
  const planes = [{ n: new THREE.Vector3(0, 1, 0), d: yT, tag: 'table' }];
  const az = function (k) { return k * step + (o.rot || 0); };
  const bez = [], mains = [];
  for (let k = 0; k < M; k++) bez.push(tangentPlane(P(az(k), o.table, yT), P(az(k), 1, gh), az(k), 'bezel'));
  for (let k = 0; k < M; k++) mains.push(tangentPlane(new THREE.Vector3(0, yC, 0), P(az(k), 1, -gh), az(k), 'main'));
  bez.forEach(function (p) { planes.push(p); });
  mains.forEach(function (p) { planes.push(p); });
  const sf = o.table + (1 - o.table) * o.star;
  for (let k = 0; k < M; k++) {
    const k1 = (k + 1) % M, am = az(k) + half;
    const q = pt(am);
    // star apex: on the ridge between bezel k and k+1
    const sx = q.x * sf, sz = q.y * sf;
    const S = new THREE.Vector3(sx, (at(bez[k], sx, sz) + at(bez[k1], sx, sz)) / 2, sz);
    planes.push(glPlane3(P(az(k), o.table, yT), P(az(k1), o.table, yT), S, O, 'star'));
    const G0 = P(az(k), 1, gh), Gm = P(am, 1, gh), G1 = P(az(k1), 1, gh);
    planes.push(glPlane3(S, G0, Gm, O, 'upper'));
    planes.push(glPlane3(S, Gm, G1, O, 'upper'));
    const lf = 1 - o.lower, lx = q.x * lf, lz = q.y * lf;
    const Lp = new THREE.Vector3(lx, (at(mains[k], lx, lz) + at(mains[k1], lx, lz)) / 2, lz);
    const H0 = P(az(k), 1, -gh), Hm = P(am, 1, -gh), H1 = P(az(k1), 1, -gh);
    planes.push(glPlane3(H0, Hm, Lp, O, 'lower'));
    planes.push(glPlane3(Hm, H1, Lp, O, 'lower'));
  }
  glGirdlePlanes(pt, 16 * (o.gsub || 6), o.rot || 0).forEach(function (p) { planes.push(p); });
  return { planes: planes, crown: yT, pavilion: -yC, girdle: 2 * gh, table: o.table };
}

/* single cut for tiny pavé stones: table, 8 crown facets, 8 pavilion facets, 16-sided girdle */
function glSinglePlanes(pt, o) {
  const M = 8, step = G_TAU / M, half = step / 2;
  const gh = o.girdle / 2;
  const hc = (1 - o.table) * 0.5 * Math.tan(o.crown * G_DEG), pd = 0.5 * Math.tan(o.pav * G_DEG);
  const yT = gh + hc, yC = -gh - pd;
  const O = new THREE.Vector3();
  const P = function (az, f, y) { const q = pt(az); return new THREE.Vector3(q.x * f, y, q.y * f); };
  const planes = [{ n: new THREE.Vector3(0, 1, 0), d: yT, tag: 'table' }];
  for (let k = 0; k < M; k++) {
    const a0 = k * step, a1 = a0 + step, am = a0 + half;
    planes.push(glPlane3(P(a0, o.table, yT), P(a1, o.table, yT), P(am, 1, gh), O, 'bezel'));
    const H = P(am, 1, -gh), t = new THREE.Vector3(-H.z, 0, H.x).normalize();
    planes.push(glPlane3(new THREE.Vector3(0, yC, 0), H, H.clone().add(t), O, 'main'));
  }
  glGirdlePlanes(pt, 16, 0).forEach(function (p) { planes.push(p); });
  return { planes: planes, crown: yT, pavilion: -yC, girdle: 2 * gh, table: o.table };
}

function glGirdlePlanes(pt, n, rot) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = pt(rot + i / n * G_TAU), b = pt(rot + (i + 1) / n * G_TAU);
    const nx = b.y - a.y, nz = -(b.x - a.x);
    const nn = new THREE.Vector3(nx, 0, nz).normalize();
    const p = new THREE.Vector3(a.x, 0, a.y);
    if (nn.dot(p) < 0) nn.negate();
    out.push({ n: nn, d: nn.dot(p), tag: 'girdle' });
  }
  return out;
}

/* step cut (emerald cut): rectangular outline with cut corners, three rows of steps on crown and pavilion */
function glStepPlanes(poly, o) {
  const gh = o.girdle / 2;
  const planes = [];
  const sides = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    let mx = b.y - a.y, mz = -(b.x - a.x);
    const l = Math.hypot(mx, mz); mx /= l; mz /= l;
    if (mx * a.x + mz * a.y < 0) { mx = -mx; mz = -mz; }
    sides.push({ mx: mx, mz: mz, d: mx * a.x + mz * a.y });
  }
  let yTop = gh;
  sides.forEach(function (s, si) {
    let I = 0, y = gh;
    o.crownRows.forEach(function (row) {
      const sl = Math.tan(row[1] * G_DEG);
      const n = new THREE.Vector3(sl * s.mx, 1, sl * s.mz), len = n.length();
      planes.push({ n: n.multiplyScalar(1 / len), d: (y + sl * (s.d - I)) / len, tag: 'crown' });
      y += row[0] * sl; I += row[0];
    });
    if (si === 0) yTop = y;
    I = 0; y = -gh;
    o.pavRows.forEach(function (row) {
      const sl = Math.tan(row[1] * G_DEG);
      const n = new THREE.Vector3(sl * s.mx, -1, sl * s.mz), len = n.length();
      planes.push({ n: n.multiplyScalar(1 / len), d: (sl * (s.d - I) - y) / len, tag: 'pav' });
      y -= row[0] * sl; I += row[0];
    });
    planes.push({ n: new THREE.Vector3(s.mx, 0, s.mz), d: s.d, tag: 'girdle' });
  });
  planes.unshift({ n: new THREE.Vector3(0, 1, 0), d: yTop, tag: 'table' });
  return { planes: planes, crown: yTop, girdle: 2 * gh, table: 1 - 2 * o.crownRows.reduce(function (a, r) { return a + r[0]; }, 0) };
}

function glEmeraldPoly(L, c) {
  const w = 0.5, l = L / 2;
  return [
    { x: w, y: -l + c }, { x: w, y: l - c }, { x: w - c, y: l }, { x: -w + c, y: l },
    { x: -w, y: l - c }, { x: -w, y: -l + c }, { x: -w + c, y: -l }, { x: w - c, y: -l }
  ];
}

const G_CUT_DEFS = {
  round:   { length: 1,    outline: function () { return G_OUTLINES.round(); }, kind: 'brilliant', o: { table: 0.56, crown: 34.5, pav: 40.8, girdle: 0.022, star: 0.5, lower: 0.78 } },
  oval:    { length: 1.37, outline: function () { return G_OUTLINES.oval(1.37); }, kind: 'brilliant', o: { table: 0.55, crown: 34, pav: 41.2, girdle: 0.024, star: 0.5, lower: 0.8 } },
  pear:    { length: 1.55, outline: function () { return G_OUTLINES.pear(1.55); }, kind: 'brilliant', o: { table: 0.54, crown: 34, pav: 41.5, girdle: 0.024, star: 0.5, lower: 0.8 } },
  cushion: { length: 1.045, outline: function () { return G_OUTLINES.cushion(1.045, 3.4); }, kind: 'brilliant', o: { table: 0.58, crown: 35, pav: 41.8, girdle: 0.026, star: 0.52, lower: 0.76, rot: 0 } },
  emerald: { length: 1.4,  kind: 'step', o: { girdle: 0.024, crownRows: [[0.055, 42], [0.06, 32], [0.065, 21]], pavRows: [[0.09, 53], [0.1, 46], [0.6, 39]] } },
  melee:   { length: 1,    outline: function () { return G_OUTLINES.round(); }, kind: 'single', o: { table: 0.52, crown: 35, pav: 41, girdle: 0.03 } }
};

/* prong azimuths per cut (radians) */
function glProngAz(cut, n) {
  const d = function (a) { return a.map(function (x) { return x * G_DEG; }); };
  if (G_CUT_DEFS[cut] && typeof G_CUT_DEFS[cut].prongs === 'function') return G_CUT_DEFS[cut].prongs(n);
  if (cut === 'emerald') {
    const L = G_CUT_DEFS.emerald.length;
    const a = Math.atan2(L / 2 - 0.075, 0.5 - 0.075);   // middle of the cut corner
    return [a, Math.PI - a, Math.PI + a, -a];
  }
  if (cut === 'pear') return n >= 5 ? d([90, 18, 162, 228, 312]) : d([90, 205, 335]);
  if (cut === 'oval') return n >= 6 ? d([0, 58, 122, 180, 238, 302]) : d([58, 122, 238, 302]);
  if (cut === 'cushion') return d([45, 135, 225, 315]);
  if (n >= 6) return d([0, 60, 120, 180, 240, 300]);
  return d([45, 135, 225, 315]);
}

function glCut(name) {
  if (!G_CUT_DEFS[name]) name = 'round';
  if (G_CUT_CACHE[name]) return G_CUT_CACHE[name];
  const def = G_CUT_DEFS[name];
  let res, pt;
  if (def.kind === 'step') {
    const poly = Array.isArray(def.poly) ? def.poly : glEmeraldPoly(def.length, def.corner || 0.15);
    pt = function (az) { return glRayPoly(poly, az); };
    res = glStepPlanes(poly, def.o);
  } else {
    // built-in cuts give a factory (no arguments); KIT.addCut takes the outline function itself
    pt = def.outline.length >= 1 ? def.outline : def.outline();
    res = def.kind === 'single' ? glSinglePlanes(pt, def.o) : glBrilliantPlanes(pt, def.o);
  }
  const faces = glHull(res.planes, 3);
  const geo = glFacetGeometry(faces);
  geo.userData.shared = true;
  const bb = geo.boundingBox;
  // tracing planes: every facet plane, but only every few girdle planes (the girdle is a thin band)
  const girdle = faces.filter(function (f) { return f.tag === 'girdle'; });
  const keepEvery = Math.max(1, Math.round(girdle.length / 32));
  const trace = [];
  let gi = 0;
  faces.forEach(function (f) {
    if (f.tag === 'girdle') { if ((gi++) % keepEvery) return; }
    trace.push(f.n.x, f.n.y, f.n.z, f.d);
  });
  // glint candidates: centres of the crown facets that face up
  const glints = [];
  faces.forEach(function (f) {
    if (f.n.y < 0.35) return;
    if (!/table|bezel|star|upper|crown/.test(f.tag)) return;
    const c = new THREE.Vector3();
    f.pts.forEach(function (p) { c.add(p); });
    c.multiplyScalar(1 / f.pts.length);
    glints.push({ p: c, n: f.n.clone(), tag: f.tag });
  });
  /* the real girdle outline of the finished stone (the faces cut by the plane y = 0), so settings always fit it */
  const cutPts = [];
  faces.forEach(function (f) {
    for (let i = 0; i < f.pts.length; i++) {
      const a = f.pts[i], b = f.pts[(i + 1) % f.pts.length];
      if ((a.y <= 0 && b.y > 0) || (a.y > 0 && b.y <= 0)) {
        const t = a.y / (a.y - b.y);
        cutPts.push({ x: a.x + (b.x - a.x) * t, y: a.z + (b.z - a.z) * t });
      }
    }
  });
  const girdlePoly = glConvex2(cutPts);
  const outline = girdlePoly.length >= 3 ? function (az) { return glRayPoly(girdlePoly, az); } : pt;
  const crownPl = faces.filter(function (f) { return f.n.y > 0.02; });
  const pavPl = faces.filter(function (f) { return f.n.y < -0.02; });
  const cut = {
    name: name,
    geometry: geo,
    faces: faces,
    trace: new Float32Array(trace),
    planeCount: trace.length / 4,
    length: bb.max.z - bb.min.z,
    width: bb.max.x - bb.min.x,
    crown: bb.max.y,
    pavilion: -bb.min.y,
    girdle: res.girdle,
    table: res.table,
    outline: outline,
    glints: glints,
    surfaceY: function (x, z) {
      let y = 1e9;
      crownPl.forEach(function (f) { y = Math.min(y, (f.d - f.n.x * x - f.n.z * z) / f.n.y); });
      return Math.min(y, bb.max.y);
    },
    bottomY: function (x, z) {
      let y = -1e9;
      pavPl.forEach(function (f) { y = Math.max(y, (f.d - f.n.x * x - f.n.z * z) / f.n.y); });
      return Math.max(y, bb.min.y);
    }
  };
  G_CUT_CACHE[name] = cut;
  return cut;
}

/* ---- 16-materials.js ---- */
/* ---- Materials: polished metals and the faceted-gem shader ---- */

/* color: the swatch (sRGB hex, for UI); f0: the specular colour the renderer uses (linear sRGB, metalness 1), close to
   measured reflectance: 18k yellow gold about (1.00, 0.75, 0.35), so it reads as gold and not brass in every light
   (paler and greener values read as brass in the dark room's middle tones, next to the burgundy page);
   rhodium-plated white gold a bright neutral (a darker value turned it gunmetal in the dark room); env: its share of
   the room's light */
KIT.METALS = {
  yellow: { color: '#EECB8F', f0: [1.0, 0.745, 0.35], roughness: 0.15, env: 1, name: 'Yellow gold' },
  rose:   { color: '#ECBAA6', f0: [0.93, 0.545, 0.42], roughness: 0.15, env: 1, name: 'Rose gold' },
  white:  { color: '#E4E4E2', f0: [0.88, 0.875, 0.865], roughness: 0.12, env: 1.12, name: 'White gold' }
};

/* the environment every gem samples; the stage that renders sets it just before rendering */
const G_ENV = { value: null };
/* 0 in the dark room, 1 in the white one (set with G_ENV): coloured stones are toned down a little on white */
const G_ENV_LIGHT = { value: 0 };
/* v2.3: what a stone sees INSIDE itself: a dark room with a few hard-edged panels and pins (20-env.js, "gem" rooms,
   one per light, the same in both page modes). A real diamond is a mosaic of near-black and brilliant facets; the
   page's own room (pale in light mode, soft everywhere) made stones read as grey glass. A stage sets G_GEM_ON to 1
   with its own G_GEM_ENV just for its draw (glGemDraw) and back to 0 after, so any other renderer drawing a gem
   (the scenes' own stages) keeps using G_ENV as before. */
const G_GEM_ENV = { value: null };
const G_GEM_ON = { value: 0 };
function glGemDraw(tex, fn) {
  if (!tex) return fn();
  G_GEM_ENV.value = tex; G_GEM_ON.value = 1;
  try { return fn(); } finally { G_GEM_ON.value = 0; G_GEM_ENV.value = null; }
}

const G_NOISE_GLSL = `
float auHash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float auNoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(auHash(i), auHash(i + vec3(1,0,0)), f.x), mix(auHash(i + vec3(0,1,0)), auHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(auHash(i + vec3(0,0,1)), auHash(i + vec3(1,0,1)), f.x), mix(auHash(i + vec3(0,1,1)), auHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`;

function glMetalMaterial(name, opt) {
  opt = opt || {};
  const m = KIT.METALS[name] || KIT.METALS.yellow;
  const mat = new THREE.MeshPhysicalMaterial({
    color: m.f0 ? new THREE.Color().setRGB(m.f0[0], m.f0[1], m.f0[2], THREE.LinearSRGBColorSpace) : new THREE.Color(m.color),
    metalness: 1,
    roughness: opt.roughness != null ? opt.roughness : m.roughness,
    envMapIntensity: m.env || 1
  });
  if (opt.tint) mat.color.multiply(new THREE.Color(opt.tint));
  mat.name = 'au-metal-' + name;
  /* a mirror polish is never perfectly even: a faint, low-frequency variation of roughness over the surface */
  mat.onBeforeCompile = function (sh) {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vAuObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAuObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vAuObj;' + G_NOISE_GLSL)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * (0.78 + 0.44 * auNoise(vAuObj * 0.9)), 0.04, 1.0);');
  };
  mat.customProgramCacheKey = function () { return 'au-metal-v1'; };
  return mat;
}

/* ---------------- gems ---------------- */
/* edge: strength of the fine facet-edge line; gate 1 = the line only shows where the facet catches a light
   (coloured stones: their facets are drawn by absorption, dark extinction against bright windows, not by outlines);
   lightK: gain multiplier in the white room, so a coloured stone is not washed out to a pale tint */
/* v2 optics: fire = how much of the dispersed (per-channel) exit refraction is used (1 = all of it, sharp);
   contrast = how strongly the room seen INSIDE the stone is pushed toward black and white (a real diamond is a
   mosaic of near-black and bright facets, never grey glass); neutral = how much a dim, tinted room is drained of its
   colour inside the stone (a colourless stone must not turn blue by evening light; bright flames keep their colour) */
KIT.STONES = {
  diamond:  { name: 'Diamond',  ior: 2.417, rgb: [2.407, 2.417, 2.451], absorb: [0.0, 0.0, 0.0],   gain: 1.0,  edge: 0.09, gate: 0, lightK: 1,    edgeTint: [1, 1, 1],          body: [0, 0, 0],           surf: 1.0, fire: 1.0, contrast: 1.0, neutral: 1.0 },
  ruby:     { name: 'Ruby',     ior: 1.77,  rgb: [1.760, 1.770, 1.790], absorb: [0.3, 3.8, 2.8],   gain: 1.3,  edge: 0.045, gate: 1, lightK: 0.92, edgeTint: [1.0, 0.36, 0.36], body: [0.12, 0.0, 0.008],  surf: 1.0, fire: 0.4, contrast: 0.35, neutral: 0 },
  // v2.5 one emerald for the whole house (the gem lab's, 62-labgem.js: its absorption times its 1.5 path): a bluish
  // grass green toward #0F7A4A. Red is absorbed hard, blue about a third as hard as red and three times as hard as
  // green (v2.4's weak blue absorption and teal body glow made small pears read as mint glass or paraiba). Little body
  // glow, so the colour comes from the light inside the stone and a pear deepens towards its point.
  emerald:  { name: 'Emerald',  ior: 1.58,  rgb: [1.572, 1.580, 1.591], absorb: [2.0, 0.27, 0.6], gain: 1.1, edge: 0.04, gate: 1, lightK: 0.9, edgeTint: [0.28, 0.8, 0.55], body: [0.0, 0.016, 0.009], surf: 1.0, fire: 0.4, contrast: 0.12, neutral: 0 },
  sapphire: { name: 'Sapphire', ior: 1.77,  rgb: [1.760, 1.770, 1.790], absorb: [1.9, 1.15, 0.06], gain: 1.15, edge: 0.045, gate: 1, lightK: 0.92, edgeTint: [0.5, 0.65, 1.0],  body: [0.0, 0.012, 0.13], surf: 1.0, fire: 0.4, contrast: 0.35, neutral: 0 }
};

const G_MAX_PLANES = 112;

const G_GEM_VERT = `
attribute float edge;
varying vec3 vPos;
varying vec3 vCam;
varying vec3 vNor;
varying float vEdge;
varying float vScale;
varying vec3 vR0;
varying vec3 vR1;
varying vec3 vR2;
void main() {
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
    m = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = m * vec4(position, 1.0);
  float s = length(m[0].xyz);
  vScale = s;
  vR0 = m[0].xyz / s; vR1 = m[1].xyz / s; vR2 = m[2].xyz / s;
  mat3 R = mat3(vR0, vR1, vR2);
  vCam = (transpose(R) * (cameraPosition - m[3].xyz)) / s;
  vPos = position;
  vNor = normal;
  vEdge = edge;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const G_GEM_FRAG = `
uniform sampler2D envMap;
uniform sampler2D gemMap;
uniform float uGemOn;
uniform vec4 planes[${G_MAX_PLANES}];
uniform int uCount;
uniform int uBounces;
uniform vec3 uAbsorb;
uniform float uIor;
uniform vec3 uIorRGB;
uniform float uGain;
uniform float uEdge;
uniform float uEdgeGate;
uniform float uLightK;
uniform float uEnvLight;
uniform vec3 uEdgeTint;
uniform vec3 uBody;
uniform float uSurf;
uniform float uOpacity;
uniform float uExpo;
uniform float uFire;
uniform float uContrast;
uniform float uNeutral;
varying vec3 vPos;
varying vec3 vCam;
varying vec3 vNor;
varying float vEdge;
varying float vScale;
varying vec3 vR0;
varying vec3 vR1;
varying vec3 vR2;
#include <common>
#include <cube_uv_reflection_fragment>

mat3 Rm;
vec3 envL(vec3 d, float rough) { return textureCubeUV(envMap, normalize(Rm * d), rough).rgb; }
float lumOf(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
/* the room as seen through the stone.
   v2.4, with the stage's gem room (one bright jeweller's lightbox, the same in every light: 20-env.js): a gentle
   contrast (the mid-grey ground sinks a little, never to black; the dark port and cards stay dark; lights keep their
   strength). Without it (the scenes' own stages: the page room): v2.3's stronger curve. Colourless stones: a dim tinted
   ambience drained to grey. */
vec3 envIn(vec3 d, float rough) {
  vec3 c;
  float k;
  if (uGemOn > 0.5) {
    c = textureCubeUV(gemMap, normalize(Rm * d), rough).rgb;
    float l = lumOf(c);
    k = mix(1.0, 0.5 + 0.5 * smoothstep(0.05, 0.9, l), uContrast);
  } else {
    c = envL(d, rough);
    float l = lumOf(c);
    k = mix(1.0, smoothstep(0.02, 0.5, l) * (0.55 + 0.45 * smoothstep(0.0, 1.0, l)), uContrast);
  }
  float l = lumOf(c);
  c *= k;
  float sat = mix(1.0, mix(0.15, 1.0, smoothstep(1.5, 8.0, l)), uNeutral);
  return mix(vec3(l * k), c, sat);
}
/* a highlight shoulder: what a facet returns above about 0.6 is compressed logarithmically before the page's tone
   mapping, so brilliant facets keep their differences (a table of lights reads as a pattern, never as one flat white
   disc); the colour of a flash (fire) is kept */
vec3 gemShoulder(vec3 c) {
  float l = lumOf(c);
  if (l <= 0.6) return c;
  float s = 0.6 + 0.3 * log2(l / 0.6);
  return c * (s / l);
}
float fres(float ci, float n1, float n2) {
  float eta = n1 / n2;
  float st2 = eta * eta * max(0.0, 1.0 - ci * ci);
  if (st2 >= 1.0) return 1.0;
  float ct = sqrt(1.0 - st2);
  float rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct);
  float rp = (n2 * ci - n1 * ct) / (n2 * ci + n1 * ct);
  return 0.5 * (rs * rs + rp * rp);
}
void main() {
  Rm = mat3(normalize(vR0), normalize(vR1), normalize(vR2));
  vec3 N = normalize(vNor);
  vec3 V = normalize(vPos - vCam);
  float ci = clamp(-dot(V, N), 0.0, 1.0);
  float F = fres(ci, 1.0, uIor);
  float gain = uGain * mix(1.0, uLightK, uEnvLight);
  // the light of the room the piece is shown in (studio, daylight, candle, evening): only its colour, never its
  // brightness, and only a hint of it inside the stone, so a stone is equally brilliant in every light
  vec3 tint = vec3(1.0);
  if (uGemOn > 0.5) {
    vec3 amb = envL(vec3(0.0, 0.6, 0.8), 1.0) + envL(vec3(0.0, 1.0, 0.0), 1.0) + envL(vec3(0.0, 0.0, 1.0), 1.0);
    vec3 t = amb / max(lumOf(amb), 1e-4);
    tint = clamp(t, vec3(0.55), vec3(1.6));
  }
  vec3 tintOut = mix(vec3(1.0), tint, 0.65), tintIn = mix(vec3(1.0), tint, 0.22);
  tintOut /= max(lumOf(tintOut), 1e-3); tintIn /= max(lumOf(tintIn), 1e-3);
  // the facet's mirror reflection: of the gem room too (crisp panels; the page's soft room laid a grey veil over the
  // whole crown, worst under the loupe), tinted by the light
  vec3 rd = reflect(V, N);
  vec3 refl = uGemOn > 0.5 ? textureCubeUV(gemMap, normalize(Rm * rd), 0.0).rgb * tintOut : envL(rd, 0.0);
  vec3 col = refl * F * uSurf;
  vec3 T = refract(V, N, 1.0 / uIor);
  vec3 P = vPos;
  vec3 thr = vec3(1.0 - F);
  float travelled = 0.0;
  for (int b = 0; b < 8; b++) {
    if (b >= uBounces) break;
    float tMin = 100.0;
    vec3 Nh = vec3(0.0, 1.0, 0.0);
    for (int i = 0; i < ${G_MAX_PLANES}; i++) {
      if (i >= uCount) break;
      vec4 pl = planes[i];
      float dn = dot(pl.xyz, T);
      if (dn > 1e-5) {
        float t = (pl.w - dot(pl.xyz, P)) / dn;
        if (t < tMin) { tMin = t; Nh = pl.xyz; }
      }
    }
    tMin = clamp(tMin, 0.0, 3.0);
    P += T * tMin;
    travelled += tMin;
    thr *= exp(-uAbsorb * (tMin * vScale));
    float c = clamp(dot(T, Nh), 0.0, 1.0);
    float Fe = fres(c, uIor, 1.0);
    if (Fe < 0.999) {
      vec3 tg = refract(T, -Nh, uIor);
      vec3 tr = refract(T, -Nh, uIorRGB.r);
      vec3 tb = refract(T, -Nh, uIorRGB.b);
      if (dot(tr, tr) < 0.5) tr = tg;
      if (dot(tb, tb) < 0.5) tb = tg;
      // fire: the exit refraction split per channel (red and blue leave at their own angles); uFire mixes it with
      // the achromatic ray. Diamonds use all of it, sharp, so softboxes and pins break into crisp coloured flashes.
      vec3 a = envIn(tg, 0.0);
      float fr = mix(0.05, 0.0, step(0.9, uFire));
      vec3 e = mix(a, vec3(envIn(tr, fr).r, a.g, envIn(tb, fr).b), uFire);
      // v2.5 fire is a tint on light, never a neon facet: where the red, green and blue rays of one flat facet land on
      // different panels (one on a lamp, one on a dark card) the split read as a flat lime or orange quad. The colour the
      // dispersion adds is capped to a share of the light's own brightness (beyond what the room's own colour already
      // has), so a flash stays a pale prismatic tint of white
      float le = lumOf(e), la = lumOf(a);
      vec3 ce = e - vec3(le);
      float cl = length(ce);
      float lim = le * max(length(a - vec3(la)) / max(la, 1e-3), 0.24);
      e = vec3(le) + ce * min(1.0, lim / max(cl, 1e-5));
      col += thr * (1.0 - Fe) * e * gain * tintIn;
      thr *= Fe;
    }
    T = reflect(T, Nh);
  }
  // what is left after the last bounce: a soft sample of the room (kept small for a crisp stone: it reads as haze)
  col += thr * envIn(T, 0.45) * gain * mix(0.6, 0.3, uContrast) * tintIn;
  col += uBody * envL(N, 0.9) * (1.0 - F);
  float ew = vEdge / max(fwidth(vEdge), 1e-6);
  float lit = mix(0.4 + 0.6 * dot(envL(N, 0.6), vec3(0.333)), 1.6 * smoothstep(0.35, 1.6, dot(refl, vec3(0.3, 0.55, 0.15))), uEdgeGate);
  col += (1.0 - smoothstep(0.0, 1.25, ew)) * uEdge * uEdgeTint * lit;
  if (uGemOn > 0.5) col = gemShoulder(col);
  gl_FragColor = vec4(col * uExpo, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function glCubeUVDefines(cubeSize) {
  const h = 4 * cubeSize, maxMip = Math.log2(h) - 2;
  return {
    ENVMAP_TYPE_CUBE_UV: '',
    CUBEUV_TEXEL_WIDTH: (1 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16))).toFixed(10),
    CUBEUV_TEXEL_HEIGHT: (1 / h).toFixed(10),
    CUBEUV_MAX_MIP: maxMip.toFixed(1)
  };
}

function glGemMaterial(cut, stone, opt) {
  opt = opt || {};
  const st = KIT.STONES[stone] || KIT.STONES.diamond;
  // a stone may bring its own material (pearl lustre, opal play of colour: gl-scenes-a)
  if (typeof st.material === 'function') {
    try { const m = st.material(cut, opt, stone); if (m) { m.userData.stone = stone; return m; } }
    catch (e) { console.error('[Aurelia GL] stone material failed for', stone, e); }
  }
  const pl = new Float32Array(G_MAX_PLANES * 4);
  pl.set(cut.trace.subarray(0, Math.min(cut.trace.length, G_MAX_PLANES * 4)));
  // step cuts (emerald) have long flat facets: half the colour spread keeps their fire in small flashes
  const spread = cut.name === 'emerald' ? 0.5 : (cut.name === 'cushion' ? 0.75 : 1);
  const rgb = st.rgb.map(function (v) { return st.ior + (v - st.ior) * spread; });
  // the quality tier caps the light paths traced inside the stone (phones trace fewer)
  const cap = cut.name === 'melee' ? G_TIER.melee : G_TIER.bounces;
  const mat = new THREE.ShaderMaterial({
    name: 'au-gem-' + stone,
    vertexShader: G_GEM_VERT,
    fragmentShader: G_GEM_FRAG,
    defines: glCubeUVDefines(G_TIER.env),
    uniforms: {
      envMap: G_ENV,
      gemMap: G_GEM_ENV,
      uGemOn: G_GEM_ON,
      planes: { value: pl },
      uCount: { value: Math.min(cut.planeCount, G_MAX_PLANES) },
      uBounces: { value: Math.min(cap, opt.bounces || cap) },
      uAbsorb: { value: new THREE.Vector3().fromArray(st.absorb) },
      uIor: { value: st.ior },
      uIorRGB: { value: new THREE.Vector3().fromArray(rgb) },
      uGain: { value: st.gain },
      uEdge: { value: st.edge },
      uEdgeGate: { value: st.gate || 0 },
      uLightK: { value: st.lightK == null ? 1 : st.lightK },
      uEnvLight: G_ENV_LIGHT,
      uEdgeTint: { value: new THREE.Vector3().fromArray(st.edgeTint) },
      uBody: { value: new THREE.Vector3().fromArray(st.body) },
      uSurf: { value: st.surf },
      uOpacity: { value: 1 },
      uExpo: { value: 1 },
      uFire: { value: st.fire == null ? 0.4 : st.fire },
      uContrast: { value: st.contrast == null ? 0 : st.contrast },
      uNeutral: { value: st.neutral == null ? 0 : st.neutral }
    }
  });
  mat.userData.stone = stone;
  return mat;
}

/* ---- 18-build.js ---- */
/* ---- Building a piece: the build context handed to every builder, gems, instancing, disposal ---- */

const G_VIEW_DEFAULTS = {
  ring:     { tilt: 0.52, still: { tilt: 0.34, turn: -0.62 }, spinTilt: 0.34 },
  bracelet: { tilt: 0.35, still: { tilt: 0.3, turn: -0.5 }, spinTilt: 0.3 },
  earrings: { tilt: 0.12, still: { tilt: 0.1, turn: -0.35 }, spinTilt: 0.1 },
  pendant:  { tilt: 0.12, still: { tilt: 0.1, turn: -0.35 }, spinTilt: 0.1 }
};

function glCtx(spec, opts) {
  const mats = new Map();
  const tracked = [];
  const glints = [];
  const ctx = {
    spec: spec,
    detail: opts.detail || 'hero',
    lod: opts.lod || 1,
    THREE: THREE,
    KIT: KIT,

    metal: function (name, o) {
      name = name || spec.metal;
      const key = name + '|' + JSON.stringify(o || {});
      if (!mats.has(key)) { const m = glMetalMaterial(name, o); mats.set(key, m); tracked.push(m); }
      return mats.get(key);
    },

    gem: function (o) {
      o = o || {};
      const cutName = G_CUT_DEFS[o.cut] ? o.cut : (G_CUT_DEFS[spec.cut] ? spec.cut : 'round');
      const stone = KIT.STONES[o.stone] ? o.stone : (spec.stone || 'diamond');
      // a stone that is not faceted (a pearl) builds its own mesh and reports its proportions (see 10-kit.js)
      const sd = KIT.STONES[stone];
      if (sd && typeof sd.mesh === 'function') {
        try {
          const info = sd.mesh(ctx, Object.assign({}, o, { stone: stone, cut: cutName }));
          if (info && info.mesh) {
            info.mesh.traverse(function (x) { if (x.material) tracked.push(x.material); });
            if (!info.prongs) info.prongs = function (n) { return glProngAz('round', n); };
            if (!info.cut) info.cut = cutName;
            if (!info.stone) info.stone = stone;
            return info;
          }
        } catch (e) { console.error('[Aurelia GL] stone mesh failed for', stone, e); }
      }
      const cut = glCut(cutName);
      const W = o.width || KIT.size(cutName, o.carat != null ? o.carat : spec.carat).width;
      const mat = glGemMaterial(cut, stone, o);
      tracked.push(mat);
      const mesh = new THREE.Mesh(cut.geometry, mat);
      mesh.scale.setScalar(W);
      mesh.name = 'gem-' + cutName + '-' + stone;
      if (o.glints !== false) {
        cut.glints.forEach(function (g) {
          if (g.tag === 'table' || g.tag === 'bezel' || g.tag === 'star' || g.tag === 'crown') glints.push({ obj: mesh, inst: -1, p: g.p, n: g.n, size: W * 0.8, stone: stone });
        });
      }
      return glGemInfo(cut, cutName, stone, W, mesh);
    },

    gems: function (o) {
      o = o || {};
      const cutName = o.cut && G_CUT_DEFS[o.cut] ? o.cut : 'melee';
      const stone = KIT.STONES[o.stone] ? o.stone : 'diamond';
      const cut = glCut(cutName);
      const list = o.matrices || [];
      const mat = glGemMaterial(cut, stone, o);
      tracked.push(mat);
      const im = new THREE.InstancedMesh(cut.geometry, mat, Math.max(1, list.length));
      const sc = new THREE.Matrix4();
      list.forEach(function (m, i) {
        const w = Array.isArray(o.width) ? o.width[i] : (o.width || 1.2);
        sc.makeScale(w, w, w);
        im.setMatrixAt(i, m.clone().multiply(sc));
        if (o.glints !== false) glints.push({ obj: im, inst: i, p: new THREE.Vector3(0, cut.crown, 0), n: new THREE.Vector3(0, 1, 0), size: w * 1.6, stone: stone });
      });
      im.count = list.length;
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingBox(); im.computeBoundingSphere();
      im.name = 'gems-' + stone;
      return im;
    },

    beads: function (list, radius, material) {
      const ms = (list || []).map(function (x) { return x.isMatrix4 ? x : KIT.m4(x, null, radius || 0.25); });
      return ctx.instanced(KIT.unit('bead'), material || ctx.metal(), ms);
    },

    instanced: function (geometry, material, matrices) {
      const im = new THREE.InstancedMesh(geometry, material || ctx.metal(), Math.max(1, matrices.length));
      matrices.forEach(function (m, i) { im.setMatrixAt(i, m); });
      im.count = matrices.length;
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingBox(); im.computeBoundingSphere();
      return im;
    },

    mesh: function (geometry, material) { return new THREE.Mesh(geometry, material || ctx.metal()); },

    setting: function (gem, o) { return glSetting(ctx, gem, o || {}); },

    glint: function (obj, p, n, size, inst) {
      glints.push({ obj: obj, inst: inst == null ? -1 : inst, p: p.clone(), n: n.clone().normalize(), size: size || 2 });
    },

    track: function (x) { if (x) tracked.push(x); return x; },

    _glints: glints,
    _dispose: function (root) {
      if (root) root.traverse(function (o) {
        if (o.geometry && !(o.geometry.userData && o.geometry.userData.shared)) o.geometry.dispose();
        if (o.isInstancedMesh && o.dispose) o.dispose();
      });
      tracked.forEach(function (t) { try { t.dispose(); } catch (e) { /* ignore */ } });
      tracked.length = 0;
    }
  };
  return ctx;
}

function glGemInfo(cut, cutName, stone, W, mesh) {
  return {
    mesh: mesh,
    cut: cutName,
    stone: stone,
    width: W,
    length: cut.length * W,
    crown: cut.crown * W,
    table: cut.crown * W,
    pavilion: cut.pavilion * W,
    girdle: cut.girdle * W,
    tableWidth: cut.table * W,
    outline: function (az) { const q = cut.outline(az); return new THREE.Vector2(q.x * W, q.y * W); },
    surfaceY: function (x, z) { return cut.surfaceY(x / W, z / W) * W; },
    bottomY: function (x, z) { return cut.bottomY(x / W, z / W) * W; },
    prongs: function (n) { return glProngAz(cutName, n); }
  };
}

/* Build a piece from a spec. Never throws: a missing or failing builder gives a plain band.
   v2.5: a builder may be a GENERATOR function (function* (spec, ctx)): each `yield` marks a point where the work can
   pause until the next idle slice (the live stages build in glIdle steps of at most G_SLICE ms: a bangle's two sweeps,
   a ring's band, head and inscription each in a step of their own). glBuildSteps is that build as a generator;
   glBuildPiece runs it through at once (stills, the prerender tool, the scenes). */
let G_BUILD_ERR = 0;
function glIsIter(r) { return !!r && !r.isObject3D && typeof r.next === 'function' && typeof r[Symbol.iterator] === 'function'; }
function glBuildPiece(rawSpec, opts) {
  const it = glBuildSteps(rawSpec, opts);
  for (;;) { const s = it.next(); if (s.done) return s.value; }
}
function* glBuildSteps(rawSpec, opts) {
  opts = opts || {};
  const spec = KIT.spec(rawSpec);
  if (opts.withEngraving === false) spec.engraving = '';
  let ctx = glCtx(spec, opts);
  let res = null;
  // a real model (idea 7), when the spec names one and it has loaded; anything wrong falls back to the procedural build
  if (spec.model && typeof glModelGet === 'function') {
    const gltf = glModelGet(spec.model);
    if (gltf) {
      try { res = glModelPiece(spec, ctx, gltf); }
      catch (e) {
        console.error('[Aurelia GL] model failed, building it instead:', spec.model, e);
        ctx._dispose(null); ctx = glCtx(spec, opts); res = null;
      }
    }
  }
  const b = res ? null : KIT.builderFor(spec);
  if (b) {
    try {
      res = b(spec, ctx);
      if (glIsIter(res)) res = yield* res;
    }
    catch (e) {
      if (G_BUILD_ERR++ < 3) console.error('[Aurelia GL] builder failed for', spec.type + '/' + spec.style, e);
      ctx._dispose(null);
      ctx = glCtx(spec, opts);
      res = null;
    }
  }
  if (!res || !(res.isObject3D || (res.object && res.object.isObject3D))) res = glPlaceholder(spec, ctx);
  const object = res.isObject3D ? res : res.object;
  const vd = G_VIEW_DEFAULTS[spec.type] || G_VIEW_DEFAULTS.ring;
  const rv = res.isObject3D ? {} : (res.view || {});
  const view = {
    tilt: rv.tilt != null ? rv.tilt : vd.tilt,
    still: Object.assign({}, vd.still, rv.still || {}),
    spinTilt: rv.spinTilt != null ? rv.spinTilt : vd.spinTilt,
    focus: rv.focus && rv.focus.isVector3 ? rv.focus.clone() : null,
    // rock: amplitude (radians) of a slow sway about the still's turn instead of a full turntable (earrings: the
    //       backs never come round to the camera); pivot: the point the piece turns about (default: its centre);
    // frame: a Box3 in the piece frame: stills and the studio frame only what lies inside it (a pendant is shown
    //       with the lower chain, the arms running out of the top of the picture); front: the studio opens facing +Z
    rock: rv.rock > 0 ? rv.rock : 0,
    pivot: rv.pivot && rv.pivot.isVector3 ? rv.pivot.clone() : null,
    frame: rv.frame && rv.frame.isBox3 ? rv.frame.clone() : null,
    // frameExtra: points (piece frame) the framing must also include, e.g. where a head would be on a plain band
    frameExtra: Array.isArray(rv.frameExtra) ? rv.frameExtra.filter(function (p) { return p && p.isVector3; }) : [],
    front: !!rv.front
  };
  object.updateMatrixWorld(true);
  return { spec: spec, object: object, view: view, glints: ctx._glints, dispose: function () { ctx._dispose(object); } };
}

/* the tasteful fallback while a type has no builder yet: a softly domed band, laid like a ring */
function glPlaceholder(spec, ctx) {
  const g = new THREE.Group();
  g.add(ctx.mesh(KIT.band({ inner: KIT.ringInner(6), width: 2.6, thick: 1.7, dome: 2.1, comfort: 2.6 }), ctx.metal(spec.metal)));
  return { object: g, view: G_VIEW_DEFAULTS.ring };
}

/* tight bounding sphere of everything under `root` (in root's parent frame after updateMatrixWorld) */
function glMeasure(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const pts = [];
  const v = new THREE.Vector3(), m = new THREE.Matrix4();
  root.traverse(function (o) {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    if (o.userData.noFrame) return;             // parts that must not decide the framing (ear posts behind a stud)
    const pos = o.geometry.attributes.position;
    const stepN = Math.max(1, Math.floor(pos.count / 1500));
    if (o.isInstancedMesh) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const bs = o.geometry.boundingSphere;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        m.premultiply(o.matrixWorld);
        const c = bs.center.clone().applyMatrix4(m);
        const r = bs.radius * m.getMaxScaleOnAxis();
        // six extreme points of the instance sphere
        [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (d) {
          const p = new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(r).add(c);
          pts.push(p); box.expandByPoint(p);
        });
      }
    } else {
      for (let i = 0; i < pos.count; i += stepN) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        pts.push(v.clone()); box.expandByPoint(v);
      }
    }
  });
  if (box.isEmpty()) return { center: new THREE.Vector3(), radius: 10, box: new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10)), points: [] };
  const center = box.getCenter(new THREE.Vector3());
  let r = 0;
  pts.forEach(function (p) { r = Math.max(r, p.distanceTo(center)); });
  // v2.4: framing, floors and shadows walk these points many times when a piece is mounted (a halo's pavé gave over
  // ten thousand, a 10 ms mount inside a swap frame): at most about 2400 are kept, always with the extreme ones
  let keep = pts;
  if (pts.length > 2600) {
    const ext = new Set();
    ['x', 'y', 'z'].forEach(function (a) {
      let lo = 0, hi = 0;
      for (let i = 1; i < pts.length; i++) { if (pts[i][a] < pts[lo][a]) lo = i; if (pts[i][a] > pts[hi][a]) hi = i; }
      ext.add(lo); ext.add(hi);
    });
    let far = 0;
    for (let i = 1; i < pts.length; i++) if (pts[i].distanceToSquared(center) > pts[far].distanceToSquared(center)) far = i;
    ext.add(far);
    const step = pts.length / 2400;
    keep = [];
    for (let f = 0; f < pts.length; f += step) keep.push(pts[Math.floor(f)]);
    ext.forEach(function (i) { keep.push(pts[i]); });
  }
  return { center: center, radius: r * 1.01, box: box, points: keep };
}

/* ---- 20-env.js ---- */
/* ---- Lighting: four rooms the piece can be seen in (idea 5), each rendered once per renderer and mode into a PMREM
   environment. Strong highlights next to dark reflections are what make polished metal and faceted stones read as
   real. Camera is at +Z.
     studio    the jeweller's lightbox: large softboxes, long strips, pin lamps and black flags (v1's room)
     daylight  a tall window with mullions, a low sun and a pale sky: airy, cool, soft shadow
     candle    a dark room lit by a few flames on the table: warm, deep, every facet a small flame
     evening   dusk outside, a warm lamp inside, city lights far off: cool ambience with warm accents
   Environments are made in idle slices (glEnvAsync): the shaders PMREM needs are compiled asynchronously first, so a
   new stage never blocks the page while its lighting is prepared. ---- */

/* the brightest light directions of the studio (world space), used to decide where glints flare */
const G_KEY_DIRS = [
  new THREE.Vector3(-0.55, 0.62, 0.56).normalize(),   // key softbox, upper left front
  new THREE.Vector3(0.92, 0.16, 0.36).normalize(),    // tall strip, right
  new THREE.Vector3(0.06, 1, 0.18).normalize()        // overhead
];
const glV = function (x, y, z) { return new THREE.Vector3(x, y, z).normalize(); };

let G_SOFT_TEX = null, G_ROUND_TEX = null, G_HARD_TEX = null, G_HARDR_TEX = null;
function glMaskTexture(round, hard) {
  const n = 128, data = new Uint8Array(n * n * 4);
  const ew = hard ? 0.035 : 0.16;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = (x + 0.5) / n, v = (y + 0.5) / n;
      let a;
      if (round) {
        const r = Math.hypot(u - 0.5, v - 0.5) * 2;
        a = 1 - THREE.MathUtils.smoothstep(r, hard ? 0.86 : 0.55, 1.0);
        a *= 0.82 + 0.18 * (1 - r * r);
      } else {
        const e = function (t) { return THREE.MathUtils.smoothstep(t, 0, ew) * THREE.MathUtils.smoothstep(1 - t, 0, ew); };
        const r2 = (u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5);
        a = e(u) * e(v) * (0.78 + 0.22 * (1 - r2 * 3));
      }
      const k = (y * n + x) * 4;
      data[k] = data[k + 1] = data[k + 2] = Math.round(Math.max(0, Math.min(1, a)) * 255);
      data[k + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

/* ---------------- the rooms ---------------- */
const G_WARM = [1.0, 0.97, 0.92], G_NEUTRAL = [1.0, 0.99, 0.98], G_COOL = [0.94, 0.97, 1.0];
const G_LIGHTS = {
  studio: {
    exposure: { dark: 1.0, light: 1.0 }, envLight: { dark: 0, light: 1 }, shadow: { core: 1, soft: 1 },
    keys: G_KEY_DIRS,
    build: function (L) {
      const light = L.light;
      // light mode: a darker, faintly burgundy-grey horizon. On the pale page a pale room left white gold and diamonds
      // with nothing dark to reflect: they dissolved into the page. Their edges now pick up this band.
      L.room(light ? [0.5, 0.49, 0.48] : [0.34, 0.322, 0.3], light ? [0.085, 0.07, 0.07] : [0.1, 0.086, 0.076],
        // dark: a warm-neutral bounce from below (the page gradient around the piece supplies the burgundy). Grey
        // middle tones turned yellow gold olive next to the burgundy page; a faint warmth keeps them amber.
        light ? [0.4, 0.385, 0.38] : [0.16, 0.13, 0.11]);
      if (light) {                                               // burgundy-grey cards at the horizon, both sides
        L.flag([-0.96, 0.02, -0.28], 30, 16, 6, 0.03);
        L.flag([0.98, -0.02, 0.2], 30, 14, 5, 0.035);
        L.flag([0.3, 0.0, -0.95], 30, 18, 5, 0.03);
      }
      // black flags: they cut dark bands into the lit room so polished metal keeps its contrast
      const fk = light ? 1 : 0.5;
      L.flag([-0.8, -0.04, 0.6], 30, 7.5, 44, 0.018 * fk);       // tall flag, front left
      L.flag([0.74, 0.02, -0.67], 30, 9, 44, 0.02 * fk);         // tall flag, back right
      L.flag([0.0, -0.28, -1], 30, 34, 9, 0.05 * fk);            // low band behind
      L.flag([0.62, -0.52, 0.58], 30, 12, 9, 0.035 * fk);        // low front right
      L.flag([0.03, 0.06, 1], 32, 7, 9, 0.03 * fk);              // the camera port
      if (light) {                                               // on white, diamonds need dark cards near the viewer
        L.flag([-0.28, 0.42, 0.86], 32, 8, 5, 0.02);
        L.flag([0.36, 0.3, 0.88], 32, 6, 7, 0.02);
        L.flag([-0.05, 0.75, 0.66], 32, 10, 3.5, 0.03);
      }
      L.add([0.0, 0.8, -0.35], 30, 46, 30, light ? 0.5 : 0.42, G_NEUTRAL, true); // broad dome glow above and behind
      L.add([-0.55, 0.62, 0.56], 24, 16, 11, 7.0, G_WARM);                  // key softbox
      L.add([0.06, 1, 0.18], 24, 17, 17, light ? 3.4 : 3.0, G_NEUTRAL);     // overhead
      L.add([0.92, 0.16, 0.36], 24, 3.4, 26, 5.5, G_NEUTRAL);               // right strip (tall)
      L.add([-0.9, 0.18, -0.42], 24, 3.0, 26, 4.4, G_COOL);                 // left-back strip
      L.add([0.22, 0.45, -0.86], 24, 22, 3.6, 4.0, G_NEUTRAL);              // back rim strip (wide)
      L.add([-0.42, 0.06, 1], 26, 9, 9, light ? 1.6 : 1.3, G_WARM);         // front fill cards, either side
      L.add([0.46, 0.04, 1], 26, 9, 9, light ? 1.6 : 1.3, G_NEUTRAL);       //   of the camera port
      L.add([0.1, -0.42, 1], 24, 20, 4, light ? 2.0 : 1.6, G_WARM);         // low front bounce card
      L.add([0.0, -1, 0.05], 22, 26, 26, light ? 0.55 : 0.28, light ? [1, 0.97, 0.95] : [0.55, 0.47, 0.43], true); // floor glow
      /* pin lamps: tiny, very bright sources scattered over the upper sphere: these make the stones scintillate */
      L.pins({ n: 46, seed: 7, el: [0.05, 1.3], size: [0.7, 1.6], I: [22, 52], colors: [G_WARM, G_COOL], port: true });
    }
  },
  daylight: {
    exposure: { dark: 0.92, light: 0.98 }, envLight: { dark: 0.55, light: 1 }, shadow: { core: 0.8, soft: 1.15 },
    keys: [glV(-0.72, 0.34, 0.6), glV(-0.42, 0.72, 0.52), glV(0.86, 0.12, 0.45)],
    // neutral white daylight (about 6000 K). The room, sky and window are kept near-neutral: a blue cast here
    // multiplied into yellow gold and turned it olive / khaki. Daylight differs from the studio by its shapes (a
    // window with mullions, a low sun, a soft sky), not by a tint.
    // v2.3: the room itself is kept fairly dark, so the metal has dark reflections to set its bright ones against: a
    // bright grey room all round made yellow gold flat and khaki and diamonds milky. The light comes from shapes.
    // v2.4: brighter (a dark room left most of the band reflecting near-black, which reads khaki on yellow gold) and
    // white-balanced to a neutral daylight (glRoomBalance); a window AND a lamp, so there is contrast
    balance: { chroma: [1, 0.975, 0.93], lum: { dark: 0.66, light: 0.7 } },
    build: function (L) {
      const lt = L.light;
      L.room(lt ? [0.36, 0.36, 0.365] : [0.3, 0.3, 0.305], lt ? [0.15, 0.145, 0.142] : [0.12, 0.118, 0.115], lt ? [0.26, 0.25, 0.245] : [0.2, 0.192, 0.185]);
      if (lt) {                                                  // burgundy-grey cards at the horizon (see studio)
        L.flag([-0.96, 0.02, -0.28], 30, 30, 6, 0.03);
        L.flag([0.98, -0.02, 0.2], 30, 14, 5, 0.035);
      }
      // a few dark accents keep the metal's form
      L.flag([0.0, -0.3, -1], 30, 34, 8, 0.03);
      L.flag([0.78, 0.02, -0.62], 30, 8, 40, 0.025);
      L.flag([0.03, 0.06, 1], 32, 7, 9, 0.03);
      L.flag([0.66, -0.5, 0.56], 30, 12, 8, 0.03);
      L.flag([-0.75, -0.12, 0.62], 30, 22, 6, 0.03);                                         // the sill under the window
      // the window: a tall neutral-white pane up front left, crossed by mullions (they draw fine dark lines in the metal)
      const win = [-0.72, 0.34, 0.6];
      L.add(win, 24, 20, 17, 6.0, [1.0, 0.99, 0.975]);
      L.bar(win, 23.4, 0.7, 17.5, 0.03, 0);
      L.bar(win, 23.4, 20.5, 0.6, 0.03, 0);
      L.add([-0.42, 0.72, 0.52], 26, 1.3, 1.3, 90, [1.0, 0.97, 0.92], true);                 // the sun
      L.add([0.1, 1, 0.1], 26, 26, 26, 0.9, [0.98, 0.985, 1.0], true);                       // sky above
      L.add([0.86, 0.12, 0.45], 24, 8, 20, 3.0, [1, 0.99, 0.975]);                           // white card, right
      L.add([0.2, 0.35, -0.95], 26, 24, 8, 1.1, [1, 0.985, 0.96]);                           // wall wash behind
      L.add([0.1, -0.4, 1], 24, 20, 4, 1.6, [1, 0.97, 0.93]);                                 // low front bounce card
      L.add([0.0, -1, 0.1], 22, 26, 26, 0.35, [1, 0.97, 0.93], true);                         // floor bounce
      L.add([0.62, 0.4, 0.68], 24, 5, 7, 5.0, [1.0, 0.95, 0.88], true);                        // a lamp, front right
      L.add([-0.95, 0.1, -0.2], 24, 4, 18, 2.4, [0.99, 0.99, 1.0]);                           // a second, narrow window
      L.pins({ n: 8, seed: 3, el: [0.2, 1.0], size: [1.2, 2.0], I: [12, 22], colors: [G_NEUTRAL, G_WARM], port: true });
    }
  },
  candle: {
    exposure: { dark: 1.2, light: 1.12 }, envLight: { dark: 0, light: 0.55 }, shadow: { core: 1.2, soft: 0.85 },
    keys: [glV(-0.62, 0.2, 0.72), glV(0.78, 0.1, 0.5), glV(0.42, 0.42, 0.72)],
    // v2.4: warm but never copper (balanced to a warm white, green-to-red well above 0.55: 18k gold keeps its hue), a
    // warm room rather than a black one, and only smooth sources: the 96 tiny flame reflections of v2.3 mottled
    // polished metal like a hammered finish
    balance: { chroma: [1, 0.9, 0.74], lum: { dark: 0.52, light: 0.58 } },
    build: function (L) {
      const k = L.light ? 1.4 : 1;
      L.room([0.13 * k, 0.1 * k, 0.072 * k], [0.06 * k, 0.046 * k, 0.032 * k], [0.12 * k, 0.088 * k, 0.058 * k]);
      const flames = [[-0.62, 0.2, 0.72], [0.78, 0.1, 0.5], [0.42, 0.42, 0.72], [0.2, 0.24, -0.94], [-0.88, 0.06, -0.3]];
      flames.forEach(function (d, i) {
        const I = i < 3 ? 1 : 0.6;
        L.add(d, 22, 1.0, 1.8, 120 * I, [1.0, 0.84, 0.62], true);  // the flame
        L.add(d, 23, 12, 12, 1.1 * I, [1.0, 0.74, 0.48], true);    // its glow, broad and soft
      });
      // the candlelit wall: warm patches that draw long soft highlights along the metal; a candelabrum overhead
      L.add([-0.3, 0.55, 0.78], 24, 14, 8, 2.0 * k, [1.0, 0.8, 0.58]);
      L.add([0.62, 0.3, 0.7], 24, 9, 12, 1.5 * k, [1.0, 0.82, 0.6]);
      L.add([0.05, 1, 0.2], 24, 14, 14, 2.4, [1.0, 0.86, 0.66], true);
      L.add([-0.92, 0.15, 0.2], 24, 4, 20, 1.4 * k, [1.0, 0.8, 0.58]);                       // a warm strip, left
      // candles on the viewer's side of the table and their glow
      [[-0.3, 0.08, 1], [0.34, 0.14, 1], [0.05, -0.05, 1]].forEach(function (d) { L.add(d, 22, 0.9, 1.6, 90, [1.0, 0.86, 0.64], true); L.add(d, 23, 9, 9, 0.8, [1.0, 0.74, 0.48], true); });
      L.add([0.0, 0.22, 1], 26, 14, 10, 0.8 * k, [1.0, 0.8, 0.58]);
      L.add([0, -1, 0.1], 22, 24, 24, 0.45 * k, [1.0, 0.76, 0.5], true);   // warm light on the table
      L.add([0.1, 0.25, -1], 26, 34, 14, 0.5 * k, [1.0, 0.76, 0.5]);       // the wall behind
      // a few reflections of the flames in glass about the room (large and soft, so the metal stays smooth)
      L.pins({ n: 10, seed: 11, el: [0.05, 1.1], size: [1.4, 2.4], I: [10, 20], colors: [[1.0, 0.86, 0.64], [1.0, 0.92, 0.76]] });
    }
  },
  evening: {
    exposure: { dark: 1.18, light: 1.12 }, envLight: { dark: 0.1, light: 0.75 }, shadow: { core: 1.05, soft: 1 },
    keys: [glV(0.55, 0.5, 0.62), glV(-0.92, 0.12, 0.3), glV(0.25, 0.48, -0.85)],
    // a warm key lamp and a cool-blue rim from the dusk window behind. The room itself stays a neutral dark: an all-over
    // blue ambience multiplied into yellow gold turned it bronze-brown, and tinted diamonds like aquamarines.
    // v2.3: the metal is lit by large warm sources (a lamp and its glow on the ceiling and the table), so yellow gold
    // keeps its colour; the dusk only draws a cool rim along the back edges. A dark room with small sources left most of
    // the metal reflecting near-black, which reads bronze-olive.
    // v2.4: lifted and white-balanced to a warm white (glRoomBalance): the dusk stays in the cool rims behind
    balance: { chroma: [1, 0.95, 0.88], lum: { dark: 0.55, light: 0.6 } },
    build: function (L) {
      const k = L.light ? 1.5 : 1;
      L.room([0.12 * k, 0.118 * k, 0.122 * k], [0.06 * k, 0.057 * k, 0.056 * k], [0.1 * k, 0.088 * k, 0.076 * k]);
      L.flag([0.03, 0.06, 1], 32, 7, 9, 0.01);
      L.add([-0.55, 0.22, -0.8], 26, 22, 10, 0.9, [0.42, 0.55, 1.0]);       // the window at dusk (behind: a rim)
      L.add([-0.5, 0.04, -0.86], 26, 34, 3.6, 1.0, [1.0, 0.62, 0.42]);      // the last of the sunset on the horizon
      L.add([0.25, 0.48, -0.85], 24, 22, 3.0, 3.2, [0.6, 0.74, 1.0]);       // cool rim strip behind
      L.add([0.92, 0.2, -0.3], 24, 3.0, 20, 2.0, [0.62, 0.74, 1.0]);        // cool rim strip, right back
      L.add([0.55, 0.5, 0.62], 24, 16, 11, 7.5, [1.0, 0.8, 0.56]);          // a warm lamp, front right
      L.add([-0.35, 0.72, 0.55], 24, 18, 10, 2.4, [1.0, 0.84, 0.66]);       // its light on the ceiling
      L.add([-0.92, 0.12, 0.3], 24, 3.0, 24, 3.4, [1.0, 0.8, 0.58]);        // warm strip, left
      L.add([0.1, -0.35, 1], 24, 20, 4.5, 1.6, [1.0, 0.8, 0.6]);            // the lamp's light on the table, in front
      L.add([0.0, -1, 0.05], 22, 26, 26, 0.4 * k, [0.9, 0.8, 0.68], true);
      L.add([-0.7, 0.42, 0.58], 24, 4, 5, 6.0, [1.0, 0.9, 0.74], true);   // a second, small lamp, front left
      // the city far off: a few lights on the horizon (few and soft: a dust of them mottled the metal)
      L.pins({ n: 12, seed: 23, el: [0.0, 0.4], size: [0.9, 1.5], I: [12, 24], colors: [[1.0, 0.86, 0.66], [0.8, 0.86, 1.0], G_NEUTRAL] });
    }
  }
};
const G_LIGHT_NAMES = Object.keys(G_LIGHTS);
function glLightName(p) { return G_LIGHTS[p] ? p : (p === 'candlelight' ? 'candle' : 'studio'); }
/* what a light means for the rest of the stage: exposure, the stones' white-room gain, the shadow, the glint keys */
function glLightLook(preset, mode) {
  const P = G_LIGHTS[glLightName(preset)], m = mode === 'light' ? 'light' : 'dark';
  return { exposure: P.exposure[m] * G_EXPOSURE[m], envLight: P.envLight[m], shadow: P.shadow, keys: P.keys };
}

/* 'dark' | 'light' | 'gem' (the room a stone sees inside itself: see G_GEM_ENV in 16-materials.js) */
function glEnvModeKey(mode) { return mode === 'light' || mode === 'gem' ? mode : 'dark'; }
/* v2.4 the gem room: ONE bright jeweller's lightbox, the same in every light and both page modes (a light only tints
   a stone's outer reflection: 16-materials.js). A diamond face-up returns mostly what lies around the viewer, so
   that is where the light is: a tent of white panels round a small dark camera port (the viewer's head: the arrows),
   two large softboxes and an overhead, a ring of strip lights round the horizon on a neutral mid-grey ground (no
   floor glow: a warm floor drew an orange bar at the girdle), and pin lamps for scintillation. The dark rooms of
   v2.3 made stones read as smoky quartz: most of what a pavilion returned was the dark ground. */
function glGemEnvAsync(renderer) { return glEnvAsync(renderer, 'studio', 'gem'); }
function glGemRoom(L) {
  const W = [1, 1, 1], WW = [1, 0.985, 0.96], WC = [0.97, 0.985, 1];
  L.room([0.34, 0.34, 0.34], [0.23, 0.23, 0.23], [0.19, 0.19, 0.19]);
  // the camera port (the viewer and the camera): a small dark disc on the axis, and the black card it is cut into
  L.flag([0, 0.04, 1], 30, 7.5, 7.5, 0.012);
  // the tent: white panels all round the port (a face-up stone sees these through its table and crown)
  L.add([-0.34, 0.12, 1], 26, 7, 12, 3.2, W);
  L.add([0.34, 0.1, 1], 26, 7, 12, 3.0, WW);
  L.add([0.0, 0.42, 1], 26, 12, 6, 3.6, W);
  L.add([0.0, -0.3, 1], 26, 12, 5, 2.4, WC);
  L.add([-0.3, 0.42, 0.9], 26, 6, 6, 4.2, W);
  L.add([0.32, 0.4, 0.9], 26, 6, 6, 3.8, W);
  L.add([-0.3, -0.26, 0.92], 26, 6, 5, 2.2, W);
  L.add([0.3, -0.28, 0.92], 26, 6, 5, 2.0, W);
  // two large softboxes and an overhead
  L.add([-0.62, 0.55, 0.56], 24, 15, 11, 4.4, WW);
  L.add([0.66, 0.42, 0.62], 24, 13, 10, 3.6, WC);
  L.add([0.04, 1, 0.12], 24, 17, 17, 3.2, W);
  // the ring of strip lights round the horizon, with grey gaps between them
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * G_TAU + 0.11;
    const d = [Math.sin(a), 0.1 + 0.08 * Math.cos(i * 1.7), Math.cos(a)];
    if (d[2] > 0.82) continue;                     // the tent is there
    L.add(d, 26, 2.2, 15, 2.6 + 0.8 * ((i * 7) % 3) / 2, i % 3 ? W : (i % 2 ? WW : WC));
  }
  // a few dark cards between the strips and above: the contrast that draws the facets
  L.flag([0.0, 0.72, -0.7], 30, 10, 4, 0.03);
  L.flag([-0.78, 0.4, -0.48], 30, 4, 9, 0.03);
  L.flag([0.82, 0.36, -0.44], 30, 4, 9, 0.03);
  // pin lamps: tiny, very bright, all over the upper sphere: scintillation and, through dispersion, fire
  L.pins({ n: 70, seed: 7, el: [0.08, 1.35], size: [0.5, 1.1], I: [18, 46], colors: [W, WW, WC], port: true });
}
function glLightbox(mode, preset) {
  const gem = mode === 'gem';
  const light = mode === 'light';
  const s = new THREE.Scene();
  if (!G_SOFT_TEX) { G_SOFT_TEX = glMaskTexture(false); G_ROUND_TEX = glMaskTexture(true); }
  if (gem && !G_HARD_TEX) { G_HARD_TEX = glMaskTexture(false, true); G_HARDR_TEX = glMaskTexture(true, true); }
  const L = {
    light: light,
    gem: gem,
    /* the room: a sphere with a vertical gradient (ceiling, horizon, floor) */
    room: function (top, mid, low) {
      const roomGeo = new THREE.SphereGeometry(45, 64, 32);
      const col = [], p = roomGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) / 45;
        const c = y > 0 ? mid.map(function (m, k) { return m + (top[k] - m) * Math.pow(y, 0.8); })
                        : mid.map(function (m, k) { return m + (low[k] - m) * Math.pow(-y, 0.7); });
        col.push(c[0], c[1], c[2]);
      }
      roomGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      s.add(new THREE.Mesh(roomGeo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
    },
    add: function (dir, dist, w, h, I, c, round, rot) {
      const geo = round ? new THREE.CircleGeometry(0.5, 40) : new THREE.PlaneGeometry(1, 1);
      const map = gem ? (round ? G_HARDR_TEX : G_HARD_TEX) : (round ? G_ROUND_TEX : G_SOFT_TEX);
      const m = new THREE.MeshBasicMaterial({ map: map, side: THREE.DoubleSide, depthWrite: false, depthTest: false, transparent: true, blending: THREE.AdditiveBlending });
      m.color.setRGB(c[0] * I, c[1] * I, c[2] * I);
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.copy(new THREE.Vector3(dir[0], dir[1], dir[2]).normalize().multiplyScalar(dist));
      mesh.lookAt(0, 0, 0);
      if (rot) mesh.rotateZ(rot);
      mesh.scale.set(w, h, 1);
      mesh.renderOrder = 1;
      s.add(mesh);
      return mesh;
    },
    flag: function (dir, dist, w, h, shade) {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(shade, shade * 0.97, shade * 0.95), side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      mesh.position.copy(new THREE.Vector3(dir[0], dir[1], dir[2]).normalize().multiplyScalar(dist));
      mesh.lookAt(0, 0, 0);
      s.add(mesh);
    },
    /* a dark bar drawn over the lights (window mullions) */
    bar: function (dir, dist, w, h, shade, rot) {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(shade, shade, shade), side: THREE.DoubleSide, depthTest: false, depthWrite: false, transparent: true });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      mesh.position.copy(new THREE.Vector3(dir[0], dir[1], dir[2]).normalize().multiplyScalar(dist));
      mesh.lookAt(0, 0, 0);
      if (rot) mesh.rotateZ(rot);
      mesh.renderOrder = 2;
      s.add(mesh);
    },
    pins: function (o) {
      let seed = o.seed || 7;
      const rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      const n = o.n;
      for (let i = 0; i < n; i++) {
        const az = rnd() * G_TAU, el = o.el[0] + Math.pow(rnd(), 0.8) * (o.el[1] - o.el[0]);
        const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
        const sz = o.size[0] + rnd() * (o.size[1] - o.size[0]);
        const I = o.I[0] + rnd() * (o.I[1] - o.I[0]);
        const c = o.colors[Math.floor(rnd() * o.colors.length) % o.colors.length];
        if (o.port && d[2] > 0.88 && Math.abs(d[0]) < 0.3) continue;   // keep the camera port dark
        L.add(d, 28, sz, sz, I, c, true);
      }
    }
  };
  if (gem) glGemRoom(L);
  else {
    const P = G_LIGHTS[glLightName(preset)] || G_LIGHTS.studio;
    P.build(L);
    if (P.balance) glRoomBalance(s, P.balance, light);
  }
  return s;
}
/* v2.4 white balance of a room before it is filtered: the average colour the room sends toward a piece (each source by
   its solid angle, the room's own gradient over the sphere) is brought to the light's chroma, keeping its brightness,
   and lifted to a floor of average brightness. The light-independent metal colour was not enough: the daylight and
   evening rooms themselves carried a green-brown cast and were too dark, so yellow gold read khaki and bronze, and the
   candle room turned it copper. */
function glRoomStats(scene) {
  const sum = [0, 0, 0];
  let wsum = 0;
  scene.traverse(function (o) {
    if (!o.isMesh || !o.material) return;
    const m = o.material, g = o.geometry;
    if (g.attributes.color && m.vertexColors) {
      const c = g.attributes.color, n = c.count;
      const acc = [0, 0, 0];
      for (let i = 0; i < n; i++) { acc[0] += c.getX(i); acc[1] += c.getY(i); acc[2] += c.getZ(i); }
      const w = 4 * Math.PI;
      for (let k = 0; k < 3; k++) sum[k] += acc[k] / n * w;
      wsum += w;
      return;
    }
    if (m.blending !== THREE.AdditiveBlending) return;
    const d = o.position.length() || 1;
    const area = o.scale.x * o.scale.y * (g.type === 'CircleGeometry' ? 0.785 : 1) * 0.72;
    const w = area / (d * d);
    sum[0] += m.color.r * w; sum[1] += m.color.g * w; sum[2] += m.color.b * w;
  });
  const a = [sum[0] / (wsum || 1), sum[1] / (wsum || 1), sum[2] / (wsum || 1)];
  return { avg: a, lum: 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2] };
}
function glRoomBalance(scene, cfg, light) {
  const st = glRoomStats(scene);
  if (!(st.lum > 1e-5)) return st;
  const T = cfg.chroma, tl = 0.2126 * T[0] + 0.7152 * T[1] + 0.0722 * T[2];
  const want = (light ? cfg.lum.light : cfg.lum.dark) || 0;
  const lift = want > st.lum ? want / st.lum : 1;
  // per channel: the room's average onto the target chroma at its own brightness, then the lift
  const g = [0, 1, 2].map(function (k) { return T[k] / tl * st.lum / Math.max(1e-5, st.avg[k]) * lift; });
  const k0 = cfg.strength == null ? 1 : cfg.strength;
  const gg = g.map(function (x) { return 1 + (x - 1) * k0; });
  scene.traverse(function (o) {
    if (!o.isMesh || !o.material) return;
    const m = o.material, geo = o.geometry;
    if (geo.attributes.color && m.vertexColors) {
      const c = geo.attributes.color;
      for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * gg[0], c.getY(i) * gg[1], c.getZ(i) * gg[2]);
      c.needsUpdate = true;
    } else if (m.blending === THREE.AdditiveBlending) {
      m.color.setRGB(m.color.r * gg[0], m.color.g * gg[1], m.color.b * gg[2]);
    }
  });
  return glRoomStats(scene);
}
function glDisposeScene(sc) {
  sc.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
}

/* ---------------- per renderer: a PMREM generator, the environments it has made, the crossfade target ---------------- */
const G_ENVS = new WeakMap();
function glEnvRec(renderer) {
  let rec = G_ENVS.get(renderer);
  if (!rec) {
    rec = { pmrem: null, envs: {}, pending: {}, warm: null, keep: null, mix: null, dead: false };
    G_ENVS.set(renderer, rec);
  }
  return rec;
}
function glPmrem(rec, renderer) {
  if (!rec.pmrem) {
    const pm = new THREE.PMREMGenerator(renderer);
    const size = G_TIER.env;
    // every environment of this tier has one cube size (the gem shader's CubeUV defines are built for it)
    pm._setSize = function () { THREE.PMREMGenerator.prototype._setSize.call(this, size); };
    rec.pmrem = pm;
  }
  return rec.pmrem;
}
/* compile, off the main thread, every shader the environments need (the rooms' three material kinds, PMREM's
   background box and blur, the crossfade pass), with the renderer in the state it will draw them in (a half-float
   target: linear, no tone mapping). The materials are kept, so the compiled programs stay cached. */
function glEnvWarm(renderer) {
  const rec = glEnvRec(renderer);
  if (rec.warm) return rec.warm;
  // in idle steps of a few ms each: the targets and textures, then one material's compile per step, then a wait (off
  // the main thread) until the driver has them all
  rec.warm = glIdle(function* envWarm() {
    const pm = glPmrem(rec, renderer);
    pm._setSize();
    const tmp = pm._allocateTargets();       // creates the ping-pong target and the blur material
    tmp.dispose();
    if (!G_SOFT_TEX) { G_SOFT_TEX = glMaskTexture(false); G_ROUND_TEX = glMaskTexture(true); }
    yield;
    if (rec.dead) return null;
    const geo = new THREE.PlaneGeometry(1, 1);
    const mats = [
      new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }),
      new THREE.MeshBasicMaterial({ map: G_ROUND_TEX, side: THREE.DoubleSide, depthWrite: false, depthTest: false, transparent: true, blending: THREE.AdditiveBlending }),
      new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }),
      new THREE.MeshBasicMaterial({ name: 'PMREM.Background', side: THREE.BackSide, depthWrite: false, depthTest: false }),
      new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide, depthTest: false, depthWrite: false, transparent: true }),
      pm._blurMaterial,
      glEnvMixMaterial()
    ];
    const vgeo = geo.clone();
    vgeo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(vgeo.attributes.position.count * 3).fill(0.5), 3));
    rec.keep = { mats: mats.slice(0, 5), geo: geo, vgeo: vgeo };
    const cam = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    const waits = [];
    // v2.5: the materials above are one step; the ping-pong target's GPU storage another; and the context's very
    // first program (24-34 ms on a fresh context, whatever it is) gets an idle period of its own, long enough for it
    yield;
    if (rec.dead) return null;
    try {
      const prevT = renderer.getRenderTarget();
      if (renderer.initRenderTarget) renderer.initRenderTarget(pm._pingPongRenderTarget);
      else { renderer.setRenderTarget(pm._pingPongRenderTarget); renderer.setRenderTarget(prevT); }
    } catch (e) { /* made on first use */ }
    yield { need: 32 };
    for (let i = 0; i < mats.length; i++) {
      if (rec.dead) return null;
      const m = mats[i];
      const sc = new THREE.Scene();
      const mesh = new THREE.Mesh(i === 0 ? vgeo : (m === pm._blurMaterial ? pm._lodPlanes[0] : geo), m);
      mesh.frustumCulled = false;
      sc.add(mesh);
      const prevT = renderer.getRenderTarget(), prevTM = renderer.toneMapping;
      try {
        renderer.setRenderTarget(pm._pingPongRenderTarget);
        renderer.toneMapping = THREE.NoToneMapping;
        waits.push(Promise.resolve(renderer.compileAsync ? renderer.compileAsync(sc, cam) : renderer.compile(sc, cam)).catch(function () { /* on first use */ }));
      } catch (e) { /* compiled on first use */ } finally { renderer.setRenderTarget(prevT); renderer.toneMapping = prevTM; }
      yield;
    }
    yield Promise.all(waits);
    return null;
  }, 6);
  return rec.warm;
}
/* PMREM's twenty-odd passes, a few per idle step (the same passes as PMREMGenerator.fromScene: the room into the six
   faces of a cube, then the blur chain down the mip levels), so making a room never holds the main thread. */
const G_PM_AXES = (function () {
  const P = (1 + Math.sqrt(5)) / 2, I = 1 / P;
  return [[-P, I, 0], [P, I, 0], [-I, 0, P], [I, 0, P], [0, P, -I], [0, P, I], [-1, 1, -1], [1, 1, -1], [-1, 1, 1], [1, 1, 1]]
    .map(function (a) { return new THREE.Vector3(a[0], a[1], a[2]); });
})();
function* glPmremSteps(rec, renderer, scene, sigma, near, far) {
  const pm = glPmrem(rec, renderer);
  pm._setSize();
  const target = pm._allocateTargets();
  target.depthBuffer = true;
  const size = pm._cubeSize;
  const cam = new THREE.PerspectiveCamera(90, 1, near, far);
  if (!rec.bg) rec.bg = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ name: 'PMREM.Background', side: THREE.BackSide, depthWrite: false, depthTest: false, color: 0x000000 }));
  const ups = [1, -1, 1, 1, 1, 1], dirs = [1, 1, 1, -1, -1, -1];
  const run = function (fn) {
    const t = renderer.getRenderTarget(), f = renderer.getActiveCubeFace(), l = renderer.getActiveMipmapLevel();
    const tm = renderer.toneMapping, ac = renderer.autoClear, xr = renderer.xr.enabled;
    renderer.xr.enabled = false;
    try { fn(); } finally { renderer.setRenderTarget(t, f, l); renderer.toneMapping = tm; renderer.autoClear = ac; renderer.xr.enabled = xr; }
  };
  try {
    for (let face = 0; face < 6; face++) {
      if (rec.dead) throw new Error('renderer disposed');
      run(function () {
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.autoClear = false;
        const col = face % 3;
        if (col === 0) { cam.up.set(0, ups[face], 0); cam.lookAt(dirs[face], 0, 0); }
        else if (col === 1) { cam.up.set(0, 0, ups[face]); cam.lookAt(0, dirs[face], 0); }
        else { cam.up.set(0, ups[face], 0); cam.lookAt(0, 0, dirs[face]); }
        target.viewport.set(col * size, face > 2 ? size : 0, size, size);
        target.scissor.set(col * size, face > 2 ? size : 0, size, size);
        target.scissorTest = true;
        renderer.setRenderTarget(target);
        renderer.render(rec.bg, cam);
        renderer.render(scene, cam);
      });
      yield;
    }
    if (sigma > 0) { run(function () { pm._blur(target, 0, 0, sigma); }); yield; }
    const n = pm._lodPlanes.length;
    for (let i = 1; i < n; i++) {
      if (rec.dead) throw new Error('renderer disposed');
      run(function () {
        renderer.autoClear = false;
        const s = Math.sqrt(pm._sigmas[i] * pm._sigmas[i] - pm._sigmas[i - 1] * pm._sigmas[i - 1]);
        pm._blur(target, i - 1, i, s, G_PM_AXES[(n - i - 1) % G_PM_AXES.length]);
      });
      if (i % 2 === 0) yield;
    }
  } catch (e) { target.dispose(); throw e; }
  target.scissorTest = false;
  target.viewport.set(0, 0, target.width, target.height);
  target.scissor.set(0, 0, target.width, target.height);
  return target;
}
/* an environment for a light and mode, made in idle steps; resolves with its texture */
function glEnvAsync(renderer, preset, mode) {
  if (!renderer || typeof renderer !== 'object') return Promise.reject(new Error('glEnvAsync: no renderer'));
  preset = glLightName(preset);
  mode = glEnvModeKey(mode);
  const rec = glEnvRec(renderer), key = preset + '|' + mode;
  if (rec.envs[key]) return Promise.resolve(rec.envs[key].texture);
  if (rec.pending[key]) return rec.pending[key];
  const p = glEnvWarm(renderer).then(function () {
    return glIdle(function* envRoom() {
      if (rec.dead) throw new Error('renderer disposed');
      if (rec.envs[key]) return rec.envs[key].texture;
      const sc = glLightbox(mode, preset);
      yield;
      try { rec.envs[key] = yield* glPmremSteps(rec, renderer, sc, 0.012, 0.1, 100); }
      finally { glDisposeScene(sc); }
      delete rec.pending[key];
      return rec.envs[key].texture;
    }, 6);
  });
  rec.pending[key] = p;
  p.catch(function () { delete rec.pending[key]; });
  return p;
}
/* the same, at once (stills renderer and older callers): blocks while it generates */
function glEnvFor(renderer, mode, preset) {
  preset = glLightName(preset);
  mode = glEnvModeKey(mode);
  const rec = glEnvRec(renderer), key = preset + '|' + mode;
  if (!rec.envs[key]) {
    const sc = glLightbox(mode, preset);
    rec.envs[key] = glPmrem(rec, renderer).fromScene(sc, 0.012, 0.1, 100);
    glDisposeScene(sc);
  }
  return rec.envs[key].texture;
}
function glEnvHas(renderer, preset, mode) {
  const rec = G_ENVS.get(renderer);
  return !!(rec && rec.envs[glLightName(preset) + '|' + glEnvModeKey(mode)]);
}

/* the crossfade between two environments: both blended into a third target of the same layout, so the lighting on a
   live piece eases over (a light switch, or the page's mode change) instead of snapping. One cheap full-target pass
   per frame while it runs. */
let G_ENV_MIX = null;
function glEnvMixMaterial() {
  if (!G_ENV_MIX) {
    const mat = new THREE.ShaderMaterial({
      name: 'au-env-mix',
      uniforms: { a: { value: null }, b: { value: null }, k: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D a; uniform sampler2D b; uniform float k; varying vec2 vUv; void main() { gl_FragColor = mix(texture2D(a, vUv), texture2D(b, vUv), k); }',
      depthTest: false, depthWrite: false, toneMapped: false
    });
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    quad.frustumCulled = false;
    scene.add(quad);
    G_ENV_MIX = { scene: scene, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mat: mat };
  }
  return G_ENV_MIX.mat;
}
function glEnvMixTex(renderer, ta, tb, k, slot) {
  const rec = glEnvRec(renderer);
  const w = ta.image.width, h = ta.image.height;
  const name = slot === 'gem' ? 'mixG' : 'mix';   // the gem room has its own crossfade target
  if (!rec[name] || rec[name].width !== w || rec[name].height !== h) {
    if (rec[name]) rec[name].dispose();
    rec[name] = new THREE.WebGLRenderTarget(w, h, {
      type: ta.type, format: ta.format, colorSpace: ta.colorSpace, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter,
      generateMipmaps: false, depthBuffer: false
    });
    rec[name].texture.mapping = THREE.CubeUVReflectionMapping;
    rec[name].texture.name = 'au-env-' + name;
  }
  glEnvMixMaterial();
  G_ENV_MIX.mat.uniforms.a.value = ta;
  G_ENV_MIX.mat.uniforms.b.value = tb;
  G_ENV_MIX.mat.uniforms.k.value = k;
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rec[name]);
  renderer.render(G_ENV_MIX.scene, G_ENV_MIX.cam);
  renderer.setRenderTarget(prev);
  return rec[name].texture;
}
/* v1 signature (mode names, studio light) */
function glEnvMix(renderer, from, to, k) {
  return glEnvMixTex(renderer, glEnvFor(renderer, from), glEnvFor(renderer, to), k);
}
function glEnvDispose(renderer) {
  const rec = G_ENVS.get(renderer);
  if (!rec) return;
  rec.dead = true;
  Object.keys(rec.envs).forEach(function (k) { rec.envs[k].dispose(); });
  if (rec.mix) rec.mix.dispose();
  if (rec.mixG) rec.mixG.dispose();
  if (rec.keep) { rec.keep.mats.forEach(function (m) { m.dispose(); }); rec.keep.geo.dispose(); rec.keep.vgeo.dispose(); }
  if (rec.bg) { rec.bg.geometry.dispose(); rec.bg.material.dispose(); }
  if (rec.pmrem) rec.pmrem.dispose();
  G_ENVS.delete(renderer);
}

/* ---- 22-fx.js ---- */
/* ---- Glints and the contact shadow ---- */

let G_STAR_TEX = null;
function glStarTexture() {
  if (G_STAR_TEX) return G_STAR_TEX;
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.globalCompositeOperation = 'lighter';
  const ray = function (ang, len, wid, alpha) {
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate(ang);
    const gr = g.createLinearGradient(0, 0, len * S / 2, 0);
    gr.addColorStop(0, 'rgba(255,255,255,' + alpha + ')');
    gr.addColorStop(0.35, 'rgba(255,252,246,' + alpha * 0.45 + ')');
    gr.addColorStop(1, 'rgba(255,250,240,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, -wid * S / 2);
    g.quadraticCurveTo(len * S * 0.12, -wid * S * 0.08, len * S / 2, 0);
    g.quadraticCurveTo(len * S * 0.12, wid * S * 0.08, 0, wid * S / 2);
    g.closePath();
    g.fill();
    g.restore();
  };
  // short, fine rays: a catch-light on a facet, not a sparkle filter
  for (let i = 0; i < 4; i++) ray(i * Math.PI / 2, 0.45, 0.02, 0.8);
  for (let i = 0; i < 4; i++) ray(Math.PI / 4 + i * Math.PI / 2, 0.16, 0.014, 0.18);
  const halo = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.065);
  halo.addColorStop(0, 'rgba(255,255,255,0.9)');
  halo.addColorStop(0.1, 'rgba(255,253,248,0.42)');
  halo.addColorStop(0.4, 'rgba(255,248,240,0.07)');
  halo.addColorStop(1, 'rgba(255,248,240,0)');
  g.fillStyle = halo;
  g.fillRect(0, 0, S, S);
  G_STAR_TEX = new THREE.CanvasTexture(c);
  G_STAR_TEX.colorSpace = THREE.SRGBColorSpace;
  return G_STAR_TEX;
}

/* A small pool of star sprites. Candidates are facet points (object-local) with normals; a candidate flares when
   the mirror direction of the view off its facet lines up with one of the key lights. */
function GlGlints(scene, max) {
  this.max = max || 3;
  this.group = new THREE.Group();
  this.group.renderOrder = 10;
  this.sprites = [];
  for (let i = 0; i < this.max; i++) {
    const m = new THREE.SpriteMaterial({ map: glStarTexture(), transparent: true, depthTest: false, depthWrite: false, toneMapped: false, premultipliedAlpha: true, opacity: 0 });
    const sp = new THREE.Sprite(m);
    sp.visible = false;
    sp.renderOrder = 10;
    this.group.add(sp);
    this.sprites.push({ sp: sp, cand: null, a: 0 });
  }
  scene.add(this.group);
  this.cands = [];
  this.strength = 1;
  this.unit = 1;          // world units per mm of the piece (live stages scale every piece to one size)
}
/* only diamonds throw a star: a glint on an emerald, ruby or sapphire is physically wrong and reads as a filter */
GlGlints.prototype.set = function (cands) {
  this.cands = (cands || []).filter(function (c) { return c.stone == null || c.stone === 'diamond'; }).map(function (c, i) {
    return Object.assign({}, c, { rot: ((i * 0.618) % 1 - 0.5) * 0.35, s: 0 });
  });
  this.sprites.forEach(function (s) { s.cand = null; s.a = 0; s.sp.visible = false; });
};
const G_GL_TMP = { m: new THREE.Matrix4(), n3: new THREE.Matrix3(), p: new THREE.Vector3(), n: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3() };
GlGlints.prototype.score = function (c, camPos) {
  const T = G_GL_TMP;
  if (c.inst >= 0) { c.obj.getMatrixAt(c.inst, T.m); T.m.premultiply(c.obj.matrixWorld); }
  else T.m.copy(c.obj.matrixWorld);
  T.p.copy(c.p).applyMatrix4(T.m);
  T.n3.getNormalMatrix(T.m);
  T.n.copy(c.n).applyMatrix3(T.n3).normalize();
  T.v.copy(camPos).sub(T.p).normalize();
  c.wp = c.wp || new THREE.Vector3();
  c.wp.copy(T.p);                                      // always track the facet, even while its star fades out
  const facing = T.n.dot(T.v);
  if (facing < 0.2) return 0;
  T.r.copy(T.n).multiplyScalar(2 * facing).sub(T.v);   // mirror of the view direction
  let best = 0;
  const keys = this.keys || G_KEY_DIRS;                // the light's brightest sources (20-env.js)
  for (let i = 0; i < keys.length; i++) best = Math.max(best, T.r.dot(keys[i]) * (i === 0 ? 1 : 0.985));
  return Math.pow(Math.max(0, best), 110) * Math.min(1, (facing - 0.2) * 3);
};
/* live update: dt in seconds; returns true while any star is visible (so the stage keeps rendering) */
GlGlints.prototype.update = function (camera, dt, enabled) {
  const camPos = camera.getWorldPosition(G_GL_TMP.v.clone());
  const self = this;
  let any = false;
  if (enabled && this.cands.length) {
    this.cands.forEach(function (c) { c.s = self.score(c, camPos); });
    const ranked = this.cands.filter(function (c) { return c.s > 0.08; }).sort(function (a, b) { return b.s - a.s; }).slice(0, this.max);
    // keep sprites on their candidates while they stay ranked; give free sprites to new candidates
    this.sprites.forEach(function (s) { if (s.cand && ranked.indexOf(s.cand) < 0) s.target = 0; else if (s.cand) s.target = s.cand.s; });
    ranked.forEach(function (c) {
      if (self.sprites.some(function (s) { return s.cand === c; })) return;
      const free = self.sprites.find(function (s) { return !s.cand || s.a < 0.02; });
      if (free) { free.cand = c; free.a = 0; free.target = c.s; }
    });
  } else this.sprites.forEach(function (s) { s.target = 0; });
  this.sprites.forEach(function (s) {
    const k = 1 - Math.exp(-dt * 9);
    const was = s.a;
    s.a += ((s.target || 0) - s.a) * k;
    if (s.a < 0.01 && !(s.target > 0.01)) { if (was > 0) any = true; s.a = 0; s.sp.visible = false; s.cand = s.target > 0 ? s.cand : null; return; }
    if (!s.cand || !s.cand.wp) { s.sp.visible = false; return; }
    // busy only while a star is still easing in or out (a steady star on a resting piece needs no new frames)
    if (Math.abs(s.a - was) > 0.002 || Math.abs((s.target || 0) - s.a) > 0.004) any = true;
    s.sp.visible = true;
    s.sp.position.copy(s.cand.wp);
    const sz = s.cand.size * (0.38 + 0.4 * Math.sqrt(Math.min(1, s.a))) * self.strength * self.unit;
    s.sp.scale.set(sz, sz, 1);
    s.sp.material.opacity = Math.min(1, s.a * 1.15) * 0.72 * (self.alpha == null ? 1 : self.alpha);
    s.sp.material.rotation = s.cand.rot;
  });
  return any;
};
/* stills and spin frames: at most ONE small star, on the diamond facet best lined up with a key light, and only
   when it really is lined up. Deterministic for a pose, so the still and frame 0 of its spin strip are identical. */
GlGlints.prototype.bake = function (camera) {
  const camPos = camera.getWorldPosition(new THREE.Vector3());
  const self = this;
  let best = null, bs = 0;
  this.cands.forEach(function (c) {
    // a softer lobe than the live stage (a still has no motion to reveal the flash)
    const s = Math.pow(Math.max(0, self.score(c, camPos)), 0.22);
    if (s > bs) { bs = s; best = c; }
  });
  this.sprites.forEach(function (s, i) {
    if (i > 0 || !best || bs < 0.3) { s.sp.visible = false; return; }
    const a = Math.min(1, (bs - 0.3) / 0.45);
    s.sp.visible = true;
    s.sp.position.copy(best.wp);
    const sz = best.size * 0.55 * (0.75 + 0.25 * a) * self.unit;
    s.sp.scale.set(sz, sz, 1);
    s.sp.material.opacity = 0.5 * (0.45 + 0.55 * a);
    s.sp.material.rotation = best.rot;
  });
};
GlGlints.prototype.instant = GlGlints.prototype.bake;
GlGlints.prototype.hide = function () { this.sprites.forEach(function (s) { s.sp.visible = false; s.a = 0; s.cand = null; }); };
GlGlints.prototype.dispose = function () { this.sprites.forEach(function (s) { s.sp.material.dispose(); }); };

/* ---- contact shadow: two soft radial blobs (a tight contact core and a wide penumbra) on the floor plane ---- */
let G_SHADOW_TEX = null;
function glShadowTexture() {
  if (G_SHADOW_TEX) return G_SHADOW_TEX;
  const n = 128, data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = Math.hypot((x + 0.5) / n - 0.5, (y + 0.5) / n - 0.5) * 2;
    const a = Math.exp(-r * r * 4.2) * (1 - THREE.MathUtils.smoothstep(r, 0.75, 1));
    const k = (y * n + x) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255;
    data[k + 3] = Math.round(a * 255);
  }
  G_SHADOW_TEX = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  G_SHADOW_TEX.magFilter = THREE.LinearFilter; G_SHADOW_TEX.minFilter = THREE.LinearFilter;
  G_SHADOW_TEX.needsUpdate = true;
  return G_SHADOW_TEX;
}
function GlShadow(scene) {
  this.group = new THREE.Group();
  const mk = function () {
    const m = new THREE.MeshBasicMaterial({ map: glShadowTexture(), transparent: true, depthWrite: false, toneMapped: false, color: 0x000000, opacity: 0.5 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = -1;
    return mesh;
  };
  this.core = mk(); this.soft = mk();
  this.group.add(this.soft); this.group.add(this.core);
  scene.add(this.group);
  this.base = { core: 0.5, soft: 0.3 };
}
/* footprint: y floor height; x, z half extents of the contact; cx, cz its centre (world units) */
GlShadow.prototype.fit = function (y, x, z, cx, cz) {
  this.group.position.set(cx || 0, y, cz || 0);
  this.core.scale.set(x * 1.25, z * 1.1, 1);
  this.soft.scale.set(x * 3.4, z * 3.0, 1);
  this.fx = x; this.fz = z;
};
/* colours in linear light (what the material takes): light = a warm umber; dark = a deep burgundy (sRGB about
   #0F0202), never black: pure black reads as a hole in the burgundy page */
const G_SHADOW_LOOK = {
  light: { c: [0.11, 0.05, 0.045], core: 0.34, soft: 0.15 },
  dark: { c: [0.0048, 0.00046, 0.00046], core: 0.42, soft: 0.22 }
};
GlShadow.prototype.mode = function (mode) { this.blend(mode, mode, 1); };
/* k: 0 = look of mode a, 1 = look of mode b (the mode crossfade); la / lb: optional light multipliers
   { core, soft } of the light before and after (a softer shadow by daylight, a deeper one by candlelight) */
GlShadow.prototype.blend = function (a, b, k, la, lb) {
  const A = G_SHADOW_LOOK[a === 'light' ? 'light' : 'dark'], B = G_SHADOW_LOOK[b === 'light' ? 'light' : 'dark'];
  const l = function (x, y) { return x + (y - x) * k; };
  la = la || this.lk || { core: 1, soft: 1 }; lb = lb || la;
  this.core.material.color.setRGB(l(A.c[0], B.c[0]), l(A.c[1], B.c[1]), l(A.c[2], B.c[2]));
  this.soft.material.color.copy(this.core.material.color);
  this.base = { core: l(A.core * la.core, B.core * lb.core), soft: l(A.soft * la.soft, B.soft * lb.soft) };
  if (k >= 1) this.lk = lb;
  this.set(this.lift || 0, this.alpha == null ? 1 : this.alpha);
};
/* lift: how far the piece floats above its rest (0..1); alpha: overall opacity */
GlShadow.prototype.set = function (lift, alpha) {
  this.lift = lift; this.alpha = alpha;
  const l = Math.min(1, Math.max(0, lift));
  const h = this.hollow ? { core: 0.18, soft: 0.5 } : { core: 1, soft: 1 };   // see GlStage.placeShadow
  this.core.material.opacity = this.base.core * (1 - l * 0.7) * alpha * h.core;
  this.soft.material.opacity = this.base.soft * (1 - l * 0.25) * alpha * h.soft;
  if (this.fx) {
    const g = 1 + l * 0.45;
    this.core.scale.set(this.fx * 1.25 * g, this.fz * 1.1 * g, 1);
  }
};
GlShadow.prototype.dispose = function () { this.core.geometry.dispose(); this.soft.geometry.dispose(); this.core.material.dispose(); this.soft.material.dispose(); };

/* ---- 30-settings.js ---- */
/* ---- Settings: a claw head for any cut. Tapered round claws rise from a narrow base, follow the pavilion out to
   the girdle, then bend over the crown edge and end in a rounded bead. A gallery rail ties them together. ---- */

function glOutlineNormal(gem, az) {
  const e = 0.002, a = gem.outline(az - e), b = gem.outline(az + e);
  const n = new THREE.Vector2(b.y - a.y, -(b.x - a.x)).normalize();
  const p = gem.outline(az);
  if (n.dot(p) < 0) n.negate();
  return n;
}

function glSetting(ctx, gem, o) {
  const lod = ctx.lod || 1;
  const group = new THREE.Group();
  group.add(gem.mesh);
  const n = o.claws != null ? o.claws : (o.bezel ? 0 : 4);
  const azs = n > 0 ? (o.az || gem.prongs(n)) : [];
  const cr = o.clawR || THREE.MathUtils.clamp(gem.width * 0.066, 0.34, 0.6);
  const gh = gem.girdle / 2;
  const pav = gem.pavilion - gh;
  const bottom = o.bottom != null ? o.bottom : -(gem.pavilion + (o.low ? 0.25 : 0.6));
  const baseR = o.baseR != null ? o.baseR : Math.min(gem.width * 0.3, 0.95);
  const geos = [];
  const railF = 0.52;                        // the gallery rail sits half way down the pavilion
  const yRail = -gh - pav * railF;
  const P = function (u, r, y) { return new THREE.Vector3(u.x * r, y, u.y * r); };
  if (o.bezel) {
    /* bezel (collet): a polished rim that hugs the girdle and folds a hair over the crown edge */
    const t = o.wall || THREE.MathUtils.clamp(gem.width * 0.065, 0.32, 0.6);
    const N = Math.round(120 * lod + 24), path = [];
    for (let i = 0; i < N; i++) {
      const az = i / N * G_TAU, q = gem.outline(az), nr = glOutlineNormal(gem, az);
      path.push(new THREE.Vector3(q.x + nr.x * (t / 2 - 0.03), 0, q.y + nr.y * (t / 2 - 0.03)));
    }
    const top = gh + (gem.crown - gh) * 0.22, bot = -gh - pav * (o.low ? 0.5 : 0.62), lip = t * 0.38;
    const prof = [];
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * G_TAU, c = Math.cos(a), s = Math.sin(a);
      let x = glSgnPow(c, 0.4) * t / 2, y = (top + bot) / 2 + glSgnPow(s, 0.4) * (top - bot) / 2;
      if (x < 0 && y > top - t * 0.6) x -= lip * Math.min(1, (y - (top - t * 0.6)) / (t * 0.6));
      prof.push([x, y]);
    }
    geos.push(KIT.sweep(path, prof));
  }
  azs.forEach(function (az, i) {
    const q = gem.outline(az), R = q.length(), u = q.clone().divideScalar(R);
    const nrm = glOutlineNormal(gem, az);
    const big = (gem.cut === 'pear' && i === 0) ? 1.22 : 1;     // the V tip of a pear gets a stronger claw
    const c = cr * big;
    // where the claw meets the girdle: just outside the outline, along the outline normal
    const gx = q.x + nrm.x * c * 0.62, gz = q.y + nrm.y * c * 0.62;
    const tipIn = c * (gem.cut === 'emerald' ? 0.95 : 0.72);
    const tx = q.x - nrm.x * tipIn, tz = q.y - nrm.y * tipIn;
    const ty = gem.surfaceY(tx, tz) + c * 0.4;
    const pts = [
      P(u, baseR, bottom),
      P(u, Math.max(baseR + 0.15, R * (1 - railF) + c * 1.05), yRail),
      new THREE.Vector3(gx, -gh * 0.2, gz),
      new THREE.Vector3(q.x + nrm.x * c * 0.3, gh + (gem.crown - gh) * 0.16, q.y + nrm.y * c * 0.3),
      new THREE.Vector3(tx, ty, tz)
    ];
    geos.push(KIT.tube(pts, function (t) { return c * (1.1 - 0.22 * t * t); }, { radial: Math.round(14 * lod + 2), segments: Math.round(40 * lod + 8), caps: [true, true], tension: 0.5 }));
  });
  if (o.rails !== 0 && !(o.bezel && o.rails == null)) {
    const N = Math.round(72 * lod + 16);
    const rail = [];
    for (let i = 0; i < N; i++) {
      const az = i / N * G_TAU, q = gem.outline(az), R = q.length(), u = q.clone().divideScalar(R);
      rail.push(P(u, Math.max(baseR + 0.15, R * (1 - railF) + cr * 1.05), yRail));
    }
    geos.push(KIT.loop(rail, o.railR || cr * 0.62, { radial: Math.round(10 * lod + 2), segments: N }));
    if (!o.low) {
      const seat = [];
      const yS = bottom + cr * 0.9;
      for (let i = 0; i < 40; i++) { const a = i / 40 * G_TAU; seat.push(new THREE.Vector3(Math.cos(a) * baseR, yS, Math.sin(a) * baseR)); }
      geos.push(KIT.loop(seat, cr * 0.7, { radial: 10, segments: 40 }));
    }
  }
  if (!geos.length) return group;
  const head = new THREE.Mesh(mergeGeometries(geos, false), o.material || ctx.metal());
  geos.forEach(function (g) { g.dispose(); });
  head.name = 'head';
  group.add(head);
  group.userData.gem = gem;
  group.userData.bottom = bottom;
  return group;
}

/* ---- 32-rings.js ---- */
/* ---- RINGS. Display pose: upright, finger axis along Z, centre stone on top (table +Y). Units: mm. ---- */

/* a value that eases from `bottom` (theta = -PI/2) to `top` (theta = PI/2) */
function glTaper(bottom, top, p) {
  return function (th) { const t = (1 + Math.sin(th)) / 2; return bottom + (top - bottom) * Math.pow(t, p || 2); };
}
function glBandMesh(ctx, o) {
  return ctx.mesh(KIT.band(Object.assign({ segments: Math.round(260 * ctx.lod), profile: Math.round(30 * ctx.lod + 8) }, o)));
}
function glClawCount(cut, carat, pref) {
  if (pref) return pref;
  if (cut === 'round') return carat >= 0.45 ? 6 : 4;
  if (cut === 'pear') return 5;
  if (cut === 'oval') return carat >= 1.6 ? 6 : 4;
  return 4;
}

/* small stones along the crest of the band, with a bead on each side between stones (pavé shoulders) */
function glShoulderPave(ctx, g, o) {
  const mats = [], beads = [];
  const ds = o.d;
  [-1, 1].forEach(function (side) {
    let th = Math.PI / 2 + side * o.from;
    const end = Math.PI / 2 + side * o.to;
    const R = function (t) { return o.inner + o.thick(t); };
    let first = true;
    while (side > 0 ? th <= end : th >= end) {
      const r = R(th);
      mats.push(KIT.onBand(th, r + 0.02, 0));
      const step = (ds + 0.16) / r;
      [-1, 1].forEach(function (zs) {
        const tb = first ? th - side * step * 0.5 : th - side * step * 0.5;
        beads.push(KIT.onBand(tb, R(tb) + 0.06, zs * (ds / 2 + 0.07), 0, ds * 0.2));
      });
      first = false;
      th += side * step;
    }
    [-1, 1].forEach(function (zs) {
      const tb = th - side * (ds + 0.16) / R(th) * 0.5;
      beads.push(KIT.onBand(tb, R(tb) + 0.06, zs * (ds / 2 + 0.07), 0, ds * 0.2));
    });
  });
  g.add(ctx.gems({ stone: 'diamond', width: ds, matrices: mats }));
  g.add(ctx.beads(beads));
}

KIT.register('ring', 'solitaire', function* (spec, ctx) {
  const g = new THREE.Group();
  const rIn = KIT.ringInner(spec.size);
  const gem = ctx.gem({ cut: spec.cut, stone: spec.stone || 'diamond', carat: spec.carat });
  const wTop = 1.72, wBot = 2.0, tTop = 1.32, tBot = 1.62;
  const W = glTaper(wBot, wTop, 2.4), T = glTaper(tBot, tTop, 2.4);
  g.add(glBandMesh(ctx, { inner: rIn, width: W, thick: T, dome: 2.3, comfort: 2.7 }));
  yield;
  const rOut = rIn + tTop;
  const lift = 0.5;
  const head = ctx.setting(gem, {
    claws: glClawCount(gem.cut, spec.carat),
    bottom: -(gem.pavilion + lift + 0.45),
    baseR: Math.min(0.92, gem.width * 0.24)
  });
  head.position.y = rOut + lift + gem.pavilion;
  g.add(head);
  yield;
  glEngrave(ctx, g, { inner: rIn, width: W, thick: T, comfort: 2.7 });
  return { object: g, view: { focus: new THREE.Vector3(0, head.position.y - gem.pavilion * 0.3, 0) } };
});

KIT.register('ring', 'halo', function* (spec, ctx) {
  const g = new THREE.Group();
  const lod = ctx.lod;
  const rIn = KIT.ringInner(spec.size);
  const gem = ctx.gem({ cut: spec.cut, stone: spec.stone || 'diamond', carat: spec.carat });
  const pave = spec.accent === 'diamond';
  const wTop = pave ? 2.15 : 1.8, wBot = 2.0, tTop = 1.4, tBot = 1.62;
  const W = glTaper(wBot, wTop, 2.2), T = glTaper(tBot, tTop, 2.2);
  g.add(glBandMesh(ctx, { inner: rIn, width: W, thick: T, dome: 2.3, comfort: 2.7 }));
  yield;
  const rOut = rIn + tTop;
  const lift = 0.75;
  const yG = rOut + lift + gem.pavilion;
  const cr = THREE.MathUtils.clamp(gem.width * 0.068, 0.34, 0.6);
  const head = ctx.setting(gem, { claws: gem.cut === 'pear' ? 5 : 4, clawR: cr, bottom: -(gem.pavilion + lift + 0.45), baseR: Math.min(0.9, gem.width * 0.22) });
  head.position.y = yG;
  g.add(head);
  yield;

  /* the halo: a ring of small diamonds on a frame just outside the claws */
  const d = THREE.MathUtils.clamp(gem.width * 0.165, 0.95, 1.38);
  const off = cr * 1.15 + d / 2 + 0.06;
  const hy = -gem.girdle / 2 - 0.3;               // halo girdle height, relative to the centre girdle
  const S = 240, path2 = [];
  for (let i = 0; i < S; i++) {
    const az = i / S * G_TAU, q = gem.outline(az), n = glOutlineNormal(gem, az);
    path2.push(new THREE.Vector2(q.x + n.x * off, q.y + n.y * off));
  }
  const cum = [0];
  for (let i = 1; i <= S; i++) cum.push(cum[i - 1] + path2[i % S].distanceTo(path2[i - 1]));
  const per = cum[S];
  const at = function (s) {
    s = ((s % per) + per) % per;
    let i = 1; while (cum[i] < s) i++;
    const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1]);
    const a = path2[(i - 1) % S], b = path2[i % S];
    const p = a.clone().lerp(b, t), tg = b.clone().sub(a).normalize();
    let nn = new THREE.Vector2(tg.y, -tg.x);
    if (nn.dot(p) < 0) nn.negate();
    return { p: p, t: tg, n: nn };
  };
  const N = Math.max(10, Math.floor(per / (d * 1.13)));
  const pitch = per / N;
  const stones = [], beads = [];
  for (let i = 0; i < N; i++) {
    const s = i * pitch + pitch * 0.5, f = at(s);
    const up = new THREE.Vector3(f.n.x * 0.2, 1, f.n.y * 0.2).normalize();
    stones.push(KIT.m4(new THREE.Vector3(f.p.x, hy, f.p.y), KIT.qUp(up)));
    const b = at(i * pitch);
    [-1, 1].forEach(function (sg) {
      beads.push(KIT.m4(new THREE.Vector3(b.p.x + b.n.x * sg * (d * 0.47), hy + d * 0.1, b.p.y + b.n.y * sg * (d * 0.47)), null, d * 0.135));
    });
  }
  const hg = new THREE.Group();
  hg.add(ctx.gems({ stone: 'diamond', width: d, matrices: stones }));
  hg.add(ctx.beads(beads));
  // frame under the halo stones: a rounded channel that hides their pavilions
  const prof = [];
  const hw = d / 2 + 0.2, top = -0.05, bot = -d * 0.78;
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * G_TAU, c = Math.cos(a), s2 = Math.sin(a);
    prof.push([glSgnPow(c, 0.45) * hw, (top + bot) / 2 + glSgnPow(s2, 0.45) * (top - bot) / 2]);
  }
  const path3 = [];
  for (let i = 0; i < Math.round(160 * lod + 40); i++) { const f = at(i / Math.round(160 * lod + 40) * per); path3.push(new THREE.Vector3(f.p.x, hy, f.p.y)); }
  hg.add(ctx.mesh(KIT.sweep(path3, prof)));
  hg.position.y = yG;
  g.add(hg);
  yield;

  /* cathedral arches: from the band shoulders up into the halo frame on both sides */
  const xH = gem.outline(0).x + off;
  const arches = [];
  [-1, 1].forEach(function (side) {             // side -1: the arch on the left (-X), +1: on the right
    const th0 = Math.PI / 2 - side * 0.62;
    const r0 = rIn + T(th0) * 0.5;
    const p0 = new THREE.Vector3(Math.cos(th0) * r0, Math.sin(th0) * r0, 0);
    const p3 = new THREE.Vector3(side * xH * 0.98, yG + hy + bot * 0.6, 0);
    const pts = [p0, new THREE.Vector3(p0.x * 0.96, (p0.y * 0.55 + p3.y * 0.45), 0), new THREE.Vector3(p3.x * 1.02, p3.y - 0.6, 0), p3];
    arches.push(KIT.tube(pts, function (t) { return 0.62 - 0.18 * t; }, { radial: 14, segments: 32 }));
  });
  g.add(ctx.mesh(mergeGeometries(arches)));
  arches.forEach(function (a) { a.dispose(); });

  if (pave) {
    const ds = Math.min(1.12, wTop * 0.52);
    const start = Math.asin(Math.min(0.95, (xH + d * 0.4) / (rOut + 0.4)));
    glShoulderPave(ctx, g, { d: ds, inner: rIn, thick: T, from: start, to: start + 0.62 });
  }
  yield;
  glEngrave(ctx, g, { inner: rIn, width: W, thick: T, comfort: 2.7 });
  return { object: g, view: { focus: new THREE.Vector3(0, yG - gem.pavilion * 0.3, 0) } };
});

KIT.register('ring', 'three-stone', function* (spec, ctx) {
  const g = new THREE.Group();
  const rIn = KIT.ringInner(spec.size);
  const gem = ctx.gem({ cut: spec.cut, stone: spec.stone || 'diamond', carat: spec.carat });
  const accent = spec.accent === 'diamond';
  const sCut = accent ? 'round' : (spec.cut === 'pear' ? 'pear' : spec.cut);
  const sStone = accent ? 'diamond' : (spec.stone || 'diamond');
  const side = { width: gem.width * 0.62 };
  const wTop = 2.15, wBot = 2.0, tTop = 1.42, tBot = 1.62;
  const W = glTaper(wBot, wTop, 2.2), T = glTaper(tBot, tTop, 2.2);
  g.add(glBandMesh(ctx, { inner: rIn, width: W, thick: T, dome: 2.3, comfort: 2.7 }));
  yield;
  const rOut = rIn + tTop;
  const lift = 0.55;
  const head = ctx.setting(gem, { claws: 4, bottom: -(gem.pavilion + lift + 0.45), baseR: Math.min(0.9, gem.width * 0.22) });
  head.position.y = rOut + lift + gem.pavilion;
  g.add(head);
  yield;
  const cr = THREE.MathUtils.clamp(gem.width * 0.072, 0.36, 0.66);
  /* the side stones sit low and close, their girdles almost touching the centre stone: each side head has two claws
     on its outer side and one shared claw in the notch between it and the centre stone; a low gallery rail along the
     top of the band joins the three baskets */
  const rails = [];
  let thMax = 0;
  [-1, 1].forEach(function (sx) {
    const sg = ctx.gem({ cut: sCut, stone: sStone, width: side.width });
    const Rs = rOut + 0.02 + sg.pavilion;
    const gap = gem.outline(0).x + sg.outline(0).x + cr * 0.55;
    const dth = gap / (Rs + 0.4);
    const th = Math.PI / 2 - sx * dth;
    const out = sx > 0 ? 0 : Math.PI;                 // local +X points to the viewer's right on the band
    const scr = THREE.MathUtils.clamp(sg.width * 0.08, 0.3, 0.5);
    const h = ctx.setting(sg, { claws: 3, az: [out - 0.85, out + 0.85, out + Math.PI], clawR: scr, low: true, bottom: -(sg.pavilion + 0.02 + 0.4), baseR: Math.min(0.75, sg.width * 0.24) });
    h.applyMatrix4(KIT.onBand(th, Rs, 0));
    g.add(h);
    thMax = Math.max(thMax, dth);
  });
  for (let i = 0; i <= 24; i++) {
    const th = Math.PI / 2 - thMax + 2 * thMax * i / 24, r = rOut + 0.32;
    rails.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0));
  }
  g.add(ctx.mesh(KIT.tube(rails, 0.42, { radial: 12, segments: 36 })));
  yield;
  glEngrave(ctx, g, { inner: rIn, width: W, thick: T, comfort: 2.7 });
  return { object: g, view: { focus: new THREE.Vector3(0, head.position.y - gem.pavilion * 0.4, 0) } };
});

KIT.register('ring', 'eternity', function* (spec, ctx) {
  const g = new THREE.Group();
  const lod = ctx.lod;
  const rIn = KIT.ringInner(spec.size);
  const cutName = ['round', 'oval', 'cushion', 'emerald'].indexOf(spec.cut) >= 0 ? spec.cut : 'round';
  const stone = spec.stone || 'diamond';
  const cut = glCut(cutName);
  const d = THREE.MathUtils.clamp(1.85 + spec.carat * 0.95, 2.05, 4.0);
  const along = cutName === 'round' ? d : cut.length * d;     // elongated stones lie along the band (east-west)
  const across = cutName === 'round' ? d : d;
  const baseTh = 0.9;
  const pav = cut.pavilion * d, gh = cut.girdle * d / 2;
  const Rg = rIn + baseTh + pav * 0.78;
  const gapC = 0.24;
  const N = Math.max(8, Math.round(G_TAU * Rg / (along + gapC)));
  const step = G_TAU / N;
  const spin = cutName === 'round' ? 0 : Math.PI / 2;
  const mats = [];
  for (let i = 0; i < N; i++) mats.push(KIT.onBand(Math.PI / 2 + i * step, Rg, 0, spin));
  g.add(ctx.gems({ cut: cutName, stone: stone, width: d, matrices: mats, bounces: 5 }));
  // base band and two gallery rails
  const bw = across * 0.78;
  g.add(glBandMesh(ctx, { inner: rIn, width: bw, thick: baseTh, dome: 2.6, comfort: 2.7 }));
  yield;
  const e = cutName === 'round' ? d * 0.34 : across * 0.42;
  const railIn = rIn + baseTh * 0.6, railTh = Rg - gh - pav * 0.55 - railIn;
  [-1, 1].forEach(function (sz) {
    const rg = KIT.band({ inner: railIn, width: 0.52, thick: Math.max(0.55, railTh), dome: 2, comfort: 2, segments: Math.round(220 * lod), profile: 16 });
    rg.translate(0, 0, sz * (across / 2 * 0.82));
    g.add(ctx.mesh(rg));
  });
  yield;
  // shared claws: one tapered post between every two stones on each edge, leaning in over both girdles
  const cr = THREE.MathUtils.clamp(d * 0.12, 0.28, 0.5);
  const yb = -(pav * 0.78) - baseTh * 0.4;
  const yt = cut.crown * d * 0.42 + cr * 0.3;
  // the foot of each claw starts inside the base band and narrows there, so it never pokes out of the band's side
  // as a bead (two rows of those read as rivets); only the slim post and the tip over the girdles show
  const zIn = Math.min(0, bw / 2 - 0.08 - cr * 0.75 - e);
  const claw = KIT.tube([new THREE.Vector3(0, yb, zIn), new THREE.Vector3(0, -pav * 0.62, zIn * 0.35 + 0.02), new THREE.Vector3(0, -gh * 2, 0.02), new THREE.Vector3(0, gh + 0.05, -cr * 0.25), new THREE.Vector3(0, yt, -cr * 0.85)],
    function (t) { return cr * (0.72 + 0.4 * THREE.MathUtils.smoothstep(t, 0, 0.3) - 0.22 * t); }, { radial: 12, segments: 26 });
  const cm = [];
  for (let i = 0; i < N; i++) {
    const th = Math.PI / 2 + (i + 0.5) * step;
    cm.push(KIT.onBand(th, Rg, e, 0));
    cm.push(KIT.onBand(th, Rg, -e, Math.PI));
  }
  const cl = ctx.instanced(claw, ctx.metal(), cm);
  g.add(cl);
  yield;
  glEngrave(ctx, g, { inner: rIn, width: function () { return bw; }, thick: function () { return baseTh; }, comfort: 2.7 });
  // framed as if it had a head, so it sits at the same scale as the solitaires beside it in a grid
  return { object: g, view: { tilt: 0.42, still: { tilt: 0.3, turn: -0.5 }, spinTilt: 0.3, focus: new THREE.Vector3(0, Rg, 0), frameExtra: [new THREE.Vector3(0, rIn + 5.4, 0)] } };
});

KIT.register('ring', 'band', function* (spec, ctx) {
  const g = new THREE.Group();
  const rIn = KIT.ringInner(spec.size);
  const W = function () { return 3.0; }, T = function () { return 1.8; };
  g.add(glBandMesh(ctx, { inner: rIn, width: W, thick: T, dome: 2.0, comfort: 2.45 }));
  yield;
  glEngrave(ctx, g, { inner: rIn, width: W, thick: T, comfort: 2.45 });
  return { object: g, view: { tilt: 0.38, still: { tilt: 0.3, turn: -0.55 }, spinTilt: 0.3, frameExtra: [new THREE.Vector3(0, rIn + 5.4, 0)] } };
});

/* ---- 34-engrave.js ---- */
/* ---- Engraving (studio only, idea 12): spec.engraving cut into the inner surface of the band at the bottom of the
   ring, as a darker, matte inscription that follows the comfort-fit curve. Three hands (spec.engraveFont):
     serif   Cormorant Garamond italic, the house hand (default)
     script  Alex Brush, flowing
     roman   Cormorant capitals, widely spaced, like a hallmark
   Every studio ring carries the (possibly empty) inscription mesh from the start, so its shader is compiled with the
   piece; glEngraveSet() then changes the words or the hand in place, without rebuilding the ring. ---- */

/* v2.3: larger letters (about two thirds of the band's width), the script hand without the extra stroke (its own
   weight is already the heaviest that stays legible at 2 mm); bevel = the blur (canvas px) that makes the cut's walls */
/* v2.4: ink = the share of the strip's height the letters' ink fills; maxK = how far above size the ink fit may go;
   band = the share of the band's width the strip covers */
const G_ENGRAVE_FONTS = {
  // v2.5 serif: Cormorant Garamond upright at 500 with +2% tracking (the light italic, thickened by its stroke and the
  // bevel's blur, read as a heavy bold italic: "Always" fused into one shape)
  serif: { css: '500 {s}px "Cormorant Garamond", "Cormorant", Garamond, Georgia, serif', size: 100, spacing: 0.02, upper: false, stroke: 0.35, bevel: 1.8, ink: 0.74, maxK: 1.15, band: 0.9 },
  script: { css: '400 {s}px "Alex Brush", "Snell Roundhand", "Segoe Script", cursive', size: 112, spacing: 2, upper: false, stroke: 0.9, bevel: 1.6, ink: 0.86, maxK: 1.45, band: 0.97 },
  roman: { css: '500 {s}px "Cormorant Garamond", "Cormorant", Garamond, Georgia, serif', size: 80, spacing: 16, upper: true, stroke: 1.0, bevel: 2.2, ink: 0.62, maxK: 1.15, band: 0.9 }
};
/* numerals are always Cormorant Infant's lining figures, upright, in every hand (the house rule; never a year in the
   script hand; the canvas draws Cormorant Infant's lining figures by default) */
const G_ENGRAVE_NUM = {
  serif: { css: '400 {s}px "Cormorant Infant", "Cormorant Garamond", Georgia, serif', k: 0.86 },
  script: { css: '400 {s}px "Cormorant Infant", "Cormorant Garamond", Georgia, serif', k: 0.8 },
  roman: { css: '500 {s}px "Cormorant Infant", "Cormorant Garamond", Georgia, serif', k: 1.05 }
};
const G_ENGRAVE_FONT = G_ENGRAVE_FONTS.serif.css.replace('{s}', 92);     // v1 name, kept
const G_ENGRAVE_W = 2048, G_ENGRAVE_H = 128;
const G_LIVE = new Set();                 // live stages, so late font loads can ask them to redraw
function glInvalidateAll() { G_LIVE.forEach(function (s) { if (s.invalidate) s.invalidate(); }); }

/* draws the words centred on the fixed canvas; returns the part of the canvas they use, as u0..u1, and its aspect */
function glDrawEngraving(canvas, text, fontName) {
  const F = G_ENGRAVE_FONTS[fontName] || G_ENGRAVE_FONTS.serif;
  if (canvas.width !== G_ENGRAVE_W || canvas.height !== G_ENGRAVE_H) { canvas.width = G_ENGRAVE_W; canvas.height = G_ENGRAVE_H; }
  const H = G_ENGRAVE_H, W = G_ENGRAVE_W;
  const g = canvas.getContext('2d');
  const N = G_ENGRAVE_NUM[fontName] || G_ENGRAVE_NUM.serif;
  const t = F.upper ? String(text || '').toUpperCase() : String(text || '');
  // runs of letters (the hand) and of numerals (Cormorant Infant, lining)
  const runs = t.split(/(\d+)/).filter(Boolean).map(function (s) { return { s: s, num: /^\d+$/.test(s) }; });
  let size = F.size;
  const setFont = function (num) {
    g.font = num ? N.css.replace('{s}', Math.round(size * N.k)) : F.css.replace('{s}', size);
    // (a spacing below 1 is a share of the size: tracking; otherwise canvas px)
    try { g.letterSpacing = (F.spacing < 1 ? F.spacing * size : F.spacing).toFixed(2) + 'px'; } catch (e) { /* older engines */ }
  };
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  // v2.4: the words are sized on their INK (the real height of these letters, ascenders and descenders included), so
  // every hand fills the strip: the script gains about a third (its glyphs sit small in their em box)
  let asc = 0, desc = 0;
  const measure = function () {
    let w = 0;
    asc = 0; desc = 0;
    runs.forEach(function (r) {
      setFont(r.num);
      const m = g.measureText(r.s);
      r.w = m.width; w += r.w;
      asc = Math.max(asc, m.actualBoundingBoxAscent || size * 0.7);
      desc = Math.max(desc, m.actualBoundingBoxDescent || size * 0.2);
    });
    return w;
  };
  let w = measure();
  const inkH = H * (F.ink || 0.8);
  if (asc + desc > 0) { size = Math.max(8, Math.min(Math.round(F.size * (F.maxK || 1.35)), Math.floor(size * inkH / (asc + desc)))); w = measure(); }
  if (w > W - 60) { size = Math.floor(size * (W - 60) / w); w = measure(); }
  g.clearRect(0, 0, W, H);
  if (!t) return { u0: 0.5, u1: 0.5, aspect: 0.05 };
  const baseY = H / 2 + (asc - desc) / 2;
  const each = function (fn) { let x = W / 2 - w / 2; runs.forEach(function (r) { setFont(r.num); fn(r.s, x); x += r.w; }); };
  // a HEIGHT map of the cut (white = the floor, black = the polished band): the letters drawn soft (the bevelled walls),
  // then a fainter crisp copy so fine strokes still reach the floor. The material reads its slope as the walls.
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  g.lineWidth = F.stroke;
  const draw = function () { each(function (s, x) { g.fillText(s, x, baseY); if (F.stroke > 0) g.strokeText(s, x, baseY); }); };
  let soft = false;
  try { g.filter = 'blur(' + F.bevel + 'px)'; soft = g.filter !== 'none'; } catch (e) { soft = false; }
  if (soft) { draw(); g.filter = 'none'; g.globalAlpha = 0.45; draw(); g.globalAlpha = 1; }
  else {
    g.save(); g.shadowColor = '#fff'; g.shadowBlur = F.bevel * 2; draw(); g.restore();
  }
  const used = Math.min(W, w + 40);
  return { u0: (W - used) / 2 / W, u1: (W + used) / 2 / W, aspect: used / H, band: F.band || 0.9 };
}

/* the strip of the inner band the inscription lies on (band frame of the ring builders) */
function glEngraveGeometry(o, d) {
  const th0 = -Math.PI / 2;
  const w = o.width(th0), t = o.thick(th0), n = o.comfort || 2.7;
  const hMM = Math.min(2.6, w * (d.band || 0.9));
  let span = hMM * d.aspect / o.inner;
  // v2.4: at most +-50 degrees of the inner wall (beyond it the words ran up the curve, away from the eye, and their
  // last letters were foreshortened to a smear); a longer inscription is set smaller instead
  const maxSpan = 1.75;
  let hEff = hMM;
  if (span > maxSpan) { hEff = hMM * maxSpan / span; span = maxSpan; }
  const SU = Math.max(24, Math.round(span * 60)), SV = 8;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= SU; i++) {
    const u = i / SU, th = th0 - span / 2 + span * u;
    for (let j = 0; j <= SV; j++) {
      const v = j / SV, a = (v - 0.5) * hEff;
      // inner (comfort) surface: |cos phi| = (2|a|/w)^(n/2), r = inner + t/2 - t/2 * |sin phi|^(2/n)
      const cphi = Math.pow(Math.min(1, Math.abs(2 * a / w)), n / 2);
      const sphi = Math.sqrt(Math.max(0, 1 - cphi * cphi));
      const r = o.inner + t / 2 - t / 2 * Math.pow(sphi, 2 / n) - 0.012;
      pos.push(Math.cos(th) * r, Math.sin(th) * r, a);
      uv.push(d.u0 + (d.u1 - d.u0) * u, 1 - v);
    }
  }
  for (let i = 0; i < SU; i++) for (let j = 0; j < SV; j++) {
    const a = i * (SV + 1) + j, b = (i + 1) * (SV + 1) + j, c = b + 1, dd = a + 1;
    idx.push(a, b, dd, b, c, dd);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // the inscription must face the ring's axis (it is read from inside the band)
  const mid = Math.round(SU / 2) * (SV + 1) + Math.round(SV / 2);
  glOrient(geo, mid, new THREE.Vector3(0, 1, 0));
  geo.computeBoundingSphere();
  return geo;
}

function glEngrave(ctx, group, o) {
  const spec = ctx.spec;
  if (ctx.detail !== 'studio') return;
  const canvas = document.createElement('canvas');
  const d = glDrawEngraving(canvas, spec.engraving, spec.engraveFont);
  const tex = ctx.track(new THREE.CanvasTexture(canvas));
  tex.anisotropy = 8;
  tex.colorSpace = THREE.NoColorSpace;
  const mat = ctx.track(glEngraveMaterial(spec.metal, tex));
  const mesh = new THREE.Mesh(glEngraveGeometry(o, d), mat);
  mesh.renderOrder = 2;
  mesh.name = 'engraving';
  mesh.visible = !!spec.engraving;
  mesh.userData.noPrepass = true;            // never in the stage's depth pre-pass (it lies on the band)
  mesh.userData.engrave = { band: o, canvas: canvas, tex: tex, text: spec.engraving, font: spec.engraveFont };
  group.add(mesh);
  glEngraveFontLoad(mesh);
}
/* the cut: the SAME metal as the band, its floor about a quarter darker and satin (roughness 0.45), its walls drawn by
   the slope of the height map (a bevel that catches the light along every letter). v1 filled the letters with near-
   black paint, which read as a smear at stage size. alphaMap = the height map (canvas, green channel). */
function glEngraveMaterial(metal, tex) {
  const base = KIT.METALS[metal] || KIT.METALS.yellow;
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setRGB(base.f0[0], base.f0[1], base.f0[2], THREE.LinearSRGBColorSpace),
    metalness: 1, roughness: 0.45, envMapIntensity: base.env || 1,
    alphaMap: tex, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  });
  mat.name = 'au-engraving';
  const texel = { value: new THREE.Vector2(1 / G_ENGRAVE_W, 1 / G_ENGRAVE_H) };
  mat.onBeforeCompile = function (sh) {
    sh.uniforms.uAuTexel = texel;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uAuTexel;\nfloat auH = 0.0;')
      .replace('#include <alphamap_fragment>', [
        'auH = texture2D(alphaMap, vAlphaMapUv).g;',
        // opaque over the whole cut, walls included (v2.3 faded the walls out with the alpha, so only a dark outline
        // round a band-coloured letter showed: it read as raised type)
        'diffuseColor.a *= smoothstep(0.0, 0.07, auH);',
        // the floor of the cut: clearly darker and satin, as the light reaches it less (v2.4's floor at about half the
        // band's brightness, satin-blurred over a lit room, came out as bright as the polish round it: raised type)
        'diffuseColor.rgb *= mix(1.0, 0.3, smoothstep(0.3, 0.85, auH));'
      ].join('\n'))
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.16, 0.42, smoothstep(0.3, 0.85, auH));')
      .replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        '{',
        '  float hx = texture2D(alphaMap, vAlphaMapUv + vec2(uAuTexel.x, 0.0)).g - texture2D(alphaMap, vAlphaMapUv - vec2(uAuTexel.x, 0.0)).g;',
        '  float hy = texture2D(alphaMap, vAlphaMapUv + vec2(0.0, uAuTexel.y)).g - texture2D(alphaMap, vAlphaMapUv - vec2(0.0, uAuTexel.y)).g;',
        '  vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition);',
        '  vec2 st0 = dFdx(vAlphaMapUv), st1 = dFdy(vAlphaMapUv);',
        '  vec3 q1p = cross(q1, normal), q0p = cross(normal, q0);',
        '  vec3 T = q1p * st0.x + q0p * st1.x, B = q1p * st0.y + q0p * st1.y;',
        '  float det = max(dot(T, T), dot(B, B));',
        '  float sc = det == 0.0 ? 0.0 : inversesqrt(det);',
        // v2.5 INCISED, checked on screen in the close-up: the floor clearly darker than the polish (above), the upper
        // wall of every stroke turned down, away from the light, in shadow, and the lower wall turned up, catching a
        // thin highlight: the light falls into the cut. (v2.4's lit floor made the letters read as raised type.)
        '  vec3 pv = (hx * T + hy * B) * sc * 1.7;',
        '  normal = normalize(normal + pv);',
        '  float lip = clamp(pv.y * 1.8, -1.0, 1.0);',
        '  float wall = smoothstep(0.03, 0.22, length(pv));',
        '  diffuseColor.rgb *= 1.0 + wall * (lip > 0.0 ? 0.6 * lip : 0.7 * lip);',
        '}'
      ].join('\n'));
  };
  mat.customProgramCacheKey = function () { return 'au-engraving-v4'; };
  return mat;
}
/* when a web font arrives after the first drawing, draw again (its widths differ from the fallback's) */
function glEngraveFontLoad(mesh) {
  const E = mesh.userData.engrave;
  if (!E.text || !document.fonts || !document.fonts.load) return;
  const F = G_ENGRAVE_FONTS[E.font] || G_ENGRAVE_FONTS.serif;
  const want = E.text + '|' + E.font;
  const N = G_ENGRAVE_NUM[E.font] || G_ENGRAVE_NUM.serif;
  const loads = [document.fonts.load(F.css.replace('{s}', F.size), E.text)];
  if (/\d/.test(E.text)) loads.push(document.fonts.load(N.css.replace('{s}', F.size), '0123456789'));
  Promise.all(loads).then(function () {
    if (E.text + '|' + E.font !== want || !mesh.parent) return;
    glEngraveSet(mesh.parent, E.text, E.font, true);
    glInvalidateAll();
  }).catch(function () { /* the fallback font stays */ });
}
/* change the words or the hand of a studio ring's inscription in place. Returns false when the piece has none. */
function glEngraveSet(root, text, font, quiet) {
  const mesh = root && root.getObjectByName ? root.getObjectByName('engraving') : null;
  if (!mesh || !mesh.userData.engrave) return false;
  const E = mesh.userData.engrave;
  text = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
  font = G_ENGRAVE_FONTS[font] ? font : 'serif';
  const d = glDrawEngraving(E.canvas, text, font);
  E.tex.needsUpdate = true;
  const old = mesh.geometry;
  mesh.geometry = glEngraveGeometry(E.band, d);
  old.dispose();
  mesh.visible = !!text;
  const changed = E.text !== text || E.font !== font;
  E.text = text; E.font = font;
  if (changed && !quiet) glEngraveFontLoad(mesh);
  return true;
}

/* ---- 40-stage.js ---- */
/* ---- Live stages (hero, studio, compare, the scenes): one renderer per stage, canvas filling the container, render
   on demand. A stage holds its pieces in "slots" (a slot = one built piece with its own fade, scale and extra turn), so
   an outgoing and an incoming piece can overlap during a swap. The hero scales every piece to one size (G_UNIT_R), so
   its camera never moves; the studio keeps millimetres and frames each piece with an eased dolly.

   v2 smoothness:
   - glIdle(fn, ms): heavy steps (a renderer, an environment, a build) run one at a time in idle slices.
   - The lighting of a new stage is prepared asynchronously (20-env.js); the stage draws nothing until it is ready,
     and compile() waits for it, so shaders are compiled once, off the main thread, with the right environment.
   - Adaptive resolution: the pixel ratio starts at the tier's cap, drops a step when frames take longer than 18 ms
     for a while, and climbs back once the stage is idle (or frames are fast again).
   - A fading piece dissolves as one solid image: a depth pre-pass per fading slot, so its back and inner parts never
     show through its front (v1 looked like an X-ray during every swap).
   - Stages pause off screen, in hidden tabs and when nothing moves; they wake on demand. ---- */

/* ---------------- idle slices ----------------
   glIdle(fn, est) runs fn in an idle period and resolves with its result. fn may be a GENERATOR function: its work is
   then cut into steps (each `yield` is a point where it may pause until the next idle period; yielding a Promise
   waits for it and hands its value back), and as many steps run per idle period as fit in G_SLICE ms. Nothing runs
   while the page scrolls or changes page (glBusy), however long that lasts: a page that scrolls for a while simply
   gets its prewarm later. Any step over 16 ms is recorded in G_SLOW (AUGL._dev.slow). */
const G_IDLE = { q: [], scheduled: false };
const G_SLICE = 8;
const G_GEN_PROTO = Object.getPrototypeOf(function* () { /* generator */ });
function glIsGen(fn) { return typeof fn === 'function' && Object.getPrototypeOf(fn) === G_GEN_PROTO; }
function glIdle(fn, est) {
  return new Promise(function (resolve, reject) {
    G_IDLE.q.push({ fn: fn, gen: glIsGen(fn), it: null, last: undefined, est: Math.min(G_SLICE, est || 8), need: 0, resolve: resolve, reject: reject, t: performance.now(), w: 0, n: 0 });
    glIdlePump();
  });
}
function glIdlePump() {
  if (G_IDLE.scheduled || !G_IDLE.q.length) return;
  G_IDLE.scheduled = true;
  const again = function (ms) { G_IDLE.scheduled = true; setTimeout(function () { G_IDLE.scheduled = false; glIdlePump(); }, ms); };
  const run = function (dl) {
    G_IDLE.scheduled = false;
    const job = G_IDLE.q[0];
    if (!job) return;
    const fast = G_STILL_FAST.on, hidden = document.hidden;
    const now = performance.now();
    // never in the middle of a scroll or a page change, however long it lasts
    if (!fast && !hidden && glBusy()) { job.w = 0; again(140); return; }
    const left = dl && !dl.didTimeout ? dl.timeRemaining() : (fast || hidden ? 50 : 6);
    // wait a little for an idle period long enough for one step (a step is at most G_SLICE ms by design); on a busy
    // or very fast display (a live stage drawing every frame at 120 Hz+) idle periods stay short: then one step runs
    // anyway every so often, which costs a frame at most a few milliseconds.
    // v2.5: a step that is known to be long and cannot be cut (a fresh WebGL context's first shader program: 24-34 ms)
    // is announced by the step before it (`yield { need: ms }`): it waits for an idle period that long (the browser
    // grants up to 50 ms when nothing is animating), up to 2.5 s, and then runs alone in its slice
    const need = job.need || job.est;
    if (!fast && !hidden && left < need) {
      if (!job.w) job.w = now;
      if (now - job.w < (job.need ? 2500 : 90)) { glIdlePump(); return; }
    }
    job.w = 0;
    const solo = !!job.need;
    job.need = 0;
    const budget = fast ? 40 : Math.max(job.est, Math.min(G_SLICE, left - 1));
    const t0 = performance.now();
    let tStep = t0;
    try {
      if (!job.gen) {
        G_IDLE.q.shift();
        const r = job.fn();
        glSlow('idle:' + (job.fn.name || job.est), performance.now() - t0);
        Promise.resolve(r).then(job.resolve, job.reject);
      } else {
        if (!job.it) job.it = job.fn();
        for (;;) {
          tStep = performance.now();
          const res = job.it.next(job.last);
          job.last = undefined;
          job.n++;
          glSlow('idle:' + (job.fn.name || 'gen') + '#' + job.n, performance.now() - tStep);
          if (res.done) { G_IDLE.q.shift(); job.resolve(res.value); break; }
          const v = res.value;
          if (v && typeof v.then === 'function') {
            // the step waits for something (a parallel compile): the queue moves on meanwhile; the job comes back
            // to the front of the queue when it is ready
            G_IDLE.q.shift();
            v.then(function (x) { job.last = x; G_IDLE.q.unshift(job); glIdlePump(); },
              function (e) { try { job.it.throw(e); } catch (er) { job.reject(er); glIdlePump(); return; } G_IDLE.q.unshift(job); glIdlePump(); });
            break;
          }
          // the next step wants an idle period of its own
          if (v && typeof v.need === 'number') { job.need = Math.min(48, v.need); break; }
          if (solo || performance.now() - t0 >= budget - 1) break;
        }
      }
    } catch (e) {
      if (G_IDLE.q[0] === job) G_IDLE.q.shift();
      job.reject(e);
    }
    glIdlePump();
  };
  if (G_STILL_FAST.on) setTimeout(function () { run(null); }, 0);
  else if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 250 });
  else setTimeout(function () { run(null); }, 16);
}
/* the prerender tool turns politeness off (46-stills.js sets it) */
const G_STILL_FAST = { on: false };
/* integrator: the page is busy while it scrolls (and for 220 ms after the last scroll) and while a page transition
   runs (atmos sets html.vt-on). Idle work (glIdle here, AUSB.later in the scenes) waits for a calm moment, so a
   slice of building or compiling never lands inside a scroll or a page change. */
const G_BUSY = { t: -1e9, on: false };
function glBusy() {
  if (!G_BUSY.on) {
    G_BUSY.on = true;
    const mark = function () { G_BUSY.t = performance.now(); };
    ['wheel', 'scroll', 'touchmove'].forEach(function (ev) { window.addEventListener(ev, mark, { passive: true, capture: true }); });
  }
  return performance.now() - G_BUSY.t < 220 || document.documentElement.classList.contains('vt-on');
}
glBusy();
/* resolves once the page has been calm (no scroll, no page transition) for ms milliseconds */
function glCalm(ms) {
  return new Promise(function (res) {
    let since = 0;
    const chk = function () {
      const now = performance.now();
      if (glBusy()) since = 0; else if (!since) since = now;
      if (since && now - since >= ms) res(); else setTimeout(chk, 50);
    };
    chk();
  });
}
/* a small record of any engine step that took longer than 16 ms (AUGL._dev.slow), for checking the budgets */
const G_SLOW = [];
function glSlow(what, ms) { if (ms > 16) { G_SLOW.push([what, Math.round(ms), Math.round(performance.now())]); if (G_SLOW.length > 60) G_SLOW.shift(); } }

/* ---------------- the visitor's activity (a turntable may rest when nobody has touched the page for a while) ---------------- */
const G_ACT = { t: performance.now(), subs: new Set(), on: false };
function glActivity(fn) {
  if (!G_ACT.on) {
    G_ACT.on = true;
    const ping = function () {
      const now = performance.now(), was = now - G_ACT.t > 1500;
      G_ACT.t = now;
      if (was) G_ACT.subs.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
    };
    ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (ev) {
      window.addEventListener(ev, ping, { passive: true, capture: true });
    });
  }
  G_ACT.subs.add(fn);
  return function () { G_ACT.subs.delete(fn); };
}

/* Shader error checks off in production (on with ?gldebug in the address). With them on, three reads every program's
   info log on its first use, which blocks until the driver has finished compiling, so KHR_parallel_shader_compile
   gains nothing and a first draw can stall for hundreds of milliseconds. Every renderer on the page gets this default,
   the scenes' own renderers too: WebGLRenderer assigns `this.debug = {…}` in its constructor, which lands in this
   setter. */
const G_GLDEBUG = (function () { try { return /[?&#]gldebug\b/.test(location.search + location.hash); } catch (e) { return false; } })();
(function () {
  try {
    const P = THREE.WebGLRenderer.prototype;
    if (Object.getOwnPropertyDescriptor(P, 'debug')) return;
    Object.defineProperty(P, 'debug', {
      configurable: true,
      get: function () { return undefined; },
      set: function (v) {
        if (v && typeof v === 'object' && !G_GLDEBUG) v.checkShaderErrors = false;
        Object.defineProperty(this, 'debug', { value: v, writable: true, configurable: true, enumerable: true });
      }
    });
  } catch (e) { /* each renderer is set below anyway */ }
})();
function glRenderer(canvas, preserve) {
  const r = new THREE.WebGLRenderer({
    canvas: canvas, antialias: true, alpha: true, premultipliedAlpha: true,
    powerPreference: 'high-performance', preserveDrawingBuffer: !!preserve
  });
  try { r.debug.checkShaderErrors = G_GLDEBUG; } catch (e) { /* ignore */ }
  r.setClearColor(0x000000, 0);
  r.toneMapping = THREE.NeutralToneMapping;
  r.toneMappingExposure = 1.0;
  r.outputColorSpace = THREE.SRGBColorSpace;
  glHardenRenderer(r);
  return r;
}
/* integrator: a stage can be disposed (its page left) while three is still compiling its shaders. three's own
   compileAsync keeps polling then, and reads the program of a material that no longer has one ("Cannot read
   properties of undefined (reading 'isReady')"); a draw or a first use after the context is lost reads a shader log
   that is null ("… reading 'trim'"). Both surfaced as page errors on leaving /piece and /atelier. Here compileAsync
   is the same algorithm (compile, then poll KHR_parallel_shader_compile every 10 ms) but stops when the renderer is
   gone and treats a vanished program as done; and once a renderer is disposed or its context lost, three no longer
   reads shader logs. */
/* the readiness poll of a parallel compile: in idle time (a check is a few cheap queries) */
function glPoll(fn) {
  if (window.requestIdleCallback && !G_STILL_FAST.on) requestIdleCallback(fn, { timeout: 40 }); else setTimeout(fn, 10);
}
function glHardenRenderer(r) {
  if (!r || r.__auHard) return r;
  r.__auHard = true;
  const dead = function () { r.__auDead = true; try { r.debug.checkShaderErrors = false; } catch (e) { /* ignore */ } };
  if (typeof r.compile === 'function') {
    r.compileAsync = function (scene, camera, target) {
      let mats;
      try { mats = r.compile(scene, camera, target || null); } catch (e) { return Promise.reject(e); }
      if (!mats || typeof mats.forEach !== 'function') return Promise.resolve(scene);
      let par = null;
      try { par = r.extensions && r.extensions.get('KHR_parallel_shader_compile'); } catch (e) { par = null; }
      return new Promise(function (resolve) {
        const check = function () {
          if (r.__auDead) { resolve(scene); return; }
          mats.forEach(function (m) {
            let ok = true;
            try { const p = r.properties.get(m).currentProgram; ok = !p || p.isReady(); } catch (e) { ok = true; }
            if (ok) mats.delete(m);
          });
          if (mats.size === 0) { resolve(scene); return; }
          glPoll(check);
        };
        if (par) check(); else glPoll(check);
      });
    };
  }
  const d = r.dispose, f = r.forceContextLoss;
  r.dispose = function () { dead(); return d.apply(r, arguments); };
  if (typeof f === 'function') r.forceContextLoss = function () { dead(); return f.apply(r, arguments); };
  try { r.domElement.addEventListener('webglcontextlost', dead); } catch (e) { /* ignore */ }
  return r;
}
const G_EXPOSURE = { dark: 1.0, light: 1.0 };
const G_UNIT_R = 10;
const G_SWITCH_DUR = 0.7;          // the page's colour crossfade (html.is-switching) lasts about this long
const G_LIGHT_DUR = 0.95;          // a light switch in the studio
function glEaseInOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
function glEaseOut(k) { return 1 - Math.pow(1 - k, 3); }
function glSmooth(k) { k = Math.max(0, Math.min(1, k)); return k * k * k * (k * (k * 6 - 15) + 10); }   // smootherstep

/* pose helpers shared by stages and stills */
function glPosePoints(points, center, tilt, turn) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0));
  const r = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, 0));
  q.multiply(r);
  return points.map(function (p) { return p.clone().sub(center).applyQuaternion(q); });
}
/* where a posed piece touches the floor: the lowest y, and the centre and half extents of the points within a thin
   band above it (so the contact core sits under the real contact: the lowest arc of a bangle, not its middle) */
function glContact(ps, r, out) {
  out = out || {};
  let minY = Infinity;
  for (let i = 0; i < ps.length; i++) if (ps[i].y < minY) minY = ps[i].y;
  const band = r * 0.14;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (p.y < minY + band) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.z < z0) z0 = p.z; if (p.z > z1) z1 = p.z; }
  }
  out.y = minY; out.cx = (x0 + x1) / 2; out.cz = (z0 + z1) / 2;
  out.fx = Math.max((x1 - x0) / 2, r * 0.16); out.fz = Math.max((z1 - z0) / 2, r * 0.12);
  return out;
}
/* floor (lowest point over a full turn) and the contact footprint at turn 0 */
function glFloor(measure, tilt, turns, center) {
  let minY = Infinity;
  const n = turns || 8, c = center || measure.center;
  let first = null;
  for (let i = 0; i < n; i++) {
    const ps = glPosePoints(measure.points, c, tilt, i / n * G_TAU);
    ps.forEach(function (p) { if (p.y < minY) minY = p.y; });
    if (i === 0) first = ps;
  }
  const f = glContact(first, measure.radius);
  f.y = minY;
  return f;
}

/* camera framing: the distance D along `dir` (unit vector from the target to the camera) and the target, so that
   every point projects inside the frame with margins mg = { t, b, l, r } (fractions of the frame's height / width) */
function glFrameFit(points, dir, fov, aspect, mg) {
  const tv = Math.tan(THREE.MathUtils.degToRad(fov) / 2), th = tv * aspect;
  const up0 = Math.abs(dir.y) > 0.985 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up0, dir).normalize();
  const vup = new THREE.Vector3().crossVectors(dir, right).normalize();
  const sx = Math.max(0.2, 1 - mg.l - mg.r), sy = Math.max(0.2, 1 - mg.t - mg.b);
  const cx = (mg.l - mg.r) * th, cy = (mg.b - mg.t) * tv;   // where the centre of the bounds must land (tangent units)
  const target = new THREE.Vector3();
  points.forEach(function (p) { target.add(p); });
  target.multiplyScalar(1 / Math.max(1, points.length));
  let R = 0;
  points.forEach(function (p) { R = Math.max(R, p.distanceTo(target)); });
  let D = Math.max(1e-3, R) / Math.min(tv * sy, th * sx) + R;
  const q = new THREE.Vector3();
  for (let it = 0; it < 7; it++) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, zmax = 0;
    for (let i = 0; i < points.length; i++) {
      q.copy(points[i]).sub(target);
      const z = q.dot(dir), k = Math.max(1e-3, D - z);
      const px = q.dot(right) / k, py = q.dot(vup) / k;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      if (z > zmax) zmax = z;
    }
    const need = Math.max((x1 - x0) / 2 / (th * sx), (y1 - y0) / 2 / (tv * sy));
    target.addScaledVector(right, ((x0 + x1) / 2 - cx) * D).addScaledVector(vup, ((y0 + y1) / 2 - cy) * D);
    D = Math.max(zmax * 1.05 + 1e-3, D * need);
  }
  return { target: target, D: D };
}

/* every material of a live piece fades with its slot: transparent from the start (set before the shaders compile,
   so a fade never triggers a recompile); at opacity 1 they draw exactly like opaque ones (depth is still written) */
function glPrepFade(root) {
  const mats = [];
  root.traverse(function (o) {
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
      if (mats.indexOf(m) >= 0) return;
      mats.push(m);
      m.userData.auOpacity = m.opacity;
      m.transparent = true;
    });
  });
  return mats;
}
function glSlotOpacity(slot, a) {
  if (slot.shownAlpha === a) return;
  slot.shownAlpha = a;
  slot.g.visible = a > 0.002;
  slot.mats.forEach(function (m) {
    if (m.uniforms && m.uniforms.uOpacity) m.uniforms.uOpacity.value = a;
    else m.opacity = (m.userData.auOpacity == null ? 1 : m.userData.auOpacity) * a;
  });
}

/* ---------------- drawing pieces that fade as solid objects ---------------- */
const G_PREPASS = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
G_PREPASS.name = 'au-prepass';
/* hide everything except `obj` and the chain of groups that holds it; returns the undo */
function glOnly(obj) {
  const hidden = [];
  let o = obj;
  while (o && o.parent) {
    const p = o.parent;
    for (let i = 0; i < p.children.length; i++) { const c = p.children[i]; if (c !== o && c.visible) { c.visible = false; hidden.push(c); } }
    o = p;
  }
  return function () { for (let i = 0; i < hidden.length; i++) hidden[i].visible = true; };
}
function glNoPrepass(slot) {
  if (!slot.noPrepass) {
    slot.noPrepass = [];
    slot.g.traverse(function (o) {
      if (!o.isMesh) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (o.userData.noPrepass || (m && m.userData && m.userData.auNoDepth)) slot.noPrepass.push(o);
    });
  }
  return slot.noPrepass;
}
/* v2.4 a fading piece is a fading PICTURE: it is drawn fully opaque into an offscreen target (the same tone mapping and
   sRGB output as the canvas, so the very same compiled shaders), and that image is laid over the canvas with the
   slot's opacity. Per-material opacity made every stone a translucent, page-tinted ghost and let far links show
   through near ones; a crossfade of solid images never does. The target is marked as an "XR" target only so three
   renders into it exactly as into the canvas (tone mapped, sRGB encoded, stored as plain RGBA8). */
const G_FADE = { mat: null, scene: null, cam: null };
function glFadeMaterial() {
  if (!G_FADE.mat) {
    const mat = new THREE.ShaderMaterial({
      name: 'au-fade',
      uniforms: {
        tex: { value: null }, uA: { value: 1 }, uSize: { value: new THREE.Vector2(1, 1) }, uClip: { value: new THREE.Vector4(0, 0, 1e5, 1e5) },
        uBox: { value: new THREE.Vector4(0, 0, 1, 1) }, uWipe: { value: new THREE.Vector3(-1, 1, 0.22) }
      },
      vertexShader: 'void main() { gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }',
      // v2.5 the swap's sweep (uWipe.x >= 0): the piece is never a see-through, background-tinted ghost; a soft line
      // rises across it (from its lower left to its upper right) and the piece is either wholly there or not, behind
      // and ahead of the line. Along the line itself a single sheen, so the narrow soft band reads as light passing,
      // not as a fade. uWipe: progress, reveal (1) or hide (0), softness (in units of the piece's box).
      fragmentShader: 'uniform sampler2D tex; uniform float uA; uniform vec2 uSize; uniform vec4 uClip; uniform vec4 uBox; uniform vec3 uWipe;\n' +
        'void main() { vec2 p = gl_FragCoord.xy; if (p.x < uClip.x || p.y < uClip.y || p.x > uClip.z || p.y > uClip.w) discard;\n' +
        '  vec4 c = texture2D(tex, p / uSize); float a = uA;\n' +
        '  if (uWipe.x >= 0.0) {\n' +
        '    vec2 q = clamp((p - uBox.xy) / max(uBox.zw - uBox.xy, vec2(1.0)), 0.0, 1.0);\n' +
        '    float u = dot(q, vec2(0.28, 0.96)) / 1.24;\n' +
        '    float m = clamp((uWipe.x * (1.0 + uWipe.z) - u) / uWipe.z, 0.0, 1.0); m = m * m * (3.0 - 2.0 * m);\n' +
        '    a = uWipe.y > 0.5 ? m : 1.0 - m;\n' +
        '    float l = 4.0 * m * (1.0 - m);\n' +
        '    c.rgb = c.rgb * (1.0 + 0.5 * l) + c.a * l * vec3(0.30, 0.28, 0.26);\n' +
        '  }\n' +
        '  gl_FragColor = c * a; }',
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor
    });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    q.frustumCulled = false;
    G_FADE.scene = new THREE.Scene();
    G_FADE.scene.add(q);
    G_FADE.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    G_FADE.mat = mat;
    G_FADE.quad = q;
  }
  return G_FADE.mat;
}
/* the renderer's fade target, sized to its drawing buffer (made once, resized when the canvas is) */
const G_TMPV2 = new THREE.Vector2(), G_TMPV4 = new THREE.Vector4();
function glFadeTarget(r) {
  const sz = r.getDrawingBufferSize(G_TMPV2);
  const w = Math.max(1, Math.floor(sz.x)), h = Math.max(1, Math.floor(sz.y));
  let t = r.__auFadeRT;
  if (!t) {
    t = new THREE.WebGLRenderTarget(w, h, { samples: G_TIER.msaa || 0, depthBuffer: true, generateMipmaps: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    t.texture.colorSpace = THREE.SRGBColorSpace;
    t.texture.internalFormat = 'RGBA8';          // the encoded values as they are (no second sRGB step in the resolve)
    t.isXRRenderTarget = true;                   // tone mapped and sRGB encoded, like the canvas (see above)
    r.__auFadeRT = t;
    const d = r.dispose;
    r.dispose = function () { try { t.dispose(); } catch (e) { /* gone */ } return d.apply(r, arguments); };
  } else if (t.width !== w || t.height !== h) t.setSize(w, h);   // (three remakes its buffers on the next use)
  return t;
}
/* the scene as usual when every piece is fully shown; while one fades: the rest of the scene first, then each piece:
   a fully shown one directly, a fading one as a picture (above), then the glints on top. rect (optional): the part of
   the drawing buffer the pieces can cover, in device pixels from the bottom left ({ x, y, w, h }) */
function glDrawLayered(r, scene, camera, slots, glintsGroup, rect) {
  let fading = false;
  for (let i = 0; i < slots.length; i++) { const s = slots[i]; if (s.g.visible && s.alpha < 0.999) { fading = true; break; } }
  if (!fading) { r.render(scene, camera); return; }
  // into the canvas: pictures; into a target of its own (the loupe's): the depth pre-pass way below
  if (r.getRenderTarget() === null && !r.__auNoFadeRT) {
    try { glDrawFadePictures(r, scene, camera, slots, glintsGroup, rect); return; }
    catch (e) { r.__auNoFadeRT = true; console.error('[Aurelia GL] fade target failed, fading by opacity', e); try { r.setRenderTarget(null); } catch (er) { /* ignore */ } }
  }
  const auto = r.autoClear;
  r.autoClear = false;
  r.clear();
  const shown = slots.map(function (s) { return s.g.visible; });
  slots.forEach(function (s) { s.g.visible = false; });
  const gv = !!(glintsGroup && glintsGroup.visible);
  if (glintsGroup) glintsGroup.visible = false;
  r.render(scene, camera);
  slots.forEach(function (s, i) {
    if (!shown[i]) return;
    s.g.visible = true;
    const undo = glOnly(s.g);
    r.clearDepth();
    if (s.alpha < 0.999) {
      const np = glNoPrepass(s), was = np.map(function (m) { return m.visible; });
      np.forEach(function (m) { m.visible = false; });
      scene.overrideMaterial = G_PREPASS;
      try { r.render(scene, camera); } finally { scene.overrideMaterial = null; }
      np.forEach(function (m, k) { m.visible = was[k]; });
    }
    r.render(scene, camera);
    undo();
    s.g.visible = false;
  });
  slots.forEach(function (s, i) { s.g.visible = shown[i]; });
  if (glintsGroup && gv) {
    glintsGroup.visible = true;
    const undo = glOnly(glintsGroup);
    r.render(scene, camera);
    undo();
  }
  r.autoClear = auto;
}
/* the slot's bounding sphere on screen, as a box in drawing-buffer pixels (from the bottom left): the sweep's frame */
/* the piece's silhouette box on screen, in drawing-buffer pixels (from the bottom left): the sweep's frame. From a few
   hundred of its measured surface points, so the line spends its time on the piece, not on empty air around it. */
const G_WV = new THREE.Vector3(), G_WP = new THREE.Vector3(), G_WM = new THREE.Matrix4();
function glWipeBox(s, camera, vp, out) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const pts = s.measure && s.measure.points;
  if (pts && pts.length) {
    if (!s.wipePts) { const st = Math.max(1, Math.floor(pts.length / 320)); s.wipePts = pts.filter(function (p, i) { return i % st === 0; }); }
    G_WM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(s.holder.matrixWorld);
    for (let i = 0; i < s.wipePts.length; i++) {
      G_WP.copy(s.wipePts[i]).applyMatrix4(G_WM);
      const x = vp.x + (G_WP.x * 0.5 + 0.5) * vp.z, y = vp.y + (G_WP.y * 0.5 + 0.5) * vp.w;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  } else {
    G_WV.setFromMatrixPosition(s.g.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    const rad = s.measure.radius * s.k * (s.s || 1) * 0.92;
    for (let i = 0; i < 4; i++) {
      G_WP.set(G_WV.x + (i & 1 ? rad : -rad), G_WV.y + (i & 2 ? rad : -rad), Math.min(G_WV.z + rad, -1e-3)).applyMatrix4(camera.projectionMatrix);
      const x = vp.x + (G_WP.x * 0.5 + 0.5) * vp.z, y = vp.y + (G_WP.y * 0.5 + 0.5) * vp.w;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  // a little air, so the soft line starts and ends just off the metal
  const px = (x1 - x0) * 0.04, py = (y1 - y0) * 0.04;
  x0 -= px; x1 += px; y0 -= py; y1 += py;
  if (!(x1 > x0 && y1 > y0)) { x0 = vp.x; y0 = vp.y; x1 = vp.x + vp.z; y1 = vp.y + vp.w; }
  out.set(x0, y0, x1, y1);
}
function glDrawFadePictures(r, scene, camera, slots, glintsGroup, rect) {
  const auto = r.autoClear;
  const vp = r.getCurrentViewport(G_TMPV4).clone();
  const rt = glFadeTarget(r);
  const mat = glFadeMaterial();
  // the part of the buffer to clear, draw and lay over: the viewport, cut to rect when one is given
  let x0 = vp.x, y0 = vp.y, x1 = vp.x + vp.z, y1 = vp.y + vp.w;
  if (rect) { x0 = Math.max(x0, Math.floor(rect.x) - 2); y0 = Math.max(y0, Math.floor(rect.y) - 2); x1 = Math.min(x1, Math.ceil(rect.x + rect.w) + 2); y1 = Math.min(y1, Math.ceil(rect.y + rect.h) + 2); }
  if (x1 <= x0 || y1 <= y0) { x0 = vp.x; y0 = vp.y; x1 = vp.x + vp.z; y1 = vp.y + vp.w; }
  rt.viewport.copy(vp);
  rt.scissor.set(x0, y0, x1 - x0, y1 - y0);
  rt.scissorTest = true;
  mat.uniforms.tex.value = rt.texture;
  mat.uniforms.uSize.value.set(rt.width, rt.height);
  mat.uniforms.uClip.value.set(x0, y0, x1, y1);
  r.autoClear = false;
  const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
  const shown = slots.map(function (s) { return s.g.visible; });
  slots.forEach(function (s) { s.g.visible = false; });
  const gv = !!(glintsGroup && glintsGroup.visible);
  if (glintsGroup) glintsGroup.visible = false;
  try {
    r.clear();
    r.render(scene, camera);
    slots.forEach(function (s, i) {
      if (!shown[i]) return;
      s.g.visible = true;
      const undo = glOnly(s.g);
      try {
        if (s.alpha >= 0.999) { r.clearDepth(); r.render(scene, camera); return; }
        // the piece, solid, into the target ...
        const a = s.alpha;
        glSlotOpacity(s, 1);
        try {
          r.setRenderTarget(rt);
          r.setClearColor(0x000000, 0);
          // (a depth-write-less draw before this one, the contact shadow, leaves the depth mask off: the clear would
          // then leave the target's depth as it was and nothing would pass the depth test)
          r.state.buffers.depth.setMask(true);
          r.state.buffers.color.setMask(true);
          r.clear(true, true, false);
          r.render(scene, camera);
        } finally { r.setRenderTarget(null); r.setClearColor(cc, ca); glSlotOpacity(s, a); }
        // ... and laid over the canvas as one picture (swept in or out, or faded by the slot's opacity)
        if (s.wipe) {
          glWipeBox(s, camera, vp, mat.uniforms.uBox.value);
          mat.uniforms.uWipe.value.set(Math.max(0, Math.min(1, s.wipe.p)), s.wipe.reveal ? 1 : 0, 0.075);
          mat.uniforms.uA.value = 1;
        } else {
          mat.uniforms.uWipe.value.x = -1;
          mat.uniforms.uA.value = a;
        }
        r.render(G_FADE.scene, G_FADE.cam);
      } finally { undo(); s.g.visible = false; }
    });
    // the glints on top (still without auto clear: it would wipe the canvas)
    if (glintsGroup && gv) {
      glintsGroup.visible = true;
      const undo = glOnly(glintsGroup);
      try { r.render(scene, camera); } finally { undo(); }
    }
  } finally {
    slots.forEach(function (s, i) { s.g.visible = shown[i]; });
    if (glintsGroup) glintsGroup.visible = gv;
    r.autoClear = auto;
  }
}

const G_TMPM = new THREE.Matrix4();
function GlStage(container, o) {
  const self = this, tNew = performance.now();
  o = o || {};
  this.kind = o.kind;
  this.container = container;
  this.normalize = o.normalize !== false;
  this.layer = !!o.layer;            // a fixed full-viewport layer (hero with an anchor): never takes the pointer
  try { if (getComputedStyle(container).position === 'static') container.style.position = 'relative'; } catch (e) { /* ignore */ }
  const canvas = this.canvas = document.createElement('canvas');
  canvas.className = 'augl-canvas augl-canvas--' + o.kind;
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;outline:none;' +
    '-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;' +
    (this.layer ? 'pointer-events:none;' : 'touch-action:pan-y;cursor:grab;');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', o.label || 'A piece of Aurelia jewelry, shown in 3D');
  canvas.setAttribute('draggable', 'false');
  container.appendChild(canvas);
  // v2.4: the WebGL context is made later, in an idle slice of its own, once the page is calm (after a page
  // transition, 300 ms after it ends): making it is the single most expensive step of a stage (20-60 ms) and it landed
  // in the middle of the product page's arrival. Everything below that does not need it is ready now.
  this.renderer = null;
  this.dprCap = Math.max(0.5, Math.min(G_TIER.dprCap, window.devicePixelRatio || 1));
  this.dprMin = Math.min(this.dprCap, G_TIER.dprMin);
  this.dpr = this.dprCap;
  this.scene = new THREE.Scene();
  this.camera = new THREE.PerspectiveCamera(o.fov || 27, 1, 1, 5000);
  this.rig = new THREE.Group(); this.tiltG = new THREE.Group(); this.turnG = new THREE.Group();
  this.scene.add(this.rig); this.rig.add(this.tiltG); this.tiltG.add(this.turnG);
  this.shadow = new GlShadow(this.scene);
  this.glints = new GlGlints(this.scene, 3);
  this.glintOn = true;
  this.slots = [];
  this.slot = null;
  this.piece = null;
  this.radius = G_UNIT_R;
  this.viewRect = null;              // { x, y, w, h } (CSS px in the canvas): draw the camera's frame into this rect
  // lighting: the light preset and the page mode; the environment arrives asynchronously
  this.light = glLightName(o.light || 'studio');
  this.mode = AU.getMode ? AU.getMode() : 'dark';
  this.env = null;
  this._envTok = 0;
  this.applyLook(glLightLook(this.light, this.mode), this.mode);
  this.envReady = new Promise(function (res) { self._envRes = res; });
  this.visible = true; this.paused = false; this.dirty = true; this.lost = false;
  this.size = { w: 0, h: 0 };
  this._tick = function (t, dt) { self.frame(t, dt); };
  this.untick = null;
  // never resized in the middle of a page transition (the layout moves for its whole length): once, after it
  this.ro = new ResizeObserver(function () { self.resizeSoon(); });
  this.ro.observe(container);
  // coming into view: the first frame waits for an idle moment (at most 120 ms), so it never lands inside a scroll frame
  this.io = new IntersectionObserver(function (es) {
    const was = self.visible;
    self.visible = es[es.length - 1].isIntersecting;
    if (!self.visible || was) { if (self.visible) self.invalidate(); return; }
    if (window.requestIdleCallback && !G_STILL_FAST.on) {
      if (self._resumeT) cancelIdleCallback(self._resumeT);
      self._resumeT = requestIdleCallback(function () { self._resumeT = 0; if (!self.disposed) self.invalidate(); }, { timeout: 120 });
    } else self.invalidate();
  }, { rootMargin: '120px' });
  this.io.observe(container);
  this.offs = [
    AU.on('mode', function (m) { self.setMode(m); }),
    AU.on('reduced', function () { self.invalidate(); })
  ];
  this.onVis = function () { if (!document.hidden) self.invalidate(); };
  document.addEventListener('visibilitychange', this.onVis);
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; self.sleep(); });
  canvas.addEventListener('webglcontextrestored', function () {
    self.lost = false; glEnvDispose(self.renderer); self.env = null; self.envX = null;
    self.switchEnv(self.light, self.mode, true);
  });
  G_LIVE.add(this);
  this.resize();
  this.firstDrawn = new Promise(function (res) { self._onFirst = res; });
  const vt = document.documentElement.classList.contains('vt-on');
  this.rendererReady = glCalm(vt ? 300 : 0).then(function () {
    return self.disposed ? null : glIdle(function stageRenderer() {
      if (self.disposed) return null;
      const t0 = performance.now();
      const r = self.renderer = glRenderer(canvas, false);
      r.setPixelRatio(self.dpr);
      r.setSize(Math.max(1, self.size.w), Math.max(1, self.size.h), false);
      r.toneMappingExposure = self.look.exposure;
      glSlow('stage:renderer', performance.now() - t0);
      return r;
    }, 8);
  });
  this.rendererReady.catch(function (e) { if (!self.disposed) console.error('[Aurelia GL] stage renderer failed', e); });
  this.switchEnv(this.light, this.mode, true);
  glSlow('stage:new', performance.now() - tNew);
  // once the first picture is out, prepare the other mode's room in idle time, so a mode switch is light
  this.firstDrawn.then(function () {
    setTimeout(function () {
      if (self.disposed) return;
      glEnvAsync(self.renderer, self.light, self.mode === 'light' ? 'dark' : 'light').catch(function () { /* later */ });
    }, 1400);
  });
}
/* resolves once the stage's lighting is in place (compile() waits for it) */
GlStage.prototype.prepare = function () { return this.envReady; };
GlStage.prototype.applyLook = function (look, mode) {
  this.look = Object.assign({ mode: mode }, look);
  if (this.renderer) this.renderer.toneMappingExposure = look.exposure;
  this.envLight = look.envLight;
  this.shadow.blend(mode, mode, 1, look.shadow, look.shadow);
  this.glints.keys = look.keys;
};
GlStage.prototype.setEnvNow = function (tex, look, mode, gemTex) {
  this.envX = null;
  this.env = tex;
  if (gemTex) this.gemEnv = this.gemEnvTo = gemTex;
  this.scene.environment = tex;
  this.applyLook(look, mode);
  if (this._envRes) { this._envRes(); this._envRes = null; }
  this.invalidate();
};
/* change the light and/or the mode: the new room is prepared in idle slices, then the two are cross-faded */
GlStage.prototype.switchEnv = function (light, mode, quiet, dur) {
  const self = this;
  light = glLightName(light); mode = mode === 'light' ? 'light' : 'dark';
  const changed = light !== this.light || mode !== this.mode;
  this.light = light; this.mode = mode;
  const tok = ++this._envTok;
  const lookB = glLightLook(light, mode);
  // the room and the stones' own room for this light (the latter is the same in every light and both modes)
  return this.rendererReady.then(function (r) {
    if (!r || self.disposed) return [null, null];
    return Promise.all([glEnvAsync(r, light, mode), glGemEnvAsync(r, light)]);
  }).then(function (two) {
    const tex = two[0], gem = two[1];
    if (!tex) return;
    if (self.disposed || tok !== self._envTok) return;
    if (quiet || !self.env || !changed && !self.envX || AU.reduced || !self.shouldRun()) { self.setEnvNow(tex, lookB, mode, gem); return; }
    // a crossfade already under way ends where it was going, and the new one starts from there
    if (self.envX) { const x = self.envX; self.setEnvNow(x.b, x.lookB, x.modeB, x.gb); }
    self.envX = { a: self.env, b: tex, ga: self.gemEnvTo || gem, gb: gem, lookA: self.look, lookB: lookB, modeA: self.look.mode, modeB: mode, t: 0, dur: dur || G_SWITCH_DUR };
    self.invalidate();
  }, function (e) { if (!self.disposed) console.error('[Aurelia GL] lighting failed', e); });
};
/* a mode switch eases the room, the stones' white-room gain and the contact shadow over the same 0.7 s as the page */
GlStage.prototype.setMode = function (m, quiet) { return this.switchEnv(this.light, m, quiet, G_SWITCH_DUR); };
/* the light switch (idea 5): 'studio' | 'daylight' | 'candle' | 'evening' */
GlStage.prototype.setLight = function (p, quiet) { return this.switchEnv(p, this.mode, quiet, G_LIGHT_DUR); };
GlStage.prototype.stepMode = function (dt) {
  const x = this.envX;
  if (!x) return false;
  x.t += dt;
  const k = Math.min(1, x.t / x.dur), e = glEaseInOut(k);
  if (k >= 1) { this.setEnvNow(x.b, x.lookB, x.modeB, x.gb); return true; }
  this.env = glEnvMixTex(this.renderer, x.a, x.b, e);
  this.scene.environment = this.env;
  this.gemEnv = x.ga === x.gb ? x.gb : glEnvMixTex(this.renderer, x.ga, x.gb, e, 'gem');
  const A = x.lookA, B = x.lookB;
  this.renderer.toneMappingExposure = A.exposure + (B.exposure - A.exposure) * e;
  this.envLight = A.envLight + (B.envLight - A.envLight) * e;
  this.shadow.blend(x.modeA, x.modeB, e, A.shadow, B.shadow);
  this.glints.keys = e < 0.5 ? A.keys : B.keys;
  return true;
};
GlStage.prototype.resizeSoon = function () {
  const self = this;
  if (this._roT) return;
  const vt = function () { return document.documentElement.classList.contains('vt-on'); };
  if (!vt()) { this.resize(); return; }
  const chk = function () {
    if (self.disposed) { self._roT = 0; return; }
    if (vt()) { self._roT = setTimeout(chk, 100); return; }
    self._roT = 0;
    self.resize();
  };
  this._roT = setTimeout(chk, 100);
};
GlStage.prototype.resize = function () {
  const w = Math.max(1, Math.round(this.container.clientWidth)), h = Math.max(1, Math.round(this.container.clientHeight));
  if (w === this.size.w && h === this.size.h) return;
  this.size = { w: w, h: h };
  if (this.renderer) {
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
  }
  this.camera.aspect = w / h;
  this.camera.updateProjectionMatrix();
  this.fit();
  this.invalidate();
};
/* adaptive resolution: drop when the stage cannot keep up, climb back when it rests */
GlStage.prototype.setDpr = function (d) {
  d = Math.max(this.dprMin, Math.min(this.dprCap, d));
  if (Math.abs(d - this.dpr) < 0.04 || !this.renderer) return false;
  this.dpr = d;
  this.renderer.setPixelRatio(d);
  this.renderer.setSize(this.size.w, this.size.h, false);
  this.dirty = true;
  return true;
};
GlStage.prototype.adapt = function (dt, drew) {
  const now = performance.now();
  if (!drew) return;
  const consecutive = this._lastDrawT && now - this._lastDrawT < 60;
  this._lastDrawT = now;
  if (!consecutive || !(dt > 0)) return;
  const ms = dt * 1000;
  this.ftAvg = this.ftAvg == null ? ms : this.ftAvg * 0.92 + ms * 0.08;
  this._slow = ms > 18 ? (this._slow || 0) + 1 : Math.max(0, (this._slow || 0) - 0.5);
  if (this._slow > 24 && this.ftAvg > 18 && now > (this._dprHold || 0)) {
    if (this.setDpr(this.dpr * 0.8)) { this._dprHold = now + 1500; this._raiseAfter = now + 6000; }
    this._slow = 0;
  } else if (this.ftAvg < 13 && this.dpr < this.dprCap && now > (this._raiseAfter || 0)) {
    this.setDpr(this.dpr * 1.15);
    this._raiseAfter = now + 5000;
  }
};
/* camera distance that keeps the whole bounding sphere in view for any rotation */
GlStage.prototype.fitDistance = function (pad) {
  const v = THREE.MathUtils.degToRad(this.camera.fov) / 2;
  const hz = Math.atan(Math.tan(v) * this.camera.aspect);
  return this.radius / Math.sin(Math.min(v, hz)) * (pad || 1);
};
GlStage.prototype.fit = function () { /* subclasses place the camera */ };
GlStage.prototype.shouldRun = function () {
  return (this.visibleFn ? this.visibleFn() : this.visible) && !this.paused && !document.hidden && !this.lost && !this.disposed;
};
GlStage.prototype.wake = function () {
  if (this.shouldRun() && !this.untick) this.untick = AU.tick(this._tick);
  if (this._raiseT) { clearTimeout(this._raiseT); this._raiseT = 0; }
};
GlStage.prototype.sleep = function () {
  if (this.untick) { this.untick(); this.untick = null; }
  // rested for a moment at a reduced resolution: climb back a step and redraw once
  const self = this;
  if (!this._raiseT && this.dpr < this.dprCap && !this.disposed) {
    this._raiseT = setTimeout(function () {
      self._raiseT = 0;
      if (self.untick || self.disposed) return;
      if (self.setDpr(self.dpr * 1.25)) self.invalidate();
    }, 1500);
  }
};
GlStage.prototype.invalidate = function () { this.dirty = true; this.wake(); };
GlStage.prototype.frame = function (t, dt) {
  const t0 = performance.now();
  try { this.frameInner(t, dt); }
  catch (e) {
    if (!this.errored) console.error('[Aurelia GL] stage frame failed', e);
    this.errored = true;
    this.sleep();
  }
  glSlow('frame:' + this.kind, performance.now() - t0);
};
GlStage.prototype.frameInner = function (t, dt) {
  if (!this.shouldRun() || !this.env) { this.sleep(); return; }   // (the lighting wakes it when it arrives)
  this._lastFrame = performance.now();
  let moving = this.update ? this.update(t, dt) : false;
  if (this.stepMode(dt)) moving = true;
  let top = 0;
  for (let i = 0; i < this.slots.length; i++) {
    const s = this.slots[i];
    s.g.scale.setScalar(s.k * s.s);
    s.g.rotation.y = s.extra;
    glSlotOpacity(s, s.alpha);
    top = Math.max(top, s.alpha);
  }
  this.shadowAlpha = top;
  // the glints belong to the metal: while a piece is swept in or out they wait for (or leave before) the line
  const sw = this.slot && this.slot.wipe;
  const gA = !this.slot ? 0 : sw ? (sw.reveal ? THREE.MathUtils.smoothstep(sw.p, 0.8, 1) : 1 - THREE.MathUtils.smoothstep(sw.p, 0, 0.2)) : this.slot.alpha;
  this.glints.alpha = gA;
  this.glints.unit = this.slot ? this.slot.k * this.slot.s : 1;
  this.scene.updateMatrixWorld();
  if (this.trackShadow(dt)) moving = true;
  let glinting = false;
  if (this.glintMode === 'bake') { if (this.piece && this.glintOn) this.glints.bake(this.camera); else this.glints.hide(); }
  else if (AU.reduced) { if (this.piece && this.glintOn) this.glints.bake(this.camera); else this.glints.hide(); }
  else glinting = this.glints.update(this.camera, dt, this.glintOn && !!this.piece && (!this.slot || gA > 0.5));
  const draw = moving || glinting || this.dirty;
  if (draw) { const td = performance.now(); this.draw(); this.dirty = false; glSlow('draw:' + this.kind, performance.now() - td); }
  this.adapt(dt, draw);
  if (!moving && !glinting && !(this.keepAlive && this.keepAlive())) this.sleep();
};
/* the camera's frame drawn into viewRect (a part of the canvas): a 2D scale and offset after the projection */
GlStage.prototype.applyViewRect = function () {
  const R = this.viewRect, cam = this.camera;
  cam.updateProjectionMatrix();
  if (!R || !this.size.w) return;
  const W = this.size.w, H = this.size.h;
  const sx = R.w / W, sy = R.h / H, tx = (R.x + R.w / 2) / W * 2 - 1, ty = 1 - (R.y + R.h / 2) / H * 2;
  G_TMPM.set(sx, 0, 0, tx, 0, sy, 0, ty, 0, 0, 1, 0, 0, 0, 0, 1);
  cam.projectionMatrix.premultiply(G_TMPM);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
};
GlStage.prototype.draw = function () {
  if (!this.env) return;
  G_ENV.value = this.env;
  G_ENV_LIGHT.value = this.envLight;
  if (this.viewRect) this.applyViewRect();
  const self = this;
  // a fading piece is drawn as a picture only over the part of the canvas it can cover (the hero's frame)
  let rect = null;
  const R = this.viewRect;
  if (R && this.size.h) {
    const d = this.renderer.getPixelRatio(), px = R.w * 0.25, py = R.h * 0.25;
    rect = { x: (R.x - px) * d, y: (this.size.h - R.y - R.h - py) * d, w: (R.w + 2 * px) * d, h: (R.h + 2 * py) * d };
  }
  glGemDraw(this.gemEnv, function () {
    if (self.beforeDraw) self.beforeDraw();
    glDrawLayered(self.renderer, self.scene, self.camera, self.slots, self.glints.group, rect);
    if (self.afterDraw) self.afterDraw();
  });
  if (this._onFirst && this.slot && this.slot.alpha > 0.01) { const f = this._onFirst; this._onFirst = null; f(); }
};

/* put a built piece on the stage in a new slot (centred on its bounding sphere); o.primary === false keeps the
   current piece as the one the shadow, glints and camera follow */
GlStage.prototype.mount = function (built, o) {
  const t0 = performance.now();
  try { return this.mountInner(built, o); } finally { glSlow('stage:mount', performance.now() - t0); }
};
GlStage.prototype.mountInner = function (built, o) {
  o = o || {};
  const m = built.measure || glMeasure(built.object);
  built.measure = m;
  const g = new THREE.Group(), holder = new THREE.Group();
  holder.position.copy(m.center).negate();
  holder.add(built.object);
  g.add(holder);
  const k = this.normalize ? G_UNIT_R / Math.max(1e-3, m.radius) : 1;
  const slot = { built: built, g: g, holder: holder, measure: m, k: k, s: 1, extra: 0, alpha: 1, shownAlpha: -1, mats: built.mats || glPrepFade(built.object) };
  this.turnG.add(g);
  this.slots.push(slot);
  if (o.primary !== false) this.setPrimary(slot);
  glSlotOpacity(slot, slot.alpha);
  this.invalidate();
  return slot;
};
GlStage.prototype.setPrimary = function (slot) {
  this.slot = slot;
  this.piece = slot.built;
  this.measure = slot.measure;
  if (!this.normalize) this.radius = slot.measure.radius;
  this.glints.set(slot.built.glints);
  this.fit();
  this.placeShadow();
};
GlStage.prototype.placeShadow = function () {
  const sl = this.slot;
  if (!sl) return;
  const tilt = this.shadowTilt != null ? this.shadowTilt : sl.built.view.tilt;
  const f = glFloor(sl.measure, tilt, this.shadowTilt === 0 ? 1 : 12);
  const k = sl.k;
  // the first piece lands its shadow at once; later pieces glide the shadow over from the previous one
  this.floorTo = f.y * k;
  if (this.floorY == null || !this.shadowFit) {
    this.floorY = this.floorTo;
    this.shadowFit = { fx: f.fx * k, fz: f.fz * k, cx: f.cx * k, cz: f.cz * k };
    this.shadow.fit(this.floorY, f.fx * k, f.fz * k, f.cx * k, f.cz * k);
  }
  // a hollow footprint (a bracelet lying flat: metal only around the rim) must not get a solid blob in its empty
  // middle, so the shadow is told how much of the footprint's centre actually touches the floor
  try {
    const ps = glPosePoints(sl.measure.points, sl.measure.center, tilt, 0), r = sl.measure.radius;
    let near = 0, inner = 0;
    ps.forEach(function (p) {
      if (p.y > f.y + r * 0.3) return;
      near++;
      const ex = (p.x - f.cx) / f.fx, ez = (p.z - f.cz) / f.fz;
      if (ex * ex + ez * ez < 0.3) inner++;
    });
    this.shadow.hollow = this.shadowTilt === 0 && near > 20 && inner / near < 0.04;
  } catch (e) { this.shadow.hollow = false; }
  this.shadow.set(this.shadow.lift || 0, this.shadow.alpha == null ? 1 : this.shadow.alpha);
  const pts = sl.measure.points, step = Math.max(1, Math.floor(pts.length / 420));
  this.shadowPts = pts.filter(function (p, i) { return i % step === 0; });
  this.shadowW = this.shadowPts.map(function () { return new THREE.Vector3(); });
};
/* each frame: the contact follows the lowest arc of the turning piece; how high that floats above the floor decides
   how dark and tight the shadow is. Returns true while the footprint is still settling. A stage may take over the
   shadow for a frame (the hero's flight) by setting this.shadowOverride = fn(dt) -> settling. */
GlStage.prototype.trackShadow = function (dt) {
  if (this.shadowOverride) return this.shadowOverride(dt);
  const sl = this.slot;
  if (!this.shadowPts || !sl) return false;
  const m = sl.holder.matrixWorld, W = this.shadowW;
  for (let i = 0; i < this.shadowPts.length; i++) W[i].copy(this.shadowPts[i]).applyMatrix4(m);
  const R = (this.normalize ? G_UNIT_R : sl.measure.radius) * sl.s;
  const c = glContact(W, R, this._contact || (this._contact = {}));
  const F = this.shadowFit;
  let settling = false;
  const kk = 1 - Math.exp(-(dt || 0.016) * 8);
  if (this.floorTo != null && Math.abs(this.floorTo - this.floorY) > R * 0.001) { this.floorY += (this.floorTo - this.floorY) * kk; settling = true; }
  else if (this.floorTo != null) this.floorY = this.floorTo;
  const lift = Math.max(0, (c.y - this.floorY) / R);
  if (F) {
    ['fx', 'fz', 'cx', 'cz'].forEach(function (n) {
      const d = c[n] - F[n];
      if (Math.abs(d) > R * 0.002) settling = true;
      F[n] += d * kk;
    });
    this.shadow.fit(this.floorY, F.fx, F.fz, F.cx, F.cz);
  }
  this.shadow.set(lift * 4, this.shadowAlpha == null ? 1 : this.shadowAlpha);
  return settling;
};
GlStage.prototype.unmountSlot = function (slot) {
  const i = this.slots.indexOf(slot);
  if (i < 0) return;
  this.slots.splice(i, 1);
  this.turnG.remove(slot.g);
  // a spec queue may keep the piece (built and compiled) for a later return to it; otherwise it is freed
  if (!(this.recycle && this.recycle(slot.built))) slot.built.dispose();
  if (this.slot === slot) {
    this.slot = null; this.piece = null; this.measure = null; this.shadowPts = null;
    this.glints.set([]);
  }
  this.invalidate();
};
GlStage.prototype.unmount = function () {
  const self = this;
  this.slots.slice().forEach(function (s) { self.unmountSlot(s); });
};
/* compile a built piece's shaders without blocking (KHR_parallel_shader_compile), with the stage's environment in
   place, before it is shown. Extra targets (the studio's loupe) are compiled for too. */
GlStage.prototype.compile = function (built) {
  const self = this;
  built.mats = built.mats || glPrepFade(built.object);
  return this.prepare().then(function () {
    if (self.disposed) return;
    const reps = glCompileReps(built.object);
    // the first time: the stage's own parts too (shadow, glint sprites) and the fade's depth pre-pass
    if (!self._partsCompiled) {
      self._partsCompiled = true;
      self.scene.traverse(function (o) { if (o !== self.rig && !self.rig.getObjectById(o.id)) glCompileReps(o, reps, true); });
      const pg = new THREE.BoxGeometry(1, 1, 1);
      reps.push(new THREE.Mesh(pg, G_PREPASS), new THREE.InstancedMesh(pg, G_PREPASS, 1));
      // the pass that lays a fading piece's picture over the canvas, and the target it is drawn into
      const fq = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glFadeMaterial());
      fq.frustumCulled = false;
      reps.push(fq);
      try { const ft = glFadeTarget(self.renderer); if (self.renderer.initRenderTarget) self.renderer.initRenderTarget(ft); } catch (e) { /* made when first needed */ }
    }
    return glCompileSliced(self, reps);
  });
};
/* one stand-in per material and kind of object (a compiled program depends on both), so a piece's shaders can be
   compiled one at a time, each in its own idle step */
function glCompileReps(root, out, shallow) {
  out = out || [];
  const seen = out._seen || (out._seen = new Set());
  const add = function (o) {
    if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine) || !o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
      // the kind of object, not o.type: an InstancedMesh reports type 'Mesh', so a metal used by a band (Mesh) and by
      // instanced beads or claws (a halo, an eternity) had only its plain variant compiled, and the instanced one
      // compiled and linked in the middle of the swap's first frame (a 70-90 ms stall)
      const kind = o.isInstancedMesh ? 'I' : (o.isSprite ? 'S' : (o.isPoints ? 'P' : (o.isLine ? 'L' : 'M')));
      const k = m.uuid + '|' + kind + '|' + (o.isInstancedMesh && o.instanceColor ? 'c' : '') + (o.geometry && o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length ? 'm' : '');
      if (seen.has(k)) return;
      seen.add(k);
      let p;
      if (o.isInstancedMesh) { p = new THREE.InstancedMesh(o.geometry, m, 1); if (o.instanceColor) p.instanceColor = o.instanceColor; }
      else if (o.isSprite) p = new THREE.Sprite(m);
      else if (o.isMesh) p = new THREE.Mesh(o.geometry, m);
      else return;
      p.frustumCulled = false;
      out.push(p);
    });
  };
  if (shallow) add(root); else root.traverse(add);
  return out;
}
/* compile stand-ins in idle steps (one material and target per step), then wait until the driver has them all */
function glCompileSliced(stage, reps) {
  const r = stage.renderer;
  return glIdle(function* stageCompile() {
    const targets = [null].concat(stage.compileTargets || []);
    const waits = [];
    for (let i = 0; i < reps.length; i++) {
      for (let j = 0; j < targets.length; j++) {
        if (stage.disposed) return;
        const sc = new THREE.Scene();
        sc.environment = stage.env;
        sc.add(reps[i]);
        const prev = r.getRenderTarget();
        try { r.setRenderTarget(targets[j]); waits.push(r.compileAsync(sc, stage.camera).catch(function () { /* on first use */ })); }
        catch (e) { /* compiled on first use */ }
        finally { r.setRenderTarget(prev); sc.remove(reps[i]); }
        yield;
      }
    }
    yield Promise.all(waits);
  }, 6);
}
/* one draw of a built (and compiled) piece into a single pixel of the fade target, with the stage's lighting: three
   uploads its geometry, instance matrices and textures now, in an idle step, instead of in the first frame of the
   swap. The fade target renders exactly like the canvas, so the compiled shaders are the ones used. */
function glWarmDraw(stage, built) {
  const r = stage.renderer;
  if (!r || stage.disposed || !stage.env || !built || !built.object || r.__auNoFadeRT) return;
  const obj = built.object, parent = obj.parent;
  const sc = new THREE.Scene();
  sc.environment = stage.env;
  const culled = [];
  obj.traverse(function (o) { if ((o.isMesh || o.isSprite) && o.frustumCulled) { o.frustumCulled = false; culled.push(o); } });
  const prev = r.getRenderTarget(), auto = r.autoClear;
  try {
    sc.add(obj);
    const rt = glFadeTarget(r);
    rt.viewport.set(0, 0, 1, 1); rt.scissor.set(0, 0, 1, 1); rt.scissorTest = true;
    G_ENV.value = stage.env;
    G_ENV_LIGHT.value = stage.envLight;
    r.setRenderTarget(rt);
    r.autoClear = false;
    glGemDraw(stage.gemEnv, function () { r.render(sc, stage.camera); });
  } catch (e) { /* uploaded on first use then */ }
  finally {
    r.setRenderTarget(prev); r.autoClear = auto;
    sc.remove(obj);
    if (parent) parent.add(obj);
    culled.forEach(function (o) { o.frustumCulled = true; });
  }
}
/* a captured frame of what is on screen now, laid over the canvas and faded out: a soft crossfade for in-place
   changes (metal, stone, size) without drawing two pieces */
GlStage.prototype.snapshot = function (dur) {
  if (!this.shouldRun() || AU.reduced || this.size.w < 2 || !this.slot) return;
  try {
    this.scene.updateMatrixWorld();
    this.draw();
    const c = document.createElement('canvas');
    c.width = this.canvas.width; c.height = this.canvas.height;
    c.getContext('2d').drawImage(this.canvas, 0, 0);
    c.className = 'augl-snap';
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;opacity:1;' +
      'transition:opacity ' + dur + 's cubic-bezier(.45,0,.25,1);';
    this.canvas.insertAdjacentElement('afterend', c);
    if (this.snap) this.snap.remove();
    this.snap = c;
    const self = this;
    requestAnimationFrame(function () { requestAnimationFrame(function () { c.style.opacity = '0'; }); });
    setTimeout(function () { c.remove(); if (self.snap === c) self.snap = null; }, dur * 1000 + 250);
  } catch (e) { /* no crossfade then */ }
};
GlStage.prototype.dispose = function () {
  if (this.disposed) return;
  this.sleep();
  this.disposed = true;
  if (this._raiseT) clearTimeout(this._raiseT);
  G_LIVE.delete(this);
  try { this.ro.disconnect(); this.io.disconnect(); } catch (e) { /* ignore */ }
  this.offs.forEach(function (f) { f(); });
  document.removeEventListener('visibilitychange', this.onVis);
  if (this._resumeT && window.cancelIdleCallback) cancelIdleCallback(this._resumeT);
  if (this.cleanup) this.cleanup();
  this.recycle = null;
  if (this.recycleDispose) this.recycleDispose();
  this.unmount();
  if (this.snap) this.snap.remove();
  if (this._roT) { clearTimeout(this._roT); this._roT = 0; }
  this.glints.dispose();
  this.shadow.dispose();
  if (this.renderer) {
    // the GPU side is let go after the page change, in an idle moment (losing a context costs a few ms)
    const r = this.renderer;
    r.__auDead = true;
    const rec = G_ENVS.get(r);
    if (rec) rec.dead = true;                  // (any lighting still being prepared for it stops)
    glIdle(function stageRelease() {
      glEnvDispose(r);
      r.dispose();
      try { r.forceContextLoss(); } catch (e) { /* ignore */ }
    }, 6).catch(function () { /* gone anyway */ });
  }
  if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
};

/* A spec queue with soft transitions, shared by hero and studio: only the latest requested spec is shown. Models are
   loaded first (when a spec names one), the build runs in idle steps (the build, then its measure), the shaders
   compile off the main thread.
   v2.3: pieces that leave the stage are KEPT (built and compiled, up to G_KEEP_BUILT of them), so going back to one is
   only a mount; and queue.prebuild(specs) builds the pieces a stage is likely to show next (the hero's three) in calm
   idle time after its first picture, so a click never pays for a build while the departing piece is animating. */
const G_KEEP_BUILT = 4;
function glSpecKey(spec) { try { return JSON.stringify(KIT.spec(spec || {})); } catch (e) { return String(Math.random()); } }
function glSpecQueue(stage, transition, early) {
  const q = { wanted: null, busy: false, waiters: [] };
  const kept = new Map();                    // spec key -> built piece, compiled, not on stage (oldest first)
  const detail = stage.kind === 'studio' ? 'studio' : 'hero';
  const keep = function (built) {
    if (!built || stage.disposed) return false;
    const k = glSpecKey(built.spec);
    if (kept.has(k)) { const o = kept.get(k); kept.delete(k); if (o !== built) o.dispose(); }
    kept.set(k, built);
    while (kept.size > G_KEEP_BUILT) { const k0 = kept.keys().next().value; const o = kept.get(k0); kept.delete(k0); o.dispose(); }
    return true;
  };
  stage.recycle = keep;
  stage.recycleDispose = function () { kept.forEach(function (b) { b.dispose(); }); kept.clear(); };
  const take = function (spec) {
    const k = glSpecKey(spec);
    const b = kept.get(k);
    if (b) kept.delete(k);
    return b || null;
  };
  /* a fresh build in idle steps: the builder (v2.5: in the steps its own yields mark, a band, a head, an inscription
     each; a whole build took 17-26 ms in one step on a busy page), then the measure */
  const build = function (spec) {
    return glIdle(function* specBuild() {
      if (stage.disposed) return null;
      const b = yield* glBuildSteps(spec, { detail: detail });
      yield;
      if (stage.disposed) { b.dispose(); return null; }
      b.measure = b.measure || glMeasure(b.object);
      yield;
      b.mats = b.mats || glPrepFade(b.object);
      // what the stage works out about a piece when it mounts it (the studio: the catalogue still's pose)
      if (stage.prepBuilt) { yield; if (stage.disposed) { b.dispose(); return null; } try { stage.prepBuilt(b); } catch (e) { /* at mount then */ } }
      return b;
    }, 8).then(function (b) {
      if (!b) return null;
      // compiled, then drawn once off screen in an idle step: its buffers are uploaded before the swap's first frame
      return stage.compile(b)
        .then(function () { return stage.disposed ? null : glIdle(function warmDraw() { glWarmDraw(stage, b); }, 8); })
        .then(function () { return b; });
    });
  };
  /* a piece being built ahead (prebuild) that a request now wants: wait for it rather than build it twice */
  const inflight = new Map();                // spec key -> Promise (resolves once the piece is kept)
  const obtain = function (spec) {
    const ready = take(spec);
    if (ready) return Promise.resolve(ready);
    const k = glSpecKey(spec);
    if (inflight.has(k)) return inflight.get(k).then(function () { return take(spec) || build(spec); });
    return build(spec);
  };
  const run = function () {
    if (!q.wanted || stage.disposed) {
      q.busy = false;
      // a piece that started to leave but has no successor (its build failed) comes back
      if (!stage.disposed) glUndepart(stage);
      const w = q.waiters; q.waiters = [];
      w.forEach(function (r) { r(); });
      return;
    }
    q.busy = true;
    const spec = q.wanted; q.wanted = null;
    const go = function () {
      if (q.wanted || stage.disposed) { run(); return; }        // superseded while the model loaded
      obtain(spec)
        .then(function (built) {
          if (!built) return;
          // gone, or already superseded by a newer request: the newer one is shown instead (this one is kept)
          if (stage.disposed || q.wanted) { if (!keep(built)) built.dispose(); return; }
          return transition(built);
        })
        .then(run, function (e) { console.error('[Aurelia GL]', e); run(); });
    };
    const ms = KIT.spec(spec).model;
    if (ms && !ready0(spec)) glModelLoad(ms).then(go, go); else go();
  };
  const ready0 = function (spec) { return kept.has(glSpecKey(spec)); };
  const setSpec = function (spec) {
    q.wanted = spec || {};
    const k = glSpecKey(q.wanted);
    const onStage = stage.piece && glSpecKey(stage.piece.spec) === k;
    // the answer to a click starts at once: the piece on stage begins to leave while the next one is built
    if (early) { try { early(q.wanted); } catch (e) { /* the swap starts it later */ } }
    // v2.4: when the next piece still has to be built, the leaving one pauses at about a third of its opacity until
    // it is ready (glDepart), so the stage is never empty while the visitor waits
    if (!onStage && !kept.has(k) && stage.slot && stage.slot.departing) stage.slot.hold = true;
    const p = new Promise(function (res) { q.waiters.push(res); });
    if (!q.busy) run();
    return p;
  };
  /* build (and compile) these specs ahead, one at a time, from the stage's first picture on: each build and compile
     runs in idle slices (glIdle), so it never waits for a long calm, only for a moment without scrolling or a page
     change (a visitor often picks another hero piece in the first seconds) */
  setSpec.prebuild = function (specs) {
    const list = (specs || []).filter(Boolean);
    if (!list.length) return;
    stage.firstDrawn.then(function () {
      let i = 0;
      const next = function () {
        if (stage.disposed || i >= list.length) return;
        // never while a requested piece is being built, nor during a scroll or a page change
        if (q.busy || glBusy()) { setTimeout(next, 250); return; }
        const spec = list[i++];
        const k = glSpecKey(spec);
        if (kept.has(k) || inflight.has(k) || (stage.piece && glSpecKey(stage.piece.spec) === k)) { next(); return; }
        const ms = KIT.spec(spec).model;
        const job = (ms ? glModelLoad(ms).catch(function () { /* procedural */ }) : Promise.resolve())
          .then(function () { return build(spec); })
          .then(function (b) {
            if (!b) return;
            if (stage.disposed || (stage.piece && glSpecKey(stage.piece.spec) === k) || kept.has(k)) { b.dispose(); return; }
            keep(b);
          })
          .catch(function () { /* built on demand later */ });
        inflight.set(k, job);
        job.then(function () { inflight.delete(k); setTimeout(next, 60); });
      };
      // the first picture's own frames go first
      setTimeout(next, 120);
    });
  };
  return setSpec;
}
/* animate a value object over `dur` seconds from the stage's frame loop; resolves even if frames stop (but waits while
   the stage is still preparing its lighting, so a first fade-in is never skipped) */
function glTween(stage, dur, fn) {
  return new Promise(function (res) {
    if (!stage.shouldRun() || dur <= 0) { fn(1); stage.invalidate(); res(); return; }
    let t = 0, done = false;
    const finish = function () { if (done) return; done = true; fn(1); stage.invalidate(); res(); };
    stage.tweens = stage.tweens || [];
    stage.tweens.push(function (dt) { if (done) return false; t += dt; const k = Math.min(1, t / dur); fn(k); if (k >= 1) { finish(); return false; } return true; });
    const guard = function () {
      if (done) return;
      const alive = !stage.disposed && (!stage.env || (stage.shouldRun() && performance.now() - (stage._lastFrame || 0) < 250));
      if (alive) setTimeout(guard, 300); else finish();
    };
    setTimeout(guard, dur * 1000 + 400);
    stage.invalidate();
  });
}
/* tweens may start other tweens (a swap starts the arrival from inside the departure): those are kept */
GlStage.prototype.runTweens = function (dt) {
  if (!this.tweens || !this.tweens.length) return false;
  const list = this.tweens;
  this.tweens = [];
  const keep = list.filter(function (f) { return f(dt); });
  this.tweens = keep.concat(this.tweens);
  return true;
};

/* the soft swap shared by hero and studio: the old piece eases out (turning on a little and settling smaller); when
   it is 70% gone the new one starts to arrive, turning into place, in its own slot. o: { out, in, turnOut, turnIn } */
function glSwap(st, built, o) {
  const reduced = !!AU.reduced;
  const old = st.slot;
  const tIn = reduced ? 0 : (o.turnIn == null ? -0.5 : o.turnIn);
  const arrive = function () {
    const sl = st.mount(built);
    sl.alpha = 0; sl.s = 0.95; sl.extra = tIn;
    // v2.5 a piece that replaces another is swept in, solid, behind a rising line of light (glFadeMaterial); the first
    // piece of a stage simply fades in on its empty stage
    const sweep = !!old && !reduced;
    if (sweep) sl.wipe = { p: 0, reveal: true };
    if (o.onMount) o.onMount(sl, !old);
    return glTween(st, reduced ? 0.4 : o.in, function (k) {
      const e = glEaseOut(k);
      sl.alpha = e; sl.s = 0.95 + 0.05 * e; sl.extra = tIn * (1 - e);
      if (sweep && sl.wipe) {
        // the line rises at an even pace through the middle and settles at the top
        const w = 1 - Math.pow(1 - k, 2.2) * (1 - 0.35 * k);
        sl.wipe.p = Math.min(1, w); sl.alpha = Math.min(1, w);
        if (k >= 1) { sl.wipe = null; sl.alpha = 1; }
      }
    });
  };
  if (!old) return arrive();
  // the old piece has usually been asked to leave at the request (glDepart from the spec queue) and waits, whole, for
  // its successor; if not, it starts now. Its successor is built and compiled: the departure goes on.
  old.hold = false;
  const out = glDepart(st, o);
  return new Promise(function (res) {
    let arriving = null;
    const start = function () { if (!arriving) arriving = arrive(); };
    // the new piece begins to rise in as the old one's sweep reaches its top (both sweeps run the same way, so the two
    // never share a pixel half-drawn)
    if (old.outK >= 0.6 || reduced) start(); else old.onOut70 = start;
    out.then(function () {
      start();
      st.unmountSlot(old);
      arriving.then(res);
    });
  });
}
/* the old piece eases out (turning on a little and settling smaller) but stays mounted, invisible, until its successor
   arrives: a failed build can bring it back (glUndepart). Starting this the moment a new piece is asked for means the
   0.6 s departure covers the new piece's build and compile: the click is answered in the same frame. */
function glDepart(st, o) {
  const old = st.slot;
  if (!old) return Promise.resolve();
  if (old.departing) return old.departing;
  o = o || {};
  const reduced = !!AU.reduced;
  const tOut = reduced ? 0 : (o.turnOut == null ? 0.42 : o.turnOut);
  const a0 = old.alpha, s0 = old.s, x0 = old.extra;
  const dur = reduced ? 0.3 : (o.out || 0.6);
  old.outK = 0;
  // v2.5 the old piece is swept away (solid, behind a rising line of light; see glFadeMaterial), never faded into a
  // see-through, background-tinted ghost of itself. Reduced motion: a short plain fade.
  const sweep = !reduced;
  const p0 = old.wipe && !old.wipe.reveal ? old.wipe.p : 0;
  if (sweep) old.wipe = { p: p0, reveal: false };
  const apply = function (k) {
    const e = glEaseInOut(k);
    old.outK = k;
    old.alpha = a0 * (1 - e); old.s = s0 * (1 - 0.04 * e); old.extra = x0 + tOut * e;
    if (sweep && old.wipe) old.wipe.p = p0 + (1 - p0) * e;
    if (k >= 0.6 && old.onOut70) { const f = old.onOut70; old.onOut70 = null; f(); }
  };
  // the departure's own tween: while old.hold is set (its successor is still being built and compiled) it does not
  // start: the piece stays whole, lit and turning, and leaves only once the next one can follow it at once
  const HOLD_K = 0;
  old.departing = new Promise(function (res) {
    let t = 0, done = false;
    const finish = function () { if (done) return; done = true; if (!old.undepart) apply(1); st.invalidate(); res(); };
    if (!st.shouldRun()) { finish(); return; }
    st.tweens = st.tweens || [];
    st.tweens.push(function (dt) {
      if (done) return false;
      if (old.undepart) { done = true; res(); return false; }
      const cap = old.hold ? Math.max(t, HOLD_K * dur) : dur;
      t = Math.min(t + dt, cap);
      const k = Math.min(1, t / dur);
      apply(k);
      if (k >= 1) { finish(); return false; }
      return true;
    });
    // frames stopped (the stage went off screen, the tab hid): the departure ends at once
    const guard = function () {
      if (done) return;
      const alive = !st.disposed && st.shouldRun() && performance.now() - (st._lastFrame || 0) < 250;
      if (alive || (st.env == null && !st.disposed)) setTimeout(guard, 300); else finish();
    };
    setTimeout(guard, dur * 1000 + 400);
    st.invalidate();
  });
  return old.departing;
}
function glUndepart(st) {
  const sl = st.slot;
  if (!sl || !sl.departing || sl.undepart || sl.onOut70) return;
  // a departure resting for a build that failed comes back from where it rests
  const wasHeld = !!sl.hold;
  sl.hold = false;
  (wasHeld ? Promise.resolve() : sl.departing).then(function () {
    if (st.disposed || st.slot !== sl || sl.onOut70) return;
    sl.undepart = true;
    const a0 = sl.alpha, s0 = sl.s, x0 = sl.extra, w0 = sl.wipe ? sl.wipe.p : 0;
    glTween(st, 0.5, function (k) {
      const e = glEaseOut(k);
      sl.alpha = a0 + (1 - a0) * e; sl.s = s0 + (1 - s0) * e; sl.extra = x0 * (1 - e);
      if (sl.wipe) sl.wipe.p = w0 * (1 - e);       // the line goes back down
    }).then(function () { sl.departing = null; sl.undepart = false; sl.outK = 0; sl.wipe = null; });
  });
}

/* ---- 42-hero.js ---- */
/* ---- AUGL.hero(container, { spec, label, anchor, poster }): the slow turntable in the hero.
   Rings and bracelets turn all the way round; earrings (view.rock) sway gently about their front, so the backs and
   posts never come round to the camera. Every piece is scaled to one size, so the camera never moves.

   v2:
   anchor   a DOM element in the page (the hero's piece area). The container is then a fixed full-viewport layer
            (the page gives it position:fixed; inset:0; pointer-events:none) and the piece is drawn inside the anchor's
            rect, following it as the page scrolls in the same frame. Drag to turn works on the anchor.
   poster   optional element showing the piece's pre-rendered still (AU.img) inside the anchor while the engine starts.
            The live piece then starts exactly as that picture, in the poster's rect, the poster is hidden in the same
            frame (visibility:hidden, restored on dispose), and the piece eases from the picture into the hero pose.
   .setFlight(p, target)  the scroll flight (idea 6). target: an element (its rect is read each frame) or a rect
            { left, top, width, height } in viewport px; null ends the flight. Between p = 0 (the hero, turning in its
            anchor) and p = 1 (the target) the piece slows, lifts, turns to the catalogue still pose and shrinks, so
            that at p = 1 it is exactly the pre-rendered still (render(spec), three-quarter view) drawn in the target's
            centred square (object-fit: contain). Eased, every frame.
   .setSpec(spec) -> Promise   .setScroll(p)   .pause() .resume() .dispose()
   .ready  resolves when the first piece has fully arrived; .shown resolves on its first visible frame.
   The turntable comes to rest after 45 s without any input from the visitor and starts again on the next one. ---- */

function glHero(container, o) {
  o = o || {};
  const anchor = o.anchor && o.anchor.nodeType === 1 ? o.anchor : null;
  const poster = o.poster && o.poster.nodeType === 1 ? o.poster : null;
  const st = new GlStage(container, { kind: 'hero', label: o.label, fov: 26, layer: !!anchor });
  const S = {
    angle: -0.62, vel: 0, auto: G_TAU / 19, autoK: AU.reduced ? 0 : 1,
    tx: 0, ty: 0, px: 0, py: 0,
    scroll: 0, scrollS: 0,
    drag: null,
    rockT: 0, rockW: 0,
    t0: performance.now() / 1000,
    fp: 0, fpS: 0, target: null, landTurn: null,  // the flight
    scrolled: 0,                                  // when the page last scrolled
    hand: null                                    // the hand-over from the poster
  };
  const ELEV = 0.13;     // camera a little above the piece, so the floor shadow reads
  const tmpT = new THREE.Vector3(), tmpC = new THREE.Vector3(), tmpV = new THREE.Vector3();

  /* the frame of the hero: the anchor's rect in the canvas (anchor mode) or the whole canvas */
  let cRect = null, aRect = null, anchorVis = true;
  const readRects = function () {
    if (!anchor && !S.hand && !(S.fp > 0 || S.fpS > 0)) return;
    const c = container.getBoundingClientRect();
    cRect = c;
    if (!anchor) return;
    const a = anchor.getBoundingClientRect();
    aRect = { x: a.left - c.left, y: a.top - c.top, w: Math.max(1, a.width), h: Math.max(1, a.height) };
  };
  const rectOf = function (t) {
    if (!t) return null;
    let r = t, dy = 0;
    if (t.nodeType === 1) r = t.getBoundingClientRect();
    // a rect handed over by the page was measured at its scroll position; the page may have scrolled since (its
    // scroll handler can run after this frame's): follow the scroll, so the piece never trails its tile
    else if (t === S.target && S.targetY != null) dy = (window.scrollY || 0) - S.targetY;
    const c = cRect || { left: 0, top: 0 };
    const x = (r.left != null ? r.left : r.x) - c.left, y = (r.top != null ? r.top : r.y) - c.top - dy;
    const w = r.width != null ? r.width : r.w, h = r.height != null ? r.height : r.h;
    if (!(w > 0 && h > 0)) return null;
    // the still is square and shown contained: its centred square
    const s = Math.min(w, h);
    return { x: x + (w - s) / 2, y: y + (h - s) / 2, w: s, h: s };
  };
  const heroFrame = function () { return anchor && aRect ? aRect : { x: 0, y: 0, w: st.size.w, h: st.size.h }; };
  const heroD = function (aspect) {
    const v = THREE.MathUtils.degToRad(st.camera.fov) / 2, hz = Math.atan(Math.tan(v) * aspect);
    return st.radius / Math.sin(Math.min(v, hz)) * 1.17;
  };
  if (anchor) {
    const aio = new IntersectionObserver(function (es) { anchorVis = es[es.length - 1].isIntersecting; if (anchorVis) st.invalidate(); }, { rootMargin: '160px' });
    aio.observe(anchor);
    const flying = function () { return S.fp > 0.0005 || S.fpS > 0.0005 || !!S.hand; };
    st.visibleFn = function () { return anchorVis || flying(); };
    // while the page scrolls (and a moment after), keep the loop running although the piece may rest: it then follows
    // the page in the very frame it scrolls; otherwise a resting piece costs nothing
    st.keepAlive = function () { return flying() || (anchorVis && performance.now() - S.scrolled < 1200); };
    if (!anchor.style.touchAction) anchor.style.touchAction = 'pan-y';
    st._aio = aio;
  }

  st.fit = function () {
    const D = st.fitDistance(1.17);
    const dy = -st.radius * 0.07;       // look a touch low, so the shadow has room under the piece
    st.camera.position.set(0, Math.sin(ELEV) * D + dy, Math.cos(ELEV) * D);
    st.camera.near = Math.max(0.5, D - st.radius * 3);
    st.camera.far = D + st.radius * 4;
    st.camera.lookAt(0, dy, 0);
    st.camera.updateProjectionMatrix();
  };

  /* the catalogue still's pose and camera for the slot's piece, in the hero's units (cached per slot) */
  const stillOf = function (sl) {
    if (sl.still) return sl.still;
    const e = { built: sl.built, m: sl.measure, poses: {} };
    const p = glStillPoseFor(e, 'three-quarter');
    const k = sl.k;
    const all = p.all;
    sl.still = {
      tilt: p.tilt, turn: glTurnAt(sl.built.view, 0), center: p.center.clone(),
      target: p.cam.target.clone().multiplyScalar(k), D: p.cam.D * k, all: all
    };
    return sl.still;
  };
  /* ---- the flight's path (v2.5): an arc the engine plans itself.
     1. across first: the piece glides over to its own tile's column while it is still high in the page (x is over
        the well by p = 0.5) and shrinks to the well's size on the way;
     2. it hovers there, above the section's heading: the heading's text (eyebrow + title, their tight text boxes) is
        a keep-out the piece never enters from above, so as the page brings the hub up the piece rides just over it;
     3. the landing: in the last stretch it drops into its well, quickly, at well size.
     The page may hand over a rect already bent for an older path (only its x moves); the engine then reads the true
     well (the [data-type] tile of the piece's type) and plans from that. The landing is the handed rect either way. */
  const FL = { el: null, type: null, ko: null, koAt: -1, koW: 0 };
  const flightRect = function () {
    const t = S.target;
    if (!t) return null;
    if (t.nodeType === 1) return rectOf(t);
    const type = st.piece && st.piece.spec ? st.piece.spec.type : null;
    if (type !== FL.type || !FL.el || !FL.el.isConnected) {
      FL.type = type; FL.el = null; FL.ko = null;
      try {
        const cands = document.querySelectorAll('[data-flight-target],[data-hub-well]');
        for (let i = 0; i < cands.length; i++) {
          const host = cands[i].closest('[data-type]');
          if (host && host.getAttribute('data-type') === type) { FL.el = cands[i]; break; }
        }
      } catch (er) { FL.el = null; }
    }
    if (FL.el) {
      const r = rectOf(FL.el), h = rectOf(t);
      // the true well must agree with the handed rect in size and height; otherwise the page means another place
      if (r && h && Math.abs(r.w - h.w) < 4 && Math.abs(r.y - h.y) < Math.max(24, h.h * 0.2)) return r;
    }
    return rectOf(t);
  };
  /* the keep-out: the heading block above the well (its section's eyebrow and h2), as tight text boxes, kept in page
     coordinates (measured when the flight starts and when the layout's width changes; no reads while scrolling) */
  const unionText = function (el, u) {
    if (!el) return u;
    // the block's own box for the height (its words may still be lowered in their reveal masks), its text's extent
    // for the width (a heading block runs the whole column; its words do not)
    const b = el.getBoundingClientRect();
    if (!(b.width > 0 && b.height > 0)) return u;
    let l = b.left, rr = b.right;
    try {
      const rg = document.createRange(); rg.selectNodeContents(el);
      const tr = rg.getBoundingClientRect();
      if (tr && tr.width > 0) { l = Math.max(b.left, tr.left); rr = Math.min(b.right, tr.right); }
    } catch (er) { /* the box */ }
    const y = window.scrollY || 0;
    if (!u) return { l: l, r: rr, t: b.top + y, b: b.bottom + y };
    u.l = Math.min(u.l, l); u.r = Math.max(u.r, rr); u.t = Math.min(u.t, b.top + y); u.b = Math.max(u.b, b.bottom + y);
    return u;
  };
  const keepOut = function () {
    if (!FL.el) return null;
    const vw = window.innerWidth;
    if (!FL.ko || FL.koW !== vw || performance.now() - FL.koAt > 400) {
      FL.koW = vw; FL.koAt = performance.now(); FL.ko = null;
      const sec = FL.el.closest('section');
      const h2 = sec && sec.querySelector('h2');
      if (h2 && !h2.classList.contains('sr-only')) {
        let u = unionText(h2, null);
        const eb = h2.previousElementSibling;
        if (eb && !eb.contains(FL.el)) u = unionText(eb, u);
        FL.ko = u || null;
      }
    }
    if (!FL.ko) return null;
    const c = cRect || { left: 0, top: 0 }, y = window.scrollY || 0;
    return { l: FL.ko.l - c.left, r: FL.ko.r - c.left, t: FL.ko.t - y - c.top, b: FL.ko.b - y - c.top };
  };
  const clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  const handPath = function (F0, R1, P, e) {
    const g = 1 + 0.045 * Math.sin(Math.PI * P) * 0.3;
    const w = (F0.w + (R1.w - F0.w) * e) * g, h = (F0.h + (R1.h - F0.h) * e) * g;
    const cx = F0.x + F0.w / 2 + (R1.x + R1.w / 2 - F0.x - F0.w / 2) * e, cy = F0.y + F0.h / 2 + (R1.y + R1.h / 2 - F0.y - F0.h / 2) * e;
    return { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
  };
  const DIVE = 0.84;   // the drop: the last 16% of the flight (about 100 px of scroll on a desktop)
  const flightPath = function (F0, R1, P) {
    // size: to the well's by p = 0.6, with the faintest swell mid-air
    const es = glSmooth(clamp01(P / 0.6));
    const g = 1 + 0.03 * Math.sin(Math.PI * clamp01(P / 0.6));
    const w = (F0.w + (R1.w - F0.w) * es) * g, h = (F0.h + (R1.h - F0.h) * es) * g;
    const ax = F0.x + F0.w / 2, ay = F0.y + F0.h / 2, bx = R1.x + R1.w / 2, by = R1.y + R1.h / 2;
    // across first
    const cx = ax + (bx - ax) * glSmooth(clamp01(P / 0.5));
    // down: the free descent, held over the heading, then the drop
    let cy = ay + (by - ay) * glSmooth(clamp01((P - 0.12) / 0.88));
    const K = keepOut();
    if (K) {
      const m = Math.max(14, R1.w * 0.05);
      const hw = Math.min(w, h) * 0.4, hh = Math.min(w, h) * 0.4;      // the piece's own extent inside its square
      const ox = Math.min(cx + hw - (K.l - m), K.r + m - (cx - hw));     // horizontal overlap with the heading, px
      const wX = THREE.MathUtils.smoothstep(ox, 0, 40);
      const cap = K.t - m - hh;
      // only while the piece is still above the heading (the landing side, below it, is free)
      if (wX > 0 && cy > cap && by - hh > K.b && ay - hh < K.t) cy -= (cy - cap) * wX;
    }
    const d = glSmooth(clamp01((P - DIVE) / (1 - DIVE)));
    cy += (by - cy) * d;
    return { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
  };
  const lastRect = { x: 0, y: 0, w: 0, h: 0 };
  const shadowW = [];
  let blend = 0, liftY = 0, floorHero = null;

  st.update = function (t, dt) {
    const reduced = !!AU.reduced;
    let moving = st.runTweens(dt);
    readRects();
    const view = st.piece ? st.piece.view : G_VIEW_DEFAULTS.ring;
    const rock = view.rock || 0;
    // the flight follows the page, eased a little (a wheel step becomes a glide)
    const kf = reduced ? 1 : 1 - Math.exp(-dt * 12);
    S.fpS += (S.fp - S.fpS) * kf;
    if (Math.abs(S.fp - S.fpS) < 0.0008) S.fpS = S.fp; else moving = true;
    let hp = 0;
    if (S.hand) {
      S.hand.t += dt;
      const k = Math.min(1, S.hand.t / S.hand.dur);
      hp = 1 - glSmooth(k);
      if (k >= 1) S.hand = null;
      moving = true;
    }
    const P = Math.max(S.fpS, hp);
    S.flightP = P;
    const e = glSmooth(P);
    blend = e;
    // the turntable: slows to rest as the piece leaves on its flight, or when the visitor has been away a while
    const away = performance.now() - G_ACT.t > 45000;
    const wantAuto = reduced || away ? 0 : 1 - glSmooth(Math.min(1, P * 2.5));
    S.autoK += (wantAuto - S.autoK) * (1 - Math.exp(-dt * 1.1));
    if (Math.abs(wantAuto - S.autoK) < 0.002) S.autoK = wantAuto; else moving = true;
    if (!S.drag) {
      S.vel *= Math.exp(-dt * 2.4);
      if (Math.abs(S.vel) < 0.003) S.vel = 0;
      if (rock) {
        // drift back to the front (the nearest turn of the still pose), then sway about it
        let home = view.still.turn;
        while (home - S.angle > Math.PI) home -= G_TAU;
        while (home - S.angle < -Math.PI) home += G_TAU;
        S.angle += S.vel * dt;
        if (!reduced && Math.abs(S.vel) < 0.15) S.angle += (home - S.angle) * (1 - Math.exp(-dt * 0.7));
        if (Math.abs(home - S.angle) > 0.002 || S.vel) moving = true;
      } else {
        S.angle += (S.auto * S.autoK + S.vel) * dt;
        if (S.autoK > 0.001 || S.vel) moving = true;
      }
    } else moving = true;
    // the sway fades out while the visitor holds the piece and back in after
    const wantW = rock && !reduced && !S.drag ? S.autoK : 0;
    S.rockW += (wantW - S.rockW) * (1 - Math.exp(-dt * 1.6));
    if (!S.drag && rock && !reduced) S.rockT += dt * S.autoK;
    const sway = S.rockW * rock * Math.sin(S.rockT * G_TAU / 11);
    if (Math.abs(wantW - S.rockW) > 0.001 && S.rockW > 0.001) moving = true;
    const k = 1 - Math.exp(-dt * 3.0);
    S.px += (S.tx - S.px) * k; S.py += (S.ty - S.py) * k;
    if (Math.abs(S.tx - S.px) + Math.abs(S.ty - S.py) > 0.0005) moving = true;
    const ks = 1 - Math.exp(-dt * 5.0);
    S.scrollS += (S.scroll - S.scrollS) * ks;
    if (Math.abs(S.scroll - S.scrollS) > 0.0005) moving = true;
    const bobT = t - S.t0;
    const bob = reduced ? 0 : Math.sin(bobT * G_TAU / 7.2) * st.radius * 0.016 * S.autoK;
    if (!reduced && S.autoK > 0.001) moving = true;

    const heroTurn = S.angle + sway + S.scrollS * (rock ? 0.35 : 0.85);
    const heroTilt = view.tilt + S.py * 0.12 - S.scrollS * 0.08;
    const F0 = heroFrame();
    const sl = st.slot;
    let R = F0;
    if (P <= 0.0001 || !sl) {
      S.landTurn = null;
      st.turnG.rotation.y = heroTurn;
      st.tiltG.rotation.x = heroTilt;
      st.rig.rotation.y = S.px * 0.13;
      st.rig.position.y = bob - S.scrollS * st.radius * 0.16;
      if (sl) sl.holder.position.copy(sl.measure.center).negate();
      st.camera.aspect = F0.w / F0.h;
      st.fit();
      st.glintMode = null;
      st.glintOn = true;
      st.shadowOverride = null;
      liftY = 0;
    } else {
      const sp = stillOf(sl);
      if (S.landTurn == null) {      // where the flight lands is chosen once, the nearest whole turn
        let lt = sp.turn;
        while (lt - heroTurn > Math.PI) lt -= G_TAU;
        while (lt - heroTurn < -Math.PI) lt += G_TAU;
        S.landTurn = lt;
      }
      st.turnG.rotation.y = heroTurn + (S.landTurn - heroTurn) * e;
      st.tiltG.rotation.x = heroTilt + (sp.tilt - heroTilt) * e;
      st.rig.rotation.y = S.px * 0.13 * (1 - e);
      // the lift: the piece rises off its floor through the middle of the flight
      liftY = Math.sin(Math.PI * Math.min(1, P)) * st.radius * 0.18 * (S.hand ? 0.35 : 1);
      st.rig.position.y = (bob - S.scrollS * st.radius * 0.16) * (1 - e) + liftY;
      tmpC.copy(sl.measure.center).lerp(sp.center, e);
      sl.holder.position.copy(tmpC).negate();
      // the camera eases from the hero's to the still's
      const D0 = heroD(F0.w / F0.h), dy = -st.radius * 0.07;
      tmpT.set(0, dy, 0).lerp(sp.target, e);
      const D = D0 + (sp.D - D0) * e;
      const el = ELEV + (G_STILL_ELEV - ELEV) * e;
      st.camera.position.set(0, Math.sin(el), Math.cos(el)).multiplyScalar(D).add(tmpT);
      st.camera.lookAt(tmpT);
      st.camera.near = Math.max(0.5, D - st.radius * 3);
      st.camera.far = D + st.radius * 4;
      // and the frame from the hero's rect to the target's square
      // the start: the hero's rect, or, while the first piece takes over from the poster, the poster's rect easing into
      // it; the flight then runs from there (a page already scrolled when the engine arrives flies from the poster,
      // never jumping to the flight's path when the hand-over ends)
      const Rp = S.hand ? rectOf(S.hand.el) : null;
      const Rs = Rp ? handPath(F0, Rp, hp, glSmooth(hp)) : F0;
      const Rt = S.fpS > 0.0001 ? flightRect() : null;
      R = Rt ? flightPath(Rs, Rt, S.fpS) : Rs;
      st.camera.aspect = R.w / R.h;
      st.camera.updateProjectionMatrix();
      // at the landing the glint is the still's (deterministic for the pose); in flight the live ones rest
      st.glintMode = P > 0.985 ? 'bake' : null;
      st.glintOn = P < 0.5 || P > 0.985;
      st.shadowOverride = flightShadow;
    }
    if (anchor || P > 0.0001) st.viewRect = R; else st.viewRect = null;
    if (R.x !== lastRect.x || R.y !== lastRect.y || R.w !== lastRect.w || R.h !== lastRect.h) {
      lastRect.x = R.x; lastRect.y = R.y; lastRect.w = R.w; lastRect.h = R.h;
      st.dirty = true;
    }
    return moving;
  };
  /* the shadow in flight: the exact contact of the posed piece (the picture's own footprint at the landing), its floor
     easing from the hero's (lowest point over a turn) to the still's (the contact itself) */
  const flightShadow = function (dt) {
    const sl = st.slot;
    if (!sl) return false;
    const sp = stillOf(sl), m = sl.holder.matrixWorld, pts = sp.all;
    for (let i = 0; i < pts.length; i++) { if (!shadowW[i]) shadowW[i] = new THREE.Vector3(); shadowW[i].copy(pts[i]).applyMatrix4(m); }
    shadowW.length = pts.length;
    const c = glContact(shadowW, st.radius, st._contact || (st._contact = {}));
    if (floorHero == null) floorHero = st.floorTo != null ? st.floorTo : c.y;
    const yContact = c.y - liftY;
    const floor = floorHero + (yContact - floorHero) * blend;
    const F = st.shadowFit;
    const kk = 1 - (1 - (1 - Math.exp(-(dt || 0.016) * 8))) * (1 - blend);
    if (F) {
      F.fx += (c.fx - F.fx) * kk; F.fz += (c.fz - F.fz) * kk; F.cx += (c.cx - F.cx) * kk; F.cz += (c.cz - F.cz) * kk;
      st.shadow.fit(floor, F.fx, F.fz, F.cx, F.cz);
    } else st.shadow.fit(floor, c.fx, c.fz, c.cx, c.cz);
    const lift = Math.max(0, (c.y - floor) / st.radius);
    // in flight the piece has no floor: its shadow fades out as it lifts off and back in as it lands (it fell on the
    // tiles it passed over)
    const P = S.flightP || 0;
    const fade = S.hand ? 1 : 1 - THREE.MathUtils.smoothstep(P, 0.01, 0.06) * (1 - THREE.MathUtils.smoothstep(P, 0.94, 0.995));
    st.shadow.set(lift * 4, (st.shadowAlpha == null ? 1 : st.shadowAlpha) * fade);
    return false;
  };
  const basePlace = st.placeShadow;
  st.placeShadow = function () { basePlace.call(st); floorHero = st.floorTo; };

  /* soft swap: the old piece eases out over 0.6 s, turning on a little and settling smaller; at 70% the new one
     begins to arrive, turning into place over 1 s. The first piece, with a poster, starts as the picture instead. */
  let first = true;
  let posterVis = null;
  const transition = function (built) {
    if (first && poster && !AU.reduced) {
      first = false;
      const sl = st.mount(built);
      sl.alpha = 1;
      S.hand = { t: 0, dur: 1.7, el: poster };
      st.firstDrawn.then(function () {
        if (posterVis === null) posterVis = poster.style.visibility;
        poster.style.visibility = 'hidden';
      });
      return new Promise(function (res) {
        const chk = function () { if (!S.hand || st.disposed) res(); else setTimeout(chk, 120); };
        setTimeout(chk, 1700);
      });
    }
    if (first && poster) {
      st.firstDrawn.then(function () { if (posterVis === null) posterVis = poster.style.visibility; poster.style.visibility = 'hidden'; });
    }
    first = false;
    return glSwap(st, built, SWAP);
  };
  const SWAP = { out: 0.6, in: 1.0 };
  // a click on another piece is answered in the same frame: the piece on stage starts to leave while the next builds
  const early = function (spec) {
    if (first || !st.slot || !st.piece) return;
    if (JSON.stringify(KIT.spec(spec)) === JSON.stringify(st.piece.spec)) return;
    glDepart(st, SWAP);
  };
  const setSpec = glSpecQueue(st, transition, early);
  // the hero's other pieces are built ahead in calm idle time, so a click (or the auto-advance) never builds while the
  // departing piece animates (o.prebuild, else the home's hero pieces from the content)
  try {
    const ids = (AU.content && AU.content.hero && AU.content.hero.pieces) || [];
    const pre = Array.isArray(o.prebuild) ? o.prebuild : ids.map(function (id) { const p = AU.product ? AU.product(id) : null; return p && p.spec; });
    setSpec.prebuild(pre.filter(Boolean));
  } catch (e) { /* built on demand */ }

  /* pointer: a gentle tilt toward the pointer, drag to turn with inertia (on the anchor in anchor mode) */
  const target = anchor || st.canvas;
  const onMove = function (e) {
    if (e.pointerType === 'touch' || S.drag || AU.reduced) return;
    S.tx = Math.max(-1, Math.min(1, e.clientX / window.innerWidth * 2 - 1));
    S.ty = Math.max(-1, Math.min(1, e.clientY / window.innerHeight * 2 - 1));
    if (st.shouldRun()) st.wake();
  };
  const onDown = function (e) {
    if (e.button !== 0 || S.fpS > 0.05 || S.hand) return;
    if (anchor && e.target && e.target.closest && e.target.closest('a,button,input,select,textarea,label,[role="button"]')) return;
    S.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, lt: performance.now(), v: 0, moved: false };
    try { target.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    if (!anchor) st.canvas.style.cursor = 'grabbing';
    st.wake();
  };
  const onDrag = function (e) {
    const d = S.drag;
    if (!d || e.pointerId !== d.id) return;
    const now = performance.now();
    const dx = e.clientX - d.lx;
    const w = Math.max(240, anchor && aRect ? aRect.w : st.size.w);
    const da = dx / w * 3.4;
    S.angle += da;
    const dtm = Math.max(1, now - d.lt) / 1000;
    d.v = d.v * 0.6 + (da / dtm) * 0.4;
    d.lx = e.clientX; d.lt = now;
    st.wake();
  };
  const onUp = function (e) {
    const d = S.drag;
    if (!d || e.pointerId !== d.id) return;
    S.vel = Math.max(-5, Math.min(5, performance.now() - d.lt > 120 ? 0 : d.v));
    S.drag = null;
    if (!anchor) st.canvas.style.cursor = 'grab';
    st.wake();
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onDrag);
  target.addEventListener('pointerup', onUp);
  target.addEventListener('pointercancel', onUp);
  target.addEventListener('lostpointercapture', onUp);
  const offAct = glActivity(function () { st.invalidate(); });
  const offScroll = anchor && AU.onScroll ? AU.onScroll(function () { S.scrolled = performance.now(); if (anchorVis || S.fp > 0) st.invalidate(); }) : null;
  st.cleanup = function () {
    window.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerdown', onDown);
    target.removeEventListener('pointermove', onDrag);
    target.removeEventListener('pointerup', onUp);
    target.removeEventListener('pointercancel', onUp);
    target.removeEventListener('lostpointercapture', onUp);
    offAct();
    if (offScroll) offScroll();
    if (st._aio) st._aio.disconnect();
    if (poster && posterVis !== null) poster.style.visibility = posterVis;
  };

  const api = {
    canvas: st.canvas,
    setSpec: function (spec) { return setSpec(spec); },
    setScroll: function (p) {
      p = +p || 0;
      S.scroll = AU.reduced ? 0 : Math.max(-1, Math.min(1.5, p));
      st.wake();
    },
    setFlight: function (p, tgt) {
      p = Math.max(0, Math.min(1, +p || 0));
      if (!tgt) p = 0;
      S.fp = p;
      if (tgt) { S.target = tgt; S.targetY = window.scrollY || 0; }
      if (AU.reduced) S.fpS = p;
      st.invalidate();
    },
    pause: function () { st.paused = true; st.sleep(); },
    resume: function () { st.paused = false; st.invalidate(); },
    dispose: function () { st.dispose(); },
    _stage: st,
    _state: S
  };
  api.ready = setSpec(o.spec || (AU.content && AU.content.products && AU.content.products[0].spec) || {});
  api.shown = st.firstDrawn;
  return api;
}

/* ---- 44-studio.js ---- */
/* ---- AUGL.studio(container, { spec, label, wheelZoom, light }): the close-up viewer (product page, bespoke).
   Drag to orbit (limited polar range), pinch to zoom; the mouse wheel zooms only with Ctrl / Cmd held (a trackpad
   pinch arrives that way too), after the stage has been clicked, or always when wheelZoom is true (default: true
   inside a dialog, false on the page) — otherwise the wheel scrolls the page as usual. Idle: a slow sway about the
   three-quarter view (never through an edge-on band). The piece is framed on its posed bounds with clear margins,
   re-framed with an eased dolly when a change alters its size. showEngraving() turns the view into the band.
   resetView().
   v2:
   .setLight('studio' | 'daylight' | 'candle' | 'evening') -> Promise   the light switch (idea 5), cross-faded
   .loupe(on, { zoom = 4 }) -> boolean   under the loupe (idea 2): a round magnifier that follows the pointer (touch:
        drag moves it, held above the finger), a second, sharper render through a narrower camera, with a hairline
        rim and a little refraction at the glass's edge. The wheel changes its magnification while it is over the
        piece. Without a pointer it opens over the centre stone.
   .setEngraving(text, font = 'script' | 'serif' | 'roman')   live inscription inside the band (idea 12), changed in
        place as the visitor types; the view turns into the band once the typing pauses.
   .snapshot({ scale = 2, background = true }) -> Promise<url>   the current view as an image (blob URL, WebP/PNG),
        on the page's background unless background is false.
   ---- */

function glStudio(container, o) {
  o = o || {};
  const st = new GlStage(container, { kind: 'studio', label: o.label, fov: 28, normalize: false, light: o.light });
  st.shadowTilt = 0;
  const RING_HOME = { az: -0.62, pol: 1.0, zoom: 1 }, FRONT_HOME = { az: 0, pol: 1.36, zoom: 1 };
  let HOME = RING_HOME;
  const LIM = { pol: [0.34, 1.56], zoom: [0.5, 1.3] };
  const MARGIN = { t: 0.13, b: 0.17, l: 0.12, r: 0.12 };
  const focus = new THREE.Vector3(), aim = new THREE.Vector3(), tmp = new THREE.Vector3();
  const S = {
    az: HOME.az, pol: HOME.pol, zoom: HOME.zoom, zoomT: HOME.zoom,
    vAz: 0, vPol: 0, idle: 0, swayW: 0, swayT: 0,
    drag: null, pts: new Map(), pinch: null, anim: null,
    frame: null, fitT: null, aspect: 0,
    look: null, lookW: 0
  };
  const reduced = function () { return !!AU.reduced; };
  /* the room's turn: the still's (matchStill, below), and for the engraving close-up a further turn that brings the
     key softbox into the inner band's mirror (looking down into the band, the bottom of its inner wall mirrors the
     dim room up behind the ring: in the dark room yellow gold read olive there) */
  const envBase = new THREE.Quaternion(), envQ = new THREE.Quaternion(), envTurn = new THREE.Quaternion(), envAxis = new THREE.Vector3(0, 1, 0);
  let envAt = -1;
  const ENG_ENV_TURN = -2.36;
  const applyEnv = function (w) {
    if (!st.scene.environmentRotation) return;
    w = Math.round(w * 200) / 200;
    if (w === envAt) return;
    envAt = w;
    envTurn.setFromAxisAngle(envAxis, ENG_ENV_TURN * w);
    envQ.copy(envBase).multiply(envTurn);
    st.scene.environmentRotation.setFromQuaternion(envQ);
  };
  const dirOf = function (az, pol, out) { return (out || new THREE.Vector3()).set(Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az)); };
  const unwrap = function (a, ref) { while (a - ref > Math.PI) a -= G_TAU; while (a - ref < -Math.PI) a += G_TAU; return a; };

  /* integrator — o.matchStill = { h, w }: the page shows the catalogue still in this stage first (the product page:
     a square h of the stage's height, at most w of its width, centred) and cross-fades to the studio once it is
     ready. The studio's home view then reproduces that still: the still's turn, tilt and camera elevation become the
     home orbit (the camera goes where the still's camera was, seen from the piece), the still's framing gives the
     orbit centre and distance, and the field of view maps the still's square onto the stage. The silhouettes meet
     exactly, so the hand-over reads as light settling on the piece, never as a double image. */
  const MS = o.matchStill && typeof glStillPoseFor === 'function' ? o.matchStill : null;
  const BASE_FOV = st.camera.fov;
  let SH = null;
  const stillEntry = function (b) {
    if (!b.__still || b.__still.m !== b.measure) b.__still = { built: b, m: b.measure || glMeasure(b.object), poses: {} };
    return b.__still;
  };
  st.prepBuilt = function (b) { if (MS && b && b.view && b.view.still) glStillPoseFor(stillEntry(b), 'three-quarter'); };
  const stillHome = function () {
    const sl = st.slot;
    if (!MS || !sl || !sl.built.view || !sl.built.view.still || !sl.measure) return null;
    try {
      const v = sl.built.view, m = sl.measure;
      // the pose is worked out once per piece (in the build's idle steps: st.prepBuilt), never inside a swap frame
      const pose = glStillPoseFor(stillEntry(sl.built), 'three-quarter');
      // still space = Rx(tilt) · Ry(turn) · (p − centre); the studio's space is the piece's own, centred on m.center
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pose.tilt, 0, 0))
        .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pose.turn, 0))).invert();
      const target = pose.cam.target.clone().applyQuaternion(q).add((v.pivot || m.center).clone().sub(m.center));
      const d = pose.dir.clone().applyQuaternion(q).normalize();
      // the still's room stays fixed while its piece is turned and tilted; seen from the piece, the room is turned the
      // other way: the same turn on the studio's environment keeps every reflection where the still has it
      envBase.copy(q); envAt = -1;
      return { az: Math.atan2(d.x, d.z), pol: Math.acos(Math.max(-1, Math.min(1, d.y))), zoom: 1, target: target, D: pose.cam.D };
    } catch (e) { return null; }
  };
  const stillFov = function () {
    const w = st.size && st.size.w, h = st.size && st.size.h;
    if (!w || !h) return BASE_FOV;
    const s = Math.min(MS.h * h, MS.w * w);
    return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(G_STILL_FOV) / 2) * h / s));
  };

  /* framing: the piece (or the part of it its view frames) and its contact shadow, at the home view, with margins */
  const computeFrame = function () {
    const sl = st.slot;
    if (!sl) return null;
    if (MS) { const sh = stillHome(); if (sh) SH = sh; }   // the piece on the stage now (a new stone or carat re-frames)
    if (MS && SH) {
      st.camera.fov = stillFov();
      st.camera.updateProjectionMatrix();
      return { target: SH.target.clone(), D: SH.D };
    }
    const m = sl.measure, box = sl.built.view.frame;
    let pts = m.points;
    if (box) { const b = box.clone().expandByScalar(0.01); const inside = pts.filter(function (p) { return b.containsPoint(p); }); if (inside.length > 12) pts = inside; }
    pts = pts.concat(sl.built.view.frameExtra || []).map(function (p) { return p.clone().sub(m.center); });
    const f = glFloor(m, 0, 1);
    [[1.15, 0], [-1.15, 0], [0, 1.1], [0, -1.1]].forEach(function (d) { pts.push(new THREE.Vector3(f.cx + d[0] * f.fx, f.y, f.cz + d[1] * f.fz)); });
    const fr = glFrameFit(pts, dirOf(HOME.az, HOME.pol), st.camera.fov, st.camera.aspect, MARGIN);
    // never so close that orbiting cuts the piece off badly
    const v = THREE.MathUtils.degToRad(st.camera.fov) / 2, hz = Math.atan(Math.tan(v) * st.camera.aspect);
    fr.D = Math.max(fr.D, m.radius / Math.sin(Math.min(v, hz)) * 0.94);
    return fr;
  };
  st.fit = function () {
    const f = computeFrame();
    if (!f) return;
    const snap = !S.frame || Math.abs(S.aspect - st.camera.aspect) > 1e-4 || reduced();
    S.aspect = st.camera.aspect;
    if (snap) { S.frame = f; S.fitT = null; }
    else if (f.target.distanceTo(S.frame.target) + Math.abs(f.D - S.frame.D) > S.frame.D * 0.004) {
      S.fitT = { from: { target: S.frame.target.clone(), D: S.frame.D }, to: f, t: 0, dur: 0.9 };
    }
    focus.set(0, 0, 0);
    if (st.piece && st.piece.view.focus && st.measure) focus.copy(st.piece.view.focus).sub(st.measure.center);
    // pendants: the chain fades out toward the top of the stage instead of being cut by its edge
    const fade = !!(st.piece && st.piece.view.frame);
    st.canvas.style.webkitMaskImage = st.canvas.style.maskImage = fade ? 'linear-gradient(to bottom, transparent 0, rgba(0,0,0,.35) 9%, #000 24%)' : '';
  };

  st.update = function (t, dt) {
    const red = reduced();
    let moving = st.runTweens(dt);
    if (S.drag || S.pinch || LP.on) { S.idle = 0; if (S.drag || S.pinch) moving = true; }
    else S.idle += dt;
    // eased re-framing (a bigger stone, another setting)
    if (S.fitT) {
      const F = S.fitT;
      F.t += dt;
      const e = glEaseInOut(Math.min(1, F.t / F.dur));
      S.frame = { target: F.from.target.clone().lerp(F.to.target, e), D: F.from.D + (F.to.D - F.from.D) * e };
      if (F.t >= F.dur) { S.frame = F.to; S.fitT = null; }
      moving = true;
    }
    if (!S.drag) {
      S.az += S.vAz * dt; S.pol += S.vPol * dt;
      S.vAz *= Math.exp(-dt * 3.6); S.vPol *= Math.exp(-dt * 4.2);
      if (Math.abs(S.vAz) < 0.002) S.vAz = 0;
      if (Math.abs(S.vPol) < 0.002) S.vPol = 0;
    }
    // scripted camera moves: reset, the engraving close-up and the way back
    if (S.anim) {
      const A = S.anim;
      A.t += dt;
      const k = Math.min(1, A.t / A.dur), e = glEaseInOut(k);
      S.az = A.from.az + (A.to.az - A.from.az) * e;
      S.pol = A.from.pol + (A.to.pol - A.from.pol) * e;
      S.zoomT = S.zoom = A.from.zoom + (A.to.zoom - A.from.zoom) * e;
      S.lookW = A.from.look + (A.to.look - A.from.look) * e;
      if (k >= 1) {
        if (A.hold > 0) { A.hold -= dt; }
        else { S.anim = null; if (A.then) A.then(); }
      }
      moving = true;
      S.idle = 0;
    }
    // idle: a slow sway about the home view (never a full turn: an eternity band edge-on reads as a strange object)
    const want = !red && !S.anim && S.idle > 4 && !S.drag && !S.pinch ? 1 : 0;
    S.swayW += (want - S.swayW) * (1 - Math.exp(-dt * (want ? 0.5 : 4)));
    if (S.swayW < 0.0005 && !want) S.swayW = 0;
    let sway = 0;
    if (S.swayW > 0) {
      S.swayT += dt;
      const home = unwrap(HOME.az, S.az);
      const kk = 1 - Math.exp(-dt * 0.35 * S.swayW);
      S.az += (home - S.az) * kk;
      S.pol += (HOME.pol - S.pol) * kk;
      S.zoomT += (HOME.zoom - S.zoomT) * kk;
      const A = st.piece && st.piece.view.front ? 0.5 : 0.55;
      sway = S.swayW * A * Math.sin(S.swayT * G_TAU / 16);
      moving = true;
    }
    S.pol = Math.max(LIM.pol[0], Math.min(LIM.pol[1], S.pol));
    S.zoomT = Math.max(LIM.zoom[0], Math.min(LIM.zoom[1], S.zoomT));
    S.zoom += (S.zoomT - S.zoom) * (1 - Math.exp(-dt * 8));
    if (S.vAz || S.vPol || Math.abs(S.zoomT - S.zoom) > 0.0005) moving = true;
    const fr = S.frame || { target: new THREE.Vector3(), D: st.fitDistance(1.2) };
    const dist = fr.D * S.zoom;
    // zooming in drifts the orbit centre toward the piece's focus (the stone of a ring); the engraving close-up
    // looks at the inscription
    const fk = THREE.MathUtils.smoothstep(1 - S.zoom, 0, 1 - LIM.zoom[0]);
    aim.copy(fr.target).lerp(focus, fk);
    if (S.look && S.lookW > 0) aim.lerp(S.look, S.lookW);
    st.camera.position.copy(dirOf(S.az + sway, S.pol, tmp)).multiplyScalar(dist).add(aim);
    st.camera.near = Math.max(0.3, dist - st.radius * 3);
    st.camera.far = dist + st.radius * 4;
    st.camera.lookAt(aim);
    st.camera.updateProjectionMatrix();
    st.shadow.group.visible = S.pol < 1.5;
    applyEnv(S.look && S.lookW > 0 ? glSmooth(Math.min(1, S.lookW / ENG_VIEW.look)) : 0);
    S.swayNow = sway;
    if (loupeStep(dt)) moving = true;
    return moving;
  };

  /* the home view follows the piece: rings in three-quarter, earrings and pendants facing the camera */
  const setHome = function (piece, first) {
    let h = piece && piece.view.front ? FRONT_HOME : RING_HOME;
    if (MS) { SH = stillHome(); if (SH) h = SH; }
    if (h === HOME && !first) return;
    HOME = h;
    if (first) { S.az = HOME.az; S.pol = HOME.pol; S.zoom = S.zoomT = HOME.zoom; S.frame = null; st.fit(); return; }
    st.fit();
    api.resetView();
  };

  /* the inscription the visitor is writing (setEngraving), kept across rebuilds unless a spec brings its own */
  const ENG = { text: null, font: 'serif', timer: 0 };
  let lastSpec = null;
  const transition = function (built) {
    const prev = lastSpec;
    lastSpec = built.spec;
    const quick = prev && st.piece && prev.type === built.spec.type && prev.style === built.spec.style && !(st.slot && st.slot.departing);
    const engraved = built.spec.engraving && (!prev || prev.engraving !== built.spec.engraving);
    if (quick) {
      // same setting, another metal / stone / size / inscription: a 0.6 s crossfade from a captured frame
      const old = st.slot;
      st.snapshot(0.6);
      st.mount(built);
      if (old) st.unmountSlot(old);
      if (engraved) api.showEngraving();
      return Promise.resolve();
    }
    return glSwap(st, built, Object.assign({ onMount: function (sl, first) { setHome(sl.built, first); } }, SWAP))
      .then(function () { if (engraved) api.showEngraving(); });
  };
  const SWAP = { out: 0.45, in: 0.8, turnOut: 0.3, turnIn: -0.35 };
  // another setting or type: the piece on stage starts to leave at once, while the next one is built (a metal, stone
  // or size change of the same setting stays an in-place crossfade)
  const early = function (spec) {
    const prev = lastSpec, s = KIT.spec(spec);
    if (!prev || !st.slot || (prev.type === s.type && prev.style === s.style)) return;
    glDepart(st, SWAP);
  };
  const queue = glSpecQueue(st, transition, early);
  const setSpec = function (spec) {
    spec = Object.assign({}, spec || {});
    if (spec.engraving === undefined && ENG.text != null) { spec.engraving = ENG.text; spec.engraveFont = ENG.font; }
    else if (spec.engraving !== undefined) { ENG.text = spec.engraving || ''; ENG.font = spec.engraveFont || ENG.font; }
    return queue(spec);
  };

  /* ---------------- input ---------------- */
  const cv = st.canvas;
  let cvRect = null;
  const rectNow = function () { if (!cvRect) cvRect = cv.getBoundingClientRect(); return cvRect; };
  const dropRect = function () { cvRect = null; };
  window.addEventListener('scroll', dropRect, { passive: true });
  window.addEventListener('resize', dropRect);
  const bakeSway = function () { if (S.swayW > 0) { S.az += S.swayNow || 0; S.swayW = 0; S.swayNow = 0; } };
  let engaged = false;
  const down = function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    engaged = true;
    S.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    bakeSway();
    S.anim = null; S.lookW = 0; S.idle = 0;
    // with the loupe on, a finger moves the lens rather than the piece
    if (LP.on && e.pointerType === 'touch' && S.pts.size === 1) { loupePoint(e, true); S.lensDrag = e.pointerId; st.wake(); return; }
    if (S.pts.size === 1) S.drag = { id: e.pointerId, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0 };
    else if (S.pts.size === 2) {
      const a = Array.from(S.pts.values());
      S.pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, z: S.zoomT };
      S.drag = null; S.lensDrag = null;
    }
    cv.style.cursor = LP.on && e.pointerType !== 'touch' ? 'none' : 'grabbing';
    st.wake();
  };
  const move = function (e) {
    if (LP.on && e.pointerType !== 'touch') loupePoint(e, false);
    if (!S.pts.has(e.pointerId)) return;
    S.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (S.lensDrag === e.pointerId) { loupePoint(e, true); S.idle = 0; st.wake(); return; }
    if (S.pinch && S.pts.size >= 2) {
      const a = Array.from(S.pts.values());
      const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1;
      S.zoomT = S.pinch.z * S.pinch.d / d;
    } else if (S.drag && S.drag.id === e.pointerId) {
      const d = S.drag, now = performance.now(), dtm = Math.max(1, now - d.lt) / 1000;
      const k = 3.2 / Math.max(260, Math.min(st.size.w, st.size.h * 1.4));
      const dAz = -(e.clientX - d.lx) * k, dPol = -(e.clientY - d.ly) * k * 0.8;
      S.az += dAz;
      if (e.pointerType !== 'touch') S.pol += dPol;
      d.vx = d.vx * 0.6 + dAz / dtm * 0.4; d.vy = d.vy * 0.6 + (e.pointerType !== 'touch' ? dPol / dtm : 0) * 0.4;
      d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
    }
    S.idle = 0;
    st.wake();
  };
  const up = function (e) {
    if (!S.pts.has(e.pointerId)) return;
    S.pts.delete(e.pointerId);
    if (S.lensDrag === e.pointerId) S.lensDrag = null;
    if (S.drag && S.drag.id === e.pointerId) {
      const fresh = performance.now() - S.drag.lt < 120;
      S.vAz = fresh ? Math.max(-3, Math.min(3, S.drag.vx)) : 0;
      S.vPol = fresh ? Math.max(-2, Math.min(2, S.drag.vy)) : 0;
      S.drag = null;
    }
    if (S.pts.size < 2) S.pinch = null;
    if (S.pts.size === 1) { const id = Array.from(S.pts.keys())[0], p = S.pts.get(id); S.drag = { id: id, lx: p.x, ly: p.y, lt: performance.now(), vx: 0, vy: 0 }; }
    if (!S.pts.size) cv.style.cursor = LP.on && LP.has && e.pointerType !== 'touch' ? 'none' : 'grab';
    S.idle = 0;
    st.wake();
  };

  /* the wheel never hijacks the page: zoom with Ctrl / Cmd (and trackpad pinch), or once the stage is engaged */
  const wheelAlways = o.wheelZoom != null ? !!o.wheelZoom : !!(container.closest && container.closest('[role="dialog"], [data-overlay], .overlay'));
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  let hint = null, hintT = 0;
  const showHint = function () {
    if (AU.touch) return;
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'augl-hint caps caps--sm';
      hint.setAttribute('aria-hidden', 'true');
      const t = AU.t ? AU.t('ui.gl.zoomHint') : '';
      hint.textContent = t && t !== 'ui.gl.zoomHint' ? t.replace('{key}', mac ? '⌘' : 'Ctrl') : (mac ? 'Hold ⌘' : 'Hold Ctrl') + ' and scroll to zoom';
      hint.style.cssText = 'position:absolute;left:50%;top:18px;transform:translate(-50%,-4px);pointer-events:none;white-space:nowrap;' +
        'color:var(--fg-3);opacity:0;transition:opacity .6s var(--ease, ease),transform .6s var(--ease, ease);z-index:2;';
      cv.insertAdjacentElement('afterend', hint);
    }
    requestAnimationFrame(function () { hint.style.opacity = '1'; hint.style.transform = 'translate(-50%,0)'; });
    clearTimeout(hintT);
    hintT = setTimeout(function () { if (hint) { hint.style.opacity = '0'; hint.style.transform = 'translate(-50%,-4px)'; } }, 1600);
  };
  const wheel = function (e) {
    if (LP.on && LP.has) {
      // under the loupe the wheel changes its magnification
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
      LP.zoomT = Math.max(2, Math.min(8, LP.zoomT * Math.exp(-dy * 0.0016)));
      st.wake();
      return;
    }
    if (!(e.ctrlKey || e.metaKey || wheelAlways || engaged)) { showHint(); return; }
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
    S.zoomT *= Math.exp(dy * (e.ctrlKey && !wheelAlways ? 0.004 : 0.0011));
    bakeSway();
    S.anim = null; S.lookW = 0; S.idle = 0;
    st.wake();
  };
  const enter = function (e) { dropRect(); if (LP.on && e.pointerType !== 'touch') { loupePoint(e, true); cv.style.cursor = 'none'; } };
  const leave = function (e) {
    engaged = false;
    if (LP.on && e.pointerType !== 'touch' && !S.pts.size) { LP.has = false; cv.style.cursor = 'grab'; st.wake(); }
  };
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('lostpointercapture', up);
  cv.addEventListener('pointerenter', enter);
  cv.addEventListener('pointerleave', leave);
  cv.addEventListener('wheel', wheel, { passive: false });
  cv.addEventListener('dblclick', function () { api.resetView(); });

  /* camera move to a view, optionally holding it, then calling `then` */
  const animTo = function (to, dur, hold, then) {
    bakeSway();
    S.vAz = S.vPol = 0; S.idle = 0;
    const az = unwrap(S.az, to.az);
    S.az = az;
    S.anim = {
      from: { az: az, pol: S.pol, zoom: S.zoom, look: S.lookW },
      to: { az: to.az, pol: to.pol, zoom: to.zoom, look: to.look || 0 },
      t: 0, dur: reduced() ? 0.01 : dur, hold: hold || 0, then: then
    };
    st.wake();
  };

  /* ---------------- the loupe (idea 2) ---------------- */
  const LP = {
    on: false, a: 0, zoom: 4, zoomT: 4, x: 0, y: 0, tx: 0, ty: 0, has: false, rt: null, size: 0, ready: null,
    cam: new THREE.PerspectiveCamera(), scene: null, ocam: null, mats: null, quad: null, rim: [1, 1, 1], shade: [0, 0, 0, 0.24]
  };
  const lensR = function () { return Math.max(60, Math.min(124, Math.min(st.size.w, st.size.h) * 0.17)); };
  /* the lens follows the pointer (a finger: held above it, so the finger never covers what it magnifies) */
  const loupePoint = function (e, snap) {
    const r = rectNow();
    let x = e.clientX - r.left, y = e.clientY - r.top;
    if (e.pointerType === 'touch') y -= lensR() * 1.15;
    LP.tx = x; LP.ty = y;
    if (snap || !LP.has) { LP.x = x; LP.y = y; }
    LP.has = true;
    st.wake();
  };
  const cssColor = function (v, fb) {
    try {
      const c = document.createElement('canvas').getContext('2d');
      c.fillStyle = '#000'; c.fillStyle = v || fb;
      const s = c.fillStyle;
      if (s[0] === '#') return [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
      const m = s.match(/[\d.]+/g);
      return [m[0] / 255, m[1] / 255, m[2] / 255];
    } catch (er) { return [1, 1, 1]; }
  };
  const loupeColors = function () {
    const cs = getComputedStyle(document.documentElement);
    LP.rim = cssColor(cs.getPropertyValue('--fg').trim(), '#fff');
    const light = (AU.getMode ? AU.getMode() : 'dark') === 'light';
    LP.shade = light ? [LP.rim[0], LP.rim[1], LP.rim[2], 0.11] : [0, 0, 0, 0.26];
    if (LP.mats) { LP.mats.rim.uniforms.uRim.value.fromArray(LP.rim); LP.mats.rim.uniforms.uShade.value.fromArray(LP.shade); }
  };
  const LENS_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const LENS_COMMON = 'varying vec2 vUv; uniform float uA; uniform float uK; vec2 lensD() { return (vUv - 0.5) * 2.0 * uK; }';
  const loupeBuild = function () {
    if (LP.scene) return;
    const erase = new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 }, uK: { value: 1 } },
      vertexShader: LENS_VERT,
      fragmentShader: LENS_COMMON + `
        void main() {
          float rho = length(lensD()), aa = fwidth(rho);
          float m = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, rho);
          gl_FragColor = vec4(0.0, 0.0, 0.0, m * uA);
        }`,
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
      blending: THREE.CustomBlending, blendSrc: THREE.ZeroFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor
    });
    const content = new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 }, uK: { value: 1 }, tex: { value: null } },
      vertexShader: LENS_VERT,
      fragmentShader: LENS_COMMON + `
        uniform sampler2D tex;
        void main() {
          vec2 d = lensD();
          float rho = length(d), aa = fwidth(rho);
          float m = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, rho);
          if (m <= 0.0) discard;
          // the glass bends the view near its edge: a little more magnification there, and a faint colour split
          float b = smoothstep(0.7, 1.0, rho);
          vec2 q = d * (1.0 - 0.12 * b * b);
          float ca = 0.011 * b;
          vec4 g = texture2D(tex, 0.5 + 0.5 * q);
          float r = texture2D(tex, 0.5 + 0.5 * q * (1.0 + ca)).r;
          float bl = texture2D(tex, 0.5 + 0.5 * q * (1.0 - ca)).b;
          vec4 c = vec4(r, g.g, bl, g.a);
          c.rgb *= 1.0 - 0.16 * b;
          vec3 col = c.a > 1e-4 ? c.rgb / c.a : vec3(0.0);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          float al = clamp(c.a, 0.0, 1.0) * m * uA;
          gl_FragColor = vec4(gl_FragColor.rgb * al, al);
        }`,
      transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor
    });
    const rim = new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 }, uK: { value: 1 }, uRim: { value: new THREE.Vector3(1, 1, 1) }, uShade: { value: new THREE.Vector4(0, 0, 0, 0.24) }, uPx: { value: 0.01 } },
      vertexShader: LENS_VERT,
      fragmentShader: LENS_COMMON + `
        uniform vec3 uRim; uniform vec4 uShade; uniform float uPx;
        void main() {
          vec2 d = lensD();
          float rho = length(d), aa = max(fwidth(rho), 1e-4);
          // a hairline rim, a soft shadow lifting the glass off the page, a faint light on the upper left of the glass
          float line = 1.0 - smoothstep(uPx * 0.55, uPx * 0.55 + aa * 1.2, abs(rho - 1.0));
          float sh = smoothstep(1.0, 1.0 + aa, rho) * (1.0 - smoothstep(1.0, 1.0 + uPx * 16.0, rho));
          sh = sh * sh * uShade.a;
          float ang = dot(d / max(rho, 1e-4), normalize(vec2(-0.72, 0.69)));
          float sheen = smoothstep(0.82, 0.975, rho) * (1.0 - smoothstep(0.975, 1.0, rho)) * smoothstep(0.35, 1.0, ang) * 0.12;
          float dot0 = 1.0 - smoothstep(uPx * 1.1, uPx * 1.1 + aa, rho);
          vec4 o = vec4(uShade.rgb * sh, sh);
          o = vec4(vec3(1.0) * sheen, sheen) + o * (1.0 - sheen);
          float la = line * 0.62 + dot0 * 0.5;
          o = vec4(uRim * la, la) + o * (1.0 - la);
          gl_FragColor = o * uA;
        }`,
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor
    });
    LP.mats = { erase: erase, content: content, rim: rim };
    LP.scene = new THREE.Scene();
    LP.quad = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1, 1);
    [erase, content, rim].forEach(function (m, i) { const q = new THREE.Mesh(geo, m); q.renderOrder = i; q.frustumCulled = false; LP.quad.add(q); });
    LP.scene.add(LP.quad);
    LP.ocam = new THREE.OrthographicCamera(0, 1, 0, -1, -1, 1);
    loupeColors();
  };
  const loupeTarget = function () {
    const R = lensR(), S2 = Math.min(1024, Math.ceil(2 * R * st.dpr * 1.3 / 16) * 16);
    if (!LP.rt || LP.size !== S2) {
      if (LP.rt) LP.rt.dispose();
      LP.rt = new THREE.WebGLRenderTarget(S2, S2, { type: THREE.HalfFloatType, samples: G_TIER.msaa, depthBuffer: true });
      LP.size = S2;
      st.compileTargets = [LP.rt];
    }
    return LP.rt;
  };
  /* compile everything the loupe draws (the piece into its target, the lens passes) before it first shows */
  const loupePrepare = function () {
    if (LP.ready) return LP.ready;
    loupeBuild();
    LP.ready = st.prepare().then(function () {
      if (st.disposed) return;
      const r = st.renderer, rt = loupeTarget();
      const prev = r.getRenderTarget();
      const ps = [];
      r.setRenderTarget(rt);
      try { ps.push(r.compileAsync(st.scene, st.camera)); } finally { r.setRenderTarget(prev); }
      ps.push(r.compileAsync(LP.scene, LP.ocam));
      return Promise.all(ps).catch(function () { /* compile on first use */ });
    });
    return LP.ready;
  };
  /* per frame: the lens eases to the pointer, fades in and out; returns true while it moves */
  const loupeStep = function (dt) {
    if (!LP.scene) return false;
    const want = LP.on && LP.has && LP.live ? 1 : 0;
    const k = reduced() ? 1 : 1 - Math.exp(-dt * 9);
    LP.a += (want - LP.a) * k;
    if (Math.abs(want - LP.a) < 0.004) LP.a = want;
    const kp = reduced() ? 1 : 1 - Math.exp(-dt * 24);
    LP.x += (LP.tx - LP.x) * kp; LP.y += (LP.ty - LP.y) * kp;
    LP.zoom += (LP.zoomT - LP.zoom) * (1 - Math.exp(-dt * 10));
    const still = Math.abs(LP.tx - LP.x) + Math.abs(LP.ty - LP.y) < 0.2 && Math.abs(LP.zoomT - LP.zoom) < 0.004;
    if (still) { LP.x = LP.tx; LP.y = LP.ty; LP.zoom = LP.zoomT; }
    return LP.a !== want || !still;
  };
  /* after the stage has drawn: the magnified view into the lens target, then the three lens passes on top */
  st.afterDraw = function () {
    if (!LP.scene || LP.a <= 0.001 || st._snapping) return;
    const r = st.renderer, W = st.size.w, H = st.size.h;
    const R = lensR(), Z = LP.zoom;
    const rt = loupeTarget();
    const lc = LP.cam;
    lc.copy(st.camera);
    lc.setViewOffset(W * Z, H * Z, LP.x * Z - R, LP.y * Z - R, 2 * R, 2 * R);
    lc.updateProjectionMatrix();
    const gv = st.glints.group.visible;
    st.glints.group.visible = false;            // a catch-light sprite would only blur under the glass
    const prevT = r.getRenderTarget(), auto = r.autoClear;
    r.setRenderTarget(rt);
    r.autoClear = true;
    glDrawLayered(r, st.scene, lc, st.slots, null);
    r.setRenderTarget(prevT);
    st.glints.group.visible = gv;
    // the lens: erase what is under it, add the magnified view, then the rim
    const pad = 22, side = 2 * R + pad * 2;
    LP.ocam.left = 0; LP.ocam.right = W; LP.ocam.top = 0; LP.ocam.bottom = -H;
    LP.ocam.updateProjectionMatrix();
    LP.quad.position.set(LP.x, -LP.y, 0);
    LP.quad.scale.set(side, side, 1);
    const K = side / (2 * R);
    ['erase', 'content', 'rim'].forEach(function (n) { const u = LP.mats[n].uniforms; u.uA.value = LP.a; u.uK.value = K; });
    LP.mats.content.uniforms.tex.value = rt.texture;
    LP.mats.rim.uniforms.uPx.value = 1 / R;
    r.autoClear = false;
    r.render(LP.scene, LP.ocam);
    r.autoClear = auto;
  };

  /* ---------------- the inscription (idea 12) ---------------- */
  const engraveNow = function () {
    const p = st.piece;
    if (!p || p.spec.type !== 'ring') return false;
    const ok = glEngraveSet(p.object, ENG.text || '', ENG.font);
    if (ok) {
      p.spec.engraving = ENG.text || ''; p.spec.engraveFont = ENG.font;
      if (lastSpec) { lastSpec.engraving = p.spec.engraving; lastSpec.engraveFont = ENG.font; }
      st.invalidate();
    }
    return ok;
  };

  /* v2.5 the engraving close-up's view: the words read large near the middle of the stage, and the head (every part of
     the piece standing beyond the band's outer surface: stones, claws, gallery) is either entirely above the frame or
     entirely inside it, never cut by the top edge (a 3 ct three-stone's stones were halved by it). A small search
     around the house view (az 0, pol 0.7, zoom 0.58), each candidate projected through the very camera update() would
     build; the nearest one that frames cleanly wins. Measured once per close-up (a few thousand projections). */
  const ENG_VIEW = { az: 0, pol: 0.7, zoom: 0.58, look: 0.85 };
  const engFrame = function (p, eng) {
    const sl = st.slot, E = eng.userData && eng.userData.engrave, o = E && E.band;
    if (!sl || !o || !o.inner || !S.look) return Object.assign({}, ENG_VIEW);
    try {
      st.scene.updateMatrixWorld(true);
      const toBand = new THREE.Matrix4().copy(eng.parent.matrixWorld).invert().multiply(sl.holder.matrixWorld);
      let outer = o.inner;
      for (let i = 0; i < 8; i++) outer = Math.max(outer, o.inner + o.thick(-Math.PI / 2 + i / 8 * G_TAU));
      const pts = sl.measure.points, step = Math.max(1, Math.floor(pts.length / 900));
      const head = [], v = new THREE.Vector3();
      for (let i = 0; i < pts.length; i += step) {
        v.copy(pts[i]).applyMatrix4(toBand);
        if (Math.hypot(v.x, v.y) > outer * 1.05) head.push(pts[i].clone().applyMatrix4(sl.holder.matrixWorld));
      }
      while (head.length > 180) head.splice(0, head.length).forEach(function (q, i) { if (i % 2 === 0) head.push(q); });
      // the words: the corners and the middle of the strip
      const pa = eng.geometry.attributes.position, words = [];
      const nU = Math.max(1, pa.count / 9 - 1);
      [0, Math.round(nU / 4), Math.round(nU / 2), Math.round(nU * 3 / 4), Math.round(nU)].forEach(function (i) {
        [0, 4, 8].forEach(function (j) { const k = Math.min(pa.count - 1, i * 9 + j); words.push(new THREE.Vector3().fromBufferAttribute(pa, k).applyMatrix4(eng.matrixWorld)); });
      });
      const fr = S.frame || { target: new THREE.Vector3(), D: st.fitDistance(1.2) };
      const cam = st.camera.clone();
      const a = new THREE.Vector3(), d = new THREE.Vector3();
      const bbox = function (list) {
        let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
        for (let i = 0; i < list.length; i++) {
          v.copy(list[i]).project(cam);
          if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y;
        }
        return { x0: x0, x1: x1, y0: y0, y1: y1 };
      };
      const score = function (c) {
        const dist = fr.D * c.zoom;
        const fk = THREE.MathUtils.smoothstep(1 - c.zoom, 0, 1 - LIM.zoom[0]);
        a.copy(fr.target).lerp(focus, fk).lerp(S.look, c.look);
        cam.position.copy(dirOf(c.az, c.pol, d)).multiplyScalar(dist).add(a);
        cam.near = Math.max(0.3, dist - st.radius * 3); cam.far = dist + st.radius * 4;
        cam.lookAt(a); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
        const w = bbox(words);
        // the words wholly in the frame, a little below its middle, at a readable size
        if (w.x0 < -0.86 || w.x1 > 0.86 || w.y0 < -0.8 || w.y1 > 0.5) return 1e9;
        const tw = w.x1 - w.x0;
        let s = Math.abs(c.pol - ENG_VIEW.pol) * 2 + Math.abs(c.zoom - ENG_VIEW.zoom) * 3 + Math.abs(c.look - ENG_VIEW.look);
        s += tw < 0.9 ? (0.9 - tw) * 5 : 0;
        if (head.length) {
          const h = bbox(head);
          const out = h.y0 > 1.03 || h.x1 < -1.03 || h.x0 > 1.03;                // wholly beyond an edge
          const inside = h.y1 < 0.92 && h.y0 > -0.92 && h.x0 > -0.94 && h.x1 < 0.94;
          if (!out && !inside) return 1e9;
          if (inside) s += 0.25;                                               // the band, not the stone, is the subject
        }
        return s;
      };
      let best = null, bestS = 1e9;
      const pols = [0.7, 0.64, 0.76, 0.58, 0.84, 0.52, 0.92, 1.0], zooms = [0.58, 0.54, 0.5, 0.64, 0.7, 0.78, 0.88, 1.0], looks = [0.85, 1, 0.7];
      pols.forEach(function (pp) {
        zooms.forEach(function (zz) {
          looks.forEach(function (ll) {
            const c = { az: 0, pol: pp, zoom: zz, look: ll };
            const sc = score(c);
            if (sc < bestS) { bestS = sc; best = c; }
          });
        });
      });
      return best || Object.assign({}, ENG_VIEW);
    } catch (e) { return Object.assign({}, ENG_VIEW); }
  };

  const api = {
    canvas: cv,
    setSpec: function (spec) { return setSpec(spec); },
    resetView: function () { animTo({ az: HOME.az, pol: HOME.pol, zoom: HOME.zoom, look: 0 }, 1.1); },
    /* turn the view into the band so the inscription reads, hold it, then ease back (a drag cancels it) */
    showEngraving: function (hold) {
      const p = st.piece;
      if (!p || p.spec.type !== 'ring' || !p.spec.engraving || !st.measure) return;
      const eng = p.object.getObjectByName('engraving');
      if (!eng || !eng.visible) return;
      if (!eng.geometry.boundingSphere) eng.geometry.computeBoundingSphere();
      // the words' centre in the piece's own frame (the inscription lies in the band's group, which may be turned)
      p.object.updateMatrixWorld(true);
      const rel = new THREE.Matrix4().copy(p.object.matrixWorld).invert().multiply(eng.matrixWorld);
      S.look = eng.geometry.boundingSphere.center.clone().applyMatrix4(rel).sub(st.measure.center);
      const keep = S.anim && S.anim.engraving;
      // v2.4: closer, and centred on the words (at the whole-ring distance the script hand was too small to read)
      // v2.5: framed on the band's inner arc, and never cutting the head: a big centre stone is either wholly above
      // the frame or wholly in it (engFrame)
      const to = engFrame(p, eng);
      animTo(to, keep ? 0.5 : 1.3, hold == null ? 3.4 : hold, function () {
        animTo({ az: HOME.az, pol: HOME.pol, zoom: HOME.zoom, look: 0 }, 1.4);
      });
      S.anim.engraving = true;
    },
    setEngraving: function (text, font) {
      const t = typeof text === 'string' ? text.replace(/\s+/g, ' ').slice(0, 40) : '';
      const f = font === 'script' || font === 'roman' || font === 'serif' ? font : (ENG.font || 'serif');
      const changed = t.trim() !== (ENG.text || '') || f !== ENG.font;
      ENG.text = t.trim(); ENG.font = f;
      if (!changed) return;
      if (!engraveNow()) return;
      // the view turns into the band once the typing pauses (and stays there while it continues)
      clearTimeout(ENG.timer);
      if (ENG.text) {
        if (S.anim && S.anim.engraving) { S.anim.hold = Math.max(S.anim.hold, 2.6); return; }
        ENG.timer = setTimeout(function () { api.showEngraving(); }, 650);
      }
    },
    setLight: function (name) {
      // the room changes: hold the idle sway for a moment so the eye stays on the light moving over the metal
      S.idle = Math.min(S.idle, 1);
      return st.setLight(name);
    },
    get light() { return st.light; },
    loupe: function (on, lo) {
      lo = lo || {};
      if (lo.zoom) LP.zoomT = Math.max(2, Math.min(8, +lo.zoom || 4));
      LP.on = !!on;
      if (LP.on) {
        loupeColors();
        if (!LP.has) {
          // no pointer over the stage: open over the stone
          const p = st.slot && st.piece;
          let x = st.size.w / 2, y = st.size.h * 0.42;
          if (p) {
            const f = (p.view.focus ? p.view.focus.clone() : st.measure.center.clone());
            st.slot.holder.updateMatrixWorld(true);
            f.applyMatrix4(st.slot.holder.matrixWorld).project(st.camera);
            if (isFinite(f.x) && isFinite(f.y)) { x = (f.x + 1) / 2 * st.size.w; y = (1 - f.y) / 2 * st.size.h; }
          }
          LP.tx = LP.x = x; LP.ty = LP.y = y; LP.has = true;
        }
        loupePrepare().then(function () { LP.live = true; st.invalidate(); });
      } else { LP.live = LP.live && LP.a > 0; cv.style.cursor = 'grab'; }
      S.idle = 0;
      st.invalidate();
      return LP.on;
    },
    snapshot: function (so) {
      so = so || {};
      return st.prepare().then(function () {
        const r = st.renderer, w = st.size.w, h = st.size.h;
        const scale = Math.max(1, Math.min(2048 / Math.max(w, h), so.scale || 2));
        const prev = r.getPixelRatio();
        st._snapping = true;
        let out;
        try {
          r.setPixelRatio(scale); r.setSize(w, h, false);
          st.scene.updateMatrixWorld();
          st.draw();
          out = document.createElement('canvas');
          out.width = r.domElement.width; out.height = r.domElement.height;
          const g = out.getContext('2d');
          if (so.background !== false) glPaintPage(g, out.width, out.height);
          g.drawImage(r.domElement, 0, 0);
        } finally {
          st._snapping = false;
          r.setPixelRatio(prev); r.setSize(w, h, false);
          st.draw();                              // the visible canvas never shows an empty frame
        }
        return glToBlobURL(out, 0.95);
      });
    },
    pause: function () { st.paused = true; st.sleep(); },
    resume: function () { st.paused = false; st.invalidate(); },
    dispose: function () { st.dispose(); },
    _stage: st,
    _state: S,
    _loupe: LP
  };
  st.cleanup = function () {
    clearTimeout(hintT); clearTimeout(ENG.timer);
    if (hint) hint.remove(); hint = null;
    window.removeEventListener('scroll', dropRect);
    window.removeEventListener('resize', dropRect);
    if (LP.rt) LP.rt.dispose();
    if (LP.mats) Object.keys(LP.mats).forEach(function (k) { LP.mats[k].dispose(); });
    if (LP.quad) LP.quad.children[0].geometry.dispose();
  };
  const offMode = AU.on('mode', function () { if (LP.on) setTimeout(loupeColors, 60); });
  const prevCleanup = st.cleanup;
  st.cleanup = function () { offMode(); prevCleanup(); };
  // once the first piece is shown, prepare the loupe in idle time, so turning it on is instant
  st.firstDrawn.then(function () { setTimeout(function () { if (!st.disposed) glIdle(function () { return loupePrepare(); }, 6); }, 1800); });
  // and, after two calm seconds, every light's room for the current mode (in small idle steps), so a light switch
  // starts its crossfade in the very frame of the click
  st.firstDrawn.then(function () {
    const prewarm = function () {
      if (st.disposed) return;
      if (performance.now() - G_BUSY.t < 2000 || glBusy()) { setTimeout(prewarm, 700); return; }
      G_LIGHT_NAMES.reduce(function (p, name) {
        return p.then(function () { return st.disposed ? null : glEnvAsync(st.renderer, name, st.mode); })
          .then(function () { return st.disposed ? null : glGemEnvAsync(st.renderer, name); });
      }, Promise.resolve()).catch(function () { /* made on demand then */ });
    };
    setTimeout(prewarm, 2000);
  });
  if (o.engraving !== undefined) { ENG.text = o.engraving; ENG.font = o.engraveFont || 'serif'; }
  api.ready = setSpec(o.spec || (AU.content && AU.content.bespoke && AU.content.bespoke.initial) || {});
  api.shown = st.firstDrawn;
  /* the configurator (o.prebuildStyles, or the /bespoke page): the ring's other settings are built and compiled ahead
     in idle slices once the first one is shown, so choosing Halo or Eternity is only a mount (their pavé brings new
     instanced shaders) */
  api.prebuild = function (specs) { queue.prebuild(specs); };
  st.api = api;                               // (the engine's own checks reach a live studio through AUGL._dev.live)
  st.firstDrawn.then(function () {
    if (st.disposed) return;
    const cur = AU.router && AU.router.current;
    const on = o.prebuildStyles != null ? !!o.prebuildStyles : !!(cur && /bespoke/.test(String(cur.name || '') + ' ' + String(cur.path || '')));
    const s = lastSpec;
    if (!on || !s || s.type !== 'ring') return;
    const list = ['solitaire', 'halo', 'three-stone', 'eternity'].filter(function (x) { return x !== s.style; }).map(function (x) {
      const v = Object.assign({}, s, { style: x, accent: x === 'halo' || x === 'three-stone' ? 'diamond' : null });
      if (x === 'eternity') { v.cut = 'round'; v.carat = 0.25; }
      return v;
    });
    queue.prebuild(list);
  });
  return api;
}

/* the page's background, painted into a 2D canvas (for snapshots): the mode's gradient token, else its colour */
function glPaintPage(g, w, h) {
  const cs = getComputedStyle(document.documentElement);
  const grad = cs.getPropertyValue('--bg-grad').trim(), bg = cs.getPropertyValue('--bg').trim() || '#300404';
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const m = grad.match(/linear-gradient\(\s*([\d.]+)deg\s*,(.*)\)\s*$/i);
  if (!m) return;
  const stops = [];
  const re = /(#[0-9a-f]{3,8}|rgba?\([^)]*\))\s*([\d.]+)%/gi;
  let s;
  while ((s = re.exec(m[2]))) stops.push([s[1], +s[2] / 100]);
  if (stops.length < 2) return;
  const a = (+m[1] - 90) * Math.PI / 180, cx = w / 2, cy = h / 2;
  const L = Math.abs(w * Math.cos(a)) / 2 + Math.abs(h * Math.sin(a)) / 2;
  const gr = g.createLinearGradient(cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
  stops.forEach(function (st) { try { gr.addColorStop(st[1], st[0]); } catch (e) { /* skip */ } });
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
}

/* ---- 45-compare.js ---- */
/* ---- AUGL.compare(container, { specs, label, layout, gap, trueScale, onLayout }) (idea 11): up to four pieces side by
   side on ONE canvas (one WebGL context, one viewport per piece, scissored), turning together. Dragging anywhere
   turns them all; they rest on a slow shared turntable otherwise (earrings sway about their fronts instead).
     layout     'columns' | 'rows' | 'auto' (default: columns unless the container is too narrow for them)
     gap        px between viewports (default 0)
     trueScale  pieces keep their real relative size (default: true when every piece is the same type), so a 1.8 ct
                emerald looks bigger than a 1 ct round beside it
     onLayout(rects)   called with the viewports' rects (CSS px in the container) whenever they change, so the page
                can align names and prices under them; also api.rects()
   -> { setSpecs(specs) -> Promise, rects(), pause(), resume(), dispose() } ---- */

function glCompare(container, o) {
  o = o || {};
  const st = new GlStage(container, { kind: 'compare', label: o.label, fov: 26 });
  const ELEV = 0.13;
  const S = { angle: 0, vel: 0, auto: G_TAU / 26, autoK: AU.reduced ? 0 : 1, drag: null, rockT: 0, t0: performance.now() / 1000 };
  const vps = [];
  let rects = [];
  let trueScale = null;

  const makeVp = function () {
    const vp = { scene: new THREE.Scene(), rig: new THREE.Group(), tiltG: new THREE.Group(), turnG: new THREE.Group(), slots: [], slot: null, key: null, camera: new THREE.PerspectiveCamera(26, 1, 1, 5000), rect: { x: 0, y: 0, w: 1, h: 1 }, k: 1 };
    vp.scene.add(vp.rig); vp.rig.add(vp.tiltG); vp.tiltG.add(vp.turnG);
    vp.shadow = new GlShadow(vp.scene);
    vp.glints = new GlGlints(vp.scene, 2);
    vp.F = null;
    return vp;
  };
  const layout = function () {
    const W = st.size.w, H = st.size.h, n = Math.max(1, vps.length), gap = +o.gap || 0;
    const mode = o.layout === 'rows' || o.layout === 'columns' ? o.layout : (W / H >= n * 0.62 ? 'columns' : 'rows');
    rects = vps.map(function (vp, i) {
      if (mode === 'columns') { const w = (W - gap * (n - 1)) / n; return { x: Math.round(i * (w + gap)), y: 0, w: Math.round(w), h: H }; }
      const h = (H - gap * (n - 1)) / n; return { x: 0, y: Math.round(i * (h + gap)), w: W, h: Math.round(h) };
    });
    vps.forEach(function (vp, i) { vp.rect = rects[i]; vp.camera.aspect = rects[i].w / Math.max(1, rects[i].h); });
    if (trueScale != null) centre();
    if (o.onLayout) { try { o.onLayout(rects.map(function (r) { return Object.assign({}, r); })); } catch (e) { console.error(e); } }
    st.invalidate();
  };
  st.fit = function () { layout(); };

  /* one scale for every piece when they are comparable (true relative size), else each fills its viewport */
  const rescale = function () {
    const types = vps.filter(function (v) { return v.slot; }).map(function (v) { return v.slot.built.spec.type; });
    trueScale = o.trueScale != null ? !!o.trueScale : types.length > 1 && types.every(function (t) { return t === types[0]; });
    let rMax = 0;
    vps.forEach(function (v) { v.slots.forEach(function (s) { rMax = Math.max(rMax, s.measure.radius); }); });
    vps.forEach(function (v) {
      v.slots.forEach(function (s) { s.k = trueScale && rMax ? G_UNIT_R / rMax : G_UNIT_R / Math.max(1e-3, s.measure.radius); });
      if (v.slot) placeShadow(v);
    });
    centre();
  };
  /* vertical framing: the pieces (over their whole turn) and their contact shadows are centred in their viewports, on
     their COMBINED bounds when they share one scale (so a band and a solitaire keep their true size and stand on one
     line), each on its own otherwise. Without this the camera's elevation pushed the heads to the top edge. */
  const camAt = function (vp, dy, D) {
    vp.camera.position.set(0, Math.sin(ELEV) * D + dy, Math.cos(ELEV) * D);
    vp.camera.lookAt(0, dy, 0);
    vp.camera.updateMatrixWorld();
    vp.camera.updateProjectionMatrix();
  };
  const camD = function (vp) {
    const v = THREE.MathUtils.degToRad(26) / 2, hz = Math.atan(Math.tan(v) * vp.camera.aspect);
    return G_UNIT_R / Math.sin(Math.min(v, hz)) * 1.22;
  };
  const extentY = function (vp, dy) {
    const sl = vp.slot, view = sl.built.view, m = sl.measure, D = camD(vp);
    camAt(vp, dy, D);
    const pts = m.points.filter(function (p, i) { return i % Math.max(1, Math.floor(m.points.length / 260)) === 0; });
    const turns = [];
    for (let i = 0; i < 8; i++) turns.push(view.rock ? view.still.turn + view.rock * Math.sin(i / 8 * G_TAU) : view.still.turn + i / 8 * G_TAU);
    let y0 = Infinity, y1 = -Infinity;
    const q = new THREE.Vector3();
    turns.forEach(function (turn) {
      const ps = glPosePoints(pts, m.center, view.tilt, turn);
      const c = glContact(ps, m.radius);
      ps.push(new THREE.Vector3(c.cx, c.y, c.cz + c.fz * 0.6), new THREE.Vector3(c.cx, c.y, c.cz - c.fz * 0.6));
      ps.forEach(function (p) {
        q.copy(p).multiplyScalar(sl.k).project(vp.camera);
        if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y;
      });
    });
    return { y0: y0, y1: y1, D: D };
  };
  const centre = function () {
    const live = vps.filter(function (v) { return v.slot; });
    if (!live.length) return;
    const tv = Math.tan(THREE.MathUtils.degToRad(26) / 2);
    const solve = function (group) {
      let dy = -G_UNIT_R * 0.08;
      for (let it = 0; it < 3; it++) {
        let y0 = Infinity, y1 = -Infinity, D = 0;
        group.forEach(function (vp) { const e = extentY(vp, dy); y0 = Math.min(y0, e.y0); y1 = Math.max(y1, e.y1); D = Math.max(D, e.D); });
        if (!isFinite(y0)) return;
        dy += (y0 + y1) / 2 * tv * D * 0.92;
      }
      group.forEach(function (vp) { vp.dy = dy; });
    };
    try {
      if (trueScale) solve(live); else live.forEach(function (vp) { solve([vp]); });
    } catch (e) { live.forEach(function (vp) { vp.dy = null; }); }
  };
  const mount = function (vp, built) {
    const m = built.measure || glMeasure(built.object);
    built.measure = m;
    const g = new THREE.Group(), holder = new THREE.Group();
    holder.position.copy(m.center).negate();
    holder.add(built.object);
    g.add(holder);
    const slot = { built: built, g: g, holder: holder, measure: m, k: G_UNIT_R / Math.max(1e-3, m.radius), s: 1, extra: 0, alpha: 0, shownAlpha: -1, mats: built.mats || glPrepFade(built.object) };
    vp.turnG.add(g);
    vp.slots.push(slot);
    vp.slot = slot;
    vp.glints.set(built.glints);
    rescale();
    return slot;
  };
  const unmount = function (vp, slot) {
    const i = vp.slots.indexOf(slot);
    if (i < 0) return;
    vp.slots.splice(i, 1);
    vp.turnG.remove(slot.g);
    slot.built.dispose();
    if (vp.slot === slot) { vp.slot = vp.slots[vp.slots.length - 1] || null; vp.glints.set(vp.slot ? vp.slot.built.glints : []); }
  };
  const placeShadow = function (vp) {
    const sl = vp.slot;
    const f = glFloor(sl.measure, sl.built.view.tilt, 12);
    vp.floor = f.y * sl.k;
    if (!vp.F) vp.F = { fx: f.fx * sl.k, fz: f.fz * sl.k, cx: f.cx * sl.k, cz: f.cz * sl.k };
    const pts = sl.measure.points, step = Math.max(1, Math.floor(pts.length / 300));
    vp.sp = pts.filter(function (p, i) { return i % step === 0; });
    vp.sw = vp.sp.map(function () { return new THREE.Vector3(); });
  };

  /* ---------------- per frame ---------------- */
  st.update = function (t, dt) {
    const reduced = !!AU.reduced;
    let moving = st.runTweens(dt);
    const away = performance.now() - G_ACT.t > 45000;
    const want = reduced || away ? 0 : 1;
    S.autoK += (want - S.autoK) * (1 - Math.exp(-dt * 1.1));
    if (Math.abs(want - S.autoK) < 0.002) S.autoK = want; else moving = true;
    if (!S.drag) {
      S.vel *= Math.exp(-dt * 2.4);
      if (Math.abs(S.vel) < 0.003) S.vel = 0;
      S.angle += (S.auto * S.autoK + S.vel) * dt;
      if (S.autoK > 0.001 || S.vel) moving = true;
      S.rockT += dt * S.autoK;
    } else moving = true;
    const v = THREE.MathUtils.degToRad(26) / 2;
    vps.forEach(function (vp) {
      const sl = vp.slot;
      if (!sl) return;
      const view = sl.built.view;
      const turn = view.rock ? view.still.turn + view.rock * Math.sin(S.angle * 0.7) : view.still.turn + S.angle;
      vp.turnG.rotation.y = turn;
      vp.tiltG.rotation.x = view.tilt;
      vp.rig.position.y = reduced ? 0 : Math.sin((t - S.t0) * G_TAU / 7.2) * G_UNIT_R * 0.012 * S.autoK;
      const aspect = vp.camera.aspect, hz = Math.atan(Math.tan(v) * aspect);
      const D = G_UNIT_R / Math.sin(Math.min(v, hz)) * 1.22, dy = vp.dy != null ? vp.dy : -G_UNIT_R * 0.08;
      vp.camera.position.set(0, Math.sin(ELEV) * D + dy, Math.cos(ELEV) * D);
      vp.camera.near = Math.max(0.5, D - G_UNIT_R * 3); vp.camera.far = D + G_UNIT_R * 4;
      vp.camera.lookAt(0, dy, 0);
      vp.camera.updateProjectionMatrix();
      let top = 0;
      vp.slots.forEach(function (s) {
        s.g.scale.setScalar(s.k * s.s);
        s.g.rotation.y = s.extra;
        glSlotOpacity(s, s.alpha);
        top = Math.max(top, s.alpha);
      });
      vp.scene.updateMatrixWorld();
      // the contact shadow follows the lowest arc of the turning piece
      if (vp.sp) {
        const m = sl.holder.matrixWorld;
        for (let i = 0; i < vp.sp.length; i++) vp.sw[i].copy(vp.sp[i]).applyMatrix4(m);
        const R = G_UNIT_R * sl.s * (sl.k * sl.measure.radius / G_UNIT_R);
        const c = glContact(vp.sw, R, vp.c || (vp.c = {}));
        const kk = 1 - Math.exp(-dt * 8);
        ['fx', 'fz', 'cx', 'cz'].forEach(function (n) { vp.F[n] += (c[n] - vp.F[n]) * kk; });
        vp.shadow.fit(vp.floor, vp.F.fx, vp.F.fz, vp.F.cx, vp.F.cz);
        vp.shadow.core.material.color.copy(st.shadow.core.material.color);
        vp.shadow.soft.material.color.copy(st.shadow.core.material.color);
        vp.shadow.base = st.shadow.base;
        vp.shadow.set(Math.max(0, (c.y - vp.floor) / R) * 4, top);
      }
      vp.glints.keys = st.glints.keys;
      vp.glints.alpha = sl.alpha;
      vp.glints.unit = sl.k * sl.s;
      if (reduced) vp.glints.bake(vp.camera);
      else if (vp.glints.update(vp.camera, dt, sl.alpha > 0.5)) moving = true;
    });
    return moving;
  };
  st.draw = function () {
    if (!st.env) return;
    const r = st.renderer, W = st.size.w, H = st.size.h;
    G_ENV.value = st.env;
    G_ENV_LIGHT.value = st.envLight;
    const auto = r.autoClear;
    r.setScissorTest(false);
    r.setViewport(0, 0, W, H);
    r.clear();
    r.autoClear = false;
    let any = false;
    vps.forEach(function (vp) {
      if (!vp.slots.length) return;
      vp.scene.environment = st.env;
      const R = vp.rect, y = H - R.y - R.h;
      r.setViewport(R.x, y, R.w, R.h);
      r.setScissor(R.x, y, R.w, R.h);
      r.setScissorTest(true);
      r.clearDepth();
      glGemDraw(st.gemEnv, function () { glDrawLayered(r, vp.scene, vp.camera, vp.slots, vp.glints.group); });
      if (vp.slot && vp.slot.alpha > 0.01) any = true;
    });
    r.setScissorTest(false);
    r.setViewport(0, 0, W, H);
    r.autoClear = auto;
    if (any && st._onFirst) { const f = st._onFirst; st._onFirst = null; f(); }
  };

  /* ---------------- pieces ---------------- */
  const keyOf = function (s) { return JSON.stringify(glKeySpec(s || {})); };
  const swapIn = function (vp, spec) {
    const key = keyOf(spec);
    vp.key = key;
    const build = function () {
      return glIdle(function () { return vp.key === key && !st.disposed ? glBuildPiece(spec, { detail: 'hero' }) : null; }, 18).then(function (built) {
        if (!built) return;
        return st.compile(built).then(function () {
          if (st.disposed || vp.key !== key) { built.dispose(); return; }
          const old = vp.slots.slice();
          const sl = mount(vp, built);
          sl.s = 0.96;
          old.forEach(function (os) {
            glTween(st, AU.reduced ? 0.2 : 0.45, function (k) { os.alpha = 1 - glEaseInOut(k); os.s = 1 - 0.05 * k; }).then(function () { unmount(vp, os); });
          });
          return glTween(st, AU.reduced ? 0.3 : 0.85, function (k) { const e = glEaseOut(k); sl.alpha = e; sl.s = 0.96 + 0.04 * e; });
        });
      });
    };
    const ms = KIT.spec(spec).model;
    return ms ? glModelLoad(ms).then(build, build) : build();
  };
  const setSpecs = function (specs) {
    specs = (Array.isArray(specs) ? specs : []).slice(0, 4);
    while (vps.length < specs.length) vps.push(makeVp());
    const jobs = [];
    // viewports no longer needed fade their piece out and go
    vps.slice(specs.length).forEach(function (vp) {
      vp.key = null;
      vp.slots.slice().forEach(function (s) { unmount(vp, s); });
      vp.glints.dispose(); vp.shadow.dispose();
    });
    vps.length = specs.length;
    layout();
    specs.forEach(function (s, i) { if (keyOf(s) !== vps[i].key) jobs.push(swapIn(vps[i], s)); });
    return Promise.all(jobs).then(function () { rescale(); st.invalidate(); });
  };

  /* ---------------- input: drag anywhere turns them all ---------------- */
  const cv = st.canvas;
  const down = function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    S.drag = { id: e.pointerId, lx: e.clientX, lt: performance.now(), v: 0 };
    try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    cv.style.cursor = 'grabbing';
    st.wake();
  };
  const move = function (e) {
    const d = S.drag;
    if (!d || d.id !== e.pointerId) return;
    const now = performance.now(), da = (e.clientX - d.lx) / Math.max(260, st.size.w / Math.max(1, vps.length)) * 3.2;
    S.angle += da;
    d.v = d.v * 0.6 + da / (Math.max(1, now - d.lt) / 1000) * 0.4;
    d.lx = e.clientX; d.lt = now;
    st.wake();
  };
  const up = function (e) {
    const d = S.drag;
    if (!d || d.id !== e.pointerId) return;
    S.vel = performance.now() - d.lt > 120 ? 0 : Math.max(-5, Math.min(5, d.v));
    S.drag = null;
    cv.style.cursor = 'grab';
    st.wake();
  };
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('lostpointercapture', up);
  const offAct = glActivity(function () { st.invalidate(); });
  st.cleanup = function () {
    offAct();
    vps.forEach(function (vp) { vp.slots.slice().forEach(function (s) { unmount(vp, s); }); vp.glints.dispose(); vp.shadow.dispose(); });
    vps.length = 0;
  };

  const api = {
    canvas: cv,
    setSpecs: setSpecs,
    rects: function () { return rects.map(function (r) { return Object.assign({}, r); }); },
    pause: function () { st.paused = true; st.sleep(); },
    resume: function () { st.paused = false; st.invalidate(); },
    dispose: function () { st.dispose(); },
    _stage: st,
    _vps: vps
  };
  api.ready = setSpecs(o.specs || []);
  api.shown = st.firstDrawn;
  return api;
}

/* ---- 46-stills.js ---- */
/* ---- AUGL.render() and AUGL.spin(): one shared offscreen renderer and a polite job queue.
   v2: the catalogue's pictures are pre-rendered by tools/prerender.js (AU.img / AU.spinImg use those files); this is
   the live fallback, and the renderer the pre-renderer drives.
   The queue never competes with the page: it works in idle time (requestIdleCallback where it exists), one small
   step at a time (build, then draw, then copy out on a later tick), cools down after a heavy step, and holds still
   while the page scrolls or the colours cross-fade between modes. Built pieces are cached per spec, so a mode
   switch only re-lights them. Results are blob URLs (WebP with alpha, PNG where WebP cannot be encoded), cached by
   spec + options + mode.
   Spin sheets are GRIDS (cols x rows frames, row by row): { url, frames, cols, rows, size }.
   The three-quarter still and frame 0 of its spin sheet are the same picture: same pose, same camera (framed on
   every pose of the turn), same shadow, same glint. Pendants (view.frame) fade their chain out toward the top. ---- */

const G_STILL = {
  r: null, scene: null, camera: null, rig: null, tiltG: null, turnG: null, holder: null, shadow: null, glints: null,
  queue: [], cache: new Map(), builds: new Map(), spins: [],
  scheduled: false, wait: false, coolUntil: 0, lastScroll: -1e9, holdUntil: 0, warmed: false, out: null
};
const G_STILL_ELEV = 0.15;
const G_STILL_FOV = 26;
const G_STILL_TURNS = 24;            // poses sampled to frame a turntable
const G_STILL_MARGIN = { t: 0.12, b: 0.12, l: 0.1, r: 0.1 };
const G_STILL_MARGIN_PENDANT = { t: 0.0, b: 0.12, l: 0.1, r: 0.1 };   // the chain leaves through the top (faded)
const G_RING_HEAD = 4.6;            // mm above the shank: the tallest head in the catalogue (1.2 ct solitaire: 4.1 mm)
const G_SPIN_MAX_FRAMES = 72, G_SPIN_MAX_SIZE = 512, G_SPIN_KEEP = 10, G_SPIN_MAX_SIDE = 8192;

function glStillInit() {
  if (G_STILL.r) return;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  G_STILL.r = glRenderer(cv, false);
  G_STILL.r.setPixelRatio(1);
  const s = G_STILL.scene = new THREE.Scene();
  G_STILL.camera = new THREE.PerspectiveCamera(G_STILL_FOV, 1, 1, 5000);
  G_STILL.rig = new THREE.Group(); G_STILL.tiltG = new THREE.Group(); G_STILL.turnG = new THREE.Group(); G_STILL.holder = new THREE.Group();
  s.add(G_STILL.rig); G_STILL.rig.add(G_STILL.tiltG); G_STILL.tiltG.add(G_STILL.turnG); G_STILL.turnG.add(G_STILL.holder);
  G_STILL.shadow = new GlShadow(s);
  G_STILL.glints = new GlGlints(s, 1);
  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); G_STILL.lost = true; });
  cv.addEventListener('webglcontextrestored', function () { G_STILL.lost = false; glEnvDispose(G_STILL.r); G_STILL.builds.forEach(function (b) { b.ready = null; }); glStillKick(0); });
  // the page is moving: let it move
  if (AU.onScroll) AU.onScroll(function () { G_STILL.lastScroll = performance.now(); });
  if (AU.on) AU.on('mode', function () { G_STILL.holdUntil = performance.now() + G_SWITCH_DUR * 1000 + 150; });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) glStillKick(0); });
  // the display's frame interval (60, 120, 144 Hzâ€¦), so "half a frame of idle time" means the same everywhere
  const ts = [];
  const probe = function (t) { ts.push(t); if (ts.length < 14) requestAnimationFrame(probe); else { const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]); d.sort(function (a, b) { return a - b; }); G_STILL.frameMs = d[d.length >> 1]; } };
  requestAnimationFrame(probe);
}

/* ---------------- the scheduler ---------------- */
function glStillPaused(now) {
  const S = G_STILL;
  if (G_STILL_FAST.on) return S.lost;
  return document.hidden || S.lost || now - S.lastScroll < 220 || now < S.holdUntil ||
    document.documentElement.classList.contains('is-switching');
}
function glStillKick(delay) {
  const S = G_STILL;
  if (S.scheduled || S.wait || (!S.queue.length && S.warmed)) return;
  S.scheduled = true;
  const go = function () {
    if (G_STILL_FAST.on) setTimeout(function () { S.scheduled = false; glStillPump(null); }, 0);
    else if (window.requestIdleCallback) requestIdleCallback(function (dl) { S.scheduled = false; glStillPump(dl); }, { timeout: 700 });
    else requestAnimationFrame(function () { setTimeout(function () { S.scheduled = false; glStillPump(null); }, 0); });
  };
  if (delay > 0 && !G_STILL_FAST.on) setTimeout(go, delay); else go();
}
function glStillPick() {
  const q = G_STILL.queue;
  // a job already under way finishes first; then pictures before turntables (a still is what the visitor sees
  // first, a sheet only on hover); among those, a piece that is already built (a mode switch re-lights everything
  // without rebuilding)
  for (let i = 0; i < q.length; i++) if (q[i].started) return i;
  let best = 0, bs = -1;
  for (let i = 0; i < q.length; i++) {
    const s = (q[i].kind === 'still' ? 2 : 0) + (G_STILL.builds.has(q[i].bkey) ? 1 : 0);
    if (s > bs) { bs = s; best = i; }
  }
  return best;
}
function glStillPump(dl) {
  const S = G_STILL;
  const now = performance.now();
  const fast = G_STILL_FAST.on;
  if (S.wait || !S.r) return;
  if (!S.queue.length) {
    // once the first pictures are out, prepare the other room in the background so a mode switch is light
    if (!S.warmed && !glStillPaused(now) && (!dl || dl.didTimeout || dl.timeRemaining() > 8 || now - (S.since || 0) > 1500)) {
      S.warmed = true;
      glEnvAsync(S.r, 'studio', AU.getMode() === 'light' ? 'dark' : 'light').catch(function () { /* later */ });
    } else if (!S.warmed) glStillKick(400);
    return;
  }
  if (glStillPaused(now)) { glStillKick(150); S.since = now; return; }
  if (!fast && now < S.coolUntil) { glStillKick(S.coolUntil - now); return; }
  // wait for a real idle slice (about half a frame of the display's refresh); while a live stage keeps every frame
  // busy, still move on a few times a second
  const need = Math.max(2.5, Math.min(7, (S.frameMs || 16.7) * 0.45));
  if (!fast && dl && !dl.didTimeout && dl.timeRemaining() < need && now - (S.since || 0) < 130) { glStillKick(0); return; }
  S.since = now;
  S.budget = fast ? 40 : (dl && !dl.didTimeout ? Math.max(3, Math.min(10, dl.timeRemaining() - 3)) : 4);
  const qi = glStillPick();
  const job = S.queue[qi];
  job.started = true;
  const t0 = performance.now();
  const drop = function () { const k = S.queue.indexOf(job); if (k >= 0) S.queue.splice(k, 1); };
  const failed = function (e) { drop(); try { if (job.cleanup) job.cleanup(); } catch (e2) { /* ignore */ } job.fail(e); };
  let r;
  try { r = job.step(); } catch (e) { failed(e); r = true; }
  const cost = performance.now() - t0;
  S.costs = (S.costs || []).concat(Math.round(cost)).slice(-60);
  glSlow('still:' + job.kind, cost);
  S.since = performance.now();
  // keep the queue's share of the main thread small: after a heavy step, rest about as long as it took
  S.coolUntil = performance.now() + (cost > 12 && !fast ? Math.min(220, cost * 1.3) : 0);
  if (r === true) drop();
  else if (r && typeof r.then === 'function') {
    S.wait = true;
    r.then(function (done) { S.wait = false; if (done === true) drop(); glStillKick(0); },
      function (e) { S.wait = false; failed(e); glStillKick(0); });
    return;
  }
  glStillKick(0);
}
function glStillEnqueue(job) {
  G_STILL.queue.push(job);
  glStillKick(0);
}

/* ---------------- built pieces, cached per spec (a few at a time; GPU memory is precious) ---------------- */
function glKeySpec(spec) { const s = KIT.spec(spec); delete s.engraving; delete s.engraveFont; return s; }
function glStillLod(size) { return size < 360 ? 0.6 : 0.85; }
function glStillBuild(spec, lod) {
  const S = G_STILL;
  const key = JSON.stringify([glKeySpec(spec), lod]);
  let e = S.builds.get(key);
  if (e) { S.builds.delete(key); S.builds.set(key, e); return e; }   // most recently used last
  const built = glBuildPiece(spec, { detail: 'still', lod: lod, withEngraving: false });
  e = { key: key, built: built, m: glMeasure(built.object), poses: {}, ready: null };
  S.builds.set(key, e);
  while (S.builds.size > 6) {
    const oldK = S.builds.keys().next().value, old = S.builds.get(oldK);
    S.builds.delete(oldK);
    if (old.built.object.parent) old.built.object.parent.remove(old.built.object);
    old.built.dispose();
  }
  return e;
}
function glBuildKey(spec, size) { return JSON.stringify([glKeySpec(spec), glStillLod(size)]); }

/* the turns a turntable shows: a full turn, or a sway about the still's turn for pieces that must face the camera */
function glTurnAt(view, u) {
  return view.rock ? view.still.turn + view.rock * Math.sin(u * G_TAU) : view.still.turn + u * G_TAU;
}
/* pose and camera for a view of a piece (computed once per piece and view). entry = { built, m (glMeasure), poses } */
function glStillPoseFor(entry, view) {
  if (entry.poses[view]) return entry.poses[view];
  const v = entry.built.view, m = entry.m;
  const center = v.pivot || m.center;
  let tilt, turns;
  if (view === 'front') { tilt = v.tilt * 0.25; turns = [v.rock ? v.still.turn * 0.4 : 0]; }
  else if (view === 'side') { tilt = v.still.tilt * 0.5; turns = [Math.PI / 2]; }
  else if (view === 'top') { tilt = Math.PI / 2 - 0.22; turns = [0]; }
  else {
    tilt = v.still.tilt; turns = [];
    for (let i = 0; i < G_STILL_TURNS; i++) turns.push(glTurnAt(v, i / G_STILL_TURNS));
  }
  let src = m.points;
  if (v.frame) {
    const b = v.frame.clone().expandByScalar(0.01);
    const inside = src.filter(function (p) { return b.containsPoint(p); });
    if (inside.length > 12) src = inside;
  }
  const step = Math.max(1, Math.floor(src.length / 900));
  src = src.filter(function (p, i) { return i % step === 0; });
  /* v2.3 framing. The SIZE comes from an envelope: for rings, the piece plus the tallest head of the catalogue (a
     point G_RING_HEAD mm above the shank), so every ring of one finger size is drawn at one scale and a band keeps its
     true size next to a solitaire; for the others, the piece itself. The POSITION centres what is really there (over
     the whole turn, with only the core of the contact shadow): no ring sits high with an empty band under it. */
  const ring = entry.built.spec && entry.built.spec.type === 'ring' && view === 'three-quarter';
  let env = src.concat(v.frameExtra || []);
  if (ring) {
    const Ro = Math.max(1, -m.box.min.y);
    env = src.concat([new THREE.Vector3(0, Ro + G_RING_HEAD, 0), new THREE.Vector3(0, -Ro, 0), new THREE.Vector3(Ro, 0, 0), new THREE.Vector3(-Ro, 0, 0)]);
  }
  const all = m.points.filter(function (p, i) { return i % Math.max(1, Math.floor(m.points.length / 500)) === 0; });
  const pts = [], envPts = [];
  turns.forEach(function (turn) {
    const ps = glPosePoints(src, center, tilt, turn);
    ps.forEach(function (p) { pts.push(p); });
    glPosePoints(env, center, tilt, turn).forEach(function (p) { envPts.push(p); });
    const c = glContact(glPosePoints(all, center, tilt, turn), m.radius);
    if (view !== 'top') [[0.6, 0], [-0.6, 0], [0, 0.3], [0, -0.3]].forEach(function (d) { const q = new THREE.Vector3(c.cx + d[0] * c.fx, c.y, c.cz + d[1] * c.fz); pts.push(q); envPts.push(q); });
  });
  const dir = new THREE.Vector3(0, Math.sin(G_STILL_ELEV), Math.cos(G_STILL_ELEV));
  const mg = v.frame ? G_STILL_MARGIN_PENDANT : G_STILL_MARGIN;
  const cam = glFrameFit(envPts, dir, G_STILL_FOV, 1, mg);
  if (envPts.length !== pts.length) cam.target = glFrameCentre(pts, dir, G_STILL_FOV, 1, cam.D, cam.target);
  entry.poses[view] = { tilt: tilt, center: center, cam: cam, dir: dir, all: all, turn: turns[0] };
  return entry.poses[view];
}
/* move the target (camera distance D fixed) until the points' projected bounds are centred in the frame */
function glFrameCentre(points, dir, fov, aspect, D, target) {
  const tv = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const up0 = Math.abs(dir.y) > 0.985 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up0, dir).normalize();
  const vup = new THREE.Vector3().crossVectors(dir, right).normalize();
  const t = target.clone(), q = new THREE.Vector3();
  for (let it = 0; it < 6; it++) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < points.length; i++) {
      q.copy(points[i]).sub(t);
      const k = Math.max(1e-3, D - q.dot(dir));
      const px = q.dot(right) / k, py = q.dot(vup) / k;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
    t.addScaledVector(right, (x0 + x1) / 2 * D).addScaledVector(vup, (y0 + y1) / 2 * D);
  }
  return t;
}
/* put the piece on the still stage in a pose: camera, lighting for the mode, the contact shadow of that pose, the
   glint of that pose */
function glStillStage(entry, pose, turn, mode, view) {
  const S = G_STILL;
  // exactly one piece on the still stage
  for (let i = S.holder.children.length - 1; i >= 0; i--) { const c = S.holder.children[i]; if (c !== entry.built.object) S.holder.remove(c); }
  if (entry.built.object.parent !== S.holder) S.holder.add(entry.built.object);
  S.holder.position.copy(pose.center).negate();
  S.tiltG.rotation.set(pose.tilt, 0, 0);
  S.turnG.rotation.set(0, turn, 0);
  S.rig.position.set(0, 0, 0);
  S.env = glEnvFor(S.r, mode);
  S.gemEnv = glEnvFor(S.r, 'gem');
  S.scene.environment = S.env;
  S.envLight = mode === 'light' ? 1 : 0;
  S.r.toneMappingExposure = G_EXPOSURE[mode];
  S.shadow.mode(mode);
  const c = glContact(glPosePoints(pose.all, pose.center, pose.tilt, turn), entry.m.radius);
  S.shadow.fit(c.y, c.fx, c.fz, c.cx, c.cz);
  S.shadow.set(0, view === 'top' ? 0 : 1);
  const cam = S.camera;
  cam.position.copy(pose.cam.target).addScaledVector(pose.dir, pose.cam.D);
  cam.near = Math.max(0.5, pose.cam.D * 0.3); cam.far = pose.cam.D * 3;
  cam.up.set(0, 1, 0);
  cam.aspect = 1;
  cam.lookAt(pose.cam.target);
  cam.updateProjectionMatrix();
  S.scene.updateMatrixWorld();
  if (S.glintFor !== entry) { S.glints.set(entry.built.glints); S.glintFor = entry; }
  S.glints.unit = 1;
  S.glints.bake(cam);
}
function glStillDraw(px) {
  const S = G_STILL;
  if (S.r.domElement.width !== px || S.r.domElement.height !== px) S.r.setSize(px, px, false);
  G_ENV.value = S.env;
  G_ENV_LIGHT.value = S.envLight;
  glGemDraw(S.gemEnv, function () { S.r.render(S.scene, S.camera); });
}
/* copy what was just drawn: a GPU-side snapshot now, the 2D copy on a later tick (no read-back stall) */
function glStillGrab() {
  const cv = G_STILL.r.domElement;
  if (window.createImageBitmap) {
    try { return createImageBitmap(cv); } catch (e) { /* fall through */ }
  }
  const c = document.createElement('canvas');
  c.width = cv.width; c.height = cv.height;
  c.getContext('2d').drawImage(cv, 0, 0);
  return Promise.resolve(c);
}
function glStillSS(size) { return size <= 640 ? 1.25 : 1.5; }
function glToBlob(canvas, quality) {
  const enc = function (type, q) { return new Promise(function (res) { canvas.toBlob(res, type, q); }); };
  return enc('image/webp', quality || 0.9).then(function (b) {
    if (b && b.type === 'image/webp') return b;
    return enc('image/png');
  }).then(function (b) { if (!b) throw new Error('toBlob failed'); return b; });
}
function glToBlobURL(canvas, quality) {
  return glToBlob(canvas, quality).then(function (b) { return URL.createObjectURL(b); });
}
function glStillMode(m) { return m === 'light' || m === 'dark' ? m : (AU.getMode ? AU.getMode() : 'dark'); }
/* compile a freshly built piece's shaders without blocking (parallel compile where the browser has it), once the
   still renderer's room for the mode is ready */
function glStillCompile(entry, mode) {
  const S = G_STILL;
  if (entry.ready) return entry.ready.then(function () { return Promise.all([glEnvAsync(S.r, 'studio', mode), glGemEnvAsync(S.r, 'studio')]); }).then(function () { return false; });
  entry.ready = Promise.all([glEnvAsync(S.r, 'studio', mode), glGemEnvAsync(S.r, 'studio')]).then(function (two) {
    const env = two[0];
    // compiled in a scratch scene with the same lighting (the still stage itself keeps exactly one piece)
    const tmp = new THREE.Scene();
    tmp.environment = env;
    const parent = entry.built.object.parent;
    tmp.add(entry.built.object);
    if (!S.partsCompiled) { S.partsCompiled = true; S.scene.children.forEach(function (c) { if (c !== S.rig) tmp.add(c.clone()); }); }
    let p = null;
    try { if (S.r.compileAsync) p = S.r.compileAsync(tmp, S.camera); } catch (e) { /* draw anyway */ }
    tmp.remove(entry.built.object);
    if (parent) parent.add(entry.built.object);
    return Promise.resolve(p).then(function () { return false; }, function () { return false; });
  });
  return entry.ready;
}
/* pendants: the chain fades out toward the top of the picture instead of being cut by its edge */
/* (destination-in keeps only what lies under the filled shape, so the mask always covers the whole picture: the
   canvas must hold just this one picture when it is called) */
function glStillFade(g, x, y, size, view) {
  if (!view || !view.frame) return;
  g.save();
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createLinearGradient(0, y, 0, y + size);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(0.12, 'rgba(0,0,0,0.25)');
  gr.addColorStop(0.24, 'rgba(0,0,0,0.75)');
  gr.addColorStop(0.34, 'rgba(0,0,0,1)');
  gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = gr;
  g.fillRect(x, y, size, size);
  g.restore();
}

/* ---------------- a still, as a canvas ---------------- */
function glStillCanvas(spec, opts) {
  opts = opts || {};
  glStillInit();
  const size = Math.max(32, Math.min(2048, Math.round(+opts.size || 640)));
  const view = ['three-quarter', 'front', 'top', 'side'].indexOf(opts.view) >= 0 ? opts.view : 'three-quarter';
  const mode = glStillMode(opts.mode);
  return new Promise(function (resolve, reject) {
    let entry = null, stage = 0;
    glStillEnqueue({
      kind: 'still',
      bkey: glBuildKey(spec, size),
      step: function () {
        if (stage === 0) {                       // 1. build (or take the cached piece) and compile
          const go = function () { entry = glStillBuild(spec, glStillLod(size)); stage = 1; return glStillCompile(entry, mode); };
          const ms = KIT.spec(spec).model;
          if (ms && !glModelGet(ms)) return glModelLoad(ms).then(go, go);
          return go();
        }
        if (stage === 1) {                       // 2. pose, draw supersampled, snapshot
          const pose = glStillPoseFor(entry, view);
          glStillStage(entry, pose, view === 'three-quarter' ? glTurnAt(entry.built.view, 0) : pose.turn, mode, view);
          glStillDraw(Math.min(2048, Math.round(size * glStillSS(size))));
          stage = 2;
          return glStillGrab().then(function (bmp) {   // 3. (later tick) downsample
            const out = document.createElement('canvas');
            out.width = out.height = size;
            const g = out.getContext('2d');
            g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
            g.drawImage(bmp, 0, 0, size, size);
            if (bmp.close) bmp.close();
            glStillFade(g, 0, 0, size, entry.built.view);
            resolve(out);
            return true;
          });
        }
        return true;
      },
      cleanup: function () { },
      fail: reject
    });
  });
}
/* ---------------- AUGL.render -> Promise<blob url> ---------------- */
function glRender(spec, opts) {
  opts = opts || {};
  const size = Math.max(32, Math.min(2048, Math.round(+opts.size || 640)));
  const view = ['three-quarter', 'front', 'top', 'side'].indexOf(opts.view) >= 0 ? opts.view : 'three-quarter';
  const mode = glStillMode(opts.mode);
  const key = JSON.stringify(['still', glKeySpec(spec), size, view, mode]);
  if (G_STILL.cache.has(key)) return G_STILL.cache.get(key);
  const p = glStillCanvas(spec, { size: size, view: view, mode: mode }).then(function (c) { return glToBlobURL(c, opts.quality); });
  G_STILL.cache.set(key, p);
  p.catch(function () { G_STILL.cache.delete(key); });
  return p;
}

/* ---------------- a spin sheet, as a canvas: frames laid out on a grid, row by row ---------------- */
function glSpinLayout(frames, size, cols) {
  let c = cols > 0 ? Math.min(frames, Math.round(cols)) : Math.ceil(Math.sqrt(frames));
  while (c * size > G_SPIN_MAX_SIDE && c > 1) c--;
  const r = Math.ceil(frames / c);
  return { cols: c, rows: r };
}
function glSpinCanvas(spec, opts) {
  opts = opts || {};
  glStillInit();
  const frames = Math.max(4, Math.min(G_SPIN_MAX_FRAMES, Math.round(+opts.frames || 36)));
  let size = Math.max(32, Math.min(G_SPIN_MAX_SIZE, Math.round(+opts.size || 400)));
  let L = glSpinLayout(frames, size, opts.cols);
  while (L.rows * size > G_SPIN_MAX_SIDE && size > 64) { size = Math.floor(size * 0.9); L = glSpinLayout(frames, size, opts.cols); }
  const mode = glStillMode(opts.mode);
  return new Promise(function (resolve, reject) {
    let entry = null, pose = null, stage = 0, i = 0, sheet = null, sg = null, px = 0, period = 360;
    glStillEnqueue({
      kind: 'spin',
      bkey: glBuildKey(spec, size),
      step: function () {
        if (stage === 0) {
          const go = function () { entry = glStillBuild(spec, glStillLod(size)); stage = 1; return glStillCompile(entry, mode); };
          const ms = KIT.spec(spec).model;
          if (ms && !glModelGet(ms)) return glModelLoad(ms).then(go, go);
          return go();
        }
        if (stage === 1) {
          pose = glStillPoseFor(entry, 'three-quarter');
          // a piece that looks the same after half a turn (a round, oval or cushion ring) spends its frames on half a
          // turn: twice the steps for the same file. 'auto' checks it on two small renders.
          if (opts.period === 180 || opts.period === 'auto' && glSpinHalfTurn(entry, pose, mode)) period = 180;
          sheet = document.createElement('canvas');
          sheet.width = size * L.cols; sheet.height = size * L.rows;
          sg = sheet.getContext('2d');
          sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
          px = Math.min(2048, Math.round(size * glStillSS(size)));
          stage = 2;
          return false;
        }
        if (stage === 2 && i < frames) {         // as many frames as the idle slice allows, copied out on the next tick
          const t0 = performance.now(), grabs = [];
          do {
            glStillStage(entry, pose, glTurnAt(entry.built.view, i / frames * (entry.built.view.rock ? 1 : period / 360)), mode, 'three-quarter');
            glStillDraw(px);
            grabs.push([i, glStillGrab()]);
            i++;
          } while (i < frames && performance.now() - t0 < G_STILL.budget * 0.5);
          return Promise.all(grabs.map(function (g) { return g[1]; })).then(function (bmps) {
            const fade = !!entry.built.view.frame;
            let cell = null, cg = null;
            if (fade) {
              cell = document.createElement('canvas'); cell.width = cell.height = size;
              cg = cell.getContext('2d'); cg.imageSmoothingEnabled = true; cg.imageSmoothingQuality = 'high';
            }
            bmps.forEach(function (bmp, k) {
              const f = grabs[k][0], x = (f % L.cols) * size, y = Math.floor(f / L.cols) * size;
              if (fade) {
                // each frame faded on its own canvas, then placed on the sheet
                cg.globalCompositeOperation = 'source-over';
                cg.clearRect(0, 0, size, size);
                cg.drawImage(bmp, 0, 0, size, size);
                glStillFade(cg, 0, 0, size, entry.built.view);
                sg.drawImage(cell, x, y);
              } else sg.drawImage(bmp, x, y, size, size);
              if (bmp.close) bmp.close();
            });
            return false;
          });
        }
        stage = 3;
        resolve({ canvas: sheet, frames: frames, cols: L.cols, rows: L.rows, size: size, period: entry.built.view.rock ? 0 : period });
        return true;
      },
      cleanup: function () { },
      fail: reject
    });
  });
}
/* does the piece look the same half a turn on? (two 96 px renders compared; the stage is left as the next frame sets
   it) */
function glSpinHalfTurn(entry, pose, mode) {
  if (entry.built.view.rock || entry.built.view.frame) return false;
  const v = entry.built.view, px = 96, img = [];
  for (let k = 0; k < 2; k++) {
    glStillStage(entry, pose, glTurnAt(v, 0) + k * Math.PI, mode, 'three-quarter');
    glStillDraw(px);
    const c = document.createElement('canvas'); c.width = c.height = px;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(G_STILL.r.domElement, 0, 0);
    img.push(g.getImageData(0, 0, px, px).data);
  }
  let diff = 0, ink = 0;
  for (let i = 0; i < img[0].length; i += 4) {
    const a = img[0][i + 3] + img[1][i + 3];
    if (a < 8) continue;
    ink++;
    diff += Math.abs(img[0][i] - img[1][i]) + Math.abs(img[0][i + 1] - img[1][i + 1]) + Math.abs(img[0][i + 2] - img[1][i + 2]) + Math.abs(img[0][i + 3] - img[1][i + 3]);
  }
  return ink > 50 && diff / ink / 4 < 6;
}
/* ---------------- AUGL.spin -> Promise<{ url, frames, cols, rows, size, period }> ----------------
   opts.period: 360 (default) | 180 | 'auto' (180 when the piece looks the same half a turn on); period 0 = a sway */
function glSpin(spec, opts) {
  opts = opts || {};
  const frames = Math.max(4, Math.min(G_SPIN_MAX_FRAMES, Math.round(+opts.frames || 36)));
  const size = Math.max(32, Math.min(G_SPIN_MAX_SIZE, Math.round(+opts.size || 400)));
  const mode = glStillMode(opts.mode);
  const key = JSON.stringify(['spin', glKeySpec(spec), size, frames, opts.cols || 0, mode, opts.period || 360]);
  if (G_STILL.cache.has(key)) { glSpinTouch(key); return G_STILL.cache.get(key); }
  const p = glSpinCanvas(spec, { frames: frames, size: size, mode: mode, cols: opts.cols, period: opts.period }).then(function (r) {
    return glToBlobURL(r.canvas, opts.quality).then(function (url) {
      r.canvas.width = r.canvas.height = 1;
      glSpinKeep(key, url);
      return { url: url, frames: r.frames, cols: r.cols, rows: r.rows, size: r.size, period: r.period };
    });
  });
  G_STILL.cache.set(key, p);
  p.catch(function () { G_STILL.cache.delete(key); });
  return p;
}
/* sheets are big: keep the most recent few; older ones are released (their URL revoked, rebuilt on request) */
function glSpinTouch(key) {
  const L = G_STILL.spins, i = L.findIndex(function (x) { return x.key === key; });
  if (i >= 0) { const e = L.splice(i, 1)[0]; e.t = performance.now(); L.push(e); }
}
function glSpinKeep(key, url) {
  const L = G_STILL.spins;
  L.push({ key: key, url: url, t: performance.now() });
  const now = performance.now();
  for (let i = 0; L.length > G_SPIN_KEEP && i < L.length;) {
    if (now - L[i].t > 15000) { const e = L.splice(i, 1)[0]; G_STILL.cache.delete(e.key); try { URL.revokeObjectURL(e.url); } catch (er) { /* ignore */ } }
    else i++;
  }
}
/* AUGL.release(url): the caller no longer shows this picture (its card is far away); free it now */
function glRelease(url) {
  if (!url) return;
  const S = G_STILL;
  S.cache.forEach(function (p, key) {
    p.then(function (r) {
      const u = r && r.url ? r.url : r;
      if (u !== url) return;
      S.cache.delete(key);
      const i = S.spins.findIndex(function (x) { return x.url === url; });
      if (i >= 0) S.spins.splice(i, 1);
      try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
    }, function () { /* ignore */ });
  });
}

/* ---- 47-models.js ---- */
/* ---- Real models (idea 7). A spec may name a model: { …, model: '/aurelia-showcase/assets/models/grace.glb' } (the shop copies a
   product's `model` field into its spec). The model is loaded once (GLTFLoader, fetched only when first needed),
   fitted, and its materials are mapped by name onto the house materials:
     metal…  (metal_yellow, metal_rose, metal_white, metal)   -> ctx.metal(that metal, else the spec's)
     gem…    (gem_diamond, gem_ruby, …, gem)                  -> the faceted-gem shader, traced against the mesh's
                                                                 own facet planes (convex stones, up to 112 planes)
     anything else keeps the model's own material, lit by the stage's environment.
   Authoring: build in the KIT's display pose (+Y up, a ring's finger axis along Z, centre stone on top), in
   millimetres (metres and centimetres are recognised by size; spec.modelScale overrides), one mesh per material.
   Any problem (missing file, file:// page, parse error, empty scene, 10 s timeout) and the procedural build is used:
   the page never shows a broken piece. ---- */

const G_MODELS = new Map();          // url -> { p: Promise<gltf|null>, gltf: gltf|null, done: bool }
let G_GLTF_LOADER = null;
function glModelLoader() {
  if (!G_GLTF_LOADER) {
    G_GLTF_LOADER = import('three/addons/loaders/GLTFLoader.js').then(function (m) { return new m.GLTFLoader(); });
  }
  return G_GLTF_LOADER;
}
/* -> Promise<gltf | null>; never rejects */
function glModelLoad(url) {
  if (!url) return Promise.resolve(null);
  let e = G_MODELS.get(url);
  if (e) return e.p;
  e = { gltf: null, done: false, p: null };
  G_MODELS.set(url, e);
  e.p = new Promise(function (resolve) {
    let settled = false;
    const end = function (g, err) {
      if (settled) return;
      settled = true;
      e.done = true; e.gltf = g || null;
      if (err) console.warn('[Aurelia GL] model not used, building the piece instead:', url, err && err.message ? err.message : err);
      resolve(e.gltf);
    };
    setTimeout(function () { end(null, new Error('timed out')); }, 10000);
    glModelLoader().then(function (loader) {
      loader.load(url, function (g) {
        if (!g || !g.scene) { end(null, new Error('empty')); return; }
        let meshes = 0;
        g.scene.traverse(function (o) { if (o.isMesh) meshes++; });
        end(meshes ? g : null, meshes ? null : new Error('no meshes'));
      }, undefined, function (err) { end(null, err); });
    }, function (err) { end(null, err); });
  });
  return e.p;
}
/* the loaded model for a url, or null (not loaded yet, or failed) */
function glModelGet(url) {
  const e = url ? G_MODELS.get(url) : null;
  return e && e.done ? e.gltf : null;
}

/* the facet planes of a convex mesh (object space), for the gem shader: one plane per distinct face orientation */
function glMeshPlanes(geo) {
  const pos = geo.attributes.position, idx = geo.index ? geo.index.array : null;
  const n = idx ? idx.length / 3 : pos.count / 3;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
  const list = [];
  geo.computeBoundingSphere();
  const R = geo.boundingSphere.radius || 1;
  for (let i = 0; i < n; i++) {
    const i0 = idx ? idx[i * 3] : i * 3, i1 = idx ? idx[i * 3 + 1] : i * 3 + 1, i2 = idx ? idx[i * 3 + 2] : i * 3 + 2;
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    nn.subVectors(b, a).cross(c.clone().sub(a));
    const area = nn.length() / 2;
    if (area < 1e-12) continue;
    nn.normalize();
    const d = nn.dot(a);
    const cen = a.clone().add(b).add(c).multiplyScalar(area / 3);
    const hit = list.find(function (p) { return p.n.dot(nn) > 0.9995 && Math.abs(p.d - d) < R * 2e-3; });
    if (hit) { hit.area += area; hit.c.add(cen); } else list.push({ n: nn.clone(), d: d, area: area, c: cen });
  }
  list.forEach(function (p) { p.c.multiplyScalar(1 / p.area); });
  // outward: the centre must be behind every plane
  const ctr = geo.boundingSphere.center;
  list.forEach(function (p) { if (p.n.dot(ctr) > p.d) { p.n.negate(); p.d = -p.d; } });
  list.sort(function (x, y) { return y.area - x.area; });
  const keep = list.slice(0, G_MAX_PLANES);
  const trace = new Float32Array(keep.length * 4);
  keep.forEach(function (p, i) { trace[i * 4] = p.n.x; trace[i * 4 + 1] = p.n.y; trace[i * 4 + 2] = p.n.z; trace[i * 4 + 3] = p.d; });
  return { trace: trace, planeCount: keep.length, planes: keep };
}

function glModelPiece(spec, ctx, gltf) {
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  // units: the KIT works in millimetres
  const box = new THREE.Box3().setFromObject(root);
  const r = box.getSize(new THREE.Vector3()).length() / 2;
  let scale = +spec.modelScale > 0 ? +spec.modelScale : (r < 0.25 ? 1000 : r < 2.5 ? 10 : 1);
  if (!(r > 0)) throw new Error('empty bounds');
  const g = new THREE.Group();
  g.add(root);
  root.scale.multiplyScalar(scale);
  if (Array.isArray(spec.modelRotation)) root.rotation.set(+spec.modelRotation[0] || 0, +spec.modelRotation[1] || 0, +spec.modelRotation[2] || 0);
  root.updateMatrixWorld(true);
  const metals = Object.keys(KIT.METALS);
  root.traverse(function (o) {
    if (!o.isMesh) return;
    const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
    const name = String((m0 && m0.name) || o.name || '').toLowerCase();
    // the geometry is shared with the cached model: every piece gets its own copy, so disposing is safe
    o.geometry = o.geometry.clone();
    if (/^(metal|gold)/.test(name) || /(^|_)metal(_|$)/.test(name)) {
      const which = metals.find(function (k) { return name.indexOf(k) >= 0; }) || spec.metal;
      o.material = ctx.metal(which);
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    } else if (/^(gem|stone)/.test(name) || /(^|_)gem(_|$)/.test(name)) {
      const stone = Object.keys(KIT.STONES).find(function (k) { return name.indexOf(k) >= 0; }) || spec.stone || 'diamond';
      let geo = o.geometry.index ? o.geometry : mergeVertices(o.geometry);
      const pl = glMeshPlanes(geo);
      if (pl.planeCount < 4) throw new Error('gem mesh is not a solid: ' + name);
      // the gem shader draws facet junctions from an 'edge' attribute; a model has none, so no lines
      geo = geo.toNonIndexed();
      geo.setAttribute('edge', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count).fill(1), 1));
      geo.computeVertexNormals();
      o.geometry = geo;
      const mat = glGemMaterial({ name: 'model', trace: pl.trace, planeCount: pl.planeCount }, stone, {});
      mat.uniforms.uEdge.value = 0;
      ctx.track(mat);
      o.material = mat;
      // glints: the crown facets that face up
      pl.planes.filter(function (p) { return p.n.y > 0.5; }).slice(0, 12).forEach(function (p) {
        ctx.glint(o, p.c, p.n, Math.max(0.6, Math.sqrt(p.area) * scale * 1.6));
      });
    } else {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m && 'envMapIntensity' in m) m.envMapIntensity = 1; ctx.track(m); });
    }
  });
  return { object: g, view: G_VIEW_DEFAULTS[spec.type] || G_VIEW_DEFAULTS.ring };
}

/* ---- 49-api.js ---- */
/* ---- window.AUGL: the public engine API (see BRIEF.md "GL API v2"). Published by the boot gate (00-imports.js) once
   the intro is over, so nothing GL runs while the page starts. UI code waits for AU.gl.then(gl => …) and feature-tests
   every method (gl && gl.compare). Scenes (60-99) add their methods to AUGL_EXT before boot:
     AUGL_EXT.gemLab = function (container, o) { … }    (copied onto window.AUGL when it is published)
   ---- */
const AUGL_EXT = {};

function glBlobB64(blob) {
  return new Promise(function (res, rej) {
    const fr = new FileReader();
    fr.onload = function () { res(String(fr.result).replace(/^data:[^,]*,/, '')); };
    fr.onerror = function () { rej(fr.error); };
    fr.readAsDataURL(blob);
  });
}

function glBoot() {
  if (AU.hasWebGL === false) { glFail(new Error('WebGL is not available')); return; }
  // warm the cut cache in idle slices, one cut at a time (a cut is a few ms of plane clipping)
  ['round', 'melee', 'oval', 'pear', 'cushion', 'emerald'].forEach(function (c) { glIdle(function () { glCut(c); }, 6).catch(function () { /* lazy later */ }); });
  const api = {
    ready: true,
    version: '2.0',
    tier: G_TIER.level,
    hero: function (container, o) { return glHero(container, o); },
    studio: function (container, o) { return glStudio(container, o); },
    compare: function (container, o) { return glCompare(container, o); },
    render: function (spec, o) { return glRender(spec, o); },
    spin: function (spec, o) { return glSpin(spec, o); },
    release: function (url) { glRelease(url); },
    lights: G_LIGHT_NAMES.slice(),
    _queue: function () { const S = G_STILL, n = performance.now(); return { jobs: S.queue.length, wait: S.wait, scheduled: S.scheduled, cool: Math.round(S.coolUntil - n), paused: S.r ? glStillPaused(n) : null, builds: S.builds.size, costs: (S.costs || []).join(' '), idle: G_IDLE.q.length }; },
    kit: KIT,
    /* for tools (tools/prerender.js) and the engine's own checks; not for pages */
    _dev: {
      THREE: THREE, KIT: KIT,
      fast: function (on) { G_STILL_FAST.on = !!on; glStillKick(0); glIdlePump(); },
      still: function (spec, o) {
        return glStillCanvas(spec, o).then(function (c) { return glToBlob(c, (o && o.quality) || 0.85); }).then(function (b) { return glBlobB64(b).then(function (d) { return { data: d, type: b.type, bytes: b.size }; }); });
      },
      spin: function (spec, o) {
        return glSpinCanvas(spec, o).then(function (r) {
          return glToBlob(r.canvas, (o && o.quality) || 0.85).then(function (b) {
            r.canvas.width = r.canvas.height = 1;
            return glBlobB64(b).then(function (d) { return { data: d, type: b.type, bytes: b.size, frames: r.frames, cols: r.cols, rows: r.rows, size: r.size, period: r.period }; });
          });
        });
      },
      glBuildPiece: glBuildPiece, glBuildSteps: glBuildSteps, glMeasure: glMeasure, glCut: glCut, glEnvAsync: glEnvAsync, glLightbox: glLightbox,
      glRenderer: glRenderer, glModelLoad: glModelLoad, glModelGet: glModelGet, stage: GlStage, idle: glIdle,
      longest: function () { return (G_STILL.costs || []).reduce(function (a, b) { return Math.max(a, b); }, 0); },
      slow: G_SLOW, act: G_ACT, live: G_LIVE, fade: G_FADE,
      roomStats: function (preset, mode) { const s = glLightbox(mode, preset); const r = glRoomStats(s); glDisposeScene(s); return r; },
      idleState: function () { return { busy: glBusy(), sinceScroll: Math.round(performance.now() - G_BUSY.t), vt: document.documentElement.classList.contains('vt-on'), scheduled: G_IDLE.scheduled, q: G_IDLE.q.map(function (j) { return (j.fn.name || 'fn') + ':' + j.n + ':' + Math.round(performance.now() - j.t); }) }; }    }
  };
  Object.keys(AUGL_EXT).forEach(function (k) { if (!(k in api)) api[k] = AUGL_EXT[k]; });
  window.AUGL = api;
  AU.emit('gl', api);
}

/* ---- 50-pieces-kit.js ---- */
/* =====================================================================================================================
   gl-pieces — shared helpers for bracelets, earrings and pendants (src/gl/50-79).
   GPX is the only top-level name gl-pieces adds to the shared module scope; everything else lives inside blocks.
   Units: mm. Orientation and the build context: see the KIT notes in 10-kit.js.
   ===================================================================================================================== */
const GPX = {};
{
  const V3 = THREE.Vector3;
  const Z = new V3(0, 0, 1), Y = new V3(0, 1, 0), X = new V3(1, 0, 0);
  const sgnPow = function (v, p) { return (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), p); };
  GPX.sgnPow = sgnPow;
  GPX.clamp = THREE.MathUtils.clamp;
  GPX.lerp = THREE.MathUtils.lerp;
  GPX.smooth = function (a, b, x) { return THREE.MathUtils.smoothstep(x, a, b); };

  /* deterministic pseudo-random numbers, so every build of a piece looks the same */
  GPX.rand = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  };

  /* Matrix4 from an orthonormal frame: X (e.g. tangent), Y (e.g. up / out), Z = X x Y */
  GPX.frame = function (pos, x, y, scale) {
    const xx = x.clone().normalize();
    const yy = y.clone().addScaledVector(xx, -y.dot(xx)).normalize();
    const zz = new V3().crossVectors(xx, yy);
    const m = new THREE.Matrix4().makeBasis(xx, yy, zz);
    if (scale != null) {
      const s = typeof scale === 'number' ? new V3(scale, scale, scale) : scale;
      m.scale(s);
    }
    m.setPosition(pos);
    return m;
  };
  /* quaternion of such a frame */
  GPX.quat = function (x, y) { return new THREE.Quaternion().setFromRotationMatrix(GPX.frame(new V3(), x, y)); };

  /* superellipse profile [[n, u], ...]: half sizes hn (across, n) and hu (along u), exponents for the + and - n sides */
  GPX.profile = function (m, hn, hu, eOut, eIn, eU) {
    const p = [];
    eIn = eIn == null ? eOut : eIn;
    for (let j = 0; j < m; j++) {
      const a = j / m * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const e = c >= 0 ? eOut : eIn;
      p.push([hn * sgnPow(c, e), hu * sgnPow(s, eU == null ? e : eU)]);
    }
    return p;
  };

  /* Sweep a closed 2D profile along a path with a per-point profile.
     path: Vector3[]; profile(i) -> [[n, u], ...] (same length every time); n runs along `out`, u along `up`.
     o: { closed, up: Vector3 | fn(i, T) -> Vector3, out: fn(i, T, U) -> Vector3 (optional; default T x U facing away
     from the path centroid), caps: true } */
  GPX.sweep = function (path, profile, o) {
    o = o || {};
    const closed = !!o.closed;
    const n = path.length;
    const prof0 = profile(0), m = prof0.length;
    const centroid = new V3();
    path.forEach(function (p) { centroid.add(p); });
    centroid.multiplyScalar(1 / n);
    const pos = new Float32Array(n * m * 3);
    const frames = [];
    let outSign = 0;
    for (let i = 0; i < n; i++) {
      const prev = path[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], next = path[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      const T = next.clone().sub(prev).normalize();
      let U = typeof o.up === 'function' ? o.up(i, T) : (o.up || Z).clone();
      U = U.clone().addScaledVector(T, -U.dot(T)).normalize();
      let N = o.out ? o.out(i, T, U).clone() : new V3().crossVectors(T, U);
      N.addScaledVector(T, -N.dot(T)).addScaledVector(U, -N.dot(U)).normalize();
      if (!o.out) outSign += N.dot(path[i].clone().sub(centroid));
      frames.push({ T: T, U: U, N: N });
    }
    const sg = o.out ? 1 : (outSign >= 0 ? 1 : -1);
    for (let i = 0; i < n; i++) {
      const f = frames[i], pr = i === 0 ? prof0 : profile(i), p = path[i];
      for (let j = 0; j < m; j++) {
        const k = (i * m + j) * 3;
        pos[k] = p.x + f.N.x * pr[j][0] * sg + f.U.x * pr[j][1];
        pos[k + 1] = p.y + f.N.y * pr[j][0] * sg + f.U.y * pr[j][1];
        pos[k + 2] = p.z + f.N.z * pr[j][0] * sg + f.U.z * pr[j][1];
      }
    }
    const idx = [];
    const nI = closed ? n : n - 1;
    for (let i = 0; i < nI; i++) {
      const i2 = (i + 1) % n;
      for (let j = 0; j < m; j++) {
        const a = i * m + j, b = i2 * m + j, c = i2 * m + (j + 1) % m, d = i * m + (j + 1) % m;
        idx.push(a, d, b, b, d, c);
      }
    }
    let geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // outward check on the profile point that sticks out furthest along n
    let jo = 0;
    for (let j = 1; j < m; j++) if (prof0[j][0] > prof0[jo][0]) jo = j;
    const nr = geo.attributes.normal;
    const iRef = Math.floor(n / 2);
    const chk = new V3(nr.getX(iRef * m + jo), nr.getY(iRef * m + jo), nr.getZ(iRef * m + jo));
    if (chk.dot(frames[iRef].N.clone().multiplyScalar(sg)) < 0) {
      const ia = geo.index.array;
      for (let i = 0; i < ia.length; i += 3) { const t = ia[i + 1]; ia[i + 1] = ia[i + 2]; ia[i + 2] = t; }
      geo.computeVertexNormals();
    }
    if (!closed && o.caps !== false) geo = GPX.capEnds(geo, n, m, frames);
    return geo;
  };

  /* flat caps for the two open ends of a sweep (separate vertices so the edge stays crisp) */
  GPX.capEnds = function (geo, n, m, frames) {
    const p = geo.attributes.position, nr = geo.attributes.normal;
    const pos = Array.from(p.array), nor = Array.from(nr.array), idx = Array.from(geo.index.array);
    [[0, -1], [n - 1, 1]].forEach(function (e) {
      const ring = e[0], sgn = e[1];
      const tn = frames[ring].T.clone().multiplyScalar(sgn);
      const base = pos.length / 3;
      const c = new V3();
      for (let j = 0; j < m; j++) {
        const k = ring * m + j;
        c.x += p.getX(k); c.y += p.getY(k); c.z += p.getZ(k);
        pos.push(p.getX(k), p.getY(k), p.getZ(k)); nor.push(tn.x, tn.y, tn.z);
      }
      c.multiplyScalar(1 / m);
      pos.push(c.x, c.y, c.z); nor.push(tn.x, tn.y, tn.z);
      const ci = base + m;
      for (let j = 0; j < m; j++) {
        const a = base + j, b = base + (j + 1) % m;
        const u = new V3(pos[a * 3] - c.x, pos[a * 3 + 1] - c.y, pos[a * 3 + 2] - c.z);
        const v = new V3(pos[b * 3] - c.x, pos[b * 3 + 1] - c.y, pos[b * 3 + 2] - c.z);
        if (new V3().crossVectors(u, v).dot(tn) >= 0) idx.push(ci, a, b); else idx.push(ci, b, a);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    geo.dispose();
    return g;
  };

  /* A rounded box (superellipsoid) with analytic normals: half sizes hx, hy, hz; e < 1 squares it off (0.25-0.4). */
  GPX.superBox = function (hx, hy, hz, e, seg) {
    seg = seg || 28;
    const g = new THREE.SphereGeometry(1, seg * 2, seg);
    const p = g.attributes.position, nr = g.attributes.normal;
    const nexp = 2 / e;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const X1 = hx * sgnPow(x, e), Y1 = hy * sgnPow(y, e), Z1 = hz * sgnPow(z, e);
      p.setXYZ(i, X1, Y1, Z1);
      const gx = sgnPow(X1 / hx, nexp - 1) / hx, gy = sgnPow(Y1 / hy, nexp - 1) / hy, gz = sgnPow(Z1 / hz, nexp - 1) / hz;
      const l = Math.hypot(gx, gy, gz) || 1;
      nr.setXYZ(i, gx / l, gy / l, gz / l);
    }
    g.deleteAttribute('uv');
    return g;
  };

  /* lathe around +Y from [r, y] pairs (bottom to top) */
  GPX.lathe = function (pairs, seg) {
    const pts = pairs.map(function (q) { return new THREE.Vector2(Math.max(0, q[0]), q[1]); });
    const g = new THREE.LatheGeometry(pts, seg || 48);
    g.deleteAttribute('uv');
    return g;
  };

  /* a closed wire loop: ellipse in the plane spanned by a and b (unit vectors), centre c, semi-axes ra, rb */
  GPX.ring = function (c, a, b, ra, rb, wire, o) {
    o = o || {};
    const pts = [], N = o.n || 40;
    for (let i = 0; i < N; i++) {
      const t = i / N * Math.PI * 2;
      const ca = Math.cos(t), sb = Math.sin(t);
      // superellipse when o.sq is given (rounded rectangle loops for bails)
      const e = o.sq || 1;
      pts.push(c.clone().addScaledVector(a, ra * sgnPow(ca, e)).addScaledVector(b, rb * sgnPow(sb, e)));
    }
    return KIT.loop(pts, wire, { radial: o.radial || 12, segments: o.segments || N });
  };

  /* merge a list of geometries into one mesh with the piece's metal (frees the inputs) */
  GPX.metalMesh = function (ctx, geos, mat) {
    const list = geos.filter(Boolean);
    if (!list.length) return null;
    const g = list.length === 1 ? list[0] : mergeGeometries(list.map(function (x) { return x.index ? x : x; }), false);
    if (list.length > 1) list.forEach(function (x) { x.dispose(); });
    return ctx.mesh(g, mat || ctx.metal());
  };

  /* gem proportions without adding anything to the scene (probe the kit's cut, glints off) */
  GPX.probe = function (ctx, cut, width, stone) {
    return ctx.gem({ cut: cut, width: width, stone: stone || 'diamond', glints: false });
  };

  /* Turn a setting group (gem frame: table +Y) so its table faces direction `dir` and gem +Z points along `along`. */
  GPX.face = function (group, dir, along) {
    const yy = dir.clone().normalize();
    const zz = along.clone().addScaledVector(yy, -along.dot(yy)).normalize();
    const xx = new V3().crossVectors(yy, zz);
    group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xx, yy, zz));
    return group;
  };

  /* Gentle live swing for a hanging part. pivot group rotates about its own origin. Only in live stages
     (hero / studio), never in stills, and never with reduced motion. Driven from onBeforeRender of the meshes inside
     it, once per rendered frame, so it costs nothing when the stage is idle. */
  GPX.swing = function (ctx, pivot, o) {
    if (ctx.detail === 'still') return;
    o = o || {};
    const amp = o.amp == null ? 0.07 : o.amp, ph = o.phase || 0, sp = o.speed || 1;
    const st = { f: -1, t: -1 };
    const upd = function (renderer) {
      const f = renderer && renderer.info ? renderer.info.render.frame : -2;
      const now = performance.now() / 1000;
      if (f === st.f && f !== -2) return;
      if (f === -2 && Math.abs(now - st.t) < 0.004) return;
      st.f = f; st.t = now;
      if (AU.reduced) pivot.rotation.set(0, 0, 0);
      else {
        const t = now * sp + ph;
        // two incommensurate slow sways: side to side and front to back, like a drop moving with the head
        pivot.rotation.z = amp * (0.72 * Math.sin(t * 1.55) + 0.28 * Math.sin(t * 0.83 + 1.3));
        pivot.rotation.x = amp * 0.75 * (0.65 * Math.sin(t * 1.21 + 0.6) + 0.35 * Math.sin(t * 0.67 + 2.2));
      }
      pivot.updateMatrixWorld(true);
    };
    pivot.traverse(function (obj) { if (obj.isMesh) obj.onBeforeRender = upd; });
  };

  /* Cable chain: instanced links along a centripetal Catmull-Rom curve through `points`.
     o: { closed, scale (link size; unit link is 2.4 x 1.4 x wire 0.22), seed, twist } */
  GPX.chain = function (ctx, points, o) {
    o = o || {};
    const s = o.scale || 0.6;
    const curve = new THREE.CatmullRomCurve3(points, !!o.closed, 'centripetal', 0.5);
    const len = curve.getLength();
    // inner length of a link: consecutive links interlock (o.fine: the heavier-wire 'link-fine')
    const pitch = (o.fine ? 1.16 : 1.5) * s;
    let n = Math.max(2, Math.floor(len / pitch));
    if (o.closed && n % 2) n -= 1;
    const rnd = GPX.rand(o.seed || 7);
    const mats = [];
    const view = o.view || Z;
    let N = null;
    for (let i = 0; i < n; i++) {
      const u = o.closed ? i / n : (i + 0.5) / n;
      const p = curve.getPointAt(u), T = curve.getTangentAt(u).normalize();
      if (!N) {
        N = view.clone().addScaledVector(T, -view.dot(T));
        if (N.lengthSq() < 1e-4) N = Y.clone().addScaledVector(T, -Y.dot(T));
        N.normalize();
      } else { N.addScaledVector(T, -N.dot(T)).normalize(); }
      const B = new V3().crossVectors(T, N);
      // alternate links lie flat and on edge; a small random roll so the chain reads as made, not generated
      const roll = (i % 2 ? Math.PI / 2 : 0) + (rnd() - 0.5) * (o.twist == null ? 0.35 : o.twist);
      const yy = N.clone().multiplyScalar(Math.cos(roll)).addScaledVector(B, Math.sin(roll));
      mats.push(GPX.frame(p, T, yy, s));
    }
    const im = ctx.instanced(KIT.unit(o.fine ? 'link-fine' : 'link'), ctx.metal(), mats);
    im.name = 'chain';
    return { mesh: im, curve: curve, count: n };
  };

  /* An ear post (10 x 0.8 mm) running from `from` toward -Z (local frame of the earring), with a small butterfly
     back. The back is only made for the studio (o.back !== false): in stills and the hero the pair is shown the way
     a jeweller photographs it, backs off. */
  GPX.post = function (ctx, from, o) {
    o = o || {};
    const L = o.length || 10, r = o.r || 0.4;
    const geos = [];
    geos.push(KIT.tube([from.clone(), from.clone().add(new V3(0, 0, -L * 0.5)), from.clone().add(new V3(0, 0, -L))], function (t) { return r * (1 - 0.12 * t * t); }, { radial: 14, segments: 8 }));
    if (o.back === false || ctx.detail !== 'studio') return geos;
    // the butterfly (scroll) back: a domed disc with a barrel and two curled wings, seated on the post
    const zb = from.z - (o.at || 6.4);
    const back = [];
    const dr = Math.min(1.7, o.backR || 1.6);
    // barrel
    const barrel = GPX.lathe([[0, -1.6], [0.62, -1.6], [0.78, -1.45], [0.78, 0], [0.62, 0.12], [0.44, 0.12]], 32);
    back.push(barrel);
    // plate: a thin softly domed disc
    const plate = GPX.lathe([[0.5, -0.05], [dr * 0.92, -0.12], [dr, -0.02], [dr * 0.98, 0.14], [dr * 0.7, 0.3], [0.62, 0.36]], 64);
    back.push(plate);
    // the two scrolls (the butterfly wings) that grip the post
    [-1, 1].forEach(function (sx) {
      const pts = [];
      for (let k = 0; k <= 18; k++) {
        const t = k / 18;
        const a = Math.PI * (0.15 + 1.25 * t);
        const rr = dr * 0.55 * (1 - 0.55 * t);
        // lathe frame: +Y is the post axis (toward the stone), x/z span the plate
        pts.push(new V3(sx * (0.45 + Math.sin(a) * rr * 0.45 + rr * 0.35), 0.36 + Math.sin(a) * 0.5, Math.cos(a) * dr * 0.62 * (1 - 0.35 * t)));
      }
      back.push(KIT.tube(pts, function (t) { return 0.26 - 0.06 * t; }, { radial: 10, segments: 30 }));
    });
    const bg = mergeGeometries(back, false);
    back.forEach(function (g) { g.dispose(); });
    // lathe is built around +Y: turn the back so its axis runs along Z (plate facing the stone)
    bg.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    bg.translate(from.x, from.y, zb);
    geos.push(bg);
    return geos;
  };
}

/* ---- 52-bracelets.js ---- */
/* ---- BRACELETS (gl-pieces).
   tennis: a supple line of stones, each in a four-claw box with a hinge between, laid on the table as a loose open
           loop (frame: lying in the XZ plane, stones facing +Y); the box clasp is open, so box and tongue both show.
   bangle: a solid oval bangle standing like a ring (axis along Z), softly domed profile, hinge and a fine line at the
           opening.
   cuff:   an open C (axis along Z, opening at the top) with a stone at each terminal, the two facing each other. ---- */
{
  const V3 = THREE.Vector3;
  const X = new V3(1, 0, 0), Y = new V3(0, 1, 0), Z = new V3(0, 0, 1);
  const TAU = Math.PI * 2;

  /* ======================= TENNIS ======================= */

  /* the line the bracelet lies along: a closed, smooth superellipse (a touch fuller than an ellipse, the way a supple
     line of boxes settles), with a gentle saddle-shaped drape, arc-length addressable, so the boxes sit at one even
     pitch all the way round. v1's low-frequency wobble made an egg with a bulge by the clasp.
     s = 0 is the clasp (front right before the stage turns it); the line runs once round and meets it again. */
  function tennisPath(L, th0) {
    const span = TAU;
    const S = 720, raw = [];
    const e = 2 / 2.25;                                   // superellipse exponent 2.25
    for (let i = 0; i <= S; i++) {
      const u = i / S, th = th0 + span * u;
      const c = Math.cos(th), s = Math.sin(th);
      raw.push(new V3(GPX.sgnPow(c, e) * 1.06, 0, GPX.sgnPow(s, e) * 0.94));
    }
    let len = 0;
    for (let i = 1; i <= S; i++) len += raw[i].distanceTo(raw[i - 1]);
    const R = L / len;
    const pts = raw.map(function (p, i) {
      const u = i / S, th = th0 + span * u;
      // drape: one smooth saddle (two gentle rises and two dips), as if laid on a soft cloth
      const y = 0.75 * Math.sin(th * 2 + 0.5);
      return new V3(p.x * R, y, p.z * R);
    });
    const cum = [0];
    for (let i = 1; i <= S; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = cum[S];
    const at = function (s) {
      s = ((s % total) + total) % total;
      let lo = 0, hi = S;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < s) lo = mid; else hi = mid; }
      const t = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
      const p = pts[lo].clone().lerp(pts[hi], t);
      const T = pts[hi].clone().sub(pts[lo]).normalize();
      // up: mostly +Y, rolled a little by the drape's lean
      const out = new V3(p.x, 0, p.z).normalize();
      const roll = 0.04 * Math.sin(s / total * TAU * 2 + 0.8);
      const up = Y.clone().addScaledVector(out, roll);
      return { p: p, T: T, up: up };
    };
    return { at: at, total: total, R: R };
  }

  /* one link of the line in its own frame (X along the line, Y up, Z across), centred on the stone's girdle */
  function tennisUnit(pr, o) {
    const geos = [];
    const d = pr.width, gh = pr.girdle / 2;
    const tw = o.wall, hs = o.hs, cr = o.clawR;
    const yT = -gh - 0.1, yB = -pr.pavilion * 0.9;
    // box wall: a squarish loop (or the stone's own outline) swept with a rounded wall section
    const lod = o.lod || 1, N = Math.round(40 * lod + 16), path = [];
    const round = pr.cut === 'round';
    for (let i = 0; i < N; i++) {
      const t = i / N * TAU;
      if (round) {
        const a = hs - tw / 2;
        path.push(new V3(a * GPX.sgnPow(Math.cos(t), 0.42), 0, a * GPX.sgnPow(Math.sin(t), 0.42)));
      } else {
        const q = pr.outline(t), l = q.length();
        const k = (l + 0.2 + tw / 2 - 0.05) / l;
        path.push(new V3(q.x * k, 0, q.y * k));
      }
    }
    const prof = GPX.profile(Math.round(8 * lod + 4), tw / 2, (yT - yB) / 2, 0.45).map(function (q) { return [q[0], q[1] + (yT + yB) / 2]; });
    geos.push(GPX.sweep(path, function () { return prof; }, { closed: true, up: Y }));
    // four corner claws: rise from the wall top, grip the girdle, fold over the crown and end in a rounded tip
    const azs = round ? [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4] : pr.prongs(4);
    azs.forEach(function (az) {
      const q = pr.outline(az), R = q.length(), u = new V3(q.x / R, 0, q.y / R);
      const cornerR = round ? (hs - tw / 2) * Math.SQRT2 * Math.pow(Math.SQRT1_2, 0.42) - 0.06 : R + 0.2 + tw / 2;
      const tipR = R - cr * 0.85;
      const pts = [
        u.clone().multiplyScalar(cornerR - tw * 0.2).setY(yT - 0.35),
        u.clone().multiplyScalar(cornerR - tw * 0.1).setY(yT + 0.05),
        u.clone().multiplyScalar(R + cr * 0.55).setY(gh * 0.2),
        u.clone().multiplyScalar(R + cr * 0.15).setY(gh + (pr.crown - gh) * 0.2),
        u.clone().multiplyScalar(tipR).setY(pr.surfaceY(u.x * tipR, u.z * tipR) + cr * 0.32)
      ];
      geos.push(KIT.tube(pts, function (t) { return cr * (1.08 - 0.2 * t * t); }, { radial: Math.round(6 * lod + 5), segments: Math.round(12 * lod + 6) }));
    });
    // the hinge: a flat link under the gap and a knuckle, joining this box to the next one (toward +X)
    const ext = o.along / 2;
    const hx = o.pitch / 2;
    const strip = GPX.superBox((o.pitch - 2 * ext) / 2 + 0.55, 0.17, hs * 0.5, 0.35, 10);
    strip.translate(hx, yB + 0.22, 0);
    geos.push(strip);
    const kn = new THREE.CylinderGeometry(0.27, 0.27, hs * 0.92, 16, 1);
    kn.deleteAttribute('uv');
    kn.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    kn.translate(hx, yB + 0.3, 0);
    geos.push(kn);
    const g = mergeGeometries(geos.map(function (x) { return x.index ? x : x; }), false);
    geos.forEach(function (x) { x.dispose(); });
    return g;
  }

  KIT.register('bracelet', 'tennis', function* (spec, ctx) {
    const g = new THREE.Group();
    const stone = spec.stone || 'diamond';
    const cutName = spec.cut || 'round';
    const elong = cutName !== 'round';
    const d = THREE.MathUtils.clamp(KIT.size('round', spec.carat).width * 0.8, 2.2, 4.6) * (elong ? 0.86 : 1);
    const pr = GPX.probe(ctx, cutName, d, stone);
    const along = elong ? pr.length : pr.width;           // extent of a stone along the line
    const wall = THREE.MathUtils.clamp(d * 0.085, 0.24, 0.36);
    const hs = d / 2 + 0.2;
    const pitch = along + 0.4 + wall * 0.5 + 0.12;
    const clawR = THREE.MathUtils.clamp(d * 0.085, 0.24, 0.38);
    const claspLen = Math.max(6.2, d * 1.75);
    const n = Math.max(24, Math.min(64, Math.round(166 / pitch)));
    const L = n * pitch + claspLen;                       // closed: the tongue is inside the box, out of sight
    const path = tennisPath(L, 0.45 - claspLen / 2 / L * TAU);
    const tongueLen = claspLen;                           // the stones start where the box ends
    const rot = elong ? new THREE.Matrix4().makeRotationY(Math.PI / 2) : new THREE.Matrix4();
    yield;
    const unit = tennisUnit(pr, { wall: wall, hs: hs, clawR: clawR, pitch: pitch, along: along, lod: ctx.lod });
    if (elong) unit.applyMatrix4(rot);
    const frames = [];
    for (let i = 0; i < n; i++) {
      const f = path.at(tongueLen + (i + 0.5) * pitch);
      frames.push(GPX.frame(f.p, f.T, f.up));
    }
    // stones: one InstancedMesh per stone kind (coloured stones alternate with diamonds when accent is diamond)
    const alt = stone !== 'diamond' && spec.accent === 'diamond';
    const mainM = [], accM = [];
    frames.forEach(function (m, i) { (alt && i % 2 ? accM : mainM).push(m.clone().multiply(rot)); });
    const gcut = d >= 2 ? cutName : 'melee';
    g.add(ctx.gems({ stone: stone, cut: gcut, width: d, matrices: mainM, bounces: 5 }));
    if (accM.length) g.add(ctx.gems({ stone: 'diamond', cut: gcut, width: d, matrices: accM, bounces: 5 }));
    const unitMesh = ctx.instanced(unit, ctx.metal(), frames);
    ctx.track(unit);
    g.add(unitMesh);
    yield;
    // the clasp, closed: a polished box in line with the stones (s 0 .. claspLen), a fine line where the tongue's lid
    // meets it, and a figure-of-eight safety lying on its outer side. The tongue itself is inside, out of sight.
    const gh = pr.girdle / 2, yB = -pr.pavilion * 0.9, yTop = pr.crown * 0.55;
    const cg = [];
    const lidLen = 0.55, line = 0.09;
    const bodyLen = claspLen - lidLen - line - 0.25;
    const fb = path.at(0.15 + bodyLen / 2);
    const body = GPX.superBox(bodyLen / 2, (yTop - yB) / 2, hs, 0.3, 24);
    body.translate(0, (yTop + yB) / 2, 0);
    body.applyMatrix4(GPX.frame(fb.p, fb.T, fb.up));
    cg.push(body);
    const fl = path.at(0.15 + bodyLen + line + lidLen / 2);
    const lid = GPX.superBox(lidLen / 2, (yTop - yB) / 2, hs, 0.3, 16);
    lid.translate(0, (yTop + yB) / 2, 0);
    lid.applyMatrix4(GPX.frame(fl.p, fl.T, fl.up));
    cg.push(lid);
    // the hinge from the lid to the first stone (every other stone carries its own hinge to the next)
    const fh = path.at(claspLen - 0.05);
    const hinge = GPX.superBox(Math.max(0.45, pitch / 2 - 0.1), 0.17, hs * 0.5, 0.35, 10);
    hinge.translate(0, yB + 0.22, 0);
    hinge.applyMatrix4(GPX.frame(fh.p, fh.T, fh.up));
    cg.push(hinge);
    // safety catch: a small wire eight lying on the outer side of the box
    const fe = path.at(0.15 + bodyLen * 0.45);
    const side = new V3().crossVectors(fe.T, fe.up).normalize();
    const out = new V3(fe.p.x, 0, fe.p.z).normalize();
    const sgn = side.dot(out) >= 0 ? 1 : -1;
    [-1, 1].forEach(function (k) {
      const c = fe.p.clone().addScaledVector(side, sgn * (hs + 0.17)).addScaledVector(fe.T, k * 0.62).addScaledVector(fe.up, (yTop + yB) / 2);
      cg.push(GPX.ring(c, fe.T, fe.up, 0.6, 0.46, 0.14, { n: 28, radial: 8 }));
    });
    g.add(GPX.metalMesh(ctx, cg));
    void gh;
    const mid = path.at(tongueLen + pitch * Math.round(n * 0.62)).p;
    return { object: g, view: { tilt: 0.86, still: { tilt: 0.88, turn: -0.35 }, spinTilt: 0.8, focus: mid } };
  });

  /* ======================= shared for bangle and cuff: an oval in the XY plane, axis along Z ======================= */
  const ovalPt = function (a, b, th) { return new V3(Math.cos(th) * a, Math.sin(th) * b, 0); };
  const ovalTan = function (a, b, th) { return new V3(-Math.sin(th) * a, Math.cos(th) * b, 0).normalize(); };
  const ovalOut = function (a, b, th) { return new V3(Math.cos(th) * b, Math.sin(th) * a, 0).normalize(); };
  const arcPts = function (a, b, t0, t1, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(ovalPt(a, b, t0 + (t1 - t0) * i / n));
    return pts;
  };
  /* a knuckle (short barrel with softened edges) along Z */
  const knuckle = function (r, h, e) {
    const k = GPX.lathe([[0, -h / 2], [r - e, -h / 2], [r - e * 0.3, -h / 2 + e * 0.3], [r, -h / 2 + e], [r, h / 2 - e], [r - e * 0.3, h / 2 - e * 0.3], [r - e, h / 2], [0, h / 2]], 40);
    k.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    return k;
  };

  /* ======================= BANGLE ======================= */
  KIT.register('bracelet', 'bangle', function* (spec, ctx) {
    const g = new THREE.Group();
    const lod = ctx.lod;
    const T = 2.55, W = 4.5;
    const a = 29.6 + T / 2, b = 24.6 + T / 2;          // centre line of the band (inner oval ~ 59 x 49 mm)
    const thO = 0.5, thH = Math.PI + 0.5;               // the opening (upper right) and the hinge (lower left)
    const ga = 0.07 / 27;                               // half the width of the fine line, as an angle
    const prof = GPX.profile(Math.round(26 * lod + 10), T / 2, W / 2, 0.76, 0.58);
    const N = Math.round(200 * lod + 40);
    // the two arcs of the band, each in a step of its own
    const arcs = [[thO + ga, thH - ga * 4], [thH + ga * 4, thO + TAU - ga]];
    for (let i = 0; i < arcs.length; i++) {
      g.add(ctx.mesh(GPX.sweep(arcPts(a, b, arcs[i][0], arcs[i][1], N), function () { return prof; }, { closed: false, up: Z })));
      yield;
    }
    const geos = [];
    // hinge: three knuckles across the band, standing a hair proud of both faces
    const hc = ovalPt(a, b, thH), segL = (W * 1.0 - 2 * 0.07) / 3;
    for (let k = 0; k < 3; k++) {
      const kn = knuckle(T / 2 + 0.11, segL, 0.14);
      kn.translate(hc.x, hc.y, -W / 2 + segL / 2 + k * (segL + 0.07));
      geos.push(kn);
    }
    // the catch at the opening: a small polished push-piece on the front face, just behind the fine line
    const tc = thO + 0.035, pc = ovalPt(a, b, tc);
    const push = GPX.superBox(1.05, 0.62, 0.24, 0.4, 16);
    push.applyMatrix4(GPX.frame(pc.clone().setZ(W / 2 - 0.04), ovalTan(a, b, tc), ovalOut(a, b, tc)));
    geos.push(push);
    // a stone (and diamonds beside it) in polished collets on the top, when the spec asks for one
    const top = Math.PI / 2, rOut = b + T / 2;
    const collet = function (gem, th) {
      const s = ctx.setting(gem, { bezel: true, wall: THREE.MathUtils.clamp(gem.width * 0.08, 0.3, 0.5) });
      if (gem.length > gem.width * 1.05) s.rotation.y = Math.PI / 2;     // long stones lie along the bangle
      const outN = ovalOut(a, b, th), p = ovalPt(a, b, th).addScaledVector(outN, T / 2 - 0.3 + gem.girdle / 2 + (gem.pavilion - gem.girdle / 2) * 0.62);
      const wrap = new THREE.Group();
      wrap.add(s);
      wrap.position.copy(p);
      wrap.quaternion.setFromUnitVectors(Y, outN);
      g.add(wrap);
      return p;
    };
    let focus = null;
    let half = 0;
    if (spec.stone) {
      const gem = ctx.gem({ cut: spec.cut, stone: spec.stone, carat: THREE.MathUtils.clamp(spec.carat, 0.1, 1.2) });
      focus = collet(gem, top);
      half = Math.max(gem.width, gem.length) / 2 + 0.6;
    }
    if (spec.accent === 'diamond') {
      const dw = 2.1;
      const offs = spec.stone ? [-1, 1] : [0];
      offs.forEach(function (k) {
        const gm = ctx.gem({ cut: 'round', stone: 'diamond', width: dw });
        const p = collet(gm, top - k * (half + dw / 2 + 0.55) / rOut);
        if (!focus) focus = p;
      });
    }
    g.add(GPX.metalMesh(ctx, geos));
    return { object: g, view: { tilt: 0.62, still: { tilt: 0.64, turn: -0.5 }, spinTilt: 0.56, focus: focus || ovalPt(a, b, thO) } };
  });

  /* ======================= CUFF ======================= */
  KIT.register('bracelet', 'cuff', function* (spec, ctx) {
    const g = new THREE.Group();
    const lod = ctx.lod;
    const a = 27.6, b = 22.4;                           // centre line of the open oval
    const psi = 0.56;                                   // half the opening at the top
    const t0 = Math.PI / 2 + psi, t1 = Math.PI / 2 - psi + TAU;
    const N = Math.round(220 * lod + 40), m = Math.round(24 * lod + 10);
    const pts = arcPts(a, b, t0, t1, N);
    // wider and a little heavier at the back of the wrist, slimming toward the stones
    const prof = function (i) {
      const u = i / N, k = Math.pow(Math.sin(Math.PI * u), 1.3);
      return GPX.profile(m, (2.0 + 0.45 * k) / 2, (2.8 + 1.9 * k) / 2, 0.74, 0.58);
    };
    g.add(ctx.mesh(GPX.sweep(pts, prof, { closed: false, up: Z })));
    yield;
    const geos = [];
    let focus = null;
    [[t0, -1], [t1, 1]].forEach(function (e) {
      const th = e[0], E = ovalPt(a, b, th);
      const t = ovalTan(a, b, th).multiplyScalar(e[1]);   // out of the band, toward the opening
      const n = ovalOut(a, b, th);
      if (spec.stone) {
        const gem = ctx.gem({ cut: spec.cut, stone: spec.stone, carat: spec.carat });
        const cl = gem.cut === 'pear' ? 5 : (gem.cut === 'round' && spec.carat >= 0.45 ? 6 : 4);
        const set = ctx.setting(gem, { claws: cl, baseR: 0.85, bottom: -(gem.pavilion + 0.55) });
        // the two tables face each other across the opening, leaning a little outward so they catch the light
        const dir = t.clone().multiplyScalar(Math.cos(0.42)).addScaledVector(n, Math.sin(0.42)).normalize();
        GPX.face(set, dir, Z);
        const base = E.clone().addScaledVector(t, 0.35);
        set.position.copy(base).addScaledVector(dir, gem.pavilion + 0.55);
        g.add(set);
        // a short stem that carries the band into the setting
        geos.push(KIT.tube([E.clone().addScaledVector(t, -0.6), E.clone().addScaledVector(t, 0.1), base.clone().addScaledVector(dir, 0.35)], function (k) { return 0.98 - 0.12 * k; }, { radial: 16, segments: 10 }));
        if (!focus) focus = set.position.clone();
      } else {
        const ball = new THREE.SphereGeometry(1.75, 40, 28);
        ball.deleteAttribute('uv');
        ball.translate(E.x + t.x * 1.15, E.y + t.y * 1.15, 0);
        geos.push(ball);
      }
    });
    g.add(GPX.metalMesh(ctx, geos));
    return { object: g, view: { tilt: 0.56, still: { tilt: 0.6, turn: -0.42 }, spinTilt: 0.5, focus: focus || ovalPt(a, b, Math.PI / 2 + psi) } };
  });

  KIT.register('bracelet', function (spec, ctx) { return KIT.builderFor({ type: 'bracelet', style: 'tennis' })(spec, ctx); });
}

/* ---- 55-earrings.js ---- */
/* ---- EARRINGS (gl-pieces). Always a pair. Each earring is built in its own frame: the stone faces +Z (the
   viewer), the earring hangs along -Y, the post runs back along -Z. The pair is then arranged one slightly in
   front of and lower than the other, each turned a little, like a pair laid out for a photograph. ---- */
{
  const V3 = THREE.Vector3;
  const X = new V3(1, 0, 0), Y = new V3(0, 1, 0), Z = new V3(0, 0, 1);

  /* a claw head facing the viewer: setting group (gem frame) turned so the table faces +Z */
  function faceHead(ctx, gem, o) {
    const head = ctx.setting(gem, o);
    head.rotation.x = Math.PI / 2;
    return head;
  }
  /* where the kit's gallery rail sits for this gem (gem frame), so links can be soldered to it */
  function railOf(gem, o) {
    const cr = o.clawR || THREE.MathUtils.clamp(gem.width * 0.066, 0.34, 0.6);
    const gh = gem.girdle / 2, pav = gem.pavilion - gh;
    const baseR = o.baseR != null ? o.baseR : Math.min(gem.width * 0.3, 0.95);
    return { y: -gh - pav * 0.52, r: Math.max(baseR + 0.15, (gem.width / 2) * 0.48 + cr * 1.05), cr: cr, baseR: baseR };
  }
  /* small disc that closes the back of a claw basket, with the ear post and its butterfly back */
  function backOf(ctx, gem, bottom, baseR, o, parent) {
    o = o || {};
    const geos = [];
    // a slim seat under the basket where the post is soldered (no heavy disc)
    const disc = GPX.lathe([[0, -0.2], [baseR * 0.7 + 0.12, -0.18], [baseR * 0.7 + 0.2, -0.06], [baseR * 0.7 + 0.14, 0.06], [0, 0.08]], 32);
    disc.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    disc.translate(0, 0, bottom);
    geos.push(disc);
    // the post (and its back) is its own mesh, left out of the framing: a stud is framed on its face. Only the
    // studio, where the visitor examines the piece from every side, shows them; the hero and the catalogue pictures
    // show the pair the way a jeweller photographs it, posts and backs off
    if (ctx.detail !== 'studio') return geos;
    const post = GPX.metalMesh(ctx, GPX.post(ctx, new V3(0, 0, bottom - 0.15), { length: 10, at: o.at || 5.4, backR: o.backR || 1.6, r: 0.4 }));
    post.userData.noFrame = true;
    parent.add(post);
    return geos;
  }

  /* a light open head for a drop: three slim claws (the point and the two shoulders for a pear; four on other cuts)
     on one fine rail that follows the girdle, and a single support bar under the pavilion. Gem frame. */
  function outlineNormal(gem, az) {
    const e = 0.002, a = gem.outline(az - e), b = gem.outline(az + e);
    const n = new THREE.Vector2(b.y - a.y, -(b.x - a.x)).normalize();
    if (n.dot(gem.outline(az)) < 0) n.negate();
    return n;
  }
  function slimHead(ctx, gem) {
    const group = new THREE.Group();
    group.add(gem.mesh);
    const lod = ctx.lod || 1;
    const pear = gem.cut === 'pear';
    const gh = gem.girdle / 2;
    const cr = THREE.MathUtils.clamp(gem.width * 0.05, 0.26, 0.36);
    const rr = 0.19, yR = -gh - rr * 0.95;
    const geos = [];
    const N = Math.round(64 * lod + 24), rail = [];
    for (let i = 0; i < N; i++) {
      const az = i / N * KIT.TAU, q = gem.outline(az), n = outlineNormal(gem, az);
      rail.push(new V3(q.x - n.x * 0.12, yR, q.y - n.y * 0.12));
    }
    geos.push(KIT.loop(rail, rr, { radial: Math.round(8 * lod + 2), segments: N }));
    const azs = gem.prongs(pear ? 3 : 4);
    azs.forEach(function (az, i) {
      const q = gem.outline(az), nrm = outlineNormal(gem, az);
      const c = cr * (pear && i === 0 ? 1.2 : 1);
      const R = q.length(), u = q.clone().divideScalar(R);
      const yb = yR - 0.75;
      const tipIn = c * 0.7;
      const tx = q.x - nrm.x * tipIn, tz = q.y - nrm.y * tipIn;
      const pts = [
        new V3(u.x * (R - 0.35), yb, u.y * (R - 0.35)),
        new V3(q.x + nrm.x * c * 0.2, yR, q.y + nrm.y * c * 0.2),
        new V3(q.x + nrm.x * c * 0.55, -gh * 0.2, q.y + nrm.y * c * 0.55),
        new V3(q.x + nrm.x * c * 0.25, gh + (gem.crown - gh) * 0.16, q.y + nrm.y * c * 0.25),
        new V3(tx, gem.surfaceY(tx, tz) + c * 0.35, tz)
      ];
      geos.push(KIT.tube(pts, function (t) { return c * (1.0 - 0.2 * t * t); }, { radial: Math.round(10 * lod + 4), segments: Math.round(30 * lod + 8) }));
    });
    // the single support: a fine bar under the pavilion, from the rail at the point end to the rail at the round end
    const zA = gem.outline(Math.PI / 2).y, zB = gem.outline(-Math.PI / 2).y;
    const bar = [];
    for (let k = 0; k <= 8; k++) {
      const z = zA + (zB - zA) * k / 8;
      const y = Math.min(yR, gem.bottomY(0, z * 0.92) - 0.2);
      bar.push(new V3(0, y, z * (k === 0 || k === 8 ? 0.97 : 0.92)));
    }
    geos.push(KIT.tube(bar, 0.2, { radial: 8, segments: 24 }));
    const head = new THREE.Mesh(mergeGeometries(geos, false), ctx.metal());
    geos.forEach(function (g) { g.dispose(); });
    head.name = 'head';
    group.add(head);
    group.userData.gem = gem;
    return { group: group, clawR: cr };
  }

  /* ---------- one stud ---------- */
  function stud(ctx, spec) {
    const g = new THREE.Group();
    const gem = ctx.gem({ cut: spec.cut, stone: spec.stone || 'diamond', carat: spec.carat });
    const baseR = Math.min(gem.width * 0.26, 0.9);
    const o = { claws: 4, baseR: baseR, bottom: -(gem.pavilion + 0.35), clawR: THREE.MathUtils.clamp(gem.width * 0.075, 0.34, 0.55) };
    g.add(faceHead(ctx, gem, o));
    g.add(GPX.metalMesh(ctx, backOf(ctx, gem, o.bottom, baseR, { backR: THREE.MathUtils.clamp(gem.width * 0.32, 1.2, 1.6) }, g)));
    g.userData.focus = new V3(0, 0, gem.crown * 0.5);
    g.userData.w = Math.max(gem.width, gem.length);
    return g;
  }

  /* ---------- the hanging assembly shared by drop earrings and the drop pendant ----------
     returns { group (origin at the pivot, the eye of the top setting), height } with the main stone point up,
     hanging below a fine oval link. */
  function dropBelow(ctx, spec, o) {
    o = o || {};
    const pv = new THREE.Group();
    const gem = ctx.gem({ cut: spec.cut || 'pear', stone: spec.stone || 'diamond', carat: spec.carat });
    const pear = gem.cut === 'pear';
    const sh = slimHead(ctx, gem);
    const cr = sh.clawR;
    const set = sh.group;
    set.rotation.x = Math.PI / 2;                // table toward the viewer, gem +Z (the pear point) down
    const flip = new THREE.Group();
    flip.rotation.z = Math.PI;                    // ... and turned over so the point is up, like a tear
    flip.add(set);
    // the top of the stone + its claw (gem +Z end of the outline, now pointing up)
    const tipD = gem.outline(Math.PI / 2).y;
    const tipTop = tipD + cr * (pear ? 1.2 : 1.0);
    // links: A (on the setting above, XY plane, made by the caller), B the fine oval link (YZ plane), C the eye on
    // the stone's top claw (XY plane). The pivot (origin) is the centre of A.
    const wa = o.wa || 0.19, a = o.a || 0.52;
    const bw = 0.16, bL = o.linkLen || 1.55, bR = 0.5;
    const yB = -a - bL + wa + bw;                 // B rests on A's bottom wire
    const cw = 0.18, cR = 0.48;
    const yC = yB - bL + bw + cw - cR + 0.02;     // C's centre: hangs on B's bottom wire... (C's top wire above B's bottom)
    const geos = [];
    geos.push(GPX.ring(new V3(0, yB, 0), Y, Z, bL, bR, bw, { n: 36, radial: 10 }));
    geos.push(GPX.ring(new V3(0, yC, 0), X, Y, cR, cR, cw, { n: 30, radial: 10 }));
    // the stone hangs from C: its top claw meets the bottom of C
    const yStoneTop = yC - cR + cw * 0.2;
    flip.position.y = yStoneTop - tipTop;
    // a short collar joining C to the top claw
    geos.push(KIT.tube([new V3(0, yC - cR + 0.05, 0), new V3(0, yStoneTop - 0.25, -0.05), new V3(0, flip.position.y + tipD + cr * 0.4, -0.2)], function (t) { return cw * (1.05 + 0.5 * t); }, { radial: 10, segments: 10 }));
    pv.add(flip);
    pv.add(GPX.metalMesh(ctx, geos));
    const len = gem.length;
    return { group: pv, height: -(flip.position.y - (len - tipD)), gem: gem, center: new V3(0, flip.position.y + tipD - len / 2, 0) };
  }
  GPX.dropBelow = dropBelow;

  /* ---------- one drop earring: a small stone in claws, a fine link, the main stone below ---------- */
  function drop(ctx, spec, side) {
    const g = new THREE.Group();
    const topStone = spec.accent === 'diamond' ? 'diamond' : (spec.stone || 'diamond');
    const tc = THREE.MathUtils.clamp(spec.carat * 0.12, 0.07, 0.22);
    const top = ctx.gem({ cut: 'round', stone: topStone, carat: tc });
    const baseR = Math.min(top.width * 0.26, 0.7);
    const o = { claws: 4, low: true, baseR: baseR, bottom: -(top.pavilion + 0.3), clawR: THREE.MathUtils.clamp(top.width * 0.08, 0.28, 0.42) };
    g.add(faceHead(ctx, top, o));
    const geos = backOf(ctx, top, o.bottom, baseR, { backR: Math.min(1.4, top.width * 0.5), at: 5.2 }, g);
    // eye A under the top setting, soldered to the bottom of its gallery rail
    const rl = railOf(top, o);
    const a = 0.5, wa = 0.19;
    const eye = new V3(0, -(rl.r + a - 0.08), rl.y);
    geos.push(GPX.ring(eye, X, Y, a, a, wa, { n: 30, radial: 10 }));
    g.add(GPX.metalMesh(ctx, geos));
    const d = dropBelow(ctx, spec, { a: a, wa: wa, linkLen: THREE.MathUtils.clamp(1.2 + spec.carat * 0.6, 1.3, 2.1) });
    d.group.position.copy(eye);
    g.add(d.group);
    GPX.swing(ctx, d.group, { amp: 0.075, phase: side * 2.1, speed: side ? 0.93 : 1 });
    g.userData.focus = new V3(0, eye.y + d.center.y, 0);
    g.userData.w = Math.max(top.width, d.gem.width);
    return g;
  }

  /* ---------- one hoop: slim, hinged at the top, a channel of small stones on the front face ---------- */
  function hoop(ctx, spec) {
    const g = new THREE.Group();
    const lod = ctx.lod;
    const T = 1.75, W = 1.95;                      // radial thickness and depth of the tube (mm)
    const Rm = 9 - T / 2;                         // ~18 mm outside diameter
    const gapH = 0.19;                            // half the opening at the top (radians)
    const a0 = Math.PI / 2 + gapH, a1 = Math.PI / 2 - gapH + Math.PI * 2;
    g.add(ctx.mesh(KIT.band({ inner: Rm - T / 2, width: W, thick: T, dome: 2.6, comfort: 2.6, arc: [a0, a1], segments: Math.round(220 * lod + 40), profile: Math.round(24 * lod + 8) })));
    const geos = [];
    if (spec.stone || spec.accent === 'diamond') {
      const stone = spec.stone || 'diamond';
      // calibrated 1.3 mm round brilliants (a real table and crown, not melee beads)
      const d = THREE.MathUtils.clamp(T * 0.75, 1.1, 1.4);
      const pr = GPX.probe(ctx, 'round', d, stone);
      const zf = W / 2 + 0.02;                    // girdle sits at the front face
      const s0 = a0 + 0.28, s1 = a1 - 0.28;
      const pitch = (d + 0.14) / Rm;
      const n = Math.floor((s1 - s0) / pitch);
      const st = (s1 - s0 - (n - 1) * pitch) / 2;
      const mats = [];
      for (let i = 0; i < n; i++) {
        const th = s0 + st + i * pitch;
        mats.push(GPX.frame(new V3(Math.cos(th) * Rm, Math.sin(th) * Rm, zf), new V3(-Math.sin(th), Math.cos(th), 0), Z));
      }
      g.add(ctx.gems({ stone: stone, width: d, matrices: mats, cut: 'round', bounces: 4 }));
      // channel walls: two fine rails that lap over the girdles, with rounded ends
      const rw = 0.17;
      [-1, 1].forEach(function (sg) {
        const pts = [];
        const R = Rm + sg * (d / 2 + rw * 0.55);
        const e0 = s0 + st - pitch * 0.55, e1 = s0 + st + (n - 1) * pitch + pitch * 0.55;
        const N = Math.round(90 * lod + 20);
        for (let i = 0; i <= N; i++) { const th = e0 + (e1 - e0) * i / N; pts.push(new V3(Math.cos(th) * R, Math.sin(th) * R, zf + pr.crown * 0.18)); }
        geos.push(KIT.tube(pts, rw, { radial: 10, segments: N }));
      });
    }
    // hinge knuckle at the left end of the opening, the ear wire crossing the gap into the other end
    const hk = GPX.lathe([[0, -W * 0.36], [0.5, -W * 0.36], [0.62, -W * 0.3], [0.62, W * 0.3], [0.5, W * 0.36], [0, W * 0.36]], 28);
    hk.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    hk.translate(Math.cos(a0 - 0.02) * Rm, Math.sin(a0 - 0.02) * Rm, 0);
    geos.push(hk);
    const wire = [];
    for (let i = 0; i <= 16; i++) {
      const th = a0 - 0.02 - (2 * gapH + 0.1) * i / 16;
      const r = Rm + 0.05 * Math.sin(i / 16 * Math.PI);
      wire.push(new V3(Math.cos(th) * r, Math.sin(th) * r, 0));
    }
    geos.push(KIT.tube(wire, 0.4, { radial: 12, segments: 24 }));
    g.add(GPX.metalMesh(ctx, geos));
    g.userData.focus = new V3(0, -Rm, W / 2);
    g.userData.w = Rm * 2 + T;
    return g;
  }

  /* ---------- the pair ---------- */
  /* (a generator: each earring of the pair is built in a step of its own) */
  function* pair(ctx, make, o) {
    const g = new THREE.Group();
    const back = make(1);
    yield;
    const front = make(0);
    const w = front.userData.w || 6;
    const sep = (o.sep || 1.25) * w;
    // the back earring: left, a little higher and further away, turned slightly away
    back.position.set(-sep / 2, o.lift || w * 0.18, -(o.depth || w * 0.7));
    back.rotation.set(0.02, o.yawBack == null ? 0.42 : o.yawBack, -0.04);
    front.position.set(sep / 2, 0, 0);
    front.rotation.set(-0.02, o.yawFront == null ? -0.16 : o.yawFront, 0.05);
    g.add(back); g.add(front);
    g.updateMatrixWorld(true);
    const focus = (front.userData.focus || new V3()).clone().applyMatrix4(front.matrix);
    return { object: g, view: Object.assign({ focus: focus }, o.view || {}) };
  }

  /* the pair is laid out almost facing the camera (each earring turned only a little), so the posts stay hidden
     behind the stones; the turntable for earrings is a gentle sway about the front (view.rock), never a full turn,
     and the studio opens facing the front */
  const STUD_VIEW = { tilt: 0.05, still: { tilt: 0.04, turn: -0.12 }, spinTilt: 0.04, rock: 0.55, front: true };
  KIT.register('earrings', 'stud', function* (spec, ctx) {
    return yield* pair(ctx, function () { return stud(ctx, spec); }, { sep: 1.55, depth: 4.5, lift: 0.9, yawBack: 0.16, yawFront: -0.06, view: STUD_VIEW });
  });
  KIT.register('earrings', 'drop', function* (spec, ctx) {
    return yield* pair(ctx, function (side) { return drop(ctx, spec, side); }, { sep: 1.75, depth: 5, lift: 1.8, yawBack: 0.16, yawFront: -0.05, view: { tilt: 0.04, still: { tilt: 0.03, turn: -0.12 }, spinTilt: 0.03, rock: 0.55, front: true } });
  });
  KIT.register('earrings', 'hoop', function* (spec, ctx) {
    return yield* pair(ctx, function () { return hoop(ctx, spec); }, { sep: 1.08, depth: 8, lift: 1.4, yawBack: 0.42, yawFront: -0.26, view: { tilt: 0.12, still: { tilt: 0.1, turn: -0.3 }, spinTilt: 0.1, rock: 0.55, front: true } });
  });
  KIT.register('earrings', function* (spec, ctx) {
    return yield* pair(ctx, function () { return stud(ctx, spec); }, { sep: 1.55, depth: 4.5, lift: 0.9, yawBack: 0.16, yawFront: -0.06, view: STUD_VIEW });
  });
}

/* ---- 58-pendants.js ---- */
/* ---- PENDANTS (gl-pieces). A fine cable chain falls in a soft V to the bail and runs back over an invisible
   neck, so the necklace reads as worn, in three dimensions, from every side of the turntable. The pendant hangs
   from the bail facing +Z. Frame: the bottom of the chain's V is the origin. ---- */
{
  const V3 = THREE.Vector3;
  const X = new V3(1, 0, 0), Y = new V3(0, 1, 0), Z = new V3(0, 0, 1);

  /* the necklace line: a closed loop through the bail, rising in a soft V and passing behind the neck */
  function chainPath(o) {
    const hw = o.hw, H = o.H, D = o.D;
    const half = [
      [0.23, 0.045, -0.01], [0.53, 0.18, -0.04], [0.8, 0.39, -0.11], [0.96, 0.6, -0.24],
      [1.0, 0.78, -0.43], [0.86, 0.92, -0.7], [0.5, 0.99, -0.92]
    ];
    const pts = [new V3(0, 0, 0)];
    half.forEach(function (q) { pts.push(new V3(q[0] * hw, q[1] * H, q[2] * D)); });
    pts.push(new V3(0, H * 1.005, -D));
    for (let i = half.length - 1; i >= 0; i--) { const q = half[i]; pts.push(new V3(-q[0] * hw, q[1] * H, q[2] * D)); }
    return pts;
  }

  /* bail: a rounded loop in the YZ plane that the chain passes through; returns its geometry and its bottom y */
  function bail(o) {
    const hh = o.hh || 1.2, hd = o.hd || 0.75, w = o.w || 0.27;
    const linkHalf = o.linkHalf || 0.42;
    const cy = linkHalf + w - hh;               // the inner top of the bail rests on the chain
    const geo = GPX.ring(new V3(0, cy, 0), Y, Z, hh, hd, function (t) {
      // a touch heavier at the bottom where it is soldered to the head
      const k = Math.cos(t * Math.PI * 2);
      return w * (1 + 0.16 * Math.max(0, -Math.sin(t * Math.PI * 2)) - 0.04 * k * k);
    }, { n: 44, sq: 0.82, radial: 14 });
    return { geo: geo, bottom: cy - hh - w, wire: w };
  }

  function rail(gem, cr, baseR) {
    const gh = gem.girdle / 2, pav = gem.pavilion - gh;
    return { y: -gh - pav * 0.52, r: Math.max(baseR + 0.15, (gem.width / 2) * 0.48 + cr * 1.05) };
  }

  /* a fine cable chain: links about 1 x 0.65 mm in a heavier wire (0.26 mm), about a sixth of a 0.7 ct stone */
  function necklace(ctx, spec, g, pendantH) {
    const s = 0.4;
    const pts = chainPath({ hw: 8 + pendantH * 0.14, H: 15 + pendantH * 0.55, D: 12 });
    const ch = GPX.chain(ctx, pts, { closed: true, scale: s, seed: 11, fine: true });
    g.add(ch.mesh);
    return { linkHalf: (0.5 + 0.32) * s };
  }

  KIT.register('pendant', 'solitaire', function (spec, ctx) {
    const g = new THREE.Group();
    const gem = ctx.gem({ cut: spec.cut, stone: spec.stone || 'diamond', carat: spec.carat });
    const cr = THREE.MathUtils.clamp(gem.width * 0.072, 0.34, 0.55);
    const baseR = Math.min(gem.width * 0.24, 0.9);
    const claws = gem.cut === 'pear' ? 5 : 4;
    const head = ctx.setting(gem, { claws: claws, clawR: cr, baseR: baseR, bottom: -(gem.pavilion + 0.5) });
    head.rotation.x = Math.PI / 2;               // table to the viewer; an elongated stone hangs lengthwise
    const nk = necklace(ctx, spec, g, gem.length + 4);
    const b = bail({ linkHalf: nk.linkHalf, hh: THREE.MathUtils.clamp(gem.width * 0.2, 1.0, 1.4), hd: 0.72, w: 0.27 });
    const rl = rail(gem, cr, baseR);
    // the top of the stone's outline (gem -Z after the turn is +Y)
    const topD = Math.abs(gem.outline(-Math.PI / 2).y);
    const gc = b.bottom - 0.12 - topD;
    head.position.set(0, gc, -rl.y);              // the gallery rail sits right under the bail (z = 0)
    g.add(head);
    const geos = [b.geo];
    // stem from the bail down onto the gallery rail
    geos.push(KIT.tube([new V3(0, b.bottom + b.wire * 0.6, 0), new V3(0, (b.bottom + gc + rl.r) / 2, -0.04), new V3(0, gc + rl.r - 0.1, 0)], function (t) { return 0.27 + 0.05 * t; }, { radial: 12, segments: 10 }));
    g.add(GPX.metalMesh(ctx, geos));
    const bottom = gc - gem.outline(Math.PI / 2).y - cr;
    return { object: g, view: pendantView(bottom, new V3(0, gc, -rl.y + gem.crown * 0.3)) };
  });

  /* the catalogue crop: the pendant with the lower chain, the two arms running out of the top of the picture. The
     stone and bail take a little under 40% of the frame's height. Turns (a gentle sway) about the bail's axis. */
  function pendantView(bottom, focus) {
    const h = Math.max(4, -bottom);
    const frame = new THREE.Box3(new V3(-60, bottom - 0.3, -4.5), new V3(60, bottom + h * 2.15, 4.5));
    return {
      tilt: 0.08, still: { tilt: 0.06, turn: -0.26 }, spinTilt: 0.06, rock: 0.5, front: true,
      frame: frame, pivot: new V3(0, bottom + h * 0.5, 0), focus: focus
    };
  }

  KIT.register('pendant', 'drop', function (spec, ctx) {
    const g = new THREE.Group();
    const topStone = spec.accent === 'diamond' ? 'diamond' : (spec.stone || 'diamond');
    const top = ctx.gem({ cut: 'round', stone: topStone, carat: THREE.MathUtils.clamp(spec.carat * 0.1, 0.06, 0.16) });
    const cr = THREE.MathUtils.clamp(top.width * 0.085, 0.3, 0.45);
    const baseR = Math.min(top.width * 0.26, 0.7);
    const head = ctx.setting(top, { claws: 4, clawR: cr, baseR: baseR, bottom: -(top.pavilion + 0.3) });
    head.rotation.x = Math.PI / 2;
    const probeLen = KIT.size(spec.cut, spec.carat).length;
    const nk = necklace(ctx, spec, g, probeLen + top.width + 6);
    const b = bail({ linkHalf: nk.linkHalf, hh: 1.05, hd: 0.68, w: 0.25 });
    const rl = rail(top, cr, baseR);
    const R = top.width / 2;
    const gc = b.bottom - 0.12 - R;
    head.position.set(0, gc, -rl.y);
    g.add(head);
    const geos = [b.geo];
    geos.push(KIT.tube([new V3(0, b.bottom + b.wire * 0.6, 0), new V3(0, (b.bottom + gc + rl.r) / 2, -0.03), new V3(0, gc + rl.r - 0.1, 0)], function (t) { return 0.25 + 0.04 * t; }, { radial: 12, segments: 10 }));
    // eye under the small stone, then the main stone on a fine link
    const a = 0.5, wa = 0.19;
    const eye = new V3(0, gc - (rl.r + a - 0.08), 0);
    geos.push(GPX.ring(eye, X, Y, a, a, wa, { n: 30, radial: 10 }));
    g.add(GPX.metalMesh(ctx, geos));
    const d = GPX.dropBelow(ctx, spec, { a: a, wa: wa, linkLen: 1.45 });
    d.group.position.copy(eye);
    g.add(d.group);
    GPX.swing(ctx, d.group, { amp: 0.06, phase: 0.7, speed: 0.9 });
    const fc = eye.clone().add(d.center);
    return { object: g, view: pendantView(eye.y - d.height - 0.2, fc) };
  });

  KIT.register('pendant', function (spec, ctx) { return KIT.builderFor({ type: 'pendant', style: 'solitaire' })(spec, ctx); });
}

/* ---- 60-stones.js ---- */
/* =====================================================================================================================
   gl-scenes-a · STONES (src/gl/60-74 belong to gl-scenes-a)
   Eight more faceted stones for the gem shader, and two stones that are not faceted at all: PEARL (a lustrous sphere
   with a soft orient overtone, on a polished peg) and OPAL (a cabochon whose play of colour shifts with the view).

   After this file:
     KIT.STONES      diamond ruby emerald sapphire + garnet amethyst aquamarine peridot citrine topaz tourmaline
                     tanzanite (faceted: optical constants for the gem shader) + pearl, opal ({ kind: 'pearl'|'opal' })
                     every entry also has hue: '#rrggbb', a representative colour (light pools, swatches)
     KIT.STONE_LIST  every stone name, in display order        KIT.BIRTHSTONES  twelve names, January first
     KIT.spec(s)     keeps any stone that KIT.STONES knows (the base only knew four)
     ctx.gem({ stone: 'pearl' })           a sphere (diameter from carat: 1 ct ~ 7.2 mm, or width) with the same gem
                                           interface as a faceted stone (outline, surfaceY, bottomY, prongs, crown...)
     ctx.gem({ stone: 'opal', cut })       a cabochon on the cut's outline (round, oval, pear, cushion, emerald)
     ctx.gems({ stone: 'pearl' | 'opal' }) instanced spheres / cabochons (pave, eternity, tennis lines)
     ctx.setting(pearlGem, o)              a polished peg setting (a cup that hugs the pearl and a post) instead of
                                           claws; o.bottom / o.low work as for claws. Opals take claws or a bezel.
   The ctx hooks are installed through KIT.builderFor, so every builder (rings, bracelets, earrings, pendants) gets
   them without changes. Shared helpers for the other gl-scenes-a files live on KIT._sa (private to 60-74).
   ===================================================================================================================== */
{
  try {
    const SA = KIT._sa || (KIT._sa = {});
    const DEG = Math.PI / 180;
    const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    SA.clamp = clamp;

    /* ---------------- 1. the faceted stones ----------------
       ior: refractive index; rgb: per-channel index (the spread is the stone's dispersion, about 1.6x its B-G value,
       as the engine's ruby); absorb: per-millimetre absorption of the body colour (a stone's colour deepens with the
       path through it); body: the faint colour of the body itself; edge/gate/lightK/edgeTint/gain: see 16-materials. */
    const ADD = {
      garnet:     { name: 'Garnet',     ior: 1.76,  rgb: [1.747, 1.760, 1.785], absorb: [0.5, 4.6, 3.0], gain: 1.2, edge: 0.04,  gate: 1, lightK: 0.9,  edgeTint: [0.7, 0.18, 0.22], body: [0.04, 0.0, 0.006], surf: 1.0, hue: '#6E0A19' },
      amethyst:   { name: 'Amethyst',   ior: 1.547, rgb: [1.540, 1.547, 1.561], absorb: [0.30, 1.6, 0.34],  gain: 1.3,  edge: 0.045, gate: 1, lightK: 0.88, edgeTint: [0.78, 0.5, 1.0],  body: [0.05, 0.0, 0.08],   surf: 1.0, hue: '#7B3FA6' },
      aquamarine: { name: 'Aquamarine', ior: 1.58,  rgb: [1.572, 1.580, 1.594], absorb: [0.11, 0.034, 0.02], gain: 1.08, edge: 0.05,  gate: 1, lightK: 0.92, edgeTint: [0.62, 0.86, 1.0], body: [0.0, 0.012, 0.022],  surf: 1.0, hue: '#A8D8E2' },
      peridot:    { name: 'Peridot',    ior: 1.67,  rgb: [1.659, 1.670, 1.691], absorb: [0.2, 0.05, 1.15],  gain: 1.18, edge: 0.045, gate: 1, lightK: 0.88, edgeTint: [0.72, 1.0, 0.35], body: [0.02, 0.04, 0.0],   surf: 1.0, hue: '#A4C23A' },
      citrine:    { name: 'Citrine',    ior: 1.547, rgb: [1.540, 1.547, 1.561], absorb: [0.012, 0.1, 1.0], gain: 1.25, edge: 0.045, gate: 1, lightK: 0.9,  edgeTint: [1.0, 0.88, 0.45], body: [0.05, 0.03, 0.0],  surf: 1.0, hue: '#E9B53A' },
      topaz:      { name: 'Topaz',      ior: 1.62,  rgb: [1.612, 1.620, 1.634], absorb: [0.05, 0.38, 0.9], gain: 1.25, edge: 0.045, gate: 1, lightK: 0.9,  edgeTint: [1.0, 0.6, 0.55], body: [0.06, 0.018, 0.008], surf: 1.0, hue: '#E8904A' },
      tourmaline: { name: 'Tourmaline', ior: 1.63,  rgb: [1.620, 1.630, 1.648], absorb: [0.04, 0.62, 0.26], gain: 1.28, edge: 0.045, gate: 1, lightK: 0.9,  edgeTint: [1.0, 0.5, 0.72],  body: [0.07, 0.0, 0.022],  surf: 1.0, hue: '#D9567F' },
      tanzanite:  { name: 'Tanzanite',  ior: 1.695, rgb: [1.685, 1.695, 1.715], absorb: [0.52, 1.2, 0.07],  gain: 1.22, edge: 0.045, gate: 1, lightK: 0.9,  edgeTint: [0.56, 0.5, 1.0],  body: [0.012, 0.0, 0.1],   surf: 1.0, hue: '#5E4FC0' },
      /* not faceted: these constants are only a graceful fallback if the hooks below are ever bypassed */
      pearl:      { name: 'Pearl', kind: 'pearl', ior: 1.53, rgb: [1.53, 1.53, 1.53], absorb: [0.55, 0.56, 0.6], gain: 0.55, edge: 0.0, gate: 0, lightK: 1, edgeTint: [1, 1, 1], body: [0.42, 0.4, 0.38], surf: 0.7, hue: '#EFE6DC' },
      opal:       { name: 'Opal',  kind: 'opal',  ior: 1.45, rgb: [1.44, 1.45, 1.46], absorb: [0.45, 0.42, 0.38], gain: 0.7, edge: 0.0, gate: 0, lightK: 1, edgeTint: [1, 1, 1], body: [0.3, 0.32, 0.36], surf: 0.8, hue: '#9FD3D0' }
    };
    Object.keys(ADD).forEach(function (k) { if (!KIT.STONES[k]) KIT.STONES[k] = ADD[k]; });
    KIT.STONES.pearl.kind = 'pearl';
    KIT.STONES.opal.kind = 'opal';
    const HUES = { diamond: '#E9EEF4', ruby: '#A50F24', emerald: '#127A4C', sapphire: '#1F3D9C' };
    Object.keys(HUES).forEach(function (k) { if (KIT.STONES[k] && !KIT.STONES[k].hue) KIT.STONES[k].hue = HUES[k]; });
    KIT.STONE_LIST = ['diamond', 'ruby', 'emerald', 'sapphire', 'garnet', 'amethyst', 'aquamarine', 'peridot', 'citrine', 'topaz', 'tourmaline', 'tanzanite', 'pearl', 'opal']
      .filter(function (k) { return !!KIT.STONES[k]; });
    KIT.BIRTHSTONES = ['garnet', 'amethyst', 'aquamarine', 'diamond', 'emerald', 'pearl', 'ruby', 'peridot', 'sapphire', 'opal', 'topaz', 'tanzanite'];
    SA.kindOf = function (stone) { const s = KIT.STONES[stone]; return s && s.kind ? s.kind : 'faceted'; };

    /* ---------------- 2. specs keep the new stones ---------------- */
    const spec0 = KIT.spec;
    if (typeof spec0 === 'function' && !spec0.__auStones) {
      KIT.spec = function (s) {
        const o = spec0.apply(KIT, arguments);
        if (s && typeof s.stone === 'string' && KIT.STONES[s.stone] && o && o.stone !== s.stone) o.stone = s.stone;
        return o;
      };
      KIT.spec.__auStones = true;
    }

    /* ---------------- 3. shared GLSL: value noise and a few helpers ---------------- */
    SA.NOISE = `
float auSaHash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float auSaNoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(auSaHash(i), auSaHash(i + vec3(1,0,0)), f.x), mix(auSaHash(i + vec3(0,1,0)), auSaHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(auSaHash(i + vec3(0,0,1)), auSaHash(i + vec3(1,0,1)), f.x), mix(auSaHash(i + vec3(0,1,1)), auSaHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
vec3 auSaHash3(vec3 p){
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453);
}`;

    /* a soft ceiling on what a polished skin mirrors: the lightbox's small lamps are far brighter than its softboxes,
       and on a dome they read as a dust of white dots; under the ceiling they melt into the windows */
    SA.CAP_GLSL = `
vec3 auSaCap(vec3 c, float cap) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return l > cap * 0.5 ? c * (cap * 0.5 + cap * 0.5 * (1.0 - exp(-(l - cap * 0.5) / (cap * 0.5)))) / l : c;
}`;

    /* ---------------- 4. outlines and shapes (unit width 1 along X, length along Z, origin at the girdle centre) ---- */
    /* (these are cabochon outlines: an oval cabochon is calibrated 10 x 8, so it is shorter than a faceted oval) */
    const OUTLINE = {
      round:   { L: 1,     f: function (t) { return [0.5 * Math.cos(t), 0.5 * Math.sin(t)]; } },
      oval:    { L: 1.25,  f: function (t) { return [0.5 * Math.cos(t), 0.625 * Math.sin(t)]; } },
      cushion: { L: 1.045, se: 3.0 },
      emerald: { L: 1.4,   se: 5.2 },
      pear:    { L: 1.55 }
    };
    /* a closed polygon of the outline, CCW in (x, z), N points */
    const polyCache = {};
    function outlinePoly(cut) {
      if (polyCache[cut]) return polyCache[cut];
      const d = OUTLINE[cut] || OUTLINE.round, N = 240, pts = [];
      if (cut === 'pear') {
        // the engine's teardrop: x = sin t * sin(t/2), z = cos t (tip at +Z), scaled to width 1 and length 1.55 and
        // shifted so the centre sits a little toward the round end
        const raw = [];
        for (let i = 0; i < N; i++) { const t = i / N * KIT.TAU; raw.push([Math.sin(t) * Math.sin(t / 2), Math.cos(t)]); }
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
        raw.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
        const sx = 1 / (x1 - x0), sz = d.L / (z1 - z0), cz = (z0 + z1) / 2, sh = 0.07 * d.L;
        raw.forEach(function (p) { pts.push({ x: (p[0] - (x0 + x1) / 2) * sx, z: (p[1] - cz) * sz + sh }); });
      } else if (d.se) {
        const a = 0.5, b = 0.5 * d.L, n = d.se;
        for (let i = 0; i < N; i++) {
          const t = i / N * KIT.TAU, c = Math.cos(t), s = Math.sin(t);
          const r = Math.pow(Math.pow(Math.abs(c / a), n) + Math.pow(Math.abs(s / b), n), -1 / n);
          pts.push({ x: r * c, z: r * s });
        }
      } else {
        for (let i = 0; i < N; i++) { const q = d.f(i / N * KIT.TAU); pts.push({ x: q[0], z: q[1] }); }
      }
      // make it CCW in (x, z)
      let area = 0;
      for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; area += p.x * q.z - q.x * p.z; }
      if (area < 0) pts.reverse();
      polyCache[cut] = pts;
      return pts;
    }
    /* distance from the origin to the polygon along azimuth az (from +X toward +Z) */
    function polyRadius(poly, az) {
      const dx = Math.cos(az), dz = Math.sin(az);
      let best = null;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const ex = b.x - a.x, ez = b.z - a.z;
        const den = dx * ez - dz * ex;
        if (Math.abs(den) < 1e-12) continue;
        const t = (a.x * ez - a.z * ex) / den, u = (a.x * dz - a.z * dx) / den;
        if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9 && (best == null || t < best)) best = t;
      }
      return best || 0.5;
    }
    SA.outlinePoly = outlinePoly;
    SA.polyRadius = polyRadius;

    /* flip a range of triangles if they face inward (expected: outward direction at a sample triangle) */
    function orientRange(idx, pos, from, to, expect) {
      const a = idx[from] * 3, b = idx[from + 1] * 3, c = idx[from + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * expect[0] + ny * expect[1] + nz * expect[2] >= 0) return;
      for (let i = from; i < to; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    }

    const shapeCache = {};
    /* a cabochon: a high polished dome over the outline, a fine girdle, a gently domed back */
    function cabShape(cut, detail) {
      cut = OUTLINE[cut] ? cut : 'round';
      const hi = detail !== 'low';
      const key = 'cab|' + cut + '|' + (hi ? 1 : 0);
      if (shapeCache[key]) return shapeCache[key];
      const poly = outlinePoly(cut);
      const N = hi ? 160 : 48, NR = hi ? 26 : 9, NB = hi ? 6 : 3;
      /* a calibrated cabochon: the whole stone (dome, girdle and back) is about 0.35 of its width tall, and the dome is a
         spherical cap that meets the girdle at about 60 degrees (an ellipse stands vertical at the edge and the stone
         reads as a ball sunk in the setting) */
      const H = 0.27, gh = 0.015, B = 0.045, RC = 1.12, RC0 = Math.sqrt(RC * RC - 1);
      const ring = [];
      for (let i = 0; i < N; i++) { const az = i / N * KIT.TAU, r = polyRadius(poly, az); ring.push([Math.cos(az) * r, Math.sin(az) * r]); }
      const dome = function (rho) { return gh + H * (Math.sqrt(Math.max(0, RC * RC - rho * rho)) - RC0) / (RC - RC0); };
      const back = function (rho) { return -gh - B * (1 - rho * rho); };
      const pos = [], idx = [];
      const vtx = function (x, y, z) { pos.push(x, y, z); return pos.length / 3 - 1; };
      /* dome: a pole and rings, denser toward the steep edge */
      let s0 = idx.length;
      const pole = vtx(0, dome(0), 0);
      const rings = [];
      for (let j = 1; j <= NR; j++) {
        const rho = Math.sin(j / NR * Math.PI / 2), y = dome(rho), r = [];
        for (let i = 0; i < N; i++) r.push(vtx(ring[i][0] * rho, y, ring[i][1] * rho));
        rings.push(r);
      }
      for (let i = 0; i < N; i++) idx.push(pole, rings[0][i], rings[0][(i + 1) % N]);
      for (let j = 0; j < NR - 1; j++) {
        for (let i = 0; i < N; i++) {
          const a = rings[j][i], b = rings[j][(i + 1) % N], c = rings[j + 1][(i + 1) % N], d = rings[j + 1][i];
          idx.push(a, d, b, b, d, c);
        }
      }
      orientRange(idx, pos, s0, idx.length, [0, 1, 0]);
      /* girdle band (own vertices, so the edge stays crisp) */
      s0 = idx.length;
      const gt = [], gb = [];
      for (let i = 0; i < N; i++) { gt.push(vtx(ring[i][0], gh, ring[i][1])); gb.push(vtx(ring[i][0], -gh, ring[i][1])); }
      for (let i = 0; i < N; i++) { const i2 = (i + 1) % N; idx.push(gt[i], gb[i], gt[i2], gt[i2], gb[i], gb[i2]); }
      orientRange(idx, pos, s0, idx.length, [ring[0][0], 0, ring[0][1]]);
      /* back */
      s0 = idx.length;
      const brs = [];
      for (let j = NB; j >= 1; j--) {
        const rho = j / NB, y = back(rho), r = [];
        for (let i = 0; i < N; i++) r.push(vtx(ring[i][0] * rho, y, ring[i][1] * rho));
        brs.push(r);
      }
      const bp = vtx(0, back(0), 0);
      for (let j = 0; j < NB - 1; j++) {
        for (let i = 0; i < N; i++) {
          const a = brs[j][i], b = brs[j][(i + 1) % N], c = brs[j + 1][(i + 1) % N], d = brs[j + 1][i];
          idx.push(a, d, b, b, d, c);
        }
      }
      for (let i = 0; i < N; i++) idx.push(bp, brs[NB - 1][(i + 1) % N], brs[NB - 1][i]);
      orientRange(idx, pos, s0, idx.length, [0, -1, 0]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      geo.userData.shared = true;
      const bb = geo.boundingBox;
      const shape = {
        kind: 'opal', cut: cut, geometry: geo,
        length: bb.max.z - bb.min.z, crown: bb.max.y, pavilion: -bb.min.y, girdle: 2 * gh,
        outline: function (az) { const r = polyRadius(poly, az); return { x: Math.cos(az) * r, z: Math.sin(az) * r }; },
        rho: function (x, z) { const r = Math.hypot(x, z); return r < 1e-6 ? 0 : r / polyRadius(poly, Math.atan2(z, x)); },
        surfaceY: function (x, z) { return dome(Math.min(1, shape.rho(x, z))); },
        bottomY: function (x, z) { return back(Math.min(1, shape.rho(x, z))); }
      };
      shapeCache[key] = shape;
      return shape;
    }
    /* a pearl: a sphere of diameter 1 */
    function pearlShape(detail) {
      const hi = detail !== 'low';
      const key = 'pearl|' + (hi ? 1 : 0);
      if (shapeCache[key]) return shapeCache[key];
      const geo = new THREE.SphereGeometry(0.5, hi ? 72 : 24, hi ? 52 : 16);
      geo.userData.shared = true;
      const shape = {
        kind: 'pearl', cut: 'round', geometry: geo, length: 1, crown: 0.5, pavilion: 0.5, girdle: 0,
        outline: function (az) { return { x: 0.5 * Math.cos(az), z: 0.5 * Math.sin(az) }; },
        surfaceY: function (x, z) { return Math.sqrt(Math.max(0, 0.25 - x * x - z * z)); },
        bottomY: function (x, z) { return -Math.sqrt(Math.max(0, 0.25 - x * x - z * z)); }
      };
      shapeCache[key] = shape;
      return shape;
    }
    SA.cabShape = cabShape;
    SA.pearlShape = pearlShape;

    SA.prongs = function (cut, n) {
      const d = function (a) { return a.map(function (x) { return x * DEG; }); };
      if (cut === 'emerald') return d([50, 130, 230, 310]);
      if (cut === 'pear') return n >= 5 ? d([90, 18, 162, 228, 312]) : d([90, 205, 335]);
      if (cut === 'oval') return n >= 6 ? d([0, 58, 122, 180, 238, 302]) : d([58, 122, 238, 302]);
      if (cut === 'cushion') return d([45, 135, 225, 315]);
      if (n >= 6) return d([0, 60, 120, 180, 240, 300]);
      return d([45, 135, 225, 315]);
    };

    /* ---------------- 5. materials ----------------
       Both are MeshPhysicalMaterial, lit by the stage's environment like the metals, with a few lines of shader added.
       Their adjustable values live in material.userData.au (uniform objects), shared with the compiled program. */
    function inject(mat, key, vertex, fragment) {
      mat.onBeforeCompile = function (sh) {
        Object.assign(sh.uniforms, mat.userData.au);
        let vs = sh.vertexShader, fs = sh.fragmentShader;
        vertex.forEach(function (r) { vs = vs.replace(r[0], r[1]); });
        fragment.forEach(function (r) { fs = fs.replace(r[0], r[1]); });
        sh.vertexShader = vs; sh.fragmentShader = fs;
      };
      mat.customProgramCacheKey = function () { return key; };
    }
    const OBJ_VERTEX = [
      ['#include <common>', '#include <common>\nvarying vec3 vAuObj;\nvarying vec3 vAuCam;\nvarying vec3 vAuNrm;'],
      ['#include <begin_vertex>', `#include <begin_vertex>
vAuObj = position;
vAuNrm = objectNormal;
{
  mat4 auM = modelMatrix;
  #ifdef USE_INSTANCING
    auM = modelMatrix * instanceMatrix;
  #endif
  vAuCam = (inverse(auM) * vec4(cameraPosition, 1.0)).xyz;
}`]
    ];

    /* the opal also needs its object axes in view space (to light each colour patch from its own direction) */
    const OPAL_VERTEX = [
      ['#include <common>', '#include <common>\nvarying vec3 vAuObj;\nvarying vec3 vAuCam;\nvarying vec3 vAuNrm;\nvarying vec3 vAuAx;\nvarying vec3 vAuAy;\nvarying vec3 vAuAz;'],
      ['#include <begin_vertex>', `#include <begin_vertex>
vAuObj = position;
vAuNrm = objectNormal;
{
  mat4 auM = modelMatrix;
  #ifdef USE_INSTANCING
    auM = modelMatrix * instanceMatrix;
  #endif
  vAuCam = (inverse(auM) * vec4(cameraPosition, 1.0)).xyz;
  mat3 auVM = mat3(viewMatrix) * mat3(auM);
  vAuAx = auVM[0]; vAuAy = auVM[1]; vAuAz = auVM[2];
}`]
    ];

    /* PEARL: nacre is thin layers of aragonite, each a fraction of a wavelength thick. What makes a pearl read as a
       pearl and not as a painted ball is its LUSTRE (a near-mirror skin: the softbox shows as a crisp window), its
       ORIENT (thin-film interference: rose and green at grazing angles, iridescence over the clear skin) and the soft,
       deep body under the skin (light enters the nacre and comes back out a little further on: a wrapped diffuse, so
       the shading turns softly and never chalky). */
    SA.PEARL_TONES = {
      white:  { body: '#E4DAD3', o1: '#F2C6D0', o2: '#C6E2D2' },
      cream:  { body: '#E2D1B6', o1: '#F0C4B8', o2: '#D2E0C2' },
      golden: { body: '#D3AE6C', o1: '#EBC392', o2: '#D2D69E' }
    };
    SA.pearlMaterial = function (o) {
      o = o || {};
      const tone = SA.PEARL_TONES[o.tone] || SA.PEARL_TONES.white;
      const m = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(tone.body), metalness: 0, roughness: 0.3,
        clearcoat: 1, clearcoatRoughness: 0.05,
        sheen: 0.25, sheenRoughness: 0.5, sheenColor: new THREE.Color('#F4D9DE'),
        iridescence: 0.7, iridescenceIOR: 1.5, iridescenceThicknessRange: [250, 450],
        specularIntensity: 0.6,
        envMapIntensity: 1
      });
      m.name = 'au-pearl';
      m.userData.auKind = 'pearl';
      m.userData.au = {
        uAuOver1: { value: new THREE.Color(tone.o1) },
        uAuOver2: { value: new THREE.Color(tone.o2) },
        uAuOrient: { value: 0.6 },
        uAuWrap: { value: 0.3 },
        uAuBlem: { value: 0 },
        uAuSeed: { value: o.seed || 0 }
      };
      inject(m, 'au-pearl-v3', OBJ_VERTEX, [
        ['#include <common>', '#include <common>\nvarying vec3 vAuObj;\nvarying vec3 vAuCam;\nvarying vec3 vAuNrm;\nuniform vec3 uAuOver1;\nuniform vec3 uAuOver2;\nuniform float uAuOrient;\nuniform float uAuWrap;\nuniform float uAuBlem;\nuniform float uAuSeed;\n' + SA.NOISE + SA.CAP_GLSL],
        ['#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  vec3 auP = vAuObj * 2.0 + uAuSeed;
  // nacre is laid down in fine terraces: the faintest unevenness in the skin keeps the window reflection organic
  // (it wavers a little across the surface, as on a real pearl) without ever reading as texture
  vec3 auB = vec3(auSaNoise(auP * 6.0), auSaNoise(auP * 6.0 + 7.1), auSaNoise(auP * 6.0 + 13.7)) - 0.5;
  normal = normalize(normal + auB * 0.018);
  #ifdef USE_CLEARCOAT
    clearcoatNormal = normalize(clearcoatNormal + auB * 0.012);
  #endif
  float n1 = auSaNoise(auP * 2.2);
  // a slow, barely-there cloudiness in the body
  diffuseColor.rgb *= 0.975 + 0.05 * n1;
  // a lower grade: a duller, faintly mottled skin (no specks: a pearl's flaws read as a loss of lustre)
  diffuseColor.rgb *= 1.0 - uAuBlem * 0.08 * smoothstep(0.35, 0.8, auSaNoise(auP * 5.0 + 11.0));
}`],
        // the lustre keeps the softboxes as crisp windows, without the lamps' pin points
        ['#include <lights_fragment_end>', `#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
  #ifdef USE_CLEARCOAT
    clearcoatRadiance = auSaCap(clearcoatRadiance, 2.6);
  #endif
  radiance = auSaCap(radiance, 1.6);
#endif
#include <lights_fragment_end>`],
        ['#include <transmission_fragment>', `{
  float auNV = clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0);
  float auRim = pow(1.0 - auNV, 2.0);
  vec3 auOv = mix(uAuOver1, uAuOver2, smoothstep(0.3, 0.7, auSaNoise(vAuObj * 2.6 + uAuSeed + 2.0)));
  #ifdef USE_ENVMAP
    // the light that enters the nacre comes back out a little further on: a wrapped diffuse (the terminator turns
    // softly) carrying a faint orient, and a little light through the rim from behind
    vec3 auIrrN = getIBLIrradiance(geometryNormal);
    vec3 auIrrB = getIBLIrradiance(normalize(geometryNormal + geometryViewDir * 0.6));
    totalDiffuse = mix(totalDiffuse, diffuseColor.rgb * mix(auIrrN, auIrrB, 0.5) * RECIPROCAL_PI * mix(vec3(1.0), auOv, 0.35), uAuWrap);
    totalDiffuse += diffuseColor.rgb * getIBLIrradiance(-geometryNormal) * RECIPROCAL_PI * 0.06 * auRim;
  #endif
  // orient toward the rim: rose and green overtones over the body and in the lustre
  totalDiffuse *= mix(vec3(1.0), auOv * 1.06, clamp(auRim * 1.2, 0.0, 1.0) * uAuOrient);
  totalSpecular *= mix(vec3(1.0), auOv * 1.08, clamp(0.2 + 0.7 * auRim, 0.0, 1.0) * uAuOrient);
}
#include <transmission_fragment>`]
      ]);
      return m;
    };

    /* OPAL: a translucent blue-grey body with depth, and inside it patches of diffracted colour. Each patch is a small
       domain of ordered silica spheres whose planes face one way: light that leaves it toward the eye is the one colour
       whose wavelength fits the spacing at that angle (Bragg: lambda = lambda0 * cos theta). So a patch shows a pure,
       saturated colour, the colour slides red -> green -> blue as the stone turns, then the patch goes dark (its colour
       has left the visible range), and it only shines at all when the mirror of the view off its planes finds light in
       the room. Three layers at different depths, seen along the refracted view, give the colour parallax: it sits
       inside the stone, under a polished dome with one crisp highlight. */
    SA.OPAL_GLSL = `
/* Zucconi's spectral fit: w 0 = 400 nm (violet) ... 1 = 700 nm (red) */
vec3 auSaSpec(float w) {
  vec3 x = vec3(3.54541723, 2.86670055, 2.29421995) * (w - vec3(0.69548916, 0.49416934, 0.28269708));
  return clamp(1.0 - x * x - vec3(0.02320775, 0.15936245, 0.53520021), 0.0, 1.0);
}
/* one patch, lit: Q the point in cell space, gv its lattice normal in view space. A patch flashes: it returns light
   only while the half-vector between the eye and a light lies close to its lattice normal, so as the stone turns the
   patches switch on and off one by one (and slide red -> green -> blue on the way), a scatter of small flashes rather
   than a fixed map of colours */
vec3 auSaPatch(vec3 id, vec3 Q, mat3 toView, vec3 Vv, vec3 Kv, float sat) {
  vec3 h1 = auSaHash3(id + 3.7), h2 = auSaHash3(id + 9.1);
  vec3 g = normalize(h1 * 2.0 - 1.0);
  // a slightly bent lattice: the colour rolls across a patch in soft bands instead of filling it flat
  vec3 bq = Q * 0.9 + h2 * 5.0;
  g = normalize(g + 0.32 * (vec3(auSaNoise(bq), auSaNoise(bq + 5.2), auSaNoise(bq + 9.4)) - 0.5));
  vec3 gv = normalize(toView * g);
  float c = dot(gv, Vv);
  if (c < 0.0) { gv = -gv; c = -c; }
  // the patch's spacing as the wavelength it returns straight on (most patches green-red, a few deep red, rare blue)
  float lam = (480.0 + 520.0 * h2.x * h2.x) * c;
  float w = (lam - 400.0) / 300.0;
  float vis = smoothstep(-0.04, 0.06, w) * (1.0 - smoothstep(0.9, 1.04, w));
  vec3 col = auSaSpec(w);
  col = mix(vec3(dot(col, vec3(0.3333))), col, sat);
  // the light it can return: the room in the mirror direction of its planes (a narrow lobe: a softbox there, or
  // nothing), and the key light when the half-vector between the eye and the key meets its lattice normal
  float L = 0.2;
  #ifdef USE_ENVMAP
    vec3 e = getIBLRadiance(Vv, gv, 0.11);
    L = dot(e, vec3(0.2126, 0.7152, 0.0722));
  #endif
  float hk = max(dot(gv, normalize(Vv + Kv)), 0.0);
  L = L * 0.75 + 2.4 * pow(hk, 90.0);
  float grain = 0.7 + 0.3 * auSaNoise(Q * 7.0 + h2 * 9.0);
  return col * vis * L * grain * (0.5 + 0.5 * h2.y);
}
vec3 auSaPoc(vec3 P, vec3 T, float scale, float seed, mat3 toView, vec3 Vv, vec3 Kv, float sat) {
  vec3 col = vec3(0.0);
  for (int layer = 0; layer < 3; layer++) {
    float lf = float(layer);
    // under the clear skin: each layer lies further along the refracted view (the colour sits below the surface and
    // slides against it as the stone turns), a little larger and dimmer the deeper it is; the cells are small
    // (about three times as many as a coarse 'harlequin' map)
    vec3 Q = (P + T * (0.045 + 0.07 * lf)) * scale * 1.8 * (1.0 - 0.14 * lf) * vec3(1.0, 1.15, 0.9) + seed + lf * 17.0;
    // the patches' outlines are organic (two octaves of warp: no straight cell edges)
    vec3 wq = Q * 0.42;
    Q += 1.6 * (vec3(auSaNoise(wq), auSaNoise(wq + 11.0), auSaNoise(wq + 23.0)) - 0.5)
       + 0.6 * (vec3(auSaNoise(wq * 2.7 + 5.0), auSaNoise(wq * 2.7 + 7.0), auSaNoise(wq * 2.7 + 13.0)) - 0.5);
    vec3 ip = floor(Q), fp = fract(Q);
    float f1 = 9.0, f2 = 9.0;
    vec3 id1 = ip, id2 = ip;
    for (int k = 0; k < 27; k++) {
      vec3 o = vec3(float(k % 3), float((k / 3) % 3), float(k / 9)) - 1.0;
      vec3 h = auSaHash3(ip + o);
      vec3 d = o + h * 0.8 + 0.1 - fp;
      float dd = dot(d, d);
      if (dd < f1) { f2 = f1; id2 = id1; f1 = dd; id1 = ip + o; } else if (dd < f2) { f2 = dd; id2 = ip + o; }
    }
    // patches meet along soft borders (never drawn), and each fades a little toward its edge (a domain, not a decal)
    vec3 c1 = auSaPatch(id1, Q, toView, Vv, Kv, sat), c2 = auSaPatch(id2, Q, toView, Vv, Kv, sat);
    float gap = sqrt(f2) - sqrt(f1);
    float b = smoothstep(0.0, 0.16, gap);
    col += mix(0.5 * (c1 + c2), c1, b) * (0.72 + 0.28 * smoothstep(0.0, 0.35, gap)) * (layer == 0 ? 1.0 : layer == 1 ? 0.62 : 0.4);
  }
  return col;
}`;
    SA.OPAL_TONES = {
      white: { deep: '#7A8A9B', milk: '#DCE2E7' },
      black: { deep: '#0C0E14', milk: '#262C37' }
    };
    SA.opalMaterial = function (o) {
      o = o || {};
      const m = new THREE.MeshPhysicalMaterial({
        // a clear, glassy skin over the colour (a crisp mirror of the softboxes), a soft body under it
        color: new THREE.Color('#ffffff'), metalness: 0, roughness: 0.45,
        clearcoat: 1, clearcoatRoughness: 0.035,
        specularIntensity: 0.2,
        envMapIntensity: 1
      });
      m.name = 'au-opal';
      m.userData.auKind = 'opal';
      const key = typeof G_KEY_DIRS !== 'undefined' && G_KEY_DIRS && G_KEY_DIRS[0] ? G_KEY_DIRS[0].clone() : new THREE.Vector3(-0.55, 0.62, 0.56).normalize();
      m.userData.au = {
        uAuFire: { value: o.fire != null ? o.fire : 1.0 },
        uAuScale: { value: o.scale || 6.5 },
        uAuSeed: { value: o.seed || 0 },
        uAuDark: { value: o.dark || 0 },
        uAuSat: { value: o.sat != null ? o.sat : 0.9 },
        uAuDeep: { value: new THREE.Color(SA.OPAL_TONES.white.deep) },
        uAuMilkC: { value: new THREE.Color(SA.OPAL_TONES.white.milk) },
        uAuKey: { value: key },
        uAuHi: { value: 1 }
      };
      SA.opalTone(m, o.dark || 0);
      inject(m, 'au-opal-v3', OPAL_VERTEX, [
        ['#include <common>', '#include <common>\nvarying vec3 vAuObj;\nvarying vec3 vAuCam;\nvarying vec3 vAuNrm;\nvarying vec3 vAuAx;\nvarying vec3 vAuAy;\nvarying vec3 vAuAz;\n' +
          'uniform float uAuFire;\nuniform float uAuScale;\nuniform float uAuSeed;\nuniform float uAuDark;\nuniform float uAuSat;\nuniform vec3 uAuDeep;\nuniform vec3 uAuMilkC;\nuniform vec3 uAuKey;\nuniform float uAuHi;\n' + SA.NOISE + SA.CAP_GLSL],
        // (after the lighting functions: a patch reads the room through getIBLRadiance)
        ['#include <clipping_planes_pars_fragment>', '#include <clipping_planes_pars_fragment>\n' + SA.OPAL_GLSL],
        // the dome mirrors the room softly and evenly (the lightbox's small lamps would read as a dust of white dots on
        // it); its one crisp highlight is drawn below
        ['#include <lights_fragment_end>', `#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
  #ifdef USE_CLEARCOAT
    clearcoatRadiance = auSaCap(clearcoatRadiance, 1.5);
  #endif
  radiance = auSaCap(radiance, 0.6);
#endif
#include <lights_fragment_end>`],
        ['#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  // the body: translucent and blue-grey where the eye looks deep into it, milkier toward the rim (a longer path through
  // the scattering skin), with a slow, barely-there cloudiness
  float auNV = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
  float bn = auSaNoise(vAuObj * 3.2 + uAuSeed);
  diffuseColor.rgb = mix(uAuDeep, uAuMilkC, clamp(pow(1.0 - auNV, 1.5) * 0.9 + 0.12 * (bn - 0.5), 0.0, 1.0));
}`],
        ['#include <transmission_fragment>', `{
  vec3 auV = normalize(vAuObj - vAuCam);
  vec3 auN = normalize(vAuNrm);
  vec3 auT = refract(auV, auN, 1.0 / 1.45);
  if (dot(auT, auT) < 0.5) auT = auV;
  mat3 auToV = mat3(normalize(vAuAx), normalize(vAuAy), normalize(vAuAz));
  vec3 auKeyV = normalize((viewMatrix * vec4(uAuKey, 0.0)).xyz);
  vec3 auPoc = auSaPoc(vAuObj, auT, uAuScale, uAuSeed, auToV, geometryViewDir, auKeyV, uAuSat);
  // seen through the clear skin: the colour lies under it, a little veiled where the skin mirrors the room (the
  // Fresnel of the dome), brightest looking straight in; over a dark body it glows brighter (black opal)
  float auNVs = clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0);
  float auSkin = 0.04 + 0.96 * pow(1.0 - auNVs, 5.0);
  totalEmissiveRadiance += auPoc * uAuFire * mix(0.85, 1.25, uAuDark) * (1.0 - auSkin) * (0.75 + 0.25 * auNVs);
  // the body has depth: a little of the room's light seems to come from inside it
  #ifdef USE_ENVMAP
    totalEmissiveRadiance += uAuDeep * getIBLIrradiance(-geometryNormal) * RECIPROCAL_PI * 0.12;
  #endif
  // one crisp highlight: the key softbox in the polished dome
  float auD = dot(reflect(-geometryViewDir, geometryNormal), auKeyV);
  totalEmissiveRadiance += vec3(smoothstep(0.9982, 0.9993, auD) * 5.0 + pow(max(auD, 0.0), 260.0) * 0.5) * uAuHi;
}
#include <transmission_fragment>`]
      ]);
      return m;
    };
    /* white opal (0) ... black opal (1): the body's two tones */
    SA.opalTone = function (m, dark) {
      const u = m.userData && m.userData.au;
      if (!u || !u.uAuDeep) return;
      const k = Math.max(0, Math.min(1, dark)), t = SA._tmpC || (SA._tmpC = new THREE.Color());
      // (graded in display values, so the middle of the slider is a true mid-grey body, not a near-black one)
      u.uAuDark.value = k;
      u.uAuDeep.value.set(SA.OPAL_TONES.white.deep).convertLinearToSRGB().lerp(t.set(SA.OPAL_TONES.black.deep).convertLinearToSRGB(), k).convertSRGBToLinear();
      u.uAuMilkC.value.set(SA.OPAL_TONES.white.milk).convertLinearToSRGB().lerp(t.set(SA.OPAL_TONES.black.milk).convertLinearToSRGB(), k).convertSRGBToLinear();
    };

    /* ---------------- 6. organic gems in the build context ---------------- */
    function organicInfo(shape, cutName, stone, kind, W, mesh) {
      return {
        mesh: mesh, cut: cutName, stone: stone, kind: kind, organic: kind,
        width: W, length: shape.length * W,
        crown: shape.crown * W, table: shape.crown * W, pavilion: shape.pavilion * W, girdle: shape.girdle * W, tableWidth: 0,
        outline: function (az) { const q = shape.outline(az); return new THREE.Vector2(q.x * W, q.z * W); },
        surfaceY: function (x, z) { return shape.surfaceY(x / W, z / W) * W; },
        bottomY: function (x, z) { return shape.bottomY(x / W, z / W) * W; },
        prongs: function (n) { return SA.prongs(cutName, n); }
      };
    }
    SA.organicGem = function (ctx, o, stone) {
      o = o || {};
      const kind = SA.kindOf(stone);
      const spec = (ctx && ctx.spec) || {};
      const cutName = kind === 'pearl' ? 'round' : (KIT.CUTS.indexOf(o.cut) >= 0 ? o.cut : (KIT.CUTS.indexOf(spec.cut) >= 0 ? spec.cut : 'round'));
      const carat = o.carat != null ? o.carat : (spec.carat || 1);
      const W = o.width || (kind === 'pearl' ? clamp(KIT.size('round', carat).width * 1.12, 2, 12) : KIT.size(cutName, carat).width * 1.06);
      const detail = ctx && ctx.lod < 0.7 ? 'low' : 'high';
      const shape = kind === 'pearl' ? pearlShape(detail) : cabShape(cutName, detail);
      const mat = kind === 'pearl' ? SA.pearlMaterial(o) : SA.opalMaterial(o);
      if (ctx && ctx.track) ctx.track(mat);
      const mesh = new THREE.Mesh(shape.geometry, mat);
      mesh.scale.setScalar(W);
      mesh.name = 'gem-' + cutName + '-' + stone;
      return organicInfo(shape, cutName, stone, kind, W, mesh);
    };
    SA.organicGems = function (ctx, o, stone) {
      const kind = SA.kindOf(stone);
      const list = o.matrices || [];
      const cutName = kind === 'pearl' ? 'round' : (KIT.CUTS.indexOf(o.cut) >= 0 ? o.cut : 'round');
      const shape = kind === 'pearl' ? pearlShape('low') : cabShape(cutName, 'low');
      const mat = kind === 'pearl' ? SA.pearlMaterial(o) : SA.opalMaterial(Object.assign({ scale: 5 }, o));
      if (ctx && ctx.track) ctx.track(mat);
      const im = new THREE.InstancedMesh(shape.geometry, mat, Math.max(1, list.length));
      const sc = new THREE.Matrix4();
      list.forEach(function (m, i) {
        const w = Array.isArray(o.width) ? o.width[i] : (o.width || 1.2);
        sc.makeScale(w, w, w);
        im.setMatrixAt(i, m.clone().multiply(sc));
      });
      im.count = list.length;
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingBox(); im.computeBoundingSphere();
      im.name = 'gems-' + stone;
      return im;
    };

    /* the pearl's peg: a polished cup that hugs the lower pearl, on a post with a soft waist (one lathe) */
    SA.pegSetting = function (ctx, gem, o) {
      o = o || {};
      const g = new THREE.Group();
      g.add(gem.mesh);
      const lod = (ctx && ctx.lod) || 1;
      const R = gem.width / 2;
      const t = clamp(gem.width * 0.05, 0.3, 0.5);
      const pr = clamp(gem.width * 0.085, 0.42, 0.8);
      const a = (o.low ? 27 : 33) * DEG;
      const Ro = R + t;
      const bottom = o.bottom != null ? o.bottom : -(R + (o.low ? 0.45 : 0.9));
      const V2 = function (x, y) { return new THREE.Vector2(Math.max(0.0008, x), y); };
      const phi0 = Math.asin(Math.min(0.9, pr / Ro));
      const yJoin = -Math.cos(phi0) * Ro;
      const pts = [];
      if (bottom < yJoin - 0.05) {
        pts.push(V2(0, bottom));
        pts.push(V2(pr * 1.08, bottom));
        const n = 8, y0 = bottom, y1 = yJoin;
        for (let k = 0; k <= n; k++) {
          const u = k / n;
          pts.push(V2(pr * (1.08 - 0.16 * Math.sin(u * Math.PI) - 0.02 * u), y0 + (y1 - y0) * u));
        }
      } else pts.push(V2(0, -Ro));
      const NC = Math.round(12 * lod + 4);
      for (let k = 1; k <= NC; k++) { const ph = phi0 + (a - phi0) * k / NC; pts.push(V2(Math.sin(ph) * Ro, -Math.cos(ph) * Ro)); }
      const rc = t / 2, cxr = R + rc;
      const dir = [Math.sin(a), -Math.cos(a)], tan = [Math.cos(a), Math.sin(a)];
      for (let k = 1; k < 8; k++) {
        const th = k / 8 * Math.PI;
        pts.push(V2(dir[0] * cxr + rc * (Math.cos(th) * dir[0] + Math.sin(th) * tan[0]), dir[1] * cxr + rc * (Math.cos(th) * dir[1] + Math.sin(th) * tan[1])));
      }
      for (let k = NC; k >= 0; k--) { const ph = a * k / NC; pts.push(V2(Math.sin(ph) * R * 0.998, -Math.cos(ph) * R * 0.998)); }
      const geo = new THREE.LatheGeometry(pts, Math.round(56 * lod + 16));
      const head = new THREE.Mesh(geo, o.material || ctx.metal());
      head.name = 'head';
      g.add(head);
      g.userData.gem = gem;
      g.userData.bottom = bottom;
      return g;
    };

    /* the ctx hooks: installed on every build context through KIT.builderFor (documented KIT API) */
    function hookCtx(ctx) {
      if (!ctx || ctx.__auStones) return ctx;
      ctx.__auStones = true;
      const gem0 = ctx.gem, gems0 = ctx.gems, setting0 = ctx.setting;
      ctx.gem = function (o) {
        o = o || {};
        const stone = KIT.STONES[o.stone] ? o.stone : (ctx.spec && KIT.STONES[ctx.spec.stone] ? ctx.spec.stone : 'diamond');
        const kind = SA.kindOf(stone);
        if (kind === 'pearl' || kind === 'opal') return SA.organicGem(ctx, o, stone);
        return gem0.call(ctx, Object.assign({}, o, { stone: stone }));
      };
      ctx.gems = function (o) {
        o = o || {};
        const stone = KIT.STONES[o.stone] ? o.stone : 'diamond';
        const kind = SA.kindOf(stone);
        if (kind === 'pearl' || kind === 'opal') return SA.organicGems(ctx, o, stone);
        return gems0.call(ctx, o);
      };
      ctx.setting = function (gem, o) {
        if (gem && gem.organic === 'pearl') return SA.pegSetting(ctx, gem, o || {});
        return setting0.call(ctx, gem, o);
      };
      return ctx;
    }
    SA.hookCtx = hookCtx;
    /* the engine's documented stone hooks too (10-kit.js, "EXTENDING STONES"), so a pearl or an opal is right even on a
       path that does not go through a builder: mesh() replaces the faceted stone, material() dresses instanced ones */
    ['pearl', 'opal'].forEach(function (name) {
      const sd = KIT.STONES[name];
      if (!sd) return;
      if (typeof sd.mesh !== 'function') sd.mesh = function (ctx, o) { return SA.organicGem(ctx, o || {}, name); };
      if (typeof sd.material !== 'function') sd.material = function (cut, opt) { return name === 'pearl' ? SA.pearlMaterial(opt) : SA.opalMaterial(opt); };
    });
    const builderFor0 = KIT.builderFor;
    if (typeof builderFor0 === 'function' && !builderFor0.__auStones) {
      KIT.builderFor = function (spec) {
        const b = builderFor0.apply(KIT, arguments);
        if (typeof b !== 'function') return b;
        return function (s, ctx) { hookCtx(ctx); return b.apply(this, arguments); };
      };
      KIT.builderFor.__auStones = true;
    }
  } catch (err) {
    console.error('[Aurelia GL] gl-scenes-a stones failed to load', err);
  }
}

/* ---- 62-labgem.js ---- */
/* =====================================================================================================================
   gl-scenes-a Â· the LAB GEM: the faceted-stone shader of the engine (16-materials.js), extended for the gem lab and the
   birthstone calendar. Same optics (facet planes, internal bounces, Fresnel, dispersion, absorption), plus:
     - colour grading: uDepth scales the body absorption (light to deep tone), uTint adds an absorption of its own
       (a diamond's D -> K warmth)
     - inclusions (define AU_INCL): pinpoints, a crystal, two feathers and a cloud, traced inside the stone along every
       internal bounce, so they are seen through the facets and mirrored in them as in a real stone
     - uSoft: blurs what the stone sees (a stone out of focus), uExpo: its exposure (a stone in or out of the light)
   The environment comes from the stage that owns the material (uniform objects shared with it), so these stones do
   not depend on the engine's global environment slot.
   SA.labGem(cutName, stone, { envU, envLightU, incl, bounces, cubeHeight }) -> ShaderMaterial
   SA.stoneParams(stone, cutName) -> plain numbers for the optical uniforms;  SA.applyParams(mat, p)
   SA.mixParams(a, b, k, out)                                                  (a stone turning into another)
   SA.inclusionLayout(cutName) -> deterministic positions inside that cut (unit space)
   SA.applyClarity(mat, layout, clarity 0..1)  (1 = flawless: nothing; 0 = heavily included)
   ===================================================================================================================== */
{
  try {
    const SA = KIT._sa || (KIT._sa = {});
    const MAXP = 112;

    SA.cubeDefines = function (height) {
      const h = height > 0 ? height : 1024, maxMip = Math.log2(h) - 2;
      return {
        ENVMAP_TYPE_CUBE_UV: '',
        CUBEUV_TEXEL_WIDTH: (1 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16))).toFixed(10),
        CUBEUV_TEXEL_HEIGHT: (1 / h).toFixed(10),
        CUBEUV_MAX_MIP: maxMip.toFixed(1)
      };
    };

    const VERT = `
attribute float edge;
varying vec3 vPos;
varying vec3 vCam;
varying vec3 vNor;
varying float vEdge;
varying float vScale;
varying vec3 vR0;
varying vec3 vR1;
varying vec3 vR2;
void main() {
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
    m = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = m * vec4(position, 1.0);
  float s = length(m[0].xyz);
  vScale = s;
  vR0 = m[0].xyz / s; vR1 = m[1].xyz / s; vR2 = m[2].xyz / s;
  mat3 R = mat3(vR0, vR1, vR2);
  vCam = (transpose(R) * (cameraPosition - m[3].xyz)) / s;
  vPos = position;
  vNor = normal;
  vEdge = edge;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

    const FRAG = `
uniform sampler2D envMap;
uniform vec4 planes[${MAXP}];
uniform int uCount;
uniform int uBounces;
uniform vec3 uAbsorb;
uniform float uDepth;
uniform vec3 uTint;
uniform float uIor;
uniform vec3 uIorRGB;
uniform float uGain;
uniform float uEdge;
uniform float uEdgeGate;
uniform float uLightK;
uniform float uEnvLight;
uniform vec3 uEdgeTint;
uniform vec3 uBody;
uniform float uSurf;
uniform float uOpacity;
uniform float uExpo;
uniform float uSoft;
uniform vec3 uToneK;
uniform float uSat;
uniform float uCap;
uniform float uTableDark;
uniform float uRough;
uniform float uPeak;
uniform vec3 uLampD[2];
uniform vec3 uLampC;
uniform float uLampW;
uniform float uStudio;
uniform float uStudioRoom;
uniform vec3 uViewD;
uniform vec2 uHead;
uniform vec3 uBoxN[3];
uniform vec3 uBoxU[3];
uniform vec3 uBoxV[3];
uniform vec3 uBoxS[3];
#ifdef AU_INCL
uniform float uInc;
uniform vec4 uPin[12];
uniform float uPinA[12];
uniform vec4 uCry[2];
uniform float uCryA[2];
uniform mat3 uCryR;
uniform vec4 uFeat[2];
uniform vec4 uFeatN[2];
uniform vec3 uFeatU[2];
uniform vec4 uCloud;
uniform float uCloudA;
#endif
varying vec3 vPos;
varying vec3 vCam;
varying vec3 vNor;
varying float vEdge;
varying float vScale;
varying vec3 vR0;
varying vec3 vR1;
varying vec3 vR2;
#include <common>
#include <cube_uv_reflection_fragment>
${SA.NOISE}

mat3 Rm;
/* what the stone sees in a direction (object space). uRough softens the lightbox a touch (its small lamp pins would
   otherwise show as a dust of white points in every facet of a coloured stone), and uCap rolls the brightest lamps off
   softly (a coloured stone never shows a blown white hotspot; a diamond keeps a high cap, its fire needs them) */
vec3 envL(vec3 d, float rough) {
  vec3 wd = normalize(Rm * d);
  float rr = clamp(rough + uRough + uSoft, 0.0, 1.0);
  vec3 c = textureCubeUV(envMap, wd, rr).rgb;
  /* a diamond's studio (uStudio, set by SA.setStudio): a neutral, darker room, the viewer's head dark over the stone,
     and three large hard softboxes placed round the view. The facets then resolve into bold blocks of white and black
     (the arrows of a round brilliant are the head seen in its pavilion), never a mosaic of beige and grey. */
  if (uStudio > 0.001) {
    float l0 = dot(c, vec3(0.2126, 0.7152, 0.0722));
    vec3 room = vec3(l0 * uStudioRoom);
    room *= 1.0 - 0.94 * smoothstep(uHead.x, uHead.y, dot(wd, uViewD));
    float bx = 0.0;
    float bw = 0.006 + rr * 0.25;
    for (int i = 0; i < 3; i++) {
      float z = dot(wd, uBoxN[i]);
      if (z > 0.15) {
        vec2 p = abs(vec2(dot(wd, uBoxU[i]), dot(wd, uBoxV[i])) / z) - uBoxS[i].xy;
        bx += (1.0 - smoothstep(-bw, bw, max(p.x, p.y))) * uBoxS[i].z;
      }
    }
    c = mix(c, room + vec3(bx), uStudio);
  }
  // two small softboxes just above the viewer (set by the scene; off when uLampC is black): what a jeweller holds
  // over a stone so that its crown sends light and fire back to the eye in every view
  float lw = 0.0025 + rr * 0.06;
  c += uLampC * (smoothstep(uLampW - lw, uLampW + lw * 0.4, dot(wd, uLampD[0])) + 0.8 * smoothstep(uLampW - lw, uLampW + lw * 0.4, dot(wd, uLampD[1])));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return c * (l > uCap * 0.5 ? (uCap * 0.5 + (uCap * 0.5) * (1.0 - exp(-(l - uCap * 0.5) / (uCap * 0.5)))) / l : 1.0);
}
float fres(float ci, float n1, float n2) {
  float eta = n1 / n2;
  float st2 = eta * eta * max(0.0, 1.0 - ci * ci);
  if (st2 >= 1.0) return 1.0;
  float ct = sqrt(1.0 - st2);
  float rs = (n1 * ci - n2 * ct) / (n1 * ci + n2 * ct);
  float rp = (n2 * ci - n1 * ct) / (n2 * ci + n1 * ct);
  return 0.5 * (rs * rs + rp * rp);
}
#ifdef AU_INCL
void inclusions(vec3 P, vec3 T, float tMax, inout vec3 thr, inout vec3 col, float gain) {
  // pinpoints: minute crystals, soft points of light (the closest approach of the ray to each one)
  // (a negative alpha is a dark speck: a minute black crystal, which is what shows against bright facets)
  for (int i = 0; i < 12; i++) {
    float a = uPinA[i], aa = abs(a);
    if (aa < 0.002) continue;
    vec3 c = uPin[i].xyz;
    float t = clamp(dot(c - P, T), 0.0, tMax);
    vec3 q = P + T * t - c;
    float r = uPin[i].w;
    float d2 = dot(q, q) / (r * r);
    float k = exp(-d2 * d2) * aa;
    if (a > 0.0) col += thr * k * vec3(0.96, 0.96, 0.94) * gain;
    thr *= 1.0 - k * (a > 0.0 ? 0.7 : 0.97);
  }
  // crystals: small included minerals, dark little octahedra with a faint glint on a face
  for (int j = 0; j < 2; j++) {
    float ca = uCryA[j];
    if (ca < 0.002) continue;
    vec3 o = P - uCry[j].xyz;
    float r = uCry[j].w;
    float tIn = -1e5, tOut = 1e5;
    vec3 nIn = vec3(0.0, 1.0, 0.0);
    for (int k = 0; k < 8; k++) {
      vec3 n = uCryR * normalize(vec3(k % 2 == 0 ? 1.0 : -1.0, (k / 2) % 2 == 0 ? 1.0 : -1.0, k / 4 == 0 ? 1.0 : -1.0) * (j == 0 ? vec3(1.0, 0.72, 1.18) : vec3(0.8, 1.1, 0.9)));
      float dn = dot(n, T), dist = r - dot(n, o);
      if (abs(dn) < 1e-6) { if (dist < 0.0) tIn = 1e5; continue; }
      float t = dist / dn;
      if (dn < 0.0) { if (t > tIn) { tIn = t; nIn = n; } } else tOut = min(tOut, t);
    }
    tIn = max(tIn, 0.0);
    if (tIn < tOut && tIn < tMax) {
      float a = smoothstep(0.0, r * 0.3, min(tOut, tMax) - tIn) * ca;
      // (the lightbox's lamps are far brighter than 1: clamp what the crystal mirrors, or it would glow instead of
      // reading as a dark speck)
      vec3 cc = vec3(0.016, 0.014, 0.013) + min(envL(reflect(T, nIn), 0.35), vec3(1.0)) * 0.05;
      col += thr * a * cc * gain;
      thr *= 1.0 - a;
    }
  }
  // feathers: thin fractures, white and silvery where they catch the light, with the darker line of the crack along
  // their edge, fine striations, and the faint rainbow of a very thin gap
  for (int i = 0; i < 2; i++) {
    float fa = uFeatN[i].w;
    if (fa < 0.002) continue;
    vec3 n = uFeatN[i].xyz;
    float dn = dot(T, n);
    if (abs(dn) < 1e-4) continue;
    float t = dot(uFeat[i].xyz - P, n) / dn;
    if (t <= 0.0 || t >= tMax) continue;
    vec3 q = P + T * t - uFeat[i].xyz;
    vec3 u = uFeatU[i];
    vec3 v = cross(n, u);
    vec2 uv = vec2(dot(q, u), dot(q, v)) / uFeat[i].w;
    float r = length(uv);
    if (r > 1.0) continue;
    float ang = atan(uv.y, uv.x);
    float edge = 0.62 + 0.38 * auSaNoise(vec3(cos(ang) * 1.8 + float(i) * 7.0, sin(ang) * 1.8, 2.0));
    float m = smoothstep(edge, edge * 0.55, r);
    float str = 0.5 + 0.5 * sin(uv.x * 22.0 + uv.y * 6.0 + 7.0 * auSaNoise(vec3(uv * 3.5, float(i))));
    float body = m * (0.55 + 0.45 * str * str) * (0.7 + 0.3 * auSaNoise(vec3(uv * 8.0, 3.0 + float(i))));
    float line = smoothstep(0.07, 0.0, abs(r - edge * 0.78)) * smoothstep(1.0, 0.6, r);
    float glare = clamp(0.32 / (0.2 + abs(dn)), 0.8, 2.0);
    vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + r * 2.2 + float(i) * 0.4));
    vec3 fc = mix(vec3(0.95, 0.95, 0.93), min(envL(reflect(T, n), 0.15), vec3(1.6)), 0.4) * glare * mix(vec3(1.0), film, 0.18);
    float a = body * fa;
    col += thr * a * fc * gain;
    thr *= (1.0 - a * 0.9) * (1.0 - line * fa * 0.85);
  }
  // a cloud: a haze of minute pinpoints
  if (uCloudA > 0.002) {
    vec3 oc = P - uCloud.xyz;
    float b = dot(oc, T), c2 = dot(oc, oc) - uCloud.w * uCloud.w;
    float disc = b * b - c2;
    if (disc > 0.0) {
      float s = sqrt(disc);
      float t0 = max(0.0, -b - s), t1 = min(tMax, -b + s);
      if (t1 > t0) {
        // a cloud is no ball of fog: a scatter of patches of minute points, thinning toward its edges
        float L = (t1 - t0) / uCloud.w;
        vec3 mid = (P + T * (0.5 * (t0 + t1)) - uCloud.xyz) / uCloud.w;
        float n = auSaNoise(mid * 3.1 + 4.0) * 0.6 + auSaNoise(mid * 9.0 + 1.0) * 0.4;
        float grain = smoothstep(0.45, 0.85, n) * (0.55 + 0.45 * auSaNoise(mid * 31.0));
        float k = (1.0 - exp(-L * 0.9)) * smoothstep(0.0, 0.9, L) * grain * uCloudA;
        col += thr * k * vec3(0.8, 0.8, 0.78) * gain * 0.45;
        thr *= 1.0 - k * 0.45;
      }
    }
  }
}
#endif
void main() {
  Rm = mat3(normalize(vR0), normalize(vR1), normalize(vR2));
  vec3 N = normalize(vNor);
  vec3 V = normalize(vPos - vCam);
  float ci = clamp(-dot(V, N), 0.0, 1.0);
  float F = fres(ci, 1.0, uIor);
  float gain = uGain * mix(1.0, uLightK, uEnvLight);
  vec3 absorb = uAbsorb * uToneK * uDepth + uTint;
  vec3 Rr = reflect(V, N);
  // (a touch soft: the table is one flat mirror, and a sharp one shows the lightbox's lamp fittings as a cross on it)
  // (a coloured stone's crown is softer still: the lamp pins would read as a dust of white dots on it)
  vec3 refl = envL(Rr, 0.08 + uRough * 1.6);
  // the table and upper crown mirror the lightbox's overhead softboxes: over a coloured stone that mirror is a milky
  // veil, so the part of the room above the stone is darker for it (a jeweller holds a dark card over a coloured gem)
  refl *= mix(1.0, uTableDark, smoothstep(0.05, 0.55, normalize(Rm * Rr).y));
  vec3 col = refl * F * uSurf;
  vec3 T = refract(V, N, 1.0 / uIor);
  vec3 P = vPos;
  vec3 thr = vec3(1.0 - F);
  // loop bounds from uniforms (WebGL 2): the shader compiler cannot unroll them, so the stone compiles in a fraction of
  // the time a constant-bound loop takes (the stage is never kept waiting on a giant unrolled program)
  int nb = min(uBounces, 8), np = min(uCount, ${MAXP});
  for (int b = 0; b < nb; b++) {
    float tMin = 100.0;
    vec3 Nh = vec3(0.0, 1.0, 0.0);
    for (int i = 0; i < np; i++) {
      vec4 pl = planes[i];
      float dn = dot(pl.xyz, T);
      if (dn > 1e-5) {
        float t = (pl.w - dot(pl.xyz, P)) / dn;
        if (t < tMin) { tMin = t; Nh = pl.xyz; }
      }
    }
    tMin = clamp(tMin, 0.0, 3.0);
    #ifdef AU_INCL
      inclusions(P, T, tMin, thr, col, gain);
    #endif
    P += T * tMin;
    thr *= exp(-absorb * (tMin * vScale));
    float c = clamp(dot(T, Nh), 0.0, 1.0);
    float Fe = fres(c, uIor, 1.0);
    if (Fe < 0.999) {
      vec3 tg = refract(T, -Nh, uIor);
      vec3 tr = refract(T, -Nh, uIorRGB.r);
      vec3 tb = refract(T, -Nh, uIorRGB.b);
      if (dot(tr, tr) < 0.5) tr = tg;
      if (dot(tb, tb) < 0.5) tb = tg;
      vec3 a = envL(tg, 0.0);
      vec3 e = mix(a, vec3(envL(tr, 0.05).r, a.g, envL(tb, 0.05).b), 0.4);
      col += thr * (1.0 - Fe) * e * gain;
      thr *= Fe;
    }
    T = reflect(T, Nh);
  }
  col += thr * envL(T, 0.45) * gain * 0.6;
  col += uBody * dot(uToneK, vec3(0.3333)) * uDepth * envL(N, 0.9) * (1.0 - F);
  float ew = vEdge / max(fwidth(vEdge), 1e-6);
  float lit = mix(0.4 + 0.6 * dot(envL(N, 0.6), vec3(0.333)), 1.6 * smoothstep(0.35, 1.6, dot(refl, vec3(0.3, 0.55, 0.15))), uEdgeGate);
  col += (1.0 - smoothstep(0.0, 1.25, ew)) * uEdge * (1.0 - uSoft) * uEdgeTint * lit;
  // a ceiling on saturation (a peridot or a tanzanite is never neon), and the receding stones of a scene a little greyer
  col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSat);
  // a coloured stone's brightest light rolls off softly in its own hue: the display's tone curve would otherwise bleach
  // a bright red to pink and a bright green to mint (a ruby is never frosted glass); a diamond keeps its whites
  if (uPeak > 0.0) {
    float pk = max(col.r, max(col.g, col.b)), a = uPeak * 0.7;
    if (pk > a) col *= (a + (uPeak - a) * (1.0 - exp(-(pk - a) / (uPeak - a)))) / pk;
  }
  gl_FragColor = vec4(col * uExpo, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

    /* the lab's own grading of each stone (the engine's table is shared with the pieces and stays as it is). Colour is
       absorption per millimetre of path (Beer-Lambert), set so a stone's body colour lands on its reference:
         path    the stone's light path is this much longer than the engine's (internal reflections carry body colour)
         sat     a ceiling on saturation          cap   the brightest lamp a facet may show (soft roll-off)
         dark    how much darker the overhead room is in the table's mirror (1 = as it is)
         rough   a touch of softness on the lightbox (the lamp pins never read as dust)
         tone    { light, deep }: absorption at the two ends of the colour slider (the listed value is the middle), when
                 the hue must hold while the tone changes (graded in log space between the three) */
    const LAB = {
      diamond:    { path: 1, sat: 1, cap: 14, dark: 0.55, rough: 0.0, peak: 0 },
      // ruby: pigeon's blood, a pure red a shade toward blue (the red passes almost freely, green is gone at once);
      // garnet: deeper and browner (its red is absorbed more, its blue as much as its green)
      ruby:       { absorb: [0.11, 3.7, 2.0], body: [0.12, 0.0, 0.02], edgeTint: [1.0, 0.3, 0.38], gain: 1.3, sat: 0.96 },
      // garnet (pyrope-almandine): a deep wine red with a brown-violet body, toward rgb(110, 10, 25). Its red is absorbed
      // about three times a ruby's and its blue a little less than its green (the violet in the wine), so the light that
      // comes back is lower in key and its extinction (the dark facets) is deep; the body's own glow is small (no pink
      // glow from inside: a ruby fluoresces, a garnet does not), the facet edges a dark claret
      garnet:     { absorb: [0.28, 3.0, 1.3], body: [0.07, 0.0, 0.02], edgeTint: [0.64, 0.14, 0.26], gain: 1.32, sat: 0.95, bodyK: 0.5, peak: 0.76, dark: 0.22 },
      /* emerald: a green-dominant axis from a pale emerald (about 0.45 0.80 0.55) to a deep one (0.02 0.38 0.18); the
         ratios between the channels hold the hue, only saturation and value move */
      emerald:    { absorb: [1.25, 0.17, 0.56], body: [0.0, 0.03, 0.014], edgeTint: [0.32, 0.85, 0.45], gain: 1.08, sat: 0.92,
                    tone: { light: [0.3, 0.055, 0.22], deep: [2.4, 0.48, 1.0] } },
      sapphire:   { absorb: [1.9, 1.2, 0.07], sat: 0.95 },
      // amethyst: violet (about 275 degrees), so its red is absorbed more than its blue (equal, it reads magenta)
      amethyst:   { absorb: [0.21, 1.3, 0.13], body: [0.05, 0.0, 0.07], edgeTint: [0.7, 0.5, 1.0], gain: 1.36, sat: 0.9 },
      // aquamarine: a pale sea blue (toward #A8D8E2): very little absorption, never an electric teal
      aquamarine: { absorb: [0.09, 0.02, 0.01], body: [0.004, 0.012, 0.016], edgeTint: [0.7, 0.9, 1.0], sat: 0.82, cap: 2.4, rough: 0.1, dark: 0.75 },
      // peridot: lime yellow-green (about 85 degrees, toward #A4C23A), never olive and never neon; tanzanite:
      // violet-blue (toward #5E4FC0) with purple in its flashes, never a navy sapphire (its red is absorbed much less
      // than its green, which is what reads as violet)
      peridot:    { absorb: [0.085, 0.03, 0.85], body: [0.022, 0.034, 0.0], edgeTint: [0.8, 1.0, 0.4], gain: 1.15, sat: 0.86 },
      // citrine: lemon to golden yellow (toward #E9B53A, about 45 degrees): the green absorbed only a little more than the
      // red, the blue almost wholly. Imperial topaz is another stone: sherry orange to peach (toward #E8904A, about 26
      // degrees), its green absorbed four times as much as citrine's and a little of its red too, with pinkish flashes
      citrine:    { absorb: [0.008, 0.06, 0.7], body: [0.05, 0.036, 0.0], edgeTint: [1.0, 0.9, 0.48], gain: 1.26, sat: 0.88, bodyK: 1.0, dark: 0.8 },
      topaz:      { absorb: [0.034, 0.215, 0.6], body: [0.06, 0.022, 0.01], edgeTint: [1.0, 0.62, 0.58], gain: 1.3, sat: 0.86, bodyK: 0.9, dark: 0.75 },
      tourmaline: { sat: 0.93 },
      tanzanite:  { absorb: [0.16, 0.36, 0.035], body: [0.02, 0.006, 0.06], edgeTint: [0.72, 0.52, 1.0], gain: 1.3, sat: 0.88 }
    };
    /* (bodyK: the share of the body's own glow a lab stone keeps: lit by the overhead lightbox it lays an even, milky
       veil over the whole stone; the colour has to come from the light travelling inside it) */
    /* (dark: the overhead room in a coloured stone's table is dimmed, never blacked out: blacked out, the table read as a
       dark grey window with a bright rim, a smudge on the stone; at about half it is a soft, light softbox) */
    const LAB_DEF = { path: 1.5, sat: 0.94, cap: 3.0, dark: 0.5, rough: 0.05, peak: 1.05, bodyK: 0.3 };
    SA.LAB = LAB;
    /* plain numbers for a stone in a cut (step cuts get half the colour spread, as in the engine) */
    SA.stoneParams = function (stone, cutName) {
      const st = KIT.STONES[stone] || KIT.STONES.diamond;
      const lab = Object.assign({}, stone === 'diamond' ? LAB.diamond : LAB_DEF, LAB[stone] || {});
      const spread = cutName === 'emerald' || cutName === 'cushion' ? 0.5 : 1;
      const path = lab.path == null ? 1 : lab.path;
      const sc = function (a) { return a.map(function (v) { return v * path; }); };
      return {
        ior: st.ior,
        rgb: st.rgb.map(function (v) { return st.ior + (v - st.ior) * spread; }),
        absorb: sc(lab.absorb || st.absorb), gain: lab.gain || st.gain, edge: st.edge, gate: st.gate || 0,
        lightK: st.lightK == null ? 1 : st.lightK, edgeTint: (lab.edgeTint || st.edgeTint).slice(),
        body: (lab.body || st.body).map(function (v) { return v * (lab.bodyK == null ? 1 : lab.bodyK); }),
        surf: st.surf == null ? 1 : st.surf,
        sat: lab.sat, cap: lab.cap, dark: lab.dark, rough: lab.rough, peak: lab.peak || 0,
        toneL: lab.tone ? sc(lab.tone.light) : null, toneD: lab.tone ? sc(lab.tone.deep) : null
      };
    };
    SA.mixParams = function (a, b, k, out) {
      out = out || { rgb: [0, 0, 0], absorb: [0, 0, 0], edgeTint: [0, 0, 0], body: [0, 0, 0] };
      const l = function (x, y) { return x + (y - x) * k; };
      ['ior', 'gain', 'edge', 'gate', 'lightK', 'surf', 'sat', 'cap', 'dark', 'rough', 'peak'].forEach(function (n) { out[n] = l(a[n], b[n]); });
      ['rgb', 'absorb', 'edgeTint', 'body'].forEach(function (n) { for (let i = 0; i < 3; i++) out[n][i] = l(a[n][i], b[n][i]); });
      out.toneL = k < 0.5 ? a.toneL : b.toneL; out.toneD = k < 0.5 ? a.toneD : b.toneD;
      return out;
    };
    SA.applyParams = function (mat, p) {
      const u = mat.uniforms;
      u.uIor.value = p.ior;
      u.uIorRGB.value.fromArray(p.rgb);
      u.uAbsorb.value.fromArray(p.absorb);
      u.uGain.value = p.gain; u.uEdge.value = p.edge; u.uEdgeGate.value = p.gate; u.uLightK.value = p.lightK;
      u.uEdgeTint.value.fromArray(p.edgeTint);
      u.uBody.value.fromArray(p.body);
      u.uSurf.value = p.surf;
      u.uSat.value = p.sat; u.uCap.value = p.cap; u.uTableDark.value = p.dark; u.uRough.value = p.rough; u.uPeak.value = p.peak;
      mat.userData.params = p;
    };
    /* the tone of a coloured stone at a colour value (0 light, 0.5 listed, 1 deep): sets uDepth and uToneK. With a tone
       table the absorption is interpolated in log space between light, listed and deep (the hue holds; only saturation
       and value move); otherwise the listed absorption is scaled (SA.toneDepth). */
    SA.applyTone = function (mat, p, c) {
      const u = mat.uniforms;
      c = Math.max(0, Math.min(1, c));
      if (!p || !p.toneL || !p.toneD) { u.uDepth.value = SA.toneDepth(c); u.uToneK.value.set(1, 1, 1); return; }
      const a = c < 0.5 ? p.toneL : p.absorb, b = c < 0.5 ? p.absorb : p.toneD, k = c < 0.5 ? c * 2 : (c - 0.5) * 2;
      const lg = function (i) {
        const x = Math.log(Math.max(1e-4, a[i])), y = Math.log(Math.max(1e-4, b[i]));
        return Math.exp(x + (y - x) * k) / Math.max(1e-4, p.absorb[i]);
      };
      u.uDepth.value = 1;
      u.uToneK.value.set(lg(0), lg(1), lg(2));
    };

    /* the facet planes of a cut (unit space) from the engine's cut cache */
    SA.cut = function (name) {
      const n = KIT.CUTS.indexOf(name) >= 0 || name === 'melee' ? name : 'round';
      try {
        if (typeof KIT.cut === 'function') return KIT.cut(n);
        if (typeof glCut === 'function') return glCut(n);
      } catch (e) { /* none */ }
      return null;
    };

    SA.labGem = function (cutName, stone, o) {
      o = o || {};
      const cut = SA.cut(cutName);
      if (!cut) return null;
      const pl = new Float32Array(MAXP * 4);
      pl.set(cut.trace.subarray(0, Math.min(cut.trace.length, MAXP * 4)));
      const defines = SA.cubeDefines(o.cubeHeight || (SA.expectedCube ? SA.expectedCube() : 1024));
      if (o.incl) defines.AU_INCL = '';
      const p = SA.stoneParams(stone, cutName);
      const V3 = function (a) { return new THREE.Vector3().fromArray(a); };
      const uniforms = {
        envMap: o.envU || { value: null },
        uEnvLight: o.envLightU || { value: 0 },
        planes: { value: pl },
        uCount: { value: Math.min(cut.planeCount, MAXP) },
        uBounces: { value: o.bounces || 6 },
        uAbsorb: { value: V3(p.absorb) },
        uDepth: { value: 1 },
        uTint: { value: new THREE.Vector3() },
        uIor: { value: p.ior },
        uIorRGB: { value: V3(p.rgb) },
        uGain: { value: p.gain },
        uEdge: { value: p.edge },
        uEdgeGate: { value: p.gate },
        uLightK: { value: p.lightK },
        uEdgeTint: { value: V3(p.edgeTint) },
        uBody: { value: V3(p.body) },
        uSurf: { value: p.surf },
        uOpacity: { value: 1 },
        uExpo: { value: 1 },
        uSoft: { value: 0 },
        uToneK: { value: new THREE.Vector3(1, 1, 1) },
        uSat: { value: p.sat == null ? 1 : p.sat },
        uCap: { value: p.cap == null ? 14 : p.cap },
        uTableDark: { value: p.dark == null ? 1 : p.dark },
        uRough: { value: p.rough || 0 },
        uPeak: { value: p.peak || 0 },
        // (world directions; SA.setLamps aims them, a scene that never does keeps them dark)
        uLampD: { value: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0)] },
        uLampC: { value: new THREE.Vector3() },
        uLampW: { value: 0.9935 },
        // the diamond's studio (SA.setStudio; 0 = the stage's own lightbox as it is)
        uStudio: { value: 0 }, uStudioRoom: { value: 0.3 },
        uViewD: { value: new THREE.Vector3(0, 0, 1) }, uHead: { value: new THREE.Vector2(0.915, 0.97) },
        uBoxN: { value: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 0)] },
        uBoxU: { value: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0)] },
        uBoxV: { value: [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1)] },
        uBoxS: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] }
      };
      // the inclusion uniforms are always there, so a material can take the AU_INCL program later (SA.setIncl)
      {
        const pins = [], pa = [];
        for (let i = 0; i < 12; i++) { pins.push(new THREE.Vector4(0, 0, 0, 0.01)); pa.push(0); }
        Object.assign(uniforms, {
          uInc: { value: 0 },
          uPin: { value: pins }, uPinA: { value: pa },
          uCry: { value: [new THREE.Vector4(0, 0, 0, 0.03), new THREE.Vector4(0, 0, 0, 0.03)] }, uCryA: { value: [0, 0] },
          uCryR: { value: new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.5, 0.9, 0.3))) },
          uFeat: { value: [new THREE.Vector4(0, 0, 0, 0.1), new THREE.Vector4(0, 0, 0, 0.1)] },
          uFeatN: { value: [new THREE.Vector4(0, 1, 0, 0), new THREE.Vector4(0, 1, 0, 0)] },
          uFeatU: { value: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0)] },
          uCloud: { value: new THREE.Vector4(0, 0, 0, 0.1) }, uCloudA: { value: 0 }
        });
      }
      const mat = new THREE.ShaderMaterial({ name: 'au-labgem', vertexShader: VERT, fragmentShader: FRAG, defines: defines, uniforms: uniforms });
      mat.userData.stone = stone;
      mat.userData.cut = cutName;
      mat.userData.auKind = 'faceted';
      mat.userData.params = p;
      mat.userData.incl = !!o.incl;
      return mat;
    };
    /* switch a lab gem to the program with (or without) inclusions; only call it once that program is compiled (a
       material kept alive with it, see SA.warmIncl), or the switch compiles on the main thread */
    SA.setIncl = function (mat, on) {
      if (!mat || !mat.defines || !!mat.userData.incl === !!on) return;
      if (on) mat.defines.AU_INCL = ''; else delete mat.defines.AU_INCL;
      mat.userData.incl = !!on;
      mat.needsUpdate = true;
    };
    /* a stage's environment changed size (another PMREM resolution): rebuild the cube-uv defines */
    SA.retuneCube = function (mat, height) {
      const d = SA.cubeDefines(height);
      if (mat.defines && mat.defines.CUBEUV_TEXEL_HEIGHT !== d.CUBEUV_TEXEL_HEIGHT) { Object.assign(mat.defines, d); mat.needsUpdate = true; }
    };

    /* the two small lamps over the viewer's shoulders: aimed from a stone's centre (world) toward the camera, raised a
       little above it and set apart either side, so the crown returns them in a face-up view and in a low one alike.
       I: their brightness (0 = off; a diamond takes more than a coloured stone, whose cap rolls them off softly) */
    const LAMP_C = new THREE.Vector3(), LAMP_R = new THREE.Vector3(), LAMP_U = new THREE.Vector3(), LAMP_WARM = [1.0, 0.975, 0.94];
    SA.lampDirs = function (camera, center, out) {
      out = out || [new THREE.Vector3(), new THREE.Vector3()];
      LAMP_C.copy(camera.position).sub(center).normalize();
      LAMP_R.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      LAMP_U.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      out[0].copy(LAMP_C).addScaledVector(LAMP_U, 0.5).addScaledVector(LAMP_R, -0.34).normalize();
      out[1].copy(LAMP_C).addScaledVector(LAMP_U, 0.36).addScaledVector(LAMP_R, 0.42).normalize();
      return out;
    };
    SA.setLamps = function (mat, dirs, I) {
      const u = mat && mat.uniforms;
      if (!u || !u.uLampD) return;
      u.uLampD.value[0].copy(dirs[0]); u.uLampD.value[1].copy(dirs[1]);
      u.uLampC.value.set(LAMP_WARM[0] * I, LAMP_WARM[1] * I, LAMP_WARM[2] * I);
    };
    /* the diamond's studio: three large hard softboxes placed round the view (in the camera's frame, so as the stone
       turns its facets switch between them and the dark room), the viewer's head dark over the stone, and a neutral room
       at uStudioRoom of its brightness. c: the box's centre as (toward the camera, up, right); s: its half size as the
       tangent of its half angles; i: its brightness. k 0..1 blends it in (0 = the stage's own lightbox). */
    SA.STUDIO = [
      { c: [0.42, 0.78, -0.62], s: [0.36, 0.2], i: 3.6 },      // the key: a wide box above and to the left
      { c: [0.5, 0.06, 0.9], s: [0.13, 0.5], i: 2.6 },         // a tall strip on the right
      { c: [-0.32, 1.0, 0.18], s: [0.55, 0.16], i: 2.2 }       // a long bar overhead, behind the stone
    ];
    const SB_N = new THREE.Vector3(), SB_U = new THREE.Vector3(), SB_V = new THREE.Vector3();
    SA.setStudio = function (mat, camera, center, k, room) {
      const u = mat && mat.uniforms;
      if (!u || !u.uStudio) return;
      u.uStudio.value = k;
      if (k <= 0.001) return;
      if (room != null) u.uStudioRoom.value = room;
      LAMP_C.copy(camera.position).sub(center).normalize();
      LAMP_R.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      LAMP_U.crossVectors(LAMP_C, LAMP_R).normalize();
      if (LAMP_U.dot(SB_V.setFromMatrixColumn(camera.matrixWorld, 1)) < 0) LAMP_U.negate();
      u.uViewD.value.copy(LAMP_C);
      SA.STUDIO.forEach(function (b, i) {
        SB_N.copy(LAMP_C).multiplyScalar(b.c[0]).addScaledVector(LAMP_U, b.c[1]).addScaledVector(LAMP_R, b.c[2]).normalize();
        SB_U.copy(LAMP_R).addScaledVector(SB_N, -LAMP_R.dot(SB_N));
        if (SB_U.lengthSq() < 1e-6) SB_U.copy(LAMP_U).addScaledVector(SB_N, -LAMP_U.dot(SB_N));
        SB_U.normalize();
        SB_V.crossVectors(SB_N, SB_U).normalize();
        u.uBoxN.value[i].copy(SB_N); u.uBoxU.value[i].copy(SB_U); u.uBoxV.value[i].copy(SB_V);
        u.uBoxS.value[i].set(b.s[0], b.s[1], b.i);
      });
    };

    /* ---------------- inclusions ---------------- */
    const layoutCache = {};
    SA.inclusionLayout = function (cutName) {
      if (layoutCache[cutName]) return layoutCache[cutName];
      const cut = SA.cut(cutName);
      if (!cut) return null;
      const tr = cut.trace, nP = cut.planeCount;
      const inside = function (x, y, z, m) {
        for (let i = 0; i < nP; i++) if (tr[i * 4] * x + tr[i * 4 + 1] * y + tr[i * 4 + 2] * z - tr[i * 4 + 3] > -m) return false;
        return true;
      };
      let seed = 1234 + cutName.length * 97;
      const rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      const L = cut.length;
      const pick = function (m, yLo, yHi, rr) {
        for (let k = 0; k < 400; k++) {
          const x = (rnd() - 0.5) * rr, z = (rnd() - 0.5) * rr * L, y = yLo + rnd() * (yHi - yLo);
          if (inside(x, y, z, m)) return new THREE.Vector3(x, y, z);
        }
        return new THREE.Vector3(0, -0.05, 0);
      };
      const lay = { pins: [], crystals: [], feathers: [], cloud: null };
      /* pinpoints: most within sight of the table, a few nearer the girdle; each appears below its own clarity */
      for (let i = 0; i < 12; i++) {
        const p = pick(0.035, -cut.pavilion * 0.62, cut.crown * 0.55, i < 8 ? 0.62 : 0.86);
        lay.pins.push({ p: p, r: 0.0055 + rnd() * 0.0045, th: 0.08 + i * 0.06, k: (0.8 + rnd() * 0.2) * (i % 3 === 1 ? -1 : 1) });
      }
      /* two crystals: the first under the table but off its centre (on the axis it would read as the culet), a second
         off to one side (I) */
      const offAxis = function (m, yLo, yHi, rr) {
        for (let k = 0; k < 60; k++) { const p = pick(m, yLo, yHi, rr); if (Math.hypot(p.x, p.z) > 0.09) return p; }
        return pick(m, yLo, yHi, rr);
      };
      /* sizes as they are in life: at I1 a crystal is 3-4% of the stone's width and a feather about 4% (seen through
         the facets and mirrored in them, each shows a few times, small: never a dark facet) */
      lay.crystals.push({ p: offAxis(0.06, -cut.pavilion * 0.4, cut.crown * 0.15, 0.4), r: 0.014, th: 0.28 });
      lay.crystals.push({ p: pick(0.05, -cut.pavilion * 0.5, 0.0, 0.62), r: 0.012, th: 0.5 });
      const f0 = pick(0.06, -cut.pavilion * 0.35, cut.crown * 0.1, 0.5);
      const f1 = pick(0.05, -cut.pavilion * 0.5, 0.0, 0.62);
      const n0 = new THREE.Vector3(0.62, 0.45, 0.35).normalize(), n1 = new THREE.Vector3(-0.3, 0.55, 0.78).normalize();
      const tang = function (n) { return new THREE.Vector3(0, 1, 0).cross(n).normalize(); };
      lay.feathers.push({ p: f0, r: 0.024, n: n0, u: tang(n0), th: 0.4 });
      lay.feathers.push({ p: f1, r: 0.019, n: n1, u: tang(n1), th: 0.62 });
      lay.cloud = { p: pick(0.08, -cut.pavilion * 0.4, 0.0, 0.5), r: 0.06, th: 0.66 };
      layoutCache[cutName] = lay;
      return lay;
    };
    const ss = function (a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    /* clarity 1 = flawless, 0 = heavily included (I1, the page's lowest grade; its grades are evenly spaced: IF 0.875,
       VVS 0.75 / 0.625, VS 0.5 / 0.375, SI 0.25 / 0.125). The inclusions arrive one by one as clarity falls, graded as a
       stone is seen at arm's length: VVS a single minute point; VS a few faint points and a speck (clean to the eye, as
       the page says); SI a small crystal and a first feather; I1 everything, a cloud too. A pinpoint is mostly a tiny
       dark speck, and the bright ones are soft (a scatter of white points reads as dust on the glass, not as a stone).
       vis: how readily they show (a coloured stone is graded to the eye, so the same grade shows less in it) */
    const PIN_TH = [0.2, 0.36, 0.5, 0.6, 0.7, 0.78, 0.86, 0.92, 2, 2, 2, 2];
    SA.applyClarity = function (mat, lay, clarity, vis) {
      const u = mat.uniforms;
      if (!u.uInc || !lay) return;
      const s = Math.max(0, Math.min(1, 1 - clarity));
      const V = vis == null ? 1 : vis;
      u.uInc.value = s;
      lay.pins.forEach(function (p, i) {
        const th = PIN_TH[i] == null ? 2 : PIN_TH[i];
        const on = ss(th, th + 0.12, s);
        u.uPin.value[i].set(p.p.x, p.p.y, p.p.z, p.r * (0.55 + 0.25 * on + 0.2 * s));
        // two of every three are dark specks; the bright ones are half as strong
        const dark = i % 3 !== 0;
        u.uPinA.value[i] = on * (dark ? -Math.abs(p.k) * 0.75 : Math.abs(p.k) * 0.4) * (0.5 + 0.5 * s) * V;
      });
      const CRY = [0.45, 0.72];
      lay.crystals.forEach(function (c, i) {
        const th = CRY[i];
        u.uCry.value[i].set(c.p.x, c.p.y, c.p.z, c.r * (0.6 + 0.8 * ss(th, 1.0, s)));
        u.uCryA.value[i] = ss(th, th + 0.15, s) * (0.6 + 0.4 * s) * V;
      });
      const FEA = [0.68, 0.84];
      lay.feathers.forEach(function (f, i) {
        const th = FEA[i];
        u.uFeat.value[i].set(f.p.x, f.p.y, f.p.z, f.r * (0.55 + 0.45 * ss(th, 1.0, s)));
        u.uFeatN.value[i].set(f.n.x, f.n.y, f.n.z, ss(th, th + 0.14, s) * (0.5 + 0.5 * s) * V);
        u.uFeatU.value[i].copy(f.u);
      });
      const cl = lay.cloud;
      u.uCloud.value.set(cl.p.x, cl.p.y, cl.p.z, cl.r);
      u.uCloudA.value = ss(0.88, 1.0, s) * 0.85 * V;
    };

    /* a diamond's colour grade: 0 = D (colourless) ... 1 = K (faint warm yellow); per-mm absorption, so a bigger stone
       shows a little more colour, as it does in life */
    /* (face-up a near-colourless stone reads white: the warmth of G is a whisper, and only K shows a faint yellow) */
    SA.diamondTint = function (color, out) {
      const k = Math.pow(Math.max(0, Math.min(1, color)), 1.7);
      return (out || new THREE.Vector3()).set(0.0008 * k, 0.0055 * k, 0.032 * k);
    };
    /* a coloured stone's tone: 0 = light, 0.5 = the stone as listed, 1 = deep */
    SA.toneDepth = function (color) {
      const c = Math.max(0, Math.min(1, color));
      // absorption is exponential in the path, so the light half is graded geometrically (a pale stone needs very
      // little absorption to show its colour at all): 0 -> 0.14, 0.5 -> 1, 1 -> 1.9
      return c < 0.5 ? 0.14 * Math.pow(1 / 0.14, c / 0.5) : 1 + (c - 0.5) * 1.8;
    };
  } catch (err) {
    console.error('[Aurelia GL] gl-scenes-a lab gem failed to load', err);
  }
}

/* ---- 64-stage.js ---- */
/* =====================================================================================================================
   gl-scenes-a · the scene stage: one canvas and renderer per scene, the engine's jeweller's lightbox (prepared in idle
   slices with glEnvAsync when the engine has it; a small fallback room otherwise), a 0.7 s lighting crossfade on a mode
   switch, rendering on demand from AU.tick, a pause whenever the stage is off screen or the tab is hidden, a resolution
   governor (pixel ratio within the engine's quality tier, KIT.tier), context-loss recovery, full disposal.
   Smoothness rules: nothing is drawn until the lighting exists and every shader has compiled off the main thread
   (stage.ready, then stage.compile(root), then stage.hold = false); a material that leaves the scene can be kept
   (stage.keep) so its compiled program is not thrown away and a later swap back does not compile again.
   SA.Stage(container, { kind, label, fov }) — set stage.update = (t, dt) => moving, override stage.draw() if needed.
   SA.drag(canvas, { down, move, up, tap, hover }) pointer helper (pixel deltas, velocities, taps), returns a remover.
   SA.spring(value, omega) critically damped follower: s.to(v), s.step(dt) -> moving, s.v (value), s.snap(v)
   ===================================================================================================================== */
{
  try {
    const SA = KIT._sa || (KIT._sa = {});
    const SWITCH = 0.7;
    const TIER = function () { return KIT.tier || { level: 'high', dprCap: 2, dprMin: 1, bounces: 6, env: 256 }; };
    SA.tier = TIER;
    /* the height of the CubeUV texture the tier's environments will have (gem shaders are built for it in advance) */
    SA.expectedCube = function () { return 4 * Math.pow(2, Math.floor(Math.log2(TIER().env || 256))); };

    /* ---------------- slices ----------------
       SA.slice(fn) -> Promise of fn's result: heavy steps of building a scene run one per frame, each in its own short
       task right after a frame has been presented (rAF, then a macrotask), so a slice never delays a frame that is
       already being drawn and never waits for an idle period (an idle period is rare while anything animates: waiting
       for one is what kept the scenes on their placeholders for seconds). Slices are kept to a few milliseconds each;
       the GPU work they start (shader compiles, the lighting) runs in parallel off the main thread. */
    const SQ = { q: [], on: false };
    const slicePump = function () {
      if (SQ.on || !SQ.q.length) return;
      SQ.on = true;
      const run = function () {
        SQ.on = false;
        const t0 = performance.now();
        // one slice per frame; a run of tiny ones (under 3 ms together) may share it
        do {
          const job = SQ.q.shift();
          let r;
          try { r = job.fn(); } catch (e) { job.reject(e); continue; }
          job.resolve(r);
        } while (SQ.q.length && SQ.q[0].tiny && performance.now() - t0 < 3);
        slicePump();
      };
      if (document.hidden) setTimeout(run, 16);
      else requestAnimationFrame(function () { setTimeout(run, 0); });
    };
    SA.slice = function (fn, tiny) {
      return new Promise(function (resolve, reject) {
        SQ.q.push({ fn: fn, tiny: !!tiny, resolve: resolve, reject: reject });
        slicePump();
      });
    };

    /* ---------------- environment ---------------- */
    const FALLBACK = new WeakMap();
    function fallbackEnv(renderer, mode) {
      let rec = FALLBACK.get(renderer);
      if (!rec) { rec = { pmrem: new THREE.PMREMGenerator(renderer) }; FALLBACK.set(renderer, rec); }
      if (rec[mode]) return rec[mode].texture;
      const light = mode === 'light';
      const s = new THREE.Scene();
      const geo = new THREE.SphereGeometry(40, 48, 24), col = [], p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) / 40, k = light ? 0.3 + 0.25 * Math.max(0, y) : 0.08 + 0.25 * Math.max(0, y);
        col.push(k, k * 0.98, k * 0.96);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
      [[-0.55, 0.62, 0.56, 16, 11, 7], [0.06, 1, 0.18, 17, 17, 3], [0.92, 0.16, 0.36, 3.4, 26, 5.5], [-0.9, 0.18, -0.42, 3, 26, 4.4]].forEach(function (L) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(L[3], L[4]), new THREE.MeshBasicMaterial({ color: new THREE.Color(L[5], L[5], L[5]), side: THREE.DoubleSide }));
        m.position.set(L[0], L[1], L[2]).normalize().multiplyScalar(24);
        m.lookAt(0, 0, 0);
        s.add(m);
      });
      rec[mode] = rec.pmrem.fromScene(s, 0.012, 0.1, 100);
      s.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      return rec[mode].texture;
    }
    /* the studio lightbox for a mode, as a Promise of its PMREM texture, never blocking the page when the engine can help */
    SA.envAsync = function (renderer, mode) {
      const fast = SA.envFast(renderer, mode);
      if (fast) return fast;
      if (typeof glEnvAsync === 'function') {
        try { return glEnvAsync(renderer, 'studio', mode).catch(function () { return SA.envSync(renderer, mode); }); } catch (e) { /* below */ }
      }
      return new Promise(function (res) {
        const go = function () { res(SA.envSync(renderer, mode)); };
        if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 400 }); else setTimeout(go, 30);
      });
    };
    /* the engine's lightbox (the same room, the same PMREM and the same record per renderer as glEnvAsync, so the
       engine's crossfade and disposal work on it), made in three short slices instead of three idle callbacks:
         1. the room and the PMREM targets (~3 ms)   2. every program they use compiled off the main thread (the room's
         materials, PMREM's background box and blur, the crossfade pass), with the renderer as PMREM will draw (a linear
         half-float target, no tone mapping)   3. the PMREM pass itself (~15 ms of command submission)
       null when the engine's internals are not there (then the engine's own path is used) */
    SA.envFast = function (renderer, mode) {
      if (typeof glEnvRec !== 'function' || typeof glPmrem !== 'function' || typeof glLightbox !== 'function') return null;
      mode = mode === 'light' ? 'light' : 'dark';
      let rec, key;
      try { rec = glEnvRec(renderer); key = (typeof glLightName === 'function' ? glLightName('studio') : 'studio') + '|' + mode; } catch (e) { return null; }
      if (rec.envs[key]) return Promise.resolve(rec.envs[key].texture);
      if (rec.pending[key]) return rec.pending[key];
      let sc = null, pm = null;
      const p = SA.slice(function envRoom() {
        if (rec.dead) throw new Error('renderer disposed');
        pm = glPmrem(rec, renderer);
        pm._setSize();
        if (!pm._pingPongRenderTarget || !pm._blurMaterial) { const t = pm._allocateTargets(); t.dispose(); }
        sc = glLightbox(mode, 'studio');
      }).then(function () {
        return SA.slice(function envCompile() {
          if (rec.dead) throw new Error('renderer disposed');
          // the programs the PMREM pass will use, compiled off the main thread before it runs
          const extra = [new THREE.MeshBasicMaterial({ name: 'PMREM.Background', side: THREE.BackSide, depthWrite: false, depthTest: false }), pm._blurMaterial];
          if (typeof glEnvMixMaterial === 'function') { try { extra.push(glEnvMixMaterial()); } catch (e) { /* compiled on first use */ } }
          const tmp = [];
          extra.forEach(function (m) {
            const mesh = new THREE.Mesh(m === pm._blurMaterial && pm._lodPlanes ? pm._lodPlanes[0] : new THREE.PlaneGeometry(1, 1), m);
            mesh.frustumCulled = false;
            sc.add(mesh); tmp.push(mesh);
          });
          const cam = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
          const prevT = renderer.getRenderTarget();
          let q = null;
          renderer.setRenderTarget(pm._pingPongRenderTarget);
          try { q = renderer.compileAsync ? renderer.compileAsync(sc, cam) : null; } catch (e) { q = null; }
          finally { renderer.setRenderTarget(prevT); }
          return Promise.resolve(q).catch(function () { /* compiled on first use */ }).then(function () {
            // the helpers leave the room again (the background material is a twin: its program stays cached as long
            // as the engine's own warm-up keeps one, and PMREM makes its own each pass)
            tmp.forEach(function (mesh) { sc.remove(mesh); if (mesh.geometry !== (pm._lodPlanes && pm._lodPlanes[0])) mesh.geometry.dispose(); });
            if (!rec.keep) rec.keep = { mats: [extra[0]], geo: new THREE.PlaneGeometry(1, 1), vgeo: new THREE.PlaneGeometry(1, 1) };
            else extra[0].dispose();
          });
        });
      }).then(function () {
        return SA.slice(function envPmrem() {
          if (rec.dead) { if (sc && typeof glDisposeScene === 'function') glDisposeScene(sc); throw new Error('renderer disposed'); }
          if (!rec.envs[key]) rec.envs[key] = pm.fromScene(sc, 0.012, 0.1, 100);
          if (typeof glDisposeScene === 'function') glDisposeScene(sc);
          sc = null;
          delete rec.pending[key];
          return rec.envs[key].texture;
        });
      });
      rec.pending[key] = p;
      p.catch(function () { delete rec.pending[key]; if (sc && typeof glDisposeScene === 'function') { try { glDisposeScene(sc); } catch (e) { /* ignore */ } } });
      return p;
    };
    /* a stand-in for the lighting with the exact layout the real one will have: materials that read the environment
       (pearl, opal) compile against it while the real lighting is still being made, and keep their programs */
    SA.dummyEnv = function () {
      if (SA._dummyEnv) return SA._dummyEnv;
      const h = SA.expectedCube(), size = h / 4;
      const t = new THREE.Texture();
      t.mapping = THREE.CubeUVReflectionMapping;
      t.image = { width: 3 * Math.max(size, 16 * 7), height: h };
      t.type = THREE.HalfFloatType;
      t.colorSpace = THREE.LinearSRGBColorSpace;
      t.name = 'au-env-standin';
      SA._dummyEnv = t;
      return t;
    };
    SA.envSync = function (renderer, mode) {
      if (typeof glEnvFor === 'function') { try { return glEnvFor(renderer, mode); } catch (e) { /* fallback */ } }
      return fallbackEnv(renderer, mode);
    };
    /* a blend of two environments (a texture of the same layout), or the nearer one if the engine cannot blend */
    SA.envMixTex = function (renderer, a, b, k) {
      if (typeof glEnvMixTex === 'function') { try { return glEnvMixTex(renderer, a, b, k); } catch (e) { /* below */ } }
      return k < 0.5 ? a : b;
    };
    SA.envDispose = function (renderer) {
      if (typeof glEnvDispose === 'function') { try { glEnvDispose(renderer); } catch (e) { /* ignore */ } }
      const rec = FALLBACK.get(renderer);
      if (rec) { ['dark', 'light'].forEach(function (m) { if (rec[m]) rec[m].dispose(); }); rec.pmrem.dispose(); FALLBACK.delete(renderer); }
    };
    SA.ease = function (k) { k = Math.max(0, Math.min(1, k)); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
    SA.easeOut = function (k) { k = Math.max(0, Math.min(1, k)); return 1 - Math.pow(1 - k, 3); };

    /* ---------------- a critically damped spring ---------------- */
    SA.spring = function (v, omega) {
      const s = {
        v: v, t: v, vel: 0, w: omega || 6,
        to: function (x) { s.t = x; return s; },
        snap: function (x) { s.v = s.t = x == null ? s.t : x; s.vel = 0; return s; },
        step: function (dt) {
          if (s.v === s.t && !s.vel) return false;
          const w = s.w, x = s.v - s.t;
          // the exact critically damped solution over dt (frame-rate independent, never overshoots)
          const e = Math.exp(-w * dt), tmp = (s.vel + w * x) * dt;
          s.v = s.t + (x + tmp) * e;
          s.vel = (s.vel - w * tmp) * e;
          if (Math.abs(s.v - s.t) < 1e-5 && Math.abs(s.vel) < 1e-4) { s.v = s.t; s.vel = 0; return false; }
          return true;
        }
      };
      return s;
    };

    /* ---------------- the visitor's presence ----------------
       a turntable comes to rest when nobody has touched, moved or scrolled the page for a while (no GPU work for an
       unattended tab), and turns again the moment they are back */
    const ACT = { t: performance.now(), on: false, subs: new Set() };
    const REST = 45000;
    SA.awake = function () { return performance.now() - ACT.t < REST; };
    /* nobody has moved, scrolled, typed or touched for ms */
    SA.quiet = function (ms) { return performance.now() - ACT.t >= ms; };
    SA.poke = function () {
      const was = performance.now() - ACT.t >= REST;
      ACT.t = performance.now();
      if (was) ACT.subs.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
    };
    SA.onWake = function (fn) {
      if (!ACT.on) {
        ACT.on = true;
        ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function (ev) {
          window.addEventListener(ev, SA.poke, { passive: true, capture: true });
        });
      }
      ACT.subs.add(fn);
      return function () { ACT.subs.delete(fn); };
    };

    /* ---------------- the stage ---------------- */
    function Stage(container, o) {
      o = o || {};
      const self = this;
      this.container = container;
      this.kind = o.kind || 'scene';
      try { if (getComputedStyle(container).position === 'static') container.style.position = 'relative'; } catch (e) { /* ignore */ }
      const cv = this.canvas = document.createElement('canvas');
      cv.className = 'augl-canvas augl-canvas--' + this.kind;
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;outline:none;' +
        '-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;touch-action:pan-y;cursor:grab;opacity:0;' +
        (AU.reduced ? '' : 'transition:opacity .6s cubic-bezier(.22,.61,.36,1);');
      cv.setAttribute('role', 'img');
      cv.setAttribute('aria-label', o.label || 'Aurelia');
      cv.setAttribute('draggable', 'false');
      container.appendChild(cv);
      const r = this.renderer = typeof glRenderer === 'function' ? glRenderer(cv, false)
        : new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
      r.setClearColor(0x000000, 0);
      r.toneMapping = THREE.NeutralToneMapping;
      r.toneMappingExposure = 1.0;
      r.outputColorSpace = THREE.SRGBColorSpace;
      const T = TIER();
      // (o.pixelRatio: a fixed pixel ratio, for a picture rendered offline: SA.capture)
      this.fixedDpr = o.pixelRatio > 0 ? o.pixelRatio : 0;
      this.dprCap = this.fixedDpr || Math.max(0.75, Math.min(T.dprCap || 2, window.devicePixelRatio || 1));
      this.dprMin = this.fixedDpr || Math.min(this.dprCap, T.dprMin || 1);
      this.dpr = this.dprCap;
      r.setPixelRatio(this.dpr);
      this.scene = new THREE.Scene();
      // the stand-in lighting until the real one exists: programs compiled now are the ones the real lighting uses
      this.scene.environment = SA.dummyEnv();
      this.camera = new THREE.PerspectiveCamera(o.fov || 26, 1, 1, 2000);
      // resolves on the first frame actually presented (the scene's `ready` follows it)
      this.firstDrawn = new Promise(function (res) { self._drawn = res; });
      this.envU = { value: null };
      this.envLightU = { value: 0 };
      this.size = { w: 0, h: 0 };
      this.visible = true; this.paused = false; this.lost = false; this.disposed = false; this.dirty = true;
      this.hold = true;              // nothing is drawn until the scene says it is compiled
      this.untick = null;
      this.tracked = [];
      this.keepers = {};
      this.perf = { n: 0, sum: 0, slow: 0, fast: 0 };
      // (o.mode: a fixed mode that ignores the page's, for a picture rendered offline)
      this.fixedMode = o.mode === 'light' || o.mode === 'dark' ? o.mode : null;
      this.mode = this.fixedMode || (AU.getMode ? AU.getMode() : 'dark');
      this.envLightU.value = this.mode === 'light' ? 1 : 0;
      this.envs = {};
      this.busy = new Set();          // GPU work in flight (lighting, compiles): the context outlives it on dispose
      this._tick = function (t, dt) { self.frame(t, dt); };
      /* the lighting first, in short slices; the other mode's room once the scene is on screen, so a switch is light */
      this.ready = this.wait(SA.envAsync(r, this.mode)).then(function (tex) {
        if (self.disposed) throw new Error('disposed');
        self.envs[self.mode] = tex;
        self.setEnv(tex);
        /* the other mode's room is prepared ahead (so a mode switch is a crossfade, not a wait), but only once the
           visitor has been still for a moment: its lighting pass keeps the GPU busy for a frame or two, which a scroll
           or a drag would show as a hitch */
        const other = self.mode === 'light' ? 'dark' : 'light';
        if (self.fixedMode) return self;
        self.firstDrawn.then(function () {
          const t0 = performance.now();
          const tryOther = function () {
            if (self.disposed || self.envs[other]) return;
            if (performance.now() - t0 < 2500 || !SA.quiet(1500) || document.hidden) { setTimeout(tryOther, 700); return; }
            const go = function () {
              if (self.disposed || self.envs[other]) return;
              if (!SA.quiet(1500)) { setTimeout(tryOther, 700); return; }
              self.wait(SA.envAsync(r, other)).then(function (t2) { if (!self.disposed) self.envs[other] = t2; }, function () { /* later */ });
            };
            if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1200 }); else go();
          };
          setTimeout(tryOther, 700);
        });
        return self;
      });
      this.ready.catch(function () { /* disposed before the light was ready */ });
      this.ro = new ResizeObserver(function () { self.resize(); });
      this.ro.observe(container);
      this.io = new IntersectionObserver(function (es) {
        self.visible = es[es.length - 1].isIntersecting;
        if (self.visible) self.invalidate(); else self.sleep();
      }, { rootMargin: '80px' });
      this.io.observe(container);
      this.offs = [
        AU.on('mode', function (m) { if (!self.fixedMode) self.setMode(m); }),
        AU.on('reduced', function () { self.invalidate(); }),
        SA.onWake(function () { self.invalidate(); })
      ];
      this.onVis = function () { if (!document.hidden) self.invalidate(); };
      document.addEventListener('visibilitychange', this.onVis);
      cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; self.sleep(); });
      cv.addEventListener('webglcontextrestored', function () {
        self.lost = false;
        SA.envDispose(self.renderer);
        self.envs = {};
        self.envX = null;
        const m = self.mode;
        self.wait(SA.envAsync(self.renderer, m)).then(function (tex) { if (self.disposed) return; self.envs[m] = tex; self.setEnv(tex); self.invalidate(); }, function () { /* disposed */ });
      });
      this.resize();
    }
    /* a mode switch: the room eases over with the page's colours (both rooms blended) */
    Stage.prototype.setMode = function (m) {
      m = m === 'light' ? 'light' : 'dark';
      if (m === this.mode) return;
      const self = this, prev = this.mode;
      this.mode = m;
      const target = m === 'light' ? 1 : 0;
      this.wait(SA.envAsync(this.renderer, m)).then(function (tex) {
        if (self.disposed || self.mode !== m) return;
        self.envs[m] = tex;
        const from = self.envs[prev] || self.env;
        if (!from || AU.reduced || !self.shouldRun() || self.hold) {
          self.envX = null; self.setEnv(tex); self.envLightU.value = target; self.invalidate();
          return;
        }
        self.envX = { a: from, b: tex, t: 0, k0: self.envLightU.value, target: target };
        self.invalidate();
      }).catch(function () { /* disposed meanwhile */ });
    };
    /* GPU work the context must outlive: a dispose waits for it (a compile or a lighting pass that loses its context
       half way makes three.js throw from inside its own timers) */
    Stage.prototype.wait = function (p) {
      const set = this.busy;
      const q = Promise.resolve(p);
      set.add(q);
      const done = function () { set.delete(q); };
      q.then(done, done);
      return q;
    };
    Stage.prototype.setEnv = function (tex) {
      this.env = tex;
      this.envU.value = tex;
      this.scene.environment = tex;
      const h = tex && tex.image && tex.image.height;
      if (h && h !== this.cubeHeight) {
        this.cubeHeight = h;
        this.scene.traverse(function (ob) { if (ob.material && ob.material.defines && ob.material.defines.ENVMAP_TYPE_CUBE_UV != null) SA.retuneCube(ob.material, h); });
      }
    };
    Stage.prototype.stepMode = function (dt) {
      const x = this.envX;
      if (!x) return false;
      x.t += dt;
      const k = Math.min(1, x.t / SWITCH), e = SA.ease(k);
      if (k >= 1) { this.envX = null; this.setEnv(x.b); this.envLightU.value = x.target; }
      else {
        const mixed = SA.envMixTex(this.renderer, x.a, x.b, e);
        this.env = mixed; this.envU.value = mixed; this.scene.environment = mixed;
        this.envLightU.value = x.k0 + (x.target - x.k0) * e;
      }
      return true;
    };
    Stage.prototype.resize = function () {
      const w = Math.max(1, Math.round(this.container.clientWidth)), h = Math.max(1, Math.round(this.container.clientHeight));
      if (w === this.size.w && h === this.size.h) return;
      this.size = { w: w, h: h };
      this.renderer.setPixelRatio(this.dpr);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      if (this.onResize) this.onResize(w, h);
      this.invalidate();
    };
    Stage.prototype.shouldRun = function () { return this.visible && !this.paused && !document.hidden && !this.lost && !this.disposed; };
    Stage.prototype.wake = function () { if (this.shouldRun() && !this.untick) this.untick = AU.tick(this._tick); };
    Stage.prototype.sleep = function () { if (this.untick) { this.untick(); this.untick = null; } };
    Stage.prototype.invalidate = function () { this.dirty = true; this.wake(); };
    Stage.prototype.frame = function (t, dt) {
      try { this.frameInner(t, dt); }
      catch (e) {
        if (!this.errored) console.error('[Aurelia GL] scene frame failed', e);
        this.errored = true;
        this.sleep();
      }
    };
    Stage.prototype.frameInner = function (t, dt) {
      if (!this.shouldRun()) { this.sleep(); return; }
      if (this.hold) { this.sleep(); return; }
      dt = Math.min(dt || 0.016, 0.05);
      let moving = this.update ? !!this.update(t, dt) : false;
      if (this.stepMode(dt)) moving = true;
      if (moving || this.dirty) {
        this.draw();
        this.dirty = false;
        if (!this.shown) { this.shown = true; this.canvas.style.opacity = '1'; if (this.onShown) this.onShown(); if (this._drawn) this._drawn(this); }
        this.govern(dt, moving);
      }
      if (!moving) this.sleep();
    };
    /* the pixel ratio follows the frame times: a step down when frames keep running long, back up when they are quick */
    Stage.prototype.govern = function (dt, moving) {
      const P = this.perf;
      if (!moving) { P.n = 0; P.sum = 0; return; }
      P.n++; P.sum += dt;
      if (P.n < 90) return;
      const avg = P.sum / P.n;
      P.n = 0; P.sum = 0;
      P.slow = avg > 0.019 ? P.slow + 1 : 0;
      P.fast = avg < 0.0135 ? P.fast + 1 : 0;
      let d = this.dpr;
      if (P.slow >= 2 && d > this.dprMin + 0.01) { d = Math.max(this.dprMin, d - 0.25); P.slow = 0; }
      else if (P.fast >= 6 && d < this.dprCap - 0.01) { d = Math.min(this.dprCap, d + 0.25); P.fast = 0; }
      if (d !== this.dpr) {
        this.dpr = d;
        this.renderer.setPixelRatio(d);
        this.renderer.setSize(this.size.w, this.size.h, false);
        if (this.onResize) this.onResize(this.size.w, this.size.h);
      }
    };
    Stage.prototype.draw = function () { this.renderer.render(this.scene, this.camera); };
    Stage.prototype.track = function (x) { if (x) this.tracked.push(x); return x; };
    /* keep one material of each kind alive (not drawn): its compiled program stays with the renderer */
    Stage.prototype.keep = function (kind, mat) {
      if (!mat || this.keepers[kind]) return false;
      this.keepers[kind] = mat;
      this.tracked.push(mat);
      return true;
    };
    /* compile everything under root off the main thread (with the lighting in place, so the programs match) */
    Stage.prototype.compile = function (root, target) {
      const self = this;
      // (in a slice of its own: the lighting resolves at the end of its own slice, and a program's set-up on the main
      // thread chained straight onto it would make the two one long task)
      return this.ready.then(function () {
        return SA.slice(function compileProgram() { if (!self.disposed) return self.compileNow(root, target); });
      }, function () { /* disposed first */ });
    };
    /* the same at once: for materials whose programs do not depend on the lighting (the gem shaders, the passes), so
       they compile while the lighting is still being made. target: the render target they will be drawn into. */
    Stage.prototype.compileNow = function (root, target) {
      const r = this.renderer;
      if (!r.compileAsync) return Promise.resolve();
      const prev = r.getRenderTarget();
      let p;
      try { if (target !== undefined) r.setRenderTarget(target); p = r.compileAsync(root || this.scene, this.camera, this.scene); }
      catch (e) { p = null; }
      finally { if (target !== undefined) r.setRenderTarget(prev); }
      return this.wait(Promise.resolve(p).catch(function () { /* draw anyway */ }));
    };
    Stage.prototype.dispose = function () {
      if (this.disposed) return;
      this.sleep();
      this.disposed = true;
      try { this.ro.disconnect(); this.io.disconnect(); } catch (e) { /* ignore */ }
      this.offs.forEach(function (f) { f(); });
      document.removeEventListener('visibilitychange', this.onVis);
      if (this.cleanup) { try { this.cleanup(); } catch (e) { /* ignore */ } }
      // the page is left at once (the canvas goes now); the context is released once any GPU work in flight has
      // settled (at most a few seconds), so a compile never loses its context half way
      if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
      const self = this;
      const release = function () {
        if (self.released) return;
        self.released = true;
        const seen = new Set();
        const kill = function (x) { if (x && !seen.has(x) && x.dispose && !(x.userData && x.userData.shared)) { seen.add(x); try { x.dispose(); } catch (e) { /* ignore */ } } };
        self.scene.traverse(function (ob) {
          if (!ob.isSprite) kill(ob.geometry);            // (every sprite shares one three.js quad)
          (Array.isArray(ob.material) ? ob.material : [ob.material]).forEach(kill);
          if (ob.isInstancedMesh) { try { ob.dispose(); } catch (e) { /* ignore */ } }
        });
        self.tracked.forEach(kill);
        SA.envDispose(self.renderer);
        try { self.renderer.dispose(); } catch (e) { /* ignore */ }
        try { self.renderer.forceContextLoss(); } catch (e) { /* ignore */ }
      };
      if (!this.busy.size) { release(); return; }
      const all = Array.from(this.busy).map(function (p) { return p.catch(function () { /* settled */ }); });
      Promise.race([Promise.all(all), new Promise(function (res) { setTimeout(res, 6000); })]).then(release);
    };
    SA.Stage = Stage;

    /* ---------------- a picture of a stage (for the pre-rendered posters) ----------------
       Once the stage has presented its first frame: one more frame is computed and drawn, and the canvas is encoded in
       the same task (the drawing buffer is still there). -> Promise<{ data (base64), type, bytes, width, height }> */
    SA.capture = function (st, quality) {
      return st.firstDrawn.then(function () {
        return new Promise(function (res, rej) {
          requestAnimationFrame(function () {
            try {
              if (st.disposed) throw new Error('disposed');
              if (st.update) st.update(performance.now() / 1000, 0.0001);
              st.draw();
              const url = st.canvas.toDataURL('image/webp', quality || 0.86);
              const data = url.replace(/^data:[^,]*,/, ''), type = (/^data:([^;,]+)/.exec(url) || [])[1] || 'image/png';
              res({ data: data, type: type, bytes: Math.round(data.length * 3 / 4), width: st.canvas.width, height: st.canvas.height });
            } catch (e) { rej(e); }
          });
        });
      });
    };

    /* ---------------- pointer input: drag with velocity, taps ---------------- */
    SA.drag = function (el, h) {
      let d = null;
      const now = function () { return performance.now(); };
      const down = function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (d) return;
        d = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: now(), t0: now(), vx: 0, vy: 0, moved: false, touch: e.pointerType === 'touch', axis: null };
        try { el.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
        el.style.cursor = 'grabbing';
        if (h.down) h.down(d, e);
      };
      const move = function (e) {
        if (!d || e.pointerId !== d.id) { if (!d && h.hover && e.pointerType === 'mouse') h.hover(e); return; }
        const t = now(), dt = Math.max(1, t - d.t) / 1000;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 5) {
          d.moved = true;
          d.axis = Math.abs(e.clientX - d.x0) >= Math.abs(e.clientY - d.y0) ? 'x' : 'y';
        }
        d.vx = d.vx * 0.55 + dx / dt * 0.45; d.vy = d.vy * 0.55 + dy / dt * 0.45;
        d.x = e.clientX; d.y = e.clientY; d.t = t;
        if (d.moved && h.move) h.move(d, dx, dy, e);
      };
      const up = function (e) {
        if (!d || e.pointerId !== d.id) return;
        const fresh = now() - d.t < 110;
        if (!fresh) { d.vx = 0; d.vy = 0; }
        const was = d; d = null;
        el.style.cursor = 'grab';
        if (!was.moved && h.tap && e.type === 'pointerup') h.tap(e);
        if (h.up) h.up(was, e);
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      return function () {
        el.removeEventListener('pointerdown', down);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
        el.removeEventListener('lostpointercapture', up);
      };
    };

    /* the engine's glint stars, when the engine provides them */
    SA.glints = function (scene, n) {
      if (typeof GlGlints !== 'function') return null;
      try { return new GlGlints(scene, n || 2); } catch (e) { return null; }
    };
    /* glint candidates of a faceted cut (unit space; size relative to the stone's width): points on the crown facets
       and the table's edge, never its centre (a star sitting in the middle of the table reads as a cross stuck on the
       stone); small (a catch-light, not a sparkle filter) */
    SA.glintCands = function (cutName, obj, stone) {
      const cut = SA.cut(cutName);
      if (!cut || !cut.glints) return [];
      const L = cut.length || 1;
      return cut.glints.filter(function (g) {
        if (!/table|bezel|star|crown/.test(g.tag)) return false;
        return Math.hypot(g.p.x, g.p.z / L) > 0.17;
      }).map(function (g) { return { obj: obj, inst: -1, p: g.p.clone(), n: g.n.clone(), size: 0.3, stone: stone }; });
    };
  } catch (err) {
    console.error('[Aurelia GL] gl-scenes-a stage failed to load', err);
  }
}

/* ---- 66-gemlab.js ---- */
/* =====================================================================================================================
   gl-scenes-a Â· AUGL.gemLab(container, { stone, cut, carat, color, clarity, label })
     -> { set(o), view('home' | 'top' | 'side'), info(), pause(), resume(), dispose(), canvas, ready }
   One large loose stone on a slow turntable under the jeweller's lightbox, hovering over a fine millimetre reticle (a
   chapter ring with reference circles at 5, 10 and 15 mm, and a footprint ring that follows the stone's girdle), so a
   carat change reads as a real change of size: the camera never reframes for the stone.
     stone    any KIT.STONE_LIST name (pearl: a sphere; opal: a cabochon on the cut's outline)
     cut      round | oval | pear | cushion | emerald
     carat    0.1 – 5
     color    0..1  diamonds: 0 = D (colourless) … 1 = K (faint warm yellow); coloured stones: 0 = light, 0.5 = the
              stone's classic tone, 1 = deep; pearls: white, cream, golden; opal: white opal … black opal
     clarity  0..1  1 = flawless (nothing inside), 0.75 / 0.625 VVS, 0.5 / 0.375 VS, 0.25 / 0.125 SI, 0 = I1 (a minute
              point first, a few faint specks, then a crystal, feathers, a cloud; see SA.applyClarity); pearls: lustre
              and surface; opal: brightness of fire
   Every change is animated (sizes, tones and inclusions ease; a new stone morphs its optics in place; a new cut or a
   pearl / opal crossfades). Drag turns the stone (and, with a mouse, tilts the view: look down through the table to
   find the inclusions); double-click returns to the home view. Reduced motion: no turntable, changes without motion.
   ===================================================================================================================== */
{
  try {
    const SA = KIT._sa || (KIT._sa = {});
    const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    const GAP = 0.9;              // mm between the culet and the reticle
    const RING = 8.0;             // chapter ring radius (16 mm across)
    const TEXR = 9.6;             // half size of the reticle texture (mm)
    const HOME_EL = 0.6, TOP_EL = 1.32, SIDE_EL = 0.1, INSPECT_EL = 1.12;
    const SPIN = KIT.TAU / 28;    // one turn in 28 s
    /* the home view is face-up three-quarter: the camera stays where the page's drawn dial expects it (0.6 rad), and the
       stone leans its table toward the viewer by TILT (about 26 degrees), so the eye meets the table about 30 degrees
       from straight above: the table, the star and the arrows read, and the crown returns the light and the fire
       instead of showing its side. The lean fades out toward the side view (a profile is a profile) and toward the view
       from above (the table already faces up). */
    const TILT = 0.45;
    const sst = function (x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
    const tiltAt = function (el) {
      return TILT * (el <= HOME_EL ? sst((el - SIDE_EL) / (HOME_EL - SIDE_EL)) : 1 - sst((el - HOME_EL) / (INSPECT_EL - HOME_EL)));
    };
    /* the two small lamps above the viewer (SA.setLamps): a diamond's are bright (its whites and its fire come from
       them), a coloured stone's softer (its cap rolls them off in its own hue) */
    const LAMP_I = { diamond: 9, colour: 2.2 };
    /* the diamond studio's room, as a share of the lightbox's brightness (dark mode, light mode) */
    const STUDIO_ROOM = [0.2, 0.16];
    const lampC = new THREE.Vector3(), lampD = [new THREE.Vector3(), new THREE.Vector3()];

    /* ---------------- the reticle (static part): drawn once per stage on a canvas ---------------- */
    function drawReticle(canvas) {
      const S = canvas.width, k = S / (2 * TEXR), c = S / 2;
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, S, S);
      g.strokeStyle = '#fff'; g.fillStyle = '#fff';
      const circle = function (r, w, dash) {
        g.beginPath();
        g.lineWidth = w;
        if (dash) g.setLineDash(dash); else g.setLineDash([]);
        g.arc(c, c, r * k, 0, Math.PI * 2);
        g.stroke();
      };
      // chapter ring: two hairlines with a minute track between them
      circle(RING, 3.2);
      circle(RING + 0.42, 2.4);
      g.setLineDash([]);
      for (let i = 0; i < 120; i++) {
        const a = i / 120 * Math.PI * 2, L = i % 10 === 0 ? 0.42 : i % 5 === 0 ? 0.28 : 0.16;
        const ca = Math.cos(a), sa = Math.sin(a);
        g.beginPath();
        g.lineWidth = i % 10 === 0 ? 3 : 2.2;
        g.moveTo(c + ca * RING * k, c + sa * RING * k);
        g.lineTo(c + ca * (RING + L) * k, c + sa * (RING + L) * k);
        g.stroke();
      }
      // reference circles at 5, 10 and 15 mm across, finely dotted
      [2.5, 5, 7.5].forEach(function (r) {
        const n = Math.round(r * 2 * Math.PI / 0.16);
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2;
          g.beginPath();
          g.arc(c + Math.cos(a) * r * k, c + Math.sin(a) * r * k, 1.45, 0, Math.PI * 2);
          g.fill();
        }
      });
      // their diameters, in lining figures, where each circle crosses the axis on the right (read from the front)
      const fig = '300 ' + Math.round(0.62 * k) + 'px "Cormorant Infant", "Cormorant Garamond", Georgia, serif';
      const caps = '300 ' + Math.round(0.36 * k) + 'px "Cormorant Garamond", Georgia, serif';
      g.textBaseline = 'alphabetic';
      g.textAlign = 'left';
      [[2.5, '5'], [5, '10'], [7.5, '15']].forEach(function (L, i) {
        const x = c + (L[0] + 0.14) * k, y = c - 0.12 * k;
        g.font = fig;
        g.fillText(L[1], x, y);
        if (i === 2) {
          const w = g.measureText(L[1]).width;
          g.font = caps;
          try { g.letterSpacing = Math.round(0.06 * k) + 'px'; } catch (e) { /* ignore */ }
          g.fillText('MM', x + w + 0.12 * k, y);
          try { g.letterSpacing = '0px'; } catch (e) { /* ignore */ }
        }
      });
      // a short radial ruler from the 5 to the 15 mm circle along that axis: a tick every half millimetre of diameter
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(c + 2.5 * k, c + 0.06 * k); g.lineTo(c + 7.5 * k, c + 0.06 * k); g.stroke();
      for (let d = 5; d <= 15.001; d += 0.5) {
        const x = c + d / 2 * k, L = Math.abs(d - Math.round(d)) < 0.01 ? (Math.round(d) % 5 === 0 ? 0.3 : 0.2) : 0.11;
        g.beginPath(); g.moveTo(x, c + 0.06 * k); g.lineTo(x, c + (0.06 + L) * k); g.stroke();
      }
    }

    const FLOOR_V = `
varying vec2 vP;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vP = wp.xz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
    const FLOOR_F = `
uniform sampler2D uTex;
uniform float uTexR;
uniform vec3 uLine;
uniform float uLineA;
uniform float uFootW;
uniform float uFootL;
uniform float uLong;
uniform vec3 uShadow;
uniform vec3 uShadowCol;
uniform vec3 uGlowCol;
uniform float uGlowA;
uniform float uGlowR;
uniform vec2 uGlowOff;
uniform float uFadeR;
uniform float uFade;
uniform float uReveal;
uniform float uFootA;
varying vec2 vP;
float hair(float d, float w) { float fw = fwidth(d); return 1.0 - smoothstep(w, w + fw * 1.25, abs(d)); }
void main() {
  float r = length(vP);
  vec2 uv = vec2(vP.x / (2.0 * uTexR) + 0.5, 0.5 - vP.y / (2.0 * uTexR));
  float tex = 0.0;
  if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) tex = texture2D(uTex, uv).a;
  // the reticle draws itself in: a sweep round the dial from the front, the finer marks a beat behind it
  float ang = fract(atan(vP.x, vP.y) / 6.2831853 + 1.0);
  float sweep = smoothstep(ang - 0.06, ang, uReveal * 1.08 - 0.02);
  tex *= sweep * (0.35 + 0.65 * smoothstep(0.35, 1.0, uReveal));
  // whole-millimetre circles (of diameter) near the stone's size, fading away from it
  float dia = r * 2.0;
  float kk = floor(dia + 0.5);
  float near = hair((dia - kk) * 0.5, 0.008) * exp(-pow((kk - uFootW) / 1.35, 2.0)) * 0.32 * step(1.5, kk) * uFootA;
  // the footprint: a ring at the girdle's width (and a fainter one at its length, for long cuts)
  float foot = (hair(r - uFootW * 0.5, 0.013) * 0.95 + hair(r - uFootL * 0.5, 0.011) * 0.5 * uLong) * uFootA;
  float lines = clamp(tex * 0.62 + near + foot, 0.0, 1.0) * uLineA;
  float sh = exp(-pow(r / max(0.01, uShadow.x), 2.0) * 2.0) * uShadow.z;
  vec2 gp = vP - uGlowOff;
  float gl = exp(-dot(gp, gp) / (uGlowR * uGlowR)) * uGlowA;
  float fade = (1.0 - smoothstep(uFadeR * 0.82, uFadeR, r)) * uFade;
  vec3 col = uLine * lines + uShadowCol * sh * (1.0 - lines) + uGlowCol * gl;
  float a = lines + sh * (1.0 - lines) + gl * 0.55;
  gl_FragColor = vec4(col, min(a, 1.0)) * fade;
}`;
    const LOOK = {
      dark: { line: [1, 1, 1], lineA: 0.42, shadow: [0.06, 0.012, 0.012], shadowA: 0.5, glowA: 0.2 },
      light: { line: [0.282, 0.031, 0.027], lineA: 0.5, shadow: [0.365, 0.247, 0.235], shadowA: 0.3, glowA: 0.2 }
    };

    const SRGB = {};
    /* a stone's hue in display values (cached: read every frame) */
    function srgbOf(hex) {
      if (!SRGB[hex]) { const c = new THREE.Color(hex); c.convertLinearToSRGB(); SRGB[hex] = [c.r, c.g, c.b]; }
      return SRGB[hex].slice();
    }

    /* ---------------- the stone wanted, and its size ---------------- */
    const labNorm = function (x) {
      const s = Object.assign({}, x || {});
      const r = {};
      r.stone = KIT.STONES[s.stone] ? s.stone : 'diamond';
      r.kind = SA.kindOf(r.stone);
      r.cut = KIT.CUTS.indexOf(s.cut) >= 0 ? s.cut : 'round';
      const c = +s.carat;
      r.carat = isFinite(c) && c > 0 ? clamp(c, 0.1, 5) : 1;
      const defColor = r.stone === 'diamond' ? 0.12 : r.kind === 'pearl' ? 0.15 : r.kind === 'opal' ? 0.2 : 0.55;
      r.color = isFinite(+s.color) && s.color !== null && s.color !== '' ? clamp(+s.color, 0, 1) : defColor;
      r.clarity = isFinite(+s.clarity) && s.clarity !== null && s.clarity !== '' ? clamp(+s.clarity, 0, 1) : 0.92;
      return r;
    };
    const labDims = function (w) {
      if (w.kind === 'pearl') { const d = clamp(KIT.size('round', w.carat).width * 1.12, 3, 11.5); return { W: d, L: d }; }
      const z = KIT.size(w.cut, w.carat);
      // a cabochon's outline is its own (an oval cabochon is calibrated 10 x 8)
      return w.kind === 'opal' ? { W: z.width * 1.06, L: z.width * 1.06 * SA.cabShape(w.cut, 'high').length } : { W: z.width, L: z.length };
    };
    /* the shape a stone is made from (unit space) */
    const labShape = function (w) {
      if (w.kind === 'faceted') { const c = SA.cut(w.cut); return c ? { geometry: c.geometry, crown: c.crown, pav: c.pavilion, len: c.length } : null; }
      const s = w.kind === 'pearl' ? SA.pearlShape('high') : SA.cabShape(w.cut, 'high');
      return { geometry: s.geometry, crown: s.crown, pav: s.pavilion, len: s.length };
    };
    /* its bounding sphere over the reticle (world, mm), as the scene fits it */
    const labSphere = function (w) {
      const sh = labShape(w);
      if (!sh) return null;
      const W = labDims(w).W, geo = sh.geometry;
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      const base = GAP + (w.kind === 'pearl' ? W / 2 : sh.pav * W);
      return { y: base + geo.boundingSphere.center.y * W, r: geo.boundingSphere.radius * W };
    };
    const topFor = function (kind) { return kind === 'pearl' ? 12.6 : 8.6; };

    /* ---------------- the camera ----------------
       labCamera(camera, w, h, el, top, fit, frame): the framing of a stage of w x h px at elevation el: the whole
       reticle, the room above it (top: the tallest stone of this kind at 5 ct; a pearl stands much taller than a cut
       stone) and the stone's sphere fit = { y, r } (with a 12% margin), within the margins frame = { top, bottom }
       (fractions of the height kept free: the default leaves the foot of the stage to the page's caption). The scene,
       its poster and the poster's place on the page all use it, so they agree to the pixel. -> { D, aimY, off } */
    const FIT_RING = [];
    for (let i = 0; i < 36; i++) { const a = i / 36 * KIT.TAU; FIT_RING.push(new THREE.Vector3(Math.cos(a) * (RING + 0.55), 0, Math.sin(a) * (RING + 0.55))); }
    const TOPS = [[-5.6, 0.93], [5.6, 0.93], [0, 1]].map(function (p) { const v = new THREE.Vector3(p[0], 8, 0); v.k = p[1]; return v; });
    const SPH = [0, 1, 2, 3, 4, 5, 6, 7].map(function () { return new THREE.Vector3(); });
    const cDir = new THREE.Vector3(), cRight = new THREE.Vector3(), cUp = new THREE.Vector3(), cQ = new THREE.Vector3();
    const labMargins = function (f, aspect) {
      f = f || {};
      return {
        top: isFinite(+f.top) && f.top !== null ? clamp(+f.top, 0, 0.4) : 0.05,
        bottom: isFinite(+f.bottom) && f.bottom !== null ? clamp(+f.bottom, 0, 0.4) : (aspect < 1 ? 0.19 : 0.15)
      };
    };
    function labCamera(cam, w, h, el, top, fit, frameOpt) {
      cam.aspect = w / h;
      cDir.set(0, Math.sin(el), Math.cos(el));
      cRight.set(1, 0, 0);
      cUp.crossVectors(cDir, cRight).normalize();
      const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), th = tv * cam.aspect;
      const mx = cam.aspect < 1 ? 0.04 : 0.06, M = labMargins(frameOpt, cam.aspect), my = (M.top + M.bottom) / 2;
      TOPS.forEach(function (v) { v.y = top * v.k; });
      let pts = FIT_RING.concat(TOPS);
      if (fit && fit.r > 0) {
        const r = fit.r * 1.12;
        for (let i = 0; i < 8; i++) { const a = i / 8 * KIT.TAU; SPH[i].set(0, fit.y, 0).addScaledVector(cUp, Math.cos(a) * r).addScaledVector(cRight, Math.sin(a) * r); }
        pts = pts.concat(SPH);
      }
      let aimY = 3.0, D = 60;
      for (let it = 0; it < 4; it++) {
        D = 1;
        let y0 = Infinity, y1 = -Infinity;
        pts.forEach(function (p) {
          cQ.set(p.x, p.y - aimY, p.z);
          const z = cQ.dot(cDir), x = Math.abs(cQ.dot(cRight)), y = Math.abs(cQ.dot(cUp));
          D = Math.max(D, z + x / (th * (1 - 2 * mx)), z + y / (tv * (1 - 2 * my)));
        });
        pts.forEach(function (p) {
          cQ.set(p.x, p.y - aimY, p.z);
          const z = cQ.dot(cDir), py = cQ.dot(cUp) / (D - z);
          y0 = Math.min(y0, py); y1 = Math.max(y1, py);
        });
        aimY += (y0 + y1) / 2 * D / Math.max(0.25, Math.cos(el)) * 0.9;
      }
      cam.position.set(0, aimY + Math.sin(el) * D, Math.cos(el) * D);
      cam.near = Math.max(0.5, D - 30); cam.far = D + 40;
      cam.lookAt(0, aimY, 0);
      // the composition sits in the band between the margins (it is framed for their mean, then the picture is shifted
      // by their difference)
      const off = (M.bottom - M.top) * h / 2;
      if (Math.abs(off) > 0.25) cam.setViewOffset(w, h, 0, off, w, h);
      else cam.clearViewOffset();
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      return { D: D, aimY: aimY, off: Math.abs(off) > 0.25 ? off : 0 };
    }
    /* where the stone's sphere (centre y, radius r) shows on a stage of w x h px, with the camera as labCamera left it:
       { x, y } its centre in px from the stage's top left, s the side of the square a poster of it covers */
    const POSTER_PAD = 1.3;
    const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pU = new THREE.Vector3();
    function labRect(cam, w, h, y, r) {
      pA.set(0, y, 0).project(cam);
      pU.setFromMatrixColumn(cam.matrixWorld, 1).normalize();
      pB.set(0, y, 0).addScaledVector(pU, r).project(cam);
      const x0 = (pA.x + 1) / 2 * w, y0 = (1 - pA.y) / 2 * h;
      const rr = Math.hypot((pB.x - pA.x) / 2 * w, (pB.y - pA.y) / 2 * h);
      return { x: x0, y: y0, s: 2 * rr * POSTER_PAD };
    }
    /* the poster of a stone as it first appears (home view), placed on a stage of w x h px: { x, y, s } or null */
    const tmpCam = new THREE.PerspectiveCamera(24, 1, 1, 2000);
    SA.labPosterRect = function (w, h, o) {
      if (!(w > 0 && h > 0)) return null;
      const want = labNorm(o), sp = labSphere(want);
      if (!sp) return null;
      labCamera(tmpCam, w, h, HOME_EL, topFor(want.kind), sp, o && o.frame);
      return labRect(tmpCam, w, h, sp.y, sp.r);
    };
    SA.labNorm = labNorm;

    function gemLab(container, o) {
      o = o || {};
      /* o._poster = { ref: { w, h }, mode }: render the poster of the stone (tools/prerender.js through
         AUGL.scenePoster): only the stone, as it first appears on a stage of ref.w x ref.h, in the square round it */
      const poster = o._poster && o._poster.ref ? o._poster : null;
      const st = new SA.Stage(container, poster ? { kind: 'gemlab', label: 'poster', fov: 24, mode: poster.mode, pixelRatio: poster.dpr || 1 }
        : { kind: 'gemlab', label: o.label || 'A loose stone, turning slowly', fov: 24 });
      // a poster stands in for the scene: the stone starts exactly as its picture (no arrival, the turntable eases in)
      const fromPoster = !poster && !!o._fromPoster;
      const reduced = function () { return !!AU.reduced; };
      const bounces = Math.min(8, (SA.tier().bounces || 6) + 1);

      /* ---- floor ----
         The constructor only makes the stage and returns: the reticle is drawn (once its type faces are there), uploaded
         and compiled in short slices of its own, and the first stone follows in another, so nothing here is a long task
         on the page's first moments. */
      const tc = document.createElement('canvas');
      tc.width = tc.height = AU.touch ? 1536 : 2048;
      const tex = st.track(new THREE.CanvasTexture(tc));
      tex.anisotropy = Math.min(8, st.renderer.capabilities.getMaxAnisotropy());
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      const FACES = ['300 40px "Cormorant Infant"', '300 30px "Cormorant Garamond"'], GLYPHS = ['0123456789', 'MM'];
      const facesIn = function () {
        try { return !document.fonts || !document.fonts.check || FACES.every(function (f, i) { return document.fonts.check(f, GLYPHS[i]); }); } catch (e) { return true; }
      };
      let drawnWith = null;
      const drawSlices = function () {
        return SA.slice(function reticleDraw() {
          if (st.disposed) return;
          drawnWith = facesIn();
          drawReticle(tc);
          tex.needsUpdate = true;
        }).then(function () {
          return SA.slice(function reticleUpload() {
            if (st.disposed) return;
            // the texture goes to the GPU now, in its own slice, not inside the first frame that shows it
            try { st.renderer.initTexture(tex); } catch (e) { /* uploaded on first use */ }
            st.invalidate();
          });
        });
      };
      // the figures wait for their faces (briefly: a dial in the fallback face is redrawn when they arrive)
      const facesP = facesIn() || !document.fonts || !document.fonts.load ? Promise.resolve()
        : Promise.race([Promise.all(FACES.map(function (f, i) { return document.fonts.load(f, GLYPHS[i]); })), new Promise(function (r) { setTimeout(r, 900); })]);
      const reticle = facesP.catch(function () { /* fallback face */ }).then(drawSlices);
      reticle.then(function () {
        if (drawnWith || st.disposed || !document.fonts || !document.fonts.load) return;
        Promise.all(FACES.map(function (f, i) { return document.fonts.load(f, GLYPHS[i]); })).then(function () { if (!st.disposed) drawSlices(); }, function () { /* keep it */ });
      });
      const fu = {
        uTex: { value: tex }, uTexR: { value: TEXR },
        uLine: { value: new THREE.Vector3(1, 1, 1) }, uLineA: { value: 0.4 },
        uFootW: { value: 6.4 }, uFootL: { value: 6.4 }, uLong: { value: 0 },
        uShadow: { value: new THREE.Vector3(3, 0, 0.5) }, uShadowCol: { value: new THREE.Vector3() },
        uGlowCol: { value: new THREE.Vector3() }, uGlowA: { value: 0 }, uGlowR: { value: 3 }, uGlowOff: { value: new THREE.Vector2() },
        uFadeR: { value: TEXR + 0.6 }, uFade: { value: 0 }, uReveal: { value: AU.reduced ? 1 : 0 }, uFootA: { value: 0 }
      };
      const floorMat = new THREE.ShaderMaterial({
        name: 'au-lab-floor', vertexShader: FLOOR_V, fragmentShader: FLOOR_F, uniforms: fu,
        transparent: true, premultipliedAlpha: true, depthWrite: false, toneMapped: false
      });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * (TEXR + 0.6), 2 * (TEXR + 0.6)), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.renderOrder = -1;
      st.scene.add(floor);
      // (a poster is the stone alone: the page draws the reticle under it)
      if (poster) floor.visible = false;
      // the reticle needs no lighting: it is compiled at once (off the main thread) and draws itself in while the stone
      // is being prepared
      // (in a slice of its own, after the one that made the context: together they would be one long task)
      const floorReady = SA.slice(function floorCompile() { if (!st.disposed) return st.compileNow(floor); });
      Promise.all([floorReady, reticle]).then(function () { if (!st.disposed) { st.hold = false; st.invalidate(); } });

      /* ---- state ---- */
      const norm = labNorm, dims = labDims;
      let want = norm(o);
      const d0 = dims(want);
      const S = {
        turn: -0.5, vel: 0, el: SA.spring(HOME_EL, 2.6), spin: AU.reduced || poster || fromPoster ? 0 : 1, idle: 0, drag: false,
        W: SA.spring(d0.W, 5.2), L: SA.spring(d0.L, 5.2),
        color: SA.spring(want.color, 5), clarity: SA.spring(want.clarity, 4.2),
        glow: SA.spring(0, 4), D: null, aimY: 2.4, reveal: AU.reduced ? 1 : 0,
        // still: the stone holds the pose of its poster (until it has taken over from it); floorK: the footprint and the
        // shadow ease in under a stone that was there at once
        still: !!(poster || fromPoster), floorK: fromPoster ? 0 : 1
      };
      let slots = [], primary = null, order = 0;

      const setAlpha = function (sl, a) {
        sl.alpha = a;
        sl.g.visible = a > 0.002;
        if (sl.mat.uniforms && sl.mat.uniforms.uOpacity) sl.mat.uniforms.uOpacity.value = a;
        else sl.mat.opacity = a;
      };
      const makeSlot = function (w) {
        const g = new THREE.Group();
        const sl = { kind: w.kind, cut: w.cut, stone: w.stone, g: g, alpha: 0, s: 1, extra: 0, morph: null, cands: [] };
        if (w.kind === 'faceted') {
          const cut = SA.cut(w.cut);
          sl.mat = SA.labGem(w.cut, w.stone, { envU: st.envU, envLightU: st.envLightU, incl: true, bounces: bounces, cubeHeight: st.cubeHeight });
          if (!cut || !sl.mat) return null;
          sl.mesh = new THREE.Mesh(cut.geometry, sl.mat);
          sl.unit = { crown: cut.crown, pav: cut.pavilion, len: cut.length };
          sl.lay = SA.inclusionLayout(w.cut);
          sl.params = SA.stoneParams(w.stone, w.cut);
          sl.cands = SA.glintCands(w.cut, sl.mesh, w.stone);
        } else {
          const shape = w.kind === 'pearl' ? SA.pearlShape('high') : SA.cabShape(w.cut, 'high');
          sl.mat = w.kind === 'pearl' ? SA.pearlMaterial({ seed: 3 }) : SA.opalMaterial({ seed: 5, scale: 7.4 });
          sl.mesh = new THREE.Mesh(shape.geometry, sl.mat);
          sl.unit = { crown: shape.crown, pav: shape.pavilion, len: shape.length };
        }
        // its bounding sphere in unit space (the camera keeps it in view with a margin, whatever the carat)
        const geo = sl.mesh.geometry;
        if (!geo.boundingSphere) geo.computeBoundingSphere();
        sl.sphere = { y: geo.boundingSphere.center.y, r: geo.boundingSphere.radius };
        // every stone is convex (no part of it can hide another), so none needs to write depth; a newer stone is
        // simply drawn over an older one, and a change of stone is a true dissolve, never one stone punching out the other
        sl.mat.transparent = true;
        sl.mat.depthWrite = false;
        sl.mesh.renderOrder = ++order;
        g.add(sl.mesh);
        st.scene.add(g);
        setAlpha(sl, 0);
        return sl;
      };
      const dropSlot = function (sl) {
        slots = slots.filter(function (x) { return x !== sl; });
        st.scene.remove(sl.g);
        // the first stone of each kind keeps its material (and so its compiled program) for a later swap back
        if (!st.keep(sl.kind, sl.mat)) { try { sl.mat.dispose(); } catch (e) { /* ignore */ } }
      };

      /* the look of a stone for the current colour / clarity values */
      const PEARL = SA.PEARL_TONES;
      const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
      const pearlTone = function (c, key, out) {
        const a = c < 0.5 ? PEARL.white : PEARL.cream, b = c < 0.5 ? PEARL.cream : PEARL.golden, k = c < 0.5 ? c * 2 : (c - 0.5) * 2;
        out.set(a[key]); tmpC2.set(b[key]); return out.lerp(tmpC2, SA.ease(k));
      };
      const tintV = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
      const grade = function (sl) {
        const c = S.color.v, q = S.clarity.v, m = sl.mat;
        if (sl.kind === 'faceted') {
          const u = m.uniforms;
          // during a morph the grading blends between the two stones' rules (a diamond warms, a coloured stone deepens)
          const dia = function (stone) { return stone === 'diamond' ? 1 : 0; };
          let wd = dia(sl.stone);
          if (sl.morph) wd = dia(sl.morph.from) + (dia(sl.morph.to) - dia(sl.morph.from)) * sl.morph.e;
          // a coloured stone's tone: along its own light -> deep axis when it has one (the hue holds), else deeper or
          // paler absorption
          SA.applyTone(m, sl.cur || sl.params, c);
          u.uDepth.value = wd + (1 - wd) * u.uDepth.value;
          u.uToneK.value.lerp(ONE, wd);
          SA.diamondTint(c, tintV).multiplyScalar(wd);
          u.uTint.value.copy(tintV);
          SA.applyClarity(m, sl.lay, q, 0.6 + 0.4 * wd);
          sl.diamond = wd;
        } else if (sl.kind === 'pearl') {
          pearlTone(c, 'body', m.color);
          pearlTone(c, 'o1', m.userData.au.uAuOver1.value);
          pearlTone(c, 'o2', m.userData.au.uAuOver2.value);
          // lustre: a fine pearl is a near mirror (the softbox shows as a crisp window), a poor one goes soft and dull
          m.clearcoatRoughness = 0.06 + 0.18 * (1 - q);
          m.clearcoat = 0.75 + 0.25 * q;
          m.roughness = 0.3 + 0.16 * (1 - q);
          m.iridescence = 0.55 + 0.25 * q;
          m.userData.au.uAuBlem.value = Math.pow(1 - q, 1.4);
          m.userData.au.uAuOrient.value = 0.4 + 0.5 * q;
          sl.diamond = 0;
        } else {
          // white opal ... black opal; clarity is the brilliance of the fire (a fine stone's patches are pure and bright)
          SA.opalTone(m, c);
          m.userData.au.uAuFire.value = 0.35 + 0.95 * q;
          m.userData.au.uAuSat.value = 0.7 + 0.25 * q;
          sl.diamond = 0;
        }
      };
      /* the light the stone throws on the reticle, and the look of the reticle in this mode */
      const floorLook = function () {
        const k = st.envLightU.value;
        const A = LOOK.dark, B = LOOK.light;
        const l = function (x, y) { return x + (y - x) * k; };
        fu.uLine.value.set(l(A.line[0], B.line[0]), l(A.line[1], B.line[1]), l(A.line[2], B.line[2]));
        fu.uLineA.value = l(A.lineA, B.lineA);
        fu.uShadowCol.value.set(l(A.shadow[0], B.shadow[0]), l(A.shadow[1], B.shadow[1]), l(A.shadow[2], B.shadow[2]));
        const W = S.W.v;
        const here = slots.reduce(function (m, s) { return Math.max(m, s.alpha); }, 0) * SA.ease(S.floorK);
        fu.uFootA.value = here;
        fu.uShadow.value.set(W * 0.42 + 0.4, 0, l(A.shadowA, B.shadowA) * here);
        fu.uFootW.value = W;
        fu.uFootL.value = S.L.v;
        fu.uLong.value = clamp((S.L.v / Math.max(0.1, W) - 1.04) * 6, 0, 1);
        const pr = primary || slots[slots.length - 1];
        if (pr) {
          const hue = srgbOf((KIT.STONES[pr.morph ? pr.morph.to : pr.stone] || {}).hue || '#ffffff');
          if (pr.morph && KIT.STONES[pr.morph.from]) {
            const h0 = srgbOf(KIT.STONES[pr.morph.from].hue || '#ffffff');
            for (let i = 0; i < 3; i++) hue[i] = h0[i] + (hue[i] - h0[i]) * pr.morph.e;
          }
          fu.uGlowCol.value.fromArray(hue);
        }
        fu.uGlowA.value = S.glow.v * l(A.glowA, B.glowA) * (pr ? pr.alpha : 0);
        fu.uGlowR.value = W * 0.5;
        fu.uGlowOff.value.set(W * 0.46, -W * 0.42);
      };

      /* ---- camera: fixed framing for the largest stone and the whole reticle, at the current elevation (labCamera) ----
         The stone itself: its bounding sphere with a 12% margin always stays in view. For most stones the reticle and the
         room above it already frame it (the framing then matches the page's drawn dial exactly); a large stone, or a view
         from above, eases the camera back (a dolly that follows the carat over about 0.8 s). The reticle is in the same
         space as the stone, so its millimetres stay honest whatever the camera does. */
      S.top = SA.spring(topFor(want.kind), 3.2);
      S.fitY = SA.spring(0, 5.5); S.fitR = SA.spring(0, 5.5);
      const sphereOf = function (sl, W, s) {
        if (!sl || !sl.sphere) return null;
        const base = GAP + (sl.kind === 'pearl' ? W / 2 : sl.unit.pav * W);
        return { y: base + sl.sphere.y * W * s, r: sl.sphere.r * W * s };
      };
      const fitNow = { y: 0, r: 0 };
      const placeCamera = function () {
        fitNow.y = S.fitY.v; fitNow.r = S.fitR.v;
        const w = poster ? poster.ref.w : st.size.w, h = poster ? poster.ref.h : st.size.h;
        const c = labCamera(st.camera, w, h, S.el.v, S.top.v, fitNow.r > 0 ? fitNow : null, o.frame);
        S.D = c.D; S.aimY = c.aimY;
        // a poster: the square round the stone, cut out of the stage it is made for
        if (poster) {
          const rc = labRect(st.camera, w, h, S.fitY.v, S.fitR.v);
          st.camera.setViewOffset(w, h, rc.x - rc.s / 2, rc.y - rc.s / 2 + c.off, rc.s, rc.s);
          st.camera.updateProjectionMatrix();
        }
      };
      st.onResize = function () { placeCamera(); };

      /* ---- glints (the engine's four-point stars, on diamonds only) ----
         A round stone on a turntable under fixed lights flares on the same facet position every time (the front bezel),
         so the star would sit still on the table like a cross. The lights the glints look for drift instead: slowly
         round with the turn and toward the pointer, so a star travels from facet to facet across the crown. */
      const glints = SA.glints(st.scene, 2);
      let glintSlot = null;
      const KEYS0 = (typeof G_KEY_DIRS !== 'undefined' && Array.isArray(G_KEY_DIRS) && G_KEY_DIRS.length ? G_KEY_DIRS
        : [new THREE.Vector3(-0.55, 0.62, 0.56), new THREE.Vector3(0.92, 0.16, 0.36), new THREE.Vector3(0.06, 1, 0.18)]).map(function (v) { return v.clone().normalize(); });
      const keys = KEYS0.map(function (v) { return v.clone(); });
      const keyAx = new THREE.Vector3(0, 1, 0);
      S.hover = SA.spring(0, 2.2);
      if (glints) glints.keys = keys;
      const driftKeys = function () {
        const a = S.turn * 0.55 + S.hover.v * 0.7;
        for (let i = 0; i < keys.length; i++) keys[i].copy(KEYS0[i]).applyAxisAngle(keyAx, a);
      };
      const syncGlints = function () {
        if (!glints) return;
        const pr = primary;
        if (pr !== glintSlot) {
          glintSlot = pr;
          glints.set(pr && pr.kind === 'faceted' ? pr.cands : []);
        }
      };

      /* ---- transitions ---- */
      let tweens = [];
      const tween = function (dur, fn, done) {
        const tw = { t: 0, dur: Math.max(0.0001, dur), fn: fn, done: done };
        tweens.push(tw);
        st.invalidate();
        return tw;
      };
      const runTweens = function (dt) {
        if (!tweens.length) return false;
        tweens = tweens.filter(function (tw) {
          tw.t += dt;
          const k = Math.min(1, tw.t / tw.dur);
          tw.fn(k);
          if (k >= 1) { if (tw.done) tw.done(); return false; }
          return true;
        });
        return true;
      };
      let compiling = null, started = false, initial = null;
      const swapTo = function (w) {
        const sl = makeSlot(w);
        if (!sl) return Promise.resolve();
        slots.push(sl);
        grade(sl);
        const old = primary;
        const first = st.hold;
        // compiled once the lighting exists, never alongside it: a compile polls the GPU for its status, and while the
        // lighting is being rendered each poll would wait on the GPU and stall the page
        const root = first ? st.scene : sl.g;
        const comp = st.compile(root);
        const p = compiling = comp.then(function () {
          if (first && !st.disposed) { st.hold = false; st.invalidate(); }
          if (st.disposed || p !== compiling) { if (!st.disposed && slots.indexOf(sl) >= 0 && sl !== primary) dropSlot(sl); return; }
          const red = reduced();
          // the old stone dissolves (turning on a little, settling smaller); the new one arrives a beat later, turning
          // into place, so the two overlap only briefly
          if (old) {
            const a0 = old.alpha, s0 = old.s, x0 = old.extra;
            tween(red ? 0.25 : 0.5, function (k) {
              const e = SA.ease(k);
              setAlpha(old, a0 * (1 - e));
              old.s = s0 - (red ? 0 : 0.06 * e);
              old.extra = x0 + (red ? 0 : 0.3 * e);
            }, function () { dropSlot(old); });
          }
          // any other half-arrived stone leaves too
          slots.forEach(function (x) {
            if (x !== sl && x !== old && x.alpha > 0) {
              const a1 = x.alpha;
              tween(0.3, function (k) { setAlpha(x, a1 * (1 - SA.ease(k))); }, function () { dropSlot(x); });
            }
          });
          primary = sl;
          // the first stone after a poster (or of a poster) is there at once, exactly as the picture
          if (!old && S.still) {
            setAlpha(sl, 1); sl.s = 1; sl.extra = 0;
            if (fromPoster) {
              st.invalidate();
              // drawn and presented: the scene can take over from the picture (it holds still until the picture has gone,
              // api._release; then the turntable eases in)
              requestAnimationFrame(function () {
                requestAnimationFrame(function () { if (api._tookOver) api._tookOver(); });
              });
            }
            if (!poster) setTimeout(function () { syncGlints(); }, 280);
            return;
          }
          sl.s = red ? 1 : 0.955; sl.extra = red ? 0 : -0.45;
          const delay = old && !red ? 0.18 : 0;
          tween((red ? 0.3 : 1.0) + delay, function (k) {
            const u = Math.max(0, (k * ((red ? 0.3 : 1.0) + delay) - delay) / (red ? 0.3 : 1.0));
            const e = SA.easeOut(u);
            setAlpha(sl, e);
            sl.s = red ? 1 : 0.955 + 0.045 * e;
            sl.extra = red ? 0 : -0.45 * (1 - e);
          }, null);
          // the glints move over once the old stone has mostly gone
          setTimeout(function () { syncGlints(); }, red ? 0 : 280);
          st.invalidate();
        });
        return p;
      };
      const morphTo = function (sl, stone) {
        const from = sl.morph ? null : sl.stone;
        const p0 = sl.morph && sl.cur ? JSON.parse(JSON.stringify(sl.cur)) : SA.stoneParams(sl.stone, sl.cut);
        const p1 = SA.stoneParams(stone, sl.cut);
        const f = sl.morph ? sl.morph.from : from;
        sl.morph = { from: f, to: stone, e: 0 };
        sl.stone = stone;
        sl.cands.forEach(function (c) { c.stone = stone === 'diamond' || f === 'diamond' ? 'diamond' : stone; });
        if (glints && glintSlot === sl) glints.set(sl.cands);
        const red = reduced();
        sl.cur = SA.mixParams(p0, p1, 0);
        tween(red ? 0.01 : 1.0, function (k) {
          const e = SA.ease(k);
          sl.morph.e = e;
          SA.mixParams(p0, p1, e, sl.cur);
          SA.applyParams(sl.mat, sl.cur);
        }, function () {
          sl.morph = null;
          sl.cands.forEach(function (c) { c.stone = stone; });
          if (glints && glintSlot === sl) glints.set(sl.cands);
        });
      };

      const api = {};
      // (after a poster: resolves once the live stone has been presented in its place)
      api.tookOver = fromPoster ? new Promise(function (res) { api._tookOver = res; }) : Promise.resolve();
      api._release = function () { if (S.still && !poster) { S.still = false; st.invalidate(); } };
      api.set = function (x) {
        if (st.disposed) return Promise.resolve();
        if (x && x.frame) { o.frame = x.frame; placeCamera(); st.invalidate(); }
        const merged = Object.assign({}, want, x || {});
        // a colour value means something else for another kind of stone (D..K, light..deep, white..golden): a new stone
        // without a colour of its own takes its classic one
        if (x && x.stone && x.stone !== want.stone && x.color == null) delete merged.color;
        const next = norm(merged);
        const prev = want;
        want = next;
        // another stone before the scene has taken over from its poster: the poster steps back, the stone arrives as usual
        if (fromPoster && S.still && JSON.stringify(prev) !== JSON.stringify(next)) {
          S.still = false; S.floorK = 1;
          if (api._dropPoster) api._dropPoster();
          if (api._tookOver) api._tookOver();
        }
        const dm = dims(next);
        const red = reduced();
        S.W.to(dm.W); S.L.to(dm.L);
        S.color.to(next.color); S.clarity.to(next.clarity);
        if (red) { S.W.snap(); S.L.snap(); S.color.snap(); S.clarity.snap(); }
        // a change of clarity is a request to look inside: the view leans over the table, as a gemmologist looks
        // through it with a loupe (from the side, the table only mirrors the lights), and drifts home a while later
        if (next.kind === 'faceted' && Math.abs(next.clarity - prev.clarity) > 0.0005 && !red) { S.el.w = 2.4; S.el.to(INSPECT_EL); S.idle = 0; }
        const geo = function (w) { return w.kind === 'faceted' ? 'f|' + w.cut : w.kind === 'pearl' ? 'p' : 'o|' + w.cut; };
        // (before the first stone is made, it is simply made as it is now wanted)
        if (!started) { st.invalidate(); return initial; }
        if (!primary || geo(prev) !== geo(next)) return swapTo(next);
        if (prev.stone !== next.stone && primary.kind === 'faceted') morphTo(primary, next.stone);
        st.invalidate();
        return Promise.resolve();
      };
      // the stone moves before the page has let its poster go: the poster steps back at once
      const letGo = function () {
        if (!fromPoster || !S.still) return;
        S.still = false;
        if (api._dropPoster) api._dropPoster();
      };
      api.view = function (name) {
        if ((name || 'home') !== 'home') letGo();
        S.el.w = 2.4; S.el.to(name === 'top' ? TOP_EL : name === 'side' ? SIDE_EL : HOME_EL);
        S.idle = name === 'home' || !name ? 99 : -6;
        if (reduced()) S.el.snap();
        st.invalidate();
      };
      api.info = function () {
        const dm = dims(want);
        return { stone: want.stone, cut: want.kind === 'pearl' ? null : want.cut, carat: want.carat, color: want.color, clarity: want.clarity,
          width: Math.round(dm.W * 100) / 100, length: Math.round(dm.L * 100) / 100 };
      };
      api.setLabel = function (text) { if (text) st.canvas.setAttribute('aria-label', String(text)); };
      api.pause = function () { st.paused = true; st.sleep(); };
      api.resume = function () { st.paused = false; st.invalidate(); };
      api.dispose = function () { st.dispose(); };
      api.canvas = st.canvas;
      api._stage = st;

      /* ---- per frame ---- */
      st.update = function (t, dt) {
        const red = reduced();
        let moving = runTweens(dt);
        if (S.W.step(dt)) moving = true;
        if (S.L.step(dt)) moving = true;
        if (S.color.step(dt)) moving = true;
        if (S.clarity.step(dt)) moving = true;
        S.glow.to(!primary ? 0 : primary.kind === 'faceted' ? (want.stone === 'diamond' ? 0.45 : 1) : primary.kind === 'opal' ? 0.6 : 0.3);
        if (S.glow.step(dt)) moving = true;
        // turntable with inertia; it comes to rest when nobody has been near the page for a while, and wakes with them
        const awake = SA.awake();
        S.spin += ((red || !awake || S.still ? 0 : 1) - S.spin) * (1 - Math.exp(-dt * (awake ? 1.2 : 0.6)));
        if (!S.still && S.floorK < 1) { S.floorK = Math.min(1, S.floorK + dt / 0.7); moving = true; }
        if (S.spin < 0.002 && !awake) S.spin = 0;
        if (!S.drag) {
          S.turn += (SPIN * S.spin + S.vel) * dt;
          S.vel *= Math.exp(-dt * 2.2);
          if (Math.abs(S.vel) < 0.002) S.vel = 0;
          if (S.spin > 0 || S.vel) moving = true;
          S.idle += dt;
          // elevation: a critically damped spring (it carries the throw of a drag), home again slowly after a while
          if (S.idle > 6 && !red && S.el.t !== HOME_EL) { S.el.w = 1.5; S.el.to(HOME_EL); }
          if (S.el.step(dt)) moving = true;
        } else moving = true;
        if (S.el.v < SIDE_EL - 0.02 || S.el.v > 1.42) S.el.snap(clamp(S.el.v, SIDE_EL - 0.02, 1.42));
        S.top.to(topFor(want.kind));
        if (S.top.step(dt)) moving = true;
        // the stone's sphere: eased toward the size it is heading for, never smaller than the stone as it is now
        const pr = primary || slots[slots.length - 1];
        const aim = sphereOf(pr, dims(want).W, 1), now = sphereOf(pr, S.W.v, pr ? pr.s : 1);
        if (aim) {
          if (S.fitR.v === 0) { S.fitY.snap(aim.y); S.fitR.snap(aim.r); }
          S.fitY.to(aim.y); S.fitR.to(aim.r);
          if (S.fitY.step(dt)) moving = true;
          if (S.fitR.step(dt)) moving = true;
          if (now && now.r > S.fitR.v) { S.fitR.v = now.r; S.fitY.v = now.y; }
        }
        placeCamera();
        st.camera.updateMatrixWorld();
        // stones
        const W = S.W.v;
        const tilt = tiltAt(S.el.v);
        slots.forEach(function (sl) {
          grade(sl);
          sl.mesh.scale.setScalar(W);
          const h = sl.kind === 'pearl' ? W / 2 : sl.unit.pav * W;
          sl.g.position.y = GAP + h;
          // (Euler XYZ: the stone turns about its own axis, and that axis leans toward the viewer)
          // (a cabochon leans less: its dome is read from its profile, and leaned well over it reads as a ball)
          sl.g.rotation.x = sl.kind === 'pearl' ? 0 : sl.kind === 'opal' ? tilt * 0.35 : tilt;
          sl.g.rotation.y = S.turn + sl.extra;
          sl.g.scale.setScalar(sl.s);
          if (sl.kind === 'faceted' && SA.setLamps) {
            lampC.set(0, GAP + h, 0);
            SA.setLamps(sl.mat, SA.lampDirs(st.camera, lampC, lampD), LAMP_I.colour + (LAMP_I.diamond - LAMP_I.colour) * (sl.diamond || 0));
            // a diamond is shown in a neutral studio of hard softboxes (bold light and dark blocks, not a beige mosaic)
            if (SA.setStudio) SA.setStudio(sl.mat, st.camera, lampC, sl.diamond || 0, STUDIO_ROOM[0] + (STUDIO_ROOM[1] - STUDIO_ROOM[0]) * st.envLightU.value);
          }
        });
        if (S.reveal < 1) { S.reveal = red ? 1 : Math.min(1, S.reveal + dt / 1.7); moving = true; }
        fu.uReveal.value = SA.ease(S.reveal);
        floorLook();
        fu.uFade.value = 1;
        st.scene.updateMatrixWorld();
        if (glints) {
          const pr = glintSlot;
          if (S.hover.step(dt)) moving = true;
          driftKeys();
          // a star is set a little off the square (upright it reads as a cross) and turns slowly as it lives
          S.tw = (S.tw || 0) + (red ? 0 : dt * 0.5);
          for (let i = 0; i < glints.cands.length; i++) glints.cands[i].rot = 0.38 + 0.16 * Math.sin(S.tw + i * 1.7);
          glints.unit = W * (pr ? pr.s : 1);
          // (at most about 60% opacity: a catch-light, never a white cross on the stone)
          glints.alpha = pr && !poster ? 0.83 * pr.alpha * (pr.diamond == null ? 1 : pr.diamond) : 0;
          if (red) { if (pr && pr.kind === 'faceted') glints.bake(st.camera); else glints.hide(); }
          else if (glints.update(st.camera, dt, !!pr && pr.alpha > 0.4)) moving = true;
        }
        return moving;
      };

      /* ---- input ---- */
      const off = SA.drag(st.canvas, {
        down: function () { letGo(); S.drag = true; S.vel = 0; S.el.snap(S.el.v); S.idle = 0; SA.poke(); st.wake(); },
        move: function (d, dx, dy) {
          const k = 3.2 / Math.max(260, Math.min(st.size.w, st.size.h * 1.4));
          S.turn += dx * k;
          if (!d.touch) S.el.snap(clamp(S.el.v + dy * k * 0.8, SIDE_EL - 0.02, 1.42));
          S.idle = 0;
          st.wake();
        },
        up: function (d) {
          S.drag = false;
          const k = 3.2 / Math.max(260, Math.min(st.size.w, st.size.h * 1.4));
          S.vel = clamp(d.vx * k, -4, 4);
          if (!d.touch) { const v = clamp(d.vy * k * 0.8, -2, 2); S.el.w = 3.2; S.el.to(clamp(S.el.v + v * 0.3, SIDE_EL, 1.4)); S.el.vel = v; }
          S.idle = 0;
          st.wake();
        },
        // the pointer leads the light a little (the stars travel toward it)
        hover: function (e) {
          if (reduced()) return;
          const r = st.canvas.getBoundingClientRect();
          S.hover.to(clamp(((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1, -1, 1));
          st.wake();
        }
      });
      const dbl = function () { api.view('home'); };
      st.canvas.addEventListener('dblclick', dbl);
      st.cleanup = function () { off(); st.canvas.removeEventListener('dblclick', dbl); if (glints) glints.dispose(); slots.slice().forEach(dropSlot); };

      placeCamera();
      // the first stone is made in a slice of its own (its program compiles off the main thread once the light is there)
      initial = SA.slice(function firstStone() { started = true; if (!st.disposed) return swapTo(want); });
      api.ready = initial.then(function () { return api; }, function () { return api; });
      return api;
    }
    SA.gemLab = gemLab;
  } catch (err) {
    console.error('[Aurelia GL] gl-scenes-a gem lab failed to load', err);
  }
}

/* ---- 68-birthstones.js ---- */
/* =====================================================================================================================
   gl-scenes-a · AUGL.birthstones(container, { month 0..11, label, onSelect(i) })
     -> { setMonth(i), month(), setLabel(text), pause(), resume(), dispose(), canvas, ready }
   Twelve stones on a slow circular track, like the hours of a clock face laid on a table: January garnet, February
   amethyst, March aquamarine, April diamond, May emerald, June pearl, July ruby, August peridot, September sapphire,
   October opal, November topaz, December tanzanite. The month's stone comes forward to the front of the dial, larger and
   in the light; the others stay smaller, and only the far side of the dial falls gently out of focus (a layer with a
   circle of confusion of a few pixels, laid behind the stones in focus) and fades a little into the room. Every stone
   keeps its own colour wherever it is on the dial (depth is size, focus and a slight fade, never a greying). The whole
   front arc stays sharp.
   Startup: the constructor only makes the stage; the stones are built in short slices, every program compiles off the
   main thread while the lighting is made (also in slices), and `ready` resolves on the first presented frame.
   setMonth turns the track the short way round (a smooth curve that keeps its speed if it is redirected mid-turn).
   Drag the dial to turn it by hand (it settles on the nearest stone); tap a stone to bring it forward. Both call
   onSelect(i). Reduced motion: no swaying, the track jumps to the month.
   ===================================================================================================================== */
{
  try {
    const SA = KIT._sa || (KIT._sa = {});
    const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    const STEP = KIT.TAU / 12;
    const R = 27;                       // dial radius, mm
    const ELEV = 0.64;                  // camera elevation above the dial plane (high enough that the ends never stack)
    const BASE = 0.62, GROW = 0.98;     // a stone's scale away from / at the front (0.62 + 0.98 = 1.6)
    const TIP_F = 42 * Math.PI / 180, TIP_O = 52 * Math.PI / 180;   // how far a table faces up (faceted / organic)
    const SET = [
      { stone: 'garnet', cut: 'round', w: 6.7 }, { stone: 'amethyst', cut: 'cushion', w: 6.6 }, { stone: 'aquamarine', cut: 'emerald', w: 6.0 },
      { stone: 'diamond', cut: 'round', w: 6.8 }, { stone: 'emerald', cut: 'emerald', w: 6.0 }, { stone: 'pearl', w: 7.4 },
      { stone: 'ruby', cut: 'oval', w: 6.2 }, { stone: 'peridot', cut: 'cushion', w: 6.6 }, { stone: 'sapphire', cut: 'oval', w: 6.2 },
      { stone: 'opal', cut: 'oval', w: 6.1 }, { stone: 'topaz', cut: 'pear', w: 5.6 }, { stone: 'tanzanite', cut: 'pear', w: 5.6 }
    ];

    const QUAD_V = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    const BLUR_F = `
uniform sampler2D tSrc;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec4 s = texture2D(tSrc, vUv) * 0.2270270270;
  s += texture2D(tSrc, vUv + uDir * 1.3846153846) * 0.3162162162;
  s += texture2D(tSrc, vUv - uDir * 1.3846153846) * 0.3162162162;
  s += texture2D(tSrc, vUv + uDir * 3.2307692308) * 0.0702702703;
  s += texture2D(tSrc, vUv - uDir * 3.2307692308) * 0.0702702703;
  gl_FragColor = s;
}`;
    /* the soft layer already holds display colours (premultiplied): lay it down as it is */
    const COMP_F = `
uniform sampler2D tSrc;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tSrc, vUv);
  gl_FragColor = vec4(c.rgb, clamp(c.a, 0.0, 1.0)) * uAlpha;
}`;
    /* the dial: a hairline track with a fine tick under each stone and between them, fading toward the back, and a pool
       of light under the stone in focus */
    const DIAL_V = `
varying vec2 vP;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vP = wp.xz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
    const DIAL_F = `
uniform float uR;
uniform float uRot;
uniform vec3 uLine;
uniform float uLineA;
uniform vec3 uGlowCol;
uniform float uGlowA;
uniform vec2 uGlowP;
uniform float uGlowR;
uniform float uFade;
uniform float uReveal;
varying vec2 vP;
float hair(float d, float w) { float fw = fwidth(d); return 1.0 - smoothstep(w, w + fw * 1.3, abs(d)); }
void main() {
  float r = length(vP);
  float ang = atan(vP.x, vP.y) + uRot;            // 0 at the front, turning with the track
  // the track draws itself in from the front, both ways round, as the stones are prepared
  float side = abs(atan(vP.x, vP.y)) / 3.14159265;
  float sweep = smoothstep(side - 0.05, side, uReveal * 1.06 - 0.01);
  float track = hair(r - uR, 0.022);
  float inner = hair(r - (uR - 1.35), 0.014) * 0.55;
  // ticks: a longer one under each stone, a short one half way
  float k12 = ang / 0.5235987756;
  float f = abs(fract(k12 + 0.5) - 0.5) * 0.5235987756 * uR;   // arc distance (mm) to the nearest stone tick
  float h = abs(fract(k12) - 0.5) * 0.5235987756 * uR;         // to the nearest half-step tick
  float band = smoothstep(uR - 1.45, uR - 1.3, r) * (1.0 - smoothstep(uR - 0.05, uR + 0.05, r));
  float bandS = smoothstep(uR - 0.8, uR - 0.7, r) * (1.0 - smoothstep(uR - 0.05, uR + 0.05, r));
  float ticks = hair(f, 0.03) * band + hair(h, 0.024) * bandS * 0.7;
  // nearer is clearer: the far side of the track fades into the room
  float depth = smoothstep(-uR * 1.05, uR * 0.6, vP.y);
  float lines = clamp(track + inner + ticks * smoothstep(0.4, 1.0, uReveal), 0.0, 1.0) * uLineA * (0.18 + 0.82 * depth) * sweep;
  vec2 gp = vP - uGlowP;
  float gl = exp(-dot(gp, gp) / (uGlowR * uGlowR)) * uGlowA * (1.0 - smoothstep(uR + 10.0, uR + 21.0, r));
  vec3 col = uLine * lines + uGlowCol * gl;
  float a = lines + gl * 0.6;
  gl_FragColor = vec4(col, min(a, 1.0)) * uFade;
}`;
    /* dim: the exposure of a stone out of the light; far: how much of a stone at the very back still shows (it fades
       a little into the room); desat: how much colour a stone at the back gives up.
       The calendar is twelve colours: depth reads from size, a soft focus and a slight fade, never from a stone losing
       its colour or going dark (dimmed and greyed, an emerald read olive, an aquamarine grey glass, a diamond a pink-grey
       blob). A stone at the back keeps nearly all its light and well over 70% of its saturation. */
    const LOOK = {
      dark: { line: [1, 1, 1], lineA: 0.34, glowA: 0.3, dim: 0.9, far: 0.8, desat: 0.1 },
      light: { line: [0.282, 0.031, 0.027], lineA: 0.42, glowA: 0.24, dim: 0.95, far: 0.8, desat: 0.08 }
    };
    const PALE = { diamond: 1, pearl: 1, aquamarine: 1, opal: 1 };
    /* every stone is graded as the gem lab shows it at 1 ct (6.5 mm, its classic tone): absorption follows the path
       through the stone in millimetres, so without this the larger stones of the dial (and the stone in focus, which
       grows) would deepen toward black, a garnet first */
    const REF_MM = 6.5 * 1.09;
    /* the lamps above the viewer (SA.setLamps), a little brighter on the stone in focus */
    const LAMP = { diamond: [3.5, 8], colour: [1.4, 2.2] };
    const SRGB = {};
    /* a stone's hue in display values (cached: read every frame) */
    function srgbOf(hex) {
      if (!SRGB[hex]) { const c = new THREE.Color(hex); c.convertLinearToSRGB(); SRGB[hex] = [c.r, c.g, c.b]; }
      return SRGB[hex];
    }
    const sstep = function (a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

    function birthstones(container, o) {
      o = o || {};
      /* o._poster = { mode }: render the scene's poster (tools/prerender.js through AUGL.scenePoster): the dial as it
         first appears, its track already drawn. o._fromPoster: the page shows that picture, and the scene starts
         exactly as it (the track already drawn) */
      const poster = o._poster ? o._poster : null;
      const fromPoster = !poster && !!o._fromPoster;
      const st = new SA.Stage(container, poster ? { kind: 'birthstones', label: 'poster', fov: 22, mode: poster.mode, pixelRatio: poster.dpr || 1 }
        : { kind: 'birthstones', label: o.label || 'Twelve birthstones on a turning dial', fov: 22 });
      const reduced = function () { return !!AU.reduced; };
      const r = st.renderer;
      let month = ((Math.round(+o.month) || 0) % 12 + 12) % 12;
      const TB = SA.tier().bounces || 6;

      /* ---- the stone in front: framed whatever its cut ----
         A stone's reach is the radius of the sphere round its pose's origin that holds it in any pose (it turns and
         sways about that point). The front stone grows to 1.6 x, but never past the reach of the round diamond at
         1.6 x (plus 4%): a long step cut or a pear is scaled a little less, so every month's stone stands the same size
         in the light and the camera frames that one sphere with a margin (a tall stone is never cut by the stage). */
      const reachOf = function (d) {
        const kind = SA.kindOf(d.stone);
        const shape = kind === 'faceted' ? SA.cut(d.cut) : kind === 'pearl' ? SA.pearlShape('high') : SA.cabShape(d.cut, 'high');
        if (!shape || !shape.geometry) return 0.6 * d.w;
        const geo = shape.geometry;
        if (!geo.boundingSphere) geo.computeBoundingSphere();
        const c = geo.boundingSphere.center, crown = shape.crown, pav = shape.pavilion;
        const cy = c.y - (crown - pav) / 2;
        return (Math.hypot(c.x, cy, c.z) + geo.boundingSphere.radius) * d.w;
      };
      let frontCap = 0;
      const capOf = function () {
        if (!frontCap) frontCap = reachOf({ stone: 'diamond', cut: 'round', w: 6.8 }) * (BASE + GROW) * 1.04;
        return frontCap;
      };
      const growOf = function (d) { return clamp(capOf() / Math.max(0.1, reachOf(d)) - BASE, 0.5, GROW); };

      /* ---- the twelve stones (built in slices, see the end) ---- */
      const stones = [];
      const makeStone = function (d, i) {
        const kind = SA.kindOf(d.stone);
        const g = new THREE.Group();          // placed on the dial
        const pose = new THREE.Group();       // faces the camera, sways
        g.add(pose);
        let mesh, mat, unit;
        if (kind === 'faceted') {
          const cut = SA.cut(d.cut);
          mat = cut && SA.labGem(d.cut, d.stone, { envU: st.envU, envLightU: st.envLightU, incl: false, bounces: TB, cubeHeight: st.cubeHeight });
          if (!cut || !mat) return null;
          mesh = new THREE.Mesh(cut.geometry, mat);
          unit = { crown: cut.crown, pav: cut.pavilion, len: cut.length };
        } else {
          const shape = kind === 'pearl' ? SA.pearlShape('high') : SA.cabShape(d.cut, 'high');
          mat = kind === 'pearl' ? SA.pearlMaterial({ seed: 2 + i }) : SA.opalMaterial({ seed: 7, scale: 5.6, fire: 1.15 });
          mesh = new THREE.Mesh(shape.geometry, mat);
          unit = { crown: shape.crown, pav: shape.pavilion, len: shape.length };
        }
        mat.transparent = true;
        st.track(mat);
        mesh.scale.setScalar(d.w);
        // a cabochon lies across the light, its long axis level (stood on end, a domed oval reads as an egg)
        if (kind === 'opal') mesh.rotation.y = Math.PI / 2;
        // centre the stone on its own middle (between the culet and the table), so it sways about itself
        mesh.position.y = -(unit.crown - unit.pav) / 2 * d.w;
        pose.add(mesh);
        st.scene.add(g);
        const u = mat.uniforms;
        return {
          i: i, stone: d.stone, cut: d.cut, kind: kind, g: g, pose: pose, mesh: mesh, mat: mat, w: d.w,
          grow: growOf(d),
          surf: u && u.uSurf ? u.uSurf.value : 1, sat: u && u.uSat ? u.uSat.value : 1,
          fire: mat.userData.au && mat.userData.au.uAuFire ? mat.userData.au.uAuFire.value : 1,
          len: unit.len * d.w, focus: SA.spring(i === month ? 1 : 0, 4.2), eff: 0, back: 0, far: 0, phase: i * 1.7,
          cands: kind === 'faceted' ? SA.glintCands(d.cut, mesh, d.stone) : []
        };
      };
      const setOpacity = function (s, a) {
        if (s.mat.uniforms && s.mat.uniforms.uOpacity) s.mat.uniforms.uOpacity.value = a;
        else s.mat.opacity = a;
        s.g.visible = a > 0.003;
      };

      /* ---- the dial ---- */
      const du = {
        uR: { value: R }, uRot: { value: 0 }, uLine: { value: new THREE.Vector3(1, 1, 1) }, uLineA: { value: 0.3 },
        uGlowCol: { value: new THREE.Vector3(1, 1, 1) }, uGlowA: { value: 0 }, uGlowP: { value: new THREE.Vector2(0, R + 3) },
        uGlowR: { value: 6 }, uFade: { value: 1 }, uReveal: { value: AU.reduced ? 1 : 0 }
      };
      const dial = new THREE.Mesh(new THREE.PlaneGeometry(2 * R + 48, 2 * R + 48),
        new THREE.ShaderMaterial({ name: 'au-birth-dial', vertexShader: DIAL_V, fragmentShader: DIAL_F, uniforms: du, transparent: true, premultipliedAlpha: true, depthWrite: false, toneMapped: false }));
      dial.rotation.x = -Math.PI / 2;
      dial.position.y = -6.2;
      dial.renderOrder = -2;
      // the dial has a scene of its own: it is laid down first, under the soft layer, so a stone standing on the near
      // side of the track hides the hairline behind it (the dial itself is in focus: it is never blurred)
      const dialScene = new THREE.Scene();
      dialScene.add(dial);
      st.track(dial.geometry); st.track(dial.material);

      /* ---- the far side's soft focus: render targets and passes ---- */
      const rtOpts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
      const rtA = new THREE.WebGLRenderTarget(4, 4, Object.assign({ depthBuffer: true }, rtOpts));
      const rtB = new THREE.WebGLRenderTarget(4, 4, Object.assign({ depthBuffer: false }, rtOpts));
      /* the soft layer is drawn exactly as the screen is (tone mapped, sRGB), so every stone uses ONE compiled program
         for both layers (three.js treats a target flagged like this as a display surface) */
      rtA.isXRRenderTarget = true;
      rtA.texture.colorSpace = THREE.SRGBColorSpace;
      st.track(rtA); st.track(rtB);
      const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const quadGeo = new THREE.PlaneGeometry(2, 2);
      const blurMat = new THREE.ShaderMaterial({ vertexShader: QUAD_V, fragmentShader: BLUR_F, uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.NoBlending });
      const compMat = new THREE.ShaderMaterial({ vertexShader: QUAD_V, fragmentShader: COMP_F, uniforms: { tSrc: { value: rtA.texture }, uAlpha: { value: 1 } }, depthTest: false, depthWrite: false, transparent: true, premultipliedAlpha: true, toneMapped: false });
      const quad = new THREE.Mesh(quadGeo, blurMat);
      quad.frustumCulled = false;
      quadScene.add(quad);
      st.track(quadGeo); st.track(blurMat); st.track(compMat);
      st.onResize = function (w, h) {
        // the soft layer at the screen's own resolution: at half resolution the far stones read as smeared thumbnails
        // rather than as stones a little out of focus
        const pr = st.dpr;
        const bw = Math.max(2, Math.round(w * pr)), bh = Math.max(2, Math.round(h * pr));
        rtA.setSize(bw, bh); rtB.setSize(bw, bh);
        frame();
      };

      /* ---- glints on the diamond (April) when it is in focus ---- */
      const glints = SA.glints(st.scene, 2);
      let diamond = null;

      /* ---- camera framing: the whole dial on a wide stage; on a narrow one, the front of it ---- */
      const S = {
        rot: month * STEP, rotM: null, drag: false, vel: 0, t: 0, swayK: AU.reduced ? 0 : 1, reveal: AU.reduced || poster || fromPoster ? 1 : 0,
        held: !!(poster || fromPoster), swayIn: 0,
        aim: new THREE.Vector3(), D: 100
      };
      const camDir = new THREE.Vector3(0, Math.sin(ELEV), Math.cos(ELEV));
      const right = new THREE.Vector3(1, 0, 0), up = new THREE.Vector3(0, Math.cos(ELEV), -Math.sin(ELEV)), q = new THREE.Vector3();
      let elev = ELEV;
      const frame = function () {
        const cam = st.camera, asp = cam.aspect;
        const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), th = tv * asp;
        // the dial is seen from about 32 degrees: high enough that the stones at its two ends stand apart (each pair of
        // neighbours keeps more than half a stone of room between them), low enough that it still reads as a table
        elev = clamp(ELEV + (asp - 1.5) * 0.04, 0.58, 0.68);
        camDir.set(0, Math.sin(elev), Math.cos(elev));
        up.set(0, Math.cos(elev), -Math.sin(elev));
        // the arc that must be in view: all of it on a wide stage, the front ~150 degrees on a tall one
        const arc = asp >= 1.6 ? Math.PI : asp <= 0.8 ? 0.5 : 0.5 + (Math.PI - 0.5) * Math.pow((asp - 0.8) / 0.8, 1.6);
        const pts = [];
        for (let k = 0; k <= 24; k++) {
          const a = -arc + 2 * arc * k / 24;
          const x = Math.sin(a) * R, z = Math.cos(a) * R;
          pts.push(new THREE.Vector3(x, 3.4, z), new THREE.Vector3(x, -3.4, z), new THREE.Vector3(x + Math.sign(x) * 3.2, 0, z));
        }
        pts.push(new THREE.Vector3(0, -6.4, R + 2.5), new THREE.Vector3(0, 4.0, -R));
        // the stone in the light: its sphere (see growOf) with a 10% margin, as the camera sees it (a ring of points
        // across the view at its centre)
        const fr = capOf() * 1.1;
        for (let k = 0; k < 16; k++) {
          const a = k / 16 * KIT.TAU;
          pts.push(new THREE.Vector3(0, 1.6, R + 9).addScaledVector(up, Math.cos(a) * fr).addScaledVector(right, Math.sin(a) * fr));
        }
        const mx = 0.05, my = asp < 1 ? 0.06 : 0.08;
        let aimY = 0, aimZ = asp < 1 ? R * 0.35 : 0, D = 100;
        for (let it = 0; it < 4; it++) {
          D = 1;
          pts.forEach(function (p) {
            q.set(p.x, p.y - aimY, p.z - aimZ);
            const z = q.dot(camDir);
            D = Math.max(D, z + Math.abs(q.dot(right)) / (th * (1 - 2 * mx)), z + Math.abs(q.dot(up)) / (tv * (1 - 2 * my)));
          });
          let y0 = Infinity, y1 = -Infinity;
          pts.forEach(function (p) {
            q.set(p.x, p.y - aimY, p.z - aimZ);
            const py = q.dot(up) / (D - q.dot(camDir));
            y0 = Math.min(y0, py); y1 = Math.max(y1, py);
          });
          aimY += (y0 + y1) / 2 * D / Math.cos(elev) * 0.9;
        }
        S.aim.set(0, aimY, aimZ);
        S.D = D;
        cam.position.copy(camDir).multiplyScalar(D).add(S.aim);
        cam.near = Math.max(1, D - R * 2.5); cam.far = D + R * 2.5;
        cam.lookAt(S.aim);
        cam.updateProjectionMatrix();
        st.invalidate();
      };

      /* ---- the track's motion: a cubic that starts with the current speed and lands softly ---- */
      const wrapNear = function (target, ref) { while (target - ref > Math.PI) target -= KIT.TAU; while (target - ref < -Math.PI) target += KIT.TAU; return target; };
      const motionTo = function (target, dur) {
        const v0 = S.rotM ? S.rotM.vel : S.vel;
        S.rotM = { p0: S.rot, p1: target, v0: v0, dur: dur, t: 0, vel: v0 };
        S.vel = 0;
        st.invalidate();
      };
      const stepMotion = function (dt) {
        const M = S.rotM;
        if (!M) return false;
        M.t += dt;
        const u = Math.min(1, M.t / M.dur), u2 = u * u, u3 = u2 * u;
        const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2;
        S.rot = h00 * M.p0 + h10 * M.v0 * M.dur + h01 * M.p1;
        const d00 = 6 * u2 - 6 * u, d10 = 3 * u2 - 4 * u + 1, d01 = -6 * u2 + 6 * u;
        M.vel = (d00 * M.p0 + d10 * M.v0 * M.dur + d01 * M.p1) / M.dur;
        if (u >= 1) { S.rot = M.p1; S.rotM = null; }
        return true;
      };
      // the dial moves before the page has let its poster go: the poster steps back at once
      const letGo = function () {
        if (!S.held || poster) return;
        S.held = false;
        if (api._dropPoster) api._dropPoster();
      };
      const select = function (i, fromUser) {
        i = ((Math.round(i) % 12) + 12) % 12;
        const changed = i !== month;
        if (changed) letGo();
        month = i;
        const target = wrapNear(i * STEP, S.rot);
        const steps = Math.abs(target - S.rot) / STEP;
        if (reduced() || st.hold) { S.rot = target; S.rotM = null; stones.forEach(function (s) { s.focus.snap(s.i === month ? 1 : 0); }); }
        else motionTo(target, clamp(1.15 + 0.22 * steps, 1.15, 2.6));
        stones.forEach(function (s) { s.focus.to(s.i === month ? 1 : 0); });
        if (changed && fromUser && typeof o.onSelect === 'function') { try { o.onSelect(month); } catch (e) { console.error(e); } }
        st.invalidate();
      };

      /* ---- per frame ---- */
      const tmpM = new THREE.Matrix4(), xA = new THREE.Vector3(), yA = new THREE.Vector3(), zA = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
      const toCam = new THREE.Vector3(), Yax = new THREE.Vector3(0, 1, 0), qs = new THREE.Quaternion();
      const lampC = new THREE.Vector3(), lampD = [new THREE.Vector3(), new THREE.Vector3()];
      st.update = function (t, dt) {
        const red = reduced();
        let moving = false;
        st.camera.updateMatrixWorld();
        if (stepMotion(dt)) moving = true;
        if (!S.drag && !S.rotM && S.vel) {
          S.rot += S.vel * dt;
          S.vel *= Math.exp(-dt * 3);
          if (Math.abs(S.vel) < 0.08) { S.vel = 0; select(Math.round(S.rot / STEP), true); }
          moving = true;
        }
        if (S.drag) moving = true;
        // the stones sway gently while someone is there; they settle when the page has been left alone a while
        const awake = SA.awake();
        S.swayK += ((red || !awake ? 0 : 1) - S.swayK) * (1 - Math.exp(-dt * (awake ? 1.0 : 0.5)));
        if (S.swayK < 0.002 && !awake) S.swayK = 0;
        // (the stones hold the pose of the poster until the page has let it go: api._release)
        if (S.swayK > 0 && !S.held) { S.t += dt * (0.4 + 0.6 * S.swayK); moving = true; }
        // the sway eases in from rest (the poster, and the reduced-motion dial, are the stones at rest)
        if (!S.held && S.swayIn < 1) { S.swayIn = Math.min(1, S.swayIn + dt / 2.4); moving = true; }
        const k = st.envLightU.value, A = LOOK.dark, B = LOOK.light;
        const l = function (x, y) { return x + (y - x) * k; };
        const dim = l(A.dim, B.dim), farA = l(A.far, B.far), desat = l(A.desat, B.desat);
        let lead = null, leadE = 0;
        stones.forEach(function (s) {
          if (s.focus.step(dt)) moving = true;
          const phi = s.i * STEP - S.rot;
          const cphi = Math.cos(phi);
          // only a stone that is (nearly) at the front comes forward
          const prox = clamp((cphi - 0.5) / (0.985 - 0.5), 0, 1);
          const e = s.focus.v * prox * prox * (3 - 2 * prox);
          s.eff = e;
          if (e > leadE) { leadE = e; lead = s; }
          // the far side of the dial: soft focus, a little greyer, fading into the room; the front arc stays sharp
          s.back = sstep(0.25, -0.45, cphi) * (1 - e);
          // (a pale stone fades half as much: seen through, the burgundy room would tint a diamond or a pearl pink)
          s.far = 1 - (1 - farA) * (PALE[s.stone] ? 0.5 : 1) * sstep(-0.3, -0.95, cphi);
          const fwd = 9 * e, lift = 1.6 * e;
          s.g.position.set(Math.sin(phi) * (R + fwd * 0.35), lift, Math.cos(phi) * R + fwd);
          s.g.scale.setScalar(BASE + s.grow * e);
          // face the camera, the table tipped up toward it at a fixed angle (about 42 degrees: the crown then mirrors
          // the dark camera port and the lamps around it, so the table shows the stone's colour), the long axis
          // upright (a pear hangs point down)
          toCam.copy(st.camera.position).sub(s.g.position);
          toCam.y = 0;
          toCam.normalize();
          const tip = s.kind === 'faceted' ? TIP_F : TIP_O;
          yA.copy(toCam).multiplyScalar(Math.cos(tip)).addScaledVector(Yax, Math.sin(tip)).normalize();
          zA.copy(down).addScaledVector(yA, -down.dot(yA)).normalize();
          xA.crossVectors(yA, zA).normalize();
          tmpM.makeBasis(xA, yA, zA);
          s.pose.quaternion.setFromRotationMatrix(tmpM);
          const sway = red ? 0 : Math.sin(S.t * KIT.TAU / (8.5 + (s.i % 3)) + s.phase) * (0.16 + 0.3 * e) * S.swayK * SA.ease(S.swayIn);
          qs.setFromAxisAngle(Yax, sway);
          s.pose.quaternion.premultiply(qs);
          // in the light, or stepping back out of it
          const expo = dim + (1 - dim) * e;
          const u = s.mat.uniforms;
          if (u) {
            u.uExpo.value = expo * 1.02;
            u.uSat.value = s.sat * (1 - desat * sstep(0.4, -0.8, cphi) * (1 - e));
            u.uDepth.value = REF_MM / Math.max(1, s.w * s.g.scale.x);
            if (SA.setLamps) {
              lampC.copy(s.g.position);
              const L = s.stone === 'diamond' ? LAMP.diamond : LAMP.colour;
              SA.setLamps(s.mat, SA.lampDirs(st.camera, lampC, lampD), L[0] + (L[1] - L[0]) * e);
              // the diamond in the gem lab's studio (bold light and dark blocks): in full in the light, half at the back
              if (s.stone === 'diamond' && SA.setStudio) SA.setStudio(s.mat, st.camera, lampC, 0.5 + 0.5 * e, l(0.24, 0.18));
            }
          } else {
            // a pearl or an opal is pale all over: it recedes only a little more than a coloured stone
            s.mat.envMapIntensity = expo * (s.kind === 'pearl' ? 0.86 + 0.14 * e : 0.9 + 0.1 * e);
            if (s.mat.userData.au && s.mat.userData.au.uAuFire) s.mat.userData.au.uAuFire.value = s.fire * (0.8 + 0.2 * e) * (1 - 0.15 * s.back);
          }
        });
        // the dial and the pool of light under the stone in focus
        du.uRot.value = S.rot % KIT.TAU;
        du.uLine.value.set(l(A.line[0], B.line[0]), l(A.line[1], B.line[1]), l(A.line[2], B.line[2]));
        du.uLineA.value = l(A.lineA, B.lineA);
        if (lead) du.uGlowCol.value.fromArray(srgbOf((KIT.STONES[lead.stone] || {}).hue || '#ffffff'));
        du.uGlowA.value = leadE * l(A.glowA, B.glowA) * (lead && lead.stone === 'diamond' ? 0.6 : 1);
        du.uGlowP.value.set(0, R + 4.5);
        du.uGlowR.value = 6.5;
        // the track draws itself in once, from the front round to the back, as the stones arrive
        if (S.reveal < 1) { S.reveal = red ? 1 : Math.min(1, S.reveal + dt / 1.9); moving = true; }
        du.uReveal.value = SA.ease(S.reveal);
        st.scene.updateMatrixWorld();
        if (glints && diamond) {
          glints.unit = diamond.w * diamond.g.scale.x * 0.75;
          glints.alpha = poster ? 0 : diamond.eff * 0.85;
          if (red) { if (diamond.eff > 0.5) glints.bake(st.camera); else glints.hide(); }
          else if (glints.update(st.camera, dt, diamond.eff > 0.6)) moving = true;
        }
        return moving;
      };

      /* ---- drawing: the far stones into the soft layer (half resolution, a gentle blur), then the rest, sharp ---- */
      const passStones = function (sharp) {
        stones.forEach(function (s) {
          const b = s.back;
          // a stone crossfades between the two layers as it travels round to the back
          setOpacity(s, (sharp ? 1 - b : b) * s.far);
          const u = s.mat.uniforms;
          if (u && u.uBounces) {
            u.uBounces.value = sharp ? TB : Math.max(3, TB - 2);
            // out of focus a stone reads by its colour: the mirror of the lamps on its crown is softened a little and
            // the facet edges are dropped (only a touch of softness in what it sees: a blurred room averages every
            // facet toward the same grey, and the stone loses its colour and its sparkle with it)
            u.uSurf.value = s.surf * (sharp ? 1 : 0.75);
            u.uSoft.value = sharp ? 0 : 0.035;
          }
        });
      };
      st.draw = function () {
        const prevAuto = r.autoClear;
        r.autoClear = false;
        // 1. the far stones, into the half-resolution layer
        if (glints) glints.group.visible = false;
        passStones(false);
        r.setRenderTarget(rtA);
        r.setClearColor(0x000000, 0);
        r.clear(true, true, true);
        r.render(st.scene, st.camera);
        // 2. one gentle separable blur: a circle of confusion of about 3-4 px at 1440 (scaled with the stage's height)
        const sp = 0.62 * clamp(st.size.w / 680, 0.4, 1.1) * st.dpr;
        quad.material = blurMat;
        blurMat.uniforms.tSrc.value = rtA.texture; blurMat.uniforms.uDir.value.set(sp / rtA.width, 0);
        r.setRenderTarget(rtB); r.render(quadScene, quadCam);
        blurMat.uniforms.tSrc.value = rtB.texture; blurMat.uniforms.uDir.value.set(0, sp / rtA.height);
        r.setRenderTarget(rtA); r.render(quadScene, quadCam);
        // 3. on screen: the dial, the soft layer over it, then the stones in focus
        r.setRenderTarget(null);
        r.clear(true, true, true);
        r.render(dialScene, st.camera);
        quad.material = compMat;
        compMat.uniforms.uAlpha.value = 1;
        r.render(quadScene, quadCam);
        passStones(true);
        if (glints) glints.group.visible = true;
        r.render(st.scene, st.camera);
        r.autoClear = prevAuto;
      };

      /* ---- input: drag the dial, tap a stone ---- */
      const proj = new THREE.Vector3();
      const pick = function (e) {
        const rect = st.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * 2 - 1, y = -((e.clientY - rect.top) / rect.height * 2 - 1);
        let best = null, bd = Infinity;
        stones.forEach(function (s) {
          if (Math.cos(s.i * STEP - S.rot) < -0.2) return;          // the far side cannot be picked through the near
          proj.copy(s.g.position).project(st.camera);
          const rr = s.w * 0.62 * s.g.scale.x / (S.D * Math.tan(THREE.MathUtils.degToRad(st.camera.fov) / 2));
          const dx = (x - proj.x) * st.camera.aspect, dy = y - proj.y, d = Math.hypot(dx, dy);
          if (d < rr * 1.25 && proj.z < bd) { bd = proj.z; best = s; }
        });
        return best;
      };
      const off = SA.drag(st.canvas, {
        down: function () { letGo(); S.drag = true; S.vel = 0; if (S.rotM) { S.vel = S.rotM.vel; S.rotM = null; } st.wake(); },
        move: function (d, dx) {
          if (d.touch && d.axis === 'y') return;
          const k = (KIT.TAU / 12) / Math.max(90, st.size.w * 0.11);
          S.rot -= dx * k;
          st.wake();
        },
        up: function (d) {
          S.drag = false;
          if (!d.moved) { S.vel = 0; return; }
          const k = (KIT.TAU / 12) / Math.max(90, st.size.w * 0.11);
          const v = clamp(-d.vx * k, -6, 6);
          // land on the stone the throw would reach
          const target = Math.round((S.rot + v * 0.35) / STEP);
          S.rotM = null;
          S.vel = v;
          select(target, true);
        },
        tap: function (e) { const s = pick(e); if (s) select(s.i, true); },
        hover: function (e) { st.canvas.style.cursor = pick(e) ? 'pointer' : 'grab'; }
      });
      st.cleanup = function () { off(); if (glints) glints.dispose(); };

      /* ---- api ---- */
      const api = {
        setMonth: function (i) { select(+i || 0, false); },
        month: function () { return month; },
        setLabel: function (text) { if (text) st.canvas.setAttribute('aria-label', String(text)); },
        pause: function () { st.paused = true; st.sleep(); },
        resume: function () { st.paused = false; st.invalidate(); },
        dispose: function () { st.dispose(); },
        canvas: st.canvas,
        _stage: st
      };
      st.onResize(st.size.w, st.size.h);

      /* ---- startup, in short slices while the lighting is made alongside ----
         1. the stones, one or a few per frame (each a few milliseconds)
         2. every program compiled off the main thread at once: the stones (against a stand-in for the lighting with
            its exact layout, so the programs are the ones the real lighting uses; the soft layer shares the screen's
            programs), the dial, both targets of the blur and the composite, the glint stars
         3. the first frame once those and the lighting are ready: `ready` resolves when it has been presented */
      const builds = SET.map(function (d, i) {
        return SA.slice(function buildStone() {
          if (st.disposed) return;
          const s = makeStone(d, i);
          if (s) stones.push(s);
        }, true);
      });
      const compileFor = function (target, scene, cam) {
        const prev = r.getRenderTarget();
        let p;
        r.setRenderTarget(target);
        try { p = r.compileAsync ? r.compileAsync(scene, cam, st.scene) : Promise.resolve(); } catch (e) { p = Promise.resolve(); }
        r.setRenderTarget(prev);
        return st.wait(Promise.resolve(p).catch(function () { /* draw anyway */ }));
      };
      const compiled = Promise.all(builds).then(function () {
        return SA.slice(function compileAll() {
          if (st.disposed) return null;
          stones.sort(function (a, b) { return a.i - b.i; });
          diamond = stones.find(function (s) { return s.stone === 'diamond'; }) || null;
          if (glints && diamond) glints.set(diamond.cands);
          const sprites = glints ? glints.sprites.map(function (s) { return s.sp; }) : [];
          sprites.forEach(function (sp) { sp.visible = true; });
          const all = [compileFor(null, st.scene, st.camera), compileFor(null, dialScene, st.camera)];
          sprites.forEach(function (sp) { sp.visible = false; });
          quad.material = blurMat;
          all.push(compileFor(rtB, quadScene, quadCam), compileFor(rtA, quadScene, quadCam));
          quad.material = compMat;
          all.push(compileFor(null, quadScene, quadCam));
          quad.material = blurMat;
          return Promise.all(all);
        });
      });
      Promise.all([compiled, st.ready]).then(function () {
        if (st.disposed) return;
        stones.forEach(function (s) { s.focus.snap(s.i === month ? 1 : 0); });
        st.hold = false;
        st.invalidate();
      }, function () { /* disposed first */ });
      api.ready = st.firstDrawn.then(function () { return api; });
      api._release = function () { if (S.held && !poster) { S.held = false; st.invalidate(); } };
      // (after a poster: resolves once the live dial has been presented in its place)
      api.tookOver = st.firstDrawn.then(function () {
        return new Promise(function (res) { requestAnimationFrame(function () { requestAnimationFrame(res); }); });
      });
      return api;
    }
    SA.birthstones = birthstones;
  } catch (err) {
    console.error('[Aurelia GL] gl-scenes-a birthstones failed to load', err);
  }
}

/* ---- 74-api.js ---- */
/* =====================================================================================================================
   gl-scenes-a · publish the scenes on window.AUGL. Registered on AUGL_EXT (49-api.js copies it onto the API when the
   engine boots, after the intro) and, as a fallback, attached on AU.on('gl') / to an AUGL that already exists. When 3D
   is unavailable the engine publishes nothing (AU.gl resolves null) and the pages show their fallbacks.
     AUGL.gemLab(container, { stone, cut, carat, color, clarity, label }) -> { set(o), view(name), info(), setLabel(text),
                                                                                pause(), resume(), dispose(), canvas, ready }
     AUGL.birthstones(container, { month 0..11, label, onSelect(i) })     -> { setMonth(i), month(), setLabel(text),
                                                                                pause(), resume(), dispose(), canvas, ready }
     AUGL.stones  every stone name (KIT.STONE_LIST);  AUGL.birthstoneNames  the twelve, January first
   Both return their handle at once: the scene itself (its canvas, its WebGL context, its first build) is made in a
   slice of its own a frame later, never inside the caller's task (a page usually calls from an idle callback or a
   route render, and a context's creation is the single heaviest step of a scene). Calls made before then are kept:
   options merge into the build, the rest are replayed on the scene once it exists. `canvas` is null until then.
   ===================================================================================================================== */
{
  try {
    const SA = KIT._sa || {};
    /* per scene: what each early call does before the scene exists (merge into the options, or report from them) */
    const EARLY = {
      gemLab: {
        set: function (o, a) { const x = a[0] || {}; if (x.stone && x.stone !== o.stone && x.color == null) delete o.color; Object.assign(o, x); return Promise.resolve(); },
        setLabel: function (o, a) { if (a[0]) o.label = String(a[0]); },
        info: function (o) { return { stone: o.stone || 'diamond', cut: o.cut || 'round', carat: o.carat || 1, color: o.color, clarity: o.clarity }; }
      },
      birthstones: {
        setMonth: function (o, a) { o.month = +a[0] || 0; },
        month: function (o) { return ((Math.round(+o.month) || 0) % 12 + 12) % 12; },
        setLabel: function (o, a) { if (a[0]) o.label = String(a[0]); }
      }
    };
    const METHODS = {
      gemLab: ['set', 'view', 'info', 'setLabel', 'pause', 'resume'],
      birthstones: ['setMonth', 'month', 'setLabel', 'pause', 'resume']
    };

    /* ---------------- posters: the scene's first picture, pre-rendered ----------------
       A scene needs about a second from its call to its first frame (its own context, its lighting, its programs). So
       that its subject is there at once, tools/prerender.js renders the picture each scene first shows, in its default
       state, as an ordinary asset (AU.assets, keyed by AU.assetKey(spec, 'still', px, mode) like any catalogue picture):
         AUGL.scenePosters()               -> [{ scene, spec, px, ... }]  every poster to render
         AUGL.scenePoster(job, { mode, quality }) -> Promise<{ data, type, bytes, width, height }>  (base64 WebP)
       When AUGL.gemLab / AUGL.birthstones is called for a state that has a poster, the picture is shown at once over
       the page's placeholder, exactly where the scene will draw it (a layer beside the container: pages keep the
       container hidden until `ready`); the scene starts exactly as the picture and holds still until the page has
       shown it, then the picture is removed (the two are the same, so nothing is seen to change) and the scene moves.
       Specs: gem lab { type: 'scene', style: 'gemlab', metal: '-', stone, cut, carat, accent: 'c<colour>q<clarity>' }
       (the stone alone, a square round it); birthstones { type: 'scene', style: 'birthstones', metal: 'a<aspect>',
       stone: the month's stone, cut, carat: month 1..12, accent: '-' } (the whole stage at that aspect). */
    const GEM_DEF = { stone: 'diamond', cut: 'round', carat: 1, color: 3 / 7, clarity: 1 - 5 / 8 };   // the page's default: 1.00 ct G VS2
    const GEM_REF = { w: 660, h: 578 };                    // the stage the gem lab's poster is cut from (1440 px wide page)
    const GEM_PX = [400, 800];
    const BST_ASPECTS = [{ a: 1.555, css: 800, dpr: [1, 2] }, { a: 1.418, css: 380, dpr: [2] }];
    const BST_CUTS = ['round', 'cushion', 'emerald', 'round', 'emerald', 'round', 'oval', 'cushion', 'oval', 'oval', 'pear', 'pear'];
    const f2 = function (v) { return (+v || 0).toFixed(2); };
    const gemSpec = function (o) {
      const w = SA.labNorm ? SA.labNorm(o) : o;
      return { type: 'scene', style: 'gemlab', metal: '-', stone: w.stone, cut: w.cut, carat: +f2(w.carat), accent: 'c' + f2(w.color) + 'q' + f2(w.clarity) };
    };
    const bstSpec = function (m, a) {
      m = ((Math.round(+m) || 0) % 12 + 12) % 12;
      return { type: 'scene', style: 'birthstones', metal: 'a' + a.toFixed(3), stone: (KIT.BIRTHSTONES || [])[m] || '-', cut: BST_CUTS[m], carat: m + 1, accent: '-' };
    };
    const scenePosters = function () {
      const jobs = [];
      GEM_PX.forEach(function (px) { jobs.push({ scene: 'gemLab', spec: gemSpec(GEM_DEF), opts: Object.assign({}, GEM_DEF), ref: GEM_REF, css: px, dpr: 1, px: px }); });
      for (let m = 0; m < 12; m++) {
        BST_ASPECTS.forEach(function (A) {
          A.dpr.forEach(function (d) {
            jobs.push({ scene: 'birthstones', spec: bstSpec(m, A.a), opts: { month: m }, aspect: A.a, css: A.css, h: Math.round(A.css / A.a), dpr: d, px: A.css * d });
          });
        });
      }
      return jobs;
    };
    /* render one poster offline: a hidden host of the job's size, the scene in poster mode, one frame, encoded */
    const scenePoster = function (job, o) {
      o = o || {};
      const mode = o.mode === 'light' ? 'light' : 'dark';
      const host = document.createElement('div');
      const w = job.css, h = job.scene === 'gemLab' ? job.css : job.h;
      host.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:' + h + 'px;opacity:0;pointer-events:none;z-index:-1;';
      document.body.appendChild(host);
      let inner = null;
      const done = function () { try { if (inner) inner.dispose(); } catch (e) { /* ignore */ } host.remove(); };
      try {
        const fn = job.scene === 'gemLab' ? SA.gemLab : SA.birthstones;
        inner = fn(host, Object.assign({}, job.opts, { _poster: { ref: job.ref, mode: mode, dpr: job.dpr } }));
      } catch (e) { done(); return Promise.reject(e); }
      return Promise.resolve(inner.ready).then(function () { return SA.capture(inner._stage, o.quality || 0.86); })
        .then(function (r) { done(); return r; }, function (e) { done(); throw e; });
    };
    /* the poster for a call, if there is one: { url, place(el) -> bool } */
    let anyPoster = null;
    const posterFor = function (name, container, opts) {
      if (!AU.assets || typeof AU.assetKey !== 'function') return null;
      // (nothing to look for until tools/prerender.js has rendered the posters)
      if (anyPoster === null) anyPoster = Object.keys(AU.assets).some(function (k) { return k.indexOf('scene.') === 0; });
      if (!anyPoster) return null;
      const mode = AU.getMode ? AU.getMode() : 'dark';
      const W = container.clientWidth, H = container.clientHeight, dpr = window.devicePixelRatio || 1;
      if (!(W > 8 && H > 8)) return null;
      const find = function (spec, list, need) {
        let best = null;
        list.forEach(function (px) {
          const hit = AU.assets[AU.assetKey(spec, 'still', px, mode)];
          if (!hit) return;
          const url = typeof hit === 'string' ? hit : hit.url;
          if (!best || (best.px < need && px > best.px) || (px >= need && px < best.px)) best = { px: px, url: url };
        });
        return best;
      };
      if (name === 'gemLab') {
        if (opts.frame || !SA.labPosterRect) return null;
        const rect = SA.labPosterRect(W, H, opts);
        if (!rect) return null;
        const k0 = JSON.stringify(gemSpec(opts));
        const hit = find(gemSpec(opts), GEM_PX, rect.s * dpr);
        if (!hit) return null;
        return { url: hit.url, mode: mode, matches: function (x) { return JSON.stringify(gemSpec(x)) === k0; }, box: function (w, h) { const r = SA.labPosterRect(w, h, opts); return r ? { x: r.x - r.s / 2, y: r.y - r.s / 2, w: r.s, h: r.s } : null; } };
      }
      const a = W / H;
      const A = BST_ASPECTS.find(function (x) { return Math.abs(a - x.a) / x.a < 0.02; });
      if (!A) return null;
      const hit = find(bstSpec(opts.month, A.a), A.dpr.map(function (d) { return A.css * d; }), W * dpr);
      if (!hit) return null;
      const m0 = EARLY.birthstones.month(opts);
      return { url: hit.url, mode: mode, matches: function (x) { return EARLY.birthstones.month(x) === m0; },
        box: function (w, h) { return Math.abs(w / h - A.a) / A.a < 0.02 ? { x: 0, y: 0, w: w, h: h } : null; } };
    };
    /* show it beside the container (same offset parent, same stacking), placed in the container's box */
    const showPoster = function (P, container) {
      const parent = container.parentNode;
      if (!parent || container.offsetParent !== parent) return null;
      const img = document.createElement('img');
      img.alt = ''; img.setAttribute('aria-hidden', 'true'); img.decoding = 'async'; img.draggable = false;
      img.className = 'augl-poster';
      let zi = 'auto';
      try { zi = getComputedStyle(container).zIndex; } catch (e) { /* auto */ }
      img.style.cssText = 'position:absolute;display:block;pointer-events:none;user-select:none;margin:0;max-width:none;opacity:0;' +
        (zi && zi !== 'auto' ? 'z-index:' + zi + ';' : '') + (AU.reduced ? '' : 'transition:opacity .35s cubic-bezier(.22,.61,.36,1);');
      let dead = false;
      const place = function () {
        const b = P.box(container.clientWidth, container.clientHeight);
        if (!b) return false;
        img.style.left = (container.offsetLeft + b.x) + 'px';
        img.style.top = (container.offsetTop + b.y) + 'px';
        img.style.width = b.w + 'px';
        img.style.height = b.h + 'px';
        return true;
      };
      if (!place()) return null;
      parent.insertBefore(img, container);
      img.onload = function () { if (!dead) img.style.opacity = '1'; };
      img.src = P.url;
      const ro = new ResizeObserver(function () { if (!dead && !place()) h.remove(true); });
      ro.observe(container);
      const offMode = AU.on ? AU.on('mode', function (m) { if (m !== P.mode) h.remove(true); }) : null;
      const h = {
        remove: function (soft) {
          if (dead) return;
          dead = true;
          ro.disconnect();
          if (offMode) offMode();
          if (soft && !AU.reduced) { img.style.opacity = '0'; setTimeout(function () { img.remove(); }, 400); }
          else img.remove();
          if (h.onRemove) h.onRemove();
        },
        get dead() { return dead; }
      };
      return h;
    };
    /* once the scene has drawn its first picture in the poster's place and the page shows the container: the poster
       goes (the scene then starts to move) */
    const handOver = function (ph, container, inner) {
      const t0 = performance.now();
      const look = function () {
        if (ph.dead) return;
        let op = 1;
        try { op = +getComputedStyle(container).opacity; } catch (e) { /* shown */ }
        if (op >= 0.995 || performance.now() - t0 > 4000) { ph.remove(op < 0.995); return; }
        requestAnimationFrame(look);
      };
      Promise.resolve(inner.tookOver).then(function () { requestAnimationFrame(look); }, function () { ph.remove(true); });
    };
    const wrap = function (name, fn) {
      if (typeof fn !== 'function') return null;
      return function (container, o) {
        if (!container || !container.appendChild) throw new Error('AUGL.' + name + ': a container element is required');
        const opts = Object.assign({}, o || {});
        const early = EARLY[name] || {};
        let inner = null, dead = false;
        const queue = [];
        const h = { canvas: null, _stage: null };
        METHODS[name].forEach(function (m) {
          h[m] = function () {
            const args = Array.prototype.slice.call(arguments);
            if (inner) return typeof inner[m] === 'function' ? inner[m].apply(inner, args) : undefined;
            if (dead) return undefined;
            if (early[m]) {
              const r = early[m](opts, args);
              // another state before the scene exists: its poster no longer shows it
              if (ph && posterP && !posterP.matches(opts)) { ph.remove(true); ph = null; delete opts._fromPoster; }
              return r;
            }
            // (pause / resume / view: only the last of each kind matters)
            for (let i = queue.length - 1; i >= 0; i--) if (queue[i][0] === m || (m === 'pause' && queue[i][0] === 'resume') || (m === 'resume' && queue[i][0] === 'pause')) queue.splice(i, 1);
            queue.push([m, args]);
            return undefined;
          };
        });
        // the scene's first picture, at once (when it has been pre-rendered for this state)
        let ph = null, posterP = null;
        try {
          posterP = posterFor(name, container, opts);
          if (posterP) ph = showPoster(posterP, container);
        } catch (e) { ph = null; }
        if (ph) opts._fromPoster = true;
        h.dispose = function () { dead = true; if (ph) ph.remove(false); if (inner) inner.dispose(); };
        const build = function () {
          if (dead) return null;
          inner = fn(container, opts);
          h.canvas = inner.canvas || null;
          h._stage = inner._stage || null;
          if (ph) {
            ph.onRemove = function () { if (inner && inner._release) inner._release(); };
            inner._dropPoster = function () { if (ph) ph.remove(true); };
            if (ph.dead) ph.onRemove(); else handOver(ph, container, inner);
          }
          queue.splice(0).forEach(function (q) { if (typeof inner[q[0]] === 'function') inner[q[0]].apply(inner, q[1]); });
          return inner.ready;
        };
        const p = typeof SA.slice === 'function' ? SA.slice(build) : new Promise(function (res) { setTimeout(res, 0); }).then(build);
        h.ready = p.then(function () { return h; }, function (e) { console.error('[Aurelia GL] ' + name + ' failed', e); return h; });
        return h;
      };
    };
    const methods = { gemLab: wrap('gemLab', SA.gemLab), birthstones: wrap('birthstones', SA.birthstones) };
    if (methods.gemLab || methods.birthstones) {
      methods.scenePosters = scenePosters;
      methods.scenePoster = scenePoster;
      methods.scenePosterKey = function (job, mode) { return AU.assetKey(job.spec, 'still', job.px, mode === 'light' ? 'light' : 'dark'); };
    }
    const attach = function (api) {
      if (!api || typeof api !== 'object') return;
      Object.keys(methods).forEach(function (k) { if (methods[k] && typeof api[k] !== 'function') api[k] = methods[k]; });
      if (!Array.isArray(api.stones)) api.stones = (KIT.STONE_LIST || []).slice();
      if (!Array.isArray(api.birthstoneNames)) api.birthstoneNames = (KIT.BIRTHSTONES || []).slice();
    };
    if (typeof AUGL_EXT === 'object' && AUGL_EXT) attach(AUGL_EXT);
    if (AU.on) AU.on('gl', function (api) { attach(api); });
    if (window.AUGL) attach(window.AUGL);
  } catch (err) {
    console.error('[Aurelia GL] gl-scenes-a API failed to attach', err);
  }
}

/* ---- 75-scenes-b.js ---- */
/* =====================================================================================================================
   gl-scenes-b (src/gl/75-89): the velvet box opening, the porcelain hand stack and the molten-gold forge.
     AUGL.box(spec)                              -> Promise          full-screen velvet box opening (~2.4 s, skippable)
     AUGL.stack(container, { specs, label })     -> { setSpecs(specs), dispose() }   rings stacked on a porcelain hand
     AUGL.forge(container, { label })            -> { setProgress(p), dispose() }    molten gold poured, cooled, a ring
   AUSB is the only top-level name this area adds to the shared module scope; every file is wrapped in a block.
   The engine's internals (glBuildPiece, glEnvFor, G_ENV, GlGlints, glStarTexture…) are always feature-tested at call
   time, with a fallback, so these scenes keep working while gl-engine improves 00-59.
   Units: mm, +Y up, the viewer at +Z (as KIT).
   ===================================================================================================================== */
const AUSB = {};
{
  const TAU = Math.PI * 2;
  AUSB.TAU = TAU;
  AUSB.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  AUSB.lerp = function (a, b, t) { return a + (b - a) * t; };
  AUSB.smooth = function (a, b, x) { const t = AUSB.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  AUSB.smoother = function (a, b, x) { const t = AUSB.clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };
  AUSB.seg = function (a, b, x) { return AUSB.clamp((x - a) / (b - a), 0, 1); };
  AUSB.easeOut = function (k) { return 1 - Math.pow(1 - k, 3); };
  AUSB.easeOut5 = function (k) { return 1 - Math.pow(1 - k, 5); };
  AUSB.easeInOut = function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
  AUSB.easeInOutSine = function (k) { return -(Math.cos(Math.PI * k) - 1) / 2; };
  /* a damped spring from 0 to 1 (zeta < 1 overshoots a little): the hinge of a box lid, a ring settling */
  AUSB.spring = function (t, w, zeta) {
    if (t <= 0) return 0;
    const z = zeta == null ? 0.72 : zeta, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t));
  };
  AUSB.rand = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  };
  AUSB.mode = function () { return AU.getMode ? AU.getMode() : 'dark'; };

  /* ---------------- engine adapters (feature-tested at call time) ---------------- */
  const has = function (name) {
    try {
      switch (name) {
        case 'build': return typeof glBuildPiece === 'function';
        case 'env': return typeof glEnvFor === 'function';
        case 'envMix': return typeof glEnvMix === 'function';
        case 'envDispose': return typeof glEnvDispose === 'function';
        case 'gemEnv': return typeof G_ENV === 'object' && G_ENV !== null && 'value' in G_ENV;
        case 'gemLight': return typeof G_ENV_LIGHT === 'object' && G_ENV_LIGHT !== null && 'value' in G_ENV_LIGHT;
        case 'glints': return typeof GlGlints === 'function';
        case 'star': return typeof glStarTexture === 'function';
        case 'keyDirs': return typeof G_KEY_DIRS !== 'undefined' && Array.isArray(G_KEY_DIRS);
        case 'metal': return typeof glMetalMaterial === 'function';
      }
    } catch (e) { /* not there */ }
    return false;
  };
  AUSB.has = has;

  /* the WebGL context alone (the heaviest part of a renderer: made in a slice of its own, AUSB.renderer then wraps it) */
  AUSB.context = function (canvas, o) {
    o = o || {};
    try {
      return canvas.getContext('webgl2', {
        alpha: o.alpha !== false, depth: true, stencil: false, antialias: o.antialias !== false, premultipliedAlpha: true,
        preserveDrawingBuffer: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false
      }) || null;
    } catch (e) { return null; }
  };
  AUSB.renderer = function (canvas, o) {
    o = o || {};
    const opts = {
      canvas: canvas, antialias: o.antialias !== false, alpha: o.alpha !== false, premultipliedAlpha: true,
      powerPreference: 'high-performance', preserveDrawingBuffer: false, stencil: false
    };
    if (o.context) opts.context = o.context;
    const r = new THREE.WebGLRenderer(opts);
    r.setClearColor(0x000000, 0);
    r.toneMapping = o.toneMapping != null ? o.toneMapping : THREE.NeutralToneMapping;
    r.toneMappingExposure = 1;
    r.outputColorSpace = THREE.SRGBColorSpace;
    if (typeof glHardenRenderer === 'function') glHardenRenderer(r);   // integrator: safe compiles across dispose (40-stage.js)
    return r;
  };

  /* the jeweller's lightbox of the engine (so every piece looks the same everywhere), or a small stand-in */
  const ownEnv = new WeakMap();
  AUSB.env = function (renderer, mode) {
    mode = mode === 'light' ? 'light' : 'dark';
    if (has('env')) { try { return glEnvFor(renderer, mode); } catch (e) { /* fall through */ } }
    let rec = ownEnv.get(renderer);
    if (!rec) { rec = { pmrem: new THREE.PMREMGenerator(renderer) }; ownEnv.set(renderer, rec); }
    if (!rec[mode]) {
      const sc = AUSB.roomScene(mode === 'light' ? 1.25 : 1);
      rec[mode] = rec.pmrem.fromScene(sc, 0.02, 0.1, 100);
      AUSB.disposeTree(sc);
    }
    return rec[mode].texture;
  };
  AUSB.envMix = function (renderer, from, to, k) {
    if (has('envMix')) { try { return glEnvMix(renderer, from, to, k); } catch (e) { /* fall through */ } }
    return AUSB.env(renderer, k < 0.5 ? from : to);
  };
  /* an environment made without blocking the page: the engine's idle-sliced one when it has it */
  AUSB.envAsync = function (renderer, mode) {
    mode = mode === 'light' ? 'light' : 'dark';
    if (typeof glEnvAsync === 'function') {
      try {
        return Promise.resolve(glEnvAsync(renderer, 'studio', mode)).then(function (t) { return t || AUSB.env(renderer, mode); }, function () { return AUSB.env(renderer, mode); });
      } catch (e) { /* fall through */ }
    }
    return AUSB.idle(function () { return AUSB.env(renderer, mode); }, 30);
  };
  /* one heavy step in its own idle slice (the engine's queue when it has one, so heavy steps never pile up) */
  AUSB.idle = function (fn, est) {
    if (typeof glIdle === 'function') { try { return Promise.resolve(glIdle(fn, est || 8)); } catch (e) { /* fall through */ } }
    return new Promise(function (res, rej) { AUSB.later(function () { try { res(fn()); } catch (e) { rej(e); } }, 120); });
  };
  /* one step that someone is waiting for (a stage still to appear): the next idle moment, or within `timeout` ms at
     most, but never inside a scroll or a page change */
  AUSB.soon = function (fn, timeout) {
    return new Promise(function (res, rej) {
      const go = function () { try { res(fn()); } catch (e) { rej(e); } };
      const wait = function () {
        if (typeof glBusy === 'function' && !document.hidden && glBusy()) { setTimeout(wait, 90); return; }
        if (window.requestIdleCallback) requestIdleCallback(go, { timeout: timeout || 140 });
        else setTimeout(go, 16);
      };
      wait();
    });
  };
  /* crossfade two environments (CubeUV textures of the same layout) into a target owned by `holder` */
  let mixPass = null;
  AUSB.mixEnv = function (renderer, holder, a, b, k) {
    if (!a || !b || !a.image || a.image.width !== b.image.width || a.image.height !== b.image.height) return k < 0.5 ? a : b;
    if (!holder.rt || holder.rt.width !== a.image.width || holder.rt.height !== a.image.height) {
      if (holder.rt) holder.rt.dispose();
      holder.rt = new THREE.WebGLRenderTarget(a.image.width, a.image.height, {
        type: a.type, format: a.format, colorSpace: a.colorSpace, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter,
        generateMipmaps: false, depthBuffer: false
      });
      holder.rt.texture.mapping = THREE.CubeUVReflectionMapping;
    }
    if (!mixPass) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { a: { value: null }, b: { value: null }, k: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform sampler2D a; uniform sampler2D b; uniform float k; varying vec2 vUv; void main() { gl_FragColor = mix(texture2D(a, vUv), texture2D(b, vUv), k); }',
        depthTest: false, depthWrite: false, toneMapped: false
      });
      const sc = new THREE.Scene(), q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      q.frustumCulled = false; sc.add(q);
      mixPass = { scene: sc, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), mat: mat };
    }
    mixPass.mat.uniforms.a.value = a; mixPass.mat.uniforms.b.value = b; mixPass.mat.uniforms.k.value = k;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(holder.rt);
    renderer.render(mixPass.scene, mixPass.cam);
    renderer.setRenderTarget(prev);
    return holder.rt.texture;
  };
  AUSB.tier = function () { return (KIT && KIT.tier) || { level: 'high', dprCap: 2, msaa: 4 }; };
  AUSB.envDispose = function (renderer) {
    if (has('envDispose')) { try { glEnvDispose(renderer); } catch (e) { /* ignore */ } }
    const rec = ownEnv.get(renderer);
    if (rec) {
      ['dark', 'light'].forEach(function (m) { if (rec[m]) rec[m].dispose(); });
      if (rec.pmrem) rec.pmrem.dispose();
      ownEnv.delete(renderer);
    }
  };
  /* a simple studio: gradient room, two softboxes, a strip and an overhead (used for the fallback and the forge) */
  AUSB.roomScene = function (gain, o) {
    o = o || {};
    const s = new THREE.Scene();
    const geo = new THREE.SphereGeometry(40, 48, 24);
    const p = geo.attributes.position, col = [];
    const top = o.top || [0.3, 0.29, 0.28], mid = o.mid || [0.08, 0.075, 0.07], low = o.low || [0.12, 0.1, 0.09];
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 40;
      const a = y > 0 ? top : low, t = Math.pow(Math.abs(y), 0.75);
      col.push((mid[0] + (a[0] - mid[0]) * t) * gain, (mid[1] + (a[1] - mid[1]) * t) * gain, (mid[2] + (a[2] - mid[2]) * t) * gain);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
    const card = function (dir, w, h, I, c) {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0] * I, c[1] * I, c[2] * I), side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      mesh.position.set(dir[0], dir[1], dir[2]).normalize().multiplyScalar(30);
      mesh.lookAt(0, 0, 0);
      s.add(mesh);
    };
    (o.cards || [
      [[-0.55, 0.62, 0.56], 14, 10, 6, [1, 0.97, 0.92]],
      [[0.92, 0.16, 0.36], 3, 24, 5, [1, 1, 1]],
      [[0.06, 1, 0.18], 16, 16, 2.6, [1, 0.99, 0.98]],
      [[-0.9, 0.18, -0.42], 3, 24, 3.6, [0.94, 0.97, 1]],
      [[0.22, 0.45, -0.86], 20, 3.4, 3.2, [1, 1, 1]]
    ]).forEach(function (c) { card(c[0], c[1], c[2], c[3] * gain, c[4]); });
    return s;
  };
  AUSB.disposeTree = function (root) {
    root.traverse(function (o) {
      if (o.geometry && !(o.geometry.userData && o.geometry.userData.shared)) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        ['map', 'alphaMap', 'normalMap', 'roughnessMap', 'emissiveMap'].forEach(function (k) { if (m[k] && m[k].userData && m[k].userData.auOwn) m[k].dispose(); });
        m.dispose();
      });
    });
  };
  /* the stones' shader samples one shared environment: set it right before every render of a scene with gems */
  AUSB.gemEnv = function (env, light) {
    if (has('gemEnv')) G_ENV.value = env;
    if (has('gemLight')) G_ENV_LIGHT.value = light || 0;
  };
  /* the jeweller's gem room (what a stone sees inside itself: the bright tent of panels and pins the studio's stones
     use, the same in both modes), made in idle steps for a renderer; null where the engine has none */
  AUSB.gemRoom = function (renderer) {
    try { if (typeof glGemEnvAsync === 'function') return Promise.resolve(glGemEnvAsync(renderer)).catch(function () { return null; }); } catch (e) { /* none */ }
    return Promise.resolve(null);
  };
  /* draw with a gem room (stones look as they do in the studio), or plainly where there is none */
  const hasGemDraw = (function () { try { return typeof glGemDraw === 'function'; } catch (e) { return false; } })();
  AUSB.gemDraw = function (tex, fn) {
    if (tex && hasGemDraw) return glGemDraw(tex, fn);
    return fn();
  };
  AUSB.keyDirs = function () {
    if (has('keyDirs') && G_KEY_DIRS.length) return G_KEY_DIRS;
    return [new THREE.Vector3(-0.55, 0.62, 0.56).normalize(), new THREE.Vector3(0.92, 0.16, 0.36).normalize(), new THREE.Vector3(0.06, 1, 0.18).normalize()];
  };

  /* a piece from a spec, built with the engine (never throws); a plain band when the engine cannot */
  AUSB.build = function (spec, o) {
    o = o || {};
    if (has('build')) {
      try { return glBuildPiece(spec, { detail: o.detail || 'hero', lod: o.lod || 1, withEngraving: false }); }
      catch (e) { console.error('[Aurelia GL] scenes-b: build failed', e); }
    }
    const s = KIT.spec(spec);
    const g = new THREE.Group();
    const mat = AUSB.goldMaterial(s.metal);
    g.add(new THREE.Mesh(KIT.band({ inner: KIT.ringInner(s.size), width: 2.6, thick: 1.7 }), mat));
    return { spec: s, object: g, glints: [], view: { tilt: 0.5, still: { tilt: 0.34, turn: -0.62 } }, dispose: function () { AUSB.disposeTree(g); } };
  };
  AUSB.goldMaterial = function (metal, o) {
    o = o || {};
    if (has('metal')) { try { return glMetalMaterial(metal || 'yellow', o); } catch (e) { /* fall through */ } }
    const m = (KIT.METALS && KIT.METALS[metal]) || { color: '#EECB8F', roughness: 0.16 };
    return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(m.color), metalness: 1, roughness: o.roughness != null ? o.roughness : m.roughness });
  };

  /* send meshes' buffers to the GPU one at a time, each in its own idle slice (a first draw uploads everything at
     once, which on a few hundred thousand triangles is a long task): draws the scene with only that mesh visible */
  AUSB.uploadMs = [];
  AUSB.upload = function (renderer, scene, camera, meshes, now, target) {
    let p = Promise.resolve();
    // now (or now() true): one mesh per animation frame, someone is waiting; otherwise one per idle callback
    const slot = function (fn) {
      // (but never inside a scroll or a page change: then it waits for the calm, like any idle work)
      const urgent = (typeof now === 'function' ? now() : !!now) && !(typeof glBusy === 'function' && !document.hidden && glBusy());
      return new Promise(function (res) {
        if (urgent) requestAnimationFrame(function () { res(fn()); });
        else AUSB.later(function () { res(fn()); }, 200);
      });
    };
    meshes.forEach(function (m) {
      p = p.then(function () {
        return slot(function () {
          const hidden = [];
          scene.traverse(function (o) { if ((o.isMesh || o.isSprite || o.isPoints) && o !== m && o.visible) { o.visible = false; hidden.push(o); } });
          const vis = m.visible; m.visible = true;
          const sm = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
          const prevT = renderer.getRenderTarget();
          if (target) renderer.setRenderTarget(target);
          const t0 = performance.now();
          try { renderer.render(scene, camera); } catch (e) { /* the real draw will try again */ }
          AUSB.uploadMs.push(Math.round(performance.now() - t0));
          if (AUSB.uploadMs.length > 40) AUSB.uploadMs.shift();
          if (target) renderer.setRenderTarget(prevT);
          renderer.shadowMap.autoUpdate = sm;
          m.visible = vis;
          hidden.forEach(function (o) { o.visible = true; });
        });
      });
    });
    return p;
  };
  /* the meshes under a root (for AUSB.upload) */
  AUSB.meshesOf = function (root) { const l = []; root.traverse(function (o) { if (o.isMesh) l.push(o); }); return l; };

  /* compile a subtree's programs without blocking (parallel compile where the browser has it) */
  AUSB.compile = function (renderer, obj, camera, scene) {
    try {
      if (renderer.compileAsync) return renderer.compileAsync(obj, camera, scene).catch(function () { /* draw anyway */ });
    } catch (e) { /* fall through */ }
    return Promise.resolve();
  };

  /* the four-point star used for glints: the engine's, or one drawn the same way */
  let starTex = null;
  AUSB.star = function () {
    if (has('star')) { try { return glStarTexture(); } catch (e) { /* fall through */ } }
    if (starTex) return starTex;
    const S = 256, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    const ray = function (ang, len, wid, alpha) {
      g.save(); g.translate(S / 2, S / 2); g.rotate(ang);
      const gr = g.createLinearGradient(0, 0, len * S / 2, 0);
      gr.addColorStop(0, 'rgba(255,255,255,' + alpha + ')'); gr.addColorStop(0.35, 'rgba(255,252,246,' + alpha * 0.45 + ')'); gr.addColorStop(1, 'rgba(255,250,240,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, -wid * S / 2);
      g.quadraticCurveTo(len * S * 0.12, -wid * S * 0.08, len * S / 2, 0); g.quadraticCurveTo(len * S * 0.12, wid * S * 0.08, 0, wid * S / 2);
      g.closePath(); g.fill(); g.restore();
    };
    for (let i = 0; i < 4; i++) ray(i * Math.PI / 2, 0.45, 0.02, 0.8);
    for (let i = 0; i < 4; i++) ray(Math.PI / 4 + i * Math.PI / 2, 0.16, 0.014, 0.18);
    const halo = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.065);
    halo.addColorStop(0, 'rgba(255,255,255,0.9)'); halo.addColorStop(0.1, 'rgba(255,253,248,0.42)'); halo.addColorStop(0.4, 'rgba(255,248,240,0.07)'); halo.addColorStop(1, 'rgba(255,248,240,0)');
    g.fillStyle = halo; g.fillRect(0, 0, S, S);
    starTex = new THREE.CanvasTexture(c);
    starTex.colorSpace = THREE.SRGBColorSpace;
    return starTex;
  };
  /* a small pool of scripted star sprites (box, forge): flare(i, position, size, alpha, rotation) */
  AUSB.Stars = function (scene, n) {
    this.list = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.SpriteMaterial({ map: AUSB.star(), transparent: true, depthTest: false, depthWrite: false, toneMapped: false, premultipliedAlpha: true, opacity: 0, blending: THREE.AdditiveBlending });
      const sp = new THREE.Sprite(m);
      sp.visible = false; sp.renderOrder = 20;
      scene.add(sp);
      this.list.push(sp);
    }
  };
  AUSB.Stars.prototype.set = function (i, pos, size, alpha, rot) {
    const sp = this.list[i];
    if (!sp) return;
    if (!(alpha > 0.003) || !pos) { sp.visible = false; return; }
    sp.visible = true;
    sp.position.copy(pos);
    sp.scale.set(size, size, 1);
    sp.material.opacity = Math.min(1, alpha);
    sp.material.rotation = rot || 0;
  };
  AUSB.Stars.prototype.hide = function () { this.list.forEach(function (s) { s.visible = false; }); };
  AUSB.Stars.prototype.dispose = function () { this.list.forEach(function (s) { s.material.dispose(); }); };

  /* camera framing: distance D along `dir` (unit, target -> camera) and the target, so that every point projects inside
     the frame with margins mg = { t, b, l, r } (fractions of the frame) */
  AUSB.frameFit = function (points, dir, fov, aspect, mg) {
    const tv = Math.tan(THREE.MathUtils.degToRad(fov) / 2), th = tv * aspect;
    const up0 = Math.abs(dir.y) > 0.985 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up0, dir).normalize();
    const vup = new THREE.Vector3().crossVectors(dir, right).normalize();
    const sx = Math.max(0.2, 1 - mg.l - mg.r), sy = Math.max(0.2, 1 - mg.t - mg.b);
    const cx = (mg.l - mg.r) * th, cy = (mg.b - mg.t) * tv;
    const target = new THREE.Vector3();
    points.forEach(function (p) { target.add(p); });
    target.multiplyScalar(1 / Math.max(1, points.length));
    let R = 0;
    points.forEach(function (p) { R = Math.max(R, p.distanceTo(target)); });
    let D = Math.max(1e-3, R) / Math.min(tv * sy, th * sx) + R;
    const q = new THREE.Vector3();
    for (let it = 0; it < 8; it++) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, zmax = 0;
      for (let i = 0; i < points.length; i++) {
        q.copy(points[i]).sub(target);
        const z = q.dot(dir), k = Math.max(1e-3, D - z);
        const px = q.dot(right) / k, py = q.dot(vup) / k;
        if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        if (z > zmax) zmax = z;
      }
      const need = Math.max((x1 - x0) / 2 / (th * sx), (y1 - y0) / 2 / (tv * sy));
      target.addScaledVector(right, ((x0 + x1) / 2 - cx) * D).addScaledVector(vup, ((y0 + y1) / 2 - cy) * D);
      D = Math.max(zmax * 1.05 + 1e-3, D * need);
    }
    return { target: target, D: D };
  };

  /* every material of a piece made fadeable before its shaders compile (so a fade never recompiles) */
  AUSB.prepFade = function (root) {
    const mats = [];
    root.traverse(function (o) {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        if (mats.indexOf(m) >= 0) return;
        mats.push(m);
        if (m.userData.auOpacity == null) m.userData.auOpacity = m.opacity;
        m.transparent = true;
      });
    });
    return mats;
  };
  AUSB.setAlpha = function (mats, a) {
    mats.forEach(function (m) {
      if (m.uniforms && m.uniforms.uOpacity) m.uniforms.uOpacity.value = a;
      else m.opacity = (m.userData.auOpacity == null ? 1 : m.userData.auOpacity) * a;
      // a faint piece stops writing depth, so it never punches holes into what is behind it
      m.depthWrite = a > 0.6;
    });
  };

  /* ---------------- polite work: slices of at most a few ms, in idle time when there is some ---------------- */
  AUSB.later = function (fn, timeout) {
    // integrator: wait out a scroll or a page change (glBusy, 40-stage.js), so no slice lands inside one
    if (typeof glBusy === 'function' && !G_STILL_FAST.on && !document.hidden && glBusy()) return setTimeout(function () { AUSB.later(fn, timeout); }, 140);
    if (window.requestIdleCallback) return requestIdleCallback(function (dl) { fn(dl); }, { timeout: timeout || 120 });
    return setTimeout(function () { fn(null); }, 16);
  };
  /* run phases [{ n, fn(i), end() }] in slices; resolves when all are done (rejects on error, or when cancelled).
     Every unit of work is small (a block of 125 field samples at most), and the clock is read after each one, so a
     slice really stays inside its budget (5 ms by default, never more than the idle time the browser offers). */
  AUSB.slices = function (phases, o) {
    o = o || {};
    const budget = Math.min(6, o.budget || 5);
    return new Promise(function (resolve, reject) {
      let pi = 0, i = 0;
      const step = function (dl) {
        if (o.cancelled && o.cancelled()) { reject(new Error('cancelled')); return; }
        const t0 = performance.now();
        const room = dl && !dl.didTimeout ? Math.max(2, Math.min(budget, dl.timeRemaining() - 1)) : budget;
        try {
          while (pi < phases.length) {
            const ph = phases[pi];
            const n = typeof ph.n === 'function' ? ph.n() : ph.n;
            while (i < n) {
              ph.fn(i++);
              if (performance.now() - t0 > room) { AUSB.later(step, 80); return; }
            }
            if (ph.end) ph.end();
            pi++; i = 0;
            if (performance.now() - t0 > room) { AUSB.later(step, 80); return; }
          }
        } catch (e) { reject(e); return; }
        resolve();
      };
      AUSB.later(step, 80);
    });
  };

  /* ---------------- the field mesher: a self-contained core (no THREE, no closures over this module), so the very
     same code runs in a Worker (its source is posted to one) and, where a Worker cannot be made, here in slices.
     CORE() -> { clamp, smooth, SD (signed distances), mesher(f, cull, o) -> { phases, result() }, run(m) } ---------- */
  const CORE = function () {
    const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    const smooth = function (a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    /* signed distance helpers (negative inside; mm) */
    const SD = {};
    SD.smin = function (a, b, k) {
      if (k <= 0) return a < b ? a : b;
      const h = Math.max(k - Math.abs(a - b), 0) / k;
      return (a < b ? a : b) - h * h * k * 0.25;
    };
    SD.smax = function (a, b, k) { return -SD.smin(-a, -b, k); };
    /* rounded box, half sizes (hx, hy, hz), corner radius r */
    SD.box = function (x, y, z, hx, hy, hz, r) {
      const qx = Math.abs(x) - hx + r, qy = Math.abs(y) - hy + r, qz = Math.abs(z) - hz + r;
      const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0;
      return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0) - r;
    };
    /* a box with soft vertical corners (rv, in plan) and crisper top and bottom edges (rh <= rv) */
    SD.box2 = function (x, y, z, hx, hy, hz, rv, rh) {
      const ax = Math.abs(x) - hx + rv, az = Math.abs(z) - hz + rv;
      const d2 = Math.sqrt(Math.max(ax, 0) * Math.max(ax, 0) + Math.max(az, 0) * Math.max(az, 0)) + Math.min(Math.max(ax, az), 0) - (rv - rh);
      const dy = Math.abs(y) - hy + rh;
      const ox = Math.max(d2, 0), oy = Math.max(dy, 0);
      return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(d2, dy), 0) - rh;
    };
    SD.ellipsoid = function (x, y, z, rx, ry, rz) {
      const a = x / rx, b = y / ry, c = z / rz;
      const k0 = Math.sqrt(a * a + b * b + c * c);
      const a2 = x / (rx * rx), b2 = y / (ry * ry), c2 = z / (rz * rz);
      const k1 = Math.sqrt(a2 * a2 + b2 * b2 + c2 * c2);
      return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
    };
    SD.torus = function (x, y, z, R, r) {   // around the Y axis
      const q = Math.sqrt(x * x + z * z) - R;
      return Math.sqrt(q * q + y * y) - r;
    };
    SD.capsule = function (x, y, z, ax, ay, az, bx, by, bz, r) {
      const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
      const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
      const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
    };
    /* a round cone (tapered capsule) from a (radius ra) to b (radius rb), with its constants precomputed (iq) */
    SD.roundCone = function (a, b, ra, rb) {
      const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
      const l2 = bax * bax + bay * bay + baz * baz, rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
      const pad = Math.max(ra, rb);
      return {
        min: [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.min(a[2], b[2]) - pad],
        max: [Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad, Math.max(a[2], b[2]) + pad],
        f: function (x, y, z) {
          const pax = x - a[0], pay = y - a[1], paz = z - a[2];
          const yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
          const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
          const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
          const k = (rr > 0 ? 1 : rr < 0 ? -1 : 0) * rr * rr * x2;
          if ((zz > 0 ? 1 : zz < 0 ? -1 : 0) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
          if ((yy > 0 ? 1 : yy < 0 ? -1 : 0) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
          return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
        }
      };
    };

    /* per-vertex attributes as plain data (so they cross into a Worker): { kind: 'ao', steps, wts, k, min } is ambient
       occlusion read from the field (how much of the space along the normal is already inside the shape);
       { kind: 'uv', scale } planar coordinates (x, z) / scale */
    const attrFill = function (a) {
      if (a.kind === 'uv') return function (v, P, N, sample, out, off) { out[off] = P[v * 3] / a.scale; out[off + 1] = P[v * 3 + 2] / a.scale; };
      const steps = a.steps || [1.4, 3, 5.5, 9, 14], wts = a.wts || [0.5, 0.42, 0.34, 0.24, 0.14], k = a.k == null ? 0.85 : a.k, lo = a.min == null ? 0.18 : a.min;
      return function (v, P, N, sample, out, off) {
        const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2], nx = N[v * 3], ny = N[v * 3 + 1], nz = N[v * 3 + 2];
        let occ = 0;
        for (let i = 0; i < steps.length; i++) {
          const d = steps[i], s = sample(x + nx * d, y + ny * d, z + nz * d);
          occ += wts[i] * Math.max(0, (d - s) / d);
        }
        out[off] = Math.max(lo, Math.min(1, 1 - occ * k));
      };
    };

    /* the mesher. f(x, y, z) -> distance (mm, negative inside); cull(bmin, bmax, pad) (optional) restricts f to what can
       reach a block. o = { min, max, h (cell, mm), block = 4, attrs: [ { kind… } ] }.
       A coarse grid first; only the blocks the surface can pass through (Lipschitz bound) are sampled finely (and only
       they hold cells: memory follows the surface, not the volume); naive surface nets; then every vertex is moved onto
       the surface and its normal taken from the field itself (central differences of f, not of the grid), so the
       shading is smooth across blocks. Each unit of work is one block. */
    const mesher = function (f, cull, o) {
      const h = o.h, B = o.block || 4, B3 = B * B * B;
      const x0 = o.min[0], y0 = o.min[1], z0 = o.min[2];
      const bx = Math.max(1, Math.ceil((o.max[0] - x0) / h / B)), by = Math.max(1, Math.ceil((o.max[1] - y0) / h / B)), bz = Math.max(1, Math.ceil((o.max[2] - z0) / h / B));
      const NX = bx * B + 1, NY = by * B + 1, NZ = bz * B + 1, SXY = NX * NY;
      const CX = bx + 1, CY = by + 1, H = h * B;
      const coarse = new Float32Array(CX * CY * (bz + 1));
      const val = new Float32Array(NX * NY * NZ).fill(NaN);
      const slot = new Int32Array(bx * by * bz).fill(-1);
      const act = [];
      let cells = null, P = null, N = null, extra = null;
      const vr = [];
      const pos = [], tris = [];
      const reach = H * Math.sqrt(3) * 1.08 + h;
      const cAt = function (i, j, k) { return coarse[i + CX * (j + CY * k)]; };
      /* value at a fine grid point: exact where sampled, else trilinear in the coarse grid */
      const gv = function (i, j, k) {
        i = i < 0 ? 0 : i >= NX ? NX - 1 : i; j = j < 0 ? 0 : j >= NY ? NY - 1 : j; k = k < 0 ? 0 : k >= NZ ? NZ - 1 : k;
        const v = val[i + NX * j + SXY * k];
        if (v === v) return v;
        const ci = Math.min(bx - 1, (i / B) | 0), cj = Math.min(by - 1, (j / B) | 0), ck = Math.min(bz - 1, (k / B) | 0);
        const u = i / B - ci, w2 = j / B - cj, w = k / B - ck;
        const c00 = cAt(ci, cj, ck) * (1 - u) + cAt(ci + 1, cj, ck) * u, c10 = cAt(ci, cj + 1, ck) * (1 - u) + cAt(ci + 1, cj + 1, ck) * u;
        const c01 = cAt(ci, cj, ck + 1) * (1 - u) + cAt(ci + 1, cj, ck + 1) * u, c11 = cAt(ci, cj + 1, ck + 1) * (1 - u) + cAt(ci + 1, cj + 1, ck + 1) * u;
        return (c00 * (1 - w2) + c10 * w2) * (1 - w) + (c01 * (1 - w2) + c11 * w2) * w;
      };
      /* trilinear sample of the grid at a world point (for the occlusion) */
      const sample = function (x, y, z) {
        let fx = (x - x0) / h, fy = (y - y0) / h, fz = (z - z0) / h;
        fx = fx < 0 ? 0 : fx > NX - 1.001 ? NX - 1.001 : fx; fy = fy < 0 ? 0 : fy > NY - 1.001 ? NY - 1.001 : fy; fz = fz < 0 ? 0 : fz > NZ - 1.001 ? NZ - 1.001 : fz;
        const i = fx | 0, j = fy | 0, k = fz | 0, u = fx - i, v = fy - j, w = fz - k;
        return ((gv(i, j, k) * (1 - u) + gv(i + 1, j, k) * u) * (1 - v) + (gv(i, j + 1, k) * (1 - u) + gv(i + 1, j + 1, k) * u) * v) * (1 - w) +
               ((gv(i, j, k + 1) * (1 - u) + gv(i + 1, j, k + 1) * u) * (1 - v) + (gv(i, j + 1, k + 1) * (1 - u) + gv(i + 1, j + 1, k + 1) * u) * v) * w;
      };
      const cellAt = function (I, J, K) {
        const s = slot[((I / B) | 0) + bx * (((J / B) | 0) + by * ((K / B) | 0))];
        return s < 0 ? -1 : cells[s * B3 + (I % B) + B * ((J % B) + B * (K % B))];
      };
      const blk = function (s) { const b = act[s]; return [b % bx, ((b / bx) | 0) % by, (b / (bx * by)) | 0]; };
      const cullBlock = function (i, j, k, pad) {
        if (cull) cull([x0 + i * H, y0 + j * H, z0 + k * H], [x0 + (i + 1) * H, y0 + (j + 1) * H, z0 + (k + 1) * H], pad);
      };
      const dist2 = function (a, b) {
        const dx = pos[a * 3] - pos[b * 3], dy = pos[a * 3 + 1] - pos[b * 3 + 1], dz = pos[a * 3 + 2] - pos[b * 3 + 2];
        return dx * dx + dy * dy + dz * dz;
      };
      const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      const cv = new Float32Array(8);
      const phases = [
        { n: (bz + 1) * CY, fn: function (r) {               // 1. the coarse grid, a row at a time
          const k = (r / CY) | 0, j = r % CY;
          if (cull) cull(null);
          for (let i = 0; i < CX; i++) coarse[i + CX * (j + CY * k)] = f(x0 + i * H, y0 + j * H, z0 + k * H);
        } },
        { n: bz, fn: function (k) {                          // 2. which blocks can hold the surface
          for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
            let mn = Infinity, pos0 = false, neg = false;
            for (let c = 0; c < 8; c++) {
              const v = cAt(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1));
              const a = Math.abs(v); if (a < mn) mn = a;
              if (v < 0) neg = true; else pos0 = true;
            }
            if ((pos0 && neg) || mn < reach) { const b = i + bx * (j + by * k); slot[b] = act.length; act.push(b); }
          }
        }, end: function () { cells = new Int32Array(Math.max(1, act.length * B3)).fill(-1); } },
        { n: function () { return act.length; }, fn: function (s) {   // 3. the fine grid inside one active block
          const b = blk(s), i = b[0], j = b[1], k = b[2];
          cullBlock(i, j, k, 2 * h);
          for (let kk = 0; kk <= B; kk++) {
            const K = k * B + kk, z = z0 + K * h;
            for (let jj = 0; jj <= B; jj++) {
              const J = j * B + jj, y = y0 + J * h;
              let id = i * B + NX * J + SXY * K;
              for (let ii = 0; ii <= B; ii++, id++) {
                if (val[id] === val[id]) continue;
                val[id] = f(x0 + (i * B + ii) * h, y, z);
              }
            }
          }
        } },
        { n: function () { return act.length; }, fn: function (s) {   // 4. one vertex per cell the surface crosses
          const b = blk(s), i = b[0], j = b[1], k = b[2];
          const v0 = pos.length / 3;
          for (let kk = 0; kk < B; kk++) for (let jj = 0; jj < B; jj++) for (let ii = 0; ii < B; ii++) {
            const I = i * B + ii, J = j * B + jj, K = k * B + kk;
            let mask = 0;
            for (let c = 0; c < 8; c++) {
              const v = val[(I + (c & 1)) + NX * (J + ((c >> 1) & 1)) + SXY * (K + ((c >> 2) & 1))];
              cv[c] = v; if (v < 0) mask |= 1 << c;
            }
            if (mask === 0 || mask === 255) continue;
            let sx = 0, sy = 0, sz = 0, n = 0;
            for (let e = 0; e < 12; e++) {
              const a = EDGES[e][0], bb = EDGES[e][1];
              const va = cv[a], vb = cv[bb];
              if ((va < 0) === (vb < 0)) continue;
              const t = va / (va - vb);
              sx += (a & 1) + ((bb & 1) - (a & 1)) * t;
              sy += ((a >> 1) & 1) + (((bb >> 1) & 1) - ((a >> 1) & 1)) * t;
              sz += ((a >> 2) & 1) + (((bb >> 2) & 1) - ((a >> 2) & 1)) * t;
              n++;
            }
            cells[s * B3 + ii + B * (jj + B * kk)] = pos.length / 3;
            pos.push(x0 + (I + sx / n) * h, y0 + (J + sy / n) * h, z0 + (K + sz / n) * h);
          }
          vr[s] = [v0, pos.length / 3];
        } },
        { n: function () { return act.length; }, fn: function (s) {   // 5. a quad around every crossed edge
          const b = blk(s), i = b[0], j = b[1], k = b[2];
          const DIM = [NX, NY, NZ], PS = [1, NX, SXY], Pt = [0, 0, 0], Q = [0, 0, 0];
          for (let kk = 0; kk < B; kk++) for (let jj = 0; jj < B; jj++) for (let ii = 0; ii < B; ii++) {
            const I = i * B + ii, J = j * B + jj, K = k * B + kk;
            Pt[0] = I; Pt[1] = J; Pt[2] = K;
            const pid = I + NX * J + SXY * K;
            const v0 = val[pid];
            for (let ax = 0; ax < 3; ax++) {
              if (Pt[ax] + 1 >= DIM[ax]) continue;
              const v1 = val[pid + PS[ax]];
              if ((v0 < 0) === (v1 < 0)) continue;
              // the four cells around this edge, along the other two axes (u, w cyclic after ax, so u x w = ax)
              const u = ax === 0 ? 1 : ax === 1 ? 2 : 0, w = ax === 0 ? 2 : ax === 1 ? 0 : 1;
              if (Pt[u] < 1 || Pt[w] < 1 || Pt[u] > DIM[u] - 2 || Pt[w] > DIM[w] - 2) continue;
              Q[0] = I; Q[1] = J; Q[2] = K;
              const c11 = cellAt(Q[0], Q[1], Q[2]);
              Q[w]--; const c10 = cellAt(Q[0], Q[1], Q[2]);
              Q[u]--; const c00 = cellAt(Q[0], Q[1], Q[2]);
              Q[w]++; const c01 = cellAt(Q[0], Q[1], Q[2]);
              if (c00 < 0 || c10 < 0 || c11 < 0 || c01 < 0) continue;
              let q0 = c00, q1 = c10, q2 = c11, q3 = c01;
              if (!(v0 < 0)) { q1 = c01; q3 = c10; }
              // split along the shorter diagonal
              if (dist2(q0, q2) <= dist2(q1, q3)) tris.push(q0, q1, q2, q0, q2, q3);
              else tris.push(q0, q1, q3, q1, q2, q3);
            }
          }
        }, end: function () { P = new Float32Array(pos); N = new Float32Array(pos.length); } },
        { n: function () { return act.length; }, fn: function (s) {   // 6. onto the surface; normals from the field
          const r = vr[s];
          if (!r || r[1] <= r[0]) return;
          const b = blk(s);
          cullBlock(b[0], b[1], b[2], 2 * h);
          const e = h * 0.12, mx = h * 0.6;
          for (let v = r[0]; v < r[1]; v++) {
            const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
            const d = f(x, y, z);
            const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
            const l2 = gx * gx + gy * gy + gz * gz;
            if (l2 > 1e-14) {
              const il = 1 / Math.sqrt(l2), s2 = d * 2 * e / l2;
              P[v * 3] = x - clamp(gx * s2, -mx, mx); P[v * 3 + 1] = y - clamp(gy * s2, -mx, mx); P[v * 3 + 2] = z - clamp(gz * s2, -mx, mx);
              N[v * 3] = gx * il; N[v * 3 + 1] = gy * il; N[v * 3 + 2] = gz * il;
            } else N[v * 3 + 1] = 1;
          }
        }, end: function () { if (cull) cull(null); } }
      ];
      const attrs = (o.attrs || []).map(function (a) { return { name: a.name || a.kind, size: a.kind === 'uv' ? 2 : 1, fill: attrFill(a) }; });
      if (attrs.length) {
        const AC = 512;
        phases.push({
          n: function () { return Math.ceil(pos.length / 3 / AC); },
          fn: function (c) {
            const count = P.length / 3;
            if (!extra) { extra = {}; attrs.forEach(function (a) { extra[a.name] = new Float32Array(count * a.size); }); }
            const end = Math.min(count, (c + 1) * AC);
            for (let v = c * AC; v < end; v++) for (let a = 0; a < attrs.length; a++) attrs[a].fill(v, P, N, sample, extra[attrs[a].name], v * attrs[a].size);
          }
        });
      }
      return {
        phases: phases,
        result: function () {
          const nv = P ? P.length / 3 : 0;
          return {
            pos: P || new Float32Array(0), nrm: N || new Float32Array(0),
            idx: nv > 65535 ? new Uint32Array(tris) : new Uint16Array(tris),
            attrs: extra || {}, sizes: attrs.reduce(function (m, a) { m[a.name] = a.size; return m; }, {}),
            stats: { verts: nv, tris: tris.length / 3, blocks: act.length + '/' + (bx * by * bz) }
          };
        }
      };
    };
    const run = function (m) {
      m.phases.forEach(function (ph) {
        const n0 = typeof ph.n === 'function' ? ph.n() : ph.n;
        for (let i = 0; i < n0; i++) ph.fn(i);
        if (ph.end) ph.end();
      });
      return m.result();
    };
    return { clamp: clamp, smooth: smooth, SD: SD, attrFill: attrFill, mesher: mesher, run: run };
  };
  const C = AUSB.core = CORE();
  const SD = AUSB.sd = C.SD;

  /* ambient occlusion and planar uv as attribute descriptions (see attrFill) */
  AUSB.aoAttr = function (o) { return Object.assign({ kind: 'ao', name: 'ao' }, o || {}); };
  AUSB.uvAttr = function (scale) { return { kind: 'uv', name: 'uv', scale: scale }; };

  /* the geometry from a mesher's result */
  const toGeometry = function (r, t0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(r.pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(r.nrm, 3));
    Object.keys(r.attrs || {}).forEach(function (k) { geo.setAttribute(k, new THREE.BufferAttribute(r.attrs[k], (r.sizes && r.sizes[k]) || 1)); });
    geo.setIndex(new THREE.BufferAttribute(r.idx, 1));
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    geo.userData.meshStats = Object.assign({}, r.stats, { ms: Math.round(performance.now() - t0), worker: !!r.worker });
    return geo;
  };

  /* ---------------- meshing off the main thread: a small pool of Workers running CORE ----------------
     A field is given as a factory (a self-contained function (data, core) -> { f, cull }) and its data, so both can be
     posted. Where a Worker cannot be made (or fails), the same factory runs here, in slices. */
  const POOL = { list: [], q: [], jobs: {}, id: 0, broken: false, url: null, idleT: 0 };
  const WORKER_SRC = 'const C = (' + CORE.toString() + ')();\nconst makers = {};\n' +
    'onmessage = function (e) {\n' +
    '  const q = e.data, t0 = Date.now();\n' +
    '  try {\n' +
    '    const mk = makers[q.src] || (makers[q.src] = (new Function("return (" + q.src + ")"))());\n' +
    '    const fld = mk(q.data, C);\n' +
    '    const r = C.run(C.mesher(fld.f, fld.cull || null, q.o));\n' +
    '    r.stats.workMs = Date.now() - t0;\n' +
    '    const tr = [r.pos.buffer, r.nrm.buffer, r.idx.buffer];\n' +
    '    Object.keys(r.attrs).forEach(function (k) { tr.push(r.attrs[k].buffer); });\n' +
    '    postMessage({ id: q.id, r: r }, tr);\n' +
    '  } catch (err) { postMessage({ id: q.id, err: String((err && err.stack) || err) }); }\n' +
    '};';
  const poolSize = function () { return Math.max(1, Math.min(3, ((navigator.hardwareConcurrency || 2) >> 1))); };
  const failPool = function (why) {
    if (POOL.broken) return;
    POOL.broken = true;
    console.warn('[Aurelia GL] scenes-b: meshing workers unavailable, meshing on the main thread', why || '');
    POOL.list.forEach(function (w) { try { w.terminate(); } catch (e) { /* ignore */ } });
    POOL.list = [];
    const pending = Object.keys(POOL.jobs).map(function (k) { return POOL.jobs[k]; }).concat(POOL.q);
    POOL.jobs = {}; POOL.q = [];
    pending.forEach(function (j) { j.fail(new Error('no worker')); });
  };
  const spawn = function () {
    if (!POOL.url) POOL.url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    const w = new Worker(POOL.url);
    w.busy = null;
    w.onmessage = function (e) {
      const m = e.data, job = POOL.jobs[m.id];
      delete POOL.jobs[m.id];
      w.busy = null;
      if (job) { if (m.err) job.fail(new Error(m.err)); else { m.r.worker = true; job.done(m.r); } }
      pump();
    };
    w.onerror = function (e) { e.preventDefault(); failPool(e.message); };
    POOL.list.push(w);
    return w;
  };
  const pump = function () {
    clearTimeout(POOL.idleT);
    while (POOL.q.length && !POOL.broken) {
      let w = POOL.list.filter(function (x) { return !x.busy; })[0];
      if (!w && POOL.list.length < poolSize()) { try { w = spawn(); } catch (e) { failPool(e.message); return; } }
      if (!w) break;
      const job = POOL.q.shift();
      w.busy = job;
      POOL.jobs[job.id] = job;
      try { w.postMessage(job.msg); } catch (e) { delete POOL.jobs[job.id]; w.busy = null; job.fail(e); }
    }
    // workers that have nothing to do for a while are let go (their memory with them)
    if (!POOL.q.length && !Object.keys(POOL.jobs).length) {
      POOL.idleT = setTimeout(function () {
        if (POOL.q.length || Object.keys(POOL.jobs).length) return;
        POOL.list.forEach(function (w) { try { w.terminate(); } catch (e) { /* ignore */ } });
        POOL.list = [];
      }, 20000);
    }
  };
  AUSB.workers = function () { return { broken: POOL.broken, live: POOL.list.length, queued: POOL.q.length }; };

  /* AUSB.meshField(factory, data, o) -> Promise<BufferGeometry>
     o = { min, max, h, block = 4, attrs: [AUSB.aoAttr(), AUSB.uvAttr(s)…], cancelled() (main-thread path) } */
  AUSB.meshField = function (factory, data, o) {
    const t0 = performance.now();
    const opts = { min: o.min, max: o.max, h: o.h, block: o.block || 4, attrs: o.attrs || [] };
    const main = function () {
      const fld = factory(data, C);
      const m = C.mesher(fld.f, fld.cull || null, opts);
      return AUSB.slices(m.phases, { budget: 5, cancelled: o.cancelled }).then(function () { return toGeometry(m.result(), t0); });
    };
    if (POOL.broken || typeof Worker === 'undefined' || typeof Blob === 'undefined' || o.main) return main();
    return new Promise(function (resolve, reject) {
      const id = ++POOL.id;
      POOL.q.push({
        id: id, msg: { id: id, src: factory.toString(), data: data, o: opts },
        done: function (r) { try { resolve(toGeometry(r, t0)); } catch (e) { reject(e); } },
        fail: function () { main().then(resolve, reject); }
      });
      pump();
    });
  };
  /* the same, cut into n slabs along y (each a whole number of blocks, overlapping the next by one block, so the
     pieces meet without a crack) meshed side by side on the pool's workers, then joined into one geometry */
  AUSB.meshFieldSlabs = function (factory, data, o, n) {
    const t0 = performance.now();
    const H = o.h * (o.block || 4);
    const nb = Math.ceil((o.max[1] - o.min[1]) / H);
    n = Math.max(1, Math.min(n || 1, POOL.broken ? 1 : poolSize(), Math.floor(nb / 3)));
    if (n === 1) return AUSB.meshField(factory, data, o);
    const parts = [];
    for (let i = 0; i < n; i++) {
      const b0 = Math.round(nb * i / n), b1 = Math.min(nb, Math.round(nb * (i + 1) / n) + 1);
      parts.push(AUSB.meshField(factory, data, Object.assign({}, o, { min: [o.min[0], o.min[1] + b0 * H, o.min[2]], max: [o.max[0], o.min[1] + b1 * H, o.max[2]] })));
    }
    return Promise.all(parts).then(function (gs) {
      let nv = 0, ni = 0;
      gs.forEach(function (g) { nv += g.attributes.position.count; ni += g.index.count; });
      const geo = new THREE.BufferGeometry();
      const names = Object.keys(gs[0].attributes);
      names.forEach(function (k) {
        const size = gs[0].attributes[k].itemSize, arr = new Float32Array(nv * size);
        let off = 0;
        gs.forEach(function (g) { arr.set(g.attributes[k].array, off); off += g.attributes[k].array.length; });
        geo.setAttribute(k, new THREE.BufferAttribute(arr, size));
      });
      const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let io = 0, vo = 0;
      gs.forEach(function (g) {
        const a = g.index.array;
        for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo;
        io += a.length; vo += g.attributes.position.count;
      });
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      geo.userData.meshStats = { verts: nv, tris: ni / 3, slabs: n, ms: Math.round(performance.now() - t0), parts: gs.map(function (g) { return g.userData.meshStats.workMs || g.userData.meshStats.ms; }), worker: !!gs[0].userData.meshStats.worker };
      gs.forEach(function (g) { g.dispose(); });
      return geo;
    });
  };
  /* AUSB.mesh(f, o): a field given as a plain function, meshed here in slices (o.cull optional) */
  AUSB.mesh = function (f, o) {
    const t0 = performance.now();
    const m = C.mesher(f, o.cull || null, { min: o.min, max: o.max, h: o.h, block: o.block || 4, attrs: o.attrs || [] });
    return AUSB.slices(m.phases, { budget: o.budget || 5, cancelled: o.cancelled }).then(function () { return toGeometry(m.result(), t0); });
  };

  /* ---------------- a live stage: one canvas filling its container, rendered on demand ----------------
     o = { label, alpha (true), fov, dprMax (2), pixelCap, near, far, toneMapping, antialias,
           renderer, scene, camera (optional: adopt ones prepared ahead; the renderer's canvas moves into the container) }
     Subclass-style hooks: stage.update(t, dt) -> keep running?; stage.draw(); stage.onResize(w, h); stage.onMode(m) */
  AUSB.pixelRatio = function (w, h, o) {
    let dpr = Math.min((o && o.dprMax) || AUSB.tier().dprCap || 2, window.devicePixelRatio || 1);
    const cap = (o && o.pixelCap) || 2.4e6;
    if (w * h * dpr * dpr > cap) dpr = Math.max(0.75, Math.sqrt(cap / (w * h)));
    return dpr;
  };
  AUSB.Stage = function (container, o) {
    o = o || {};
    const self = this;
    this.o = o;
    this.container = container;
    try { if (getComputedStyle(container).position === 'static') container.style.position = 'relative'; } catch (e) { /* ignore */ }
    // (o.canvas + o.context: a context made ahead, in a slice of its own)
    const cv = this.canvas = o.renderer ? o.renderer.domElement : (o.canvas || document.createElement('canvas'));
    cv.className = 'augl-canvas augl-canvas--' + (o.kind || 'scene');
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;outline:none;-webkit-tap-highlight-color:transparent;' +
      '-webkit-user-select:none;user-select:none;touch-action:pan-y;opacity:0;transition:opacity .9s cubic-bezier(.22,.61,.36,1);';
    if (o.label) { cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', o.label); }
    else cv.setAttribute('aria-hidden', 'true');
    cv.setAttribute('draggable', 'false');
    container.appendChild(cv);
    this.renderer = o.renderer || AUSB.renderer(cv, { alpha: o.alpha !== false, toneMapping: o.toneMapping, antialias: o.antialias, context: o.context });
    this.scene = o.scene || new THREE.Scene();
    this.camera = o.camera || new THREE.PerspectiveCamera(o.fov || 28, 1, o.near || 1, o.far || 4000);
    this.size = { w: 0, h: 0 };
    this.visible = true; this.disposed = false; this.lost = false; this.dirty = true; this.untick = null;
    this.mode = AUSB.mode();
    this._tick = function (t, dt) { self.frame(t, dt); };
    this.ro = new ResizeObserver(function () { self.resize(); });
    this.ro.observe(container);
    this.io = new IntersectionObserver(function (es) {
      self.visible = es[es.length - 1].isIntersecting;
      if (self.visible) self.invalidate();
    }, { rootMargin: '160px' });
    this.io.observe(container);
    this.offs = [
      AU.on('mode', function (m) { self.mode = m === 'light' ? 'light' : 'dark'; if (self.onMode) self.onMode(self.mode); self.invalidate(); }),
      AU.on('reduced', function () { self.invalidate(); })
    ];
    this.onVis = function () { if (!document.hidden) self.invalidate(); };
    document.addEventListener('visibilitychange', this.onVis);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; self.sleep(); });
    cv.addEventListener('webglcontextrestored', function () { self.lost = false; AUSB.envDispose(self.renderer); if (self.onRestore) self.onRestore(); self.invalidate(); });
    AUSB.stages.add(this);
  };
  AUSB.stages = new Set();
  /* every other live 3D stage on the page holds still (the box opening renders alone); returns the undo */
  AUSB.holdOthers = function () {
    const held = [];
    const hold = function (s) {
      if (!s || s.disposed || s.paused) return;
      s.paused = true;
      try { if (s.sleep) s.sleep(); } catch (e) { /* ignore */ }
      held.push(s);
    };
    AUSB.stages.forEach(hold);
    try { if (typeof G_LIVE !== 'undefined' && G_LIVE && G_LIVE.forEach) G_LIVE.forEach(hold); } catch (e) { /* no engine registry */ }
    return function () {
      held.forEach(function (s) {
        if (s.disposed) return;
        s.paused = false;
        try { if (s.invalidate) s.invalidate(); } catch (e) { /* ignore */ }
      });
    };
  };
  AUSB.Stage.prototype.show = function () { this.canvas.style.opacity = '1'; };
  AUSB.Stage.prototype.resize = function () {
    const w = Math.max(1, Math.round(this.container.clientWidth)), h = Math.max(1, Math.round(this.container.clientHeight));
    if (w === this.size.w && h === this.size.h) return;
    this.size = { w: w, h: h };
    const dpr = AUSB.pixelRatio(w, h, this.o);
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.onResize) this.onResize(w, h);
    this.invalidate();
  };
  AUSB.Stage.prototype.shouldRun = function () { return this.visible && !document.hidden && !this.lost && !this.disposed && !this.paused; };
  AUSB.Stage.prototype.wake = function () { if (this.shouldRun() && !this.untick) this.untick = AU.tick(this._tick); };
  AUSB.Stage.prototype.sleep = function () { if (this.untick) { this.untick(); this.untick = null; } };
  AUSB.Stage.prototype.invalidate = function () { this.dirty = true; this.wake(); };
  AUSB.Stage.prototype.frame = function (t, dt) {
    if (!this.shouldRun()) { this.sleep(); return; }
    try {
      if (!this.size.w) this.resize();
      const moving = this.update ? this.update(t, dt) : false;
      if (moving || this.dirty) { this.draw(); this.dirty = false; }
      if (!moving) this.sleep();
    } catch (e) {
      if (!this.errored) console.error('[Aurelia GL] scene frame failed', e);
      this.errored = true;
      this.sleep();
    }
  };
  AUSB.Stage.prototype.draw = function () { this.renderer.render(this.scene, this.camera); };
  /* a captured frame laid over the canvas and faded out: a soft crossfade for in-place changes */
  AUSB.Stage.prototype.snapshot = function (dur) {
    if (!this.shouldRun() || AU.reduced || this.size.w < 2) return;
    try {
      this.draw();
      const c = document.createElement('canvas');
      c.width = this.canvas.width; c.height = this.canvas.height;
      c.getContext('2d').drawImage(this.canvas, 0, 0);
      c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;opacity:1;transition:opacity ' + dur + 's cubic-bezier(.45,0,.25,1);';
      this.canvas.insertAdjacentElement('afterend', c);
      if (this.snap) this.snap.remove();
      this.snap = c;
      const self = this;
      requestAnimationFrame(function () { requestAnimationFrame(function () { c.style.opacity = '0'; }); });
      setTimeout(function () { c.remove(); if (self.snap === c) self.snap = null; }, dur * 1000 + 250);
    } catch (e) { /* no crossfade then */ }
  };
  AUSB.Stage.prototype.dispose = function () {
    if (this.disposed) return;
    this.sleep();
    this.disposed = true;
    AUSB.stages.delete(this);
    try { this.ro.disconnect(); this.io.disconnect(); } catch (e) { /* ignore */ }
    this.offs.forEach(function (f) { f(); });
    document.removeEventListener('visibilitychange', this.onVis);
    if (this.cleanup) { try { this.cleanup(); } catch (e) { /* ignore */ } }
    if (this.snap) this.snap.remove();
    AUSB.envDispose(this.renderer);
    this.renderer.dispose();
    try { this.renderer.forceContextLoss(); } catch (e) { /* ignore */ }
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  /* ---------------- attaching to window.AUGL once the engine has booted ---------------- */
  AUSB.methods = {};
  const attach = function (api) {
    if (!api || api.__scenesB) return;
    try {
      Object.keys(AUSB.methods).forEach(function (k) { if (!api[k]) api[k] = AUSB.methods[k]; });
      api.__scenesB = true;
      api._scenesB = AUSB;          // for inspection only (tools/shot.js checks)
    } catch (e) { console.error('[Aurelia GL] scenes-b could not attach', e); }
  };
  AUSB.attach = attach;
  // the 'gl' event is dispatched synchronously at boot, before any AU.gl.then() callback runs
  AU.on && AU.on('gl', function (api) { if (api) attach(api); });
  Promise.resolve().then(function () { if (window.AUGL) attach(window.AUGL); });
  if (AU.gl && AU.gl.then) AU.gl.then(function (api) { if (api) attach(api); });
}

/* ---- 76-box.js ---- */
/* ---- AUGL.box(spec) -> Promise: the velvet box opening, played when a piece goes into the bag (idea 4).
   A full-screen layer (its own fixed canvas above the page and its drawers, below toasts) dims the page softly; a
   burgundy velvet box sits closed, its lid opens on the hinge with a soft spring, a light sweeps across the piece
   pressed into the ivory velvet cushion, a few glints flare, then the picture fades away (its canvas, as one image,
   over a soft pool of the page's deepest colour, so the page never shows through the box; the box itself is always
   opaque). About 3 s; a click, Escape or any key ends it early (a quick fade). Resolves at once with reduced motion.
   The dim and the box arrive together on the box's first frame: if that frame cannot be ready within 0.9 s of the
   click (or anything fails), nothing is shown and the promise REJECTS ('box: not ready'), so the caller answers the
   click its own way (the shop: a glint, the chime, the bag drawer). The renderer, the box (meshed on a Worker) and its
   programs are prepared ahead as soon as an add-to-bag button comes into view (even while the page scrolls), and the
   piece itself is built and uploaded ahead (see the end of this file), so the click only starts the timeline. Other
   live stages hold still while it plays. ---- */
{
  const V3 = THREE.Vector3;
  const SD = AUSB.sd;

  /* box proportions (mm): a ring box, and a flatter, wider one for pendants and bracelets */
  /* hb: base height, hl: lid height (deep enough to close over a ring standing in its slit), wall: rim thickness */
  const KINDS = {
    ring: { hx: 29, hz: 28, hb: 25, hl: 26, wall: 3.4, cushion: true },
    flat: { hx: 43, hz: 32, hb: 22, hl: 18, wall: 3.4, cushion: false }
  };
  const kindOf = function (spec) { return spec && spec.type === 'bracelet' ? 'flat' : 'ring'; };
  /* a pendant's chain runs back into the cushion's slit and disappears there: the links behind it are folded away
     (no clipping planes: those make shader variants that cannot be compiled ahead) */
  const tuckChain = function (holder, space, zCut) {
    holder.updateMatrixWorld(true);
    const toLocal = new THREE.Matrix4().copy(space.matrixWorld).invert();
    const m = new THREE.Matrix4(), w = new THREE.Matrix4(), p = new V3(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
    holder.traverse(function (o) {
      if (!o.isInstancedMesh || o.name !== 'chain') return;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        w.copy(toLocal).multiply(o.matrixWorld).multiply(m);
        p.setFromMatrixPosition(w);
        if (p.z < zCut) o.setMatrixAt(i, zero);
      }
      o.instanceMatrix.needsUpdate = true;
    });
  };

  /* ---------------- materials ---------------- */
  /* preparation belongs to a page: when the visitor leaves it, the epoch moves on and unfinished steps stop */
  let epoch = 0;
  const NOISE ='float sbH(vec3 p){p=fract(p*0.3183099+vec3(0.71,0.113,0.419));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}' +
    'float sbN(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(sbH(i),sbH(i+vec3(1,0,0)),f.x),mix(sbH(i+vec3(0,1,0)),sbH(i+vec3(1,1,0)),f.x),f.y),mix(mix(sbH(i+vec3(0,0,1)),sbH(i+vec3(1,0,1)),f.x),mix(sbH(i+vec3(0,1,1)),sbH(i+vec3(1,1,1)),f.x),f.y),f.z);}';
  /* velvet: dark where it faces you, a soft rose bloom where the pile turns away (sheen), with a faint fibre */
  const velvet = function () {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#250308'), roughness: 0.94, metalness: 0,
      sheen: 0.9, sheenRoughness: 0.5, sheenColor: new THREE.Color('#8C3140'), envMapIntensity: 0.4, specularIntensity: 0.2
    });
    m.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;\n' + NOISE)
        .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n' +
          '{ float n = sbN(vObj * 2.2) * 0.6 + sbN(vObj * 7.0) * 0.4; material.sheenColor *= 0.82 + 0.36 * n; material.diffuseColor *= 0.9 + 0.2 * n; }');
    };
    m.customProgramCacheKey = function () { return 'ausb-velvet-1'; };
    return m;
  };
  /* satin: ivory, with a long anisotropic highlight; foil (optional): the house name in gold leaf inside the lid */
  const satin = function (foil) {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#EFE5D8'), roughness: 0.34, metalness: 0,
      sheen: 0.55, sheenRoughness: 0.3, sheenColor: new THREE.Color('#FFF8EE'),
      anisotropy: 0.65, anisotropyRotation: 0, envMapIntensity: 0.55, specularIntensity: 0.6
    });
    if (foil) m.userData.foil = { value: foil };
    m.onBeforeCompile = function (sh) {
      // baked occlusion: the slit, the corners of the well, under the lid's rim
      let vs = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float ao;\nvarying float vAo;' + (foil ? '\nvarying vec2 vFoil;' : ''))
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAo = ao;' + (foil ? '\nvFoil = vec2(position.x / 46.0 + 0.5, position.z / 23.0 + 0.5);' : ''));
      let fs = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAo;' + (foil ? '\nvarying vec2 vFoil;\nuniform sampler2D uFoil;' : ''))
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= vAo;\nreflectedLight.indirectSpecular *= vAo;\nreflectedLight.directDiffuse *= mix(1.0, vAo, 0.7);\nreflectedLight.directSpecular *= mix(1.0, vAo, 0.7);');
      if (foil) {
        sh.uniforms.uFoil = m.userData.foil;
        // gilt: a soft-sheen gold (not a mirror, which would pick up the dark corners of the room), lit as brightly
        // as the metals elsewhere on the site
        fs = fs.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nfloat foilM = texture2D(uFoil, vFoil).r;\nroughnessFactor = mix(roughnessFactor, 0.42, foilM);')
          .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 1.0, foilM);\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.88, 0.66, 0.34), foilM);')
          .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.indirectSpecular *= mix(1.0, 2.1, foilM);')
          // the gilt never burns out to pale yellow as the light sweeps over it: its linear brightness is held under 0.6 (about 0.8 on screen)
          .replace('#include <opaque_fragment>', '{ float fL = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));\n  outgoingLight *= mix(1.0, min(1.0, 0.6 / max(fL, 1e-4)), foilM); }\n#include <opaque_fragment>');
      }
      sh.vertexShader = vs; sh.fragmentShader = fs;
    };
    m.customProgramCacheKey = function () { return foil ? 'ausb-satin-foil-2' : 'ausb-satin-2'; };
    return m;
  };
  /* the cushion: an ivory velvet (a soft rose-ivory bloom where the pile turns away, a faint nap), a little darker than
     the satin lining so the piece, not the pillow, is the brightest thing in the box; baked occlusion in the slit */
  const plush = function () {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#C9BEB2'), roughness: 0.86, metalness: 0,
      sheen: 0.6, sheenRoughness: 0.42, sheenColor: new THREE.Color('#ECDFD6'), envMapIntensity: 0.42, specularIntensity: 0.22
    });
    m.onBeforeCompile = function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float ao;\nvarying float vAo;\nvarying vec3 vObj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAo = ao;\nvObj = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAo;\nvarying vec3 vObj;\n' + NOISE)
        .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n' +
          '{ float n = sbN(vObj * 2.6) * 0.55 + sbN(vObj * 9.0) * 0.45; material.sheenColor *= 0.84 + 0.32 * n; material.diffuseColor *= 0.93 + 0.14 * n; }')
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= vAo;\nreflectedLight.indirectSpecular *= vAo;\nreflectedLight.directDiffuse *= mix(1.0, vAo, 0.75);\nreflectedLight.directSpecular *= mix(1.0, vAo, 0.75);');
    };
    m.customProgramCacheKey = function () { return 'ausb-plush-1'; };
    return m;
  };
  /* the house name for the lid, drawn once the script face has loaded */
  const foilTexture = function () {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = 8;
    const draw = function () {
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
      const name = (AU.content && AU.content.brand && AU.content.brand.name) || 'Aurelia';
      g.fillStyle = '#fff';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '200px "Alex Brush", "Snell Roundhand", cursive';
      // the pad's v runs toward the lid's front edge, which is its top once the lid stands open
      g.fillText(name, 512, 236);
      g.fillRect(512 - 70, 236 + 108, 140, 3);
      tex.needsUpdate = true;
    };
    draw();
    if (document.fonts && document.fonts.load) document.fonts.load('200px "Alex Brush"').then(draw, function () { /* fallback face */ });
    return tex;
  };

  /* ---------------- the box's soft parts, meshed once per kind, off the main thread ----------------
     The parts' fields as one self-contained factory (data, core) -> { f } (it is posted to a meshing Worker as text,
     so it may use nothing but its arguments): D = { part, K, yl, top, cTop, slitR } */
  const BOX_FIELD = function (D, C) {
    const SD = C.SD, smooth = C.smooth, K = D.K;
    const hx = K.hx, hz = K.hz, hb = K.hb, hl = K.hl, w = K.wall, ix = hx - w, iz = hz - w;
    const yl = D.yl, top = D.top, cTop = D.cTop;
    const bulge = function (x, z, a) {
      const u = Math.min(1, Math.abs(x) / (ix - 0.4)), v = Math.min(1, Math.abs(z) / (iz - 0.4));
      return a * (1 - u * u) * (1 - v * v);
    };
    const F = {
      base: function (x, y, z) {
        const outer = SD.box2(x, y - hb / 2, z, hx, hb / 2, hz, 8, 3.2);
        const cav = SD.box2(x, y - (hb + 6), z, ix, 12, iz, 5, 2);
        return SD.smax(outer, -cav, 1.0);
      },
      lid: function (x, y, z) {
        // a hollow cap: deep enough to close over the piece, its walls and top as thick as the base's; the top edge
        // softer than the seam edge, like a padded lid
        const yy = y - (yl + hl / 2);
        const outer = yy > 0 ? SD.box2(x, yy, z, hx, hl / 2, hz, 8, 5.5) : SD.box2(x, yy, z, hx, hl / 2, hz, 8, 3.2);
        const cav = SD.box2(x, y - (top - w - 12), z, ix, 12, iz, 5, 2);
        return SD.smax(outer, -cav, 1.0);
      },
      cushion: function (x, y, z) {
        // a plush pillow filling the well; ring boxes have the slit the band is pressed into, its two rolls parted a
        // little where the ring sits (and a touch fuller either side of it, pushed up by the band)
        const body = SD.box(x, y - (cTop - 4.4), z, ix - 0.25, 4.4, iz - 0.25, 3.4) - bulge(x, z, 0.8) * smooth(cTop - 4, cTop, y);
        if (!K.cushion) return body;
        const near = 1 - smooth(D.slitR - 2, D.slitR + 5, Math.abs(x));
        const half = 0.55 + 0.6 * near;
        const slit = SD.box(x, y - (cTop + 1.2), z, hx + 4, 9.2, half, 0.2);
        const puff = 0.35 * near * smooth(cTop - 3, cTop, y) * (1 - smooth(half + 0.5, half + 5, Math.abs(z)));
        return SD.smax(body - puff, -slit, 1.1);
      },
      pad: function (x, y, z) {
        // the lid's lining: a thin, softly padded panel under its ceiling, its satin gathered in a sunburst of pleats
        const c = top - w - 1.5;
        const r = Math.sqrt(x * x + z * z), th = Math.atan2(z, x);
        // (no pleats under the gilt name: a flat band across the middle keeps it legible)
        const band = 1 - (1 - smooth(5.5, 9, Math.abs(z))) * (1 - smooth(19, 24, Math.abs(x)));
        const pleat = 0.28 * (0.5 - 0.5 * Math.cos(th * 28)) * smooth(4, 13, r) * band * (1 - smooth(ix - 6, ix, Math.max(Math.abs(x), Math.abs(z))));
        return SD.box(x, y - c, z, ix - 0.25, 1.5, iz - 0.25, 1.4) - (bulge(x, z, 0.8) + pleat) * smooth(c + 0.5, c - 1.5, y);
      }
    };
    return { f: F[D.part] };
  };
  const geoCache = {};
  const parts = function (kind) {
    if (geoCache[kind]) return geoCache[kind];
    const K = KINDS[kind], hx = K.hx, hz = K.hz, hb = K.hb, hl = K.hl, w = K.wall;
    const ix = hx - w, iz = hz - w;
    const seam = 0.04;                  // lid and base meet: the closed box shows only the velvet groove
    const yl = hb + seam, top = yl + hl;
    const cTop = hb - 2.6;              // the cushion sits below the rim, so the closed seam stays dark
    const data = function (part) { return { part: part, K: K, yl: yl, top: top, cTop: cTop, slitR: KIT.ringInner(6) + 2 }; };
    // cell sizes: the velvet shells are simple forms, the satin carries the detail; coarser on modest devices
    const q = AUSB.tier().level === 'low' ? 1.5 : AUSB.tier().level === 'mid' ? 1.2 : 1;
    const m = 2, h = 0.72 * q, hs = 0.44 * q;
    const satinAttrs = [AUSB.uvAttr(40), AUSB.aoAttr({ steps: [0.5, 1.2, 2.4, 4.5], wts: [0.55, 0.45, 0.3, 0.2], k: 0.9, min: 0.12 })];
    // (only where there is no Worker and the meshing runs here in slices: stopped when the visitor leaves the page)
    const ep = epoch, cancelled = function () { return ep !== epoch && !playing; };
    const part = function (name, min, max, hh, attrs) {
      return AUSB.meshField(BOX_FIELD, data(name), { min: min, max: max, h: hh, block: 4, attrs: attrs || [], cancelled: cancelled })
        .then(function (g) { g.userData.shared = true; return g; });
    };
    geoCache[kind] = Promise.all([
      part('base', [-hx - m, -m, -hz - m], [hx + m, hb + m, hz + m], h),
      part('lid', [-hx - m, yl - m, -hz - m], [hx + m, top + m, hz + m], h),
      part('cushion', [-ix - m, cTop - 11, -iz - m], [ix + m, cTop + 2, iz + m], hs, satinAttrs),
      part('pad', [-ix - m, top - w - 5, -iz - m], [ix + m, top - w + 0.5, iz + m], hs, satinAttrs)
    ]).then(function (g) { return { base: g[0], lid: g[1], cushion: g[2], pad: g[3], K: K, yl: yl, cTop: cTop, top: top }; });
    geoCache[kind].catch(function () { delete geoCache[kind]; });
    return geoCache[kind];
  };

  /* a soft round shadow texture for the floor under the box */
  let blobTex = null;
  const blob = function () {
    if (blobTex) return blobTex;
    const n = 128, data = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const r = Math.hypot((x + 0.5) / n - 0.5, (y + 0.5) / n - 0.5) * 2;
      const a = Math.exp(-r * r * 3.2) * (1 - AUSB.smooth(0.7, 1, r));
      const k = (y * n + x) * 4;
      data[k] = data[k + 1] = data[k + 2] = 255; data[k + 3] = Math.round(a * 255);
    }
    blobTex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
    blobTex.magFilter = blobTex.minFilter = THREE.LinearFilter;
    blobTex.needsUpdate = true;
    return blobTex;
  };

  /* the sweep on polished metal: a soft diagonal band of light that crosses the piece on screen, added to the metal's
     own shading (chained after the engine's shader changes, under its own program key) */
  const SWEEP = { value: new THREE.Vector4(-1, 0.06, 0, 0) }, SWEEP_RES = { value: new THREE.Vector2(1, 1) };
  const addSweep = function (root) {
    root.traverse(function (o) {
      if (!o.material) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        if (!m.isMeshStandardMaterial || m.metalness < 0.5 || m.userData.ausbSweep) return;
        m.userData.ausbSweep = true;
        const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
        m.onBeforeCompile = function (sh, r) {
          if (prev) prev.call(this, sh, r);
          sh.uniforms.uSweep = SWEEP; sh.uniforms.uSweepRes = SWEEP_RES;
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec4 uSweep;\nuniform vec2 uSweepRes;')
            .replace('#include <opaque_fragment>', '{ vec2 q = gl_FragCoord.xy / uSweepRes; float s = dot(q, vec2(0.82, 0.57));\n' +
              '  float band = exp(-pow((s - uSweep.x) / uSweep.y, 2.0));\n' +
              '  outgoingLight += diffuseColor.rgb * band * uSweep.z; }\n#include <opaque_fragment>');
        };
        m.customProgramCacheKey = function () { return (prevKey ? prevKey.call(m) : '') + '|ausb-sweep'; };
        m.needsUpdate = true;
      });
    });
  };

  /* ---------------- the box's own work queue ----------------
     Every step of the box's preparation is small (a renderer, a build, a part's upload: a few ms each), so unlike the
     engine's prewarming it may run while the page scrolls (a visitor who reads and scrolls, then taps Add, still gets
     the box); it never runs during a page change. Normally a step waits for an idle moment; while a visitor is waiting
     for the box (a click), the queue runs at once, a step per frame. */
  const QUEUE = { q: [], token: 0, pending: false, slow: [] };
  AUSB._boxSlow = QUEUE.slow;
  const pageChanging = function () { return document.documentElement.classList.contains('vt-on'); };
  const pumpQ = function () {
    if (QUEUE.pending || !QUEUE.q.length) return;
    QUEUE.pending = true;
    const tok = ++QUEUE.token;
    const run = function () {
      if (tok !== QUEUE.token || !QUEUE.pending) return;
      QUEUE.pending = false;
      if (pageChanging() && !playing) { setTimeout(pumpQ, 120); return; }
      const job = QUEUE.q.shift();
      const t0 = performance.now();
      if (job) { try { job.res(job.fn()); } catch (e) { job.rej(e); } }
      // (a record of any step over 16 ms, for checking: AUGL._scenesB._boxSlow)
      const ms = performance.now() - t0;
      if (ms > 16 && job) { QUEUE.slow.push([job.name || '?', Math.round(ms), Math.round(t0)]); if (QUEUE.slow.length > 20) QUEUE.slow.shift(); }
      pumpQ();
    };
    if (playing) requestAnimationFrame(run);
    else if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 220 });
    else setTimeout(run, 30);
  };
  /* a visitor is waiting: whatever step is queued runs on the next frame, not at the next idle moment */
  const hurryQ = function () {
    if (!QUEUE.pending) { pumpQ(); return; }
    QUEUE.pending = false;
    QUEUE.token++;
    pumpQ();
  };
  const step = function (fn, name) {
    return new Promise(function (res, rej) { QUEUE.q.push({ fn: fn, res: res, rej: rej, name: name }); pumpQ(); });
  };
  /* a mesh's buffers to the GPU, a mesh per step (drawn alone, as the camera will see it) */
  const uploadParts = function (meshes, ok) {
    let p = Promise.resolve();
    meshes.forEach(function (m) {
      p = p.then(function () {
        return step(function () {
          // (never over a box that is playing: its canvas is on screen)
          if (ok && !ok()) throw new Error('cancelled');
          const hidden = [];
          R.scene.traverse(function (o) { if ((o.isMesh || o.isSprite || o.isPoints) && o !== m && o.visible) { o.visible = false; hidden.push(o); } });
          const vis = m.visible; m.visible = true;
          try { R.renderer.render(R.scene, R.camera); } catch (e) { /* the real draw will try again */ }
          m.visible = vis;
          hidden.forEach(function (o) { o.visible = true; });
        });
      });
    });
    return p;
  };

  /* ---------------- the stage: one renderer for the session, prepared in idle time ---------------- */
  let R = null, preparing = null, playing = null, playT = 0;
  /* a room made by the box's own queue from the engine's lightbox and its PMREM passes (so it is never stuck behind the
     page's prewarming in the engine's idle queue, and it may run while the page scrolls): first its programs, compiled
     off the main thread in the state they are drawn in; then the passes, a few per step, a budget of a few ms each (more
     while a visitor is waiting). Null where the engine does not have those parts. */
  const ownRoom = function (m) {
    let ok = false;
    try { ok = typeof glEnvRec === 'function' && typeof glPmremSteps === 'function' && typeof glLightbox === 'function' && typeof glPmrem === 'function'; } catch (e) { ok = false; }
    if (!ok) return null;
    const renderer = R.renderer, rec = glEnvRec(renderer), key = 'studio|' + m;
    if (rec.envs[key]) return Promise.resolve(rec.envs[key].texture);
    let sc = null, it = null;
    const drop = function () { if (sc) { try { if (typeof glDisposeScene === 'function') glDisposeScene(sc); } catch (e) { /* ignore */ } sc = null; } };
    const warm = function () {
      return step(function () {
        sc = glLightbox(m, 'studio');
        const pm = glPmrem(rec, renderer);
        pm._setSize();
        const target = pm._allocateTargets();
        if (!rec.bg) rec.bg = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ name: 'PMREM.Background', side: THREE.BackSide, depthWrite: false, depthTest: false, color: 0x000000 }));
        const cam = new THREE.PerspectiveCamera(90, 1, 0.1, 100), blur = new THREE.Scene(), bg = new THREE.Scene();
        const plane = new THREE.Mesh(pm._lodPlanes[0], pm._blurMaterial);
        plane.frustumCulled = false; blur.add(plane);
        const bgParent = rec.bg.parent;
        bg.add(rec.bg);
        const prevT = renderer.getRenderTarget(), waits = [];
        try {
          renderer.setRenderTarget(target);
          [sc, bg, blur].forEach(function (o) { waits.push(AUSB.compile(renderer, o, cam, o)); });
        } finally {
          renderer.setRenderTarget(prevT); target.dispose();
          bg.remove(rec.bg); if (bgParent) bgParent.add(rec.bg);
        }
        // (a visitor waiting does not wait long for it: what is not ready then compiles with the first pass)
        return Promise.race([Promise.all(waits), new Promise(function (r) { setTimeout(r, playing ? 150 : 1500); })]);
      }, 'room-programs:' + m);
    };
    return new Promise(function (res, rej) {
      const next = function () {
        step(function () {
          if (rec.envs[key] && !it) return { done: true, value: null };
          if (!it) it = glPmremSteps(rec, renderer, sc, 0.012, 0.1, 100);
          const t0 = performance.now(), budget = playing ? 10 : 5;
          let r;
          do { r = it.next(); } while (!r.done && performance.now() - t0 < budget);
          return r;
        }, 'room:' + m).then(function (r) {
          if (!r.done) { next(); return; }
          drop();
          if (r.value) rec.envs[key] = r.value;
          res(rec.envs[key].texture);
        }, function (e) { drop(); rej(e); });
      };
      warm().then(next, function (e) { drop(); rej(e); });
    });
  };
  /* the room for a mode: the box's own (above); where the engine lacks the parts for that, the engine's, made in its
     idle queue, but made at once in one short step when a visitor has been waiting on it for a moment (the queue held
     back by a long scroll or other work) */
  const envFor = function (m) {
    if (R.env[m]) return Promise.resolve(R.env[m]);
    if (R.envP && R.envP[m]) return R.envP[m];
    R.envP = R.envP || {};
    const own = ownRoom(m);
    if (own) {
      const q = R.envP[m] = own.then(function (t) { R.env[m] = t; delete R.envP[m]; return t; }, function (e) { delete R.envP[m]; throw e; });
      return q;
    }
    const p = R.envP[m] = new Promise(function (res, rej) {
      let done = false;
      const got = function (t) { if (done) return; done = true; clearTimeout(chkT); R.env[m] = t; delete R.envP[m]; res(t); };
      AUSB.envAsync(R.renderer, m).then(got, function (e) { if (!done) { done = true; delete R.envP[m]; rej(e); } });
      let chkT = 0;
      const chk = function () {
        if (done) return;
        if (playing && performance.now() - playT > 260) {
          step(function () { if (!done) got(AUSB.env(R.renderer, m)); });
          return;
        }
        chkT = setTimeout(chk, playing ? 40 : 160);
      };
      chk();
    });
    return p;
  };
  const prepare = function () {
    if (preparing) return preparing;
    const t0 = performance.now(), mark = function (k) { if (R) R.timing[k] = Math.round(performance.now() - t0); };
    // every step can be resumed: whatever an earlier, interrupted preparation finished is kept
    const ep = epoch;
    const live = function () { if (ep !== epoch && !playing) throw new Error('cancelled'); };
    // (the WebGL context in a step of its own, the renderer round it in the next: together they could run long)
    let made = null;
    preparing = new Promise(function (resolve, reject) {
      step(function () {
        live();
        if (R) return;
        const c = document.createElement('canvas');
        c.width = c.height = 16;
        made = { canvas: c, context: AUSB.context(c, { alpha: true }) };
      }, 'context').then(function () { return step(function () {
        live();
        if (R) return;
        const canvas = made.canvas;
        const renderer = AUSB.renderer(canvas, { alpha: true, context: made.context || undefined });
        made = null;
        // no shadow maps: their depth programs cannot be compiled ahead and would stall the first frame; the satin's
        // baked occlusion and the lighting carry the form
        renderer.shadowMap.enabled = false;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(24, 1, 10, 2000);
        const world = new THREE.Group(); scene.add(world);
        const boxG = new THREE.Group(); world.add(boxG);
        const lidPivot = new THREE.Group(); boxG.add(lidPivot);
        const pieceG = new THREE.Group(); boxG.add(pieceG);
        // lights: a soft key from high front-left (shadows: the lid over the satin, the piece on its cushion), a
        // warm fill, a rim behind for the velvet's bloom, and the sweep that crosses the piece
        // (units are mm, so the spots do not decay with distance: their intensity reads as irradiance)
        const key = new THREE.SpotLight(0xfff2e6, 3.4, 0, 0.42, 0.85, 0); key.position.set(-150, 300, 230);
        key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 7; key.shadow.blurSamples = 14;
        key.shadow.bias = -0.0004; key.shadow.normalBias = 0.25; key.shadow.camera.near = 150; key.shadow.camera.far = 700;
        const fill = new THREE.DirectionalLight(0xffeee2, 0.55); fill.position.set(220, 80, 160);
        const rim = new THREE.DirectionalLight(0xfff4ee, 2.4); rim.position.set(60, 140, -260);
        const sweep = new THREE.SpotLight(0xfff8f0, 0, 0, 0.12, 1, 0);
        scene.add(key, key.target, fill, rim, sweep, sweep.target);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blob(), color: 0x000000, transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false }));
        floor.rotation.x = -Math.PI / 2; floor.renderOrder = -1;
        boxG.add(floor);
        const stars = new AUSB.Stars(scene, 3);
        R = { canvas: canvas, renderer: renderer, scene: scene, camera: camera, world: world, boxG: boxG, lidPivot: lidPivot, pieceG: pieceG,
          key: key, fill: fill, rim: rim, sweep: sweep, floor: floor, stars: stars, kinds: {}, env: {}, foil: null, timing: {} };
        mark('renderer');
        canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); R.lost = true; });
        canvas.addEventListener('webglcontextrestored', function () { R.lost = false; R.env = {}; R.envP = {}; R.gem = null; R.gemP = null; });
      }, 'renderer'); }).then(function () {
        live();
        // the room and the box's soft parts at the same time (the parts are meshed on a Worker)
        const m = AUSB.mode();
        return Promise.all([
          R.env[m] ? null : envFor(m).then(function () { mark('env'); }),
          mountKind('ring').then(function () { mark('meshes'); })
        ]);
      }).then(function () {
        live();
        // the stones' own room (as in the studio: a diamond reads white, not grey), in the engine's idle queue after the
        // room the box needs first; the opening uses it once it is there
        if (!R.gemP) R.gemP = (ownRoom('gem') || AUSB.gemRoom(R.renderer)).then(function (t) { R.gem = t; return t; }, function () { return null; });
        // (a visitor already waiting: the opening compiles just what its piece needs, not the whole set ahead)
        if (R.compiled || playing) return null;
        // compile with a piece in place that uses every kind of part (a single stone, instanced pavé and beads, metal),
        // so the first opening has nothing left to compile
        show(R.kinds.ring);
        return step(function () { live(); return AUSB.build({ type: 'ring', style: 'halo', metal: 'yellow', stone: 'diamond', cut: 'round', carat: 1, accent: 'diamond' }, { detail: 'hero' }); });
      }).then(function (built) {
        if (!built) return null;
        addSweep(built.object);
        R.pieceG.add(built.object);
        R.scene.environment = R.env[AUSB.mode()] || R.env.dark || R.env.light;
        AUSB.gemEnv(R.scene.environment, AUSB.mode() === 'light' ? 1 : 0);
        // (three compiles only what is visible: the glints are shown for it)
        const hidden = [];
        R.scene.traverse(function (o) { if ((o.isMesh || o.isSprite) && !o.visible) { o.visible = true; hidden.push(o); } });
        const pc = AUSB.compile(R.renderer, R.scene, R.camera, R.scene);
        hidden.forEach(function (o) { o.visible = false; });
        return pc.then(function () { R.pieceG.remove(built.object); built.dispose(); R.compiled = true; mark('compiled'); });
      }).then(function () {
        live();
        // the box's buffers go to the GPU now, a part per idle slice, not all at once on the first frame (seen by the
        // camera as it will be, or three would cull the parts and upload nothing)
        const k = R.kinds.ring;
        if (k.uploaded) return null;
        show(k);
        frameFor(k);
        R.lidPivot.rotation.x = -1.2;
        return uploadParts([k.base, k.cushion, k.lidG.children[0], k.lidG.children[1], R.floor]).then(function () { k.uploaded = true; mark('uploaded'); });
      }).then(function () {
        live();
        // the drawing buffer at the size it will be shown (a resize on the click would reallocate it in that frame)
        fitSize();
        // the other room too, for a mode switch later, and the bracelet box
        AUSB.later(function () {
          const m = AUSB.mode() === 'light' ? 'dark' : 'light';
          envFor(m).then(function () { return mountKind('flat'); }).catch(function () { /* on demand later */ });
        }, 3000);
        R.ready = true;
        resolve(R);
      }).catch(function (e) {
        // (a context made for a renderer that never came is let go at once)
        if (made && made.context) { try { const x = made.context.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (er) { /* ignore */ } }
        made = null;
        preparing = null; reject(e);
      });
    });
    return preparing;
  };
  /* the canvas's size: a square most of the viewport's shorter side; the drawing buffer is resized only on a change */
  const fitSize = function () {
    const vw = window.innerWidth, vh = window.innerHeight;
    const css = Math.round(Math.min(vw, vh) * (vw < 700 ? 0.98 : 0.9));
    const dpr = Math.min(AUSB.tier().dprCap || 2, window.devicePixelRatio || 1, 1800 / css);
    if (R.css !== css || R.dpr !== dpr) {
      R.css = css; R.dpr = dpr;
      R.renderer.setPixelRatio(dpr);
      R.renderer.setSize(css, css, false);
    }
    SWEEP_RES.value.set(R.canvas.width, R.canvas.height);
    return css;
  };

  /* ---------------- the piece, built ahead on its page (so the click only starts the timeline) ---------------- */
  const pieceKey = function (s) {
    // (normalised by the engine first, so a stack's ring and the same product's own spec match)
    let n = s || {};
    try { if (KIT && KIT.spec) n = KIT.spec(n); } catch (e) { n = s || {}; }
    const o = Object.assign({}, n);
    delete o.size; delete o.engraving; delete o.engravingFont;
    return JSON.stringify(Object.keys(o).sort().map(function (k) { return [k, o[k]]; }));
  };
  let pre = null;          // { key, built, holder, kind, ready, uploaded }
  const dropPre = function () {
    if (!pre || (playing && pre.inUse)) return;
    const p = pre; pre = null;
    if (p.holder && p.holder.parent) p.holder.parent.remove(p.holder);
    if (p.built) { try { p.built.dispose(); } catch (e) { /* ignore */ } }
  };
  const prebuild = function (spec) {
    if (!R || !R.ready || !spec) return Promise.resolve();
    const key = pieceKey(spec);
    if (pre && pre.key === key) return pre.p || Promise.resolve();
    dropPre();
    const ep = epoch, me = pre = { key: key, built: null, holder: null, kind: kindOf(spec), ready: false, uploaded: false };
    const live = function () { if (ep !== epoch || pre !== me || playing) throw new Error('cancelled'); };
    me.p = mountKind(me.kind).then(function (k) {
      live();
      return step(function () {
        live();
        const b = AUSB.build(spec, { detail: 'hero' });
        me.built = b;
        addSweep(b.object);
        me.holder = seat(b, k);
        return k;
      });
    }).then(function (k) {
      live();
      // its programs (a stone not seen yet) and its buffers, in idle slices, with the box as it will be seen
      R.pieceG.add(me.holder);
      show(k); frameFor(k);
      R.scene.environment = R.env[AUSB.mode()] || R.env.dark || R.env.light;
      k.mats.forEach(function (m) { m.envMap = R.scene.environment; });
      return AUSB.compile(R.renderer, R.scene, R.camera, R.scene).then(function () {
        live();
        const parts = k.uploaded ? [] : [k.base, k.cushion, k.lidG.children[0], k.lidG.children[1]];
        return uploadParts(parts.concat(AUSB.meshesOf(me.holder)), function () { return !playing && pre === me && ep === epoch; });
      }).then(function () { k.uploaded = true; me.uploaded = true; });
    }).then(function () {
      if (me.holder && me.holder.parent && !me.inUse) me.holder.parent.remove(me.holder);
      me.ready = true;
    }, function (e) {
      if (me.holder && me.holder.parent && !me.inUse) me.holder.parent.remove(me.holder);
      if (pre === me && !me.inUse) { pre = null; if (me.built) { try { me.built.dispose(); } catch (er) { /* ignore */ } } }
      if (!/cancelled/.test(String(e && e.message))) console.error('[Aurelia GL] box prebuild', e);
    });
    return me.p;
  };
  /* the box of a kind: built once, kept */
  const mountKind = function (kind) {
    if (R.kinds[kind]) return Promise.resolve(R.kinds[kind]);
    return parts(kind).then(function (P) {
      if (!R.foil) R.foil = foilTexture();
      const vel = velvet(), sat = plush(), lining = satin(R.foil);
      const mk = function (geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m; };
      const base = mk(P.base, vel), cushion = mk(P.cushion, sat);
      const lidG = new THREE.Group();
      const lid = mk(P.lid, vel), pad = mk(P.pad, lining);
      lidG.add(lid, pad);
      // the hinge runs along the back top edge of the base: the lid group is built around it
      const hinge = new V3(0, P.yl, -P.K.hz + 1.2);
      lidG.position.copy(hinge).negate();
      const k = { kind: kind, K: P.K, yl: P.yl, cTop: P.cTop, top: P.top, base: base, cushion: cushion, lidG: lidG, hinge: hinge, mats: [vel, sat, lining] };
      R.kinds[kind] = k;
      return k;
    });
  };
  const show = function (k) {
    Object.keys(R.kinds).forEach(function (n) {
      const o = R.kinds[n], on = o === k;
      if (on && !o.base.parent) { R.boxG.add(o.base, o.cushion); R.lidPivot.add(o.lidG); }
      if (!on && o.base.parent) { R.boxG.remove(o.base, o.cushion); R.lidPivot.remove(o.lidG); }
    });
    R.lidPivot.position.copy(k.hinge);
  };

  /* seat the piece: a ring stands in the slit, its stone up and facing you; earrings stand on the cushion; a pendant
     or bracelet lies on the satin bed, tilted toward you; anything too big is scaled to fit inside the box */
  const seat = function (built, k) {
    const s = built.spec, obj = built.object;
    const holder = new THREE.Group(), inner = new THREE.Group();
    holder.add(inner); inner.add(obj);
    const top = k.cTop + 0.6;
    if (s.type === 'pendant') {
      // lying on the cushion's front roll, face up and turned a little toward you; the chain runs back into the slit
      // (presented a little larger than life: at true size a pendant is a speck in a ring box)
      inner.rotation.x = -Math.PI / 2 + 0.42;
      inner.scale.setScalar(1.6);
      inner.position.set(0, top + 3.4, 1.8);
      tuckChain(holder, holder, 0.4);
    } else if (s.type === 'bracelet') {
      // lying on the satin bed, scaled to fit inside the box if it must be
      obj.updateMatrixWorld(true);
      let box = new THREE.Box3().setFromObject(obj);
      let size = box.getSize(new V3());
      if (size.z <= size.y) inner.rotation.x = -Math.PI / 2 + 0.1;     // built standing: lay it down
      inner.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(inner);
      size = box.getSize(new V3());
      const sc = Math.min(1, (k.K.hx - k.K.wall) * 2 * 0.84 / size.x, (k.K.hz - k.K.wall) * 2 * 0.84 / size.z);
      inner.scale.setScalar(sc);
      inner.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(inner);
      const c = box.getCenter(new V3());
      inner.position.set(-c.x, top - box.min.y + 0.2, -c.z);
    } else if (s.type === 'ring') {
      // pressed into the slit: the cushion's rolls cover the lower two fifths of the shank, so the ring is held, not
      // set down on top
      const rIn = KIT.ringInner(s.size || 6);
      inner.position.set(0, top - 7.8 + rIn + 1.6, 0);
      // a tall head must still clear the lid's lining when the box is closed: sink the band deeper into the slit
      holder.updateMatrixWorld(true);
      const hi = new THREE.Box3().setFromObject(obj).max.y;
      const ceiling = k.top - k.K.wall - 3.4;
      if (hi > ceiling) inner.position.y -= Math.min(hi - ceiling, rIn * 0.6);
    } else {
      // earrings: standing on the cushion, their posts pressed into it
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new V3()), c = box.getCenter(new V3());
      const grow = s.style === 'stud' ? 1.5 : 1.15;     // small pieces presented a little larger than life
      const sc = Math.min(grow, (k.K.hx - k.K.wall) * 2 * 0.78 / Math.max(1e-3, size.x), 26 / Math.max(1e-3, size.y));
      obj.position.sub(c);
      inner.scale.setScalar(sc);
      inner.position.set(0, top + size.y * sc / 2 - 1.2, 0);
    }
    return holder;
  };

  /* glint points: the stones' crown facets (highest first), or the crest of a plain band */
  /* (points in the piece group's own space, so they follow the box as it moves) */
  const glintPoints = function (built, holder, space) {
    space.updateMatrixWorld(true);
    const toLocal = new THREE.Matrix4().copy(space.matrixWorld).invert();
    const pts = [];
    (built.glints || []).forEach(function (c) {
      const m = new THREE.Matrix4();
      if (c.inst >= 0 && c.obj.getMatrixAt) { c.obj.getMatrixAt(c.inst, m); m.premultiply(c.obj.matrixWorld); } else m.copy(c.obj.matrixWorld);
      m.premultiply(toLocal);
      pts.push({ p: c.p.clone().applyMatrix4(m), size: (c.size || 2) * 1.6, stone: c.stone });
    });
    // only diamonds (and points a builder chose on its metal) throw a star: on a coloured stone it is wrong
    const list = pts.filter(function (p) { return !p.stone || p.stone === 'diamond'; });
    list.sort(function (a, b) { return b.p.y - a.p.y; });
    // spread them out: the highest, then the next ones that are not too close
    const out = [];
    list.forEach(function (q) { if (out.length < 3 && out.every(function (o) { return o.p.distanceTo(q.p) > 3.4; })) out.push(q); });
    return out;
  };

  /* the camera a little above, looking down into the box, framed on the open box and its lid; the key light, the
     floor shadow and the starting pose of the box for the kind */
  const frameFor = function (k) {
    const K = k.K, cy = K.hb * 0.9, cam = R.camera;
    cam.aspect = 1;
    const elev = 0.4, dist = (K.hx * 2 + 40) / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) * 1.16;
    cam.position.set(0, cy + 14 + Math.sin(elev) * dist, Math.cos(elev) * dist);
    cam.fov = 24;
    cam.lookAt(0, cy + 14, -4);
    cam.updateProjectionMatrix();
    R.look = { from: new V3(0, cy + 14, -4), to: new V3(0, k.cTop + 9, 0) };
    R.key.target.position.set(0, cy, 0);
    R.floor.scale.set(K.hx * 2 * 1.9, K.hz * 2 * 1.7, 1);
    R.floor.position.set(0, 0.05, 2);
    const lightMode = AUSB.mode() === 'light';
    R.floor.material.opacity = lightMode ? 0.32 : 0.6;
    R.floor.material.color.set(lightMode ? 0x3a0a08 : 0x000000);
    R.renderer.toneMappingExposure = 1;
    R.boxG.position.y = -7; R.boxG.scale.setScalar(0.955); R.world.rotation.y = -0.2; R.lidPivot.rotation.x = 0;
    R.sweep.intensity = 0; SWEEP.value.z = 0;
    R.stars.hide();
  };

  /* ---------------- playing it ----------------
     The timeline (s, wall clock from the box's first frame): 0-0.3 the page dims (and the pool gathers behind the box);
     0.15-0.55 the closed box rises in; 0.42-1.4 the lid opens on its hinge with a soft spring; 1.35-2.4 a light sweeps
     across the piece, a few glints, and it holds; 2.4-2.82 the box fades away (the bag drawer comes in under it), and
     the dim follows it, 2.64-3.0. */
  /* The page is never dimmed with nothing in it: the dim, a soft pool of the page's deepest colour behind the box (so
     the page never shows through the box while it fades) and the box itself arrive together, on the box's first frame.
     Prepared, the first frame comes about 0.2 s after the click. Not prepared yet (a tap moments after landing), the
     rest of the preparation runs at once, a step per frame, and the box still plays if its first frame is ready within
     GRACE ms (it nearly always is); only past that is it not played at all: the promise rejects with 'box: not ready'
     and the caller gives its own answer (a glint, the chime, the bag drawer); the preparation carries on for the next
     time. */
  const FADE_IN = 0.55, LID_AT = 0.42, SWEEP_AT = [1.35, 2.2], OUT_AT = 2.4, BOX_OUT = 0.42, DIM_OUT_AT = 2.64, DUR = 3.0, GRACE = 900;
  const play = function (spec, o) {
    o = o || {};
    if (AU.reduced) return Promise.resolve();
    if (playing) return playing;
    let resolveP, rejectP;
    playing = new Promise(function (res, rej) { resolveP = res; rejectP = rej; });
    // whatever preparation is still queued runs now, a step per frame
    playT = performance.now();
    hurryQ();
    const done = function (err) { const r = resolveP, j = rejectP; playing = null; if (err) j(err); else r(); };
    let layer = null, scrim = null, pool = null, untick = null, built = null, holder = null, own = true, finished = false, ending = null, release = null, graceT = 0;
    const cleanup = function () {
      clearTimeout(graceT);
      if (untick) { untick(); untick = null; }
      document.removeEventListener('keydown', onKey, true);
      if (layer) { layer.removeEventListener('pointerdown', onSkip); layer.remove(); layer = null; }
      if (R && R.canvas.parentNode) R.canvas.parentNode.removeChild(R.canvas);
      if (holder && holder.parent) holder.parent.remove(holder);
      // a piece built ahead stays ready for the next time (another of the same piece into the bag)
      if (own && built) { try { built.dispose(); } catch (e) { /* ignore */ } }
      built = null; holder = null;
      if (pre) pre.inUse = false;
      if (R) { R.stars.hide(); R.renderer.toneMappingExposure = 1; }
      if (release) { release(); release = null; }
    };
    const finish = function (err) { if (finished) return; finished = true; cleanup(); done(err); };
    const onSkip = function (e) { if (e) { e.preventDefault(); e.stopPropagation(); } skip(); };
    const onKey = function (e) { if (e.key === 'Tab') return; e.preventDefault(); e.stopPropagation(); skip(); };
    let T0 = 0, tNow = 0;
    const skip = function () { if (!ending && T0) ending = { at: tNow, from: null }; };
    const tStart = performance.now();
    // not ready in time: no box this time (nothing has been shown yet, so nothing has to be taken back)
    graceT = setTimeout(function () {
      if (T0 || finished) return;
      if (R) R.timing.missed = (R.timing.missed || 0) + 1;
      finish(new Error('box: not ready'));
    }, GRACE);

    // the layer, invisible and not yet catching the pointer, until the box's first frame
    layer = document.createElement('div');
    layer.className = 'ausb-box';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = 'position:fixed;inset:0;z-index:245;pointer-events:none;contain:strict;';
    scrim = document.createElement('div');
    scrim.style.cssText = 'position:absolute;inset:0;background:var(--scrim, rgba(28,3,3,.72));opacity:0;will-change:opacity;';
    pool = document.createElement('div');
    pool.style.cssText = 'position:absolute;left:50%;top:50%;width:10px;height:10px;transform:translate(-50%,-50%);opacity:0;will-change:opacity;' +
      'background:radial-gradient(closest-side, var(--bg-deep, #1C0303) 0%, var(--bg-deep, #1C0303) 66%, transparent 100%);';
    layer.appendChild(scrim);
    layer.appendChild(pool);
    document.body.appendChild(layer);

    prepare().then(function () {
      if (finished) return;
      // in the layer already (invisible), at the size it was prepared at, so its first visible frame is like any other
      const css = fitSize();
      R.canvas.style.cssText = 'position:absolute;left:50%;top:50%;width:' + css + 'px;height:' + css + 'px;transform:translate(-50%,-50%);opacity:0;will-change:opacity,transform;pointer-events:none;';
      const pw = Math.round(css * 1.7);
      pool.style.width = pool.style.height = pw + 'px';
      if (layer) layer.appendChild(R.canvas);
      const kind = kindOf(spec);
      return mountKind(kind).then(function (k) {
        if (finished) return;
        if (R.lost) throw new Error('context lost');
        const mode = AUSB.mode();
        const env = R.env[mode] || R.env.dark || R.env.light;
        if (!env) throw new Error('no environment');
        const key = pieceKey(spec);
        let got;
        if (pre && pre.key === key && pre.built && pre.holder && pre.kind === kind) {
          // built (and usually uploaded) ahead, on the product page: the click only starts the timeline
          pre.inUse = true; own = false;
          built = pre.built; holder = pre.holder;
          R.timing.prebuilt = true;
          got = Promise.resolve(!!pre.uploaded);
        } else {
          // the visitor is waiting: build now (a piece takes a few ms), not in the next idle slot
          R.timing.prebuilt = false;
          got = new Promise(function (res) {
            requestAnimationFrame(function () {
              const tb = performance.now();
              const b = AUSB.build(spec || {}, { detail: 'hero' });
              R.timing.build = Math.round(performance.now() - tb);
              res(b);
            });
          }).then(function (b) {
            if (finished) { b.dispose(); return false; }
            built = b;
            addSweep(built.object);
            holder = seat(built, k);
            return false;
          });
        }
        return got.then(function (uploaded) {
          if (finished || !built) return;
          R.pieceG.add(holder);
          show(k);
          frameFor(k);
          R.scene.environment = env;
          k.mats.forEach(function (m) { m.envMap = env; });
          const unseen = function () {
            // one whole frame, unseen: the driver's first draw of the full scene is the slow one
            return new Promise(function (res) { requestAnimationFrame(function () { try { AUSB.gemDraw(R.gem, function () { R.renderer.render(R.scene, R.camera); }); } catch (e) { /* drawn again later */ } res(k); }); });
          };
          if (uploaded && k.uploaded) return unseen();
          // every program a piece uses was compiled while preparing; a new kind of stone still gets its moment (on a
          // cold click, as long as the grace allows: compiled off the main thread, the first frame does not stall)
          const tc = performance.now();
          const room = Math.max(120, GRACE - 170 - (tc - tStart));
          return Promise.race([
            AUSB.compile(R.renderer, R.scene, R.camera, R.scene),
            new Promise(function (r) { setTimeout(r, room); })
          ]).then(function () {
            R.timing.compile = Math.round(performance.now() - tc);
            if (finished) return k;
            const tu = performance.now();
            // the visitor is waiting: the box's parts (the first time this kind is shown) a mesh per frame, the piece's
            // few buffers with the unseen frame itself
            const boxParts = k.uploaded ? [] : [k.base, k.cushion, k.lidG.children[0], k.lidG.children[1]];
            k.uploaded = true;
            return AUSB.upload(R.renderer, R.scene, R.camera, boxParts, true).then(unseen).then(function () {
              R.timing.upload = Math.round(performance.now() - tu);
              return k;
            });
          });
        });
      });
    }).then(function (k) {
      if (finished || !k) { if (!finished) finish(); return; }
      start(k);
    }).catch(function (e) {
      if (finished) return;
      console.error('[Aurelia GL] box', e);
      // no box (nothing was shown yet): the caller answers the click its own way
      finish(e instanceof Error ? e : new Error('box: failed'));
    });

    /* the timeline: a function of the time since the box appeared (wall clock, so a slow frame never slows it) */
    const start = function (k) {
      clearTimeout(graceT);
      R.timing.lastStart = Math.round(performance.now() - tStart);
      const cv = R.canvas;
      SWEEP.value.z = 0;
      const K = k.K, cy = K.hb * 0.9;
      const glints = glintPoints(built, holder, R.pieceG);
      R._glints = glints;
      const cam = R.camera;
      const lightMode = AUSB.mode() === 'light';
      // (the stones' room if it is ready now; the same for the whole opening, so nothing changes mid-way)
      const gem = R.gem || null;
      const tmp = new V3();
      // now the click is answered: the layer takes the pointer and the keys (a click or a key ends it early)
      layer.style.pointerEvents = 'auto';
      layer.style.cursor = 'pointer';
      layer.addEventListener('pointerdown', onSkip);
      document.addEventListener('keydown', onKey, true);
      // every other live 3D stage on the page (the product's studio) holds still while the box plays: one context draws
      release = AUSB.holdOthers();
      if (AU.sound && AU.sound.play) { try { AU.sound.play('box'); } catch (e) { /* silent */ } }
      /* three layers, one gesture: the dim and the pool rise first and fastest (so the box always fades in over the pool,
         never over the page), the box a breath later; at the end the box goes first and the dim follows */
      const dimK = function (t) { return AUSB.easeOut(AUSB.seg(0, 0.3, t)) * (1 - AUSB.easeInOutSine(AUSB.seg(DIM_OUT_AT, DUR, t))); };
      const boxK = function (t) { return AUSB.easeInOutSine(AUSB.seg(0.15, FADE_IN, t)) * (1 - AUSB.easeInOutSine(AUSB.seg(OUT_AT, OUT_AT + BOX_OUT, t))); };
      T0 = performance.now();
      const frame = function () {
        const t = (performance.now() - T0) / 1000;
        tNow = t;
        let fade = 1, dim = 1;
        if (ending && o._freeze != null) { finish(); return; }     // (a held still for checking: a key ends it at once)
        if (ending) {
          // a skip: the box in 0.3 s, the dim a little behind it
          const el = t - ending.at;
          if (ending.from == null) { ending.from = boxK(ending.at); ending.dim = dimK(ending.at); }
          fade = ending.from * (1 - AUSB.easeInOutSine(Math.min(1, el / 0.3)));
          dim = ending.dim * (1 - AUSB.easeInOutSine(AUSB.seg(0.12, 0.42, el)));
          if (el >= 0.42) { finish(); return; }
        } else {
          fade = boxK(t); dim = dimK(t);
          if (t >= DUR) { finish(); return; }
        }
        // arrival: the closed box rises a little and settles as it fades in
        const a = AUSB.easeOut5(AUSB.seg(0, 0.75, t));
        R.boxG.position.y = -7 * (1 - a);
        R.boxG.scale.setScalar(0.955 + 0.045 * a);
        // a slow presentation drift, so the stones change as the light moves
        R.world.rotation.y = -0.2 + 0.16 * AUSB.easeInOutSine(AUSB.seg(0, DUR, t));
        // and, as the light finds the piece, the eye settles on it: a gentle push in
        const push = AUSB.easeInOutSine(AUSB.seg(0.5, OUT_AT, t));
        cam.fov = 24 / (1 + 0.13 * push);
        cam.lookAt(tmp.copy(R.look.from).lerp(R.look.to, 0.35 * push));
        cam.updateProjectionMatrix();
        // the lid: a soft spring on its hinge from LID_AT (a breath of overshoot), settled by 1.3 s
        const open = AUSB.spring(Math.max(0, t - LID_AT), 6.2, 0.8);
        R.lidPivot.rotation.x = -1.9 * open;
        // the sweep: a soft pool of light from the viewer's side, gliding across the satin and the piece from left
        // to right (the band's front catches it as a travelling highlight)
        const sw = AUSB.seg(SWEEP_AT[0], SWEEP_AT[1], t);
        const sx = -120 + 240 * AUSB.easeInOutSine(sw);
        R.sweep.position.set(sx, cy + 60, 240);
        R.sweep.target.position.set(sx * 0.2, cy + 7, 4);
        R.sweep.intensity = 7 * Math.pow(Math.sin(Math.PI * sw), 1.5);
        SWEEP.value.set(0.22 + 0.95 * AUSB.easeInOutSine(sw), 0.045, 1.5 * Math.pow(Math.sin(Math.PI * sw), 1.2), 0);
        // the glints: one after another, each a quick bloom and fade, as the sweep passes
        R.world.updateMatrixWorld(true);
        for (let i = 0; i < 3; i++) {
          const g = glints[i];
          if (!g) { R.stars.set(i, null, 0, 0); continue; }
          const t0 = 1.55 + i * 0.18, life = 0.55;
          const u = AUSB.clamp((t - t0) / life, 0, 1);
          const env = u <= 0 || u >= 1 ? 0 : Math.pow(Math.sin(Math.PI * u), 1.6);
          tmp.copy(g.p).applyMatrix4(R.pieceG.matrixWorld);
          R.stars.set(i, tmp, g.size * (1.1 + 1.25 * env) * (i ? 0.72 : 1), env * fade * (i ? 0.85 : 1), 0.2 + u * 0.55);
        }
        // the layer: the dim, the pool and the picture (the box always opaque: it fades as one image, over the pool)
        if (scrim) scrim.style.opacity = (0.9 * dim).toFixed(3);
        if (pool) pool.style.opacity = (0.97 * dim).toFixed(3);
        cv.style.opacity = fade.toFixed(3);
        const lift = ending ? 0 : AUSB.easeInOutSine(AUSB.seg(OUT_AT - 0.1, OUT_AT + BOX_OUT, t));
        cv.style.transform = 'translate(-50%,-50%) translateY(' + (-10 * lift).toFixed(2) + 'px) scale(' + (1 + 0.025 * lift).toFixed(4) + ')';
        AUSB.gemEnv(R.scene.environment, lightMode ? 1 : 0);
        const tr = performance.now();
        AUSB.gemDraw(gem, function () { R.renderer.render(R.scene, cam); });
        const dr = performance.now() - tr;
        R.timing.frames = (R.timing.frames || []);
        if (R.timing.frames.length < 4 || dr > 12) R.timing.frames.push(Math.round(dr));
      };
      R._frame = frame;
      // (inspection: draw the moment t and return the picture; only used by tools/shot.js checks)
      R._grab = function (t) { o._freeze = t; T0 = performance.now() - t * 1000; frame(); return cv.toDataURL('image/png'); };
      if (o._freeze != null) {
        // a still of one moment (for checking): hold the timeline at o._freeze seconds (read every frame)
        untick = AU.tick(function () { T0 = performance.now() - (+o._freeze) * 1000; frame(); });
        return;
      }
      untick = AU.tick(frame);
      frame();
    };
    return playing;
  };

  AUSB._box = function () { return R; };
  AUSB._boxPre = function () { return pre && { key: pre.key, ready: pre.ready, uploaded: pre.uploaded }; };
  AUSB.methods.box = function (spec, o) {
    try { return play(spec, o); } catch (e) { console.error('[Aurelia GL] box', e); return Promise.resolve(); }
  };

  /* ---------------- when to prepare: only where a piece can go into the bag ----------------
     The renderer, the box (meshed on a Worker) and its programs are made on any page with an add-to-bag button (the
     product page, bespoke, the stack builder, compare) as soon as that button comes into view, or near it (an
     IntersectionObserver; a breath after the page has landed, and after a stack builder's own hand has appeared), in
     small steps that may run while the page scrolls; at once when the visitor reaches for the button (pointer over it
     or down on it, a touch, keyboard focus). The piece that would go into the bag is built and uploaded ahead too (the
     product's, the configured ring, the stack's top ring, the compare column's), so the click only starts the
     timeline. Leaving the page stops what is unfinished (it resumes next time). */
  // (on a product page the whole purchase form counts: a ring's size is chosen there before it can be added)
  const ADD = '[data-pp-form],[data-pp-add],[data-pp-baradd],.cmp__add,[data-bk-add],[data-sk-add]';
  const productSpec = function (id) {
    if (!id || typeof AU.product !== 'function') return null;
    const p = AU.product(id);
    return (p && p.spec) || null;
  };
  /* the piece the visitor would add from this page (or from the button `el`), if there is one */
  const specNow = function (el) {
    try {
      const b = el && el.closest ? el.closest('.cmp__add[data-add]') : null;
      if (b) return productSpec(b.getAttribute('data-add'));
      const c = AU.router && AU.router.current;
      if (!c) return null;
      if (c.name === 'piece' && c.params) return productSpec(c.params.id);
      if (c.name === 'bespoke' && AU.bespoke && typeof AU.bespoke.spec === 'function') return AU.bespoke.spec();
      if (c.name === 'stack' && AUSB._stack && AUSB._stack.topSpec) return AUSB._stack.topSpec();
    } catch (e) { /* none */ }
    return null;
  };
  const warm = function (el) {
    if (!window.AUGL || AU.reduced || playing) return;
    prepare().then(function () { const s = specNow(el); if (s) return prebuild(s); })
      .catch(function (e) { if (!/cancelled/.test(String(e && e.message))) console.error('[Aurelia GL] box prepare', e); });
  };
  const intent = function (e) { const t = e.target, a = t && t.closest && t.closest(ADD); if (a) warm(t); };
  document.addEventListener('pointerover', intent, { passive: true });
  document.addEventListener('pointerdown', intent, { passive: true, capture: true });
  document.addEventListener('touchstart', intent, { passive: true, capture: true });
  document.addEventListener('focusin', intent);
  let arrived = 0, seenT = 0, scanT = 0, io = null;
  /* an add control is in view: prepare (a breath after landing, so the page change itself stays light) */
  const seen = function () {
    clearTimeout(seenT);
    if (!window.AUGL || AU.reduced || playing) return;
    // (the page's own stage first: a second context made while the page's is still being set up can stall it)
    const wait = arrived + 1300 - performance.now();
    if (wait > 0) { seenT = setTimeout(seen, wait + 10); return; }
    // the stack builder's hand comes first: the box waits until it is on screen
    if (AUSB._stack && AUSB._stack.pending && AUSB._stack.pending()) { seenT = setTimeout(seen, 400); return; }
    warm();
  };
  /* watch the page's add controls (looked for again while the page fills in) */
  const watch = function () {
    clearTimeout(scanT);
    if (!window.AUGL || AU.reduced) return;
    const m = document.getElementById('main');
    const list = m ? Array.prototype.slice.call(m.querySelectorAll(ADD)) : [];
    const young = performance.now() - arrived < 6000;
    if (!list.length) { if (young) scanT = setTimeout(watch, 400); return; }
    if (!('IntersectionObserver' in window)) { seen(); return; }
    if (!io) io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) seen(); }, { rootMargin: '30% 0px 30% 0px' });
    io.disconnect();
    list.forEach(function (el) { io.observe(el); });
    if (young) scanT = setTimeout(watch, 1200);
  };
  if (AU.on) {
    AU.on('route', function () {
      // a new page: unfinished preparation stops, a piece built for the last page goes
      epoch++;
      dropPre();
      arrived = performance.now();
      clearTimeout(seenT);
      if (io) io.disconnect();
      watch();
    });
    AU.on('gl', function (api) { if (api) watch(); });
  }
}

/* ---- 78-hand.js ---- */
/* ---- The porcelain hand (for AUGL.stack): a slender left hand standing on its wrist, back of the hand toward the
   viewer (+Z), fingers up (+Y), thumb to the right (+X), as a jeweller's glazed display hand. Modelled as a signed
   distance field given as plain data (each finger one smooth tube along a smooth centre line, its radius an even taper
   from a full base to a slim rounded tip with only a whisper of fullness at the joints; soft ellipsoids for the
   knuckle heads and the pads; a tapered slab for the back of the hand), and meshed off the main thread
   (AUSB.meshField: a Worker, or slices where there is none), once per session. The nail plates and the creases over
   the joints are finer than any mesh: the frames for them are given here (joints[n].nail, .crease, .crease2) and the
   porcelain's shader sculpts them (79-stack.js).
   AUSB.hand() -> Promise<hand>, AUSB.handPath() -> path (at once, no meshing):
     hand = { geometry (position, normal, ao), path, joints, fingers }
     path = { at(s) -> { p, t, up } (s in mm along the ring finger from its knuckle; it runs on past the fingertip),
              tip (s of the fingertip), seat (lowest s a ring can sit at), length } ---- */
{
  const V3 = THREE.Vector3;
  const Z = new V3(0, 0, 1);

  /* the fingers: knuckle (MCP) position, splay (rad, + toward the thumb), the three bone lengths, radii at the knuckle,
     a third of the way up the first bone (the base narrows quickly above the web), the middle joint, the last joint
     and the tip; curl at each joint (rad, toward the palm, -Z). The ring finger is round and even where rings sit. */
  const FINGERS = {
    // (a woman's hand in proportion to a size 6 ring: the last two bones a little shorter than a mannequin's)
    index:  { mcp: [23, -3.5, 0.6], splay: 0.12, len: [38.5, 21.5, 17.5], r: [8.9, 7.95, 7.35, 6.4, 5.15], curl: [0.05, 0.12, 0.09] },
    middle: { mcp: [4.5, 1.5, 0.9], splay: 0.03, len: [43.5, 25, 19], r: [9.2, 8.2, 7.6, 6.6, 5.3], curl: [0.04, 0.11, 0.09] },
    ring:   { mcp: [-15.5, -0.5, 0.5], splay: -0.07, len: [41.5, 23.5, 18], r: [8.95, 8.05, 7.5, 6.5, 5.2], curl: [0.03, 0.09, 0.07] },
    pinky:  { mcp: [-31.5, -10.5, -0.6], splay: -0.2, len: [32, 18.5, 16.5], r: [7.7, 6.9, 6.4, 5.6, 4.5], curl: [0.07, 0.12, 0.09] }
  };
  const Q = 0.3;          // where the base of the first bone has finished narrowing (fraction of its length)

  /* joint positions and directions of a finger: P = [MCP, q, PIP, DIP, tip centre], D = direction of each bone */
  const joints = function (F) {
    const d0 = new V3(Math.sin(F.splay), Math.cos(F.splay), 0);
    const P = [new V3().fromArray(F.mcp)], D = [];
    let c = 0;
    for (let i = 0; i < 3; i++) {
      c += F.curl[i];
      D.push(d0.clone().multiplyScalar(Math.cos(c)).addScaledVector(Z, -Math.sin(c)).normalize());
    }
    P.push(P[0].clone().addScaledVector(D[0], F.len[0] * Q));
    P.push(P[0].clone().addScaledVector(D[0], F.len[0]));
    P.push(P[2].clone().addScaledVector(D[1], F.len[1]));
    // the tip's centre sits back from the end of the bone by most of its radius (the pad closes round it)
    P.push(P[3].clone().addScaledVector(D[2], F.len[2] - F.r[4] * 0.85));
    return { P: P, D: D };
  };
  /* the back of the finger (toward +Z, square to the bone) and its side */
  const dorsal = function (d) { return Z.clone().addScaledVector(d, -d.dot(Z)).normalize(); };

  /* ---------------- the field, as data ---------------- */
  const buildData = function () {
    const prims = [];
    const A = function (v) { return [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)]; };
    const cone = function (a, b, ra, rb, k) { prims.push({ t: 'cone', a: A(a), b: A(b), ra: ra, rb: rb, k: k }); };
    const ell = function (c, r, d, k) {
      // axes: lateral (u), along the bone (v), toward the back of the hand (w)
      const w = dorsal(d), u = new V3().crossVectors(d, w).normalize();
      prims.push({ t: 'ell', c: A(c), r: r, u: A(u), v: A(d), w: A(w), k: k });
    };
    /* the palm: a slab tapering from the wrist to the knuckles, its back gently arched, its top following the line of
       the knuckles (the fingers' bases and the knuckle heads cover the rest) */
    prims.push({ t: 'palm', yW: -95, yK: -6, cx0: -2, cx1: -4.2, hw0: 27, hw1: 35.5, ht0: 15.5, ht1: 12.2, zc0: -3.5, zc1: -3.1, arch: 0.0042, top: [-2.6, 0.0115, -1], cap: 7, k: 0 });
    /* the pads of the palm under the thumb and the little finger */
    prims.push({ t: 'ell', c: [23, -64, -11], r: [13, 22, 11], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1], k: 9 });
    prims.push({ t: 'ell', c: [-26.5, -50, -8.5], r: [9, 21, 10], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1], k: 8 });
    const J = {}, carves = [];
    Object.keys(FINGERS).forEach(function (n) {
      const F = FINGERS[n], j = J[n] = joints(F), P = j.P, D = j.D, R = F.r;
      /* the finger: ONE smooth tube along a smooth centre line (through the knuckle, the two joints and the tip), its
         radius a smooth function of the distance along it: full at the base, narrowing above the web, then an even
         taper to a slim, rounded tip (about 0.78 of the base), with only a whisper of fullness at the two joints. No
         separate bones or joint bulbs, so no seams, nodes or bumps in the silhouette. */
      const L0 = F.len[0], L1 = F.len[1];
      const curve = new THREE.CatmullRomCurve3([P[0], P[2], P[3], P[4]], false, 'centripetal', 0.5);
      const Ltot = curve.getLength();
      const sP = L0, sD = L0 + L1;
      const keys = [[0, R[0]], [L0 * Q, R[1]], [sP, R[2]], [sD, R[3]], [Ltot, R[4]]];
      const lin = function (s) {
        for (let i = 1; i < keys.length; i++) if (s <= keys[i][0]) { const a = keys[i - 1], b = keys[i]; return a[1] + (b[1] - a[1]) * (s - a[0]) / Math.max(1e-6, b[0] - a[0]); }
        return keys[keys.length - 1][1];
      };
      // the piecewise taper, smoothed (a gaussian of 4.5 mm), so its corners round off into one easy line
      const radius = function (s) {
        let acc = 0, w = 0;
        for (let k = -12; k <= 12; k++) { const u = s + k * 0.75, g = Math.exp(-(k * 0.75) * (k * 0.75) / (2 * 4.5 * 4.5)); acc += lin(Math.max(0, Math.min(Ltot, u))) * g; w += g; }
        return acc / w + 0.16 * Math.exp(-Math.pow((s - sP) / 3.2, 2)) + 0.1 * Math.exp(-Math.pow((s - sD) / 2.6, 2));
      };
      const NSEG = Math.max(16, Math.round(Ltot / 2.6)), pts = [], rad = [];
      for (let i = 0; i <= NSEG; i++) {
        const s = i / NSEG * Ltot;
        pts.push(A(curve.getPointAt(i / NSEG)));
        rad.push(+radius(s).toFixed(4));
      }
      prims.push({ t: 'tube', pts: pts, r: rad, k: 3.4 });
      // the knuckle head on the back of the hand
      ell(P[0].clone().addScaledVector(D[0], -1.5).addScaledVector(dorsal(D[0]), R[0] * 0.52), [R[0] * 0.8, 7.5, R[0] * 0.56], D[0], 4);
      /* the nail plate and the creases over the two joints are finer than any mesh: the porcelain's shader sculpts them
         (a plate a breath proud of the skin, its fold, a little more gloss; two soft creases over the middle joint, one
         over the last), from the frames given here */
      const surf = function (s) {
        const u = AUSB.clamp(s / Ltot, 0, 1), c = curve.getPointAt(u), t = curve.getTangentAt(u).normalize(), w = dorsal(t);
        return { c: c, t: t, w: w, r: radius(Math.min(s, Ltot)) };
      };
      // the plate: from the cuticle to a free edge just past the tip's centre (where the back of the tip starts to
      // round over), about half the last bone long, two thirds of the finger wide
      const half = F.len[2] * 0.27 + 0.4, sEdge = Ltot + F.r[4] * 0.12, sMid = sEdge - half;
      const N0 = surf(Math.min(sMid, Ltot)), axisP = N0.c.clone().addScaledVector(N0.t, Math.max(0, sMid - Ltot));
      j.nail = { c: axisP, t: N0.t.clone(), w: N0.w.clone(), r: N0.r, half: half, wide: 0.66 };
      const C0 = surf(sP), C1 = surf(sD);
      j.crease = { c: C0.c.clone(), t: C0.t.clone(), w: C0.w.clone(), r: C0.r };
      j.crease2 = { c: C1.c.clone(), t: C1.t.clone(), w: C1.w.clone(), r: C1.r };
    });
    /* the thumb: from the root of the palm out and forward (in front of the palm, as a display hand holds it) */
    const T = [new V3(27, -80, -9), new V3(40, -53, -17), new V3(45.5, -28, -21.5), new V3(47, -11, -23.5)];
    cone(T[0], T[1], 12, 10.2, 7);
    cone(T[1], T[2], 10.2, 8.4, 3);
    cone(T[2], T[3], 8.4, 6.6, 3);
    return { data: { prims: prims, carves: carves }, joints: J };
  };

  /* the field from its data: a self-contained function (it is posted to a Worker as text), (data, core) -> { f, cull } */
  const HAND_FIELD = function (D, C) {
    const SD = C.SD;
    const make = function (p) {
      let e;
      if (p.t === 'tube') {
        // a chain of short round cones along the finger's centre line (each joins the next on a shared sphere, so the
        // union is smooth); segments that cannot beat the nearest one found so far are skipped
        const segs = [], pts = p.pts, r = p.r;
        const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
        for (let i = 0; i + 1 < pts.length; i++) {
          const a = pts[i], b = pts[i + 1], rc = SD.roundCone(a, b, r[i], r[i + 1]);
          const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, cz = (a[2] + b[2]) / 2;
          const hl = Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]) + (b[2] - a[2]) * (b[2] - a[2])) / 2;
          segs.push({ f: rc.f, cx: cx, cy: cy, cz: cz, reach: hl + Math.max(r[i], r[i + 1]), rin: Math.min(r[i], r[i + 1]) - hl });
          for (let q = 0; q < 3; q++) { mn[q] = Math.min(mn[q], rc.min[q]); mx[q] = Math.max(mx[q], rc.max[q]); }
        }
        e = { min: mn, max: mx, f: function (x, y, z) {
          let best = 1e9;
          for (let i = 0; i < segs.length; i++) {
            const s = segs[i], dx = x - s.cx, dy = y - s.cy, dz = z - s.cz;
            const dc = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dc - s.reach >= best) continue;           // (a lower bound of this segment's distance)
            const d = s.f(x, y, z);
            if (d < best) best = d;
          }
          return best;
        } };
      } else if (p.t === 'cone') {
        const rc = SD.roundCone(p.a, p.b, p.ra, p.rb);
        e = { f: rc.f, min: rc.min, max: rc.max };
      } else if (p.t === 'taper') {
        // a tube along a straight axis whose radius eases from r0 to r1: r(t) = r1 + (r0 - r1) * g(t), g an
        // exponential ease normalised to 1 at t = 0 and 0 at t = 1; rounded ends (the slope is gentle, so the distance
        // measured square to the axis is close to the true one)
        const a = p.a, b = p.b, bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
        const L2 = bx * bx + by * by + bz * bz, e1 = Math.exp(-1 / p.tau), pad = Math.max(p.r0, p.r1);
        e = { min: [Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.min(a[2], b[2]) - pad],
          max: [Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad, Math.max(a[2], b[2]) + pad],
          f: function (x, y, z) {
            const px = x - a[0], py = y - a[1], pz = z - a[2];
            let t = (px * bx + py * by + pz * bz) / L2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const dx = px - bx * t, dy = py - by * t, dz = pz - bz * t;
            const g = (Math.exp(-t / p.tau) - e1) / (1 - e1);
            return Math.sqrt(dx * dx + dy * dy + dz * dz) - (p.r1 + (p.r0 - p.r1) * g);
          } };
      } else if (p.t === 'ell') {
        const c = p.c, r = p.r, u = p.u, v = p.v, w = p.w, R = Math.max(r[0], r[1], r[2]);
        e = { min: [c[0] - R, c[1] - R, c[2] - R], max: [c[0] + R, c[1] + R, c[2] + R], f: function (x, y, z) {
          const dx = x - c[0], dy = y - c[1], dz = z - c[2];
          return SD.ellipsoid(dx * u[0] + dy * u[1] + dz * u[2], dx * v[0] + dy * v[1] + dz * v[2], dx * w[0] + dy * w[1] + dz * w[2], r[0], r[1], r[2]);
        } };
      } else {
        // the palm slab
        e = { min: [-80, -400, -60], max: [80, 30, 40], f: function (x, y, z) {
          const t = C.clamp((y - p.yW) / (p.yK - p.yW), 0, 1), s = t * t * (3 - 2 * t);
          const cx = p.cx0 + (p.cx1 - p.cx0) * t, hw = p.hw0 + (p.hw1 - p.hw0) * s, ht = p.ht0 + (p.ht1 - p.ht0) * t;
          const dx = x - cx, zc = p.zc0 + (p.zc1 - p.zc0) * t - p.arch * dx * dx;
          const rc = ht * 0.94;
          const qx = Math.abs(dx) - hw + rc, qz = Math.abs(z - zc) - ht + rc;
          const ox = qx > 0 ? qx : 0, oz = qz > 0 ? qz : 0;
          const d2 = Math.sqrt(ox * ox + oz * oz) + Math.min(Math.max(qx, qz), 0) - rc;
          const xt = x - p.top[2], dy = y - (p.top[0] - p.top[1] * xt * xt);
          return SD.smax(d2, dy, p.cap);
        } };
      }
      e.k = p.k;
      return e;
    };
    const prims = D.prims.map(make);
    const carves = (D.carves || []).map(make);
    let act = prims, actC = carves;
    const f = function (x, y, z) {
      let d = 1e3;
      for (let i = 0; i < act.length; i++) { const p = act[i]; d = SD.smin(d, p.f(x, y, z), p.k); }
      // the shallow carvings (nail beds, creases): only where the surface is
      for (let i = 0; i < actC.length; i++) { const c = actC[i]; if (d > -2 && d < 2) d = SD.smax(d, -c.f(x, y, z), c.k); }
      return d;
    };
    const near = function (list, bmin, bmax, pad) {
      return list.filter(function (p) {
        const e = p.k + pad + 0.5;
        return !(p.max[0] + e < bmin[0] || p.min[0] - e > bmax[0] || p.max[1] + e < bmin[1] || p.min[1] - e > bmax[1] || p.max[2] + e < bmin[2] || p.min[2] - e > bmax[2]);
      });
    };
    const cull = function (bmin, bmax, pad) {
      if (!bmin) { act = prims; actC = carves; return; }
      act = near(prims, bmin, bmax, pad);
      actC = near(carves, bmin, bmax, pad);
    };
    return { f: f, cull: cull };
  };
  AUSB.HAND_FIELD = HAND_FIELD;

  /* ---------------- the ring finger's path, and where a ring can sit (no meshing needed) ---------------- */
  let info = null;
  const makeInfo = function () {
    if (info) return info;
    const b = buildData();
    const fld = HAND_FIELD(b.data, AUSB.core);
    const RJ = b.joints.ring, F = FINGERS.ring;
    // the ring finger's centre line (rings arrive and leave along it), carried on past the fingertip
    const tipEnd = RJ.P[4].clone().addScaledVector(RJ.D[2], F.r[4]);
    // (the same smooth centre line the finger is modelled on, so a ring is always centred on it)
    const pts = [RJ.P[0], RJ.P[2], RJ.P[3], RJ.P[4], tipEnd];
    const RC = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
    const Lr = RC.getLength(), EXT = 120, L = Lr + EXT;
    const pEnd = RC.getPointAt(1), tEnd = RC.getTangentAt(1).normalize();
    const NS = 900, table = [];
    for (let i = 0; i <= NS; i++) {
      const s = i / NS * L;
      table.push(s <= Lr ? RC.getPointAt(s / Lr) : pEnd.clone().addScaledVector(tEnd, s - Lr));
    }
    const path = {
      length: L,
      tip: Lr - 1,
      at: function (s) {
        const u = AUSB.clamp(s / L, 0, 1) * NS, i = Math.min(NS - 1, Math.floor(u)), k = u - i;
        const p = table[i].clone().lerp(table[i + 1], k);
        const t = table[Math.min(NS, i + 1)].clone().sub(table[i]).normalize();
        const up = Z.clone().addScaledVector(t, -t.dot(Z)).normalize();
        return { p: p, t: t, up: up };
      }
    };
    /* the finger's radius at s (walk out from the axis in 8 directions until the field says "outside", keep the
       largest), and whether a band of outer radius `clear` would touch anything else there (a neighbouring finger) */
    path.radius = function (s, clear) {
      const P = path.at(s), side = new V3().crossVectors(P.up, P.t);
      fld.cull([P.p.x - 16, P.p.y - 16, P.p.z - 16], [P.p.x + 16, P.p.y + 16, P.p.z + 16], 1);
      let R = 0, free = true;
      for (let a = 0; a < 8; a++) {
        const ang = a / 8 * AUSB.TAU, dir = P.up.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, Math.sin(ang));
        const at = function (r) { return fld.f(P.p.x + dir.x * r, P.p.y + dir.y * r, P.p.z + dir.z * r); };
        let r = 5;
        while (r < 14 && at(r) < 0) r += 0.25;
        let lo = r - 0.25, hi = r;
        for (let it = 0; it < 6; it++) { const m = (lo + hi) / 2; if (at(m) < 0) lo = m; else hi = m; }
        R = Math.max(R, hi);
        if (clear && at(clear) < 0.4) free = false;
      }
      fld.cull(null);
      return clear ? { r: R, free: free } : R;
    };
    /* the lowest place a ring (inner radius 8.25, outer about 10.3) can sit: where the finger has narrowed to fit it
       and the neighbouring fingers have parted enough */
    let seat = 16;
    path.probe = [];
    for (let s = 5; s < 30; s += 0.5) {
      const q = path.radius(s, 10.6);
      if (s % 2 === 0) path.probe.push([s, +q.r.toFixed(2), q.free]);
      if (q.r <= 8.22 && q.free) { seat = s; break; }
    }
    path.seat = seat;
    info = { data: b.data, joints: b.joints, path: path, fingers: FINGERS };
    return info;
  };
  AUSB.handPath = function () { return makeInfo().path; };

  /* ---------------- the mesh, once per session ---------------- */
  let cached = null;
  AUSB.hand = function () {
    if (cached) return cached;
    const t0 = performance.now();
    let I;
    try { I = makeInfo(); } catch (e) { return Promise.reject(e); }
    const lvl = AUSB.tier().level;
    // (vertices are moved onto the surface and lit with the field's own normals, so a finer grid buys little: the
    // shading is smooth at these cell sizes, and the mesh arrives sooner)
    const h = lvl === 'low' ? 0.64 : lvl === 'mid' ? 0.58 : 0.52;
    // only what the camera can ever see: from the back of the hand just below the knuckles (the frame fades out there)
    // to the fingertips, at every turn of the hand
    cached = AUSB.meshField(HAND_FIELD, I.data, {
      min: [-54, -28, -27], max: [56, 101, 17], h: h, block: 4,
      attrs: [AUSB.aoAttr({ steps: [1.2, 2.6, 4.8, 8, 12.5], wts: [0.5, 0.42, 0.34, 0.24, 0.14], k: 0.8, min: 0.22 })]
    }).then(function (geo) {
      geo.userData.shared = true;
      geo.userData.meshStats.total = Math.round(performance.now() - t0);
      return { geometry: geo, path: I.path, joints: I.joints, fingers: FINGERS };
    });
    cached.catch(function (e) { console.error('[Aurelia GL] the porcelain hand could not be built', e); cached = null; });
    return cached;
  };
}

/* ---- 79-stack.js ---- */
/* ---- AUGL.stack(container, { specs, label }) -> { setSpecs(specs), dispose(), ready }
   Up to three rings stacked on the ring finger of a porcelain hand, as in a jeweller's window. specs[0] sits lowest
   (nearest the palm), the others above it, each as close as its shape allows (heads clear each other, bands touch).
   Changing the specs slides rings off over the fingertip and new ones on; a change of metal or stone only (same
   shape) crossfades in place. The hand turns slowly to and fro; drag to turn it. ---- */
{
  const V3 = THREE.Vector3;
  const MAX = 3, RING_SIZE = 6;
  const norm = function (s) {
    const n = KIT.spec(Object.assign({}, s || {}, { size: RING_SIZE, engraving: '' }));
    n.type = 'ring';
    if (KIT.STYLES.ring.indexOf(n.style) < 0) n.style = 'band';
    return n;
  };
  const keyOf = function (n) { return [n.style, n.metal, n.stone || '-', n.cut, n.carat.toFixed(3), n.accent || '-'].join('|'); };
  const shapeOf = function (n) { return [n.style, n.stone ? 's' : '-', n.cut, n.carat.toFixed(3), n.accent || '-'].join('|'); };

  /* the ring's extent along its axis, binned by angle and radius: lets two rings sit as close as their shapes allow */
  const NT = 48, NR = 34, R0 = 4, DR = 0.8;
  const profile = function (built) {
    const zmin = new Float32Array(NT * NR).fill(Infinity), zmax = new Float32Array(NT * NR).fill(-Infinity);
    const v = new V3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
    let bandLo = Infinity, bandHi = -Infinity, rIn = KIT.ringInner(RING_SIZE);
    built.object.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(built.object.matrixWorld).invert();
    const put = function (x, y, z) {
      const r = Math.sqrt(x * x + y * y);
      const ri = Math.floor((r - R0) / DR);
      if (ri < 0 || ri >= NR) return;
      let a = Math.atan2(y, x); if (a < 0) a += AUSB.TAU;
      const ti = Math.min(NT - 1, Math.floor(a / AUSB.TAU * NT)), b = ti * NR + ri;
      if (z < zmin[b]) zmin[b] = z; if (z > zmax[b]) zmax[b] = z;
      if (r < rIn + 2.6) { if (z < bandLo) bandLo = z; if (z > bandHi) bandHi = z; }
    };
    built.object.traverse(function (o) {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      const pos = o.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / 24000));
      m.copy(inv).multiply(o.matrixWorld);
      const n = o.isInstancedMesh ? o.count : 1;
      for (let k = 0; k < n; k++) {
        if (o.isInstancedMesh) { o.getMatrixAt(k, im); im.premultiply(m); } else im.copy(m);
        for (let i = 0; i < pos.count; i += (o.isInstancedMesh ? 1 : step)) {
          v.fromBufferAttribute(pos, i).applyMatrix4(im);
          put(v.x, v.y, v.z);
        }
      }
    });
    // the band's half width where it touches the finger (bottom of the ring)
    const bottom = Math.floor(0.75 * NT);
    let hw = 1;
    for (let ri = 0; ri < NR; ri++) { const b = bottom * NR + ri; if (zmax[b] > -Infinity) hw = Math.max(hw, (zmax[b] - zmin[b]) / 2); }
    return { zmin: zmin, zmax: zmax, lo: isFinite(bandLo) ? bandLo : -1.2, hi: isFinite(bandHi) ? bandHi : 1.2, hw: Math.min(2.4, hw) };
  };
  /* how far above ring A (along the finger) ring B must sit so that nothing of the two overlaps */
  const spacing = function (A, B) {
    let d = A.hi - B.lo;
    for (let t = 0; t < NT; t++) for (let r = 0; r < NR; r++) {
      const b = t * NR + r;
      if (B.zmin[b] === Infinity) continue;
      for (let dt = -1; dt <= 1; dt++) for (let dr = -1; dr <= 1; dr++) {
        const rr = r + dr; if (rr < 0 || rr >= NR) continue;
        const a = ((t + dt + NT) % NT) * NR + rr;
        if (A.zmax[a] === -Infinity) continue;
        const need = A.zmax[a] - B.zmin[b];
        if (need > d) d = need;
      }
    }
    return d + 0.3;
  };

  /* porcelain: a glazed warm ivory, lit by its own small studio (not by the jeweller's lightbox, whose many small
     bright panels would sparkle on a glaze like droplets): one large softbox high on the left, reflected as a single
     broad soft highlight; a soft wrapped diffuse with a faint warm glow across the terminator (porcelain is a little
     translucent); a sky-and-floor ambient; a quiet rim from behind that draws the silhouette. Baked occlusion; the
     rings shade the finger where their bands sit. The same ivory in both modes: in light mode the stage behind it is
     deepened instead (see the backdrop), so the hand never turns grey. */
  const TONE = {
    dark: { base: '#F6F2EC', warm: '#F2B892', key: 1.02, fill: 0.16, sky: '#78736F', ground: '#4E443F', rim: 0.3, box: 5.2, edge: 0.12 },
    light: { base: '#F6F3EF', warm: '#F2B892', key: 1.06, fill: 0.2, sky: '#848079', ground: '#6A5F59', rim: 0.24, box: 4.8, edge: 0.6 }
  };
  const lin = function (hex, k) { return new THREE.Color(hex).multiplyScalar(k == null ? 1 : k); };
  const porcelain = function (mode) {
    const T = TONE[mode] || TONE.dark;
    const dir = function (x, y, z) { return new V3(x, y, z).normalize(); };
    const U = {
      uRC: { value: [0, 1, 2, 3, 4, 5].map(function () { return new V3(0, 1e4, 0); }) },
      uRT: { value: [0, 1, 2, 3, 4, 5].map(function () { return new V3(0, 1, 0); }) },
      uRW: { value: [0, 1, 2, 3, 4, 5].map(function () { return new V3(1, 0, 8.25); }) },
      uBase: { value: lin(T.base) },
      uWarm: { value: lin(T.warm) },
      uKeyDir: { value: dir(-150, 130, 110) },
      uKeyCol: { value: lin('#FFF4EA', T.key) },
      uFillDir: { value: dir(150, 10, 90) },
      uFillCol: { value: lin('#EEF0F6', T.fill) },
      uRimDir: { value: dir(110, 60, -150) },
      uRimCol: { value: lin('#FFF6EE', T.rim) },
      uSky: { value: lin(T.sky) },
      uGround: { value: lin(T.ground) },
      // the softbox: its direction, its soft angular edge (cos of the outer and inner radius) and its brightness
      uBoxDir: { value: dir(-120, 120, 150) },
      uBox: { value: new THREE.Vector3(Math.cos(0.78), Math.cos(0.22), T.box) },
      // the joints (centre, along the finger, toward its back; radius): the four middle joints (0-3), two soft creases
      // over each, and the four last joints (4-7), one
      uJc: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(function () { return new V3(0, 1e4, 0); }) },
      uJt: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(function () { return new V3(0, 1, 0); }) },
      uJw: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(function () { return new V3(0, 0, 1); }) },
      uJr: { value: [8, 8, 8, 8, 7, 7, 7, 7] },
      // the four nail plates: centre on the finger's axis, along it, toward its back; (radius, half length, half width
      // as a fraction of the radius, unused)
      uNc: { value: [0, 1, 2, 3].map(function () { return new V3(0, 1e4, 0); }) },
      uNt: { value: [0, 1, 2, 3].map(function () { return new V3(0, 1, 0); }) },
      uNw: { value: [0, 1, 2, 3].map(function () { return new V3(0, 0, 1); }) },
      uNs: { value: [0, 1, 2, 3].map(function () { return new THREE.Vector4(5, 5, 0.66, 0); }) },
      // light mode: how much the turning edges are lifted toward the glaze's own tone (no dark outline on the cream page)
      uEdge: { value: T.edge || 0 }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: U,
      vertexShader: [
        'attribute float ao;',
        'varying vec3 vN; varying vec3 vW; varying float vAo; varying vec3 vHand;',
        'void main() {',
        '  vAo = ao; vHand = position;',
        '  vec4 w = modelMatrix * vec4(position, 1.0);',
        '  vW = w.xyz;',
        '  vN = normalize(mat3(modelMatrix) * normal);',
        '  gl_Position = projectionMatrix * viewMatrix * w;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vN; varying vec3 vW; varying float vAo; varying vec3 vHand;',
        'uniform vec3 uRC[6]; uniform vec3 uRT[6]; uniform vec3 uRW[6];',
        'uniform vec3 uBase; uniform vec3 uWarm; uniform vec3 uKeyDir; uniform vec3 uKeyCol; uniform vec3 uFillDir; uniform vec3 uFillCol;',
        'uniform vec3 uRimDir; uniform vec3 uRimCol; uniform vec3 uSky; uniform vec3 uGround; uniform vec3 uBoxDir; uniform vec3 uBox;',
        'uniform vec3 uJc[8]; uniform vec3 uJt[8]; uniform vec3 uJw[8]; uniform float uJr[8];',
        'uniform vec3 uNc[4]; uniform vec3 uNt[4]; uniform vec3 uNw[4]; uniform vec4 uNs[4]; uniform float uEdge;',
        'float wrapL(float x, float w) { return clamp((x + w) / (1.0 + w), 0.0, 1.0); }',
        'float rrect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }',
        // a height field (mm) on the surface turned into a normal, through its screen derivatives
        'vec3 bumpN(vec3 pos, vec3 n, float hh) {',
        '  vec3 sx = dFdx(pos), sy = dFdy(pos);',
        '  vec3 r1 = cross(sy, n), r2 = cross(n, sx);',
        '  float det = dot(sx, r1);',
        '  vec3 g = sign(det) * (dFdx(hh) * r1 + dFdy(hh) * r2);',
        '  return normalize(abs(det) * n - g);',
        '}',
        'void main() {',
        '  vec3 N = normalize(vN);',
        '  vec3 V = normalize(cameraPosition - vW);',
        // the sculpted detail, as relief: the nail plates (a breath proud of the skin, set in a soft fold at the cuticle
        // and the sides) and the creases over the joints (shallow grooves on the back of the finger, fading to the sides)
        '  float relief = 0.0, nail = 0.0, crease = 0.0;',
        '  for (int i = 0; i < 4; i++) {',
        '    vec3 d = vHand - uNc[i];',
        '    float a = dot(d, uNt[i]);',
        '    vec3 p = d - a * uNt[i];',
        '    float rl = length(p);',
        '    vec3 sideV = cross(uNt[i], uNw[i]);',
        '    float b = atan(dot(p, sideV), dot(p, uNw[i])) * uNs[i].x;',
        '    float near = (1.0 - smoothstep(uNs[i].x + 0.8, uNs[i].x + 2.2, rl)) * smoothstep(uNs[i].x - 3.0, uNs[i].x - 1.2, rl);',
        // (the cuticle a soft arc, deepest at the middle of the finger)
        '    float sd = rrect(vec2(a - 0.11 * b * b, b), vec2(uNs[i].y, uNs[i].x * uNs[i].z), 2.4);',
        // (the fold is deepest at the cuticle and along the sides, gone at the free edge)
        '    float foldW = 1.0 - smoothstep(uNs[i].y * 0.35, uNs[i].y * 0.95, a);',
        '    float plate = smoothstep(0.3, -0.35, sd);',
        '    relief += near * (0.09 * plate - 0.1 * exp(-pow((sd - 0.12) / 0.24, 2.0)) * foldW);',
        '    nail = max(nail, near * plate);',
        '  }',
        '  for (int i = 0; i < 8; i++) {',
        '    vec3 d = vHand - uJc[i];',
        '    float a = dot(d, uJt[i]);',
        '    vec3 p = d - a * uJt[i];',
        '    float rl = length(p);',
        '    float cw = dot(p, uJw[i]) / max(rl, 1e-3);',
        // (short, only over the middle of the joint, thinning out toward their ends; each bows toward the fingertip at
        // its middle, as skin creases do)
        '    float back = smoothstep(0.7, 0.97, cw);',
        '    float on = 1.0 - smoothstep(uJr[i] + 0.4, uJr[i] + 1.4, rl);',
        '    float bow = 2.2 * (cw - 0.9);',
        '    float g = i < 4 ? exp(-pow((a + 1.1 - bow) / 0.32, 2.0)) + 0.7 * exp(-pow((a - 0.95 - bow) / 0.28, 2.0)) : 0.75 * exp(-pow((a - bow * 0.7) / 0.28, 2.0));',
        '    crease += g * back * on;',
        '    relief -= 0.032 * g * back * on;',
        '  }',
        '  float faceOn = clamp(dot(N, V), 0.0, 1.0);',
        '  N = bumpN(vW, N, relief * smoothstep(0.08, 0.35, faceOn));',
        // smooth shading can turn a normal away from the eye right at the silhouette (a dark speck, a dark outline):
        // never further than a glance
        '  float nv0 = dot(N, V);',
        '  if (nv0 < 0.05) N = normalize(N + V * (0.05 - nv0));',
        '  float ndv = clamp(dot(N, V), 0.0, 1.0);',
        // the rings' contact shading
        '  float occ = 1.0; float bounce = 0.0;',
        '  for (int i = 0; i < 6; i++) {',
        '    vec3 d = vHand - uRC[i];',
        '    float a = dot(d, uRT[i]);',
        '    float r = length(d - a * uRT[i]);',
        '    float edge = abs(a) - uRW[i].x;',
        '    float near = 1.0 - smoothstep(-0.2, 2.6, edge);',
        '    float onSkin = 1.0 - smoothstep(uRW[i].z + 0.4, uRW[i].z + 3.0, r);',
        '    float k = near * onSkin * uRW[i].y;',
        '    occ *= 1.0 - 0.55 * k;',
        '    bounce = max(bounce, (1.0 - smoothstep(0.0, 1.6, edge)) * onSkin * uRW[i].y);',
        '  }',
        '  float ao = vAo;',
        '  ao *= 1.0 - 0.06 * min(crease, 1.0);',
        '  float nk = dot(N, uKeyDir);',
        // diffuse: the key wrapped softly round the form, the fill, the room's sky and floor
        '  vec3 diff = uKeyCol * wrapL(nk, 0.3) * mix(1.0, ao, 0.5) * mix(1.0, occ, 0.85);',
        '  diff += uFillCol * wrapL(dot(N, uFillDir), 0.6) * ao * occ;',
        '  diff += mix(uGround, uSky, N.y * 0.5 + 0.5) * ao * occ;',
        '  vec3 col = uBase * diff;',
        // the faint translucency: warmth where the light crosses over to shadow
        '  float term = smoothstep(-0.6, 0.0, nk) * (1.0 - smoothstep(0.0, 0.6, nk));',
        '  col += uBase * uWarm * uKeyCol * term * 0.1 * ao;',
        // the glaze: the softbox, once, broad and soft (a dielectric's Fresnel: faint face on, brighter at a glance)
        '  vec3 R = reflect(-V, N);',
        '  float sb = smoothstep(uBox.x, uBox.y, dot(R, uBoxDir));',
        '  float F = 0.05 + 0.95 * pow(1.0 - ndv, 5.0);',
        // (the nail plate a little glossier than the glaze round it)
        '  col += vec3(1.0, 0.985, 0.965) * uBox.z * sb * F * mix(0.35, 1.0, ao) * occ * (1.0 - 0.35 * min(crease, 1.0)) * (1.0 + 0.6 * nail);',
        // the rim from behind, and the gold reflected a little next to a band
        '  col += uRimCol * pow(1.0 - ndv, 2.4) * wrapL(dot(N, uRimDir), 0.25) * ao;',
        '  col += uWarm * bounce * 0.045;',
        // light mode: the form turns away into a soft light tone, never a dark line against the cream page
        '  col = mix(col, max(col, uBase * vec3(0.8, 0.775, 0.75)), uEdge * pow(1.0 - ndv, 2.2));',
        '  gl_FragColor = vec4(col, 1.0);',
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        '}'
      ].join('\n')
    });
    mat.userData.U = U;
    mat.userData.tone = function (m) {
      const t = TONE[m] || TONE.dark;
      U.uBase.value.copy(lin(t.base)); U.uWarm.value.copy(lin(t.warm));
      U.uKeyCol.value.copy(lin('#FFF4EA', t.key)); U.uFillCol.value.copy(lin('#EEF0F6', t.fill));
      U.uSky.value.copy(lin(t.sky)); U.uGround.value.copy(lin(t.ground)); U.uRimCol.value.copy(lin('#FFF6EE', t.rim));
      U.uBox.value.z = t.box; U.uEdge.value = t.edge || 0;
    };
    return mat;
  };

  /* the stage's backdrop: a soft pool of light behind the hand, fading to nothing at the edges (in dark mode a faint
     warm lift of the burgundy; in light mode a deeper warm taupe, so the ivory hand stands clear of the cream page) */
  const BACK = { dark: { c: '#6A2420', a: 0.34, r: 1.12 }, light: { c: '#C7B2A6', a: 0.66, r: 1.7 } };
  const backdrop = function (mode) {
    const T = BACK[mode] || BACK.dark;
    const U = { uC: { value: new THREE.Color(T.c) }, uA: { value: T.a }, uR: { value: T.r }, uAspect: { value: 1 } };
    const mat = new THREE.ShaderMaterial({
      // (drawn with the transparent things, after the hand: at the far plane, depth tested, so only where nothing is)
      uniforms: U, transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
      vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
      fragmentShader: [
        'varying vec2 vP; uniform vec3 uC; uniform float uA; uniform float uR; uniform float uAspect;',
        'void main() {',
        '  vec2 q = vec2(vP.x * uAspect, vP.y - 0.12);',
        '  float r = length(q * vec2(1.0, 0.82));',
        '  float a = uA * (1.0 - smoothstep(0.05, uR, r));',
        '  gl_FragColor = vec4(uC, a);',
        '  #include <colorspace_fragment>',
        '}'
      ].join('\n')
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    m.frustumCulled = false; m.renderOrder = -10;
    m.userData.U = U;
    m.userData.tone = function (md) { const t = BACK[md] || BACK.dark; U.uC.value.set(t.c); U.uA.value = t.a; U.uR.value = t.r; };
    return m;
  };

  function stack(container, o) {
    o = o || {};
    const T0 = performance.now();
    let st = null, dead = false, paused = false;
    let resolveReady = null;
    const ready = new Promise(function (r) { resolveReady = r; });
    let wanted = null, busy = false, first = null, revealed = false;
    const timing = [];
    const mark = function (k) { timing.push([k, Math.round(performance.now() - T0)]); };
    const HOME_YAW = -0.14, TILT = 0.08, SWAY = 0.2;
    const S = { yaw: HOME_YAW, vel: 0, swayT: 0, swayW: AU.reduced ? 0 : 1, idle: 10, drag: null };
    const rings = [];          // { n, key, shape, built, g, mats, prof, s, alpha, tw, leaving }
    let hand = null, handMesh = null, pmat = null, glints = null, back = null;
    let scene = null, cam = null, root = null, pose = null, handG = null;
    let env = null, envX = null, envs = {}, gem = null;
    const mixHold = {};
    const api = {
      canvas: null,
      ready: ready,
      setSpecs: function (specs) {
        wanted = (Array.isArray(specs) ? specs : []).filter(Boolean).slice(0, MAX).map(norm);
        pump();
      },
      pause: function () { paused = true; if (st) { st.paused = true; st.sleep(); } },
      resume: function () { paused = false; if (st) { st.paused = false; st.invalidate(); } },
      dispose: function () {
        if (dead) return;
        dead = true;
        if (st) st.dispose();
        else {
          rings.forEach(function (r) { r.built.dispose(); });
          // (a context made ahead for a stage that never came)
          if (made) { try { const x = made.context.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { /* ignore */ } made = null; }
        }
        if (resolveReady) { resolveReady(); resolveReady = null; }
      },
      // (for the box: the ring on top of the stack is the one that goes into the bag last; and whether this stage is
      // still on its way to its first picture, so heavier idle work can wait for it)
      topSpec: function () {
        const l = rings.filter(function (r) { return !r.leaving; });
        if (l.length) return l[l.length - 1].n;
        return first && first.length ? first[first.length - 1].n : null;
      },
      pending: function () { return !dead && !revealed; },
      _stage: null,
      _debug: function () { return { scene: scene, cam: cam, pmat: pmat, renderer: st && st.renderer, S: S, hand: hand, pose: pose }; },
      _state: function () {
        return { t0: Math.round(T0), timing: timing.slice(-16), revealed: revealed, rings: rings.map(function (r) { return { key: r.key, s: +r.s.toFixed(2), a: +r.alpha.toFixed(2), leaving: r.leaving }; }),
          seat: hand && hand.path.seat, tip: hand && hand.path.tip, probe: hand && hand.path.probe, stats: hand && hand.geometry.userData.meshStats, workers: AUSB.workers() };
      }
    };
    wanted = (Array.isArray(o.specs) ? o.specs : []).filter(Boolean).slice(0, MAX).map(norm);

    /* the hand starts meshing at once, off the main thread (its data in a slice of its own). The stage is on screen and
       waiting, so its steps take the next idle moment (AUSB.soon: never inside a scroll), not a place in the engine's
       background queue behind its prewarming */
    const handP = AUSB.soon(function () { return dead ? null : AUSB.hand(); }, 100);

    /* everything else in idle slices: the WebGL context, the stage (its renderer round that context), then the room,
       the rings and the hand */
    let made = null;
    AUSB.soon(function () {
      if (dead) return;
      const c = document.createElement('canvas'), ctx = AUSB.context(c, {});
      made = ctx ? { canvas: c, context: ctx } : null;
    }, 120).then(function () {
      return AUSB.soon(function () {
        if (dead) return;
        init();
        mark('stage');
      }, 120);
    }).catch(function (e) { console.error('[Aurelia GL] stack failed', e); if (resolveReady) { resolveReady(); resolveReady = null; } });

    const init = function () {
      st = new AUSB.Stage(container, { kind: 'stack', label: o.label, fov: 22, near: 5, far: 3000, canvas: made && made.canvas, context: made && made.context });
      api._stage = st;
      if (paused) st.paused = true;
      const cv = api.canvas = st.canvas;
      // (no fades at the edges: the frame crops the hand cleanly, as a photograph would; the fingertips are framed inside)
      cv.style.cursor = 'grab';
      cv.style.touchAction = 'pan-y';
      scene = st.scene; cam = st.camera;
      root = new THREE.Group(); pose = new THREE.Group(); handG = new THREE.Group();
      scene.add(root); root.add(pose); pose.add(handG);
      pose.rotation.x = -TILT;

      /* light: a warm key softbox high on the left, a cool fill, a soft rim from behind that draws the silhouette and
         runs along the glaze; the lightbox for the metals. No shadow maps (their programs cannot be compiled ahead);
         the occlusion baked into the hand and the shading under each band carry the contact. */
      const key = new THREE.DirectionalLight(0xfff1e4, 2.5); key.position.set(-150, 130, 90);
      const fill = new THREE.DirectionalLight(0xeef0f6, 0.32); fill.position.set(140, 20, 90);
      const rim = new THREE.DirectionalLight(0xfff6ee, 2.3); rim.position.set(110, 70, -150);
      scene.add(key, fill, rim, key.target);
      st.lights = { key: key, fill: fill, rim: rim };

      back = backdrop(st.mode);
      scene.add(back);
      st.onMode = function (m) {
        setEnv(m);
        if (pmat) st.snapshot(0.7);
        if (pmat) pmat.userData.tone(m);
        back.userData.tone(m);
      };
      st.onRestore = function () {
        env = null; envs = {}; envX = null; setEnv(st.mode);
        gem = null; AUSB.gemRoom(st.renderer).then(function (t) { if (!st.disposed) { gem = t; st.invalidate(); } });
      };
      st.onResize = function () { fitCamera(); };
      st.update = update;
      st.draw = function () {
        if (!revealed && !st.peek) return;
        AUSB.gemEnv(env, st.mode === 'light' ? 1 : 0);
        // (the stones see the studio's own gem room: a diamond on the finger is as white as in its still)
        AUSB.gemDraw(gem, function () { st.renderer.render(scene, cam); });
      };
      st.cleanup = function () {
        rings.forEach(function (r) { r.built.dispose(); });
        rings.length = 0;
        if (first) first.forEach(function (n) { n.built.dispose(); });
        first = null;
        if (handMesh) handG.remove(handMesh);
        if (pmat) pmat.dispose();
        if (back) { back.geometry.dispose(); back.material.dispose(); }
        if (glints) { try { glints.dispose(); } catch (e) { /* ignore */ } }
      };
      bindInput(cv);
      if (AUSB.has('glints')) { try { glints = new GlGlints(scene, 3); } catch (e) { glints = null; } }

      const envP = loadEnv(st.mode).then(function (t) { if (!env) { env = t; useEnv(); } mark('env'); });
      const gemP = AUSB.gemRoom(st.renderer).then(function (t) { gem = t; mark('gem'); });
      // the rings build while the hand is meshed
      pump();
      Promise.all([handP, envP, gemP]).then(function (r) {
        if (st.disposed || !r[0]) return;
        hand = r[0];
        mark('hand');
        pmat = porcelain(st.mode);
        ['index', 'middle', 'ring', 'pinky'].forEach(function (n, i) {
          const J = hand.joints[n], U = pmat.uniforms;
          if (!J) return;
          [J.crease, J.crease2].forEach(function (c, k) {
            if (!c) return;
            const s = i + 4 * k;
            U.uJc.value[s].copy(c.c); U.uJt.value[s].copy(c.t); U.uJw.value[s].copy(c.w); U.uJr.value[s] = c.r;
          });
          const nl = J.nail;
          if (nl) { U.uNc.value[i].copy(nl.c); U.uNt.value[i].copy(nl.t); U.uNw.value[i].copy(nl.w); U.uNs.value[i].set(nl.r, nl.half, nl.wide, 0); }
        });
        useEnv();
        handMesh = new THREE.Mesh(hand.geometry, pmat);
        handG.add(handMesh);
        // the hand turns about its ring finger, where the rings sit, so the stack stays in the middle of the picture
        const pivot = hand.path.at(hand.path.seat + 6).p;
        handG.position.copy(pivot).negate();
        st.resize();
        fitCamera();
        return AUSB.compile(st.renderer, scene, cam, scene);
      }).then(function () {
        // the hand's buffers go to the GPU in an idle slice of their own (not with the first visible frame)
        if (st.disposed || !handMesh) return;
        mark('compiled');
        return AUSB.upload(st.renderer, scene, cam, [handMesh]);
      }).then(function () {
        if (st.disposed || !handMesh) return;
        mark('uploaded');
        handReady = true;
        tryReveal();
        // the other room, ready for a mode switch
        AUSB.later(function () { if (!st.disposed) loadEnv(st.mode === 'light' ? 'dark' : 'light'); }, 2500);
      }).catch(function (e) {
        console.error('[Aurelia GL] stack failed', e);
        if (resolveReady) { resolveReady(); resolveReady = null; }
      });
    };
    let handReady = false, revealT = 0, revealing = false, timedOut = false;

    /* the lightbox for both modes, made in idle slices; a mode switch crossfades them over 0.7 s */
    const loadEnv = function (m) {
      if (!envs[m]) {
        const e = envs[m] = { tex: null };
        e.p = AUSB.envAsync(st.renderer, m).then(function (t) { e.tex = t; return t; });
      }
      return envs[m].p;
    };
    /* the metals take the room from scene.environment; the porcelain gets it as its own envMap, so its
       envMapIntensity counts (three uses scene.environmentIntensity otherwise) */
    const useEnv = function () {
      scene.environment = env;
    };
    const setEnv = function (m) {
      loadEnv(m).then(function (t) {
        if (st.disposed || st.mode !== m) return;
        const from = env;
        if (!from || AU.reduced || from === t) { envX = null; env = t; useEnv(); st.invalidate(); return; }
        envX = { a: from, b: t, t: 0 };
        st.invalidate();
      });
    };

    /* camera: framed on the rings, steady whatever they are. The stack (a band is about 20.5 mm across) takes about 30%
       of the picture's width; the ring and middle fingers' tips stay inside it with a margin, the rings a little below
       the middle; the hand cropped by the frame below and at the sides, as in a jeweller's photograph. Where the
       picture is too short for the fingers at that size, the hand leans back a little more (the fingers foreshorten),
       never the rings smaller. */
    // (el: the camera's height, all but level; tilt: the hand's lean back, as on a jeweller's stand: the further it
    // leans, the shorter the fingers look, both foreshortened and further from the eye)
    const FIT = { share: 0.3, el: 0.06, tipY: 0.88, zoneY: -0.54, zoneX: -0.05, tilt: [0.1, 0.72] };
    const fitCamera = function () {
      if (back) back.userData.U.uAspect.value = cam ? cam.aspect : 1;
      if (!hand || !cam) return;
      const asp = cam.aspect, tv = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), th = tv * asp;
      const dir = new V3(0, Math.sin(FIT.el), Math.cos(FIT.el)), up = new V3(0, Math.cos(FIT.el), -Math.sin(FIT.el)), right = new V3(1, 0, 0);
      // (on a narrow portrait stage the rings may take a little more of the width)
      const share = asp < 0.8 ? 0.34 : FIT.share;
      let D = 20.5 / (2 * th * share);
      // the points that must be in the picture, in the hand's own space: the middle of the stack, the two fingertips
      const P = hand.path, pivot = handG.position.clone().negate();
      const zone = P.at(P.seat + 5).p;
      const tips = ['ring', 'middle'].map(function (n) {
        const J = hand.joints[n], F = hand.fingers[n];
        return J.P[4].clone().addScaledVector(J.D[2], F.r[4] * 1.02).addScaledVector(dorsalOf(J.D[2]), F.r[4] * 0.5);
      });
      const rot = new THREE.Matrix4(), ry = new THREE.Matrix4().makeRotationY(HOME_YAW);
      const world = function (p, tilt) { return p.clone().sub(pivot).applyMatrix4(rot.makeRotationX(-tilt).multiply(ry)); };
      const ndc = function (q, T) { const v = q.clone().sub(T), z = D - v.dot(dir); return [v.dot(right) / (z * th), v.dot(up) / (z * tv)]; };
      let tilt = FIT.tilt[1], T = new V3(), found = false;
      const span = function (a) {
        const z = world(zone, a);
        return Math.max.apply(null, tips.map(function (p) { return ndc(world(p, a), z)[1]; })) - ndc(z, z)[1];
      };
      for (let a = FIT.tilt[0]; a <= FIT.tilt[1] + 1e-6; a += 0.02) {
        if (span(a) <= FIT.tipY - FIT.zoneY) { tilt = a; found = true; break; }
      }
      // (a very wide, low picture: the rings a little smaller rather than a fingertip cut off)
      if (!found) D *= span(tilt) / (FIT.tipY - FIT.zoneY);
      // the target: the stack where it belongs across, the fingertips just under the top (a few passes: the
      // perspective moves a little with the target)
      const zw = world(zone, tilt), tw = tips.map(function (p) { return world(p, tilt); });
      T.copy(zw);
      for (let it = 0; it < 4; it++) {
        const zn = ndc(zw, T), tn = Math.max.apply(null, tw.map(function (p) { return ndc(p, T)[1]; }));
        // (if there is room to spare, it goes half above the tips and half below the stack)
        const spare = Math.max(0, (FIT.tipY - FIT.zoneY) - (tn - zn[1]));
        const wantTip = FIT.tipY - spare * 0.5;
        const z = D - zw.clone().sub(T).dot(dir);
        T.addScaledVector(up, (tn - wantTip) * z * tv);
        T.addScaledVector(right, (zn[0] - FIT.zoneX) * z * th);
      }
      S.tilt = tilt;
      pose.rotation.x = -tilt;
      cam.position.copy(T).addScaledVector(dir, D);
      cam.near = Math.max(5, D - 140); cam.far = D + 240;
      cam.lookAt(T);
      cam.updateProjectionMatrix();
    };
    const dorsalOf = function (d) { return new V3(0, 0, 1).addScaledVector(d, -d.z).normalize(); };

    /* rings: where each sits, and the slide along the finger */
    const ringMatrix = function (s, out) {
      const P = hand.path.at(s);
      const x = new V3().crossVectors(P.up, P.t);
      return out.makeBasis(x, P.up, P.t).setPosition(P.p);
    };
    const targets = function (list) {
      const out = [];
      let s = hand.path.seat;
      list.forEach(function (r, i) {
        if (i === 0) s = hand.path.seat - r.prof.lo;
        else s += spacing(list[i - 1].prof, r.prof);
        out.push(s);
      });
      return out;
    };
    const tween = function (r, to, dur, delay, ease, fadeTo, fadeSpan) {
      r.tw = { from: r.s, to: to, t: -(delay || 0), dur: AU.reduced ? 0.001 : dur, ease: ease || AUSB.easeInOut, a0: r.alpha, a1: fadeTo, span: fadeSpan || [0, 1] };
    };
    const live = function () { return rings.filter(function (r) { return !r.leaving; }); };
    const refreshGlints = function () {
      if (!glints) return;
      let c = [];
      live().forEach(function (r) { c = c.concat(r.built.glints || []); });
      try { glints.set(c); } catch (e) { /* ignore */ }
    };
    const mount = function (n) {
      const g = new THREE.Group();
      g.add(n.built.object);
      handG.add(g);
      return { n: n.n, key: n.key, shape: n.shape, built: n.built, g: g, mats: n.mats, prof: n.prof, s: 0, alpha: 0, tw: null, leaving: false };
    };

    /* the first picture: the hand and its rings arrive together (the canvas fades in over 0.9 s), nothing before */
    const tryReveal = function () {
      if (revealing || !handReady || st.disposed) return;
      const waiting = !first && (busy || (wanted && wanted.length));
      if (waiting && !timedOut) {
        // the rings are still on their way: wait for them (a little while at most)
        if (!revealT) revealT = setTimeout(function () { timedOut = true; tryReveal(); }, 4000);
        return;
      }
      revealing = true;
      clearTimeout(revealT);
      const list = first || [];
      first = null;
      const T = targets(list);
      list.forEach(function (n, i) {
        const r = mount(n);
        r.s = T[i]; r.alpha = 1;
        AUSB.setAlpha(r.mats, 1); r.shownA = 1;
        rings.push(r);
      });
      refreshGlints();
      const meshes = [];
      list.forEach(function (n) { meshes.push.apply(meshes, AUSB.meshesOf(n.built.object)); });
      update(0, 0);
      // every program as it will be drawn (the rings may have been compiled before the room arrived, and a room
      // changes their programs), then the rings' buffers, a mesh per frame, and one whole frame unseen: then the canvas
      // fades in
      AUSB.compile(st.renderer, scene, cam, scene).then(function () {
        if (st.disposed) return;
        return AUSB.upload(st.renderer, scene, cam, meshes, true);
      }).then(function () {
        if (st.disposed) return;
        return new Promise(function (res) {
          requestAnimationFrame(function () {
            st.peek = true;
            try { st.draw(); } catch (e) { /* drawn again */ }
            st.peek = false;
            res();
          });
        });
      }).then(function () {
        if (st.disposed) return;
        revealed = true;
        mark('shown');
        st.invalidate();
        requestAnimationFrame(function () {
          if (st.disposed) return;
          st.show();
          if (resolveReady) { resolveReady(); resolveReady = null; }
        });
        pump();
      });
    };

    /* apply a new list of specs: keep the matching rings at the bottom, crossfade shape-alike changes in place, slide
       the rest off over the fingertip (as one formation, top first) and the new ones on (as one formation) */
    const apply = function (list) {
      const cur = live();
      let p = 0;
      while (p < cur.length && p < list.length && cur[p].key === list[p].key) p++;
      const sameShape = cur.length === list.length && list.every(function (n, i) { return cur[i].shape === n.shape; });
      if (sameShape && p < cur.length) {
        st.snapshot(0.7);
        for (let i = p; i < cur.length; i++) {
          const r = cur[i], nb = list[i];
          r.g.remove(r.built.object); r.built.dispose();
          r.built = nb.built; r.key = nb.key; r.n = nb.n; r.mats = nb.mats;
          r.g.add(nb.built.object);
          AUSB.setAlpha(r.mats, r.alpha);
        }
        list.forEach(function (n, i) { if (i < p && n.built !== cur[i].built) n.built.dispose(); });
        refreshGlints();
        st.invalidate();
        return;
      }
      // discard builds we will not use (the bottom rings that stay as they are)
      for (let i = 0; i < p; i++) if (list[i].built !== cur[i].built) list[i].built.dispose();
      const leaving = cur.slice(p);
      const tip = hand.path.tip;
      leaving.forEach(function (r) {
        r.leaving = true;
        tween(r, r.s + (tip - leaving[0].s) + 22, 1.15, 0, function (k) { return k * k * (3 - 2 * k); }, 0, [0.5, 0.95]);
      });
      const keep = cur.slice(0, p);
      const incoming = list.slice(p).map(mount);
      const all = keep.concat(incoming), T = targets(all);
      const lowest = incoming.length ? T[p] : 0;
      incoming.forEach(function (r, i) {
        const t = T[p + i];
        r.s = tip + 26 + (t - lowest);
        tween(r, t, 1.4, leaving.length ? 0.5 : 0.05, AUSB.easeOut5, 1, [0, 0.3]);
        rings.push(r);
      });
      refreshGlints();
      st.invalidate();
    };

    /* build what was asked for, one ring per idle slice; only the latest request counts */
    const pump = function () {
      if (busy || !wanted || !st || st.disposed) return;
      if (!revealing && first) return;              // the first set waits for the hand
      busy = true;
      const req = wanted; wanted = null;
      const list = [];
      let i = 0;
      const drop = function () { list.forEach(function (n) { n.built.dispose(); }); };
      const next = function () {
        if (st.disposed) { drop(); return; }
        if (wanted) { drop(); busy = false; pump(); return; }
        if (i >= req.length) {
          mark('built');
          Promise.all(list.map(function (n) { return AUSB.compile(st.renderer, n.built.object, cam, scene); })).then(function () {
            if (st.disposed) { drop(); return; }
            if (wanted) { drop(); busy = false; pump(); return; }
            busy = false;
            if (!revealing) { first = list; mark('rings'); tryReveal(); return; }
            apply(list);
            pump();
          });
          return;
        }
        // the ring in one idle slice, its spacing profile in the next (each a few ms; together they could run long)
        let item = null;
        AUSB.soon(function () {
          if (st.disposed) return;
          const n = req[i++];
          const t0 = performance.now();
          const built = AUSB.build(n, { detail: 'hero' });
          const mats = AUSB.prepFade(built.object);
          item = { n: n, key: keyOf(n), shape: shapeOf(n), built: built, mats: mats, prof: null };
          timing.push(['build', n.style, Math.round(performance.now() - t0), Math.round(performance.now() - T0)]);
        }, 120).then(function () {
          return AUSB.soon(function () {
            if (st.disposed || !item) return;
            const t0 = performance.now();
            item.prof = profile(item.built);
            timing.push(['profile', item.n.style, Math.round(performance.now() - t0), Math.round(performance.now() - T0)]);
            list.push(item);
          }, 120);
        }).then(next, function (e) { console.error('[Aurelia GL] stack: a ring could not be built', e); busy = false; });
      };
      next();
    };

    /* the frame loop */
    const M = new THREE.Matrix4();
    const update = function (t, dt) {
      const red = !!AU.reduced;
      let moving = false;
      if (envX) {
        envX.t += dt;
        const k = Math.min(1, envX.t / 0.7);
        env = k >= 1 ? envX.b : AUSB.mixEnv(st.renderer, mixHold, envX.a, envX.b, AUSB.easeInOut(k));
        useEnv();
        if (k >= 1) envX = null;
        moving = true;
      }
      // the turn: inertia after a drag, then a slow sway about the home view
      if (!S.drag) {
        S.idle += dt;
        S.yaw += S.vel * dt;
        S.vel *= Math.exp(-dt * 3.2);
        if (Math.abs(S.vel) < 0.002) S.vel = 0; else moving = true;
      }
      const want = !red && !S.drag && S.idle > 2.2 ? 1 : 0;
      S.swayW += (want - S.swayW) * (1 - Math.exp(-dt * (want ? 0.6 : 5)));
      if (S.swayW < 0.001 && !want) S.swayW = 0;
      let sway = 0;
      if (S.swayW > 0) {
        S.swayT += dt;
        let home = HOME_YAW;
        while (home - S.yaw > Math.PI) home -= AUSB.TAU;
        while (home - S.yaw < -Math.PI) home += AUSB.TAU;
        S.yaw += (home - S.yaw) * (1 - Math.exp(-dt * 0.45 * S.swayW));
        sway = S.swayW * SWAY * Math.sin(S.swayT * AUSB.TAU / 17);
        moving = true;
      }
      S.sway = sway;
      if (pose) pose.rotation.y = S.yaw + sway;
      if (!hand) return moving;
      // rings sliding
      const U = pmat ? pmat.userData.U : null;
      let slot = 0;
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        if (r.tw) {
          const w = r.tw;
          w.t += dt;
          const k = AUSB.clamp(w.t / w.dur, 0, 1), e = w.ease(k);
          r.s = w.from + (w.to - w.from) * e;
          const f = AUSB.seg(w.span[0], w.span[1], k);
          r.alpha = w.a0 + (w.a1 - w.a0) * AUSB.easeInOutSine(f);
          if (k >= 1) {
            r.tw = null;
            if (r.leaving) { handG.remove(r.g); r.built.dispose(); rings.splice(i, 1); continue; }
          }
          moving = true;
        }
        ringMatrix(r.s, M);
        r.g.matrixAutoUpdate = false;
        r.g.matrix.copy(M);
        r.g.visible = r.alpha > 0.004;
        if (r.shownA !== r.alpha) { AUSB.setAlpha(r.mats, r.alpha); r.shownA = r.alpha; }
      }
      if (U) {
        rings.forEach(function (r) {
          if (slot >= 6) return;
          const P = hand.path.at(r.s);
          U.uRC.value[slot].copy(P.p); U.uRT.value[slot].copy(P.t);
          // the shadow fades out as soon as the ring leaves the finger
          const onFinger = 1 - AUSB.smooth(hand.path.tip - 14, hand.path.tip - 2, r.s);
          U.uRW.value[slot].set(r.prof.hw, r.alpha * onFinger, 8.25);
          slot++;
        });
        for (; slot < 6; slot++) U.uRW.value[slot].y = 0;
      }
      scene.updateMatrixWorld();
      if (glints && revealed) {
        try {
          glints.unit = 1;
          if (red) { glints.bake(cam); }
          else if (glints.update(cam, dt, live().length > 0)) moving = true;
        } catch (e) { glints = null; }
      }
      return moving;
    };

    /* input: drag to turn (horizontal), with inertia; the page still scrolls vertically on touch */
    const bindInput = function (cv) {
      const down = function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        S.drag = { id: e.pointerId, lx: e.clientX, lt: performance.now(), v: 0 };
        if (S.swayW > 0) { S.yaw += S.sway || 0; S.swayW = 0; S.sway = 0; }
        try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
        cv.style.cursor = 'grabbing';
        st.wake();
      };
      const move = function (e) {
        const d = S.drag;
        if (!d || d.id !== e.pointerId) return;
        const now = performance.now(), dx = e.clientX - d.lx, da = dx / Math.max(260, st.size.w) * 3.4;
        S.yaw += da;
        d.v = d.v * 0.6 + da / (Math.max(1, now - d.lt) / 1000) * 0.4;
        d.lx = e.clientX; d.lt = now;
        S.idle = 0;
        st.wake();
      };
      const up = function (e) {
        const d = S.drag;
        if (!d || d.id !== e.pointerId) return;
        S.vel = performance.now() - d.lt > 120 ? 0 : AUSB.clamp(d.v, -4, 4);
        S.drag = null; S.idle = 0;
        cv.style.cursor = 'grab';
        st.wake();
      };
      cv.addEventListener('pointerdown', down);
      cv.addEventListener('pointermove', move);
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      cv.addEventListener('lostpointercapture', up);
    };

    AUSB._stack = api;          // (inspection only)
    return api;
  }
  AUSB.methods.stack = function (container, o) { return stack(container, o); };

  /* the hand is meshed ahead (off the main thread) as soon as the visitor heads for the stack builder */
  const prefetch = function () { AUSB.later(function () { try { AUSB.hand(); } catch (e) { /* made on demand */ } }, 600); };
  if (AU.on) {
    AU.on('route', function (r) { if (r && (r.name === 'stack' || r.path === '/stack') && window.AUGL) prefetch(); });
    AU.on('gl', function (api) { const c = AU.router && AU.router.current; if (api && c && (c.name === 'stack' || c.path === '/stack')) prefetch(); });
  }
  let hinted = false;
  document.addEventListener('pointerover', function (e) {
    if (hinted || !window.AUGL || !e.target || !e.target.closest) return;
    const a = e.target.closest('a[href*="/stack"]');
    if (a) { hinted = true; prefetch(); }
  }, { passive: true });
}

/* ---- 82-forge-kit.js ---- */
/* ---- The forge's kit (for AUGL.forge, 84-forge.js): heat colour and noise in GLSL, the materials (molten gold that
   runs and cools, the crucible's pool, graphite, refractory clay, steel, the bench), and the parts (crucible, holder,
   mould halves, the cast ring, the pour, sparks). Units: mm. AUSB.forgeKit is filled here. ---- */
{
  const V3 = THREE.Vector3;
  const SD = AUSB.sd;
  const FK = AUSB.forgeKit = {};

  /* GLSL: simplex noise (Ashima Arts, MIT), a little fbm, and the colour of hot metal (t: 0 cold … 1 pouring heat,
     1.2 the white core of the stream). The result is light (HDR), so the bloom picks it up. */
  FK.GLSL = [
    'vec3 fgM3(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 fgM4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec4 fgPerm(vec4 x){return fgM4(((x*34.0)+10.0)*x);}',
    'vec4 fgTay(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
    'float fgNoise(vec3 v){',
    '  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);',
    '  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);',
    '  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);',
    '  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;',
    '  i=fgM3(i);',
    '  vec4 p=fgPerm(fgPerm(fgPerm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));',
    '  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;',
    '  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);',
    '  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);',
    '  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);',
    '  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));',
    '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
    '  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);',
    '  vec4 norm=fgTay(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
    '  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;',
    '  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;',
    '  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
    '}',
    'float fgFbm(vec3 p){return 0.56*fgNoise(p)+0.29*fgNoise(p*2.07+3.1)+0.15*fgNoise(p*4.3+7.7);}',
    // a bump from a height field h given per pixel (its screen derivatives), as three's bump mapping does it
    'vec3 fgBump(vec3 surf_pos, vec3 surf_norm, float h, float faceDir){',
    '  vec3 sx = dFdx(surf_pos), sy = dFdy(surf_pos);',
    '  vec3 r1 = cross(sy, surf_norm), r2 = cross(surf_norm, sx);',
    '  float det = dot(sx, r1) * faceDir;',
    '  vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);',
    '  return normalize(abs(det) * surf_norm - g);',
    '}',
    // (a yellow-orange at pouring heat, (1.0, 0.66, 0.22), whitening only in the very core; dull red as it cools. The
    // callers keep it within a range the tone mapping does not bleach to salmon: the hue survives, the bloom adds heat)
    'vec3 fgHeat(float t){',
    '  t=max(t,0.0);',
    '  vec3 c=mix(vec3(0.0),vec3(0.4,0.022,0.0),smoothstep(0.04,0.22,t));',
    '  c=mix(c,vec3(1.0,0.2,0.018),smoothstep(0.18,0.45,t));',
    '  c=mix(c,vec3(1.0,0.46,0.08),smoothstep(0.4,0.7,t));',
    '  c=mix(c,vec3(1.0,0.66,0.22),smoothstep(0.66,0.95,t));',
    '  c=mix(c,vec3(1.0,0.86,0.58),smoothstep(0.98,1.3,t));',
    '  return c*(pow(t,2.2)*9.0);',
    '}'
  ].join('\n');

  const inject = function (m, key, fn) {
    m.onBeforeCompile = function (sh) { fn(sh); };
    m.customProgramCacheKey = function () { return key; };
    return m;
  };
  const u = function (v) { return { value: v }; };

  /* molten gold: polished metal under an emission that follows its temperature (uT), with hot streaks flowing; as it
     cools a darker skin forms in patches before the gold shows through, then the casting is polished (uRough).
     o.fill: 'ring' (a band lying in the XZ plane round the origin, its centre line at radius uA.x and height uA.z, filled
     from its feed point at -X both ways round, as far as uFill * PI) or 'x' (a bar along +X from uA.x to uA.y, its axis at
     height uA.z) or none. The running front is a rounded tongue: the profile shrinks onto the centre line toward it.
     uSweep: (position along x in object space, width, strength): a band of light crossing the metal. */
  FK.molten = function (U, o) {
    o = o || {};
    const mode = o.fill || 'none';
    // the catalogue's 18k yellow gold (its reflectance given in linear light, as the engine's metal material takes it)
    const Y = (KIT.METALS && KIT.METALS.yellow) || {};
    const gold = Y.f0 ? new THREE.Color().setRGB(Y.f0[0], Y.f0[1], Y.f0[2], THREE.LinearSRGBColorSpace) : new THREE.Color(Y.color || '#EECB8F');
    const m = new THREE.MeshPhysicalMaterial({ color: gold, metalness: 1, roughness: 0.3, envMapIntensity: Y.env || 1, transparent: !!o.fade });
    const L = {
      uT: o.uT || U.uT, uTime: U.uTime, uRough: o.uRough || U.uRough || u(0.3), uFill: o.uFill || u(1),
      uScale: u(o.scale || 0.32), uA: u(new THREE.Vector4(o.a0 || 0, o.a1 || 0, o.yc || 0, 0)),
      uSkinK: o.uSkinK || u(1), uSweep: o.uSweep || u(new THREE.Vector3(-1e3, 1, 0)), uDim: o.uDim || u(1),
      // (mm per unit of the mesh: the cup's disc is a unit disc scaled up; and its meniscus, mm high at the middle)
      uUnit: u(o.unit || 1), uDome: u(o.dome || 0), uBumpK: u(o.bump == null ? 1 : o.bump)
    };
    m.userData.U = L;
    const front = mode === 'ring' ? [
      '{ vec2 c2 = normalize(position.xz + vec2(1e-5, 0.0)) * uA.x; vec3 cl = vec3(c2.x, uA.z, c2.y);',
      '  float a = abs(atan(position.z, -position.x)); float fr = uFill * 3.75;',
      '  float k = sqrt(clamp((fr - a) / 0.5, 0.0, 1.0)); transformed = cl + (transformed - cl) * k; vFront = a - fr; vS = a * uA.x; }'
    ] : mode === 'x' ? [
      '{ vec3 cl = vec3(position.x, uA.z, 0.0); float fr = uA.x + (uA.y - uA.x) * uFill * 1.1;',
      '  float k = sqrt(clamp((fr - position.x) / 1.6, 0.0, 1.0)); transformed = cl + (transformed - cl) * k; vFront = position.x - fr; vS = position.x - uA.x; }'
    ] : ['vFront = -1.0; vS = 0.0;'];
    return inject(m, 'ausb-molten-4-' + mode, function (sh) {
      Object.assign(sh.uniforms, L);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nvarying float vFront;\nvarying float vS;\nuniform vec4 uA;\nuniform float uFill;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;\n' + front.join('\n'));
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nvarying float vFront;\nvarying float vS;\nuniform float uT;\nuniform float uTime;\nuniform float uRough;\nuniform float uScale;\nuniform float uSkinK;\nuniform vec3 uSweep;\nuniform float uDim;\nuniform float uUnit;\nuniform float uDome;\nuniform float uBumpK;\n' + FK.GLSL)
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vFront > 0.0) discard;')
        .replace('#include <roughnessmap_fragment>', [
          '#include <roughnessmap_fragment>',
          'vec3 fq = vObj * uScale;',
          // the hot metal is a liquid mirror: only a slow, broad, low swell moves on it along the flow (no churning
          // grain: a little noise in the temperature reads as a crust at once)
          'float fn = fgNoise(fq * 0.55 + vec3(-vS * 0.08 + uTime * 0.18, -uTime * 0.06, uTime * 0.04));',
          'float fs = fgNoise(fq * 1.3 + vec3(-vS * 0.22 + uTime * 0.42, -uTime * 0.12, 0.0));',
          // the casting: as it cools through dull red a darker, duller skin forms (evenly, only a faint unevenness); once
          // it is cold that skin is no more than a faint satin bloom on the catalogue's own 18k yellow gold; the polish
          // takes it away again
          'float form = smoothstep(0.78, 0.3, uT + 0.05 * fn) * uSkinK;',
          'float skin = form * mix(0.28, 1.0, smoothstep(0.03, 0.32, uT));',
          // hot: a liquid mirror; as cast and cold: satin gold (roughness about 0.3, so the room's softboxes still show in
          // it as soft highlights); polished: the catalogue's finish (never perfectly even: a faint low-frequency
          // variation)
          'float hot = smoothstep(0.25, 0.6, uT);',
          'float rPol = clamp(uRough * (0.82 + 0.36 * (fgNoise(vObj * 0.9) * 0.5 + 0.5)), 0.04, 1.0);',
          'roughnessFactor = mix(rPol, 0.25 + 0.025 * fn + 0.3 * max(skin - 0.28, 0.0), form);',
          'roughnessFactor = mix(roughnessFactor, 0.1, hot);',
          'float ox = fgNoise(vObj * uUnit * 0.3 + 5.3) * 0.5 + 0.5;',
          'diffuseColor.rgb *= mix(vec3(1.0), mix(vec3(0.86, 0.8, 0.72), vec3(0.8, 0.64, 0.54), ox), skin * 0.8);'
        ].join('\n'))
        .replace('#include <normal_fragment_maps>', [
          '#include <normal_fragment_maps>',
          // the surface (in mm, whatever the mesh's own units): a slow, gentle swell on the liquid; the soft shrinkage
          // undulation of the skin while it forms, gone once the metal is under about 600 degrees (cold, the casting is
          // smooth: a crumpled surface would read as foil); a meniscus dome where the metal lies in an open cup
          '{ vec3 pm = vObj * uUnit;',
          '  float hb = (fgNoise(pm * 0.22 + vec3(uTime * 0.1, 0.0, -uTime * 0.06)) * 0.06 * hot',
          '    + (fgNoise(pm * 0.38 + 2.7) * 0.65 + fgNoise(pm * 0.8 + 9.1) * 0.35) * 0.09 * skin * smoothstep(0.45, 0.62, uT)) * uBumpK',
          '    + uDome * (1.0 - dot(vObj.xz, vObj.xz));',
          '  normal = fgBump(-vViewPosition, normal, hb, faceDirection); }'
        ].join('\n'))
        .replace('#include <emissivemap_fragment>', [
          '#include <emissivemap_fragment>',
          'float tt = uT * (0.975 + 0.03 * fn + 0.01 * fs) * (1.0 - 0.45 * smoothstep(0.78, 0.3, uT + 0.05 * fn));',
          // the leading tongue of the running metal is the hottest, brightest part
          'tt *= 1.0 + 0.08 * smoothstep(-2.5, 0.0, vFront);',
          'totalEmissiveRadiance += fgHeat(tt) * 0.3;'
        ].join('\n'))
        .replace('#include <lights_fragment_end>', [
          '#include <lights_fragment_end>',
          'reflectedLight.indirectSpecular *= mix(1.0, 0.72, skin) * uDim;',
          // (the cold casting takes its look from the room's reflections, like the catalogue's gold: the bench's broad key
          // light would wash its top faces flat)
          'reflectedLight.directSpecular *= mix(1.0, 0.82, skin) * mix(1.0, 0.5, form * (1.0 - hot)) * uDim;',
          '{ float band = exp(-pow((vObj.x - uSweep.x) / uSweep.y, 2.0)); reflectedLight.indirectSpecular += diffuseColor.rgb * band * uSweep.z; }'
        ].join('\n'));
    });
  };

  /* the crucible's pool: a level surface (world space, a large horizontal quad) clipped to the crucible's cavity; its
     convection cells churn; a little darker where it meets the clay */
  FK.pool = function (U) {
    const L = { uInv: U.uInv, uT: U.uPoolT, uTime: U.uTime };
    return new THREE.ShaderMaterial({
      uniforms: L,
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: [
        'varying vec3 vW; uniform mat4 uInv; uniform float uT; uniform float uTime;',
        FK.GLSL,
        // the cavity's radius at a height (the inner half of the crucible's profile) and the spout's flare
        'float fgInner(float y) {',
        '  float r = mix(7.0, 10.0, smoothstep(4.8, 5.2, y));',
        '  r = mix(r, 11.4, clamp((y - 5.2) / 1.4, 0.0, 1.0));',
        '  if (y > 6.6) r = mix(11.4, 12.4, clamp((y - 6.6) / 5.4, 0.0, 1.0));',
        '  if (y > 12.0) r = mix(12.4, 13.7, clamp((y - 12.0) / 10.0, 0.0, 1.0));',
        '  if (y > 22.0) r = mix(13.7, 15.0, clamp((y - 22.0) / 8.6, 0.0, 1.0));',
        '  if (y > 30.6) r = mix(15.0, 16.1, clamp((y - 30.6) / 2.0, 0.0, 1.0));',
        '  return r;',
        '}',
        'void main() {',
        '  if (uT <= 0.001) discard;',
        '  vec3 q = (uInv * vec4(vW, 1.0)).xyz;',
        '  if (q.y < 4.75 || q.y > 32.6) discard;',
        '  float az = atan(q.z, q.x); float s = exp(-pow(az / 0.36, 2.0)); float k = smoothstep(23.0, 32.6, q.y);',
        '  float R = fgInner(q.y) + 4.6 * s * k * k - 0.2;',
        '  float r = length(q.xz);',
        '  if (r > R) discard;',
        // a liquid mirror: an even heat (the slowest, broadest swell only), a little cooler at the meniscus against the
        // clay, and a softbox reflected in the surface, wavering gently as the swell moves under it
        '  float n = fgNoise(vec3(vW.xz * 0.08, uTime * 0.1));',
        '  float edge = smoothstep(R, R - 2.6, r);',
        '  float t = uT * (0.97 + 0.025 * n) * mix(0.86, 1.0, edge);',
        '  vec3 col = fgHeat(t) * 0.36;',
        '  vec2 e = vec2(0.6, 0.0);',
        '  float h0 = fgNoise(vec3(vW.xz * 0.16, uTime * 0.16));',
        '  float hx = fgNoise(vec3((vW.xz + e.xy) * 0.16, uTime * 0.16)), hz = fgNoise(vec3((vW.xz + e.yx) * 0.16, uTime * 0.16));',
        '  vec3 N = normalize(vec3(-(hx - h0) * 0.09 / 0.6, 1.0, -(hz - h0) * 0.09 / 0.6));',
        '  vec3 V = normalize(cameraPosition - vW);',
        '  vec3 Rf = reflect(-V, N);',
        '  float box = smoothstep(0.8, 0.96, dot(Rf, normalize(vec3(-0.45, 0.75, 0.5))));',
        '  float F = 0.6 + 0.4 * pow(1.0 - max(dot(N, V), 0.0), 5.0);',
        '  col += vec3(1.0, 0.94, 0.8) * box * F * 2.2 * uT * edge;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });
  };

  /* the mould: a grey steel ingot mould, machined: fine tool marks running along its length (a streaked roughness that
     draws the highlights out along X, like a brushed finish), a cool sheen; glows dull red near the hot metal
     (FK.graphite keeps its name: it is what the forge asks for) */
  FK.graphite = function (U) {
    // (transparent from the start, so its fade at the end never recompiles it)
    const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#8A8D91'), metalness: 1, roughness: 0.36, envMapIntensity: 0.8, transparent: true });
    const L = { uT: U.uT, uFill: U.uFill, uRingC: U.uRingC, uRingR: u(FK.MOULD.R), uFeed: U.uFeed, uBasin: U.uBasin, uPool: U.uPool };
    m.userData.U = L;
    return inject(m, 'ausb-graphite-2', function (sh) {
      Object.assign(sh.uniforms, L);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vW;\nuniform float uT;\nuniform float uFill;\nuniform vec3 uRingC;\nuniform float uRingR;\nuniform vec4 uFeed;\nuniform vec4 uBasin;\nuniform float uPool;\n' + FK.GLSL)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' +
          // tool marks: noise stretched along X (fine across, long along), and a slow unevenness of the finish
          'float gS = fgNoise(vW * vec3(0.05, 7.0, 7.0)) * 0.6 + fgNoise(vW * vec3(0.12, 21.0, 21.0)) * 0.4;\n' +
          'float gN = fgNoise(vW * 0.15);\n' +
          'roughnessFactor = clamp(roughnessFactor * (0.92 + 0.15 * gS + 0.1 * gN), 0.18, 1.0);\n' +
          'diffuseColor.rgb *= 0.95 + 0.05 * gS + 0.04 * gN;')
        .replace('#include <emissivemap_fragment>', [
          '#include <emissivemap_fragment>',
          // distance to the hot metal: the ring groove (as far round as it has filled), the channel, the basin
          '{ vec3 q = vW - uRingC; float rr = length(q.xz) - uRingR; float a = abs(atan(q.z, -q.x));',
          '  float dRing = length(vec2(rr, q.y)) + max(0.0, (a - uFill * 3.14159265) * uRingR) + (uFill > 0.001 ? 0.0 : 99.0);',
          '  vec3 fa = vec3(uFeed.x, uRingC.y, 0.0), fb = vec3(uFeed.y, uRingC.y, 0.0); vec3 pa = vW - fa, ba = fb - fa;',
          '  float hh = clamp(dot(pa, ba) / dot(ba, ba), 0.0, uFeed.z); float dCh = length(pa - ba * hh) + (uFeed.z > 0.001 ? 0.0 : 99.0);',
          '  float dB = length(vW - uBasin.xyz) - uBasin.w * uPool + (uPool > 0.001 ? 0.0 : 99.0);',
          '  float d = max(min(min(dRing, dCh), dB) - 1.0, 0.0);',
          '  totalEmissiveRadiance += fgHeat(uT * 0.5) * (exp(-d * d / 2.4) * 0.5 + exp(-d / 7.0) * 0.08); }'
        ].join('\n'));
    });
  };

  /* refractory clay (the crucible): matt, warm dark grey, faintly speckled. Its inner wall glows above the metal it
     holds (world level uLevelW), it keeps some heat after the pour (uResid), the spout's lip glows while the stream
     runs over it (uLip), and the body glows dull red from the furnace (uBody). */
  FK.clay = function (U) {
    // a clay-graphite crucible: dark grey with the faint metallic sheen of graphite (a broad, soft reflection of the
    // room's softboxes), finely even; no grit, no glaze patches
    const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#53514F'), metalness: 0.35, roughness: 0.55, envMapIntensity: 1.0 });
    const L = { uT: U.uClayT, uLevelW: U.uLevelW, uLip: U.uLip, uResid: U.uResid, uBody: U.uBody };
    m.userData.U = L;
    return inject(m, 'ausb-clay-4', function (sh) {
      Object.assign(sh.uniforms, L);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float inner;\nvarying float vIn;\nvarying vec3 vObj;\nvarying vec3 vW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvIn = inner;\nvObj = position;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vIn;\nvarying vec3 vObj;\nvarying vec3 vW;\nuniform float uT;\nuniform float uLevelW;\nuniform float uLip;\nuniform float uResid;\nuniform float uBody;\n' + FK.GLSL)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' +
          // (only a slow, faint unevenness of the finish: the body reads as one clean turned form)
          'float cN = fgNoise(vObj * 0.22) * 0.7 + fgNoise(vObj * 0.9) * 0.3;\n' +
          'diffuseColor.rgb *= 0.95 + 0.06 * cN;\n' +
          'roughnessFactor = clamp(roughnessFactor + 0.05 * cN, 0.45, 0.7);\n' +
          // the inside, which the metal has scoured, a little smoother and darker
          'diffuseColor.rgb *= 1.0 - 0.25 * vIn;')
        .replace('#include <emissivemap_fragment>', [
          '#include <emissivemap_fragment>',
          // the inner wall glows only in a narrow band just above the liquid (the meniscus's heat), evenly: the clay's
          // grit never shows through the glow, so the wall never reads as a crust and the liquid stays the brightest thing
          '{ float above = max(vW.y - uLevelW, 0.0);',
          '  float wet = vIn * exp(-above / 2.2) * step(-1.5, vW.y - uLevelW + 1.5);',
          '  float lip = uLip * exp(-pow(atan(vObj.z, vObj.x) / 0.3, 2.0)) * smoothstep(26.0, 31.8, vObj.y);',
          // the outside: a dull red warmth low on the body, where the furnace was hottest
          '  float body = (1.0 - vIn) * uBody * smoothstep(20.0, 1.0, vObj.y) * (0.8 + 0.4 * cN);',
          '  totalEmissiveRadiance += fgHeat(uT * 0.6) * (0.36 * wet + 0.45 * lip) + fgHeat(uT * 0.46) * (0.07 * uResid * vIn) + fgHeat(0.3) * 0.45 * body; }'
        ].join('\n'));
    });
  };

  /* steel (the crucible's holder): blackened, softly polished; the shank dissolves into the dark away from the
     crucible (alpha by distance from it, in object space), so it never draws a hard line across the picture */
  FK.steel = function () {
    const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#4A4643'), metalness: 1, roughness: 0.38, envMapIntensity: 0.6, transparent: true });
    return inject(m, 'ausb-steel-1', function (sh) {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
        .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= 1.0 - smoothstep(24.0, 120.0, length(vObj - vec3(0.0, 15.0, 0.0)));');
    });
  };

  /* the bench: a soft pool of shade under the work (transparent at its edges, so the page shows around it), the soft
     contact shadows of the two mould halves (rounded rectangles) and of the ring (an ellipse), and the warm light the
     hot metal throws on it. Premultiplied output. */
  FK.bench = function (U) {
    const L = { uShade: U.uShade, uShadeA: U.uShadeA, uPoolC: U.uPoolC, uGlowP: U.uGlowP, uGlowC: U.uGlowC, uBoxA: U.uBoxA, uBoxB: U.uBoxB, uBoxK: U.uBoxK, uEll: U.uEll, uEllA: U.uEllA };
    return new THREE.ShaderMaterial({
      uniforms: L, transparent: true, depthWrite: false, premultipliedAlpha: true,
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: [
        'varying vec3 vW; uniform vec3 uShade; uniform float uShadeA; uniform vec4 uPoolC; uniform vec3 uGlowP; uniform vec3 uGlowC;',
        'uniform vec4 uBoxA; uniform vec4 uBoxB; uniform vec2 uBoxK; uniform vec4 uEll; uniform float uEllA;',
        'float fgRR(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }',
        'void main() {',
        '  float r = length((vW.xz - uPoolC.xy) / uPoolC.zw);',
        '  float a = uShadeA * (1.0 - smoothstep(0.0, 1.0, r)) * (1.0 - smoothstep(0.0, 1.0, r));',
        '  float dA = fgRR(vW.xz - uBoxA.xy, uBoxA.zw, 2.0), dB = fgRR(vW.xz - uBoxB.xy, uBoxB.zw, 2.0);',
        '  float c = exp(-max(dA, 0.0) / uBoxK.y) + exp(-max(dB, 0.0) / uBoxK.y);',
        '  c = min(c, 1.0) * uBoxK.x;',
        '  vec2 e = (vW.xz - uEll.xy) / uEll.zw; c = max(c, exp(-dot(e, e) * 2.0) * uEllA);',
        '  a = 1.0 - (1.0 - a) * (1.0 - c);',
        '  float gd = length(vW - uGlowP); vec3 g = uGlowC * exp(-gd * gd / 420.0);',
        '  gl_FragColor = vec4(uShade * a + g, min(1.0, a + dot(g, vec3(0.3, 0.5, 0.2)) * 0.5));',
        '}'
      ].join('\n')
    });
  };

  /* ---------------- parts ---------------- */
  /* the crucible: a lathe of a thick clay cup with a rounded lip, pulled into a pouring spout toward +X.
     Its inside carries attribute inner = 1 (for the glow). Height 32.5, top radius 17.6; lip: the spout's tip. */
  FK.crucible = function () {
    const prof = [
      [0, 0, 0], [9.5, 0, 0], [11.4, 0.5, 0], [12.4, 1.8, 0], [13.6, 9, 0], [15.0, 20, 0], [16.4, 28.5, 0], [17.4, 31.6, 0], [17.5, 32.4, 0],
      [16.9, 33.0, 1], [16.1, 32.6, 1], [15.0, 30.6, 1], [13.7, 22, 1], [12.4, 12, 1], [11.4, 6.6, 1], [10.0, 5.2, 1], [7, 4.8, 1], [0, 4.7, 1]
    ];
    // a smooth curve through the profile (so the lathe has no hard ridges)
    const pts = [], inn = [];
    const curve = new THREE.CatmullRomCurve3(prof.map(function (p) { return new V3(p[0], p[1], 0); }), false, 'centripetal', 0.5);
    const N = 110;
    // the inside begins at the top of the rim: where that falls along the curve (by arc length; the wall is thin, so a
    // nearest-point test would mix the two sides up)
    const lens = curve.getLengths(400), total = lens[lens.length - 1];
    let uRim = 0.5, bd = Infinity;
    for (let i = 0; i <= 400; i++) { const q = curve.getPoint(i / 400), d = Math.hypot(q.x - 16.9, q.y - 33.0); if (d < bd) { bd = d; uRim = lens[i] / total; } }
    // (walked from the bottom centre out and up the outside, over the rim and down the inside: the lathe's faces then
    // point out of the clay everywhere)
    for (let i = 0; i <= N; i++) {
      const p = curve.getPointAt(i / N);
      pts.push(new THREE.Vector2(Math.max(0, p.x), p.y));
      inn.push(AUSB.smooth(uRim - 0.01, uRim + 0.01, i / N));
    }
    const geo = new THREE.LatheGeometry(pts, 192);
    const pos = geo.attributes.position, nPts = pts.length;
    const inner = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const j = i % nPts;
      inner[i] = inn[j];
      // the spout: the rim at azimuth 0 (+X) pulled outward and a little down
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      // (a clean turned rim all round: the lip is one smooth pull of the wall, an even curve from rim to spout)
      const az = Math.atan2(z, x), s = Math.exp(-Math.pow(az / 0.36, 2));
      const k = AUSB.smooth(23, 32.6, y);
      const r = Math.hypot(x, z), nr = r + 4.6 * s * k * k;
      const ny = y - 1.5 * s * AUSB.smooth(28, 33, y);
      if (r > 1e-6) { pos.setX(i, x / r * nr); pos.setZ(i, z / r * nr); }
      pos.setY(i, ny);
    }
    geo.setAttribute('inner', new THREE.BufferAttribute(inner, 1));
    geo.computeVertexNormals();
    // the lathe's first and last columns are the same points: one normal for both, so no seam line runs down the body
    const nrm = geo.attributes.normal, last = (pos.count / nPts - 1) * nPts, nv = new V3();
    for (let j = 0; j < nPts; j++) {
      nv.set(nrm.getX(j) + nrm.getX(last + j), nrm.getY(j) + nrm.getY(last + j), nrm.getZ(j) + nrm.getZ(last + j)).normalize();
      nrm.setXYZ(j, nv.x, nv.y, nv.z); nrm.setXYZ(last + j, nv.x, nv.y, nv.z);
    }
    return { geometry: geo, lip: new V3(17.2 + 4.6, 32.9 - 1.5, 0) };
  };

  /* the holder: a band round the crucible's waist and a rod running back and up, out of the picture
     (no longer drawn: a lone rod read as a stray stick, a collar as a cup's sleeve; the crucible tips on its own) */
  FK.holder = function () {
    const ring = KIT.band({ inner: 14.7, width: 3.4, thick: 1.5, dome: 2, comfort: 2, segments: 128, profile: 16 });
    ring.rotateX(Math.PI / 2);
    ring.translate(0, 15, 0);
    // (straight back, along the axis the pour turns about, so it stays put in the picture as the crucible tips)
    const start = new V3(0, 15, -16.1);
    const rod = KIT.tube([start, new V3(0, 15, -60), new V3(0, 15, -260)], 1.5, { radial: 14, segments: 24 });
    return mergeGeometries([ring, rod]);
  };

  /* the mould: an open graphite block (64 x 18 x 44) with a pouring cup, a channel and a ring-shaped groove in its
     top, split through the ring's centre into two halves that part at the end. Built in slices, cached. */
  let mouldCache = null;
  FK.MOULD = { x0: 0, x1: 58, hz: 18, top: 14, ring: new V3(42, 14, 0), R: 9.15, tube: 1.05, basin: new V3(10, 14, 0), basinR: 5.2, cup: 6.5, feed: [15.2, 42 - 9.15 - 0.6] };
  /* the pouring cup's radius at a height y */
  FK.cupR = function (y) { const M = FK.MOULD; return M.basinR * 0.45 + (y - (M.top - M.cup)) * 0.62; };
  /* the mould's field as a self-contained factory (data, core) -> { f } (it is posted to a meshing Worker as text):
     D = { M (plain numbers), side (-1 left half, 1 right half), split } */
  const MOULD_FIELD = function (D, C) {
    const SD = C.SD, M = D.M, cx = (M.x0 + M.x1) / 2, top = M.top, split = D.split, side = D.side;
    const f = function (x, y, z) {
      // the block, its edges machined to a crisp 1.2 mm round
      let d = SD.box(x - cx, y - top / 2, z, (M.x1 - M.x0) / 2, top / 2, M.hz, 1.2);
      // the ring groove: a half-round channel 2.1 wide round the ring's centre
      const g = SD.torus(x - M.ring[0], (y - top) * 1.04, z, M.R, M.tube);
      // the pouring cup: a cone opening at the top
      const bx = x - M.basin[0], bz = z - M.basin[2], br = Math.sqrt(bx * bx + bz * bz);
      const cone = Math.max(br - (M.basinR * 0.45 + (y - (top - M.cup)) * 0.62), (top - M.cup) - y);
      // the channel from the cup to the groove
      const ch = SD.capsule(x, y, z, M.feed[0], top, 0, M.feed[1], top, 0, 1.0);
      d = SD.smax(d, -Math.min(g, cone, ch), 0.6);
      return SD.smax(d, side < 0 ? x - split : split - x, 0.25);
    };
    return { f: f };
  };
  FK.mould = function () {
    if (mouldCache) return mouldCache;
    const M = FK.MOULD, top = M.top;
    const data = { x0: M.x0, x1: M.x1, hz: M.hz, top: top, ring: M.ring.toArray(), R: M.R, tube: M.tube, basin: M.basin.toArray(), basinR: M.basinR, cup: M.cup, feed: M.feed.slice() };
    const split = M.ring.x, h = AUSB.tier().level === 'low' ? 0.55 : 0.4;
    const t0 = performance.now();
    // (on the meshing Workers, both halves at once; in slices here only where there is no Worker)
    mouldCache = Promise.all([
      AUSB.meshField(MOULD_FIELD, { M: data, side: -1, split: split }, { min: [M.x0 - 2, -1.5, -M.hz - 2], max: [split + 1.5, top + 2, M.hz + 2], h: h, block: 4 }),
      AUSB.meshField(MOULD_FIELD, { M: data, side: 1, split: split }, { min: [split - 1.5, -1.5, -M.hz - 2], max: [M.x1 + 2, top + 2, M.hz + 2], h: h, block: 4 })
    ]).then(function (g) {
      g.forEach(function (x) { x.userData.shared = true; });
      FK.mouldMs = Math.round(performance.now() - t0);
      return { left: g[0], right: g[1] };
    });
    mouldCache.catch(function () { mouldCache = null; });
    return mouldCache;
  };

  /* the cast ring: a court band lying in the XZ plane (its axis along Y), centre line at radius R, so it fills the
     groove; the same band is polished and lifted at the end */
  FK.ring = function () {
    const M = FK.MOULD, t = M.tube * 2;
    const g = KIT.band({ inner: M.R - t / 2, width: 2.5, thick: t, dome: 2.05, comfort: 2.2, segments: 288, profile: 40 });
    g.rotateX(Math.PI / 2);
    return g;
  };
  /* the metal in the channel: a round bar along +X (from 0 to len), its ends rounded */
  FK.bar = function (len, r) {
    return KIT.tube([new V3(0, 0, 0), new V3(len * 0.5, 0, 0), new V3(len, 0, 0)], r, { radial: 20, segments: 48 });
  };

  /* the pour: a tube whose shape the vertex shader bends along the falling arc (start P0, velocity V0, gravity G),
     from the arc's tail to its head (fractions of its time of flight), thinning as it falls */
  FK.stream = function (U) {
    const RAD = 16, SEG = 96;
    const pos = [], idx = [];
    for (let i = 0; i <= SEG; i++) for (let j = 0; j < RAD; j++) pos.push(i / SEG, j / RAD * AUSB.TAU, 0);
    for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
      const a = i * RAD + j, b = (i + 1) * RAD + j, c = (i + 1) * RAD + (j + 1) % RAD, d = i * RAD + (j + 1) % RAD;
      idx.push(a, b, d, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new V3(0, 0, 0), 1e4);
    const L = { uP0: U.uP0, uV0: U.uV0, uG: U.uG, uSpan: U.uSpan, uRad: U.uRad, uTime: U.uTime, uT: U.uStreamT };
    const mat = new THREE.ShaderMaterial({
      uniforms: L,
      vertexShader: [
        'uniform vec3 uP0; uniform vec3 uV0; uniform vec3 uG; uniform vec4 uSpan; uniform float uRad; uniform float uTime;',
        'varying vec3 vN; varying vec3 vV; varying float vU;',
        'void main() {',
        '  float u = position.x, a = position.y;',
        '  float t = mix(uSpan.x, uSpan.y, u) * uSpan.z;',             // time along the arc
        '  vec3 P = uP0 + uV0 * t + 0.5 * uG * t * t;',
        '  vec3 T = normalize(uV0 + uG * t);',
        '  vec3 S = normalize(cross(T, vec3(0.0, 0.0, 1.0))); vec3 B = cross(S, T);',
        // thinner as it falls (it speeds up), slow ripples running down it, rounded where it is cut (head / tail)
        '  float k = t / max(uSpan.z, 1e-3);',
        // (wide where it leaves the lip, about half as wide by the time it lands)
        '  float r = uRad * (1.5 - 0.82 * sqrt(k)) * (1.0 + 0.05 * sin(t * 46.0 - uTime * 13.0) + 0.03 * sin(t * 83.0 - uTime * 21.0 + a * 2.0));',
        '  float head = uSpan.w > 0.5 ? 1.0 : smoothstep(1.0, 0.94, u);',
        '  float tail = uSpan.x > 0.0005 ? smoothstep(0.0, 0.06, u) : 1.0;',
        '  r *= mix(0.25, 1.0, min(head, tail));',
        '  vec3 n = S * cos(a) + B * sin(a);',
        '  vec3 w = P + n * r;',
        '  vec4 wp = modelMatrix * vec4(w, 1.0);',
        '  vN = normalize(mat3(modelMatrix) * n); vV = normalize(cameraPosition - wp.xyz); vU = t;',
        '  gl_Position = projectionMatrix * viewMatrix * wp;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime; uniform float uT; varying vec3 vN; varying vec3 vV; varying float vU;',
        FK.GLSL,
        'void main() {',
        '  float f = abs(dot(normalize(vN), normalize(vV)));',
        // the core faces you and is whitest; the edges turn orange; streaks run down with the flow
        '  float st = fgNoise(vec3(vU * 24.0 - uTime * 9.0, f * 2.0, 0.0));',
        '  float k = vU / 0.3;',
        // a narrow white-yellow core, a yellow-orange body, an orange rim; a touch deeper in colour as it falls; bright
        // enough that the bloom gives it a halo of heat, never bleached flat
        '  float t = uT * (0.74 + 0.46 * pow(f, 2.6) + 0.04 * st) * (1.0 - 0.1 * k);',
        '  gl_FragColor = vec4(fgHeat(t) * 0.34, 1.0);',
        '}'
      ].join('\n')
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    return mesh;
  };

  /* sparks: a few hot points thrown up where the stream lands, each on its own loop (a function of time) */
  FK.sparks = function (U, n) {
    const seed = new Float32Array(n * 4), pos = new Float32Array(n * 3);
    const rnd = AUSB.rand(23);
    for (let i = 0; i < n; i++) { seed[i * 4] = rnd(); seed[i * 4 + 1] = rnd(); seed[i * 4 + 2] = rnd(); seed[i * 4 + 3] = rnd(); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 4));
    geo.boundingSphere = new THREE.Sphere(new V3(), 1e4);
    const L = { uTime: U.uTime, uOrigin: U.uOrigin, uRate: U.uRate, uPx: U.uPx };
    const mat = new THREE.ShaderMaterial({
      uniforms: L, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
      vertexShader: [
        'attribute vec4 seed; uniform float uTime; uniform vec3 uOrigin; uniform float uRate; uniform float uPx; varying float vA;',
        'void main() {',
        '  float life = 0.45 + seed.x * 0.6;',
        '  float age = fract(uTime / life + seed.y) * life;',
        '  float an = seed.z * 6.2831853, up = 0.6 + seed.w * 0.6;',
        '  vec3 v = vec3(cos(an) * (1.0 - up * 0.55), up, sin(an) * (1.0 - up * 0.55)) * (26.0 + 40.0 * seed.x);',
        '  vec3 p = uOrigin + v * age + vec3(0.0, -230.0, 0.0) * age * age * 0.5;',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  vA = (1.0 - age / life) * clamp((uRate - seed.w) * 4.0, 0.0, 1.0);',
        '  gl_PointSize = uPx * (0.7 + seed.y * 0.8) * (1.0 - 0.6 * age / life) / max(1.0, -mv.z) * 180.0;',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying float vA;',
        'void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float d = dot(q, q); if (d > 1.0) discard;',
        '  float a = exp(-d * 4.0) * vA; gl_FragColor = vec4(vec3(6.0, 3.0, 1.0) * a, a * 0.7); }'
      ].join('\n')
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  };
}

/* ---- 83-forge-post.js ---- */
/* ---- The forge's picture (for AUGL.forge): the scene is drawn in linear light to a half-float target, its brightest
   parts spread into a soft bloom (a short down / up chain at 1/2 … 1/16 size), the air above hot metal shimmers,
   then one pass tone-maps it into the canvas (transparent where nothing is drawn, so the page shows through).
   AUSB.ForgePost(renderer, { msaa }) -> { setSize(w, h), render(scene, camera), U (composite uniforms), dispose() } ---- */
{
  const FK = AUSB.forgeKit;
  const QUAD_V = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

  AUSB.ForgePost = function (renderer, o) {
    o = o || {};
    this.r = renderer;
    const half = THREE.HalfFloatType;
    this.main = new THREE.WebGLRenderTarget(4, 4, { type: half, samples: o.msaa || 0, depthBuffer: true });
    this.levels = [0, 1, 2, 3].map(function () { return new THREE.WebGLRenderTarget(2, 2, { type: half, depthBuffer: false }); });
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    // down: four bilinear taps (a 4 x 4 box), with a soft threshold on the first step
    this.down = new THREE.ShaderMaterial({
      uniforms: { src: { value: null }, texel: { value: new THREE.Vector2() }, thr: { value: 0 }, knee: { value: 0.5 } },
      vertexShader: QUAD_V,
      fragmentShader: [
        'uniform sampler2D src; uniform vec2 texel; uniform float thr; uniform float knee; varying vec2 vUv;',
        'void main() {',
        '  vec4 c = 0.25 * (texture2D(src, vUv + texel * vec2(-1.0, -1.0)) + texture2D(src, vUv + texel * vec2(1.0, -1.0)) +',
        '                   texture2D(src, vUv + texel * vec2(-1.0, 1.0)) + texture2D(src, vUv + texel * vec2(1.0, 1.0)));',
        '  if (thr > 0.0) { float l = max(c.r, max(c.g, c.b)); float s = clamp(l - thr + knee, 0.0, 2.0 * knee); s = s * s / (4.0 * knee + 1e-4);',
        '    c.rgb *= max(s, l - thr) / max(l, 1e-4); c.a = 0.0; }',
        '  gl_FragColor = vec4(c.rgb, 0.0);',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false, blending: THREE.NoBlending
    });
    // up: a 3 x 3 tent from the smaller level, added onto the larger one
    this.up = new THREE.ShaderMaterial({
      uniforms: { src: { value: null }, texel: { value: new THREE.Vector2() }, k: { value: 1 } },
      vertexShader: QUAD_V,
      fragmentShader: [
        'uniform sampler2D src; uniform vec2 texel; uniform float k; varying vec2 vUv;',
        'void main() {',
        '  vec3 c = texture2D(src, vUv).rgb * 4.0;',
        '  c += (texture2D(src, vUv + texel * vec2(-1.0, 0.0)).rgb + texture2D(src, vUv + texel * vec2(1.0, 0.0)).rgb +',
        '        texture2D(src, vUv + texel * vec2(0.0, -1.0)).rgb + texture2D(src, vUv + texel * vec2(0.0, 1.0)).rgb) * 2.0;',
        '  c += texture2D(src, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(src, vUv + texel * vec2(1.0, -1.0)).rgb +',
        '       texture2D(src, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(src, vUv + texel * vec2(1.0, 1.0)).rgb;',
        '  gl_FragColor = vec4(c / 16.0 * k, 0.0);',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor
    });
    // the composite: shimmer, scene + bloom, tone mapping, a whisper of dither
    const U = this.U = {
      scene: { value: null }, bloom: { value: null }, strength: { value: 0.9 }, time: { value: 0 },
      hot: { value: [0, 1, 2, 3].map(function () { return new THREE.Vector4(-9, -9, 0.1, 0); }) },
      aspect: { value: 1 }, res: { value: new THREE.Vector2(1, 1) }
    };
    this.comp = new THREE.ShaderMaterial({
      uniforms: U,
      vertexShader: QUAD_V,
      fragmentShader: [
        'uniform sampler2D scene; uniform sampler2D bloom; uniform float strength; uniform float time; uniform vec4 hot[4]; uniform float aspect; uniform vec2 res;',
        'varying vec2 vUv;',
        FK.GLSL,
        'void main() {',
        // heat shimmer: the air above each hot spot (x, y: centre in uv; z: radius; w: strength) wavers upward
        '  float m = 0.0;',
        '  for (int i = 0; i < 4; i++) { vec2 d = (vUv - hot[i].xy) * vec2(aspect, 1.0); d.y -= hot[i].z * 0.55;',
        '    float e = exp(-dot(d * vec2(1.25, 0.8), d * vec2(1.25, 0.8)) / (hot[i].z * hot[i].z)); m += e * hot[i].w; }',
        '  vec2 w = vec2(fgNoise(vec3(vUv * vec2(28.0, 16.0), time * 1.6 - vUv.y * 9.0)), fgNoise(vec3(vUv * vec2(26.0, 18.0) + 11.0, time * 1.9 - vUv.y * 11.0)));',
        '  vec2 uv = vUv + w * m * 0.0032;',
        '  vec4 c = texture2D(scene, uv);',
        '  vec3 b = texture2D(bloom, vUv).rgb * strength;',
        '  vec3 col = c.rgb + b;',
        '  float a = clamp(c.a + dot(b, vec3(0.3, 0.55, 0.15)) * 1.6, 0.0, 1.0);',
        '  gl_FragColor = vec4(col, a);',
        '  #include <tonemapping_fragment>',
        '  #include <colorspace_fragment>',
        // dither (a fraction of a level), so the long glows never band
        '  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);',
        '  gl_FragColor.rgb += (n - 0.5) / 255.0 * gl_FragColor.a;',
        '}'
      ].join('\n'),
      depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: true
    });
    this.w = 0; this.h = 0;
    this.thr = 1.0;           // what is brighter than this (linear) blooms
  };
  AUSB.ForgePost.prototype.setSize = function (w, h) {
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.main.setSize(w, h);
    let lw = w, lh = h;
    this.levels.forEach(function (rt) { lw = Math.max(1, lw >> 1); lh = Math.max(1, lh >> 1); rt.setSize(lw, lh); });
    this.U.aspect.value = w / Math.max(1, h);
    this.U.res.value.set(w, h);
  };
  AUSB.ForgePost.prototype.pass = function (mat, target) {
    this.quad.material = mat;
    this.r.setRenderTarget(target);
    this.r.render(this.scene, this.cam);
  };
  AUSB.ForgePost.prototype.render = function (scene, camera) {
    const r = this.r, L = this.levels;
    const prevClear = r.getClearAlpha();
    r.setClearColor(0x000000, 0);
    r.setRenderTarget(this.main);
    r.clear(true, true, false);
    r.render(scene, camera);
    // bloom: down with a threshold, down, down, down; then back up, each level added onto the next (the widest ones
    // weaker: a close halo round hot metal, not a fog). Skipped when nothing is hot.
    if (this.U.strength.value > 0.002) {
      const D = this.down.uniforms;
      D.src.value = this.main.texture; D.texel.value.set(1 / this.w, 1 / this.h); D.thr.value = this.thr;
      this.pass(this.down, L[0]);
      D.thr.value = 0;
      for (let i = 1; i < L.length; i++) { D.src.value = L[i - 1].texture; D.texel.value.set(1 / L[i - 1].width, 1 / L[i - 1].height); this.pass(this.down, L[i]); }
      const Up = this.up.uniforms;
      for (let i = L.length - 1; i > 0; i--) { Up.src.value = L[i].texture; Up.texel.value.set(1 / L[i].width, 1 / L[i].height); Up.k.value = i === 1 ? 0.85 : i === 2 ? 0.5 : 0.25; this.pass(this.up, L[i - 1]); }
    }
    this.U.scene.value = this.main.texture;
    this.U.bloom.value = L[0].texture;
    this.pass(this.comp, null);
    r.setClearAlpha(prevClear);
  };
  /* compile the passes ahead, each in the state it is drawn in (the composite into the canvas, with tone mapping) */
  AUSB.ForgePost.prototype.compile = function () {
    const r = this.r, self = this, ps = [];
    const one = function (mat) {
      const s = new THREE.Scene(), q = new THREE.Mesh(self.quad.geometry, mat);
      q.frustumCulled = false; s.add(q);
      try { ps.push(r.compileAsync ? r.compileAsync(s, self.cam) : Promise.resolve(r.compile(s, self.cam))); } catch (e) { /* drawn anyway */ }
    };
    const prev = r.getRenderTarget();
    try {
      r.setRenderTarget(this.levels[0]);
      one(this.down); one(this.up);
      r.setRenderTarget(null);
      one(this.comp);
    } finally { r.setRenderTarget(prev); }
    return Promise.all(ps).catch(function () { /* drawn anyway */ });
  };
  AUSB.ForgePost.prototype.dispose = function () {
    this.main.dispose();
    this.levels.forEach(function (rt) { rt.dispose(); });
    this.down.dispose(); this.up.dispose(); this.comp.dispose();
    this.quad.geometry.dispose();
  };
}

/* ---- 84-forge.js ---- */
/* ---- AUGL.forge(container, { label }) -> { setProgress(p), dispose(), ready, phases }   (idea 14, the atelier page)
   Molten gold, scrubbed by the scroll. Everything on screen is a function of p (0..1):
     0    – 0.35  the crucible, glowing, tips on its lip and pours: a white-orange stream arcs into the mould's cup, runs
                  along the channel and round the ring-shaped groove
     0.35 – 0.70  the gold cools in the mould: white-orange, orange, dull red under a darkening skin, then gold
     0.70 – 1     the mould parts, the ring rises, stands, turns and is polished, catching the light in glints
   Only the life of the hot metal (its churning, the shimmer of the air above it, sparks) runs on the clock, and only
   while something is hot and motion is allowed. Drawn in linear light with a soft bloom, then tone-mapped into a
   transparent canvas (83-forge-post.js), so the page shows around the work.
   The whole scene (renderer, room, programs, buffers) is prepared in idle time as soon as the atelier page is open, so
   forge() only has to put it in place; it is thrown away with the page. ---- */
{
  const V3 = THREE.Vector3;
  const FK = AUSB.forgeKit, M = FK.MOULD;
  const sm = AUSB.smooth, sr = AUSB.smoother, sg = AUSB.seg, clamp = AUSB.clamp, lerp = AUSB.lerp;
  const DEG = Math.PI / 180;
  const bell = function (a, b, c, d, x) { return sm(a, b, x) * (1 - sm(c, d, x)); };

  /* the timeline */
  const T = {
    tilt0: [0.02, 0.095], tilt1: [0.095, 0.3], back: [0.3, 0.44],
    head: [0.088, 0.106], tail: [0.29, 0.312],
    basin: [0.102, 0.15], channel: [0.147, 0.186], ring: [0.183, 0.302],
    cool: [0.335, 0.695],
    open: [0.7, 0.8], rise: [0.712, 0.88], stand: [0.74, 0.9], turn: [0.73, 1], polish: [0.75, 0.93]
  };
  const PHASES = [{ from: 0, to: 0.35, name: 'pour' }, { from: 0.35, to: 0.7, name: 'cool' }, { from: 0.7, to: 1, name: 'reveal' }];
  const TILT0 = 31 * DEG, TILT1 = 74 * DEG;
  const LIP = new V3(2.4, M.top + 23, 0.8);         // where the crucible's lip sits: the pivot of the pour
  const RISE = 18;                                  // how high the ring rises above the mould's top
  const PART = 17;                                  // how far each half of the mould slides away
  const TURN_END = -0.62;                           // the ring's last turn: a three-quarter view
  const dirOf = function (az, el) { az *= DEG; el *= DEG; return new V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)); };
  /* the camera's path: framings (see fitKeys) held or blended between these points of the scroll */
  const SHOTS = [
    { at: 0, k: 0, dolly: 1 }, { at: 0.3, k: 0, dolly: 0.97 }, { at: 0.5, k: 1, dolly: 1 }, { at: 0.67, k: 1, dolly: 0.95 },
    { at: 0.8, k: 2, dolly: 1 }, { at: 0.94, k: 3, dolly: 1 }, { at: 1, k: 3, dolly: 0.98 }
  ];
  const DIRS = [dirOf(21, 26), dirOf(12, 50), dirOf(9, 36), dirOf(5, 21)];
  const STAGE_O = function () { return { kind: 'forge', fov: 26, near: 5, far: 4000, antialias: false, pixelCap: AUSB.tier().level === 'high' ? 2.1e6 : 1.4e6 }; };

  /* the geometry that does not depend on a renderer, made once */
  let parts = null;
  const getParts = function () {
    if (parts) return parts;
    const cru = FK.crucible();
    parts = {
      crucible: cru,
      ring: FK.ring(),
      bar: FK.bar(M.feed[1] - M.feed[0] + 0.6, 1.0),
      disc: new THREE.CircleGeometry(1, 72).rotateX(-Math.PI / 2),
      poolPlane: new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2),
      bench: new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2)
    };
    Object.keys(parts).forEach(function (k) { if (parts[k] && parts[k].isBufferGeometry) parts[k].userData.shared = true; });
    cru.geometry.userData.shared = true;
    return parts;
  };

  /* ================= the world: the renderer and everything it draws, independent of the page ================= */
  function World(mode0) {
    const W = this;
    const tier = AUSB.tier();
    W.mode = mode0 === 'light' ? 'light' : 'dark';
    W.p = 0; W.dirty = true; W.disposed = false; W.isReady = false; W.timing = {};
    const T0 = performance.now(), timing = W.timing;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const R = W.R = AUSB.renderer(canvas, { alpha: true, antialias: false });
    R.toneMapping = THREE.NeutralToneMapping;
    const scene = W.scene = new THREE.Scene();
    const cam = W.cam = new THREE.PerspectiveCamera(26, 1, 5, 4000);
    const post = W.post = new AUSB.ForgePost(R, { msaa: tier.level === 'low' ? 2 : 4 });
    W.size = { w: 0, h: 0 };

    /* every changing value lives in one set of uniforms */
    const U = W.U = {
      uTime: { value: 0 }, uT: { value: 0 }, uRough: { value: 0.42 }, uFill: { value: 0 }, uRingC: { value: M.ring.clone() },
      uFeed: { value: new THREE.Vector4(M.feed[0], M.feed[1] + 0.6, 0, 0) }, uBasin: { value: new THREE.Vector4(M.basin.x, M.top - 3.2, 0, 4.2) }, uPool: { value: 0 },
      uInv: { value: new THREE.Matrix4() }, uPoolT: { value: 1 },
      uClayT: { value: 1 }, uLevelW: { value: 0 }, uLip: { value: 0 }, uResid: { value: 0 }, uBody: { value: 0 },
      uShade: { value: new V3() }, uShadeA: { value: 0.7 }, uPoolC: { value: new THREE.Vector4(30, 2, 110, 80) },
      uGlowP: { value: new V3() }, uGlowC: { value: new V3() },
      uBoxA: { value: new THREE.Vector4(21, 0, 21, 22) }, uBoxB: { value: new THREE.Vector4(53, 0, 11, 22) }, uBoxK: { value: new THREE.Vector2(0.8, 2.6) },
      uEll: { value: new THREE.Vector4(42, 0, 9, 5) }, uEllA: { value: 0 },
      uP0: { value: new V3() }, uV0: { value: new V3() }, uG: { value: new V3() }, uSpan: { value: new THREE.Vector4() }, uRad: { value: 1.2 }, uStreamT: { value: 1.08 },
      uOrigin: { value: new V3() }, uRate: { value: 0 }, uPx: { value: 1 },
      ringFill: { value: 0 }, barFill: { value: 0 }, skinK: { value: 1 }, sweep: { value: new V3(-1e3, 2.4, 0) }
    };

    /* light: a warm key from high front-left, a rim from behind for the edges, and the hot metal's own light */
    const key = new THREE.DirectionalLight(0xfff0e2, 1.3); key.position.set(-90, 160, 110);
    const rim = new THREE.DirectionalLight(0xffe4d2, 1.7); rim.position.set(80, 70, -170);
    const hotA = new THREE.PointLight(0xff7a22, 0, 0, 2), hotB = new THREE.PointLight(0xff7a22, 0, 0, 2);
    scene.add(key, rim, hotA, hotB);

    const P = getParts();
    /* the bench: shade, contact shadows and the glow of the hot metal on it */
    const bench = new THREE.Mesh(P.bench, FK.bench(U));
    bench.renderOrder = -1; bench.frustumCulled = false;
    scene.add(bench);
    /* the crucible on its lip: pourG sits at the lip and turns about Z; cruG holds the crucible with its lip there */
    const pourG = new THREE.Group(), cruG = new THREE.Group();
    pourG.add(cruG); scene.add(pourG);
    cruG.position.copy(P.crucible.lip).negate();
    // (the crucible alone: no holder, no stray rod running out of the picture)
    const clay = FK.clay(U);
    const cruMesh = new THREE.Mesh(P.crucible.geometry, clay);
    cruG.add(cruMesh);
    const pool = new THREE.Mesh(P.poolPlane, FK.pool(U));
    pool.frustumCulled = false;
    scene.add(pool);
    /* the stream and its sparks */
    const stream = FK.stream(U); scene.add(stream);
    const sparks = FK.sparks(U, 26); scene.add(sparks);
    /* a small bloom of heat where the stream meets the sprue (a soft disc of light the bloom pass spreads) */
    const glowTex = (function () {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
    })();
    const landGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.6, 1.2, 0.3), transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    landGlow.renderOrder = 15; landGlow.visible = false;
    scene.add(landGlow);
    /* the mould (two halves, built in slices), the metal in its cup and channel, and the cast ring */
    const mouldL = new THREE.Group(), mouldR = new THREE.Group();
    scene.add(mouldL, mouldR);
    const graphite = FK.graphite(U);
    // the cup and the channel keep their casting skin (only the ring is polished)
    const sprueRough = { value: 0.36 };
    // (the cup's metal sets with a full meniscus: its curve carries the room's light across it, so the cold button reads
    // as metal, not a flat disc of colour)
    const metalBasin = FK.molten(U, { scale: 0.34, uRough: sprueRough, fade: true, unit: 5, dome: 0.85, bump: 0.25 });
    const metalBar = FK.molten(U, { fill: 'x', a0: 0, a1: M.feed[1] - M.feed[0] + 0.6, yc: 0, uFill: U.barFill, scale: 0.34, uRough: sprueRough, fade: true });
    const metalRing = FK.molten(U, { fill: 'ring', a0: M.R, yc: 0, uFill: U.ringFill, uSkinK: U.skinK, uSweep: U.sweep, scale: 0.34 });
    const basinDisc = new THREE.Mesh(P.disc, metalBasin);
    const bar = new THREE.Mesh(P.bar, metalBar);
    bar.position.set(M.feed[0], M.top, 0);
    bar.renderOrder = basinDisc.renderOrder = 3;
    mouldL.add(basinDisc, bar);
    const ringRoot = new THREE.Group(), turnG = new THREE.Group(), tiltG = new THREE.Group();
    const ring = new THREE.Mesh(P.ring, metalRing);
    ringRoot.add(turnG); turnG.add(tiltG); tiltG.add(ring);
    scene.add(ringRoot);
    const stars = new AUSB.Stars(scene, 2);
    stars.list.forEach(function (s) { s.material.color.setScalar(2.2); });
    let mouldMeshes = [], prepass = [];
    // while the halves fade, a depth-only pass first, so only their nearest surface shows (no ghosted edges)
    const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true });

    /* the lightbox (for the polished metals and the soft sheen on graphite), both modes, made in idle slices */
    let envs = {};
    W.loadEnv = function (m) {
      if (!envs[m]) {
        const rec = envs[m] = {};
        rec.p = AUSB.envAsync(R, m).then(function (t) { rec.t = t; return t; });
      }
      return envs[m].p;
    };
    W.useEnv = function (t) {
      scene.environment = t;
      [graphite, clay].forEach(function (m) { m.envMap = t; });
      W.dirty = true;
    };
    W.resetEnv = function () { envs = {}; };

    /* camera framings (computed for the frame's shape): the whole pour, the mould, the opening, the risen ring */
    let K = null;
    const crucibleBox = function (theta, out) {
      const m = new THREE.Matrix4().makeRotationZ(-theta).premultiply(new THREE.Matrix4().makeTranslation(LIP.x, LIP.y, LIP.z));
      m.multiply(new THREE.Matrix4().makeTranslation(-P.crucible.lip.x, -P.crucible.lip.y, -P.crucible.lip.z));
      [-17.5, 22].forEach(function (x) { [0, 33].forEach(function (y) { [-17.5, 17.5].forEach(function (z) { out.push(new V3(x, y, z).applyMatrix4(m)); }); }); });
    };
    const boxPts = function (x0, x1, y0, y1, z0, z1, out) {
      [x0, x1].forEach(function (x) { [y0, y1].forEach(function (y) { [z0, z1].forEach(function (z) { out.push(new V3(x, y, z)); }); }); });
      return out;
    };
    let headH = 84;
    const fitKeys = function () {
      const w = W.size.w, h = W.size.h;
      if (!w || !h) return;
      const wide = w > 899;
      const top = Math.min(0.3, (headH + 0.05 * h) / h);
      // (the page's copy sits on the left on wide screens, above and below the scene on narrow ones; on wide screens
      // a progress rail runs down the right edge)
      const mg = wide ? { l: w <= 1080 ? 0.48 : 0.45, r: w >= 1280 ? 0.075 : 0.04, t: top, b: 0.08 } : { l: 0.05, r: 0.05, t: 0.22, b: 0.35 };
      // 0: the whole pour; 1: the mould's top; 2: the mould opening, the ring lifting; 3: the risen ring, with air
      const pw = boxPts(M.x0, M.x1, 0, M.top, -M.hz, M.hz, []);
      crucibleBox(0, pw); crucibleBox(TILT1 * 0.6, pw);
      const pm = boxPts(M.x0, M.x1, 0, M.top, -M.hz, M.hz, []);
      const po = boxPts(M.x0 - PART * 0.7, M.x1 + PART * 0.7, M.top - 8, M.top + RISE * 0.6, -M.hz + 2, M.hz - 2, []);
      const C = new V3(M.ring.x, M.top + RISE, 0), pr = [];
      [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(function (d) { pr.push(C.clone().add(new V3(d[0], d[1], d[2]).multiplyScalar(wide ? 17 : 15))); });
      const fit = function (pts, dir) { const f = AUSB.frameFit(pts, dir, cam.fov, cam.aspect, mg); return { t: f.target, D: f.D }; };
      K = [fit(pw, DIRS[0]), fit(pm, DIRS[1]), fit(po, DIRS[2]), fit(pr, DIRS[3])];
    };
    /* the frame's size (css px) and pixel ratio: the drawing buffer, the post targets, the framings */
    W.resize = function (w, h, dpr) {
      if (dpr) { R.setPixelRatio(dpr); R.setSize(w, h, false); }
      W.size = { w: w, h: h };
      cam.aspect = w / Math.max(1, h);
      cam.updateProjectionMatrix();
      try { headH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head-h')) || 84; } catch (e) { /* default */ }
      post.setSize(R.domElement.width, R.domElement.height);
      U.uPx.value = R.getPixelRatio() * Math.min(1.6, h / 700);
      fitKeys();
      W.dirty = true;
    };

    /* ---------------- the picture at p ---------------- */
    const tmp = new V3(), tmp2 = new V3(), dir = new V3(), vv = new V3(), nm = new THREE.Matrix3();
    const heatColor = function (t, out) {
      // the colour of the hot metal's light: white-orange when pouring, red as it cools
      const k = clamp(t, 0, 1);
      return out.set(1, 0.18 + 0.4 * k * k, 0.03 + 0.14 * k * k * k);
    };
    const glintCands = [];
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * AUSB.TAU, c = Math.cos(a), s = Math.sin(a);
      glintCands.push({ p: new V3(c * 10.15, 0, s * 10.15), n: new V3(c, 0, s), w: new V3() });
      glintCands.push({ p: new V3(c * 9.95, 0.85, s * 9.95), n: new V3(c * 0.7, 0.71, s * 0.7).normalize(), w: new V3() });
      glintCands.push({ p: new V3(c * 9.95, -0.85, s * 9.95), n: new V3(c * 0.7, -0.71, s * 0.7).normalize(), w: new V3() });
    }
    const keyDir = new V3(-0.38, 0.78, 0.5).normalize();

    W.apply = function () {
      const p = W.p, red = !!AU.reduced;
      /* -------- the pour -------- */
      const e0 = AUSB.easeInOut(sg(T.tilt0[0], T.tilt0[1], p)), e1 = sg(T.tilt1[0], T.tilt1[1], p), eb = AUSB.easeInOut(sg(T.back[0], T.back[1], p));
      let theta = TILT0 * e0 + (TILT1 - TILT0) * (e1 * (2 - e1) * 0.35 + e1 * 0.65);
      theta = theta * (1 - eb) + 8 * DEG * eb;
      // then it is lifted away, up and back, out of the picture
      pourG.position.set(LIP.x - 12 * eb, LIP.y + 80 * eb * eb, LIP.z - 20 * eb);
      pourG.rotation.z = -theta;
      pourG.visible = p < T.back[1] + 0.02;
      scene.updateMatrixWorld();
      // the metal's level in the crucible stays level in the world: it rises to the lip as the crucible tips
      const lipW = tmp.copy(P.crucible.lip).applyMatrix4(cruG.matrixWorld);
      const k0 = clamp(theta / TILT0, 0, 1);
      const level = lipW.y - 0.35 - 9.6 * Math.pow(1 - k0, 1.25);
      const poolHeat = 1 - sm(0.29, 0.325, p);
      U.uPoolT.value = poolHeat > 0.002 ? 0.4 + 0.6 * poolHeat : 0;
      pool.visible = poolHeat > 0.002 && pourG.visible;
      U.uInv.value.copy(cruG.matrixWorld).invert();
      const cc = tmp2.set(0, 20, 0).applyMatrix4(cruG.matrixWorld);
      const ccx = cc.x, ccz = cc.z;
      pool.position.set(ccx, level, ccz);
      U.uLevelW.value = poolHeat > 0.002 ? level : -1e3;
      // the clay keeps its glow a while after the pour
      U.uResid.value = sm(0.26, 0.33, p) * (1 - sm(0.36, 0.44, p));
      /* the stream: from the spout's edge into the cup, along a falling arc; its head runs down, its tail follows */
      const head = sg(T.head[0], T.head[1], p), tail = sg(T.tail[0], T.tail[1], p);
      const pouring = head > 0.001 && tail < 0.999;
      stream.visible = pouring;
      const pour = bell(T.head[0], T.head[1] + 0.01, T.tail[0] - 0.01, T.tail[1], p);
      U.uLip.value = pour * 0.9 + 0.1 * pour * pour;
      if (pouring) {
        const P0 = tmp.set(P.crucible.lip.x + 0.7, P.crucible.lip.y - 0.25, 0).applyMatrix4(cruG.matrixWorld);
        const L = tmp2.set(M.basin.x + 0.6, M.top - 1.2, 0.2);
        const Tf = 0.3, vy0 = -7;
        const g = 2 * (P0.y + vy0 * Tf - L.y) / (Tf * Tf);
        U.uP0.value.copy(P0);
        U.uV0.value.set((L.x - P0.x) / Tf, vy0, (L.z - P0.z) / Tf);
        U.uG.value.set(0, -g, 0);
        U.uSpan.value.set(tail * tail, Math.min(1, head * (2 - head)), Tf, head >= 1 ? 1 : 0);
        U.uRad.value = 0.92 * (1 - 0.34 * sm(0.22, 0.29, p)) * (0.75 + 0.25 * sm(0, 0.4, head));
      }
      // the heat where it lands: blooms as the head of the stream reaches the cup, goes with the tail
      const landK = pouring ? pour * sm(0.8, 1, head) : 0;
      landGlow.visible = landK > 0.01;
      if (landGlow.visible) {
        landGlow.position.set(M.basin.x + 0.6, M.top - 0.2, 0.4);
        landGlow.scale.setScalar(6.5 + 2.5 * landK);
        landGlow.material.opacity = 0.85 * landK;
      }
      U.uRate.value = red ? 0 : bell(0.104, 0.12, 0.27, 0.3, p);
      sparks.visible = U.uRate.value > 0.01;
      U.uOrigin.value.set(M.basin.x + 0.6, M.top - 0.6, 0.2);
      /* the mould fills: the cup, the channel, then round the groove both ways */
      const fB = sg(T.basin[0], T.basin[1], p), fC = sg(T.channel[0], T.channel[1], p), fR = sg(T.ring[0], T.ring[1], p);
      const yB = M.top - M.cup + (M.cup - 0.32) * Math.pow(fB, 0.8);
      basinDisc.visible = fB > 0.004;
      basinDisc.position.set(M.basin.x, yB, M.basin.z);
      basinDisc.scale.setScalar(FK.cupR(yB) + 0.12);
      U.uPool.value = fB;
      U.barFill.value = fC;
      bar.visible = fC > 0.003;
      U.uFeed.value.z = fC;
      U.ringFill.value = fR * (1.6 - 0.6 * fR);
      U.uFill.value = U.ringFill.value;
      ring.visible = fR > 0.003;
      /* the gold cools: white-orange, orange, dull red, a darkening skin, then gold
         (an even walk through the colours: as much scroll for orange as for dull red) */
      const kc = sg(T.cool[0], T.cool[1], p);
      const temp = 0.97 * Math.pow(1 - kc, 0.85) * (1 - sm(0.82, 1, kc) * 0.4) * (fB > 0 ? 1 : 0);
      U.uT.value = temp;
      /* -------- the reveal -------- */
      // the halves part, then sink down and back out of the picture, fading, as the camera closes on the ring (never
      // sideways: on wide screens the copy sits to the left of the work)
      const open = AUSB.easeInOut(sg(T.open[0], T.open[1], p)), away = Math.pow(sg(0.79, 0.88, p), 1.6);
      mouldL.position.x = -PART * open - 5 * away; mouldR.position.x = PART * open + 5 * away;
      mouldL.position.y = mouldR.position.y = -38 * away;
      mouldL.position.z = mouldR.position.z = -26 * away;
      const rise = AUSB.easeInOut(sg(T.rise[0], T.rise[1], p));
      const stand = AUSB.easeInOut(sg(T.stand[0], T.stand[1], p));
      const turn = sr(T.turn[0], T.turn[1], p);
      const pol = sr(T.polish[0], T.polish[1], p);
      ringRoot.position.set(M.ring.x, M.top + RISE * rise, 0);
      turnG.rotation.y = (TURN_END - AUSB.TAU) * turn;
      tiltG.rotation.x = Math.PI / 2 * stand;
      ring.scale.set(1, 0.36 + 0.64 * sm(0, 0.35, rise), 1);
      // polished to the catalogue's own finish (the same 18k gold as every ring in the boutique)
      U.uRough.value = lerp(0.34, (KIT.METALS && KIT.METALS.yellow && KIT.METALS.yellow.roughness) || 0.15, pol);
      U.skinK.value = 1 - sm(0.2, 0.75, pol);
      const sw = sg(0.8, 0.9, p);
      U.sweep.value.set(-13 + 26 * AUSB.easeInOutSine(sw), 2.4, 0.45 * Math.sin(Math.PI * sw));
      // only the molten metal blooms; cold metal never does (the jewellery elsewhere on the site is crisp)
      const light = W.mode === 'light';
      // (a soft halo round the stream and the filled groove: the hot metal is drawn saturated, the bloom carries the heat)
      post.thr = 1.0;
      post.U.strength.value = 0.48 * (1 - sm(0.6, 0.7, p)) * (light ? 0.7 : 1);
      // and as the ring rises the light gathers on it: the tools sink into the dark and fade away, the ring stays
      const focus = sm(0.74, 0.86, p), gone = sm(0.8, 0.865, p);
      graphite.envMapIntensity = 0.85 - 0.4 * focus;
      graphite.opacity = metalBasin.opacity = metalBar.opacity = 1 - gone;
      mouldL.visible = mouldR.visible = gone < 0.999;
      prepass.forEach(function (m) { m.visible = gone > 0.001; });
      /* -------- light -------- */
      const mouldHeat = temp;
      // the crucible's own light comes from its mouth (so it lights the rim and the inner wall, never the outside); once
      // the stream runs, from the stream
      heatColor(1, hotA.color);
      const sp = clamp(pour * 1.5, 0, 1);
      hotA.position.set(lerp(ccx, lerp(LIP.x, M.basin.x, 0.6), sp), lerp(level + 7, lerp(LIP.y, M.top, 0.55), sp), lerp(ccz, 8, sp));
      hotA.intensity = 1700 * (0.25 * poolHeat * (1 - eb) + 0.75 * pour);
      heatColor(mouldHeat, hotB.color);
      hotB.position.set(lerp(M.basin.x + 8, M.ring.x, sm(0.16, 0.3, p)), M.top + 9, 6);
      hotB.intensity = 2400 * Math.pow(mouldHeat, 1.6) * sm(0.1, 0.16, p);
      key.intensity = 1.25 + 0.75 * rise;
      rim.intensity = 1.6 + 0.5 * rise;
      /* the bench (the pool of shade goes with the tools: at the end the ring hangs in its own light) */
      if (light) { U.uShade.value.set(0.11, 0.065, 0.055); U.uShadeA.value = 0.22 * (1 - 0.85 * gone); U.uBoxK.value.set(0.42 * (1 - gone), 2.8); }
      else { U.uShade.value.set(0.008, 0.0012, 0.0012); U.uShadeA.value = 0.78 * (1 - 0.6 * gone); U.uBoxK.value.set(0.82 * (1 - gone), 2.6); }
      U.uPoolC.value.set(lerp(26, M.ring.x, sm(0.4, 0.9, p)), 2, lerp(105, 70, sm(0.4, 0.9, p)), lerp(78, 52, sm(0.4, 0.9, p)));
      U.uBoxA.value.set((M.x0 + M.ring.x) / 2 + mouldL.position.x, mouldL.position.z, (M.ring.x - M.x0) / 2 + 0.3, M.hz + 0.3);
      U.uBoxB.value.set((M.ring.x + M.x1) / 2 + mouldR.position.x, mouldR.position.z, (M.x1 - M.ring.x) / 2 + 0.3, M.hz + 0.3);
      U.uEll.value.set(M.ring.x, 3, 8 + 3 * rise, 4 + 2.5 * rise);
      U.uEllA.value = (light ? 0.1 : 0.25) * rise * (1 - 0.7 * gone);
      const gA = 0.75 * pour + 0.2 * poolHeat * (1 - eb), gB = Math.pow(mouldHeat, 1.5) * sm(0.1, 0.16, p);
      const gw = gA + gB + 1e-6;
      U.uGlowP.value.set(lerp(M.basin.x, M.ring.x, gB / gw), 0, 4);
      heatColor(gB > gA ? mouldHeat : 1, U.uGlowC.value).multiplyScalar((light ? 0.1 : 0.16) * Math.min(1, gw));
      /* -------- the camera -------- */
      if (K) {
        let i = 0;
        while (i < SHOTS.length - 2 && p > SHOTS[i + 1].at) i++;
        const a = SHOTS[i], b = SHOTS[i + 1], w = sr(a.at, b.at, p);
        const t = tmp.copy(K[a.k].t).lerp(K[b.k].t, w);
        const D = Math.exp(lerp(Math.log(K[a.k].D * a.dolly), Math.log(K[b.k].D * b.dolly), w));
        dir.copy(DIRS[a.k]).lerp(DIRS[b.k], w).normalize();
        cam.position.copy(t).addScaledVector(dir, D);
        cam.near = Math.max(4, D - 260); cam.far = D + 600;
        cam.lookAt(t);
        cam.updateProjectionMatrix();
      }
      scene.updateMatrixWorld();
      /* -------- the shimmer of hot air, in screen space -------- */
      const H = post.U.hot.value, sh = red ? 0 : 1;
      const setHot = function (i, x, y, z, rad, s) {
        const v = tmp2.set(x, y, z).project(cam);
        const dist = Math.max(1, cam.position.distanceTo(tmp.set(x, y, z)));
        H[i].set((v.x + 1) / 2, (v.y + 1) / 2, rad / (2 * dist * Math.tan(cam.fov * DEG / 2)), s * sh);
      };
      setHot(0, ccx, level + 6, ccz, 15, 0.9 * poolHeat * (1 - eb) * (pourG.visible ? 1 : 0));
      setHot(1, M.basin.x, M.top + 4, 0, 10, pour);
      setHot(2, M.ring.x, M.top + 5, 0, 15, Math.pow(mouldHeat, 1.2) * sm(0.18, 0.26, p));
      setHot(3, (M.feed[0] + M.feed[1]) / 2, M.top + 3, 0, 9, Math.pow(mouldHeat, 1.4) * fC * 0.7);
      post.U.time.value = U.uTime.value;
      /* -------- glints on the polished ring: where its curve mirrors the key light into the eye -------- */
      const gOn = pol * sm(0.8, 0.86, p);
      if (gOn > 0.01) {
        ring.updateMatrixWorld(true);
        nm.getNormalMatrix(ring.matrixWorld);
        const best = [null, null], bs = [0, 0];
        let bestRest = null, br = 0;
        glintCands.forEach(function (c) {
          const wp = c.w.copy(c.p).applyMatrix4(ring.matrixWorld);
          const n = tmp2.copy(c.n).applyMatrix3(nm).normalize();
          const v = vv.subVectors(cam.position, wp).normalize();
          const f = n.dot(v);
          if (f < 0.15) return;
          const r = n.multiplyScalar(2 * f).sub(v);
          const s0 = Math.max(0, r.dot(keyDir));
          const s = Math.pow(s0, 70) * Math.min(1, (f - 0.15) * 3);
          if (s > bs[0]) { bs[1] = bs[0]; best[1] = best[0]; bs[0] = s; best[0] = wp; }
          else if (s > bs[1] && best[0] && best[0].distanceTo(wp) > 6) { bs[1] = s; best[1] = wp; }
          const rs = Math.pow(s0, 6) * f;
          if (rs > br) { br = rs; bestRest = wp; }
        });
        // at rest (the end of the scroll) the best-placed point keeps a quiet star
        const rest = sm(0.955, 1, p);
        for (let i = 0; i < 2; i++) {
          let a = Math.min(1, bs[i] * 1.6) * gOn, at = best[i], size = 3.2 + 3.4 * Math.min(1, bs[i]);
          if (i === 0 && bestRest && rest * 0.6 * Math.pow(br, 0.5) > a) { a = rest * 0.6 * Math.pow(br, 0.5); at = bestRest; size = 4.2; }
          stars.set(i, at, size, a, 0.25 + i * 0.5 + p * 1.2);
        }
      } else stars.hide();
      W.dirty = false;
    };

    /* the hot metal moves on its own while it is hot (and motion is allowed) */
    W.alive = function () { return !AU.reduced && W.p < T.cool[1] - 0.01 && !W.disposed; };
    W.update = function (dt) {
      const live = W.alive();
      if (live) U.uTime.value += Math.min(dt, 0.05);
      if (live || W.dirty) W.apply();
      return live;
    };
    // (nothing is drawn until every program is compiled and every buffer is on the GPU: a first draw would do both at
    // once, in one long task)
    W.draw = function () { if (W.isReady) post.render(scene, cam); };
    W.dispose = function () {
      if (W.disposed) return;
      W.disposed = true;
      post.dispose();
      [clay, graphite, depthOnly, metalBasin, metalBar, metalRing, pool.material, stream.material, sparks.material, bench.material].forEach(function (m) { m.dispose(); });
      stream.geometry.dispose(); sparks.geometry.dispose();
      landGlow.material.dispose(); glowTex.dispose();
      stars.dispose();
      AUSB.envDispose(R);
    };
    W.debug = function () { return { U: U, post: post, scene: scene, cam: cam, renderer: R, K: K, p: W.p, stars: stars, mouldMs: FK.mouldMs, timing: timing }; };

    /* ---------------- getting ready: the mould's meshes and the room, then every program, then the buffers ---------------- */
    W.resize(window.innerWidth, window.innerHeight, AUSB.pixelRatio(window.innerWidth, window.innerHeight, STAGE_O()));
    W.ready = Promise.all([
      FK.mould().then(function (g) { timing.mould = Math.round(performance.now() - T0); return g; }),
      W.loadEnv(W.mode).then(function (t) { timing.env = Math.round(performance.now() - T0); return t; })
    ]).then(function (r) {
      if (W.disposed) throw new Error('disposed');
      const tc = performance.now();
      const g = r[0];
      const mL = new THREE.Mesh(g.left, graphite), mR = new THREE.Mesh(g.right, graphite);
      const zL = new THREE.Mesh(g.left, depthOnly), zR = new THREE.Mesh(g.right, depthOnly);
      zL.renderOrder = zR.renderOrder = 1; mL.renderOrder = mR.renderOrder = 2;
      zL.visible = zR.visible = false;
      mouldL.add(zL, mL); mouldR.add(zR, mR);
      mouldMeshes = [mL, mR];
      prepass = [zL, zR];
      W.useEnv(envs[W.mode] && envs[W.mode].t || r[1]);
      W.apply();
      // every program, in the state it is drawn in (the scene into the linear target, the passes into theirs; three
      // compiles only what is visible, so everything is shown for it)
      const vis = [];
      scene.traverse(function (x) { if ((x.isMesh || x.isPoints || x.isSprite) && !x.visible) { x.visible = true; vis.push(x); } });
      const prev = R.getRenderTarget();
      R.setRenderTarget(post.main);
      const pc = AUSB.compile(R, scene, cam, scene);
      R.setRenderTarget(prev);
      vis.forEach(function (x) { x.visible = false; });
      W.apply();
      const pp = post.compile();
      timing.compileSync = Math.round(performance.now() - tc);
      return Promise.all([pc, pp]);
    }).then(function () {
      if (W.disposed) throw new Error('disposed');
      timing.compiled = Math.round(performance.now() - T0);
      // the big buffers go to the GPU a mesh per idle slice (into the linear target, like the real frames)
      return AUSB.upload(R, scene, cam, mouldMeshes.concat([cruMesh, ring, bar, basinDisc, pool, bench]), false, post.main);
    }).then(function () {
      if (W.disposed) throw new Error('disposed');
      timing.uploaded = Math.round(performance.now() - T0);
      W.isReady = true;
      W.dirty = true;
      return W;
    });
    W.ready.catch(function (e) { if (!W.disposed) console.error('[Aurelia GL] forge failed', e); });
  }

  /* the world prepared ahead for the atelier page (one at a time; thrown away when the page is left unused) */
  let warmW = null, live = 0;
  const warm = function () {
    if (warmW || live || !window.AUGL) return;
    const onPage = function () { const c = AU.router && AU.router.current; return !warmW && !live && c && (c.name === 'atelier' || c.path === '/atelier'); };
    // integrator: two idle slices (the shared geometry, then the renderer and the scene); in one they ran ~55 ms
    AUSB.later(function () {
      if (!onPage()) return;
      try { getParts(); } catch (e) { /* made again by the world, and reported there */ }
      AUSB.later(function () {
        if (!onPage()) return;
        try { warmW = new World(AUSB.mode()); } catch (e) { console.error('[Aurelia GL] forge prepare', e); warmW = null; }
      }, 1500);
    }, 1500);
  };
  const drop = function () {
    if (!warmW) return;
    const w = warmW; warmW = null;
    w.dispose();
    try { w.R.dispose(); w.R.forceContextLoss(); } catch (e) { /* ignore */ }
  };

  function forge(container, o) {
    o = o || {};
    const t0 = performance.now(), adopted = !!warmW;
    const W = warmW || new World(AUSB.mode());
    warmW = null;
    W.timing.adopted = adopted;
    const so = STAGE_O();
    so.label = o.label; so.renderer = W.R; so.scene = W.scene; so.camera = W.cam;
    const st = new AUSB.Stage(container, so);
    const cv = st.canvas;
    cv.style.pointerEvents = 'none';
    st.onResize = function (w, h) { W.resize(w, h); };
    st.update = function (t, dt) { return W.update(dt); };
    st.draw = function () { W.draw(); };
    if (W.mode !== st.mode) W.dirty = true;
    const setMode = function (m, fade) {
      W.mode = m;
      return W.loadEnv(m).then(function (t) {
        if (st.disposed || W.mode !== m) return;
        if (fade) st.snapshot(0.7);
        W.useEnv(t);
        st.invalidate();
      });
    };
    st.onMode = function (m) { setMode(m, true); };
    st.onRestore = function () { W.resetEnv(); setMode(st.mode, false); };
    live++;
    st.cleanup = function () { live = Math.max(0, live - 1); W.dispose(); };
    const ready = W.ready.then(function () {
      if (st.disposed) return;
      if (W.mode !== st.mode) return setMode(st.mode, false);
    }).then(function () {
      if (st.disposed) return;
      W.timing.shown = Math.round(performance.now() - t0);
      st.resize();
      W.apply();
      st.invalidate();
      // the canvas fades in once its first frame is on it
      requestAnimationFrame(function () { if (!st.disposed) st.show(); });
      // the other room, for a mode switch later
      AUSB.later(function () { if (!st.disposed) W.loadEnv(W.mode === 'light' ? 'dark' : 'light'); }, 2500);
    });
    ready.catch(function () { /* reported by the world */ });

    return AUSB._forge = {
      canvas: cv,
      ready: ready,
      phases: PHASES,
      setProgress: function (v) {
        v = clamp(+v || 0, 0, 1);
        if (Math.abs(v - W.p) < 1e-5) return;
        W.p = v; W.dirty = true;
        st.invalidate();
      },
      pause: function () { st.paused = true; st.sleep(); },
      resume: function () { st.paused = false; st.invalidate(); },
      dispose: function () { st.dispose(); },
      _stage: st,
      _world: W,
      _debug: function () { return W.debug(); }
    };
  }
  AUSB.methods.forge = function (container, o) { return forge(container, o); };

  /* prepare the world as soon as the atelier page is open (after the engine is up); drop it if the page is left unused */
  if (AU.on) {
    AU.on('route', function (r) {
      if (r && (r.name === 'atelier' || r.path === '/atelier')) warm();
      else drop();
    });
    AU.on('gl', function (api) { const c = AU.router && AU.router.current; if (api && c && (c.name === 'atelier' || c.path === '/atelier')) warm(); });
  }
}

/* ---- 90-tryon.js ---- */
/* ---- AUGL.tryOn(container, { spec, label, onStatus, signal }) -> Promise<{ setSpec, photo, dispose }>   (tryon area)
   The camera mirror: the visitor's own (mirrored) camera image fills the container, and over it a transparent canvas
   draws the piece with the engine's own builders, materials and jeweller's lightbox, worn on the hand that MediaPipe's
   hand landmarker finds: a ring on the ring finger (between landmarks 13 and 14, oriented along the finger, its stone
   on the back of the hand, sized to the finger), a bracelet at the wrist (landmark 0, oriented by the palm). An
   invisible occluder (the finger, the wrist) hides the back of the band, a soft contact shade grounds it on the skin,
   and the pose is smoothed with one-euro filters plus a short render-side ease, so it neither jitters nor lags.
   Rejects with Error('camera' | 'model' | 'unsupported') (err.reason = the browser's error name, when there is one),
   or Error('aborted') when o.signal aborts first. onStatus(state): 'camera' → 'model' → 'searching' ⇄ 'tracking',
   'ended' if the camera stops. The tracker is loaded lazily, once per page (MediaPipe Tasks Vision from jsdelivr,
   the model from assets/models/, or Google's copy when the page has no assets folder next to it). ---- */
{
  const TRY_MP_VER = '0.10.14';
  const TRY_MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + TRY_MP_VER + '/vision_bundle.mjs';
  const TRY_MP_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + TRY_MP_VER + '/wasm';
  const TRY_MODEL = '/aurelia-showcase/assets/models/hand_landmarker.task';
  const TRY_MODEL_REMOTE = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const TRY_FOV = 38;
  const V3 = THREE.Vector3;

  const tryErr = function (code, cause) {
    const e = new Error(code);
    e.code = code;
    if (cause) { e.cause = cause; e.reason = (cause && cause.name) || ''; }
    return e;
  };

  /* ---------------- the tracker: one per page, kept between sessions ---------------- */
  let tryTracker = null, tryDelegate = '';
  const tryFetchModel = function () {
    const get = function (url) {
      return fetch(url, { cache: 'force-cache' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      }).then(function (b) { if (b.byteLength < 100000) throw new Error('model too small'); return new Uint8Array(b); });
    };
    let local;
    try { local = new URL(TRY_MODEL, document.baseURI).href; } catch (e) { local = TRY_MODEL; }
    // integrator: a page opened from disk (file://) cannot fetch files next to it (the browser blocks it with a
    // console error), so it goes straight to Google's copy
    if (/^file:/.test(local) || location.protocol === 'file:') return get(TRY_MODEL_REMOTE);
    return get(local).catch(function () { return get(TRY_MODEL_REMOTE); });
  };
  /* integrator: MediaPipe's native code prints its own info and warning lines (glog format, e.g. "W1004 18:16:17.34
     … gl_context.cc:1060] OpenGL error checking is disabled") to the console. They say nothing to a visitor, so those
     two levels are let through no further; its errors (E…) and everything else still reach the console. */
  let tryQuiet = false;
  const tryQuietLogs = function () {
    if (tryQuiet) return;
    tryQuiet = true;
    const GLOG = /^[IW]\d{4} \d\d:\d\d:\d\d\.\d+\s+\d+\s+\S+:\d+\]/;
    ['log', 'info', 'warn'].forEach(function (k) {
      const orig = console[k];
      if (typeof orig !== 'function') return;
      console[k] = function (a) { if (typeof a === 'string' && GLOG.test(a)) return; return orig.apply(console, arguments); };
    });
  };
  const tryLoadTracker = function () {
    if (tryTracker) return tryTracker;
    tryQuietLogs();
    tryTracker = Promise.all([import(/* @vite-ignore */ TRY_MP_URL), tryFetchModel()]).then(function (r) {
      const mp = r[0], buf = r[1];
      return mp.FilesetResolver.forVisionTasks(TRY_MP_WASM).then(function (files) {
        const make = function (delegate) {
          return mp.HandLandmarker.createFromOptions(files, {
            baseOptions: { modelAssetBuffer: buf.slice(), delegate: delegate },
            runningMode: 'VIDEO', numHands: 1,
            minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5
          }).then(function (h) { tryDelegate = delegate; return h; });
        };
        return make('GPU').catch(function () { return make('CPU'); });
      });
    });
    tryTracker.catch(function () { tryTracker = null; });   // a later attempt may succeed (a dropped connection)
    return tryTracker;
  };

  const tryOpenCamera = function () {
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) return Promise.reject(tryErr('unsupported'));
    return md.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 60 } }
    }).catch(function (e) {
      throw tryErr(e && (e.name === 'NotSupportedError' || e.name === 'TypeError') ? 'unsupported' : 'camera', e);
    });
  };
  const tryStop = function (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ignore */ } };

  /* ---------------- one-euro filter (Casiez et al.): steady when still, quick when moving ---------------- */
  function TryEuro(minCut, beta, dCut) { this.mc = minCut; this.b = beta; this.dc = dCut || 1; this.x = null; this.dx = 0; this.t = 0; }
  TryEuro.prototype.alpha = function (dt, fc) { const tau = 1 / (2 * Math.PI * fc); return 1 / (1 + tau / dt); };
  TryEuro.prototype.f = function (x, t) {
    if (this.x == null) { this.x = x; this.dx = 0; this.t = t; return x; }
    const dt = Math.max(1e-3, Math.min(0.25, t - this.t));
    this.t = t;
    const d = (x - this.x) / dt;
    this.dx += this.alpha(dt, this.dc) * (d - this.dx);
    this.x += this.alpha(dt, this.mc + this.b * Math.abs(this.dx)) * (x - this.x);
    return this.x;
  };
  TryEuro.prototype.reset = function () { this.x = null; };
  const tryEuroVec = function (n, mc, b) { const fs = []; for (let i = 0; i < n; i++) fs.push(new TryEuro(mc, b)); return fs; };

  /* ---------------- pieces made for the wrist and the mirror ---------------- */
  /* the catalogue's tennis bracelet lies flat on the table; on a wrist it must stand round, so the mirror builds its
     own: a line of round diamonds in four-bead collets on a supple oval, linked underneath (same kit, same materials) */
  const tryTennis = function (spec) {
    const ctx = glCtx(spec, { detail: 'studio', lod: 1 });
    const g = new THREE.Group();
    const a = 30.5, b = 23, W = Math.max(2.4, Math.min(3.6, KIT.size('round', spec.carat || 0.1).width));
    const S = 720, raw = [], cum = [0];
    for (let i = 0; i <= S; i++) { const th = i / S * G_TAU; raw.push(new V3(Math.cos(th) * a, Math.sin(th) * b, 0)); }
    for (let i = 1; i <= S; i++) cum.push(cum[i - 1] + raw[i].distanceTo(raw[i - 1]));
    const L = cum[S], n = Math.max(24, Math.round(L / (W * 1.32)));
    const at = function (s) {
      s = ((s % L) + L) % L;
      let lo = 0, hi = S;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m; else hi = m; }
      const k = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
      const th = (lo + k) / S * G_TAU;
      return { p: new V3(Math.cos(th) * a, Math.sin(th) * b, 0), n: new V3(Math.cos(th) * b, Math.sin(th) * a, 0).normalize(), t: new V3(-Math.sin(th) * a, Math.cos(th) * b, 0).normalize() };
    };
    const gemM = [], cupM = [], beadP = [], linkM = [];
    const seat = 0.55, cupH = W * 0.5, girdle = seat + cupH + 0.05;
    for (let i = 0; i < n; i++) {
      const f = at((i + 0.5) / n * L);
      const q = new THREE.Quaternion().setFromUnitVectors(G_UP, f.n);
      gemM.push(KIT.m4(f.p.clone().addScaledVector(f.n, girdle), q));
      cupM.push(KIT.m4(f.p.clone().addScaledVector(f.n, seat + cupH / 2), q, new V3(W * 0.5, cupH, W * 0.5)));
      // four beads grip the girdle, set on the diagonals so the line reads as a row of little squares of light
      for (let k = 0; k < 4; k++) {
        const az = Math.PI / 4 + k * Math.PI / 2;
        const off = new V3(Math.cos(az) * W * 0.5, 0.12, Math.sin(az) * W * 0.5).applyQuaternion(q);
        beadP.push(f.p.clone().addScaledVector(f.n, girdle).add(off));
      }
      // the link to the next collet, low under the stones
      const f2 = at((i + 1) / n * L);
      const mid = f2.p.clone().addScaledVector(f2.n, seat + 0.45);
      linkM.push(KIT.m4(mid, new THREE.Quaternion().setFromUnitVectors(G_UP, f2.t), new V3(0.5, W * 0.62, 0.5)));
    }
    g.add(ctx.gems({ stone: spec.stone || 'diamond', width: W, matrices: gemM, cut: W > 3 ? 'round' : 'melee' }));
    g.add(ctx.instanced(KIT.unit('cylinder'), ctx.metal(), cupM));
    g.add(ctx.instanced(KIT.unit('cylinder'), ctx.metal(), linkM));
    g.add(ctx.beads(beadP, 0.36));
    const rail = [];
    for (let i = 0; i < 96; i++) { const f = at(i / 96 * L); rail.push(f.p.clone().addScaledVector(f.n, seat + 0.3)); }
    g.add(ctx.mesh(KIT.loop(rail, 0.42, { radial: 10, segments: 400 })));
    g.updateMatrixWorld(true);
    return { spec: spec, object: g, glints: ctx._glints, dispose: function () { ctx._dispose(g); } };
  };

  /* fit data for a piece: where it sits and how big it is in millimetres */
  const tryBuild = function (raw) {
    const spec = KIT.spec(raw);
    const wrist = spec.type === 'bracelet';
    const built = wrist && spec.style === 'tennis' ? tryTennis(spec) : glBuildPiece(spec, { detail: 'studio' });
    const box = new THREE.Box3().setFromObject(built.object);
    const c = box.getCenter(new V3());
    const fit = { wrist: wrist };
    if (wrist) {
      // the oval stands round the forearm axis (Z), wide side across the back of the wrist
      fit.center = new V3(c.x, c.y, c.z);
      fit.innerX = Math.max(40, (box.max.x - box.min.x) - 5.4);
      fit.innerY = Math.max(32, (box.max.y - box.min.y) - 5.4);
      fit.halfW = Math.max(1.4, (box.max.z - box.min.z) / 2);
    } else {
      fit.center = new V3(0, 0, 0);                    // rings are built round their band's centre
      fit.inner = KIT.ringInner(spec.size);
      // the band's half width: the lower half of a ring is band only, whatever its head does
      let hz = 0.9;
      const m = glMeasure(built.object);
      m.points.forEach(function (p) { if (p.y < -fit.inner * 0.4 && Math.abs(p.z) > hz) hz = Math.abs(p.z); });
      fit.halfW = Math.min(3.2, hz);
    }
    return { spec: spec, built: built, fit: fit };
  };

  /* a soft contact shade on the skin just beyond the band's edges (ambient occlusion where metal meets skin); it
     fades toward the silhouette, so it never draws a line round the finger */
  const tryShadeMaterial = function () {
    return new THREE.ShaderMaterial({
      uniforms: { uHalf: { value: 1.2 }, uSpread: { value: 1.6 }, uAlpha: { value: 0 }, uK: { value: 0.32 } },
      vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uHalf; uniform float uSpread; uniform float uAlpha; uniform float uK; varying vec3 vP; varying vec3 vN; varying vec3 vV;' +
        'void main(){ float z = abs(vP.z) - uHalf; float a = z < 0.0 ? smoothstep(-0.25, 0.0, z) : 1.0 - smoothstep(0.0, uSpread, z);' +
        ' a *= pow(clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0), 1.6);' +
        ' gl_FragColor = vec4(0.0, 0.0, 0.0, a * uK * uAlpha); }',
      transparent: true, depthWrite: false, depthTest: true
    });
  };

  /* ---------------- the mirror ---------------- */
  function glTryOn(container, o) {
    o = o || {};
    const onStatus = typeof o.onStatus === 'function' ? o.onStatus : function () {};
    const signal = o.signal || null;
    if (typeof WebAssembly !== 'object' || (!window.isSecureContext && location.protocol !== 'file:') ||
        !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(tryErr('unsupported'));
    if (typeof glBuildPiece !== 'function' || typeof glRenderer !== 'function' || typeof glEnvFor !== 'function') return Promise.reject(tryErr('unsupported'));

    let stream = null;
    const aborted = function () { return !!(signal && signal.aborted); };
    const bail = function (e) { if (stream) tryStop(stream); stream = null; throw e; };

    onStatus('camera');
    const trackerP = tryLoadTracker();
    trackerP.catch(function () { /* reported below */ });

    return tryOpenCamera().then(function (s) {
      stream = s;
      if (aborted()) throw tryErr('aborted');
      onStatus('model');
      return trackerP.catch(function (e) { throw tryErr('model', e); });
    }).then(function (tracker) {
      if (aborted()) throw tryErr('aborted');
      return tryMirror(container, o, stream, tracker, onStatus, signal);
    }).catch(bail);
  }

  function tryMirror(container, o, stream, tracker, onStatus, signal) {
    try { if (getComputedStyle(container).position === 'static') container.style.position = 'relative'; } catch (e) { /* ignore */ }
    const video = document.createElement('video');
    video.className = 'augl-tryon-video';
    video.setAttribute('playsinline', ''); video.setAttribute('muted', ''); video.setAttribute('aria-hidden', 'true');
    video.playsInline = true; video.muted = true; video.autoplay = true;
    video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block;';
    video.srcObject = stream;
    container.appendChild(video);

    const firstFrame = new Promise(function (res, rej) {
      let done = false;
      const ok = function () { if (!done && video.videoWidth > 0) { done = true; res(); } };
      video.addEventListener('loadeddata', ok);
      video.addEventListener('playing', ok);
      const p = video.play();
      if (p && p.catch) p.catch(function () { /* muted inline video may still start on its own */ });
      setTimeout(function () { if (!done) { done = true; rej(tryErr('camera', { name: 'NoFrames' })); } }, 9000);
      ok();
    });

    return firstFrame.then(function () {
      if (signal && signal.aborted) throw tryErr('aborted');
      return tryStage(container, o, stream, video, tracker, onStatus);
    }).catch(function (e) { video.srcObject = null; video.remove(); throw e; });
  }

  function tryStage(container, o, stream, video, tracker, onStatus) {
    const canvas = document.createElement('canvas');
    canvas.className = 'augl-canvas augl-canvas--tryon';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', o.label || 'The piece, worn on your hand in the camera image');
    container.appendChild(canvas);

    const renderer = glRenderer(canvas, false);
    const dprCap = (KIT.tier && KIT.tier.dprCap) || 2;
    renderer.setPixelRatio(Math.min(dprCap, window.devicePixelRatio || 1));
    renderer.toneMappingExposure = 1.08;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(TRY_FOV, 1, 1, 100000);
    // the jeweller's lightbox (or another of the engine's rooms, o.light), made in idle slices where the engine can
    let env = null;
    const envReady = (typeof glEnvAsync === 'function' ? glEnvAsync(renderer, o.light || 'studio', 'dark')
      : Promise.resolve().then(function () { return glEnvFor(renderer, 'dark'); })).then(function (t) { env = t; scene.environment = t; });

    const anchor = new THREE.Group();
    anchor.matrixAutoUpdate = false;
    anchor.visible = false;
    scene.add(anchor);

    // the finger (or wrist) that hides the back of the band: depth only, drawn first
    const occMat = new THREE.MeshBasicMaterial({ colorWrite: false });
    const occ = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48, 1, false), occMat);
    occ.geometry.rotateX(Math.PI / 2);                 // along Z, like the piece's axis
    occ.renderOrder = -10;
    anchor.add(occ);
    const shadeMat = tryShadeMaterial();
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64, 8, true), shadeMat);
    shade.geometry.rotateX(Math.PI / 2);
    shade.renderOrder = -5;
    anchor.add(shade);

    const S = {
      W: 1, H: 1, Z0: 1, disposed: false,
      cur: null, next: null, alpha: 0, want: 0, present: false, lastSeen: -1, lastDet: -1,
      pos: new V3(), quat: new THREE.Quaternion(), k: 1, tPos: new V3(), tQuat: new THREE.Quaternion(), tK: 1, snap: true,
      sign: 0, signVotes: 0, status: '', frames: 0, detections: 0, hands: 0, detMs: 0, lastVT: -1, rvfc: 0, raf: 0,
      inject: null
    };
    const fPos = tryEuroVec(2, 1.1, 0.012), fK = new TryEuro(0.7, 0.004), fZ = tryEuroVec(3, 1.2, 0.35), fY = tryEuroVec(3, 1.0, 0.3);
    const resetFilters = function () { fPos.concat(fZ, fY, [fK]).forEach(function (f) { f.reset(); }); };
    const setStatus = function (s) { if (s !== S.status) { S.status = s; try { onStatus(s); } catch (e) { console.error(e); } } };

    const resize = function () {
      const w = Math.max(1, Math.round(container.clientWidth)), h = Math.max(1, Math.round(container.clientHeight));
      if (w === S.W && h === S.H) return;
      S.W = w; S.H = h;
      renderer.setPixelRatio(Math.min(dprCap, window.devicePixelRatio || 1));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      S.Z0 = (h / 2) / Math.tan(THREE.MathUtils.degToRad(TRY_FOV) / 2);   // 1 px = 1 unit on the plane z = -Z0
      camera.near = S.Z0 * 0.2; camera.far = S.Z0 * 4;
      camera.updateProjectionMatrix();
      S.snap = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    /* the video's frame on screen (object-fit: cover, mirrored) */
    const cover = function () {
      const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
      const s = Math.max(S.W / vw, S.H / vh);
      return { dw: vw * s, dh: vh * s, ox: (S.W - vw * s) / 2, oy: (S.H - vh * s) / 2 };
    };

    /* a hand → the target pose of the piece */
    const tmpA = new V3(), tmpB = new V3(), tmpC = new V3(), tmpD = new V3();
    const poseFrom = function (lm, label, score, t) {
      const cv = cover();
      const P = function (i, out) {
        const l = lm[i];
        return (out || new V3()).set((1 - l.x) * cv.dw + cv.ox - S.W / 2, S.H / 2 - (l.y * cv.dh + cv.oy), -(l.z || 0) * cv.dw);
      };
      const p0 = P(0), p5 = P(5), p9 = P(9), p13 = P(13), p14 = P(14), p17 = P(17);
      // which side is the back of the hand: the hand's chirality decides the sign of the palm normal. The tracker is fed
      // the camera's own (unmirrored) frames and reports the hand's true side (checked with the porcelain hand in
      // tools/tryon-test.js: a left hand is labelled 'Left'); on this mirrored screen a left hand has the shape of a
      // right one, whose back is (pinky - index) x (wrist -> middle). The sign only changes after a run of confident frames.
      const want = label === 'Left' ? 1 : -1;
      if (!S.sign) S.sign = want;
      else if (want !== S.sign && score > 0.7) { if (++S.signVotes > 8) { S.sign = want; S.signVotes = 0; } }
      else S.signVotes = 0;
      const dorsal = tmpA.subVectors(p17, p5).cross(tmpB.subVectors(p9, p0)).normalize().multiplyScalar(S.sign);
      const r2 = function (v) { return [v.x, v.y, v.z].map(function (n) { return Math.round(n * 100) / 100; }); };
      S.dbg = { label: label, score: Math.round(score * 100) / 100, sign: S.sign, dorsal: r2(dorsal) };
      const fit = S.cur ? S.cur.fit : null;
      const wrist = !!(fit && fit.wrist);
      let axis, at, widthPx;
      const palm = p5.distanceTo(p17);
      if (wrist) {
        axis = tmpC.subVectors(p9, p0).normalize();
        at = p0.clone().addScaledVector(tmpD.subVectors(p0, p9), 0.16);
        const estW = [palm * 0.8, p0.distanceTo(p9) * 0.62, p5.distanceTo(p0) * 0.62].sort(function (a, b) { return a - b; });
        widthPx = estW[1];
      } else {
        axis = tmpC.subVectors(p14, p13).normalize();
        at = p13.clone().lerp(p14, 0.5);
        // three estimates of the finger's width (from the palm's breadth, the knuckle spacing and the finger bone),
        // each fooled by a different pose or build of hand: the middle one is kept
        const est = [palm * 0.245, p9.distanceTo(p13) * 0.88, p13.distanceTo(p14) * 0.58].sort(function (a, b) { return a - b; });
        widthPx = est[1];
      }
      let Y = dorsal.clone().addScaledVector(axis, -dorsal.dot(axis));
      if (Y.lengthSq() < 1e-6) return false;
      Y.normalize();
      // the tracker's depth is its least certain axis: while the back of the hand faces the camera, the piece's top is
      // drawn part way toward the viewer, so the stone sits on top of the finger instead of wandering round its side
      if (Y.z > 0) {
        Y.z += 0.55 * Y.z;
        Y.addScaledVector(axis, -Y.dot(axis));
        if (Y.lengthSq() < 1e-6) return false;
        Y.normalize();
      }
      // smooth the frame in its own terms: position, size, and the two axes (re-orthonormalised afterwards)
      const ax = [fZ[0].f(axis.x, t), fZ[1].f(axis.y, t), fZ[2].f(axis.z, t)];
      const ay = [fY[0].f(Y.x, t), fY[1].f(Y.y, t), fY[2].f(Y.z, t)];
      const Z = new V3(ax[0], ax[1], ax[2]).normalize();
      const Yf = new V3(ay[0], ay[1], ay[2]);
      Yf.addScaledVector(Z, -Yf.dot(Z)).normalize();
      const X = new V3().crossVectors(Yf, Z);
      S.tQuat.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Yf, Z));
      S.tPos.set(fPos[0].f(at.x, t), fPos[1].f(at.y, t), -S.Z0);
      const innerMM = wrist ? fit.innerX : (fit ? fit.inner : 8.25) * 2;
      const kRaw = widthPx * (wrist ? 1.1 : 1.0) / innerMM;
      S.tK = Math.max(0.05, fK.f(kRaw, t));
      return true;
    };

    /* the occluder and the contact shade follow the piece that is on */
    const fitOccluder = function (fit) {
      if (fit.wrist) {
        occ.scale.set(fit.innerX / 2 * 0.93, fit.innerY / 2 * 0.86, 110);
        shade.scale.set(fit.innerX / 2 * 0.95, fit.innerY / 2 * 0.88, fit.halfW * 2 + 14);
        shadeMat.uniforms.uHalf.value = fit.halfW / (fit.halfW * 2 + 14);
        shadeMat.uniforms.uSpread.value = 3.2 / (fit.halfW * 2 + 14);
        shadeMat.uniforms.uK.value = 0.26;
      } else {
        const r = fit.inner * 0.985;
        occ.scale.set(r, r, fit.inner * 7);
        shade.scale.set(fit.inner * 1.005, fit.inner * 1.005, fit.halfW * 2 + 7);
        shadeMat.uniforms.uHalf.value = fit.halfW / (fit.halfW * 2 + 7);
        shadeMat.uniforms.uSpread.value = 1.7 / (fit.halfW * 2 + 7);
        shadeMat.uniforms.uK.value = 0.34;
      }
      // the shade's geometry runs -0.5..0.5 along Z, scaled: uHalf / uSpread are in those units
    };

    /* pieces: built off the critical path, compiled asynchronously, then crossfaded */
    const mats = function (root) {
      const list = [];
      root.traverse(function (x) {
        if (!x.material) return;
        (Array.isArray(x.material) ? x.material : [x.material]).forEach(function (m) {
          if (list.indexOf(m) >= 0) return;
          m.userData.auOpacity = m.opacity; m.transparent = true; list.push(m);
        });
      });
      return list;
    };
    const setAlpha = function (piece, a) {
      if (piece.shown === a) return;
      piece.shown = a;
      piece.group.visible = a > 0.002;
      piece.mats.forEach(function (m) {
        if (m.uniforms && m.uniforms.uOpacity) m.uniforms.uOpacity.value = a;
        else m.opacity = (m.userData.auOpacity == null ? 1 : m.userData.auOpacity) * a;
      });
    };
    let queue = Promise.resolve();
    const setSpec = function (raw) {
      queue = queue.then(function () {
        if (S.disposed) return null;
        // the build is the heavy step: it runs in its own idle slice where the engine offers one
        const build = function () { try { return tryBuild(raw || {}); } catch (e) { console.error('[Aurelia GL] try-on build failed', e); return null; } };
        return typeof glIdle === 'function' ? glIdle(build, 30) : build();
      }).then(function (made) {
        if (!made) return;
        if (S.disposed) { made.built.dispose(); return; }
        const group = new THREE.Group();
        const holder = new THREE.Group();
        holder.position.copy(made.fit.center).negate();
        holder.add(made.built.object);
        group.add(holder);
        const piece = { spec: made.spec, fit: made.fit, built: made.built, group: group, mats: mats(made.built.object), fade: 0, shown: -1 };
        setAlpha(piece, 0);
        anchor.add(group);
        let ready = Promise.resolve();
        try { if (renderer.compileAsync) ready = renderer.compileAsync(group, camera, scene).catch(function () { /* draw anyway */ }); } catch (e) { /* ignore */ }
        return ready.then(function () {
          if (S.disposed) { anchor.remove(group); made.built.dispose(); return; }
          // a piece still fading out from an earlier switch goes at once; the current one fades out under the new one
          if (S.old) { anchor.remove(S.old.group); S.old.built.dispose(); S.old = null; }
          if (S.cur) S.old = S.cur;
          S.cur = piece;
          fitOccluder(piece.fit);
          S.snap = !S.present;
          wake();
        });
      }).catch(function (e) { console.error('[Aurelia GL] try-on piece failed', e); });
      return queue;
    };

    /* ---------------- detection: one pass per new camera frame ---------------- */
    const detect = function () {
      if (S.disposed) return;
      const now = performance.now();
      let res = null;
      if (S.inject) { res = S.inject; }
      else if (video.readyState >= 2 && video.currentTime !== S.lastVT) {
        S.lastVT = video.currentTime;
        const t0 = performance.now();
        try { res = tracker.detectForVideo(video, now); }
        catch (e) { if (!S.detErr) console.error('[Aurelia GL] hand tracking failed', e); S.detErr = true; }
        S.detMs = S.detMs * 0.9 + (performance.now() - t0) * 0.1;
        S.detections++;
      }
      if (res) {
        const lms = res.landmarks && res.landmarks[0];
        const hd = (res.handedness || res.handednesses || [])[0];
        const cat = hd && hd[0];
        if (lms && lms.length >= 21 && S.cur) {
          if (!S.present) resetFilters();
          if (poseFrom(lms, cat ? cat.categoryName : 'Right', cat ? cat.score : 1, now / 1000)) {
            S.hands++;
            if (!S.present) S.snap = true;
            S.present = true;
            S.lastSeen = now;
          }
        }
      }
      if (S.present && now - S.lastSeen > 280) S.present = false;
      if (S.present) setStatus('tracking');
      else if (S.lastSeen < 0 || now - S.lastSeen > 700) setStatus('searching');
      wake();
    };
    const scheduleDetect = function () {
      if (S.disposed) return;
      if (video.requestVideoFrameCallback) S.rvfc = video.requestVideoFrameCallback(function () { detect(); scheduleDetect(); });
      else S.raf = requestAnimationFrame(function () { detect(); scheduleDetect(); });
    };
    // a watchdog: if frames stop arriving (a background tab, a stalled camera), the piece still fades out
    const watch = setInterval(function () { if (!S.disposed && S.present && performance.now() - S.lastSeen > 400) { S.present = false; setStatus('searching'); wake(); } }, 250);

    /* ---------------- drawing ---------------- */
    let untick = null;
    const wake = function () { if (!untick && !S.disposed) untick = AU.tick(frame); };
    const m4 = new THREE.Matrix4(), sc = new V3();
    const frame = function (t, dt) {
      if (S.disposed) return;
      S.frames++;
      const reduced = !!AU.reduced;
      let moving = false;
      // presence fade
      S.want = S.present && S.cur ? 1 : 0;
      const fadeK = reduced ? 1 : 1 - Math.exp(-dt * (S.want ? 7 : 9));
      S.alpha += (S.want - S.alpha) * fadeK;
      if (Math.abs(S.want - S.alpha) < 0.002) S.alpha = S.want; else moving = true;
      // piece crossfade
      if (S.cur) {
        S.cur.fade = Math.min(1, S.cur.fade + (reduced ? 1 : dt / 0.45));
        if (S.cur.fade < 1) moving = true;
      }
      if (S.old) {
        S.old.fade = Math.max(0, S.old.fade - (reduced ? 1 : dt / 0.3));
        if (S.old.fade <= 0) { anchor.remove(S.old.group); S.old.built.dispose(); S.old = null; }
        else moving = true;
      }
      // pose: a short, frame-rate independent ease toward the filtered target (snaps on first sight)
      if (S.snap) { S.pos.copy(S.tPos); S.quat.copy(S.tQuat); S.k = S.tK; S.snap = false; }
      else {
        const e = reduced ? 1 : 1 - Math.exp(-dt * 26);
        S.pos.lerp(S.tPos, e); S.quat.slerp(S.tQuat, e); S.k += (S.tK - S.k) * e;
        if (S.pos.distanceToSquared(S.tPos) > 0.01 || Math.abs(S.tK - S.k) > 1e-4 || S.quat.angleTo(S.tQuat) > 1e-3) moving = true;
      }
      anchor.matrix.compose(S.pos, S.quat, sc.set(S.k, S.k, S.k));
      anchor.matrixWorldNeedsUpdate = true;
      anchor.visible = S.alpha > 0.002;
      if (S.cur) setAlpha(S.cur, S.alpha * AU.easeInOut(S.cur.fade));
      if (S.old) setAlpha(S.old, S.alpha * AU.easeInOut(S.old.fade));
      shadeMat.uniforms.uAlpha.value = S.alpha * (S.cur ? S.cur.fade : 0);
      draw();
      if (!moving && !S.present && S.alpha === 0 && !S.old) { if (untick) { untick(); untick = null; } }
      void m4;
    };
    const draw = function () {
      if (!env) return;
      G_ENV.value = env;
      G_ENV_LIGHT.value = 0;
      renderer.render(scene, camera);
    };

    const endT = function () { setStatus('ended'); };
    stream.getVideoTracks().forEach(function (tr) { tr.addEventListener('ended', endT); });
    const onVis = function () { if (document.hidden) { S.present = false; } else wake(); };
    document.addEventListener('visibilitychange', onVis);

    const api = {
      canvas: canvas,
      video: video,
      setSpec: setSpec,
      /* a still of what is on screen: the mirrored camera image with the piece over it, at the screen's crop.
         decorate(ctx2d, w, h) may add a mark; onCanvas(canvas) receives the finished picture at once (to show it
         while the PNG is encoded). Resolves to a PNG Blob. */
      photo: function (opt) {
        opt = opt || {};
        return new Promise(function (res, rej) {
          try {
            const cv = cover(), dpr = Math.min(2, window.devicePixelRatio || 1);
            const scale = Math.min(dpr, 2400 / Math.max(S.W, S.H));
            const w = Math.round(S.W * scale), h = Math.round(S.H * scale);
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const g = c.getContext('2d');
            g.save();
            g.translate(w, 0); g.scale(-1, 1);
            g.drawImage(video, cv.ox * scale, cv.oy * scale, cv.dw * scale, cv.dh * scale);
            g.restore();
            frame(performance.now() / 1000, 0);           // draw now, in this task, so the canvas still holds it
            g.drawImage(canvas, 0, 0, w, h);
            if (opt.decorate) { try { opt.decorate(g, w, h); } catch (e) { /* keep the photo */ } }
            if (opt.onCanvas) { try { opt.onCanvas(c); } catch (e) { /* the blob still comes */ } }
            c.toBlob(function (b) { if (b) res(b); else rej(new Error('photo')); }, 'image/png');
          } catch (e) { rej(e); }
        });
      },
      dispose: function () {
        if (S.disposed) return;
        S.disposed = true;
        if (untick) { untick(); untick = null; }
        clearInterval(watch);
        try { if (S.rvfc && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(S.rvfc); } catch (e) { /* ignore */ }
        cancelAnimationFrame(S.raf);
        document.removeEventListener('visibilitychange', onVis);
        stream.getVideoTracks().forEach(function (tr) { tr.removeEventListener('ended', endT); });
        tryStop(stream);
        try { ro.disconnect(); } catch (e) { /* ignore */ }
        [S.cur, S.old].forEach(function (p) { if (p) { anchor.remove(p.group); p.built.dispose(); } });
        S.cur = S.old = null;
        occ.geometry.dispose(); occMat.dispose(); shade.geometry.dispose(); shadeMat.dispose();
        try { glEnvDispose(renderer); } catch (e) { /* ignore */ }
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) { /* ignore */ }
        video.pause(); video.srcObject = null;
        video.remove(); canvas.remove();
      },
      /* for tests: state of the loop, and a way to feed a hand without a camera */
      _debug: function () {
        return { status: S.status, frames: S.frames, detections: S.detections, hands: S.hands, detMs: Math.round(S.detMs * 10) / 10,
          delegate: tryDelegate, video: [video.videoWidth, video.videoHeight], present: S.present, alpha: Math.round(S.alpha * 1000) / 1000,
          piece: S.cur ? S.cur.spec.type + '/' + S.cur.spec.style : null, hand: S.dbg || null };
      },
      _inject: function (res) { S.inject = res || null; if (!video.requestVideoFrameCallback || video.paused) { detect(); } wake(); }
    };

    // closed while the room or the first piece was still being prepared: everything goes, the camera included
    if (o.signal && o.signal.addEventListener) o.signal.addEventListener('abort', function () { api.dispose(); });
    return envReady.then(function () { return setSpec(o.spec || {}); }).then(function () {
      if (S.disposed) throw tryErr('aborted');
      setStatus('searching');
      scheduleDetect();
      wake();
      return api;
    }).catch(function (e) {
      api.dispose();
      throw e && e.code ? e : tryErr('unsupported', e);
    });
  }

  /* attach to the engine once it has booted (and right away if it already has) */
  const tryAttach = function (api) { if (api && !api.tryOn) api.tryOn = glTryOn; };
  if (window.AUGL) tryAttach(window.AUGL);
  if (AU.on) AU.on('gl', tryAttach);
  if (AU.gl && AU.gl.then) AU.gl.then(tryAttach);
}
