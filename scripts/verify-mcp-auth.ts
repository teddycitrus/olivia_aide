import { PrismaClient } from '@prisma/client'

process.env.SMTP_HOST ??= 'localhost'
process.env.SMTP_PORT ??= '25'
process.env.SMTP_USERNAME ??= 'verify'
process.env.SMTP_PASSWORD ??= 'verify'

const {
  generateApiKeyPlaintext,
  hashApiKeyForStorage,
  keyFingerprintOfLookupHash,
  lookupHashForStorage,
  verifyMcpSecret,
} = await import('../src/lib/security/mcpAuth.ts')

const prisma = new PrismaClient()
const RUN_ID = `verify-mcp-auth-${Date.now()}`

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
  console.log(`PASS  ${message}`)
}

function assertNoPlaintext(row: Record<string, unknown>, plaintext: string) {
  for (const [field, value] of Object.entries(row)) {
    assert(value !== plaintext, `plaintext key is not stored in McpApiKey.${field}`)
  }
}

async function createMcpApiKey(userId: string, name: string) {
  const plaintextKey = generateApiKeyPlaintext()
  const keyHash = await hashApiKeyForStorage(plaintextKey)
  const keyLookupHash = await lookupHashForStorage(plaintextKey)
  const keyFingerprint = keyFingerprintOfLookupHash(keyLookupHash)
  const row = await prisma.mcpApiKey.create({
    data: { userId, keyHash, keyLookupHash, keyFingerprint, name },
  })
  return {
    ...row,
    plaintextKey,
  }
}

async function revokeMcpApiKey(userId: string, keyId: string) {
  return prisma.mcpApiKey.updateMany({
    where: { id: keyId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

async function main() {
  const userA = await prisma.user.create({ data: { emailVerified: true, mcpTier: 'DEFAULT' } })
  const userB = await prisma.user.create({ data: { emailVerified: true, mcpTier: 'PRO' } })
  const unverifiedUser = await prisma.user.create({ data: { emailVerified: true, mcpTier: 'DEFAULT' } })

  try {
    const keyA = await createMcpApiKey(userA.id, `${RUN_ID}-a`)
    const keyB = await createMcpApiKey(userB.id, `${RUN_ID}-b`)
    const keyUnverified = await createMcpApiKey(unverifiedUser.id, `${RUN_ID}-unverified`)

    assert(keyA.plaintextKey.startsWith('nora_'), 'new API key is returned once with the expected label')
    assert(keyA.keyFingerprint !== null && keyA.keyFingerprint.length === 12, 'dashboard receives a hash-derived key fingerprint')

    const rowA = await prisma.mcpApiKey.findUniqueOrThrow({ where: { id: keyA.id } })
    assert(rowA.keyHash.startsWith('$argon2'), 'McpApiKey.keyHash stores an argon2 encoded verifier')
    assert(rowA.keyLookupHash !== null && /^[0-9a-f]+$/.test(rowA.keyLookupHash), 'McpApiKey.keyLookupHash stores a deterministic argon2 lookup hash')
    assert(!('keyPrefix' in rowA), 'McpApiKey row has no plaintext keyPrefix field')
    assertNoPlaintext(rowA as unknown as Record<string, unknown>, keyA.plaintextKey)

    const authA = await verifyMcpSecret(keyA.plaintextKey)
    assert(authA.ok && authA.userId === userA.id && authA.tier === 'DEFAULT', 'first user key verifies with DEFAULT tier')

    const authB = await verifyMcpSecret(keyB.plaintextKey)
    assert(authB.ok && authB.userId === userB.id && authB.tier === 'PRO', 'second user key verifies independently with PRO tier')

    const missing = await verifyMcpSecret(undefined)
    const unknown = await verifyMcpSecret('nora_deadbeef')
    assert(!missing.ok, 'missing key fails closed')
    assert(!unknown.ok, 'unknown key fails closed')

    await prisma.user.update({ where: { id: unverifiedUser.id }, data: { emailVerified: false } })
    const unverified = await verifyMcpSecret(keyUnverified.plaintextKey)
    assert(!unverified.ok, 'key owned by unverified user fails closed')

    const revokeResult = await revokeMcpApiKey(userA.id, keyA.id)
    assert(revokeResult.count === 1, 'revocation update affects exactly one owned active key')
    const revoked = await verifyMcpSecret(keyA.plaintextKey)
    assert(!revoked.ok, 'revoked key fails closed immediately')

    const stillValidB = await verifyMcpSecret(keyB.plaintextKey)
    assert(stillValidB.ok && stillValidB.userId === userB.id, 'revoking first user key does not affect second user key')

    const revokedRow = await prisma.mcpApiKey.findUniqueOrThrow({ where: { id: keyA.id } })
    assert(revokedRow.revokedAt !== null, 'revocation is persisted as revokedAt')

    console.log('\nVERIFY: PASS — MCP per-user API key auth lifecycle holds against the configured database.')
  } finally {
    await prisma.mcpApiKey.deleteMany({ where: { name: { startsWith: RUN_ID } } })
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id, unverifiedUser.id] } } })
    await prisma.$disconnect()
  }
}

main().catch(async (err) => {
  await prisma.$disconnect()
  if (err instanceof Error && err.message.includes("Can't reach database server")) {
    console.error('VERIFY: BLOCKED — DATABASE_URL does not point at a reachable Postgres server.')
    console.error(err.message.split('\n').find((line) => line.includes("Can't reach database server")) ?? err.message)
    process.exit(1)
  }
  console.error(err)
  process.exit(1)
})
