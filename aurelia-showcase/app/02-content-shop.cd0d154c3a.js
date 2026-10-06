/* ---- 02-content-shop.js ---- */
/* Aurelia content: the shop (collections, boutique, product pages, compare, bag, checkout).
   Every visible word of the shop lives here, so the translator (09-lang-*.js) only has to override strings.
   Placeholders: {n}, {name}, {s} … are filled by AU.t(path, vars). Prices stay in USD (shown with AU.price). */
(function () {
  'use strict';
  var AU = (window.AU = window.AU || {});
  if (!AU.extendContent) return;

  AU.extendContent({
    ui: {
      shop: {
        /* ---------- materials ---------- */
        metals: { yellow: '18k Yellow Gold', rose: '18k Rose Gold', white: '18k White Gold' },
        metalShort: { yellow: 'Yellow gold', rose: 'Rose gold', white: 'White gold' },
        stones: {
          diamond: 'Diamond', ruby: 'Ruby', emerald: 'Emerald', sapphire: 'Sapphire', garnet: 'Garnet', amethyst: 'Amethyst',
          aquamarine: 'Aquamarine', peridot: 'Peridot', citrine: 'Citrine', topaz: 'Topaz', tourmaline: 'Tourmaline',
          tanzanite: 'Tanzanite', pearl: 'Pearl', opal: 'Opal', none: 'Gold only'
        },
        cuts: { round: 'Round brilliant', oval: 'Oval', pear: 'Pear', emerald: 'Emerald cut', cushion: 'Cushion' },
        types: { all: 'All', ring: 'Rings', bracelet: 'Bracelets', earrings: 'Earrings', pendant: 'Pendants' },
        typeOne: { ring: 'Ring', bracelet: 'Bracelet', earrings: 'Earrings', pendant: 'Pendant' },
        carat: '{n} ct',
        none: '—',
        size: 'Size {s}',
        sizeTbc: 'Size to be confirmed',
        engraved: 'Engraved “{t}”',

        /* ---------- shared bits ---------- */
        pieces: '{n} pieces',
        /* (fixer) the singular has its own key: `piece` is the product page's group of strings below, which used to
           overwrite a '{n} piece' string of the same name (a count of one read "[object Object]") */
        pieceOne: '{n} piece',
        explore: 'Explore',
        exploreAria: 'Explore {name}',
        save: 'Save',
        saved: 'Saved',
        saveAria: 'Save {name}',
        unsaveAria: 'Remove {name} from saved',
        savedToast: 'Saved to your wishlist',
        unsavedToast: 'Removed from your saved pieces',
        compare: 'Compare',
        compareAria: 'Compare {name}',
        compareFull: 'Up to three pieces can be compared at once.',
        compareAdded: 'Added to compare',
        addToBag: 'Add to bag',
        added: 'Added',
        addedToast: 'Added to your bag',
        viewPiece: 'View {name}',
        moveHint: 'Move across a piece to turn it in the light.',
        touchHint: 'Touch a piece to see it closer.',
        back: 'Back',

        /* ---------- collections ---------- */
        collections: {
          eyebrow: 'The Collections',
          title: 'Four houses',
          lede: 'Four houses within the house, each with its own stone, its own gold and its own idea of light.',
          index: 'Collection {n} of 4',
          piecesIn: 'The pieces',
          all: 'All collections',
          next: 'Next collection',
          viewing: 'See them in person',
          viewingEyebrow: 'Private viewing',
          viewingText: 'Every piece of {name} can be brought to the tray at a private viewing, at the atelier or by video.',
          book: 'Book a private viewing',
          bookShort: 'Book a viewing',
          /* the index head: the page names itself; the four-collections idea lives in the lede */
          kicker: 'Handcrafted since 1984',
          heading: 'The Collections',
          intro: 'Four collections, each with its own stone, its own gold and its own idea of light.',
          seeN: 'See the {n} pieces',
          seeOne: 'See the piece',
          /* the two doors that close the index */
          doors: 'Where to next',
          doorShop: { eyebrow: 'Every piece', title: 'The Boutique', text: 'Rings, bracelets, earrings and pendants, to filter by gold, stone and price.' },
          doorBespoke: { eyebrow: 'Made for one hand', title: 'Bespoke', text: 'Choose the setting, the gold and the stone. We draw it with you, then make it by hand.', link: 'Design your ring' },
          missingTitle: 'This collection has moved',
          missingText: 'It may have a new name. The four houses are all on the collections page.'
        },

        /* ---------- boutique ---------- */
        boutique: {
          eyebrow: 'The Boutique',
          title: 'Pieces to keep',
          lede: 'Cast, set and polished by hand in our atelier.',
          /* (fixer) the head names the page: "All pieces" (or the type), the old title becomes the lede */
          titleAll: 'All pieces',
          ledeAll: 'Pieces to keep, cast, set and polished by hand in our atelier.',
          typeLede: {
            ring: 'Solitaires, halos and bands, each sized and finished to order.',
            bracelet: 'Tennis lines, bangles and cuffs, made to move with the wrist.',
            earrings: 'Studs, drops and hoops that catch the light as you turn.',
            pendant: 'Single stones that seem to float on a fine gold chain.'
          },
          filterType: 'Filter by type',
          refine: 'Refine',
          refineN: 'Refine ({n})',
          refineTitle: 'Refine the selection',
          close: 'Close',
          collection: 'Collection',
          metal: 'Metal',
          stone: 'Stone',
          price: 'Price',
          priceFrom: 'From',
          priceTo: 'To',
          priceMin: 'Lowest price',
          priceMax: 'Highest price',
          sort: 'Sort',
          sortLabel: 'Sort by',
          sorts: { featured: 'Featured', 'price-asc': 'Price, low to high', 'price-desc': 'Price, high to low', name: 'Name, A to Z' },
          anyCollection: 'All collections',
          clear: 'Clear all',
          remove: 'Remove filter: {name}',
          show: 'Show {n} pieces',
          showOne: 'Show 1 piece',
          showNone: 'No pieces match',
          active: 'Active filters',
          emptyTitle: 'Nothing here, yet',
          emptyText: 'No piece matches this selection for now. The atelier can make one for you.',
          emptyReset: 'Show every piece',
          noteEyebrow: 'Bespoke',
          noteTitle: 'Made for one hand',
          noteText: 'Choose the setting, the gold and the stone. We draw it with you, then make it by hand.',
          noteLink: 'Design your ring',
          gridLabel: 'Pieces'
        },

        /* ---------- compare tray ---------- */
        tray: {
          label: 'Pieces to compare',
          title: 'Compare',
          go: 'Compare {n}',
          clear: 'Clear',
          remove: 'Remove {name} from compare',
          room: 'Add up to {n} more',
          full: 'Ready to compare',
          show: 'Show the pieces to compare',
          hide: 'Fold the tray away'
        },

        /* ---------- product page ---------- */
        piece: {
          crumbs: 'Breadcrumb',
          home: 'Home',
          boutique: 'Boutique',
          stageLabel: '{name}, {material}. Drag to turn the piece.',
          stageKeys: 'Use the left and right arrow keys to turn the piece.',
          inPerson: 'See it in person',
          ask: 'Ask us',
          askSubject: 'About {name}',
          call: 'Call us on {phone}',
          drag: 'Drag to turn',
          tools: 'Viewing tools',
          loupe: 'Loupe',
          loupeOn: 'Loupe on: move over the piece',
          light: 'Light',
          lights: { studio: 'Studio', daylight: 'Daylight', candle: 'Candlelight', evening: 'Evening' },
          lightNow: 'Light: {name}',
          tryon: 'Try on',
          tryonNone: 'Try on needs a camera, and is not available here.',
          turn: '360°',
          turnAria: 'Turn the piece by itself',
          compare: 'Compare',
          compareOn: 'In compare',
          share: 'Share',
          shared: 'Link copied',
          shareFail: 'Copy the address from the bar above to share this piece.',
          sizeLabel: 'Ring size',
          sizeUnit: '(US)',
          sizeChoose: 'Choose your size',
          sizeOption: 'US {s}',
          /* the same US size, read in the visitor's own system (the value stored is always the US size):
             English with pounds shows the UK letter too; French and German lead with the EU size */
          sizeUnitUK: '(US · UK)',
          sizeOptionUK: 'US {s} · UK {uk}',
          sizeUnitEU: '(EU · US)',
          sizeOptionEU: '{eu} (US {s})',
          sizeFind: 'Find your size',
          sizeErr: 'Please choose a ring size. Not sure? We resize once, free, in the first year.',
          engraving: 'Engraving',
          engravingAdd: 'Add an engraving',
          engravingHint: 'Engraved by hand inside the band, at no charge.',
          engravingPlaceholder: 'A name, a date, a few words',
          engravingCount: '{n} of 18',
          engravingSample: 'Always',
          engravingPreview: 'Engraving preview',
          fonts: { script: 'Script', serif: 'Serif', roman: 'Roman' },
          fontLabel: 'Lettering',
          qty: 'Quantity',
          less: 'One fewer',
          more: 'One more',
          inBag: 'In your bag.',
          viewBag: 'View bag',
          details: 'Details',
          delivery: 'Delivery & returns',
          care: 'Care',
          stackEyebrow: 'Stack it',
          stackTitle: 'Wear it with others',
          stackText: 'See this ring beside up to two other bands on one finger, turning in the light, with the price of the stack.',
          stackLink: 'Open the stack builder',
          lookEyebrow: 'From the same house',
          lookTitle: 'Complete the look',
          missingTitle: 'This piece has moved',
          missingText: 'It may have found a new name, or a new home. Every piece we make is in the boutique.',
          missingLink: 'Back to the boutique',
          promises: ['Complimentary insured delivery', 'One free resize in the first year', 'Engraving by hand, at no charge']
        },

        info: {
          delivery: [
            'Complimentary insured delivery, signed for, in our burgundy box. Pieces that are ready to ship leave the atelier within two working days; pieces made to order follow the time shown in their details.',
            'Returns are accepted within 30 days of delivery, unworn and in their box. Engraved and bespoke pieces are made for you alone, so they cannot be returned, but we will always resize them.'
          ],
          care: [
            'Gold and diamonds love warm water, a drop of mild soap and a soft brush. Pat dry with a lint-free cloth.',
            'Keep pearls and opals away from perfume and water, and store each piece in its own pouch so stones never scratch one another.',
            'Bring any piece back for a complimentary clean, claw check and polish, for as long as you wear it.'
          ]
        },

        /* ---------- compare page ---------- */
        comparePage: {
          eyebrow: 'Compare',
          title: 'Side by side',
          lede: 'Up to three pieces, turning together. Drag any of them to turn them all.',
          rows: { price: 'Price', collection: 'Collection', metal: 'Metal', stone: 'Stone', cut: 'Cut', carat: 'Centre stone', details: 'Details' },
          remove: 'Remove',
          removeAria: 'Remove {name} from the comparison',
          addMore: 'Add a piece',
          emptyTitle: 'Nothing to compare yet',
          emptyText: 'Choose up to three pieces in the boutique with “Compare”, and they will wait for you here.',
          emptyLink: 'Browse the boutique',
          canvasLabel: '{names}, turning together. Drag to turn them.'
        },

        /* ---------- bag drawer ---------- */
        bag: {
          title: 'Your bag and saved pieces',
          tabs: 'Bag and saved pieces',
          bag: 'Bag',
          saved: 'Saved',
          close: 'Close the bag',
          listBag: 'Pieces in your bag',
          listSaved: 'Saved pieces',
          qtyOf: 'Quantity of {name}',
          less: 'One fewer',
          more: 'One more',
          removeOne: 'Remove {name}',
          remove: 'Remove',
          move: 'Move to bag',
          moved: 'Moved to your bag',
          subtotal: 'Subtotal',
          ship: 'Complimentary insured delivery, signed for, in our burgundy box.',
          checkout: 'Checkout',
          emptyBagTitle: 'Your bag is empty',
          emptyBagText: 'Every piece is made by hand, and the boutique is a fine place to begin.',
          emptyBagLink: 'Discover the boutique',
          emptySavedTitle: 'Nothing saved yet',
          emptySavedText: 'Touch the heart on any piece to keep it here while you decide.',
          emptySavedLink: 'Browse the boutique'
        },

        /* ---------- checkout ---------- */
        checkout: {
          eyebrow: 'Checkout',
          title: 'Your order',
          steps: ['Review', 'Details', 'Delivery', 'Payment'],
          stepOf: 'Step {n} of 4',
          progress: 'Checkout progress',
          reviewTitle: 'Your pieces',
          editBag: 'Edit bag',
          detailsTitle: 'Your details',
          detailsText: 'So we can tell you when your piece leaves the atelier, and call before it arrives.',
          name: 'Full name',
          email: 'Email',
          phone: 'Phone',
          optional: '(optional)',
          errName: 'Please enter your name.',
          errEmail: 'Please enter a valid email address.',
          errPhone: 'Please enter a phone number we can reach you on.',
          errAddress: 'Please enter the street address.',
          errCity: 'Please enter the town or city.',
          errPost: 'Please enter the postcode.',
          errCountry: 'Please choose a country.',
          errFix: 'A few details need a second look.',
          deliveryTitle: 'Delivery',
          address: 'Street address',
          address2: 'Apartment, floor',
          city: 'Town or city',
          postcode: 'Postcode',
          country: 'Country',
          countryChoose: 'Choose a country',
          method: 'Delivery method',
          methods: [
            { id: 'insured', label: 'Insured delivery', text: 'Signed for, in 3–5 working days', price: 0 },
            { id: 'express', label: 'Express insured', text: 'Next working day, signed for', price: 45 },
            { id: 'collect', label: 'Collect at the atelier', text: 'By appointment, unhurried, with time for questions', price: 0 }
          ],
          note: 'A handwritten card',
          notePlaceholder: 'We will write it by hand and tuck it into the box',
          paymentTitle: 'Payment',
          paymentText: 'Payment always happens on our provider’s secure page. Aurelia never sees or stores your card.',
          contact: 'Contact',
          shipTo: 'Delivery to',
          collectAt: 'Collected at the atelier',
          edit: 'Change',
          summary: 'Order summary',
          subtotal: 'Subtotal',
          delivery: 'Delivery',
          free: 'Complimentary',
          total: 'Total',
          qtyN: 'Quantity {n}',
          continue: 'Continue',
          back: 'Back',
          toDelivery: 'Continue to delivery',
          toPayment: 'Continue to payment',
          pay: 'Pay securely',
          payStripe: 'Pay securely with Stripe',
          payShopify: 'Continue to secure payment',
          redirecting: 'Taking you to our secure payment page…',
          previewTitle: 'Payments are not connected yet',
          previewText: 'This is a preview of the Aurelia checkout. Your details were checked here on the page, nothing has been charged and nothing was sent anywhere.',
          previewLink: 'Book a private viewing instead',
          stripeMulti: 'Online payment for several pieces at once needs the Shopify checkout. Please check out one piece at a time, or book a private viewing and we will reserve them all.',
          stripeMissing: 'This piece cannot be paid for online yet. Book a private viewing and we will reserve it for you.',
          shopifyError: 'The payment page could not be reached. Please try again in a moment, or book a private viewing.',
          emptyTitle: 'Your bag is empty',
          emptyText: 'There is nothing to check out yet. The boutique is a fine place to begin.',
          emptyLink: 'Discover the boutique',
          secure: 'Insured, signed-for delivery in our burgundy box'
        },

        /* ---------- page titles and descriptions (search and social) ---------- */
        meta: {
          collections: 'Collections',
          collectionsDesc: 'The four houses of Aurelia: Eternal Grace, Maison Rouge, Lumière and Heirloom. Fine jewelry handcrafted since 1984.',
          collectionDesc: '{name}: {text}',
          boutique: 'Boutique',
          boutiqueDesc: 'Rings, bracelets, earrings and pendants in recycled 18k gold, cast, set and polished by hand. Filter by collection, metal, stone and price.',
          typeDesc: '{type} by Aurelia, in recycled 18k gold, set and finished by hand.',
          pieceDesc: '{name}. {text} {material}.',
          compare: 'Compare',
          compareDesc: 'Compare up to three Aurelia pieces side by side, turning together in the light.',
          checkout: 'Checkout',
          checkoutDesc: 'Review your pieces and complete your order with complimentary insured delivery.',
          notFound: 'Not found'
        },

        /* PLACEHOLDER: the countries Aurelia delivers to */
        countries: [
          { id: 'US', name: 'United States' }, { id: 'CA', name: 'Canada' }, { id: 'GB', name: 'United Kingdom' },
          { id: 'IE', name: 'Ireland' }, { id: 'FR', name: 'France' }, { id: 'DE', name: 'Germany' }, { id: 'AT', name: 'Austria' },
          { id: 'CH', name: 'Switzerland' }, { id: 'BE', name: 'Belgium' }, { id: 'NL', name: 'Netherlands' },
          { id: 'LU', name: 'Luxembourg' }, { id: 'IT', name: 'Italy' }, { id: 'ES', name: 'Spain' }, { id: 'PT', name: 'Portugal' },
          { id: 'DK', name: 'Denmark' }, { id: 'SE', name: 'Sweden' }, { id: 'NO', name: 'Norway' }, { id: 'FI', name: 'Finland' },
          { id: 'PL', name: 'Poland' }, { id: 'GR', name: 'Greece' }, { id: 'AE', name: 'United Arab Emirates' },
          { id: 'JP', name: 'Japan' }, { id: 'SG', name: 'Singapore' }, { id: 'HK', name: 'Hong Kong' },
          { id: 'AU', name: 'Australia' }, { id: 'NZ', name: 'New Zealand' }
        ]
      }
    }
  });

  /* (fixer, round 1) French and German for the strings added in this round, so no visitor meets English in the middle
     of a translated page. They are only defaults: 09-lang-fr/de.js load later and override any of them. TRANSLATOR:
     please review and move them into 09-lang-*.js. */
  if (AU.addLang) {
    AU.addLang('fr', { ui: { shop: {
      pieceOne: '{n} pièce',
      collections: {
        viewingEyebrow: 'Présentation privée', bookShort: 'Prendre rendez-vous', kicker: 'Fait main depuis 1984', heading: 'Les Collections',
        intro: 'Quatre collections, chacune avec sa pierre, son or et sa propre idée de la lumière.',
        seeN: 'Voir les {n} pièces', seeOne: 'Voir la pièce', doors: 'Et ensuite',
        doorShop: { eyebrow: 'Toutes les pièces', title: 'La Boutique', text: 'Bagues, bracelets, boucles d’oreilles et pendentifs, à choisir par or, pierre et prix.' },
        doorBespoke: { eyebrow: 'Pour une seule main', title: 'Sur mesure', text: 'Choisissez la monture, l’or et la pierre. Nous la dessinons avec vous, puis la façonnons à la main.', link: 'Dessinez votre bague' }
      },
      tray: { show: 'Voir les pièces à comparer', hide: 'Replier le plateau' },
      boutique: { titleAll: 'Toutes les pièces', ledeAll: 'Des pièces à garder, fondues, serties et polies à la main dans notre atelier.' },
      piece: {
        stageKeys: 'Les flèches gauche et droite font tourner la pièce.',
        inPerson: 'La voir en personne', ask: 'Nous écrire', askSubject: 'À propos de {name}', call: 'Nous appeler au {phone}',
        sizeUnitEU: '(EU · US)', sizeOptionEU: '{eu} (US {s})', sizeUnitUK: '(US · UK)', sizeOptionUK: 'US {s} · UK {uk}'
      }
    } } });
    AU.addLang('de', { ui: { shop: {
      pieceOne: '{n} Stück',
      collections: {
        viewingEyebrow: 'Private Besichtigung', bookShort: 'Termin vereinbaren', kicker: 'Von Hand gefertigt seit 1984', heading: 'Die Kollektionen',
        intro: 'Vier Kollektionen, jede mit eigenem Stein, eigenem Gold und einer eigenen Vorstellung von Licht.',
        seeN: 'Die {n} Stücke ansehen', seeOne: 'Das Stück ansehen', doors: 'Wohin als Nächstes',
        doorShop: { eyebrow: 'Jedes Stück', title: 'Die Boutique', text: 'Ringe, Armbänder, Ohrringe und Anhänger, nach Gold, Stein und Preis zu wählen.' },
        doorBespoke: { eyebrow: 'Für eine Hand gemacht', title: 'Nach Maß', text: 'Wählen Sie Fassung, Gold und Stein. Wir zeichnen ihn mit Ihnen und fertigen ihn von Hand.', link: 'Ihren Ring entwerfen' }
      },
      tray: { show: 'Die Stücke zum Vergleichen zeigen', hide: 'Die Leiste einklappen' },
      boutique: { titleAll: 'Alle Stücke', ledeAll: 'Stücke zum Behalten, von Hand gegossen, gefasst und poliert in unserem Atelier.' },
      piece: {
        stageKeys: 'Mit den Pfeiltasten links und rechts dreht sich das Stück.',
        inPerson: 'Persönlich ansehen', ask: 'Schreiben Sie uns', askSubject: 'Zu {name}', call: 'Rufen Sie uns an: {phone}',
        sizeUnitEU: '(EU · US)', sizeOptionEU: '{eu} (US {s})', sizeUnitUK: '(US · UK)', sizeOptionUK: 'US {s} · UK {uk}'
      }
    } } });
  }

  /* integrator: a product may name a real model at its top level ({ id, …, model: '/aurelia-showcase/assets/models/grace.glb' }, see
     CONTENT.md). The 3D engine reads it from the spec, so it is copied there once, before any page draws. */
  AU.ready(function () {
    ((AU.content && AU.content.products) || []).forEach(function (p) {
      if (p && p.model && p.spec && !p.spec.model) p.spec.model = p.model;
    });
  });
})();
