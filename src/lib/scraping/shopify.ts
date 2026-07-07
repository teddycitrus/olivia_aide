// Shopify scraping. Prefers the storefront JSON endpoints (/products.json,
// /meta.json) which every Shopify store exposes — far more robust than parsing
// HTML. Falls back to homepage HTML for brand name + Instagram handle.

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

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36'

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': UA } })
  } finally {
    clearTimeout(t)
  }
}

export function normalizeStoreUrl(raw: string): { origin: string; domain: string } {
  let u = raw.trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  const parsed = new URL(u)
  return { origin: parsed.origin, domain: parsed.hostname.replace(/^www\./, '') }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Brand name via homepage <meta og:site_name> / og:title / <title>. */
async function getBrandName(origin: string, domain: string): Promise<{ name: string; instagramHandle: string | null }> {
  try {
    const res = await fetchWithTimeout(origin, 5000)
    const html = await res.text()
    const og =
      html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    const ig =
      html.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1] ?? null
    const name = (og ? og.split(/[|–—\-]/)[0] : domain).trim()
    return { name: name || domain, instagramHandle: ig && ig !== 'p' ? ig : null }
  } catch {
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
      const res = await fetchWithTimeout(origin + path, 6000)
      if (!res.ok) continue
      const json = (await res.json()) as { products?: RawProduct[] }
      const products = json.products ?? []
      if (!products.length) continue
      return products.slice(0, limit).map((p) => ({
        title: p.title ?? '',
        handle: p.handle ?? '',
        description: stripHtml(p.body_html ?? '').slice(0, 600),
        sku: p.variants?.find((v) => v.sku)?.sku ?? p.handle ?? '',
        heroImage: p.images?.[0]?.src ?? null,
      }))
    } catch {
      // try next path
    }
  }
  return []
}

/** Full store extraction entry point used by the extraction pipeline. */
export async function scrapeStore(rawUrl: string, productLimit = 6): Promise<StoreInfo> {
  const { origin, domain } = normalizeStoreUrl(rawUrl)
  const [{ name, instagramHandle }, products] = await Promise.all([
    getBrandName(origin, domain),
    getProducts(origin, productLimit),
  ])
  return { domain, storeUrl: origin, name, instagramHandle, products }
}
