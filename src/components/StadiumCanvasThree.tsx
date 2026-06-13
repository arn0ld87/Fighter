import React, { useRef, useEffect, useState } from "react";
import { Fighter, Vector3D, Particle3D, CameraMode } from "../types";
import { Renderer } from "../engine/Renderer";
import type { RenderState, ThemeKey } from "../engine/types";

interface StadiumCanvasThreeProps {
  fighters: Fighter[];
  cameraMode: CameraMode;
  particles: Particle3D[];
  setParticles: React.Dispatch<React.SetStateAction<Particle3D[]>>;
  isSlowMotion: boolean;
  arenaTheme: ThemeKey;
  impactLocation: Vector3D | null;
  clearImpact: () => void;
  gameTick: number;
}

/**
 * Three.js / WebGL renderer host. Keeps the exact StadiumCanvas prop surface so
 * it is a drop-in replacement for the legacy 2D-canvas component. Owns the RAF
 * loop and the particle simulation (ref-based, no per-frame React re-renders).
 */
export const StadiumCanvasThree: React.FC<StadiumCanvasThreeProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  // Latest props, read by the RAF loop without re-subscribing.
  const propsRef = useRef(props);
  propsRef.current = props;

  // Particle pool simulated here (faithful port of the legacy physics).
  const particlesRef = useRef<Particle3D[]>([]);
  const startRef = useRef(0);
  const [ready, setReady] = useState(false);

  // --- Boot renderer + RAF loop on mount ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new Renderer(canvas, props.arenaTheme);
    rendererRef.current = renderer;
    setReady(true);

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        if (width > 0 && height > 0) renderer.resize(width, height);
      }
    });
    ro.observe(container);
    const rect = container.getBoundingClientRect();
    renderer.resize(rect.width || 800, rect.height || 480);

    startRef.current = performance.now();
    let prev = startRef.current;
    let raf = 0;
    const loop = () => {
      const p = propsRef.current;
      const now = performance.now();
      const timeMs = now - startRef.current;
      let dt = (now - prev) / 1000;
      prev = now;
      if (!isFinite(dt) || dt <= 0) dt = 1 / 60;
      dt = Math.min(dt, 0.1);
      stepParticles(particlesRef.current, dt, p.isSlowMotion);

      const state: RenderState = {
        fighters: p.fighters,
        cameraMode: p.cameraMode,
        particles: particlesRef.current,
        isSlowMotion: p.isSlowMotion,
        theme: p.arenaTheme,
        impactLocation: p.impactLocation,
        gameTick: p.gameTick,
        timeMs,
      };
      renderer.update(state);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Impact: spawn particles, trigger bloom/shake, then clear ---
  useEffect(() => {
    const loc = props.impactLocation;
    if (!loc) return;
    spawnImpactParticles(particlesRef.current, loc);
    rendererRef.current?.impact(loc, props.fighters);
    const t = setTimeout(() => props.clearImpact(), 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.impactLocation]);

  return (
    <div ref={containerRef} className="relative w-full h-full rounded-xl overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block w-full h-full" />
      {/* Broadcast overlay: vignette + scanlines + REC */}
      <div className="pointer-events-none absolute inset-0" style={vignetteStyle} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={scanlineStyle} />
      <div className="pointer-events-none absolute top-2 left-3 flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-red-500">
        <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse" />REC
      </div>
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-zinc-500 font-mono text-xs">
          BOOTING WEBGL ENGINE…
        </div>
      )}
    </div>
  );
};

const vignetteStyle: React.CSSProperties = {
  background:
    "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
};
const scanlineStyle: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 3px)",
};

const IMPACT_COLORS = ["#ffffff", "#ffd700", "#ff4500", "#ffa500"];

function spawnImpactParticles(pool: Particle3D[], loc: Vector3D): void {
  for (let i = 0; i < 35; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3.5; // m/s
    const upSpeed = 1.8 + Math.random() * 3.0; // m/s
    pool.push({
      pos: { x: loc.x, y: loc.y, z: loc.z },
      vel: { x: Math.cos(angle) * speed, y: upSpeed, z: Math.sin(angle) * speed },
      color: IMPACT_COLORS[Math.floor(Math.random() * IMPACT_COLORS.length)],
      size: 1.5 + Math.random() * 3,
      life: 1.0,
      maxLife: 0.5 + Math.random() * 0.9, // seconds
      type: Math.random() > 0.8 ? "SPARK" : "SWEAT",
    });
  }
  if (pool.length > 150) pool.splice(0, pool.length - 150);
}

/** Time-based particle physics (gravity + lossy floor bounce), world units = meters. */
function stepParticles(pool: Particle3D[], dt: number, slow: boolean): void {
  const sdt = dt * (slow ? 0.4 : 1.0);
  for (let i = pool.length - 1; i >= 0; i--) {
    const p = pool[i];
    p.pos.x += p.vel.x * sdt;
    p.pos.y += p.vel.y * sdt;
    p.pos.z += p.vel.z * sdt;
    p.vel.y -= 9.8 * sdt;
    p.life -= sdt / p.maxLife;
    if (p.pos.y <= 0.05) {
      p.pos.y = 0.05;
      p.vel.y = -p.vel.y * 0.4;
      p.vel.x *= 0.7;
      p.vel.z *= 0.7;
    }
    if (p.life <= 0 || p.pos.y > 4.0) pool.splice(i, 1);
  }
}
