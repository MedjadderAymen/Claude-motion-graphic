import { useEffect, useRef, useState } from 'react'
import type { Stroke } from '../lib/geometry'
import { traceImage } from '../lib/raster'

interface Props {
  onStrokes: (strokes: Stroke[], label: string) => void
  onError: (message: string) => void
}

const MAX_SIDE = 320

export function ImageInput({ onStrokes, onError }: Props) {
  const [image, setImage] = useState<{ img: HTMLImageElement; name: string } | null>(null)
  const [auto, setAuto] = useState(true)
  const [threshold, setThreshold] = useState(128)
  const [detail, setDetail] = useState(2)
  const preview = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!image) return
    const { img, name } = image
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * k))
    const h = Math.max(1, Math.round(img.naturalHeight * k))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0, w, h)
    const strokes = traceImage(ctx.getImageData(0, 0, w, h), {
      threshold: auto ? undefined : threshold,
      minLengthRatio: detail / 100,
    })
    drawPreview(preview.current, img, strokes, w, h)
    if (strokes.length) onStrokes(strokes, name)
    else onError('No shapes found. Try adjusting the threshold.')
  }, [image, auto, threshold, detail, onStrokes, onError])

  const readFile = (file: File | undefined) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => setImage({ img, name: file.name })
    img.onerror = () => onError('Could not read that image.')
    img.src = url
  }

  return (
    <div className="input-body">
      <label className="dropzone">
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => readFile(e.target.files?.[0])} />
        <strong>Upload a PNG / JPG</strong>
        <span>Edges are traced automatically</span>
      </label>
      {image && (
        <>
          <canvas ref={preview} className="trace-preview" />
          <label className="check">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Automatic threshold
          </label>
          {!auto && (
            <label className="slider">
              <span>Threshold <b>{threshold}</b></span>
              <input type="range" min={1} max={254} value={threshold} onChange={(e) => setThreshold(+e.target.value)} />
            </label>
          )}
          <label className="slider">
            <span>Ignore contours smaller than <b>{detail}%</b></span>
            <input type="range" min={0} max={15} step={0.5} value={detail} onChange={(e) => setDetail(+e.target.value)} />
          </label>
        </>
      )}
    </div>
  )
}

function drawPreview(canvas: HTMLCanvasElement | null, img: HTMLImageElement, strokes: Stroke[], w: number, h: number) {
  if (!canvas) return
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.globalAlpha = 0.35
  ctx.drawImage(img, 0, 0, w, h)
  ctx.globalAlpha = 1
  ctx.strokeStyle = '#7cf3c4'
  ctx.lineWidth = 1.5
  for (const s of strokes) {
    ctx.beginPath()
    s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.closePath()
    ctx.stroke()
  }
}
