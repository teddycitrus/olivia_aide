import { prepImage } from '../images'
import { extractPalette } from '../extractors/palette'
import { scorePalette, type Swatch } from './paletteScorer'
import { scoreTypography } from './typographyScorer'
import { scorePhotoStyle } from './photoStyleScorer'
import { scoreProductAccuracy } from './productAccuracyScorer'
import { explainScore } from './explanation'
import { computeOverall } from './weights'
import type { ProductHero } from '../extractors/productHeroes'
import type { Typography } from '../ai/google'

// A brand as it comes back from Prisma (Json columns are loosely typed).
export type BrandLike = {
  name: string
  palette: { swatches: Swatch[] }
  photoStyle: string
  typography: Typography
  toneWords: string[]
  productHeroes: ProductHero[]
}

export type ScoreResult = {
  paletteMatch: number
  typographyMatch: number
  photoStyleMatch: number
  productAccuracy: number
  onBrandOverall: number
  explanation: string
  matchedHero: string | null
}

/**
 * Score one candidate image against a brand's DNA on all 5 axes.
 * Axes 1-4 run in parallel; the explanation call waits on their results.
 */
export async function scoreCandidateImage(brand: BrandLike, imageUrl: string): Promise<ScoreResult> {
  const prepped = await prepImage(imageUrl)
  if (!prepped) {
    return { paletteMatch: 0.5, typographyMatch: 0.5, photoStyleMatch: 0.5, productAccuracy: 0.7, onBrandOverall: 0.55, explanation: 'The candidate image could not be fetched or decoded, so this is a neutral placeholder score.', matchedHero: null }
  }
  const dataUrl = prepped.dataUrl
  const brandSwatches = brand.palette?.swatches ?? []

  const [candSwatches, typographyMatch, photoStyleMatch, product] = await Promise.all([
    extractPalette([prepped]),
    scoreTypography(brand.typography, dataUrl),
    scorePhotoStyle(brand.photoStyle, dataUrl),
    scoreProductAccuracy(brand.productHeroes ?? [], dataUrl),
  ])

  const paletteMatch = scorePalette(brandSwatches, candSwatches)
  const productAccuracy = product.score
  const onBrandOverall = computeOverall({ paletteMatch, typographyMatch, photoStyleMatch, productAccuracy })

  const brandDnaJson = JSON.stringify({
    name: brand.name,
    palette: brandSwatches.map((s) => s.hex),
    photoStyle: brand.photoStyle,
    typography: brand.typography,
    toneWords: brand.toneWords,
  })

  const explanation = await explainScore({
    brandDnaJson,
    scores: { paletteMatch, typographyMatch, photoStyleMatch, productAccuracy, onBrandOverall },
    imageDataUrl: dataUrl,
  })

  return {
    paletteMatch: round(paletteMatch),
    typographyMatch: round(typographyMatch),
    photoStyleMatch: round(photoStyleMatch),
    productAccuracy: round(productAccuracy),
    onBrandOverall: round(onBrandOverall),
    explanation,
    matchedHero: product.matchedHero,
  }
}

const round = (n: number) => Number(n.toFixed(3))
