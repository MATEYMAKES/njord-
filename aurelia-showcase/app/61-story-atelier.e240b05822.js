/* ---- 61-story-atelier.js ---- */
/* Story: the atelier page ('/atelier').
   1. the head (eyebrow, "Handcrafted since" + the year in Cormorant Infant, lede, chapter links, the four stats)
   2. #forge    molten gold, a pinned scene scrubbed by scroll: AUGL.forge(container).setProgress(p), or a drawn
                fallback (grains, crucible, pour, a mould that fills and cools into a ring)
   3. #process  the four steps, with the ring that draws itself beside them (v1, improved)
   4. #years    the timeline 1984 → today: pinned and moved sideways by vertical scroll on a desktop; a swipeable
                strip on touch, at narrow widths and with reduced motion
   5. #voices   testimonials (carousel) and the four promises; then two doors onward
   A quiet chapter rail follows the reader on wide screens. AU.sound.ambient('atelier') plays while the page is open. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.storyKit) return;
  var K = AU.storyKit;

  var SVGNS = 'http://www.w3.org/2000/svg';
  var c01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var seg = function (v, a, b) { return c01((v - a) / (b - a)); };
  var smooth = function (t) { return t * t * (3 - 2 * t); };
  var f1 = function (v) { return Math.round(v * 10) / 10; };
  var T = function (p, v) { return K.t('atelier.' + p, v); };

  /* colour helpers for the drawn molten gold (the metal itself, not UI) */
  var hex = function (h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  var mixA = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  var css = function (c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; };
  var mix = function (a, b, t) { return css(mixA(a, b, t)); };
  var ramp = function (stops, t) {   // stops: [[pos, rgb], ...] -> rgb
    t = c01(t);
    for (var i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mixA(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0] || 1));
    return stops[stops.length - 1][1];
  };

  /* =====================================================================================================
     1. HEAD + STATS
     ===================================================================================================== */
  /* the chapters are a quiet two-by-two index under the lede (one ruled band only on the page head: the stats) */
  function headHTML() {
    var C = AU.content, B = C.brand || {};
    var ch = T('chapters') || [];
    var ids = ['forge', 'process', 'years', 'voices'];
    var toc = '<nav class="atl__toc" aria-label="' + AU.esc(K.t('common.chapters')) + '"><ol>' + ids.map(function (id, i) {
      return '<li><a class="atl__tocl caps caps--sm" href="#' + id + '">' + AU.esc(ch[i] || '') + '</a></li>';
    }).join('') + '</ol></nav>';
    return K.head({
      cls: 'atl__head',
      eyebrow: T('eyebrow'),
      titleHTML: AU.esc(T('titleLead')) + ' <span class="num sp-year">' + AU.esc(B.since || 1984) + '</span>',
      extra: '<div class="atl__side"><p class="lede sp-head__lede">' + AU.nums(T('lede')) + '</p>' + toc + '</div>'
    }) + statsHTML();
  }

  function statsHTML() {
    var data = (AU.content.atelier && AU.content.atelier.stats) || [];
    if (!data.length) return '';
    return '<div class="atl__statsband wrap"><dl class="atl__stats" data-stagger="110">' + data.map(function (s) {
      var m = /^(\d+)(.*)$/.exec(String(s.value)) || [null, '', String(s.value)];
      var n = +m[1] || 0, count = !!m[1] && n < 1000;
      return '<div class="atl__stat" data-reveal="fade"' + (count ? ' data-count="' + n + '"' : '') + '>' +
        '<dt class="atl__lab caps caps--sm">' + AU.nums(s.label) + '</dt>' +
        '<dd class="atl__val" aria-label="' + AU.esc(s.value) + '"><span class="atl__mask" aria-hidden="true"><span class="atl__rise">' +
          (m[1] ? '<span class="atl__nbox"><span class="atl__ghost num">' + n + '</span><span class="num" data-n>' + n + '</span></span>' +
            (m[2] ? '<span class="atl__suf">' + AU.esc(m[2]) + '</span>' : '')
            : '<span class="num">' + AU.esc(s.value) + '</span>') +
        '</span></span></dd></div>';
    }).join('') + '</dl></div>';
  }

  /* counters: quantities count up once as they arrive (a year never counts: it simply rises) */
  function initStats(root, signal) {
    var stats = AU.$$('.atl__stat[data-count]', root);
    if (!stats.length || AU.reduced) return;
    var off = AU.on('revealed', function (el) {
      if (stats.indexOf(el) < 0 || el.__counted) return;
      el.__counted = true;
      var n = +el.getAttribute('data-count'), out = AU.$('[data-n]', el);
      var delay = (parseFloat(el.style.getPropertyValue('--d')) || 0) * 1000 + 160, t0 = performance.now() + delay;
      out.textContent = '0';
      var stop = AU.tick(function () {
        var t = c01((performance.now() - t0) / 1400);
        out.textContent = Math.round(n * (1 - Math.pow(1 - t, 3)));
        if (t >= 1) stop();
      });
    });
    signal.addEventListener('abort', off);
  }

  /* =====================================================================================================
     2. MOLTEN GOLD
     ===================================================================================================== */
  function forgeHTML() {
    var ph = T('forge.phases') || [];
    return '<section id="forge" class="fg" aria-labelledby="fg-title">' +
      '<div class="fg__pin">' +
        '<div class="fg__stage" data-fg-stage role="img" aria-label="' + AU.esc(T('forge.label')) + '"></div>' +
        '<div class="fg__veil" aria-hidden="true"></div>' +
        '<div class="fg__copy wrap">' +
          '<div class="fg__intro">' +
            '<p class="eyebrow caps" data-reveal="fade">' + AU.nums(T('forge.eyebrow')) + '</p>' +
            '<h2 id="fg-title" class="script t-h2 fg__title" data-reveal="words">' + AU.nums(T('forge.title')) + '</h2>' +
          '</div>' +
          '<ol class="fg__phases" data-fg-phases>' + ph.map(function (p, i) {
            return '<li class="fg__phase' + (i === 0 ? ' is-on' : '') + '" data-i="' + i + '">' +
              '<span class="fg__pn num" aria-hidden="true">' + K.pad2(i + 1) + '</span>' +
              '<h3 class="fg__pt caps caps--lg">' + AU.nums(p.title) + '</h3>' +
              '<p class="fg__px body">' + AU.nums(p.text) + '</p></li>';
          }).join('') + '</ol>' +
          '<div class="fg__meter" aria-hidden="true">' +
            '<p class="fg__temp"><span class="caps caps--sm fg__tl">' + AU.nums(T('forge.tempLabel')) + '</span>' +
              '<span class="fg__deg"><span class="num" data-fg-deg></span><span class="fg__unit">' + AU.esc(T('forge.unit')) + '</span></span></p>' +
            '<div class="fg__segs">' + ph.map(function () { return '<span class="fg__seg"><i></i></span>'; }).join('') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  /* The drawn fallback (no WebGL, or no forge scene yet). viewBox 600 x 640.
     Mould: an annulus centred (300, 400), outer r 132, inner r 112. Crucible above, at the left; it tips to pour. */
  function forgeSVG() {
    var CX = 300, CY = 404, RO = 132, RI = 110;
    var ann = 'M' + (CX - RO) + ' ' + CY + 'a' + RO + ' ' + RO + ' 0 1 0 ' + 2 * RO + ' 0a' + RO + ' ' + RO + ' 0 1 0 ' + (-2 * RO) + ' 0Z' +
              'M' + (CX - RI) + ' ' + CY + 'a' + RI + ' ' + RI + ' 0 1 0 ' + 2 * RI + ' 0a' + RI + ' ' + RI + ' 0 1 0 ' + (-2 * RI) + ' 0Z';
    var grains = '';
    var gp = [[-26, 2, 6], [-12, -4, 7], [3, 3, 6.5], [17, -2, 7], [29, 4, 5.5], [-18, 9, 5], [10, 10, 5.5], [-3, -10, 5]];
    gp.forEach(function (g, i) {
      grains += '<circle class="fgs-grain" data-grain="' + i + '" cx="' + (196 + g[0]) + '" cy="' + (150 + g[1]) + '" r="' + g[2] + '"/>';
    });
    var star4 = function (x, y, r) {
      var q = r * .14;
      return 'M' + x + ' ' + (y - r) + 'Q' + (x + q) + ' ' + (y - q) + ' ' + (x + r) + ' ' + y + 'Q' + (x + q) + ' ' + (y + q) + ' ' + x + ' ' + (y + r) +
        'Q' + (x - q) + ' ' + (y + q) + ' ' + (x - r) + ' ' + y + 'Q' + (x - q) + ' ' + (y - q) + ' ' + x + ' ' + (y - r) + 'Z';
    };
    return '<svg class="fgs" viewBox="0 0 600 640" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<radialGradient id="fgs-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb867" stop-opacity=".9"/><stop offset=".45" stop-color="#ff8a3d" stop-opacity=".28"/><stop offset="1" stop-color="#ff7a2e" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="fgs-metal" x1="0" y1="0" x2="1" y2="1"><stop data-m="0" offset="0"/><stop data-m="1" offset=".45"/><stop data-m="2" offset=".7"/><stop data-m="1" offset="1"/></linearGradient>' +
        '<linearGradient id="fgs-stream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4d6"/><stop offset=".5" stop-color="#ffc66b"/><stop offset="1" stop-color="#ff9a4a"/></linearGradient>' +
        '<linearGradient id="fgs-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
        '<radialGradient id="fgs-tube" gradientUnits="userSpaceOnUse" cx="' + CX + '" cy="' + CY + '" r="' + RO + '">' +
          '<stop offset="' + (RI / RO).toFixed(3) + '" stop-color="#5a3608" stop-opacity=".55"/>' +
          '<stop offset="' + ((RI / RO) + .05).toFixed(3) + '" stop-color="#5a3608" stop-opacity=".08"/>' +
          '<stop offset=".93" stop-color="#fff6dc" stop-opacity=".18"/>' +
          '<stop offset="1" stop-color="#4a2a05" stop-opacity=".6"/></radialGradient>' +
        '<linearGradient id="fgs-lite" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".32" stop-color="#fff" stop-opacity="0"/><stop offset=".72" stop-color="#3a2004" stop-opacity="0"/><stop offset="1" stop-color="#3a2004" stop-opacity=".3"/></linearGradient>' +
        /* the glow of the hot band: a ring-shaped gradient (no SVG filter: a blur would be re-rasterised on every frame) */
        '<radialGradient id="fgs-ringglow" gradientUnits="userSpaceOnUse" cx="' + CX + '" cy="' + CY + '" r="' + (RO + 30) + '">' +
          '<stop offset="' + ((RI - 30) / (RO + 30)).toFixed(3) + '" stop-color="#ffb05a" stop-opacity="0"/>' +
          '<stop offset="' + ((RI - 4) / (RO + 30)).toFixed(3) + '" stop-color="#ffb05a" stop-opacity=".55"/>' +
          '<stop offset="' + (((RI + RO) / 2) / (RO + 30)).toFixed(3) + '" stop-color="#ffc77a" stop-opacity=".9"/>' +
          '<stop offset="' + ((RO + 4) / (RO + 30)).toFixed(3) + '" stop-color="#ffb05a" stop-opacity=".55"/>' +
          '<stop offset="1" stop-color="#ffb05a" stop-opacity="0"/></radialGradient>' +
        '<clipPath id="fgs-ann"><path d="' + ann + '" clip-rule="evenodd"/></clipPath>' +
        '<clipPath id="fgs-pot"><path d="M160 136 L232 136 L226 196 Q196 206 166 196 Z"/></clipPath>' +
      '</defs>' +
      '<circle class="fgs-halo" data-pothalo cx="196" cy="168" r="150" fill="url(#fgs-glow)" opacity="0"/>' +
      '<circle class="fgs-halo" data-halo cx="' + CX + '" cy="' + CY + '" r="250" fill="url(#fgs-glow)" opacity="0"/>' +
      /* the mould (line art), its fill rising from the bottom, the glow of the hot metal */
      '<g clip-path="url(#fgs-ann)">' +
        '<rect data-fill x="' + (CX - RO - 4) + '" y="' + (CY + RO) + '" width="' + (2 * RO + 8) + '" height="' + (2 * RO + 8) + '" fill="url(#fgs-metal)"/>' +
        /* once cool, the band reads as a rounded, polished tube: darker at both edges, a highlight along the crown */
        '<circle data-shade cx="' + CX + '" cy="' + CY + '" r="' + RO + '" fill="url(#fgs-tube)" opacity="0"/>' +
        '<circle data-shade cx="' + CX + '" cy="' + CY + '" r="' + RO + '" fill="url(#fgs-lite)" opacity="0"/>' +
        '<rect data-sheen x="-140" y="' + (CY - RO - 20) + '" width="110" height="' + (2 * RO + 40) + '" fill="url(#fgs-sheen)" opacity="0" transform="skewX(-16)"/>' +
      '</g>' +
      '<circle data-glowring cx="' + CX + '" cy="' + CY + '" r="' + (RO + 30) + '" fill="url(#fgs-ringglow)" opacity="0"/>' +
      '<path class="fgs-line" d="' + ann + '" fill="none" fill-rule="evenodd"/>' +
      '<circle class="fgs-guide" cx="' + CX + '" cy="' + CY + '" r="' + (RO + 18) + '" pathLength="1" data-guide/>' +
      /* the pour */
      '<path data-stream class="fgs-stream" d="M246 196 C 262 232 288 250 296 ' + (CY - RO + 2) + '" pathLength="1"/>' +
      /* the crucible: tips around its lip to pour */
      '<g data-pot class="fgs-pot">' +
        '<g clip-path="url(#fgs-pot)"><rect data-melt x="150" y="150" width="96" height="60" fill="url(#fgs-stream)" opacity="0"/></g>' +
        grains +
        '<path class="fgs-line" d="M154 132 L238 132 M160 136 L232 136 L226 196 Q196 206 166 196 Z"/>' +
        '<path class="fgs-fine" d="M232 136 L246 130"/>' +
      '</g>' +
      '<path class="fgs-glint" data-glint="0" d="' + star4(222, 300, 13) + '"/>' +
      '<path class="fgs-glint" data-glint="1" d="' + star4(398, 470, 8) + '"/>' +
      '<path class="fgs-glint" data-glint="2" d="' + star4(190, 470, 6) + '"/>' +
    '</svg>';
  }

  /* ONE timeline for the words, the readout and both scenes. The 3D scene (gl-scenes-b) publishes its own phases
     (forge.phases: pour 0–.35, cool .35–.7, reveal .7–1); the four captions sit on them:
       01 melted   0 → the head of the stream (the crucible glows and begins to tip)
       02 poured   → the end of the pour
       03 cooled   → the end of the cooling (white heat, orange, dull red, then gold)
       04 finished → 1 (the mould opens, the ring rises and is polished)
     The drawn fallback is re-timed onto the same marks. */
  var BOUNDS = [0, 0.098, 0.35, 0.7, 1];
  function boundsFrom(phases) {
    try {
      if (phases && phases.length >= 2 && phases[0].to > 0 && phases[1].to > phases[0].to && phases[1].to < 1) {
        var a = +phases[0].from || 0, b = +phases[0].to, c = +phases[1].to;
        return [0, a + (b - a) * 0.28, b, c, 1];
      }
    } catch (e) {}
    return BOUNDS.slice();
  }
  /* the drawn scene's own clock (q: 0 grains land · .25 melt · .5 tip and pour · .75 cool, sheen, glints) read
     from the shared timeline */
  function flatQ(p, B) {
    if (p < B[1]) return 0.42 + 0.08 * seg(p, 0, B[1]);
    if (p < B[2]) return 0.5 + 0.25 * seg(p, B[1], B[2]);
    if (p < B[3]) return 0.75 + 0.1875 * seg(p, B[2], B[3]);
    return 0.9375 + 0.0625 * seg(p, B[3], 1);
  }

  /* The drawn scene, as a function of its clock q (0..1): four quarters.
     0 grains fall into the crucible · 1 they melt and glow · 2 the crucible tips, the stream fills the mould
     3 the ring cools from white heat to gold, a sheen crosses it, three glints */
  function FlatForge(box) {
    box.innerHTML = forgeSVG();
    var svg = box.firstChild;
    var $ = function (s) { return svg.querySelector(s); };
    var grains = AU.$$('[data-grain]', svg), fill = $('[data-fill]'), sheen = $('[data-sheen]'), glowRing = $('[data-glowring]');
    var halo = $('[data-halo]'), potHalo = $('[data-pothalo]'), shades = AU.$$('[data-shade]', svg);
    var stream = $('[data-stream]'), pot = $('[data-pot]'), melt = $('[data-melt]'), guide = $('[data-guide]');
    var mStops = AU.$$('#fgs-metal stop', svg), glints = AU.$$('[data-glint]', svg);
    var HOT = [[0, hex('#fff7e2')], [.35, hex('#ffd27a')], [.7, hex('#ff9b45')], [1, hex('#e07a2a')]];
    var GOLD = [hex('#f6dc9c'), hex('#c9993f'), hex('#f3d58b')];
    var GOLD_HOT = [hex('#fff2c4'), hex('#ffb25a'), hex('#ffd98a')];
    var last = -1;
    return {
      setProgress: function (p) {
        if (Math.abs(p - last) < 0.0003) return; last = p;
        var P0 = seg(p, 0, .25), P1 = seg(p, .25, .5), P2 = seg(p, .5, .75), P3 = seg(p, .75, 1);
        // 0: grains drop in one after another, then 1: melt away into the pool
        grains.forEach(function (g, i) {
          var d = smooth(seg(P0, i * .08, .3 + i * .08));
          var m = smooth(seg(P1, .1 + i * .04, .55 + i * .04));
          g.setAttribute('transform', 'translate(0 ' + f1((1 - d) * -120) + ')');
          g.style.opacity = (d * (1 - m)).toFixed(3);
          g.style.fill = mix(GOLD[0], hex('#ffe3a0'), m);
        });
        var heat = smooth(seg(P1, .15, .8)) * (1 - smooth(seg(P3, 0, .9)));
        var level = smooth(seg(P2, .25, .9));
        melt.setAttribute('opacity', (smooth(seg(P1, .2, .7)) * (1 - smooth(seg(P2, .3, .8)))).toFixed(3));
        melt.setAttribute('y', f1(150 + 40 * smooth(seg(P2, .1, .8))));
        // the light of the hot metal moves with it: first the crucible, then the mould
        potHalo.setAttribute('opacity', (heat * .9 * (1 - smooth(seg(P2, .2, .7)))).toFixed(3));
        halo.setAttribute('opacity', (heat * .85 * level).toFixed(3));
        // 2: tip, pour, fill
        var tip = smooth(seg(P2, 0, .25)) * (1 - smooth(seg(P2, .82, 1)));
        pot.setAttribute('transform', 'rotate(' + f1(-34 * tip) + ' 238 136) translate(' + f1(24 * tip) + ' ' + f1(-6 * tip) + ')');
        var sIn = smooth(seg(P2, .15, .35)), sOut = smooth(seg(P2, .78, .96));
        stream.style.strokeDasharray = '1 1';
        stream.style.strokeDashoffset = (sOut > 0 ? -sOut : Math.min(.995, 1 - sIn)).toFixed(4);
        // (an invisible floor keeps the stream's gradient prepared, so its first appearance costs no frame)
        stream.style.opacity = sIn > 0 && sOut < 1 ? '1' : '.004';
        fill.setAttribute('y', f1(404 + 132 - level * 268 - (p >= .75 ? 4 : 0)));
        // colour: white-hot while pouring, cooling to gold in 3
        var cool = smooth(seg(P3, .05, .85));
        var hotC = ramp(HOT, .15 + .35 * P2);
        mStops.forEach(function (st) {
          var k = +st.getAttribute('data-m');
          // white heat -> each stop's own hot tint -> polished gold
          var c = cool < .35 ? mixA(hotC, GOLD_HOT[k], cool / .35) : mixA(GOLD_HOT[k], GOLD[k], (cool - .35) / .65);
          st.setAttribute('stop-color', css(c));
        });
        glowRing.setAttribute('opacity', (level * (1 - cool) * .9).toFixed(3));
        shades.forEach(function (s) { s.setAttribute('opacity', smooth(seg(P3, .2, .9)).toFixed(3)); });
        guide.style.strokeDashoffset = (1 - smooth(seg(p, 0, .3))).toFixed(4);
        guide.style.opacity = (.5 * (1 - smooth(seg(P3, .3, 1)))).toFixed(3);
        // 3: once cool (the last stretch of the timeline), one sheen, then glints
        var sw = smooth(seg(P3, .74, .97));
        sheen.setAttribute('x', f1(-140 + sw * 720));
        sheen.setAttribute('opacity', Math.sin(Math.PI * sw).toFixed(3));
        glints.forEach(function (gl, i) {
          var t = smooth(seg(P3, .82 + i * .05, .96 + i * .013));
          gl.style.opacity = t.toFixed(3);
          gl.style.transform = 'scale(' + (t * (1 + .25 * Math.sin(Math.PI * t))).toFixed(3) + ') rotate(' + (t * 45).toFixed(1) + 'deg)';
        });
      },
      dispose: function () { box.innerHTML = ''; }
    };
  }

  /* the temperature of the gold on the same timeline: molten at the start (just above gold's 1,064 °C), a little heat
     lost in the pour, then the fall of the cooling (fast, then slower), and the last warmth gone as the ring is polished */
  function tempAt(p, B) {
    var t;
    if (p < B[2]) t = 1080 - 40 * smooth(seg(p, B[1], B[2]));
    else if (p < B[3]) { var k = seg(p, B[2], B[3]); t = 60 + 980 * Math.pow(1 - k, 2.2); }
    else t = 20 + 40 * (1 - smooth(seg(p, B[3], 1)));
    return Math.round(t / 2) * 2;
  }

  function initForge(root, signal) {
    var sec = AU.$('#forge', root); if (!sec) return;
    var stage = AU.$('[data-fg-stage]', sec), phases = AU.$$('.fg__phase', sec), segs = AU.$$('.fg__seg i', sec);
    var degEl = AU.$('[data-fg-deg]', sec);
    var flat = null, glScene = null, glBox = null, dead = false, top = 0, span = 1, active = -1, lastDeg = null, last = 0;
    var B = BOUNDS.slice();
    var nf = (function () { try { return new Intl.NumberFormat(K.locale()); } catch (e) { return { format: String }; } })();

    /* the drawn scene at once; the 3D one (AUGL.forge, when the engine has it) once the page has landed and the main
       thread is idle. The drawing stays until the 3D scene has drawn its first frame (its `ready`), then the two
       crossfade (1.2s) and the drawing rests. */
    function make() {
      if (flat || dead) return;
      var box = document.createElement('div'); box.className = 'fg__flat'; stage.appendChild(box);
      flat = FlatForge(box); sec.classList.add('is-flat');
      apply(last, true);
      AU.gl.then(function (gl) { K.later(function () { upgrade(gl); }, signal); });
    }
    function handOver() {
      if (dead || !glScene) return;
      // two frames after the first drawn frame, so the canvas is on screen before the drawing starts to leave
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        if (dead || !glScene) return;
        sec.classList.add('is-gl'); sec.classList.remove('is-flat');
      }); });
    }
    function upgrade(gl) {
      if (dead || glScene || !gl || typeof gl.forge !== 'function') return;
      try {
        glBox = document.createElement('div'); glBox.className = 'fg__gl'; stage.appendChild(glBox);
        glScene = gl.forge(glBox, { label: T('forge.label') });
        if (glScene && glScene.phases) B = boundsFrom(glScene.phases);
        apply(last, true);
        if (glScene && glScene.ready && typeof glScene.ready.then === 'function') {
          glScene.ready.then(handOver, function () {
            // the 3D scene could not be made: the drawing simply stays
            if (dead) return;
            try { glScene.dispose(); } catch (e) {}
            glScene = null; if (glBox) { glBox.remove(); glBox = null; }
          });
        } else setTimeout(handOver, 900);
      } catch (e) { console.error('[story] forge', e); glScene = null; if (glBox) { glBox.remove(); glBox = null; } }
    }
    var measure = function () { top = K.top(sec); span = Math.max(1, sec.offsetHeight - window.innerHeight); };
    var progress = function () { return c01((AU.scroll.y - top) / span); };
    function apply(p, force) {
      if (AU.reduced) p = 1;
      last = p;
      if (glScene && glScene.setProgress) { try { glScene.setProgress(p); } catch (e) {} }
      if (flat && !sec.classList.contains('is-gl')) flat.setProgress(flatQ(p, B));
      var a = 0;
      for (var i = 1; i < 4; i++) if (p >= B[i] - 0.0001) a = i;
      if (a !== active || force) {
        active = a;
        phases.forEach(function (el, k) { el.classList.toggle('is-on', k === a); el.classList.toggle('is-past', k < a); });
      }
      segs.forEach(function (el, k) { el.style.transform = 'scaleX(' + c01((p - B[k]) / (B[k + 1] - B[k])).toFixed(4) + ')'; });
      var d = tempAt(p, B);
      if (d !== lastDeg) { lastDeg = d; degEl.textContent = nf.format(d); }
    }
    var scrub = null;
    var io = new IntersectionObserver(function (es) {
      var on = es[0].isIntersecting;
      if (on) { make(); measure(); if (!scrub) scrub = K.scrub(progress, apply, { k: 8 }); scrub.kick(); }
      else if (scrub) { scrub.stop(); scrub = null; }
    }, { rootMargin: '100% 0px 100% 0px' });
    io.observe(sec);
    var ro = new ResizeObserver(function () { measure(); if (scrub) scrub.kick(); });
    ro.observe(root);
    apply(AU.reduced ? 1 : 0, true);
    signal.addEventListener('abort', function () {
      dead = true; io.disconnect(); ro.disconnect();
      if (scrub) scrub.stop();
      if (glScene && glScene.dispose) { try { glScene.dispose(); } catch (e) {} }
      if (flat) flat.dispose();
      glScene = flat = null;
    });
    return { measure: measure };
  }

  /* ===== further parts are appended below ===== */
  AU.storyAtelier = { headHTML: headHTML, forgeHTML: forgeHTML, initForge: initForge, initStats: initStats, FlatForge: FlatForge,
    helpers: { c01: c01, seg: seg, smooth: smooth, f1: f1, T: T, SVGNS: SVGNS } };
})();
