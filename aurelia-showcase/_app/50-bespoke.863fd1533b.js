/* ---- 50-bespoke.js ---- */
/* Bespoke area (v2): shared kit (AU.bespoke.kit) and the ring configurator at '/bespoke'.
   51-size.js (/size), 52-stack.js (/stack) and 53-gemlab.js (/gem-lab) build on the kit.
   Public: AU.bespoke.spec() -> the current configurator spec; AU.bespoke.set(partial) while the page is open.
   Other pages link in with query presets: '#/bespoke?stone=ruby&cut=oval&carat=1.5&style=halo&metal=rose'. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU) return;

  var c01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var f1 = function (v) { return Math.round(v * 10) / 10; };
  var T = function (k, v) { return AU.t('ui.bespoke.' + k, v); };

  /* =====================================================================================================
     KIT
     ===================================================================================================== */
  var kit = {};

  /* a page skeleton from its <template> */
  kit.clone = function (id) {
    var t = document.getElementById(id);
    if (!t) return null;
    var frag = t.content.cloneNode(true);
    return frag.firstElementChild ? frag : null;
  };

  /* Resolves once the page is in place and the transition has finished (the router's 'route' event), the intro has
     gone, and the main thread is idle: the moment to start a WebGL stage without costing the transition a frame. */
  /* o: { delay, idle } (ms): a page whose single subject is its stage starts it sooner ({ delay: 300, idle: 300 }: a
     short beat after landing, then the first idle moment, at the latest 300 ms later).
     o.early: the page's one subject is a scene whose heavy work the engine itself holds back while a page change runs
     (its slices wait for a calm moment): resolve as soon as the page is in the document, while it is still arriving,
     so the scene's preparation overlaps the transition instead of following it (the intro still comes first). */
  kit.settled = function (el, ctx, o) {
    o = o || {};
    return new Promise(function (res) {
      var done = false, offR = null, offI = null, t1 = 0;
      var idle = function (fn) {
        var go2 = function () { if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: o.idle != null ? o.idle : 900 }); else setTimeout(fn, 120); };
        if (o.delay) setTimeout(go2, o.delay); else go2();
      };
      var introOn = function () {
        var i = document.getElementById('intro');
        return !!(i && !document.documentElement.classList.contains('no-intro') && i.offsetParent !== null && !i.hidden && getComputedStyle(i).visibility !== 'hidden');
      };
      var fire = function () {
        if (done || (ctx.signal && ctx.signal.aborted)) return;
        done = true;
        if (offR) offR(); if (offI) offI(); clearTimeout(t1);
        if (o.early) { res(); return; }
        idle(function () { if (!(ctx.signal && ctx.signal.aborted)) res(); });
      };
      var go = function () {
        if (!el.isConnected) return;
        var sh = AU.shell;
        if (sh && typeof sh.afterIntro === 'function' && !sh.introDone) {
          sh.afterIntro(function () { t1 = setTimeout(fire, sh.introShown ? 900 : 0); });
          return;
        }
        if (introOn()) {
          offI = AU.on('intro:done', function () { setTimeout(fire, 900); });
          t1 = setTimeout(fire, 7000);
        } else fire();
      };
      offR = AU.on('route', function () { if (offR) { offR(); offR = null; } go(); });
      if (o.early) kit.whenAttached(el, function () { if (!done && offR) { offR(); offR = null; go(); } }, ctx);
      if (ctx.onLeave) ctx.onLeave(function () { done = true; if (offR) offR(); if (offI) offI(); clearTimeout(t1); });
      // safety net: if the route event never comes, start a while after the element is attached
      var poll = function (n) {
        if (done) return;
        if (el.isConnected) { setTimeout(function () { if (!done && offR && el.isConnected) { offR(); offR = null; go(); } }, 2400); return; }
        if (n < 300) requestAnimationFrame(function () { poll(n + 1); });
      };
      requestAnimationFrame(function () { poll(0); });
    });
  };

  /* run fn once the element is in the document (pages are rendered before they are put in place) */
  kit.whenAttached = function (el, fn, ctx) {
    var n = 0;
    var check = function () {
      if (ctx && ctx.signal && ctx.signal.aborted) return;
      if (el.isConnected) { fn(); return; }
      if (++n < 600) requestAnimationFrame(check);
    };
    check();
  };

  /* radio group with roving tabindex: arrows move and choose, Home / End, Space / Enter */
  kit.radios = function (g, onPick) {
    var val = function (b) { return b.getAttribute('data-val'); };
    var reach = function (r) { return !r.hidden && !r.closest('[inert]') && !r.closest('[hidden]'); };
    g.addEventListener('click', function (e) {
      var b = e.target.closest('[role="radio"]');
      if (b && g.contains(b) && g.getAttribute('aria-disabled') !== 'true' && b.getAttribute('aria-disabled') !== 'true') onPick(val(b), b);
    });
    g.addEventListener('keydown', function (e) {
      var rs = AU.$$('[role="radio"]', g).filter(reach);
      var i = rs.indexOf(document.activeElement), n = -1;
      if (i < 0 || g.getAttribute('aria-disabled') === 'true') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % rs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + rs.length) % rs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = rs.length - 1;
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onPick(val(rs[i]), rs[i]); return; }
      if (n < 0) return;
      e.preventDefault();
      rs[n].focus();
      onPick(val(rs[n]), rs[n]);
    });
    return {
      sync: function (cur) {
        var rs = AU.$$('[role="radio"]', g), any = false;
        rs.forEach(function (r) {
          var on = String(cur) === val(r);
          r.setAttribute('aria-checked', on ? 'true' : 'false');
          r.tabIndex = on && reach(r) ? 0 : -1;
          if (on && reach(r)) any = true;
        });
        // the chosen option may be in a set that is not shown: then the first reachable one takes the tab stop
        if (!any) { var f = rs.filter(reach)[0]; if (f) f.tabIndex = 0; }
      }
    };
  };

  /* A hairline range with a diamond thumb. The real <input type=range> (transparent, 44px tall) sits over the track,
     so keyboard, touch and screen readers get the native control. The fill and thumb move by transform only.
     o: { id, min, max, step, value, ticks: [labels] (a stepped scale), ends: [a, b], valueText(v), onInput(v), describedby } */
  kit.range = function (box, o) {
    var ticks = o.ticks || null, n = ticks ? ticks.length : 0;
    box.classList.add('rg');
    if (ticks) box.classList.add('rg--steps');
    box.innerHTML =
      '<div class="rg__track">' +
        '<i class="rg__rail" aria-hidden="true"></i><i class="rg__fill" aria-hidden="true"></i><i class="rg__thumb" aria-hidden="true"></i>' +
        '<input type="range"' + (o.id ? ' id="' + o.id + '"' : '') + ' min="' + o.min + '" max="' + o.max + '" step="' + o.step + '" value="' + o.value + '"' +
          (o.label ? ' aria-label="' + AU.esc(o.label) + '"' : '') + (o.describedby ? ' aria-describedby="' + o.describedby + '"' : '') + '>' +
      '</div>' +
      (ticks ? '<div class="rg__ticks" aria-hidden="true">' + ticks.map(function (t, i) {
        return '<span class="rg__tick' + (i === 0 ? ' is-first' : i === n - 1 ? ' is-last' : '') + '" style="--x:' + (n > 1 ? i / (n - 1) : 0).toFixed(4) + '">' + AU.nums(String(t)) + '</span>';
      }).join('') + '</div>'
        : o.ends ? '<div class="rg__ends" aria-hidden="true"><span>' + AU.nums(String(o.ends[0])) + '</span><span>' + AU.nums(String(o.ends[1])) + '</span></div>' : '');
    var track = AU.$('.rg__track', box), input = AU.$('input', box), tickEls = AU.$$('.rg__tick', box);
    var paint = function (v) {
      var p = c01((v - o.min) / (o.max - o.min));
      track.style.setProperty('--p', p.toFixed(4));
      if (o.valueText) input.setAttribute('aria-valuetext', o.valueText(v));
      if (tickEls.length) {
        var k = Math.round((v - o.min) / o.step);
        tickEls.forEach(function (t, i) { t.classList.toggle('is-on', i === k); });
      }
    };
    input.addEventListener('input', function () { var v = +input.value; paint(v); if (o.onInput) o.onInput(v); });
    // a drag follows the finger exactly; keyboard and taps glide
    input.addEventListener('pointerdown', function () { box.classList.add('is-drag'); });
    var up = function () { box.classList.remove('is-drag'); };
    input.addEventListener('pointerup', up); input.addEventListener('pointercancel', up); input.addEventListener('blur', up);
    paint(+o.value);
    return {
      input: input,
      set: function (v) { input.value = v; paint(+input.value); },
      setRange: function (min, max) {
        o.min = min; o.max = max; input.min = min; input.max = max;
        var e = AU.$$('.rg__ends span', box);
        if (e.length === 2 && o.ends) { e[0].innerHTML = AU.nums(String(o.endsFmt ? o.endsFmt(min) : min)); e[1].innerHTML = AU.nums(String(o.endsFmt ? o.endsFmt(max) : max)); }
        paint(+input.value);
      },
      disable: function (b) { input.disabled = !!b; box.classList.toggle('is-off', !!b); }
    };
  };

  /* the price, tweened from the shown value to the new one over ~0.7s (a long soft landing) */
  kit.priceTween = function (el) {
    el.innerHTML = AU.price(0);
    var span = el.firstChild, shown = null, off = null;
    var render = function (v) { span.setAttribute('data-price', v); span.textContent = AU.fmt(v); };
    return function (n) {
      if (shown === null || AU.reduced || document.hidden) { if (off) { off(); off = null; } shown = n; render(n); return; }
      if (n === shown && !off) return;
      var from = shown, t0 = performance.now();
      if (off) off();
      off = AU.tick(function () {
        var t = c01((performance.now() - t0) / 760), e = 1 - Math.pow(1 - t, 4);
        shown = from + (n - from) * e;
        render(Math.round(shown));
        if (t >= 1) { shown = n; render(n); off(); off = null; }
      });
    };
  };

  /* ---------- numbers in the visitor's language: 1.00 ct · 1,00 ct; always lining figures through .num ---------- */
  kit.locale = function () { return AU.lang === 'fr' ? 'fr-FR' : AU.lang === 'de' ? 'de-DE' : 'en-US'; };
  var nfs = {};
  kit.dec = function (v, d) {
    d = d == null ? 2 : d;
    var k = kit.locale() + d;
    try {
      if (!nfs[k]) nfs[k] = new Intl.NumberFormat(kit.locale(), { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
      return nfs[k].format(+v);
    } catch (e) { return (+v).toFixed(d); }
  };
  /* like AU.nums, but a number keeps its unit with it ('1,00 ct', '16.5 mm'): one lining-figure span, never split
     across lines, and never set in capitals by a .caps parent (so a carat reads 'ct', as in the product copy) */
  kit.numsU = function (s) {
    return AU.esc(s).replace(/(\$?\d[\d,.:–—-]*\d|\$?\d)(?:[   ]?(ct|mm)\b)?/g, function (m, n, u) {
      return '<span class="num">' + n + (u ? ' ' + u : '') + '</span>';
    });
  };
  /* a caption of parts joined by ' · ': each part stays whole, so a line only ever breaks between parts */
  kit.parts = function (s) {
    // the dot stays at the end of the line it closes ('Yellow Gold ·' / '1.00 ct Round Diamond'), never opening the next
    var a = String(s).split(' · ');
    return a.map(function (p, i) { return '<span class="k-part">' + kit.numsU(p) + (i < a.length - 1 ? ' ·' : '') + '</span>'; }).join(' ');
  };

  kit.stoneById = function (id) { return (AU.content.bespoke.stones || []).find(function (s) { return s.id === id; }) || null; };
  /* A stone swatch: a flat disc in the stone's colour with its crown drawn over it in 1px hairlines (table, star and
     kite facets of a round brilliant seen from above). A pearl, which is not cut, is the plain disc. No gloss, no
     highlight: it reads as a cut stone, not a bead. The disc colour is the middle stop of the stone's swatch. */
  var gemN = 0;
  kit.gemDot = function (st, size) {
    var h = kit.hexes(st && st.swatch), col = h[Math.min(1, h.length - 1)];
    if (st && st.id === 'diamond') col = '#e4ebf1';
    var lum = (function (c) { var n = parseInt(c.replace('#', '').replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3'), 16); return (.299 * ((n >> 16) & 255) + .587 * ((n >> 8) & 255) + .114 * (n & 255)) / 255; })(col);
    var line = lum > .62 ? 'rgba(48,4,4,.34)' : 'rgba(255,255,255,.5)', edge = lum > .62 ? 'rgba(48,4,4,.26)' : 'rgba(255,255,255,.18)';
    var crown = '';
    if (!(st && st.id === 'pearl')) {
      var tbl = [], out = [], k, star = '', kite = '';
      for (k = 0; k < 8; k++) {
        var at = (k * 45 + 22.5) * Math.PI / 180, ao = k * 45 * Math.PI / 180;
        tbl.push([12 + Math.cos(at) * 5.6, 12 + Math.sin(at) * 5.6]);
        out.push([12 + Math.cos(ao) * 11.5, 12 + Math.sin(ao) * 11.5]);
      }
      for (k = 0; k < 8; k++) {
        var a1 = out[k], a2 = out[(k + 1) % 8], t1 = tbl[k];
        star += 'M' + f1(a1[0]) + ' ' + f1(a1[1]) + 'L' + f1(t1[0]) + ' ' + f1(t1[1]) + 'L' + f1(a2[0]) + ' ' + f1(a2[1]);
      }
      kite = 'M' + tbl.map(function (p) { return f1(p[0]) + ' ' + f1(p[1]); }).join('L') + 'Z';
      crown = '<path d="' + kite + star + '" fill="none" stroke="' + line + '" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>';
    }
    // an opal is the one stone whose colour is a play of colours: a flat, soft sweep across the disc (no sphere)
    var defs = '', fill = col;
    if (st && st.id === 'opal') {
      var gid = 'k-opal-' + (++gemN);
      defs = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' + h.slice(1).map(function (c, i, a) { return '<stop offset="' + (i / (a.length - 1)).toFixed(2) + '" stop-color="' + c + '"/>'; }).join('') + '</linearGradient></defs>';
      fill = 'url(#' + gid + ')';
    }
    return '<svg class="k-gem" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + defs +
      '<circle cx="12" cy="12" r="11.5" fill="' + fill + '"/>' + crown +
      '<circle cx="12" cy="12" r="11.5" fill="none" stroke="' + edge + '" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>';
  };
  /* whether the 3D kit can draw a stone (the 'more' stones arrive with gl-scenes-a) */
  kit.glHas = function (gl, id) { return !!(gl && gl.kit && gl.kit.STONES && gl.kit.STONES[id]); };
  kit.sizeRow = function (us) { return (AU.content.ringSizes || []).find(function (r) { return r.us === +us; }) || null; };
  kit.sizeWord = function (s) { return String(s).replace('.5', '½'); };
  /* the visitor's measured size (from /size), if any */
  kit.ringSize = function () { var s = +AU.store.get('ringSize', 0); return kit.sizeRow(s) ? s : 0; };

  /* thin-outline drawings in the house icon style */
  kit.SET_ICONS = {
    'solitaire': '<circle cx="22" cy="24" r="9"/><path d="M16.5 9.5 19 6.5h6l2.5 3L22 15z"/><path d="M16.5 9.5h11"/>',
    'halo': '<circle cx="22" cy="24" r="9"/><path d="M18.2 9.6 20 7.4h4l1.8 2.2L22 13.6z"/><path d="M18.2 9.6h7.6"/><path d="M14.2 9.6a7.8 4.4 0 0 0 15.6 0"/><circle cx="14.2" cy="9.6" r=".7"/><circle cx="29.8" cy="9.6" r=".7"/><circle cx="16.3" cy="12.4" r=".7"/><circle cx="27.7" cy="12.4" r=".7"/>',
    'three-stone': '<circle cx="22" cy="24" r="9"/><path d="M17.8 9.4 19.8 7h4.4l2 2.4L22 14.4z"/><path d="M17.8 9.4h8.4"/><path d="M9.6 12.8 11 11h3l1.4 1.8-2.9 3.4z"/><path d="M28.6 12.8 30 11h3l1.4 1.8-2.9 3.4z"/>',
    'eternity': (function () {
      var s = '<circle cx="22" cy="20" r="11"/><circle cx="22" cy="20" r="7.4"/>';
      for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; s += '<circle cx="' + f1(22 + Math.cos(a) * 9.2) + '" cy="' + f1(20 + Math.sin(a) * 9.2) + '" r=".9"/>'; }
      return s;
    })()
  };
  kit.CUT_ICONS = {
    round: '<circle cx="12" cy="12" r="8.5"/><path d="M10.25 7.8h3.5l2.45 2.45v3.5l-2.45 2.45h-3.5L7.8 13.75v-3.5z"/>',
    oval: '<ellipse cx="12" cy="12" rx="6.3" ry="9"/><path d="M10.6 7.2h2.8l1.9 2.6v4.4l-1.9 2.6h-2.8l-1.9-2.6V9.8z"/>',
    pear: '<path d="M12 2.8C9 6.8 6 10.4 6 14.6a6 6 0 0 0 12 0c0-4.2-3-7.8-6-11.8z"/><path d="M12 8.6c-1.4 1.8-2.9 3.6-2.9 5.8a2.9 2.9 0 0 0 5.8 0c0-2.2-1.5-4-2.9-5.8z"/>',
    emerald: '<path d="M8.8 3.5h6.4l2.8 2.8v11.4l-2.8 2.8H8.8L6 17.7V6.3z"/><path d="M10.2 7.6h3.6l1.2 1.2v6.4l-1.2 1.2h-3.6L9 15.2V8.8z"/>',
    cushion: '<path d="M8 4.5h8c2.3 0 3.5 1.2 3.5 3.5v8c0 2.3-1.2 3.5-3.5 3.5H8c-2.3 0-3.5-1.2-3.5-3.5V8c0-2.3 1.2-3.5 3.5-3.5z"/><path d="M10.2 8.6h3.6l1.6 1.6v3.6l-1.6 1.6h-3.6l-1.6-1.6v-3.6z"/>',
    cabochon: '<ellipse cx="12" cy="12" rx="7.5" ry="8.5"/><path d="M8.2 9.2c1.2-2.2 3.4-3.2 5.6-2.6"/>'
  };
  kit.LIGHT_ICONS = {
    studio: '<rect x="5" y="4.5" width="14" height="9" rx="1"/><path d="M8 13.5 6.5 20M16 13.5l1.5 6.5M12 13.5V20"/>',
    daylight: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"/>',
    candle: '<path d="M12 3.2c1.9 2.2 2.6 3.8 2.6 5.2a2.6 2.6 0 0 1-5.2 0c0-1.4.7-3 2.6-5.2z"/><path d="M9.5 12.5h5v8h-5z"/><path d="M12 10.9v1.6"/>',
    evening: '<path d="M18.5 14.2A7 7 0 0 1 9.8 5.5a7 7 0 1 0 8.7 8.7z"/><path d="M17 4.2v2.6M15.7 5.5h2.6"/>'
  };
  kit.LOUPE_ICON = '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.2 15.2 20.5 20.5"/><path d="M7.6 9.2a3.2 3.2 0 0 1 2.4-2.1"/>';
  kit.svgIcon = function (paths, w, h, vb) {
    return '<svg class="ico" width="' + (w || 22) + '" height="' + (h || w || 22) + '" viewBox="' + (vb || '0 0 24 24') + '" aria-hidden="true" focusable="false">' + paths + '</svg>';
  };

  /* ---------- colour helpers for the flat drawings ---------- */
  kit.hexes = function (s) { return String(s || '').match(/#[0-9a-f]{6}|#[0-9a-f]{3}/gi) || ['#cccccc', '#999999', '#dddddd']; };
  kit.shade = function (hex, k) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k))); };
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  };
  kit.mix = function (a, b, t) {
    var p = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    var x = p(a), y = p(b);
    return '#' + ((1 << 24) + (Math.round(x[0] + (y[0] - x[0]) * t) << 16) + (Math.round(x[1] + (y[1] - x[1]) * t) << 8) + Math.round(x[2] + (y[2] - x[2]) * t)).toString(16).slice(1);
  };

  /* ---------- stone outlines (unit: x across, y along the finger) ---------- */
  function cutOutline(cut) {
    var pts = [], N = 72, i, t;
    if (cut === 'emerald') return { poly: [[-.46, -1], [.46, -1], [.7, -.78], [.7, .78], [.46, 1], [-.46, 1], [-.7, .78], [-.7, -.78]], step: true };
    if (cut === 'pear') {
      var r = .64, oy = .36, bez = function (p0, p1, p2, u) { var v = 1 - u; return [v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]]; };
      for (i = 0; i <= 36; i++) { t = i / 36 * Math.PI; pts.push([r * Math.cos(t), oy + r * Math.sin(t)]); }
      for (i = 1; i <= 18; i++) pts.push(bez([-r, oy], [-r * .98, -.42], [0, -1], i / 18));
      for (i = 1; i < 18; i++) pts.push(bez([0, -1], [r * .98, -.42], [r, oy], i / 18));
      return { poly: pts, step: false };
    }
    for (i = 0; i < N; i++) {
      t = i / N * Math.PI * 2;
      var c = Math.cos(t), s = Math.sin(t);
      if (cut === 'oval') pts.push([.74 * c, s]);
      else if (cut === 'cushion') pts.push([.94 * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3.2), Math.sign(s) * Math.pow(Math.abs(s), 2 / 3.2)]);
      else pts.push([c, s]);
    }
    return { poly: pts, step: false, cab: cut === 'cabochon' };
  }
  function towards(poly, a) {
    var best = poly[0], bd = 9;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], d = Math.abs(Math.atan2(Math.sin(Math.atan2(p[1], p[0]) - a), Math.cos(Math.atan2(p[1], p[0]) - a)));
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  /* a faceted stone seen from slightly above: pavilion, crown, table and facet lines; grad = id prefix of its gradients */
  function stoneSVG(cut, cx, cy, R, sq, grad, opts) {
    opts = opts || {};
    var o = cutOutline(cut), poly = o.poly;
    var P = function (p, k) { k = k || 1; return [cx + p[0] * R * k, cy + p[1] * R * sq * k]; };
    var path = function (pts, k) { return 'M' + pts.map(function (p) { var q = P(p, k); return f1(q[0]) + ' ' + f1(q[1]); }).join('L') + 'Z'; };
    var minX = 9, maxX = -9, yAtMin = 0, yAtMax = 0;
    poly.forEach(function (p) { if (p[0] < minX) { minX = p[0]; yAtMin = p[1]; } if (p[0] > maxX) { maxX = p[0]; yAtMax = p[1]; } });
    var lower = poly.filter(function (p) { return p[1] >= Math.min(yAtMin, yAtMax) - .001; }).sort(function (a, b) { return b[0] - a[0]; });
    var culet = [cx, cy + R * sq + R * (opts.deep || .58) * (o.step ? .8 : 1)];
    // step cuts end in a short keel, brilliants in a point
    var keel = o.step ? 'L' + f1(cx - R * .22) + ' ' + f1(culet[1]) + 'L' + f1(cx + R * .22) + ' ' + f1(culet[1]) : 'L' + f1(culet[0]) + ' ' + f1(culet[1]);
    var pav = 'M' + lower.map(function (p) { var q = P(p); return f1(q[0]) + ' ' + f1(q[1]); }).join('L') + keel + 'Z';
    var s = '', fac = '', lite = '', dark = '';
    if (o.cab) {
      // a smooth dome: no facets, a soft highlight
      s += '<path d="' + path(poly) + '" fill="url(#' + grad + '-c)" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>';
      s += '<ellipse cx="' + f1(cx - R * .28) + '" cy="' + f1(cy - R * sq * .38) + '" rx="' + f1(R * .34) + '" ry="' + f1(R * sq * .2) + '" fill="#fff" fill-opacity=".38" transform="rotate(-18 ' + f1(cx - R * .28) + ' ' + f1(cy - R * sq * .38) + ')"/>';
      return { svg: s, crown: path(poly), outline: poly, P: P };
    }
    s += '<path d="' + pav + '" fill="url(#' + grad + '-p)"/>';
    var pl = '';
    [-.7, -.35, 0, .35, .7].forEach(function (k) {
      var q = P(towards(poly, Math.PI / 2 + k * 1.1));
      pl += 'M' + f1(q[0]) + ' ' + f1(q[1]) + 'L' + f1(culet[0]) + ' ' + f1(culet[1]);
    });
    s += '<path d="' + pl + '" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width=".7"/>';
    s += '<path d="' + path(poly) + '" fill="url(#' + grad + '-c)" stroke="#fff" stroke-opacity=".5" stroke-width=".8" stroke-linejoin="round"/>';
    if (o.step) {
      var k1 = .78, k2 = .54;
      fac += '<path d="' + path(poly, k1) + path(poly, k2) + '" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width=".7"/>';
      var corners = '';
      poly.forEach(function (p) { var a = P(p), b = P(p, k2); corners += 'M' + f1(a[0]) + ' ' + f1(a[1]) + 'L' + f1(b[0]) + ' ' + f1(b[1]); });
      fac += '<path d="' + corners + '" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width=".6"/>';
      lite = '<path d="' + path(poly, k1) + path(poly, k2) + '" fill="#fff" fill-opacity=".1" fill-rule="evenodd"/><path d="' + path(poly, k2) + '" fill="#fff" fill-opacity=".14"/>';
    } else {
      var tv = [], ov = [], k;
      for (k = 0; k < 8; k++) {
        var at = (k * 45 + 22.5) * Math.PI / 180, ao = k * 45 * Math.PI / 180;
        tv.push(P(towards(poly, at), .56));
        ov.push(P(towards(poly, ao)));
      }
      var tpath = 'M' + tv.map(function (q) { return f1(q[0]) + ' ' + f1(q[1]); }).join('L') + 'Z';
      var star = '';
      for (k = 0; k < 8; k++) {
        var a1 = ov[k], a2 = ov[(k + 1) % 8], t1 = tv[k];
        star += 'M' + f1(a1[0]) + ' ' + f1(a1[1]) + 'L' + f1(t1[0]) + ' ' + f1(t1[1]) + 'L' + f1(a2[0]) + ' ' + f1(a2[1]);
        var tri = 'M' + f1(a1[0]) + ' ' + f1(a1[1]) + 'L' + f1(t1[0]) + ' ' + f1(t1[1]) + 'L' + f1(a2[0]) + ' ' + f1(a2[1]) + 'Z';
        if (k % 2) lite += '<path d="' + tri + '" fill="#fff" fill-opacity="' + (k === 5 || k === 3 ? .2 : .1) + '"/>';
        else dark += '<path d="' + tri + '" fill="#000" fill-opacity=".1"/>';
      }
      lite += '<path d="' + tpath + '" fill="#fff" fill-opacity=".12"/>';
      fac += '<path d="' + tpath + star + '" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width=".65" stroke-linejoin="round"/>';
    }
    s += dark + lite + fac;
    return { svg: s, crown: path(poly), outline: poly, P: P };
  }
  kit.cutOutline = cutOutline; kit.towards = towards; kit.stoneSVG = stoneSVG;
  kit.star4 = function (x, y, r) {
    var q = r * .14;
    return 'M' + f1(x) + ' ' + f1(y - r) + 'Q' + f1(x + q) + ' ' + f1(y - q) + ' ' + f1(x + r) + ' ' + f1(y) +
      'Q' + f1(x + q) + ' ' + f1(y + q) + ' ' + f1(x) + ' ' + f1(y + r) + 'Q' + f1(x - q) + ' ' + f1(y + q) + ' ' + f1(x - r) + ' ' + f1(y) +
      'Q' + f1(x - q) + ' ' + f1(y - q) + ' ' + f1(x) + ' ' + f1(y - r) + 'Z';
  };

  /* ---------- the flat ring drawing (shown until, or instead of, the 3D studio) ----------
     viewBox 480 x 480: the band stands upright, seen from slightly above; the stone faces up, foreshortened. */
  function ringGeo(spec) {
    var CX = 240, BY = 292, RO = [124, 130], RI = [104, 110], HOLE_DY = 6;
    var bandTop = BY - RO[1];
    var ell = function (cx, cy, rx, ry) { return 'M' + (cx - rx) + ' ' + cy + 'a' + rx + ' ' + ry + ' 0 1 0 ' + 2 * rx + ' 0a' + rx + ' ' + ry + ' 0 1 0 ' + (-2 * rx) + ' 0Z'; };
    var outer = ell(CX, BY, RO[0], RO[1]), hole = ell(CX, BY + HOLE_DY, RI[0], RI[1]);
    var g = '<ellipse cx="240" cy="452" rx="170" ry="16" fill="url(#bk-pool)"/>';
    g += '<path d="' + hole + ell(CX, BY + HOLE_DY - 14, RI[0], RI[1] - 2) + '" fill="url(#bk-m-in)" fill-rule="evenodd"/>';
    var eternity = spec.style === 'eternity';
    var R = 44 * Math.cbrt(AU.clamp(+spec.carat || 1, .25, 3));
    var sq = .5, deep = .55, cy = bandTop - 6 - R * deep - R * sq;
    var head = '', front = '', back = '', clip = '', stone = null;
    var M = 'fill="url(#bk-m)" stroke="url(#bk-m-e)" stroke-width=".6" stroke-linejoin="round"';
    var prong = function (bx, by, p, wb, wt, bow) {
      var mx = (bx + p[0]) / 2 + bow, my = (by + p[1]) / 2;
      return '<path d="M' + f1(bx - wb) + ' ' + f1(by) + 'Q' + f1(mx - (wb + wt) / 2) + ' ' + f1(my) + ' ' + f1(p[0] - wt) + ' ' + f1(p[1]) +
        'L' + f1(p[0] + wt) + ' ' + f1(p[1]) + 'Q' + f1(mx + (wb + wt) / 2) + ' ' + f1(my) + ' ' + f1(bx + wb) + ' ' + f1(by) + 'Z" ' + M + '/>';
    };
    if (!eternity && spec.stone && spec.style !== 'band') {
      stone = stoneSVG(spec.cut || 'round', CX, cy, R, sq, 'bk-g', { deep: deep });
      var o = stone.outline;
      var claw = function (a) { return stone.P(towards(o, a * Math.PI / 180)); };
      var cl = [claw(225), claw(315), claw(135), claw(45)];
      if (spec.cut === 'pear') cl.push(claw(270));
      var yg = cy + R * sq, yc = yg + R * deep;
      var bandPt = function (deg) { var a = deg * Math.PI / 180; return [CX + RO[0] * Math.cos(a), BY + RO[1] * Math.sin(a)]; };
      [-1, 1].forEach(function (side) {
        var o1 = bandPt(side < 0 ? -118 : -62), i1 = bandPt(side < 0 ? -101 : -79);
        var hx = CX + side * R * .46, hy = yc - R * deep * .55, ix = CX + side * R * .16, iy = yc - 1;
        back += '<path d="M' + f1(o1[0]) + ' ' + f1(o1[1]) +
          'C' + f1(o1[0] + side * -10) + ' ' + f1(o1[1] - 22) + ' ' + f1(hx + side * 10) + ' ' + f1(hy + 16) + ' ' + f1(hx) + ' ' + f1(hy) +
          'L' + f1(ix) + ' ' + f1(iy) +
          'C' + f1(ix + side * 8) + ' ' + f1(iy + 12) + ' ' + f1(i1[0] + side * -4) + ' ' + f1(i1[1] - 10) + ' ' + f1(i1[0]) + ' ' + f1(i1[1]) + 'Z" ' + M + '/>';
      });
      back += prong(CX - R * .24, yc - R * deep * .3, cl[0], 2.4, 1.8, -2) + prong(CX + R * .24, yc - R * deep * .3, cl[1], 2.4, 1.8, 2);
      var railY = yg + R * deep * .42, railRx = R * .5, railRy = R * sq * .34;
      var rail = 'M' + f1(CX - railRx) + ' ' + f1(railY) + 'A' + f1(railRx) + ' ' + f1(railRy) + ' 0 0 0 ' + f1(CX + railRx) + ' ' + f1(railY);
      front += '<path d="' + rail + '" fill="none" stroke="url(#bk-m-e)" stroke-width="4.2" stroke-linecap="round"/><path d="' + rail + '" fill="none" stroke="url(#bk-m)" stroke-width="2.8" stroke-linecap="round"/>';
      if (spec.style === 'halo') {
        var n = Math.round(14 + R * .22), hk = 1.24, ring = [], j;
        for (j = 0; j < 72; j++) ring.push(stone.P(towards(o, j / 72 * Math.PI * 2), 1.4));
        back += '<path d="M' + ring.map(function (q) { return f1(q[0]) + ' ' + f1(q[1]); }).join('L') + 'Z" fill="url(#bk-m)" stroke="url(#bk-m-e)" stroke-width=".7"/>';
        for (j = 0; j < n; j++) {
          var q = stone.P(towards(o, j / n * Math.PI * 2), hk);
          back += '<circle cx="' + f1(q[0]) + '" cy="' + f1(q[1]) + '" r="' + f1(R * .085 + 1.6) + '" fill="url(#bk-d-c)" stroke="#fff" stroke-opacity=".55" stroke-width=".5"/>';
        }
      }
      if (spec.style === 'three-stone') {
        var rs = R * .6;
        [-1, 1].forEach(function (side) {
          var sx = CX + side * (R * .74 + rs * .92), sy = cy + R * sq * .55 + 6;
          var ss = stoneSVG('round', sx, sy, rs, sq, 'bk-d', { deep: .5 });
          var sc = [ss.P(towards(ss.outline, (side < 0 ? 200 : -20) * Math.PI / 180)), ss.P(towards(ss.outline, (side < 0 ? 120 : 60) * Math.PI / 180))];
          var scul = sy + rs * sq + rs * .5;
          var dx = (sx - CX) / RO[0], bandY = BY - RO[1] * Math.sqrt(Math.max(0, 1 - dx * dx));
          back += '<path d="M' + f1(sx - rs * .34) + ' ' + f1(scul - rs * .3) + 'Q' + f1(sx - 2) + ' ' + f1((scul + bandY) / 2) + ' ' + f1(sx - side * 6 - 4) + ' ' + f1(bandY + 6) +
            'L' + f1(sx - side * 6 + 4) + ' ' + f1(bandY + 6) + 'Q' + f1(sx + 2) + ' ' + f1((scul + bandY) / 2) + ' ' + f1(sx + rs * .34) + ' ' + f1(scul - rs * .3) + 'Z" ' + M + '/>';
          back += ss.svg;
          var sf = [ss.P(towards(ss.outline, 135 * Math.PI / 180)), ss.P(towards(ss.outline, 45 * Math.PI / 180))];
          back += prong(sx - rs * .26, scul - rs * .2, sf[0], 1.8, 1.4, -1) + prong(sx + rs * .26, scul - rs * .2, sf[1], 1.8, 1.4, 1);
          sc.concat(sf).forEach(function (p) { back += '<ellipse cx="' + f1(p[0]) + '" cy="' + f1(p[1] - .8) + '" rx="2.5" ry="2.9" ' + M + '/>'; });
        });
      }
      head = stone.svg;
      front += prong(CX - R * .4, yc - R * deep * .12, cl[2], 3, 2.1, -3) + prong(CX + R * .4, yc - R * deep * .12, cl[3], 3, 2.1, 3);
      cl.forEach(function (p) {
        front += '<ellipse cx="' + f1(p[0]) + '" cy="' + f1(p[1] - 1) + '" rx="' + f1(3.2 + R * .02) + '" ry="' + f1(3.6 + R * .02) + '" ' + M + '/>' +
          '<circle cx="' + f1(p[0] - 1) + '" cy="' + f1(p[1] - 2.2) + '" r="1.1" fill="#fff" fill-opacity=".7"/>';
      });
      clip = stone.crown;
    }
    var bandSvg = '<path d="' + outer + hole + '" fill="url(#bk-m)" fill-rule="evenodd"/>' +
      '<path d="' + outer + hole + '" fill="url(#bk-gloss)" fill-rule="evenodd"/>' +
      '<path d="' + outer + '" fill="none" stroke="url(#bk-m-e)" stroke-width=".9"/>' +
      '<path d="' + hole + '" fill="none" stroke="url(#bk-m-e)" stroke-width=".9"/>' +
      '<path d="M' + (CX - 118) + ' ' + (BY - 30) + 'A' + (RO[0] - 6) + ' ' + (RO[1] - 6) + ' 0 0 1 ' + (CX - 30) + ' ' + (bandTop + 9) + '" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>';
    var bandStones = '';
    if (eternity) {
      var n2 = 24, mx = (RO[0] + RI[0]) / 2, my = (RO[1] + RI[1]) / 2, cyM = BY + HOLE_DY / 2, rr = 8.4;
      for (var e = 0; e < n2; e++) {
        var a = e / n2 * Math.PI * 2 - Math.PI / 2, x = CX + Math.cos(a) * mx, y = cyM + Math.sin(a) * my;
        bandStones += '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + rr + '" fill="url(#bk-g-c)" stroke="#fff" stroke-opacity=".5" stroke-width=".55"/>' +
          '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(rr * .5) + '" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-opacity=".3" stroke-width=".4"/>';
        var a2 = (e + .5) / n2 * Math.PI * 2 - Math.PI / 2;
        bandStones += '<circle cx="' + f1(CX + Math.cos(a2) * mx) + '" cy="' + f1(cyM + Math.sin(a2) * my) + '" r="1.7" fill="url(#bk-m)" stroke="url(#bk-m-e)" stroke-width=".4"/>';
      }
    }
    g += bandSvg + bandStones + back + head + front;
    var gl = eternity
      ? [[CX - 60, BY - 118, 9], [CX + 104, BY + 40, 6], [CX - 96, BY + 70, 5]]
      : [[CX - R * .32, cy - R * sq * .25, 10 + R * .08], [CX + R * .5, cy + R * sq * .2, 6 + R * .04], [CX - 108, BY - 40, 6]];
    var glints = gl.map(function (p) { return '<path class="k-glint" d="' + kit.star4(p[0], p[1], p[2]) + '"/>'; }).join('');
    var sheen = '<clipPath id="bk-clip"><path d="' + outer + hole + '" clip-rule="evenodd"/>' + (clip ? '<path d="' + clip + '"/>' : '') + '</clipPath>' +
      '<g clip-path="url(#bk-clip)"><rect class="k-sheen" x="0" y="0" width="90" height="480" fill="url(#bk-sheen)"/></g>';
    return g + sheen + glints;
  }

  var illN = 0;
  var reId = function (s, P) { return P === 'bk-' ? s : s.replace(/(id="|url\(#)bk-/g, '$1' + P); };
  /* opts.prefix: a unique id prefix when several drawings share a page (the stack's stills stand-ins) */
  kit.Illustration = function (box, opts) {
    var P = (opts && opts.prefix) || (illN++ ? 'bk' + illN + '-' : 'bk-');
    box.innerHTML = reId('<svg class="bk-ill" viewBox="0 0 480 480" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><defs>' +
      '<linearGradient id="bk-m" x1="0" y1="0" x2="1" y2="1"><stop data-c="m0" offset="0"/><stop data-c="m1" offset=".24"/><stop data-c="m2" offset=".46"/><stop data-c="m1" offset=".68"/><stop data-c="m0" offset=".86"/><stop data-c="m1" offset="1"/></linearGradient>' +
      '<linearGradient id="bk-m-e" x1="0" y1="0" x2="0" y2="1"><stop data-c="md" offset="0"/><stop data-c="md2" offset="1"/></linearGradient>' +
      '<linearGradient id="bk-m-in" x1="0" y1="0" x2="0" y2="1"><stop data-c="md2" offset="0"/><stop data-c="m1" offset=".75"/><stop data-c="m0" offset="1"/></linearGradient>' +
      '<linearGradient id="bk-gloss" x1="0" y1="0" x2="1" y2=".35"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".18" stop-color="#fff" stop-opacity=".38"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset=".86" stop-color="#000" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient>' +
      '<radialGradient id="bk-g-c" cx=".36" cy=".3" r=".85"><stop data-c="g0" offset="0"/><stop data-c="g1" offset=".48"/><stop data-c="g2" offset="1"/></radialGradient>' +
      '<linearGradient id="bk-g-p" x1="0" y1="0" x2="0" y2="1"><stop data-c="g1" offset="0"/><stop data-c="g3" offset="1"/></linearGradient>' +
      '<radialGradient id="bk-d-c" cx=".36" cy=".3" r=".85"><stop data-c="d0" offset="0"/><stop data-c="d1" offset=".48"/><stop data-c="d2" offset="1"/></radialGradient>' +
      '<linearGradient id="bk-d-p" x1="0" y1="0" x2="0" y2="1"><stop data-c="d1" offset="0"/><stop data-c="d3" offset="1"/></linearGradient>' +
      '<radialGradient id="bk-pool" class="k-pool"><stop offset="0" stop-opacity=".2"/><stop offset="1" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="bk-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '</defs><g data-geo class="k-geo"></g></svg>', P);
    var svg = box.firstChild, geoEl = AU.$('[data-geo]', svg), stops = AU.$$('stop[data-c]', svg);
    var lastGeo = '', swapT = 0;
    return {
      set: function (spec) {
        var b = AU.content.bespoke;
        var me = b.metals.find(function (x) { return x.id === spec.metal; }) || b.metals[0];
        var st = kit.stoneById(spec.stone) || b.stones[0];
        var dia = kit.hexes((kit.stoneById('diamond') || {}).swatch);
        var m = kit.hexes(me.swatch), gm = kit.hexes(st.swatch);
        var col = {
          m0: m[0], m1: m[1], m2: m[2] || m[0], md: kit.shade(m[1], .62), md2: kit.shade(m[1], .42),
          g0: gm[0], g1: gm[1], g2: gm[gm.length - 1] || gm[1], g3: kit.shade(gm[gm.length - 1] || gm[1], .55),
          d0: dia[0], d1: dia[1], d2: dia[2] || dia[1], d3: kit.shade(dia[2] || dia[1], .6)
        };
        stops.forEach(function (s) { s.style.stopColor = col[s.getAttribute('data-c')]; });
        var key = [spec.style, spec.stone ? spec.cut : '-', spec.style === 'eternity' || !spec.stone ? 0 : spec.carat].join('|');
        if (key === lastGeo) return;
        var shapeChange = lastGeo && lastGeo.split('|').slice(0, 2).join('|') !== key.split('|').slice(0, 2).join('|');
        lastGeo = key;
        var html = reId(ringGeo(spec), P);
        clearTimeout(swapT);
        if (shapeChange && !AU.reduced) {
          geoEl.classList.add('is-out');
          swapT = setTimeout(function () { geoEl.innerHTML = html; geoEl.classList.remove('is-out'); }, 260);
        } else geoEl.innerHTML = html;
      }
    };
  };

  /* query value helpers for presets */
  kit.num = function (v, min, max) { var n = parseFloat(v); return isFinite(n) && n >= min && n <= max ? n : null; };

  /* keep the URL's query in step with the page (replaceState, so the back button is not filled with every change) */
  kit.setQuery = function (q, name) {
    var cur = AU.router && AU.router.current;
    // only for the page that is open (a page is rendered before it becomes the current route)
    if (!cur || (name && cur.name !== name)) return;
    Object.keys(q).forEach(function (k) { if (q[k] == null || q[k] === '') delete cur.query[k]; else cur.query[k] = String(q[k]); });
    var keys = Object.keys(cur.query);
    var full = cur.path + (keys.length ? '?' + keys.map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(cur.query[k]); }).join('&') : '');
    if (AU.router.setQuery) { AU.router.setQuery(full); return; }   // integrator: keeps the router's record in step
    try { history.replaceState(history.state, '', AU.router.href(full)); } catch (e) { /* file:// in some browsers */ }
  };

  /* add to bag through the shop's choreography (box opening, drawer) when it exists */
  kit.addToBag = function (item, btn, toastMsg) {
    if (AU.shop && typeof AU.shop.addToBag === 'function') { try { AU.shop.addToBag(item, btn); return; } catch (e) { console.error(e); } }
    AU.cart.add(item);
    if (btn) AU.sparkleAt(btn);
    if (AU.sound && AU.sound.play) AU.sound.play('chime');
    AU.toast(toastMsg || item.name, 'bag');
  };

  AU.bespoke = AU.bespoke || {};
  AU.bespoke.kit = kit;

  /* one language listener for the whole area: the open page re-renders in the new language */
  var NAMES = ['bespoke', 'size', 'stack', 'gem-lab'];
  AU.on('lang', function () {
    var c = AU.router && AU.router.current;
    if (c && NAMES.indexOf(c.name) >= 0) AU.router.refresh();
  });
})();

/* =====================================================================================================
   /bespoke: the ring configurator
   Desktop: the live stage on the left; on the right the title, six steps as tabs (each tab shows its current
   choice), one step's options at a time in a pane of fixed height, and the price with the two actions. Everything
   is on one screen. Phone: title, stage, steps, and a price bar that sticks to the bottom.
   ===================================================================================================== */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.bespoke || !AU.bespoke.kit) return;
  var kit = AU.bespoke.kit;
  var T = function (k, v) { return AU.t('ui.bespoke.' + k, v); };
  var c01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var STEPS = ['style', 'metal', 'stone', 'cut', 'size', 'engraving'];
  var byId = function (list, id) { return (list || []).find(function (x) { return x.id === id; }); };
  var open = null;   // the controller of the open configurator, for AU.bespoke.set / spec

  function initialSpec(q) {
    var B = AU.content.bespoke, ENG = B.engraveMax || 18;
    var spec = {};
    Object.keys(B.initial).forEach(function (k) { spec[k] = B.initial[k]; });
    spec.font = 'script';
    var saved = AU.store.get('bespoke', null);
    var okStone = function (id) { var s = kit.stoneById(id); return !!(s && s.group !== 'lab'); };
    if (saved && typeof saved === 'object') {
      if (byId(B.styles, saved.style)) spec.style = saved.style;
      if (byId(B.metals, saved.metal)) spec.metal = saved.metal;
      if (okStone(saved.stone)) spec.stone = saved.stone;
      if (byId(B.cuts, saved.cut)) spec.cut = saved.cut;
      if (+saved.carat >= B.carat.min && +saved.carat <= B.carat.max) spec.carat = +saved.carat;
      if (B.sizes.indexOf(+saved.size) >= 0) spec.size = +saved.size;
      if (typeof saved.engraving === 'string') spec.engraving = saved.engraving.slice(0, ENG);
      if (byId(B.fonts, saved.font)) spec.font = saved.font;
    }
    var measured = kit.ringSize();
    if (measured && !(saved && saved.size)) spec.size = measured;
    // presets from other pages: ?stone=&cut=&carat=&style=&metal=&size=
    q = q || {};
    if (byId(B.styles, q.style)) spec.style = q.style;
    if (byId(B.metals, q.metal)) spec.metal = q.metal;
    if (okStone(q.stone)) spec.stone = q.stone;
    if (byId(B.cuts, q.cut)) spec.cut = q.cut;
    var ct = parseFloat(q.carat);
    if (isFinite(ct)) spec.carat = Math.round(AU.clamp(ct, B.carat.min, B.carat.max) / B.carat.step) * B.carat.step;
    if (B.sizes.indexOf(+q.size) >= 0) spec.size = +q.size;
    spec.carat = Math.round(spec.carat * 100) / 100;
    spec.type = 'ring';
    return spec;
  }

  function render(el, params, ctx) {
    var B = AU.content.bespoke, ENG = B.engraveMax || 18;
    var frag = kit.clone('tpl-bespoke');
    if (!frag) return;
    el.appendChild(frag);
    var root = AU.$('.bk', el);
    var $ = function (s) { return AU.$(s, root); };
    var spec = initialSpec(ctx.query);
    var gl = null, studio = null, moreAvail = false, moreOpen = false, leaving = false;
    var stoneHeld = spec.stone;   // a preset 'more' stone waits for the 3D kit to confirm it
    var cr = B.carat;

    /* ---------- words ---------- */
    var label = function (list, id) { return ((byId(list, id) || list[0]) || {}).label || ''; };
    var isEternity = function () { return spec.style === 'eternity'; };
    var cutOf = function () { return isEternity() ? 'round' : spec.cut; };
    var stone = function () { return kit.stoneById(spec.stone) || B.stones[0]; };
    var cutWord = function () { var c = cutOf(); return c === 'emerald' ? T('cutEmerald') : label(B.cuts, c); };
    var ctWord = function () { return kit.dec(spec.carat); };
    var engr = function () { return String(spec.engraving || '').replace(/^\s+|\s+$/g, ''); };
    var stoneText = function () {
      return isEternity() ? T('roundAllAround', { stones: stone().plural || stone().label })
                          : T('stoneSum', { ct: ctWord(), cut: cutWord(), stone: stone().label });
    };
    var summaryText = function () { return label(B.styles, spec.style) + ' · ' + label(B.metals, spec.metal) + ' · ' + stoneText(); };
    var glSpec = function () {
      var s = { type: 'ring', style: spec.style, metal: spec.metal, stone: spec.stone, cut: cutOf(),
        carat: isEternity() ? .25 : spec.carat,
        accent: spec.style === 'halo' || spec.style === 'three-stone' ? 'diamond' : null, size: spec.size };
      // the 3D engraving goes through setEngraving when the studio has it, else inside the spec (v1 studios)
      if (!(studio && typeof studio.setEngraving === 'function')) { s.engraving = engr(); s.engravingFont = spec.font; }
      return s;
    };
    var hash = function () {
      var s = JSON.stringify([spec.style, spec.metal, spec.stone, cutOf(), isEternity() ? 0 : spec.carat, spec.size, engr(), engr() ? spec.font : '']), h = 5381;
      for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
      return h.toString(36);
    };

    /* ---------- the steps: tabs ---------- */
    var tabsEl = $('[data-bk-tabs]'), panesEl = $('[data-bk-panes]');
    tabsEl.setAttribute('aria-label', T('title'));
    tabsEl.innerHTML = STEPS.map(function (k, i) {
      return '<button type="button" role="tab" class="bk__tab" id="bk-tab-' + k + '" aria-controls="bk-pane-' + k + '" aria-selected="false" tabindex="-1" data-step="' + k + '">' +
        '<span class="bk__tn num" aria-hidden="true">0' + (i + 1) + '</span>' +
        '<span class="bk__tk caps caps--sm">' + AU.esc(T('steps.' + k)) + '</span><span class="sr-only">: </span>' +
        '<span class="bk__tv" data-bk-v="' + k + '"></span></button>';
    }).join('');

    /* ---------- the steps: panes ---------- */
    var radio = function (key, id, inner, cls, i, extra) {
      return '<button type="button" role="radio" class="bk__opt ' + cls + '" data-key="' + key + '" data-val="' + AU.esc(id) + '" aria-checked="false" tabindex="-1" style="--i:' + i + '"' + (extra || '') + '>' + inner + '</button>';
    };
    var nextBtn = function (k) {
      var i = STEPS.indexOf(k), n = STEPS[i + 1];
      if (!n) return '';
      return '<div class="bk__pfoot">' + (k === 'stone' ? '<button class="bk__more link caps caps--sm" type="button" data-bk-more aria-expanded="false" aria-controls="bk-more" hidden></button>' : '<span></span>') +
        (n ? '<button class="bk__next link caps caps--sm" type="button" data-next="' + n + '"><span>' + AU.esc(T('next', { step: T('steps.' + n) })) + '</span>' + AU.icon('arrow', { size: 16 }) + '</button>' : '') + '</div>';
    };
    var pane = function (k, inner) {
      return '<div class="bk__pane" role="tabpanel" id="bk-pane-' + k + '" aria-labelledby="bk-tab-' + k + '" data-pane="' + k + '">' +
        '<div class="bk__pin">' + inner + '</div>' + nextBtn(k) + '</div>';
    };
    var html = '';
    html += pane('style', '<div class="bk__opts bk__opts--tiles bk__opts--4" role="radiogroup" aria-labelledby="bk-tab-style">' +
      B.styles.map(function (s, i) {
        return radio('style', s.id, kit.svgIcon(kit.SET_ICONS[s.id] || kit.SET_ICONS.solitaire, 52, 42, '0 0 44 36') + '<span class="bk__ol">' + AU.esc(s.label) + '</span>', 'bk__tile', i);
      }).join('') + '</div>');
    html += pane('metal', '<div class="bk__opts bk__opts--sw" role="radiogroup" aria-labelledby="bk-tab-metal">' +
      B.metals.map(function (m, i) {
        return radio('metal', m.id, '<span class="bk__dot" style="background:' + AU.esc(m.swatch) + '"></span><span class="bk__ol">' + AU.esc(m.label) + '</span>', 'bk__swatch', i);
      }).join('') + '</div>');
    var mains = B.stones.filter(function (s) { return s.group === 'main'; });
    var mores = B.stones.filter(function (s) { return s.group === 'more'; });
    html += pane('stone', '<div class="bk__stones" role="radiogroup" aria-labelledby="bk-tab-stone">' +
      '<div class="bk__sset bk__sset--main is-on" data-bk-mainrow>' + mains.map(function (m, i) {
        return radio('stone', m.id, '<span class="bk__dot bk__dot--gem">' + kit.gemDot(m, 38) + '</span><span class="bk__ol">' + AU.esc(m.label) + '</span>', 'bk__swatch bk__swatch--main', i);
      }).join('') + '</div>' +
      '<div class="bk__sset bk__sset--more" id="bk-more" data-bk-morerow hidden>' + mores.map(function (m, i) {
        return radio('stone', m.id, '<span class="bk__dot bk__dot--gem bk__dot--sm">' + kit.gemDot(m, 28) + '</span><span class="bk__ol">' + AU.esc(m.label) + '</span>', 'bk__swatch bk__swatch--more', i, ' hidden');
      }).join('') + '</div></div>');
    html += pane('cut',
      '<div class="bk__opts bk__opts--tiles bk__opts--5" role="radiogroup" aria-labelledby="bk-tab-cut" data-bk-cuts>' +
      B.cuts.map(function (c, i) {
        return radio('cut', c.id, kit.svgIcon(kit.CUT_ICONS[c.id] || kit.CUT_ICONS.round, 28, 28) + '<span class="bk__ol">' + AU.esc(c.label) + '</span>', 'bk__tile bk__tile--cut', i);
      }).join('') + '</div>' +
      '<div class="bk__cr">' +
        '<div class="bk__carat" data-bk-caratrow>' +
          '<div class="bk__rh"><label class="caps caps--sm" for="bk-carat">' + AU.esc(T('carat')) + '</label><span class="bk__cv" data-bk-cv></span></div>' +
          '<div data-bk-rg></div>' +
        '</div>' +
        '<p class="bk__etern small" id="bk-etern" data-bk-etern>' + AU.esc(T('eternityNote')) + '</p>' +
      '</div>');
    html += pane('size',
      '<div class="bk__size">' +
        '<p class="bk__rh"><span class="caps caps--sm" id="bk-size-l">' + AU.esc(T('sizeLabel')) + '</span>' +
          '<span class="bk__measured caps caps--sm" data-bk-measured hidden>' + AU.icon('check', { size: 14 }) + '<span>' + AU.esc(T('sizeMeasured')) + '</span></span></p>' +
        '<div class="bk__stepper" role="group" aria-labelledby="bk-size-l">' +
          '<button class="bk__sbtn" type="button" data-bk-size="-1" aria-label="' + AU.esc(T('sizeDown')) + '">' + AU.icon('minus', { size: 18 }) + '</button>' +
          '<output class="bk__sval" data-bk-sval aria-live="polite"></output>' +
          '<button class="bk__sbtn" type="button" data-bk-size="1" aria-label="' + AU.esc(T('sizeUp')) + '">' + AU.icon('plus', { size: 18 }) + '</button>' +
        '</div>' +
        '<p class="bk__sizeline small" data-bk-sizeline></p>' +
        '<a class="link caps caps--sm bk__find" href="#/size"><span>' + AU.esc(T('findSize')) + '</span>' + AU.icon('arrow', { size: 16 }) + '</a>' +
      '</div>');
    html += pane('engraving',
      '<div class="bk__eng">' +
        '<div class="bk__rh bk__erow"><label class="caps caps--sm" for="bk-eng">' + AU.esc(T('engravingLabel')) + '</label>' +
          '<div class="bk__fonts" role="radiogroup" aria-label="' + AU.esc(T('engravingFont')) + '">' + B.fonts.map(function (f, i) {
            return '<button type="button" role="radio" class="chip bk__font" data-key="font" data-val="' + f.id + '" aria-checked="false" tabindex="-1" style="--i:' + i + '">' + AU.esc(f.label) + '</button>';
          }).join('') + '</div></div>' +
        '<div class="field bk__field bk__efield">' +
          '<input id="bk-eng" type="text" maxlength="' + ENG + '" autocomplete="off" spellcheck="false" placeholder="' + AU.esc(T('engravingPlaceholder')) + '" aria-describedby="bk-eng-hint">' +
          '<span class="bk__count num" data-bk-count aria-hidden="true"></span>' +
          '<span class="sr-only" id="bk-eng-hint">' + AU.esc(T('engravingHint', { n: ENG })) + '</span>' +
        '</div>' +
        '<div class="bk__engprev" data-bk-engprev aria-hidden="true"></div>' +
      '</div>');
    panesEl.innerHTML = html;

    /* ---------- references ---------- */
    var tabs = AU.$$('[role="tab"]', tabsEl), panes = AU.$$('.bk__pane', panesEl);
    var vEls = {};
    AU.$$('[data-bk-v]', tabsEl).forEach(function (e) { vEls[e.getAttribute('data-bk-v')] = e; });
    var frame = $('[data-bk-frame]'), stageEl = $('[data-bk-stage]'), flatEl = $('[data-bk-flat]');
    var sumEl = $('[data-bk-summary]'), caprEl = $('[data-bk-capr]'), live = $('[data-bk-live]');
    var addBtn = $('[data-bk-add]'), addL = $('[data-bk-addl]'), consult = $('[data-bk-consult]');
    var cutsG = $('[data-bk-cuts]'), caratRow = $('[data-bk-caratrow]'), etern = $('[data-bk-etern]'), cvEl = $('[data-bk-cv]');
    var moreBtn = $('[data-bk-more]'), moreRow = $('[data-bk-morerow]'), mainRow = $('[data-bk-mainrow]');
    var sval = $('[data-bk-sval]'), sizeLine = $('[data-bk-sizeline]'), measuredEl = $('[data-bk-measured]');
    var eng = $('#bk-eng'), count = $('[data-bk-count]'), prev = $('[data-bk-engprev]');
    var hint = $('[data-bk-hint]'), resetBtn = $('[data-bk-reset]'), loupeBtn = $('[data-bk-loupe]');
    var lightBox = $('[data-bk-light]'), lightName = $('[data-bk-lightname]');
    var setPrice = kit.priceTween($('[data-bk-price]'));
    eng.value = spec.engraving || '';
    flatEl.setAttribute('aria-label', T('stageLabel', { summary: summaryText() }));

    /* ---------- tabs: one step open at a time (automatic activation; arrows, Home, End) ---------- */
    var active = null;
    function show(k, focus) {
      if (k === active) return;
      var from = STEPS.indexOf(active), to = STEPS.indexOf(k);
      panesEl.setAttribute('data-dir', from < 0 || to > from ? 'fwd' : 'back');
      active = k;
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-step') === k;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panes.forEach(function (p) {
        var on = p.getAttribute('data-pane') === k;
        p.classList.toggle('is-on', on);
        if (on) { p.removeAttribute('inert'); p.removeAttribute('aria-hidden'); }
        else { p.setAttribute('inert', ''); p.setAttribute('aria-hidden', 'true'); }
      });
      syncRadios();
      // on a phone the tab row scrolls: bring the open tab into view, gently
      var tab = AU.$('#bk-tab-' + k, tabsEl);
      if (tab && tabsEl.scrollWidth > tabsEl.clientWidth + 2) {
        var x = tab.offsetLeft - (tabsEl.clientWidth - tab.offsetWidth) / 2;
        tabsEl.scrollTo({ left: Math.max(0, x), behavior: AU.reduced ? 'auto' : 'smooth' });
      }
      if (k === 'engraving' && studio && typeof studio.showEngraving === 'function' && engr()) { try { studio.showEngraving(); } catch (e) { /* older studio */ } }
    }
    tabsEl.addEventListener('click', function (e) { var t = e.target.closest('[role="tab"]'); if (t) show(t.getAttribute('data-step')); });
    tabsEl.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement), n = -1;
      if (i < 0) return;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n < 0) return;
      e.preventDefault();
      show(tabs[n].getAttribute('data-step'), true);
    });
    panesEl.addEventListener('click', function (e) {
      var nb = e.target.closest('[data-next]');
      if (nb) { show(nb.getAttribute('data-next')); var t = AU.$('#bk-tab-' + nb.getAttribute('data-next'), tabsEl); if (t && e.detail === 0) t.focus(); }
    });

    /* ---------- choices ---------- */
    var groups = AU.$$('[role="radiogroup"]', panesEl).map(function (g) {
      var first = AU.$('[role="radio"]', g);
      return { g: g, r: kit.radios(g, function (val, b) { pick(b.getAttribute('data-key'), val); }), key: first ? first.getAttribute('data-key') : '' };
    });
    function syncRadios() {
      groups.forEach(function (x) { x.r.sync(x.key === 'cut' ? cutOf() : spec[x.key]); });
    }
    function pick(key, val) {
      if (String(spec[key]) === val || (key === 'cut' && isEternity())) return;
      spec[key] = val;
      if (key === 'font') { update({ silent: true }); save(); drawEngraving(true); pushEngraving(0); return; }
      update({ swap: true });
    }

    var caratRg = kit.range(AU.$('[data-bk-rg]', caratRow), {
      id: 'bk-carat', min: cr.min, max: cr.max, step: cr.step, value: spec.carat, ends: [kit.dec(cr.min), kit.dec(cr.max)],
      describedby: 'bk-etern',
      valueText: function (v) { return T('caratValue', { ct: kit.dec(v) }); },
      onInput: function (v) { spec.carat = Math.round(v * 100) / 100; update({ delay: 110 }); }
    });

    root.addEventListener('click', function (e) {
      var sb = e.target.closest('[data-bk-size]');
      if (sb) {
        var i = B.sizes.indexOf(spec.size) + (+sb.getAttribute('data-bk-size'));
        if (i >= 0 && i < B.sizes.length) { spec.size = B.sizes[i]; update({}); sval.classList.remove('is-tick'); void sval.offsetWidth; sval.classList.add('is-tick'); }
      }
    });
    eng.addEventListener('input', function () {
      var v = eng.value.replace(/[\u0000-\u001f]/g, '').slice(0, ENG);
      if (v !== eng.value) eng.value = v;
      spec.engraving = v;
      update({ silent: true });
      save();
      drawEngraving();
      pushEngraving(320);
    });

    /* "More stones": shown when the 3D kit can draw them */
    function setMoreAvail(ok) {
      moreAvail = ok;
      moreBtn.hidden = !ok;
      moreRow.hidden = !ok;
      AU.$$('.bk__swatch--more', moreRow).forEach(function (b) { b.hidden = !ok || !kit.glHas(gl, b.getAttribute('data-val')); });
      if (!ok && kit.stoneById(spec.stone) && kit.stoneById(spec.stone).group === 'more') { spec.stone = 'diamond'; update({ swap: true }); }
      if (ok && stoneHeld !== spec.stone && kit.stoneById(stoneHeld) && kit.glHas(gl, stoneHeld)) { spec.stone = stoneHeld; update({ swap: true }); }
      if (ok && kit.stoneById(spec.stone) && kit.stoneById(spec.stone).group === 'more') setMore(true);
      moreLabel();
    }
    function moreLabel() { moreBtn.innerHTML = '<span>' + AU.esc(T(moreOpen ? 'fewerStones' : 'moreStones')) + '</span>' + AU.icon(moreOpen ? 'arrowLeft' : 'plus', { size: 14 }); }
    /* the four precious stones and the further eight share one place: "More stones" turns from one set to the other */
    function setMore(on) {
      moreOpen = on;
      moreBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
      moreRow.hidden = false;
      [[mainRow, !on], [moreRow, on]].forEach(function (x) {
        x[0].classList.toggle('is-on', x[1]);
        if (x[1]) { x[0].removeAttribute('inert'); x[0].removeAttribute('aria-hidden'); } else { x[0].setAttribute('inert', ''); x[0].setAttribute('aria-hidden', 'true'); }
      });
      syncRadios();
      moreLabel();
    }
    moreBtn.addEventListener('click', function () { setMore(!moreOpen); });
    moreRow.setAttribute('inert', '');

    /* ---------- the engraving preview: the inside of the band, the words following its curve ---------- */
    var FONT_CSS = {
      script: 'font-family:var(--f-script);font-size:40px;letter-spacing:0',
      serif: 'font-family:var(--f-caps);font-style:italic;font-weight:400;font-size:31px;letter-spacing:.02em',
      roman: 'font-family:var(--f-caps);font-weight:500;font-size:22px;letter-spacing:.24em;text-transform:uppercase'
    };
    prev.innerHTML = '<svg class="bk__esvg" viewBox="0 12 640 92" preserveAspectRatio="xMidYMid meet" focusable="false">' +
      '<defs>' +
        '<linearGradient id="bk-e-m" x1="0" y1="0" x2="1" y2="0"><stop data-e="d" offset="0"/><stop data-e="m1" offset=".16"/><stop data-e="m0" offset=".42"/><stop data-e="m2" offset=".55"/><stop data-e="m1" offset=".8"/><stop data-e="d" offset="1"/></linearGradient>' +
        '<linearGradient id="bk-e-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".34"/><stop offset=".22" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".86" stop-color="#000" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>' +
        '<linearGradient id="bk-e-fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".14" stop-color="#fff"/><stop offset=".86" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
        '<mask id="bk-e-mask"><rect y="0" width="640" height="132" fill="url(#bk-e-fade)"/></mask>' +
        '<path id="bk-e-path" d="M50 58Q320 98 590 58"/>' +
      '</defs>' +
      '<g mask="url(#bk-e-mask)">' +
        '<path d="M0 18Q320 58 640 18L640 78Q320 118 0 78Z" fill="url(#bk-e-m)"/>' +
        '<path d="M0 18Q320 58 640 18L640 78Q320 118 0 78Z" fill="url(#bk-e-v)"/>' +
        '<path d="M0 18Q320 58 640 18" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/>' +
        '<path d="M0 78Q320 118 640 78" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1"/>' +
        '<g class="bk__etext" data-bk-etext>' +
          '<text class="bk__elip" dy="1.1" text-anchor="middle"><textPath href="#bk-e-path" startOffset="50%"></textPath></text>' +
          '<text class="bk__ecut" text-anchor="middle"><textPath href="#bk-e-path" startOffset="50%"></textPath></text>' +
        '</g>' +
      '</g></svg>';
    var eStops = AU.$$('stop[data-e]', prev), eG = AU.$('[data-bk-etext]', prev), eTexts = AU.$$('text', prev), ePaths = AU.$$('textPath', prev);
    var lastFont = null;
    function drawEngraving(fontChange) {
      var me = byId(B.metals, spec.metal) || B.metals[0], m = kit.hexes(me.swatch);
      var col = { m0: m[0], m1: m[1], m2: m[2] || m[0], d: kit.shade(m[1], .55) };
      eStops.forEach(function (s) { s.style.stopColor = col[s.getAttribute('data-e')]; });
      var t = engr(), empty = !t;
      var setText = function () {
        ePaths.forEach(function (p) { p.textContent = empty ? T('engravingEmpty') : t; });
        eTexts.forEach(function (x) { x.setAttribute('style', FONT_CSS[spec.font] || FONT_CSS.script); });
        AU.$('.bk__ecut', prev).style.fill = kit.shade(m[1], .38);
        eG.classList.toggle('is-empty', empty);
      };
      if (fontChange && lastFont && lastFont !== spec.font && !AU.reduced) {
        eG.classList.add('is-out');
        setTimeout(function () { setText(); eG.classList.remove('is-out'); }, 220);
      } else setText();
      lastFont = spec.font;
    }

    /* ---------- light switch ---------- */
    lightBox.setAttribute('role', 'radiogroup');
    lightBox.setAttribute('aria-label', T('light'));
    lightBox.insertAdjacentHTML('afterbegin', B.lights.map(function (l) {
      return '<button type="button" role="radio" class="bk__lbtn" data-val="' + l.id + '" aria-checked="false" tabindex="-1" aria-label="' + AU.esc(l.label) + '" title="' + AU.esc(l.label) + '">' + kit.svgIcon(kit.LIGHT_ICONS[l.id], 18) + '</button>';
    }).join(''));
    var light = AU.store.get('bespokeLight', 'studio');
    if (!byId(B.lights, light)) light = 'studio';
    var lightR = kit.radios(lightBox, function (v) { setLight(v); });
    function setLight(v) {
      light = v;
      frame.setAttribute('data-light', v);
      lightR.sync(v);
      lightName.textContent = label(B.lights, v);
      if (typeof hintFit === 'function') hintFit();
      AU.store.set('bespokeLight', v);
      if (studio && typeof studio.setLight === 'function') { try { studio.setLight(v); } catch (e) { console.error(e); } }
    }
    setLight(light);

    /* ---------- loupe and reset ---------- */
    loupeBtn.innerHTML = kit.svgIcon(kit.LOUPE_ICON, 20);
    // one fixed name; aria-pressed alone carries on / off (a name that changed too would be announced twice)
    loupeBtn.setAttribute('aria-label', T('loupe'));
    loupeBtn.title = T('loupe');
    var loupeOn = false;
    function setLoupe(on) {
      loupeOn = on;
      loupeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      frame.classList.toggle('is-loupe', on);
      stageEl.setAttribute('data-cursor', on ? 'loupe' : 'drag');
      if (studio && typeof studio.loupe === 'function') { try { studio.loupe(on, { zoom: 4 }); } catch (e) { console.error(e); } }
      if (on) hideHint();
    }
    loupeBtn.addEventListener('click', function () { setLoupe(!loupeOn); });
    frame.addEventListener('keydown', function (e) { if (e.key === 'Escape' && loupeOn) { e.stopPropagation(); setLoupe(false); loupeBtn.focus(); } });
    resetBtn.setAttribute('aria-label', T('reset')); resetBtn.title = T('reset');
    resetBtn.addEventListener('click', function () { if (studio && studio.resetView) studio.resetView(); });
    var hideHint = function () { hint.classList.add('is-gone'); };
    stageEl.addEventListener('pointerdown', hideHint, { once: true });
    /* the hint shares the stage's foot with the light switch and its name: where the two would meet (a narrow stage, a
       longer language: 'Faites glisser pour tourner' beside 'Bougie'), the hint gives way. It keeps its place in the
       layout while hidden, so it can be measured again when the stage widens or the light's name changes. */
    var hintFit = function () {
      if (leaving || hint.hidden || !hint.isConnected) return;
      var a = lightBox.getBoundingClientRect(), b = hint.getBoundingClientRect();
      hint.classList.toggle('is-tight', !!b.width && a.right + 24 > b.left);
    };
    var hintRO = window.ResizeObserver ? new ResizeObserver(hintFit) : null;
    if (hintRO) hintRO.observe(frame);

    /* ---------- the stage: flat drawing now, the live studio once the page has settled ---------- */
    /* integrator: where WebGL exists, the studio takes the stage about a second after the page lands. Painting the
       drawing first cost one ~120 ms GPU frame (its gradients, clip-path and sheen rasterised for the first time)
       right inside the page change. The drawing is now painted only when 3D will not come: no WebGL, no engine or
       studio, or no studio after 4.5 s. Until then the stage shows its own soft light, and the studio fades in. */
    var flatReal = kit.Illustration(flatEl), flatOn = !AU.hasWebGL, flatLast = null, flatT = 0;
    var showFlat = function () {
      if (flatOn || leaving) return;
      flatOn = true;
      if (!AU.reduced) { flatEl.style.opacity = '0'; requestAnimationFrame(function () { requestAnimationFrame(function () { flatEl.style.opacity = ''; }); }); }
      if (flatLast) flatReal.set(flatLast);
    };
    /* the design's catalogue still (when one is pre-rendered: the house solitaire, the default design) is shown at once
       instead; the studio then opens on exactly that view (matchStill), so the picture turns live without a seam.
       Any other design gets the drawing once the page change has landed. */
    var stillEl = document.createElement('div');
    stillEl.className = 'bk__still'; stillEl.setAttribute('aria-hidden', 'true');
    flatEl.parentNode.insertBefore(stillEl, flatEl.nextSibling);
    var stillKey = null;
    var hasStill = function (s) { var k = s && AU.assetKey ? AU.assetKey(s, 'still', 960, AU.getMode()) : null; return k && AU.assets && AU.assets[k] ? k : null; };
    var showStill = function (s) {
      var k = hasStill(s);
      if (!k) return false;
      stillKey = k;
      AU.img(s, { size: 960 }).then(function (url) {
        if (leaving || stillKey !== k || !url) return;
        var img = new Image(); img.decoding = 'async'; img.alt = ''; img.src = url;
        (img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(function () {
          if (leaving || stillKey !== k) return;
          stillEl.textContent = ''; stillEl.appendChild(img);
          requestAnimationFrame(function () { stillEl.classList.add('is-on'); });
        });
      });
      return true;
    };
    var flatSoon = function () {
      // after the page change has landed (its first paint is costly), and only if 3D has not arrived meanwhile
      var go = function () { requestAnimationFrame(function () { if (!frame.classList.contains('is-gl')) showFlat(); }); };
      if (el.isConnected && !document.documentElement.classList.contains('vt-on')) { setTimeout(go, 60); return; }
      var off = AU.on('route', function () { off(); go(); });
      ctx.onLeave(off);
    };
    var flat = { set: function (s) {
      flatLast = s;
      // a change before the studio has come: the still no longer shows this design
      if (stillKey && hasStill(s) !== stillKey) { stillKey = null; stillEl.classList.remove('is-on'); if (!frame.classList.contains('is-gl')) flatSoon(); }
      if (flatOn) flatReal.set(s);
    } };
    var offStillMode = AU.on('mode', function () { if (stillKey && !frame.classList.contains('is-gl')) showStill(flatLast); });
    ctx.onLeave(offStillMode);
    var specT = 0, engT = 0;
    function save() {
      AU.store.set('bespoke', { style: spec.style, metal: spec.metal, stone: spec.stone, cut: spec.cut, carat: spec.carat, size: spec.size, engraving: spec.engraving || '', font: spec.font });
      syncUrl();
    }
    /* the address is the design: a reload or a shared link brings back exactly this ring (never a stale preset).
       The inscription stays private (it is kept on this device only). */
    function syncUrl() {
      if (leaving) return;
      kit.setQuery({ style: spec.style, metal: spec.metal, stone: spec.stone, cut: isEternity() ? null : spec.cut,
        carat: isEternity() ? null : spec.carat.toFixed(2), size: spec.size, step: null }, 'bespoke');
    }
    function pushSpec(delay) {
      clearTimeout(specT);
      var go = function () {
        if (leaving) return;
        var s = glSpec();
        flat.set(s);
        if (studio) { try { studio.setSpec(s); } catch (e) { console.error(e); } }
        AU.emit('bespoke:set', s);
        save();
      };
      if (delay) specT = setTimeout(go, delay); else go();
    }
    function pushEngraving(delay) {
      clearTimeout(engT);
      engT = setTimeout(function () {
        if (leaving || !studio) return;
        if (typeof studio.setEngraving === 'function') { try { studio.setEngraving(engr(), spec.font); } catch (e) { console.error(e); } }
        else pushSpec(0);
      }, delay || 0);
    }

    /* ---------- reflect the state into the page ---------- */
    var lastSum = '', liveT = 0;
    function update(opts) {
      opts = opts || {};
      syncRadios();
      var et = isEternity();
      cutsG.classList.toggle('is-off', et);
      if (et) cutsG.setAttribute('aria-disabled', 'true'); else cutsG.removeAttribute('aria-disabled');
      caratRow.classList.toggle('is-off', et);
      caratRg.disable(et);
      caratRg.set(spec.carat);
      etern.classList.toggle('is-on', et);
      cvEl.innerHTML = et ? AU.esc(T('allAround')) : '<span class="num">' + ctWord() + '<small> ' + AU.esc(T('ct')) + '</small></span>';
      // tab values
      vEls.style.textContent = label(B.styles, spec.style);
      vEls.metal.textContent = label(B.metals, spec.metal);
      vEls.stone.textContent = stone().label;
      vEls.cut.innerHTML = et ? AU.esc(T('eternityCut')) : AU.esc(label(B.cuts, cutOf())) + ' · <span class="num">' + ctWord() + '</span>';
      vEls.size.innerHTML = AU.nums(T('sizeUS', { n: kit.sizeWord(spec.size) }));
      vEls.engraving.innerHTML = engr() ? '“' + AU.nums(engr()) + '”' : AU.esc(T('engravingNone'));
      // size
      var row = kit.sizeRow(spec.size);
      sval.innerHTML = '<span class="num">' + AU.esc(kit.sizeWord(spec.size)) + '</span>';
      sval.setAttribute('aria-label', T('sizeUS', { n: kit.sizeWord(spec.size) }));
      sizeLine.innerHTML = row ? AU.nums(T('sizeLine', { uk: row.uk, eu: row.eu, mm: kit.dec(row.d, 1) })) : '';
      measuredEl.hidden = !(kit.ringSize() && kit.ringSize() === spec.size);
      AU.$$('[data-bk-size]', root).forEach(function (b) {
        var i = B.sizes.indexOf(spec.size) + (+b.getAttribute('data-bk-size'));
        b.disabled = i < 0 || i >= B.sizes.length;
      });
      // engraving counter
      var len = (spec.engraving || '').length;
      count.textContent = len + ' / ' + ENG;
      count.classList.toggle('is-full', len >= ENG);
      // caption
      var sum = summaryText();
      if (sum !== lastSum) {
        sumEl.innerHTML = kit.parts(sum);
        if (lastSum && opts.swap && !AU.reduced) { sumEl.classList.remove('is-swap'); void sumEl.offsetWidth; sumEl.classList.add('is-swap'); }
        lastSum = sum;
      }
      var e = engr();
      caprEl.innerHTML = AU.nums(T('caption', { size: kit.sizeWord(spec.size) })) + (e ? ' · <span class="bk__engr">“' + AU.esc(e) + '”</span>' : '');
      var lab = T('stageLabel', { summary: sum });
      flatEl.setAttribute('aria-label', lab);
      if (studio && studio.canvas) studio.canvas.setAttribute('aria-label', lab);
      // price and the consultation link
      var price = B.price(spec);
      setPrice(price);
      var notes = T('consultNotes', { summary: sum, size: kit.sizeWord(spec.size), engraving: e ? T('consultEngraving', { text: e }) : '', price: AU.fmt(price) });
      consult.setAttribute('href', '#/visit?reason=bespoke&notes=' + encodeURIComponent(notes));
      clearTimeout(liveT);
      liveT = setTimeout(function () { live.textContent = T('liveEstimate', { summary: sum, price: AU.fmt(price) }); }, 800);
      if (!opts.silent) { pushSpec(opts.delay || 0); drawEngraving(); }
    }

    /* ---------- actions ---------- */
    var addT = 0;
    addBtn.addEventListener('click', function () {
      var name = T('ringName', { style: label(B.styles, spec.style) });
      var e = engr();
      var meta = T('cartMeta', { metal: label(B.metals, spec.metal), stone: stoneText(), size: kit.sizeWord(spec.size) }) + (e ? T('cartEngraved', { text: e }) : '');
      var s = glSpec(); s.engraving = e; s.engravingFont = spec.font;
      kit.addToBag({ id: 'bespoke-' + hash(), name: name, price: B.price(spec), qty: 1, spec: s, meta: meta }, addBtn, T('addedToast', { name: name }));
      addL.textContent = T('added');
      addBtn.classList.add('is-done');
      clearTimeout(addT);
      addT = setTimeout(function () { addL.textContent = T('add'); addBtn.classList.remove('is-done'); }, 2400);
    });

    update({ silent: true });
    drawEngraving();
    flat.set(glSpec());
    show(STEPS.indexOf(ctx.query && ctx.query.step) >= 0 ? ctx.query.step : 'style');
    // once this page is the open one, its address carries the whole design (presets become the design itself)
    var offUrl = AU.on('route', function (d) { if (d && d.name === 'bespoke') { offUrl(); syncUrl(); } });
    ctx.onLeave(offUrl);

    /* the 3D kit decides which extra stones are offered */
    AU.gl.then(function (g) {
      if (leaving) return;
      gl = g;
      var any = mores.some(function (m) { return kit.glHas(g, m.id); });
      setMoreAvail(any);
    });
    /* the drawing stands in only when the studio will not come (see showFlat), or while it loads for a design that
       has no pre-rendered still */
    if (!flatOn) {
      if (!showStill(flatLast)) flatSoon();
      AU.gl.then(function (g) { if (!g || typeof g.studio !== 'function') { stillKey = null; stillEl.classList.remove('is-on'); showFlat(); } });
      flatT = setTimeout(function () { if (!frame.classList.contains('is-gl')) showFlat(); }, 4500);
    }
    /* the studio: created once the page has settled, revealed once its first frame is drawn */
    kit.settled(el, ctx).then(function () { return AU.gl; }).then(function (g) {
      if (leaving || !g || typeof g.studio !== 'function') return;
      // matchStill: the studio opens on the view of the catalogue still (.bk__still: 86% of the frame's height, at most
      // 94% of its width), the same three-quarter view as every picture on the site (integrator)
      try { studio = g.studio(stageEl, { spec: glSpec(), label: T('stageLabel', { summary: summaryText() }), matchStill: { h: 0.86, w: 0.94 } }); }
      catch (e) { console.error(e); studio = null; showFlat(); return; }
      if (!studio) { showFlat(); return; }
      if (typeof studio.setEngraving === 'function' && engr()) { try { studio.setEngraving(engr(), spec.font); } catch (e) { console.error(e); } }
      if (typeof studio.setLight === 'function') { try { studio.setLight(light); } catch (e) { console.error(e); } }
      Promise.resolve(studio.ready).catch(function () {}).then(function () {
        if (leaving) return;
        requestAnimationFrame(function () {
          frame.classList.add('is-gl');
          flatEl.removeAttribute('role'); flatEl.removeAttribute('aria-label'); flatEl.setAttribute('aria-hidden', 'true');
          resetBtn.hidden = false;
          loupeBtn.hidden = typeof studio.loupe !== 'function';
          hint.hidden = false;
          hintFit();
          setTimeout(function () { if (!leaving) hint.classList.add('is-on'); }, 400);
          if (loupeOn) setLoupe(true);
        });
      });
    });

    open = {
      spec: function () { return glSpec(); },
      set: function (s) {
        if (!s) return;
        if (byId(B.styles, s.style)) spec.style = s.style;
        if (byId(B.metals, s.metal)) spec.metal = s.metal;
        if (kit.stoneById(s.stone) && kit.stoneById(s.stone).group !== 'lab') spec.stone = s.stone;
        if (byId(B.cuts, s.cut)) spec.cut = s.cut;
        if (+s.carat >= cr.min && +s.carat <= cr.max) spec.carat = +s.carat;
        update({ swap: true });
      }
    };
    AU.reveal(root);

    return function () {
      leaving = true;
      clearTimeout(specT); clearTimeout(engT); clearTimeout(liveT); clearTimeout(addT); clearTimeout(flatT);
      if (hintRO) hintRO.disconnect();
      if (studio) { try { studio.dispose(); } catch (e) { console.error(e); } studio = null; }
      open = null;
    };
  }

  AU.bespoke.spec = function () { return open ? open.spec() : null; };
  AU.bespoke.set = function (s) { if (open) open.set(s); };

  AU.ready(function () {
    if (!AU.router) return;
    AU.router.add('/bespoke', {
      name: 'bespoke',
      title: function () { return T('meta.bespoke.title'); },
      description: function () { return T('meta.bespoke.description'); },
      jsonld: function () {
        return { '@context': 'https://schema.org', '@type': 'WebPage', name: T('meta.bespoke.title'), description: T('meta.bespoke.description'),
          isPartOf: { '@type': 'WebSite', name: (AU.content.brand && AU.content.brand.name) || 'Aurelia' } };
      },
      render: render
    });
  });
})();
