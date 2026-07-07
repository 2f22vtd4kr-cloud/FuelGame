import type { GameState, Player, Car, TaskInstance } from './types';
import { CAR_SPAWNS, TASK_SPAWNS, PLAYER_SPAWNS } from '../data/map';
import { CHARACTERS, CHARACTER_KEYS } from '../data/characters';
import { SPRINT_MAX } from './types';

// ─── Singleton mutable game state ────────────────────────────────────────────
// Mutated at 60fps by the game loop. NOT React state.
// React HUD reads a shallow snapshot at 10Hz via GameCanvas.

export let gs: GameState = createInitialState();

export function createInitialState(): GameState {
  return {
    phase: 'lobby',
    players: [],
    cars: [],
    tasks: [],
    bodies: [],
    canisters: [],
    meeting: null,
    unityMeter: 0,
    winner: null,
    winReason: '',
    localPlayerId: 'player_human',
    selectedCharacter: 'denis',
    time: 0,
    meetingCooldown: 0,
    tickerIndex: 0,
    tickerTimer: 20,
    ai95Price: 87,
    promptText: null,
    promptTimer: 0,
    activeMiniGame: null,
    activeSabotages: [],
    briefingTimer: 0,
  };
}

export function resetGameState(): void {
  gs = createInitialState();
}

// ─── Start game ───────────────────────────────────────────────────────────────

export function startGame(
  humanCharacter: string,
  playerCount = 8,
  siphonersCount = 2,
): void {
  const charKey = humanCharacter as typeof CHARACTER_KEYS[number];

  // Build player list
  const botCharKeys = CHARACTER_KEYS.filter(k => k !== charKey);
  shuffle(botCharKeys);
  const allChars = [charKey, ...botCharKeys.slice(0, playerCount - 1)];

  // Assign roles randomly — human included
  const roleAssign: Array<'khozain' | 'slivshchik'> = Array.from(
    { length: playerCount },
    () => 'khozain' as const,
  );
  const allIndices = Array.from({ length: playerCount }, (_, i) => i);
  shuffle(allIndices);
  for (let i = 0; i < Math.min(siphonersCount, playerCount - 1); i++) {
    roleAssign[allIndices[i]] = 'slivshchik';
  }

  const players: Player[] = allChars.map((ck, i) => {
    const charDef = CHARACTERS[ck];
    const spawn = PLAYER_SPAWNS[i % PLAYER_SPAWNS.length];
    return {
      id: i === 0 ? 'player_human' : `bot_${i}`,
      name: charDef.name,
      character: ck,
      role: roleAssign[i],
      isHuman: i === 0,
      isAlive: true,
      pos: { x: spawn.x + (Math.random() - 0.5) * 30, y: spawn.y + (Math.random() - 0.5) * 30 },
      vel: { x: 0, y: 0 },
      speed: i === 0 ? 165 : 130 + Math.random() * 40,
      facingAngle: 0,
      stamina: SPRINT_MAX,
      isSprinting: false,
      isCrouching: false,
      ambushTarget: null,
      ambushChargeTimer: 0,
      ambushCooldown: 0,
      siphonCooldown: 0,
      sabotageCooldown: 0,
      isCarryingCanister: false,
      ventCooldown: 0,
      emote: null,
      emoteTimer: 0,
      suspectedTimer: 0,
      botState: 'idle',
      botTarget: null,
      botTaskId: null,
      botCarId: null,
      botCooldown: Math.random() * 2,
    };
  });

  // 4 cars initially
  const cars: Car[] = CAR_SPAWNS.slice(0, 4).map(cs => ({
    id: cs.id,
    pos: { ...cs.pos },
    fuel: 85 + Math.random() * 15,
    color: cs.color,
    siphoner: null,
    siphonPhase: 0,
    siphonTimer: 0,
    hasImmunity: false,
    immunityTimer: 0,
  }));

  const tasks: TaskInstance[] = TASK_SPAWNS.map(ts => ({
    id: ts.id,
    defKey: ts.defKey,
    pos: { ...ts.pos },
    progress: 0,
    isComplete: false,
    completedBy: null,
    doer: null,
    respawnTimer: 0,
  }));

  gs.phase = 'briefing';
  gs.briefingTimer = 5;
  gs.players = players;
  gs.cars = cars;
  gs.tasks = tasks;
  gs.bodies = [];
  gs.canisters = [];
  gs.meeting = null;
  gs.unityMeter = 0;
  gs.winner = null;
  gs.winReason = '';
  gs.localPlayerId = 'player_human';
  gs.time = 0;
  gs.meetingCooldown = 5;
  gs.promptText = null;
  gs.promptTimer = 0;
  gs.activeMiniGame = null;
  gs.activeSabotages = [];
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
