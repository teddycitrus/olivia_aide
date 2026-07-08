import { extractTypography, type Typography } from '../ai/google'

/**
 * Typography match. If the candidate has no visible text, return 0.5 (neutral).
 * Otherwise score each of family/weight/casing independently and average the
 * dimensions the brand actually specifies.
 */
export async function scoreTypography(brand: Typography, candidateDataUrl: string): Promise<number> {
  const cand = await extractTypography(candidateDataUrl)
  if (!cand.family && !cand.weight && !cand.casing) return 0.5 // no visible text

  const dims: Array<keyof Typography> = ['family', 'weight', 'casing']
  let scored = 0
  let total = 0
  for (const d of dims) {
    if (!brand[d]) continue
    total += 1
    if (brand[d] === cand[d]) scored += 1
    else if (cand[d] == null) scored += 0.5 // candidate silent on this dim -> neutral
  }
  return total === 0 ? 0.5 : scored / total
}
