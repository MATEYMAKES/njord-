/* ---- 11-home.js ---- */
/* Aurelia home '/' (v2): a short hub, about four screens.
   1 hero: the live 3D piece (persistent full-viewport GL layer, the stage box as its anchor), piece switcher, and the
     scroll flight: while the hero scrolls away the piece lifts off and lands in its hub tile (hero.setFlight), where
     the tile's still image takes over in a cross-fade. Without setFlight: a soft parallax and fade instead.
   2 "Shop by piece": Rings, Bracelets, Earrings, Pendants (still renders; a pointer-scrubbed turn on hover)
   3 featured pieces   4 doors (bespoke, gift finder, gem lab, birthstones, visit)   5 atelier line + journal
   Everything visible comes from AU.content (home.*, hero.*, ui.shell.*). */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU) return;
  var T = function (p, v) { return AU.t(p, v); };
  var esc = AU.esc;
  var shell = function () { return AU.shell || {}; };
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var STILL = DPR > 1.2 ? 960 : 480;

  var hub = function () { return (AU.content.home && AU.content.home.hub) || []; };
  var heroProducts = function () { return ((AU.content.hero && AU.content.hero.pieces) || []).map(AU.product).filter(Boolean); };
  var pIndex = function (id) { return (AU.content.products || []).findIndex(function (p) { return p.id === id; }); };
  var colOf = function (p) { return (AU.content.collections || []).find(function (c) { return c.id === p.collection; }) || null; };
  var cIndex = function (id) { return (AU.content.collections || []).findIndex(function (c) { return c.id === id; }); };
  var icon = function (n, o) { var s = shell(); return s.icon ? s.icon(n, o) : AU.icon(n, o); };
  var seasonEyebrow = function () {
    var s = shell().season ? shell().season() : (AU.season || 'none');
    var S = AU.content.seasons || {};
    return (s && s !== 'none' && S[s] && S[s].eyebrow) || (AU.content.hero && AU.content.hero.eyebrow) || '';
  };
  var titleHTML = function () {
    var tw = String((AU.content.hero && AU.content.hero.title) || '').split(/\s+/);
    return '<span class="hero__l1">' + esc(tw[0] || '') + '</span> <span class="hero__l2">' + esc(tw.slice(1).join(' ')) + '</span>';
  };
  var pieceLabel = function (p) { return T('ui.shell.hero.stageLabel', { name: p.name }); };
  /* '2026-09-18' -> '18 September 2026' in the visitor's language */
  var fmtDate = function (d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return String(d);
    try {
      var loc = AU.lang === 'fr' ? 'fr-FR' : AU.lang === 'de' ? 'de-DE' : 'en-GB';
      return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d + 'T12:00:00'));
    } catch (e) { return String(d); }
  };

  /* ---------- markup ---------- */
  var ART = '<svg class="hero__art" data-hero-art viewBox="0 0 400 400" role="img" aria-label="" focusable="false">' +
    '<defs><linearGradient id="hero-ground" gradientUnits="userSpaceOnUse" x1="118" x2="282" y1="0" y2="0">' +
    '<stop offset="0" stop-color="currentColor" stop-opacity="0"/><stop offset=".5" stop-color="currentColor" stop-opacity=".5"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>' +
    '<mask id="hero-behind" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400"><rect width="400" height="400" fill="#fff"/>' +
    '<path d="M152 117 L248 117 L248 124 L232 140 L230 156 L200 168 L170 156 L168 140 L152 124 Z" fill="#000"/></mask></defs>' +
    '<g class="hero__art-lines" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
    '<g mask="url(#hero-behind)"><ellipse cx="200" cy="262" rx="106" ry="112"/><ellipse class="ha-soft" cx="200" cy="265.5" rx="99" ry="105"/><ellipse cx="200" cy="267" rx="92" ry="98"/></g>' +
    '<path d="M171 157 C 164 146, 158 133, 156.5 121 C 156 116, 158 112.5, 162 111"/><path d="M229 157 C 236 146, 242 133, 243.5 121 C 244 116, 242 112.5, 238 111"/>' +
    '<path class="ha-soft" d="M190 161 C 187 150, 184.5 136, 184 124"/><path class="ha-soft" d="M210 161 C 213 150, 215.5 136, 216 124"/>' +
    '<path d="M156 120 L178 99 L222 99 L244 120"/><path d="M156 120 L244 120"/><path class="ha-soft" d="M156.5 123 L243.5 123"/>' +
    '<path class="ha-soft" d="M178 99 L167 120 M178 99 L189 120 L200 99 L211 120 L222 99 L233 120"/><path d="M156.5 123 L200 165 L243.5 123"/>' +
    '<path class="ha-soft" d="M178 123 L200 165 L222 123"/><path d="M118 392 L282 392" stroke="url(#hero-ground)"/></g></svg>';

  function heroHTML(products) {
    var H = AU.content.hero || {};
    return '<section class="hero" id="top" aria-labelledby="hero-title" data-hero>' +
      '<div class="wrap hero__grid">' +
        '<div class="hero__text" data-hero-text>' +
          '<p class="eyebrow caps hero__eyebrow"><span data-hero-eyebrow>' + AU.nums(seasonEyebrow()) + '</span></p>' +
          '<h1 id="hero-title" class="script t-display hero__title" data-hero-title>' + titleHTML() + '</h1>' +
          '<p class="lede hero__lede" data-t="hero.lede">' + esc(H.lede || '') + '</p>' +
          '<div class="hero__ctas">' +
            (H.primary ? '<a class="btn btn--solid hero__cta" href="' + esc(H.primary.href) + '" data-t="hero.primary.label">' + esc(H.primary.label) + '</a>' : '') +
            (H.secondary ? '<a class="btn hero__cta" href="' + esc(H.secondary.href) + '" data-t="hero.secondary.label">' + esc(H.secondary.label) + '</a>' : '') +
          '</div>' +
        '</div>' +
        '<div class="hero__visual" data-hero-visual>' +
          '<div class="hero__stage" data-hero-stage>' +
            '<div class="hero__lamp" data-hero-lamp aria-hidden="true"></div>' + ART +
            '<img class="hero__poster" data-hero-poster alt="" width="960" height="960" decoding="async" fetchpriority="high" aria-hidden="true">' +
            '<p class="hero__hint caps caps--sm" data-hero-hint aria-hidden="true">' + AU.icon('rotate', { size: 15 }) + '<span data-t="ui.shell.hero.drag">' + esc(T('ui.shell.hero.drag')) + '</span></p>' +
          '</div>' +
          '<div class="hero__switch" data-hero-switch>' +
          '<div class="hero__pieces" data-hero-pieces role="group" aria-label="' + esc(T('ui.shell.hero.choose')) + '" data-t-aria-label="ui.shell.hero.choose">' +
            '<span class="hero__pieces-mark" data-hero-mark aria-hidden="true"></span>' +
            products.map(function (p, i) {
              return '<button class="hero__piece" type="button" aria-pressed="' + (i === 0) + '" data-i="' + i + '">' +
                '<span class="hero__piece-name" data-t="products.' + pIndex(p.id) + '.name">' + esc(p.name) + '</span>' +
                '<span class="hero__piece-price"><span class="sr-only">, </span>' + AU.price(p.price) + '</span></button>';
            }).join('') +
          '</div>' +
          /* the piece on the stage has its own page: this follows the chosen piece (select() keeps it current) */
          (products.length ? '<a class="link caps caps--sm hero__view" href="#/piece/' + esc(products[0].id) + '" data-hero-view>' +
            '<span data-t="ui.shell.hero.view">' + esc(T('ui.shell.hero.view')) + '</span><span class="sr-only" data-hero-view-name>: ' + esc(products[0].name) + '</span>' +
            AU.icon('arrow', { size: 14 }) + '</a>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<a class="hero__cue" href="#hub" data-hero-cue><span class="hero__cue-line" aria-hidden="true"></span>' +
        '<span class="caps caps--sm hero__cue-label" data-t="ui.shell.hero.cue">' + esc(T('ui.shell.hero.cue')) + '</span></a>' +
    '</section>';
  }

  function secHead(key, id, link, titleKey) {
    var tk = 'ui.shell.home.' + (titleKey || key + 'Title');
    return '<div class="hsec__head">' +
      '<div class="hsec__titles"><p class="eyebrow caps" data-reveal="fade" data-t="ui.shell.home.' + key + 'Eyebrow">' + esc(T('ui.shell.home.' + key + 'Eyebrow')) + '</p>' +
      '<h2 class="script t-h2 hsec__title" id="' + id + '" data-reveal="words" data-t="' + tk + '">' + esc(T(tk)) + '</h2></div>' +
      (link ? '<a class="link caps caps--sm hsec__all" href="' + esc(link.href) + '" data-reveal="fade" data-delay="200"><span data-t="' + link.t + '">' + esc(T(link.t)) + '</span>' + AU.icon('arrow', { size: 14 }) + '</a>' : '') +
      '</div>';
  }

  function hubHTML() {
    return '<section class="hsec hub" id="hub" aria-labelledby="hub-title">' +
      '<div class="wrap">' + secHead('hub', 'hub-title', { href: '#/boutique', t: 'ui.shell.home.hubAll' }, 'shopTitle') +
      '<ul class="hub__grid" data-stagger="110">' +
      hub().map(function (h, i) {
        var n = shell().typeCount ? shell().typeCount(h.type) : 0;
        return '<li class="hub__item" data-reveal="fade"><a class="hub__tile" href="' + esc(h.href) + '" data-hub="' + i + '" data-type="' + esc(h.type) + '">' +
          '<span class="hub__well" data-well data-hub-well>' +
            '<span class="hub__ph" aria-hidden="true">' + AU.icon(h.type === 'ring' ? 'ring' : 'diamond', { size: 28 }) + '</span>' +
            '<img class="hub__still" alt="" width="480" height="480" data-hub-still>' +
            '<span class="hub__spin" aria-hidden="true"><img class="hub__sheet" alt="" data-hub-sheet></span>' +
            '<span class="hub__sheen" aria-hidden="true"></span>' +
          '</span>' +
          '<span class="hub__meta"><span class="hub__name script" data-t="home.hub.' + i + '.label">' + esc(h.label) + '</span>' +
          '<span class="hub__count caps caps--sm" data-hub-count="' + esc(h.type) + '">' + AU.nums(shell().count ? shell().count(n) : String(n)) + '</span>' +
          '<span class="hub__go caps caps--sm" aria-hidden="true"><span data-t="ui.shell.home.explore">' + esc(T('ui.shell.home.explore')) + '</span>' + AU.icon('arrow', { size: 14 }) + '</span></span>' +
        '</a></li>';
      }).join('') +
      '</ul></div></section>';
  }

  /* featured pieces: the boutique's own card (AU.shop.card: framed well, collection inside, CAPS name, material,
     price, the hover turn and the heart), so a piece looks the same wherever it is shown. Without the shop script, the
     same markup is written here (its styles live in 40-shop.css either way). */
  var featItems = function () {
    var ids = (AU.content.home && AU.content.home.featured) || [];
    return ids.map(AU.product).filter(Boolean).slice(0, 4);
  };
  function featHTML() {
    if (!featItems().length) return '';
    return '<section class="hsec feat" aria-labelledby="feat-title">' +
      '<div class="wrap">' + secHead('feat', 'feat-title', { href: '#/collections', t: 'ui.shell.home.featCollections' }) +
      '<ul class="grid feat__grid" data-feat-grid data-stagger="100"></ul></div></section>';
  }
  function featCard(p) {
    var S = AU.shop;
    var li = null;
    if (S && typeof S.card === 'function') {
      try { li = S.card(p, { compare: false, size: STILL }); } catch (e) { console.error(e); li = null; }
    }
    if (!li) {
      var c = colOf(p), pi = pIndex(p.id), ci = c ? cIndex(c.id) : -1;
      var mat = S && S.material ? S.material(p.spec) : '';
      li = document.createElement('li');
      li.className = 'grid__item';
      li.innerHTML = '<article class="card">' +
        '<div class="card__well" data-well><img class="card__piece feat__img" alt="" width="480" height="480" data-vt="piece-' + esc(p.id) + '">' +
          (c ? '<span class="card__coll caps" aria-hidden="true" data-t="collections.' + ci + '.name">' + esc(c.name) + '</span>' : '') + '</div>' +
        '<div class="card__info"><h3 class="card__name caps"><a class="card__link" href="#/piece/' + esc(p.id) + '" data-t="products.' + pi + '.name">' + esc(p.name) + '</a></h3>' +
          (mat ? '<p class="card__mat">' + esc(mat) + '</p>' : '') +
          '<p class="card__price">' + AU.price(p.price) + '</p></div></article>';
      if (shell().setImg) shell().setImg(AU.$('img', li), p.spec, STILL);
    }
    li.classList.add('feat__item');
    li.setAttribute('data-reveal', 'up');
    li.setAttribute('data-feat', p.id);
    return li;
  }
  function fillFeat(root) {
    var ul = AU.$('[data-feat-grid]', root);
    if (!ul) return;
    ul.innerHTML = '';
    featItems().forEach(function (p) { ul.appendChild(featCard(p)); });
  }

  /* the doors' plates: drawings from the atelier's sketchbook, in hairlines (200 x 200; .pl-s = the soft lines).
     They are drawn in by a sweeping pen (clip-path) when their door is revealed. */
  var f1 = function (n) { return (Math.round(n * 10) / 10).toString(); };
  var polar = function (r, deg, cx, cy) { var a = deg * Math.PI / 180; return [(cx || 100) + Math.cos(a) * r, (cy || 100) + Math.sin(a) * r]; };
  var pt = function (p) { return f1(p[0]) + ' ' + f1(p[1]); };
  var PLATES = {
    /* bespoke: the design drawing of a solitaire: centre line, the band, the stone in profile, its claws, a detail
       ring and a dimension line */
    sketch: function () {
      return '<path class="pl-s" stroke-dasharray="2 4" d="M100 22V184"/>' +
        '<circle cx="100" cy="122" r="50"/><circle class="pl-s" cx="100" cy="122" r="44"/>' +
        '<path d="M78 66L86 56H114L122 66Z"/><path class="pl-s" d="M86 56L92 66L100 56L108 66L114 56"/>' +
        '<path d="M78 66L100 92L122 66"/><path class="pl-s" d="M89 66L100 92L111 66"/>' +
        '<path d="M80 63C83 72 88 79 93 84M120 63C117 72 112 79 107 84"/>' +
        '<circle class="pl-s" cx="154" cy="46" r="15"/><path class="pl-s" d="M143 56L122 64"/>' +
        '<path class="pl-s" d="M146 46H162M154 38V54"/>' +
        '<path class="pl-s" d="M50 190H150M50 186V194M150 186V194"/>';
    },
    /* gift finder: a box tied with a ribbon, a bow on the lid */
    box: function () {
      return '<path d="M50 86L100 66L150 86L100 106Z"/><path d="M50 86V97L100 117L150 97V86"/>' +
        '<path d="M56 99.5V150L100 170L144 150V99.5"/><path d="M100 117V170"/>' +
        '<path class="pl-s" d="M75 96L125 76M75 76L125 96"/><path class="pl-s" d="M75 96V160M125 96V160"/>' +
        '<path d="M100 86C88 70 72 70 78 80C81 85 92 86 100 86ZM100 86C112 70 128 70 122 80C119 85 108 86 100 86Z"/>' +
        '<path d="M100 86L91 100M100 86L109 100"/>' +
        '<path class="pl-s" d="M62 184H138"/>';
    },
    /* gem lab: a round brilliant seen from above: girdle, table, star, bezel and upper girdle facets, one glint */
    stone: function () {
      var d = '', ds = '', i, R = 64, Rs = 44, Rt = 27, cy = 104;
      var T = [], S = [], G = [];
      for (i = 0; i < 8; i++) { T.push(polar(Rt, i * 45 + 22.5, 100, cy)); S.push(polar(Rs, i * 45, 100, cy)); G.push(polar(R, i * 45 + 22.5, 100, cy)); }
      d += 'M' + T.map(pt).join('L') + 'Z';
      for (i = 0; i < 8; i++) {
        var tp = T[(i + 7) % 8], tn = T[i], s = S[i];
        d += 'M' + pt(tp) + 'L' + pt(s) + 'L' + pt(tn);
        ds += 'M' + pt(tn) + 'L' + pt(G[i]);
        ds += 'M' + pt(G[(i + 7) % 8]) + 'L' + pt(s) + 'L' + pt(G[i]);
        ds += 'M' + pt(s) + 'L' + pt(polar(R, i * 45, 100, cy));
      }
      return '<circle cx="100" cy="' + cy + '" r="' + R + '"/><path d="' + d + '"/><path class="pl-s" d="' + ds + '"/>' +
        '<path d="M160 34C161 40 162 41 168 42C162 43 161 44 160 50C159 44 158 43 152 42C158 41 159 40 160 34Z"/>';
    },
    /* birthstones: twelve stones on a ring of months, the first one larger, a faceted stone at the centre */
    months: function () {
      var s = '', i;
      for (i = 0; i < 12; i++) {
        var p = polar(64, i * 30 - 90), r = i === 0 ? 9 : 6;
        s += '<circle' + (i === 0 ? '' : ' class="pl-s"') + ' cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="' + r + '"/>';
      }
      var q = [polar(20, -90), polar(20, -18), polar(20, 54), polar(20, 126), polar(20, 198)];
      return s + '<circle class="pl-s" cx="100" cy="100" r="42" stroke-dasharray="1 5"/>' +
        '<path d="M' + q.map(pt).join('L') + 'Z"/>' +
        '<path class="pl-s" d="M' + q.map(function (p) { return pt(p) + 'L100 100'; }).join('M') + '"/>' +
        '<path d="M100 8V18"/>';
    },
    /* visit: the atelier's arched window onto the street, its bench below, a ring resting on it */
    loupe: function () {
      return '<path d="M58 160V86A42 42 0 0 1 142 86V160"/><path class="pl-s" d="M66 160V88A34 34 0 0 1 134 88V160"/>' +
        '<path class="pl-s" d="M100 54V160M66 108H134"/>' +
        '<path d="M40 160H160"/><path class="pl-s" d="M46 166H154M52 166V192M148 166V192"/>' +
        '<ellipse cx="118" cy="154" rx="9" ry="3.5"/><path class="pl-s" d="M114 150.6L118 146L122 150.6"/>' +
        '<path class="pl-s" d="M30 196H170"/>';
    }
  };
  var plateSVG = function (name) {
    var f = PLATES[name] || PLATES.sketch;
    return '<svg class="door__svg" viewBox="0 0 200 200" focusable="false" aria-hidden="true"><g class="door__ink">' + f() + '</g></svg>';
  };

  function doorsHTML() {
    var doors = (AU.content.home && AU.content.home.doors) || [];
    if (!doors.length) return '';
    return '<section class="hsec doors" aria-labelledby="doors-title">' +
      '<div class="wrap">' +
      '<div class="doors__head"><p class="eyebrow caps" data-reveal="fade" data-t="ui.shell.home.doorsEyebrow">' + esc(T('ui.shell.home.doorsEyebrow')) + '</p>' +
      '<h2 class="sr-only" id="doors-title" data-t="ui.shell.home.doorsTitle">' + esc(T('ui.shell.home.doorsTitle')) + '</h2></div>' +
      '<ul class="doors__row" data-stagger="110">' +
      doors.map(function (d, i) {
        return '<li class="doors__item" data-reveal="up"><a class="door" href="' + esc(d.href) + '">' +
          '<span class="door__plate" aria-hidden="true">' + plateSVG(d.art) + '<span class="door__sheen"></span></span>' +
          '<span class="door__title script" data-t="home.doors.' + i + '.title">' + esc(d.title) + '</span>' +
          '<span class="door__text" data-door-text="' + i + '">' + AU.nums(d.text) + '</span>' +
          '<span class="door__go link caps caps--sm" aria-hidden="true"><span data-t="ui.shell.home.begin">' + esc(T('ui.shell.home.begin')) + '</span>' + AU.icon('arrow', { size: 14 }) + '</span>' +
        '</a></li>';
      }).join('') +
      '</ul></div></section>';
  }

  /* one still per story, and no two alike side by side: each story's own picture, unless a story above already shows
     that metal; then the first of its figures in another metal (two plain gold circles read as the same picture) */
  function storyThumbs(stories) {
    var used = {};
    return stories.map(function (s) {
      var cands = [s.spec].concat((s.figures || []).map(function (f) { return f && f.spec; })).filter(Boolean);
      var pick = cands.find(function (c) { return !used[c.metal || '-']; }) || cands[0] || null;
      if (pick) used[pick.metal || '-'] = true;
      return pick;
    });
  }

  function teaserHTML() {
    var A = (AU.content.home && AU.content.home.atelier) || {};
    var stories = (shell().journal ? shell().journal() : []).slice(0, 2);
    var J = !!stories.length;
    return '<section class="hsec teasers' + (J ? '' : ' teasers--solo') + '" aria-label="' + esc(A.eyebrow || '') + '">' +
      '<div class="wrap teasers__grid">' +
        '<div class="teaser teaser--atelier">' +
          '<p class="eyebrow caps" data-reveal="fade" data-t="home.atelier.eyebrow">' + esc(A.eyebrow || '') + '</p>' +
          '<p class="teaser__line" data-reveal="up" data-delay="120" data-teaser-line>' + AU.nums(A.line || '') + '</p>' +
          (A.link ? '<a class="link caps caps--sm teaser__link" href="' + esc(A.link.href) + '" data-reveal="fade" data-delay="260"><span data-t="home.atelier.link.label">' + esc(A.link.label) + '</span>' + AU.icon('arrow', { size: 14 }) + '</a>' : '') +
        '</div>' +
        (J ? '<div class="teaser teaser--journal">' +
          '<p class="eyebrow caps" data-reveal="fade" data-t="ui.shell.home.journalEyebrow">' + esc(T('ui.shell.home.journalEyebrow')) + '</p>' +
          '<ul class="stories" data-stagger="110">' + stories.map(function (s, i) {
            var slug = s.slug || s.id;
            var kicker = s.kicker || s.category || '';
            return '<li data-reveal="up"><a class="story' + (s.spec ? ' story--img' : '') + '" href="#/journal/' + esc(slug) + '" data-story="' + i + '">' +
              (s.spec ? '<span class="story__well" data-well aria-hidden="true"><img alt="" width="480" height="480"></span>' : '') +
              '<span class="story__txt">' +
              (kicker ? '<span class="story__kicker caps caps--sm">' + AU.nums(kicker) + '</span>' : '') +
              '<span class="story__title">' + AU.nums(s.title) + '</span>' +
              (s.date ? '<span class="story__meta small">' + AU.nums(fmtDate(s.date)) + '</span>' : '') +
              '</span><span class="story__arrow" aria-hidden="true">' + AU.icon('arrow', { size: 16 }) + '</span></a></li>';
          }).join('') + '</ul>' +
          '<a class="link caps caps--sm teaser__link" href="#/journal" data-reveal="fade"><span data-t="ui.shell.home.journalAll">' + esc(T('ui.shell.home.journalAll')) + '</span>' + AU.icon('arrow', { size: 14 }) + '</a>' +
        '</div>' : '') +
      '</div></section>';
  }

  /* ===================================================================================================
     the hero: switcher, entrance, the live piece and its flight
     =================================================================================================== */
  function initHero(el, ctx, api) {
    var hero = AU.$('[data-hero]', el);
    var text = AU.$('[data-hero-text]', hero), title = AU.$('[data-hero-title]', hero);
    var stage = AU.$('[data-hero-stage]', hero), art = AU.$('[data-hero-art]', hero);
    var lamp = AU.$('[data-hero-lamp]', hero), hint = AU.$('[data-hero-hint]', hero);
    var pieces = AU.$('[data-hero-pieces]', hero), markEl = AU.$('[data-hero-mark]', hero);
    var visual = AU.$('[data-hero-visual]', hero), grid = AU.$('.hero__grid', hero);
    var products = heroProducts();
    var current = 0, ctrl = null, layer = null, legacy = true, disposed = false, visible = true;
    var offs = [];
    var on = function (t, ev, fn, o) { t.addEventListener(ev, fn, o); offs.push(function () { t.removeEventListener(ev, fn, o); }); };
    AU.split(title);
    if (art) art.setAttribute('aria-label', T('ui.shell.hero.artLabel'));

    /* focus order follows the layout: below 900px the piece sits above the words */
    var narrowMq = matchMedia('(max-width: 899px)');
    var placeVisual = function () {
      var first = narrowMq.matches;
      if (first && grid.firstElementChild !== visual) grid.insertBefore(visual, text);
      else if (!first && grid.lastElementChild !== visual) grid.appendChild(visual);
      clearText();
    };
    var mqOn = function (fn) { if (narrowMq.addEventListener) { narrowMq.addEventListener('change', fn); offs.push(function () { narrowMq.removeEventListener('change', fn); }); } };
    var clearText = function () { text.style.transform = ''; text.style.opacity = ''; };
    placeVisual(); mqOn(placeVisual);

    /* the switcher: a hairline slides under the chosen name */
    var btns = AU.$$('.hero__piece', pieces);
    var moveMark = function () {
      var b = btns[current]; if (!b) return;
      var name = b.firstChild;
      var ls = parseFloat(getComputedStyle(name).letterSpacing) || 0;
      var rg = document.createRange(); rg.selectNodeContents(name);
      var r = rg.getBoundingClientRect(), pr = pieces.getBoundingClientRect();
      if (!r.width) return;
      markEl.style.setProperty('--mx', (r.left - pr.left - pieces.clientLeft).toFixed(1) + 'px');
      markEl.style.setProperty('--mw', Math.max(1, r.width - ls).toFixed(1));
    };
    /* "View the piece" and the stage itself lead to the chosen piece's page. While the stage shows the piece's still,
       it is named for the page change (data-vt) and flies into the product page's stage; once the live 3D piece has
       taken over (drawn in a layer outside the page, of no fixed framing) it is not named, and leaves with its page. */
    var view = AU.$('[data-hero-view]', hero), viewName = AU.$('[data-hero-view-name]', hero);
    var pieceHref = function () { var p = products[current]; return p ? '#/piece/' + p.id : null; };
    var syncView = function () {
      var p = products[current]; if (!p) return;
      if (view) view.setAttribute('href', pieceHref());
      if (viewName) viewName.textContent = ': ' + ((AU.product(p.id) || p).name || '');   // (in the current language)
      if (!stage.classList.contains('has-gl')) stage.setAttribute('data-vt', 'piece-' + p.id);
      else stage.removeAttribute('data-vt');
    };
    syncView();
    /* a press on the stage that does not turn the piece (it travels less than 6px) opens its page */
    var downAt = null;
    on(stage, 'pointerdown', function (e) { downAt = e.isPrimary ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; }, { passive: true });
    on(stage, 'click', function (e) {
      var d = downAt; downAt = null;
      if (!d || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 700) return;
      var h = pieceHref(); if (h && AU.router) AU.router.go(h.slice(1));
    });
    var select = function (i, byUser) {
      if (!products[i]) return;
      if (byUser) stopAuto();
      if (i === current) return;
      current = i;
      btns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      syncView();
      moveMark();
      var p = products[i];
      if (ctrl && ctrl.setSpec) {
        try { var r = ctrl.setSpec(p.spec); if (r && r.catch) r.catch(function () {}); } catch (e) { console.error(e); }
        labelStage();
      } else if (stage.classList.contains('has-poster') || stage.classList.contains('is-pending')) {
        setPoster(p);
      } else if (art && !AU.reduced) {
        art.animate([{ opacity: 1 }, { opacity: .35, offset: .45 }, { opacity: 1 }], { duration: 1100, easing: 'cubic-bezier(.22,.61,.36,1)' });
      }
      api.retarget();
    };
    on(pieces, 'click', function (e) { var b = e.target.closest('.hero__piece'); if (b) select(+b.getAttribute('data-i'), true); });
    on(window, 'resize', moveMark);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!disposed) moveMark(); });

    /* auto-advance every 11s until the visitor takes over; it rests while the pointer is on the piece, focus is in
       the hero, the hero is scrolled away, or an overlay is open. Never with reduced motion. */
    var AUTO_MS = 11000, autoT = 0, autoOn = false, interacted = false, hoverVis = false;
    var paused = function () {
      return hoverVis || !visible || document.hidden || document.documentElement.classList.contains('is-locked') ||
        (AU.shell && AU.shell.panelOpen) ||
        hero.contains(document.activeElement) || window.scrollY > window.innerHeight * .25;
    };
    var schedule = function () {
      clearTimeout(autoT); autoT = 0;
      if (!autoOn || interacted || AU.reduced || products.length < 2 || disposed) return;
      autoT = setTimeout(function () {
        autoT = 0;
        if (paused()) { schedule(); return; }
        select((current + 1) % products.length, false);
        schedule();
      }, AUTO_MS);
    };
    var stopAuto = function () { interacted = true; clearTimeout(autoT); autoT = 0; };
    on(visual, 'pointerenter', function (e) { if (e.pointerType !== 'touch') { hoverVis = true; clearTimeout(autoT); autoT = 0; } });
    on(visual, 'pointerleave', function () { if (hoverVis) { hoverVis = false; schedule(); } });
    on(pieces, 'focusin', stopAuto);
    on(stage, 'pointerdown', function () { if (hint) hint.classList.add('is-gone'); stopAuto(); }, { passive: true });

    /* the lamp drifts toward the pointer */
    var lx = 0, ly = 0, tx = 0, ty = 0, lampOff = null;
    /* on engine v2 the lamp lives in the GL layer (behind the canvas) and is placed over the stage from there:
       its page position is measured once (and on resize), so scrolling only moves it by transform */
    var inLayer = false, lampBase = null;
    var lampPos = function () {
      if (!inLayer) { lamp.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + ly.toFixed(1) + 'px,0)'; return; }
      if (!lampBase) return;
      lamp.style.transform = 'translate3d(' + (lampBase.x + lx).toFixed(1) + 'px,' + (lampBase.y - window.scrollY + ly).toFixed(1) + 'px,0)';
    };
    var measureLamp = function () {
      if (!inLayer) return;
      var r = stage.getBoundingClientRect();
      lampBase = { x: r.left - r.width * .22, y: r.top + window.scrollY - r.height * .22 };
      lamp.style.width = (r.width * 1.44).toFixed(1) + 'px';
      lamp.style.height = (r.height * 1.44).toFixed(1) + 'px';
      lampPos();
    };
    var lampTick = function (t, dt) {
      var k = 1 - Math.pow(.0016, dt);
      lx += (tx - lx) * k; ly += (ty - ly) * k;
      lampPos();
      if (Math.abs(tx - lx) < .2 && Math.abs(ty - ly) < .2 && lampOff) { lampOff(); lampOff = null; }
    };
    on(hero, 'pointermove', function (e) {
      if (AU.reduced || e.pointerType === 'touch') return;
      var r = stage.getBoundingClientRect();
      tx = AU.clamp((e.clientX - (r.left + r.width / 2)) * .16, -r.width * .14, r.width * .14);
      ty = AU.clamp((e.clientY - (r.top + r.height / 2)) * .16, -r.height * .14, r.height * .14);
      if (!lampOff) lampOff = AU.tick(lampTick);
    });
    on(hero, 'pointerleave', function () { tx = 0; ty = 0; if (!lampOff && !AU.reduced) lampOff = AU.tick(lampTick); });

    var labelStage = function () {
      var p = products[current]; if (!p) return;
      var l = pieceLabel(p);
      if (legacy && ctrl && ctrl.canvas) { ctrl.canvas.setAttribute('role', 'img'); ctrl.canvas.setAttribute('aria-label', l); }
      else if (ctrl) {
        stage.setAttribute('role', 'img'); stage.setAttribute('aria-label', l);
        // the engine's own canvas sits in the hidden layer; it still carries the label it was made with, so it follows
        if (typeof ctrl.setLabel === 'function') { try { ctrl.setLabel(l); } catch (e) { /* older engine */ } }
        else if (ctrl.canvas) ctrl.canvas.setAttribute('aria-label', l);
      }
    };

    /* ---------- the piece is there from the first frame: its pre-rendered still (the poster) is requested with the
       page, decoded, and shown in the stage at once (during the intro, behind the curtain). The live 3D piece is built
       once the intro has gone and this page's transition has settled (shader compiles and the first build take whole
       frames); it starts exactly as the poster's picture and takes over invisibly (the engine hides the poster in its
       first drawn frame). Without a picture and without 3D, the line drawing fades in. ---------- */
    var poster = AU.$('[data-hero-poster]', hero);
    var posterSpec = null;
    var setPoster = function (p) {
      if (!poster || !p || posterSpec === p.spec) return;
      posterSpec = p.spec;
      if (shell().setImg) shell().setImg(poster, p.spec, 960, { eager: true, onload: function () { stage.classList.add('has-poster'); } });
    };
    var showArt = function () { stage.classList.remove('is-pending'); };
    if (products.length) { stage.classList.add('is-pending'); setPoster(products[current]); }
    // no picture after a while (no pre-rendered file and no 3D): the drawing stands in
    var artT = setTimeout(showArt, AU.hasWebGL ? 9000 : 2500);
    var boot = function () {
      if (disposed) return;
      AU.gl.then(function (gl) {
        if (disposed) return;
        if (!gl || typeof gl.hero !== 'function' || !products.length) { showArt(); return; }
        // engine v1 draws inside the container it is given; v2 draws in a full-viewport layer around an anchor
        legacy = /^1\./.test(String(gl.version || '1.0'));
        var container = stage;
        if (!legacy) {
          layer = document.createElement('div');
          layer.className = 'home-gl' + (entered ? ' is-hero-in' : '');
          layer.setAttribute('aria-hidden', 'true');
          document.body.insertBefore(layer, document.getElementById('main'));
          layer.appendChild(lamp);
          lamp.classList.add('is-layer');
          inLayer = true;
          measureLamp();
          offs.push(AU.onScroll(lampPos));
          on(window, 'resize', measureLamp);
          if ('ResizeObserver' in window) {
            var lro = new ResizeObserver(function () { measureLamp(); });
            lro.observe(el); offs.push(function () { lro.disconnect(); });
          }
          container = layer;
        }
        var p = products[current];
        setPoster(p);
        var opts = { spec: p.spec, label: pieceLabel(p) };
        if (!legacy) { opts.anchor = stage; if (poster) opts.poster = poster; }
        return Promise.resolve(gl.hero(container, opts)).then(function (c) {
          if (disposed) { if (c && c.dispose) c.dispose(); return; }
          if (!c) { showArt(); return; }
          clearTimeout(artT);
          ctrl = c;
          if (AU.shell) AU.shell.hero = c;
          labelStage();
          stage.classList.add('has-gl');
          syncView();
          if (legacy) stage.classList.add('gl-legacy');
          stage.classList.remove('is-pending');
          if (art) art.setAttribute('aria-hidden', 'true');
          api.onCtrl(c, legacy, layer);
        });
      }).catch(function (e) { console.error(e); showArt(); });
    };

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: .1 });
      io.observe(hero); offs.push(function () { io.disconnect(); });
    }

    /* entrance: once the page is revealed (curtain lifting) and in place */
    var entered = false;
    var enter = function () {
      if (entered || disposed) return; entered = true;
      requestAnimationFrame(function () {
        hero.classList.add('is-in');
        if (layer) layer.classList.add('is-hero-in');
        moveMark();
        autoOn = true;
        setTimeout(schedule, 2000);
      });
    };
    api.whenPlaced(function () {
      var s = shell();
      if (s.afterReveal) s.afterReveal(enter); else enter();
      // just after the curtain, a short breath first: the header and the title are still settling
      var go = function () { setTimeout(boot, s.introShown ? 180 : 60); };
      if (s.afterIntro) s.afterIntro(go); else go();
    });

    return {
      el: hero, text: text, stage: stage, cue: AU.$('[data-hero-cue]', hero),
      switcher: AU.$('[data-hero-switch]', hero), hint: hint,
      current: function () { return products[current]; },
      ctrl: function () { return ctrl; },
      clearText: clearText,
      narrow: function () { return narrowMq.matches; },
      relabel: function () {
        AU.$('[data-hero-eyebrow]', hero).innerHTML = AU.nums(seasonEyebrow());
        title.__split = false; title.innerHTML = titleHTML(); AU.split(title);
        pieces.setAttribute('aria-label', T('ui.shell.hero.choose'));
        if (art) art.setAttribute('aria-label', T('ui.shell.hero.artLabel'));
        labelStage();
        syncView();
        requestAnimationFrame(moveMark);
      },
      reseason: function () { AU.$('[data-hero-eyebrow]', hero).innerHTML = AU.nums(seasonEyebrow()); },
      dispose: function () {
        disposed = true;
        clearTimeout(autoT); clearTimeout(artT);
        if (lampOff) lampOff();
        offs.forEach(function (f) { f(); });
        if (ctrl && ctrl.dispose) { try { ctrl.dispose(); } catch (e) { console.error(e); } }
        if (AU.shell && AU.shell.hero === ctrl) AU.shell.hero = null;
        ctrl = null;
        if (layer) { var L = layer; layer = null; L.remove(); }
      }
    };
  }

  /* ===================================================================================================
     hub tiles: stills, the landing target for the flight, and a pointer-scrubbed turn on hover
     =================================================================================================== */
  function initHub(el) {
    var tiles = AU.$$('[data-hub]', el);
    var offs = [];
    var on = function (t, ev, fn, o) { t.addEventListener(ev, fn, o); offs.push(function () { t.removeEventListener(ev, fn, o); }); };
    tiles.forEach(function (tile) {
      var h = hub()[+tile.getAttribute('data-hub')]; if (!h) return;
      var well = AU.$('[data-hub-well]', tile), still = AU.$('[data-hub-still]', tile), sheet = AU.$('[data-hub-sheet]', tile);
      if (AU.shell && AU.shell.setImg) AU.shell.setImg(still, h.spec, STILL);
      if (AU.touch) return;
      /* hover turn: the spin sheet is fetched on hover intent; the pointer's travel across the tile scrubs one turn,
         eased toward the target frame so it glides rather than ticks */
      var spin = null, loading = null, intentT = 0, inside = false, x0 = 0, f0 = 0, target = 0, shown = 0, off = null, mode = AU.getMode();
      var load = function () {
        if (loading && mode === AU.getMode()) return loading;
        mode = AU.getMode();
        loading = Promise.resolve(AU.spinImg(h.spec, { size: 400 })).then(function (r) {
          if (!r || !r.url) return null;
          var img = new Image(); img.decoding = 'async'; img.src = r.url;
          return (img.decode ? img.decode() : Promise.resolve()).then(function () {
            spin = { frames: r.frames || (r.cols * r.rows), cols: r.cols || r.frames, rows: r.rows || 1 };
            sheet.src = r.url;
            sheet.style.width = (spin.cols * 100) + '%';
            sheet.style.height = (spin.rows * 100) + '%';
            return spin;
          });
        }).catch(function () { return null; });
        return loading;
      };
      var paintFrame = function (f) {
        if (!spin) return;
        var n = spin.frames, i = ((Math.round(f) % n) + n) % n;
        var col = i % spin.cols, row = Math.floor(i / spin.cols);
        sheet.style.transform = 'translate3d(' + (-col * 100 / spin.cols).toFixed(4) + '%,' + (-row * 100 / spin.rows).toFixed(4) + '%,0)';
      };
      var tick = function (t, dt) {
        shown += (target - shown) * (1 - Math.exp(-dt * 9));
        paintFrame(shown);
        if (!inside && Math.abs(target - shown) < .05 && off) { off(); off = null; }
      };
      on(tile, 'pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || AU.reduced) return;
        inside = true; x0 = e.clientX; f0 = 0; target = shown = 0;
        clearTimeout(intentT);
        intentT = setTimeout(function () {
          load().then(function (s) {
            if (!s || !inside) return;
            paintFrame(0);
            well.classList.add('is-spinning');
            if (!off) off = AU.tick(tick);
          });
        }, 90);
      });
      on(tile, 'pointermove', function (e) {
        if (!inside || !spin) return;
        var w = tile.offsetWidth || 300;
        target = f0 + (e.clientX - x0) / w * spin.frames;
        if (!off) off = AU.tick(tick);
      });
      on(tile, 'pointerleave', function () {
        inside = false; clearTimeout(intentT);
        well.classList.remove('is-spinning');
      });
    });
    return { dispose: function () { offs.forEach(function (f) { f(); }); } };
  }

  /* ===================================================================================================
     the route
     =================================================================================================== */
  function render(el, params, ctx) {
    var products = heroProducts();
    el.innerHTML = heroHTML(products) + hubHTML() + featHTML() + doorsHTML() + teaserHTML();
    var s = shell();
    if (s.setHeaderOver) s.setHeaderOver(true);

    /* featured cards, journal thumbnails. The two thumbnails sit at the very end of the page: fetched and decoded in
       idle time once the intro has gone, never on approach (arriving mid-scroll, their first upload and raster cost a
       33–83ms frame at the bottom of the page) */
    var storyIdle = 0, gone = false;
    var storyImgs = function (root) {
      var specs = storyThumbs((s.journal ? s.journal() : []).slice(0, 2));
      AU.$$('[data-story]', root).forEach(function (a) {
        var sp = specs[+a.getAttribute('data-story')], img = AU.$('img', a);
        if (sp && img && s.setImg) s.setImg(img, sp, 480, { eager: true });
      });
    };
    var storyLater = function (root) {
      var go = function () {
        var run = function () { storyIdle = 0; if (!gone) storyImgs(root); };
        storyIdle = 'requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 1200 }) : setTimeout(run, 600);
      };
      // after the intro, and after this page's own change has settled (the hero's 3D piece boots in that slot)
      if (s.afterIntro) s.afterIntro(function () { setTimeout(go, 900); }); else setTimeout(go, 900);
    };
    fillFeat(el);
    storyLater(el);

    var cleanups = [];
    var placedFns = [], placed = false;
    var api = {
      whenPlaced: function (fn) { if (placed) fn(); else placedFns.push(fn); },
      retarget: function () { flight.retarget(); },
      onCtrl: function (c, legacy, layer) { flight.attach(c, legacy, layer); }
    };
    /* the page is "placed" once the router's transition has finished (the 'route' event for this view) */
    var offRoute = AU.on('route', function (d) {
      if (placed || !el.isConnected) return;
      placed = true;
      placedFns.splice(0).forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
    });
    cleanups.push(offRoute);

    var heroApi = initHero(el, ctx, api);
    var hubApi = initHub(el);
    var flight = initFlight(el, heroApi);
    cleanups.push(function () { flight.dispose(); hubApi.dispose(); heroApi.dispose(); });

    /* language and season: the strings that data-t cannot carry */
    cleanups.push(AU.on('lang', function () {
      heroApi.relabel();
      AU.$$('[data-hub-count]', el).forEach(function (n) { n.innerHTML = AU.nums(s.count ? s.count(s.typeCount(n.getAttribute('data-hub-count'))) : ''); });
      var doors = (AU.content.home && AU.content.home.doors) || [];
      AU.$$('[data-door-text]', el).forEach(function (n) { var d = doors[+n.getAttribute('data-door-text')]; if (d) n.innerHTML = AU.nums(d.text); });
      // the shop's cards carry their words in markup: rebuilt in the new language, already revealed
      fillFeat(el);
      AU.$$('.feat__item', el).forEach(function (li) { li.removeAttribute('data-reveal'); li.classList.remove('rv'); });
      // the teasers carry journal content (titles, dates): rebuilt whole, already revealed
      var old = AU.$('.teasers', el);
      if (old) {
        var tmp = document.createElement('div'); tmp.innerHTML = teaserHTML();
        var fresh = tmp.firstChild;
        AU.$$('[data-reveal]', fresh).forEach(function (n) { n.removeAttribute('data-reveal'); });
        old.replaceWith(fresh);
        AU.applyT(fresh); storyImgs(fresh);
      }
    }));
    var reseason = function () { heroApi.reseason(); };
    cleanups.push(AU.on('season', reseason));
    cleanups.push(AU.on('pref', function (d) { if (d && d.key === 'season') setTimeout(reseason, 0); }));

    /* leaving: the fixed GL layer lives outside the page, so it fades with the page's own exit */
    cleanups.push(AU.on('route:leave', function (d) { if (d && d.path === '/') flight.leave(); }));

    return function () {
      gone = true;
      if (storyIdle) { if ('cancelIdleCallback' in window) cancelIdleCallback(storyIdle); clearTimeout(storyIdle); }
      cleanups.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
      if (s.setHeaderOver) s.setHeaderOver(false);
    };
  }

  /* ===================================================================================================
     the scroll flight (idea 6). p runs 0 → 1 while the page scrolls through the first 70% of a screen; the
     piece is handed the landing rect (its hub tile's image box, in viewport coordinates) every frame. The rects are
     measured once and kept as page offsets (no layout reads while scrolling); a ResizeObserver re-measures.
     =================================================================================================== */
  function initFlight(el, heroApi) {
    var c = null, legacy = true, layer = null, disposed = false;
    var wells = {}, boxes = {}, targetType = null, landed = false, pauseT = 0, offScroll = null, ro = null, stageCx = null;
    AU.$$('[data-hub]', el).forEach(function (t) { wells[t.getAttribute('data-type')] = AU.$('[data-hub-well]', t); });
    var measure = function () {
      var y = window.scrollY;
      Object.keys(wells).forEach(function (k) {
        var r = wells[k].getBoundingClientRect();
        // the still is a square, centred in the well (object-fit: contain)
        var side = Math.min(r.width, r.height);
        boxes[k] = { left: r.left + (r.width - side) / 2, top: r.top + y + (r.height - side) / 2, width: side, height: side };
      });
      var sr = heroApi.stage.getBoundingClientRect();
      stageCx = sr.width ? sr.left + sr.width / 2 : null;
    };
    var sstep = function (a, b, x) { var t = AU.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    var smoother = function (k) { k = AU.clamp(k, 0, 1); return k * k * k * (k * (k * 6 - 15) + 10); };
    /* the piece keeps to its own side of the page until the hub's title has passed above its path, and crosses to its
       tile's column only in the last part of the flight. The engine eases the frame's centre by smootherstep(p) from
       the stage to the rect it is handed, so the rect is placed where that eased centre lands on the wanted path. */
    var X0 = .42, X1 = .97;
    var heldLeft = function (b, p) {
      if (stageCx == null || p <= 0 || p >= 1) return b.left;
      var e = smoother(p), g = smoother((p - X0) / (X1 - X0));
      var tcx = b.left + b.width / 2;
      var want = stageCx + (tcx - stageCx) * g;
      return (e > .001 ? stageCx + (want - stageCx) / e : tcx) - b.width / 2;
    };
    var hintGone = false;
    /* the switcher, its hairline and the drag hint label the piece on the stage: they leave with it. Driven by the
       flight's progress (no transition while scrubbing), restored when the page returns to the top. */
    var paintLeave = function (p, o) {
      var sw = heroApi.switcher;
      if (p > .01 && !hintGone && heroApi.hint) { hintGone = true; heroApi.hint.classList.add('is-gone'); }
      if (!sw) return;
      var f = document.activeElement;
      if (p <= 0 || AU.reduced || (f && sw.contains(f))) { sw.style.opacity = ''; sw.style.transform = ''; sw.style.visibility = ''; return; }
      sw.style.opacity = o.toFixed(3);
      sw.style.transform = 'translate3d(0,' + (-24 * sstep(0, .34, p)).toFixed(1) + 'px,0)';
      sw.style.visibility = o < .002 ? 'hidden' : '';
    };
    var typeOf = function () { var p = heroApi.current(); return p && p.spec ? p.spec.type : 'ring'; };
    var flightOn = function () { return !!(c && c.setFlight && !legacy && !AU.reduced); };
    var paintTarget = function () {
      Object.keys(wells).forEach(function (k) { wells[k].classList.toggle('is-await', flightOn() && !landed && k === targetType); });
    };
    var rested = false;
    /* a header panel (mega menu, preferences) open over the page: the piece rests under it (the panel and the dim
       cover the stage; a canvas that keeps drawing under a 16px backdrop blur makes the blur re-run every frame) */
    var held = !!(AU.shell && AU.shell.panelOpen);
    var setLanded = function (on) {
      if (on === landed) return;
      landed = on;
      if (layer) layer.classList.toggle('is-landed', on);
      paintTarget();
      clearTimeout(pauseT);
      // once the still has taken over (the layer's fade is .6s), the engine can rest; until then the piece keeps
      // following its tile, so a scroll during the cross-fade never pulls the two apart
      if (on) pauseT = setTimeout(function () { if (landed && c) { rested = true; if (c.pause) c.pause(); } }, 720);
      else { if (rested && !held && c && c.resume) c.resume(); rested = false; }
    };
    var leaving = false;
    var offPanel = AU.on('head:panel', function (open) {
      if (disposed) return;
      held = !!open;
      if (!c) return;
      if (held) { if (c.pause) c.pause(); return; }
      // a frame later: a click on a link in the panel closes it and then leaves the page, and the piece must not
      // wake for the page's exit
      requestAnimationFrame(function () {
        if (!disposed && !held && !rested && !leaving && c && c.resume) c.resume();
      });
    });
    var onScroll = function (y) {
      if (disposed) return;
      var vh = window.innerHeight || 1;
      var p = AU.clamp(y / (vh * .7), 0, 1);
      var fly = flightOn();
      if (fly) {
        var b = boxes[targetType] || boxes.ring;
        var rect = null;
        if (b) {
          var lx = heldLeft(b, p), ty = b.top - y;
          rect = { left: lx, top: ty, width: b.width, height: b.height, right: lx + b.width, bottom: ty + b.height };
        }
        if (p < 1 || !rested) c.setFlight(p, rect);
        setLanded(p >= 1);
        paintLeave(p, 1 - sstep(.04, .34, p));
      } else {
        // the graceful fallback: the piece eases back as the hero leaves (engine v1 listens to setScroll), and on a
        // separate layer it fades away instead of flying
        if (c && c.setScroll) c.setScroll(p);
        var lo = 1 - AU.clamp((p - .3) / .7, 0, 1);
        if (layer) layer.style.opacity = AU.reduced ? '' : lo.toFixed(3);
        paintLeave(layer ? p : 0, lo);
      }
      // wide screens: the words drift up a little slower than the page and fade (never while a link or button in
      // them has focus; the heading the router focuses after a page change does not count)
      var f = document.activeElement;
      var held = f && heroApi.text.contains(f) && f.matches && f.matches('a, button');
      // the cue has done its work once the page moves: it goes before the drifting words can pass over it
      if (heroApi.cue && !AU.reduced && (y > 0 || heroApi.cue.style.opacity)) {
        heroApi.cue.style.transition = 'opacity .35s var(--ease), color .5s var(--ease)';   // no entrance delay from here on
        heroApi.cue.style.opacity = AU.clamp(1 - y / (vh * .16), 0, 1).toFixed(3);
      }
      if (!AU.reduced && !heroApi.narrow() && !held) {
        var hp = AU.clamp(y / (vh * .9), 0, 1);
        // while the piece flies the words make way early, so only the piece moves through the open page
        var to = fly ? 1 - sstep(.02, .42, p) : AU.clamp(1 - hp * 1.4, 0, 1);
        heroApi.text.style.transform = hp > 0 ? 'translate3d(0,' + (y * .3).toFixed(1) + 'px,0)' : '';
        heroApi.text.style.opacity = hp > 0 ? to.toFixed(3) : '';
      } else if (heroApi.text.style.transform) heroApi.clearText();
    };
    var retarget = function () {
      var t = typeOf();
      if (!wells[t]) t = 'ring';
      if (t === targetType) return;
      targetType = t;
      paintTarget();
      if (c) onScroll(window.scrollY);
    };
    measure();
    retarget();
    /* the page's size changed (a font swap, an image's box, the window): the rects are read right in the observer's
       callback, where layout has just been done (reading them in a later frame, after other writes, forced a whole
       relayout of the page inside script); only the writes wait for the next frame */
    if ('ResizeObserver' in window) {
      var rT = 0;
      ro = new ResizeObserver(function () {
        if (disposed || !el.isConnected) return;
        measure();
        if (!c) return;
        cancelAnimationFrame(rT);
        rT = requestAnimationFrame(function () { if (!disposed) onScroll(window.scrollY); });
      });
      ro.observe(el);
    }
    var onResize = function () { measure(); };
    window.addEventListener('resize', onResize);
    offScroll = AU.onScroll(onScroll);
    return {
      attach: function (ctrl, isLegacy, lay) {
        c = ctrl; legacy = isLegacy; layer = lay;
        measure();
        if (!flightOn() && c && c.setFlight && !legacy) c.setFlight(0, null);   // reduced motion: the piece stays on its stage
        paintTarget();
        onScroll(window.scrollY);
        if (held && c && c.pause) c.pause();   // built while a header panel is open: it rests until the panel closes
      },
      retarget: retarget,
      leave: function () {
        leaving = true;
        if (layer) layer.classList.add('is-leaving');
        if (c && c.pause) setTimeout(function () { if (c && c.pause) c.pause(); }, 420);
      },
      dispose: function () {
        disposed = true;
        clearTimeout(pauseT);
        offPanel();
        if (offScroll) offScroll();
        if (ro) ro.disconnect();
        window.removeEventListener('resize', onResize);
      }
    };
  }

  AU.ready(function () {
    if (!AU.router) return;
    AU.router.add('/', {
      name: 'home',
      title: function () { return ''; },
      description: function () { return (AU.content.home && AU.content.home.meta && AU.content.home.meta.description) || ''; },
      jsonld: function () {
        var B = AU.content.brand || {}, cfg = AU.content.config || {};
        var url = String(cfg.siteUrl || '').replace(/\/$/, '') + '/';
        var org = { '@type': ['Organization', 'JewelryStore'], '@id': url + '#org', name: B.name || 'Aurelia', url: url, slogan: B.tagline || undefined, foundingDate: String(B.since || ''), email: B.email || undefined, telephone: B.phone || undefined };
        if (B.instagram) org.sameAs = ['https://www.instagram.com/' + String(B.instagram).replace(/^@/, '') + '/'];
        var site = { '@type': 'WebSite', '@id': url + '#site', name: B.name || 'Aurelia', url: url, inLanguage: AU.lang || 'en', publisher: { '@id': url + '#org' } };
        return { '@context': 'https://schema.org', '@graph': [org, site] };
      },
      render: render
    });
  });
})();
