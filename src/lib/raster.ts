import type { Point, Stroke } from './geometry'
import { polylineLength, simplify } from './geometry'

export interface PixelData {
  width: number
  height: number
  data: Uint8ClampedArray | number[]
}

/** Otsu's method: the threshold that best separates a bimodal histogram. */
export function otsu(values: Uint8Array): number {
  const hist = new Array(256).fill(0)
  for (const v of values) hist[v]++
  const total = values.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let wB = 0
  let best = 0
  let threshold = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) ** 2
    if (between > best) {
      best = between
      threshold = t
    }
  }
  return threshold
}

/**
 * Decide which pixels are "ink". Transparent images use alpha; opaque ones use
 * Otsu on luminance, choosing whichever side does not dominate the border.
 */
export function binarize(img: PixelData, thresholdOverride?: number): Uint8Array {
  const { width, height, data } = img
  const n = width * height
  const lum = new Uint8Array(n)
  let transparent = 0
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3]
    if (a < 250) transparent++
    // Composite onto white so transparent areas read as background.
    const f = a / 255
    const l = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
    lum[i] = Math.round(l * f + 255 * (1 - f))
  }
  const ink = new Uint8Array(n)
  if (transparent > n * 0.05 && thresholdOverride === undefined) {
    for (let i = 0; i < n; i++) ink[i] = data[i * 4 + 3] > 127 ? 1 : 0
    return ink
  }
  const t = thresholdOverride ?? otsu(lum)
  for (let i = 0; i < n; i++) ink[i] = lum[i] <= t ? 1 : 0
  // If most of the border is "ink", the icon is light on dark: invert.
  let border = 0
  let borderInk = 0
  for (let x = 0; x < width; x++) {
    border += 2
    borderInk += ink[x] + ink[(height - 1) * width + x]
  }
  for (let y = 0; y < height; y++) {
    border += 2
    borderInk += ink[y * width] + ink[y * width + width - 1]
  }
  if (borderInk > border / 2) for (let i = 0; i < n; i++) ink[i] ^= 1
  return ink
}

/**
 * Marching squares: trace the boundaries between ink and background as closed
 * polylines. Points sit on pixel-edge midpoints, in pixel coordinates.
 */
export function marchingSquares(ink: Uint8Array, width: number, height: number): Point[][] {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : ink[y * width + x])
  // Midpoints are encoded on a doubled integer grid so they can be hashed exactly.
  const key = (x2: number, y2: number) => y2 * (2 * width + 6) + x2
  const neighbours = new Map<number, number[]>()
  const coords = new Map<number, Point>()
  const link = (ax: number, ay: number, bx: number, by: number) => {
    const ka = key(ax + 2, ay + 2)
    const kb = key(bx + 2, by + 2)
    coords.set(ka, { x: ax / 2, y: ay / 2 })
    coords.set(kb, { x: bx / 2, y: by / 2 })
    if (!neighbours.has(ka)) neighbours.set(ka, [])
    if (!neighbours.has(kb)) neighbours.set(kb, [])
    neighbours.get(ka)!.push(kb)
    neighbours.get(kb)!.push(ka)
  }
  // Cell (x, y) spans pixel centres (x, y) … (x+1, y+1); edges in doubled coordinates.
  for (let y = -1; y < height; y++) {
    for (let x = -1; x < width; x++) {
      const tl = at(x, y)
      const tr = at(x + 1, y)
      const br = at(x + 1, y + 1)
      const bl = at(x, y + 1)
      const c = (tl << 3) | (tr << 2) | (br << 1) | bl
      if (c === 0 || c === 15) continue
      const X = 2 * x
      const Y = 2 * y
      const top: [number, number] = [X + 1, Y]
      const right: [number, number] = [X + 2, Y + 1]
      const bottom: [number, number] = [X + 1, Y + 2]
      const left: [number, number] = [X, Y + 1]
      const seg = (a: [number, number], b: [number, number]) => link(a[0], a[1], b[0], b[1])
      switch (c) {
        case 1: case 14: seg(left, bottom); break
        case 2: case 13: seg(bottom, right); break
        case 3: case 12: seg(left, right); break
        case 4: case 11: seg(top, right); break
        case 6: case 9: seg(top, bottom); break
        case 7: case 8: seg(left, top); break
        // Saddles: keep diagonal ink pixels separate.
        case 5: seg(top, right); seg(left, bottom); break
        case 10: seg(left, top); seg(bottom, right); break
      }
    }
  }
  const visited = new Set<number>()
  const loops: Point[][] = []
  for (const start of neighbours.keys()) {
    if (visited.has(start)) continue
    const loop: Point[] = []
    let prev = -1
    let cur = start
    while (!visited.has(cur)) {
      visited.add(cur)
      loop.push(coords.get(cur)!)
      const next = neighbours.get(cur)!.find((k) => k !== prev && !visited.has(k))
      if (next === undefined) break
      prev = cur
      cur = next
    }
    if (loop.length > 2) loops.push(loop)
  }
  return loops
}

export interface TraceOptions {
  threshold?: number
  /** Drop contours shorter than this fraction of the image perimeter. */
  minLengthRatio?: number
}

export function traceImage(img: PixelData, opts: TraceOptions = {}): Stroke[] {
  const ink = binarize(img, opts.threshold)
  const loops = marchingSquares(ink, img.width, img.height)
  const minLen = (opts.minLengthRatio ?? 0.02) * 2 * (img.width + img.height)
  return loops
    .filter((l) => polylineLength(l) >= minLen)
    .map((l) => {
      const smooth = smoothLoop(l, 2)
      return { points: simplify(smooth.concat([smooth[0]]), 0.35).slice(0, -1), closed: true }
    })
    .filter((s) => s.points.length > 2)
}

/** Circular moving average: removes the pixel staircase left by marching squares. */
export function smoothLoop(pts: Point[], radius: number, passes = 2): Point[] {
  let cur = pts
  const n = pts.length
  if (n < 2 * radius + 1) return pts
  for (let pass = 0; pass < passes; pass++) {
    const next: Point[] = []
    for (let i = 0; i < n; i++) {
      let x = 0
      let y = 0
      for (let k = -radius; k <= radius; k++) {
        const p = cur[(i + k + n) % n]
        x += p.x
        y += p.y
      }
      next.push({ x: x / (2 * radius + 1), y: y / (2 * radius + 1) })
    }
    cur = next
  }
  return cur
}
