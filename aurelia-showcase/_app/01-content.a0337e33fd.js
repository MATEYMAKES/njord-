/* ---- 01-content.js ---- */
/* Aurelia content: every word, product and price the site shows lives here so it can be edited in one place.
   PLACEHOLDER: the brand facts the style guide gives are the name, "No. 2.0 — Fine Jewelry", "Handcrafted Since 1984",
   "Eternal Grace" and the example price $1,480.00. Everything else (pieces, prices, collection names, copy, quotes,
   addresses) is placeholder written to show the design, and must be replaced with Aurelia's real details.

   A piece's `spec` is what the 3D engine draws (see src/gl and BRIEF.md):
     type:  'ring' | 'bracelet' | 'earrings' | 'pendant'
     style: ring: 'solitaire' | 'halo' | 'three-stone' | 'eternity' | 'band'
            bracelet: 'tennis' | 'bangle' | 'cuff'
            earrings: 'stud' | 'drop' | 'hoop'
            pendant: 'solitaire' | 'drop'
     metal: 'yellow' | 'rose' | 'white'
     stone: 'diamond' | 'ruby' | 'emerald' | 'sapphire' | null
     cut:   'round' | 'oval' | 'pear' | 'emerald' | 'cushion' | null
     carat: 0.25 – 3   (size of the centre stone)
     accent: 'diamond' | null   (small stones: halo, pavé, side stones)

   v2: this file is the ENGLISH BASE. It is merged with every src/js/02-content-*.js file (AU.extendContent), and
   src/js/09-lang-*.js files register French/German overrides of the same structure (AU.addLang). Always read content
   through AU.content (it returns the current language). Internal links are written as routes: '#/boutique'. */
(function () {
  'use strict';
  var AU = (window.AU = window.AU || {});

  AU.extendContent({
    brand: {
      name: 'Aurelia',
      edition: 'No. 2.0 — Fine Jewelry',
      since: 1984,
      tagline: 'Eternal Grace',
      email: 'hello@aurelia.example',          // PLACEHOLDER
      phone: '+1 (555) 014 1984',              // PLACEHOLDER (555 is a fictional exchange)
      instagram: ''                            // PLACEHOLDER: the brand's real handle; empty hides the link
    },

    /* Integrations. Every adapter defaults to 'preview': the form validates and confirms on screen, with a small honest
       note, and nothing is sent. Fill these in to make them real (see BRIEF.md "Integrations"). */
    config: {
      checkout: { provider: 'preview', stripeLinks: {}, shopify: { domain: '', token: '' } },  // stripeLinks: { productId: 'https://buy.stripe.com/...' }
      booking: { provider: 'preview', endpoint: '', calendly: '' },   // endpoint: a form backend URL (Formspree, Web3Forms…)
      newsletter: { provider: 'preview', endpoint: '' },
      // PLACEHOLDER exchange rates from USD; prices are shown rounded to the nearest 10 in the visitor's currency
      currencies: { USD: { rate: 1, symbol: '$' }, EUR: { rate: 0.92, symbol: '€' }, GBP: { rate: 0.79, symbol: '£' } },
      languages: [{ id: 'en', label: 'English' }, { id: 'fr', label: 'Français' }, { id: 'de', label: 'Deutsch' }],
      siteUrl: 'https://njord.live/aurelia-showcase/'      // PLACEHOLDER: the real domain, used for canonical links, sitemap, social cards
    },

    ui: { core: { skip: 'Skip to content' } },

    nav: [
      { label: 'Collections', href: '#/collections' },
      { label: 'Boutique', href: '#/boutique' },
      { label: 'Bespoke', href: '#/bespoke' },
      { label: 'Atelier', href: '#/atelier' },
      { label: 'Journal', href: '#/journal' },
      { label: 'Visit', href: '#/visit' }
    ],

    hero: {
      eyebrow: 'Fine Jewelry — Handcrafted Since 1984',
      title: 'Eternal Grace',
      lede: 'Rings, bracelets and earrings cast, set and polished by hand in our atelier. Made to be worn every day, and to be handed down.',
      primary: { label: 'Discover the boutique', href: '#/boutique' },
      secondary: { label: 'Book a private viewing', href: '#/visit' },
      // the pieces the hero can show; the first is shown on load
      pieces: ['au-grace-solitaire', 'au-ligne-tennis', 'au-larme-drops']
    },

    marquee: ['Handcrafted Since 1984', 'Eternal Grace', 'Recycled 18k Gold', 'Set by Hand', 'Made to be Handed Down'],

    collections: [
      { id: 'eternal-grace', name: 'Eternal Grace', kicker: 'Bridal & Engagement',
        text: 'Solitaires and three-stone rings for the promises that last. Every diamond chosen by eye, every claw set by hand.',
        spec: { type: 'ring', style: 'solitaire', metal: 'yellow', stone: 'diamond', cut: 'round', carat: 1.2, accent: null } },
      { id: 'maison-rouge', name: 'Maison Rouge', kicker: 'Rubies & Rose Gold',
        text: 'Our house colour, in stone. Deep red rubies set in warm rose gold, from everyday cuffs to evening drops.',
        spec: { type: 'ring', style: 'halo', metal: 'rose', stone: 'ruby', cut: 'oval', carat: 1.3, accent: 'diamond' } },
      { id: 'lumiere', name: 'Lumière', kicker: 'Diamonds in White Gold',
        text: 'Light, and nothing else. Tennis lines, eternity bands and studs that catch every lamp in the room.',
        spec: { type: 'bracelet', style: 'tennis', metal: 'white', stone: 'diamond', cut: 'round', carat: .3, accent: null } },
      { id: 'heirloom', name: 'Heirloom', kicker: 'Coloured Stones, Step Cuts',
        text: 'Emeralds and sapphires in the old cuts, made heavier and slower, to be passed from one hand to the next.',
        spec: { type: 'earrings', style: 'drop', metal: 'yellow', stone: 'emerald', cut: 'pear', carat: 1, accent: 'diamond' } }
    ],

    products: [
      { id: 'au-grace-solitaire', name: 'Grace Solitaire', collection: 'eternal-grace', price: 4850,
        text: 'A single round brilliant held high in six fine claws, on a slim band of 18k yellow gold.',
        details: ['1.00 ct round brilliant diamond', '18k recycled yellow gold', 'Band width 1.8 mm', 'Made to order in 3–4 weeks'],
        spec: { type: 'ring', style: 'solitaire', metal: 'yellow', stone: 'diamond', cut: 'round', carat: 1, accent: null } },
      { id: 'au-rouge-halo', name: 'Rouge Oval Halo', collection: 'maison-rouge', price: 3280,
        text: 'An oval ruby ringed with tiny white diamonds, set in 18k rose gold.',
        details: ['1.20 ct oval ruby', '0.18 ct diamond halo', '18k recycled rose gold', 'Made to order in 4 weeks'],
        spec: { type: 'ring', style: 'halo', metal: 'rose', stone: 'ruby', cut: 'oval', carat: 1.2, accent: 'diamond' } },
      { id: 'au-lumiere-eternity', name: 'Lumière Eternity', collection: 'lumiere', price: 2940,
        text: 'Round diamonds all the way around, shared-claw set so the band is more light than metal.',
        details: ['1.50 ct total diamond weight', '18k recycled white gold', 'Band width 2.2 mm', 'Sized to order'],
        spec: { type: 'ring', style: 'eternity', metal: 'white', stone: 'diamond', cut: 'round', carat: .25, accent: null } },
      { id: 'au-trinity', name: 'Trinity Three-Stone', collection: 'eternal-grace', price: 5600,
        text: 'A cushion sapphire between two round diamonds: past, present and what comes next.',
        details: ['1.40 ct cushion sapphire', '0.60 ct total side diamonds', '18k recycled white gold', 'Made to order in 4–5 weeks'],
        spec: { type: 'ring', style: 'three-stone', metal: 'white', stone: 'sapphire', cut: 'cushion', carat: 1.4, accent: 'diamond' } },
      { id: 'au-verdant', name: 'Verdant Step-Cut', collection: 'heirloom', price: 6150,
        text: 'An emerald-cut emerald, its long facets like still water, in a four-claw basket of yellow gold.',
        details: ['1.80 ct emerald-cut emerald', '18k recycled yellow gold', 'Band width 2.0 mm', 'Made to order in 5 weeks'],
        spec: { type: 'ring', style: 'solitaire', metal: 'yellow', stone: 'emerald', cut: 'emerald', carat: 1.8, accent: null } },
      { id: 'au-aurum-band', name: 'Aurum Band', collection: 'eternal-grace', price: 1480,
        text: 'A plain band, softly domed and polished to a mirror. The ring everything else is measured against.',
        details: ['18k recycled yellow gold', 'Comfort fit, 3 mm', 'Engraving included', 'Ready to ship'],
        spec: { type: 'ring', style: 'band', metal: 'yellow', stone: null, cut: null, carat: 0, accent: null } },
      { id: 'au-ligne-tennis', name: 'Ligne Tennis Bracelet', collection: 'lumiere', price: 7400,
        text: 'Forty-two round diamonds in a supple line of white gold that moves like water on the wrist.',
        details: ['4.20 ct total diamond weight', '18k recycled white gold', 'Box clasp with safety catch', 'Length 17 cm'],
        spec: { type: 'bracelet', style: 'tennis', metal: 'white', stone: 'diamond', cut: 'round', carat: .3, accent: null } },
      { id: 'au-soleil-bangle', name: 'Soleil Bangle', collection: 'eternal-grace', price: 2280,
        text: 'A solid oval bangle in yellow gold, hand-finished until it shines like a low sun.',
        details: ['18k recycled yellow gold', 'Hinged, 4 mm profile', 'Inner circumference 17 cm', 'Ready to ship'],
        spec: { type: 'bracelet', style: 'bangle', metal: 'yellow', stone: null, cut: null, carat: 0, accent: null } },
      { id: 'au-rouge-cuff', name: 'Rouge Cuff', collection: 'maison-rouge', price: 3650,
        text: 'An open cuff of rose gold with a ruby at each end, facing one another.',
        details: ['Two 0.40 ct oval rubies', '18k recycled rose gold', 'Adjustable open cuff', 'Made to order in 3 weeks'],
        spec: { type: 'bracelet', style: 'cuff', metal: 'rose', stone: 'ruby', cut: 'oval', carat: .4, accent: null } },
      { id: 'au-etoile-studs', name: 'Étoile Studs', collection: 'lumiere', price: 1950,
        text: 'Round brilliant diamonds in four claws of white gold. The pair you never take off.',
        details: ['0.80 ct total diamond weight', '18k recycled white gold', 'Screw backs', 'Ready to ship'],
        spec: { type: 'earrings', style: 'stud', metal: 'white', stone: 'diamond', cut: 'round', carat: .4, accent: null } },
      { id: 'au-larme-drops', name: 'Larme Drops', collection: 'heirloom', price: 3900,
        text: 'Pear-shaped emeralds that fall from a single diamond, swinging as you turn your head.',
        details: ['Two 0.90 ct pear emeralds', '0.20 ct diamond tops', '18k recycled yellow gold', 'Drop length 28 mm'],
        spec: { type: 'earrings', style: 'drop', metal: 'yellow', stone: 'emerald', cut: 'pear', carat: .9, accent: 'diamond' } },
      { id: 'au-cerise-hoops', name: 'Cerise Hoops', collection: 'maison-rouge', price: 2450,
        text: 'Slim rose-gold hoops lined with tiny rubies on the front face.',
        details: ['0.60 ct total ruby weight', '18k recycled rose gold', 'Diameter 18 mm', 'Hinged closure'],
        spec: { type: 'earrings', style: 'hoop', metal: 'rose', stone: 'ruby', cut: 'round', carat: .1, accent: null } },
      { id: 'au-grace-pendant', name: 'Grace Pendant', collection: 'eternal-grace', price: 2250,
        text: 'A round diamond that seems to float on a fine yellow-gold chain.',
        details: ['0.70 ct round brilliant diamond', '18k recycled yellow gold', 'Chain 42–45 cm, adjustable', 'Ready to ship'],
        spec: { type: 'pendant', style: 'solitaire', metal: 'yellow', stone: 'diamond', cut: 'round', carat: .7, accent: null } },
      { id: 'au-nuit-pendant', name: 'Nuit Pendant', collection: 'heirloom', price: 2780,
        text: 'A pear sapphire, the blue of the sky an hour after sunset, under a single diamond.',
        details: ['1.10 ct pear sapphire', '0.10 ct diamond', '18k recycled white gold', 'Chain 42–45 cm, adjustable'],
        spec: { type: 'pendant', style: 'drop', metal: 'white', stone: 'sapphire', cut: 'pear', carat: 1.1, accent: 'diamond' } }
    ],

    atelier: {
      eyebrow: 'The Atelier',
      title: 'Handcrafted since 1984',
      lede: 'Four benches, a window onto the street, and the same promise for over forty years: nothing leaves until it is right.',
      stats: [
        { value: '1984', label: 'Our first ring' },
        { value: '42', label: 'Years at the bench' },
        { value: '18k', label: 'Recycled gold only' },
        { value: '100%', label: 'Set and finished by hand' }
      ],
      steps: [
        { n: '01', title: 'Drawn', text: 'Every piece starts as a pencil sketch at full size, drawn and redrawn until the proportions sit right.' },
        { n: '02', title: 'Cast', text: 'The design is carved in wax, then cast in recycled 18k gold, refined and alloyed in our own workshop.' },
        { n: '03', title: 'Set', text: 'Each stone is set under the loupe, claw by claw, and checked from every angle before the next.' },
        { n: '04', title: 'Finished', text: 'Polished by hand to a mirror, hallmarked, and inspected once more before it is boxed for you.' }
      ]
    },

    bespoke: {
      eyebrow: 'Bespoke',
      title: 'Design your ring',
      lede: 'Choose the setting, the metal and the stone. We will draw it, show you the stones in person, and make it by hand.',
      styles: [
        { id: 'solitaire', label: 'Solitaire', base: 1650 },
        { id: 'halo', label: 'Halo', base: 2150 },
        { id: 'three-stone', label: 'Three-Stone', base: 2450 },
        { id: 'eternity', label: 'Eternity', base: 1950 }
      ],
      metals: [
        { id: 'yellow', label: 'Yellow Gold', add: 0, swatch: 'linear-gradient(135deg,#f6dc9c,#c9993f 55%,#f3d58b)' },
        { id: 'rose', label: 'Rose Gold', add: 0, swatch: 'linear-gradient(135deg,#f5c9b3,#c4826a 55%,#efc0a8)' },
        { id: 'white', label: 'White Gold', add: 180, swatch: 'linear-gradient(135deg,#f4f4f2,#b9bbbd 55%,#ecedee)' }
      ],
      stones: [
        { id: 'diamond', label: 'Diamond', perCarat: 3400, swatch: 'radial-gradient(circle at 35% 30%,#fff,#dfe8f0 45%,#9fb1c2)' },
        { id: 'ruby', label: 'Ruby', perCarat: 2100, swatch: 'radial-gradient(circle at 35% 30%,#ff8a8a,#b3121b 50%,#5c0408)' },
        { id: 'emerald', label: 'Emerald', perCarat: 2300, swatch: 'radial-gradient(circle at 35% 30%,#9df0c0,#13834a 50%,#063d22)' },
        { id: 'sapphire', label: 'Sapphire', perCarat: 1900, swatch: 'radial-gradient(circle at 35% 30%,#9db7ff,#1c3fae 50%,#0a1a55)' }
      ],
      cuts: [
        { id: 'round', label: 'Round' }, { id: 'oval', label: 'Oval' }, { id: 'pear', label: 'Pear' },
        { id: 'emerald', label: 'Emerald' }, { id: 'cushion', label: 'Cushion' }
      ],
      carat: { min: .5, max: 3, step: .05, initial: 1 },
      sizes: [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12],
      initial: { type: 'ring', style: 'solitaire', metal: 'yellow', stone: 'diamond', cut: 'round', carat: 1, accent: null, size: 6, engraving: '' },
      // PLACEHOLDER pricing, rounded to the nearest $10: setting + metal + stone weight^1.5 × rate (+ halo/side stones)
      price: function (s) {
        var b = AU.content.bespoke;
        var st = b.styles.find(function (x) { return x.id === s.style; }) || b.styles[0];
        var me = b.metals.find(function (x) { return x.id === s.metal; }) || b.metals[0];
        var sn = b.stones.find(function (x) { return x.id === s.stone; }) || b.stones[0];
        var stone = s.style === 'eternity' ? sn.perCarat * 1.5 : sn.perCarat * Math.pow(s.carat, 1.5);
        var extra = s.style === 'halo' ? 640 : s.style === 'three-stone' ? 1100 : 0;
        return Math.round((st.base + me.add + stone + extra) / 10) * 10;
      }
    },

    voices: [
      { quote: 'They drew my grandmother’s ring from one faded photograph, and made it again, exactly. I cried in the shop.', name: 'Camille R.', place: 'Bespoke client' },
      { quote: 'The tennis bracelet has not left my wrist in two years. It looks better now than the day I bought it.', name: 'Hannah M.', place: 'Lumière collection' },
      { quote: 'Patient, honest about every stone, and never once in a hurry. Our wedding bands were made side by side.', name: 'Daniel & Sofia', place: 'Eternal Grace collection' }
    ],

    promises: [
      { icon: 'truck', title: 'Insured delivery', text: 'Complimentary, insured and signed for, in our burgundy box.' },
      { icon: 'shield', title: 'Lifetime care', text: 'Cleaning, claw checks and re-polishing for as long as you wear it.' },
      { icon: 'ring', title: 'Free resizing', text: 'One resize on any ring within the first year.' },
      { icon: 'gift', title: 'Engraving', text: 'A name, a date or a few words, engraved by hand at no charge.' }
    ],

    visit: {
      eyebrow: 'Visit',
      title: 'A private viewing',
      lede: 'Sit with us at the atelier, or join us by video. We will have the pieces you are curious about ready on the tray, and time for every question.',
      // PLACEHOLDER locations and hours
      places: [
        { id: 'atelier', name: 'The Atelier', lines: ['Address to follow', 'Workshop and salon'], hours: 'Tue – Sat, 10:00 – 18:00' },
        { id: 'video', name: 'By video', lines: ['From wherever you are', 'Pieces shown under the loupe, live'], hours: 'Mon – Sat, 09:00 – 20:00' }
      ],
      times: ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'],
      reasons: ['Engagement ring', 'Wedding bands', 'A gift', 'Bespoke commission', 'Repair or resizing', 'Just looking']
    },

    footer: {
      newsletter: { title: 'Letters from the atelier', text: 'New pieces, the stories behind them, and the occasional invitation. A few times a year, never more.' },
      columns: [
        { title: 'The House', links: [{ label: 'Our story', href: '#/atelier' }, { label: 'Collections', href: '#/collections' }, { label: 'Journal', href: '#/journal' }, { label: 'Birthstones', href: '#/birthstones' }] },
        { title: 'Discover', links: [{ label: 'Bespoke', href: '#/bespoke' }, { label: 'Gift finder', href: '#/gifts' }, { label: 'Gem lab', href: '#/gem-lab' }, { label: 'Stack builder', href: '#/stack' }] },
        { title: 'Client Care', links: [{ label: 'Book a viewing', href: '#/visit' }, { label: 'Ring size finder', href: '#/size' }, { label: 'Care & repairs', href: '#/care?at=care-repairs' }, { label: 'Delivery & returns', href: '#/care?at=care-delivery' }] }
      ],
      legal: 'Aurelia Fine Jewelry. All pieces handcrafted.'
    },

    /* What each piece suits, for the gift finder and "complete the look". PLACEHOLDER judgements.
       for: partner | mother | friend | self | bride      style: classic | modern | bold | delicate
       occasion: engagement | wedding | anniversary | birthday | everyday | celebration */
    productTags: {
      'au-grace-solitaire': { for: ['partner', 'bride'], style: ['classic', 'delicate'], occasion: ['engagement'] },
      'au-rouge-halo': { for: ['partner', 'self'], style: ['bold', 'classic'], occasion: ['engagement', 'anniversary', 'celebration'] },
      'au-lumiere-eternity': { for: ['partner', 'bride', 'self'], style: ['classic', 'modern'], occasion: ['wedding', 'anniversary'] },
      'au-trinity': { for: ['partner', 'bride'], style: ['classic', 'bold'], occasion: ['engagement', 'anniversary'] },
      'au-verdant': { for: ['self', 'mother'], style: ['bold', 'classic'], occasion: ['anniversary', 'celebration'] },
      'au-aurum-band': { for: ['partner', 'bride', 'self', 'friend'], style: ['classic', 'modern', 'delicate'], occasion: ['wedding', 'everyday'] },
      'au-ligne-tennis': { for: ['partner', 'mother', 'self'], style: ['classic', 'modern'], occasion: ['anniversary', 'celebration'] },
      'au-soleil-bangle': { for: ['mother', 'friend', 'self'], style: ['modern', 'bold'], occasion: ['birthday', 'everyday'] },
      'au-rouge-cuff': { for: ['friend', 'self', 'partner'], style: ['bold', 'modern'], occasion: ['birthday', 'celebration'] },
      'au-etoile-studs': { for: ['mother', 'friend', 'partner', 'self'], style: ['classic', 'delicate'], occasion: ['birthday', 'everyday'] },
      'au-larme-drops': { for: ['partner', 'mother', 'self'], style: ['bold', 'classic'], occasion: ['celebration', 'anniversary'] },
      'au-cerise-hoops': { for: ['friend', 'self'], style: ['modern', 'delicate'], occasion: ['birthday', 'everyday'] },
      'au-grace-pendant': { for: ['mother', 'friend', 'partner'], style: ['delicate', 'classic'], occasion: ['birthday', 'everyday'] },
      'au-nuit-pendant': { for: ['mother', 'partner', 'self'], style: ['delicate', 'modern'], occasion: ['anniversary', 'birthday'] }
    }
  });
})();
