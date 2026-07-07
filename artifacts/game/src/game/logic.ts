import { gs } from './state';
import type { InputState, Player, Body, Canister } from './types';
import {
  INTERACT_RADIUS, SIPHON_RADIUS, ALARM_RADIUS,
  BODY_RADIUS, CANISTER_RADIUS, AMBUSH_RADIUS, AMBUSH_LONE_RADIUS,
  SIPHON_RATE, SIPHON_SETUP_TIME, AMBUSH_CHARGE_TIME, AMBUSH_COOLDOWN,
  TASK_RESPAWN_TIME, MEETING_COOLDOWN,
  SPRINT_SPEED_MULT, CROUCH_SPEED_MULT, CANISTER_SLOW_MULT,
  SPRINT_MAX, SPRINT_DRAIN_RATE, SPRINT_REGEN_RATE,
} from './types';
import { TASK_DEFS } from '../data/tasks';
import { ENTRANCE_POS, DUMPSTER_POSITIONS, MEETING_SPAWNS, dist, clampToMap, isInsideBuilding } from '../data/map';
import { CHARACTERS } from '../data/characters';
import { NEWS_HEADLINES, TICKER_INTERVAL } from '../data/ticker';
import { updateBots } from './botAI';
import { audio } from './audio';

// ─── Ejection texts (20 total, §2.7.6 — character-specific) ─────────────────

// Maps character key to their specific ejection suffix when they ARE a slivshchik
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

// Maps character key to their specific ejection suffix when they are NOT a slivshchik
const EJECTED_AS_INNOCENT: Partial<Record<string, string>> = {
  denis:         'Денис не был Сливщиком. Но его выкинули, потому что он сказал «Смена горит» в третий раз.',
  anya:          'Аня не была Сливщицей. Она просто любила каршеринг.',
  vova:          'Вова не был Сливщиком. Он просто хотел внимания.',
  uncle_seryozha:'Дядя Серёжа не был Сливщиком. У него и так талоны. Зачем ему сливать?',
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

// ─── Main tick ────────────────────────────────────────────────────────────────

export function tickGame(dt: number, input: InputState): void {
  if (gs.phase === 'play') {
    gs.time += dt;
    gs.meetingCooldown = Math.max(0, gs.meetingCooldown - dt);

    updateHumanPlayer(dt, input);
    updateBots(dt);
    updateInteractions(dt, input);
    updateSiphoning(dt);
    updateImmunity(dt);
    updatePrompt(dt);
    updateTicker(dt);
    updateEmotes(dt);
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

  // Update facing angle from movement direction
  if (isMoving) {
    player.facingAngle = Math.atan2(input.dy, input.dx);
  }

  // Sprint/crouch stamina management
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

  // Speed modifier
  let speedMult = 1.0;
  if (player.isSprinting) speedMult = SPRINT_SPEED_MULT;
  else if (player.isCrouching) speedMult = CROUCH_SPEED_MULT;
  if (player.isCarryingCanister) speedMult *= CANISTER_SLOW_MULT;

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

  // Update cooldowns
  if (player.ambushCooldown > 0) player.ambushCooldown -= dt;
  if (player.siphonCooldown > 0) player.siphonCooldown -= dt;

  // Update suspected timer
  if (player.suspectedTimer > 0) player.suspectedTimer -= dt;
}

// ─── Interaction priority system ──────────────────────────────────────────────
// Priority: ambush > body report > drained car report > canister >
//           alarm button > task > siphon

function updateInteractions(dt: number, input: InputState): void {
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

  // ── 1. Ambush (slivshchik only) ──────────────────────────────────────────
  if (player.role === 'slivshchik' && player.ambushCooldown <= 0) {
    const target = findAmbushTarget(player);
    if (target) {
      setPrompt(`⚡ [удерживай E] Устроить засаду на ${target.name}`, 0.2);
      if (input.interact) {
        player.ambushTarget = target.id;
        player.ambushChargeTimer += dt;

        // §2.4: Re-check lone condition mid-charge — interrupt if someone walks in
        if (player.ambushChargeTimer > 0.05) {
          const stillLone = findAmbushTarget(player);
          if (!stillLone || stillLone.id !== target.id) {
            // A third player entered — abort, mark slivshchik as suspicious
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
        // Released early
        if (player.ambushChargeTimer > 0.1 && player.ambushChargeTimer < AMBUSH_CHARGE_TIME) {
          player.suspectedTimer = 5;
        }
        player.ambushTarget = null;
        player.ambushChargeTimer = 0;
      }
      return; // ambush takes priority over everything else
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
    if (gs.meetingCooldown > 0) {
      setPrompt(`💀 ${nearBody.name} мёртв. Сходка через ${Math.ceil(gs.meetingCooldown)}с`, 0.2);
    } else {
      setPrompt(`💀 [E] Сообщить о теле: ${nearBody.name}`, 0.2);
      if (input.interact && !input.prevInteract) {
        nearBody.reportedBy = player.id; // mark AFTER confirming meeting can start
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
    setPrompt(`🚨 [E] Сообщить об опустевшем баке!`, 0.2);
    if (input.interact && !input.prevInteract) {
      audio.play('alarm_button');
      callMeeting(player.id, 'drained_car');
      return;
    }
    clearTaskDoer(player.id);
    return;
  }

  // ── 4a. Carried canister disposal (slivshchik near dumpster) ─────────────
  if (player.isCarryingCanister && player.role === 'slivshchik') {
    const nearDump = DUMPSTER_POSITIONS.some(d => dist(player.pos, d) < 80);
    if (nearDump) {
      setPrompt(`♻️ [E] Выбросить канистру у мусорки`, 0.2);
      if (input.interact && !input.prevInteract) {
        player.isCarryingCanister = false;
        setPrompt('✅ Канистра выброшена. Улика уничтожена.', 3);
      }
      clearTaskDoer(player.id);
      return;
    }
    // Carry hint shown via HUD stamina area — don't block other interactions
  }

  // ── 4b. Canister pickup from ground ──────────────────────────────────────
  if (!player.isCarryingCanister) {
    const nearCanister = gs.canisters.find(c => dist(player.pos, c.pos) < CANISTER_RADIUS);
    if (nearCanister) {
      const label = player.role === 'khozain' ? '(улика!)' : '(спрятать)';
      setPrompt(`🪣 [E] Подобрать канистру ${label}`, 0.2);
      if (input.interact && !input.prevInteract) {
        const idx = gs.canisters.indexOf(nearCanister);
        gs.canisters.splice(idx, 1);
        player.isCarryingCanister = true;
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

  // ── 5. Alarm button ────────────────────────────────────────────────────────
  const alarmDist = dist(player.pos, ENTRANCE_POS);
  if (alarmDist < ALARM_RADIUS && gs.meetingCooldown <= 0) {
    setPrompt('🔔 [E] Созвать сходку!', 0.2);
    if (input.interact && !input.prevInteract) {
      audio.play('alarm_button');
      callMeeting(player.id, 'alarm');
      return;
    }
    clearTaskDoer(player.id);
    return;
  }

  // ── 6. Siphon (slivshchik only, car nearby) ────────────────────────────────
  if (player.role === 'slivshchik') {
    // Show cooldown if active
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
        if (player.siphonCooldown > 0) {
          // Still on cooldown — already shown above, no action
        } else {
          setPrompt('🪣 [удерживай E] Слить бензин', 0.2);
          if (input.interact) {
            // Start setup phase
            nearCar.siphoner = player.id;
            nearCar.siphonPhase = 1;
            nearCar.siphonTimer = 0;
          }
        }
      } else if (nearCar.siphoner === player.id && phase === 1) {
        setPrompt('⏳ Готовим шланг... [удерживай E]', 0.2);
        if (!input.interact) {
          // Released before active — cancel, apply cooldown
          nearCar.siphoner = null;
          nearCar.siphonPhase = 0;
          nearCar.siphonTimer = 0;
          player.siphonCooldown = 15; // §2.4: 15s cooldown
          setPrompt('Слив отменён.', 1.5);
        }
      } else if (nearCar.siphoner === player.id && phase === 2) {
        setPrompt('🪣 Активный слив! [отпусти → улика]', 0.2);
        if (!input.interact) {
          // Released during active — drop canister (evidence!) + cooldown
          dropCanister(player, nearCar, false);
          nearCar.siphoner = null;
          nearCar.siphonPhase = 0;
          nearCar.siphonTimer = 0;
          player.siphonCooldown = 15; // §2.4: 15s cooldown
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
  setPrompt(`${taskDef.emoji} [E] ${taskDef.label}`, 0.2);

  if (input.interact) {
    nearTask.doer = player.id;
    nearTask.progress += dt / taskDef.duration;

    if (nearTask.progress >= 1) {
      nearTask.progress = 1;
      nearTask.isComplete = true;
      nearTask.completedBy = player.id;
      nearTask.doer = null;
      nearTask.respawnTimer = TASK_RESPAWN_TIME;
      audio.play('task_complete');

      // Slivshchiki don't add to unity (fake task)
      if (player.role === 'khozain') {
        gs.unityMeter = Math.min(100, gs.unityMeter + taskDef.unityReward);
        setPrompt(`✅ ${taskDef.label} — +${taskDef.unityReward}% единства!`, 3);
      } else {
        setPrompt(`🎭 ${taskDef.label} — выглядело убедительно.`, 3);
      }
    }
  } else {
    if (nearTask.doer === player.id) nearTask.doer = null;
  }
}

function findAmbushTarget(player: Player): Player | null {
  for (const target of gs.players) {
    if (target.id === player.id || !target.isAlive || target.role === 'slivshchik') continue;
    if (dist(player.pos, target.pos) > AMBUSH_RADIUS) continue;
    // Check lone (no other living player within AMBUSH_LONE_RADIUS)
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

  // Drop body at victim's position
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
  checkWinConditions(); // §2.5: check win immediately after ambush kill
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
  // §2.4: 15s cooldown for ALL end paths (cancel/interrupt/complete).
  // 'complete' callers set it before invoking stopSiphon; we set it here for the rest.
  if (siphoner && reason !== 'complete') {
    siphoner.siphonCooldown = 15;
  }
  car.siphoner = null;
  car.siphonPhase = 0;
  car.siphonTimer = 0;
}

function updateSiphoning(dt: number): void {
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
    // Out of range
    if (dist(siphoner.pos, car.pos) > SIPHON_RADIUS + 15) {
      if (car.siphonPhase === 2) dropCanister(siphoner, car, false);
      stopSiphon(car, siphoner, 'interrupt');
      continue;
    }

    car.siphonTimer += dt;

    if (car.siphonPhase === 1) {
      // Setup — advance to active after SIPHON_SETUP_TIME
      if (car.siphonTimer >= SIPHON_SETUP_TIME) {
        car.siphonPhase = 2;
        car.siphonTimer = 0;
        if (siphoner.isHuman) audio.startGurgle();
      }
    } else if (car.siphonPhase === 2) {
      // Active drain
      car.fuel = Math.max(0, car.fuel - SIPHON_RATE * dt);
      if (car.fuel <= 0) {
        if (siphoner.isHuman) audio.play('siphon_complete');
        dropCanister(siphoner, car, true);
        siphoner.siphonCooldown = 15; // §2.4: 15s cooldown after completing
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
  // Bots immediately "hold" the canister they just produced so disposal AI triggers
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

  // Stop all siphoning
  for (const car of gs.cars) {
    if (car.siphoner) {
      const s = gs.players.find(p => p.id === car.siphoner);
      if (s?.isHuman) audio.stopGurgle();
    }
    car.siphoner = null; car.siphonPhase = 0; car.siphonTimer = 0;
  }
  for (const task of gs.tasks) task.doer = null;
  // Drop carried canisters on the ground so they remain as evidence (§2.4)
  // Must check the flag BEFORE clearing it.
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

  // Teleport alive players to meeting circle
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
  };

  audio.play('meeting_horn');

  // Add a system message based on reason
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

// ─── Meeting tick ──────────────────────────────────────────────────────────────

function tickMeeting(dt: number): void {
  const m = gs.meeting!;
  m.timer -= dt;

  if (m.phase === 'discussion') {
    if (m.timer <= 0) {
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
  const thisMeetingId = m.meetingId; // snapshot to detect stale timeouts
  const alivePlayers = gs.players.filter(p => p.isAlive);

  for (const bot of gs.players) {
    if (bot.isHuman || !bot.isAlive) continue;
    if (m.votes.some(v => v.voterId === bot.id)) continue;

    const delay = 2 + Math.random() * 12;
    setTimeout(() => {
      // Guard: discard vote if meeting ended, phase changed, or a new meeting started
      if (!gs.meeting || gs.meeting.phase !== 'voting' || gs.meeting.meetingId !== thisMeetingId) return;
      const skipChance = bot.role === 'slivshchik' ? 0.1 : 0.2;
      if (Math.random() < skipChance) {
        gs.meeting.votes.push({ voterId: bot.id, targetId: null });
      } else {
        // Slivshchik bots avoid voting each other
        const candidates = alivePlayers.filter(p => {
          if (p.id === bot.id) return false;
          if (bot.role === 'slivshchik' && p.role === 'slivshchik') return false;
          return true;
        });
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          gs.meeting.votes.push({ voterId: bot.id, targetId: target.id });
          audio.play('vote_cast');
        }
      }
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

function endMeeting(): void {
  gs.phase = 'play';
  gs.meeting = null;
  gs.meetingCooldown = MEETING_COOLDOWN;

  for (const p of gs.players) {
    if (!p.isHuman) { p.botState = 'idle'; p.botCooldown = 1 + Math.random() * 2; }
  }

  checkWinConditions();
}

// ─── Bot chat (uses character voice lines) ────────────────────────────────────

function scheduleBotChatMessages(): void {
  if (!gs.meeting) return;
  const bots = gs.players.filter(p => !p.isHuman && p.isAlive);
  shuffleArr(bots);

  const fallbackPhrases = [
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

  for (let i = 0; i < Math.min(bots.length, 5); i++) {
    const bot = bots[i];
    const delay = 3 + i * (4 + Math.random() * 6);
    setTimeout(() => {
      if (!gs.meeting) return;
      const charDef = CHARACTERS[bot.character];
      // 60% chance to use character voice line, 40% generic phrase
      let phrase: string;
      if (Math.random() < 0.6 && charDef.voiceLines.length > 0) {
        phrase = charDef.voiceLines[Math.floor(Math.random() * charDef.voiceLines.length)];
      } else {
        phrase = fallbackPhrases[Math.floor(Math.random() * fallbackPhrases.length)];
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffleArr<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export { dist };
