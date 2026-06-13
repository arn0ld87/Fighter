import * as THREE from "three";
import type { RenderState, SceneModule } from "./types";
import type { Particle3D } from "../types";

const MAX_PARTICLES = 800;

type ParticleType = Particle3D["type"];

const TYPE_COLORS: Record<ParticleType, [number, number, number]> = {
  SPARK: [1.0, 0.824, 0.29],   // #ffd24a gold → white via life scale
  SWEAT: [0.804, 0.937, 0.992], // #cdeffd cyan-white
  DUST:  [0.604, 0.549, 0.478], // #9a8c7a grey
  BLOOD: [0.753, 0.141, 0.114], // #c0241d red
};

function buildSpriteTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export class Particles implements SceneModule {
  readonly group: THREE.Object3D;

  private readonly points: THREE.Points;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly sizeAttr: THREE.BufferAttribute;
  private readonly texture: THREE.Texture;

  constructor() {
    this.group = new THREE.Group();

    const geo = new THREE.BufferGeometry();

    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors    = new Float32Array(MAX_PARTICLES * 3);
    const sizes     = new Float32Array(MAX_PARTICLES);

    this.posAttr   = new THREE.BufferAttribute(positions, 3);
    this.colorAttr = new THREE.BufferAttribute(colors, 3);
    this.sizeAttr  = new THREE.BufferAttribute(sizes, 1);

    geo.setAttribute("position", this.posAttr);
    geo.setAttribute("color",    this.colorAttr);
    geo.setAttribute("size",     this.sizeAttr);

    this.texture = buildSpriteTexture();

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      map: this.texture,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      transparent: true,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    (this.group as THREE.Group).add(this.points);
  }

  update(state: RenderState, _dt: number): void {
    const particles = state.particles;
    const posArr   = this.posAttr.array as Float32Array;
    const colorArr = this.colorAttr.array as Float32Array;
    const sizeArr  = this.sizeAttr.array as Float32Array;

    const count = Math.min(particles.length, MAX_PARTICLES);

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const i3 = i * 3;
      const lifeFrac = p.maxLife > 0 ? Math.max(0, p.life / p.maxLife) : 0;

      posArr[i3]     = isFinite(p.pos.x) ? p.pos.x : 0;
      posArr[i3 + 1] = isFinite(p.pos.y) ? p.pos.y : 0;
      posArr[i3 + 2] = isFinite(p.pos.z) ? p.pos.z : 0;

      const [r, g, b] = TYPE_COLORS[p.type] ?? TYPE_COLORS.DUST;
      // Lerp toward white for SPARK at high life; scale all by lifeFrac
      let fr = r, fg = g, fb = b;
      if (p.type === "SPARK") {
        fr = r + (1 - r) * (1 - lifeFrac);
        fg = g + (1 - g) * (1 - lifeFrac);
        fb = b + (1 - b) * (1 - lifeFrac);
      }
      colorArr[i3]     = fr * lifeFrac;
      colorArr[i3 + 1] = fg * lifeFrac;
      colorArr[i3 + 2] = fb * lifeFrac;

      sizeArr[i] = Math.max(0, p.size * lifeFrac);
    }

    // Zero out unused slots so they vanish
    for (let i = count; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      posArr[i3] = 0; posArr[i3 + 1] = -9999; posArr[i3 + 2] = 0;
      colorArr[i3] = 0; colorArr[i3 + 1] = 0; colorArr[i3 + 2] = 0;
      sizeArr[i] = 0;
    }

    this.posAttr.needsUpdate   = true;
    this.colorAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate  = true;
  }

  dispose(): void {
    (this.points.geometry as THREE.BufferGeometry).dispose();
    (this.points.material as THREE.Material).dispose();
    this.texture.dispose();
  }
}
