import { HttpError } from 'wasp/server'
import type { CreateApiKey, RevokeApiKey } from 'wasp/server/operations'
import { generateApiKeyPlaintext, hashApiKeyForStorage, lookupPrefixOf, displayPrefixOf, KEY_LABEL } from '../lib/security/mcpAuth'
import { createApiKeyArgsSchema, revokeApiKeyArgsSchema, parseOrThrow } from '../lib/security/validation'

export type SafeApiKey = {
  id: string
  name: string | null
  tier: string
  displayPrefix: string
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
  const keyPrefix = lookupPrefixOf(plaintextKey)

  const row = await context.entities.McpApiKey.create({
    data: { userId: context.user.id, keyHash, keyPrefix, name: name ?? null },
  })

  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    displayPrefix: displayPrefixOf(plaintextKey),
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

  const existing = await context.entities.McpApiKey.findUnique({ where: { id: keyId } })
  // Same 404 whether the key doesn't exist or belongs to someone else — never
  // reveal that another user's key id is valid.
  if (!existing || existing.userId !== context.user.id) throw new HttpError(404, 'key not found')

  const updated = await context.entities.McpApiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } })

  return {
    id: updated.id,
    name: updated.name,
    tier: updated.tier,
    displayPrefix: `${KEY_LABEL}${updated.keyPrefix}`,
    createdAt: updated.createdAt,
    revokedAt: updated.revokedAt,
    lastUsedAt: updated.lastUsedAt,
  }
}
