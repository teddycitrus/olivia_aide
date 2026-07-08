export function ThresholdSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs uppercase tracking-widest text-white/40">Threshold</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-accent"
      />
      <span className="w-10 text-right font-mono text-sm text-white/70">{value.toFixed(2)}</span>
    </div>
  )
}
