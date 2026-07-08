import type { ScoredCandidate } from './ResultsCanvas'

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-[10px] uppercase tracking-wide text-white/50">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded bg-white/15">
        <div className="h-full rounded bg-accent" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-[10px] text-white/70">{value.toFixed(2)}</span>
    </div>
  )
}

export function HoverCard({ candidate }: { candidate: ScoredCandidate }) {
  const s = candidate.scoring
  return (
    <div className="pointer-events-none w-64 rounded-xl border border-white/15 bg-black/85 p-3 shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/50">On-brand</span>
        <span className={`font-mono text-sm ${s.onBrandOverall >= 0.7 ? 'text-pass' : 'text-fail'}`}>{s.onBrandOverall.toFixed(2)}</span>
      </div>
      <div className="space-y-1">
        <Bar label="Palette" value={s.paletteMatch} />
        <Bar label="Typography" value={s.typographyMatch} />
        <Bar label="Photo style" value={s.photoStyleMatch} />
        <Bar label="Product acc." value={s.productAccuracy} />
      </div>
      <p className="mt-2 text-[11px] leading-snug text-white/70">{s.explanation}</p>
    </div>
  )
}
