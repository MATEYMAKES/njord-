/* ---- 65-story-birthstones.js ---- */
/* Story: the birthstone calendar ('/birthstones', idea 15).
   A strip of twelve months (the current month chosen; numerals in Cormorant Infant), a stage with the twelve stones on a
   slowly turning ring (AUGL.birthstones; without 3D: twelve gem swatches on a drawn ring, turned by script), and the
   chosen stone: name, colour, meaning, care, hardness, and a door to bespoke with that stone ('#/bespoke?stone=id'), or
   "Ask us" ('#/visit?reason=bespoke…') for stones the bespoke studio does not offer. ?month=1..12 is shareable. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.storyKit) return;
  var K = AU.storyKit;
  var T = function (p, v) { return K.t('birthstones.' + p, v); };
  var stones = function () { return AU.content.birthstones || []; };
  /* the bespoke studio sets a stone when its content lists it outside the gem lab's own group (pearl, opal: by
     commission only, so "Ask us") */
  var offered = function (id) {
    var list = (AU.content.bespoke && AU.content.bespoke.stones) || [];
    return list.some(function (s) { return s.id === id && s.group !== 'lab'; }) && id !== 'pearl' && id !== 'opal' && id !== 'turquoise';
  };

  function pageHTML(m) {
    var list = stones();
    return '<div class="sp bst">' +
      K.head({ eyebrow: T('eyebrow'), titleHTML: AU.nums(T('title')), lede: T('lede'), cls: 'bst__head', compact: true }) +
      '<div class="bst__months wrap" role="radiogroup" aria-label="' + AU.esc(T('months')) + '" data-bst-months>' + list.map(function (s, i) {
        return '<button class="bst__m" type="button" role="radio" aria-checked="' + (i === m ? 'true' : 'false') + '" tabindex="' + (i === m ? '0' : '-1') + '" data-i="' + i + '"' +
          ' aria-label="' + AU.esc(K.monthName(i) + ', ' + s.name) + '">' +
          '<span class="bst__mn num">' + K.pad2(i + 1) + '</span><span class="bst__ml caps caps--sm">' + AU.esc(K.monthName(i, 'short').replace(/\.$/, '')) + '</span>' +
          '<span class="bst__mdot" aria-hidden="true" style="background:' + AU.esc(s.swatch) + '"></span></button>';
      }).join('') + '<span class="bst__mbar" aria-hidden="true" data-bst-bar></span></div>' +
      '<section class="bst__main wrap" aria-label="' + AU.esc(T('eyebrow')) + '">' +
        '<div class="bst__stagebox"><div class="bst__stage" data-bst-stage role="img"></div></div>' +
        '<div class="bst__info" data-bst-info aria-live="polite"></div>' +
      '</section>' +
      K.doors([
        { kicker: K.t('gifts.eyebrow'), title: K.t('gifts.title'), href: '#/gifts' },
        { kicker: K.t('journal.eyebrow'), title: (AU.content.journal && AU.content.journal[2] && AU.content.journal[2].title) || K.t('journal.title'), href: '#/journal/stone-by-candlelight' }
      ]) +
    '</div>';
  }

  function infoHTML(i) {
    var s = stones()[i]; if (!s) return '';
    var ask = !offered(s.id);
    var href = ask ? '#/visit?reason=bespoke&notes=' + encodeURIComponent(s.name + ' — ' + T('monthOf', { month: K.monthName(i) })) : '#/bespoke?stone=' + encodeURIComponent(s.id);
    return '<p class="eyebrow caps bst__of">' + AU.nums(T('monthOf', { month: K.monthName(i) })) + '</p>' +
      '<h2 class="script t-h1 bst__name">' + AU.esc(s.name) + '</h2>' +
      '<dl class="bst__facts">' +
        '<div class="bst__fact"><dt class="caps caps--sm">' + AU.esc(T('colour')) + '</dt><dd><span class="bst__sw" aria-hidden="true" style="background:' + AU.esc(s.swatch) + '"></span>' + AU.nums(s.colour) + '</dd></div>' +
        '<div class="bst__fact"><dt class="caps caps--sm">' + AU.esc(T('meaning')) + '</dt><dd>' + AU.nums(s.meaning) + '</dd></div>' +
        '<div class="bst__fact"><dt class="caps caps--sm">' + AU.esc(T('care')) + '</dt><dd>' + AU.nums(s.care) + '</dd></div>' +
        (s.hardness ? '<div class="bst__fact"><dt class="caps caps--sm">' + AU.esc(T('hardness')) + '</dt><dd><span class="num">' + AU.esc(s.hardness) + '</span> <span class="bst__mohs">' + AU.esc(T('mohs')) + '</span></dd></div>' : '') +
      '</dl>' +
      '<div class="bst__cta">' +
        '<a class="btn btn--solid" href="' + AU.esc(href) + '">' + AU.esc(T(ask ? 'ask' : 'design')) + AU.icon('arrow', { size: 16 }) + '</a>' +
        (ask ? '<p class="small bst__note">' + AU.nums(T('askNote')) + '</p>' : '') +
      '</div>';
  }

  /* One stone, drawn once onto a small canvas: a round brilliant from above (the stone's own colours from its swatch,
     eight soft kite facets, star lines, the octagonal table, a crown highlight), a pearl's lustre, or an opal's play of
     colour. Painted once, the twelve stones are plain bitmaps that the compositor can move for free. */
  var hexes = function (s) { return String(s || '').match(/#[0-9a-f]{6}/gi) || ['#dddddd', '#999999', '#666666', '#333333']; };
  function drawGem(cv, s) {
    // integrator: a CPU-backed canvas (willReadFrequently). On the GPU, the first gradient and conic fills of a fresh
    // session compile Skia shaders: a 145 ms flush inside the page change. Painted on the CPU, the twelve small
    // bitmaps cost a few ms and reach the compositor as plain textures.
    var S = cv.width, c = cv.getContext('2d', { willReadFrequently: true }), r = S / 2, x0 = r, y0 = r, i, a;
    if (!c) return;
    c.clearRect(0, 0, S, S);
    c.save(); c.beginPath(); c.arc(x0, y0, r - 1, 0, Math.PI * 2); c.clip();
    var h = hexes(s.swatch);
    if (s.id === 'opal' && c.createConicGradient) {
      var cg = c.createConicGradient(.7, x0, y0);
      h.forEach(function (col, k) { cg.addColorStop(k / h.length, col); }); cg.addColorStop(1, h[0]);
      c.fillStyle = cg; c.fillRect(0, 0, S, S);
      var wash = c.createRadialGradient(x0, y0, 0, x0, y0, r); wash.addColorStop(0, 'rgba(255,255,255,.55)'); wash.addColorStop(1, 'rgba(255,255,255,.05)');
      c.fillStyle = wash; c.fillRect(0, 0, S, S);
    } else {
      var g = c.createRadialGradient(S * .34, S * .28, 0, S * .34, S * .28, S * .95);
      var pos = [0, .34, .7, 1];
      h.slice(0, 4).forEach(function (col, k) { g.addColorStop(pos[k] != null ? pos[k] : 1, col); });
      c.fillStyle = g; c.fillRect(0, 0, S, S);
    }
    if (s.id !== 'pearl' && s.id !== 'opal') {
      // eight kites, alternately catching and losing the light
      for (i = 0; i < 16; i++) {
        a = i / 16 * Math.PI * 2 + Math.PI / 16;
        c.beginPath(); c.moveTo(x0, y0); c.arc(x0, y0, r, a, a + Math.PI / 8); c.closePath();
        c.fillStyle = i % 2 ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.11)'; c.fill();
      }
      // star lines between the table and the girdle
      c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = S / 256;
      for (i = 0; i < 8; i++) {
        a = i / 8 * Math.PI * 2 + Math.PI / 8;
        c.beginPath(); c.moveTo(x0 + Math.cos(a) * r * .3, y0 + Math.sin(a) * r * .3); c.lineTo(x0 + Math.cos(a) * r * .98, y0 + Math.sin(a) * r * .98); c.stroke();
      }
      // the octagonal table
      c.beginPath();
      for (i = 0; i < 8; i++) { a = i / 8 * Math.PI * 2 + Math.PI / 8; var px = x0 + Math.cos(a) * r * .46, py = y0 + Math.sin(a) * r * .46; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
      c.closePath();
      var tg = c.createLinearGradient(x0 - r * .4, y0 - r * .5, x0 + r * .4, y0 + r * .5);
      tg.addColorStop(0, 'rgba(255,255,255,.34)'); tg.addColorStop(.55, 'rgba(255,255,255,.06)'); tg.addColorStop(1, 'rgba(255,255,255,.16)');
      c.fillStyle = tg; c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke();
    }
    // the rim darkens; a highlight rests on the crown
    var rim = c.createRadialGradient(x0, y0, r * .58, x0, y0, r); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, s.id === 'pearl' ? 'rgba(80,50,40,.18)' : 'rgba(0,0,0,.26)');
    c.fillStyle = rim; c.fillRect(0, 0, S, S);
    var hl = c.createRadialGradient(S * .33, S * .27, 0, S * .33, S * .27, S * .34);
    hl.addColorStop(0, 'rgba(255,255,255,.75)'); hl.addColorStop(.5, 'rgba(255,255,255,.12)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = hl; c.fillRect(0, 0, S, S);
    if (s.id === 'pearl') { var pk = c.createRadialGradient(S * .7, S * .78, 0, S * .7, S * .78, S * .4); pk.addColorStop(0, 'rgba(255,214,230,.35)'); pk.addColorStop(1, 'rgba(255,214,230,0)'); c.fillStyle = pk; c.fillRect(0, 0, S, S); }
    c.restore();
    c.beginPath(); c.arc(x0, y0, r - 1.2, 0, Math.PI * 2); c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = S / 200; c.stroke();
  }

  /* the fallback stage: twelve stones on an ellipse, the chosen one at the front; turned by a damped spring */
  function FlatRing(box, month, onPick) {
    var list = stones(), N = list.length;
    box.innerHTML = '<svg class="bst__orbit" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="46.25" rx="40" ry="21.25"/></svg>' +
      '<span class="bst__pool" aria-hidden="true"></span>' +
      list.map(function (s, i) {
        return '<button class="bst__gem" type="button" tabindex="-1" data-i="' + i + '" aria-label="' + AU.esc(s.name) + '">' +
          '<canvas class="bst__gc" width="256" height="256" aria-hidden="true"></canvas><span class="bst__glint"></span></button>';
      }).join('');
    var gems = AU.$$('.bst__gem', box), ell = AU.$('ellipse', box), pool = AU.$('.bst__pool', box);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    gems.forEach(function (g, i) {
      var cv = AU.$('canvas', g), px = Math.round(Math.min(320, Math.max(224, (box.clientWidth || 700) * .19 * dpr)));
      cv.width = cv.height = px;
      try { drawGem(cv, list[i]); } catch (e) {}
    });
    var rot = -month, target = -month, vel = 0, off = null, lastW = 0;
    var place = function () {
      var w = box.clientWidth || 400, h = box.clientHeight || 300;
      var R = w * .4, ry = w * .17;
      if (w !== lastW) {    // the drawn orbit passes through the centres of the stones
        lastW = w;
        ell.setAttribute('cx', '50'); ell.setAttribute('rx', '40');
        ell.setAttribute('cy', (50 - w * .03 / h * 100).toFixed(2)); ell.setAttribute('ry', (ry / h * 100).toFixed(2));
        // the soft pool of light just under the stone at the front
        pool.style.top = (50 + (ry - w * .03 + w * .085) / h * 100).toFixed(2) + '%';
      }
      gems.forEach(function (g, i) {
        var a = (i + rot) / N * Math.PI * 2;           // 0 = front
        var x = Math.sin(a) * R, z = Math.cos(a), y = z * ry;
        var front = (z + 1) / 2;
        var s = .38 + .62 * Math.pow(front, 1.8);
        g.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + (y - w * .03).toFixed(1) + 'px,0) scale(' + s.toFixed(3) + ')';
        g.style.opacity = (.28 + .72 * Math.pow(front, 1.4)).toFixed(3);
        g.style.zIndex = String(Math.round(front * 100));
        g.classList.toggle('is-front', front > .985);
      });
    };
    var step = function (t, dt) {
      // a critically damped spring: a long, soft landing with no overshoot
      var k = 18, c = 2 * Math.sqrt(k);
      var acc = k * (target - rot) - c * vel;
      vel += acc * dt; rot += vel * dt;
      if (Math.abs(target - rot) < .0005 && Math.abs(vel) < .0005) { rot = target; vel = 0; place(); off(); off = null; return; }
      place();
    };
    box.addEventListener('click', function (e) { var g = e.target.closest('.bst__gem'); if (g) onPick(+g.getAttribute('data-i')); });
    var ro = new ResizeObserver(place); ro.observe(box);
    place();
    return {
      setMonth: function (m) {
        // the shortest way round
        var cur = ((-target % N) + N) % N, d = m - cur;
        if (d > N / 2) d -= N; if (d < -N / 2) d += N;
        target -= d;
        if (AU.reduced) { rot = target; vel = 0; place(); return; }
        if (!off) off = AU.tick(step);
      },
      dispose: function () { if (off) off(); ro.disconnect(); box.innerHTML = ''; }
    };
  }

  /* While the 3D dial is being prepared, the stage holds still: the dial's own ellipse as a hairline (drawn once), and the
     month's name at its centre. It has the 3D frame's proportions, so nothing moves when the dial crossfades in over
     it (.8s). The drawn stones (FlatRing) are only made when there is no 3D at all. */
  function holdHTML(i) {
    return '<div class="bst__hold" aria-hidden="true">' +
      '<svg class="bst__hring" viewBox="0 0 100 62" preserveAspectRatio="none"><ellipse cx="50" cy="37.5" rx="42.5" ry="14.5" pathLength="1"/></svg>' +
      '<span class="bst__hmonth caps caps--sm" data-bst-hmonth>' + AU.esc(K.monthName(i)) + '</span>' +
    '</div>';
  }

  function init(root, m0, signal) {
    var group = AU.$('[data-bst-months]', root), btns = AU.$$('.bst__m', group), bar = AU.$('[data-bst-bar]', root);
    var info = AU.$('[data-bst-info]', root), stage = AU.$('[data-bst-stage]', root);
    var cur = m0, flat = null, gl = null, swapT = 0, dead = false, hold = null;
    var label = function (i) { return T('stage', { stone: (stones()[i] || {}).name || '' }); };

    function paintBar() {
      var b = btns[cur]; if (!b) return;
      bar.style.transform = 'translate3d(' + b.offsetLeft + 'px,' + (b.offsetTop + b.offsetHeight - 1) + 'px,0) scaleX(' + (b.offsetWidth / 100).toFixed(4) + ')';
    }
    function select(i, fromUser) {
      if (i === cur && fromUser !== 'init') return;
      var prev = cur; cur = i;
      btns.forEach(function (b, k) { b.setAttribute('aria-checked', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
      paintBar();
      stage.setAttribute('aria-label', label(i));
      if (hold) { var hm = AU.$('[data-bst-hmonth]', hold); if (hm) hm.textContent = K.monthName(i); }
      if (flat) flat.setMonth(i);
      if (gl && gl.setMonth) { try { gl.setMonth(i); } catch (e) {} }
      clearTimeout(swapT);
      if (fromUser === 'init' || AU.reduced) { info.innerHTML = infoHTML(i); info.classList.remove('is-out'); }
      else {
        info.classList.add('is-out');
        swapT = setTimeout(function () { info.innerHTML = infoHTML(i); info.classList.remove('is-out'); info.classList.remove('is-in'); void info.offsetWidth; info.classList.add('is-in'); }, 320);
      }
      if (fromUser && fromUser !== 'init') K.setQuery({ month: i + 1 });
      if (AU.sound && fromUser === true && prev !== i) { try { AU.sound.play('tick'); } catch (e) {} }
    }
    group.addEventListener('click', function (e) { var b = e.target.closest('.bst__m'); if (b) select(+b.getAttribute('data-i'), true); });
    group.addEventListener('keydown', function (e) {
      var n = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (e.key === 'Home') n = -cur; else if (e.key === 'End') n = btns.length - 1 - cur;
      if (n == null) return;
      e.preventDefault();
      var i = (cur + n + btns.length) % btns.length;
      select(i, true); btns[i].focus();
    });

    stage.insertAdjacentHTML('beforeend', holdHTML(cur));
    hold = AU.$('.bst__hold', stage);
    /* no 3D: the drawn stones, faded in over the holding state */
    function mountFlat() {
      if (dead || flat) return;
      var box = document.createElement('div'); box.className = 'bst__flat'; stage.appendChild(box);
      flat = FlatRing(box, cur, function (i) { select(i, true); });
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (!dead) stage.classList.add('is-flat'); }); });
    }
    AU.gl.then(function (api) {
      if (dead) return;
      if (!api || typeof api.birthstones !== 'function') { mountFlat(); return; }
      K.later(function () { mountGL(api); }, signal);
    }, mountFlat);
    function mountGL(api) {
      if (dead) return;
      var box = null;
      try {
        box = document.createElement('div'); box.className = 'bst__gl'; stage.appendChild(box);
        gl = api.birthstones(box, { month: cur, label: label(cur), onSelect: function (i) { if (!dead) select(i, true); } });
        Promise.resolve(gl && gl.ready).then(function () {
          if (dead) return;
          // the dial has presented its first frame: it crossfades in over the holding state
          requestAnimationFrame(function () { if (!dead) stage.classList.add('is-gl'); });
        }, function () {
          if (dead) return;
          try { if (gl && gl.dispose) gl.dispose(); } catch (e) {}
          gl = null; if (box) box.remove();
          mountFlat();
        });
      } catch (e) { console.error('[story] birthstones', e); gl = null; if (box) box.remove(); mountFlat(); }
    }
    /* where the stage starts on the page (not where it sticks): the CSS caps the stage's width so the dial ends 24px
       above the first fold (60-story.css .bst__stagebox). One read, one write, and only when it moved. */
    var main = AU.$('.bst__main', root), lastTop = -1;
    function fitStage() {
      if (!main) return;
      // offsets, not the client rect: the page may still be scrolled, veiled or transformed by the page transition
      var top = 0, n = main;
      while (n) { top += n.offsetTop; n = n.offsetParent; }
      top = Math.round(top);
      if (Math.abs(top - lastTop) < 2) return;
      lastTop = top; root.style.setProperty('--bst-top', top + 'px');
    }
    var ro = new ResizeObserver(function () { paintBar(); fitStage(); }); ro.observe(group);
    if (main) { var headEl = AU.$('.bst__head', root); if (headEl) ro.observe(headEl); }
    fitStage();
    select(cur, 'init');
    signal.addEventListener('abort', function () {
      dead = true; clearTimeout(swapT); ro.disconnect();
      if (flat) flat.dispose();
      if (gl && gl.dispose) { try { gl.dispose(); } catch (e) {} }
    });
  }

  AU.ready(function () {
    if (!AU.router) return;
    K.route('/birthstones', {
      name: 'birthstones',
      title: function () { return T('metaTitle'); },
      description: function () { return T('metaDesc'); },
      jsonld: function () {
        var site = ((AU.content.config && AU.content.config.siteUrl) || '').replace(/\/$/, '');
        return { '@context': 'https://schema.org', '@type': 'WebPage', name: T('metaTitle'), description: T('metaDesc'), url: site + '/birthstones',
          mainEntity: { '@type': 'ItemList', itemListElement: stones().map(function (s, i) {
            return { '@type': 'ListItem', position: i + 1, name: K.monthName(i) + ': ' + s.name, description: s.meaning };
          }) } };
      },
      render: function (el, params, ctx) {
        var q = +(ctx.query && ctx.query.month);
        var m = q >= 1 && q <= 12 ? q - 1 : new Date().getMonth();
        el.innerHTML = pageHTML(m);
        K.prepHead(el);
        AU.reveal(el);
        init(el, m, ctx.signal);
      }
    });
  });
})();
