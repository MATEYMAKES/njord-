/* ---- 42-shop-piece.js ---- */
/* Aurelia shop pages, part 2: the product page /piece/:id.
   Left: a large live studio (drag to turn) with a tool rail (loupe, light, try on, 360°, compare, share). The still is
   shown at once (it is the shared element the card flew in on) and the studio cross-fades in after its first frame.
   Right: collection, name, price, text, ring size, engraving with a live preview, quantity, add to bag, save.
   Below: details / delivery / care, "Stack it" for rings, "Complete the look". JSON-LD Product. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.shop) return;
  var S = AU.shop, T = S.t, esc = AU.esc;
  var hasIO = 'IntersectionObserver' in window;
  var LIGHTS = ['studio', 'daylight', 'candle', 'evening'];
  var FONTS = ['script', 'serif', 'roman'];
  var MAXLEN = 18;
  var keep = null;   // the open page's state, put aside as it is left, for a re-render of the same page (see render)

  var site = function () { return ((AU.content.config && AU.content.config.siteUrl) || '').replace(/\/$/, ''); };
  var stillUrl = function (spec) {
    var hit = AU.assets && AU.assets[AU.assetKey(spec, 'still', 960, 'dark')];
    var u = typeof hit === 'string' ? hit : hit && hit.url;
    if (!u) return null;
    return /^https?:/.test(u) ? u : site() + '/' + String(u).replace(/^\.?\//, '');
  };

  /* three pieces that belong with this one: its own house first, then shared tags; another type of piece wins ties */
  var related = function (p) {
    var tags = AU.content.productTags || {}, mine = tags[p.id] || {};
    var share = function (a, b) { return (a || []).filter(function (x) { return (b || []).indexOf(x) >= 0; }).length; };
    return S.products().filter(function (q) { return q.id !== p.id; }).map(function (q, i) {
      var t = tags[q.id] || {};
      var s = (q.collection === p.collection ? 4 : 0) + (q.spec.type !== p.spec.type ? 1.5 : 0) +
        share(mine.style, t.style) * .8 + share(mine.occasion, t.occasion) * .6 + share(mine.for, t.for) * .3;
      return { q: q, s: s, i: i };
    }).sort(function (a, b) { return b.s - a.s || a.i - b.i; }).slice(0, 3).map(function (x) { return x.q; });
  };

  var accordion = function (id, title, inner, open) {
    return '<div class="acc' + (open ? ' is-open' : '') + '">' +
      '<h2 class="acc__h"><button class="acc__btn caps" type="button" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + id + '" id="' + id + '-b">' +
        '<span>' + esc(title) + '</span><span class="acc__ico" aria-hidden="true"></span></button></h2>' +
      '<div class="acc__panel" id="' + id + '" role="region" aria-labelledby="' + id + '-b"><div class="acc__in"><div class="acc__body">' + inner + '</div></div></div>' +
    '</div>';
  };

  var missing = function (el) {
    el.innerHTML = '<section class="shop-page shop-missing"><div class="wrap"><p class="eyebrow caps">' + esc(T('boutique.eyebrow')) + '</p>' +
      '<h1 class="script t-h1">' + esc(T('piece.missingTitle')) + '</h1><p class="lede">' + esc(T('piece.missingText')) + '</p>' +
      '<a class="btn" href="#/boutique">' + esc(T('piece.missingLink')) + ' ' + AU.icon('arrow', { size: 16 }) + '</a></div></section>';
  };

  var render = function (el, params, ctx) {
    var p = AU.product(params.id);
    if (!p) { missing(el); return; }
    var spec = p.spec, col = S.collection(p.collection), ring = spec.type === 'ring';
    var canTry = spec.type === 'ring' || spec.type === 'bracelet';
    var path = '/piece/' + p.id;
    var sizes = (AU.content.bespoke && AU.content.bespoke.sizes) || [];
    var savedSize = S.savedSize ? S.savedSize() : AU.store.get('ringSize', null);
    var info = AU.content.ui.shop.info || {};
    var paras = function (arr) { return (arr || []).map(function (t) { return '<p>' + AU.nums(t) + '</p>'; }).join(''); };
    var tool = function (k, icon, label, extra) {
      return '<button class="pp__tool" type="button" data-tool="' + k + '"' + (extra || '') + '>' + S.icon(icon, { size: 20 }) + '<span class="pp__tool-l caps">' + label + '</span></button>';
    };
    var look = related(p);
    var brand = AU.content.brand || {};
    /* a language change re-renders the page in place (dir 'force'): what the visitor had set up is carried over, and the
       live studio itself is handed to the new page instead of being rebuilt (no still, no second boot) */
    var prev = ctx.dir === 'force' && keep && keep.path === path ? keep : null;
    keep = null;

    el.innerHTML =
      '<section class="shop-page pp" aria-labelledby="pp-name">' +
        '<div class="wrap">' +
          '<nav class="crumbs caps caps--sm pp__crumbs" aria-label="' + esc(T('piece.crumbs')) + '">' +
            '<a href="#/boutique">' + esc(T('piece.boutique')) + '</a><span aria-hidden="true">/</span>' +
            '<a href="#/boutique/' + S.SLUG[spec.type] + '">' + esc(T('types.' + spec.type)) + '</a><span aria-hidden="true">/</span>' +
            '<span aria-current="page">' + AU.nums(p.name) + '</span>' +
          '</nav>' +
          '<div class="pp__main">' +
            '<div class="pp__media">' +
              /* focusable: the arrow keys turn the piece (keyboard users get what a drag gives), Escape puts the loupe away */
              '<div class="pp__stage" data-vt="piece-' + esc(p.id) + '" data-cursor="drag" data-light="studio" tabindex="0" role="group" aria-label="' +
                esc(T('piece.stageLabel', { name: p.name, material: S.material(spec) })) + '" aria-description="' + esc(T('piece.stageKeys')) + '" data-pp-stage>' +
                '<div class="pp__glow" aria-hidden="true"></div>' +
                '<div class="pp__still" role="img" aria-label="' + esc(p.name + ', ' + S.material(spec)) + '" data-pp-still></div>' +
                '<div class="pp__studio" data-pp-studio></div>' +
                '<div class="pp__lens" aria-hidden="true" data-pp-lens></div>' +
                '<p class="pp__hint caps caps--sm" aria-hidden="true" data-pp-hint>' + AU.icon('rotate', { size: 15 }) + '<span>' + esc(T('piece.drag')) + '</span></p>' +
                '<p class="pp__badge caps caps--sm" aria-live="polite" data-pp-badge></p>' +
              '</div>' +
              '<div class="pp__rail" role="toolbar" aria-label="' + esc(T('piece.tools')) + '" data-pp-rail>' +
                tool('loupe', 'loupe', esc(T('piece.loupe')), ' aria-pressed="false"') +
                '<div class="pp__lightwrap">' +
                  tool('light', 'light', esc(T('piece.light')), ' aria-expanded="false" aria-haspopup="true" aria-controls="pp-lights"') +
                  '<div class="pp__lights" id="pp-lights" role="radiogroup" aria-label="' + esc(T('piece.light')) + '" hidden data-pp-lights>' +
                    LIGHTS.map(function (l) { return '<button class="pp__lightopt caps caps--sm" type="button" role="radio" aria-checked="' + (l === 'studio') + '" data-l="' + l + '"><span class="pp__lightdot pp__lightdot--' + l + '" aria-hidden="true"></span>' + esc(T('piece.lights.' + l)) + '</button>'; }).join('') +
                  '</div>' +
                '</div>' +
                (canTry ? tool('tryon', 'camera', esc(T('piece.tryon'))) : '') +
                tool('turn', 'turn', '<span class="num">360</span>°', ' aria-pressed="false" aria-label="' + esc(T('piece.turnAria')) + '"') +
                tool('compare', 'compare', esc(T('piece.compare')), ' aria-pressed="false"') +
                tool('share', 'share', esc(T('piece.share'))) +
              '</div>' +
            '</div>' +
            '<div class="pp__info">' +
              '<p class="pp__kicker caps caps--sm" data-r>' + (col ? '<a href="#/collections/' + encodeURIComponent(col.id) + '">' + esc(col.name) + '</a><span class="pp__dot" aria-hidden="true"></span><span>' + esc(col.kicker) + '</span>' : '') + '</p>' +
              '<h1 id="pp-name" class="script t-h2 pp__name" data-r>' + esc(p.name) + '</h1>' +
              '<p class="pp__price" data-r>' + AU.price(p.price) + '</p>' +
              '<p class="body pp__text" data-r>' + AU.nums(p.text) + '</p>' +
              '<p class="pp__mat small" data-r>' + esc(S.material(spec)) + '</p>' +
              '<form class="pp__form" novalidate data-pp-form data-r>' +
                (ring ?
                '<div class="pp__sizerow">' +
                  '<div class="field pp__size" data-pp-sizewrap>' +
                    '<label class="caps caps--sm" for="pp-size">' + esc(T('piece.sizeLabel')) + ' <span class="pp__unit" data-pp-sizeunit>' + esc(S.sizeUnit()) + '</span></label>' +
                    '<select id="pp-size" aria-describedby="pp-size-err" data-pp-size><option value="">' + esc(T('piece.sizeChoose')) + '</option>' +
                      sizes.map(function (s) { return '<option value="' + s + '"' + (savedSize != null && String(savedSize) === String(s) ? ' selected' : '') + '>' + esc(S.sizeOptionLabel(s)) + '</option>'; }).join('') +
                    '</select>' +
                    '<p class="field__err" id="pp-size-err" aria-live="polite" data-pp-sizeerr></p>' +
                  '</div>' +
                  '<a class="link caps caps--sm pp__find" href="#/size">' + S.icon('ring', { size: 16 }) + esc(T('piece.sizeFind')) + '</a>' +
                '</div>' +
                '<div class="eng" data-pp-eng>' +
                  '<button class="eng__toggle caps caps--sm" type="button" aria-expanded="false" aria-controls="pp-eng-panel" data-pp-engtoggle>' +
                    '<span class="eng__plus" aria-hidden="true"></span><span>' + esc(T('piece.engravingAdd')) + '</span></button>' +
                  '<div class="eng__panel" id="pp-eng-panel" data-pp-engpanel><div class="eng__in"><div class="eng__body">' +
                    '<div class="field eng__field">' +
                      '<label class="sr-only" for="pp-eng">' + esc(T('piece.engraving')) + '</label>' +
                      '<input id="pp-eng" type="text" maxlength="' + MAXLEN + '" autocomplete="off" spellcheck="false" placeholder="' + esc(T('piece.engravingPlaceholder')) + '" aria-describedby="pp-eng-count" data-pp-engtext>' +
                      '<p class="eng__count small" id="pp-eng-count" aria-live="polite" data-pp-engcount></p>' +
                    '</div>' +
                    '<div class="eng__fonts" role="radiogroup" aria-label="' + esc(T('piece.fontLabel')) + '" data-pp-fonts>' +
                      FONTS.map(function (f, i) { return '<button class="chip eng__font eng__font--' + f + '" type="button" role="radio" aria-checked="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-f="' + f + '">' + esc(T('piece.fonts.' + f)) + '</button>'; }).join('') +
                    '</div>' +
                    '<div class="eng__band" aria-label="' + esc(T('piece.engravingPreview')) + '" role="img" data-pp-band>' +
                      '<span class="eng__shine" aria-hidden="true"></span>' +
                      '<span class="eng__text eng__text--script" data-pp-engprev></span>' +
                    '</div>' +
                    '<p class="small eng__hint">' + esc(T('piece.engravingHint')) + '</p>' +
                  '</div></div></div>' +
                '</div>' : '') +
                '<div class="pp__buy">' +
                  '<div class="stepper" role="group" aria-label="' + esc(T('piece.qty')) + '">' +
                    '<button class="stepper__btn" type="button" aria-label="' + esc(T('piece.less')) + '" data-pp-minus>' + AU.icon('minus', { size: 16 }) + '</button>' +
                    '<output class="stepper__val num" aria-live="polite" data-pp-qty>1</output>' +
                    '<button class="stepper__btn" type="button" aria-label="' + esc(T('piece.more')) + '" data-pp-plus>' + AU.icon('plus', { size: 16 }) + '</button>' +
                  '</div>' +
                  '<button class="btn btn--solid pp__add" type="submit" data-pp-add><span class="pp__addl" data-pp-addl>' + esc(T('addToBag')) + '</span></button>' +
                  '<button class="btn pp__save" type="button" aria-pressed="false" data-pp-save>' + AU.icon('heart', { size: 18 }) + '<span class="pp__savel" data-pp-savel>' + esc(T('save')) + '</span></button>' +
                '</div>' +
                '<p class="pp__added small" hidden data-pp-added>' + AU.icon('check', { size: 16 }) + '<span>' + esc(T('piece.inBag')) + '</span> <button class="link caps caps--sm" type="button" data-pp-viewbag>' + esc(T('piece.viewBag')) + '</button></p>' +
              '</form>' +
              /* a person, not only a button: see the piece at a private viewing, or write / call */
              '<p class="pp__ask" data-r>' +
                '<a class="link caps caps--sm" href="#/visit?piece=' + encodeURIComponent(p.id) + '">' + AU.icon('calendar', { size: 16 }) + '<span>' + esc(T('piece.inPerson')) + '</span></a>' +
                (brand.email ? '<a class="link caps caps--sm" href="mailto:' + esc(brand.email) + '?subject=' + encodeURIComponent(T('piece.askSubject', { name: p.name })) + '">' + AU.icon('mail', { size: 16 }) + '<span>' + esc(T('piece.ask')) + '</span></a>' : '') +
                (brand.phone ? '<a class="pp__tel" href="tel:' + esc(String(brand.phone).replace(/[^+\d]/g, '')) + '" aria-label="' + esc(T('piece.call', { phone: brand.phone })) + '"><span>' + AU.nums(brand.phone) + '</span></a>' : '') +
              '</p>' +
              '<ul class="pp__promises small" data-r>' +
                (Array.isArray(T('piece.promises')) ? T('piece.promises') : []).map(function (t, i) {
                  if (i === 1 && !ring) return '';
                  return '<li>' + AU.icon(['truck', 'ring', 'gift'][i] || 'check', { size: 17 }) + '<span>' + esc(t) + '</span></li>';
                }).join('') +
              '</ul>' +
              '<div class="pp__accs" data-r data-pp-accs>' +
                accordion('pp-acc-details', T('piece.details'), '<ul class="pp__details">' + (p.details || []).map(function (d) { return '<li>' + AU.nums(d) + '</li>'; }).join('') + '</ul>', true) +
                accordion('pp-acc-delivery', T('piece.delivery'), paras(info.delivery)) +
                accordion('pp-acc-care', T('piece.care'), paras(info.care)) +
              '</div>' +
            '</div>' +
          '</div>' +
          (ring ?
          '<a class="pp__stack" href="#/stack?ids=' + encodeURIComponent(p.id) + '" data-reveal="up">' +
            '<span class="pp__stack-art" aria-hidden="true"><span class="pp__stack-a" data-pp-stacka></span><span class="pp__stack-b" data-pp-stackb></span></span>' +
            '<span class="pp__stack-text">' +
              '<span class="eyebrow caps caps--sm">' + esc(T('piece.stackEyebrow')) + '</span>' +
              '<span class="script t-h3 pp__stack-title">' + esc(T('piece.stackTitle')) + '</span>' +
              '<span class="body pp__stack-p">' + esc(T('piece.stackText')) + '</span>' +
              '<span class="link caps caps--sm pp__stack-link">' + esc(T('piece.stackLink')) + ' ' + AU.icon('arrow', { size: 16 }) + '</span>' +
            '</span>' +
          '</a>' : '') +
          (look.length ?
          '<section class="pp__look" aria-labelledby="pp-look-t">' +
            '<header class="pp__look-head"><p class="eyebrow caps" data-reveal="fade">' + esc(T('piece.lookEyebrow')) + '</p><h2 id="pp-look-t" class="script t-h2" data-reveal="words">' + esc(T('piece.lookTitle')) + '</h2></header>' +
            '<ul class="grid pp__look-grid" data-pp-look></ul>' +
          '</section>' : '') +
        '</div>' +
        '<div class="pp__bar" aria-hidden="true" data-pp-bar>' +
          '<span class="pp__bar-name caps caps--sm">' + AU.nums(p.name) + '</span>' +
          '<span class="pp__bar-price">' + AU.price(p.price) + '</span>' +
          '<button class="btn btn--solid btn--sm pp__bar-add" type="button" tabindex="-1" data-pp-baradd>' + esc(T('addToBag')) + '</button>' +
        '</div>' +
      '</section>';

    var $ = function (k) { return AU.$('[data-pp-' + k + ']', el); };
    var stage = $('stage'), stillHost = $('still'), studioHost = $('studio'), lens = $('lens'), hint = $('hint'), badge = $('badge');
    var rail = $('rail'), lights = $('lights');
    var state = { qty: 1, light: 'studio', loupe: false, turn: false, eng: '', font: 'script', studio: null, alive: true, visible: true, bar: false };
    ctx.onLeave(function () { state.alive = false; });

    /* ---------- put this page's state aside as it is left: a re-render of the same page (a language change) takes it,
       any other page lets it go (route:leave comes before the next page renders; ctx.onLeave only after the transition) */
    var offLeave = AU.on('route:leave', function (d) {
      if (!d || d.path !== path || !state.alive) return;
      offLeave();
      keep = {
        path: path, owner: state, studio: state.studio, host: studioHost,
        eng: state.eng, font: state.font, qty: state.qty, light: state.light, turn: state.turn, loupe: state.loupe,
        engOpen: !!(engBox && engBox.classList.contains('is-open')), size: sizeSel ? sizeSel.value : '',
        used: stage.classList.contains('is-used'), added: !!(added && !added.hidden), shown: stage.classList.contains('has-studio'),
        accs: AU.$$('.acc', el).map(function (a) { return a.classList.contains('is-open'); })
      };
    });
    ctx.onLeave(function () { offLeave(); if (keep && keep.owner === state) keep = null; });

    /* ---------- the still: shown at once, eager, the shared element of the page transition ---------- */
    var stillRec = S.still(stillHost, spec, { size: 960, eager: true });

    /* ---------- the live studio of the page being replaced, handed over as the new page goes in. The move waits for
       the moment the new page enters the document (the transition's swap: a mutation callback runs before the next
       frame is painted), so the old page's snapshot still shows the piece and the new one already does. ---------- */
    if (prev && prev.studio && prev.host) {
      state.studio = prev.studio;
      prev.owner.studio = null;            // the old page must not dispose it
      // already showing: in place before the first paint (no fade from the still); still preparing: shown once ready
      if (prev.shown) stage.classList.add('has-studio');
      else if (prev.studio.ready && typeof prev.studio.ready.then === 'function') {
        prev.studio.ready.then(function () {
          if (state.alive && state.studio === prev.studio) requestAnimationFrame(function () { requestAnimationFrame(function () { if (state.alive) stage.classList.add('has-studio'); }); });
        }, function () {});
      }
      var adopt = function () {
        if (adopt.done || !state.alive) return;
        adopt.done = true;
        if (adopt.mo) adopt.mo.disconnect();
        studioHost.replaceWith(prev.host);
        studioHost = prev.host;
        var cv0 = studioHost.querySelector('canvas');
        if (cv0) cv0.setAttribute('aria-label', T('piece.stageLabel', { name: p.name, material: S.material(spec) }));
        if (state.studio && state.studio.resume) { try { state.studio.resume(); } catch (e) {} }
      };
      var mainEl = document.getElementById('main');
      if (mainEl && 'MutationObserver' in window) {
        adopt.mo = new MutationObserver(function () { if (el.isConnected) adopt(); });
        adopt.mo.observe(mainEl, { childList: true });
      }
      var offAdopt = AU.on('route', function () { offAdopt(); adopt(); });
      ctx.onLeave(function () { offAdopt(); if (adopt.mo) adopt.mo.disconnect(); });
    }
    if (prev && prev.used) stage.classList.add('is-used');

    /* ---------- staggered entrance of the info column (transform and opacity); not for a re-render in place ---------- */
    if (ctx.dir !== 'force') AU.$$('[data-r]', el).forEach(function (n, i) { n.classList.add('pp__r'); n.style.setProperty('--ri', i); });

    /* ---------- the live studio, mounted once the page has landed (never during the transition) ---------- */
    var mountStudio = function () {
      if (!state.alive || state.studio) return;
      AU.gl.then(function (gl) {
        if (!gl || !gl.studio || !state.alive || state.studio) return;
        var st;
        // matchStill: the studio's first view reproduces the still (.pp__still: 86% of the stage's height, at most 94% of
        // its width), so the cross-fade from the picture to the live piece has no double image (integrator)
        try { st = gl.studio(studioHost, { spec: spec, label: T('piece.stageLabel', { name: p.name, material: S.material(spec) }), matchStill: { h: 0.86, w: 0.94 } }); } catch (e) { return; }
        if (!st) return;
        state.studio = st;
        var show = function () {
          if (!state.alive || state.studio !== st) return;   // (handed to a re-rendered page meanwhile: it is theirs)
          requestAnimationFrame(function () { requestAnimationFrame(function () { if (state.alive) stage.classList.add('has-studio'); }); });
          if (state.light !== 'studio') applyLight(state.light, true);
          if (state.eng) pushEngraving(true);
          if (state.turn) applyTurn(true);
          if (!state.visible && st.pause) st.pause();
        };
        if (st.ready && typeof st.ready.then === 'function') st.ready.then(show, function () {}); else setTimeout(show, 300);
      });
    };
    ctx.onLeave(function () {
      var st = state.studio; state.studio = null;
      if (turnOff) { turnOff(); turnOff = null; }
      if (st && st.dispose) { try { st.dispose(); } catch (e) {} }
    });
    var landed = false;
    var land = function () { if (landed) return; landed = true; setTimeout(mountStudio, AU.reduced ? 0 : 120); };
    var offRoute = AU.on('route', function (d) { if (d && d.path === path) { offRoute(); land(); } });
    ctx.onLeave(offRoute);
    setTimeout(function () { if (el.isConnected) land(); }, 2600);
    // pause the studio while it is off screen
    if (hasIO) {
      var vio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          state.visible = e.isIntersecting;
          var st = state.studio;
          if (!st) return;
          if (e.isIntersecting) { if (st.resume) st.resume(); } else if (st.pause) st.pause();
        });
      });
      vio.observe(stage);
      ctx.onLeave(function () { vio.disconnect(); });
    }
    stage.addEventListener('pointerdown', function () { stage.classList.add('is-used'); });

    var flash = function (msg) {
      badge.textContent = msg;
      badge.classList.remove('is-on'); void badge.offsetWidth; badge.classList.add('is-on');
      clearTimeout(flash.t); flash.t = setTimeout(function () { badge.classList.remove('is-on'); }, 2200);
    };

    /* ---------- tool: loupe ---------- */
    var lensMove = null;
    var setLoupe = function (on, quiet) {
      state.loupe = on;
      AU.$('[data-tool="loupe"]', rail).setAttribute('aria-pressed', String(on));
      // the lens is the pointer while it is on: the glint cursor stands aside (atmos hides it over data-cursor="loupe")
      stage.setAttribute('data-cursor', on ? 'loupe' : 'drag');
      var st = state.studio;
      if (st && typeof st.loupe === 'function') {
        try { st.loupe(on, { zoom: 4 }); } catch (e) {}
        stage.classList.toggle('is-loupe-gl', on);
      } else {
        // fallback: a lens over the still (the studio rests underneath while it is on)
        stage.classList.toggle('is-loupe', on);
        if (on && !lensMove) {
          lensMove = function (e) {
            var r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
            var sr = stillHost.getBoundingClientRect(), z = 2.6, size = sr.width * z;
            lens.style.transform = 'translate3d(' + (x - 90) + 'px,' + (y - 90) + 'px,0)';
            lens.style.backgroundSize = size + 'px ' + size + 'px';
            lens.style.backgroundPosition = (-(e.clientX - sr.left) * z + 90) + 'px ' + (-(e.clientY - sr.top) * z + 90) + 'px';
            lens.classList.add('is-on');
          };
          stage.addEventListener('pointermove', lensMove);
          stage.addEventListener('pointerleave', hideLens);
        }
        if (on) lens.style.backgroundImage = stillRec.url ? 'url("' + stillRec.url + '")' : '';
        if (!on && lensMove) { stage.removeEventListener('pointermove', lensMove); stage.removeEventListener('pointerleave', hideLens); lensMove = null; hideLens(); }
      }
      if (on && !quiet) flash(T('piece.loupeOn'));
    };
    var hideLens = function () { lens.classList.remove('is-on'); };

    /* ---------- keyboard: the stage turns with the arrow keys; Escape puts the loupe away (stage or rail) ---------- */
    var nudge = function (dir) {
      var st = state.studio;
      if (!st) return;
      stage.classList.add('is-used');
      if (typeof st.nudge === 'function') { try { st.nudge(dir * 22); } catch (e) {} return; }
      // engines without nudge(): a short push on the orbit, which then eases to rest by itself (about 20°)
      var S2 = st._state, stg = st._stage;
      if (S2 && stg) { S2.vAz = AU.clamp((S2.vAz || 0) + dir * 1.3, -3, 3); S2.idle = 0; if (stg.wake) stg.wake(); }
    };
    stage.addEventListener('keydown', function (e) {
      if (e.target !== stage) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); nudge(e.key === 'ArrowRight' ? 1 : -1); }
    });
    AU.$('.pp__media', el).addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !state.loupe || e.target.closest('[data-pp-lights]')) return;
      e.preventDefault();
      setLoupe(false);
    });

    /* ---------- tool: light ---------- */
    var applyLight = function (l, quiet) {
      state.light = l;
      var st = state.studio;
      if (st && typeof st.setLight === 'function') { try { st.setLight(l); } catch (e) {} stage.setAttribute('data-light-gl', l); }
      stage.setAttribute('data-light', l);
      AU.$$('[data-l]', lights).forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-l') === l)); });
      if (!quiet) flash(T('piece.lightNow', { name: T('piece.lights.' + l) }));
    };
    var lightBtn = AU.$('[data-tool="light"]', rail);
    var openLights = function (on) {
      lightBtn.setAttribute('aria-expanded', String(on));
      if (on) {
        lights.hidden = false; void lights.offsetWidth; lights.classList.add('is-on');
        var cur = AU.$('[aria-checked="true"]', lights); if (cur) cur.focus();
      } else {
        lights.classList.remove('is-on');
        setTimeout(function () { if (!lights.classList.contains('is-on')) lights.hidden = true; }, AU.reduced ? 0 : 400);
      }
    };
    lights.addEventListener('click', function (e) {
      var b = e.target.closest('[data-l]');
      if (!b) return;
      applyLight(b.getAttribute('data-l'));
      openLights(false); lightBtn.focus();
    });
    lights.addEventListener('keydown', function (e) {
      var opts = AU.$$('[data-l]', lights), i = opts.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); openLights(false); lightBtn.focus(); }
    });
    var onDocDown = function (e) { if (!lights.hidden && !e.target.closest('.pp__lightwrap')) openLights(false); };
    document.addEventListener('pointerdown', onDocDown);
    ctx.onLeave(function () { document.removeEventListener('pointerdown', onDocDown); });

    /* ---------- tool: 360° (a slow turn by itself) ---------- */
    var turnOff = null;
    var applyTurn = function (quiet) {
      var st = state.studio, on = state.turn && !AU.reduced;
      AU.$('[data-tool="turn"]', rail).setAttribute('aria-pressed', String(state.turn));
      if (turnOff) { turnOff(); turnOff = null; }
      if (!st) return;
      if (typeof st.autoTurn === 'function') { try { st.autoTurn(on); } catch (e) {} return; }
      if (typeof st.setAutoTurn === 'function') { try { st.setAutoTurn(on); } catch (e) {} return; }
      // engines without the method: keep the orbit drifting by feeding it a gentle angular speed
      var S2 = st._state, stg = st._stage;
      if (on && S2 && stg) {
        var speed = 0;
        turnOff = AU.tick(function (t, dt) {
          if (!state.alive || !state.studio) return;
          if (S2.drag || S2.pinch) { speed = 0; return; }
          speed += (0.42 - speed) * Math.min(1, dt * 1.5);   // eases in, never jumps
          S2.vAz = speed; S2.idle = 0;
          if (stg.wake) stg.wake();
        });
      }
      void quiet;
    };

    /* ---------- tool: try on ---------- */
    var tryOn = function () {
      var btn = AU.$('[data-tool="tryon"]', rail);
      if (AU.tryon && typeof AU.tryon.open === 'function') { try { AU.tryon.open(spec, btn); } catch (e) { AU.toast(T('piece.tryonNone'), 'close'); } }
      else AU.toast(T('piece.tryonNone'), 'close');
    };

    /* ---------- tool: compare ---------- */
    var syncCompare = function () {
      var b = AU.$('[data-tool="compare"]', rail), on = S.compare.has(p.id);
      b.setAttribute('aria-pressed', String(on));
      AU.$('.pp__tool-l', b).textContent = on ? T('piece.compareOn') : T('piece.compare');
    };
    var offCmp = AU.on('compare', syncCompare);
    ctx.onLeave(offCmp);

    /* ---------- tool: share ---------- */
    var share = function (btn) {
      var url = location.href;
      var done = function () { AU.toast(T('piece.shared'), 'check'); AU.sparkleAt(btn, { count: 6, spread: 40 }); };
      if (AU.touch && navigator.share) { navigator.share({ title: document.title, url: url }).catch(function () {}); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { AU.toast(T('piece.shareFail'), 'close'); });
      else AU.toast(T('piece.shareFail'), 'close');
    };

    rail.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tool]');
      if (!b) return;
      var k = b.getAttribute('data-tool');
      if (k === 'loupe') setLoupe(!state.loupe);
      else if (k === 'light') openLights(lights.hidden);
      else if (k === 'tryon') tryOn();
      else if (k === 'turn') { state.turn = !state.turn; applyTurn(); }
      else if (k === 'compare') { S.compare.toggle(p.id, b); }
      else if (k === 'share') share(b);
    });
    // a toolbar: arrow keys move between its tools
    rail.addEventListener('keydown', function (e) {
      if (e.target.closest('[data-pp-lights]')) return;
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) < 0) return;
      var ts = AU.$$('.pp__tool', rail), i = ts.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = e.key === 'Home' ? 0 : e.key === 'End' ? ts.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ts.length) % ts.length;
      ts[n].focus();
    });

    /* ---------- size ---------- */
    var sizeSel = $('size'), sizeWrap = $('sizewrap'), sizeErr = $('sizeerr');
    if (sizeSel) sizeSel.addEventListener('change', function () {
      if (sizeSel.value) { sizeWrap.classList.remove('is-bad'); sizeErr.textContent = ''; AU.store.set('ringSize', +sizeSel.value); }
    });
    /* a currency change (pounds show the UK letter) re-labels the sizes in place; the chosen US value stays */
    if (sizeSel) {
      var offCurSize = AU.on('currency', function () {
        AU.$$('option[value]', sizeSel).forEach(function (o) { if (o.value) o.textContent = S.sizeOptionLabel(o.value); });
        var u = $('sizeunit'); if (u) u.textContent = S.sizeUnit();
      });
      ctx.onLeave(offCurSize);
    }

    /* ---------- engraving: text, lettering and a live preview, sent to the studio as you type ---------- */
    var engT = 0;
    var pushEngraving = function (now) {
      clearTimeout(engT);
      var go = function () {
        var st = state.studio;
        if (!st) return;
        try {
          if (typeof st.setEngraving === 'function') st.setEngraving(state.eng, state.font);
          else if (typeof st.setSpec === 'function') st.setSpec(Object.assign({}, spec, { engraving: state.eng, engravingFont: state.font }));
          if (state.eng && typeof st.showEngraving === 'function') st.showEngraving();
        } catch (e) {}
      };
      if (now) go(); else engT = setTimeout(go, 650);
    };
    var engBox = $('eng');
    if (engBox) {
      var engToggle = $('engtoggle'), engText = $('engtext'), engCount = $('engcount'), engPrev = $('engprev'), fontsEl = $('fonts');
      var paintEng = function () {
        engCount.innerHTML = AU.nums(T('piece.engravingCount', { n: state.eng.length }));
        var txt = state.eng || T('piece.engravingSample');
        // numerals stay Cormorant Infant lining figures in every lettering (never a date in the script)
        if (engPrev.__txt !== txt) { engPrev.__txt = txt; engPrev.innerHTML = AU.nums(txt); }
        engPrev.classList.toggle('is-sample', !state.eng);
      };
      engToggle.addEventListener('click', function () {
        var open = engToggle.getAttribute('aria-expanded') !== 'true';
        engToggle.setAttribute('aria-expanded', String(open));
        engBox.classList.toggle('is-open', open);
        if (open) setTimeout(function () { engText.focus({ preventScroll: true }); }, AU.reduced ? 0 : 350);
        else if (state.eng) { state.eng = ''; engText.value = ''; paintEng(); pushEngraving(true); }
      });
      engText.addEventListener('input', function () {
        state.eng = engText.value.slice(0, MAXLEN);
        paintEng(); pushEngraving();
      });
      var setFont = function (f, focus) {
        state.font = f;
        AU.$$('[data-f]', fontsEl).forEach(function (b) { var on = b.getAttribute('data-f') === f; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
        // the lettering changes softly: the old words fade down, the new ones rise
        engPrev.classList.add('is-swap');
        setTimeout(function () {
          FONTS.forEach(function (x) { engPrev.classList.toggle('eng__text--' + x, x === f); });
          engPrev.classList.remove('is-swap');
        }, AU.reduced ? 0 : 220);
        if (state.eng) pushEngraving();
      };
      fontsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) setFont(b.getAttribute('data-f')); });
      fontsEl.addEventListener('keydown', function (e) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
        e.preventDefault();
        var i = FONTS.indexOf(state.font), d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
        setFont(FONTS[(i + d + FONTS.length) % FONTS.length], true);
      });
      paintEng();
    }
    ctx.onLeave(function () { clearTimeout(engT); });

    /* ---------- quantity ---------- */
    var qtyEl = $('qty'), minus = $('minus'), plus = $('plus');
    var setQty = function (q) { state.qty = AU.clamp(q, 1, 9); qtyEl.textContent = state.qty; minus.disabled = state.qty <= 1; plus.disabled = state.qty >= 9; };
    minus.addEventListener('click', function () { setQty(state.qty - 1); });
    plus.addEventListener('click', function () { setQty(state.qty + 1); });
    setQty(1);

    /* ---------- add to bag ---------- */
    var addBtn = $('add'), addL = $('addl'), added = $('added'), barAdd = $('baradd'), addedT = 0;
    var addToBag = function (from) {
      var size = sizeSel ? sizeSel.value : '';
      if (ring && !size) {
        sizeWrap.classList.add('is-bad');
        sizeErr.textContent = T('piece.sizeErr');
        if (from === barAdd) {
          var y = sizeWrap.getBoundingClientRect().top + window.scrollY - window.innerHeight * .35;
          if (AU.scrollTo) AU.scrollTo(y, { immediate: AU.reduced }); else window.scrollTo({ top: y, behavior: AU.reduced ? 'auto' : 'smooth' });
          setTimeout(function () { sizeSel.focus({ preventScroll: true }); }, AU.reduced ? 0 : 700);
        } else sizeSel.focus();
        return;
      }
      var meta = [S.ringMeta(p, ring ? size : null)];
      if (ring && state.eng) meta.push(T('engraved', { t: state.eng }) + ' (' + T('piece.fonts.' + state.font) + ')');
      var itemSpec = Object.assign({}, spec);
      if (ring && state.eng) { itemSpec.engraving = state.eng; itemSpec.engravingFont = state.font; }
      S.addToBag({ id: p.id, name: p.name, price: p.price, qty: state.qty, spec: itemSpec, meta: meta.join(' · ') }, from || addBtn);
      addBtn.classList.add('is-done');
      addL.innerHTML = AU.icon('check', { size: 16 }) + esc(T('added'));
      added.hidden = false;
      clearTimeout(addedT);
      addedT = setTimeout(function () { addBtn.classList.remove('is-done'); addL.textContent = T('addToBag'); }, 2600);
    };
    $('form').addEventListener('submit', function (e) { e.preventDefault(); addToBag(addBtn); });
    barAdd.addEventListener('click', function () { addToBag(barAdd); });
    $('viewbag').addEventListener('click', function (e) { S.openBag('bag', e.currentTarget); });
    ctx.onLeave(function () { clearTimeout(addedT); });

    /* ---------- save ---------- */
    var saveBtn = $('save'), saveL = $('savel');
    var syncSave = function () { var on = AU.wish.has(p.id); saveBtn.setAttribute('aria-pressed', String(on)); saveL.textContent = on ? T('saved') : T('save'); };
    saveBtn.addEventListener('click', function () { S.toggleWish(p.id, saveBtn); });
    var offWish = AU.on('wish', syncSave);
    ctx.onLeave(offWish);

    /* ---------- accordions ---------- */
    $('accs').addEventListener('click', function (e) {
      var b = e.target.closest('.acc__btn');
      if (!b) return;
      var acc = b.closest('.acc'), open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      acc.classList.toggle('is-open', open);
    });

    /* ---------- stack and the look ---------- */
    if (ring) {
      var band = AU.product('au-aurum-band') || AU.product('au-lumiere-eternity');
      S.still($('stacka'), spec, { size: 480 });
      if (band && band.id !== p.id) S.still($('stackb'), band.spec, { size: 480 });
      else { var alt = AU.product('au-lumiere-eternity'); if (alt) S.still($('stackb'), alt.spec, { size: 480 }); }
    }
    var lookEl = $('look');
    if (lookEl) look.forEach(function (q, i) {
      var li = S.card(q);
      li.setAttribute('data-reveal', 'up'); li.setAttribute('data-delay', String(i * 110));
      lookEl.appendChild(li);
    });

    /* ---------- phones: a bar with the price and the bag once the real button has been scrolled past ----------
       Only after the page has landed (the old page's scroll position means nothing here), with a fresh observer, and
       only while the main Add to bag button is ABOVE the screen (under the header): never while it is still below,
       where it is about to be seen, and never over the name on the first screen. While the bar is up, the page's
       scroll padding keeps focused fields and headings clear of it. */
    var bar = $('bar'), rootEl = document.documentElement, phone = window.matchMedia('(max-width: 899px)');
    var setBar = function (on) {
      if (on === state.bar) return;
      state.bar = on;
      if (on) rootEl.style.setProperty('--ppbar-h', (bar.offsetHeight || 64) + 'px');
      bar.classList.toggle('is-on', on);
      bar.setAttribute('aria-hidden', String(!on));
      barAdd.tabIndex = on ? 0 : -1;
      rootEl.classList.toggle('has-ppbar', on);
    };
    var bio = null;
    var watchBar = function () {
      if (!state.alive || bio) return;
      var addMain = AU.$('.pp__add', el);
      var headH = function () { return parseInt(getComputedStyle(rootEl).getPropertyValue('--head-h'), 10) || 64; };
      var judge = function (r) { setBar(phone.matches && r.bottom < headH()); };
      if (hasIO) {
        bio = new IntersectionObserver(function (es) { es.forEach(function (e) { judge(e.boundingClientRect); }); },
          { threshold: [0, 1], rootMargin: '-' + headH() + 'px 0px 0px 0px' });
        bio.observe(addMain);
      } else {
        var offS = AU.onScroll(function () { judge(addMain.getBoundingClientRect()); });
        bio = { disconnect: offS };
      }
    };
    var onPhone = function () { if (!phone.matches) setBar(false); else if (bio) { bio.disconnect(); bio = null; watchBar(); } };
    if (phone.addEventListener) phone.addEventListener('change', onPhone);
    S.onLanded(el, ctx, watchBar);
    ctx.onLeave(function () {
      if (bio) bio.disconnect();
      if (phone.removeEventListener) phone.removeEventListener('change', onPhone);
      rootEl.classList.remove('has-ppbar');
    });

    /* ---------- the tool rail fits its labels: one row while they fit, else two rows of three (a long language, a
       narrow column). Phones always have the two rows (CSS), so nothing below the rail can move there. ---------- */
    var fitRail = function () {
      if (!rail.isConnected) return;
      rail.classList.remove('is-two');
      if (rail.scrollWidth > rail.clientWidth + 1) rail.classList.add('is-two');
    };
    var fitT = 0, onFit = function () { clearTimeout(fitT); fitT = setTimeout(fitRail, 140); };
    window.addEventListener('resize', onFit);
    ctx.onLeave(function () { window.removeEventListener('resize', onFit); clearTimeout(fitT); });
    S.onLanded(el, ctx, function () {
      fitRail();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (state.alive) fitRail(); });
    });

    /* ---------- a re-render in place: what the visitor had set, as it was (no entrance, no animation) ---------- */
    if (prev) {
      if (prev.qty) setQty(prev.qty);
      if (sizeSel && prev.size) sizeSel.value = prev.size;
      if (prev.light && prev.light !== 'studio') {
        state.light = prev.light;
        stage.setAttribute('data-light', prev.light);
        if (state.studio && typeof state.studio.setLight === 'function') stage.setAttribute('data-light-gl', prev.light);
        AU.$$('[data-l]', lights).forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-l') === prev.light)); });
      }
      if (prev.turn) { state.turn = true; applyTurn(true); }
      if (prev.loupe) setLoupe(true, true);
      if (engBox) {
        state.eng = prev.eng || ''; state.font = FONTS.indexOf(prev.font) >= 0 ? prev.font : 'script';
        AU.$('[data-pp-engtext]', el).value = state.eng;
        AU.$$('[data-f]', el).forEach(function (b) { var on = b.getAttribute('data-f') === state.font; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
        var ep = AU.$('[data-pp-engprev]', el);
        FONTS.forEach(function (x) { ep.classList.toggle('eng__text--' + x, x === state.font); });
        if (prev.engOpen) { engBox.classList.add('is-open'); AU.$('[data-pp-engtoggle]', el).setAttribute('aria-expanded', 'true'); }
        if (paintEng) paintEng();
      }
      if (prev.accs) AU.$$('.acc', el).forEach(function (a, i) {
        if (prev.accs[i] == null) return;
        a.classList.toggle('is-open', !!prev.accs[i]);
        AU.$('.acc__btn', a).setAttribute('aria-expanded', String(!!prev.accs[i]));
      });
      if (prev.added) added.hidden = false;
    }

    syncCompare();
    syncSave();
  };

  AU.ready(function () {
    if (!AU.router) return;
    AU.router.add('/piece/:id', {
      name: 'piece',
      /* an address that names no piece ("This piece has moved") must not be indexed: the router reads def.noindex when
         it sets the canonical link, just after AU.router.current points at this page, so a getter can judge the id */
      get noindex() { var c = AU.router.current; return !!(c && c.name === 'piece' && !AU.product(c.params && c.params.id)); },
      title: function (p) { var x = AU.product(p.id); return x ? x.name : T('meta.notFound'); },
      description: function (p) {
        var x = AU.product(p.id);
        return x ? T('meta.pieceDesc', { name: x.name, text: x.text, material: S.material(x.spec) }) : T('meta.boutiqueDesc');
      },
      jsonld: function (params) {
        var x = AU.product(params.id);
        if (!x) return null;
        var c = S.collection(x.collection);
        var d = {
          '@context': 'https://schema.org', '@type': 'Product', name: x.name, description: x.text,
          sku: x.id, category: T('typeOne.' + x.spec.type), material: S.material(x.spec),
          brand: { '@type': 'Brand', name: (AU.content.brand && AU.content.brand.name) || 'Aurelia' },
          url: site() + '/piece/' + x.id,
          offers: { '@type': 'Offer', price: Number(x.price).toFixed(2), priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: site() + '/piece/' + x.id }
        };
        var img = stillUrl(x.spec);
        if (img) d.image = [img];
        if (c) d.additionalProperty = [{ '@type': 'PropertyValue', name: 'Collection', value: c.name }];
        return d;
      },
      render: render
    });
  });
})();
