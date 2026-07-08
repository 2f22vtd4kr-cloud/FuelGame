// ─── Барсик (ginger cat NPC) directional walk sprite sheet ─────────────────
// Same rounded-silhouette pixel-art pipeline as the humans, but a much
// smaller quadruped body plan (drawn from scratch since a cat doesn't share
// the humanoid arm/leg/torso layout used by characterBuilder.mjs).
// Re-run with: pnpm --filter @workspace/game run gen:sprites

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PixelGrid, composeSheet } from './lib/pixelart.mjs';
import { encodePNG } from './lib/png.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '../public/sprites/char_barsik.png');

const SIZE = 64;
const FUR = '#FF7043';
const FUR_SHADE = '#D9541F';
const FUR_STRIPE = '#B33E10';
const BELLY = '#FFCCA3';
const EAR_INNER = '#F0A98A';
const EYE = '#1A1A1A';
const NOSE = '#7A2E10';

const CYCLE = [
  { legShift: 3, bob: 0 },
  { legShift: 0, bob: -1 },
  { legShift: -3, bob: 0 },
  { legShift: 0, bob: -1 },
];

/** Down (toward viewer) / Up (away) — cat seen from above/behind. */
function buildFrontBack(facing, { legShift, bob }) {
  const g = new PixelGrid(SIZE, SIZE);
  const cx = 32;
  const cy = 36 + bob;

  // Tail (curls to one side)
  g.fillEllipse(cx + 14 + legShift * 0.3, cy + 6, 4, 10, FUR);
  g.fillEllipse(cx + 16 + legShift * 0.3, cy - 2, 3, 6, FUR);

  // Paws
  g.fillCircle(cx - 7 - legShift * 0.5, cy + 15, 3, FUR_SHADE);
  g.fillCircle(cx + 7 + legShift * 0.5, cy + 15, 3, FUR_SHADE);
  g.fillCircle(cx - 6, cy - 13, 3, FUR_SHADE);
  g.fillCircle(cx + 6, cy - 13, 3, FUR_SHADE);

  // Body
  g.fillEllipse(cx, cy, 13, 16, FUR);
  g.fillEllipse(cx, cy + 4, 8, 10, BELLY);
  g.fillRoundedRect(cx - 10, cy - 2, 20, 4, 2, FUR_STRIPE);

  // Head
  g.fillEllipse(cx, cy - 16, 11, 10, FUR);
  // Ears
  g.fillEllipse(cx - 8, cy - 24, 5, 6, FUR);
  g.fillEllipse(cx + 8, cy - 24, 5, 6, FUR);
  g.fillEllipse(cx - 8, cy - 23, 3, 4, EAR_INNER);
  g.fillEllipse(cx + 8, cy - 23, 3, 4, EAR_INNER);

  if (facing === 'down') {
    g.fillCircle(cx - 4, cy - 17, 1.6, EYE);
    g.fillCircle(cx + 4, cy - 17, 1.6, EYE);
    g.fillEllipse(cx, cy - 13, 1.6, 1.2, NOSE);
    g.row(Math.round(cy - 11), cx - 6, 'W.....W', { W: '#FFFFFF60' }); // whisker hint
  } else {
    g.fillEllipse(cx, cy - 15, 9, 8, FUR_SHADE);
  }

  return g;
}

/** Right-facing profile (mirrored for Left). */
function buildProfileRight({ legShift, bob }) {
  const g = new PixelGrid(SIZE, SIZE);
  const cx = 30;
  const cy = 36 + bob;

  // Tail (behind, curls up)
  g.fillEllipse(cx - 14, cy - 2, 4, 10, FUR);
  g.fillEllipse(cx - 15, cy - 10, 3, 6, FUR);

  // Far paws
  g.fillCircle(cx - 6, cy + 15, 3, FUR_SHADE);
  g.fillCircle(cx + 8, cy + 14, 3, FUR_SHADE);

  // Body (horizontal ellipse)
  g.fillEllipse(cx + 2, cy, 15, 11, FUR);
  g.fillEllipse(cx + 3, cy + 4, 10, 6, BELLY);
  g.fillRoundedRect(cx - 6, cy - 8, 16, 4, 2, FUR_STRIPE);

  // Near paws (swing with stride)
  g.fillCircle(cx - 2 + legShift, cy + 16, 3, FUR);
  g.fillCircle(cx + 12 + legShift * 0.6, cy + 15, 3, FUR);

  // Head (profile)
  g.fillEllipse(cx + 14, cy - 6, 9, 9, FUR);
  g.fillEllipse(cx + 8, cy - 13, 5, 6, FUR);
  g.fillEllipse(cx + 8, cy - 13, 3, 4, EAR_INNER);
  g.fillCircle(cx + 17, cy - 7, 1.5, EYE);
  g.fillEllipse(cx + 21, cy - 4, 1.5, 1.2, NOSE);

  return g;
}

const frames = [];
for (const pose of CYCLE) frames.push(buildProfileRight(pose).mirrored());
for (const pose of CYCLE) frames.push(buildProfileRight(pose));
for (const pose of CYCLE) frames.push(buildFrontBack('down', pose));
for (const pose of CYCLE) frames.push(buildFrontBack('up', pose));

const { width, height, rgba } = composeSheet(frames, { cols: 4, rows: 4, frameSize: SIZE, scale: 1 });
const png = encodePNG(width, height, rgba);
writeFileSync(OUT_PATH, png);
console.log(`Wrote ${OUT_PATH} (${width}x${height})`);
