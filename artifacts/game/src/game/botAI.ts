import { gs } from './state';
import type { Player } from './types';
import { SIPHON_RADIUS, INTERACT_RADIUS, BOT_FLEE_RADIUS, TASK_RESPAWN_TIME } from './types';
import { TASK_DEFS } from '../data/tasks';
import { dist, clampToMap, isInsideBuilding } from '../data/map';

const BOT_SPEED_THRESHOLD = 0.5; // fraction of speed to use

// ─── Main bot update ──────────────────────────────────────────────────────────
// FIXED (was broken in prev session):
// 1. Bots check distance BEFORE starting interaction (task gating fix)
// 2. Siphoners check for nearby humans BEFORE siphoning
// 3. Meeting state properly resets bot targets

export function updateBots(dt: number): void {
  if (gs.phase !== 'play') return;

  for (const bot of gs.players) {
    if (bot.isHuman || !bot.isAlive) continue;
    bot.botCooldown = Math.max(0, bot.botCooldown - dt);

    if (bot.role === 'khozain') {
      updateOwnerBot(bot, dt);
    } else {
      updateSiphonerBot(bot, dt);
    }
  }
}

// ─── Owner bot ────────────────────────────────────────────────────────────────

function updateOwnerBot(bot: Player, dt: number): void {
  if (bot.botCooldown > 0) return;

  switch (bot.botState) {
    case 'idle': {
      // Pick a random incomplete task
      const available = gs.tasks.filter(t => !t.isComplete && t.doer !== bot.id);
      if (available.length === 0) {
        bot.botCooldown = 2 + Math.random() * 3;
        return;
      }
      // Prefer tasks no one is doing
      const unoccupied = available.filter(t => t.doer === null);
      const target = unoccupied.length > 0
        ? unoccupied[Math.floor(Math.random() * unoccupied.length)]
        : available[Math.floor(Math.random() * available.length)];

      bot.botTaskId = target.id;
      bot.botTarget = { ...target.pos };
      bot.botState = 'moving';
      break;
    }

    case 'moving': {
      if (!bot.botTarget || !bot.botTaskId) {
        bot.botState = 'idle';
        bot.botCooldown = 0.5;
        return;
      }

      const task = gs.tasks.find(t => t.id === bot.botTaskId);
      if (!task || task.isComplete) {
        // Task disappeared, pick new one
        bot.botState = 'idle';
        bot.botTaskId = null;
        bot.botTarget = null;
        bot.botCooldown = 0.5;
        return;
      }

      const d = dist(bot.pos, bot.botTarget);

      // TASK GATING FIX: must reach position BEFORE claiming interaction
      if (d < INTERACT_RADIUS * 0.7) {
        bot.botState = 'interacting';
        task.doer = bot.id;
      } else {
        moveToward(bot, bot.botTarget, dt);
      }
      break;
    }

    case 'interacting': {
      const task = gs.tasks.find(t => t.id === bot.botTaskId);
      if (!task || task.isComplete) {
        bot.botState = 'idle';
        bot.botTaskId = null;
        bot.botCooldown = 1 + Math.random() * 2;
        return;
      }

      // Verify still in range (gating fix — keep checking while interacting)
      const d = dist(bot.pos, task.pos);
      if (d > INTERACT_RADIUS) {
        task.doer = null;
        bot.botState = 'moving'; // go back
        bot.botTarget = { ...task.pos };
        return;
      }

      const taskDef = TASK_DEFS[task.defKey];
      task.doer = bot.id;
      task.progress += dt / taskDef.duration;

      if (task.progress >= 1) {
        task.progress = 1;
        task.isComplete = true;
        task.completedBy = bot.id;
        task.doer = null;
        task.respawnTimer = TASK_RESPAWN_TIME;
        gs.unityMeter = Math.min(100, gs.unityMeter + taskDef.unityReward);

        bot.botState = 'idle';
        bot.botTaskId = null;
        bot.botCooldown = 0.5 + Math.random() * 2;
      }
      break;
    }

    case 'fleeing': {
      if (!bot.botTarget) {
        bot.botState = 'idle';
        return;
      }
      const d = dist(bot.pos, bot.botTarget);
      if (d < 30) {
        bot.botState = 'idle';
        bot.botCooldown = 2;
        bot.botTarget = null;
      } else {
        moveToward(bot, bot.botTarget, dt);
      }
      break;
    }

    case 'at_meeting': {
      // Stay still during meetings
      break;
    }
  }
}

// ─── Siphoner bot ─────────────────────────────────────────────────────────────

function updateSiphonerBot(bot: Player, dt: number): void {
  if (bot.botCooldown > 0) return;

  // FLEE FIX: always check for nearby humans first, regardless of state
  if (bot.botState !== 'fleeing' && bot.botState !== 'at_meeting') {
    const humanNearby = gs.players.some(p =>
      p.isHuman && p.isAlive && dist(p.pos, bot.pos) < BOT_FLEE_RADIUS
    );
    if (humanNearby && bot.botState === 'interacting') {
      // Stop siphoning and flee
      for (const car of gs.cars) {
        if (car.siphoner === bot.id) car.siphoner = null;
      }
      bot.botState = 'fleeing';
      bot.botTarget = randomFarPosition(bot.pos);
      bot.botCarId = null;
      bot.botCooldown = 0.5;
      return;
    }
  }

  switch (bot.botState) {
    case 'idle': {
      // Pick a car with fuel to drain
      const targets = gs.cars.filter(c => c.fuel > 10 && !c.hasImmunity && c.siphoner === null);
      if (targets.length === 0) {
        bot.botCooldown = 3 + Math.random() * 4;
        return;
      }
      const target = targets[Math.floor(Math.random() * targets.length)];
      bot.botCarId = target.id;
      bot.botTarget = { ...target.pos };
      bot.botState = 'moving';
      break;
    }

    case 'moving': {
      if (!bot.botTarget || !bot.botCarId) {
        bot.botState = 'idle';
        bot.botCooldown = 1;
        return;
      }

      const car = gs.cars.find(c => c.id === bot.botCarId);
      if (!car || car.fuel <= 0 || car.hasImmunity) {
        bot.botState = 'idle';
        bot.botCarId = null;
        bot.botTarget = null;
        bot.botCooldown = 1;
        return;
      }

      const d = dist(bot.pos, bot.botTarget);
      if (d < SIPHON_RADIUS * 0.7) {
        // Check no human nearby before starting siphon
        const humanNearby = gs.players.some(p =>
          p.isHuman && p.isAlive && dist(p.pos, bot.pos) < BOT_FLEE_RADIUS
        );
        if (humanNearby) {
          bot.botState = 'fleeing';
          bot.botTarget = randomFarPosition(bot.pos);
          bot.botCarId = null;
          bot.botCooldown = 0.5;
        } else {
          bot.botState = 'interacting';
          car.siphoner = bot.id;
        }
      } else {
        moveToward(bot, bot.botTarget, dt);
      }
      break;
    }

    case 'interacting': {
      const car = gs.cars.find(c => c.id === bot.botCarId);
      if (!car || car.fuel <= 0 || car.hasImmunity) {
        if (car) car.siphoner = null;
        bot.botState = 'idle';
        bot.botCarId = null;
        bot.botCooldown = 1 + Math.random() * 3;
        return;
      }

      // Keep verifying range (siphon gating fix)
      const d = dist(bot.pos, car.pos);
      if (d > SIPHON_RADIUS) {
        car.siphoner = null;
        bot.botState = 'moving';
        bot.botTarget = { ...car.pos };
        return;
      }

      // Drift slightly around the car to look natural
      const driftX = (Math.random() - 0.5) * 20 * dt;
      const driftY = (Math.random() - 0.5) * 20 * dt;
      const candidate = clampToMap({ x: bot.pos.x + driftX, y: bot.pos.y + driftY }, 14);
      if (!isInsideBuilding(candidate, 14)) {
        bot.pos = candidate;
      }

      // After draining check if done
      if (car.fuel <= 0) {
        car.siphoner = null;
        bot.botState = 'idle';
        bot.botCarId = null;
        bot.botCooldown = 2 + Math.random() * 3;
      }
      break;
    }

    case 'fleeing': {
      if (!bot.botTarget) {
        bot.botState = 'idle';
        return;
      }
      const d = dist(bot.pos, bot.botTarget);
      if (d < 30) {
        bot.botState = 'idle';
        bot.botCooldown = 3 + Math.random() * 5;
        bot.botTarget = null;
      } else {
        moveToward(bot, bot.botTarget, dt * 1.3); // flee faster
      }
      break;
    }
  }
}

// ─── Movement helper ──────────────────────────────────────────────────────────

function moveToward(bot: Player, target: { x: number; y: number }, dt: number): void {
  const dx = target.x - bot.pos.x;
  const dy = target.y - bot.pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 1) return;

  const nx = dx / d;
  const ny = dy / d;
  const speed = bot.speed * BOT_SPEED_THRESHOLD;

  const newX = bot.pos.x + nx * speed * dt;
  const newY = bot.pos.y + ny * speed * dt;
  const candidate = clampToMap({ x: newX, y: newY }, 14);

  if (!isInsideBuilding(candidate, 14)) {
    bot.pos = candidate;
  } else {
    // Try sliding
    const cx = clampToMap({ x: newX, y: bot.pos.y }, 14);
    if (!isInsideBuilding(cx, 14)) { bot.pos = cx; return; }
    const cy = clampToMap({ x: bot.pos.x, y: newY }, 14);
    if (!isInsideBuilding(cy, 14)) { bot.pos = cy; return; }
  }
}

function randomFarPosition(from: { x: number; y: number }): { x: number; y: number } {
  const corners = [
    { x: 200, y: 600 },
    { x: 1000, y: 600 },
    { x: 200, y: 200 },
    { x: 1000, y: 200 },
    { x: 600, y: 650 },
  ];
  // Pick a corner far from current pos
  let best = corners[0];
  let bestDist = 0;
  for (const c of corners) {
    const d = dist(from, c);
    if (d > bestDist) { bestDist = d; best = c; }
  }
  return best;
}
