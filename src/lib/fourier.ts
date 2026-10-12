import type { Point, Stroke } from './geometry'
import { loopLength, resampleLoop, toLoop } from './geometry'

/**
 * One rotating arm of the epicycle chain: r · e^{i(freq·t + phase)}.
 * In real form it contributes r·cos(freq·t + phase) to x and r·sin(freq·t + phase) to y.
 */
export interface Term {
  freq: number
  amp: number
  phase: number
}

export interface FourierPath {
  /** Terms sorted by amplitude, largest first (the constant term is usually first). */
  terms: Term[]
  /** Arc length of the loop, used to share animation time between paths. */
  length: number
  /** Total energy Σ|c|², used for error estimates. */
  energy: number
}

/**
 * Discrete Fourier transform of a closed curve treated as complex samples
 * z_n = x_n + i·y_n, with frequencies centred around 0 (−N/2 … N/2−1).
 */
export function dft(samples: Point[]): Term[] {
  const N = samples.length
  const terms: Term[] = []
  const half = Math.floor(N / 2)
  for (let k = -half; k < N - half; k++) {
    let re = 0
    let im = 0
    for (let n = 0; n < N; n++) {
      const a = (-2 * Math.PI * k * n) / N
      const c = Math.cos(a)
      const s = Math.sin(a)
      const { x, y } = samples[n]
      re += x * c - y * s
      im += x * s + y * c
    }
    re /= N
    im /= N
    terms.push({ freq: k, amp: Math.hypot(re, im), phase: Math.atan2(im, re) })
  }
  return terms.sort((a, b) => b.amp - a.amp)
}

export function fourierPath(stroke: Stroke, samples: number): FourierPath | null {
  const loop = toLoop(stroke)
  const length = loopLength(loop)
  if (loop.length < 2 || length === 0) return null
  const terms = dft(resampleLoop(loop, samples))
  const energy = terms.reduce((s, t) => s + t.amp * t.amp, 0)
  return { terms, length, energy }
}

/** Evaluate the curve with the first `count` terms at parameter t ∈ [0, 2π). */
export function evaluate(terms: Term[], count: number, t: number): Point {
  let x = 0
  let y = 0
  const n = Math.min(count, terms.length)
  for (let i = 0; i < n; i++) {
    const { freq, amp, phase } = terms[i]
    const a = freq * t + phase
    x += amp * Math.cos(a)
    y += amp * Math.sin(a)
  }
  return { x, y }
}

/** Sample the reconstructed curve at `resolution` points over one full period. */
export function reconstruct(terms: Term[], count: number, resolution: number): Point[] {
  const out: Point[] = []
  for (let i = 0; i <= resolution; i++) out.push(evaluate(terms, count, (2 * Math.PI * i) / resolution))
  return out
}

/** RMS distance between the sampled curve and its truncated series (Parseval). */
export function rmsError(path: FourierPath, count: number): number {
  let kept = 0
  for (let i = 0; i < Math.min(count, path.terms.length); i++) kept += path.terms[i].amp ** 2
  return Math.sqrt(Math.max(0, path.energy - kept))
}
