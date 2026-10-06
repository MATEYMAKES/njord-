/* ---- 00-core.js ---- */
/* Aurelia core: the small shared toolkit every section script uses. Loaded first, as a classic script.
   Everything lives on window.AU. Section scripts must not redefine anything here; they add their own
   AU.<section> object if they need to share something. */
(function () {
  'use strict';
  var AU = (window.AU = window.AU || {});
  var html = document.documentElement;

  /* ---------- dom ---------- */
  AU.$ = function (s, r) { return (r || document).querySelector(s); };
  AU.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  AU.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  AU.ready = function (fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  };

  /* ---------- events: AU.on('cart', fn) / AU.emit('cart', detail). Names used across sections:
     'mode' (string), 'reduced' (bool), 'cart' (cart state), 'wish' (array of ids), 'gl' (AUGL or null),
     'intro:done', 'overlay' ({id, open}), 'product:open' (product id), 'bespoke:set' (spec) ---------- */
  AU.on = function (name, fn) {
    var h = function (e) { fn(e.detail); };
    document.addEventListener('au:' + name, h);
    return function () { document.removeEventListener('au:' + name, h); };
  };
  AU.emit = function (name, detail) { document.dispatchEvent(new CustomEvent('au:' + name, { detail: detail })); };

  /* ---------- content and languages (v2) ----------
     AU.extendContent(obj)  deep-merges obj into the English base (01-content.js, then each 02-content-*.js).
     AU.addLang(id, obj)    registers a partial override of the same structure for a language (09-lang-*.js).
     AU.content             (getter) the base merged with the current language's override. Arrays in an override
                            replace by index (an override array item is merged into the base item at that index), so
                            translations only need the strings: [{ name: 'Grâce Solitaire' }, …]. Functions are kept.
     AU.lang / AU.setLang(id)  current language ('en' default, saved); emits 'lang'.
     AU.t('a.b.c', {n: 2})  a string from AU.content by path, with {n} placeholders filled; returns the path if missing
                            (so a missing string is visible, never blank). UI strings live under content.ui.<area>. */
  var baseContent = {}, langs = {}, merged = null;
  var isObj = function (v) { return v && typeof v === 'object' && !Array.isArray(v); };
  var deepMerge = function (a, b) {
    if (b === undefined) return a;
    if (typeof b === 'function' || b === null || typeof b !== 'object') return b;
    if (Array.isArray(b)) {
      if (!Array.isArray(a)) return b.slice();
      var out = a.slice();
      b.forEach(function (v, i) { out[i] = (isObj(v) && isObj(a[i])) ? deepMerge(a[i], v) : (v === undefined ? a[i] : deepMerge(a[i], v)); });
      return out;
    }
    var o = isObj(a) ? Object.assign({}, a) : {};
    Object.keys(b).forEach(function (k) { o[k] = deepMerge(o[k], b[k]); });
    return o;
  };
  var mergeInto = function (a, b) {   // mutating merge for the base, so base objects keep their identity
    Object.keys(b).forEach(function (k) {
      if (isObj(a[k]) && isObj(b[k])) mergeInto(a[k], b[k]); else a[k] = b[k];
    });
  };
  AU.extendContent = function (obj) { mergeInto(baseContent, obj); merged = null; };
  AU.addLang = function (id, obj) { langs[id] = deepMerge(langs[id] || {}, obj); merged = null; };
  AU.lang = (function () { var l = null; try { l = JSON.parse(localStorage.getItem('aurelia:lang')); } catch (e) {} return l || 'en'; })();
  Object.defineProperty(AU, 'content', {
    configurable: true,
    get: function () {
      if (!merged || merged.__lang !== AU.lang) {
        merged = AU.lang !== 'en' && langs[AU.lang] ? deepMerge(baseContent, langs[AU.lang]) : baseContent;
        try { Object.defineProperty(merged, '__lang', { value: AU.lang, configurable: true, enumerable: false, writable: true }); } catch (e) { merged.__lang = AU.lang; }
      }
      return merged;
    },
    set: function (v) { AU.extendContent(v); }   // v1 code that assigns AU.content = {…} still works
  });
  AU.t = function (path, vars) {
    var v = String(path).split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, AU.content);
    if (v == null) {
      // fall back to English, then to the path itself
      v = String(path).split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, baseContent);
      if (v == null) return path;
    }
    if (vars && typeof v === 'string') v = v.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return v;
  };
  /* Static markup is translated with attributes: data-t="ui.shell.search" sets the text; data-t-aria-label,
     data-t-placeholder, data-t-title set those attributes; data-t-html sets innerHTML (trusted content only).
     AU.applyT(root) runs at startup, on every route render and on every language change. */
  AU.applyT = function (root) {
    var r = root || document;
    AU.$$('[data-t]', r).forEach(function (el) { el.textContent = AU.t(el.getAttribute('data-t')); });
    AU.$$('[data-t-html]', r).forEach(function (el) { el.innerHTML = AU.t(el.getAttribute('data-t-html')); });
    ['aria-label', 'placeholder', 'title', 'alt'].forEach(function (a) {
      AU.$$('[data-t-' + a + ']', r).forEach(function (el) { el.setAttribute(a, AU.t(el.getAttribute('data-t-' + a))); });
    });
  };
  document.addEventListener('au:lang', function () { AU.applyT(document); });
  AU.setLang = function (id) {
    if (!id || id === AU.lang) return;
    AU.lang = id; merged = null;
    try { localStorage.setItem('aurelia:lang', JSON.stringify(id)); } catch (e) {}
    html.setAttribute('lang', id);
    AU.emit('lang', id);
  };
  html.setAttribute('lang', AU.lang);

  /* ---------- maths ---------- */
  AU.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  AU.lerp = function (a, b, t) { return a + (b - a) * t; };
  AU.map = function (v, a, b, c, d) { return c + (d - c) * AU.clamp((v - a) / (b - a), 0, 1); };
  AU.easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  AU.easeInOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /* ---------- storage (always guarded: private windows and blocked storage must not break the page) ---------- */
  AU.store = {
    get: function (k, d) { try { var v = localStorage.getItem('aurelia:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('aurelia:' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- reduced motion (live) ---------- */
  var rmq = matchMedia('(prefers-reduced-motion: reduce)');
  /* html.reduced mirrors the setting for CSS (set before first paint in the head), so sections can skip hidden
     entrance states entirely: `html.reduced .hero__x { opacity: 1; transform: none }`. */
  AU.reduced = rmq.matches;
  html.classList.toggle('reduced', AU.reduced);
  var onRm = function (e) { AU.reduced = e.matches; html.classList.toggle('reduced', AU.reduced); AU.emit('reduced', AU.reduced); };
  if (rmq.addEventListener) rmq.addEventListener('change', onRm); else if (rmq.addListener) rmq.addListener(onRm);
  AU.touch = matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---------- light / dark ---------- */
  AU.getMode = function () { return html.getAttribute('data-mode') === 'light' ? 'light' : 'dark'; };
  var switchTimer, modeVT = null;
  /* integrator: the switch is one cross-dissolve of the whole page through the View Transitions API (a compositor
     snapshot: the new mode fades in over the old in 0.7s, see 06-atmos.css html.vt-mode). Transitioning the colour
     of every element instead (html.is-switching *) restyled the whole document on every frame: about 10 fps. That
     rule is only the fallback for browsers without the API, or while a page change is running. */
  AU.setMode = function (m) {
    m = m === 'light' ? 'light' : 'dark';
    if (m === AU.getMode()) return;
    var apply = function () {
      html.setAttribute('data-mode', m);
      var meta = AU.$('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', m === 'light' ? '#FBF7F5' : '#300404');
      AU.store.set('mode', m);
      AU.emit('mode', m);
    };
    html.classList.add('is-switching');
    clearTimeout(switchTimer);
    var vt = null;
    if (typeof document.startViewTransition === 'function' && !AU.reduced && !document.hidden && !html.classList.contains('vt-on')) {
      html.classList.add('vt-mode');
      try { vt = document.startViewTransition(apply); } catch (e) { vt = null; }
    }
    if (!vt) {
      html.classList.remove('vt-mode');
      apply();
      switchTimer = setTimeout(function () { html.classList.remove('is-switching'); }, 750);
      return;
    }
    // the classes stay until the dissolve has really ended (it starts a frame or two after the call): taking
    // vt-mode away early would hand the running pseudo-elements the page-change animations (a second, jumping fade)
    modeVT = vt;
    var done = function () { if (modeVT !== vt) return; modeVT = null; clearTimeout(switchTimer); html.classList.remove('is-switching', 'vt-mode'); };
    vt.finished.then(done, done);
    switchTimer = setTimeout(done, 2500);
  };
  AU.toggleMode = function () { AU.setMode(AU.getMode() === 'dark' ? 'light' : 'dark'); };

  /* ---------- money and numerals ---------- */
  /* Prices are stored in USD in content. AU.currency ('USD' | 'EUR' | 'GBP', saved) converts with the placeholder rates
     in content.config.currencies and formats for the current language. A house shows whole amounts, so a whole number
     never carries cents: $4,850 · 4 460 € · 4.460 € · £3,830 (cents appear only on a genuinely fractional USD amount).

     Converted prices are set per UNIT, as a house sets a price list per market: each unit price is rounded to the
     nearest 10 (USD is shown as written). A sum is therefore the sum of the rounded unit prices, never the rounded
     sum, so a bag or a checkout always adds up on screen:
       AU.convertUnit(usd)          one unit price in the current currency (rounded to 10 outside USD)
       AU.convert(usd)              the same (kept for older callers)
       AU.localSum(lines)           sum of convertUnit(price) x qty. lines: [price, ...] | [[price, qty], ...] | [{price, qty}, ...]
       AU.fmtLocal(n)               format an amount that is ALREADY in the current currency
       AU.fmt(usd, qty)             plain text for a unit price (x qty); AU.fmt(lines) for a sum of lines
       AU.price(usd, qty) / AU.price(lines)   the same as a <span class="num" data-price> that re-renders by itself
                                    when the currency or language changes; always use it for visible prices.
       AU.cart.lines()              the bag as [[price, qty], ...]: AU.price(AU.cart.lines()) is the subtotal,
                                    AU.price(AU.cart.lines().concat([[delivery, 1]])) the total.
     AU.price(usd) with a plain number keeps working everywhere; only sums need the lines form to add up. */
  AU.currency = (function () { var c = null; try { c = JSON.parse(localStorage.getItem('aurelia:currency')); } catch (e) {} return c || 'USD'; })();
  AU.convertUnit = function (usd) {
    var cur = (AU.content.config && AU.content.config.currencies || {})[AU.currency] || { rate: 1 };
    var v = Number(usd) * cur.rate;
    if (!isFinite(v)) return 0;
    return AU.currency === 'USD' ? Math.round(v * 100) / 100 : Math.round(v / 10) * 10;
  };
  AU.convert = AU.convertUnit;
  var asLines = function (lines) {
    return (Array.isArray(lines) ? lines : [lines]).map(function (l) {
      if (Array.isArray(l)) return [Number(l[0]) || 0, l[1] == null ? 1 : Number(l[1]) || 0];
      if (l && typeof l === 'object') return [Number(l.price) || 0, l.qty == null ? 1 : Number(l.qty) || 0];
      return [Number(l) || 0, 1];
    });
  };
  AU.localSum = function (lines) {
    // summed in cents, so 0.1 + 0.2 never shows a stray fraction of a cent
    return asLines(lines).reduce(function (a, l) { return a + Math.round(AU.convertUnit(l[0]) * 100) * l[1]; }, 0) / 100;
  };
  var LOCALES = { fr: 'fr-FR', de: 'de-DE' };
  var nfCache = {};
  AU.fmtLocal = function (n) {
    n = Number(n) || 0;
    var whole = Math.abs(n - Math.round(n)) < 0.005, d = whole ? 0 : 2;
    var locale = LOCALES[AU.lang] || 'en-US', key = locale + '|' + AU.currency + '|' + d;
    try {
      // narrowSymbol: "4 850 $" and "3 830 £" in French, not "$US" / "£GB"
      var nf = nfCache[key];
      if (!nf) {
        var o = { style: 'currency', currency: AU.currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: d, maximumFractionDigits: d };
        try { nf = new Intl.NumberFormat(locale, o); } catch (e1) { delete o.currencyDisplay; nf = new Intl.NumberFormat(locale, o); }
        nfCache[key] = nf;
      }
      // the narrow no-break space (fr) is missing from the faces: an ordinary no-break space keeps "4 460 €" on one line
      return nf.format(whole ? Math.round(n) : n).replace(/ | /g, ' ');
    } catch (e) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  };
  AU.fmt = function (usd, qty) {
    if (Array.isArray(usd)) return AU.fmtLocal(AU.localSum(usd));
    return AU.fmtLocal(AU.localSum([[usd, qty == null ? 1 : qty]]));
  };
  /* data-price holds the USD lines: "4850", "1950x2" or "5600+1950x2+25" (a sum), so AU.reprice can rebuild any of them
     in a new currency with the same per-unit rounding. */
  var encLines = function (lines) { return asLines(lines).map(function (l) { return l[1] === 1 ? String(l[0]) : l[0] + 'x' + l[1]; }).join('+'); };
  var decLines = function (s) { return String(s || '0').split('+').map(function (p) { var q = p.split('x'); return [+q[0] || 0, q[1] == null ? 1 : +q[1] || 0]; }); };
  AU.price = function (n, qty) {
    var lines = Array.isArray(n) ? n : [[n, qty == null ? 1 : qty]];
    return '<span class="num" data-price="' + encLines(lines) + '">' + AU.esc(AU.fmt(lines)) + '</span>';
  };
  AU.setCurrency = function (c) {
    if (!c || c === AU.currency) return;
    AU.currency = c;
    try { localStorage.setItem('aurelia:currency', JSON.stringify(c)); } catch (e) {}
    AU.emit('currency', c);
  };
  AU.reprice = function (root) { AU.$$('[data-price]', root).forEach(function (el) { el.textContent = AU.fmt(decLines(el.getAttribute('data-price'))); }); };
  var repriceAll = function () { AU.reprice(document); };
  document.addEventListener('au:currency', repriceAll);
  document.addEventListener('au:lang', repriceAll);
  /* Wrap every run of digits (with $ , . : – inside it) in <span class="num"> so it renders in Cormorant Infant.
     Takes plain text, returns escaped HTML. */
  AU.nums = function (s) { return AU.esc(s).replace(/(\$?\d[\d,.:–—-]*\d|\$?\d)/g, '<span class="num">$1</span>'); };

  /* ---------- icons: thin outlines, 1.25px, 24 viewBox (the guide's icon style) ---------- */
  var P = {
    heart: '<path d="M20.8 8.6c0-2.8-2.2-5-5-5-1.9 0-3.5 1-4.4 2.6C10.5 4.6 8.9 3.6 7 3.6c-2.8 0-5 2.2-5 5 0 5.2 9.4 10.4 9.4 10.4s9.4-5.2 9.4-10.4Z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.4-4.4"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7"/>',
    bag: '<path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7V5.5A3 3 0 0 1 12 2.5a3 3 0 0 1 3 3V7"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
    close: '<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>',
    menu: '<path d="M3.5 8h17M3.5 16h17"/>',
    arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    arrowLeft: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M4.5 12.5l4.5 4.5 10.5-11"/>',
    play: '<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.8" r="2.3"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    phone: '<path d="M5 3.5h3.5l1.7 4.6-2.2 1.5a11 11 0 0 0 6.4 6.4l1.5-2.2 4.6 1.7V19a1.5 1.5 0 0 1-1.6 1.5C10.9 20 4 13.1 3.5 5.1A1.5 1.5 0 0 1 5 3.5Z"/>',
    diamond: '<path d="M6.5 4h11l3.5 5-9 11-9-11 3.5-5Z"/><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5"/>',
    ring: '<circle cx="12" cy="14.5" r="6"/><path d="M9.5 6.5 12 3.5l2.5 3L12 8.6z"/>',
    gift: '<rect x="3.5" y="9" width="17" height="11.5" rx="1"/><path d="M2.5 9h19V6.5h-19zM12 6.5v14M12 6.5C10.5 3 7 3 7 5s3 1.5 5 1.5c2 0 5 .5 5-1.5s-3.5-2-5 1.5"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6L12 3Z"/>',
    truck: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3v3.5h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    sparkle: '<path d="M12 3c.5 5.2 2.8 7.5 8 8-5.2.5-7.5 2.8-8 8-.5-5.2-2.8-7.5-8-8 5.2-.5 7.5-2.8 8-8Z"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    square: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'
  };
  AU.iconNames = Object.keys(P);
  /* AU.icon('bag') -> '<svg ...>'; opts.size (px, default 22), opts.label (adds role=img + aria-label, else aria-hidden) */
  AU.icon = function (name, opts) {
    opts = opts || {};
    var s = opts.size || 22;
    var a = opts.label ? ' role="img" aria-label="' + AU.esc(opts.label) + '"' : ' aria-hidden="true" focusable="false"';
    return '<svg class="ico' + (opts.cls ? ' ' + opts.cls : '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24"' + a + '>' + (P[name] || '') + '</svg>';
  };
  /* In markup, <i data-icon="bag"></i> is replaced by the svg at startup (and by AU.hydrateIcons(root) later). */
  AU.hydrateIcons = function (root) {
    AU.$$('[data-icon]', root).forEach(function (el) {
      if (el.tagName.toLowerCase() === 'svg') return;
      var tmp = document.createElement('div');
      tmp.innerHTML = AU.icon(el.getAttribute('data-icon'), { size: +el.getAttribute('data-size') || 22, label: el.getAttribute('data-label') });
      el.replaceWith(tmp.firstChild);
    });
  };

  /* ---------- one shared animation loop: AU.tick(fn(t, dt)) returns a remover. Pauses with the tab. ---------- */
  var ticks = new Set(), last = 0, rafId = 0;
  var loop = function (t) {
    var dt = Math.min(64, t - (last || t)) / 1000; last = t;
    ticks.forEach(function (fn) { try { fn(t / 1000, dt); } catch (e) { console.error(e); ticks.delete(fn); } });
    rafId = ticks.size ? requestAnimationFrame(loop) : 0;
  };
  AU.tick = function (fn) {
    ticks.add(fn);
    if (!rafId && !document.hidden) { last = 0; rafId = requestAnimationFrame(loop); }
    return function () { ticks.delete(fn); };
  };
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(rafId); rafId = 0; }
    else if (ticks.size && !rafId) { last = 0; rafId = requestAnimationFrame(loop); }
  });

  /* ---------- scroll: AU.scroll.y, AU.scroll.vh; AU.onScroll(fn(y)) batched to one rAF ---------- */
  AU.scroll = { y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth };
  var sFns = new Set(), sQueued = false;
  var sRun = function () { sQueued = false; AU.scroll.y = window.scrollY; sFns.forEach(function (fn) { fn(AU.scroll.y); }); };
  window.addEventListener('scroll', function () { if (!sQueued) { sQueued = true; requestAnimationFrame(sRun); } }, { passive: true });
  window.addEventListener('resize', function () { AU.scroll.vh = window.innerHeight; AU.scroll.vw = window.innerWidth; if (!sQueued) { sQueued = true; requestAnimationFrame(sRun); } });
  AU.onScroll = function (fn) { sFns.add(fn); fn(window.scrollY); return function () { sFns.delete(fn); }; };
  /* progress of an element through the viewport: 0 when its top meets the bottom of the screen, 1 when its bottom leaves the top */
  AU.progress = function (el) {
    var r = el.getBoundingClientRect(), vh = window.innerHeight;
    return AU.clamp((vh - r.top) / (vh + r.height), 0, 1);
  };

  /* ---------- text split: AU.split(el) wraps each word in <span class="w"><span class="w__i">…</span></span>
     and sets --wi on each, so [data-reveal="words"] can raise them one after another. Keeps child elements
     (e.g. .num, em, br) intact. Safe to call twice. ---------- */
  AU.split = function (el) {
    if (!el || el.__split) return el; el.__split = true;
    var i = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement('span'); w.className = 'w';
            var inner = document.createElement('span'); inner.className = 'w__i'; inner.textContent = p;
            inner.style.setProperty('--wi', i++); w.appendChild(inner); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          if (n.classList.contains('num') || n.tagName === 'SVG') {
            var w2 = document.createElement('span'); w2.className = 'w';
            var in2 = document.createElement('span'); in2.className = 'w__i'; in2.style.setProperty('--wi', i++);
            n.replaceWith(w2); in2.appendChild(n); w2.appendChild(in2);
          } else walk(n);
        }
      });
    };
    walk(el);
    return el;
  };

  /* ---------- reveal on scroll ----------
     Markup: data-reveal="up|fade|scale|left|right|line|line-c|mask|words" and optional data-delay="120" (ms).
     A parent with data-stagger="90" gives each [data-reveal] child an extra index*90ms delay.
     Elements already on screen at load are left visible (no flash). AU.reveal(root) registers new markup later. */
  /* Chromium clips an observed element by its own clip-path, so a fully masked element (data-reveal="mask")
     never intersects. Those are watched through their parent instead: each watched node keeps the list of
     reveal elements it stands in for (__rvEls). */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      (e.target.__rvEls || [e.target]).forEach(function (el) {
        el.classList.add('is-in');
        AU.emit('revealed', el);
      });
      e.target.__rvEls = null;
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;
  var watch = function (el) {
    var w = el.getAttribute('data-reveal') === 'mask' && el.parentElement ? el.parentElement : el;
    (w.__rvEls = w.__rvEls || []).push(el);
    io.observe(w);
  };
  AU.reveal = function (root) {
    var els = AU.$$('[data-reveal]', root || document);
    if (root && root.hasAttribute && root.hasAttribute('data-reveal')) els.unshift(root);
    els = els.filter(function (el) { if (el.__rv) return false; el.__rv = true; return true; });
    if (!els.length) return;
    /* three passes, so a page with dozens of reveals costs one layout, not one per element (reading a rect after each
       class change forced a fresh style + layout every time: ~45 ms on the home page):
       1. DOM writes (word splitting, delays), 2. every rect read in one go, 3. the classes. */
    els.forEach(function (el) {
      if (el.getAttribute('data-reveal') === 'words') AU.split(el);
      var d = +el.getAttribute('data-delay') || 0;
      var sp = el.parentElement && el.parentElement.closest('[data-stagger]');
      if (sp) {
        var sibs = AU.$$('[data-reveal]', sp).filter(function (x) { return x.parentElement.closest('[data-stagger]') === sp; });
        d += sibs.indexOf(el) * (+sp.getAttribute('data-stagger') || 80);
      }
      if (d) el.style.setProperty('--d', d / 1000 + 's');
    });
    if (!io || AU.reduced) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var vh = window.innerHeight;
    var onScreen = els.map(function (el) { var r = el.getBoundingClientRect(); return r.top < vh * 0.92 && r.bottom > 0; });
    els.forEach(function (el, i) {
      if (onScreen[i] && !el.hasAttribute('data-reveal-always')) { el.classList.add('is-in'); return; }
      el.classList.add('rv');
      watch(el);
    });
  };

  /* ---------- sparkle: four-point glints thrown from a point (client coords) ---------- */
  AU.sparkle = function (x, y, opts) {
    if (AU.reduced) return;
    opts = opts || {};
    var n = opts.count || 9, spread = opts.spread || 70;
    for (var i = 0; i < n; i++) {
      var g = document.createElement('span'); g.className = 'glint'; g.setAttribute('aria-hidden', 'true');
      var a = (i / n) * Math.PI * 2 + Math.random() * .6, d = spread * (.45 + Math.random() * .7);
      g.style.cssText = '--x:' + x + 'px;--y:' + y + 'px;--dx:' + Math.cos(a) * d + 'px;--dy:' + Math.sin(a) * d + 'px;--s:' +
        (8 + Math.random() * 12) + 'px;--r:' + (60 + Math.random() * 120) + 'deg;--t:' + (.7 + Math.random() * .6) + 's';
      document.body.appendChild(g);
      setTimeout(function (el) { el.remove(); }, 1500, g);
    }
  };
  AU.sparkleAt = function (el, opts) { var r = el.getBoundingClientRect(); AU.sparkle(r.left + r.width / 2, r.top + r.height / 2, opts); };

  /* ---------- toast ---------- */
  var toastEl, toastT;
  /* If a sticky or fixed bar is sitting on the bottom edge of the screen where the toast lands (the bespoke price bar
     on a phone), the toast rises above it. Sections can also set --toast-lift themselves; the larger lift wins. */
  var toastLift = function () {
    var vw = window.innerWidth, vh = window.innerHeight, lift = 0;
    if (!document.elementsFromPoint) return 0;
    [vw / 2, vw * .2, vw * .8].forEach(function (x) {
      var hit = document.elementsFromPoint(x, vh - 6).filter(function (n) { return !(toastEl && toastEl.contains(n)); })[0];
      for (var n = hit; n && n !== document.body && n !== html; n = n.parentElement) {
        var pos = getComputedStyle(n).position;
        if (pos === 'fixed' || pos === 'sticky') {
          var r = n.getBoundingClientRect();
          if (r.bottom >= vh - 2 && r.top > vh * .55) lift = Math.max(lift, vh - r.top);
          break;
        }
      }
    });
    return Math.round(lift);
  };
  AU.toast = function (msg, icon) {
    if (!toastEl) {
      toastEl = document.createElement('div'); toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.style.setProperty('--toast-lift-auto', toastLift() + 'px');
    toastEl.innerHTML = AU.icon(icon || 'check') + '<span>' + AU.nums(msg) + '</span>';
    requestAnimationFrame(function () { toastEl.classList.add('is-on'); });
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3200);
  };

  /* ---------- scroll lock (nested) and focus trap ---------- */
  var locks = 0;
  AU.lockScroll = function (on) {
    locks = Math.max(0, locks + (on ? 1 : -1));
    html.classList.toggle('is-locked', locks > 0);
    document.body.style.paddingRight = locks > 0 ? (window.innerWidth - html.clientWidth) + 'px' : '';
  };
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  /* A control counts as tabbable only if the browser would really move focus to it: it is rendered (offsetParent, or
     a fixed element with a box), not inside an [inert] subtree (an overlay's hidden pane), and not visibility:hidden.
     Without the inert/visibility tests the "last" element could be one focus() silently refuses, and focus stuck on
     the first control or slipped out of the dialog. The list is rebuilt on every Tab, so panes that swap stay right. */
  var tabbable = function (x) {
    if (x.closest('[inert]')) return false;
    if (typeof x.checkVisibility === 'function') {
      if (!x.checkVisibility({ visibilityProperty: true })) return false;
    } else {
      if (x.offsetParent === null && getComputedStyle(x).position !== 'fixed') return false;
      if (getComputedStyle(x).visibility === 'hidden') return false;
    }
    return x.offsetParent !== null || x.getClientRects().length > 0;
  };
  AU.trapFocus = function (box) {
    var h = function (e) {
      if (e.key !== 'Tab') return;
      var f = AU.$$(FOCUSABLE, box).filter(function (x) { return tabbable(x) || (x === document.activeElement && !x.closest('[inert]')); });
      if (!f.length) return;
      var first = f[0], lastEl = f[f.length - 1], a = document.activeElement;
      if (f.indexOf(a) < 0) {
        // focus is on something outside the tab order: the panel itself (overlays focus their dialog, tabindex -1), a
        // heading the page moved focus to, or nothing inside the box. Wrap when no tabbable element lies beyond it in
        // that direction, so focus can never slip out of the modal to <body> or the page behind.
        var inBox = a && a !== box && box.contains(a);
        var ahead = inBox && f.some(function (x) {
          var pos = a.compareDocumentPosition(x);
          return e.shiftKey ? (pos & 2) && !(pos & 8) : (pos & 4) || (pos & 16);   // 2 preceding, 8 contains, 4 following, 16 contained
        });
        if (!ahead) { e.preventDefault(); (e.shiftKey ? lastEl : first).focus(); }
        return;
      }
      if (e.shiftKey && a === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && a === lastEl) { e.preventDefault(); first.focus(); }
    };
    box.addEventListener('keydown', h);
    return function () { box.removeEventListener('keydown', h); };
  };

  /* ---------- overlays ----------
     Markup: <div class="overlay" id="x" data-overlay aria-hidden="true"><div class="overlay__scrim" data-close></div>
             <div class="... panel" role="dialog" aria-modal="true" aria-labelledby="...">…</div></div>
     Open from anywhere with AU.overlay.open('x') or any [data-open="x"] control. [data-close] inside closes.
     Escape closes the top one. Focus moves into the panel and returns to the opener. Emits 'overlay' {id, open}. */
  var stack = [];
  /* While a dialog is open, everything behind it is inert, so screen-reader swipe navigation (iOS VoiceOver,
     TalkBack) cannot wander out of it despite aria-modal. Only the page's own regions and the other overlays are
     touched (never the toast, whose live region must still speak), and only inert that core set is ever removed. */
  var BACKDROP = 'body > header, body > main, body > footer, body > .skip, body > #intro, body > [data-overlay], body > .overlay';
  var setInert = function () {
    var top = stack[stack.length - 1] || null;
    AU.$$(BACKDROP).forEach(function (el) {
      var on = !!top && el !== top;
      if (on && !el.hasAttribute('inert')) { el.setAttribute('inert', ''); el.__auInert = true; }
      else if (!on && el.__auInert) { el.removeAttribute('inert'); el.__auInert = false; }
    });
  };
  AU.overlay = {
    open: function (id, opener) {
      var el = document.getElementById(id); if (!el || el.classList.contains('is-open')) return;
      el.__opener = opener || document.activeElement;
      el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
      el.__release = AU.trapFocus(el);
      el.style.zIndex = 150 + stack.length + 1;   // the newest overlay always sits on top, whatever the DOM order
      stack.push(el); AU.lockScroll(true); setInert();
      setTimeout(function () {
        var f = el.querySelector('[autofocus]') || el.querySelector('[role="dialog"]') || el;
        if (f.getAttribute('tabindex') == null && !/^(INPUT|BUTTON|A|SELECT|TEXTAREA)$/.test(f.tagName)) f.setAttribute('tabindex', '-1');
        f.focus({ preventScroll: true });
      }, 60);
      AU.emit('overlay', { id: id, open: true });
    },
    close: function (id) {
      var el = id ? document.getElementById(id) : stack[stack.length - 1];
      if (!el || !el.classList.contains('is-open')) return;
      el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true');
      if (el.__release) el.__release();
      stack = stack.filter(function (x) { return x !== el; }); AU.lockScroll(false);
      setInert();   // before focus returns: an inert opener cannot take focus
      if (el.__opener && el.__opener.focus) el.__opener.focus({ preventScroll: true });
      AU.emit('overlay', { id: el.id, open: false });
    },
    isOpen: function (id) { var el = document.getElementById(id); return !!(el && el.classList.contains('is-open')); }
  };
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]');
    if (o) { e.preventDefault(); AU.overlay.open(o.getAttribute('data-open'), o); return; }
    var c = e.target.closest('[data-close]');
    if (c) { var ov = c.closest('.overlay'); if (ov) { e.preventDefault(); AU.overlay.close(ov.id); } }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stack.length) AU.overlay.close(); });

  /* ---------- cart and wishlist state (UI for them lives in the boutique section) ----------
     item: { id, name, price, qty, spec (3D spec object), meta (short text, e.g. "Rose gold · Ruby · Size 6") }
     The line key is id + meta, so the same piece in two sizes is two lines. */
  var cartItems = AU.store.get('cart', []);
  if (!Array.isArray(cartItems)) cartItems = [];
  var saveCart = function () { AU.store.set('cart', cartItems); AU.emit('cart', AU.cart.state()); };
  AU.cart = {
    state: function () { return { items: cartItems.slice(), count: AU.cart.count(), total: AU.cart.total(), lines: AU.cart.lines() }; },
    items: function () { return cartItems.slice(); },
    count: function () { return cartItems.reduce(function (a, i) { return a + i.qty; }, 0); },
    /* total() is in USD (for adapters and logic). For anything shown, use the lines, which add up in every currency:
       AU.price(AU.cart.lines()), or AU.cart.totalLocal() for the number in the current currency. */
    total: function () { return cartItems.reduce(function (a, i) { return a + i.qty * i.price; }, 0); },
    lines: function () { return cartItems.map(function (i) { return [i.price, i.qty]; }); },
    totalLocal: function () { return AU.localSum(AU.cart.lines()); },
    key: function (item) { return item.id + '|' + (item.meta || ''); },
    add: function (item) {
      var k = AU.cart.key(item), hit = cartItems.find(function (i) { return AU.cart.key(i) === k; });
      if (hit) hit.qty = Math.min(9, hit.qty + (item.qty || 1));
      else cartItems.push({ id: item.id, name: item.name, price: item.price, qty: item.qty || 1, spec: item.spec || null, meta: item.meta || '' });
      saveCart();
    },
    setQty: function (key, q) {
      cartItems = cartItems.map(function (i) { if (AU.cart.key(i) === key) i.qty = AU.clamp(q, 0, 9); return i; }).filter(function (i) { return i.qty > 0; });
      saveCart();
    },
    remove: function (key) { cartItems = cartItems.filter(function (i) { return AU.cart.key(i) !== key; }); saveCart(); },
    clear: function () { cartItems = []; saveCart(); }
  };
  var wish = AU.store.get('wish', []);
  if (!Array.isArray(wish)) wish = [];
  AU.wish = {
    list: function () { return wish.slice(); },
    has: function (id) { return wish.indexOf(id) >= 0; },
    toggle: function (id) {
      if (AU.wish.has(id)) wish = wish.filter(function (x) { return x !== id; }); else wish.push(id);
      AU.store.set('wish', wish); AU.emit('wish', wish.slice());
      return AU.wish.has(id);
    }
  };

  /* ---------- WebGL module handshake ----------
     src/gl/ is an ES module that loads three.js from the CDN and sets window.AUGL, then emits 'gl'.
     AU.gl is a promise that resolves to AUGL, or to null if WebGL is missing or the module has not arrived in 12s.
     Sections must always have a non-3D fallback for null.
     AU.hasWebGL is only a feature test of the API. It used to open a throwaway WebGL context at startup, which cost
     130–460 ms of main thread on load (the engine opens its real contexts later anyway, in idle slices). A browser
     that has the API but cannot give a context is caught by the engine: it reports AU.emit('gl', null), AU.gl
     resolves null and html.no-gl is set, so every 3D spot falls back. */
  AU.hasWebGL = !!(window.WebGL2RenderingContext || window.WebGLRenderingContext);
  AU.on('gl', function (api) { if (!api) html.classList.add('no-gl'); });
  AU.gl = new Promise(function (res) {
    if (!AU.hasWebGL) { html.classList.add('no-gl'); res(null); return; }
    if (window.AUGL) { res(window.AUGL); return; }
    var off = AU.on('gl', function (api) { off(); res(api || null); });
    setTimeout(function () { if (!window.AUGL) { html.classList.add('no-gl'); res(null); } }, 12000);
  });

  /* ---------- product images: pre-rendered files first, live rendering only as a fallback (v2) ----------
     tools/prerender.js renders every catalogue image once (headless, real GPU) into assets/r/*.webp and writes the
     manifest src/js/05-assets.js (AU.assets = { key: path | {url, frames, cols, rows, size} }). The page then never
     renders stills or spin sheets in the visitor's browser, which is what made v1 stutter.
     AU.assetKey(spec, kind, size, mode)  kind 'still' | 'spin'; size in px; mode 'dark' | 'light'
     AU.img(spec, {size = 640, mode})     -> Promise<url>   (nearest pre-rendered size ≥ requested, else AUGL.render)
     AU.spinImg(spec, {size = 400, mode}) -> Promise<{url, frames, cols, rows, size} | null>  (sheet of frames laid
                                             out in a grid, row by row; null when neither a file nor 3D is available) */
  AU.assets = AU.assets || {};
  AU.assetKey = function (spec, kind, size, mode) {
    var s = spec || {};
    return [s.type, s.style, s.metal, s.stone || '-', s.cut || '-', (+s.carat || 0).toFixed(2), s.accent || '-'].join('.') +
      '|' + kind + '|' + size + '|' + (mode || AU.getMode());
  };
  var pick = function (spec, kind, size, mode) {
    var sizes = kind === 'spin' ? [400] : [480, 960];
    for (var i = 0; i < sizes.length; i++) {
      if (sizes[i] >= size || i === sizes.length - 1) {
        var hit = AU.assets[AU.assetKey(spec, kind, sizes[i], mode)];
        if (hit) return hit;
      }
    }
    return null;
  };
  AU.img = function (spec, o) {
    o = o || {}; var size = o.size || 640, mode = o.mode || AU.getMode();
    var hit = pick(spec, 'still', size, mode);
    if (hit) return Promise.resolve(typeof hit === 'string' ? hit : hit.url);
    return AU.gl.then(function (gl) { return gl ? gl.render(spec, { size: size, mode: mode, view: o.view }) : null; });
  };
  AU.spinImg = function (spec, o) {
    o = o || {}; var size = o.size || 400, mode = o.mode || AU.getMode();
    var hit = pick(spec, 'spin', size, mode);
    if (hit) return Promise.resolve(hit);
    return AU.gl.then(function (gl) {
      if (!gl) return null;
      return gl.spin(spec, { size: size, frames: o.frames || 36, mode: mode }).then(function (r) {
        return r && { url: r.url, frames: r.frames, cols: r.cols || r.frames, rows: r.rows || 1, size: r.size };
      });
    });
  };

  /* ---------- visitor preferences (v2): sound (off by default), seasonal mood ---------- */
  AU.prefs = {
    sound: !!AU.store.get('sound', false),
    season: AU.store.get('season', 'auto')     // 'auto' | 'none' | 'valentine' | 'wedding' | 'holiday'
  };
  AU.setPref = function (k, v) { AU.prefs[k] = v; AU.store.set(k, v); AU.emit('pref', { key: k, value: v }); };

  /* ---------- product lookup (data in 01-content.js) ---------- */
  AU.product = function (id) { return (AU.content && AU.content.products || []).find(function (p) { return p.id === id; }) || null; };

  /* ---------- landing: when the first page may start to move ----------
     A direct load does its heaviest work in the frames right after the first page appears (the router's first layout,
     the areas' start-up, the first raster of the whole page). An entrance animated through those frames drops several
     of them: the title's words rise in jerks. So the first page's own animations are held at their first frame
     (00-tokens.css: #main:not(.is-landed) pauses them) until the page has settled, then all start together:
       AU.landed               Promise, resolved once (never rejects)
       AU.on('landed', fn)     the same as an event
       html.is-landed, #main.is-landed
     The router calls AU.land() after the first view is in place; it waits for the frames to run smoothly again (two
     consecutive frames under 24 ms, at most ~450 ms), and while the intro is up for the curtain to start lifting
     (html.is-revealed, set by the shell). Failsafe: whatever happens, the page lands within 6 s of start-up.
     An area that starts an entrance by adding a class (a transition, which cannot be paused) can wait with
     AU.landed.then(…). Later page changes are already landed: the transition (atmos) owns their entrance. */
  var landRes, landStarted = false;
  AU.isLanded = false;
  AU.landed = new Promise(function (res) { landRes = res; });
  var doLand = function () {
    if (AU.isLanded) return;
    AU.isLanded = true;
    html.classList.add('is-landed');
    var m = document.getElementById('main'); if (m) m.classList.add('is-landed');
    landRes(); AU.emit('landed');
  };
  AU.land = function () {
    if (landStarted || AU.isLanded) return;
    landStarted = true;
    var waitReveal = function (fn) {
      // the shell marks html.is-revealed when the page is first shown (at once without the intro; when the curtain
      // starts to lift with it). Without a shell there is nothing to wait for.
      if (!AU.shell || html.classList.contains('is-revealed') || !window.MutationObserver) { fn(); return; }
      var mo = new MutationObserver(function () { if (html.classList.contains('is-revealed')) { mo.disconnect(); fn(); } });
      mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    };
    waitReveal(function () {
      if (AU.reduced || document.hidden) { requestAnimationFrame(doLand); return; }
      // settle: wait until two frames in a row arrive on time, so the first animated frame is not one of the heavy
      // boot frames (the first raster of the page can take 50–120 ms with no script at all)
      var t0 = performance.now(), prev = 0, good = 0;
      var step = function (t) {
        if (prev) good = t - prev < 24 ? good + 1 : 0;
        prev = t;
        if ((good >= 2 && t - t0 > 30) || t - t0 > 450) { doLand(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };
  setTimeout(doLand, 6000);

  /* ---------- startup ---------- */
  AU.ready(function () {
    AU.applyT(document);
    AU.hydrateIcons(document);
    // Section scripts run their own AU.ready() handlers after this one (they are later scripts), then call
    // AU.reveal(their root). This catches anything left over once everything has loaded.
    window.addEventListener('load', function () { AU.reveal(document); });
  });
  // delegated, so controls rendered later (views, re-rendered chrome) work too
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-mode-toggle]')) AU.toggleMode();
  });
})();
