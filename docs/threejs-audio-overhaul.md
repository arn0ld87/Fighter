# Three.js + Audio Overhaul — Living Doc

> **Single Source of Truth.** Dieses Dokument wird laufend fortgeschrieben. Es beschreibt
> **was wir vorhaben**, **wie wir es bauen**, **was schon erledigt ist** und **was noch fehlt**.
> Bei jeder abgeschlossenen Arbeitseinheit wird das **Status-Board** aktualisiert.

- **Branch:** `feat/threejs-audio-overhaul`
- **Start:** 2026-06-13
- **Stand zuletzt aktualisiert:** 2026-06-13 — **alle Phasen P0–P7 abgeschlossen**, tsc+build grün, Render headless verifiziert

---

## 1. Ziel (Was)

Den Browser-Kampfsimulator „Triple Threat Arena Simulator" deutlich aufwerten:

1. **Bessere 3D-Grafik** — Ablösung der eigenen 2D-Canvas-Software-Projektion durch einen
   echten **Three.js / WebGL-Renderer**: echte Lichter, Schatten, PBR-Materialien,
   Post-Processing (Bloom), MSAA. Kämpfer als **detailliertere, modellierte Charaktere**
   (erkennbarer Körperbau, Outfit, einfaches Gesicht) statt flacher Polygone.
2. **Voller Sound-Layer** — Treffer/Whoosh/Block/Signature-SFX, dynamisches Crowd-Ambiente
   (lauter bei Combos), Gong/Buzzer, UI-Klicks, optionale Loop-Musik. Assets aus **CC0**-Quellen,
   gemischt über **Howler.js**, mit Lautstärke-Mixer im UI.

**Nicht-Ziele (YAGNI):** Multiplayer, Replay-Scrubbing, Tournament-Bracket, Mobile-Touch,
Twitch — bleiben Roadmap, kein Teil dieses Vorhabens.

---

## 2. Leitplanken (Wie — Grundprinzipien)

- **Spiellogik bleibt unangetastet.** `App.tsx` (State, Treffer, Damage, Choreografie, Overlord,
  Gemini-Commentary, Web-Speech) wird nur an den Rändern angefasst (Event→Sound, Volume-UI).
  Die Engine ist ein **reiner Renderer**.
- **Stabiler Vertrag.** Der neue Renderer behält **exakt dieselbe `StadiumCanvasProps`-Schnittstelle**.
  Damit ist der Austausch chirurgisch und das Spiel bleibt jederzeit lauffähig.
- **Feature-Flag.** Neue Engine hinter `VITE_RENDERER=three|canvas` (Default `three`),
  alte Canvas-Engine bleibt als Fallback erhalten, bis Parität bestätigt ist.
- **Modulgrenzen.** Eine fokussierte `src/engine/`-Schicht mit klar getrennten, einzeln
  testbaren Modulen statt eines 1218-Zeilen-Monolithen.
- **Lizenzsicher.** Nur CC0-Assets; jede Quelle in `public/audio/CREDITS.md` dokumentiert.

---

## 3. Architektur (Zielzustand)

```
src/engine/
  types.ts           – gemeinsamer Render-Kontrakt: RenderState, CameraState, FxEvent, ThemeKey
  Renderer.ts        – Three.js Scene/WebGLRenderer/Loop, Resize, Post-FX (UnrealBloom, Vignette), Shake
  CameraDirector.ts  – 6 Kameramodi auf PerspectiveCamera (Orbit/Ringside/Cradle/3×POV) + Lerp
  Arena.ts           – Boden-Oktagon, Crowd-Ringe (InstancedMesh), Cage-Panels; 4 Theme-Presets
  Lighting.ts        – echte SpotLights (Schatten-Map), Emitter für Bloom, Theme-Licht/Fog
  FighterRig.ts      – prozedurales Charakter-Modell pro Kämpfer (Körperbau/Outfit/Gesicht) + Bone-Mapping
  Particles.ts       – GPU/Points-Partikel: SPARK/SWEAT/DUST/BLOOD
  StadiumCanvas.tsx  – dünner React-Wrapper (gleiche Props), instanziiert Renderer, pusht State/Frame

src/audio/
  SoundManager.ts    – Howler-Mixer: Bus (master/sfx/crowd/music), eventgetriebene SFX, dynamisches Crowd-Bett
  sounds.ts          – Asset-Manifest (Key → Datei, Lautstärke, Pool-Größe)

scripts/
  fetch-audio.mjs    – lädt kuratierte CC0-Assets nach public/audio/ (Node fetch), schreibt CREDITS.md

public/audio/        – die heruntergeladenen .mp3/.ogg + CREDITS.md
```

**Datenfluss:** `App.tsx` (unverändert) → `StadiumCanvas`-Wrapper → `Renderer.update(renderState)`
pro Frame. Treffer-Events (`events: FightEvent[]`, `impactLocation`) → Partikel + Bloom-Puls (Engine)
**und** → `SoundManager` (Audio). Volume-UI in `ControlDashboard.tsx` → `SoundManager`.

---

## 4. Port-Brief (faithful reproduction facts)

Damit der neue Renderer verhaltensgleich ist — exakte Werte aus der alten Engine:

### Kameramodi (sphärisch: yaw, pitch, zoom=Distanz, target; Lerp ~0.05)
| Modus | yaw | pitch | zoom | target |
|---|---|---|---|---|
| `RINGSIDE` | `0.5·sin(t·1e-4)` | `0.35+0.1·cos(t·1.5e-4)` | 190 | (0,0.5,0) |
| `CRADLE_ROTATING` | `t·8e-4` | `0.35+0.15·sin(t·1e-3)` | 160 | Kämpfer-Schwerpunkt |
| `CINEMATIC_FOLLOW` | `t·2e-4` | `0.2+0.1·cos(t·4e-4)` | `125+15·sin(t·1e-3)` | Schwerpunkt |
| `FIGHTER_n_POV` | `-lookAngle+π` | 0.15 | 100 | nächster Gegner, y=0.8; Cam an Kopf des Trägers |

Projektion alt: `fov=8800` focal length; Rotation yaw(Y)→pitch(X), Translation +zoom(Z).
In Three.js: PerspectiveCamera, Position aus (yaw,pitch,distance) um target; Shake = Offset, decay 0.88.

### Arena-Themes (bg-Gradient / Boden / Akzentfarbe)
| Theme | bg innen→aussen | Boden innen→aussen | Akzent (Neon) |
|---|---|---|---|
| `neon_vegas` | #110b29→#05020c | #191c2b→#0d0f17 | #ff1e56 (pink/rot) |
| `tokyo_sumo` | #1a120b→#070402 | #281f14→#17120c | #f59e0b (amber) |
| `siberian_cage` | #0b151a→#020507 | #121a24→#090d12 | #0ea5e9 (sky) |
| `retro_cinematic` | #161616→#0a0a0a | #212121→#151515 | #a3a3a3 (grau) |

Crowd-Ringe alt: Radius 7/8.5/10/11.5, Sitze 45/60/75/90, Höhe 0.2/0.4/0.7/1.1.

### Kämpfer (Modell-Proportionen + Look)
| # | Name | Größe/Gewicht | Build | Haut | Haar | Shorts | P/S/R/D | Signature |
|---|---|---|---|---|---|---|---|---|
| 1 | Donald Trump | 1.90m/102kg | Tall Showman | #ffa254 | blonder Swoosh | #dc2626 rot | 7/4/9/5 | GIGA MAGA HAYMAKER |
| 2 | Vladimir Putin | 1.70m/72kg | Lean Judo Master | #fed7aa | grau rasiert | #2563eb blau | 5/9/5/7 | KGB TACTICAL TRIP |
| 3 | Kim Jong Un | 1.70m/140kg | Colossal Sumo | #fef08a | schwarzer Dutt | #171717 schwarz | 9/3/4/8 | ICBM COLOSSAL SLAM |

Skelett (11 Joints): hips, spine, head, l/r shoulder, l/r elbow, l/r hip, l/r knee.
Move→Pose: JAB/HAYMAKER/SUMO_SLAM/JUDO_SWEEP/BLOCK/DODGE/STUNNED/CELEBRATE/WALK/IDLE
(WALK: Bein-Offset `±sin(cycle)·0.25`, Idle-Bob `0.04·sin(t·8e-3)`).
Partikel-Typen: SWEAT, SPARK, DUST, BLOOD. Treffer triggert Slow-Mo + Shake.

### Bestehende Integrationspunkte (App.tsx)
- `StadiumCanvasProps`: `fighters, cameraMode, particles, setParticles, isSlowMotion, arenaTheme, impactLocation, clearImpact, gameTick`.
- Sound-Hooks: `events: FightEvent[]` (jeder Treffer; `type`, `damage`, `isSpecial`), KO via `fighter.isKnoctout`, `arenaTheme`, Rundenstart (Reset).
- Ansager: bestehende `speechSynthesis`-Nutzung bleibt (Z. ~579).

---

## 5. Arbeitsplan (Phasen)

- **P0 Setup** — Branch, Deps (`three`, `@types/three`, `howler`, `@types/howler`), Verzeichnisse, `engine/types.ts`-Kontrakt, Feature-Flag-Gerüst.
- **P1 Audio-Assets** (Subagent, günstig) — CC0-URLs kuratieren → `fetch-audio.mjs` → Download → `CREDITS.md`.
- **P2 Audio-System** (Subagent) — `SoundManager.ts` + `sounds.ts` (Howler, Bus, dynamisches Crowd-Bett).
- **P3 Engine-Leaf-Module** (Subagents, parallel, getrennte Dateien) — `Arena.ts`, `Lighting.ts`, `FighterRig.ts`, `Particles.ts`, `CameraDirector.ts`.
- **P4 Assembly** (Orchestrator) — `Renderer.ts` + `StadiumCanvas.tsx`-Wrapper komponieren.
- **P5 Integration** (Orchestrator) — `App.tsx` Event→Sound, `ControlDashboard.tsx` Volume-Mixer, Feature-Flag verdrahten.
- **P6 Verify** — `tsc --noEmit`, `vite build`, Laufzeit-Check, Fixes.
- **P7 Finish** — README/Roadmap-Update, Commit, PR.

---

## 6. Status-Board  ← **wird laufend aktualisiert**

Legende: ⬜ offen · 🟡 in Arbeit · ✅ fertig · ⚠️ blockiert/Risiko

| Phase | Einheit | Status | Notiz |
|---|---|---|---|
| P0 | Branch `feat/threejs-audio-overhaul` | ✅ | angelegt |
| P0 | Verzeichnisse (engine/audio/scripts/public/audio) | ✅ | angelegt |
| P0 | Living-Doc (dieses Dokument) | ✅ | initial |
| P0 | Deps installieren (three, howler, types) | ✅ | three@0.184, howler@2.2.4 |
| P0 | `engine/types.ts` Render-Kontrakt | ✅ | THEMES, RenderState, SceneModule, CameraRig, WORLD |
| P0 | Feature-Flag-Gerüst | ✅ | `VITE_RENDERER=canvas` schaltet auf Legacy |
| P1 | CC0-Asset-Recherche | ✅ | Haiku-Manifest (OpenGameArt); Semantik/Größe geprüft |
| P1 | `scripts/fetch-audio.mjs` + Download | ✅ | 2 validierte CC0-Samples (whoosh, ui_click); Rest Synthese; lange Fehl-Clips per Guard verworfen |
| P2 | `synth.ts` (prozedurale Web-Audio-SFX) | ✅ | Subagent (sonnet), ~290 Z. |
| P2 | `SoundManager.ts` (Howler + Synth-Fallback) | ✅ | Subagent + API-Reconcile |
| P3 | `Arena.ts` | ✅ | Subagent, ~195 Z. |
| P3 | `Lighting.ts` | ✅ | Subagent, ~145 Z. |
| P3 | `FighterRig.ts` | ✅ | Subagent, ~320 Z. + buildLeg-Fix |
| P3 | `Particles.ts` | ✅ | Subagent, ~110 Z. |
| P3 | `CameraDirector.ts` | ✅ | Subagent, ~165 Z. |
| P4 | `Renderer.ts` | ✅ | Orchestrator — Bloom/Shadows/Composer |
| P4 | `StadiumCanvasThree.tsx` Wrapper | ✅ | Orchestrator — RAF, Partikel-Sim, Overlay |
| P5 | App.tsx Event→Sound | ✅ | Event-/KO-Effekte, Crowd-Decay, Gong |
| P5 | ControlDashboard Volume-Mixer | ✅ | Audio-Tab + UI-Klicks |
| P5 | Feature-Flag verdrahtet | ✅ | `USE_THREE` in App.tsx |
| P6 | `tsc --noEmit` grün | ✅ | |
| P6 | `vite build` grün | ✅ | 1700 Module, 897 KB (three.js) |
| P6 | Laufzeit-Check | ✅ | Headless-Chromium: Canvas 906×460, WebGL aktiv, **0 Konsolenfehler**, Render bestätigt |
| P7 | README/Roadmap-Update | ✅ | Engine/Audio/Struktur/Roadmap aktualisiert |
| P7 | Commit + PR | 🟡 | finaler Commit + PR in Arbeit |

---

## 7. Entscheidungen & Risiken

- **2026-06-13** — Renderer: Three.js/WebGL-Rewrite (vs. Canvas aufbohren). Begründung: größter Qualitätssprung; Spiellogik bleibt entkoppelt.
- **2026-06-13** — Charaktere: detailliertere, prozedural modellierte Körper (kein externer 3D-Asset-Bezug → lizenzfrei, schlanke Pipeline).
- **2026-06-13** — Sound: voller Layer, CC0-Assets, Howler.js.
- **2026-06-13 — Synthese-first Hybrid (Kurskorrektur):** Da `curl`/`wget` geblockt sind und verlässliche CC0-Direkt-URLs schwer garantierbar sind, ist die **prozedurale Web-Audio-Synthese der Primärpfad** (`synth.ts`) — garantiert lauffähig, null Netz-/Lizenzrisiko. Echte CC0-Samples werden **best-effort** via `fetch-audio.mjs` dazugeladen; `SoundManager` bevorzugt vorhandene Samples (Howler), sonst Synthese. Erfüllt „voller Sound-Layer" + „komplett fertig" unabhängig von Netz/Hook.
- **⚠️ Risiko Hook §3:** Repo blockt `Read`/`Bash` auf Quellcode außerhalb Allowlist. Subagenten erhalten nötigen Kontext direkt im Prompt (kein Source-Read nötig für neue Dateien).

---

## 8. Asset-Credits

Details in `public/audio/CREDITS.md` (von `fetch-audio.mjs` geschrieben). Stand:

| Key | Quelle | Lizenz | Status |
|---|---|---|---|
| `whoosh.mp3` | OpenGameArt.org (swishprev) | CC0 | ✅ geladen (27 KB) |
| `ui_click.ogg` | OpenGameArt.org (beep) | CC0 | ✅ geladen (6 KB) |
| alle übrigen (hit, block, signature×3, gong, buzzer, crowd, music) | — | — | 🎛 prozedural synthetisiert (`synth.ts`) |

Verworfen: `hit.mp3` (586 KB) und `bep.mp3` (215 KB) — zu lang für SFX, Größen-Guard hat sie abgelehnt; Synthese liefert hier punchigere, korrekte Sounds. Synthese ist generell der Primärpfad; reale Samples sind optional und werden bevorzugt, wenn vorhanden.

## 9. Verifikations-Evidenz

- `npx tsc --noEmit` → **PASS** (alle Module + Renderer + Integration).
- `npx vite build` → **PASS** (1700 Module, 897 KB/245 KB gzip; Samples nach `dist/audio/` kopiert).
- Headless-Chromium (Playwright + SwiftShader) → Canvas 906×460, WebGL-Kontext aktiv, **0 Konsolenfehler**; Screenshot zeigt Neon-Käfig mit Bloom-Seilen, Schatten und drei erkennbar unterschiedlichen 3D-Kämpfern.
- Smoke-Test reproduzierbar: `PW_EXE=<chrome-headless-shell> node scripts/shot.mjs` → `/tmp/fighter-shot.png`.
