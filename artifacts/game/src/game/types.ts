// ─── Core Types ───────────────────────────────────────────────────────────────

export type Phase = 'lobby' | 'briefing' | 'play' | 'meeting' | 'results';
export type Role = 'khozain' | 'slivshchik';
export type NeutralRole = 'barsik' | 'policeman' | 'janitor';
export type BotBehavior = 'idle' | 'moving' | 'interacting' | 'fleeing' | 'at_meeting' | 'fake_task' | 'fix_sabotage' | 'follow_suspicious';

export interface Vec2 { x: number; y: number; }

// ─── Map ──────────────────────────────────────────────────────────────────────

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
  color: string;
  description: string;
  voiceLines: string[];
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskDefKey =
  | 'shawarma' | 'intercom' | 'trash' | 'window' | 'grandma'
  | 'mailbox' | 'pigeons' | 'flowers' | 'kvass' | 'sweep'
  | 'dog_walk' | 'flower_match' | 'drunk_calm' | 'taxi_order'
  | 'help_bags' | 'find_cat' | 'fix_swing' | 'water_lawn'
  | 'check_meter' | 'close_tap';

export interface TaskDef {
  key: TaskDefKey;
  label: string;
  emoji: string;
  duration: number;    // seconds to complete (hold-timer tasks)
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
  doer: string | null;
  respawnTimer: number;
}

// ─── Task Mini-Games (§2.5) ───────────────────────────────────────────────────

export type MiniGameType =
  | 'tap_timing' | 'rapid_tap' | 'sequence' | 'dial' | 'letter'
  | 'dog_walk' | 'flower_match' | 'drunk_calm' | 'taxi_order' | 'wire_drag';

/** Which mini-game type each task uses. Unmapped tasks use the hold-timer. */
export const TASK_MINIGAME_MAP: Partial<Record<TaskDefKey, MiniGameType>> = {
  shawarma:     'tap_timing',
  kvass:        'tap_timing',
  intercom:     'dial',         // §2.5 Task 04 — router dial, 3 stops
  pigeons:      'rapid_tap',
  sweep:        'rapid_tap',
  flowers:      'rapid_tap',   // §2.5 Task 05 — figure-8 watering pattern
  window:       'wire_drag',   // §2.5 Task 03 — turnstile wire drag
  mailbox:      'letter',
  grandma:      'dog_walk',    // §2.5 Task 02 — escort grandma to arch
  trash:        'dog_walk',    // §2.5 Task 11 — walk trash to dumpsters
  dog_walk:     'dog_walk',
  flower_match: 'flower_match',
  drunk_calm:   'drunk_calm',
  taxi_order:   'taxi_order',
  // §2.5 Tasks 12-20
  help_bags:    'dog_walk',
  find_cat:     'dog_walk',
  fix_swing:    'rapid_tap',
  water_lawn:   'rapid_tap',
  check_meter:  'sequence',
  close_tap:    'dial',
};

export interface MiniGameState {
  taskId: string;
  defKey: TaskDefKey;
  type: MiniGameType;
  // ── tap_timing: oscillating marker, tap in green zone ──
  markerPos: number;        // 0-1
  markerDir: number;        // +1 or -1
  markerSpeed: number;      // units/sec
  hits: number;
  requiredHits: number;
  // ── rapid_tap / dog_walk: mash button N times ──
  tapCount: number;
  requiredTaps: number;
  timeLimit: number;        // remaining seconds
  timeLimitMax: number;
  // ── sequence: digit pad, tap in order ──
  sequence: number[];
  seqIndex: number;
  seqWrong: boolean;        // flash red on wrong press
  // ── dial: rotate to green zone, release to lock ──
  dialAngle: number;        // current angle 0-360
  dialTarget: number;       // target angle
  dialGreenWidth: number;   // ± degrees for green zone
  dialStops: number;        // locked stops so far
  dialRequiredStops: number;
  // ── letter: read a satirical notice ──
  letterText: string;
  // ── choice (flower_match & drunk_calm) ──
  choiceOptions: string[];  // 3 display strings
  choiceCorrect: number;    // index of correct choice
  choiceSelected: number;   // -1 = none, ≥0 = player picked this index
  choiceRound: number;      // current round index (0→)
  choiceRequired: number;   // rounds to win (3)
  // ── dog_walk ──
  dogWaypoint: number;      // waypoints reached (0-2)
  dogRequired: number;      // 3
  // ── taxi_order ──
  taxiPhase: 'order' | 'wait' | 'confirm';
  taxiWaitTimer: number;    // seconds waited during 'wait' phase
  // ── wire_drag: connect matching colored wires ──
  wireSockets: number[];    // shuffled socket color indices [0=red,1=blue,2=green] per position
  wireConnected: boolean[]; // per color index: is this wire pair done?
  wireDragging: number;     // -1=none, else colorIndex being selected
  // ── shared feedback ──
  feedback: 'none' | 'hit' | 'miss';
  feedbackTimer: number;
  done: boolean;
  /** §2.5 — true when local player is Сливщик; mini-game plays identically but doesn't complete the task */
  isFake: boolean;
}

// ─── Sabotage System (§2.9) ───────────────────────────────────────────────────

export type SabotageKey =
  | 'babushka_cerberus'
  | 'pipe_burst'
  | 'chat_offline'
  | 'alarm_chaos';

export interface SabotageInstance {
  id: string;
  key: SabotageKey;
  timer: number;        // seconds remaining
  isResolved: boolean;
  // pipe_burst: two valves must each be held for VALVE_FIX_TIME seconds
  valve1Progress: number;
  valve2Progress: number;
}

export const SABOTAGE_COOLDOWNS: Record<SabotageKey, number> = {
  babushka_cerberus: 60,
  pipe_burst:        75,
  chat_offline:      50,
  alarm_chaos:       45,
};

export const SABOTAGE_DURATIONS: Record<SabotageKey, number> = {
  babushka_cerberus: 45,
  pipe_burst:        60,  // critical — slivshchiki win if unresolved
  chat_offline:      20,
  alarm_chaos:       15,
};

export const SABOTAGE_LABELS: Record<SabotageKey, string> = {
  babushka_cerberus: '👵 Бабушка-Цербер',
  pipe_burst:        '💧 Прорвало трубу',
  chat_offline:      '📵 ЖК Чат Офлайн',
  alarm_chaos:       '🚨 Сигнализация хаос',
};

export const VALVE_FIX_TIME = 3; // seconds to hold at each valve

// ─── Cars ─────────────────────────────────────────────────────────────────────

export interface Car {
  id: string;
  pos: Vec2;
  fuel: number;        // 0-100
  color: string;
  siphoner: string | null;   // player id currently siphoning
  siphonPhase: number;       // 0=none, 1=setup(0-3s), 2=active draining
  siphonTimer: number;       // elapsed seconds in current phase
  hasImmunity: boolean;
  immunityTimer: number;
  lowFuelWarned: boolean;    // §2.6 one-shot <10% warning already fired
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
  speed: number;
  facingAngle: number;        // radians, 0=right, PI/2=down
  // Movement modifiers
  stamina: number;            // 0–SPRINT_MAX seconds
  isSprinting: boolean;
  isCrouching: boolean;
  // Combat
  ambushTarget: string | null;
  ambushChargeTimer: number;  // charge up to AMBUSH_CHARGE_TIME
  ambushCooldown: number;
  siphonCooldown: number;     // 15s cooldown after completing/canceling a siphon (§2.4)
  // Sabotage
  sabotageCooldown: number;   // global cooldown between sabotage uses
  // Items
  isCarryingCanister: boolean;
  ventCooldown: number;       // §3.1.2 cooldown after using dumpster vent
  ventFlashTimer: number;     // §3.1.2 brief visual flash after teleport (0 = off)
  // Visual
  emote: string | null;
  emoteTimer: number;
  suspectedTimer: number;     // red outline when ambush interrupted
  // §2.4 Shawarma speed boost
  speedBoostTimer: number;        // remaining seconds of speed boost
  // §2.4 Хозяин car lock ("Запереть бак")
  khozainLockCooldown: number;  // cooldown between car lock uses (120s)
  khozainLockProgress: number;  // hold-timer progress toward locking (0-2s)
  // §10.2 Immunity Ticket
  hasImmunityTicket: boolean;     // player is holding a ticket
  // §3.1.3 Neutral role
  neutralRole: NeutralRole | null;
  canistersCollected: number;     // for janitor neutral
  barsikMeowCooldown: number;    // for barsik neutral
  // Per-player stats (for results screen §9.1 + rewards §3.2)
  fuelSiphoned: number;           // total fuel % siphoned this match
  tasksCompleted: number;         // total tasks completed this match
  correctVotes: number;           // §3.2 votes that correctly identified a slivshchik
  // §4.3 Bot suspicion vector (khozain bots only)
  suspicion: Record<string, number>;
  // Bot AI
  botState: BotBehavior;
  botTarget: Vec2 | null;
  botTaskId: string | null;
  botCarId: string | null;
  botCooldown: number;
}

// ─── Bodies (left behind by ambushed players) ─────────────────────────────────

export interface Body {
  id: string;
  playerId: string;
  character: CharacterKey;
  name: string;
  pos: Vec2;
  reportedBy: string | null;
}

// ─── Canisters (evidence dropped when siphon interrupted) ─────────────────────

export interface Canister {
  id: string;
  pos: Vec2;
  ownerId: string;    // who dropped it
  isFull: boolean;
}

// ─── Meeting ──────────────────────────────────────────────────────────────────

export interface VoteRecord {
  voterId: string;
  targetId: string | null;  // null = skip
}

export type MeetingPhase = 'discussion' | 'voting' | 'reveal';
export type MeetingReason = 'alarm' | 'body' | 'drained_car';

export interface MeetingState {
  meetingId: number;   // increments each new meeting; used to reset UI state
  phase: MeetingPhase;
  callerId: string;
  reason: MeetingReason;
  timer: number;
  votes: VoteRecord[];
  ejectedId: string | null;
  ejectionText: string | null;
  chatMessages: ChatMessage[];
  skipDiscussionVotes: string[]; // §2.7.4 player IDs who voted to skip discussion
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const INTERACT_RADIUS    = 65;
export const SIPHON_RADIUS      = 70;
export const ALARM_RADIUS       = 80;
export const BODY_RADIUS        = 75;
export const CANISTER_RADIUS    = 60;
export const AMBUSH_RADIUS      = 55;        // tight range to trigger ambush
export const AMBUSH_LONE_RADIUS = 480;       // no other player within this
export const SIPHON_RATE        = 14.3;      // fuel % per second active drain (100% in 7s per §2.4)
export const SIPHON_SETUP_TIME  = 3;         // seconds for setup phase
export const AMBUSH_CHARGE_TIME = 1.5;       // hold time to kill
export const AMBUSH_COOLDOWN    = 25;
export const BOT_FLEE_RADIUS    = 220;
export const TASK_RESPAWN_TIME  = 35;
export const MEETING_COOLDOWN   = 30;
export const VALVE_INTERACT_RADIUS = 80;

// Sprint / crouch
export const SPRINT_SPEED_MULT  = 1.55;      // ~5.4 m/s from 3.5 base
export const CROUCH_SPEED_MULT  = 0.52;      // ~1.8 m/s from 3.5 base
export const SPRINT_MAX         = 5;         // seconds of sprint
export const SPRINT_DRAIN_RATE  = 1;         // stamina per second sprinting
export const SPRINT_REGEN_RATE  = 0.625;     // stamina per second resting (8s to full)
export const CANISTER_SLOW_MULT = 0.8;       // speed × 0.8 when carrying canister
export const FLOWERBED_SLOW_MULT = 0.6;      // §1.2 flower beds reduce speed by 40%
export const SIPHON_AUDIO_RADIUS = 280;      // §13.1 siphon gurgle audible within 8m (~280px)
export const VENT_COOLDOWN       = 15;       // §3.1.2 dumpster vent cooldown (seconds)
export const VENT_FLASH_DURATION = 0.45;     // §3.1.2 visual teleport flash duration (seconds)
export const CROUCH_VISIBILITY_MULT = 0.7;  // §2.2 crouching: others see you with 30% narrower FOV
export const SHAWARMA_SPEED_BOOST_MULT     = 1.35; // §2.4 shawarma speed boost multiplier
export const SHAWARMA_SPEED_BOOST_DURATION = 10;   // seconds
export const IMMUNITY_TICKET_DURATION = 60; // §10.2 immunity ticket locks car for 60s
export const KHOZAIN_LOCK_DURATION     = 30; // §2.4 Запереть бак — free lock, 30s
export const KHOZAIN_LOCK_COOLDOWN     = 120; // §2.4 per-player lock cooldown
export const KHOZAIN_LOCK_HOLD_TIME    = 2.0; // seconds to hold E to lock car

// ─── Bot Difficulty (§4.2) ────────────────────────────────────────────────────

export type BotDifficulty = 'easy' | 'medium' | 'hard' | 'nightmare';

export interface BotDifficultySettings {
  ambushChance: number;           // probability of attempting ambush when eligible
  sabotageChancePerFrame: number; // per-frame probability of triggering sabotage
  useVents: boolean;              // slivshchik bots use dumpster vents
  fleeRadius: number;             // how far khozain bots run from nearby slivshchik
  skipVoteChance: number;         // probability bot skips vote instead of using suspicion
}

export const BOT_DIFFICULTY_SETTINGS: Record<BotDifficulty, BotDifficultySettings> = {
  easy:      { ambushChance: 0.10, sabotageChancePerFrame: 0.000, useVents: false, fleeRadius: 180, skipVoteChance: 0.35 },
  medium:    { ambushChance: 0.25, sabotageChancePerFrame: 0.002, useVents: false, fleeRadius: 220, skipVoteChance: 0.20 },
  hard:      { ambushChance: 0.40, sabotageChancePerFrame: 0.004, useVents: true,  fleeRadius: 260, skipVoteChance: 0.10 },
  nightmare: { ambushChance: 0.60, sabotageChancePerFrame: 0.008, useVents: true,  fleeRadius: 300, skipVoteChance: 0.05 },
};

// ─── Immunity Ticket (§10.2) ──────────────────────────────────────────────────

export interface ImmunityTicket {
  id: string;
  pos: Vec2;
}

// ─── Top-level Game State ─────────────────────────────────────────────────────

export interface GameState {
  phase: Phase;
  players: Player[];
  cars: Car[];
  tasks: TaskInstance[];
  bodies: Body[];
  canisters: Canister[];
  meeting: MeetingState | null;
  unityMeter: number;
  winner: 'khozaeva' | 'slivshchiki' | null;
  winReason: string;
  localPlayerId: string;
  selectedCharacter: CharacterKey;
  time: number;
  meetingCooldown: number;
  tickerIndex: number;
  tickerTimer: number;
  ai95Price: number;
  promptText: string | null;
  promptTimer: number;
  // §2.5 Task mini-games
  activeMiniGame: MiniGameState | null;
  // §2.9 Sabotage
  activeSabotages: SabotageInstance[];
  // §2.1 Briefing phase
  briefingTimer: number;
  // §2.1 Match time limit (5min default, +30s per task completed)
  matchTimeLimit: number;
  // §4.2 Bot difficulty
  botDifficulty: BotDifficulty;
  // §10.2 Immunity tickets on the ground
  immunityTickets: ImmunityTicket[];
  // §3.5 Track human player's immunity ticket use this match (for daily challenge)
  immunityTicketsUsedThisMatch: number;
  // §13.1 Accessibility settings
  colorblindMode: boolean;
  highContrastMode: boolean;
  volumeMaster: number;   // 0-1
  volumeMusic: number;    // 0-1
  volumeSfx: number;      // 0-1
  autoInteract: boolean;
  autoInteractTimer: number;
  textSize: 'small' | 'medium' | 'large';
  simplifiedChatWheel: boolean;
  // §12.4 Tutorial
  tutorialStep: number; // 0=off, 1=go_shawarma, 2=near_shawarma, 3=done
  // §9.2 Backstab Moment detection
  backstabMoment: 'catch_siphoner' | 'caught_siphoning' | 'dramatic_eject' | null;
  backstabMomentAcked: boolean; // true once player has saved/dismissed
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface InputState {
  dx: number;
  dy: number;
  interact: boolean;
  prevInteract: boolean;
  sprint: boolean;
  crouch: boolean;
  emoteIndex: number | null;  // 0–3
}
