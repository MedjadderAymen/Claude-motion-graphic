import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo, useState } from 'react'
import type { FourierPath } from '../lib/fourier'
import { desmos, javascript, json, latexFor, python } from '../lib/equations'

interface Props {
  paths: FourierPath[]
  terms: number
  name: string
}

const TABS = ['Equations', 'Desmos', 'Python', 'JavaScript', 'JSON'] as const
type Tab = (typeof TABS)[number]
const RENDER_LIMIT = 8

const GENERAL = String.raw`\begin{aligned}x_j(t) &= \sum_{k} r_{k}\cos\left(n_{k}t + \varphi_{k}\right)\\ y_j(t) &= \sum_{k} r_{k}\sin\left(n_{k}t + \varphi_{k}\right)\end{aligned}\qquad t\in[0,2\pi]`

function Tex({ tex, display = true }: { tex: string; display?: boolean }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: display, throwOnError: false }), [tex, display])
  return <div className="tex" dangerouslySetInnerHTML={{ __html: html }} />
}

export function Equations({ paths, terms, name }: Props) {
  const [tab, setTab] = useState<Tab>('Equations')
  const [copied, setCopied] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const text = useMemo(() => {
    switch (tab) {
      case 'Equations':
        return paths
          .map((p, i) => {
            const { x, y } = latexFor(p, terms, i)
            return `${x}\n${y}`
          })
          .join('\n\n')
      case 'Desmos':
        return desmos(paths, terms)
      case 'Python':
        return python(paths, terms)
      case 'JavaScript':
        return javascript(paths, terms)
      case 'JSON':
        return json(paths, terms)
    }
  }, [tab, paths, terms])

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  const shown = showAll ? paths : paths.slice(0, RENDER_LIMIT)
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'icon'
  const ext: Record<Tab, string> = { Equations: 'tex', Desmos: 'txt', Python: 'py', JavaScript: 'js', JSON: 'json' }

  return (
    <section className="panel equations">
      <div className="tabs small-tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <span className="grow" />
        <button className="ghost" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
        <button
          className="ghost"
          onClick={() => {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
            a.download = `${slug}-fourier.${ext[tab]}`
            a.click()
          }}
        >
          Download
        </button>
      </div>
      {tab === 'Equations' ? (
        <div className="eq-body">
          <Tex tex={GENERAL} />
          <p className="muted small">
            Each path <i>j</i> is one closed curve drawn by a chain of rotating circles: circle <i>k</i> has radius r<sub>k</sub>, spins{' '}
            n<sub>k</sub> times per cycle and starts at angle φ<sub>k</sub>.
          </p>
          {shown.map((p, i) => {
            const { x, y } = latexFor(p, terms, i)
            return (
              <div key={i} className="eq-path">
                <div className="eq-label">Path {i + 1}</div>
                <Tex tex={x} />
                <Tex tex={y} />
              </div>
            )
          })}
          {paths.length > RENDER_LIMIT && (
            <button className="ghost" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show fewer' : `Show all ${paths.length} paths`}
            </button>
          )}
        </div>
      ) : (
        <div className="eq-body">
          {tab === 'Desmos' && (
            <p className="muted small">Paste each line into its own Desmos expression. Desmos draws parametric curves for 0 ≤ t ≤ 1, so frequencies include 2π.</p>
          )}
          <pre className="code">{text}</pre>
        </div>
      )}
    </section>
  )
}
