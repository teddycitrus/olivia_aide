import { z } from 'zod'
import { HttpError } from 'wasp/server'

// Strip control characters (C0/C1), null bytes, and other non-printable
// Unicode categories from any string that flows into a prompt or gets
// persisted — scraped copy and user-supplied strings are never trusted.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1F\x7F-\x9F]/g

export function sanitizeString(input: string): string {
  return input.replace(CONTROL_CHARS, '').normalize('NFKC').trim()
}

// A well-formed http(s) URL with a real hostname (rejects "javascript:",
// bare strings with no host, etc.) — the SSRF/reserved-IP check happens
// separately (src/lib/security/ssrf.ts) once DNS is actually resolved; this
// is just shape validation before that heavier check runs.
const HTTP_URL_REGEX = /^https?:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:\d{1,5})?(\/[^\s]*)?$/i

export const storeUrlSchema = z
  .string()
  .trim()
  .min(1, 'storeUrl is required')
  .max(2048, 'storeUrl is too long')
  .transform(sanitizeString)
  .refine((s) => HTTP_URL_REGEX.test(s) || /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(s), {
    message: 'storeUrl must be a well-formed http(s) URL or bare domain',
  })

export const imageUrlSchema = z
  .string()
  .trim()
  .min(1, 'imageUrl is required')
  .max(4096, 'imageUrl is too long')
  .refine((s) => HTTP_URL_REGEX.test(s) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s), {
    message: 'imageUrl must be a well-formed http(s) URL or an image data: URL',
  })

export const brandIdSchema = z.string().trim().min(1).max(64)

export const extractBrandArgsSchema = z.object({ storeUrl: storeUrlSchema })
export const scoreCandidateArgsSchema = z.object({ brandId: brandIdSchema, imageUrl: imageUrlSchema })
export const discoverCandidateImagesArgsSchema = z.object({ pageUrl: storeUrlSchema })

export const apiKeyNameSchema = z
  .string()
  .trim()
  .max(60, 'name is too long')
  .transform(sanitizeString)
  .optional()
  .or(z.literal('').transform(() => undefined))
export const createApiKeyArgsSchema = z.object({ name: apiKeyNameSchema })
export const revokeApiKeyArgsSchema = z.object({ keyId: z.string().trim().min(1).max(64) })

/** Parses `args` with `schema`, throwing a clean 400 HttpError (never a raw ZodError) on failure. */
export function parseOrThrow<T>(schema: z.ZodType<T>, args: unknown): T {
  const result = schema.safeParse(args)
  if (!result.success) {
    const first = result.error.issues[0]
    throw new HttpError(400, first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'invalid input')
  }
  return result.data
}
