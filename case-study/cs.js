/* ================================================================
   NJORD - case study engine. One module for every case-study page.
   - shell: language toggle, mobile nav
   - reveals, typographic moments, chapter rail
   - lazy inlining of generated SVG drawings
   - scene driver: sets --p (0..1) on .cs-scene / [data-progress]
   - page modules: VYRON IA scene, METALIUM calculator + profiles
   ================================================================ */
import { t, getLang, setLang, applyStaticTranslations, onLangChange } from '../i18n.js';
import './copy.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const hooks = [];
const onRelayout = (fn) => hooks.push(fn);

applyStaticTranslations(getLang());
document.body.classList.add('is-past-hero');

/* ---------- shell ---------- */
const langToggle = $('#lang-toggle');
const syncLang = () => langToggle && $$('.lang-toggle__opt', langToggle).forEach((el) => el.classList.toggle('is-active', el.dataset.lang === getLang()));
syncLang();
if (langToggle) langToggle.addEventListener('click', () => setLang(getLang() === 'sq' ? 'en' : 'sq'));
onLangChange(() => { applyStaticTranslations(getLang()); syncLang(); renderMoments(); hooks.forEach((f) => f()); });

const navToggle = $('#nav-toggle'), mainNav = $('#main-nav'), scrim = $('.nav-scrim');
function setNav(open) {
  if (!navToggle || !mainNav) return;
  navToggle.setAttribute('aria-expanded', String(open));
  mainNav.classList.toggle('is-open', open);
  if (scrim) scrim.classList.toggle('is-visible', open);
  document.body.classList.toggle('nav-open', open);
}
if (navToggle) navToggle.addEventListener('click', () => setNav(navToggle.getAttribute('aria-expanded') !== 'true'));
if (scrim) scrim.addEventListener('click', () => setNav(false));
$$('#main-nav a').forEach((a) => a.addEventListener('click', () => setNav(false)));
addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });

/* ---------- typographic moments (re-rendered on language change) ---------- */
function renderMoments() {
  $$('[data-moment]').forEach((el) => {
    const keys = el.dataset.moment.split(',');
    let w = 0;
    el.replaceChildren(...keys.map((k) => {
      const line = document.createElement('span');
      line.className = 'cs-moment__l';
      t(k).split(' ').forEach((word, i, a) => {
        const s = document.createElement('span');
        s.className = 'cs-wd'; s.style.setProperty('--w', w++); s.textContent = word;
        line.append(s, i < a.length - 1 ? ' ' : '');
      });
      return line;
    }));
  });
}
renderMoments();

/* ---------- reveals ---------- */
const revealIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('cs-in'); revealIO.unobserve(e.target); }
}), { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
$$('.cs-r,.cs-moment,[data-reveal]').forEach((el) => reduced ? el.classList.add('cs-in') : revealIO.observe(el));

/* ---------- lazy SVG drawings ---------- */
const svgIO = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  svgIO.unobserve(e.target);
  inlineSvg(e.target);
}), { rootMargin: '700px 0px' });
async function inlineSvg(host) {
  try {
    const res = await fetch(host.dataset.svg);
    if (!res.ok) throw new Error(res.status);
    host.innerHTML = await res.text();
    host.classList.add('cs-ready');
    applyStaticTranslations(getLang());
    const svg = host.firstElementChild;
    if (svg && host.dataset.alt) { svg.setAttribute('aria-label', t(host.dataset.alt)); svg.removeAttribute('role'); svg.setAttribute('role', 'img'); const ti = svg.querySelector('title'); if (ti) ti.remove(); }
    host.dispatchEvent(new CustomEvent('cs:svg'));
  } catch (err) { host.classList.add('cs-failed'); }
}
$$('[data-svg]').forEach((h) => svgIO.observe(h));
onRelayout(() => $$('[data-svg][data-alt].cs-ready').forEach((h) => { const s = h.firstElementChild; if (s) s.setAttribute('aria-label', t(h.dataset.alt)); }));

/* ---------- scene driver ---------- */
const scenes = $$('.cs-scene,[data-progress]');
let tick = false;
function drive() {
  tick = false;
  const vh = innerHeight;
  scenes.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;
    let p;
    if (reduced) p = 1;
    else if (el.classList.contains('cs-scene')) p = clamp(-r.top / Math.max(1, r.height - vh));
    else p = clamp((vh * 0.9 - r.top) / (vh * 0.55 + r.height * 0.4));
    p = Math.round(p * 1000) / 1000;
    if (el._p !== p) {
      el._p = p; el.style.setProperty('--p', p);
      $$('[data-p-count]', el).forEach((c) => {
        const [a, b, s, e] = c.dataset.pCount.split(',').map(Number);
        const k = clamp((p - s) / (e - s));
        c.textContent = Math.round(a + (b - a) * k);
      });
    }
  });
  railUpdate();
}
const req = () => { if (!tick) { tick = true; requestAnimationFrame(drive); } };
addEventListener('scroll', req, { passive: true });
addEventListener('resize', req);

/* ---------- chapter rail ---------- */
const chapters = $$('[data-ch]');
let rail = null;
if (chapters.length) {
  rail = document.createElement('nav');
  rail.className = 'cs-rail'; rail.setAttribute('aria-label', 'Chapters');
  chapters.forEach((c) => {
    const a = document.createElement('a');
    a.href = '#' + c.id;
    a.innerHTML = '<span data-i18n="cs.ch' + c.dataset.ch + '"></span>';
    rail.append(a);
  });
  document.body.append(rail);
  applyStaticTranslations(getLang());
}
function railUpdate() {
  if (!rail) return;
  const mid = innerHeight * 0.4;
  let on = -1;
  chapters.forEach((c, i) => { if (c.getBoundingClientRect().top < mid) on = i; });
  $$('a', rail).forEach((a, i) => a.classList.toggle('is-on', i === on));
}

/* ================================================================
   VYRON: information architecture scene
   ================================================================ */
const ia = $('#ia');
if (ia) {
  const CATS = [
    ['vy.cat1', [1, 2, 3, 4, 5, 6]],
    ['vy.cat2', [7, 8, 9, 10, 11]],
    ['vy.cat3', [12, 13, 14]],
    ['vy.cat4', [15, 16]],
    ['vy.cat5', [17, 18, 19, 20, 21]],
  ];
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; })();
  const chips = [];
  const mk = (cls, text, key) => {
    const el = document.createElement('div');
    el.className = 'ia__chip ' + cls; el.dataset.i18n = key; el.textContent = text;
    ia.append(el); chips.push(el); return el;
  };
  ia.insertAdjacentHTML('afterbegin', '<svg class="ia__lines" aria-hidden="true"></svg>');
  const lines = $('.ia__lines', ia);
  const root = mk('ia__chip--root', t('vy.s.root'), 'vy.s.root');
  const cats = CATS.map(([k, terms]) => ({
    el: mk('ia__chip--cat', t(k), k),
    terms: terms.map((n) => mk('', t('vy.t' + n), 'vy.t' + n)),
  }));
  const seeds = chips.map(() => [rnd(), rnd(), rnd(), rnd()]);

  function layout() {
    const W = ia.clientWidth, mobile = W < 720;
    ia.classList.toggle('is-mobile', mobile);
    chips.forEach((c) => { c.style.maxWidth = ''; c.style.whiteSpace = ''; });
    const colW = W / 5;
    if (!mobile) cats.forEach((c) => { c.el.style.maxWidth = (colW - 12) + 'px'; c.el.style.whiteSpace = 'normal'; });
    const pos = new Map();
    const sz = (el) => [el.offsetWidth, el.offsetHeight];
    let H = 0, paths = '';
    const [rw, rh] = sz(root);
    if (!mobile) {
      pos.set(root, [(W - rw) / 2, 0]);
      const cy = rh + 46;
      let maxY = 0;
      cats.forEach((c, i) => {
        const x = i * colW, [, ch] = sz(c.el);
        pos.set(c.el, [x, cy]);
        let y = cy + ch + 14;
        c.terms.forEach((tm) => { pos.set(tm, [x, y]); y += sz(tm)[1] + 8; });
        maxY = Math.max(maxY, y);
        const cx = x + Math.min(sz(c.el)[0], colW - 12) / 2, rx = W / 2;
        paths += `<path pathLength="1" d="M${rx} ${rh} V${rh + 22} H${cx} V${cy}"/>`;
      });
      H = maxY;
    } else {
      pos.set(root, [0, 0]);
      let y = rh + 14;
      paths += `<path pathLength="1" d="M4 ${rh} V${rh + 8}"/>`;
      cats.forEach((c) => {
        const [cw, ch] = sz(c.el);
        pos.set(c.el, [0, y]);
        let x = 0, ry = y + ch + 6, rowH = 0;
        c.terms.forEach((tm) => {
          const [w, h] = sz(tm);
          if (x + w > W && x > 0) { x = 0; ry += rowH + 6; rowH = 0; }
          pos.set(tm, [x, ry]); x += w + 6; rowH = Math.max(rowH, h);
        });
        y = ry + rowH + 14;
      });
      H = y - 14;
    }
    ia.style.height = Math.ceil(H) + 'px';
    lines.innerHTML = paths;
    chips.forEach((c, i) => {
      const [x1, y1] = pos.get(c) || [0, 0], [w, h] = sz(c), s = seeds[i];
      const isCat = c.classList.contains('ia__chip--cat');
      const x0 = s[0] * Math.max(0, W - w), y0 = 20 + s[1] * Math.max(0, H - h - 30);
      c.style.setProperty('--x1', x1.toFixed(1)); c.style.setProperty('--y1', y1.toFixed(1));
      c.style.setProperty('--x0', (c === root ? x1 : x0).toFixed(1)); c.style.setProperty('--y0', (c === root ? y1 : y0).toFixed(1));
      c.style.setProperty('--r', c === root ? 0 : ((s[2] - 0.5) * 16).toFixed(1));
      c.style.setProperty('--a', (isCat ? 0.34 + s[3] * 0.1 : 0.04 + s[3] * 0.3).toFixed(2));
      c.style.setProperty('--k', '5');
    });
  }
  const run = () => requestAnimationFrame(layout);
  run(); onRelayout(run);
  addEventListener('resize', run);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
}

/* ================================================================
   METALIUM: profile tabs, example inquiry, calculator
   ================================================================ */
const profWrap = $('.cs-prof');
if (profWrap) {
  const items = $$('.cs-prof__i', profWrap);
  const tabs = $('.cs-tabs');
  let cur = 0;
  const show = (i) => { cur = i; items.forEach((it, j) => it.classList.toggle('is-on', j === i)); $$('button', tabs).forEach((b, j) => b.setAttribute('aria-pressed', String(j === i))); };
  items.forEach((it, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = it.dataset.name; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => show(i)); tabs.append(b);
  });
  show(0);
}

const calc = $('#calc');
if (calc) {
  import('./steel-data.js').then(({ STEEL }) => {
    const fam = $('#k-fam'), size = $('#k-size'), len = $('#k-len'), qty = $('#k-qty'), out = $('#k-out'), msg = $('#k-msg');
    const list = $('#k-list'), total = $('#k-total'), add = $('#k-add');
    const lines = [];
    const kgm = (f, row) => (f === 'SHS' ? row[2] : row[1]);
    const label = (f, row) => (f === 'SHS' ? `${f} ${row[0]}x${row[1]}` : `${f} ${row[0]}`);
    const fmt = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
    const fillSizes = () => {
      size.innerHTML = STEEL[fam.value].map((r, i) => `<option value="${i}">${fam.value === 'SHS' ? r[0] + ' x ' + r[1] : r[0]}</option>`).join('');
      size.value = String({ IPE: 6, HEA: 5, HEB: 5, UPN: 6, SHS: 15 }[fam.value]);
    };
    const cur = () => {
      const row = STEEL[fam.value][+size.value];
      const L = parseFloat(String(len.value).replace(',', '.')), q = parseInt(qty.value, 10);
      return { row, L, q, w: row && L > 0 && q > 0 ? kgm(fam.value, row) * L * q : NaN };
    };
    const upd = () => { const c = cur(); out.innerHTML = Number.isNaN(c.w) ? '<small>-</small>' : `${fmt(c.w)}<small>kg</small>`; msg.textContent = ''; };
    const render = () => {
      list.innerHTML = lines.length ? '' : `<li class="cs-calc__empty" data-i18n="mt.k.empty">${t('mt.k.empty')}</li>`;
      lines.forEach((l, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${l.name} / ${l.L} m x ${l.q}</span><span>${fmt(l.w)} kg</span>`;
        const b = document.createElement('button'); b.type = 'button'; b.textContent = '×'; b.setAttribute('aria-label', t('mt.k.remove'));
        b.addEventListener('click', () => { lines.splice(i, 1); render(); });
        li.append(b); list.append(li);
      });
      total.querySelector('b').textContent = fmt(lines.reduce((s, l) => s + l.w, 0)) + ' kg';
    };
    fam.addEventListener('change', () => { fillSizes(); upd(); });
    [size, len, qty].forEach((el) => el.addEventListener('input', upd));
    add.addEventListener('click', () => {
      const c = cur();
      if (Number.isNaN(c.w)) { msg.textContent = t('mt.k.badinput'); return; }
      lines.push({ name: label(fam.value, c.row), L: c.L, q: c.q, w: c.w });
      render(); msg.textContent = t('mt.k.sent');
    });
    fillSizes(); upd(); render();
    onRelayout(() => { render(); upd(); });

    /* example inquiry: real arithmetic on the same table, shown as an example */
    const ex = $('#inq-weight');
    if (ex) {
      const heb = STEEL.HEB.find((r) => r[0] === 200)[1], ipe = STEEL.IPE.find((r) => r[0] === 200)[1];
      ex.textContent = '≈ ' + fmt(heb * 6 * 12 + ipe * 10 * 6) + ' KG';
    }
  });
}

drive();
addEventListener('load', drive);
