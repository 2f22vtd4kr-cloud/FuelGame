import { gs } from './state';
import type { InputState, Player, Body, Canister, TaskInstance, MiniGameType, SabotageKey, SabotageInstance } from './types';
import {
  INTERACT_RADIUS, SIPHON_RADIUS, ALARM_RADIUS,
  BODY_RADIUS, CANISTER_RADIUS, AMBUSH_RADIUS, AMBUSH_LONE_RADIUS,
  SIPHON_RATE, SIPHON_SETUP_TIME, AMBUSH_CHARGE_TIME, AMBUSH_COOLDOWN,
  TASK_RESPAWN_TIME, MEETING_COOLDOWN,
  SPRINT_SPEED_MULT, CROUCH_SPEED_MULT, CANISTER_SLOW_MULT,
  SPRINT_MAX, SPRINT_DRAIN_RATE, SPRINT_REGEN_RATE,
  TASK_MINIGAME_MAP,
  SABOTAGE_COOLDOWNS, SABOTAGE_DURATIONS,
  VALVE_FIX_TIME, VALVE_INTERACT_RADIUS,
  FLOWERBED_SLOW_MULT, VENT_COOLDOWN, VENT_FLASH_DURATION,
  SHAWARMA_SPEED_BOOST_MULT, SHAWARMA_SPEED_BOOST_DURATION,
  IMMUNITY_TICKET_DURATION,
  KHOZAIN_LOCK_DURATION, KHOZAIN_LOCK_COOLDOWN, KHOZAIN_LOCK_HOLD_TIME,
  BOT_DIFFICULTY_SETTINGS,
  SIPHON_AUDIO_RADIUS,
} from './types';
import { TASK_DEFS } from '../data/tasks';
import {
  ENTRANCE_POS, DUMPSTER_POSITIONS, MEETING_SPAWNS, dist, clampToMap, isInsideBuilding,
  VALVE_POSITIONS, BABUSHKA_CERBERUS_POS, BABUSHKA_NPC_POS, isInFlowerBed,
} from '../data/map';
import { CHARACTERS } from '../data/characters';
import { NEWS_HEADLINES, TICKER_INTERVAL } from '../data/ticker';
import { updateBots } from './botAI';
import { audio } from './audio';

// ─── Module-level state ───────────────────────────────────────────────────────
let _prevPhase: string = '';      // for music phase-transition detection
let _footstepTimer = 0;           // seconds since last footstep sound

// ─── Ejection texts (§2.7.6) ──────────────────────────────────────────────────

const EJECTED_AS_SLIVSHCHIK: Partial<Record<string, string>> = {
  denis:         'Денис был Сливщиком. Теперь он работает на промзоне за еду.',
  anya:          'Аня была Сливщицей. «Это не моя тачка» — это было её прикрытие.',
  vova:          'Вова был Сливщиком. Его USDT конфисковали.',
  uncle_seryozha:'Серёжа был Сливщиком. Талоны были отвлечением. (Опечатка? Нет.)',
  petrovich:     'Петрович был Сливщиком. Это было очевидно с самого начала.',
  marina:        'Марина была Сливщицей. Контент «реакция на слив» зашёл слишком далеко.',
  akhmet:        'Ахмет был Сливщиком. Он молчал, потому что ему было стыдно.',
  oleg:          'Олег был Сливщиком. «У меня травматик» — это был bluff.',
  lena:          'Лена была Сливщицей. Велосипед был для отвода глаз.',
  barsik:        'Барсик был Сливщиком. (Это невозможно по правилам, но вот мы тут.)',
};

const EJECTED_AS_INNOCENT: Partial<Record<string, string>> = {
  denis:         'Денис не был Сливщиком. Но его выкинули, потому что он сказал «Смена горит» в третий раз.',
  anya:          'Аня не была Сливщицей. Она просто любила каршеринг.',
  vova:          'Вова не был Сливщиком. Он просто хотел внимания.',
  uncle_seryozha:'Дядя Серёжа не был Сливщиком. У него и так талоны. Зачем ему сливать? → @fuel_fuel_fuel_bot',
  petrovich:     'Петрович не был Сливщиком. Он чинил всем машины. Бесплатно. Подозрительно.',
  marina:        'Марина не была Сливщицей. Она снимала контент, а не сливала.',
  akhmet:        'Ахмет не был Сливщиком. Он просто мёл двор. И молчал.',
  oleg:          'Олег не был Сливщиком. Но он и не был не Сливщиком. (Это баг, простите.)',
  lena:          'Лена не была Сливщицей. Она на велосипеде.',
  barsik:        'Барсик не был Сливщиком. Барсик — кот. Барсик пошёл спать.',
};

function getEjectionText(charKey: string, isSlivshchik: boolean): string {
  if (isSlivshchik) {
    return EJECTED_AS_SLIVSHCHIK[charKey] ?? `${charKey} был Сливщиком. Это было очевидно.`;
  }
  return EJECTED_AS_INNOCENT[charKey] ?? `${charKey} не был Сливщиком. Двор скорбит.`;
}

// ─── Drunk calm dialogue rounds ───────────────────────────────────────────────

const DRUNK_ROUNDS = [
  {
    dialogue: '«Слушайте... ик... это не я!.. Машина сама...»',
    options: ['Точно ты!', 'Вася, мы понимаем', 'Иди проспись'],
    correct: 1,
  },
  {
    dialogue: '«Братан... ик... дай денег на такси... или пешком...»',
    options: ['Ни за что', 'Конечно, держи', 'Ты пьяный, Вася'],
    correct: 2,
  },
  {
    dialogue: '«Я... ик... всё вижу насквозь...»',
    options: ['Спокойно, Вася', 'А ты видишь бордюр?', 'ЗА МНОЙ НЕ СЛЕДИТЬ!'],
    correct: 0,
  },
  {
    dialogue: '«Ик... А если опять подорожает завтра... ик...»',
    options: ['Да, тяжёлые времена', 'Иди спать уже', 'Купи талоны!'],
    correct: 0,
  },
];

function getDrunkRound(): { dialogue: string; options: string[]; correct: number } {
  return DRUNK_ROUNDS[Math.floor(Math.random() * DRUNK_ROUNDS.length)];
}

// ─── Persistent Бабушка NPC witness hint ──────────────────────────────────────
// §2.4: Хозяева get honest hints; Сливщики get cover stories (babushka lies for them)

function getBabushkaHint(role: string): string {
  // §2.4 Сливщик path: babushka provides plausible cover (she lies for them)
  if (role === 'slivshchik') {
    const covers = [
      'Ты? Нет, ты всё время был у подъезда. Точно помню.',
      'Никого у машин не видела. Только голуби летали.',
      'Эти Хозяева вечно придираются. Ты молодец, иди.',
      'Скажи им, что помогал мне с пакетами. Я подтвержу.',
      'Сидел тут тихо, никуда не ходил. Так и говори.',
      'Мне 78 лет, я уже плохо вижу в темноте. Никого не было.',
    ];
    return covers[Math.floor(Math.random() * covers.length)];
  }

  // §2.4 Хозяин path: honest witness hints based on game state
  const drainedCar = gs.cars.find(c => c.fuel < 40);
  if (drainedCar && Math.random() < 0.55) {
    const colorRu = drainedCar.color === '#E53935' ? 'красной' :
                    drainedCar.color === '#1565C0' ? 'синей' :
                    drainedCar.color === '#2E7D32' ? 'зелёной' : 'той';
    const hints = [
      `Видела кого-то у ${colorRu} машины... крутился долго.`,
      `Был тут кто-то. Шлангом что-то делал. Я не спрашивала.`,
      `Слышала бульканье у парковки. Ваши дела.`,
      `У ${colorRu} машины кто-то стоял. Долго. Подозрительно.`,
    ];
    return hints[Math.floor(Math.random() * hints.length)];
  }
  const innocent = [
    'Коты опять лазили по машинам. Только коты.',
    'Ничего не видела. Сериал смотрела.',
    'Денис куда-то бегал. Или не он. Все одинаковые в темноте.',
    'Мне 78 лет. Я вижу всё. Но говорю не всем.',
    'У меня талоны. Мне не страшно.',
    'Спрашивай у Барсика, не у меня.',
    'Тихо было. Слишком тихо для нашего двора.',
  ];
  return innocent[Math.floor(Math.random() * innocent.length)];
}

// ─── Letter texts for mailbox mini-game ──────────────────────────────────────

const LETTER_TEXTS = [
  'Уважаемый жилец!\nС 1 августа тариф на ЖКХ\nповышается на 14%.\n\n— Руководство ЖК «Цветочные Поляны»',
  'Вам посылка. Она на почте до 15-го.\nЕсли не заберёте — вернём отправителю.\nИзвинений не принимаем.\n\n— Почта России',
  'УВЕДОМЛЕНИЕ:\nПарковочное место №7 забронировано.\nОсвободите немедленно.\n\n— Администрация ЖК',
  'Жилец! Вам начислены пени\nза просрочку коммуналки: 340₽.\nОплатите до 1-го числа.\n\n— УК «Уют-2026»',
  'Приглашаем на собрание жильцов\n19-го числа в 18:00.\nПовестка: сифонеры во дворе.\nЯвка обязательна.\n\n— Старший по дому',
];

// ─── Main tick ────────────────────────────────────────────────────────────────

export function tickGame(dt: number, input: InputState): void {
  // §8.1 Phase-driven music — runs every frame, before any early returns
  if (gs.phase !== _prevPhase) {
    if (gs.phase === 'play')         audio.playMusic('play');
    else if (gs.phase === 'meeting') audio.playMusic('meeting');
    else if (gs.phase === 'lobby' || gs.phase === 'results')
                                     audio.playMusic('menu');
    else                             audio.stopMusic();  // briefing
    _prevPhase = gs.phase;
  }

  if (gs.phase === 'briefing') {
    gs.briefingTimer = Math.max(0, gs.briefingTimer - dt);
    if (gs.briefingTimer <= 0) gs.phase = 'play';
    return;
  }
  if (gs.phase === 'play') {
    gs.time += dt;
    gs.meetingCooldown = Math.max(0, gs.meetingCooldown - dt);

    // §1.4 AI-95 price: gentle real-time drift every frame (±5₽ sinusoidal, display-only)
    gs.ai95Price = 87 + Math.round(3 * Math.sin(gs.time * 0.08) + 2 * Math.sin(gs.time * 0.031));

    // §2.1 Match time limit countdown
    gs.matchTimeLimit = Math.max(0, gs.matchTimeLimit - dt);
    if (gs.matchTimeLimit <= 0 && !gs.winner) {
      gs.winner = 'slivshchiki';
      gs.winReason = 'Время вышло! Сливщики пережили двор.';
      gs.phase = 'results';
      audio.play('win_slivshchiki');
      return;
    }

    // Task respawn tick (must run even when mini-game is active)
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

    updateHumanPlayer(dt, input);
    updateBots(dt);
    updateMiniGame(dt, input);
    updateSabotages(dt, input);
    updateInteractions(dt, input);
    updateSiphoning(dt);
    updateImmunity(dt);
    updatePrompt(dt);
    updateTicker(dt);
    updateEmotes(dt);
    updateVentFlash(dt);
    updateNeutralMechanics(dt);
    updateTutorial(dt);
    updateBackstabMoment();
    checkWinConditions();
  } else if (gs.phase === 'meeting') {
    if (gs.meeting) tickMeeting(dt);
  }
}

// ─── Human player movement ────────────────────────────────────────────────────

function updateHumanPlayer(dt: number, input: InputState): void {
  const player = gs.players.find(p => p.id === gs.localPlayerId);
  if (!player || !player.isAlive) return;

  // Block movement during active siphon (phase 2)
  const activeSiphon = gs.cars.some(c => c.siphoner === player.id && c.siphonPhase === 2);
  if (activeSiphon) {
    player.isSprinting = false;
    return;
  }

  const len = Math.sqrt(input.dx * input.dx + input.dy * input.dy);
  const isMoving = len > 0.05;

  if (isMoving) {
    player.facingAngle = Math.atan2(input.dy, input.dx);
  }

  player.isCrouching = input.crouch && !input.sprint;

  if (input.sprint && isMoving && player.stamina > 0) {
    player.isSprinting = true;
    player.stamina = Math.max(0, player.stamina - SPRINT_DRAIN_RATE * dt);
    if (player.stamina <= 0) player.isSprinting = false;
  } else {
    player.isSprinting = false;
    if (!input.sprint) {
      player.stamina = Math.min(SPRINT_MAX, player.stamina + SPRINT_REGEN_RATE * dt);
    }
  }

  let speedMult = 1.0;
  if (player.isSprinting) speedMult = SPRINT_SPEED_MULT;
  else if (player.isCrouching) speedMult = CROUCH_SPEED_MULT;
  if (player.isCarryingCanister) speedMult *= CANISTER_SLOW_MULT;
  // §1.2 Flower-bed slow zone (0.6× speed, can't sprint out faster)
  if (isInFlowerBed(player.pos)) speedMult *= FLOWERBED_SLOW_MULT;
  // §2.4 Shawarma speed boost
  if (player.speedBoostTimer > 0) {
    speedMult *= SHAWARMA_SPEED_BOOST_MULT;
    player.speedBoostTimer = Math.max(0, player.speedBoostTimer - dt);
  }

  // §3.1.2 Vent cooldown decay
  if (player.ventCooldown > 0) player.ventCooldown -= dt;

  if (isMoving) {
    const nx = input.dx / len;
    const ny = input.dy / len;
    const speed = player.speed * speedMult;

    const newX = player.pos.x + nx * speed * dt;
    const newY = player.pos.y + ny * speed * dt;
    const candidate = clampToMap({ x: newX, y: newY }, 14);

    if (!isInsideBuilding(candidate, 14)) {
      player.pos = candidate;
    } else {
      const candX = clampToMap({ x: newX, y: player.pos.y }, 14);
      if (!isInsideBuilding(candX, 14)) { player.pos = candX; }
      else {
        const candY = clampToMap({ x: player.pos.x, y: newY }, 14);
        if (!isInsideBuilding(candY, 14)) { player.pos = candY; }
      }
    }
  }

  if (player.ambushCooldown > 0) player.ambushCooldown -= dt;
  if (player.siphonCooldown > 0) player.siphonCooldown -= dt;
  if (player.suspectedTimer > 0) player.suspectedTimer -= dt;
  if (player.khozainLockCooldown > 0) player.khozainLockCooldown = Math.max(0, player.khozainLockCooldown - dt);
  if (!input.interact && player.khozainLockProgress > 0) player.khozainLockProgress = 0;

  // §8.2 Footstep sounds (not while crouching, not while standing still)
  if (isMoving && !player.isCrouching) {
    const stepInterval = player.isSprinting ? 0.30 : 0.48;
    _footstepTimer += dt;
    if (_footstepTimer >= stepInterval) {
      _footstepTimer = 0;
      if (isInFlowerBed(player.pos)) {
        audio.play('footstep_grass');
      } else {
        audio.play('footstep_asphalt');
      }
    }
  } else {
    _footstepTimer = 0;
  }
}

// ─── §2.5 Task Mini-Games ─────────────────────────────────────────────────────

function startMiniGame(taskId: string, defKey: string, type: MiniGameType, isFake = false): void {
  // ── Type-specific initial data ──
  let choiceOptions: string[] = [];
  let choiceCorrect = 0;
  let letterText = LETTER_TEXTS[Math.floor(Math.random() * LETTER_TEXTS.length)];

  if (type === 'flower_match') {
    const flowers = ['🌼', '🌹', '🌻', '🌷', '💐', '🌺'];
    shuffleArr(flowers);
    choiceOptions = flowers.slice(0, 3);
    choiceCorrect = Math.floor(Math.random() * 3);
  } else if (type === 'drunk_calm') {
    const round = getDrunkRound();
    choiceOptions = round.options;
    choiceCorrect = round.correct;
    letterText = round.dialogue;
  }

  // ── wire_drag: shuffle sockets ──
  let wireSockets = [0, 1, 2];
  if (type === 'wire_drag') {
    for (let i = wireSockets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wireSockets[i], wireSockets[j]] = [wireSockets[j], wireSockets[i]];
    }
  }

  gs.activeMiniGame = {
    taskId,
    defKey: defKey as import('./types').TaskDefKey,
    type,
    // tap_timing
    markerPos: 0.5,
    markerDir: 1,
    markerSpeed: 0.65,
    hits: 0,
    requiredHits: defKey === 'shawarma' ? 3 : 2,
    // rapid_tap / dog_walk
    tapCount: 0,
    requiredTaps: defKey === 'pigeons' ? 15 : defKey === 'fix_swing' ? 8 : defKey === 'water_lawn' ? 12 : defKey === 'flowers' ? 10 : type === 'dog_walk' ? 5 : 12,
    timeLimit: defKey === 'pigeons' ? 7 : defKey === 'fix_swing' ? 6 : defKey === 'water_lawn' ? 6 : defKey === 'flowers' ? 5 : type === 'dog_walk' ? 10 : 5,
    timeLimitMax: defKey === 'pigeons' ? 7 : defKey === 'fix_swing' ? 6 : defKey === 'water_lawn' ? 6 : defKey === 'flowers' ? 5 : type === 'dog_walk' ? 10 : 5,
    // sequence — check_meter generates ascending 4-digit reading
    sequence: (() => {
      const seq = [
        Math.floor(Math.random() * 9) + 1,
        Math.floor(Math.random() * 9) + 1,
        Math.floor(Math.random() * 9) + 1,
        Math.floor(Math.random() * 9) + 1,
      ];
      return defKey === 'check_meter' ? seq.slice().sort((a, b) => a - b) : seq;
    })(),
    seqIndex: 0,
    seqWrong: false,
    // dial — close_tap requires 2 stops (720°), default 3
    dialAngle: 0,
    dialTarget: Math.floor(Math.random() * 360),
    dialGreenWidth: 22,
    dialStops: 0,
    dialRequiredStops: defKey === 'close_tap' ? 2 : 3,
    // letter
    letterText,
    // choice (flower_match & drunk_calm)
    choiceOptions,
    choiceCorrect,
    choiceSelected: -1,
    choiceRound: 0,
    choiceRequired: 3,
    // dog_walk
    dogWaypoint: 0,
    dogRequired: 3,
    // taxi_order
    taxiPhase: 'order',
    taxiWaitTimer: 0,
    // wire_drag
    wireSockets,
    wireConnected: [false, false, false],
    wireDragging: -1,
    // shared
    feedback: 'none',
    feedbackTimer: 0,
    done: false,
    isFake,
  };
}

function updateMiniGame(dt: number, input: InputState): void {
  const mg = gs.activeMiniGame;
  if (!mg) return;

  const task = gs.tasks.find(t => t.id === mg.taskId);
  const player = gs.players.find(p => p.id === gs.localPlayerId);

  if (!task || task.isComplete || !player || !player.isAlive) {
    cancelMiniGame();
    return;
  }

  // Cancel if player walked away from the task (no exemptions — even digit pad needs proximity)
  const taskDist = dist(player.pos, task.pos);
  if (taskDist > INTERACT_RADIUS * 1.6) {
    cancelMiniGame();
    return;
  }

  // Update feedback timer
  if (mg.feedbackTimer > 0) {
    mg.feedbackTimer = Math.max(0, mg.feedbackTimer - dt);
    if (mg.feedbackTimer <= 0) mg.feedback = 'none';
  }

  // If already done, complete or fake-complete the task
  if (mg.done) {
    if (mg.isFake) {
      fakeCompleteTask(task, player);
    } else {
      completeTask(task, player);
    }
    gs.activeMiniGame = null;
    return;
  }

  const justPressed = input.interact && !input.prevInteract;
  const held = input.interact;
  const justReleased = !input.interact && input.prevInteract;

  switch (mg.type) {
    case 'tap_timing': {
      // Oscillate marker
      mg.markerPos += mg.markerDir * mg.markerSpeed * dt;
      if (mg.markerPos >= 1) { mg.markerPos = 1; mg.markerDir = -1; }
      if (mg.markerPos <= 0) { mg.markerPos = 0; mg.markerDir = 1; }

      if (justPressed && mg.feedback === 'none') {
        const inZone = mg.markerPos >= 0.4 && mg.markerPos <= 0.6;
        if (inZone) {
          mg.hits++;
          mg.feedback = 'hit';
          mg.feedbackTimer = 0.35;
          audio.play('task_complete');
          if (mg.hits >= mg.requiredHits) mg.done = true;
        } else {
          mg.feedback = 'miss';
          mg.feedbackTimer = 0.35;
          mg.hits = Math.max(0, mg.hits - 1);
        }
      }
      break;
    }

    case 'rapid_tap': {
      mg.timeLimit = Math.max(0, mg.timeLimit - dt);
      if (justPressed) {
        mg.tapCount++;
        if (mg.tapCount >= mg.requiredTaps) mg.done = true;
      }
      if (mg.timeLimit <= 0 && !mg.done) {
        // Failed: reset counter and timer
        mg.tapCount = 0;
        mg.timeLimit = mg.timeLimitMax;
        mg.feedback = 'miss';
        mg.feedbackTimer = 0.5;
      }
      break;
    }

    case 'dial': {
      if (held) {
        mg.dialAngle = (mg.dialAngle + 90 * dt) % 360;
      }
      if (justReleased) {
        const diff = Math.abs(((mg.dialAngle - mg.dialTarget + 540) % 360) - 180);
        if (diff <= mg.dialGreenWidth) {
          mg.dialStops++;
          mg.feedback = 'hit';
          mg.feedbackTimer = 0.45;
          audio.play('task_complete');
          // New random target for next stop
          mg.dialTarget = (mg.dialAngle + 90 + Math.floor(Math.random() * 180)) % 360;
          if (mg.dialStops >= mg.dialRequiredStops) mg.done = true;
        } else {
          mg.feedback = 'miss';
          mg.feedbackTimer = 0.45;
        }
      }
      break;
    }

    case 'sequence': {
      // Clear seqWrong flash after feedback timer
      if (mg.seqWrong && mg.feedbackTimer <= 0) mg.seqWrong = false;
      break;
    }

    case 'letter': {
      if (justPressed) mg.done = true;
      break;
    }

    case 'dog_walk': {
      mg.timeLimit = Math.max(0, mg.timeLimit - dt);
      if (justPressed) {
        mg.tapCount++;
        if (mg.tapCount >= mg.requiredTaps) {
          mg.tapCount = 0;
          mg.timeLimit = mg.timeLimitMax;
          mg.dogWaypoint++;
          mg.feedback = 'hit';
          mg.feedbackTimer = 0.4;
          audio.play('task_complete');
          if (mg.dogWaypoint >= mg.dogRequired) mg.done = true;
        }
      }
      if (mg.timeLimit <= 0 && !mg.done) {
        mg.tapCount = 0;
        mg.timeLimit = mg.timeLimitMax;
        mg.feedback = 'miss';
        mg.feedbackTimer = 0.5;
      }
      break;
    }

    case 'flower_match':
    case 'drunk_calm': {
      // When feedbackTimer expires after player made a choice, advance to next round
      if (mg.feedbackTimer <= 0 && mg.choiceSelected >= 0 && !mg.done) {
        if (mg.type === 'flower_match') {
          const flowers = ['🌼', '🌹', '🌻', '🌷', '💐', '🌺'];
          shuffleArr(flowers);
          mg.choiceOptions = flowers.slice(0, 3);
          mg.choiceCorrect = Math.floor(Math.random() * 3);
        } else {
          const round = getDrunkRound();
          mg.letterText = round.dialogue;
          mg.choiceOptions = round.options;
          mg.choiceCorrect = round.correct;
        }
        mg.choiceSelected = -1;
        mg.choiceRound++;
        mg.feedback = 'none';
      }
      break;
    }

    case 'taxi_order': {
      if (mg.taxiPhase === 'wait') {
        mg.taxiWaitTimer += dt;
        if (mg.taxiWaitTimer >= 3) {
          mg.taxiPhase = 'confirm';
          audio.play('ui_hover');
        }
      }
      break;
    }

    case 'wire_drag': {
      // Pure React UI — no per-frame updates needed; done flag set by onMiniGameWireSource/Socket
      break;
    }
  }
}

/** §2.5 Wire-drag: select a source wire by color index (0=red,1=blue,2=green) */
export function onMiniGameWireSource(colorIndex: number): void {
  const mg = gs.activeMiniGame;
  if (!mg || mg.type !== 'wire_drag') return;
  if (mg.wireConnected[colorIndex]) return; // already done
  mg.wireDragging = colorIndex;
  mg.feedback = 'none';
}

/** §2.5 Wire-drag: attempt to connect selected source to socket at given position index */
export function onMiniGameWireSocket(socketPos: number): void {
  const mg = gs.activeMiniGame;
  if (!mg || mg.type !== 'wire_drag') return;
  if (mg.wireDragging < 0) return;
  const player = gs.players.find(p => p.id === gs.localPlayerId);
  const task = gs.tasks.find(t => t.id === mg.taskId);
  if (!player || !task || dist(player.pos, task.pos) > INTERACT_RADIUS * 1.6) {
    cancelMiniGame(); return;
  }

  const socketColor = mg.wireSockets[socketPos];
  if (socketColor === mg.wireDragging) {
    // Correct match
    mg.wireConnected[mg.wireDragging] = true;
    mg.feedback = 'hit';
    mg.feedbackTimer = 0.4;
    mg.wireDragging = -1;
    audio.play('task_complete');
    if (mg.wireConnected.every(Boolean)) mg.done = true;
  } else {
    // Wrong socket
    mg.feedback = 'miss';
    mg.feedbackTimer = 0.4;
    mg.wireDragging = -1;
    audio.play('ui_click');
  }
}

/** §2.5 Choice-based mini-game (flower_match, drunk_calm): tap one of the displayed options */
export function onMiniGameChoice(index: number): void {
  const mg = gs.activeMiniGame;
  if (!mg || mg.feedbackTimer > 0) return;
  if (mg.type !== 'flower_match' && mg.type !== 'drunk_calm') return;
  const player = gs.players.find(p => p.id === gs.localPlayerId);
  const task = gs.tasks.find(t => t.id === mg.taskId);
  if (!player || !task || dist(player.pos, task.pos) > INTERACT_RADIUS * 1.6) {
    cancelMiniGame(); return;
  }

  if (index < 0 || index >= mg.choiceOptions.length) return; // bounds guard
  mg.choiceSelected = index;
  if (index === mg.choiceCorrect) {
    mg.hits++;
    mg.feedback = 'hit';
    mg.feedbackTimer = 0.7;
    audio.play('task_complete');
    if (mg.hits >= mg.choiceRequired) mg.done = true;
  } else {
    mg.feedback = 'miss';
    mg.feedbackTimer = 0.55;
    mg.hits = Math.max(0, mg.hits - 1);
  }
}

/** §2.5 Taxi order mini-game: tap button to advance through phases */
export function onMiniGameTaxiTap(): void {
  const mg = gs.activeMiniGame;
  if (!mg || mg.type !== 'taxi_order') return;
  const player = gs.players.find(p => p.id === gs.localPlayerId);
  const task = gs.tasks.find(t => t.id === mg.taskId);
  if (!player || !task || dist(player.pos, task.pos) > INTERACT_RADIUS * 1.6) {
    cancelMiniGame(); return;
  }
  if (mg.taxiPhase === 'order') {
    mg.taxiPhase = 'wait';
    mg.taxiWaitTimer = 0;
    audio.play('ui_click');
  } else if (mg.taxiPhase === 'confirm') {
    mg.done = true;
    audio.play('task_complete');
  }
}

/** Called from React mini-game UI for tap-based interactions */
export function onMiniGameTap(): void {
  const mg = gs.activeMiniGame;
  if (!mg || mg.feedback !== 'none') return;
  // Proximity guard: React UI can be tapped while player has already walked away
  const player = gs.players.find(p => p.id === gs.localPlayerId);
  const task = gs.tasks.find(t => t.id === mg.taskId);
  if (!player || !task || dist(player.pos, task.pos) > INTERACT_RADIUS * 1.6) {
    cancelMiniGame(); return;
  }

  if (mg.type === 'letter') {
    mg.done = true;
  } else if (mg.type === 'rapid_tap') {
    mg.tapCount++;
    if (mg.tapCount >= mg.requiredTaps) mg.done = true;
  } else if (mg.type === 'dog_walk') {
    mg.tapCount++;
    if (mg.tapCount >= mg.requiredTaps) {
      mg.tapCount = 0;
      mg.timeLimit = mg.timeLimitMax;
      mg.dogWaypoint++;
      mg.feedback = 'hit';
      mg.feedbackTimer = 0.4;
      audio.play('task_complete');
      if (mg.dogWaypoint >= mg.dogRequired) mg.done = true;
    }
  } else if (mg.type === 'tap_timing') {
    const inZone = mg.markerPos >= 0.4 && mg.markerPos <= 0.6;
    if (inZone) {
      mg.hits++;
      mg.feedback = 'hit';
      mg.feedbackTimer = 0.35;
      audio.play('task_complete');
      if (mg.hits >= mg.requiredHits) mg.done = true;
    } else {
      mg.feedback = 'miss';
      mg.feedbackTimer = 0.35;
      mg.hits = Math.max(0, mg.hits - 1);
    }
  }
}

/** Called from React sequence digit pad */
export function onMiniGameDigitTap(digit: number): void {
  const mg = gs.activeMiniGame;
  if (!mg || mg.type !== 'sequence') return;
  // Proximity guard
  const player = gs.players.find(p => p.id === gs.localPlayerId);
  const task = gs.tasks.find(t => t.id === mg.taskId);
  if (!player || !task || dist(player.pos, task.pos) > INTERACT_RADIUS * 1.6) {
    cancelMiniGame(); return;
  }

  if (mg.sequence[mg.seqIndex] === digit) {
    mg.seqIndex++;
    mg.seqWrong = false;
    audio.play('ui_click');
    if (mg.seqIndex >= mg.sequence.length) mg.done = true;
  } else {
    mg.seqIndex = 0;
    mg.seqWrong = true;
    mg.feedback = 'miss';
    mg.feedbackTimer = 0.4;
  }
}

// ─── §3.1.3 Neutral mechanics ─────────────────────────────────────────────────

function updateNeutralMechanics(dt: number): void {
  for (const player of gs.players) {
    if (!player.isAlive || !player.neutralRole) continue;
    if (player.barsikMeowCooldown > 0) player.barsikMeowCooldown -= dt;

    // §3.1.3 Барсик neutral: auto-meow when witnessing active siphon within 200px
    if (player.neutralRole === 'barsik' && player.barsikMeowCooldown <= 0) {
      const witnessedSiphon = gs.cars.find(car => {
        if (car.siphonPhase !== 2) return false;
        const dx = car.pos.x - player.pos.x;
        const dy = car.pos.y - player.pos.y;
        return Math.sqrt(dx * dx + dy * dy) < 200;
      });
      if (witnessedSiphon) {
        // Меow! Audible alert + canister knock (cancels siphon + creates evidence)
        player.barsikMeowCooldown = 12;
        player.emote = '😺';
        player.emoteTimer = 3;
        audio.play('alarm_button');

        // Knock the canister — interrupt the siphon, leaving evidence
        const siphoner = gs.players.find(p => p.id === witnessedSiphon.siphoner);
        if (siphoner) {
          dropCanister(siphoner, witnessedSiphon, false);
          stopSiphon(witnessedSiphon, siphoner, 'interrupt');
          // Add to meeting chat if meeting is active, else add system message
          const meowMsg = {
            playerId: player.id,
            playerName: player.name,
            text: 'МЯУ! (перевернул канистру у машины!)',
            timestamp: Date.now(),
          };
          if (gs.meeting) {
            gs.meeting.chatMessages.push(meowMsg);
          }
          // Raise suspicion for all khozain bots
          for (const watcher of gs.players) {
            if (watcher.role === 'khozain' && !watcher.isHuman) {
              watcher.suspicion[siphoner.id] = Math.min(1, (watcher.suspicion[siphoner.id] ?? 0) + 0.4);
            }
          }
        }
        if (player.isHuman) {
          setPrompt('😺 МЯУ! Барсик перевернул канистру — улика!', 3);
        }
      }
    }

    // §3.1.3 Дворник neutral: count canisters collected (tracked in interaction logic)
  }
}

/** Called from HUD — Барсик manual meow ability */
export function triggerBarsikMeow(playerId: string): void {
  const player = gs.players.find(p => p.id === playerId);
  if (!player || !player.isAlive || player.neutralRole !== 'barsik') return;
  if (player.barsikMeowCooldown > 0) return;
  player.barsikMeowCooldown = 15;
  player.emote = '😺';
  player.emoteTimer = 4;
  audio.play('alarm_button');
  if (gs.meeting) {
    gs.meeting.chatMessages.push({
      playerId,
      playerName: player.name,
      text: 'МЯУ!',
      timestamp: Date.now(),
    });
  }
  setPrompt('😺 МЯУ! Весь двор услышал.', 3);
}

/** Called from HUD — Участковый investigate body ability */
export function investigateBody(playerId: string): void {
  const player = gs.players.find(p => p.id === playerId);
  if (!player || !player.isAlive || player.neutralRole !== 'policeman') return;
  const nearBody = gs.bodies.find(b => {
    const dx = b.pos.x - player.pos.x;
    const dy = b.pos.y - player.pos.y;
    return Math.sqrt(dx * dx + dy * dy) < 100;
  });
  if (!nearBody) {
    setPrompt('🕵️ Подойди к телу для расследования.', 2);
    return;
  }
  // CSI clue — satirical, cosmetic
  const clues = [
    'Удар нанесён левой рукой. Подозреваемый: левша.',
    'Запах бензина от жертвы. Канистра рядом.',
    'Следы подошвы размера 43. Записал в протокол.',
    'Жертва держала шаверму. Последний обед.',
  ];
  const clue = clues[Math.floor(Math.random() * clues.length)];
  setPrompt(`🕵️ Расследование: ${clue}`, 5);
  if (gs.meeting) {
    gs.meeting.chatMessages.push({
      playerId,
      playerName: player.name,
      text: `Расследование: ${clue}`,
      timestamp: Date.now(),
    });
  }
}

/** Called from HUD — Дворник collect canister ability */
export function janitorCollectCanister(playerId: string): void {
  const player = gs.players.find(p => p.id === playerId);
  if (!player || !player.isAlive || player.neutralRole !== 'janitor') return;
  // Find nearest canister within reach
  const near = gs.canisters.find(c => {
    const dx = c.pos.x - player.pos.x;
    const dy = c.pos.y - player.pos.y;
    return Math.sqrt(dx * dx + dy * dy) < 100;
  });
  if (!near) {
    setPrompt('🧹 Канистр рядом нет. Метите дальше, Ахмет.', 2);
    return;
  }
  // Remove canister from world — janitor disposes it, no carry state needed
  const idx = gs.canisters.indexOf(near);
  gs.canisters.splice(idx, 1);
  player.canistersCollected++;
  // Note: do NOT set isCarryingCanister (that's slivshchik-only mechanics)
  setPrompt(`🧹 Канистра убрана! ${player.canistersCollected}/3`, 3);
}

/** §2.5 — Сливщик fake-task completion: play the sound, reset task so Хозяева can still do it */
function fakeCompleteTask(task: TaskInstance, player: Player): void {
  audio.play('task_complete');
  task.progress = 0;
  task.doer = null;
  // Flavor texts that match the real ones — Сливщик sees them and knows they faked it
  const FAKE_FLAVOR: Partial<Record<string, string>> = {
    shawarma:     '🌯 Шаверма заказана. Ешь — и делай вид, что работал.',
    grandma:      '👵 Проводил бабушку. Она ни о чём не подозревает.',
    window:       '🔌 Повозился с щитком. Убедительно.',
    intercom:     '📡 Потыкал кнопки. Главное — выглядело серьёзно.',
    flowers:      '🌸 Полил цветы. Хозяева умилились.',
    dog_walk:     '🐕 Погулял с Баксом. Отличное алиби.',
    flower_match: '💐 Цветы выбраны. Тётя Люба поверила.',
    drunk_calm:   '🍻 Поговорил с Васей. Теперь он подозревает других.',
    mailbox:      '📬 Письмо прочитано. Тариф вырастет — не твоя проблема.',
    taxi_order:   '🚕 Такси «заказано». Никто не заметил.',
    trash:        '🗑️ Сделал вид, что выносил мусор.',
    help_bags:    '🛍️ Помог соседке. Идеальное прикрытие.',
    pigeons:      '🕊️ Покормил голубей. Публично.',
    find_cat:     '🐱 «Искал» Барсика. Барсик тебя раскусил.',
    fix_swing:    '🛺 Постучал по качелям. Театр.',
    sweep:        '🧹 Помахал метлой. Достаточно.',
    water_lawn:   '💧 Полил газон. Хозяева довольны.',
    check_meter:  '📊 Изучил счётчик. Подозрений нет.',
    kvass:        '🍺 Выпил квас. Время потянуто.',
    close_tap:    '🔧 Покрутил что-то. Похоже на работу.',
  };
  const flavor = FAKE_FLAVOR[task.defKey] ?? '🎭 Притворство засчитано.';
  setPrompt(`🎭 ${flavor}`, 3);
}

/** Cancel the active mini-game (called by React cancel button or logic) */
export function cancelMiniGame(): void {
  if (!gs.activeMiniGame) return;
  const task = gs.tasks.find(t => t.id === gs.activeMiniGame!.taskId);
  if (task) task.doer = null;
  gs.activeMiniGame = null;
}

function completeTask(task: TaskInstance, player: Player): void {
  const taskDef = TASK_DEFS[task.defKey];
  task.progress = 1;
  task.isComplete = true;
  task.completedBy = player.id;
  task.doer = null;
  task.respawnTimer = TASK_RESPAWN_TIME;
  audio.play('task_complete');

  // §2.5 Task completion flavor texts — one per task key
  const TASK_FLAVOR: Partial<Record<string, string>> = {
    shawarma:     '🌯 Шаверма за 180₽. С остреньким.',
    grandma:      '👵 Бабушка в восторге. Рассказала про внука-айтишника.',
    window:       '🔌 Кто-то опять спёр медь.',             // turnstile
    intercom:     '📡 ЖК-чат: «У кого Ростелеком?»',        // router
    flowers:      '🌸 Тётя Люба из 4 подъезда будет довольна.',
    dog_walk:     '🐕 Бакс доволен. Снова потянул к мусоркам.',
    flower_match: '💐 Тётя Люба любит ромашки. Все это знают. Кроме вас, видимо.',
    drunk_calm:   '🍻 Вася из 2 подъезда. Опять.',
    mailbox:      '📬 С 1 августа тариф на ЖКХ повышается на 14%.',
    taxi_order:   '🚕 Яндекс GO. Подача 3 минуты. Сюрприз: 8 минут.',
    trash:        '🗑️ Опять пять пакетов вместо одного.',
    help_bags:    '🛍️ Соседка Люда с рынка. Тяжёлые сумки.',
    pigeons:      '🕊️ Голуби наелись. Голуби наедятся ещё.',
    find_cat:     '🐱 Барсик найден! Барсик совершенно невозмутим.',
    fix_swing:    '🛺 Качели скрипят меньше. Дети не скажут спасибо.',
    sweep:        '🧹 Метёт, как Ахмет учил.',
    water_lawn:   '💧 Газон полит. Жара не отступает.',
    check_meter:  '📊 Счётчик проверен. Цифры тревожные.',
    kvass:        '🍺 Квас за 60₽. Прохладный.',
    close_tap:    '🔧 Кран закрыт. Вода не льётся.',
  };

  if (player.role === 'khozain') {
    gs.unityMeter = Math.min(100, gs.unityMeter + taskDef.unityReward);
    // §2.1 Task completion extends match time by 30 seconds
    gs.matchTimeLimit = Math.min(gs.matchTimeLimit + 30, 600); // cap at 10 min total
    player.tasksCompleted++;
    // §2.4 Shawarma speed boost — buying shawarma gives 10s speed boost
    if (task.defKey === 'shawarma') {
      player.speedBoostTimer = SHAWARMA_SPEED_BOOST_DURATION;
      audio.play('shawarma_buy');
      const flavorText = TASK_FLAVOR.shawarma ?? '';
      setPrompt(`${flavorText} +${taskDef.unityReward}% единства. Скорость ×1.35 на 10с! 🏃`, 3);
    } else {
      const flavor = TASK_FLAVOR[task.defKey];
      setPrompt(flavor
        ? `✅ ${flavor} +${taskDef.unityReward}% единства! +30с`
        : `✅ ${taskDef.label} — +${taskDef.unityReward}% единства! +30с`,
        3);
    }
  } else {
    // Slivshchik faking tasks
    if (task.defKey === 'shawarma') {
      audio.play('shawarma_buy');
      setPrompt(`🌯 Хорошая шаверма. Жаль, не помогла двору.`, 3);
    } else {
      setPrompt(`🎭 ${taskDef.label} — выглядело убедительно.`, 3);
    }
  }

  // §4.3 Bot suspicion: seeing a player complete a task reduces suspicion
  if (player.isHuman) {
    for (const bot of gs.players) {
      if (bot.isHuman || !bot.isAlive || bot.role !== 'khozain') continue;
      if (dist(bot.pos, task.pos) < 220) {
        bot.suspicion[player.id] = Math.max(0, (bot.suspicion[player.id] ?? 0) - 0.1);
      }
    }
  }
}

// ─── §2.9 Sabotage System ─────────────────────────────────────────────────────

export function isSabotageActive(key: SabotageKey): boolean {
  return gs.activeSabotages.some(s => s.key === key && !s.isResolved);
}

/** Called by human player via HUD sabotage menu */
export function triggerSabotage(key: SabotageKey): void {
  const player = gs.players.find(p => p.id === gs.localPlayerId);
  if (!player || player.role !== 'slivshchik' || player.sabotageCooldown > 0) return;
  if (isSabotageActive(key)) return; // already active

  player.sabotageCooldown = SABOTAGE_COOLDOWNS[key];
  spawnSabotage(key);
  setPrompt(getSabotageActivationPrompt(key), 4);
}

/** Called by bot AI — bypasses localPlayerId check */
export function triggerBotSabotage(botId: string, key: SabotageKey): void {
  const bot = gs.players.find(p => p.id === botId);
  if (!bot || bot.sabotageCooldown > 0) return;
  if (isSabotageActive(key)) return;

  bot.sabotageCooldown = SABOTAGE_COOLDOWNS[key];
  spawnSabotage(key);
}

function spawnSabotage(key: SabotageKey): void {
  const sab: SabotageInstance = {
    id: `sab_${key}_${Date.now()}`,
    key,
    timer: SABOTAGE_DURATIONS[key],
    isResolved: false,
    valve1Progress: 0,
    valve2Progress: 0,
  };
  gs.activeSabotages.push(sab);
  // §8.2 distinct sabotage sounds
  switch (key) {
    case 'pipe_burst':        audio.play('pipe_burst_sfx'); break;
    case 'chat_offline':      audio.play('chat_offline_sfx'); break;
    case 'alarm_chaos':       audio.play('trap_trigger'); audio.play('alarm_chaos_sfx'); break;
    case 'babushka_cerberus': audio.play('babushka_cerberus_sfx'); break;
    default:                  audio.play('alarm_button'); break;
  }
}

function getSabotageActivationPrompt(key: SabotageKey): string {
  switch (key) {
    case 'babushka_cerberus': return '👵 Бабушка-Цербер вызвана! Блокирует тревогу.';
    case 'pipe_burst':        return '💧 Трубу прорвало! У хозяев 60 секунд.';
    case 'chat_offline':      return '📵 ЖК-чат офлайн! Тревогу не вызвать 20с.';
    case 'alarm_chaos':       return '🚨 Сигнализация хаос! Звук слива замаскирован.';
  }
}

function updateSabotages(dt: number, input: InputState): void {
  const player = gs.players.find(p => p.id === gs.localPlayerId);

  // Decay all player sabotageCooldowns
  for (const p of gs.players) {
    if (p.sabotageCooldown > 0) p.sabotageCooldown = Math.max(0, p.sabotageCooldown - dt);
  }

  for (let i = gs.activeSabotages.length - 1; i >= 0; i--) {
    const sab = gs.activeSabotages[i];
    if (sab.isResolved) {
      gs.activeSabotages.splice(i, 1);
      continue;
    }

    sab.timer = Math.max(0, sab.timer - dt);

    // ── Player interactions with active sabotages ──
    if (player && player.isAlive && !gs.activeMiniGame) {

      if (sab.key === 'babushka_cerberus') {
        const d = dist(player.pos, BABUSHKA_CERBERUS_POS);
        if (d < ALARM_RADIUS) {
          setPrompt('👵 [E] Покормить бабушку (шаверма)', 0.2);
          if (input.interact && !input.prevInteract) {
            sab.isResolved = true;
            setPrompt('✅ Бабушка накормлена! Кнопка тревоги свободна.', 3);
            audio.play('task_complete');
          }
        }
      }

      if (sab.key === 'pipe_burst') {
        for (let v = 0; v < VALVE_POSITIONS.length; v++) {
          const d = dist(player.pos, VALVE_POSITIONS[v]);
          if (d < VALVE_INTERACT_RADIUS) {
            const prog = v === 0 ? sab.valve1Progress : sab.valve2Progress;
            const pct = Math.min(100, Math.round((prog / VALVE_FIX_TIME) * 100));
            setPrompt(`🔧 [удерживай E] Вентиль ${v + 1}: ${pct}%`, 0.2);
            if (input.interact) {
              if (v === 0) sab.valve1Progress = Math.min(VALVE_FIX_TIME, sab.valve1Progress + dt);
              else         sab.valve2Progress = Math.min(VALVE_FIX_TIME, sab.valve2Progress + dt);

              if (sab.valve1Progress >= VALVE_FIX_TIME && sab.valve2Progress >= VALVE_FIX_TIME) {
                sab.isResolved = true;
                setPrompt('✅ Труба починена! Машины снова доступны.', 3);
                audio.play('task_complete');
              }
            }
          }
        }
      }
    }

    // ── Bot-driven resolution check (valves can be advanced by bots without player input) ──
    if (sab.key === 'pipe_burst' && !sab.isResolved &&
        sab.valve1Progress >= VALVE_FIX_TIME && sab.valve2Progress >= VALVE_FIX_TIME) {
      sab.isResolved = true;
      setPrompt('✅ Труба починена!', 3);
      audio.play('task_complete');
    }

    // ── Timer expiry ──
    if (sab.timer <= 0) {
      if (sab.key === 'pipe_burst' && !sab.isResolved) {
        // CRITICAL: slivshchiki win immediately
        gs.winner = 'slivshchiki';
        gs.winReason = 'Труба прорвала весь двор! Сливщики победили.';
        gs.phase = 'results';
        audio.play('win_slivshchiki');
      }
      sab.isResolved = true;
    }
  }
}

// ─── Interaction priority ──────────────────────────────────────────────────────

/** §13.1 Returns true if player is near an interactable that uses triggerInteract (single-press).
 *  Excludes hold-to-complete tasks (trash/grandma/flowers), siphon, and ambush. */
function hasNearNonCombatInteraction(player: Player): boolean {
  // Only mini-game tasks use single E press; hold-to-complete tasks use input.interact directly
  if (gs.tasks.some(t => !t.isComplete && TASK_MINIGAME_MAP[t.defKey] && dist(player.pos, t.pos) < INTERACT_RADIUS)) return true;
  if (gs.canisters.some(c => dist(player.pos, c.pos) < CANISTER_RADIUS)) return true;
  if (gs.immunityTickets.some(it => dist(player.pos, it.pos) < INTERACT_RADIUS)) return true;
  if (dist(player.pos, BABUSHKA_NPC_POS) < INTERACT_RADIUS) return true;
  return false;
}

function updateInteractions(dt: number, input: InputState): void {
  const player = gs.players.find(p => p.id === gs.localPlayerId);
  if (!player || !player.isAlive) return;

  // While mini-game is active the mini-game overlay owns all input
  if (gs.activeMiniGame) { gs.autoInteractTimer = 0; return; }

  // §13.1 Auto-interact: count up while near a non-combat interactable; fire at 2 s
  if (gs.autoInteract) {
    if (hasNearNonCombatInteraction(player)) {
      gs.autoInteractTimer += dt;
    } else {
      gs.autoInteractTimer = 0;
    }
  } else {
    gs.autoInteractTimer = 0;
  }
  const autoFireInteract = gs.autoInteract && gs.autoInteractTimer >= 2.0;
  if (autoFireInteract) gs.autoInteractTimer = 0;
  // triggerInteract replaces `input.interact && !input.prevInteract` for safe single-press actions
  const triggerInteract = (input.interact && !input.prevInteract) || autoFireInteract;

  const chatOffline = isSabotageActive('chat_offline');

  // ── 1. Ambush (slivshchik only) ──────────────────────────────────────────
  if (player.role === 'slivshchik' && player.ambushCooldown <= 0) {
    const target = findAmbushTarget(player);
    if (target) {
      setPrompt(`⚡ [удерживай E] Устроить засаду на ${target.name}`, 0.2);
      if (input.interact) {
        player.ambushTarget = target.id;
        player.ambushChargeTimer += dt;

        if (player.ambushChargeTimer > 0.05) {
          const stillLone = findAmbushTarget(player);
          if (!stillLone || stillLone.id !== target.id) {
            player.suspectedTimer = 5;
            player.ambushTarget = null;
            player.ambushChargeTimer = 0;
            setPrompt('⚠️ Засада сорвана! Свидетель.', 2);
            return;
          }
        }

        if (player.ambushChargeTimer >= AMBUSH_CHARGE_TIME) {
          executeAmbush(player, target);
          return;
        }
      } else {
        if (player.ambushChargeTimer > 0.1 && player.ambushChargeTimer < AMBUSH_CHARGE_TIME) {
          player.suspectedTimer = 5;
        }
        player.ambushTarget = null;
        player.ambushChargeTimer = 0;
      }
      return;
    } else {
      player.ambushTarget = null;
      player.ambushChargeTimer = 0;
    }
  }

  // ── 2. Body report ────────────────────────────────────────────────────────
  const nearBody = gs.bodies.find(b =>
    b.reportedBy === null && dist(player.pos, b.pos) < BODY_RADIUS
  );
  if (nearBody) {
    if (chatOffline) {
      setPrompt(`💀 ${nearBody.name} мёртв — ЖК-чат офлайн!`, 0.2);
    } else if (gs.meetingCooldown > 0) {
      setPrompt(`💀 ${nearBody.name} мёртв. Сходка через ${Math.ceil(gs.meetingCooldown)}с`, 0.2);
    } else {
      setPrompt(`💀 [E] Сообщить о теле: ${nearBody.name}`, 0.2);
      if (input.interact && !input.prevInteract) {
        nearBody.reportedBy = player.id;
        audio.play('body_found');
        callMeeting(player.id, 'body');
        return;
      }
    }
    clearTaskDoer(player.id);
    return;
  }

  // ── 3. Drained car report ────────────────────────────────────────────────
  const drainedCar = gs.cars.find(c => c.fuel < 10 && dist(player.pos, c.pos) < INTERACT_RADIUS);
  if (drainedCar && gs.meetingCooldown <= 0) {
    if (chatOffline) {
      setPrompt('🚨 Бак пустой — ЖК-чат офлайн!', 0.2);
    } else {
      setPrompt('🚨 [E] Сообщить об опустевшем баке!', 0.2);
      if (input.interact && !input.prevInteract) {
        audio.play('alarm_button');
        callMeeting(player.id, 'drained_car');
        return;
      }
    }
    clearTaskDoer(player.id);
    return;
  }

  // ── 4a. Carried canister disposal (slivshchik near dumpster) ─────────────
  if (player.isCarryingCanister && player.role === 'slivshchik') {
    const nearDump = DUMPSTER_POSITIONS.some(d => dist(player.pos, d) < 80);
    if (nearDump) {
      setPrompt('♻️ [E] Выбросить канистру у мусорки', 0.2);
      if (triggerInteract) {
        player.isCarryingCanister = false;
        setPrompt('✅ Канистра выброшена. Улика уничтожена.', 3);
      }
      clearTaskDoer(player.id);
      return;
    }
  }

  // ── 4b. Dumpster vent (§3.1.2 — Сливщик fast-travel, Hard/Nightmare only) ──
  // On cooldown: show an informational note but fall through so other nearby
  // interactions (tasks, canisters, etc.) are still reachable.
  // Only block + consume the E press when the vent is actually ready to use.
  // §3.1.2 Vents: always available for human slivshchik; for bots gated by difficulty
  if (player.role === 'slivshchik' && !player.isCarryingCanister &&
      (player.isHuman || BOT_DIFFICULTY_SETTINGS[gs.botDifficulty].useVents)) {
    const nearDumpIdx = DUMPSTER_POSITIONS.findIndex(d => dist(player.pos, d) < 80);
    if (nearDumpIdx >= 0) {
      if (player.ventCooldown > 0) {
        // Non-blocking note; fall through to let other interactions work
        setPrompt(`🕳️ Вентиляция: ${Math.ceil(player.ventCooldown)}с`, 0.2);
        // intentionally no `return` — lower-priority blocks still run
      } else {
        setPrompt('🕳️ [удерживай E] Нырнуть в мусорку → другая мусорка', 0.2);
        if (input.interact && !input.prevInteract) {
          // Pick the dumpster furthest from all watchers (same logic as bot vent)
          const watchers = gs.players.filter(p =>
            p.id !== player.id && p.isAlive && p.role === 'khozain'
          );
          let bestIdx = (nearDumpIdx + 1) % DUMPSTER_POSITIONS.length;
          if (watchers.length > 0) {
            let bestDist = -Infinity;
            for (let i = 0; i < DUMPSTER_POSITIONS.length; i++) {
              if (i === nearDumpIdx) continue;
              const minD = Math.min(...watchers.map(w => dist(DUMPSTER_POSITIONS[i], w.pos)));
              if (minD > bestDist) { bestDist = minD; bestIdx = i; }
            }
          }
          player.pos = { ...DUMPSTER_POSITIONS[bestIdx] };
          player.ventCooldown = VENT_COOLDOWN;
          player.ventFlashTimer = VENT_FLASH_DURATION; // §3.1.2 visual teleport flash
          audio.play('ui_click');
          setPrompt('💨 Нырнул в мусорку! Вынырнул с другой стороны.', 2);
          clearTaskDoer(player.id);
          return;
        }
        clearTaskDoer(player.id);
        return;
      }
    }
  }

  // ── 4c-i. Immunity Ticket pickup (§10.2) ─────────────────────────────────
  if (!player.hasImmunityTicket) {
    const nearTicket = gs.immunityTickets.find(t => dist(player.pos, t.pos) < CANISTER_RADIUS);
    if (nearTicket) {
      setPrompt('🎟️ [E] Подобрать Талон Иммунитета! (защита бака 60с)', 0.2);
      if (triggerInteract) {
        const idx = gs.immunityTickets.indexOf(nearTicket);
        gs.immunityTickets.splice(idx, 1);
        player.hasImmunityTicket = true;
        audio.play('task_complete');
        setPrompt('🎟️ Талон в руках! Подойди к своей машине и нажми E.', 4);
        clearTaskDoer(player.id);
        return;
      }
      clearTaskDoer(player.id);
      return;
    }
  }

  // ── 4c-ii. Immunity Ticket use on car (§10.2) ─────────────────────────────
  if (player.hasImmunityTicket) {
    const nearCar = gs.cars.find(c => dist(player.pos, c.pos) < INTERACT_RADIUS && !c.hasImmunity && c.fuel > 0);
    if (nearCar) {
      setPrompt('🎟️ [E] Применить Талон → зафиксировать цену бака на 60с!', 0.2);
      if (triggerInteract) {
        nearCar.hasImmunity = true;
        nearCar.immunityTimer = IMMUNITY_TICKET_DURATION;
        player.hasImmunityTicket = false;
        if (player.isHuman) gs.immunityTicketsUsedThisMatch += 1;
        audio.play('fuel_lock');
        setPrompt('🛡️ Цена зафиксирована! Сливщики в панике. В жизни тоже можно: @fuel_fuel_fuel_bot', 5);
        clearTaskDoer(player.id);
        return;
      }
      clearTaskDoer(player.id);
      return;
    }
  }

  // ── 4c. Canister pickup from ground ──────────────────────────────────────
  if (!player.isCarryingCanister) {
    const nearCanister = gs.canisters.find(c => dist(player.pos, c.pos) < CANISTER_RADIUS);
    if (nearCanister) {
      const label = player.role === 'khozain' ? '(улика!)' : '(спрятать)';
      setPrompt(`🪣 [E] Подобрать канистру ${label}`, 0.2);
      if (triggerInteract) {
        const idx = gs.canisters.indexOf(nearCanister);
        gs.canisters.splice(idx, 1);
        player.isCarryingCanister = true;
        audio.play('canister_pickup');
        if (player.role === 'khozain') {
          setPrompt('🎯 Канистра в руках — улика на сходке!', 3);
          if (gs.meeting) {
            gs.meeting.chatMessages.push({
              playerId: player.id,
              playerName: player.name,
              text: 'Я нашёл(а) канистру! Это улика!',
              timestamp: Date.now(),
            });
          }
        } else {
          setPrompt('🪣 Несёшь канистру. Выброси у мусорки.', 3);
        }
      }
      return;
    }
  }

  // ── 4d. Canister-carrying Сливщик visible → Хозяин can call meeting ──────
  // §2.4: "If a Хозяин sees a Сливщик carrying a canister, they can call a сходка immediately."
  if (player.role === 'khozain' && !player.isCarryingCanister && gs.meetingCooldown <= 0 && !chatOffline) {
    const canisterSlivshchik = gs.players.find(p =>
      p.id !== player.id && p.isAlive && p.role === 'slivshchik' && p.isCarryingCanister &&
      dist(player.pos, p.pos) < 280
    );
    if (canisterSlivshchik) {
      setPrompt(`⚡ [E] Созвать сходку — видел ${canisterSlivshchik.name} с канистрой!`, 0.2);
      if (input.interact && !input.prevInteract) {
        audio.play('alarm_button');
        callMeeting(player.id, 'alarm');
        return;
      }
      clearTaskDoer(player.id);
      return;
    }
  }

  // ── 4e. Persistent Бабушка NPC witness interaction ──────────────────────────
  const npcDist = dist(player.pos, BABUSHKA_NPC_POS);
  if (npcDist < INTERACT_RADIUS) {
    setPrompt('👵 [E] Спросить бабушку (что видела?)', 0.2);
    if (triggerInteract) {
      const hint = getBabushkaHint(player.role);
      setPrompt(`👵 Бабушка: ${hint}`, 5);
      audio.play('grandma_escort');
    }
    clearTaskDoer(player.id);
    return;
  }

  // ── 4f. Хозяин car interactions: Проверить бак + Запереть бак ───────────────
  if (player.role === 'khozain') {
    const nearCar = gs.cars.find(c => dist(player.pos, c.pos) < INTERACT_RADIUS);
    if (nearCar) {
      const fuelStatus = nearCar.fuel > 60 ? '✅' : nearCar.fuel > 25 ? '⚠️' : '🔴';
      const canLock = player.khozainLockCooldown <= 0 && !nearCar.hasImmunity && nearCar.fuel > 5;

      if (canLock) {
        const holdPct = Math.round((player.khozainLockProgress / KHOZAIN_LOCK_HOLD_TIME) * 100);
        setPrompt(`${fuelStatus} ${Math.round(nearCar.fuel)}% | [удерживай E] Запереть бак ${holdPct > 0 ? holdPct + '%' : ''}`, 0.2);
        if (input.interact) {
          player.khozainLockProgress = Math.min(KHOZAIN_LOCK_HOLD_TIME, player.khozainLockProgress + dt);
          if (player.khozainLockProgress >= KHOZAIN_LOCK_HOLD_TIME) {
            nearCar.hasImmunity = true;
            nearCar.immunityTimer = KHOZAIN_LOCK_DURATION;
            player.khozainLockCooldown = KHOZAIN_LOCK_COOLDOWN;
            player.khozainLockProgress = 0;
            audio.play('fuel_lock');
            setPrompt(`🔒 Бак заперт на ${KHOZAIN_LOCK_DURATION}с! Сливщики в панике.`, 4);
            clearTaskDoer(player.id);
            return;
          }
        } else {
          player.khozainLockProgress = 0;
        }
      } else {
        const lockNote = nearCar.hasImmunity
          ? ` 🔒 ${Math.ceil(nearCar.immunityTimer)}с`
          : player.khozainLockCooldown > 0
          ? ` (кд ${Math.ceil(player.khozainLockCooldown)}с)`
          : '';
        setPrompt(`${fuelStatus} Проверить бак: ${Math.round(nearCar.fuel)}%${lockNote}`, 0.2);
        if (triggerInteract) {
          setPrompt(`🚗 Бак: ${Math.round(nearCar.fuel)}%${nearCar.hasImmunity ? ' — заперт, слить нельзя' : ''}`, 3);
          clearTaskDoer(player.id);
          return;
        }
      }
      clearTaskDoer(player.id);
      return;
    }
  }

  // ── 5. Alarm button ────────────────────────────────────────────────────────
  const alarmDist = dist(player.pos, ENTRANCE_POS);
  if (alarmDist < ALARM_RADIUS && gs.meetingCooldown <= 0) {
    const babushkaBlocking = isSabotageActive('babushka_cerberus');
    if (chatOffline || babushkaBlocking) {
      setPrompt(babushkaBlocking ? '👵 Бабушка блокирует кнопку! (покорми её)' : '📵 ЖК-чат офлайн!', 0.2);
    } else {
      setPrompt('🔔 [E] Созвать сходку!', 0.2);
      if (input.interact && !input.prevInteract) {
        audio.play('alarm_button');
        callMeeting(player.id, 'alarm');
        return;
      }
    }
    clearTaskDoer(player.id);
    return;
  }

  // ── 6. Siphon (slivshchik only) ────────────────────────────────────────────
  if (player.role === 'slivshchik') {
    // Pipe burst blocks car access
    if (isSabotageActive('pipe_burst')) {
      const nearAnyCar = gs.cars.some(c => dist(player.pos, c.pos) < SIPHON_RADIUS + 20);
      if (nearAnyCar) {
        setPrompt('💧 Потоп! Машины недоступны. Почини вентили.', 0.2);
        return;
      }
    }

    if (player.siphonCooldown > 0) {
      setPrompt(`⏱ Перезарядка слива: ${Math.ceil(player.siphonCooldown)}с`, 0.2);
    }

    let nearCar = null;
    let nearCarDist = Infinity;
    for (const car of gs.cars) {
      if (car.fuel <= 0 || car.hasImmunity) continue;
      const d = dist(player.pos, car.pos);
      if (d < SIPHON_RADIUS && d < nearCarDist) {
        nearCarDist = d; nearCar = car;
      }
    }

    if (nearCar) {
      const phase = nearCar.siphonPhase;
      if (phase === 0) {
        if (player.siphonCooldown <= 0) {
          setPrompt('🪣 [удерживай E] Слить бензин', 0.2);
          if (input.interact) {
            nearCar.siphoner = player.id;
            nearCar.siphonPhase = 1;
            nearCar.siphonTimer = 0;
            audio.play('car_door');
          }
        }
      } else if (nearCar.siphoner === player.id && phase === 1) {
        setPrompt('⏳ Готовим шланг... [удерживай E]', 0.2);
        if (!input.interact) {
          nearCar.siphoner = null;
          nearCar.siphonPhase = 0;
          nearCar.siphonTimer = 0;
          player.siphonCooldown = 15;
          setPrompt('Слив отменён.', 1.5);
        }
      } else if (nearCar.siphoner === player.id && phase === 2) {
        setPrompt('🪣 Активный слив! [отпусти → улика]', 0.2);
        if (!input.interact) {
          dropCanister(player, nearCar, false);
          nearCar.siphoner = null;
          nearCar.siphonPhase = 0;
          nearCar.siphonTimer = 0;
          player.siphonCooldown = 15;
        }
      }
      return;
    }
  }

  // ── 7. Task interaction ────────────────────────────────────────────────────
  let nearTask = null;
  let nearTaskDist = Infinity;
  for (const task of gs.tasks) {
    if (task.isComplete) continue;
    const d = dist(player.pos, task.pos);
    if (d < INTERACT_RADIUS && d < nearTaskDist) {
      nearTaskDist = d; nearTask = task;
    }
  }

  if (!nearTask) {
    clearTaskDoer(player.id);
    clearPromptIfStale();
    return;
  }

  const taskDef = TASK_DEFS[nearTask.defKey];
  const mgType = TASK_MINIGAME_MAP[nearTask.defKey];
  const isFakingTask = player.role === 'slivshchik';

  if (mgType) {
    // Mini-game task: single E press to start
    if (isFakingTask) {
      setPrompt(`${taskDef.emoji} [E] Притвориться: ${taskDef.label}`, 0.2);
    } else {
      setPrompt(`${taskDef.emoji} [E] ${taskDef.label}`, 0.2);
    }
    if (triggerInteract) {
      nearTask.doer = player.id;
      startMiniGame(nearTask.id, nearTask.defKey, mgType, isFakingTask);
    }
  } else {
    // Hold-timer task (trash, grandma, flowers)
    if (isFakingTask) {
      setPrompt(`${taskDef.emoji} [удерживай E] Притвориться: ${taskDef.label}`, 0.2);
    } else {
      setPrompt(`${taskDef.emoji} [удерживай E] ${taskDef.label}`, 0.2);
    }
    if (input.interact) {
      nearTask.doer = player.id;
      nearTask.progress += dt / taskDef.duration;
      if (nearTask.progress >= 1) {
        if (isFakingTask) {
          fakeCompleteTask(nearTask, player);
          nearTask.progress = 0; // reset for real Хозяева
        } else {
          completeTask(nearTask, player);
        }
      }
    } else {
      if (nearTask.doer === player.id) nearTask.doer = null;
    }
  }
}

function findAmbushTarget(player: Player): Player | null {
  for (const target of gs.players) {
    if (target.id === player.id || !target.isAlive || target.role === 'slivshchik') continue;
    if (dist(player.pos, target.pos) > AMBUSH_RADIUS) continue;
    const others = gs.players.filter(p =>
      p.id !== player.id && p.id !== target.id && p.isAlive &&
      dist(p.pos, target.pos) < AMBUSH_LONE_RADIUS
    );
    if (others.length === 0) return target;
  }
  return null;
}

function executeAmbush(killer: Player, victim: Player): void {
  victim.isAlive = false;
  killer.ambushTarget = null;
  killer.ambushChargeTimer = 0;
  killer.ambushCooldown = AMBUSH_COOLDOWN;
  audio.play('ambush');
  if (victim.isHuman) audio.play('player_death');
  else audio.play('bot_death');

  const body: Body = {
    id: `body_${victim.id}_${Date.now()}`,
    playerId: victim.id,
    character: victim.character,
    name: victim.name,
    pos: { ...victim.pos },
    reportedBy: null,
  };
  gs.bodies.push(body);
  setPrompt(`💀 ${victim.name} устранён(а). Действуй быстро.`, 4);
  checkWinConditions();
}

function clearTaskDoer(playerId: string): void {
  for (const task of gs.tasks) {
    if (task.doer === playerId) task.doer = null;
  }
}

// ─── Siphon phase tick ────────────────────────────────────────────────────────

function stopSiphon(car: typeof gs.cars[number], siphoner: Player | undefined, reason: 'cancel' | 'interrupt' | 'complete'): void {
  if (siphoner?.isHuman && car.siphonPhase === 2) {
    audio.stopGurgle();
  }
  if (siphoner && reason !== 'complete') {
    siphoner.siphonCooldown = 15;
  }
  car.siphoner = null;
  car.siphonPhase = 0;
  car.siphonTimer = 0;
}

function updateSiphoning(dt: number): void {
  // §2.9 Pipe burst: all active siphons are suspended (cars flooded, inaccessible)
  if (isSabotageActive('pipe_burst')) {
    for (const car of gs.cars) {
      if (!car.siphoner) continue;
      const s = gs.players.find(p => p.id === car.siphoner);
      if (s?.isHuman && car.siphonPhase === 2) audio.stopGurgle();
      car.siphoner = null; car.siphonPhase = 0; car.siphonTimer = 0;
    }
    return;
  }

  for (const car of gs.cars) {
    if (!car.siphoner || car.siphonPhase === 0) continue;

    const siphoner = gs.players.find(p => p.id === car.siphoner);
    if (!siphoner || !siphoner.isAlive) {
      stopSiphon(car, siphoner, 'cancel');
      continue;
    }
    if (car.hasImmunity) {
      stopSiphon(car, siphoner, 'cancel');
      continue;
    }
    if (dist(siphoner.pos, car.pos) > SIPHON_RADIUS + 15) {
      if (car.siphonPhase === 2) dropCanister(siphoner, car, false);
      stopSiphon(car, siphoner, 'interrupt');
      continue;
    }

    car.siphonTimer += dt;

    if (car.siphonPhase === 1) {
      if (car.siphonTimer >= SIPHON_SETUP_TIME) {
        car.siphonPhase = 2;
        car.siphonTimer = 0;
        // §8.2 Engine noise + electric zap as siphon line is breached.
        // Guard: only play when the siphoner is the local human player, OR
        // a bot siphon is within SIPHON_AUDIO_RADIUS of the local player —
        // same proximity model as the gurgle. Prevents off-screen bots from
        // spamming full-volume transition SFX.
        const localPlayer = gs.players.find(p => p.id === gs.localPlayerId);
        const siphonAudible = siphoner.isHuman ||
          (localPlayer && dist(siphoner.pos, localPlayer.pos) < SIPHON_AUDIO_RADIUS);
        if (siphonAudible) {
          audio.play('engine_start');
          audio.play('tesla_zap');
        }
        // Alarm chaos masks the gurgle sound
        if (siphoner.isHuman && !isSabotageActive('alarm_chaos')) {
          audio.startGurgle();
        }
      }
    } else if (car.siphonPhase === 2) {
      const fuelBefore = car.fuel;
      car.fuel = Math.max(0, car.fuel - SIPHON_RATE * dt);
      // §9.1 Track per-player fuel siphoned stat
      if (siphoner) siphoner.fuelSiphoned += (fuelBefore - car.fuel);
      if (car.fuel <= 0) {
        if (siphoner.isHuman) audio.play('siphon_complete');
        dropCanister(siphoner, car, true);
        siphoner.siphonCooldown = 15;
        stopSiphon(car, siphoner, 'complete');
      }
    }
  }
}

function dropCanister(siphoner: Player, car: { id: string; pos: { x: number; y: number }; fuel: number }, isFull: boolean): void {
  if (siphoner.isHuman) audio.play('canister_drop');
  const canister: Canister = {
    id: `can_${car.id}_${Date.now()}`,
    pos: {
      x: siphoner.pos.x + (Math.random() - 0.5) * 30,
      y: siphoner.pos.y + (Math.random() - 0.5) * 30,
    },
    ownerId: siphoner.id,
    isFull,
  };
  gs.canisters.push(canister);
  if (siphoner.isHuman && !isFull) {
    setPrompt('⚠️ Канистра брошена! Улика на месте.', 3);
  }
  if (!siphoner.isHuman) {
    siphoner.isCarryingCanister = true;
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

// ─── Meeting ──────────────────────────────────────────────────────────────────

let _meetingId = 0;

export function callMeeting(callerId: string, reason: 'alarm' | 'body' | 'drained_car' = 'alarm'): void {
  if (gs.meetingCooldown > 0 || gs.phase !== 'play') return;

  // §2.9 Sabotage blocks: ЖК Чат Офлайн disables all reporting for all players (including bots)
  if (isSabotageActive('chat_offline')) return;
  // Бабушка-Цербер only blocks the alarm button trigger
  if (reason === 'alarm' && isSabotageActive('babushka_cerberus')) return;

  // Cancel any active mini-game
  if (gs.activeMiniGame) cancelMiniGame();

  for (const car of gs.cars) {
    if (car.siphoner) {
      const s = gs.players.find(p => p.id === car.siphoner);
      if (s?.isHuman) audio.stopGurgle();
    }
    car.siphoner = null; car.siphonPhase = 0; car.siphonTimer = 0;
  }
  for (const task of gs.tasks) task.doer = null;

  for (const p of gs.players) {
    if (!p.isAlive) continue;
    if (p.isCarryingCanister) {
      gs.canisters.push({
        id: `can_dropped_${p.id}_${Date.now()}`,
        pos: { ...p.pos },
        ownerId: p.id,
        isFull: false,
      });
    }
    p.isCarryingCanister = false;
  }

  const alive = gs.players.filter(p => p.isAlive);
  alive.forEach((p, i) => {
    const spawn = MEETING_SPAWNS[i % MEETING_SPAWNS.length];
    p.pos = { x: spawn.x + (Math.random() - 0.5) * 15, y: spawn.y + (Math.random() - 0.5) * 15 };
    p.botState = 'at_meeting';
  });

  _meetingId += 1;
  gs.phase = 'meeting';
  gs.meeting = {
    meetingId: _meetingId,
    phase: 'discussion',
    callerId,
    reason,
    timer: 60,
    votes: [],
    ejectedId: null,
    ejectionText: null,
    chatMessages: [],
    skipDiscussionVotes: [],
  };

  audio.play('meeting_horn');

  const caller = gs.players.find(p => p.id === callerId);
  const callerName = caller?.name ?? 'Кто-то';
  let systemMsg = '';
  if (reason === 'body') {
    const body = gs.bodies.find(b => b.reportedBy === callerId);
    systemMsg = `${callerName}: Нашёл(а) тело — ${body?.name ?? 'неизвестный'}!`;
  } else if (reason === 'drained_car') {
    systemMsg = `${callerName}: Бак пустой! Кто-то слил!`;
  } else {
    systemMsg = `${callerName} созвал(а) собрание.`;
  }
  gs.meeting.chatMessages.push({
    playerId: callerId,
    playerName: callerName,
    text: systemMsg,
    timestamp: Date.now(),
  });

  scheduleBotChatMessages();
}

function tickMeeting(dt: number): void {
  const m = gs.meeting!;
  m.timer -= dt;

  if (m.phase === 'discussion') {
    // §2.7.4 Skip discussion by majority vote
    const aliveCount = gs.players.filter(p => p.isAlive).length;
    const skipCount = m.skipDiscussionVotes.length;
    if (m.timer <= 0 || (aliveCount >= 2 && skipCount > aliveCount / 2)) {
      m.phase = 'voting';
      m.timer = 30;
      castBotVotes();
    }
  } else if (m.phase === 'voting') {
    if (m.timer <= 0) resolveMeeting();
  } else if (m.phase === 'reveal') {
    if (m.timer <= 0) endMeeting();
  }
}

function castBotVotes(): void {
  const m = gs.meeting!;
  const thisMeetingId = m.meetingId;
  const alivePlayers = gs.players.filter(p => p.isAlive);
  const skipVoteChance = BOT_DIFFICULTY_SETTINGS[gs.botDifficulty].skipVoteChance;

  for (const bot of gs.players) {
    if (bot.isHuman || !bot.isAlive) continue;
    if (m.votes.some(v => v.voterId === bot.id)) continue;

    const delay = 2 + Math.random() * 12;
    setTimeout(() => {
      if (!gs.meeting || gs.meeting.phase !== 'voting' || gs.meeting.meetingId !== thisMeetingId) return;

      let targetId: string | null = null;

      /** Pick the highest-suspicion living candidate from a player list. */
      const pickBySuspicion = (candidates: typeof alivePlayers, threshold = 0.25): string | null => {
        let bestId: string | null = null;
        let bestScore = threshold;
        for (const p of candidates) {
          const score = bot.suspicion[p.id] ?? 0;
          if (score > bestScore) { bestScore = score; bestId = p.id; }
        }
        return bestId;
      };

      if (bot.role === 'slivshchik') {
        // §4.3 Slivshchik deflects: accuse the khozain with highest suspicion score;
        // if no one is above threshold, pick a random khozain (10% chance to skip).
        const khozaeva = alivePlayers.filter(p => p.id !== bot.id && p.role === 'khozain');
        const suspicionTarget = pickBySuspicion(khozaeva);
        if (suspicionTarget) {
          targetId = suspicionTarget;
        } else if (Math.random() > 0.10 && khozaeva.length > 0) {
          targetId = khozaeva[Math.floor(Math.random() * khozaeva.length)].id;
        }
        // else: skip vote (targetId stays null)
      } else {
        // §4.3 Khozain bot: use suspicion vector — highest score above threshold wins.
        // skipVoteChance scales with difficulty (easy bots skip more often).
        if (Math.random() > skipVoteChance) {
          const candidates = alivePlayers.filter(p => p.id !== bot.id);
          const suspicionTarget = pickBySuspicion(candidates);
          if (suspicionTarget) {
            targetId = suspicionTarget;
          } else {
            // No suspicion data → random fallback (true ignorance, not sloppiness)
            if (candidates.length > 0) targetId = candidates[Math.floor(Math.random() * candidates.length)].id;
          }
        }
        // else: skip vote (targetId stays null)
      }

      gs.meeting!.votes.push({ voterId: bot.id, targetId });
      if (targetId) audio.play('vote_cast');
    }, delay * 1000);
  }
}

function resolveMeeting(): void {
  const m = gs.meeting!;
  const tally: Record<string, number> = {};

  for (const vote of m.votes) {
    if (vote.targetId) tally[vote.targetId] = (tally[vote.targetId] ?? 0) + 1;
  }

  let maxVotes = 0;
  let ejectedId: string | null = null;
  let tie = false;

  for (const [pid, count] of Object.entries(tally)) {
    if (count > maxVotes) { maxVotes = count; ejectedId = pid; tie = false; }
    else if (count === maxVotes) { tie = true; }
  }

  if (tie || maxVotes === 0) ejectedId = null;

  m.ejectedId = ejectedId;
  m.phase = 'reveal';
  m.timer = 7;

  if (ejectedId) {
    const ejected = gs.players.find(p => p.id === ejectedId);
    if (ejected) {
      ejected.isAlive = false;
      const isSlivshchik = ejected.role === 'slivshchik';
      m.ejectionText = getEjectionText(ejected.character, isSlivshchik);
      audio.play('ejection');
      // §3.2 Credit players who voted correctly (voted for an actual slivshchik)
      if (isSlivshchik) {
        for (const vote of m.votes) {
          if (vote.targetId === ejectedId) {
            const voter = gs.players.find(p => p.id === vote.voterId);
            if (voter) voter.correctVotes = (voter.correctVotes ?? 0) + 1;
          }
        }
      }
      // §9.2 Backstab Moment: local player being ejected is dramatic
      if (ejectedId === gs.localPlayerId && !gs.backstabMoment) {
        gs.backstabMoment = 'dramatic_eject';
      }
    }
  } else {
    m.ejectionText = 'Ничья! Никто не выброшен. Двор продолжает страдать.';
  }
}

export function submitVote(voterId: string, targetId: string | null): void {
  if (!gs.meeting || gs.meeting.phase !== 'voting') return;
  if (gs.meeting.votes.some(v => v.voterId === voterId)) return;
  gs.meeting.votes.push({ voterId, targetId });
  audio.play('vote_cast');
}

/** §2.7.4 Vote to skip discussion phase and move to voting early */
export function submitSkipDiscussion(voterId: string): void {
  if (!gs.meeting || gs.meeting.phase !== 'discussion') return;
  if (gs.meeting.skipDiscussionVotes.includes(voterId)) return;
  gs.meeting.skipDiscussionVotes.push(voterId);
  // Add chat message
  const caller = gs.players.find(p => p.id === voterId);
  if (caller) {
    gs.meeting.chatMessages.push({
      playerId: voterId,
      playerName: caller.name,
      text: 'Предлагаю перейти к голосованию!',
      timestamp: Date.now(),
    });
  }
  audio.play('vote_skip');
}

function endMeeting(): void {
  gs.phase = 'play';
  gs.meeting = null;
  gs.meetingCooldown = MEETING_COOLDOWN;

  for (const p of gs.players) {
    if (!p.isHuman) { p.botState = 'idle'; p.botCooldown = 1 + Math.random() * 2; }
  }

  checkWinConditions();
}

function scheduleBotChatMessages(): void {
  if (!gs.meeting) return;
  const bots = gs.players.filter(p => !p.isHuman && p.isAlive);
  shuffleArr(bots);

  const fallbackPhrases = [
    'Я был у шавермы!', 'Кто смотрел на мой бак?!', 'Слива! Слива!',
    'Я видел кого-то у машин.', 'Где ты был последние 30 секунд?',
    'Это не я, честно!', 'У меня есть алиби.', 'Кто-то только что ушёл от меня.',
    'Я выполнял задачу.', 'Почему ты молчал?', 'Я видел канистру!', 'Давайте пропустим.',
  ];

  const alibiPhrases = [
    'Это не я! Я был у подъезда всё время.',
    'Можете спросить у бабушки — она меня видела.',
    'Я задачи делал. Проверьте метр единства!',
    'Кто-то специально на меня показывает.',
    'Это провокация. Думайте головой.',
    'У меня нет мотива сливать.',
  ];

  // §4.4 AI meeting accusation phrases (Сливщики deflect by accusing others)
  const accusePhrases = [
    (name: string) => `Я видел ${name} у машины!`,
    (name: string) => `${name} сделал это — я ручаюсь.`,
    (name: string) => `Спросите у ${name}, где он был.`,
    (name: string) => `${name} выглядел подозрительно рядом с баком.`,
  ];

  const callerBot = gs.meeting ? gs.players.find(p => p.id === gs.meeting!.callerId) : null;
  const thisMeetingId = gs.meeting.meetingId;

  for (let i = 0; i < Math.min(bots.length, 5); i++) {
    const bot = bots[i];
    const delay = 3 + i * (4 + Math.random() * 6);
    setTimeout(() => {
      if (!gs.meeting || gs.meeting.meetingId !== thisMeetingId) return;
      const charDef = CHARACTERS[bot.character];
      let phrase: string;

      // §4.4 Role-aware meeting chat behavior
      const isAccused = callerBot && callerBot.id !== bot.id &&
        (bot.suspicion[callerBot.id] ?? 0) > 0.4;

      if (bot.id === callerBot?.id && Math.random() < 0.7) {
        // Caller explains briefly — use voice line or confirm accusation
        phrase = charDef.voiceLines.length > 0
          ? charDef.voiceLines[Math.floor(Math.random() * charDef.voiceLines.length)]
          : fallbackPhrases[Math.floor(Math.random() * fallbackPhrases.length)];
      } else if (isAccused && Math.random() < 0.75) {
        // §4.4 Bot being accused: send alibi
        phrase = alibiPhrases[Math.floor(Math.random() * alibiPhrases.length)];
      } else if (bot.role === 'slivshchik' && Math.random() < 0.65) {
        // §4.4 Сливщик deflects: accuse highest-suspicion player
        let bestTarget: Player | null = null;
        let bestScore = 0.15;
        for (const p of gs.players) {
          if (p.id === bot.id || !p.isAlive) continue;
          const score = bot.suspicion[p.id] ?? 0;
          if (score > bestScore) { bestScore = score; bestTarget = p; }
        }
        if (bestTarget) {
          const fn = accusePhrases[Math.floor(Math.random() * accusePhrases.length)];
          phrase = fn(bestTarget.name);
        } else {
          phrase = fallbackPhrases[Math.floor(Math.random() * fallbackPhrases.length)];
        }
      } else if (bot.role === 'khozain' && Math.random() < 0.5) {
        // §4.4 Хозяин with high suspicion: share observation
        let bestTarget: Player | null = null;
        let bestScore = 0.3;
        for (const p of gs.players) {
          if (p.id === bot.id || !p.isAlive || p.role === 'khozain') continue;
          const score = bot.suspicion[p.id] ?? 0;
          if (score > bestScore) { bestScore = score; bestTarget = p; }
        }
        if (bestTarget) {
          phrase = `Я видел ${bestTarget.name} у машин. Подозрительно.`;
        } else {
          phrase = charDef.voiceLines.length > 0
            ? charDef.voiceLines[Math.floor(Math.random() * charDef.voiceLines.length)]
            : fallbackPhrases[Math.floor(Math.random() * fallbackPhrases.length)];
        }
      } else {
        // Default: character voice line (60%) or generic fallback
        if (Math.random() < 0.6 && charDef.voiceLines.length > 0) {
          phrase = charDef.voiceLines[Math.floor(Math.random() * charDef.voiceLines.length)];
        } else {
          phrase = fallbackPhrases[Math.floor(Math.random() * fallbackPhrases.length)];
        }
      }

      gs.meeting.chatMessages.push({
        playerId: bot.id,
        playerName: bot.name,
        text: phrase,
        timestamp: Date.now(),
      });
    }, delay * 1000);
  }
}

// ─── Win conditions ────────────────────────────────────────────────────────────

function checkWinConditions(): void {
  if (gs.winner) return;

  if (gs.unityMeter >= 100) {
    gs.winner = 'khozaeva';
    gs.winReason = 'Единство двора достигнуто! Сливщики посрамлены.';
    gs.phase = 'results';
    audio.play('win_owners');
    return;
  }

  const allDrained = gs.cars.every(c => c.fuel <= 0);
  if (allDrained) {
    gs.winner = 'slivshchiki';
    gs.winReason = 'Все баки пусты. Сливщики победили. Двор осиротел.';
    gs.phase = 'results';
    audio.play('win_slivshchiki');
    return;
  }

  const aliveKhozaeva = gs.players.filter(p => p.isAlive && p.role === 'khozain').length;
  const aliveSlivshchiki = gs.players.filter(p => p.isAlive && p.role === 'slivshchik').length;

  if (aliveSlivshchiki > 0 && aliveKhozaeva <= aliveSlivshchiki) {
    gs.winner = 'slivshchiki';
    gs.winReason = 'Сливщики в большинстве. Двор захвачен.';
    gs.phase = 'results';
    audio.play('win_slivshchiki');
    return;
  }

  if (aliveSlivshchiki === 0) {
    gs.winner = 'khozaeva';
    gs.winReason = 'Все Сливщики выгнаны! Двор очищен.';
    gs.phase = 'results';
    audio.play('win_owners');
    return;
  }

  // §3.1.3 Neutral win conditions
  for (const player of gs.players) {
    if (!player.neutralRole || !player.isAlive) continue;
    if (player.neutralRole === 'janitor' && player.canistersCollected >= 3) {
      // Janitor wins by collecting 3 canisters — doesn't end the match, just personal victory
      if (player.isHuman) {
        setPrompt('🧹 Ахмет-дворник победил! 3 канистры убраны.', 5);
      }
      player.neutralRole = null; // consumed — role fulfilled
    }
    if (player.neutralRole === 'barsik' && !player.isAlive) {
      // Barsik loses if voted out (shouldn't happen per lore but might)
      if (player.isHuman) setPrompt('😿 Барсика выгнали... Несправедливость.', 5);
    }
  }
}

// ─── §12.4 First-time tutorial ────────────────────────────────────────────────

function updateTutorial(_dt: number): void {
  if (gs.tutorialStep === 0) return;
  const player = gs.players.find(p => p.id === gs.localPlayerId && p.isAlive);
  if (!player) return;

  const shawarmaTask = gs.tasks.find(t => t.defKey === 'shawarma');
  if (!shawarmaTask) return;

  if (gs.tutorialStep === 1) {
    // Step 1: guide player toward shawarma stand
    if (dist(player.pos, shawarmaTask.pos) < 120) gs.tutorialStep = 2;
  } else if (gs.tutorialStep === 2) {
    // Step 2: player is near — wait for the LOCAL player to complete the task
    if (shawarmaTask.completedBy === gs.localPlayerId) {
      gs.tutorialStep = 3;
    } else if (dist(player.pos, shawarmaTask.pos) > 160) {
      gs.tutorialStep = 1; // drifted away, go back to step 1
    }
  }
  // Step 3: "Well done!" shown in HUD; cleared by a useEffect after 3 s
}

// ─── Prompt, ticker, emotes ───────────────────────────────────────────────────

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
    if (gs.promptTimer <= 0) { gs.promptText = null; gs.promptTimer = 0; }
  }
}

function updateTicker(dt: number): void {
  gs.tickerTimer -= dt;
  if (gs.tickerTimer <= 0) {
    gs.tickerIndex = (gs.tickerIndex + 1) % NEWS_HEADLINES.length;
    gs.tickerTimer = TICKER_INTERVAL;
  }
}

function updateVentFlash(dt: number): void {
  for (const p of gs.players) {
    if (p.ventFlashTimer > 0) p.ventFlashTimer = Math.max(0, p.ventFlashTimer - dt);
  }
}

function updateEmotes(dt: number): void {
  for (const p of gs.players) {
    if (p.emoteTimer > 0) {
      p.emoteTimer -= dt;
      if (p.emoteTimer <= 0) { p.emote = null; p.emoteTimer = 0; }
    }
  }
}

export function triggerEmote(playerId: string, emote: string): void {
  const p = gs.players.find(x => x.id === playerId);
  if (p) { p.emote = emote; p.emoteTimer = 3; }
}

// §2.2 Emote constants (4 quick emotes for the play-phase wheel)
export const PLAY_EMOTES = ['👋', '🤔', '🚨', '😂'] as const;

// ─── §9.2 Backstab Moment detection ──────────────────────────────────────────

function updateBackstabMoment(): void {
  // Only detect once per match; don't overwrite
  if (gs.backstabMoment) return;

  const localPlayer = gs.players.find(p => p.id === gs.localPlayerId);
  if (!localPlayer || !localPlayer.isAlive) return;

  // catch_siphoner: local Хозяин hears an active siphon (phase 2) nearby
  if (localPlayer.role === 'khozain') {
    for (const car of gs.cars) {
      if (car.siphonPhase === 2 && car.siphoner && car.siphoner !== gs.localPlayerId) {
        const siphoner = gs.players.find(p => p.id === car.siphoner);
        if (siphoner && dist(siphoner.pos, localPlayer.pos) < SIPHON_AUDIO_RADIUS) {
          gs.backstabMoment = 'catch_siphoner';
          return;
        }
      }
    }
  }

  // caught_siphoning: local Сливщик is actively draining while another player is nearby
  if (localPlayer.role === 'slivshchik') {
    const myCar = gs.cars.find(c => c.siphoner === gs.localPlayerId && c.siphonPhase === 2);
    if (myCar) {
      for (const other of gs.players) {
        if (other.id === gs.localPlayerId || !other.isAlive) continue;
        if (dist(other.pos, localPlayer.pos) < SIPHON_AUDIO_RADIUS) {
          gs.backstabMoment = 'caught_siphoning';
          return;
        }
      }
    }
  }
}

/** §9.2 Public alias — run backstab detection outside the single-player tick (e.g. multiplayer) */
export function checkBackstabMoment(): void {
  updateBackstabMoment();
}

/** §2.1 Allow player to skip the briefing countdown after 2 seconds */
export function skipBriefing(): void {
  if (gs.phase === 'briefing') gs.briefingTimer = 0;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffleArr<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export { dist };
