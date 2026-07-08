// ─── Remaining 9 characters, procedurally generated ────────────────────────
// Applies the same rounded-silhouette pixel-art pipeline used for Denis
// (see lib/characterBuilder.mjs) to every other character in the roster.
// Each entry below is a small palette + headwear config, not hand-drawn
// per-frame code — new characters are just new config entries.
//
// Re-run any time with: pnpm --filter @workspace/game run gen:sprites

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generateCharacterSheet } from './lib/characterBuilder.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/sprites');

const SKIN = '#D99A6C';
const SKIN_SHADE = '#C0805090';
const SKIN_PALE = '#E8B48C';
const SKIN_PALE_SHADE = '#D19A6E90';
const HAIR_BROWN = '#4A2E1C';
const HAIR_BLACK = '#1F1B18';
const HAIR_GREY = '#B8B4AC';
const HAIR_RED = '#8A3B22';

const CHARACTERS = [
  {
    key: 'anya',
    // Каршерингистка — pink hoodie, ponytail bun, no headwear
    skin: SKIN_PALE,
    skinShade: SKIN_PALE_SHADE,
    hair: HAIR_BROWN,
    top: { color: '#EC4899', shade: '#C2247A', accent: '#F472B6', collar: '#C2247A' },
    bottom: { color: '#3D6EA5', shade: '#2A4E78' },
    shoe: '#B0286B',
    shoeSole: '#5A1440',
    headwear: { type: 'bun' },
  },
  {
    key: 'vova',
    // Трейдер USDT — orange hoodie, sunglasses, backwards cap
    skin: SKIN,
    skinShade: SKIN_SHADE,
    hair: HAIR_BLACK,
    top: { color: '#F4511E', shade: '#C23D0F', accent: '#FF7A47', collar: '#C23D0F' },
    bottom: { color: '#2B2B2E', shade: '#171719' },
    shoe: '#1C1C1E',
    shoeSole: '#0A0A0B',
    headwear: { type: 'cap', color: '#212121', shade: '#111112', bill: '#111112' },
    glasses: true,
  },
  {
    key: 'uncle_seryozha',
    // Пенсионер — purple cardigan, flat kepka cap, grey hair
    skin: SKIN,
    skinShade: SKIN_SHADE,
    hair: HAIR_GREY,
    top: { color: '#7B1FA2', shade: '#5C1680', accent: '#9B4DC7', collar: '#5C1680' },
    bottom: { color: '#4A4A4E', shade: '#333336' },
    shoe: '#241C15',
    shoeSole: '#100C08',
    headwear: { type: 'cap', color: '#5C1680', shade: '#3E0F58', bill: '#2B2B2E' },
    mustache: true,
  },
  {
    key: 'petrovich',
    // Механик — blue overalls, mechanic cap, mustache
    skin: SKIN,
    skinShade: SKIN_SHADE,
    hair: HAIR_BLACK,
    top: { color: '#1565C0', shade: '#0D4A94', accent: '#3B82D6', collar: '#0D4A94' },
    bottom: { color: '#0D4A94', shade: '#0A3A75' },
    shoe: '#241C15',
    shoeSole: '#100C08',
    headwear: { type: 'cap', color: '#1565C0', shade: '#0D4A94', bill: '#2B2B2E' },
    mustache: true,
  },
  {
    key: 'marina',
    // Блогерша — hot pink/red, bun, glossy style
    skin: SKIN_PALE,
    skinShade: SKIN_PALE_SHADE,
    hair: HAIR_BLACK,
    top: { color: '#E91E63', shade: '#B6154C', accent: '#F0568D', collar: '#B6154C' },
    bottom: { color: '#212121', shade: '#111112' },
    shoe: '#E91E63',
    shoeSole: '#6B0E30',
    headwear: { type: 'bun' },
  },
  {
    key: 'akhmet',
    // Дворник — orange hi-vis vest, dark cap
    skin: SKIN,
    skinShade: SKIN_SHADE,
    hair: HAIR_BLACK,
    top: { color: '#FF8F00', shade: '#C96A00', accent: '#FFC24D', collar: '#2B2B2E' },
    bottom: { color: '#333336', shade: '#1C1C1E' },
    shoe: '#241C15',
    shoeSole: '#100C08',
    headwear: { type: 'cap', color: '#2B2B2E', shade: '#111112', bill: '#111112' },
  },
  {
    key: 'oleg',
    // Охранник — black security uniform, badge cap
    skin: SKIN,
    skinShade: SKIN_SHADE,
    hair: HAIR_BLACK,
    top: { color: '#212121', shade: '#111112', accent: '#3A3A3D', collar: '#111112' },
    bottom: { color: '#171719', shade: '#0A0A0B' },
    shoe: '#0A0A0B',
    shoeSole: '#000000',
    headwear: { type: 'cap', color: '#171719', shade: '#0A0A0B', bill: '#0A0A0B', badge: '#FFC107' },
  },
  {
    key: 'lena',
    // Эко-активистка — green, bandana, cyclist
    skin: SKIN_PALE,
    skinShade: SKIN_PALE_SHADE,
    hair: HAIR_RED,
    top: { color: '#33691E', shade: '#204010', accent: '#5C9C3D', collar: '#204010' },
    bottom: { color: '#6D4C41', shade: '#4E3730' },
    shoe: '#33691E',
    shoeSole: '#152A0C',
    headwear: { type: 'bandana', color: '#F9A825', shade: '#C67C00' },
  },
];

for (const cfg of CHARACTERS) {
  generateCharacterSheet(cfg, path.join(outDir, `char_${cfg.key}.png`));
}
