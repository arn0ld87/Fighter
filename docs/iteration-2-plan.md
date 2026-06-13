# Iteration 2 — Plan: PR-Findings + Gameplay/Lokalisierung

> **Live-Plandatei** für die zweite Runde. Quelle der Wahrheit für *was*, *wie*, *erledigt/offen*.
> Ergänzt [threejs-audio-overhaul.md](threejs-audio-overhaul.md) (Iteration 1).
> **Branch:** `feat/threejs-audio-overhaul` · **PR:** #1 · **Start:** 2026-06-13

---

## 0. Engine-Entscheidung — **Three.js bleibt** (kostenlos, MIT)

Frage des Users: „in welcher gratis Engine programmieren?" — bewusst abgewogen:

| Option | Kostenlos | Web-nativ | Passt zu React+Gemini-Stack | Aufwand jetzt | Urteil |
|---|---|---|---|---|---|
| **Three.js** (aktuell) | ✅ MIT | ✅ | ✅ bereits integriert | — (läuft) | ✅ **Bleiben** |
| Babylon.js | ✅ Apache-2 | ✅ | ⚠️ Render-Rewrite | hoch | ❌ kein Mehrwert hier |
| PlayCanvas | ✅ (Engine MIT) | ✅ | ⚠️ Editor-zentriert, Rewrite | hoch | ❌ |
| Godot 4 (HTML5-Export) | ✅ MIT | ⚠️ WASM-Canvas | ❌ wirft React-UI + Gemini weg | sehr hoch | ❌ falscher Stack |
| Unity/Unreal | ❌ teils/Lizenz | ⚠️ | ❌ | sehr hoch | ❌ |

**Begründung:** Der Three.js-Renderer ist gebaut, headless verifiziert (WebGL aktiv, 0 Fehler) und in die React-UI + Gemini-Commentary integriert. **Kein** offener Punkt (Kameras, Balance, Zuschauer, Animation, Deutsch) ist eine Engine-Limitierung — alles ist Tuning/Feature. Ein Wechsel = funktionierenden Code wegwerfen ohne Gewinn. → Three.js bleibt.

---

## 1. Gemini-PR-Findings (alle berechtigt, werden umgesetzt + beantwortet)

| # | Datei:Zeile | Prio | Finding | Fix | Status |
|---|---|---|---|---|---|
| F1 | `synth.ts:11` | hoch | Noise-Buffer pro Source neu erzeugt → GC-Last/Stutter | Geteilten `cachedNoiseBuffer` + `makeNoise()` | ⬜ |
| F2 | `Lighting.ts:186` | hoch | `Light.dispose()` existiert nicht → **Crash** beim Renderer-Dispose | Nur Mesh-Geometrie/Material disposen, Light-Dispose entfernen | ⬜ |
| F3 | `FighterRig.ts:448` | mittel | Flash-Decay übersprungen bei KO → dauerhaft rot glühende KO-Kämpfer | Flash-Decay **vor** KO-Check ziehen | ⬜ |
| F4 | `Arena.ts:24` | mittel | `new THREE.Object3D()` pro Frame | privates `dummy`-Feld | ⬜ |
| F5 | `Arena.ts:210` | mittel | dito im Update | `this.dummy` wiederverwenden | ⬜ |
| F6 | `App.tsx:171` | mittel | `lastSoundEventId` bei Reset nicht genullt | `lastSoundEventId.current = null` in `resetSimulation` | ⬜ |

→ Nach Umsetzung jedes Finding auf GitHub **beantworten** (Reply auf den Inline-Comment).

---

## 2. User-Anforderungen (Iteration 2)

| # | Thema | Diagnose / Ansatz | Datei(en) | Status |
|---|---|---|---|---|
| U1 | **6 Kameras zeigen dasselbe** | Wahrsch. Mischung: (a) Kämpfe sofort vorbei → statische KO-Szene überall gleich; (b) Orbit-Modi zu ähnlich (Pitch/Target fast gleich), POV evtl. zu nah am Ziel. Fix: deutlich unterscheidbare Framings (Höhe/Distanz/FOV je Modus), POV echtes Headcam, erst nach U2 final bewerten | `CameraDirector.ts` | ⬜ |
| U2 | **Kämpfe in Sekunden vorbei** | Balance: HP zu niedrig / Schaden zu hoch / Schlagkadenz zu schnell. Fix: HP rauf, Schaden runter, Cooldowns/Energie strenger, Recovery-Phasen | `App.tsx` (executeCombatStrike, INITIAL_FIGHTERS, Loop-Intervalle) | ⬜ |
| U3 | **Keine Zuschauer sichtbar** | Crowd-Ringe vorhanden, aber zu dunkel/klein/zu tief/hinter Kamera. Fix: größere, hellere, beleuchtete Sitzreihen + Tribünen-Geometrie, mehr Kontrast, ggf. animierte Köpfe | `Arena.ts`, ggf. `Lighting.ts` | ⬜ |
| U4 | **Bessere Animation** | Posen verfeinern: flüssigere Idle-Atmung, Gewichtsverlagerung beim Gehen, Hol-/Ausholbewegung bei Schlägen, Treffer-Reaktion/Recoil, Block-Pose, Beinspiel; Bone-Lerp statt harter Schnitte | `FighterRig.ts` | ⬜ |
| U5 | **Standardsprache Deutsch** | Alle UI-Strings → Deutsch (App-Header/Banner, ControlDashboard-Tabs/Buttons, CommentaryFeed, FighterStats, Footer). Gemini-Prompt + Fallback-Kommentar + Web-Speech-Voice → Deutsch (`de-DE`) | `App.tsx`, `components/*`, `server.ts` | ⬜ |

---

## 2b. iPhone — parallel aus einer Codebasis (**Capacitor**, kostenlos)

Ziel des Users: App **parallel fürs iPhone** entwickeln. Abgewogen:

| Ansatz | Kostenlos | Reuse der Web-App | WebGL/Audio | App Store | Aufwand | Urteil |
|---|---|---|---|---|---|---|
| **Capacitor** (nativer WKWebView-Wrapper) | ✅ MIT | ✅ 100 % | ✅ | ✅ | niedrig | ✅ **Empfohlen** |
| PWA „Add to Home Screen" | ✅ | ✅ 100 % | ✅ | ❌ (nur Web) | minimal | ✅ Zusatz (kostenlos) |
| React Native (+ r3f/native) | ✅ | ❌ UI-Rewrite, WebGL-Bridging | ⚠️ | ✅ | sehr hoch | ❌ wirft Renderer weg |
| Native Swift/SwiftUI | ✅ Tooling | ❌ Komplett-Rewrite | ⚠️ Metal | ✅ | extrem | ❌ |

**Plan:** Capacitor als iOS-Target auf denselben Vite-Build + **mobil-responsive Layout** + **Touch-Steuerung** (Overlord-Mode On-Screen-Buttons) + PWA-Manifest. Ein Build → Web **und** iPhone.

**Caveat (ehrlich):** `npx cap add ios` braucht **Xcode + CocoaPods**; App-Store-Upload braucht deinen **Apple-Developer-Account** + Gerätetest. Ich scaffolde Config/Plattform + Responsiveness/Touch und dokumentiere die Xcode-Schritte; den echten Geräte-/Store-Build machst du final auf deinem Mac.

| # | iOS-Schritt | Status |
|---|---|---|
| I1 | Capacitor-Deps + `capacitor.config.ts` (webDir `dist`, appId) | ⬜ |
| I2 | Mobil-responsives Layout (Viewport, Grid bricht sauber, Safe-Area) | ⬜ |
| I3 | Touch-Steuerung (On-Screen-Pad/Buttons für Overlord-Mode) | ⬜ |
| I4 | PWA-Manifest + Icons + `apple-mobile-web-app`-Meta | ⬜ |
| I5 | `npx cap add ios` + Build-Doku (Xcode/CocoaPods/Signing) | ⬜ |

---

## 3. Umsetzungsstrategie

- **Parallelisierbar (getrennte Dateien) → günstige Subagents (Workflow):** `synth.ts` (F1), `Lighting.ts` (F2), `FighterRig.ts` (F3+U4), `Arena.ts` (F4+F5+U3), `CameraDirector.ts` (U1).
- **Selbst (zentrale/überlappende Dateien):** `App.tsx` (F6 + U2-Balance + DE-Strings), `server.ts` (DE-Commentary), `components/*` (DE-Strings) — Lokalisierung als eigener fokussierter Schritt.
- **Verifikation:** nach jedem Schritt `tsc` + `vite build`; Headless-Screenshot je Kameramodus (`scripts/probe.mjs`) zur Sicht-Prüfung von U1/U3/U4; Konsolen-Fehler = 0.
- **Abschluss:** Commit(s), Push, alle 6 PR-Findings auf GitHub beantworten, Status-Board hier schließen.

---

## 4. Status-Board  ← laufend aktualisiert

- Engine-Entscheidung: ✅ Three.js bleibt
- PR-Findings F1–F6: ⬜
- User U1–U5: ⬜
- Verifikation (tsc/build/Screenshots/0 Fehler): ⬜
- PR-Findings beantwortet: ⬜
