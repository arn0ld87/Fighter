import { useState, useEffect, useRef } from "react";
import { Fighter, CombatMoveType, FightEvent, Particle3D, CameraMode, Vector3D } from "./types";
import { StadiumCanvas } from "./components/StadiumCanvas";
import { FighterStats } from "./components/FighterStats";
import { ControlDashboard } from "./components/ControlDashboard";
import { CommentaryFeed } from "./components/CommentaryFeed";
import { 
  Tv, 
  Swords, 
  Users, 
  ShieldAlert, 
  Sparkles, 
  Volume2, 
  Info 
} from "lucide-react";

const INITIAL_FIGHTERS: Fighter[] = [
  {
    id: 1,
    name: "Donald Trump",
    nickname: "The Orange Showman",
    age: 79,
    height: 1.90,
    weight: 102,
    build: "Tall Showman",
    skinColor: "#ffa254", // Distinct orange skin
    hairStyle: "Combed blond swoosh",
    shortsColor: "#dc2626", // Red shorts
    description: "A theatrical showman with ultra long punch reach and a heavy theatrical haymaker swing. Pimps up the stadium crowds with his theatrical comb-backs.",
    maxHp: 100,
    hp: 100,
    energy: 100,
    power: 7,
    speed: 4,
    reach: 9,
    defense: 5,
    specialMoveName: "GIGA MAGA HAYMAKER",
    pos: { x: -1.5, y: 0, z: 0 },
    targetPos: { x: -1.5, y: 0, z: 0 },
    angleYaw: 0,
    currentMove: "IDLE",
    moveProgress: 0,
    moveTargetId: null,
    isKnoctout: false,
    score: 0,
    strikeCount: 0,
    dodgeCount: 0,
    skeleton: {} as any
  },
  {
    id: 2,
    name: "Vladimir Putin",
    nickname: "The Slavic Strategist",
    age: 73,
    height: 1.70,
    weight: 72,
    build: "Lean Judo Master",
    skinColor: "#fed7aa", // Pale skin
    hairStyle: "Shaved steel grey",
    shortsColor: "#2563eb", // Blue shorts
    description: "An ice-cold calculation master who uses quick judo sweeps, rapid backstep dodges, and icy stares to trip larger opponents with tactical poise.",
    maxHp: 100,
    hp: 100,
    energy: 100,
    power: 5,
    speed: 9,
    reach: 5,
    defense: 7,
    specialMoveName: "KGB TACTICAL TRIP",
    pos: { x: 1.5, y: 0, z: -1.0 },
    targetPos: { x: 1.5, y: 0, z: -1.0 },
    angleYaw: Math.PI * 0.8,
    currentMove: "IDLE",
    moveProgress: 0,
    moveTargetId: null,
    isKnoctout: false,
    score: 0,
    strikeCount: 0,
    dodgeCount: 0,
    skeleton: {} as any
  },
  {
    id: 3,
    name: "Kim Jong Un",
    nickname: "The Sumo Titan",
    age: 42,
    height: 1.70,
    weight: 140,
    build: "Colossal Sumo",
    skinColor: "#fef08a", // Light Asian skin
    hairStyle: "Black topknot bun",
    shortsColor: "#171717", // Black shorts
    description: "A powerlifter sumo powerhouse with thick fat padding that absorbs strikes like solid masonry, and a colossal ICBM ground gravity slam.",
    maxHp: 100,
    hp: 100,
    energy: 100,
    power: 9,
    speed: 3,
    reach: 4,
    defense: 8,
    specialMoveName: "ICBM COLOSSAL SLAM",
    pos: { x: 0, y: 0, z: 1.5 },
    targetPos: { x: 0, y: 0, z: 1.5 },
    angleYaw: -Math.PI * 0.4,
    currentMove: "IDLE",
    moveProgress: 0,
    moveTargetId: null,
    isKnoctout: false,
    score: 0,
    strikeCount: 0,
    dodgeCount: 0,
    skeleton: {} as any
  }
];

export default function App() {
  const [fighters, setFighters] = useState<Fighter[]>(INITIAL_FIGHTERS);
  const [cameraMode, setCameraMode] = useState<CameraMode>("CINEMATIC_FOLLOW");
  const [isSimulating, setIsSimulating] = useState(true);
  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const [arenaTheme, setArenaTheme] = useState<"neon_vegas" | "tokyo_sumo" | "siberian_cage" | "retro_cinematic">("neon_vegas");
  const [particles, setParticles] = useState<Particle3D[]>([]);
  const [events, setEvents] = useState<FightEvent[]>([]);
  const [aiCommentary, setAiCommentary] = useState("");
  const [aiHeadline, setAiHeadline] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  
  // Track dynamic ground hit flash details
  const [impactLocation, setImpactLocation] = useState<Vector3D | null>(null);
  const [gameTick, setGameTick] = useState(0);

  // Selector for direct user controls
  const [activeControllableFighterId, setActiveControllableFighterId] = useState<number | null>(null);

  // Store pressed keys to avoid OS delay for continuous walking joystick feeling
  const pressedKeys = useRef<Record<string, boolean>>({});
  // Log sequence lines buffer for the AI Commentary generator
  const commentaryInputQueue = useRef<string[]>([]);
  const lastAiCommentaryTick = useRef(0);

  const resetSimulation = () => {
    setFighters(INITIAL_FIGHTERS.map(f => ({ ...f, hp: f.maxHp, isKnoctout: false, currentMove: "IDLE", moveProgress: 0 })));
    setEvents([]);
    setAiCommentary("");
    setAiHeadline("");
    setParticles([]);
    setGameTick(0);
    lastAiCommentaryTick.current = 0;
    commentaryInputQueue.current = [];
  };

  // Listen to document key triggers for the walking overlord joystick
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      pressedKeys.current[key] = true;

      // Single action move triggers on press
      if (activeControllableFighterId) {
        if (key === "z" || key === "j") {
          triggerMoveState(activeControllableFighterId, "JAB");
        }
        if (key === "x" || key === "k") {
          triggerMoveState(activeControllableFighterId, "HAYMAKER");
        }
        if (key === "c" || key === "l") {
          const self = fighters.find(f => f.id === activeControllableFighterId);
          if (self) {
            triggerMoveState(activeControllableFighterId, activeControllableFighterId === 3 ? "SUMO_SLAM" : "JUDO_SWEEP");
          }
        }
        if (key === " " || e.code === "Space") {
          e.preventDefault();
          triggerMoveState(activeControllableFighterId, "DODGE");
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      pressedKeys.current[key] = false;
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeControllableFighterId, fighters]);

  // Main 30fps Frame update timer for physical vectors and AI loop
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setGameTick(prev => prev + 1);

      setFighters((prevFighters) => {
        // Match coordinates update
        const updated = prevFighters.map((f) => {
          const uFighter = { ...f };

          // Handle move progress clock tick
          if (uFighter.currentMove !== "IDLE" && uFighter.currentMove !== "WALK") {
            const speedModifier = isSlowMotion ? 0.015 : 0.04;
            uFighter.moveProgress += speedModifier;
            if (uFighter.moveProgress >= 1.0) {
              uFighter.currentMove = "IDLE";
              uFighter.moveProgress = 0;
              uFighter.moveTargetId = null;
            }
          }

          // Handle energy regeneration
          if (uFighter.energy < 100) {
            uFighter.energy = Math.min(100, uFighter.energy + 1.2);
          }

          // Technical KO check
          if (uFighter.hp <= 0 && !uFighter.isKnoctout) {
            uFighter.isKnoctout = true;
            uFighter.hp = 0;
            uFighter.currentMove = "STUNNED";
            uFighter.moveProgress = 0;
            logEvent(uFighter.name, null, "is knocked out cold! The referee is waving it off!", 0, true, "STUNNED");
            
            // Give score point to active standing fighters
            prevFighters.forEach(other => {
              if (other.id !== uFighter.id && !other.isKnoctout) {
                other.score += 1;
              }
            });
          }

          return uFighter;
        });

        // 1. Process Controlled Fighter manual walk movements if alive
        if (activeControllableFighterId !== null) {
          const self = updated.find(f => f.id === activeControllableFighterId);
          if (self && !self.isKnoctout) {
            let dx = 0;
            let dz = 0;
            const walkSpeed = 0.08;

            if (pressedKeys.current["w"] || pressedKeys.current["arrowup"]) dz -= walkSpeed;
            if (pressedKeys.current["s"] || pressedKeys.current["arrowdown"]) dz += walkSpeed;
            if (pressedKeys.current["a"] || pressedKeys.current["arrowleft"]) dx -= walkSpeed;
            if (pressedKeys.current["d"] || pressedKeys.current["arrowright"]) dx += walkSpeed;

            if (dx !== 0 || dz !== 0) {
              self.pos.x += dx;
              self.pos.z += dz;
              // Limit positions within the 3.2m Octagon ring boundaries
              const dist = Math.sqrt(self.pos.x * self.pos.x + self.pos.z * self.pos.z);
              if (dist > 3.2) {
                self.pos.x = (self.pos.x / dist) * 3.2;
                self.pos.z = (self.pos.z / dist) * 3.2;
              }
              self.angleYaw = Math.atan2(dx, dz);
              if (self.currentMove === "IDLE") {
                self.currentMove = "WALK";
              }
            } else if (self.currentMove === "WALK") {
              self.currentMove = "IDLE";
            }
          }
        }

        // 2. Process Autonomous AI fights crawl circles & target paths
        if (isSimulating) {
          updated.forEach((self) => {
            // Skip movement if manual controller active, knocked out, or in active strike choreographies
            if (self.id === activeControllableFighterId || self.isKnoctout) return;
            if (self.currentMove !== "IDLE" && self.currentMove !== "WALK") return;

            // Find closest standing opponent target in 3D
            const othersAlive = updated.filter(f => f.id !== self.id && !f.isKnoctout);
            if (othersAlive.length === 0) {
              if (self.currentMove !== "CELEBRATE") {
                self.currentMove = "CELEBRATE";
                self.moveProgress = 0;
                logEvent(self.name, null, "raises arms to skies in absolute arena victory!", 0, false, "CELEBRATE");
              }
              return;
            }

            // Target calculation
            let target = othersAlive[0];
            let minDist = getDistance(self.pos, target.pos);
            othersAlive.forEach(o => {
              const d = getDistance(self.pos, o.pos);
              if (d < minDist) {
                minDist = d;
                target = o;
              }
            });

            // Turn body looking exactly towards target
            self.angleYaw = Math.atan2(target.pos.x - self.pos.x, target.pos.z - self.pos.z);

            // Stance decision crawl and close in distance
            const reachScale = 0.7 + (self.reach * 0.05); // Trump has higher reach
            if (minDist > reachScale) {
              // Crawl / Walk towards target
              const stride = 0.04 + (self.speed * 0.005);
              self.pos.x += Math.sin(self.angleYaw) * stride;
              self.pos.z += Math.cos(self.angleYaw) * stride;
              self.currentMove = "WALK";
            } else {
              // Arena combat reach! Roll random probability to check if strikes are triggered
              self.currentMove = "IDLE";
              if (Math.random() < 0.06 && self.energy >= 35) {
                // Select moves based on attributes weight
                const moveRoll = Math.random();
                let chosenMove: CombatMoveType = "JAB";

                if (self.id === 3) { // Kim Sumo likes slamming and heavy body weight
                  chosenMove = moveRoll > 0.45 ? "SUMO_SLAM" : "BLOCK";
                } else if (self.id === 2) { // Putin Slavic master likes tripping and dodging
                  chosenMove = moveRoll > 0.5 ? "JUDO_SWEEP" : "DODGE";
                } else { // Trump long punch showman
                  chosenMove = moveRoll > 0.5 ? "HAYMAKER" : "JAB";
                }

                // Fire move
                executeCombatStrike(self, target.id, chosenMove, updated);
              }
            }
          });
        }

        return updated;
      });

      // Periodically generate AI Broadcaster Commentary based on buffered logs
      if (gameTick - lastAiCommentaryTick.current > 160 && commentaryInputQueue.current.length > 0) {
        lastAiCommentaryTick.current = gameTick;
        generateAICommentaryBundle();
      }

    }, isSlowMotion ? 65 : 30);

    return () => clearInterval(tickInterval);
  }, [isSimulating, isSlowMotion, activeControllableFighterId, fighters, gameTick]);

  // Distance helper
  const getDistance = (p1: Vector3D, p2: Vector3D) => {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.z - p2.z) ** 2);
  };

  // Logger helper
  const logEvent = (fName: string, tName: string | null, text: string, dam: number, isSpec: boolean, type: CombatMoveType) => {
    const timestampStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const ev: FightEvent = {
      id: Math.random().toString(),
      timestamp: timestampStr,
      fighterName: fName,
      targetName: tName,
      actionText: text,
      damage: dam,
      isSpecial: isSpec,
      type: type
    };
    
    setEvents(prev => [...prev, ev].slice(-40));
    // Push into the AI Commentary cue buffer
    const actionDesc = tName 
      ? `${fName} connected a ${isSpec ? "critical ultimate " : ""}${type} on ${tName} causing ${dam} damage.` 
      : `${fName} performed ${type}: ${text}.`;
    commentaryInputQueue.current.push(actionDesc);
    if (commentaryInputQueue.current.length > 5) {
      commentaryInputQueue.current.shift();
    }
  };

  // Implement Core Strike Combat calculations
  const executeCombatStrike = (
    attacker: Fighter,
    targetId: number,
    move: CombatMoveType,
    allFighters: Fighter[]
  ) => {
    const target = allFighters.find(f => f.id === targetId);
    if (!target || target.isKnoctout) return;

    attacker.currentMove = move;
    attacker.moveProgress = 0;
    attacker.moveTargetId = targetId;

    // Expend energy
    attacker.energy = Math.max(0, attacker.energy - 35);

    // Compute hit calculations inside progress delay
    setTimeout(() => {
      setFighters(current => {
        const stillAttacker = current.find(f => f.id === attacker.id);
        const stillTarget = current.find(f => f.id === targetId);
        
        if (!stillAttacker || !stillTarget || stillTarget.isKnoctout) return current;

        // Ensure we only execute if move is actually executing
        if (stillAttacker.currentMove !== move) return current;

        // Check defensive states
        const opponentMove = stillTarget.currentMove;
        
        let targetBlocks = opponentMove === "BLOCK";
        let targetDodges = opponentMove === "DODGE" && Math.random() < 0.65; // speed index chance

        if (targetDodges) {
          // Relocate dodge target away from center mathematically
          stillTarget.pos.x -= Math.sin(stillTarget.angleYaw) * 0.95;
          stillTarget.pos.z -= Math.cos(stillTarget.angleYaw) * 0.95;
          
          stillTarget.dodgeCount += 1;
          logEvent(stillTarget.name, stillAttacker.name, "agilely slides back stepping the punch completely!", 0, false, "DODGE");
          return current.map(f => {
            if (f.id === stillTarget.id) return stillTarget;
            return f;
          });
        }

        // Apply hit damage metrics based on attributes
        let baseDamage = move === "JAB" ? 8 : (move === "HAYMAKER" ? 18 : 25);
        let specAttack = false;

        if (move === "SUMO_SLAM" && attacker.id === 3) {
          baseDamage = 28;
          specAttack = true;
        }
        if (move === "JUDO_SWEEP" && attacker.id === 2) {
          baseDamage = 22;
          specAttack = true;
        }

        // Scale by power
        baseDamage += attacker.power * 0.7;

        if (targetBlocks) {
          baseDamage = Math.floor(baseDamage * (1 - (stillTarget.defense * 0.08)));
          logEvent(stillTarget.name, stillAttacker.name, "absorbed and guarded the heavy striking shock!", 0, false, "BLOCK");
        }

        // Apply damage to file state
        stillTarget.hp = Math.max(0, stillTarget.hp - baseDamage);
        stillAttacker.strikeCount += 1;

        // Register critical flash on Canvas
        setImpactLocation({ ...stillTarget.pos, y: 0.65 });

        // Trigger cinematic slow-mo if critical strike connected
        if (specAttack || move === "HAYMAKER") {
          setIsSlowMotion(true);
          setTimeout(() => {
            setIsSlowMotion(false);
          }, 800);
        }

        // Logs
        const hitTerms = [
          "landed a beautiful clean lead strike",
          "connected a high power punch right in the temple",
          "rattled the jaw with an aggressive combination",
          "unloaded a monstrous strike shaking the teeth"
        ];
        const radTerm = hitTerms[Math.floor(Math.random() * hitTerms.length)];
        
        const textLog = move === "SUMO_SLAM" 
          ? `triggered ${attacker.specialMoveName}: flew high and slammed 140kg onto the ribcage!`
          : (move === "JUDO_SWEEP" 
            ? `triggered ${attacker.specialMoveName}: swept the leg masterfully, crashing the head down!`
            : `${radTerm} representing pure professional class!`);

        logEvent(stillAttacker.name, stillTarget.name, textLog, baseDamage, specAttack || move === "HAYMAKER", move);

        // Put target in stunned state momentarily
        if (move === "HAYMAKER" || specAttack) {
          stillTarget.currentMove = "STUNNED";
          stillTarget.moveProgress = 0;
        }

        return current.map(f => {
          if (f.id === stillAttacker.id) return stillAttacker;
          if (f.id === stillTarget.id) return stillTarget;
          return f;
        });
      });
    }, 380); // trigger on target reach
  };

  // Controller function for manual buttons triggers
  const triggerManualMove = (move: CombatMoveType) => {
    if (activeControllableFighterId === null) return;
    triggerMoveState(activeControllableFighterId, move);
  };

  const triggerMoveState = (fighterId: number, move: CombatMoveType) => {
    setFighters(current => {
      const self = current.find(f => f.id === fighterId);
      if (!self || self.isKnoctout) return current;

      if (self.currentMove !== "IDLE" && self.currentMove !== "WALK") return current; // already doing move

      // Find nearest alive opponent target for manual fighter to look at
      const others = current.filter(o => o.id !== fighterId && !o.isKnoctout);
      if (others.length === 0) return current;

      let closestId = others[0].id;
      let minDist = getDistance(self.pos, others[0].pos);
      others.forEach(o => {
        const d = getDistance(self.pos, o.pos);
        if (d < minDist) {
          minDist = d;
          closestId = o.id;
        }
      });

      self.angleYaw = Math.atan2(current.find(f => f.id === closestId)!.pos.x - self.pos.x, current.find(f => f.id === closestId)!.pos.z - self.pos.z);
      
      executeCombatStrike(self, closestId, move, current);
      return current.map(f => f.id === fighterId ? self : f);
    });
  };

  // Play programmed sequence choreographies sets
  const triggerChoreographedMoves = (sequence: { fighterId: number; move: CombatMoveType; targetId: number }[]) => {
    setIsSimulating(false); // turn off auto sim
    
    // Play sequence on staggered timeout blocks
    sequence.forEach((seq, idx) => {
      setTimeout(() => {
        setFighters(current => {
          const actor = current.find(f => f.id === seq.fighterId);
          const opponent = current.find(f => f.id === seq.targetId);
          
          if (!actor || !opponent || actor.isKnoctout || opponent.isKnoctout) return current;

          // Reposition closer to target so they connect choreography nicely
          const yawToOpp = Math.atan2(opponent.pos.x - actor.pos.x, opponent.pos.z - actor.pos.z);
          actor.pos.x = opponent.pos.x - Math.sin(yawToOpp) * 0.75;
          actor.pos.z = opponent.pos.z - Math.cos(yawToOpp) * 0.75;
          actor.angleYaw = yawToOpp;

          executeCombatStrike(actor, seq.targetId, seq.move, current);
          return current.map(f => f.id === seq.fighterId ? actor : f);
        });
      }, idx * 1100);
    });
  };

  // Fetch AI Commentary update from modern server Express route
  const generateAICommentaryBundle = async () => {
    setIsAiGenerating(true);
    try {
      const response = await fetch("/api/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round: 1,
          crowdMeter: 60 + Math.floor(Math.random() * 38), // dynamic decibels
          currentEvents: commentaryInputQueue.current
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiCommentary(data.commentary);
        setAiHeadline(data.headline);
      }
    } catch (err) {
      console.error("AI Commentary connection error:", err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Vocal Announcer Speech synthesis utilizing Web Speech API
  const triggerVoiceAnnounce = (text: string) => {
    if ("speechSynthesis" in window) {
      // Clear current utterances queue
      window.speechSynthesis.cancel();
      
      const cleanString = text.replace(/[*#_~]/g, ""); // strip markdown characters clean
      const utterance = new SpeechSynthesisUtterance(cleanString);
      
      // Attempt to load general English male/deep sport announcer style voice or first available
      const voices = window.speechSynthesis.getVoices();
      const idealVoice = voices.find(v => v.lang.startsWith("en-") && v.name.includes("Google")) || voices[0];
      if (idealVoice) {
        utterance.voice = idealVoice;
      }
      utterance.pitch = 0.9;  // Slightly deep radio tone
      utterance.rate = 1.05;  // Fast-paced athletic lingo
      utterance.volume = 0.85;

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-[#070514] text-white flex flex-col justify-between" id="arena-root-deck">
      
      {/* 1. Header Broadcast Rail */}
      <header className="border-b border-slate-900 bg-slate-950/90 py-3.5 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-3 backdrop-blur-md sticky top-0 z-45" id="arena-header">
        <div className="flex items-center gap-3">
          <div className="bg-amber-400 p-2 rounded-lg text-slate-950 flex items-center justify-center font-black animate-pulse shadow-md shadow-amber-400/10">
            <Tv size={18} />
          </div>
          <div>
            <h1 className="font-sans font-black text-white text-lg leading-none tracking-tight flex items-center gap-2">
              TRIPLE THREAT: LIVE ARENA CHAMPIONSHIP
            </h1>
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
              Broadcasting Cinematic High-Octane 4K Combat Physics &bull; WebGL Canvas 3D
            </p>
          </div>
        </div>

        {/* Dynamic status labels */}
        <div className="flex gap-2">
          {activeControllableFighterId !== null ? (
            <div className="bg-amber-400/10 border border-amber-400/30 text-amber-400 font-mono text-[10px] py-1 px-2.5 rounded-full flex items-center gap-1.5 font-bold animate-pulse">
              <Swords size={11} className="fill-current" />
              <span>OVERLORD INPUT ACTIVE: F{activeControllableFighterId}</span>
            </div>
          ) : (
            <div className="bg-sky-500/10 border border-sky-500/25 text-sky-400 font-mono text-[10px] py-1 px-2.5 rounded-full flex items-center gap-1.5 font-bold">
              <Users size={11} />
              <span>AUTONOMOUS FIGHT SIMULATOR ACTIVE</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Main Arena Control Grid Layout */}
      <main className="flex-grow p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Dynamic Warning Alert Banner if no API key is provided */}
        {!process.env.GEMINI_API_KEY && (
          <div className="bg-yellow-500/5 border border-yellow-500/15 p-3 rounded-xl flex items-center gap-2.5 text-xs text-zinc-400 leading-normal" id="api-key-warning">
            <Info size={16} className="text-amber-400 shrink-0" />
            <span>
              <strong>Note:</strong> No Gemini API key has been provided in the virtual Secrets. AI commentary is running on sports desk fallback. Add your `GEMINI_API_KEY` inside the **Settings &gt; Secrets** panel to experience the live announcer voice.
            </span>
          </div>
        )}

        {/* TOP LAYER: Interactive 3D Broadcaster Cinema Screen */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="main-stadium-viewport-row">
          
          {/* Broadcaster Viewport panel */}
          <div className="lg:col-span-3 h-[280px] sm:h-[420px] md:h-[460px] flex flex-col justify-between">
            <StadiumCanvas 
              fighters={fighters}
              cameraMode={cameraMode}
              particles={particles}
              setParticles={setParticles}
              isSlowMotion={isSlowMotion}
              arenaTheme={arenaTheme}
              impactLocation={impactLocation}
              clearImpact={() => setImpactLocation(null)}
              gameTick={gameTick}
            />
          </div>

          {/* Quick Combat Controls sidebar */}
          <div className="lg:col-span-1 h-full flex flex-col justify-between">
            <ControlDashboard
              isSimulating={isSimulating}
              setIsSimulating={setIsSimulating}
              cameraMode={cameraMode}
              setCameraMode={setCameraMode}
              isSlowMotion={isSlowMotion}
              setIsSlowMotion={setIsSlowMotion}
              arenaTheme={arenaTheme}
              setArenaTheme={setArenaTheme}
              activeControllableFighterId={activeControllableFighterId}
              setActiveControllableFighterId={setActiveControllableFighterId}
              triggerManualMove={triggerManualMove}
              triggerChoreographedMoves={triggerChoreographedMoves}
              resetSimulation={resetSimulation}
            />
          </div>
        </section>

        {/* MIDDLE LAYER: Dynamic Interactive Commentary Broadcaster desk */}
        <section id="commentary-deck-row" className="bg-slate-950/40 p-1.5 rounded-2xl border border-slate-900">
          <CommentaryFeed
            events={events}
            aiCommentary={aiCommentary}
            aiHeadline={aiHeadline}
            isAiGenerating={isAiGenerating}
            crowdMeter={isSimulating && fighters.some(f => f.currentMove !== "IDLE" && f.currentMove !== "WALK") ? 80 + Math.floor(Math.random() * 18) : 55 + Math.floor(Math.random() * 15)}
            triggerVoiceAnnounce={triggerVoiceAnnounce}
          />
        </section>

        {/* BOTTOM LAYER: Fighter Bios & Live Stats matrices */}
        <section className="space-y-3" id="fighter-statecards-group">
          <h3 className="font-mono text-zinc-500 text-[11px] uppercase tracking-widest block font-bold">
            Fighter Profiles & Live Physical State trackers:
          </h3>
          <FighterStats
            fighters={fighters}
            activeControllableFighterId={activeControllableFighterId}
            setActiveControllableFighterId={setActiveControllableFighterId}
          />
        </section>

      </main>

      {/* 3. Footer Stats Ribbon */}
      <footer className="border-t border-slate-900/80 bg-slate-950/70 py-4 px-6 md:px-8 text-center text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-8 flex flex-col sm:flex-row items-center justify-between gap-2" id="arena-footer">
        <span>© 2026 TRIPLE THREAT ATHLETIC SIMULATION BROADCAST INC.</span>
        <span className="flex items-center gap-1 text-zinc-400">
          <span>COSMIC SHADER &bull; DYNAMIC SPORTS ENGINE v1.2</span>
        </span>
      </footer>
    </div>
  );
}
