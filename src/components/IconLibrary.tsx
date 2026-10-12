import { useEffect, useMemo, useState } from 'react'
import type { Stroke } from '../lib/geometry'
import { svgToStrokes } from '../lib/svg'

type IconNode = [string, Record<string, string | number>][]

interface Props {
  onStrokes: (strokes: Stroke[], label: string) => void
  onError: (message: string) => void
}

const PAGE = 96

function iconSvg(node: IconNode): string {
  const children = node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`
}

const toLabel = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()

export function IconLibrary({ onStrokes, onError }: Props) {
  const [icons, setIcons] = useState<Record<string, IconNode> | null>(null)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    import('lucide').then((m) => setIcons(m.icons as unknown as Record<string, IconNode>))
  }, [])

  const matches = useMemo(() => {
    if (!icons) return []
    const q = query.trim().toLowerCase()
    return Object.keys(icons).filter((n) => !q || toLabel(n).includes(q) || n.toLowerCase().includes(q))
  }, [icons, query])

  const pick = (name: string) => {
    try {
      onStrokes(svgToStrokes(iconSvg(icons![name])), toLabel(name))
    } catch (e) {
      onError((e as Error).message)
    }
  }

  return (
    <div className="input-body">
      <input
        className="search"
        placeholder={icons ? `Search ${Object.keys(icons).length} icons…` : 'Loading icons…'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setLimit(PAGE)
        }}
      />
      <div className="icon-grid">
        {matches.slice(0, limit).map((name) => (
          <button
            key={name}
            className="icon-cell"
            title={toLabel(name)}
            onClick={() => pick(name)}
            dangerouslySetInnerHTML={{ __html: iconSvg(icons![name]) }}
          />
        ))}
      </div>
      {matches.length > limit && (
        <button className="ghost" onClick={() => setLimit(limit + PAGE)}>
          Show more ({matches.length - limit} left)
        </button>
      )}
      {icons && !matches.length && <p className="muted">No icons match “{query}”.</p>}
      <p className="muted small">Icons from Lucide (ISC license).</p>
    </div>
  )
}
