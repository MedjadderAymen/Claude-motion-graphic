export interface Point {
  x: number
  y: number
}

/** A polyline extracted from the icon, in source coordinates (y pointing down). */
export interface Stroke {
  points: Point[]
  closed: boolean
}

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export function polylineLength(pts: Point[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i])
  return len
}

/** Length of the loop including the closing segment back to the start. */
export function loopLength(pts: Point[]): number {
  return pts.length < 2 ? 0 : polylineLength(pts) + dist(pts[pts.length - 1], pts[0])
}

/**
 * Turn any stroke into a closed loop. An open stroke is traced forward then
 * backward, so the Fourier pen draws the line without a jump back to the start.
 */
export function toLoop(stroke: Stroke): Point[] {
  const pts = dedupe(stroke.points)
  if (stroke.closed || pts.length < 3) return pts
  return pts.concat(pts.slice(1, -1).reverse())
}

function dedupe(pts: Point[]): Point[] {
  const out: Point[] = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (!last || dist(last, p) > 1e-9) out.push(p)
  }
  if (out.length > 1 && dist(out[0], out[out.length - 1]) < 1e-9) out.pop()
  return out
}

/** Resample a closed loop to `n` points evenly spaced by arc length. */
export function resampleLoop(pts: Point[], n: number): Point[] {
  if (pts.length === 0) return []
  const loop = pts.concat([pts[0]])
  const total = polylineLength(loop)
  if (total === 0) return Array.from({ length: n }, () => ({ ...pts[0] }))
  const step = total / n
  const out: Point[] = [{ ...loop[0] }]
  let seg = 0
  let segStart = 0 // arc length at loop[seg]
  for (let i = 1; i < n; i++) {
    const target = i * step
    while (seg < loop.length - 2 && segStart + dist(loop[seg], loop[seg + 1]) < target) {
      segStart += dist(loop[seg], loop[seg + 1])
      seg++
    }
    const a = loop[seg]
    const b = loop[seg + 1]
    const d = dist(a, b)
    const f = d === 0 ? 0 : Math.min(1, (target - segStart) / d)
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
  }
  return out
}

/** Ramer–Douglas–Peucker simplification. */
export function simplify(pts: Point[], epsilon: number): Point[] {
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()!
    let maxD = 0
    let idx = -1
    const a = pts[s]
    const b = pts[e]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    for (let i = s + 1; i < e; i++) {
      const p = pts[i]
      const d = len === 0 ? dist(p, a) : Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (maxD > epsilon && idx > 0) {
      keep[idx] = 1
      stack.push([s, idx], [idx, e])
    }
  }
  return pts.filter((_, i) => keep[i])
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function bounds(strokes: Stroke[]): Bounds {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const s of strokes)
    for (const p of s.points) {
      b.minX = Math.min(b.minX, p.x)
      b.minY = Math.min(b.minY, p.y)
      b.maxX = Math.max(b.maxX, p.x)
      b.maxY = Math.max(b.maxY, p.y)
    }
  return b
}

/**
 * Center the icon on the origin, flip y so it points up (math convention) and
 * scale it so its larger half-extent equals `halfSize`.
 */
export function normalize(strokes: Stroke[], halfSize = 10): Stroke[] {
  const b = bounds(strokes)
  if (!isFinite(b.minX)) return []
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  const half = Math.max(b.maxX - b.minX, b.maxY - b.minY) / 2 || 1
  const k = halfSize / half
  return strokes.map((s) => ({
    closed: s.closed,
    points: s.points.map((p) => ({ x: (p.x - cx) * k, y: -(p.y - cy) * k })),
  }))
}

/** Greedy nearest-neighbour ordering so the pen hops between nearby strokes. */
export function orderStrokes(strokes: Stroke[]): Stroke[] {
  if (strokes.length < 2) return strokes
  const left = strokes.slice()
  // Start with the top-left-most stroke, like reading order.
  left.sort((a, b) => a.points[0].y - b.points[0].y || a.points[0].x - b.points[0].x)
  const out = [left.shift()!]
  while (left.length) {
    const cur = out[out.length - 1]
    const end = cur.closed ? cur.points[0] : cur.points[cur.points.length - 1]
    let best = 0
    let bestD = Infinity
    left.forEach((s, i) => {
      const d = dist(end, s.points[0])
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    out.push(left.splice(best, 1)[0])
  }
  return out
}
