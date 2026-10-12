import { useState } from 'react'
import type { Stroke } from '../lib/geometry'
import { svgToStrokes } from '../lib/svg'

interface Props {
  onStrokes: (strokes: Stroke[], label: string) => void
  onError: (message: string) => void
}

export function SvgInput({ onStrokes, onError }: Props) {
  const [code, setCode] = useState('')
  const [dragging, setDragging] = useState(false)

  const load = (text: string, label: string) => {
    try {
      const strokes = svgToStrokes(text)
      if (!strokes.length) throw new Error('No drawable shapes found in that SVG.')
      onStrokes(strokes, label)
    } catch (e) {
      onError((e as Error).message)
    }
  }

  const readFile = async (file: File | undefined) => {
    if (!file) return
    load(await file.text(), file.name)
  }

  return (
    <div className="input-body">
      <label
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          readFile(e.dataTransfer.files[0])
        }}
      >
        <input type="file" accept=".svg,image/svg+xml" hidden onChange={(e) => readFile(e.target.files?.[0])} />
        <strong>Drop an SVG here</strong>
        <span>or click to choose a file</span>
      </label>
      <div className="or">or paste SVG markup</div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder='<svg viewBox="0 0 24 24">…</svg>'
        rows={5}
        spellCheck={false}
      />
      <button className="primary" disabled={!code.trim()} onClick={() => load(code, 'Pasted SVG')}>
        Generate from markup
      </button>
    </div>
  )
}
