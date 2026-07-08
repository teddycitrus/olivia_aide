import { classifyPhotoStyle, type PhotoStyle } from '../ai/google'
import type { PreppedImage } from '../images'

/** Sample up to 6 assets and classify the brand's dominant photo style. */
export async function extractPhotoStyle(images: PreppedImage[]): Promise<PhotoStyle> {
  if (!images.length) return 'mixed'
  const sample = images.slice(0, 6).map((i) => i.dataUrl)
  return classifyPhotoStyle(sample)
}
