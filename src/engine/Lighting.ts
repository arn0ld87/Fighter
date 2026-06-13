import * as THREE from "three";
import { THEMES, WORLD, type ThemeKey, type RenderState, type SceneModule } from "./types";

export class Lighting implements SceneModule {
  readonly group: THREE.Object3D;

  private ambient: THREE.AmbientLight;
  private hemi: THREE.HemisphereLight;
  private mainSpot: THREE.SpotLight;
  private mainSpotTarget: THREE.Object3D;
  private accentLeft: THREE.SpotLight;
  private accentLeftTarget: THREE.Object3D;
  private accentRight: THREE.SpotLight;
  private accentRightTarget: THREE.Object3D;
  private pulseLight: THREE.PointLight;

  private bloomSphereMain: THREE.Mesh;
  private bloomSphereLeft: THREE.Mesh;
  private bloomSphereRight: THREE.Mesh;

  private currentPulse: number = 0;
  private currentTheme: ThemeKey;

  constructor(theme: ThemeKey) {
    this.group = new THREE.Group();
    this.currentTheme = theme;

    const preset = THEMES[theme];

    // Ambient
    this.ambient = new THREE.AmbientLight(preset.keyLight, preset.ambientIntensity);
    this.group.add(this.ambient);

    // Hemisphere fill
    this.hemi = new THREE.HemisphereLight(preset.keyLight, preset.floorOuter, 0.3);
    this.hemi.position.set(0, 10, 0);
    this.group.add(this.hemi);

    // Main SpotLight
    this.mainSpot = new THREE.SpotLight(preset.keyLight, 120);
    this.mainSpot.position.set(0, 12, 0);
    this.mainSpot.angle = 0.6;
    this.mainSpot.penumbra = 0.4;
    this.mainSpot.castShadow = true;
    this.mainSpot.shadow.mapSize.set(1024, 1024);
    this.mainSpot.shadow.camera.near = 1;
    this.mainSpot.shadow.camera.far = 40;
    this.mainSpot.shadow.bias = -0.0005;
    this.mainSpotTarget = new THREE.Object3D();
    this.mainSpotTarget.position.set(0, 1, 0);
    this.group.add(this.mainSpotTarget);
    this.mainSpot.target = this.mainSpotTarget;
    this.group.add(this.mainSpot);

    // Bloom emitter for main spot
    const bloomGeo = new THREE.SphereGeometry(0.12, 8, 8);
    this.bloomSphereMain = new THREE.Mesh(
      bloomGeo,
      new THREE.MeshBasicMaterial({ color: preset.keyLight })
    );
    this.bloomSphereMain.position.copy(this.mainSpot.position);
    this.group.add(this.bloomSphereMain);

    // Accent left
    const accentColorLeft = preset.accent;
    const accentColorRight = this._complementaryHue(preset.accent);

    this.accentLeft = new THREE.SpotLight(accentColorLeft, 60);
    this.accentLeft.position.set(-8, 7, 4);
    this.accentLeft.angle = 0.5;
    this.accentLeft.penumbra = 0.5;
    this.accentLeft.castShadow = false;
    this.accentLeftTarget = new THREE.Object3D();
    this.accentLeftTarget.position.set(0, 1, 0);
    this.group.add(this.accentLeftTarget);
    this.accentLeft.target = this.accentLeftTarget;
    this.group.add(this.accentLeft);

    this.bloomSphereLeft = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: accentColorLeft })
    );
    this.bloomSphereLeft.position.copy(this.accentLeft.position);
    this.group.add(this.bloomSphereLeft);

    // Accent right
    this.accentRight = new THREE.SpotLight(accentColorRight, 60);
    this.accentRight.position.set(8, 7, -4);
    this.accentRight.angle = 0.5;
    this.accentRight.penumbra = 0.5;
    this.accentRight.castShadow = false;
    this.accentRightTarget = new THREE.Object3D();
    this.accentRightTarget.position.set(0, 1, 0);
    this.group.add(this.accentRightTarget);
    this.accentRight.target = this.accentRightTarget;
    this.group.add(this.accentRight);

    this.bloomSphereRight = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: accentColorRight })
    );
    this.bloomSphereRight.position.copy(this.accentRight.position);
    this.group.add(this.bloomSphereRight);

    // Hit flash PointLight at center
    this.pulseLight = new THREE.PointLight(0xffffff, 0, 8, 2);
    this.pulseLight.position.set(0, 1.5, 0);
    this.group.add(this.pulseLight);
  }

  /** Rotate hue by 180 degrees in a simple RGB heuristic */
  private _complementaryHue(color: number): number {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    return (((255 - r) & 0xff) << 16) | (((255 - g) & 0xff) << 8) | ((255 - b) & 0xff);
  }

  setTheme(theme: ThemeKey): void {
    this.currentTheme = theme;
    const preset = THEMES[theme];

    this.ambient.color.setHex(preset.keyLight);
    this.ambient.intensity = preset.ambientIntensity;

    this.hemi.color.setHex(preset.keyLight);
    this.hemi.groundColor.setHex(preset.floorOuter);

    this.mainSpot.color.setHex(preset.keyLight);
    (this.bloomSphereMain.material as THREE.MeshBasicMaterial).color.setHex(preset.keyLight);

    const accentColorLeft = preset.accent;
    const accentColorRight = this._complementaryHue(preset.accent);

    this.accentLeft.color.setHex(accentColorLeft);
    (this.bloomSphereLeft.material as THREE.MeshBasicMaterial).color.setHex(accentColorLeft);

    this.accentRight.color.setHex(accentColorRight);
    (this.bloomSphereRight.material as THREE.MeshBasicMaterial).color.setHex(accentColorRight);
  }

  /** Spike the center hit-flash PointLight. Called by Renderer on impacts. */
  pulse(intensity: number): void {
    this.currentPulse = Math.max(this.currentPulse, intensity);
    this.pulseLight.intensity = this.currentPulse;
  }

  update(state: RenderState, dt: number): void {
    if (state.theme !== this.currentTheme) {
      this.setTheme(state.theme);
    }

    // Decay pulse toward 0
    if (this.currentPulse > 0) {
      this.currentPulse = Math.max(0, this.currentPulse - dt * 8);
      this.pulseLight.intensity = this.currentPulse;
    }

    // Subtle accent flicker using timeMs
    const t = state.timeMs * 0.001;
    const flickerL = 1.0 + 0.06 * Math.sin(t * 3.7 + 0.3);
    const flickerR = 1.0 + 0.06 * Math.sin(t * 4.1 + 1.9);
    this.accentLeft.intensity = 60 * flickerL;
    this.accentRight.intensity = 60 * flickerR;

    // Pulse the bloom sphere emissive scale slightly
    const pulseScale = 1.0 + this.currentPulse * 0.05;
    this.bloomSphereMain.scale.setScalar(pulseScale);
  }

  dispose(): void {
    this.ambient.dispose();
    this.hemi.dispose();
    this.mainSpot.dispose();
    this.accentLeft.dispose();
    this.accentRight.dispose();
    this.pulseLight.dispose();

    const disposeMesh = (mesh: THREE.Mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    };
    disposeMesh(this.bloomSphereMain);
    disposeMesh(this.bloomSphereLeft);
    disposeMesh(this.bloomSphereRight);
  }
}
