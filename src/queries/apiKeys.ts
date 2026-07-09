import { HttpError } from 'wasp/server'
import type { ListMyApiKeys } from 'wasp/server/operations'
import type { SafeApiKey } from '../actions/apiKeys'

export const listMyApiKeys: ListMyApiKeys<void, SafeApiKey[]> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, 'login required')
  const user = context.user

  const rows = await context.entities.McpApiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tier: user.mcpTier,
    keyFingerprint: row.keyFingerprint,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
    lastUsedAt: row.lastUsedAt,
  }))
}
