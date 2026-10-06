/* ---- 02-content-bespoke.js ---- */
/* Bespoke area content (v2): the ring configurator (/bespoke), the ring size finder (/size), the stack builder (/stack)
   and the gem lab (/gem-lab). English base; translations override the same structure (AU.addLang).
   PLACEHOLDER: every price, rate and factor here is placeholder, written to show the design. The ring size chart follows
   the common US / UK / EU (ISO circumference) conversion and should be checked against Aurelia's own mandrels. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.extendContent) return;

  /* ---------- the ring size chart: US size, UK letter, EU (inner circumference, mm), inner diameter (mm) ----------
     Inner diameter d = 11.63 + 0.8128 × US (mm); circumference = π × d. */
  var chart = [
    [3, 'F', '44'], [3.5, 'G', '45½'], [4, 'H', '47'], [4.5, 'I', '48'], [5, 'J½', '49'], [5.5, 'K½', '50½'],
    [6, 'L½', '52'], [6.5, 'M½', '53'], [7, 'N½', '54½'], [7.5, 'O½', '55½'], [8, 'P½', '57'], [8.5, 'Q½', '58'],
    [9, 'R½', '59½'], [9.5, 'S½', '61'], [10, 'T½', '62'], [10.5, 'U½', '63½'], [11, 'V½', '64½'], [11.5, 'W½', '66'],
    [12, 'Y', '67']
  ].map(function (r) {
    var d = 11.63 + 0.8128 * r[0];
    return { us: r[0], uk: r[1], eu: r[2], d: Math.round(d * 10) / 10, c: Math.round(Math.PI * d * 10) / 10 };
  });

  AU.extendContent({
    bespoke: {
      /* Every stone the house offers. group 'main': shown first in the configurator; 'more': behind "More stones"
         (offered only when the 3D kit can draw them); 'lab': the gem lab only. perCarat: PLACEHOLDER rate in USD. */
      stones: [
        { id: 'diamond', label: 'Diamond', plural: 'Diamonds', group: 'main', perCarat: 3400, swatch: 'radial-gradient(circle at 35% 30%,#fff,#dfe8f0 45%,#9fb1c2)' },
        { id: 'ruby', label: 'Ruby', plural: 'Rubies', group: 'main', perCarat: 2100, swatch: 'radial-gradient(circle at 35% 30%,#ff8a8a,#b3121b 50%,#5c0408)' },
        { id: 'emerald', label: 'Emerald', plural: 'Emeralds', group: 'main', perCarat: 2300, swatch: 'radial-gradient(circle at 35% 30%,#9df0c0,#13834a 50%,#063d22)' },
        { id: 'sapphire', label: 'Sapphire', plural: 'Sapphires', group: 'main', perCarat: 1900, swatch: 'radial-gradient(circle at 35% 30%,#9db7ff,#1c3fae 50%,#0a1a55)' },
        { id: 'amethyst', label: 'Amethyst', plural: 'Amethysts', group: 'more', perCarat: 260, swatch: 'radial-gradient(circle at 35% 30%,#e3c4ff,#7b3fb8 50%,#3a1460)' },
        { id: 'aquamarine', label: 'Aquamarine', plural: 'Aquamarines', group: 'more', perCarat: 620, swatch: 'radial-gradient(circle at 35% 30%,#f0fdff,#8fd3e0 48%,#3f8ea3)' },
        { id: 'garnet', label: 'Garnet', plural: 'Garnets', group: 'more', perCarat: 340, swatch: 'radial-gradient(circle at 35% 30%,#e9707a,#7e0f22 50%,#3a0510)' },
        { id: 'peridot', label: 'Peridot', plural: 'Peridots', group: 'more', perCarat: 380, swatch: 'radial-gradient(circle at 35% 30%,#efffb0,#9cc23a 50%,#4c6a12)' },
        { id: 'citrine', label: 'Citrine', plural: 'Citrines', group: 'more', perCarat: 220, swatch: 'radial-gradient(circle at 35% 30%,#fff3b8,#e8a925 50%,#93570a)' },
        { id: 'topaz', label: 'Topaz', plural: 'Topazes', group: 'more', perCarat: 420, swatch: 'radial-gradient(circle at 35% 30%,#e8f6ff,#6fb2e6 50%,#24609a)' },
        { id: 'tourmaline', label: 'Tourmaline', plural: 'Tourmalines', group: 'more', perCarat: 680, swatch: 'radial-gradient(circle at 35% 30%,#ffd0e2,#d4507f 50%,#6e1a3c)' },
        { id: 'tanzanite', label: 'Tanzanite', plural: 'Tanzanites', group: 'more', perCarat: 900, swatch: 'radial-gradient(circle at 35% 30%,#d9d2ff,#5a4bc4 50%,#241a66)' },
        { id: 'pearl', label: 'Pearl', plural: 'Pearls', group: 'lab', perCarat: 380, swatch: 'radial-gradient(circle at 35% 30%,#fff,#f1e9e1 50%,#c9b9ad)' },
        { id: 'opal', label: 'Opal', plural: 'Opals', group: 'lab', perCarat: 520, swatch: 'radial-gradient(circle at 35% 30%,#fdfcff,#b9e4f0 30%,#f2c9e6 55%,#9fd9b6 75%,#8aa3d8)' }
      ],
      /* engraving fonts: how each is drawn in the 2D preview (the 3D studio draws its own) */
      fonts: [
        { id: 'script', label: 'Script' },
        { id: 'serif', label: 'Serif' },
        { id: 'roman', label: 'Roman' }
      ],
      engraveMax: 18,
      lights: [
        { id: 'studio', label: 'Studio' },
        { id: 'daylight', label: 'Daylight' },
        { id: 'candle', label: 'Candlelight' },
        { id: 'evening', label: 'Evening' }
      ]
    },

    ringSizes: chart,

    /* ---------- gem lab: grades, their plain explanations and the PLACEHOLDER price indication ---------- */
    gemLab: {
      stones: {
        diamond: 'Pure carbon, the hardest thing in nature. Loved for its white light and its fire, the flashes of colour it throws.',
        ruby: 'Corundum coloured by a trace of chromium: the red of our house. Second only to diamond in hardness.',
        emerald: 'Green beryl, cut in long steps to calm the natural garden inside it. Softer, so we set it in protective claws.',
        sapphire: 'Corundum in every colour but red. The classic is a velvety cornflower blue that holds its colour by candlelight.',
        amethyst: 'Violet quartz, from pale lilac to deep royal purple. February’s stone.',
        aquamarine: 'Beryl the colour of sea water: clear, cool and luminous. March’s stone.',
        garnet: 'A warm wine red that glows by candlelight. January’s stone.',
        peridot: 'Olivine from deep inside the earth, a bright spring green. August’s stone.',
        citrine: 'Quartz in honey and late-afternoon yellow. November’s stone.',
        topaz: 'Clear and brilliant, here in a cool sky blue. November’s second stone.',
        tourmaline: 'A crystal that can hold every colour; ours is a soft rose pink. October’s stone.',
        tanzanite: 'Found in one valley in Tanzania: violet-blue that shifts as you turn it. December’s stone.',
        pearl: 'Grown, not cut: layer upon layer of nacre, with a soft inner glow called lustre. June’s stone.',
        opal: 'Silica that breaks light into moving flashes of colour, the play of colour. October’s stone.'
      },
      cuts: {
        round: 'Round brilliant: fifty-seven facets arranged for the most sparkle of any cut.',
        oval: 'Oval: a brilliant stretched long, so the stone looks larger for its weight and lengthens the finger.',
        pear: 'Pear: round at one end, pointed at the other, like a falling drop. Worn point towards the nail.',
        emerald: 'Emerald (step) cut: long, calm facets like still water. Less sparkle, more depth and clarity.',
        cushion: 'Cushion: a soft square with rounded corners, the antique cut, with large, slow flashes.'
      },
      uncut: 'Pearls and opals are not faceted: they are shown as they are grown or polished, round or as a smooth cabochon.',
      caratText: 'A carat is a fifth of a gram. At {ct} ct a round stone measures about {mm} mm across.',
      caratTextOpal: 'Opals are weighed in carats, a fifth of a gram each. At {ct} ct a round cabochon measures about {mm} mm across.',
      /* PEARLS are graded on their own scales: size in millimetres (not carats), colour, and lustre with surface */
      pearl: {
        mm: { min: 6, max: 11.5, step: .5, initial: 9 },
        // the size explanation for the chosen diameter (the first band whose max it does not exceed)
        size: [
          { max: 7.5, text: 'Pearls are measured across, not weighed. {mm} mm is a classic Akoya size, the pearl of the fine single strand.' },
          { max: 9.5, text: 'Pearls are measured across, not weighed. At {mm} mm: a generous Akoya, or a Tahitian or South Sea pearl.' },
          { max: 99, text: 'Pearls are measured across, not weighed. Only South Sea and Tahitian pearls grow to {mm} mm, and each millimetre above ten is rarer.' }
        ],
        // best first, as clarity is
        lustre: [
          { id: 'Excellent', cap: 'Excellent lustre', text: 'Mirror-bright: you can read a window in its skin. The surface is clean to the eye, perhaps one tiny mark.' },
          { id: 'Very good', cap: 'Very good lustre', text: 'Bright, with sharp reflections and a soft glow beneath them. A few small marks, hard to find when worn.' },
          { id: 'Good', cap: 'Good lustre', text: 'A softer, satin glow with blurred reflections. Some marks you can see when you look for them.' }
        ]
      },
      /* OPALS: weighed in carats, but graded by body tone and by the brilliance of their play of colour */
      opal: {
        brilliance: [
          { id: 'Brilliant', cap: 'Brilliant fire', text: 'The play of colour blazes in any light, even across a room. The rarest grade.' },
          { id: 'Bright', cap: 'Bright fire', text: 'Vivid flashes indoors and out, clear in daylight and lamplight alike.' },
          { id: 'Moderate', cap: 'Moderate fire', text: 'Colour that shows well in good light and quietens in shade.' },
          { id: 'Subdued', cap: 'Subdued fire', text: 'A gentle shimmer of colour: lovely up close, softer from a distance.' }
        ]
      },
      /* diamonds: GIA letters D–K (colourless → faint warmth) */
      colourD: [
        { id: 'D', text: 'Absolutely colourless: the top of the scale, ice white and rare.' },
        { id: 'E', text: 'Colourless. Only a grader, side by side with a master stone, can tell it from a D.' },
        { id: 'F', text: 'Colourless to the eye, and nearly so under the loupe. The last of the colourless grades.' },
        { id: 'G', text: 'Near colourless. It faces up white; a whisper of warmth shows only from the side.' },
        { id: 'H', text: 'Near colourless, and a favourite of ours in yellow and rose gold, where any warmth disappears.' },
        { id: 'I', text: 'Near colourless with a soft warmth in larger stones. Lovely value.' },
        { id: 'J', text: 'A hint of warmth you can see in a bigger stone. Beautiful in yellow gold.' },
        { id: 'K', text: 'A faint, warm tint, the look of an old-mine diamond. Best in yellow gold.' }
      ],
      /* coloured stones: tone, light → deep */
      colourS: [
        { id: 'Light', text: 'Pale and luminous. Lively in any light, and the most forgiving of inclusions.' },
        { id: 'Medium light', text: 'Fresh and clear, with colour you notice from across a table.' },
        { id: 'Medium', text: 'The balance most graders call ideal: saturated, without darkening.' },
        { id: 'Medium deep', text: 'Rich, velvety colour, the tone most sought after in ruby and sapphire.' },
        { id: 'Deep', text: 'Dark and dramatic. By candlelight it can read almost black.' }
      ],
      clarity: [
        { id: 'FL', name: 'Flawless', text: 'Nothing inside or on the surface, even at ten times magnification. Fewer than one stone in a hundred.' },
        { id: 'IF', name: 'Internally flawless', text: 'Nothing inside at ten times magnification; only the faintest surface marks, which polishing removes.' },
        { id: 'VVS1', name: 'Very, very slightly included', text: 'Minute inclusions that a skilled grader can barely find under the loupe.' },
        { id: 'VVS2', name: 'Very, very slightly included', text: 'Minute inclusions, very difficult to see at ten times.' },
        { id: 'VS1', name: 'Very slightly included', text: 'Small inclusions, hard to find under the loupe and invisible to the eye.' },
        { id: 'VS2', name: 'Very slightly included', text: 'Small inclusions a grader finds with some effort. Clean to the eye: our usual choice.' },
        { id: 'SI1', name: 'Slightly included', text: 'Inclusions you notice under the loupe; usually still clean to the eye.' },
        { id: 'SI2', name: 'Slightly included', text: 'Inclusions easy to see under the loupe, sometimes visible from the side.' },
        { id: 'I1', name: 'Included', text: 'Inclusions you can see with the eye. They can soften the brilliance.' }
      ],
      clarityNote: 'Coloured stones are judged by eye rather than by loupe; most emeralds hold a little garden inside, and that is expected.',
      colourPearl: [
        { id: 'White', text: 'Bright white with a rosy overtone: the classic South Sea and akoya colour.' },
        { id: 'Silver', text: 'A cool silver-white that sits beautifully in white gold.' },
        { id: 'Cream', text: 'A soft cream, warm against the skin and lovely in yellow gold.' },
        { id: 'Champagne', text: 'A pale gold, glowing in candlelight.' },
        { id: 'Golden', text: 'A deep golden pearl, the rarest and warmest of the South Seas.' }
      ],
      colourOpal: [
        { id: 'White', text: 'White opal: a milky body with soft pastel flashes.' },
        { id: 'Crystal', text: 'Crystal opal: clear enough to see into, the colour floating inside.' },
        { id: 'Grey', text: 'Grey opal: a smoky body that makes the colour stand out.' },
        { id: 'Dark', text: 'Dark opal: deep grey-blue, the flashes vivid against it.' },
        { id: 'Black', text: 'Black opal: the rarest, the play of colour blazing on near black.' }
      ],
      /* PLACEHOLDER price indication, rounded to the nearest $10.
         Cut stones: rate × carat^1.5 × colour × clarity × cut.
         Pearls: a price by diameter (a white South Sea pearl of very good lustre: 10 mm from about $1,200), × colour ×
         lustre. Opals: a rate per carat by body tone (bright fire) × carat^1.15 × brilliance. o.clarity is the index on
         the stone's own last scale (clarity, lustre or brilliance), best first. */
      factors: {
        colourD: [1.38, 1.27, 1.17, 1.0, .9, .8, .71, .62],
        colourS: [.62, .82, 1.0, 1.16, 1.04],
        clarity: [1.62, 1.46, 1.32, 1.21, 1.1, 1.0, .86, .73, .56],
        cut: { round: 1.08, oval: 1.0, pear: .97, emerald: .96, cushion: .95, cabochon: 1.0 },
        pearlMm: [[6, 180], [7, 290], [8, 480], [9, 780], [10, 1200], [11, 1850], [11.5, 2300]],
        pearlColour: [1.0, 1.0, .85, 1.05, 1.3],          // white, silver, cream, champagne, golden
        pearlLustre: [1.5, 1.0, .62],
        opalTone: [90, 260, 380, 900, 2200],              // per carat: white, crystal, grey, dark, black
        opalBrilliance: [1.9, 1.0, .55, .3]
      },
      price: function (o) {
        var L = AU.content.gemLab, f = L.factors, v;
        if (o.stone === 'pearl') {
          var t = f.pearlMm, mm = Math.max(t[0][0], Math.min(t[t.length - 1][0], +o.mm || 9)), i = 0;
          while (i < t.length - 2 && mm > t[i + 1][0]) i++;
          var k = (mm - t[i][0]) / (t[i + 1][0] - t[i][0]);
          var base = t[i][1] * Math.pow(t[i + 1][1] / t[i][1], k);      // eased between the steps of the table
          v = base * (f.pearlColour[o.colour] || 1) * (f.pearlLustre[o.clarity] || 1);
          return Math.max(150, Math.round(v / 10) * 10);
        }
        if (o.stone === 'opal') {
          v = (f.opalTone[o.colour] || 380) * Math.pow(o.carat, 1.15) * (f.opalBrilliance[o.clarity] || 1);
          return Math.max(120, Math.round(v / 10) * 10);
        }
        var st = (AU.content.bespoke.stones || []).find(function (s) { return s.id === o.stone; }) || { perCarat: 1000 };
        var col = o.stone === 'diamond' ? f.colourD[o.colour] : f.colourS[o.colour];
        v = st.perCarat * Math.pow(o.carat, 1.5) * (col || 1) * (f.clarity[o.clarity] || 1) * (f.cut[o.cut] || 1);
        return Math.max(10, Math.round(v / 10) * 10);
      },
      carat: { min: .25, max: 5, step: .05, initial: 1 },
      initial: { stone: 'diamond', cut: 'round', carat: 1, colour: 3, clarity: 5 }
    },

    /* ---------- stack builder ---------- */
    stack: { max: 3, styles: ['band', 'eternity', 'solitaire'] },

    ui: {
      bespoke: {
        meta: {
          bespoke: { title: 'Bespoke ring', description: 'Design your own ring with Aurelia: setting, metal, stone, cut, carat, size and a hand-engraved inscription, shown live in 3D.' },
          size: { title: 'Ring size finder', description: 'Find your ring size on screen in two minutes: calibrate with a bank card, measure a ring you own, or print a paper sizer.' },
          stack: { title: 'Stack builder', description: 'Stack up to three Aurelia rings on one finger, in 3D, and see the price of the set.' },
          lab: { title: 'Gem lab', description: 'Turn one stone in the light and change its cut, carat, colour and clarity, with a plain explanation of each grade.' }
        },
        /* the configurator */
        eyebrow: 'Bespoke',
        title: 'Design your ring',
        lede: 'Choose each part and watch your ring come together.',
        steps: { style: 'Setting', metal: 'Metal', stone: 'Stone', cut: 'Cut & carat', size: 'Size', engraving: 'Engraving' },
        next: 'Next: {step}',
        moreStones: 'More stones',
        fewerStones: 'Fewer stones',
        cut: 'Cut',
        carat: 'Carat',
        ct: 'ct',
        caratValue: '{ct} carats',
        eternityNote: 'An eternity ring is set all the way round with small, matched round stones, so there is no centre stone to cut or size.',
        eternityCut: 'Round, matched',
        cutEmerald: 'Emerald-cut',
        stoneSum: '{ct} ct {cut} {stone}',
        sizeDown: 'Half a size smaller',
        sizeUp: 'Half a size larger',
        allAround: 'All around',
        roundAllAround: 'Round {stones}, all around',
        sizeLabel: 'Ring size (US)',
        sizeUS: 'US {n}',
        sizeLine: 'UK {uk} · EU {eu} · {mm} mm across',
        sizeMeasured: 'Your measured size',
        findSize: 'Find your size',
        engravingLabel: 'Inscription',
        engravingPlaceholder: 'A name, a date…',
        engravingHint: 'Up to {n} characters, engraved by hand inside the band.',
        engravingFont: 'Lettering',
        engravingEmpty: 'Your words',
        engravingNone: 'No inscription',
        caption: 'Size {size}',
        stageLabel: 'Your bespoke ring: {summary}',
        dragHint: 'Drag to turn',
        loupe: 'Loupe',
        loupeOn: 'Close the loupe',
        reset: 'Reset view',
        light: 'Light',
        yourRing: 'Your ring',
        estimate: 'Estimate',
        add: 'Add to bag',
        added: 'Added',
        addedToast: '{name} added to your bag',
        consult: 'Book a consultation',
        note: 'An estimate for the design shown. Each commission is confirmed with you in person, stone by stone.',
        liveEstimate: '{summary}. Estimated price {price}.',
        ringName: 'Bespoke {style} Ring',
        cartMeta: '18k {metal} · {stone} · Size {size}',
        cartEngraved: ' · Engraved “{text}”',
        consultNotes: '{summary}, size {size}{engraving}. Estimate {price}.',
        consultEngraving: ', engraved “{text}”',

        /* ring size finder */
        size: {
          eyebrow: 'Client care',
          title: 'Find your size',
          lede: 'Two minutes, a bank card and a ring that fits you. Or print a paper sizer, or read the chart.',
          step1: 'Calibrate',
          step2: 'Measure',
          step1Title: 'Match a card to your screen',
          step1Text: 'Hold a bank card flat against the screen, its top-left corner in the marked corner. Resize the outline until it meets the card’s edges exactly.',
          step1Any: 'Any card of the standard size works: a debit card, an ID or a library card (85.6 × 54 mm).',
          cardLabel: 'Card outline size',
          cardDone: 'It matches',
          smaller: 'Make the outline a little smaller',
          larger: 'Make the outline a little larger',
          smallerRing: 'Make the circle a little smaller',
          largerRing: 'Make the circle a little larger',
          pxmm: '{v} px / mm',
          step2Title: 'Measure a ring you own',
          step2Text: 'Lay a ring that fits the finger you have in mind on the circle. Resize the circle until its edge sits just inside the ring’s inner edge.',
          recalibrate: 'Calibrate again',
          diameter: 'Inner diameter',
          mm: '{mm} mm',
          yourSize: 'Your size',
          between: 'Between sizes: we suggest the larger, for comfort.',
          sizeUS: 'US {n}',
          ukeu: 'UK {uk} · EU {eu}',
          use: 'Use this size',
          used: 'Saved: size {n}',
          usedToast: 'Size {n} saved. We will choose it for you.',
          designRing: 'Design a ring',
          shopRings: 'Shop rings',
          calibrated: 'Calibrated: {v} pixels to the millimetre',
          outOfRange: 'Outside our size range: please book a fitting and we will measure you in person.',
          chartTitle: 'Size chart',
          chartLede: 'Inner diameter and circumference for every size we make.',
          chartUS: 'US',
          chartUK: 'UK',
          chartEU: 'EU',
          chartEUunit: 'circumference, mm',
          chartD: 'Diameter',
          chartC: 'Circumference',
          printTitle: 'A paper sizer',
          printText: 'Print a strip to wrap around your finger, with a circle chart to lay a ring on. Print at 100% (actual size), then check the 50 mm line with a ruler.',
          print: 'Print a paper sizer',
          tipsTitle: 'A few tips',
          tips: [
            'Measure at the end of the day, when fingers are at their largest, and never when cold.',
            'A wide band (over 5 mm) fits more snugly: choose half a size up.',
            'If the knuckle is larger than the base of the finger, size for the knuckle.',
            'Every ring includes one free resize in its first year.'
          ],
          sheetTitle: 'Ring sizer',
          sheetCheck: 'This line must measure exactly 50 mm. If it does not, print again at 100% (actual size).',
          sheetStrip: 'Cut out the strip, wrap it around the base of your finger, and read the size where the end meets the scale.',
          sheetCircles: 'Lay a ring that fits on the circles: your size is the circle that sits just inside its edge.',
          sheetFoot: 'Aurelia — Fine Jewelry. Handcrafted since 1984.',
          howTo: 'How to measure your ring size on screen',
          cardLong: '85.6 mm',
          cardShort: '54 mm'
        },

        /* stack builder */
        stack: {
          eyebrow: 'Stack builder',
          title: 'Build a stack',
          lede: 'Up to three rings on one finger, in the order you like.',
          slots: 'Your stack',
          slot: 'Ring {n}',
          emptySlot: 'Choose a ring below',
          choose: 'Choose rings',
          add: 'Add',
          inStack: 'In the stack',
          full: 'Your stack is full: remove a ring to change it.',
          up: 'Move {name} up',
          down: 'Move {name} down',
          remove: 'Remove {name}',
          total: 'The set',
          addAll: 'Add all to bag',
          addedAll: 'Your stack is in the bag',
          addedToast: '{n} rings added to your bag',
          empty: 'Start with a band, then add a stone.',
          clear: 'Clear',
          stageLabel: 'Your stack on a hand: {names}',
          stageEmpty: 'An empty hand, waiting for rings',
        },

        /* gem lab */
        lab: {
          eyebrow: 'Gem lab',
          title: 'Read a stone',
          lede: 'One stone in the light. Change it, and read what each grade means.',
          stone: 'Stone',
          cut: 'Cut',
          carat: 'Carat',
          colour: 'Colour',
          clarity: 'Clarity',
          price: 'Indicative price',
          priceNote: 'For the loose stone, before it is set. A guide only: every stone is priced in person.',
          design: 'Design a ring with this stone',
          designShort: 'Design a ring',
          consult: 'Ask us about this stone',
          consultShort: 'Ask us',
          noRing: 'We set pearls and opals by commission: ask us and we will bring a tray to the table.',
          stageLabel: 'A {ct} carat {cut} {stone}, colour {colour}, clarity {clarity}',
          cabochon: 'Cabochon',
          sphere: 'Round, as grown',
          still: 'Shown as an illustration',
          views: 'View',
          viewHome: 'Three-quarter view',
          viewTop: 'From above, through the table',
          viewSide: 'From the side',
          ct: '{ct} ct',
          grades: '{ct} ct · {cut} · {colour} · {clarity}',
          consultNotes: 'A {ct} carat {cut} {stone}, colour {colour}, clarity {clarity}. Indicative price {price}.',
          /* a pearl's scales: size (mm), colour, lustre and surface; an opal's: carat, body tone, brilliance */
          size: 'Size',
          lustre: 'Lustre & surface',
          tone: 'Body tone',
          brilliance: 'Brilliance',
          mm: '{mm} mm',
          cabochonCut: '{cut} cabochon',
          gradesPearl: '{mm} mm · {cut} · {colour} · {lustre}',
          gradesOpal: '{ct} ct · {cut} · {colour} · {brilliance}',
          stageLabelPearl: 'A {mm} mm {stone}, {cut}, {colour}, {lustre}',
          stageLabelOpal: 'A {ct} carat {cut} {stone}, {colour} body tone, {brilliance}',
          consultNotesPearl: 'A {mm} mm {stone}, {cut}, {colour}, {lustre}. Indicative price {price}.',
          consultNotesOpal: 'A {ct} carat {cut} {stone}, {colour} body tone, {brilliance}. Indicative price {price}.'
        }
      }
    }
  });

  /* French and German for the pearl and opal scales above (added with them; the translator's files merge over these,
     so a later translation of the same keys wins) */
  if (AU.addLang) {
    AU.addLang('fr', {
      gemLab: {
        caratTextOpal: 'Les opales se pèsent en carats, un cinquième de gramme chacun. À {ct} ct, un cabochon rond mesure environ {mm} mm de diamètre.',
        pearl: {
          size: [
            { text: 'Une perle se mesure, elle ne se pèse pas. {mm} mm est une taille classique d’Akoya, la perle du beau rang unique.' },
            { text: 'Une perle se mesure, elle ne se pèse pas. À {mm} mm : une Akoya généreuse, ou une perle de Tahiti ou des mers du Sud.' },
            { text: 'Une perle se mesure, elle ne se pèse pas. Seules les perles des mers du Sud et de Tahiti atteignent {mm} mm, et chaque millimètre au-delà de dix est plus rare.' }
          ],
          lustre: [
            { id: 'Excellent', cap: 'Orient excellent', text: 'Un éclat de miroir : on y lit le reflet d’une fenêtre. Une surface nette à l’œil, peut-être une infime marque.' },
            { id: 'Très bon', cap: 'Très bel orient', text: 'Lumineux, aux reflets nets sur une douce lueur. Quelques petites marques, difficiles à trouver une fois portée.' },
            { id: 'Bon', cap: 'Bel orient', text: 'Une lueur plus douce, satinée, aux reflets estompés. Quelques marques visibles quand on les cherche.' }
          ]
        },
        opal: {
          brilliance: [
            { id: 'Flamboyante', cap: 'Feu flamboyant', text: 'Le jeu de couleurs flamboie sous toutes les lumières, même de l’autre côté d’une pièce. Le grade le plus rare.' },
            { id: 'Vive', cap: 'Feu vif', text: 'Des éclats vifs dedans comme dehors, nets au jour comme à la lampe.' },
            { id: 'Modérée', cap: 'Feu modéré', text: 'Une couleur qui se montre bien en bonne lumière et s’apaise à l’ombre.' },
            { id: 'Douce', cap: 'Feu doux', text: 'Un doux chatoiement de couleurs : ravissant de près, plus discret à distance.' }
          ]
        }
      },
      ui: { bespoke: { size: { chartEUunit: 'tour de doigt, mm' }, lab: {
        size: 'Diamètre', lustre: 'Orient et surface', tone: 'Ton de fond', brilliance: 'Brillance', mm: '{mm} mm', cabochonCut: 'cabochon {cut}',
        gradesPearl: '{mm} mm · {cut} · {colour} · {lustre}',
        gradesOpal: '{ct} ct · {cut} · {colour} · {brilliance}',
        stageLabelPearl: '{stone} de {mm} mm, {cut}, {colour}, {lustre}',
        stageLabelOpal: '{stone}, {cut}, {ct} carat, {colour}, {brilliance}',
        consultNotesPearl: '{stone} de {mm} mm, {cut}, {colour}, {lustre}. Prix indicatif {price}.',
        consultNotesOpal: '{stone}, {cut}, {ct} carat, {colour}, {brilliance}. Prix indicatif {price}.'
      } } }
    });
    AU.addLang('de', {
      gemLab: {
        caratTextOpal: 'Opale werden in Karat gewogen, je ein Fünftelgramm. Bei {ct} ct misst ein runder Cabochon etwa {mm} mm im Durchmesser.',
        pearl: {
          size: [
            { text: 'Perlen werden gemessen, nicht gewogen. {mm} mm ist eine klassische Akoya-Größe, die Perle der feinen einreihigen Kette.' },
            { text: 'Perlen werden gemessen, nicht gewogen. Mit {mm} mm: eine großzügige Akoya oder eine Tahiti- oder Südseeperle.' },
            { text: 'Perlen werden gemessen, nicht gewogen. Nur Südsee- und Tahitiperlen erreichen {mm} mm, und jeder Millimeter über zehn ist seltener.' }
          ],
          lustre: [
            { id: 'Exzellent', cap: 'Exzellenter Lüster', text: 'Spiegelhell: Man erkennt ein Fenster in ihrer Haut. Die Oberfläche ist für das Auge rein, vielleicht eine winzige Spur.' },
            { id: 'Sehr gut', cap: 'Sehr guter Lüster', text: 'Hell, mit klaren Reflexen über einem sanften Schimmer. Ein paar kleine Spuren, getragen kaum zu finden.' },
            { id: 'Gut', cap: 'Guter Lüster', text: 'Ein weicherer, seidiger Glanz mit verschwommenen Reflexen. Einige Spuren, die man sieht, wenn man sie sucht.' }
          ]
        },
        opal: {
          brilliance: [
            { id: 'Brillant', cap: 'Brillantes Feuer', text: 'Das Farbenspiel lodert in jedem Licht, selbst quer durch einen Raum. Die seltenste Stufe.' },
            { id: 'Hell', cap: 'Helles Feuer', text: 'Lebhafte Blitze drinnen wie draußen, klar bei Tageslicht und Lampenlicht.' },
            { id: 'Mäßig', cap: 'Mäßiges Feuer', text: 'Farbe, die sich in gutem Licht zeigt und im Schatten ruhiger wird.' },
            { id: 'Gedämpft', cap: 'Gedämpftes Feuer', text: 'Ein sanftes Farbschimmern: aus der Nähe reizvoll, aus der Ferne zurückhaltender.' }
          ]
        }
      },
      ui: { bespoke: { size: { chartEUunit: 'Umfang, mm' }, lab: {
        size: 'Durchmesser', lustre: 'Lüster & Oberfläche', tone: 'Grundton', brilliance: 'Brillanz', mm: '{mm} mm', cabochonCut: 'Cabochon, {cut}',
        gradesPearl: '{mm} mm · {cut} · {colour} · {lustre}',
        gradesOpal: '{ct} ct · {cut} · {colour} · {brilliance}',
        stageLabelPearl: '{stone}, {mm} mm, {cut}, {colour}, {lustre}',
        stageLabelOpal: '{stone}, {cut}, {ct} Karat, Grundton {colour}, {brilliance}',
        consultNotesPearl: '{stone}, {mm} mm, {cut}, {colour}, {lustre}. Richtpreis {price}.',
        consultNotesOpal: '{stone}, {cut}, {ct} Karat, Grundton {colour}, {brilliance}. Richtpreis {price}.'
      } } }
    });
  }
})();
