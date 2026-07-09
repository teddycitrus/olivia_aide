export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="h-4 w-4 rounded-full bg-primary-red" />
      <span className="h-4 w-4 rotate-45 bg-primary-blue" />
      <span className="h-4 w-4 bg-primary-yellow" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
      <span className="ml-1.5 text-xl font-black uppercase tracking-tighter">Nora</span>
    </div>
  )
}
