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
    t.family === 'serif' ? 'Georgia, serif' : t.family === 'mono' ? 'ui-monospace, monospace' : t.family === 'display' ? '"Outfit", sans-serif' : 'system-ui, sans-serif'
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
    <div className="relative space-y-6 border-4 border-black bg-white p-6 shadow-hard-lg">
      <span className="absolute right-4 top-4 h-4 w-4 rounded-full bg-primary-red" />

      <div>
        <h2 className="text-lg font-black uppercase tracking-tight">{brand.name}</h2>
        <p className="text-xs font-bold text-foreground/40">{brand.domain}</p>
        <p className="mt-3 text-xs font-medium leading-relaxed text-foreground/60">
          <span className="font-bold text-black">Brand DNA</span> is the visual fingerprint pulled from this store:
          its color palette, typography, photo style, and tone. Every candidate image you score on the right gets
          compared against these traits.
        </p>
      </div>

      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-foreground/40">Palette</h3>
        <div className="space-y-2">
          {swatches.map((s, i) => (
            <PaletteSwatch key={i} swatch={s} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground/40">Typography</h3>
        <div className="border-2 border-black bg-muted p-3 text-2xl" style={sampleText(brand.typography)}>
          The quick brown fox
        </div>
        <p className="mt-1 font-mono text-xs font-bold text-foreground/40">
          {[brand.typography?.family, brand.typography?.weight, brand.typography?.casing].filter(Boolean).join(' / ') || 'unknown'}
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground/40">Photo Style</h3>
        <span className="inline-block rounded-full border-2 border-black bg-primary-yellow px-3 py-1 text-sm font-bold uppercase tracking-wide text-black">
          {STYLE_LABEL[brand.photoStyle] ?? brand.photoStyle}
        </span>
        <div className="mt-3 flex gap-2">
          {thumbs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className={`h-14 w-14 border-2 border-black object-cover grayscale transition hover:grayscale-0 ${
                i % 2 === 0 ? 'rounded-full' : 'rounded-none'
              }`}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-foreground/40">Tone</h3>
        <div className="flex flex-wrap gap-2">
          {(brand.toneWords ?? []).map((w) => (
            <span key={w} className="rounded-full border-2 border-black bg-muted px-3 py-1 text-sm font-bold text-black">
              {w}
            </span>
          ))}
        </div>
      </section>

      <section>
        <button
          className="text-xs font-bold uppercase tracking-widest text-foreground/50 hover:text-primary-blue"
          onClick={() => setAssetsOpen((v) => !v)}
        >
          {assetsOpen ? 'Hide' : 'Show'} source assets ({allAssets.length})
        </button>
        {assetsOpen && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {allAssets.slice(0, 24).map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className={`aspect-square w-full border-2 border-black object-cover grayscale transition hover:grayscale-0 ${
                  i % 2 === 0 ? 'rounded-none' : 'rounded-full'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {onRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="w-full border-2 border-black bg-white py-2 text-sm font-bold uppercase tracking-wide shadow-hard transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          {regenerating ? 'Regenerating DNA...' : 'Regenerate DNA'}
        </button>
      )}
    </div>
  )
}
