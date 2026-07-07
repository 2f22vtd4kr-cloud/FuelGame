import type { GameState, Player, Car, TaskInstance } from './types';
import { CAR_SPAWNS, TASK_SPAWNS, PLAYER_SPAWNS } from '../data/map';
import { CHARACTERS, CHARACTER_KEYS } from '../data/characters';

// ─── Singleton mutable game state ────────────────────────────────────────────
// Updated every frame by the game loop. NOT React state.
// React HUD reads a snapshot via useGameSnapshot hook (10Hz).

export let gs: GameState = createInitialState();

export function createInitialState(): GameState {
  return {
    phase: 'lobby',
    players: [],
    cars: [],
    tasks: [],
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
  };
}

export function resetGameState(): void {
  gs = createInitialState();
}

// ─── Start game: build players, cars, tasks ──────────────────────────────────

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

  // Assign roles: first player is human; bots assigned randomly
  const roleAssign = Array.from({ length: playerCount }, (_, i) =>
    i === 0 ? 'khozain' : 'khozain'
  ) as Array<'khozain' | 'slivshchik'>;

  // Randomly assign siphoner roles to bots
  const botIndices = Array.from({ length: playerCount - 1 }, (_, i) => i + 1);
  shuffle(botIndices);
  for (let i = 0; i < siphonersCount; i++) {
    roleAssign[botIndices[i]] = 'slivshchik';
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
      speed: i === 0 ? 160 : 130 + Math.random() * 40,
      botState: 'idle',
      botTarget: null,
      botTaskId: null,
      botCarId: null,
      botCooldown: Math.random() * 2,
    };
  });

  // Build cars (use first 4 spawns for phase 1)
  const cars: Car[] = CAR_SPAWNS.slice(0, 4).map(cs => ({
    id: cs.id,
    pos: { ...cs.pos },
    fuel: 85 + Math.random() * 15,
    color: cs.color,
    siphoner: null,
    hasImmunity: false,
    immunityTimer: 0,
  }));

  // Build tasks
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

  gs.phase = 'play';
  gs.players = players;
  gs.cars = cars;
  gs.tasks = tasks;
  gs.meeting = null;
  gs.unityMeter = 0;
  gs.winner = null;
  gs.winReason = '';
  gs.localPlayerId = 'player_human';
  gs.time = 0;
  gs.meetingCooldown = 5; // 5s grace at start
  gs.promptText = null;
  gs.promptTimer = 0;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
