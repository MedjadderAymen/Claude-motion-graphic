declare module 'gifenc' {
  type Palette = number[][]
  export function quantize(rgba: Uint8ClampedArray | Uint8Array, maxColors: number, options?: object): Palette
  export function applyPalette(rgba: Uint8ClampedArray | Uint8Array, palette: Palette, format?: string): Uint8Array
  export function GIFEncoder(options?: object): {
    writeFrame(index: Uint8Array, width: number, height: number, options?: { palette?: Palette; delay?: number; repeat?: number; transparent?: boolean }): void
    finish(): void
    bytes(): Uint8Array
  }
}
