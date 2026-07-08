import { extractToneWords } from '../ai/anthropic'
import type { ShopifyProduct } from '../scraping/shopify'

/** Concatenate product titles + descriptions and extract 5 tone adjectives. */
export async function extractTone(brandName: string, products: ShopifyProduct[]): Promise<string[]> {
  const copy = [
    brandName,
    ...products.map((p) => `${p.title}. ${p.description}`),
  ]
    .filter(Boolean)
    .join('\n')
  return extractToneWords(copy)
}
