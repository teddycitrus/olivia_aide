import Anthropic from '@anthropic-ai/sdk'

// Claude Sonnet 4.6 — best at nuanced qualitative language extraction + concise
// human-toned explanations (see README "why we route" table). Model id per the
// Anthropic model catalog; adaptive thinking only (budget_tokens is removed).
export const CLAUDE_MODEL = 'claude-sonnet-4-6'

// 10s hard timeout + 1 retry per PRD design principles. SDK timeout is in ms.
let _client: Anthropic | null = null
export function anthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ timeout: 10_000, maxRetries: 1 })
  }
  return _client
}

// ---- Prompt templates (never inline prompts in business logic) ----

export const toneExtractionPrompt = `Read this product copy and extract the brand's tone as 5 single-word adjectives.
Rules:
- Concrete, not vague. Prefer "playful" over "unique", "clinical" over "professional".
- No commas. No sentences.
- Return as a JSON array of 5 strings.

Product copy:
{PRODUCT_COPY}`

export const explanationPrompt = `Given:
- Brand DNA: {BRAND_DNA_JSON}
- Sub-scores: palette={p}, typography={t}, photoStyle={s}, productAccuracy={pa}, overall={o}
- Candidate image: attached

Write a 1-2 sentence explanation of the score. Address the founder as "you".
Rules:
- Be specific. Reference concrete visual attributes, not just numbers.
- If overall > 0.75, lead with the strongest point.
- If overall < 0.6, lead with the biggest single miss.
- No em dashes. No "not just X, it's Y" quips.

Return only the 1-2 sentences.`

function stripToText(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

/** Extract 5 tone adjectives from concatenated product copy. Falls back to a
 *  neutral set on any failure so extraction never hard-crashes. */
export async function extractToneWords(productCopy: string): Promise<string[]> {
  try {
    const res = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 256,
      messages: [
        { role: 'user', content: toneExtractionPrompt.replace('{PRODUCT_COPY}', productCopy.slice(0, 8000)) },
      ],
    })
    const text = stripToText(res)
    const match = text.match(/\[[\s\S]*\]/)
    const arr = JSON.parse(match ? match[0] : text) as string[]
    return arr.slice(0, 5).map((w) => String(w).toLowerCase())
  } catch (err) {
    console.error('[anthropic] extractToneWords failed, using neutral fallback:', err)
    return ['clean', 'modern', 'considered', 'direct', 'warm']
  }
}

/** Generate a 1-2 sentence explanation given sub-scores + a candidate image. */
export async function generateExplanation(args: {
  brandDnaJson: string
  scores: { paletteMatch: number; typographyMatch: number; photoStyleMatch: number; productAccuracy: number; onBrandOverall: number }
  imageDataUrl: string
}): Promise<string> {
  const { brandDnaJson, scores, imageDataUrl } = args
  const prompt = explanationPrompt
    .replace('{BRAND_DNA_JSON}', brandDnaJson)
    .replace('{p}', scores.paletteMatch.toFixed(2))
    .replace('{t}', scores.typographyMatch.toFixed(2))
    .replace('{s}', scores.photoStyleMatch.toFixed(2))
    .replace('{pa}', scores.productAccuracy.toFixed(2))
    .replace('{o}', scores.onBrandOverall.toFixed(2))

  const { mediaType, data } = parseDataUrl(imageDataUrl)
  try {
    const res = await anthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })
    return stripToText(res)
  } catch (err) {
    console.error('[anthropic] generateExplanation failed, using generic fallback:', err)
    if (scores.onBrandOverall >= 0.75) return 'This lands on-brand: the palette and product read align with your identity.'
    if (scores.onBrandOverall < 0.6) return 'This drifts off-brand, most notably on product accuracy and palette. Worth filtering before human review.'
    return 'A middling fit: some cues match your brand while others pull away. A human eye would settle it.'
  }
}

function parseDataUrl(dataUrl: string): { mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; data: string } {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.*)$/)
  if (!m) return { mediaType: 'image/jpeg', data: dataUrl.replace(/^data:[^,]*,/, '') }
  return { mediaType: m[1] as 'image/jpeg', data: m[2] }
}
