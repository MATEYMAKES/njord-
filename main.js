/* ================================================================
   NJORD — page logic: cursor, magnetism, hero choreography, work
   portals, project modal, contact.
   ================================================================ */
import {
  prefersReducedMotion, whenVisible,
  AsciiOrganism, StaticGlyphField, FormationPortrait,
} from './ascii-engine.js';
import { GenerativeAudio } from './audio-engine-a2.js'; // A2 (lighter) — A1 kept intact in audio-engine.js
import { t, getLang, setLang, applyStaticTranslations, onLangChange } from './i18n.js';

applyStaticTranslations(getLang());

const reduced = prefersReducedMotion();
const inkColor = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();

/* ---------------------------------------------------------------
   Custom cursor + magnetism (pointer devices only)
   --------------------------------------------------------------- */
const isFinePointer = window.matchMedia('(pointer: fine)').matches;

if(isFinePointer){
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  let cx = -100, cy = -100;
  window.addEventListener('pointermove', (e) => {
    cx = e.clientX; cy = e.clientY;
    dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
  }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    if(e.target.closest('a, button, .magnetic, .work-row')) dot.classList.add('is-hover');
  });
  document.addEventListener('pointerout', (e) => {
    if(e.target.closest('a, button, .magnetic, .work-row')) dot.classList.remove('is-hover');
  });
  window.addEventListener('pointerdown', () => dot.classList.add('is-down'));
  window.addEventListener('pointerup', () => dot.classList.remove('is-down'));

  if(!reduced){
    document.querySelectorAll('.magnetic').forEach((el) => {
      let raf = null;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = (e.clientX - (r.left + r.width / 2)) * 0.35;
        const my = (e.clientY - (r.top + r.height / 2)) * 0.35;
        if(raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => { el.style.transform = `translate(${mx}px, ${my}px)`; });
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
}

/* ---------------------------------------------------------------
   The ASCII organism — one persistent particle population for the
   whole page. It never respawns; it only ever retargets, cycling
   through GLOBE → CLOUD → DIAMOND → CLOUD → WAVE → CLOUD → NETWORK
   → CLOUD → CONSTELLATION → CLOUD → GLOBE as the visitor scrolls
   past each anchor below. CONSTELLATION (the studio section) used to
   be its own small standalone decorative canvas next to the studio
   copy — it's now just another formation the one organism resolves
   into, same as diamond/wave/network.
   --------------------------------------------------------------- */
const hero = document.getElementById('hero');
const heroWord = document.querySelector('.hero-word');
const organismCanvas = document.getElementById('ascii-organism');
let organism = null;

if(organismCanvas){
  organism = new AsciiOrganism(organismCanvas, { getInkColor: inkColor });
  organism.setZones([
    { name: 'globe', el: hero },
    { name: 'diamond', el: document.querySelector('.work-row[data-project="aurelia"]') },
    { name: 'wave', el: document.querySelector('.work-row[data-project="pulse"]') },
    { name: 'network', el: document.querySelector('.work-row[data-project="meridian"]') },
    { name: 'roadmap', el: document.getElementById('services'), ranged: true },
    { name: 'constellation', el: document.getElementById('studio') },
    { name: 'globe', el: document.getElementById('contact') },
  ].filter((z) => z.el));

  if(isFinePointer){
    window.addEventListener('pointermove', (e) => {
      organism.setPointer(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    }, { passive: true });
  } else {
    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if(!t) return;
      organism.setPointer(t.clientX / window.innerWidth, t.clientY / window.innerHeight);
    }, { passive: true });
  }

  organism.start();
}

/* ---------------------------------------------------------------
   Generative audio — one persistent, fully synthesized soundscape
   whose sonic state morphs with the organism's own scroll timeline
   (see audio-engine.js). Nothing is created and nothing plays until
   the visitor deliberately clicks the sound toggle, per autoplay
   policy — attaching the organism here only wires up the *reference*
   the audio engine will later poll, it does not start anything.
   --------------------------------------------------------------- */
const audio = new GenerativeAudio();
if(organism){
  audio.attachOrganism(organism);
  organism.setWaveformSource(() => audio.getPulseWaveform());
}

const soundToggle = document.getElementById('sound-toggle');
if(soundToggle){
  soundToggle.addEventListener('click', () => {
    const on = audio.toggle();
    soundToggle.classList.toggle('is-on', on);
    soundToggle.setAttribute('aria-pressed', String(on));
    const label = soundToggle.querySelector('.sound-toggle__label');
    if(label) label.textContent = on ? t('sound.on') : t('sound.off');
  });
}
window.addEventListener('pagehide', () => audio.destroy());

/* ---------------------------------------------------------------
   Language toggle — EN / SHQP. Shqip is the default language; the
   toggle just flips a stored preference and re-runs the same static
   translation pass, plus (via onLangChange below) refreshes the few
   strings that are set from JS rather than baked into the markup.
   --------------------------------------------------------------- */
const langToggle = document.getElementById('lang-toggle');
function updateLangToggleUI(lang){
  if(!langToggle) return;
  langToggle.querySelectorAll('.lang-toggle__opt').forEach((el) => {
    el.classList.toggle('is-active', el.dataset.lang === lang);
  });
}
updateLangToggleUI(getLang());
if(langToggle){
  langToggle.addEventListener('click', () => {
    setLang(getLang() === 'sq' ? 'en' : 'sq');
  });
}

/* ---------------------------------------------------------------
   Mobile nav — hamburger opens an off-canvas drawer (see style.css,
   max-width:640px). On desktop the nav links stay always-visible
   inline and this button is hidden by CSS, so none of this fires.
   --------------------------------------------------------------- */
const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');
const navScrim = document.querySelector('.nav-scrim');
function setNavOpen(open){
  if(!navToggle || !mainNav) return;
  navToggle.setAttribute('aria-expanded', String(open));
  mainNav.classList.toggle('is-open', open);
  if(navScrim) navScrim.classList.toggle('is-visible', open);
  document.body.classList.toggle('nav-open', open);
}
if(navToggle){
  navToggle.addEventListener('click', () => {
    setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true');
  });
}
if(navScrim) navScrim.addEventListener('click', () => setNavOpen(false));
if(mainNav){
  mainNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setNavOpen(false)));
}
window.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && navToggle && navToggle.getAttribute('aria-expanded') === 'true') setNavOpen(false);
});

if(hero){
  const onHeroScroll = () => {
    const vh = window.innerHeight;
    const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / (vh * 0.85)));
    if(heroWord) heroWord.style.opacity = String(Math.max(0, 1 - progress * 1.6));
    document.body.classList.toggle('is-past-hero', progress > 0.5);
  };
  window.addEventListener('scroll', onHeroScroll, { passive: true });
  onHeroScroll();
}

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
    const showFull = () => {
      nodeEls.forEach((el) => {
        const headEl = el.querySelector('.roadmap-node__heading');
        const supEl = el.querySelector('.roadmap-node__support');
        if(headEl) headEl.textContent = el.dataset.heading || '';
        if(supEl) supEl.textContent = el.dataset.support || '';
        el.classList.add('is-visible');
      });
    };
    showFull();
    onLangChange(() => { fillRoadmapDataset(); showFull(); });
  } else {
    let roadmapTicking = false;
    // Typing progress is driven by each node's OWN current on-screen
    // position (getBoundingClientRect), not by slicing the organism's
    // localT into per-node windows — that indirect approach didn't
    // account for the container's real height-to-viewport ratio, so
    // nodes (especially the last one) could sit blank for a while after
    // scrolling into view and not start typing until they'd already
    // scrolled most of the way back out near the top of the screen.
    // Tying it directly to the element's own rect fixes both problems
    // at once and, like everything else on this site, reverses cleanly
    // on scroll-up since it's recomputed fresh from real position every
    // frame rather than carrying any state of its own.
    const TYPE_START_FRAC = 0.8; // rect.top/vh when typing begins — just past halfway up from the bottom edge
    const TYPE_END_FRAC = 0.35;  // rect.top/vh when typing completes — settled in the upper-middle, well clear of the bottom
    function updateRoadmapTyping(){
      roadmapTicking = false;
      const vh = window.innerHeight || 1;
      nodeEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const raw = (TYPE_START_FRAC * vh - rect.top) / ((TYPE_START_FRAC - TYPE_END_FRAC) * vh);
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

/* ---------------------------------------------------------------
   Work — index glyphs + per-project ASCII texture washes + portals
   --------------------------------------------------------------- */
/* Title stays a proper noun in both languages; everything else is
   pulled from i18n.js per current language via projectCopy() below,
   so the modal — including one already open — can be re-rendered on
   a language switch without needing its own duplicated data here. */
const PROJECTS = {
  aurelia: { title: 'Aurelia', year: '2025', burstColor: '#3D7FF0', modalClass: 'project-modal--aurelia' },
  pulse: { title: 'Pulse', year: '2024', burstColor: '#7A1B33', modalClass: 'project-modal--pulse' },
  meridian: { title: 'Meridian', year: '2025', burstColor: '#1F4C78', modalClass: 'project-modal--meridian' },
};
function projectCopy(key){
  return {
    tagline: t(`project.${key}.tagline`),
    description: t(`project.${key}.description`),
    discipline: t(`project.${key}.discipline`),
    deliverables: t(`project.${key}.deliverables`),
    highlights: [t(`project.${key}.highlight1`), t(`project.${key}.highlight2`), t(`project.${key}.highlight3`)],
  };
}

// matches the work-row breakpoint (style.css, max-width:720px) where the
// canvas itself is hidden in favor of a plain static numeral (.work-row__index-num)
// — the animated glyph read as noisy clutter at the smaller mobile size,
// so mobile skips building/animating it at all rather than just calming
// it down
const isMobileGlyph = window.innerWidth < 720;
document.querySelectorAll('.work-row').forEach((row) => {
  const key = row.dataset.project;
  const idxCanvas = row.querySelector('.work-row__index canvas');

  let glyph = null;
  if(idxCanvas && !isMobileGlyph){
    glyph = new StaticGlyphField(idxCanvas, row.dataset.index, { color: inkColor });
    whenVisible(row, () => glyph.start(), () => glyph.stop());
  }

  row.addEventListener('click', (e) => openProject(key, row, e.clientX, e.clientY));
  row.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      const r = row.getBoundingClientRect();
      openProject(key, row, r.left + r.width / 2, r.top + r.height / 2);
    }
  });
});

/* Each row's natural height depends entirely on how many lines its
   description wraps to, which varies with content length AND with
   which language is active — not something that can be reliably
   predicted from CSS alone.
   First attempt forced a min-height on .work-row itself — but that's
   a 3-column CSS Grid container, and whether enlarging a grid
   container via min-height actually stretches its (single, auto-sized)
   row track to fill the extra space depends on align-content behavior
   that isn't safe to assume. Fixed by targeting .work-row__body instead
   — a plain block element, where min-height unambiguously grows its
   own box — and letting .work-row's height follow naturally, since a
   grid row is already sized to its tallest child (.work-row uses
   align-items:center, not stretch, so no ambiguity there either: body
   becomes the tallest item, the row's auto height simply matches it). */
const workRowBodies = document.querySelectorAll('.work-row__body');
if(workRowBodies.length > 1){
  const equalizeWorkRows = () => {
    workRowBodies.forEach((b) => { b.style.minHeight = ''; });
    let max = 0;
    workRowBodies.forEach((b) => { max = Math.max(max, b.getBoundingClientRect().height); });
    workRowBodies.forEach((b) => { b.style.minHeight = `${Math.ceil(max)}px`; });
  };
  equalizeWorkRows();
  window.addEventListener('load', equalizeWorkRows);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(equalizeWorkRows);
  onLangChange(() => setTimeout(equalizeWorkRows, 0));
  // brute-force retries: something about font/layout timing has made a
  // single measurement unreliable in practice, so re-measure repeatedly
  // for the first few seconds after load to catch whatever's late
  [100, 300, 600, 1000, 1800, 3000].forEach((ms) => setTimeout(equalizeWorkRows, ms));
  let workRowResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(workRowResizeTimer);
    workRowResizeTimer = setTimeout(equalizeWorkRows, 150);
  });
}

/* ---------------------------------------------------------------
   Project portal — the page loads in as a circle expanding from the
   exact point clicked, out to the edges (never a fade), while the
   organism explodes into the project's own color for the same
   duration — and since the page's background now matches that same
   color, the two read as one continuous event. Closing runs the
   identical circle backward, collapsing to the row it came from.
   --------------------------------------------------------------- */
const modal = document.getElementById('project-modal');
const main = document.getElementById('main');
let lastTrigger = null;
let currentProject = null;
let currentKey = null;
const PORTAL_MS = 600;

function openProject(key, triggerEl, clickX, clickY){
  const project = PROJECTS[key];
  if(!project) return;
  lastTrigger = triggerEl;
  const r = triggerEl.getBoundingClientRect();
  const cx = typeof clickX === 'number' ? clickX : r.left + r.width / 2;
  const cy = typeof clickY === 'number' ? clickY : r.top + r.height / 2;
  if(organism) organism.burst(project.burstColor);
  showModal(key, project, cx, cy);
}

// Shared by both the project pages and the (mobile-only) service pages
// below — same radial "portal" mechanic, just parameterized on which
// modal element it's animating, so the service pages get an identical
// open/close feel without duplicating this math.
function animatePageReveal(modalEl, cx, cy, mode){
  const vw = window.innerWidth, vh = window.innerHeight;
  const maxDist = Math.max(
    Math.hypot(cx, cy), Math.hypot(vw - cx, cy),
    Math.hypot(cx, vh - cy), Math.hypot(vw - cx, vh - cy),
  );
  const full = `circle(${Math.ceil(maxDist)}px at ${cx}px ${cy}px)`;
  const collapsed = `circle(0px at ${cx}px ${cy}px)`;

  if(mode === 'open'){
    modalEl.style.transition = 'none';
    modalEl.style.opacity = '1';
    modalEl.style.transform = 'none';
    modalEl.style.clipPath = collapsed;
    modalEl.classList.add('is-open');
    void modalEl.offsetWidth; // force the collapsed circle to paint before animating
    requestAnimationFrame(() => {
      modalEl.style.transition = `clip-path ${PORTAL_MS}ms var(--ease-out)`;
      modalEl.style.clipPath = full;
    });
  } else {
    modalEl.style.transition = `clip-path ${PORTAL_MS}ms var(--ease-out)`;
    modalEl.style.clipPath = collapsed;
  }
}

// Shared Tab-key focus trap, likewise parameterized on the modal element.
function trapTabKey(e, modalEl){
  if(e.key !== 'Tab') return;
  const focusables = modalEl.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if(!focusables.length) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
}

function showModal(key, project, cx, cy){
  currentProject = project;
  currentKey = key;
  const copy = projectCopy(key);
  modal.className = `project-modal ${project.modalClass}`;
  modal.querySelector('.project-modal__eyebrow').textContent = project.title.toUpperCase();
  modal.querySelector('.project-modal__title').textContent = project.title;
  modal.querySelector('.project-modal__tag').textContent = copy.tagline;
  modal.querySelector('.project-modal__desc').textContent = copy.description;
  modal.querySelector('[data-meta="discipline"]').textContent = copy.discipline;
  modal.querySelector('[data-meta="year"]').textContent = project.year;
  modal.querySelector('[data-meta="deliverables"]').textContent = copy.deliverables;
  modal.querySelectorAll('[data-highlight]').forEach((el) => {
    el.textContent = copy.highlights[Number(el.dataset.highlight)] || '';
  });
  const ctaNote = modal.querySelector('.project-modal__cta-note');
  if(ctaNote) ctaNote.classList.remove('is-visible');
  const siteNote = modal.querySelector('.project-modal__sitelink-note');
  if(siteNote) siteNote.classList.remove('is-visible');

  document.querySelectorAll('.project-modal__bg canvas').forEach((c) => {
    c.hidden = c.dataset.panel !== key;
  });
  showPortrait(key);

  modal.hidden = false;
  document.body.classList.add('modal-open');
  if('inert' in main) main.inert = true;
  main.setAttribute('aria-hidden', 'true');

  if(typeof cx === 'number' && !reduced){
    animatePageReveal(modal, cx, cy, 'open');
  } else {
    modal.style.clipPath = '';
    modal.style.opacity = '';
    modal.classList.add('is-open');
  }

  const closeBtn = modal.querySelector('.project-modal__brand');
  closeBtn.focus();
  modal.addEventListener('keydown', onModalKeydown);
}

function closeProject(clickX, clickY){
  document.body.classList.remove('modal-open');
  if('inert' in main) main.inert = false;
  main.removeAttribute('aria-hidden');
  modal.removeEventListener('keydown', onModalKeydown);
  if(organism && currentProject) organism.unburst(currentProject.burstColor);
  stopPortrait();
  currentKey = null;

  // the circle now collapses toward wherever the NJORD wordmark was
  // actually clicked, not back to the row that originally opened the
  // page — closing should read as "closing the thing you just clicked,"
  // not a jump to an unrelated point. Escape (no click point) falls
  // back to the wordmark's own position, still "the corner with the logo."
  let cx = clickX, cy = clickY;
  if(typeof cx !== 'number'){
    const brandBtn = modal.querySelector('.project-modal__brand');
    if(brandBtn){
      const br = brandBtn.getBoundingClientRect();
      cx = br.left + br.width / 2;
      cy = br.top + br.height / 2;
    }
  }

  if(typeof cx === 'number' && !reduced){
    animatePageReveal(modal, cx, cy, 'close');
    setTimeout(() => {
      modal.classList.remove('is-open');
      modal.hidden = true;
      modal.style.clipPath = '';
      modal.style.opacity = '';
      modal.style.transition = '';
    }, PORTAL_MS + 20);
  } else {
    modal.classList.remove('is-open');
    setTimeout(() => { modal.hidden = true; }, 520);
  }

  if(lastTrigger){
    lastTrigger.focus();
    const idx = lastTrigger.querySelector('.work-row__index');
    if(idx){ idx.classList.remove('is-pulsing'); void idx.offsetWidth; idx.classList.add('is-pulsing'); }
  }
}

function onModalKeydown(e){
  if(e.key === 'Escape'){ closeProject(); return; }
  trapTabKey(e, modal);
}

document.querySelectorAll('.project-modal__brand').forEach((b) => {
  b.addEventListener('click', (e) => {
    // e.detail is 0 for a keyboard-activated click (Enter/Space) — there's
    // no real pointer position then, so don't trust clientX/clientY (browsers
    // report 0,0), just fall back to the wordmark's own position instead
    if(e.detail === 0){ closeProject(); return; }
    closeProject(e.clientX, e.clientY);
  });
});

const ctaButton = modal.querySelector('.project-modal__cta');
if(ctaButton){
  ctaButton.addEventListener('click', () => {
    const note = modal.querySelector('.project-modal__cta-note');
    if(!note) return;
    note.textContent = t('modal.ctaNote');
    note.classList.add('is-visible');
  });
}

const siteLink = modal.querySelector('.project-modal__sitelink');
if(siteLink){
  siteLink.addEventListener('click', (e) => {
    e.preventDefault();
    const note = modal.querySelector('.project-modal__sitelink-note');
    if(!note) return;
    note.textContent = t('modal.sitelinkNote');
    note.classList.add('is-visible');
  });
}

/* If a project page is open when the language toggles, its JS-rendered
   copy (everything markup-level data-i18n can't reach) is re-rendered
   in place rather than requiring a re-open. Registered once, here,
   after every piece it touches already exists. */
onLangChange(() => {
  updateLangToggleUI(getLang());
  if(soundToggle){
    const label = soundToggle.querySelector('.sound-toggle__label');
    if(label) label.textContent = audio.enabled ? t('sound.on') : t('sound.off');
  }
  if(currentKey && !modal.hidden){
    const copy = projectCopy(currentKey);
    modal.querySelector('.project-modal__tag').textContent = copy.tagline;
    modal.querySelector('.project-modal__desc').textContent = copy.description;
    modal.querySelector('[data-meta="discipline"]').textContent = copy.discipline;
    modal.querySelector('[data-meta="deliverables"]').textContent = copy.deliverables;
    modal.querySelectorAll('[data-highlight]').forEach((el) => {
      el.textContent = copy.highlights[Number(el.dataset.highlight)] || '';
    });
  }
});

/* Each project page's background is a bigger, denser, full-bleed render
   of that project's own formation (diamond/wave/network), drawn faint
   and behind the text in the page's own ink color, so it reads as a
   watermark texture rather than a separate, unrelated decorative graphic. */
const PORTRAIT_FORMATION = { aurelia: 'diamond', pulse: 'wave', meridian: 'network' };
const portraits = {};
Object.keys(PORTRAIT_FORMATION).forEach((key) => {
  const canvas = document.getElementById(`${key}-visual`);
  if(!canvas) return;
  const ink = getComputedStyle(document.documentElement).getPropertyValue(`--${key}-ink`).trim();
  // same reasoning as the main organism (ascii-engine.js): iOS throttles
  // sustained fillText-heavy canvas work, so mobile gets meaningfully fewer
  // particles here too, not just on the home page
  const portraitCount = window.innerWidth < 720 ? 900 : 2600;
  portraits[key] = new FormationPortrait(canvas, PORTRAIT_FORMATION[key], { color: ink || '#FFFFFF', count: portraitCount });
});
let activePortrait = null;
function showPortrait(key){
  if(activePortrait) activePortrait.stop();
  activePortrait = portraits[key] || null;
  if(activePortrait) activePortrait.start();
}
function stopPortrait(){
  if(activePortrait) activePortrait.stop();
  activePortrait = null;
}

/* ---------------------------------------------------------------
   Contact — copy-to-clipboard. The closing GLOBE reformation is
   handled by the organism's zone list above, not a separate object.
   --------------------------------------------------------------- */
const emailEl = document.getElementById('contact-email');
if(emailEl){
  const address = emailEl.dataset.address;
  emailEl.addEventListener('click', () => {
    navigator.clipboard?.writeText(address).catch(() => {});
    emailEl.classList.add('is-copied');
    setTimeout(() => emailEl.classList.remove('is-copied'), 1800);
  });
}
