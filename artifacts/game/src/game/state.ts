import type { GameState, Player, Car, TaskInstance, ImmunityTicket, NeutralRole } from './types';
import { CAR_SPAWNS, TASK_SPAWNS, PLAYER_SPAWNS, DUMPSTER_POSITIONS } from '../data/map';
import { CHARACTERS, CHARACTER_KEYS } from '../data/characters';
import { SPRINT_MAX } from './types';

// ─── §3.5 Daily seed PRNG ────────────────────────────────────────────────────

/** mulberry32 — fast seeded PRNG returning [0, 1) */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string → uint32 */
function fnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Today's date string in Moscow time (YYYY-MM-DD) */
export function getMoscowDateString(): string {
  const now = new Date();
  const msk = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const y = msk.getUTCFullYear();
  const m = String(msk.getUTCMonth() + 1).padStart(2, '0');
  const d = String(msk.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns a seeded RNG for today's daily challenge (same result for all players worldwide that day) */
export function makeDailyRng(): () => number {
  return mulberry32(fnv1a(getMoscowDateString()));
}

// ─── Load persisted accessibility settings (read-once at startup) ────────────

function loadSavedAccessibility(): Partial<Pick<GameState,
  'textSize' | 'colorblindMode' | 'highContrastMode' |
  'volumeMaster' | 'volumeMusic' | 'volumeSfx' | 'autoInteract' | 'simplifiedChatWheel' | 'audioCaptions' | 'language'
>> {
  try {
    const raw = localStorage.getItem('95y_profile_v1');
    if (!raw) return {};
    const p = JSON.parse(raw) as Record<string, unknown>;
    const out: ReturnType<typeof loadSavedAccessibility> = {};
    if (p.textSize === 'small' || p.textSize === 'medium' || p.textSize === 'large') out.textSize = p.textSize;
    if (typeof p.colorblindMode === 'boolean')   out.colorblindMode   = p.colorblindMode;
    if (typeof p.highContrastMode === 'boolean') out.highContrastMode = p.highContrastMode;
    if (typeof p.volumeMaster === 'number')      out.volumeMaster     = p.volumeMaster;
    if (typeof p.volumeMusic === 'number')       out.volumeMusic      = p.volumeMusic;
    if (typeof p.volumeSfx === 'number')         out.volumeSfx        = p.volumeSfx;
    if (typeof p.autoInteract === 'boolean')     out.autoInteract     = p.autoInteract;
    if (typeof p.simplifiedChatWheel === 'boolean') out.simplifiedChatWheel = p.simplifiedChatWheel;
    if (typeof p.audioCaptions === 'boolean')    out.audioCaptions    = p.audioCaptions;
    if (p.language === 'ru' || p.language === 'en') out.language      = p.language;
    return out;
  } catch {
    return {};
  }
}

// ─── Singleton mutable game state ────────────────────────────────────────────
// Mutated at 60fps by the game loop. NOT React state.
// React HUD reads a shallow snapshot at 10Hz via GameCanvas.

export let gs: GameState = createInitialState();

export function createInitialState(): GameState {
  const acc = loadSavedAccessibility();
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
    immunityTicketsUsedThisMatch: 0,
    colorblindMode: acc.colorblindMode ?? false,
    highContrastMode: acc.highContrastMode ?? false,
    volumeMaster: acc.volumeMaster ?? 0.55,
    volumeMusic: acc.volumeMusic ?? 1.0,
    volumeSfx: acc.volumeSfx ?? 1.0,
    autoInteract: acc.autoInteract ?? false,
    autoInteractTimer: 0,
    textSize: acc.textSize ?? 'medium',
    simplifiedChatWheel: acc.simplifiedChatWheel ?? false,
    audioCaptions: acc.audioCaptions ?? true,
    language: acc.language ?? 'ru',
    tutorialStep: 0,
    backstabMoment: null,
    backstabMomentAcked: false,
    isDailySeedGame: false,
    emoteWheelOpen: false,
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
  useDailySeed = false,
): void {
  // §3.5 Use seeded RNG for daily challenge — same game layout for all players each day
  const rng = useDailySeed ? makeDailyRng() : Math.random.bind(Math);

  const charKey = humanCharacter as typeof CHARACTER_KEYS[number];

  // Build player list
  const botCharKeys = CHARACTER_KEYS.filter(k => k !== charKey);
  shuffleWith(botCharKeys, rng);
  const allChars = [charKey, ...botCharKeys.slice(0, playerCount - 1)];

  // Assign roles randomly — human included
  const roleAssign: Array<'khozain' | 'slivshchik'> = Array.from(
    { length: playerCount },
    () => 'khozain' as const,
  );
  const allIndices = Array.from({ length: playerCount }, (_, i) => i);
  shuffleWith(allIndices, rng);
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
      pos: { x: spawn.x + (rng() - 0.5) * 30, y: spawn.y + (rng() - 0.5) * 30 },
      vel: { x: 0, y: 0 },
      speed: i === 0 ? 165 : 130 + rng() * 40,
      facingAngle: 0,
      stamina: SPRINT_MAX,
      isSprinting: false,
      isCrouching: false,
      ambushTarget: null,
      ambushChargeTimer: 0,
      ambushCooldown: 0,
      siphonCooldown: 0,
      siphonDecisionCooldown: 0,
      sabotageCooldown: 0,
      sabotageDecisionCooldown: 0,
      isCarryingCanister: false,
      ventCooldown: 0,
      ventFlashTimer: 0,
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
      correctVotes: 0,
      suspicion: {},
      khozainLockCooldown: 0,
      khozainLockProgress: 0,
      botState: 'idle',
      botTarget: null,
      botTaskId: null,
      botCarId: null,
      botCooldown: rng() * 2,
      botPath: [],
      botReplanTimer: 0,
      botPathTarget: null,
      botLodAccum: 0,
      ambushesThisMatch: 0,
      ventUsesThisMatch: 0,
      sabotageUsesThisMatch: {},
      pipeBurstFixesThisMatch: 0,
      wasEjected: false,
      votesReceivedThisMatch: 0,
      atShawarmaDuringVote: false,
      shawarmaBoughtThisMatch: 0,
      canisterCatchTargetId: null,
      canisterCatchSuccess: false,
      barsikCaughtSiphonerId: null,
      barsikWitnessSuccess: false,
    };
  });

  // 4 cars initially
  const cars: Car[] = CAR_SPAWNS.slice(0, 4).map(cs => ({
    id: cs.id,
    pos: { ...cs.pos },
    fuel: 85 + rng() * 15,
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

  // §10.2 Immunity tickets — spawn 1 ticket per match (near a random dumpster or offset)
  const immunityTickets: ImmunityTicket[] = [];
  if (rng() < 0.7) { // 70% chance per match (felt better than 5%, gives meaningful choice)
    const dumpIdx = Math.floor(rng() * DUMPSTER_POSITIONS.length);
    const dp = DUMPSTER_POSITIONS[dumpIdx];
    immunityTickets.push({
      id: `immunity_${Date.now()}`,
      pos: { x: dp.x + 40 + rng() * 40, y: dp.y + (rng() - 0.5) * 30 },
    });
  }

  // §3.1.3 Neutral role assignment — 8-player lobbies only, exactly 1 random neutral role.
  // Барсик is a rare 5% draw; the remaining 95% splits evenly between Участковый and Дворник.
  if (playerCount >= 8) {
    const khozainIndices = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.role === 'khozain')
      .map(({ i }) => i);
    if (khozainIndices.length > 0) {
      const targetIdx = khozainIndices[Math.floor(rng() * khozainIndices.length)];
      const roll = rng();
      const pickedRole: NeutralRole = roll < 0.05 ? 'barsik' : (roll < 0.525 ? 'policeman' : 'janitor');
      players[targetIdx].neutralRole = pickedRole;
    }
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
  gs.matchTimeLimit = 300; // §2.1: 5-minute play phase, extended by tasks
  gs.meetingCooldown = 5;
  gs.promptText = null;
  gs.promptTimer = 0;
  gs.activeMiniGame = null;
  gs.activeSabotages = [];
  gs.immunityTickets = immunityTickets;
  gs.isDailySeedGame = useDailySeed;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function shuffleWith<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function shuffle<T>(arr: T[]): void {
  shuffleWith(arr, Math.random.bind(Math));
}
