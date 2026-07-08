// ─── Generalized top-down character sprite-sheet builder ──────────────────
// Extracted/parameterized from generate-denis-sprite.mjs so the same rounded
// -silhouette pixel-art pipeline can stamp out any character from a small
// palette + headwear config, instead of hand-writing per-character draw code.
// Produces the same 4x4 grid (rows: left/right/down/up, cols: 4 walk frames)
// at 64x64 per frame — drop-in compatible with sprites.ts::SPRITE_SHEETS.

import { PixelGrid, composeSheet } from './pixelart.mjs';
import { encodePNG } from './png.mjs';
import { writeFileSync } from 'node:fs';

export const SIZE = 64;

const CYCLE = [
  { legShift: 4, armSwing: -4, bob: 0 },
  { legShift: 0, armSwing: 0, bob: -2 },
  { legShift: -4, armSwing: 4, bob: 0 },
  { legShift: 0, armSwing: 0, bob: -2 },
];

/** Draws headwear (or hair-only) onto the front/back builder at cap position. */
function drawHeadFrontBack(g, cx, bob, cfg, facing) {
  const { headwear, hair } = cfg;
  if (facing === 'up') {
    // Back of head — solid dome, no face
    g.fillEllipse(cx, 20 + bob, 11, 10, hair);
    if (headwear.type === 'cap') {
      g.fillEllipse(cx, 11 + bob, 13, 11, headwear.shade);
      g.fillEllipse(cx - 1, 10 + bob, 12, 10, headwear.color);
      g.fillRoundedRect(cx - 6, 18 + bob, 12, 4, 2, headwear.shade);
    } else if (headwear.type === 'bandana') {
      g.fillEllipse(cx, 14 + bob, 12, 8, headwear.shade);
      g.fillEllipse(cx - 1, 13 + bob, 11, 7, headwear.color);
    }
    return;
  }
  // Down (facing viewer)
  if (headwear.type === 'cap') {
    g.fillEllipse(cx, 9 + bob, 13, 9, headwear.shade);
    g.fillEllipse(cx - 2, 8 + bob, 12, 8, headwear.color);
    g.fillRoundedRect(cx - 11, 13 + bob, 22, 4, 2, headwear.bill ?? '#2B2B2E');
    if (headwear.badge) g.fillCircle(cx, 7 + bob, 3, headwear.badge);
  } else if (headwear.type === 'bandana') {
    g.fillEllipse(cx, 12 + bob, 12, 7, headwear.shade);
    g.fillEllipse(cx - 1, 11 + bob, 11, 6, headwear.color);
    g.fillRoundedRect(cx - 12, 14 + bob, 6, 4, 2, headwear.color);
  } else if (headwear.type === 'bun') {
    g.fillCircle(cx, 8 + bob, 5, hair);
  } else if (headwear.type === 'none') {
    g.fillRoundedRect(cx - 9, 14 + bob, 18, 5, 2, hair);
  }
}

/** Down (facing viewer) / Up (back view) builder. */
function buildFrontBack(cfg, facing, { legShift, bob }) {
  const g = new PixelGrid(SIZE, SIZE);
  const cx = 32;
  const { skin, skinShade, top, bottom, shoe, shoeSole } = cfg;

  // Legs
  const legW = 10;
  const legTopY = 50;
  const legH = 10;
  const leftLegX = cx - 12 - legShift * 0.5;
  const rightLegX = cx + 2 + legShift * 0.5;
  g.fillRoundedRect(Math.round(leftLegX), legTopY + bob, legW, legH, 4, bottom.color);
  g.fillRoundedRect(Math.round(rightLegX), legTopY + bob, legW, legH, 4, bottom.color);
  g.fillRoundedRect(Math.round(leftLegX) + 1, legTopY + legH - 3 + bob, legW - 2, 3, 2, bottom.shade);
  g.fillRoundedRect(Math.round(rightLegX) + 1, legTopY + legH - 3 + bob, legW - 2, 3, 2, bottom.shade);
  g.fillRoundedRect(Math.round(leftLegX) - 1, legTopY + legH - 2 + bob, legW + 2, 6, 3, shoe);
  g.fillRoundedRect(Math.round(rightLegX) - 1, legTopY + legH - 2 + bob, legW + 2, 6, 3, shoe);
  g.fillRoundedRect(Math.round(leftLegX) - 1, legTopY + legH + 2 + bob, legW + 2, 2, 1, shoeSole);
  g.fillRoundedRect(Math.round(rightLegX) - 1, legTopY + legH + 2 + bob, legW + 2, 2, 1, shoeSole);

  // Hips
  g.fillRoundedRect(cx - 15, 48 + bob, 30, 8, 4, bottom.color);

  // Arms
  g.fillRoundedRect(cx - 21, 32 + bob, 9, 20, 4, top.color);
  g.fillRoundedRect(cx + 12, 32 + bob, 9, 20, 4, top.color);
  g.fillCircle(cx - 17, 51 + bob, 4, skin);
  g.fillCircle(cx + 17, 51 + bob, 4, skin);

  // Torso
  g.fillRoundedRect(cx - 16, 30 + bob, 32, 24, 9, top.color);
  g.fillRect(cx + 4, 32 + bob, 12, 20, top.shade);
  if (top.accent) {
    g.fillRect(cx - 1, 33 + bob, 2, 18, top.accent);
  }
  g.fillRoundedRect(cx - 11, 39 + bob, 5, 6, 1, top.shade);
  g.fillRoundedRect(cx - 6, 28 + bob, 12, 5, 2, top.collar ?? top.shade);

  // Head
  g.fillEllipse(cx, 24 + bob, 11, 11, skin);
  g.fillEllipse(cx + 5, 26 + bob, 7, 8, skinShade);

  if (facing === 'down') {
    g.fillRoundedRect(cx - 8, 20 + bob, 4, 2, 1, cfg.hair);
    g.fillRoundedRect(cx + 4, 20 + bob, 4, 2, 1, cfg.hair);
    g.fillCircle(cx - 6, 23 + bob, 1.6, '#2A1E14');
    g.fillCircle(cx + 6, 23 + bob, 1.6, '#2A1E14');
    g.set(cx, 26 + bob, skinShade);
    if (cfg.mustache) g.fillRoundedRect(cx - 4, 28 + bob, 8, 2, 1, cfg.hair);
    g.fillRoundedRect(cx - 3, 29 + bob, 6, 2, 1, '#8A5A38');
    if (cfg.glasses) {
      g.fillRoundedRect(cx - 9, 21 + bob, 6, 4, 1, '#1A1A1A80');
      g.fillRoundedRect(cx + 3, 21 + bob, 6, 4, 1, '#1A1A1A80');
    }
  }

  drawHeadFrontBack(g, cx, bob, cfg, facing);

  return g;
}

/** Right-facing profile builder (mirrored for Left). */
function buildProfileRight(cfg, { legShift, armSwing, bob }) {
  const g = new PixelGrid(SIZE, SIZE);
  const cx = 34;
  const { skin, skinShade, top, bottom, shoe, shoeSole, hair, headwear } = cfg;

  const legW = 9;
  const nearLegX = cx - 4 + legShift;
  const farLegX = cx - 4 - legShift * 0.6;
  g.fillRoundedRect(Math.round(farLegX) - 3, 50 + bob, legW, 9, 4, bottom.shade);
  g.fillRoundedRect(Math.round(farLegX) - 3, 56 + bob, legW, 6, 3, shoe);

  g.fillRoundedRect(cx - 13, 48 + bob, 22, 8, 4, bottom.color);

  g.fillRoundedRect(Math.round(nearLegX) - 3, 50 + bob, legW, 10, 4, bottom.color);
  g.fillRoundedRect(Math.round(nearLegX) - 4, 58 + bob, legW + 2, 6, 3, shoe);
  g.fillRoundedRect(Math.round(nearLegX) - 4, 62 + bob, legW + 2, 2, 1, shoeSole);

  g.fillRoundedRect(cx - 12, 34 + bob, 8, 16 - armSwing * 0.3, 4, top.shade);

  g.fillRoundedRect(cx - 12, 30 + bob, 26, 24, 9, top.color);
  g.fillRect(cx - 12, 32 + bob, 8, 20, top.shade);
  if (top.accent) g.fillRect(cx + 3, 34 + bob, 2, 16, top.accent);
  g.fillRoundedRect(cx - 3, 28 + bob, 10, 5, 2, top.collar ?? top.shade);

  const armY = 34 + bob + armSwing * 0.4;
  g.fillRoundedRect(cx + 6, armY, 9, 18, 4, top.color);
  g.fillCircle(cx + 10, armY + 18, 4, skin);

  g.fillEllipse(cx + 2, 20 + bob, 10, 10, skin);
  g.fillEllipse(cx + 6, 22 + bob, 6, 7, skinShade);
  g.fillCircle(cx + 8, 20 + bob, 1.4, '#2A1E14');
  g.fillRoundedRect(cx + 11, 20 + bob, 2, 3, 1, skin);
  if (cfg.mustache) g.fillRoundedRect(cx + 9, 23 + bob, 3, 2, 1, hair);
  g.fillRoundedRect(cx + 6, 24 + bob, 4, 2, 1, '#8A5A38');

  if (headwear.type === 'cap') {
    g.fillEllipse(cx + 1, 11 + bob, 12, 10, headwear.shade);
    g.fillEllipse(cx, 10 + bob, 11, 9, headwear.color);
    g.fillRoundedRect(cx + 8, 15 + bob, 10, 5, 2, headwear.bill ?? '#2B2B2E');
    if (headwear.badge) g.fillCircle(cx - 3, 9 + bob, 2.6, headwear.badge);
  } else if (headwear.type === 'bandana') {
    g.fillEllipse(cx + 1, 13 + bob, 11, 8, headwear.shade);
    g.fillEllipse(cx, 12 + bob, 10, 7, headwear.color);
  } else if (headwear.type === 'bun') {
    g.fillCircle(cx - 4, 10 + bob, 5, hair);
    g.fillEllipse(cx + 1, 15 + bob, 10, 8, hair);
  } else if (headwear.type === 'none') {
    g.fillEllipse(cx + 1, 15 + bob, 10, 8, hair);
  }

  return g;
}

/** Builds and writes a 4x4 (64x64/frame) character walk sheet PNG for `cfg`. */
export function generateCharacterSheet(cfg, outPath) {
  const frames = [];
  for (const pose of CYCLE) frames.push(buildProfileRight(cfg, pose).mirrored());
  for (const pose of CYCLE) frames.push(buildProfileRight(cfg, pose));
  for (const pose of CYCLE) frames.push(buildFrontBack(cfg, 'down', pose));
  for (const pose of CYCLE) frames.push(buildFrontBack(cfg, 'up', pose));

  const { width, height, rgba } = composeSheet(frames, { cols: 4, rows: 4, frameSize: SIZE, scale: 1 });
  const png = encodePNG(width, height, rgba);
  writeFileSync(outPath, png);
  console.log(`Wrote ${outPath} (${width}x${height})`);
}
