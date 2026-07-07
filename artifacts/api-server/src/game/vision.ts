/**
 * §2.3 Vision System — Raycasting Fog-of-War
 *
 * Computes a visibility polygon by casting rays from the player outward across
 * their FOV arc. Obstacles (buildings, cars, dumpsters) block vision and cast
 * hard shadows. The polygon is used by the renderer to draw a fog-of-war
 * overlay hiding all entities and terrain outside the player's sight.
 *
 * Doc spec (§2.3):
 *   - Vision radius: 12 m (~420 px in our 1 200×900 world)
 *   - Хозяин cone: 140° | Сливщик cone: 160° ("darkness in their hearts")
 *   - 36 rays, 5° apart — we use 72 (2.5° apart) for smoother edges
 *   - Extra corner rays (angle ± ε) for sharp shadow boundaries
 *   - Obstacles: buildings (walls), cars (70×36 px), dumpsters (32×28 px)
 *   - Dead local player → no fog (ghost vision, watch the game)
 */

import type { Vec2 } from './types';
import type { Rect } from '../data/map';

// ─── Vision constants ─────────────────────────────────────────────────────────

export const VISION_RADIUS           = 420;  // px  (~12 m)
export const VISION_FOV_KHOZAIN      = 140;  // degrees
export const VISION_FOV_SLIVSHCHIK   = 160;  // degrees ("darkness in their hearts")
export const VISION_RAY_COUNT        = 72;   // uniform rays across the FOV arc

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Normalise angle to [−π, π]. */
function norm(a: number): number {
  while (a >  Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Is `angle` within the arc centred at `facing` with half-width `half`? */
function inArc(angle: number, facing: number, half: number): boolean {
  return Math.abs(norm(angle - facing)) <= half;
}

/**
 * Ray-AABB intersection using the slab method.
 * Returns the entry distance along the ray, or −1 if the ray misses.
 */
function rayRectEntry(
  ox: number, oy: number,
  dx: number, dy: number,
  r: Rect,
): number {
  const ix = dx === 0 ? 1e10 : 1 / dx;
  const iy = dy === 0 ? 1e10 : 1 / dy;

  const tx1 = (r.x        - ox) * ix;
  const tx2 = (r.x + r.w  - ox) * ix;
  const ty1 = (r.y        - oy) * iy;
  const ty2 = (r.y + r.h  - oy) * iy;

  const tMin = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2));
  const tMax = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));

  if (tMax < 1e-4 || tMin > tMax) return -1;   // miss
  const t = tMin < 1e-4 ? tMax : tMin;          // if origin inside rect, use exit
  return t;
}

/** All four corners of an AABB. */
function corners(r: Rect): Vec2[] {
  return [
    { x: r.x,       y: r.y       },
    { x: r.x + r.w, y: r.y       },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x,       y: r.y + r.h },
  ];
}

/**
 * Cast one ray from `(ox, oy)` at `angle`.
 * Returns the distance to the closest obstacle, capped at `maxDist`.
 */
function castRay(
  ox: number, oy: number,
  angle: number,
  maxDist: number,
  obstacles: Rect[],
): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let closest = maxDist;
  for (const obs of obstacles) {
    const t = rayRectEntry(ox, oy, dx, dy, obs);
    if (t > 0 && t < closest) closest = t;
  }
  return closest;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the visibility polygon for a player.
 *
 * @param origin       Player world position.
 * @param facingAngle  Direction the player is facing (radians, 0 = right).
 * @param fovDeg       Field-of-view in degrees (140 or 160).
 * @param maxRadius    Maximum vision radius in pixels.
 * @param obstacles    Array of axis-aligned rectangles that block vision.
 * @returns            Array of world-space Vec2 forming the visible-area polygon.
 *                     First point is always `origin`.
 */
export function computeVisionPolygon(
  origin: Vec2,
  facingAngle: number,
  fovDeg: number,
  maxRadius: number,
  obstacles: Rect[],
): Vec2[] {
  const ox      = origin.x;
  const oy      = origin.y;
  const fovRad  = (fovDeg * Math.PI) / 180;
  const halfFov = fovRad / 2;
  const EPS     = 0.00018; // small angle offset for sharp corner shadows

  // ── 1. Collect candidate angles ────────────────────────────────────────────

  const angles: number[] = [];

  // Uniform fan spanning the full FOV
  for (let i = 0; i <= VISION_RAY_COUNT; i++) {
    angles.push(facingAngle - halfFov + (i / VISION_RAY_COUNT) * fovRad);
  }

  // Extra corner rays for each obstacle corner inside the arc
  for (const obs of obstacles) {
    for (const c of corners(obs)) {
      const cdx = c.x - ox;
      const cdy = c.y - oy;
      if (cdx * cdx + cdy * cdy > (maxRadius + 80) * (maxRadius + 80)) continue;
      const a = Math.atan2(cdy, cdx);
      if (!inArc(a, facingAngle, halfFov + 0.06)) continue;
      angles.push(a - EPS, a, a + EPS);
    }
  }

  // ── 2. Deduplicate & sort within the arc ───────────────────────────────────

  const arcStart = facingAngle - halfFov;
  const sorted = [...new Set(angles.map(a => Math.round(a * 1e5) / 1e5))]
    .filter(a => inArc(a, facingAngle, halfFov + 0.015))
    .sort((a, b) => norm(a - arcStart) - norm(b - arcStart));

  // ── 3. Cast rays → build polygon ──────────────────────────────────────────

  const pts: Vec2[] = [{ x: ox, y: oy }];
  for (const angle of sorted) {
    const t = castRay(ox, oy, angle, maxRadius, obstacles);
    pts.push({ x: ox + Math.cos(angle) * t, y: oy + Math.sin(angle) * t });
  }

  return pts;
}

/**
 * Point-in-polygon test (ray-casting algorithm).
 * Used to check if a game entity falls inside the visible-area polygon.
 */
export function pointInPolygon(px: number, py: number, poly: Vec2[]): boolean {
  const n = poly.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x; const yi = poly[i].y;
    const xj = poly[j].x; const yj = poly[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Build the obstacle rectangle list used by the vision raycaster.
 *
 * @param visionBuildings  Building rects with the entrance arch gap split
 *                         (from VISION_BUILDINGS in map.ts, NOT BUILDINGS).
 * @param cars             Live car objects (static in Phase 1).
 * @param dumpsters        Dumpster world positions.
 */
export function buildVisionObstacles(
  visionBuildings: Rect[],
  cars: Array<{ pos: Vec2 }>,
  dumpsters: Vec2[],
): Rect[] {
  const out: Rect[] = [...visionBuildings];
  // Cars: 70×36 px centred on car.pos
  for (const c of cars) out.push({ x: c.pos.x - 35, y: c.pos.y - 18, w: 70, h: 36 });
  // Dumpsters: 32×28 px centred
  for (const d of dumpsters) out.push({ x: d.x - 16, y: d.y - 14, w: 32, h: 28 });
  return out;
}
