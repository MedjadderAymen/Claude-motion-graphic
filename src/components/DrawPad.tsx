import { useEffect, useRef, useState } from 'react'
import type { Point, Stroke } from '../lib/geometry'
import { simplify } from '../lib/geometry'

interface Props {
  onStrokes: (strokes: Stroke[], label: string) => void
}

const SIZE = 320

export function DrawPad({ onStrokes }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [strokes, setStrokes] = useState<Point[][]>([])
  const current = useRef<Point[] | null>(null)

  useEffect(() => redraw(canvas.current, strokes, null), [strokes])

  const pos = (e: React.PointerEvent): Point => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE }
  }

  const finishStroke = () => {
    const s = current.current
    current.current = null
    if (s && s.length > 1) setStrokes((prev) => [...prev, simplify(s, 0.4)])
  }

  return (
    <div className="input-body">
      <canvas
        ref={canvas}
        className="drawpad"
        width={SIZE}
        height={SIZE}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          current.current = [pos(e)]
        }}
        onPointerMove={(e) => {
          if (!current.current) return
          current.current.push(pos(e))
          redraw(canvas.current, strokes, current.current)
        }}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
      />
      <div className="row">
        <button className="ghost" disabled={!strokes.length} onClick={() => setStrokes((s) => s.slice(0, -1))}>
          Undo
        </button>
        <button className="ghost" disabled={!strokes.length} onClick={() => setStrokes([])}>
          Clear
        </button>
        <button
          className="primary grow"
          disabled={!strokes.length}
          onClick={() =>
            onStrokes(
              strokes.map((points) => ({ points, closed: points.length > 3 && Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y) < 8 })),
              'Drawing',
            )
          }
        >
          Generate
        </button>
      </div>
    </div>
  )
}

function redraw(canvas: HTMLCanvasElement | null, strokes: Point[][], live: Point[] | null) {
  const ctx = canvas?.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#11141b'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.strokeStyle = '#e8ecf6'
  ctx.lineWidth = 3
  ctx.lineCap = ctx.lineJoin = 'round'
  for (const s of live ? [...strokes, live] : strokes) {
    ctx.beginPath()
    s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.stroke()
  }
}
