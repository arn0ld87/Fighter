import React, { useRef, useEffect, useState } from "react";
import { Fighter, Vector3D, Particle3D, CameraMode } from "../types";

interface StadiumCanvasProps {
  fighters: Fighter[];
  cameraMode: CameraMode;
  particles: Particle3D[];
  setParticles: React.Dispatch<React.SetStateAction<Particle3D[]>>;
  isSlowMotion: boolean;
  arenaTheme: "neon_vegas" | "tokyo_sumo" | "siberian_cage" | "retro_cinematic";
  impactLocation: Vector3D | null;
  clearImpact: () => void;
  gameTick: number;
}

export const StadiumCanvas: React.FC<StadiumCanvasProps> = ({
  fighters,
  cameraMode,
  particles,
  setParticles,
  isSlowMotion,
  arenaTheme,
  impactLocation,
  clearImpact,
  gameTick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Camera parameters for interpolation (smooth movement)
  const animCamYaw = useRef(0);
  const animCamPitch = useRef(0.2);
  const animCamZoom = useRef(140);
  const animCamTarget = useRef<Vector3D>({ x: 0, y: 0.8, z: 0 });
  const shakeIntensity = useRef(0);

  // Set up dimensions and resize observer
  const [dimensions, setDimensions] = useState({ width: 800, height: 480 });

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 240),
          height: Math.max(height, 240)
        });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Set up particles effect and critical hit shake when impactLocation changes
  useEffect(() => {
    if (impactLocation) {
      shakeIntensity.current = 15; // Set strong shaking
      // Spawn sweat/spray particles in 3D
      const newParticles: Particle3D[] = [];
      const colors = ["#ffffff", "#ffd700", "#ff4500", "#ffa500"];
      for (let i = 0; i < 35; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        const upSpeed = 1 + Math.random() * 4;
        newParticles.push({
          pos: { ...impactLocation },
          vel: {
            x: Math.cos(angle) * speed,
            y: upSpeed,
            z: Math.sin(angle) * speed
          },
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 1.5 + Math.random() * 3,
          life: 1.0,
          maxLife: 25 + Math.random() * 35,
          type: Math.random() > 0.8 ? "SPARK" : "SWEAT"
        });
      }
      setParticles(prev => [...prev, ...newParticles].slice(-150)); // limit particle count
      setTimeout(() => {
        clearImpact();
      }, 100);
    }
  }, [impactLocation, clearImpact, setParticles]);

  // Main game loop logic for canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;

    // Define 3D projection mathematical core
    const fov = 8800; // Focal length

    const project3D = (point: Vector3D, yaw: number, pitch: number, zoom: number, camTarget: Vector3D) => {
      // 1. Translate point relative to camera target (focal point)
      const tx = point.x - camTarget.x;
      const ty = point.y - camTarget.y;
      const tz = point.z - camTarget.z;

      // 2. Rotate around Y-axis (Yaw)
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const r1x = tx * cosY - tz * sinY;
      const r1z = tx * sinY + tz * cosY;

      // 3. Rotate around X-axis (Pitch)
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const r2y = ty * cosP - r1z * sinP;
      const r2z = ty * sinP + r1z * cosP;

      // 4. Translate back along Z to match zoom distance
      const finalZ = r2z + zoom;

      // 5. Avoid divide-by-zero or backward projection
      if (finalZ <= 5) return null;

      // 6. Perspective division (Project to 2D)
      const scale = fov / finalZ;
      const screenX = dimensions.width / 2 + r1x * scale;
      const screenY = dimensions.height / 2 + r2y * scale;

      return {
        x: screenX,
        y: screenY,
        depth: finalZ,
        scale: scale
      };
    };

    const updateAndDraw = () => {
      // Clear with background color depending on theme
      let bgGrad = ctx.createRadialGradient(
        dimensions.width / 2, dimensions.height / 2, 50,
        dimensions.width / 2, dimensions.height / 2, dimensions.width
      );

      if (arenaTheme === "neon_vegas") {
        bgGrad.addColorStop(0, "#110b29");
        bgGrad.addColorStop(1, "#05020c");
      } else if (arenaTheme === "tokyo_sumo") {
        bgGrad.addColorStop(0, "#1a120b");
        bgGrad.addColorStop(1, "#070402");
      } else if (arenaTheme === "siberian_cage") {
        bgGrad.addColorStop(0, "#0b151a");
        bgGrad.addColorStop(1, "#020507");
      } else {
        bgGrad.addColorStop(0, "#161616");
        bgGrad.addColorStop(1, "#0a0a0a");
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // --- 1. Compute Dynamic Camera Position and Interpolate ---
      let targetYaw = animCamYaw.current;
      let targetPitch = animCamPitch.current;
      let targetZoom = animCamZoom.current;
      let targetCenter: Vector3D = { x: 0, y: 0.6, z: 0 };

      // Calculate centroid of active fighters to focus camera
      const activeFighters = fighters.filter(f => !f.isKnoctout);
      if (activeFighters.length > 0) {
        const sum = activeFighters.reduce((acc, f) => {
          acc.x += f.pos.x;
          acc.y += f.pos.y;
          acc.z += f.pos.z;
          return acc;
        }, { x: 0, y: 0, z: 0 });
        targetCenter = {
          x: sum.x / activeFighters.length,
          y: 0.7,
          z: sum.z / activeFighters.length
        };
      }

      // Handle Camera Modes
      if (cameraMode === "RINGSIDE") {
        targetYaw = 0.5 * Math.sin(Date.now() * 0.0001);
        targetPitch = 0.35 + 0.1 * Math.cos(Date.now() * 0.00015);
        targetZoom = 190;
        targetCenter = { x: 0, y: 0.5, z: 0 };
      } else if (cameraMode === "CRADLE_ROTATING") {
        targetYaw = Date.now() * 0.0008;
        targetPitch = 0.35 + 0.15 * Math.sin(Date.now() * 0.001);
        targetZoom = 160;
      } else if (cameraMode === "CINEMATIC_FOLLOW") {
        targetYaw = Date.now() * 0.0002;
        targetPitch = 0.2 + 0.1 * Math.cos(Date.now() * 0.0004);
        targetZoom = 125 + Math.sin(Date.now() * 0.001) * 15;
      } else {
        // Individual Fighter Pov modes
        let carrierId = 1;
        if (cameraMode === "FIGHTER_1_POV") carrierId = 1;
        if (cameraMode === "FIGHTER_2_POV") carrierId = 2;
        if (cameraMode === "FIGHTER_3_POV") carrierId = 3;

        const pFighter = fighters.find(f => f.id === carrierId);
        if (pFighter) {
          // Camera is positioned at fighter's head, looking at the other nearest opponent
          const others = fighters.filter(f => f.id !== carrierId);
          _calculateOthersToLookAt(pFighter, others);
        }
        
        function _calculateOthersToLookAt(pFighter: Fighter, others: Fighter[]) {
          let closest = others[0];
          if (others[1] && getDist(pFighter.pos, others[1].pos) < getDist(pFighter.pos, closest.pos)) {
            closest = others[1];
          }
          targetCenter = { ...closest.pos, y: 0.8 };
          // Camera position slightly behind or in the head of fighter
          const dx = closest.pos.x - pFighter.pos.x;
          const dz = closest.pos.z - pFighter.pos.z;
          const lookAngle = Math.atan2(dx, dz);
          
          targetYaw = -lookAngle + Math.PI;
          targetPitch = 0.15;
          targetZoom = 100;
          // Offset back slightly to look cinematic
          animCamTarget.current = {
            x: pFighter.pos.x - Math.sin(lookAngle) * 0.8,
            y: 0.95,
            z: pFighter.pos.z - Math.cos(lookAngle) * 0.8
          };
        }
      }

      function getDist(p1: Vector3D, p2: Vector3D) {
        return Math.sqrt((p1.x - p2.x) ** 2 + (p1.z - p2.z) ** 2);
      }

      // Smoothly interpolate camera
      if (!cameraMode.includes("POV")) {
        animCamTarget.current.x += (targetCenter.x - animCamTarget.current.x) * 0.06;
        animCamTarget.current.y += (targetCenter.y - animCamTarget.current.y) * 0.06;
        animCamTarget.current.z += (targetCenter.z - animCamTarget.current.z) * 0.06;
      }
      animCamYaw.current += (targetYaw - animCamYaw.current) * 0.05;
      animCamPitch.current += (targetPitch - animCamPitch.current) * 0.05;
      animCamZoom.current += (targetZoom - animCamZoom.current) * 0.05;

      // Handle screen shake decay
      let camShakeX = 0;
      let camShakeY = 0;
      if (shakeIntensity.current > 0.1) {
        camShakeX = (Math.random() - 0.5) * shakeIntensity.current;
        camShakeY = (Math.random() - 0.5) * shakeIntensity.current;
        shakeIntensity.current *= 0.88; // decay
      }

      ctx.save();
      ctx.translate(camShakeX, camShakeY);

      const yaw = animCamYaw.current;
      const pitch = animCamPitch.current;
      const zoom = animCamZoom.current;
      const camTarget = animCamTarget.current;

      // --- 2. Draw Sports Arena Background details (Spotlights, Stadium Crowd) ---
      // Draw grid ring of spectator seats
      ctx.globalAlpha = 0.12;
      const drawCrowdRing = (radius: number, seats: number, ringHeight: number, col: string) => {
        ctx.fillStyle = col;
        for (let i = 0; i < seats; i++) {
          const mAngle = (i / seats) * Math.PI * 2;
          const pos = {
            x: Math.cos(mAngle) * radius,
            y: ringHeight,
            z: Math.sin(mAngle) * radius
          };
          const proj = project3D(pos, yaw, pitch, zoom, camTarget);
          if (proj) {
            const size = proj.scale * 0.13;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };

      drawCrowdRing(7, 45, 0.2, "#888");
      drawCrowdRing(8.5, 60, 0.4, "#666");
      drawCrowdRing(10, 75, 0.7, "#444");
      drawCrowdRing(11.5, 90, 1.1, "#333");

      ctx.globalAlpha = 1.0;

      // Draw Volumetric spotlight pillars
      const drawVolumetricSpotlights = () => {
        const spots = [
          { x: -5, y: -2.5, z: -5, col: "rgba(255,100,100,0.12)" },
          { x: 5, y: -2.5, z: -5, col: "rgba(100,150,255,0.12)" },
          { x: -5, y: -2.5, z: 5, col: "rgba(255,200,80,0.12)" },
          { x: 5, y: -2.5, z: 5, col: "rgba(100,255,150,0.12)" }
        ];

        spots.forEach((spot) => {
          const sourceProj = project3D(spot, yaw, pitch, zoom, camTarget);
          // light shines down to ring center (0, y_floor, 0)
          const targetFloor = { x: spot.x * 0.3, y: 0, z: spot.z * 0.3 };
          const targetProj = project3D(targetFloor, yaw, pitch, zoom, camTarget);

          if (sourceProj && targetProj) {
            // Draw gradient cone for spotlight
            ctx.save();
            const grad = ctx.createLinearGradient(sourceProj.x, sourceProj.y, targetProj.x, targetProj.y);
            grad.addColorStop(0, spot.col.replace("0.12", "0.4"));
            grad.addColorStop(0.5, spot.col);
            grad.addColorStop(1, "rgba(0,0,0,0)");

            ctx.fillStyle = grad;
            ctx.beginPath();
            
            // width of flashlight cone
            const widthTop = sourceProj.scale * 0.3;
            const widthBottom = targetProj.scale * 1.5;
            
            const dx = targetProj.x - sourceProj.x;
            const dy = targetProj.y - sourceProj.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            const nx = -dy / len;
            const ny = dx / len;

            ctx.moveTo(sourceProj.x - nx * widthTop, sourceProj.y - ny * widthTop);
            ctx.lineTo(sourceProj.x + nx * widthTop, sourceProj.y + ny * widthTop);
            ctx.lineTo(targetProj.x + nx * widthBottom, targetProj.y + ny * widthBottom);
            ctx.lineTo(targetProj.x - nx * widthBottom, targetProj.y - ny * widthBottom);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Draw spotlight physical bulb flare
            ctx.beginPath();
            const flareRad = sourceProj.scale * 0.4;
            let flareGrad = ctx.createRadialGradient(sourceProj.x, sourceProj.y, 2, sourceProj.x, sourceProj.y, flareRad);
            flareGrad.addColorStop(0, "#ffffff");
            flareGrad.addColorStop(0.3, spot.col.replace("0.12", "0.8"));
            flareGrad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = flareGrad;
            ctx.arc(sourceProj.x, sourceProj.y, flareRad, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      };

      drawVolumetricSpotlights();

      // --- 3. Draw Octagon Ring Floor in 3D Perspective ---
      const octagonVertices: Vector3D[] = [];
      const cageTopVertices: Vector3D[] = [];
      const radius = 3.5;
      const cageHeight = 1.2;

      for (let i = 0; i < 8; i++) {
        const mAngle = (i / 8) * Math.PI * 2;
        octagonVertices.push({
          x: Math.cos(mAngle) * radius,
          y: 0, // floor level
          z: Math.sin(mAngle) * radius
        });

        cageTopVertices.push({
          x: Math.cos(mAngle) * radius,
          y: -cageHeight, // top level
          z: Math.sin(mAngle) * radius
        });
      }

      // Project floor and cage top
      const projFloor = octagonVertices.map(v => project3D(v, yaw, pitch, zoom, camTarget));
      const projCageTop = cageTopVertices.map(v => project3D(v, yaw, pitch, zoom, camTarget));

      // Draw ring mats (Octagon polygon fill)
      if (projFloor.every(v => v !== null)) {
        ctx.beginPath();
        ctx.moveTo(projFloor[0]!.x, projFloor[0]!.y);
        for (let i = 1; i < 8; i++) {
          ctx.lineTo(projFloor[i]!.x, projFloor[i]!.y);
        }
        ctx.closePath();
        
        // Floor gradient style
        let ringGrad = ctx.createRadialGradient(
          dimensions.width / 2, dimensions.height / 2 + 80, 20,
          dimensions.width / 2, dimensions.height / 2 + 120, dimensions.width * 0.4
        );
        
        if (arenaTheme === "neon_vegas") {
          ringGrad.addColorStop(0, "#191c2b");
          ringGrad.addColorStop(1, "#0d0f17");
          ctx.strokeStyle = "rgba(255, 30, 86, 0.4)";
        } else if (arenaTheme === "tokyo_sumo") {
          ringGrad.addColorStop(0, "#281f14");
          ringGrad.addColorStop(1, "#17120c");
          ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        } else if (arenaTheme === "siberian_cage") {
          ringGrad.addColorStop(0, "#121a24");
          ringGrad.addColorStop(1, "#090d12");
          ctx.strokeStyle = "rgba(14, 165, 233, 0.4)";
        } else {
          ringGrad.addColorStop(0, "#212121");
          ringGrad.addColorStop(1, "#151515");
          ctx.strokeStyle = "rgba(163, 163, 163, 0.3)";
        }

        ctx.fillStyle = ringGrad;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.stroke();

        // Draw dynamic Octagon floor graphics / lines
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Inner radius boundary
        const innerRad = 1.8;
        let pPrev = project3D({ x: Math.cos(0)*innerRad, y: 0, z: Math.sin(0)*innerRad }, yaw, pitch, zoom, camTarget);
        if (pPrev) {
          ctx.moveTo(pPrev.x, pPrev.y);
          for (let i = 1; i <= 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const pNext = project3D({ x: Math.cos(angle)*innerRad, y: 0, z: Math.sin(angle)*innerRad }, yaw, pitch, zoom, camTarget);
            if (pNext) {
              ctx.lineTo(pNext.x, pNext.y);
            }
          }
          ctx.stroke();
        }

        // Broadcaster Text inside Octagon
        const logoProj = project3D({ x: 0, y: 0, z: 0 }, yaw, pitch, zoom, camTarget);
        if (logoProj) {
          ctx.save();
          // Scale text based on 3D distance
          const fontSize = Math.max(9, Math.floor(logoProj.scale * 0.17));
          ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("TRIPLE THREAT CHAMPIONSHIP", logoProj.x, logoProj.y);
          ctx.restore();
        }
      }

      // Draw Back Fence Cage Walls (We draw walls further in distance first, then fighters, then foreground walls!)
      // Sort cage panels by depth (z value) so 3D occlusion is correct!
      const wallPanels = [];
      for (let i = 0; i < 8; i++) {
        const nextIdx = (i + 1) % 8;
        const v1 = octagonVertices[i];
        const v2 = octagonVertices[nextIdx];
        const t1 = cageTopVertices[i];
        const t2 = cageTopVertices[nextIdx];
        
        // Midpoint of panel to determine depth
        const midZ = (v1.z + v2.z) / 2;
        wallPanels.push({ idx: i, v1, v2, t1, t2, midZ });
      }

      // Sort further away first (higher z in camera system means further)
      // Camera relative depth calculation:
      const getCamDepth = (point: Vector3D) => {
        const tx = point.x - camTarget.x;
        const ty = point.y - camTarget.y;
        const tz = point.z - camTarget.z;
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        return tx * sinY + tz * cosY + zoom;
      };

      wallPanels.forEach(p => {
        p.midZ = (getCamDepth(p.v1) + getCamDepth(p.v2)) / 2;
      });

      // Split wall panels into Background (furthest away) and Foreground (closer than focal camera pitch)
      const sortedWalls = [...wallPanels].sort((a, b) => b.midZ - a.midZ);
      const halfCount = 4; // Further half
      const bgWalls = sortedWalls.slice(0, halfCount);
      const fgWalls = sortedWalls.slice(halfCount);

      // Helper to draw a single 3D Fence Panel mesh
      const drawFencePanel = (w: typeof wallPanels[0], isForeground: boolean) => {
        const p1 = project3D(w.v1, yaw, pitch, zoom, camTarget);
        const p2 = project3D(w.v2, yaw, pitch, zoom, camTarget);
        const pt1 = project3D(w.t1, yaw, pitch, zoom, camTarget);
        const pt2 = project3D(w.t2, yaw, pitch, zoom, camTarget);

        if (p1 && p2 && pt1 && pt2) {
          ctx.save();
          // Render mesh net grid wireframe
          ctx.strokeStyle = isForeground ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.18)";
          ctx.lineWidth = isForeground ? 1 : 2;
          
          ctx.beginPath();
          // Draw fence panel boundary outer contour
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.lineTo(pt1.x, pt1.y);
          ctx.closePath();
          ctx.stroke();

          // Draw vertical cage bars
          const divisions = 6;
          for (let j = 1; j < divisions; j++) {
            const ratio = j / divisions;
            const bottomPt = {
              x: w.v1.x * (1 - ratio) + w.v2.x * ratio,
              y: 0,
              z: w.v1.z * (1 - ratio) + w.v2.z * ratio
            };
            const topPt = {
              x: w.t1.x * (1 - ratio) + w.t2.x * ratio,
              y: -cageHeight,
              z: w.t1.z * (1 - ratio) + w.t2.z * ratio
            };
            const pBot = project3D(bottomPt, yaw, pitch, zoom, camTarget);
            const pTop = project3D(topPt, yaw, pitch, zoom, camTarget);
            if (pBot && pTop) {
              ctx.beginPath();
              ctx.moveTo(pBot.x, pBot.y);
              ctx.lineTo(pTop.x, pTop.y);
              ctx.stroke();
            }
          }

          // Thick frame pillars at the edges of the Octagon panels
          ctx.strokeStyle = isForeground ? "rgba(100,100,110,0.4)" : "rgba(180,180,190,0.8)";
          ctx.lineWidth = isForeground ? 3 : 5;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(pt1.x, pt1.y);
          ctx.stroke();

          // Spot light bulbs attached on top of main pillars
          ctx.fillStyle = "#ffe4b5";
          ctx.beginPath();
          ctx.arc(pt1.x, pt1.y, pt1.scale * 0.08, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      };

      // Draw background cage panels first
      bgWalls.forEach(w => drawFencePanel(w, false));

      // --- 4. Draw Impact Ground Shockwave Flares ---
      if (impactLocation) {
        // Draw expanding energy circles
        const impProj = project3D(impactLocation, yaw, pitch, zoom, camTarget);
        if (impProj) {
          ctx.save();
          ctx.globalAlpha = 0.55;
          const strikeRad = impProj.scale * 0.8;
          let crashGrad = ctx.createRadialGradient(impProj.x, impProj.y, 2, impProj.x, impProj.y, strikeRad);
          crashGrad.addColorStop(0, "rgba(255, 235, 100, 0.9)");
          crashGrad.addColorStop(0.4, "rgba(255, 80, 0, 0.6)");
          crashGrad.addColorStop(1, "rgba(255, 0, 0, 0)");
          
          ctx.fillStyle = crashGrad;
          ctx.beginPath();
          ctx.arc(impProj.x, impProj.y, strikeRad, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // --- 5. Draw 3D Fighters (Skeletal joint animation + Volumes) ---
      // Sort fighters by camera depth to avoid layered draws glitching
      const sortedFighters = [...fighters].map(f => {
        const depth = getCamDepth(f.pos);
        return { fighter: f, depth };
      }).sort((a, b) => b.depth - a.depth); // Deepest first

      sortedFighters.forEach(({ fighter: f }) => {
        if (f.isKnoctout && f.hp <= 0 && f.currentMove !== "STUNNED" && f.currentMove !== "CELEBRATE") {
          // Lie flat on ring floor if completely KO'd
          f.pos.y = 0.05;
        }

        // 1. Shadow beneath fighter
        const shadowProj = project3D({ ...f.pos, y: 0.01 }, yaw, pitch, zoom, camTarget);
        if (shadowProj) {
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = "#000000";
          ctx.beginPath();
          // Scale size of shadow based on weight of fighter
          const sRadius = (f.weight / 70) * shadowProj.scale * 0.25;
          ctx.ellipse(shadowProj.x, shadowProj.y, sRadius, sRadius * 0.45, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
        }

        // Calculate procedural motion joint vectors
        const progress = f.moveProgress;
        const isAttacking = ["JAB", "HAYMAKER", "SUMO_SLAM", "JUDO_SWEEP"].includes(f.currentMove);

        // Procedural joint offset computation depending on move
        let localHipsY = -0.7; // default athletics stance center height
        let rHandExt = 0;
        let lHandExt = 0;
        let limbYOffset = 0;
        let spineTiltZ = 0;
        let spineTiltX = 0;
        let headShakeY = 0;
        let legSweepAngle = 0;

        if (f.currentMove === "JAB") {
          // Extends left hand rapidly
          lHandExt = Math.sin(progress * Math.PI) * 0.45;
          spineTiltZ = -0.15 * Math.sin(progress * Math.PI);
        } else if (f.currentMove === "HAYMAKER") {
          // Swing right hand wide
          rHandExt = Math.sin(progress * Math.PI) * 0.65;
          spineTiltZ = 0.25 * Math.sin(progress * Math.PI);
          spineTiltX = 0.15 * Math.sin(progress * Math.PI);
        } else if (f.currentMove === "SUMO_SLAM") {
          // Jump up high, slam down!
          const jumpHeight = -1.2 * Math.sin(progress * Math.PI);
          localHipsY = -0.7 + jumpHeight;
          spineTiltX = 0.35 * Math.sin(progress * Math.PI);
          rHandExt = 0.3 * Math.sin(progress * Math.PI);
          lHandExt = 0.3 * Math.sin(progress * Math.PI);
        } else if (f.currentMove === "JUDO_SWEEP") {
          // Low stance body, circular leg spin
          localHipsY = -0.3; // ducking down
          legSweepAngle = progress * Math.PI * 2;
          spineTiltX = 0.2;
        } else if (f.currentMove === "BLOCK") {
          // Arms tucked close in front of face
          rHandExt = -0.1;
          lHandExt = -0.1;
          spineTiltX = 0.1;
        } else if (f.currentMove === "DODGE") {
          // Backward leap lean
          spineTiltX = -0.4;
          localHipsY = -0.75;
        } else if (f.currentMove === "STUNNED") {
          // Dazed wobbly
          localHipsY = -0.7 + Math.sin(Date.now() * 0.008) * 0.04;
          spineTiltZ = 0.18 * Math.cos(Date.now() * 0.006);
          spineTiltX = -0.1 * Math.sin(Date.now() * 0.007);
          headShakeY = 0.15 * Math.sin(Date.now() * 0.025);
        } else if (f.currentMove === "CELEBRATE") {
          // Hands in air, jumping bob
          localHipsY = -0.8 - Math.abs(Math.sin(Date.now() * 0.01)) * 0.3;
          rHandExt = 0.2;
          lHandExt = 0.2;
          spineTiltZ = 0.1 * Math.sin(Date.now() * 0.015);
        } else if (f.currentMove === "WALK") {
          // Walk bob
          localHipsY = -0.7 + Math.sin(Date.now() * 0.012) * 0.05;
          limbYOffset = 0.12 * Math.sin(Date.now() * 0.015);
        } else {
          // IDLE elastic bouncing boxing rhythm
          localHipsY = -0.7 + Math.sin(Date.now() * 0.005) * 0.03;
          limbYOffset = 0.04 * Math.sin(Date.now() * 0.008);
        }

        // Knockout flat override
        if (f.isKnoctout) {
          localHipsY = -0.05;
          spineTiltX = -1.4; // Lie face down/up flat
          spineTiltZ = 0;
          rHandExt = 0;
          lHandExt = 0;
        }

        // Adjust coordinates relative to fighter Yaw angle
        const getRotatedOffset = (rx: number, ry: number, rz: number) => {
          const cosF = Math.cos(f.angleYaw);
          const sinF = Math.sin(f.angleYaw);
          return {
            x: f.pos.x + (rx * cosF - rz * sinF),
            y: f.pos.y + ry,
            z: f.pos.z + (rx * sinF + rz * cosF)
          };
        };

        // Joints mapping inside absolute 3D stadium coordinate space
        const hipsPos = getRotatedOffset(0, -localHipsY, 0);
        // Spine is on top of hips
        const spinePos = getRotatedOffset(0, -localHipsY - 0.45, spineTiltX * 0.3);
        // Head is on top of spine
        const headPos = getRotatedOffset(headShakeY * 0.2, -localHipsY - 0.72, spineTiltX * 0.5 - 0.05);

        // Shoulders
        const sWidth = f.id === 3 ? 0.38 : 0.25; // sumo width vs normal
        const lShoulderPos = getRotatedOffset(-sWidth, -localHipsY - 0.45, spineTiltZ * 0.2);
        const rShoulderPos = getRotatedOffset(sWidth, -localHipsY - 0.45, -spineTiltZ * 0.2);

        // Hands with move progress triggers
        const lHandPos = getRotatedOffset(-sWidth - 0.1, -localHipsY - 0.4 + lHandExt * 0.2, -0.2 - lHandExt);
        const rHandPos = getRotatedOffset(sWidth + 0.1, -localHipsY - 0.4 + rHandExt * 0.2, -0.2 - rHandExt);

        // Knees / Feet (dynamic walking state)
        const walkCycleAngle = Date.now() * 0.012;
        const leftLegOffset = f.currentMove === "WALK" ? Math.sin(walkCycleAngle) * 0.25 : 0;
        const rightLegOffset = f.currentMove === "WALK" ? -Math.sin(walkCycleAngle) * 0.25 : 0;

        const lFootPos = getRotatedOffset(-0.2, 0, leftLegOffset);
        const rFootPos = getRotatedOffset(0.2, 0, rightLegOffset);

        // Project all anatomical 3D coordinates to user 2D viewport
        const p_hips = project3D(hipsPos, yaw, pitch, zoom, camTarget);
        const p_spine = project3D(spinePos, yaw, pitch, zoom, camTarget);
        const p_head = project3D(headPos, yaw, pitch, zoom, camTarget);
        
        const p_lShoulder = project3D(lShoulderPos, yaw, pitch, zoom, camTarget);
        const p_rShoulder = project3D(rShoulderPos, yaw, pitch, zoom, camTarget);
        const p_lHand = project3D(lHandPos, yaw, pitch, zoom, camTarget);
        const p_rHand = project3D(rHandPos, yaw, pitch, zoom, camTarget);
        
        const p_lFoot = project3D(lFootPos, yaw, pitch, zoom, camTarget);
        const p_rFoot = project3D(rFootPos, yaw, pitch, zoom, camTarget);

        // Draw Motion trail ghosts if fighting aggressively or doing special sweeps
        if (isAttacking) {
          ctx.save();
          ctx.globalAlpha = 0.12 * (1 - progress);
          ctx.strokeStyle = f.shortsColor;
          ctx.lineWidth = 14;
          ctx.beginPath();
          if (p_lShoulder && p_lHand) {
            ctx.moveTo(p_lShoulder.x - 10, p_lShoulder.y);
            ctx.lineTo(p_lHand.x - 20 * progress, p_lHand.y);
          }
          if (p_rShoulder && p_rHand) {
            ctx.moveTo(p_rShoulder.x + 10, p_rShoulder.y);
            ctx.lineTo(p_rHand.x + 20 * progress, p_rHand.y);
          }
          ctx.stroke();
          ctx.restore();
        }

        // Draw anatomical links if all visible on viewport
        if (p_hips && p_spine && p_head && p_lShoulder && p_rShoulder && p_lHand && p_rHand && p_lFoot && p_rFoot) {
          ctx.save();
          ctx.lineCap = "round";

          // --- Custom render styling based on the actual character attributes ---
          const skinColor = f.skinColor;
          const shortsColor = f.shortsColor;

          // Hips/Harness joints render
          ctx.strokeStyle = shortsColor;
          ctx.lineWidth = f.id === 3 ? p_hips.scale * 0.35 : p_hips.scale * 0.18; // Heavy build sumo has massive waist
          ctx.beginPath();
          ctx.moveTo(p_lShoulder.x, p_lShoulder.y * 1.05);
          ctx.lineTo(p_rShoulder.x, p_rShoulder.y * 1.05);
          ctx.stroke();

          // Torso / Muscle build volumetric links or Custom Parody Outfits!
          if (f.id === 1) {
            // Donald Trump: Navy Blue suit jacket torso
            ctx.strokeStyle = "#1e3a8a"; 
            ctx.lineWidth = p_spine.scale * 0.28; 
          } else if (f.id === 2) {
            // Vladimir Putin: White Judo Gi jacket
            ctx.strokeStyle = "#f3f4f6"; 
            ctx.lineWidth = p_spine.scale * 0.25;
          } else {
            // Kim Jong Un: Large gray power Mao suit
            ctx.strokeStyle = "#4b5563"; 
            ctx.lineWidth = p_spine.scale * 0.65; // Colossal girth
          }

          ctx.beginPath();
          ctx.moveTo(p_hips.x, p_hips.y);
          ctx.lineTo(p_spine.x, p_spine.y);
          ctx.stroke();

          // ----------------------------------------------------
          // Draw Specific Clothing & Decal details on Torso
          // ----------------------------------------------------
          if (f.id === 1) {
            // Trump's white shirt V-neck collar & HUGE RED TIE!
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(p_spine.x - 5, p_spine.y);
            ctx.lineTo(p_spine.x + 5, p_spine.y);
            ctx.lineTo(p_spine.x, p_spine.y + 7);
            ctx.closePath();
            ctx.fill();

            // Long dangling red tie
            ctx.strokeStyle = "#ef4444"; 
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(p_spine.x, p_spine.y + 2);
            ctx.lineTo(p_hips.x, p_hips.y + 5);
            ctx.stroke();

            // Tie triangular pointy end
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.moveTo(p_hips.x - 3, p_hips.y + 4);
            ctx.lineTo(p_hips.x + 3, p_hips.y + 4);
            ctx.lineTo(p_hips.x, p_hips.y + 12);
            ctx.closePath();
            ctx.fill();
            
          } else if (f.id === 2) {
            // Putin's Judo Gi lapels and solid Black Belt wrap!
            ctx.strokeStyle = "#e5e7eb";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(p_spine.x - 6, p_spine.y);
            ctx.lineTo(p_hips.x + 4, p_hips.y);
            ctx.moveTo(p_spine.x + 6, p_spine.y);
            ctx.lineTo(p_hips.x - 4, p_hips.y);
            ctx.stroke();

            // Black Belt wrapped tightly over hips!
            ctx.strokeStyle = "#000000"; 
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(p_hips.x - 11, p_hips.y + 1);
            ctx.lineTo(p_hips.x + 11, p_hips.y + 1);
            ctx.stroke();

            // Black Belt dangling knot ends
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(p_hips.x, p_hips.y + 1);
            ctx.lineTo(p_hips.x - 4, p_hips.y + 12);
            ctx.moveTo(p_hips.x, p_hips.y + 1);
            ctx.lineTo(p_hips.x + 3, p_hips.y + 10);
            ctx.stroke();

          } else if (f.id === 3) {
            // Kim's red pin badge on breast plate
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(p_spine.x - 8, p_spine.y + 3, 2.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Golden suit buttons down center
            ctx.fillStyle = "#fbbf24";
            for (let b = 1; b <= 3; b++) {
              ctx.beginPath();
              ctx.arc(p_spine.x, p_spine.y + b * 6, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Draw Shorts/Briefs/Pants over hips matching overall look
          if (f.id === 1) {
            ctx.strokeStyle = "#1e3a8a"; // Blue suit trousers
            ctx.lineWidth = p_hips.scale * 0.32;
          } else if (f.id === 2) {
            ctx.strokeStyle = "#f3f4f6"; // White gi trousers
            ctx.lineWidth = p_hips.scale * 0.3;
          } else {
            ctx.strokeStyle = "#4b5563"; // Gray Mao coat trousers
            ctx.lineWidth = p_hips.scale * 0.62;
          }
          ctx.beginPath();
          ctx.moveTo(p_hips.x - 10, p_hips.y);
          ctx.lineTo(p_hips.x + 10, p_hips.y);
          ctx.stroke();

          // Arms / biceps / clothing sleeves
          if (f.id === 1) {
            ctx.strokeStyle = "#1e3a8a"; // Blue suit sleeves
          } else if (f.id === 2) {
            ctx.strokeStyle = "#f3f4f6"; // White Gi sleeves
          } else {
            ctx.strokeStyle = "#4b5563"; // Deep grey Mao sleeves
          }
          ctx.lineWidth = f.id === 3 ? p_lShoulder.scale * 0.22 : p_lShoulder.scale * 0.14;
          ctx.beginPath();
          // Left arm sleeve connection
          ctx.moveTo(p_lShoulder.x, p_lShoulder.y);
          ctx.lineTo(p_lHand.x, p_lHand.y);
          // Right arm sleeve connection
          ctx.moveTo(p_rShoulder.x, p_rShoulder.y);
          ctx.lineTo(p_rHand.x, p_rHand.y);
          ctx.stroke();

          // Red/Blue/Black Boxing gloves
          ctx.fillStyle = shortsColor;
          ctx.beginPath();
          ctx.arc(p_lHand.x, p_lHand.y, p_lHand.scale * 0.082, 0, Math.PI*2);
          ctx.arc(p_rHand.x, p_rHand.y, p_rHand.scale * 0.082, 0, Math.PI*2);
          ctx.fill();

          // Legs / trousers legs
          if (f.id === 1) {
            ctx.strokeStyle = "#1e3a8a"; // Blue suit legs
          } else if (f.id === 2) {
            ctx.strokeStyle = "#f3f4f6"; // White gi legs
          } else {
            ctx.strokeStyle = "#4b5563"; // Grey pants legs
          }
          ctx.lineWidth = f.id === 3 ? p_lFoot.scale * 0.28 : p_lFoot.scale * 0.16;
          ctx.beginPath();
          // Left leg
          ctx.moveTo(p_hips.x - (f.id === 3 ? 12 : 5), p_hips.y);
          ctx.lineTo(p_lFoot.x, p_lFoot.y);
          // Right leg
          ctx.moveTo(p_hips.x + (f.id === 3 ? 12 : 5), p_hips.y);
          ctx.lineTo(p_rFoot.x, p_rFoot.y);
          ctx.stroke();

          // --- Fighter Heads details (Hair & Unique portrait features) ---
          ctx.fillStyle = skinColor;
          ctx.beginPath();
          const headRad = f.id === 3 ? p_head.scale * 0.16 : (f.id === 1 ? p_head.scale * 0.132 : p_head.scale * 0.118);
          ctx.arc(p_head.x, p_head.y, headRad, 0, Math.PI * 2);
          ctx.fill();

          // Render HAIR! Absolutely unique blond combed-back style, Sumo top knot, or shaved Slavic style
          if (f.id === 1) { // DONALD TRUMP
            ctx.fillStyle = "#fbbf24"; // Bright combed yellow blonde hair
            ctx.beginPath();
            // Draw combed back swoosh hairdo shape
            ctx.arc(p_head.x, p_head.y - headRad * 0.7, headRad * 1.0, Math.PI * 0.9, Math.PI * 2.1);
            ctx.ellipse(p_head.x + headRad * 0.45, p_head.y - headRad * 0.95, headRad * 0.9, headRad * 0.45, -0.28, 0, Math.PI*2);
            ctx.fill();

            // Orange-skin shading cheeks highlights
            ctx.fillStyle = "rgba(239, 68, 68, 0.18)";
            ctx.beginPath();
            ctx.arc(p_head.x - 4, p_head.y + 2, 2.5, 0, Math.PI * 2);
            ctx.arc(p_head.x + 4, p_head.y + 2, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Shouting open mouth
            ctx.fillStyle = "#991b1b";
            ctx.beginPath();
            ctx.arc(p_head.x, p_head.y + headRad * 0.35, 3.2, 0, Math.PI, false);
            ctx.closePath();
            ctx.fill();

            // White teeth bar inside mouth
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(p_head.x - 1.8, p_head.y + headRad * 0.34, 3.6, 1.2);

          } else if (f.id === 2) { // VLADIMIR PUTIN
            ctx.fillStyle = "#78716c"; // shaved stones-grey sides
            ctx.beginPath();
            ctx.arc(p_head.x, p_head.y - headRad * 0.5, headRad * 0.8, Math.PI, Math.PI*2);
            ctx.fill();
            
            // Intense blue eyes
            ctx.fillStyle = "#0284c7";
            ctx.beginPath();
            ctx.arc(p_head.x - 3.5, p_head.y - 1.5, 1.5, 0, Math.PI*2);
            ctx.arc(p_head.x + 3.5, p_head.y - 1.5, 1.5, 0, Math.PI*2);
            ctx.fill();

            // Stern black eyebrows
            ctx.strokeStyle = "#1c1917";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(p_head.x - 6, p_head.y - 4);
            ctx.lineTo(p_head.x - 1, p_head.y - 3);
            ctx.moveTo(p_head.x + 6, p_head.y - 4);
            ctx.lineTo(p_head.x + 1, p_head.y - 3);
            ctx.stroke();

          } else if (f.id === 3) { // KIM JONG UN
            ctx.fillStyle = "#171717"; // jet black hair blocks
            ctx.beginPath();
            ctx.fillRect(p_head.x - headRad * 0.9, p_head.y - headRad * 1.05, headRad * 1.8, headRad * 0.55);
            ctx.arc(p_head.x, p_head.y - headRad * 0.55, headRad * 0.95, Math.PI, Math.PI*2);
            ctx.fill();

            // Iconic black round sunglasses
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(p_head.x - 4, p_head.y - 1, 3.5, 0, Math.PI*2);
            ctx.arc(p_head.x + 4, p_head.y - 1, 3.5, 0, Math.PI*2);
            ctx.moveTo(p_head.x - 1, p_head.y - 1);
            ctx.lineTo(p_head.x + 1, p_head.y - 1);
            ctx.stroke();

            // Sunglasses glares
            ctx.fillStyle = "rgba(255,255,255,0.45)";
            ctx.beginPath();
            ctx.arc(p_head.x - 3, p_head.y - 2, 1, 0, Math.PI * 2);
            ctx.arc(p_head.x + 5, p_head.y - 2, 1, 0, Math.PI * 2);
            ctx.fill();
          }

          // Face mask shading or dazed stars if stunned
          if (f.currentMove === "STUNNED") {
            ctx.fillStyle = "#ffff00";
            const starsY = p_head.y - headRad * 1.4;
            const size = 3;
            // Draw rotating little stars
            const rotationTime = Date.now() * 0.015;
            for (let k = 0; k < 3; k++) {
              const xOffset = Math.sin(rotationTime + k * (Math.PI * 2 / 3)) * 12;
              const yOffset = Math.cos(rotationTime + k * (Math.PI * 2 / 3)) * 4;
              ctx.beginPath();
              ctx.arc(p_head.x + xOffset, starsY + yOffset, size, 0, Math.PI*2);
              ctx.fill();
            }
          }

          // --- 6. Status bars floating above their head ringside ---
          if (!f.isKnoctout) {
            const hBarY = p_head.y - headRad * 1.95;
            const hBarW = Math.max(90, p_head.scale * 0.65);
            const hBarH = 6;

            // 1. Draw a semitransparent container background box with neon borders
            ctx.save();
            ctx.fillStyle = "rgba(10, 10, 20, 0.85)";
            ctx.shadowColor = f.id === 1 ? "#ef4444" : (f.id === 2 ? "#3b82f6" : "#f59e0b");
            ctx.shadowBlur = 6;
            
            const boxW = hBarW + 12;
            const boxH = 27;
            const boxX = p_head.x - boxW / 2;
            const boxY = hBarY - 21;
            
            ctx.beginPath();
            ctx.roundRect?.(boxX, boxY, boxW, boxH, 4);
            ctx.fill();
            
            ctx.shadowBlur = 0; // reset shadow
            ctx.strokeStyle = f.id === 1 ? "rgba(239, 68, 68, 0.7)" : (f.id === 2 ? "rgba(59, 130, 246, 0.7)" : "rgba(245, 158, 11, 0.7)");
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect?.(boxX, boxY, boxW, boxH, 4);
            ctx.stroke();

            // 2. Draw country flag emoji and capital name
            ctx.font = 'bold 10px "Inter", "Segoe UI", sans-serif';
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            
            let nameTagStr = "";
            if (f.id === 1) nameTagStr = "🇺🇸 DONALD TRUMP";
            else if (f.id === 2) nameTagStr = "🇷🇺 VLADIMIR PUTIN";
            else nameTagStr = "🇰🇵 KIM JONG UN";

            ctx.fillText(nameTagStr, p_head.x, hBarY - 10);

            // 3. Draw HP bar inside the container
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.fillRect(p_head.x - hBarW / 2, hBarY - 3, hBarW, hBarH);
            
            const hpColor = f.hp > 50 ? "#10b981" : (f.hp > 25 ? "#f59e0b" : "#ef4444");
            ctx.fillStyle = hpColor;
            ctx.fillRect(p_head.x - hBarW / 2, hBarY - 3, hBarW * (f.hp / f.maxHp), hBarH);

            // Draw thin vertical lines inside HP bar as ticks
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.lineWidth = 1;
            for (let t = 1; t < 5; t++) {
              ctx.beginPath();
              ctx.moveTo(p_head.x - hBarW / 2 + (hBarW * t) / 5, hBarY - 3);
              ctx.lineTo(p_head.x - hBarW / 2 + (hBarW * t) / 5, hBarY - 3 + hBarH);
              ctx.stroke();
            }

            // Print precise HP text overlay
            ctx.font = '900 8px "JetBrains Mono", monospace';
            ctx.fillStyle = "#ffffff";
            ctx.fillText(`${Math.ceil(f.hp)} HP`, p_head.x, hBarY + 11);

            ctx.restore();
          } else {
            // "K.O." tag above knocked out fighter
            ctx.save();
            ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
            ctx.fillRect(p_head.x - 25, p_head.y - 26, 50, 16);
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(p_head.x - 25, p_head.y - 26, 50, 16);

            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.fillStyle = "#ef4444";
            ctx.textAlign = "center";
            ctx.fillText("K.O. COLD", p_head.x, p_head.y - 14);
            ctx.restore();
          }

          ctx.restore();
        }
      });

      // --- 6. Draw foreground cage panel walls (clash shadows over them) ---
      fgWalls.forEach(w => drawFencePanel(w, true));

      // --- 7. Draw and update particles in 3D (Sweat glistens flying) ---
      const activeParticles: Particle3D[] = [];
      particles.forEach((p) => {
        // Apply physics gravity and movement
        p.pos.x += p.vel.x * (isSlowMotion ? 0.35 : 1.0);
        p.pos.y += p.vel.y * (isSlowMotion ? 0.35 : 1.0);
        p.pos.z += p.vel.z * (isSlowMotion ? 0.35 : 1.0);

        // Gravity pull (downward forces)
        p.vel.y -= 0.18 * (isSlowMotion ? 0.35 : 1.0);

        // Life ticking down
        p.life -= 1 / p.maxLife;

        if (p.life > 0 && p.pos.y < 3.0) { // Keep above ground level
          // Bounce off floor
          if (p.pos.y <= 0.05) {
            p.pos.y = 0.05;
            p.vel.y = -p.vel.y * 0.45; // lossy bounce
          }

          const proj = project3D(p.pos, yaw, pitch, zoom, camTarget);
          if (proj) {
            ctx.save();
            ctx.globalAlpha = p.life * 0.9;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, p.size * (proj.scale * 0.03), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            activeParticles.push(p);
          }
        }
      });
      
      // Update state without causing React cycles
      setParticles(activeParticles);

      // --- 8. Vignette and Cinematic overlays (motion blur, lens flare, 4k grid scanlines) ---
      const vignGrad = ctx.createRadialGradient(
        dimensions.width / 2, dimensions.height / 2, dimensions.width * 0.3,
        dimensions.width / 2, dimensions.height / 2, dimensions.width * 0.75
      );
      vignGrad.addColorStop(0, "rgba(0,0,0,0)");
      vignGrad.addColorStop(1, "rgba(0,0,0,0.68)");
      ctx.fillStyle = vignGrad;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Arena TV HUD lines overlay (scanlines)
      ctx.strokeStyle = "rgba(255,255,255,0.015)";
      ctx.lineWidth = 1.0;
      for (let y = 0; y < dimensions.height; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(dimensions.width, y);
        ctx.stroke();
      }

      ctx.restore(); // Undo camera displacement / shake

      // Dynamic slow-mo flash screen border
      if (isSlowMotion) {
        ctx.strokeStyle = "rgba(245, 158, 11, 0.28)";
        ctx.lineWidth = 6 + Math.sin(Date.now() * 0.01) * 3;
        ctx.strokeRect(0, 0, dimensions.width, dimensions.height);

        ctx.fillStyle = "rgba(245, 158, 11, 0.05)";
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      }

      // Live Cameraman rec indicator
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(28, 28, 6, 0, Math.PI * 2);
      ctx.fill();

      // Rec Text
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText("LIVE HD BROADCAST", 42, 31);

      // Draw match timer
      const elapsedSec = Math.floor(gameTick / 30);
      const minStr = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
      const secStr = String(elapsedSec % 60).padStart(2, "0");
      
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(dimensions.width - 120, 16, 100, 24);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(dimensions.width - 120, 16, 100, 24);

      ctx.fillStyle = "#fbbf24";
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText(`${minStr}:${secStr} R1`, dimensions.width - 70, 32);

      // Request next frame
      animFrameId = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => cancelAnimationFrame(animFrameId);
  }, [fighters, cameraMode, dimensions, setParticles, arenaTheme, isSlowMotion, impactLocation, gameTick]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 overflow-hidden rounded-lg border border-slate-800 shadow-2xl">
      <canvas
        id="broadcaster-stadium-canvas"
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block w-full h-full"
      />
    </div>
  );
};
