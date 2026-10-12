import { useEffect, useLayoutEffect, useRef } from 'react'
import type { RenderOptions, Scene } from '../lib/scene'
import { TraceCache, renderFrame } from '../lib/scene'

interface Props {
  scene: Scene
  options: RenderOptions
  duration: number
  playing: boolean
  onTogglePlay: () => void
}

/** The animated epicycle canvas, with a scrubber under it. */
export function Stage({ scene, options, duration, playing, onTogglePlay }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scrubber = useRef<HTMLInputElement>(null)
  const progress = useRef(0)
  const cache = useRef(new TraceCache())
  const state = useRef({ scene, options, duration, playing })
  useLayoutEffect(() => {
    state.current = { scene, options, duration, playing }
  })

  // New icon: restart the drawing from the beginning.
  useEffect(() => {
    progress.current = 0
    cache.current.reset()
  }, [scene])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const { scene, options, duration, playing } = state.current
      const dt = (now - last) / 1000
      last = now
      // Loop with a short pause on the finished drawing.
      if (playing) progress.current = (progress.current + dt / duration) % 1.15
      const c = canvas.current
      if (c) {
        const dpr = window.devicePixelRatio || 1
        const w = Math.round(c.clientWidth * dpr)
        const h = Math.round(c.clientHeight * dpr)
        if (c.width !== w || c.height !== h) {
          c.width = w
          c.height = h
        }
        const ctx = c.getContext('2d')!
        renderFrame(ctx, w, h, scene, Math.min(1, progress.current), options, cache.current)
      }
      if (scrubber.current) scrubber.current.value = String(Math.min(1, progress.current))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="stage">
      <canvas ref={canvas} className="stage-canvas" onClick={onTogglePlay} />
      <div className="stage-bar">
        <button className="icon-btn" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <input
          ref={scrubber}
          type="range"
          min={0}
          max={1}
          step={0.001}
          defaultValue={0}
          onChange={(e) => (progress.current = +e.target.value)}
          aria-label="Animation progress"
        />
      </div>
    </div>
  )
}
