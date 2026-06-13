import { createSynth, createCrowdBed, createMusicLoop, type SynthKit } from "./synth";
import { Howl } from "howler";

export type Bus = "master" | "sfx" | "crowd" | "music";

type SampleKey =
  | "light_hit"
  | "heavy_hit"
  | "whoosh"
  | "block"
  | "signature_trump"
  | "signature_putin"
  | "signature_kim"
  | "gong"
  | "buzzer"
  | "ui_click"
  | "crowd_loop"
  | "music_loop";

const ALL_SAMPLE_KEYS: SampleKey[] = [
  "light_hit",
  "heavy_hit",
  "whoosh",
  "block",
  "signature_trump",
  "signature_putin",
  "signature_kim",
  "gong",
  "buzzer",
  "ui_click",
  "crowd_loop",
  "music_loop",
];

const LS_KEY = "tta_audio";

interface PersistedState {
  master: number;
  sfx: number;
  crowd: number;
  music: number;
  musicOn: boolean;
  muted: Partial<Record<Bus, boolean>>;
}

const DEFAULTS: PersistedState = {
  master: 0.8,
  sfx: 0.9,
  crowd: 0.5,
  music: 0.3,
  musicOn: false,
  muted: {},
};

function loadPersisted(): PersistedState {
  if (typeof window === "undefined") return { ...DEFAULTS, muted: {} };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS, muted: {} };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      master: parsed.master ?? DEFAULTS.master,
      sfx: parsed.sfx ?? DEFAULTS.sfx,
      crowd: parsed.crowd ?? DEFAULTS.crowd,
      music: parsed.music ?? DEFAULTS.music,
      musicOn: parsed.musicOn ?? DEFAULTS.musicOn,
      muted: parsed.muted ?? {},
    };
  } catch {
    return { ...DEFAULTS, muted: {} };
  }
}

function savePersisted(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // storage quota or private mode — ignore
  }
}

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private synth: SynthKit | null = null;
  private crowdBed: ReturnType<typeof createCrowdBed> | null = null;
  private musicLoop: ReturnType<typeof createMusicLoop> | null = null;

  private samples: Map<SampleKey, Howl> = new Map();
  private sampleLoaded: Map<SampleKey, boolean> = new Map();

  private initialized = false;
  private persisted: PersistedState;

  constructor() {
    this.persisted = loadPersisted();
    if (typeof window !== "undefined") {
      this._loadSamples();
    }
  }

  private _getAudioContextCtor(): typeof AudioContext | null {
    if (typeof window === "undefined") return null;
    const w = window as Window & { webkitAudioContext?: typeof AudioContext };
    return window.AudioContext ?? w.webkitAudioContext ?? null;
  }

  private _ensureCtx(): boolean {
    if (this.ctx) return true;
    const Ctor = this._getAudioContextCtor();
    if (!Ctor) return false;

    try {
      this.ctx = new Ctor();

      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.crowdGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.crowdGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this._applyAllGains();

      this.synth = createSynth(this.ctx, this.sfxGain);
      this.crowdBed = createCrowdBed(this.ctx, this.crowdGain);
      this.musicLoop = createMusicLoop(this.ctx, this.musicGain);

      return true;
    } catch {
      return false;
    }
  }

  private _applyAllGains(): void {
    if (!this.masterGain || !this.sfxGain || !this.crowdGain || !this.musicGain) return;
    const p = this.persisted;
    const masterVol = p.muted["master"] ? 0 : p.master;
    this.masterGain.gain.setTargetAtTime(masterVol, this.ctx!.currentTime, 0.01);

    const sfxVol = p.muted["sfx"] ? 0 : p.sfx;
    this.sfxGain.gain.setTargetAtTime(sfxVol, this.ctx!.currentTime, 0.01);

    const crowdVol = p.muted["crowd"] ? 0 : p.crowd;
    this.crowdGain.gain.setTargetAtTime(crowdVol, this.ctx!.currentTime, 0.01);

    const musicVol = p.muted["music"] ? 0 : p.music;
    this.musicGain.gain.setTargetAtTime(musicVol, this.ctx!.currentTime, 0.01);
  }

  private _gainNodeForBus(bus: Bus): GainNode | null {
    switch (bus) {
      case "master": return this.masterGain;
      case "sfx":    return this.sfxGain;
      case "crowd":  return this.crowdGain;
      case "music":  return this.musicGain;
    }
  }

  private _loadSamples(): void {
    for (const key of ALL_SAMPLE_KEYS) {
      try {
        const howl = new Howl({
          src: [`/audio/${key}.mp3`],
          preload: true,
          onload: () => {
            this.sampleLoaded.set(key, true);
          },
          onloaderror: () => {
            this.sampleLoaded.set(key, false);
          },
        });
        this.samples.set(key, howl);
        this.sampleLoaded.set(key, false);
      } catch {
        // sample loading is optional — swallow
      }
    }
  }

  hasSample(key: SampleKey): boolean {
    return this.sampleLoaded.get(key) === true;
  }

  private _playSample(key: SampleKey, volumeMultiplier = 1): boolean {
    if (!this.hasSample(key)) return false;
    const howl = this.samples.get(key);
    if (!howl) return false;
    const p = this.persisted;
    const busVol = (() => {
      switch (true) {
        case key === "crowd_loop":  return p.muted["crowd"] ? 0 : p.crowd;
        case key === "music_loop":  return p.muted["music"] ? 0 : p.music;
        default:                    return p.muted["sfx"]   ? 0 : p.sfx;
      }
    })();
    const masterVol = p.muted["master"] ? 0 : p.master;
    howl.volume(busVol * masterVol * volumeMultiplier);
    howl.play();
    return true;
  }

  // ─── Public lifecycle ──────────────────────────────────────────────────────

  init(): void {
    if (this.initialized) return;
    if (!this._ensureCtx()) return;
    if (this.ctx!.state === "suspended") {
      this.ctx!.resume().catch(() => undefined);
    }
    this.initialized = true;
    // start crowd bed quietly
    this.crowdBed?.start();
    this.crowdBed?.setIntensity(0.05);
    if (this.persisted.musicOn) {
      this.musicLoop?.start();
    }
  }

  // ─── Hit / combat sounds ──────────────────────────────────────────────────

  playHit(damage: number, isSpecial: boolean): void {
    const isHeavy = damage >= 15 || isSpecial;
    if (isHeavy) {
      if (!this._playSample("heavy_hit")) this.synth?.hit({ heavy: true });
    } else {
      if (!this._playSample("light_hit")) this.synth?.hit({ heavy: false });
    }
  }

  playWhoosh(): void {
    if (!this._playSample("whoosh")) this.synth?.whoosh();
  }

  playBlock(): void {
    if (!this._playSample("block")) this.synth?.block();
  }

  playSignature(fighterId: number): void {
    const keyMap: Record<number, SampleKey> = {
      1: "signature_trump",
      2: "signature_putin",
      3: "signature_kim",
    };
    const kindMap: Record<number, "trump" | "putin" | "kim"> = {
      1: "trump",
      2: "putin",
      3: "kim",
    };
    const key = keyMap[fighterId];
    const kind = kindMap[fighterId];
    if (!key || !kind) return;
    if (!this._playSample(key)) this.synth?.signature(kind);
  }

  playGong(): void {
    if (!this._playSample("gong")) this.synth?.gong();
  }

  playBuzzer(): void {
    if (!this._playSample("buzzer")) this.synth?.buzzer();
  }

  playUi(): void {
    if (!this._playSample("ui_click")) this.synth?.uiClick();
  }

  // ─── Crowd ─────────────────────────────────────────────────────────────────

  startCrowd(): void {
    if (!this.initialized) return;
    this.crowdBed?.start();
  }

  setCrowdIntensity(v: number): void {
    const clamped = Math.max(0, Math.min(1, v));
    this.crowdBed?.setIntensity?.(clamped);
  }

  // ─── Music ─────────────────────────────────────────────────────────────────

  startMusic(): void {
    if (!this.initialized) return;
    this.persisted.musicOn = true;
    savePersisted(this.persisted);
    this.musicLoop?.start();
  }

  stopMusic(): void {
    this.persisted.musicOn = false;
    savePersisted(this.persisted);
    this.musicLoop?.stop();
  }

  // ─── Volume / mute ─────────────────────────────────────────────────────────

  setVolume(bus: Bus, value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    (this.persisted as unknown as Record<string, number>)[bus] = clamped;
    savePersisted(this.persisted);

    if (!this.ctx) return;
    const node = this._gainNodeForBus(bus);
    if (!node) return;
    const muted = this.persisted.muted[bus] ?? false;
    node.gain.setTargetAtTime(muted ? 0 : clamped, this.ctx.currentTime, 0.02);
  }

  getVolume(bus: Bus): number {
    return (this.persisted as unknown as Record<string, number>)[bus] ?? (DEFAULTS[bus as keyof PersistedState] as number);
  }

  setMuted(bus: Bus, muted: boolean): void {
    this.persisted.muted[bus] = muted;
    savePersisted(this.persisted);

    if (!this.ctx) return;
    const node = this._gainNodeForBus(bus);
    if (!node) return;
    const vol = this.getVolume(bus);
    node.gain.setTargetAtTime(muted ? 0 : vol, this.ctx.currentTime, 0.02);
  }

  isMuted(bus: Bus): boolean {
    return this.persisted.muted[bus] ?? false;
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  dispose(): void {
    this.crowdBed?.stop?.();
    this.musicLoop?.stop?.();
    for (const howl of this.samples.values()) {
      try { howl.unload(); } catch { /* ignore */ }
    }
    this.samples.clear();
    this.sampleLoaded.clear();
    try { this.ctx?.close(); } catch { /* ignore */ }
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.crowdGain = null;
    this.musicGain = null;
    this.synth = null;
    this.crowdBed = null;
    this.musicLoop = null;
    this.initialized = false;
  }
}
