import * as THREE from "three";
import type { RenderState, CameraRig } from "./types";
import type { Fighter } from "../types";

interface SphericalState {
  yaw: number;
  pitch: number;
  dist: number;
  target: THREE.Vector3;
}

interface ShakeState {
  x: number;
  y: number;
  intensity: number;
}

export class CameraDirector implements CameraRig {
  private camera: THREE.PerspectiveCamera;
  private sph: SphericalState;
  private shake: ShakeState;
  private usePOV: boolean = false;
  private povPosition: THREE.Vector3 = new THREE.Vector3();
  private povTarget: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.sph = {
      yaw: 0,
      pitch: 0.35,
      dist: 19,
      target: new THREE.Vector3(0, 0.9, 0),
    };
    this.shake = { x: 0, y: 0, intensity: 0 };
  }

  private getCentroid(fighters: Fighter[]): THREE.Vector3 {
    const active = fighters.filter((f) => !f.isKnoctout);
    if (active.length === 0) {
      // fallback: use all fighters or origin
      if (fighters.length === 0) return new THREE.Vector3(0, 0.9, 0);
      const sum = fighters.reduce(
        (acc, f) => {
          acc.x += f.pos.x;
          acc.y += f.pos.y;
          acc.z += f.pos.z;
          return acc;
        },
        { x: 0, y: 0, z: 0 }
      );
      return new THREE.Vector3(
        sum.x / fighters.length,
        sum.y / fighters.length + 0.9,
        sum.z / fighters.length
      );
    }
    const sum = active.reduce(
      (acc, f) => {
        acc.x += f.pos.x;
        acc.y += f.pos.y;
        acc.z += f.pos.z;
        return acc;
      },
      { x: 0, y: 0, z: 0 }
    );
    return new THREE.Vector3(
      sum.x / active.length,
      sum.y / active.length + 0.9,
      sum.z / active.length
    );
  }

  update(state: RenderState, dt: number): void {
    const t = state.timeMs;
    const lerpAlpha = Math.min(1, 0.05 * dt * 60);
    const mode = state.cameraMode;

    let targetYaw = this.sph.yaw;
    let targetPitch = this.sph.pitch;
    let targetDist = this.sph.dist;
    let targetPos = this.sph.target.clone();

    this.usePOV = false;

    if (mode === "RINGSIDE") {
      targetYaw = 0.5 * Math.sin(t * 1e-4);
      targetPitch = 0.35 + 0.1 * Math.cos(t * 1.5e-4);
      targetDist = 19;
      targetPos.set(0, 0.9, 0);
    } else if (mode === "CRADLE_ROTATING") {
      targetYaw = t * 8e-4;
      targetPitch = 0.35 + 0.15 * Math.sin(t * 1e-3);
      targetDist = 16;
      targetPos = this.getCentroid(state.fighters);
    } else if (mode === "CINEMATIC_FOLLOW") {
      targetYaw = t * 2e-4;
      targetPitch = 0.2 + 0.1 * Math.cos(t * 4e-4);
      targetDist = 12.5 + 1.5 * Math.sin(t * 1e-3);
      targetPos = this.getCentroid(state.fighters);
    } else if (
      mode === "FIGHTER_1_POV" ||
      mode === "FIGHTER_2_POV" ||
      mode === "FIGHTER_3_POV"
    ) {
      const carrierId =
        mode === "FIGHTER_1_POV" ? 1 : mode === "FIGHTER_2_POV" ? 2 : 3;
      const carrier = state.fighters.find((f) => f.id === carrierId);

      if (carrier && state.fighters.length > 0) {
        const others = state.fighters.filter((f) => f.id !== carrierId);
        let nearest: Fighter | null = null;
        let nearestDist = Infinity;

        for (const f of others) {
          const dx = f.pos.x - carrier.pos.x;
          const dz = f.pos.z - carrier.pos.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < nearestDist) {
            nearestDist = d;
            nearest = f;
          }
        }

        this.usePOV = true;

        const headY = carrier.pos.y + 1.5;
        const forwardOffsetDist = 0.2;

        if (nearest) {
          const dx = nearest.pos.x - carrier.pos.x;
          const dz = nearest.pos.z - carrier.pos.z;
          const lookAngle = Math.atan2(dx, dz);

          const camX =
            carrier.pos.x - Math.sin(lookAngle) * forwardOffsetDist;
          const camZ =
            carrier.pos.z - Math.cos(lookAngle) * forwardOffsetDist;

          this.povPosition.set(camX, headY, camZ);
          this.povTarget.set(
            nearest.pos.x,
            nearest.pos.y + 1.4,
            nearest.pos.z
          );
        } else {
          // No other fighter — look in carrier's facing direction
          const lookAngle = carrier.angleYaw;
          const lookDist = 4;
          this.povPosition.set(carrier.pos.x, headY, carrier.pos.z);
          this.povTarget.set(
            carrier.pos.x + Math.sin(lookAngle) * lookDist,
            carrier.pos.y + 1.4,
            carrier.pos.z + Math.cos(lookAngle) * lookDist
          );
        }
      } else {
        // Carrier not found — fallback to ringside
        targetYaw = 0;
        targetPitch = 0.35;
        targetDist = 19;
        targetPos.set(0, 0.9, 0);
      }
    }

    if (!this.usePOV) {
      // Lerp spherical state
      this.sph.yaw += (targetYaw - this.sph.yaw) * lerpAlpha;
      this.sph.pitch += (targetPitch - this.sph.pitch) * lerpAlpha;
      this.sph.dist += (targetDist - this.sph.dist) * lerpAlpha;
      this.sph.target.lerp(targetPos, lerpAlpha);

      const yaw = this.sph.yaw;
      const pitch = this.sph.pitch;
      const dist = this.sph.dist;
      const tgt = this.sph.target;

      const px = tgt.x + Math.sin(yaw) * Math.cos(pitch) * dist;
      const py = tgt.y + Math.sin(pitch) * dist;
      const pz = tgt.z + Math.cos(yaw) * Math.cos(pitch) * dist;

      this.camera.position.set(px, py, pz);
      this.camera.lookAt(tgt);
    } else {
      this.camera.position.copy(this.povPosition);
      this.camera.lookAt(this.povTarget);
    }

    // Apply and decay shake
    if (this.shake.intensity > 0.001) {
      const si = this.shake.intensity;
      this.shake.x = (Math.random() * 2 - 1) * si;
      this.shake.y = (Math.random() * 2 - 1) * si;
      this.camera.position.x += this.shake.x;
      this.camera.position.y += this.shake.y;
      this.shake.intensity *= Math.pow(0.88, dt * 60);
    } else {
      this.shake.intensity = 0;
    }
  }

  addShake(intensity: number): void {
    this.shake.intensity = Math.max(this.shake.intensity, intensity);
  }

  dispose(): void {
    // No resources to release
  }
}
