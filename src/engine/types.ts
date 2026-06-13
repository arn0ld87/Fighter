/**
 * Shared render contract for the Three.js engine.
 *
 * Every engine module depends ONLY on `three`, this file, and the app-level
 * `../types`. This keeps modules decoupled and independently buildable.
 */
import type * as THREE from "three";
import type { Fighter, Particle3D, CameraMode, Vector3D } from "../types";

export type ThemeKey = "neon_vegas" | "tokyo_sumo" | "siberian_cage" | "retro_cinematic";

/** Theme palette — single source of truth, consumed by Arena + Lighting. Colors are 0xRRGGBB. */
export interface ThemePreset {
  key: ThemeKey;
  bgInner: number;
  bgOuter: number;
  floorInner: number;
  floorOuter: number;
  /** Neon accent (ring ropes, cage glow, rim light). */
  accent: number;
  fogColor: number;
  /** THREE.FogExp2 density. */
  fogDensity: number;
  ambientIntensity: number;
  /** Key spotlight color. */
  keyLight: number;
}

/** Faithful port of the original 2D-canvas palettes (see docs/threejs-audio-overhaul.md §4). */
export const THEMES: Record<ThemeKey, ThemePreset> = {
  neon_vegas: {
    key: "neon_vegas",
    bgInner: 0x110b29, bgOuter: 0x05020c,
    floorInner: 0x191c2b, floorOuter: 0x0d0f17,
    accent: 0xff1e56, fogColor: 0x05020c, fogDensity: 0.018,
    ambientIntensity: 0.35, keyLight: 0xffffff,
  },
  tokyo_sumo: {
    key: "tokyo_sumo",
    bgInner: 0x1a120b, bgOuter: 0x070402,
    floorInner: 0x281f14, floorOuter: 0x17120c,
    accent: 0xf59e0b, fogColor: 0x070402, fogDensity: 0.018,
    ambientIntensity: 0.38, keyLight: 0xffe6c0,
  },
  siberian_cage: {
    key: "siberian_cage",
    bgInner: 0x0b151a, bgOuter: 0x020507,
    floorInner: 0x121a24, floorOuter: 0x090d12,
    accent: 0x0ea5e9, fogColor: 0x020507, fogDensity: 0.02,
    ambientIntensity: 0.32, keyLight: 0xd6f0ff,
  },
  retro_cinematic: {
    key: "retro_cinematic",
    bgInner: 0x161616, bgOuter: 0x0a0a0a,
    floorInner: 0x212121, floorOuter: 0x151515,
    accent: 0xa3a3a3, fogColor: 0x0a0a0a, fogDensity: 0.016,
    ambientIntensity: 0.4, keyLight: 0xffffff,
  },
};

/**
 * Immutable snapshot the React wrapper pushes into the renderer each frame.
 * `timeMs` is a monotonic clock — modules MUST use it instead of Date.now()
 * so animation timing stays consistent and testable.
 */
export interface RenderState {
  fighters: Fighter[];
  cameraMode: CameraMode;
  particles: Particle3D[];
  isSlowMotion: boolean;
  theme: ThemeKey;
  /** World-space hit location for this frame, or null. Triggers shockwave + bloom pulse. */
  impactLocation: Vector3D | null;
  gameTick: number;
  /** Monotonic milliseconds since renderer start. */
  timeMs: number;
}

/**
 * A scene sub-system owned by the Renderer. Implementations attach `group`
 * to the scene, mutate it in `update`, and free GPU resources in `dispose`.
 */
export interface SceneModule {
  /** Root object added to the scene by the Renderer. */
  readonly group: THREE.Object3D;
  /** Called once per animation frame. `dt` is delta-seconds (already slow-mo scaled). */
  update(state: RenderState, dt: number): void;
  /** Free geometries / materials / textures. */
  dispose(): void;
}

/** Maps each CameraMode to camera placement. Implemented by CameraDirector. */
export interface CameraRig {
  /** Position the camera for `state.cameraMode`, with smoothing. */
  update(state: RenderState, dt: number): void;
  /** Add transient screen shake (decays internally). */
  addShake(intensity: number): void;
}

/** World scale: 1 unit = 1 meter. Ring radius ~6m, crowd rings 7–11.5m. */
export const WORLD = {
  ringRadius: 6,
  floorY: 0,
  /** Crowd ring radii / seat counts / heights (faithful port). */
  crowdRings: [
    { radius: 7, seats: 45, height: 0.2 },
    { radius: 8.5, seats: 60, height: 0.4 },
    { radius: 10, seats: 75, height: 0.7 },
    { radius: 11.5, seats: 90, height: 1.1 },
  ],
} as const;

export type { Fighter, Particle3D, CameraMode, Vector3D };
