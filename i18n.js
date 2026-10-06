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
  'nav.identity': { en: 'Identity', sq: 'Identiteti' },
  'nav.work': { en: 'Work', sq: 'Punët' },
  'nav.studio': { en: 'Studio', sq: 'Studio' },
  'nav.services': { en: 'Services', sq: 'Shërbimet' },
  'nav.contact': { en: 'Contact', sq: 'Kontakt' },
  'nav.start': { en: 'Start a project', sq: 'Nis një projekt' },
  'nav.toggleAria': { en: 'Toggle navigation menu', sq: 'Ndrysho menynë e navigimit' },

  'skip.link': { en: 'Skip to content', sq: 'Kalo te përmbajtja' },

  'sound.ariaLabel': { en: "Toggle NJORD's generative sound", sq: 'Ndrysho tingullin gjenerativ të NJORD' },
  'sound.on': { en: 'Sound on', sq: 'Tingulli ndezur' },
  'sound.off': { en: 'Sound off', sq: 'Tingulli fikur' },

  'logo.ariaLabel': { en: 'NJORD — back to top', sq: 'NJORD — kthehu në krye' },

  'hero.eyebrow': { en: 'Web & Branding Studio', sq: 'Studio Web & Brendi' },
  'hero.descriptor': { en: '<span class="hero-outcome">Your business deserves to look as good online as it does in person.</span><span class="hero-support">We design identities and build digital experiences for businesses that want to stand out.</span>', sq: '<span class="hero-outcome">Biznesi juaj meriton të duket aq mirë online sa duket në realitet.</span><span class="hero-support">Dizajnojmë identitete dhe ndërtojmë eksperienca digjitale për bizneset që duan të dallohen.</span>' },
  'hero.scroll': { en: 'Scroll', sq: 'Zbrit' },
  'hero.cta': { en: 'Start a project', sq: 'Nis një projekt' },

  'identity.eyebrow': { en: 'Identity', sq: 'Identiteti' },
  'identity.word1': { en: 'We create', sq: 'Krijojmë' },
  'identity.word2': { en: 'identity.', sq: 'identitet.' },
  'identity.body': { en: "Every business needs a consistent identity, wherever it appears.", sq: "Çdo biznes ka nevojë për një identitet të qëndrueshëm, kudo që shfaqet." },
  'identity.provides': {
    en: 'Logo — Color palette — Typography — Brand guidelines',
    sq: 'Logo — Paleta e ngjyrave — Tipografia — Udhëzime marke',
  },

  'webdev.eyebrow': { en: '02 / Web Development', sq: '02 / Zhvillim Web' },
  'webdev.titleLeft': { en: 'Development', sq: 'Zhvillim' },
  'webdev.titleRight': { en: 'Web.', sq: 'Web.' },
  'webdev.body': {
    en: "Based on your identity, we build a website that's far more than a simple page — an online store, a booking system, internal tools, whatever you need.",
    sq: 'Sipas identitetit tuaj, ndërtojmë një webfaqe që është shumë më tepër se një faqe e thjeshtë — dyqan online, sistem rezervimesh, mjete të brendshme, çka të nevojitet.',
  },
  'webdev.provides': {
    en: 'UI/UX design — Front-end build — Back-end systems — Responsive layout',
    sq: 'Dizajn UI/UX — Zhvillim front-end — Sisteme back-end — Skema responsive',
  },

  'hosting.eyebrow': { en: '03 / Hosting & Security', sq: '03 / Hosting & Siguri' },
  'hosting.titleLeft': { en: 'Hosting', sq: 'Hosting' },
  'hosting.titleRight': { en: 'Security.', sq: 'Siguri.' },
  'hosting.provides': {
    en: 'Managed servers — Uptime monitoring — SSL & backups — Threat protection',
    sq: 'Servera të menaxhuar — Monitorim 24/7 — SSL & backup — Mbrojtje nga kërcënimet',
  },

  'maintenance.eyebrow': { en: '04 / Maintenance', sq: '04 / Mirëmbajtja' },
  'maintenance.title': { en: 'Maintenance.', sq: 'Mirëmbajtja.' },
  'maintenance.body': { en: "Our work doesn't end when your website goes live.", sq: "Puna jonë nuk përfundon kur webfaqja publikohet." },
  'maintenance.provides': { en: "Updates & fixes — Ongoing support", sq: "Përditësime & korrigjime — Mbështetje e vazhdueshme" },

  'work.cta': { en: 'See more', sq: 'Shiko më shumë' },
  'work.eyebrow': { en: 'Selected Work', sq: 'Punë të përzgjedhura' },
  'work.h2': { en: 'Real work. Real businesses.', sq: 'Punë reale. Biznese reale.' },
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
    en: 'The NJORD branch for company websites: a night-street brand and site that gets companies seen.',
    sq: 'Dega e NJORD për faqe interneti: një brend nate, i ndritur nga rruga, që i nxjerr kompanitë në pah.',
  },
  'work.pulse.tag1': { en: 'Brand Identity', sq: 'Identitet Brendi' },
  'work.pulse.tag2': { en: 'Web Design', sq: 'Dizajn Web' },
  'work.pulse.tag3': { en: 'Front-End Build', sq: 'Ndërtim Front-End' },

  'work.meridian.aria': { en: 'Enter Meridian project', sq: 'Hyr te projekti Meridian' },
  'work.meridian.desc': {
    en: 'Precision-first interface design for a financial platform built on trust and data.',
    sq: 'Dizajn ndërfaqeje me precizion të lartë për një platformë financiare të ndërtuar mbi besim dhe të dhëna.',
  },
  'work.meridian.tag1': { en: 'Product Design', sq: 'Dizajn Produkti' },
  'work.meridian.tag2': { en: 'UI System', sq: 'Sistem UI' },
  'work.meridian.tag3': { en: 'Data Viz', sq: 'Vizualizim të Dhënash' },

  'work.metalium.aria': { en: 'Enter METALIUM project', sq: 'Hyr te projekti METALIUM' },
  'work.metalium.desc': { en: "A bold, industrial one-page site with a steel weight calculator built in.", sq: "Një faqe njëfaqëshe e fortë dhe industriale, me kalkulator peshe çeliku të integruar." },

  'work.vyron.aria': { en: 'Enter VYRON project', sq: 'Hyr te projekti VYRON' },
  'work.vyron.desc': { en: "Brand identity and website: bronze on charcoal, calm motion, systems from ARDEX, Gerflor and HAFRO.", sq: "Identiteti i brendit dhe faqja: bronz mbi qymyr, lëvizje e qetë, sisteme nga ARDEX, Gerflor dhe HAFRO." },

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
  'services.04.title': { en: 'Managed Hosting', sq: 'Hosting i Menaxhuar' },
  'services.04.desc': {
    en: 'Hosted on managed servers for fast load times.',
    sq: 'Hostuar në serverë të menaxhuar, për kohë ngarkimi të shpejta.',
  },
  'services.05.title': { en: 'SEO & Ongoing Support', sq: 'SEO & Përkrahje e Vazhdueshme' },
  'services.05.desc': {
    en: "We don't disappear at launch — support stays on call after.",
    sq: 'Nuk zhdukemi pas lansimit — përkrahja mbetet gjithmonë gati.',
  },

  'studio.eyebrow': { en: 'Studio', sq: 'Studio' },
  'studio.h2': { en: 'One studio. From idea to launch.', sq: 'Një studio. Nga ideja deri te lansimi.' },
  'studio.p2': { en: "Every project is built for the business it represents, with no templates.", sq: "Çdo projekt ndërtohet për biznesin që përfaqëson, pa shabllone." },

  'process.eyebrow': { en: 'How it works', sq: 'Si punojmë' },
  'process.s1.title': { en: 'Conversation', sq: 'Biseda' },
  'process.s1.body': { en: "Tell us about your business and what you need.", sq: "Na tregoni për biznesin dhe çfarë ju duhet." },
  'process.s2.title': { en: 'Proposal', sq: 'Oferta' },
  'process.s2.body': {
    en: 'We send you a clear proposal: what we will build, the timeline and the price — before any work starts.',
    sq: 'Ju dërgojmë një ofertë të qartë: çfarë do të ndërtojmë, afatin dhe çmimin — para se të fillojë puna.',
  },
  'process.s3.title': { en: 'Design & build', sq: 'Dizajni & ndërtimi' },
  'process.s3.body': { en: "We show you the work along the way and refine it with your feedback.", sq: "Jua tregojmë punën gjatë rrugës dhe e përmirësojmë sipas komenteve tuaja." },
  'process.s4.title': { en: 'Launch & care', sq: 'Lansimi & kujdesi' },

  'faq.eyebrow': { en: 'Questions', sq: 'Pyetje' },
  'faq.q1': { en: 'How much does a website cost?', sq: 'Sa kushton një webfaqe?' },
  'faq.a1': { en: "It depends on the project — no obligation.", sq: "Varet nga projekti — pa asnjë obligim." },
  'faq.q2': { en: 'How long does it take?', sq: 'Sa zgjat?' },
  'faq.a2': { en: "A simple website takes less time than an online store or a booking system.", sq: "Një webfaqe e thjeshtë merr më pak kohë se një dyqan online apo sistem rezervimesh." },
  'faq.q3': { en: 'Can I get only a logo, or only a website?', sq: 'A mund të marr vetëm logo, ose vetëm webfaqe?' },
  'faq.a3': { en: "Yes. We can work on your brand, your website, or both.", sq: "Po. Mund të punojmë në brendin tuaj, në webfaqe, ose në të dyja." },

  'contact.eyebrow': { en: 'Get In Touch', sq: 'Na Kontaktoni' },
  'contact.h2': { en: "Let's build something that doesn't look like anything else.", sq: 'Le të ndërtojmë diçka që nuk i ngjan asgjë tjetër.' },
  'contact.copied': { en: 'Copied', sq: 'U kopjua' },
  'contact.phone': { en: 'Phone', sq: 'Telefon' },
  'contact.meta': {
    // {q} and {y} are filled in with the visitor's current quarter and
    // year at render time (see fillTokens below), so this never goes stale.
    en: 'Based in Prishtinë, Kosovo.<br>Now accepting new projects for Q{q} {y}.<br>Replies within 24 hours.',
    sq: 'Me bazë në Prishtinë, Kosovë.<br>Po pranojmë projekte të reja për T{q} {y}.<br>Përgjigjemi brenda 24 orësh.',
  },
  'mascot.ariaLabel': {
    en: "A small figure formed from the page's own characters",
    sq: 'Një figurë e vogël e formuar nga vetë karakteret e faqes',
  },
  'mascot.hint': { en: 'start a project', sq: 'nis një projekt' },

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
  'convo.open.line2': { en: "got something in mind? tell me about it.", sq: 'ke diçka në mendje? më trego.' },
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
  'convo.s3.opt1': { en: 'A website', sq: 'Webfaqe' },
  'convo.s3.opt2': { en: 'A logo / how the business looks', sq: 'Logo / pamja e biznesit' },
  'convo.s3.opt3': { en: 'Both', sq: 'Të dyja' },
  'convo.s3.opt4': { en: 'Something else', sq: 'Diçka tjetër' },
  'convo.s3.opt5': { en: 'Not sure yet — help me', sq: 'Nuk e di ende — më ndihmo' },

  // Instant estimate (mascot-convo.js + pricing.js). Written for people
  // who have never thought about how a website is built: options say
  // what the business wants to DO, never the tech; `.hint` keys are the
  // small grey example line under an option. Scope questions only
  // appear when they apply; the estimate comes before the contact step.
  'convo.brand.prompt': { en: 'where are you with your logo and look?', sq: 'si qëndron puna me logon dhe pamjen e biznesit?' },
  'convo.brand.opt1': { en: 'I need a logo', sq: 'Më duhet një logo' },
  'convo.brand.hint1': { en: 'just the logo itself', sq: 'vetëm logoja' },
  'convo.brand.opt2': { en: 'A logo + colors and fonts', sq: 'Logo + ngjyrat dhe shkronjat' },
  'convo.brand.hint2': { en: 'so the business looks the same everywhere', sq: 'që biznesi të duket njësoj kudo' },
  'convo.brand.opt3': { en: 'A complete look for the business', sq: 'Pamje e plotë për biznesin' },
  'convo.brand.hint3': { en: 'logo, colors, fonts and one style for everything you make', sq: 'logo, ngjyra, shkronja dhe një stil për çdo material' },
  'convo.brand.opt4': { en: 'Complete look + a rulebook', sq: 'Pamje e plotë + libër rregullash' },
  'convo.brand.hint4': { en: 'a guide to using it — handy for staff, printers or agencies', sq: 'udhëzues si përdoret — i dobishëm për stafin, shtypshkronjën apo agjencitë' },
  'convo.brand.opt5': { en: 'Not sure — help me choose', sq: 'Nuk e di — më ndihmo' },
  'convo.brand.hint5': { en: "we'll figure it out together", sq: 'e shohim bashkë' },

  'convo.site.prompt': { en: 'what should your website do?', sq: 'çfarë duhet të bëjë webfaqja jote?' },
  'convo.site.opt1': { en: 'Show who we are and how to find us', sq: 'Të tregojë kush jemi dhe si të na gjejnë' },
  'convo.site.hint1': { en: 'one page — e.g. a café, barber or freelancer', sq: 'një faqe e vetme — p.sh. kafe, berber, freelancer' },
  'convo.site.opt2': { en: 'Present the business over a few pages', sq: 'Të prezantojë biznesin me disa faqe' },
  'convo.site.hint2': { en: 'e.g. home, about us, services, contact', sq: 'p.sh. ballina, rreth nesh, shërbimet, kontakti' },
  'convo.site.opt3': { en: 'We have lots of services or products to show', sq: 'Kemi shumë shërbime apo produkte për të treguar' },
  'convo.site.hint3': { en: 'e.g. a clinic, a hotel, a company with several branches', sq: 'p.sh. klinikë, hotel, kompani me disa degë' },
  'convo.site.opt4': { en: 'Sell products online', sq: 'Të shesim produkte online' },
  'convo.site.hint4': { en: 'customers order and pay on the site', sq: 'klientët porosisin dhe paguajnë në faqe' },
  'convo.site.opt5': { en: 'Something bigger — a custom system', sq: 'Diçka më e madhe — një sistem me porosi' },
  'convo.site.hint5': { en: 'e.g. a portal for your clients or a tool for your team', sq: 'p.sh. portal për klientët apo vegël për ekipin tënd' },
  'convo.site.opt6': { en: 'Not sure — help me choose', sq: 'Nuk e di — më ndihmo' },
  'convo.site.hint6': { en: "we'll figure it out together", sq: 'e shohim bashkë' },

  'convo.features.prompt': { en: 'anything else the website should let you or your customers do?', sq: 'çfarë tjetër duhet të mundësojë webfaqja — për ty apo klientët e tu?' },
  'convo.features.helper': { en: 'pick as many as you like — or none.', sq: 'zgjidh sa të duash — ose asnjë.' },
  'convo.feature.contactForm': { en: 'Customers can message you from the site', sq: 'Klientët të të shkruajnë direkt nga faqja' },
  'convo.feature.booking': { en: 'Customers can book an appointment', sq: 'Klientët të rezervojnë një termin' },
  'convo.feature.userAccounts': { en: 'People can sign up and log in', sq: 'Njerëzit të krijojnë llogari dhe të hyjnë' },
  'convo.feature.userAccounts.hint': { en: 'e.g. members or regular customers', sq: 'p.sh. anëtarë apo klientë të rregullt' },
  'convo.feature.clientDashboard': { en: 'Clients get their own private area', sq: 'Klientët të kenë hapësirën e tyre private' },
  'convo.feature.clientDashboard.hint': { en: 'e.g. to see their orders, files or progress', sq: 'p.sh. të shohin porositë, dokumentet apo progresin' },
  'convo.feature.newsletter': { en: 'People can sign up for news by email', sq: 'Njerëzit të regjistrohen për lajme me email' },
  'convo.feature.cms': { en: 'I can change texts and photos myself', sq: 'Unë vetë të ndryshoj tekstet dhe fotot' },
  'convo.feature.cms.hint': { en: 'without having to call us', sq: 'pa pasur nevojë të na thërrasësh' },
  'convo.feature.integration': { en: 'It connects to a program we already use', sq: 'Të lidhet me një program që e përdorim tashmë' },
  'convo.feature.integration.hint': { en: 'e.g. for invoices, stock or customers', sq: 'p.sh. për fatura, stok apo klientë' },
  'convo.feature.analytics': { en: 'I can see how many people visit', sq: 'Të shoh sa njerëz e vizitojnë' },
  'convo.feature.animations': { en: 'Eye-catching movement and effects', sq: 'Lëvizje dhe efekte që bien në sy' },
  'convo.feature.payments': { en: 'Customers can pay by card', sq: 'Klientët të paguajnë me kartelë' },
  'convo.feature.customerAccounts': { en: 'Customers can have an account', sq: 'Klientët të kenë llogari' },
  'convo.feature.customerAccounts.hint': { en: 'to save their address and past orders', sq: 'për të ruajtur adresën dhe porositë e kaluara' },
  'convo.feature.customCheckout': { en: 'A checkout designed just for us', sq: 'Proces blerjeje i dizajnuar vetëm për ne' },
  'convo.feature.customCheckout.hint': { en: 'instead of the standard one', sq: 'në vend të atij standard' },

  'convo.estimate.prompt': { en: "ok — here's roughly what that costs:", sq: 'ok — kjo afërsisht kushton:' },
  'convo.estimate.label': { en: 'Estimate', sq: 'Vlerësim' },
  'convo.estimate.from': { en: 'from', sq: 'nga' },
  'convo.estimate.fromNote': {
    en: 'starting price — a custom system depends on what it needs to do.',
    sq: 'çmim fillestar — një sistem me porosi varet nga çfarë duhet të bëjë.',
  },
  'convo.estimate.partial': {
    en: "only for the part you were sure about — the rest we'll price together.",
    sq: 'vetëm për pjesën ku ishe i/e sigurt — pjesën tjetër e shohim bashkë.',
  },
  'convo.estimate.note': {
    en: 'rough estimate — the exact price comes in our offer after we talk. no obligation.',
    sq: 'vlerësim i përafërt — çmimin e saktë e merr në ofertë pas bisedës. pa obligim.',
  },
  'convo.estimate.none': {
    en: "this one needs a closer look — tell me who you are and we'll send you a price within 24 hours.",
    sq: 'ky duhet parë nga afër — më trego kush je dhe të dërgojmë çmimin brenda 24 orësh.',
  },
  'convo.resume': { en: 'Back to the conversation', sq: 'Kthehu te biseda' },
  'convo.estimate.continue': { en: 'Sounds good, continue', sq: 'Në rregull, vazhdo' },

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
  'modal.concept': { en: 'Concept', sq: 'Koncept' },
  'modal.back': { en: 'Back', sq: 'Kthehu' },
  'modal.sitelink': { en: 'View live site', sq: 'Shiko faqen live' },
  'modal.process': { en: 'View our process', sq: 'Shiko procesin tonë' },
  'modal.sitelinkNote': { en: 'Live site — coming soon', sq: 'Faqja live — së shpejti' },

  'project.aurelia.tagline': { en: 'Jewelry, presented like art.', sq: 'Bizhuteri, të paraqitura si art.' },
  'project.aurelia.description': { en: "Aurelia sells heirloom-grade jewelry to a generation raised on fast fashion. The site slows everything down: full-bleed compositions and warm cream and burgundy tones.", sq: "Aurelia shet bizhuteri të nivelit trashëgimor për një brez të rritur me modën e shpejtë. Faqja i ngadalëson të gjitha: kompozime që mbulojnë të gjithë ekranin dhe tone të ngrohta kremi dhe bordoje." },
  'project.aurelia.discipline': { en: 'Brand Identity, E-Commerce Design', sq: 'Identitet Brendi, Dizajn E-Commerce' },
  'project.aurelia.deliverables': { en: 'Visual Identity, Art Direction, Shopify Build', sq: 'Identitet Vizual, Drejtim Artistik, Ndërtim në Shopify' },
  'project.aurelia.highlight1': { en: 'Slow, deliberate motion — nothing snaps into place', sq: 'Lëvizje e ngadaltë dhe e qëllimshme — asgjë nuk kërcen në vend' },
  'project.aurelia.highlight2': { en: 'One serif voice, used with total consistency', sq: 'Një zë i vetëm serif, i përdorur me konsistencë të plotë' },
  'project.aurelia.highlight3': { en: 'Built directly on Shopify', sq: 'Ndërtuar direkt në Shopify' },

  'project.pulse.tagline': { en: 'Websites that get companies seen.', sq: 'Faqe interneti që i nxjerrin kompanitë në pah.' },
  'project.pulse.description': { en: "PULSE is the branch of NJORD that builds them. Its own site is set on a night street.", sq: "PULSE është dega e NJORD që i ndërton ato. Faqja e tij është vendosur në një rrugë nate." },
  'project.pulse.discipline': { en: 'Brand Identity, Web Design, Front-End Build', sq: 'Identitet Brendi, Dizajn Web, Ndërtim Front-End' },
  'project.pulse.deliverables': { en: 'Brand Identity, Company Website, Front-End Build', sq: 'Identitet Brendi, Faqe Kompanie, Ndërtim Front-End' },
  'project.pulse.highlight1': { en: 'A night palette: near-black with one warm amber', sq: 'Paletë nate: pothuajse e zezë me një qelibar të ngrohtë' },
  'project.pulse.highlight2': { en: 'Design, development, hosting and upkeep on one page', sq: 'Dizajn, zhvillim, hostim dhe mirëmbajtje në një faqe' },
  'project.pulse.highlight3': { en: 'Fast and light, with motion that guides rather than distracts', sq: 'E shpejtë dhe e lehtë, me lëvizje që udhëheq në vend që të shpërqendrojë' },

  'project.meridian.tagline': { en: 'Trust, rendered as an interface.', sq: 'Besimi, i shprehur si ndërfaqe.' },
  'project.meridian.description': { en: "Meridian turns market data into decisions. Every pixel earns its place, on a strict grid. We designed the system before we designed a single screen.", sq: "Meridian i shndërron të dhënat e tregut në vendime. Çdo piksel e fiton vendin e vet, në një rrjetë strikte. Ne projektuam sistemin para se të projektonim qoftë edhe një ekran të vetëm." },
  'project.meridian.discipline': { en: 'Product Design, UI System, Data Viz', sq: 'Dizajn Produkti, Sistem UI, Vizualizim të Dhënash' },
  'project.meridian.deliverables': { en: 'Design System, Dashboard UI, Chart Library', sq: 'Sistem Dizajni, UI Paneli, Bibliotekë Grafikësh' },
  'project.meridian.highlight1': { en: 'One accent blue, spent only where it matters', sq: 'Një blu e vetme aksenti, përdorur vetëm aty ku ka rëndësi' },
  'project.meridian.highlight2': { en: 'Type sized for scanning fast-moving numbers', sq: 'Shkronja të përmasuara për skanimin e numrave që lëvizin shpejt' },
  'project.meridian.highlight3': { en: 'A single chart system, shared across every screen', sq: 'Një sistem i vetëm grafikësh, i ndarë në çdo ekran' },

  'project.metalium.tagline': { en: 'Steel, shown the way it is made.', sq: 'Çeliku, i paraqitur ashtu siç bëhet.' },
  'project.metalium.description': { en: "The site had to feel as solid as the work: full-bleed photography of the workshop and the weld, and a logo intro that plays once.", sq: "Faqja duhej të ndihej po aq e fortë sa puna: fotografi që mbulojnë të gjithë ekranin nga punishtja dhe saldimi, dhe një hyrje e logos që luhet vetëm një herë." },
  'project.metalium.discipline': { en: 'Web Design, Development, Digital Presence', sq: 'Dizajn Web, Zhvillim, Prezencë Digjitale' },
  'project.metalium.deliverables': { en: 'One-Page Site (AL/EN), Steel Weight Calculator, Quote Form', sq: 'Faqe Njëfaqëshe (SQ/EN), Kalkulator Peshe Çeliku, Formular Oferte' },
  'project.metalium.highlight1': { en: 'One signal red on black and bone, used sparingly', sq: 'Një e kuqe sinjali në të zezë dhe të bardhë kocke, e përdorur me kursim' },
  'project.metalium.highlight2': { en: 'Sparks that fly across the workshop photography', sq: 'Shkëndija që fluturojnë mbi fotografitë e punishtes' },
  'project.metalium.highlight3': { en: 'A steel weight calculator built into the page', sq: 'Një kalkulator peshe çeliku i integruar në faqe' },

  'project.vyron.tagline': { en: 'Flooring, shown with restraint.', sq: 'Dyshemeja, e paraqitur me thjeshtësi.' },
  'project.vyron.description': { en: "VYRON brings together premium materials, technical systems and professional execution on site, so its identity and its website had to feel exact. Long pauses between sections, headlines that rise out of a mask, photographs that wipe in. The site lays out the ARDEX, Gerflor and HAFRO systems plainly, with a direct way to ask for a quote.", sq: "VYRON bashkon materiale premium, sisteme teknike dhe ekzekutim profesional në terren, ndaj identiteti dhe faqja e saj duhej të ndiheshin të sakta. Pauza të gjata mes seksioneve, tituj që ngrihen nga një maskë, fotografi që shfaqen me një fshirje. Faqja i paraqet qartë sistemet ARDEX, Gerflor dhe HAFRO, me një mënyrë të drejtpërdrejtë për të kërkuar ofertë." },
  'project.vyron.discipline': { en: 'Web Design, Development, Digital Presence', sq: 'Dizajn Web, Zhvillim, Prezencë Digjitale' },
  'project.vyron.deliverables': { en: 'Logo & Brand Manual, Brand Applications, One-Page Site (AL/EN)', sq: 'Logo dhe Manual Brendi, Aplikime të Brendit, Faqe Njëfaqëshe (SQ/EN)' },
  'project.vyron.highlight1': { en: 'Bronze on charcoal, taken straight from the monogram', sq: 'Bronz mbi qymyr, marrë drejt nga monograma' },
  'project.vyron.highlight2': { en: 'A V that draws itself, then gets out of the way', sq: 'Një V që vizaton veten, pastaj tërhiqet' },
  'project.vyron.highlight3': { en: 'Montserrat in two weights, light and bold', sq: 'Montserrat në dy peshë, e lehtë dhe e trashë' },
  'work.concepts.eyebrow': { en: 'Concepts / Experiments', sq: 'Koncepte / Eksperimente' },
  'work.concepts.note': { en: 'Our own projects, not real clients. They show our creative range.', sq: 'Projekte tonat, jo klientë realë. Tregojnë gamën tonë krijuese.' },
  'work.development.eyebrow': { en: 'In development', sq: 'Në zhvillim' },
  'work.development.note': { en: 'Real projects currently being built.', sq: 'Projekte reale që po ndërtohen aktualisht.' },
  'modal.client': { en: 'Client work', sq: 'Punë me klient' },
  'modal.industry': { en: 'Industry', sq: 'Industria' },
  'modal.about': { en: 'The client', sq: 'Klienti' },
  'modal.challenge': { en: 'The challenge', sq: 'Sfida' },
  'modal.solution': { en: 'What NJORD built', sq: 'Çfarë ndërtoi NJORD' },
  'modal.features': { en: 'Technical features', sq: 'Veçoritë teknike' },
  'modal.results': { en: 'Results', sq: 'Rezultatet e matura' },
  'studio.chain.aria': { en: 'The NJORD process, from brand to support', sq: 'Procesi i NJORD, nga brendi deri te mbështetja' },
  'studio.chain.brand': { en: 'Brand', sq: 'Brendi' },
  'studio.chain.design': { en: 'Design', sq: 'Dizajni' },
  'studio.chain.dev': { en: 'Development', sq: 'Zhvillimi' },
  'studio.chain.hosting': { en: 'Hosting', sq: 'Hostingu' },
  'studio.chain.support': { en: 'Support', sq: 'Mbështetja' },
  'faq.q6': { en: 'Can you redesign the website we already have?', sq: 'A mund ta ridizajnoni webfaqen që e kemi?' },
  'faq.a6': { en: 'Yes. We can redesign or rebuild your existing website, keeping what still works and improving the rest.', sq: 'Po. Mund ta ridizajnojmë ose rindërtojmë webfaqen tuaj ekzistuese, duke ruajtur pjesët që ende funksionojnë dhe duke përmirësuar pjesën tjetër.' },
  'faq.q7': { en: 'We don\'t have a visual identity. Can we start from zero?', sq: 'Nuk kemi identitet vizual. A mund të fillojmë nga zero?' },
  'faq.a7': { en: "Yes. We can build the visual identity and the digital presence from the start.", sq: "Po. NJORD mund ta ndërtojë identitetin vizual dhe prezencën digjitale nga fillimi." },
  'clients.eyebrow': { en: 'Collaborations', sq: 'Bashkëpunime' },
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

// Live date tokens: {q} = current quarter (1–4), {y} = current year.
function fillTokens(str){
  if(typeof str !== 'string' || str.indexOf('{') === -1) return str;
  const now = new Date();
  return str
    .replace(/\{q\}/g, String(Math.floor(now.getMonth() / 3) + 1))
    .replace(/\{y\}/g, String(now.getFullYear()));
}

export function t(key, lang = getLang()){
  const entry = translations[key];
  if(!entry) return key;
  return fillTokens(entry[lang] || entry.en || key);
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

export function hasKey(key){ return Object.prototype.hasOwnProperty.call(translations, key); }
export function addTranslations(map){ Object.assign(translations, map); }
