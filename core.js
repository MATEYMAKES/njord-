/* ================================================================
   NJORD — core helpers shared by every page and every device.
   Deliberately tiny and dependency-free: phones load this file but
   never the heavy ASCII artwork engine (ascii-engine.js), which
   re-exports these three names so desktop imports keep working.
   ================================================================ */

/* ---- central animation ticker: one rAF loop drives every live
   callback; callbacks register/unregister as they enter/leave the
   viewport ---- */
class Ticker{
  constructor(){
    this._items = new Set();
    this._running = false;
    this._last = 0;
    this._tick = this._tick.bind(this);
  }
  add(fn){ this._items.add(fn); this._start(); }
  remove(fn){ this._items.delete(fn); if(this._items.size === 0) this._stop(); }
  _start(){
    if(this._running) return;
    this._running = true;
    this._last = performance.now();
    requestAnimationFrame(this._tick);
  }
  _stop(){ this._running = false; }
  _tick(t){
    if(!this._running) return;
    const dt = Math.min((t - this._last) / 1000, 0.05);
    this._last = t;
    for(const fn of this._items) fn(dt, t);
    requestAnimationFrame(this._tick);
  }
}
export const ticker = new Ticker();

export const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- pause/resume a callback based on viewport visibility ---- */
export function whenVisible(el, onEnter, onExit){
  const io = new IntersectionObserver((entries) => {
    for(const entry of entries){
      if(entry.isIntersecting) onEnter(); else onExit && onExit();
    }
  }, { threshold: 0.02 });
  io.observe(el);
  return io;
}
