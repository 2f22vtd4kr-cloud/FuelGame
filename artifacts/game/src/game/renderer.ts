import type { GameState, Player, Vec2 } from './types';
import { ALARM_RADIUS, MAP_W, MAP_H, CROUCH_VISIBILITY_MULT, VENT_FLASH_DURATION } from './types';
import { getSprite, CAR_SPRITE_MAP, SPRITE_SHEETS, DECOR_SPRITE_META } from './sprites';
import { getTexturePattern } from './textures';
import { TASK_DEFS } from '../data/tasks';
import { DECORATIONS, ENTRANCE_POS, DUMPSTER_POSITIONS, VISION_BUILDINGS, VALVE_POSITIONS, BABUSHKA_CERBERUS_POS, BABUSHKA_NPC_POS, PLAYGROUND } from '../data/map';
import { CHARACTERS } from '../data/characters';
import {
  computeVisionPolygon,
  buildVisionObstacles,
  pointInPolygon,
  VISION_RADIUS,
  VISION_FOV_KHOZAIN,
  VISION_FOV_SLIVSHCHIK,
} from './vision';

// ─── Color palette ────────────────────────────────────────────────────────────

const COLORS = {
  sky:          '#87CEEB',
  grass:        '#6DB56D',
  asphalt:      '#4A4A4A',
  parking:      '#555555',
  building:     '#D0B49F',
  buildingEdge: '#B09070',
  archGray:     '#999',
  road:         '#666',
  canister:     '#F5A623',
  body:         '#B0BEC5',
  bodyOutline:  '#78909C',
};

// ─── §2.2 Camera smoothing state (lerp at 0.15 per frame ≈ 15% per frame @60fps)
let _camSmoothX = -1; // -1 signals "uninitialised — snap on first frame"
let _camSmoothY = -1;
const CAM_LERP = 0.15;

// ─── Directional sprite-sheet animation state ──────────────────────────────
// Purely a rendering concern: derived each frame from how far a player's
// pos actually moved, so it needs no changes to Player/network types and
// works identically for the local player, bots, and remote players.
interface SpriteAnimState {
  row: 'left' | 'right' | 'down' | 'up';
  frame: number;
  frameTimer: number;
  lastX: number;
  lastY: number;
}
const _spriteAnim = new Map<string, SpriteAnimState>();
let _lastAnimTs = -1;

/** Buckets a facingAngle (0=right, PI/2=down) into one of 4 cardinal rows. */
function angleToRow(angle: number): 'left' | 'right' | 'down' | 'up' {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  const deg = (a * 180) / Math.PI;
  if (deg >= -45 && deg < 45) return 'right';
  if (deg >= 45 && deg < 135) return 'down';
  if (deg >= -135 && deg < -45) return 'up';
  return 'left';
}

/**
 * Advances (or freezes) the walk-cycle animation for a player with a
 * directional sprite sheet. Frame-rate scales with actual on-screen
 * movement speed (px/sec) — this tracks sprint/crouch/canister/flowerbed
 * modifiers automatically and always matches how fast the character visibly
 * moves, which reads better than driving it off raw joystick deflection
 * (movement speed itself isn't proportional to joystick tilt in this game).
 * Stopping (joystick released / no movement) freezes instantly on frame 0
 * of the last active direction row.
 */
function updateSpriteAnimation(player: Player, animDt: number): { row: number; frame: number } {
  const meta = SPRITE_SHEETS[`char_${player.character}`]!;
  let st = _spriteAnim.get(player.id);
  if (!st) {
    st = { row: 'down', frame: 0, frameTimer: 0, lastX: player.pos.x, lastY: player.pos.y };
    _spriteAnim.set(player.id, st);
  }

  const dx = player.pos.x - st.lastX;
  const dy = player.pos.y - st.lastY;
  const distMoved = Math.hypot(dx, dy);
  st.lastX = player.pos.x;
  st.lastY = player.pos.y;

  const MOVE_EPSILON = 0.15; // px/frame — filters out floating-point jitter while idle
  const moving = distMoved > MOVE_EPSILON && animDt > 0;

  if (moving) {
    st.row = angleToRow(player.facingAngle);
    const speedPxPerSec = distMoved / animDt;
    // Faster movement -> shorter frame interval (walk vs. sprint cadence).
    const frameInterval = Math.max(0.06, Math.min(0.22, 0.24 - speedPxPerSec * 0.0006));
    st.frameTimer += animDt;
    if (st.frameTimer >= frameInterval) {
      st.frameTimer = 0;
      st.frame = (st.frame + 1) % meta.cols;
    }
  } else {
    st.frame = 0;
    st.frameTimer = 0;
  }

  return { row: meta.rowFor[st.row], frame: st.frame };
}

// ─── Main render ──────────────────────────────────────────────────────────────

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cw: number,
  ch: number,
): void {
  const localPlayer = state.players.find(p => p.id === state.localPlayerId);
  if (!localPlayer) return;

  // ── Sprite-sheet animation timing (independent of the render dt param,
  // since this function doesn't receive one) ──────────────────────────────
  const _animNow = performance.now();
  const animDt = _lastAnimTs === -1 ? 0 : Math.min((_animNow - _lastAnimTs) / 1000, 0.05);
  _lastAnimTs = _animNow;

  // ── §2.2 Camera: smoothly follow local player with lerp at 0.15 ─────────────
  const targetCamX = localPlayer.pos.x - cw / 2;
  const targetCamY = localPlayer.pos.y - ch / 2;

  // Snap on first render or when switching phases (lobby → play)
  if (_camSmoothX === -1 || state.phase === 'briefing') {
    _camSmoothX = targetCamX;
    _camSmoothY = targetCamY;
  } else {
    _camSmoothX += (targetCamX - _camSmoothX) * CAM_LERP;
    _camSmoothY += (targetCamY - _camSmoothY) * CAM_LERP;
  }

  const camX = Math.round(_camSmoothX);
  const camY = Math.round(_camSmoothY);

  ctx.save();
  ctx.translate(-camX, -camY);

  // ── §2.3 Vision polygon (computed once per frame) ────────────────────────────
  // Dead local player gets ghost vision (no fog) so they can watch the game.
  let visionPoly: Vec2[] | null = null;
  let crouchCheckPoly: Vec2[] | null = null; // §2.2 — narrowed cone for crouching targets
  if (localPlayer.isAlive) {
    const fovDeg = localPlayer.role === 'slivshchik'
      ? VISION_FOV_SLIVSHCHIK
      : VISION_FOV_KHOZAIN;
    const obstacles = buildVisionObstacles(VISION_BUILDINGS, state.cars, DUMPSTER_POSITIONS);
    visionPoly = computeVisionPolygon(
      localPlayer.pos,
      localPlayer.facingAngle,
      fovDeg,
      VISION_RADIUS,
      obstacles,
    );
    // §2.2 Crouch stealth: if any non-local player is crouching, also compute a
    // narrower cone (30% smaller FOV) to check their reduced visibility.
    const hasCrouchingEnemy = state.players.some(
      p => p.isAlive && p.id !== state.localPlayerId && p.isCrouching,
    );
    if (hasCrouchingEnemy) {
      crouchCheckPoly = computeVisionPolygon(
        localPlayer.pos,
        localPlayer.facingAngle,
        fovDeg * CROUCH_VISIBILITY_MULT,
        VISION_RADIUS,
        obstacles,
      );
    }
  }

  // ── World layers (drawn before fog overlay) ──────────────────────────────────
  drawBackground(ctx);
  drawParkingLot(ctx);
  drawDecorations(ctx);
  drawSabotageFlood(ctx, state);   // §2.9 flood effect under entities
  drawTasks(ctx, state);
  drawCars(ctx, state);
  drawImmunityTickets(ctx, state);
  drawBodies(ctx, state);
  drawCanisters(ctx, state);
  drawValveMarkers(ctx, state);    // §2.9 valve fix markers
  drawPlayers(ctx, state, visionPoly, crouchCheckPoly, animDt);
  drawBabushkaNPC(ctx, state);     // §2.9 babushka cerberus NPC
  drawPersistentGrandma(ctx, state); // §2.4 always-present bench grandma
  drawAlarmButton(ctx, state);
  drawEntrance(ctx);
  drawUI(ctx, state, localPlayer);

  // ── §2.3 Fog-of-war overlay (on top of world, under camera restore) ──────────
  // Uses the evenodd fill rule: outer rect filled dark, vision polygon cuts a
  // transparent hole. Entities drawn outside the hole are hidden by the fog.
  if (visionPoly) drawFogOfWar(ctx, visionPoly);

  // ── Post-fog pass: slivshchik teammate outlines pierce fog (§3.1.2) ──────────
  // Must be drawn AFTER the fog so it is always visible to local slivshchik
  // regardless of walls or darkness. Same design intent as Among Us impostor glow.
  drawTeammateOutlines(ctx, state);
  drawJanitorCanisterHighlight(ctx, state); // §3.1.3 janitor sees canisters through fog

  ctx.restore();
}

// ─── §2.3 Fog-of-war overlay ─────────────────────────────────────────────────

function drawFogOfWar(ctx: CanvasRenderingContext2D, poly: Vec2[]): void {
  if (poly.length < 3) return;

  ctx.save();

  // Soft gradient ring at the vision boundary (gives a slight glow at the edge)
  // The flat fog fill below covers everywhere beyond the gradient.
  ctx.fillStyle = 'rgba(0, 0, 10, 0.88)';
  ctx.beginPath();
  // Outer frame — entire map plus bleed
  ctx.rect(-120, -120, MAP_W + 240, MAP_H + 240);
  // Inner cutout — the visible polygon (evenodd punches a hole)
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fill('evenodd');

  // Soft inner vignette ring around the vision polygon edge (aesthetic)
  // Replicated as a second semi-transparent path with a slightly larger fog area
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = 'rgba(0, 0, 10, 1)';
  ctx.beginPath();
  ctx.rect(-120, -120, MAP_W + 240, MAP_H + 240);
  // Vision polygon shrunk by 18 px so the vignette bleeds inward slightly
  const cx = poly[0].x;
  const cy = poly[0].y;
  ctx.moveTo(cx, cy);
  for (let i = 1; i < poly.length; i++) {
    const nx = cx + (poly[i].x - cx) * 0.96;
    const ny = cy + (poly[i].y - cy) * 0.96;
    ctx.lineTo(nx, ny);
  }
  ctx.closePath();
  ctx.fill('evenodd');
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ─── Post-fog: teammate outlines (pierce the fog for local slivshchik) ────────
// This pass runs AFTER drawFogOfWar so outlines are always on top of the fog.

function drawTeammateOutlines(ctx: CanvasRenderingContext2D, state: GameState): void {
  const localPlayer = state.players.find(p => p.id === state.localPlayerId);
  if (!localPlayer || localPlayer.role !== 'slivshchik') return;

  for (const player of state.players) {
    if (!player.isAlive) continue;
    if (player.id === state.localPlayerId) continue;
    if (player.role !== 'slivshchik') continue;

    const { x, y } = player.pos;
    ctx.strokeStyle = '#FF1744';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Small "S" label so it's unambiguous even at distance
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#FF1744';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.9;
    ctx.fillText('СЛ', x, y - 30);
    ctx.globalAlpha = 1;
  }
}

// ─── §2.4 Persistent Бабушка NPC at bench ────────────────────────────────────

function drawPersistentGrandma(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.phase !== 'play') return;
  const { x, y } = BABUSHKA_NPC_POS;

  // Bench slats
  ctx.fillStyle = '#6D4C41';
  ctx.fillRect(x - 24, y + 8, 48, 7);
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(x - 22, y + 4, 6, 11);
  ctx.fillRect(x + 16, y + 4, 6, 11);

  // NPC circle
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#7B1FA2';
  ctx.fill();
  ctx.strokeStyle = '#CE93D8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Emoji
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('👵', x, y + 1);
  ctx.textBaseline = 'alphabetic';

  // Hover label
  ctx.font = '8px sans-serif';
  ctx.fillStyle = '#E1BEE7';
  ctx.textAlign = 'center';
  ctx.fillText('[E] Спросить', x, y - 17);
}

// ─── §3.1.3 Post-fog janitor canister X-ray ──────────────────────────────────

function drawJanitorCanisterHighlight(ctx: CanvasRenderingContext2D, state: GameState): void {
  const local = state.players.find(p => p.id === state.localPlayerId);
  if (!local || local.neutralRole !== 'janitor') return;
  if (state.canisters.length === 0) return;

  const t = Date.now();
  for (const can of state.canisters) {
    const { x, y } = can.pos;

    ctx.save();
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t / 280);

    // Outer glow
    const grad = ctx.createRadialGradient(x, y, 0, x, y, 24);
    grad.addColorStop(0, 'rgba(255,152,0,0.65)');
    grad.addColorStop(1, 'rgba(255,152,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();

    // Core circle
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6D00';
    ctx.fill();
    ctx.strokeStyle = '#FFD740';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Icon
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🪣', x, y + 1);
    ctx.textBaseline = 'alphabetic';

    ctx.restore();
  }
}

// ─── §2.9 Sabotage visual effects ────────────────────────────────────────────

/** Pipe burst: animated blue flood overlay on the parking/garden area */
function drawSabotageFlood(ctx: CanvasRenderingContext2D, state: GameState): void {
  const flood = state.activeSabotages.find(s => s.key === 'pipe_burst' && !s.isResolved);
  if (!flood) return;

  const urgency = flood.timer / 60; // 1 = fresh, 0 = critical
  const alpha = 0.18 + (1 - urgency) * 0.22; // gets more opaque as timer runs out
  const wave = Math.sin(Date.now() / 400) * 0.05;

  ctx.save();
  ctx.globalAlpha = alpha + wave;
  ctx.fillStyle = '#1565C0';
  ctx.fillRect(90, 90, 1020, 380 + 340); // cover parking + garden
  ctx.globalAlpha = 1;
  ctx.restore();

  // Ripple lines
  ctx.save();
  ctx.strokeStyle = 'rgba(100,181,246,0.35)';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  const t = Date.now() / 800;
  for (let row = 0; row < 4; row++) {
    ctx.beginPath();
    for (let x = 90; x < 1110; x += 10) {
      const y = 200 + row * 150 + Math.sin((x / 60) + t + row) * 8;
      if (x === 90) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Warning text in center
  ctx.save();
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = urgency < 0.3 ? '#F44336' : '#FF9800';
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.85;
  ctx.fillText(`💧 ПОТОП — ${Math.ceil(flood.timer)}с`, MAP_W / 2, 470);
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Pipe burst: valve markers with fix progress rings */
function drawValveMarkers(ctx: CanvasRenderingContext2D, state: GameState): void {
  const flood = state.activeSabotages.find(s => s.key === 'pipe_burst' && !s.isResolved);
  if (!flood) return;

  const valveProgress = [flood.valve1Progress, flood.valve2Progress];

  VALVE_POSITIONS.forEach((pos, i) => {
    const prog = valveProgress[i] / 3; // 3 = VALVE_FIX_TIME
    const isDone = prog >= 1;

    ctx.save();

    // Glow
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = isDone ? '#4CAF50' : '#2196F3';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Progress arc
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = isDone ? '#4CAF50' : '#2196F3';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 18, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
    ctx.stroke();

    // Icon
    ctx.globalAlpha = 1;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(isDone ? '✓' : '🔧', pos.x, pos.y + 5);

    // Label
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#90CAF9';
    ctx.fillText(`Вентиль ${i + 1}`, pos.x, pos.y + 26);

    ctx.restore();
  });
}

/** Babushka Cerberus: draws a little grandma NPC near the entrance */
function drawBabushkaNPC(ctx: CanvasRenderingContext2D, state: GameState): void {
  const active = state.activeSabotages.find(s => s.key === 'babushka_cerberus' && !s.isResolved);
  if (!active) return;

  const { x, y } = BABUSHKA_CERBERUS_POS;
  const bob = Math.sin(Date.now() / 500) * 2;

  ctx.save();

  // Shadow
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body (shawl)
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#6A1B9A';
  ctx.beginPath();
  ctx.ellipse(x, y + 4 + bob, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#FFCC80';
  ctx.beginPath();
  ctx.arc(x, y - 14 + bob, 10, 0, Math.PI * 2);
  ctx.fill();

  // Headscarf
  ctx.fillStyle = '#7B1FA2';
  ctx.beginPath();
  ctx.arc(x, y - 14 + bob, 10, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 10, y - 16 + bob, 20, 4);

  // Cane
  ctx.strokeStyle = '#8D6E63';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 10, y - 2 + bob);
  ctx.lineTo(x + 14, y + 14 + bob);
  ctx.stroke();

  // Label
  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = '#CE93D8';
  ctx.textAlign = 'center';
  ctx.fillText('👵 Цербер', x, y - 30 + bob);

  // Timer bubble
  ctx.fillStyle = 'rgba(106,27,154,0.8)';
  ctx.beginPath();
  ctx.roundRect(x - 16, y - 45 + bob, 32, 14, 4);
  ctx.fill();
  ctx.font = '8px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${Math.ceil(active.timer)}с`, x, y - 35 + bob);

  ctx.restore();
}

// ─── Background ───────────────────────────────────────────────────────────────

/** Fills a rect with a texture pattern, falling back to a flat color if the texture isn't loaded yet. */
function fillTexturedRect(
  ctx: CanvasRenderingContext2D,
  key: Parameters<typeof getTexturePattern>[1],
  fallbackColor: string,
  x: number, y: number, w: number, h: number,
): void {
  const pattern = getTexturePattern(ctx, key);
  ctx.fillStyle = pattern ?? fallbackColor;
  ctx.fillRect(x, y, w, h);
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  // Top sky strip
  ctx.fillStyle = '#C8D8E8';
  ctx.fillRect(0, 0, 1200, 90);

  // Buildings — courtyard apartment rooftop texture
  fillTexturedRect(ctx, 'roof', COLORS.building, 0, 0, 1200, 90);
  fillTexturedRect(ctx, 'roof', COLORS.building, 0, 810, 1200, 90);
  fillTexturedRect(ctx, 'roof', COLORS.building, 0, 90, 90, 720);
  fillTexturedRect(ctx, 'roof', COLORS.building, 1110, 90, 90, 720);

  // Building edges/lines
  ctx.strokeStyle = COLORS.buildingEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 1200, 90);
  ctx.strokeRect(0, 810, 1200, 90);
  ctx.strokeRect(0, 90, 90, 720);
  ctx.strokeRect(1110, 90, 90, 720);

  // Entrance arch gap (bottom centre)
  ctx.fillStyle = '#3A3A4A';
  ctx.fillRect(450, 810, 300, 90);
  ctx.fillStyle = '#555';
  ctx.fillRect(460, 815, 280, 80);

  // Grass/garden
  fillTexturedRect(ctx, 'grass', '#5AAD5A', 90, 470, 1020, 340);

  // Parking/asphalt
  fillTexturedRect(ctx, 'asphalt', COLORS.parking, 90, 90, 1020, 380);

  // Parking spots
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  for (let x = 140; x < 1100; x += 130) {
    ctx.strokeRect(x, 100, 110, 180);
    ctx.strokeRect(x, 290, 110, 170);
  }

  // Garden path
  fillTexturedRect(ctx, 'path', '#7A6A5A', 560, 470, 80, 340);
}

function drawParkingLot(ctx: CanvasRenderingContext2D): void {
  // Path from garden to entrance
  fillTexturedRect(ctx, 'path', '#6A5A4A', 560, 780, 80, 30);

  // §01.2 Playground zone — mustard rubber-flooring sub-area with faded label
  const pattern = getTexturePattern(ctx, 'playground');
  ctx.fillStyle = pattern ?? '#C8A96E';
  ctx.fillRect(PLAYGROUND.x, PLAYGROUND.y, PLAYGROUND.w, PLAYGROUND.h);
  // Dashed border
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(PLAYGROUND.x, PLAYGROUND.y, PLAYGROUND.w, PLAYGROUND.h);
  ctx.setLineDash([]);
  // Zone label
  ctx.fillStyle = '#6B4F10';
  ctx.globalAlpha = 0.6;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🛝 Детская', PLAYGROUND.x + PLAYGROUND.w / 2, PLAYGROUND.y + PLAYGROUND.h / 2);
  ctx.globalAlpha = 1;
}

// ─── Decorations ─────────────────────────────────────────────────────────────

function drawDecorations(ctx: CanvasRenderingContext2D): void {
  for (const deco of DECORATIONS) {
    const { x, y } = deco.pos;
    const spriteKey = `decor_${deco.type}`;
    const sprite = getSprite(spriteKey);
    const meta = DECOR_SPRITE_META[spriteKey];
    if (sprite && meta) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, x - meta.w / 2, y + meta.offsetY - meta.h / 2, meta.w, meta.h);
      continue;
    }
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
      case 'ev_charger': {
        // §01.2 Broken EV Charger — weathered station with cracked screen + broken cable
        // Post
        ctx.fillStyle = '#546E7A';
        ctx.fillRect(x - 7, y - 36, 14, 48);
        // Screen (cracked, off)
        ctx.fillStyle = '#1A237E';
        ctx.fillRect(x - 12, y - 50, 24, 20);
        ctx.strokeStyle = '#FF1744';
        ctx.lineWidth = 1.5;
        // Crack lines on screen
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 48); ctx.lineTo(x + 3, y - 34);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 2, y - 46); ctx.lineTo(x - 2, y - 38);
        ctx.stroke();
        // Broken cable hanging
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 5, y);
        ctx.bezierCurveTo(x + 18, y + 8, x + 14, y + 18, x + 10, y + 22);
        ctx.stroke();
        // Lightning bolt icon (EV)
        ctx.fillStyle = '#FFD600';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', x, y - 36);
        // "BROKEN" indicator dot
        ctx.fillStyle = '#FF1744';
        ctx.beginPath();
        ctx.arc(x + 10, y - 46, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
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

    // §7.3 Car sprite (generated PNG) or primitive-rect fallback
    const carSpriteKey = CAR_SPRITE_MAP[car.id];
    const carSprite = carSpriteKey ? getSprite(carSpriteKey) : null;
    if (carSprite) {
      // Drawn horizontally (all cars face right in the parking lot).
      ctx.drawImage(carSprite, x - 42, y - 24, 84, 48);
    } else {
      // Fallback primitive rendering
      ctx.fillStyle = car.color;
      ctx.fillRect(x - 35, y - 18, 70, 36);
      ctx.fillStyle = 'rgba(135,206,235,0.55)';
      ctx.fillRect(x - 28, y - 14, 22, 28);
      ctx.fillRect(x + 6, y - 14, 22, 28);
      ctx.fillStyle = '#222';
      [{ dx: -28, dy: -18 }, { dx: 18, dy: -18 }, { dx: -28, dy: 12 }, { dx: 18, dy: 12 }]
        .forEach(({ dx, dy }) => ctx.fillRect(x + dx - 2, y + dy - 2, 14, 8));
    }

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
      // Active drain — animated green stream (visible even if siphoner is in fog;
      // the stream going into darkness is an intentional tension cue)
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

    // §10.2 Immunity shield — golden rotating ring
    if (car.hasImmunity) {
      const t = Date.now() / 700;
      ctx.save();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8 + 0.2 * Math.sin(Date.now() / 250);
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = t * 20;
      ctx.beginPath();
      ctx.arc(x, y, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // Shield icon + timer
      ctx.font = '11px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛡️', x, y - 46);
      ctx.font = 'bold 8px sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${Math.ceil(car.immunityTimer)}с`, x, y - 52);
      ctx.restore();
    }
  }
}

// ─── Immunity Tickets (§10.2) ────────────────────────────────────────────────

function drawImmunityTickets(ctx: CanvasRenderingContext2D, state: GameState): void {
  const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 400);
  for (const ticket of state.immunityTickets) {
    const { x, y } = ticket.pos;
    // Golden glow
    ctx.globalAlpha = pulse * 0.45;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Ticket icon background
    ctx.fillStyle = '#FFC107';
    ctx.beginPath();
    ctx.roundRect(x - 14, y - 10, 28, 20, 4);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Ticket emoji
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎟️', x, y);
    ctx.textBaseline = 'alphabetic';

    // Label
    ctx.font = 'bold 8px sans-serif';
    ctx.fillStyle = '#FFF9C4';
    ctx.textAlign = 'center';
    ctx.fillText('ТАЛОН', x, y + 20);
  }
}

// ─── Bodies ───────────────────────────────────────────────────────────────────

function drawBodies(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const body of state.bodies) {
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
    ctx.fillRect(-10, -20, 20, 35);
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

// ─── §7.3 Character-specific top-down silhouettes ────────────────────────────
// Each character has a defined visual identity readable at 64×64px from top-down.
// We draw these AFTER the base circle so details sit on top of the body color.

function drawCharacterDetails(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  character: string,
  r: number,
): void {
  ctx.save();
  switch (character) {
    case 'denis': {
      // Yellow Yandex cap (arc on top half)
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.8, Math.PI, 0);
      ctx.fill();
      // Cap brim line
      ctx.strokeStyle = '#FFA000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.8, y);
      ctx.lineTo(x + r * 0.8, y);
      ctx.stroke();
      // Phone glint (dark rect offset to side)
      ctx.fillStyle = '#111';
      ctx.fillRect(x + r * 0.45, y + 1, 4, 6);
      ctx.fillStyle = '#4FC3F7';
      ctx.fillRect(x + r * 0.46, y + 2, 2.5, 4);
      break;
    }
    case 'anya': {
      // AirPods — two tiny white dots on the sides
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x - r * 0.75, y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + r * 0.75, y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Ponytail (small arc at back)
      ctx.fillStyle = '#CE93D8';
      ctx.beginPath();
      ctx.arc(x, y + r * 0.6, 4, 0, Math.PI);
      ctx.fill();
      break;
    }
    case 'vova': {
      // Gold chain across chest
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + 2, r * 0.45, -0.4, Math.PI + 0.4);
      ctx.stroke();
      // Sunglasses strip
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.roundRect(x - r * 0.6, y - r * 0.35, r * 1.2, 3, 1);
      ctx.fill();
      // Gold lens glint
      ctx.fillStyle = 'rgba(255,215,0,0.5)';
      ctx.fillRect(x - r * 0.55, y - r * 0.33, 4, 2);
      ctx.fillRect(x + r * 0.15, y - r * 0.33, 4, 2);
      break;
    }
    case 'uncle_seryozha': {
      // Gray mustache
      ctx.fillStyle = '#9E9E9E';
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.15, r * 0.45, r * 0.22, 0, 0, Math.PI);
      ctx.fill();
      // Reading glasses on forehead (two tiny rings)
      ctx.strokeStyle = '#BDBDBD';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.55, r * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + r * 0.3, y - r * 0.55, r * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      // Bridge between glasses
      ctx.beginPath();
      ctx.moveTo(x - r * 0.1, y - r * 0.55);
      ctx.lineTo(x + r * 0.1, y - r * 0.55);
      ctx.stroke();
      break;
    }
    case 'petrovich': {
      // Wrench (silver, rotated 45°)
      ctx.fillStyle = '#B0BEC5';
      ctx.save();
      ctx.translate(x + r * 0.55, y - r * 0.55);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-2, -r * 0.45, 4, r * 0.9);
      // Wrench head (open end)
      ctx.fillRect(-4, -r * 0.45, 8, 4);
      ctx.restore();
      // Oil stain on body
      ctx.fillStyle = 'rgba(60,40,20,0.55)';
      ctx.beginPath();
      ctx.ellipse(x - 2, y + 3, 4, 2.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'marina': {
      // Ring light aura (dashed pink circle slightly outside body)
      ctx.strokeStyle = '#FF80AB';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Selfie stick (thin line from body upward-right)
      ctx.strokeStyle = '#EEEEEE';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + r * 0.5, y + r * 0.5);
      ctx.lineTo(x + r + 4, y - r - 4);
      ctx.stroke();
      // Phone at tip
      ctx.fillStyle = '#111';
      ctx.fillRect(x + r + 2, y - r - 7, 5, 7);
      break;
    }
    case 'akhmet': {
      // Broom handle (diagonal line)
      ctx.strokeStyle = '#8D6E63';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6, y + r * 0.6);
      ctx.lineTo(x + r * 0.6, y - r * 0.6);
      ctx.stroke();
      // Broom bristles at top-right end
      ctx.fillStyle = '#DEB887';
      ctx.save();
      ctx.translate(x + r * 0.6, y - r * 0.6);
      ctx.rotate(-Math.PI / 4);
      ctx.fillRect(-5, -2, 10, 4);
      ctx.restore();
      break;
    }
    case 'oleg': {
      // Earpiece wire on right side
      ctx.strokeStyle = '#ECEFF1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + r * 0.7, y - r * 0.3);
      ctx.lineTo(x + r * 0.9, y - r * 0.6);
      ctx.stroke();
      ctx.fillStyle = '#F5F5F5';
      ctx.beginPath();
      ctx.arc(x + r * 0.9, y - r * 0.6, 2, 0, Math.PI * 2);
      ctx.fill();
      // Dark sunglasses visor strip
      ctx.fillStyle = 'rgba(10,10,20,0.7)';
      ctx.beginPath();
      ctx.roundRect(x - r * 0.55, y - r * 0.3, r * 1.1, 4, 2);
      ctx.fill();
      break;
    }
    case 'lena': {
      // Bicycle helmet arc (top half)
      ctx.fillStyle = '#81C784';
      ctx.beginPath();
      ctx.arc(x, y - r * 0.15, r * 0.75, Math.PI, 0);
      ctx.fill();
      // Helmet strap lines
      ctx.strokeStyle = '#388E3C';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6, y - r * 0.05);
      ctx.lineTo(x - r * 0.4, y + r * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + r * 0.6, y - r * 0.05);
      ctx.lineTo(x + r * 0.4, y + r * 0.35);
      ctx.stroke();
      // Green tote bag to the side
      ctx.fillStyle = '#4CAF50';
      ctx.strokeStyle = '#2E7D32';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + r * 0.6, y - r * 0.1, 7, 10, 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'barsik': {
      // Cat ears (two small triangles on top)
      ctx.fillStyle = '#FF7043';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.4, y - r * 0.55);
      ctx.lineTo(x - r * 0.7, y - r * 1.05);
      ctx.lineTo(x - r * 0.05, y - r * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + r * 0.4, y - r * 0.55);
      ctx.lineTo(x + r * 0.7, y - r * 1.05);
      ctx.lineTo(x + r * 0.05, y - r * 0.75);
      ctx.closePath();
      ctx.fill();
      // Inner ear pink
      ctx.fillStyle = '#FFCCBC';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.38, y - r * 0.6);
      ctx.lineTo(x - r * 0.6, y - r * 0.95);
      ctx.lineTo(x - r * 0.1, y - r * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + r * 0.38, y - r * 0.6);
      ctx.lineTo(x + r * 0.6, y - r * 0.95);
      ctx.lineTo(x + r * 0.1, y - r * 0.75);
      ctx.closePath();
      ctx.fill();
      // Tail (curved line to the right)
      ctx.strokeStyle = '#FF7043';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + r * 0.7, y + r * 0.3);
      ctx.quadraticCurveTo(x + r * 1.5, y + r * 0.1, x + r * 1.2, y - r * 0.5);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// ─── Players ─────────────────────────────────────────────────────────────────
// §2.3: visionPoly is null when local player is dead (ghost vision = see all).
// The fog overlay drawn after this function naturally hides players outside the
// visible polygon. We only need explicit visibility checks for HUD annotations
// that would reveal tactical info (the ⚠️ siphon-setup warning).

function drawPlayers(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  visionPoly: Vec2[] | null,
  crouchCheckPoly: Vec2[] | null = null,
  animDt = 0,
): void {
  const localPlayer = state.players.find(p => p.id === state.localPlayerId);
  const isLocalSlivshchik = localPlayer?.role === 'slivshchik';

  // Prune sprite-animation state for players no longer in this match (bots
  // recreated each match, players who left, etc.) so `_spriteAnim` never
  // grows unbounded across a long multiplayer session.
  if (_spriteAnim.size > 0) {
    const currentIds = new Set(state.players.map(p => p.id));
    for (const id of _spriteAnim.keys()) {
      if (!currentIds.has(id)) _spriteAnim.delete(id);
    }
  }

  for (const player of state.players) {
    if (!player.isAlive) continue;
    const { x, y } = player.pos;
    const charDef = CHARACTERS[player.character];
    const isLocal = player.id === state.localPlayerId;

    // §2.3 — check visibility for HUD annotation gating (not for rendering,
    // which is handled by the fog overlay drawn afterwards).
    // §2.2 — crouching players require the narrower 70%-FOV cone to be "seen"
    // (outer 30% of the player's cone doesn't reveal crouching targets).
    const inFullCone = visionPoly === null || pointInPolygon(x, y, visionPoly);
    const inCrouchCone = !player.isCrouching || crouchCheckPoly === null || pointInPolygon(x, y, crouchCheckPoly);
    const playerVisible = isLocal || (inFullCone && inCrouchCone);

    // §2.2 Crouch stealth — fade players visible only in outer cone ring
    const crouchFadeAlpha = (!isLocal && player.isCrouching && inFullCone && !inCrouchCone) ? 0.35 : 1;
    ctx.globalAlpha = crouchFadeAlpha;

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

    // Note: fellow-slivshchik teammate outline is drawn in drawTeammateOutlines()
    // AFTER the fog overlay so it pierces the fog (§3.1.2 team awareness).

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // §3.1.3 Барсик character is slightly smaller
    const playerRadius = player.character === 'barsik' ? 10 : 14;

    // §7.3 Character sprite (generated PNG) or primitive-circle fallback
    const charSprite = getSprite(`char_${player.character}`);
    const sheetMeta = SPRITE_SHEETS[`char_${player.character}`];
    if (charSprite && sheetMeta) {
      // Directional walk-cycle sheet: slice the current (row, frame) instead
      // of rotating a single whole-body image.
      const { row, frame } = updateSpriteAnimation(player, animDt);
      const spriteSize = player.character === 'barsik' ? 24 : 42;
      ctx.save();
      ctx.imageSmoothingEnabled = false; // crisp pixel art — no blur/anti-aliasing
      ctx.drawImage(
        charSprite,
        frame * sheetMeta.frameW, row * sheetMeta.frameH, sheetMeta.frameW, sheetMeta.frameH,
        x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize,
      );
      ctx.restore();
    } else if (charSprite) {
      const spriteSize = player.character === 'barsik' ? 24 : 42;
      ctx.save();
      ctx.translate(x, y);
      // Rotate sprite so the character's "front" matches their facing direction.
      // Sprites are authored facing "up" (north = -PI/2 in canvas).
      // Game angle 0 = east (right). To map north→east we add PI/2.
      // General formula: rotate by facingAngle + PI/2.
      ctx.rotate(player.facingAngle + Math.PI / 2);
      ctx.drawImage(charSprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      ctx.restore();
    } else {
      // Fallback primitive rendering
      ctx.fillStyle = charDef.color;
      ctx.beginPath();
      ctx.arc(x, y, playerRadius, 0, Math.PI * 2);
      ctx.fill();
      drawCharacterDetails(ctx, x, y, player.character, playerRadius);
    }

    // Identification ring — gold for local player, translucent white for others.
    // Drawn over sprite so it's always visible.
    ctx.strokeStyle = isLocal ? '#FFD700' : 'rgba(255,255,255,0.75)';
    ctx.lineWidth = isLocal ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(x, y, playerRadius + (charSprite ? 4 : 0), 0, Math.PI * 2);
    ctx.stroke();

    // Facing direction indicator
    ctx.fillStyle = '#fff';
    const facingDist = player.character === 'barsik' ? 7 : 10;
    const fx = x + Math.cos(player.facingAngle) * facingDist;
    const fy = y + Math.sin(player.facingAngle) * facingDist;
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

    // §3.1.2 Vent teleport flash — brief expanding green ring
    if (player.ventFlashTimer > 0) {
      const progress = 1 - player.ventFlashTimer / VENT_FLASH_DURATION; // 0→1 over flash duration
      const radius = 14 + progress * 28;
      const alpha = 0.85 * (1 - progress);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#00E676';
      ctx.lineWidth = 3 + (1 - progress) * 4;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      // Inner white flash (brightest at start)
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x, y, 14 * (1 - progress * 0.7), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
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
    ctx.font = `${isLocal ? 'bold ' : ''}10px sans-serif`;
    ctx.fillStyle = isLocal ? '#FFD700' : '#fff';
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

    // §2.3 / §2.4 — ⚠️ siphon-setup warning only shown if the siphoner is
    // visible to the local player (otherwise it would reveal hidden activity).
    // Full siphon stream (phase 2) is visible from the car even through fog,
    // which is intentional — you see "something happening" at the car.
    if (playerVisible) {
      const isInSetup = state.cars.some(c => c.siphoner === player.id && c.siphonPhase === 1);
      if (isInSetup) {
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 180);
        ctx.fillText('⚠️', x, y - 32);
        ctx.textBaseline = 'alphabetic';
      }
    }
    // Always reset alpha at end of player draw pass
    ctx.globalAlpha = 1;
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

function drawUI(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  local: typeof state.players[number],
): void {
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
