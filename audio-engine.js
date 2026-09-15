/* ================================================================
   NJORD — generative audio engine
   ONE persistent, fully synthesized soundscape whose sonic state
   morphs with the ASCII organism's own scroll timeline. No audio
   files anywhere — every sound here is oscillators, generated
   noise, filters, envelopes and a code-built reverb impulse.

   Harmonic coherence: every pitched event in every voice is drawn
   through `degreeHz()`, which quantizes to one shared scale. This
   is what lets five independently-scheduled generative voices stay
   musical together without ever coordinating on pitch directly.

   Timing coherence: nothing here runs on a fixed loop or a shared
   clock signature. Each voice's scheduler picks its own next event
   time from a randomized range (see Scheduler below), and several
   LFOs run at mutually unrelated slow rates (0.015–0.07Hz). Both
   are deliberate — a fixed-length loop is exactly what would make
   a ten-minute visit start to sound repetitive.
   ================================================================ */
import { mulberry32, prefersReducedMotion } from './ascii-engine.js';

/* ---- shared harmonic system ----
   Root + an open, ambiguous six-note set: no perfect 4th to pull it
   toward a resolved, functional minor scale, so drones and clusters
   stay "unresolved" rather than reading as a conventional chord
   progression. Everything voices play is an index into this. */
const ROOT_HZ = 55; // A1 — low, spacious foundation
const SCALE = [0, 2, 3, 7, 9, 10];
function degreeHz(index, octave = 0){
  const len = SCALE.length;
  const oct = octave + Math.floor(index / len);
  const semis = SCALE[((index % len) + len) % len] + oct * 12;
  return ROOT_HZ * Math.pow(2, semis / 12);
}
function pick(rnd, arr){ return arr[Math.floor(rnd() * arr.length) % arr.length]; }
function range(rnd, lo, hi){ return lo + rnd() * (hi - lo); }

/* a simple, evenly-distributed rhythm generator (Bresenham-style
   "Euclidean" spacing of k pulses across n steps) — used by Pulse so
   its rhythm is generated, not authored, and can be regenerated with
   new n/k at will without ever repeating one fixed bar forever */
function euclid(steps, pulses){
  const pattern = new Array(steps).fill(false);
  if(pulses <= 0) return pattern;
  let bucket = 0;
  for(let i = 0; i < steps; i++){
    bucket += pulses;
    if(bucket >= steps){ bucket -= steps; pattern[i] = true; }
  }
  return pattern;
}

/* ---- lookahead scheduler (the standard Web Audio pattern for
   sample-accurate timing without driving everything from rAF) — each
   voice's `tick` callback decides what to play at `time` and returns
   how long to wait before the next one, so composition lives entirely
   in that decision rather than in a fixed sequence here ---- */
class Scheduler{
  constructor(ctx, tick){
    this.ctx = ctx;
    this.tick = tick;
    this.lookahead = 0.12;
    this.interval = 60;
    this.nextTime = 0;
    this._timer = null;
    this._running = false;
    this._loop = this._loop.bind(this);
  }
  start(){
    if(this._running) return;
    this._running = true;
    this.nextTime = this.ctx.currentTime + 0.05;
    this._loop();
  }
  stop(){
    this._running = false;
    if(this._timer) clearTimeout(this._timer);
  }
  _loop(){
    if(!this._running) return;
    while(this.nextTime < this.ctx.currentTime + this.lookahead){
      const wait = this.tick(this.nextTime);
      this.nextTime += wait > 0 ? wait : 1;
    }
    this._timer = setTimeout(this._loop, this.interval);
  }
}

/* ---- noise + a synthetic reverb impulse — generated buffers, never
   recorded/loaded audio ---- */
function makeNoiseBuffer(ctx, seconds, rnd){
  const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i = 0; i < n; i++) d[i] = rnd() * 2 - 1;
  return buf;
}
function makeImpulse(ctx, seconds, decay, rnd){
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for(let ch = 0; ch < 2; ch++){
    const d = buf.getChannelData(ch);
    for(let i = 0; i < n; i++){
      d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
  }
  return buf;
}

/* ----------------------------------------------------------------
   GLOBE — a spacious, evolving harmonic atmosphere. Three slow,
   independently-drifting partials (root / fifth-ish / ninth-ish)
   under a breathing lowpass and a slow stereo rotation, with rare,
   long swells drawn from the scale layered on top.
   ---------------------------------------------------------------- */
class GlobeVoice{
  constructor(ctx, dest, rnd, reduced){
    this.ctx = ctx; this.rnd = rnd;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.0001;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 900;
    this.filter.Q.value = 0.6;
    this.bus.connect(this.filter);

    this.pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if(this.pan){ this.filter.connect(this.pan); this.pan.connect(dest); }
    else this.filter.connect(dest);

    const depthMul = reduced ? 0.6 : 1;
    this.osc = [];
    const degrees = [0, 4, 8];
    const octs = [-1, -1, 0];
    degrees.forEach((deg, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = degreeHz(deg, octs[i]);
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.3;
      o.connect(g); g.connect(this.bus);
      o.start();

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.02 + rnd() * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = (4 + rnd() * 4) * depthMul;
      lfo.connect(lfoGain); lfoGain.connect(o.detune);
      lfo.start();
      this.osc.push(o, lfo);
    });

    this.fLfo = ctx.createOscillator();
    this.fLfo.frequency.value = 0.03;
    this.fLfoGain = ctx.createGain();
    this.fLfoGain.gain.value = 260 * depthMul;
    this.fLfo.connect(this.fLfoGain); this.fLfoGain.connect(this.filter.frequency);
    this.fLfo.start();
    this.osc.push(this.fLfo);

    if(this.pan){
      this.pLfo = ctx.createOscillator();
      this.pLfo.frequency.value = 0.015;
      this.pLfoGain = ctx.createGain();
      this.pLfoGain.gain.value = 0.55;
      this.pLfo.connect(this.pLfoGain); this.pLfoGain.connect(this.pan.pan);
      this.pLfo.start();
      this.osc.push(this.pLfo);
    }

    this.scheduler = new Scheduler(ctx, (time) => this._swell(time));
    this.scheduler.start();
  }
  _swell(time){
    const dur = range(this.rnd, 6, 11);
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = degreeHz(pick(this.rnd, [2, 4, 7, 9]), 0);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.12, time + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, time + dur);
    o.connect(g); g.connect(this.bus);
    o.start(time); o.stop(time + dur + 0.5);
    return range(this.rnd, 18, 34);
  }
  setWeight(w){
    this.bus.gain.setTargetAtTime(0.0001 + w * 0.9, this.ctx.currentTime, 1.4);
  }
  setEnergy(){ /* globe stays serene regardless of interaction energy */ }
  dispose(){
    this.scheduler.stop();
    this.osc.forEach((n) => { try{ n.stop(); }catch(e){} });
  }
}

/* ----------------------------------------------------------------
   CLOUD — controlled granular/noise turbulence, carried between
   named formations. Short bandpass-filtered noise grains, centered
   on scale-derived frequencies so the noise still reads as "tuned"
   rather than raw static. Density rides on transition progress,
   scroll turbulence and cursor speed.
   ---------------------------------------------------------------- */
class CloudVoice{
  constructor(ctx, dest, rnd, reduced){
    this.ctx = ctx; this.rnd = rnd; this.reduced = reduced;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.0001;
    this.bus.connect(dest);
    this.noiseBuffer = makeNoiseBuffer(ctx, 2, rnd);
    this._weight = 0;
    this.energy = 0;
    this.scheduler = new Scheduler(ctx, (t) => this._grain(t));
    this.scheduler.start();
  }
  _grain(time){
    if(this._weight > 0.015){
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      src.loopStart = this.rnd() * 1.5;
      src.playbackRate.value = 0.6 + this.rnd() * 0.8;

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = degreeHz(pick(this.rnd, [0, 1, 2, 3, 4, 5, 6, 7]), Math.floor(range(this.rnd, 1, 3)));
      bp.Q.value = 4 + this.rnd() * 10;

      const g = this.ctx.createGain();
      const dur = range(this.rnd, 0.06, 0.32 + this.energy * 0.4);
      const peak = (0.05 + this.rnd() * 0.09) * this._weight;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(peak, time + dur * 0.35);
      g.gain.linearRampToValueAtTime(0.0001, time + dur);

      src.connect(bp); bp.connect(g); g.connect(this.bus);
      src.start(time); src.stop(time + dur + 0.05);
    }
    const rate = (0.4 + this._weight * 6 + this.energy * 4) * (this.reduced ? 0.7 : 1);
    return (1 / Math.max(0.4, rate)) * range(this.rnd, 0.7, 1.4);
  }
  setWeight(w, turbulence){
    this._weight = Math.max(w, (turbulence || 0) * 0.4);
    this.bus.gain.setTargetAtTime(0.0001 + this._weight * 0.8, this.ctx.currentTime, 0.5);
  }
  setEnergy(pointerSpeed, turbulence){ this.energy = Math.max(pointerSpeed, turbulence); }
  dispose(){ this.scheduler.stop(); }
}

/* ----------------------------------------------------------------
   AURELIA — crystalline, glass-like harmonics. A short delay with
   feedback tuned to a scale-degree period builds a comb resonance
   (the "glass" character) entirely from a delay line, no impulse
   file involved; sparse ensembles of bright sine partials ring
   through it.
   ---------------------------------------------------------------- */
class AureliaVoice{
  constructor(ctx, dest, rnd){
    this.ctx = ctx; this.rnd = rnd;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.0001;
    this.bus.connect(dest);
    this._weight = 0; this.energy = 0;

    this.delay = ctx.createDelay(0.05);
    this.delay.delayTime.value = 1 / degreeHz(4, 2);
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.42;
    this.delay.connect(this.feedback); this.feedback.connect(this.delay);
    this.delay.connect(this.bus);

    this.scheduler = new Scheduler(ctx, (t) => this._ping(t));
    this.scheduler.start();
  }
  _ping(time){
    if(this._weight > 0.02){
      const n = 2 + Math.floor(this.rnd() * 2);
      const deg = pick(this.rnd, [0, 2, 4, 7, 9, 11]);
      for(let k = 0; k < n; k++){
        const o = this.ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = degreeHz(deg + (k === 0 ? 0 : 7 * k), Math.floor(range(this.rnd, 2, 4)));
        const g = this.ctx.createGain();
        const dur = range(this.rnd, 1.2, 3.2);
        const peak = (0.05 + this.rnd() * 0.06) * this._weight / n;
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(peak, time + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        o.connect(g); g.connect(this.bus); g.connect(this.delay);
        o.start(time); o.stop(time + dur + 0.1);
      }
    }
    const rate = 0.05 + this._weight * 0.35 + this.energy * 0.25;
    return range(this.rnd, 1.4, 3.6) / Math.max(0.05, rate);
  }
  setWeight(w){
    this._weight = w;
    this.bus.gain.setTargetAtTime(0.0001 + w * 0.85, this.ctx.currentTime, 0.9);
  }
  setEnergy(pointerSpeed){ this.energy = pointerSpeed; }
  dispose(){
    this.scheduler.stop();
    try{ this.delay.disconnect(); this.feedback.disconnect(); }catch(e){}
  }
}

/* ----------------------------------------------------------------
   PULSE — a restrained, procedural rhythmic structure. A generated
   (not authored) Euclidean-style pattern spaces soft tone+noise
   ticks across a slow grid, reshuffled occasionally so it never
   settles into one repeating bar. A quiet continuous carrier tone
   underneath means the voice always has a real waveform for the
   ASCII layer to read (see `tapInto` / GenerativeAudio.getPulseWaveform).
   ---------------------------------------------------------------- */
class PulseVoice{
  constructor(ctx, dest, rnd){
    this.ctx = ctx; this.rnd = rnd;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.0001;
    this._weight = 0; this.energy = 0;

    this.carrier = ctx.createOscillator();
    this.carrier.type = 'triangle';
    this.carrier.frequency.value = degreeHz(0, -1);
    this.carrierGain = ctx.createGain();
    this.carrierGain.gain.value = 0.02;
    this.carrier.connect(this.carrierGain); this.carrierGain.connect(this.bus);
    this.carrier.start();

    this.carrierLfo = ctx.createOscillator();
    this.carrierLfo.frequency.value = 0.07;
    this.carrierLfoGain = ctx.createGain();
    this.carrierLfoGain.gain.value = 6;
    this.carrierLfo.connect(this.carrierLfoGain); this.carrierLfoGain.connect(this.carrier.detune);
    this.carrierLfo.start();

    this.tickFilter = ctx.createBiquadFilter();
    this.tickFilter.type = 'highpass';
    this.tickFilter.frequency.value = 700;
    this.tickFilter.connect(this.bus);

    this.noiseBuffer = makeNoiseBuffer(ctx, 1, rnd);

    this._steps = 8; this._pulses = 3;
    this._pattern = euclid(this._steps, this._pulses);
    this._stepIndex = 0;
    this._stepDur = 0.72; // a slow, unhurried grid — not a beat to move to

    this.scheduler = new Scheduler(ctx, (t) => this._step(t));
    this.scheduler.start();
  }
  /* routed through an analyser (inline, in series) so the visible ASCII
     wave can read this voice's own real output — see GenerativeAudio */
  tapInto(analyser, finalDest){
    this.bus.connect(analyser);
    analyser.connect(finalDest);
  }
  _step(time){
    if(this._weight > 0.02 && this._pattern[this._stepIndex]){
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = degreeHz(pick(this.rnd, [0, 3, 5]), Math.floor(range(this.rnd, 0, 2)));
      const g = this.ctx.createGain();
      const peak = (0.06 + this.rnd() * 0.05) * this._weight;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(peak, time + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
      o.connect(g); g.connect(this.bus);
      o.start(time); o.stop(time + 0.22);

      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.0001, time);
      ng.gain.linearRampToValueAtTime(peak * 0.5, time + 0.004);
      ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
      src.connect(ng); ng.connect(this.tickFilter);
      src.start(time); src.stop(time + 0.06);
    }
    this._stepIndex = (this._stepIndex + 1) % this._steps;
    if(this._stepIndex === 0 && this.rnd() < 0.35){
      this._steps = pick(this.rnd, [8, 10, 12]);
      this._pulses = Math.max(2, Math.floor(this._steps * range(this.rnd, 0.2, 0.42)));
      this._pattern = euclid(this._steps, this._pulses);
    }
    return this._stepDur * range(this.rnd, 0.97, 1.03);
  }
  setWeight(w){
    this._weight = w;
    const now = this.ctx.currentTime;
    this.bus.gain.setTargetAtTime(0.0001 + w * 0.8, now, 0.7);
    this.carrierGain.gain.setTargetAtTime(0.015 + w * 0.05, now, 1);
  }
  setEnergy(pointerSpeed, turbulence){ this.energy = Math.max(pointerSpeed, turbulence); }
  dispose(){
    this.scheduler.stop();
    try{ this.carrier.stop(); this.carrierLfo.stop(); }catch(e){}
  }
}

/* ----------------------------------------------------------------
   NETWORK — an evolving, interconnected harmonic texture. A handful
   of independent long-tone "nodes" spread across the stereo field,
   each waking and fading on its own; occasionally two are triggered
   together as a correlated swell — a brief "edge" forming between
   them, echoing the visual network's own live nearest-neighbor links.
   ---------------------------------------------------------------- */
class NetworkVoice{
  constructor(ctx, dest, rnd){
    this.ctx = ctx; this.rnd = rnd;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.0001;
    this.bus.connect(dest);
    this._weight = 0; this.energy = 0;

    this.nodes = [];
    const nodeCount = 5;
    for(let i = 0; i < nodeCount; i++){
      const o = ctx.createOscillator();
      o.type = i % 2 === 0 ? 'sine' : 'triangle';
      o.frequency.value = degreeHz(pick(rnd, [0, 2, 4, 5, 7, 9]), Math.floor(range(rnd, -1, 2)));
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      o.connect(g);
      if(pan){ g.connect(pan); pan.connect(this.bus); pan.pan.value = range(rnd, -0.8, 0.8); }
      else g.connect(this.bus);
      o.start();
      this.nodes.push({ o, g, pan });
    }

    this.scheduler = new Scheduler(ctx, (t) => this._tick(t));
    this.scheduler.start();
  }
  _tick(time){
    if(this._weight > 0.02){
      const node = pick(this.rnd, this.nodes);
      const dur = range(this.rnd, 3, 8);
      const peak = (0.05 + this.rnd() * 0.08) * this._weight;
      this._swellNode(node, time, dur, peak);

      if(this.rnd() < 0.4){
        const others = this.nodes.filter((n) => n !== node);
        const other = pick(this.rnd, others);
        this._swellNode(other, time, dur * range(this.rnd, 0.6, 1.1), peak * 0.7);
      }
    }
    return range(this.rnd, 1.5, 4) / (0.4 + this._weight + this.energy * 0.5);
  }
  _swellNode(node, time, dur, peak){
    node.g.gain.cancelScheduledValues(time);
    node.g.gain.setValueAtTime(node.g.gain.value, time);
    node.g.gain.linearRampToValueAtTime(peak, time + dur * 0.3);
    node.g.gain.linearRampToValueAtTime(0.0001, time + dur);
  }
  setWeight(w){
    this._weight = w;
    this.bus.gain.setTargetAtTime(0.0001 + w * 0.85, this.ctx.currentTime, 0.9);
  }
  setEnergy(pointerSpeed, turbulence){ this.energy = Math.max(pointerSpeed, turbulence); }
  dispose(){
    this.scheduler.stop();
    this.nodes.forEach((n) => { try{ n.o.stop(); }catch(e){} });
  }
}

/* ----------------------------------------------------------------
   GenerativeAudio — the single persistent audio system. Mirrors the
   ASCII organism's own philosophy: nothing is ever torn down and
   restarted between states, only crossfaded. Built lazily, on the
   first `enable()`, which only ever runs from a real user gesture
   (the sound toggle's click handler) — never on load, never on
   scroll, per autoplay policy.
   ---------------------------------------------------------------- */
export class GenerativeAudio{
  constructor(){
    this.ctx = null;
    this.enabled = false;
    this.rnd = mulberry32(20260914);
    this.reduced = prefersReducedMotion();
    this._organism = null;
    this._pollTimer = null;
    this._pulseAnalyser = null;
    this._pulseWaveform = null;
  }

  attachOrganism(organism){ this._organism = organism; }

  enable(){
    if(!this.ctx){
      try{
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this._build();
      }catch(e){
        this.ctx = null;
        return false;
      }
    }
    this.ctx.resume().catch(() => {});
    this.enabled = true;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(this._targetVolume, now + 2.5);
    this._startPolling();
    return true;
  }

  disable(){
    this.enabled = false;
    this._stopPolling();
    if(!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0.0001, now + 1.2);
    setTimeout(() => { if(!this.enabled && this.ctx) this.ctx.suspend().catch(() => {}); }, 1400);
  }

  toggle(){
    if(this.enabled) this.disable(); else this.enable();
    return this.enabled;
  }

  destroy(){
    this._stopPolling();
    if(this._voices) this._voices.forEach((v) => v.dispose());
    if(this.ctx) this.ctx.close().catch(() => {});
  }

  getPulseWaveform(){
    if(!this._pulseAnalyser) return null;
    this._pulseAnalyser.getFloatTimeDomainData(this._pulseWaveform);
    return this._pulseWaveform;
  }

  _build(){
    const ctx = this.ctx;
    this._targetVolume = 0.32;

    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;

    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = 'lowpass';
    this.masterFilter.frequency.value = 5200;
    this.masterFilter.Q.value = 0.3;

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulse(ctx, 4.2, 2.6, this.rnd);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.55;

    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 0.85;

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.knee.value = 12;
    this.limiter.ratio.value = 4;
    this.limiter.attack.value = 0.01;
    this.limiter.release.value = 0.3;

    this.master.connect(this.masterFilter);
    this.masterFilter.connect(this.dryGain);
    this.masterFilter.connect(this.reverb);
    this.reverb.connect(this.reverbGain);
    this.dryGain.connect(this.limiter);
    this.reverbGain.connect(this.limiter);
    this.limiter.connect(ctx.destination);

    this.globe = new GlobeVoice(ctx, this.master, this.rnd, this.reduced);
    this.cloud = new CloudVoice(ctx, this.master, this.rnd, this.reduced);
    this.aurelia = new AureliaVoice(ctx, this.master, this.rnd);
    this.pulse = new PulseVoice(ctx, this.master, this.rnd);
    this.network = new NetworkVoice(ctx, this.master, this.rnd);
    this._voices = [this.globe, this.cloud, this.aurelia, this.pulse, this.network];

    this._pulseAnalyser = ctx.createAnalyser();
    this._pulseAnalyser.fftSize = 256;
    this._pulseWaveform = new Float32Array(this._pulseAnalyser.fftSize);
    this.pulse.tapInto(this._pulseAnalyser, this.master);
  }

  _startPolling(){
    if(this._pollTimer) return;
    this._pollTimer = setInterval(() => this._poll(), 90);
  }
  _stopPolling(){
    if(this._pollTimer) clearInterval(this._pollTimer);
    this._pollTimer = null;
  }

  /* Reads the organism's own public scroll-timeline state (never its
     internals) at a low, fixed rate — audio does not hook into the
     60fps visual ticker at all, keeping the two systems decoupled. */
  _poll(){
    const org = this._organism;
    if(!org || !this.ctx) return;
    const seg = org.seg || { a: 'globe', b: 'globe', t: 0 };
    const weightOf = (name) => (seg.a === name ? 1 - seg.t : 0) + (seg.b === name ? seg.t : 0);
    const cloudWeight = seg.a === seg.b ? 0 : 4 * seg.t * (1 - seg.t);
    const pointerSpeed = Math.min(1, org.pointerSpeed || 0);
    const turbulence = Math.min(1, org.scrollTurbulence || 0);

    this.globe.setWeight(weightOf('globe'));
    this.aurelia.setWeight(weightOf('diamond'));
    this.pulse.setWeight(weightOf('wave'));
    this.network.setWeight(weightOf('network'));
    this.cloud.setWeight(cloudWeight, turbulence);

    this.masterFilter.frequency.setTargetAtTime(5200 + pointerSpeed * 3600, this.ctx.currentTime, 0.6);
    this._voices.forEach((v) => v.setEnergy(pointerSpeed, turbulence));
  }
}
