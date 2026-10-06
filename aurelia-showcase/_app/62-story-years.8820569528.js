/* ---- 62-story-years.js ---- */
/* Story / atelier: #process (the four steps with the ring that draws itself) and #years (the timeline).
   Both read cached positions (measured on resize), never layout during scroll. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.storyKit || !AU.storyAtelier) return;
  var K = AU.storyKit, H = AU.storyAtelier.helpers;
  var c01 = H.c01, seg = H.seg, smooth = H.smooth, T = H.T;

  /* =====================================================================================================
     3. THE FOUR STEPS
     ===================================================================================================== */
  /* the drawing: a solitaire as it passes through the atelier. viewBox 400 x 480. Band centre (200,318), outer r112,
     inner r98. Stone girdle y160 (x152-248), table y146 (x173-227), culet (200,201). */
  function ringSVG() {
    var g = '';
    var P = function (cls, d, extra) { return '<path class="' + cls + '" d="' + d + '" pathLength="1"' + (extra || '') + '/>'; };
    var C = function (cls, r, extra) { return '<circle class="' + cls + '" cx="200" cy="318" r="' + r + '" pathLength="1"' + (extra || '') + '/>'; };
    var ticks = '';
    for (var a = 20; a <= 160; a += 10) {
      var rad = a * Math.PI / 180, big = a % 30 === 0, r1 = 117, r2 = big ? 125 : 121;
      ticks += 'M' + (200 + Math.cos(rad) * r1).toFixed(1) + ' ' + (318 + Math.sin(rad) * r1).toFixed(1) +
        'L' + (200 + Math.cos(rad) * r2).toFixed(1) + ' ' + (318 + Math.sin(rad) * r2).toFixed(1);
    }
    var pcx = 82, pcy = 104, pr = 26, oct = '', star = '';
    for (var k = 0; k < 8; k++) {
      var t1 = (k * 45 + 22.5) * Math.PI / 180, t2 = (k * 45) * Math.PI / 180;
      oct += (k ? 'L' : 'M') + (pcx + Math.cos(t1) * pr * .55).toFixed(1) + ' ' + (pcy + Math.sin(t1) * pr * .55).toFixed(1);
      star += 'M' + (pcx + Math.cos(t1) * pr * .55).toFixed(1) + ' ' + (pcy + Math.sin(t1) * pr * .55).toFixed(1) +
        'L' + (pcx + Math.cos(t2) * pr).toFixed(1) + ' ' + (pcy + Math.sin(t2) * pr).toFixed(1) +
        'L' + (pcx + Math.cos(t1 + Math.PI / 4) * pr * .55).toFixed(1) + ' ' + (pcy + Math.sin(t1 + Math.PI / 4) * pr * .55).toFixed(1);
    }
    oct += 'Z';
    var annulus = 'M88 318a112 112 0 1 0 224 0a112 112 0 1 0 -224 0ZM102 318a98 98 0 1 0 196 0a98 98 0 1 0 -196 0Z';
    var stoneOutline = 'M152 160L173 146H227L248 160L200 201Z';
    var star4 = function (x, y, s) {
      return 'M' + x + ' ' + (y - s) + 'C' + (x + s * .1) + ' ' + (y - s * .1) + ' ' + (x + s * .1) + ' ' + (y - s * .1) + ' ' + (x + s) + ' ' + y +
        'C' + (x + s * .1) + ' ' + (y + s * .1) + ' ' + (x + s * .1) + ' ' + (y + s * .1) + ' ' + x + ' ' + (y + s) +
        'C' + (x - s * .1) + ' ' + (y + s * .1) + ' ' + (x - s * .1) + ' ' + (y + s * .1) + ' ' + (x - s) + ' ' + y +
        'C' + (x - s * .1) + ' ' + (y - s * .1) + ' ' + (x - s * .1) + ' ' + (y - s * .1) + ' ' + x + ' ' + (y - s) + 'Z';
    };
    g += '<defs>' +
      '<linearGradient id="atl-molten" gradientUnits="userSpaceOnUse" x1="0" y1="206" x2="0" y2="430">' +
        '<stop class="k-cool" data-s="0" offset="0" stop-opacity=".09"/>' +
        '<stop class="k-cool" data-s="1" offset="0" stop-opacity=".09"/>' +
        '<stop data-s="2" offset="0" stop-color="#ffdc94" stop-opacity=".9"/>' +
        '<stop data-s="3" offset="0" stop-color="#ff9a52" stop-opacity=".75"/>' +
        '<stop data-s="4" offset="0" stop-color="#ff9a52" stop-opacity="0"/>' +
        '<stop offset="1" stop-color="#ff9a52" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="atl-sheen" x1="0" y1="0" x2="1" y2="0">' +
        '<stop class="k-sheen-stop" offset="0" stop-opacity="0"/><stop class="k-sheen-stop" offset=".5" stop-opacity=".55"/><stop class="k-sheen-stop" offset="1" stop-opacity="0"/>' +
      '</linearGradient>' +
      /* the warm glow of the pour: a ring-shaped gradient rather than an SVG blur, which would re-rasterise every frame */
      '<radialGradient id="atl-glow" gradientUnits="userSpaceOnUse" cx="200" cy="318" r="132">' +
        '<stop offset=".6" stop-color="#ff9a52" stop-opacity="0"/><stop offset=".74" stop-color="#ffb066" stop-opacity=".5"/>' +
        '<stop offset=".8" stop-color="#ffd08a" stop-opacity=".75"/><stop offset=".86" stop-color="#ffb066" stop-opacity=".5"/>' +
        '<stop offset="1" stop-color="#ff9a52" stop-opacity="0"/></radialGradient>' +
      '<clipPath id="atl-clip"><path d="' + annulus + '" clip-rule="evenodd"/><path d="' + stoneOutline + '"/></clipPath>' +
    '</defs>';
    /* 01 drawn: pencil construction */
    g += '<g data-k="guides">' +
      P('k-guide k-draw', 'M200 56V462', ' data-st="d" data-a="0" data-b=".35"') +
      P('k-guide k-draw', 'M66 318H334', ' data-st="d" data-a=".06" data-b=".4"') +
      P('k-guide k-guide--faint k-draw', 'M120 160H286', ' data-st="d" data-a=".35" data-b=".62"') +
      P('k-guide k-guide--faint k-draw', 'M146 146H254', ' data-st="d" data-a=".4" data-b=".66"') +
      P('k-guide k-guide--faint k-draw', 'M200 318L146 142M200 318L254 142', ' data-st="d" data-a=".28" data-b=".6"') +
      C('k-guide k-draw', 112, ' data-st="d" data-a=".12" data-b=".58" transform="rotate(-90 200 318)"') +
      C('k-guide k-draw', 98, ' data-st="d" data-a=".22" data-b=".68" transform="rotate(-90 200 318)"') +
      C('k-guide k-guide--faint k-draw', 126, ' data-st="d" data-a=".3" data-b=".72" transform="rotate(-90 200 318)"') +
      P('k-guide k-draw', stoneOutline, ' data-st="d" data-a=".5" data-b=".85"') +
      P('k-guide k-guide--faint k-draw', 'M168 210C166 194 160 177 157 160M232 210C234 194 240 177 243 160', ' data-st="d" data-a=".6" data-b=".88"') +
      P('k-dim k-draw', ticks, ' data-st="d" data-a=".55" data-b=".9"') +
      '<circle class="k-guide k-draw" cx="' + pcx + '" cy="' + pcy + '" r="' + pr + '" pathLength="1" data-st="d" data-a=".55" data-b=".85" transform="rotate(-90 ' + pcx + ' ' + pcy + ')"/>' +
      P('k-guide k-draw', oct, ' data-st="d" data-a=".65" data-b=".9"') +
      P('k-guide k-guide--faint k-draw', star, ' data-st="d" data-a=".72" data-b=".98"') +
      P('k-guide k-guide--faint k-draw', 'M108 104H148', ' data-st="d" data-a=".8" data-b=".98"') +
    '</g>';
    g += '<g data-k="dims">' +
      P('k-dim k-draw', 'M152 156V110M248 156V110', ' data-st="d" data-a=".62" data-b=".85"') +
      P('k-dim k-draw', 'M152 116H248M152 112.5V119.5M248 112.5V119.5', ' data-st="d" data-a=".7" data-b=".92"') +
      P('k-dim k-draw', 'M214 220H352M214 416H352', ' data-st="d" data-a=".66" data-b=".88"') +
      P('k-dim k-draw', 'M346 220V416M342.5 220H349.5M342.5 416H349.5', ' data-st="d" data-a=".72" data-b=".95"') +
      '<text class="k-dimtext" data-st="d" data-a=".85" data-b="1" x="200" y="107" text-anchor="middle">6.5</text>' +
      '<text class="k-dimtext" data-st="d" data-a=".85" data-b="1" x="360" y="322" text-anchor="middle" transform="rotate(90 360 318)">Ø 16.5</text>' +
    '</g>';
    /* 02 cast: molten metal pours through the band and cools */
    g += '<g data-k="cast">' +
      '<circle data-glow cx="200" cy="318" r="132" fill="url(#atl-glow)" opacity="0"/>' +
      '<path class="k-band" d="' + annulus + '" fill-rule="evenodd"/>' +
      C('k-line k-draw', 112, ' data-st="c" data-a="0" data-b=".38" transform="rotate(-90 200 318)"') +
      C('k-line k-draw', 98, ' data-st="c" data-a=".06" data-b=".44" transform="rotate(-90 200 318)"') +
    '</g>';
    /* 03 set */
    g += '<g data-k="set">' +
      '<path class="k-stonefill" d="' + stoneOutline + '" data-fill/>' +
      P('k-line k-draw', 'M138 225C150 216 160 211 168 210M262 225C250 216 240 211 232 210', ' data-st="s" data-a="0" data-b=".32"') +
      P('k-line k-draw', 'M168 197Q200 206 232 197', ' data-st="s" data-a=".14" data-b=".42"') +
      P('k-line k-draw', 'M152 160L173 146H227L248 160', ' data-st="s" data-a=".2" data-b=".55"') +
      P('k-line k-draw', 'M152 160L200 201L248 160M152 162.5H248', ' data-st="s" data-a=".28" data-b=".62"') +
      P('k-fine k-draw', 'M152 160L173 146L176 160L191 146L200 160L209 146L224 160L227 146L248 160', ' data-st="s" data-a=".42" data-b=".8"') +
      P('k-fine k-draw', 'M176 162.5L200 201M224 162.5L200 201M200 162.5V201M164 162.5L192 194M236 162.5L208 194', ' data-st="s" data-a=".5" data-b=".86"') +
      P('k-line k-draw', 'M168 210C166 194 160 177 157 160Q156 151 165 147M232 210C234 194 240 177 243 160Q244 151 235 147', ' data-st="s" data-a=".08" data-b=".48"') +
      '<path class="k-glint" data-glint="0" d="' + star4(186, 150, 9) + '"/>' +
      '<path class="k-glint" data-glint="1" d="' + star4(219, 176, 5.5) + '"/>' +
      '<path class="k-glint" data-glint="2" d="' + star4(238, 154, 4) + '"/>' +
    '</g>';
    /* 04 finished */
    g += '<g clip-path="url(#atl-clip)"><rect data-sheen x="-150" y="80" width="120" height="380" fill="url(#atl-sheen)" opacity="0" transform="skewX(-16)"/></g>';
    g += '<g data-k="hall">' +
      P('k-dim k-draw', 'M206 423L258 455H276', ' data-st="f" data-a=".35" data-b=".62"') +
      '<rect class="k-hall k-draw" x="276" y="446" width="50" height="18" rx="9" pathLength="1" data-st="f" data-a=".5" data-b=".8"/>' +
      '<text class="k-halltext" data-st="f" data-a=".72" data-b="1" x="301" y="458.5" text-anchor="middle">750</text>' +
      '<text class="k-hallcap" data-st="f" data-a=".8" data-b="1" x="301" y="476" text-anchor="middle">' + AU.esc(T('process.hallmark')) + '</text>' +
    '</g>';
    return '<svg class="atl-svg" viewBox="30 50 340 432" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' + g + '</svg>';
  }

  function processHTML() {
    var steps = (AU.content.atelier && AU.content.atelier.steps) || [];
    return '<section id="process" class="atl section" aria-labelledby="atl-ptitle">' +
      '<div class="wrap">' +
        '<header class="atl__phead">' +
          '<p class="eyebrow caps" data-reveal="fade">' + AU.nums(T('process.eyebrow')) + '</p>' +
          '<h2 id="atl-ptitle" class="script t-h2" data-reveal="words">' + AU.nums(T('process.title')) + '</h2>' +
        '</header>' +
        '<div class="atl__process" data-atl-process>' +
          '<div class="atl__pinwrap"><figure class="atl__visual">' +
            '<div class="atl__frame">' +
              '<span class="atl__crop atl__crop--tl" aria-hidden="true"></span><span class="atl__crop atl__crop--tr" aria-hidden="true"></span>' +
              '<span class="atl__crop atl__crop--bl" aria-hidden="true"></span><span class="atl__crop atl__crop--br" aria-hidden="true"></span>' +
              '<div class="atl__fig caps caps--sm" aria-hidden="true"><span class="atl__fig-t" data-atl-figt></span></div>' +
              '<div class="atl__art" data-atl-art></div>' +
              '<div class="atl__segs" aria-hidden="true">' + steps.map(function () { return '<span class="atl__seg"><i></i></span>'; }).join('') + '</div>' +
            '</div>' +
            '<figcaption class="sr-only">' + AU.esc(T('process.figure')) + '</figcaption>' +
          '</figure></div>' +
          '<div class="atl__story"><span class="atl__rail" aria-hidden="true"></span><ol class="atl__steps" data-atl-steps>' + steps.map(function (s, i) {
            return '<li class="atl__step" data-i="' + i + '">' +
              '<span class="atl__n num" aria-hidden="true">' + AU.esc(s.n) + '</span>' +
              '<div class="atl__sbody">' +
                '<h3 class="atl__st caps caps--lg"><span class="sr-only">' + AU.esc(s.n) + ' </span>' + AU.nums(s.title) + '</h3>' +
                '<span class="atl__sline" aria-hidden="true"></span>' +
                '<p class="atl__sx body">' + AU.nums(s.text) + '</p>' +
              '</div></li>';
          }).join('') + '</ol></div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function initProcess(root, signal) {
    var sec = AU.$('#process', root), proc = AU.$('[data-atl-process]', root), art = AU.$('[data-atl-art]', root);
    var steps = (AU.content.atelier && AU.content.atelier.steps) || [];
    if (!sec || !art || !steps.length) return;
    var stepEls = AU.$$('.atl__step', sec), rail = AU.$('.atl__rail', sec);
    art.innerHTML = ringSVG();
    var svg = AU.$('svg', art);
    var figT = AU.$('[data-atl-figt]', sec), visual = AU.$('.atl__visual', sec), story = AU.$('.atl__story', sec);
    var segs = AU.$$('.atl__seg i', sec);
    var draws = AU.$$('[data-st]', svg).map(function (el) {
      return { el: el, st: el.getAttribute('data-st'), a: +el.getAttribute('data-a'), b: +el.getAttribute('data-b'), draw: el.classList.contains('k-draw'), last: -1 };
    });
    var stops = AU.$$('#atl-molten stop[data-s]', svg);
    var glow = AU.$('[data-glow]', svg), sheen = AU.$('[data-sheen]', svg), stoneFill = AU.$('[data-fill]', svg);
    var glints = AU.$$('[data-glint]', svg);
    var guides = AU.$('[data-k="guides"]', svg), dims = AU.$('[data-k="dims"]', svg), frame = AU.$('.atl__frame', sec);
    var shown = -1, active = -1;

    function render(v) {
      if (Math.abs(v - shown) < 0.0004) return;
      shown = v;
      var S = { d: c01(v / .85), c: c01((v - 1) / .85), s: c01((v - 2) / .85), f: c01((v - 3) / .85) };
      draws.forEach(function (d) {
        var t = smooth(seg(S[d.st], d.a, d.b));
        if (Math.abs(t - d.last) < 0.0005) return;
        d.last = t;
        if (d.draw) { d.el.style.strokeDashoffset = (1 - t).toFixed(4); d.el.style.visibility = t <= 0.001 ? 'hidden' : ''; }
        else d.el.style.opacity = t.toFixed(3);
      });
      var s = AU.lerp(-0.12, 1.16, smooth(seg(S.c, .22, 1)));
      var cool = .09 + .05 * S.f;
      var offs = [0, s - .11, s - .035, s, s + .02];
      stops.forEach(function (st, i) {
        st.setAttribute('offset', c01(offs[i]).toFixed(4));
        if (i < 2) st.setAttribute('stop-opacity', S.c > 0 ? cool.toFixed(3) : '0');
      });
      glow.setAttribute('opacity', (Math.sin(Math.PI * seg(S.c, .2, 1)) * .9).toFixed(3));
      stoneFill.style.opacity = (.07 * smooth(seg(S.s, .5, 1)) + .03 * S.f).toFixed(3);
      glints.forEach(function (gl, i) {
        var t = smooth(seg(S.s, .74 + i * .07, .94 + i * .03));
        gl.style.opacity = t.toFixed(3);
        gl.style.transform = 'scale(' + (t * (1 + .25 * Math.sin(Math.PI * t))).toFixed(3) + ') rotate(' + (t * 45).toFixed(1) + 'deg)';
      });
      var sw = smooth(seg(S.f, 0, .7));
      sheen.setAttribute('x', (-120 + sw * 740).toFixed(1));
      sheen.setAttribute('opacity', Math.sin(Math.PI * sw).toFixed(3));
      guides.style.opacity = (1 - .55 * smooth(S.f)).toFixed(3);
      dims.style.opacity = (1 - .35 * smooth(S.f)).toFixed(3);
      frame.style.setProperty('--grid', (1 - .8 * smooth(S.f)).toFixed(3));
      segs.forEach(function (el, i) { el.style.transform = 'scaleX(' + c01(v - i).toFixed(3) + ')'; });
      rail.style.transform = 'scaleY(' + c01(v / steps.length).toFixed(4) + ')';
    }
    function setActive(i) {
      if (i === active) return;
      active = i;
      stepEls.forEach(function (el, k) { el.classList.toggle('is-on', AU.reduced ? true : k === i); });
      figT.textContent = steps[i].title;
      figT.classList.remove('is-swap'); void figT.offsetWidth; figT.classList.add('is-swap');
    }

    /* Where the drawing is, from cached positions (the scroll only does arithmetic).
       Wide screens: the drawing and the four steps sit side by side, the drawing held (sticky) for a short stretch. The
       ring draws itself from the moment the frame is well into view until it lets go: about two thirds of a screen of
       scroll for all four steps, and the step beside it lights as it goes.
       Narrow screens: the drawing is a band pinned at the top and the steps pass beneath it; each step draws its part as
       it crosses a line under the band. */
    var wide = false, v0 = 0, v1 = 1, tops = [], hs = [];
    var anchor = function () { return window.innerHeight * .72; };
    var measure = function () {
      wide = window.innerWidth >= 900;
      if (wide) {
        var pin = visual.parentElement.getBoundingClientRect(), st = story.getBoundingClientRect();
        var stick = parseFloat(getComputedStyle(visual).top) || 0, fh = visual.offsetHeight;
        var top0 = pin.top + window.scrollY;                       // where the frame sits before it is held
        v0 = top0 - window.innerHeight * .62;                       // the frame's top at 62% of the screen
        v1 = Math.max(v0 + 200, top0 - stick + Math.max(0, st.height - fh));   // where it lets go
      } else {
        stepEls.forEach(function (el, i) { var r = el.getBoundingClientRect(); tops[i] = r.top + window.scrollY; hs[i] = Math.max(1, r.height); });
      }
    };
    var value = function () {
      var v = 0, act = 0, i;
      if (wide) {
        v = steps.length * c01((AU.scroll.y - v0) / (v1 - v0));
        act = Math.min(steps.length - 1, Math.floor(v));
      } else {
        var a = AU.scroll.y + anchor();
        for (i = 0; i < tops.length; i++) { v += c01((a - tops[i]) / hs[i]); if (tops[i] < a) act = i; }
      }
      setActive(act);
      return v;
    };
    /* a step can be chosen: the page glides to where the drawing has reached it */
    sec.addEventListener('click', function (e) {
      var li = e.target.closest('.atl__step'); if (!li || AU.reduced || e.target.closest('a')) return;
      var i = +li.getAttribute('data-i');
      measure();
      var y = wide ? v0 + (v1 - v0) * (i + .96) / steps.length : tops[i] + hs[i] * .96 - anchor();
      K.scrollTo(Math.max(0, y));
    });
    var scrub = null;
    function still() { sec.classList.remove('is-scrub'); shown = -1; render(steps.length); stepEls.forEach(function (el) { el.classList.add('is-on'); }); active = -1; setActive(steps.length - 1); }
    if (AU.reduced) still(); else { sec.classList.add('is-scrub'); render(0); setActive(0); }
    var io = new IntersectionObserver(function (es) {
      if (AU.reduced) return;
      if (es[0].isIntersecting) { measure(); if (!scrub) scrub = K.scrub(value, render, { k: 7 }); scrub.kick(); }
      else if (scrub) { scrub.stop(); scrub = null; }
    }, { rootMargin: '20% 0px 20% 0px' });
    io.observe(proc);
    var ro = new ResizeObserver(function () { measure(); if (scrub) scrub.kick(); });
    ro.observe(root);
    var offR = AU.on('reduced', function (r) { if (r) { if (scrub) { scrub.stop(); scrub = null; } still(); } else { sec.classList.add('is-scrub'); measure(); scrub = scrub || K.scrub(value, render, { k: 7 }); } });
    signal.addEventListener('abort', function () { io.disconnect(); ro.disconnect(); offR(); if (scrub) scrub.stop(); });
  }

  /* =====================================================================================================
     4. THE TIMELINE
     ===================================================================================================== */
  function yearOf(it) { return it.year === 'now' ? new Date().getFullYear() : it.year; }

  function yearsHTML() {
    var items = AU.content.timeline || [];
    var first = items.length ? yearOf(items[0]) : 1984;
    return '<section id="years" class="tml" aria-labelledby="tml-title">' +
      '<div class="tml__pin">' +
        '<header class="tml__head wrap">' +
          '<div class="tml__htext">' +
            '<p class="eyebrow caps" data-reveal="fade">' + AU.nums(T('timeline.eyebrow')) + '</p>' +
            '<h2 id="tml-title" class="script t-h2" data-reveal="words">' + AU.nums(T('timeline.title')) + '</h2>' +
          '</div>' +
          '<div class="tml__ctl" data-reveal="fade" data-delay="200">' +
            '<p class="small tml__hint" data-tml-hint></p>' +
            '<div class="tml__btns">' +
              '<button class="icon-btn icon-btn--framed tml__btn" type="button" data-tml-prev aria-label="' + AU.esc(T('timeline.prev')) + '">' + AU.icon('arrowLeft', { size: 18 }) + '</button>' +
              '<button class="icon-btn icon-btn--framed tml__btn" type="button" data-tml-next aria-label="' + AU.esc(T('timeline.next')) + '">' + AU.icon('arrow', { size: 18 }) + '</button>' +
            '</div>' +
          '</div>' +
        '</header>' +
        '<div class="tml__vp" data-tml-vp role="region" tabindex="0" aria-label="' + AU.esc(T('timeline.region')) + '">' +
          '<ol class="tml__track" data-tml-track>' + items.map(function (it, i) {
            var y = yearOf(it), now = it.year === 'now';
            return '<li class="tml__item' + (it.spec ? ' has-img' : '') + (now ? ' is-now' : '') + '" data-i="' + i + '">' +
              '<p class="tml__year" aria-hidden="true"><span class="num">' + y + '</span></p>' +
              '<span class="tml__mark" aria-hidden="true"></span>' +
              '<div class="tml__body">' +
                '<h3 class="tml__t caps caps--md"><span class="sr-only">' + y + (now ? ', ' + AU.esc(T('timeline.today')) : '') + '. </span>' +
                  (now ? '<span class="tml__today">' + AU.esc(T('timeline.today')) + '</span>' : '') + AU.nums(it.title) + '</h3>' +
                '<p class="tml__x small">' + AU.nums(it.text) + '</p>' +
                (it.spec ? K.img(it.spec, { size: 480, cls: 'tml__img', alt: '' }) : '') +
              '</div></li>';
          }).join('') + '</ol>' +
        '</div>' +
        '<div class="tml__foot wrap" aria-hidden="true">' +
          '<span class="num tml__end">' + first + '</span>' +
          '<span class="tml__bar"><i data-tml-fill></i></span>' +
          '<span class="num tml__end">' + new Date().getFullYear() + '</span>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  /* The years are a rail in the page's own flow, about one screen tall (no pinned sideways scroll): it moves by the
     arrows (disabled at either end), the keyboard (arrow keys on the focused rail), a drag with the mouse, a swipe or a
     sideways scroll. It always comes to rest with a year at the start of the grid. */
  function initYears(root, signal) {
    var sec = AU.$('#years', root); if (!sec) return;
    var vp = AU.$('[data-tml-vp]', sec), track = AU.$('[data-tml-track]', sec), fill = AU.$('[data-tml-fill]', sec);
    var items = AU.$$('.tml__item', sec);
    var hint = AU.$('[data-tml-hint]', sec), prevB = AU.$('[data-tml-prev]', sec), nextB = AU.$('[data-tml-next]', sec);
    var travel = 0, offs = [], active = -1, raf = 0, x = 0;
    sec.classList.add('is-native');
    hint.textContent = T(AU.touch ? 'timeline.hintTouch' : 'timeline.hintArrows');

    /* the scroll position at which item i rests at the start of the grid */
    var restOf = function (i) { return AU.clamp(offs[i], 0, travel); };
    function measure() {
      var ml = parseFloat(getComputedStyle(items[0]).scrollMarginLeft) || 0;
      offs = items.map(function (it) { return it.offsetLeft - ml; });
      travel = Math.max(0, vp.scrollWidth - vp.clientWidth);
    }
    function setActive(i) {
      if (i === active) return; active = i;
      items.forEach(function (it, k) { it.classList.toggle('is-on', k === i); it.classList.toggle('is-past', k < i); });
    }
    var nearest = function (pos) {
      var best = 0, bd = 1e9;
      for (var i = 0; i < offs.length; i++) { var d = Math.abs(restOf(i) - pos); if (d < bd) { bd = d; best = i; } }
      return best;
    };
    function setEnd(btn, off) {
      btn.disabled = off;
      btn.setAttribute('aria-disabled', off ? 'true' : 'false');
    }
    function paint() {
      x = vp.scrollLeft;
      // at the end of the rail the last years cannot reach the start: "today" is then the one that is lit
      setActive(travel > 0 && x >= travel - 2 ? items.length - 1 : nearest(x));
      fill.style.transform = 'scaleX(' + (travel ? c01(x / travel) : 1).toFixed(4) + ')';
      setEnd(prevB, x <= 2);
      setEnd(nextB, x >= travel - 2);
    }
    var onScroll = function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; paint(); }); };
    vp.addEventListener('scroll', onScroll, { passive: true });

    function glideTo(left) {
      vp.scrollTo({ left: AU.clamp(left, 0, travel), behavior: AU.reduced ? 'auto' : 'smooth' });
    }
    function go(dir) {
      measure();
      var cur = nearest(vp.scrollLeft), n = AU.clamp(cur + dir, 0, items.length - 1);
      // if the rail rests between two years, the first press brings the nearer one to the start
      if (dir > 0 && restOf(cur) > vp.scrollLeft + 4) n = cur;
      if (dir < 0 && restOf(cur) < vp.scrollLeft - 4) n = cur;
      glideTo(restOf(n));
    }
    prevB.addEventListener('click', function () { go(-1); });
    nextB.addEventListener('click', function () { go(1); });
    vp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Home') { e.preventDefault(); glideTo(0); }
      else if (e.key === 'End') { e.preventDefault(); glideTo(travel); }
    });

    /* drag with the mouse (touch scrolls natively). While held, the snapping is off; on release the rail glides to the
       year it was heading for, and snapping returns once it rests there. */
    var drag = null, snapT = 0;
    vp.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      measure();
      clearTimeout(snapT);
      drag = { x0: e.clientX, s0: vp.scrollLeft, lx: e.clientX, lt: performance.now(), v: 0, moved: false, id: e.pointerId };
    });
    vp.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0;
      if (!drag.moved) {
        if (Math.abs(dx) < 5) return;
        drag.moved = true;
        sec.classList.add('is-drag');
        try { vp.setPointerCapture(e.pointerId); } catch (er) {}
      }
      var now = performance.now(), dt = Math.max(1, now - drag.lt);
      drag.v = drag.v * .6 + ((e.clientX - drag.lx) / dt) * .4;
      drag.lx = e.clientX; drag.lt = now;
      vp.scrollLeft = drag.s0 - dx;
    });
    var release = function (e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var d = drag; drag = null;
      if (!d.moved) return;
      // a flick carries on to the next year in its direction
      var target = vp.scrollLeft - d.v * 220, n = nearest(target);
      glideTo(restOf(n));
      snapT = setTimeout(function () { sec.classList.remove('is-drag'); }, AU.reduced ? 0 : 900);
      // the click that ends a drag is not a click
      var stop = function (ev) { ev.stopPropagation(); ev.preventDefault(); };
      vp.addEventListener('click', stop, { capture: true, once: true });
      setTimeout(function () { vp.removeEventListener('click', stop, { capture: true }); }, 50);
    };
    vp.addEventListener('pointerup', release);
    vp.addEventListener('pointercancel', release);
    vp.addEventListener('dragstart', function (e) { e.preventDefault(); });

    var refresh = function () {
      cancelAnimationFrame(raf); raf = 0;
      requestAnimationFrame(function () { measure(); paint(); });
    };
    var ro = new ResizeObserver(refresh); ro.observe(root);
    measure(); paint();
    K.hydrate(sec, signal);
    signal.addEventListener('abort', function () { ro.disconnect(); cancelAnimationFrame(raf); clearTimeout(snapT); vp.removeEventListener('scroll', onScroll); });
  }

  AU.storyAtelier.processHTML = processHTML;
  AU.storyAtelier.initProcess = initProcess;
  AU.storyAtelier.yearsHTML = yearsHTML;
  AU.storyAtelier.initYears = initYears;
})();
