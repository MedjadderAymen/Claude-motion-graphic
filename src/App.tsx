import { useCallback, useMemo, useState } from 'react'
import { DrawPad } from './components/DrawPad'
import { Equations } from './components/Equations'
import { ExportPanel } from './components/ExportPanel'
import { IconLibrary } from './components/IconLibrary'
import { ImageInput } from './components/ImageInput'
import { Stage } from './components/Stage'
import { SvgInput } from './components/SvgInput'
import { rmsError } from './lib/fourier'
import type { Stroke } from './lib/geometry'
import type { RenderOptions } from './lib/scene'
import { DARK, HALF_SIZE, buildScene } from './lib/scene'
import { svgToStrokes } from './lib/svg'

const SOURCES = ['Library', 'SVG', 'Image', 'Draw'] as const
type Source = (typeof SOURCES)[number]

// Lucide "heart", shown on first load.
const DEFAULT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>`

export default function App() {
  const [source, setSource] = useState<Source>('Library')
  const [strokes, setStrokes] = useState<Stroke[]>(() => svgToStrokes(DEFAULT_ICON))
  const [name, setName] = useState('heart')
  const [error, setError] = useState<string | null>(null)
  const [samples, setSamples] = useState(512)
  const [terms, setTerms] = useState(60)
  const [duration, setDuration] = useState(8)
  const [playing, setPlaying] = useState(true)
  const [showCircles, setShowCircles] = useState(true)
  const [showOriginal, setShowOriginal] = useState(false)
  const [simultaneous, setSimultaneous] = useState(false)

  const onStrokes = useCallback((s: Stroke[], label: string) => {
    setStrokes(s)
    setName(label)
    setError(null)
    setPlaying(true)
  }, [])
  const onError = useCallback((m: string) => setError(m), [])

  const scene = useMemo(() => buildScene(strokes, samples), [strokes, samples])
  const options: RenderOptions = { terms, showCircles, showOriginal, simultaneous, theme: DARK }

  const maxError = useMemo(() => {
    if (!scene.paths.length) return 0
    const worst = Math.max(...scene.paths.map((p) => rmsError(p, terms)))
    return (worst / (2 * HALF_SIZE)) * 100
  }, [scene, terms])

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="logo">∑</span>
          <div>
            <h1>Icon → Fourier</h1>
            <p>Turn any icon into the equations of rotating circles that draw it.</p>
          </div>
        </div>
      </header>

      <main>
        <aside>
          <section className="panel">
            <h3>1 · Choose an icon</h3>
            <div className="tabs">
              {SOURCES.map((s) => (
                <button key={s} className={s === source ? 'active' : ''} onClick={() => setSource(s)}>
                  {s}
                </button>
              ))}
            </div>
            {source === 'Library' && <IconLibrary onStrokes={onStrokes} onError={onError} />}
            {source === 'SVG' && <SvgInput onStrokes={onStrokes} onError={onError} />}
            {source === 'Image' && <ImageInput onStrokes={onStrokes} onError={onError} />}
            {source === 'Draw' && <DrawPad onStrokes={onStrokes} />}
            {error && <p className="error">{error}</p>}
          </section>

          <section className="panel">
            <h3>2 · Tune the series</h3>
            <label className="slider">
              <span>Circles per path <b>{terms}</b></span>
              <input type="range" min={1} max={Math.min(300, samples)} value={terms} onChange={(e) => setTerms(+e.target.value)} />
            </label>
            <label className="slider">
              <span>Samples per path <b>{samples}</b></span>
              <select value={samples} onChange={(e) => setSamples(+e.target.value)}>
                {[128, 256, 512, 1024].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="slider">
              <span>Drawing time <b>{duration}s</b></span>
              <input type="range" min={2} max={30} value={duration} onChange={(e) => setDuration(+e.target.value)} />
            </label>
            <label className="check">
              <input type="checkbox" checked={showCircles} onChange={(e) => setShowCircles(e.target.checked)} /> Show circles
            </label>
            <label className="check">
              <input type="checkbox" checked={showOriginal} onChange={(e) => setShowOriginal(e.target.checked)} /> Show target shape
            </label>
            <label className="check">
              <input type="checkbox" checked={simultaneous} onChange={(e) => setSimultaneous(e.target.checked)} /> Draw all paths at once
            </label>
          </section>

          <ExportPanel scene={scene} options={options} duration={duration} name={name} />
        </aside>

        <div className="center">
          <Stage scene={scene} options={options} duration={duration} playing={playing} onTogglePlay={() => setPlaying((p) => !p)} />
          <div className="stats">
            <span><b>{name}</b></span>
            <span>{scene.paths.length} path{scene.paths.length === 1 ? '' : 's'}</span>
            <span>{scene.paths.length * terms} circles total</span>
            <span title="Worst-path RMS deviation from the sampled icon, relative to icon size">error ≈ {maxError.toFixed(2)}%</span>
          </div>
          <Equations paths={scene.paths} terms={terms} name={name} />
        </div>
      </main>
    </div>
  )
}
