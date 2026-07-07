import type { Vec2, TaskDefKey } from '../game/types';

// ─── Map layout (world units 1200x900) ───────────────────────────────────────

export const MAP_W = 1200;
export const MAP_H = 900;

// Entrance arch position (alarm button here; meeting teleport target)
export const ENTRANCE_POS: Vec2 = { x: 600, y: 820 };
export const ALARM_BUTTON_POS: Vec2 = { x: 600, y: 820 };

// ─── Buildings (rectangles for collision + rendering) ─────────────────────────

export interface Rect { x: number; y: number; w: number; h: number; }

export const BUILDINGS: Rect[] = [
  { x: 0,    y: 0,   w: 1200, h: 90  },  // top apartment block
  { x: 0,    y: 810, w: 1200, h: 90  },  // bottom wall (entrance in middle gap)
  { x: 0,    y: 90,  w: 90,   h: 720 },  // left apartment
  { x: 1110, y: 90,  w: 90,   h: 720 },  // right apartment
];

// Entrance arch gap in the bottom wall (opening at x=450–750)
export const ENTRANCE_ARCH: Rect = { x: 450, y: 810, w: 300, h: 90 };

// ─── Parking lot (asphalt area) ───────────────────────────────────────────────

export const PARKING_LOT: Rect = { x: 90, y: 90, w: 1020, h: 380 };
export const GARDEN: Rect     = { x: 90, y: 470, w: 1020, h: 340 };

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
  { id: 'car5', pos: { x: 230, y: 340 }, color: '#F57F17', label: 'М001МА' },
  { id: 'car6', pos: { x: 490, y: 340 }, color: '#6A1B9A', label: 'О002ОБ' },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────

export interface TaskSpawnDef {
  id: string;
  defKey: TaskDefKey;
  pos: Vec2;
}

export const TASK_SPAWNS: TaskSpawnDef[] = [
  { id: 'task_shawarma', defKey: 'shawarma', pos: { x: 145, y: 530 } },
  { id: 'task_intercom', defKey: 'intercom', pos: { x: 600, y: 790 } },
  { id: 'task_trash',    defKey: 'trash',    pos: { x: 1060, y: 700 } },
  { id: 'task_window',   defKey: 'window',   pos: { x: 200, y: 700 } },
  { id: 'task_grandma',  defKey: 'grandma',  pos: { x: 600, y: 560 } },
];

// ─── Decorations (drawn for atmosphere, no collision) ─────────────────────────

export interface DecorationDef {
  type: 'bench' | 'dumpster' | 'flowerbed' | 'tree' | 'lamppost';
  pos: Vec2;
}

export const DECORATIONS: DecorationDef[] = [
  { type: 'bench',     pos: { x: 400, y: 700 } },
  { type: 'bench',     pos: { x: 800, y: 700 } },
  { type: 'dumpster',  pos: { x: 1060, y: 700 } },
  { type: 'flowerbed', pos: { x: 350, y: 560 } },
  { type: 'flowerbed', pos: { x: 600, y: 560 } },
  { type: 'flowerbed', pos: { x: 850, y: 560 } },
  { type: 'tree',      pos: { x: 200, y: 530 } },
  { type: 'tree',      pos: { x: 1000, y: 530 } },
  { type: 'lamppost',  pos: { x: 300, y: 450 } },
  { type: 'lamppost',  pos: { x: 900, y: 450 } },
];

// ─── Player spawn positions ───────────────────────────────────────────────────

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

// ─── Collision helpers ────────────────────────────────────────────────────────

export function isInsideBuilding(pos: Vec2, radius = 12): boolean {
  for (const b of BUILDINGS) {
    // Skip the entrance gap
    if (b.y >= 810) {
      // Check if we're in the opening
      if (pos.x >= ENTRANCE_ARCH.x && pos.x <= ENTRANCE_ARCH.x + ENTRANCE_ARCH.w) {
        continue; // it's the door, allowed
      }
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
