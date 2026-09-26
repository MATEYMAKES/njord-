/* ================================================================
   NJORD — i18n
   A full EN/SHQP (Albanian) translation of every visible string on
   the site. Static markup carries `data-i18n` (textContent),
   `data-i18n-html` (innerHTML — only for the couple of strings that
   need an embedded <strong>/<br>), or `data-i18n-aria` (aria-label).
   Anything generated at runtime (project modal copy, dynamic button
   labels) goes through `t(key)` directly from main.js instead.
   Shqip is the default language; the toggle switches to English.
   ================================================================ */

const STORAGE_KEY = 'njord-lang';
const DEFAULT_LANG = 'sq';

const translations = {
  'nav.work': { en: 'Work', sq: 'Punët' },
  'nav.studio': { en: 'Studio', sq: 'Studio' },
  'nav.services': { en: 'Services', sq: 'Shërbimet' },
  'nav.contact': { en: 'Contact', sq: 'Kontakt' },
  'nav.toggleAria': { en: 'Toggle navigation menu', sq: 'Ndrysho menynë e navigimit' },

  'skip.link': { en: 'Skip to content', sq: 'Kalo te përmbajtja' },

  'sound.ariaLabel': { en: "Toggle NJORD's generative sound", sq: 'Ndrysho tingullin gjenerativ të NJORD' },
  'sound.on': { en: 'Sound on', sq: 'Tingulli ndezur' },
  'sound.off': { en: 'Sound off', sq: 'Tingulli fikur' },

  'logo.ariaLabel': { en: 'NJORD — back to top', sq: 'NJORD — kthehu në krye' },

  'hero.eyebrow': { en: 'Web & Branding Studio', sq: 'Studio Web & Brendi' },
  'hero.descriptor': {
    en: 'We take <strong>primitive digital material</strong> — characters, grids, code — and engineer it into interfaces, identities, and experiences.',
    sq: 'Dizajnojmë dhe zhvillojmë webfaqe, ndërtojmë identitete vizuale dhe krijojmë brende që dallohen — prej idesë së parë deri te produkti final.',
  },
  'hero.scroll': { en: 'Scroll', sq: 'Zbrit' },

  'work.eyebrow': { en: 'Selected Work — 03 Projects', sq: 'Punë të Zgjedhura — 03 Projekte' },
  'work.h2': { en: 'Three worlds, three languages.', sq: 'Tre botë, tre gjuhë.' },
  'work.note': {
    en: 'Each project below runs on its own visual system. NJORD is the index — not the identity — behind any of them.',
    sq: 'Çdo projekt ndërtohet prej zeros për biznesin që përfaqëson. Pa shabllone, pa zgjidhje të gatshme — secili me dizajn, karakter dhe përvojë të vetën.',
  },
  'work.enter': { en: 'Enter', sq: 'Hyr' },

  'work.aurelia.aria': { en: 'Enter Aurelia project', sq: 'Hyr te projekti Aurelia' },
  'work.aurelia.desc': {
    en: 'An editorial approach to jewelry retail: slow motion, warm materials, quiet confidence.',
    sq: 'Një qasje editoriale ndaj tregtisë së bizhuterive: lëvizje e ngadaltë, materiale të ngrohta, siguri e qetë.',
  },
  'work.aurelia.tag1': { en: 'Brand Identity', sq: 'Identitet Brendi' },
  'work.aurelia.tag2': { en: 'E-Commerce', sq: 'Tregti Elektronike' },
  'work.aurelia.tag3': { en: 'Art Direction', sq: 'Drejtim Artistik' },

  'work.pulse.aria': { en: 'Enter Pulse project', sq: 'Hyr te projekti Pulse' },
  'work.pulse.desc': {
    en: 'A loud, kinetic identity for a music festival that never sits still.',
    sq: 'Një identitet i fortë dhe kinetik për një festival muzikor që nuk ndalet kurrë.',
  },
  'work.pulse.tag1': { en: 'Web Design', sq: 'Dizajn Web' },
  'work.pulse.tag2': { en: 'Motion', sq: 'Lëvizje' },
  'work.pulse.tag3': { en: 'Brand System', sq: 'Sistem Brendi' },

  'work.meridian.aria': { en: 'Enter Meridian project', sq: 'Hyr te projekti Meridian' },
  'work.meridian.desc': {
    en: 'Precision-first interface design for a financial platform built on trust and data.',
    sq: 'Dizajn ndërfaqeje me precizion të lartë për një platformë financiare të ndërtuar mbi besim dhe të dhëna.',
  },
  'work.meridian.tag1': { en: 'Product Design', sq: 'Dizajn Produkti' },
  'work.meridian.tag2': { en: 'UI System', sq: 'Sistem UI' },
  'work.meridian.tag3': { en: 'Data Viz', sq: 'Vizualizim të Dhënash' },

  'services.eyebrow': { en: 'Capabilities', sq: 'Aftësitë' },
  'services.h2': { en: 'What we do.', sq: 'Çfarë bëjmë.' },
  'services.note': {
    en: 'Five disciplines, one process, start to finish.',
    sq: 'Pesë disiplina, një proces, nga fillimi deri në fund.',
  },
  'services.01.title': { en: 'Branding & Identity', sq: 'Brending & Identitet' },
  'services.01.desc': {
    en: 'A visual identity that makes your brand instantly recognizable, everywhere.',
    sq: 'Një identitet vizual që e bën brendin tuaj menjëherë të njohshëm, kudo.',
  },
  'services.02.title': { en: 'Website Design & UI/UX', sq: 'Dizajn Webfaqeje & UI/UX' },
  'services.02.desc': {
    en: 'Interfaces built around what people actually need, not just a pretty front.',
    sq: 'Ndërfaqe të ndërtuara sipas asaj që njerëzve u nevojitet vërtet, jo vetëm një pamje e bukur.',
  },
  'services.03.title': { en: 'Back-End Development', sq: 'Zhvillim Back-End' },
  'services.03.desc': {
    en: 'Custom systems — bookings, sales, anything your business runs on.',
    sq: 'Sisteme të personalizuara — rezervime, shitje, çka i nevojitet biznesit tuaj.',
  },
  'services.04.title': { en: 'Local Hosting', sq: 'Hosting Lokal' },
  'services.04.desc': {
    en: 'Hosted on local servers for near-instant load times.',
    sq: 'Hostuar në serverë lokalë, për kohë ngarkimi pothuajse të menjëhershme.',
  },
  'services.05.title': { en: 'SEO & Ongoing Support', sq: 'SEO & Përkrahje e Vazhdueshme' },
  'services.05.desc': {
    en: "We don't disappear at launch — support stays on call after.",
    sq: 'Nuk zhdukemi pas lansimit — përkrahja mbetet gjithmonë gati.',
  },

  'studio.eyebrow': { en: 'Studio', sq: 'Studio' },
  'studio.h2': { en: 'Websites and brands, built from scratch.', sq: 'Webfaqe dhe brende, të ndërtuara prej zeros.' },
  'studio.p1': {
    en: 'NJORD is a web and branding studio. We design and develop websites, create visual identities, and build a digital presence that represents your business properly.',
    sq: 'NJORD është studio për web dhe branding. Dizajnojmë dhe zhvillojmë webfaqe, krijojmë identitete vizuale dhe ndërtojmë një prezencë digjitale që e përfaqëson biznesin si duhet.',
  },
  'studio.p2': {
    en: 'We handle the entire process, from idea to launch — structure, design, development, animation and brand identity. Every project is built specifically for the business, with no templates and no off-the-shelf solutions.',
    sq: 'Merremi me krejt procesin, prej idesë deri te lansimi — struktura, dizajni, zhvillimi, animacionet dhe identiteti i brendit. Çdo projekt ndërtohet posaçërisht për biznesin, pa shabllone dhe pa zgjidhje të gatshme.',
  },
  'studio.p3': {
    en: 'After launch, we host the website on servers in Kosovo and take care of the technical maintenance, so it stays fast, stable, and trouble-free.',
    sq: 'Pas lansimit, webfaqen e hostojmë në serverë në Kosovë dhe kujdesemi për mirëmbajtjen teknike, që të mbetet e shpejtë, stabile dhe pa probleme.',
  },
  'studio.li1': { en: 'Web Design & Development', sq: 'Dizajn & Zhvillim Web' },
  'studio.li2': { en: 'Branding & Visual Identity', sq: 'Branding & Identitet Vizual' },
  'studio.li3': { en: 'Hosting in Kosovo', sq: 'Hosting në Kosovë' },
  'studio.li4': { en: 'Maintenance & Support', sq: 'Mirëmbajtje & Përkrahje' },

  'contact.eyebrow': { en: 'Get In Touch', sq: 'Na Kontaktoni' },
  'contact.h2': { en: "Let's build something that doesn't look like anything else.", sq: 'Le të ndërtojmë diçka që nuk i ngjan asgjë tjetër.' },
  'contact.copied': { en: 'Copied', sq: 'U kopjua' },
  'contact.meta': {
    en: 'Based remotely, worldwide.<br>Currently booking Q1 2026.',
    sq: 'Me bazë në distancë, kudo në botë.<br>Aktualisht duke rezervuar T1 2026.',
  },
  'mascot.ariaLabel': {
    en: "A small figure formed from the page's own characters",
    sq: 'Një figurë e vogël e formuar nga vetë karakteret e faqes',
  },
  'mascot.hint': { en: 'click here', sq: 'kliko këtu' },

  // Mascot conversation — a guided, conversational project intake that
  // opens when the mascot is clicked. See mascot-convo.js. Same
  // conversational, lowercase, informal voice throughout — this is him
  // talking, not a form. Not reviewed by a native Albanian speaker yet,
  // same caveat as the rest of the site's Shqip copy.
  'convo.panelLabel': { en: 'Tell NJORD about your project', sq: 'Trego NJORD-it për projektin tënd' },
  'convo.close': { en: 'Close', sq: 'Mbyll' },
  'convo.back': { en: 'Back', sq: 'Prapa' },
  'convo.continue': { en: 'Continue', sq: 'Vazhdo' },
  'convo.skip': { en: 'Skip', sq: 'Kapërce' },
  'convo.requiredNote': { en: "Just need this one before we continue.", sq: 'Kjo më duhet para se të vazhdojmë.' },

  'convo.open.line1': { en: 'oh, hey.', sq: 'hej.' },
  'convo.open.line2': { en: "you've got something in mind?", sq: 'ke diçka në mendje?' },
  'convo.open.project': { en: 'yeah, i have a project', sq: 'po, kam një projekt' },
  'convo.open.justLooking': { en: 'just looking', sq: 'vetëm po shikoj' },
  'convo.justLooking.reply': {
    en: "cool — i'll be around if you change your mind.",
    sq: 'mirë — jam këtu nëse ndërron mendje.',
  },

  'convo.s1.prompt': { en: "what's the name of your business or project?", sq: 'si quhet biznesi apo projekti yt?' },

  'convo.s2.prompt': { en: 'and what do you guys do?', sq: 'dhe çfarë bëni ju?' },
  'convo.s2.placeholder': { en: 'Tell me in a sentence or two...', sq: 'Më trego me një a dy fjali...' },

  'convo.s3.prompt': { en: 'what brought you to NJORD?', sq: 'çfarë të solli te NJORD?' },
  'convo.s3.opt1': { en: 'Website', sq: 'Website' },
  'convo.s3.opt2': { en: 'Logo / Branding', sq: 'Logo / Brendim' },
  'convo.s3.opt3': { en: 'Both', sq: 'Të dyja' },
  'convo.s3.opt4': { en: 'Something else', sq: 'Diçka tjetër' },
  'convo.s3.opt5': { en: 'Not really sure yet', sq: 'Nuk jam ende i/e sigurt' },

  'convo.s4.prompt1': { en: "tell me what's going on.", sq: 'më trego çfarë po ndodh.' },
  'convo.s4.prompt2': {
    en: 'what are you trying to change, improve or create?',
    sq: 'çfarë po përpiqesh të ndryshosh, përmirësosh apo krijosh?',
  },
  'convo.s4.opt1': { en: 'Starting something brand new', sq: 'Po filloj diçka krejt të re' },
  'convo.s4.opt2': { en: 'Replacing something outdated', sq: 'Po zëvendësoj diçka të vjetëruar' },
  'convo.s4.opt3': { en: 'Growing what we already have', sq: 'Po zgjeroj diçka që tashmë kemi' },
  'convo.s4.opt4': { en: "Something isn't working right", sq: 'Diçka nuk po funksionon si duhet' },
  'convo.s4.opt5': { en: 'Not sure yet', sq: 'Ende nuk jam i/e sigurt' },

  'convo.s5.prompt': { en: 'who are you trying to reach?', sq: 'kë po përpiqesh të arrish?' },
  'convo.s5.opt1': { en: 'Everyday customers', sq: 'Klientë të përditshëm' },
  'convo.s5.opt2': { en: 'Other businesses', sq: 'Biznese të tjera' },
  'convo.s5.opt3': { en: 'My local community', sq: 'Komuniteti im lokal' },
  'convo.s5.opt4': { en: 'A specific niche or group', sq: 'Një grup apo nishë specifike' },
  'convo.s5.opt5': { en: 'Not sure yet', sq: 'Ende nuk jam i/e sigurt' },

  'convo.s14.prompt1': { en: "alright. i think i've got the picture.", sq: 'mirë. mendoj se e kuptova pamjen e përgjithshme.' },
  'convo.s14.prompt2': { en: 'who am i talking to?', sq: 'me kë po flas?' },
  'convo.s14.name': { en: 'Name', sq: 'Emri' },
  'convo.s14.email': { en: 'Email', sq: 'Email' },
  'convo.s14.phone': { en: 'Phone / WhatsApp (optional)', sq: 'Telefon / WhatsApp (opsionale)' },

  'convo.s15.prompt': { en: 'anything else you want the team to know?', sq: 'ka diçka tjetër që do të donte ta dinte ekipi?' },

  'convo.end.line1': { en: 'perfect.', sq: 'perfekte.' },
  'convo.end.line2': { en: "i'll take it from here.", sq: 'e marr unë nga këtu.' },
  'convo.end.send': { en: 'SEND', sq: 'DËRGO' },
  'convo.end.sending': { en: 'Sending...', sq: 'Duke dërguar...' },
  'convo.end.success': { en: "Sent — we'll be in touch soon.", sq: "U dërgua — do t'ju kontaktojmë së shpejti." },
  'convo.end.error': {
    en: 'Something went wrong — try again, or email us directly.',
    sq: 'Diçka shkoi keq — provoni përsëri, ose na shkruani direkt me email.',
  },

  'footer.tagline': { en: 'Web & Branding Studio', sq: 'Studio Web & Brendi' },

  'modal.ariaLabel': { en: 'Project preview', sq: 'Pamje projekti' },
  'modal.brandAria': { en: 'Back to NJORD', sq: 'Kthehu te NJORD' },
  'modal.discipline': { en: 'Discipline — ', sq: 'Disiplina — ' },
  'modal.year': { en: 'Year — ', sq: 'Viti — ' },
  'modal.deliverables': { en: 'Deliverables — ', sq: 'Rezultatet — ' },
  'modal.cta': { en: 'View full case study', sq: 'Shiko studimin e plotë të rastit' },
  'modal.ctaNote': { en: 'Full case study — in progress', sq: 'Studimi i plotë i rastit — në progres' },
  'modal.sitelink': { en: 'Visit live site', sq: 'Vizito faqen live' },
  'modal.sitelinkNote': { en: 'Live site — coming soon', sq: 'Faqja live — së shpejti' },

  'project.aurelia.tagline': { en: 'Jewelry, presented like art.', sq: 'Bizhuteri, të paraqitura si art.' },
  'project.aurelia.description': {
    en: 'Aurelia sells heirloom-grade jewelry to a generation raised on fast fashion. The site slows everything down: full-bleed compositions, warm cream and burgundy tones, and a single serif voice used with total consistency. Motion is slow and deliberate — pieces cross-fade like pages in a lookbook, never snap into place.',
    sq: 'Aurelia shet bizhuteri të nivelit trashëgimor për një brez të rritur me modën e shpejtë. Faqja i ngadalëson të gjitha: kompozime që mbulojnë të gjithë ekranin, tone të ngrohta kremi dhe bordoje, dhe një zë të vetëm serif të përdorur me konsistencë të plotë. Lëvizja është e ngadaltë dhe e qëllimshme — pjesët kalojnë njëra në tjetrën si faqet e një katalogu, kurrë nuk kërcejnë në vend.',
  },
  'project.aurelia.discipline': { en: 'Brand Identity, E-Commerce Design', sq: 'Identitet Brendi, Dizajn E-Commerce' },
  'project.aurelia.deliverables': { en: 'Visual Identity, Art Direction, Shopify Build', sq: 'Identitet Vizual, Drejtim Artistik, Ndërtim në Shopify' },
  'project.aurelia.highlight1': { en: 'Slow, deliberate motion — nothing snaps into place', sq: 'Lëvizje e ngadaltë dhe e qëllimshme — asgjë nuk kërcen në vend' },
  'project.aurelia.highlight2': { en: 'One serif voice, used with total consistency', sq: 'Një zë i vetëm serif, i përdorur me konsistencë të plotë' },
  'project.aurelia.highlight3': { en: 'Built directly on Shopify', sq: 'Ndërtuar direkt në Shopify' },

  'project.pulse.tagline': { en: 'A festival brand that refuses to sit still.', sq: 'Një brend festivali që refuzon të qëndrojë i palëvizur.' },
  'project.pulse.description': {
    en: 'Pulse needed an identity as loud as its lineup. We built a system of saturated color collisions, oversized condensed type, and layouts that break their own grid on purpose. Nothing on the site holds still for more than a second — including the navigation.',
    sq: 'Pulse kishte nevojë për një identitet po aq të fortë sa edhe programi i tij. Ne ndërtuam një sistem përplasjesh ngjyrash të ngopura, shkronja të kondensuara e të mëdha, dhe skema faqesh që thyejnë me qëllim rrjetën e tyre. Asgjë në faqe nuk qëndron e palëvizur për më shumë se një sekondë — përfshirë edhe navigimin.',
  },
  'project.pulse.discipline': { en: 'Web Design, Motion, Brand System', sq: 'Dizajn Web, Lëvizje, Sistem Brendi' },
  'project.pulse.deliverables': { en: 'Identity System, Web Platform, Motion Toolkit', sq: 'Sistem Identiteti, Platformë Web, Kompleks Mjetesh Lëvizjeje' },
  'project.pulse.highlight1': { en: 'Color collisions instead of one fixed palette', sq: 'Përplasje ngjyrash në vend të një palete fikse' },
  'project.pulse.highlight2': { en: 'Type that reacts to whoever is headlining', sq: 'Shkronja që reagojnë sipas artistit kryesor' },
  'project.pulse.highlight3': { en: 'One motion toolkit, shared across every channel', sq: 'Një kompleks i vetëm mjetesh lëvizjeje, i ndarë në çdo kanal' },

  'project.meridian.tagline': { en: 'Trust, rendered as an interface.', sq: 'Besimi, i shprehur si ndërfaqe.' },
  'project.meridian.description': {
    en: 'Meridian turns market data into decisions. Every pixel earns its place: a strict grid, a single accent blue, and typography sized for scanning fast-moving numbers. We designed the system before we designed a single screen.',
    sq: 'Meridian i shndërron të dhënat e tregut në vendime. Çdo piksel e fiton vendin e vet: një rrjetë strikte, një blu të vetme aksenti, dhe tipografi të përmasuar për të skanuar numra që lëvizin shpejt. Ne projektuam sistemin para se të projektonim qoftë edhe një ekran të vetëm.',
  },
  'project.meridian.discipline': { en: 'Product Design, UI System, Data Viz', sq: 'Dizajn Produkti, Sistem UI, Vizualizim të Dhënash' },
  'project.meridian.deliverables': { en: 'Design System, Dashboard UI, Chart Library', sq: 'Sistem Dizajni, UI Paneli, Bibliotekë Grafikësh' },
  'project.meridian.highlight1': { en: 'One accent blue, spent only where it matters', sq: 'Një blu e vetme aksenti, përdorur vetëm aty ku ka rëndësi' },
  'project.meridian.highlight2': { en: 'Type sized for scanning fast-moving numbers', sq: 'Shkronja të përmasuara për skanimin e numrave që lëvizin shpejt' },
  'project.meridian.highlight3': { en: 'A single chart system, shared across every screen', sq: 'Një sistem i vetëm grafikësh, i ndarë në çdo ekran' },
};

export function getLang(){
  try{
    const stored = localStorage.getItem(STORAGE_KEY);
    if(stored === 'en' || stored === 'sq') return stored;
  }catch(e){ /* storage blocked — fall through to default */ }
  return DEFAULT_LANG;
}

export function setLang(lang){
  try{ localStorage.setItem(STORAGE_KEY, lang); }catch(e){ /* per-viewer convenience only */ }
  applyStaticTranslations(lang);
  listeners.forEach((fn) => fn(lang));
}

export function t(key, lang = getLang()){
  const entry = translations[key];
  if(!entry) return key;
  return entry[lang] || entry.en || key;
}

export function applyStaticTranslations(lang = getLang()){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n, lang);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml, lang);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria, lang));
  });
}

const listeners = [];
export function onLangChange(fn){ listeners.push(fn); }
