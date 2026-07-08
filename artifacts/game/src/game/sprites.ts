// ─── §7.3 Sprite Loader ────────────────────────────────────────────────────────
// Pre-loads all character and car PNG sprites from /sprites/.
// Falls back gracefully to the primitive circle/rect renderer when not loaded.

const SPRITE_KEYS = [
  'char_denis',
  'char_anya',
  'char_vova',
  'char_uncle_seryozha',
  'char_petrovich',
  'char_marina',
  'char_akhmet',
  'char_oleg',
  'char_lena',
  'char_barsik',
  'car_moskvich',
  'car_zeekr',
  'car_yandex',
  'car_tesla',
  'car_haval',
  'car_vesta',
  'decor_bench',
  'decor_dumpster',
  'decor_flowerbed',
  'decor_tree',
  'decor_lamppost',
  'decor_kvass_stand',
  'decor_ev_charger',
  'decor_hydrant',
  'decor_trash_bin',
  'decor_bicycle_rack',
];

/** Draw size + vertical anchor offset (px, relative to the decoration's (x,y) point) for each prop sprite. */
// Dimensions must match the actual generated PNGs in public/sprites/ (see
// scripts/generate-props.mjs) — offsetY is tuned so each prop's visual base
// stays anchored to the same world point when its native size changes.
// v2 (Propaganda Pop courtyard redesign): dumpster/flowerbed/tree/hydrant/
// trash_bin/bicycle_rack are now AI-illustrated art (see
// scripts/process-ai-decor.mjs) trimmed + downsampled to these exact native
// pixel sizes; bench/lamppost/kvass_stand/ev_charger stay procedural since
// AI top-down generations of those came back as front-elevation views that
// didn't read correctly from directly overhead.
export const DECOR_SPRITE_META: Record<string, { w: number; h: number; offsetY: number }> = {
  decor_bench: { w: 48, h: 26, offsetY: 0 },
  decor_dumpster: { w: 38, h: 40, offsetY: -1 },
  decor_flowerbed: { w: 62, h: 62, offsetY: -2 },
  decor_tree: { w: 70, h: 70, offsetY: -8 },
  decor_lamppost: { w: 20, h: 66, offsetY: -1 },
  decor_kvass_stand: { w: 44, h: 48, offsetY: -5 },
  decor_ev_charger: { w: 32, h: 80, offsetY: -15 },
  decor_hydrant: { w: 34, h: 32, offsetY: -5 },
  decor_trash_bin: { w: 32, h: 32, offsetY: -5 },
  decor_bicycle_rack: { w: 58, h: 58, offsetY: -4 },
};

/** Maps car `id` → sprite key, matching colours to doc §7.2 car palette. */
export const CAR_SPRITE_MAP: Record<string, string> = {
  car1: 'car_moskvich', // #E53935 cherry red
  car2: 'car_zeekr',    // #1565C0 electric blue
  car3: 'car_yandex',   // #C0CA33 lime → closest to Yandex yellow
  car4: 'car_tesla',    // #00897B teal → Tesla placeholder
  car5: 'car_haval',    // #F57F17 orange → Haval Jolion
  car6: 'car_vesta',    // #6A1B9A purple → Lada Vesta NG
};

// ─── Directional sprite-sheet metadata ─────────────────────────────────────
// Characters listed here are rendered by slicing frames out of a grid sheet
// (rows = directions, cols = walk-cycle frames) instead of rotating a single
// whole-body image. See renderer.ts::drawPlayers for the animation logic.
export interface SpriteSheetMeta {
  cols: number;
  rows: number;
  frameW: number;
  frameH: number;
  /** Row index for each cardinal direction within the sheet. */
  rowFor: { left: number; right: number; down: number; up: number };
}

const WALK_SHEET_META: SpriteSheetMeta = {
  cols: 4,
  rows: 4,
  frameW: 64,
  frameH: 64,
  rowFor: { left: 0, right: 1, down: 2, up: 3 },
};

export const SPRITE_SHEETS: Partial<Record<string, SpriteSheetMeta>> = {
  char_denis: WALK_SHEET_META,
  char_anya: WALK_SHEET_META,
  char_vova: WALK_SHEET_META,
  char_uncle_seryozha: WALK_SHEET_META,
  char_petrovich: WALK_SHEET_META,
  char_marina: WALK_SHEET_META,
  char_akhmet: WALK_SHEET_META,
  char_oleg: WALK_SHEET_META,
  char_lena: WALK_SHEET_META,
  char_barsik: WALK_SHEET_META,
};

const loaded = new Map<string, HTMLImageElement>();

/** Call once at app startup; resolves when all sprites are loaded (or skipped on error). */
export function loadSprites(): Promise<void> {
  const promises = SPRITE_KEYS.map(
    key =>
      new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => {
          loaded.set(key, img);
          resolve();
        };
        img.onerror = () => resolve(); // fail silently → renderer falls back to primitives
        img.src = `/sprites/${key}.png`;
      }),
  );
  return Promise.all(promises).then(() => undefined);
}

/** Returns a loaded HTMLImageElement or null (use fallback primitive rendering). */
export function getSprite(key: string): HTMLImageElement | null {
  return loaded.get(key) ?? null;
}
