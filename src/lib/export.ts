import { GIFEncoder, applyPalette, quantize } from 'gifenc'
import type { RenderOptions, Scene } from './scene'
import { TraceCache, renderFrame } from './scene'

export interface ExportSettings {
  size: number
  duration: number
  fps: number
  /** Seconds to hold the finished drawing at the end. */
  hold: number
}

type Progress = (fraction: number) => void

const nextTick = () => new Promise((r) => setTimeout(r, 0))

function canvas(size: number) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  return { c, ctx }
}

export async function exportGif(scene: Scene, opts: RenderOptions, s: ExportSettings, onProgress: Progress): Promise<Blob> {
  const { ctx } = canvas(s.size)
  const cache = new TraceCache()
  // One palette from the finished drawing keeps colours stable across frames.
  renderFrame(ctx, s.size, s.size, scene, 1, { ...opts, showCircles: true }, cache)
  const reference = ctx.getImageData(0, 0, s.size, s.size).data
  const palette = quantize(reference, 128)
  const gif = GIFEncoder()
  const frames = Math.max(2, Math.round(s.duration * s.fps))
  const delay = Math.round(1000 / s.fps)
  for (let i = 0; i <= frames; i++) {
    renderFrame(ctx, s.size, s.size, scene, i / frames, opts, cache)
    const { data } = ctx.getImageData(0, 0, s.size, s.size)
    const last = i === frames
    gif.writeFrame(applyPalette(data, palette), s.size, s.size, {
      palette,
      delay: last ? delay + s.hold * 1000 : delay,
    })
    if (i % 4 === 0) {
      onProgress(i / frames)
      await nextTick()
    }
  }
  gif.finish()
  onProgress(1)
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' })
}

export function videoMimeType(): string | null {
  const candidates = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return candidates.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? null
}

/** Records the animation in real time with MediaRecorder. */
export async function exportVideo(scene: Scene, opts: RenderOptions, s: ExportSettings, onProgress: Progress): Promise<Blob> {
  const mime = videoMimeType()
  if (!mime) throw new Error('This browser cannot record video. Try GIF export instead.')
  const { c, ctx } = canvas(s.size)
  const cache = new TraceCache()
  renderFrame(ctx, s.size, s.size, scene, 0, opts, cache)
  const stream = c.captureStream(s.fps)
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const done = new Promise<void>((resolve) => (recorder.onstop = () => resolve()))
  recorder.start()
  const total = s.duration + s.hold
  await new Promise<void>((resolve) => {
    const t0 = performance.now()
    const tick = () => {
      const elapsed = (performance.now() - t0) / 1000
      renderFrame(ctx, s.size, s.size, scene, Math.min(1, elapsed / s.duration), opts, cache)
      onProgress(Math.min(1, elapsed / total))
      if (elapsed < total) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
  recorder.stop()
  await done
  stream.getTracks().forEach((t) => t.stop())
  return new Blob(chunks, { type: mime.split(';')[0] })
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
