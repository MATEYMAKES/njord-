/* ---- 02-content-shell.js ---- */
/* Aurelia content — shell area: the header, mega menu, preferences, search, mobile menu, footer, the home page and the
   404. English base; translations override the same structure in src/js/09-lang-*.js (AU.addLang).
   Visible strings live under ui.shell.*; the home page's editorial content under home.*; seasonal lines under
   seasons.*; the page index for search under search.pages. PLACEHOLDER copy, written to show the design. */
(function () {
  'use strict';
  var AU = (window.AU = window.AU || {});
  if (!AU.extendContent) return;

  /* the specs the shell renders as still images (hub tiles and the mega menu's piece types). Every one is also handed
     to the prerender tool below, so the visitor's browser never has to draw them. */
  var HUB = [
    { type: 'ring', label: 'Rings', href: '#/boutique/rings', product: 'au-grace-solitaire',
      spec: { type: 'ring', style: 'solitaire', metal: 'yellow', stone: 'diamond', cut: 'round', carat: 1, accent: null } },
    { type: 'bracelet', label: 'Bracelets', href: '#/boutique/bracelets', product: 'au-ligne-tennis',
      spec: { type: 'bracelet', style: 'tennis', metal: 'white', stone: 'diamond', cut: 'round', carat: .3, accent: null } },
    { type: 'earrings', label: 'Earrings', href: '#/boutique/earrings', product: 'au-larme-drops',
      spec: { type: 'earrings', style: 'drop', metal: 'yellow', stone: 'emerald', cut: 'pear', carat: .9, accent: 'diamond' } },
    { type: 'pendant', label: 'Pendants', href: '#/boutique/pendants', product: 'au-nuit-pendant',
      spec: { type: 'pendant', style: 'drop', metal: 'white', stone: 'sapphire', cut: 'pear', carat: 1.1, accent: 'diamond' } }
  ];

  AU.extendContent({
    ui: {
      shell: {
        intro: { edition: 'Fine Jewelry, since 1984', skip: 'Skip the introduction' },
        head: {
          home: 'Aurelia, home', nav: 'Main', search: 'Search', wish: 'Saved pieces', bag: 'Shopping bag',
          prefs: 'Preferences', menu: 'Open the menu', count1: '{n} piece', countN: '{n} pieces',
          care: 'Client care'
        },
        mega: {
          label: 'Collections', collections: 'The collections', byPiece: 'By piece', allCollections: 'All collections',
          allPieces: 'All pieces', explore: 'Explore',
          /* the third, narrow column: the services a visitor looks for from any page */
          services: {
            title: 'Services',
            links: [
              { label: 'Bespoke', href: '#/bespoke' },
              { label: 'Find your size', href: '#/size' },
              { label: 'Client care', href: '#/care' },
              { label: 'Book a viewing', href: '#/visit' }
            ],
            speak: 'Speak to the atelier'
          }
        },
        /* the client care card under the header's telephone icon. The telephone hours are the care page's
           (ui.story.common.contact) when they exist; these are the fallback. PLACEHOLDER hours. */
        care: {
          title: 'Client care',
          lede: 'A real person at the atelier answers, usually within the day.',
          hoursLabel: 'By telephone', hours: 'Mon – Sat, 09:00 – 18:00',
          links: [
            { label: 'Client care', href: '#/care' },
            { label: 'Find your size', href: '#/size' },
            { label: 'Delivery & returns', href: '#/care?at=care-delivery' },
            { label: 'Book a viewing', href: '#/visit' }
          ]
        },
        types: { ring: 'Rings', bracelet: 'Bracelets', earrings: 'Earrings', pendant: 'Pendants' },
        prefs: {
          title: 'Preferences', close: 'Close the preferences',
          language: 'Language', currency: 'Currency', sound: 'Sound', appearance: 'Appearance', season: 'Season',
          on: 'On', off: 'Off', dark: 'Dark', light: 'Light',
          seasons: { auto: 'Auto', none: 'None', valentine: 'Valentine', wedding: 'Wedding', holiday: 'Holiday' },
          soundNote: 'A quiet chime when a piece goes in the bag.',
          seasonNote: 'Auto follows the calendar.'
        },
        search: {
          label: 'Search Aurelia', placeholder: 'A ring, a stone, a page', close: 'Close the search', try: 'Try',
          chips: ['Rings', 'Diamonds', 'Rose gold', 'Ring size', 'Gifts'],
          pieces: 'Pieces', pages: 'Pages', count1: '{n} result', countN: '{n} results',
          emptyTitle: 'Nothing found for “{q}”',
          emptyText: 'Try a stone, a metal or a collection, or ask us at a private viewing.',
          results: 'Results', page: 'Page', story: 'Journal',
          /* shown under the field before anything is typed */
          quick: 'Quick links',
          quickLinks: [
            { label: 'Find your size', href: '#/size' },
            { label: 'Client care', href: '#/care' },
            { label: 'Delivery & returns', href: '#/care?at=care-delivery' },
            { label: 'Book a viewing', href: '#/visit' },
            { label: 'Contact', href: '#/care?at=care-help-t' }
          ]
        },
        menu: { label: 'Menu', close: 'Close the menu', discover: 'Discover', saved: 'Saved', bag: 'Bag', prefs: 'Preferences' },
        hero: {
          drag: 'Drag to turn', choose: 'Choose the piece on display', cue: 'Shop by piece', view: 'View the piece',
          stageLabel: '{name}, turning slowly. Drag to turn it.', artLabel: 'Line drawing of a ring'
        },
        footer: {
          letter: 'The letter', email: 'Your email', placeholder: 'name@example.com', join: 'Join the list',
          sending: 'Sending',
          thanks: 'Thank you — you are on the list.',
          previewNote: 'This site is a preview: your address was checked, but not sent anywhere yet.',
          errEmpty: 'Please add your email.', errBad: 'That email address looks incomplete.',
          errSend: 'We could not add you just now. Please try again in a moment.',
          contact: 'Contact', appearance: 'Appearance', darkMode: 'Dark mode', top: 'Back to top',
          since: 'Handcrafted Since {year}',
          /* the atelier's opening hours under its address (the hours come from visit.places) */
          opening: 'Open {hours}',
          brandLine: 'Fine Jewelry, handcrafted since {year}',
          opensIg: '(opens Instagram)',
          /* links added to the footer's columns (footer.columns in 01-content.js), by column index; `at` places one */
          extra: [
            [{ label: 'Boutique', href: '#/boutique', at: 1 }],
            [],
            [{ label: 'Warranty', href: '#/care?at=care-warranty' }, { label: 'Questions', href: '#/care?at=care-faq' }]
          ],
          /* the legal page (/legal, rendered by 10-shell.js); its texts are PLACEHOLDER until the house's own exist */
          legalNav: 'Legal',
          legalLinks: [
            { label: 'Privacy', href: '#/legal?at=privacy' },
            { label: 'Terms of sale', href: '#/legal?at=terms' },
            { label: 'Imprint', href: '#/legal?at=imprint' }
          ]
        },
        /* PLACEHOLDER legal texts, written to show the page and kept consistent with the care page (delivery within two
           working days, 30-day returns, lifetime warranty). Replace with the house's own before going live. {email},
           {phone} and the address are filled in from brand and visit.address. */
        legal: {
          metaTitle: 'Legal', metaDesc: 'Privacy, terms of sale and imprint of Aurelia Fine Jewelry.',
          eyebrow: 'Legal', title: 'The small print',
          note: 'Placeholder text, written to show this page. The house’s own privacy policy, terms of sale and imprint replace it before the site goes live.',
          toc: 'On this page', more: 'Read more',
          sections: [
            { id: 'privacy', title: 'Privacy', paras: [
              'We ask only for what we need to look after you: your name and how to reach you when you order, book a viewing or join our letter, and the address your pieces travel to.',
              'Your bag, your saved pieces and your preferences (language, currency, light or dark) are kept in your own browser. We set no advertising cookies, and we never sell or share your details.',
              'Payment happens on our payment provider’s own secure page. We never see or keep your card number.',
              'You may ask to see, correct or delete what we hold about you at any time. Write to {email}.'
            ] },
            { id: 'terms', title: 'Terms of sale', paras: [
              'Prices are shown in the currency you choose and include VAT where it applies. The price you pay is the one confirmed at checkout.',
              'Every piece is made by hand. Pieces ready to ship leave the atelier within two working days, insured and signed for; pieces made to order take the time shown on their page.',
              'You may return a piece that has not been worn within 30 days of delivery. Engraved pieces and pieces made to your own design are made for you alone and cannot be returned, but we will always resize them.',
              'Every piece carries a lifetime warranty against any fault in how it was made.'
            ], link: { label: 'Delivery, returns and warranty', href: '#/care' } },
            { id: 'imprint', title: 'Imprint', paras: [
              'This site is published by the house of Aurelia.'
            ] }
          ],
          facts: {
            company: 'Company', companyV: 'Aurelia Fine Jewelry',
            office: 'Atelier', contact: 'Contact',
            register: 'Company register', vat: 'VAT number', toAdd: 'To be added before launch',
            responsible: 'Responsible for content', responsibleV: 'The directors of Aurelia Fine Jewelry'
          }
        },
        home: {
          hubEyebrow: 'The boutique', hubTitle: 'Find your piece', hubAll: 'All pieces',
          shopTitle: 'Shop by piece', explore: 'Explore',
          featEyebrow: 'Pieces to keep', featTitle: 'Chosen this season', featAll: 'The boutique',
          featCollections: 'The collections',
          doorsEyebrow: 'Ways to begin', doorsTitle: 'More from the house', begin: 'Begin',
          journalEyebrow: 'From the journal', journalAll: 'All stories', read: 'Read'
        },
        notFound: {
          title: 'Page not found', eyebrow: 'Error 404', heading: 'Slipped away',
          text: 'The page you were looking for has moved, or never was. Search the house, or begin again from one of these.',
          search: 'Search Aurelia', home: 'Return home',
          description: 'This page could not be found. Search Aurelia or return to the boutique.'
        }
      }
    },

    /* the hero names all four kinds of piece the hub offers (pendants have their own tile). Core's line is replaced
       here; the FR/DE lines live in the translator's files (09-lang-*.js, hero.lede) and should name pendants too. */
    hero: {
      lede: 'Rings, bracelets, earrings and pendants cast, set and polished by hand in our atelier. Made to be worn every day, and to be handed down.'
    },

    home: {
      meta: {
        description: 'Aurelia fine jewelry: rings, bracelets, earrings and pendants in recycled 18k gold, cast, set and polished by hand since 1984. Shop by piece, design your ring, or book a private viewing.'
      },
      hub: HUB,
      featured: ['au-rouge-halo', 'au-trinity', 'au-etoile-studs', 'au-soleil-bangle'],
      /* the doors: `art` names the drawing on each (a plate from the atelier's sketchbook, drawn in 11-home.js):
         sketch | box | stone | months | loupe */
      doors: [
        { icon: 'ring', art: 'sketch', title: 'Bespoke', text: 'Design your ring. We draw it, then make it by hand.', href: '#/bespoke' },
        { icon: 'gift', art: 'box', title: 'Gift finder', text: 'Three questions, three ideas worth giving.', href: '#/gifts' },
        { icon: 'gem', art: 'stone', title: 'Gem lab', text: 'Turn a stone in the light: cut, colour, clarity, carat.', href: '#/gem-lab' },
        { icon: 'months', art: 'months', title: 'Birthstones', text: 'Twelve months, twelve stones, one for every birthday.', href: '#/birthstones' },
        { icon: 'pin', art: 'loupe', title: 'Visit', text: 'A private viewing at the atelier, or by video.', href: '#/visit' }
      ],
      atelier: {
        eyebrow: 'The atelier',
        line: 'Four benches, a window onto the street, and one promise kept since 1984: nothing leaves until it is right.',
        link: { label: 'Our story', href: '#/atelier' }
      }
    },

    /* seasonal moods (AU.season, set by atmos): the hero's eyebrow line while one is active */
    seasons: {
      valentine: { eyebrow: 'The Valentine Edit — Rubies, said simply' },
      wedding: { eyebrow: 'The Wedding Season — Bands made in pairs' },
      holiday: { eyebrow: 'The Holiday Edit — Wrapped by hand' }
    },

    /* pages search can find besides the pieces (journal stories are added at search time when the journal exists) */
    search: {
      pages: [
        { title: 'Ring size finder', text: 'Measure with a bank card, or a ring you own', href: '#/size', keywords: 'size sizing measure finger fit chart sizer' },
        { title: 'Gift finder', text: 'Three questions, three suggestions', href: '#/gifts', keywords: 'gift present idea birthday anniversary christmas' },
        { title: 'Gem lab', text: 'Cut, colour, clarity and carat, in the light', href: '#/gem-lab', keywords: 'gem stone diamond cut colour color clarity carat 4c learn' },
        { title: 'Birthstones', text: 'A stone for every month', href: '#/birthstones', keywords: 'birthstone month garnet amethyst aquamarine pearl opal birthday' },
        { title: 'Stack builder', text: 'Two or three bands on one finger', href: '#/stack', keywords: 'stack stacking band bands wedding eternity combine' },
        { title: 'Bespoke', text: 'Design your ring, made by hand', href: '#/bespoke', keywords: 'bespoke custom design configurator engagement engraving' },
        { title: 'Visit', text: 'Book a private viewing', href: '#/visit', keywords: 'visit appointment book booking viewing showroom atelier video' },
        { title: 'Client care', text: 'Delivery, returns, care, resizing, warranty', href: '#/care', keywords: 'care delivery shipping returns repair resize resizing warranty faq cleaning' },
        { title: 'Collections', text: 'Eternal Grace, Maison Rouge, Lumière, Heirloom', href: '#/collections', keywords: 'collections collection' },
        { title: 'The atelier', text: 'Our story, since 1984', href: '#/atelier', keywords: 'atelier story about history workshop craft' },
        { title: 'Journal', text: 'Stories from the bench', href: '#/journal', keywords: 'journal stories blog read' },
        { title: 'Compare', text: 'Up to three pieces side by side', href: '#/compare', keywords: 'compare comparison side' },
        { title: 'Contact', text: 'Write, call, or come and see us', href: '#/care?at=care-help-t', keywords: 'contact phone telephone call email mail write message address hours help question' },
        { title: 'Legal', text: 'Privacy, terms of sale, imprint', href: '#/legal', keywords: 'legal privacy policy data cookies gdpr terms conditions sale imprint company' }
      ],
      /* more words each page answers to, in all three languages, by href. The translations replace the pages'
         keywords with their own, so what a visitor types in any language (an address, opening hours, privacy) is
         listed here, where nothing replaces it. */
      more: {
        '#/visit': 'address directions where find map location opening hours open times showroom salon london adresse plan horaires ouverture anfahrt wegbeschreibung standort offnungszeiten geoffnet',
        '#/care?at=care-help-t': 'contact phone telephone call email write address hours kontakt telefon anrufen schreiben adresse contacter telephone ecrire appeler courriel',
        '#/care': 'help service support aide entretien kundenservice pflege',
        '#/legal': 'privacy policy data cookies gdpr terms conditions sale imprint legal notice confidentialite donnees conditions generales cgv mentions legales datenschutz agb impressum rechtliches',
        '#/size': 'ring size taille tour de doigt ringgrosse grosse messen',
        '#/gifts': 'cadeau geschenk',
        '#/bespoke': 'sur mesure nach mass massanfertigung'
      }
    }
  });

  /* French and German for the strings added in round 2 (the translator's files, 09-lang-*.js, load later and keep
     everything else; they may take these over). */
  if (AU.addLang) {
    /* the two pages added to search in round 2 sit after the twelve the translations already name (an override array
       replaces by index, and holes are kept) */
    var pagesFr = [], pagesDe = [];
    pagesFr[12] = { title: 'Contact', text: 'Écrire, appeler, ou venir nous voir' };
    pagesFr[13] = { title: 'Informations légales', text: 'Confidentialité, conditions de vente, mentions légales' };
    pagesDe[12] = { title: 'Kontakt', text: 'Schreiben, anrufen oder vorbeikommen' };
    pagesDe[13] = { title: 'Rechtliches', text: 'Datenschutz, AGB, Impressum' };
    AU.addLang('fr', { search: { pages: pagesFr } });
    AU.addLang('de', { search: { pages: pagesDe } });
    AU.addLang('fr', { ui: { shell: {
      head: { care: 'Service client' },
      legal: {
        metaTitle: 'Informations légales', metaDesc: 'Confidentialité, conditions de vente et mentions légales d’Aurelia Joaillerie.',
        eyebrow: 'Informations légales', title: 'Les petits caractères',
        note: 'Texte provisoire, écrit pour montrer cette page. La politique de confidentialité, les conditions de vente et les mentions légales de la maison le remplaceront avant la mise en ligne.',
        toc: 'Sur cette page', more: 'En savoir plus',
        sections: [
          { title: 'Confidentialité', paras: [
            'Nous ne demandons que ce qu’il faut pour prendre soin de vous : votre nom et la façon de vous joindre lorsque vous commandez, réservez une présentation ou recevez notre lettre, et l’adresse où voyagent vos pièces.',
            'Votre panier, vos pièces enregistrées et vos préférences (langue, devise, clair ou sombre) restent dans votre propre navigateur. Nous ne déposons aucun cookie publicitaire, et nous ne vendons ni ne partageons jamais vos données.',
            'Le paiement a lieu sur la page sécurisée de notre prestataire. Nous ne voyons ni ne conservons jamais le numéro de votre carte.',
            'Vous pouvez à tout moment demander à consulter, corriger ou effacer ce que nous conservons à votre sujet. Écrivez à {email}.'
          ] },
          { title: 'Conditions de vente', paras: [
            'Les prix sont affichés dans la devise de votre choix et incluent la TVA lorsqu’elle s’applique. Le prix payé est celui confirmé lors de la commande.',
            'Chaque pièce est faite à la main. Les pièces disponibles quittent l’atelier sous deux jours ouvrés, assurées et remises contre signature ; les pièces faites sur commande demandent le délai indiqué sur leur page.',
            'Vous pouvez retourner une pièce qui n’a pas été portée dans les 30 jours suivant la livraison. Les pièces gravées et celles créées selon votre dessin sont faites pour vous seul et ne peuvent être retournées, mais nous les mettrons toujours à votre taille.',
            'Chaque pièce bénéficie d’une garantie à vie contre tout défaut de fabrication.'
          ], link: { label: 'Livraison, retours et garantie' } },
          { title: 'Mentions légales', paras: ['Ce site est édité par la maison Aurelia.'] }
        ],
        facts: {
          company: 'Société', companyV: 'Aurelia Joaillerie', office: 'Atelier', contact: 'Contact',
          register: 'Registre du commerce', vat: 'Numéro de TVA', toAdd: 'À compléter avant la mise en ligne',
          responsible: 'Directeur de la publication', responsibleV: 'La direction d’Aurelia Joaillerie'
        }
      },
      footer: { opening: 'Horaires : {hours}' }
    } } });
    AU.addLang('de', { ui: { shell: {
      head: { care: 'Kundenservice' },
      legal: {
        metaTitle: 'Rechtliches', metaDesc: 'Datenschutz, Verkaufsbedingungen und Impressum von Aurelia Schmuck.',
        eyebrow: 'Rechtliches', title: 'Das Kleingedruckte',
        note: 'Platzhaltertext, geschrieben, um diese Seite zu zeigen. Datenschutzerklärung, Verkaufsbedingungen und Impressum des Hauses ersetzen ihn vor dem Start.',
        toc: 'Auf dieser Seite', more: 'Mehr erfahren',
        sections: [
          { title: 'Datenschutz', paras: [
            'Wir fragen nur, was wir brauchen, um uns um Sie zu kümmern: Ihren Namen und wie wir Sie erreichen, wenn Sie bestellen, einen Termin buchen oder unseren Brief erhalten, und die Adresse, an die Ihre Stücke reisen.',
            'Ihre Tasche, Ihre gemerkten Stücke und Ihre Einstellungen (Sprache, Währung, hell oder dunkel) bleiben in Ihrem eigenen Browser. Wir setzen keine Werbe-Cookies und verkaufen oder teilen Ihre Daten niemals.',
            'Die Zahlung erfolgt auf der eigenen sicheren Seite unseres Zahlungsanbieters. Ihre Kartennummer sehen oder speichern wir nie.',
            'Sie können jederzeit verlangen, einzusehen, zu berichtigen oder zu löschen, was wir über Sie gespeichert haben. Schreiben Sie an {email}.'
          ] },
          { title: 'Verkaufsbedingungen', paras: [
            'Die Preise werden in der von Ihnen gewählten Währung angezeigt und enthalten, wo sie anfällt, die Mehrwertsteuer. Es gilt der beim Bezahlen bestätigte Preis.',
            'Jedes Stück wird von Hand gefertigt. Vorrätige Stücke verlassen das Atelier innerhalb von zwei Werktagen, versichert und gegen Unterschrift; auf Bestellung gefertigte Stücke brauchen die auf ihrer Seite genannte Zeit.',
            'Ungetragene Stücke können Sie innerhalb von 30 Tagen nach der Lieferung zurückgeben. Gravierte Stücke und Stücke nach Ihrem eigenen Entwurf werden allein für Sie gefertigt und sind vom Umtausch ausgeschlossen; die Größe passen wir aber immer an.',
            'Jedes Stück trägt eine lebenslange Garantie auf jeden Fehler in seiner Fertigung.'
          ], link: { label: 'Versand, Rückgabe und Garantie' } },
          { title: 'Impressum', paras: ['Diese Website wird vom Haus Aurelia herausgegeben.'] }
        ],
        facts: {
          company: 'Unternehmen', companyV: 'Aurelia Schmuck', office: 'Atelier', contact: 'Kontakt',
          register: 'Handelsregister', vat: 'USt-IdNr.', toAdd: 'Wird vor dem Start ergänzt',
          responsible: 'Verantwortlich für den Inhalt', responsibleV: 'Die Geschäftsführung von Aurelia Schmuck'
        }
      },
      footer: { opening: 'Geöffnet {hours}' }
    } } });
    AU.addLang('fr', { ui: { shell: {
      mega:{ services: { title: 'Services', links: [{ label: 'Sur mesure' }, { label: 'Trouver sa taille' }, { label: 'Service client' }, { label: 'Prendre rendez-vous' }], speak: 'Parler à l’atelier' } },
      search: { quick: 'Accès rapides', quickLinks: [{ label: 'Trouver sa taille' }, { label: 'Service client' }, { label: 'Livraison & retours' }, { label: 'Prendre rendez-vous' }, { label: 'Contact' }] },
      footer: {
        brandLine: 'Joaillerie, façonnée à la main depuis {year}',
        extra: [[{ label: 'Boutique' }], [], [{ label: 'Garantie' }, { label: 'Questions' }]],
        legalNav: 'Informations légales',
        legalLinks: [{ label: 'Confidentialité' }, { label: 'Conditions de vente' }, { label: 'Mentions légales' }]
      },
      home: { shopTitle: 'Choisir par pièce', explore: 'Découvrir', featCollections: 'Les collections', begin: 'Commencer' },
      hero: { view: 'Voir la pièce' },
      care: {
        title: 'Service client',
        lede: 'Une personne de l’atelier vous répond, le plus souvent dans la journée.',
        hoursLabel: 'Par téléphone', hours: 'Lun – Sam, 09:00 – 18:00',
        links: [{ label: 'Service client' }, { label: 'Trouver sa taille' }, { label: 'Livraison & retours' }, { label: 'Prendre rendez-vous' }]
      }
    } } });
    AU.addLang('de', { ui: { shell: {
      mega: { services: { title: 'Service', links: [{ label: 'Nach Maß' }, { label: 'Ringgröße finden' }, { label: 'Kundenservice' }, { label: 'Termin vereinbaren' }], speak: 'Mit dem Atelier sprechen' } },
      search: { quick: 'Direkt zu', quickLinks: [{ label: 'Ringgröße finden' }, { label: 'Kundenservice' }, { label: 'Versand & Rückgabe' }, { label: 'Termin vereinbaren' }, { label: 'Kontakt' }] },
      footer: {
        brandLine: 'Schmuck, von Hand gefertigt seit {year}',
        extra: [[{ label: 'Boutique' }], [], [{ label: 'Garantie' }, { label: 'Fragen' }]],
        legalNav: 'Rechtliches',
        legalLinks: [{ label: 'Datenschutz' }, { label: 'AGB' }, { label: 'Impressum' }]
      },
      home: { shopTitle: 'Nach Schmuckstück', explore: 'Entdecken', featCollections: 'Die Kollektionen', begin: 'Beginnen' },
      hero: { view: 'Das Schmuckstück ansehen' },
      care: {
        title: 'Kundenservice',
        lede: 'Ein Mensch aus dem Atelier antwortet, meist noch am selben Tag.',
        hoursLabel: 'Telefonisch', hours: 'Mo – Sa, 09:00 – 18:00',
        links: [{ label: 'Kundenservice' }, { label: 'Ringgröße finden' }, { label: 'Versand & Rückgabe' }, { label: 'Termin vereinbaren' }]
      }
    } } });
  }

  /* every spec the shell renders, for tools/prerender.js. Concatenated onto what earlier content files added, never
     replacing it (extendContent replaces arrays). */
  var extra = [];
  HUB.forEach(function (h) { extra.push(h.spec); });
  (AU.content.collections || []).forEach(function (c) { if (c.spec) extra.push(c.spec); });
  var prev = (AU.content.prerender && AU.content.prerender.extra) || [];
  AU.extendContent({ prerender: { extra: prev.concat(extra) } });
})();
