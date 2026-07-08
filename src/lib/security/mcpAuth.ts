import { timingSafeEqual, createHash } from 'node:crypto'

const JITTER_MIN_MS = 10
const JITTER_MAX_MS = 50

function jitterDelay(): Promise<void> {
  const ms = JITTER_MIN_MS + Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS))
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Standard constant-time secret comparison: length check is a well-known, accepted leak (secret length isn't the secret). */
function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** One-way, truncated hash for audit logs — never log the raw secret or raw IP. */
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex').slice(0, 12)
}

/**
 * Verifies the X-MCP-Secret header against MCP_SHARED_SECRET using a
 * constant-time comparison, with random jitter added on every rejection path
 * (missing header, wrong secret, unconfigured server secret) so the response
 * timing can't be used to distinguish those cases or enumerate valid secrets.
 * An unconfigured server secret fails closed — it never falls back to
 * "allow everything" just because deployment forgot to set the env var.
 */
export async function verifyMcpSecret(providedHeader: string | string[] | undefined): Promise<boolean> {
  const expected = process.env.MCP_SHARED_SECRET ?? ''
  const provided = typeof providedHeader === 'string' ? providedHeader : ''

  const ok = expected.length > 0 && provided.length > 0 && constantTimeEqual(provided, expected)
  if (!ok) await jitterDelay()
  return ok
}
