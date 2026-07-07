import type { GameState } from './types';
import { INTERACT_RADIUS, SIPHON_RADIUS, ALARM_RADIUS } from './types';
import { MAP_W, MAP_H, BUILDINGS, PARKING_LOT, DECORATIONS, ENTRANCE_POS, TASK_SPAWNS } from '../data/map';
import { TASK_DEFS } from '../data/tasks';
import { CHARACTERS } from '../data/characters';

const CAR_W = 60;
const CAR_H = 28;
const PLAYER_RADIUS = 16;

// ─── Camera state (updated each frame) ───────────────────────────────────────

let camX = 0;
let camY = 0;

function updateCamera(gs: GameState, vw: number, vh: number): void {
  const player = gs.players.find(p => p.id === gs.localPlayerId);
  if (!player) return;
  camX = Math.max(0, Math.min(MAP_W - vw, player.pos.x - vw / 2));
  camY = Math.max(0, Math.min(MAP_H - vh, player.pos.y - vh / 2));
}

// World-to-screen
function ws(wx: number): number { return wx - camX; }
function hs(wy: number): number { return wy - camY; }

// ─── Main render ──────────────────────────────────────────────────────────────

export function renderGame(canvas: HTMLCanvasElement, gs: GameState): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const vw = canvas.width;
  const vh = canvas.height;

  updateCamera(gs, vw, vh);

  // ── Background ──────────────────────────────────────────────────────────────
  // Sky gradient (only visible if map edge is in view)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
  skyGrad.addColorStop(0, '#87CEEB');
  skyGrad.addColorStop(1, '#B0E0FF');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, vw, vh);

  // ── Ground ──────────────────────────────────────────────────────────────────
  // Grass
  ctx.fillStyle = '#5CBB5C';
  ctx.fillRect(ws(90), hs(90), 1020, 720);

  // Parking lot asphalt
  ctx.fillStyle = '#7B8B9A';
  ctx.fillRect(ws(PARKING_LOT.x), hs(PARKING_LOT.y), PARKING_LOT.w, PARKING_LOT.h);

  // Parking lot markings
  ctx.strokeStyle = '#FFFFFF44';
  ctx.lineWidth = 1.5;
  for (let x = 160; x <= 1040; x += 130) {
    ctx.beginPath();
    ctx.moveTo(ws(x), hs(PARKING_LOT.y));
    ctx.lineTo(ws(x), hs(PARKING_LOT.y + PARKING_LOT.h));
    ctx.stroke();
  }

  // Path (slightly lighter strip through garden)
  ctx.fillStyle = '#A8C895';
  ctx.fillRect(ws(480), hs(470), 240, 340);

  // ── Buildings ────────────────────────────────────────────────────────────────
  for (const b of BUILDINGS) {
    // Main building body
    ctx.fillStyle = '#D4C5A9';
    ctx.fillRect(ws(b.x), hs(b.y), b.w, b.h);

    // Building texture: rows of windows
    if (b.w > b.h) {
      // Horizontal building
      ctx.fillStyle = '#A8CDE8';
      const winW = 18; const winH = 12; const gapX = 28; const gapY = 18;
      for (let wx2 = b.x + 15; wx2 < b.x + b.w - 20; wx2 += gapX + winW) {
        for (let wy2 = b.y + 8; wy2 < b.y + b.h - 8; wy2 += gapY + winH) {
          ctx.fillRect(ws(wx2), hs(wy2), winW, winH);
        }
      }
    } else {
      // Vertical building
      ctx.fillStyle = '#A8CDE8';
      const winW = 16; const winH = 12; const gapX = 22; const gapY = 18;
      for (let wx2 = b.x + 10; wx2 < b.x + b.w - 10; wx2 += gapX + winW) {
        for (let wy2 = b.y + 10; wy2 < b.y + b.h - 10; wy2 += gapY + winH) {
          ctx.fillRect(ws(wx2), hs(wy2), winW, winH);
        }
      }
    }

    // Building outline
    ctx.strokeStyle = '#B8A88A';
    ctx.lineWidth = 1;
    ctx.strokeRect(ws(b.x), hs(b.y), b.w, b.h);
  }

  // Entrance arch gap (draw over the bottom building)
  ctx.fillStyle = '#5CBB5C';
  ctx.fillRect(ws(450), hs(810), 300, 90);

  // Entrance arch visual
  ctx.fillStyle = '#C8B89A';
  ctx.fillRect(ws(450), hs(815), 30, 80);
  ctx.fillRect(ws(720), hs(815), 30, 80);
  ctx.fillRect(ws(450), hs(815), 300, 20);

  // ── Decorations ─────────────────────────────────────────────────────────────
  for (const deco of DECORATIONS) {
    const sx = ws(deco.pos.x);
    const sy = hs(deco.pos.y);
    // Skip if off screen
    if (sx < -60 || sx > vw + 60 || sy < -60 || sy > vh + 60) continue;

    switch (deco.type) {
      case 'tree':
        // Trunk
        ctx.fillStyle = '#8B5E3C';
        ctx.fillRect(sx - 5, sy - 5, 10, 20);
        // Canopy
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.arc(sx, sy - 15, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#388E3C';
        ctx.beginPath();
        ctx.arc(sx - 5, sy - 20, 14, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bench':
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(sx - 20, sy - 5, 40, 8);
        ctx.fillRect(sx - 18, sy + 3, 5, 10);
        ctx.fillRect(sx + 13, sy + 3, 5, 10);
        break;

      case 'dumpster':
        ctx.fillStyle = '#558B2F';
        ctx.fillRect(sx - 18, sy - 12, 36, 24);
        ctx.fillStyle = '#33691E';
        ctx.fillRect(sx - 18, sy - 12, 36, 6);
        ctx.fillStyle = '#FFF';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ТБО', sx, sy + 5);
        break;

      case 'flowerbed':
        ctx.fillStyle = '#66BB6A';
        ctx.beginPath();
        ctx.ellipse(sx, sy, 28, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        // Flowers
        const colors2 = ['#FF4081', '#FFEE58', '#FF7043', '#AB47BC'];
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = colors2[i % colors2.length];
          ctx.beginPath();
          ctx.arc(sx + (i - 2) * 10, sy + (i % 2 === 0 ? -3 : 3), 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'lamppost':
        ctx.fillStyle = '#616161';
        ctx.fillRect(sx - 2, sy - 30, 4, 35);
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath();
        ctx.arc(sx, sy - 30, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  // ── Shawarma stand ───────────────────────────────────────────────────────────
  const shawarmaPos = TASK_SPAWNS.find(t => t.defKey === 'shawarma')?.pos ?? { x: 145, y: 530 };
  {
    const sx = ws(shawarmaPos.x);
    const sy = hs(shawarmaPos.y);
    ctx.fillStyle = '#FF8C00';
    ctx.fillRect(sx - 22, sy - 20, 44, 36);
    ctx.fillStyle = '#FF6D00';
    ctx.fillRect(sx - 22, sy - 20, 44, 8);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ШАУРМА', sx, sy + 4);
  }

  // ── Alarm button at entrance ──────────────────────────────────────────────────
  {
    const sx = ws(ENTRANCE_POS.x);
    const sy = hs(ENTRANCE_POS.y);
    const t = Date.now() / 1000;
    const pulse = gs.meetingCooldown <= 0 ? (0.6 + 0.4 * Math.sin(t * 3)) : 0.3;
    ctx.fillStyle = `rgba(255,50,50,${pulse})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', sx, sy + 4);
    ctx.fillStyle = '#FFF';
    ctx.font = '7px sans-serif';
    ctx.fillText('СХОДКА', sx, sy + 22);
  }

  // ── Alarm radius hint (when player is close) ─────────────────────────────────
  const localPlayer = gs.players.find(p => p.id === gs.localPlayerId);
  if (localPlayer && gs.meetingCooldown <= 0) {
    const d2 = dist2(localPlayer.pos, ENTRANCE_POS);
    if (d2 < (ALARM_RADIUS + 80) ** 2) {
      ctx.strokeStyle = 'rgba(255,80,80,0.2)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(ws(ENTRANCE_POS.x), hs(ENTRANCE_POS.y), ALARM_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ── Task markers ─────────────────────────────────────────────────────────────
  const t = Date.now() / 1000;
  for (const task of gs.tasks) {
    if (task.isComplete) continue;
    const sx = ws(task.pos.x);
    const sy = hs(task.pos.y);
    if (sx < -80 || sx > vw + 80 || sy < -80 || sy > vh + 80) continue;

    const def = TASK_DEFS[task.defKey];
    const isActive = task.doer !== null;
    const pulse = isActive
      ? 1
      : 0.7 + 0.3 * Math.sin(t * 2.5 + task.pos.x);

    // Glow ring
    ctx.fillStyle = `${def.color}33`;
    ctx.beginPath();
    ctx.arc(sx, sy, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Task icon circle
    ctx.fillStyle = isActive ? def.color : `${def.color}BB`;
    ctx.beginPath();
    ctx.arc(sx, sy, 16, 0, Math.PI * 2);
    ctx.fill();

    // Emoji
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillText(def.emoji, sx, sy + 5);

    // Progress bar (if in progress)
    if (task.progress > 0 && !task.isComplete) {
      const barW = 44;
      ctx.fillStyle = '#0005';
      ctx.fillRect(sx - barW / 2, sy + 20, barW, 6);
      ctx.fillStyle = def.color;
      ctx.fillRect(sx - barW / 2, sy + 20, barW * task.progress, 6);
    }

    // Task label
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(def.label, sx, sy + 34);
  }

  // ── Interact radius hints ─────────────────────────────────────────────────────
  if (localPlayer) {
    for (const task of gs.tasks) {
      if (task.isComplete) continue;
      const d2 = dist2(localPlayer.pos, task.pos);
      if (d2 < (INTERACT_RADIUS + 40) ** 2) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(ws(task.pos.x), hs(task.pos.y), INTERACT_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  // ── Cars ──────────────────────────────────────────────────────────────────────
  for (const car of gs.cars) {
    const sx = ws(car.pos.x);
    const sy = hs(car.pos.y);
    if (sx < -80 || sx > vw + 80 || sy < -80 || sy > vh + 80) continue;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + CAR_H / 2 + 2, CAR_W / 2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car body
    ctx.fillStyle = car.hasImmunity ? '#FFD700' : car.color;
    ctx.beginPath();
    ctx.roundRect(sx - CAR_W / 2, sy - CAR_H / 2, CAR_W, CAR_H, 5);
    ctx.fill();

    // Windshield
    ctx.fillStyle = 'rgba(200,230,255,0.6)';
    ctx.beginPath();
    ctx.roundRect(sx - CAR_W / 2 + 8, sy - CAR_H / 2 + 4, CAR_W * 0.4, CAR_H - 8, 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(sx - CAR_W / 2, sy - CAR_H / 2, CAR_W, CAR_H, 5);
    ctx.stroke();

    // Immunity golden glow
    if (car.hasImmunity) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - CAR_W / 2 - 3, sy - CAR_H / 2 - 3, CAR_W + 6, CAR_H + 6);
      ctx.shadowBlur = 0;
    }

    // Fuel bar (below car)
    const barW = CAR_W;
    const fuelPct = car.fuel / 100;
    ctx.fillStyle = '#0008';
    ctx.fillRect(sx - barW / 2, sy + CAR_H / 2 + 4, barW, 5);
    ctx.fillStyle = fuelPct > 0.5 ? '#4CAF50' : fuelPct > 0.25 ? '#FFC107' : '#F44336';
    ctx.fillRect(sx - barW / 2, sy + CAR_H / 2 + 4, barW * fuelPct, 5);

    // Siphon animation (green stream from siphoner to car)
    if (car.siphoner) {
      const siphoner = gs.players.find(p => p.id === car.siphoner);
      if (siphoner) {
        const px = ws(siphoner.pos.x);
        const py = hs(siphoner.pos.y);
        const grad = ctx.createLinearGradient(px, py, sx, sy);
        grad.addColorStop(0, 'rgba(0,200,80,0)');
        grad.addColorStop(0.4, 'rgba(0,200,80,0.8)');
        grad.addColorStop(1, 'rgba(0,200,80,0.3)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3 + Math.sin(t * 8) * 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Drip particles
        for (let i = 0; i < 3; i++) {
          const frac = ((t * 2 + i * 0.33) % 1);
          const dropX = px + (sx - px) * frac;
          const dropY = py + (sy - py) * frac;
          ctx.fillStyle = `rgba(0,220,80,${1 - frac})`;
          ctx.beginPath();
          ctx.arc(dropX, dropY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // ── Players ───────────────────────────────────────────────────────────────────
  for (const player of gs.players) {
    if (!player.isAlive) continue;
    const sx = ws(player.pos.x);
    const sy = hs(player.pos.y);
    if (sx < -50 || sx > vw + 50 || sy < -50 || sy > vh + 50) continue;

    const charDef = CHARACTERS[player.character];
    const isLocalPlayer = player.id === gs.localPlayerId;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + PLAYER_RADIUS, PLAYER_RADIUS, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player body (larger for local player)
    const r = isLocalPlayer ? PLAYER_RADIUS + 3 : PLAYER_RADIUS;
    ctx.fillStyle = charDef.color;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    // White outline for local player
    if (isLocalPlayer) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Character emoji
    ctx.font = `${r + 2}px serif`;
    ctx.textAlign = 'center';
    ctx.fillText(charDef.emoji, sx, sy + (r + 2) * 0.35);

    // Name label
    ctx.fillStyle = isLocalPlayer ? '#FFFFFF' : '#F5F5F5';
    ctx.font = `bold ${isLocalPlayer ? 10 : 9}px sans-serif`;
    ctx.textAlign = 'center';
    // Name background
    const nameW = ctx.measureText(player.name).width + 6;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(sx - nameW / 2, sy - r - 17, nameW, 13);
    ctx.fillStyle = isLocalPlayer ? '#FFD700' : '#FFFFFF';
    ctx.fillText(player.name, sx, sy - r - 7);

    // Role badge (only visible to local player for themselves)
    if (isLocalPlayer) {
      const badgeText = player.role === 'slivshchik' ? '🪣 СЛИВЩИК' : '🏠 ХОЗЯИН';
      const badgeColor = player.role === 'slivshchik' ? '#D32F2F' : '#388E3C';
      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.roundRect(sx - 36, sy + r + 6, 72, 14, 4);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 8px sans-serif';
      ctx.fillText(badgeText, sx, sy + r + 16);
    }
  }

  // ── Dead player markers ───────────────────────────────────────────────────────
  for (const player of gs.players) {
    if (player.isAlive) continue;
    const sx = ws(player.pos.x);
    const sy = hs(player.pos.y);
    if (sx < -50 || sx > vw + 50 || sy < -50 || sy > vh + 50) continue;

    ctx.fillStyle = 'rgba(100,100,100,0.6)';
    ctx.beginPath();
    ctx.arc(sx, sy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#999';
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.fillText('💀', sx, sy + 5);
    ctx.fillStyle = '#AAA';
    ctx.font = '8px sans-serif';
    ctx.fillText(CHARACTERS[player.character].name, sx, sy + 22);
  }
}

function dist2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

// Make dist available
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt(dist2(a, b));
}
