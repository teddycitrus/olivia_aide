import { clipEmbed, cosineSim } from '../ai/replicate'
import { refineProductAccuracy } from '../ai/openai'
import type { ProductHero } from '../extractors/productHeroes'

export type ProductAccuracyResult = { score: number; matchedHero: string | null }

/**
 * Multi-hero best-match product accuracy.
 * - CLIP-embed the candidate, cosine-sim against every stored PDP hero, take max.
 * - max > 0.8  -> GPT-5 refinement on the best-matching hero + candidate.
 * - 0.5..0.8   -> use the CLIP similarity directly.
 * - max < 0.5  -> 0.7 neutral (candidate probably isn't a product-hero shot).
 */
export async function scoreProductAccuracy(
  heroes: ProductHero[],
  candidateDataUrl: string,
): Promise<ProductAccuracyResult> {
  if (!heroes.length) return { score: 0.7, matchedHero: null }

  const embedding = await clipEmbed(candidateDataUrl)
  if (!embedding.length) return { score: 0.7, matchedHero: null }

  let bestSim = -1
  let bestHero: ProductHero | null = null
  for (const h of heroes) {
    const sim = cosineSim(embedding, h.embedding)
    if (sim > bestSim) {
      bestSim = sim
      bestHero = h
    }
  }
  const matchedHero = bestHero?.url ?? null

  if (bestSim > 0.8 && bestHero) {
    const refined = await refineProductAccuracy(bestHero.url, candidateDataUrl)
    return { score: refined, matchedHero }
  }
  if (bestSim >= 0.5) return { score: Math.max(0, Math.min(1, bestSim)), matchedHero }
  return { score: 0.7, matchedHero }
}
