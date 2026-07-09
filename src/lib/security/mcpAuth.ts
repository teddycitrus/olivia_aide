import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2'
import { randomBytes, createHash } from 'node:crypto'
import { prisma } from 'wasp/server'

const JITTER_MIN_MS = 10
const JITTER_MAX_MS = 50

// OWASP-recommended argon2id "high" profile: 64 MiB memory, 3 passes, 4 lanes.
// ~100-150ms per hash/verify on this box — fine for an interactive
// create-key call and for a rate-limited (100/hr/IP) MCP endpoint, not a hot
// path.
const ARGON2_OPTS = { memoryCost: 65536, timeCost: 3, parallelism: 4 }

export const KEY_LABEL = 'nora_'
// Chars of the random portion (not the constant "nora_" label) used as an
// indexed DB lookup key. argon2id hashes are salted, so we can't index by
// keyHash directly (equal plaintexts, let alone different ones, don't
// produce equal hash strings) — this prefix is what makes the lookup an
// O(1)-ish index scan instead of a table scan, at the cost of a small,
// non-unique-enforced chance of two different keys sharing a prefix (32 bits
// of entropy; verifyMcpSecret already handles multiple candidates per
// prefix by argon2-verifying each one).
const LOOKUP_PREFIX_LEN = 8

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

/** The indexed lookup slice of a plaintext key — see LOOKUP_PREFIX_LEN. */
export function lookupPrefixOf(plaintext: string): string {
  return plaintext.slice(KEY_LABEL.length, KEY_LABEL.length + LOOKUP_PREFIX_LEN)
}

/** Display-only prefix shown once in the dashboard, e.g. "nora_a1b2c3d4". Never used for auth. */
export function displayPrefixOf(plaintext: string): string {
  return plaintext.slice(0, KEY_LABEL.length + LOOKUP_PREFIX_LEN)
}

export async function hashApiKeyForStorage(plaintext: string): Promise<string> {
  return argon2Hash(plaintext, ARGON2_OPTS)
}

// Computed once, lazily, on first use: a valid argon2id hash of a value that
// was never issued as a real key. Verifying against this on every path that
// finds no DB candidate keeps that path's cost equal to a real (wrong or
// revoked) match, so response timing can't distinguish "no such prefix
// exists" from "found a row but rejected it" — see verifyMcpSecret.
let dummyHashPromise: Promise<string> | null = null
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) dummyHashPromise = argon2Hash(randomBytes(32).toString('hex'), ARGON2_OPTS)
  return dummyHashPromise
}

export type McpAuthResult = { ok: true; userId: string; tier: 'DEFAULT' | 'PRO' | 'ADMIN' } | { ok: false }

/**
 * Verifies the X-MCP-Secret header against per-user McpApiKey rows.
 *
 * Fails closed on every path — missing header, no matching prefix, wrong
 * key, revoked key, unverified owner — with the same jitter and same
 * argon2id cost paid on every path, so none of those cases can be
 * distinguished by response time or response body.
 */
export async function verifyMcpSecret(providedHeader: string | string[] | undefined): Promise<McpAuthResult> {
  const provided = typeof providedHeader === 'string' ? providedHeader : ''

  if (!provided) {
    await argon2Verify(await getDummyHash(), randomBytes(32).toString('hex')).catch(() => false)
    await jitterDelay()
    return { ok: false }
  }

  const candidates = await prisma.mcpApiKey.findMany({
    where: { keyPrefix: lookupPrefixOf(provided) },
    select: { id: true, keyHash: true, revokedAt: true, tier: true, userId: true, user: { select: { emailVerified: true } } },
  })

  let matched: (typeof candidates)[number] | null = null
  if (candidates.length === 0) {
    await argon2Verify(await getDummyHash(), provided).catch(() => false)
  } else {
    for (const candidate of candidates) {
      const isMatch = await argon2Verify(candidate.keyHash, provided).catch(() => false)
      if (isMatch) {
        matched = candidate
        break
      }
    }
  }

  if (matched === null || matched.revokedAt !== null || !matched.user.emailVerified) {
    await jitterDelay()
    return { ok: false }
  }

  // Fire-and-forget: must never block or fail the request.
  void prisma.mcpApiKey.update({ where: { id: matched.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return { ok: true, userId: matched.userId, tier: matched.tier }
}
