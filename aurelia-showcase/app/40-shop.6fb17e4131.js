/* ---- 40-shop.js ---- */
/* Aurelia shop core (v2). Shared by the shop pages (41-shop-list.js, 42-shop-piece.js, 43-shop-compare.js,
   44-shop-checkout.js) and by other areas:
     AU.shop.addToBag(item, originEl)   adds to the bag, plays the box opening (if the 3D engine has it), then opens the bag
     AU.shop.openBag('bag' | 'saved')
     AU.shop.material(spec)             "18k Rose Gold · Ruby"
     AU.shop.still(host, spec, {size, eager})   a pre-rendered still of a piece (lazy, cross-fades on mode change)
     AU.shop.card(product)              a boutique card (<li>) with the 360° hover turn, heart and compare toggle
     AU.shop.compare                    { list, has, toggle(id, btn), remove(id), clear() }  (event 'compare')
   Owns the bag drawer (#bag) and the compare tray (#ctray) from src/html/40-shop.html. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.extendContent) return;
  var S = (AU.shop = AU.shop || {});
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- words ---------- */
  var T = S.t = function (k, v) { return AU.t('ui.shop.' + k, v); };
  var C = function () { return AU.content; };
  S.NAMES = ['collections', 'collection', 'boutique', 'piece', 'compare', 'checkout'];
  S.TYPES = ['ring', 'bracelet', 'earrings', 'pendant'];
  S.SLUG = { ring: 'rings', bracelet: 'bracelets', earrings: 'earrings', pendant: 'pendants' };
  S.normType = function (t) {
    t = String(t || '').toLowerCase();
    var m = { rings: 'ring', ring: 'ring', bracelets: 'bracelet', bracelet: 'bracelet', earrings: 'earrings', earring: 'earrings', pendants: 'pendant', pendant: 'pendant', necklaces: 'pendant' };
    return m[t] || null;
  };
  S.collection = function (id) { return (C().collections || []).find(function (c) { return c.id === id; }) || null; };
  S.products = function () { return C().products || []; };
  S.metalName = function (m) { var x = T('metals.' + m); return x.indexOf('ui.shop') === 0 ? '' : x; };
  S.stoneName = function (s) { var x = T('stones.' + (s || 'none')); return x.indexOf('ui.shop') === 0 ? '' : x; };
  S.material = function (spec) {
    if (!spec) return '';
    var m = S.metalName(spec.metal);
    return spec.stone ? m + ' · ' + S.stoneName(spec.stone) : m;
  };
  S.sizeLabel = function (s) { return String(s).replace('.5', '½'); };
  /* ---------- ring sizes: one source for every way a ring reaches the bag ----------
     S.savedSize()            the US size saved by /size ("Use this size"), if it is one we make; else null
     S.ringMeta(p, size)      the bag line text: "18k White Gold · Sapphire · Size 7" (the saved size by default),
                              "… · Size to be confirmed" only when no size is known; non-rings: the material alone
     S.sizeRow(us)            the size chart row for a US size (content.ringSizes: { us, uk, eu, d, c }) or null
     S.sizeOptionLabel(us)    what a size option reads in the visitor's language and currency: "US 6" in English,
                              "US 6 · UK L½" with pounds, "52 (US 6)" in French and German (EU sizes lead there) */
  var sizesList = function () { return (C().bespoke && C().bespoke.sizes) || []; };
  S.savedSize = function () {
    var s = AU.store.get('ringSize', null);
    if (s == null || s === '') return null;
    var list = sizesList();
    var hit = list.filter(function (x) { return String(x) === String(s) || +x === +s; })[0];
    return hit != null ? hit : (list.length ? null : s);
  };
  S.ringMeta = function (p, size) {
    var spec = (p && p.spec) || p || {};
    var mat = S.material(spec);
    if (spec.type !== 'ring') return mat;
    if (size === undefined) size = S.savedSize();
    return mat + ' · ' + (size != null && size !== '' ? T('size', { s: S.sizeLabel(size) }) : T('sizeTbc'));
  };
  S.sizeRow = function (us) {
    var chart = C().ringSizes || [];   // the /size chart (02-content-bespoke.js), the same table the size finder uses
    return chart.filter(function (r) { return r && +r.us === +us; })[0] || null;
  };
  S.sizeOptionLabel = function (us) {
    var row = S.sizeRow(us), lbl = S.sizeLabel(us);
    if (row && (AU.lang === 'fr' || AU.lang === 'de') && row.eu != null) return T('piece.sizeOptionEU', { eu: row.eu, s: lbl });
    if (row && AU.currency === 'GBP' && row.uk) return T('piece.sizeOptionUK', { uk: row.uk, s: lbl });
    return T('piece.sizeOption', { s: lbl });
  };
  S.sizeUnit = function () {
    if (AU.lang === 'fr' || AU.lang === 'de') return T('piece.sizeUnitEU');
    if (AU.currency === 'GBP') return T('piece.sizeUnitUK');
    return T('piece.sizeUnit');
  };
  S.plural = function (n) { return T(n === 1 ? 'pieceOne' : 'pieces', { n: n }); };
  S.esc = AU.esc;

  /* ---------- extra icons in the house style (thin outlines, 1.25px, 24 box) ---------- */
  var XI = {
    compare: '<rect x="3.5" y="4.5" width="7" height="15" rx="1"/><rect x="13.5" y="4.5" width="7" height="15" rx="1"/>',
    share: '<path d="M12 14.5v-11M8 7.5l4-4 4 4"/><path d="M8 10.5H6A1.5 1.5 0 0 0 4.5 12v6.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5h-2"/>',
    camera: '<path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.6l1.6-2.5h5.6L16.4 7H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z"/><circle cx="12" cy="12.6" r="3.6"/>',
    loupe: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.3 15.3l5.2 5.2M10.5 8v5M8 10.5h5"/>',
    light: '<path d="M9.5 17.5h5M10.5 20.5h3"/><path d="M12 3.5a5.5 5.5 0 0 0-3.2 10c.7.5 1.2 1.3 1.2 2.2v.8h4v-.8c0-.9.5-1.7 1.2-2.2A5.5 5.5 0 0 0 12 3.5Z"/>',
    turn: '<ellipse cx="12" cy="13" rx="8.5" ry="4"/><path d="M12 4.5v5M9.8 7.2 12 9.5l2.2-2.3"/>',
    refine: '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    pen: '<path d="M4.5 19.5l1-4 10-10a2.1 2.1 0 0 1 3 3l-10 10-4 1Z"/><path d="M14 7l3 3"/>'
  };
  S.icon = function (name, o) {
    o = o || {};
    if (!XI[name]) return AU.icon(name, o);
    var s = o.size || 22;
    var a = o.label ? ' role="img" aria-label="' + AU.esc(o.label) + '"' : ' aria-hidden="true" focusable="false"';
    return '<svg class="ico' + (o.cls ? ' ' + o.cls : '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24"' + a + '>' + XI[name] + '</svg>';
  };

  /* ---------- page meta outside a navigation (filters change the address without a new page) ---------- */
  S.setMeta = function (title, desc) {
    var brand = (C().brand && C().brand.name) || 'Aurelia';
    if (title) document.title = title + ' — ' + brand;
    var md = document.querySelector('meta[name="description"]');
    if (desc && md) md.setAttribute('content', desc);
  };
  /* The address of a filtered view is replaced in place: the router would re-render the whole page for a new query,
     and a filter must glide, not reload. AU.router.setQuery (if core adds it) keeps the router's own record in step. */
  S.replaceUrl = function (full) {
    if (AU.router && AU.router.setQuery) { AU.router.setQuery(full); return; }
    try { history.replaceState(history.state, '', AU.router.href(full)); } catch (e) {}
    var cur = AU.router && AU.router.current;
    if (cur) {
      var i = full.indexOf('?'), q = {};
      if (i >= 0) full.slice(i + 1).split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
      cur.path = (i >= 0 ? full.slice(0, i) : full) || '/'; cur.query = q;
    }
    var can = document.querySelector('link[rel="canonical"]');
    var site = (C().config && C().config.siteUrl) || '';
    if (can) can.href = site.replace(/\/$/, '') + (i >= 0 ? full.slice(0, i) : full);
  };

  /* A promise that resolves once the house's three faces are in (or after `cap` ms). A page whose layout centres a
     block of text against a fixed frame (/collections/:id) waits for it before it is shown, so the swap from the
     fallback faces cannot re-flow the title and move the block on a first visit. Once the faces are loaded it resolves
     at once, so later navigations are not delayed. */
  var FACES = ['400 64px "Alex Brush"', '300 16px "Cormorant Garamond"', '400 16px "Cormorant Infant"'];
  S.fontsSettled = function (cap) {
    var fs = document.fonts;
    if (!fs || !fs.load || !fs.check) return Promise.resolve();
    if (FACES.every(function (f) { try { return fs.check(f); } catch (e) { return true; } })) return Promise.resolve();
    var all = Promise.all(FACES.map(function (f) { return fs.load(f).catch(function () {}); }));
    return Promise.race([all, new Promise(function (r) { setTimeout(r, cap || 700); })]);
  };

  /* fn() once the page `el` is in the document and the transition has landed (the router's 'route' event), with a
     fallback in case no event comes; measuring before that would read an element that is not laid out yet */
  S.onLanded = function (el, ctx, fn) {
    var done = false;
    var go = function () { if (done || !el.isConnected) return; done = true; off(); clearTimeout(t); fn(); };
    var off = AU.on('route', function () { go(); });
    var t = setTimeout(go, 2600);
    ctx.onLeave(function () { done = true; off(); clearTimeout(t); });
  };

  /* =====================================================================================================
     LINE ART: the fallback picture of a piece when there is neither a pre-rendered file nor WebGL.
     Fine outlines in the text colour, stones filled with a soft gradient of their colour. 200 x 200 box.
     ===================================================================================================== */
  var uid = 0;
  var GEM = {
    diamond: ['#f4f8fc', '#9fb2c6', '#e9f1ff'], ruby: ['#ff8c96', '#8c0a18', '#e0303f'],
    emerald: ['#8ff0c0', '#0b6a3c', '#26b06a'], sapphire: ['#a8bcff', '#16308a', '#3d64e0'], none: ['#ffffff', '#ffffff', '#fff3e6']
  };
  var f1 = function (n) { return Math.round(n * 10) / 10; };
  var pts = function (a) { return a.map(function (p) { return f1(p[0]) + ',' + f1(p[1]); }).join(' '); };
  var line = function (x1, y1, x2, y2, o) { return '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '"' + (o ? ' stroke-opacity="' + o + '"' : '') + '/>'; };
  var ell = function (cx, cy, rx, ry, o) { return '<ellipse cx="' + f1(cx) + '" cy="' + f1(cy) + '" rx="' + f1(rx) + '" ry="' + f1(ry) + '"' + (o ? ' stroke-opacity="' + o + '"' : '') + '/>'; };
  var arc = function (cx, cy, rx, ry, a0, a1, o) {
    var r0 = a0 * Math.PI / 180, r1 = a1 * Math.PI / 180;
    var x0 = cx + rx * Math.cos(r0), y0 = cy + ry * Math.sin(r0), x1 = cx + rx * Math.cos(r1), y1 = cy + ry * Math.sin(r1);
    return '<path d="M' + f1(x0) + ' ' + f1(y0) + 'A' + f1(rx) + ' ' + f1(ry) + ' 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' ' + (a1 > a0 ? 1 : 0) + ' ' + f1(x1) + ' ' + f1(y1) + '"' + (o ? ' stroke-opacity="' + o + '"' : '') + '/>';
  };
  var gemSide = function (cx, gy, w, cut, fill) {
    var h = w / 2, s = '';
    if (cut === 'emerald') {
      var tY = gy - w * .24, k = gy + w * .42;
      var outline = [[cx - h * .7, tY], [cx + h * .7, tY], [cx + h, gy], [cx + h * .45, k], [cx - h * .45, k], [cx - h, gy]];
      s += '<polygon points="' + pts(outline) + '" fill="url(#' + fill + ')" stroke="none"/><polygon points="' + pts(outline) + '"/>';
      s += line(cx - h, gy, cx + h, gy) + line(cx - h * .85, gy - w * .12, cx + h * .85, gy - w * .12, .55) + line(cx - h * .78, gy + w * .14, cx + h * .78, gy + w * .14, .5);
      return s;
    }
    h *= (cut === 'oval' || cut === 'cushion') ? 1.08 : 1;
    var tY2 = gy - w * .26, cY = gy + w * .52, th = h * .52;
    var o = [[cx - th, tY2], [cx + th, tY2], [cx + h, gy], [cx, cY], [cx - h, gy]];
    s += '<polygon points="' + pts(o) + '" fill="url(#' + fill + ')" stroke="none"/><polygon points="' + pts(o) + '"/>' + line(cx - h, gy, cx + h, gy);
    s += line(cx - th, tY2, cx - h * .55, gy, .55) + line(cx + th, tY2, cx + h * .55, gy, .55);
    s += line(cx - h * .55, gy, cx, cY, .45) + line(cx + h * .55, gy, cx, cY, .45);
    return s;
  };
  var gemTop = function (cx, cy, r, fill) {
    var s = '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '" fill="url(#' + fill + ')" stroke="none"/><circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '"/>';
    var oct = [], i, a;
    for (i = 0; i < 8; i++) { a = (i / 8) * Math.PI * 2 + Math.PI / 8; oct.push([cx + Math.cos(a) * r * .5, cy + Math.sin(a) * r * .5]); }
    s += '<polygon points="' + pts(oct) + '" stroke-opacity=".6"/>';
    for (i = 0; i < 8; i++) { a = (i / 8) * Math.PI * 2 + Math.PI / 8; s += line(oct[i][0], oct[i][1], cx + Math.cos(a + Math.PI / 8) * r, cy + Math.sin(a + Math.PI / 8) * r, .4); }
    return s;
  };
  var pear = function (cx, top, w, hgt, fill) {
    var bot = top + hgt, r = w / 2, cy = bot - r;
    var d = 'M' + f1(cx) + ' ' + f1(top) + 'C' + f1(cx + r * .35) + ' ' + f1(top + hgt * .3) + ' ' + f1(cx + r) + ' ' + f1(cy - r * .55) + ' ' + f1(cx + r) + ' ' + f1(cy) +
      'A' + f1(r) + ' ' + f1(r) + ' 0 0 1 ' + f1(cx - r) + ' ' + f1(cy) + 'C' + f1(cx - r) + ' ' + f1(cy - r * .55) + ' ' + f1(cx - r * .35) + ' ' + f1(top + hgt * .3) + ' ' + f1(cx) + ' ' + f1(top) + 'Z';
    return '<path d="' + d + '" fill="url(#' + fill + ')" stroke="none"/><path d="' + d + '"/>' + line(cx, top, cx, top + hgt * .3, .45);
  };
  var pave = function (cx, cy, rx, ry, n, r, a0, a1, fill) {
    var s = '';
    for (var i = 0; i < n; i++) {
      var a = (a0 + (a1 - a0) * (i + .5) / n) * Math.PI / 180, depth = (Math.sin(a) + 1) / 2;
      s += '<circle cx="' + f1(cx + rx * Math.cos(a)) + '" cy="' + f1(cy + ry * Math.sin(a)) + '" r="' + f1(r * (.7 + depth * .45)) + '" fill="url(#' + fill + ')" stroke-opacity="' + f1(.35 + depth * .5) + '"/>';
    }
    return s;
  };
  S.art = function (spec) {
    spec = spec || { type: 'ring', style: 'band', metal: 'yellow' };
    var id = 'aus' + (++uid), g = GEM[spec.stone] || GEM.diamond, acc = GEM.diamond;
    if (!spec.stone) g = GEM.none;
    var gF = id + 'g', aF = id + 'a', glow = id + 'w';
    var car = AU.clamp(+spec.carat || .5, .1, 3), body = '', gx = 100, gy = 100, gr = 52, gOp = spec.stone ? .42 : .16;
    var type = spec.type, style = spec.style;
    if (type === 'ring') {
      var cx = 98, cy = 132, rx = 37, ry = 46, irx = 30.5, iry = 39.5;
      var band = ell(cx, cy, rx, ry) + ell(cx, cy, irx, iry, .8) + arc(cx + 7, cy, rx, ry, -90, 90, .42) + arc(cx + 6, cy, irx, iry, 90, 270, .34);
      if (style === 'eternity') { body += band + pave(cx + 1, cy, (rx + irx) / 2 + .5, (ry + iry) / 2 + .5, 26, 3.2, -90, 270, gF); gx = cx; gy = cy; gr = 64; }
      else if (style === 'band') { body += band + arc(cx, cy, rx - 1.5, ry - 1.5, 200, 250, .5); gx = cx; gy = cy; gr = 60; }
      else {
        var w = AU.clamp(20 + car * 10, 22, 42), gyy = cy - ry - w * .52 - 5, top = cy - ry;
        body += band + line(gx - w * .38, gyy + 1, cx - 7, top + 2, .7) + line(gx + w * .38, gyy + 1, cx + 7, top + 2, .7);
        if (style === 'halo') body += pave(gx, gyy + 1, w * .5 + 5, 4.2, 13, 1.9, 0, 360, aF);
        if (style === 'three-stone') {
          var sw = w * .6;
          body += '<g transform="rotate(-14 ' + f1(gx - w * .5 - sw * .5) + ' ' + f1(gyy + 8) + ')">' + gemSide(gx - w * .5 - sw * .5 - 1, gyy + 8, sw, 'round', aF) + '</g>';
          body += '<g transform="rotate(14 ' + f1(gx + w * .5 + sw * .5) + ' ' + f1(gyy + 8) + ')">' + gemSide(gx + w * .5 + sw * .5 + 1, gyy + 8, sw, 'round', aF) + '</g>';
        }
        body += gemSide(gx, gyy, w, spec.cut, gF);
        gy = gyy; gr = 30 + w;
      }
    } else if (type === 'bracelet') {
      var bx = 100, by = 108;
      if (style === 'tennis') { body += ell(bx, by, 76, 34, .5) + ell(bx, by, 68, 29, .32) + pave(bx, by + .5, 72, 31.5, 34, 3.5, -90, 270, gF); gy = by + 18; gr = 70; }
      else if (style === 'bangle') { body += ell(bx, by - 3, 76, 36) + ell(bx, by - 4, 68, 30, .7) + arc(bx, by + 4, 76, 36, 0, 180, .55); gy = by; gr = 74; }
      else {
        body += arc(bx, by - 3, 76, 36, 108, 432, 1) + arc(bx, by - 4, 68, 30, 112, 428, .65);
        var a1 = 108 * Math.PI / 180, a2 = 72 * Math.PI / 180;
        body += '<ellipse cx="' + f1(bx + 72 * Math.cos(a1) - 2) + '" cy="' + f1(by + 33 * Math.sin(a1)) + '" rx="7" ry="5" fill="url(#' + gF + ')"/>';
        body += '<ellipse cx="' + f1(bx + 72 * Math.cos(a2) + 2) + '" cy="' + f1(by + 33 * Math.sin(a2)) + '" rx="7" ry="5" fill="url(#' + gF + ')"/>';
        gy = by + 30; gr = 54;
      }
      gx = bx;
    } else if (type === 'earrings') {
      [70, 130].forEach(function (x, k) {
        var dy = k ? 6 : 0;
        if (style === 'stud') body += gemTop(x, 96 + dy, AU.clamp(12 + car * 12, 12, 24), gF);
        else if (style === 'hoop') body += ell(x, 104 + dy, 21, 36) + ell(x, 104 + dy, 17, 32, .55) + pave(x, 104 + dy, 19, 34, 9, 2.4, 20, 160, gF);
        else { var pw = AU.clamp(18 + car * 10, 18, 30); body += gemTop(x, 62 + dy, 6.5, aF) + line(x, 68.5 + dy, x, 82 + dy, .7) + pear(x, 88 + dy, pw, pw * 1.9, gF); }
      });
      gy = style === 'drop' ? 118 : 100; gr = 78;
    } else {
      body += '<path d="M28 -4C46 52 76 84 98 92" stroke-dasharray="1.2 2.6" stroke-opacity=".75"/><path d="M172 -4C154 52 124 84 102 92" stroke-dasharray="1.2 2.6" stroke-opacity=".75"/>' + ell(100, 96, 3, 5.5, .9);
      if (style === 'drop') { var dw = AU.clamp(22 + car * 10, 22, 36); body += gemTop(100, 108.5, 5, aF) + line(100, 113.5, 100, 118, .7) + pear(100, 119, dw, dw * 1.85, gF); gy = 119 + dw; gr = 52; }
      else { var pr = AU.clamp(12 + car * 10, 12, 24); body += line(100, 101.5, 100, 106, .7) + gemTop(100, 107 + pr, pr, gF); gy = 107 + pr; gr = 48; }
    }
    var defs = '<defs><radialGradient id="' + glow + '"><stop offset="0" stop-color="' + g[2] + '" stop-opacity="' + gOp + '"/><stop offset="1" stop-color="' + g[2] + '" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + gF + '" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="' + g[0] + '" stop-opacity=".95"/><stop offset=".55" stop-color="' + g[2] + '" stop-opacity=".7"/><stop offset="1" stop-color="' + g[1] + '" stop-opacity=".85"/></linearGradient>' +
      '<linearGradient id="' + aF + '" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="' + acc[0] + '" stop-opacity=".9"/><stop offset="1" stop-color="' + acc[1] + '" stop-opacity=".6"/></linearGradient></defs>';
    return '<svg class="art" viewBox="0 0 200 200" aria-hidden="true" focusable="false">' + defs +
      '<circle cx="' + f1(gx) + '" cy="' + f1(gy) + '" r="' + f1(gr) + '" fill="url(#' + glow + ')"/>' +
      '<g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">' + body.replace(/\/>/g, ' vector-effect="non-scaling-stroke"/>') + '</g></svg>';
  };

  /* =====================================================================================================
     STILLS: one pre-rendered image per piece (AU.img), requested only when its frame comes near the screen,
     faded in once decoded. On a light/dark switch the stills near the screen cross-fade to the other render;
     the others follow when they next come near. Without any image the line art stands in.
     ===================================================================================================== */
  var stills = new Set();
  var nearIO = hasIO ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var r = e.target.__still;
      if (!r || r.dead) return;
      r.near = e.isIntersecting;
      if (r.near && r.mode !== AU.getMode()) loadStill(r);
    });
  }, { rootMargin: '480px 0px 480px 0px' }) : null;

  var showArt = function (rec) {
    if (rec.host.querySelector('.pc__art')) return;
    rec.host.insertAdjacentHTML('afterbegin', '<span class="pc__art">' + S.art(rec.spec) + '</span>');
    rec.host.classList.add('has-art');
  };
  var loadStill = function (rec) {
    var mode = AU.getMode();
    if (rec.mode === mode) return;
    rec.mode = mode;
    var gen = ++rec.gen;
    var p;
    try { p = AU.img(rec.spec, { size: rec.size, mode: mode }); } catch (e) { p = Promise.resolve(null); }
    Promise.resolve(p).then(function (url) {
      if (rec.dead || gen !== rec.gen) return;
      if (!url) { showArt(rec); return; }
      if (rec.url === url) return;
      var img = document.createElement('img');
      img.className = 'pc__img'; img.alt = ''; img.decoding = 'async'; img.draggable = false;
      img.width = img.height = rec.size;
      if (!rec.eager) img.loading = 'lazy';
      var done = false;
      var on = function () {
        if (done || rec.dead || gen !== rec.gen) return;
        done = true;
        requestAnimationFrame(function () {
          img.classList.add('is-on');
          rec.host.classList.add('has-img');
          var old = rec.img; rec.img = img; rec.url = url;
          if (old && old !== img) { old.classList.remove('is-on'); setTimeout(function () { old.remove(); }, 1000); }
          if (rec.onload) rec.onload(url);
        });
      };
      img.addEventListener('load', function () { (img.decode ? img.decode() : Promise.resolve()).then(on, on); });
      img.addEventListener('error', function () { if (!rec.img) showArt(rec); });
      img.src = url;
      rec.host.appendChild(img);
      if (img.complete && img.naturalWidth) (img.decode ? img.decode() : Promise.resolve()).then(on, on);
    }, function () { if (!rec.dead && gen === rec.gen) showArt(rec); });
  };
  /* host: an empty element that keeps its own size (aspect-ratio in CSS). o.size: pixels wanted (480/960 files exist),
     o.eager: request at once (the product stage, bag thumbnails). Returns the record; rec.onload(url) is called when
     an image is shown, rec.url is the current image. */
  S.still = function (host, spec, o) {
    o = o || {};
    if (host.__still) { host.__still.dead = true; stills.delete(host.__still); if (nearIO) nearIO.unobserve(host); }
    host.classList.add('pc');
    host.classList.remove('has-img', 'has-art');
    host.setAttribute('data-ptype', (spec && spec.type) || '');
    AU.$$('.pc__img, .pc__art', host).forEach(function (n) { n.remove(); });
    var rec = { host: host, spec: spec, size: o.size || 640, img: null, url: null, mode: null, near: false, dead: false, gen: 0, eager: !!o.eager, onload: o.onload || null };
    host.__still = rec;
    stills.add(rec);
    if (o.eager || !nearIO) loadStill(rec); else nearIO.observe(host);
    return rec;
  };
  var pruneStills = function () {
    stills.forEach(function (r) {
      if (!r.host.isConnected) { r.dead = true; stills.delete(r); if (nearIO) nearIO.unobserve(r.host); }
    });
  };

  /* =====================================================================================================
     360° TURN on hover: the piece's spin sheet (AU.spinImg: a grid of frames, row by row) is fetched only on hover
     intent, decoded off screen, then laid over the still on frame 0 (the same picture as the still, so the hand-over
     cannot be seen). The pointer scrubs the turn; on leaving, the piece eases back to the front and the still returns.
     Frames are shown by background-position (whole frames only: blending two frames would double the piece).
     ===================================================================================================== */
  var spins = new Set();
  S.spin = function (zone, host, spec, o) {
    o = o || {};
    if (AU.touch) return null;
    var s = { state: 0, n: 1, cols: 1, rows: 1, f: 0, target: 0, base: 0, ptr: 0, hover: false, off: null, layer: null, i: -1,
      x0: 0, w: 1, intentT: 0, gen: 0, mode: null, size: o.size || 400, dead: false, host: host };
    var paint = function (i) {
      if (i === s.i || !s.layer) return;
      s.i = i;
      var c = i % s.cols, r = Math.floor(i / s.cols);
      s.layer.style.backgroundPosition = (s.cols > 1 ? (c / (s.cols - 1) * 100).toFixed(4) : 0) + '% ' + (s.rows > 1 ? (r / (s.rows - 1) * 100).toFixed(4) : 0) + '%';
    };
    var frameOf = function (f) { var n = s.n; return ((Math.round(f) % n) + n) % n; };
    var halt = function () {
      if (s.off) { s.off(); s.off = null; }
      if (host.classList.contains('is-spinning')) {
        // back on frame 0: the still returns underneath at once, then the sheet fades away over it
        host.classList.add('is-back');
        clearTimeout(s.backT);
        s.backT = setTimeout(function () { host.classList.remove('is-back'); }, 450);
      }
      host.classList.remove('is-spinning');
      s.f = s.base = s.ptr = 0;
    };
    var step = function (t, dt) {
      var target = s.base + s.ptr;
      s.f += (target - s.f) * Math.min(1, dt * 6);
      if (!s.hover && Math.abs(target - s.f) < .04) { s.f = target; paint(frameOf(s.f)); halt(); return; }
      paint(frameOf(s.f));
    };
    var run = function () {
      if (s.state !== 2 || s.off || AU.reduced || s.dead) return;
      paint(frameOf(s.f));
      s.off = AU.tick(step);
      requestAnimationFrame(function () { if (s.off) host.classList.add('is-spinning'); });
    };
    var load = function () {
      if (s.dead || AU.reduced || s.state === 1) return;
      var mode = AU.getMode();
      if (s.state === 2 && s.mode === mode) { run(); return; }
      if (s.state === 3 && s.mode === mode) return;
      s.state = 1; s.mode = mode;
      var gen = ++s.gen;
      var p;
      try { p = AU.spinImg(spec, { size: s.size, mode: mode }); } catch (e) { p = Promise.resolve(null); }
      Promise.resolve(p).then(function (r) {
        if (gen !== s.gen || s.dead) return;
        if (!r || !r.url) { s.state = 3; return; }
        var im = new Image();
        im.decoding = 'async';
        im.src = r.url;
        (im.decode ? im.decode() : new Promise(function (res, rej) { im.onload = res; im.onerror = rej; })).then(function () {
          if (gen !== s.gen || s.dead) return;
          s.n = Math.max(1, r.frames || 1);
          s.cols = Math.max(1, r.cols || s.n);
          s.rows = Math.max(1, r.rows || Math.ceil(s.n / s.cols));
          if (!s.layer) { s.layer = document.createElement('div'); s.layer.className = 'pc__spin'; s.layer.setAttribute('aria-hidden', 'true'); host.appendChild(s.layer); }
          s.layer.style.backgroundImage = 'url("' + r.url + '")';
          s.layer.style.backgroundSize = (s.cols * 100) + '% ' + (s.rows * 100) + '%';
          s.i = -1; s.state = 2;
          if (s.hover) run();
        }, function () { if (gen === s.gen) s.state = 3; });
      }, function () { if (gen === s.gen) s.state = 3; });
    };
    var onEnter = function (e) {
      if (e.pointerType === 'touch' || AU.reduced) return;
      var r = zone.getBoundingClientRect();
      s.hover = true; s.x0 = e.clientX; s.w = r.width || 1;
      s.base = s.f; s.ptr = 0;
      clearTimeout(s.intentT);
      if (s.state === 2 && s.mode === AU.getMode()) run();
      else s.intentT = setTimeout(load, 110);   // hover intent: a pointer just passing over does not fetch anything
    };
    var onMove = function (e) {
      if (e.pointerType === 'touch') return;
      if (s.hover) s.ptr = (e.clientX - s.x0) / s.w * s.n * .6;   // a sweep across the frame turns the piece a little over half way
    };
    var onLeave = function (e) {
      if (e.pointerType === 'touch') return;
      clearTimeout(s.intentT);
      s.hover = false;
      var cur = s.base + s.ptr; s.ptr = 0;
      s.base = Math.round(cur / s.n) * s.n;   // back to the front by the shorter way
    };
    zone.addEventListener('pointerenter', onEnter);
    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerleave', onLeave);
    s.stale = function () { s.gen++; s.state = 0; s.mode = null; if (!s.hover) halt(); };
    s.dispose = function () { s.dead = true; clearTimeout(s.intentT); halt(); spins.delete(s); };
    spins.add(s);
    return s;
  };
  var pruneSpins = function () { spins.forEach(function (s) { if (!s.host.isConnected) s.dispose(); }); };

  /* pointer light: a soft glow follows the pointer across a frame (--mx / --my), set at most once a frame */
  S.light = function (el) {
    var q = false, x = 0, y = 0, r = null;
    el.addEventListener('pointerenter', function () { r = null; });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      x = e.clientX; y = e.clientY;
      if (q) return; q = true;
      requestAnimationFrame(function () {
        q = false;
        r = r || el.getBoundingClientRect();
        el.style.setProperty('--mx', ((x - r.left) / r.width * 100).toFixed(1) + '%');
        el.style.setProperty('--my', ((y - r.top) / r.height * 100).toFixed(1) + '%');
      });
    });
    window.addEventListener('scroll', function () { r = null; }, { passive: true });
  };

  /* =====================================================================================================
     WISHLIST and COMPARE state
     ===================================================================================================== */
  S.toggleWish = function (id, btn) {
    var on = AU.wish.toggle(id);
    if (on && btn) AU.sparkleAt(btn, { count: 7, spread: 44 });
    AU.toast(T(on ? 'savedToast' : 'unsavedToast'), 'heart');
    return on;
  };
  var cmp = AU.store.get('compare', []);
  if (!Array.isArray(cmp)) cmp = [];
  var saveCmp = function () { AU.store.set('compare', cmp); AU.emit('compare', cmp.slice()); };
  S.compare = {
    max: 3,
    list: function () { return cmp.filter(function (id) { return !!AU.product(id); }); },
    has: function (id) { return cmp.indexOf(id) >= 0; },
    toggle: function (id, btn) {
      if (S.compare.has(id)) { cmp = cmp.filter(function (x) { return x !== id; }); saveCmp(); return false; }
      cmp = S.compare.list();
      if (cmp.length >= 3) { AU.toast(T('compareFull'), 'square'); return false; }
      cmp.push(id); saveCmp();
      if (btn) AU.sparkleAt(btn, { count: 5, spread: 34 });
      return true;
    },
    remove: function (id) { cmp = cmp.filter(function (x) { return x !== id; }); saveCmp(); },
    set: function (ids) { cmp = (ids || []).filter(function (id, i, a) { return AU.product(id) && a.indexOf(id) === i; }).slice(0, 3); saveCmp(); },
    clear: function () { cmp = []; saveCmp(); }
  };

  /* =====================================================================================================
     CARD: the boutique card. The whole card is one link (to the product page); the heart and the compare toggle sit
     above it. The picture carries data-vt="piece-<id>" so the page transition can fly it into the product stage.
     ===================================================================================================== */
  S.card = function (p, o) {
    o = o || {};
    var col = S.collection(p.collection);
    var li = document.createElement('li');
    li.className = 'grid__item';
    li.setAttribute('data-id', p.id);
    var href = '#/piece/' + encodeURIComponent(p.id);
    li.innerHTML =
      '<article class="card">' +
        '<div class="card__well">' +
          '<div class="card__piece" data-vt="piece-' + AU.esc(p.id) + '" role="img" aria-label="' + AU.esc(p.name + ', ' + S.material(p.spec)) + '"></div>' +
          (col && o.coll !== false ? '<span class="card__coll caps" aria-hidden="true">' + AU.esc(col.name) + '</span>' : '') +
        '</div>' +
        '<div class="card__info">' +
          '<h3 class="card__name caps"><a class="card__link" href="' + href + '">' + AU.nums(p.name) + '</a></h3>' +
          '<p class="card__mat">' + AU.esc(S.material(p.spec)) + '</p>' +
          '<p class="card__price">' + AU.price(p.price) + '</p>' +
        '</div>' +
        '<button class="card__wish" type="button" aria-pressed="false" data-card-wish>' + AU.icon('heart', { size: 19 }) + '</button>' +
        (o.compare === false ? '' :
        '<button class="card__cmp caps" type="button" aria-pressed="false" data-card-cmp><span class="card__box" aria-hidden="true">' + AU.icon('check', { size: 11 }) + '</span><span>' + AU.esc(T('compare')) + '</span></button>') +
      '</article>';
    var piece = AU.$('.card__piece', li), well = AU.$('.card__well', li);
    var wishB = AU.$('[data-card-wish]', li), cmpB = AU.$('[data-card-cmp]', li);
    S.still(piece, p.spec, { size: o.size || 640 });
    S.spin(li, piece, p.spec);
    S.light(well);
    var sync = function () {
      var w = AU.wish.has(p.id);
      wishB.setAttribute('aria-pressed', String(w));
      wishB.setAttribute('aria-label', T(w ? 'unsaveAria' : 'saveAria', { name: p.name }));
      if (cmpB) { cmpB.setAttribute('aria-pressed', String(S.compare.has(p.id))); cmpB.setAttribute('aria-label', T('compareAria', { name: p.name })); }
    };
    wishB.addEventListener('click', function (e) { e.preventDefault(); S.toggleWish(p.id, wishB); });
    if (cmpB) cmpB.addEventListener('click', function (e) { e.preventDefault(); S.compare.toggle(p.id, cmpB); });
    li.__sync = sync;
    sync();
    return li;
  };
  // every card on the page follows the wishlist and the compare set
  var syncCards = function () { AU.$$('.grid__item').forEach(function (li) { if (li.__sync) li.__sync(); }); };
  AU.on('wish', syncCards);
  AU.on('compare', syncCards);

  /* =====================================================================================================
     ADD TO BAG: the bag takes the piece, the velvet box opens (3D engine, when it has one and motion is welcome),
     the chime sounds, and the bag drawer slides in with the new line glinting. Without the box: a glint and a toast.
     ===================================================================================================== */
  var lastAdded = null;
  S.addToBag = function (item, originEl) {
    if (!item) return Promise.resolve();
    AU.cart.add(item);
    lastAdded = AU.cart.key(item);
    var fallback = function () {
      if (originEl && originEl.isConnected) AU.sparkleAt(originEl, { count: 10, spread: 80 });
      // integrator: the chime belongs here; with the box, its own 'box' sound already ends on one
      if (AU.sound && AU.sound.play) { try { AU.sound.play('chime'); } catch (e) {} }
      AU.toast(T('addedToast'), 'bag');
      setTimeout(function () { S.openBag('bag', originEl); }, AU.reduced ? 0 : 380);
    };
    if (AU.reduced) { fallback(); return Promise.resolve(); }
    return AU.gl.then(function (gl) {
      if (!gl || typeof gl.box !== 'function') { fallback(); return; }
      var p, opened = false, unwatch = null;
      /* One gesture, never a flicker: the drawer comes in UNDER the box as the box begins to leave (its last 0.6 s, or
         the quick fade of a skip), with its scrim already at full strength, so the page never un-dims between the two.
         The box has no exit callback, so its own layer is watched: its picture's opacity rises to 1, holds, then falls;
         the first fall is the moment. Reading an inline style once a frame costs nothing (no layout). If the box never
         shows (no engine, a failure), the drawer simply opens when its promise settles. */
      var open = function (handoff) {
        if (opened) return;
        opened = true;
        if (unwatch) { unwatch(); unwatch = null; }
        S.openBag('bag', originEl, { handoff: handoff });
      };
      try { p = gl.box(item.spec); } catch (e) { fallback(); return; }
      var layer = null, cv = null, peak = 0, t0 = performance.now();
      unwatch = AU.tick(function () {
        if (!layer || !layer.isConnected) { layer = document.querySelector('.ausb-box'); cv = null; }
        if (!layer) { if (performance.now() - t0 > 9000 && unwatch) { unwatch(); unwatch = null; } return; }
        if (!cv) cv = layer.querySelector('canvas');
        if (!cv) return;
        var o = parseFloat(cv.style.opacity);
        if (!(o >= 0)) return;
        if (o > peak) peak = o;
        if (peak > .92 && o < peak - .035) open(true);
      });
      return Promise.resolve(p).then(function () { open(false); }, function () { if (unwatch) { unwatch(); unwatch = null; } if (!opened) { opened = true; fallback(); } });
    }, fallback);
  };

  /* =====================================================================================================
     THE BAG DRAWER (#bag): two tabs, Bag and Saved. Lines arrive softly; a removed line fades and slides away, then
     the lines below glide up into its place (transform only).
     ===================================================================================================== */
  var G = {}, bagTab = 'bag';
  /* o.handoff: the velvet box is fading out above; the drawer's scrim starts at full strength under it (no second dim) */
  S.openBag = function (tab, opener, o) {
    if (!G.el) return;
    G.want = tab === 'saved' ? 'saved' : 'bag';
    if (AU.overlay.isOpen('bag')) { selectTab(G.want); return; }
    if (o && o.handoff && !AU.reduced) {
      G.el.classList.add('is-handoff');
      clearTimeout(G.handT);
      G.handT = setTimeout(function () { G.el.classList.remove('is-handoff'); }, 1200);
    }
    AU.overlay.open('bag', opener && opener.isConnected ? opener : document.activeElement);
  };
  // the name the shell's header looks for (AU.bag.open(tab, opener))
  AU.bag = AU.bag || {};
  AU.bag.open = function (tab, opener) { S.openBag(tab, opener); };
  AU.bag.close = function () { AU.overlay.close('bag'); };
  var flipUp = function (ul, after) {
    // measure the lines below, let the DOM change, then glide them from where they were
    var sibs = AU.$$('.bag__line', ul).filter(function (li) { return !li.classList.contains('is-out'); });
    var first = new Map();
    sibs.forEach(function (li) { first.set(li, li.getBoundingClientRect().top); });
    after();
    if (AU.reduced) return;
    sibs.forEach(function (li) {
      if (!li.isConnected) return;
      var d = first.get(li) - li.getBoundingClientRect().top;
      if (Math.abs(d) < .5) return;
      li.style.transition = 'none'; li.style.transform = 'translate3d(0,' + d + 'px,0)';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          li.style.transition = 'transform .8s var(--ease-out)'; li.style.transform = '';
          setTimeout(function () { li.style.transition = ''; }, 820);
        });
      });
    });
  };
  var lineOut = function (li, pane) {
    if (li.classList.contains('is-out')) return;
    var hadFocus = li.contains(document.activeElement);
    li.classList.add('is-out');
    setTimeout(function () {
      var next = li.nextElementSibling;
      while (next && next.classList.contains('is-out')) next = next.nextElementSibling;
      flipUp(li.parentNode, function () { li.remove(); });
      if (hadFocus) { var f = next && next.querySelector('button'); (f || pane).focus({ preventScroll: true }); }
    }, AU.reduced ? 0 : 420);
  };
  var keyed = function (ul, pane, entries, make, update) {
    var have = {};
    AU.$$('.bag__line', ul).forEach(function (li) { if (!li.classList.contains('is-out')) have[li.__key] = li; });
    entries.forEach(function (e) {
      var li = have[e.key];
      if (li) { update(li, e.data); delete have[e.key]; return; }
      li = make(e.data);
      li.__key = e.key;
      ul.appendChild(li);
      update(li, e.data);
      if (G.el.classList.contains('is-open') && !AU.reduced) { li.classList.add('is-new'); setTimeout(function () { li.classList.remove('is-new'); }, 1200); }
    });
    Object.keys(have).forEach(function (k) { lineOut(have[k], pane); });
  };
  var metaHTML = function (meta) {
    return String(meta || '').split(' · ').filter(Boolean).map(function (seg) {
      return '<span class="bag__seg' + (seg.length > 28 ? ' bag__seg--long' : '') + '">' + AU.nums(seg) + '</span>';
    }).join('<span class="bag__dot" aria-hidden="true"> · </span>');
  };
  var lineHead = function (id, name, meta, spec) {
    var p = AU.product(id);
    var nm = p ? '<a class="bag__name caps" href="#/piece/' + encodeURIComponent(id) + '" data-bag-go>' + AU.nums(name) + '</a>'
               : '<p class="bag__name caps">' + AU.nums(name) + '</p>';
    return '<div class="bag__thumb"><div class="bag__piece"></div></div>' +
      '<div class="bag__main">' + nm + (meta ? '<p class="small bag__meta">' + metaHTML(meta) + '</p>' : '');
  };
  var makeBagLine = function (item) {
    var li = document.createElement('li');
    li.className = 'bag__line';
    var p = AU.product(item.id);
    li.innerHTML = lineHead(item.id, item.name, item.meta) +
        '<div class="bag__row">' +
          '<div class="stepper stepper--sm" role="group" aria-label="' + AU.esc(T('bag.qtyOf', { name: item.name })) + '">' +
            '<button class="stepper__btn" type="button" data-dec>' + AU.icon('minus', { size: 15 }) + '</button>' +
            '<output class="stepper__val num" aria-live="polite"></output>' +
            '<button class="stepper__btn" type="button" data-inc aria-label="' + AU.esc(T('bag.more')) + '">' + AU.icon('plus', { size: 15 }) + '</button>' +
          '</div>' +
          '<button class="bag__act caps" type="button" data-rm>' + AU.esc(T('bag.remove')) + '</button>' +
        '</div>' +
      '</div>' +
      '<p class="bag__price"></p>';
    S.still(AU.$('.bag__piece', li), item.spec || (p && p.spec), { size: 240, eager: true });
    return li;
  };
  var updateBagLine = function (li, item) {
    li.__item = item;
    AU.$('.stepper__val', li).textContent = item.qty;
    AU.$('[data-dec]', li).setAttribute('aria-label', item.qty <= 1 ? T('bag.removeOne', { name: item.name }) : T('bag.less'));
    AU.$('[data-inc]', li).disabled = item.qty >= 9;
    AU.$('.bag__price', li).innerHTML = AU.price(item.price, item.qty);
  };
  var makeSavedLine = function (p) {
    var li = document.createElement('li');
    li.className = 'bag__line bag__line--saved';
    li.innerHTML = lineHead(p.id, p.name, S.material(p.spec)) +
        '<div class="bag__row">' +
          '<button class="bag__act bag__act--strong caps" type="button" data-move>' + AU.icon('bag', { size: 15 }) + '<span>' + AU.esc(T('bag.move')) + '</span></button>' +
          '<button class="bag__act caps" type="button" data-unsave>' + AU.esc(T('bag.remove')) + '</button>' +
        '</div>' +
      '</div>' +
      '<p class="bag__price">' + AU.price(p.price) + '</p>';
    S.still(AU.$('.bag__piece', li), p.spec, { size: 240, eager: true });
    return li;
  };
  var renderBag = function () {
    if (!G.el) return;
    var items = AU.cart.items(), wl = AU.wish.list().map(AU.product).filter(Boolean);
    keyed(G.bagList, G.panes.bag, items.map(function (it) { return { key: AU.cart.key(it), data: it }; }), makeBagLine, updateBagLine);
    keyed(G.savedList, G.panes.saved, wl.map(function (p) { return { key: p.id, data: p }; }), makeSavedLine, function (li, p) { li.__p = p; });
    G.nBag.textContent = AU.cart.count();
    G.nSaved.textContent = wl.length;
    G.total.innerHTML = AU.price(AU.cart.lines());   // lines, so the subtotal adds up in every currency
    G.bagEmpty.hidden = items.length > 0;
    G.savedEmpty.hidden = wl.length > 0;
    G.el.classList.toggle('is-empty', items.length === 0);
    G.foot.hidden = bagTab !== 'bag' || items.length === 0;
  };
  var rebuildBag = function () {   // the language changed: lines carry words, so they are made again
    if (!G.el) return;
    G.bagList.textContent = ''; G.savedList.textContent = '';
    renderBag();
  };
  var placeInk = function () {
    var b = G.tabs && G.tabs[bagTab];
    if (!b || !b.offsetWidth) return;
    G.ink.style.transform = 'translate3d(' + b.offsetLeft + 'px,0,0) scaleX(' + (b.offsetWidth / 100).toFixed(4) + ')';
  };
  var selectTab = function (t, focus) {
    bagTab = t === 'saved' ? 'saved' : 'bag';
    ['bag', 'saved'].forEach(function (k) {
      var on = k === bagTab;
      G.tabs[k].setAttribute('aria-selected', String(on));
      G.tabs[k].tabIndex = on ? 0 : -1;
      G.panes[k].hidden = !on;
    });
    var pane = G.panes[bagTab];
    pane.classList.remove('is-shown'); void pane.offsetWidth; pane.classList.add('is-shown');
    G.foot.hidden = bagTab !== 'bag' || AU.cart.count() === 0;
    placeInk();
    if (focus) G.tabs[bagTab].focus();
  };
  var initBag = function () {
    var el = document.getElementById('bag');
    if (!el) return;
    var g = function (s) { return AU.$('[data-' + s + ']', el); };
    G = { el: el, bagList: g('bag-list'), savedList: g('saved-list'), bagEmpty: g('bag-empty'), savedEmpty: g('saved-empty'),
      foot: g('bag-foot'), total: g('bag-total'), nBag: g('bag-n'), nSaved: g('saved-n'), ink: g('bag-ink'),
      tabs: { bag: AU.$('[data-bag-tabbtn="bag"]', el), saved: AU.$('[data-bag-tabbtn="saved"]', el) },
      panes: { bag: AU.$('[data-bag-pane="bag"]', el), saved: AU.$('[data-bag-pane="saved"]', el) }, want: null };
    g('bag-tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-bag-tabbtn]');
      if (b) selectTab(b.getAttribute('data-bag-tabbtn'));
    });
    g('bag-tabs').addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].indexOf(e.key) < 0) return;
      e.preventDefault();
      selectTab(e.key === 'Home' ? 'bag' : e.key === 'End' ? 'saved' : bagTab === 'bag' ? 'saved' : 'bag', true);
    });
    el.addEventListener('click', function (e) {
      var t = e.target, li = t.closest('.bag__line'), b;
      if (t.closest('[data-bag-go]')) { AU.overlay.close('bag'); return; }   // the router follows the link
      if ((b = t.closest('[data-dec]')) && li && li.__item) { AU.cart.setQty(li.__key, li.__item.qty - 1); return; }
      if ((b = t.closest('[data-inc]')) && li && li.__item) { AU.cart.setQty(li.__key, li.__item.qty + 1); return; }
      if ((b = t.closest('[data-rm]')) && li) { AU.cart.remove(li.__key); return; }
      if ((b = t.closest('[data-unsave]')) && li && li.__p) { if (AU.wish.has(li.__p.id)) AU.wish.toggle(li.__p.id); return; }
      if ((b = t.closest('[data-move]')) && li && li.__p) {
        var p = li.__p;
        AU.sparkleAt(b, { count: 7, spread: 50 });
        AU.cart.add({ id: p.id, name: p.name, price: p.price, qty: 1, spec: p.spec, meta: S.ringMeta(p) });
        if (AU.wish.has(p.id)) AU.wish.toggle(p.id);
        AU.toast(T('bag.moved'), 'bag');
      }
    });
    AU.on('cart', renderBag);
    AU.on('wish', renderBag);
    AU.on('overlay', function (d) {
      if (d && d.id === 'bag' && !d.open) { clearTimeout(G.handT); el.classList.remove('is-handoff'); }
      if (!d || d.id !== 'bag' || !d.open) return;
      var op = el.__opener, t = G.want || (op && op.getAttribute && op.getAttribute('data-bag-tab'));
      G.want = null;
      AU.$$('.bag__line', el).forEach(function (li, i) { li.style.setProperty('--i', Math.min(i, 7)); });
      selectTab(t === 'saved' ? 'saved' : 'bag');
      requestAnimationFrame(placeInk);
      if (lastAdded) {
        var hit = AU.$$('.bag__line', G.bagList).filter(function (li) { return li.__key === lastAdded; })[0];
        lastAdded = null;
        if (hit && !AU.reduced) { hit.classList.add('is-fresh'); setTimeout(function () { hit.classList.remove('is-fresh'); }, 1900); }
      }
    });
    window.addEventListener('resize', placeInk);
    renderBag();
    selectTab('bag');
  };

  /* =====================================================================================================
     THE COMPARE TRAY (#ctray): a small sticky tray at the bottom while one to three pieces are chosen.
     ===================================================================================================== */
  var TR = {};
  var trayAllowed = function () {
    var n = AU.router && AU.router.current && AU.router.current.name;
    return ['boutique', 'collection', 'collections', 'piece'].indexOf(n) >= 0;
  };
  var renderTray = function () {
    if (!TR.el) return;
    var ids = S.compare.list();
    var have = {};
    AU.$$('.ctray__item', TR.list).forEach(function (li) { have[li.__id] = li; });
    ids.forEach(function (id) {
      var p = AU.product(id);
      var li = have[id];
      if (li) delete have[id];
      else {
        li = document.createElement('li');
        li.className = 'ctray__item';
        li.__id = id;
        /* the thumbnail (view the piece) and its remove control sit side by side, each a full-height target of its own
           (never an X on the thumbnail's corner, where a thumb aimed at one hits the other) */
        li.innerHTML = '<a class="ctray__thumb" href="#/piece/' + encodeURIComponent(id) + '"><span class="ctray__piece"></span></a>' +
          '<button class="ctray__x" type="button">' + AU.icon('close', { size: 14 }) + '</button>';
        S.still(AU.$('.ctray__piece', li), p.spec, { size: 240, eager: true });
        AU.$('.ctray__x', li).addEventListener('click', function () {
          // focus stays in the tray: the next remove control, else the previous one, else the compare link
          var xs = AU.$$('.ctray__x', TR.list), at = xs.indexOf(this);
          var nextFocus = xs[at + 1] || xs[at - 1] || null;
          var hadFocus = document.activeElement === this;
          S.compare.remove(id);
          if (hadFocus) {
            if (nextFocus && nextFocus.isConnected) nextFocus.focus({ preventScroll: true });
            else if (TR.go && S.compare.list().length) TR.go.focus({ preventScroll: true });
          }
        });
        TR.list.appendChild(li);
      }
      // the labels follow the language (the items themselves are kept, so they do not pop in again)
      AU.$('.ctray__thumb', li).setAttribute('aria-label', T('viewPiece', { name: p.name }));
      AU.$('.ctray__x', li).setAttribute('aria-label', T('tray.remove', { name: p.name }));
    });
    Object.keys(have).forEach(function (k) { have[k].remove(); });
    // the order follows the selection
    ids.forEach(function (id) { var li = AU.$$('.ctray__item', TR.list).filter(function (x) { return x.__id === id; })[0]; if (li) TR.list.appendChild(li); });
    var n = ids.length;
    // the folded tray's small thumbnails (phones), in the order of the selection; kept, so they do not pop in again
    if (TR.minis) {
      var mh = {};
      AU.$$('.ctray__mini', TR.minis).forEach(function (m) { mh[m.__id] = m; });
      ids.forEach(function (id) {
        var m = mh[id], p = AU.product(id);
        if (m) delete mh[id];
        else {
          m = document.createElement('span'); m.className = 'ctray__mini'; m.__id = id;
          m.innerHTML = '<span class="ctray__piece"></span>';
          S.still(AU.$('.ctray__piece', m), p.spec, { size: 240, eager: true });
        }
        TR.minis.appendChild(m);
      });
      Object.keys(mh).forEach(function (k) { mh[k].remove(); });
    }
    TR.room.textContent = n >= 3 ? T('tray.full') : T('tray.room', { n: 3 - n });
    TR.room.innerHTML = AU.nums(TR.room.textContent);
    TR.go.innerHTML = AU.nums(T('tray.go', { n: n })) + ' ' + AU.icon('arrow', { size: 15 });
    TR.go.setAttribute('href', '#/compare?ids=' + ids.map(encodeURIComponent).join(','));
    TR.go.classList.toggle('is-off', n < 2);
    TR.go.setAttribute('aria-disabled', String(n < 2));
    var show = n > 0 && trayAllowed();
    if (show && TR.el.hidden) {
      TR.el.hidden = false;
      void TR.el.offsetWidth;
      TR.el.classList.add('is-on');
    } else if (!show && !TR.el.hidden) {
      TR.el.classList.remove('is-on');
      clearTimeout(TR.t);
      // once out of sight, it folds (phones), so it comes back as one row
      TR.t = setTimeout(function () { if (!TR.el.classList.contains('is-on')) { TR.el.hidden = true; if (TR.open && TR.setOpen) TR.setOpen(false, { instant: true }); } }, AU.reduced ? 0 : 700);
    }
    if (show) { clearTimeout(TR.t); TR.el.classList.add('is-on'); }
    document.documentElement.classList.toggle('has-ctray', show);
    if (show) measureTray();
  };
  /* --ctray-h: the tray's height, so the page can scroll past it and toasts land above it (40-shop.css) */
  var measureTray = function () {
    if (!TR.el || TR.el.hidden) return;
    var h = TR.el.offsetHeight;
    if (h && h !== TR.h) { TR.h = h; document.documentElement.style.setProperty('--ctray-h', h + 'px'); }
  };
  var initTray = function () {
    var el = document.getElementById('ctray');
    if (!el) return;
    TR = { el: el, list: AU.$('[data-ctray-list]', el), room: AU.$('[data-ctray-room]', el), go: AU.$('[data-ctray-go]', el), t: 0,
           minis: AU.$('[data-ctray-minis]', el), peek: AU.$('[data-ctray-peek]', el), fold: AU.$('[data-ctray-fold]', el), open: false };
    AU.$('[data-ctray-clear]', el).addEventListener('click', function () { S.compare.clear(); });
    /* phones: the tray rests folded to one 56px row (the chosen pieces as small thumbnails, and the compare button), so
       it never sits over the reading; a tap on the thumbnails opens it to manage the pieces, and it folds again on
       the fold control, on scrolling down the page and on a new page. The height glides by clip-path (the tray is
       anchored to the bottom, so its top edge rises and falls); the rows inside fade (40-shop.css). */
    var phone = window.matchMedia ? window.matchMedia('(max-width: 640px)') : { matches: false };
    var inner = AU.$('.ctray__inner', el);
    var clip = function (px) { return 'inset(' + Math.max(0, px).toFixed(1) + 'px 0 0 0 round 2px)'; };
    var setOpen = function (open, o) {
      o = o || {};
      if (!TR.peek || TR.open === open) return;
      if (TR.anim) { try { TR.anim.cancel(); } catch (e) {} TR.anim = null; }
      var animate = !o.instant && phone.matches && !AU.reduced && !el.hidden && el.classList.contains('is-on') && typeof inner.animate === 'function';
      var done = function () {
        el.classList.toggle('is-open', open);
        TR.peek.setAttribute('aria-expanded', String(open));
        if (o.focus) {
          var f = open ? (AU.$('.ctray__x', TR.list) || TR.fold) : TR.peek;
          if (f) f.focus({ preventScroll: true });
        }
        measureTray();
      };
      TR.open = open;
      if (open) openY = window.scrollY;
      if (!animate) { done(); return; }
      var h0 = inner.offsetHeight;
      if (open) {
        done();
        var d = inner.offsetHeight - h0;
        if (d > 0) TR.anim = inner.animate([{ clipPath: clip(d) }, { clipPath: clip(0) }], { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)' });
      } else {
        // the open tray's top edge comes down to the folded row's height, then the folded row takes its place
        el.classList.remove('is-open'); var h1 = inner.offsetHeight; el.classList.add('is-open');
        el.classList.add('is-folding');
        var an = TR.anim = inner.animate([{ clipPath: clip(0) }, { clipPath: clip(h0 - h1) }], { duration: 420, easing: 'cubic-bezier(.65,0,.35,1)' });
        an.onfinish = function () { if (TR.anim !== an) return; TR.anim = null; el.classList.remove('is-folding'); done(); };
        an.oncancel = function () { el.classList.remove('is-folding'); };
      }
    };
    TR.setOpen = setOpen;
    if (TR.peek) TR.peek.addEventListener('click', function () { setOpen(true, { focus: true }); });
    if (TR.fold) TR.fold.addEventListener('click', function () { setOpen(false, { focus: true }); });
    // reading on: scrolling down the page folds the open tray away
    var openY = 0;
    AU.onScroll(function (y) {
      if (y == null) y = window.scrollY;
      if (!TR.open || !phone.matches) { openY = y; return; }
      if (y - openY > 48 && !el.contains(document.activeElement)) setOpen(false);
      else if (y < openY) openY = y;
    });
    AU.on('route', function () { setOpen(false, { instant: true }); });
    TR.go.addEventListener('click', function (e) { if (S.compare.list().length < 2) { e.preventDefault(); AU.toast(T('tray.room', { n: 3 - S.compare.list().length }), 'square'); } });
    AU.on('compare', renderTray);
    AU.on('route', renderTray);
    if ('ResizeObserver' in window) new ResizeObserver(function () { measureTray(); }).observe(el);
    AU.on('overlay', function () {
      var any = AU.$$('.overlay.is-open').length > 0;
      if (any) el.setAttribute('inert', ''); else el.removeAttribute('inert');
      el.classList.toggle('is-under', any);
    });
    renderTray();
  };

  /* ---------- lifecycle ---------- */
  AU.on('route', function () { pruneStills(); pruneSpins(); });
  var modeT = 0;
  AU.on('mode', function () {
    spins.forEach(function (s) { s.stale(); });
    clearTimeout(modeT);
    // once the colours have settled, the stills near the screen fetch the render for the new mode
    modeT = setTimeout(function () {
      stills.forEach(function (r) { if (!r.dead && r.host.isConnected && (r.near || r.eager || !nearIO)) loadStill(r); });
    }, 120);
  });
  AU.on('reduced', function (on) { if (on) spins.forEach(function (s) { s.stale(); }); });
  AU.on('lang', function () {
    rebuildBag(); renderTray(); syncCards();
    var n = AU.router && AU.router.current && AU.router.current.name;
    if (S.NAMES.indexOf(n) >= 0 && AU.router.refresh) AU.router.refresh();
  });
  AU.on('gl', function () {   // the engine arrived late: pieces still shown as line art try again
    stills.forEach(function (r) { if (!r.dead && r.host.classList.contains('has-art')) { r.mode = null; r.host.classList.remove('has-art'); AU.$$('.pc__art', r.host).forEach(function (n) { n.remove(); }); loadStill(r); } });
  });

  AU.ready(function () {
    initBag();
    initTray();
    var refine = document.getElementById('refine');
    if (refine) AU.hydrateIcons(refine);
    AU.hydrateIcons(document.getElementById('bag'));
    AU.hydrateIcons(document.getElementById('ctray'));
  });
})();
