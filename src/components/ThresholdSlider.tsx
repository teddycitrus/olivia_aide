export function ThresholdSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs font-bold uppercase tracking-widest text-foreground/50">Threshold</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="brutal-range flex-1"
      />
      <span className="w-10 text-right font-mono text-sm font-bold text-foreground/80">{value.toFixed(2)}</span>
    </div>
  )
}
