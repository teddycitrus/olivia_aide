import { hash as argon2Hash, hashRaw as argon2HashRaw, verify as argon2Verify } from '@node-rs/argon2'
import { randomBytes, createHash } from 'node:crypto'
import { prisma } from 'wasp/server'

const JITTER_MIN_MS = 10
const JITTER_MAX_MS = 50

// OWASP-recommended argon2id "high" profile: 64 MiB memory, 3 passes, 4 lanes.
// ~100-150ms per hash/verify on this box — fine for an interactive
// create-key call and for a rate-limited (100/hr/IP) MCP endpoint, not a hot
// path.
const ARGON2_OPTS = { memoryCost: 65536, timeCost: 3, parallelism: 4 }
const LOOKUP_ARGON2_SALT = Buffer.from('nora-mcp-key-lookup-v1')
const DUMMY_SECRET = 'nora-dummy-mcp-secret-never-issued'
const DUMMY_SECRET_HASH = '$argon2id$v=19$m=65536,t=3,p=4$v2Eh/ayVwWnUe9NMy1X2FA$JHhFTuNm/+aU0dGoWfEXB8pw0ldMrwTZiG6lwpLd1V4'

export const KEY_LABEL = 'nora_'
const KEY_FINGERPRINT_LEN = 12

function jitterDelay(): Promise<void> {
  const ms = JITTER_MIN_MS + Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS))
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** One-way, truncated hash for audit logs — never log the raw secret or raw IP. */
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex').slice(0, 12)
}

export function generateApiKeyPlaintext(): string {
  return KEY_LABEL + randomBytes(32).toString('hex')
}

export async function hashApiKeyForStorage(plaintext: string): Promise<string> {
  return argon2Hash(plaintext, ARGON2_OPTS)
}

export async function lookupHashForStorage(plaintext: string): Promise<string> {
  return (await argon2HashRaw(plaintext, { ...ARGON2_OPTS, salt: LOOKUP_ARGON2_SALT })).toString('hex')
}

export function keyFingerprintOfLookupHash(keyLookupHash: string): string {
  return keyLookupHash.slice(0, KEY_FINGERPRINT_LEN)
}

export type McpAuthResult = { ok: true; userId: string; tier: 'DEFAULT' | 'PRO' | 'ADMIN' } | { ok: false }

/**
 * Verifies the X-MCP-Secret header against per-user McpApiKey rows.
 *
 * Fails closed on every path — missing header, no matching key, wrong
 * key, revoked key, unverified owner — with the same jitter and same
 * argon2id cost paid on every path, so none of those cases can be
 * distinguished by response time or response body.
 */
export async function verifyMcpSecret(providedHeader: string | string[] | undefined): Promise<McpAuthResult> {
  const hasProvided = typeof providedHeader === 'string' && providedHeader.length > 0
  const provided = hasProvided ? providedHeader : randomBytes(32).toString('hex')

  const keyLookupHash = await lookupHashForStorage(provided)

  const candidate = await prisma.mcpApiKey.findUnique({
    where: { keyLookupHash },
    select: { id: true, keyHash: true, revokedAt: true, userId: true, user: { select: { emailVerified: true, mcpTier: true } } },
  })

  let matched: typeof candidate = null
  if (candidate === null) {
    await argon2Verify(DUMMY_SECRET_HASH, DUMMY_SECRET).catch(() => false)
  } else {
    const isMatch = await argon2Verify(candidate.keyHash, provided).catch(() => false)
    if (isMatch) {
      matched = candidate
    }
  }

  if (!hasProvided || matched === null || matched.revokedAt !== null || !matched.user.emailVerified) {
    await jitterDelay()
    return { ok: false }
  }

  // Fire-and-forget: must never block or fail the request.
  void prisma.mcpApiKey.update({ where: { id: matched.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return { ok: true, userId: matched.userId, tier: matched.user.mcpTier }
}
