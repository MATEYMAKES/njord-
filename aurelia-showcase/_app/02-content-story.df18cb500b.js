/* ---- 02-content-story.js ---- */
/* Story area content (atelier, journal, birthstones, gift finder, visit, client care).
   PLACEHOLDER: every milestone, story, date, meaning, policy and answer below is written to show the design and must be
   replaced with Aurelia's real details. Links are routes ('#/visit'). In care answers, [label](#/route) becomes a link.
   Stone and gem colours here are swatches of the stones themselves (allowed by the style guide), never UI colours. */
(function () {
  'use strict';
  var AU = (window.AU = window.AU || {});
  if (!AU.extendContent) return;

  /* ---------------------------------------------------------------------------------------------
     Specs of the pieces shown in the journal and the timeline (pre-rendered by tools/prerender.js)
     --------------------------------------------------------------------------------------------- */
  var S = {
    grace: { type: 'ring', style: 'solitaire', metal: 'yellow', stone: 'diamond', cut: 'round', carat: 1, accent: null },
    trinity: { type: 'ring', style: 'three-stone', metal: 'white', stone: 'sapphire', cut: 'cushion', carat: 1.4, accent: 'diamond' },
    aurum: { type: 'ring', style: 'band', metal: 'yellow', stone: null, cut: null, carat: 0, accent: null },
    soleil: { type: 'bracelet', style: 'bangle', metal: 'yellow', stone: null, cut: null, carat: 0, accent: null },
    cuff: { type: 'bracelet', style: 'cuff', metal: 'rose', stone: 'ruby', cut: 'oval', carat: .4, accent: null },
    verdant: { type: 'ring', style: 'solitaire', metal: 'yellow', stone: 'emerald', cut: 'emerald', carat: 1.8, accent: null },
    rouge: { type: 'ring', style: 'halo', metal: 'rose', stone: 'ruby', cut: 'oval', carat: 1.2, accent: 'diamond' },
    nuit: { type: 'pendant', style: 'drop', metal: 'white', stone: 'sapphire', cut: 'pear', carat: 1.1, accent: 'diamond' },
    tennis: { type: 'bracelet', style: 'tennis', metal: 'white', stone: 'diamond', cut: 'round', carat: .3, accent: null },
    eternity: { type: 'ring', style: 'eternity', metal: 'white', stone: 'diamond', cut: 'round', carat: .25, accent: null },
    larme: { type: 'earrings', style: 'drop', metal: 'yellow', stone: 'emerald', cut: 'pear', carat: .9, accent: 'diamond' }
  };

  AU.extendContent({
    ui: {
      story: {
        common: {
          minRead: '{n} min read',
          save: 'Save',
          savedToast: 'Saved to your wishlist',
          removedToast: 'Removed from your wishlist',
          viewPiece: 'View the piece',
          copied: 'Link copied',
          chapters: 'Chapters',
          more: 'More from Aurelia',
          /* the way to write or call (on /visit, where #/visit?at=contact leads, and at the end of /care) */
          contact: {
            title: 'Prefer to write or call?',
            text: 'A real person at the atelier answers every message, usually within the day.',
            email: 'Write to us',
            call: 'Call the atelier',
            hoursLabel: 'By telephone',             // says whose hours these are (the places above have their own)
            hours: 'Mon – Sat, 09:00 – 18:00'      // PLACEHOLDER hours
          }
        },

        atelier: {
          metaTitle: 'The Atelier',
          metaDesc: 'Inside the Aurelia atelier: molten recycled gold, the four steps every piece passes through, our story from 1984 to today, and what our clients say.',
          eyebrow: 'The Atelier',
          titleLead: 'Handcrafted since',
          lede: 'Four benches, a window onto the street, and the same promise for over forty years: nothing leaves until it is right.',
          chapters: ['Molten gold', 'The four steps', 'Our years', 'In their words'],
          forge: {
            eyebrow: 'Molten gold',
            title: 'From gold to ring',
            label: 'Recycled gold melting, pouring into a ring mould and cooling into a band',
            tempLabel: 'The gold',
            unit: '°C',
            /* four captions on the scene's own timeline: molten in the crucible, the pour, the cooling, the ring freed
               (translator: the order and meaning changed in v2 round 1) */
            phases: [
              { title: 'Melted', text: 'Recycled 18k gold, weighed out by the gram for one ring, turns liquid at one thousand and sixty-four degrees.' },
              { title: 'Poured', text: 'One steady pour fills the mould. There is no second chance, and no hurry either.' },
              { title: 'Cooled', text: 'The gold settles and darkens, from white heat through orange to its own colour.' },
              { title: 'Freed and polished', text: 'The mould opens, and the ring wakes again under the polishing wheel.' }
            ]
          },
          process: {
            eyebrow: 'The process',
            title: 'Four steps, one bench',
            figure: 'A solitaire ring as it moves through the atelier: drawn in pencil, cast in gold, set with its stone, and finished.',
            hallmark: 'Hallmark'
          },
          timeline: {
            eyebrow: 'Our years',
            title: 'A house, year by year',
            hint: 'Scroll to walk through the years',
            hintTouch: 'Swipe through the years',
            hintArrows: 'Scroll sideways, or use the arrows',
            today: 'Today',
            region: 'The Aurelia timeline',
            prev: 'Earlier',
            next: 'Later'
          },
          voices: {
            title: 'In their words',
            region: 'What our clients say',
            slide: '{n} of {total}',
            pause: 'Pause the testimonials',
            play: 'Play the testimonials',
            prev: 'Previous testimonial',
            next: 'Next testimonial'
          },
          promises: { title: 'Our promises' },
          end: {
            title: 'Come to the bench',
            text: 'See the pieces in the light they were made in, and meet the hands that made them.',
            visit: 'Book a private viewing',
            bespoke: 'Begin a bespoke ring'
          }
        },

        journal: {
          metaTitle: 'Journal',
          metaDesc: 'Stories from the Aurelia atelier: rings drawn from photographs, why we only work in recycled gold, and how to choose a stone by candlelight.',
          eyebrow: 'Journal',
          title: 'Letters from the bench',
          lede: 'Short stories from the atelier, written between pieces: how they were made, and why.',
          read: 'Read the story',
          nextStory: 'Next story',
          notFound: 'This story could not be found.',
          backToJournal: 'Back to the journal',
          share: 'Share this story'
        },

        birthstones: {
          metaTitle: 'Birthstones',
          metaDesc: 'The Aurelia birthstone calendar: twelve months, twelve stones, what each one means, how to care for it, and a ring designed around it.',
          eyebrow: 'Birthstones',
          title: 'A stone for every month',
          lede: 'Twelve months, twelve stones. Choose a month to see its stone turn into the light, what it is said to carry, and how to keep it.',
          months: 'Months',
          monthOf: 'Birthstone of {month}',
          colour: 'Colour',
          meaning: 'Meaning',
          care: 'Care',
          hardness: 'Hardness',
          mohs: 'on the Mohs scale',
          design: 'Design with this stone',
          ask: 'Ask us about this stone',
          askNote: 'We set this stone by commission only. Tell us what you have in mind.',
          stage: 'The twelve birthstones on a slowly turning ring; {stone} at the front'
        },

        gifts: {
          metaTitle: 'Gift finder',
          metaDesc: 'Three questions, three pieces: the Aurelia gift finder suggests jewellery by who it is for, their style and your budget.',
          eyebrow: 'Gift finder',
          title: 'A gift, considered',
          lede: 'Three questions, then three pieces we would choose ourselves.',
          step: 'Question {n} of {total}',
          back: 'Back',
          again: 'Start again',
          share: 'Copy the link to these suggestions',
          resultsEyebrow: 'Our suggestions',
          resultsTitle: 'Three we would choose',
          resultsFor: 'For {who}, {style}, {budget}',
          none: 'Nothing fits every answer exactly, so these are the closest.',
          questions: {
            who: { q: 'Who is it for?', options: { partner: 'A partner', mother: 'A mother', friend: 'A friend', self: 'Myself', bride: 'A bride' } },
            style: { q: 'What is their style?', options: { classic: 'Classic', modern: 'Modern', bold: 'Bold', delicate: 'Delicate' },
              hints: { classic: 'Shapes that never date', modern: 'Clean lines, quiet surprise', bold: 'Colour and presence', delicate: 'Fine, light, close to the skin' } },
            budget: { q: 'And the budget?', options: { under: 'Under {a}', mid: '{a} to {b}', over: 'Over {b}' } }
          },
          whoShort: { partner: 'a partner', mother: 'a mother', friend: 'a friend', self: 'yourself', bride: 'a bride' },
          budgetShort: { under: 'under {a}', mid: '{a} to {b}', over: 'over {b}' },
          why: {
            for: {
              partner: 'For the one you would choose again',
              mother: 'For the hands that taught you most things',
              friend: 'For a friendship worth marking',
              self: 'Because some things you choose for yourself',
              bride: 'For the day, and every day after it'
            },
            style: {
              classic: 'a shape that will never date',
              modern: 'clean lines with a quiet surprise',
              bold: 'colour and presence, worn lightly',
              delicate: 'fine enough never to take off'
            },
            type: {
              ring: 'A ring to wear every day of the year',
              bracelet: 'A bracelet that moves like water on the wrist',
              earrings: 'Earrings that catch the light at every turn of the head',
              pendant: 'A pendant that rests just where a hand goes to the heart'
            },
            occasion: {
              engagement: 'made for a question worth asking',
              wedding: 'made for the day itself, and every day after',
              anniversary: 'for the years already counted',
              birthday: 'for a birthday they will remember',
              everyday: 'light enough never to take off',
              celebration: 'for the evenings that matter'
            }
          }
        },

        visit: {
          metaTitle: 'Book a private viewing',
          metaDesc: 'Book a private viewing at the Aurelia atelier or by video. Choose a day and a time; we will have the pieces you are curious about ready.',
          formTitle: 'Request an appointment',
          formNote: 'Every field is needed unless it says optional.',
          where: 'Where', date: 'Date', time: 'Time', you: 'About you',
          reasonLabel: 'What brings you in', choose: 'Choose one',
          name: 'Your name', email: 'Email', phone: 'Phone', notes: 'Notes', optional: 'optional',
          notesPh: 'A piece you have seen, a stone you love, a date to keep in mind',
          prevMonth: 'Previous month', nextMonth: 'Next month', chooseDay: 'Choose a day',
          closedSun: 'Closed on Sundays', closedSunMon: 'Closed on Sundays and Mondays',
          closedDay: 'closed', notAvailable: 'not available',
          closedThere: 'We are closed on that day there. Please choose another.',
          send: 'Request the appointment',
          sending: 'Sending',
          summaryEmpty: 'Choose a day and a time.',
          byVideo: 'by video', at: 'at {place}',
          errors: {
            place: 'Please choose where you would like to meet.',
            date: 'Please choose a day.',
            time: 'Please choose a time.',
            reason: 'Please tell us what brings you in.',
            name: 'Please tell us your name.',
            emailEmpty: 'We need an email to confirm your appointment.',
            email: 'That email address looks incomplete.',
            phoneChars: 'Digits, spaces and + only, please.',
            phoneShort: 'That number looks a little short.',
            send: 'We could not send your request just now. Please try again, or write to us at {email}.'
          },
          done: {
            title: 'Thank you',
            line: 'We will confirm by email within a day.',
            preview: 'Preview: this form is not connected yet, so nothing has been sent.',
            calendly: 'Our calendar has opened in a new tab: choose the time that suits you there.',
            again: 'Book another',
            calendar: 'Add to calendar',
            calendarTitle: 'Private viewing — {brand}',
            calendarFile: 'aurelia-private-viewing',
            rows: { where: 'Where', when: 'When', time: 'Time', reason: 'For' }
          },
          prefilled: 'We have filled in what we know. Change anything you like.',
          reasons: [
            { id: 'engagement', label: 'Engagement ring' },
            { id: 'wedding', label: 'Wedding bands' },
            { id: 'gift', label: 'A gift' },
            { id: 'bespoke', label: 'Bespoke commission' },
            { id: 'repair', label: 'Repair or resizing' },
            { id: 'looking', label: 'Just looking' }
          ]
        },

        care: {
          metaTitle: 'Client care',
          metaDesc: 'Aurelia client care: insured delivery and returns, caring for your jewellery, repairs and resizing, our lifetime warranty, and answers to common questions.',
          eyebrow: 'Client care',
          title: 'Looked after, for life',
          lede: 'Everything that happens after a piece leaves the bench: how it reaches you, how to keep it, and how we look after it for as long as you wear it.',
          jump: 'Jump to',
          help: 'Still have a question?',
          helpText: 'Write to us, call, or come and see us. A real person at the atelier will answer.',
          helpVisit: 'Book a visit'
        }
      }
    },

    /* ---------- the atelier's address (PLACEHOLDER: replace with the real one). It is shown on /visit in place of the
       first line of the atelier's place card, and is written into the calendar file of a booking. ---------- */
    visit: {
      address: ['18 Goldsmiths’ Row', 'London EC1N 8AA']
    },

    /* ---------- the timeline, 1984 → today (PLACEHOLDER milestones) ---------- */
    timeline: [
      { year: 1984, title: 'A bench by the window', text: 'Our founder rents one bench and a window onto the street, and sells her first ring to a neighbour.', spec: S.aurum },
      { year: 1991, title: 'The first apprentice', text: 'A second bench, a second pair of hands. Every setter since has learned at the same table.' },
      { year: 1998, title: 'The Grace solitaire', text: 'Six fine claws and a slim band: the ring that would become Eternal Grace is drawn for a wedding in June.', spec: S.grace },
      { year: 2004, title: 'Recycled gold only', text: 'We stop buying newly mined gold. Every gram since has been refined from gold that already existed.', spec: S.soleil },
      { year: 2011, title: 'The salon opens', text: 'The room beside the workshop becomes a quiet salon, so clients can watch their pieces being made.' },
      { year: 2017, title: 'Maison Rouge', text: 'Rubies in rose gold become our house colour in stone, from everyday cuffs to evening drops.', spec: S.rouge },
      { year: 2024, title: 'Forty years at the bench', text: 'Four benches now, the same window, and the same promise: nothing leaves until it is right.', spec: S.tennis },
      { year: 'now', title: 'Still at the bench', text: 'Every piece is still drawn, cast, set and finished by hand, a few steps from where the first was made.' }
    ],

    /* ---------- the journal (PLACEHOLDER stories). AU.content.journal is used by the home page and search. ---------- */
    journal: [
      {
        slug: 'ring-from-a-photograph',
        kicker: 'Bespoke',
        title: 'The ring we drew from a photograph',
        standfirst: 'One faded print, a grandmother’s hand, and six weeks of drawing until a lost ring came back exactly as it was.',
        date: '2026-09-18',
        spec: S.grace,
        body: [
          'The photograph arrived in an envelope, folded once across the middle. A woman at a wedding table, her hand resting on a glass, and on the third finger a ring that nobody in the family had seen for thirty years.',
          'Camille wanted it made again. Not something like it: the same ring, as near as anyone could tell. We had one picture, taken from the side, slightly out of focus, and the memory of a granddaughter who had held that hand as a child.',
          'We began, as we always do, with a pencil. The band was easy to measure against the fingers around it; the head was harder. We drew it at full size and then at five times, and pinned the drawings to the wall beside the print.',
          'There is a kind of patience that drawing teaches. You look at the same shadow for an hour, and then one evening you see that it is not a shadow at all but the edge of a claw, turned slightly, the way old setters liked to turn them.',
          'From the drawing we carved the wax, and from the wax we cast the gold: recycled, alloyed here to the warm yellow of the original. The stone we chose by eye, out of eleven, because it caught the light the way the stone in the picture seemed to.',
          'When Camille came to collect it she put it on before she said anything at all. Then she took the photograph out of her bag and held it up beside her hand, and for a moment the two of them, the ring and the picture, were the same thing.'
        ],
        quote: 'She held the photograph beside her hand, and for a moment the ring and the picture were the same thing.',
        quoteAfter: 2,
        figures: [
          { spec: S.grace, caption: 'The finished ring: a round brilliant in six fine claws, on a slim yellow-gold band.', after: 0 },
          { spec: S.trinity, caption: 'An early study for the head, drawn before we settled on a single stone.', after: 3 },
          { spec: S.aurum, caption: 'The band, cast first and kept plain until the head was right.', after: 4 }
        ]
      },
      {
        slug: 'recycled-gold',
        kicker: 'Materials',
        title: 'Why we only work in recycled gold',
        standfirst: 'Gold does not wear out. Since 2004, every gram we use has been refined from gold that already existed.',
        date: '2026-06-02',
        spec: S.soleil,
        body: [
          'Almost all the gold ever mined is still with us. It sits in vaults and in drawers, in watch cases and wedding bands, in the contacts of old telephones. Unlike nearly everything else we use, it does not rust, tarnish or wear away.',
          'In 2004 we decided that was reason enough to stop asking for more of it to be dug out of the ground. Since then every gram on our benches has come from gold that already existed, refined back to purity and alloyed again in our own workshop.',
          'Refined gold is indistinguishable from newly mined gold: the same atoms, the same weight, the same colour when it is alloyed. What changes is everything that came before it, the water and the earth and the fuel that a new mine would have needed.',
          'We alloy our own 18k so we can control its colour exactly: a little more copper for the warmth of our rose gold, a touch of palladium for a white that does not need to be plated to look white.',
          'Clients sometimes bring us their own gold: a chain that broke, a ring that no longer fits a life. We can refine it and work it into something new, and it is often the most meaningful metal on the bench.',
          'None of this shows in the finished piece, and that is rather the point. It looks like gold because it is gold. It simply did not have to cost the earth twice.'
        ],
        quote: 'It looks like gold because it is gold. It simply did not have to cost the earth twice.',
        quoteAfter: 2,
        figures: [
          { spec: S.soleil, caption: 'The Soleil bangle: solid recycled yellow gold, finished by hand.', after: 0 },
          { spec: S.cuff, caption: 'Rose gold takes its warmth from a little more copper in the alloy.', after: 3 },
          { spec: S.aurum, caption: 'A plain band, the clearest way to see the colour of the metal.', after: 4 }
        ]
      },
      {
        slug: 'stone-by-candlelight',
        kicker: 'Stones',
        title: 'Choosing a stone by candlelight',
        standfirst: 'Daylight shows a stone’s colour. Candlelight shows its soul. Why we never let a client choose under one light alone.',
        date: '2026-03-14',
        spec: S.verdant,
        body: [
          'Most stones are bought under the worst possible light: the cold, even glare of a shop counter, which flatters everything equally and tells you very little.',
          'We show every stone three times. First by the north window, where daylight is honest about colour. Then under a single lamp, which shows how a cut handles one strong source of light. And last by candlelight, because that is where jewellery spends its most important evenings.',
          'A ruby that looks merely red at noon can turn to embers by a flame. An emerald that seemed dark at the window opens like a pond when the light is low and warm. Diamonds that sparkle under the lamp sometimes go quiet by a candle; the best ones do not.',
          'We keep the room dark for this, and we take our time. Clients often choose a different stone by candlelight than the one they loved by day, and they are almost always glad of it.',
          'If you cannot come to the atelier, we do the same by video: three lights, the stone turning slowly under the loupe, and as many evenings as it takes.'
        ],
        quote: 'Daylight shows a stone’s colour. Candlelight shows its soul.',
        quoteAfter: 1,
        figures: [
          { spec: S.verdant, caption: 'An emerald-cut emerald: dark at the window, open as water by a flame.', after: 0 },
          { spec: S.rouge, caption: 'A ruby in rose gold, the stone we most love to see by candlelight.', after: 2 },
          { spec: S.nuit, caption: 'A pear sapphire, the blue of the sky an hour after sunset.', after: 3 }
        ]
      }
    ],

    /* ---------- birthstones, January → December (PLACEHOLDER meanings and care notes) ---------- */
    birthstones: [
      { id: 'garnet', name: 'Garnet', colour: 'Deep wine red', hardness: '7–7.5', meaning: 'Constancy and safe return: once carried by travellers to bring them home.', care: 'Warm soapy water and a soft brush. Keep it from sudden changes of heat.',
        swatch: 'radial-gradient(circle at 34% 28%,#ff9a9a 0,#9e1328 34%,#5a0712 70%,#2c0208 100%)' },
      { id: 'amethyst', name: 'Amethyst', colour: 'Violet to soft lilac', hardness: '7', meaning: 'A clear head and a calm heart; the Greeks believed it kept the wearer sober.', care: 'Keep it out of long, strong sunlight, which can pale its colour over years.',
        swatch: 'radial-gradient(circle at 34% 28%,#e8cfff 0,#9b62d6 34%,#5b2a92 70%,#2c1048 100%)' },
      { id: 'aquamarine', name: 'Aquamarine', colour: 'Clear sea blue', hardness: '7.5–8', meaning: 'Courage and calm water; sailors wore it for a gentle crossing.', care: 'Hard enough for every day. Clean it often: it shows its colour best when bright.',
        swatch: 'radial-gradient(circle at 34% 28%,#f2ffff 0,#9fdde8 34%,#4fa9c0 70%,#1f5f75 100%)' },
      { id: 'diamond', name: 'Diamond', colour: 'Colourless light', hardness: '10', meaning: 'Strength that lasts: the stone of promises meant to be kept.', care: 'The hardest stone, but it attracts grease. A weekly soak keeps it full of fire.',
        swatch: 'radial-gradient(circle at 34% 28%,#ffffff 0,#eef4fa 34%,#b9c9d8 70%,#6d8296 100%)' },
      { id: 'emerald', name: 'Emerald', colour: 'Deep living green', hardness: '7.5–8', meaning: 'Renewal, spring and faithful love.', care: 'Most emeralds are oiled: no ultrasonic cleaners, no hot water, a soft cloth instead.',
        swatch: 'radial-gradient(circle at 34% 28%,#b6f5cf 0,#1f9a5c 34%,#0b5a33 70%,#032514 100%)' },
      { id: 'pearl', name: 'Pearl', colour: 'Soft lustrous white', hardness: '2.5–4.5', meaning: 'Purity and wisdom gathered slowly, layer by layer.', care: 'Put pearls on last and take them off first. Wipe them after wearing; never soak them.',
        swatch: 'radial-gradient(circle at 36% 30%,#ffffff 0,#f6efe8 30%,#e2d3cb 64%,#b9a49c 100%)' },
      { id: 'ruby', name: 'Ruby', colour: 'Burning red', hardness: '9', meaning: 'Passion, protection and a warm heart.', care: 'Second only to diamond in hardness. Warm water, a little soap, a soft brush.',
        swatch: 'radial-gradient(circle at 34% 28%,#ff8a8a 0,#c8141f 34%,#7a0610 70%,#360207 100%)' },
      { id: 'peridot', name: 'Peridot', colour: 'Bright olive green', hardness: '6.5–7', meaning: 'Light against the dark; the Egyptians called it the gem of the sun.', care: 'A little softer than most: store it apart from harder stones so it is not scratched.',
        swatch: 'radial-gradient(circle at 34% 28%,#f4ffbf 0,#a9c93d 34%,#6b8a17 70%,#334506 100%)' },
      { id: 'sapphire', name: 'Sapphire', colour: 'Deep cornflower blue', hardness: '9', meaning: 'Truth, sincerity and a steady mind.', care: 'Very hard and very forgiving. Clean it like a diamond, in warm soapy water.',
        swatch: 'radial-gradient(circle at 34% 28%,#a9c2ff 0,#2449c2 34%,#10267a 70%,#050f3a 100%)' },
      { id: 'opal', name: 'Opal', colour: 'Every colour at once', hardness: '5.5–6.5', meaning: 'Hope and imagination; it was said to hold the virtues of every stone.', care: 'Opal holds water: keep it from heat and dry rooms, and never soak or steam it.',
        swatch: 'radial-gradient(circle at 30% 30%,rgba(255,255,255,.95) 0,rgba(255,255,255,0) 30%),conic-gradient(from 40deg,#9fe6ff,#c3a6ff,#ffb3d1,#ffe29a,#a8ffcf,#9fe6ff)' },
      { id: 'topaz', name: 'Topaz', colour: 'Golden honey', hardness: '8', meaning: 'Warmth, generosity and strength of mind.', care: 'Hard, but it can split if struck: take it off for sport and heavy work.',
        swatch: 'radial-gradient(circle at 34% 28%,#fff1c9 0,#e8a94a 34%,#b0661a 70%,#5a2f06 100%)' },
      { id: 'tanzanite', name: 'Tanzanite', colour: 'Violet blue', hardness: '6–7', meaning: 'Transformation and a new beginning; found in only one place on earth.', care: 'Wear it with care and clean it gently: warm water and a soft cloth only.',
        swatch: 'radial-gradient(circle at 34% 28%,#d6d1ff 0,#5a5fd0 34%,#30308f 70%,#141446 100%)' }
    ],

    /* ---------- client care (PLACEHOLDER policies) ---------- */
    care: {
      sections: [
        { id: 'delivery', icon: 'truck', title: 'Delivery & returns', items: [
          { q: 'How is my piece delivered?', a: 'Every order travels insured and signed for, in our burgundy box, at no charge. Pieces that are ready to ship leave the atelier within two working days; pieces made to order take the time shown on their page.' },
          { q: 'Can I return a piece?', a: 'Yes. You have 30 days from delivery to return any piece that has not been worn, engraved or made to your own design. Write to us and we will arrange an insured collection.' },
          { q: 'When is a return refunded?', a: 'As soon as the piece is back at the atelier and checked, usually within five working days, to the way you paid.' },
          { q: 'Do you deliver abroad?', a: 'We deliver to most countries, insured and tracked. Any duties are shown before you pay, so nothing is due at the door.' }
        ] },
        { id: 'cleaning', icon: 'sparkle', title: 'Care & cleaning', items: [
          { q: 'How should I clean my jewellery at home?', a: 'A bowl of warm water, a drop of mild soap and a soft toothbrush. Rinse, then dry with a lint-free cloth. Emeralds, opals and pearls need gentler care: see each stone on our [birthstone calendar](#/birthstones).' },
          { q: 'What should I avoid?', a: 'Chlorine, bleach and household cleaners, perfume and hairspray straight onto the stones, and ultrasonic cleaners for any oiled or soft stone. Put jewellery on last and take it off first.' },
          { q: 'How should I store it?', a: 'Separately, in the soft pouches we send with every piece, so harder stones cannot scratch softer ones or each other.' },
          { q: 'Do you clean pieces at the atelier?', a: 'Always, and for free, for as long as you own the piece. [Book a visit](#/visit) and we will clean, check every claw and polish it while you wait.' }
        ] },
        { id: 'repairs', icon: 'ring', title: 'Repairs & resizing', items: [
          { q: 'Can my ring be resized?', a: 'Most rings can be resized by up to two sizes. The first resize within a year is complimentary. Eternity bands are remade to size rather than cut. Not sure of your size? Use our [ring size finder](#/size).' },
          { q: 'How long does a repair take?', a: 'Simple repairs and resizing take about a week. Re-setting a stone or rebuilding a claw can take two to three weeks; we will always tell you before we begin.' },
          { q: 'Do you repair jewellery from other houses?', a: 'Often, yes. Bring it to a [private viewing](#/visit) and our setters will look at it with you and tell you honestly what they can do.' }
        ] },
        { id: 'warranty', icon: 'shield', title: 'Warranty', items: [
          { q: 'What does the lifetime warranty cover?', a: 'Any fault in how the piece was made: a loose claw, a weak solder, a clasp that does not hold. We repair it, or remake it if we must, at no charge.' },
          { q: 'What is not covered?', a: 'Ordinary wear, loss, and damage from accidents. For those we offer repairs at cost, and we can recommend specialist insurance.' },
          { q: 'Do I need to register my piece?', a: 'No. Every piece is recorded at the atelier under its hallmark, so your warranty is with the piece, wherever it goes.' }
        ] },
        { id: 'faq', icon: 'diamond', title: 'Questions', items: [
          { q: 'Where do your stones come from?', a: 'We buy from a small number of cutters we have known for years, who can tell us where each stone was mined and how it was traded. Every diamond is conflict-free.' },
          { q: 'Is your gold really recycled?', a: 'Every gram since 2004. We refine and alloy it ourselves. Read the story in our [journal](#/journal/recycled-gold).' },
          { q: 'Can I see a piece before I buy it?', a: 'Of course. [Book a private viewing](#/visit) at the atelier or by video, and we will have it ready on the tray.' },
          { q: 'Can you engrave my piece?', a: 'Engraving is included on every ring and most bracelets: a name, a date or a few words, cut by hand.' }
        ] }
      ]
    }
  });

  /* Pieces the journal and the timeline show, for tools/prerender.js (content.prerender.extra). Areas that load earlier
     may have added their own: keep theirs and add ours. */
  var extra = [];
  var seen = {};
  var add = function (s) { var k = JSON.stringify(s); if (!seen[k]) { seen[k] = 1; extra.push(s); } };
  var prev = AU.content && AU.content.prerender && AU.content.prerender.extra;
  (Array.isArray(prev) ? prev : []).forEach(add);
  Object.keys(S).forEach(function (k) { add(S[k]); });
  AU.extendContent({ prerender: { extra: extra } });

  /* A string added after the translator's pass. It is registered here so French and German never show the English
     label; 09-lang-fr.js / 09-lang-de.js load later and win if they define it. (Request to the translator: move these.) */
  if (AU.addLang) {
    AU.addLang('fr', { ui: { story: { common: { contact: { hoursLabel: 'Par téléphone' } } } } });
    AU.addLang('de', { ui: { story: { common: { contact: { hoursLabel: 'Telefonisch' } } } } });
  }
})();
