// One-time migration: grandfathers the legacy MCP_SHARED_SECRET (the single
// static bearer token every MCP caller used before per-user API keys
// existed) into an ADMIN-tier McpApiKey row, so existing integrations (most
// importantly Olivia's) keep working unchanged through the cutover to the
// new per-account model. Safe to re-run: no-ops if already migrated.
//
// Chosen over the alternative (invalidate the shared secret, require the
// operator to sign up and self-issue a key) because it doesn't require any
// coordinated action from existing callers at cutover time — see README's
// MCP Server section for the full rationale.
//
// Run: node --experimental-strip-types --env-file=.env.server scripts/migrate-mcp-shared-secret.ts
import { PrismaClient } from '@prisma/client'
import { hashApiKeyForStorage, lookupPrefixOf } from '../src/lib/security/mcpAuth.ts'

const MIGRATION_KEY_NAME = 'grandfathered-shared-secret'

async function main() {
  const secret = process.env.MCP_SHARED_SECRET
  if (!secret) {
    console.log('MCP_SHARED_SECRET is not set — nothing to migrate.')
    return
  }

  const prisma = new PrismaClient()
  try {
    const existing = await prisma.mcpApiKey.findFirst({ where: { name: MIGRATION_KEY_NAME } })
    if (existing) {
      console.log(`Already migrated (McpApiKey id=${existing.id}, userId=${existing.userId}). Nothing to do.`)
      return
    }

    // A bare User row with no login identity attached: this "account" is a
    // credential holder only, never a human who signs in, so it doesn't go
    // through the normal signup/verification flow.
    const systemUser = await prisma.user.create({ data: { emailVerified: true } })

    const keyHash = await hashApiKeyForStorage(secret)
    const keyPrefix = lookupPrefixOf(secret)

    const key = await prisma.mcpApiKey.create({
      data: { userId: systemUser.id, keyHash, keyPrefix, name: MIGRATION_KEY_NAME, tier: 'ADMIN' },
    })

    console.log(`Migrated MCP_SHARED_SECRET -> McpApiKey id=${key.id}, userId=${systemUser.id}, tier=ADMIN.`)
    console.log('The existing secret value keeps working against POST /mcp unchanged.')
    console.log('MCP_SHARED_SECRET is no longer read by verifyMcpSecret — safe to remove from env once you confirm this worked.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
