/* ---- 43-shop-compare.js ---- */
/* Aurelia shop pages, part 3: /compare?ids=a,b,c — up to three pieces side by side.
   One WebGL canvas turns them together (AUGL.compare, when the engine has it); otherwise their stills stand side by
   side. Below, a comparison table: price, collection, metal, stone, cut, centre stone, details; add to bag / remove. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.shop) return;
  var S = AU.shop, T = S.t, esc = AU.esc;

  var idsFrom = function (q) {
    var ids = String((q && q.ids) || '').split(',').map(function (x) { return decodeURIComponent(x).trim(); })
      .filter(function (id, i, a) { return id && AU.product(id) && a.indexOf(id) === i; }).slice(0, 3);
    return ids.length ? ids : S.compare.list();
  };

  var render = function (el, params, ctx) {
    var ids = idsFrom(ctx.query);
    if (ids.join(',') !== S.compare.list().join(',')) S.compare.set(ids);
    el.innerHTML =
      '<section class="shop-page cmp" aria-labelledby="cmp-title">' +
        '<div class="wrap">' +
          '<header class="cmp__head shop-head">' +
            '<div class="shop-head__intro"><p class="eyebrow caps" data-reveal="fade">' + esc(T('comparePage.eyebrow')) + '</p>' +
            '<h1 id="cmp-title" class="script t-h2 cmp__title" data-reveal="words">' + esc(T('comparePage.title')) + '</h1></div>' +
            '<p class="lede cmp__lede" data-reveal="up" data-delay="140">' + esc(T('comparePage.lede')) + '</p>' +
          '</header>' +
          '<div class="cmp__body" data-cmp-body></div>' +
        '</div>' +
      '</section>';
    var body = AU.$('[data-cmp-body]', el);
    var stage = document.createElement('div');
    stage.className = 'cmp__stage';
    stage.setAttribute('data-cursor', 'drag');
    stage.innerHTML = '<div class="cmp__stills" data-cmp-stills></div><div class="cmp__gl" data-cmp-gl></div>';
    var stillsEl = AU.$('[data-cmp-stills]', stage), glEl = AU.$('[data-cmp-gl]', stage);
    var gl3 = null, alive = true, glT = 0;
    ctx.onLeave(function () { alive = false; clearTimeout(glT); if (gl3 && gl3.dispose) { try { gl3.dispose(); } catch (e) {} } gl3 = null; });

    var label = function (list) { return T('comparePage.canvasLabel', { names: list.map(function (p) { return p.name; }).join(', ') }); };
    /* the canvas is laid out as the table's columns (always side by side, at every width, with the table's own column
       gap), so each piece stands exactly above its name, price and actions. --cg in 40-shop.css, in px. */
    var colGap = function () { return window.innerWidth <= 767 ? 12 : Math.round(AU.clamp(window.innerWidth * .02, 14, 32)); };
    var mountGL = function (list) {
      if (!list.length) return;
      AU.gl.then(function (gl) {
        if (!alive || !gl || typeof gl.compare !== 'function') return;
        var specs = list.map(function (p) { return p.spec; });
        if (gl3) { try { gl3.setSpecs(specs); } catch (e) {} return; }
        try { gl3 = gl.compare(glEl, { specs: specs, label: label(list), layout: 'columns', gap: colGap() }); } catch (e) { gl3 = null; return; }
        if (!gl3) return;
        var show = function () { if (alive) requestAnimationFrame(function () { stage.classList.add('has-gl'); }); };
        if (gl3.ready && typeof gl3.ready.then === 'function') gl3.ready.then(show, function () {}); else glT = setTimeout(show, 700);
      });
    };

    var cell = function (k, inner, i) { return '<div class="cmp__cell" role="' + (k === 'head' ? 'columnheader' : 'cell') + '" data-col="' + i + '" style="--ci:' + i + '">' + inner + '</div>'; };
    var row = function (k, cells) {
      return '<div class="cmp__row" role="row"><div class="cmp__lab caps caps--sm" role="rowheader">' + esc(T('comparePage.rows.' + k)) + '</div>' + cells + '</div>';
    };
    var build = function (animate) {
      var list = ids.map(AU.product).filter(Boolean), n = list.length;
      el.querySelector('.cmp').style.setProperty('--n', Math.max(1, n));
      if (!n) {
        body.innerHTML =
          '<div class="cmp__empty">' +
            '<span class="cmp__empty-mark" aria-hidden="true">' + S.icon('compare', { size: 26 }) + '</span>' +
            '<p class="script t-h3">' + esc(T('comparePage.emptyTitle')) + '</p>' +
            '<p class="body">' + esc(T('comparePage.emptyText')) + '</p>' +
            '<a class="btn" href="#/boutique">' + esc(T('comparePage.emptyLink')) + ' ' + AU.icon('arrow', { size: 16 }) + '</a>' +
          '</div>';
        if (gl3 && gl3.dispose) { try { gl3.dispose(); } catch (e) {} gl3 = null; }
        return;
      }
      var none = T('none');
      var vals = {
        price: function (p) { return '<span class="cmp__price">' + AU.price(p.price) + '</span>'; },
        collection: function (p) { var c = S.collection(p.collection); return c ? '<a class="cmp__a" href="#/collections/' + encodeURIComponent(c.id) + '">' + esc(c.name) + '</a>' : none; },
        metal: function (p) { return esc(S.metalName(p.spec.metal)); },
        stone: function (p) { return esc(p.spec.stone ? S.stoneName(p.spec.stone) : none); },
        cut: function (p) { return esc(p.spec.stone && p.spec.cut ? T('cuts.' + p.spec.cut) : none); },
        carat: function (p) { return +p.spec.carat > 0 && p.spec.stone ? AU.nums(T('carat', { n: (+p.spec.carat).toFixed(2) })) : esc(none); },
        details: function (p) { return '<ul class="cmp__details">' + (p.details || []).map(function (d) { return '<li>' + AU.nums(d) + '</li>'; }).join('') + '</ul>'; }
      };
      // a name breaks between its words, never inside "Three-Stone"
      var nameHTML = function (name) {
        return String(name).split(' ').map(function (w) { return w.indexOf('-') > 0 ? '<span class="cmp__nw">' + AU.nums(w) + '</span>' : AU.nums(w); }).join(' ');
      };
      var heads = list.map(function (p, i) {
        return cell('head',
          '<a class="cmp__name caps" href="#/piece/' + encodeURIComponent(p.id) + '">' + nameHTML(p.name) + '</a>' +
          '<p class="cmp__mat small">' + esc(S.material(p.spec)) + '</p>' +
          '<div class="cmp__acts">' +
            '<button class="btn btn--solid btn--sm cmp__add" type="button" data-add="' + esc(p.id) + '">' + esc(T('addToBag')) + '</button>' +
            '<button class="link caps caps--sm cmp__rm" type="button" data-rm="' + esc(p.id) + '" aria-label="' + esc(T('comparePage.removeAria', { name: p.name })) + '">' + esc(T('comparePage.remove')) + '</button>' +
          '</div>', i);
      }).join('');
      var more = n < 3 ? '<a class="cmp__more" href="#/boutique" style="--ci:' + n + '"><span class="cmp__more-plus" aria-hidden="true"></span><span class="caps caps--sm">' + esc(T('comparePage.addMore')) + '</span></a>' : '';
      body.innerHTML =
        '<div class="cmp__top' + (animate ? ' is-in' : '') + '"><div class="cmp__lab cmp__lab--top" aria-hidden="true"></div><div class="cmp__stagecell" data-stagecell></div>' + more + '</div>' +
        '<div class="cmp__table' + (animate ? ' is-in' : '') + '" role="table" aria-label="' + esc(T('comparePage.title')) + '">' +
          '<div class="cmp__row cmp__row--head" role="row"><div class="cmp__lab" role="cell"></div>' + heads + '</div>' +
          Object.keys(vals).map(function (k) { return row(k, list.map(function (p, i) { return cell(k, vals[k](p), i); }).join('')); }).join('') +
        '</div>';
      AU.$('[data-stagecell]', body).appendChild(stage);
      // stills, one per column, under the canvas (and instead of it without the engine)
      var have = {};
      AU.$$('.cmp__still', stillsEl).forEach(function (s) { have[s.__id] = s; });
      stillsEl.textContent = '';
      list.forEach(function (p) {
        var s = have[p.id];
        if (!s) {
          s = document.createElement('div'); s.className = 'cmp__still'; s.__id = p.id;
          s.setAttribute('role', 'img'); s.setAttribute('aria-label', p.name + ', ' + S.material(p.spec));
          S.still(s, p.spec, { size: 640, eager: true });
          S.spin(s, s, p.spec);
        }
        stillsEl.appendChild(s);
      });
      mountGL(list);
      var q = '/compare?ids=' + ids.map(encodeURIComponent).join(',');
      S.replaceUrl(q);
    };
    body.addEventListener('click', function (e) {
      var a = e.target.closest('[data-add]'), r = e.target.closest('[data-rm]');
      if (a) {
        var p = AU.product(a.getAttribute('data-add'));
        if (!p) return;
        // a ring takes the size saved on /size, like every other way into the bag
        S.addToBag({ id: p.id, name: p.name, price: p.price, qty: 1, spec: p.spec, meta: S.ringMeta(p) }, a);
      } else if (r) {
        var id = r.getAttribute('data-rm');
        var cells = AU.$$('.cmp__cell[data-col="' + ids.indexOf(id) + '"]', body);
        var go = function () { ids = ids.filter(function (x) { return x !== id; }); S.compare.remove(id); build(true); var f = AU.$('.cmp__rm', body) || AU.$('a', body); if (f) f.focus({ preventScroll: true }); };
        if (AU.reduced) { go(); return; }
        cells.forEach(function (c) { c.classList.add('is-out'); });
        var still = AU.$$('.cmp__still', stillsEl).filter(function (s) { return s.__id === id; })[0];
        if (still) still.classList.add('is-out');
        setTimeout(go, 380);
      }
    });
    build(false);
  };

  AU.ready(function () {
    if (!AU.router) return;
    AU.router.add('/compare', {
      name: 'compare',
      title: function () { return T('meta.compare'); },
      description: function () { return T('meta.compareDesc'); },
      render: render
    });
  });
})();
