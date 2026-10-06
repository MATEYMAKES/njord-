/* ---- 09-lang-fr.js ---- */
/* Aurelia — French (idea 27). A partial override of the merged English content (01-content.js, 02-content-*.js and
   the strings areas add with AU.extendContent). Arrays merge by index, so every list keeps the English order; ids,
   prices, specs, hrefs and brand/collection names are never repeated here. Placeholders ({n}, {name}…) are kept as is.
   Product names: the house name (Grace, Rouge, Lumière, Trinity, Verdant, Aurum, Ligne, Soleil, Étoile, Larme, Cerise,
   Nuit) never changes; the piece type that goes with it is translated and comes first, as a French maison writes it
   ('Jonc Soleil', 'Puces Étoile'). Collection names (Eternal Grace, Maison Rouge, Lumière, Heirloom) stay as they are.
   Written as a French maison would write it: vouvoiement, calm, precise, never literal. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.addLang) return;

  /* ---------- base content (01-content.js) ---------- */
  AU.addLang('fr', {
    brand: { edition: 'N° 2.0 — Joaillerie' },

    ui: { core: { skip: 'Aller au contenu' } },

    nav: [
      { label: 'Collections' },
      { label: 'Boutique' },
      { label: 'Sur mesure' },
      { label: 'Atelier' },
      { label: 'Journal' },
      { label: 'Rendez-vous' }
    ],

    hero: {
      eyebrow: 'Joaillerie — Façonnée à la main depuis 1984',
      lede: 'Bagues, bracelets, boucles d’oreilles et pendentifs fondus, sertis et polis à la main dans notre atelier. Faits pour être portés chaque jour, et transmis.',
      primary: { label: 'Découvrir la boutique' },
      secondary: { label: 'Prendre rendez-vous' }
    },

    marquee: ['Façonné à la main depuis 1984', 'Eternal Grace', 'Or 18 carats recyclé', 'Serti à la main', 'Fait pour être transmis'],

    collections: [
      { kicker: 'Mariage & Fiançailles',
        text: 'Solitaires et trilogies pour les promesses qui durent. Chaque diamant choisi à l’œil, chaque griffe sertie à la main.' },
      { kicker: 'Rubis & Or rose',
        text: 'La couleur de notre maison, faite pierre. Des rubis d’un rouge profond sur un or rose chaleureux, de la manchette de tous les jours aux pendants du soir.' },
      { kicker: 'Diamants sur or blanc',
        text: 'La lumière, et rien d’autre. Rivières, alliances éternité et puces d’oreilles qui captent chaque lampe de la pièce.' },
      { kicker: 'Pierres de couleur, tailles à degrés',
        text: 'Émeraudes et saphirs dans les tailles anciennes, plus lourds et plus lents, pour passer d’une main à l’autre.' }
    ],

    products: [
      { name: 'Solitaire Grace',
        text: 'Un brillant rond tenu haut par six fines griffes, sur un anneau délié en or jaune 18 carats.',
        details: ['Diamant taille brillant de 1,00 ct', 'Or jaune 18 carats recyclé', 'Largeur de l’anneau 1,8 mm', 'Réalisée sur commande en 3 à 4 semaines'] },
      { name: 'Entourage Rouge',
        text: 'Un rubis ovale entouré de minuscules diamants blancs, serti sur or rose 18 carats.',
        details: ['Rubis ovale de 1,20 ct', 'Entourage de diamants de 0,18 ct', 'Or rose 18 carats recyclé', 'Réalisée sur commande en 4 semaines'] },
      { name: 'Alliance Lumière',
        text: 'Des diamants ronds tout autour de l’anneau, sertis à griffes partagées, si bien que la bague est plus lumière que métal.',
        details: ['1,50 ct de diamants au total', 'Or blanc 18 carats recyclé', 'Largeur de l’anneau 2,2 mm', 'Mise à taille sur commande'] },
      { name: 'Trilogie Trinity',
        text: 'Un saphir coussin entre deux diamants ronds : le passé, le présent, et ce qui vient.',
        details: ['Saphir coussin de 1,40 ct', '0,60 ct de diamants latéraux', 'Or blanc 18 carats recyclé', 'Réalisée sur commande en 4 à 5 semaines'] },
      { name: 'Solitaire Verdant',
        text: 'Une émeraude taille émeraude, ses longues facettes comme une eau calme, dans un panier à quatre griffes en or jaune.',
        details: ['Émeraude taille émeraude de 1,80 ct', 'Or jaune 18 carats recyclé', 'Largeur de l’anneau 2,0 mm', 'Réalisée sur commande en 5 semaines'] },
      { name: 'Anneau Aurum',
        text: 'Un anneau simple, doucement bombé et poli comme un miroir. La bague à l’aune de laquelle on mesure toutes les autres.',
        details: ['Or jaune 18 carats recyclé', 'Confort, 3 mm', 'Gravure offerte', 'Prête à être expédiée'] },
      { name: 'Rivière Ligne',
        text: 'Quarante-deux diamants ronds sur une ligne souple d’or blanc qui coule au poignet comme de l’eau.',
        details: ['4,20 ct de diamants au total', 'Or blanc 18 carats recyclé', 'Fermoir à boîte et sécurité', 'Longueur 17 cm'] },
      { name: 'Jonc Soleil',
        text: 'Un jonc ovale massif en or jaune, fini à la main jusqu’à briller comme un soleil bas.',
        details: ['Or jaune 18 carats recyclé', 'Charnière, profil de 4 mm', 'Circonférence intérieure 17 cm', 'Prêt à être expédié'] },
      { name: 'Manchette Rouge',
        text: 'Une manchette ouverte en or rose, un rubis à chaque extrémité, face à face.',
        details: ['Deux rubis ovales de 0,40 ct', 'Or rose 18 carats recyclé', 'Manchette ouverte ajustable', 'Réalisée sur commande en 3 semaines'] },
      { name: 'Puces Étoile',
        text: 'Des diamants taille brillant tenus par quatre griffes d’or blanc. La paire que l’on ne quitte jamais.',
        details: ['0,80 ct de diamants au total', 'Or blanc 18 carats recyclé', 'Fermoirs à vis', 'Prêtes à être expédiées'] },
      { name: 'Pendants Larme',
        text: 'Des émeraudes en poire qui tombent d’un unique diamant, et se balancent quand vous tournez la tête.',
        details: ['Deux émeraudes poire de 0,90 ct', 'Diamants de 0,20 ct en tête', 'Or jaune 18 carats recyclé', 'Longueur 28 mm'] },
      { name: 'Créoles Cerise',
        text: 'De fines créoles en or rose, la face avant ourlée de minuscules rubis.',
        details: ['0,60 ct de rubis au total', 'Or rose 18 carats recyclé', 'Diamètre 18 mm', 'Fermeture à charnière'] },
      { name: 'Pendentif Grace',
        text: 'Un diamant rond qui semble flotter sur une fine chaîne d’or jaune.',
        details: ['Diamant taille brillant de 0,70 ct', 'Or jaune 18 carats recyclé', 'Chaîne de 42 à 45 cm, ajustable', 'Prêt à être expédié'] },
      { name: 'Pendentif Nuit',
        text: 'Un saphir poire, le bleu du ciel une heure après le coucher du soleil, sous un unique diamant.',
        details: ['Saphir poire de 1,10 ct', 'Diamant de 0,10 ct', 'Or blanc 18 carats recyclé', 'Chaîne de 42 à 45 cm, ajustable'] }
    ],

    atelier: {
      eyebrow: 'L’Atelier',
      title: 'Façonné à la main depuis 1984',
      lede: 'Quatre établis, une fenêtre sur la rue, et la même promesse depuis plus de quarante ans : rien ne sort d’ici avant d’être juste.',
      stats: [
        { label: 'Notre première bague' },
        { label: 'Années à l’établi' },
        { value: '18 ct', label: 'Uniquement de l’or recyclé' },
        { value: '100 %', label: 'Serti et fini à la main' }
      ],
      steps: [
        { title: 'Dessiner', text: 'Chaque pièce naît d’un croquis au crayon, grandeur nature, dessiné et redessiné jusqu’à ce que les proportions soient justes.' },
        { title: 'Fondre', text: 'Le dessin est sculpté dans la cire, puis fondu en or 18 carats recyclé, affiné et allié dans notre propre atelier.' },
        { title: 'Sertir', text: 'Chaque pierre est sertie sous la loupe, griffe après griffe, et vérifiée sous tous les angles avant la suivante.' },
        { title: 'Achever', text: 'Polie à la main comme un miroir, poinçonnée, puis examinée une dernière fois avant d’être mise en écrin pour vous.' }
      ]
    },

    bespoke: {
      eyebrow: 'Sur mesure',
      title: 'Dessinez votre bague',
      lede: 'Choisissez la monture, le métal et la pierre. Nous la dessinerons, vous montrerons les pierres en personne, et la réaliserons à la main.',
      styles: [{ label: 'Solitaire' }, { label: 'Entourage' }, { label: 'Trilogie' }, { label: 'Éternité' }],
      metals: [{ label: 'Or jaune' }, { label: 'Or rose' }, { label: 'Or blanc' }],
      cuts: [{ label: 'Rond' }, { label: 'Ovale' }, { label: 'Poire' }, { label: 'Émeraude' }, { label: 'Coussin' }]
    },

    voices: [
      { quote: 'Ils ont redessiné la bague de ma grand-mère à partir d’une seule photographie pâlie, et l’ont refaite, à l’identique. J’ai pleuré dans la boutique.', place: 'Cliente sur mesure' },
      { quote: 'La rivière n’a pas quitté mon poignet depuis deux ans. Elle est plus belle aujourd’hui que le jour où je l’ai achetée.', place: 'Collection Lumière' },
      { quote: 'Patients, honnêtes sur chaque pierre, et jamais pressés. Nos alliances ont été faites côte à côte.', place: 'Collection Eternal Grace' }
    ],

    promises: [
      { title: 'Livraison assurée', text: 'Offerte, assurée et remise contre signature, dans notre écrin bordeaux.' },
      { title: 'Soin à vie', text: 'Nettoyage, contrôle des griffes et polissage, aussi longtemps que vous la porterez.' },
      { title: 'Mise à taille offerte', text: 'Une mise à taille offerte sur toute bague au cours de la première année.' },
      { title: 'Gravure', text: 'Un prénom, une date ou quelques mots, gravés à la main sans frais.' }
    ],

    visit: {
      eyebrow: 'Rendez-vous',
      title: 'Une présentation privée',
      lede: 'Venez vous asseoir avec nous à l’atelier, ou rejoignez-nous en vidéo. Les pièces qui vous intriguent vous attendront sur le plateau, avec le temps de répondre à chaque question.',
      places: [
        { name: 'L’Atelier', lines: ['18 Goldsmiths’ Row', 'Atelier et salon'], hours: 'Mardi – samedi, 10 h – 18 h' },
        { name: 'En vidéo', lines: ['Où que vous soyez', 'Les pièces présentées sous la loupe, en direct'], hours: 'Lundi – samedi, 9 h – 20 h' }
      ],
      reasons: ['Bague de fiançailles', 'Alliances', 'Un cadeau', 'Création sur mesure', 'Réparation ou mise à taille', 'Simple curiosité']
    },

    footer: {
      newsletter: { title: 'Lettres de l’atelier', text: 'Les nouvelles pièces, leurs histoires, et parfois une invitation. Quelques fois par an, jamais davantage.' },
      columns: [
        { title: 'La Maison', links: [{ label: 'Notre histoire' }, { label: 'Collections' }, { label: 'Journal' }, { label: 'Pierres de naissance' }] },
        { title: 'Découvrir', links: [{ label: 'Sur mesure' }, { label: 'Idées cadeaux' }, { label: 'Laboratoire des gemmes' }, { label: 'Composer un ensemble' }] },
        { title: 'Service client', links: [{ label: 'Prendre rendez-vous' }, { label: 'Trouver sa taille' }, { label: 'Entretien & réparations' }, { label: 'Livraison & retours' }] }
      ],
      legal: 'Aurelia Joaillerie. Toutes nos pièces sont façonnées à la main.'
    }
  });

  /* ---------- shell: header, mega menu, preferences, search, menu, footer, home, 404 (02-content-shell.js) ---------- */
  AU.addLang('fr', {
    ui: {
      shell: {
        intro: { edition: 'N° 2.0 — Joaillerie', skip: 'Passer l’introduction' },
        head: {
          home: 'Aurelia, accueil', nav: 'Navigation principale', search: 'Rechercher', wish: 'Favoris', bag: 'Panier',
          prefs: 'Préférences', menu: 'Ouvrir le menu', count1: '{n} pièce', countN: '{n} pièces'
        },
        mega: {
          label: 'Collections', collections: 'Les collections', byPiece: 'Par pièce', allCollections: 'Toutes les collections',
          allPieces: 'Toutes les pièces', explore: 'Découvrir'
        },
        types: { ring: 'Bagues', bracelet: 'Bracelets', earrings: 'Boucles d’oreilles', pendant: 'Pendentifs' },
        prefs: {
          title: 'Préférences', close: 'Fermer les préférences',
          language: 'Langue', currency: 'Devise', sound: 'Son', appearance: 'Apparence', season: 'Saison',
          on: 'Activé', off: 'Désactivé', dark: 'Sombre', light: 'Clair',
          seasons: { auto: 'Auto', none: 'Aucune', valentine: 'Saint-Valentin', wedding: 'Mariages', holiday: 'Fêtes' },
          soundNote: 'Un carillon discret lorsqu’une pièce rejoint le panier.',
          seasonNote: 'Auto suit le calendrier.'
        },
        search: {
          label: 'Rechercher chez Aurelia', placeholder: 'Une bague, une pierre, une page', close: 'Fermer la recherche', try: 'Essayez',
          chips: ['Bagues', 'Diamants', 'Or rose', 'Taille de bague', 'Cadeaux'],
          pieces: 'Pièces', pages: 'Pages', count1: '{n} résultat', countN: '{n} résultats',
          emptyTitle: 'Aucun résultat pour « {q} »',
          emptyText: 'Essayez une pierre, un métal ou une collection, ou posez-nous la question lors d’une présentation privée.',
          results: 'Résultats', page: 'Page', story: 'Journal'
        },
        menu: { label: 'Menu', close: 'Fermer le menu', discover: 'Découvrir', saved: 'Favoris', bag: 'Panier', prefs: 'Préférences' },
        hero: {
          drag: 'Faites glisser pour tourner', choose: 'Choisir la pièce présentée', cue: 'Choisir par pièce',
          stageLabel: '{name}, qui tourne lentement. Faites glisser pour la faire tourner.', artLabel: 'Dessin au trait d’une bague'
        },
        footer: {
          letter: 'La lettre', email: 'Votre e-mail', placeholder: 'nom@exemple.fr', join: 'S’inscrire',
          sending: 'Envoi en cours',
          thanks: 'Merci — votre inscription est confirmée.',
          previewNote: 'Ce site est un aperçu : votre adresse a été vérifiée, mais n’a encore été envoyée nulle part.',
          errEmpty: 'Merci d’indiquer votre e-mail.', errBad: 'Cette adresse e-mail semble incomplète.',
          errSend: 'Votre inscription n’a pas pu aboutir pour le moment. Merci de réessayer dans un instant.',
          contact: 'Contact', appearance: 'Apparence', darkMode: 'Mode sombre', top: 'Haut de page',
          since: 'Façonné à la main depuis {year}',
          opensIg: '(ouvre Instagram)'
        },
        home: {
          hubEyebrow: 'La boutique', hubTitle: 'Trouvez votre pièce', hubAll: 'Toutes les pièces',
          featEyebrow: 'Pièces à garder', featTitle: 'Choisies cette saison', featAll: 'La boutique',
          doorsEyebrow: 'Pour commencer', doorsTitle: 'Plus de la Maison',
          journalEyebrow: 'Du journal', journalAll: 'Tous les récits', read: 'Lire'
        },
        notFound: {
          title: 'Page introuvable', eyebrow: 'Erreur 404', heading: 'Envolée',
          text: 'La page que vous cherchiez a changé de place, ou n’a jamais existé. Cherchez dans la Maison, ou repartez de l’un de ces chemins.',
          search: 'Rechercher chez Aurelia', home: 'Retour à l’accueil',
          description: 'Cette page est introuvable. Recherchez chez Aurelia ou revenez à la boutique.'
        }
      }
    },

    home: {
      meta: {
        description: 'Aurelia, joaillerie : bagues, bracelets, boucles d’oreilles et pendentifs en or 18 carats recyclé, fondus, sertis et polis à la main depuis 1984. Choisissez par pièce, dessinez votre bague ou réservez une présentation privée.'
      },
      hub: [{ label: 'Bagues' }, { label: 'Bracelets' }, { label: 'Boucles d’oreilles' }, { label: 'Pendentifs' }],
      doors: [
        { title: 'Sur mesure', text: 'Dessinez votre bague. Nous la dessinons, puis la façonnons à la main.' },
        { title: 'Idées cadeaux', text: 'Trois questions, trois idées dignes d’être offertes.' },
        { title: 'Laboratoire des gemmes', text: 'Tournez une pierre dans la lumière : taille, couleur, pureté, carats.' },
        { title: 'Pierres de naissance', text: 'Douze mois, douze pierres, une pour chaque anniversaire.' },
        { title: 'Rendez-vous', text: 'Une présentation privée à l’atelier, ou en vidéo.' }
      ],
      atelier: {
        eyebrow: 'L’atelier',
        line: 'Quatre établis, une fenêtre sur la rue, et une promesse tenue depuis 1984 : rien ne sort d’ici avant d’être juste.',
        link: { label: 'Notre histoire' }
      }
    },

    seasons: {
      valentine: { eyebrow: 'La Sélection Saint-Valentin — Des rubis, tout simplement' },
      wedding: { eyebrow: 'La Saison des mariages — Des alliances faites par deux' },
      holiday: { eyebrow: 'La Sélection des Fêtes — Emballée à la main' }
    },

    search: {
      pages: [
        { title: 'Trouver sa taille', text: 'Mesurez avec une carte bancaire, ou une bague que vous possédez', keywords: 'taille tour de doigt mesurer doigt ajuster guide baguier size sizing measure finger fit chart sizer' },
        { title: 'Idées cadeaux', text: 'Trois questions, trois suggestions', keywords: 'cadeau présent idée anniversaire noël fête gift present idea birthday anniversary christmas' },
        { title: 'Laboratoire des gemmes', text: 'Taille, couleur, pureté et carats, dans la lumière', keywords: 'gemme pierre diamant taille couleur pureté carat 4c apprendre gem stone diamond cut colour color clarity learn' },
        { title: 'Pierres de naissance', text: 'Une pierre pour chaque mois', keywords: 'pierre de naissance mois grenat améthyste aigue-marine perle opale anniversaire birthstone month garnet amethyst aquamarine pearl opal birthday' },
        { title: 'Composer un ensemble', text: 'Deux ou trois anneaux sur un même doigt', keywords: 'ensemble superposer anneau anneaux alliance éternité associer stack stacking band bands wedding eternity combine' },
        { title: 'Sur mesure', text: 'Dessinez votre bague, façonnée à la main', keywords: 'sur mesure personnalisé création configurateur fiançailles gravure bespoke custom design configurator engagement engraving' },
        { title: 'Rendez-vous', text: 'Réserver une présentation privée', keywords: 'visite rendez-vous réserver réservation présentation salon atelier vidéo visit appointment book booking viewing showroom video' },
        { title: 'Service client', text: 'Livraison, retours, entretien, mise à taille, garantie', keywords: 'entretien livraison expédition retours réparation mise à taille garantie questions nettoyage care delivery shipping returns repair resize warranty faq cleaning' },
        { title: 'Collections', text: 'Eternal Grace, Maison Rouge, Lumière, Heirloom', keywords: 'collections collection' },
        { title: 'L’atelier', text: 'Notre histoire, depuis 1984', keywords: 'atelier histoire à propos savoir-faire artisanat story about history workshop craft' },
        { title: 'Journal', text: 'Récits de l’établi', keywords: 'journal récits histoires lire blog stories read' },
        { title: 'Comparer', text: 'Jusqu’à trois pièces côte à côte', keywords: 'comparer comparaison côte à côte compare comparison side' }
      ]
    }
  });

  /* ---------- shop: collections, boutique, product pages, compare, bag, checkout (02-content-shop.js) ---------- */
  AU.addLang('fr', {
    ui: {
      shop: {
        metals: { yellow: 'Or jaune 18 carats', rose: 'Or rose 18 carats', white: 'Or blanc 18 carats' },
        metalShort: { yellow: 'Or jaune', rose: 'Or rose', white: 'Or blanc' },
        stones: {
          diamond: 'Diamant', ruby: 'Rubis', emerald: 'Émeraude', sapphire: 'Saphir', garnet: 'Grenat', amethyst: 'Améthyste',
          aquamarine: 'Aigue-marine', peridot: 'Péridot', citrine: 'Citrine', topaz: 'Topaze', tourmaline: 'Tourmaline',
          tanzanite: 'Tanzanite', pearl: 'Perle', opal: 'Opale', none: 'Or seul'
        },
        cuts: { round: 'Taille brillant', oval: 'Ovale', pear: 'Poire', emerald: 'Taille émeraude', cushion: 'Coussin' },
        types: { all: 'Tout', ring: 'Bagues', bracelet: 'Bracelets', earrings: 'Boucles d’oreilles', pendant: 'Pendentifs' },
        typeOne: { ring: 'Bague', bracelet: 'Bracelet', earrings: 'Boucles d’oreilles', pendant: 'Pendentif' },
        size: 'Taille {s}',
        sizeTbc: 'Taille à confirmer',
        engraved: 'Gravé « {t} »',

        pieces: '{n} pièces',
        piece: '{n} pièce',
        explore: 'Découvrir',
        exploreAria: 'Découvrir {name}',
        save: 'Favoris',
        saved: 'En favoris',
        saveAria: 'Ajouter {name} à vos favoris',
        unsaveAria: 'Retirer {name} de vos favoris',
        savedToast: 'Ajoutée à vos favoris',
        unsavedToast: 'Retirée de vos favoris',
        compare: 'Comparer',
        compareAria: 'Comparer {name}',
        compareFull: 'Vous pouvez comparer jusqu’à trois pièces à la fois.',
        compareAdded: 'Ajoutée à la comparaison',
        addToBag: 'Ajouter',   // the product page's buy row leaves ~90px at 1080 (see report); 'Ajouter au panier' when it has room
        added: 'Ajoutée',
        addedToast: 'Ajoutée à votre panier',
        viewPiece: 'Voir {name}',
        moveHint: 'Survolez une pièce pour la faire tourner dans la lumière.',
        touchHint: 'Touchez une pièce pour la voir de plus près.',
        back: 'Retour',

        collections: {
          eyebrow: 'Les Collections',
          title: 'Quatre maisons',
          lede: 'Quatre maisons dans la Maison, chacune avec sa pierre, son or et sa propre idée de la lumière.',
          index: 'Collection {n} sur 4',
          piecesIn: 'Les pièces',
          all: 'Toutes les collections',
          next: 'Collection suivante',
          viewing: 'Les découvrir en personne',
          viewingText: 'Chaque pièce de {name} peut vous être présentée sur le plateau lors d’une présentation privée, à l’atelier ou en vidéo.',
          book: 'Réserver une présentation privée',
          missingTitle: 'Cette collection a changé de place',
          missingText: 'Elle porte peut-être un nouveau nom. Les quatre maisons vous attendent sur la page des collections.'
        },

        boutique: {
          eyebrow: 'La Boutique',
          title: 'Pièces à garder',
          lede: 'Fondues, serties et polies à la main dans notre atelier.',
          typeLede: {
            ring: 'Solitaires, entourages et anneaux, chacun mis à taille et fini sur commande.',
            bracelet: 'Rivières, joncs et manchettes, faits pour accompagner le mouvement du poignet.',
            earrings: 'Puces, pendants et créoles qui captent la lumière à chaque mouvement.',
            pendant: 'Des pierres seules qui semblent flotter sur une fine chaîne d’or.'
          },
          filterType: 'Filtrer par type',
          refine: 'Affiner',
          refineN: 'Affiner ({n})',
          refineTitle: 'Affiner la sélection',
          close: 'Fermer',
          collection: 'Collection',
          metal: 'Métal',
          stone: 'Pierre',
          price: 'Prix',
          priceFrom: 'De',
          priceTo: 'À',
          priceMin: 'Prix minimum',
          priceMax: 'Prix maximum',
          sort: 'Trier',
          sortLabel: 'Trier par',
          sorts: { featured: 'Sélection', 'price-asc': 'Prix croissant', 'price-desc': 'Prix décroissant', name: 'Nom, de A à Z' },
          anyCollection: 'Toutes les collections',
          clear: 'Tout effacer',
          remove: 'Retirer le filtre : {name}',
          show: 'Voir {n} pièces',
          showOne: 'Voir 1 pièce',
          showNone: 'Aucune pièce ne correspond',
          active: 'Filtres actifs',
          emptyTitle: 'Rien ici, pour l’instant',
          emptyText: 'Aucune pièce ne correspond à cette sélection pour le moment. L’atelier peut en créer une pour vous.',
          emptyReset: 'Voir toutes les pièces',
          noteEyebrow: 'Sur mesure',
          noteTitle: 'Faite pour une seule main',
          noteText: 'Choisissez la monture, l’or et la pierre. Nous la dessinons avec vous, puis la façonnons à la main.',
          noteLink: 'Dessinez votre bague',
          gridLabel: 'Pièces'
        },

        tray: {
          label: 'Pièces à comparer',
          title: 'Comparer',
          go: 'Comparer {n}',
          clear: 'Effacer',
          remove: 'Retirer {name} de la comparaison',
          room: 'Encore {n} au plus',
          full: 'Prêt à comparer'
        },

        piece: {
          crumbs: 'Fil d’Ariane',
          home: 'Accueil',
          boutique: 'Boutique',
          stageLabel: '{name}, {material}. Faites glisser pour tourner la pièce.',
          drag: 'Faites glisser pour tourner',
          tools: 'Outils d’observation',
          loupe: 'Loupe',
          loupeOn: 'Loupe activée : survolez la pièce',
          light: 'Lumière',
          lights: { studio: 'Studio', daylight: 'Jour', candle: 'Bougie', evening: 'Soirée' },
          lightNow: 'Lumière : {name}',
          tryon: 'Essayer',
          tryonNone: 'L’essayage nécessite une caméra, indisponible ici.',
          turnAria: 'Faire tourner la pièce d’elle-même',
          compare: 'Comparer',
          compareOn: 'En comparaison',
          share: 'Partager',
          shared: 'Lien copié',
          shareFail: 'Copiez l’adresse dans la barre ci-dessus pour partager cette pièce.',
          sizeLabel: 'Taille de bague',
          sizeUnit: '(US)',
          sizeChoose: 'Choisissez votre taille',
          sizeOption: 'US {s}',
          sizeFind: 'Trouver sa taille',
          sizeErr: 'Merci de choisir une taille. Un doute ? Nous la reprenons une fois, sans frais, la première année.',
          engraving: 'Gravure',
          engravingAdd: 'Ajouter une gravure',
          engravingHint: 'Gravée à la main à l’intérieur de l’anneau, sans frais.',
          engravingPlaceholder: 'Un prénom, une date, quelques mots',
          engravingCount: '{n} sur 18',
          engravingSample: 'Toujours',
          engravingPreview: 'Aperçu de la gravure',
          fonts: { script: 'Script', serif: 'Serif', roman: 'Romain' },
          fontLabel: 'Écriture',
          qty: 'Quantité',
          less: 'Un de moins',
          more: 'Un de plus',
          inBag: 'Dans votre panier.',
          viewBag: 'Voir le panier',
          details: 'Détails',
          delivery: 'Livraison & retours',
          care: 'Entretien',
          stackEyebrow: 'Composer',
          stackTitle: 'À porter avec d’autres',
          stackText: 'Voyez cette bague aux côtés de deux autres anneaux sur un même doigt, tournant dans la lumière, avec le prix de l’ensemble.',
          stackLink: 'Composer un ensemble',
          lookEyebrow: 'De la même maison',
          lookTitle: 'Compléter l’allure',
          missingTitle: 'Cette pièce a changé de place',
          missingText: 'Elle a peut-être un nouveau nom, ou une nouvelle demeure. Toutes nos créations vous attendent à la boutique.',
          missingLink: 'Retour à la boutique',
          promises: ['Livraison assurée offerte', 'Une mise à taille offerte la première année', 'Gravure à la main, sans frais']
        },

        info: {
          delivery: [
            'Livraison assurée offerte, remise contre signature, dans notre écrin bordeaux. Les pièces prêtes à être expédiées quittent l’atelier sous deux jours ouvrés ; les pièces réalisées sur commande suivent le délai indiqué dans leurs détails.',
            'Les retours sont acceptés sous 30 jours après la livraison, pièce non portée et dans son écrin. Les pièces gravées et sur mesure sont créées pour vous seulement et ne peuvent être retournées, mais nous les mettrons toujours à votre taille.'
          ],
          care: [
            'L’or et les diamants aiment l’eau tiède, une goutte de savon doux et une brosse souple. Séchez en tamponnant avec un chiffon non pelucheux.',
            'Tenez perles et opales à l’écart du parfum et de l’eau, et rangez chaque pièce dans sa propre pochette afin que les pierres ne se rayent jamais entre elles.',
            'Rapportez-nous toute pièce pour un nettoyage, un contrôle des griffes et un polissage offerts, aussi longtemps que vous la porterez.'
          ]
        },

        comparePage: {
          eyebrow: 'Comparer',
          title: 'Côte à côte',
          lede: 'Jusqu’à trois pièces, qui tournent ensemble. Faites-en glisser une pour les faire toutes tourner.',
          rows: { price: 'Prix', collection: 'Collection', metal: 'Métal', stone: 'Pierre', cut: 'Taille', carat: 'Pierre centrale', details: 'Détails' },
          remove: 'Retirer',
          removeAria: 'Retirer {name} de la comparaison',
          addMore: 'Ajouter une pièce',
          emptyTitle: 'Rien à comparer pour l’instant',
          emptyText: 'Choisissez jusqu’à trois pièces dans la boutique avec « Comparer », elles vous attendront ici.',
          emptyLink: 'Parcourir la boutique',
          canvasLabel: '{names}, qui tournent ensemble. Faites glisser pour les faire tourner.'
        },

        bag: {
          title: 'Votre panier et vos favoris',
          tabs: 'Panier et favoris',
          bag: 'Panier',
          saved: 'Favoris',
          close: 'Fermer le panier',
          listBag: 'Pièces dans votre panier',
          listSaved: 'Vos favoris',
          qtyOf: 'Quantité de {name}',
          less: 'Un de moins',
          more: 'Un de plus',
          removeOne: 'Retirer {name}',
          remove: 'Retirer',
          move: 'Ajouter au panier',
          moved: 'Ajoutée à votre panier',
          subtotal: 'Sous-total',
          ship: 'Livraison assurée offerte, remise contre signature, dans notre écrin bordeaux.',
          checkout: 'Commander',
          emptyBagTitle: 'Votre panier est vide',
          emptyBagText: 'Chaque pièce est façonnée à la main, et la boutique est un bel endroit pour commencer.',
          emptyBagLink: 'Découvrir la boutique',
          emptySavedTitle: 'Aucun favori pour l’instant',
          emptySavedText: 'Touchez le cœur d’une pièce pour la garder ici le temps de vous décider.',
          emptySavedLink: 'Parcourir la boutique'
        },

        checkout: {
          eyebrow: 'Commande',
          title: 'Votre commande',
          steps: ['Récapitulatif', 'Coordonnées', 'Livraison', 'Paiement'],
          stepOf: 'Étape {n} sur 4',
          progress: 'Progression de la commande',
          reviewTitle: 'Vos pièces',
          editBag: 'Modifier le panier',
          detailsTitle: 'Vos coordonnées',
          detailsText: 'Pour vous prévenir lorsque votre pièce quitte l’atelier, et vous appeler avant son arrivée.',
          name: 'Nom complet',
          email: 'E-mail',
          phone: 'Téléphone',
          optional: '(facultatif)',
          errName: 'Merci d’indiquer votre nom.',
          errEmail: 'Merci d’indiquer une adresse e-mail valide.',
          errPhone: 'Merci d’indiquer un numéro auquel vous joindre.',
          errAddress: 'Merci d’indiquer l’adresse.',
          errCity: 'Merci d’indiquer la ville.',
          errPost: 'Merci d’indiquer le code postal.',
          errCountry: 'Merci de choisir un pays.',
          errFix: 'Quelques informations méritent un second regard.',
          deliveryTitle: 'Livraison',
          address: 'Adresse',
          address2: 'Appartement, étage',
          city: 'Ville',
          postcode: 'Code postal',
          country: 'Pays',
          countryChoose: 'Choisissez un pays',
          method: 'Mode de livraison',
          methods: [
            { label: 'Livraison assurée', text: 'Contre signature, en 3 à 5 jours ouvrés' },
            { label: 'Express assurée', text: 'Le jour ouvré suivant, contre signature' },
            { label: 'Retrait à l’atelier', text: 'Sur rendez-vous, sans hâte, avec le temps pour vos questions' }
          ],
          note: 'Une carte manuscrite',
          notePlaceholder: 'Nous l’écrirons à la main et la glisserons dans l’écrin',
          paymentTitle: 'Paiement',
          paymentText: 'Le paiement se fait toujours sur la page sécurisée de notre prestataire. Aurelia ne voit ni ne conserve jamais votre carte.',
          contact: 'Contact',
          shipTo: 'Livraison à',
          collectAt: 'Retrait à l’atelier',
          edit: 'Modifier',
          summary: 'Récapitulatif de la commande',
          subtotal: 'Sous-total',
          delivery: 'Livraison',
          free: 'Offerte',
          total: 'Total',
          qtyN: 'Quantité {n}',
          continue: 'Continuer',
          back: 'Retour',
          toDelivery: 'Passer à la livraison',
          toPayment: 'Passer au paiement',
          pay: 'Payer en toute sécurité',
          payStripe: 'Payer en toute sécurité avec Stripe',
          payShopify: 'Accéder au paiement sécurisé',
          redirecting: 'Nous vous conduisons vers notre page de paiement sécurisée…',
          previewTitle: 'Les paiements ne sont pas encore reliés',
          previewText: 'Ceci est un aperçu de la commande Aurelia. Vos informations ont été vérifiées ici, sur la page ; rien n’a été débité et rien n’a été envoyé.',
          previewLink: 'Réserver plutôt une présentation privée',
          stripeMulti: 'Le paiement en ligne de plusieurs pièces à la fois nécessite la commande Shopify. Merci de commander une pièce à la fois, ou réservez une présentation privée et nous vous les réserverons toutes.',
          stripeMissing: 'Cette pièce ne peut pas encore être réglée en ligne. Réservez une présentation privée et nous vous la réserverons.',
          shopifyError: 'La page de paiement n’a pas pu être atteinte. Merci de réessayer dans un instant, ou de réserver une présentation privée.',
          emptyTitle: 'Votre panier est vide',
          emptyText: 'Il n’y a rien à commander pour l’instant. La boutique est un bel endroit pour commencer.',
          emptyLink: 'Découvrir la boutique',
          secure: 'Livraison assurée, contre signature, dans notre écrin bordeaux'
        },

        meta: {
          collections: 'Collections',
          collectionsDesc: 'Les quatre maisons d’Aurelia : Eternal Grace, Maison Rouge, Lumière et Heirloom. Joaillerie façonnée à la main depuis 1984.',
          boutique: 'Boutique',
          boutiqueDesc: 'Bagues, bracelets, boucles d’oreilles et pendentifs en or 18 carats recyclé, fondus, sertis et polis à la main. Filtrez par collection, métal, pierre et prix.',
          typeDesc: '{type} Aurelia, en or 18 carats recyclé, serties et finies à la main.',
          compare: 'Comparer',
          compareDesc: 'Comparez jusqu’à trois pièces Aurelia côte à côte, tournant ensemble dans la lumière.',
          checkout: 'Commande',
          checkoutDesc: 'Vérifiez vos pièces et finalisez votre commande, avec livraison assurée offerte.',
          notFound: 'Introuvable'
        },

        countries: [
          { name: 'États-Unis' }, { name: 'Canada' }, { name: 'Royaume-Uni' },
          { name: 'Irlande' }, { name: 'France' }, { name: 'Allemagne' }, { name: 'Autriche' },
          { name: 'Suisse' }, { name: 'Belgique' }, { name: 'Pays-Bas' },
          { name: 'Luxembourg' }, { name: 'Italie' }, { name: 'Espagne' }, { name: 'Portugal' },
          { name: 'Danemark' }, { name: 'Suède' }, { name: 'Norvège' }, { name: 'Finlande' },
          { name: 'Pologne' }, { name: 'Grèce' }, { name: 'Émirats arabes unis' },
          { name: 'Japon' }, { name: 'Singapour' }, { name: 'Hong Kong' },
          { name: 'Australie' }, { name: 'Nouvelle-Zélande' }
        ]
      }
    }
  });

  /* ---------- bespoke: configurator, size finder, stack builder, gem lab (02-content-bespoke.js) ---------- */
  AU.addLang('fr', {
    bespoke: {
      stones: [
        { label: 'Diamant', plural: 'Diamants' }, { label: 'Rubis', plural: 'Rubis' }, { label: 'Émeraude', plural: 'Émeraudes' },
        { label: 'Saphir', plural: 'Saphirs' }, { label: 'Améthyste', plural: 'Améthystes' }, { label: 'Aigue-marine', plural: 'Aigues-marines' },
        { label: 'Grenat', plural: 'Grenats' }, { label: 'Péridot', plural: 'Péridots' }, { label: 'Citrine', plural: 'Citrines' },
        { label: 'Topaze', plural: 'Topazes' }, { label: 'Tourmaline', plural: 'Tourmalines' }, { label: 'Tanzanite', plural: 'Tanzanites' },
        { label: 'Perle', plural: 'Perles' }, { label: 'Opale', plural: 'Opales' }
      ],
      fonts: [{ label: 'Script' }, { label: 'Serif' }, { label: 'Romain' }],
      lights: [{ label: 'Studio' }, { label: 'Jour' }, { label: 'Bougie' }, { label: 'Soirée' }]
    },

    gemLab: {
      stones: {
        diamond: 'Du carbone pur, la matière la plus dure de la nature. Aimé pour sa lumière blanche et son feu, ces éclats de couleur qu’il projette.',
        ruby: 'Un corindon coloré par une trace de chrome : le rouge de notre maison. Seul le diamant le surpasse en dureté.',
        emerald: 'Un béryl vert, taillé en longs degrés pour apaiser le jardin naturel qu’il abrite. Plus tendre, nous le sertissons dans des griffes protectrices.',
        sapphire: 'Le corindon dans toutes les couleurs sauf le rouge. Le classique est un bleu bleuet velouté qui garde sa couleur à la lueur d’une bougie.',
        amethyst: 'Un quartz violet, du lilas pâle au pourpre royal profond. La pierre de février.',
        aquamarine: 'Un béryl couleur d’eau de mer : limpide, frais et lumineux. La pierre de mars.',
        garnet: 'Un rouge vin chaleureux qui rougeoie à la bougie. La pierre de janvier.',
        peridot: 'Une olivine venue des profondeurs de la terre, d’un vert vif de printemps. La pierre d’août.',
        citrine: 'Un quartz aux teintes de miel et de fin d’après-midi. La pierre de novembre.',
        topaz: 'Limpide et brillante, ici d’un bleu ciel frais. La seconde pierre de novembre.',
        tourmaline: 'Un cristal capable de toutes les couleurs ; la nôtre est d’un rose tendre. La pierre d’octobre.',
        tanzanite: 'Trouvée dans une seule vallée de Tanzanie : un bleu violet qui change quand on la tourne. La pierre de décembre.',
        pearl: 'Elle naît, on ne la taille pas : couche après couche de nacre, avec une douce lueur intérieure que l’on appelle l’orient. La pierre de juin.',
        opal: 'Une silice qui brise la lumière en éclats de couleur mouvants, le jeu de couleurs. La pierre d’octobre.'
      },
      cuts: {
        round: 'Taille brillant : cinquante-sept facettes disposées pour le plus d’éclat de toutes les tailles.',
        oval: 'Ovale : un brillant étiré, si bien que la pierre paraît plus grande pour son poids et allonge le doigt.',
        pear: 'Poire : ronde d’un côté, pointue de l’autre, comme une goutte qui tombe. Portée la pointe vers l’ongle.',
        emerald: 'Taille émeraude (à degrés) : de longues facettes calmes comme une eau dormante. Moins d’éclat, plus de profondeur et de limpidité.',
        cushion: 'Coussin : un carré tendre aux angles arrondis, la taille ancienne, aux éclats larges et lents.'
      },
      uncut: 'Les perles et les opales ne sont pas facettées : elles sont présentées telles qu’elles ont grandi ou été polies, rondes ou en cabochon lisse.',
      caratText: 'Un carat pèse un cinquième de gramme. À {ct} ct, une pierre ronde mesure environ {mm} mm de diamètre.',
      colourD: [
        { text: 'Parfaitement incolore : le sommet de l’échelle, d’un blanc de glace, et rare.' },
        { text: 'Incolore. Seul un gemmologue, à côté d’une pierre étalon, peut la distinguer d’un D.' },
        { text: 'Incolore à l’œil, et presque sous la loupe. Le dernier des grades incolores.' },
        { text: 'Presque incolore. Vue de face, elle est blanche ; un murmure de chaleur n’apparaît que de profil.' },
        { text: 'Presque incolore, et l’une de nos préférées sur or jaune et or rose, où toute chaleur disparaît.' },
        { text: 'Presque incolore, avec une douce chaleur dans les plus grandes pierres. Un très bel équilibre.' },
        { text: 'Une pointe de chaleur visible dans une pierre plus grande. Magnifique sur or jaune.' },
        { text: 'Une teinte légère et chaude, l’allure d’un diamant ancien. Idéale sur or jaune.' }
      ],
      colourS: [
        { id: 'Claire', text: 'Pâle et lumineuse. Vive sous toutes les lumières, et la plus indulgente envers les inclusions.' },
        { id: 'Moyennement claire', text: 'Fraîche et limpide, d’une couleur que l’on remarque de l’autre côté de la table.' },
        { id: 'Moyenne', text: 'L’équilibre que la plupart des gemmologues jugent idéal : saturée, sans s’assombrir.' },
        { id: 'Moyennement soutenue', text: 'Une couleur riche et veloutée, la tonalité la plus recherchée pour le rubis et le saphir.' },
        { id: 'Soutenue', text: 'Sombre et dramatique. À la lueur d’une bougie, elle peut paraître presque noire.' }
      ],
      clarity: [
        { name: 'Pure', text: 'Rien à l’intérieur ni en surface, même au grossissement dix fois. Moins d’une pierre sur cent.' },
        { name: 'Pure à l’intérieur', text: 'Rien à l’intérieur au grossissement dix fois ; seulement d’infimes marques de surface, que le polissage efface.' },
        { name: 'Très, très petites inclusions', text: 'D’infimes inclusions qu’un gemmologue aguerri peine à trouver sous la loupe.' },
        { name: 'Très, très petites inclusions', text: 'D’infimes inclusions, très difficiles à voir au grossissement dix fois.' },
        { name: 'Très petites inclusions', text: 'De petites inclusions, difficiles à trouver sous la loupe et invisibles à l’œil.' },
        { name: 'Très petites inclusions', text: 'De petites inclusions qu’un gemmologue trouve avec un peu d’effort. Nettes à l’œil : notre choix habituel.' },
        { name: 'Petites inclusions', text: 'Des inclusions que l’on remarque sous la loupe ; le plus souvent nettes à l’œil.' },
        { name: 'Petites inclusions', text: 'Des inclusions faciles à voir sous la loupe, parfois visibles de profil.' },
        { name: 'Inclusions', text: 'Des inclusions visibles à l’œil nu. Elles peuvent adoucir la brillance.' }
      ],
      clarityNote: 'Les pierres de couleur se jugent à l’œil plutôt qu’à la loupe ; la plupart des émeraudes abritent un petit jardin, et c’est attendu.',
      colourPearl: [
        { id: 'Blanc', text: 'Un blanc lumineux à l’orient rosé : la couleur classique des perles des mers du Sud et akoya.' },
        { id: 'Argent', text: 'Un blanc argenté et frais, qui s’accorde à merveille avec l’or blanc.' },
        { id: 'Crème', text: 'Une crème douce, chaleureuse sur la peau et ravissante sur or jaune.' },
        { id: 'Champagne', text: 'Un or pâle, qui s’illumine à la lueur des bougies.' },
        { id: 'Dorée', text: 'Une perle d’un or profond, la plus rare et la plus chaude des mers du Sud.' }
      ],
      colourOpal: [
        { id: 'Blanche', text: 'Opale blanche : un corps laiteux aux éclats pastel.' },
        { id: 'Cristal', text: 'Opale cristal : assez limpide pour y plonger le regard, la couleur flottant à l’intérieur.' },
        { id: 'Grise', text: 'Opale grise : un corps fumé qui fait ressortir la couleur.' },
        { id: 'Sombre', text: 'Opale sombre : un gris-bleu profond, sur lequel les éclats s’avivent.' },
        { id: 'Noire', text: 'Opale noire : la plus rare, le jeu de couleurs flamboyant sur un fond presque noir.' }
      ],
      clarityPearl: 'Les perles se jugent à leur orient et à leur surface plutôt qu’à leur pureté : ici, l’échelle va d’une peau sans défaut à quelques petites marques.',
      clarityOpal: 'Pour une opale, l’échelle se lit comme l’intensité du jeu de couleurs, du flamboyant au plus doux.'
    },

    ui: {
      bespoke: {
        meta: {
          bespoke: { title: 'Bague sur mesure', description: 'Dessinez votre bague avec Aurelia : monture, métal, pierre, taille, carats, tour de doigt et une inscription gravée à la main, en 3D et en direct.' },
          size: { title: 'Trouver sa taille', description: 'Trouvez votre taille de bague à l’écran en deux minutes : calibrez avec une carte bancaire, mesurez une bague que vous possédez, ou imprimez un baguier en papier.' },
          stack: { title: 'Composer un ensemble', description: 'Superposez jusqu’à trois bagues Aurelia sur un même doigt, en 3D, et découvrez le prix de l’ensemble.' },
          lab: { title: 'Laboratoire des gemmes', description: 'Tournez une pierre dans la lumière, changez sa taille, ses carats, sa couleur et sa pureté, avec une explication simple de chaque grade.' }
        },
        eyebrow: 'Sur mesure',
        title: 'Dessinez votre bague',
        lede: 'Choisissez chaque élément et regardez votre bague prendre forme.',
        steps: { style: 'Monture', metal: 'Métal', stone: 'Pierre', cut: 'Taille & carat', size: 'Tour de doigt', engraving: 'Gravure' },
        next: 'Ensuite : {step}',
        moreStones: 'Plus de pierres',
        fewerStones: 'Moins de pierres',
        cut: 'Taille',
        carat: 'Carats',
        caratValue: '{ct} carats',
        eternityNote: 'Une alliance éternité est sertie tout autour de petites pierres rondes appariées : il n’y a donc pas de pierre centrale à tailler ni à dimensionner.',
        eternityCut: 'Rondes, appariées',
        cutEmerald: 'à degrés',
        stoneSum: '{stone} {cut}, {ct}\u00a0ct',
        sizeDown: 'Une demi-taille en dessous',
        sizeUp: 'Une demi-taille au-dessus',
        allAround: 'Tout autour',
        roundAllAround: '{stones} taille ronde, tout autour',
        sizeLabel: 'Tour de doigt (US)',
        sizeUS: 'US {n}',
        sizeLine: 'UK {uk} · EU {eu} · {mm} mm de diamètre',
        sizeMeasured: 'Votre taille mesurée',
        findSize: 'Trouver sa taille',
        engravingLabel: 'Inscription',
        engravingPlaceholder: 'Un prénom, une date…',
        engravingHint: 'Jusqu’à {n} caractères, gravés à la main à l’intérieur de l’anneau.',
        engravingFont: 'Écriture',
        engravingEmpty: 'Vos mots',
        engravingNone: 'Sans inscription',
        caption: 'Taille {size}',
        stageLabel: 'Votre bague sur mesure : {summary}',
        dragHint: 'Faites glisser pour tourner',
        loupe: 'Loupe',
        loupeOn: 'Fermer la loupe',
        reset: 'Recentrer la vue',
        light: 'Lumière',
        yourRing: 'Votre bague',
        estimate: 'Estimation',
        add: 'Ajouter au panier',   // fits the configurator's button at 390–1440 (the button grows to 223px on phones)
        added: 'Ajoutée',
        addedToast: '{name} a rejoint votre panier',
        consult: 'Prendre rendez-vous',
        note: 'Une estimation pour le modèle présenté. Chaque commande est confirmée avec vous en personne, pierre après pierre.',
        liveEstimate: '{summary}. Prix estimé {price}.',
        ringName: 'Bague {style} sur mesure',
        cartMeta: '{metal} 18 carats · {stone} · Taille {size}',
        cartEngraved: ' · Gravée « {text} »',
        consultNotes: '{summary}, taille {size}{engraving}. Estimation {price}.',
        consultEngraving: ', gravée « {text} »',

        size: {
          eyebrow: 'Service client',
          title: 'Trouver sa taille',
          lede: 'Deux minutes, une carte bancaire et une bague qui vous va. Ou imprimez un baguier en papier, ou consultez le tableau.',
          step1: 'Calibrer',
          step2: 'Mesurer',
          step1Title: 'Ajustez une carte à votre écran',
          step1Text: 'Tenez une carte bancaire à plat contre l’écran, son coin supérieur gauche dans l’angle indiqué. Redimensionnez le contour jusqu’à ce qu’il épouse exactement les bords de la carte.',
          step1Any: 'Toute carte au format standard convient : carte bancaire, pièce d’identité ou carte de bibliothèque (85,6 × 54 mm).',
          cardLabel: 'Taille du contour de la carte',
          cardDone: 'C’est ajusté',
          smaller: 'Réduire légèrement le contour',
          larger: 'Agrandir légèrement le contour',
          smallerRing: 'Réduire légèrement le cercle',
          largerRing: 'Agrandir légèrement le cercle',
          pxmm: '{v} px / mm',
          step2Title: 'Mesurez une bague que vous possédez',
          step2Text: 'Posez sur le cercle une bague qui va au doigt choisi. Redimensionnez le cercle jusqu’à ce que son bord se loge juste à l’intérieur de l’anneau.',
          recalibrate: 'Calibrer à nouveau',
          diameter: 'Diamètre intérieur',
          yourSize: 'Votre taille',
          between: 'Entre deux tailles : nous conseillons la plus grande, pour le confort.',
          sizeUS: 'US {n}',
          ukeu: 'UK {uk} · EU {eu}',
          use: 'Choisir cette taille',
          used: 'Enregistrée : taille {n}',
          usedToast: 'Taille {n} enregistrée. Nous la choisirons pour vous.',
          designRing: 'Dessiner une bague',
          shopRings: 'Voir les bagues',
          calibrated: 'Calibré : {v} pixels par millimètre',
          outOfRange: 'Hors de notre gamme de tailles : réservez un essayage et nous prendrons votre mesure en personne.',
          chartTitle: 'Tableau des tailles',
          chartLede: 'Diamètre et circonférence intérieurs pour chaque taille que nous réalisons.',
          chartD: 'Diamètre',
          chartC: 'Circonférence',
          printTitle: 'Un baguier en papier',
          printText: 'Imprimez une bande à enrouler autour du doigt, avec des cercles sur lesquels poser une bague. Imprimez à 100 % (taille réelle), puis vérifiez la ligne de 50 mm avec une règle.',
          print: 'Imprimer un baguier',
          tipsTitle: 'Quelques conseils',
          tips: [
            'Mesurez en fin de journée, lorsque les doigts sont le plus larges, et jamais quand ils ont froid.',
            'Un anneau large (plus de 5 mm) serre davantage : choisissez une demi-taille au-dessus.',
            'Si l’articulation est plus large que la base du doigt, prenez la taille de l’articulation.',
            'Chaque bague comprend une mise à taille offerte la première année.'
          ],
          sheetTitle: 'Baguier',
          sheetCheck: 'Cette ligne doit mesurer exactement 50 mm. Sinon, imprimez à nouveau à 100 % (taille réelle).',
          sheetStrip: 'Découpez la bande, enroulez-la à la base du doigt, et lisez la taille là où l’extrémité rejoint la graduation.',
          sheetCircles: 'Posez une bague qui vous va sur les cercles : votre taille est celle du cercle qui se loge juste à l’intérieur.',
          sheetFoot: 'Aurelia — Joaillerie. Façonnée à la main depuis 1984.',
          howTo: 'Comment mesurer votre taille de bague à l’écran',
          cardLong: '85,6 mm',
          cardShort: '54 mm'
        },

        stack: {
          eyebrow: 'Composer un ensemble',
          title: 'Composez votre ensemble',
          lede: 'Jusqu’à trois bagues sur un même doigt, dans l’ordre qui vous plaît.',
          slots: 'Votre ensemble',
          slot: 'Bague {n}',
          emptySlot: 'Choisissez une bague ci-dessous',
          choose: 'Choisir les bagues',
          add: 'Ajouter',
          inStack: 'Dans l’ensemble',
          full: 'Votre ensemble est complet : retirez une bague pour le modifier.',
          up: 'Monter {name}',
          down: 'Descendre {name}',
          remove: 'Retirer {name}',
          total: 'L’ensemble',
          addAll: 'Ajouter l’ensemble',
          addedAll: 'Votre ensemble est dans le panier',
          addedToast: '{n} bagues ont rejoint votre panier',
          empty: 'Commencez par un anneau, puis ajoutez une pierre.',
          clear: 'Effacer',
          stageLabel: 'Votre ensemble sur une main : {names}',
          stageEmpty: 'Une main vide, qui attend ses bagues'
        },

        lab: {
          eyebrow: 'Laboratoire des gemmes',
          title: 'Lire une pierre',
          lede: 'Une pierre dans la lumière. Réglez sa taille, sa couleur, sa pureté, et lisez ce que chaque grade signifie.',   // no 'Changez-la': the lede broke at its hyphen at 1440
          stone: 'Pierre',
          cut: 'Taille',
          carat: 'Carats',
          colour: 'Couleur',
          clarity: 'Pureté',
          price: 'Prix indicatif',
          priceNote: 'Pour la pierre seule, avant sertissage. Une indication : chaque pierre est estimée en personne.',
          design: 'Dessiner une bague avec cette pierre',
          designShort: 'Dessiner une bague',
          consult: 'Nous interroger sur cette pierre',
          consultShort: 'Nous écrire',
          noRing: 'Nous sertissons perles et opales sur commande : interrogez-nous et nous apporterons un plateau à votre table.',
          stageLabel: '{stone}, {cut}, {ct} carat, couleur {colour}, pureté {clarity}',
          cabochon: 'Cabochon',
          sphere: 'Ronde, telle qu’elle a grandi',
          still: 'Présentée en illustration',
          views: 'Vue',
          viewHome: 'Vue de trois quarts',
          viewTop: 'Par-dessus, à travers la table',
          viewSide: 'De profil',
          consultNotes: '{stone}, {cut}, {ct} carat, couleur {colour}, pureté {clarity}. Prix indicatif {price}.'
        }
      }
    }
  });

  /* ---------- story: atelier, journal, birthstones, gifts, visit, care (02-content-story.js) ---------- */
  AU.addLang('fr', {
    ui: {
      story: {
        common: {
          minRead: '{n} min de lecture',
          save: 'Favoris',
          savedToast: 'Ajoutée à vos favoris',
          removedToast: 'Retirée de vos favoris',
          viewPiece: 'Voir la pièce',
          copied: 'Lien copié',
          chapters: 'Chapitres',
          more: 'Encore chez Aurelia',
          contact: {
            title: 'Écrire ou appeler ?',
            text: 'Une vraie personne de l’atelier répond à chaque message, le plus souvent dans la journée.',
            email: 'Nous écrire',
            call: 'Appeler l’atelier',
            hours: 'Lun – sam, 9 h – 18 h'
          }
        },

        atelier: {
          metaTitle: 'L’Atelier',
          metaDesc: 'Au cœur de l’atelier Aurelia : l’or recyclé en fusion, les quatre étapes que traverse chaque pièce, notre histoire de 1984 à aujourd’hui, et les mots de nos clients.',
          eyebrow: 'L’Atelier',
          titleLead: 'Façonné à la main depuis',
          lede: 'Quatre établis, une fenêtre sur la rue, et la même promesse depuis plus de quarante ans : rien ne sort d’ici avant d’être juste.',
          chapters: ['L’or en fusion', 'Les quatre étapes', 'Nos années', 'Leurs mots'],
          forge: {
            eyebrow: 'L’or en fusion',
            title: 'De l’or à la bague',
            label: 'De l’or recyclé qui fond, se coule dans un moule à bague et refroidit en anneau',
            tempLabel: 'Dans le creuset',
            phases: [
              { title: 'Pesé au gramme', text: 'L’or 18 carats recyclé, affiné et allié dans notre propre atelier, est pesé pour une seule bague.' },
              { title: 'Fondu', text: 'Dans le creuset, il devient liquide à mille soixante-quatre degrés, éclatant comme un petit soleil.' },
              { title: 'Coulé', text: 'Une coulée régulière remplit le moule. Il n’y a pas de seconde chance, et aucune hâte non plus.' },
              { title: 'Refroidi en bague', text: 'L’or se pose, s’assombrit, puis s’éveille à nouveau sous la meule de polissage.' }
            ]
          },
          process: {
            eyebrow: 'Le savoir-faire',
            title: 'Quatre étapes, un établi',
            figure: 'Un solitaire au fil de l’atelier : dessiné au crayon, fondu dans l’or, serti de sa pierre, puis achevé.',
            hallmark: 'Poinçon'
          },
          timeline: {
            eyebrow: 'Nos années',
            title: 'Une maison, année après année',
            hint: 'Faites défiler pour parcourir les années',
            hintTouch: 'Balayez pour parcourir les années',
            hintArrows: 'Faites défiler latéralement, ou utilisez les flèches',
            today: 'Aujourd’hui',
            region: 'La chronologie d’Aurelia',
            prev: 'Plus tôt',
            next: 'Plus tard'
          },
          voices: {
            title: 'Leurs mots',
            region: 'Ce que disent nos clients',
            slide: '{n} sur {total}',
            pause: 'Mettre les témoignages en pause',
            play: 'Lire les témoignages',
            prev: 'Témoignage précédent',
            next: 'Témoignage suivant'
          },
          promises: { title: 'Nos engagements' },
          end: {
            title: 'Venez à l’établi',
            text: 'Découvrez les pièces dans la lumière où elles ont été faites, et rencontrez les mains qui les ont façonnées.',
            visit: 'Prendre rendez-vous',
            bespoke: 'Dessiner votre bague'
          }
        },

        journal: {
          metaTitle: 'Journal',
          metaDesc: 'Récits de l’atelier Aurelia : des bagues redessinées d’après photographie, pourquoi nous ne travaillons que l’or recyclé, et comment choisir une pierre à la lueur d’une bougie.',
          eyebrow: 'Journal',
          title: 'Lettres de l’établi',
          lede: 'De courts récits de l’atelier, écrits entre deux pièces : comment elles ont été faites, et pourquoi.',
          read: 'Lire le récit',
          nextStory: 'Récit suivant',
          notFound: 'Ce récit est introuvable.',
          backToJournal: 'Retour au journal',
          share: 'Partager ce récit'
        },

        birthstones: {
          metaTitle: 'Pierres de naissance',
          metaDesc: 'Le calendrier des pierres de naissance d’Aurelia : douze mois, douze pierres, ce que chacune signifie, comment en prendre soin, et une bague dessinée autour d’elle.',
          eyebrow: 'Pierres de naissance',
          title: 'Une pierre pour chaque mois',
          lede: 'Douze mois, douze pierres. Choisissez un mois pour voir sa pierre tourner dans la lumière, ce qu’elle porte en elle, et comment la garder.',
          months: 'Mois',
          monthOf: 'Pierre de naissance — {month}',
          colour: 'Couleur',
          meaning: 'Symbole',
          care: 'Entretien',
          hardness: 'Dureté',
          mohs: 'sur l’échelle de Mohs',
          design: 'Créer avec cette pierre',
          ask: 'Nous consulter',
          askNote: 'Nous sertissons cette pierre uniquement sur commande. Dites-nous ce que vous imaginez.',
          stage: 'Les douze pierres de naissance sur un anneau qui tourne lentement ; {stone} au premier plan'
        },

        gifts: {
          metaTitle: 'Idées cadeaux',
          metaDesc: 'Trois questions, trois pièces : le guide des cadeaux Aurelia suggère des bijoux selon la personne, son style et votre budget.',
          eyebrow: 'Idées cadeaux',
          title: 'Un cadeau, mûrement choisi',
          lede: 'Trois questions, puis trois pièces que nous choisirions nous-mêmes.',
          step: 'Question {n} sur {total}',
          back: 'Retour',
          again: 'Recommencer',
          share: 'Copier le lien vers ces suggestions',
          resultsEyebrow: 'Nos suggestions',
          resultsTitle: 'Les trois que nous choisirions',
          resultsFor: 'Pour {who}, {style}, {budget}',
          none: 'Aucune pièce ne répond exactement à chaque réponse ; voici les plus proches.',
          questions: {
            who: { q: 'À qui est-il destiné ?', options: { partner: 'L’être aimé', mother: 'Une mère', friend: 'Une amie', self: 'Moi-même', bride: 'Une mariée' } },
            style: { q: 'Quel est son style ?', options: { classic: 'Classique', modern: 'Moderne', bold: 'Affirmé', delicate: 'Délicat' },
              hints: { classic: 'Des formes qui ne se démodent pas', modern: 'Des lignes pures, une surprise discrète', bold: 'De la couleur et de la présence', delicate: 'Fin, léger, tout près de la peau' } },
            budget: { q: 'Et le budget ?', options: { under: 'Moins de {a}', mid: 'De {a} à {b}', over: 'Plus de {b}' } }
          },
          whoShort: { partner: 'l’être aimé', mother: 'une mère', friend: 'une amie', self: 'vous-même', bride: 'une mariée' },
          budgetShort: { under: 'moins de {a}', mid: 'de {a} à {b}', over: 'plus de {b}' },
          why: {
            for: {
              partner: 'Pour celle ou celui que vous choisiriez encore',
              mother: 'Pour les mains qui vous ont presque tout appris',
              friend: 'Pour une amitié qui mérite d’être célébrée',
              self: 'Parce que certaines choses se choisissent pour soi',
              bride: 'Pour le grand jour, et chaque jour qui suit'
            },
            style: {
              classic: 'une forme qui ne se démodera jamais',
              modern: 'des lignes pures, avec une surprise discrète',
              bold: 'de la couleur et de la présence, portées avec légèreté',
              delicate: 'assez fine pour ne jamais la quitter'
            },
            type: {
              ring: 'Une bague à porter chaque jour de l’année',
              bracelet: 'Un bracelet qui coule au poignet comme de l’eau',
              earrings: 'Des boucles d’oreilles qui captent la lumière à chaque mouvement de tête',
              pendant: 'Un pendentif qui repose là où la main se pose sur le cœur'
            },
            occasion: {
              engagement: 'faite pour une question qui mérite d’être posée',
              wedding: 'faite pour le jour même, et chaque jour qui suit',
              anniversary: 'pour les années déjà comptées',
              birthday: 'pour un anniversaire inoubliable',
              everyday: 'assez légère pour ne jamais la quitter',
              celebration: 'pour les soirs qui comptent'
            }
          }
        },

        visit: {
          metaTitle: 'Réserver une présentation privée',
          metaDesc: 'Réservez une présentation privée à l’atelier Aurelia ou en vidéo. Choisissez un jour et une heure ; les pièces qui vous intriguent vous attendront.',
          formTitle: 'Demander un rendez-vous',
          formNote: 'Tous les champs sont requis, sauf mention contraire.',
          where: 'Où', date: 'Date', time: 'Heure', you: 'Vous',
          reasonLabel: 'L’objet de votre visite', choose: 'Choisissez',
          name: 'Votre nom', email: 'E-mail', phone: 'Téléphone', notes: 'Remarques', optional: 'facultatif',
          notesPh: 'Une pièce aperçue, une pierre que vous aimez, une date à garder en tête',
          prevMonth: 'Mois précédent', nextMonth: 'Mois suivant', chooseDay: 'Choisissez un jour',
          closedSun: 'Fermé le dimanche', closedSunMon: 'Fermé le dimanche et le lundi',
          closedDay: 'fermé', notAvailable: 'indisponible',
          closedThere: 'Nous sommes fermés ce jour-là. Merci d’en choisir un autre.',
          send: 'Demander le rendez-vous',
          sending: 'Envoi en cours',
          summaryEmpty: 'Choisissez un jour et une heure.',
          byVideo: 'en vidéo', at: 'à {place}',
          errors: {
            place: 'Merci de choisir le lieu de notre rencontre.',
            date: 'Merci de choisir un jour.',
            time: 'Merci de choisir une heure.',
            reason: 'Merci de nous dire l’objet de votre visite.',
            name: 'Merci d’indiquer votre nom.',
            emailEmpty: 'Il nous faut un e-mail pour confirmer votre rendez-vous.',
            email: 'Cette adresse e-mail semble incomplète.',
            phoneChars: 'Chiffres, espaces et + uniquement, s’il vous plaît.',
            phoneShort: 'Ce numéro semble un peu court.',
            send: 'Votre demande n’a pas pu être envoyée pour le moment. Merci de réessayer, ou de nous écrire à {email}.'
          },
          done: {
            title: 'Merci',
            line: 'Nous vous confirmerons le rendez-vous par e-mail sous un jour.',
            preview: 'Aperçu : ce formulaire n’est pas encore relié, rien n’a donc été envoyé.',
            calendly: 'Notre agenda s’est ouvert dans un nouvel onglet : choisissez-y l’heure qui vous convient.',
            again: 'Réserver à nouveau',
            calendar: 'Ajouter au calendrier',
            calendarTitle: 'Présentation privée — {brand}',
            calendarFile: 'aurelia-presentation-privee',
            rows: { where: 'Où', when: 'Quand', time: 'Heure', reason: 'Pour' }
          },
          prefilled: 'Nous avons renseigné ce que nous savons. Modifiez ce que vous souhaitez.',
          reasons: [
            { label: 'Bague de fiançailles' },
            { label: 'Alliances' },
            { label: 'Un cadeau' },
            { label: 'Création sur mesure' },
            { label: 'Réparation ou mise à taille' },
            { label: 'Simple curiosité' }
          ]
        },

        care: {
          metaTitle: 'Service client',
          metaDesc: 'Le service client Aurelia : livraison assurée et retours, entretien de vos bijoux, réparations et mises à taille, notre garantie à vie, et les réponses aux questions fréquentes.',
          eyebrow: 'Service client',
          title: 'Choyée, pour la vie',
          lede: 'Tout ce qui se passe une fois la pièce sortie de l’établi : comment elle vous parvient, comment la garder, et comment nous en prenons soin aussi longtemps que vous la porterez.',
          jump: 'Aller à',
          help: 'Une autre question ?',
          helpText: 'Écrivez-nous, appelez-nous, ou venez nous voir. Une vraie personne de l’atelier vous répondra.',
          helpVisit: 'Prendre rendez-vous'
        }
      }
    },

    timeline: [
      { title: 'Un établi près de la fenêtre', text: 'Notre fondatrice loue un établi et une fenêtre sur la rue, et vend sa première bague à une voisine.' },
      { title: 'La première apprentie', text: 'Un deuxième établi, une deuxième paire de mains. Chaque sertisseur depuis a appris à la même table.' },
      { title: 'Le solitaire Grace', text: 'Six fines griffes et un anneau délié : la bague qui deviendra Eternal Grace est dessinée pour un mariage de juin.' },
      { title: 'Uniquement de l’or recyclé', text: 'Nous cessons d’acheter de l’or nouvellement extrait. Chaque gramme depuis a été affiné à partir d’or qui existait déjà.' },
      { title: 'Le salon ouvre', text: 'La pièce voisine de l’atelier devient un salon paisible, d’où nos clients regardent naître leurs pièces.' },
      { title: 'Maison Rouge', text: 'Les rubis sur or rose deviennent la couleur de notre maison, faite pierre, de la manchette de tous les jours aux pendants du soir.' },
      { title: 'Quarante ans à l’établi', text: 'Quatre établis aujourd’hui, la même fenêtre, et la même promesse : rien ne sort d’ici avant d’être juste.' },
      { title: 'Toujours à l’établi', text: 'Chaque pièce est encore dessinée, fondue, sertie et achevée à la main, à quelques pas de l’endroit où naquit la première.' }
    ],

    journal: [
      {
        kicker: 'Sur mesure',
        title: 'La bague redessinée d’après une photographie',
        standfirst: 'Un tirage pâli, la main d’une grand-mère, et six semaines de dessin pour qu’une bague perdue revienne exactement telle qu’elle était.',
        body: [
          'La photographie est arrivée dans une enveloppe, pliée une fois en son milieu. Une femme à une table de mariage, la main posée sur un verre, et à l’annulaire une bague que personne dans la famille n’avait revue depuis trente ans.',
          'Camille voulait qu’on la refasse. Pas une bague qui lui ressemble : la même, aussi fidèlement que possible. Nous avions une seule image, prise de profil, un peu floue, et le souvenir d’une petite-fille qui avait tenu cette main enfant.',
          'Nous avons commencé, comme toujours, par un crayon. L’anneau se mesurait aisément d’après les doigts voisins ; la tête, c’était autre chose. Nous l’avons dessinée grandeur nature, puis cinq fois plus grande, et avons épinglé les dessins au mur, à côté du tirage.',
          'Le dessin enseigne une certaine patience. On regarde la même ombre pendant une heure, puis un soir on comprend que ce n’est pas une ombre, mais le bord d’une griffe, légèrement tournée, comme les anciens sertisseurs aimaient les tourner.',
          'Du dessin nous avons sculpté la cire, et de la cire nous avons fondu l’or : recyclé, allié ici même au jaune chaleureux de l’original. La pierre, nous l’avons choisie à l’œil, parmi onze, parce qu’elle captait la lumière comme semblait le faire celle de la photographie.',
          'Quand Camille est venue la chercher, elle l’a passée à son doigt avant de prononcer un mot. Puis elle a sorti la photographie de son sac et l’a tenue près de sa main, et pendant un instant toutes deux, la bague et l’image, n’étaient plus qu’une seule et même chose.'
        ],
        quote: 'Elle a tenu la photographie près de sa main, et pendant un instant la bague et l’image n’étaient plus qu’une.',
        figures: [
          { caption: 'La bague achevée : un brillant rond sur six fines griffes, sur un anneau délié d’or jaune.' },
          { caption: 'Une première étude de la tête, dessinée avant que nous ne retenions une pierre unique.' },
          { caption: 'L’anneau, fondu en premier et laissé nu jusqu’à ce que la tête soit juste.' }
        ]
      },
      {
        kicker: 'Matières',
        title: 'Pourquoi nous ne travaillons que l’or recyclé',
        standfirst: 'L’or ne s’use pas. Depuis 2004, chaque gramme que nous employons a été affiné à partir d’or qui existait déjà.',
        body: [
          'Presque tout l’or jamais extrait est encore parmi nous. Il dort dans des coffres et des tiroirs, dans des boîtiers de montres et des alliances, dans les contacts de vieux téléphones. Contrairement à presque tout ce que nous utilisons, il ne rouille pas, ne ternit pas, ne s’use pas.',
          'En 2004, nous avons décidé que c’était une raison suffisante pour cesser d’en faire extraire davantage. Depuis, chaque gramme sur nos établis provient d’or qui existait déjà, ramené à sa pureté puis allié de nouveau dans notre propre atelier.',
          'L’or affiné ne se distingue en rien de l’or fraîchement extrait : les mêmes atomes, le même poids, la même couleur une fois allié. Ce qui change, c’est tout ce qui l’a précédé, l’eau, la terre et l’énergie qu’une nouvelle mine aurait exigées.',
          'Nous allions nous-mêmes notre or 18 carats pour en maîtriser exactement la couleur : un peu plus de cuivre pour la chaleur de notre or rose, une touche de palladium pour un blanc qui n’a pas besoin d’être rhodié pour paraître blanc.',
          'Il arrive que nos clients nous apportent leur propre or : une chaîne rompue, une bague qui ne va plus à une vie. Nous pouvons l’affiner et en faire quelque chose de nouveau, et c’est souvent le métal le plus chargé de sens sur l’établi.',
          'Rien de tout cela ne se voit dans la pièce achevée, et c’est un peu le propos. Elle a l’air d’être en or parce qu’elle est en or. Simplement, elle n’a pas eu à coûter deux fois à la terre.'
        ],
        quote: 'Elle a l’air d’être en or parce qu’elle est en or. Simplement, elle n’a pas eu à coûter deux fois à la terre.',
        figures: [
          { caption: 'Le jonc Soleil : or jaune recyclé massif, fini à la main.' },
          { caption: 'L’or rose tient sa chaleur d’un peu plus de cuivre dans l’alliage.' },
          { caption: 'Un anneau simple, la façon la plus claire de voir la couleur du métal.' }
        ]
      },
      {
        kicker: 'Pierres',
        title: 'Choisir une pierre à la lueur d’une bougie',
        standfirst: 'La lumière du jour montre la couleur d’une pierre. La bougie révèle son âme. Pourquoi nous ne laissons jamais un client choisir sous une seule lumière.',
        body: [
          'La plupart des pierres s’achètent sous la pire lumière qui soit : l’éclat froid et uniforme d’un comptoir de boutique, qui flatte tout de la même façon et ne dit presque rien.',
          'Nous montrons chaque pierre trois fois. D’abord près de la fenêtre nord, où la lumière du jour dit vrai sur la couleur. Puis sous une lampe unique, qui montre comment une taille répond à une source de lumière franche. Et enfin à la lueur d’une bougie, car c’est là que les bijoux passent leurs plus belles soirées.',
          'Un rubis qui semble simplement rouge à midi peut devenir braise à la flamme. Une émeraude qui paraissait sombre à la fenêtre s’ouvre comme un étang quand la lumière est basse et chaude. Des diamants qui scintillent sous la lampe se taisent parfois à la bougie ; les plus beaux, jamais.',
          'Nous faisons l’obscurité dans la pièce pour cela, et nous prenons notre temps. Nos clients choisissent souvent à la bougie une autre pierre que celle qu’ils aimaient le jour, et ils s’en félicitent presque toujours.',
          'Si vous ne pouvez venir à l’atelier, nous faisons de même en vidéo : trois lumières, la pierre qui tourne lentement sous la loupe, et autant de soirées qu’il le faudra.'
        ],
        quote: 'La lumière du jour montre la couleur d’une pierre. La bougie révèle son âme.',
        figures: [
          { caption: 'Une émeraude taille émeraude : sombre à la fenêtre, ouverte comme l’eau à la flamme.' },
          { caption: 'Un rubis sur or rose, la pierre que nous aimons le plus voir à la bougie.' },
          { caption: 'Un saphir poire, le bleu du ciel une heure après le coucher du soleil.' }
        ]
      }
    ],

    birthstones: [
      { name: 'Grenat', colour: 'Rouge vin profond', meaning: 'Constance et heureux retour : on le confiait autrefois aux voyageurs pour qu’ils reviennent.', care: 'Eau tiède savonneuse et brosse souple. Évitez-lui les brusques changements de température.' },
      { name: 'Améthyste', colour: 'Du violet au lilas tendre', meaning: 'Un esprit clair et un cœur apaisé ; les Grecs la croyaient gardienne de la sobriété.', care: 'Tenez-la à l’écart d’un soleil fort et prolongé, qui peut pâlir sa couleur au fil des ans.' },
      { name: 'Aigue-marine', colour: 'Bleu de mer limpide', meaning: 'Courage et eaux calmes ; les marins la portaient pour une traversée paisible.', care: 'Assez dure pour chaque jour. Nettoyez-la souvent : elle n’est jamais plus belle que limpide.' },
      { name: 'Diamant', colour: 'Lumière incolore', meaning: 'Une force qui dure : la pierre des promesses faites pour être tenues.', care: 'La pierre la plus dure, mais elle attire le gras. Un bain hebdomadaire lui garde tout son feu.' },
      { name: 'Émeraude', colour: 'Vert profond et vivant', meaning: 'Renouveau, printemps et amour fidèle.', care: 'La plupart des émeraudes sont huilées : ni ultrasons, ni eau chaude, mais un chiffon doux.' },
      { name: 'Perle', colour: 'Blanc doux et lustré', meaning: 'Pureté et sagesse, patiemment amassées, couche après couche.', care: 'Mettez vos perles en dernier, retirez-les en premier. Essuyez-les après les avoir portées ; ne les plongez jamais dans l’eau.' },
      { name: 'Rubis', colour: 'Rouge ardent', meaning: 'Passion, protection et cœur chaleureux.', care: 'Seul le diamant le surpasse en dureté. Eau tiède, un peu de savon, une brosse souple.' },
      { name: 'Péridot', colour: 'Vert olive vif', meaning: 'La lumière contre l’obscurité ; les Égyptiens l’appelaient la gemme du soleil.', care: 'Un peu plus tendre que la plupart : rangez-le à l’écart des pierres plus dures pour qu’il ne se raye pas.' },
      { name: 'Saphir', colour: 'Bleu bleuet profond', meaning: 'Vérité, sincérité et esprit serein.', care: 'Très dur et très indulgent. Nettoyez-le comme un diamant, à l’eau tiède savonneuse.' },
      { name: 'Opale', colour: 'Toutes les couleurs à la fois', meaning: 'Espoir et imagination ; on disait qu’elle réunissait les vertus de toutes les pierres.', care: 'L’opale retient l’eau : tenez-la loin de la chaleur et de l’air sec, et ne la plongez ni ne l’exposez jamais à la vapeur.' },
      { name: 'Topaze', colour: 'Miel doré', meaning: 'Chaleur, générosité et force d’esprit.', care: 'Dure, mais elle peut se fendre sous un choc : retirez-la pour le sport et les travaux exigeants.' },
      { name: 'Tanzanite', colour: 'Bleu violet', meaning: 'Transformation et nouveau départ ; on ne la trouve qu’en un seul endroit sur terre.', care: 'Portez-la avec soin et nettoyez-la avec douceur : eau tiède et chiffon doux uniquement.' }
    ],

    care: {
      sections: [
        { title: 'Livraison & retours', items: [
          { q: 'Comment ma pièce est-elle livrée ?', a: 'Chaque commande voyage assurée et remise contre signature, dans notre écrin bordeaux, sans frais. Les pièces prêtes à être expédiées quittent l’atelier sous deux jours ouvrés ; les pièces réalisées sur commande suivent le délai indiqué sur leur page.' },
          { q: 'Puis-je retourner une pièce ?', a: 'Oui. Vous disposez de 30 jours après la livraison pour retourner toute pièce qui n’a été ni portée, ni gravée, ni réalisée selon votre propre dessin. Écrivez-nous et nous organiserons un enlèvement assuré.' },
          { q: 'Quand un retour est-il remboursé ?', a: 'Dès que la pièce est revenue à l’atelier et a été vérifiée, généralement sous cinq jours ouvrés, par le moyen de paiement utilisé.' },
          { q: 'Livrez-vous à l’étranger ?', a: 'Nous livrons dans la plupart des pays, avec assurance et suivi. Les éventuels droits de douane sont indiqués avant le paiement : rien n’est dû à la livraison.' }
        ] },
        { title: 'Entretien & nettoyage', items: [
          { q: 'Comment nettoyer mes bijoux chez moi ?', a: 'Un bol d’eau tiède, une goutte de savon doux et une brosse à dents souple. Rincez, puis séchez avec un chiffon non pelucheux. Émeraudes, opales et perles demandent plus de douceur : retrouvez chaque pierre dans notre [calendrier des pierres de naissance](#/birthstones).' },
          { q: 'Que dois-je éviter ?', a: 'Le chlore, l’eau de Javel et les produits ménagers, le parfum et la laque directement sur les pierres, et les nettoyeurs à ultrasons pour toute pierre huilée ou tendre. Mettez vos bijoux en dernier et retirez-les en premier.' },
          { q: 'Comment les ranger ?', a: 'Séparément, dans les pochettes douces que nous joignons à chaque pièce, afin que les pierres dures ne rayent ni les plus tendres, ni les unes les autres.' },
          { q: 'Nettoyez-vous les pièces à l’atelier ?', a: 'Toujours, et gracieusement, aussi longtemps que la pièce vous appartient. [Prenez rendez-vous](#/visit) : nous la nettoierons, vérifierons chaque griffe et la polirons pendant que vous patientez.' }
        ] },
        { title: 'Réparations & mise à taille', items: [
          { q: 'Ma bague peut-elle être mise à taille ?', a: 'La plupart des bagues peuvent être agrandies ou réduites de deux tailles. La première mise à taille dans l’année est offerte. Les alliances éternité sont refaites à la bonne taille plutôt que coupées. Un doute sur votre taille ? Utilisez notre [guide des tailles](#/size).' },
          { q: 'Combien de temps dure une réparation ?', a: 'Les réparations simples et les mises à taille prennent environ une semaine. Ressertir une pierre ou reconstruire une griffe peut demander deux à trois semaines ; nous vous le dirons toujours avant de commencer.' },
          { q: 'Réparez-vous les bijoux d’autres maisons ?', a: 'Souvent, oui. Apportez-le lors d’une [présentation privée](#/visit) : nos sertisseurs l’examineront avec vous et vous diront franchement ce qu’ils peuvent faire.' }
        ] },
        { title: 'Garantie', items: [
          { q: 'Que couvre la garantie à vie ?', a: 'Tout défaut de fabrication : une griffe desserrée, une soudure fragile, un fermoir qui ne tient pas. Nous la réparons, ou la refaisons s’il le faut, sans frais.' },
          { q: 'Qu’est-ce qui n’est pas couvert ?', a: 'L’usure ordinaire, la perte et les dommages accidentels. Pour ceux-ci, nous proposons des réparations à prix coûtant, et pouvons vous recommander une assurance spécialisée.' },
          { q: 'Dois-je enregistrer ma pièce ?', a: 'Non. Chaque pièce est consignée à l’atelier sous son poinçon : votre garantie accompagne la pièce, où qu’elle aille.' }
        ] },
        { title: 'Questions', items: [
          { q: 'D’où viennent vos pierres ?', a: 'Nous achetons auprès d’un petit nombre de tailleurs que nous connaissons depuis des années, capables de nous dire où chaque pierre a été extraite et comment elle a été négociée. Chaque diamant est garanti hors zones de conflit.' },
          { q: 'Votre or est-il vraiment recyclé ?', a: 'Chaque gramme depuis 2004. Nous l’affinons et l’allions nous-mêmes. Lisez-en l’histoire dans notre [journal](#/journal/recycled-gold).' },
          { q: 'Puis-je voir une pièce avant de l’acheter ?', a: 'Bien sûr. [Réservez une présentation privée](#/visit) à l’atelier ou en vidéo, et elle vous attendra sur le plateau.' },
          { q: 'Pouvez-vous graver ma pièce ?', a: 'La gravure est offerte sur toutes les bagues et la plupart des bracelets : un prénom, une date ou quelques mots, gravés à la main.' }
        ] }
      ]
    }
  });

  /* ---------- try-on (70-tryon.js) and atmos (06-atmos.js) ---------- */
  AU.addLang('fr', {
    ui: {
      atmos: { drag: 'Glisser', view: 'Voir' },
      tryon: {
        eyebrow: 'Essayer',
        dialog: 'Essayer avec votre caméra',
        kicker: 'Le miroir',
        title: 'Sur votre main',
        lede: 'Voyez la pièce sur votre main, en direct, à travers votre caméra. Tournez lentement la main dans la lumière et regardez la pierre vous répondre.',
        steps: [
          'Autorisez la caméra lorsque votre navigateur le demande.',
          'Levez la main, le dos tourné vers l’écran.',
          'Tournez-la lentement, puis prenez une photo en souvenir.'
        ],
        bracelet: 'Montrez votre poignet, le dos de la main tourné vers l’écran.',
        privacy: 'L’image de la caméra ne quitte jamais votre appareil.',
        allow: 'Autoriser la caméra',
        notNow: 'Pas maintenant',
        choose: 'Choisir une pièce',
        rings: 'Bagues',
        bracelets: 'Bracelets',
        yourDesign: 'Votre création',
        status: {
          camera: 'En attente de la caméra',
          model: 'Le miroir se prépare',
          searching: 'Levez la main, le dos tourné vers la caméra',
          searchingWrist: 'Levez la main et montrez votre poignet',
          tracking: 'Tournez lentement la main dans la lumière'
        },
        shutter: 'Prendre une photo',
        viewPiece: 'Voir la pièce',
        close: 'Fermer',
        live: '{name}, sur votre main, dans l’image de la caméra',
        figure: 'Un fin dessin au trait d’une main portant {name}',
        photoKicker: 'À l’instant',
        photoTitle: 'Votre photo',
        photoText: 'Elle n’est conservée que si vous choisissez de l’enregistrer. Rien n’est envoyé.',
        photoAlt: '{name}, sur votre main',
        photoFile: 'aurelia-essayage',
        save: 'Enregistrer la photo',
        retake: 'Retour au miroir',
        fallbackKicker: 'Essayer',
        openTab: 'Ouvrir dans un nouvel onglet',
        retry: 'Réessayer',
        fallback: {
          blocked: { title: 'La caméra se repose', text: 'Cette fenêtre n’a pas pu ouvrir la caméra ; une page affichée dans une autre page n’y parvient généralement pas. Ouvrez le site dans son propre onglet, autorisez la caméra, et la pièce apparaîtra sur votre main.' },
          none: { title: 'Aucune caméra trouvée', text: 'L’essayage nécessite une caméra tournée vers vous. Sur un téléphone, ou un ordinateur équipé d’une caméra, il fonctionne directement dans votre navigateur. Voici, en attendant, la pièce sur une main dessinée.' },
          busy: { title: 'La caméra est occupée', text: 'Une autre application semble utiliser la caméra. Fermez-la, puis réessayez.' },
          unsupported: { title: 'Pas dans ce navigateur', text: 'L’essayage nécessite un navigateur récent, avec accès à la caméra et à la 3D. Ouvrez le site dans son propre onglet, dans un navigateur à jour, pour voir la pièce sur votre main.' },
          model: { title: 'Le miroir n’est pas prêt', text: 'Le suivi de la main n’a pas pu être chargé. Vérifiez votre connexion et réessayez.' },
          ended: { title: 'La caméra s’est arrêtée', text: 'La caméra a été éteinte ou déconnectée. Réessayez lorsqu’elle sera de retour.' }
        }
      }
    }
  });
})();
