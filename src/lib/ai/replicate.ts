import Replicate from 'replicate'
import { withBudget, BudgetExhaustedError } from '../security/spendCap'

const CLIP_EMBED_COST_USD = 0.001

// CLIP ViT-L/14 via Replicate — standard, cheap, fast image-similarity embeddings
// for multi-hero product-accuracy matching. Pin a known CLIP embedding model.
const CLIP_MODEL =
  'andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a'

let _client: Replicate | null = null
function client(): Replicate {
  if (!_client) _client = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  return _client
}

/** CLIP-embed a single image (data URL or public URL). Returns [] on failure. */
export async function clipEmbed(imageUrl: string): Promise<number[]> {
  try {
    return await withBudget('replicate', CLIP_EMBED_COST_USD, async () => {
      const out = (await withTimeout(
        client().run(CLIP_MODEL, { input: { inputs: imageUrl } }) as Promise<unknown>,
        15_000,
      )) as Array<{ embedding: number[] }> | { embedding: number[] } | number[]

      // The model returns [{ input, embedding }]; normalize the common shapes.
      if (Array.isArray(out) && out.length && typeof out[0] === 'object' && 'embedding' in (out[0] as object)) {
        return (out[0] as { embedding: number[] }).embedding
      }
      if (!Array.isArray(out) && out && 'embedding' in out) return (out as { embedding: number[] }).embedding
      if (Array.isArray(out) && typeof out[0] === 'number') return out as number[]
      return []
    })
  } catch (err) {
    if (err instanceof BudgetExhaustedError) throw err
    console.error('[replicate] clipEmbed failed:', err)
    return []
  }
}

export function cosineSim(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ])
}
