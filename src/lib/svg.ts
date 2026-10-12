import type { Point, Stroke } from './geometry'
import { dist } from './geometry'

const SHAPES = 'path, circle, ellipse, rect, line, polyline, polygon'
const SKIP = 'defs, clipPath, mask, symbol, pattern, marker, title, desc, metadata'

/**
 * Extract every drawable shape in an SVG as polylines in the root's user
 * coordinates. The SVG is mounted off-screen so the browser can resolve
 * transforms and measure path lengths for us.
 */
export function svgToStrokes(source: string): Stroke[] {
  // The HTML parser puts <svg> in the SVG namespace even when xmlns is missing.
  const parsed = new DOMParser().parseFromString(source, 'text/html').querySelector('svg')
  if (!parsed) throw new Error('That file is not a valid SVG.')
  const host = document.createElement('div')
  host.style.cssText = 'position:absolute;left:-10000px;top:0;width:512px;height:512px;visibility:hidden'
  const root = document.importNode(parsed, true) as unknown as SVGSVGElement
  root.setAttribute('width', '512')
  root.setAttribute('height', '512')
  host.appendChild(root)
  document.body.appendChild(host)
  try {
    const rootInv = root.getScreenCTM()?.inverse()
    const box = root.viewBox.baseVal
    const size = box && box.width ? Math.hypot(box.width, box.height) : 724
    const step = size / 1500
    const strokes: Stroke[] = []
    root.querySelectorAll<SVGGeometryElement>(SHAPES).forEach((el) => {
      if (el.closest(SKIP)) return
      if (getComputedStyle(el).display === 'none') return
      const len = el.getTotalLength()
      if (!len || !isFinite(len)) return
      const m = rootInv && el.getScreenCTM() ? rootInv.multiply(el.getScreenCTM()!) : null
      const map = (p: DOMPoint): Point => (m ? p.matrixTransform(m) : p)
      const n = Math.max(8, Math.min(4000, Math.ceil(len / step)))
      const ds = len / n
      let current: Point[] = []
      const flush = () => {
        if (current.length > 1) strokes.push(finish(current, ds))
        current = []
      }
      let prev: DOMPoint | null = null
      for (let i = 0; i <= n; i++) {
        const raw = el.getPointAtLength((i * len) / n)
        // A moveto adds no length, so a big gap between samples means a new subpath.
        if (prev && Math.hypot(raw.x - prev.x, raw.y - prev.y) > ds * 3) flush()
        current.push(map(raw))
        prev = raw
      }
      flush()
    })
    return strokes
  } finally {
    host.remove()
  }
}

function finish(points: Point[], ds: number): Stroke {
  const closed = points.length > 2 && dist(points[0], points[points.length - 1]) < ds * 1.5
  return { points: points.map((p) => ({ x: p.x, y: p.y })), closed }
}
