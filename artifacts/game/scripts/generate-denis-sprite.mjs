// ─── Denis (Яндекс taxi driver) directional walk sprite sheet ──────────────
// Generates public/sprites/char_denis.png as a 4x4 grid of 64x64 frames:
//   Row 0: Walk Left   Row 1: Walk Right   Row 2: Walk Down   Row 3: Walk Up
//
// v2 (detail pass): working grid bumped from 16x16 to 32x32 (scale x2, still
// 64x64 final frames — no sprites.ts metadata changes needed) so there's room
// for actual detail called out in the reference art (yellow cap with a round
// orange "9" badge, glasses, blue jeans, dark boots) instead of just bigger
// blocky pixels. Still zero anti-aliasing — nearest-neighbor upscale only.
//
// Re-run any time with: pnpm --filter @workspace/game run gen:sprite:denis

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PixelGrid, composeSheet } from './lib/pixelart.mjs';
import { encodePNG } from './lib/png.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '../public/sprites/char_denis.png');

const SIZE = 32; // low-res working grid (per frame)
const SCALE = 2; // upscale factor -> 64x64 final frame

// ─── Palette (per reference photo: yellow cap w/ orange "9" badge, glasses,
// bright yellow hoodie/jacket, blue jeans, dark boots) ──────────────────────
const CAP_CROWN = '#FFD23D';
const CAP_CROWN_SHADE = '#E0A800';
const CAP_BILL = '#2B2B2E';
const CAP_BADGE = '#E8532A';
const CAP_BADGE_RING = '#FFE9A8';
const HAIR = '#5C3A21';
const SKIN = '#E3AC78';
const SKIN_SHADE = '#C48A55';
const EYE = '#241A12';
const GLASSES = '#232323';
const JACKET = '#FFC61E';
const JACKET_SHADE = '#E0A800';
const JACKET_ZIP = '#2B2B2E';
const COLLAR = '#2B2B2E';
const JEANS = '#3D6EA5';
const JEANS_SHADE = '#2A4E78';
const SHOE = '#241C15';
const SHOE_SOLE = '#100C08';

// 4-frame walk cycle shared by all directions (legShift doubled vs the old
// 16px grid so the stride still reads at the new 32px scale):
//   0: contact A (stride open one way)   1: passing (mid, raised)
//   2: contact B (stride open other way) 3: passing (mid, raised)
const CYCLE = [
  { legShift: 2, armPhase: 'back', bob: 0 },
  { legShift: 0, armPhase: 'mid', bob: -1 },
  { legShift: -2, armPhase: 'forward', bob: 0 },
  { legShift: 0, armPhase: 'mid', bob: -1 },
];

/** Down (facing viewer) / Up (back view) builder. */
function buildFrontBack(facing, { legShift, bob }) {
  const g = new PixelGrid(SIZE, SIZE);
  const put = (y, segs) => {
    for (const [start, len, color] of segs) g.fillRect(start, y + bob, len, 1, color);
  };
  const dot = (x, y, color) => g.set(x, y + bob, color);

  // ── Cap ──
  put(0, [[12, 8, CAP_CROWN]]);
  put(1, [[10, 12, CAP_CROWN]]);
  put(2, [[9, 1, CAP_CROWN_SHADE], [10, 12, CAP_CROWN], [22, 1, CAP_CROWN_SHADE]]);
  if (facing === 'down') {
    put(2, [[14, 4, CAP_BADGE]]);
    dot(14, 2, CAP_BADGE_RING);
    dot(17, 2, CAP_BADGE_RING);
    put(3, [[8, 16, CAP_BILL]]);
  } else {
    // Back view: no badge/bill visible, just a small strap detail + hair tufts
    put(2, [[15, 2, CAP_CROWN_SHADE]]);
    put(3, [[9, 14, CAP_CROWN]]);
  }

  if (facing === 'down') {
    // Face
    put(4, [[8, 2, HAIR], [10, 12, SKIN], [22, 2, HAIR]]);
    put(5, [[7, 2, HAIR], [9, 14, SKIN], [23, 2, HAIR]]);
    put(6, [[8, 16, SKIN]]);
    // Glasses: dark rim across both eyes + bridge, light lens tint, eye dots
    put(6, [[9, 4, GLASSES], [19, 4, GLASSES]]);
    put(7, [[9, 1, GLASSES], [10, 2, EYE], [12, 1, GLASSES], [19, 1, GLASSES], [20, 2, EYE], [22, 1, GLASSES]]);
    put(7, [[13, 6, SKIN]]);
    put(8, [[8, 16, SKIN]]);
    put(9, [[9, 5, SKIN], [14, 4, SKIN_SHADE], [18, 5, SKIN]]);
  } else {
    // Back of head: solid cap + hair peeking at nape, no face
    put(4, [[9, 14, CAP_CROWN]]);
    put(5, [[8, 16, CAP_CROWN]]);
    put(6, [[8, 16, CAP_CROWN]]);
    put(7, [[8, 16, CAP_CROWN]]);
    put(8, [[8, 2, HAIR], [22, 2, HAIR]]);
    put(9, [[8, 3, HAIR], [21, 3, HAIR]]);
  }

  // ── Collar / jacket ──
  put(10, [[11, 10, COLLAR]]);
  put(11, [[7, 18, JACKET], [7, 2, JACKET_SHADE], [23, 2, JACKET_SHADE]]);
  put(12, [[6, 20, JACKET], [6, 2, JACKET_SHADE], [24, 2, JACKET_SHADE]]);
  put(13, [[6, 20, JACKET], [6, 2, JACKET_SHADE], [24, 2, JACKET_SHADE]]);
  put(14, [[6, 20, JACKET], [6, 2, JACKET_SHADE], [24, 2, JACKET_SHADE]]);
  put(15, [[6, 20, JACKET], [6, 2, JACKET_SHADE], [24, 2, JACKET_SHADE]]);
  put(16, [[6, 20, JACKET], [6, 2, JACKET_SHADE], [24, 2, JACKET_SHADE]]);
  if (facing === 'down') {
    put(11, [[15, 2, JACKET_ZIP]]);
    put(12, [[15, 2, JACKET_ZIP]]);
    put(13, [[15, 2, JACKET_ZIP]]);
    put(14, [[15, 2, JACKET_ZIP]]);
    put(15, [[15, 2, JACKET_ZIP]]);
    put(16, [[15, 2, JACKET_ZIP]]);
  }
  put(17, [[7, 18, JACKET_SHADE]]);

  // ── Jeans ──
  put(18, [[9, 14, JEANS]]);
  put(19, [[9, 14, JEANS], [15, 2, JEANS_SHADE]]);

  // Legs — shift left/right leg oppositely for the stride
  const legWidth = 5;
  const leftStart = 10 - legShift;
  const rightStart = 17 + legShift;
  put(20, [[leftStart, legWidth, JEANS], [rightStart, legWidth, JEANS]]);
  put(21, [[leftStart, legWidth, JEANS], [rightStart, legWidth, JEANS]]);
  put(22, [[leftStart, legWidth, JEANS], [rightStart, legWidth, JEANS]]);
  put(23, [[leftStart, legWidth, JEANS], [rightStart, legWidth, JEANS]]);
  put(24, [[leftStart, legWidth, JEANS_SHADE], [rightStart, legWidth, JEANS_SHADE]]);
  put(25, [[leftStart, legWidth, SHOE], [rightStart, legWidth, SHOE]]);
  put(26, [[leftStart, legWidth, SHOE], [rightStart, legWidth, SHOE]]);
  put(27, [[leftStart, legWidth, SHOE_SOLE], [rightStart, legWidth, SHOE_SOLE]]);

  return g;
}

/** Right-facing profile builder (mirrored for Left). */
function buildProfileRight({ legShift, armPhase, bob }) {
  const g = new PixelGrid(SIZE, SIZE);
  const put = (y, segs) => {
    for (const [start, len, color] of segs) g.fillRect(start, y + bob, len, 1, color);
  };
  const dot = (x, y, color) => g.set(x, y + bob, color);

  // ── Cap (visor points right, toward movement direction) ──
  put(0, [[14, 8, CAP_CROWN]]);
  put(1, [[12, 12, CAP_CROWN]]);
  put(2, [[11, 15, CAP_CROWN], [26, 3, CAP_BILL]]);
  put(3, [[10, 6, HAIR], [16, 9, CAP_CROWN], [25, 4, CAP_BILL]]);
  put(3, [[14, 3, CAP_BADGE]]);
  dot(15, 3, CAP_BADGE_RING);

  // Face
  put(4, [[11, 5, HAIR], [16, 8, SKIN], [24, 1, SKIN]]);
  put(5, [[12, 4, HAIR], [16, 8, SKIN], [24, 2, SKIN]]);
  // Glasses (side view — one lens + temple arm)
  put(6, [[16, 7, SKIN], [18, 4, GLASSES]]);
  put(7, [[16, 1, HAIR], [17, 1, GLASSES], [18, 2, EYE], [20, 1, GLASSES], [21, 3, SKIN]]);
  put(8, [[16, 8, SKIN]]);
  put(9, [[17, 6, SKIN], [19, 2, SKIN_SHADE]]);

  // ── Torso / jacket ──
  put(10, [[15, 7, COLLAR]]);
  put(11, [[10, 15, JACKET], [10, 2, JACKET_SHADE]]);
  put(12, [[8, 18, JACKET], [8, 2, JACKET_SHADE]]);
  put(13, [[8, 18, JACKET], [8, 2, JACKET_SHADE]]);
  put(14, [[8, 18, JACKET], [8, 2, JACKET_SHADE]]);
  put(15, [[8, 18, JACKET], [8, 2, JACKET_SHADE]]);
  put(16, [[10, 15, JACKET], [10, 2, JACKET_SHADE]]);
  put(17, [[11, 13, JACKET_SHADE]]);

  // Trailing arm (behind torso, always faintly visible for depth)
  put(15, [[7, 2, JACKET_SHADE]]);
  put(16, [[7, 2, SKIN]]);

  // Swinging arm — moves back/forward/tucked with the walk cycle
  if (armPhase === 'back') {
    put(13, [[6, 2, JACKET]]);
    put(14, [[6, 2, JACKET]]);
    put(15, [[6, 2, JACKET]]);
    put(16, [[6, 2, SKIN]]);
  } else if (armPhase === 'forward') {
    put(12, [[24, 2, JACKET]]);
    put(13, [[25, 2, JACKET]]);
    put(14, [[25, 2, JACKET]]);
    put(15, [[25, 2, SKIN]]);
  } else {
    put(13, [[8, 2, JACKET]]);
    put(14, [[8, 2, JACKET]]);
    put(15, [[8, 2, SKIN]]);
  }

  // ── Jeans ──
  put(18, [[12, 10, JEANS]]);
  put(19, [[12, 10, JEANS]]);

  // Single swinging leg — alternates forward/center/back along the stride
  const legWidth = 5;
  const legCol = legShift > 0 ? 17 : legShift < 0 ? 9 : 13;
  put(20, [[legCol, legWidth, JEANS]]);
  put(21, [[legCol, legWidth, JEANS]]);
  put(22, [[legCol, legWidth, JEANS]]);
  put(23, [[legCol, legWidth, JEANS]]);
  put(24, [[legCol, legWidth, JEANS_SHADE]]);
  put(25, [[legCol, legWidth, SHOE]]);
  put(26, [[legCol, legWidth, SHOE]]);
  put(27, [[legCol, legWidth, SHOE_SOLE]]);

  // Back leg — mostly hidden behind torso, small hint under it
  put(24, [[13, 4, JEANS_SHADE]]);
  put(25, [[13, 4, SHOE]]);
  put(26, [[13, 4, SHOE]]);
  put(27, [[13, 4, SHOE_SOLE]]);

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
