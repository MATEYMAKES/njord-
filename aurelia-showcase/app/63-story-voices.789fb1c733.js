/* ---- 63-story-voices.js ---- */
/* Story / atelier: #voices (testimonial carousel), the four promises, the closing doors, the chapter rail, and the
   '/atelier' route itself. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.storyKit || !AU.storyAtelier) return;
  var K = AU.storyKit, A = AU.storyAtelier, T = A.helpers.T;

  /* =====================================================================================================
     5. VOICES + PROMISES
     ===================================================================================================== */
  function voicesHTML() {
    var list = AU.content.voices || [], N = list.length;
    return '<section id="voices" class="vo section" aria-labelledby="vo-title">' +
      '<div class="wrap">' +
        '<div class="vo__head"><h2 id="vo-title" class="eyebrow eyebrow--center caps" data-reveal="fade">' + AU.nums(T('voices.title')) + '</h2></div>' +
        '<div class="vo__stage" data-vo-stage role="region" aria-roledescription="carousel" aria-label="' + AU.esc(T('voices.region')) + '">' +
          '<span class="vo__mark" data-vo-mark aria-hidden="true">&ldquo;</span>' +
          '<div class="vo__slides" data-vo-slides aria-live="off">' + list.map(function (v, i) {
            return '<figure class="vo__slide" role="group" aria-roledescription="slide" aria-label="' + AU.esc(T('voices.slide', { n: i + 1, total: N })) + '" aria-hidden="true">' +
              '<blockquote class="vo__q"><p>' + AU.nums(v.quote) + '</p></blockquote>' +
              '<figcaption class="vo__by"><span class="caps vo__name">' + AU.nums(v.name) + '</span><span class="small vo__place">' + AU.nums(v.place) + '</span></figcaption></figure>';
          }).join('') + '</div>' +
          '<div class="vo__ctrl" data-reveal="fade" data-delay="300">' +
            '<p class="vo__count" aria-hidden="true"><span class="vo__cur"><span class="num" data-vo-cur>01</span></span><span class="vo__sep">/</span><span class="num">' + K.pad2(N) + '</span></p>' +
            '<div class="vo__track" aria-hidden="true"><span class="vo__bar" data-vo-bar></span></div>' +
            '<div class="vo__btns">' +
              '<button class="icon-btn vo__btn vo__btn--play" type="button" data-vo-play></button>' +
              '<button class="icon-btn vo__btn" type="button" data-vo-prev aria-label="' + AU.esc(T('voices.prev')) + '">' + AU.icon('arrowLeft', { size: 18 }) + '</button>' +
              '<button class="icon-btn vo__btn" type="button" data-vo-next aria-label="' + AU.esc(T('voices.next')) + '">' + AU.icon('arrow', { size: 18 }) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function initVoices(root, signal) {
    var sec = AU.$('#voices', root); if (!sec) return;
    var list = AU.content.voices || [], N = list.length;
    if (!N) return;
    var stage = AU.$('[data-vo-stage]', sec), slidesEl = AU.$('[data-vo-slides]', sec), bar = AU.$('[data-vo-bar]', sec);
    var curEl = AU.$('[data-vo-cur]', sec), curBox = curEl.parentElement, playBtn = AU.$('[data-vo-play]', sec), mark = AU.$('[data-vo-mark]', sec);
    var slides = AU.$$('.vo__slide', slidesEl);
    slides.forEach(function (s) { AU.split(AU.$('.vo__q p', s)); });
    // with reduced motion nothing plays by itself: the button offers to play instead
    var cur = -1, p = 0, started = false, hover = false, focus = false, visible = false, userPaused = !!AU.reduced, off = null, hold = 0;
    var timers = [];
    var later = function (fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; };

    function setCount(dir) {
      curEl.textContent = K.pad2(cur + 1);
      curBox.classList.remove('is-roll', 'is-roll-back'); void curBox.offsetWidth;
      curBox.classList.add(dir < 0 ? 'is-roll-back' : 'is-roll');
    }
    var setBar = function (v) { bar.style.transform = 'scaleX(' + v.toFixed(4) + ')'; };
    var wordsOf = slides.map(function (s) { return AU.$$('.w', s).length || 20; });
    var settle = function (k) { return .42 + wordsOf[k] * .034 + 1.2; };
    var readFor = function (k) { return Math.max(7, wordsOf[k] * .26); };

    /* a change of quote: the old one lifts away quickly (.35s), and the new one's words only begin to rise once it has
       gone (.5s), so two quotes are never legible over one another */
    function go(n, dir, instant) {
      n = ((n % N) + N) % N;
      if (n === cur) return;
      if (AU.reduced) instant = true;
      var old = slides[cur], nu = slides[n];
      if (instant) slidesEl.classList.add('is-instant');
      if (old) {
        old.classList.remove('is-active'); old.setAttribute('aria-hidden', 'true');
        if (!instant) { old.classList.add('is-leaving'); clearTimeout(old.__t); old.__t = later(function () { old.classList.remove('is-leaving'); }, 600); }
      }
      clearTimeout(nu.__t); nu.classList.remove('is-leaving');
      nu.style.setProperty('--vo-d', old ? '.5s' : '.15s');
      nu.classList.add('is-active'); nu.removeAttribute('aria-hidden');
      cur = n;
      if (started) setCount(dir || 1); else curEl.textContent = K.pad2(cur + 1);
      p = 0; setBar(0);
      hold = instant ? .8 : settle(n);
      if (old && !instant && !AU.reduced) { mark.classList.add('is-turn'); later(function () { mark.classList.remove('is-turn'); }, 520); }
      if (instant) requestAnimationFrame(function () { requestAnimationFrame(function () { slidesEl.classList.remove('is-instant'); }); });
      started = true;
    }
    function running() { return started && !userPaused && !hover && !focus && visible; }
    function sync() {
      var run = running();
      if (run && !off) {
        off = AU.tick(function (t, dt) {
          if (hold > 0) { hold -= dt; return; }
          p += dt / readFor(cur);
          if (p >= 1) { go(cur + 1, 1); return; }
          setBar(p);
        });
      } else if (!run && off) { off(); off = null; }
      slidesEl.setAttribute('aria-live', run ? 'off' : 'polite');
      sec.classList.toggle('is-still', !run);
    }
    function setPlayBtn() {
      playBtn.innerHTML = AU.icon(userPaused ? 'play' : 'pause', { size: 16 });
      playBtn.setAttribute('aria-label', T(userPaused ? 'voices.play' : 'voices.pause'));
    }
    AU.$('[data-vo-prev]', sec).addEventListener('click', function () { go(cur - 1, -1); sync(); });
    AU.$('[data-vo-next]', sec).addEventListener('click', function () { go(cur + 1, 1); sync(); });
    playBtn.addEventListener('click', function () { userPaused = !userPaused; if (!userPaused) { focus = false; hover = false; } setPlayBtn(); sync(); });
    slidesEl.addEventListener('mouseenter', function () { hover = true; sync(); });
    slidesEl.addEventListener('mouseleave', function () { hover = false; sync(); });
    stage.addEventListener('focusin', function (e) { focus = slidesEl.contains(e.target); sync(); });
    stage.addEventListener('focusout', function (e) { focus = !!(e.relatedTarget && slidesEl.contains(e.relatedTarget)); sync(); });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, -1); sync(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, 1); sync(); }
    });
    var sx = null, sy = 0;
    slidesEl.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse') return; sx = e.clientX; sy = e.clientY; }, { passive: true });
    slidesEl.addEventListener('pointerup', function (e) {
      if (sx == null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) { go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); sync(); }
    }, { passive: true });
    slidesEl.addEventListener('pointercancel', function () { sx = null; });

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { visible = e.isIntersecting; if (visible && cur < 0) go(0, 1, !!AU.reduced); sync(); });
    }, { threshold: 0.25 });
    io.observe(stage);
    var offR = AU.on('reduced', function (r) { if (r) userPaused = true; setPlayBtn(); sync(); });
    setPlayBtn(); sync();
    signal.addEventListener('abort', function () { io.disconnect(); offR(); if (off) off(); timers.forEach(clearTimeout); });
  }

  /* =====================================================================================================
     the closing band and the chapter rail
     ===================================================================================================== */
  /* the close: the house's four promises folded into one quiet line of capitals (hairlines between them), then the
     invitation and its two doors */
  function endHTML() {
    var pr = AU.content.promises || [];
    return '<section class="atl-end section" aria-labelledby="atl-end-t"><div class="wrap atl-end__in">' +
      '<span class="atl-end__star" aria-hidden="true">' + AU.icon('sparkle', { size: 22 }) + '</span>' +
      '<h2 id="atl-end-t" class="script t-h2" data-reveal="words">' + AU.nums(T('end.title')) + '</h2>' +
      '<p class="lede atl-end__text" data-reveal="up" data-delay="150">' + AU.nums(T('end.text')) + '</p>' +
      (pr.length ? '<ul class="atl-end__promises" aria-label="' + AU.esc(T('promises.title')) + '" data-reveal="fade" data-delay="220">' + pr.map(function (p) {
        return '<li class="caps caps--sm" title="' + AU.esc(p.text || '') + '">' + AU.nums(p.title) + '</li>';
      }).join('') + '</ul>' : '') +
      '<div class="atl-end__cta" data-reveal="up" data-delay="300">' +
        '<a class="btn btn--solid" href="#/visit">' + AU.esc(T('end.visit')) + AU.icon('arrow', { size: 16 }) + '</a>' +
        '<a class="btn" href="#/bespoke">' + AU.esc(T('end.bespoke')) + '</a>' +
      '</div></div></section>';
  }

  /* the chapter rail: four short marks inside the grid's right edge, no numerals (the forge and the steps count their
     own phases); a chapter's name appears beside its mark on hover or focus */
  function railHTML() {
    var ch = T('chapters') || [], ids = ['forge', 'process', 'years', 'voices'];
    return '<nav class="atl-rail" data-atl-rail aria-label="' + AU.esc(K.t('common.chapters')) + '"><ol>' + ids.map(function (id, i) {
      return '<li><a href="#' + id + '" data-for="' + id + '"><span class="atl-rail__l caps caps--sm">' + AU.esc(ch[i] || '') + '</span>' +
        '<i aria-hidden="true"></i></a></li>';
    }).join('') + '</ol></nav>';
  }
  function initRail(root, signal) {
    var rail = AU.$('[data-atl-rail]', root); if (!rail) return;
    var links = AU.$$('a', rail), secs = links.map(function (a) { return AU.$('#' + a.getAttribute('data-for'), root); });
    var tops = [], endY = 0, act = -2;
    var measure = function () { tops = secs.map(function (s) { return s ? K.top(s) : 0; }); var v = AU.$('#voices', root); endY = v ? K.top(v) + v.offsetHeight : 0; };
    var update = function (y) {
      var mid = y + window.innerHeight * .45, a = -1;
      tops.forEach(function (t, i) { if (mid >= t) a = i; });
      // the timeline runs edge to edge, so the rail steps aside while it is pinned there
      var show = a >= 0 && a !== 2 && mid < endY;
      if (a === act && rail.__show === show) return;
      act = a; rail.__show = show;
      rail.classList.toggle('is-on', show);
      links.forEach(function (l, i) { l.classList.toggle('is-active', i === a); if (i === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    };
    var ro = new ResizeObserver(function () { measure(); update(AU.scroll.y); }); ro.observe(root);
    var offS = AU.onScroll(update);
    signal.addEventListener('abort', function () { ro.disconnect(); offS(); });
  }

  /* =====================================================================================================
     the route
     ===================================================================================================== */
  AU.ready(function () {
    if (!AU.router) return;
    K.route('/atelier', {
      name: 'atelier',
      title: function () { return T('metaTitle'); },
      description: function () { return T('metaDesc'); },
      jsonld: function () {
        var C = AU.content, site = (C.config && C.config.siteUrl) || '';
        return {
          '@context': 'https://schema.org', '@type': 'AboutPage', name: T('metaTitle'), description: T('metaDesc'), url: site + '/atelier',
          mainEntity: { '@type': 'Organization', name: (C.brand && C.brand.name) || 'Aurelia', foundingDate: String((C.brand && C.brand.since) || 1984), url: site,
            email: C.brand && C.brand.email, telephone: C.brand && C.brand.phone }
        };
      },
      render: function (el, params, ctx) {
        el.innerHTML = '<div class="sp atl-page">' +
          A.headHTML() + A.forgeHTML() + A.processHTML() + A.yearsHTML() + voicesHTML() + endHTML() + railHTML() + '</div>';
        K.prepHead(el);
        AU.reveal(el);
        var sig = ctx.signal;
        try { A.initStats(el, sig); } catch (e) { console.error('[story] stats', e); }
        try { A.initForge(el, sig); } catch (e) { console.error('[story] forge', e); }
        try { A.initProcess(el, sig); } catch (e) { console.error('[story] process', e); }
        try { A.initYears(el, sig); } catch (e) { console.error('[story] years', e); }
        try { initVoices(el, sig); } catch (e) { console.error('[story] voices', e); }
        try { initRail(el, sig); } catch (e) { console.error('[story] rail', e); }
        // the quiet atelier ambience (silent unless the visitor has turned sound on)
        if (AU.sound && typeof AU.sound.ambient === 'function') {
          try { AU.sound.ambient('atelier'); } catch (e) {}
          ctx.onLeave(function () { try { AU.sound.ambient(null); } catch (e) {} });
        }
      }
    });
  });
})();
