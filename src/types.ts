export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type CombatMoveType = 
  | "IDLE" 
  | "WALK" 
  | "JAB" 
  | "HAYMAKER" 
  | "JUDO_SWEEP" 
  | "SUMO_SLAM" 
  | "DODGE" 
  | "BLOCK" 
  | "STUNNED"
  | "CELEBRATE";

export interface Joint3D {
  name: string;
  parentName: string | null;
  localPos: Vector3D; // relative to parent or center
  targetAngleX: number;
  targetAngleY: number;
  targetAngleZ: number;
  currentAngleX: number;
  currentAngleY: number;
  currentAngleZ: number;
}

export interface Skeleton3D {
  hips: Joint3D;
  spine: Joint3D;
  head: Joint3D;
  leftShoulder: Joint3D;
  leftElbow: Joint3D;
  rightShoulder: Joint3D;
  rightElbow: Joint3D;
  leftHip: Joint3D;
  leftKnee: Joint3D;
  rightHip: Joint3D;
  rightKnee: Joint3D;
}

export interface Fighter {
  id: number;
  name: string;
  nickname: string;
  age: number;
  height: number; // in meters (e.g., 1.90)
  weight: number; // in kg (e.g., 102)
  build: string;
  skinColor: string;
  hairStyle: string;
  shortsColor: string;
  description: string;
  
  // Fight attributes
  maxHp: number;
  hp: number;
  energy: number;
  reach: number;
  speed: number;
  power: number;
  defense: number;
  specialMoveName: string;
  
  // Simulation coordinate and combat states
  pos: Vector3D;
  targetPos: Vector3D;
  angleYaw: number; // looking direction
  currentMove: CombatMoveType;
  moveProgress: number; // 0 to 1
  moveTargetId: number | null; // target fighter id
  isKnoctout: boolean;
  score: number;
  strikeCount: number;
  dodgeCount: number;
  
  // Skeleton instance for procedural animations
  skeleton: Skeleton3D;
}

export type CameraMode = 
  | "CINEMATIC_FOLLOW" 
  | "FIGHTER_1_POV" 
  | "FIGHTER_2_POV" 
  | "FIGHTER_3_POV" 
  | "RINGSIDE"
  | "CRADLE_ROTATING";

export interface FightEvent {
  id: string;
  timestamp: string;
  fighterName: string;
  targetName: string | null;
  actionText: string;
  damage: number;
  isSpecial: boolean;
  type: CombatMoveType;
}

export interface Particle3D {
  pos: Vector3D;
  vel: Vector3D;
  color: string;
  size: number;
  life: number; // 0 to 1
  maxLife: number;
  type: "SWEAT" | "SPARK" | "DUST" | "BLOOD";
}
