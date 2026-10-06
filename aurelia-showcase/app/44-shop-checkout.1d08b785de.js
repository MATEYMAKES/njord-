/* ---- 44-shop-checkout.js ---- */
/* Aurelia shop pages, part 4: /checkout — Review → Details → Delivery → Payment hand-off.
   A progress hairline follows the steps; the bag summary stays beside them (above them on a phone). Fields are
   checked calmly (on continue, then as you correct them). Payment always happens on the provider's own page, through
   the adapter in AU.content.config.checkout:
     'preview' (default)  the summary and an honest note that payments are not connected yet; nothing is sent
     'stripe'             a single piece with a Payment Link in config.stripeLinks[id] → redirect to it
     'shopify'            Storefront API cartCreate (config.shopify.domain + token, variants[id] = merchandise id)
                          → redirect to the cart's checkoutUrl
   There is never a card form here. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.shop) return;
  var S = AU.shop, T = S.t, esc = AU.esc;
  var KEY = 'aurelia:checkout';
  var load = function () { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  var keep = function (d) { try { sessionStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var defaultCountry = function () {
    if (AU.currency === 'GBP') return 'GB';
    if (AU.currency === 'EUR') return AU.lang === 'de' ? 'DE' : 'FR';
    if (AU.lang === 'fr') return 'FR';
    if (AU.lang === 'de') return 'DE';
    return 'US';
  };

  /* the step the visitor is on, kept for a re-render in place (a language change must not send them back to Review) */
  var loadStep = function () { try { return +sessionStorage.getItem(KEY + ':step') || 0; } catch (e) { return 0; } };
  var keepStep = function (n) { try { sessionStorage.setItem(KEY + ':step', String(n)); } catch (e) {} };
  var sumOpen = false;   // the phone's order-summary disclosure, kept across the same re-render

  var render = function (el, params, ctx) {
    var d = Object.assign({ name: '', email: '', phone: '', address: '', address2: '', city: '', postcode: '', country: defaultCountry(), method: 'insured', note: '' }, load());
    var force = ctx.dir === 'force';
    var step = force ? AU.clamp(loadStep(), 0, 3) : 0, tried = {}, alive = true;
    if (!force) sumOpen = false;
    ctx.onLeave(function () { alive = false; });
    var methods = T('checkout.methods');
    if (!Array.isArray(methods)) methods = [];
    var countries = T('countries');
    if (!Array.isArray(countries)) countries = [];
    var steps = T('checkout.steps');
    if (!Array.isArray(steps)) steps = ['1', '2', '3', '4'];
    var method = function () { return methods.find(function (m) { return m.id === d.method; }) || methods[0] || { price: 0 }; };

    var field = function (k, type, label, opt, extra) {
      return '<div class="field co__field co__field--' + k + '" data-f="' + k + '">' +
        '<label class="caps caps--sm" for="co-' + k + '">' + esc(label) + (opt ? ' <span class="co__opt">' + esc(T('checkout.optional')) + '</span>' : '') + '</label>' +
        '<input id="co-' + k + '" name="' + k + '" type="' + type + '" value="' + esc(d[k]) + '" aria-describedby="co-' + k + '-err"' + (extra || '') + '>' +
        '<p class="field__err" id="co-' + k + '-err" aria-live="polite"></p>' +
      '</div>';
    };

    el.innerHTML =
      '<section class="shop-page co" aria-labelledby="co-title">' +
        '<div class="wrap">' +
          '<header class="co__head shop-head">' +
            '<p class="eyebrow caps" data-reveal="fade">' + esc(T('checkout.eyebrow')) + '</p>' +
            '<h1 id="co-title" class="script t-h2 co__title" data-reveal="words">' + esc(T('checkout.title')) + '</h1>' +
          '</header>' +
          '<div class="co__body" data-co-body></div>' +
        '</div>' +
      '</section>';
    var body = AU.$('[data-co-body]', el);

    var empty = function () {
      body.innerHTML = '<div class="co__empty">' +
        '<span class="bag__empty-mark" aria-hidden="true">' + AU.icon('bag', { size: 26 }) + '</span>' +
        '<p class="script t-h3">' + esc(T('checkout.emptyTitle')) + '</p>' +
        '<p class="body">' + esc(T('checkout.emptyText')) + '</p>' +
        '<a class="btn" href="#/boutique">' + esc(T('checkout.emptyLink')) + ' ' + AU.icon('arrow', { size: 16 }) + '</a></div>';
    };

    var build = function () {
      if (!AU.cart.count()) { empty(); return; }
      body.innerHTML =
        '<nav class="co__steps" aria-label="' + esc(T('checkout.progress')) + '">' +
          '<ol class="co__stepl">' + steps.map(function (s, i) {
            return '<li><button class="co__step caps caps--sm" type="button" data-go="' + i + '"><span class="num co__stepn">0' + (i + 1) + '</span><span class="co__stepl-t">' + esc(s) + '</span></button></li>';
          }).join('') + '</ol>' +
          '<span class="co__track" aria-hidden="true"><span class="co__fill" data-co-fill></span></span>' +
          /* phones: the numerals alone above the line, and the step named in words beneath it */
          '<p class="co__cap caps caps--sm" aria-hidden="true" data-co-cap></p>' +
          '<p class="sr-only" aria-live="polite" data-co-live></p>' +
        '</nav>' +
        '<div class="co__main">' +
          '<div class="co__panes" data-co-panes>' +
            /* 1 · review */
            '<section class="co__pane" data-pane="0" aria-labelledby="co-h0">' +
              '<div class="co__pane-head"><h2 id="co-h0" class="caps co__h" tabindex="-1">' + esc(T('checkout.reviewTitle')) + '</h2>' +
              '<button class="link caps caps--sm co__edit" type="button" data-open="bag">' + esc(T('checkout.editBag')) + '</button></div>' +
              '<ul class="co__lines co__lines--big" data-co-review></ul>' +
              '<div class="co__nav"><span></span><button class="btn btn--solid" type="button" data-next>' + esc(T('checkout.continue')) + ' ' + AU.icon('arrow', { size: 16 }) + '</button></div>' +
            '</section>' +
            /* 2 · details */
            '<section class="co__pane" data-pane="1" aria-labelledby="co-h1" hidden>' +
              '<div class="co__pane-head"><h2 id="co-h1" class="caps co__h" tabindex="-1">' + esc(T('checkout.detailsTitle')) + '</h2></div>' +
              '<p class="small co__intro">' + esc(T('checkout.detailsText')) + '</p>' +
              '<form class="co__form" novalidate data-form="1">' +
                field('name', 'text', T('checkout.name'), false, ' autocomplete="name" required') +
                '<div class="co__two">' +
                  field('email', 'email', T('checkout.email'), false, ' autocomplete="email" inputmode="email" required') +
                  field('phone', 'tel', T('checkout.phone'), true, ' autocomplete="tel" inputmode="tel"') +
                '</div>' +
                '<div class="co__nav"><button class="link caps caps--sm co__back" type="button" data-back>' + AU.icon('arrowLeft', { size: 16 }) + esc(T('checkout.back')) + '</button>' +
                '<button class="btn btn--solid" type="submit">' + esc(T('checkout.toDelivery')) + ' ' + AU.icon('arrow', { size: 16 }) + '</button></div>' +
              '</form>' +
            '</section>' +
            /* 3 · delivery */
            '<section class="co__pane" data-pane="2" aria-labelledby="co-h2" hidden>' +
              '<div class="co__pane-head"><h2 id="co-h2" class="caps co__h" tabindex="-1">' + esc(T('checkout.deliveryTitle')) + '</h2></div>' +
              '<form class="co__form" novalidate data-form="2">' +
                '<fieldset class="co__methods"><legend class="caps caps--sm co__legend">' + esc(T('checkout.method')) + '</legend>' +
                  methods.map(function (m) {
                    return '<label class="co__method"><input type="radio" name="method" value="' + esc(m.id) + '"' + (m.id === d.method ? ' checked' : '') + '>' +
                      '<span class="co__radio" aria-hidden="true"></span>' +
                      '<span class="co__mtext"><span class="co__mname">' + esc(m.label) + '</span><span class="small">' + AU.nums(m.text) + '</span></span>' +
                      '<span class="co__mprice">' + (m.price ? AU.price(m.price) : esc(T('checkout.free'))) + '</span></label>';
                  }).join('') +
                '</fieldset>' +
                '<div class="co__addr" data-co-addr>' +
                  field('address', 'text', T('checkout.address'), false, ' autocomplete="address-line1"') +
                  field('address2', 'text', T('checkout.address2'), true, ' autocomplete="address-line2"') +
                  '<div class="co__two">' +
                    field('city', 'text', T('checkout.city'), false, ' autocomplete="address-level2"') +
                    field('postcode', 'text', T('checkout.postcode'), false, ' autocomplete="postal-code"') +
                  '</div>' +
                  '<div class="field co__field" data-f="country"><label class="caps caps--sm" for="co-country">' + esc(T('checkout.country')) + '</label>' +
                    '<select id="co-country" name="country" autocomplete="country" aria-describedby="co-country-err"><option value="">' + esc(T('checkout.countryChoose')) + '</option>' +
                    countries.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === d.country ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
                    '<p class="field__err" id="co-country-err" aria-live="polite"></p></div>' +
                '</div>' +
                '<div class="field co__field" data-f="note"><label class="caps caps--sm" for="co-note">' + esc(T('checkout.note')) + ' <span class="co__opt">' + esc(T('checkout.optional')) + '</span></label>' +
                  '<textarea id="co-note" name="note" rows="2" maxlength="240" placeholder="' + esc(T('checkout.notePlaceholder')) + '">' + esc(d.note) + '</textarea></div>' +
                '<div class="co__nav"><button class="link caps caps--sm co__back" type="button" data-back>' + AU.icon('arrowLeft', { size: 16 }) + esc(T('checkout.back')) + '</button>' +
                '<button class="btn btn--solid" type="submit">' + esc(T('checkout.toPayment')) + ' ' + AU.icon('arrow', { size: 16 }) + '</button></div>' +
              '</form>' +
            '</section>' +
            /* 4 · payment hand-off */
            '<section class="co__pane" data-pane="3" aria-labelledby="co-h3" hidden>' +
              '<div class="co__pane-head"><h2 id="co-h3" class="caps co__h" tabindex="-1">' + esc(T('checkout.paymentTitle')) + '</h2></div>' +
              '<dl class="co__recap" data-co-recap></dl>' +
              '<div class="co__pay" data-co-pay></div>' +
              '<div class="co__nav"><button class="link caps caps--sm co__back" type="button" data-back>' + AU.icon('arrowLeft', { size: 16 }) + esc(T('checkout.back')) + '</button><span></span></div>' +
            '</section>' +
          '</div>' +
          /* the summary: the totals and the reassurance always; the pieces themselves only once the left column holds a
             form (on Review they are the left column). On a phone it folds into one line above the form. */
          '<aside class="co__sum' + (sumOpen ? ' is-open' : '') + '" aria-labelledby="co-sum-h" data-co-sum>' +
            '<h2 id="co-sum-h" class="co__sum-hh">' +
              '<span class="caps caps--sm co__sum-h">' + esc(T('checkout.summary')) + '</span>' +
              '<button class="co__sum-toggle" type="button" aria-expanded="' + sumOpen + '" aria-controls="co-sum-body" data-co-sumtoggle>' +
                '<span class="caps caps--sm">' + esc(T('checkout.summary')) + '</span>' +
                '<span class="co__sum-tot" data-co-sumtot></span>' +
                '<span class="co__sum-chev" aria-hidden="true">' + AU.icon('chevron', { size: 16 }) + '</span>' +
              '</button>' +
            '</h2>' +
            '<div class="co__sum-body" id="co-sum-body"><div class="co__sum-in">' +
              '<ul class="co__lines" data-co-lines></ul>' +
              '<dl class="co__totals">' +
                '<div><dt class="caps caps--sm">' + esc(T('checkout.subtotal')) + '</dt><dd data-co-sub></dd></div>' +
                '<div><dt class="caps caps--sm">' + esc(T('checkout.delivery')) + '</dt><dd data-co-del></dd></div>' +
                '<div class="co__total"><dt class="caps caps--sm">' + esc(T('checkout.total')) + '</dt><dd data-co-total></dd></div>' +
              '</dl>' +
              '<p class="small co__secure">' + AU.icon('shield', { size: 17 }) + '<span>' + esc(T('checkout.paymentText')) + '</span></p>' +
              '<p class="small co__secure">' + AU.icon('truck', { size: 17 }) + '<span>' + esc(T('checkout.secure')) + '</span></p>' +
            '</div></div>' +
          '</aside>' +
        '</div>';
      AU.hydrateIcons(body);
      paintSummary();
      show(step, true);
    };

    /* ---------- the summary (and the review list) ---------- */
    var lineHTML = function (it, big) {
      return '<li class="co__line">' +
        '<span class="co__thumb"><span class="co__piece" data-spec="' + esc(it.id) + '"></span></span>' +
        '<span class="co__lmain"><span class="co__lname caps">' + AU.nums(it.name) + '</span>' +
        '<span class="small co__lmeta">' + AU.nums(it.meta || '') + '</span>' +
        (it.qty > 1 || big ? '<span class="small co__lqty">' + AU.nums(T('checkout.qtyN', { n: it.qty })) + '</span>' : '') + '</span>' +
        '<span class="co__lprice">' + AU.price(it.price, it.qty) + '</span></li>';
    };
    var paintSummary = function () {
      var items = AU.cart.items();
      [['[data-co-lines]', false], ['[data-co-review]', true]].forEach(function (x) {
        var ul = AU.$(x[0], body);
        if (!ul) return;
        ul.innerHTML = items.map(function (it) { return lineHTML(it, x[1]); }).join('');
        AU.$$('.co__piece', ul).forEach(function (h, i) {
          var it = items[i], p = AU.product(it.id);
          S.still(h, it.spec || (p && p.spec), { size: 240, eager: true });
        });
      });
      // shown sums are built from the cart's lines so they add up in every currency (see AU.price in 00-core.js)
      var lines = AU.cart.lines(), del = method().price || 0;
      var totLines = del ? lines.concat([[del, 1]]) : lines;
      AU.$('[data-co-sub]', body).innerHTML = AU.price(lines);
      AU.$('[data-co-del]', body).innerHTML = del ? AU.price(del) : esc(T('checkout.free'));
      AU.$('[data-co-total]', body).innerHTML = AU.price(totLines);
      var st = AU.$('[data-co-sumtot]', body);
      if (st) st.innerHTML = AU.price(totLines);
    };

    /* ---------- validation: calm, per field, after the first attempt ---------- */
    var rules = {
      name: function (v) { return v.trim().length >= 2 ? '' : T('checkout.errName'); },
      email: function (v) { return EMAIL.test(v.trim()) ? '' : T('checkout.errEmail'); },
      phone: function (v) { return !v.trim() || /^[+()\d\s.-]{6,}$/.test(v.trim()) ? '' : T('checkout.errPhone'); },
      address: function (v) { return d.method === 'collect' || v.trim().length >= 3 ? '' : T('checkout.errAddress'); },
      city: function (v) { return d.method === 'collect' || v.trim().length >= 2 ? '' : T('checkout.errCity'); },
      postcode: function (v) { return d.method === 'collect' || v.trim().length >= 2 ? '' : T('checkout.errPost'); },
      country: function (v) { return d.method === 'collect' || v ? '' : T('checkout.errCountry'); }
    };
    var checkField = function (k) {
      var wrap = AU.$('[data-f="' + k + '"]', body);
      if (!wrap || !rules[k]) return true;
      var inp = AU.$('input, select', wrap), msg = rules[k](inp.value);
      wrap.classList.toggle('is-bad', !!msg);
      inp.setAttribute('aria-invalid', String(!!msg));
      AU.$('.field__err', wrap).textContent = msg;
      return !msg;
    };
    var checkForm = function (n) {
      var keys = n === 1 ? ['name', 'email', 'phone'] : ['address', 'city', 'postcode', 'country'];
      tried[n] = true;
      var bad = keys.filter(function (k) { return !checkField(k); });
      if (bad.length) {
        var f = AU.$('[data-f="' + bad[0] + '"] input, [data-f="' + bad[0] + '"] select', body);
        if (f) f.focus();
        return false;
      }
      return true;
    };

    /* ---------- the payment hand-off ---------- */
    var cfg = function () { return (AU.content.config && AU.content.config.checkout) || { provider: 'preview' }; };
    var paintPay = function () {
      var recap = AU.$('[data-co-recap]', body), pay = AU.$('[data-co-pay]', body);
      var m = method(), country = countries.find(function (c) { return c.id === d.country; });
      var addr = d.method === 'collect' ? T('checkout.collectAt') : [d.address, d.address2, [d.postcode, d.city].filter(Boolean).join(' '), country && country.name].filter(Boolean).join(', ');
      recap.innerHTML =
        '<div><dt class="caps caps--sm">' + esc(T('checkout.contact')) + '</dt><dd>' + AU.nums([d.name, d.email, d.phone].filter(Boolean).join(' · ')) + '</dd><dd><button class="link caps caps--sm" type="button" data-go="1">' + esc(T('checkout.edit')) + '</button></dd></div>' +
        '<div><dt class="caps caps--sm">' + esc(T('checkout.shipTo')) + '</dt><dd>' + AU.nums(addr) + '<br><span class="small">' + esc(m.label || '') + '</span></dd><dd><button class="link caps caps--sm" type="button" data-go="2">' + esc(T('checkout.edit')) + '</button></dd></div>';
      var c = cfg(), items = AU.cart.items(), html = '';
      if (c.provider === 'stripe') {
        var links = c.stripeLinks || {};
        if (items.length === 1 && links[items[0].id]) html = '<button class="btn btn--solid co__paybtn" type="button" data-pay="stripe">' + AU.icon('shield', { size: 16 }) + esc(T('checkout.payStripe')) + '</button>';
        else html = note(items.length > 1 ? T('checkout.stripeMulti') : T('checkout.stripeMissing'), true);
      } else if (c.provider === 'shopify') {
        html = '<button class="btn btn--solid co__paybtn" type="button" data-pay="shopify">' + AU.icon('shield', { size: 16 }) + esc(T('checkout.payShopify')) + '</button><p class="small co__payerr" aria-live="polite" data-payerr></p>';
      } else {
        html = '<div class="co__note"><p class="co__note-t script t-h3">' + esc(T('checkout.previewTitle')) + '</p><p class="body">' + esc(T('checkout.previewText')) + '</p>' +
          '<a class="link caps caps--sm" href="#/visit">' + esc(T('checkout.previewLink')) + ' ' + AU.icon('arrow', { size: 16 }) + '</a></div>';
      }
      pay.innerHTML = html;
    };
    var note = function (msg, link) {
      return '<div class="co__note"><p class="body">' + esc(msg) + '</p>' + (link ? '<a class="link caps caps--sm" href="#/visit">' + esc(T('checkout.previewLink')) + ' ' + AU.icon('arrow', { size: 16 }) + '</a>' : '') + '</div>';
    };
    var payStripe = function (btn) {
      var it = AU.cart.items()[0], url = (cfg().stripeLinks || {})[it && it.id];
      if (!url || !/^https:\/\//.test(url)) return;
      btn.disabled = true; btn.innerHTML = esc(T('checkout.redirecting'));
      location.href = url;
    };
    var payShopify = function (btn) {
      var c = cfg(), sh = c.shopify || {}, err = AU.$('[data-payerr]', body);
      var fail = function () { btn.disabled = false; btn.innerHTML = AU.icon('shield', { size: 16 }) + esc(T('checkout.payShopify')); if (err) err.textContent = T('checkout.shopifyError'); };
      var variants = sh.variants || {};
      var items = AU.cart.items();
      if (!sh.domain || !sh.token || items.some(function (it) { return !variants[it.id]; })) { fail(); return; }
      btn.disabled = true; btn.textContent = T('checkout.redirecting');
      if (err) err.textContent = '';
      var q = 'mutation cartCreate($input: CartInput!) { cartCreate(input: $input) { cart { checkoutUrl } userErrors { field message } } }';
      var input = {
        lines: items.map(function (it) { return { merchandiseId: variants[it.id], quantity: it.qty, attributes: it.meta ? [{ key: 'Options', value: it.meta }] : [] }; }),
        buyerIdentity: { email: d.email || undefined, countryCode: d.country || undefined },
        note: d.note || undefined
      };
      fetch('https://' + String(sh.domain).replace(/^https?:\/\//, '').replace(/\/.*$/, '') + '/api/2024-07/graphql.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': sh.token },
        body: JSON.stringify({ query: q, variables: { input: input } })
      }).then(function (r) { return r.json(); }).then(function (j) {
        var url = j && j.data && j.data.cartCreate && j.data.cartCreate.cart && j.data.cartCreate.cart.checkoutUrl;
        if (url && alive) location.href = url; else fail();
      }).catch(fail);
    };

    /* ---------- steps: the old pane drifts away, the new one rises; the hairline draws to the step ---------- */
    var show = function (n, first) {
      var panes = AU.$$('[data-pane]', body);
      if (!panes.length) return;
      var prev = step;
      step = AU.clamp(n, 0, 3);
      body.setAttribute('data-step', step);
      if (step === 3) paintPay();
      var fill = AU.$('[data-co-fill]', body);
      fill.style.transform = 'scaleX(' + ((step + 1) / 4).toFixed(4) + ')';
      AU.$$('[data-go]', AU.$('.co__steps', body)).forEach(function (b, i) {
        b.classList.toggle('is-done', i < step);
        b.classList.toggle('is-now', i === step);
        b.disabled = i > step;
        if (i === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      AU.$('[data-co-live]', body).textContent = T('checkout.stepOf', { n: step + 1 }) + ': ' + steps[step];
      AU.$('[data-co-cap]', body).innerHTML = AU.nums(T('checkout.stepOf', { n: step + 1 })) + ' · ' + esc(steps[step]);
      keepStep(step);
      var next = panes[step], old = panes[prev];
      var dir = step >= prev ? 1 : -1;
      if (first || AU.reduced || old === next) {
        panes.forEach(function (p) { p.hidden = p !== next; p.classList.remove('is-leaving', 'is-entering'); });
      } else {
        old.classList.remove('is-entering');
        old.style.setProperty('--dir', dir);
        old.classList.add('is-leaving');
        setTimeout(function () {
          if (!alive) return;
          old.hidden = true; old.classList.remove('is-leaving');
          next.hidden = false;
          next.style.setProperty('--dir', dir);
          next.classList.remove('is-entering'); void next.offsetWidth; next.classList.add('is-entering');
          var h = AU.$('.co__h', next); if (h) h.focus({ preventScroll: true });
          // keep the step in view when the panes are below the fold (a phone)
          var top = AU.$('.co__steps', body).getBoundingClientRect().top;
          if (top < 0) { var y = top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--head-h'), 10) || 0) - 12; if (AU.scrollTo) AU.scrollTo(y, { immediate: false }); else window.scrollTo({ top: y, behavior: 'smooth' }); }
        }, 320);
      }
    };

    /* ---------- events ---------- */
    body.addEventListener('click', function (e) {
      var t = e.target, b;
      if ((b = t.closest('[data-next]'))) { show(1); return; }
      if ((b = t.closest('[data-back]'))) { show(step - 1); return; }
      if ((b = t.closest('[data-go]'))) { var g = +b.getAttribute('data-go'); if (g <= step) show(g); return; }
      if ((b = t.closest('[data-pay]'))) { if (b.getAttribute('data-pay') === 'stripe') payStripe(b); else payShopify(b); return; }
      if ((b = t.closest('[data-co-sumtoggle]'))) {
        sumOpen = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(sumOpen));
        AU.$('[data-co-sum]', body).classList.toggle('is-open', sumOpen);
      }
    });
    body.addEventListener('submit', function (e) {
      var f = e.target.closest('[data-form]');
      if (!f) return;
      e.preventDefault();
      var n = +f.getAttribute('data-form');
      if (checkForm(n)) { keep(d); show(n + 1); }
    });
    body.addEventListener('input', function (e) {
      var inp = e.target;
      if (!inp.name || !(inp.name in d)) return;
      d[inp.name] = inp.type === 'radio' ? (inp.checked ? inp.value : d[inp.name]) : inp.value;
      if (inp.name === 'method') {
        body.classList.toggle('is-collect', d.method === 'collect');
        paintSummary();
      }
      keep(d);
      var wrap = inp.closest('[data-f]');
      if (wrap && tried[step] && wrap.classList.contains('is-bad')) checkField(wrap.getAttribute('data-f'));
    });
    body.addEventListener('change', function (e) {
      var inp = e.target;
      if (inp.name === 'country' || inp.name === 'method') { d[inp.name] = inp.value; keep(d); if (tried[step]) checkField('country'); if (inp.name === 'method') { body.classList.toggle('is-collect', d.method === 'collect'); paintSummary(); } }
    });
    body.addEventListener('focusout', function (e) {
      var wrap = e.target.closest && e.target.closest('[data-f]');
      if (wrap && tried[step]) checkField(wrap.getAttribute('data-f'));
    });
    var offCart = AU.on('cart', function () {
      if (!alive) return;
      if (!AU.cart.count()) { empty(); return; }
      if (!AU.$('[data-co-lines]', body)) build(); else paintSummary();
    });
    ctx.onLeave(offCart);
    build();
    body.classList.toggle('is-collect', d.method === 'collect');
  };

  AU.ready(function () {
    if (!AU.router) return;
    AU.router.add('/checkout', {
      name: 'checkout',
      title: function () { return T('meta.checkout'); },
      description: function () { return T('meta.checkoutDesc'); },
      render: render
    });
  });
})();
