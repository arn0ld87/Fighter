import * as THREE from "three";
import type { Fighter, CombatMoveType } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capsule(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  mat: THREE.Material
): THREE.Mesh {
  const geo = new THREE.CapsuleGeometry(
    (radiusTop + radiusBottom) * 0.5,
    Math.max(height - radiusTop - radiusBottom, 0.01),
    6,
    12
  );
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  return m;
}

function sphere(r: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
  m.castShadow = true;
  return m;
}

function cylinder(
  rt: number,
  rb: number,
  h: number,
  segs: number,
  mat: THREE.Material
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, segs),
    mat
  );
  m.castShadow = true;
  return m;
}

function stdMat(
  color: number,
  opts: Partial<THREE.MeshStandardMaterialParameters> = {}
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...opts });
}

function hexToInt(hex: string): number {
  return parseInt(hex.replace(/^#/, ""), 16);
}

// ---------------------------------------------------------------------------
// Per-side arm rig
// ---------------------------------------------------------------------------

interface ArmRig {
  pivot: THREE.Object3D;  // shoulder pivot, child of torso
  upperArm: THREE.Mesh;
  forearmPivot: THREE.Object3D;
  forearm: THREE.Mesh;
  glove: THREE.Mesh;
}

// Per-side leg rig
interface LegRig {
  pivot: THREE.Object3D;  // hip pivot, child of hips
  upperLeg: THREE.Mesh;
  kneePivot: THREE.Object3D;
  lowerLeg: THREE.Mesh;
  shoe: THREE.Mesh;
}

// ---------------------------------------------------------------------------
// FighterRig
// ---------------------------------------------------------------------------

export class FighterRig {
  public group: THREE.Group;

  // limb pivots
  private leftArm!: ArmRig;
  private rightArm!: ArmRig;
  private leftLeg!: LegRig;
  private rightLeg!: LegRig;

  // body meshes for flash / tinting
  private bodyMeshes: THREE.Mesh[] = [];
  private flashDecay = 0;

  // structural refs
  private hipsPivot!: THREE.Object3D;
  private torsoPivot!: THREE.Object3D;
  private headPivot!: THREE.Object3D;
  private neckMesh!: THREE.Mesh;

  // materials to dispose
  private materials: THREE.Material[] = [];

  constructor(fighter: Fighter) {
    this.group = new THREE.Group();
    this.build(fighter);
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  private build(fighter: Fighter): void {
    const h = fighter.height;           // metres
    const w = fighter.weight;           // kg

    // --- proportional scaling ---
    // Weight factor 0..1 mapped from 70..145 kg
    const wf = Math.max(0, Math.min(1, (w - 70) / 75));

    const legLen    = h * 0.47;
    const torsoLen  = h * 0.32;
    const headR     = h * 0.11;
    const neckLen   = h * 0.04;

    const torsoW    = 0.28 + wf * 0.20;  // 0.28 (lean) .. 0.48 (huge)
    const torsoD    = 0.20 + wf * 0.14;
    const hipW      = torsoW * 0.88;

    const upperArmLen = h * 0.16;
    const foreArmLen  = h * 0.14;
    const gloveR      = 0.07 + w * 0.0002;

    const upperLegLen = legLen * 0.52;
    const lowerLegLen = legLen * 0.48;
    const legR        = 0.06 + wf * 0.04;
    const shoeLen     = 0.14;

    const skinInt   = hexToInt(fighter.skinColor);
    const shortsInt = hexToInt(fighter.shortsColor);
    const gloveCol  = 0xd41a1a;
    const shoeCol   = 0x1a1a1a;

    // ---- materials ----
    const skinMat   = stdMat(skinInt);
    const shortsMat = stdMat(shortsInt);
    const gloveMat  = stdMat(gloveCol, { roughness: 0.5 });
    const shoeMat   = stdMat(shoeCol);

    this.materials.push(skinMat, shortsMat, gloveMat, shoeMat);

    // =====================================================================
    // HIPS PIVOT  (y = legLen from ground)
    // =====================================================================
    this.hipsPivot = new THREE.Object3D();
    this.hipsPivot.position.y = legLen;
    this.group.add(this.hipsPivot);

    const hipsMesh = box(hipW, legLen * 0.12, torsoD * 0.9, shortsMat);
    this.hipsPivot.add(hipsMesh);
    this.bodyMeshes.push(hipsMesh);

    // =====================================================================
    // LEGS
    // =====================================================================
    const legOffsetX = hipW * 0.34;
    this.leftLeg  = this.buildLeg( legOffsetX, upperLegLen, lowerLegLen, legR, skinMat, shortsMat, shoeMat);
    this.rightLeg = this.buildLeg(-legOffsetX, upperLegLen, lowerLegLen, legR, skinMat, shortsMat, shoeMat);

    // =====================================================================
    // TORSO PIVOT  (y = torsoLen/2 above hips, local)
    // =====================================================================
    this.torsoPivot = new THREE.Object3D();
    this.torsoPivot.position.y = torsoLen * 0.5;
    this.hipsPivot.add(this.torsoPivot);

    const torsoMesh = box(torsoW, torsoLen, torsoD, skinMat);
    this.torsoPivot.add(torsoMesh);
    this.bodyMeshes.push(torsoMesh);

    // shorts overlay (upper thigh / waistband)
    const waistBand = box(torsoW * 0.92, torsoLen * 0.25, torsoD * 0.92, shortsMat);
    waistBand.position.y = -torsoLen * 0.38;
    this.torsoPivot.add(waistBand);
    this.bodyMeshes.push(waistBand);

    // =====================================================================
    // ARMS
    // =====================================================================
    const shoulderX = torsoW * 0.5 + 0.04;
    const shoulderY = torsoLen * 0.42;

    this.leftArm  = this.buildArm( shoulderX, shoulderY, upperArmLen, foreArmLen, gloveR, skinMat, gloveMat);
    this.rightArm = this.buildArm(-shoulderX, shoulderY, upperArmLen, foreArmLen, gloveR, skinMat, gloveMat);

    // =====================================================================
    // NECK + HEAD
    // =====================================================================
    this.headPivot = new THREE.Object3D();
    this.headPivot.position.y = torsoLen * 0.5 + neckLen;
    this.torsoPivot.add(this.headPivot);

    this.neckMesh = cylinder(headR * 0.38, headR * 0.42, neckLen, 8, skinMat);
    this.neckMesh.position.y = -neckLen * 0.5;
    this.headPivot.add(this.neckMesh);
    this.bodyMeshes.push(this.neckMesh);

    const headMesh = sphere(headR, skinMat);
    this.headPivot.add(headMesh);
    this.bodyMeshes.push(headMesh);

    // Eyes
    const eyeMat = stdMat(0x1a1a1a);
    this.materials.push(eyeMat);
    for (const ex of [-headR * 0.32, headR * 0.32]) {
      const eye = sphere(headR * 0.12, eyeMat);
      eye.position.set(ex, headR * 0.1, headR * 0.88);
      this.headPivot.add(eye);
    }

    // Brow
    const browMat = stdMat(hexToInt(fighter.skinColor) - 0x1a1a1a > 0 ? hexToInt(fighter.skinColor) - 0x0a0a0a : 0x442200);
    this.materials.push(browMat);
    const browL = box(headR * 0.28, headR * 0.06, headR * 0.07, browMat);
    browL.position.set(-headR * 0.32, headR * 0.27, headR * 0.88);
    this.headPivot.add(browL);
    const browR = box(headR * 0.28, headR * 0.06, headR * 0.07, browMat);
    browR.position.set( headR * 0.32, headR * 0.27, headR * 0.88);
    this.headPivot.add(browR);

    // =====================================================================
    // HAIR (fighter-specific)
    // =====================================================================
    this.buildHair(fighter, headR);

    // Store base hips Y for pose reset
    this._hipsBaseY = legLen;
  }

  // -------------------------------------------------------------------------
  // Leg builder
  // -------------------------------------------------------------------------

  private buildLeg(
    offsetX: number,
    upperLen: number,
    lowerLen: number,
    r: number,
    skinMat: THREE.MeshStandardMaterial,
    shortsMat: THREE.MeshStandardMaterial,
    shoeMat: THREE.MeshStandardMaterial
  ): LegRig {
    const pivot = new THREE.Object3D();
    pivot.position.set(offsetX, 0, 0);
    this.hipsPivot.add(pivot);

    // shorts on upper leg
    const upperLeg = cylinder(r * 0.92, r, upperLen, 8, shortsMat);
    upperLeg.position.y = -upperLen * 0.5;
    pivot.add(upperLeg);
    this.bodyMeshes.push(upperLeg);

    const kneePivot = new THREE.Object3D();
    kneePivot.position.y = -upperLen;
    pivot.add(kneePivot);

    const lowerLeg = cylinder(r * 0.72, r * 0.80, lowerLen, 8, skinMat);
    lowerLeg.position.y = -lowerLen * 0.5;
    kneePivot.add(lowerLeg);
    this.bodyMeshes.push(lowerLeg);

    const shoe = box(r * 1.6, r * 0.7, r * 2.4, shoeMat);
    shoe.position.set(0, -lowerLen - r * 0.35, r * 0.4);
    kneePivot.add(shoe);

    return { pivot, upperLeg, kneePivot, lowerLeg, shoe };
  }

  // -------------------------------------------------------------------------
  // Arm builder
  // -------------------------------------------------------------------------

  private buildArm(
    offsetX: number,
    offsetY: number,
    upperLen: number,
    foreArmLen: number,
    gloveR: number,
    skinMat: THREE.MeshStandardMaterial,
    gloveMat: THREE.MeshStandardMaterial
  ): ArmRig {
    const pivot = new THREE.Object3D();
    pivot.position.set(offsetX, offsetY, 0);
    this.torsoPivot.add(pivot);

    const upperArm = cylinder(upperLen * 0.16, upperLen * 0.18, upperLen, 8, skinMat);
    upperArm.position.y = -upperLen * 0.5;
    pivot.add(upperArm);
    this.bodyMeshes.push(upperArm);

    const forearmPivot = new THREE.Object3D();
    forearmPivot.position.y = -upperLen;
    pivot.add(forearmPivot);

    const forearm = cylinder(foreArmLen * 0.13, foreArmLen * 0.16, foreArmLen, 8, skinMat);
    forearm.position.y = -foreArmLen * 0.5;
    forearmPivot.add(forearm);
    this.bodyMeshes.push(forearm);

    const glove = sphere(gloveR, gloveMat);
    glove.position.y = -foreArmLen - gloveR * 0.6;
    forearmPivot.add(glove);
    this.bodyMeshes.push(glove);

    return { pivot, upperArm, forearmPivot, forearm, glove };
  }

  // -------------------------------------------------------------------------
  // Hair builder
  // -------------------------------------------------------------------------

  private buildHair(fighter: Fighter, headR: number): void {
    const style = fighter.hairStyle.toLowerCase();
    let hairMat: THREE.MeshStandardMaterial;

    if (style.includes("blond") || style.includes("swoosh")) {
      // Trump: blond side-swept slab on top-front
      hairMat = stdMat(0xf5d76e, { roughness: 0.9 });
      this.materials.push(hairMat);

      // main cap
      const cap = box(headR * 1.8, headR * 0.28, headR * 1.7, hairMat);
      cap.position.set(-headR * 0.08, headR * 0.82, -headR * 0.1);
      this.headPivot.add(cap);

      // swoosh slab angled front-right
      const swoosh = box(headR * 1.6, headR * 0.18, headR * 0.7, hairMat);
      swoosh.position.set(-headR * 0.1, headR * 0.72, headR * 0.55);
      swoosh.rotation.x = -0.25;
      this.headPivot.add(swoosh);

      // side puff
      const side = box(headR * 0.22, headR * 0.5, headR * 1.2, hairMat);
      side.position.set(headR * 0.84, headR * 0.35, 0);
      this.headPivot.add(side);

    } else if (style.includes("grey") || style.includes("shaved") || style.includes("steel")) {
      // Putin: short tight grey cap
      hairMat = stdMat(0x9ca3af, { roughness: 0.95 });
      this.materials.push(hairMat);

      const cap = sphere(headR * 1.02, hairMat);
      cap.scale.y = 0.35;
      cap.position.y = headR * 0.68;
      this.headPivot.add(cap);

      // subtle side parts
      const sideFill = box(headR * 1.7, headR * 0.15, headR * 1.4, hairMat);
      sideFill.position.y = headR * 0.68;
      this.headPivot.add(sideFill);

    } else if (style.includes("topknot") || style.includes("bun") || style.includes("black")) {
      // Kim: black topknot bun
      hairMat = stdMat(0x111111, { roughness: 0.85 });
      this.materials.push(hairMat);

      // thick base cap
      const cap = sphere(headR * 1.03, hairMat);
      cap.scale.y = 0.42;
      cap.position.y = headR * 0.62;
      this.headPivot.add(cap);

      // topknot stem
      const stem = cylinder(headR * 0.14, headR * 0.18, headR * 0.32, 8, hairMat);
      stem.position.y = headR * 0.98;
      this.headPivot.add(stem);

      // bun ball
      const bun = sphere(headR * 0.28, hairMat);
      bun.position.y = headR * 1.22;
      this.headPivot.add(bun);

    } else {
      // fallback dark cap
      hairMat = stdMat(0x222222, { roughness: 0.9 });
      this.materials.push(hairMat);
      const cap = sphere(headR * 1.02, hairMat);
      cap.scale.y = 0.4;
      cap.position.y = headR * 0.65;
      this.headPivot.add(cap);
    }
  }

  // -------------------------------------------------------------------------
  // Flash (hit indicator)
  // -------------------------------------------------------------------------

  public flash(): void {
    this.flashDecay = 1.0;
    for (const m of this.bodyMeshes) {
      (m.material as THREE.MeshStandardMaterial).emissive.setHex(0xff3300);
      (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0;
    }
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  public update(fighter: Fighter, dt: number, timeMs: number): void {
    // Guard
    if (!fighter || fighter.pos == null) return;
    const pos = fighter.pos;
    if (!isFinite(pos.x) || !isFinite(pos.y) || !isFinite(pos.z)) return;

    // Position & facing
    this.group.position.set(pos.x, 0, pos.z);
    this.group.rotation.y = fighter.angleYaw ?? 0;

    // Knockout collapse
    if (fighter.isKnoctout) {
      const target = Math.PI * 0.5;
      this.group.rotation.x = THREE.MathUtils.lerp(
        this.group.rotation.x,
        target,
        Math.min(dt * 3, 1)
      );
      return;
    } else {
      this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, 0, Math.min(dt * 8, 1));
    }

    // Flash decay
    if (this.flashDecay > 0) {
      this.flashDecay = Math.max(0, this.flashDecay - dt * 4);
      const ei = this.flashDecay;
      for (const m of this.bodyMeshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = ei;
        if (ei <= 0) mat.emissive.setHex(0x000000);
      }
    }

    // Pose
    const p = Math.max(0, Math.min(1, fighter.moveProgress ?? 0));
    this.applyPose(fighter.currentMove, p, timeMs);
  }

  // -------------------------------------------------------------------------
  // Pose
  // -------------------------------------------------------------------------

  private applyPose(move: CombatMoveType, p: number, timeMs: number): void {
    // Helpers
    const t = timeMs * 0.001;
    const sin = Math.sin;
    const lerp = THREE.MathUtils.lerp;

    // reset
    this.resetPose();

    switch (move) {
      case "IDLE": {
        const bob = sin(t * 8) * 0.04;
        this.hipsPivot.position.y += bob;
        this.leftArm.pivot.rotation.z  =  0.18 + sin(t * 1.2) * 0.02;
        this.rightArm.pivot.rotation.z = -0.18 + sin(t * 1.2 + 1) * 0.02;
        this.leftArm.pivot.rotation.x  = 0.12;
        this.rightArm.pivot.rotation.x = 0.12;
        break;
      }

      case "WALK": {
        const cycle = t * 5;
        // legs swing
        this.leftLeg.pivot.rotation.x  =  sin(cycle) * 0.30;
        this.rightLeg.pivot.rotation.x = -sin(cycle) * 0.30;
        this.leftLeg.kneePivot.rotation.x  = Math.max(0, sin(cycle + 0.8)) * 0.35;
        this.rightLeg.kneePivot.rotation.x = Math.max(0, sin(cycle - 0.8 + Math.PI)) * 0.35;
        // counter-swing arms
        this.leftArm.pivot.rotation.x  = -sin(cycle) * 0.20;
        this.rightArm.pivot.rotation.x =  sin(cycle) * 0.20;
        this.leftArm.pivot.rotation.z  =  0.15;
        this.rightArm.pivot.rotation.z = -0.15;
        break;
      }

      case "JAB": {
        // lead (left) arm jab
        const jabAngle = lerp(-0.2, -1.8, p);  // extend forward
        this.leftArm.pivot.rotation.x  = jabAngle;
        this.leftArm.forearmPivot.rotation.x = lerp(0.3, 0, p);
        this.rightArm.pivot.rotation.x = 0.2;
        this.rightArm.pivot.rotation.z = -0.25;
        // slight hip rotation into punch
        this.hipsPivot.rotation.y = lerp(0, -0.2, p);
        break;
      }

      case "HAYMAKER": {
        // rear (right) arm big hook
        const windUp = p < 0.4 ? -p / 0.4 : 0;
        const swing  = p >= 0.4 ? (p - 0.4) / 0.6 : 0;
        this.rightArm.pivot.rotation.z = lerp(-0.2, -1.2, p < 0.4 ? 0 : swing);
        this.rightArm.pivot.rotation.x = -0.8 + windUp * 0.6 - swing * 1.4;
        this.rightArm.forearmPivot.rotation.x = lerp(0.5, -0.2, p);
        this.hipsPivot.rotation.y = lerp(0, 0.35, p);
        this.torsoPivot.rotation.y = lerp(0, 0.4, p);
        break;
      }

      case "SUMO_SLAM": {
        // both arms overhead → slam down
        const up   = p < 0.5 ? p / 0.5 : 1;
        const down = p >= 0.5 ? (p - 0.5) / 0.5 : 0;
        const armUp = lerp(0, -Math.PI, up);
        const armDown = lerp(armUp, 0.8, down);
        this.leftArm.pivot.rotation.x  = armDown;
        this.rightArm.pivot.rotation.x = armDown;
        this.leftArm.pivot.rotation.z  =  0.3;
        this.rightArm.pivot.rotation.z = -0.3;
        // crouch & rise
        this.hipsPivot.position.y -= lerp(0, 0.12, sin(p * Math.PI));
        this.torsoPivot.rotation.x = lerp(0, 0.25, down);
        break;
      }

      case "JUDO_SWEEP": {
        // crouch + forward lean + low leg sweep
        this.hipsPivot.position.y -= lerp(0, 0.18, sin(p * Math.PI));
        this.torsoPivot.rotation.x = lerp(0, 0.5, p);
        // left leg sweeps back-outward
        this.leftLeg.pivot.rotation.x  =  lerp(0, -0.6, p);
        this.leftLeg.pivot.rotation.z  =  lerp(0,  0.4, p);
        this.leftLeg.kneePivot.rotation.x = lerp(0, -0.3, p);
        // arms: right forward grab
        this.rightArm.pivot.rotation.x = lerp(0.1, -0.9, p);
        this.leftArm.pivot.rotation.x  = lerp(0.1, -0.5, p);
        break;
      }

      case "BLOCK": {
        // both forearms raised to guard face
        this.leftArm.pivot.rotation.x  = -1.2;
        this.rightArm.pivot.rotation.x = -1.2;
        this.leftArm.pivot.rotation.z  =  0.35;
        this.rightArm.pivot.rotation.z = -0.35;
        this.leftArm.forearmPivot.rotation.x  = -0.6;
        this.rightArm.forearmPivot.rotation.x = -0.6;
        break;
      }

      case "DODGE": {
        // torso leans sideways (right dodge)
        const lean = sin(p * Math.PI) * 0.5;
        this.torsoPivot.rotation.z  = lean;
        this.headPivot.rotation.z   = -lean * 0.4;
        this.hipsPivot.position.y  -= lean * 0.06;
        break;
      }

      case "STUNNED": {
        const wobble = sin(t * 14) * (1 - p) * 0.18;
        this.headPivot.rotation.z  = wobble;
        this.torsoPivot.rotation.z = wobble * 0.5;
        this.hipsPivot.position.y -= (1 - p) * 0.06;
        break;
      }

      case "CELEBRATE": {
        const hop  = Math.abs(sin(t * 6)) * 0.12;
        const wave = sin(t * 8) * 0.4;
        this.hipsPivot.position.y += hop;
        this.leftArm.pivot.rotation.x  = -1.8 + wave;
        this.rightArm.pivot.rotation.x = -1.8 - wave;
        this.leftArm.pivot.rotation.z  =  0.5;
        this.rightArm.pivot.rotation.z = -0.5;
        this.leftArm.forearmPivot.rotation.x  = wave * 0.5;
        this.rightArm.forearmPivot.rotation.x = -wave * 0.5;
        break;
      }

      default:
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Reset pose to guard stance
  // -------------------------------------------------------------------------

  private resetPose(): void {
    // hips
    const h = this.hipsPivot as any;
    h.position.y = this.hipsBaseY;
    this.hipsPivot.rotation.set(0, 0, 0);
    this.torsoPivot.rotation.set(0, 0, 0);
    this.headPivot.rotation.set(0, 0, 0);

    for (const arm of [this.leftArm, this.rightArm]) {
      arm.pivot.rotation.set(0, 0, 0);
      arm.forearmPivot.rotation.set(0, 0, 0);
    }
    for (const leg of [this.leftLeg, this.rightLeg]) {
      leg.pivot.rotation.set(0, 0, 0);
      leg.kneePivot.rotation.set(0, 0, 0);
    }
  }

  // We need to store the base hips Y after build. Use a lazy getter.
  private get hipsBaseY(): number {
    return this._hipsBaseY;
  }
  private _hipsBaseY!: number;

  // -------------------------------------------------------------------------
  // Dispose
  // -------------------------------------------------------------------------

  public dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    for (const mat of this.materials) {
      mat.dispose();
    }
    this.materials.length = 0;
    this.bodyMeshes.length = 0;
  }
}
