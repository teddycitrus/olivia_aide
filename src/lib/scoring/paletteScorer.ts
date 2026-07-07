import chroma from 'chroma-js'

export type Swatch = { hex: string; labL: number; labA: number; labB: number; weight: number }

/** CIE76 distance in Lab space between two swatches. */
export function labDistance(a: { labL: number; labA: number; labB: number }, b: { labL: number; labA: number; labB: number }): number {
  const dl = a.labL - b.labL
  const da = a.labA - b.labA
  const db = a.labB - b.labB
  return Math.sqrt(dl * dl + da * da + db * db)
}

/** Map a Lab distance to a 0-1 similarity: 1.0 at distance 0, 0.0 at distance >= 60. */
export function distanceToScore(dist: number): number {
  return Math.max(0, Math.min(1, 1 - dist / 60))
}

export function hexToSwatch(hex: string, weight: number): Swatch {
  const [labL, labA, labB] = chroma(hex).lab()
  return { hex, labL, labA, labB, weight }
}

/**
 * Palette match: for each brand swatch, find the nearest candidate swatch by
 * CIE76 Lab distance, convert to a 0-1 sub-score, and combine as a weighted
 * geometric mean (weighted by the brand-side weights). Geometric mean punishes
 * a single badly-missed dominant color harder than an arithmetic mean would.
 */
export function scorePalette(brandSwatches: Swatch[], candidateSwatches: Swatch[]): number {
  if (!brandSwatches.length || !candidateSwatches.length) return 0.5 // neutral if either side is empty
  let logSum = 0
  let weightSum = 0
  for (const b of brandSwatches) {
    let best = Infinity
    for (const c of candidateSwatches) {
      const d = labDistance(b, c)
      if (d < best) best = d
    }
    const s = distanceToScore(best)
    const w = b.weight > 0 ? b.weight : 0.0001
    // clamp score away from 0 so log is finite; a total miss still tanks the mean
    logSum += w * Math.log(Math.max(s, 0.0001))
    weightSum += w
  }
  if (weightSum === 0) return 0.5
  return Math.exp(logSum / weightSum)
}
