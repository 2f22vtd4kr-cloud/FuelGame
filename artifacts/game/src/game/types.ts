// ─── Core Types ───────────────────────────────────────────────────────────────

export type Phase = 'lobby' | 'play' | 'meeting' | 'results';
export type Role = 'khozain' | 'slivshchik';
export type BotBehavior = 'idle' | 'moving' | 'interacting' | 'fleeing' | 'at_meeting';

export interface Vec2 { x: number; y: number; }

// ─── Map ──────────────────────────────────────────────────────────────────────

// Map dimensions are defined in data/map.ts; keep these for convenience imports
export const MAP_W = 1200;
export const MAP_H = 900;

// ─── Characters ───────────────────────────────────────────────────────────────

export type CharacterKey =
  | 'denis' | 'anya' | 'vova' | 'uncle_seryozha'
  | 'petrovich' | 'marina' | 'akhmet' | 'oleg' | 'lena' | 'barsik';

export interface CharacterDef {
  key: CharacterKey;
  name: string;
  emoji: string;
  color: string;       // player blob color
  description: string;
  voiceLines: string[];
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskDefKey = 'shawarma' | 'intercom' | 'trash' | 'window' | 'grandma';

export interface TaskDef {
  key: TaskDefKey;
  label: string;
  emoji: string;
  duration: number;    // seconds to complete
  unityReward: number; // % added to unity meter on complete
  color: string;
}

export interface TaskInstance {
  id: string;
  defKey: TaskDefKey;
  pos: Vec2;
  progress: number;    // 0-1
  isComplete: boolean;
  completedBy: string | null;
  doer: string | null; // player currently interacting
  respawnTimer: number; // countdown seconds; 0 = available
}

// ─── Cars ─────────────────────────────────────────────────────────────────────

export interface Car {
  id: string;
  pos: Vec2;
  fuel: number;        // 0-100
  color: string;
  siphoner: string | null;  // player id currently siphoning
  hasImmunity: boolean;
  immunityTimer: number;
}

// ─── Players ──────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  character: CharacterKey;
  role: Role;
  isHuman: boolean;
  isAlive: boolean;
  pos: Vec2;
  vel: Vec2;
  speed: number;       // units/sec
  // Bot AI
  botState: BotBehavior;
  botTarget: Vec2 | null;
  botTaskId: string | null;
  botCarId: string | null;
  botCooldown: number; // wait timer before picking new target
}

// ─── Meeting ──────────────────────────────────────────────────────────────────

export interface VoteRecord {
  voterId: string;
  targetId: string | null;  // null = skip
}

export type MeetingPhase = 'discussion' | 'voting' | 'reveal';

export interface MeetingState {
  phase: MeetingPhase;
  callerId: string;
  timer: number;       // seconds remaining in current phase
  votes: VoteRecord[];
  ejectedId: string | null;
  ejectionText: string | null;
  chatMessages: ChatMessage[];
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export const INTERACT_RADIUS = 65;     // units: must be within this to interact
export const SIPHON_RADIUS = 70;       // units: must be within this to siphon
export const ALARM_RADIUS = 80;        // units: must be within this to call meeting
export const SIPHON_RATE = 4;          // fuel % per second drained
export const BOT_FLEE_RADIUS = 200;    // units: siphoner flees if human within this
export const TASK_RESPAWN_TIME = 35;   // seconds before task respawns
export const MEETING_COOLDOWN = 25;    // seconds between meetings

// ─── Top-level Game State ─────────────────────────────────────────────────────

export interface GameState {
  phase: Phase;
  players: Player[];
  cars: Car[];
  tasks: TaskInstance[];
  meeting: MeetingState | null;
  unityMeter: number;            // 0-100
  winner: 'khozaeva' | 'slivshchiki' | null;
  winReason: string;
  localPlayerId: string;
  selectedCharacter: CharacterKey;
  time: number;                  // seconds since game start
  meetingCooldown: number;
  tickerIndex: number;
  tickerTimer: number;
  ai95Price: number;
  promptText: string | null;     // contextual prompt shown at bottom of HUD
  promptTimer: number;
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface InputState {
  dx: number;   // -1 to 1 (joystick x-axis)
  dy: number;   // -1 to 1 (joystick y-axis)
  interact: boolean;
  prevInteract: boolean;
}
