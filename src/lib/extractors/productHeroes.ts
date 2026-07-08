import { clipEmbed } from '../ai/replicate'
import type { ShopifyProduct } from '../scraping/shopify'

export type ProductHero = { url: string; sku: string; embedding: number[] }

/**
 * CLIP-embed every PDP hero image via Replicate (concurrency cap 3 to respect
 * rate limits). Heroes that fail to embed are dropped. Stored on the Brand row.
 */
export async function embedProductHeroes(products: ShopifyProduct[]): Promise<ProductHero[]> {
  const withHeroes = products.filter((p) => p.heroImage)
  const out: ProductHero[] = []
  let i = 0
  async function worker() {
    while (i < withHeroes.length) {
      const p = withHeroes[i++]
      const embedding = await clipEmbed(p.heroImage as string)
      if (embedding.length) out.push({ url: p.heroImage as string, sku: p.sku, embedding })
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, withHeroes.length) }, worker))
  return out
}
