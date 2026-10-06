/* ---- 52-stack.js ---- */
/* /stack: the stack builder (idea 10). Up to three rings on one finger: chosen from the ring products (bands,
   eternity rings, solitaires), set in order, removed; the price of the set; "Add all to bag". The stage is
   AUGL.stack (rings on a porcelain hand, from gl-scenes-b); without it, the rings' stills stand in a column.
   Order: ids[0] sits nearest the hand, the last nearest the nail. The list shows them as they sit on the finger,
   the top of the list nearest the nail. Shareable: '#/stack?ids=au-aurum-band,au-grace-solitaire'. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.bespoke || !AU.bespoke.kit) return;
  var kit = AU.bespoke.kit;
  var T = function (k, v) { return AU.t('ui.bespoke.stack.' + k, v); };

  function rings() {
    var styles = (AU.content.stack && AU.content.stack.styles) || ['band', 'eternity', 'solitaire'];
    return (AU.content.products || []).filter(function (p) { return p.spec && p.spec.type === 'ring' && styles.indexOf(p.spec.style) >= 0; });
  }
  var MAX = function () { return (AU.content.stack && AU.content.stack.max) || 3; };
  var metalLine = function (p) {
    if (AU.shop && AU.shop.material) { var m = AU.shop.material(p.spec); if (m) return m; }
    var me = (AU.content.bespoke.metals || []).find(function (x) { return x.id === p.spec.metal; });
    var st = p.spec.stone ? kit.stoneById(p.spec.stone) : null;
    return (me ? me.label : '') + (st ? ' · ' + st.label : '');
  };
  /* the metal line as markup: each part ('18k Yellow Gold', 'Diamond') holds together, so a narrow slot wraps only
     between the parts, never inside a metal's name */
  var metaHtml = function (p) {
    return metalLine(p).split(' · ').map(function (s) { return AU.esc(s).replace(/ /g, '&nbsp;'); }).join('&nbsp;· ');
  };

  /* a still of a piece, faded in once decoded; re-fetched when the mode changes. URLs are kept per spec and mode, so
     redrawing the list never asks for the same picture twice. */
  var urls = new Map();
  var urlFor = function (spec, size) {
    var k = JSON.stringify(spec) + '|' + size + '|' + AU.getMode();
    if (!urls.has(k)) urls.set(k, AU.img(spec, { size: size }).catch(function () { return null; }));
    return urls.get(k);
  };
  function still(host, spec, size) {
    var gen = 0;
    var load = function () {
      var g = ++gen;
      urlFor(spec, size).then(function (url) {
        if (g !== gen || host.__dead) return;
        if (!url) {
          // neither a pre-rendered file nor 3D: the piece is drawn flat instead
          if (AU.$('.sk__ill', host)) return;
          var box = document.createElement('div');
          box.className = 'sk__ill';
          host.appendChild(box);
          kit.Illustration(box).set(spec);
          requestAnimationFrame(function () { box.classList.add('is-in'); });
          return;
        }
        var img = new Image();
        img.decoding = 'async'; img.alt = ''; img.className = 'sk__img';
        img.onload = function () {
          if (g !== gen) return;
          var old = AU.$$('.sk__img', host);
          host.appendChild(img);
          requestAnimationFrame(function () { img.classList.add('is-in'); });
          setTimeout(function () { old.forEach(function (o) { o.remove(); }); }, 900);
        };
        img.src = url;
      }, function () {});
    };
    load();
    return { reload: load, kill: function () { gen++; host.__dead = true; } };
  }

  function render(el, params, ctx) {
    var frag = kit.clone('tpl-stack');
    if (!frag) return;
    el.appendChild(frag);
    var root = AU.$('.sk', el);
    var $ = function (s) { return AU.$(s, root); };
    var list = rings(), byId = {};
    list.forEach(function (p) { byId[p.id] = p; });
    var leaving = false, gl = null, scene = null, stills = [];
    /* any ring can join a stack: a ring that arrives by link ('Stack it' on its product page) or from the last visit
       but is not one of the usual stacking styles (a trinity, a halo) is added to the chooser, first in the row */
    var guest = function (a) {
      (a || []).forEach(function (id) {
        if (byId[id]) return;
        var p = AU.product(id);
        if (p && p.spec && p.spec.type === 'ring') { byId[id] = p; list.unshift(p); }
      });
    };
    var qIds = ctx.query.ids ? String(ctx.query.ids).split(',') : null;
    var savedIds = AU.store.get('stack', null);
    guest(qIds); if (!qIds && Array.isArray(savedIds)) guest(savedIds);

    /* ---------- state ---------- */
    var clean = function (a) { return (a || []).filter(function (id) { return !!byId[id]; }).slice(0, MAX()); };
    var ids = clean(qIds);
    if (!qIds) {
      var saved = savedIds;
      ids = Array.isArray(saved) ? clean(saved) : [];
      if (!ids.length && !Array.isArray(saved)) {
        var band = list.find(function (p) { return p.spec.style === 'band' || p.spec.style === 'eternity'; });
        var sol = list.find(function (p) { return p.spec.style === 'solitaire'; });
        ids = [band && band.id, sol && sol.id].filter(Boolean);
      }
    }

    /* ---------- the picks ---------- */
    var picksEl = $('[data-sk-picks]');
    picksEl.setAttribute('data-n', list.length);
    picksEl.innerHTML = list.map(function (p, i) {
      return '<li class="sk__pick" style="--i:' + i + '"><button class="sk__pbtn" type="button" data-add="' + AU.esc(p.id) + '">' +
        '<span class="sk__pimg" data-still="' + AU.esc(p.id) + '"></span>' +
        '<span class="sk__pname caps caps--sm">' + AU.esc(p.name) + '</span>' +
        '<span class="sk__pprice">' + AU.price(p.price) + '</span>' +
        '<span class="sk__pcount num" data-count aria-hidden="true"></span>' +
        '<span class="sk__padd" aria-hidden="true">' + AU.icon('plus', { size: 16 }) + '</span>' +
        '</button></li>';
    }).join('');
    AU.$$('[data-still]', picksEl).forEach(function (h) { stills.push(still(h, byId[h.getAttribute('data-still')].spec, 480)); });

    /* ---------- slots, the price, the stage ---------- */
    var slotsEl = $('[data-sk-slots]'), priceEl = $('[data-sk-price]'), addBtn = $('[data-sk-add]'), addL = $('[data-sk-addl]');
    var clearBtn = $('[data-sk-clear]'), live = $('[data-sk-live]'), frame = $('[data-sk-frame]'), stageEl = $('[data-sk-stage]'), flat = $('[data-sk-flat]');
    var setPrice = kit.priceTween(priceEl);
    var slotStills = [];
    function drawSlots(anim) {
      slotStills.forEach(function (s) { s.kill(); }); slotStills = [];
      var n = MAX(), html = '';
      // shown as they sit on the finger: the top of the list is nearest the nail
      for (var k = n - 1; k >= 0; k--) {
        var id = ids[k], p = id ? byId[id] : null;
        if (!p) {
          html += '<li class="sk__slot is-empty"><span class="sk__sn num" aria-hidden="true">' + (k + 1) + '</span>' +
            '<span class="sk__sthumb" aria-hidden="true"></span><span class="sk__sbody"><span class="sk__sname caps caps--sm">' + AU.nums(T('slot', { n: k + 1 })) + '</span>' +
            '<span class="sk__smeta">' + AU.esc(T('emptySlot')) + '</span></span></li>';
          continue;
        }
        var nm = AU.esc(p.name);
        html += '<li class="sk__slot' + (anim === k ? ' is-new' : '') + '" data-k="' + k + '"><span class="sk__sn num" aria-hidden="true">' + (k + 1) + '</span>' +
          '<span class="sk__sthumb" data-sthumb="' + AU.esc(p.id) + '"></span>' +
          '<span class="sk__sbody"><a class="sk__sname caps caps--sm" href="#/piece/' + AU.esc(p.id) + '">' + nm + '</a><span class="sk__smeta">' + metaHtml(p) + '</span></span>' +
          '<span class="sk__sprice">' + AU.price(p.price) + '</span>' +
          '<span class="sk__sacts">' +
            '<button class="sk__sbtn" type="button" data-up="' + k + '" aria-label="' + AU.esc(T('up', { name: p.name })) + '"' + (k >= ids.length - 1 ? ' disabled' : '') + '>' + kit.svgIcon('<path d="M6 15l6-6 6 6"/>', 18) + '</button>' +
            '<button class="sk__sbtn" type="button" data-down="' + k + '" aria-label="' + AU.esc(T('down', { name: p.name })) + '"' + (k === 0 ? ' disabled' : '') + '>' + AU.icon('chevron', { size: 18 }) + '</button>' +
            '<button class="sk__sbtn" type="button" data-remove="' + k + '" aria-label="' + AU.esc(T('remove', { name: p.name })) + '">' + AU.icon('close', { size: 16 }) + '</button>' +
          '</span></li>';
      }
      slotsEl.innerHTML = html;
      AU.$$('[data-sthumb]', slotsEl).forEach(function (h) { slotStills.push(still(h, byId[h.getAttribute('data-sthumb')].spec, 480)); });
    }
    function update(o) {
      o = o || {};
      drawSlots(o.anim);
      var total = ids.reduce(function (a, id) { return a + byId[id].price; }, 0);
      setPrice(total);
      addBtn.disabled = !ids.length;
      clearBtn.hidden = !ids.length;
      var full = ids.length >= MAX();
      AU.$$('[data-add]', picksEl).forEach(function (b) {
        var id = b.getAttribute('data-add'), c = ids.filter(function (x) { return x === id; }).length;
        var cEl = AU.$('[data-count]', b);
        cEl.textContent = c ? '×' + c : '';
        b.classList.toggle('is-in', c > 0);
        b.setAttribute('aria-disabled', full ? 'true' : 'false');
        b.setAttribute('aria-label', T('add') + ': ' + byId[id].name + ', ' + AU.fmt(byId[id].price) + (c ? ' (' + T('inStack') + ')' : ''));
      });
      root.classList.toggle('is-full', full);
      AU.store.set('stack', ids.slice());
      if (AU.router.current && AU.router.current.el === el) kit.setQuery({ ids: ids.join(',') }, 'stack');
      var names = ids.map(function (id) { return byId[id].name; }).join(', ');
      var label = ids.length ? T('stageLabel', { names: names }) : T('stageEmpty');
      flat.setAttribute('aria-label', label);
      if (scene && scene.canvas) scene.canvas.setAttribute('aria-label', label);
      if (!o.silent) {
        pushStage();
        live.textContent = (ids.length ? names + '. ' : '') + T('total') + ' ' + AU.fmt(total);
      }
    }

    /* The stage: AUGL.stack (the rings on a porcelain hand) when it is there. While it prepares, the frame waits empty
       in its own soft light, so the first composition the visitor sees is the hand: the rings' stills never stand in
       for it (a column of stills and a hand are two different pictures, and one dissolving into the other reads as a
       double exposure). Only without 3D (no WebGL, no stack scene, or a scene that is not ready after a long while)
       do the stills stand in a column; if the hand then arrives after all, the column leaves first and the hand comes
       in after it, never through it. */
    var specs = function () { return ids.map(function (id) { return byId[id].spec; }); };
    var flatKey = '', flatOn = false, flatT = 0, handT = 0;
    function showFlat() {
      if (flatOn || leaving || frame.classList.contains('is-gl')) return;
      flatOn = true;
      frame.classList.add('is-flat');
      drawFlat();
    }
    function drawFlat() {
      var key = ids.join('|') + '|' + AU.getMode();
      if (key === flatKey) return;
      flatKey = key;
      var old = AU.$$('.sk__col', flat);
      var col = document.createElement('div');
      col.className = 'sk__col';
      col.setAttribute('data-n', ids.length);
      if (!ids.length) col.innerHTML = '<p class="sk__empty caps caps--sm">' + AU.esc(T('empty')) + '</p>';
      // nearest the nail at the top, as on the finger
      ids.slice().reverse().forEach(function (id, i) {
        var h = document.createElement('span');
        h.className = 'sk__ring'; h.style.setProperty('--k', i);
        col.appendChild(h);
        still(h, byId[id].spec, 480);
      });
      flat.appendChild(col);
      requestAnimationFrame(function () { col.classList.add('is-in'); old.forEach(function (o) { o.classList.remove('is-in'); }); });
      setTimeout(function () { old.forEach(function (o) { o.remove(); }); }, 900);
    }
    var stageT = 0;
    function pushStage() {
      clearTimeout(stageT);
      stageT = setTimeout(function () {
        if (leaving) return;
        if (scene) { try { scene.setSpecs(specs()); } catch (e) { console.error(e); } }
        if (flatOn) drawFlat();
      }, 60);
    }

    /* ---------- interactions ---------- */
    picksEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-add]');
      if (!b) return;
      if (ids.length >= MAX()) { AU.toast(T('full'), 'ring'); return; }
      ids.push(b.getAttribute('data-add'));
      if (AU.sound && AU.sound.play) { try { AU.sound.play('tick'); } catch (er) {} }
      update({ anim: ids.length - 1 });
    });
    slotsEl.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.disabled) return;
      var k, focusSel = null;
      if (b.hasAttribute('data-remove')) { k = +b.getAttribute('data-remove'); ids.splice(k, 1); focusSel = '[data-add]'; }
      else if (b.hasAttribute('data-up')) { k = +b.getAttribute('data-up'); var t = ids[k]; ids[k] = ids[k + 1]; ids[k + 1] = t; focusSel = '[data-up="' + (k + 1) + '"]'; }
      else if (b.hasAttribute('data-down')) { k = +b.getAttribute('data-down'); var t2 = ids[k]; ids[k] = ids[k - 1]; ids[k - 1] = t2; focusSel = '[data-down="' + (k - 1) + '"]'; }
      else return;
      update({});
      var f = focusSel === '[data-add]' ? (AU.$('[data-remove]', slotsEl) || AU.$('[data-add]', picksEl)) : AU.$(focusSel, slotsEl);
      if (f && !f.disabled) f.focus({ preventScroll: true });
      else { var any = AU.$('.sk__sbtn:not([disabled])', slotsEl) || AU.$('[data-add]', picksEl); if (any) any.focus({ preventScroll: true }); }
    });
    clearBtn.addEventListener('click', function () { ids = []; update({}); var f = AU.$('[data-add]', picksEl); if (f) f.focus({ preventScroll: true }); });
    var addT = 0;
    addBtn.addEventListener('click', function () {
      if (!ids.length) return;
      // every ring goes in with the visitor's measured size (from /size or a product page), or marked to be confirmed,
      // the same line the product page and the bag use
      var size = kit.ringSize();
      var sizeTxt = size ? AU.t('ui.shop.size', { s: AU.shop && AU.shop.sizeLabel ? AU.shop.sizeLabel(size) : kit.sizeWord(size) }) : AU.t('ui.shop.sizeTbc');
      var items = ids.map(function (id) { var p = byId[id]; return { id: p.id, name: p.name, price: p.price, qty: 1, spec: p.spec, meta: metalLine(p) + ' · ' + sizeTxt }; });
      var last = items.pop();
      items.forEach(function (it) { AU.cart.add(it); });
      kit.addToBag(last, addBtn, T('addedToast', { n: ids.length }));
      addL.textContent = T('addedAll');
      addBtn.classList.add('is-done');
      clearTimeout(addT);
      addT = setTimeout(function () { addL.textContent = T('addAll'); addBtn.classList.remove('is-done'); }, 2600);
    });
    var offMode = AU.on('mode', function () {
      stills.forEach(function (s) { s.reload(); });
      slotStills.forEach(function (s) { s.reload(); });
      if (flatOn) drawFlat();
    });

    update({ silent: true });
    AU.reveal(root);

    // no WebGL: the stills are the stage from the first frame
    if (!AU.hasWebGL) showFlat();
    var noHand = function () { if (!leaving) showFlat(); };
    /* the hand is the page's subject: its scene is made while the page arrives (the engine holds its heavy slices
       until the page change has finished), so it is ready about a second sooner than after the landing */
    kit.settled(el, ctx, { early: true }).then(function () {
      // a stage that has not come after six seconds (a slow device): the stills meanwhile
      flatT = setTimeout(noHand, 6000);
      return AU.gl;
    }).then(function (g) {
      gl = g;
      if (leaving) return;
      if (!g || typeof g.stack !== 'function') { noHand(); return; }
      try { scene = g.stack(stageEl, { specs: specs(), label: ids.length ? T('stageLabel', { names: ids.map(function (id) { return byId[id].name; }).join(', ') }) : T('stageEmpty') }); }
      catch (e) { console.error(e); scene = null; noHand(); return; }
      if (!scene) { noHand(); return; }
      Promise.resolve(scene.ready).catch(function () {}).then(function () {
        if (leaving) return;
        clearTimeout(flatT);
        requestAnimationFrame(function () {
          if (leaving) return;
          flat.removeAttribute('role'); flat.setAttribute('aria-hidden', 'true');
          if (!flatOn || AU.reduced) { frame.classList.add('is-gl'); return; }
          // the stills step out first (.35 s); the hand comes in after them
          frame.classList.add('is-gl-out');
          handT = setTimeout(function () { if (!leaving) frame.classList.add('is-gl'); }, 380);
        });
      });
    });

    return function () {
      leaving = true;
      clearTimeout(stageT); clearTimeout(addT); clearTimeout(flatT); clearTimeout(handT); offMode();
      stills.concat(slotStills).forEach(function (s) { s.kill(); });
      if (scene) { try { scene.dispose(); } catch (e) { console.error(e); } scene = null; }
    };
  }

  AU.ready(function () {
    if (!AU.router) return;
    AU.router.add('/stack', {
      name: 'stack',
      title: function () { return AU.t('ui.bespoke.meta.stack.title'); },
      description: function () { return AU.t('ui.bespoke.meta.stack.description'); },
      render: render
    });
  });
})();
