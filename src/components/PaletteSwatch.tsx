type Swatch = { hex: string; weight: number }

export function PaletteSwatch({ swatch }: { swatch: Swatch }) {
  const pct = Math.round((swatch.weight ?? 0) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 shrink-0 border-2 border-black" style={{ backgroundColor: swatch.hex }} title={swatch.hex} />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs font-bold uppercase tracking-wide text-black">{swatch.hex}</div>
        <div className="mt-1 h-2 w-full overflow-hidden border-2 border-black bg-muted">
          <div className="h-full bg-primary-blue" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="w-9 text-right font-mono text-xs font-bold text-foreground/50">{pct}%</div>
    </div>
  )
}
