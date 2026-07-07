import type { Vec2, TaskDefKey } from '../game/types';

// §2.4 Persistent Бабушка NPC (always present at bench area)
export const BABUSHKA_NPC_POS: Vec2 = { x: 920, y: 660 };

// ─── Map layout (world units 1200×900) ───────────────────────────────────────

export const MAP_W = 1200;
export const MAP_H = 900;

// Entrance arch position (alarm button; meeting teleport target)
export const ENTRANCE_POS: Vec2    = { x: 600, y: 820 };
export const ALARM_BUTTON_POS: Vec2 = { x: 600, y: 820 };

// ─── Buildings ────────────────────────────────────────────────────────────────

export interface Rect { x: number; y: number; w: number; h: number; }

export const BUILDINGS: Rect[] = [
  { x: 0,    y: 0,   w: 1200, h: 90  },  // top apartment block
  { x: 0,    y: 810, w: 1200, h: 90  },  // bottom wall (entrance gap)
  { x: 0,    y: 90,  w: 90,   h: 720 },  // left apartment
  { x: 1110, y: 90,  w: 90,   h: 720 },  // right apartment
];

// Entrance arch gap (opening at x=450–750)
export const ENTRANCE_ARCH: Rect = { x: 450, y: 810, w: 300, h: 90 };

// ─── Zones ────────────────────────────────────────────────────────────────────

export const PARKING_LOT: Rect = { x: 90, y: 90,  w: 1020, h: 380 };
export const GARDEN: Rect      = { x: 90, y: 470, w: 1020, h: 340 };

// ─── Dumpster zone (stealth / evidence disposal) ──────────────────────────────

export const DUMPSTER_POSITIONS: Vec2[] = [
  { x: 1060, y: 700 },
  { x: 140, y: 700 },
];

// ─── Cars ─────────────────────────────────────────────────────────────────────

export interface CarSpawnDef {
  id: string;
  pos: Vec2;
  color: string;
  label: string;
}

export const CAR_SPAWNS: CarSpawnDef[] = [
  { id: 'car1', pos: { x: 230, y: 200 }, color: '#E53935', label: 'А777АА' },
  { id: 'car2', pos: { x: 490, y: 200 }, color: '#1565C0', label: 'В123ВВ' },
  { id: 'car3', pos: { x: 750, y: 200 }, color: '#C0CA33', label: 'С456СС' },
  { id: 'car4', pos: { x: 980, y: 200 }, color: '#00897B', label: 'Е789ЕЕ' },
  { id: 'car5', pos: { x: 230, y: 330 }, color: '#F57F17', label: 'М001МА' },
  { id: 'car6', pos: { x: 490, y: 330 }, color: '#6A1B9A', label: 'О002ОБ' },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────

export interface TaskSpawnDef {
  id: string;
  defKey: TaskDefKey;
  pos: Vec2;
}

export const TASK_SPAWNS: TaskSpawnDef[] = [
  // Original 5
  { id: 'task_shawarma', defKey: 'shawarma', pos: { x: 145, y: 530 } },
  { id: 'task_intercom', defKey: 'intercom', pos: { x: 600, y: 790 } },
  { id: 'task_trash',    defKey: 'trash',    pos: { x: 1060, y: 700 } },
  { id: 'task_window',   defKey: 'window',   pos: { x: 200, y: 700 } },
  { id: 'task_grandma',  defKey: 'grandma',  pos: { x: 600, y: 560 } },
  // New 5
  { id: 'task_mailbox',  defKey: 'mailbox',  pos: { x: 150, y: 400 } },
  { id: 'task_pigeons',  defKey: 'pigeons',  pos: { x: 400, y: 700 } },
  { id: 'task_flowers',  defKey: 'flowers',  pos: { x: 850, y: 560 } },
  { id: 'task_kvass',    defKey: 'kvass',    pos: { x: 1050, y: 530 } },
  { id: 'task_sweep',    defKey: 'sweep',    pos: { x: 800, y: 700 } },
  // §2.5 Tasks 06, 07, 08, 10
  { id: 'task_dog_walk',     defKey: 'dog_walk',     pos: { x: 870, y: 630 } },
  { id: 'task_flower_match', defKey: 'flower_match', pos: { x: 510, y: 790 } },
  { id: 'task_drunk_calm',   defKey: 'drunk_calm',   pos: { x: 1050, y: 660 } },
  { id: 'task_taxi_order',   defKey: 'taxi_order',   pos: { x: 750, y: 390 } },
  // §2.5 Tasks 12, 14, 15, 17, 18, 20
  { id: 'task_help_bags',    defKey: 'help_bags',    pos: { x: 300, y: 560 } },
  { id: 'task_find_cat',     defKey: 'find_cat',     pos: { x: 950, y: 390 } },
  { id: 'task_fix_swing',    defKey: 'fix_swing',    pos: { x: 380, y: 640 } },
  { id: 'task_water_lawn',   defKey: 'water_lawn',   pos: { x: 680, y: 560 } },
  { id: 'task_check_meter',  defKey: 'check_meter',  pos: { x: 150, y: 290 } },
  { id: 'task_close_tap',    defKey: 'close_tap',    pos: { x: 1020, y: 390 } },
];

// ─── Sabotage positions (§2.9) ────────────────────────────────────────────────

/** Two valve positions for pipe-burst fix. Player holds E at each. */
export const VALVE_POSITIONS: Vec2[] = [
  { x: 180, y: 490 },   // left garden
  { x: 1020, y: 490 },  // right garden
];

/** Babushka Cerberus NPC spawns near entrance arch, blocking alarm button. */
export const BABUSHKA_CERBERUS_POS: Vec2 = { x: 530, y: 790 };

// ─── Decorations ──────────────────────────────────────────────────────────────

export interface DecorationDef {
  type: 'bench' | 'dumpster' | 'flowerbed' | 'tree' | 'lamppost' | 'kvass_stand';
  pos: Vec2;
}

export const DECORATIONS: DecorationDef[] = [
  { type: 'bench',      pos: { x: 400, y: 700 } },
  { type: 'bench',      pos: { x: 800, y: 700 } },
  { type: 'dumpster',   pos: { x: 1060, y: 700 } },
  { type: 'dumpster',   pos: { x: 140,  y: 700 } },
  { type: 'flowerbed',  pos: { x: 350, y: 560 } },
  { type: 'flowerbed',  pos: { x: 600, y: 560 } },
  { type: 'flowerbed',  pos: { x: 850, y: 560 } },
  { type: 'tree',       pos: { x: 200, y: 530 } },
  { type: 'tree',       pos: { x: 1000, y: 530 } },
  { type: 'tree',       pos: { x: 600, y: 470 } },
  { type: 'lamppost',   pos: { x: 300, y: 450 } },
  { type: 'lamppost',   pos: { x: 900, y: 450 } },
  { type: 'kvass_stand', pos: { x: 1050, y: 530 } },
];

// ─── Player spawns ─────────────────────────────────────────────────────────────

export const PLAYER_SPAWNS: Vec2[] = [
  { x: 300, y: 650 },
  { x: 500, y: 650 },
  { x: 700, y: 650 },
  { x: 900, y: 650 },
  { x: 300, y: 550 },
  { x: 700, y: 550 },
  { x: 500, y: 750 },
  { x: 800, y: 750 },
];

// ─── Meeting circle spawns ────────────────────────────────────────────────────

export const MEETING_SPAWNS: Vec2[] = [
  { x: 530, y: 760 }, { x: 600, y: 755 }, { x: 670, y: 760 },
  { x: 720, y: 785 }, { x: 690, y: 810 }, { x: 600, y: 815 },
  { x: 510, y: 810 }, { x: 480, y: 785 },
];

// ─── Vision buildings (entrance arch gap split into left + right segments) ────
// Use this list for vision raycasting, NOT the standard BUILDINGS array.
// The standard BUILDINGS has one solid bottom rect; here we split it at the
// arch opening (x 450–750) so rays can pass through the gate.

export const VISION_BUILDINGS: Rect[] = [
  { x: 0,    y: 0,   w: 1200, h: 90  },  // top wall
  { x: 0,    y: 90,  w: 90,   h: 720 },  // left wall
  { x: 1110, y: 90,  w: 90,   h: 720 },  // right wall
  { x: 0,    y: 810, w: 450,  h: 90  },  // bottom-left  (arch gap at 450–750)
  { x: 750,  y: 810, w: 450,  h: 90  },  // bottom-right
];

// ─── Collision helpers ────────────────────────────────────────────────────────

export function isInsideBuilding(pos: Vec2, radius = 12): boolean {
  for (const b of BUILDINGS) {
    if (b.y >= 810) {
      if (pos.x >= ENTRANCE_ARCH.x && pos.x <= ENTRANCE_ARCH.x + ENTRANCE_ARCH.w) continue;
    }
    if (
      pos.x - radius < b.x + b.w &&
      pos.x + radius > b.x &&
      pos.y - radius < b.y + b.h &&
      pos.y + radius > b.y
    ) return true;
  }
  return false;
}

export function isNearDumpster(pos: Vec2, radius = 50): boolean {
  return DUMPSTER_POSITIONS.some(d => dist(pos, d) < radius);
}

// ─── Flower-bed slow zones (§1.2 — 0.6× speed modifier) ─────────────────────
// Each flowerbed decoration is a 56×36 ellipse; use a 60×40 bounding rect.

export const FLOWERBED_RECTS: Rect[] = [
  { x: 322, y: 542, w: 60, h: 40 },  // left flowerbed
  { x: 572, y: 542, w: 60, h: 40 },  // centre flowerbed
  { x: 822, y: 542, w: 60, h: 40 },  // right flowerbed
];

export function isInFlowerBed(pos: Vec2): boolean {
  for (const r of FLOWERBED_RECTS) {
    if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) return true;
  }
  return false;
}

export function clampToMap(pos: Vec2, radius = 12): Vec2 {
  return {
    x: Math.max(radius, Math.min(MAP_W - radius, pos.x)),
    y: Math.max(radius, Math.min(MAP_H - radius, pos.y)),
  };
}

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
