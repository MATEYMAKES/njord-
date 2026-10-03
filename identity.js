/* ================================================================
   NJORD — Identity section (V2).

   A normal in-flow section, not a pinned sequence. "Krijojmë" (left)
   and "identitet." (right) sit a genuine >=400px apart down the page,
   so each one reveals independently as IT — not the section as a
   whole — scrolls into a comfortable reading position: the visitor
   has to actually scroll through that gap, giving the ASCII organism's
   shapeless 'chaos' formation real room to read as directionless
   before it resolves into 'infinity' under the second word (see
   main.js setZones and ascii-engine.js's 'chaos'/'infinity' cases).
   ================================================================ */
import { ticker, whenVisible, prefersReducedMotion } from './ascii-engine.js';

export function initIdentity() {
  const section = document.getElementById('identity');
  if (!section) return;

  const words = section.querySelectorAll('.identity-word');
  const para = section.querySelector('.identity-copy p');
  const reveals = para ? [...words, para] : [...words];
  const row2 = section.querySelector('.identity-word-row--2');

  if (prefersReducedMotion()) {
    reveals.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // An element reveals once its own top has scrolled up to ~80% of the
  // viewport height — each word/paragraph judged by its own position,
  // not a shared progress value for the whole (now very tall) section.
  function update() {
    const vh = window.innerHeight;
    reveals.forEach((el) => {
      const rect = el.getBoundingClientRect();
      el.classList.toggle('is-visible', rect.top < vh * 0.8);
    });

    // As "identitet." approaches fully formed, gradually pull it up
    // toward "Krijojmë" — the gap between them shrinks by up to 50% of
    // its CSS default (300px), eased continuously with scroll rather
    // than snapping once some threshold is crossed.
    if (row2) {
      const rect = row2.getBoundingClientRect();
      const from = vh * 0.95, to = vh * 0.3;
      const t = Math.max(0, Math.min(1, (from - rect.top) / (from - to)));
      // pull up by at most half of the CSS gap — on phones the gap is
      // only ~120px, and a fixed 150px pull put the two words on top of
      // each other
      const gap = parseFloat(getComputedStyle(row2).marginTop) || 300;
      row2.style.transform = `translateY(${-Math.min(150, gap * 0.5) * t}px)`;
    }
  }

  whenVisible(section, () => ticker.add(update), () => ticker.remove(update));
  update();
}
