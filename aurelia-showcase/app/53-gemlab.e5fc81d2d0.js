/* ---- 53-gemlab.js ---- */
/* /gem-lab: one stone under the loupe (idea 3). AUGL.gemLab (gl-scenes-a) turns a single loose stone above a
   millimetre reticle; the controls change its stone, cut, carat, colour and clarity, and each control carries a plain
   explanation that follows its value. An indicative price (placeholder formula in content.gemLab.price) and
   "Design a ring with this stone" -> '#/bespoke?stone=…&cut=…&carat=…'. Until the 3D stage is ready the stage shows the
   scene's own reticle (see Dial); a stone is never drawn in SVG. The address follows the state
   ('#/gem-lab?stone=ruby&cut=oval&carat=1.50&colour=Medium&clarity=VS1').
   A pearl has its own scales (size in mm, colour, lustre & surface; '?mm=9.5&clarity=Excellent'), an opal its own
   (carat, body tone, brilliance), each with its own explanations, caption and price table (content.gemLab).
   API mapping: color 0 = D / light … 1 = K / deep; clarity 1 = FL … 0 = I1 (a pearl's lustre and an opal's
   brilliance on the upper part of that range); a pearl's diameter is passed as the weight the scene draws at it. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.bespoke || !AU.bespoke.kit) return;
  var kit = AU.bespoke.kit;
  var T = function (k, v) { return AU.t('ui.bespoke.lab.' + k, v); };
  var L = function () { return AU.content.gemLab; };
  var f1 = function (v) { return Math.round(v * 10) / 10; };
  var UNCUT = { pearl: true };            // a pearl has no cut; an opal is a cabochon on the chosen outline
  var CAB = { opal: true };

  /* the grade scales for a stone. A pearl is not graded like a cut stone: its size is a diameter in millimetres (not a
     weight), and its last scale is lustre with surface; an opal is weighed in carats, but its colour is its body tone
     and its last scale the brilliance of its play of colour. */
  var colourScale = function (stone) {
    var G = L();
    return stone === 'diamond' ? G.colourD : stone === 'pearl' ? G.colourPearl : stone === 'opal' ? G.colourOpal : G.colourS;
  };
  var family = function (stone) { return stone === 'pearl' ? 'pearl' : stone === 'opal' ? 'opal' : 'cut'; };
  var gradeScale = function (stone) {
    var G = L();
    return stone === 'pearl' ? G.pearl.lustre : stone === 'opal' ? G.opal.brilliance : G.clarity;
  };
  /* the 3D scene draws a pearl 7.168 mm across at 1 ct (KIT.size('round') × 1.12) and sizes it by the cube root of
     the weight: the diameter chosen here is passed to it as that weight, so the pearl drawn is the pearl described */
  var PEARL_MM1 = 6.4 * 1.12;
  var pearlCarat = function (mm) { return Math.pow(mm / PEARL_MM1, 3); };

  /* ---------- the dial: the 3D scene's own millimetre reticle, drawn in SVG ----------
     While the 3D stage prepares (and for good when there is no WebGL) the stage shows only the reticle the stone will
     stand on: the chapter ring with its minute track, the dotted 5 / 10 / 15 mm circles and their figures, and the
     short radial ruler. It is the exact perspective projection of AUGL.gemLab's floor (same reticle geometry, same
     camera: fov 24°, home elevation 0.6 rad, the scene's fitting of the ring and the room above it, its view offset),
     so when the live stage fades in over it the dial does not move by a pixel; only the stone arrives.
     No stone is ever drawn here. Without WebGL the stone's footprint (its girdle outline at true size in millimetres,
     and its table) is traced on the dial in hairlines, so carat and cut still read as a measurement. */
  var G3 = { RING: 8, FOV: 24, EL: .6 };
  /* the scene's camera for a stage of w × h CSS px; tall: the room above the reticle (8.6 mm, a pearl 12.6 mm) */
  function dialCam(w, h, tall) {
    var aspect = w / h, tv = Math.tan(G3.FOV / 2 * Math.PI / 180), th = tv * aspect, el = G3.EL;
    var cd = [0, Math.sin(el), Math.cos(el)], up = [0, Math.cos(el), -Math.sin(el)];
    var pts = [], i;
    for (i = 0; i < 36; i++) { var a = i / 36 * Math.PI * 2; pts.push([Math.cos(a) * (G3.RING + .55), 0, Math.sin(a) * (G3.RING + .55)]); }
    pts.push([-5.6, tall * .93, 0], [5.6, tall * .93, 0], [0, tall, 0]);
    var mt = .05, mb = aspect < 1 ? .19 : .15, mx = aspect < 1 ? .04 : .06, my = (mt + mb) / 2;
    var aimY = 3, D = 60;
    for (var it = 0; it < 4; it++) {
      D = 1;
      var y0 = Infinity, y1 = -Infinity;
      pts.forEach(function (p) {
        var qy = p[1] - aimY, z = qy * cd[1] + p[2] * cd[2], x = Math.abs(p[0]), y = Math.abs(qy * up[1] + p[2] * up[2]);
        D = Math.max(D, z + x / (th * (1 - 2 * mx)), z + y / (tv * (1 - 2 * my)));
      });
      pts.forEach(function (p) {
        var qy = p[1] - aimY, z = qy * cd[1] + p[2] * cd[2], py = (qy * up[1] + p[2] * up[2]) / (D - z);
        y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      });
      aimY += (y0 + y1) / 2 * D / Math.max(.25, Math.cos(el)) * .9;
    }
    var off = (mb - mt) * h / 2;
    if (Math.abs(off) <= .25) off = 0;
    /* a point on the reticle (x, z in mm; the floor is y = 0) -> CSS px in the stage */
    return function (x, z) {
      var qy = -aimY, zc = D - (qy * cd[1] + z * cd[2]), yc = qy * up[1] + z * up[2];
      return [(x / (zc * th) + 1) / 2 * w, (1 - yc / (zc * tv)) / 2 * h - off];
    };
  }
  /* approximate girdle sizes (mm) for the footprint without WebGL: a round stone is 6.4 mm at 1 ct, as in the scene */
  var FOOT = { round: [1, 1], oval: [.84, 1.24], pear: [.8, 1.3], emerald: [.8, 1.14], cushion: [.92, .96] };
  function Dial(box) {
    box.innerHTML = '<svg class="gl-dial" aria-hidden="true" focusable="false">' +
      '<g class="gl-dial__ret"><path class="gl-dial__ring" data-d="ring"/><path class="gl-dial__ticks" data-d="ticks"/>' +
      '<path class="gl-dial__dots" data-d="dots"/><path class="gl-dial__ruler" data-d="ruler"/><g class="gl-dial__fig" data-d="figs"></g></g>' +
      '<g class="gl-dial__foot" data-d="foot"></g></svg>';
    var svg = box.firstChild, el = {};
    AU.$$('[data-d]', svg).forEach(function (n) { el[n.getAttribute('data-d')] = n; });
    var size = { w: 0, h: 0 }, tall = 8.6, P = null, want = null, footOn = false;
    var p = function (x, z) { var q = P(x, z); return f1(q[0]) + ' ' + f1(q[1]); };
    var circle = function (r, n) { var s = ''; for (var i = 0; i <= n; i++) { var a = i / n * Math.PI * 2; s += (i ? 'L' : 'M') + p(Math.cos(a) * r, Math.sin(a) * r); } return s + 'Z'; };
    /* a run of text laid flat on the reticle: the local affine of the projection at its foot (10 units = 1 mm, so
       the type is set at ordinary sizes: 6.2 = the scene's 0.62 mm figures) */
    var flatText = function (x, z, str, cls) {
      var o = P(x, z), ax = P(x + .1, z), az = P(x, z + .1);
      return '<text class="' + cls + '" transform="matrix(' + [ax[0] - o[0], ax[1] - o[1], az[0] - o[0], az[1] - o[1], o[0], o[1]].map(function (v) { return v.toFixed(4); }).join(' ') + ')">' + str + '</text>';
    };
    function drawRet() {
      var R = G3.RING, s = '', i;
      el.ring.setAttribute('d', circle(R, 160) + circle(R + .42, 160));
      for (i = 0; i < 120; i++) {
        var a = i / 120 * Math.PI * 2, L = i % 10 === 0 ? .42 : i % 5 === 0 ? .28 : .16, ca = Math.cos(a), sa = Math.sin(a);
        s += 'M' + p(ca * R, sa * R) + 'L' + p(ca * (R + L), sa * (R + L));
      }
      el.ticks.setAttribute('d', s);
      // the dotted reference circles at 5, 10 and 15 mm across (one dot every 0.16 mm, as on the scene's floor)
      s = '';
      [2.5, 5, 7.5].forEach(function (r) {
        var n = Math.round(r * 2 * Math.PI / .16);
        for (var k = 0; k < n; k++) { var b = k / n * Math.PI * 2; s += 'M' + p(Math.cos(b) * r, Math.sin(b) * r) + 'h.01'; }
      });
      el.dots.setAttribute('d', s);
      // the radial ruler along the axis on the right: a tick every half millimetre of diameter
      s = 'M' + p(2.5, .06) + 'L' + p(7.5, .06);
      for (var d = 5; d <= 15.001; d += .5) {
        var L2 = Math.abs(d - Math.round(d)) < .01 ? (Math.round(d) % 5 === 0 ? .3 : .2) : .11;
        s += 'M' + p(d / 2, .06) + 'L' + p(d / 2, .06 + L2);
      }
      el.ruler.setAttribute('d', s);
      el.figs.innerHTML = [[2.5, '5'], [5, '10'], [7.5, '15']].map(function (l, i2) {
        return flatText(l[0] + .14, -.12, l[1], 'gl-dial__n') + (i2 === 2 ? flatText(l[0] + .14 + .62 * .5 * l[1].length + .12, -.12, 'MM', 'gl-dial__mm') : '');
      }).join('');
    }
    function drawFoot() {
      if (!footOn || !want) { el.foot.innerHTML = ''; return; }
      var o = want, dia = 6.4 * Math.cbrt(AU.clamp(o.carat, .1, 5));
      var f = o.stone === 'pearl' ? [1.12, 1.12] : o.stone === 'opal' ? (FOOT[o.cut] || FOOT.round).map(function (v) { return v * 1.06; }) : FOOT[o.cut] || FOOT.round;
      var W = dia * f[0] / 2, Lh = dia * f[1] / 2;
      var poly = o.stone === 'pearl' ? kit.cutOutline('round').poly : kit.cutOutline(o.cut).poly;
      var mx = 0, my = 0;
      poly.forEach(function (q) { mx = Math.max(mx, Math.abs(q[0])); my = Math.max(my, Math.abs(q[1])); });
      // the outline (normalised to ±1) runs along the stone's length towards the viewer (z)
      var path = function (k) { return 'M' + poly.map(function (q) { return p(q[0] / mx * W * k, q[1] / my * Lh * k); }).join('L') + 'Z'; };
      el.foot.innerHTML = '<path class="gl-dial__girdle" d="' + path(1) + '"/>' + (o.stone === 'pearl' ? '' : '<path class="gl-dial__table" d="' + path(.56) + '"/>');
    }
    function layout() {
      var w = Math.round(box.clientWidth), h = Math.round(box.clientHeight);
      if (!w || !h) return;
      var t = want && want.stone === 'pearl' ? 12.6 : 8.6;
      if (w === size.w && h === size.h && t === tall && P) return;
      size.w = w; size.h = h; tall = t;
      svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      P = dialCam(w, h, tall);
      drawRet(); drawFoot();
    }
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(box);
    return {
      layout: layout,
      /* the footprint is traced only when the stone will not come in 3D */
      footprint: function (on) { footOn = !!on; box.classList.toggle('has-foot', footOn); if (P) drawFoot(); },
      set: function (o) { var pearlWas = want && want.stone === 'pearl'; want = o; if (!P || pearlWas !== (o.stone === 'pearl')) layout(); else if (footOn) drawFoot(); },
      dispose: function () { if (ro) ro.disconnect(); }
    };
  }

  function render(el, params, ctx) {
    var frag = kit.clone('tpl-lab');
    if (!frag) return;
    el.appendChild(frag);
    var root = AU.$('.gl', el);
    var $ = function (s) { return AU.$(s, root); };
    var G = L(), B = AU.content.bespoke;
    var leaving = false, scene = null, glApi = null;
    var cr = G.carat;

    /* ---------- state: query presets, then the last visit, then the defaults ---------- */
    var pm = G.pearl.mm;
    var allStones = (B.stones || []).map(function (s) { return s.id; });
    var st = Object.assign({}, G.initial);
    st.mm = pm.initial; st.lustre = 1; st.brill = 1;
    var inScale = function (v, a) { return +v >= 0 && +v < a.length && Math.round(+v) === +v; };
    var saved = AU.store.get('gemlab', null);
    if (saved && typeof saved === 'object') {
      if (allStones.indexOf(saved.stone) >= 0) st.stone = saved.stone;
      if (G.cuts[saved.cut]) st.cut = saved.cut;
      if (+saved.carat >= cr.min && +saved.carat <= cr.max) st.carat = +saved.carat;
      if (+saved.colourV >= 0 && +saved.colourV <= 1) st.colourV = +saved.colourV;
      if (inScale(saved.clarity, G.clarity)) st.clarity = +saved.clarity;
      if (+saved.mm >= pm.min && +saved.mm <= pm.max) st.mm = +saved.mm;
      if (inScale(saved.lustre, G.pearl.lustre)) st.lustre = +saved.lustre;
      if (inScale(saved.brill, G.opal.brilliance)) st.brill = +saved.brill;
    }
    var q = ctx.query || {};
    if (allStones.indexOf(q.stone) >= 0) st.stone = q.stone;
    if (G.cuts[q.cut]) st.cut = q.cut;
    var qc = parseFloat(q.carat);
    if (isFinite(qc)) st.carat = Math.round(AU.clamp(qc, cr.min, cr.max) / cr.step) * cr.step;
    st.carat = Math.round(st.carat * 100) / 100;
    var qm = parseFloat(q.mm);
    if (isFinite(qm)) st.mm = Math.round(AU.clamp(qm, pm.min, pm.max) / pm.step) * pm.step;
    if (st.colourV == null) st.colourV = st.colour / (G.colourD.length - 1);
    var scale = function () { return colourScale(st.stone); };
    var colourIdx = function () { return Math.round(st.colourV * (scale().length - 1)); };
    var fam = function () { return family(st.stone); };
    /* the index on the stone's own last scale (clarity, lustre or brilliance), best first */
    var gKey = function () { return fam() === 'pearl' ? 'lustre' : fam() === 'opal' ? 'brill' : 'clarity'; };
    var gIdx = function () { return st[gKey()]; };
    var grade = function () { return gradeScale(st.stone)[gIdx()]; };
    // ?colour= and ?clarity= carry the grades by name (G, VS2; Medium deep; a pearl's lustre, an opal's brilliance)
    if (q.colour) { var sci = scale().map(function (x) { return String(x.id).toLowerCase(); }).indexOf(String(q.colour).toLowerCase()); if (sci >= 0) st.colourV = scale().length > 1 ? sci / (scale().length - 1) : 0; }
    if (q.clarity) { var cli = gradeScale(st.stone).map(function (x) { return String(x.id).toLowerCase(); }).indexOf(String(q.clarity).toLowerCase()); if (cli >= 0) st[gKey()] = cli; }
    var ct = function () { return kit.dec(st.carat); };
    var mmTxt = function () { return kit.dec(st.mm, 1); };

    /* ---------- controls ---------- */
    var stonesEl = $('[data-gl-stones]'), cutsEl = $('[data-gl-cuts]');
    stonesEl.innerHTML = (B.stones || []).map(function (s, i) {
      return '<button type="button" role="radio" class="gl__stone" data-val="' + s.id + '" aria-checked="false" tabindex="-1" aria-label="' + AU.esc(s.label) + '" title="' + AU.esc(s.label) + '" style="--i:' + i + '">' +
        '<span class="bk__dot bk__dot--gem bk__dot--sm">' + kit.gemDot(s, 28) + '</span></button>';
    }).join('');
    cutsEl.innerHTML = Object.keys(G.cuts).map(function (c, i) {
      var lab = ((B.cuts || []).find(function (x) { return x.id === c; }) || { label: c }).label;
      return '<button type="button" role="radio" class="chip gl__cut" data-val="' + c + '" aria-checked="false" tabindex="-1" style="--i:' + i + '">' + kit.svgIcon(kit.CUT_ICONS[c] || kit.CUT_ICONS.round, 16) + '<span>' + AU.esc(lab) + '</span></button>';
    }).join('');
    var stoneR = kit.radios(stonesEl, function (v) {
      if (v === st.stone) return;
      var keep = st.colourV, was = fam();
      st.stone = v; st.colourV = keep;
      buildColour();
      if (fam() !== was) { buildSize(); buildGrade(); labels(); }
      update(true);
    });
    var cutR = kit.radios(cutsEl, function (v) { if (v !== st.cut && !UNCUT[st.stone]) { st.cut = v; update(true); } });
    /* the chips' layout for the longest cut name in this language (see .gl__cuts[data-fit]): read the names' natural
       widths (they never wrap, so the reading does not depend on the layout it chooses), then set one attribute. A
       ResizeObserver reports the row's first layout before it is painted, so the chosen layout is the first one seen. */
    var fitCuts = function () {
      if (leaving || !cutsEl.isConnected) return;
      var chips = AU.$$('.gl__cut', cutsEl), W = cutsEl.clientWidth;
      if (!chips.length || !W) return;
      var cs = getComputedStyle(chips[0]);
      // a name keeps at least 12px of air on each side inside its pill (a chip packed to its border reads as cramped)
      var pad = 2 * Math.max(12, parseFloat(cs.paddingLeft) || 0) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      var ico = 16 + (parseFloat(cs.columnGap) || 7), gap = parseFloat(getComputedStyle(cutsEl).columnGap) || 6;
      var lw = 0;
      chips.forEach(function (c) { var s = c.querySelector('span'); if (s) lw = Math.max(lw, s.scrollWidth); });
      var fits = function (n, icons) { return n * (lw + pad + (icons ? ico : 0)) + (n - 1) * gap <= W; };
      var fit = fits(5, true) ? 'row-i' : fits(5, false) ? 'row' : fits(3, true) ? 'grid-i' : 'grid';
      if (cutsEl.getAttribute('data-fit') !== fit) cutsEl.setAttribute('data-fit', fit);
    };
    var cutsRO = window.ResizeObserver ? new ResizeObserver(fitCuts) : null;
    if (cutsRO) cutsRO.observe(cutsEl); else kit.whenAttached(root, fitCuts, ctx);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCuts);

    /* the row labels follow the stone: Carat / Colour / Clarity; Size / Colour / Lustre & surface (a pearl);
       Carat / Body tone / Brilliance (an opal) */
    var lEls = {};
    AU.$$('[data-gl-l]', root).forEach(function (e) { lEls[e.getAttribute('data-gl-l')] = e; });
    function labels() {
      var f = fam(), set = function (k, key) { var e = lEls[k]; if (!e) return; e.setAttribute('data-t', 'ui.bespoke.lab.' + key); e.textContent = T(key); };
      set('carat', f === 'pearl' ? 'size' : 'carat');
      set('colour', f === 'opal' ? 'tone' : 'colour');
      set('clarity', f === 'pearl' ? 'lustre' : f === 'opal' ? 'brilliance' : 'clarity');
    }
    /* size: carats for a cut stone or an opal, millimetres for a pearl */
    var caratRg = null;
    function buildSize() {
      if (fam() === 'pearl') {
        caratRg = kit.range($('[data-gl-rg="carat"]'), {
          id: 'gl-carat', min: pm.min, max: pm.max, step: pm.step, value: st.mm, describedby: 'gl-ex-carat',
          ends: [T('mm', { mm: kit.dec(pm.min, 1) }), T('mm', { mm: kit.dec(pm.max, 1) })],
          valueText: function (v) { return T('mm', { mm: kit.dec(v, 1) }); },
          onInput: function (v) { st.mm = Math.round(v * 10) / 10; update(); }
        });
      } else {
        caratRg = kit.range($('[data-gl-rg="carat"]'), {
          id: 'gl-carat', min: cr.min, max: cr.max, step: cr.step, value: st.carat, ends: [kit.dec(cr.min), kit.dec(cr.max)], describedby: 'gl-ex-carat',
          valueText: function (v) { return T('ct', { ct: kit.dec(v) }); },
          onInput: function (v) { st.carat = Math.round(v * 100) / 100; update(); }
        });
      }
    }
    buildSize();
    var colourRg = null;
    function buildColour() {
      var sc = scale(), n = sc.length, diamond = st.stone === 'diamond';
      colourRg = kit.range($('[data-gl-rg="colour"]'), {
        id: 'gl-colour', min: 0, max: n - 1, step: 1, value: colourIdx(), describedby: 'gl-ex-colour',
        ticks: diamond ? sc.map(function (x) { return x.id; }) : null,
        ends: diamond ? null : [sc[0].id, sc[n - 1].id],
        valueText: function (v) { return sc[+v].id; },
        onInput: function (v) { st.colourV = n > 1 ? v / (n - 1) : 0; update(); }
      });
      $('[data-gl-rg="colour"]').classList.add('rg--steps');
    }
    buildColour();
    /* the last scale: clarity (FL … I1), a pearl's lustre and surface, an opal's brilliance; best on the left */
    var clarityRg = null;
    function buildGrade() {
      var sc = gradeScale(st.stone), key = gKey();
      clarityRg = kit.range($('[data-gl-rg="clarity"]'), {
        id: 'gl-clarity', min: 0, max: sc.length - 1, step: 1, value: st[key], describedby: 'gl-ex-clarity',
        ticks: sc.map(function (c) { return c.id; }),
        valueText: function (v) { return sc[+v].id + (sc[+v].name ? ', ' + sc[+v].name : ''); },
        onInput: function (v) { st[key] = v; update(); }
      });
    }
    buildGrade();
    labels();

    /* ---------- the stage ---------- */
    var frame = $('[data-gl-frame]'), stageEl = $('[data-gl-stage]'), flatEl = $('[data-gl-flat]'), stillNote = $('[data-gl-still]');
    var capName = $('[data-gl-capname]'), capGrades = $('[data-gl-capgrades]'), viewsEl = $('[data-gl-views]');
    var flat = Dial(flatEl);
    // no WebGL at all: the stone's footprint is traced on the dial (and the stage says it is an illustration)
    if (!AU.hasWebGL) { flat.footprint(true); stillNote.classList.add('is-on'); }
    var setPrice = kit.priceTween($('[data-gl-price]'));
    var design = $('[data-gl-design]'), designL = $('[data-gl-designl]'), designS = $('[data-gl-designs]'), note = $('[data-gl-note]'), live = $('[data-gl-live]');
    var vEls = {}, exEls = {};
    AU.$$('[data-gl-v]', root).forEach(function (e) { vEls[e.getAttribute('data-gl-v')] = e; });
    AU.$$('[data-gl-ex]', root).forEach(function (e) { exEls[e.getAttribute('data-gl-ex')] = e; });

    var apiOpts = function () {
      // the scene's 0..1 grade: for a cut stone FL = 1 … I1 = 0; a pearl's 'Good' and an opal's 'Subdued' are still
      // fine stones, so their scales stop well above the scene's bottom (a dull, blemished pearl; an opal without fire)
      var n = gradeScale(st.stone).length, p = n > 1 ? gIdx() / (n - 1) : 0, f = fam();
      return { stone: st.stone, cut: UNCUT[st.stone] ? 'round' : st.cut, carat: f === 'pearl' ? Math.round(pearlCarat(st.mm) * 1000) / 1000 : st.carat,
        color: st.colourV, clarity: f === 'pearl' ? 1 - p * .62 : f === 'opal' ? 1 - p * .72 : 1 - p };
    };
    var raf = 0;
    function pushStage() {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (leaving) return;
        var o = apiOpts();
        flat.set({ stone: o.stone, cut: o.cut, carat: o.carat, colour: o.color, clarity: o.clarity });
        if (scene) { try { scene.set(o); } catch (e) { console.error(e); } }
      });
    }
    var setEx = function (k, text) {
      var e = exEls[k];
      if (e.textContent === text) return;
      e.textContent = text;
      if (!AU.reduced && e.__shown) { e.classList.remove('is-swap'); void e.offsetWidth; e.classList.add('is-swap'); }
      e.__shown = true;
    };

    /* the way on: 'Design a ring with this stone', or for a pearl or an opal 'Ask us about this stone' (data-t is set
       too, so the page's translation pass, which runs after the render, keeps it) */
    function ctaText(k) {
      designL.setAttribute('data-t', 'ui.bespoke.lab.' + k); designL.textContent = T(k);
      designS.setAttribute('data-t', 'ui.bespoke.lab.' + k + 'Short'); designS.textContent = T(k + 'Short');
    }
    var liveT = 0;
    function update(swap) {
      var stone = kit.stoneById(st.stone), sc = scale(), ci = colourIdx(), cl = grade(), f = fam();
      var uncut = UNCUT[st.stone], cab = CAB[st.stone];
      stoneR.sync(st.stone);
      cutR.sync(uncut ? '' : st.cut);
      cutsEl.classList.toggle('is-off', !!uncut);
      if (uncut) cutsEl.setAttribute('aria-disabled', 'true'); else cutsEl.removeAttribute('aria-disabled');
      var cutLabel = uncut ? T('sphere') : (((B.cuts || []).find(function (x) { return x.id === st.cut; }) || {}).label || st.cut) + (cab ? ' · ' + T('cabochon') : '');
      vEls.stone.textContent = stone.label;
      vEls.cut.textContent = cutLabel;
      if (f !== 'pearl') vEls.carat.innerHTML = '<span class="num">' + ct() + '<small> ' + AU.esc(AU.t('ui.bespoke.ct')) + '</small></span>';
      // a pearl's size is its diameter
      if (f === 'pearl') {
        vEls.carat.innerHTML = '<span class="num">' + mmTxt() + '<small> mm</small></span>';
        var band = (G.pearl.size || []).find(function (b) { return st.mm <= b.max; }) || G.pearl.size[G.pearl.size.length - 1];
        setEx('carat', String(band.text).replace('{mm}', mmTxt()));
      } else {
        // the size the scene draws: a round stone 6.4 mm across at 1 ct, an opal's cabochon 6 % wider
        var mm = 6.4 * (f === 'opal' ? 1.06 : 1) * Math.cbrt(st.carat);
        setEx('carat', AU.t(f === 'opal' ? 'gemLab.caratTextOpal' : 'gemLab.caratText', { ct: ct(), mm: kit.dec(mm, 1) }));
      }
      vEls.colour.textContent = sc[ci].id;
      vEls.clarity.innerHTML = AU.nums(cl.id) + (cl.name ? ' <em>' + AU.esc(cl.name) + '</em>' : '');
      setEx('stone', G.stones[st.stone] || '');
      setEx('cut', uncut || cab ? G.uncut : G.cuts[st.cut]);
      setEx('colour', sc[ci].text);
      setEx('clarity', f === 'cut' && st.stone !== 'diamond' ? cl.text + ' ' + G.clarityNote : cl.text);
      // the caption on the stage and the stage's label, in the stone's own grades
      var v = { ct: ct(), mm: mmTxt(), cut: cutLabel, stone: stone.label, colour: sc[ci].id, clarity: cl.id, lustre: cl.cap || cl.id, brilliance: cl.cap || cl.id };
      var sfx = f === 'pearl' ? 'Pearl' : f === 'opal' ? 'Opal' : '';
      capName.textContent = stone.label;
      capGrades.innerHTML = kit.parts(T('grades' + sfx, v));
      // in a sentence an opal is a 'Round cabochon', not 'Round · Cabochon'
      if (cab) { var cl0 = ((B.cuts || []).find(function (x) { return x.id === st.cut; }) || {}).label || st.cut; v.cut = T('cabochonCut', { cut: AU.lang === 'en' ? cl0 : cl0.toLocaleLowerCase() }); }
      var label = T('stageLabel' + sfx, v);
      flatEl.setAttribute('aria-label', label);
      if (scene && scene.canvas) scene.canvas.setAttribute('aria-label', label);
      // price and the way on
      var price = G.price({ stone: st.stone, cut: uncut ? 'round' : cab ? 'cabochon' : st.cut, carat: st.carat, mm: st.mm, colour: ci, clarity: gIdx() });
      setPrice(price);
      if (stone.group === 'lab') {
        ctaText('consult');
        v.price = AU.fmt(price);
        design.setAttribute('href', '#/visit?reason=bespoke&notes=' + encodeURIComponent(T('consultNotes' + sfx, v)));
        note.textContent = T('noRing') + ' ' + T('priceNote');
      } else {
        ctaText('design');
        var bc = AU.clamp(Math.round(st.carat / B.carat.step) * B.carat.step, B.carat.min, B.carat.max);
        design.setAttribute('href', '#/bespoke?stone=' + st.stone + '&cut=' + st.cut + '&carat=' + bc.toFixed(2));
        note.textContent = T('priceNote');
      }
      AU.store.set('gemlab', { stone: st.stone, cut: st.cut, carat: st.carat, colourV: st.colourV, clarity: st.clarity, mm: st.mm, lustre: st.lustre, brill: st.brill });
      // the address is the stone on the stage, so it can be shared (written once the page is the open one)
      if (AU.router.current && AU.router.current.el === el) syncUrl();
      if (swap && !AU.reduced) { capName.classList.remove('is-swap'); void capName.offsetWidth; capName.classList.add('is-swap'); }
      clearTimeout(liveT);
      liveT = setTimeout(function () { live.textContent = label + '. ' + T('price') + ' ' + AU.fmt(price) + '.'; }, 800);
      pushStage();
    }

    /* ?stone=&cut=&carat=&colour=&clarity= (grades by name; a pearl has ?mm= instead of a carat, and its lustre, an
       opal its brilliance, in ?clarity=); debounced, so a slider drag is one history write */
    var urlT = 0;
    function syncUrl() {
      clearTimeout(urlT);
      urlT = setTimeout(function () {
        if (leaving) return;
        var pearl = fam() === 'pearl';
        kit.setQuery({ stone: st.stone, cut: UNCUT[st.stone] ? null : st.cut, carat: pearl ? null : st.carat.toFixed(2), mm: pearl ? st.mm.toFixed(1) : null,
          colour: scale()[colourIdx()].id, clarity: grade().id }, 'gem-lab');
      }, 260);
    }
    var offUrl = AU.on('route', function (d) { if (d && d.name === 'gem-lab') { offUrl(); syncUrl(); } });
    ctx.onLeave(offUrl);

    /* ---------- views (when the scene has them) ---------- */
    var VIEW_ICONS = {
      home: '<ellipse cx="12" cy="15" rx="8.5" ry="3.6"/><path d="M8.2 12.6 12 6.5l3.8 6.1"/>',
      top: kit.CUT_ICONS.round,
      side: '<path d="M3.5 9.5h17L12 20z"/><path d="M7 9.5l2.2-3.5h5.6L17 9.5"/>'
    };
    function buildViews() {
      viewsEl.innerHTML = ['home', 'top', 'side'].map(function (v) {
        var lab = T('view' + v.charAt(0).toUpperCase() + v.slice(1));
        return '<button type="button" role="radio" class="gl__view" data-val="' + v + '" aria-checked="' + (v === 'home') + '" tabindex="' + (v === 'home' ? 0 : -1) + '" aria-label="' + AU.esc(lab) + '" title="' + AU.esc(lab) + '">' + kit.svgIcon(VIEW_ICONS[v], 18) + '</button>';
      }).join('');
      viewsEl.setAttribute('role', 'radiogroup');
      viewsEl.setAttribute('aria-label', T('views'));
      var vr = kit.radios(viewsEl, function (v) { vr.sync(v); try { scene.view(v); } catch (e) { console.error(e); } });
      viewsEl.hidden = false;
    }

    update();
    var o0 = apiOpts();
    flat.set({ stone: o0.stone, cut: o0.cut, carat: o0.carat, colour: o0.color, clarity: o0.clarity });
    kit.whenAttached(root, function () { flat.layout(); }, ctx);
    AU.reveal(root);

    /* the stones the 3D kit knows (when it is there) */
    AU.gl.then(function (g) {
      glApi = g;
      if (leaving) return;
      if (g && g.kit && g.kit.STONES && typeof g.gemLab === 'function') {
        AU.$$('[role="radio"]', stonesEl).forEach(function (b) { b.hidden = !g.kit.STONES[b.getAttribute('data-val')]; });
        if (!g.kit.STONES[st.stone]) { var was = fam(); st.stone = 'diamond'; buildColour(); if (was !== fam()) { buildSize(); buildGrade(); labels(); } update(true); }
        else stoneR.sync(st.stone);
      }
    });
    var noStone = function () { if (leaving) return; flat.footprint(true); stillNote.classList.add('is-on'); };
    /* the stone is the page's one subject: the scene is made while the page arrives (kit.settled early: the engine
       holds its heavy slices until the page change is over), and the stone is shown the moment it is ready. The scene's reticle draws itself in (a sweep of about 1.7 s from
       its birth) exactly over the drawn dial, which stays under it until the sweep is done and then steps back: the
       dial never vanishes and redraws, and the stone arrives as soon as it exists. */
    var dialT = 0;
    kit.settled(el, ctx, { early: true }).then(function () { return AU.gl; }).then(function (g) {
      if (leaving || !g || typeof g.gemLab !== 'function') { noStone(); return; }
      var o = apiOpts(); o.label = flatEl.getAttribute('aria-label');
      var born = performance.now();
      try { scene = g.gemLab(stageEl, o); } catch (e) { console.error(e); scene = null; noStone(); return; }
      if (!scene) { noStone(); return; }
      Promise.resolve(scene.ready).catch(function () {}).then(function () {
        if (leaving) return;
        requestAnimationFrame(function () {
          if (leaving) return;
          frame.classList.add('is-gl');
          flatEl.removeAttribute('role'); flatEl.setAttribute('aria-hidden', 'true');
          if (typeof scene.view === 'function') buildViews();
          dialT = setTimeout(function () { if (!leaving) frame.classList.add('is-gl-dial'); }, AU.reduced ? 0 : Math.max(250, 2000 - (performance.now() - born)));
        });
      });
    });

    return function () {
      leaving = true;
      cancelAnimationFrame(raf); clearTimeout(liveT); clearTimeout(urlT); clearTimeout(dialT);
      if (cutsRO) cutsRO.disconnect();
      flat.dispose();
      if (scene) { try { scene.dispose(); } catch (e) { console.error(e); } scene = null; }
    };
  }

  AU.ready(function () {
    if (!AU.router) return;
    AU.router.add('/gem-lab', {
      name: 'gem-lab',
      title: function () { return AU.t('ui.bespoke.meta.lab.title'); },
      description: function () { return AU.t('ui.bespoke.meta.lab.description'); },
      render: render
    });
  });
})();
