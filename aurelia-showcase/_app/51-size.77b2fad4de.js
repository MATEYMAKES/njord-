/* ---- 51-size.js ---- */
/* /size: the ring size finder (idea 8).
   Step 1 calibrates the screen: the visitor resizes a card outline until it matches a real bank card (ID-1, 85.60 ×
   53.98 mm) held against the glass, which gives CSS pixels per millimetre (AU.store 'pxmm').
   Step 2 measures a ring they own: a circle resized to the ring's inside edge gives the inner diameter, and so the
   US / UK / EU size. "Use this size" stores AU.store 'ringSize' (the product page and the configurator preselect it).
   Below: the size chart, a printable paper sizer (window.print with a print stylesheet drawn in millimetres) and tips.
   The pads are SVG drawn 1:1 in CSS pixels; drags change attributes, never layout. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.bespoke || !AU.bespoke.kit) return;
  var kit = AU.bespoke.kit;
  var T = function (k, v) { return AU.t('ui.bespoke.size.' + k, v); };
  var CARD = [85.6, 53.98];
  var PX = { min: 2.6, max: 7.4 };
  var DIA = { min: 12.5, max: 23.5 };
  var f1 = function (v) { return Math.round(v * 10) / 10; };
  var f2 = function (v) { return Math.round(v * 100) / 100; };

  /* a first guess before calibration: a desktop screen at 96 dpi, or a phone's typical density */
  function guessPxmm() {
    var short = Math.min(screen.width || 1440, screen.height || 900);
    if (AU.touch && short < 600) return 6.1;
    if (AU.touch) return 5.0;
    return 3.78;
  }
  function rows() { return AU.content.ringSizes || []; }
  /* the size for an inner diameter: the nearest, or the larger of two when it falls between them */
  function sizeFor(d) {
    var R = rows();
    if (!R.length) return null;
    if (d < R[0].d - .3 || d > R[R.length - 1].d + .3) return { out: true };
    var best = R[0], bd = 99, i, bi = 0;
    for (i = 0; i < R.length; i++) { var x = Math.abs(R[i].d - d); if (x < bd) { bd = x; best = R[i]; bi = i; } }
    if (bd > .14 && d > best.d && R[bi + 1]) return { row: R[bi + 1], between: true };
    return { row: best, between: bd > .14 };
  }

  /* ---------- the printable sheet, drawn in millimetres ---------- */
  function stripSVG(cls) {
    var R = rows(), L = 104, H = 16, X0 = 4, marks = '', labels = '';
    for (var mm = 0; mm <= 92; mm++) {
      var big = mm % 10 === 0, mid = mm % 5 === 0;
      marks += 'M' + (X0 + mm) + ' 2v' + (big ? 3.4 : mid ? 2.4 : 1.4);
    }
    /* the sizes sit about 1.3 mm apart along the strip: every size gets a tick (whole sizes longer), and only the even
       ones a figure (4, 6 … 12), so the figures never run together; 6 and 10 are the 'quiet' ones a phone leaves out */
    R.forEach(function (r) {
      var x = f2(X0 + r.c), whole = r.us % 1 === 0, even = whole && r.us % 2 === 0;
      marks += 'M' + x + ' ' + (H - 2) + 'v-' + (even ? 5 : whole ? 3.8 : 2.6);
      if (even) labels += '<text class="sz-l' + (r.us % 4 ? ' sz-l--q' : '') + '" x="' + x + '" y="' + (H - 7.6) + '" text-anchor="middle">' + r.us + '</text>';
    });
    return '<svg class="' + (cls || '') + '" width="' + L + 'mm" height="' + H + 'mm" viewBox="0 0 ' + L + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x=".2" y=".2" width="' + (L - .4) + '" height="' + (H - .4) + '" fill="none" stroke="#000" stroke-width=".25" stroke-dasharray="1.2 .8"/>' +
      '<path d="M' + X0 + ' 1.4V' + (H - 1.4) + '" stroke="#000" stroke-width=".35"/>' +
      '<path d="' + marks + '" stroke="#000" stroke-width=".18" fill="none"/>' +
      '<g font-family="Cormorant Infant, Georgia, serif" font-size="2.6" fill="#000">' + labels +
        '<text x="' + (X0 + 1.2) + '" y="' + (H / 2 + .9) + '" font-size="2.2">0</text>' +
        '<text x="' + (L - 3) + '" y="' + (H / 2 + .9) + '" text-anchor="end" font-size="2.2" letter-spacing=".3">' + AU.esc(T('chartUS')) + '</text>' +
      '</g></svg>';
  }
  function sheetHTML() {
    var R = rows();
    var ruler = '<svg width="58mm" height="12mm" viewBox="0 0 58 12" xmlns="http://www.w3.org/2000/svg"><g stroke="#000" fill="none">' +
      '<path d="M4 8H54" stroke-width=".3"/>';
    for (var i = 0; i <= 50; i++) ruler += '<path d="M' + (4 + i) + ' 8v-' + (i % 10 === 0 ? 3.2 : i % 5 === 0 ? 2.2 : 1.2) + '" stroke-width=".18"/>';
    ruler += '</g><g font-family="Cormorant Infant, Georgia, serif" font-size="2.6" fill="#000"><text x="4" y="11.6" text-anchor="middle">0</text><text x="54" y="11.6" text-anchor="middle">50 mm</text></g></svg>';
    var circles = R.map(function (r) {
      return '<div class="sz-sheet__c"><svg width="24mm" height="24mm" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="12" cy="12" r="' + f2(r.d / 2) + '" fill="none" stroke="#000" stroke-width=".2"/>' +
        '<path d="M11 12h2M12 11v2" stroke="#000" stroke-width=".15"/></svg>' +
        '<span>' + AU.esc(T('chartUS')) + ' ' + kit.sizeWord(r.us) + ' · ' + kit.dec(r.d, 1) + '</span></div>';
    }).join('');
    return '<div class="sz-sheet__head"><p class="sz-sheet__brand">' + AU.esc((AU.content.brand && AU.content.brand.name) || '') + '</p><h2>' + AU.esc(T('sheetTitle')) + '</h2></div>' +
      '<div class="sz-sheet__check">' + ruler + '<p>' + AU.esc(T('sheetCheck')) + '</p></div>' +
      '<div class="sz-sheet__strip">' + stripSVG() + '<p>' + AU.esc(T('sheetStrip')) + '</p></div>' +
      '<p class="sz-sheet__lede">' + AU.esc(T('sheetCircles')) + '</p>' +
      '<div class="sz-sheet__grid">' + circles + '</div>' +
      '<p class="sz-sheet__foot">' + AU.esc(T('sheetFoot')) + '</p>';
  }

  function render(el, params, ctx) {
    var frag = kit.clone('tpl-size');
    if (!frag) return;
    el.appendChild(frag);
    var root = AU.$('.sz', el);
    var $ = function (s) { return AU.$(s, root); };
    var tool = $('[data-sz-tool]');
    var leaving = false;

    var stored = +AU.store.get('pxmm', 0);
    var calibrated = stored >= PX.min && stored <= PX.max;
    var pxmm = calibrated ? stored : guessPxmm();
    var known = kit.sizeRow(kit.ringSize());
    var dia = +AU.store.get('ringDia', 0) || (known ? known.d : 16.5);
    dia = AU.clamp(dia, DIA.min, DIA.max);
    var step = calibrated && ctx.query.step !== '1' ? 2 : 1;

    /* ---------- the two ranges, each with a pair of fine-step buttons (precise on a touch screen) ---------- */
    var nudgeRow = function (box, id) {
      var row = document.createElement('div'); row.className = 'sz__rgrow';
      row.innerHTML = '<button class="sz__nudge" type="button" data-nudge="-1" aria-controls="' + id + '">' + AU.icon('minus', { size: 16 }) + '</button>' +
        '<div class="sz__rgcell"></div>' +
        '<button class="sz__nudge" type="button" data-nudge="1" aria-controls="' + id + '">' + AU.icon('plus', { size: 16 }) + '</button>';
      box.parentNode.insertBefore(row, box);
      AU.$('.sz__rgcell', row).appendChild(box);
      return row;
    };
    var cardBox = $('[data-sz-card-rg]'), ringBox = $('[data-sz-ring-rg]');
    var cardHead = document.createElement('p'); cardHead.className = 'sz__rh';
    cardHead.innerHTML = '<label class="caps caps--sm" for="sz-card">' + AU.esc(T('cardLabel')) + '</label><span class="sz__rv num" data-sz-cardv></span>';
    var ringHead = document.createElement('p'); ringHead.className = 'sz__rh';
    ringHead.innerHTML = '<label class="caps caps--sm" for="sz-ring">' + AU.esc(T('diameter')) + '</label><span class="sz__rv" data-sz-ringv></span>';
    var cardRow = nudgeRow(cardBox, 'sz-card'), ringRow = nudgeRow(ringBox, 'sz-ring');
    cardRow.parentNode.insertBefore(cardHead, cardRow);
    ringRow.parentNode.insertBefore(ringHead, ringRow);
    AU.$$('[data-nudge="-1"]', root).forEach(function (b) { b.setAttribute('aria-label', T(b.closest('.sz__pane').getAttribute('data-sz-pane') === '1' ? 'smaller' : 'smallerRing')); });
    AU.$$('[data-nudge="1"]', root).forEach(function (b) { b.setAttribute('aria-label', T(b.closest('.sz__pane').getAttribute('data-sz-pane') === '1' ? 'larger' : 'largerRing')); });

    var cardRg = kit.range(cardBox, {
      id: 'sz-card', min: PX.min, max: PX.max, step: .01, value: pxmm,
      valueText: function (v) { return T('calibrated', { v: kit.dec(v) }); },
      onInput: function (v) { pxmm = v; drawCard(); }
    });
    var ringRg = kit.range(ringBox, {
      id: 'sz-ring', min: DIA.min, max: DIA.max, step: .1, value: dia,
      valueText: function (v) { return T('mm', { mm: kit.dec(v, 1) }); },
      onInput: function (v) { dia = v; drawRing(); result(); }
    });
    root.addEventListener('click', function (e) {
      var n = e.target.closest('[data-nudge]');
      if (!n) return;
      var d = +n.getAttribute('data-nudge');
      if (n.closest('[data-sz-pane="1"]')) { pxmm = AU.clamp(f2(pxmm + d * .01), PX.min, cardMax); cardRg.set(pxmm); drawCard(); }
      else { dia = AU.clamp(f1(dia + d * .1), DIA.min, DIA.max); ringRg.set(dia); drawRing(); result(); }
    });

    /* ---------- step 1: the card outline ---------- */
    var cardPad = $('[data-sz-cardpad]'), ringPad = $('[data-sz-ringpad]');
    cardPad.innerHTML = '<svg class="sz__svg" aria-hidden="true" focusable="false">' +
      '<path class="sz__mark" data-sz-mark/>' +
      '<g data-sz-cardg><rect class="sz__cardr" data-sz-cardr/><rect class="sz__chip" data-sz-chip/><path class="sz__chipl" data-sz-chipl/>' +
      '<text class="sz__dim" data-sz-dl text-anchor="middle"></text><text class="sz__dim" data-sz-ds text-anchor="middle"></text></g>' +
      '</svg><span class="sz__handle" data-sz-h aria-hidden="true"><i></i></span>';
    var cSvg = AU.$('svg', cardPad), cG = AU.$('[data-sz-cardg]', cardPad), cR = AU.$('[data-sz-cardr]', cardPad), cChip = AU.$('[data-sz-chip]', cardPad),
        cChipL = AU.$('[data-sz-chipl]', cardPad), cMark = AU.$('[data-sz-mark]', cardPad), cDl = AU.$('[data-sz-dl]', cardPad), cDs = AU.$('[data-sz-ds]', cardPad),
        cH = AU.$('[data-sz-h]', cardPad);
    var cardV = $('[data-sz-cardv]'), calEl = $('[data-sz-cal]');
    var pad = { w: 0, h: 0, o: 32, ox: 32, oy: 32, portrait: false };
    var cardMax = PX.max;
    function layoutCard() {
      var r = cardPad.getBoundingClientRect();
      pad.w = r.width; pad.h = r.height;
      pad.o = pad.w < 600 ? 16 : 32;
      var aw = pad.w - 2 * pad.o, ah = pad.h - 2 * pad.o;
      pad.portrait = aw < CARD[0] * 5.4;
      cardMax = pad.portrait ? Math.min(PX.max, aw / CARD[1], ah / CARD[0]) : Math.min(PX.max, aw / CARD[0], ah / CARD[1]);
      cardMax = Math.max(PX.min + .5, Math.floor(cardMax * 100) / 100);
      cardRg.setRange(PX.min, cardMax);
      if (pxmm > cardMax) { pxmm = cardMax; cardRg.set(pxmm); }
      cSvg.setAttribute('width', pad.w); cSvg.setAttribute('height', pad.h);
      cSvg.setAttribute('viewBox', '0 0 ' + pad.w + ' ' + pad.h);
      // the card's top-left corner stays put while it is resized (a real card is held against it); it is placed so
      // the outline at its present size sits in the middle of the pad
      var w0 = (pad.portrait ? CARD[1] : CARD[0]) * pxmm, h0 = (pad.portrait ? CARD[0] : CARD[1]) * pxmm;
      pad.ox = Math.round(Math.max(pad.o, Math.min((pad.w - w0) / 2, pad.w - pad.o - (pad.portrait ? CARD[1] : CARD[0]) * cardMax)));
      pad.oy = Math.round(Math.max(pad.o, Math.min((pad.h - h0) / 2, pad.h - pad.o - (pad.portrait ? CARD[0] : CARD[1]) * cardMax)));
      var m = 14, ox = pad.ox, oy = pad.oy;
      // the corner mark the card's corner goes into
      cMark.setAttribute('d', 'M' + (ox - 6) + ' ' + (oy + m * 2) + 'V' + (oy - 6) + 'H' + (ox + m * 2));
      drawCard();
    }
    function drawCard() {
      var L = CARD[0] * pxmm, S = CARD[1] * pxmm, rx = 3.18 * pxmm, ox = pad.ox, oy = pad.oy;
      // drawn in landscape; a portrait pad turns it a quarter, so the long side runs down the screen
      cG.setAttribute('transform', pad.portrait ? 'translate(' + (ox + S) + ' ' + oy + ') rotate(90)' : 'translate(' + ox + ' ' + oy + ')');
      cR.setAttribute('width', f2(L)); cR.setAttribute('height', f2(S)); cR.setAttribute('rx', f2(rx));
      var cx = L * .1, cy = S * .36, cw = L * .13, ch = S * .2;
      cChip.setAttribute('x', f2(cx)); cChip.setAttribute('y', f2(cy)); cChip.setAttribute('width', f2(cw)); cChip.setAttribute('height', f2(ch)); cChip.setAttribute('rx', f2(ch * .18));
      cChipL.setAttribute('d', 'M' + f2(cx) + ' ' + f2(cy + ch / 2) + 'h' + f2(cw) + 'M' + f2(cx + cw * .5) + ' ' + f2(cy) + 'v' + f2(ch));
      cDl.setAttribute('x', f2(L / 2)); cDl.setAttribute('y', f2(S - 14)); cDl.textContent = T('cardLong');
      cDs.setAttribute('transform', 'translate(' + f2(L - 16) + ' ' + f2(S / 2) + ') rotate(-90)'); cDs.textContent = T('cardShort');
      var hx = pad.portrait ? ox + S : ox + L, hy = pad.portrait ? oy + L : oy + S;
      cH.style.transform = 'translate3d(' + f1(hx) + 'px,' + f1(hy) + 'px,0)';
      cardV.textContent = T('pxmm', { v: kit.dec(pxmm) });
    }
    /* dragging the corner: the card's size is the pointer's projection onto the card's diagonal */
    var dragHandle = function (handleEl, padEl, onMove) {
      var id = null;
      var move = function (e) {
        if (e.pointerId !== id) return;
        var r = padEl.getBoundingClientRect();
        onMove(e.clientX - r.left, e.clientY - r.top);
      };
      var up = function (e) { if (e.pointerId !== id) return; id = null; handleEl.classList.remove('is-drag'); padEl.classList.remove('is-drag'); };
      handleEl.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        id = e.pointerId; e.preventDefault();
        try { handleEl.setPointerCapture(id); } catch (er) { /* ignore */ }
        handleEl.classList.add('is-drag'); padEl.classList.add('is-drag');
      });
      handleEl.addEventListener('pointermove', move);
      handleEl.addEventListener('pointerup', up);
      handleEl.addEventListener('pointercancel', up);
    };
    dragHandle(cH, cardPad, function (x, y) {
      var a = pad.portrait ? CARD[1] : CARD[0], b = pad.portrait ? CARD[0] : CARD[1];
      var dx = x - pad.ox, dy = y - pad.oy;
      pxmm = AU.clamp(f2((dx * a + dy * b) / (a * a + b * b)), PX.min, cardMax);
      cardRg.set(pxmm); drawCard();
    });

    /* ---------- step 2: the ring circle ---------- */
    ringPad.innerHTML = '<svg class="sz__svg" aria-hidden="true" focusable="false">' +
      '<circle class="sz__rfill" data-sz-rf/><circle class="sz__rc" data-sz-rc/><path class="sz__cross" data-sz-x/>' +
      '<text class="sz__dim sz__dim--ring" data-sz-rt text-anchor="middle"></text></svg>' +
      '<span class="sz__handle sz__handle--ring" data-sz-rh aria-hidden="true"><i></i></span>';
    var rSvg = AU.$('svg', ringPad), rC = AU.$('[data-sz-rc]', ringPad), rF = AU.$('[data-sz-rf]', ringPad), rX = AU.$('[data-sz-x]', ringPad),
        rT = AU.$('[data-sz-rt]', ringPad), rH = AU.$('[data-sz-rh]', ringPad);
    var rpad = { w: 0, h: 0, cx: 0, cy: 0 };
    var ringV = $('[data-sz-ringv]');
    function layoutRing() {
      var r = ringPad.getBoundingClientRect();
      rpad.w = r.width; rpad.h = r.height; rpad.cx = r.width / 2; rpad.cy = r.height / 2 - 10;
      rSvg.setAttribute('width', rpad.w); rSvg.setAttribute('height', rpad.h); rSvg.setAttribute('viewBox', '0 0 ' + rpad.w + ' ' + rpad.h);
      [rC, rF].forEach(function (c) { c.setAttribute('cx', f1(rpad.cx)); c.setAttribute('cy', f1(rpad.cy)); });
      rX.setAttribute('d', 'M' + f1(rpad.cx - 6) + ' ' + f1(rpad.cy) + 'h12M' + f1(rpad.cx) + ' ' + f1(rpad.cy - 6) + 'v12');
      drawRing();
    }
    function drawRing() {
      var r = dia * pxmm / 2;
      rC.setAttribute('r', f2(r)); rF.setAttribute('r', f2(r));
      rT.setAttribute('x', f1(rpad.cx)); rT.setAttribute('y', f1(rpad.cy + r + 34));
      rT.textContent = T('mm', { mm: kit.dec(dia, 1) });
      rH.style.transform = 'translate3d(' + f1(rpad.cx + r) + 'px,' + f1(rpad.cy) + 'px,0)';
      ringV.innerHTML = AU.nums(T('mm', { mm: kit.dec(dia, 1) }));
    }
    dragHandle(rH, ringPad, function (x, y) {
      var r = Math.hypot(x - rpad.cx, y - rpad.cy);
      dia = AU.clamp(f1(2 * r / pxmm), DIA.min, DIA.max);
      ringRg.set(dia); drawRing(); result();
    });

    /* ---------- the result ---------- */
    var resEl = $('[data-sz-result]'), useBtn = $('[data-sz-use]'), useL = $('[data-sz-usel]'), nextEl = $('[data-sz-next]');
    resEl.innerHTML = '<p class="caps caps--sm sz__rl">' + AU.esc(T('yourSize')) + '</p>' +
      '<p class="sz__big"><span class="sz__us caps">' + AU.esc(T('chartUS')) + '</span><span class="num" data-sz-n></span></p>' +
      '<p class="sz__conv" data-sz-conv></p><p class="sz__note small" data-sz-note></p>';
    var nEl = AU.$('[data-sz-n]', resEl), convEl = AU.$('[data-sz-conv]', resEl), noteEl = AU.$('[data-sz-note]', resEl);
    var shown = null, current = null, liveT = 0;
    function result() {
      var s = sizeFor(dia);
      current = s && s.row ? s.row : null;
      var key = s ? (s.out ? 'out' : s.row.us + (s.between ? 'b' : '')) : '';
      if (key === shown) return;
      var tick = shown !== null && !AU.reduced;
      shown = key;
      resEl.classList.toggle('is-out', !!(s && s.out));
      if (s && s.row) {
        nEl.textContent = kit.sizeWord(s.row.us);
        convEl.innerHTML = AU.nums(T('ukeu', { uk: s.row.uk, eu: s.row.eu }));
        noteEl.textContent = s.between ? T('between') : '';
      } else {
        nEl.textContent = '–';
        convEl.textContent = '';
        noteEl.textContent = T('outOfRange');
      }
      if (tick) { nEl.classList.remove('is-tick'); void nEl.offsetWidth; nEl.classList.add('is-tick'); }
      useBtn.disabled = !current;
      var saved = kit.ringSize();
      useL.textContent = current && saved === current.us ? T('used', { n: kit.sizeWord(current.us) }) : T('use');
      useBtn.classList.toggle('is-done', !!(current && saved === current.us));
      markTable(current ? current.us : null);
    }
    useBtn.addEventListener('click', function () {
      if (!current) return;
      AU.store.set('ringSize', current.us);
      AU.store.set('ringDia', dia);
      AU.store.set('pxmm', pxmm);
      var b = AU.store.get('bespoke', null);
      if (b && typeof b === 'object') { b.size = current.us; AU.store.set('bespoke', b); }
      AU.emit('ringSize', current.us);
      AU.sparkleAt(useBtn);
      AU.toast(T('usedToast', { n: kit.sizeWord(current.us) }), 'ring');
      shown = null; result();
      nextEl.hidden = false;
    });

    /* ---------- steps ---------- */
    var sns = AU.$$('[data-sz-sn]', root), panes = AU.$$('[data-sz-pane]', root);
    function go(n, focus) {
      step = n;
      tool.setAttribute('data-step', n);
      sns.forEach(function (s) { var k = +s.getAttribute('data-sz-sn'); s.classList.toggle('is-on', k === n); s.classList.toggle('is-done', k < n); });
      panes.forEach(function (p) {
        var on = +p.getAttribute('data-sz-pane') === n;
        p.classList.toggle('is-on', on);
        if (on) p.removeAttribute('inert'); else p.setAttribute('inert', '');
        p.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      if (n === 2) { AU.store.set('pxmm', pxmm); calEl.textContent = ''; layoutRing(); }
      if (focus) { var h = AU.$('[data-sz-pane="' + n + '"] .sz__h', root); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
    }
    $('[data-sz-done]').addEventListener('click', function () { go(2, true); });
    $('[data-sz-back]').addEventListener('click', function () { go(1, true); });

    /* ---------- chart, print, tips ---------- */
    var table = $('[data-sz-table]');
    table.innerHTML = '<caption class="sr-only">' + AU.esc(T('chartTitle')) + '</caption><thead><tr>' +
      '<th scope="col" class="caps caps--sm">' + AU.esc(T('chartUS')) + '</th><th scope="col" class="caps caps--sm">' + AU.esc(T('chartUK')) + '</th>' +
      /* the EU size IS the inner circumference in millimetres (ISO 8653), so it is the one circumference column: a
         second, computed one would print near-identical figures that disagree in the last digit */
      '<th scope="col" class="caps caps--sm">' + AU.esc(T('chartEU')) + ' <span class="sz__unit">' + AU.esc(T('chartEUunit')) + '</span></th>' +
      '<th scope="col" class="caps caps--sm">' + AU.esc(T('chartD')) + ' <span class="sz__unit">mm</span></th></tr></thead><tbody>' +
      rows().map(function (r) {
        return '<tr data-us="' + r.us + '"><th scope="row"><span class="num">' + kit.sizeWord(r.us) + '</span></th><td>' + AU.nums(r.uk) + '</td><td>' + AU.nums(r.eu) + '</td>' +
          '<td><span class="num">' + kit.dec(r.d, 1) + '</span></td></tr>';
      }).join('') + '</tbody>';
    var trs = AU.$$('tbody tr', table);
    function markTable(us) { trs.forEach(function (tr) { tr.classList.toggle('is-on', +tr.getAttribute('data-us') === us); }); }
    $('[data-sz-mini]').innerHTML = stripSVG('sz__strip');
    $('[data-sz-sheet]').innerHTML = sheetHTML();
    // the shortcut to the chart: lands with the heading clear of the header (and moves the focus there, as any in-page
    // link does)
    AU.$$('.sz__jump a[href^="#"]', root).forEach(function (a) {
      a.addEventListener('click', function (e) {
        var t = document.getElementById(a.getAttribute('href').slice(1));
        if (!t || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        var hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head-h')) || 80;
        var y = t.getBoundingClientRect().top + window.scrollY - hh - 28;
        if (AU.scrollTo) AU.scrollTo(y, { immediate: !!AU.reduced }); else window.scrollTo(0, y);
        t.setAttribute('tabindex', '-1');
        try { t.focus({ preventScroll: true }); } catch (err) { t.focus(); }
      });
    });
    // the paper sizer's own button, and the shortcut under the page's lede
    AU.$$('[data-sz-print]', root).forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
    var tips = AU.t('ui.bespoke.size.tips');
    $('[data-sz-tips]').innerHTML = (Array.isArray(tips) ? tips : []).map(function (t) { return '<li class="body">' + AU.nums(t) + '</li>'; }).join('');

    /* ---------- start ---------- */
    result();
    go(step, false);
    var ro = null;
    kit.whenAttached(root, function () {
      layoutCard(); layoutRing();
      if ('ResizeObserver' in window) {
        var raf = 0;
        ro = new ResizeObserver(function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { if (!leaving) { layoutCard(); layoutRing(); } }); });
        ro.observe(cardPad); ro.observe(ringPad);
      }
    }, ctx);
    if (calibrated) calEl.textContent = T('calibrated', { v: kit.dec(pxmm) });

    return function () { leaving = true; clearTimeout(liveT); if (ro) ro.disconnect(); };
  }

  AU.ready(function () {
    if (!AU.router) return;
    AU.router.add('/size', {
      name: 'size',
      title: function () { return AU.t('ui.bespoke.meta.size.title'); },
      description: function () { return AU.t('ui.bespoke.meta.size.description'); },
      jsonld: function () {
        return { '@context': 'https://schema.org', '@type': 'HowTo', name: T('howTo'),
          step: [{ '@type': 'HowToStep', name: T('step1Title'), text: T('step1Text') }, { '@type': 'HowToStep', name: T('step2Title'), text: T('step2Text') }] };
      },
      render: render
    });
  });
})();
