import { describe, expect, it } from 'vitest'
import { dft, evaluate, fourierPath, rmsError } from './fourier'
import { normalize, resampleLoop, simplify, toLoop } from './geometry'
import { marchingSquares, traceImage } from './raster'
import { desmos, latexFor } from './equations'

const square = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
]

describe('geometry', () => {
  it('resamples a loop evenly by arc length', () => {
    const pts = resampleLoop(square, 16)
    expect(pts).toHaveLength(16)
    expect(pts[1]).toEqual({ x: 1, y: 0 })
    expect(pts[4]).toEqual({ x: 4, y: 0 })
    expect(pts[15].x).toBeCloseTo(0)
    expect(pts[15].y).toBeCloseTo(1)
  })

  it('traces open strokes back and forth', () => {
    const loop = toLoop({ points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], closed: false })
    expect(loop.map((p) => p.x)).toEqual([0, 1, 2, 1])
  })

  it('normalizes to a centred box with y up', () => {
    const [s] = normalize([{ points: square, closed: true }], 10)
    expect(s.points[0]).toEqual({ x: -10, y: 10 })
    expect(s.points[2]).toEqual({ x: 10, y: -10 })
  })

  it('simplifies collinear points', () => {
    expect(simplify([{ x: 0, y: 0 }, { x: 1, y: 0.01 }, { x: 2, y: 0 }], 0.1)).toHaveLength(2)
  })
})

describe('fourier', () => {
  it('reconstructs samples exactly with every term', () => {
    const samples = resampleLoop(square, 32)
    const terms = dft(samples)
    samples.forEach((p, n) => {
      const q = evaluate(terms, terms.length, (2 * Math.PI * n) / samples.length)
      expect(q.x).toBeCloseTo(p.x, 8)
      expect(q.y).toBeCloseTo(p.y, 8)
    })
  })

  it('represents a circle with a single rotating term', () => {
    const circle = Array.from({ length: 64 }, (_, i) => ({ x: 3 * Math.cos((i / 64) * 2 * Math.PI), y: 3 * Math.sin((i / 64) * 2 * Math.PI) }))
    const terms = dft(circle)
    expect(terms[0].freq).toBe(1)
    expect(terms[0].amp).toBeCloseTo(3)
    expect(terms[1].amp).toBeLessThan(1e-9)
  })

  it('error shrinks as terms are added', () => {
    const p = fourierPath({ points: square, closed: true }, 256)!
    expect(rmsError(p, 5)).toBeGreaterThan(rmsError(p, 50))
    expect(rmsError(p, 256)).toBeCloseTo(0, 6)
  })
})

describe('raster', () => {
  it('traces a filled square as one loop', () => {
    const w = 10
    const ink = new Uint8Array(w * w)
    for (let y = 3; y < 7; y++) for (let x = 3; x < 7; x++) ink[y * w + x] = 1
    const loops = marchingSquares(ink, w, w)
    expect(loops).toHaveLength(1)
    expect(loops[0]).toHaveLength(16)
  })

  it('traces a ring as two loops and ignores the white background', () => {
    const w = 40
    const data = new Uint8ClampedArray(w * w * 4).fill(255)
    for (let y = 0; y < w; y++)
      for (let x = 0; x < w; x++) {
        const r = Math.hypot(x - 20, y - 20)
        if (r > 8 && r < 14) data.fill(0, (y * w + x) * 4, (y * w + x) * 4 + 3)
      }
    expect(traceImage({ width: w, height: w, data })).toHaveLength(2)
  })
})

describe('equations', () => {
  it('formats LaTeX and Desmos output', () => {
    const p = fourierPath({ points: square, closed: true }, 64)!
    const { x, y } = latexFor(p, 3, 0)
    expect(x.startsWith('x_{1}(t) =')).toBe(true)
    expect(y).toContain('\\sin')
    expect(desmos([p], 3)).toMatch(/^\\left\(.*\\pi t.*\\right\)$/)
  })
})
