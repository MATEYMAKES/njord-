/* ---- 41-shop-list.js ---- */
/* Aurelia shop pages, part 1: /collections, /collections/:id, /boutique, /boutique/:type.
   The boutique keeps its state (type, collection, metal, stone, price, sort) in the address, so every filtered view
   can be linked; filtering and sorting glide (FLIP, transform and opacity only). Built on AU.shop (40-shop.js). */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.shop) return;
  var S = AU.shop, T = S.t, esc = AU.esc;
  var hasIO = 'IntersectionObserver' in window;

  /* a slow parallax on frames while they are on screen (transform only, reads before writes) */
  var parallax = function (pairs, amount, ctx) {
    if (AU.reduced) return;
    var live = new Set();
    var io = hasIO ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) live.add(e.target); else live.delete(e.target); }); }) : null;
    pairs.forEach(function (p) { p.frame.__par = p.inner; if (io) io.observe(p.frame); else live.add(p.frame); });
    var vh = window.innerHeight;
    var run = function () {
      if (AU.reduced) return;
      var list = Array.from(live), ps = list.map(function (f) { var r = f.getBoundingClientRect(); return AU.clamp((vh - r.top) / (vh + r.height), 0, 1); });
      list.forEach(function (f, i) { f.__par.style.transform = 'translate3d(0,' + ((.5 - ps[i]) * amount).toFixed(1) + 'px,0)'; });
    };
    var off = AU.onScroll(run);
    var rz = function () { vh = window.innerHeight; };
    window.addEventListener('resize', rz);
    ctx.onLeave(function () { off(); window.removeEventListener('resize', rz); if (io) io.disconnect(); });
  };

  /* a single sheen crosses a frame on each hover */
  var sheen = function (frame) {
    frame.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch' || AU.reduced) return;
      frame.classList.remove('is-sheen'); void frame.offsetWidth; frame.classList.add('is-sheen');
    });
  };

  /* the house's mask rise for a change of words in place (the boutique title and lede): the old words drop out of
     their masks over .3s while the new ones rise from .25s, one after another. host is a .tx-stack (one grid cell,
     so old and new sit on the same spot and the host never collapses); the current text is its .tx-cur child. */
  var maskSwap = function (host, text, stepMs) {
    if (!host) return;
    var cur = host.querySelector(':scope > .tx-cur');
    if (cur && cur.textContent === text) return;
    AU.$$(':scope > .tx-old', host).forEach(function (n) { n.remove(); });
    var nu = document.createElement('span');
    nu.className = 'tx-cur';
    nu.textContent = text;
    if (AU.reduced || !cur || typeof nu.animate !== 'function') { if (cur) cur.replaceWith(nu); else host.appendChild(nu); return; }
    AU.split(cur); AU.split(nu);
    cur.className = 'tx-old'; cur.removeAttribute('data-reveal'); cur.setAttribute('aria-hidden', 'true');
    nu.classList.add('tx-in');
    if (stepMs) nu.style.setProperty('--tx-step', stepMs + 'ms');
    host.appendChild(nu);
    var n = nu.querySelectorAll('.w__i').length;
    setTimeout(function () { cur.remove(); }, 460);
    clearTimeout(host.__txT);
    host.__txT = setTimeout(function () { nu.classList.remove('tx-in'); }, 250 + n * (stepMs || 55) + 1150);
  };

  /* =====================================================================================================
     /collections — four editorial panels, all within the first screen on a laptop
     ===================================================================================================== */
  var renderCollections = function (el, params, ctx) {
    var cols = AU.content.collections || [];
    var types = S.TYPES.map(function (t) {
      return '<li><a class="cx__type caps caps--sm" href="#/boutique/' + S.SLUG[t] + '">' + esc(T('types.' + t)) + '</a></li>';
    }).join('');
    var door = function (k, href, inner) {
      return '<div class="cx__door cx__door--' + k + '">' +
        '<p class="cx__door-k caps caps--sm">' + esc(T('collections.door' + k + '.eyebrow')) + '</p>' +
        '<a class="cx__door-a" href="' + href + '"><span class="cx__door-t">' + esc(T('collections.door' + k + '.title')) + '</span>' +
          '<span class="cx__door-arrow" aria-hidden="true">' + AU.icon('arrow', { size: 20 }) + '</span></a>' +
        '<p class="cx__door-p">' + esc(T('collections.door' + k + '.text')) + '</p>' + (inner || '') +
      '</div>';
    };
    el.innerHTML =
      '<section class="shop-page cx" aria-labelledby="cx-title">' +
        '<div class="wrap">' +
          '<header class="cx__head shop-head">' +
            '<div class="cx__intro shop-head__intro">' +
              '<p class="eyebrow caps" data-reveal="fade">' + AU.nums(T('collections.kicker')) + '</p>' +
              '<h1 id="cx-title" class="script t-h1 cx__title" data-reveal="words">' + esc(T('collections.heading')) + '</h1>' +
            '</div>' +
            '<p class="lede cx__lede" data-reveal="up" data-delay="160">' + esc(T('collections.intro')) + '</p>' +
          '</header>' +
          '<ol class="cx__list">' +
            cols.map(function (c, i) {
              var n = S.products().filter(function (p) { return p.collection === c.id; }).length;
              return '<li class="cx__item cx__item--' + (i + 1) + '">' +
                '<a class="cx__link" href="#/collections/' + encodeURIComponent(c.id) + '" aria-label="' + esc(T('exploreAria', { name: c.name })) + '">' +
                  '<span class="cx__frame" data-reveal="mask" data-delay="' + (i * 110) + '">' +
                    '<span class="cx__par"><span class="cx__piece" data-vt="col-' + esc(c.id) + '"></span></span>' +
                    '<span class="cx__sheen" aria-hidden="true"></span>' +
                    '<span class="cx__count caps" aria-hidden="true">' + AU.nums(S.plural(n)) + '</span>' +
                  '</span>' +
                  '<span class="cx__body" data-reveal="up" data-delay="' + (120 + i * 110) + '">' +
                    '<span class="cx__meta"><span class="cx__idx num">0' + (i + 1) + '</span><span class="cx__rule" aria-hidden="true"></span><span class="caps caps--sm cx__kicker">' + esc(c.kicker) + '</span></span>' +
                    '<span class="script t-h3 cx__name">' + esc(c.name) + '</span>' +
                    '<span class="body cx__text">' + esc(c.text) + '</span>' +
                    '<span class="cx__cta caps caps--sm">' + esc(T('explore')) + ' ' + AU.icon('arrow', { size: 16 }) + '</span>' +
                  '</span>' +
                '</a>' +
              '</li>';
            }).join('') +
          '</ol>' +
          /* the page closes on two doors onward (the boutique, with its four kinds of piece, and bespoke) */
          '<nav class="cx__doors" aria-label="' + esc(T('collections.doors')) + '" data-reveal="up">' +
            door('Shop', '#/boutique', '<ul class="cx__types" aria-label="' + esc(T('boutique.filterType')) + '">' + types + '</ul>') +
            door('Bespoke', '#/bespoke') +
          '</nav>' +
        '</div>' +
      '</section>';
    var pairs = [];
    AU.$$('.cx__item', el).forEach(function (item, i) {
      var c = cols[i], frame = AU.$('.cx__frame', item), piece = AU.$('.cx__piece', item);
      S.still(piece, c.spec, { size: 960, eager: i < 4 });
      S.spin(item, piece, c.spec);
      S.light(frame);
      sheen(frame);
      pairs.push({ frame: frame, inner: AU.$('.cx__par', item) });
    });
    parallax(pairs, 28, ctx);
  };

  /* =====================================================================================================
     /collections/:id — the story of one house, then its pieces
     ===================================================================================================== */
  var renderCollection = function (el, params, ctx) {
    var cols = AU.content.collections || [];
    var c = S.collection(params.id);
    if (!c) {
      el.innerHTML = '<section class="shop-page shop-missing"><div class="wrap"><p class="eyebrow caps">' + esc(T('collections.eyebrow')) + '</p>' +
        '<h1 class="script t-h1">' + esc(T('collections.missingTitle')) + '</h1><p class="lede">' + esc(T('collections.missingText')) + '</p>' +
        '<a class="btn" href="#/collections">' + esc(T('collections.all')) + ' ' + AU.icon('arrow', { size: 16 }) + '</a></div></section>';
      return;
    }
    var i = cols.indexOf(c), next = cols[(i + 1) % cols.length];
    var list = S.products().filter(function (p) { return p.collection === c.id; });
    el.innerHTML =
      '<section class="shop-page cl" aria-labelledby="cl-title">' +
        '<div class="wrap">' +
          '<div class="cl__hero">' +
            '<div class="cl__text">' +
              '<nav class="crumbs caps caps--sm" aria-label="' + esc(T('piece.crumbs')) + '" data-reveal="fade"><a href="#/collections">' + esc(T('collections.eyebrow')) + '</a><span aria-hidden="true">/</span><span aria-current="page">' + esc(c.name) + '</span></nav>' +
              '<p class="cl__meta" data-reveal="fade"><span class="cl__idx num">0' + (i + 1) + '</span><span class="cl__rule" aria-hidden="true"></span><span class="caps caps--sm">' + esc(c.kicker) + '</span></p>' +
              '<h1 id="cl-title" class="script t-h1 cl__title" data-reveal="words">' + esc(c.name) + '</h1>' +
              '<p class="lede cl__lede" data-reveal="up" data-delay="160">' + esc(c.text) + '</p>' +
              '<p class="cl__acts" data-reveal="up" data-delay="260">' +
                '<a class="btn btn--solid cl__see" href="#cl-pieces" data-cl-jump>' + AU.nums(list.length === 1 ? T('collections.seeOne') : T('collections.seeN', { n: list.length })) + ' <span class="cl__see-arrow" aria-hidden="true">' + AU.icon('arrow', { size: 16 }) + '</span></a>' +
                '<a class="link caps caps--sm" href="#/visit">' + esc(T('collections.book')) + ' ' + AU.icon('arrow', { size: 16 }) + '</a>' +
              '</p>' +
            '</div>' +
            '<div class="cl__frame" data-reveal="mask">' +
              '<div class="cl__par"><div class="cl__piece" data-vt="col-' + esc(c.id) + '" role="img" aria-label="' + esc(c.name + ', ' + S.material(c.spec)) + '"></div></div>' +
              '<span class="cx__sheen" aria-hidden="true"></span>' +
            '</div>' +
          '</div>' +
          '<div class="cl__pieces" id="cl-pieces">' +
            '<div class="cl__bar"><h2 class="caps cl__h">' + esc(T('collections.piecesIn')) + '</h2><span class="cl__line" data-reveal="line" aria-hidden="true"></span><p class="caps caps--sm cl__count">' + AU.nums(S.plural(list.length)) + '</p></div>' +
            '<ul class="grid" aria-label="' + esc(c.name) + '" data-cl-grid></ul>' +
          '</div>' +
          '<a class="cl__next" href="#/collections/' + encodeURIComponent(next.id) + '" data-reveal="up">' +
            '<span class="caps caps--sm cl__next-label">' + esc(T('collections.next')) + '</span>' +
            '<span class="script t-h2 cl__next-name">' + esc(next.name) + '</span>' +
            '<span class="cl__next-arrow" aria-hidden="true">' + AU.icon('arrow', { size: 28 }) + '</span>' +
          '</a>' +
        '</div>' +
      '</section>';
    var grid = AU.$('[data-cl-grid]', el);
    list.forEach(function (p, k) {
      var li = S.card(p, { coll: false });
      li.setAttribute('data-reveal', 'up'); li.setAttribute('data-delay', String((k % 4) * 90));
      grid.appendChild(li);
    });
    /* a quiet invitation completes a short last row, so the grid always ends on a full line */
    var note = document.createElement('li');
    note.className = 'bq__note cl__note';
    note.hidden = true;
    note.innerHTML = '<a class="bq__note-frame" href="#/visit">' +
      '<span class="eyebrow eyebrow--center caps caps--sm">' + esc(T('collections.viewingEyebrow')) + '</span>' +
      '<span class="script t-h3 bq__note-title">' + esc(T('collections.viewing')) + '</span>' +
      '<span class="small bq__note-text">' + esc(T('collections.viewingText', { name: c.name })) + '</span>' +
      // the full CTA when the note spans two or more columns, the short one in a single column (40-shop.css)
      '<span class="link caps caps--sm bq__note-link"><span class="bq__note-long">' + esc(T('collections.book')) + '</span>' +
        '<span class="bq__note-short">' + esc(T('collections.bookShort')) + '</span> ' + AU.icon('arrow', { size: 16 }) + '</span></a>';
    grid.appendChild(note);
    var fillRow = function () {
      var t = getComputedStyle(grid).gridTemplateColumns, cols = t && t !== 'none' ? t.trim().split(/\s+/).length : 1;
      var gap = (cols - list.length % cols) % cols;
      note.hidden = !gap || cols < 2;
      note.style.gridColumn = gap ? 'span ' + gap : '';
      note.classList.toggle('bq__note--wide', gap > 1);
    };
    var fillT = 0, onFill = function () { clearTimeout(fillT); fillT = setTimeout(fillRow, 120); };
    window.addEventListener('resize', onFill);
    ctx.onLeave(function () { window.removeEventListener('resize', onFill); clearTimeout(fillT); });
    S.onLanded(el, ctx, fillRow);
    var frame = AU.$('.cl__frame', el), piece = AU.$('.cl__piece', el);
    S.still(piece, c.spec, { size: 960, eager: true });
    S.spin(frame, piece, c.spec);
    S.light(frame);
    sheen(frame);
    parallax([{ frame: frame, inner: AU.$('.cl__par', el) }], 36, ctx);
    AU.$('[data-cl-jump]', el).addEventListener('click', function (e) {
      e.preventDefault();
      var t = document.getElementById('cl-pieces');
      var y = t.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--head-h'), 10) || 0) - 16;
      if (AU.scrollTo) AU.scrollTo(y, { immediate: AU.reduced }); else window.scrollTo({ top: y, behavior: AU.reduced ? 'auto' : 'smooth' });
    });
  };

  /* =====================================================================================================
     /boutique and /boutique/:type
     ===================================================================================================== */
  var SORTS = ['featured', 'price-asc', 'price-desc', 'name'];
  var priceBounds = function () {
    var ps = S.products().map(function (p) { return p.price; });
    var lo = Math.floor(Math.min.apply(null, ps) / 500) * 500, hi = Math.ceil(Math.max.apply(null, ps) / 500) * 500;
    return { lo: lo, hi: hi, step: 50 };
  };
  var listParam = function (v, ok) { return String(v || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x && ok(x); }); };
  var stateFrom = function (params, q) {
    var pb = priceBounds();
    var metals = ['yellow', 'rose', 'white'];
    var stones = Object.keys(AU.content.ui.shop.stones || {});
    var st = {
      type: S.normType(params.type || q.type),
      col: S.collection(q.collection) ? q.collection : '',
      metal: listParam(q.metal, function (m) { return metals.indexOf(m) >= 0; }),
      stone: listParam(q.stone, function (s) { return stones.indexOf(s) >= 0; }),
      min: q.min != null && q.min !== '' && isFinite(+q.min) ? AU.clamp(+q.min, pb.lo, pb.hi) : pb.lo,
      max: q.max != null && q.max !== '' && isFinite(+q.max) ? AU.clamp(+q.max, pb.lo, pb.hi) : pb.hi,
      sort: SORTS.indexOf(q.sort) >= 0 ? q.sort : 'featured'
    };
    if (st.min > st.max) { var t = st.min; st.min = st.max; st.max = t; }
    return st;
  };
  var pathOf = function (st) {
    var pb = priceBounds(), q = [];
    if (st.col) q.push('collection=' + encodeURIComponent(st.col));
    if (st.metal.length) q.push('metal=' + st.metal.join(','));
    if (st.stone.length) q.push('stone=' + st.stone.join(','));
    if (st.min > pb.lo) q.push('min=' + st.min);
    if (st.max < pb.hi) q.push('max=' + st.max);
    if (st.sort !== 'featured') q.push('sort=' + st.sort);
    return '/boutique' + (st.type ? '/' + S.SLUG[st.type] : '') + (q.length ? '?' + q.join('&') : '');
  };
  var titleOf = function (st) { return st.type ? T('types.' + st.type) : T('meta.boutique'); };
  var descOf = function (st) { return st.type ? T('meta.typeDesc', { type: T('types.' + st.type) }) : T('meta.boutiqueDesc'); };
  var refineCount = function (st) {
    var pb = priceBounds();
    return (st.col ? 1 : 0) + st.metal.length + st.stone.length + ((st.min > pb.lo || st.max < pb.hi) ? 1 : 0);
  };
  var matches = function (st, p, skip) {
    var s = p.spec || {};
    if (skip !== 'type' && st.type && s.type !== st.type) return false;
    if (skip !== 'col' && st.col && p.collection !== st.col) return false;
    if (skip !== 'metal' && st.metal.length && st.metal.indexOf(s.metal) < 0) return false;
    if (skip !== 'stone' && st.stone.length && st.stone.indexOf(s.stone || 'none') < 0) return false;
    if (skip !== 'price' && (p.price < st.min || p.price > st.max)) return false;
    return true;
  };
  var swatchMetal = function (id) {
    var m = (AU.content.bespoke.metals || []).find(function (x) { return x.id === id; });
    return '<span class="sw sw--metal" style="background:' + esc(m ? m.swatch : 'none') + '" aria-hidden="true"></span>';
  };
  var swatchStone = function (id) {
    var s = (AU.content.bespoke.stones || []).find(function (x) { return x.id === id; });
    return '<span class="sw' + (s ? '' : ' sw--none') + '" style="' + (s ? 'background:' + esc(s.swatch) : '') + '" aria-hidden="true"></span>';
  };

  var renderBoutique = function (el, params, ctx) {
    var st = stateFrom(params, ctx.query || {});
    var pb = priceBounds();
    var products = S.products();
    var typeChips = [{ id: '', label: T('types.all') }].concat(S.TYPES.map(function (t) { return { id: t, label: T('types.' + t) }; }));
    var ledeOf = function (t) { return t ? T('boutique.typeLede.' + t) : T('boutique.ledeAll'); };
    var lede = ledeOf(st.type);
    /* the lede keeps the height of its longest version (invisible copies stacked in the same grid cell), so changing
       the type never moves the bar and the grid below it */
    var ledeSizers = [null].concat(S.TYPES).map(function (t) { return '<span class="tx-sizer" aria-hidden="true">' + esc(ledeOf(t)) + '</span>'; }).join('');

    el.innerHTML =
      '<section class="shop-page bq" aria-labelledby="bq-title">' +
        '<div class="wrap">' +
          '<header class="bq__head shop-head">' +
            '<div class="bq__intro shop-head__intro">' +
              '<p class="eyebrow caps" data-reveal="fade">' + esc(T('boutique.eyebrow')) + '</p>' +
              '<h1 id="bq-title" class="script t-h1 bq__title tx-stack" data-bq-title><span class="tx-cur" data-reveal="words">' + esc(st.type ? T('types.' + st.type) : T('boutique.titleAll')) + '</span></h1>' +
            '</div>' +
            '<p class="bq__lede" data-reveal="up" data-delay="140"><span class="lede tx-stack" data-bq-lede>' + ledeSizers + '<span class="tx-cur">' + esc(lede) + '</span></span> <span class="small bq__hint">' + esc(AU.touch ? T('touchHint') : T('moveHint')) + '</span></p>' +
          '</header>' +
          '<div class="bq__bar" data-reveal="up" data-delay="200">' +
            '<div class="bq__types" role="group" aria-label="' + esc(T('boutique.filterType')) + '" data-bq-types>' +
              typeChips.map(function (t) { return '<button class="chip bq__chip" type="button" data-type="' + t.id + '" aria-pressed="false">' + esc(t.label) + '</button>'; }).join('') +
            '</div>' +
            '<div class="bq__tools">' +
              '<label class="bq__sort"><span class="caps caps--sm bq__sort-label">' + esc(T('boutique.sortLabel')) + '</span>' +
                '<select data-bq-sort>' + SORTS.map(function (s) { return '<option value="' + s + '">' + esc(T('boutique.sorts.' + s)) + '</option>'; }).join('') + '</select>' +
              '</label>' +
              '<button class="bq__refine caps caps--sm" type="button" data-bq-refine aria-haspopup="dialog">' + S.icon('refine', { size: 18 }) + '<span data-bq-refine-label></span></button>' +
            '</div>' +
          '</div>' +
          '<span class="bq__rule" data-reveal="line" aria-hidden="true"></span>' +
          '<div class="bq__meta">' +
            /* the grid's own heading (h1 → h2 → the cards' h3): the count of what is shown */
            '<h2 class="caps caps--sm bq__count" aria-live="polite" data-bq-count></h2>' +
            '<ul class="bq__active" aria-label="' + esc(T('boutique.active')) + '" data-bq-active></ul>' +
          '</div>' +
          '<ul class="grid bq__grid" aria-label="' + esc(T('boutique.gridLabel')) + '" data-bq-grid>' +
            '<li class="bq__note" data-bq-note hidden>' +
              '<a class="bq__note-frame" href="#/bespoke">' +
                '<span class="eyebrow eyebrow--center caps caps--sm">' + esc(T('boutique.noteEyebrow')) + '</span>' +
                '<span class="script t-h3 bq__note-title">' + esc(T('boutique.noteTitle')) + '</span>' +
                '<span class="small bq__note-text">' + esc(T('boutique.noteText')) + '</span>' +
                '<span class="link caps caps--sm bq__note-link">' + esc(T('boutique.noteLink')) + ' ' + AU.icon('arrow', { size: 16 }) + '</span>' +
              '</a>' +
            '</li>' +
          '</ul>' +
          '<div class="bq__empty" data-bq-empty hidden>' +
            '<p class="script t-h3">' + esc(T('boutique.emptyTitle')) + '</p>' +
            '<p class="body">' + esc(T('boutique.emptyText')) + '</p>' +
            '<p class="bq__empty-acts"><button class="btn btn--sm" type="button" data-bq-reset>' + esc(T('boutique.emptyReset')) + '</button>' +
            '<a class="link caps caps--sm" href="#/bespoke">' + esc(T('boutique.noteLink')) + ' ' + AU.icon('arrow', { size: 16 }) + '</a></p>' +
          '</div>' +
        '</div>' +
      '</section>';

    var grid = AU.$('[data-bq-grid]', el), note = AU.$('[data-bq-note]', el), emptyEl = AU.$('[data-bq-empty]', el);
    var typesEl = AU.$('[data-bq-types]', el), sortSel = AU.$('[data-bq-sort]', el), countEl = AU.$('[data-bq-count]', el);
    var activeEl = AU.$('[data-bq-active]', el), refineBtn = AU.$('[data-bq-refine]', el), refineLabel = AU.$('[data-bq-refine-label]', el);
    var titleEl = AU.$('[data-bq-title]', el), ledeEl = AU.$('[data-bq-lede]', el);

    var items = products.map(function (p, i) {
      var li = S.card(p);
      grid.insertBefore(li, note);
      return { p: p, i: i, li: li };
    });

    /* ---------- the list for the current state ---------- */
    var current = function () {
      var list = items.filter(function (it) { return matches(st, it.p); });
      var by = st.sort;
      if (by === 'price-asc') list.sort(function (a, b) { return a.p.price - b.p.price || a.i - b.i; });
      else if (by === 'price-desc') list.sort(function (a, b) { return b.p.price - a.p.price || a.i - b.i; });
      else if (by === 'name') list.sort(function (a, b) { return a.p.name.localeCompare(b.p.name, AU.lang); });
      return list;
    };

    /* ---------- the bespoke invitation completes a short last row ---------- */
    var colsNow = function () {
      var t = getComputedStyle(grid).gridTemplateColumns;
      return t && t !== 'none' ? t.trim().split(/\s+/).length : 1;
    };
    var placeNote = function (n, animate) {
      var cols = colsNow(), gap = n > 0 ? (cols - n % cols) % cols : 0;
      if (!gap || cols < 2) { note.hidden = true; note.__key = ''; return; }
      grid.appendChild(note);
      note.style.gridColumn = 'span ' + gap;
      note.classList.toggle('bq__note--wide', gap > 1);
      var key = gap + ':' + n, was = note.hidden;
      note.hidden = false;
      if (animate && !AU.reduced && (was || key !== note.__key)) { note.classList.remove('is-in'); void note.offsetWidth; note.classList.add('is-in'); }
      note.__key = key;
    };

    /* ---------- FLIP, in sequence (Web Animations, transform and opacity only):
         0 – .3s   cards that leave fade and shrink a little where they stood;
         .2s →     cards that stay glide to their new place, one after another (40 ms apart, .8s each);
                   a card whose new place is more than one row away does not fly across the grid: it fades out where it
                   was and appears in its new place (a cross-fade in place), like the cards that arrive (from .3s).
       The grid keeps its height until everything has landed, so the page under it never jumps. ---------- */
    var EASE = 'cubic-bezier(.22,.61,.36,1)', EASE_OUT = 'cubic-bezier(.16,1,.3,1)', EASE_IN = 'cubic-bezier(.5,0,.75,0)';
    var cleanT = 0, leaving = [], anims = [];
    var settle = function () {
      clearTimeout(cleanT);
      anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      anims = [];
      leaving.forEach(function (it) { it.li.hidden = true; it.li.classList.remove('is-leaving'); it.li.removeAttribute('style'); });
      leaving = [];
      items.forEach(function (it) { if (!it.li.hidden) it.li.style.zIndex = ''; });
      grid.style.minHeight = '';
    };
    var tf = function (x, y, s) { return 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + s + ')'; };
    var apply = function (animate) {
      animate = animate && !AU.reduced && typeof grid.animate === 'function';
      var gRect = grid.getBoundingClientRect(), first = new Map(), h0 = grid.offsetHeight;
      // read every rect first (a card caught mid-flight is measured where it is seen)
      if (animate) items.forEach(function (it) { if (!it.li.hidden && !it.li.classList.contains('is-leaving')) first.set(it, it.li.getBoundingClientRect()); });
      settle();
      var list = current(), show = {};
      list.forEach(function (it) { show[it.p.id] = true; });
      var n = list.length;
      countEl.innerHTML = AU.nums(S.plural(n));
      var out = items.filter(function (it) { return !it.li.hidden && !show[it.p.id]; });
      out.forEach(function (it) {
        if (!animate) { it.li.hidden = true; return; }
        var r = first.get(it);
        it.li.classList.add('is-leaving');
        it.li.style.cssText = 'position:absolute;margin:0;left:' + (r.left - gRect.left) + 'px;top:' + (r.top - gRect.top) + 'px;width:' + r.width + 'px;height:' + r.height + 'px;';
      });
      list.forEach(function (it) { grid.appendChild(it.li); });
      placeNote(n, animate);
      if (animate) out.forEach(function (it) { grid.appendChild(it.li); });
      var entering = list.filter(function (it) { return it.li.hidden; });
      entering.forEach(function (it) { it.li.hidden = false; });
      if (n === 0 && emptyEl.hidden) { emptyEl.hidden = false; emptyEl.classList.remove('is-in'); void emptyEl.offsetWidth; emptyEl.classList.add('is-in'); }
      else if (n > 0) emptyEl.hidden = true;
      if (!animate) return;
      leaving = out;
      // reads: every new rect and the row pitch, before any animation is started
      var gRect2 = grid.getBoundingClientRect();
      var rowGap = parseFloat(getComputedStyle(grid).rowGap) || 0;
      var plan = list.map(function (it) { return { it: it, a: first.get(it), b: it.li.getBoundingClientRect() }; });
      grid.style.minHeight = h0 + 'px';
      var end = 0, k = 0;
      var play = function (li, frames, o) {
        var an = li.animate(frames, o);
        anims.push(an);
        end = Math.max(end, (o.delay || 0) + o.duration);
      };
      out.forEach(function (it) {
        play(it.li, [{ opacity: 1, transform: tf(0, 0, 1) }, { opacity: 0, transform: tf(0, 6, .94) }],
          { duration: 300, easing: EASE, fill: 'forwards' });
      });
      plan.forEach(function (p) {
        var li = p.it.li, step = Math.min(k, 12) * 40;
        if (!p.a) {   // arriving
          k++;
          play(li, [{ opacity: 0, transform: tf(0, 22, .97) }, { opacity: 1, transform: tf(0, 0, 1) }],
            { duration: 850, delay: 300 + step, easing: EASE_OUT, fill: 'backwards' });
          return;
        }
        var dx = (p.a.left - gRect.left) - (p.b.left - gRect2.left), dy = (p.a.top - gRect.top) - (p.b.top - gRect2.top);
        if (Math.abs(dx) < .5 && Math.abs(dy) < .5) return;   // stays where it is
        k++;
        var rows = Math.round(Math.abs(dy) / Math.max(1, p.b.height + rowGap));
        li.style.zIndex = '1';
        if (rows <= 1) {   // a short glide
          play(li, [{ transform: tf(dx, dy, 1) }, { transform: tf(0, 0, 1) }],
            { duration: 800, delay: 200 + step, easing: EASE_OUT, fill: 'backwards' });
          return;
        }
        // far away: out where it was, then in where it belongs (one animation, so nothing can show in between)
        var total = 300 + step + 800;
        play(li, [
          { offset: 0, opacity: 1, transform: tf(dx, dy, 1), easing: EASE },
          { offset: 300 / total, opacity: 0, transform: tf(dx, dy + 6, .94), easing: 'linear' },
          { offset: (300 + step) / total, opacity: 0, transform: tf(0, 22, .97), easing: EASE_OUT },
          { offset: 1, opacity: 1, transform: tf(0, 0, 1) }
        ], { duration: total, easing: 'linear', fill: 'backwards' });
      });
      cleanT = setTimeout(settle, end + 60);
    };

    /* ---------- controls follow the state ---------- */
    var syncControls = function () {
      AU.$$('[data-type]', typesEl).forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-type') || null) === (st.type || null))); });
      sortSel.value = st.sort;
      var rc = refineCount(st);
      refineLabel.innerHTML = rc ? AU.nums(T('boutique.refineN', { n: rc })) : esc(T('boutique.refine'));
      refineBtn.classList.toggle('is-on', rc > 0);
      // active filter tokens
      var tok = [];
      if (st.col) tok.push({ k: 'col', v: st.col, label: S.collection(st.col).name });
      st.metal.forEach(function (m) { tok.push({ k: 'metal', v: m, label: T('metalShort.' + m) }); });
      st.stone.forEach(function (s) { tok.push({ k: 'stone', v: s, label: S.stoneName(s) }); });
      if (st.min > pb.lo || st.max < pb.hi) tok.push({ k: 'price', v: '', label: AU.fmt(st.min) + ' – ' + AU.fmt(st.max), price: true });
      activeEl.innerHTML = tok.map(function (t) {
        return '<li><button class="bq__tok" type="button" data-tok="' + t.k + '" data-v="' + esc(t.v) + '" aria-label="' + esc(T('boutique.remove', { name: t.label })) + '">' +
          '<span>' + (t.price ? AU.nums(t.label) : esc(t.label)) + '</span>' + AU.icon('close', { size: 12 }) + '</button></li>';
      }).join('') + (tok.length > 1 ? '<li><button class="link caps caps--sm bq__clear" type="button" data-bq-clear>' + esc(T('boutique.clear')) + '</button></li>' : '');
      if (titleEl.__type !== st.type) {
        titleEl.__type = st.type;
        maskSwap(titleEl, st.type ? T('types.' + st.type) : T('boutique.titleAll'));
        maskSwap(ledeEl, ledeOf(st.type), 40);
      }
      R.sync();
    };
    var commit = function (animate) {
      syncControls();
      apply(animate !== false);
      S.replaceUrl(pathOf(st));
      S.setMeta(titleOf(st), descOf(st));
    };

    /* ---------- the refine drawer (#refine, outside the page so it can be a real dialog) ---------- */
    var R = { el: document.getElementById('refine'), sync: function () {} };
    if (R.el) {
      var body = AU.$('[data-refine-body]', R.el), showBtn = AU.$('[data-refine-show]', R.el), clearBtn = AU.$('[data-refine-clear]', R.el);
      var metals = ['yellow', 'rose', 'white'];
      var stones = [];
      products.forEach(function (p) { var s = p.spec.stone || 'none'; if (stones.indexOf(s) < 0) stones.push(s); });
      stones.sort(function (a, b) { return (a === 'none') - (b === 'none'); });
      // the count a chip would show: seen as a quiet numeral, heard as ", 5 pieces" (never "Eternal Grace5")
      var COUNT = '<span class="rf__n num" aria-hidden="true" data-n></span><span class="sr-only" data-nsr></span>';
      body.innerHTML =
        '<fieldset class="rf__group"><legend class="caps caps--sm rf__legend">' + esc(T('boutique.collection')) + '</legend><div class="rf__chips">' +
          '<button class="chip rf__chip" type="button" data-rf="col" data-v="">' + esc(T('boutique.anyCollection')) + '</button>' +
          (AU.content.collections || []).map(function (c) { return '<button class="chip rf__chip" type="button" data-rf="col" data-v="' + esc(c.id) + '">' + esc(c.name) + COUNT + '</button>'; }).join('') +
        '</div></fieldset>' +
        '<fieldset class="rf__group"><legend class="caps caps--sm rf__legend">' + esc(T('boutique.metal')) + '</legend><div class="rf__chips">' +
          metals.map(function (m) { return '<button class="chip rf__chip" type="button" data-rf="metal" data-v="' + m + '">' + swatchMetal(m) + esc(T('metalShort.' + m)) + COUNT + '</button>'; }).join('') +
        '</div></fieldset>' +
        '<fieldset class="rf__group"><legend class="caps caps--sm rf__legend">' + esc(T('boutique.stone')) + '</legend><div class="rf__chips">' +
          stones.map(function (s) { return '<button class="chip rf__chip" type="button" data-rf="stone" data-v="' + s + '">' + swatchStone(s) + esc(S.stoneName(s)) + COUNT + '</button>'; }).join('') +
        '</div></fieldset>' +
        '<fieldset class="rf__group rf__group--price"><legend class="caps caps--sm rf__legend">' + esc(T('boutique.price')) + '</legend>' +
          '<div class="rf__prices"><span class="rf__pv"><span class="caps caps--sm">' + esc(T('boutique.priceFrom')) + '</span><span class="num" data-pmin></span></span>' +
          '<span class="rf__pv rf__pv--r"><span class="caps caps--sm">' + esc(T('boutique.priceTo')) + '</span><span class="num" data-pmax></span></span></div>' +
          '<div class="range2" data-range>' +
            '<span class="range2__track" aria-hidden="true"><span class="range2__fill" data-fill></span></span>' +
            '<input type="range" class="range2__in" min="' + pb.lo + '" max="' + pb.hi + '" step="' + pb.step + '" aria-label="' + esc(T('boutique.priceMin')) + '" data-rmin>' +
            '<input type="range" class="range2__in" min="' + pb.lo + '" max="' + pb.hi + '" step="' + pb.step + '" aria-label="' + esc(T('boutique.priceMax')) + '" data-rmax>' +
          '</div>' +
        '</fieldset>';
      var rmin = AU.$('[data-rmin]', body), rmax = AU.$('[data-rmax]', body), fill = AU.$('[data-fill]', body);
      var pmin = AU.$('[data-pmin]', body), pmax = AU.$('[data-pmax]', body);
      var paintRange = function () {
        var a = (st.min - pb.lo) / (pb.hi - pb.lo), b = (st.max - pb.lo) / (pb.hi - pb.lo);
        // a full-width bar, scaled from its left edge: left sets where it starts, scaleX how far it reaches
        fill.style.left = (a * 100).toFixed(3) + '%';
        fill.style.transform = 'scaleX(' + Math.max(0.0001, b - a).toFixed(4) + ')';
        pmin.textContent = AU.fmt(st.min); pmax.textContent = AU.fmt(st.max);
        rmin.setAttribute('aria-valuetext', AU.fmt(st.min)); rmax.setAttribute('aria-valuetext', AU.fmt(st.max));
      };
      R.sync = function () {
        AU.$$('[data-rf]', body).forEach(function (b) {
          var k = b.getAttribute('data-rf'), v = b.getAttribute('data-v');
          var on = k === 'col' ? st.col === v : st[k].indexOf(v) >= 0;
          b.setAttribute('aria-pressed', String(on));
          // how many pieces this choice would show, with the other filters as they are
          var nEl = AU.$('[data-n]', b);
          if (nEl) {
            var probe = Object.assign({}, st, { metal: st.metal.slice(), stone: st.stone.slice() });
            if (k === 'col') probe.col = v; else probe[k] = [v];
            var cnt = products.filter(function (p) { return matches(probe, p); }).length;
            nEl.textContent = cnt;
            var sr = AU.$('[data-nsr]', b);
            if (sr) sr.textContent = ', ' + S.plural(cnt);
            b.classList.toggle('is-zero', cnt === 0 && !on);
          }
        });
        if (document.activeElement !== rmin) rmin.value = st.min;
        if (document.activeElement !== rmax) rmax.value = st.max;
        paintRange();
        var n = current().length;
        showBtn.innerHTML = n === 0 ? esc(T('boutique.showNone')) : AU.nums(n === 1 ? T('boutique.showOne') : T('boutique.show', { n: n }));
        clearBtn.disabled = refineCount(st) === 0;
      };
      var onBody = function (e) {
        var b = e.target.closest('[data-rf]');
        if (!b) return;
        var k = b.getAttribute('data-rf'), v = b.getAttribute('data-v');
        if (k === 'col') st.col = st.col === v ? '' : v;
        else { var arr = st[k]; var at = arr.indexOf(v); if (at >= 0) arr.splice(at, 1); else arr.push(v); }
        commit(true);
      };
      var rangeT = 0;
      var onRange = function (e) {
        var lo = +rmin.value, hi = +rmax.value;
        if (e.target === rmin && lo > hi - pb.step) { lo = hi - pb.step; rmin.value = lo; }
        if (e.target === rmax && hi < lo + pb.step) { hi = lo + pb.step; rmax.value = hi; }
        st.min = lo; st.max = hi;
        paintRange();
        // the grid follows once the thumb rests for a moment, so it glides once instead of shuffling on every step
        clearTimeout(rangeT);
        rangeT = setTimeout(function () { commit(true); }, 260);
      };
      var onClear = function () {
        st.col = ''; st.metal = []; st.stone = []; st.min = pb.lo; st.max = pb.hi;
        commit(true);
      };
      body.addEventListener('click', onBody);
      rmin.addEventListener('input', onRange); rmax.addEventListener('input', onRange);
      clearBtn.addEventListener('click', onClear);
      ctx.onLeave(function () {
        body.removeEventListener('click', onBody); clearBtn.removeEventListener('click', onClear);
        clearTimeout(rangeT);
        if (AU.overlay.isOpen('refine')) AU.overlay.close('refine');
        setTimeout(function () { if (!AU.router.current || AU.router.current.name !== 'boutique') body.textContent = ''; }, 900);
      });
    }

    /* ---------- events ---------- */
    typesEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-type]');
      if (!b) return;
      var t = b.getAttribute('data-type') || null;
      if (t === st.type) return;
      st.type = t; commit(true);
    });
    sortSel.addEventListener('change', function () { st.sort = sortSel.value; commit(true); });
    refineBtn.addEventListener('click', function () { if (R.el) AU.overlay.open('refine', refineBtn); });
    activeEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-bq-clear]')) { st.col = ''; st.metal = []; st.stone = []; st.min = pb.lo; st.max = pb.hi; commit(true); return; }
      var b = e.target.closest('[data-tok]');
      if (!b) return;
      var k = b.getAttribute('data-tok'), v = b.getAttribute('data-v');
      if (k === 'col') st.col = '';
      else if (k === 'price') { st.min = pb.lo; st.max = pb.hi; }
      else st[k] = st[k].filter(function (x) { return x !== v; });
      commit(true);
      // focus stays in the row of tokens (the one removed is gone)
      var f = AU.$('.bq__tok', activeEl) || refineBtn;
      f.focus({ preventScroll: true });
    });
    AU.$('[data-bq-reset]', el).addEventListener('click', function () {
      st = { type: null, col: '', metal: [], stone: [], min: pb.lo, max: pb.hi, sort: st.sort };
      commit(true);
    });
    /* links to another view of the boutique (the header's mega menu, a hub tile) while it is open: glide there in
       place instead of reloading the page */
    var onLink = function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a[href^="#/boutique"]');
      if (!a || !el.isConnected) return;
      var full = a.getAttribute('href').slice(1), i = full.indexOf('?'), path = i >= 0 ? full.slice(0, i) : full;
      var m = path.match(/^\/boutique(?:\/([^/]+))?\/?$/);
      if (!m) return;
      var q = {};
      if (i >= 0) full.slice(i + 1).split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
      e.preventDefault();
      var ov = a.closest('.overlay'); if (ov && ov.id) AU.overlay.close(ov.id);
      st = stateFrom({ type: m[1] }, q);
      commit(true);
      if (window.scrollY > el.offsetTop + 200) { if (AU.scrollTo) AU.scrollTo(0, { immediate: AU.reduced }); else window.scrollTo(0, 0); }
    };
    document.addEventListener('click', onLink, true);
    var rzT = 0, onResize = function () {
      clearTimeout(rzT);
      rzT = setTimeout(function () { placeNote(items.filter(function (it) { return !it.li.hidden && !it.li.classList.contains('is-leaving'); }).length, false); }, 150);
    };
    window.addEventListener('resize', onResize);
    var offCur = AU.on('currency', syncControls);
    ctx.onLeave(function () {
      document.removeEventListener('click', onLink, true);
      window.removeEventListener('resize', onResize);
      clearTimeout(cleanT); clearTimeout(rzT); offCur();
    });

    titleEl.__type = st.type;
    syncControls();
    apply(false);
    // the note's span needs the grid's real column count, which exists once the page is in the document
    S.onLanded(el, ctx, function () {
      placeNote(items.filter(function (it) { return !it.li.hidden; }).length, true);
      /* an address that is not the canonical spelling of what is shown (/boutique/nope shows every piece, /boutique/ring
         shows the rings) is corrected in place, which also gives the page its true canonical link */
      if (params.type && S.SLUG[st.type] !== params.type) S.replaceUrl(pathOf(st));
    });
  };

  /* ---------- routes ---------- */
  AU.ready(function () {
    if (!AU.router) return;
    var site = function () { return ((AU.content.config && AU.content.config.siteUrl) || '').replace(/\/$/, ''); };
    AU.router.add('/collections', {
      name: 'collections',
      title: function () { return T('meta.collections'); },
      description: function () { return T('meta.collectionsDesc'); },
      jsonld: function () {
        return { '@context': 'https://schema.org', '@type': 'CollectionPage', name: T('meta.collections'), url: site() + '/collections',
          hasPart: (AU.content.collections || []).map(function (c) { return { '@type': 'Collection', name: c.name, url: site() + '/collections/' + c.id }; }) };
      },
      render: renderCollections
    });
    AU.router.add('/collections/:id', {
      name: 'collection',
      /* an unknown collection shows "not found" and must not be indexed (the router reads def.noindex when it sets the
         canonical link, just after AU.router.current points at this page) */
      get noindex() { var c = AU.router.current; return !!(c && c.name === 'collection' && !S.collection(c.params && c.params.id)); },
      title: function (p) { var c = S.collection(p.id); return c ? c.name : T('meta.notFound'); },
      description: function (p) { var c = S.collection(p.id); return c ? T('meta.collectionDesc', { name: c.name, text: c.text }) : T('meta.collectionsDesc'); },
      jsonld: function (p) {
        var c = S.collection(p.id);
        if (!c) return null;
        return { '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.name, description: c.text, url: site() + '/collections/' + c.id,
          mainEntity: { '@type': 'ItemList', itemListElement: S.products().filter(function (x) { return x.collection === c.id; }).map(function (x, i) {
            return { '@type': 'ListItem', position: i + 1, url: site() + '/piece/' + x.id, name: x.name };
          }) } };
      },
      /* the hero centres its text against the frame: on a first visit the page is shown once the faces are in (at most
         700 ms later), so the swap from fallback faces cannot move the text block (it was the one layout shift) */
      render: function (el, params, ctx) {
        renderCollection(el, params, ctx);
        return S.fontsSettled(700);
      }
    });
    var bq = {
      name: 'boutique',
      /* /boutique/<unknown> shows every piece: until its address is corrected to /boutique (renderBoutique does that once
         the page has landed) it is not indexed, so it can never be a duplicate of /boutique */
      get noindex() {
        var c = AU.router.current, m = c && c.name === 'boutique' && /^\/boutique\/([^/]+)/.exec(c.path || '');
        if (!m) return false;
        var seg = decodeURIComponent(m[1]), t = S.normType(seg);
        return !t || S.SLUG[t] !== seg;   // unknown, or a second spelling of a type (/boutique/ring for /boutique/rings)
      },
      title: function (p, q) { return titleOf(stateFrom(p, q || {})); },
      description: function (p, q) { return descOf(stateFrom(p, q || {})); },
      jsonld: function (p, q) {
        var st = stateFrom(p, q || {});
        return { '@context': 'https://schema.org', '@type': 'CollectionPage', name: titleOf(st), url: site() + '/boutique' + (st.type ? '/' + S.SLUG[st.type] : ''),
          mainEntity: { '@type': 'ItemList', itemListElement: S.products().filter(function (x) { return matches(st, x); }).map(function (x, i) {
            return { '@type': 'ListItem', position: i + 1, url: site() + '/piece/' + x.id, name: x.name };
          }) } };
      },
      render: renderBoutique
    };
    AU.router.add('/boutique', bq);
    AU.router.add('/boutique/:type', bq);
  });
})();
