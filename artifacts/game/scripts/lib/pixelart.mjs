// ─── Tiny pixel-art canvas helper ──────────────────────────────────────────
// Draws onto a low-resolution grid (e.g. 16x16) using hex colors, then
// nearest-neighbor upscales to the final crisp, pixelated frame size.
// Reused by every sprite-sheet generator script (Denis, taxi car, UI, ...).

/** Parses '#RRGGBB' or '#RRGGBBAA' into [r,g,b,a]. */
function parseHex(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}

/** A low-res grid canvas: `grid[y][x]` holds a hex color string or null (transparent). */
export class PixelGrid {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = Array.from({ length: height }, () => new Array(width).fill(null));
  }

  set(x, y, color) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.grid[y][x] = color;
  }

  fillRect(x0, y0, w, h, color) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) this.set(x, y, color);
    }
  }

  /** Draws a row of pixels from a legend string, e.g. "..CCCC.." with a {C: '#111'} legend. */
  row(y, xOffset, str, legend) {
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '.' || ch === ' ') continue;
      const color = legend[ch];
      if (color) this.set(xOffset + i, y, color);
    }
  }

  /** Returns a new PixelGrid mirrored horizontally. */
  mirrored() {
    const out = new PixelGrid(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        out.grid[y][this.width - 1 - x] = this.grid[y][x];
      }
    }
    return out;
  }

  /** Returns a new PixelGrid shifted by (dx, dy) pixels (wraps nothing; edges just clip). */
  shifted(dx, dy) {
    const out = new PixelGrid(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const v = this.grid[y][x];
        if (v) out.set(x + dx, y + dy, v);
      }
    }
    return out;
  }
}

/**
 * Composites a list of { grid, dx, dy } low-res frames into one RGBA buffer
 * arranged as a `cols x rows` sheet, nearest-neighbor upscaled by `scale`,
 * each source frame being `frameSize x frameSize` pixels before upscaling.
 */
export function composeSheet(frames, { cols, rows, frameSize, scale }) {
  const outFrame = frameSize * scale;
  const width = outFrame * cols;
  const height = outFrame * rows;
  const rgba = Buffer.alloc(width * height * 4, 0);

  frames.forEach((frame, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const originX = col * outFrame;
    const originY = row * outFrame;

    for (let y = 0; y < frameSize; y++) {
      for (let x = 0; x < frameSize; x++) {
        const color = frame.grid[y]?.[x];
        if (!color) continue;
        const [r, g, b, a] = parseHex(color);
        // Nearest-neighbor upscale: fill the scale x scale block
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = originX + x * scale + sx;
            const py = originY + y * scale + sy;
            const i = (py * width + px) * 4;
            rgba[i] = r;
            rgba[i + 1] = g;
            rgba[i + 2] = b;
            rgba[i + 3] = a;
          }
        }
      }
    }
  });

  return { width, height, rgba };
}
