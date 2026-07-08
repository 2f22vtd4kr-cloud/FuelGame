// One-off post-processing pass for AI-generated decor sprites (visual
// redesign to match the "Propaganda Pop" courtyard reference art).
// Trims transparent padding from each raw AI PNG in public/sprites_src/,
// then downsamples (high-quality Lanczos) to the exact pixel size the
// renderer draws at 1:1 with imageSmoothingEnabled=false. Baking the
// downscale in here (instead of scaling at draw time) avoids nearest-
// neighbor shimmer on detailed source art.
//
// Run with: node scripts/process-ai-decor.mjs

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '../public/sprites_src');
const outDir = path.join(__dirname, '../public/sprites');

// name -> desired max(width,height) in world px, roughly matching the prior
// procedural sprite's footprint so gameplay scale doesn't shift.
const TARGETS = {
  decor_dumpster: 40,
  decor_flowerbed: 62,
  decor_tree: 70,
  decor_hydrant: 34,
  decor_trash_bin: 32,
  decor_bicycle_rack: 58,
};

const results = {};

for (const [name, targetMax] of Object.entries(TARGETS)) {
  const srcPath = path.join(srcDir, `${name}.png`);
  // .metadata() reads the *input* header and does not reflect pending pipeline
  // ops, so materialize the trim first via toBuffer() to get the real trimmed
  // dimensions before computing the resize scale.
  const { data: trimmedBuf, info } = await sharp(srcPath)
    .trim({ threshold: 12 })
    .png()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const scale = targetMax / Math.max(width, height);
  const w = Math.max(2, Math.round(width * scale / 2) * 2);
  const h = Math.max(2, Math.round(height * scale / 2) * 2);
  await sharp(trimmedBuf).resize(w, h, { kernel: sharp.kernel.lanczos3 }).png().toFile(path.join(outDir, `${name}.png`));
  results[name] = { srcW: width, srcH: height, w, h };
  console.log(`${name}: trimmed ${width}x${height} -> ${w}x${h}`);
}

console.log(JSON.stringify(results, null, 2));
