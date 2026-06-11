import React from "react";
import { Fighter } from "../types";
import { Shield, Sparkles, Swords, Trophy, Zap } from "lucide-react";

interface FighterStatsProps {
  fighters: Fighter[];
  activeControllableFighterId: number | null;
  setActiveControllableFighterId: (id: number | null) => void;
}

export const FighterStats: React.FC<FighterStatsProps> = ({
  fighters,
  activeControllableFighterId,
  setActiveControllableFighterId
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="fighter-arena-profiles">
      {fighters.map((f) => {
        const isControlled = activeControllableFighterId === f.id;
        const hpPercent = Math.max(0, (f.hp / f.maxHp) * 100);
        
        return (
          <div
            id={`fighter-card-${f.id}`}
            key={f.id}
            onClick={() => {
              if (f.isKnoctout) return;
              setActiveControllableFighterId(isControlled ? null : f.id);
            }}
            className={`cursor-pointer transition-all duration-300 relative rounded-xl border p-4 select-none overflow-hidden bg-slate-900/60 backdrop-blur-md ${
              f.isKnoctout 
                ? "border-red-950/40 bg-zinc-950/85 opacity-55 animate-pulse" 
                : isControlled
                ? "border-amber-400 bg-amber-500/5 shadow-[0_0_15px_rgba(251,191,36,0.15)] scale-[1.02]"
                : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 hover:scale-[1.01]"
            }`}
          >
            {/* Fighter Header Backdrop Glow banner */}
            <div 
              className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-15"
              style={{ backgroundColor: f.shortsColor }}
            />

            {/* Controlled override banner tag */}
            {isControlled && !f.isKnoctout && (
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-400/15 text-amber-400 text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-400/30">
                <Zap size={10} className="fill-current" />
                <span>CONTROL OVERLORD</span>
              </div>
            )}

            {f.isKnoctout && (
              <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">
                TECHNICAL K.O.
              </div>
            )}

            {/* Fighter Basic Biography */}
            <div className="flex items-start gap-3">
              {/* Profile icon with custom Parody Avatar badge */}
              <div 
                className="w-12 h-12 flex flex-col items-center justify-center rounded-lg border text-white font-black font-mono shadow-md relative shrink-0"
                style={{ 
                  backgroundColor: f.skinColor + "33", 
                  borderColor: f.shortsColor,
                  color: f.shortsColor
                }}
              >
                <span className="text-xl">
                  {f.id === 1 ? "👱‍♂️" : (f.id === 2 ? "🥋" : "🕶️")}
                </span>
                <span className="text-[10px] absolute -bottom-1 -right-1 bg-slate-950 px-1 border border-slate-800 rounded leading-none font-mono">
                  {f.id === 1 ? "🇺🇸" : (f.id === 2 ? "🇷🇺" : "🇰🇵")}
                </span>
              </div>
              <div className="min-w-0">
                <h4 className="font-sans font-black text-white text-base leading-tight tracking-tight flex items-center gap-1.5">
                  <span>{f.name}</span>
                  <span className="text-xs shrink-0 opacity-80" title="Country Flag">
                    {f.id === 1 ? "🇺🇸" : (f.id === 2 ? "🇷🇺" : "🇰🇵")}
                  </span>
                </h4>
                <p className="font-mono text-zinc-400 text-[11px] mt-0.5 uppercase tracking-wider truncate">
                  &ldquo;{f.nickname}&rdquo; &bull; {f.age} Years Old
                </p>
              </div>
            </div>

            {/* Physical Specs banner bar */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 mt-3 font-mono text-center">
              <div>
                <span className="block text-[9px] text-zinc-500 uppercase">Height</span>
                <span className="text-xs font-bold text-slate-300">{f.height.toFixed(2)}m</span>
              </div>
              <div>
                <span className="block text-[9px] text-zinc-500 uppercase">Weight</span>
                <span className="text-xs font-bold text-slate-300">{f.weight}kg</span>
              </div>
              <div>
                <span className="block text-[9px] text-zinc-500 uppercase">Build</span>
                <span className="text-xs font-bold truncate text-slate-300 uppercase block">{f.build}</span>
              </div>
            </div>

            {/* Vital Bars */}
            <div className="space-y-2 mt-4">
              <div>
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-1">
                  <span className="flex items-center gap-1"><Swords size={11} /> HEALTH (VITALITY)</span>
                  <span className="font-bold text-white">{Math.floor(f.hp)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full transition-all duration-300 rounded-full"
                    style={{ 
                      width: `${hpPercent}%`,
                      backgroundColor: hpPercent > 50 ? "#10b981" : (hpPercent > 20 ? "#f59e0b" : "#ef4444")
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-1">
                  <span className="flex items-center gap-1"><Zap size={11} /> MOVE COOL DOWN</span>
                  <span className="font-bold text-white">{Math.floor(f.energy)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full transition-all duration-300 rounded-full bg-sky-500"
                    style={{ width: `${f.energy}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Visual Attributes Matrix representation */}
            <div className="grid grid-cols-2 gap-2 mt-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-1">
                <span className="text-zinc-500">Punch Power:</span>
                <span className="text-amber-400 font-bold">{f.power} / 10</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-1">
                <span className="text-zinc-500">Flee Speed:</span>
                <span className="text-sky-400 font-bold">{f.speed} / 10</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-1">
                <span className="text-zinc-500">Reach Index:</span>
                <span className="text-purple-400 font-bold">{f.reach} / 10</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-1">
                <span className="text-zinc-500">Defense/Guard:</span>
                <span className="text-emerald-400 font-bold">{f.defense} / 10</span>
              </div>
            </div>

            {/* Special Moves indicator footer */}
            <div className="mt-4 flex items-center justify-between bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                <Shield size={11} className="text-amber-400" /> SIGNATURE STRIKE:
              </span>
              <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400 fill-current animate-pulse" />
                {f.specialMoveName}
              </span>
            </div>

            {/* Fighter Description Paragraph */}
            <div className="mt-2 text-[10px] text-zinc-400 line-clamp-2 italic font-sans leading-relaxed border-t border-slate-800 pt-2">
              {f.description}
            </div>

            {/* Scores tracker */}
            <div className="mt-2.5 flex items-center justify-between font-mono text-[9px] text-zinc-500 uppercase tracking-widest bg-slate-950/20 px-1">
              <span className="flex items-center gap-1"><Trophy size={9} /> Striking: {f.strikeCount}</span>
              <span>Dodge: {f.dodgeCount}</span>
              <span className="text-emerald-400 font-bold">K.O. Wins: {f.score}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
