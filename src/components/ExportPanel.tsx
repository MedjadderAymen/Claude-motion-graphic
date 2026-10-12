import { useState } from 'react'
import type { RenderOptions, Scene } from '../lib/scene'
import { download, exportGif, exportVideo, videoMimeType } from '../lib/export'

interface Props {
  scene: Scene
  options: RenderOptions
  duration: number
  name: string
}

export function ExportPanel({ scene, options, duration, name }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [size, setSize] = useState(720)
  const [error, setError] = useState<string | null>(null)
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'icon'
  const mime = videoMimeType()

  const run = async (kind: 'gif' | 'video') => {
    setBusy(kind)
    setError(null)
    setProgress(0)
    try {
      if (kind === 'gif') {
        // GIFs get large quickly, so cap the size and frame rate.
        const blob = await exportGif(scene, options, { size: Math.min(size, 540), duration, fps: 24, hold: 1.5 }, setProgress)
        download(blob, `${slug}-fourier.gif`)
      } else {
        const blob = await exportVideo(scene, options, { size, duration, fps: 60, hold: 1.5 }, setProgress)
        download(blob, `${slug}-fourier.${mime?.includes('mp4') ? 'mp4' : 'webm'}`)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="panel">
      <h3>Export animation</h3>
      <label className="slider">
        <span>Size <b>{size}×{size}</b></span>
        <input type="range" min={360} max={1440} step={60} value={size} onChange={(e) => setSize(+e.target.value)} />
      </label>
      <div className="row">
        <button className="primary grow" disabled={!!busy || !scene.paths.length} onClick={() => run('video')}>
          {busy === 'video' ? `Recording ${Math.round(progress * 100)}%` : `Video (${mime?.includes('mp4') ? 'MP4' : 'WebM'})`}
        </button>
        <button className="primary grow" disabled={!!busy || !scene.paths.length} onClick={() => run('gif')}>
          {busy === 'gif' ? `Encoding ${Math.round(progress * 100)}%` : 'GIF'}
        </button>
      </div>
      {busy === 'video' && <p className="muted small">Video records in real time. Keep this tab open.</p>}
      {error && <p className="error">{error}</p>}
    </section>
  )
}
