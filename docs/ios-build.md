# iOS-Build — Triple Threat Arena

## Voraussetzungen

- macOS mit **Xcode** (aktuellste stabile Version)
- **Apple-Developer-Account** (kostenpflichtig, ca. 99 €/Jahr)
- Godot 4.6 Editor auf demselben Mac

---

## 1. iOS Export-Templates installieren

Im Godot Editor: **Editor > Manage Export Templates**, dann die Templates für die verwendete Godot-Version herunterladen und installieren. Ohne Templates ist kein Export möglich.

---

## 2. Bundle-ID und Team-ID setzen

Datei `godot/export_presets.cfg` öffnen (oder im Editor: **Project > Export > iOS**):

- `application/bundle_identifier` — muss mit der App-ID im Apple Developer Portal übereinstimmen, z. B. `de.alexle135.triplethreat`.
- `application/signing_team_id` — die 10-stellige Team-ID aus dem [Apple Developer Portal](https://developer.apple.com/account) unter **Membership**.

---

## 3. Provisioning Profile und Signing

1. Im Apple Developer Portal eine **App ID** für `de.alexle135.triplethreat` anlegen.
2. Ein **Development** (Testen auf Gerät) oder **Distribution** (App Store) Provisioning Profile erstellen und herunterladen.
3. Das Profil in Xcode unter **Preferences > Accounts** importieren oder per Doppelklick installieren.
4. In `export_presets.cfg` die UUIDs eintragen:
   - `application/provisioning_profile_uuid_debug` (Development)
   - `application/provisioning_profile_uuid_release` (Distribution)

---

## 4. Export ausführen

### Option A — Godot Editor (GUI)

**Project > Export > iOS**, Preset auswählen, **Export Project** klicken. Godot erzeugt ein Xcode-Projekt unter `build/ios/`.

### Option B — Headless (CI/Terminal)

```bash
godot --headless --export-release "iOS" build/ios/triple-threat.ipa
```

Godot generiert dabei ein Xcode-Projekt-Verzeichnis, kein fertiges `.ipa`. Das `.ipa` entsteht erst nach dem Archivieren in Xcode (siehe Schritt 5).

---

## 5. Xcode-Projekt öffnen und deployen

1. `build/ios/triple-threat.xcodeproj` (oder `.xcworkspace`) in **Xcode** öffnen.
2. Unter **Signing & Capabilities** Team und Provisioning Profile prüfen.
3. iPhone per USB verbinden, Gerät als Ziel auswählen, **Run** (▶) drücken — oder **Product > Archive** für einen App-Store-Build.

---

## Hinweise zum Renderer

Das Spiel verwendet den **gl_compatibility**-Renderer, der auf iPhones via Metal läuft. Keine weiteren Renderer-Umstellungen nötig. Die Preset-Option `rendering/renderer=2` ist bereits gesetzt.

---

## Häufige Fehler

| Problem | Lösung |
|---|---|
| „No export template found" | Schritt 1 wiederholen, Godot-Version muss exakt übereinstimmen |
| Code-Signing-Fehler in Xcode | Team-ID und Provisioning Profile prüfen |
| App startet nicht auf Gerät | Gerät unter **Devices and Simulators** als vertrauenswürdig markieren |
