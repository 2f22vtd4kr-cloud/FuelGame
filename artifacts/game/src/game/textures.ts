// ─── Ground texture loader ──────────────────────────────────────────────────
// Mirrors sprites.ts: pre-loads tileable AI-illustrated ground textures from
// /textures/ and exposes cached CanvasPatterns for the renderer's fillStyle.
// Falls back to a flat color (caller-supplied) when a texture isn't loaded
// yet or its image failed to load — never throws mid-render.

const TEXTURE_KEYS = ['asphalt', 'grass', 'playground', 'roof', 'path'] as const;
export type TextureKey = (typeof TEXTURE_KEYS)[number];

const loadedImages = new Map<TextureKey, HTMLImageElement>();
const patternCache = new Map<TextureKey, CanvasPattern | null>();

/** Call once at app startup alongside loadSprites(). */
export function loadTextures(): Promise<void> {
  const promises = TEXTURE_KEYS.map(
    key =>
      new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => {
          loadedImages.set(key, img);
          resolve();
        };
        img.onerror = () => resolve(); // fail silently -> renderer keeps flat fill
        img.src = `/textures/texture_${key}.png`;
      }),
  );
  return Promise.all(promises).then(() => undefined);
}

/** Returns a cached repeating CanvasPattern for a texture, or null if unavailable. */
export function getTexturePattern(ctx: CanvasRenderingContext2D, key: TextureKey): CanvasPattern | null {
  if (patternCache.has(key)) return patternCache.get(key)!;
  const img = loadedImages.get(key);
  if (!img) return null;
  const pattern = ctx.createPattern(img, 'repeat');
  patternCache.set(key, pattern);
  return pattern;
}
