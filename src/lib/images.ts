import sharp from 'sharp'
import { safeFetchBuffer } from './security/ssrf'

export type PreppedImage = { buffer: Buffer; dataUrl: string; sourceUrl: string }

// Image-bomb defense: reject anything bigger than these before we ever hand
// it to sharp/an LLM. A 4096x4096 or 32-megapixel "image" can cost seconds of
// CPU to decode and gigabytes of memory — cheap for an attacker to request,
// expensive for us to process.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_DIMENSION_PX = 4096
const MAX_MEGAPIXELS = 32_000_000

/** Fetch an image, resize to 512px longest side, return buffer + base64 data URL.
 *  Never send anything larger than 512px to any LLM (PRD design principle). */
export async function prepImage(url: string, timeoutMs = 6000): Promise<PreppedImage | null> {
  try {
    const raw = url.startsWith('data:')
      ? Buffer.from(url.split(',')[1], 'base64')
      : await safeFetchBuffer(url, { timeoutMs, maxBytes: MAX_IMAGE_BYTES })
    if (raw.length > MAX_IMAGE_BYTES) {
      console.warn('[images] rejected oversized image (bytes):', url, raw.length)
      return null
    }

    const meta = await sharp(raw).metadata()
    if (!meta.width || !meta.height) return null
    if (meta.width > MAX_DIMENSION_PX || meta.height > MAX_DIMENSION_PX) {
      console.warn('[images] rejected oversized image (dimensions):', url, meta.width, meta.height)
      return null
    }
    if (meta.width * meta.height > MAX_MEGAPIXELS) {
      console.warn('[images] rejected oversized image (megapixels):', url, meta.width * meta.height)
      return null
    }
    // Animated formats decode every frame — reject unless we ever need them.
    if (meta.pages && meta.pages > 1) {
      console.warn('[images] rejected animated image:', url)
      return null
    }

    // Strip-decode + re-encode (drops EXIF, normalizes format) regardless of
    // the source encoding — never trust the source bytes past this point.
    const buffer = await sharp(raw).resize(512, 512, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
    return { buffer, dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`, sourceUrl: url }
  } catch (err) {
    console.error('[images] prepImage failed for', url, err)
    return null
  }
}

/** Prep many images with a concurrency cap; drops failures. */
export async function prepImages(urls: string[], concurrency = 4): Promise<PreppedImage[]> {
  const out: PreppedImage[] = []
  let i = 0
  async function worker() {
    while (i < urls.length) {
      const idx = i++
      const p = await prepImage(urls[idx])
      if (p) out.push(p)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))
  return out
}
