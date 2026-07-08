import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { getBrand, extractBrand, useQuery } from 'wasp/client/operations'
import { config } from 'wasp/client'
import '../Main.css'
import { BrandDnaCard } from '../components/BrandDnaCard'
import { ThresholdSlider } from '../components/ThresholdSlider'
import { CandidateUploader } from '../components/CandidateUploader'
import { ResultsCanvas, type ScoredCandidate } from '../components/canvas/ResultsCanvas'

export function BrandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: brand, refetch } = useQuery(getBrand, { id: id! })

  const [scored, setScored] = useState<ScoredCandidate[]>([])
  const [threshold, setThreshold] = useState(0.7)
  const [showOnlyPassing, setShowOnlyPassing] = useState(false)
  const [selected, setSelected] = useState<ScoredCandidate | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  // Seed from already-scored candidates on the brand row.
  useEffect(() => {
    if (!brand) return
    const existing = (brand.candidates ?? [])
      .filter((c) => c.scoring)
      .map((c) => ({ candidateId: c.id, imageUrl: c.imageUrl, scoring: c.scoring! as ScoredCandidate['scoring'] }))
    setScored(existing)
  }, [brand?.id])

  const startStream = (urls: string[]) => {
    if (!id || !urls.length) return
    const qs = urls.map((u) => `imageUrls[]=${encodeURIComponent(u)}`).join('&')
    const es = new EventSource(`${config.apiUrl}/api/stream-scoring/${id}?${qs}`)
    setProgress({ done: 0, total: urls.length })
    es.addEventListener('score', (ev) => {
      const payload = JSON.parse((ev as MessageEvent).data)
      if (payload.scoring) {
        setScored((prev) => [...prev, { candidateId: payload.candidateId, imageUrl: payload.imageUrl, scoring: payload.scoring }])
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p))
    })
    es.addEventListener('done', () => {
      setProgress(null)
      es.close()
    })
    es.addEventListener('error', () => {
      setProgress(null)
      es.close()
    })
  }

  const regenerate = async () => {
    if (!brand) return
    setRegenerating(true)
    try {
      await extractBrand({ storeUrl: brand.storeUrl })
      await refetch()
    } finally {
      setRegenerating(false)
    }
  }

  const passCount = useMemo(() => scored.filter((c) => c.scoring.onBrandOverall >= threshold).length, [scored, threshold])

  if (!brand) return <div className="p-10 text-white/50">Loading brand…</div>

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row">
      <aside className="w-full overflow-y-auto p-6 lg:w-[35%]">
        <BrandDnaCard brand={brand as any} onRegenerate={regenerate} regenerating={regenerating} />
      </aside>

      <main className="relative flex w-full flex-col lg:w-[65%]">
        <div className="border-b border-white/10 bg-black/30 px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/70">Creative Mood Board</h2>
          <p className="mt-1 text-xs text-white/40">
            Each tile is a candidate you uploaded. Its position on the palette / photo style / product accuracy axes
            shows how well it matches the brand on that trait, further from center is a bigger mismatch. Drag to
            rotate, scroll to zoom, click a tile for the full breakdown.
          </p>
          <div className="mt-2 flex gap-4 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-pass" /> at or above threshold
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-fail" /> below threshold
            </span>
          </div>
        </div>
        <div className="relative min-h-[420px] flex-1">
          <ResultsCanvas candidates={scored} threshold={threshold} showOnlyPassing={showOnlyPassing} onSelect={setSelected} />
          {scored.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/30">
              Add candidate images below to populate the mood board.
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-white/10 bg-black/40 p-5">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>
              {passCount} / {scored.length} passing
            </span>
            {progress && (
              <span className="animate-pulse text-accent">
                scoring {progress.done} of {progress.total}…
              </span>
            )}
          </div>
          <ThresholdSlider value={threshold} onChange={setThreshold} />
          <label className="flex items-center gap-2 text-xs text-white/60">
            <input type="checkbox" checked={showOnlyPassing} onChange={(e) => setShowOnlyPassing(e.target.checked)} className="accent-accent" />
            Show only passing
          </label>
          <CandidateUploader onAdd={startStream} disabled={!!progress} />
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" onClick={() => setSelected(null)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs uppercase tracking-widest text-white/40">Candidate</div>
                <img src={selected.imageUrl} alt="" className="w-full rounded-lg object-contain" />
              </div>
              <div>
                <div className="mb-1 text-xs uppercase tracking-widest text-white/40">Matched hero</div>
                {selected.scoring.matchedHero ? (
                  <img src={selected.scoring.matchedHero} alt="" className="w-full rounded-lg object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-white/10 text-xs text-white/30">no strong product match</div>
                )}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ['Palette', selected.scoring.paletteMatch],
                  ['Typography', selected.scoring.typographyMatch],
                  ['Photo style', selected.scoring.photoStyleMatch],
                  ['Product acc.', selected.scoring.productAccuracy],
                  ['Overall', selected.scoring.onBrandOverall],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="rounded-lg bg-white/5 p-3 text-center">
                  <div className="font-mono text-lg">{v.toFixed(2)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-white/70">{selected.scoring.explanation}</p>
          </div>
        </div>
      )}
    </div>
  )
}
