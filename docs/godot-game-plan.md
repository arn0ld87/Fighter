# Godot-Spiel — Living Plan (Pivot zu „richtigem Spiel")

> **Entscheidung 2026-06-13:** Wechsel von der Three.js-Webapp zu einem echten Spiel in
> **Godot 4.6** (kostenlos, MIT, code-first, iOS-Export). Die Three.js-Version bleibt als
> **PR #1** geparkt (Web-Prototyp, nicht weggeworfen — dient als Design-Referenz).
> Diese Datei ist die Source of Truth; wird laufend fortgeschrieben.

- **Engine:** Godot 4.6.3 (`/opt/homebrew/bin/godot`)
- **Projektordner:** `godot/`
- **Ziel-Plattformen:** macOS/Linux (Dev), **iOS/iPhone** (primäres Ziel), optional Web
- **Sprache der UI:** **Deutsch** (Standard)

---

## 1. Was = ein „richtiges Spiel"

Triple-Threat-Arena: 3 Kämpfer (Trump/Putin/Kim, satirisch), Free-for-all, letzter Stehender gewinnt.
Echtes Game-Loop statt Simulation:

- **Titel → Kampf → KO → Sieg → Rematch** (State Machine)
- Spieler steuert 1 Kämpfer (Touch auf iPhone / Tastatur am Desktop), KI steuert die anderen 2
- Echtzeit-3D-Kampf: Bewegung, Schläge (Jab/Heavy/Signature), Block, Ausweichen, HP, KO
- **Game-Feel:** Hit-Stop, Screen-Shake, Trefferpartikel, Kamerafahrten
- Deutsche HUD (Lebensbalken, Namen, Rundeninfo, Sieg-Screen)
- Sound (SFX + Crowd), optional Gemini-Kommentar via HTTPRequest

## 2. Wie = Architektur (code-first, Szenen größtenteils per GDScript gebaut)

```
godot/
  project.godot          # Config: de-Locale, Forward+ Renderer, Input-Map, iOS-Settings
  Main.tscn              # minimaler Root (Node3D + Game.gd) — Welt wird im Code gebaut
  scripts/
    Game.gd              # Orchestrator: Welt/Arena/Licht bauen, Match-State-Machine, Spawning
    Fighter.gd           # CharacterBody3D: Bewegung, Combat, HP, Treffer-Reaktion, Proc-Animation
    FighterBuilder.gd    # baut den Körper (Körperbau/Outfit/Kopf je Kämpfer aus Mesh-Primitives)
    ArenaBuilder.gd      # Oktagon-Ring, Seile, Tribünen + Zuschauer, Boden
    CameraDirector.gd    # mehrere Kameramodi, folgt der Action
    Hud.gd               # deutsche UI (CanvasLayer): HP, Namen, Runde, Sieg, Pause
    TouchControls.gd     # On-Screen-Pad + Buttons (iPhone)
    Audio.gd             # SFX/Crowd (CC0-Samples + prozedural)
  assets/audio/          # CC0-Samples (aus Iteration 1 übernommen)
  export_presets.cfg     # iOS-Preset (+ macOS/Web)
```

**Verifikation:** `godot --headless --quit-after 5 --path godot` (lädt/kompiliert, Parse-Fehler sichtbar);
GDScript-Check; später iOS-Export-Validierung. (Visuelle Prüfung headless eingeschränkt — finaler
Sicht-/Gerätetest auf deinem Mac/iPhone.)

## 3. Phasen

- **G0 Setup** — Godot-Projekt, project.godot (de, Renderer, Input), Main.tscn, lädt headless fehlerfrei.
- **G1 Welt** — Arena (Ring+Seile+Boden), Licht, **Tribünen mit Zuschauern**, Kamera.
- **G2 Kämpfer** — 3 Körper (distinkte Builds), Bewegung, Idle/Walk-Animation.
- **G3 Combat** — Schläge/Block/Dodge, HP, Treffer-Reaktion, KO, Hit-Stop/Shake/Partikel.
- **G4 KI + Match** — Gegner-KI, Runden/Sieg-Logik, State Machine.
- **G5 HUD (Deutsch)** — Lebensbalken, Namen, Runde, Titel-/Sieg-/Pause-Screen.
- **G6 Audio** — SFX, Crowd; optional Gemini-Kommentar.
- **G7 iPhone** — Touch-Steuerung, mobiles UI-Layout, iOS-Export-Preset + Build-Doku.
- **G8 Verify/Finish** — headless-Check grün, Commit, Doku schließen.

## 4. Status-Board ← laufend

| Phase | Status | Notiz |
|---|---|---|
| Engine-Entscheidung Godot | ✅ | 4.6.3 installiert |
| G0 Setup/Projekt lädt | ⬜ | |
| G1 Arena + Zuschauer + Kamera | ⬜ | |
| G2 Kämpfer-Modelle + Bewegung | ⬜ | |
| G3 Combat + Game-Feel | ⬜ | |
| G4 KI + Match/Runden | ⬜ | |
| G5 Deutsche HUD | ⬜ | |
| G6 Audio | ⬜ | |
| G7 iPhone (Touch + iOS-Export) | ⬜ | |
| G8 Verify + Commit | ⬜ | |

## 5. Offene Punkte aus Three.js-Iteration (übertragen ins Godot-Design)
- Kämpfe nicht in Sekunden vorbei → HP/Schaden/Kadenz von Anfang an balancieren (G3/G4).
- Kameras deutlich unterscheidbar → mehrere echte Modi (G1/CameraDirector).
- Zuschauer sichtbar → echte Tribünen mit Zuschauer-Meshes (G1).
- Bessere Animation → Bone-/Limb-Lerp, Hol-/Recoil-Bewegungen (G2/G3).
- Deutsch als Standard → de-Locale + alle Strings deutsch (G5).
- PR #1 (Three.js) Gemini-Findings: geparkt; bei Bedarf separat abarbeitbar.
