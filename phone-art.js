/* =====================================================================
   NJORD — phone artwork.

   Phones don't run the live ASCII engine (it was what made the site slow).
   This module swaps in pre-rendered versions of it, all drawn offline with
   the real engine and stored in assets/phone/:

   - the hero globe: a 20 s seamless loop (h264, ~0.8 MB), one cut for
     dark pages and one for light pages
   - Metalium / Vyron: three still frames each, used faintly behind the
     project page (a different one each time it is opened)
   (There is deliberately no mascot on phones; contact is a button that
   opens the same conversation.)

   Only loaded on phones (main.js imports it behind the is-phone check).
   ===================================================================== */
import { prefersReducedMotion } from './core.js';

const BASE = 'assets/phone/';
const root = document.documentElement;
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/* the page follows the system theme unless <html data-theme> forces one */
function isDark(){
  const forced = root.dataset.theme;
  if(forced === 'dark') return true;
  if(forced === 'light') return false;
  return darkQuery.matches;
}

/* ---------------------------------------------------------------
   Hero globe
   --------------------------------------------------------------- */
function initGlobe(){
  const host = document.getElementById('hero-globe');
  if(!host) return;
  // Reduced motion: keep the still image the stylesheet already shows.
  if(prefersReducedMotion()) return;

  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.disablePictureInPicture = true;
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');

  const load = () => {
    const dark = isDark();
    video.dataset.scheme = dark ? 'dark' : 'light';
    video.src = BASE + (dark ? 'globe-dark.mp4' : 'globe-light.mp4');
    if(visible) play();
  };
  const play = () => {
    const p = video.play();
    if(p && p.catch) p.catch(() => { /* autoplay refused (e.g. low-power mode): the still stays */ });
  };

  // the still image hands over to the video once the first frame is moving
  video.addEventListener('playing', () => host.classList.add('is-playing'));

  let visible = true;
  host.appendChild(video);
  load();

  if('IntersectionObserver' in window){
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if(visible) play(); else video.pause();
    }).observe(host);
  }
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) video.pause(); else if(visible) play();
  });

  // system switches between light and dark while the page is open
  const onScheme = () => {
    if((video.dataset.scheme === 'dark') === isDark()) return;
    host.classList.remove('is-playing');
    load();
  };
  if(darkQuery.addEventListener) darkQuery.addEventListener('change', onScheme);
}

/* ---------------------------------------------------------------
   Project page stills
   --------------------------------------------------------------- */
const STILL_COUNT = { metalium: 3, vyron: 3 };
const stillCursor = {};
let stillEl = null;

export function showProjectStill(key){
  const bg = document.querySelector('.project-modal__bg');
  if(!bg) return;
  const count = STILL_COUNT[key];
  if(!count){
    if(stillEl) stillEl.hidden = true;     // projects without a still just get a flat page
    return;
  }
  if(!stillEl){
    stillEl = new Image();
    stillEl.className = 'project-modal__still';
    stillEl.alt = '';
    stillEl.decoding = 'async';
    stillEl.setAttribute('aria-hidden', 'true');
    bg.appendChild(stillEl);
  }
  // start somewhere different each visit, then walk through the set
  if(stillCursor[key] == null) stillCursor[key] = Math.floor(Math.random() * count);
  const n = (stillCursor[key]++ % count) + 1;

  const img = stillEl;
  img.hidden = false;
  img.classList.remove('is-ready');
  img.onload = () => img.classList.add('is-ready');
  img.src = `${BASE}${key}-${n}.webp`;
  if(img.complete && img.naturalWidth) img.classList.add('is-ready');
}

initGlobe();
