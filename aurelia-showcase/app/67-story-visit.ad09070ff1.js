/* ---- 67-story-visit.js ---- */
/* Story: the private viewing ('/visit', idea 23). v1's booking, improved: places, a month calendar (keyboard: arrows,
   Home/End, PageUp/PageDown), times, reasons, fields, validation, a confirmation with a drawn seal.
   Booking adapter: AU.content.config.booking = { provider: 'preview' (default; validates, confirms, honest note,
   nothing sent) | 'endpoint' (POST JSON to .endpoint) | 'calendly' (opens .calendly in a new tab) }.
   Prefill: '#/visit?reason=bespoke&notes=…' (reason by id or label), '#/visit?piece=<id>' (the piece's name in the notes),
   and AU.emit('visit:prefill', { reason, notes }). '#/visit?at=contact' lands on the way to write or call.
   The draft is kept in sessionStorage (a language change re-renders the page without losing it); the confirmation
   offers an .ics file built on the page. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.storyKit) return;
  var K = AU.storyKit;
  var T = function (p, v) { return K.t('visit.' + p, v); };
  var pad2 = K.pad2;
  var VIDEO_ICON = '<svg class="ico" width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="2.5" y="6.5" width="13" height="11" rx="1.5"/><path d="M15.5 10.4 21.5 7v10l-6-3.4"/></svg>';
  var CLOSED = { atelier: [0, 1], video: [0] };     // days of the week (0 = Sunday) each place is closed (PLACEHOLDER)
  var hoursHTML = function (h) {
    var s = String(h || ''), i = s.search(/\d/);
    if (i < 0) return AU.esc(s);
    var days = s.slice(0, i).replace(/[,\s]+$/, ''), time = s.slice(i);
    return (days ? '<span class="vi__hdays">' + AU.esc(days) + '</span>' : '') + '<span class="num vi__htime">' + AU.esc(time) + '</span>';
  };
  var reasons = function () { return T('reasons') || []; };
  var weekdays = function () {   // Monday first, in the visitor's language
    var out = [];
    for (var d = 0; d < 7; d++) {
      try { out.push(new Intl.DateTimeFormat(K.locale(), { weekday: 'narrow' }).format(new Date(2026, 0, 5 + d))); } catch (e) { out.push('MTWTFSS'.charAt(d)); }
    }
    return out;
  };
  var dayWords = function (d) {
    try { return new Intl.DateTimeFormat(K.locale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(d); } catch (e) { return d.toDateString(); }
  };
  var monthWords = function (y, m) {
    try { return new Intl.DateTimeFormat(K.locale(), { month: 'long' }).format(new Date(y, m, 1)); } catch (e) { return String(m + 1); }
  };

  /* the places, with the atelier's address (content: visit.address, PLACEHOLDER) in place of its first line */
  var placesOf = function () {
    var V = AU.content.visit || {}, addr = V.address || [];
    return (V.places || []).map(function (pl) {
      if (pl.id !== 'atelier' || !addr.length) return pl;
      return Object.assign({}, pl, { lines: addr.concat((pl.lines || []).slice(1)), addr: addr.length });
    });
  };
  var telOf = function (p) { return String(p || '').replace(/[^\d+]/g, ''); };

  /* the way to write or call: beside the places (and where '#/visit?at=contact' leads) */
  function contactHTML() {
    var B = AU.content.brand || {}, C = function (k) { return K.t('common.contact.' + k); };
    if (!B.email && !B.phone) return '';
    return '<section class="vi__contact" id="contact" aria-labelledby="vi-contact-t" data-reveal="up">' +
      '<h2 class="caps caps--md vi__contact-t" id="vi-contact-t">' + AU.esc(C('title')) + '</h2>' +
      '<p class="small vi__contact-x">' + AU.nums(C('text')) + '</p>' +
      '<ul class="vi__contact-l">' +
        (B.email ? '<li><a class="vi__contact-a" href="mailto:' + AU.esc(B.email) + '">' + AU.icon('mail', { size: 18 }) +
          '<span class="vi__contact-k caps caps--sm">' + AU.esc(C('email')) + '</span><span class="vi__contact-v">' + AU.esc(B.email) + '</span></a></li>' : '') +
        (B.phone ? '<li><a class="vi__contact-a" href="tel:' + AU.esc(telOf(B.phone)) + '">' + AU.icon('phone', { size: 18 }) +
          '<span class="vi__contact-k caps caps--sm">' + AU.esc(C('call')) + '</span><span class="vi__contact-v num">' + AU.esc(B.phone) + '</span></a></li>' : '') +
      '</ul>' +
      /* labelled, so it never reads as a third schedule beside the two places above */
      '<p class="caps caps--sm vi__contact-h"><span class="vi__hlabel">' + AU.esc(C('hoursLabel')) + '</span>' +
        '<span class="vi__hval">' + hoursHTML(C('hours')) + '</span></p>' +
    '</section>';
  }

  function pageHTML() {
    var V = AU.content.visit || {}, places = placesOf();
    var field = function (key, inner, wide) { return '<div class="field' + (wide ? ' is-wide' : '') + '" data-vi-field="' + key + '">' + inner + '<p class="field__err vi__err" id="vi-err-' + key + '" aria-live="polite"></p></div>'; };
    var opt = ' <span class="vi__opt-note">' + AU.esc(T('optional')) + '</span>';
    return '<div class="sp vi">' +
      '<div class="wrap vi__grid">' +
        '<div class="vi__intro">' +
          K.head({ eyebrow: V.eyebrow, titleHTML: AU.nums(V.title || ''), lede: V.lede, cls: 'vi__headin', compact: true, bare: true }) +
          '<ul class="vi__places" data-stagger="140">' + places.map(function (pl) {
            var ico = pl.id === 'video' ? VIDEO_ICON : AU.icon('pin', { size: 26 });
            return '<li class="vi__place" data-reveal="up"><span class="vi__place-ico">' + ico + '</span>' +
              '<h2 class="caps caps--md vi__place-name">' + AU.nums(pl.name) + '</h2>' +
              '<p class="small vi__place-lines">' + (pl.lines || []).map(function (l, k) { return '<span' + (pl.addr && k < pl.addr ? ' class="vi__addr"' : '') + '>' + AU.nums(l) + '</span>'; }).join('') + '</p>' +
              '<p class="caps caps--sm vi__place-hours">' + hoursHTML(pl.hours) + '</p></li>';
          }).join('') + '</ul>' +
          contactHTML() +
        '</div>' +
        '<div class="vi__panel" data-vi-panel>' +
          '<form class="vi__form" data-vi-form novalidate aria-labelledby="vi-form-title" aria-describedby="vi-form-note">' +
            '<div class="vi__formhead"><h2 class="caps caps--md vi__formtitle" id="vi-form-title">' + AU.esc(T('formTitle')) + '</h2>' +
              '<p class="small" id="vi-form-note">' + AU.esc(T('formNote')) + '</p><p class="small vi__prefilled" data-vi-prefilled hidden></p></div>' +
            '<fieldset class="vi__step" data-vi-step="place" aria-describedby="vi-err-place"><legend class="vi__legend caps"><span class="num">01</span><span>' + AU.esc(T('where')) + '</span></legend>' +
              '<div class="vi__where">' + places.map(function (pl, i) {
                return '<label class="vi__opt"><input type="radio" name="vi-place" value="' + AU.esc(pl.id) + '"' + (i === 0 ? ' checked' : '') + '>' +
                  '<span class="vi__dot" aria-hidden="true"></span><span class="caps vi__opt-name">' + AU.nums(pl.name) + '</span>' +
                  '<span class="vi__opt-hours">' + AU.nums(pl.hours) + '</span></label>';
              }).join('') + '</div><p class="field__err vi__err" id="vi-err-place" aria-live="polite"></p></fieldset>' +
            '<fieldset class="vi__step" data-vi-step="date" aria-describedby="vi-cal-hint vi-err-date"><legend class="vi__legend caps"><span class="num">02</span><span>' + AU.esc(T('date')) + '</span></legend>' +
              /* the date's message sits under its legend, above the month: in view with the day that takes the focus */
              '<p class="field__err vi__err vi__err--top" id="vi-err-date" aria-live="polite"></p>' +
              '<div class="vi__cal"><div class="vi__cal-head"><div class="vi__cal-title"><p class="caps caps--md vi__month" data-vi-month aria-live="polite"></p>' +
                '<p class="small vi__cal-hint" id="vi-cal-hint" data-vi-hint></p></div>' +
                '<div class="vi__cal-nav"><button class="icon-btn vi__mbtn" type="button" data-vi-prev aria-label="' + AU.esc(T('prevMonth')) + '">' + AU.icon('arrowLeft', { size: 16 }) + '</button>' +
                '<button class="icon-btn vi__mbtn" type="button" data-vi-next aria-label="' + AU.esc(T('nextMonth')) + '">' + AU.icon('arrow', { size: 16 }) + '</button></div></div>' +
                '<div class="vi__week" aria-hidden="true">' + weekdays().map(function (d) { return '<span>' + AU.esc(d) + '</span>'; }).join('') + '</div>' +
                '<div class="vi__days" data-vi-days role="group" aria-label="' + AU.esc(T('chooseDay')) + '"></div></div></fieldset>' +
            '<fieldset class="vi__step" data-vi-step="time" aria-describedby="vi-err-time"><legend class="vi__legend caps"><span class="num">03</span><span>' + AU.esc(T('time')) + '</span></legend>' +
              '<div class="vi__times">' + (V.times || []).map(function (t) {
                return '<label class="chip"><input type="radio" name="vi-time" value="' + AU.esc(t) + '">' + AU.nums(t) + '</label>';
              }).join('') + '</div><p class="field__err vi__err" id="vi-err-time" aria-live="polite"></p></fieldset>' +
            '<fieldset class="vi__step vi__step--you"><legend class="vi__legend caps"><span class="num">04</span><span>' + AU.esc(T('you')) + '</span></legend>' +
              '<div class="vi__fields">' +
                field('reason', '<label class="caps caps--sm" for="vi-reason">' + AU.esc(T('reasonLabel')) + '</label><select id="vi-reason" name="reason" aria-describedby="vi-err-reason"><option value="">' + AU.esc(T('choose')) + '</option>' +
                  reasons().map(function (r) { return '<option value="' + AU.esc(r.id) + '">' + AU.esc(r.label) + '</option>'; }).join('') + '</select>', true) +
                field('name', '<label class="caps caps--sm" for="vi-name">' + AU.esc(T('name')) + '</label><input id="vi-name" name="name" type="text" autocomplete="name" aria-describedby="vi-err-name">') +
                field('email', '<label class="caps caps--sm" for="vi-email">' + AU.esc(T('email')) + '</label><input id="vi-email" name="email" type="email" autocomplete="email" inputmode="email" aria-describedby="vi-err-email">') +
                field('phone', '<label class="caps caps--sm" for="vi-phone">' + AU.esc(T('phone')) + opt + '</label><input id="vi-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="vi-err-phone">', true) +
                '<div class="field is-wide" data-vi-field="notes"><label class="caps caps--sm" for="vi-notes">' + AU.esc(T('notes')) + opt + '</label><textarea id="vi-notes" name="notes" rows="3" placeholder="' + AU.esc(T('notesPh')) + '"></textarea></div>' +
              '</div></fieldset>' +
            '<div class="vi__submit"><p class="vi__summary" data-vi-summary aria-live="polite"></p>' +
              '<button class="btn btn--solid vi__send" type="submit"><span data-vi-sendlabel>' + AU.esc(T('send')) + '</span>' + AU.icon('arrow', { size: 16 }) + '</button></div>' +
            '<p class="field__err vi__err vi__senderr" data-vi-senderr aria-live="assertive"></p>' +
          '</form>' +
          '<div class="vi__done" data-vi-done tabindex="-1" aria-hidden="true" aria-labelledby="vi-done-title">' +
            '<svg class="vi__seal" viewBox="0 0 72 72" aria-hidden="true" focusable="false"><circle class="vi__seal-ring" cx="36" cy="36" r="34.5"/>' +
              '<path class="vi__seal-star" d="M36 18c.9 9.4 5.6 14.1 15 15-9.4.9-14.1 5.6-15 15-.9-9.4-5.6-14.1-15-15 9.4-.9 14.1-5.6 15-15Z"/></svg>' +
            '<h2 class="script t-h2 vi__done-title" id="vi-done-title">' + AU.esc(T('done.title')) + '</h2>' +
            '<dl class="vi__recap" data-vi-recap></dl>' +
            '<p class="body vi__done-line" data-vi-doneline>' + AU.esc(T('done.line')) + '</p>' +
            '<p class="small vi__done-note" data-vi-donenote></p>' +
            '<div class="vi__done-acts">' +
              '<a class="btn vi__ics" data-vi-ics href="#" download="' + AU.esc(T('done.calendarFile')) + '.ics">' + AU.icon('calendar', { size: 16 }) + '<span>' + AU.esc(T('done.calendar')) + '</span></a>' +
              '<button class="link caps caps--sm vi__again" type="button" data-vi-again>' + AU.esc(T('done.again')) + AU.icon('arrow', { size: 14 }) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* the draft survives a language change (the page re-renders) and a reload, for this session only */
  var DRAFT = 'aurelia:visit-draft';
  var readDraft = function () { try { return JSON.parse(sessionStorage.getItem(DRAFT)) || null; } catch (e) { return null; } };
  var writeDraft = function (d) { try { if (d) sessionStorage.setItem(DRAFT, JSON.stringify(d)); else sessionStorage.removeItem(DRAFT); } catch (e) {} };
  /* a confirmation shown moments ago is shown again (in the new language) when the page re-renders for a language change */
  var lastDone = null;

  /* a small calendar file, built here (nothing is fetched or sent) */
  function icsOf(b) {
    var esc = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1'); };
    var p = String(b.date).split('-'), t = String(b.time || '10:00').split(':');
    var start = new Date(+p[0], +p[1] - 1, +p[2], +t[0] || 10, +t[1] || 0), end = new Date(start.getTime() + 60 * 60000);
    var stamp = function (d) { return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + pad2(d.getMinutes()) + '00'; };
    var now = new Date(), utc = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var B = AU.content.brand || {};
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + esc(B.name || 'Aurelia') + '//Private viewing//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', 'UID:' + stamp(start) + '-' + Math.random().toString(36).slice(2, 10) + '@aurelia', 'DTSTAMP:' + utc,
      'DTSTART:' + stamp(start), 'DTEND:' + stamp(end),
      'SUMMARY:' + esc(T('done.calendarTitle', { brand: B.name || 'Aurelia' })),
      'LOCATION:' + esc(b.location), 'DESCRIPTION:' + esc([b.reason, B.email, B.phone].filter(Boolean).join('\n')),
      'END:VEVENT', 'END:VCALENDAR'];
    return lines.join('\r\n') + '\r\n';
  }

  function init(root, query, signal, dir) {
    var V = AU.content.visit || {}, places = placesOf();
    var $ = function (s) { return AU.$(s, root); };
    var panel = $('[data-vi-panel]'), form = $('[data-vi-form]'), doneEl = $('[data-vi-done]'), daysEl = $('[data-vi-days]');
    var reasonSel = $('#vi-reason'), nameIn = $('#vi-name'), emailIn = $('#vi-email'), phoneIn = $('#vi-phone'), notesIn = $('#vi-notes');
    var summaryEl = $('[data-vi-summary]'), sendErr = $('[data-vi-senderr]'), sendBtn = $('.vi__send');
    var submitted = false, selDate = null, sending = false, timers = [];
    var later = function (fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; };

    var placeVal = function () { var r = AU.$('input[name="vi-place"]:checked', form); return r ? r.value : ''; };
    var placeName = function (id) { var pl = places.find(function (x) { return x.id === id; }); return pl ? pl.name : ''; };
    var timeVal = function () { var r = AU.$('input[name="vi-time"]:checked', form); return r ? r.value : ''; };
    var reasonLabel = function (id) { var r = reasons().find(function (x) { return x.id === id; }); return r ? r.label : id; };

    /* --- the draft: kept as the visitor types, restored on a re-render --- */
    var saveT = 0;
    function snapshot() {
      return { place: placeVal(), date: selDate ? iso(selDate) : '', time: timeVal(), reason: reasonSel.value,
        name: nameIn.value, email: emailIn.value, phone: phoneIn.value, notes: notesIn.value };
    }
    function save() {
      if (panel.classList.contains('is-done')) return;
      clearTimeout(saveT);
      saveT = setTimeout(function () {
        var d = snapshot(), first = places[0] && places[0].id;
        var empty = !d.date && !d.time && !d.reason && !d.name && !d.email && !d.phone && !d.notes && d.place === first;
        writeDraft(empty ? null : d);
      }, 160);
    }
    function restore(d) {
      if (!d) return;
      var r = d.place && AU.$('input[name="vi-place"][value="' + CSS.escape(d.place) + '"]', form); if (r) r.checked = true;
      if (d.date) {
        var p = String(d.date).split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2]);
        if (bookable(dt)) { selDate = dt; viewM = mkey(dt); }
      }
      var t = d.time && AU.$('input[name="vi-time"][value="' + CSS.escape(d.time) + '"]', form);
      if (t) { t.checked = true; t.closest('.chip').classList.add('is-on'); }
      if (d.reason) {
        if (!AU.$('option[value="' + CSS.escape(d.reason) + '"]', reasonSel)) { var o = document.createElement('option'); o.value = d.reason; o.textContent = d.reason; reasonSel.appendChild(o); }
        reasonSel.value = d.reason;
      }
      nameIn.value = d.name || ''; emailIn.value = d.email || ''; phoneIn.value = d.phone || ''; notesIn.value = d.notes || '';
    }
    form.addEventListener('input', save);
    form.addEventListener('change', save);
    /* the notes grow with what is written (the field has no resize grip: drawing the grip compiled a GPU shader the
       moment the form first scrolled into view, a 55 ms frame; see .vi__fields textarea in 60-story.css) */
    function grow() {
      if (!notesIn) return;
      notesIn.style.height = 'auto';
      var h = notesIn.scrollHeight + (notesIn.offsetHeight - notesIn.clientHeight);
      notesIn.style.height = Math.max(h, 0) + 'px';
    }
    if (notesIn) notesIn.addEventListener('input', grow);

    /* --- calendar: bookable from tomorrow for eight weeks --- */
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var first = new Date(today); first.setDate(today.getDate() + 1);
    var lastD = new Date(first); lastD.setDate(first.getDate() + 55);
    var iso = function (d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
    var mkey = function (d) { return d.getFullYear() * 12 + d.getMonth(); };
    var minM = mkey(first), maxM = mkey(lastD), viewM = minM;
    var monthEl = $('[data-vi-month]'), prevBtn = $('[data-vi-prev]'), nextBtn = $('[data-vi-next]');
    var dayBtns = [];
    var addDays = function (d, n) { var x = new Date(d); x.setDate(d.getDate() + n); return x; };
    var same = function (a, b) { return !!a && !!b && a.getTime() === b.getTime(); };
    var inWindow = function (d) { return d >= first && d <= lastD; };
    var isClosed = function (d) { var c = CLOSED[placeVal()] || [0]; return c.indexOf(d.getDay()) >= 0; };
    var bookable = function (d) { return inWindow(d) && !isClosed(d); };
    var dateOf = function (b) { var p = b.getAttribute('data-date').split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };

    function renderMonth(dir) {
      var y = Math.floor(viewM / 12), m = viewM % 12;
      var lead = (new Date(y, m, 1).getDay() + 6) % 7, count = new Date(y, m + 1, 0).getDate(), cells = '';
      for (var b = 0; b < lead; b++) cells += '<span class="vi__blank" aria-hidden="true"></span>';
      for (var k = 1; k <= count; k++) cells += '<button type="button" class="vi__day" data-date="' + iso(new Date(y, m, k)) + '" aria-pressed="false" tabindex="-1"><span class="vi__day-n">' + k + '</span></button>';
      daysEl.innerHTML = cells;
      dayBtns = AU.$$('.vi__day', daysEl);
      monthEl.innerHTML = AU.esc(monthWords(y, m)) + ' <span class="num">' + y + '</span>';
      prevBtn.setAttribute('aria-disabled', viewM <= minM ? 'true' : 'false');
      nextBtn.setAttribute('aria-disabled', viewM >= maxM ? 'true' : 'false');
      if (dir && !AU.reduced) {
        daysEl.classList.remove('is-from-next', 'is-from-prev'); void daysEl.offsetWidth;
        daysEl.classList.add(dir > 0 ? 'is-from-next' : 'is-from-prev');
      }
      paintDays();
    }
    function rove() {
      var t = dayBtns.find(function (b) { return same(dateOf(b), selDate) && bookable(selDate); }) || dayBtns.find(function (b) { return bookable(dateOf(b)); });
      dayBtns.forEach(function (b) { b.tabIndex = b === t ? 0 : -1; });
    }
    function paintDays() {
      dayBtns.forEach(function (b) {
        var d = dateOf(b), out = !inWindow(d), closed = !out && isClosed(d);
        b.classList.toggle('is-out', out); b.classList.toggle('is-closed', closed);
        b.setAttribute('aria-disabled', out || closed ? 'true' : 'false');
        b.setAttribute('aria-pressed', same(d, selDate) ? 'true' : 'false');
        b.setAttribute('aria-label', dayWords(d) + (closed ? ', ' + T('closedDay') : out ? ', ' + T('notAvailable') : ''));
      });
      $('[data-vi-hint]').textContent = T(placeVal() === 'video' ? 'closedSun' : 'closedSunMon');
      rove();
    }
    function showMonth(m, dir) { m = Math.max(minM, Math.min(maxM, m)); if (m === viewM) return false; viewM = m; renderMonth(dir); return true; }
    function pickDay(d) { if (!bookable(d)) return; selDate = d; paintDays(); setErr('date', ''); summary(); save(); }
    function focusDate(d) { var b = dayBtns.find(function (x) { return same(dateOf(x), d); }); if (!b) return; dayBtns.forEach(function (x) { x.tabIndex = x === b ? 0 : -1; }); b.focus(); }
    prevBtn.addEventListener('click', function () { if (prevBtn.getAttribute('aria-disabled') !== 'true') showMonth(viewM - 1, -1); });
    nextBtn.addEventListener('click', function () { if (nextBtn.getAttribute('aria-disabled') !== 'true') showMonth(viewM + 1, 1); });
    daysEl.addEventListener('click', function (e) { var b = e.target.closest('.vi__day'); if (b) pickDay(dateOf(b)); });
    daysEl.addEventListener('keydown', function (e) {
      var b = e.target.closest('.vi__day'); if (!b) return;
      var d = dateOf(b), step = 0;
      if (e.key === 'ArrowRight') step = 1; else if (e.key === 'ArrowLeft') step = -1;
      else if (e.key === 'ArrowDown') step = 7; else if (e.key === 'ArrowUp') step = -7;
      else if (e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown') {
        e.preventDefault();
        if (e.key === 'PageUp' || e.key === 'PageDown') showMonth(viewM + (e.key === 'PageDown' ? 1 : -1), e.key === 'PageDown' ? 1 : -1);
        var open = dayBtns.filter(function (x) { return bookable(dateOf(x)); });
        if (open.length) focusDate(dateOf(e.key === 'End' ? open[open.length - 1] : open[0]));
        return;
      } else return;
      e.preventDefault();
      var dir = step > 0 ? 1 : -1, n = addDays(d, step);
      while (inWindow(n) && isClosed(n)) n = addDays(n, dir);
      if (!inWindow(n)) return;
      if (mkey(n) !== viewM) showMonth(mkey(n), dir);
      focusDate(n);
    });
    AU.$$('input[name="vi-place"]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        var note = '';
        if (selDate != null && isClosed(selDate)) { note = T('closedThere'); selDate = null; }
        paintDays(); setErr('place', '');
        if (note) setErr('date', note, true);
        summary();
      });
    });
    AU.$$('input[name="vi-time"]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        AU.$$('.vi__times .chip', form).forEach(function (c) { c.classList.toggle('is-on', c.querySelector('input').checked); });
        setErr('time', ''); summary();
      });
    });

    /* --- the live summary beside the button --- */
    var lastSum = null;
    function summary() {
      var parts = [];
      if (selDate != null) parts.push(dayWords(selDate));
      if (timeVal()) parts.push(timeVal());
      if (placeVal()) parts.push(placeVal() === 'video' ? T('byVideo') : T('at', { place: placeName(placeVal()) }));
      var txt = selDate != null || timeVal() ? parts.join(', ') : '';
      if (txt === lastSum) return;
      lastSum = txt;
      summaryEl.innerHTML = txt ? '<span class="vi__sum-in">' + AU.nums(txt.charAt(0).toUpperCase() + txt.slice(1)) + '</span>' : '<span class="is-empty">' + AU.esc(T('summaryEmpty')) + '</span>';
    }

    /* --- validation --- */
    var errEl = function (key) { return AU.$('#vi-err-' + key, root); };
    var youStep = $('.vi__step--you');
    var holder = function (key) { return AU.$('[data-vi-step="' + key + '"]', root) || AU.$('[data-vi-field="' + key + '"]', root); };
    function setErr(key, msg, isNote) {
      var el = errEl(key), h = holder(key);
      if (el) { el.textContent = msg || ''; el.classList.toggle('is-note', !!isNote); }
      if (h) h.classList.toggle('is-bad', !!msg && !isNote);
      if (youStep) youStep.classList.toggle('is-bad', !!AU.$('.vi__fields .field.is-bad', root));
      var ctl = { reason: reasonSel, name: nameIn, email: emailIn, phone: phoneIn }[key];
      if (ctl) { if (msg && !isNote) ctl.setAttribute('aria-invalid', 'true'); else ctl.removeAttribute('aria-invalid'); }
    }
    var CHECKS = {
      place: function () { return placeVal() ? '' : T('errors.place'); },
      date: function () { return selDate != null ? '' : T('errors.date'); },
      time: function () { return timeVal() ? '' : T('errors.time'); },
      reason: function () { return reasonSel.value ? '' : T('errors.reason'); },
      name: function () { return nameIn.value.trim().length > 1 ? '' : T('errors.name'); },
      email: function () {
        var v = emailIn.value.trim();
        if (!v) return T('errors.emailEmpty');
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : T('errors.email');
      },
      phone: function () {
        var v = phoneIn.value.trim();
        if (!v) return '';
        if (/[^\d\s()+.\-]/.test(v)) return T('errors.phoneChars');
        return v.replace(/\D/g, '').length >= 7 ? '' : T('errors.phoneShort');
      }
    };
    var ORDER = ['place', 'date', 'time', 'reason', 'name', 'email', 'phone'];
    function check(key) { var m = CHECKS[key](); setErr(key, m); return !m; }
    function focusKey(key) {
      var el;
      if (key === 'place') el = AU.$('input[name="vi-place"]:checked', form) || AU.$('input[name="vi-place"]', form);
      else if (key === 'date') el = AU.$('.vi__day[tabindex="0"]', daysEl) || dayBtns[0];
      else if (key === 'time') el = AU.$('input[name="vi-time"]', form);
      else el = { reason: reasonSel, name: nameIn, email: emailIn, phone: phoneIn }[key];
      if (!el) return;
      /* the step comes into view with its legend, its message and the control together, never a ring with no reason */
      var h = holder(key) || el, r = h.getBoundingClientRect(), head = K.headH(), vh = window.innerHeight;
      var msg = errEl(key), mb = msg && msg.textContent ? msg.getBoundingClientRect().bottom : r.top, eb = el.getBoundingClientRect().bottom;
      if (r.top < head + 16 || r.top > vh * .7 || Math.max(mb, eb) > vh - 24) K.scrollTo(window.scrollY + r.top - head - 40);
      el.focus({ preventScroll: true });
    }
    [['reason', reasonSel], ['name', nameIn], ['email', emailIn], ['phone', phoneIn]].forEach(function (pair) {
      pair[1].addEventListener('blur', function () { if (submitted) check(pair[0]); });
      pair[1].addEventListener(pair[1].tagName === 'SELECT' ? 'change' : 'input', function () { if (submitted && holder(pair[0]).classList.contains('is-bad')) check(pair[0]); });
    });

    /* --- sending, through the booking adapter --- */
    var cfg = (AU.content.config && AU.content.config.booking) || { provider: 'preview' };
    function payload() {
      return { place: placeVal(), placeName: placeName(placeVal()), date: iso(selDate), time: timeVal(), reason: reasonSel.value, reasonLabel: reasonLabel(reasonSel.value),
        name: nameIn.value.trim(), email: emailIn.value.trim(), phone: phoneIn.value.trim(), notes: notesIn.value.trim(), lang: AU.lang };
    }
    function setSending(on) {
      sending = on;
      sendBtn.disabled = on; sendBtn.classList.toggle('is-sending', on);
      $('[data-vi-sendlabel]').textContent = T(on ? 'sending' : 'send');
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      submitted = true;
      sendErr.textContent = '';
      var bad = ORDER.filter(function (k) { return !check(k); });
      if (bad.length) { focusKey(bad[0]); return; }
      var p = cfg.provider || 'preview';
      if (p === 'calendly' && cfg.calendly) {
        try { window.open(cfg.calendly, '_blank', 'noopener'); } catch (er) {}
        showDone('calendly');
      } else if (p === 'endpoint' && cfg.endpoint) {
        setSending(true);
        fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload()) })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); setSending(false); showDone('sent'); })
          .catch(function () {
            setSending(false);
            sendErr.textContent = T('errors.send', { email: (AU.content.brand && AU.content.brand.email) || '' });
          });
      } else showDone('preview');
    });

    /* --- the confirmation: the form crossfades out and the panel eases to its new height (one measured step) --- */
    function resize(target, after) {
      var cs = getComputedStyle(panel);
      var extra = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      var h0 = panel.offsetHeight, h1 = target.offsetHeight + extra;
      if (AU.reduced) { panel.style.height = after === 'clear' ? '' : h1 + 'px'; return; }
      panel.classList.remove('is-sizing');
      panel.style.height = h0 + 'px'; void panel.offsetHeight;
      panel.classList.add('is-sizing');
      panel.style.height = h1 + 'px';
      clearTimeout(panel.__t);
      panel.__t = later(function () { panel.classList.remove('is-sizing'); if (after === 'clear') panel.style.height = ''; }, 950);
    }
    var icsUrl = null, icsA = $('[data-vi-ics]');
    function setIcs() {
      if (!icsA) return;
      var pl = placeVal(), addr = V.address || [];
      var loc = pl === 'video' ? placeName(pl) + ' (' + T('byVideo') + ')' : [placeName(pl)].concat(addr).join(', ');
      try {
        if (icsUrl) URL.revokeObjectURL(icsUrl);
        icsUrl = URL.createObjectURL(new Blob([icsOf({ date: iso(selDate), time: timeVal(), location: loc, reason: reasonLabel(reasonSel.value) })], { type: 'text/calendar;charset=utf-8' }));
        icsA.href = icsUrl; icsA.hidden = false;
      } catch (e) { icsA.hidden = true; }
    }
    function showDone(kind, instant) {
      var rows = [[T('done.rows.where'), placeName(placeVal())], [T('done.rows.when'), dayWords(selDate)], [T('done.rows.time'), timeVal()], [T('done.rows.reason'), reasonLabel(reasonSel.value)]];
      $('[data-vi-recap]').innerHTML = rows.map(function (r, k) { return '<div style="--i:' + k + '"><dt>' + AU.esc(r[0]) + '</dt><dd>' + AU.nums(r[1]) + '</dd></div>'; }).join('');
      $('[data-vi-doneline]').textContent = kind === 'calendly' ? T('done.calendly') : T('done.line');
      $('[data-vi-donenote]').textContent = kind === 'preview' ? T('done.preview') : '';
      setIcs();
      lastDone = { kind: kind, values: snapshot(), t: Date.now() };
      clearTimeout(saveT); writeDraft(null);
      if (instant) panel.classList.add('is-instant');
      panel.classList.add('is-done');
      doneEl.setAttribute('aria-hidden', 'false'); form.setAttribute('aria-hidden', 'true');
      if ('inert' in form) form.inert = true;
      if (instant) {
        var cs = getComputedStyle(panel);
        panel.style.height = (doneEl.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)) + 'px';
        requestAnimationFrame(function () { requestAnimationFrame(function () { panel.classList.remove('is-instant'); }); });
        return;
      }
      resize(doneEl);
      var r = panel.getBoundingClientRect(), head = K.headH();
      if (r.top < head) K.scrollTo(window.scrollY + r.top - head - 24);
      doneEl.focus({ preventScroll: true });
      if (AU.sound) { try { AU.sound.play('chime'); } catch (er) {} }
      later(function () { var t = $('.vi__done-title'); if (t && AU.sparkleAt) AU.sparkleAt(t, { count: 12, spread: 110 }); }, AU.reduced ? 0 : 1100);
    }
    function resetForm(focusIt) {
      lastDone = null; clearTimeout(saveT); writeDraft(null);
      form.reset();
      if (notesIn) notesIn.style.height = '';
      selDate = null; submitted = false; lastSum = null; sendErr.textContent = '';
      ORDER.forEach(function (k) { setErr(k, ''); });
      AU.$$('.vi__times .chip', form).forEach(function (c) { c.classList.remove('is-on'); });
      var firstOpt = AU.$('input[name="vi-place"]', form); if (firstOpt) firstOpt.checked = true;
      viewM = minM; renderMonth(0); summary();
      panel.classList.remove('is-done');
      doneEl.setAttribute('aria-hidden', 'true'); form.removeAttribute('aria-hidden');
      if ('inert' in form) form.inert = false;
      resize(form, 'clear');
      if (focusIt && firstOpt) later(function () { firstOpt.focus({ preventScroll: true }); }, 400);
    }
    $('[data-vi-again]').addEventListener('click', function () { resetForm(true); });
    var onResize = function () {
      if (panel.classList.contains('is-done') && !panel.classList.contains('is-sizing')) {
        var cs = getComputedStyle(panel);
        panel.style.height = (doneEl.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + 2) + 'px';
      }
    };
    window.addEventListener('resize', onResize);

    /* --- prefill: the reason (by id or label) and notes; the changed fields glow once --- */
    function flash(field) {
      var run = function () { field.classList.remove('is-flash'); void field.offsetWidth; field.classList.add('is-flash'); later(function () { field.classList.remove('is-flash'); }, 1900); };
      var io = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); later(run, 250); }
      }, { threshold: 0.6 });
      io.observe(field);
      later(function () { io.disconnect(); }, 8000);
    }
    function prefill(d) {
      d = d || {};
      var did = false;
      if (panel.classList.contains('is-done')) resetForm(false);
      if (d.reason) {
        var want = String(d.reason).toLowerCase();
        var r = reasons().find(function (x) { return x.id === want || x.label.toLowerCase() === want; });
        if (!r) { var o = document.createElement('option'); o.value = d.reason; o.textContent = d.reason; reasonSel.appendChild(o); reasonSel.value = d.reason; }
        else reasonSel.value = r.id;
        setErr('reason', ''); flash(holder('reason')); did = true;
      }
      if (d.notes != null && d.notes !== '') { notesIn.value = String(d.notes).slice(0, 600); grow(); flash(holder('notes')); did = true; }
      var pf = $('[data-vi-prefilled]');
      if (did) { pf.textContent = T('prefilled'); pf.hidden = false; }
    }
    var offPrefill = AU.on('visit:prefill', prefill);

    /* the intro (head, places, the way to write) is held beside the form only while it fits the screen */
    var intro = $('.vi__intro');
    var fit = function () {
      if (!intro) return;
      var free = intro.offsetHeight + K.headH() + 56 > window.innerHeight;
      intro.classList.toggle('is-free', free);
    };
    var ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null;
    if (ro && intro) ro.observe(intro);
    window.addEventListener('resize', fit);

    var back = dir === 'force' && lastDone && Date.now() - lastDone.t < 30 * 60000 ? lastDone : null;
    if (back) restore(back.values);
    else { lastDone = null; restore(readDraft()); }
    renderMonth(0);
    if (notesIn && notesIn.value) grow();
    AU.$$('.vi__times .chip', form).forEach(function (c) { c.classList.toggle('is-on', c.querySelector('input').checked); });
    summary();
    if (back) showDone(back.kind, true);
    else {
      var piece = query && query.piece && AU.product ? AU.product(query.piece) : null;
      if (query && (query.reason || query.notes || piece)) prefill({ reason: query.reason, notes: query.notes || (piece && !notesIn.value ? piece.name : '') });
    }
    signal.addEventListener('abort', function () {
      offPrefill(); window.removeEventListener('resize', onResize); window.removeEventListener('resize', fit); if (ro) ro.disconnect();
      timers.forEach(clearTimeout); clearTimeout(panel.__t);
      // a draft still being typed is kept
      if (saveT) { clearTimeout(saveT); if (!panel.classList.contains('is-done')) { var d = snapshot(); if (d.date || d.time || d.reason || d.name || d.email || d.phone || d.notes) writeDraft(d); } }
      if (icsUrl) { var u = icsUrl; setTimeout(function () { URL.revokeObjectURL(u); }, 60000); }
    });
  }

  AU.ready(function () {
    if (!AU.router) return;
    K.route('/visit', {
      name: 'visit',
      title: function () { return T('metaTitle'); },
      description: function () { return T('metaDesc'); },
      jsonld: function () {
        var C = AU.content, B = C.brand || {}, site = ((C.config && C.config.siteUrl) || '').replace(/\/$/, '');
        return { '@context': 'https://schema.org', '@type': 'JewelryStore', name: B.name || 'Aurelia', url: site + '/visit', email: B.email, telephone: B.phone,
          foundingDate: String(B.since || 1984), description: T('metaDesc'),
          openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '10:00', closes: '18:00' }],
          potentialAction: { '@type': 'ReserveAction', target: site + '/visit', name: T('formTitle') } };
      },
      render: function (el, params, ctx) {
        el.innerHTML = pageHTML();
        K.prepHead(el);
        AU.reveal(el);
        init(el, ctx.query || {}, ctx.signal, ctx.dir);
      }
    });
  });
})();
