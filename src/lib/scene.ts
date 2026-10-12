import type { Point, Stroke } from './geometry'
import { normalize, orderStrokes } from './geometry'
import type { FourierPath } from './fourier'
import { evaluate, fourierPath, reconstruct } from './fourier'

export const HALF_SIZE = 10

export interface Scene {
  paths: FourierPath[]
  /** Cumulative start of each path in [0, 1] of the animation (sequential mode). */
  starts: number[]
}

export function buildScene(strokes: Stroke[], samples: number): Scene {
  const ordered = orderStrokes(strokes.filter((s) => s.points.length > 1))
  const paths = normalize(ordered, HALF_SIZE)
    .map((s) => fourierPath(s, samples))
    .filter((p): p is FourierPath => p !== null)
  // Drop specks that are tiny compared to the whole icon.
  const total = paths.reduce((s, p) => s + p.length, 0)
  const kept = paths.filter((p) => p.length > total * 0.002)
  const keptTotal = kept.reduce((s, p) => s + p.length, 0)
  const starts: number[] = []
  let acc = 0
  for (const p of kept) {
    starts.push(acc / keptTotal)
    acc += p.length
  }
  return { paths: kept, starts }
}

export interface RenderOptions {
  terms: number
  showCircles: boolean
  showOriginal: boolean
  simultaneous: boolean
  theme: Theme
}

export interface Theme {
  background: string
  trace: string
  circles: string
  arms: string
  pen: string
  ghost: string
}

export const DARK: Theme = {
  background: '#0b0d12',
  trace: '#7cf3c4',
  circles: 'rgba(160, 175, 210, 0.22)',
  arms: 'rgba(220, 228, 255, 0.75)',
  pen: '#ffd166',
  ghost: 'rgba(255, 255, 255, 0.07)',
}

/** Reconstructed curves per path, cached by term count. */
export class TraceCache {
  private key = ''
  private curves: Point[][] = []
  get(scene: Scene, terms: number, resolution = 720): Point[][] {
    const key = `${terms}:${resolution}`
    if (key !== this.key || this.curves.length !== scene.paths.length) {
      this.curves = scene.paths.map((p) => reconstruct(p.terms, terms, resolution))
      this.key = key
    }
    return this.curves
  }
  reset() {
    this.key = ''
  }
}

/**
 * Draw one animation frame. `progress` in [0, 1] covers the whole drawing; at
 * progress 1 every path is complete.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: Scene,
  progress: number,
  opts: RenderOptions,
  cache: TraceCache,
) {
  const { theme } = opts
  ctx.save()
  ctx.fillStyle = theme.background
  ctx.fillRect(0, 0, width, height)
  const scale = Math.min(width, height) / (2 * HALF_SIZE * 1.12)
  ctx.translate(width / 2, height / 2)
  ctx.scale(scale, -scale)
  const px = 1 / scale
  const curves = cache.get(scene, opts.terms)

  if (opts.showOriginal) {
    ctx.strokeStyle = theme.ghost
    ctx.lineWidth = 6 * px
    ctx.lineJoin = ctx.lineCap = 'round'
    for (const p of scene.paths) strokeCurve(ctx, reconstructCached(p), 1)
  }

  const n = scene.paths.length
  const local = (i: number): number => {
    if (opts.simultaneous) return progress
    const start = scene.starts[i]
    const end = i + 1 < n ? scene.starts[i + 1] : 1
    return Math.max(0, Math.min(1, (progress - start) / (end - start)))
  }

  ctx.lineJoin = ctx.lineCap = 'round'
  ctx.strokeStyle = theme.trace
  ctx.lineWidth = 2.2 * px
  ctx.shadowColor = theme.trace
  ctx.shadowBlur = 8
  for (let i = 0; i < n; i++) strokeCurve(ctx, curves[i], local(i))
  ctx.shadowBlur = 0

  // Epicycles for the paths currently being drawn.
  for (let i = 0; i < n; i++) {
    const u = local(i)
    if (u <= 0 || u >= 1) continue
    drawEpicycles(ctx, scene.paths[i], opts, u * 2 * Math.PI, px)
  }
  ctx.restore()
}

const fullCurveCache = new WeakMap<FourierPath, Point[]>()
function reconstructCached(p: FourierPath): Point[] {
  let c = fullCurveCache.get(p)
  if (!c) {
    c = reconstruct(p.terms, p.terms.length, 720)
    fullCurveCache.set(p, c)
  }
  return c
}

function strokeCurve(ctx: CanvasRenderingContext2D, curve: Point[], fraction: number) {
  if (fraction <= 0) return
  const last = (curve.length - 1) * fraction
  const whole = Math.floor(last)
  ctx.beginPath()
  ctx.moveTo(curve[0].x, curve[0].y)
  for (let i = 1; i <= whole; i++) ctx.lineTo(curve[i].x, curve[i].y)
  if (whole < curve.length - 1) {
    const a = curve[whole]
    const b = curve[whole + 1]
    const f = last - whole
    ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f)
  }
  ctx.stroke()
}

function drawEpicycles(ctx: CanvasRenderingContext2D, path: FourierPath, opts: RenderOptions, t: number, px: number) {
  const { theme } = opts
  const count = Math.min(opts.terms, path.terms.length)
  let x = 0
  let y = 0
  ctx.lineWidth = 1 * px
  for (let i = 0; i < count; i++) {
    const { freq, amp, phase } = path.terms[i]
    const a = freq * t + phase
    const nx = x + amp * Math.cos(a)
    const ny = y + amp * Math.sin(a)
    if (opts.showCircles && freq !== 0 && amp > 1.5 * px) {
      ctx.strokeStyle = theme.circles
      ctx.beginPath()
      ctx.arc(x, y, amp, 0, 2 * Math.PI)
      ctx.stroke()
    }
    if (freq !== 0) {
      ctx.strokeStyle = theme.arms
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(nx, ny)
      ctx.stroke()
    }
    x = nx
    y = ny
  }
  const tip = evaluate(path.terms, count, t)
  ctx.fillStyle = theme.pen
  ctx.beginPath()
  ctx.arc(tip.x, tip.y, 4 * px, 0, 2 * Math.PI)
  ctx.fill()
}
