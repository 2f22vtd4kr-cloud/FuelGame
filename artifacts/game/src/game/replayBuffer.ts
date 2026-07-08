/**
 * §9.2 Backstab Moment replay system
 * Maintains a rolling frame buffer (ring buffer at ~8fps).
 * When a dramatic moment fires, the buffered frames are watermarked and
 * encoded as an animated GIF for download/share.
 */

import { GIFEncoder, quantize, applyPalette } from 'gifenc';

// ── Config ────────────────────────────────────────────────────────────────────
const FRAME_RATE   = 8;                        // fps for capture & playback
const FRAME_MS     = Math.round(1000 / FRAME_RATE); // ~125 ms
const MAX_FRAMES   = FRAME_RATE * 3;           // 3-second rolling window = 24 frames
const GIF_SIZE     = 360;                      // output GIF square (px) – keep small for perf

// ── Ring buffer state ─────────────────────────────────────────────────────────
let _frames:       (ImageData | null)[] = new Array(MAX_FRAMES).fill(null);
let _head          = 0;   // next write position
let _count         = 0;   // how many valid frames are stored
let _captureTimer: ReturnType<typeof setInterval> | null = null;
let _srcCanvas:    HTMLCanvasElement | null = null;

// Reusable off-screen canvas for downsampling
let _scaleCanvas:  HTMLCanvasElement | null = null;
let _scaleCtx:     CanvasRenderingContext2D | null = null;

// ── Output state ──────────────────────────────────────────────────────────────
let _momentUrl:    string | null = null;  // blob: URL of encoded GIF
let _momentType:   string | null = null;
let _onMomentCaptured: ((type: string) => void) | null = null;

// ── Public API ────────────────────────────────────────────────────────────────

/** Register a callback that fires when a new moment GIF has been encoded. */
export function onMomentCaptured(cb: (type: string) => void): void {
  _onMomentCaptured = cb;
}

/**
 * Start the rolling frame buffer.
 * Call this when the game enters the "play" phase so we accumulate frames
 * leading up to any dramatic moment.
 */
export function startFrameCapture(canvas: HTMLCanvasElement): void {
  stopFrameCapture();

  _srcCanvas   = canvas;
  _frames      = new Array(MAX_FRAMES).fill(null);
  _head        = 0;
  _count       = 0;

  // Create (or reuse) the downscaling canvas
  if (!_scaleCanvas) {
    _scaleCanvas = document.createElement('canvas');
    _scaleCanvas.width  = GIF_SIZE;
    _scaleCanvas.height = GIF_SIZE;
    _scaleCtx = _scaleCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  _captureTimer = setInterval(_captureFrame, FRAME_MS);
}

/** Stop the rolling frame buffer without clearing the existing buffer. */
export function stopFrameCapture(): void {
  if (_captureTimer !== null) {
    clearInterval(_captureTimer);
    _captureTimer = null;
  }
  _srcCanvas = null;
}

/**
 * Triggered when a backstab moment is detected.
 * Freezes the buffer, watermarks every frame, and encodes an animated GIF.
 */
export function captureMoment(canvas: HTMLCanvasElement, type: string): void {
  if (_momentUrl) return; // already captured one this match

  // Stop capturing so the buffer stays frozen at the moment of the event
  stopFrameCapture();

  try {
    const frames = _collectFrames();

    // If we have no buffered frames (buffer wasn't started), capture one frame now
    if (frames.length === 0) {
      const single = _sampleCanvas(canvas);
      if (single) frames.push(single);
    }
    if (frames.length === 0) return;

    const gif    = GIFEncoder();
    const wCtx   = _getWatermarkCtx();
    const labels  = _labelMap(type);

    for (const frame of frames) {
      _drawWatermarkedFrame(wCtx, frame, labels);
      const pixels  = wCtx.getImageData(0, 0, GIF_SIZE, GIF_SIZE).data as unknown as Uint8Array;
      const palette = quantize(pixels, 256);
      const index   = applyPalette(pixels, palette);
      gif.writeFrame(index, GIF_SIZE, GIF_SIZE, { palette, delay: FRAME_MS });
    }

    gif.finish();
    const bytes  = gif.bytes();
    const blob   = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' });
    _momentUrl   = URL.createObjectURL(blob);
    _momentType  = type;
    _onMomentCaptured?.(type);
  } catch (err) {
    console.warn('[ReplayBuffer] GIF encode failed:', err);
  }
}

/** Download the encoded GIF. */
export function downloadMoment(): void {
  if (!_momentUrl) return;
  const a      = document.createElement('a');
  a.download   = `95-backstab-moment-${_momentType ?? 'clip'}.gif`;
  a.href       = _momentUrl;
  a.click();
}

/** Returns the blob URL of the captured GIF, or null if none yet. */
export function getMomentDataUrl(): string | null {
  return _momentUrl;
}

/** Clear state between matches. */
export function clearMoment(): void {
  stopFrameCapture();
  if (_momentUrl) {
    URL.revokeObjectURL(_momentUrl);
    _momentUrl = null;
  }
  _momentType = null;
  _frames     = new Array(MAX_FRAMES).fill(null);
  _head       = 0;
  _count      = 0;
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _captureFrame(): void {
  if (!_srcCanvas || !_scaleCtx || !_scaleCanvas) return;
  const data = _sampleCanvas(_srcCanvas);
  if (!data) return;
  _frames[_head] = data;
  _head = (_head + 1) % MAX_FRAMES;
  if (_count < MAX_FRAMES) _count++;
}

/** Centre-crop and downscale a canvas to GIF_SIZE × GIF_SIZE. */
function _sampleCanvas(src: HTMLCanvasElement): ImageData | null {
  if (!_scaleCtx || !_scaleCanvas) {
    _scaleCanvas = document.createElement('canvas');
    _scaleCanvas.width  = GIF_SIZE;
    _scaleCanvas.height = GIF_SIZE;
    _scaleCtx = _scaleCanvas.getContext('2d', { willReadFrequently: true })!;
  }
  try {
    const sw = Math.min(src.width, src.height);
    const sx = (src.width  - sw) / 2;
    const sy = (src.height - sw) / 2;
    _scaleCtx.drawImage(src, sx, sy, sw, sw, 0, 0, GIF_SIZE, GIF_SIZE);
    return _scaleCtx.getImageData(0, 0, GIF_SIZE, GIF_SIZE);
  } catch {
    return null; // tainted or unavailable
  }
}

/** Collect buffered frames in chronological order. */
function _collectFrames(): ImageData[] {
  const out: ImageData[] = [];
  if (_count === 0) return out;
  const oldest = (_head - _count + MAX_FRAMES) % MAX_FRAMES;
  for (let i = 0; i < _count; i++) {
    const frame = _frames[(oldest + i) % MAX_FRAMES];
    if (frame) out.push(frame);
  }
  return out;
}

let _wCanvas: HTMLCanvasElement | null = null;
let _wCtx:    CanvasRenderingContext2D | null = null;

function _getWatermarkCtx(): CanvasRenderingContext2D {
  if (!_wCanvas) {
    _wCanvas = document.createElement('canvas');
    _wCanvas.width  = GIF_SIZE;
    _wCanvas.height = GIF_SIZE;
    _wCtx = _wCanvas.getContext('2d', { willReadFrequently: true })!;
  }
  return _wCtx!;
}

function _labelMap(type: string): { title: string; sub: string } {
  const map: Record<string, { title: string; sub: string }> = {
    catch_siphoner:   { title: '💥 БАКСТАБ МОМЕНТ', sub: 'ПОЙМАЛ СЛИВЩИКА!'    },
    caught_siphoning: { title: '🚨 БАКСТАБ МОМЕНТ', sub: 'ЗАСТУКАЛИ!'           },
    dramatic_eject:   { title: '🗑️ БАКСТАБ МОМЕНТ', sub: 'ВЫБРОШЕН ИЗ ДВОРА!' },
  };
  return map[type] ?? { title: '💥 БАКСТАБ МОМЕНТ', sub: '' };
}

function _drawWatermarkedFrame(
  ctx: CanvasRenderingContext2D,
  frame: ImageData,
  labels: { title: string; sub: string },
): void {
  const s = GIF_SIZE;

  // Base frame
  ctx.putImageData(frame, 0, 0);

  // Vignette
  const vg = ctx.createRadialGradient(s/2, s/2, s*0.28, s/2, s/2, s*0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.52)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, s, s);

  // Top banner
  ctx.fillStyle = 'rgba(0,0,0,0.76)';
  ctx.fillRect(0, 0, s, 58);
  ctx.textAlign = 'center';

  ctx.fillStyle = '#FF1744';
  ctx.font      = `bold ${Math.round(s * 0.08)}px sans-serif`;
  ctx.fillText(labels.title, s/2, 30);

  if (labels.sub) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font      = `${Math.round(s * 0.055)}px sans-serif`;
    ctx.fillText(labels.sub, s/2, 52);
  }

  // Bottom bar
  ctx.fillStyle = 'rgba(0,0,0,0.76)';
  ctx.fillRect(0, s - 40, s, 40);
  ctx.fillStyle = '#FFD700';
  ctx.font      = `bold ${Math.round(s * 0.048)}px sans-serif`;
  ctx.fillText('95-Й БАКСТАБ  •  @fuel_fuel_fuel_bot', s/2, s - 12);
}
