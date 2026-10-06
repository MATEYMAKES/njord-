/* ================================================================
   NJORD — project registry (single source of truth)

   Every project the site knows about lives in PROJECTS_DATA below.
   main.js reads it for the modal, the ASCII formations, the live-site
   links and the scroll zones; renderWorkLists() builds the project rows
   on index.html and work.html from it; fillCaseStudy() adds the optional
   case-study blocks to the project modal.

   Fields
     slug, name, type, status, published, category, year
     industry, services[]          { en, sq } copy shown on the rows
     clientDescription, challenge, solution
     features[]                    optional extra technical features
     desktopMedia, mobileMedia     { src, alt:{en,sq}, width, height }
     liveUrl                       hosted showcase / live site
     testimonial                   { quote, name, role, company, photo }
     results[]                     [{ value, label:{en,sq} }]
     logo                          { src, alt } for the client proof strip
     formation, burstColor, modalClass   (visual wiring, see main.js)

   type    CLIENT | CONCEPT | IN_DEVELOPMENT
   status  LIVE | LAUNCHING | CONCEPT | FUTURE
   category WEBSITE | E_COMMERCE | DIGITAL_PRODUCT | BOOKING_PLATFORM

   NEVER invent missing information: a field that is null/empty is simply
   not rendered. A project only appears on the site when published:true.
   To add MK Interiors / the villa project later: fill in its fields
   (and its project.<slug>.* copy in i18n.js for the modal) and flip
   published to true.
   ================================================================ */
import { t, hasKey, addTranslations } from './i18n.js';

const L = (en, sq) => ({ en, sq });

/* In-development projects (DEX KIDS, DEEN CENTRAL) stay hidden until
   this is switched on AND the individual project is published. */
export const SHOW_IN_DEVELOPMENT = false;

export const PROJECTS_DATA = [
  /* ---------------------------- REAL CLIENTS ---------------------------- */
  {
    slug: 'metalium', name: 'METALIUM',
    type: 'CLIENT', status: 'LIVE', published: true, category: 'WEBSITE',
    year: '2026',
    industry: L('Metal Fabrication & Structural Steel', 'Përpunim metali dhe konstruksione çeliku'),
    services: [L('Web Design', 'Dizajn Web'), L('Development', 'Zhvillim'), L('Digital Presence', 'Prezencë Digjitale')],
    clientDescription: L(
      'METALIUM does metal fabrication, welding, and the construction and installation of large steel structures.',
      'METALIUM merret me përpunim metali, saldim dhe ndërtim e montim të konstruksioneve të mëdha çeliku.'),
    challenge: L(
      "Presenting METALIUM's industrial capabilities and projects through a clear, professional digital presence.",
      'Prezantimi i kapaciteteve industriale dhe projekteve të METALIUM përmes një prezence digjitale të qartë dhe profesionale.'),
    solution: null, features: null, desktopMedia: null, mobileMedia: null,
    liveUrl: 'metalium-showcase/', testimonial: null, results: null, logo: null,
    formation: 'sparks', burstColor: '#FF0013', modalClass: 'project-modal--metalium',
  },
  {
    slug: 'vyron', name: 'VYRON',
    type: 'CLIENT', status: 'LIVE', published: true, category: 'WEBSITE',
    year: '2026',
    industry: L('Flooring Solutions', 'Zgjidhje për dyshemetë'),
    services: [L('Web Design', 'Dizajn Web'), L('Development', 'Zhvillim'), L('Digital Presence', 'Prezencë Digjitale')],
    clientDescription: null, challenge: null, solution: null, features: null,
    desktopMedia: null, mobileMedia: null,
    liveUrl: 'vyron-showcase/', testimonial: null, results: null, logo: null,
    formation: 'vee', burstColor: '#8B5A2B', modalClass: 'project-modal--vyron',
  },
  {
    /* Launching soon. No assets, URL or details supplied yet. */
    slug: 'mk-interiors', name: 'MK INTERIORS',
    type: 'CLIENT', status: 'LAUNCHING', published: false, category: 'WEBSITE',
    year: '2026',
    industry: L('Interior Design & Custom Interiors', 'Dizajn interieri dhe interiere me porosi'),
    services: [L('Web Design', 'Dizajn Web'), L('Development', 'Zhvillim'), L('Digital Presence', 'Prezencë Digjitale')],
    clientDescription: null, challenge: null, solution: null, features: null,
    desktopMedia: null, mobileMedia: null,
    liveUrl: null, testimonial: null, results: null, logo: null,
    formation: null, burstColor: '#B8956A', modalClass: 'project-modal--client',
  },
  {
    /* Villa name, assets and URL not supplied yet — name stays null, so the
       project cannot be published by accident. */
    slug: 'villa', name: null,
    type: 'CLIENT', status: 'LAUNCHING', published: false, category: 'BOOKING_PLATFORM',
    year: '2026',
    industry: L('Hospitality · Booking Platform', 'Hospitalitet · Platformë rezervimesh'),
    services: [L('UX/UI', 'UX/UI'), L('Web Development', 'Zhvillim Web'), L('Reservation System', 'Sistem Rezervimesh')],
    clientDescription: null, challenge: null, solution: null, features: null,
    desktopMedia: null, mobileMedia: null,
    liveUrl: null, testimonial: null, results: null, logo: null,
    formation: null, burstColor: '#7A8F7B', modalClass: 'project-modal--client',
  },

  /* ----------------------------- CONCEPTS ------------------------------ */
  {
    slug: 'aurelia', name: 'Aurelia',
    type: 'CONCEPT', status: 'CONCEPT', published: true, category: 'E_COMMERCE',
    year: '2025', industry: null, services: null,
    liveUrl: 'aurelia-showcase/',
    formation: 'diamond', burstColor: '#C8102E', modalClass: 'project-modal--aurelia',
  },
  {
    slug: 'pulse', name: 'Pulse',
    type: 'CONCEPT', status: 'CONCEPT', published: true, category: 'WEBSITE',
    year: '2026', industry: null, services: null,
    liveUrl: 'pulse-showcase/',
    formation: 'wave', burstColor: '#F1C27C', modalClass: 'project-modal--pulse',
  },
  {
    slug: 'meridian', name: 'Meridian',
    type: 'CONCEPT', status: 'CONCEPT', published: true, category: 'DIGITAL_PRODUCT',
    year: '2025', industry: null, services: null,
    liveUrl: 'meridian-showcase/',
    formation: 'network', burstColor: '#1F4C78', modalClass: 'project-modal--meridian',
  },

  /* ------------------- FUTURE REAL PROJECTS (hidden) ------------------- */
  {
    slug: 'dex-kids', name: 'DEX KIDS',
    type: 'IN_DEVELOPMENT', status: 'FUTURE', published: false, category: 'E_COMMERCE',
    year: null,
    industry: L("Children's Clothing E-Commerce", 'E-commerce për veshje fëmijësh'),
    services: null, liveUrl: null, formation: null, burstColor: '#7A8F7B', modalClass: 'project-modal--client',
  },
  {
    slug: 'deen-central', name: 'DEEN CENTRAL',
    type: 'IN_DEVELOPMENT', status: 'FUTURE', published: false, category: 'DIGITAL_PRODUCT',
    year: null,
    industry: L('Muslim Digital Product / Application', 'Produkt digjital / aplikacion për besimtarë myslimanë'),
    services: null, liveUrl: null, formation: null, burstColor: '#7A8F7B', modalClass: 'project-modal--client',
  },
];

/* ---- translations that come from this file's data ------------------- */
(function registerCopy(){
  const map = {};
  PROJECTS_DATA.forEach((p) => {
    const k = (suffix) => `${p.slug === 'mk-interiors' ? 'mk' : p.slug}.${suffix}`;
    if(p.industry) map[`work.${k('industry')}`] = p.industry;
    if(p.services) p.services.forEach((s, i) => { map[`work.${k('tag' + (i + 1))}`] = s; });
    if(p.clientDescription) map[`project.${k('client')}`] = p.clientDescription;
    if(p.challenge) map[`project.${k('challenge')}`] = p.challenge;
    if(p.solution) map[`project.${k('solution')}`] = p.solution;
    if(p.testimonial){
      map[`project.${k('quote')}`] = p.testimonial.quote;
      if(p.testimonial.role && typeof p.testimonial.role === 'object') map[`project.${k('quoteRole')}`] = p.testimonial.role;
    }
    if(p.results) p.results.forEach((r, i) => { map[`project.${k('result' + (i + 1))}`] = r.label; });
    if(p.features) p.features.forEach((f, i) => { map[`project.${k('feature' + (i + 1))}`] = f; });
    if(p.name) map[`work.${k('aria')}`] = L(`Enter ${p.name} project`, `Hyr te projekti ${p.name}`);
  });
  addTranslations(map);
})();

/* NOTE: i18n keys use the slug, except MK INTERIORS which uses "mk". */
const keyOf = (p) => (p.slug === 'mk-interiors' ? 'mk' : p.slug);

/* ---- queries ---------------------------------------------------------- */
export function getProject(slug){ return PROJECTS_DATA.find((p) => p.slug === slug) || null; }

export function publishedProjects(){
  return PROJECTS_DATA.filter((p) => p.published && p.name
    && (p.type !== 'IN_DEVELOPMENT' || SHOW_IN_DEVELOPMENT));
}
export const clientProjects = () => publishedProjects().filter((p) => p.type === 'CLIENT');
export const conceptProjects = () => publishedProjects().filter((p) => p.type === 'CONCEPT');
export const developmentProjects = () => publishedProjects().filter((p) => p.type === 'IN_DEVELOPMENT');

/* ---- work rows -------------------------------------------------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const has = (key) => hasKey(key);

function tagKeys(p){
  const out = [];
  for(let i = 1; i <= 3; i += 1){ const k = `work.${keyOf(p)}.tag${i}`; if(has(k)) out.push(k); }
  return out;
}

function previewRow(p, idx){
  const k = keyOf(p);
  const tags = tagKeys(p).map((key) => `<span data-i18n="${key}">${esc(t(key))}</span>`).join('');
  const industry = has(`work.${k}.industry`)
    ? `<span class="work-preview-row__industry" data-i18n="work.${k}.industry">${esc(t(`work.${k}.industry`))}</span>` : '';
  const desc = has(`work.${k}.desc`)
    ? `<span class="work-preview-row__desc" data-i18n="work.${k}.desc">${esc(t(`work.${k}.desc`))}</span>` : '';
  return `<a class="work-preview-row work-preview-row--${p.type.toLowerCase()}" href="work.html#${p.slug}" data-project="${p.slug}" data-type="${p.type}" aria-haspopup="dialog" data-i18n-aria="work.${k}.aria">
        <span class="work-preview-row__index" aria-hidden="true">${String(idx).padStart(2, '0')}</span>
        <span class="work-preview-row__body">
          <span class="work-preview-row__title">${esc(p.name)}</span>
          ${industry}${desc}
          <span class="work-preview-row__tags">${tags}</span>
        </span>
        <span class="work-preview-row__meta">
          ${p.year ? `<span>${esc(p.year)}</span>` : ''}
          <span class="work-preview-row__enter"><span data-i18n="work.enter">${esc(t('work.enter'))}</span> <span class="arrow" aria-hidden="true">&rarr;</span></span>
        </span>
      </a>`;
}

function indexRow(p, idx){
  const k = keyOf(p);
  const num = String(idx).padStart(2, '0');
  const tags = tagKeys(p).map((key) => `<li data-i18n="${key}">${esc(t(key))}</li>`).join('');
  const industry = has(`work.${k}.industry`)
    ? `<p class="work-row__industry" data-i18n="work.${k}.industry">${esc(t(`work.${k}.industry`))}</p>` : '';
  const desc = has(`work.${k}.desc`)
    ? `<p class="work-row__desc" data-i18n="work.${k}.desc">${esc(t(`work.${k}.desc`))}</p>` : '';
  return `<div class="work-row work-row--${p.type.toLowerCase()}" id="${p.slug}" data-project="${p.slug}" data-index="${num}" data-type="${p.type}" tabindex="0" role="button" aria-haspopup="dialog" data-i18n-aria="work.${k}.aria">
        <div class="work-row__index" aria-hidden="true"><canvas></canvas><span class="work-row__index-num">${num}</span></div>
        <div class="work-row__body">
          <h3 class="work-row__title">${esc(p.name)}</h3>
          ${industry}${desc}
          <ul class="work-row__tags">${tags}</ul>
        </div>
        <div class="work-row__meta">
          ${p.year ? `<span>${esc(p.year)}</span>` : ''}
          <span class="work-row__enter"><span data-i18n="work.enter">${esc(t('work.enter'))}</span> <span class="arrow">&rarr;</span></span>
        </div>
      </div>`;
}

function group(kind, list, mode, withHead){
  if(!list.length) return '';
  const build = mode === 'index' ? indexRow : previewRow;
  const head = withHead
    ? `<div class="work-group__head">
        <p class="eyebrow" data-i18n="work.${kind}.eyebrow">${esc(t(`work.${kind}.eyebrow`))}</p>
        <p class="work-group__note" data-i18n="work.${kind}.note">${esc(t(`work.${kind}.note`))}</p>
      </div>` : '';
  return `<div class="work-group work-group--${kind}">${head}${list.map((p, i) => build(p, i + 1)).join('\n')}</div>`;
}

/* Builds the project rows into every [data-work-list] container.
   data-work-list="preview" -> index.html rows, "index" -> work.html rows.
   Call before applyStaticTranslations() and before anything queries rows. */
export function renderWorkLists(){
  document.querySelectorAll('[data-work-list]').forEach((box) => {
    const mode = box.dataset.workList === 'index' ? 'index' : 'preview';
    box.innerHTML = [
      group('client', clientProjects(), mode, false),
      group('concepts', conceptProjects(), mode, true),
      group('development', developmentProjects(), mode, true),
    ].join('\n');
  });
}

/* Small "Bashkëpunime" strip. Stays hidden until at least one published
   client has a real, supplied logo asset. */
export function renderClientProof(){
  const section = document.getElementById('clients');
  const list = section && section.querySelector('.clients-list');
  if(!section || !list) return;
  const withLogo = clientProjects().filter((p) => p.logo && p.logo.src);
  if(!withLogo.length){ section.hidden = true; return; }
  list.innerHTML = withLogo.map((p) =>
    `<li><img src="${esc(p.logo.src)}" alt="${esc(p.logo.alt || p.name)}" loading="lazy" decoding="async"></li>`).join('');
  section.hidden = false;
}

/* ---- case-study blocks in the project modal ------------------------- */
const pick = (obj, lang) => (obj && typeof obj === 'object' ? (obj[lang] || obj.en || '') : (obj || ''));

export function fillCaseStudy(modal, slug, lang){
  const p = getProject(slug);
  const host = modal.querySelector('.project-modal__body > div');
  if(!host) return;
  let wrap = modal.querySelector('.project-modal__case');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.className = 'project-modal__case';
    host.appendChild(wrap);
  }
  wrap.textContent = '';
  if(!p){ wrap.hidden = true; return; }
  const k = keyOf(p);
  const block = (labelKey, text) => {
    if(!text) return;
    const sec = document.createElement('section');
    sec.className = 'project-modal__case-block';
    const h = document.createElement('h4');
    h.className = 'project-modal__case-label';
    h.textContent = t(labelKey, lang);
    const body = document.createElement('p');
    body.textContent = text;
    sec.append(h, body);
    wrap.appendChild(sec);
  };
  const tr = (key) => (has(key) ? t(key, lang) : '');

  block('modal.industry', tr(`work.${k}.industry`));
  block('modal.about', tr(`project.${k}.client`));
  block('modal.challenge', tr(`project.${k}.challenge`));
  block('modal.solution', tr(`project.${k}.solution`));

  if(p.features && p.features.length){
    const sec = document.createElement('section');
    sec.className = 'project-modal__case-block';
    const h = document.createElement('h4');
    h.className = 'project-modal__case-label';
    h.textContent = t('modal.features', lang);
    const ul = document.createElement('ul');
    p.features.forEach((_, i) => { const li = document.createElement('li'); li.textContent = tr(`project.${k}.feature${i + 1}`); ul.appendChild(li); });
    sec.append(h, ul);
    wrap.appendChild(sec);
  }

  /* media is created only now, when the modal opens, and always lazy */
  [['desktopMedia', 'desktop'], ['mobileMedia', 'mobile']].forEach(([field, cls]) => {
    const m = p[field];
    if(!m || !m.src) return;
    const fig = document.createElement('figure');
    fig.className = `project-modal__media project-modal__media--${cls}`;
    const img = document.createElement('img');
    img.src = m.src; img.alt = pick(m.alt, lang) || p.name;
    img.loading = 'lazy'; img.decoding = 'async';
    if(m.width) img.width = m.width;
    if(m.height) img.height = m.height;
    fig.appendChild(img);
    wrap.appendChild(fig);
  });

  if(p.results && p.results.length){
    const sec = document.createElement('section');
    sec.className = 'project-modal__case-block';
    const h = document.createElement('h4');
    h.className = 'project-modal__case-label';
    h.textContent = t('modal.results', lang);
    const ul = document.createElement('ul');
    p.results.forEach((r, i) => {
      const li = document.createElement('li');
      li.textContent = `${r.value ? r.value + ' ' : ''}${tr(`project.${k}.result${i + 1}`)}`.trim();
      ul.appendChild(li);
    });
    sec.append(h, ul);
    wrap.appendChild(sec);
  }

  if(p.testimonial && p.testimonial.quote){
    const fig = document.createElement('figure');
    fig.className = 'project-modal__quote';
    const bq = document.createElement('blockquote');
    bq.textContent = tr(`project.${k}.quote`);
    const cap = document.createElement('figcaption');
    const role = has(`project.${k}.quoteRole`) ? tr(`project.${k}.quoteRole`) : (p.testimonial.role || '');
    cap.textContent = [p.testimonial.name, role, p.testimonial.company].filter(Boolean).join(' · ');
    if(p.testimonial.photo && p.testimonial.photo.src){
      const ph = document.createElement('img');
      ph.src = p.testimonial.photo.src; ph.alt = p.testimonial.name || ''; ph.loading = 'lazy'; ph.decoding = 'async';
      fig.appendChild(ph);
    }
    fig.append(bq, cap);
    wrap.appendChild(fig);
  }

  wrap.hidden = wrap.children.length === 0;
}

/* ---- per-project SEO metadata while a project is open ---------------- */
let savedMeta = null;
function setMeta(selector, attr, value){
  const el = document.querySelector(selector);
  if(el && value) el.setAttribute(attr, value);
}
export function applyProjectMeta(slug, lang){
  const p = getProject(slug);
  if(!p) return;
  const k = keyOf(p);
  if(!savedMeta){
    const g = (s, a) => { const el = document.querySelector(s); return el ? el.getAttribute(a) : null; };
    savedMeta = {
      title: document.title,
      description: g('meta[name="description"]', 'content'),
      ogTitle: g('meta[property="og:title"]', 'content'),
      ogDescription: g('meta[property="og:description"]', 'content'),
    };
  }
  const industry = has(`work.${k}.industry`) ? t(`work.${k}.industry`, lang) : '';
  const tagline = has(`project.${k}.tagline`) ? t(`project.${k}.tagline`, lang) : '';
  const title = `${p.name}${industry ? ' — ' + industry : ''} | NJORD`;
  const desc = [tagline, industry].filter(Boolean).join(' ');
  document.title = title;
  setMeta('meta[name="description"]', 'content', desc);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', desc);
}
export function restoreProjectMeta(){
  if(!savedMeta) return;
  document.title = savedMeta.title;
  setMeta('meta[name="description"]', 'content', savedMeta.description);
  setMeta('meta[property="og:title"]', 'content', savedMeta.ogTitle);
  setMeta('meta[property="og:description"]', 'content', savedMeta.ogDescription);
  savedMeta = null;
}
