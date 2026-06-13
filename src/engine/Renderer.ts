/**
 * Renderer — composes the engine modules into a Three.js scene with
 * post-processing (bloom). Consumes an immutable RenderState each frame.
 *
 * The React wrapper owns the RAF loop and particle simulation; this class is
 * a pure "given state, draw frame" unit.
 */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { Arena } from "./Arena";
import { Lighting } from "./Lighting";
import { FighterRig } from "./FighterRig";
import { Particles } from "./Particles";
import { CameraDirector } from "./CameraDirector";
import { THEMES, type RenderState, type ThemeKey, type Vector3D } from "./types";

export class Renderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;

  private readonly arena: Arena;
  private readonly lighting: Lighting;
  private readonly particles: Particles;
  private readonly director: CameraDirector;
  private readonly rigs = new Map<number, FighterRig>();

  private theme: ThemeKey;
  private prevTimeMs = 0;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement, theme: ThemeKey = "neon_vegas") {
    this.theme = theme;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.32;

    this.scene = new THREE.Scene();
    this.applySceneTheme(theme);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    this.camera.position.set(0, 4, 14);

    this.arena = new Arena(theme);
    this.lighting = new Lighting(theme);
    this.particles = new Particles();
    this.director = new CameraDirector(this.camera);

    this.scene.add(this.arena.group, this.lighting.group, this.particles.group);

    // --- Post-processing: bloom for spotlights & signature flashes ---
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      0.85, // strength
      0.7, // radius
      0.85, // threshold
    );
    this.composer.addPass(this.bloom);
  }

  private applySceneTheme(theme: ThemeKey): void {
    const t = THEMES[theme];
    this.scene.background = new THREE.Color(t.bgOuter);
    this.scene.fog = new THREE.FogExp2(t.fogColor, t.fogDensity);
  }

  setTheme(theme: ThemeKey): void {
    if (theme === this.theme) return;
    this.theme = theme;
    this.applySceneTheme(theme);
    this.arena.setTheme(theme);
    this.lighting.setTheme(theme);
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setSize(this.width, this.height);
    this.bloom.setSize(this.width, this.height);
  }

  /** One-shot hit reaction: bloom flash, camera shake, flash the struck fighter. */
  impact(location: Vector3D, fighters: RenderState["fighters"]): void {
    this.lighting.pulse(2.2);
    this.director.addShake(0.5);
    // Flash the fighter nearest the impact point.
    let nearest: number | null = null;
    let best = Infinity;
    for (const f of fighters) {
      const dx = f.pos.x - location.x;
      const dz = f.pos.z - location.z;
      const d = dx * dx + dz * dz;
      if (d < best) {
        best = d;
        nearest = f.id;
      }
    }
    if (nearest != null) this.rigs.get(nearest)?.flash();
  }

  update(state: RenderState): void {
    const slow = state.isSlowMotion ? 0.4 : 1;
    let dt = (state.timeMs - this.prevTimeMs) / 1000;
    if (!isFinite(dt) || dt <= 0) dt = 1 / 60;
    dt = Math.min(dt, 0.1) * slow;
    this.prevTimeMs = state.timeMs;

    this.setTheme(state.theme);

    // Sync fighter rigs (create on first sight, dispose departed).
    const seen = new Set<number>();
    for (const f of state.fighters) {
      seen.add(f.id);
      let rig = this.rigs.get(f.id);
      if (!rig) {
        rig = new FighterRig(f);
        this.rigs.set(f.id, rig);
        this.scene.add(rig.group);
      }
      rig.update(f, dt, state.timeMs);
    }
    for (const [id, rig] of this.rigs) {
      if (!seen.has(id)) {
        this.scene.remove(rig.group);
        rig.dispose();
        this.rigs.delete(id);
      }
    }

    this.director.update(state, dt);
    this.arena.update(state, dt);
    this.lighting.update(state, dt);
    this.particles.update(state, dt);

    this.composer.render();
  }

  dispose(): void {
    this.arena.dispose();
    this.lighting.dispose();
    this.particles.dispose();
    for (const rig of this.rigs.values()) rig.dispose();
    this.rigs.clear();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
