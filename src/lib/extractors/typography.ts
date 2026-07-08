import { extractTypography, type Typography } from '../ai/google'
import type { PreppedImage } from '../images'

/**
 * Try up to 3 assets to find one with a confident typography read (visible
 * text). First non-null family wins; otherwise return the last (neutral) read.
 */
export async function extractBrandTypography(images: PreppedImage[]): Promise<Typography> {
  let last: Typography = { family: null, weight: null, casing: null }
  for (const img of images.slice(0, 3)) {
    const t = await extractTypography(img.dataUrl)
    if (t.family) return t
    last = t
  }
  return last
}
