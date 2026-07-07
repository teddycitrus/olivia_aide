import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini 2.5 Flash — cheap/fast vision, strong enough for 4-way photo-style
// classification and structured typography extraction (see README routing table).
export const GEMINI_MODEL = 'gemini-2.5-flash'

let _client: GoogleGenerativeAI | null = null
function client(): GoogleGenerativeAI {
  if (!_client) {
    _client = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '')
  }
  return _client
}

// ---- Prompt templates ----

export const photoStylePrompt = `You are classifying the photography style of a brand's visual identity.

The candidate images are attached. Classify them into ONE of:
- "studio": clean seamless backgrounds, controlled lighting, product-only or model with product
- "lifestyle": natural environments, models using the product in context, editorial feel
- "ugc": phone-camera aesthetic, casual framing, low production value, feels like a customer took it
- "mixed": genuinely evenly split, no dominant style

Return only the single word, no explanation.`

export const typographyExtractionPrompt = `Analyze the visible text in this brand asset. Return JSON:
{
  "family": "sans-serif" | "serif" | "display" | "mono" | null,
  "weight": "light" | "regular" | "medium" | "bold" | "heavy" | null,
  "casing": "sentence" | "title" | "upper" | "lower" | null
}
Base the decision on the dominant text treatment (largest / most prominent).
If no visible text, return all nulls.
Return only the JSON.`

export type PhotoStyle = 'studio' | 'lifestyle' | 'ugc' | 'mixed'
export type Typography = {
  family: 'sans-serif' | 'serif' | 'display' | 'mono' | null
  weight: 'light' | 'regular' | 'medium' | 'bold' | 'heavy' | null
  casing: 'sentence' | 'title' | 'upper' | 'lower' | null
}

function inlineImage(dataUrl: string) {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/)
  return { inlineData: { mimeType: m ? m[1] : 'image/jpeg', data: m ? m[2] : dataUrl.replace(/^data:[^,]*,/, '') } }
}

/** Classify one or more images into a single photo style (majority intent). */
export async function classifyPhotoStyle(imageDataUrls: string[]): Promise<PhotoStyle> {
  try {
    const model = client().getGenerativeModel({ model: GEMINI_MODEL })
    const parts = [{ text: photoStylePrompt }, ...imageDataUrls.slice(0, 6).map(inlineImage)]
    const res = await withTimeout(model.generateContent(parts), 10_000)
    const word = res.response.text().trim().toLowerCase().replace(/[^a-z]/g, '')
    if (word === 'studio' || word === 'lifestyle' || word === 'ugc' || word === 'mixed') return word
    return 'mixed'
  } catch (err) {
    console.error('[gemini] classifyPhotoStyle failed, defaulting to mixed:', err)
    return 'mixed'
  }
}

/** Extract dominant typography treatment from an image with visible text. */
export async function extractTypography(imageDataUrl: string): Promise<Typography> {
  const neutral: Typography = { family: null, weight: null, casing: null }
  try {
    const model = client().getGenerativeModel({ model: GEMINI_MODEL })
    const res = await withTimeout(model.generateContent([{ text: typographyExtractionPrompt }, inlineImage(imageDataUrl)]), 10_000)
    const text = res.response.text()
    const match = text.match(/\{[\s\S]*\}/)
    return match ? (JSON.parse(match[0]) as Typography) : neutral
  } catch (err) {
    console.error('[gemini] extractTypography failed, using neutral:', err)
    return neutral
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ])
}
