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
];

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

export const SPRITE_SHEETS: Partial<Record<string, SpriteSheetMeta>> = {
  char_denis: {
    cols: 4,
    rows: 4,
    frameW: 64,
    frameH: 64,
    rowFor: { left: 0, right: 1, down: 2, up: 3 },
  },
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
