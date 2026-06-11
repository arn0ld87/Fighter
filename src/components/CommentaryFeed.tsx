import React, { useState, useEffect } from "react";
import { FightEvent } from "../types";
import { 
  Megaphone, 
  Volume2, 
  VolumeX, 
  TrendingUp, 
  Activity, 
  Cpu, 
  MessageSquare,
  Sparkles
} from "lucide-react";

interface CommentaryFeedProps {
  events: FightEvent[];
  aiCommentary: string;
  aiHeadline: string;
  isAiGenerating: boolean;
  crowdMeter: number;
  triggerVoiceAnnounce: (text: string) => void;
}

export const CommentaryFeed: React.FC<CommentaryFeedProps> = ({
  events,
  aiCommentary,
  aiHeadline,
  isAiGenerating,
  crowdMeter,
  triggerVoiceAnnounce
}) => {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0.85);

  // Trigger vocal synthesis whenever a new AI commentary block arrives
  useEffect(() => {
    if (voiceEnabled && aiCommentary && !isAiGenerating) {
      triggerVoiceAnnounce(aiCommentary);
    }
  }, [aiCommentary, isAiGenerating, voiceEnabled, triggerVoiceAnnounce]);

  // Clean raw commentary with parent voice overrides
  const handleManualVoiceSpeak = () => {
    triggerVoiceAnnounce(aiCommentary || "Ringside commentary buffer currently empty. Initiating next combat round sequence.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="arena-commentary-station">
      
      {/* COLUMN 1: AI Sports Desk & Headline Broadcast */}
      <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between backdrop-blur-md relative overflow-hidden">
        
        {/* Glow overlay */}
        <div className="absolute -top-3 right-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-3xl" />

        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
              <Megaphone size={14} className="text-amber-400 animate-bounce" />
              <span>AI BROADCAST SPECS</span>
            </span>

            {/* Voice announcer controls */}
            <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400 select-none">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 bg-slate-950"
                />
                <span className="flex items-center gap-1">
                  {voiceEnabled ? <Volume2 size={12} className="text-emerald-400" /> : <VolumeX size={12} />}
                  <span>SPEECH SYNTH VOICE</span>
                </span>
              </label>

              {voiceEnabled && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={voiceVolume}
                  onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              )}
            </div>
          </div>

          {/* Running Headline banner */}
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-lg mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black font-mono px-1.5 py-0.5 rounded leading-none">
                BREAKING
              </span>
              <span className="text-xs font-semibold text-zinc-200 tracking-tight font-sans line-clamp-1 uppercase">
                {aiHeadline || "TRIPLE THREAT CLASH UNDER SPORTS FLOODLIGHTS"}
              </span>
            </div>
            
            <span className="text-[10px] font-mono text-zinc-500 animate-pulse hidden md:inline">
              LIVE BROADCAST
            </span>
          </div>

          {/* Core AI Commentary paragraph box */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 min-h-[100px] flex flex-col justify-between">
            {isAiGenerating ? (
              <div className="space-y-2 py-3 animate-pulse">
                <div className="h-3 bg-slate-800 rounded w-11/12" />
                <div className="h-3 bg-slate-800 rounded w-5/6" />
                <div className="h-3 bg-slate-800 rounded w-4/5" />
              </div>
            ) : (
              <p className="text-zinc-300 font-sans text-sm leading-relaxed antialiased">
                {aiCommentary || "Simulation loaded. Start the match using the green button or take absolute direct control over one of the fighters above to prompt high-octane live ring commentary."}
              </p>
            )}

            {/* Speaking button selector */}
            {!isAiGenerating && aiCommentary && (
              <button
                onClick={handleManualVoiceSpeak}
                className="mt-3 inline-flex self-start items-center gap-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-zinc-300 text-[10px] font-mono px-2 py-1 rounded transition-all hover:text-white"
              >
                <Volume2 size={11} /> Speak commentary transcript
              </button>
            )}
          </div>
        </div>

        {/* Gemini Credits */}
        <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase border-t border-slate-800/60 pt-3">
          <span className="flex items-center gap-1">
            <Cpu size={12} className="text-sky-400" />
            <span>AI ENGINE: gemini-3.5-flash</span>
          </span>

          <span className="flex items-center gap-1 font-semibold text-emerald-400">
            <Sparkles size={11} className="animate-pulse" />
            <span>REAL-TIME ANALYSIS FEED</span>
          </span>
        </div>
      </div>

      {/* COLUMN 2: Arena Crowd excitement meter & Physical ticker logs */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between backdrop-blur-md">
        <div>
          <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono border-b border-slate-800 pb-2 mb-3">
            <Activity size={14} className="text-sky-400" />
            <span>CROWD DECIBEL ENERGY</span>
          </span>

          {/* Crowd meters */}
          <div className="space-y-2 mb-4 font-mono text-xs text-zinc-400">
            <div className="flex justify-between">
              <span>ARENA VOLUME</span>
              <span className="font-bold text-white">{crowdMeter} db</span>
            </div>
            
            <div className="h-3 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-sky-400 via-amber-400 to-red-500 rounded-lg transition-all duration-300"
                style={{ width: `${crowdMeter}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>ECO FRIENDLY CROWD</span>
              <span>BOILING POINT CAGE ({crowdMeter > 80 ? "SENSATIONAL" : "COZY"})</span>
            </div>
          </div>

          {/* Live Action Ticker log lines */}
          <span className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 font-mono uppercase tracking-wider mb-2">
            <MessageSquare size={12} /> Live Strike Chronicles:
          </span>

          <div className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-2 h-[105px] overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-thin">
            {events.length === 0 ? (
              <span className="text-zinc-600 italic block py-4 text-center">No ringside matches recorded yet...</span>
            ) : (
              [...events].reverse().slice(0, 15).map((e) => (
                <div key={e.id} className="border-b border-slate-900 pb-1.5 last:border-0">
                  <div className="flex justify-between items-center text-zinc-500">
                    <span>{e.timestamp}</span>
                    {e.isSpecial && (
                      <span className="text-amber-400 font-bold text-[8px] border border-amber-400/30 px-1 rounded bg-amber-400/5 uppercase leading-none">
                        CRITICAL HIT
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-300 leading-normal mt-0.5">
                    <span className="font-bold text-slate-100 uppercase">{e.fighterName}</span>: {e.actionText} 
                    {e.damage > 0 && <span className="text-red-400 font-extrabold ml-1 font-mono">-{e.damage} HP</span>}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
