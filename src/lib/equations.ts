import type { FourierPath, Term } from './fourier'

const fmt = (v: number, digits = 4) => {
  const s = Number(v.toFixed(digits)).toString()
  return s === '-0' ? '0' : s
}

const take = (p: FourierPath, count: number) => p.terms.slice(0, count).filter((t) => t.amp > 1e-6)

/** "+ 1.2" / "- 1.2" with a leading term written without its "+". */
const signed = (v: number, first: boolean) => {
  const a = fmt(Math.abs(v))
  if (first) return v < 0 ? `-${a}` : a
  return v < 0 ? ` - ${a}` : ` + ${a}`
}

type FreqFormat = (freq: number) => string

/** k·t, written as "t", "-t" or "3t". */
const plainFreq: FreqFormat = (k) => (k === 1 ? 't' : k === -1 ? '-t' : `${k}t`)
/** 2πk·t for Desmos' default t ∈ [0, 1]: "2\pi t", "-6\pi t". */
const desmosFreq: FreqFormat = (k) => `${2 * k}\\pi t`

function argLatex(t: Term, freqFmt: FreqFormat): string {
  const f = freqFmt(t.freq)
  if (Math.abs(t.phase) < 5e-5) return f
  return `${f}${signed(t.phase, false)}`
}

function sumLatex(terms: Term[], fn: 'cos' | 'sin', freqFmt: FreqFormat): string {
  if (!terms.length) return '0'
  return terms
    .map((t, i) => {
      if (t.freq === 0) {
        const c = fn === 'cos' ? t.amp * Math.cos(t.phase) : t.amp * Math.sin(t.phase)
        return signed(c, i === 0)
      }
      return `${signed(t.amp, i === 0)}\\${fn}\\left(${argLatex(t, freqFmt)}\\right)`
    })
    .join('')
}

/** Display LaTeX for one path: x_j(t) and y_j(t), for t in [0, 2π]. */
export function latexFor(p: FourierPath, count: number, index: number): { x: string; y: string } {
  const terms = take(p, count)
  const j = index + 1
  return {
    x: `x_{${j}}(t) = ${sumLatex(terms, 'cos', plainFreq)}`,
    y: `y_{${j}}(t) = ${sumLatex(terms, 'sin', plainFreq)}`,
  }
}

/**
 * Desmos expressions. Desmos plots parametric curves for t in [0, 1] by
 * default, so each frequency is multiplied by 2π.
 */
export function desmos(paths: FourierPath[], count: number): string {
  return paths
    .map((p) => {
      const terms = take(p, count)
      const x = sumLatex(terms, 'cos', desmosFreq)
      const y = sumLatex(terms, 'sin', desmosFreq)
      return `\\left(${x},${y}\\right)`
    })
    .join('\n')
}

export function python(paths: FourierPath[], count: number): string {
  const data = paths
    .map((p) => '    [' + take(p, count).map((t) => `(${t.freq}, ${fmt(t.amp, 6)}, ${fmt(t.phase, 6)})`).join(', ') + '],')
    .join('\n')
  return `import numpy as np
import matplotlib.pyplot as plt

# Each path is a list of (frequency, amplitude, phase):
#   x(t) = sum amp*cos(freq*t + phase),  y(t) = sum amp*sin(freq*t + phase),  t in [0, 2*pi]
paths = [
${data}
]

t = np.linspace(0, 2 * np.pi, 2000)
for terms in paths:
    x = sum(a * np.cos(f * t + p) for f, a, p in terms)
    y = sum(a * np.sin(f * t + p) for f, a, p in terms)
    plt.plot(x, y, color="black")
plt.gca().set_aspect("equal")
plt.axis("off")
plt.show()
`
}

export function javascript(paths: FourierPath[], count: number): string {
  const data = paths
    .map((p) => '  [' + take(p, count).map((t) => `[${t.freq}, ${fmt(t.amp, 6)}, ${fmt(t.phase, 6)}]`).join(', ') + '],')
    .join('\n')
  return `// Each path is a list of [frequency, amplitude, phase].
const paths = [
${data}
];

// Point on path \`terms\` at t in [0, 2π].
function point(terms, t) {
  let x = 0, y = 0;
  for (const [f, a, p] of terms) {
    x += a * Math.cos(f * t + p);
    y += a * Math.sin(f * t + p);
  }
  return { x, y };
}
`
}

export function json(paths: FourierPath[], count: number): string {
  return JSON.stringify(
    {
      description: 'x(t) = Σ amp·cos(freq·t + phase), y(t) = Σ amp·sin(freq·t + phase), t ∈ [0, 2π]',
      paths: paths.map((p) => take(p, count).map((t) => ({ freq: t.freq, amp: +fmt(t.amp, 6), phase: +fmt(t.phase, 6) }))),
    },
    null,
    2,
  )
}
