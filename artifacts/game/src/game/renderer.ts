import type { GameState } from './types';
import { ALARM_RADIUS } from './types';
import { TASK_DEFS } from '../data/tasks';
import { DECORATIONS, ENTRANCE_POS } from '../data/map';
import { CHARACTERS } from '../data/characters';

// ─── Color palette ────────────────────────────────────────────────────────────

const COLORS = {
  sky:        '#87CEEB',
  grass:      '#6DB56D',
  asphalt:    '#4A4A4A',
  parking:    '#555555',
  building:   '#D0B49F',
  buildingEdge: '#B09070',
  archGray:   '#999',
  road:       '#666',
  canister:   '#F5A623',
  body:       '#B0BEC5',
  bodyOutline:'#78909C',
};

// ─── Main render ──────────────────────────────────────────────────────────────

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cw: number,
  ch: number,
): void {
  const localPlayer = state.players.find(p => p.id === state.localPlayerId);
  if (!localPlayer) return;

  // ── Camera: center on local player ──
  const camX = Math.round(localPlayer.pos.x - cw / 2);
  const camY = Math.round(localPlayer.pos.y - ch / 2);

  ctx.save();
  ctx.translate(-camX, -camY);

  // ── World layers ──
  drawBackground(ctx);
  drawParkingLot(ctx);
  drawDecorations(ctx);
  drawTasks(ctx, state);
  drawCars(ctx, state);
  drawBodies(ctx, state);
  drawCanisters(ctx, state);
  drawPlayers(ctx, state);
  drawAlarmButton(ctx, state);
  drawEntrance(ctx);
  drawUI(ctx, state, localPlayer);

  ctx.restore();
}

// ─── Background ───────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D): void {
  // Top sky strip
  ctx.fillStyle = '#C8D8E8';
  ctx.fillRect(0, 0, 1200, 90);

  // Buildings
  ctx.fillStyle = COLORS.building;
  ctx.fillRect(0, 0, 1200, 90);
  ctx.fillRect(0, 810, 1200, 90);
  ctx.fillRect(0, 90, 90, 720);
  ctx.fillRect(1110, 90, 90, 720);

  // Building edges/lines
  ctx.strokeStyle = COLORS.buildingEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 1200, 90);
  ctx.strokeRect(0, 810, 1200, 90);
  ctx.strokeRect(0, 90, 90, 720);
  ctx.strokeRect(1110, 90, 90, 720);

  // Entrance arch gap (bottom center)
  ctx.fillStyle = '#3A3A4A';
  ctx.fillRect(450, 810, 300, 90);
  ctx.fillStyle = '#555';
  ctx.fillRect(460, 815, 280, 80);

  // Grass/garden
  ctx.fillStyle = '#5AAD5A';
  ctx.fillRect(90, 470, 1020, 340);

  // Parking/asphalt
  ctx.fillStyle = COLORS.parking;
  ctx.fillRect(90, 90, 1020, 380);

  // Parking spots
  ctx.strokeStyle = '#777';
  ctx.lineWidth = 1;
  for (let x = 140; x < 1100; x += 130) {
    ctx.strokeRect(x, 100, 110, 180);
    ctx.strokeRect(x, 290, 110, 170);
  }

  // Garden path
  ctx.fillStyle = '#7A6A5A';
  ctx.fillRect(560, 470, 80, 340);

  // Windows on buildings (decorative)
  ctx.fillStyle = '#87CEEB';
  for (let bx = 50; bx < 1180; bx += 90) {
    for (let by = 10; by < 85; by += 30) {
      if (bx > 90 && bx < 1110) continue;
      ctx.fillRect(bx, by, 24, 18);
    }
  }
}

function drawParkingLot(ctx: CanvasRenderingContext2D): void {
  // Path from garden to entrance
  ctx.fillStyle = '#6A5A4A';
  ctx.fillRect(560, 780, 80, 30);
}

// ─── Decorations ─────────────────────────────────────────────────────────────

function drawDecorations(ctx: CanvasRenderingContext2D): void {
  for (const deco of DECORATIONS) {
    const { x, y } = deco.pos;
    switch (deco.type) {
      case 'bench':
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(x - 22, y - 6, 44, 12);
        ctx.fillStyle = '#A0785C';
        ctx.fillRect(x - 24, y + 4, 48, 5);
        break;
      case 'dumpster':
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(x - 16, y - 14, 32, 28);
        ctx.fillStyle = '#388E3C';
        ctx.fillRect(x - 16, y - 14, 32, 6);
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('♻', x, y + 6);
        break;
      case 'flowerbed':
        ctx.fillStyle = '#4A9430';
        ctx.beginPath();
        ctx.ellipse(x, y, 28, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF69B4';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.fillRect(x + Math.cos(a) * 12 - 4, y + Math.sin(a) * 7 - 4, 8, 8);
        }
        break;
      case 'tree':
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.arc(x, y - 10, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1B5E20';
        ctx.beginPath();
        ctx.arc(x, y - 18, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(x - 5, y + 8, 10, 18);
        break;
      case 'lamppost':
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + 30); ctx.lineTo(x, y - 30);
        ctx.stroke();
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath();
        ctx.arc(x, y - 30, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFD54F';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      case 'kvass_stand':
        ctx.fillStyle = '#E65100';
        ctx.fillRect(x - 18, y - 22, 36, 30);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('КВАС', x, y - 8);
        ctx.fillStyle = '#FFC107';
        ctx.fillRect(x - 4, y + 8, 8, 10);
        break;
    }
  }
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

function drawTasks(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const task of state.tasks) {
    if (task.isComplete) continue;
    const { x, y } = task.pos;
    const def = TASK_DEFS[task.defKey];

    // Glowing circle
    const alpha = 0.3 + 0.3 * Math.sin(Date.now() / 500);
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Emoji
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.emoji, x, y);

    // Progress ring
    if (task.progress > 0 && task.doer !== null) {
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + task.progress * Math.PI * 2);
      ctx.stroke();
    }

    // Label
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(def.label, x, y + 30);
    ctx.textBaseline = 'alphabetic';
  }
}

// ─── Cars ─────────────────────────────────────────────────────────────────────

function drawCars(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const car of state.cars) {
    const { x, y } = car.pos;
    const fuel = car.fuel;

    // Body
    ctx.fillStyle = car.color;
    ctx.fillRect(x - 35, y - 18, 70, 36);

    // Windshields
    ctx.fillStyle = 'rgba(135,206,235,0.55)';
    ctx.fillRect(x - 28, y - 14, 22, 28);
    ctx.fillRect(x + 6, y - 14, 22, 28);

    // Wheels
    ctx.fillStyle = '#222';
    [{ dx: -28, dy: -18 }, { dx: 18, dy: -18 }, { dx: -28, dy: 12 }, { dx: 18, dy: 12 }]
      .forEach(({ dx, dy }) => ctx.fillRect(x + dx - 2, y + dy - 2, 14, 8));

    // Fuel indicator above car
    const barW = 50; const barH = 5;
    const bx = x - barW / 2; const by = y - 30;
    ctx.fillStyle = '#333';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    const fuelColor = fuel > 40 ? '#4CAF50' : fuel > 20 ? '#FF9800' : '#F44336';
    ctx.fillStyle = fuelColor;
    ctx.fillRect(bx, by, (fuel / 100) * barW, barH);

    // Fuel % text
    ctx.font = '8px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(fuel)}%`, x, by - 2);

    // Siphon visual
    if (car.siphonPhase === 1) {
      // Setup phase — subtle shimmer
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(Date.now() / 200);
      ctx.strokeStyle = '#A5D6A7';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    } else if (car.siphonPhase === 2) {
      // Active drain — animated green stream
      const siphoner = state.players.find(p => p.id === car.siphoner);
      if (siphoner) {
        ctx.strokeStyle = '#00E676';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 100);
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(siphoner.pos.x, siphoner.pos.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      // Red alert ring
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 150);
      ctx.beginPath();
      ctx.arc(x, y, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Low fuel warning icon
    if (fuel < 15 && fuel > 0) {
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const pulse = Math.sin(Date.now() / 300) > 0;
      if (pulse) ctx.fillText('⚠️', x, y + 28);
      ctx.textBaseline = 'alphabetic';
    }
  }
}

// ─── Bodies ───────────────────────────────────────────────────────────────────

function drawBodies(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const body of state.bodies) {
    // Bodies remain visible after being reported (they stay as evidence)
    const { x, y } = body.pos;

    // Shadow
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Body silhouette (lying down)
    const charDef = CHARACTERS[body.character];
    ctx.fillStyle = charDef.color;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 2);
    // Torso
    ctx.fillRect(-10, -20, 20, 35);
    // Head
    ctx.beginPath();
    ctx.arc(0, -25, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // X eyes
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', x, y - 22);
    ctx.textBaseline = 'alphabetic';

    // Report prompt glow
    const pulsing = Math.sin(Date.now() / 400) > 0;
    if (pulsing) {
      ctx.strokeStyle = '#FF5722';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(x, y, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Name tag
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#FF5722';
    ctx.textAlign = 'center';
    ctx.fillText(`💀 ${body.name}`, x, y + 38);
  }
}

// ─── Canisters ────────────────────────────────────────────────────────────────

function drawCanisters(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const can of state.canisters) {
    const { x, y } = can.pos;

    // Canister shape
    ctx.fillStyle = can.isFull ? '#F5A623' : '#BDBDBD';
    ctx.fillRect(x - 10, y - 14, 20, 24);
    ctx.fillStyle = '#78909C';
    ctx.fillRect(x - 4, y - 18, 8, 6);

    // Spill droplet
    ctx.fillStyle = '#1E88E5';
    ctx.beginPath();
    ctx.arc(x + 8, y + 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing highlight
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(Date.now() / 350);
    ctx.strokeStyle = '#F5A623';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Label
    ctx.font = '8px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(can.isFull ? '🪣 полная' : '🪣 улика', x, y + 18);
  }
}

// ─── Players ─────────────────────────────────────────────────────────────────

function drawPlayers(ctx: CanvasRenderingContext2D, state: GameState): void {
  const localPlayer = state.players.find(p => p.id === state.localPlayerId);
  const isLocalSlivshchik = localPlayer?.role === 'slivshchik';

  for (const player of state.players) {
    if (!player.isAlive) continue;
    const { x, y } = player.pos;
    const charDef = CHARACTERS[player.character];

    // Suspected outline
    if (player.suspectedTimer > 0) {
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Fellow slivshchik outline (red, only visible to local slivshchik)
    if (isLocalSlivshchik && player.role === 'slivshchik' && player.id !== state.localPlayerId) {
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = charDef.color;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = player.id === state.localPlayerId ? '#FFD700' : '#fff';
    ctx.lineWidth = player.id === state.localPlayerId ? 2.5 : 1.5;
    ctx.stroke();

    // Facing direction indicator
    ctx.fillStyle = '#fff';
    const fx = x + Math.cos(player.facingAngle) * 10;
    const fy = y + Math.sin(player.facingAngle) * 10;
    ctx.beginPath();
    ctx.arc(fx, fy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Crouching indicator
    if (player.isCrouching) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#90CAF9';
      ctx.beginPath();
      ctx.ellipse(x, y, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Sprint dust trail
    if (player.isSprinting) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      const bx = x - Math.cos(player.facingAngle) * 18;
      const by = y - Math.sin(player.facingAngle) * 18;
      ctx.arc(bx, by, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Canister indicator
    if (player.isCarryingCanister) {
      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🪣', x + 16, y - 10);
      ctx.textBaseline = 'alphabetic';
    }

    // Emote bubble
    if (player.emote) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(x - 16, y - 52, 32, 26);
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.emote, x, y - 39);
      ctx.textBaseline = 'alphabetic';
    }

    // Name tag
    ctx.font = `${player.id === state.localPlayerId ? 'bold ' : ''}10px sans-serif`;
    ctx.fillStyle = player.id === state.localPlayerId ? '#FFD700' : '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(player.name, x, y + 28);

    // Ambush charge indicator
    if (player.ambushChargeTimer > 0) {
      const pct = player.ambushChargeTimer / 1.5;
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();
    }

    // §2.4 setup-phase warning: show ⚠️ above any siphoner in setup (phase 1)
    // This is visible to ALL players who can see this player
    const isInSetup = state.cars.some(c => c.siphoner === player.id && c.siphonPhase === 1);
    if (isInSetup) {
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 180);
      ctx.fillText('⚠️', x, y - 32);
      ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
    }
  }
}

// ─── Alarm button / entrance ──────────────────────────────────────────────────

function drawAlarmButton(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.meetingCooldown > 0) return;
  const { x, y } = ENTRANCE_POS;
  const t = Date.now() / 500;
  const alpha = 0.5 + 0.5 * Math.sin(t);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FF5252';
  ctx.beginPath();
  ctx.arc(x, y - 10, ALARM_RADIUS * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('🔔 Сходка', x, y + 6);
}

function drawEntrance(ctx: CanvasRenderingContext2D): void {
  // Arch frame
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(450, 810, 15, 90);
  ctx.fillRect(735, 810, 15, 90);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(450, 810, 300, 8);
}

// ─── World UI ─────────────────────────────────────────────────────────────────

function drawUI(ctx: CanvasRenderingContext2D, state: GameState, local: typeof state.players[number]): void {
  // Stamina bar near local player (only when not full or sprinting)
  const showStamina = local.isSprinting || local.stamina < 4.9;
  if (showStamina) {
    const { x, y } = local.pos;
    const barW = 36; const barH = 5;
    const bx = x - barW / 2; const by = y - 42;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    ctx.fillStyle = local.isSprinting ? '#FFF176' : '#81D4FA';
    ctx.fillRect(bx, by, (local.stamina / 5) * barW, barH);
    ctx.font = '7px sans-serif';
    ctx.fillStyle = '#FFD54F';
    ctx.textAlign = 'center';
    ctx.fillText('🏃', x, by - 2);
  }
}
