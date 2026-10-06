/* ---- 03-router.js ---- */
/* Aurelia router (v2): the site is a set of pages ("views") inside one document.
   Each area registers its routes; the router renders the matching view into <main id="main">, runs the page transition,
   keeps scroll positions for back/forward, updates the title, description, canonical link and JSON-LD, and moves focus
   to the new page's heading for screen readers.

   Links are always written as '#/path' in markup and content. In hash mode (the artifact, file://) that is the real URL.
   In path mode (a real web host, set by the build through window.AU_BUILD) the router turns them into '/path' URLs.

   AU.router.add(pattern, def)
     pattern  '/', '/boutique', '/boutique/:type', '/piece/:id' (':name' = one segment), '*' = not found
     def = {
       name:        'piece'                              short id; the view element gets class view--<name>
       title:       'Boutique' | (params, query) => str  page title (" — Aurelia" is appended, except on '/')
       description: str | (params, query) => str         meta description
       jsonld:      (params, query) => object | null     structured data for this page
       render:      (el, params, ctx) => cleanup? | Promise<cleanup?>
                    Fill `el` (an empty <div class="view">). ctx = { query, from (previous path), dir ('forward' | 'back'
                    | 'replace'), signal (AbortSignal, aborted when the page is left), onLeave(fn) }.
                    Return (or register with ctx.onLeave) a cleanup that disposes 3D stages, timers and listeners.
       scroll:      'top' (default) | 'keep'              where a forward navigation lands
     }
   AU.router.go('/piece/au-trinity', { replace })   navigate in code
   AU.router.href('/visit')                          the href to put in markup ('#/visit' or '/visit')
   AU.router.current                                 { path, params, query, name, el }
   Events: AU.emit('route', { path, name, params, from, dir }) after the new page is in place;
           AU.emit('route:leave', { path, name }) before the old page goes.
   In-page anchors still work: '#/atelier?at=process' scrolls to #process inside the atelier page after it renders;
   a plain '#id' link scrolls within the current page without routing. */
(function () {
  'use strict';
  var AU = window.AU;
  var BUILD = window.AU_BUILD || {};
  var mode = BUILD.route === 'path' && /^https?:/.test(location.protocol) ? 'path' : 'hash';
  var base = (BUILD.base || '/').replace(/\/?$/, '/');
  var routes = [];
  var idx = 0, current = null, busy = null, pending = null;
  var scrolls = {};            // history index -> scrollY
  var ROUTE_ALIASES = { collections: '/collections', boutique: '/boutique', atelier: '/atelier', bespoke: '/bespoke', visit: '/visit', top: '/', voices: '/atelier' };

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  var compile = function (pattern) {
    if (pattern === '*') return { re: null, keys: [] };
    var keys = [];
    var src = pattern.replace(/\/$/, '').replace(/:(\w+)/g, function (m, k) { keys.push(k); return '([^/]+)'; });
    return { re: new RegExp('^' + (src || '') + '/?$'), keys: keys };
  };
  var parse = function (full) {
    var q = {}, path = full || '/', i = path.indexOf('?');
    if (i >= 0) {
      path.slice(i + 1).split('&').forEach(function (kv) {
        if (!kv) return; var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
      });
      path = path.slice(0, i);
    }
    if (path.charAt(0) !== '/') path = '/' + path;
    return { path: path.replace(/\/+$/, '') || '/', query: q };
  };
  var match = function (path) {
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      if (!r.c.re) continue;
      var m = path.match(r.c.re);
      if (m) {
        var params = {};
        r.c.keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); });
        return { route: r, params: params };
      }
    }
    var nf = routes.find(function (r) { return r.pattern === '*'; });
    return nf ? { route: nf, params: {} } : null;
  };
  var locPath = function () {
    if (mode === 'path') {
      var p = location.pathname;
      if (p.indexOf(base) === 0) p = '/' + p.slice(base.length);
      return p + location.search;
    }
    var h = location.hash || '';
    if (h.indexOf('#/') === 0) return h.slice(1);
    var id = h.slice(1);
    if (id && ROUTE_ALIASES[id]) return ROUTE_ALIASES[id];
    return '/';
  };
  var urlFor = function (full) { return mode === 'path' ? base + full.replace(/^\//, '') : '#' + full; };
  var text = function (v, params, query) { return typeof v === 'function' ? v(params, query) : v; };

  /* The home tab reads "Aurelia — Fine Jewelry" in every language. It comes from home.meta.title when an area or a
     translation provides it, else from the edition line with its number taken off ("No. 2.0 — ", "N° 2.0 — ",
     "Nr. 2.0 — "), so no version number reaches the browser tab or a bookmark. */
  var homeTail = function () {
    var C = AU.content, h = C.home && C.home.meta && C.home.meta.title;
    if (h) return h;
    var ed = (C.brand && C.brand.edition) || '';
    return ed.replace(/^\s*(No\.?|Nº|N°|Nr\.?)\s*[\d.]+\s*[—–-]\s*/i, '').trim() || 'Fine Jewelry';
  };
  /* Pages that must not be indexed: the not-found view (it would otherwise claim the bad address as canonical), the
     bag/checkout and the compare table (state, not content). A route can also opt in with def.noindex. While one is
     shown there is no canonical link and a robots noindex; both are restored on the next page. */
  var NOINDEX = /^\/(checkout|compare)(\/|$)/;
  var isNoindex = function (route, path) { return route.pattern === '*' || !!route.def.noindex || NOINDEX.test(path); };
  var setRobots = function (noindex) {
    var r = document.querySelector('meta[name="robots"][data-au]');
    if (noindex) {
      if (!r) { r = document.createElement('meta'); r.name = 'robots'; r.setAttribute('data-au', ''); document.head.appendChild(r); }
      r.setAttribute('content', 'noindex, follow');
    } else if (r) r.remove();
  };
  var setCanonical = function (path, route) {
    var can = document.querySelector('link[rel="canonical"]');
    if (route && isNoindex(route, path)) { if (can) can.remove(); setRobots(true); return; }
    setRobots(false);
    var site = (AU.content.config && AU.content.config.siteUrl) || '';
    if (!can) { can = document.createElement('link'); can.rel = 'canonical'; document.head.appendChild(can); }
    can.href = site.replace(/\/$/, '') + (path === '/' ? '/' : path);
  };

  var setMeta = function (route, params, query, path) {
    var brand = (AU.content.brand && AU.content.brand.name) || 'Aurelia';
    var t = text(route.def.title, params, query);
    document.title = path === '/' || !t ? brand + ' — ' + homeTail() : t + ' — ' + brand;
    var d = text(route.def.description, params, query);
    var md = document.querySelector('meta[name="description"]');
    if (d && md) md.setAttribute('content', d);
    setCanonical(path, route);
    var ld = document.getElementById('ld-route');
    var data = route.def.jsonld ? route.def.jsonld(params, query) : null;
    if (data) {
      if (!ld) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.id = 'ld-route'; document.head.appendChild(ld); }
      ld.textContent = JSON.stringify(data);
    } else if (ld) ld.remove();
  };

  var announcer;
  var announce = function (msg) {
    if (!announcer) {
      announcer = document.createElement('div'); announcer.className = 'sr-only';
      announcer.setAttribute('aria-live', 'polite'); announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
    }
    announcer.textContent = ''; setTimeout(function () { announcer.textContent = msg; }, 60);
  };

  var scrollTo = function (y, immediate) {
    if (AU.scrollTo) AU.scrollTo(y, { immediate: immediate !== false });
    else window.scrollTo(0, y);
  };

  var render = function (full, dir) {
    var p = parse(full), m = match(p.path);
    var main = document.getElementById('main');
    if (!m || !main) return Promise.resolve();
    var from = current;
    if (from && from.path === p.path && JSON.stringify(from.query) === JSON.stringify(p.query) && dir !== 'force') {
      if (p.query.at) { var t0 = document.getElementById(p.query.at); if (t0) scrollTo(t0.getBoundingClientRect().top + window.scrollY - 20, false); }
      return Promise.resolve();
    }
    if (from) AU.emit('route:leave', { path: from.path, name: from.name });

    var el = document.createElement('div');
    el.className = 'view view--' + (m.route.def.name || 'page');
    el.setAttribute('data-route', p.path);
    var ctrl = typeof AbortController === 'function' ? new AbortController() : { signal: {}, abort: function () {} };
    var leaves = [];
    var ctx = { query: p.query, from: from && from.path, dir: dir, signal: ctrl.signal, onLeave: function (fn) { leaves.push(fn); } };
    var next = { path: p.path, query: p.query, params: m.params, name: m.route.def.name || 'page', el: el, route: m.route, ctrl: ctrl, leaves: leaves };

    var out;
    try { out = m.route.def.render(el, m.params, ctx); } catch (e) { console.error('[router] render failed for', p.path, e); }
    return Promise.resolve(out).catch(function (e) { console.error('[router]', e); }).then(function (cleanup) {
      if (typeof cleanup === 'function') leaves.push(cleanup);
      if (AU.hydrateIcons) AU.hydrateIcons(el);
      if (AU.reprice) AU.reprice(el);
      if (AU.applyT) AU.applyT(el);
      // swap() puts the new page in; the old one stays until the transition resolves (so they can cross-fade)
      var swap = function () { if (!el.parentNode) main.appendChild(el); };
      var finishOld = function () {
        if (!from) return;
        try { from.ctrl.abort(); } catch (e) {}
        from.leaves.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
      };
      current = next;
      AU.router.current = { path: next.path, params: next.params, query: next.query, name: next.name, el: el };
      setMeta(m.route, m.params, p.query, p.path);
      document.documentElement.setAttribute('data-view', next.name);

      var keepY = window.scrollY;
      var landing = function () {
        // a refresh in place (a language change) keeps the reader where they were
        if (dir === 'force') { scrollTo(keepY); return; }
        if (p.query.at) {
          var t = el.querySelector('#' + CSS.escape(p.query.at));
          if (t) { scrollTo(t.getBoundingClientRect().top + window.scrollY - 20); return; }
        }
        if (dir === 'back' && scrolls[idx] != null) scrollTo(scrolls[idx]);
        else if (m.route.def.scroll !== 'keep') scrollTo(0);
      };
      /* AU.transition (atmos) choreographs the change: it must call swap() once and landing() once (when the new
         page should be scrolled into place), and resolve when the old page can be removed. */
      var t = from && AU.transition ? AU.transition(from.el, el, { swap: swap, landing: landing, dir: dir, from: from.name, to: next.name })
                                     : (finishOld(), from && from.el.remove(), swap(), landing(), null);
      return Promise.resolve(t).then(function () {
        if (t !== null) finishOld();
        if (from && from.el && from.el.parentNode) from.el.remove();
        if (AU.reveal) AU.reveal(el);
        // a refresh in place is not a new page: focus stays where the visitor left it (e.g. the language chip)
        if (from && dir !== 'force') {
          var h = el.querySelector('h1, h2');
          if (h) { if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
          announce(document.title);
        }
        AU.emit('route', { path: next.path, name: next.name, params: next.params, query: next.query, from: from && from.path, dir: dir });
        // the first page is in place: its entrance may start once the boot frames have passed (AU.land, 00-core.js)
        if (!from && AU.land) AU.land();
      });
    });
  };

  var navigate = function (full, dir) {
    if (busy) { pending = [full, dir]; return busy; }
    busy = render(full, dir).then(function () {
      busy = null;
      if (pending) { var n = pending; pending = null; return navigate(n[0], n[1]); }
    }, function (e) { busy = null; console.error(e); });
    return busy;
  };

  AU.router = {
    mode: mode,
    current: null,
    add: function (pattern, def) {
      routes = routes.filter(function (r) { return r.pattern !== pattern; });
      routes.push({ pattern: pattern, def: def, c: compile(pattern) });
      // more specific (more segments, fewer params) first; '*' last
      routes.sort(function (a, b) {
        if (a.pattern === '*') return 1; if (b.pattern === '*') return -1;
        var sa = a.pattern.split('/').length, sb = b.pattern.split('/').length;
        if (sa !== sb) return sb - sa;
        return a.c.keys.length - b.c.keys.length;
      });
    },
    href: function (full) { return urlFor(full.charAt(0) === '#' ? full.slice(1) : full); },
    go: function (full, o) {
      o = o || {};
      if (full.charAt(0) === '#') full = full.slice(1);
      scrolls[idx] = window.scrollY;
      if (o.replace) history.replaceState({ auIdx: idx }, '', urlFor(full));
      else history.pushState({ auIdx: ++idx }, '', urlFor(full));
      return navigate(full, o.replace ? 'replace' : 'forward');
    },
    refresh: function () { return current ? navigate(current.path + qs(current.query), 'force') : null; },
    /* change only the address of the page that is open (filters, shareable state): no new page, no history entry.
       Keeps the router's own record (used by refresh and same-page checks), AU.router.current and the canonical link
       in step. */
    setQuery: function (full) {
      if (!current) return;
      if (full.charAt(0) === '#') full = full.slice(1);
      var p = parse(full);
      try { history.replaceState(history.state, '', urlFor(p.path + qs(p.query))); } catch (e) {}
      current.path = p.path; current.query = p.query;
      if (AU.router.current) { AU.router.current.path = p.path; AU.router.current.query = p.query; }
      setCanonical(p.path, current.route);
    },
    back: function () { history.back(); },
    routes: function () { return routes.map(function (r) { return { pattern: r.pattern, name: r.def.name }; }); }
  };
  // commas stay readable in shared links (?ids=a,b,c); parse() decodes either way
  var enc = function (s) { return encodeURIComponent(s).replace(/%2C/gi, ','); };
  var qs = function (q) { var k = Object.keys(q || {}); return k.length ? '?' + k.map(function (x) { return enc(x) + '=' + enc(q[x]); }).join('&') : ''; };

  // links: every '#/…' link is a route link; in-page '#id' links scroll inside the current page
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if (href.indexOf('#/') === 0) { e.preventDefault(); AU.router.go(href.slice(1)); return; }
    if (mode === 'path' && href.charAt(0) === '/' && href.indexOf('//') !== 0) {
      var rel = href.indexOf(base) === 0 ? '/' + href.slice(base.length) : href;
      if (!/\.\w+$/.test(rel.split('?')[0])) { e.preventDefault(); AU.router.go(rel); }
      return;
    }
    if (href.length > 1 && href.charAt(0) === '#' && ROUTE_ALIASES[href.slice(1)] && !document.getElementById(href.slice(1))) {
      e.preventDefault(); AU.router.go(ROUTE_ALIASES[href.slice(1)]); return;
    }
    if (href.length > 1 && href.charAt(0) === '#') {
      var t = document.getElementById(href.slice(1));
      if (t) { e.preventDefault(); scrollTo(t.getBoundingClientRect().top + window.scrollY - 20, false); focusTarget(t); }
    }
  });
  // An in-page link also moves the keyboard focus (WCAG 2.4.1): the skip link lands on the page's heading, a table of
  // contents link on its section, so the next Tab continues from there instead of jumping back to the link.
  var FOCUSABLE = 'a[href],button,input,select,textarea,summary,[tabindex],[contenteditable="true"]';
  var focusTarget = function (t) {
    var f = t.id === 'main' ? (t.querySelector('.view h1, h1') || t.querySelector('h2') || t) : t;
    if (!f.matches(FOCUSABLE)) f.setAttribute('tabindex', '-1');
    try { f.focus({ preventScroll: true }); } catch (err) { f.focus(); }
  };
  window.addEventListener('popstate', function (e) {
    var to = e.state && e.state.auIdx != null ? e.state.auIdx : idx + 1;
    var dir = to < idx ? 'back' : 'forward';
    scrolls[idx] = window.scrollY;
    idx = to;
    if (!e.state) history.replaceState({ auIdx: idx }, '', location.href);
    navigate(locPath(), dir);
  });
  if (mode === 'hash') {
    window.addEventListener('hashchange', function () {
      // only for hashes typed by hand (our own navigation uses pushState and never fires this)
      var h = location.hash;
      if (h.indexOf('#/') === 0 && (!current || parse(h.slice(1)).path !== current.path)) { history.replaceState({ auIdx: ++idx }, '', h); navigate(h.slice(1), 'forward'); }
    });
  }

  /* A language change re-labels the open page in place (areas may or may not re-render it), so the tab title, the
     description and the JSON-LD follow the language here, at once, whatever the page does. */
  AU.on('lang', function () {
    if (!current) return;
    try { setMeta(current.route, current.params, current.query, current.path); } catch (e) { console.error('[router] meta', e); }
  });

  /* The first page is laid out in its real type. Showing it before the web fonts arrive made every title reflow a few
     frames later (Alex Brush and Cormorant are much narrower than the fallbacks: a layout shift on every deep link).
     So the first render waits for the faces the first screen uses (preloaded in the head, usually already there), but
     never more than ~700 ms: past that the page is shown in the fallback faces and swaps as before. Until then #main is
     empty (the header is up; the intro, when it plays, covers everything). */
  var FIRST_FACES = ['400 1em "Alex Brush"', '300 1em "Cormorant Garamond"', '400 1em "Cormorant Infant"', '300 1em "Cormorant Infant"'];
  var fontsFirst = function (cap) {
    var f = document.fonts;
    if (!f || typeof f.load !== 'function') return Promise.resolve();
    var all;
    try {
      all = Promise.all(FIRST_FACES.map(function (s) { return f.load(s).catch(function () {}); }))
        .then(function () { return f.ready; });
    } catch (e) { return Promise.resolve(); }
    return Promise.race([all, new Promise(function (r) { setTimeout(r, cap); })]).catch(function () {});
  };
  // start once every area script has registered its routes (their AU.ready handlers run before this timeout)
  AU.ready(function () {
    var faces = fontsFirst(700);
    setTimeout(function () {
      faces.then(function () {
        // a link followed while the fonts were on their way has already started a navigation: keep it
        if (current || busy) return;
        history.replaceState({ auIdx: idx }, '', location.href);
        navigate(locPath(), 'replace');
      });
    }, 0);
  });
})();
