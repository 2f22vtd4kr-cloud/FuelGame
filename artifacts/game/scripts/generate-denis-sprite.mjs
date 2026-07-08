// ─── Denis (Яндекс taxi driver) directional walk sprite sheet ──────────────
// Generates public/sprites/char_denis.png as a 4x4 grid of 64x64 frames:
//   Row 0: Walk Left   Row 1: Walk Right   Row 2: Walk Down   Row 3: Walk Up
// Drawn procedurally on a 16x16 low-res grid, then nearest-neighbor
// upscaled 4x for crisp, pixelated frames (no anti-aliasing, no AI image
// generation, no native canvas dependency — pure Node + zlib).
//
// Re-run any time with: pnpm --filter @workspace/game run gen:sprite:denis

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PixelGrid, composeSheet } from './lib/pixelart.mjs';
import { encodePNG } from './lib/png.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '../public/sprites/char_denis.png');

const SIZE = 16;   // low-res working grid (per frame)
const SCALE = 4;   // upscale factor -> 64x64 final frame

// ─── Palette (bright yellow Яндекс jacket + dark cap, per style reference) ──
const CAP = '#2B2B2E';
const CAP_BRIM = '#1C1C1F';
const SKIN = '#D9A066';
const EYE = '#2A1D14';
const JACKET = '#FFCC00';
const COLLAR = '#2B2B2E';
const PANTS = '#2C3E50';
const PANTS_SHADE = '#1F2D3A';
const SHOE = '#141414';

// 4-frame walk cycle shared by all directions:
//   0: contact A (stride open one way)   1: passing (mid, raised)
//   2: contact B (stride open other way) 3: passing (mid, raised)
const CYCLE = [
  { legShift: 1, armPhase: 'back', bob: 0 },
  { legShift: 0, armPhase: 'mid', bob: -1 },
  { legShift: -1, armPhase: 'forward', bob: 0 },
  { legShift: 0, armPhase: 'mid', bob: -1 },
];

/** Down (facing viewer) / Up (back view) builder. */
function buildFrontBack(facing, { legShift, bob }) {
  const g = new PixelGrid(SIZE, SIZE);
  const put = (y, segs) => {
    for (const [start, len, color] of segs) g.fillRect(start, y + bob, len, 1, color);
  };

  // Head
  put(0, [[6, 4, CAP]]);
  put(1, [[5, 6, CAP]]);
  put(2, [[4, 8, CAP_BRIM]]);

  if (facing === 'down') {
    put(3, [[4, 8, SKIN]]);
    put(4, [[4, 8, SKIN]]);
    put(4, [[5, 1, EYE], [10, 1, EYE]]);
    put(5, [[4, 8, SKIN]]);
  } else {
    // Back of head: cap covers everything, no face
    put(3, [[4, 8, CAP]]);
    put(4, [[4, 8, CAP]]);
    put(5, [[4, 8, CAP]]);
  }

  // Torso / jacket
  put(6, [[3, 10, JACKET]]);
  if (facing === 'down') put(6, [[7, 2, COLLAR]]); // small collar notch
  put(7, [[2, 12, JACKET]]);
  put(8, [[2, 12, JACKET]]);
  put(9, [[3, 10, JACKET]]);
  put(10, [[4, 8, PANTS]]);

  // Legs — shift left/right leg oppositely for the stride
  const leftStart = 5 - legShift;
  const rightStart = 8 + legShift;
  put(11, [[leftStart, 3, PANTS], [rightStart, 3, PANTS]]);
  put(12, [[leftStart, 3, PANTS], [rightStart, 3, PANTS]]);
  put(13, [[leftStart, 3, PANTS_SHADE], [rightStart, 3, PANTS_SHADE]]);
  put(14, [[leftStart, 3, SHOE], [rightStart, 3, SHOE]]);

  return g;
}

/** Right-facing profile builder (mirrored for Left). */
function buildProfileRight({ legShift, armPhase, bob }) {
  const g = new PixelGrid(SIZE, SIZE);
  const put = (y, segs) => {
    for (const [start, len, color] of segs) g.fillRect(start, y + bob, len, 1, color);
  };

  // Head (cap visor points right, toward movement direction)
  put(0, [[7, 4, CAP]]);
  put(1, [[6, 6, CAP]]);
  put(2, [[5, 8, CAP_BRIM], [12, 2, CAP_BRIM]]); // brim + forward visor tip
  put(3, [[6, 5, SKIN], [11, 1, SKIN]]); // face + nose bump
  put(4, [[6, 5, SKIN]]);
  put(4, [[9, 1, EYE]]);
  put(5, [[6, 5, SKIN]]);

  // Torso
  put(6, [[5, 7, JACKET]]);
  put(7, [[4, 9, JACKET]]);
  put(8, [[4, 9, JACKET]]);
  put(9, [[5, 7, JACKET]]);
  put(10, [[6, 5, PANTS]]);

  // Trailing arm (behind torso) — always faintly visible for depth
  put(9, [[3, 1, JACKET]]);
  put(10, [[3, 1, SKIN]]);

  // Swinging arm — moves back/forward/tucked with the walk cycle
  if (armPhase === 'back') {
    put(8, [[3, 1, JACKET]]);
    put(9, [[3, 1, JACKET]]);
    put(10, [[3, 1, SKIN]]);
  } else if (armPhase === 'forward') {
    put(7, [[12, 1, JACKET]]);
    put(8, [[12, 1, JACKET]]);
    put(9, [[12, 1, SKIN]]);
  } else {
    put(8, [[4, 1, JACKET]]);
    put(9, [[4, 1, SKIN]]);
  }

  // Single swinging leg — alternates forward/center/back along the stride
  const legCol = legShift > 0 ? 9 : legShift < 0 ? 5 : 7;
  put(11, [[legCol, 3, PANTS]]);
  put(12, [[legCol, 3, PANTS]]);
  put(13, [[legCol, 3, PANTS_SHADE]]);
  put(14, [[legCol, 3, SHOE]]);
  // Back leg — mostly hidden behind torso, small hint under it
  put(13, [[7, 2, PANTS_SHADE]]);
  put(14, [[7, 2, SHOE]]);

  return g;
}

const frames = [];

// Row 0: Walk Left = mirror of Right profile
for (const pose of CYCLE) frames.push(buildProfileRight(pose).mirrored());
// Row 1: Walk Right
for (const pose of CYCLE) frames.push(buildProfileRight(pose));
// Row 2: Walk Down
for (const pose of CYCLE) frames.push(buildFrontBack('down', pose));
// Row 3: Walk Up
for (const pose of CYCLE) frames.push(buildFrontBack('up', pose));

const { width, height, rgba } = composeSheet(frames, { cols: 4, rows: 4, frameSize: SIZE, scale: SCALE });
const png = encodePNG(width, height, rgba);
writeFileSync(OUT_PATH, png);
console.log(`Wrote ${OUT_PATH} (${width}x${height})`);
