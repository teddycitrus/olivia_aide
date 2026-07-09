import { HttpError } from 'wasp/server'
import type { ListMyApiKeys } from 'wasp/server/operations'
import { KEY_LABEL } from '../lib/security/mcpAuth'
import type { SafeApiKey } from '../actions/apiKeys'

export const listMyApiKeys: ListMyApiKeys<void, SafeApiKey[]> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, 'login required')

  const rows = await context.entities.McpApiKey.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tier: row.tier,
    displayPrefix: `${KEY_LABEL}${row.keyPrefix}`,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
    lastUsedAt: row.lastUsedAt,
  }))
}
