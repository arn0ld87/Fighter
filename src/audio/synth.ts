import * as THREE from "three";

// ─── helpers ────────────────────────────────────────────────────────────────

function makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.ceil(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function noiseSource(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = makeNoise(ctx, seconds);
  return src;
}

function osc(ctx: AudioContext, type: OscillatorType, freq: number): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  return o;
}

function gain(ctx: AudioContext, value = 1): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

function bpf(ctx: AudioContext, freq: number, q = 1): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function lpf(ctx: AudioContext, freq: number): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = freq;
  return f;
}

function shaper(ctx: AudioContext, amount: number): WaveShaperNode {
  const ws = ctx.createWaveShaper();
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  ws.curve = curve;
  return ws;
}

function autoStop(node: AudioScheduledSourceNode, t: number): void {
  node.stop(t);
}

// ─── exports ────────────────────────────────────────────────────────────────

export interface SynthKit {
  hit(o: { heavy: boolean }): void;
  whoosh(): void;
  block(): void;
  signature(kind: "trump" | "putin" | "kim"): void;
  gong(): void;
  buzzer(): void;
  uiClick(): void;
}

export function createSynth(ctx: AudioContext, out: GainNode): SynthKit {
  return {
    // ── hit ───────────────────────────────────────────────────────────────
    hit({ heavy }) {
      const t = ctx.currentTime;
      const dur = heavy ? 0.22 : 0.12;
      const startF = heavy ? 90 : 140;
      const endF = heavy ? 35 : 70;

      // sine thud
      const thudOsc = osc(ctx, "sine", startF);
      const thudGain = gain(ctx, heavy ? 0.7 : 0.45);
      thudOsc.frequency.setValueAtTime(startF, t);
      thudOsc.frequency.exponentialRampToValueAtTime(endF, t + dur);
      thudGain.gain.setValueAtTime(thudGain.gain.value, t);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      if (heavy) {
        const ws = shaper(ctx, 80);
        thudOsc.connect(ws);
        ws.connect(thudGain);
      } else {
        thudOsc.connect(thudGain);
      }
      thudGain.connect(out);
      thudOsc.start(t);
      autoStop(thudOsc, t + dur + 0.01);

      // noise burst through lowpass
      const noiseDur = heavy ? 0.12 : 0.06;
      const nSrc = noiseSource(ctx, noiseDur + 0.05);
      const nFilter = lpf(ctx, heavy ? 1200 : 2000);
      const nGain = gain(ctx, heavy ? 0.35 : 0.2);
      nGain.gain.setValueAtTime(nGain.gain.value, t);
      nGain.gain.exponentialRampToValueAtTime(0.0001, t + noiseDur);
      nSrc.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(out);
      nSrc.start(t);
      autoStop(nSrc, t + noiseDur + 0.01);
    },

    // ── whoosh ────────────────────────────────────────────────────────────
    whoosh() {
      const t = ctx.currentTime;
      const dur = 0.25;
      const nSrc = noiseSource(ctx, dur + 0.05);
      const filter = bpf(ctx, 400, 2.5);
      const g = gain(ctx, 0.4);

      filter.frequency.setValueAtTime(400, t);
      filter.frequency.linearRampToValueAtTime(1800, t + dur * 0.5);
      filter.frequency.linearRampToValueAtTime(300, t + dur);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.4, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      nSrc.connect(filter);
      filter.connect(g);
      g.connect(out);
      nSrc.start(t);
      autoStop(nSrc, t + dur + 0.01);
    },

    // ── block ─────────────────────────────────────────────────────────────
    block() {
      const t = ctx.currentTime;
      const dur = 0.06;

      // two detuned square blips
      [520, 610].forEach((freq, i) => {
        const o = osc(ctx, "square", freq);
        const g = gain(ctx, 0.18);
        g.gain.setValueAtTime(0.18, t + i * 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(out);
        o.start(t + i * 0.005);
        autoStop(o, t + dur + 0.01);
      });

      // noise tick
      const nDur = 0.025;
      const nSrc = noiseSource(ctx, nDur + 0.01);
      const nFilter = bpf(ctx, 3000, 4);
      const nGain = gain(ctx, 0.15);
      nGain.gain.setValueAtTime(0.15, t);
      nGain.gain.exponentialRampToValueAtTime(0.0001, t + nDur);
      nSrc.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(out);
      nSrc.start(t);
      autoStop(nSrc, t + nDur + 0.01);
    },

    // ── signature ─────────────────────────────────────────────────────────
    signature(kind) {
      const t = ctx.currentTime;

      // per-fighter params
      const params = {
        trump: { subFreq: 55, riserFreq: 180, riserType: "sawtooth" as OscillatorType, dur: 0.85, gainSub: 0.7, gainRiser: 0.22, filterFreq: 800 },
        putin: { subFreq: 40, riserFreq: 130, riserType: "sawtooth" as OscillatorType, dur: 0.9, gainSub: 0.65, gainRiser: 0.18, filterFreq: 600 },
        kim:   { subFreq: 28, riserFreq: 95,  riserType: "sawtooth" as OscillatorType, dur: 0.8,  gainSub: 0.85, gainRiser: 0.25, filterFreq: 400 },
      }[kind];

      // sub boom
      const subOsc = osc(ctx, "sine", params.subFreq);
      const subG = gain(ctx, params.gainSub);
      subG.gain.setValueAtTime(params.gainSub, t);
      subG.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      subOsc.connect(subG);
      subG.connect(out);
      subOsc.start(t);
      autoStop(subOsc, t + 0.36);

      // impact noise burst
      const impDur = 0.1;
      const impSrc = noiseSource(ctx, impDur + 0.05);
      const impFilter = lpf(ctx, params.filterFreq);
      const impG = gain(ctx, 0.4);
      impG.gain.setValueAtTime(0.4, t);
      impG.gain.exponentialRampToValueAtTime(0.0001, t + impDur);
      const ws = shaper(ctx, 60);
      impSrc.connect(impFilter);
      impFilter.connect(ws);
      ws.connect(impG);
      impG.connect(out);
      impSrc.start(t);
      autoStop(impSrc, t + impDur + 0.01);

      // rising sawtooth riser
      const riserOsc = osc(ctx, params.riserType, params.riserFreq);
      const riserFilter = bpf(ctx, params.riserFreq * 1.5, 1.5);
      const riserG = gain(ctx, 0.0001);
      riserOsc.frequency.setValueAtTime(params.riserFreq, t + 0.05);
      riserOsc.frequency.exponentialRampToValueAtTime(params.riserFreq * 3.5, t + params.dur);
      riserG.gain.setValueAtTime(0.0001, t + 0.05);
      riserG.gain.linearRampToValueAtTime(params.gainRiser, t + params.dur * 0.7);
      riserG.gain.exponentialRampToValueAtTime(0.0001, t + params.dur);
      riserOsc.connect(riserFilter);
      riserFilter.connect(riserG);
      riserG.connect(out);
      riserOsc.start(t + 0.05);
      autoStop(riserOsc, t + params.dur + 0.01);
    },

    // ── gong ──────────────────────────────────────────────────────────────
    gong() {
      const t = ctx.currentTime;
      const baseFreq = 120;
      const partials = [1, 2.76, 5.4, 8.9, 13.2];
      const partialGains = [0.6, 0.35, 0.2, 0.12, 0.07];
      const dur = 2.2;

      partials.forEach((ratio, i) => {
        const freq = baseFreq * ratio;
        const o = osc(ctx, "sine", freq);
        const g = gain(ctx, partialGains[i]);
        const envTime = dur * (1 - i * 0.12);
        g.gain.setValueAtTime(partialGains[i], t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + envTime);
        o.connect(g);
        g.connect(out);
        o.start(t);
        autoStop(o, t + envTime + 0.01);
      });
    },

    // ── buzzer ────────────────────────────────────────────────────────────
    buzzer() {
      const t = ctx.currentTime;
      const dur = 0.7;
      const o = osc(ctx, "square", 180);
      const tremoloLfo = osc(ctx, "sine", 12);
      const tremoloGain = gain(ctx, 0.08);
      const envGain = gain(ctx, 0.35);

      envGain.gain.setValueAtTime(0.35, t);
      envGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      tremoloLfo.connect(tremoloGain);
      tremoloGain.connect(envGain.gain);
      o.connect(envGain);
      envGain.connect(out);

      tremoloLfo.start(t);
      o.start(t);
      autoStop(tremoloLfo, t + dur + 0.01);
      autoStop(o, t + dur + 0.01);
    },

    // ── uiClick ───────────────────────────────────────────────────────────
    uiClick() {
      const t = ctx.currentTime;
      const dur = 0.03;
      const o = osc(ctx, "sine", 1200);
      const g = gain(ctx, 0.25);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(out);
      o.start(t);
      autoStop(o, t + dur + 0.005);
    },
  };
}

// ─── crowd bed ──────────────────────────────────────────────────────────────

export function createCrowdBed(
  ctx: AudioContext,
  out: GainNode
): { start(): void; stop(): void; setIntensity(v: number): void } {
  // murmur layer
  const murmurSrc = ctx.createBufferSource();
  murmurSrc.buffer = makeNoise(ctx, 4);
  murmurSrc.loop = true;
  const murmurLp = lpf(ctx, 400);
  const murmurG = gain(ctx, 0.12);
  murmurSrc.connect(murmurLp);
  murmurLp.connect(murmurG);
  murmurG.connect(out);

  // cheer layer
  const cheerSrc = ctx.createBufferSource();
  cheerSrc.buffer = makeNoise(ctx, 4);
  cheerSrc.loop = true;
  const cheerBp = bpf(ctx, 800, 1.2);
  const cheerG = gain(ctx, 0.0001);
  cheerSrc.connect(cheerBp);
  cheerBp.connect(cheerG);
  cheerG.connect(out);

  // swell LFO
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.07;
  const lfoGain = gain(ctx, 0.04);
  lfo.connect(lfoGain);
  lfoGain.connect(murmurG.gain);

  let started = false;

  return {
    start() {
      if (started) return;
      started = true;
      murmurSrc.start();
      cheerSrc.start();
      lfo.start();
    },
    stop() {
      if (!started) return;
      const t = ctx.currentTime;
      murmurG.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      cheerG.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      setTimeout(() => {
        try { murmurSrc.stop(); cheerSrc.stop(); lfo.stop(); } catch (_) {}
      }, 600);
    },
    setIntensity(v: number) {
      const clamped = Math.max(0, Math.min(1, v));
      const t = ctx.currentTime;
      cheerG.gain.setTargetAtTime(clamped * 0.22, t, 0.3);
      murmurG.gain.setTargetAtTime(0.08 + clamped * 0.1, t, 0.3);
    },
  };
}

// ─── music loop ─────────────────────────────────────────────────────────────

export function createMusicLoop(
  ctx: AudioContext,
  out: GainNode
): { start(): void; stop(): void } {
  const BPM = 128;
  const BEAT = 60 / BPM;
  const BARS = 4;
  const LOOP_DUR = BEAT * 4 * BARS;

  // bass arp notes (root, maj3, 5th, oct) over two bars
  const ARP_NOTES = [55, 69.3, 82.4, 110, 82.4, 69.3, 55, 82.4];
  const BEAT_STEPS = 8; // 8th notes

  let loopStart = 0;
  let loopId: ReturnType<typeof setTimeout> | null = null;
  let running = false;

  const masterG = gain(ctx, 0.28);
  masterG.connect(out);

  function scheduleBar(startTime: number): void {
    const stepDur = BEAT / 2; // 8th note

    for (let step = 0; step < BEAT_STEPS * BARS; step++) {
      const t = startTime + step * stepDur;

      // kick on every beat (every 2 steps)
      if (step % 2 === 0) {
        const kickOsc = osc(ctx, "sine", 80);
        const kickG = gain(ctx, 0.7);
        kickOsc.frequency.setValueAtTime(80, t);
        kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.08);
        kickG.gain.setValueAtTime(0.7, t);
        kickG.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        kickOsc.connect(kickG);
        kickG.connect(masterG);
        kickOsc.start(t);
        kickOsc.stop(t + 0.13);
      }

      // bass arp on every 8th note
      const noteFreq = ARP_NOTES[step % ARP_NOTES.length];
      const bassOsc = osc(ctx, "sawtooth", noteFreq);
      const bassFilter = lpf(ctx, 500);
      const bassG = gain(ctx, 0.22);
      bassG.gain.setValueAtTime(0.22, t);
      bassG.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 0.85);
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassG);
      bassG.connect(masterG);
      bassOsc.start(t);
      bassOsc.stop(t + stepDur * 0.86);

      // hi-hat on off-beats
      if (step % 2 === 1) {
        const hLen = 0.025;
        const hSrc = noiseSource(ctx, hLen + 0.01);
        const hFilter = bpf(ctx, 8000, 5);
        const hG = gain(ctx, 0.08);
        hG.gain.setValueAtTime(0.08, t);
        hG.gain.exponentialRampToValueAtTime(0.0001, t + hLen);
        hSrc.connect(hFilter);
        hFilter.connect(hG);
        hG.connect(masterG);
        hSrc.start(t);
        hSrc.stop(t + hLen + 0.005);
      }
    }
  }

  function scheduleLoop(): void {
    if (!running) return;
    scheduleBar(loopStart);
    const nextStart = loopStart + LOOP_DUR;
    const delay = (nextStart - ctx.currentTime - 0.1) * 1000;
    loopStart = nextStart;
    loopId = setTimeout(scheduleLoop, Math.max(0, delay));
  }

  return {
    start() {
      if (running) return;
      running = true;
      loopStart = ctx.currentTime + 0.05;
      scheduleLoop();
    },
    stop() {
      running = false;
      if (loopId !== null) clearTimeout(loopId);
      const t = ctx.currentTime;
      masterG.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    },
  };
}
