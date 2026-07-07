// Pure scoring aggregation. Kept dependency-free so it is trivially testable.

export type SubScores = {
  paletteMatch: number
  typographyMatch: number
  photoStyleMatch: number
  productAccuracy: number
}

// Product accuracy weighted highest — this is where AI image models fail hardest.
export const WEIGHTS = {
  paletteMatch: 0.2,
  typographyMatch: 0.15,
  photoStyleMatch: 0.25,
  productAccuracy: 0.4,
} as const

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5)

/** Weighted average of the four axes -> onBrandOverall in [0,1]. */
export function computeOverall(s: SubScores): number {
  const p = clamp01(s.paletteMatch)
  const t = clamp01(s.typographyMatch)
  const ps = clamp01(s.photoStyleMatch)
  const pa = clamp01(s.productAccuracy)
  return p * WEIGHTS.paletteMatch + t * WEIGHTS.typographyMatch + ps * WEIGHTS.photoStyleMatch + pa * WEIGHTS.productAccuracy
}

/** Photo-style match: 1.0 identical, 0.5 adjacent, 0.0 opposite; cap 0.7 if brand is mixed. */
export function photoStyleMatch(brandStyle: string, candidateStyle: string): number {
  if (brandStyle === 'mixed') return 0.7
  if (brandStyle === candidateStyle) return 1.0
  const adjacent = new Set(['studio|lifestyle', 'lifestyle|studio', 'lifestyle|ugc', 'ugc|lifestyle'])
  if (adjacent.has(`${brandStyle}|${candidateStyle}`)) return 0.5
  return 0.0
}
