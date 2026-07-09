import type { ScoredCandidate } from './ResultsCanvas'

const BAR_ACCENTS = ['bg-primary-red', 'bg-primary-blue', 'bg-primary-yellow', 'bg-primary-red'] as const

function Bar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-[10px] font-bold uppercase tracking-wide text-black/60">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden border border-black bg-muted">
        <div className={`h-full ${accent}`} style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-[10px] font-bold text-black/70">{value.toFixed(2)}</span>
    </div>
  )
}

export function HoverCard({ candidate }: { candidate: ScoredCandidate }) {
  const s = candidate.scoring
  const pass = s.onBrandOverall >= 0.7
  return (
    <div className="pointer-events-none w-64 border-4 border-black bg-white p-3 shadow-hard">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-black/50">On-brand</span>
        <span className={`font-mono text-sm font-bold ${pass ? 'text-primary-blue' : 'text-primary-red'}`}>{s.onBrandOverall.toFixed(2)}</span>
      </div>
      <div className="space-y-1">
        <Bar label="Palette" value={s.paletteMatch} accent={BAR_ACCENTS[0]} />
        <Bar label="Typography" value={s.typographyMatch} accent={BAR_ACCENTS[1]} />
        <Bar label="Photo style" value={s.photoStyleMatch} accent={BAR_ACCENTS[2]} />
        <Bar label="Product acc." value={s.productAccuracy} accent={BAR_ACCENTS[3]} />
      </div>
      <p className="mt-2 text-[11px] font-medium leading-snug text-black/70">{s.explanation}</p>
    </div>
  )
}
