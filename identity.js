/* ================================================================
   NJORD — "01 / IDENTITY" section.

   A single scroll-scrubbed sequence (not stacked entrance animations)
   that builds a fictional fragrance house, AERA, live in front of the
   visitor — and, crucially, hands the whole environment over from
   NJORD's own visual language to AERA's as it goes: idea → naming →
   logo → typography → color → brand system → application → website.
   Progress is derived every frame from the section's own real
   getBoundingClientRect(), same pattern as the Services roadmap's
   scroll-driven typewriter in main.js — no scroll-jacking.
   ================================================================ */
import { ticker, whenVisible, prefersReducedMotion } from './ascii-engine.js';

const NAMES = ['AER_', 'AERA', 'ÆRA', 'AER', 'AERA'];
const FINAL_NAME = 'AERA™';

// [start, end] of each beat across the section's own 0–1 scroll progress.
// Deliberately overlapping so beats crossfade into each other rather than
// hard-cutting — this is one continuous read, not eight separate slides.
const RANGES = {
  intro:    [0.000, 0.085],
  naming:   [0.055, 0.230],
  logo:     [0.150, 0.360],
  type:     [0.320, 0.520],
  color:    [0.475, 0.645],
  assembly: [0.610, 0.860],
  message:  [0.820, 0.900],
  next:     [0.905, 1.000],
};

// How much of the environment has been "taken over" by AERA at a given
// point on the timeline — 0 = pure NJORD, 1 = pure AERA. Ramps hardest
// during the color beat (the brief's "dramatic transformation" moment),
// holds at full AERA through assembly/message, then eases back down as
// the website mock is all that's left, handing a NJORD-toned page to
// whatever section follows.
const TAKE_KEYFRAMES = [
  [0.000, 0.00],
  [0.180, 0.00],
  [0.360, 0.35],
  [0.520, 0.55],
  [0.645, 1.00],
  [0.860, 1.00],
  [0.930, 1.00],
  [1.000, 0.15],
];

function windowOpacity(t, [a, b], fadeFrac = 0.16) {
  if (t <= a || t >= b) return 0;
  const span = b - a;
  const fadeIn = a + span * fadeFrac;
  const fadeOut = b - span * fadeFrac;
  if (t < fadeIn) return (t - a) / (fadeIn - a);
  if (t > fadeOut) return 1 - (t - fadeOut) / (b - fadeOut);
  return 1;
}

const smoothstep = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;

function takeAt(t) {
  for (let i = 1; i < TAKE_KEYFRAMES.length; i++) {
    const [t0, v0] = TAKE_KEYFRAMES[i - 1];
    const [t1, v1] = TAKE_KEYFRAMES[i];
    if (t <= t1) return lerp(v0, v1, smoothstep(clamp01((t - t0) / (t1 - t0))));
  }
  return TAKE_KEYFRAMES[TAKE_KEYFRAMES.length - 1][1];
}

export function initIdentity() {
  const section = document.getElementById('identity');
  if (!section) return;
  const view = document.getElementById('identity-view');
  const wordEl = document.getElementById('id-naming-word');
  const reduced = prefersReducedMotion();
  const isMobile = () => window.innerWidth < 720;

  const layers = {};
  section.querySelectorAll('[data-layer]').forEach((el) => {
    layers[el.dataset.layer] = el;
  });

  const mocks = Array.from(section.querySelectorAll('.id-mock'));
  const websiteMock = section.querySelector('.id-mock--website');
  const logoLetters = section.querySelectorAll('.id-logo__letter');
  const logoGuides = section.querySelector('#id-logo-guides');
  const logoMono = section.querySelector('#id-logo-mono use');
  const typeWords = section.querySelectorAll('.id-type__word');
  const hierarchyTiers = section.querySelectorAll('.id-type__hierarchy span');
  const colorPanels = section.querySelectorAll('.id-color__panel');
  const colorChips = section.querySelector('#id-color-chips');
  const markV = section.querySelector('#id-mark-v');
  const markH = section.querySelector('#id-mark-h');

  const tierByWordIndex = ['display', 'display', 'editorial', 'display', 'detail'];

  let mouseX = 0, mouseY = 0;
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (fine) {
    window.addEventListener('pointermove', (e) => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  function setReducedFrame() {
    Object.entries(layers).forEach(([key, el]) => {
      el.style.opacity = key === 'message' ? '1' : '0';
    });
    wordEl.textContent = FINAL_NAME;
    wordEl.classList.add('is-locked');
    view.style.setProperty('--take', '1');
    logoLetters.forEach((l) => { l.style.opacity = '1'; l.style.transform = 'none'; });
    if (logoMono) logoMono.style.opacity = '1';
    colorPanels.forEach((p) => { p.style.setProperty('--wx', '0%'); });
    if (colorChips) colorChips.classList.add('is-visible');
  }

  function update() {
    const rect = section.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const t = total > 0 ? clamp01(-rect.top / total) : 0;

    if (reduced) { setReducedFrame(); return; }

    view.style.setProperty('--take', takeAt(t).toFixed(3));

    Object.entries(layers).forEach(([key, el]) => {
      if (key === 'assembly' || key === 'next') return;
      const op = windowOpacity(t, RANGES[key]);
      el.style.opacity = op.toFixed(3);
      el.style.pointerEvents = op > 0.4 ? 'auto' : 'none';
    });

    // --- 1. intro: the point grows its own cross before naming starts -
    const [ia, ib] = RANGES.intro;
    if (markV && markH) {
      const it = clamp01((t - ia) / (ib - ia));
      const len = 30 * it;
      markV.setAttribute('y1', 50 - len); markV.setAttribute('y2', 50 + len);
      markH.setAttribute('x1', 50 - len); markH.setAttribute('x2', 50 + len);
    }

    // --- 2. naming: rapid exploration, then a permanent lock ----------
    const [na, nb] = RANGES.naming;
    if (t <= na) {
      wordEl.textContent = NAMES[0];
      wordEl.classList.remove('is-locked');
    } else if (t >= nb) {
      wordEl.textContent = FINAL_NAME;
      wordEl.classList.add('is-locked');
    } else {
      const nt = (t - na) / (nb - na);
      if (nt > 0.97) {
        wordEl.textContent = FINAL_NAME;
        wordEl.classList.add('is-locked');
      } else {
        wordEl.classList.remove('is-locked');
        const idx = Math.min(NAMES.length - 1, Math.floor((nt / 0.8) * NAMES.length));
        wordEl.textContent = NAMES[idx];
      }
    }

    // --- 3. logo: guides burn off, letters resolve individually, then --
    //     the monogram is derived from the settled wordmark ------------
    const [la, lb] = RANGES.logo;
    const lt = clamp01((t - la) / (lb - la));
    if (logoGuides) logoGuides.style.opacity = String(Math.max(0, 1 - lt * 1.4));
    logoLetters.forEach((letter, i) => {
      const start = i * 0.07;
      const local = clamp01((lt - start) / 0.32);
      const eased = smoothstep(local);
      letter.style.opacity = eased.toFixed(3);
      letter.style.transform = `translateY(${(1 - eased) * 26}px) rotate(${(1 - eased) * (i % 2 ? 4 : -4)}deg)`;
    });
    if (logoMono) {
      const monoT = clamp01((lt - 0.72) / 0.28);
      logoMono.style.opacity = smoothstep(monoT).toFixed(3);
    }

    // --- 4. typography: words take over the viewport one at a time ----
    const [ta, tb] = RANGES.type;
    const ttAll = clamp01((t - ta) / (tb - ta));
    const nWords = typeWords.length;
    let activeTier = null;
    typeWords.forEach((word, i) => {
      const start = i / nWords;
      const end = (i + 1) / nWords;
      const local = clamp01((ttAll - start) / (end - start));
      const eased = windowOpacity(local, [0, 1], 0.25);
      word.style.opacity = eased.toFixed(3);
      word.style.transform = `translateY(${(1 - eased) * 18}px) scale(${lerp(0.94, 1, eased)})`;
      if (local > 0.15 && local < 0.9) activeTier = tierByWordIndex[i];
    });
    hierarchyTiers.forEach((tier) => {
      tier.classList.toggle('is-active', tier.dataset.tier === activeTier);
    });

    // --- 5. color: full-bleed panels physically take the viewport -----
    const [ca, cb] = RANGES.color;
    const ct = clamp01((t - ca) / (cb - ca));
    colorPanels.forEach((panel, i) => {
      const start = i * 0.22;
      const local = clamp01((ct - start) / 0.5);
      panel.style.setProperty('--wx', `${(1 - smoothstep(local)) * 100}%`);
    });
    if (colorChips) colorChips.classList.toggle('is-visible', ct > 0.85);

    // --- 6/9. assembly: staggered reveal + art-directed parallax -------
    if (mocks.length) {
      const [aa, ab] = RANGES.assembly;
      const at = clamp01((t - aa) / (ab - aa));
      const n = mocks.length;
      const [xa, xb] = RANGES.next;
      const collapseStart = xa - 0.05;
      const collapseT = clamp01((t - collapseStart) / (xb - collapseStart));

      const containerFadeIn = clamp01((t - (aa - 0.03)) / 0.05);
      layers.assembly.style.opacity = containerFadeIn.toFixed(3);
      layers.assembly.style.pointerEvents = containerFadeIn > 0.4 ? 'auto' : 'none';

      mocks.forEach((m, i) => {
        const start = (i / n) * 0.5;
        const localT = clamp01((at - start) / 0.4);
        const eased = smoothstep(localT);
        const isWebsite = m === websiteMock;
        const depth = parseFloat(m.dataset.depth || '1');

        if (fine && !isMobile()) {
          m.style.setProperty('--px', (mouseX * depth * 26).toFixed(1) + 'px');
          m.style.setProperty('--py', (mouseY * depth * 26).toFixed(1) + 'px');
        }

        if (isWebsite) {
          m.classList.toggle('is-hero', collapseT > 0.001);
          m.style.setProperty('--grow', collapseT.toFixed(3));
          m.style.opacity = Math.max(eased, collapseT).toFixed(3);
        } else {
          m.classList.remove('is-hero');
          m.style.opacity = (eased * (1 - collapseT)).toFixed(3);
        }
      });

      if (layers.next) {
        // One-sided fade-in that holds through the very end of the
        // section rather than symmetrically fading back out.
        const nextOp = clamp01((t - xa) / (xb - xa) / 0.3);
        layers.next.style.opacity = nextOp.toFixed(3);
      }
    }
  }

  whenVisible(section, () => ticker.add(update), () => ticker.remove(update));
  update();
}
