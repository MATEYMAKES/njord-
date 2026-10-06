/* ---- 68-story-care.js ---- */
/* Story: client care ('/care'). Delivery & returns, care & cleaning, repairs & resizing, warranty and questions, as
   accordions (placeholder answers in content, with links to /visit, /size, /birthstones, /journal).
   Opening and closing never jump: the answer is revealed with clip-path, and everything below it glides to its new
   place by transform (FLIP), so nothing animates height. Answers are hidden="until-found", so find-in-page opens them. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.storyKit) return;
  var K = AU.storyKit;
  var T = function (p, v) { return K.t('care.' + p, v); };
  var sections = function () { return (AU.content.care && AU.content.care.sections) || []; };
  var plain = function (s) { return String(s).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); };
  var C = function (k) { return K.t('common.contact.' + k); };
  /* "Mon – Sat, 09:00 – 18:00": the days in caps, the hours in lining figures */
  var hoursHTML = function (h) {
    var s = String(h || ''), i = s.search(/\d/);
    if (i < 0) return AU.esc(s);
    return '<span class="care__hdays">' + AU.esc(s.slice(0, i).replace(/[,\s]+$/, '')) + '</span><span class="num">' + AU.esc(s.slice(i)) + '</span>';
  };

  function pageHTML() {
    var secs = sections(), B = AU.content.brand || {};
    var tel = String(B.phone || '').replace(/[^\d+]/g, '');
    return '<div class="sp care">' +
      K.head({ eyebrow: T('eyebrow'), titleHTML: AU.nums(T('title')), lede: T('lede'), cls: 'care__head', compact: true }) +
      '<nav class="care__jump wrap" aria-label="' + AU.esc(T('jump')) + '"><span class="caps caps--sm care__jumpl">' + AU.esc(T('jump')) + '</span><ul>' + secs.map(function (s) {
        return '<li><a class="chip care__chip" href="#care-' + AU.esc(s.id) + '">' + AU.icon(s.icon || 'sparkle', { size: 15 }) + '<span>' + AU.nums(s.title) + '</span></a></li>';
      }).join('') + '</ul></nav>' +
      '<div class="care__list wrap">' + secs.map(function (s, si) {
        return '<section class="care__sec" id="care-' + AU.esc(s.id) + '" aria-labelledby="care-h-' + AU.esc(s.id) + '" data-care-flip>' +
          '<header class="care__sh" data-reveal="fade">' +
            '<span class="care__sn num" aria-hidden="true">' + K.pad2(si + 1) + '</span>' +
            '<span class="care__sl" aria-hidden="true"></span>' +
            '<h2 class="care__st" id="care-h-' + AU.esc(s.id) + '">' + AU.nums(s.title) + '</h2>' +
          '</header>' +
          '<ul class="care__items">' + (s.items || []).map(function (it, i) {
            var id = 'care-' + s.id + '-' + i;
            return '<li class="care__item" data-care-flip>' +
              '<h3 class="care__qh"><button class="care__q" type="button" aria-expanded="false" aria-controls="' + id + '" id="' + id + '-q">' +
                '<span class="care__qt">' + AU.nums(it.q) + '</span><span class="care__pm" aria-hidden="true"><i></i><i></i></span></button></h3>' +
              '<div class="care__a" id="' + id + '" role="region" aria-labelledby="' + id + '-q" hidden="until-found"><div class="care__ai"><p>' + K.links(it.a) + '</p></div></div>' +
            '</li>';
          }).join('') + '</ul>' +
        '</section>';
      }).join('') + '</div>' +
      '<section class="care__help wrap" data-care-flip aria-labelledby="care-help-t">' +
        '<div class="care__helpin">' +
          '<h2 class="script t-h2" id="care-help-t" data-reveal="words">' + AU.nums(T('help')) + '</h2>' +
          '<p class="lede">' + AU.nums(T('helpText')) + '</p>' +
        '</div>' +
        /* the way to write or call (as on /visit), then the invitation */
        '<div class="care__helpcta" id="contact">' +
          '<ul class="care__contacts">' +
            (B.email ? '<li><a class="care__contact" href="mailto:' + AU.esc(B.email) + '">' + AU.icon('mail', { size: 18 }) +
              '<span class="caps caps--sm care__ck">' + AU.esc(C('email')) + '</span><span class="care__cv">' + AU.esc(B.email) + '</span></a></li>' : '') +
            (B.phone ? '<li><a class="care__contact" href="tel:' + AU.esc(tel) + '">' + AU.icon('phone', { size: 18 }) +
              '<span class="caps caps--sm care__ck">' + AU.esc(C('call')) + '</span><span class="care__cv num">' + AU.esc(B.phone) + '</span></a></li>' : '') +
          '</ul>' +
          '<p class="caps caps--sm care__hours"><span class="care__hlabel">' + AU.esc(C('hoursLabel')) + '</span>' +
            '<span class="care__hval">' + hoursHTML(C('hours')) + '</span></p>' +
          '<a class="btn btn--solid" href="#/visit?reason=repair">' + AU.esc(T('helpVisit')) + AU.icon('arrow', { size: 16 }) + '</a>' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  function init(root, signal) {
    var timers = [];
    var flipAll = function () { return AU.$$('[data-care-flip]', root); };

    /* FLIP: measure what follows, change the layout, then let it glide from where it was */
    function flip(after, mutate) {
      var els = flipAll().filter(function (el) { return after.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING && !after.contains(el); });
      var vh = window.innerHeight;
      var before = els.map(function (el) { return el.getBoundingClientRect().top; });
      mutate();
      if (AU.reduced) return;
      var moves = [];
      els.forEach(function (el, i) {
        var top = el.getBoundingClientRect().top, d = before[i] - top;
        if (Math.abs(d) < .5 || (top > vh + 40 && before[i] > vh + 40)) return;      // off screen: no need to move it
        moves.push([el, d]);
      });
      // nested items move with their section: skip a mover whose ancestor also moves the same distance
      moves = moves.filter(function (m) { return !moves.some(function (o) { return o !== m && o[0].contains(m[0]) && Math.abs(o[1] - m[1]) < .5; }); });
      moves.forEach(function (m) { m[0].style.transition = 'none'; m[0].style.transform = 'translate3d(0,' + m[1].toFixed(1) + 'px,0)'; });
      void root.offsetHeight;
      moves.forEach(function (m) {
        m[0].style.transition = 'transform .75s cubic-bezier(.16,1,.3,1)';
        m[0].style.transform = '';
        var done = function (e) { if (e && e.target !== m[0]) return; m[0].style.transition = ''; m[0].removeEventListener('transitionend', done); };
        m[0].addEventListener('transitionend', done);
        timers.push(setTimeout(done, 900));
      });
    }
    function setOpen(btn, open, instant) {
      var item = btn.closest('.care__item'), panel = AU.$('#' + btn.getAttribute('aria-controls'), root);
      if ((btn.getAttribute('aria-expanded') === 'true') === open) return;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      item.classList.toggle('is-open', open);
      if (open) {
        flip(item, function () { panel.hidden = false; });
        if (!instant && !AU.reduced) { panel.classList.remove('is-in'); void panel.offsetWidth; panel.classList.add('is-in'); }
      } else if (instant || AU.reduced) {
        panel.setAttribute('hidden', 'until-found');
      } else {
        // the answer folds away first, then what follows glides up
        panel.classList.remove('is-in'); panel.classList.add('is-out');
        timers.push(setTimeout(function () {
          if (btn.getAttribute('aria-expanded') === 'true') { panel.classList.remove('is-out'); return; }
          flip(item, function () { panel.setAttribute('hidden', 'until-found'); panel.classList.remove('is-out'); });
        }, 260));
      }
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('.care__q'); if (!b) return;
      setOpen(b, b.getAttribute('aria-expanded') !== 'true');
    });
    // find-in-page opened an answer by itself: keep the button in step
    root.addEventListener('beforematch', function (e) {
      var p = e.target.closest && e.target.closest('.care__a'); if (!p) return;
      var b = AU.$('#' + p.id + '-q', root);
      if (b) { b.setAttribute('aria-expanded', 'true'); b.closest('.care__item').classList.add('is-open'); }
    });
    signal.addEventListener('abort', function () { timers.forEach(clearTimeout); });
  }

  AU.ready(function () {
    if (!AU.router) return;
    K.route('/care', {
      name: 'care',
      title: function () { return T('metaTitle'); },
      description: function () { return T('metaDesc'); },
      jsonld: function () {
        var q = [];
        sections().forEach(function (s) { (s.items || []).forEach(function (it) { q.push({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: plain(it.a) } }); }); });
        return { '@context': 'https://schema.org', '@type': 'FAQPage', name: T('metaTitle'), mainEntity: q };
      },
      render: function (el, params, ctx) {
        el.innerHTML = pageHTML();
        K.prepHead(el);
        AU.reveal(el);
        init(el, ctx.signal);
      }
    });
  });
})();
