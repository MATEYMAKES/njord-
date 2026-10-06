/* ---- 10-shell.js ---- */
/* Aurelia shell (v2): intro, header (nav, Collections mega menu, preferences popover, counts), search overlay,
   mobile menu, footer, and the 404 page. The home page itself is 11-home.js.
   Shares AU.shell = {
     introShown, introDone,        state of the once-per-session intro
     afterIntro(fn)                run fn once 'intro:done' has been emitted (or now)
     afterReveal(fn)               run fn when the page is first revealed (the curtain starts to lift, or at once)
     icon(name, o)                 AU.icon plus the shell's own outline icons (globe, gem, months)
     setImg(img, spec, size, o)    load a pre-rendered still into an <img> (lazy, faded in, refreshed on mode change)
     season()                      the resolved seasonal mood ('none' | 'valentine' | 'wedding' | 'holiday')
     openSearch(q), openBag(tab, opener), showHeader(), setHeaderOver(on)
   }
   Emits 'intro:done' exactly once: when the intro's curtain has lifted, at once when it is skipped, and on the next
   tick when it is not shown at all. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU) return;
  var html = document.documentElement;
  var shell = (AU.shell = AU.shell || {});
  shell.introDone = false; shell.introShown = false;
  var T = function (p, v) { return AU.t(p, v); };
  var esc = AU.esc;
  var noop = function () {};

  /* ===================================================================================================
     small helpers
     =================================================================================================== */
  /* extra outline icons in the guide's style (24 viewBox, 1.25px stroke via .ico) */
  var EXTRA = {
    globe: '<circle cx="12" cy="12" r="8.6"/><path d="M3.6 12h16.8"/><path d="M12 3.4c2.5 2.4 3.8 5.3 3.8 8.6s-1.3 6.2-3.8 8.6c-2.5-2.4-3.8-5.3-3.8-8.6s1.3-6.2 3.8-8.6Z"/>',
    gem: '<path d="M8.2 3.8h7.6l4.4 4.4v7.6l-4.4 4.4H8.2l-4.4-4.4V8.2z"/><path d="M9.8 7.6h4.4l2.2 2.2v4.4l-2.2 2.2H9.8l-2.2-2.2V9.8z"/><path d="M8.2 3.8l1.6 3.8M15.8 3.8l-1.6 3.8M20.2 8.2l-3.8 1.6M20.2 15.8l-3.8-1.6M15.8 20.2l-1.6-3.8M8.2 20.2l1.6-3.8M3.8 15.8l3.8-1.6M3.8 8.2l3.8 1.6"/>',
    months: (function () {
      var d = '';
      for (var i = 0; i < 12; i++) {
        var a = i / 12 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        d += 'M' + (12 + c * 7.4).toFixed(2) + ' ' + (12 + s * 7.4).toFixed(2) + 'L' + (12 + c * 9).toFixed(2) + ' ' + (12 + s * 9).toFixed(2);
      }
      return '<path d="' + d + '"/><path d="M12 8.2l3.4 3.8-3.4 3.8-3.4-3.8z"/><path d="M8.6 12h6.8"/>';
    })()
  };
  shell.icon = function (name, o) {
    o = o || {};
    if (!EXTRA[name]) return AU.icon(name, o);
    var s = o.size || 22;
    var a = o.label ? ' role="img" aria-label="' + esc(o.label) + '"' : ' aria-hidden="true" focusable="false"';
    return '<svg class="ico' + (o.cls ? ' ' + o.cls : '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24"' + a + '>' + EXTRA[name] + '</svg>';
  };
  var hydrateShellIcons = function (root) {
    AU.$$('[data-shell-icon]', root).forEach(function (el) {
      if (el.firstChild) return;
      el.innerHTML = shell.icon(el.getAttribute('data-shell-icon'), { size: +el.getAttribute('data-size') || 21 });
    });
  };

  /* "1 piece" / "6 pieces" */
  shell.count = function (n) { return T(n === 1 ? 'ui.shell.head.count1' : 'ui.shell.head.countN', { n: n }); };
  shell.typeCount = function (type) {
    return (AU.content.products || []).filter(function (p) { return p.spec && p.spec.type === type; }).length;
  };

  /* the resolved seasonal mood: atmos sets AU.season; until it exists, the preference is resolved here the same way */
  shell.season = function () {
    if (typeof AU.season === 'string') return AU.season;
    var p = (AU.prefs && AU.prefs.season) || 'auto';
    if (p !== 'auto') return p;
    var d = new Date(), m = d.getMonth(), day = d.getDate();
    if (m === 1 && day <= 14) return 'valentine';
    if (m === 11) return 'holiday';
    if (m === 5) return 'wedding';
    return 'none';
  };

  /* ---------- still images: AU.img into an <img>, loaded when near the screen, faded in once decoded, and
     re-requested on a light/dark change (the stills are lit for their mode) ---------- */
  var liveImgs = new Set();
  var loadImg = function (img) {
    var tok = (img.__tok = (img.__tok || 0) + 1);
    var well = img.closest('[data-well]');
    Promise.resolve(AU.img(img.__spec, { size: img.__size })).then(function (url) {
      if (tok !== img.__tok) return;
      if (!url) { if (well) well.classList.add('is-empty'); return; }
      if (img.getAttribute('src') === url) return;
      var pre = new Image(); pre.decoding = 'async'; pre.src = url;
      /* An image may still be detached when its picture is ready: a page is rendered before the router puts it in the
         document (the home hero's poster decodes during the page change). It is filled all the same, so it is complete
         in the very frame the page lands; only a newer request (the token) drops it. A detached image is marked loaded
         at once (it has no frame to fade in from). */
      var show = function () {
        if (tok !== img.__tok) return;
        var attached = img.isConnected;
        img.src = url;
        if (well) well.classList.remove('is-empty');
        var mark = function () { img.classList.add('is-loaded'); if (well) well.classList.add('is-loaded'); };
        if (attached) requestAnimationFrame(mark); else mark();
        if (img.__onload) img.__onload(url);
      };
      (pre.decode ? pre.decode() : Promise.resolve()).then(show, show);
    }).catch(function () { if (well) well.classList.add('is-empty'); });
  };
  var imgIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      imgIO.unobserve(e.target);
      var img = e.target.__img || e.target;
      img.__near = true; loadImg(img);
    });
  }, { rootMargin: '50% 0px 80% 0px' }) : null;
  /* o.eager: load now (menus); o.onload(url): called after each (re)load */
  shell.setImg = function (img, spec, size, o) {
    o = o || {};
    if (!img || !spec) return;
    img.__spec = spec; img.__size = size || 480; img.__onload = o.onload || null; img.__born = performance.now();
    img.decoding = 'async';
    if (!img.hasAttribute('alt')) img.alt = '';
    liveImgs.add(img);
    if (o.eager || !imgIO) { img.__near = true; loadImg(img); return; }
    // an <img> without a src has no box to observe reliably: watch its well (or parent) instead
    var target = img.closest('[data-well]') || img.parentElement || img;
    target.__img = img;
    imgIO.observe(target);
  };
  AU.on('mode', function () {
    liveImgs.forEach(function (img) {
      // an image that has left the page is gone for good; one in a page still being put in place (rendered moments ago,
      // not yet in the document) is refreshed with the rest
      if (img.isConnected) img.__seen = true;
      else if (img.__seen || performance.now() - (img.__born || 0) > 8000) { liveImgs.delete(img); return; }
      if (img.__near) loadImg(img);
    });
  });

  /* ===================================================================================================
     INTRO: "Aurelia" written by a pen, filled, a hairline and the edition beneath; the curtain lifts.
     Under 2.4s, once per session, skipped by any key, click, wheel or touch. No other work runs while it plays:
     the 3D engine waits for 'intro:done', which is emitted when the curtain has gone (or at once on a skip).
     =================================================================================================== */
  var revealFns = [], revealed = false;
  shell.afterReveal = function (fn) { if (revealed) fn(); else revealFns.push(fn); };
  var doReveal = function () {
    if (revealed) return;
    revealed = true; html.classList.add('is-revealed');
    revealFns.splice(0).forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  };
  var emitIntroDone = function () {
    if (shell.introDone) return;
    doReveal();
    shell.introDone = true;
    html.classList.add('intro-done');
    AU.emit('intro:done');
  };
  shell.afterIntro = function (fn) {
    if (shell.introDone) { fn(); return; }
    var off = AU.on('intro:done', function () { off(); fn(); });
  };

  function initIntro() {
    var el = document.getElementById('intro');
    var ed = el && AU.$('[data-intro-ed]', el);
    if (ed) ed.innerHTML = AU.nums(T('ui.shell.intro.edition'));
    var show = el && !html.classList.contains('no-intro') && !AU.reduced;
    try { sessionStorage.setItem('aurelia:intro', '1'); } catch (e) {}
    if (!show) {
      if (el) el.remove();
      // later scripts register their listeners in their own ready handlers: emit after all of them have run
      setTimeout(emitIntroDone, 0);
      return;
    }
    shell.introShown = true;
    var started = false, lifted = false, timers = [];
    var SCROLL_KEYS = /^( |Spacebar|PageUp|PageDown|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Home|End)$/;
    var lastGesture = 0;
    var onSkip = function () { lift(true); };
    var onKey = function (e) {
      if (SCROLL_KEYS.test(e.key)) e.preventDefault();
      if (!/^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) lift(true);
    };
    var onWheel = function (e) { e.preventDefault(); lastGesture = performance.now(); lift(true); };
    var onTouchMove = function (e) { if (e.cancelable) e.preventDefault(); lastGesture = performance.now(); };
    var skipOpts = { capture: true, passive: true }, blockOpts = { capture: true, passive: false };
    var unbindSkip = function () {
      window.removeEventListener('pointerdown', onSkip, skipOpts);
      window.removeEventListener('touchstart', onSkip, skipOpts);
    };
    var unbindBlock = function () {
      window.removeEventListener('keydown', onKey, blockOpts);
      window.removeEventListener('wheel', onWheel, blockOpts);
      window.removeEventListener('touchmove', onTouchMove, blockOpts);
    };
    var LIFT = 760, LIFT_FAST = 620;
    var lift = function (fast) {
      if (lifted) return;
      lifted = true;
      timers.forEach(clearTimeout);
      unbindSkip();
      if (fast) el.classList.add('is-skip', 'is-draw');
      // one frame so a skipped drawing snaps to its finished state before the curtain moves
      requestAnimationFrame(function () {
        if (window.scrollY) window.scrollTo(0, 0);
        el.classList.add('is-lift');
        doReveal();                       // the header and the page's entrance start under the rising curtain
        if (fast) emitIntroDone();
        var dur = fast ? LIFT_FAST : LIFT;
        setTimeout(function () {
          emitIntroDone();
          // the page is released once the curtain has gone and the gesture that skipped it has come to rest
          var cap = performance.now() + 1400;
          var release = function () {
            var now = performance.now();
            if (now < cap && now - lastGesture < 240) { setTimeout(release, 100); return; }
            unbindBlock();
            AU.lockScroll(false);
            el.remove();
          };
          release();
        }, dur);
      });
    };
    var start = function () {
      if (started || lifted) return;
      started = true;
      el.classList.add('is-draw');
      // the lockup completes at ~1.42s (the pen's stroke has already gone); the finished word rests for half a second,
      // then the curtain lifts (gone by ~2.66s)
      timers.push(setTimeout(function () { lift(false); }, 1900));
      // the shell's unseen parts (search, menu, footer) are set up while the finished word rests, each in its own
      // idle slice: after the stroke, before the curtain moves
      timers.push(setTimeout(runLater, 1480));
    };
    AU.lockScroll(true);
    window.addEventListener('pointerdown', onSkip, skipOpts);
    window.addEventListener('touchstart', onSkip, skipOpts);
    window.addEventListener('keydown', onKey, blockOpts);
    window.addEventListener('wheel', onWheel, blockOpts);
    window.addEventListener('touchmove', onTouchMove, blockOpts);
    /* The pen starts on a quiet main thread. Under the curtain the router renders the first page and every area's
       start-up runs (a 45ms render, 60ms tasks): a stroke begun then stutters in its first, most visible letters. So it
       waits for Alex Brush (never long: the word must not be drawn in a fallback face) AND for the first page to be in
       place, then two frames, then the first idle moment (at most 200ms more). The curtain hides the page meanwhile. */
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var fontOk = document.fonts && document.fonts.check && document.fonts.check('200px "Alex Brush"');
    var fontP = fontOk ? Promise.resolve() : Promise.race([
      (document.fonts && document.fonts.load) ? document.fonts.load('400 200px "Alex Brush"', 'Aurelia').catch(noop) : Promise.resolve(),
      wait(700)
    ]);
    var routeP = new Promise(function (r) {
      if (AU.router && AU.router.current) { r(); return; }
      var off = AU.on('route', function () { off(); r(); });
    });
    Promise.all([fontP, Promise.race([routeP, wait(1400)])]).then(function () {
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 200 }); else setTimeout(start, 30);
      }); });
    });
    // the intro must never trap the page
    timers.push(setTimeout(function () { lift(true); }, 4600));
  }

  /* ===================================================================================================
     HEADER
     =================================================================================================== */
  var head, megaApi = null, prefsApi = null, careApi = null;
  var routePath = function (href) { return String(href || '').replace(/^#/, '').split('?')[0].replace(/\/+$/, '') || '/'; };

  function navHTML() {
    return (AU.content.nav || []).map(function (n, i) {
      var p = routePath(n.href);
      if (p === '/collections') {
        return '<li class="head__item head__item--mega"><button class="head__link head__link--mega" type="button" aria-expanded="false" aria-controls="mega" data-mega-btn data-path="' + esc(p) + '">' +
          '<span>' + esc(n.label) + '</span><span class="head__chev" aria-hidden="true">' + AU.icon('chevron', { size: 12 }) + '</span></button></li>';
      }
      return '<li class="head__item"><a class="head__link" href="' + esc(n.href) + '" data-path="' + esc(p) + '">' + esc(n.label) + '</a></li>';
    }).join('');
  }

  function initHeader() {
    head = AU.$('[data-head]');
    if (!head) return;
    var navUl = AU.$('[data-head-nav]', head);
    navUl.innerHTML = navHTML();
    hydrateShellIcons(head);

    shell.afterReveal(function () { requestAnimationFrame(function () { head.classList.add('is-ready'); }); });

    /* states: over (transparent, only over the home hero at the very top), solid, hidden (scrolling down) */
    var bar = AU.$('[data-head-progress]', head);
    var over = false, lastY = window.scrollY, travel = 0, holdUntil = 0;
    var setHidden = function (on) { head.classList.toggle('is-hidden', on); };
    var paintSolid = function (y) {
      var open = head.classList.contains('is-mega') || head.classList.contains('is-prefs') || head.classList.contains('is-care');
      head.classList.toggle('is-solid', !over || y > 40 || open);
    };
    shell.setHeaderOver = function (on) { over = !!on; paintSolid(window.scrollY); };
    // the menus repaint the bar's solid state through this (not a synthetic 'scroll', which would wake every scroll
    // subscriber on the page, the 3D hero included, in the very frame a menu opens)
    /* 'head:panel' (true | false) tells the page when a header panel (the mega menu or the preferences) opens or closes:
       the home page rests its 3D hero underneath, so the panel's blur never has to be recomputed over a moving canvas.
       Settled in a microtask, so going from one panel straight to the other is not a close and a re-open. */
    var panelOpen = false, panelQ = false;
    var notePanel = function () {
      if (panelQ) return; panelQ = true;
      Promise.resolve().then(function () {
        panelQ = false;
        // (the mega menu's one invisible pre-paint counts too: the blur is compiled then, over a resting piece)
        var on = head.classList.contains('is-mega') || head.classList.contains('is-prefs') || head.classList.contains('is-care') || !!AU.$('.mega.is-prepaint', head);
        if (on === panelOpen) return;
        panelOpen = on;
        shell.panelOpen = on;
        AU.emit('head:panel', on);
      });
    };
    shell.panelOpen = false;
    shell.paintHead = function () { paintSolid(window.scrollY); notePanel(); };
    shell.showHeader = function () { setHidden(false); };
    AU.onScroll(function (y) {
      paintSolid(y);
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      bar.style.transform = 'scaleX(' + AU.clamp(y / max, 0, 1).toFixed(4) + ')';
      if (html.classList.contains('is-locked')) { lastY = y; return; }
      var dy = y - lastY;
      lastY = y;
      // a page change lands its new page in place (Back into a scrolled page jumps 0 -> 1100 inside the transition),
      // and a jump of more than half a screen in one frame is never a hand on the wheel: neither hides the bar
      if (performance.now() < holdUntil || Math.abs(dy) > window.innerHeight / 2) { travel = 0; return; }
      if ((dy > 0) !== (travel > 0)) travel = 0;
      travel += dy;
      var busy = head.contains(document.activeElement) || head.classList.contains('is-mega') || head.classList.contains('is-prefs') || head.classList.contains('is-care');
      if (y < 320) setHidden(false);
      else if (travel > 28 && !busy) setHidden(true);
      else if (travel < -14) setHidden(false);
    });
    head.addEventListener('focusin', function () { setHidden(false); });

    /* the current page, marked in the nav: exact match = page, a sub-page of it = true */
    var mark = function (path) {
      path = path || (AU.router && AU.router.current && AU.router.current.path) || '/';
      AU.$$('[data-path]', head).concat(AU.$$('.menu__link[data-path], .menu__more a[data-path], .menu__type[data-path]')).forEach(function (a) {
        var p = a.getAttribute('data-path');
        var exact = p === path, within = p !== '/' && path.indexOf(p + '/') === 0;
        // the boutique's piece-type pages also belong to "Boutique"; a piece page belongs to the boutique too
        if (!exact && !within && p === '/boutique' && /^\/(piece|compare|checkout)\b/.test(path)) within = true;
        a.classList.toggle('is-current', exact || within);
        if (a.tagName === 'A') {
          if (exact) a.setAttribute('aria-current', 'page');
          else if (within) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        }
      });
    };
    shell.markNav = mark;
    /* the page being left: the bar holds still through the whole change (the landing's scroll jump included), and the
       nav's mark moves to the new page with the click, not when the transition has finished. By then the address is
       already the new page's (go() pushes it first; Back has popped it). */
    var BUILD = window.AU_BUILD || {};
    var pathNow = function () {
      var p;
      if (AU.router && AU.router.mode === 'path') {
        var base = (BUILD.base || '/').replace(/\/?$/, '/');
        p = location.pathname; if (p.indexOf(base) === 0) p = '/' + p.slice(base.length);
      } else {
        var h = location.hash || '';
        p = h.indexOf('#/') === 0 ? h.slice(1) : null;
      }
      return p == null ? null : (p.split('?')[0].replace(/\/+$/, '') || '/');
    };
    AU.on('route:leave', function () {
      holdUntil = performance.now() + 1400; travel = 0;
      setHidden(false);
      var p = pathNow();
      if (p) mark(p);
    });
    AU.on('route', function (d) {
      holdUntil = performance.now() + 900; travel = 0;
      setHidden(false);
      // a forced re-render of the same page (a language change) leaves the header's menus as they are
      if (!d || d.dir !== 'force') {
        if (megaApi) megaApi.close(true);
        if (prefsApi) prefsApi.close(true);
        if (careApi) careApi.close(true);
      }
      over = d && d.name === 'home' ? over : false;
      paintSolid(window.scrollY);
      mark(d && d.path);
    });

    /* counts: tiny lining numerals, hidden at zero; a soft rise and a few glints when they grow */
    var lastCart = AU.cart ? AU.cart.count() : 0;
    var lastWish = AU.wish ? AU.wish.list().length : 0;
    var label = function (key, n) { return T('ui.shell.head.' + key) + (n > 0 ? ', ' + shell.count(n) : ''); };
    var paint = function (sel, n, prev, btn, key) {
      AU.$$(sel).forEach(function (el) {
        el.hidden = n <= 0;
        el.textContent = n > 0 ? String(n) : '';
        if (n > prev) { el.classList.remove('is-pop'); void el.offsetWidth; el.classList.add('is-pop'); }
      });
      if (btn) btn.setAttribute('aria-label', label(key, n));
      if (n > prev && btn && head.classList.contains('is-ready')) {
        setHidden(false);
        setTimeout(function () { if (btn.offsetParent) AU.sparkleAt(btn, { count: 7, spread: 46 }); }, 160);
      }
    };
    var bagBtn = AU.$('[data-head-bag]', head), wishBtn = AU.$('[data-head-wish]', head);
    var paintCounts = function () {
      paint('[data-cart-count]', lastCart, lastCart, bagBtn, 'bag');
      paint('[data-wish-count]', lastWish, lastWish, wishBtn, 'wish');
    };
    paintCounts();
    shell.paintCounts = paintCounts;
    AU.on('cart', function (s) {
      var n = s && typeof s.count === 'number' ? s.count : AU.cart.count();
      paint('[data-cart-count]', n, lastCart, bagBtn, 'bag'); lastCart = n;
    });
    AU.on('wish', function (list) {
      var n = Array.isArray(list) ? list.length : AU.wish.list().length;
      paint('[data-wish-count]', n, lastWish, wishBtn, 'wish'); lastWish = n;
    });

    bagBtn.addEventListener('click', function () { shell.openBag('bag', bagBtn); });
    wishBtn.addEventListener('click', function () { shell.openBag('saved', wishBtn); });
    AU.$('[data-head-search]', head).addEventListener('click', function (e) { shell.openSearch('', e.currentTarget); });

    /* burger opens the menu */
    var burger = AU.$('[data-burger]', head);
    burger.addEventListener('click', function () { shell.ensure('menu'); AU.overlay.open('menu', burger); });
    AU.on('overlay', function (d) {
      if (d && d.id === 'menu') burger.setAttribute('aria-expanded', d.open ? 'true' : 'false');
      if (d && d.open) { if (megaApi) megaApi.close(true); if (prefsApi) prefsApi.close(true); if (careApi) careApi.close(true); }
    });

    /* client care: the words when they fit in the bar's right-hand column without pushing the centred nav, else the
       icon alone, else (the narrowest desktop widths) nothing. Measured on start, when the fonts are in, on a resize
       and after a language change (all reads, then one class write). */
    var care = AU.$('[data-head-care]', head), careT = AU.$('[data-head-care-t]', head);
    var barEl = AU.$('.head__bar', head), navEl = AU.$('.head__nav', head), toolsEl = AU.$('.head__tools', head);
    var careMode = '';
    var fitCare = function () {
      if (!care || !careT || !navEl || !toolsEl) return;
      var next = care.nextElementSibling;
      if (!next || !navEl.offsetWidth) return;              // the phone layout: CSS hides it
      var cs = getComputedStyle(barEl);
      var inner = barEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var gap = parseFloat(cs.columnGap) || 24;
      var col = (inner - navEl.getBoundingClientRect().width - 2 * gap) / 2;
      var tr = toolsEl.getBoundingClientRect(), base = tr.right - next.getBoundingClientRect().left;
      var rg = document.createRange(); rg.selectNodeContents(careT);
      var tw = rg.getBoundingClientRect().width;
      // the words (text + padding 4 + margin 16 + 2) only with a clear 48px between them and the nav, so they never read
      // as a seventh nav item; the icon alone (44 + 2) only within its column with 12px to spare (with the bar's own
      // gap, at least 28px between the last name and the icon: closer, it read as part of the nav, e.g. German at 1180)
      var mode = base + tw + 22 + 48 <= col ? 'text' : base + 46 + 12 <= col ? 'icon' : 'off';
      if (mode === careMode) return;
      careMode = mode;
      head.classList.toggle('care-text', mode === 'text');
      head.classList.toggle('care-icon', mode === 'icon');
      head.classList.toggle('care-off', mode === 'off');
    };
    var careRaf = 0;
    var fitCareSoon = function () { cancelAnimationFrame(careRaf); careRaf = requestAnimationFrame(fitCare); };
    /* first measured in the start-up's idle slices (runLater: a read of the bar while the first page is still being
       laid out forced that whole layout inside script), then again once every font is in */
    window.addEventListener('resize', fitCareSoon);
    shell.fitCare = function () {
      fitCare();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCareSoon);
      shell.fitCare = fitCareSoon;
    };

    megaApi = initMega();
    prefsApi = initPrefs();
    careApi = initCare();
    var dim = AU.$('[data-head-dim]', head);
    dim.addEventListener('click', function () { if (megaApi) megaApi.close(); if (prefsApi) prefsApi.close(); if (careApi) careApi.close(); });

    AU.on('lang', function () {
      var hadFocus = document.activeElement && head.contains(document.activeElement) ? document.activeElement.getAttribute('data-path') : null;
      navUl.innerHTML = navHTML();
      if (megaApi) megaApi.rebind();
      mark();
      paintCounts();
      fitCareSoon();
      if (hadFocus) { var f = AU.$('[data-path="' + hadFocus + '"]', navUl); if (f) f.focus(); }
    });
  }

  /* the bag drawer belongs to the shop. Its API (AU.bag.open(tab)) is used when present, else its overlay (#bag,
     which reads the opener's data-bag-tab), else the checkout page. */
  shell.openBag = function (tab, opener) {
    if (AU.bag && typeof AU.bag.open === 'function') { AU.bag.open(tab, opener); return; }
    if (document.getElementById('bag')) {
      var had = opener && opener.hasAttribute('data-bag-tab');
      if (opener && !had) opener.setAttribute('data-bag-tab', tab);
      AU.overlay.open('bag', opener);
      if (opener && !had) opener.removeAttribute('data-bag-tab');
      return;
    }
    if (AU.router) AU.router.go(tab === 'saved' ? '/boutique?saved=1' : '/checkout');
  };

  /* ===================================================================================================
     MEGA MENU: "Collections" is a disclosure button. Hover intent on pointer devices (opens after 120ms over the
     button, closes 280ms after the pointer leaves button and panel), click/Enter/Space toggle, ArrowDown opens and
     moves into the panel, Escape closes and returns focus to the button.
     =================================================================================================== */
  function megaHTML() {
    var C = AU.content;
    var hub = (C.home && C.home.hub) || [];
    /* the hierarchy of every other page: the small capitals kicker above, the collection's name beneath it */
    var cols = (C.collections || []).map(function (c, i) {
      return '<li class="mega__ci" style="--i:' + i + '"><a class="mega__card" href="#/collections/' + esc(c.id) + '">' +
        '<span class="mega__well" data-well data-mega-col="' + i + '"><img class="mega__img" alt="" width="480" height="480"></span>' +
        (c.kicker ? '<span class="mega__kicker caps caps--sm">' + AU.nums(c.kicker) + '</span>' : '') +
        '<span class="mega__name">' + AU.nums(c.name) + '</span></a></li>';
    }).join('');
    /* services: what a visitor looks for from any page (sizing, care, a viewing), and a direct line to the atelier */
    var S = T('ui.shell.mega.services');
    S = S && typeof S === 'object' ? S : { links: [] };
    var B = C.brand || {};
    var tel = String(B.phone || '').replace(/[^\d+]/g, '');
    var svc = (S.links || []).map(function (l, i) {
      return '<li class="mega__si" style="--i:' + (i + 3) + '"><a class="mega__svc" href="' + esc(l.href) + '"><span>' + esc(l.label) + '</span>' +
        '<span class="mega__sarrow" aria-hidden="true">' + AU.icon('arrow', { size: 14 }) + '</span></a></li>';
    }).join('');
    var speak = (B.phone || B.email) ? '<div class="mega__speak mega__si" style="--i:7"><p class="caps caps--sm mega__h mega__h--speak">' + esc(S.speak || '') + '</p>' +
      (B.phone ? '<a class="mega__contact" href="tel:' + esc(tel) + '">' + AU.icon('phone', { size: 15 }) + '<span class="num">' + esc(B.phone) + '</span></a>' : '') +
      (B.email ? '<a class="mega__contact" href="mailto:' + esc(B.email) + '">' + AU.icon('mail', { size: 15 }) + '<span>' + esc(B.email) + '</span></a>' : '') +
      '</div>' : '';
    var types = hub.map(function (h, i) {
      var n = shell.typeCount(h.type);
      return '<li class="mega__ti" style="--i:' + (i + 2) + '"><a class="mega__type" href="' + esc(h.href) + '">' +
        '<span class="mega__thumb" data-well data-mega-type="' + i + '"><img class="mega__img" alt="" width="480" height="480"></span>' +
        '<span class="mega__tname">' + esc(h.label) + '</span>' +
        '<span class="mega__tcount small">' + AU.nums(shell.count(n)) + '</span>' +
        '<span class="mega__tarrow" aria-hidden="true">' + AU.icon('arrow', { size: 16 }) + '</span></a></li>';
    }).join('');
    return '<div class="mega__grid">' +
      '<div class="mega__part mega__part--cols"><p class="caps caps--sm mega__h">' + esc(T('ui.shell.mega.collections')) + '</p>' +
      '<ul class="mega__cols">' + cols + '</ul>' +
      '<a class="link caps caps--sm mega__more" href="#/collections">' + esc(T('ui.shell.mega.allCollections')) + AU.icon('arrow', { size: 14 }) + '</a></div>' +
      '<div class="mega__part mega__part--types"><p class="caps caps--sm mega__h">' + esc(T('ui.shell.mega.byPiece')) + '</p>' +
      '<ul class="mega__types">' + types + '</ul>' +
      '<a class="link caps caps--sm mega__more" href="#/boutique">' + esc(T('ui.shell.mega.allPieces')) + AU.icon('arrow', { size: 14 }) + '</a></div>' +
      (svc ? '<div class="mega__part mega__part--svc"><p class="caps caps--sm mega__h">' + esc(S.title || '') + '</p>' +
        '<ul class="mega__svcs">' + svc + '</ul>' + speak + '</div>' : '') +
      '</div>';
  }

  function initMega() {
    var panel = AU.$('[data-mega]', head), inner = AU.$('[data-mega-in]', panel);
    if (!panel) return null;
    var btn = null, open = false, openedAt = 0, openT = 0, closeT = 0, imgsDone = false, scrollAt = 0;
    var render = function () {
      var was = imgsDone;
      inner.innerHTML = megaHTML();
      imgsDone = false;
      if (open || was) loadImgs();   // a re-render (a new language) keeps the panel warm
    };
    var loadImgs = function () {
      if (imgsDone) return; imgsDone = true;
      var C = AU.content, hub = (C.home && C.home.hub) || [];
      AU.$$('[data-mega-col]', inner).forEach(function (w) { var c = (C.collections || [])[+w.getAttribute('data-mega-col')]; if (c) shell.setImg(AU.$('img', w), c.spec, 480, { eager: true }); });
      AU.$$('[data-mega-type]', inner).forEach(function (w) { var h = hub[+w.getAttribute('data-mega-type')]; if (h) shell.setImg(AU.$('img', w), h.spec, 480, { eager: true }); });
    };
    var links = function () { return AU.$$('a', inner); };
    var setOpen = function (on, how) {
      clearTimeout(openT); clearTimeout(closeT);
      if (on === open) return;
      open = on;
      if (on) {
        if (prefsApi) prefsApi.close(true);
        if (careApi) careApi.close(true);
        loadImgs();
        openedAt = performance.now(); scrollAt = window.scrollY;
        panel.removeAttribute('inert');
        panel.classList.add('is-open');
        head.classList.add('is-mega');
        if (shell.showHeader) shell.showHeader();
      } else {
        panel.classList.remove('is-open');
        panel.setAttribute('inert', '');
        head.classList.remove('is-mega');
      }
      if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (shell.paintHead) shell.paintHead();   // repaint the header's solid state (only the header)
    };
    var close = function (instant) {
      if (!open) return;
      var hadFocus = panel.contains(document.activeElement);
      if (instant) panel.classList.add('is-instant');
      setOpen(false);
      if (instant) requestAnimationFrame(function () { requestAnimationFrame(function () { panel.classList.remove('is-instant'); }); });
      if (hadFocus && btn && !instant) btn.focus({ preventScroll: true });
    };
    var bind = function () {
      btn = AU.$('[data-mega-btn]', head);
      if (!btn) return;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.addEventListener('click', function () {
        // a click just after hover opened it keeps it open (the pointer was already on its way to the button)
        if (open && performance.now() - openedAt < 600) return;
        setOpen(!open, 'click');
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true, 'key'); var l = links()[0]; if (l) setTimeout(function () { l.focus(); }, 30); }
        else if (e.key === 'Escape' && open) { e.preventDefault(); close(); btn.focus(); }
        // the panel sits after the header's tools in the page; while it is open, Tab from its button goes straight in
        else if (e.key === 'Tab' && !e.shiftKey && open) { var f = links()[0]; if (f) { e.preventDefault(); f.focus(); } }
      });
      var li = btn.parentElement;
      li.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(closeT);
        if (!open) openT = setTimeout(function () { setOpen(true, 'hover'); }, 120);
      });
      li.addEventListener('pointerleave', function (e) {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(openT);
        if (open) closeT = setTimeout(function () { close(); }, 280);
      });
    };
    panel.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') clearTimeout(closeT); });
    panel.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse' || !open) return;
      closeT = setTimeout(function () { close(); }, 320);
    });
    /* the next stop after the panel, in reading order: the nav item after "Collections" (or the first tool) */
    var afterPanel = function () {
      var li = btn && btn.closest('li'), n = li && li.nextElementSibling;
      var a = n && AU.$('a, button', n);
      return a || AU.$('.head__tools button', head);
    };
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); if (btn) btn.focus(); return; }
      if (e.key === 'Tab') {
        var ls = links(), at = ls.indexOf(document.activeElement);
        // Shift+Tab from the first link goes back to the button; Tab from the last closes the panel and carries on
        // along the nav, as if the panel sat right after "Collections"
        if (e.shiftKey && at === 0 && btn) { e.preventDefault(); btn.focus(); }
        else if (!e.shiftKey && at === ls.length - 1) {
          var nx = afterPanel();
          if (nx) { e.preventDefault(); close(true); nx.focus(); }
        }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var ls = links(), i = ls.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        var d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
        ls[(i + d + ls.length) % ls.length].focus();
      }
    });
    // keyboard: focus leaving both the button and the panel (to another nav item, a tool, or the page) closes it
    head.addEventListener('focusout', function (e) {
      if (!open) return;
      var t = e.target;
      if (!(t === btn || panel.contains(t))) return;
      var to = e.relatedTarget;
      if (to && (panel.contains(to) || to === btn)) return;
      // (a press on a quiet part of the panel blurs the button too: that is not leaving)
      if (!to && performance.now() - downIn < 400) return;
      setTimeout(function () { if (open && !panel.contains(document.activeElement) && document.activeElement !== btn) close(true); }, 0);
    });
    var downIn = 0;
    panel.addEventListener('pointerdown', function () { downIn = performance.now(); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) close(true); });
    document.addEventListener('pointerdown', function (e) {
      if (open && !panel.contains(e.target) && !(btn && btn.contains(e.target))) close();
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open && !panel.contains(document.activeElement)) { close(); } });
    var lastMove = 0;
    AU.onScroll(function (y) { lastMove = performance.now(); if (open && Math.abs(y - scrollAt) > 120) close(); });
    AU.on('route:leave', function () { lastMove = performance.now() + 900; });
    /* the eight stills are fetched and decoded ahead of the first open, so opening only toggles classes (fetching and
       decoding them in the opening frames, under the panel's blur, dropped frames): in idle time once the intro has
       gone, or at once on the first sign of intent (the pointer reaching the nav, before the 120ms hover delay) */
    var wide = matchMedia('(min-width: 1180px)');   // the desktop bar (below it: the burger menu)
    var warm = function () { if (!imgsDone && wide.matches) loadImgs(); };
    /* the first open also paid for painting the panel for the first time (its blur, its type, uploading the eight
       stills): two frames over 40ms as it began to open. Once the stills are in, the shut panel is painted once,
       invisibly (opacity .01 for three frames, no pointer, still inert: under 1/255 the compositor skips it and
       nothing is warmed), in idle time, so the first open costs what every open does. */
    var painted = false;
    var prePaint = function () {
      if (painted || open || !wide.matches || AU.reduced) return;
      var imgs = AU.$$('.mega__img', inner);
      var pending = imgs.filter(function (i) { return !(i.complete && i.naturalWidth); });
      if (pending.length && prePaint.tries < 8) { prePaint.tries++; setTimeout(idle(prePaint), 700); return; }
      // never in the middle of a scroll or a page change: it waits for the page to be still
      var busy = performance.now() - lastMove < 800 || html.classList.contains('is-locked');
      if (busy && prePaint.tries < 40) { prePaint.tries++; setTimeout(idle(prePaint), 900); return; }
      painted = true;
      panel.setAttribute('data-prepainted', '');
      panel.classList.add('is-prepaint');
      if (shell.paintHead) shell.paintHead();
      requestAnimationFrame(function () { requestAnimationFrame(function () { requestAnimationFrame(function () {
        panel.classList.remove('is-prepaint');
        if (shell.paintHead) shell.paintHead();
      }); }); });
    };
    prePaint.tries = 0;
    var idle = function (fn) { return function () { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 3000 }); else fn(); }; };
    shell.afterIntro(function () {
      var go = function () { warm(); setTimeout(idle(prePaint), 900); };
      if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 2500 }); else setTimeout(go, 1200);
    });
    var nav = AU.$('.head__nav', head);
    if (nav) nav.addEventListener('pointerenter', warm);
    head.addEventListener('focusin', function (e) { if (e.target.closest && e.target.closest('[data-mega-btn]')) warm(); });
    render(); bind();
    return {
      close: close,
      open: function () { setOpen(true, 'api'); },
      rebind: function () { render(); bind(); },
      isOpen: function () { return open; }
    };
  }

  /* ===================================================================================================
     PREFERENCES: language, currency, sound, light/dark, season. Each group is a radiogroup of chips (arrow keys
     move and choose, as radios do). Rendered into the header popover and into the mobile menu.
     =================================================================================================== */
  var SYM = { USD: '$', EUR: '€', GBP: '£' };
  function prefGroups() {
    var C = AU.content, cfg = C.config || {};
    var langs = (cfg.languages || [{ id: 'en', label: 'English' }]).map(function (l) { return { v: l.id, label: l.label, short: String(l.id).toUpperCase() }; });
    var curs = Object.keys(cfg.currencies || { USD: 1 }).map(function (k) { return { v: k, label: k, sym: SYM[k] || '' }; });
    var seasons = ['auto', 'none', 'valentine', 'wedding', 'holiday'].map(function (k) { return { v: k, label: T('ui.shell.prefs.seasons.' + k) }; });
    return [
      { id: 'lang', title: T('ui.shell.prefs.language'), items: langs, value: AU.lang },
      { id: 'currency', title: T('ui.shell.prefs.currency'), items: curs, value: AU.currency },
      { id: 'mode', title: T('ui.shell.prefs.appearance'), items: [{ v: 'dark', label: T('ui.shell.prefs.dark') }, { v: 'light', label: T('ui.shell.prefs.light') }], value: AU.getMode() },
      { id: 'sound', title: T('ui.shell.prefs.sound'), items: [{ v: 'off', label: T('ui.shell.prefs.off') }, { v: 'on', label: T('ui.shell.prefs.on') }], value: AU.prefs && AU.prefs.sound ? 'on' : 'off', note: T('ui.shell.prefs.soundNote') },
      { id: 'season', title: T('ui.shell.prefs.season'), items: seasons, value: (AU.prefs && AU.prefs.season) || 'auto', note: T('ui.shell.prefs.seasonNote') }
    ];
  }
  var prefValue = function (id) {
    return id === 'lang' ? AU.lang : id === 'currency' ? AU.currency : id === 'mode' ? AU.getMode()
      : id === 'sound' ? (AU.prefs && AU.prefs.sound ? 'on' : 'off') : ((AU.prefs && AU.prefs.season) || 'auto');
  };
  var applyPref = function (id, v) {
    if (id === 'lang') AU.setLang(v);
    else if (id === 'currency') AU.setCurrency(v);
    else if (id === 'mode') AU.setMode(v);
    else if (id === 'sound') { AU.setPref('sound', v === 'on'); if (v === 'on' && AU.sound && AU.sound.play) setTimeout(function () { AU.sound.play('chime'); }, 60); }
    else if (id === 'season') AU.setPref('season', v);
  };
  /* one renderer for both places; prefix keeps ids unique */
  function renderPrefs(box, prefix) {
    box.innerHTML = prefGroups().map(function (g) {
      var hid = prefix + '-' + g.id;
      return '<div class="pref" data-pref="' + g.id + '">' +
        '<p class="caps caps--sm pref__h" id="' + hid + '">' + esc(g.title) + '</p>' +
        '<div class="pref__chips" role="radiogroup" aria-labelledby="' + hid + '">' +
        g.items.map(function (it) {
          var on = it.v === g.value;
          return '<button class="chip pref__chip" type="button" role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-v="' + esc(it.v) + '"' +
            (it.short ? ' lang="' + esc(it.v) + '"' : '') + '>' + (it.sym ? '<span class="num pref__sym" aria-hidden="true">' + esc(it.sym) + '</span>' : '') + esc(it.label) + '</button>';
        }).join('') + '</div>' +
        (g.note ? '<p class="pref__note small">' + esc(g.note) + '</p>' : '') + '</div>';
    }).join('');
  }
  function syncPrefs(box) {
    AU.$$('[data-pref]', box).forEach(function (g) {
      var v = prefValue(g.getAttribute('data-pref'));
      AU.$$('.pref__chip', g).forEach(function (c) {
        var on = c.getAttribute('data-v') === v;
        c.setAttribute('aria-checked', on ? 'true' : 'false');
        c.tabIndex = on ? 0 : -1;
      });
    });
  }
  function bindPrefs(box) {
    box.addEventListener('click', function (e) {
      var c = e.target.closest('.pref__chip'); if (!c) return;
      var g = c.closest('[data-pref]');
      applyPref(g.getAttribute('data-pref'), c.getAttribute('data-v'));
      syncPrefs(box);
    });
    box.addEventListener('keydown', function (e) {
      var c = e.target.closest('.pref__chip'); if (!c) return;
      var k = e.key, d = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 0;
      if (!d && k !== 'Home' && k !== 'End') return;
      e.preventDefault();
      var chips = AU.$$('.pref__chip', c.parentElement), i = chips.indexOf(c);
      var n = k === 'Home' ? chips[0] : k === 'End' ? chips[chips.length - 1] : chips[(i + d + chips.length) % chips.length];
      n.focus(); n.click();
    });
  }
  /* re-render after a language change, keeping focus on the same chip */
  function rerenderPrefs(box, prefix) {
    var a = document.activeElement, keep = null;
    if (a && box.contains(a) && a.closest('[data-pref]')) keep = [a.closest('[data-pref]').getAttribute('data-pref'), a.getAttribute('data-v')];
    renderPrefs(box, prefix);
    if (keep) { var f = AU.$('[data-pref="' + keep[0] + '"] [data-v="' + keep[1] + '"]', box); if (f) f.focus({ preventScroll: true }); }
  }
  var prefBoxes = [];
  shell.registerPrefs = function (box, prefix) { renderPrefs(box, prefix); bindPrefs(box); prefBoxes.push([box, prefix]); };
  ['mode', 'pref', 'currency', 'season'].forEach(function (ev) { AU.on(ev, function () { prefBoxes.forEach(function (b) { syncPrefs(b[0]); }); }); });
  AU.on('lang', function () { prefBoxes.forEach(function (b) { rerenderPrefs(b[0], b[1]); }); });

  function initPrefs() {
    var pop = AU.$('[data-prefs]', head), btn = AU.$('[data-prefs-btn]', head);
    if (!pop || !btn) return null;
    shell.registerPrefs(AU.$('[data-prefs-groups]', pop), 'hp');
    var open = false;
    var setOpen = function (on, focusBack) {
      if (on === open) return;
      open = on;
      if (on) {
        if (megaApi) megaApi.close(true);
        if (careApi) careApi.close(true);
        pop.removeAttribute('inert'); pop.classList.add('is-open'); head.classList.add('is-prefs');
        if (shell.showHeader) shell.showHeader();
        var first = AU.$('.pref__chip[aria-checked="true"]', pop);
        setTimeout(function () { if (first && open) first.focus({ preventScroll: true }); }, 40);
      } else {
        var had = pop.contains(document.activeElement);
        pop.classList.remove('is-open'); pop.setAttribute('inert', ''); head.classList.remove('is-prefs');
        if (had && focusBack !== false) btn.focus({ preventScroll: true });
      }
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (shell.paintHead) shell.paintHead();
    };
    btn.addEventListener('click', function () { setOpen(!open); });
    pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); } });
    document.addEventListener('pointerdown', function (e) {
      if (open && !pop.contains(e.target) && !btn.contains(e.target)) setOpen(false, false);
    }, true);
    /* a language change re-renders the current page (the router then focuses its heading): that must not close the
       popover or take the visitor's place in it. For a few seconds the chip they used keeps focus. */
    var guardUntil = 0, keep = null;
    AU.on('lang', function () {
      var a = document.activeElement;
      if (open && a && pop.contains(a) && a.closest('[data-pref]')) {
        guardUntil = performance.now() + 4000;
        keep = [a.closest('[data-pref]').getAttribute('data-pref'), a.getAttribute('data-v')];
      }
    });
    var refocus = function () {
      if (!open || !keep || performance.now() > guardUntil) return;
      var f = AU.$('[data-pref="' + keep[0] + '"] [data-v="' + keep[1] + '"]', pop);
      if (f && document.activeElement !== f) f.focus({ preventScroll: true });
    };
    AU.on('route', function (d) { if (d && d.dir === 'force') { refocus(); setTimeout(refocus, 30); } });
    pop.addEventListener('focusout', function (e) {
      var to = e.relatedTarget;
      if (performance.now() < guardUntil && (!to || !head.contains(to))) return;
      if (open && to && !pop.contains(to) && to !== btn) setOpen(false, false);
    });
    return { close: function () { setOpen(false, false); }, isOpen: function () { return open; } };
  }

  /* ===================================================================================================
     CLIENT CARE CARD: the header's telephone opens a small card (not the care page's top): the atelier's number and
     its hours, the email, and the care pages a visitor looks for (the care page, sizing, delivery, a viewing).
     Same manners as the preferences: Escape and a press outside close it, focus returns to its button.
     =================================================================================================== */
  function initCare() {
    var pop = AU.$('[data-carepop]', head), inner = pop && AU.$('[data-carepop-in]', pop), btn = AU.$('[data-head-care]', head);
    if (!pop || !inner || !btn) return null;
    // the telephone hours are the care page's own (story content) when present, else the shell's fallback
    var tt = function (p, fb) { var v = AU.t(p); return (v == null || v === p || typeof v !== 'string') ? T(fb) : v; };
    var render = function () {
      var B = AU.content.brand || {};
      var tel = String(B.phone || '').replace(/[^\d+]/g, '');
      var L = T('ui.shell.care.links');
      inner.innerHTML =
        '<p class="caps caps--sm prefs__title" id="carepop-title">' + esc(T('ui.shell.care.title')) + '</p>' +
        '<p class="carepop__lede">' + esc(T('ui.shell.care.lede')) + '</p>' +
        (B.phone ? '<a class="carepop__tel" href="tel:' + esc(tel) + '"><span class="num">' + esc(B.phone) + '</span></a>' +
          '<p class="carepop__hours small">' + esc(tt('ui.story.common.contact.hoursLabel', 'ui.shell.care.hoursLabel')) + ' · ' +
            AU.nums(tt('ui.story.common.contact.hours', 'ui.shell.care.hours')) + '</p>' : '') +
        (B.email ? '<a class="carepop__mail" href="mailto:' + esc(B.email) + '">' + AU.icon('mail', { size: 15 }) + '<span>' + esc(B.email) + '</span></a>' : '') +
        '<ul class="carepop__links">' + (Array.isArray(L) ? L : []).map(function (l) {
          return '<li><a class="carepop__a" href="' + esc(l.href) + '"><span>' + esc(l.label) + '</span>' +
            '<span class="carepop__arrow" aria-hidden="true">' + AU.icon('arrow', { size: 14 }) + '</span></a></li>';
        }).join('') + '</ul>';
    };
    render();
    var open = false;
    var setOpen = function (on, focusBack) {
      if (on === open) return;
      open = on;
      if (on) {
        if (megaApi) megaApi.close(true);
        if (prefsApi) prefsApi.close(true);
        pop.removeAttribute('inert'); pop.classList.add('is-open'); head.classList.add('is-care');
        if (shell.showHeader) shell.showHeader();
        var first = AU.$('a', pop);
        setTimeout(function () { if (first && open) first.focus({ preventScroll: true }); }, 40);
      } else {
        var had = pop.contains(document.activeElement);
        pop.classList.remove('is-open'); pop.setAttribute('inert', ''); head.classList.remove('is-care');
        if (had && focusBack !== false) btn.focus({ preventScroll: true });
      }
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (shell.paintHead) shell.paintHead();
    };
    btn.addEventListener('click', function () { setOpen(!open); });
    pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); } });
    // a link in the card: the router follows it (the 'route' event closes the card); a telephone or mail link closes it
    pop.addEventListener('click', function (e) { var a = e.target.closest('a[href]'); if (a && !/^#\//.test(a.getAttribute('href'))) setOpen(false, false); });
    document.addEventListener('pointerdown', function (e) {
      if (open && !pop.contains(e.target) && !btn.contains(e.target)) setOpen(false, false);
    }, true);
    pop.addEventListener('focusout', function (e) {
      var to = e.relatedTarget;
      if (open && to && !pop.contains(to) && to !== btn) setOpen(false, false);
    });
    AU.on('lang', render);
    return { close: function () { setOpen(false, false); }, isOpen: function () { return open; } };
  }

  /* ===================================================================================================
     SEARCH: pieces (weighted fields, every word must match by prefix) and pages (the page index in content, plus
     journal stories when the journal exists). One listbox, two groups; arrows move, Enter opens.
     =================================================================================================== */
  /* lower case, no accents, "emerald cut" folded into one token ("emeraldcut") so a cut never matches a stone */
  var norm = function (s) {
    return String(s || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9.\s]/g, ' ').replace(/\b([a-z]+)\s+cut\b/g, '$1cut');
  };
  var stem = function (w) {
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 4 && /(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
    return w.length > 3 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w;
  };
  var toks = function (s) { return norm(s).split(/\s+/).filter(Boolean).map(stem); };
  var scoreOf = function (fields, qt) {
    var score = 0;
    var all = qt.every(function (t) {
      var best = 0;
      fields.forEach(function (f) {
        f.words.forEach(function (w) {
          if (w === t) best = Math.max(best, f.w + 1);
          else if (w.indexOf(t) === 0) best = Math.max(best, f.w * (t.length >= 3 ? .8 : .5));
        });
      });
      score += best;
      return best > 0;
    });
    return all ? score : 0;
  };
  var journalList = function () {
    var J = AU.content.journal;
    if (!J) return [];
    var list = Array.isArray(J) ? J : (J.stories || J.items || J.posts || J.articles || []);
    return (Array.isArray(list) ? list : []).filter(function (s) { return s && (s.slug || s.id) && s.title; });
  };
  shell.journal = journalList;

  function initSearch() {
    var root = document.getElementById('search');
    if (!root) return;
    var input = AU.$('[data-search-input]', root);
    var list = AU.$('[data-search-results]', root);
    var status = AU.$('[data-search-status]', root);
    var chipsBox = AU.$('[data-search-chips]', root);

    /* what a visitor may type for each kind of piece, in the three languages (accents are folded away by norm) */
    var TYPE_SYN = {
      ring: 'ring rings band bague bagues anneau alliance ringe',
      bracelet: 'bracelet bangle cuff tennis jonc manchette armband armbander armreif',
      earrings: 'earring earrings studs boucle boucles oreille oreilles puces ohrring ohrringe ohrstecker ohrhanger',
      pendant: 'pendant pendants necklace chain collier pendentif chaine sautoir anhanger kette halskette'
    };
    var W = { name: 10, style: 9, collection: 6, type: 5, stone: 5, cut: 4, metal: 3, material: 3, accent: 2, words: 1 };
    /* the shop's own words for a metal or a stone, in the current language (the card's "18k White Gold · Sapphire") */
    var shopWord = function (fn, key) {
      var S = AU.shop;
      if (!key || !S || typeof S[fn] !== 'function') return '';
      try { return S[fn](key) || ''; } catch (e) { return ''; }
    };
    var material = function (spec) {
      var S = AU.shop;
      if (S && typeof S.material === 'function') { try { return S.material(spec) || ''; } catch (e) { /* older shop */ } }
      return '';
    };
    var pieceIndex = function () {
      var C = AU.content, cols = {};
      (C.collections || []).forEach(function (c) { cols[c.id] = c; });
      return (C.products || []).map(function (p, order) {
        var s = p.spec || {}, col = cols[p.collection] || {};
        var details = Array.isArray(p.details) ? p.details.join(' ') : (p.details || '');
        var fields = [
          ['name', p.name], ['style', s.style], ['collection', (col.name || '') + ' ' + (col.kicker || '')],
          ['type', (s.type || '') + ' ' + (TYPE_SYN[s.type] || '') + ' ' + T('ui.shell.types.' + s.type)],
          ['stone', (s.stone || '') + ' ' + shopWord('stoneName', s.stone)],
          ['cut', s.cut ? s.cut + ' cut' : ''], ['metal', (s.metal ? s.metal + ' gold' : 'gold') + ' ' + shopWord('metalName', s.metal)],
          ['material', material(s)],
          ['accent', s.accent ? s.accent + ' ' + shopWord('stoneName', s.accent) : ''],
          ['words', (p.text || '') + ' ' + details]
        ].map(function (f) { return { w: W[f[0]], words: toks(f[1]) }; });
        return { p: p, order: order, fields: fields, meta: col.name || '' };
      });
    };
    var pageIndex = function () {
      var S = AU.content.search || {}, more = S.more || {};
      var pages = (S.pages || []).map(function (pg, i) {
        return { key: 'p:' + pg.href, href: pg.href, title: pg.title, text: pg.text, kind: 'page', order: i,
          fields: [{ w: 10, words: toks(pg.title) }, { w: 6, words: toks(pg.keywords) }, { w: 5, words: toks(more[pg.href]) }, { w: 3, words: toks(pg.text) }] };
      });
      journalList().forEach(function (s, i) {
        var slug = s.slug || s.id;
        var text = s.standfirst || s.dek || s.lede || s.excerpt || s.kicker || s.category || '';
        pages.push({ key: 'j:' + slug, href: '#/journal/' + slug, title: s.title, text: text, kind: 'story', order: 100 + i,
          fields: [{ w: 9, words: toks(s.title) }, { w: 5, words: toks((s.tags || []).join ? (s.tags || []).join(' ') : s.tags) }, { w: 4, words: toks(text) }, { w: 3, words: toks('journal story') }] });
      });
      return pages;
    };
    var rank = function (idx, q) {
      var qt = toks(q);
      if (!qt.length) return [];
      return idx.map(function (r) { return { r: r, s: scoreOf(r.fields, qt) }; })
        .filter(function (o) { return o.s > 0; })
        .sort(function (a, b) { return b.s - a.s || a.r.order - b.r.order; })
        .map(function (o) { return o.r; });
    };

    var rows = {}, active = -1;
    var allRows = function () { return AU.$$('.srch__row', list); };
    var setActive = function (i) {
      var rs = allRows();
      if (!rs.length) { active = -1; input.removeAttribute('aria-activedescendant'); return; }
      active = (i + rs.length) % rs.length;
      rs.forEach(function (r, j) { r.classList.toggle('is-active', j === active); r.setAttribute('aria-selected', j === active ? 'true' : 'false'); });
      input.setAttribute('aria-activedescendant', rs[active].id);
      rs[active].scrollIntoView({ block: 'nearest' });
    };
    var fresh = 0;
    var makeRow = function (key, htmlStr) {
      var r = rows[key];
      if (!r) {
        var tmp = document.createElement('div');
        tmp.innerHTML = htmlStr;
        r = tmp.firstChild;
        r.classList.add('is-enter');
        r.style.setProperty('--i', Math.min(fresh++, 8));
        r.addEventListener('animationend', function (e) { if (e.target === r) r.classList.remove('is-enter'); });
        rows[key] = r;
      }
      r.classList.remove('is-active'); r.setAttribute('aria-selected', 'false');
      return r;
    };
    var uid = 0;
    var render = function () {
      var q = input.value.trim();
      active = -1; fresh = 0;
      input.removeAttribute('aria-activedescendant');
      if (!q) {
        list.innerHTML = ''; rows = {}; status.textContent = '';
        input.setAttribute('aria-expanded', 'false');
        root.classList.remove('has-q');
        return;
      }
      root.classList.add('has-q');
      var pages = rank(pageIndex(), q).slice(0, 5);
      var pieces = rank(pieceIndex(), q).slice(0, 8);
      var n = pages.length + pieces.length;
      input.setAttribute('aria-expanded', n ? 'true' : 'false');
      var used = {};
      var frag = document.createDocumentFragment();
      if (!n) {
        list.innerHTML = ''; rows = {};
        status.textContent = '';
        list.innerHTML = '<div class="srch__empty" role="presentation">' +
          '<p class="srch__empty-title">' + esc(T('ui.shell.search.emptyTitle', { q: q })) + '</p>' +
          '<p class="small srch__empty-text">' + esc(T('ui.shell.search.emptyText')) + '</p></div>';
        return;
      }
      status.innerHTML = AU.nums(T(n === 1 ? 'ui.shell.search.count1' : 'ui.shell.search.countN', { n: n }));
      var group = function (title, id) {
        var g = document.createElement('div'); g.className = 'srch__group'; g.setAttribute('role', 'group'); g.setAttribute('aria-labelledby', id);
        g.innerHTML = '<p class="srch__gh caps caps--sm" id="' + id + '" role="presentation">' + esc(title) + '</p>';
        return g;
      };
      if (pieces.length) {
        var gp = group(T('ui.shell.search.pieces'), 'srch-gh-pieces');
        pieces.forEach(function (h) {
          var p = h.p, key = 'x:' + p.id; used[key] = 1;
          var isNew = !rows[key];
          var r = makeRow(key, '<div class="srch__row srch__row--piece" role="option" aria-selected="false" id="srch-o' + (++uid) + '" data-href="#/piece/' + esc(p.id) + '">' +
            '<span class="srch__thumb" data-well>' + AU.icon('diamond') + '<img alt="" width="480" height="480"></span>' +
            '<span class="srch__txt"><span class="srch__name">' + AU.nums(p.name) + '</span>' +
            '<span class="srch__meta small">' + AU.nums(h.meta) + '</span></span>' +
            '<span class="srch__price">' + AU.price(p.price) + '</span></div>');
          if (isNew) shell.setImg(AU.$('img', r), p.spec, 480, { eager: true });
          gp.appendChild(r);
        });
        frag.appendChild(gp);
      }
      if (pages.length) {
        var gg = group(T('ui.shell.search.pages'), 'srch-gh-pages');
        pages.forEach(function (h) {
          var key = h.key; used[key] = 1;
          var r = makeRow(key, '<div class="srch__row srch__row--page" role="option" aria-selected="false" id="srch-o' + (++uid) + '" data-href="' + esc(h.href) + '">' +
            '<span class="srch__pico">' + AU.icon(h.kind === 'story' ? 'sparkle' : 'arrow', { size: 18 }) + '</span>' +
            '<span class="srch__txt"><span class="srch__name">' + AU.nums(h.title) + '</span>' +
            '<span class="srch__meta small">' + AU.nums(h.text || '') + '</span></span>' +
            '<span class="srch__kind caps caps--sm">' + esc(T(h.kind === 'story' ? 'ui.shell.search.story' : 'ui.shell.search.page')) + '</span></div>');
          gg.appendChild(r);
        });
        frag.appendChild(gg);
      }
      Object.keys(rows).forEach(function (k) { if (!used[k]) delete rows[k]; });
      list.innerHTML = '';
      list.appendChild(frag);
    };
    var openRow = function (row) {
      if (!row) return;
      var href = row.getAttribute('data-href');
      AU.overlay.close('search');
      setTimeout(function () { if (AU.router) AU.router.go(href); }, 0);
    };

    var deb;
    input.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(render, 110); });
    input.addEventListener('keydown', function (e) {
      var n = allRows().length;
      if (e.key === 'ArrowDown') { if (n) { e.preventDefault(); setActive(active + 1); } }
      else if (e.key === 'ArrowUp') { if (n) { e.preventDefault(); setActive(active < 0 ? n - 1 : active - 1); } }
      else if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(deb);
        if (active < 0) render();
        var rs = allRows();
        openRow(rs[active >= 0 ? active : 0]);
      }
    });
    list.addEventListener('click', function (e) { openRow(e.target.closest('.srch__row')); });
    list.addEventListener('pointermove', function (e) {
      var row = e.target.closest('.srch__row'); if (!row) return;
      var rs = allRows(), i = rs.indexOf(row);
      if (i !== active) { rs.forEach(function (r, j) { r.classList.toggle('is-active', j === i); }); active = i; }
    });
    var renderChips = function () {
      var chips = T('ui.shell.search.chips');
      chipsBox.innerHTML = '<span class="caps caps--sm srch__chips-label">' + esc(T('ui.shell.search.try')) + '</span>' +
        (Array.isArray(chips) ? chips : []).map(function (c) { return '<button class="chip" type="button" data-q="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
    };
    chipsBox.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-q]'); if (!chip) return;
      input.value = chip.getAttribute('data-q');
      clearTimeout(deb); render(); input.focus();
    });
    renderChips();
    /* quick links: plain route links (the router follows them); the overlay closes as it does for a result */
    var quick = AU.$('[data-search-quick-list]', root);
    var renderQuick = function () {
      if (!quick) return;
      var ql = T('ui.shell.search.quickLinks');
      quick.innerHTML = (Array.isArray(ql) ? ql : []).map(function (l) {
        return '<li><a class="link caps caps--sm srch__quick-a" href="' + esc(l.href) + '">' + esc(l.label) + AU.icon('arrow', { size: 13 }) + '</a></li>';
      }).join('');
    };
    renderQuick();
    if (quick) quick.addEventListener('click', function (e) { if (e.target.closest('a[href]')) AU.overlay.close('search'); });
    AU.on('overlay', function (d) {
      if (!d || d.id !== 'search') return;
      if (d.open) setTimeout(function () { input.focus({ preventScroll: true }); input.select(); }, 80);
    });
    AU.on('lang', function () { renderChips(); renderQuick(); rows = {}; list.innerHTML = ''; render(); });
    shell.openSearch = function (q, opener) {
      AU.overlay.open('search', opener);
      if (q != null && q !== '') { input.value = q; render(); }
    };
  }

  /* ===================================================================================================
     MENU (phones and small tablets): full screen; the main pages in script, the other pages in capitals,
     saved / bag with their counts, and the preferences behind a disclosure.
     =================================================================================================== */
  var MORE = ['#/gifts', '#/gem-lab', '#/birthstones', '#/stack', '#/size', '#/care'];
  function initMenu() {
    var root = document.getElementById('menu');
    if (!root) return;
    var ol = AU.$('[data-menu-nav]', root), more = AU.$('[data-menu-more]', root);
    /* the four kinds of piece, with their counts, under "Boutique" (as the mega menu has them): shopping by type is
       one tap from the menu, not the boutique and then a chip */
    var typesHTML = function (i) {
      var hub = (AU.content.home && AU.content.home.hub) || [];
      if (!hub.length) return '';
      return '<ul class="menu__types" style="--i:' + i + '">' + hub.map(function (h) {
        var n = shell.typeCount(h.type);
        return '<li><a class="menu__type caps" data-menu-link data-path="' + esc(routePath(h.href)) + '" href="' + esc(h.href) + '">' +
          '<span class="menu__type-name">' + esc(h.label) + '</span>' +
          (n ? '<span class="menu__type-n num"><span class="sr-only">, </span>' + n + '</span>' : '') + '</a></li>';
      }).join('') + '</ul>';
    };
    var render = function () {
      ol.innerHTML = (AU.content.nav || []).map(function (n, i) {
        var p = routePath(n.href);
        return '<li' + (p === '/boutique' ? ' class="menu__li--types"' : '') + '><a class="menu__link" data-menu-link data-path="' + esc(p) + '" href="' + esc(n.href) + '" style="--i:' + i + '">' +
          '<span class="menu__idx num" aria-hidden="true">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' +
          '<span class="menu__word script">' + esc(n.label) + '</span></a>' +
          (p === '/boutique' ? typesHTML(i) : '') + '</li>';
      }).join('');
      var pages = (AU.content.search && AU.content.search.pages) || [];
      more.innerHTML = MORE.map(function (href, i) {
        var pg = pages.find(function (p) { return p.href === href; });
        return pg ? '<li style="--i:' + (i + 4) + '"><a class="menu__more-a caps" data-menu-link data-path="' + esc(routePath(href)) + '" href="' + esc(href) + '">' + esc(pg.title) + '</a></li>' : '';
      }).join('');
      var contact = AU.$('[data-menu-contact]', root), B = AU.content.brand || {};
      var tel = String(B.phone || '').replace(/[^\d+]/g, '');
      if (contact) contact.innerHTML =
        (B.phone ? '<a class="menu__tel" href="tel:' + esc(tel) + '">' + AU.icon('phone', { size: 16 }) + '<span class="num">' + esc(B.phone) + '</span></a>' : '') +
        (B.email ? '<a class="menu__mail" href="mailto:' + esc(B.email) + '">' + AU.icon('mail', { size: 16 }) + '<span>' + esc(B.email) + '</span></a>' : '');
      if (shell.markNav) shell.markNav();
    };
    render();
    hydrateShellIcons(root);
    var prefsBtn = AU.$('[data-menu-prefs]', root), prefsBox = AU.$('[data-menu-prefs-panel]', root);
    shell.registerPrefs(prefsBox, 'mp');
    prefsBtn.addEventListener('click', function () {
      var on = prefsBtn.getAttribute('aria-expanded') !== 'true';
      prefsBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on) {
        prefsBox.hidden = false;
        requestAnimationFrame(function () { prefsBox.classList.add('is-open'); });
        setTimeout(function () { prefsBox.scrollIntoView({ block: 'nearest', behavior: AU.reduced ? 'auto' : 'smooth' }); }, 60);
      } else { prefsBox.classList.remove('is-open'); prefsBox.hidden = true; }
    });

    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-menu-link]');
      if (a) {
        // the router follows the link (document listener); the menu closes and focus returns to the burger,
        // then the router moves it to the new page's heading
        AU.overlay.close('menu');
        return;
      }
      var b = e.target.closest('[data-menu-bag]');
      if (b) {
        var tab = b.getAttribute('data-menu-bag');
        var burger = AU.$('[data-burger]');
        AU.overlay.close('menu');
        setTimeout(function () { shell.openBag(tab, burger || b); }, 60);
      }
    });
    AU.on('route', function (d) { if ((!d || d.dir !== 'force') && AU.overlay.isOpen('menu')) AU.overlay.close('menu'); });
    AU.on('overlay', function (d) {
      if (d && d.id === 'menu' && !d.open) { prefsBtn.setAttribute('aria-expanded', 'false'); prefsBox.classList.remove('is-open'); prefsBox.hidden = true; }
    });
    AU.on('lang', render);
    // leaving the phone layout closes it
    var mq = matchMedia('(min-width: 1180px)');
    var onMq = function () { if (mq.matches && AU.overlay.isOpen('menu')) AU.overlay.close('menu'); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  /* ===================================================================================================
     FOOTER: the letter (newsletter adapter), link columns, contact, appearance, and the giant wordmark, written
     once by the pen when it first comes into view (and then still: no constant animation).
     =================================================================================================== */
  function initFooter() {
    var root = AU.$('footer.site-foot');
    if (!root) return;
    /* on a phone the footer is a short close, not two screens of chrome: the link groups fold into disclosures (their
       headings are the summaries), the appearance switch is left to the menu's preferences, and the atelier's address
       and hours stand as two lines under the contact (10-shell.css hides the wide layout's parts) */
    var phoneMq = matchMedia('(max-width: 599px)');
    var renderLinks = function () {
      var C = AU.content, F = C.footer || {};
      // the columns from content, with the shell's additions (a Boutique link, warranty, questions) placed in them
      var extra = T('ui.shell.footer.extra');
      var fold = phoneMq.matches;
      var box = AU.$('[data-ft-links]', root);
      var opened = {};
      AU.$$('details[open]', box).forEach(function (d) { opened[d.getAttribute('data-ft-col')] = true; });
      box.innerHTML = (F.columns || []).map(function (col, ci) {
        var links = (col.links || []).slice();
        ((Array.isArray(extra) && extra[ci]) || []).forEach(function (x) {
          if (!x || !x.href || links.some(function (l) { return l.href === x.href && l.label === x.label; })) return;
          if (typeof x.at === 'number') links.splice(Math.min(x.at, links.length), 0, x); else links.push(x);
        });
        var list = '<ul class="ft__list">' +
          links.map(function (l) { return '<li><a class="ft__a" href="' + esc(l.href) + '">' + AU.nums(l.label) + '</a></li>'; }).join('') + '</ul>';
        return fold
          ? '<details class="ft__col ft__acc" data-ft-col="' + ci + '"' + (opened[ci] ? ' open' : '') + '><summary class="caps caps--sm ft__h ft__sum">' +
              '<span>' + AU.nums(col.title) + '</span><span class="ft__chev" aria-hidden="true">' + AU.icon('chevron', { size: 14 }) + '</span></summary>' + list + '</details>'
          : '<div class="ft__col" data-reveal="up"><h3 class="caps caps--sm ft__h">' + AU.nums(col.title) + '</h3>' + list + '</div>';
      }).join('');
    };
    var onPhone = function () { renderLinks(); AU.reveal(root); };
    if (phoneMq.addEventListener) phoneMq.addEventListener('change', onPhone); else if (phoneMq.addListener) phoneMq.addListener(onPhone);
    var renderText = function () {
      var C = AU.content, B = C.brand || {};
      renderLinks();
      var legal = T('ui.shell.footer.legalLinks');
      AU.$('[data-ft-legal]', root).innerHTML = (Array.isArray(legal) ? legal : []).map(function (l) {
        return '<li><a class="ft__la" href="' + esc(l.href) + '">' + esc(l.label) + '</a></li>';
      }).join('');
      var tel = String(B.phone || '').replace(/[^\d+]/g, '');
      var ig = String(B.instagram || '').replace(/^@/, '');
      AU.$('[data-ft-contact]', root).innerHTML =
        (B.email ? '<li><a class="ft__a" href="mailto:' + esc(B.email) + '">' + AU.icon('mail', { size: 16 }) + '<span>' + esc(B.email) + '</span></a></li>' : '') +
        (B.phone ? '<li><a class="ft__a" href="tel:' + esc(tel) + '">' + AU.icon('phone', { size: 16 }) + '<span class="num">' + esc(B.phone) + '</span></a></li>' : '') +
        (ig ? '<li><a class="ft__a" href="https://www.instagram.com/' + encodeURIComponent(ig) + '/" rel="noopener" target="_blank">' + AU.icon('instagram', { size: 16 }) + '<span>@' + esc(ig) + '</span><span class="sr-only"> ' + esc(T('ui.shell.footer.opensIg')) + '</span></a></li>' : '');
      // the house: one line, then where to find the atelier and when it is open. The same facts as the visit page: its
      // address (visit.address, the lines the visit page prints) and the atelier's opening hours, labelled as such;
      // the place's own first line only when there is no address
      AU.$('[data-ft-brand-line]', root).innerHTML = AU.nums(T('ui.shell.footer.brandLine', { year: B.since || 1984 }));
      var V = C.visit || {}, places = V.places || [];
      var place = places.find(function (p) { return p && p.id === 'atelier'; }) || places[0] || null;
      var addr = Array.isArray(V.address) ? V.address.filter(Boolean) : (V.address ? [String(V.address)] : []);
      if (!addr.length && place && place.lines && place.lines[0]) addr = [place.lines[0]];
      var line = function (s, cls) { return '<p class="small ft__place-line' + (cls ? ' ' + cls : '') + '">' + AU.nums(s) + '</p>'; };
      AU.$('[data-ft-place]', root).innerHTML = place ?
        '<p class="caps caps--sm ft__h ft__h--place">' + AU.nums(place.name || '') + '</p>' +
        '<a class="ft__place-a" href="#/visit">' + addr.map(function (s) { return line(s); }).join('') + '</a>' +
        (place.hours ? line(T('ui.shell.footer.opening', { hours: place.hours }), 'ft__place-hours') : '') : '';
      var where = AU.$('[data-ft-where]', root);
      if (where) where.innerHTML = place ?
        '<a class="ft__where-a" href="#/visit">' + AU.icon('pin', { size: 16 }) + '<span>' +
          '<span class="ft__where-l">' + AU.nums(addr.join(', ')) + '</span>' +
          (place.hours ? '<span class="ft__where-l ft__where-h">' + AU.nums(T('ui.shell.footer.opening', { hours: place.hours })) + '</span>' : '') +
        '</span></a>' : '';
      AU.reveal(root);
    };
    renderText();
    AU.$('[data-ft-year]', root).textContent = new Date().getFullYear();
    AU.on('lang', renderText);

    /* back to top: smooth (Lenis when atmos runs it), focus to the page */
    AU.$('[data-ft-top]', root).addEventListener('click', function (e) {
      e.preventDefault();
      if (AU.scrollTo) AU.scrollTo(0); else window.scrollTo({ top: 0, behavior: AU.reduced ? 'auto' : 'smooth' });
      var m = document.getElementById('main'); if (m) m.focus({ preventScroll: true });
    });

    /* appearance switch: core flips the mode (data-mode-toggle); pressed = dark */
    var modeBtn = AU.$('[data-ft-mode]', root);
    var paintMode = function (m) { modeBtn.setAttribute('aria-pressed', (m || AU.getMode()) === 'dark' ? 'true' : 'false'); };
    AU.on('mode', paintMode); paintMode();

    /* the letter: AU.content.config.newsletter = { provider: 'preview' | 'endpoint', endpoint } */
    var nf = AU.$('[data-ft-form]', root), nIn = AU.$('#ft-email', root), nErr = AU.$('#ft-err', root);
    var thanks = AU.$('[data-ft-thanks]', root), note = AU.$('[data-ft-note]', root), status = AU.$('[data-ft-status]', nf);
    var send = AU.$('.ft__send', nf);
    var glint = AU.$('[data-ft-glint]', root);
    glint.innerHTML = AU.icon('sparkle', { size: 18 });
    var tried = false, sending = false;
    var check = function () {
      var v = nIn.value.trim();
      var m = !v ? T('ui.shell.footer.errEmpty') : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : T('ui.shell.footer.errBad'));
      nErr.textContent = m;
      nf.classList.toggle('is-bad', !!m);
      if (m) nIn.setAttribute('aria-invalid', 'true'); else nIn.removeAttribute('aria-invalid');
      return !m;
    };
    nIn.addEventListener('input', function () { if (tried && nf.classList.contains('is-bad')) check(); });
    nIn.addEventListener('blur', function () { if (tried && nIn.value) check(); });
    var done = function (preview) {
      sending = false;
      nf.classList.remove('is-sending');
      nf.classList.add('is-sent');
      note.hidden = !preview;
      if (preview) note.textContent = T('ui.shell.footer.previewNote');
      status.textContent = T('ui.shell.footer.thanks') + (preview ? ' ' + T('ui.shell.footer.previewNote') : '');
      AU.$('.ft__form-in', nf).setAttribute('aria-hidden', 'true');
      AU.$('.ft__form-in', nf).setAttribute('inert', '');
      nIn.blur();
      if (AU.sound && AU.sound.play) AU.sound.play('chime');
      setTimeout(function () { AU.sparkleAt(glint, { count: 10, spread: 80 }); }, AU.reduced ? 0 : 650);
    };
    nf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      tried = true;
      if (!check()) { nIn.focus(); return; }
      var cfg = (AU.content.config && AU.content.config.newsletter) || {};
      if (cfg.provider === 'endpoint' && cfg.endpoint && window.fetch) {
        sending = true;
        nf.classList.add('is-sending');
        send.setAttribute('aria-busy', 'true');
        status.textContent = T('ui.shell.footer.sending');
        fetch(cfg.endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email: nIn.value.trim() })
        }).then(function (r) {
          send.removeAttribute('aria-busy');
          if (!r.ok) throw new Error('HTTP ' + r.status);
          done(false);
        }).catch(function () {
          sending = false;
          send.removeAttribute('aria-busy');
          nf.classList.remove('is-sending');
          nf.classList.add('is-bad');
          nErr.textContent = T('ui.shell.footer.errSend');
          status.textContent = '';
        });
        return;
      }
      done(true);
    });

    /* the wordmark: fit the viewBox to the drawn word, then write it once */
    var markEl = AU.$('[data-ft-mark]', root), svg = AU.$('[data-ft-svg]', root), word = AU.$('[data-ft-word]', root);
    var inkBox = function () {
      try {
        var cx = document.createElement('canvas').getContext('2d');
        cx.font = '400 240px "Alex Brush"'; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
        var m = cx.measureText(word.textContent || 'Aurelia');
        if (!m || !m.actualBoundingBoxAscent) return null;
        return { x: 500 - m.actualBoundingBoxLeft, y: 220 - m.actualBoundingBoxAscent,
          width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
      } catch (e) { return null; }
    };
    var fit = function () {
      var bb = (document.fonts && document.fonts.check && document.fonts.check('240px "Alex Brush"')) ? inkBox() : null;
      if (!bb) { try { bb = word.getBBox(); } catch (e) { return; } }
      if (!bb || !bb.width) return;
      var px = bb.width * .012, top = bb.height * .04, bottom = bb.height * .12;
      svg.setAttribute('viewBox', (bb.x - px).toFixed(1) + ' ' + (bb.y - top).toFixed(1) + ' ' + (bb.width + px * 2).toFixed(1) + ' ' + (bb.height + top + bottom).toFixed(1));
    };
    var fontsReady = document.fonts && document.fonts.load ? document.fonts.load('400 240px "Alex Brush"').catch(noop) : Promise.resolve();
    fontsReady.then(function () { return document.fonts ? document.fonts.ready : null; }).then(fit, fit);
    fit();
    if (AU.reduced || !('IntersectionObserver' in window)) markEl.classList.add('is-static');
    else {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        markEl.classList.add('is-drawn');
      }, { threshold: 0.4 });
      io.observe(markEl);
    }
    AU.on('reduced', function (r) { if (r) markEl.classList.add('is-static'); });
  }

  /* ===================================================================================================
     LEGAL '/legal': privacy, terms of sale and imprint, each an anchored section ('/legal?at=privacy|terms|imprint').
     A quiet reading page: the title, a contents list held beside the text on wide screens, numbered sections.
     The texts are PLACEHOLDER (ui.shell.legal in 02-content-shell.js) until the house's own exist.
     =================================================================================================== */
  function initLegal() {
    if (!AU.router) return;
    var L = function (k, v) { return T('ui.shell.legal.' + k, v); };
    var two = function (i) { return (i < 9 ? '0' : '') + (i + 1); };
    var para = function (s, B) {
      var parts = String(s || '').split('{email}');
      var mail = B.email ? '<a class="lg__a" href="mailto:' + esc(B.email) + '">' + esc(B.email) + '</a>' : '';
      return '<p>' + parts.map(function (x) { return AU.nums(x); }).join(mail) + '</p>';
    };
    var factsHTML = function (C) {
      var F = L('facts'), B = C.brand || {}, V = C.visit || {};
      if (!F || typeof F !== 'object') return '';
      var addr = Array.isArray(V.address) ? V.address : [];
      var tel = String(B.phone || '').replace(/[^\d+]/g, '');
      var row = function (k, v) { return '<div class="lg__fact"><dt class="caps caps--sm">' + esc(k) + '</dt><dd>' + v + '</dd></div>'; };
      var todo = '<span class="lg__todo">' + esc(F.toAdd || '') + '</span>';
      return '<dl class="lg__facts">' +
        row(F.company, esc(F.companyV || B.name || '')) +
        (addr.length ? row(F.office, addr.map(function (l) { return AU.nums(l); }).join('<br>')) : '') +
        row(F.contact, (B.email ? '<a class="lg__a" href="mailto:' + esc(B.email) + '">' + esc(B.email) + '</a>' : '') +
          (B.phone ? (B.email ? '<br>' : '') + '<a class="lg__a" href="tel:' + esc(tel) + '"><span class="num">' + esc(B.phone) + '</span></a>' : '')) +
        row(F.register, todo) + row(F.vat, todo) +
        row(F.responsible, esc(F.responsibleV || '')) +
        '</dl>';
    };
    AU.router.add('/legal', {
      name: 'legal',
      title: function () { return L('metaTitle'); },
      description: function () { return L('metaDesc'); },
      render: function (el) {
        var C = AU.content, B = C.brand || {};
        var secs = L('sections');
        secs = Array.isArray(secs) ? secs.filter(function (s) { return s && s.id; }) : [];
        el.innerHTML =
          '<article class="lg wrap" aria-labelledby="lg-title">' +
          '<header class="lg__head">' +
            '<p class="eyebrow caps lg__eyebrow" data-reveal="fade">' + esc(L('eyebrow')) + '</p>' +
            '<h1 class="script t-h1 lg__title" id="lg-title" data-reveal="words">' + esc(L('title')) + '</h1>' +
            '<p class="small lg__note" data-reveal="up" data-delay="200">' + esc(L('note')) + '</p>' +
          '</header>' +
          '<div class="lg__grid">' +
            '<nav class="lg__toc" aria-labelledby="lg-toc-h" data-reveal="fade" data-delay="250">' +
              '<p class="caps caps--sm lg__toc-h" id="lg-toc-h">' + esc(L('toc')) + '</p>' +
              '<ol class="lg__toc-l">' + secs.map(function (s, i) {
                return '<li><a class="lg__toc-a" href="#' + esc(s.id) + '" data-lg-toc="' + esc(s.id) + '"><span class="num lg__toc-n">' + two(i) + '</span><span>' + esc(s.title) + '</span></a></li>';
              }).join('') + '</ol>' +
            '</nav>' +
            '<div class="lg__secs">' + secs.map(function (s, i) {
              // the anchor sits a header's height above the section, so a link to it ('?at=terms', '#terms') lands
              // with the section's number clear of the fixed header
              return '<section class="lg__sec" data-lg-sec="' + esc(s.id) + '" aria-labelledby="lg-' + esc(s.id) + '-t" data-reveal="up">' +
                '<span class="lg__anchor" id="' + esc(s.id) + '" tabindex="-1"></span>' +
                '<p class="num lg__num" aria-hidden="true">' + two(i) + '</p>' +
                '<h2 class="script t-h3 lg__h" id="lg-' + esc(s.id) + '-t">' + esc(s.title) + '</h2>' +
                '<div class="lg__body">' + (s.paras || []).map(function (p) { return para(p, B); }).join('') +
                  (s.id === 'imprint' ? factsHTML(C) : '') + '</div>' +
                (s.link && s.link.href ? '<a class="link caps caps--sm lg__more" href="' + esc(s.link.href) + '"><span>' + esc(s.link.label) + '</span>' + AU.icon('arrow', { size: 14 }) + '</a>' : '') +
                '</section>';
            }).join('') + '</div>' +
          '</div>' +
          '</article>';
        /* the contents list follows the reading: the section at the upper third of the screen is marked */
        var io = null;
        if ('IntersectionObserver' in window) {
          var tocs = AU.$$('[data-lg-toc]', el);
          io = new IntersectionObserver(function (es) {
            es.forEach(function (e) {
              if (!e.isIntersecting) return;
              var id = e.target.getAttribute('data-lg-sec');
              tocs.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('data-lg-toc') === id); });
            });
          }, { rootMargin: '-30% 0px -60% 0px' });
          AU.$$('.lg__sec', el).forEach(function (s) { io.observe(s); });
        }
        var offLang = AU.on('lang', function () { if (AU.router.current && AU.router.current.name === 'legal') AU.router.refresh(); });
        return function () { offLang(); if (io) io.disconnect(); };
      }
    });
  }

  /* ===================================================================================================
     NOT FOUND '*'
     =================================================================================================== */
  function initNotFound() {
    if (!AU.router) return;
    AU.router.add('*', {
      name: 'notfound',
      title: function () { return T('ui.shell.notFound.title'); },
      description: function () { return T('ui.shell.notFound.description'); },
      render: function (el) {
        var links = [{ label: T('ui.shell.notFound.home'), href: '#/' }].concat((AU.content.nav || []).filter(function (n) { return routePath(n.href) !== '/journal'; }));
        el.innerHTML =
          '<section class="nf" aria-labelledby="nf-title">' +
          '<div class="nf__art" aria-hidden="true"><svg viewBox="0 0 200 200" focusable="false">' +
          '<circle class="nf__ring" cx="100" cy="118" r="54"/><circle class="nf__ring nf__ring--in" cx="100" cy="118" r="47"/>' +
          '<path class="nf__gem" d="M84 64 92 52h16l8 12-16 16z"/><path class="nf__gem nf__gem--f" d="M84 64h32M92 52l8 28 8-28"/></svg></div>' +
          '<p class="eyebrow eyebrow--center caps nf__eyebrow">' + AU.nums(T('ui.shell.notFound.eyebrow')) + '</p>' +
          '<h1 class="script t-h1 nf__title" id="nf-title">' + esc(T('ui.shell.notFound.heading')) + '</h1>' +
          '<p class="lede nf__text">' + esc(T('ui.shell.notFound.text')) + '</p>' +
          '<button class="btn btn--solid nf__search" type="button" data-nf-search>' + AU.icon('search', { size: 16 }) + '<span>' + esc(T('ui.shell.notFound.search')) + '</span></button>' +
          '<ul class="nf__links">' + links.map(function (l) { return '<li><a class="link caps caps--sm" href="' + esc(l.href) + '">' + esc(l.label) + '</a></li>'; }).join('') + '</ul>' +
          '</section>';
        var b = AU.$('[data-nf-search]', el);
        b.addEventListener('click', function () { if (shell.openSearch) shell.openSearch('', b); });
        var offLang = AU.on('lang', function () { if (AU.router.current && AU.router.current.name === 'notfound') AU.router.refresh(); });
        requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); });
        return function () { offLang(); };
      }
    });
  }

  /* ---------- startup ----------
     The header, the legal page and the 404 are set up at once (the router renders the first page right after this).
     The search, the menu and the footer are not seen before the intro's curtain lifts (without the intro: before the
     visitor reaches for them or scrolls to the end), so each is set up later in an idle slice of its own, and the first
     page's render and the pen's first strokes have the main thread to themselves. Reaching for one early (the search
     button, the burger) sets it up on the spot. */
  var lazy = {}, lazyOrder = [];
  var later = function (name, fn) {
    var done = false;
    lazy[name] = function () {
      if (done) return; done = true;
      try { fn(); } catch (e) { console.error('[shell]', e); }
    };
    lazyOrder.push(name);
  };
  shell.ensure = function (name) { if (lazy[name]) lazy[name](); };
  var searchStub = shell.openSearch = function (q, opener) {
    lazy.search();
    if (shell.openSearch !== searchStub) shell.openSearch(q, opener);
  };
  later('search', initSearch); later('menu', initMenu); later('footer', initFooter);
  later('fit', function () { if (shell.fitCare) shell.fitCare(); });
  var laterRan = false;
  function runLater() {
    if (laterRan) return; laterRan = true;
    var i = 0;
    var next = function () {
      var n = lazyOrder[i++];
      if (!n) return;
      lazy[n]();
      slice(next);
    };
    var slice = function (fn) { if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 300 }); else setTimeout(fn, 16); };
    slice(next);
  }
  AU.ready(function () {
    [initHeader, initLegal, initNotFound].forEach(function (fn) {
      try { fn(); } catch (e) { console.error('[shell]', e); }
    });
    initIntro();
    // without the intro (or skipped before its pen began): after the first page is in place
    var off = AU.on('route', function () { off(); if (!shell.introShown) requestAnimationFrame(function () { setTimeout(runLater, 0); }); });
    shell.afterIntro(function () { setTimeout(runLater, 0); });
  });
})();
