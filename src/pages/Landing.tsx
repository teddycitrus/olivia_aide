import { useState } from 'react'
import { useNavigate } from 'react-router'
import { extractBrand, listBrands, useQuery } from 'wasp/client/operations'
import { config } from 'wasp/client'
import { useAuth } from 'wasp/client/auth'
import { NavBar } from '../components/NavBar'
import { Logo } from '../components/Logo'
import '../Main.css'

const CARD_ACCENTS = ['bg-primary-red', 'bg-primary-blue', 'bg-primary-yellow'] as const
const GITHUB_URL = 'https://github.com/teddycitrus/olivia_aide'
const MCP_DOCS_URL = `${GITHUB_URL}#mcp-server`

export function LandingPage() {
  const navigate = useNavigate()
  const { data: user } = useAuth()
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <NavBar
        right={
          <>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary-blue">
              GitHub
            </a>
            <a href="#mcp" className="hover:text-primary-blue">
              MCP setup
            </a>
            <a href={user ? '/dashboard' : '/login'} className="hover:text-primary-blue">
              {user ? 'Dashboard' : 'Log in'}
            </a>
          </>
        }
      />

      <section className="border-b-4 border-black">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <div className="flex flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
            <h1 className="text-4xl font-black uppercase leading-[0.9] tracking-tighter sm:text-6xl lg:text-7xl">
              Score any ad against your brand&apos;s DNA in <span className="text-primary-red">30 seconds</span>.
            </h1>
            <p className="mt-6 max-w-md text-base font-medium leading-relaxed text-foreground/70 sm:text-lg">
              The missing eval layer for AI-generated ad creative: the automated quality gate that sits between{' '}
              <span className="font-bold text-primary-blue">Olivia</span> and human review.
            </p>

            <form onSubmit={submit} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.allbirds.com"
                className="flex-1 rounded-none border-2 border-black bg-white px-4 py-3 font-medium outline-none placeholder:text-foreground/40 focus:border-primary-blue"
              />
              <button
                type="submit"
                disabled={loading}
                className="border-2 border-black bg-primary-red px-6 py-3 font-bold uppercase tracking-wider text-white shadow-hard transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              >
                {loading ? 'Extracting…' : 'Extract DNA'}
              </button>
            </form>
            {loading && (
              <p className="mt-3 animate-pulse text-sm font-medium text-foreground/60">
                Reading the store, sampling assets, extracting palette / style / tone…
              </p>
            )}
            {error && <p className="mt-3 text-sm font-bold text-primary-red">{error}</p>}
          </div>

          <div className="relative hidden min-h-[420px] overflow-hidden bg-primary-blue lg:block">
            <div className="absolute -left-10 top-10 h-56 w-56 rounded-full border-4 border-black bg-primary-yellow/90" />
            <div className="absolute right-16 top-24 h-40 w-40 rotate-45 border-4 border-black bg-white/90" />
            <div className="absolute bottom-16 left-1/3 h-32 w-32 border-4 border-black bg-primary-red/90" />
            <div
              className="absolute bottom-10 right-10 h-0 w-0 border-b-[110px] border-l-[70px] border-r-[70px] border-b-black/80 border-l-transparent border-r-transparent"
              aria-hidden
            />
          </div>
        </div>
      </section>

      {brands && brands.length > 0 && (
        <section className="border-b-4 border-black bg-primary-yellow px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-black/70">Pre-seeded examples</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {brands.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/brands/${b.id}`)}
                  className="group relative border-4 border-black bg-white p-4 text-left shadow-hard transition hover:-translate-y-1"
                >
                  <span
                    className={`absolute right-3 top-3 h-3 w-3 ${CARD_ACCENTS[i % CARD_ACCENTS.length]} ${
                      i % 3 === 1 ? 'rounded-full' : ''
                    }`}
                  />
                  <div className="text-lg font-bold">{b.name}</div>
                  <div className="text-xs font-medium text-foreground/50">{b.domain}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="mcp" className="border-b-4 border-black px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">MCP setup</h2>
          <p className="mt-4 text-sm font-medium leading-relaxed text-foreground/70 sm:text-base">
            Call the scorer directly from any MCP-compatible agent (Claude Code, Olivia, or your own tool runner)
            without going through this UI. Each caller authenticates with their own API key — there's no shared
            secret.
          </p>

          <ol className="mt-6 list-decimal space-y-1 pl-5 text-sm font-medium text-foreground/70">
            <li>
              <a href="/signup" className="font-bold text-primary-blue hover:underline">
                Sign up
              </a>{' '}
              and verify your email
            </li>
            <li>
              Open your{' '}
              <a href="/dashboard" className="font-bold text-primary-blue hover:underline">
                dashboard
              </a>{' '}
              and create a key — shown once, copy it immediately
            </li>
            <li>Send it as the header below on every request</li>
          </ol>

          <div className="mt-6 border-2 border-black bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-foreground/40">Endpoint</div>
            <div className="mt-1 font-mono text-sm">POST {config.apiUrl}/mcp</div>
          </div>

          <p className="mt-4 text-sm font-medium leading-relaxed text-foreground/70">
            Missing, unknown, or revoked keys all return 401. Requests are rate-limited per account by tier
            (100/hour by default), plus a coarse per-IP guard before auth even runs.
          </p>

          <pre className="mt-4 overflow-x-auto border-2 border-black bg-[#121212] p-4 font-mono text-xs leading-relaxed text-white sm:text-sm">
            {`curl -s -X POST ${config.apiUrl}/mcp \\
  -H "Content-Type: application/json" \\
  -H "X-MCP-Secret: <your secret>" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}
          </pre>

          <p className="mt-4 text-sm font-medium leading-relaxed text-foreground/70">
            This covers the basics. For the full list of tools, auth details, and JSON-RPC methods, see the{' '}
            <a
              href={MCP_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-primary-blue underline decoration-2 underline-offset-2 hover:text-black"
            >
              MCP Server docs on GitHub
            </a>
            .
          </p>
        </div>
      </section>

      <footer className="mt-auto bg-[#121212] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Logo />
          <div className="flex gap-4 text-xs font-bold uppercase tracking-widest text-white/60">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary-yellow">
              GitHub
            </a>
            <span>·</span>
            <a href="#mcp" className="hover:text-primary-yellow">
              MCP setup
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
