import Vibrant from 'node-vibrant'
import { hexToSwatch, labDistance, type Swatch } from '../scoring/paletteScorer'
import type { PreppedImage } from '../images'

type RawSwatch = { hex: string; population: number }

async function vibrantSwatches(buffer: Buffer): Promise<RawSwatch[]> {
  try {
    const palette = await Vibrant.from(buffer).getPalette()
    return Object.values(palette)
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({ hex: s.getHex(), population: s.getPopulation() }))
  } catch (err) {
    console.error('[palette] vibrant failed on one asset:', err)
    return []
  }
}

/**
 * Aggregate dominant colors across all assets weighted by pixel population,
 * then greedily pick the top 5 perceptually-distinct swatches (Lab distance
 * gate) and normalize their weights. Returns top-5 swatches with Lab values.
 */
export async function extractPalette(images: PreppedImage[]): Promise<Swatch[]> {
  const all: RawSwatch[] = []
  for (const img of images) all.push(...(await vibrantSwatches(img.buffer)))
  if (!all.length) return []

  // merge near-identical colors, summing population
  const merged: Swatch[] = []
  for (const raw of all.sort((a, b) => b.population - a.population)) {
    const cand = hexToSwatch(raw.hex, raw.population)
    const near = merged.find((m) => labDistance(m, cand) < 12)
    if (near) near.weight += raw.population
    else merged.push(cand)
  }

  const top = merged.sort((a, b) => b.weight - a.weight).slice(0, 5)
  const total = top.reduce((s, x) => s + x.weight, 0) || 1
  return top.map((s) => ({ ...s, weight: Number((s.weight / total).toFixed(4)) }))
}
