import { useState } from 'react'
import { PaletteSwatch } from './PaletteSwatch'

type Swatch = { hex: string; weight: number }
type Typography = { family: string | null; weight: string | null; casing: string | null }

export type BrandDna = {
  name: string
  domain: string
  palette: { swatches: Swatch[] }
  photoStyle: string
  typography: Typography
  toneWords: string[]
  sourceAssets: { pdpImages: string[]; igImages: string[] }
}

const STYLE_LABEL: Record<string, string> = { studio: 'Studio', lifestyle: 'Lifestyle', ugc: 'UGC', mixed: 'Mixed' }

function sampleText(t: Typography): React.CSSProperties {
  const family =
    t.family === 'serif' ? 'Georgia, serif' : t.family === 'mono' ? 'ui-monospace, monospace' : t.family === 'display' ? '"Space Grotesk", sans-serif' : 'system-ui, sans-serif'
  const weight = t.weight === 'bold' || t.weight === 'heavy' ? 700 : t.weight === 'light' ? 300 : t.weight === 'medium' ? 500 : 400
  const transform = t.casing === 'upper' ? 'uppercase' : t.casing === 'lower' ? 'lowercase' : t.casing === 'title' ? 'capitalize' : 'none'
  return { fontFamily: family, fontWeight: weight, textTransform: transform as React.CSSProperties['textTransform'] }
}

export function BrandDnaCard({ brand, onRegenerate, regenerating }: { brand: BrandDna; onRegenerate?: () => void; regenerating?: boolean }) {
  const [assetsOpen, setAssetsOpen] = useState(false)
  const swatches = brand.palette?.swatches ?? []
  const thumbs = (brand.sourceAssets?.pdpImages ?? []).slice(0, 3)
  const allAssets = [...(brand.sourceAssets?.pdpImages ?? []), ...(brand.sourceAssets?.igImages ?? [])]

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-surface/60 p-6">
      <div>
        <h2 className="text-lg font-semibold">{brand.name}</h2>
        <p className="text-xs text-white/40">{brand.domain}</p>
        <p className="mt-3 text-xs leading-relaxed text-white/50">
          <span className="font-semibold text-white/70">Brand DNA</span> is the visual fingerprint pulled from this
          store: its color palette, typography, photo style, and tone. Every candidate image you score on the right
          gets compared against these traits.
        </p>
      </div>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Palette</h3>
        <div className="space-y-2">
          {swatches.map((s, i) => (
            <PaletteSwatch key={i} swatch={s} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">Typography</h3>
        <div className="text-2xl" style={sampleText(brand.typography)}>
          The quick brown fox
        </div>
        <p className="mt-1 font-mono text-xs text-white/40">
          {[brand.typography?.family, brand.typography?.weight, brand.typography?.casing].filter(Boolean).join(' / ') || 'unknown'}
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">Photo Style</h3>
        <span className="inline-block rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-sm text-accent">
          {STYLE_LABEL[brand.photoStyle] ?? brand.photoStyle}
        </span>
        <div className="mt-3 flex gap-2">
          {thumbs.map((src, i) => (
            <img key={i} src={src} alt="" className="h-14 w-14 rounded-md object-cover" />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">Tone</h3>
        <div className="flex flex-wrap gap-2">
          {(brand.toneWords ?? []).map((w) => (
            <span key={w} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
              {w}
            </span>
          ))}
        </div>
      </section>

      <section>
        <button className="text-xs text-white/50 hover:text-white/80" onClick={() => setAssetsOpen((v) => !v)}>
          {assetsOpen ? 'Hide' : 'Show'} source assets ({allAssets.length})
        </button>
        {assetsOpen && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {allAssets.slice(0, 24).map((src, i) => (
              <img key={i} src={src} alt="" className="aspect-square w-full rounded object-cover" />
            ))}
          </div>
        )}
      </section>

      {onRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="w-full rounded-lg border border-white/15 bg-white/5 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
        >
          {regenerating ? 'Regenerating DNA...' : 'Regenerate DNA'}
        </button>
      )}
    </div>
  )
}
