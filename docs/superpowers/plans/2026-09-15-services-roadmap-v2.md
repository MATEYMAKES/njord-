# NJORD Services Roadmap V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace NJORD's static "What We Do" ledger with a scroll-driven procedural ASCII roadmap: the site's one persistent particle organism grows a path between five randomly-placed nodes as you scroll, typing each service's copy in character-by-character.

**Architecture:** A new `roadmap` formation in the existing `AsciiOrganism` class (`ascii-engine.js`), registered as a "ranged" zone spanning the whole Services section's scroll height rather than a single pivot point, driving per-particle path-reveal off a new `seg.localT` value. Node/path layout is randomized once (`Math.random()`, unseeded) at construction and stored as normalized fractions. Service text is real DOM (accessibility), typed in directly from that same scroll progress — no timers, no libraries.

**Tech Stack:** Vanilla JS, Canvas 2D, CSS. No React/Next.js/GSAP (confirmed with user — this project has no build step, single-file Claude Artifact deploy).

**Spec:** `docs/superpowers/specs/2026-09-15-services-roadmap-v2-design.md`

## Global Constraints

- Node order 01→05 fixed; node **x-position** randomized once per page load via `Math.random()` (not `mulberry32`-seeded like every other formation) — must differ on every refresh.
- Desktop node x-band: 18%–82% of section width, min separation 14%. Mobile (`window.innerWidth < 720`, the same threshold used elsewhere in this file) x-band: 38%–62%, min separation 8%.
- No fade-ins. Text reveal is `charsShown = floor(length * clamp01(progress))` driven directly by scroll position every frame — never a CSS transition or `setTimeout` sequence — so it un-types symmetrically on scroll-up.
- The path is the SAME persistent particle pool as every other formation — no second canvas, nothing newly instantiated per scroll.
- Service copy stays real HTML (`t()`-driven from `main.js`, same convention project-modal copy already uses — never `data-i18n` tags, since those would bypass the typewriter and dump full text immediately).
- No git repo exists yet in this project (file + Artifact-publish workflow per `HANDOFF.md`) — Task 1 initializes one, scoped to this project folder only, purely as a safety net for this risky rewrite. Every task ends with a commit.
- No automated test framework exists in this project — "test" steps below are exact `node -e` syntax checks (catches typos/crashes fast, no browser needed) plus manual DevTools verification, matching how every other feature in this codebase has been verified this session.
- Republish via the `Artifact` tool only at the end of Task 8 (or ad hoc if you want to eyeball progress sooner) — republishing every task is unnecessary churn on a private artifact.

---

### Task 1: Git safety net

**Files:**
- Create: `.gitignore` (project root)

**Interfaces:** none (infrastructure only)

- [ ] **Step 1: Initialize the repo and check current status**

```bash
cd "C:\Users\pinkj\ClaudeProjects\njord"
git init
git status
```

- [ ] **Step 2: Add a minimal .gitignore**

```
versions/
```

(The `versions/v1-services/` backup is already a deliberate snapshot outside version control — no need to duplicate it inside git history.)

- [ ] **Step 3: Commit the current (V1) state as the baseline**

```bash
git add -A
git commit -m "Baseline: NJORD before Services V2 roadmap redesign"
```

- [ ] **Step 4: Verify**

```bash
git log --oneline
```
Expected: one commit, working tree clean (`git status` shows nothing to commit).

---

### Task 2: Service content (i18n)

**Files:**
- Modify: `i18n.js` (the `services.01.title`…`services.05.desc` block, and `services.modalEyebrow`)

**Interfaces:**
- Produces: `t('services.01.title')` … `t('services.05.desc')` returning the five new bilingual strings consumed by Task 7's `serviceRoadmapCopy()`.

- [ ] **Step 1: Replace the five services entries and drop the now-unused modal eyebrow key**

In `i18n.js`, replace:
```js
  'services.01.title': { en: 'Web Design', sq: 'Dizajn Web' },
  'services.01.desc': { en: 'Interfaces designed as systems, not templates.', sq: 'Ndërfaqe të projektuara si sisteme, jo si shabllone.' },
  'services.02.title': { en: 'Web Development', sq: 'Zhvillim Web' },
  'services.02.desc': { en: 'Fast, resilient front ends built to hold complex motion.', sq: 'Pjesë të përparme të shpejta dhe të qëndrueshme, ndërtuara për të mbajtur lëvizje komplekse.' },
  'services.03.title': { en: 'Web Hosting and Maintenance', sq: 'Hosting dhe Mirëmbajtje Web' },
  'services.03.desc': {
    en: 'Reliable infrastructure and ongoing care, so a shipped site keeps running the way it launched.',
    sq: 'Infrastrukturë e besueshme dhe kujdes i vazhdueshëm, që një faqe e publikuar të vazhdojë të funksionojë ashtu siç u lançua.',
  },
  'services.04.title': { en: 'Logo Designs', sq: 'Dizajne Logosh' },
  'services.04.desc': { en: 'Marks built to hold up at any size, from a favicon to a storefront.', sq: 'Shenja të ndërtuara për të qëndruar në çdo madhësi, nga një favikon deri te një dyqan.' },
  'services.05.title': { en: 'Brand Guidelines', sq: 'Udhëzime Brendi' },
  'services.05.desc': { en: 'The rules that keep an identity consistent long after we hand it off.', sq: 'Rregullat që mbajnë një identitet të qëndrueshëm gjatë kohës pasi ia dorëzojmë.' },
  'services.modalEyebrow': { en: 'Service', sq: 'Shërbim' },
```
with:
```js
  'services.01.title': { en: 'Branding & Identity', sq: 'Brending & Identitet' },
  'services.01.desc': {
    en: 'A visual identity built to carry a business, not just decorate it.',
    sq: 'Një identitet vizual i ndërtuar për ta mbajtur biznesin, jo vetëm për ta zbukuruar.',
  },
  'services.02.title': { en: 'Website Design & UI/UX', sq: 'Dizajn Webfaqeje & UI/UX' },
  'services.02.desc': {
    en: 'Interfaces designed around how people actually use them.',
    sq: 'Ndërfaqe të dizajnuara sipas mënyrës si njerëzit vërtet i përdorin.',
  },
  'services.03.title': { en: 'Development & Interaction', sq: 'Zhvillim & Ndërveprim' },
  'services.03.desc': {
    en: 'The build underneath — functionality, motion, everything that has to work.',
    sq: 'Ndërtimi nën sipërfaqe — funksionaliteti, lëvizja, gjithçka që duhet të funksionojë.',
  },
  'services.04.title': { en: 'Hosting & Maintenance', sq: 'Hosting & Mirëmbajtje' },
  'services.04.desc': {
    en: 'Hosted on servers in Kosovo, kept fast and stable after launch.',
    sq: 'E hostuar në serverë në Kosovë, e mbajtur e shpejtë dhe stabile pas lansimit.',
  },
  'services.05.title': { en: 'SEO & Ongoing Support', sq: 'SEO & Përkrahje e Vazhdueshme' },
  'services.05.desc': {
    en: 'Optimized to be found, supported long after the handoff.',
    sq: 'E optimizuar për t\'u gjetur, e përkrahur gjatë kohës pas dorëzimit.',
  },
```

- [ ] **Step 2: Verify the file still parses and the keys resolve**

```bash
node -e "
const fs = require('fs');
let src = fs.readFileSync('i18n.js', 'utf8');
src = src.replace(/^export /gm, '');
const module = { exports: {} };
new Function('module', 'exports', src + '\nmodule.exports = { t, getLang };')(module, module.exports);
const { t } = module.exports;
['01','02','03','04','05'].forEach(n => {
  console.log(n, '|', t('services.' + n + '.title', 'en'), '|', t('services.' + n + '.title', 'sq'));
});
"
```
Expected: five lines, each with a non-empty English and Albanian title, no thrown error.

- [ ] **Step 3: Commit**

```bash
git add i18n.js
git commit -m "Replace services copy with V2 roadmap content (EN/SQ)"
```

---

### Task 3: Node & path generation (ascii-engine.js)

**Files:**
- Modify: `ascii-engine.js` — inside `AsciiOrganism`'s constructor (after the existing `jitterSeed`/initial-position block, i.e. right before `this.zones = [];` at the line currently reading `this.zones = [];`)

**Interfaces:**
- Consumes: `this.count` (particle count), `this.isMobile` (both already set earlier in the constructor).
- Produces (read by Task 4 and by `main.js` in Task 7):
  - `this.roadmapNodeCount` — `5`
  - `this.roadmapNodes` — `Array<{x:number,y:number}>` length 5, both fields normalized 0–1
  - `this.roadmapSeeds` — `Array<{x:number,y:number,node:number}>`, `node` is the 0-based node index for seeds that sit exactly on a node, `-1` for connective seeds
  - `this.roadmapU` — `Float32Array(this.count)`, each particle's fixed 0–1 position along the path
  - `this.roadmapDensity` — `Float32Array(this.count)`, each particle's fixed 0–1 "how strong does this connective particle read" value
  - `this._roadmapPointAt(u)` — method, returns `{x,y}` (0–1 space) for a given path position

- [ ] **Step 1: Add the generator method**

Add this new method to the `AsciiOrganism` class (place it directly above `_timelineSegment(){`):

```js
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
```

- [ ] **Step 2: Call it from the constructor**

Find this line (present today near the end of the constructor, right before zone setup):
```js
    this.zones = [];
```
Change it to:
```js
    this._generateRoadmapLayout();

    this.zones = [];
```

- [ ] **Step 3: Verify with a standalone Node check**

Canvas isn't available under plain Node, so this check loads just the math by stubbing what the class needs — it directly exercises the two new methods without touching the rest of the file:

```bash
node -e "
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
class Fake{
  constructor(mobile){ this.isMobile = mobile; this.count = 300; }
}
Fake.prototype._generateRoadmapLayout = require('./ascii-engine.js') && null;
"
echo "---"
node --input-type=module -e "
import fs from 'fs';
let src = fs.readFileSync('./ascii-engine.js', 'utf8');
const start = src.indexOf('_generateRoadmapLayout(){');
const end = src.indexOf('_roadmapPointAt(u){');
const pointStart = end;
const pointEnd = src.indexOf('}', src.indexOf('return { x: A.x + (B.x - A.x) * frac, y: A.y + (B.y - A.y) * frac };', pointStart)) + 1;
const genBody = src.slice(start, end);
const pointBody = src.slice(pointStart, pointEnd);
const fn = new Function('Math', 'return function(isMobile, count){ const self = { isMobile, count }; (function ' + genBody.replace('_generateRoadmapLayout(){', '(){') + ').call(self); self._roadmapPointAt = ' + pointBody.replace('_roadmapPointAt(u){', 'function(u){') + '; return self; }')(Math);
const a = fn(false, 300);
console.log('nodeCount', a.roadmapNodeCount, 'nodes', a.roadmapNodes.map(n => n.x.toFixed(2)));
console.log('minSepOK', a.roadmapNodes.every((n,i,arr) => i===0 || Math.abs(n.x-arr[i-1].x) >= 0.14 - 1e-9));
console.log('bandOK', a.roadmapNodes.every(n => n.x >= 0.18 - 1e-9 && n.x <= 0.82 + 1e-9));
console.log('seedsLen', a.roadmapSeeds.length, 'expected', 1 + 4*4);
console.log('uLen', a.roadmapU.length, 'sample point', a._roadmapPointAt(0.5));
const m = fn(true, 260);
console.log('mobile bandOK', m.roadmapNodes.every(n => n.x >= 0.38 - 1e-9 && n.x <= 0.62 + 1e-9));
"
```
Expected: `nodeCount 5`, 5 x-values printed each between 0.18 and 0.82, `minSepOK true`, `bandOK true`, `seedsLen 17 expected 17`, `uLen 300`, a `sample point` with finite `x`/`y` around the path's midpoint, and `mobile bandOK true`. Re-run it 2-3 times — the printed node x-values should differ between runs (confirming it's unseeded), while `minSepOK`/`bandOK` stay `true` every time.

- [ ] **Step 4: Commit**

```bash
git add ascii-engine.js
git commit -m "Add roadmap node/path generation to AsciiOrganism"
```

---

### Task 4: The `roadmap` formation + ranged-zone timeline support

**Files:**
- Modify: `ascii-engine.js` — `setZones()`, `_timelineSegment()`, `_formationTarget()`, the `ACCENTS`/`FORM_C` maps inside `_frame()`

**Interfaces:**
- Consumes: `this.roadmapNodes`, `this.roadmapSeeds`, `this.roadmapU`, `this.roadmapDensity`, `this._roadmapPointAt()` (Task 3); `this.seg` (already existing, extended here with an optional `localT` field).
- Produces: zones registered with `{ name, el, ranged: true }` now supported; `this.seg.localT` (0–1, only meaningful when the current segment involves a ranged zone) — consumed by Task 7's DOM typewriter via `organism.seg`.

- [ ] **Step 1: Let `setZones` cache which zone names are "ranged"**

Find `setZones` (search for `setZones(`). It currently does roughly `this.zones = list;` — change it to also precompute a lookup set:

```js
  setZones(list){
    this.zones = list;
    this._rangedZoneNames = new Set(list.filter((z) => z.ranged).map((z) => z.name));
  }
```
(If the existing method has more logic than a one-line assignment, keep the rest — just add the `_rangedZoneNames` line.)

- [ ] **Step 2: Make `_timelineSegment()` support ranged zones**

Replace the whole method body with:

```js
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
        // on either side exactly like every other zone
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
```

- [ ] **Step 3: Add the `roadmap` case to `_formationTarget`**

Inside the `switch(name){` block, add a new case (placement doesn't matter functionally — put it after `case 'network':` and before `case 'constellation':` for readability):

```js
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
```

- [ ] **Step 4: Give `roadmap` an accent color and color-intensity weight**

Find (inside `_frame()`):
```js
    const ACCENTS = { diamond: [61, 127, 240], wave: [122, 27, 51], network: [31, 76, 120], globe: [203, 255, 61], constellation: [203, 255, 61] };
    const FORM_C = { globe: 0, diamond: 1, wave: 1, network: 0.4, constellation: 0.55 };
```
Replace with:
```js
    const ACCENTS = { diamond: [61, 127, 240], wave: [122, 27, 51], network: [31, 76, 120], globe: [203, 255, 61], constellation: [203, 255, 61], roadmap: [203, 255, 61] };
    const FORM_C = { globe: 0, diamond: 1, wave: 1, network: 0.4, constellation: 0.55, roadmap: 0.5 };
```
(Reuses NJORD's own signal-green, same reasoning as `constellation` — Services describes the studio's own work, not a client's.)

- [ ] **Step 5: Verify with a static read-through**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('ascii-engine.js', 'utf8');
console.log('has ranged handling', src.includes('rangedNames.has(A.name)'));
console.log('has roadmap case', src.includes(\"case 'roadmap':\"));
console.log('has roadmap accent', src.includes('roadmap: [203, 255, 61]'));
console.log('balanced braces', (src.match(/{/g)||[]).length === (src.match(/}/g)||[]).length);
"
```
Expected: all four lines `true`. The brace-balance check is a cheap guard against a dropped/extra `}` from the edits above — a real syntax check happens for real in Task 8 when the file is actually loaded in a browser via the Artifact republish, since this file has no bundler/linter to run standalone.

- [ ] **Step 6: Commit**

```bash
git add ascii-engine.js
git commit -m "Add roadmap formation and ranged-zone timeline support"
```

---

### Task 5: Remove the old Services system

**Files:**
- Modify: `index.html` (remove `.services-list`/`.service-row` markup and the entire `#service-modal` block)
- Modify: `style.css` (remove `.service-row*` and `.service-modal*` rules)
- Modify: `main.js` (remove the services reveal-cap-2 JS block and the `openService`/`closeService`/`showServiceModal`/`serviceCopy`/`onServiceModalKeydown` functions and their wiring, including the `currentServiceNum` reference inside `onLangChange`)

**Interfaces:**
- Removes: `openService`, `closeService`, `showServiceModal`, `serviceCopy`, `onServiceModalKeydown`, `lastServiceTrigger`, `currentServiceNum`, `serviceModal` (all previously in `main.js`).
- Note for later tasks: `animatePageReveal` and `trapTabKey` (the two generic helpers `showServiceModal`/`closeService` used) **stay** — the project-page portal (`openProject`/`closeProject`) still depends on them.

- [ ] **Step 1: Remove the service-row markup in `index.html`**

Delete the entire `<div class="services-list">...</div>` block (the five `.service-row` divs) from inside `<section id="services">`, leaving the `<div class="section-head">` (eyebrow/heading/note) in place — Task 6 adds the new `.roadmap-nodes` container in its place.

- [ ] **Step 2: Remove the `#service-modal` block in `index.html`**

Delete the entire `<div id="service-modal" class="project-modal service-modal" ...>...</div>` element (sits between the project modal's closing `</div>` and the `<script type="module" src="main.js">` tag).

- [ ] **Step 3: Remove service-row/service-modal CSS in `style.css`**

Delete every rule whose selector starts with `.service-row` (the whole "Services — ledger" block) and every rule whose selector starts with `.service-modal` (including the two `.project-modal__brand, .service-modal__brand` combined selectors — for those two specifically, only remove the `.service-modal__brand` part, keep `.project-modal__brand` since the project pages still use it):

```css
.project-modal__brand,
.service-modal__brand{
```
becomes
```css
.project-modal__brand{
```
and
```css
.project-modal__brand:hover,
.project-modal__brand:focus-visible,
.service-modal__brand:hover,
.service-modal__brand:focus-visible{
```
becomes
```css
.project-modal__brand:hover,
.project-modal__brand:focus-visible{
```

- [ ] **Step 4: Remove the services JS block in `main.js`**

Delete the whole `if(!isFinePointer){ ... }` block under the `/* Services — ... */` comment (the scroll-position reveal-cap-2 + tap-to-open-service-page logic) — Task 7 replaces it.

Delete the whole `/* Service pages — mobile/touch only ... */` block: `const serviceModal = ...` through the `if(serviceModal){ ... }` brand-click wiring.

In the `onLangChange(() => { ... })` block near the bottom, delete this part:
```js
  if(currentServiceNum && serviceModal && !serviceModal.hidden){
    const copy = serviceCopy(currentServiceNum);
    serviceModal.querySelector('.service-modal__eyebrow').textContent = `${t('services.modalEyebrow').toUpperCase()} — ${currentServiceNum}`;
    serviceModal.querySelector('.service-modal__title').textContent = copy.title;
    serviceModal.querySelector('.service-modal__desc').textContent = copy.desc;
  }
```

- [ ] **Step 5: Verify no dangling references remain**

```bash
node -e "
const fs = require('fs');
const main = fs.readFileSync('main.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
['openService','closeService','showServiceModal','serviceCopy','onServiceModalKeydown','currentServiceNum','serviceModal'].forEach(name => {
  if(main.includes(name)) console.log('STILL PRESENT in main.js:', name);
});
if(html.includes('service-modal') || html.includes('service-row')) console.log('STILL PRESENT in index.html');
if(css.includes('.service-row') || css.includes('.service-modal')) console.log('STILL PRESENT in style.css');
console.log('done');
"
```
Expected: only `done` printed — no "STILL PRESENT" lines.

- [ ] **Step 6: Commit**

```bash
git add index.html style.css main.js
git commit -m "Remove old Services ledger/modal system (superseded by roadmap)"
```

---

### Task 6: New markup + CSS shell

**Files:**
- Modify: `index.html` (add `.roadmap-nodes` container with 5 `.roadmap-node` placeholders inside `#services`)
- Modify: `style.css` (container height, node positioning/typography, cursor blink)

**Interfaces:**
- Produces: `#roadmap-nodes` element containing 5 `.roadmap-node[data-node="0..4"]` children, each with `.roadmap-node__heading`, `.roadmap-node__support`, `.roadmap-node__cursor`, `.roadmap-node__sr` — consumed by Task 7's `main.js` code.

- [ ] **Step 1: Add the markup**

Inside `<section id="services">`'s `.wrap`, after the existing `.section-head` block, add:

```html
      <div class="roadmap-nodes" id="roadmap-nodes">
        <div class="roadmap-node" data-node="0">
          <h3 class="roadmap-node__heading"></h3>
          <p class="roadmap-node__support"></p>
          <span class="roadmap-node__cursor" aria-hidden="true">_</span>
          <span class="roadmap-node__sr"></span>
        </div>
        <div class="roadmap-node" data-node="1">
          <h3 class="roadmap-node__heading"></h3>
          <p class="roadmap-node__support"></p>
          <span class="roadmap-node__cursor" aria-hidden="true">_</span>
          <span class="roadmap-node__sr"></span>
        </div>
        <div class="roadmap-node" data-node="2">
          <h3 class="roadmap-node__heading"></h3>
          <p class="roadmap-node__support"></p>
          <span class="roadmap-node__cursor" aria-hidden="true">_</span>
          <span class="roadmap-node__sr"></span>
        </div>
        <div class="roadmap-node" data-node="3">
          <h3 class="roadmap-node__heading"></h3>
          <p class="roadmap-node__support"></p>
          <span class="roadmap-node__cursor" aria-hidden="true">_</span>
          <span class="roadmap-node__sr"></span>
        </div>
        <div class="roadmap-node" data-node="4">
          <h3 class="roadmap-node__heading"></h3>
          <p class="roadmap-node__support"></p>
          <span class="roadmap-node__cursor" aria-hidden="true">_</span>
          <span class="roadmap-node__sr"></span>
        </div>
      </div>
```

Headings/support text are deliberately left empty in markup — Task 7's `main.js` populates them from `t()` and drives the typed reveal; tagging them `data-i18n` here would let the static translation pass dump full text immediately, bypassing the typewriter (this mirrors how the project-modal's own copy is already JS-driven rather than markup-tagged, per `i18n.js`'s documented convention).

- [ ] **Step 2: Add the CSS**

Add this new block to `style.css` (a reasonable spot is right where the old "Services — ledger" rules used to be, per Task 5's removal):

```css
/* ---------------------------------------------------------------
   Services — procedural ASCII roadmap (V2). The connecting path is
   drawn by the organism itself (ascii-engine.js, 'roadmap' formation)
   on the full-bleed canvas already behind this section — everything
   here only lays out and types the real DOM text for each node.
   --------------------------------------------------------------- */
.roadmap-nodes{
  position: relative;
  /* tall enough that scrolling through 5 nodes' worth of path-growth +
     typing reads as deliberate rather than instant — retune this
     multiplier directly if the pacing feels rushed or too slow */
  min-height: 420vh;
  margin-top: clamp(2rem, 6vw, 4rem);
}
.roadmap-node{
  position: absolute;
  transform: translate(-50%, -50%);
  max-width: 30ch;
  opacity: 0;
  transition: opacity .3s var(--ease-out);
  pointer-events: none;
}
.roadmap-node.is-visible{ opacity: 1; }
.roadmap-node__heading{
  font-family: var(--f-mono);
  font-size: clamp(1rem, 2.2vw, 1.3rem);
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 .4em;
}
.roadmap-node__support{
  font-family: var(--f-mono);
  font-size: var(--fs-small);
  color: var(--ink-soft);
  line-height: 1.5;
  margin: 0;
}
.roadmap-node__cursor{
  display: inline-block;
  color: var(--signal);
  animation: roadmap-cursor-blink 1s step-end infinite;
}
@keyframes roadmap-cursor-blink{
  0%, 100%{ opacity: 1; }
  50%{ opacity: 0; }
}
/* visually hidden but announced — the always-complete text for screen
   readers, independent of the sighted character-by-character reveal */
.roadmap-node__sr{
  position: absolute;
  width: 1px; height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
@media (max-width: 720px){
  .roadmap-nodes{ min-height: 340vh; }
  .roadmap-node{ max-width: 24ch; }
}
@media (prefers-reduced-motion: reduce){
  .roadmap-node{ opacity: 1; transition: none; }
  .roadmap-node__cursor{ animation: none; opacity: 0; }
}
```

- [ ] **Step 3: Verify**

```bash
node -e "
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const matches = html.match(/roadmap-node\" data-node=\"\d\"/g) || [];
console.log('node count', matches.length, matches);
"
```
Expected: `node count 5` with `data-node` values `0` through `4`.

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "Add roadmap node markup and CSS shell"
```

---

### Task 7: Zone registration + DOM typewriter (main.js)

**Files:**
- Modify: `main.js` — the organism zone list, and a new block replacing the one deleted in Task 5

**Interfaces:**
- Consumes: `organism.roadmapNodes`, `organism.seg` (both from `ascii-engine.js`, Tasks 3–4); `t()`, `onLangChange()` (from `i18n.js`); `reduced` (existing top-level const in `main.js`).
- Produces: nothing consumed by later tasks — this is the final behavioral piece.

- [ ] **Step 1: Register the ranged zone**

Find the `organism.setZones([...])` call and change:
```js
    { name: 'network', el: document.querySelector('.work-row[data-project="meridian"]') },
    { name: 'constellation', el: document.getElementById('studio') },
```
to:
```js
    { name: 'network', el: document.querySelector('.work-row[data-project="meridian"]') },
    { name: 'roadmap', el: document.getElementById('services'), ranged: true },
    { name: 'constellation', el: document.getElementById('studio') },
```

- [ ] **Step 2: Add the DOM typewriter block**

Add this new block where the old services block used to live (same location Task 5 emptied out):

```js
/* ---------------------------------------------------------------
   Services — procedural ASCII roadmap (V2). The organism's own
   'roadmap' formation (ascii-engine.js) draws the growing/dissolving
   path on the shared canvas; this block only owns the real-DOM text
   overlay per node — heading types first, then the support line,
   driven directly by scroll position (never a timer), so it un-types
   symmetrically on scroll-up exactly like the path itself reverses.
   --------------------------------------------------------------- */
const SERVICE_KEYS = ['01', '02', '03', '04', '05'];
function serviceRoadmapCopy(num){
  return { heading: t(`services.${num}.title`), support: t(`services.${num}.desc`) };
}

const roadmapNodesEl = document.getElementById('roadmap-nodes');
if(roadmapNodesEl && organism){
  const nodeEls = Array.from(roadmapNodesEl.querySelectorAll('.roadmap-node'));

  function positionRoadmapNodes(){
    if(!organism.roadmapNodes) return;
    nodeEls.forEach((el, i) => {
      const node = organism.roadmapNodes[i];
      if(!node) return;
      el.style.left = `${node.x * 100}%`;
      el.style.top = `${node.y * 100}%`;
    });
  }
  positionRoadmapNodes();
  window.addEventListener('resize', positionRoadmapNodes);

  function fillRoadmapDataset(){
    nodeEls.forEach((el, i) => {
      const copy = serviceRoadmapCopy(SERVICE_KEYS[i]);
      el.dataset.heading = copy.heading;
      el.dataset.support = copy.support;
      const sr = el.querySelector('.roadmap-node__sr');
      if(sr) sr.textContent = `${copy.heading} — ${copy.support}`;
    });
  }
  fillRoadmapDataset();

  if(reduced){
    // matches how every other formation degrades under reduced-motion
    // (see AsciiOrganism.start()): no scroll-driven animation, just the
    // fully-resolved end state, immediately
    nodeEls.forEach((el) => {
      const headEl = el.querySelector('.roadmap-node__heading');
      const supEl = el.querySelector('.roadmap-node__support');
      if(headEl) headEl.textContent = el.dataset.heading || '';
      if(supEl) supEl.textContent = el.dataset.support || '';
      el.classList.add('is-visible');
    });
    onLangChange(() => {
      fillRoadmapDataset();
      nodeEls.forEach((el) => {
        const headEl = el.querySelector('.roadmap-node__heading');
        const supEl = el.querySelector('.roadmap-node__support');
        if(headEl) headEl.textContent = el.dataset.heading || '';
        if(supEl) supEl.textContent = el.dataset.support || '';
      });
    });
  } else {
    const NODE_COUNT = nodeEls.length;
    let roadmapTicking = false;
    function updateRoadmapTyping(){
      roadmapTicking = false;
      const seg = organism.seg;
      let localT = null;
      if(seg && seg.a === 'roadmap' && seg.b === 'roadmap' && typeof seg.localT === 'number') localT = seg.localT;
      else if(seg && seg.b === 'roadmap') localT = 0;
      else if(seg && seg.a === 'roadmap') localT = 1;
      if(localT === null) return; // organism hasn't reached Services yet — leave everything untyped

      nodeEls.forEach((el, i) => {
        const nodeU = i / (NODE_COUNT - 1);
        const typeStart = i === 0 ? 0 : (i - 0.6) / (NODE_COUNT - 1);
        const typeEnd = nodeU;
        const raw = typeEnd > typeStart ? (localT - typeStart) / (typeEnd - typeStart) : (localT >= nodeU ? 1 : 0);
        const progress = Math.max(0, Math.min(1, raw));
        const headingProgress = Math.min(1, progress * 2);
        const supportProgress = Math.max(0, Math.min(1, (progress - 0.5) * 2));

        const heading = el.dataset.heading || '';
        const support = el.dataset.support || '';
        const headEl = el.querySelector('.roadmap-node__heading');
        const supEl = el.querySelector('.roadmap-node__support');
        const cursorEl = el.querySelector('.roadmap-node__cursor');
        if(headEl) headEl.textContent = heading.slice(0, Math.round(heading.length * headingProgress));
        if(supEl) supEl.textContent = support.slice(0, Math.round(support.length * supportProgress));
        el.classList.toggle('is-visible', progress > 0);
        if(cursorEl) cursorEl.classList.toggle('is-on-support', headingProgress >= 1 && supportProgress < 1);
      });
    }
    function queueRoadmapUpdate(){
      if(roadmapTicking) return;
      roadmapTicking = true;
      requestAnimationFrame(updateRoadmapTyping);
    }
    window.addEventListener('scroll', queueRoadmapUpdate, { passive: true });
    window.addEventListener('resize', queueRoadmapUpdate);
    queueRoadmapUpdate();
    onLangChange(() => { fillRoadmapDataset(); queueRoadmapUpdate(); });
  }
}
```

- [ ] **Step 3: Verify with a static check**

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('main.js', 'utf8');
console.log('zone registered', src.includes(\"name: 'roadmap', el: document.getElementById('services'), ranged: true\"));
console.log('typewriter fn present', src.includes('function updateRoadmapTyping'));
console.log('reduced-motion branch present', src.includes('matches how every other formation degrades'));
const opens = (src.match(/\{/g)||[]).length, closes = (src.match(/\}/g)||[]).length;
console.log('balanced braces', opens === closes, opens, closes);
"
```
Expected: first three lines `true`; balanced braces `true` with matching counts.

- [ ] **Step 4: Commit**

```bash
git add main.js
git commit -m "Wire roadmap zone registration and scroll-driven DOM typewriter"
```

---

### Task 8: Integration pass, republish, and HANDOFF update

**Files:**
- Modify: `HANDOFF.md` (add a short section documenting the roadmap system, matching its existing documentation style)
- No code files — this task is verification + publish + docs only

**Interfaces:** none (closing task)

- [ ] **Step 1: Republish the artifact**

```
Artifact({
  file_path: "C:\\Users\\pinkj\\ClaudeProjects\\njord\\index.html",
  url: "https://claude.ai/code/artifact/678ce4de-39aa-4655-8153-3fbd15886fbb",
  root: "C:\\Users\\pinkj\\ClaudeProjects\\njord",
  files: { "style.css": "style.css", "ascii-engine.js": "ascii-engine.js", "audio-engine.js": "audio-engine.js", "audio-engine-a2.js": "audio-engine-a2.js", "i18n.js": "i18n.js", "main.js": "main.js" }
})
```

- [ ] **Step 2: Manual verification pass**

Using Chrome DevTools (or the `claude-in-chrome` tools if connected this session) at both a desktop width and a ~390px mobile emulation width:
- Scroll from Meridian's row down through Services down into Studio. Confirm: the path visibly grows from nothing, reaches each of the 5 nodes in order, each node's heading types before its support line, the cursor blinks, and the whole thing reads as irregular/organic rather than a straight line or grid.
- Scroll back UP through the same range. Confirm text un-types and the path retracts — no popping, no stale text left over from a node you've scrolled past.
- Reload the page 2–3 times and re-check node x-positions differ each time (open DevTools console and run `document.querySelectorAll('.roadmap-node').forEach(el => console.log(el.style.left))` before and after a hard refresh).
- Confirm nodes never overlap or clip off-screen at both widths.
- Confirm the rest of the site (hero → globe, Aurelia → diamond, Pulse → wave, Meridian → network, Studio → constellation, project-page portals, audio, nav) is unaffected — this was the main regression risk from touching `_timelineSegment()`.
- With OS-level "reduce motion" enabled (or via DevTools' "Emulate CSS prefers-reduced-motion: reduce"), confirm all 5 nodes show full text immediately with no cursor animation.

- [ ] **Step 3: Fix anything found, committing each fix separately**

If step 2 surfaces issues, fix them in the relevant file, re-verify, and commit with a message describing the specific fix (e.g. `git commit -m "Fix roadmap node overlap at 375px width"`) — don't fold fixes into earlier tasks' commits.

- [ ] **Step 4: Update HANDOFF.md**

Add a new section (after the existing "Studio section" section, matching its heading style) documenting: the `roadmap` formation and ranged-zone mechanism, node/path randomization being intentionally unseeded, the DOM typewriter's scroll-driven (non-timed) reveal, and that this replaced the old service-row/service-modal system now preserved in `versions/v1-services/`. Follow the file's existing voice (terse, decision-plus-why, cross-references to specific line-level mechanisms) rather than restating this plan verbatim.

- [ ] **Step 5: Final commit**

```bash
git add HANDOFF.md
git commit -m "Document Services V2 roadmap system in HANDOFF.md"
git log --oneline
```
Expected: a clean, readable commit history from Task 1's baseline through this final doc update.
