import * as THREE from "three";
import { RenderState, SceneModule, ThemeKey, THEMES, WORLD } from "./types";

const TWO_PI = Math.PI * 2;

function octagonVertices(radius: number): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TWO_PI - Math.PI / 8;
    pts.push(new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius));
  }
  return pts;
}

export class Arena implements SceneModule {
  readonly group: THREE.Group;

  private floorMesh: THREE.Mesh;
  private rimMesh: THREE.Mesh;
  private backdropMesh: THREE.Mesh;
  private ropeMeshes: THREE.Mesh[] = [];
  private postMeshes: THREE.Mesh[] = [];
  private crowdInstances: { mesh: THREE.InstancedMesh; radius: number; seats: number; height: number }[] = [];
  private currentTheme: ThemeKey;

  // Shared geometries for dispose
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  constructor(theme: ThemeKey) {
    this.group = new THREE.Group();
    this.currentTheme = theme;

    const preset = THEMES[theme];

    // ── Octagon floor ───────────────────────────────────────────────────────
    const floorShape = new THREE.Shape(octagonVertices(WORLD.ringRadius));
    const floorGeo = new THREE.ShapeGeometry(floorShape, 1);
    // Rotate flat on XZ plane
    floorGeo.rotateX(-Math.PI / 2);
    this.geometries.push(floorGeo);

    const floorMat = new THREE.MeshStandardMaterial({
      color: preset.floorInner,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.materials.push(floorMat);

    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.y = WORLD.floorY;
    this.floorMesh.receiveShadow = true;
    this.group.add(this.floorMesh);

    // ── Emissive octagon rim ─────────────────────────────────────────────────
    const rimOuter = new THREE.Shape(octagonVertices(WORLD.ringRadius + 0.12));
    const rimHole = new THREE.Path(octagonVertices(WORLD.ringRadius - 0.0));
    rimOuter.holes.push(rimHole);
    const rimGeo = new THREE.ShapeGeometry(rimOuter, 1);
    rimGeo.rotateX(-Math.PI / 2);
    this.geometries.push(rimGeo);

    const rimMat = new THREE.MeshStandardMaterial({
      color: preset.accent,
      emissive: new THREE.Color(preset.accent),
      emissiveIntensity: 1.5,
      roughness: 0.3,
      metalness: 0.6,
    });
    this.materials.push(rimMat);

    this.rimMesh = new THREE.Mesh(rimGeo, rimMat);
    this.rimMesh.position.y = WORLD.floorY + 0.001;
    this.group.add(this.rimMesh);

    // ── Ring ropes (3 tori approximated as thin torus geometry) ──────────────
    const ropeHeights = [0.55, 0.95, 1.32];
    const ropeRadius = WORLD.ringRadius + 0.06;

    for (const rh of ropeHeights) {
      // Use a 16-segment CatmullRom for octagonal shape — simpler: use a TorusGeometry
      const ropeGeo = new THREE.TorusGeometry(ropeRadius, 0.025, 6, 64);
      ropeGeo.rotateX(Math.PI / 2);
      this.geometries.push(ropeGeo);

      const ropeMat = new THREE.MeshStandardMaterial({
        color: preset.accent,
        emissive: new THREE.Color(preset.accent),
        emissiveIntensity: 1.5,
        roughness: 0.25,
        metalness: 0.7,
      });
      this.materials.push(ropeMat);

      const ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
      ropeMesh.position.y = WORLD.floorY + rh;
      this.ropeMeshes.push(ropeMesh);
      this.group.add(ropeMesh);
    }

    // ── 8 corner posts ───────────────────────────────────────────────────────
    const postGeo = new THREE.CylinderGeometry(0.055, 0.055, ropeHeights[2] + 0.15, 8);
    this.geometries.push(postGeo);

    const postMat = new THREE.MeshStandardMaterial({
      color: preset.accent,
      emissive: new THREE.Color(preset.accent),
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.8,
    });
    this.materials.push(postMat);

    const postY = WORLD.floorY + (ropeHeights[2] + 0.15) / 2;
    const postVerts = octagonVertices(WORLD.ringRadius + 0.06);

    for (const v of postVerts) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(v.x, postY, v.y);
      post.castShadow = true;
      this.postMeshes.push(post);
      this.group.add(post);
    }

    // ── Backdrop disc ────────────────────────────────────────────────────────
    const backdropGeo = new THREE.CircleGeometry(40, 48);
    backdropGeo.rotateX(-Math.PI / 2);
    this.geometries.push(backdropGeo);

    const backdropMat = new THREE.MeshStandardMaterial({
      color: preset.floorOuter,
      roughness: 1.0,
      metalness: 0.0,
    });
    this.materials.push(backdropMat);

    this.backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
    this.backdropMesh.position.y = WORLD.floorY - 0.01;
    this.backdropMesh.receiveShadow = true;
    this.group.add(this.backdropMesh);

    // ── Crowd instanced meshes ───────────────────────────────────────────────
    this.buildCrowd();
  }

  private buildCrowd(): void {
    const seatGeo = new THREE.BoxGeometry(0.28, 0.38, 0.22);
    this.geometries.push(seatGeo);

    for (const ring of WORLD.crowdRings) {
      const seatMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        roughness: 0.9,
        metalness: 0.0,
      });
      this.materials.push(seatMat);

      const mesh = new THREE.InstancedMesh(seatGeo, seatMat, ring.seats);
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < ring.seats; i++) {
        const angle = (i / ring.seats) * TWO_PI;
        dummy.position.set(
          Math.cos(angle) * ring.radius,
          WORLD.floorY + ring.height,
          Math.sin(angle) * ring.radius
        );
        dummy.rotation.y = -angle + Math.PI / 2;
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      this.crowdInstances.push({ mesh, radius: ring.radius, seats: ring.seats, height: ring.height });
      this.group.add(mesh);
    }
  }

  setTheme(theme: ThemeKey): void {
    this.currentTheme = theme;
    const preset = THEMES[theme];

    (this.floorMesh.material as THREE.MeshStandardMaterial).color.setHex(preset.floorInner);
    (this.backdropMesh.material as THREE.MeshStandardMaterial).color.setHex(preset.floorOuter);

    const accentColor = new THREE.Color(preset.accent);

    (this.rimMesh.material as THREE.MeshStandardMaterial).color.set(accentColor);
    (this.rimMesh.material as THREE.MeshStandardMaterial).emissive.set(accentColor);

    for (const rope of this.ropeMeshes) {
      const mat = rope.material as THREE.MeshStandardMaterial;
      mat.color.set(accentColor);
      mat.emissive.set(accentColor);
    }
    for (const post of this.postMeshes) {
      const mat = post.material as THREE.MeshStandardMaterial;
      mat.color.set(accentColor);
      mat.emissive.set(accentColor);
    }
  }

  update(state: RenderState, _dt: number): void {
    if (this.crowdInstances.length === 0) return;

    const t = state.timeMs * 0.001; // seconds
    const dummy = new THREE.Object3D();
    const isExcited = state.fighters.some(
      (f) => f.currentMove !== "IDLE" && !f.isKnoctout
    );
    const bobAmplitude = isExcited ? 0.07 : 0.025;
    const bobSpeed = isExcited ? 2.8 : 1.2;

    for (const ring of this.crowdInstances) {
      let dirty = false;
      for (let i = 0; i < ring.seats; i++) {
        // Phase offset per seat for wave effect
        const phase = (i / ring.seats) * TWO_PI;
        const bob = Math.sin(t * bobSpeed + phase) * bobAmplitude;
        const angle = (i / ring.seats) * TWO_PI;
        dummy.position.set(
          Math.cos(angle) * ring.radius,
          WORLD.floorY + ring.height + bob,
          Math.sin(angle) * ring.radius
        );
        dummy.rotation.y = -angle + Math.PI / 2;
        dummy.updateMatrix();
        ring.mesh.setMatrixAt(i, dummy.matrix);
        dirty = true;
      }
      if (dirty) ring.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const geo of this.geometries) geo.dispose();
    for (const mat of this.materials) mat.dispose();
    this.geometries.length = 0;
    this.materials.length = 0;
    this.ropeMeshes.length = 0;
    this.postMeshes.length = 0;
    this.crowdInstances.length = 0;
  }
}
