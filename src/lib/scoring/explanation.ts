import { generateExplanation } from '../ai/anthropic'

export async function explainScore(args: {
  brandDnaJson: string
  scores: { paletteMatch: number; typographyMatch: number; photoStyleMatch: number; productAccuracy: number; onBrandOverall: number }
  imageDataUrl: string
}): Promise<string> {
  return generateExplanation(args)
}
