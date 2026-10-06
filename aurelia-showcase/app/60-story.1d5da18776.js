/* ---- 60-story.js ---- */
/* Story area: shared kit for the atelier, journal, birthstones, gift finder, visit and client-care pages.
   The pages themselves live in 61-story-atelier.js … 66-story-care.js; each registers its routes through
   AU.storyKit.route(), which also re-renders the page when the language changes.
   Everything visible comes from AU.content (ui.story.*, timeline, journal, birthstones, care). */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU) return;

  var K = AU.storyKit = {};
  var NAMES = {};

  /* ---------- text ---------- */
  K.t = function (path, vars) { return AU.t('ui.story.' + path, vars); };
  K.locale = function () { return AU.lang === 'fr' ? 'fr-FR' : AU.lang === 'de' ? 'de-DE' : 'en-GB'; };
  /* an ISO date ('2026-09-18') in words for the current language; numerals wrapped for Cormorant Infant */
  K.date = function (iso, opts) {
    var p = String(iso || '').split('-'), d = new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
    var s;
    try { s = new Intl.DateTimeFormat(K.locale(), opts || { day: 'numeric', month: 'long', year: 'numeric' }).format(d); }
    catch (e) { s = iso; }
    return AU.nums(s);
  };
  K.monthName = function (i, form) {
    // British long names ("September"), but the three-letter short form ("Sep", not "Sept")
    var loc = form === 'short' && AU.lang === 'en' ? 'en-US' : K.locale();
    try { return new Intl.DateTimeFormat(loc, { month: form || 'long' }).format(new Date(2026, i, 1)); }
    catch (e) { return String(i + 1); }
  };
  /* "[label](#/route)" inside trusted content becomes a link; everything else is escaped */
  K.links = function (s) {
    return AU.nums(s).replace(/\[([^\]]+)\]\((#\/[^)\s]*)\)/g, function (m, label, href) {
      return '<a class="link sp-inline" href="' + AU.esc(href) + '">' + label + '</a>';
    });
  };
  /* whole-currency amounts for budgets ("$2,000"), in the visitor's currency */
  K.money0 = function (usd) {
    try {
      return new Intl.NumberFormat(AU.lang === 'fr' ? 'fr-FR' : AU.lang === 'de' ? 'de-DE' : 'en-US',
        { style: 'currency', currency: AU.currency, maximumFractionDigits: 0, minimumFractionDigits: 0 })
        .format(AU.convert ? AU.convert(usd) : usd).replace(/ /g, ' ');   // the narrow no-break space (fr) is missing from the faces
    } catch (e) { return '$' + usd; }
  };
  K.readMinutes = function (story) {
    var words = (story.body || []).concat(story.quote || '').join(' ').split(/\s+/).length;
    return Math.max(2, Math.round(words / 190));
  };
  K.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---------- routes: register, and re-render on a language change ---------- */
  K.route = function (pattern, def) {
    NAMES[def.name] = 1;
    AU.router.add(pattern, def);
  };
  var langT = 0;
  AU.on('lang', function () {
    clearTimeout(langT);
    langT = setTimeout(function () {
      var c = AU.router && AU.router.current;
      if (c && NAMES[c.name]) AU.router.refresh();
    }, 30);
  });
  K.isMine = function (name) { return !!NAMES[name]; };

  /* replace the query of the current page without re-rendering (shareable state: gift answers, the month) */
  K.setQuery = function (q) {
    var c = AU.router.current; if (!c) return;
    var keys = Object.keys(q).filter(function (k) { return q[k] != null && q[k] !== ''; });
    var full = c.path + (keys.length ? '?' + keys.map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]); }).join('&') : '');
    // integrator: through the router when it can, so a refresh (language change) re-renders this state, not the old one
    if (AU.router.setQuery) { AU.router.setQuery(full); return; }
    try { history.replaceState(history.state, '', AU.router.href(full)); } catch (e) {}
    c.query = {}; keys.forEach(function (k) { c.query[k] = String(q[k]); });
  };

  /* heavy work (a WebGL stage, its shader compiles) waits until the page change has landed and the main thread is idle */
  K.later = function (fn, signal) {
    var t = setTimeout(function () {
      var go = function () { if (!(signal && signal.aborted)) fn(); };
      if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1200 }); else setTimeout(go, 60);
    }, 700);
    if (signal && signal.addEventListener) signal.addEventListener('abort', function () { clearTimeout(t); });
  };

  K.scrollTo = function (y, immediate) {
    if (AU.scrollTo) AU.scrollTo(y, { immediate: !!immediate });
    else window.scrollTo({ top: y, behavior: immediate || AU.reduced ? 'auto' : 'smooth' });
  };
  K.headH = function () { return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--head-h'), 10) || 80; };
  /* the document top of an element (one layout read) */
  K.top = function (el) { return el.getBoundingClientRect().top + window.scrollY; };

  /* ---------- the page head every story page opens with: eyebrow, script title, lede ----------
     The words of the title rise out of their masks as the page lands (CSS, see .sp-head); reduced motion shows it whole. */
  K.head = function (o) {
    return '<header class="sp-head' + (o.bare ? '' : ' wrap') + (o.compact ? ' sp-head--compact' : '') + (o.cls ? ' ' + o.cls : '') + '">' +
      '<div class="sp-head__main">' +
        (o.eyebrow ? '<p class="eyebrow caps sp-head__eyebrow">' + AU.nums(o.eyebrow) + '</p>' : '') +
        '<h1 class="script ' + (o.compact ? 't-h2' : 't-h1') + ' sp-head__title" data-sp-split>' + o.titleHTML + '</h1>' +
      '</div>' +
      (o.lede ? '<p class="lede sp-head__lede">' + AU.nums(o.lede) + '</p>' : '') +
      (o.extra || '') +
    '</header>';
  };
  /* split the head title into words (each rises on its own). On a cold first visit the page waits, invisible and with its
     entrance paused, until the house faces have arrived (at most 1.2s): no flash of fallback type, and no layout shift
     when the fonts swap in. */
  var FACES = ['400 1em "Alex Brush"', '400 1em "Cormorant Infant"', '300 1em "Cormorant Garamond"'];
  K.prepHead = function (el) {
    AU.$$('[data-sp-split]', el).forEach(function (h) { AU.split(h); });
    var f = document.fonts;
    if (!f || !f.check || FACES.every(function (x) { try { return f.check(x); } catch (e) { return true; } })) return;
    el.classList.add('sp-wait');
    var done = function () { el.classList.remove('sp-wait'); };
    Promise.race([
      Promise.all(FACES.map(function (x) { return f.load(x).catch(function () {}); })),
      new Promise(function (r) { setTimeout(r, 1200); })
    ]).then(function () { requestAnimationFrame(done); }, done);
  };

  /* ---------- piece images (pre-rendered stills; live rendering only as AU.img's fallback) ----------
     K.img(spec, {size, alt, cls}) -> markup; K.hydrate(root, signal) loads them lazily, one live render at a time,
     fades each in when decoded, and swaps them for the other mode's render when light/dark changes. */
  var specs = [], queue = Promise.resolve();
  K.img = function (spec, o) {
    o = o || {};
    var i = specs.push(spec) - 1;
    return '<span class="sp-img' + (o.cls ? ' ' + o.cls : '') + '" data-sp-img="' + i + '" data-size="' + (o.size || 640) + '">' +
      '<img alt="' + AU.esc(o.alt || '') + '" decoding="async" loading="lazy" width="' + (o.size || 640) + '" height="' + (o.size || 640) + '">' +
    '</span>';
  };
  /* images wait for a pause in scrolling and an idle moment: a still that has to be rendered live (no pre-rendered file
     yet) is a long task, and must never land in the middle of a scroll */
  var lastScroll = 0;
  AU.onScroll(function () { lastScroll = performance.now(); });
  var idle = function () {
    return new Promise(function (r) {
      var wait = function () {
        var quiet = performance.now() - lastScroll;
        if (quiet < 260) { setTimeout(wait, 280 - quiet); return; }
        (window.requestIdleCallback || function (f) { return setTimeout(f, 60); })(function () { r(); }, { timeout: 400 });
      };
      wait();
    });
  };
  var load = function (box, mode) {
    var spec = specs[+box.getAttribute('data-sp-img')], size = +box.getAttribute('data-size') || 640;
    var img = box.querySelector('img');
    if (!spec || !img) return Promise.resolve();
    var key = mode || AU.getMode();
    if (box.__mode === key) return Promise.resolve();
    box.__mode = key;
    // a pre-rendered file is cheap and loads at once; only a live render waits for a quiet moment
    var hasFile = AU.assetKey && AU.assets && [480, 960].some(function (s) { return AU.assets[AU.assetKey(spec, 'still', s, key)]; });
    queue = queue.then(function () { return hasFile ? null : idle(); }).then(function () {
      if (!box.isConnected) return null;
      return AU.img(spec, { size: size, mode: key }).then(function (url) {
        if (!url || !box.isConnected) { if (!url) box.classList.add('is-empty'); return null; }
        var pre = new Image(); pre.decoding = 'async'; pre.src = url;
        return (pre.decode ? pre.decode() : Promise.resolve()).catch(function () {}).then(function () {
          if (!box.isConnected) return;
          if (box.classList.contains('is-loaded')) {
            box.classList.add('is-swapping');
            setTimeout(function () { img.src = url; box.classList.remove('is-swapping'); }, 380);
          } else {
            img.src = url;
            requestAnimationFrame(function () { box.classList.add('is-loaded'); });
          }
        });
      }).catch(function () { return null; });
    });
    return queue;
  };
  K.hydrate = function (root, signal) {
    var boxes = AU.$$('[data-sp-img]', root);
    if (!boxes.length) return;
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); e.target.__seen = true; load(e.target); } });
    }, { rootMargin: '60% 0px 60% 0px' }) : null;
    boxes.forEach(function (b) { if (io) io.observe(b); else { b.__seen = true; load(b); } });
    var off = AU.on('mode', function (m) {
      boxes.forEach(function (b) { if (b.__seen) load(b, m); });
    });
    var stop = function () { off(); if (io) io.disconnect(); };
    if (signal && signal.addEventListener) signal.addEventListener('abort', stop);
    return stop;
  };

  /* ---------- copy a link (gift results, journal stories) ---------- */
  K.copy = function (text) {
    var done = function () { if (AU.toast) AU.toast(K.t('common.copied'), 'check'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      ta.remove();
    }
  };
  K.absUrl = function (path) {
    if (AU.router.mode === 'path') return location.origin + AU.router.href(path);
    return location.href.split('#')[0] + AU.router.href(path);
  };

  /* ---------- the wishlist heart (gift results) ---------- */
  /* the heart: bare (no frame), as on the boutique's cards; `name` makes its label say what it saves */
  K.saveBtn = function (id, name) {
    var on = AU.wish && AU.wish.has(id);
    return '<button class="icon-btn sp-save" type="button" data-sp-save="' + AU.esc(id) + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + AU.esc(K.t('common.save') + (name ? ': ' + name : '')) + '">' + AU.icon('heart', { size: 19 }) + '</button>';
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sp-save]'); if (!b || !AU.wish) return;
    var on = AU.wish.toggle(b.getAttribute('data-sp-save'));
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on && AU.sparkleAt) AU.sparkleAt(b, { count: 8, spread: 50 });
    if (AU.toast) AU.toast(K.t(on ? 'common.savedToast' : 'common.removedToast'), 'heart');
  });
  AU.on('wish', function (list) {
    AU.$$('[data-sp-save]').forEach(function (b) { b.setAttribute('aria-pressed', list.indexOf(b.getAttribute('data-sp-save')) >= 0 ? 'true' : 'false'); });
  });

  /* ---------- a scroll-linked value, smoothed in the shared loop ----------
     K.scrub(fn(get), opts) runs fn(value) every frame while the value moves toward get() (critically damped, so it
     lands without overshoot); stops itself when settled and restarts on the next scroll. Returns { kick, stop }. */
  K.scrub = function (get, apply, o) {
    o = o || {};
    var k = o.k || 9, cur = null, off = null, target = 0;
    var step = function (t, dt) {
      target = get();
      if (cur == null || AU.reduced) cur = target;
      else cur += (target - cur) * (1 - Math.exp(-dt * k));
      if (Math.abs(target - cur) < (o.eps || 0.0004)) cur = target;
      apply(cur);
      if (cur === target && off) { off(); off = null; }
    };
    var kick = function () { if (!off) off = AU.tick(step); };
    var offScroll = AU.onScroll(kick);
    var onResize = function () { kick(); };
    window.addEventListener('resize', onResize);
    return {
      kick: kick,
      value: function () { return cur; },
      stop: function () { if (off) off(); off = null; offScroll(); window.removeEventListener('resize', onResize); }
    };
  };

  /* ---------- a closing band shared by several pages: two doors onward ---------- */
  K.doors = function (items) {
    return '<nav class="sp-doors wrap" aria-label="' + AU.esc(K.t('common.more')) + '">' + items.map(function (d) {
      return '<a class="sp-door" href="' + AU.esc(d.href) + '"><span class="caps caps--sm sp-door__k">' + AU.nums(d.kicker || '') + '</span>' +
        '<span class="sp-door__t">' + AU.nums(d.title) + '</span>' +
        '<span class="sp-door__a" aria-hidden="true">' + AU.icon('arrow', { size: 18 }) + '</span></a>';
    }).join('') + '</nav>';
  };
})();
