import { scrapeStore, type ShopifyProduct } from '../scraping/shopify'
import { fetchInstagramImages } from '../scraping/instagram'
import { prepImages } from '../images'
import { embedText } from '../ai/openai'
import { extractPalette } from './palette'
import { extractPhotoStyle } from './photoStyle'
import { extractBrandTypography } from './typography'
import { extractTone } from './tone'
import { embedProductHeroes, type ProductHero } from './productHeroes'
import type { Swatch } from '../scoring/paletteScorer'
import type { PhotoStyle, Typography } from '../ai/google'

export type BrandDna = {
  domain: string
  storeUrl: string
  name: string
  palette: { swatches: Swatch[] }
  photoStyle: PhotoStyle
  typography: Typography
  toneWords: string[]
  toneVector: number[]
  sourceAssets: { pdpImages: string[]; igImages: string[] }
  productHeroes: ProductHero[]
}

// Drop Shopify pseudo-products (warranties, gift cards, return coverage) that
// aren't real hero shots.
function isRealProduct(p: ShopifyProduct): boolean {
  const junk = /(gift card|return|warranty|coverage|protection|gift-card)/i
  return Boolean(p.heroImage) && !junk.test(p.title) && !/^x-/.test(p.sku)
}

/**
 * Full extraction pipeline. Best-effort with a soft 25s budget: every step has
 * its own fallback, so a partial failure still yields a persistable Brand DNA.
 */
export async function runExtraction(storeUrl: string): Promise<BrandDna> {
  const store = await scrapeStore(storeUrl, 6)
  const products = store.products.filter(isRealProduct)

  const igImages = await fetchInstagramImages(store.instagramHandle, 12)
  const pdpImageUrls = products.map((p) => p.heroImage as string)
  const assetUrls = [...pdpImageUrls, ...igImages].slice(0, 24)

  const prepped = await prepImages(assetUrls, 4)

  // Run the independent extractors in parallel.
  const [palette, photoStyle, typography, toneWords, productHeroes] = await Promise.all([
    extractPalette(prepped),
    extractPhotoStyle(prepped),
    extractBrandTypography(prepped),
    extractTone(store.name, products),
    embedProductHeroes(products),
  ])

  const toneVector = await embedText(`${store.name}. ${toneWords.join(', ')}. ${products.map((p) => p.title).join(', ')}`)

  return {
    domain: store.domain,
    storeUrl: store.storeUrl,
    name: store.name,
    palette: { swatches: palette },
    photoStyle,
    typography,
    toneWords,
    toneVector,
    sourceAssets: { pdpImages: pdpImageUrls, igImages },
    productHeroes,
  }
}
