/* ---- 70-tryon.js ---- */
/* Aurelia — try-on (idea 1): see a ring or a bracelet on your own hand, through your camera.
   AU.tryon.open(productIdOrSpec, opener?)   opens the #tryon overlay for a piece (a product id, a product, or a 3D spec
                                            such as the bespoke design). Any [data-tryon="<product id>"] control opens it
                                            too, and a route with ?tryon=<id> opens it on arrival (the "open in its own
                                            tab" link uses that).
   Views: intro (what it does, the privacy line, Allow camera) → live (the mirror: AUGL.tryOn) → photo; or fallback
   (camera blocked, missing or busy, the tracker unavailable, no WebGL): the piece drawn on a fine line-art hand with
   its still in a loupe, and a note to open the site in its own tab. The camera stops whenever the overlay closes.
   All words come from content (ui.tryon below). */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU) return;

  AU.extendContent({
    ui: {
      tryon: {
        eyebrow: 'Try on',
        dialog: 'Try on with your camera',
        kicker: 'The mirror',
        title: 'On your own hand',
        lede: 'See the piece on your hand, live, through your camera. Turn your hand slowly in the light and watch the stone answer.',
        steps: [
          'Allow the camera when your browser asks.',
          'Raise your hand, the back of it towards the screen.',
          'Turn it slowly, then take a photo to keep.'
        ],
        bracelet: 'Show your wrist, the back of your hand towards the screen.',
        privacy: 'The camera image never leaves your device.',
        allow: 'Allow camera',
        notNow: 'Not now',
        choose: 'Choose a piece',
        rings: 'Rings',
        bracelets: 'Bracelets',
        yourDesign: 'Your design',
        status: {
          camera: 'Waiting for the camera',
          model: 'Preparing the mirror',
          searching: 'Raise your hand, the back of it towards the camera',
          searchingWrist: 'Raise your hand and show your wrist',
          tracking: 'Turn your hand slowly in the light'
        },
        shutter: 'Take a photo',
        viewPiece: 'View the piece',
        close: 'Close',
        live: '{name}, on your hand, in the camera image',
        figure: 'A fine line drawing of a hand wearing {name}',
        photoKicker: 'Taken just now',
        photoTitle: 'Your photo',
        photoText: 'It is saved only if you choose to save it. Nothing is uploaded.',
        photoAlt: '{name}, on your hand',
        photoFile: 'aurelia-try-on',
        save: 'Save photo',
        retake: 'Back to the mirror',
        fallbackKicker: 'Try on',
        openTab: 'Open in its own tab',
        retry: 'Try again',
        fallback: {
          // blocked: the page is shown inside another page (an iframe), which may not use the camera
          blocked: { title: 'The camera is resting', text: 'This window could not open the camera; a page shown inside another page usually cannot. Open the site in its own tab and allow the camera when asked, and the piece will appear on your hand.' },
          // denied: in its own tab, the visitor (or the browser) declined the camera
          denied: { title: 'Camera declined', text: 'Camera access was declined for this site. Allow it from the camera icon in the address bar, or in the site settings, then try again. Here is the piece on a drawn hand in the meantime.' },
          none: { title: 'No camera found', text: 'Try on needs a camera facing you. On a phone, or a computer with a camera, it works right in your browser. Here is the piece on a drawn hand in the meantime.' },
          busy: { title: 'The camera is busy', text: 'Another application seems to be using the camera. Close it, then try again.' },
          failed: { title: 'The camera did not start', text: 'The camera could not be opened just now. Check that it is connected and allowed for this site, then try again.' },
          unsupported: { title: 'Not in this browser', text: 'Try on needs a current browser with camera access and 3D. Open the site in its own tab in an up-to-date browser to see the piece on your hand.' },
          unsupportedHere: { title: 'Not in this browser', text: 'Try on needs a current browser with camera access and 3D. In an up-to-date browser, on a phone or a computer with a camera, the piece appears on your hand. Here it is on a drawn hand in the meantime.' },
          model: { title: 'The mirror is not ready', text: 'The hand tracker could not be loaded. Check your connection and try again.' },
          ended: { title: 'The camera stopped', text: 'The camera was switched off or disconnected. Try again when it is back.' }
        }
      }
    }
  });

  /* integrator / translator: the fallback reasons added in v2 round 1 (denied, failed, unsupportedHere), so French and
     German stay complete; move them into 09-lang-*.js when convenient */
  if (AU.addLang) {
    AU.addLang('fr', { ui: { tryon: { fallback: {
      denied: { title: 'Caméra refusée', text: 'L’accès à la caméra a été refusé pour ce site. Autorisez-le depuis l’icône de caméra de la barre d’adresse, ou dans les réglages du site, puis réessayez. En attendant, voici la pièce sur une main dessinée.' },
      failed: { title: 'La caméra n’a pas démarré', text: 'La caméra n’a pas pu s’ouvrir. Vérifiez qu’elle est branchée et autorisée pour ce site, puis réessayez.' },
      unsupportedHere: { title: 'Pas dans ce navigateur', text: 'L’essayage demande un navigateur récent, avec accès à la caméra et à la 3D. Sur un téléphone ou un ordinateur équipé d’une caméra, la pièce apparaît sur votre main. En attendant, la voici sur une main dessinée.' }
    } } } });
    AU.addLang('de', { ui: { tryon: { fallback: {
      denied: { title: 'Kamera abgelehnt', text: 'Der Kamerazugriff wurde für diese Seite abgelehnt. Erlauben Sie ihn über das Kamerasymbol in der Adressleiste oder in den Website-Einstellungen und versuchen Sie es erneut. Bis dahin sehen Sie das Stück an einer gezeichneten Hand.' },
      failed: { title: 'Die Kamera startete nicht', text: 'Die Kamera ließ sich gerade nicht öffnen. Prüfen Sie, ob sie angeschlossen und für diese Seite erlaubt ist, und versuchen Sie es erneut.' },
      unsupportedHere: { title: 'Nicht in diesem Browser', text: 'Die Anprobe braucht einen aktuellen Browser mit Kamerazugriff und 3D. Auf einem Telefon oder einem Computer mit Kamera erscheint das Stück an Ihrer Hand. Bis dahin sehen Sie es an einer gezeichneten Hand.' }
    } } } });
  }

  var T = function (k, v) { return AU.t('ui.tryon.' + k, v); };
  var esc = AU.esc;

  /* ---------------- the drawn hand (fine line art) ----------------
     The back of a relaxed right hand, leaning a little towards the loupe, drawn as ONE continuous contour: it rises
     from the forearm on the thumb side, leaves the palm edge for the thumb in the lower third of the palm, runs round
     the thumb, sweeps through the web of skin to the index finger, round every finger (shallow, rounded webs between
     them; the finger bases sit on a gentle arc) and down the little-finger edge of the palm to the forearm again.
     The hand is measured in millimetres of a real adult hand (origin at the middle of the wrist crease, x towards the
     little finger, y towards the fingertips), each finger as a slightly curving axis with a tapering width that
     swells a touch at its joints; the contour runs through points on those edges and is smoothed with a centripetal
     Catmull-Rom spline, so it is tangent-continuous everywhere and never overshoots. */
  var W = 560, H = 640;
  var HAND = {
    S: 1.94,                 // drawing units per millimetre
    tilt: 12,                // degrees the hand leans towards the loupe (clockwise)
    origin: [166, 492],      // the middle of the wrist crease, in the drawing
    //       base (at the web, mm)  axis angle  length  width base / tip  curl (deg, + towards the little finger)
    index:  { b: [-28.6, 104], a: -5.5, L: 73, wb: 18, wt: 14.4, bend: 4 },
    middle: { b: [-8.6, 110],  a: -1,  L: 81, wb: 18.6, wt: 15, bend: 1 },
    ring:   { b: [11.4, 107],  a: 3.5, L: 76, wb: 17.6, wt: 14.2, bend: -2 },
    pinky:  { b: [29.4, 98.5], a: 9.5, L: 60, wb: 15.2, wt: 12.4, bend: -4 },
    thumb:  { b: [-22.5, 39],  a: -44, L: 73, wb: 22, wt: 17.4, bend: 15 }
  };
  var add = function (a, b) { return [a[0] + b[0], a[1] + b[1]]; };
  var sub = function (a, b) { return [a[0] - b[0], a[1] - b[1]]; };
  var mul = function (a, k) { return [a[0] * k, a[1] * k]; };
  var len = function (a) { return Math.hypot(a[0], a[1]); };
  var unit = function (a) { var l = len(a) || 1; return [a[0] / l, a[1] / l]; };
  var P = function (a) { return a[0].toFixed(1) + ' ' + a[1].toFixed(1); };
  var RAD = Math.PI / 180;
  var bump = function (t, m, s) { return Math.exp(-((t - m) / s) * ((t - m) / s)); };

  /* centripetal Catmull-Rom through the points, as cubic Béziers (an open path) */
  var spline = function (pts, segs) {
    var n = pts.length, out = 'M' + P(pts[0]);
    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      var d1 = Math.sqrt(len(sub(p1, p0))), d2 = Math.sqrt(len(sub(p2, p1))), d3 = Math.sqrt(len(sub(p3, p2)));
      var b1 = p1, b2 = p2;
      if (d1 > 1e-6) b1 = mul(add(sub(mul(p2, d1 * d1), mul(p0, d2 * d2)), mul(p1, 2 * d1 * d1 + 3 * d1 * d2 + d2 * d2)), 1 / (3 * d1 * (d1 + d2)));
      else b1 = add(p1, mul(sub(p2, p1), 1 / 3));
      if (d3 > 1e-6) b2 = mul(add(sub(mul(p1, d3 * d3), mul(p3, d2 * d2)), mul(p2, 2 * d3 * d3 + 3 * d3 * d2 + d2 * d2)), 1 / (3 * d3 * (d3 + d2)));
      else b2 = add(p2, mul(sub(p1, p2), 1 / 3));
      out += ' C' + P(b1) + ' ' + P(b2) + ' ' + P(p2);
      if (segs) segs.push([p1, b1, b2, p2]);
    }
    return out;
  };
  /* the same curve as a fine polyline (for finding where another line crosses it) */
  var polyOf = function (segs, steps) {
    var out = [segs[0][0]];
    segs.forEach(function (s) {
      for (var i = 1; i <= steps; i++) {
        var t = i / steps, u = 1 - t;
        out.push(add(add(mul(s[0], u * u * u), mul(s[1], 3 * u * u * t)), add(mul(s[2], 3 * u * t * t), mul(s[3], t * t * t))));
      }
    });
    return out;
  };
  /* a straight line from a to b, broken for a moment wherever it passes over the polyline (as in an engraving, a line
     that runs over another stops just short of it): returns a path of the pieces that remain */
  var brokenLine = function (a, b, poly, gap) {
    var d = sub(b, a), L = len(d), hits = [];
    for (var i = 0; i < poly.length - 1; i++) {
      var p = poly[i], r = sub(poly[i + 1], p), den = d[0] * r[1] - d[1] * r[0];
      if (Math.abs(den) < 1e-9) continue;
      var w = sub(p, a), t = (w[0] * r[1] - w[1] * r[0]) / den, u = (w[0] * d[1] - w[1] * d[0]) / den;
      if (t > 0 && t < 1 && u >= 0 && u <= 1) hits.push(t * L);
    }
    hits.sort(function (x, y) { return x - y; });
    var dir = mul(d, 1 / L), out = '', from = 0;
    hits.concat([L + gap]).forEach(function (h) {
      var to = Math.min(L, h - gap);
      if (to - from > 0.5) out += 'M' + P(add(a, mul(dir, from))) + ' L' + P(add(a, mul(dir, to))) + ' ';
      from = Math.max(from, h + gap);
    });
    return out.trim();
  };

  var handGeo = function (tilt) {
    var th = (tilt == null ? HAND.tilt : tilt) * RAD, cs = Math.cos(th), sn = Math.sin(th), S = HAND.S, O = HAND.origin;
    // millimetres (y up) -> drawing units (y down), turned by the tilt about the wrist
    var X = function (p) { return [O[0] + S * (p[0] * cs + p[1] * sn), O[1] - S * (-p[0] * sn + p[1] * cs)]; };
    var V = function (v) { return unit([v[0] * cs + v[1] * sn, -(-v[0] * sn + v[1] * cs)]); };
    var dirA = function (deg) { return [Math.sin(deg * RAD), Math.cos(deg * RAD)]; };

    var digit = function (name) {
      var f = HAND[name], thumb = name === 'thumb', N = 32, cen = [f.b], ang = [f.a];
      var angAt = function (t) { return f.a + f.bend * Math.pow(t, 1.6); };
      for (var i = 1; i <= N; i++) {
        var t0 = (i - 0.5) / N;
        cen.push(add(cen[i - 1], mul(dirA(angAt(t0)), f.L / N)));
        ang.push(angAt(i / N));
      }
      var c = function (t) { var x = Math.max(0, Math.min(1, t)) * N, i = Math.min(N - 1, Math.floor(x)), k = x - i; return add(mul(cen[i], 1 - k), mul(cen[i + 1], k)); };
      var a = function (t) { return angAt(Math.max(0, Math.min(1, t))); };
      var d = function (t) { return dirA(a(t)); };
      var nL = function (t) { var r = a(t) * RAD; return [-Math.cos(r), Math.sin(r)]; };
      var nR = function (t) { return mul(nL(t), -1); };
      // full width (mm): a gentle taper, the joints (thumb: its MCP and IP; fingers: PIP and DIP) swell a touch
      var w = thumb
        ? function (t) { return f.wt + (f.wb - f.wt) * Math.pow(1 - t, 1.5) + 1.1 * bump(t, 0.42, 0.08) + 0.7 * bump(t, 0.72, 0.06); }
        : function (t) { return f.wb + (f.wt - f.wb) * Math.pow(t, 0.9) + 0.75 * bump(t, 0.47, 0.07) + 0.45 * bump(t, 0.76, 0.06); };
      var edge = function (t, s) { return add(c(t), mul(nL(t), s * w(t) / 2)); };   // s = 1 left, -1 right
      var tc = 1 - (f.wt * 0.5) / f.L;                                                // where the rounded tip begins
      var cap = function () {
        // a slightly squared dome, from the left edge over the tip to the right edge (ends excluded)
        var out = [], cc = c(tc), rx = w(tc) / 2, ry = f.L * (1 - tc), dd = d(tc), rr = nR(tc), ex = thumb ? 0.96 : 0.88;
        [0.8, 0.6, 0.4, 0.2].forEach(function (u) {
          var ph = u * Math.PI, co = Math.cos(ph), si = Math.sin(ph);
          out.push(add(cc, add(mul(rr, rx * Math.sign(co) * Math.pow(Math.abs(co), ex)), mul(dd, ry * Math.pow(si, ex)))));
        });
        return out;
      };
      return { f: f, c: c, d: d, nL: nL, nR: nR, w: w, edge: edge, tc: tc, cap: cap };
    };
    var F = {};
    ['thumb', 'index', 'middle', 'ring', 'pinky'].forEach(function (n) { F[n] = digit(n); });

    var pts = [];
    var push = function (p) { pts.push(p); };
    var up = function (g, from) { [from || 0, 0.16, 0.32, 0.47, 0.62, 0.76, 0.88, g.tc].forEach(function (t) { if (t <= g.tc && t >= (from || 0)) push(g.edge(t, 1)); }); };
    var tip = function (g) { g.cap().forEach(push); };
    var down = function (g, to) { [g.tc, 0.88, 0.76, 0.62, 0.47, 0.32, 0.16, to || 0].forEach(function (t) { if (t <= g.tc && t >= (to || 0)) push(g.edge(t, -1)); }); };
    // a web between two fingers: the two sides come down almost together and turn in a small round U (never a V)
    var web = function (a, b) {
      var pa = a.edge(0, -1), pb = b.edge(0, 1), m = mul(add(pa, pb), 0.5), r = Math.max(0.8, len(sub(pb, pa)) / 2);
      var dn = unit(mul(add(a.d(0), b.d(0)), -1));
      push(add(add(pa, mul(dn, r * 0.72)), mul(sub(m, pa), 0.3)));
      push(add(m, mul(dn, r)));
      push(add(add(pb, mul(dn, r * 0.72)), mul(sub(m, pb), 0.3)));
    };
    var T = F.thumb;
    // the forearm and the wrist, thumb side, rising nearly straight; the thumb leaves the palm edge in its lower third
    [[-31.5, -54], [-30, -26], [-28.6, 0], [-29.6, 14]].forEach(push);
    up(T);
    tip(T);
    // the web of skin between the thumb and the index finger: the thumb's inner edge and the side of the index
    // knuckle meet in a V of about 30 degrees, rounded off with a fillet of skin
    var Ib = F.index.edge(0, 1), uA = unit([-0.13, 1]);            // up the side of the index metacarpal
    var tE = 0.5, pB = T.edge(tE, -1), uB = T.d(tE);               // up the thumb's inner edge
    var cr = uB[0] * uA[1] - uB[1] * uA[0];
    var s = ((Ib[0] - pB[0]) * uA[1] - (Ib[1] - pB[1]) * uA[0]) / cr;
    var I = add(pB, mul(uB, s));                                   // where the two edges would meet
    var half = Math.acos(Math.max(-1, Math.min(1, uA[0] * uB[0] + uA[1] * uB[1]))) / 2, rF = 4.2;
    var dT = rF / Math.tan(half), TB = add(I, mul(uB, dT)), TA = add(I, mul(uA, dT));
    var Cc = add(I, mul(unit(add(uA, uB)), rF / Math.sin(half)));
    var a0 = Math.atan2(TB[1] - Cc[1], TB[0] - Cc[0]), a1 = Math.atan2(TA[1] - Cc[1], TA[0] - Cc[0]);
    if (a1 - a0 > Math.PI) a1 -= 2 * Math.PI; else if (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
    var tTB = s / T.f.L + dT / T.f.L + tE;                         // the thumb station where the fillet begins
    [T.tc, 0.88, 0.76, 0.62, 0.5, 0.38].forEach(function (t) { if (t > tTB + 0.06 && t <= T.tc) push(T.edge(t, -1)); });
    push(TB);
    [0.25, 0.5, 0.75].forEach(function (u) { var an = a0 + (a1 - a0) * u; push(add(Cc, [Math.cos(an) * rF, Math.sin(an) * rF])); });
    push(TA);
    push(add(mul(add(TA, Ib), 0.5), mul([-uA[1], uA[0]], 0.6)));   // the index knuckle's side, the faintest swell
    up(F.index); tip(F.index); down(F.index);
    web(F.index, F.middle);
    up(F.middle); tip(F.middle); down(F.middle);
    web(F.middle, F.ring);
    up(F.ring); tip(F.ring); down(F.ring);
    web(F.ring, F.pinky);
    up(F.pinky); tip(F.pinky); down(F.pinky);
    // the little-finger edge of the palm, a long gentle curve, then the wrist and the forearm
    [[39.6, 81], [41.8, 60], [41, 37], [36.6, 15], [31.4, 0], [31.4, -26], [33, -54]].forEach(push);
    var spts = pts.map(X);
    var segs = [];
    var outline = spline(spts, segs);
    var poly = polyOf(segs, 10);

    // the quiet details, few and deliberate: the nails, one crease at each middle joint, the knuckle heads, and the
    // fold where the thumb meets the back of the hand
    var det = [];
    var arc = function (g, t, half, bow) {   // a short arc across the digit, bowing towards the tip (+) or the base (-)
      var p = g.c(t), a1 = add(p, mul(g.nL(t), half)), a2 = add(p, mul(g.nR(t), half)), m = add(p, mul(g.d(t), bow * 2));
      return 'M' + P(X(a1)) + ' Q' + P(X(m)) + ' ' + P(X(a2));
    };
    Object.keys(F).forEach(function (n) {
      var g = F[n], f = g.f, thumb = n === 'thumb';
      // the nail: its free edge just inside the fingertip, the cuticle bowing towards the base
      // (the thumb is seen a little from its side, so its nail is narrower and sits towards its outer edge)
      var nl = f.wt * (thumb ? 0.7 : 0.68), hw = f.wt * (thumb ? 0.27 : 0.31);
      var tTop = 1 - (f.wt * 0.14) / f.L, tBase = 1 - (f.wt * 0.14 + nl) / f.L;
      var shift = function (t) { return thumb ? mul(g.nL(t), f.wt * 0.1) : [0, 0]; };
      var top = add(g.c(tTop), shift(tTop)), base = add(g.c(tBase), shift(tBase)), dT = g.d(tTop), nT = g.nL(tTop), nB = g.nL(tBase);
      var bl = add(base, mul(nB, hw * 0.92)), br = sub(base, mul(nB, hw * 0.92));
      var tl = add(sub(top, mul(dT, hw * 0.55)), mul(nT, hw)), tr = sub(sub(top, mul(dT, hw * 0.55)), mul(nT, hw));
      var crest = add(top, mul(dT, hw * 0.42));
      det.push({ c: 'nail', d: 'M' + P(X(bl)) + ' L' + P(X(tl)) + ' Q' + P(X(add(crest, mul(nT, hw * 0.98)))) + ' ' + P(X(crest)) +
        ' Q' + P(X(sub(crest, mul(nT, hw * 0.98)))) + ' ' + P(X(tr)) + ' L' + P(X(br)) + ' Q' + P(X(sub(base, mul(g.d(tBase), hw * 0.5)))) + ' ' + P(X(bl)) });
      // one soft crease over the middle joint (the thumb: over its only joint)
      var tj = thumb ? 0.66 : 0.47;
      det.push({ c: 'crease', d: arc(g, tj, g.w(tj) * (thumb ? 0.2 : 0.22), 1) });
    });
    // the thumb's own line on the back of the hand: a short stroke from the web along its metacarpal
    var f0 = add(add(TB, mul(T.nL(0.36), 2.2)), mul(T.d(0.36), -3)), f1 = add(f0, add(mul(T.d(0.3), -13), mul(T.nR(0.3), 1.4)));
    det.push({ c: 'fold', d: 'M' + P(X(f0)) + ' Q' + P(X(add(mul(add(f0, f1), 0.5), mul(T.nR(0.25), 1.2)))) + ' ' + P(X(f1)) });

    // where things sit, for the jewelry and the guide
    var ring = F.ring;
    var R = {
      at: function (k) { return X(ring.c(k)); },
      d: function (k) { return V(ring.d(k)); },
      nR: function (k) { return V(ring.nR(k)); },
      w: function (k) { return ring.w(k) * S; }
    };
    var wrist = { c: X([1.2, -10]), axis: V([0, 1]), across: V([1, 0]), half: 31.5 * S, fadeFrom: X([0, -6]), fadeTo: X([0, -46]) };
    var box = spts.filter(function (p, i) { return pts[i][1] > -12; }).reduce(function (b, p) {
      return [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])];
    }, [1e9, 1e9, -1e9, -1e9]);
    return { F: F, ring: R, wrist: wrist, outline: outline, poly: poly, details: det, box: box, X: X };
  };
  var GEO = null, GUIDE = null;
  var geo = function () { return GEO || (GEO = handGeo()); };
  var guideGeo = function () { return GUIDE || (GUIDE = handGeo(0)); };

  /* material and stone colours: the swatches of content (gold and gems exist only in the jewelry) */
  var METAL = { yellow: ['#c9993f', '#f6dc9c', '#e2bc6c', '#f3d58b', '#b98a35'], rose: ['#c4826a', '#f5c9b3', '#da9d86', '#efc0a8', '#b2735c'], white: ['#9fa2a5', '#f4f4f2', '#c9cbcd', '#ecedee', '#8f9295'] };
  var STONE = {
    diamond: ['#ffffff', '#dfe8f0', '#9fb1c2'], ruby: ['#ff8a8a', '#b3121b', '#5c0408'], emerald: ['#9df0c0', '#13834a', '#063d22'],
    sapphire: ['#9db7ff', '#1c3fae', '#0a1a55'], amethyst: ['#e2c2ff', '#7b3fb8', '#3b1460'], aquamarine: ['#dffaff', '#7fd0e0', '#3d8ea3'],
    peridot: ['#efffb0', '#9dc13a', '#4f6b12'], citrine: ['#fff0b0', '#e3a52a', '#8a5a0c'], topaz: ['#e6f6ff', '#6fb6e8', '#2b6c9e'],
    garnet: ['#ff8c8c', '#8e1424', '#3c050c'], tourmaline: ['#ffc4dc', '#d2477e', '#6d1638'], tanzanite: ['#c9c6ff', '#4b45b8', '#1d1a5c'],
    pearl: ['#ffffff', '#f3ece6', '#cfc3bb'], opal: ['#ffffff', '#cfe9f2', '#d7c4ea']
  };

  var mixHex = function (a, b, k) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var ch = function (s) { var x = (pa >> s) & 255, y = (pb >> s) & 255; return Math.round(x + (y - x) * k); };
    return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
  };
  var bandPath = function (c, axis, across, half, h, bow) {
    // a strip across the finger (or wrist), its front edge bowing towards the base as seen a little from above
    var a1 = add(c, mul(across, -half)), a2 = add(c, mul(across, half));
    var c1 = sub(c, mul(axis, bow * 2));
    var t = mul(axis, h);
    return 'M' + P(a1) + ' Q' + P(c1) + ' ' + P(a2) + ' L' + P(add(a2, t)) + ' Q' + P(add(c1, t)) + ' ' + P(add(a1, t)) + ' Z';
  };

  /* the drawn hand with a piece on it, and the piece's still in a loupe beside it */
  var handSVG = function (piece, still) {
    var G = geo(), spec = piece.spec || {}, wrist = spec.type === 'bracelet';
    var m = METAL[spec.metal] || METAL.yellow, st = STONE[spec.stone] || STONE.diamond;
    var f = G.ring, KR = 0.27;
    var c, axis, across, half, h, bow;
    if (wrist) { c = G.wrist.c; axis = G.wrist.axis; across = G.wrist.across; half = G.wrist.half + 2; h = spec.style === 'tennis' ? 7 : 9; bow = 7; }
    else { c = f.at(KR); axis = f.d(KR); across = f.nR(KR); half = f.w(KR) / 2 + 1.2; h = spec.style === 'band' ? 7 : 6; bow = 3.2; }
    var g1 = add(c, mul(across, -half)), g2 = add(c, mul(across, half));
    var defs = '<defs>' +
      '<linearGradient id="tryon-metal" gradientUnits="userSpaceOnUse" x1="' + g1[0].toFixed(1) + '" y1="' + g1[1].toFixed(1) + '" x2="' + g2[0].toFixed(1) + '" y2="' + g2[1].toFixed(1) + '">' +
        '<stop offset="0" stop-color="' + m[4] + '"/><stop offset=".3" stop-color="' + m[1] + '"/><stop offset=".52" stop-color="' + m[2] + '"/><stop offset=".74" stop-color="' + m[3] + '"/><stop offset="1" stop-color="' + m[0] + '"/></linearGradient>' +
      '<radialGradient id="tryon-stone" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="' + st[0] + '"/><stop offset=".5" stop-color="' + st[1] + '"/><stop offset="1" stop-color="' + st[2] + '"/></radialGradient>' +
      // the forearm melts away below the wrist, along the hand's own axis, well clear of the caption: the contour's own
      // ink fades (a stroke gradient in the mode's colour; an SVG mask would cost a full-area raster on every frame of
      // the drawing's entrance)
      '<linearGradient id="tryon-ink" gradientUnits="userSpaceOnUse" x1="' + P(G.wrist.fadeFrom).replace(' ', '" y1="') + '" x2="' + P(G.wrist.fadeTo).replace(' ', '" y2="') + '">' +
        '<stop offset="0" style="stop-color:var(--fg)"/><stop offset=".55" style="stop-color:var(--fg);stop-opacity:.45"/><stop offset="1" style="stop-color:var(--fg);stop-opacity:0"/></linearGradient>' +
      '<clipPath id="tryon-clip"><circle cx="0" cy="0" r="84"/></clipPath>' +
      '</defs>';
    var lines = '<g><path class="th-line" pathLength="1" style="stroke:url(#tryon-ink)" d="' + G.outline + '"/>' +
      G.details.map(function (x, i) { return '<path class="th-det th-det--' + x.c + '" pathLength="1" style="--i:' + i + '" d="' + x.d + '"/>'; }).join('') + '</g>';

    // the piece, drawn in its metal: a band, and its stones as small jewels of colour
    var jewel = '<path class="th-band" d="' + bandPath(c, axis, across, half, h, bow) + '" fill="url(#tryon-metal)"/>';
    var mid = add(sub(c, mul(axis, bow)), mul(axis, h / 2));
    var gem = function (p, rw, rl, cls) {
      var ang = Math.atan2(axis[1], axis[0]) * 180 / Math.PI + 90;
      return '<ellipse class="th-gem ' + (cls || '') + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" rx="' + rw.toFixed(1) + '" ry="' + rl.toFixed(1) + '" transform="rotate(' + ang.toFixed(1) + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')" fill="url(#tryon-stone)"/>';
    };
    /* the centre stone seen from above: eight kite facets round an octagonal table, lit from the upper left, with a
       four-point glint that wakes now and then */
    var brilliant = function (p, rw, rl) {
      var pt = function (th, k) { return add(p, add(mul(across, Math.cos(th) * rw * k), mul(axis, Math.sin(th) * rl * k))); };
      var out = '<g class="th-gem th-gem--main">', n = 8, i;
      for (i = 0; i < n; i++) {
        var a0 = i / n * Math.PI * 2 + Math.PI / 8, a1 = (i + 1) / n * Math.PI * 2 + Math.PI / 8, am = (a0 + a1) / 2;
        var dir = add(mul(across, Math.cos(am)), mul(axis, Math.sin(am)));
        var lit = 0.5 + 0.5 * (dir[0] * -0.62 + dir[1] * -0.78);
        var k = Math.max(0, Math.min(1, (i % 2 ? 0.5 : 1.05) * (0.25 + lit * 0.85)));
        out += '<path d="M' + P(p) + ' L' + P(pt(a0, 1)) + ' L' + P(pt(a1, 1)) + ' Z" fill="' + mixHex(st[2], st[0], k) + '"/>';
      }
      var tbl = [];
      for (i = 0; i < n; i++) tbl.push(P(pt(i / n * Math.PI * 2, 0.56)));
      out += '<path class="th-table" d="M' + tbl.join(' L') + ' Z" fill="' + mixHex(st[1], st[0], 0.45) + '"/>';
      out += '<ellipse class="th-girdle" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" rx="' + rw.toFixed(1) + '" ry="' + rl.toFixed(1) + '" transform="rotate(' + (Math.atan2(axis[1], axis[0]) * 180 / Math.PI + 90).toFixed(1) + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')"/>';
      out += '</g>';
      var g = add(p, add(mul(across, rw * 0.55), mul(axis, rl * 0.62))), s = Math.max(5, rw * 1.05);
      out += '<path class="th-glint" d="M' + P([g[0], g[1] - s]) + ' Q' + P(g) + ' ' + P([g[0] + s, g[1]]) + ' Q' + P(g) + ' ' + P([g[0], g[1] + s]) + ' Q' + P(g) + ' ' + P([g[0] - s, g[1]]) + ' Q' + P(g) + ' ' + P([g[0], g[1] - s]) + ' Z"/>';
      return out;
    };
    if (wrist) {
      if (spec.style === 'tennis') {
        for (var i = -8; i <= 8; i++) {
          var k = i / 8.6, q = add(add(c, mul(across, k * half)), mul(axis, h / 2 - bow * 2 * (1 - k * k)));
          jewel += gem(q, 3.3, 3.3, 'th-gem--sm');
        }
      } else if (spec.stone) {
        if (spec.style === 'cuff') { [-1, 1].forEach(function (s) { jewel += gem(add(add(c, mul(across, s * 9)), mul(axis, h / 2 - bow * 2)), 5, 5.8); }); }
        else jewel += gem(add(mid, mul(axis, -bow)), 6.4, 7.6);
      }
    } else if (spec.type === 'ring' && spec.style !== 'band') {
      var ct = Math.cbrt(Math.max(0.15, +spec.carat || 1));
      var cut = spec.cut || 'round';
      var rw = 7.2 * ct, rl = rw * (cut === 'oval' ? 1.36 : cut === 'pear' ? 1.5 : cut === 'emerald' ? 1.4 : 1);
      var head = add(mid, mul(axis, 0.6));
      if (spec.style === 'eternity') {
        for (var j = -4; j <= 4; j++) { var kk = j / 4.6; jewel += gem(add(add(c, mul(across, kk * half)), mul(axis, h / 2 - bow * 2 * (1 - kk * kk))), 2.6, 2.6, 'th-gem--sm'); }
      } else {
        if (spec.style === 'halo') jewel += '<ellipse class="th-halo" cx="' + head[0].toFixed(1) + '" cy="' + head[1].toFixed(1) + '" rx="' + (rw + 3.6).toFixed(1) + '" ry="' + (rl + 3.6).toFixed(1) + '" transform="rotate(' + (Math.atan2(axis[1], axis[0]) * 180 / Math.PI + 90).toFixed(1) + ' ' + head[0].toFixed(1) + ' ' + head[1].toFixed(1) + ')"/>';
        if (spec.style === 'three-stone') [-1, 1].forEach(function (s) { jewel += gem(add(head, mul(across, s * (rw + 4.2))), rw * 0.62, rw * 0.62); });
        jewel += brilliant(head, rw, rl);
      }
    }

    // the loupe: a hairline from the piece to a circle holding the rendered still
    var L = [466, 196];
    var from = add(c, mul(across, half + 5));
    var dir = unit(sub(L, from));
    var to = sub(L, mul(dir, 92));
    var loupe = '<g class="th-loupe">' +
      // where the hairline passes over the contour it breaks for a moment, as in an engraving
      '<path class="th-lead" pathLength="1" d="' + brokenLine(from, to, G.poly, 4.5) + '"/>' +
      '<circle class="th-dot" cx="' + from[0].toFixed(1) + '" cy="' + from[1].toFixed(1) + '" r="2.2"/>' +
      '<g class="th-lens" transform="translate(' + L[0] + ' ' + L[1] + ')">' +
        '<circle class="th-well" r="84"/>' +
        (still ? '<image class="th-still" href="' + esc(still) + '" x="-84" y="-84" width="168" height="168" preserveAspectRatio="xMidYMid slice" clip-path="url(#tryon-clip)"/>' : '') +
        '<circle class="th-ring" r="92" pathLength="1"/><circle class="th-ring th-ring--in" r="84"/>' +
      '</g></g>';
    return '<svg class="tryon-hand" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(T('figure', { name: piece.name })) + '">' +
      defs + lines + '<g class="th-piece">' + jewel + '</g>' + loupe + '</svg>';
  };
  /* the guide in the live view: only the contour, dashed */
  var guideSVG = function () {
    // the upright hand, framed to the guide's own proportions (330 x 600), the forearm cut just below the wrist
    var g = guideGeo(), b = g.box, w = b[2] - b[0], h = b[3] - b[1], k = 330 / 600;
    var vw = Math.max(w, h * k) + 8, vh = vw / k, x = (b[0] + b[2]) / 2 - vw / 2, y = b[1] - 4;
    return '<svg viewBox="' + [x, y, vw, vh].map(function (v) { return v.toFixed(1); }).join(' ') + '" aria-hidden="true" focusable="false"><path d="' + g.outline + '"/></svg>';
  };

  /* icons this area needs, in the guide's outline style */
  var ICO = {
    camera: '<path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.6l1.6-2.2h5.6L16.4 7H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z"/><circle cx="12" cy="12.8" r="3.6"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15"/>'
  };
  var icon = function (n) { return '<svg class="ico" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICO[n] || '') + '</svg>'; };

  /* ---------------- pieces ---------------- */
  var wearable = function () {
    return (AU.content.products || []).filter(function (p) { return p.spec && (p.spec.type === 'ring' || p.spec.type === 'bracelet'); });
  };
  var sameSpec = function (a, b) {
    return a && b && ['type', 'style', 'metal', 'stone', 'cut'].every(function (k) { return (a[k] || null) === (b[k] || null); }) && Math.abs((+a.carat || 0) - (+b.carat || 0)) < 0.01;
  };
  var resolve = function (x) {
    if (!x) return wearable()[0] || null;
    if (typeof x === 'string') { var p = AU.product(x); return p && p.spec ? p : null; }
    if (x.spec && x.id) return x;
    var hit = wearable().find(function (p) { return sameSpec(p.spec, x); });
    // a product with the visitor's own choices on it (the ring size picked on the product page sizes the ring)
    if (hit) return Object.assign({}, hit, { spec: Object.assign({}, hit.spec, x) });
    return { id: 'custom', name: T('yourDesign'), price: null, spec: x, custom: true };
  };
  var kickerOf = function (p) {
    if (p.custom) return AU.t('ui.tryon.yourDesign');
    var c = (AU.content.collections || []).find(function (x) { return x.id === p.collection; });
    return c ? c.name : '';
  };

  /* ---------------- the overlay ---------------- */
  var root, panel, R = {};
  var S = { piece: null, custom: null, session: null, ctrl: null, view: 'intro', status: '', reason: '', photoUrl: null, thumbs: {}, stills: {}, opened: false, routeOpened: false, closeT: 0 };

  var q = function (s) { return root.querySelector(s); };
  var setView = function (v) {
    S.view = v;
    root.setAttribute('data-view', v);
    var live = v === 'live' || v === 'photo';
    R.sheet.toggleAttribute('inert', live);
    R.live.toggleAttribute('inert', v !== 'live');
    R.live.setAttribute('aria-hidden', live ? 'false' : 'true');
    R.photo.toggleAttribute('inert', v !== 'photo');
    R.photo.setAttribute('aria-hidden', v === 'photo' ? 'false' : 'true');
    AU.$$('[data-tryon-pane]', root).forEach(function (p) {
      var on = p.getAttribute('data-tryon-pane') === v;
      p.classList.toggle('is-on', on);
      p.toggleAttribute('inert', !on);
    });
  };

  var renderSteps = function () {
    var steps = T('steps');
    R.steps.innerHTML = (Array.isArray(steps) ? steps : []).map(function (s, i) {
      return '<li><span class="tryon__step-n num">' + (i + 1) + '</span><span>' + esc(s) + '</span></li>';
    }).join('');
  };

  var thumb = function (p, img) {
    var key = p.id + '|' + AU.getMode();
    if (S.thumbs[key]) { img.src = S.thumbs[key]; img.classList.add('is-in'); return; }
    S.thumbP = S.thumbP || {};
    (S.thumbP[key] = S.thumbP[key] || AU.img(p.spec, { size: 480 })).then(function (url) {
      if (!url) return;
      S.thumbs[key] = url;
      img.onload = function () { img.classList.add('is-in'); };
      img.src = url;
    }).catch(function () { /* the name stays */ });
  };
  var renderPieces = function () {
    var list = wearable();
    var groups = [];
    if (S.custom) groups.push({ label: T('yourDesign'), items: [S.custom] });
    var rings = list.filter(function (p) { return p.spec.type === 'ring'; });
    var bracelets = list.filter(function (p) { return p.spec.type === 'bracelet'; });
    if (rings.length) groups.push({ label: T('rings'), items: rings });
    if (bracelets.length) groups.push({ label: T('bracelets'), items: bracelets });
    AU.$$('[data-tryon-pieces]', root).forEach(function (box) {
      // the dock on a wide screen flanks the shutter: rings (and a design) to its left, bracelets to its right
      var which = box.getAttribute('data-tryon-pieces');
      var gs = which === 'dock-a' ? groups.filter(function (g) { return g.items !== bracelets; })
             : which === 'dock-b' ? groups.filter(function (g) { return g.items === bracelets; }) : groups;
      box.innerHTML = gs.map(function (g) {
        return '<div class="tryon__group" role="group" aria-label="' + esc(g.label) + '"><span class="caps caps--sm tryon__group-label" aria-hidden="true">' + esc(g.label) + '</span>' +
          '<div class="tryon__row">' + g.items.map(function (p) {
            return '<button class="tryon__pc" type="button" data-tryon-pick="' + esc(p.id) + '" aria-pressed="' + (S.piece && S.piece.id === p.id) + '" aria-label="' + esc(p.name) + '" title="' + esc(p.name) + '">' +
              '<img alt="" width="64" height="64" decoding="async"></button>';
          }).join('') + '</div></div>';
      }).join('');
      AU.$$('.tryon__pc', box).forEach(function (b) {
        var p = b.getAttribute('data-tryon-pick') === 'custom' ? S.custom : AU.product(b.getAttribute('data-tryon-pick'));
        if (p) thumb(p, b.querySelector('img'));
      });
    });
    requestAnimationFrame(markPicked);
  };
  var markPicked = function () {
    AU.$$('[data-tryon-pick]', root).forEach(function (b) {
      var on = !!S.piece && b.getAttribute('data-tryon-pick') === S.piece.id;
      b.setAttribute('aria-pressed', String(on));
      // keep the chosen piece in view in a row that scrolls (phones): glide it towards the middle
      var row = b.closest('.tryon__pieces');
      if (on && row && row.scrollWidth > row.clientWidth + 2 && row.offsetParent) {
        var x = b.offsetLeft - row.offsetLeft - (row.clientWidth - b.offsetWidth) / 2;
        try { row.scrollTo({ left: Math.max(0, x), behavior: AU.reduced ? 'auto' : 'smooth' }); } catch (e) { row.scrollLeft = x; }
      }
    });
  };

  /* the piece's name, kicker and price, everywhere they appear, with a soft swap */
  var fillInfo = function (soft) {
    var p = S.piece; if (!p) return;
    var apply = function () {
      AU.$$('[data-tryon-name]', root).forEach(function (el) { el.textContent = p.name; });
      AU.$$('[data-tryon-kicker]', root).forEach(function (el) { el.textContent = kickerOf(p); });
      AU.$$('[data-tryon-price]', root).forEach(function (el) { el.innerHTML = p.price != null ? AU.price(p.price) : ''; });
      R.view.hidden = !!p.custom;
      if (!p.custom) R.view.setAttribute('href', AU.router ? AU.router.href('/piece/' + p.id) : '#/piece/' + p.id);
    };
    if (!soft || AU.reduced) { apply(); return; }
    root.classList.add('is-swapping');
    setTimeout(function () { apply(); root.classList.remove('is-swapping'); }, 260);
  };

  /* the drawn hand, redrawn for the piece (the still arrives a moment later and is faded in) */
  var drawArt = function (animate) {
    var p = S.piece; if (!p) return;
    var key = p.id + '|' + AU.getMode();
    var paint = function (still) {
      R.art.classList.toggle('is-soft', !animate);
      if (animate) R.art.classList.remove('is-drawn');
      R.art.innerHTML = handSVG(p, still);
      if (animate) {
        void R.art.offsetWidth;   // the new lines start undrawn, then trace in
        requestAnimationFrame(function () { requestAnimationFrame(function () { R.art.classList.add('is-drawn'); }); });
      } else R.art.classList.add('is-drawn');
    };
    if (S.stills[key]) { paint(S.stills[key]); return; }
    paint(null);
    AU.img(p.spec, { size: 480 }).then(function (url) {
      if (!url || !S.piece || S.piece.id !== p.id) return;
      S.stills[key] = url;
      var lens = R.art.querySelector('.th-lens');
      if (!lens) return;
      var im = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      im.setAttribute('class', 'th-still');
      im.setAttribute('href', url);
      im.setAttribute('x', '-84'); im.setAttribute('y', '-84'); im.setAttribute('width', '168'); im.setAttribute('height', '168');
      im.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      im.setAttribute('clip-path', 'url(#tryon-clip)');
      lens.insertBefore(im, lens.querySelector('.th-ring'));
    }).catch(function () { /* the loupe stays empty, the drawing is whole */ });
  };

  var setStatus = function (s) {
    S.status = s;
    root.setAttribute('data-status', s || '');
    var wrist = S.piece && S.piece.spec.type === 'bracelet';
    var key = s === 'searching' && wrist ? 'searchingWrist' : s;
    R.status.textContent = s ? T('status.' + key) : '';
    R.shutter.disabled = !(s === 'tracking' || s === 'searching');
    if (s === 'ended') fallback('ended');
  };

  var pick = function (id) {
    var p = id === 'custom' ? S.custom : AU.product(id);
    if (!p || (S.piece && S.piece.id === p.id)) return;
    S.piece = p;
    markPicked();
    fillInfo(true);
    if (S.view === 'live') {
      if (S.session) S.session.setSpec(p.spec);
      if (S.status === 'searching') setStatus('searching');
    } else drawArt(false);
    if (AU.sound && AU.sound.play) AU.sound.play('tick');
  };

  var stopSession = function () {
    S.token = (S.token || 0) + 1;
    if (S.ctrl) { try { S.ctrl.abort(); } catch (e) { /* ignore */ } S.ctrl = null; }
    if (S.session) { try { S.session.dispose(); } catch (e) { console.error(e); } S.session = null; }
    R.stage.classList.remove('is-on');
    R.stage.innerHTML = '';
  };

  /* is this page shown inside another page? (a cross-origin parent throws on access: framed too) */
  var isFramed = function () { try { return window.top !== window.self; } catch (e) { return true; } };
  /* the browser's own error name (e.reason, from AUGL.tryOn) -> what the visitor is told. Only a framed page is told
     to open the site in its own tab; in its own tab a refusal is a refusal, and a missing camera is a missing camera. */
  var reasonOf = function (e) {
    var code = e && (e.code || e.message);
    var r = e && e.reason;
    var framed = isFramed();
    if (code === 'camera') {
      if (r === 'NotFoundError' || r === 'OverconstrainedError' || r === 'DevicesNotFoundError') return 'none';
      if (r === 'NotReadableError' || r === 'TrackStartError' || r === 'AbortError' || r === 'NoFrames') return 'busy';
      if (r === 'NotAllowedError' || r === 'PermissionDeniedError' || r === 'SecurityError') return framed ? 'blocked' : 'denied';
      return framed ? 'blocked' : 'failed';
    }
    if (code === 'model') return 'model';
    return framed ? 'unsupported' : 'unsupportedHere';
  };

  var fallback = function (why) {
    stopSession();
    S.reason = why;
    R.fbTitle.textContent = T('fallback.' + why + '.title');
    R.fbText.textContent = T('fallback.' + why + '.text');
    // "open in its own tab" helps only a page inside another page
    R.newtab.hidden = !(isFramed() && (why === 'blocked' || why === 'unsupported'));
    // without it, "Try again" is the one way forward and takes the solid button (unless trying again cannot help)
    R.retry.className = R.newtab.hidden && why !== 'unsupportedHere' ? 'btn btn--solid tryon__retry' : 'link caps caps--sm tryon__retry';
    try {
      var path = (AU.router && AU.router.current ? AU.router.current.path : '/') + '?tryon=' + encodeURIComponent(S.piece && !S.piece.custom ? S.piece.id : '1');
      R.newtab.href = new URL(AU.router ? AU.router.href(path) : '#' + path, location.href).href;
    } catch (e) { R.newtab.href = location.href; }
    setStatus('');
    setView('fallback');
    drawArt(true);
    // the heading is announced (it carries tabindex="-1" in the markup and shows no ring: it is not a control)
    setTimeout(function () { if (S.view === 'fallback' && AU.overlay.isOpen('tryon')) R.fbTitle.focus({ preventScroll: true }); }, 80);
  };

  var start = function () {
    if (S.session || S.ctrl) return;
    setView('live');
    setStatus('camera');
    S.ctrl = typeof AbortController === 'function' ? new AbortController() : { abort: function () {}, signal: null };
    var ctrl = S.ctrl, token = S.token = (S.token || 0) + 1;
    var startSpec = S.piece.spec;
    try { if (document.fonts && document.fonts.load) { document.fonts.load('64px "Alex Brush"'); document.fonts.load('300 18px "Cormorant Garamond"'); } } catch (e) { /* ignore */ }
    AU.gl.then(function (gl) {
      if (ctrl !== S.ctrl) throw Object.assign(new Error('aborted'), { code: 'aborted' });
      if (!gl || typeof gl.tryOn !== 'function') throw Object.assign(new Error('unsupported'), { code: 'unsupported' });
      return gl.tryOn(R.stage, {
        spec: S.piece.spec,
        label: T('live', { name: S.piece.name }),
        signal: ctrl.signal,
        onStatus: function (s) { if (token === S.token) setStatus(s); }
      });
    }).then(function (session) {
      if (ctrl !== S.ctrl || token !== S.token || !AU.overlay.isOpen('tryon')) { session.dispose(); return; }
      S.session = session;
      S.ctrl = null;
      // the piece may have been changed while the camera was starting
      if (S.piece && S.piece.spec !== startSpec) session.setSpec(S.piece.spec);
      R.stage.classList.add('is-on');
    }).catch(function (e) {
      if (ctrl !== S.ctrl) return;
      S.ctrl = null;
      if (e && (e.code === 'aborted' || e.message === 'aborted')) return;
      if (e && !e.code) console.error('[try-on]', e);
      fallback(reasonOf(e));
    });
  };

  /* ---------------- the photo ---------------- */
  var hexA = function (hex, a) {
    var h = String(hex || '').trim().replace('#', '');
    if (h.length !== 6) return 'rgba(0,0,0,' + a + ')';
    return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
  };
  var decorate = function (g, w, h) {
    var css = getComputedStyle(document.documentElement);
    var ink = css.getPropertyValue('--c-ink-dark') || '#1C0303', white = css.getPropertyValue('--c-white') || '#FFFFFF';
    var s = Math.max(w, h) / 1500;
    var top = h * 0.7;
    var grd = g.createLinearGradient(0, top, 0, h);
    grd.addColorStop(0, hexA(ink, 0)); grd.addColorStop(1, hexA(ink, 0.62));
    g.fillStyle = grd; g.fillRect(0, top, w, h - top);
    g.fillStyle = white.trim() || '#fff';
    g.textBaseline = 'alphabetic';
    g.font = Math.round(70 * s) + 'px "Alex Brush", cursive';
    g.fillText(AU.t('brand.name'), 56 * s, h - 82 * s);
    g.font = '300 ' + Math.round(18 * s) + 'px "Cormorant Garamond", serif';
    try { g.letterSpacing = (4.5 * s).toFixed(1) + 'px'; } catch (e) { /* older canvas */ }
    g.globalAlpha = 0.86;
    g.fillText(String(S.piece ? S.piece.name : '').toUpperCase(), 58 * s, h - 46 * s);
    g.globalAlpha = 1;
  };
  var shoot = function () {
    if (!S.session || !S.session.photo) return;
    root.classList.remove('is-flash'); void root.offsetWidth; root.classList.add('is-flash');
    if (AU.sound && AU.sound.play) AU.sound.play('paper');
    var frame = R.img.parentNode, shown = false;
    var show = function () {
      if (shown) return; shown = true;
      setTimeout(function () {
        setView('photo');
        setTimeout(function () { R.save.focus({ preventScroll: true }); }, 120);
      }, AU.reduced ? 0 : 300);
    };
    R.save.classList.add('is-wait');
    R.save.setAttribute('aria-disabled', 'true');
    S.session.photo({
      decorate: decorate,
      // the picture is shown the moment it exists; the file to save follows when it has been encoded
      onCanvas: function (c) {
        AU.$$('canvas', frame).forEach(function (x) { x.remove(); });
        c.className = 'tryon__photo-canvas';
        c.setAttribute('role', 'img');
        c.setAttribute('aria-label', T('photoAlt', { name: S.piece.name }));
        R.img.hidden = true;
        frame.appendChild(c);
        show();
      }
    }).then(function (blob) {
      if (S.photoUrl) URL.revokeObjectURL(S.photoUrl);
      S.photoUrl = URL.createObjectURL(blob);
      R.img.onload = function () { R.img.hidden = false; AU.$$('canvas', frame).forEach(function (x) { x.remove(); }); };
      R.img.src = S.photoUrl;
      R.img.alt = T('photoAlt', { name: S.piece.name });
      R.save.href = S.photoUrl;
      R.save.setAttribute('download', T('photoFile') + (S.piece.custom ? '' : '-' + S.piece.id) + '.png');
      R.save.classList.remove('is-wait');
      R.save.removeAttribute('aria-disabled');
      show();
    }).catch(function (e) { console.error('[try-on] photo', e); R.save.classList.remove('is-wait'); });
  };

  /* ---------------- open / close ---------------- */
  var open = function (x, opener) {
    if (!root) return;
    var p = resolve(x);
    if (!p) return;
    clearTimeout(S.closeT);
    S.custom = p.custom ? p : null;
    S.piece = p;
    renderSteps();
    renderPieces();
    fillInfo(false);
    if (!S.session && !S.ctrl) setView('intro');
    drawArt(true);
    root.removeAttribute('inert');
    AU.overlay.open('tryon', opener);
    // a visitor who has already allowed the camera goes straight to the mirror
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'camera' }).then(function (st) {
          if (st.state === 'granted' && AU.overlay.isOpen('tryon') && S.view === 'intro') start();
        }).catch(function () { /* not supported here */ });
      }
    } catch (e) { /* ignore */ }
  };

  var onClosed = function () {
    stopSession();
    setStatus('');
    root.classList.remove('is-flash');
    clearTimeout(S.closeT);
    // back to the intro once the overlay has faded away
    S.closeT = setTimeout(function () {
      if (AU.overlay.isOpen('tryon')) return;
      setView('intro');
      if (S.photoUrl) { URL.revokeObjectURL(S.photoUrl); S.photoUrl = null; R.img.removeAttribute('src'); }
    }, 800);
  };

  AU.tryon = {
    open: open,
    close: function () { AU.overlay.close('tryon'); },
    _state: function () { return { view: S.view, status: S.status, reason: S.reason, piece: S.piece && S.piece.id, session: S.session && S.session._debug ? S.session._debug() : null }; },
    _session: function () { return S.session; }
  };

  AU.ready(function () {
    root = document.getElementById('tryon');
    if (!root) return;
    panel = root.querySelector('.tryon__panel');
    R = {
      sheet: q('[data-tryon-sheet]'), live: q('[data-tryon-live]'), photo: q('[data-tryon-photo]'),
      art: q('[data-tryon-art]'), steps: q('[data-tryon-steps]'), stage: q('[data-tryon-stage]'), guide: q('[data-tryon-guide]'),
      status: q('[data-tryon-status]'), shutter: q('[data-tryon-shutter]'), view: q('[data-tryon-view]'),
      fbTitle: q('[data-tryon-fb-title]'), fbText: q('[data-tryon-fb-text]'), newtab: q('[data-tryon-newtab]'),
      img: q('[data-tryon-img]'), save: q('[data-tryon-save]'), retry: q('[data-tryon-retry]')
    };
    // closed, the overlay is inert: nothing in it can be reached by Tab or by a screen reader's swipe
    if (!AU.overlay.isOpen('tryon')) root.setAttribute('inert', '');
    AU.$$('[data-tryon-ico]', root).forEach(function (el) { el.outerHTML = icon(el.getAttribute('data-tryon-ico')); });
    R.guide.innerHTML = guideSVG();
    setView('intro');
    // one screen pixel in drawing units, so its hairlines stay 1px wide at any size
    var sw = function () { var w = R.art.clientWidth; if (w > 0) R.art.style.setProperty('--sw', (W / w).toFixed(3)); };
    if (window.ResizeObserver) new ResizeObserver(sw).observe(R.art);
    AU.on('overlay', function (d) { if (d && d.id === 'tryon' && d.open) sw(); });

    root.addEventListener('click', function (e) {
      var t = e.target;
      var b = t.closest('[data-tryon-pick]');
      if (b) { pick(b.getAttribute('data-tryon-pick')); return; }
      if (t.closest('[data-tryon-start]') || t.closest('[data-tryon-retry]')) { e.preventDefault(); stopSession(); start(); return; }
      if (t.closest('[data-tryon-shutter]')) { shoot(); return; }
      if (t.closest('[data-tryon-back]')) { setView('live'); setTimeout(function () { R.shutter.focus({ preventScroll: true }); }, 60); return; }
      if (t.closest('[data-tryon-view]')) {
        e.preventDefault();
        var id = S.piece && S.piece.id;
        AU.overlay.close('tryon');
        if (id && AU.router) AU.router.go('/piece/' + id);
        return;
      }
      if (t.closest('[data-tryon-newtab]')) {
        // the new tab opens the mirror there; this one goes quiet
        setTimeout(function () { AU.overlay.close('tryon'); }, 120);
      }
    });
    // Escape on the photo goes back to the mirror instead of closing everything
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && S.view === 'photo') { e.stopPropagation(); setView('live'); R.shutter.focus({ preventScroll: true }); }
    });

    AU.on('overlay', function (d) {
      if (!d || d.id !== 'tryon') return;
      if (d.open) { root.removeAttribute('inert'); return; }   // (also when opened by AU.overlay.open or [data-open])
      // closed: inert again at once (focus has already gone back to the opener). Core marks the overlays it made inert
      // behind another dialog and later lifts only those; this one is ours now, so it must never lift it.
      root.setAttribute('inert', ''); root.__auInert = false;
      onClosed();
    });
    AU.on('lang', function () {
      if (!AU.overlay.isOpen('tryon')) return;
      if (S.custom) S.custom.name = T('yourDesign');
      renderSteps(); renderPieces(); fillInfo(false); setStatus(S.status);
      if (S.view === 'fallback') { R.fbTitle.textContent = T('fallback.' + S.reason + '.title'); R.fbText.textContent = T('fallback.' + S.reason + '.text'); }
      if (S.view !== 'live' && S.view !== 'photo') drawArt(false);
    });
    AU.on('mode', function () { if (AU.overlay.isOpen('tryon')) { renderPieces(); if (S.view === 'intro' || S.view === 'fallback') drawArt(false); } });
    AU.on('route', function (d) {
      var want = d && d.query && d.query.tryon;
      if (!want || S.routeOpened) return;
      S.routeOpened = true;
      setTimeout(function () { open(want === '1' ? null : want); }, 400);
    });
  });

  // any control on the site can open the mirror: <button data-tryon="au-grace-solitaire">
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-tryon]');
    if (!b || (root && root.contains(b))) return;
    e.preventDefault();
    open(b.getAttribute('data-tryon') || null, b);
  });
})();
