/* ---- 64-story-journal.js ---- */
/* Story: the journal. '/journal' (an editorial list, each story with its picture) and '/journal/:slug' (a story:
   standfirst, drop cap, pull quote, three pictures in two widths, reading progress, the next story); an unknown slug
   is replaced by '/journal' with a short note. AU.content.journal is the data (also used by the home page and search). */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.storyKit) return;
  var K = AU.storyKit;
  var T = function (p, v) { return K.t('journal.' + p, v); };
  var stories = function () { return AU.content.journal || []; };
  var bySlug = function (s) { return stories().find(function (x) { return x.slug === s; }) || null; };
  var site = function () { return ((AU.content.config && AU.content.config.siteUrl) || '').replace(/\/$/, ''); };
  var brand = function () { return (AU.content.brand && AU.content.brand.name) || 'Aurelia'; };

  /* =====================================================================================================
     INDEX
     ===================================================================================================== */
  /* the index, set like a magazine's contents: a compact head (the lede beside the title); the newest story as the lead
     (a wide 16:10 picture at the left, its title in Alex Brush, the standfirst); the others as tall cards side by side,
     their pictures all one height. Each story is one link. */
  function indexHTML(moved) {
    var list = stories().slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    return '<div class="sp jr">' +
      K.head({ eyebrow: T('eyebrow'), titleHTML: AU.nums(T('title')), lede: T('lede'), cls: 'jr__head', compact: true }) +
      (moved ? '<p class="jr__moved wrap" role="status"><span class="jr__moved-in caps caps--sm">' + AU.nums(T('notFound')) + '</span></p>' : '') +
      '<ol class="jr__list wrap" data-jr-list>' + list.map(function (s, i) {
        var lead = i === 0;
        return '<li class="jr__row' + (lead ? ' jr__row--lead' : ' jr__row--card') + '" data-reveal="up" style="--i:' + i + '">' +
          '<a class="jr__a" href="#/journal/' + AU.esc(s.slug) + '" data-i="' + i + '">' +
            '<span class="jr__thumb" aria-hidden="true">' + K.img(s.spec, { size: lead ? 960 : 640, alt: '' }) + '</span>' +
            '<span class="jr__main">' +
              '<span class="jr__meta caps caps--sm">' + AU.nums(s.kicker || '') + '<span class="jr__dot" aria-hidden="true"></span><time datetime="' + AU.esc(s.date) + '">' + K.date(s.date) + '</time></span>' +
              '<h2 class="jr__t' + (lead ? ' jr__t--lead script t-h2' : '') + '">' + AU.nums(s.title) + '</h2>' +
              '<span class="jr__s">' + AU.nums(s.standfirst) + '</span>' +
              '<span class="jr__read caps caps--sm">' + AU.nums(K.t('common.minRead', { n: K.readMinutes(s) })) + '<span class="jr__go" aria-hidden="true">' + AU.icon('arrow', { size: 14 }) + '</span></span>' +
            '</span>' +
          '</a></li>';
      }).join('') + '</ol>' +
      K.doors([
        { kicker: K.t('atelier.eyebrow'), title: K.t('atelier.titleLead') + ' ' + ((AU.content.brand && AU.content.brand.since) || 1984), href: '#/atelier' },
        { kicker: K.t('visit.metaTitle'), title: K.t('atelier.end.title'), href: '#/visit' }
      ]) +
    '</div>';
  }


  /* =====================================================================================================
     STORY
     ===================================================================================================== */
  function storyHTML(s) {
    var list = stories(), i = list.indexOf(s), next = list[(i + 1) % list.length];
    var figs = (s.figures || []).slice();
    var hero = figs.find(function (f) { return f.after === 0; }) || { spec: s.spec, caption: '' };
    var inline = figs.filter(function (f) { return f !== hero; });
    var alt = function (f) { return f.caption || s.title; };
    var body = '';
    (s.body || []).forEach(function (p, k) {
      body += '<p class="js-p' + (k === 0 ? ' js-p--first' : '') + '">' + AU.nums(p) + '</p>';
      if (s.quote && k === s.quoteAfter) {
        body += '<blockquote class="js-quote" data-reveal="up"><span class="js-quote__mark" aria-hidden="true">&ldquo;</span><p>' + AU.nums(s.quote) + '</p></blockquote>';
      }
      // two widths only, alternating after the full-width opening picture: the measure of the text, then the full grid
      inline.forEach(function (f, n) {
        if (f.after !== k) return;
        body += '<figure class="js-fig js-fig--' + (n % 2 ? 'full' : 'measure') + '" data-reveal="up">' +
          K.img(f.spec, { size: 960, alt: alt(f) }) +
          (f.caption ? '<figcaption class="small js-cap">' + AU.nums(f.caption) + '</figcaption>' : '') + '</figure>';
      });
    });
    return '<article class="sp js" aria-labelledby="js-title">' +
      '<div class="js-progress" aria-hidden="true"><i data-js-progress></i></div>' +
      '<header class="js-head wrap">' +
        '<a class="link caps caps--sm js-back" href="#/journal">' + AU.icon('arrowLeft', { size: 14 }) + '<span>' + AU.esc(T('backToJournal')) + '</span></a>' +
        '<p class="eyebrow caps js-kicker">' + AU.nums(s.kicker || T('eyebrow')) + '</p>' +
        '<h1 id="js-title" class="script t-h1 js-title" data-sp-split>' + AU.nums(s.title) + '</h1>' +
        '<p class="lede js-stand">' + AU.nums(s.standfirst) + '</p>' +
        '<p class="js-meta caps caps--sm"><time datetime="' + AU.esc(s.date) + '">' + K.date(s.date) + '</time><span class="jr__dot" aria-hidden="true"></span>' +
          '<span>' + AU.nums(K.t('common.minRead', { n: K.readMinutes(s) })) + '</span></p>' +
      '</header>' +
      '<figure class="js-hero wrap">' + K.img(hero.spec, { size: 960, alt: alt(hero), cls: 'js-hero__img' }) +
        (hero.caption ? '<figcaption class="small js-cap">' + AU.nums(hero.caption) + '</figcaption>' : '') + '</figure>' +
      '<div class="js-body wrap" data-js-body>' + body + '</div>' +
      '<footer class="js-foot wrap">' +
        '<div class="js-share"><span class="js-rule" aria-hidden="true"></span>' +
          '<button class="link caps caps--sm js-sharebtn" type="button" data-js-share>' + AU.icon('sparkle', { size: 14 }) + '<span>' + AU.esc(T('share')) + '</span></button></div>' +
        (next && next !== s ? '<a class="js-next" href="#/journal/' + AU.esc(next.slug) + '">' +
          '<span class="js-next__text">' +
            '<span class="eyebrow caps js-next__k">' + AU.esc(T('nextStory')) + '</span>' +
            '<span class="script t-h2 js-next__t">' + AU.nums(next.title) + '</span>' +
            '<span class="js-next__s">' + AU.nums(next.standfirst) + '</span>' +
            '<span class="link caps caps--sm js-next__go">' + AU.esc(T('read')) + AU.icon('arrow', { size: 14 }) + '</span>' +
          '</span>' +
          '<span class="js-next__img">' + K.img(next.spec, { size: 480, alt: '' }) + '</span>' +
        '</a>' : '') +
      '</footer>' +
    '</article>';
  }

  function initStory(root, s, signal) {
    var art = AU.$('.js', root), bar = AU.$('[data-js-progress]', root), body = AU.$('[data-js-body]', root);
    var top = 0, span = 1;
    var measure = function () { top = K.top(body); span = Math.max(1, body.offsetHeight - window.innerHeight * .6); };
    var paint = function (y) { bar.style.transform = 'scaleX(' + AU.clamp((y - top + window.innerHeight * .3) / span, 0, 1).toFixed(4) + ')'; };
    var ro = new ResizeObserver(function () { measure(); paint(AU.scroll.y); }); ro.observe(art);
    var offS = AU.onScroll(paint);
    AU.$('[data-js-share]', root).addEventListener('click', function () { K.copy(K.absUrl('/journal/' + s.slug)); });
    signal.addEventListener('abort', function () { ro.disconnect(); offS(); });
  }

  /* =====================================================================================================
     ROUTES
     ===================================================================================================== */
  AU.ready(function () {
    if (!AU.router) return;
    K.route('/journal', {
      name: 'journal',
      title: function () { return T('metaTitle'); },
      description: function () { return T('metaDesc'); },
      jsonld: function () {
        return { '@context': 'https://schema.org', '@type': 'Blog', name: brand() + ' — ' + T('metaTitle'), description: T('metaDesc'), url: site() + '/journal',
          blogPost: stories().map(function (s) {
            return { '@type': 'BlogPosting', headline: s.title, description: s.standfirst, datePublished: s.date, url: site() + '/journal/' + s.slug };
          }) };
      },
      render: function (el, params, ctx) {
        el.innerHTML = indexHTML(false);
        K.prepHead(el);
        AU.reveal(el);
        K.hydrate(AU.$('[data-jr-list]', el), ctx.signal);
      }
    });
    K.route('/journal/:slug', {
      name: 'journal-story',
      title: function (p) { var s = bySlug(p.slug); return s ? s.title : T('metaTitle'); },
      description: function (p) { var s = bySlug(p.slug); return s ? s.standfirst : T('metaDesc'); },
      jsonld: function (p) {
        var s = bySlug(p.slug); if (!s) return null;
        var org = { '@type': 'Organization', name: brand(), url: site() + '/' };
        return { '@context': 'https://schema.org', '@type': 'Article', headline: s.title, description: s.standfirst,
          datePublished: s.date, dateModified: s.date, articleSection: s.kicker, inLanguage: AU.lang,
          wordCount: (s.body || []).join(' ').split(/\s+/).length, author: org, publisher: org,
          mainEntityOfPage: { '@type': 'WebPage', '@id': site() + '/journal/' + s.slug } };
      },
      render: function (el, params, ctx) {
        var s = bySlug(params.slug);
        if (!s) {
          // no soft 404: the journal itself, opening with a short note, and the address (and canonical) become its own
          el.innerHTML = indexHTML(true);
          K.prepHead(el);
          AU.reveal(el);
          K.hydrate(AU.$('[data-jr-list]', el), ctx.signal);
          setTimeout(function () {
            if (ctx.signal && ctx.signal.aborted) return;
            try {
              if (AU.router.setQuery) AU.router.setQuery('/journal');
              else AU.router.go('/journal', { replace: true });
            } catch (e) {}
          }, 0);
          return;
        }
        el.innerHTML = storyHTML(s);
        K.prepHead(el);
        AU.reveal(el);
        K.hydrate(el, ctx.signal);
        initStory(el, s, ctx.signal);
      }
    });
  });
})();
