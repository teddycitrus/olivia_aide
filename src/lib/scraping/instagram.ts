// Instagram is optional and best-effort only (PRD non-goal: no real IG scraping
// past the oEmbed happy path). If the handle's profile page is reachable we pull
// a handful of og:image / display_url references; any failure returns [].
//
// Fetch goes through safeFetchText (src/lib/security/ssrf.ts) — SSRF-safe even
// though the hostname is hardcoded to instagram.com, since that fetch call
// still follows redirects that must be revalidated the same way as any other.

import { safeFetchText, SsrfBlockedError } from '../security/ssrf'

export async function fetchInstagramImages(handle: string | null, max = 12): Promise<string[]> {
  if (!handle) return []
  try {
    const html = await safeFetchText(`https://www.instagram.com/${handle}/`, { timeoutMs: 4000 })
    const urls = new Set<string>()
    for (const m of html.matchAll(/"display_url":"([^"]+)"/g)) urls.add(m[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/'))
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    if (og) urls.add(og)
    return Array.from(urls).slice(0, max)
  } catch (err) {
    if (err instanceof SsrfBlockedError) throw err
    return []
  }
}
