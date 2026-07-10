// Given an arbitrary ad-creative/gallery page URL, discover candidate image
// URLs on it instead of requiring the user to paste each one by hand. Same
// hand-rolled-regex approach as shopify.ts/instagram.ts, and goes through the
// same SSRF-safe fetch path (src/lib/security/ssrf.ts).

import { safeFetchText, assertSafeUrl, SsrfBlockedError } from '../security/ssrf'
import { imageUrlSchema } from '../security/validation'

const DEFAULT_MAX = 24

// Deliberately excludes site-chrome images (nav logos, icons, tracking
// pixels) that would otherwise pollute results pulled from a generic page.
const SKIP_PATTERN = /(favicon|sprite|[-_.]logo|logo[-_.]|icon[-_.]|[-_.]icon|avatar|placeholder|spacer|pixel\.|1x1|loading)/i
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i

/** Same scheme-safety normalization as shopify.ts's normalizeStoreUrl, but preserves the path — discovery targets an arbitrary page, not just a site root. */
function normalizePageUrl(raw: string): string {
  const u = raw.trim()
  const hasOtherScheme = /^[a-z][a-z0-9+.-]*:/i.test(u) && !/^https?:\/\//i.test(u)
  if (hasOtherScheme) {
    throw new SsrfBlockedError('scheme not allowed (only http/https)')
  }
  const withScheme = /^https?:\/\//i.test(u) ? u : 'https://' + u
  return new URL(withScheme).toString()
}

function extractImageUrls(html: string, baseUrl: string): string[] {
  const found = new Set<string>()

  const addCandidate = (raw: string | undefined) => {
    if (!raw) return
    const src = raw.trim()
    if (!src || src.startsWith('data:')) return
    let resolved: string
    try {
      resolved = new URL(src, baseUrl).toString()
    } catch {
      return
    }
    if (!/^https?:\/\//i.test(resolved)) return
    if (SKIP_PATTERN.test(resolved)) return
    if (!IMAGE_EXT.test(resolved)) return
    found.add(resolved)
  }

  for (const m of html.matchAll(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi)) {
    addCandidate(m[1])
  }
  for (const m of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    addCandidate(m[1])
  }
  for (const m of html.matchAll(/<img\b[^>]*\bsrcset=["']([^"']+)["']/gi)) {
    const first = m[1].split(',')[0]?.trim().split(/\s+/)[0]
    addCandidate(first)
  }

  return [...found]
}

export async function discoverImagesFromPage(rawUrl: string, max = DEFAULT_MAX): Promise<string[]> {
  const pageUrl = normalizePageUrl(rawUrl)
  await assertSafeUrl(pageUrl)
  const html = await safeFetchText(pageUrl, { timeoutMs: 6000 })
  const urls = extractImageUrls(html, pageUrl)
  const valid = urls.filter((u) => imageUrlSchema.safeParse(u).success)
  return valid.slice(0, max)
}
