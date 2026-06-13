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

Tatsächliche Struktur (alles in 2 großen Skripten gebaut, kein separater Builder/Director):

```
godot/
  project.godot          # Config: de-Locale, gl_compatibility (iOS), Input-Map
  Main.tscn              # minimaler Root (Node3D + Game.gd) — Welt wird im Code gebaut
  scripts/
    Game.gd              # Orchestrator: Welt/Arena/Ring/Tribünen/Licht, EINE Broadcast-Kamera,
                         #   Match-State-Machine, Spawning, Audio-/Touch-Verdrahtung, --shot/--simfight
    Fighter.gd           # CharacterBody3D: prozeduraler Anzug-Körper + Foto-Gesicht (QuadMesh-Decal),
                         #   Bewegung, Combat, HP, KO, Limb-Animation; Signale ko/landed_hit/swung
    Hud.gd               # deutsche UI (CanvasLayer): HP-Balken, Namen, Banner, Treffer-Ticker
    TouchControls.gd     # virtueller Joystick + 5 Aktions-Buttons (auto-versteckt auf Desktop)
    Audio.gd             # SFX-Pool (whoosh/ui) + prozedurales Crowd-Brown-Noise, set_crowd(level)
    crop_faces.gd        # Einmal-Tool: schneidet Gesichts-Region aus <ref>.jpg -> <ref>_face.png
  assets/
    audio/               # whoosh.mp3, ui_click.ogg (CC0)
    refs/                # trump/putin/kim .jpg (Quelle) + *_face.png (Crops als Kopf-Textur)
  export_presets.cfg     # iOS-Preset (arm64, Landscape, Bundle de.alexle135.triplethreat)
```

**Verifikation (headless, ohne Gerät):**
- Parse/Class-Check: `godot --headless --import` (registriert `Fighter`, zeigt Script-Fehler).
- Sicht-Check: `godot --rendering-driver opengl3 -- --shot` → rendert deterministisches Portrait
  (3 Kämpfer frontal, frozen), speichert `/tmp/godot_shot.png` bei Frame 240, beendet sich.
- Balance: `godot --rendering-driver opengl3 -- --simfight` → alle 3 als KI, druckt
  `FIGHT_OVER winner=… elapsed=…s` und beendet sich. Mehrfach laufen für eine Verteilung.
- **Nur EINE Godot-Instanz gleichzeitig** (parallele teilen sich den Metal-Kontext → Hänger).

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

## 4. Status-Board ← laufend (Stand 2026-06-13)

| Phase | Status | Notiz |
|---|---|---|
| Engine-Entscheidung Godot | ✅ | 4.6.3 installiert |
| G0 Setup/Projekt lädt | ✅ | `--import` registriert `Fighter`, 0 Script-Fehler |
| G1 Arena + Zuschauer + Kamera | ✅ | 4 Tribünen-Tiers (MultiMesh), Oktagon-Ring mit Pfosten+3 Seilen, EINE Broadcast-Kamera (folgt Schwerpunkt, Distanz skaliert mit Spread) |
| G2 Kämpfer-Modelle + Bewegung | ✅ | Anzug-Körper (Jacke/Hemd/Krawatte/Handschuhe/Schuhe) + **Foto-Gesicht** als unshaded QuadMesh-Decal; distinkte Builds (Größe/Bauch/Haar) |
| G3 Combat + Game-Feel | ✅ | Jab/Heavy/Special/Block/Dodge, HP, Hit-Stop, Screen-Shake; Schaden global ×0.6 → ~17–20s 3-Wege-KI-Bout |
| G4 KI + Match/Runden | ✅ | Nächster-Gegner-KI, Free-for-all, letzter Stehender, State Machine intro→fight→over, Rematch (R) |
| G5 Deutsche HUD | ✅ | HP-Balken, Namen, „BEREIT?/GEWINNT!", Treffer-Ticker, Steuerungs-Hilfe |
| G6 Audio | ✅ | Verdrahtet: Gong@Start, play_hit@Treffer, play_whoosh@Schwung, Buzzer@KO, dynamische Crowd-Lautstärke (excite decay) |
| G7 iPhone (Touch + iOS-Export) | 🟡 | Touch (Joystick+Buttons) verdrahtet & auto-versteckt am Desktop; iOS-Preset fertig. **Offen:** Export-Templates laden (Editor, ~700 MB), Signing-Team-ID + Provisioning + App-Icons (Apple-Account nötig) |
| G8 Verify + Commit | 🔄 | headless-Checks grün; Commit der Godot-MVP läuft |

**Gelöste Hauptblocker:**
- **Kämpfer unsichtbar (vermeintl. Kamera-Problem):** Ursache war `_build_crowd()` — die Tier-Riser
  waren massive `CylinderMesh`-Vollscheiben (Radius bis 15,6) gestapelt bis y=3,1 und haben die
  Arena-Mitte von oben begraben. Fix: flache `TorusMesh`-Ringe → Mitte frei. **Kein Kamera-Bug.**
- **Magenta-Balken hinter Köpfen:** waren die emissiven Neon-Ring-Pfosten (`ff1e56`) — ersetzt durch
  gepolsterte Metall-Pfosten + dezente rote Seile.
- **Foto-Gesichter zu dunkel/getönt:** Spotlights tönten sie — Decal jetzt `SHADING_MODE_UNSHADED`.

## 5. Offene Punkte aus Three.js-Iteration
- ✅ Kämpfe nicht in Sekunden vorbei → Schaden ×0.6, messbar via `--simfight`.
- ✅ Kameras → bewusst auf EINE klare Broadcast-Kamera reduziert (User-Wunsch).
- ✅ Zuschauer sichtbar → 4 MultiMesh-Tribünen-Tiers.
- ✅ Bessere Animation → Limb-Lerp, Recoil, Walk/Attack/Block/Dodge-Posen.
- ✅ Deutsch als Standard.
- ⬜ PR #1 (Three.js) Gemini-Findings: geparkt; bei Bedarf separat abarbeitbar.

## 6. Nächste Schritte (Backlog)
- iOS: Export-Templates laden, App-Icons generieren, Team-ID setzen, `.ipa` bauen + auf iPhone testen.
- ✅ Tastatur-Hilfetext auf Touch ausgeblendet; ✅ Titel-Screen; ✅ Treffer-Partikel; ✅ Gesichts-Crops verbessert.
- Charakter-Auswahl-Screen (statt fixer 3er-Aufstellung).
- Optional: Gemini-Live-Kommentar via HTTPRequest.

### Aus Codex-Review (2026-06-13) übrig / verschoben
- **HUD-Layout iPhone-Aspect (#10):** HUD nutzt teils feste Pixel (HP-Balken x=24/456/888). Auf
  19.5:9-iPhones ohne passenden `stretch`-Mode clustert das links. Auf Anchor-/Container-Layout umstellen
  ODER `project.godot` content-scale (canvas_items, Basis 1280×720) prüfen/setzen.
- **Optional Partikel-Pooling (#5):** statt pro Treffer neue CPUParticles3D — 2–3 vorallozieren, `restart()`.
- **`--shot` Screenshot auf Device (#3):** `get_viewport().get_texture().get_image()` ist auf iOS/Metal
  unzuverlässig — irrelevant, da `--shot` nur Dev-Tool ist (im Spiel nie genutzt).
- Erledigt aus Review: time_scale-Reset, Per-Frame-Alloc-Reduktion, Crowd-Schatten aus, FX-Free-Timer.
