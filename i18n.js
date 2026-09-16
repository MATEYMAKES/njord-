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
    en: 'Five disciplines, one process — branding, design, development, hosting and ongoing support, handled end to end rather than handed off between different teams. Scroll to see how it comes together.',
    sq: 'Pesë disiplina, një proces — brending, dizajn, zhvillim, hosting dhe përkrahje e vazhdueshme, të menaxhuara nga fillimi deri në fund, jo të ndara mes ekipesh të ndryshme. Zbrit për të parë si bashkohen.',
  },
  'services.01.title': { en: 'Branding & Identity', sq: 'Brending & Identitet' },
  'services.01.desc': {
    en: 'A visual identity built to propel a business forward. In a market full of noise, consistency is what makes a brand instantly recognizable and easy to trust — across every screen, platform and touchpoint, not just the ones people remember.',
    sq: "Një identitet vizual i ndërtuar për ta shtyrë biznesin përpara. Në një treg plot zhurmë, qëndrueshmëria është ajo që e bën një brend menjëherë të njohshëm dhe të lehtë për t'u besuar — në çdo ekran, platformë dhe pikë kontakti, jo vetëm në ato që njerëzit i mbajnë mend.",
  },
  'services.02.title': { en: 'Website Design & UI/UX', sq: 'Dizajn Webfaqeje & UI/UX' },
  'services.02.desc': {
    en: 'Interfaces designed around what people need and how people think. More than just a pretty front — we build what your business actually needs.',
    sq: 'Ndërfaqe të dizajnuara sipas asaj që njerëzit kanë nevojë dhe si mendojnë. Më shumë se një pamje e bukur — ne ndërtojmë atë që i nevojitet vërtet biznesit tuaj.',
  },
  'services.03.title': { en: 'Development & Interaction', sq: 'Zhvillim & Ndërveprim' },
  'services.03.desc': {
    en: 'The build underneath — functionality, motion, everything that has to work.',
    sq: 'Ndërtimi nën sipërfaqe — funksionaliteti, lëvizja, gjithçka që duhet të funksionojë.',
  },
  'services.04.title': { en: 'Hosting & Maintenance', sq: 'Hosting & Mirëmbajtje' },
  'services.04.desc': {
    en: 'Hosted on servers in Kosovo, kept fast and stable after launch.',
    sq: 'E hostuar në serverë në Kosovë, e mbajtur e shpejtë dhe stabile pas lansimit.',
  },
  'services.05.title': { en: 'SEO & Ongoing Support', sq: 'SEO & Përkrahje e Vazhdueshme' },
  'services.05.desc': {
    en: "We don't call it a day when the site goes live. We make sure everything keeps running smoothly throughout the website's lifetime.",
    sq: 'Nuk e mbyllim punën kur faqja bëhet live. Sigurohemi që gjithçka të vazhdojë të funksionojë pa probleme gjatë gjithë jetëgjatësisë së saj.',
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
