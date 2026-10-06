/* ---- 06-atmos.js ---- */
/* Aurelia atmos (v2): the feel of the whole site.
     1. Smooth scroll      Lenis on pointer devices (native on touch and with reduced motion), driven by AU.tick.
                           AU.scrollTo(y | element | selector, { immediate, offset }), AU.lenis (instance or null).
     2. Page transitions   AU.transition(oldEl, newEl, { swap, landing, dir, from, to }) -> Promise. View Transitions
                           API when available (old page fades and lifts, new one rises; [data-vt] pairs morph), else a
                           manual cross-fade. swap() and landing() are each called exactly once.
     3. Glint cursor       a small four-point star that follows the pointer (dark mode, fine pointers, not reduced).
                           [data-cursor="drag"] (+ optional data-cursor-label) turns it into a ring; "none" hides it.
     4. Sound              AU.sound = { play(name), ambient(name | null), enabled() }, synthesised with Web Audio.
                           Silent unless AU.prefs.sound. [data-sound="tick" | "chime" | …] plays on click.
     5. Seasons            AU.season ('none' | 'valentine' | 'wedding' | 'holiday'), html[data-season], event 'season';
                           a faint glow and one CSS particle layer at the top of each page.
   Everything here is optional for the other areas: they feature-test (AU.transition, AU.sound…) and fall back. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU) return;
  var html = document.documentElement;

  /* the few words atmos shows (translations go in 09-lang-*.js under ui.atmos) */
  AU.extendContent({ ui: { atmos: { drag: 'Drag', view: 'View' } } });

  var fineQ = matchMedia('(hover: hover) and (pointer: fine)');
  var once = function (fn) {
    var done = false;
    return function () { if (done) return; done = true; try { if (fn) fn(); } catch (e) { console.error('[atmos]', e); } };
  };
  var headH = function () { return parseInt(getComputedStyle(html).getPropertyValue('--head-h'), 10) || 0; };

  /* =====================================================================================================
     1. SMOOTH SCROLL
     ===================================================================================================== */
  var lenis = null, lenisTick = null, lenisRO = null, lastDY = 0;
  AU.lenis = null;

  /* Wheel over an element that can still scroll in that direction (a drawer list, a results pane, a long select)
     scrolls that element natively; Lenis only takes the page. Elements with overscroll-behavior: contain keep the
     wheel even at their ends, so a drawer never hands its scroll to the page behind it. */
  var canScroll = function (node) {
    if (node === document.body || node === html) return false;
    // style first (cheap, and most nodes stop here), sizes only for real scroll containers
    var cs = getComputedStyle(node);
    if (!/(auto|scroll|overlay)/.test(cs.overflowY)) return false;
    if (node.scrollHeight <= node.clientHeight + 1) return false;
    if (/contain|none/.test(cs.overscrollBehaviorY || cs.overscrollBehavior || '')) return true;
    return lastDY > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 0;
  };
  var prevent = function (node) {
    if (node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') return true;
    return canScroll(node);
  };
  var onVirtual = function (e) {
    lastDY = e.deltaY;
    // the page may have grown since Lenis last measured it (its own resize is debounced): re-measure near the end
    if (lenis && lenis.dimensions && lastDY > 0 && lenis.targetScroll + lastDY >= lenis.limit - 2) {
      try { lenis.dimensions.resize(); } catch (err) {}
    }
    return true;
  };

  var syncLock = function () {
    if (!lenis) return;
    var locked = html.classList.contains('is-locked');
    if (locked && !lenis.isStopped) lenis.stop();
    else if (!locked && lenis.isStopped) lenis.start();
  };

  var wantLenis = function () { return typeof window.Lenis === 'function' && !AU.touch && !AU.reduced && fineQ.matches; };
  var initLenis = function () {
    if (lenis || !wantLenis()) return;
    try {
      lenis = new window.Lenis({
        lerp: 0.1, smoothWheel: true, syncTouch: false, wheelMultiplier: 1, touchMultiplier: 1,
        gestureOrientation: 'vertical', prevent: prevent, virtualScroll: onVirtual,
        autoResize: false        // measured below, from a ResizeObserver, instead of Lenis's debounced timer
      });
    } catch (e) { console.error('[atmos] lenis', e); lenis = null; return; }
    AU.lenis = lenis;
    /* Lenis's own resize runs 250 ms after a change, in a timer, where reading scrollHeight forces a layout of
       whatever the page has just written (up to 70 ms on a long page while it loads). A ResizeObserver callback runs
       right after layout, so the same read is free there, and the scroll limit is fresh a frame after any change. */
    if (lenis.dimensions && 'ResizeObserver' in window) {
      lenisRO = new ResizeObserver(function () { if (lenis && lenis.dimensions) lenis.dimensions.resize(); });
      lenisRO.observe(html);
      window.addEventListener('resize', onWinResize);
    }
    try { if (lenis.dimensions) lenis.dimensions.resize(); } catch (e) {}
    html.classList.add('au-smooth');
    // one rAF for the whole site: Lenis advances inside AU.tick. Registered as early as possible (atmos runs before
    // the page areas), so every later tick that reads scrollY in the same frame sees the new position.
    lenisTick = AU.tick(function (t) { if (lenis) lenis.raf(t * 1000); });
    syncLock();
  };
  var onWinResize = function () { if (lenis && lenis.dimensions) lenis.dimensions.resize(); };
  var killLenis = function () {
    if (!lenis) return;
    if (lenisTick) lenisTick();
    lenisTick = null;
    if (lenisRO) { lenisRO.disconnect(); lenisRO = null; }
    window.removeEventListener('resize', onWinResize);
    try { lenis.destroy(); } catch (e) {}
    lenis = null; AU.lenis = null;
    html.classList.remove('au-smooth');
  };

  var resolveY = function (target, o) {
    if (typeof target === 'number') return target;
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el || !el.getBoundingClientRect) return null;
    return el.getBoundingClientRect().top + window.scrollY - (o.offset != null ? o.offset : headH());
  };
  /* AU.scrollTo(y | element | selector, { immediate, offset })
     immediate: jump (used by the router's landing, while the new page is not yet visible). Otherwise a calm eased
     glide whose length grows a little with the distance. Works while an overlay holds the page (force). */
  AU.scrollTo = function (target, o) {
    o = o || {};
    var y = resolveY(target, o);
    if (y == null || isNaN(y)) return;
    y = Math.max(0, Math.round(y));
    // already there (the router's landing on a first load, or from a page that was at the top): nothing to do. The
    // position is taken from what is already known (Lenis's own value, or core's AU.scroll.y), because reading
    // window.scrollY would force a layout of the page that was just put in, mid-task.
    var known = lenis ? lenis.animatedScroll : (AU.scroll && AU.scroll.y);
    if (o.immediate && typeof known === 'number' && y === Math.round(known) && (!lenis || !lenis.isScrolling)) return;
    if (lenis) {
      try { if (lenis.dimensions) lenis.dimensions.resize(); } catch (e) {}
      if (o.immediate) { lenis.scrollTo(y, { immediate: true, force: true }); return; }
      var dist = Math.abs(y - lenis.animatedScroll);
      lenis.scrollTo(y, {
        force: true, lock: false,
        duration: AU.clamp(0.75 + dist / 4200, 0.75, 1.6),
        easing: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
      });
      return;
    }
    var smooth = !o.immediate && !AU.reduced;
    try { window.scrollTo({ top: y, left: 0, behavior: smooth ? 'smooth' : 'instant' }); }
    catch (e) { window.scrollTo(0, y); }
  };

  AU.on('overlay', syncLock);
  if ('MutationObserver' in window) new MutationObserver(syncLock).observe(html, { attributes: true, attributeFilter: ['class'] });
  AU.on('reduced', function (r) { if (r) killLenis(); else initLenis(); });
  var onFine = function () { if (fineQ.matches) initLenis(); else killLenis(); };
  if (fineQ.addEventListener) fineQ.addEventListener('change', onFine); else if (fineQ.addListener) fineQ.addListener(onFine);
  // Lenis is a deferred script in the head: it has run by DOMContentLoaded (or never, if the CDN is unreachable)
  AU.ready(initLenis);
  window.addEventListener('load', initLenis);

  /* =====================================================================================================
     2. PAGE TRANSITIONS
     ===================================================================================================== */
  var MORPH_MAX = 8;
  var inView = function (el, pad) {
    if (!el || !el.getClientRects().length) return false;
    var r = el.getBoundingClientRect(), vh = window.innerHeight, vw = window.innerWidth;
    pad = pad || 0;
    return r.width > 4 && r.height > 4 && r.bottom > pad && r.top < vh - pad && r.right > 0 && r.left < vw;
  };
  /* What morphs. A page change the visitor started with a click (or Enter on a link) morphs only the piece they
     chose: the [data-vt] on or inside the clicked element, or the one its card holds. Naming every [data-vt] on screen
     would leave the others (a "Complete the look" piece that is below the fold on the new page) hanging at full
     strength in the old layout while the page around them fades. A click outside the page (header, menu, search
     overlay) morphs nothing: a named piece would be lifted above the overlay. Without a click (back / forward) the
     pieces on screen that the new page also shows are candidates; any that are not on screen after landing simply
     fade with the old page (06-atmos.css, ':only-child'). */
  var lastClick = null;
  document.addEventListener('click', function (e) { lastClick = { el: e.target, t: performance.now() }; }, true);
  var clickedVT = function (oldEl) {
    var c = lastClick; lastClick = null;
    if (!c || performance.now() - c.t > 1500) return undefined;       // not started by a click
    var el = c.el && c.el.nodeType === 1 ? c.el : c.el && c.el.parentElement;
    if (!el || !el.closest || !oldEl.contains(el)) return null;
    var a = el.closest('a[href], button, [role="button"], [role="link"]') || el;
    var hit = a.closest('[data-vt]') || a.querySelector('[data-vt]');
    // a card: the link is the name, the picture its sibling. Walk up while the ancestor holds exactly one piece
    for (var n = a.parentElement; !hit && n && n !== oldEl; n = n.parentElement) {
      var list = n.querySelectorAll('[data-vt]'), keys = {};
      if (!list.length) continue;
      for (var i = 0; i < list.length; i++) keys[list[i].getAttribute('data-vt')] = 1;
      if (Object.keys(keys).length === 1) hit = list[0];
      break;                                                            // several pieces: not ours to guess
    }
    return hit && inView(hit) ? hit : null;
  };
  var morphCandidates = function (oldEl, newEl) {
    var olds = {}, list = [], order = [];
    var hit = clickedVT(oldEl);
    if (hit === null) return list;
    if (hit) { olds[hit.getAttribute('data-vt')] = hit; order.push(hit.getAttribute('data-vt')); }
    else {
      AU.$$('[data-vt]', oldEl).forEach(function (el) {
        var k = el.getAttribute('data-vt');
        if (k && !olds[k] && inView(el, 24)) { olds[k] = el; order.push(k); }
      });
    }
    if (!order.length) return list;
    var seen = {};
    AU.$$('[data-vt]', newEl).forEach(function (el) {
      var k = el.getAttribute('data-vt');
      if (!k || seen[k] || !olds[k] || list.length >= MORPH_MAX) return;
      seen[k] = true;
      list.push({ key: k, a: olds[k], b: el, name: 'au-m-' + list.length });
    });
    return list;
  };
  /* The picture inside a [data-vt] box. A card names its picture box; the product page names its whole stage, whose
     still sits at 86% of the stage's height. Morphing box to stage would scale the piece differently in the two
     snapshots (two rings, one inside the other, while they cross). So each side names its picture: the box itself
     when it is one (img, [role=img]), else its one visible picture inside. The pair is then the same picture, scaled.
     A stage whose still has handed over to the live 3D canvas has no picture of known framing (the canvas fills the
     whole stage): it does not fly, it leaves with its page and the card arrives with the new one (a mismatched
     flight would show two pieces of different sizes crossing). */
  var PIC = 'img, picture, [role="img"]:not(canvas)';     // (a 3D canvas has role=img too, and fills its stage)
  var shownIn = function (node, root) {
    for (var n = node; n; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
      if (n === root) return true;
    }
    return true;
  };
  var pictureOf = function (el) {
    if (el.matches(PIC)) return el;
    var r = el.getBoundingClientRect();
    var all = AU.$$(PIC, el).filter(function (n) {
      for (var p = n.parentElement; p && p !== el; p = p.parentElement) if (p.matches(PIC)) return false;   // outermost only
      var q = n.getBoundingClientRect();
      return q.width * q.height > r.width * r.height * 0.2 && shownIn(n, el);
    });
    return all.length === 1 ? all[0] : null;
  };
  /* the new picture's image is usually still on its way when the page lands (and it fades in over a second once it
     has): the update waits a moment for it (the old page stays on screen meanwhile), then shows it at once for the
     flight, so the piece is never missing from the landing snapshot */
  var imgsOf = function (el) { return el.tagName === 'IMG' ? [el] : AU.$$('img', el); };
  // a picture is there once it holds an image (or drawn art); an image is ready once it is decoded
  var present = function (el) { return imgsOf(el).length > 0 || !!el.querySelector('svg, canvas'); };
  var waitPictures = function (els, ms) {
    if (!els.length) return Promise.resolve();
    var t0 = performance.now();
    var cap = new Promise(function (res) { setTimeout(res, ms); });
    var arrive = new Promise(function (res) {
      var check = function () {
        if (els.every(present) || performance.now() - t0 > ms) { res(); return; }
        setTimeout(check, 16);
      };
      check();
    });
    var decoded = arrive.then(function () {
      var imgs = [];
      els.forEach(function (el) { imgs = imgs.concat(imgsOf(el)); });
      return Promise.all(imgs.map(function (i) {
        if (!i.getAttribute('src')) return null;
        return i.decode ? i.decode().catch(function () {}) : null;
      }));
    });
    return Promise.race([decoded, cap]);
  };
  var setVT = function (el, name) {
    el.style.viewTransitionName = name || '';
    if ('viewTransitionClass' in el.style) el.style.viewTransitionClass = name ? (/^au-m-/.test(name) ? 'au-morph' : 'au-fixed') : '';
  };
  /* Fixed chrome (header, floating buttons, grain, the glint cursor) is lifted out of the page snapshot, so it stays
     perfectly still while the page underneath fades and rises. Overlays are left to their own animations. */
  // reads only (so they can all run before any style is written); nameAll() then writes
  var findChrome = function () {
    var found = [];
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el.id === 'main' || el.tagName === 'SCRIPT' || el.tagName === 'TEMPLATE') return;
      if (el.matches('[data-overlay], .overlay, .toast, .glint, .sr-only, .season-layer')) return;
      var cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
      if (cs.viewTransitionName && cs.viewTransitionName !== 'none') return;
      if (!el.getClientRects().length) return;
      found.push(el);
    });
    return found;
  };
  var nameAll = function (els, prefix) { els.forEach(function (el, i) { setVT(el, prefix + i); }); return els; };

  /* A morph between two boxes of different proportions letterboxes the snapshots, which would show a pale frame
     around the smaller one. When both boxes stand on the same opaque ground (an image well), the flying group is
     painted with that ground, so the box itself changes shape seamlessly while the piece inside cross-fades. */
  var opaqueBg = function (el) {
    var c = getComputedStyle(el).backgroundColor, m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    var p = m[1].split(',').map(parseFloat);
    return (p.length < 4 || p[3] > 0.9) ? 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')' : null;
  };
  var vtStyle = null;
  var morphStyles = function (pairs) {
    var css = pairs.map(function (p) {
      if (!p.bgA || !p.bgB) return '';
      return '::view-transition-group(' + p.name + '){background-color:' + p.bgB + ';border-radius:' + p.radius + '}';
    }).join('');
    // The sheet is only ever rewritten here, inside the transition's update (where the whole new page is being
    // styled anyway), and never cleared afterwards: changing a stylesheet restyles the entire document, and rules for
    // group names that no longer exist are inert.
    if (!css) return;
    if (!vtStyle) { vtStyle = document.createElement('style'); vtStyle.id = 'au-vt-style'; document.head.appendChild(vtStyle); }
    if (vtStyle.textContent !== css) vtStyle.textContent = css;
  };

  var vtSupported = function () { return typeof document.startViewTransition === 'function'; };
  var transitioning = false;

  var viaViewTransition = function (oldEl, newEl, swap, landing, cls) {
    // all reads first (rects, computed styles), then all writes: one style pass, no thrash
    var pairs = morphCandidates(oldEl, newEl).filter(function (p) { p.a = pictureOf(p.a); return !!p.a; });
    pairs.forEach(function (p, i) { p.name = 'au-m-' + i; p.bgA = opaqueBg(p.a); });
    var chrome = findChrome();
    pairs.forEach(function (p) { setVT(p.a, p.name); });
    nameAll(chrome, 'au-fx-');
    html.classList.add('vt-on');
    cls.forEach(function (c) { html.classList.add(c); });
    var used = [];
    var vt;
    try {
      vt = document.startViewTransition(function () {
        pairs.forEach(function (p) { setVT(p.a, ''); });
        oldEl.style.display = 'none';
        // the footer is held back while the page under it changes length (it would jump: layout shift), and fades in
        // once the new page has landed (the 'route' handler in section 6)
        html.classList.remove('au-foot');
        swap(); landing();
        if (lenis && lenis.dimensions) { try { lenis.dimensions.resize(); } catch (e) {} }
        // only morph into an element that is on screen once the new page has landed
        pairs.forEach(function (p) {
          if (!inView(p.b)) return;
          var pic = pictureOf(p.b);
          if (!pic) return;
          p.b = pic;
          used.push(p);
        });
        if (!used.length) { html.classList.remove('vt-morph'); return; }
        return waitPictures(used.map(function (p) { return p.b; }), 260).then(function () {
          used.forEach(function (p) { p.bgB = opaqueBg(p.b); p.radius = getComputedStyle(p.b).borderTopLeftRadius || '0'; });
          used.forEach(function (p) { setVT(p.b, p.name); p.b.setAttribute('data-au-vt-pic', ''); });
          html.classList.add('vt-morph');
          morphStyles(used);
        });
      });
    } catch (e) {
      vt = null;
    }
    var cleanup = function () {
      pairs.forEach(function (p) { setVT(p.a, ''); setVT(p.b, ''); p.b.removeAttribute('data-au-vt-pic'); });
      chrome.forEach(function (el) { setVT(el, ''); });
      html.classList.remove('vt-on', 'vt-morph');
      cls.forEach(function (c) { html.classList.remove(c); });
    };
    if (!vt) { cleanup(); oldEl.style.display = 'none'; html.classList.remove('au-foot'); swap(); landing(); return Promise.resolve(); }
    var safety = new Promise(function (res) { setTimeout(res, 1800); });
    var done = Promise.race([vt.finished.catch(function () {}), safety]);
    // if the update callback never ran (should not happen, but a skipped transition must still land the page)
    vt.updateCallbackDone.catch(function () {}).then(function () { oldEl.style.display = 'none'; swap(); landing(); });
    return done.then(function () { swap(); landing(); cleanup(); });
  };

  /* Without the API: the old page is pinned where it was seen (fixed, clipped to the screen), the new one is put in
     place and scrolled to its landing while it is still invisible, then they cross-fade: transform/opacity only. */
  var viaFade = function (oldEl, newEl, swap, landing, back, soft) {
    var r = oldEl.getBoundingClientRect();
    var top = Math.max(0, r.top), vh = window.innerHeight;
    var st = oldEl.style;
    st.position = 'fixed'; st.top = top + 'px'; st.left = r.left + 'px'; st.width = r.width + 'px';
    st.height = Math.max(0, vh - top) + 'px'; st.overflow = 'hidden'; st.margin = '0'; st.zIndex = '1'; st.pointerEvents = 'none';
    oldEl.scrollTop = Math.max(0, -r.top);
    oldEl.setAttribute('aria-hidden', 'true');
    newEl.classList.add('au-enter');
    if (back) newEl.classList.add('au-enter--back');
    if (soft) newEl.classList.add('au-enter--soft');
    html.classList.remove('au-foot');
    swap(); landing();
    void newEl.offsetHeight;   // commit the hidden start state before the transition begins
    return new Promise(function (res) {
      requestAnimationFrame(function () {
        oldEl.classList.add('au-leave');
        if (back) oldEl.classList.add('au-leave--back');
        if (soft) oldEl.classList.add('au-leave--soft');
        newEl.classList.add('au-enter--go');
        setTimeout(function () {
          newEl.classList.remove('au-enter', 'au-enter--go', 'au-enter--back', 'au-enter--soft');
          oldEl.style.display = 'none';
          res();
        }, soft ? 520 : 680);
      });
    });
  };

  AU.transition = function (oldEl, newEl, o) {
    o = o || {};
    var swap = once(o.swap), landing = once(o.landing);
    var back = o.dir === 'back', soft = o.dir === 'force' || o.dir === 'replace' && o.from === o.to;
    var instant = AU.reduced || !oldEl || !oldEl.isConnected || document.hidden || transitioning;
    if (instant) {
      if (oldEl) oldEl.style.display = 'none';
      html.classList.remove('au-foot');
      swap(); landing();
      return Promise.resolve();
    }
    transitioning = true;
    if (!soft && AU.sound) AU.sound.play('whoosh');
    var p;
    try {
      p = vtSupported()
        ? viaViewTransition(oldEl, newEl, swap, landing, [back ? 'vt-back' : 'vt-fwd'].concat(soft ? ['vt-soft'] : []))
        : viaFade(oldEl, newEl, swap, landing, back, soft);
    } catch (e) {
      console.error('[atmos] transition', e);
      oldEl.style.display = 'none'; html.classList.remove('au-foot'); swap(); landing();
      p = Promise.resolve();
    }
    return p.then(function () { transitioning = false; }, function (e) { transitioning = false; swap(); landing(); console.error(e); });
  };

  /* The footer (layout stability). It stands after <main>, so whenever the page above it changes length (the first
     page arriving in an empty <main>, or a page change between a long and a short page) it would jump into or out of
     the first screen: a layout shift. It is hidden (html:not(.au-foot), 06-atmos.css) until a page is in place, moved
     unseen, and shown two frames later, where it already stands; then it fades in. */
  var footRaf = 0;
  var footIn = function () {
    if (footRaf) cancelAnimationFrame(footRaf);
    footRaf = requestAnimationFrame(function () {
      footRaf = requestAnimationFrame(function () { footRaf = 0; html.classList.add('au-foot'); });
    });
  };
  AU.on('route', footIn);
  // never lose the footer if no page ever arrives (a broken route)
  AU.ready(function () { setTimeout(function () { if (!html.classList.contains('au-foot') && !transitioning) html.classList.add('au-foot'); }, 8000); });

  /* =====================================================================================================
     3. GLINT CURSOR (idea 18)
     One fixed element (a star, a hairline ring and a tiny label inside it); JS only moves it with translate3d, and
     only while it is catching up with the pointer. State changes are CSS transitions on its children.
     ===================================================================================================== */
  var cur = null, curOn = false, curTick = null;
  var cx = 0, cy = 0, tx = 0, ty = 0, curShown = false, curState = '', lastTarget = null, lastEval = 0;
  var TEXT_INPUT = 'input:not([type]), input[type="text"], input[type="email"], input[type="search"], input[type="tel"], ' +
    'input[type="url"], input[type="password"], input[type="number"], input[type="date"], textarea, select, [contenteditable=""], [contenteditable="true"]';
  var LINKISH = 'a[href], button:not([disabled]), [role="button"], [role="tab"], [role="switch"], [role="option"], label[for], summary, ' +
    'input[type="checkbox"], input[type="radio"], input[type="range"], input[type="submit"], input[type="button"], [data-cursor="link"]';

  var curWanted = function () { return fineQ.matches && !AU.reduced && AU.getMode() === 'dark'; };
  var buildCursor = function () {
    cur = document.createElement('div');
    cur.className = 'au-cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span class="au-cursor__halo"></span><span class="au-cursor__star"></span>' +
      '<span class="au-cursor__ring"><i></i><i></i></span><span class="au-cursor__label"></span>';
    document.body.appendChild(cur);
  };
  var place = function () { cur.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)'; };
  var follow = function (t, dt) {
    var k = 1 - Math.exp(-(dt || 0.016) * 20);   // frame-rate independent smoothing (~50ms to catch up)
    cx += (tx - cx) * k; cy += (ty - cy) * k;
    if (Math.abs(tx - cx) < 0.08 && Math.abs(ty - cy) < 0.08) { cx = tx; cy = ty; place(); stopFollow(); return; }
    place();
  };
  var stopFollow = function () { if (curTick) { curTick(); curTick = null; } };
  var curLabel = '';
  var setState = function (s, label) {
    if (s === curState && (s !== 'drag' || label === curLabel)) return;
    curState = s;
    if (s === 'drag') curLabel = label;
    cur.classList.toggle('is-link', s === 'link');
    cur.classList.toggle('is-drag', s === 'drag');
    cur.classList.toggle('is-off', s === 'off');
    if (s === 'drag') cur.querySelector('.au-cursor__label').textContent = label || AU.t('ui.atmos.drag');
  };
  var stateFor = function (target) {
    if (!target || !target.closest) return ['', ''];
    if (target.closest(TEXT_INPUT)) return ['off', ''];
    var c = target.closest('[data-cursor]');
    if (c) {
      var v = c.getAttribute('data-cursor');
      if (v === 'drag' || v === 'view') return ['drag', c.getAttribute('data-cursor-label') || AU.t('ui.atmos.' + v)];
      // the loupe is its own pointer: the glint steps aside
      if (v === 'none' || v === 'loupe') return ['off', ''];
    }
    if (target.closest(LINKISH)) return ['link', ''];
    return ['', ''];
  };
  var onMove = function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    tx = e.clientX; ty = e.clientY;
    if (!curShown) {
      cx = tx; cy = ty; place();
      curShown = true; cur.classList.add('is-on');
      lastEval = 0;
    }
    // the state is read on entering an element (pointerover), and again now and then while moving inside one, so a
    // control that changes its own data-cursor (the loupe switching on) is followed without a crossing
    var now = e.timeStamp || 0;
    if (e.target !== lastTarget || now - lastEval > 250) {
      lastTarget = e.target; lastEval = now;
      var s = stateFor(e.target); setState(s[0], s[1]);
    }
    if (!curTick) curTick = AU.tick(follow);
  };
  var onOver = function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    var s = stateFor(e.target); setState(s[0], s[1]);
  };
  var onOut = function (e) { if (!e.relatedTarget) { curShown = false; cur.classList.remove('is-on'); stopFollow(); } };
  var onDown = function () { cur.classList.add('is-down'); };
  var onUp = function () { cur.classList.remove('is-down'); };
  var onLeaveDoc = function () { curShown = false; cur.classList.remove('is-on'); stopFollow(); };
  var cursorOn = function () {
    if (curOn) return;
    if (!cur) buildCursor();
    curOn = true; cur.hidden = false;
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeaveDoc);
    window.addEventListener('blur', onLeaveDoc);
  };
  var cursorOff = function () {
    if (!curOn) return;
    curOn = false; curShown = false; stopFollow();
    cur.classList.remove('is-on'); cur.hidden = true;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('pointerout', onOut);
    document.removeEventListener('pointerdown', onDown);
    document.removeEventListener('pointerup', onUp);
    document.documentElement.removeEventListener('mouseleave', onLeaveDoc);
    window.removeEventListener('blur', onLeaveDoc);
  };
  var syncCursor = function () { if (curWanted()) cursorOn(); else cursorOff(); };
  AU.on('mode', syncCursor);
  AU.on('reduced', syncCursor);
  if (fineQ.addEventListener) fineQ.addEventListener('change', syncCursor); else if (fineQ.addListener) fineQ.addListener(syncCursor);
  // a new page under a still pointer: back to the plain glint (no hit-test here, which would force a layout in the
  // busiest frame of a page change); the next movement reads the element under it again
  AU.on('route', function () { if (curOn && cur) { lastTarget = null; setState('', ''); } });
  AU.ready(syncCursor);

  /* =====================================================================================================
     4. SOUND (idea 19). Everything is synthesised; nothing plays unless AU.prefs.sound. The AudioContext is made on
     the first user gesture after sound is switched on (browsers only allow audio after one).
     ===================================================================================================== */
  /* master level: quiet, always under whatever the visitor is listening to. Measured peaks at this level (dBFS):
     chime -21, box -20, tick -28, paper -33, whoosh -40; the atelier room tone sits near -47 (rms). */
  var LEVEL = 0.32;
  var A = null;                  // { ctx, master, verb, noise, brown }
  var ambWanted = null, amb = null, lastPlay = {};

  var makeNoise = function (ctx, secs, brown) {
    var n = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) {
      var w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  };
  /* a small dark room: stereo noise falling 60 dB over 2.4 s (an exponential tail, as a real room decays), low-passed
     more and more as it fades. Built once, on the click that turns sound on: a few milliseconds, no Math.pow per sample */
  var makeVerb = function (ctx) {
    var secs = 2.4, n = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(2, n, ctx.sampleRate);
    var r = Math.exp(Math.log(0.001) / n);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c), y = 0, g = 1;
      for (var i = 0; i < n; i++) {
        var a = 0.55 - 0.45 * (i / n);
        y += a * ((Math.random() * 2 - 1) - y);
        d[i] = y * g * (i < 120 ? i / 120 : 1);
        g *= r;
      }
    }
    return b;
  };
  var audio = function () {
    if (A) { if (A.ctx.state === 'suspended' && AU.prefs.sound) A.ctx.resume().catch(function () {}); return A; }
    if (!AU.prefs.sound) return null;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    try {
      var ctx = new C({ latencyHint: 'interactive' });
      var master = ctx.createGain(); master.gain.value = 0;
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
      master.connect(comp); comp.connect(ctx.destination);
      var verb = ctx.createConvolver(); verb.buffer = makeVerb(ctx);
      var wet = ctx.createGain(); wet.gain.value = 0.9; verb.connect(wet); wet.connect(master);
      A = { ctx: ctx, master: master, verb: verb, noise: makeNoise(ctx, 2, false), brown: null };
      master.gain.setTargetAtTime(LEVEL, ctx.currentTime, 0.15);
    } catch (e) { A = null; return null; }
    return A;
  };

  /* small building blocks */
  var out = function (node, dry, wet, pan) {
    var g = A.ctx.createGain(); g.gain.value = dry;
    var last = node;
    if (pan && A.ctx.createStereoPanner) { var p = A.ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); last = p; }
    last.connect(g); g.connect(A.master);
    if (wet) { var w = A.ctx.createGain(); w.gain.value = wet; last.connect(w); w.connect(A.verb); }
  };
  var env = function (param, t, attack, peak, decay) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };
  var noiseSrc = function (t, dur, offset) {
    var s = A.ctx.createBufferSource(); s.buffer = A.noise;
    s.start(t, offset == null ? Math.random() * Math.max(0, A.noise.duration - dur - 0.1) : offset, dur + 0.05);
    return s;
  };
  /* a bell: FM (1 : 3.5, the classic bell ratio) with the index falling as it rings, plus a soft hum an octave down */
  var bell = function (t, f, gain, tail, pan) {
    var ctx = A.ctx;
    var car = ctx.createOscillator(); car.frequency.value = f;
    var mod = ctx.createOscillator(); mod.frequency.value = f * 3.5;
    var idx = ctx.createGain(); idx.gain.setValueAtTime(f * 1.6, t); idx.gain.exponentialRampToValueAtTime(f * 0.02, t + tail * 0.5);
    mod.connect(idx); idx.connect(car.frequency);
    var g = ctx.createGain(); env(g.gain, t, 0.004, gain, tail);
    car.connect(g);
    var hum = ctx.createOscillator(); hum.frequency.value = f / 2;
    var hg = ctx.createGain(); env(hg.gain, t, 0.01, gain * 0.25, tail * 0.8);
    hum.connect(hg);
    var shim = ctx.createOscillator(); shim.frequency.value = f * 2.0035;
    var sg = ctx.createGain(); env(sg.gain, t, 0.003, gain * 0.12, tail * 0.45);
    shim.connect(sg);
    [g, hg, sg].forEach(function (n) { out(n, 0.75, 0.42, pan); });
    [car, mod, hum, shim].forEach(function (o) { o.start(t); o.stop(t + tail + 0.1); });
  };
  var click = function (t, f, gain, decay, pan, wet) {
    var ctx = A.ctx;
    var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    var g = ctx.createGain(); env(g.gain, t, 0.0015, gain, decay);
    o.connect(g); out(g, 1, wet || 0, pan);
    o.start(t); o.stop(t + decay + 0.05);
    var n = noiseSrc(t, 0.02);
    var hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = f * 1.3; hp.Q.value = 1.2;
    var ng = ctx.createGain(); env(ng.gain, t, 0.001, gain * 0.6, 0.012);
    n.connect(hp); hp.connect(ng); out(ng, 1, wet || 0, pan);
  };

  var VOICES = {
    chime: function (t, k) {
      bell(t, 1318.5, 0.3 * k, 2.8, -0.12);
      bell(t + 0.11, 1975.5, 0.17 * k, 2.4, 0.15);
    },
    tick: function (t, k) { click(t, 3100, 0.11 * k, 0.03, 0, 0.05); },
    whoosh: function (t, k) {
      var ctx = A.ctx, d = 0.8, n = noiseSrc(t, d);
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
      bp.frequency.setValueAtTime(320, t); bp.frequency.exponentialRampToValueAtTime(1500, t + 0.32); bp.frequency.exponentialRampToValueAtTime(600, t + d);
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09 * k, t + 0.26); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      n.connect(bp); bp.connect(g);
      if (ctx.createStereoPanner) {
        var p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.35, t); p.pan.linearRampToValueAtTime(0.35, t + d);
        g.connect(p); out(p, 1, 0.15);
      } else out(g, 1, 0.15);
    },
    box: function (t, k) {
      var ctx = A.ctx;
      // the velvet thump: a falling sine and a puff of low noise
      var o = ctx.createOscillator(); o.frequency.setValueAtTime(96, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.2);
      var g = ctx.createGain(); env(g.gain, t, 0.006, 0.34 * k, 0.32); o.connect(g); out(g, 1, 0.12);
      o.start(t); o.stop(t + 0.45);
      var n = noiseSrc(t, 0.18), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      var ng = ctx.createGain(); env(ng.gain, t, 0.004, 0.16 * k, 0.14); n.connect(lp); lp.connect(ng); out(ng, 1, 0.1);
      // a small hinge: four tiny, uneven ticks
      [0.42, 0.455, 0.5, 0.53].forEach(function (dt, i) { click(t + dt, 2300 + i * 260, 0.018 * k, 0.018, 0.1, 0.2); });
      // and the piece, catching the light
      VOICES.chime(t + 1.05, k * 0.85);
    },
    paper: function (t, k) {
      var ctx = A.ctx, d = 0.42, n = noiseSrc(t, d);
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.6;
      var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
      var g = ctx.createGain();
      var curve = new Float32Array(48);
      for (var i = 0; i < curve.length; i++) {
        var x = i / (curve.length - 1);
        var shape = Math.sin(Math.PI * Math.pow(x, 0.7));                 // one swell
        var flutter = 0.55 + 0.45 * Math.abs(Math.sin(x * 23 + Math.random() * 0.8));
        curve[i] = Math.max(0.0001, 0.11 * k * shape * flutter);
      }
      curve[curve.length - 1] = 0.0001;
      g.gain.setValueCurveAtTime(curve, t, d);
      n.connect(bp); bp.connect(hp); hp.connect(g); out(g, 1, 0.12, 0.15);
      // the page settling
      var n2 = noiseSrc(t + d - 0.04, 0.09), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      var g2 = ctx.createGain(); env(g2.gain, t + d - 0.04, 0.005, 0.05 * k, 0.08); n2.connect(lp); lp.connect(g2); out(g2, 1, 0.1);
    }
  };

  /* ambience: a near-silent room (warm low noise) with a soft tap from a distant bench every few seconds */
  var AMBIENCES = {
    atelier: function () {
      var ctx = A.ctx, t = ctx.currentTime;
      if (!A.brown) A.brown = makeNoise(ctx, 4, true);
      var src = ctx.createBufferSource(); src.buffer = A.brown; src.loop = true;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      var bus = ctx.createGain(); bus.gain.setValueAtTime(0.0001, t); bus.gain.exponentialRampToValueAtTime(1, t + 2.5);
      var room = ctx.createGain(); room.gain.value = 0.075;
      src.connect(lp); lp.connect(room); room.connect(bus); bus.connect(A.master);
      src.start(t);
      var timer = 0, alive = true;
      var tap = function () {
        if (!alive) return;
        if (!document.hidden) {
          var at = ctx.currentTime + 0.02, f = [2350, 2900, 3400, 4100][Math.floor(Math.random() * 4)];
          var pan = Math.random() * 1.2 - 0.6, k = 0.5 + Math.random() * 0.5;
          var o = ctx.createOscillator(); o.frequency.value = f;
          var o2 = ctx.createOscillator(); o2.frequency.value = f * 2.71;
          var g = ctx.createGain(); env(g.gain, at, 0.002, 0.024 * k, 0.22);
          var g2 = ctx.createGain(); env(g2.gain, at, 0.001, 0.009 * k, 0.08);
          o.connect(g); o2.connect(g2);
          var p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          var sink = p || bus;
          if (p) { p.pan.value = pan; p.connect(bus); }
          g.connect(sink); g2.connect(sink);
          var w = ctx.createGain(); w.gain.value = 1.4; g.connect(w); w.connect(A.verb);
          o.start(at); o2.start(at); o.stop(at + 0.35); o2.stop(at + 0.15);
          if (Math.random() < 0.3) { var o3 = ctx.createOscillator(); o3.frequency.value = f; var g3 = ctx.createGain(); env(g3.gain, at + 0.16, 0.002, 0.015 * k, 0.18); o3.connect(g3); g3.connect(sink); o3.start(at + 0.16); o3.stop(at + 0.4); }
        }
        timer = setTimeout(tap, 3800 + Math.random() * 7200);
      };
      timer = setTimeout(tap, 2200 + Math.random() * 2000);
      return function stop() {
        alive = false; clearTimeout(timer);
        var n = ctx.currentTime;
        bus.gain.cancelScheduledValues(n); bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), n);
        bus.gain.exponentialRampToValueAtTime(0.0001, n + 1.5);
        setTimeout(function () { try { src.stop(); } catch (e) {} bus.disconnect(); }, 1700);
      };
    }
  };
  var syncAmbient = function () {
    var want = AU.prefs.sound && !document.hidden ? ambWanted : null;
    if (amb && amb.name === want) return;
    if (amb) { amb.stop(); amb = null; }
    if (!want || !AMBIENCES[want] || !audio()) return;
    amb = { name: want, stop: AMBIENCES[want]() };
  };

  AU.sound = {
    enabled: function () { return !!AU.prefs.sound; },
    /* play('chime' | 'tick' | 'whoosh' | 'box' | 'paper', { gain }) */
    play: function (name, o) {
      if (!AU.prefs.sound || !VOICES[name] || document.hidden) return;
      if (!audio()) return;
      var now = A.ctx.currentTime;
      // the same sound twice within a few frames (two listeners for one click) plays once
      if (lastPlay[name] && performance.now() - lastPlay[name] < 120) return;
      // the box opening ends with its own chime: a chime asked for during it, or as it closes, is already ringing
      if (name === 'chime' && lastPlay.box && performance.now() - lastPlay.box < 3200) return;
      lastPlay[name] = performance.now();
      try { VOICES[name](now + 0.01, (o && o.gain) || 1); } catch (e) { console.error('[atmos] sound', e); }
    },
    /* ambient('atelier') starts the room tone (fades in), ambient(null) fades it out */
    ambient: function (name) { ambWanted = name || null; syncAmbient(); }
  };
  AU.sound.recent = function (name, ms) { return !!lastPlay[name] && performance.now() - lastPlay[name] < (ms || 2500); };

  var gesture = function () { if (AU.prefs.sound && !A) { audio(); syncAmbient(); } };
  document.addEventListener('pointerdown', gesture, true);
  document.addEventListener('keydown', gesture, true);
  AU.on('pref', function (d) {
    if (!d || d.key !== 'sound') return;
    if (d.value) {
      // (the preferences control plays its own confirmation chime a moment later; the context is ready for it here)
      if (audio()) {
        A.master.gain.cancelScheduledValues(A.ctx.currentTime);
        A.master.gain.setTargetAtTime(LEVEL, A.ctx.currentTime, 0.15);
      }
      syncAmbient();
    } else if (A) {
      A.master.gain.cancelScheduledValues(A.ctx.currentTime);
      A.master.gain.setTargetAtTime(0, A.ctx.currentTime, 0.12);
      syncAmbient();
      setTimeout(function () { if (!AU.prefs.sound && A) A.ctx.suspend().catch(function () {}); }, 900);
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (!A) return;
    if (document.hidden) { syncAmbient(); A.ctx.suspend().catch(function () {}); }
    else if (AU.prefs.sound) { A.ctx.resume().catch(function () {}); syncAmbient(); }
  });
  // markup: <button data-sound="tick">
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-sound]');
    if (el) AU.sound.play(el.getAttribute('data-sound'));
  });
  // the atelier hums only on its own page (the story area also asks for it while that page is open; both agree)
  AU.on('route', function (d) { AU.sound.ambient(d && d.path === '/atelier' ? 'atelier' : null); });

  /* =====================================================================================================
     5. SEASONS (idea 20). AU.prefs.season: 'auto' | 'none' | 'valentine' | 'wedding' | 'holiday'.
     'auto' follows the calendar: 1–14 February valentine, May to September wedding, 20 November to 31 December
     holiday. The look lives in 06-atmos.css (html[data-season]); the particles are one CSS layer at the top of the
     page (compositor-only animations), paused when scrolled away, absent with reduced motion.
     ===================================================================================================== */
  var SEASONS = ['none', 'valentine', 'wedding', 'holiday'];
  AU.seasonFor = function (date) {
    var d = date || new Date(), m = d.getMonth(), day = d.getDate();
    if (m === 1 && day <= 14) return 'valentine';
    if (m >= 4 && m <= 8) return 'wedding';
    if ((m === 10 && day >= 20) || m === 11) return 'holiday';
    return 'none';
  };
  var resolveSeason = function () {
    var p = AU.prefs && AU.prefs.season;
    if (SEASONS.indexOf(p) >= 0) return p;
    return AU.seasonFor();
  };

  /* particle recipes: count (desktop), size range, colour class; positions come from a seeded random so a season
     always looks the same and nothing shifts between visits */
  var RECIPES = {
    valentine: { n: 10, min: 9, max: 17, dur: [22, 34], motion: 'rise' },
    wedding:   { n: 12, min: 8, max: 15, dur: [16, 26], motion: 'drift' },
    holiday:   { n: 20, min: 6, max: 12, dur: [26, 42], motion: 'fall' }
  };
  var seeded = function (seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
  var layer = null, layerIO = null;
  var buildLayer = function (season) {
    if (layerIO) { layerIO.disconnect(); layerIO = null; }
    if (layer) { layer.remove(); layer = null; }
    var R = RECIPES[season];
    if (!R || AU.reduced) return;
    layer = document.createElement('div');
    layer.className = 'season-layer season-layer--' + season + ' season-layer--' + R.motion;
    layer.setAttribute('aria-hidden', 'true');
    var rnd = seeded(season.length * 7919 + 17), n = AU.touch ? Math.ceil(R.n / 2) : R.n, h = '';
    for (var i = 0; i < n; i++) {
      var x = (i + rnd() * 0.9) / n * 100;                     // spread evenly across the width, with jitter
      var y = rnd() * 100;
      var s = R.min + rnd() * (R.max - R.min);
      var dur = R.dur[0] + rnd() * (R.dur[1] - R.dur[0]);
      var tw = 3.2 + rnd() * 4.5;
      h += '<span class="sp" style="--x:' + x.toFixed(2) + '%;--y:' + y.toFixed(2) + '%;--s:' + s.toFixed(1) + 'px;--dur:' + dur.toFixed(1) +
        's;--del:-' + (rnd() * dur).toFixed(1) + 's;--tw:' + tw.toFixed(1) + 's;--twd:-' + (rnd() * tw).toFixed(1) +
        's;--dx:' + ((rnd() - 0.5) * 80).toFixed(0) + 'px;--o:' + (0.45 + rnd() * 0.5).toFixed(2) + '"><b><i></i></b></span>';
    }
    layer.innerHTML = h;
    var main = document.getElementById('main');
    document.body.insertBefore(layer, main || null);
    if ('IntersectionObserver' in window) {
      layerIO = new IntersectionObserver(function (es) {
        es.forEach(function (e) { layer && layer.classList.toggle('is-paused', !e.isIntersecting); });
      });
      layerIO.observe(layer);
    }
  };
  var applySeason = function (force) {
    var s = resolveSeason();
    if (s === AU.season && !force) return;
    var changed = s !== AU.season;
    AU.season = s;
    html.setAttribute('data-season', s);
    if (document.body) buildLayer(s);
    if (changed || force) AU.emit('season', s);
  };
  // the attribute goes on at once (the glow is in the first paint); the particle layer once the body is complete
  AU.season = resolveSeason();
  html.setAttribute('data-season', AU.season);
  AU.ready(function () { applySeason(true); });
  AU.on('pref', function (d) { if (d && d.key === 'season') applySeason(); });
  AU.on('reduced', function () { buildLayer(AU.season); });
  // a page left open across midnight into a new season
  document.addEventListener('visibilitychange', function () { if (!document.hidden) applySeason(); });

  /* a small window into atmos, for tools/perf.js and debugging */
  AU.atmos = {
    state: function () {
      return { lenis: !!lenis, cursor: curOn, season: AU.season, sound: !!AU.prefs.sound, audio: A ? A.ctx.state : 'none',
               ambient: amb ? amb.name : null, viewTransitions: vtSupported() };
    },
    /* an AnalyserNode on the master bus (tools: measure what the sounds actually put out) */
    tap: function () {
      if (!A) return null;
      var an = A.ctx.createAnalyser(); an.fftSize = 2048; A.master.connect(an);
      return an;
    }
  };
})();
