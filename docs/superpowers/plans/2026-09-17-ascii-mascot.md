# NJORD Contact-Section Mascot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small, independent ASCII "mascot" that assembles itself
near the contact-section footer as the visitor scrolls down, with a
restrained idle personality, continuous cursor awareness, and a
placeholder click reaction — with no real helper/assistant logic yet.

**Architecture:** A standalone `AsciiMascot` class added to
`ascii-engine.js` (sibling to the existing `FormationPortrait`/
`StaticGlyphField` classes), with its own small canvas, its own ~47-point
particle pool, and its own state (formation progress, idle glance, stray
encounters, cursor attention, click-triggered "alert"). Entirely
independent of `AsciiOrganism` — no existing class, formation, or zone is
touched. Pure math (progress curves, timing/phase functions, geometry
generation) is extracted into standalone exported functions so it can be
unit-tested in plain Node with no DOM/canvas; rendering and live
interaction are verified manually against the local dev server.

**Tech Stack:** Vanilla JS (ES modules), Canvas 2D, CSS. No build step, no
dependencies. Tests run via plain `node` using the built-in
`node:assert/strict` module — no test framework, matching this project's
existing zero-dependency, zero-test-framework precedent (prior
verification in this codebase used ad hoc Node scripts for pure math; see
`HANDOFF.md`'s Services-roadmap section).

**Spec:** `docs/superpowers/specs/2026-09-17-ascii-mascot-design.md`

## Global Constraints

- Vanilla JS + Canvas + CSS only — no frameworks, no npm dependencies.
- No existing class, formation case, or zone in `ascii-engine.js` may be
  modified. `AsciiMascot` is purely additive.
- All mascot geometry lives in a local unit space (roughly `[-1, 1]`),
  y-down, matching `FormationPortrait`'s existing coordinate convention.
- Cursor proximity NEVER changes brightness/intensity anywhere on the
  mascot — attention is expressed only through head movement.
- The click reaction is a look-at-cursor + straighten-posture pose change
  only — no text, no fragment, no popup, no chat bubble.
- The signal-green accent point is an off-center artifact, never
  positioned or described as an eye; the face is at most two very faint
  points, never a clear expression.
- Any new translatable string goes into `i18n.js` with both `en` and `sq`
  entries, following the existing `data-i18n*` attribute conventions.
- Reduced-motion (`prefersReducedMotion()`) renders one settled,
  fully-formed frame with no scroll-driven assembly and no ongoing idle
  timers — same degradation pattern already used by `AsciiOrganism` and
  `FormationPortrait`.
- `devicePixelRatio` capped the same way as every other canvas in this
  file: 2 on desktop, 1 when `window.innerWidth < 720`.
- Pure logic (progress curves, timing/phase math, geometry generation) is
  unit-tested via `node mascot.test.js`. Rendering and live interaction
  are verified manually via the Claude-in-Chrome browser tool against the
  local dev server (`python _dev_server.py`), not the claude.ai Artifact
  preview, matching this project's established verification workflow.

---

## Task 1: Test infra + formation/stagger/flicker math

**Files:**
- Create: `package.json`
- Create: `mascot.test.js`
- Modify: `ascii-engine.js` (append at end of file)

**Interfaces:**
- Consumes: `smoothstep(edge0, edge1, x)` — already defined in
  `ascii-engine.js` (module-scope function, not exported, but usable
  directly since the new code lives in the same file).
- Produces: `mascotFormationProgress(rectTop, vh) -> number` (0..1),
  `MASCOT_STAGGER` (object, part name -> number), `mascotPartProgress(p,
  stagger) -> number` (0..1), `mascotFlickerIntensity(partP, seed) ->
  number` (0..1). All exported from `ascii-engine.js`.

- [ ] **Step 1: Create `package.json` so Node treats `.js` files as ES modules**

`ascii-engine.js` already uses `export`/`import` syntax for the browser
(loaded via `<script type="module">`). For `node mascot.test.js` to
`import` from it directly, Node needs to know these are ES modules, not
CommonJS. This has zero effect on the browser or the Artifact publish —
it only changes how the local `node` CLI interprets `.js` files.

```json
{
  "name": "njord",
  "private": true,
  "type": "module"
}
```

Write this to `C:\Users\pinkj\ClaudeProjects\njord\package.json`.

- [ ] **Step 2: Append the failing test file**

Write this to `C:\Users\pinkj\ClaudeProjects\njord\mascot.test.js`:

```js
import assert from 'node:assert/strict';
import {
  mascotFormationProgress, MASCOT_STAGGER, mascotPartProgress, mascotFlickerIntensity,
} from './ascii-engine.js';

let count = 0;
function test(name, fn){
  fn();
  count++;
  console.log(`ok - ${name}`);
}

// --- mascotFormationProgress ---
test('formation progress is 0 when the element is well below the fold', () => {
  assert.strictEqual(mascotFormationProgress(900, 800), 0);
});
test('formation progress is 1 once the element has scrolled well up', () => {
  assert.strictEqual(mascotFormationProgress(100, 800), 1);
});
test('formation progress is a midpoint value partway through the scroll range', () => {
  // vh=800, START_FRAC=0.85 -> startY=680, END_FRAC=0.30 -> endY=240
  // rectTop=460 is exactly the midpoint of [240, 680]
  const p = mascotFormationProgress(460, 800);
  assert.ok(p > 0.45 && p < 0.55, `expected ~0.5, got ${p}`);
});
test('formation progress is monotonic as the element scrolls up', () => {
  const a = mascotFormationProgress(600, 800);
  const b = mascotFormationProgress(400, 800);
  const c = mascotFormationProgress(200, 800);
  assert.ok(a < b && b < c, `expected increasing sequence, got ${a}, ${b}, ${c}`);
});

// --- MASCOT_STAGGER ---
test('stagger has an entry for every body part, head first', () => {
  assert.strictEqual(MASCOT_STAGGER.head, 0);
  for(const part of ['torso', 'armR', 'legR', 'armL', 'legL']){
    assert.ok(MASCOT_STAGGER[part] > 0, `expected ${part} to have a positive stagger offset`);
  }
});
test('left side lags the right side (deliberate asymmetry)', () => {
  assert.ok(MASCOT_STAGGER.armL > MASCOT_STAGGER.armR);
  assert.ok(MASCOT_STAGGER.legL > MASCOT_STAGGER.legR);
});

// --- mascotPartProgress ---
test('a part has not started while global progress equals its own stagger offset', () => {
  assert.strictEqual(mascotPartProgress(0.18, 0.18), 0);
});
test('a part is fully formed once global progress reaches 1', () => {
  assert.strictEqual(mascotPartProgress(1, 0.18), 1);
});
test('head (no stagger) is further along than a staggered limb at the same global progress', () => {
  const headP = mascotPartProgress(0.5, MASCOT_STAGGER.head);
  const legLP = mascotPartProgress(0.5, MASCOT_STAGGER.legL);
  assert.ok(headP > legLP, `expected head (${headP}) > legL (${legLP})`);
});

// --- mascotFlickerIntensity ---
test('flicker intensity is solid (1) before the flicker band starts', () => {
  assert.strictEqual(mascotFlickerIntensity(0.2, 0), 1);
});
test('flicker intensity is solid (1) after the flicker band ends', () => {
  assert.strictEqual(mascotFlickerIntensity(0.7, 0), 1);
});
test('flicker intensity is solid at a band position where the wave is positive', () => {
  // seed=0, partP=0.40 -> local=0.25 -> wave=sin(0.5*PI)=1 -> not a dropout
  assert.strictEqual(mascotFlickerIntensity(0.40, 0), 1);
});
test('flicker intensity dips at a band position where the wave is strongly negative', () => {
  // seed=0, partP=0.50 -> local=0.75 -> wave=sin(1.5*PI)=-1 -> dropout
  assert.strictEqual(mascotFlickerIntensity(0.50, 0), 0.15);
});

console.log(`\n${count} passing`);
```

- [ ] **Step 3: Run the test file and confirm it fails on the missing import**

Run: `node mascot.test.js`
Expected: fails immediately with an error naming `mascotFormationProgress`
(or a similar export) as undefined/not exported, since `ascii-engine.js`
doesn't define these yet.

- [ ] **Step 4: Append the implementation to `ascii-engine.js`**

Open `ascii-engine.js` and find its final four lines (the end of the
`StaticGlyphField` class):

```js
    this.field.setPoints(pts);
    this.field.render();
  }
}
```

Append immediately after that closing `}` (still inside the file, at the
very end):

```js

/* ----------------------------------------------------------------
   AsciiMascot — a small, independent inhabitant near the contact
   section's footer, assembled from the same rendering conventions as
   the rest of this file (char ramp, font, ink/accent color) but with
   its own tiny particle pool, fully independent of AsciiOrganism. See
   docs/superpowers/specs/2026-09-17-ascii-mascot-design.md for the
   full design rationale — read that file before changing any constant
   below, since most of them encode a specific reviewed decision, not
   an arbitrary default.
   ---------------------------------------------------------------- */

// scroll fractions (of viewport height) the mascot's own canvas's
// bounding-rect top must cross for formation progress to go 0 -> 1.
// Same technique as main.js's roadmap TYPE_START_FRAC/TYPE_END_FRAC.
const MASCOT_FORM_START_FRAC = 0.85;
const MASCOT_FORM_END_FRAC = 0.30;

/** Global scroll-driven formation progress, 0 (scattered)..1 (formed). */
export function mascotFormationProgress(rectTop, vh){
  const startY = vh * MASCOT_FORM_START_FRAC;
  const endY = vh * MASCOT_FORM_END_FRAC;
  const raw = 1 - Math.max(0, Math.min(1, (rectTop - endY) / (startY - endY)));
  return smoothstep(0, 1, raw);
}

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
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node mascot.test.js`
Expected: all 13 `ok -` lines print, ending with `13 passing`.

- [ ] **Step 6: Commit**

```bash
git add package.json mascot.test.js ascii-engine.js
git commit -m "Add mascot formation-progress and stagger math with tests"
```

---

## Task 2: Idle-glance and stray-encounter timing math

**Files:**
- Modify: `ascii-engine.js` (append after Task 1's additions)
- Modify: `mascot.test.js` (append more tests)

**Interfaces:**
- Consumes: `smoothstep` (module-scope, same file).
- Produces: `MASCOT_GLANCE_DURATION_S` (number), `mascotNextGlanceWait(rnd)
  -> number`, `mascotGlanceAmount(elapsed) -> number` (0..1),
  `MASCOT_ENCOUNTER_TYPES` (array of 3 strings: `'watch'|'nudge'|'catch'`),
  `mascotNextEncounterWait(rnd) -> number`, `mascotEncounterDuration(type)
  -> number`, `mascotEncounterPhase(type, elapsed) -> { phase:
  'approach'|'hold'|'release'|'done', amount: number }`. All exported.

- [ ] **Step 1: Append the failing tests**

Add to the top of `mascot.test.js`'s import list (replace the existing
`import { ... } from './ascii-engine.js';` line with this expanded one):

```js
import {
  mascotFormationProgress, MASCOT_STAGGER, mascotPartProgress, mascotFlickerIntensity,
  MASCOT_GLANCE_DURATION_S, mascotNextGlanceWait, mascotGlanceAmount,
  MASCOT_ENCOUNTER_TYPES, mascotNextEncounterWait, mascotEncounterDuration, mascotEncounterPhase,
} from './ascii-engine.js';
```

Then add these tests immediately before the final `console.log(...)` line:

```js
// --- glance timing ---
test('next glance wait is within the documented 6-11s range', () => {
  const w1 = mascotNextGlanceWait(() => 0);
  const w2 = mascotNextGlanceWait(() => 1);
  const w3 = mascotNextGlanceWait(() => 0.5);
  assert.strictEqual(w1, 6);
  assert.strictEqual(w2, 11);
  assert.strictEqual(w3, 8.5);
});
test('glance amount ramps up, holds at 1, then eases back to 0', () => {
  assert.strictEqual(mascotGlanceAmount(0), 0);
  assert.strictEqual(mascotGlanceAmount(0.6), 1); // end of the 0.6s ease-in
  assert.strictEqual(mascotGlanceAmount(0.9), 1); // mid-hold
  assert.strictEqual(mascotGlanceAmount(1.6), 0); // end of the 0.6s ease-out
  assert.strictEqual(mascotGlanceAmount(2.0), 0); // well after it's over
});
test('glance duration constant matches the sum of its own phases', () => {
  assert.strictEqual(MASCOT_GLANCE_DURATION_S, 1.6);
});

// --- stray encounter timing ---
test('encounter types are exactly watch, nudge, catch', () => {
  assert.deepStrictEqual(MASCOT_ENCOUNTER_TYPES, ['watch', 'nudge', 'catch']);
});
test('next encounter wait is within the documented 15-30s range', () => {
  assert.strictEqual(mascotNextEncounterWait(() => 0), 15);
  assert.strictEqual(mascotNextEncounterWait(() => 1), 30);
});
test('encounter duration is approach + hold + release for each type', () => {
  assert.strictEqual(mascotEncounterDuration('watch'), 3.5);
  assert.strictEqual(mascotEncounterDuration('nudge'), 2.2);
  assert.strictEqual(mascotEncounterDuration('catch'), 3.75);
});
test('encounter phase moves approach -> hold -> release -> done for "nudge"', () => {
  assert.strictEqual(mascotEncounterPhase('nudge', 0).phase, 'approach');
  assert.strictEqual(mascotEncounterPhase('nudge', 0.5).phase, 'approach');
  assert.strictEqual(mascotEncounterPhase('nudge', 1.1).phase, 'hold');
  assert.strictEqual(mascotEncounterPhase('nudge', 1.5).phase, 'release');
  assert.strictEqual(mascotEncounterPhase('nudge', 2.3).phase, 'done');
});
test('encounter approach amount ramps from 0 to 1', () => {
  assert.strictEqual(mascotEncounterPhase('watch', 0).amount, 0);
  assert.strictEqual(mascotEncounterPhase('watch', 1.0).amount, 1);
});
```

- [ ] **Step 2: Run the test file and confirm the new tests fail**

Run: `node mascot.test.js`
Expected: fails with the new imports undefined (the earlier 13 tests
still can't even run since the import line itself now fails).

- [ ] **Step 3: Append the implementation to `ascii-engine.js`**

Append after `mascotFlickerIntensity`'s closing `}` (the end of Task 1's
addition):

```js

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
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node mascot.test.js`
Expected: all tests print `ok -`, ending with `21 passing`.

- [ ] **Step 5: Commit**

```bash
git add ascii-engine.js mascot.test.js
git commit -m "Add mascot idle-glance and stray-encounter timing math with tests"
```

---

## Task 3: Cursor attention and click-alert math

**Files:**
- Modify: `ascii-engine.js` (append after Task 2's additions)
- Modify: `mascot.test.js` (append more tests)

**Interfaces:**
- Consumes: `smoothstep` (module-scope, same file).
- Produces: `MASCOT_NOTICE_RADIUS_PX` (number), `mascotCursorAttention(distPx,
  radiusPx?) -> number` (0..1), `MASCOT_ALERT_HOLD_S` (number),
  `mascotAlertAmount(elapsed) -> number` (0..1). All exported.

- [ ] **Step 1: Append the failing tests**

Update the import line in `mascot.test.js` to also pull in the new names:

```js
import {
  mascotFormationProgress, MASCOT_STAGGER, mascotPartProgress, mascotFlickerIntensity,
  MASCOT_GLANCE_DURATION_S, mascotNextGlanceWait, mascotGlanceAmount,
  MASCOT_ENCOUNTER_TYPES, mascotNextEncounterWait, mascotEncounterDuration, mascotEncounterPhase,
  MASCOT_NOTICE_RADIUS_PX, mascotCursorAttention, MASCOT_ALERT_HOLD_S, mascotAlertAmount,
} from './ascii-engine.js';
```

Add these tests before the final `console.log(...)` line:

```js
// --- cursor attention ---
test('attention is 1 when the cursor is exactly on the mascot', () => {
  assert.strictEqual(mascotCursorAttention(0, MASCOT_NOTICE_RADIUS_PX), 1);
});
test('attention is 0 at or beyond the notice radius', () => {
  assert.strictEqual(mascotCursorAttention(MASCOT_NOTICE_RADIUS_PX, MASCOT_NOTICE_RADIUS_PX), 0);
  assert.strictEqual(mascotCursorAttention(MASCOT_NOTICE_RADIUS_PX * 2, MASCOT_NOTICE_RADIUS_PX), 0);
});
test('attention falls off continuously, not in a step', () => {
  const near = mascotCursorAttention(20, MASCOT_NOTICE_RADIUS_PX);
  const mid = mascotCursorAttention(130, MASCOT_NOTICE_RADIUS_PX);
  const far = mascotCursorAttention(240, MASCOT_NOTICE_RADIUS_PX);
  assert.ok(near > mid && mid > far, `expected near(${near}) > mid(${mid}) > far(${far})`);
});

// --- click alert ---
test('alert amount ramps up, holds at 1 for MASCOT_ALERT_HOLD_S, then eases out', () => {
  assert.strictEqual(mascotAlertAmount(0), 0);
  assert.strictEqual(mascotAlertAmount(0.3), 1); // end of the 0.3s ease-in
  assert.strictEqual(mascotAlertAmount(0.3 + MASCOT_ALERT_HOLD_S - 0.1), 1); // still holding
  const afterHold = 0.3 + MASCOT_ALERT_HOLD_S;
  assert.strictEqual(mascotAlertAmount(afterHold), 1); // start of ease-out
  assert.strictEqual(mascotAlertAmount(afterHold + 0.6), 0); // end of the 0.6s ease-out
});
```

- [ ] **Step 2: Run the test file and confirm the new tests fail**

Run: `node mascot.test.js`
Expected: fails with `MASCOT_NOTICE_RADIUS_PX` (or similar) undefined.

- [ ] **Step 3: Append the implementation to `ascii-engine.js`**

Append after `mascotEncounterPhase`'s closing `}` (the end of Task 2's
addition):

```js

export const MASCOT_NOTICE_RADIUS_PX = 260;

/** Continuous 0..1 cursor attention — never thresholded, never used for brightness. */
export function mascotCursorAttention(distPx, radiusPx = MASCOT_NOTICE_RADIUS_PX){
  const raw = 1 - Math.max(0, Math.min(1, distPx / radiusPx));
  return smoothstep(0, 1, raw);
}

export const MASCOT_ALERT_HOLD_S = 3.5;
const MASCOT_ALERT_IN_S = 0.3, MASCOT_ALERT_OUT_S = 0.6;

/** Alert (post-click) amount 0..1 at `elapsed` seconds since (re)trigger. */
export function mascotAlertAmount(elapsed){
  if(elapsed < 0) return 0;
  if(elapsed < MASCOT_ALERT_IN_S) return smoothstep(0, 1, elapsed / MASCOT_ALERT_IN_S);
  if(elapsed < MASCOT_ALERT_IN_S + MASCOT_ALERT_HOLD_S) return 1;
  const outElapsed = elapsed - MASCOT_ALERT_IN_S - MASCOT_ALERT_HOLD_S;
  if(outElapsed < MASCOT_ALERT_OUT_S) return 1 - smoothstep(0, 1, outElapsed / MASCOT_ALERT_OUT_S);
  return 0;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node mascot.test.js`
Expected: all tests print `ok -`, ending with `25 passing`.

- [ ] **Step 5: Commit**

```bash
git add ascii-engine.js mascot.test.js
git commit -m "Add mascot cursor-attention and click-alert math with tests"
```

---

## Task 4: Skeleton and stray geometry builders

**Files:**
- Modify: `ascii-engine.js` (append after Task 3's additions)
- Modify: `mascot.test.js` (append more tests)

**Interfaces:**
- Consumes: `mulberry32(seed)` — already exported from `ascii-engine.js`.
- Produces: `MASCOT_BODY_POINTS` (array of 22 `{part, x, y, accent?,
  faint?, flicker?, isHand?, isFoot?}` objects), `mascotBuildBody(rnd) ->
  Array<{part, x, y, scatterX, scatterY, jitterSeed, ...flags}>`,
  `mascotBuildStrays(rnd, count=25) -> Array<{homeX, homeY, phase, speed,
  amp, settle, jitterSeed}>`. All exported.

- [ ] **Step 1: Append the failing tests**

Update the import line in `mascot.test.js` once more:

```js
import {
  mascotFormationProgress, MASCOT_STAGGER, mascotPartProgress, mascotFlickerIntensity,
  MASCOT_GLANCE_DURATION_S, mascotNextGlanceWait, mascotGlanceAmount,
  MASCOT_ENCOUNTER_TYPES, mascotNextEncounterWait, mascotEncounterDuration, mascotEncounterPhase,
  MASCOT_NOTICE_RADIUS_PX, mascotCursorAttention, MASCOT_ALERT_HOLD_S, mascotAlertAmount,
  MASCOT_BODY_POINTS, mascotBuildBody, mascotBuildStrays, mulberry32,
} from './ascii-engine.js';
```

Add these tests before the final `console.log(...)` line:

```js
// --- body geometry ---
test('body has exactly 22 points', () => {
  assert.strictEqual(MASCOT_BODY_POINTS.length, 22);
});
test('body has the expected point count per part', () => {
  const counts = {};
  for(const pt of MASCOT_BODY_POINTS) counts[pt.part] = (counts[pt.part] || 0) + 1;
  assert.deepStrictEqual(counts, { head: 6, torso: 4, armR: 3, armL: 3, legR: 3, legL: 3 });
});
test('exactly one body point is the signal-green accent, and it is not centered', () => {
  const accents = MASCOT_BODY_POINTS.filter((pt) => pt.accent);
  assert.strictEqual(accents.length, 1);
  assert.notStrictEqual(accents[0].x, 0, 'accent point must be off-center, not on the face midline');
});
test('exactly two body points are flagged flicker, one per lagging limb', () => {
  const flickered = MASCOT_BODY_POINTS.filter((pt) => pt.flicker);
  assert.strictEqual(flickered.length, 2);
  const parts = flickered.map((pt) => pt.part).sort();
  assert.deepStrictEqual(parts, ['armL', 'legL']);
});
test('mascotBuildBody is reproducible from the same seed', () => {
  const a = mascotBuildBody(mulberry32(1));
  const b = mascotBuildBody(mulberry32(1));
  assert.deepStrictEqual(a, b);
});
test('mascotBuildBody attaches a scatter position and jitter seed to every point', () => {
  const body = mascotBuildBody(mulberry32(1));
  assert.strictEqual(body.length, 22);
  for(const pt of body){
    assert.strictEqual(typeof pt.scatterX, 'number');
    assert.strictEqual(typeof pt.scatterY, 'number');
    assert.strictEqual(typeof pt.jitterSeed, 'number');
  }
});

// --- stray geometry ---
test('mascotBuildStrays returns the requested count', () => {
  const strays = mascotBuildStrays(mulberry32(2), 25);
  assert.strictEqual(strays.length, 25);
});
test('mascotBuildStrays is reproducible from the same seed', () => {
  const a = mascotBuildStrays(mulberry32(2), 25);
  const b = mascotBuildStrays(mulberry32(2), 25);
  assert.deepStrictEqual(a, b);
});
test('a minority but nonzero share of strays settle close after formation', () => {
  const strays = mascotBuildStrays(mulberry32(2), 25);
  const highSettle = strays.filter((s) => s.settle >= 0.6).length;
  assert.ok(highSettle > 0 && highSettle < 25, `expected some but not all, got ${highSettle}/25`);
});
```

- [ ] **Step 2: Run the test file and confirm the new tests fail**

Run: `node mascot.test.js`
Expected: fails with `MASCOT_BODY_POINTS` (or similar) undefined.

- [ ] **Step 3: Append the implementation to `ascii-engine.js`**

Append after `mascotAlertAmount`'s closing `}` (the end of Task 3's
addition):

```js

// Fixed silhouette, local unit space (~[-1,1] box), y-down like the
// rest of this file. 22 points total — enough for a recognizable
// square head + jointed limbs while still reading as loose fragments,
// not a filled illustration. The (0.08,-1.02) head corner is the ONE
// signal-green accent — an off-center artifact, not an eye. The two
// (0,-0.98)/(0,-0.90) interior head points are `faint` — an
// almost-absent suggestion of a face, never a clear expression.
export const MASCOT_BODY_POINTS = [
  { part: 'head', x: -0.08, y: -1.02 },
  { part: 'head', x: 0.08, y: -1.02, accent: true },
  { part: 'head', x: -0.08, y: -0.86 },
  { part: 'head', x: 0.08, y: -0.86 },
  { part: 'head', x: 0, y: -0.98, faint: true },
  { part: 'head', x: 0, y: -0.90, faint: true },
  { part: 'torso', x: 0, y: -0.62 },
  { part: 'torso', x: 0, y: -0.48 },
  { part: 'torso', x: 0, y: -0.34 },
  { part: 'torso', x: 0, y: -0.20 },
  { part: 'armR', x: 0.14, y: -0.58 },
  { part: 'armR', x: 0.22, y: -0.42 },
  { part: 'armR', x: 0.30, y: -0.24, isHand: true },
  { part: 'armL', x: -0.14, y: -0.58 },
  { part: 'armL', x: -0.22, y: -0.42 },
  { part: 'armL', x: -0.30, y: -0.24, isHand: true, flicker: true },
  { part: 'legR', x: 0.09, y: -0.06 },
  { part: 'legR', x: 0.12, y: 0.16 },
  { part: 'legR', x: 0.16, y: 0.38, isFoot: true },
  { part: 'legL', x: -0.09, y: -0.06 },
  { part: 'legL', x: -0.12, y: 0.16, flicker: true },
  { part: 'legL', x: -0.16, y: 0.38, isFoot: true },
];

/** Body points + their fixed per-point scatter/jitter identity (seeded). */
export function mascotBuildBody(rnd){
  return MASCOT_BODY_POINTS.map((pt) => ({
    ...pt,
    scatterX: (rnd() - 0.5) * (2.8 + rnd() * 0.8),
    scatterY: (rnd() - 0.5) * (2.8 + rnd() * 0.8),
    jitterSeed: rnd() * Math.PI * 2,
  }));
}

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
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node mascot.test.js`
Expected: all tests print `ok -`, ending with `34 passing`.

- [ ] **Step 5: Commit**

```bash
git add ascii-engine.js mascot.test.js
git commit -m "Add mascot skeleton and stray geometry builders with tests"
```

---

## Task 5: `AsciiMascot` class — state (formation, idle, encounters, cursor, alert)

**Files:**
- Modify: `ascii-engine.js` (append after Task 4's additions)

**Interfaces:**
- Consumes: `mulberry32`, `ticker`, `prefersReducedMotion`,
  `mascotBuildBody`, `mascotBuildStrays`, `mascotFormationProgress`,
  `mascotPartProgress`, `MASCOT_STAGGER`, `mascotNextGlanceWait`,
  `mascotGlanceAmount`, `MASCOT_GLANCE_DURATION_S`,
  `mascotNextEncounterWait`, `mascotEncounterDuration`,
  `MASCOT_ENCOUNTER_TYPES`, `mascotCursorAttention`, `mascotAlertAmount`,
  `MASCOT_ALERT_HOLD_S`, and the non-exported module-scope constants
  `MASCOT_ALERT_IN_S`/`MASCOT_ALERT_OUT_S` (defined in Task 3's addition,
  reachable because everything lives in one file) — all from Tasks 1-4,
  same file, no import needed.
- Produces: `export class AsciiMascot` with constructor
  `(canvas, opts = { getInkColor?, getAccentColor?, seed? })`, and
  instance methods `resize()`, `start()`, `stop()`, `destroy()`,
  `setPointer(px, py)` (raw viewport pixels), `triggerReaction()`. This
  task implements everything except `_render` (Task 6 adds that) — for
  now `_frame` ends by calling `this._render(...)`, a method that Task 6
  defines; this task's own manual check is limited to confirming no
  console errors on construction (a stub `_render` is added temporarily
  and removed by Task 6's edit).

This task is not independently unit-testable end-to-end (it depends on
`ResizeObserver`/`getBoundingClientRect`, real DOM APIs unavailable in
plain Node) — its correctness is exercised in the browser starting in
Task 6, where the full class first renders something. This task's own
verification is a quick manual sanity check that the file still parses
and loads without errors.

- [ ] **Step 1: Append the class shell + state machine to `ascii-engine.js`**

Append after `mascotBuildStrays`'s closing `}` (the end of Task 4's
addition):

```js

export class AsciiMascot{
  constructor(canvas, opts = {}){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.getInkColor = opts.getInkColor || (() => '#15150F');
    this.getAccentColor = opts.getAccentColor || (() => '#CBFF3D');
    this.reduced = prefersReducedMotion();
    this.isMobile = window.innerWidth < 720;

    const rnd = mulberry32(opts.seed || 4242);
    this.body = mascotBuildBody(rnd);
    this.strays = mascotBuildStrays(rnd, 25);

    this.time = 0;
    this.p = 0; // last computed global formation progress, 0..1
    this.pointerX = -9999; this.pointerY = -9999; // off-canvas until first move

    this._nextGlanceIn = mascotNextGlanceWait(Math.random);
    this._glanceElapsed = -1; // -1 = no glance in progress
    this._glanceTargetIdx = 0;

    this._nextEncounterIn = mascotNextEncounterWait(Math.random);
    this._encounter = null; // { strayIdx, type, elapsed }

    this._alertElapsed = -1; // -1 = not alerted

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

  /** px/py are raw viewport pixel coordinates (not normalized), since
   *  distance is compared against this canvas's own bounding rect. */
  setPointer(px, py){ this.pointerX = px; this.pointerY = py; }

  /** Called on click or Enter/Space activation of the hit-target button. */
  triggerReaction(){
    if(this.reduced){
      // no animated ease under reduced motion — jump straight to the
      // held "looking at you" pose as a static state change
      this._alertElapsed = 3.8; // MASCOT_ALERT_IN_S + a moment into the hold
      this._frame(0.05);
      return;
    }
    this._alertElapsed = 0; // (re)start the alert timeline; refresh, not stack
  }

  _frame(dtIn){
    const dt = this.reduced ? 0.05 : dtIn;
    this.time += dt;
    const t = this.time;
    const { w, h } = this;
    if(!w || !h) return;

    const rect = this.canvas.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    this.p = this.reduced ? 1 : mascotFormationProgress(rect.top, vh);
    const p = this.p;

    const alerted = this._alertElapsed >= 0;
    const encountering = !!this._encounter;

    // --- idle glance scheduling (suppressed while alerted or mid-encounter) ---
    if(!this.reduced && !alerted && !encountering){
      if(this._glanceElapsed >= 0){
        this._glanceElapsed += dt;
        if(this._glanceElapsed > MASCOT_GLANCE_DURATION_S){
          this._glanceElapsed = -1;
          this._nextGlanceIn = mascotNextGlanceWait(Math.random);
        }
      } else {
        this._nextGlanceIn -= dt;
        if(this._nextGlanceIn <= 0){
          this._glanceElapsed = 0;
          this._glanceTargetIdx = Math.floor(Math.random() * this.strays.length);
        }
      }
    }
    const glanceAmount = (!alerted && !encountering && this._glanceElapsed >= 0)
      ? mascotGlanceAmount(this._glanceElapsed) : 0;

    // --- stray encounter scheduling (suppressed while alerted; clicking cancels one in progress) ---
    if(alerted){
      this._encounter = null;
    } else if(this._encounter){
      this._encounter.elapsed += dt;
      if(this._encounter.elapsed > mascotEncounterDuration(this._encounter.type)){
        this._encounter = null;
        this._nextEncounterIn = mascotNextEncounterWait(Math.random);
      }
    } else if(!this.reduced) {
      this._nextEncounterIn -= dt;
      if(this._nextEncounterIn <= 0){
        const type = MASCOT_ENCOUNTER_TYPES[Math.floor(Math.random() * MASCOT_ENCOUNTER_TYPES.length)];
        const strayIdx = Math.floor(Math.random() * this.strays.length);
        this._encounter = { strayIdx, type, elapsed: 0 };
      }
    }

    // --- cursor attention -> head pull only, NEVER an intensity/brightness term ---
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const dist = Math.hypot(this.pointerX - cx, this.pointerY - cy);
    const attention = this.reduced ? 0 : mascotCursorAttention(dist);
    let pullX = 0, pullY = 0;
    if(attention > 0.001){
      const d = dist || 1;
      pullX = ((this.pointerX - cx) / d) * attention * 0.05;
      pullY = ((this.pointerY - cy) / d) * attention * 0.05;
    }

    // --- click-triggered alert: look at cursor + straighten, overrides the ambient pull ---
    if(this._alertElapsed >= 0 && !this.reduced){
      this._alertElapsed += dt;
      const totalDur = MASCOT_ALERT_IN_S + MASCOT_ALERT_HOLD_S + MASCOT_ALERT_OUT_S;
      if(this._alertElapsed > totalDur) this._alertElapsed = -1;
    }
    const alertAmount = this._alertElapsed >= 0 ? mascotAlertAmount(this._alertElapsed) : 0;
    if(alertAmount > 0.001){
      const d = dist || 1;
      pullX = ((this.pointerX - cx) / d) * alertAmount * 0.10;
      pullY = ((this.pointerY - cy) / d) * alertAmount * 0.10;
    }

    this._render(p, t, glanceAmount, pullX, pullY, alertAmount);
  }
}
```

- [ ] **Step 2: Add a temporary `_render` stub so the file has no dangling reference**

Immediately before the class's final closing `}` (i.e., right after the
`_frame` method's closing `}`), add:

```js

  _render(){ /* replaced by Task 6 */ }
```

- [ ] **Step 3: Verify the file still loads without a syntax error**

Run: `node -e "import('./ascii-engine.js').then(() => console.log('ascii-engine.js loads OK'))"`
Expected: prints `ascii-engine.js loads OK` with no errors.

- [ ] **Step 4: Run the existing math tests to confirm no regression**

Run: `node mascot.test.js`
Expected: still `34 passing` (this task added no new pure functions, only
the class, which isn't imported by the test file).

- [ ] **Step 5: Commit**

```bash
git add ascii-engine.js
git commit -m "Add AsciiMascot class state machine (formation, idle, encounters, cursor, alert)"
```

---

## Task 6: `AsciiMascot` rendering + manual visual verification

**Files:**
- Modify: `ascii-engine.js` (replace the `_render` stub from Task 5)

**Interfaces:**
- Consumes: everything from Task 5's `AsciiMascot` instance state
  (`this.body`, `this.strays`, `this._glanceTargetIdx`, `this._encounter`,
  `MASCOT_STAGGER`, `mascotPartProgress`, `mascotFlickerIntensity`, `lerp`,
  `smoothstep` — all already in scope in the same file).
- Produces: the real `_render(p, t, glanceAmount, headPullX, headPullY,
  alertAmount)` method — no new public interface beyond what Task 5
  already defined; later tasks only ever call `start()`/`stop()`/
  `setPointer()`/`triggerReaction()`.

- [ ] **Step 1: Replace the `_render` stub with the real renderer**

Find the stub added in Task 5:

```js
  _render(){ /* replaced by Task 6 */ }
```

Replace it with:

```js
  _render(p, t, glanceAmount, headPullX, headPullY, alertAmount){
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.font = "700 11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const inkColor = this.getInkColor();
    const accentColor = this.getAccentColor();
    const chars = ' .:-=+*#%@';
    const scale = Math.min(w, h) * 0.42;
    const cx = w / 2, cy = h * 0.58;
    const glanceTarget = this.strays[this._glanceTargetIdx];

    for(const pt of this.body){
      const partP = mascotPartProgress(p, MASCOT_STAGGER[pt.part] || 0);
      const swayAmp = pt.part === 'head' ? 0.02 : (pt.part === 'torso' ? 0.012 : 0.016);
      const swaySpeed = pt.part === 'head' ? 0.5 : (pt.part === 'torso' ? 0.35 : 0.42);
      const idleAmp = smoothstep(0.85, 1, p) * (1 - alertAmount * 0.7);

      let ox = lerp(pt.scatterX, pt.x, partP);
      let oy = lerp(pt.scatterY, pt.y, partP);
      ox += Math.sin(t * swaySpeed + pt.jitterSeed) * swayAmp * idleAmp;
      oy += Math.cos(t * swaySpeed * 0.9 + pt.jitterSeed * 1.3) * swayAmp * idleAmp;

      if(pt.part === 'head'){
        if(glanceAmount > 0 && glanceTarget){
          ox += (glanceTarget.homeX - pt.x) * 0.15 * glanceAmount;
          oy += (glanceTarget.homeY - pt.y) * 0.15 * glanceAmount;
        }
        ox += headPullX; oy += headPullY;
      }

      let intensity = (0.35 + partP * 0.5) * (pt.faint ? 0.35 : 1);
      if(pt.flicker) intensity *= mascotFlickerIntensity(partP, pt.jitterSeed);
      if(intensity <= 0.03) continue;

      const idx = Math.max(0, Math.min(chars.length - 1, Math.floor(intensity * (chars.length - 1))));
      ctx.globalAlpha = Math.min(1, intensity + 0.15);
      ctx.fillStyle = pt.accent ? accentColor : inkColor;
      ctx.fillText(chars[idx], cx + ox * scale, cy + oy * scale);
    }

    for(let i = 0; i < this.strays.length; i++){
      const s = this.strays[i];
      let hx, hy;
      if(this._encounter && this._encounter.strayIdx === i){
        const { type, elapsed } = this._encounter;
        const phase = mascotEncounterPhase(type, elapsed);
        const targetPt = (type === 'nudge' || type === 'catch')
          ? this.body.find((b) => (type === 'nudge' ? b.isFoot : b.isHand) && b.part === (type === 'nudge' ? 'legR' : 'armR'))
          : null;
        const targetX = targetPt ? targetPt.x : 0;
        const targetY = targetPt ? targetPt.y - 0.1 : -0.75;
        if(phase.phase === 'hold'){
          hx = targetX; hy = targetY;
        } else {
          hx = lerp(s.homeX, targetX, phase.amount);
          hy = lerp(s.homeY, targetY, phase.amount);
        }
      } else {
        const wander = 1 - p * s.settle;
        hx = s.homeX + Math.sin(t * s.speed + s.phase) * s.amp * wander;
        hy = s.homeY + Math.cos(t * s.speed * 0.8 + s.phase * 1.4) * s.amp * wander;
      }

      const intensity = 0.18 + 0.1 * Math.sin(t * 0.6 + s.jitterSeed);
      if(intensity <= 0.03) continue;
      const idx = Math.max(0, Math.min(chars.length - 1, Math.floor(intensity * (chars.length - 1))));
      ctx.globalAlpha = Math.min(1, intensity + 0.1);
      ctx.fillStyle = inkColor;
      ctx.fillText(chars[idx], cx + hx * scale, cy + hy * scale);
    }
    ctx.globalAlpha = 1;
  }
```

- [ ] **Step 2: Run the math tests to confirm no regression**

Run: `node mascot.test.js`
Expected: still `34 passing` (rendering isn't part of the pure-math test
file).

- [ ] **Step 3: Commit**

```bash
git add ascii-engine.js
git commit -m "Add AsciiMascot rendering"
```

Manual visual verification of this class happens once Tasks 7-8 wire it
into the actual page — there is no visible mascot until the DOM/CSS/main.js
integration exists, so full visual confirmation is deferred to Task 9.

---

## Task 7: HTML/CSS integration

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `i18n.js`

**Interfaces:**
- Consumes: nothing from prior tasks directly (this is markup/styling).
- Produces: `#mascot-canvas` (canvas element), `#mascot-hit` (button
  element with `data-i18n-aria="mascot.ariaLabel"`), `.mascot`/
  `.mascot__hit` CSS classes, and the `mascot.ariaLabel` i18n key —
  Task 8's `main.js` wiring consumes these exact ids/classes.

- [ ] **Step 1: Add the mascot markup to `index.html`**

Find this block (the footer inside the contact section):

```html
      <div class="site-footer">
        <span>© 2026 NJORD Studio</span>
        <span data-i18n="footer.tagline">Web & Branding Studio</span>
      </div>
```

Replace it with:

```html
      <div class="site-footer">
        <div class="mascot">
          <canvas id="mascot-canvas" aria-hidden="true"></canvas>
          <button id="mascot-hit" class="mascot__hit" type="button" data-i18n-aria="mascot.ariaLabel"></button>
        </div>
        <span>© 2026 NJORD Studio</span>
        <span data-i18n="footer.tagline">Web & Branding Studio</span>
      </div>
```

- [ ] **Step 2: Add the `mascot.ariaLabel` translation to `i18n.js`**

Find this line:

```js
  'footer.tagline': { en: 'Web & Branding Studio', sq: 'Studio Web & Brendi' },
```

Replace it with:

```js
  'mascot.ariaLabel': {
    en: "A small figure formed from the page's own characters",
    sq: 'Një figurë e vogël e formuar nga vetë karakteret e faqes',
  },
  'footer.tagline': { en: 'Web & Branding Studio', sq: 'Studio Web & Brendi' },
```

- [ ] **Step 3: Add the mascot CSS to `style.css`**

Find this block:

```css
.site-footer{
  display: flex; justify-content: space-between; align-items: center;
  gap: 1rem; flex-wrap: wrap;
  padding-top: clamp(2rem, 5vw, 3.5rem);
  margin-top: clamp(2rem, 5vw, 3.5rem);
  border-top: 1px solid var(--line);
  font-family: var(--f-mono);
  font-size: var(--fs-micro);
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
```

Replace it with (adds `position: relative` and the two new rule blocks
right after it):

```css
.site-footer{
  position: relative;
  display: flex; justify-content: space-between; align-items: center;
  gap: 1rem; flex-wrap: wrap;
  padding-top: clamp(2rem, 5vw, 3.5rem);
  margin-top: clamp(2rem, 5vw, 3.5rem);
  border-top: 1px solid var(--line);
  font-family: var(--f-mono);
  font-size: var(--fs-micro);
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
/* a small, easily-missed inhabitant straddling the footer's own top
   border line — see docs/superpowers/specs/2026-09-17-ascii-mascot-design.md.
   Sized/positioned by eye, same practice as this file's other
   hand-tuned values (e.g. .work-row:last-child's padding-bottom). */
.mascot{
  position: absolute;
  left: 0;
  bottom: calc(100% - 22px);
  width: 72px;
  height: 96px;
  pointer-events: none;
}
.mascot canvas{ position: absolute; inset: 0; width: 100%; height: 100%; }
.mascot__hit{
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: auto;
  cursor: pointer;
}
@media (max-width: 640px){
  .mascot{ width: 56px; height: 76px; }
}
```

- [ ] **Step 4: Manual check — confirm the page still loads and nothing broke**

Start the dev server if it isn't already running:

```bash
python _dev_server.py
```

Using the Claude-in-Chrome browser tool, navigate to `http://localhost:8080/`,
scroll to the contact section, and confirm:
- The footer (`© 2026 NJORD Studio` / `Web & Branding Studio`) still
  renders in its normal two-column layout, unchanged.
- A small blank canvas area sits just above the footer's top border line
  on the left — it will render nothing visible yet only if the mascot
  never assembles anything at rest; if you see faint scattered characters
  there already, that's the mascot's Task 5/6 code correctly running
  once `main.js` is wired up next (Task 8) — if Task 8 hasn't happened
  yet, this area is inert (no canvas content) since nothing has
  constructed an `AsciiMascot` instance or called `.start()` yet.
- Tab through the page's interactive elements and confirm a focus
  stop now exists in the footer area (the new `#mascot-hit` button) even
  though it currently does nothing on click yet.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css i18n.js
git commit -m "Add mascot markup, styling, and aria-label translation"
```

---

## Task 8: `main.js` wiring

**Files:**
- Modify: `main.js`

**Interfaces:**
- Consumes: `AsciiMascot` (from `ascii-engine.js`), `whenVisible`,
  `inkColor`, `isFinePointer` — all already defined/imported earlier in
  `main.js` (see Step 1 for the exact import-line change).
- Produces: a running mascot on the live page — no further public
  interface; this is the final integration point.

- [ ] **Step 1: Add `AsciiMascot` to the existing import from `ascii-engine.js`**

Find this line near the top of `main.js`:

```js
import {
  prefersReducedMotion, whenVisible,
  AsciiOrganism, StaticGlyphField, FormationPortrait,
} from './ascii-engine.js';
```

Replace it with:

```js
import {
  prefersReducedMotion, whenVisible,
  AsciiOrganism, StaticGlyphField, FormationPortrait, AsciiMascot,
} from './ascii-engine.js';
```

- [ ] **Step 2: Append the mascot wiring at the end of `main.js`**

Find the end of the file (the contact-form block added earlier, which
currently ends with):

```js
    }finally{
      submitBtn.disabled = false;
    }
  });
}
```

Append immediately after that closing `}`:

```js

/* ---------------------------------------------------------------
   Mascot — a small, independent inhabitant near the contact section's
   footer (see ascii-engine.js's AsciiMascot and
   docs/superpowers/specs/2026-09-17-ascii-mascot-design.md). Entirely
   separate from the main organism above: its own canvas, its own tiny
   particle pool, its own click reaction. No real assistant/helper
   logic yet — triggerReaction() is a placeholder look-at-cursor pose.
   --------------------------------------------------------------- */
const mascotCanvas = document.getElementById('mascot-canvas');
const mascotHit = document.getElementById('mascot-hit');
if(mascotCanvas){
  const mascot = new AsciiMascot(mascotCanvas, {
    getInkColor: inkColor,
    getAccentColor: () => getComputedStyle(document.documentElement).getPropertyValue('--signal').trim(),
  });
  whenVisible(mascotCanvas, () => mascot.start(), () => mascot.stop());

  if(isFinePointer){
    window.addEventListener('pointermove', (e) => {
      mascot.setPointer(e.clientX, e.clientY);
    }, { passive: true });
  } else {
    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if(!t) return;
      mascot.setPointer(t.clientX, t.clientY);
    }, { passive: true });
  }

  if(mascotHit){
    mascotHit.addEventListener('click', () => mascot.triggerReaction());
  }
}
```

- [ ] **Step 3: Manual check — confirm the mascot now assembles and reacts**

With `python _dev_server.py` running, use the Claude-in-Chrome browser
tool to open `http://localhost:8080/` and:

1. Scroll slowly down toward the contact section and watch the small area
   just above the footer's left side — confirm scattered characters
   gradually organize into a small humanoid shape as you approach, with
   the head resolving before the left arm/leg.
2. Confirm loose stray characters keep drifting near him once formed.
3. Move the mouse near him and confirm his head subtly turns toward the
   cursor, with no brightness change anywhere on his body.
4. Click him (or Tab to `#mascot-hit` and press Enter) and confirm he
   turns to face the cursor and straightens, holding briefly before
   easing back to idle — no text, no popup.
5. Scroll back up and confirm he dissolves back into scattered
   characters the same way he formed.

- [ ] **Step 4: Commit**

```bash
git add main.js
git commit -m "Wire AsciiMascot into main.js"
```

---

## Task 9: Full end-to-end verification + HANDOFF.md

**Files:**
- Modify: `HANDOFF.md`

**Interfaces:** None — this is verification and documentation only.

- [ ] **Step 1: Run the full manual verification checklist**

With `python _dev_server.py` running, use the Claude-in-Chrome browser
tool against `http://localhost:8080/` to work through every item below
(this is the spec's own testing plan in full):

1. Scroll slowly into `#contact` and confirm the four staging looks
   (scattered → vague → recognizable → formed) read distinctly, that the
   head settles before the left arm/leg, that the `legL`/`armL`
   flicker-dropout is visible but reads as "still assembling" rather
   than broken, and that scrolling back up dissolves him in reverse.
2. Confirm stray characters remain visibly wandering near him after full
   formation, and that the green accent point reads as an off-center
   artifact, not a centered eye/face.
3. Sit still once formed for 15-30+ seconds and confirm: calm sway, at
   least one occasional glance toward a nearby stray, and at least one
   stray encounter (watch/nudge/catch) playing out as a rare, noticed
   moment rather than a repeating tic.
4. Move the cursor toward him from a distance and confirm continuous
   (not stepped) head-tracking with zero brightness/intensity change
   anywhere on his body.
5. Click him (mouse) and Tab+Enter him (keyboard) and confirm he looks
   at the cursor and straightens, holds a few seconds, and eases back;
   confirm rapid repeat activation refreshes rather than stacks.
6. Confirm a visible `:focus-visible` outline appears on Tab.
7. Emulate `prefers-reduced-motion: reduce` (Chrome DevTools rendering
   tab) and confirm he appears instantly fully-formed and idle-static,
   with no scroll-driven assembly, and that clicking him still shows a
   static "looking at you" pose change rather than nothing at all.
8. Resize/emulate a mobile width (< 720px) and confirm he doesn't clip
   or overlap the footer text.
9. Toggle OS/browser dark mode and confirm his ink and accent colors
   swap automatically (no hardcoded hex colors were used).
10. Confirm the existing GLOBE closing reformation, the ambient particle
    field, the footer layout, and the contact form are all visually
    unchanged from before this feature.

Fix anything that fails before proceeding — if a fix is needed, make it
directly in `ascii-engine.js`/`style.css` and re-run this checklist; no
separate task number is needed for small fixes found here.

- [ ] **Step 2: Document the feature in `HANDOFF.md`**

Find this section header:

```
## Internationalization (`i18n.js`, wired from `main.js`)
```

Insert a new section immediately before it:

```markdown
## Contact-section mascot (`ascii-engine.js`'s `AsciiMascot`, wired from `main.js`)

- A small, independent inhabitant that assembles itself near the
  `#contact` footer's top border line as the visitor scrolls down —
  entirely separate from the main `AsciiOrganism` (its own canvas, its
  own ~47-point particle pool: 22 fixed body points + 25 ambient
  strays). See `docs/superpowers/specs/2026-09-17-ascii-mascot-design.md`
  for the full design rationale, including what was explicitly rejected
  (folding him into the shared organism's formation/zone system) and why.
- **Formation is scroll-driven and staggered, not uniform**: a global
  `mascotFormationProgress()` reads the mascot canvas's own
  `getBoundingClientRect()` (independent of the main organism's zone
  system), and each body part derives its own `mascotPartProgress()` from
  a fixed per-part stagger offset (`MASCOT_STAGGER`) so the head resolves
  first and the left arm/leg noticeably lag the right — deliberately
  asymmetric, so he reads as the ASCII field "figuring out how to
  assemble him" rather than a uniform particle-morph preset. Two points
  (one on `armL`, one on `legL`) additionally flicker near-invisible
  partway through their own formation window (`mascotFlickerIntensity()`)
  before locking in solid. Reversible by construction — scrolling back up
  runs every progress value back down through the same formulas.
- **The signal-green point is deliberately not an eye** — it's one head
  corner, off-center, meant to read as a stray environmental fragment
  lodged in him. The face is at most two very faint interior head points;
  never bold enough to read as an expression. This was an explicit
  correction during design review: an earlier draft centered the green
  point as an "eye," which read as a generic cute-robot mascot instead of
  an imperfect little person made of the site's own material.
- **Idle personality**: a continuous small sway on every body point
  (varying per body part so it doesn't move as one rigid unit), plus an
  occasional (~6-11s) "glance" where his head briefly targets a random
  nearby stray particle. Separately, roughly every 15-30s, he has a rare
  "stray encounter" (`watch`, `nudge`, or `catch`, chosen at random) where
  one wandering stray approaches him, he reacts (watches it, nudges it
  with a foot, or briefly catches it in a hand), then it drifts back to
  its normal wandering — the thing that's meant to sell "he belongs to
  the ASCII environment" rather than sitting next to it.
- **Cursor awareness is movement-only, never brightness.** A continuous
  (never thresholded) `mascotCursorAttention()` value pulls his head
  toward the cursor as it nears; this was an explicit post-review removal
  of an earlier "brightens near the cursor" effect, which read as a UI
  hover state (a button lighting up) rather than a creature noticing you.
- **Click reaction is a placeholder built to be extended, not thrown
  away**: clicking (or Enter/Space on the real `#mascot-hit` button)
  makes him look directly at the cursor and "straighten up" — a stronger,
  held version of the ambient cursor pull — for a few seconds, then ease
  back to idle. No text, no popup, no chat bubble. This exact "alerted,
  looking at you" state is meant to become the entry point for a future
  real helper interaction (idle → clicked → notices you → conversation
  begins) — that conversation itself has not been built.
- **Accessibility**: the canvas is `aria-hidden="true"`; a real,
  transparent, focusable `<button id="mascot-hit">` (`data-i18n-aria`
  translated via the new `mascot.ariaLabel` i18n key) sits exactly over
  it and carries the click/keyboard interaction, getting the site's
  existing `:focus-visible` treatment for free — same pattern the project
  modal's decorative-canvas-plus-real-button already uses elsewhere.
- **Reduced motion / mobile**: under `prefers-reduced-motion`, renders one
  static fully-formed frame immediately (no scroll-driven assembly, no
  idle timers running); clicking still shows a static "looking at you"
  pose change rather than nothing, so the interaction isn't silently
  dead for those users. `devicePixelRatio` capped the same way as every
  other canvas in `ascii-engine.js` (2 desktop / 1 mobile).
- **Testing**: pure formation/timing/geometry math lives in standalone
  exported functions (`mascotFormationProgress`, `mascotPartProgress`,
  `mascotFlickerIntensity`, glance/encounter timing, `mascotCursorAttention`,
  `mascotAlertAmount`, `mascotBuildBody`/`mascotBuildStrays`) and is
  covered by `mascot.test.js` (`node mascot.test.js`, no framework, uses
  `node:assert/strict` — this required adding a root `package.json` with
  `"type": "module"` so Node treats these `.js` files as ES modules; this
  has no effect on the browser or the Artifact publish). Rendering and
  live interaction (assembly feel, idle personality, cursor tracking,
  click reaction, dark mode, reduced motion, mobile width) were verified
  manually via the local dev server, not the claude.ai Artifact preview.
```

- [ ] **Step 3: Update the local-files list at the top of `HANDOFF.md`**

Find this line near the top of the file:

```
**Local files:** `C:\Users\pinkj\ClaudeProjects\njord\` — `index.html`, `style.css`, `ascii-engine.js`, `audio-engine.js` (A1), `audio-engine-a2.js` (A2, currently live), `i18n.js`, `main.js`, `_dev_server.py` (self-hosting only, see its own section — never used by the claude.ai artifact)
```

Replace it with:

```
**Local files:** `C:\Users\pinkj\ClaudeProjects\njord\` — `index.html`, `style.css`, `ascii-engine.js`, `audio-engine.js` (A1), `audio-engine-a2.js` (A2, currently live), `i18n.js`, `main.js`, `_dev_server.py` (self-hosting only, see its own section — never used by the claude.ai artifact), `package.json` + `mascot.test.js` (Node-only test infra for the mascot's pure math, not published to the Artifact)
```

- [ ] **Step 4: Republish the artifact**

```
Artifact({
  file_path: "C:\\Users\\pinkj\\ClaudeProjects\\njord\\index.html",
  url: "https://claude.ai/code/artifact/678ce4de-39aa-4655-8153-3fbd15886fbb",
  root: "C:\\Users\\pinkj\\ClaudeProjects\\njord",
  files: { "style.css": "style.css", "ascii-engine.js": "ascii-engine.js", "audio-engine.js": "audio-engine.js", "audio-engine-a2.js": "audio-engine-a2.js", "i18n.js": "i18n.js", "main.js": "main.js" }
})
```

(`package.json` and `mascot.test.js` are Node-only test infra — they are
never part of the `files` map and are not published to the Artifact.)

- [ ] **Step 5: Commit**

```bash
git add HANDOFF.md
git commit -m "Document the contact-section mascot in HANDOFF.md"
```
