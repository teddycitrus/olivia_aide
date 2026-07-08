import { classifyPhotoStyle } from '../ai/google'
import { photoStyleMatch } from './weights'

/** Classify the candidate's photo style and score it against the brand's. */
export async function scorePhotoStyle(brandStyle: string, candidateDataUrl: string): Promise<number> {
  const candStyle = await classifyPhotoStyle([candidateDataUrl])
  return photoStyleMatch(brandStyle, candStyle)
}
