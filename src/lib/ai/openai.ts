import OpenAI from 'openai'
import { withBudget, BudgetExhaustedError } from '../security/spendCap'

const EMBED_COST_USD = 0.001
const REFINE_COST_USD = 0.02

// GPT-5 for product-accuracy refinement (strongest at physical-object grounding
// + fine-detail comparison). text-embedding-3-large for the 3072-dim tone vector.
export const GPT_MODEL = 'gpt-5'
export const EMBEDDING_MODEL = 'text-embedding-3-large'

let _client: OpenAI | null = null
function client(): OpenAI {
  if (!_client) _client = new OpenAI({ timeout: 10_000, maxRetries: 1 })
  return _client
}

export const productAccuracyRefinementPrompt = `Two images are attached. The first is the brand's canonical product hero. The second is a candidate ad image that likely depicts the same product.

Score the product accuracy from 0.0 to 1.0:
- 1.0: same product, correct color/shape/branding elements
- 0.7: recognizably similar but with minor errors (color drift, wrong angle)
- 0.4: clearly different variant or SKU of the same product line
- 0.0: entirely different product

Return only the number.`

/** Embed text to a 3072-dim vector. Returns [] on failure (caller treats as neutral). */
export async function embedText(text: string): Promise<number[]> {
  try {
    return await withBudget('openai', EMBED_COST_USD, async () => {
      const res = await client().embeddings.create({ model: EMBEDDING_MODEL, input: text.slice(0, 8000) })
      return res.data[0]?.embedding ?? []
    })
  } catch (err) {
    if (err instanceof BudgetExhaustedError) throw err
    console.error('[openai] embedText failed:', err)
    return []
  }
}

/** Refine product-accuracy by comparing a matched hero to the candidate. */
export async function refineProductAccuracy(heroDataUrl: string, candidateDataUrl: string): Promise<number> {
  try {
    return await withBudget('openai', REFINE_COST_USD, async () => {
      const res = await client().chat.completions.create({
        model: GPT_MODEL,
        max_completion_tokens: 16,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: productAccuracyRefinementPrompt },
              { type: 'image_url', image_url: { url: heroDataUrl } },
              { type: 'image_url', image_url: { url: candidateDataUrl } },
            ],
          },
        ],
      })
      const raw = res.choices[0]?.message?.content ?? ''
      const num = parseFloat(String(raw).match(/[0-9]*\.?[0-9]+/)?.[0] ?? '')
      return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 0.7
    })
  } catch (err) {
    if (err instanceof BudgetExhaustedError) throw err
    console.error('[openai] refineProductAccuracy failed, using neutral 0.7:', err)
    return 0.7
  }
}
