import type { GameState, Player, Car, TaskInstance, ImmunityTicket } from './types';
import { CAR_SPAWNS, TASK_SPAWNS, PLAYER_SPAWNS, DUMPSTER_POSITIONS } from '../data/map';
import { CHARACTERS, CHARACTER_KEYS } from '../data/characters';
import { SPRINT_MAX } from './types';

// ─── Singleton mutable game state ────────────────────────────────────────────
// On the server, each GameRoom temporarily points this at its own state
// via setGs() before calling tickGame. Node.js is single-threaded so rooms
// tick sequentially — no interleaving risk.

export let gs: GameState = createInitialState();

export function setGs(s: GameState): void {
  gs = s;
}

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
    matchTimeLimit: 300,
    botDifficulty: 'medium',
    immunityTickets: [],
  };
}

export function resetGameState(): void {
  gs = createInitialState();
}

// ─── Single-player start ──────────────────────────────────────────────────────

export function startGame(
  humanCharacter: string,
  playerCount = 8,
  siphonersCount = 2,
): void {
  const charKey = humanCharacter as typeof CHARACTER_KEYS[number];

  const botCharKeys = CHARACTER_KEYS.filter(k => k !== charKey);
  shuffle(botCharKeys);
  const allChars = [charKey, ...botCharKeys.slice(0, playerCount - 1)];

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
      speedBoostTimer: 0,
      hasImmunityTicket: false,
      neutralRole: null,
      canistersCollected: 0,
      barsikMeowCooldown: 0,
      fuelSiphoned: 0,
      tasksCompleted: 0,
      suspicion: {},
      botState: 'idle',
      botTarget: null,
      botTaskId: null,
      botCarId: null,
      botCooldown: Math.random() * 2,
      khozainLockCooldown: 0,
      khozainLockProgress: 0,
    };
  });

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
    lowFuelWarned: false,
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

  const immunityTickets: ImmunityTicket[] = [];
  if (Math.random() < 0.7) {
    const dumpIdx = Math.floor(Math.random() * DUMPSTER_POSITIONS.length);
    const dp = DUMPSTER_POSITIONS[dumpIdx];
    immunityTickets.push({
      id: `immunity_${Date.now()}`,
      pos: { x: dp.x + 40 + Math.random() * 40, y: dp.y + (Math.random() - 0.5) * 30 },
    });
  }

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
  gs.matchTimeLimit = 300;
  gs.meetingCooldown = 5;
  gs.promptText = null;
  gs.promptTimer = 0;
  gs.activeMiniGame = null;
  gs.activeSabotages = [];
  gs.immunityTickets = immunityTickets;
}

// ─── Multiplayer start ────────────────────────────────────────────────────────

export interface HumanPlayerInfo {
  id: string;
  character: string;
  playerName: string;
}

function makePlayer(
  id: string,
  charKey: string,
  playerName: string,
  role: 'khozain' | 'slivshchik',
  isHuman: boolean,
  spawnIdx: number,
): Player {
  const ck = charKey as typeof CHARACTER_KEYS[number];
  const charDef = CHARACTERS[ck];
  const spawn = PLAYER_SPAWNS[spawnIdx % PLAYER_SPAWNS.length];
  return {
    id,
    name: playerName || charDef.name,
    character: ck,
    role,
    isHuman,
    isAlive: true,
    pos: { x: spawn.x + (Math.random() - 0.5) * 30, y: spawn.y + (Math.random() - 0.5) * 30 },
    vel: { x: 0, y: 0 },
    speed: isHuman ? 165 : 130 + Math.random() * 40,
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
    speedBoostTimer: 0,
    hasImmunityTicket: false,
    neutralRole: null,
    canistersCollected: 0,
    barsikMeowCooldown: 0,
    fuelSiphoned: 0,
    tasksCompleted: 0,
    suspicion: {},
    botState: 'idle',
    botTarget: null,
    botTaskId: null,
    botCarId: null,
    botCooldown: isHuman ? 0 : Math.random() * 2,
    khozainLockCooldown: 0,
    khozainLockProgress: 0,
  };
}

export function startGameMultiplayer(
  humanPlayers: HumanPlayerInfo[],
  playerCount = 6,
  siphonersCount = 2,
): void {
  const humanCharKeys = humanPlayers.map(h => h.character as typeof CHARACTER_KEYS[number]);

  // Bot chars = characters not chosen by humans
  const botCharKeys = CHARACTER_KEYS.filter(k => !humanCharKeys.includes(k));
  shuffle(botCharKeys);

  const numBots = Math.max(0, playerCount - humanPlayers.length);
  const botChars = botCharKeys.slice(0, numBots);

  const totalPlayers = humanPlayers.length + numBots;

  // Assign roles randomly
  const roleAssign: Array<'khozain' | 'slivshchik'> = Array.from(
    { length: totalPlayers },
    () => 'khozain' as const,
  );
  const allIndices = Array.from({ length: totalPlayers }, (_, i) => i);
  shuffle(allIndices);
  for (let i = 0; i < Math.min(siphonersCount, totalPlayers - 1); i++) {
    roleAssign[allIndices[i]] = 'slivshchik';
  }

  const players: Player[] = [
    ...humanPlayers.map((hp, i) =>
      makePlayer(hp.id, hp.character, hp.playerName, roleAssign[i], true, i),
    ),
    ...botChars.map((ck, i) => {
      const charDef = CHARACTERS[ck];
      return makePlayer(
        `bot_${i}`,
        ck,
        charDef.name,
        roleAssign[humanPlayers.length + i],
        false,
        humanPlayers.length + i,
      );
    }),
  ];

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
    lowFuelWarned: false,
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

  const immunityTickets: ImmunityTicket[] = [];
  if (Math.random() < 0.7) {
    const dumpIdx = Math.floor(Math.random() * DUMPSTER_POSITIONS.length);
    const dp = DUMPSTER_POSITIONS[dumpIdx];
    immunityTickets.push({
      id: `immunity_${Date.now()}`,
      pos: { x: dp.x + 40 + Math.random() * 40, y: dp.y + (Math.random() - 0.5) * 30 },
    });
  }

  // localPlayerId defaults to first human; each client overrides before render
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
  gs.localPlayerId = humanPlayers[0]?.id ?? 'player_human';
  gs.time = 0;
  gs.meetingCooldown = 5;
  gs.promptText = null;
  gs.promptTimer = 0;
  gs.activeMiniGame = null;
  gs.activeSabotages = [];
  gs.immunityTickets = immunityTickets;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
