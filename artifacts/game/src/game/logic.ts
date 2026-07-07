import { gs } from './state';
import type { InputState, MeetingState, Player, VoteRecord } from './types';
import {
  INTERACT_RADIUS, SIPHON_RADIUS, ALARM_RADIUS, SIPHON_RATE,
  TASK_RESPAWN_TIME, MEETING_COOLDOWN,
} from './types';
import { TASK_DEFS } from '../data/tasks';
import { ENTRANCE_POS, dist, clampToMap, isInsideBuilding } from '../data/map';
import { NEWS_HEADLINES, TICKER_INTERVAL } from '../data/ticker';
import { updateBots } from './botAI';

// ─── Ejection flavor texts ────────────────────────────────────────────────────

const SIPHONER_EJECTED = [
  'был Сливщиком. Теперь он работает на промзоне за еду.',
  'был Сливщиком. Его USDT конфисковали.',
  'был Сливщиком. Это было очевидно с самого начала.',
  'был Сливщиком. Талоны были отвлечением.',
  'был Сливщиком. «У меня травматик» — это был блеф.',
];
const INNOCENT_EJECTED = [
  'не был Сливщиком. Он просто любил машины.',
  'не была Сливщицей. Она снимала контент.',
  'не был Сливщиком. Но его всё равно выгнали.',
  'не была Сливщицей. Она на велосипеде.',
  'не был Сливщиком. Ахмет молчал — это подозрительно.',
];

// ─── Main tick ────────────────────────────────────────────────────────────────

export function tickGame(dt: number, input: InputState): void {
  if (gs.phase === 'play') {
    gs.time += dt;
    gs.meetingCooldown = Math.max(0, gs.meetingCooldown - dt);

    updateHumanPlayer(dt, input);
    updateBots(dt);
    updateTaskProgress(dt, input);
    updateSiphoning(dt);
    updateImmunity(dt);
    updatePrompt(dt);
    updateTicker(dt);
    checkWinConditions();
  } else if (gs.phase === 'meeting') {
    if (gs.meeting) {
      tickMeeting(dt);
    }
  }
}

// ─── Human player movement ────────────────────────────────────────────────────

function updateHumanPlayer(dt: number, input: InputState): void {
  const player = gs.players.find(p => p.id === gs.localPlayerId);
  if (!player || !player.isAlive) return;

  const len = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
  if (len > 0.05) {
    const nx = input.dx / len;
    const ny = input.dy / len;
    const speed = player.speed;

    const newX = player.pos.x + nx * speed * dt;
    const newY = player.pos.y + ny * speed * dt;
    const candidate = clampToMap({ x: newX, y: newY }, 14);

    if (!isInsideBuilding(candidate, 14)) {
      player.pos.x = candidate.x;
      player.pos.y = candidate.y;
    } else {
      // Try sliding along X or Y
      const candX = clampToMap({ x: newX, y: player.pos.y }, 14);
      if (!isInsideBuilding(candX, 14)) {
        player.pos.x = candX.x;
      }
      const candY = clampToMap({ x: player.pos.x, y: newY }, 14);
      if (!isInsideBuilding(candY, 14)) {
        player.pos.y = candY.y;
      }
    }
  }
}

// ─── Task interaction ─────────────────────────────────────────────────────────
// FIXED (was broken in prev session): player must be within INTERACT_RADIUS
// AND holding interact before progress increments. Progress pauses (not resets)
// if player walks away mid-interaction.

function updateTaskProgress(dt: number, input: InputState): void {
  const player = gs.players.find(p => p.id === gs.localPlayerId);
  if (!player || !player.isAlive) return;

  // Respawn completed tasks
  for (const task of gs.tasks) {
    if (task.isComplete && task.respawnTimer > 0) {
      task.respawnTimer = Math.max(0, task.respawnTimer - dt);
      if (task.respawnTimer === 0) {
        task.isComplete = false;
        task.progress = 0;
        task.completedBy = null;
        task.doer = null;
      }
    }
  }

  let nearTask = null;
  let nearDist = Infinity;

  for (const task of gs.tasks) {
    if (task.isComplete) continue;
    const d = dist(player.pos, task.pos);
    if (d < INTERACT_RADIUS && d < nearDist) {
      nearDist = d;
      nearTask = task;
    }
  }

  // Check alarm button (call meeting)
  const alarmDist = dist(player.pos, ENTRANCE_POS);
  if (alarmDist < ALARM_RADIUS && gs.meetingCooldown <= 0) {
    setPrompt('🔔 Нажми [E] чтобы вызвать сходку', 0.2);
    if (input.interact && !input.prevInteract) {
      callMeeting(player.id);
      return;
    }
  }

  // Check siphoning (for human player if they're a slivshchik)
  if (player.role === 'slivshchik') {
    let nearCar = null;
    let nearCarDist = Infinity;
    for (const car of gs.cars) {
      if (car.fuel <= 0 || car.hasImmunity) continue;
      const d = dist(player.pos, car.pos);
      if (d < SIPHON_RADIUS && d < nearCarDist) {
        nearCarDist = d;
        nearCar = car;
      }
    }
    if (nearCar) {
      setPrompt('🪣 Нажми [E] чтобы начать слив', 0.2);
      if (input.interact) {
        nearCar.siphoner = player.id;
      } else {
        // Stop siphoning this car if player releases interact
        if (nearCar.siphoner === player.id) {
          nearCar.siphoner = null;
        }
      }
    }
  }

  // Task interaction
  if (!nearTask) {
    // Player walked away — clear doer state if it was this player
    for (const task of gs.tasks) {
      if (task.doer === player.id) task.doer = null;
    }
    if (!nearCarsForPrompt(player)) {
      clearPromptIfStale();
    }
    return;
  }

  const taskDef = TASK_DEFS[nearTask.defKey];
  setPrompt(`${taskDef.emoji} Нажми [E] чтобы ${taskDef.label}`, 0.2);

  if (input.interact) {
    nearTask.doer = player.id;
    nearTask.progress += dt / taskDef.duration;

    if (nearTask.progress >= 1) {
      nearTask.progress = 1;
      nearTask.isComplete = true;
      nearTask.completedBy = player.id;
      nearTask.doer = null;
      nearTask.respawnTimer = TASK_RESPAWN_TIME;

      gs.unityMeter = Math.min(100, gs.unityMeter + taskDef.unityReward);
      setPrompt(`✅ ${taskDef.label} выполнено! +${taskDef.unityReward}% единства`, 3);
    }
  } else {
    if (nearTask.doer === player.id) nearTask.doer = null;
  }
}

function nearCarsForPrompt(player: Player): boolean {
  if (player.role !== 'slivshchik') return false;
  return gs.cars.some(c => !c.hasImmunity && c.fuel > 0 && dist(player.pos, c.pos) < SIPHON_RADIUS);
}

// ─── Siphoning ────────────────────────────────────────────────────────────────

function updateSiphoning(dt: number): void {
  for (const car of gs.cars) {
    if (!car.siphoner) continue;
    const siphoner = gs.players.find(p => p.id === car.siphoner);
    if (!siphoner || !siphoner.isAlive || car.hasImmunity) {
      car.siphoner = null;
      continue;
    }
    // Verify still in range (this was the bug in prev session for bots)
    if (dist(siphoner.pos, car.pos) > SIPHON_RADIUS + 10) {
      car.siphoner = null;
      continue;
    }
    car.fuel = Math.max(0, car.fuel - SIPHON_RATE * dt);
    if (car.fuel <= 0) car.siphoner = null;
  }
}

function updateImmunity(dt: number): void {
  for (const car of gs.cars) {
    if (car.hasImmunity && car.immunityTimer > 0) {
      car.immunityTimer -= dt;
      if (car.immunityTimer <= 0) {
        car.hasImmunity = false;
        car.immunityTimer = 0;
      }
    }
  }
}

// ─── Prompt system ────────────────────────────────────────────────────────────

function setPrompt(text: string, duration: number): void {
  gs.promptText = text;
  if (duration > gs.promptTimer) gs.promptTimer = duration;
}

function clearPromptIfStale(): void {
  if (gs.promptTimer <= 0) gs.promptText = null;
}

function updatePrompt(dt: number): void {
  if (gs.promptTimer > 0) {
    gs.promptTimer -= dt;
    if (gs.promptTimer <= 0) {
      gs.promptText = null;
      gs.promptTimer = 0;
    }
  }
}

// ─── Ticker ───────────────────────────────────────────────────────────────────

function updateTicker(dt: number): void {
  gs.tickerTimer -= dt;
  if (gs.tickerTimer <= 0) {
    gs.tickerIndex = (gs.tickerIndex + 1) % NEWS_HEADLINES.length;
    gs.tickerTimer = TICKER_INTERVAL;
  }
}

// ─── Meeting ──────────────────────────────────────────────────────────────────

export function callMeeting(callerId: string): void {
  if (gs.meetingCooldown > 0 || gs.phase !== 'play') return;

  // Teleport all alive players to entrance area
  let offset = 0;
  for (const p of gs.players) {
    if (!p.isAlive) continue;
    p.pos = {
      x: ENTRANCE_POS.x + (offset % 5 - 2) * 45,
      y: ENTRANCE_POS.y - 50 - Math.floor(offset / 5) * 45,
    };
    // Stop all siphoning
    p.botState = 'at_meeting';
    offset++;
  }
  for (const car of gs.cars) car.siphoner = null;
  for (const task of gs.tasks) task.doer = null;

  gs.phase = 'meeting';
  gs.meeting = {
    phase: 'discussion',
    callerId,
    timer: 60,
    votes: [],
    ejectedId: null,
    ejectionText: null,
    chatMessages: [],
  };

  // Post an initial bot message
  scheduleBotChatMessages();
}

// ─── Meeting tick ─────────────────────────────────────────────────────────────
// FIXED (was broken in prev session): timer now ticked by game loop, not setInterval.
// Bots vote only after discussion phase ends.

function tickMeeting(dt: number): void {
  const m = gs.meeting!;
  m.timer -= dt;

  if (m.phase === 'discussion') {
    // Auto-advance to voting when timer hits 0
    if (m.timer <= 0) {
      m.phase = 'voting';
      m.timer = 30;
      // Bots vote immediately when voting phase starts
      castBotVotes();
    }
  } else if (m.phase === 'voting') {
    if (m.timer <= 0) {
      resolveMeeting();
    }
  } else if (m.phase === 'reveal') {
    if (m.timer <= 0) {
      endMeeting();
    }
  }
}

function castBotVotes(): void {
  const m = gs.meeting!;
  const alivePlayers = gs.players.filter(p => p.isAlive);

  for (const bot of gs.players) {
    if (bot.isHuman || !bot.isAlive) continue;
    if (m.votes.some(v => v.voterId === bot.id)) continue;

    // Bots vote with some delay
    const delay = 2 + Math.random() * 15;
    setTimeout(() => {
      if (!gs.meeting || gs.meeting.phase !== 'voting') return;
      // Bots have 20% chance to skip, otherwise vote random alive player
      const skipChance = 0.2;
      if (Math.random() < skipChance) {
        gs.meeting.votes.push({ voterId: bot.id, targetId: null });
      } else {
        const candidates = alivePlayers.filter(p => p.id !== bot.id);
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          gs.meeting.votes.push({ voterId: bot.id, targetId: target.id });
        }
      }
    }, delay * 1000);
  }
}

function resolveMeeting(): void {
  const m = gs.meeting!;
  const tally: Record<string, number> = {};

  for (const vote of m.votes) {
    if (vote.targetId) {
      tally[vote.targetId] = (tally[vote.targetId] ?? 0) + 1;
    }
  }

  let maxVotes = 0;
  let ejectedId: string | null = null;
  let tie = false;

  for (const [playerId, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count;
      ejectedId = playerId;
      tie = false;
    } else if (count === maxVotes) {
      tie = true;
    }
  }

  if (tie || maxVotes === 0) ejectedId = null;

  m.ejectedId = ejectedId;
  m.phase = 'reveal';
  m.timer = 6;

  if (ejectedId) {
    const ejected = gs.players.find(p => p.id === ejectedId);
    if (ejected) {
      ejected.isAlive = false;
      const isSlivshchik = ejected.role === 'slivshchik';
      const texts = isSlivshchik ? SIPHONER_EJECTED : INNOCENT_EJECTED;
      const rndText = texts[Math.floor(Math.random() * texts.length)];
      m.ejectionText = `${ejected.name} ${rndText}`;
    }
  } else {
    m.ejectionText = 'Ничья! Никто не выброшен. Двор продолжает страдать.';
  }
}

export function submitVote(voterId: string, targetId: string | null): void {
  if (!gs.meeting || gs.meeting.phase !== 'voting') return;
  if (gs.meeting.votes.some(v => v.voterId === voterId)) return;
  gs.meeting.votes.push({ voterId, targetId });
}

function endMeeting(): void {
  gs.phase = 'play';
  gs.meeting = null;
  gs.meetingCooldown = MEETING_COOLDOWN;

  // Reset bot states
  for (const p of gs.players) {
    if (!p.isHuman) {
      p.botState = 'idle';
      p.botCooldown = 1 + Math.random() * 2;
    }
  }

  checkWinConditions();
}

// ─── Bot chat messages (flavor) ───────────────────────────────────────────────

function scheduleBotChatMessages(): void {
  if (!gs.meeting) return;
  const bots = gs.players.filter(p => !p.isHuman && p.isAlive);
  shuffle(bots);

  const phrases = [
    'Я был у шавермы!',
    'Кто смотрел на мой бак?!',
    'Слива! Слива!',
    'Я видел кого-то у машин.',
    'Где ты был последние 30 секунд?',
    'Это не я, честно!',
    'У меня есть алиби.',
    'Кто-то только что ушёл от меня.',
    'Я выполнял задачу.',
    'Почему ты молчал?',
    'Я видел канистру!',
    'Давайте пропустим.',
  ];

  for (let i = 0; i < Math.min(bots.length, 4); i++) {
    const bot = bots[i];
    const delay = 3 + i * (5 + Math.random() * 8);
    setTimeout(() => {
      if (!gs.meeting) return;
      const phrase = phrases[Math.floor(Math.random() * phrases.length)];
      gs.meeting.chatMessages.push({
        playerId: bot.id,
        playerName: bot.name,
        text: phrase,
        timestamp: Date.now(),
      });
    }, delay * 1000);
  }
}

// ─── Win conditions ───────────────────────────────────────────────────────────

function checkWinConditions(): void {
  if (gs.winner) return;

  // Хозяева win: unity meter full
  if (gs.unityMeter >= 100) {
    gs.winner = 'khozaeva';
    gs.winReason = 'Единство двора достигнуто! Сливщики посрамлены.';
    gs.phase = 'results';
    return;
  }

  // Slivshchiki win: all cars drained
  const allDrained = gs.cars.every(c => c.fuel <= 0);
  if (allDrained) {
    gs.winner = 'slivshchiki';
    gs.winReason = 'Все баки пусты. Сливщики победили. Двор осиротел.';
    gs.phase = 'results';
    return;
  }

  // Slivshchiki win: equal or fewer хозяева than сливщики (via ejections)
  const aliveKhozaeva = gs.players.filter(p => p.isAlive && p.role === 'khozain').length;
  const aliveSlivshchiki = gs.players.filter(p => p.isAlive && p.role === 'slivshchik').length;
  if (aliveSlivshchiki > 0 && aliveKhozaeva <= aliveSlivshchiki) {
    gs.winner = 'slivshchiki';
    gs.winReason = 'Сливщики в большинстве. Двор захвачен.';
    gs.phase = 'results';
    return;
  }

  // Хозяева win: all slivshchiki ejected
  if (aliveSlivshchiki === 0) {
    gs.winner = 'khozaeva';
    gs.winReason = 'Все Сливщики выгнаны! Двор очищен.';
    gs.phase = 'results';
    return;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Re-export for convenience
export { dist };
