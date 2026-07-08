declare module 'gifenc' {
  export interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        palette?: Uint8Array;
        delay?: number;
        repeat?: number;
        transparent?: boolean;
        transparentIndex?: number;
        colorDepth?: number;
        dispose?: number;
      },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }

  export function GIFEncoder(opts?: { initialCapacity?: number; auto?: boolean }): GIFEncoderInstance;

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: string; oneBitAlpha?: boolean | number; clearAlpha?: boolean; clearAlphaThreshold?: number; clearAlphaColor?: number },
  ): Uint8Array;

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Uint8Array,
    format?: string,
  ): Uint8Array;

  export function nearestColor(r: number, g: number, b: number, palette: Uint8Array): number;
  export function nearestColorIndex(r: number, g: number, b: number, palette: Uint8Array): number;
  export function prequantize(rgba: Uint8Array | Uint8ClampedArray, options?: object): void;
  export function snapColorsToPalette(
    palette: Uint8Array,
    rgba: Uint8Array | Uint8ClampedArray,
    options?: object,
  ): void;
}
