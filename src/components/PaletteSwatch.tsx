type Swatch = { hex: string; weight: number }

export function PaletteSwatch({ swatch }: { swatch: Swatch }) {
  const pct = Math.round((swatch.weight ?? 0) * 100)
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 shrink-0 rounded-md border border-white/10"
        style={{ backgroundColor: swatch.hex }}
        title={swatch.hex}
      />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs uppercase tracking-wide text-white/80">{swatch.hex}</div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-white/10">
          <div className="h-full rounded bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="w-9 text-right font-mono text-xs text-white/50">{pct}%</div>
    </div>
  )
}
