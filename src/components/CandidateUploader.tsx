import { useEffect, useRef, useState } from 'react'
import { discoverCandidateImages } from 'wasp/client/operations'

// Loose "is this worth firing a scrape for" check — full validation happens
// server-side (storeUrlSchema); this just avoids firing on every keystroke of
// a half-typed URL.
const LOOKS_LIKE_URL = /^https?:\/\/[^\s]+\.[^\s]+$/i
const DEBOUNCE_MS = 600

/** Add candidates by pasting image URLs (one per line), or by pasting a page
 *  URL — as soon as it looks like a real link, the page is auto-scraped for
 *  images on it. File uploads are out of scope for the demo; URL input keeps
 *  the whole flow serverless-friendly. */
export function CandidateUploader({ onAdd, disabled }: { onAdd: (urls: string[]) => void; disabled?: boolean }) {
  const [text, setText] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [discoverError, setDiscoverError] = useState<string | null>(null)
  const lastAttempted = useRef<string | null>(null)

  const submit = () => {
    const urls = text
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//.test(s))
    if (urls.length) {
      onAdd(urls)
      setText('')
    }
  }

  const discover = async (url: string) => {
    lastAttempted.current = url
    setDiscovering(true)
    setDiscoverError(null)
    try {
      const found = await discoverCandidateImages({ pageUrl: url })
      if (!found.length) {
        setDiscoverError('No images found on that page.')
        return
      }
      const existing = text.split(/\s+/).filter(Boolean)
      setText([...new Set([...existing, ...found])].join('\n'))
      setPageUrl('')
      lastAttempted.current = null
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : 'Could not scrape that page.')
    } finally {
      setDiscovering(false)
    }
  }

  // Auto-fires once the pasted/typed text settles into something URL-shaped —
  // no button to click. Skips re-firing on the same URL if it just failed.
  useEffect(() => {
    const url = pageUrl.trim()
    if (disabled || !LOOKS_LIKE_URL.test(url) || url === lastAttempted.current) return
    const timer = setTimeout(() => discover(url), DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageUrl, disabled])

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={pageUrl}
          onChange={(e) => setPageUrl(e.target.value)}
          disabled={disabled}
          placeholder="Paste a page URL to auto-find images on it"
          className="w-full border-2 border-black bg-white p-2 pr-24 text-sm font-medium outline-none placeholder:text-foreground/40 focus:border-primary-blue disabled:opacity-50"
        />
        {discovering && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 animate-pulse text-xs font-bold uppercase tracking-wide text-primary-blue">
            Scraping…
          </span>
        )}
      </div>
      {discoverError && <p className="text-xs font-bold text-primary-red">{discoverError}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste candidate image URLs, one per line"
        rows={3}
        className="w-full resize-none border-2 border-black bg-white p-3 text-sm font-medium outline-none placeholder:text-foreground/40 focus:border-primary-blue"
      />
      <button
        onClick={submit}
        disabled={disabled}
        className="border-2 border-black bg-primary-blue px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-hard transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
      >
        Score candidates
      </button>
    </div>
  )
}
