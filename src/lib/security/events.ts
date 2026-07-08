import { prisma } from 'wasp/server'

// Central sink for security-relevant events (rate limits tripped, SSRF blocks,
// budget exhaustion, suspected prompt injection, MCP auth failures). Never
// throws — logging a security event must never be the thing that crashes a
// request.
export async function logSecurityEvent(type: string, detail: string, ipHash?: string | null): Promise<void> {
  try {
    await prisma.securityEvent.create({ data: { type, detail: detail.slice(0, 2000), ipHash: ipHash ?? null } })
  } catch (err) {
    console.error('[security] failed to log security event (non-fatal):', err)
  }
  console.warn(`[security-event] ${type} ip=${ipHash ?? 'n/a'} ${detail.slice(0, 200)}`)
}
