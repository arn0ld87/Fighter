import React, { useState } from "react";
import { CameraMode, CombatMoveType } from "../types";
import { 
  Play, 
  Pause, 
  Video, 
  Zap, 
  Sparkles, 
  Dices, 
  RefreshCw, 
  Sliders, 
  Map, 
  Clock, 
  Compass, 
  Film,
  Send,
  Volume2,
  Music
} from "lucide-react";
import type { SoundManager } from "../audio/SoundManager";

interface ControlDashboardProps {
  sound: SoundManager | null;
  isSimulating: boolean;
  setIsSimulating: (b: boolean) => void;
  cameraMode: CameraMode;
  setCameraMode: (m: CameraMode) => void;
  isSlowMotion: boolean;
  setIsSlowMotion: (b: boolean) => void;
  arenaTheme: "neon_vegas" | "tokyo_sumo" | "siberian_cage" | "retro_cinematic";
  setArenaTheme: (t: "neon_vegas" | "tokyo_sumo" | "siberian_cage" | "retro_cinematic") => void;
  activeControllableFighterId: number | null;
  setActiveControllableFighterId: (id: number | null) => void;
  triggerManualMove: (move: CombatMoveType) => void;
  triggerChoreographedMoves: (sequence: { fighterId: number; move: CombatMoveType; targetId: number }[]) => void;
  resetSimulation: () => void;
}

export const ControlDashboard: React.FC<ControlDashboardProps> = ({
  sound,
  isSimulating,
  setIsSimulating,
  cameraMode,
  setCameraMode,
  isSlowMotion,
  setIsSlowMotion,
  arenaTheme,
  setArenaTheme,
  activeControllableFighterId,
  setActiveControllableFighterId,
  triggerManualMove,
  triggerChoreographedMoves,
  resetSimulation
}) => {
  const [activeTab, setActiveTab] = useState<"camera" | "manual" | "choreography" | "themes" | "audio">("camera");

  // Audio mixer UI state (mirrors the SoundManager's persisted volumes).
  const [vol, setVol] = useState(() => ({
    master: sound?.getVolume("master") ?? 0.8,
    sfx: sound?.getVolume("sfx") ?? 0.9,
    crowd: sound?.getVolume("crowd") ?? 0.5,
    music: sound?.getVolume("music") ?? 0.3,
  }));
  const [musicOn, setMusicOn] = useState(false);
  const setBusVolume = (bus: "master" | "sfx" | "crowd" | "music", value: number) => {
    sound?.init();
    sound?.setVolume(bus, value);
    setVol((v) => ({ ...v, [bus]: value }));
  };
  const toggleMusic = () => {
    if (!sound) return;
    sound.init();
    if (musicOn) { sound.stopMusic(); setMusicOn(false); }
    else { sound.startMusic(); setMusicOn(true); }
  };
  
  // Custom script timeline orchestrator state
  const [steps, setSteps] = useState([
    { fighterId: 3, move: "SUMO_SLAM" as CombatMoveType, targetId: 1 },
    { fighterId: 2, move: "JUDO_SWEEP" as CombatMoveType, targetId: 3 },
    { fighterId: 1, move: "HAYMAKER" as CombatMoveType, targetId: 2 }
  ]);

  const addStep = () => {
    setSteps(prev => [...prev, { fighterId: 1, move: "JAB" as CombatMoveType, targetId: 2 }]);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: string, val: any) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: val } : s));
  };

  const playChoreography = () => {
    // Temporarily trigger choreography sequences block
    triggerChoreographedMoves(steps);
  };

  return (
    <div
      className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-md"
      id="arena-controllers"
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("button")) sound?.playUi();
      }}
    >
      {/* Control Pane Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/80 p-1">
        {[
          { id: "camera", label: "Cams & Feeds", icon: Video },
          { id: "manual", label: "Fighter Controls", icon: Compass },
          { id: "choreography", label: "Fight Directing", icon: Film },
          { id: "themes", label: "Arena Setup", icon: Map },
          { id: "audio", label: "Audio Mixer", icon: Volume2 }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-amber-400 text-slate-950 shadow"
                  : "text-zinc-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Simulation Global State Controls */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex flex-wrap gap-3 items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <button
            id="btn-play-pause-simulation"
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-all ${
              isSimulating
                ? "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            }`}
          >
            {isSimulating ? <Pause size={14} /> : <Play size={14} />}
            <span>{isSimulating ? "FREEZE SIMULATION" : "START BATTLE SIM"}</span>
          </button>
          
          <button
            id="btn-restart-simulation"
            onClick={resetSimulation}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-700 transition-all font-semibold"
          >
            <RefreshCw size={13} />
            <span className="hidden md:inline">HARD RESET</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-zinc-400 select-none">
            <input
              type="checkbox"
              checked={isSlowMotion}
              onChange={(e) => setIsSlowMotion(e.target.checked)}
              className="w-4 h-4 rounded border-slate-800 text-amber-400 focus:ring-amber-400 focus:ring-offset-slate-900 bg-slate-950"
            />
            <span className="flex items-center gap-1"><Clock size={13} className="text-amber-400" /> SLOW-MOTION REPLAY</span>
          </label>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="p-4 min-h-[175px]">
        {/* TAB 1: Camera Angle Controls */}
        {activeTab === "camera" && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs text-zinc-400 leading-normal mb-1">
              Set the 3D projection camera angles to change the spectator perspective inside the cage:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
              {[
                { id: "CINEMATIC_FOLLOW", label: "Cinematic Orbiting", desc: "Tracks best clashing combat action smoothly" },
                { id: "RINGSIDE", label: "Wide Ringside Panorama", desc: "Dramatic high view of the entire Octagon" },
                { id: "CRADLE_ROTATING", label: "Dolly Spinning Cradle", desc: "Rotates and zooms around fighters continuously" },
                { id: "FIGHTER_1_POV", label: "POV: Fighter 1 Headcam", desc: "Viewpoint of Tall American (F1)" },
                { id: "FIGHTER_2_POV", label: "POV: Fighter 2 Headcam", desc: "Viewpoint of Slavic Master (F2)" },
                { id: "FIGHTER_3_POV", label: "POV: Fighter 3 Headcam", desc: "Viewpoint of Sumo Titan (F3)" }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setCameraMode(opt.id as CameraMode)}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all group ${
                    cameraMode === opt.id
                      ? "border-amber-400 bg-amber-400/5 text-amber-300"
                      : "border-slate-800 bg-slate-950/20 text-zinc-300 hover:border-slate-700 hover:bg-slate-950/40"
                  }`}
                >
                  <span className="font-bold block text-[11px] group-hover:text-white">{opt.label}</span>
                  <span className="text-[10px] text-zinc-500 mt-1 block leading-normal">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Audio Broadcast Mixer */}
        {activeTab === "audio" && (
          <div className="space-y-3 animate-fade-in font-mono text-xs">
            <p className="text-zinc-400 leading-normal mb-1">
              Broadcast audio mix. Combat sounds are synthesized live via Web Audio — crowd swells with the action.
            </p>
            {([
              { bus: "master", label: "Master", icon: Volume2 },
              { bus: "sfx", label: "Combat SFX", icon: Zap },
              { bus: "crowd", label: "Crowd", icon: Sparkles },
              { bus: "music", label: "Music", icon: Music },
            ] as const).map(({ bus, label, icon: Icon }) => (
              <div key={bus} className="flex items-center gap-3">
                <span className="w-24 flex items-center gap-1.5 text-zinc-300">
                  <Icon size={13} className="text-amber-400" />
                  {label}
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={vol[bus]}
                  onChange={(e) => setBusVolume(bus, parseFloat(e.target.value))}
                  className="flex-1 accent-amber-400"
                />
                <span className="w-9 text-right text-zinc-500">{Math.round(vol[bus] * 100)}</span>
              </div>
            ))}
            <button
              onClick={toggleMusic}
              className={`mt-1 flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all font-semibold ${
                musicOn
                  ? "bg-amber-400 text-slate-950 border-amber-400"
                  : "bg-slate-950/30 text-zinc-300 border-slate-800 hover:border-slate-700"
              }`}
            >
              <Music size={13} /> {musicOn ? "MUSIC: ON" : "MUSIC: OFF"}
            </button>
          </div>
        )}

        {/* TAB 2: Dynamic Controlled Inputs (Take control over fighter) */}
        {activeTab === "manual" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
              <div className="text-xs">
                <span className="block font-bold text-white mb-0.5">MANUAL AVATAR OVERLORD MODULE</span>
                <span className="text-zinc-400">Click a fighter stats profile card OR choose below to take physical control:</span>
              </div>
              <div className="flex gap-2 font-mono text-xs">
                {[
                  { id: 1, name: "Trump (F1)" },
                  { id: 2, name: "Putin (F2)" },
                  { id: 3, name: "Kim (F3)" }
                ].map((fighter) => (
                  <button
                    key={fighter.id}
                    onClick={() => setActiveControllableFighterId(activeControllableFighterId === fighter.id ? null : fighter.id)}
                    className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                      activeControllableFighterId === fighter.id
                        ? "bg-amber-400 text-slate-950 border-amber-300 font-extrabold"
                        : "bg-slate-950/40 text-zinc-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    F{fighter.id} &bull; {fighter.name}
                  </button>
                ))}
              </div>
            </div>

            {activeControllableFighterId ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Visual Action Button triggers */}
                <div>
                  <span className="block font-sans font-semibold text-xs text-zinc-400 mb-2">QUICK MOVE TRIGGERS</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <button
                      onClick={() => triggerManualMove("JAB")}
                      className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow"
                    >
                      <Zap size={13} /> Left Jab Punch
                    </button>
                    <button
                      onClick={() => triggerManualMove("HAYMAKER")}
                      className="bg-red-500 hover:bg-red-400 text-slate-950 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow"
                    >
                      <Zap size={13} /> Heavy Haymaker
                    </button>
                    <button
                      onClick={() => triggerManualMove(activeControllableFighterId === 3 ? "SUMO_SLAM" : "JUDO_SWEEP")}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow"
                    >
                      <Sparkles size={13} /> {activeControllableFighterId === 3 ? "Colossal Slam" : "Judo Sweep"}
                    </button>
                    <button
                      onClick={() => triggerManualMove("DODGE")}
                      className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow"
                    >
                      <Compass size={13} /> Eusive Dodge
                    </button>
                  </div>
                </div>

                {/* Keyboard mapping instructions */}
                <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-[11px] font-mono leading-relaxed text-zinc-400">
                  <span className="font-bold text-slate-200 block mb-1">KEYBOARD OVERLORD SHORTCUTS (BINDINGS)</span>
                  <p>When the app window is focused, use standard keys directly:</p>
                  <ul className="list-disc pl-4 space-y-1 mt-1 text-[10px]">
                    <li><kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[9px] border border-slate-700">W</kbd> / <kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[9px] border border-slate-700">A</kbd> / <kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[9px] border border-slate-700">S</kbd> / <kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[9px] border border-slate-700">D</kbd> or Arrows: Walk around ring</li>
                    <li><kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[9px] border border-slate-700">Z</kbd> / <kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[9px] border border-slate-700">J</kbd>: Jab Strike</li>
                    <li><kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[9px] border border-slate-700">X</kbd> / <kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[9px] border border-slate-700">K</kbd>: Sweep / Heavy Attack</li>
                    <li><kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[9px] border border-slate-700">C</kbd> / <kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[9px] border border-slate-700">L</kbd>: Ultimate Signature Strike!</li>
                    <li><kbd className="bg-slate-800 text-white px-1 py-0.5 rounded text-[9px] border border-slate-700">SPACE</kbd>: Perform Dodge backslide</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-slate-800 rounded-lg">
                <Sliders className="text-zinc-600 mb-2" size={24} />
                <span className="text-xs font-semibold text-zinc-400">NO FIGHTER IS CURRENTLY SELECTED UNDER DIRECT OVERLORD MODE</span>
                <p className="text-[10px] text-zinc-500 max-w-[340px] mt-1 leading-normal">
                  Click on one of the fighters above or choose a nickname on the top right to take complete joystick and keyboard controls!
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Fight directing choreography sequence tools */}
        {activeTab === "choreography" && (
          <div className="space-y-4 animate-fade-in text-xs">
            <div className="flex justify-between items-center">
              <div>
                <span className="block font-bold text-white uppercase leading-none">Choreography Sequence Producer</span>
                <span className="text-[10px] text-zinc-500">Design a chronological set of movie moments for the fighters:</span>
              </div>
              <button 
                onClick={addStep}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1 rounded inline-flex items-center gap-1 text-[11px] font-mono"
              >
                + ADD MOMENT
              </button>
            </div>

            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-wrap gap-2 items-center bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 font-mono text-xs">
                  <span className="text-zinc-500 font-bold">#{idx + 1}</span>
                  
                  {/* Actor selector */}
                  <select 
                    value={step.fighterId}
                    onChange={(e) => updateStep(idx, "fighterId", parseInt(e.target.value))}
                    className="bg-slate-900 border border-slate-850 px-1 py-0.5 rounded text-white"
                  >
                    <option value={1}>F1: Trump (Red)</option>
                    <option value={2}>F2: Putin (Blue)</option>
                    <option value={3}>F3: Kim (Black)</option>
                  </select>

                  <span className="text-zinc-500">will activate</span>

                  {/* Move Selector */}
                  <select 
                    value={step.move}
                    onChange={(e) => updateStep(idx, "move", e.target.value as CombatMoveType)}
                    className="bg-slate-900 border border-slate-850 px-1 py-0.5 rounded text-amber-300"
                  >
                    <option value="JAB">Lively Jab</option>
                    <option value="HAYMAKER">Heavy Haymaker</option>
                    <option value="JUDO_SWEEP">Judo Foot Sweep</option>
                    <option value="SUMO_SLAM">Sumo Body Slam</option>
                    <option value="DODGE">Backward Dodge</option>
                  </select>

                  <span className="text-zinc-500">against</span>

                  {/* Target Selector */}
                  <select 
                    value={step.targetId}
                    onChange={(e) => updateStep(idx, "targetId", parseInt(e.target.value))}
                    className="bg-slate-900 border border-slate-850 px-1 py-0.5 rounded text-white"
                  >
                    <option value={1}>F1: Trump</option>
                    <option value={2}>F2: Putin</option>
                    <option value={3}>F3: Kim</option>
                  </select>

                  <button 
                    onClick={() => removeStep(idx)}
                    className="ml-auto text-red-500 hover:text-red-400 font-bold px-1"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={playChoreography}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-mono uppercase tracking-wider"
            >
              <Play size={14} className="fill-current" />
              <span>DIRECT CHOREOGRAPHY SEQPENCE NOW</span>
            </button>
          </div>
        )}

        {/* TAB 4: Arena Theme configurations */}
        {activeTab === "themes" && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs text-zinc-400 leading-normal mb-1">
              Tailor the sports stadium aesthetics, light schemes, and floor boundary colors:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              {[
                { id: "neon_vegas" as const, label: "NEON VEGAS OCTAGON", col: "bg-red-500", desc: "Violent pink and magenta lighting flares" },
                { id: "tokyo_sumo" as const, label: "TOKYO SUMO CLASH", col: "bg-yellow-500", desc: "Warm rich golden spotlights" },
                { id: "siberian_cage" as const, label: "SIBERIAN ICE PIT", col: "bg-sky-500", desc: "Chilling cobalt lights over thick gate" },
                { id: "retro_cinematic" as const, label: "CLASSIC STADIUM", col: "bg-zinc-500", desc: "Desaturated moody monochromatic 4K" }
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setArenaTheme(theme.id)}
                  className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    arenaTheme === theme.id
                      ? "border-amber-400 bg-amber-400/5 text-amber-300"
                      : "border-slate-800 bg-slate-950/20 text-zinc-300 hover:border-slate-700 hover:bg-slate-950/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`w-2 h-2 rounded-full ${theme.col}`} />
                    <span className="font-bold block text-[10px] uppercase">{theme.label}</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 leading-normal block">{theme.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
