/* ---- 66-story-gifts.js ---- */
/* Story: the gift finder ('/gifts', idea 9). Three calm questions (who, style, budget in the visitor's currency), then
   the three pieces we would choose, scored from AU.content.productTags and the budget, each with a one-line reason,
   picture, price, link and save. The answers live in the URL (?for=&style=&budget=) so suggestions can be shared. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.storyKit) return;
  var K = AU.storyKit;
  var T = function (p, v) { return K.t('gifts.' + p, v); };
  var STEPS = ['who', 'style', 'budget'];
  var KEYS = { who: 'for', style: 'style', budget: 'budget' };
  var OPTIONS = {
    who: ['partner', 'mother', 'friend', 'self', 'bride'],
    style: ['classic', 'modern', 'bold', 'delicate'],
    budget: ['under', 'mid', 'over']
  };
  var RANGE = { under: [0, 2000], mid: [2000, 4000], over: [4000, 1e9] };
  var LO = 2000, HI = 4000;

  /* the budget bounds read as round sums in the visitor's currency ("£1,600 to £3,200", not "£1,580 to £3,160");
     the suggestions are still chosen on the exact USD bounds */
  var nice = function (usd) {
    var v = AU.convert ? AU.convert(usd) : usd;
    var step = v >= 5000 ? 500 : 100;
    return Math.max(step, Math.round(v / step) * step);
  };
  var money = function (usd) {
    var v = nice(usd);
    try {
      return new Intl.NumberFormat(AU.lang === 'fr' ? 'fr-FR' : AU.lang === 'de' ? 'de-DE' : 'en-US',
        { style: 'currency', currency: AU.currency || 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 })
        .format(v).replace(/ /g, ' ');   // the narrow no-break space (fr) is missing from the faces
    } catch (e) { return K.money0(usd); }
  };
  var budgetLabel = function (id, short) {
    return T((short ? 'budgetShort.' : 'questions.budget.options.') + id, { a: money(LO), b: money(HI) });
  };

  /* ---------- scoring ---------- */
  function suggest(a) {
    var tags = AU.content.productTags || {}, prods = AU.content.products || [];
    var r = RANGE[a.budget] || [0, 1e9], mid = r[1] > 1e8 ? r[0] * 1.5 : (r[0] + r[1]) / 2;
    var scored = prods.map(function (p) {
      var t = tags[p.id] || { for: [], style: [], occasion: [] };
      var s = 0, fits = 0;
      if ((t.for || []).indexOf(a.who) >= 0) { s += 4; fits++; }
      if ((t.style || []).indexOf(a.style) >= 0) { s += 3; fits++; }
      if (p.price >= r[0] && p.price < r[1]) { s += 4; fits++; }
      else s -= Math.min(3, Math.abs(p.price < r[0] ? r[0] - p.price : p.price - r[1]) / 900);
      var occ = t.occasion || [];
      if (a.who === 'bride' && (occ.indexOf('wedding') >= 0 || occ.indexOf('engagement') >= 0)) s += 1.5;
      if (a.who === 'self' && occ.indexOf('everyday') >= 0) s += .5;
      if (a.who === 'partner' && occ.indexOf('anniversary') >= 0) s += .5;
      if ((a.who === 'mother' || a.who === 'friend') && occ.indexOf('birthday') >= 0) s += .5;
      s -= Math.abs(p.price - mid) / 40000;      // a whisper of preference for the middle of the budget
      return { p: p, t: t, s: s, fits: fits };
    });
    var out = [];
    while (out.length < 3 && scored.length) {
      scored.forEach(function (x) {
        x.adj = x.s - out.reduce(function (pen, o) {
          return pen + (o.p.spec.type === x.p.spec.type ? 2 : 0) + (o.p.collection === x.p.collection ? .8 : 0);
        }, 0);
      });
      scored.sort(function (x, y) { return y.adj - x.adj; });
      out.push(scored.shift());
    }
    return out;
  }
  /* one line per piece, phrased three different ways so the three suggestions never read alike */
  function reason(x, a, i) {
    var st = (x.t.style || []).indexOf(a.style) >= 0 ? a.style : (x.t.style || [])[0] || a.style;
    var occ = (x.t.occasion || [])[0] || 'everyday';
    var cap = function (s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); };
    if (i === 1) return T('why.type.' + x.p.spec.type) + ', ' + T('why.occasion.' + occ) + '.';
    if (i === 2) return cap(T('why.style.' + st)) + ', ' + T('why.occasion.' + ((x.t.occasion || [])[1] || occ)) + '.';
    return T('why.for.' + a.who) + ', ' + T('why.style.' + st) + '.';
  }

  /* ---------- the choices' drawings ----------
     Small plates from the atelier's sketchbook, the same hand as the home page's doors (11-home.js): hairlines at
     1.25px whatever their size (non-scaling stroke), the soft construction lines (.pl-s) at half strength, no fill.
     64 x 64; drawn in by a sweeping pen when their question arrives. */
  var STAR = function (x, y, r) {   // the four-point glint, as on the doors
    var k = r * .18;
    return '<path d="M' + x + ' ' + (y - r) + 'C' + (x + k) + ' ' + (y - k) + ' ' + (x + k) + ' ' + (y - k) + ' ' + (x + r) + ' ' + y +
      'C' + (x + k) + ' ' + (y + k) + ' ' + (x + k) + ' ' + (y + k) + ' ' + x + ' ' + (y + r) +
      'C' + (x - k) + ' ' + (y + k) + ' ' + (x - k) + ' ' + (y + k) + ' ' + (x - r) + ' ' + y +
      'C' + (x - k) + ' ' + (y - k) + ' ' + (x - k) + ' ' + (y - k) + ' ' + x + ' ' + (y - r) + 'Z"/>';
  };
  var ART = {
    /* a partner: two bands, linked */
    partner: function () {
      /* each ring breaks where it passes behind the other (top crossing: the left one; bottom: the right one) */
      return '<path d="M34 26.3A14 14 0 1 1 29.8 23.8"/><path d="M34.2 50.2A14 14 0 1 0 30 47.7"/>' +
        '<path class="pl-s" d="M14.6 41.2A11 11 0 0 1 21 26.8M49.4 32.8A11 11 0 0 1 43 47.2"/>' + STAR(52, 12, 5);
    },
    /* a mother: an oval locket on a fine chain */
    mother: function () {
      return '<path class="pl-s" stroke-dasharray="1.2 3" d="M12 5C16 18 24 25.5 32 27.5C40 25.5 48 18 52 5"/>' +
        '<circle cx="32" cy="30" r="2.4"/>' +
        '<ellipse cx="32" cy="45" rx="10" ry="12.5"/><ellipse class="pl-s" cx="32" cy="45" rx="7.2" ry="9.6"/>' +
        '<path class="pl-s" d="M32 40.5C33.4 38.4 36.6 39.2 36 41.8C35.6 43.6 33.2 45.4 32 46.6C30.8 45.4 28.4 43.6 28 41.8C27.4 39.2 30.6 38.4 32 40.5Z"/>';
    },
    /* a friend: a pair of drops, one each */
    friend: function () {
      var drop = function (x, y) {
        return '<circle cx="' + x + '" cy="' + y + '" r="3"/><path class="pl-s" d="M' + x + ' ' + (y + 3) + 'V' + (y + 9) + '"/>' +
          '<path d="M' + x + ' ' + (y + 9) + 'C' + (x + 4) + ' ' + (y + 15) + ' ' + (x + 7) + ' ' + (y + 19) + ' ' + (x + 7) + ' ' + (y + 24) +
            'A7 7 0 0 1 ' + (x - 7) + ' ' + (y + 24) + 'C' + (x - 7) + ' ' + (y + 19) + ' ' + (x - 4) + ' ' + (y + 15) + ' ' + x + ' ' + (y + 9) + 'Z"/>' +
          '<path class="pl-s" d="M' + (x - 7) + ' ' + (y + 24) + 'H' + (x + 7) + 'M' + x + ' ' + (y + 9) + 'L' + (x - 3) + ' ' + (y + 24) + 'L' + x + ' ' + (y + 31) + 'L' + (x + 3) + ' ' + (y + 24) + 'Z"/>';
      };
      return drop(22, 10) + drop(42, 16);
    },
    /* yourself: the hand mirror on the dressing table */
    self: function () {
      return '<ellipse cx="32" cy="24" rx="14" ry="17"/><ellipse class="pl-s" cx="32" cy="24" rx="11" ry="14"/>' +
        '<path class="pl-s" d="M25 19L31 13M25.5 25.5L36 15"/>' +
        '<path d="M29 41L28.2 56.5C28.1 58.6 29.8 60 32 60C34.2 60 35.9 58.6 35.8 56.5L35 41"/>' + STAR(52, 46, 4);
    },
    /* a bride: a tiara, pearls at its points */
    bride: function () {
      return '<path d="M9 47Q32 37 55 47"/><path class="pl-s" d="M11 51.5Q32 42.5 53 51.5"/>' +
        '<path d="M13 45.2L18 33L24 40.6L32 21L40 40.6L46 33L51 45.2"/>' +
        '<path class="pl-s" d="M24 40.6Q28 33 32 40Q36 33 40 40.6M32 40V44.6"/>' +
        '<circle cx="18" cy="30.6" r="2.1"/><circle cx="32" cy="18.4" r="2.4"/><circle cx="46" cy="30.6" r="2.1"/>';
    },
    /* classic: the solitaire, in profile */
    classic: function () {
      return '<circle cx="32" cy="41" r="16"/><circle class="pl-s" cx="32" cy="41" r="12.8"/>' +
        '<path d="M24 23L27.5 18.5H36.5L40 23Z"/><path d="M24 23L32 32L40 23"/>' +
        '<path class="pl-s" d="M27.5 18.5L30 23L32 18.5L34 23L36.5 18.5M28.5 23L32 32L35.5 23"/>' + STAR(51, 12, 4.5);
    },
    /* modern: an open band that ends in two spheres */
    modern: function () {
      return '<path d="M20.5 47.5A17 17 0 1 1 43.5 47.5"/><path class="pl-s" d="M23.2 44.6A13 13 0 1 1 40.8 44.6"/>' +
        '<circle cx="18.6" cy="50.4" r="4"/><circle cx="45.4" cy="50.4" r="4"/>';
    },
    /* bold: a large step-cut stone, from above */
    bold: function () {
      return '<path d="M22 12H42L50 20V44L42 52H22L14 44V20Z"/>' +
        '<path class="pl-s" d="M24.5 17H39.5L45 22.5V41.5L39.5 47H24.5L19 41.5V22.5Z"/>' +
        '<path d="M27 22H37L40 25V39L37 42H27L24 39V25Z"/>' +
        '<path class="pl-s" d="M22 12L27 22M42 12L37 22M50 20L40 25M50 44L40 39M42 52L37 42M22 52L27 42M14 44L24 39M14 20L24 25"/>';
    },
    /* delicate: the finest chain, a single small drop */
    delicate: function () {
      return '<path class="pl-s" stroke-dasharray="1 2.6" d="M8 12C18 30 26 33.5 32 33.5C38 33.5 46 30 56 12"/>' +
        '<circle cx="32" cy="35.6" r="1.6"/><path d="M32 38.4L34.8 42.6L32 48L29.2 42.6Z"/><path class="pl-s" d="M29.2 42.6H34.8"/>' + STAR(46, 50, 3.4);
    }
  };
  var artSVG = function (name) {
    return ART[name] ? '<svg class="gft__pic" viewBox="0 0 64 64" focusable="false" aria-hidden="true"><g class="gft__ink">' + ART[name]() + '</g></svg>' : '';
  };

  /* ---------- markup ---------- */
  /* a question: its number in small capitals, the question itself as a heading in Cormorant capitals (the page title is
     the only script line in view), then typographic choices: a label in capitals, an italic hint where there is one */
  function stepHTML(key, i, answers) {
    var opts = OPTIONS[key];
    return '<fieldset class="gft__step" data-step="' + key + '" aria-hidden="true">' +
      '<legend class="gft__q"><span class="gft__qn caps caps--sm">' + AU.nums(T('step', { n: i + 1, total: STEPS.length })) + '</span>' +
        '<h2 class="gft__qt caps caps--lg" tabindex="-1">' + AU.nums(T('questions.' + key + '.q')) + '</h2></legend>' +
      '<div class="gft__opts gft__opts--' + key + '">' + opts.map(function (o) {
        var on = answers[key] === o;
        return '<button class="gft__opt" type="button" data-key="' + key + '" data-val="' + o + '" aria-pressed="' + (on ? 'true' : 'false') + '" style="--oi:' + opts.indexOf(o) + '">' +
          '<span class="gft__sheen" aria-hidden="true"></span>' + artSVG(o) +
          (key === 'budget' ? '<span class="gft__amt num" data-budget="' + o + '">' + AU.esc(budgetLabel(o)) + '</span>'
            : '<span class="gft__ol caps caps--md">' + AU.nums(T('questions.' + key + '.options.' + o)) + '</span>' +
              (key === 'style' ? '<span class="gft__oh">' + AU.nums(T('questions.style.hints.' + o)) + '</span>' : '')) +
          '<span class="gft__check" aria-hidden="true">' + AU.icon('check', { size: 16 }) + '</span>' +
        '</button>';
      }).join('') + '</div>' +
    '</fieldset>';
  }

  function resultsHTML(a) {
    var list = suggest(a);
    var cols = AU.content.collections || [];
    var allFit = list.length && list[0].fits === 3;
    var material = function (spec) { try { return AU.shop && AU.shop.material ? AU.shop.material(spec) : ''; } catch (e) { return ''; } };
    return '<div class="gft__res-head">' +
        '<h2 class="gft__res-title caps caps--lg" tabindex="-1">' + AU.nums(T('resultsTitle')) + '</h2>' +
        '<p class="gft__sum">' + AU.nums(T('resultsFor', { who: T('whoShort.' + a.who), style: T('questions.style.options.' + a.style).toLowerCase(), budget: budgetLabel(a.budget, true) })) + '</p>' +
        (allFit ? '' : '<p class="small gft__none">' + AU.nums(T('none')) + '</p>') +
      '</div>' +
      /* the boutique's card, type for type: the collection in small capitals inside the well, the heart at its top
         right, then the name in capitals, the material, the price; the one addition is the italic line on why */
      '<ol class="gft__cards">' + list.map(function (x, i) {
        var p = x.p, col = cols.find(function (c) { return c.id === p.collection; }), mat = material(p.spec);
        return '<li class="gft__card" style="--i:' + i + '"><article class="gft__art">' +
          '<div class="gft__well">' +
            '<span class="gft__img" data-vt="piece-' + AU.esc(p.id) + '">' + K.img(p.spec, { size: 640, alt: '' }) + '</span>' +
            (col ? '<span class="gft__coll caps" aria-hidden="true">' + AU.nums(col.name) + '</span>' : '') +
          '</div>' +
          '<div class="gft__info">' +
            '<h3 class="gft__name caps"><a class="gft__link" href="#/piece/' + AU.esc(p.id) + '">' + AU.nums(p.name) + '</a></h3>' +
            (mat ? '<p class="gft__mat">' + AU.esc(mat) + '</p>' : '') +
            '<p class="gft__price">' + AU.price(p.price) + '</p>' +
            '<p class="gft__why">' + AU.nums(reason(x, a, i)) + '</p>' +
          '</div>' +
          K.saveBtn(p.id, p.name) +
        '</article></li>';
      }).join('') + '</ol>' +
      '<div class="gft__res-foot">' +
        '<button class="btn" type="button" data-gft-again>' + AU.icon('rotate', { size: 16 }) + AU.esc(T('again')) + '</button>' +
        '<button class="link caps caps--sm gft__share" type="button" data-gft-share>' + AU.esc(T('share')) + '</button>' +
      '</div>';
  }

  function pageHTML(answers) {
    return '<div class="sp gft">' +
      K.head({ eyebrow: T('eyebrow'), titleHTML: AU.nums(T('title')), lede: T('lede'), cls: 'gft__head', compact: true }) +
      '<section class="gft__panel wrap" data-gft aria-label="' + AU.esc(T('eyebrow')) + '">' +
        '<div class="gft__bar" aria-hidden="true">' + STEPS.map(function () { return '<span class="gft__seg"><i></i></span>'; }).join('') + '</div>' +
        '<div class="gft__stack" data-gft-stack>' +
          STEPS.map(function (k, i) { return stepHTML(k, i, answers); }).join('') +
          '<section class="gft__step gft__results" data-step="results" aria-hidden="true" aria-live="polite"></section>' +
        '</div>' +
        '<div class="gft__nav"><button class="link caps caps--sm gft__back" type="button" data-gft-back>' + AU.icon('arrowLeft', { size: 14 }) + '<span>' + AU.esc(T('back')) + '</span></button></div>' +
      '</section>' +
      K.doors([
        { kicker: K.t('birthstones.eyebrow'), title: K.t('birthstones.title'), href: '#/birthstones' },
        { kicker: K.t('visit.metaTitle'), title: K.t('atelier.end.title'), href: '#/visit?reason=gift' }
      ]) +
    '</div>';
  }

  function init(root, answers, signal) {
    var panel = AU.$('[data-gft]', root), steps = AU.$$('.gft__step', panel), res = AU.$('.gft__results', panel);
    var segs = AU.$$('.gft__seg i', panel), back = AU.$('[data-gft-back]', panel);
    var cur = -1, timer = 0, offHydrate = null;
    var first = function () { for (var i = 0; i < STEPS.length; i++) if (!answers[STEPS[i]]) return i; return 3; };
    var share = function () {
      var q = {}; STEPS.forEach(function (k) { if (answers[k]) q[KEYS[k]] = answers[k]; }); return q;
    };

    function show(n, opts) {
      opts = opts || {};
      var dir = n >= cur ? 1 : -1;
      if (n === 3) {
        res.innerHTML = resultsHTML(answers);
        AU.reprice(res);
        if (offHydrate) offHydrate();
        offHydrate = K.hydrate(res, signal);
      }
      steps.forEach(function (s, i) {
        var on = i === n;
        s.classList.toggle('is-on', on);
        s.classList.toggle('is-before', i < n);
        s.classList.toggle('is-after', i > n);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
        if ('inert' in s) s.inert = !on;
      });
      panel.setAttribute('data-dir', dir > 0 ? 'fwd' : 'back');
      panel.classList.toggle('is-results', n === 3);
      segs.forEach(function (sg, i) { sg.style.transform = 'scaleX(' + (i < n ? 1 : 0) + ')'; });
      back.classList.toggle('is-hidden', n === 0 || n === 3);
      cur = n;
      if (opts.focus) {
        var h = n === 3 ? AU.$('.gft__res-title', res) : AU.$('.gft__qt', steps[n]);
        setTimeout(function () { if (h) h.focus({ preventScroll: true }); }, AU.reduced ? 0 : 450);
      }
      if (opts.scroll) {
        var top = K.top(panel) - K.headH() - 24;
        if (Math.abs(window.scrollY - top) > 40 && window.scrollY > top) K.scrollTo(top);
      }
    }
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('.gft__opt');
      if (b) {
        var key = b.getAttribute('data-key'), val = b.getAttribute('data-val');
        answers[key] = val;
        AU.$$('.gft__opt[data-key="' + key + '"]', panel).forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        if (AU.sound) { try { AU.sound.play('tick'); } catch (er) {} }
        K.setQuery(share());
        clearTimeout(timer);
        timer = setTimeout(function () {
          var n = STEPS.indexOf(key) + 1;
          show(n, { focus: true, scroll: n === 3 });
          if (n === 3 && AU.sparkleAt) { var t = AU.$('.gft__res-title', res); if (t) setTimeout(function () { AU.sparkleAt(t, { count: 10, spread: 90 }); }, 700); }
        }, AU.reduced ? 0 : 480);
        return;
      }
      if (e.target.closest('[data-gft-back]')) { clearTimeout(timer); if (cur > 0) show(cur - 1, { focus: true }); return; }
      if (e.target.closest('[data-gft-again]')) {
        clearTimeout(timer);
        STEPS.forEach(function (k) { answers[k] = null; });
        AU.$$('.gft__opt', panel).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        K.setQuery({});
        show(0, { focus: true, scroll: true });
        return;
      }
      if (e.target.closest('[data-gft-share]')) K.copy(K.absUrl('/gifts?' + Object.keys(share()).map(function (k) { return k + '=' + encodeURIComponent(share()[k]); }).join('&')));
    });
    // budgets are shown in the visitor's currency
    var offCur = AU.on('currency', function () {
      AU.$$('[data-budget]', panel).forEach(function (el) { el.textContent = budgetLabel(el.getAttribute('data-budget')); });
      var sum = AU.$('.gft__sum', res);
      if (sum && cur === 3) sum.innerHTML = AU.nums(T('resultsFor', { who: T('whoShort.' + answers.who), style: T('questions.style.options.' + answers.style).toLowerCase(), budget: budgetLabel(answers.budget, true) }));
    });
    panel.classList.add('is-instant');
    show(first());
    requestAnimationFrame(function () { requestAnimationFrame(function () { panel.classList.remove('is-instant'); }); });
    signal.addEventListener('abort', function () { clearTimeout(timer); offCur(); if (offHydrate) offHydrate(); });
  }

  AU.ready(function () {
    if (!AU.router) return;
    K.route('/gifts', {
      name: 'gifts',
      title: function () { return T('metaTitle'); },
      description: function () { return T('metaDesc'); },
      jsonld: function () {
        var site = ((AU.content.config && AU.content.config.siteUrl) || '').replace(/\/$/, '');
        return { '@context': 'https://schema.org', '@type': 'WebPage', name: T('metaTitle'), description: T('metaDesc'), url: site + '/gifts' };
      },
      render: function (el, params, ctx) {
        var q = ctx.query || {}, answers = {};
        STEPS.forEach(function (k) { var v = q[KEYS[k]]; answers[k] = OPTIONS[k].indexOf(v) >= 0 ? v : null; });
        el.innerHTML = pageHTML(answers);
        K.prepHead(el);
        AU.reveal(el);
        init(el, answers, ctx.signal);
      }
    });
  });
})();
