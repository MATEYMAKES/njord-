/* ---- 09-lang-de.js ---- */
/* Aurelia — German (idea 27). A partial override of the merged English content (01-content.js, 02-content-*.js and
   the strings areas add with AU.extendContent). Arrays merge by index, so every list keeps the English order; ids,
   prices, specs, hrefs and brand/collection names are never repeated here. Placeholders ({n}, {name}…) are kept as is.
   Product names: the house name (Grace, Rouge, Lumière, Trinity, Verdant, Aurum, Ligne, Soleil, Étoile, Larme, Cerise,
   Nuit) never changes; the piece type that goes with it is translated and comes first ('Armreif Soleil',
   'Ohrstecker Étoile'). Collection names (Eternal Grace, Maison Rouge, Lumière, Heirloom) stay as they are.
   Written as a German Maison would write it: the formal Sie, quiet, exact, never literal. */
(function () {
  'use strict';
  var AU = window.AU;
  if (!AU || !AU.addLang) return;

  /* ---------- base content (01-content.js) ---------- */
  AU.addLang('de', {
    brand: { edition: 'Nr. 2.0 — Feiner Schmuck' },

    ui: { core: { skip: 'Zum Inhalt' } },

    nav: [
      { label: 'Kollektionen' },
      { label: 'Boutique' },
      { label: 'Nach Maß' },
      { label: 'Atelier' },
      { label: 'Journal' },
      { label: 'Termin' }
    ],

    hero: {
      eyebrow: 'Feiner Schmuck — Von Hand gefertigt seit 1984',
      lede: 'Ringe, Armbänder, Ohrringe und Anhänger, in unserem Atelier von Hand gegossen, gefasst und poliert. Gemacht, um jeden Tag getragen und eines Tages weitergegeben zu werden.',
      primary: { label: 'Die Boutique entdecken' },
      secondary: { label: 'Termin vereinbaren' }
    },

    marquee: ['Von Hand gefertigt seit 1984', 'Eternal Grace', 'Recyceltes 18-Karat-Gold', 'Von Hand gefasst', 'Gemacht, um weitergegeben zu werden'],

    collections: [
      { kicker: 'Verlobung & Hochzeit',
        text: 'Solitäre und Trilogie-Ringe für Versprechen, die bleiben. Jeder Diamant mit dem Auge gewählt, jede Krappe von Hand gefasst.' },
      { kicker: 'Rubine & Roségold',
        text: 'Die Farbe unseres Hauses, zu Stein geworden. Tiefrote Rubine in warmem Roségold, von der Spange für jeden Tag bis zu den Ohrhängern für den Abend.' },
      { kicker: 'Diamanten in Weißgold',
        text: 'Licht, und sonst nichts. Tennisarmbänder, Memoire-Ringe und Ohrstecker, die jede Lampe im Raum einfangen.' },
      { kicker: 'Farbsteine, Treppenschliffe',
        text: 'Smaragde und Saphire in den alten Schliffen, schwerer und ruhiger gearbeitet, um von einer Hand zur nächsten zu gehen.' }
    ],

    products: [
      { name: 'Solitär Grace',
        text: 'Ein runder Brillant, hoch gehalten von sechs feinen Krappen, auf einer schmalen Schiene aus 18 Karat Gelbgold.',
        details: ['Brillant von 1,00 ct', 'Recyceltes 18 Karat Gelbgold', 'Schienenbreite 1,8 mm', 'Auf Bestellung gefertigt in 3–4 Wochen'] },
      { name: 'Entourage-Ring Rouge',
        text: 'Ein ovaler Rubin, umkränzt von winzigen weißen Diamanten, gefasst in 18 Karat Roségold.',
        details: ['Ovaler Rubin von 1,20 ct', 'Diamant-Entourage von 0,18 ct', 'Recyceltes 18 Karat Roségold', 'Auf Bestellung gefertigt in 4 Wochen'] },
      { name: 'Memoire-Ring Lumière',
        text: 'Runde Diamanten rundum, in geteilten Krappen gefasst, sodass der Ring mehr Licht als Metall ist.',
        details: ['1,50 ct Diamanten insgesamt', 'Recyceltes 18 Karat Weißgold', 'Schienenbreite 2,2 mm', 'Auf Maß gefertigt'] },
      { name: 'Trilogie-Ring Trinity',
        text: 'Ein Saphir im Kissenschliff zwischen zwei runden Diamanten: Vergangenheit, Gegenwart und das, was kommt.',
        details: ['Saphir im Kissenschliff, 1,40 ct', '0,60 ct seitliche Diamanten', 'Recyceltes 18 Karat Weißgold', 'Auf Bestellung gefertigt in 4–5 Wochen'] },
      { name: 'Solitär Verdant',
        text: 'Ein Smaragd im Smaragdschliff, seine langen Facetten wie stilles Wasser, in einem Korb aus vier Krappen in Gelbgold.',
        details: ['Smaragd im Smaragdschliff, 1,80 ct', 'Recyceltes 18 Karat Gelbgold', 'Schienenbreite 2,0 mm', 'Auf Bestellung gefertigt in 5 Wochen'] },
      { name: 'Bandring Aurum',
        text: 'Ein schlichter Ring, sanft gewölbt und spiegelblank poliert. Der Ring, an dem sich alle anderen messen.',
        details: ['Recyceltes 18 Karat Gelbgold', 'Komfortform, 3 mm', 'Gravur inklusive', 'Sofort lieferbar'] },
      { name: 'Tennisarmband Ligne',
        text: 'Zweiundvierzig runde Diamanten in einer geschmeidigen Linie aus Weißgold, die sich am Handgelenk bewegt wie Wasser.',
        details: ['4,20 ct Diamanten insgesamt', 'Recyceltes 18 Karat Weißgold', 'Kastenschloss mit Sicherung', 'Länge 17 cm'] },
      { name: 'Armreif Soleil',
        text: 'Ein massiver ovaler Armreif aus Gelbgold, von Hand vollendet, bis er glänzt wie eine tief stehende Sonne.',
        details: ['Recyceltes 18 Karat Gelbgold', 'Mit Scharnier, 4 mm Profil', 'Innenumfang 17 cm', 'Sofort lieferbar'] },
      { name: 'Armspange Rouge',
        text: 'Eine offene Spange aus Roségold, an jedem Ende ein Rubin, einander zugewandt.',
        details: ['Zwei ovale Rubine von je 0,40 ct', 'Recyceltes 18 Karat Roségold', 'Verstellbare offene Spange', 'Auf Bestellung gefertigt in 3 Wochen'] },
      { name: 'Ohrstecker Étoile',
        text: 'Runde Brillanten in vier Krappen aus Weißgold. Das Paar, das man nie ablegt.',
        details: ['0,80 ct Diamanten insgesamt', 'Recyceltes 18 Karat Weißgold', 'Schraubverschlüsse', 'Sofort lieferbar'] },
      { name: 'Ohrhänger Larme',
        text: 'Smaragde im Tropfenschliff, die von einem einzelnen Diamanten herabfallen und mitschwingen, wenn Sie den Kopf wenden.',
        details: ['Zwei Smaragdtropfen von je 0,90 ct', 'Diamanten von 0,20 ct am Ansatz', 'Recyceltes 18 Karat Gelbgold', 'Länge 28 mm'] },
      { name: 'Creolen Cerise',
        text: 'Schmale Creolen aus Roségold, die Vorderseite gesäumt von winzigen Rubinen.',
        details: ['0,60 ct Rubine insgesamt', 'Recyceltes 18 Karat Roségold', 'Durchmesser 18 mm', 'Scharnierverschluss'] },
      { name: 'Anhänger Grace',
        text: 'Ein runder Diamant, der auf einer feinen Gelbgoldkette zu schweben scheint.',
        details: ['Brillant von 0,70 ct', 'Recyceltes 18 Karat Gelbgold', 'Kette 42–45 cm, verstellbar', 'Sofort lieferbar'] },
      { name: 'Anhänger Nuit',
        text: 'Ein Saphirtropfen, das Blau des Himmels eine Stunde nach Sonnenuntergang, unter einem einzelnen Diamanten.',
        details: ['Saphir im Tropfenschliff, 1,10 ct', 'Diamant von 0,10 ct', 'Recyceltes 18 Karat Weißgold', 'Kette 42–45 cm, verstellbar'] }
    ],

    atelier: {
      eyebrow: 'Das Atelier',
      title: 'Von Hand gefertigt seit 1984',
      lede: 'Vier Werkbänke, ein Fenster zur Straße und seit über vierzig Jahren dasselbe Versprechen: Nichts verlässt das Haus, bevor es vollkommen ist.',
      stats: [
        { label: 'Unser erster Ring' },
        { label: 'Jahre an der Werkbank' },
        { value: '18 kt', label: 'Nur recyceltes Gold' },
        { value: '100 %', label: 'Von Hand gefasst und vollendet' }
      ],
      steps: [
        { title: 'Gezeichnet', text: 'Jedes Stück beginnt als Bleistiftskizze in Originalgröße, gezeichnet und neu gezeichnet, bis die Proportionen stimmen.' },
        { title: 'Gegossen', text: 'Der Entwurf wird in Wachs geschnitzt und dann in recyceltem 18-Karat-Gold gegossen, in unserer eigenen Werkstatt geläutert und legiert.' },
        { title: 'Gefasst', text: 'Jeder Stein wird unter der Lupe gefasst, Krappe für Krappe, und aus jedem Winkel geprüft, bevor der nächste folgt.' },
        { title: 'Vollendet', text: 'Von Hand spiegelblank poliert, punziert und ein letztes Mal geprüft, bevor es für Sie ins Etui kommt.' }
      ]
    },

    bespoke: {
      eyebrow: 'Nach Maß',
      title: 'Ihr eigener Ring',
      lede: 'Wählen Sie Fassung, Metall und Stein. Wir zeichnen ihn, zeigen Ihnen die Steine persönlich und fertigen ihn von Hand.',
      styles: [{ label: 'Solitär' }, { label: 'Entourage' }, { label: 'Trilogie' }, { label: 'Memoire' }],
      metals: [{ label: 'Gelbgold' }, { label: 'Roségold' }, { label: 'Weißgold' }],
      cuts: [{ label: 'Rund' }, { label: 'Oval' }, { label: 'Tropfen' }, { label: 'Smaragd' }, { label: 'Kissen' }]
    },

    voices: [
      { quote: 'Nach einer einzigen verblassten Fotografie haben sie den Ring meiner Großmutter gezeichnet und ihn genau so neu gefertigt. Ich habe im Laden geweint.', place: 'Kundin, Anfertigung nach Maß' },
      { quote: 'Das Tennisarmband hat mein Handgelenk seit zwei Jahren nicht verlassen. Es ist heute schöner als am Tag, an dem ich es gekauft habe.', place: 'Kollektion Lumière' },
      { quote: 'Geduldig, ehrlich bei jedem Stein und nie in Eile. Unsere Eheringe wurden Seite an Seite gefertigt.', place: 'Kollektion Eternal Grace' }
    ],

    promises: [
      { title: 'Versicherter Versand', text: 'Kostenlos, versichert und gegen Unterschrift, in unserem bordeauxroten Etui.' },
      { title: 'Pflege ein Leben lang', text: 'Reinigung, Prüfung der Krappen und Politur, solange Sie es tragen.' },
      { title: 'Kostenlose Größenänderung', text: 'Eine Größenänderung für jeden Ring im ersten Jahr.' },
      { title: 'Gravur', text: 'Ein Name, ein Datum oder ein paar Worte, kostenlos von Hand graviert.' }
    ],

    visit: {
      eyebrow: 'Termin',
      title: 'Eine private Präsentation',
      lede: 'Nehmen Sie bei uns im Atelier Platz, oder treffen Sie uns per Video. Die Stücke, die Sie neugierig machen, liegen für Sie bereit, und wir nehmen uns Zeit für jede Frage.',
      places: [
        { name: 'Das Atelier', lines: ['18 Goldsmiths’ Row', 'Werkstatt und Salon'], hours: 'Di – Sa, 10:00 – 18:00 Uhr' },
        { name: 'Per Video', lines: ['Wo immer Sie sind', 'Die Stücke live unter der Lupe'], hours: 'Mo – Sa, 09:00 – 20:00 Uhr' }
      ],
      reasons: ['Verlobungsring', 'Eheringe', 'Ein Geschenk', 'Anfertigung nach Maß', 'Reparatur oder Größenänderung', 'Einfach schauen']
    },

    footer: {
      newsletter: { title: 'Briefe aus dem Atelier', text: 'Neue Stücke, die Geschichten dahinter und dann und wann eine Einladung. Ein paar Mal im Jahr, nie öfter.' },
      columns: [
        { title: 'Das Haus', links: [{ label: 'Unsere Geschichte' }, { label: 'Kollektionen' }, { label: 'Journal' }, { label: 'Geburtssteine' }] },
        { title: 'Entdecken', links: [{ label: 'Nach Maß' }, { label: 'Geschenkfinder' }, { label: 'Edelsteinlabor' }, { label: 'Ringe kombinieren' }] },
        { title: 'Kundenservice', links: [{ label: 'Termin vereinbaren' }, { label: 'Ringgröße finden' }, { label: 'Pflege & Reparaturen' }, { label: 'Versand & Rückgabe' }] }
      ],
      legal: 'Aurelia Feiner Schmuck. Alle Stücke von Hand gefertigt.'
    }
  });

  /* ---------- shell: header, mega menu, preferences, search, menu, footer, home, 404 (02-content-shell.js) ---------- */
  AU.addLang('de', {
    ui: {
      shell: {
        intro: { edition: 'Nr. 2.0 — Feiner Schmuck', skip: 'Einführung überspringen' },
        head: {
          home: 'Aurelia, Startseite', nav: 'Hauptnavigation', search: 'Suchen', wish: 'Merkliste', bag: 'Warenkorb',
          prefs: 'Einstellungen', menu: 'Menü öffnen', count1: '{n} Stück', countN: '{n} Stücke'
        },
        mega: {
          label: 'Kollektionen', collections: 'Die Kollektionen', byPiece: 'Nach Schmuckstück', allCollections: 'Alle Kollektionen',
          allPieces: 'Alle Stücke', explore: 'Entdecken'
        },
        types: { ring: 'Ringe', bracelet: 'Armbänder', earrings: 'Ohrringe', pendant: 'Anhänger' },
        prefs: {
          title: 'Einstellungen', close: 'Einstellungen schließen',
          language: 'Sprache', currency: 'Währung', sound: 'Klang', appearance: 'Darstellung', season: 'Saison',
          on: 'An', off: 'Aus', dark: 'Dunkel', light: 'Hell',
          seasons: { auto: 'Auto', none: 'Keine', valentine: 'Valentinstag', wedding: 'Hochzeit', holiday: 'Festtage' },
          soundNote: 'Ein leiser Klang, wenn ein Stück in den Warenkorb gelegt wird.',
          seasonNote: 'Auto folgt dem Kalender.'
        },
        search: {
          label: 'Aurelia durchsuchen', placeholder: 'Ein Ring, ein Stein, eine Seite', close: 'Suche schließen', try: 'Versuchen Sie',
          chips: ['Ringe', 'Diamanten', 'Roségold', 'Ringgröße', 'Geschenke'],
          pieces: 'Stücke', pages: 'Seiten', count1: '{n} Ergebnis', countN: '{n} Ergebnisse',
          emptyTitle: 'Nichts gefunden zu „{q}“',
          emptyText: 'Versuchen Sie einen Stein, ein Metall oder eine Kollektion, oder fragen Sie uns bei einer privaten Präsentation.',
          results: 'Ergebnisse', page: 'Seite', story: 'Journal'
        },
        menu: { label: 'Menü', close: 'Menü schließen', discover: 'Entdecken', saved: 'Merkliste', bag: 'Warenkorb', prefs: 'Einstellungen' },
        hero: {
          drag: 'Zum Drehen ziehen', choose: 'Das gezeigte Stück wählen', cue: 'Nach Schmuckstück',
          stageLabel: '{name}, langsam drehend. Zum Drehen ziehen.', artLabel: 'Strichzeichnung eines Rings'
        },
        footer: {
          letter: 'Der Brief', email: 'Ihre E-Mail', placeholder: 'name@beispiel.de', join: 'Anmelden',
          sending: 'Wird gesendet',
          thanks: 'Vielen Dank — Sie sind angemeldet.',
          previewNote: 'Diese Website ist eine Vorschau: Ihre Adresse wurde geprüft, aber noch nirgendwohin gesendet.',
          errEmpty: 'Bitte geben Sie Ihre E-Mail-Adresse an.', errBad: 'Diese E-Mail-Adresse scheint unvollständig.',
          errSend: 'Wir konnten Sie gerade nicht eintragen. Bitte versuchen Sie es gleich noch einmal.',
          contact: 'Kontakt', appearance: 'Darstellung', darkMode: 'Dunkler Modus', top: 'Nach oben',
          since: 'Von Hand gefertigt seit {year}',
          opensIg: '(öffnet Instagram)'
        },
        home: {
          hubEyebrow: 'Die Boutique', hubTitle: 'Finden Sie Ihr Stück', hubAll: 'Alle Stücke',
          featEyebrow: 'Stücke für immer', featTitle: 'In dieser Saison gewählt', featAll: 'Die Boutique',
          doorsEyebrow: 'Erste Schritte', doorsTitle: 'Mehr aus dem Haus',
          journalEyebrow: 'Aus dem Journal', journalAll: 'Alle Geschichten', read: 'Lesen'
        },
        notFound: {
          title: 'Seite nicht gefunden', eyebrow: 'Fehler 404', heading: 'Entschwunden',
          text: 'Die gesuchte Seite ist umgezogen oder hat nie existiert. Durchsuchen Sie das Haus, oder beginnen Sie neu mit einem dieser Wege.',
          search: 'Aurelia durchsuchen', home: 'Zur Startseite',
          description: 'Diese Seite wurde nicht gefunden. Durchsuchen Sie Aurelia oder kehren Sie zur Boutique zurück.'
        }
      }
    },

    home: {
      meta: {
        description: 'Aurelia, feiner Schmuck: Ringe, Armbänder, Ohrringe und Anhänger aus recyceltem 18-Karat-Gold, seit 1984 von Hand gegossen, gefasst und poliert. Nach Schmuckstück stöbern, Ihren Ring entwerfen oder eine private Präsentation buchen.'
      },
      hub: [{ label: 'Ringe' }, { label: 'Armbänder' }, { label: 'Ohrringe' }, { label: 'Anhänger' }],
      doors: [
        { title: 'Nach Maß', text: 'Entwerfen Sie Ihren Ring. Wir zeichnen ihn und fertigen ihn von Hand.' },
        { title: 'Geschenkfinder', text: 'Drei Fragen, drei Ideen, die es wert sind, verschenkt zu werden.' },
        { title: 'Edelsteinlabor', text: 'Drehen Sie einen Stein im Licht: Schliff, Farbe, Reinheit, Karat.' },
        { title: 'Geburtssteine', text: 'Zwölf Monate, zwölf Steine, einer für jeden Geburtstag.' },
        { title: 'Termin', text: 'Eine private Präsentation im Atelier oder per Video.' }
      ],
      atelier: {
        eyebrow: 'Das Atelier',
        line: 'Vier Werkbänke, ein Fenster zur Straße und ein Versprechen, das wir seit 1984 halten: Nichts verlässt das Haus, bevor es vollkommen ist.',
        link: { label: 'Unsere Geschichte' }
      }
    },

    seasons: {
      valentine: { eyebrow: 'Zum Valentinstag — Rubine, schlicht gesagt' },
      wedding: { eyebrow: 'Die Hochzeitssaison — Ringe, paarweise gefertigt' },
      holiday: { eyebrow: 'Zu den Festtagen — Von Hand verpackt' }
    },

    search: {
      pages: [
        { title: 'Ringgröße finden', text: 'Mit einer Bankkarte messen, oder mit einem Ring, den Sie besitzen', keywords: 'größe ringgröße messen finger passform tabelle ringmaß size sizing measure fit chart sizer' },
        { title: 'Geschenkfinder', text: 'Drei Fragen, drei Vorschläge', keywords: 'geschenk präsent idee geburtstag jahrestag weihnachten gift present idea birthday anniversary christmas' },
        { title: 'Edelsteinlabor', text: 'Schliff, Farbe, Reinheit und Karat, im Licht', keywords: 'edelstein stein diamant schliff farbe reinheit karat 4c lernen gem stone diamond cut colour color clarity carat learn' },
        { title: 'Geburtssteine', text: 'Ein Stein für jeden Monat', keywords: 'geburtsstein monat granat amethyst aquamarin perle opal geburtstag birthstone month garnet pearl birthday' },
        { title: 'Ringe kombinieren', text: 'Zwei oder drei Ringe an einem Finger', keywords: 'kombinieren stapeln stapelringe ring ringe ehering memoire stack stacking band bands wedding eternity combine' },
        { title: 'Nach Maß', text: 'Entwerfen Sie Ihren Ring, von Hand gefertigt', keywords: 'nach maß individuell entwurf konfigurator verlobung gravur bespoke custom design configurator engagement engraving' },
        { title: 'Termin', text: 'Eine private Präsentation vereinbaren', keywords: 'besuch termin buchen buchung präsentation salon atelier video visit appointment book booking viewing showroom' },
        { title: 'Kundenservice', text: 'Versand, Rückgabe, Pflege, Größenänderung, Garantie', keywords: 'pflege versand lieferung rückgabe reparatur größenänderung garantie fragen reinigung care delivery shipping returns repair resize warranty faq cleaning' },
        { title: 'Kollektionen', text: 'Eternal Grace, Maison Rouge, Lumière, Heirloom', keywords: 'kollektionen kollektion collections collection' },
        { title: 'Das Atelier', text: 'Unsere Geschichte, seit 1984', keywords: 'atelier geschichte über uns werkstatt handwerk story about history workshop craft' },
        { title: 'Journal', text: 'Geschichten von der Werkbank', keywords: 'journal geschichten lesen blog stories read' },
        { title: 'Vergleichen', text: 'Bis zu drei Stücke nebeneinander', keywords: 'vergleichen vergleich nebeneinander compare comparison side' }
      ]
    }
  });

  /* ---------- shop: collections, boutique, product pages, compare, bag, checkout (02-content-shop.js) ---------- */
  AU.addLang('de', {
    ui: {
      shop: {
        metals: { yellow: '18 Karat Gelbgold', rose: '18 Karat Roségold', white: '18 Karat Weißgold' },
        metalShort: { yellow: 'Gelbgold', rose: 'Roségold', white: 'Weißgold' },
        stones: {
          diamond: 'Diamant', ruby: 'Rubin', emerald: 'Smaragd', sapphire: 'Saphir', garnet: 'Granat', amethyst: 'Amethyst',
          aquamarine: 'Aquamarin', peridot: 'Peridot', citrine: 'Citrin', topaz: 'Topas', tourmaline: 'Turmalin',
          tanzanite: 'Tansanit', pearl: 'Perle', opal: 'Opal', none: 'Nur Gold'
        },
        cuts: { round: 'Brillantschliff', oval: 'Ovalschliff', pear: 'Tropfenschliff', emerald: 'Smaragdschliff', cushion: 'Kissenschliff' },
        types: { all: 'Alle', ring: 'Ringe', bracelet: 'Armbänder', earrings: 'Ohrringe', pendant: 'Anhänger' },
        typeOne: { ring: 'Ring', bracelet: 'Armband', earrings: 'Ohrringe', pendant: 'Anhänger' },
        size: 'Größe {s}',
        sizeTbc: 'Größe wird noch bestätigt',
        engraved: 'Graviert „{t}“',

        pieces: '{n} Stücke',
        piece: '{n} Stück',
        explore: 'Entdecken',
        exploreAria: '{name} entdecken',
        save: 'Merken',
        saved: 'Gemerkt',
        saveAria: '{name} merken',
        unsaveAria: '{name} von der Merkliste entfernen',
        savedToast: 'Auf Ihrer Merkliste',
        unsavedToast: 'Von Ihrer Merkliste entfernt',
        compare: 'Vergleichen',
        compareAria: '{name} vergleichen',
        compareFull: 'Es lassen sich bis zu drei Stücke gleichzeitig vergleichen.',
        compareAdded: 'Zum Vergleich hinzugefügt',
        addToBag: 'Hinzufügen',   // 'In den Warenkorb' (label 171px) is still clipped in the product page's buy button: re-measured round 2, the button is 166px at 1080 (96px of text room) and 217px at 1440 and 390 (148px of room). Never 'Kaufen' (reads as buy now). Switch once that button has 171px of text room.
        added: 'Hinzugefügt',
        addedToast: 'In Ihrem Warenkorb',
        viewPiece: '{name} ansehen',
        moveHint: 'Fahren Sie über ein Stück, um es im Licht zu drehen.',
        touchHint: 'Berühren Sie ein Stück, um es näher zu sehen.',
        back: 'Zurück',

        collections: {
          eyebrow: 'Die Kollektionen',
          title: 'Vier Häuser',
          lede: 'Vier Häuser im Haus, jedes mit eigenem Stein, eigenem Gold und eigener Vorstellung von Licht.',
          index: 'Kollektion {n} von 4',
          piecesIn: 'Die Stücke',
          all: 'Alle Kollektionen',
          next: 'Nächste Kollektion',
          viewing: 'Persönlich ansehen',
          viewingText: 'Jedes Stück aus {name} legen wir Ihnen bei einer privaten Präsentation vor, im Atelier oder per Video.',
          book: 'Termin vereinbaren',
          missingTitle: 'Diese Kollektion ist umgezogen',
          missingText: 'Vielleicht trägt sie einen neuen Namen. Alle vier Häuser finden Sie auf der Seite der Kollektionen.'
        },

        boutique: {
          eyebrow: 'Die Boutique',
          title: 'Stücke für immer',
          lede: 'In unserem Atelier von Hand gegossen, gefasst und poliert.',
          typeLede: {
            ring: 'Solitäre, Entourage-Ringe und schlichte Ringe, jeder auf Maß gefertigt und vollendet.',
            bracelet: 'Tennisarmbänder, Armreife und Spangen, gemacht, um sich mit dem Handgelenk zu bewegen.',
            earrings: 'Ohrstecker, Ohrhänger und Creolen, die bei jeder Drehung das Licht einfangen.',
            pendant: 'Einzelne Steine, die auf einer feinen Goldkette zu schweben scheinen.'
          },
          filterType: 'Nach Art filtern',
          refine: 'Verfeinern',
          refineN: 'Verfeinern ({n})',
          refineTitle: 'Auswahl verfeinern',
          close: 'Schließen',
          collection: 'Kollektion',
          metal: 'Metall',
          stone: 'Stein',
          price: 'Preis',
          priceFrom: 'Von',
          priceTo: 'Bis',
          priceMin: 'Niedrigster Preis',
          priceMax: 'Höchster Preis',
          sort: 'Sortieren',
          sortLabel: 'Sortieren nach',
          sorts: { featured: 'Empfohlen', 'price-asc': 'Preis aufsteigend', 'price-desc': 'Preis absteigend', name: 'Name, A bis Z' },
          anyCollection: 'Alle Kollektionen',
          clear: 'Alle löschen',
          remove: 'Filter entfernen: {name}',
          show: '{n} Stücke zeigen',
          showOne: '1 Stück zeigen',
          showNone: 'Kein Stück passt',
          active: 'Aktive Filter',
          emptyTitle: 'Hier ist noch nichts',
          emptyText: 'Derzeit passt kein Stück zu dieser Auswahl. Das Atelier kann eines für Sie fertigen.',
          emptyReset: 'Alle Stücke zeigen',
          noteEyebrow: 'Nach Maß',
          noteTitle: 'Für eine einzige Hand',
          noteText: 'Wählen Sie Fassung, Gold und Stein. Wir zeichnen ihn mit Ihnen und fertigen ihn dann von Hand.',
          noteLink: 'Ihren Ring entwerfen',
          gridLabel: 'Stücke'
        },

        tray: {
          label: 'Stücke zum Vergleichen',
          title: 'Vergleichen',
          go: '{n} vergleichen',
          clear: 'Leeren',
          remove: '{name} aus dem Vergleich entfernen',
          room: 'Noch bis zu {n}',
          full: 'Bereit zum Vergleich'
        },

        piece: {
          crumbs: 'Brotkrümelnavigation',
          home: 'Startseite',
          boutique: 'Boutique',
          stageLabel: '{name}, {material}. Zum Drehen ziehen.',
          drag: 'Zum Drehen ziehen',
          tools: 'Ansichtswerkzeuge',
          loupe: 'Lupe',
          loupeOn: 'Lupe aktiv: über das Stück fahren',
          light: 'Licht',
          lights: { studio: 'Studio', daylight: 'Tageslicht', candle: 'Kerzenlicht', evening: 'Abend' },
          lightNow: 'Licht: {name}',
          tryon: 'Anprobieren',
          tryonNone: 'Die Anprobe braucht eine Kamera und ist hier nicht verfügbar.',
          turnAria: 'Das Stück von selbst drehen lassen',
          compare: 'Vergleichen',
          compareOn: 'Im Vergleich',
          share: 'Teilen',
          shared: 'Link kopiert',
          shareFail: 'Kopieren Sie die Adresse aus der Leiste oben, um dieses Stück zu teilen.',
          sizeLabel: 'Ringgröße',
          sizeUnit: '(US)',
          sizeChoose: 'Größe wählen',
          sizeOption: 'US {s}',
          sizeFind: 'Größe finden',
          sizeErr: 'Bitte wählen Sie eine Ringgröße. Unsicher? Im ersten Jahr ändern wir die Größe einmal kostenlos.',
          engraving: 'Gravur',
          engravingAdd: 'Gravur hinzufügen',
          engravingHint: 'Kostenlos von Hand in die Innenseite der Schiene graviert.',
          engravingPlaceholder: 'Ein Name, ein Datum, ein paar Worte',
          engravingCount: '{n} von 18',
          engravingSample: 'Für immer',
          engravingPreview: 'Vorschau der Gravur',
          fonts: { script: 'Schreibschrift', serif: 'Serif', roman: 'Antiqua' },
          fontLabel: 'Schrift',
          qty: 'Anzahl',
          less: 'Eins weniger',
          more: 'Eins mehr',
          inBag: 'In Ihrem Warenkorb.',
          viewBag: 'Zum Warenkorb',
          details: 'Details',
          delivery: 'Versand & Rückgabe',
          care: 'Pflege',
          stackEyebrow: 'Kombinieren',
          stackTitle: 'Zusammen mit anderen tragen',
          stackText: 'Sehen Sie diesen Ring neben bis zu zwei weiteren Ringen an einem Finger, im Licht drehend, mit dem Preis der Kombination.',
          stackLink: 'Ringe kombinieren',
          lookEyebrow: 'Aus demselben Haus',
          lookTitle: 'Dazu passend',
          missingTitle: 'Dieses Stück ist umgezogen',
          missingText: 'Vielleicht hat es einen neuen Namen oder ein neues Zuhause gefunden. Jedes unserer Stücke finden Sie in der Boutique.',
          missingLink: 'Zurück zur Boutique',
          promises: ['Kostenloser versicherter Versand', 'Eine kostenlose Größenänderung im ersten Jahr', 'Gravur von Hand, kostenlos']
        },

        info: {
          delivery: [
            'Kostenloser versicherter Versand gegen Unterschrift, in unserem bordeauxroten Etui. Sofort lieferbare Stücke verlassen das Atelier innerhalb von zwei Werktagen; auf Bestellung gefertigte Stücke folgen der in ihren Details genannten Zeit.',
            'Rücksendungen nehmen wir innerhalb von 30 Tagen nach Lieferung an, ungetragen und im Etui. Gravierte Stücke und Anfertigungen nach Maß entstehen allein für Sie und sind von der Rückgabe ausgeschlossen, doch ihre Größe ändern wir jederzeit.'
          ],
          care: [
            'Gold und Diamanten lieben warmes Wasser, einen Tropfen milde Seife und eine weiche Bürste. Mit einem fusselfreien Tuch trocken tupfen.',
            'Halten Sie Perlen und Opale von Parfum und Wasser fern, und bewahren Sie jedes Stück in einem eigenen Säckchen auf, damit sich die Steine nie gegenseitig zerkratzen.',
            'Bringen Sie uns jedes Stück zur kostenlosen Reinigung, Prüfung der Krappen und Politur, solange Sie es tragen.'
          ]
        },

        comparePage: {
          eyebrow: 'Vergleichen',
          title: 'Nebeneinander',
          lede: 'Bis zu drei Stücke, die sich gemeinsam drehen. Ziehen Sie eines, und alle drehen sich mit.',
          rows: { price: 'Preis', collection: 'Kollektion', metal: 'Metall', stone: 'Stein', cut: 'Schliff', carat: 'Hauptstein', details: 'Details' },
          remove: 'Entfernen',
          removeAria: '{name} aus dem Vergleich entfernen',
          addMore: 'Stück hinzufügen',
          emptyTitle: 'Noch nichts zu vergleichen',
          emptyText: 'Wählen Sie in der Boutique mit „Vergleichen“ bis zu drei Stücke, sie warten dann hier auf Sie.',
          emptyLink: 'Zur Boutique',
          canvasLabel: '{names}, gemeinsam drehend. Zum Drehen ziehen.'
        },

        bag: {
          title: 'Ihr Warenkorb und Ihre Merkliste',
          tabs: 'Warenkorb und Merkliste',
          bag: 'Warenkorb',
          saved: 'Merkliste',
          close: 'Warenkorb schließen',
          listBag: 'Stücke in Ihrem Warenkorb',
          listSaved: 'Gemerkte Stücke',
          qtyOf: 'Anzahl von {name}',
          less: 'Eins weniger',
          more: 'Eins mehr',
          removeOne: '{name} entfernen',
          remove: 'Entfernen',
          move: 'In den Warenkorb',
          moved: 'In Ihren Warenkorb gelegt',
          subtotal: 'Zwischensumme',
          ship: 'Kostenloser versicherter Versand gegen Unterschrift, in unserem bordeauxroten Etui.',
          checkout: 'Zur Kasse',
          emptyBagTitle: 'Ihr Warenkorb ist leer',
          emptyBagText: 'Jedes Stück ist von Hand gefertigt, und die Boutique ist ein schöner Ort für den Anfang.',
          emptyBagLink: 'Die Boutique entdecken',
          emptySavedTitle: 'Noch nichts gemerkt',
          emptySavedText: 'Berühren Sie das Herz an einem Stück, um es hier zu bewahren, während Sie sich entscheiden.',
          emptySavedLink: 'Zur Boutique'
        },

        checkout: {
          eyebrow: 'Kasse',
          title: 'Ihre Bestellung',
          steps: ['Übersicht', 'Angaben', 'Versand', 'Zahlung'],
          stepOf: 'Schritt {n} von 4',
          progress: 'Fortschritt der Bestellung',
          reviewTitle: 'Ihre Stücke',
          editBag: 'Warenkorb ändern',
          detailsTitle: 'Ihre Angaben',
          detailsText: 'Damit wir Ihnen sagen können, wann Ihr Stück das Atelier verlässt, und Sie vor der Zustellung anrufen.',
          name: 'Vollständiger Name',
          email: 'E-Mail',
          phone: 'Telefon',
          optional: '(optional)',
          errName: 'Bitte geben Sie Ihren Namen ein.',
          errEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
          errPhone: 'Bitte geben Sie eine Telefonnummer an, unter der wir Sie erreichen.',
          errAddress: 'Bitte geben Sie Straße und Hausnummer ein.',
          errCity: 'Bitte geben Sie den Ort ein.',
          errPost: 'Bitte geben Sie die Postleitzahl ein.',
          errCountry: 'Bitte wählen Sie ein Land.',
          errFix: 'Einige Angaben verdienen einen zweiten Blick.',
          deliveryTitle: 'Versand',
          address: 'Straße und Hausnummer',
          address2: 'Wohnung, Etage',
          city: 'Ort',
          postcode: 'Postleitzahl',
          country: 'Land',
          countryChoose: 'Land wählen',
          method: 'Versandart',
          methods: [
            { label: 'Versicherter Versand', text: 'Gegen Unterschrift, in 3–5 Werktagen' },
            { label: 'Express, versichert', text: 'Am nächsten Werktag, gegen Unterschrift' },
            { label: 'Abholung im Atelier', text: 'Nach Vereinbarung, in Ruhe, mit Zeit für Ihre Fragen' }
          ],
          note: 'Eine handgeschriebene Karte',
          notePlaceholder: 'Wir schreiben sie von Hand und legen sie in das Etui',
          paymentTitle: 'Zahlung',
          paymentText: 'Die Zahlung erfolgt immer auf der sicheren Seite unseres Zahlungsanbieters. Aurelia sieht und speichert Ihre Karte nie.',
          contact: 'Kontakt',
          shipTo: 'Lieferung an',
          collectAt: 'Abholung im Atelier',
          edit: 'Ändern',
          summary: 'Bestellübersicht',
          subtotal: 'Zwischensumme',
          delivery: 'Versand',
          free: 'Kostenlos',
          total: 'Gesamt',
          qtyN: 'Anzahl {n}',
          continue: 'Weiter',
          back: 'Zurück',
          toDelivery: 'Weiter zum Versand',
          toPayment: 'Weiter zur Zahlung',
          pay: 'Sicher bezahlen',
          payStripe: 'Sicher mit Stripe bezahlen',
          payShopify: 'Weiter zur sicheren Zahlung',
          redirecting: 'Wir leiten Sie zu unserer sicheren Zahlungsseite weiter…',
          previewTitle: 'Zahlungen sind noch nicht verbunden',
          previewText: 'Dies ist eine Vorschau der Aurelia-Kasse. Ihre Angaben wurden hier auf der Seite geprüft; nichts wurde belastet und nichts wurde gesendet.',
          previewLink: 'Stattdessen eine private Präsentation buchen',
          stripeMulti: 'Die Online-Zahlung mehrerer Stücke zugleich erfordert die Shopify-Kasse. Bitte bestellen Sie jeweils ein Stück, oder buchen Sie eine private Präsentation, und wir reservieren Ihnen alle.',
          stripeMissing: 'Dieses Stück kann noch nicht online bezahlt werden. Buchen Sie eine private Präsentation, und wir reservieren es für Sie.',
          shopifyError: 'Die Zahlungsseite war nicht erreichbar. Bitte versuchen Sie es gleich noch einmal, oder buchen Sie eine private Präsentation.',
          emptyTitle: 'Ihr Warenkorb ist leer',
          emptyText: 'Noch gibt es nichts zu bestellen. Die Boutique ist ein schöner Ort für den Anfang.',
          emptyLink: 'Die Boutique entdecken',
          secure: 'Versicherter Versand gegen Unterschrift, in unserem bordeauxroten Etui'
        },

        meta: {
          collections: 'Kollektionen',
          collectionsDesc: 'Die vier Häuser von Aurelia: Eternal Grace, Maison Rouge, Lumière und Heirloom. Feiner Schmuck, von Hand gefertigt seit 1984.',
          boutique: 'Boutique',
          boutiqueDesc: 'Ringe, Armbänder, Ohrringe und Anhänger aus recyceltem 18-Karat-Gold, von Hand gegossen, gefasst und poliert. Nach Kollektion, Metall, Stein und Preis filtern.',
          typeDesc: '{type} von Aurelia, aus recyceltem 18-Karat-Gold, von Hand gefasst und vollendet.',
          compare: 'Vergleichen',
          compareDesc: 'Vergleichen Sie bis zu drei Stücke von Aurelia nebeneinander, gemeinsam im Licht drehend.',
          checkout: 'Kasse',
          checkoutDesc: 'Prüfen Sie Ihre Stücke und schließen Sie Ihre Bestellung ab, mit kostenlosem versichertem Versand.',
          notFound: 'Nicht gefunden'
        },

        countries: [
          { name: 'Vereinigte Staaten' }, { name: 'Kanada' }, { name: 'Vereinigtes Königreich' },
          { name: 'Irland' }, { name: 'Frankreich' }, { name: 'Deutschland' }, { name: 'Österreich' },
          { name: 'Schweiz' }, { name: 'Belgien' }, { name: 'Niederlande' },
          { name: 'Luxemburg' }, { name: 'Italien' }, { name: 'Spanien' }, { name: 'Portugal' },
          { name: 'Dänemark' }, { name: 'Schweden' }, { name: 'Norwegen' }, { name: 'Finnland' },
          { name: 'Polen' }, { name: 'Griechenland' }, { name: 'Vereinigte Arabische Emirate' },
          { name: 'Japan' }, { name: 'Singapur' }, { name: 'Hongkong' },
          { name: 'Australien' }, { name: 'Neuseeland' }
        ]
      }
    }
  });

  /* ---------- bespoke: configurator, size finder, stack builder, gem lab (02-content-bespoke.js) ---------- */
  AU.addLang('de', {
    bespoke: {
      stones: [
        { label: 'Diamant', plural: 'Diamanten' }, { label: 'Rubin', plural: 'Rubine' }, { label: 'Smaragd', plural: 'Smaragde' },
        { label: 'Saphir', plural: 'Saphire' }, { label: 'Amethyst', plural: 'Amethyste' }, { label: 'Aquamarin', plural: 'Aquamarine' },
        { label: 'Granat', plural: 'Granate' }, { label: 'Peridot', plural: 'Peridote' }, { label: 'Citrin', plural: 'Citrine' },
        { label: 'Topas', plural: 'Topase' }, { label: 'Turmalin', plural: 'Turmaline' }, { label: 'Tansanit', plural: 'Tansanite' },
        { label: 'Perle', plural: 'Perlen' }, { label: 'Opal', plural: 'Opale' }
      ],
      fonts: [{ label: 'Schreibschrift' }, { label: 'Serif' }, { label: 'Antiqua' }],
      lights: [{ label: 'Studio' }, { label: 'Tageslicht' }, { label: 'Kerzenlicht' }, { label: 'Abend' }]
    },

    gemLab: {
      stones: {
        diamond: 'Reiner Kohlenstoff, das härteste Material der Natur. Geliebt für sein weißes Licht und sein Feuer, die farbigen Blitze, die er wirft.',
        ruby: 'Korund, gefärbt von einer Spur Chrom: das Rot unseres Hauses. In der Härte nur dem Diamanten unterlegen.',
        emerald: 'Grüner Beryll, in langen Stufen geschliffen, um den natürlichen Garten in seinem Inneren zu beruhigen. Weicher, darum fassen wir ihn in schützende Krappen.',
        sapphire: 'Korund in jeder Farbe außer Rot. Klassisch ist ein samtiges Kornblumenblau, das seine Farbe auch bei Kerzenlicht behält.',
        amethyst: 'Violetter Quarz, von zartem Flieder bis zu tiefem Königspurpur. Der Stein des Februars.',
        aquamarine: 'Beryll in der Farbe von Meerwasser: klar, kühl und leuchtend. Der Stein des März.',
        garnet: 'Ein warmes Weinrot, das bei Kerzenlicht glüht. Der Stein des Januars.',
        peridot: 'Olivin aus der Tiefe der Erde, ein helles Frühlingsgrün. Der Stein des Augusts.',
        citrine: 'Quarz in Honig und dem Gelb des späten Nachmittags. Der Stein des Novembers.',
        topaz: 'Klar und brillant, hier in einem kühlen Himmelblau. Der zweite Stein des Novembers.',
        tourmaline: 'Ein Kristall, der jede Farbe tragen kann; unserer ist ein zartes Rosa. Der Stein des Oktobers.',
        tanzanite: 'Gefunden in einem einzigen Tal in Tansania: ein Violettblau, das sich wandelt, wenn man ihn dreht. Der Stein des Dezembers.',
        pearl: 'Gewachsen, nicht geschliffen: Schicht um Schicht Perlmutt, mit einem sanften inneren Schimmer, dem Lüster. Der Stein des Junis.',
        opal: 'Kieselsäure, die das Licht in wandernde Farbblitze bricht, das Farbenspiel. Der Stein des Oktobers.'
      },
      cuts: {
        round: 'Brillantschliff: siebenundfünfzig Facetten, angeordnet für das meiste Funkeln aller Schliffe.',
        oval: 'Ovalschliff: ein in die Länge gezogener Brillant, sodass der Stein für sein Gewicht größer wirkt und den Finger streckt.',
        pear: 'Tropfenschliff: an einem Ende rund, am anderen spitz, wie ein fallender Tropfen. Getragen mit der Spitze zum Nagel.',
        emerald: 'Smaragdschliff (Treppenschliff): lange, ruhige Facetten wie stilles Wasser. Weniger Funkeln, mehr Tiefe und Klarheit.',
        cushion: 'Kissenschliff: ein weiches Quadrat mit gerundeten Ecken, der antike Schliff, mit großen, langsamen Lichtblitzen.'
      },
      uncut: 'Perlen und Opale werden nicht facettiert: Sie sehen sie so, wie sie gewachsen oder poliert sind, rund oder als glatter Cabochon.',
      caratText: 'Ein Karat ist ein Fünftelgramm. Bei {ct} ct misst ein runder Stein etwa {mm} mm im Durchmesser.',
      colourD: [
        { text: 'Vollkommen farblos: die Spitze der Skala, eisweiß und selten.' },
        { text: 'Farblos. Nur ein Gutachter kann ihn neben einem Vergleichsstein von einem D unterscheiden.' },
        { text: 'Für das Auge farblos, unter der Lupe beinahe. Die letzte der farblosen Stufen.' },
        { text: 'Nahezu farblos. Von oben wirkt er weiß; ein Hauch von Wärme zeigt sich nur von der Seite.' },
        { text: 'Nahezu farblos und einer unserer Favoriten in Gelb- und Roségold, wo jede Wärme verschwindet.' },
        { text: 'Nahezu farblos, mit sanfter Wärme bei größeren Steinen. Ein sehr schönes Verhältnis.' },
        { text: 'Ein Anflug von Wärme, sichtbar bei einem größeren Stein. Wunderschön in Gelbgold.' },
        { text: 'Eine leichte, warme Tönung, wie bei einem alten Diamanten. Am schönsten in Gelbgold.' }
      ],
      colourS: [
        { id: 'Hell', text: 'Blass und leuchtend. Lebendig in jedem Licht und am nachsichtigsten bei Einschlüssen.' },
        { id: 'Mittelhell', text: 'Frisch und klar, mit einer Farbe, die man über den Tisch hinweg bemerkt.' },
        { id: 'Mittel', text: 'Das Gleichgewicht, das die meisten Gutachter für ideal halten: gesättigt, ohne dunkel zu werden.' },
        { id: 'Mitteltief', text: 'Satte, samtige Farbe, der begehrteste Ton bei Rubin und Saphir.' },
        { id: 'Tief', text: 'Dunkel und dramatisch. Bei Kerzenlicht kann er fast schwarz wirken.' }
      ],
      clarity: [
        { name: 'Lupenrein', text: 'Nichts im Inneren oder an der Oberfläche, selbst bei zehnfacher Vergrößerung. Weniger als ein Stein von hundert.' },
        { name: 'Innen lupenrein', text: 'Nichts im Inneren bei zehnfacher Vergrößerung; nur feinste Oberflächenspuren, die beim Polieren verschwinden.' },
        { name: 'Sehr, sehr kleine Einschlüsse', text: 'Winzige Einschlüsse, die ein geübter Gutachter unter der Lupe kaum findet.' },
        { name: 'Sehr, sehr kleine Einschlüsse', text: 'Winzige Einschlüsse, bei zehnfacher Vergrößerung sehr schwer zu sehen.' },
        { name: 'Sehr kleine Einschlüsse', text: 'Kleine Einschlüsse, unter der Lupe schwer zu finden und für das Auge unsichtbar.' },
        { name: 'Sehr kleine Einschlüsse', text: 'Kleine Einschlüsse, die ein Gutachter mit etwas Mühe findet. Für das Auge rein: unsere übliche Wahl.' },
        { name: 'Kleine Einschlüsse', text: 'Einschlüsse, die man unter der Lupe bemerkt; meist für das Auge noch rein.' },
        { name: 'Kleine Einschlüsse', text: 'Einschlüsse, unter der Lupe leicht zu sehen, manchmal von der Seite sichtbar.' },
        { name: 'Einschlüsse', text: 'Einschlüsse, die mit bloßem Auge sichtbar sind. Sie können die Brillanz dämpfen.' }
      ],
      clarityNote: 'Farbsteine werden mit dem Auge statt mit der Lupe beurteilt; die meisten Smaragde tragen einen kleinen Garten in sich, und das gehört dazu.',
      colourPearl: [
        { id: 'Weiß', text: 'Strahlendes Weiß mit rosigem Überton: die klassische Farbe von Südsee- und Akoya-Perlen.' },
        { id: 'Silber', text: 'Ein kühles Silberweiß, das wunderschön in Weißgold sitzt.' },
        { id: 'Creme', text: 'Ein sanftes Creme, warm auf der Haut und reizvoll in Gelbgold.' },
        { id: 'Champagner', text: 'Ein blasses Gold, das im Kerzenlicht leuchtet.' },
        { id: 'Golden', text: 'Eine tiefgoldene Perle, die seltenste und wärmste der Südsee.' }
      ],
      colourOpal: [
        { id: 'Weiß', text: 'Weißer Opal: ein milchiger Körper mit sanften Pastellblitzen.' },
        { id: 'Kristall', text: 'Kristallopal: klar genug, um hineinzusehen, die Farbe schwebt im Inneren.' },
        { id: 'Grau', text: 'Grauer Opal: ein rauchiger Körper, der die Farbe hervortreten lässt.' },
        { id: 'Dunkel', text: 'Dunkler Opal: tiefes Graublau, vor dem die Blitze lebhaft leuchten.' },
        { id: 'Schwarz', text: 'Schwarzer Opal: der seltenste, das Farbenspiel lodernd auf fast Schwarz.' }
      ],
      clarityPearl: 'Perlen werden nach Lüster und Oberfläche beurteilt, nicht nach Reinheit: Hier reicht die Skala von makelloser Haut bis zu ein paar kleinen Spuren.',
      clarityOpal: 'Bei einem Opal steht die Skala für die Leuchtkraft des Farbenspiels, von lodernd bis sanft.'
    },

    ui: {
      bespoke: {
        meta: {
          bespoke: { title: 'Ring nach Maß', description: 'Entwerfen Sie Ihren eigenen Ring mit Aurelia: Fassung, Metall, Stein, Schliff, Karat, Größe und eine von Hand gravierte Inschrift, live in 3D.' },
          size: { title: 'Ringgröße finden', description: 'Finden Sie Ihre Ringgröße in zwei Minuten am Bildschirm: mit einer Bankkarte kalibrieren, einen eigenen Ring messen oder ein Ringmaß aus Papier drucken.' },
          stack: { title: 'Ringe kombinieren', description: 'Kombinieren Sie bis zu drei Ringe von Aurelia an einem Finger, in 3D, und sehen Sie den Preis des Sets.' },
          lab: { title: 'Edelsteinlabor', description: 'Drehen Sie einen Stein im Licht und verändern Sie Schliff, Karat, Farbe und Reinheit, mit einer klaren Erklärung jeder Stufe.' }
        },
        eyebrow: 'Nach Maß',
        title: 'Ihr eigener Ring',
        lede: 'Wählen Sie jedes Detail und sehen Sie zu, wie Ihr Ring entsteht.',
        steps: { style: 'Fassung', metal: 'Metall', stone: 'Stein', cut: 'Schliff, Karat', size: 'Größe', engraving: 'Gravur' },
        next: 'Weiter: {step}',
        moreStones: 'Weitere Steine',
        fewerStones: 'Weniger Steine',
        cut: 'Schliff',
        carat: 'Karat',
        caratValue: '{ct} Karat',
        eternityNote: 'Ein Memoire-Ring ist rundum mit kleinen, aufeinander abgestimmten runden Steinen besetzt; es gibt also keinen Hauptstein, dessen Schliff oder Größe zu wählen wäre.',
        eternityCut: 'Rund, abgestimmt',
        cutEmerald: 'Smaragd',
        stoneSum: '{stone} im {cut}schliff, {ct}\u00a0ct',
        sizeDown: 'Eine halbe Größe kleiner',
        sizeUp: 'Eine halbe Größe größer',
        allAround: 'Rundum',
        roundAllAround: 'Runde {stones}, rundum',
        sizeLabel: 'Ringgröße (US)',
        sizeUS: 'US {n}',
        sizeLine: 'UK {uk} · EU {eu} · {mm} mm Durchmesser',
        sizeMeasured: 'Ihre gemessene Größe',
        findSize: 'Größe finden',
        engravingLabel: 'Inschrift',
        engravingPlaceholder: 'Ein Name, ein Datum…',
        engravingHint: 'Bis zu {n} Zeichen, von Hand in die Innenseite der Schiene graviert.',
        engravingFont: 'Schrift',
        engravingEmpty: 'Ihre Worte',
        engravingNone: 'Ohne Inschrift',
        caption: 'Größe {size}',
        stageLabel: 'Ihr Ring nach Maß: {summary}',
        dragHint: 'Zum Drehen ziehen',
        loupe: 'Lupe',
        loupeOn: 'Lupe schließen',
        reset: 'Ansicht zurücksetzen',
        light: 'Licht',
        yourRing: 'Ihr Ring',
        estimate: 'Schätzung',
        add: 'In den Warenkorb',   // fits the configurator's button at 390–1440 (219px min, label 171px); never 'Kaufen'
        added: 'Hinzugefügt',
        addedToast: '{name} liegt in Ihrem Warenkorb',
        consult: 'Beratung buchen',
        note: 'Eine Schätzung für den gezeigten Entwurf. Jeder Auftrag wird persönlich mit Ihnen bestätigt, Stein für Stein.',
        liveEstimate: '{summary}. Geschätzter Preis {price}.',
        ringName: '{style}-Ring nach Maß',
        cartMeta: '18 Karat {metal} · {stone} · Größe {size}',
        cartEngraved: ' · Graviert „{text}“',
        consultNotes: '{summary}, Größe {size}{engraving}. Schätzung {price}.',
        consultEngraving: ', graviert „{text}“',

        size: {
          eyebrow: 'Kundenservice',
          title: 'Ringgröße finden',
          lede: 'Zwei Minuten, eine Bankkarte und ein Ring, der Ihnen passt. Oder drucken Sie ein Ringmaß aus Papier, oder lesen Sie die Tabelle.',
          step1: 'Kalibrieren',
          step2: 'Messen',
          step1Title: 'Eine Karte am Bildschirm abgleichen',
          step1Text: 'Halten Sie eine Bankkarte flach an den Bildschirm, ihre linke obere Ecke in der markierten Ecke. Ändern Sie die Größe des Umrisses, bis er genau an den Kanten der Karte liegt.',
          step1Any: 'Jede Karte im Standardformat eignet sich: eine Debitkarte, ein Ausweis oder ein Bibliotheksausweis (85,6 × 54 mm).',
          cardLabel: 'Größe des Kartenumrisses',
          cardDone: 'Passt genau',
          smaller: 'Umriss etwas verkleinern',
          larger: 'Umriss etwas vergrößern',
          smallerRing: 'Kreis etwas verkleinern',
          largerRing: 'Kreis etwas vergrößern',
          pxmm: '{v} px / mm',
          step2Title: 'Einen eigenen Ring messen',
          step2Text: 'Legen Sie einen Ring, der an den gewünschten Finger passt, auf den Kreis. Ändern Sie die Größe des Kreises, bis sein Rand genau innerhalb der Innenkante des Rings liegt.',
          recalibrate: 'Neu kalibrieren',
          diameter: 'Innendurchmesser',
          yourSize: 'Ihre Größe',
          between: 'Zwischen zwei Größen: Wir empfehlen die größere, für mehr Komfort.',
          sizeUS: 'US {n}',
          ukeu: 'UK {uk} · EU {eu}',
          use: 'Diese Größe wählen',
          used: 'Gespeichert: Größe {n}',
          usedToast: 'Größe {n} gespeichert. Wir wählen sie für Sie vor.',
          designRing: 'Einen Ring entwerfen',
          shopRings: 'Ringe ansehen',
          calibrated: 'Kalibriert: {v} Pixel pro Millimeter',
          outOfRange: 'Außerhalb unserer Größen: Bitte buchen Sie eine Anprobe, und wir messen persönlich.',
          chartTitle: 'Größentabelle',
          chartLede: 'Innendurchmesser und Umfang für jede Größe, die wir fertigen.',
          chartD: 'Durchmesser',
          chartC: 'Umfang',
          printTitle: 'Ein Ringmaß aus Papier',
          printText: 'Drucken Sie einen Streifen, den Sie um den Finger legen, und eine Kreistabelle für einen Ring. Drucken Sie mit 100 % (Originalgröße) und prüfen Sie die 50-mm-Linie mit einem Lineal.',
          print: 'Ringmaß drucken',
          tipsTitle: 'Ein paar Hinweise',
          tips: [
            'Messen Sie am Ende des Tages, wenn die Finger am größten sind, und nie, wenn sie kalt sind.',
            'Eine breite Schiene (über 5 mm) sitzt enger: Wählen Sie eine halbe Größe mehr.',
            'Ist das Fingergelenk breiter als der Fingeransatz, messen Sie am Gelenk.',
            'Zu jedem Ring gehört eine kostenlose Größenänderung im ersten Jahr.'
          ],
          sheetTitle: 'Ringmaß',
          sheetCheck: 'Diese Linie muss genau 50 mm messen. Falls nicht, drucken Sie erneut mit 100 % (Originalgröße).',
          sheetStrip: 'Schneiden Sie den Streifen aus, legen Sie ihn um den Ansatz Ihres Fingers und lesen Sie die Größe dort ab, wo das Ende die Skala trifft.',
          sheetCircles: 'Legen Sie einen passenden Ring auf die Kreise: Ihre Größe ist der Kreis, der genau innerhalb seines Randes liegt.',
          sheetFoot: 'Aurelia — Feiner Schmuck. Von Hand gefertigt seit 1984.',
          howTo: 'So messen Sie Ihre Ringgröße am Bildschirm',
          cardLong: '85,6 mm',
          cardShort: '54 mm'
        },

        stack: {
          eyebrow: 'Ringe kombinieren',
          title: 'Ihre Kombination',
          lede: 'Bis zu drei Ringe an einem Finger, in der Reihenfolge, die Ihnen gefällt.',
          slots: 'Ihre Kombination',
          slot: 'Ring {n}',
          emptySlot: 'Wählen Sie unten einen Ring',
          choose: 'Ringe wählen',
          add: 'Hinzufügen',
          inStack: 'In der Kombination',
          full: 'Ihre Kombination ist vollständig: Entfernen Sie einen Ring, um sie zu ändern.',
          up: '{name} nach oben',
          down: '{name} nach unten',
          remove: '{name} entfernen',
          total: 'Das Set',
          addAll: 'Alle in den Warenkorb',
          addedAll: 'Ihre Kombination liegt im Warenkorb',
          addedToast: '{n} Ringe liegen in Ihrem Warenkorb',
          empty: 'Beginnen Sie mit einem schlichten Ring, dann fügen Sie einen Stein hinzu.',
          clear: 'Leeren',
          stageLabel: 'Ihre Kombination an einer Hand: {names}',
          stageEmpty: 'Eine leere Hand, die auf Ringe wartet'
        },

        lab: {
          eyebrow: 'Edelsteinlabor',
          title: 'Einen Stein lesen',
          lede: 'Ein Stein im Licht. Verändern Sie ihn, und lesen Sie, was jede Stufe bedeutet.',
          stone: 'Stein',
          cut: 'Schliff',
          carat: 'Karat',
          colour: 'Farbe',
          clarity: 'Reinheit',
          price: 'Richtpreis',
          priceNote: 'Für den losen Stein, vor dem Fassen. Nur zur Orientierung: Jeder Stein wird persönlich bewertet.',
          design: 'Einen Ring mit diesem Stein entwerfen',
          designShort: 'Ring entwerfen',
          consult: 'Fragen Sie uns nach diesem Stein',
          consultShort: 'Fragen Sie uns',
          noRing: 'Perlen und Opale fassen wir auf Auftrag: Fragen Sie uns, und wir bringen Ihnen ein Tablett an den Tisch.',
          stageLabel: '{stone}, {cut}, {ct} Karat, Farbe {colour}, Reinheit {clarity}',
          cabochon: 'Cabochon',
          sphere: 'Rund, wie gewachsen',
          still: 'Als Illustration gezeigt',
          views: 'Ansicht',
          viewHome: 'Dreiviertelansicht',
          viewTop: 'Von oben, durch die Tafel',
          viewSide: 'Von der Seite',
          consultNotes: '{stone}, {cut}, {ct} Karat, Farbe {colour}, Reinheit {clarity}. Richtpreis {price}.'
        }
      }
    }
  });

  /* ---------- story: atelier, journal, birthstones, gifts, visit, care (02-content-story.js) ---------- */
  AU.addLang('de', {
    ui: {
      story: {
        common: {
          minRead: '{n} Min. Lesezeit',
          save: 'Merken',
          savedToast: 'Auf Ihrer Merkliste',
          removedToast: 'Von Ihrer Merkliste entfernt',
          viewPiece: 'Das Stück ansehen',
          copied: 'Link kopiert',
          chapters: 'Kapitel',
          more: 'Mehr von Aurelia',
          contact: {
            title: 'Lieber schreiben oder anrufen?',
            text: 'Im Atelier beantwortet ein Mensch jede Nachricht, meist noch am selben Tag.',
            email: 'Schreiben Sie uns',
            call: 'Rufen Sie uns an',   // 'Das Atelier anrufen' wraps to two lines in /visit's label column at 1440 (measured)
            hours: 'Mo – Sa, 09:00 – 18:00 Uhr'
          }
        },

        atelier: {
          metaTitle: 'Das Atelier',
          metaDesc: 'Im Atelier von Aurelia: geschmolzenes recyceltes Gold, die vier Schritte, die jedes Stück durchläuft, unsere Geschichte von 1984 bis heute und was unsere Kunden sagen.',
          eyebrow: 'Das Atelier',
          titleLead: 'Von Hand gefertigt seit',
          lede: 'Vier Werkbänke, ein Fenster zur Straße und seit über vierzig Jahren dasselbe Versprechen: Nichts verlässt das Haus, bevor es vollkommen ist.',
          chapters: ['Flüssiges Gold', 'Die vier Schritte', 'Unsere Jahre', 'In ihren Worten'],
          forge: {
            eyebrow: 'Flüssiges Gold',
            title: 'Vom Gold zum Ring',
            label: 'Recyceltes Gold schmilzt, fließt in eine Ringform und kühlt zu einem Ring ab',
            tempLabel: 'Im Schmelztiegel',
            phases: [
              { title: 'Aufs Gramm gewogen', text: 'Recyceltes 18-Karat-Gold, in unserer eigenen Werkstatt geläutert und legiert, wird für einen einzigen Ring abgewogen.' },
              { title: 'Geschmolzen', text: 'Im Tiegel wird es bei tausendvierundsechzig Grad flüssig, hell wie eine kleine Sonne.' },
              { title: 'Gegossen', text: 'Ein ruhiger Guss füllt die Form. Es gibt keine zweite Gelegenheit, und auch keine Eile.' },
              { title: 'Zum Ring erkaltet', text: 'Das Gold setzt sich, wird dunkel und erwacht dann unter der Polierscheibe von Neuem.' }
            ]
          },
          process: {
            eyebrow: 'Das Handwerk',
            title: 'Vier Schritte, eine Werkbank',
            figure: 'Ein Solitärring auf seinem Weg durch das Atelier: mit Bleistift gezeichnet, in Gold gegossen, mit seinem Stein gefasst und vollendet.',
            hallmark: 'Punze'
          },
          timeline: {
            eyebrow: 'Unsere Jahre',
            title: 'Ein Haus, Jahr für Jahr',
            hint: 'Scrollen Sie durch die Jahre',
            hintTouch: 'Wischen Sie durch die Jahre',
            hintArrows: 'Seitlich scrollen oder die Pfeile nutzen',
            today: 'Heute',
            region: 'Die Chronik von Aurelia',
            prev: 'Früher',
            next: 'Später'
          },
          voices: {
            title: 'In ihren Worten',
            region: 'Was unsere Kunden sagen',
            slide: '{n} von {total}',
            pause: 'Stimmen anhalten',
            play: 'Stimmen abspielen',
            prev: 'Vorherige Stimme',
            next: 'Nächste Stimme'
          },
          promises: { title: 'Unsere Versprechen' },
          end: {
            title: 'Kommen Sie an die Werkbank',
            text: 'Sehen Sie die Stücke in dem Licht, in dem sie entstanden sind, und lernen Sie die Hände kennen, die sie gefertigt haben.',
            visit: 'Termin vereinbaren',
            bespoke: 'Ring nach Maß beginnen'
          }
        },

        journal: {
          metaTitle: 'Journal',
          metaDesc: 'Geschichten aus dem Atelier von Aurelia: Ringe nach Fotografien gezeichnet, warum wir nur recyceltes Gold verarbeiten und wie man einen Stein bei Kerzenlicht wählt.',
          eyebrow: 'Journal',
          title: 'Briefe von der Werkbank',
          lede: 'Kurze Geschichten aus dem Atelier, geschrieben zwischen zwei Stücken: wie sie entstanden sind, und warum.',
          read: 'Die Geschichte lesen',
          nextStory: 'Nächste Geschichte',
          notFound: 'Diese Geschichte wurde nicht gefunden.',
          backToJournal: 'Zurück zum Journal',
          share: 'Diese Geschichte teilen'
        },

        birthstones: {
          metaTitle: 'Geburtssteine',
          metaDesc: 'Der Geburtssteinkalender von Aurelia: zwölf Monate, zwölf Steine, was jeder bedeutet, wie man ihn pflegt, und ein Ring, um ihn herum entworfen.',
          eyebrow: 'Geburtssteine',
          title: 'Ein Stein für jeden Monat',
          lede: 'Zwölf Monate, zwölf Steine. Wählen Sie einen Monat, und sehen Sie seinen Stein ins Licht drehen, was er in sich trägt und wie man ihn bewahrt.',
          months: 'Monate',
          monthOf: 'Geburtsstein im {month}',
          colour: 'Farbe',
          meaning: 'Bedeutung',
          care: 'Pflege',
          hardness: 'Härte',
          mohs: 'auf der Mohs-Skala',
          design: 'Mit diesem Stein entwerfen',
          ask: 'Fragen Sie uns',
          askNote: 'Diesen Stein fassen wir nur auf Auftrag. Erzählen Sie uns, was Ihnen vorschwebt.',
          stage: 'Die zwölf Geburtssteine auf einem langsam drehenden Ring; im Vordergrund: {stone}'
        },

        gifts: {
          metaTitle: 'Geschenkfinder',
          metaDesc: 'Drei Fragen, drei Stücke: Der Geschenkfinder von Aurelia schlägt Schmuck vor, je nachdem, für wen er ist, welchen Stil die Person liebt und welches Budget Sie haben.',
          eyebrow: 'Geschenkfinder',
          title: 'Ein Geschenk, wohlüberlegt',
          lede: 'Drei Fragen, dann drei Stücke, die wir selbst wählen würden.',
          step: 'Frage {n} von {total}',
          back: 'Zurück',
          again: 'Neu beginnen',
          share: 'Link zu diesen Vorschlägen kopieren',
          resultsEyebrow: 'Unsere Vorschläge',
          resultsTitle: 'Drei, die wir wählen würden',
          resultsFor: 'Für {who}, {style}, {budget}',
          none: 'Nichts passt genau zu jeder Antwort, darum hier die nächstliegenden.',
          questions: {
            who: { q: 'Für wen ist es?', options: { partner: 'Partner', mother: 'Mutter', friend: 'Freundin', self: 'Für mich', bride: 'Braut' } },
            style: { q: 'Welcher Stil?', options: { classic: 'Klassisch', modern: 'Modern', bold: 'Ausdrucksstark', delicate: 'Zart' },
              hints: { classic: 'Formen, die nie aus der Zeit fallen', modern: 'Klare Linien, leise Überraschung', bold: 'Farbe und Präsenz', delicate: 'Fein, leicht, nah an der Haut' } },
            budget: { q: 'Und das Budget?', options: { under: 'Unter {a}', mid: '{a} bis {b}', over: 'Über {b}' } }
          },
          whoShort: { partner: 'den liebsten Menschen', mother: 'eine Mutter', friend: 'eine Freundin', self: 'Sie selbst', bride: 'eine Braut' },
          budgetShort: { under: 'unter {a}', mid: '{a} bis {b}', over: 'über {b}' },
          why: {
            for: {
              partner: 'Für den Menschen, den Sie wieder wählen würden',
              mother: 'Für die Hände, die Ihnen fast alles beigebracht haben',
              friend: 'Für eine Freundschaft, die es wert ist, gefeiert zu werden',
              self: 'Weil man manches für sich selbst wählt',
              bride: 'Für den einen Tag, und jeden danach'
            },
            style: {
              classic: 'eine Form, die nie aus der Zeit fällt',
              modern: 'klare Linien mit einer leisen Überraschung',
              bold: 'Farbe und Präsenz, leicht getragen',
              delicate: 'fein genug, um es nie abzulegen'
            },
            type: {
              ring: 'Ein Ring für jeden Tag des Jahres',
              bracelet: 'Ein Armband, das sich am Handgelenk bewegt wie Wasser',
              earrings: 'Ohrringe, die bei jeder Kopfbewegung das Licht einfangen',
              pendant: 'Ein Anhänger, der dort ruht, wo die Hand zum Herzen geht'
            },
            occasion: {
              engagement: 'gemacht für eine Frage, die es wert ist',
              wedding: 'gemacht für den Tag selbst, und jeden danach',
              anniversary: 'für die Jahre, die schon gezählt sind',
              birthday: 'für einen Geburtstag, der in Erinnerung bleibt',
              everyday: 'leicht genug, um es nie abzulegen',
              celebration: 'für die Abende, die zählen'
            }
          }
        },

        visit: {
          metaTitle: 'Private Präsentation buchen',
          metaDesc: 'Buchen Sie eine private Präsentation im Atelier von Aurelia oder per Video. Wählen Sie Tag und Uhrzeit; die Stücke, die Sie neugierig machen, liegen bereit.',
          formTitle: 'Einen Termin anfragen',
          formNote: 'Alle Felder sind erforderlich, sofern nicht als optional markiert.',
          where: 'Wo', date: 'Datum', time: 'Uhrzeit', you: 'Über Sie',
          reasonLabel: 'Was führt Sie zu uns', choose: 'Bitte wählen',
          name: 'Ihr Name', email: 'E-Mail', phone: 'Telefon', notes: 'Anmerkungen', optional: 'optional',
          notesPh: 'Ein Stück, das Sie gesehen haben, ein Stein, den Sie lieben, ein Datum, das wir bedenken sollten',
          prevMonth: 'Vorheriger Monat', nextMonth: 'Nächster Monat', chooseDay: 'Tag wählen',
          closedSun: 'Sonntags geschlossen', closedSunMon: 'Sonntags und montags geschlossen',
          closedDay: 'geschlossen', notAvailable: 'nicht verfügbar',
          closedThere: 'An diesem Tag haben wir dort geschlossen. Bitte wählen Sie einen anderen.',
          send: 'Termin anfragen',
          sending: 'Wird gesendet',
          summaryEmpty: 'Wählen Sie Tag und Uhrzeit.',
          byVideo: 'per Video', at: '{place}',
          errors: {
            place: 'Bitte wählen Sie, wo wir uns treffen.',
            date: 'Bitte wählen Sie einen Tag.',
            time: 'Bitte wählen Sie eine Uhrzeit.',
            reason: 'Bitte sagen Sie uns, was Sie zu uns führt.',
            name: 'Bitte nennen Sie uns Ihren Namen.',
            emailEmpty: 'Wir brauchen eine E-Mail-Adresse, um Ihren Termin zu bestätigen.',
            email: 'Diese E-Mail-Adresse scheint unvollständig.',
            phoneChars: 'Bitte nur Ziffern, Leerzeichen und +.',
            phoneShort: 'Diese Nummer scheint etwas kurz.',
            send: 'Ihre Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es noch einmal, oder schreiben Sie uns an {email}.'
          },
          done: {
            title: 'Vielen Dank',
            line: 'Wir bestätigen innerhalb eines Tages per E-Mail.',
            preview: 'Vorschau: Dieses Formular ist noch nicht verbunden, es wurde also nichts gesendet.',
            calendly: 'Unser Kalender hat sich in einem neuen Tab geöffnet: Wählen Sie dort die Zeit, die Ihnen passt.',
            again: 'Weiteren Termin buchen',
            calendar: 'Zum Kalender hinzufügen',
            calendarTitle: 'Private Präsentation — {brand}',
            calendarFile: 'aurelia-private-praesentation',
            rows: { where: 'Wo', when: 'Wann', time: 'Uhrzeit', reason: 'Anlass' }
          },
          prefilled: 'Wir haben eingetragen, was wir wissen. Ändern Sie, was Sie möchten.',
          reasons: [
            { label: 'Verlobungsring' },
            { label: 'Eheringe' },
            { label: 'Ein Geschenk' },
            { label: 'Anfertigung nach Maß' },
            { label: 'Reparatur oder Größenänderung' },
            { label: 'Einfach schauen' }
          ]
        },

        care: {
          metaTitle: 'Kundenservice',
          metaDesc: 'Der Kundenservice von Aurelia: versicherter Versand und Rückgabe, Pflege Ihres Schmucks, Reparaturen und Größenänderungen, unsere lebenslange Garantie und Antworten auf häufige Fragen.',
          eyebrow: 'Kundenservice',
          title: 'Umsorgt, ein Leben lang',
          lede: 'Alles, was geschieht, nachdem ein Stück die Werkbank verlassen hat: wie es zu Ihnen kommt, wie Sie es bewahren und wie wir uns darum kümmern, solange Sie es tragen.',
          jump: 'Springen zu',
          help: 'Noch eine Frage?',
          helpText: 'Schreiben Sie uns, rufen Sie an oder besuchen Sie uns. Ein Mensch aus dem Atelier antwortet Ihnen.',
          helpVisit: 'Termin vereinbaren'
        }
      }
    },

    timeline: [
      { title: 'Eine Werkbank am Fenster', text: 'Unsere Gründerin mietet eine Werkbank und ein Fenster zur Straße und verkauft ihren ersten Ring an eine Nachbarin.' },
      { title: 'Die erste Auszubildende', text: 'Eine zweite Werkbank, ein zweites Paar Hände. Jede Fasserin und jeder Fasser seither hat am selben Tisch gelernt.' },
      { title: 'Der Grace-Solitär', text: 'Sechs feine Krappen und eine schmale Schiene: Der Ring, aus dem Eternal Grace werden sollte, entsteht für eine Hochzeit im Juni.' },
      { title: 'Nur recyceltes Gold', text: 'Wir kaufen kein neu gefördertes Gold mehr. Jedes Gramm seither wurde aus Gold geläutert, das es bereits gab.' },
      { title: 'Der Salon öffnet', text: 'Der Raum neben der Werkstatt wird zum stillen Salon, in dem unsere Kunden zusehen können, wie ihre Stücke entstehen.' },
      { title: 'Maison Rouge', text: 'Rubine in Roségold werden zur Farbe unseres Hauses in Stein, von der Spange für jeden Tag bis zu den Ohrhängern für den Abend.' },
      { title: 'Vierzig Jahre an der Werkbank', text: 'Heute vier Werkbänke, dasselbe Fenster und dasselbe Versprechen: Nichts verlässt das Haus, bevor es vollkommen ist.' },
      { title: 'Noch immer an der Werkbank', text: 'Jedes Stück wird noch immer von Hand gezeichnet, gegossen, gefasst und vollendet, wenige Schritte von dort, wo das erste entstand.' }
    ],

    journal: [
      {
        kicker: 'Nach Maß',
        title: 'Der Ring, den wir nach einer Fotografie zeichneten',
        standfirst: 'Ein verblasster Abzug, die Hand einer Großmutter und sechs Wochen Zeichnen, bis ein verlorener Ring genau so zurückkam, wie er war.',
        body: [
          'Die Fotografie kam in einem Umschlag, einmal in der Mitte gefaltet. Eine Frau an einer Hochzeitstafel, die Hand auf einem Glas, und am Ringfinger ein Ring, den in der Familie seit dreißig Jahren niemand mehr gesehen hatte.',
          'Camille wollte ihn neu anfertigen lassen. Nicht etwas Ähnliches: denselben Ring, so genau, wie es irgend ging. Wir hatten ein einziges Bild, von der Seite aufgenommen, leicht unscharf, und die Erinnerung einer Enkelin, die diese Hand als Kind gehalten hatte.',
          'Wir begannen, wie immer, mit einem Bleistift. Die Schiene ließ sich an den Fingern daneben leicht abmessen; der Kopf war schwieriger. Wir zeichneten ihn in Originalgröße und dann fünffach vergrößert und hefteten die Zeichnungen neben den Abzug an die Wand.',
          'Das Zeichnen lehrt eine besondere Geduld. Man betrachtet eine Stunde lang denselben Schatten, und eines Abends sieht man, dass es gar kein Schatten ist, sondern die Kante einer Krappe, leicht gedreht, so wie die alten Fasser sie gern drehten.',
          'Nach der Zeichnung schnitzten wir das Wachs, und aus dem Wachs gossen wir das Gold: recycelt, hier bei uns auf das warme Gelb des Originals legiert. Den Stein wählten wir mit dem Auge, aus elf, weil er das Licht so einfing, wie es der Stein auf dem Bild zu tun schien.',
          'Als Camille ihn abholte, steckte sie ihn an, bevor sie überhaupt etwas sagte. Dann nahm sie die Fotografie aus ihrer Tasche und hielt sie neben ihre Hand, und für einen Moment waren beide, der Ring und das Bild, ein und dasselbe.'
        ],
        quote: 'Sie hielt die Fotografie neben ihre Hand, und für einen Moment waren der Ring und das Bild ein und dasselbe.',
        figures: [
          { caption: 'Der vollendete Ring: ein runder Brillant in sechs feinen Krappen, auf einer schmalen Schiene aus Gelbgold.' },
          { caption: 'Eine frühe Studie für den Kopf, gezeichnet, bevor wir uns für einen einzelnen Stein entschieden.' },
          { caption: 'Die Schiene, zuerst gegossen und schlicht belassen, bis der Kopf stimmte.' }
        ]
      },
      {
        kicker: 'Materialien',
        title: 'Warum wir nur recyceltes Gold verarbeiten',
        standfirst: 'Gold nutzt sich nicht ab. Seit 2004 wurde jedes Gramm, das wir verwenden, aus Gold geläutert, das es bereits gab.',
        body: [
          'Fast alles Gold, das je gefördert wurde, ist noch bei uns. Es liegt in Tresoren und Schubladen, in Uhrengehäusen und Eheringen, in den Kontakten alter Telefone. Anders als fast alles, was wir benutzen, rostet es nicht, läuft nicht an und nutzt sich nicht ab.',
          'Im Jahr 2004 beschlossen wir, dass dies Grund genug ist, nicht mehr darum zu bitten, dass noch mehr davon aus der Erde gegraben wird. Seitdem stammt jedes Gramm auf unseren Werkbänken aus Gold, das es bereits gab, zurückgeläutert zu reinem Gold und in unserer eigenen Werkstatt neu legiert.',
          'Geläutertes Gold ist von neu gefördertem nicht zu unterscheiden: dieselben Atome, dasselbe Gewicht, dieselbe Farbe, sobald es legiert ist. Was sich ändert, ist alles, was davor geschah, das Wasser, die Erde und die Energie, die eine neue Mine verlangt hätte.',
          'Wir legieren unser 18-Karat-Gold selbst, um seine Farbe genau zu bestimmen: etwas mehr Kupfer für die Wärme unseres Roségolds, ein Hauch Palladium für ein Weiß, das nicht rhodiniert werden muss, um weiß zu wirken.',
          'Manchmal bringen uns Kunden ihr eigenes Gold: eine gerissene Kette, einen Ring, der nicht mehr zu einem Leben passt. Wir können es läutern und daraus etwas Neues fertigen, und oft ist es das bedeutungsvollste Metall auf der Werkbank.',
          'Nichts davon sieht man dem fertigen Stück an, und genau darum geht es. Es sieht aus wie Gold, weil es Gold ist. Es musste die Erde nur nicht zweimal kosten.'
        ],
        quote: 'Es sieht aus wie Gold, weil es Gold ist. Es musste die Erde nur nicht zweimal kosten.',
        figures: [
          { caption: 'Der Armreif Soleil: massives recyceltes Gelbgold, von Hand vollendet.' },
          { caption: 'Roségold verdankt seine Wärme etwas mehr Kupfer in der Legierung.' },
          { caption: 'Ein schlichter Ring, der klarste Weg, die Farbe des Metalls zu sehen.' }
        ]
      },
      {
        kicker: 'Steine',
        title: 'Einen Stein bei Kerzenlicht wählen',
        standfirst: 'Tageslicht zeigt die Farbe eines Steins. Kerzenlicht zeigt seine Seele. Warum wir nie zulassen, dass ein Kunde unter nur einem Licht wählt.',
        body: [
          'Die meisten Steine werden im denkbar schlechtesten Licht gekauft: dem kalten, gleichmäßigen Glanz einer Ladentheke, der allem gleichermaßen schmeichelt und sehr wenig verrät.',
          'Wir zeigen jeden Stein dreimal. Zuerst am Nordfenster, wo das Tageslicht ehrlich ist, was die Farbe betrifft. Dann unter einer einzelnen Lampe, die zeigt, wie ein Schliff mit einer starken Lichtquelle umgeht. Und zuletzt bei Kerzenlicht, denn dort verbringt Schmuck seine wichtigsten Abende.',
          'Ein Rubin, der mittags nur rot wirkt, kann an einer Flamme zu Glut werden. Ein Smaragd, der am Fenster dunkel schien, öffnet sich wie ein Teich, wenn das Licht tief und warm ist. Diamanten, die unter der Lampe funkeln, werden bei einer Kerze manchmal still; die besten nicht.',
          'Wir dunkeln den Raum dafür ab und lassen uns Zeit. Oft wählen unsere Kunden bei Kerzenlicht einen anderen Stein als den, den sie bei Tag liebten, und fast immer sind sie froh darüber.',
          'Wenn Sie nicht ins Atelier kommen können, tun wir dasselbe per Video: drei Lichter, der Stein, der sich langsam unter der Lupe dreht, und so viele Abende, wie es braucht.'
        ],
        quote: 'Tageslicht zeigt die Farbe eines Steins. Kerzenlicht zeigt seine Seele.',
        figures: [
          { caption: 'Ein Smaragd im Smaragdschliff: dunkel am Fenster, offen wie Wasser an der Flamme.' },
          { caption: 'Ein Rubin in Roségold, der Stein, den wir am liebsten bei Kerzenlicht sehen.' },
          { caption: 'Ein Saphirtropfen, das Blau des Himmels eine Stunde nach Sonnenuntergang.' }
        ]
      }
    ],

    birthstones: [
      { name: 'Granat', colour: 'Tiefes Weinrot', meaning: 'Beständigkeit und sichere Heimkehr: Einst trugen ihn Reisende, damit er sie nach Hause bringt.', care: 'Warmes Seifenwasser und eine weiche Bürste. Schützen Sie ihn vor plötzlichen Temperaturwechseln.' },
      { name: 'Amethyst', colour: 'Violett bis zartes Flieder', meaning: 'Ein klarer Kopf und ein ruhiges Herz; die Griechen glaubten, er bewahre vor Trunkenheit.', care: 'Halten Sie ihn von langem, starkem Sonnenlicht fern, das seine Farbe über die Jahre bleichen kann.' },
      { name: 'Aquamarin', colour: 'Klares Meerblau', meaning: 'Mut und ruhiges Wasser; Seeleute trugen ihn für eine sanfte Überfahrt.', care: 'Hart genug für jeden Tag. Reinigen Sie ihn oft: Seine Farbe zeigt sich am schönsten, wenn er klar ist.' },
      { name: 'Diamant', colour: 'Farbloses Licht', meaning: 'Stärke, die bleibt: der Stein der Versprechen, die gehalten werden wollen.', care: 'Der härteste Stein, doch er zieht Fett an. Ein wöchentliches Bad bewahrt sein ganzes Feuer.' },
      { name: 'Smaragd', colour: 'Tiefes, lebendiges Grün', meaning: 'Erneuerung, Frühling und treue Liebe.', care: 'Die meisten Smaragde sind geölt: kein Ultraschall, kein heißes Wasser, stattdessen ein weiches Tuch.' },
      { name: 'Perle', colour: 'Sanftes, schimmerndes Weiß', meaning: 'Reinheit und Weisheit, langsam gesammelt, Schicht um Schicht.', care: 'Legen Sie Perlen zuletzt an und zuerst ab. Wischen Sie sie nach dem Tragen ab; tauchen Sie sie nie ein.' },
      { name: 'Rubin', colour: 'Glühendes Rot', meaning: 'Leidenschaft, Schutz und ein warmes Herz.', care: 'In der Härte nur dem Diamanten unterlegen. Warmes Wasser, ein wenig Seife, eine weiche Bürste.' },
      { name: 'Peridot', colour: 'Helles Olivgrün', meaning: 'Licht gegen das Dunkel; die Ägypter nannten ihn den Edelstein der Sonne.', care: 'Etwas weicher als die meisten: Bewahren Sie ihn getrennt von härteren Steinen auf, damit er nicht zerkratzt.' },
      { name: 'Saphir', colour: 'Tiefes Kornblumenblau', meaning: 'Wahrheit, Aufrichtigkeit und ein beständiger Geist.', care: 'Sehr hart und sehr nachsichtig. Reinigen Sie ihn wie einen Diamanten, in warmem Seifenwasser.' },
      { name: 'Opal', colour: 'Alle Farben zugleich', meaning: 'Hoffnung und Fantasie; man sagte, er vereine die Tugenden aller Steine.', care: 'Opal speichert Wasser: Halten Sie ihn fern von Hitze und trockener Luft, und tauchen oder dämpfen Sie ihn nie.' },
      { name: 'Topas', colour: 'Goldener Honig', meaning: 'Wärme, Großzügigkeit und Geisteskraft.', care: 'Hart, doch er kann bei einem Stoß spalten: Legen Sie ihn bei Sport und schwerer Arbeit ab.' },
      { name: 'Tansanit', colour: 'Violettblau', meaning: 'Wandel und Neubeginn; nur an einem einzigen Ort der Erde zu finden.', care: 'Tragen Sie ihn mit Sorgfalt und reinigen Sie ihn sanft: nur warmes Wasser und ein weiches Tuch.' }
    ],

    care: {
      sections: [
        { title: 'Versand & Rückgabe', items: [
          { q: 'Wie wird mein Stück geliefert?', a: 'Jede Bestellung reist versichert und gegen Unterschrift, in unserem bordeauxroten Etui, kostenlos. Sofort lieferbare Stücke verlassen das Atelier innerhalb von zwei Werktagen; auf Bestellung gefertigte Stücke brauchen die auf ihrer Seite genannte Zeit.' },
          { q: 'Kann ich ein Stück zurückgeben?', a: 'Ja. Sie haben 30 Tage ab Lieferung, um jedes Stück zurückzugeben, das nicht getragen, graviert oder nach Ihrem eigenen Entwurf gefertigt wurde. Schreiben Sie uns, und wir veranlassen eine versicherte Abholung.' },
          { q: 'Wann wird eine Rücksendung erstattet?', a: 'Sobald das Stück wieder im Atelier ist und geprüft wurde, meist innerhalb von fünf Werktagen, auf dem Weg, auf dem Sie bezahlt haben.' },
          { q: 'Liefern Sie ins Ausland?', a: 'Wir liefern in die meisten Länder, versichert und nachverfolgbar. Etwaige Zölle werden vor der Zahlung angezeigt, damit an der Tür nichts mehr fällig ist.' }
        ] },
        { title: 'Pflege & Reinigung', items: [
          { q: 'Wie reinige ich meinen Schmuck zu Hause?', a: 'Eine Schale warmes Wasser, ein Tropfen milde Seife und eine weiche Zahnbürste. Abspülen, dann mit einem fusselfreien Tuch trocknen. Smaragde, Opale und Perlen brauchen sanftere Pflege: Sehen Sie sich jeden Stein in unserem [Geburtssteinkalender](#/birthstones) an.' },
          { q: 'Was sollte ich vermeiden?', a: 'Chlor, Bleiche und Haushaltsreiniger, Parfum und Haarspray direkt auf den Steinen, und Ultraschallreiniger für geölte oder weiche Steine. Legen Sie Schmuck zuletzt an und zuerst ab.' },
          { q: 'Wie bewahre ich ihn auf?', a: 'Getrennt, in den weichen Säckchen, die wir jedem Stück beilegen, damit härtere Steine weder weichere noch einander zerkratzen.' },
          { q: 'Reinigen Sie Stücke im Atelier?', a: 'Immer, und kostenlos, solange Ihnen das Stück gehört. [Buchen Sie einen Besuch](#/visit), und wir reinigen es, prüfen jede Krappe und polieren es, während Sie warten.' }
        ] },
        { title: 'Reparaturen & Größe', items: [
          { q: 'Lässt sich die Größe meines Rings ändern?', a: 'Die meisten Ringe lassen sich um bis zu zwei Größen ändern. Die erste Größenänderung innerhalb eines Jahres ist kostenlos. Memoire-Ringe werden in der neuen Größe neu gefertigt statt geschnitten. Unsicher bei Ihrer Größe? Nutzen Sie unsere [Ringgrößenhilfe](#/size).' },
          { q: 'Wie lange dauert eine Reparatur?', a: 'Einfache Reparaturen und Größenänderungen dauern etwa eine Woche. Das Neufassen eines Steins oder der Neuaufbau einer Krappe kann zwei bis drei Wochen dauern; wir sagen es Ihnen immer, bevor wir beginnen.' },
          { q: 'Reparieren Sie Schmuck anderer Häuser?', a: 'Oft, ja. Bringen Sie ihn zu einer [privaten Präsentation](#/visit) mit, und unsere Fasser sehen ihn sich mit Ihnen an und sagen Ihnen ehrlich, was sie tun können.' }
        ] },
        { title: 'Garantie', items: [
          { q: 'Was deckt die lebenslange Garantie ab?', a: 'Jeden Fehler in der Fertigung: eine lockere Krappe, eine schwache Lötstelle, einen Verschluss, der nicht hält. Wir reparieren das Stück, oder fertigen es, wenn nötig, kostenlos neu.' },
          { q: 'Was ist nicht abgedeckt?', a: 'Gewöhnliche Abnutzung, Verlust und Schäden durch Unfälle. Dafür bieten wir Reparaturen zum Selbstkostenpreis an und empfehlen Ihnen gern eine spezialisierte Versicherung.' },
          { q: 'Muss ich mein Stück registrieren?', a: 'Nein. Jedes Stück ist im Atelier unter seiner Punze verzeichnet, Ihre Garantie gehört also zum Stück, wohin es auch geht.' }
        ] },
        { title: 'Fragen', items: [
          { q: 'Woher stammen Ihre Steine?', a: 'Wir kaufen bei wenigen Schleifern, die wir seit Jahren kennen und die uns sagen können, wo jeder Stein gefördert und wie er gehandelt wurde. Jeder Diamant ist konfliktfrei.' },
          { q: 'Ist Ihr Gold wirklich recycelt?', a: 'Jedes Gramm seit 2004. Wir läutern und legieren es selbst. Lesen Sie die Geschichte in unserem [Journal](#/journal/recycled-gold).' },
          { q: 'Kann ich ein Stück vor dem Kauf sehen?', a: 'Selbstverständlich. [Buchen Sie eine private Präsentation](#/visit) im Atelier oder per Video, und es liegt für Sie auf dem Tablett bereit.' },
          { q: 'Können Sie mein Stück gravieren?', a: 'Eine Gravur ist bei jedem Ring und den meisten Armbändern inbegriffen: ein Name, ein Datum oder ein paar Worte, von Hand graviert.' }
        ] }
      ]
    }
  });

  /* ---------- try-on (70-tryon.js) and atmos (06-atmos.js) ---------- */
  AU.addLang('de', {
    ui: {
      atmos: { drag: 'Ziehen', view: 'Ansehen' },
      tryon: {
        eyebrow: 'Anprobieren',
        dialog: 'Mit Ihrer Kamera anprobieren',
        kicker: 'Der Spiegel',
        title: 'An Ihrer eigenen Hand',
        lede: 'Sehen Sie das Stück an Ihrer Hand, live, durch Ihre Kamera. Drehen Sie die Hand langsam im Licht und sehen Sie, wie der Stein antwortet.',
        steps: [
          'Erlauben Sie die Kamera, wenn Ihr Browser fragt.',
          'Heben Sie die Hand, den Handrücken zum Bildschirm.',
          'Drehen Sie sie langsam, dann machen Sie ein Foto zur Erinnerung.'
        ],
        bracelet: 'Zeigen Sie Ihr Handgelenk, den Handrücken zum Bildschirm.',
        privacy: 'Das Kamerabild verlässt nie Ihr Gerät.',
        allow: 'Kamera erlauben',
        notNow: 'Nicht jetzt',
        choose: 'Ein Stück wählen',
        rings: 'Ringe',
        bracelets: 'Armbänder',
        yourDesign: 'Ihr Entwurf',
        status: {
          camera: 'Warten auf die Kamera',
          model: 'Der Spiegel wird vorbereitet',
          searching: 'Heben Sie die Hand, den Handrücken zur Kamera',
          searchingWrist: 'Heben Sie die Hand und zeigen Sie Ihr Handgelenk',
          tracking: 'Drehen Sie die Hand langsam im Licht'
        },
        shutter: 'Foto aufnehmen',
        viewPiece: 'Das Stück ansehen',
        close: 'Schließen',
        live: '{name}, an Ihrer Hand, im Kamerabild',
        figure: 'Eine feine Strichzeichnung einer Hand, die {name} trägt',
        photoKicker: 'Gerade aufgenommen',
        photoTitle: 'Ihr Foto',
        photoText: 'Es wird nur gespeichert, wenn Sie es speichern. Nichts wird hochgeladen.',
        photoAlt: '{name}, an Ihrer Hand',
        photoFile: 'aurelia-anprobe',
        save: 'Foto speichern',
        retake: 'Zurück zum Spiegel',
        fallbackKicker: 'Anprobieren',
        openTab: 'In eigenem Tab öffnen',
        retry: 'Erneut versuchen',
        fallback: {
          blocked: { title: 'Die Kamera ruht', text: 'Dieses Fenster konnte die Kamera nicht öffnen; eine Seite, die in einer anderen Seite angezeigt wird, kann das meist nicht. Öffnen Sie die Website in einem eigenen Tab, erlauben Sie die Kamera, und das Stück erscheint an Ihrer Hand.' },
          none: { title: 'Keine Kamera gefunden', text: 'Die Anprobe braucht eine Kamera, die auf Sie gerichtet ist. Auf einem Telefon oder einem Computer mit Kamera funktioniert sie direkt im Browser. Bis dahin sehen Sie das Stück an einer gezeichneten Hand.' },
          busy: { title: 'Die Kamera ist belegt', text: 'Eine andere Anwendung scheint die Kamera zu nutzen. Schließen Sie sie und versuchen Sie es erneut.' },
          unsupported: { title: 'Nicht in diesem Browser', text: 'Die Anprobe braucht einen aktuellen Browser mit Kamerazugriff und 3D. Öffnen Sie die Website in einem eigenen Tab in einem aktuellen Browser, um das Stück an Ihrer Hand zu sehen.' },
          model: { title: 'Der Spiegel ist nicht bereit', text: 'Die Handerkennung konnte nicht geladen werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.' },
          ended: { title: 'Die Kamera wurde beendet', text: 'Die Kamera wurde ausgeschaltet oder getrennt. Versuchen Sie es erneut, sobald sie wieder verfügbar ist.' }
        }
      }
    }
  });
})();
