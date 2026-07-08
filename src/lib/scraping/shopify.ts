// Shopify scraping. Prefers the storefront JSON endpoints (/products.json,
// /meta.json) which every Shopify store exposes — far more robust than parsing
// HTML. Falls back to homepage HTML for brand name + Instagram handle.
//
// Every fetch here goes through safeFetchText/safeFetchJson (src/lib/security/ssrf.ts):
// DNS is resolved and validated as public before connecting, so a store URL
// pointed at 169.254.169.254, 10.0.0.0/8, etc. is rejected before any request
// is issued.

import { safeFetchText, safeFetchJson, assertSafeUrl, SsrfBlockedError } from '../security/ssrf'
import { sanitizeString } from '../security/validation'

export type ShopifyProduct = {
  title: string
  handle: string
  description: string
  sku: string
  heroImage: string | null
}

export type StoreInfo = {
  domain: string
  storeUrl: string
  name: string
  instagramHandle: string | null
  products: ShopifyProduct[]
}

/**
 * Normalizes a user-supplied store URL. Rejects any input that already
 * specifies a non-http(s) scheme (file:, ftp:, gopher:, data:, ...) BEFORE
 * naively prepending "https://" — that prepend step exists only to let users
 * type a bare domain, and must never be allowed to mangle a disallowed
 * scheme into something that merely *looks* like an https:// hostname.
 */
export function normalizeStoreUrl(raw: string): { origin: string; domain: string } {
  const u = raw.trim()
  const hasOtherScheme = /^[a-z][a-z0-9+.-]*:/i.test(u) && !/^https?:\/\//i.test(u)
  if (hasOtherScheme) {
    throw new SsrfBlockedError(`scheme not allowed (only http/https)`)
  }
  const withScheme = /^https?:\/\//i.test(u) ? u : 'https://' + u
  const parsed = new URL(withScheme)
  return { origin: parsed.origin, domain: parsed.hostname.replace(/^www\./, '') }
}

function stripHtml(html: string): string {
  return html
    // Remove script/style BLOCK CONTENT first — stripping only the tags
    // would leave raw JS/CSS text behind as if it were product copy.
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Brand name via homepage <meta og:site_name> / og:title / <title>. */
async function getBrandName(origin: string, domain: string): Promise<{ name: string; instagramHandle: string | null }> {
  try {
    const html = await safeFetchText(origin, { timeoutMs: 5000 })
    const og =
      html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    const ig =
      html.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1] ?? null
    const name = sanitizeString((og ? og.split(/[|–—\-]/)[0] : domain).trim())
    return { name: name || domain, instagramHandle: ig && ig !== 'p' ? ig : null }
  } catch (err) {
    // An SSRF block (e.g. a redirect chain that lands on a private IP) is a
    // real rejection, not "the site happened to be unreachable" — it must
    // propagate, never be masked as a normal fallback.
    if (err instanceof SsrfBlockedError) throw err
    return { name: domain, instagramHandle: null }
  }
}

type RawProduct = {
  title: string
  handle: string
  body_html?: string
  images?: Array<{ src: string }>
  variants?: Array<{ sku?: string }>
}

/** Top N products via /products.json (Shopify storefront JSON). */
async function getProducts(origin: string, limit: number): Promise<ShopifyProduct[]> {
  for (const path of [`/products.json?limit=${limit}`, `/collections/all/products.json?limit=${limit}`]) {
    try {
      const json = await safeFetchJson<{ products?: RawProduct[] }>(origin + path, { timeoutMs: 6000 })
      const products = json.products ?? []
      if (!products.length) continue
      return products.slice(0, limit).map((p) => ({
        title: sanitizeString(p.title ?? ''),
        handle: p.handle ?? '',
        description: sanitizeString(stripHtml(p.body_html ?? '').slice(0, 600)),
        sku: p.variants?.find((v) => v.sku)?.sku ?? p.handle ?? '',
        heroImage: p.images?.[0]?.src ?? null,
      }))
    } catch (err) {
      if (err instanceof SsrfBlockedError) throw err
      // try next path
    }
  }
  return []
}

/**
 * Full store extraction entry point used by the extraction pipeline —
 * called both from the extractBrand action AND directly from the MCP
 * extract_brand tool, so the upfront SSRF check belongs here, not only in
 * the action wrapper, or the MCP path would have no fail-fast protection.
 */
export async function scrapeStore(rawUrl: string, productLimit = 6): Promise<StoreInfo> {
  const { origin, domain } = normalizeStoreUrl(rawUrl)
  await assertSafeUrl(origin)
  const [{ name, instagramHandle }, products] = await Promise.all([
    getBrandName(origin, domain),
    getProducts(origin, productLimit),
  ])
  return { domain, storeUrl: origin, name, instagramHandle, products }
}
