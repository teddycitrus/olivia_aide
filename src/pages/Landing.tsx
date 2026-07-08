import { useState } from 'react'
import { useNavigate } from 'react-router'
import { extractBrand, listBrands, useQuery } from 'wasp/client/operations'
import '../Main.css'

export function LandingPage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: brands } = useQuery(listBrands)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    try {
      const brand = await extractBrand({ storeUrl: url.trim() })
      navigate(`/brands/${brand.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <h1 className="text-4xl font-bold sm:text-5xl">Score any ad against your brand's DNA. In 30 seconds.</h1>
      <p className="mt-4 text-lg text-white/60">
        The missing eval layer for AI-generated ad creative — the automated quality gate that sits between{' '}
        <span className="text-accent">Olivia</span> and human review.
      </p>

      <form onSubmit={submit} className="mt-8 flex gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.allbirds.com"
          className="flex-1 rounded-lg border border-white/15 bg-black/30 px-4 py-3 outline-none placeholder:text-white/30 focus:border-accent/60"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent px-6 py-3 font-medium text-black hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? 'Extracting…' : 'Extract DNA'}
        </button>
      </form>
      {loading && <p className="mt-3 animate-pulse text-sm text-white/40">Reading the store, sampling assets, extracting palette / style / tone…</p>}
      {error && <p className="mt-3 text-sm text-fail">{error}</p>}

      {brands && brands.length > 0 && (
        <div className="mt-14">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Pre-seeded examples</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate(`/brands/${b.id}`)}
                className="rounded-xl border border-white/10 bg-surface/60 p-4 text-left hover:border-accent/40"
              >
                <div className="font-semibold">{b.name}</div>
                <div className="text-xs text-white/40">{b.domain}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <footer className="mt-16 flex gap-4 text-xs text-white/40">
        <a href="https://github.com" className="hover:text-white/70">GitHub</a>
        <span>·</span>
        <a href="#mcp" className="hover:text-white/70">MCP setup</a>
      </footer>
    </div>
  )
}
