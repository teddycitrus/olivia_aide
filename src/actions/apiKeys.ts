import { HttpError } from 'wasp/server'
import type { CreateApiKey, RevokeApiKey } from 'wasp/server/operations'
import { generateApiKeyPlaintext, hashApiKeyForStorage, lookupHashForStorage, keyFingerprintOfLookupHash } from '../lib/security/mcpAuth'
import { createApiKeyArgsSchema, revokeApiKeyArgsSchema, parseOrThrow } from '../lib/security/validation'

export type SafeApiKey = {
  id: string
  name: string | null
  tier: string
  keyFingerprint: string | null
  createdAt: Date
  revokedAt: Date | null
  lastUsedAt: Date | null
}

type CreateArgs = { name?: string }
type CreateResult = SafeApiKey & { plaintextKey: string }

/** Only place the plaintext key is ever returned — never persisted, never logged. */
export const createApiKey: CreateApiKey<CreateArgs, CreateResult> = async (args, context) => {
  if (!context.user) throw new HttpError(401, 'login required')
  if (!context.user.emailVerified) throw new HttpError(403, 'verify your email before creating an API key')

  const { name } = parseOrThrow(createApiKeyArgsSchema, args)

  const plaintextKey = generateApiKeyPlaintext()
  const keyHash = await hashApiKeyForStorage(plaintextKey)
  const keyLookupHash = await lookupHashForStorage(plaintextKey)
  const keyFingerprint = keyFingerprintOfLookupHash(keyLookupHash)

  const row = await context.entities.McpApiKey.create({
    data: { userId: context.user.id, keyHash, keyLookupHash, keyFingerprint, name: name ?? null },
  })

  return {
    id: row.id,
    name: row.name,
    tier: context.user.mcpTier,
    keyFingerprint: row.keyFingerprint,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
    lastUsedAt: row.lastUsedAt,
    plaintextKey,
  }
}

type RevokeArgs = { keyId: string }

export const revokeApiKey: RevokeApiKey<RevokeArgs, SafeApiKey> = async (args, context) => {
  if (!context.user) throw new HttpError(401, 'login required')
  const { keyId } = parseOrThrow(revokeApiKeyArgsSchema, args)

  const revokedAt = new Date()
  const result = await context.entities.McpApiKey.updateMany({
    where: { id: keyId, userId: context.user.id, revokedAt: null },
    data: { revokedAt },
  })

  // Same 404 whether the key doesn't exist, belongs to someone else, or was
  // already revoked — never reveal that another user's key id is valid.
  if (result.count !== 1) throw new HttpError(404, 'key not found')

  const updated = await context.entities.McpApiKey.findUnique({ where: { id: keyId } })
  if (!updated) throw new HttpError(404, 'key not found')

  return {
    id: updated.id,
    name: updated.name,
    tier: context.user.mcpTier,
    keyFingerprint: updated.keyFingerprint,
    createdAt: updated.createdAt,
    revokedAt: updated.revokedAt,
    lastUsedAt: updated.lastUsedAt,
  }
}
