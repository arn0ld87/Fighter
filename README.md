<div align="center">

# 🥊 TRIPLE THREAT ARENA SIMULATOR 🥊

### *Cinematic 4K Web-Based 3D Combat Simulation with AI Sports Commentary*

![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.2-amber?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Type](https://img.shields.io/badge/Type-Parody%20Simulation-red?style=for-the-badge)

**An interactive, cinematic 3D fight simulator featuring three legendary fighters clashing in a high-octane triple-threat match inside a packed, brightly lit sports arena — complete with dynamic cameras, AI-driven commentary, and procedural skeletal animation.**

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Controls](#-controls) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack) • [Roadmap](#-roadmap)

</div>

---

## 🎬 Overview

**Triple Threat Arena Simulator** is a browser-based satirical combat simulation that pits three iconic world leaders in a cinematic MMA/Boxing showdown. Rendered entirely on an HTML5 Canvas using a custom 3D projection engine, the simulation features:

- 🎥 **6 dynamic camera modes** (Cinematic Orbit, Ringside Panorama, Dolly Spin, Fighter POV Headcams)
- 🤖 **Gemini AI-driven sports commentary** in real-time
- 🎬 **Choreography sequencer** for directed cinematic moments
- ⌨️ **Manual "Overlord Mode"** for keyboard-controlled avatars
- 🎨 **4 distinct arena themes** (Neon Vegas, Tokyo Sumo, Siberian Ice, Classic Stadium)
- 🦴 **Procedural skeletal animation** with hit-flash particles and slow-motion replays

> ⚠️ **DISCLAIMER:** This is a **parody/satire project** for educational and entertainment purposes. All characters are fictionalized representations. No political statements are intended.

---

## ✨ Features

### 🥋 The Three Fighters

| # | Fighter | Nickname | Build | Signature Move |
|---|---------|----------|-------|----------------|
| 🇺🇸 | **Donald Trump** | *The Orange Showman* | Tall Showman (1.90m / 102kg) | **GIGA MAGA HAYMAKER** |
| 🇷🇺 | **Vladimir Putin** | *The Slavic Strategist* | Lean Judo Master (1.70m / 72kg) | **KGB TACTICAL TRIP** |
| 🇰🇵 | **Kim Jong Un** | *The Sumo Titan* | Colossal Sumo (1.70m / 140kg) | **ICBM COLOSSAL SLAM** |

### 🎮 Combat Mechanics
- **JAB** — Quick lead strike (8 base damage)
- **HAYMAKER** — Heavy power punch (18 base damage + slow-motion)
- **JUDO_SWEEP** — Putin's signature trip (22 base damage)
- **SUMO_SLAM** — Kim's ground-pounding slam (28 base damage)
- **DODGE** — Speed-based evasion backstep
- **BLOCK** — Defense-based damage mitigation

### 📺 Broadcast Experience
- **HD Broadcast HUD** with live REC indicator, scanlines, and vignette
- **AI Commentary Desk** powered by Google Gemini 3.5 Flash
- **Crowd Decibel Meter** that responds to action intensity
- **Real-time ticker** of every strike in the ring
- **Web Speech API** integration for vocal announcer synthesis
- **Slow-motion replay** on critical hits (HAYMAKER, Signature moves)

### 🎥 Camera Modes
1. **Cinematic Orbiting** — Tracks combat action smoothly
2. **Wide Ringside Panorama** — Dramatic high view of Octagon
3. **Dolly Spinning Cradle** — Continuous 360° rotation
4. **POV: Fighter 1 Headcam** — Trump's first-person view
5. **POV: Fighter 2 Headcam** — Putin's first-person view
6. **POV: Fighter 3 Headcam** — Kim's first-person view

### 🎨 Arena Themes
- 🌃 **Neon Vegas Octagon** — Magenta & red lighting flares
- 🏯 **Tokyo Sumo Clash** — Warm golden spotlights
- ❄️ **Siberian Ice Pit** — Chilling cobalt lights
- 📺 **Classic Stadium** — Desaturated monochromatic 4K

---

## 🎬 Demo

> Visit the live app: [AI Studio Triple Threat](https://ai.studio/apps/42cec165-c2c6-409f-94bf-eff667d0939e)

### Screenshots

```
┌─────────────────────────────────────────────────────────────┐
│  📺 TRIPLE THREAT: LIVE ARENA CHAMPIONSHIP  [LIVE HD]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│         [3D Octagon with 3 Fighters + Volumetric Lights]    │
│                                                             │
│   ┌─Camera─┐ ┌─Manual─┐ ┌─Choreo─┐ ┌─Themes─┐              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🤖 AI BROADCAST  │  📊 CROWD METER  │  ⚡ LIVE TICKER     │
├─────────────────────────────────────────────────────────────┤
│  [F1: TRUMP]      │  [F2: PUTIN]     │  [F3: KIM]          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Installation

### Prerequisites
- **Node.js** ≥ 18.x
- **npm** or **yarn**
- A **Gemini API Key** (get one at [Google AI Studio](https://aistudio.google.com/))

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/Fighter-main.git
   cd Fighter-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your GEMINI_API_KEY
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

---

## 🎮 Controls

### Global Simulation
| Control | Action |
|---------|--------|
| `START BATTLE SIM` | Begin autonomous combat simulation |
| `FREEZE SIMULATION` | Pause the entire match |
| `HARD RESET` | Restore all fighters to 100% HP |
| `SLOW-MOTION REPLAY` | Toggle cinematic slow-mo |

### Manual Overlord Mode (Keyboard)
Activate by selecting a fighter in the **Fighter Controls** tab:

| Key | Action |
|-----|--------|
| `W` / `A` / `S` / `D` or `↑` `↓` `←` `→` | Walk around the ring |
| `Z` / `J` | Jab Strike |
| `X` / `K` | Sweep / Heavy Attack |
| `C` / `L` | Ultimate Signature Strike |
| `SPACE` | Perform Evasive Dodge backslide |

### Choreography Director
Build a custom sequence of combat moments:
1. Open **Fight Directing** tab
2. Add steps: Select actor → Move → Target
3. Click **DIRECT CHOREOGRAPHY SEQUENCE NOW**

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │
│  │ App.tsx     │ │ FighterStats│ │  ControlDashboard│   │
│  │ (Game Loop) │ │ (HP/Energy) │ │  (Camera/Theme)  │   │
│  └──────┬──────┘ └─────────────┘ └──────────────────┘   │
│         │                                                  │
│  ┌──────▼──────────┐  ┌──────────────────────────────┐   │
│  │ StadiumCanvas   │  │ CommentaryFeed               │   │
│  │ (3D Projection) │  │ (AI Commentary + Crowd)      │   │
│  │ • WebGL Canvas  │  │ • Web Speech API             │   │
│  │ • 30 FPS Loop   │  │ • Real-time ticker           │   │
│  └─────────────────┘  └──────────────────────────────┘   │
└────────────────────────┬─────────────────────────────────┘
                         │ POST /api/commentary
                         ▼
┌──────────────────────────────────────────────────────────┐
│              Backend (Express + Gemini SDK)               │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ server.ts                                           │ │
│  │  • Vite middleware (dev)                            │ │
│  │  • Static file serving (prod)                       │ │
│  │  • /api/commentary → Gemini 3.5 Flash               │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 3D Projection Engine
The simulation uses a **custom 3D-to-2D projection** implemented in pure Canvas 2D:
- **Yaw/Pitch/Zoom** camera rotation
- **Depth sorting** for proper Z-occlusion
- **Skeletal animation** with weighted joint interpolation
- **Particle system** for hit sparks and sweat
- **Screen shake** on critical impacts

---

## 🛠 Tech Stack

### Frontend
- **[React 19](https://react.dev/)** — UI framework
- **[TypeScript 5.8](https://www.typescriptlang.org/)** — Type safety
- **[Vite 6](https://vitejs.dev/)** — Build tool & dev server
- **[TailwindCSS 4](https://tailwindcss.com/)** — Utility-first styling
- **[Lucide React](https://lucide.dev/)** — Icon library
- **[Motion](https://motion.dev/)** — Animation library

### Backend
- **[Express 4](https://expressjs.com/)** — HTTP server
- **[Google Gemini AI](https://ai.google.dev/)** (`@google/genai`) — Commentary generation
- **[dotenv](https://github.com/motdotla/dotenv)** — Environment config
- **[tsx](https://github.com/esbuild-kit/tsx)** — TypeScript execution
- **[esbuild](https://esbuild.github.io/)** — Bundler

### Build & Dev Tools
- **TypeScript** compiler
- **Vite** dev server with HMR
- **esbuild** for server bundling

---

## 📂 Project Structure

```
Fighter-main/
├── 📁 assets/                    # Static assets
│   └── 📁 .aistudio/             # AI Studio metadata
├── 📁 src/
│   ├── 📁 components/
│   │   ├── 📄 CommentaryFeed.tsx # AI commentary UI
│   │   ├── 📄 ControlDashboard.tsx # Camera/Mode controls
│   │   ├── 📄 FighterStats.tsx   # HP bars & bio cards
│   │   └── 📄 StadiumCanvas.tsx  # 3D rendering engine
│   ├── 📄 App.tsx                # Main game loop & state
│   ├── 📄 main.tsx               # React entry point
│   ├── 📄 index.css              # Global styles
│   └── 📄 types.ts               # TypeScript interfaces
├── 📄 index.html                 # HTML entry
├── 📄 server.ts                  # Express + Gemini API
├── 📄 vite.config.ts             # Vite configuration
├── 📄 tsconfig.json              # TypeScript config
├── 📄 package.json               # Dependencies
├── 📄 metadata.json              # App metadata
├── 📄 .env.example               # Environment template
└── 📄 README.md                  # This file
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `GEMINI_API_KEY` | ✅ | Your Google Gemini API key for AI commentary |
| `APP_URL` | ❌ | The hosted URL of the applet (auto-injected in production) |
| `PORT` | ❌ | Server port (default: `3000`) |
| `NODE_ENV` | ❌ | `production` enables static file serving |

### Getting a Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API Key"**
3. Copy the key to your `.env.local`:
   ```
   GEMINI_API_KEY="your-key-here"
   ```

> 💡 **No API key?** No problem! The app gracefully degrades to a built-in sports desk fallback with classic commentator phrases.

---

## 🧪 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Vite HMR |
| `npm run build` | Build for production (client + server) |
| `npm start` | Run production build |
| `npm run clean` | Remove `dist/` and `server.js` |
| `npm run lint` | Type-check with TypeScript |

### Adding a New Fighter
1. Add a new entry to `INITIAL_FIGHTERS` in `src/App.tsx`
2. Add a new branch in `StadiumCanvas.tsx` for unique outfit rendering
3. Add a new entry in `FighterStats.tsx` avatar emoji mapping
4. Update the AI prompt in `server.ts` to describe the new fighter

---

## 🗺 Roadmap

- [ ] **Multiplayer mode** with WebRTC peer-to-peer matches
- [ ] **Replay system** with frame-by-frame scrubbing
- [ ] **Tournament bracket** for full championship progression
- [ ] **More fighters** (5+ roster with unique signature moves)
- [ ] **Custom arena builder** with editor mode
- [ ] **Steam / WebGL version** with native performance
- [ ] **Mobile touch controls** for iOS/Android
- [ ] **Twitch integration** for live streaming

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "AI commentary not loading" | Verify `GEMINI_API_KEY` is set in `.env.local` |
| "Slow performance" | Reduce canvas resolution or close other tabs |
| "Port 3000 in use" | Set `PORT=3001` before `npm run dev` |
| "Build fails" | Run `npm run clean && npm install` |

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

- **Google Gemini AI** — Powers the live sports commentary
- **Lucide** — Beautiful open-source icon set
- **Tailwind CSS** — Utility-first CSS framework
- **React & Vite teams** — Amazing developer experience

---

## ⚖️ Legal Disclaimer

This is a **parody/satire application** created for educational and entertainment purposes. All character likenesses are fictional and satirical. No real political statements, affiliations, or endorsements are implied. The application does not reflect the views, opinions, or beliefs of the developers regarding any real-world persons or events.

**Use at your own discretion and in compliance with applicable local laws and platform terms of service.**

---

<div align="center">

**© 2026 TRIPLE THREAT ATHLETIC SIMULATION BROADCAST INC.**

*Cosmic Shader • Dynamic Sports Engine v1.2*

Made with 🥊 and a lot of ⚡ by the community

</div>
