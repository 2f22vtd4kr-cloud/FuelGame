import { gs } from './state';
import type { Player, Vec2 } from './types';
import {
  SIPHON_RADIUS, BOT_FLEE_RADIUS,
  CANISTER_RADIUS, TASK_RESPAWN_TIME,
  FLOWERBED_SLOW_MULT,
  BOT_DIFFICULTY_SETTINGS,
} from './types';
import { TASK_DEFS } from '../data/tasks';
import { isInsideBuilding, clampToMap, dist, DUMPSTER_POSITIONS, isInFlowerBed, VALVE_POSITIONS } from '../data/map';
import type { SabotageKey } from './types';
import { callMeeting, triggerBotSabotage, isSabotageActive } from './logic';
import { VALVE_FIX_TIME, VALVE_INTERACT_RADIUS } from './types';
import { audio } from './audio';

// §4.3 Sprint duration tracking: key = `${botId}:${targetId}`, value = seconds seen sprinting
const _sprintTimer = new Map<string, number>();

// ─── §4.3 Suspicion helpers ────────────────────────────────────────────────────

/** Decay all suspicion scores for a bot by a small amount each tick. */
function decaySuspicion(bot: Player, dt: number): void {
  for (const key of Object.keys(bot.suspicion)) {
    bot.suspicion[key] = Math.max(0, bot.suspicion[key] - 0.01 * dt);
    if (bot.suspicion[key] === 0) delete bot.suspicion[key];
  }
}

/** Raise suspicion on a target player for this bot. Clamped 0–1. */
function raiseSuspicion(bot: Player, targetId: string, amount: number): void {
  bot.suspicion[targetId] = Math.min(1, (bot.suspicion[targetId] ?? 0) + amount);
}

/** Get the most-suspected living player ID above a threshold (or null). */
export function getMostSuspectedId(bot: Player, threshold = 0.25): string | null {
  let best: string | null = null;
  let bestScore = threshold;
  for (const [id, score] of Object.entries(bot.suspicion)) {
    const p = gs.players.find(x => x.id === id);
    if (!p || !p.isAlive || p.id === bot.id) continue;
    if (score > bestScore) { bestScore = score; best = id; }
  }
  return best;
}

export function updateBots(dt: number): void {
  for (const bot of gs.players) {
    if (bot.isHuman || !bot.isAlive) continue;
    if (gs.meetingCooldown > 0 || bot.botCooldown > 0) {
      bot.botCooldown = Math.max(0, bot.botCooldown - dt);
    }
    if (bot.ambushCooldown > 0) bot.ambushCooldown -= dt;
    if (bot.siphonCooldown > 0) bot.siphonCooldown -= dt;
    if (bot.ventCooldown > 0) bot.ventCooldown -= dt;

    if (bot.role === 'khozain') updateKhozainBot(bot, dt);
    else updateSlivshchikBot(bot, dt);
  }
}

// ─── Owner bot ────────────────────────────────────────────────────────────────

function updateKhozainBot(bot: Player, dt: number): void {
  decaySuspicion(bot, dt);
  const diff = BOT_DIFFICULTY_SETTINGS[gs.botDifficulty];

  // 0. Fix pipe_burst sabotage — highest priority for khozain bots
  const pipeBurst = gs.activeSabotages.find(s => s.key === 'pipe_burst' && !s.isResolved);
  if (pipeBurst) {
    // Find nearest valve that still needs fixing
    let targetValveIdx = -1;
    let bestValveDist = Infinity;
    for (let v = 0; v < VALVE_POSITIONS.length; v++) {
      const prog = v === 0 ? pipeBurst.valve1Progress : pipeBurst.valve2Progress;
      if (prog >= VALVE_FIX_TIME) continue; // already fixed
      const d = dist(bot.pos, VALVE_POSITIONS[v]);
      if (d < bestValveDist) { bestValveDist = d; targetValveIdx = v; }
    }
    if (targetValveIdx >= 0) {
      const valvePos = VALVE_POSITIONS[targetValveIdx];
      bot.botState = 'fix_sabotage';
      if (bestValveDist > VALVE_INTERACT_RADIUS) {
        moveBot(bot, valvePos, dt);
      } else {
        // At valve — increment progress
        if (targetValveIdx === 0) {
          pipeBurst.valve1Progress = Math.min(VALVE_FIX_TIME, pipeBurst.valve1Progress + dt);
        } else {
          pipeBurst.valve2Progress = Math.min(VALVE_FIX_TIME, pipeBurst.valve2Progress + dt);
        }
      }
      return;
    }
  }

  // 1. Flee if siphoner nearby
  const nearSiphoner = gs.players.find(
    p => p.id !== bot.id && p.isAlive && p.role === 'slivshchik' && dist(bot.pos, p.pos) < diff.fleeRadius
  );
  if (nearSiphoner) {
    bot.botState = 'fleeing';
    // §4.3 Raise suspicion on slivshchik who was seen near the bot
    raiseSuspicion(bot, nearSiphoner.id, 0.15 * dt);
    const awayX = bot.pos.x - nearSiphoner.pos.x;
    const awayY = bot.pos.y - nearSiphoner.pos.y;
    const len = Math.sqrt(awayX * awayX + awayY * awayY) || 1;
    moveBot(bot, { x: bot.pos.x + (awayX / len) * 120, y: bot.pos.y + (awayY / len) * 120 }, dt);
    return;
  }

  // 2. Report nearby unresolved body
  const nearBody = gs.bodies.find(b => b.reportedBy === null && dist(bot.pos, b.pos) < 90);
  if (nearBody && gs.meetingCooldown <= 0) {
    nearBody.reportedBy = bot.id;
    audio.play('body_found');
    callMeeting(bot.id, 'body');
    return;
  }

  // 3. Report drained car / raise suspicion on nearby slivshchiki caught siphoning
  const drainedCar = gs.cars.find(c => c.fuel < 10 && dist(bot.pos, c.pos) < 80);
  if (drainedCar && gs.meetingCooldown <= 0) {
    audio.play('alarm_button');
    callMeeting(bot.id, 'drained_car');
    return;
  }

  // §4.3 Observe active siphons within a reasonable radius — raise suspicion
  for (const car of gs.cars) {
    if (car.siphonPhase === 2 && car.siphoner && dist(bot.pos, car.pos) < 280) {
      raiseSuspicion(bot, car.siphoner, 0.25);
    }
  }
  // Raise suspicion if a slivshchik is near a drained car
  for (const p of gs.players) {
    if (p.id === bot.id || !p.isAlive || p.role !== 'slivshchik') continue;
    const nearDrained = gs.cars.some(c => c.fuel < 20 && dist(p.pos, c.pos) < 100);
    if (nearDrained && dist(bot.pos, p.pos) < 200) {
      raiseSuspicion(bot, p.id, 0.08 * dt);
    }
  }
  // §4.3 Sprint suspicion — raise suspicion only after target has been sprinting
  // continuously for >3 seconds within 300px (sustained fleeing looks guilty)
  for (const p of gs.players) {
    if (p.id === bot.id || !p.isAlive) continue;
    const key = `${bot.id}:${p.id}`;
    const inRange = dist(bot.pos, p.pos) < 300;
    if (inRange && p.isSprinting) {
      const prev = _sprintTimer.get(key) ?? 0;
      const next = prev + dt;
      _sprintTimer.set(key, next);
      if (next >= 3) {
        // Threshold crossed: apply a modest bump, reset so it doesn't stack
        raiseSuspicion(bot, p.id, 0.04);
        _sprintTimer.set(key, 0);
      }
    } else {
      // Out of range or stopped sprinting — reset accumulator
      if (_sprintTimer.has(key)) _sprintTimer.delete(key);
    }
  }
  // §4.3 Task-skip suspicion: player hovers near task terminal but doesn't start it → suspicious
  const humanPlayer = gs.players.find(p => p.isHuman && p.isAlive);
  if (humanPlayer && dist(bot.pos, humanPlayer.pos) < 260) {
    const nearTerminal = gs.tasks.find(t =>
      !t.isComplete && dist(humanPlayer.pos, t.pos) < 55 && t.doer !== humanPlayer.id
    );
    if (nearTerminal) {
      // Human is loitering near a task terminal without doing it — raise suspicion slowly
      raiseSuspicion(bot, humanPlayer.id, 0.04 * dt);
    }
  }

  // §4.3 Дядя Серёжа bias — older man looks harmless (ageism satire)
  for (const p of gs.players) {
    if (p.character === 'uncle_seryozha' && p.isAlive && p.id !== bot.id) {
      bot.suspicion[p.id] = Math.max(0, (bot.suspicion[p.id] ?? 0) - 0.05 * dt);
    }
  }

  // 4. Pick up a canister (evidence)
  const nearCanister = gs.canisters.find(c => dist(bot.pos, c.pos) < CANISTER_RADIUS + 20);
  if (nearCanister && !bot.isCarryingCanister) {
    if (dist(bot.pos, nearCanister.pos) < CANISTER_RADIUS) {
      const idx = gs.canisters.indexOf(nearCanister);
      gs.canisters.splice(idx, 1);
      bot.isCarryingCanister = true;
    } else {
      bot.botState = 'moving';
      moveBot(bot, nearCanister.pos, dt);
      return;
    }
  }

  // 5. Do a task
  if (bot.botState === 'idle' || bot.botState === 'fleeing') {
    // Find nearest incomplete task
    let best = null; let bestDist = Infinity;
    for (const t of gs.tasks) {
      if (t.isComplete || t.doer !== null) continue;
      const d = dist(bot.pos, t.pos);
      if (d < bestDist) { bestDist = d; best = t; }
    }
    if (best) { bot.botTaskId = best.id; bot.botState = 'moving'; }
    else { bot.botState = 'idle'; randomWander(bot, dt); return; }
  }

  if (bot.botState === 'moving' || bot.botState === 'interacting') {
    const task = gs.tasks.find(t => t.id === bot.botTaskId);
    if (!task || task.isComplete) {
      bot.botState = 'idle'; bot.botTaskId = null;
      bot.botCooldown = 0.5 + Math.random() * 1.5;
      return;
    }
    const d = dist(bot.pos, task.pos);
    if (d > 40) {
      bot.botState = 'moving';
      moveBot(bot, task.pos, dt);
    } else {
      bot.botState = 'interacting';
      const taskDef = TASK_DEFS[task.defKey];
      if (task.doer === null || task.doer === bot.id) {
        task.doer = bot.id;
        task.progress += dt / taskDef.duration;
        if (task.progress >= 1) {
          task.progress = 1;
          task.isComplete = true;
          task.completedBy = bot.id;
          task.doer = null;
          task.respawnTimer = TASK_RESPAWN_TIME;
          audio.play('task_complete');
          gs.unityMeter = Math.min(100, gs.unityMeter + taskDef.unityReward);
          // §2.1 Bot task completion also extends match time
          gs.matchTimeLimit = Math.min(gs.matchTimeLimit + 30, 600);
          bot.tasksCompleted++;
          bot.botState = 'idle'; bot.botTaskId = null;
          bot.botCooldown = 0.5 + Math.random() * 2;
        }
      }
    }
  }
}

// ─── Slivshchik bot ────────────────────────────────────────────────────────────

function updateSlivshchikBot(bot: Player, dt: number): void {
  // 1. Check if human (or bot owner) is watching (within BOT_FLEE_RADIUS)
  const watchers = gs.players.filter(p =>
    p.id !== bot.id && p.isAlive && p.role === 'khozain' && dist(bot.pos, p.pos) < BOT_FLEE_RADIUS
  );
  const isWatched = watchers.length > 0;

  // §4.2 Vent escape — Hard/Nightmare: teleport between dumpsters when cornered while carrying or fleeing
  const isHardMode = gs.botDifficulty === 'hard' || gs.botDifficulty === 'nightmare';
  if (isHardMode && bot.ventCooldown <= 0 && watchers.length > 0 &&
      (bot.botState === 'fleeing' || bot.isCarryingCanister)) {
    // Pick the dumpster furthest from all watchers
    let bestDumpster = DUMPSTER_POSITIONS[0];
    let bestMinDist = -Infinity;
    for (const dp of DUMPSTER_POSITIONS) {
      if (dist(bot.pos, dp) < 30) continue; // don't teleport to current position
      const minWatcherDist = Math.min(...watchers.map(w => dist(dp, w.pos)));
      if (minWatcherDist > bestMinDist) { bestMinDist = minWatcherDist; bestDumpster = dp; }
    }
    bot.pos = { x: bestDumpster.x + (Math.random() - 0.5) * 20, y: bestDumpster.y + (Math.random() - 0.5) * 20 };
    bot.ventCooldown = 28 + Math.random() * 8;
    bot.botState = 'idle';
    return;
  }

  // If fleeing
  if (bot.botState === 'fleeing') {
    if (!isWatched) {
      bot.botState = 'idle';
      bot.botCooldown = 1 + Math.random() * 2;
    } else {
      const watcher = watchers[0];
      const awayX = bot.pos.x - watcher.pos.x;
      const awayY = bot.pos.y - watcher.pos.y;
      const len = Math.sqrt(awayX * awayX + awayY * awayY) || 1;
      moveBot(bot, { x: bot.pos.x + (awayX / len) * 150, y: bot.pos.y + (awayY / len) * 150 }, dt);
    }
    return;
  }

  // 2. Watched while actively siphoning → interrupt and flee (§2.4)
  // Must be checked BEFORE the generic watched→fake-task branch so the interacting
  // state is handled correctly instead of silently falling through to fake-task.
  if (isWatched && bot.botState === 'interacting') {
    const car = gs.cars.find(c => c.id === bot.botCarId);
    if (car && car.siphoner === bot.id) {
      if (car.siphonPhase === 2) {
        // Drop canister; bot immediately picks it up to dispose (§2.4)
        gs.canisters.push({
          id: `can_interrupt_${car.id}_${Date.now()}`,
          pos: { ...bot.pos },
          ownerId: bot.id,
          isFull: false,
        });
        audio.play('canister_drop');
        bot.isCarryingCanister = true;
      }
      // Apply 15-second cooldown (§2.4)
      bot.siphonCooldown = 15;
      car.siphoner = null; car.siphonPhase = 0; car.siphonTimer = 0;
    }
    bot.botCarId = null; bot.botState = 'fleeing'; bot.botCooldown = 2;
    return;
  }

  // 3. Watched → do a fake task for cover
  if (isWatched) {
    if (bot.botState !== 'fake_task') {
      // Find a nearby task to fake
      const fakeTask = gs.tasks.find(t => !t.isComplete && dist(bot.pos, t.pos) < 200);
      if (fakeTask) {
        bot.botTaskId = fakeTask.id;
        bot.botState = 'fake_task';
      }
    }
    if (bot.botState === 'fake_task') {
      const task = gs.tasks.find(t => t.id === bot.botTaskId);
      if (!task || task.isComplete) {
        bot.botState = 'idle';
      } else if (dist(bot.pos, task.pos) > 40) {
        moveBot(bot, task.pos, dt);
      }
      // Just stand near task — looks legit!
    }
    return;
  }

  // 3. Attempt ambush if alone with an owner — uses difficulty-based chance
  const diffSliv = BOT_DIFFICULTY_SETTINGS[gs.botDifficulty];
  if (bot.ambushCooldown <= 0) {
    const ambushTarget = gs.players.find(p => {
      if (p.id === bot.id || !p.isAlive || p.role !== 'khozain') return false;
      if (dist(bot.pos, p.pos) > 55) return false;
      const others = gs.players.filter(o =>
        o.id !== bot.id && o.id !== p.id && o.isAlive && dist(o.pos, p.pos) < 480
      );
      return others.length === 0;
    });
    if (ambushTarget && Math.random() < diffSliv.ambushChance) {
      // Ambush!
      ambushTarget.isAlive = false;
      bot.ambushCooldown = 25;
      audio.play('ambush');
      if (ambushTarget.isHuman) audio.play('player_death');
      else audio.play('bot_death');
      gs.bodies.push({
        id: `body_${ambushTarget.id}_${Date.now()}`,
        playerId: ambushTarget.id,
        character: ambushTarget.character,
        name: ambushTarget.name,
        pos: { ...ambushTarget.pos },
        reportedBy: null,
      });
      bot.botState = 'fleeing';
      bot.botCooldown = 3;
      return;
    }
  }

  // 3.5. Sabotage attempt (§2.9 — uses difficulty-based chance)
  if (bot.sabotageCooldown <= 0 && !isWatched && Math.random() < diffSliv.sabotageChancePerFrame) {
    // ~18% chance per 60s (checked per frame at 0.003 * 60fps)
    const keys: SabotageKey[] = ['alarm_chaos', 'chat_offline', 'babushka_cerberus', 'pipe_burst'];
    const available = keys.filter(k => !gs.activeSabotages.some(s => s.key === k && !s.isResolved));
    if (available.length > 0) {
      // Prefer alarm_chaos before siphoning to mask gurgle; pipe_burst last (critical risk)
      const preferOrder: SabotageKey[] = ['alarm_chaos', 'chat_offline', 'babushka_cerberus', 'pipe_burst'];
      const sorted = preferOrder.filter(k => available.includes(k));
      const pick = sorted.length > 0 ? sorted[0] : available[0];
      triggerBotSabotage(bot.id, pick);
    }
  }

  // 4a. Dispose of carried canister at dumpster (§2.4 — Сливщики must dispose)
  if (bot.isCarryingCanister) {
    const nearDump = DUMPSTER_POSITIONS.some(dp => dist(bot.pos, dp) < 60);
    if (nearDump) {
      // Remove this bot's canisters from world state so ground evidence disappears
      for (let i = gs.canisters.length - 1; i >= 0; i--) {
        if (gs.canisters[i].ownerId === bot.id) gs.canisters.splice(i, 1);
      }
      bot.isCarryingCanister = false;
    } else {
      let nearest: { x: number; y: number } | null = null;
      let nearestDist = Infinity;
      for (const dp of DUMPSTER_POSITIONS) {
        const dd = dist(bot.pos, dp);
        if (dd < nearestDist) { nearestDist = dd; nearest = dp; }
      }
      if (nearest) { moveBot(bot, nearest, dt); return; }
    }
  }

  // 4. Find a car to siphon
  if (bot.botState === 'idle' || bot.botState === 'fake_task') {
    if (bot.siphonCooldown > 0) { randomWander(bot, dt); return; }
    // §2.9 Pipe burst: cars are flooded and inaccessible for all players
    if (isSabotageActive('pipe_burst')) { randomWander(bot, dt); return; }
    let best = null; let bestDist = Infinity;
    for (const car of gs.cars) {
      if (car.fuel <= 0 || car.hasImmunity || car.siphoner) continue;
      const d = dist(bot.pos, car.pos);
      if (d < bestDist) { bestDist = d; best = car; }
    }
    if (best) { bot.botCarId = best.id; bot.botState = 'moving'; }
    else { randomWander(bot, dt); return; }
  }

  if (bot.botState === 'moving') {
    const car = gs.cars.find(c => c.id === bot.botCarId);
    if (!car || car.fuel <= 0 || car.hasImmunity || (car.siphoner && car.siphoner !== bot.id)) {
      bot.botState = 'idle'; bot.botCarId = null;
      bot.botCooldown = 1;
      return;
    }
    const d = dist(bot.pos, car.pos);
    if (d > SIPHON_RADIUS - 10) {
      moveBot(bot, car.pos, dt);
    } else {
      // Start siphon
      if (!car.siphoner) {
        car.siphoner = bot.id;
        car.siphonPhase = 1;
        car.siphonTimer = 0;
      }
      bot.botState = 'interacting';
    }
    return;
  }

  if (bot.botState === 'interacting') {
    const car = gs.cars.find(c => c.id === bot.botCarId);
    if (!car || car.fuel <= 0 || car.siphoner !== bot.id) {
      bot.botState = 'idle'; bot.botCarId = null;
      return;
    }
    // Bot auto-advances siphon phases (already handled in updateSiphoning)
    // Stay close to car
    if (dist(bot.pos, car.pos) > SIPHON_RADIUS + 5) {
      moveBot(bot, car.pos, dt);
    }
    // Note: watched-while-interacting interrupt is handled at the top of this
    // function (before the generic isWatched fake-task branch) so it never
    // reaches here in that scenario.
  }
}

// ─── Movement helpers ─────────────────────────────────────────────────────────

function moveBot(bot: Player, target: Vec2, dt: number): void {
  const dx = target.x - bot.pos.x;
  const dy = target.y - bot.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 2) return;

  bot.facingAngle = Math.atan2(dy, dx);
  const nx = dx / d;
  const ny = dy / d;
  // §1.2 Flower-bed slow zone
  const fbMult = isInFlowerBed(bot.pos) ? FLOWERBED_SLOW_MULT : 1;
  const speed = bot.speed * fbMult;
  const candidate = clampToMap({ x: bot.pos.x + nx * speed * dt, y: bot.pos.y + ny * speed * dt }, 14);
  if (!isInsideBuilding(candidate, 14)) {
    bot.pos = candidate;
  } else {
    const cx = clampToMap({ x: bot.pos.x + nx * speed * dt, y: bot.pos.y }, 14);
    if (!isInsideBuilding(cx, 14)) bot.pos = cx;
    else {
      const cy = clampToMap({ x: bot.pos.x, y: bot.pos.y + ny * speed * dt }, 14);
      if (!isInsideBuilding(cy, 14)) bot.pos = cy;
    }
  }
}

function randomWander(bot: Player, dt: number): void {
  if (!bot.botTarget || dist(bot.pos, bot.botTarget) < 20) {
    const margin = 120;
    bot.botTarget = {
      x: margin + Math.random() * (1200 - margin * 2),
      y: 120 + Math.random() * (900 - 240),
    };
  }
  moveBot(bot, bot.botTarget, dt);
}
