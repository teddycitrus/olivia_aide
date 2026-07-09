import { type McpServerHandler } from 'wasp/server/api'
import { handleMcpRequest } from '../lib/mcp/server'
import type { McpContext } from '../lib/mcp/tools'
import { getClientIp, hashIp } from '../lib/security/ip'
import { enforceEndpointLimits, checkRateLimit, LIMITS, MCP_TIER_LIMITS, RateLimitError } from '../lib/security/rateLimit'
import { verifyMcpSecret } from '../lib/security/mcpAuth'
import { logger } from '../lib/security/logger'

/** POST /mcp — MCP Streamable HTTP endpoint. Accepts a single JSON-RPC request. */
export const mcpServerHandler: McpServerHandler = async (req, res, context) => {
  const ipHash = hashIp(getClientIp(req))

  // Coarse pre-auth guard, keyed by IP: bounds how many argon2 verify
  // attempts any single IP can force regardless of whether the secret is
  // valid. Trips the same way for a secret-guessing flood as for any other
  // abuse — never skipped just because every attempt later fails auth.
  try {
    await enforceEndpointLimits('mcp', ipHash, LIMITS.mcpPerIp)
  } catch (err) {
    if (err instanceof RateLimitError) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds))
      res.status(429).json({ jsonrpc: '2.0', id: req.body?.id ?? null, error: { code: -32000, message: err.message } })
      return
    }
    throw err
  }

  const secretHeader = req.headers['x-mcp-secret']
  const auth = await verifyMcpSecret(secretHeader)
  if (!auth.ok) {
    res.status(401).json({ jsonrpc: '2.0', id: req.body?.id ?? null, error: { code: -32001, message: 'unauthorized: missing or invalid X-MCP-Secret' } })
    return
  }

  // The caller's real quota: per-account, per-tier, independent of IP (a
  // legitimate caller behind a shared/rotating IP shouldn't be throttled by
  // other tenants; an abusive caller can't dodge their quota by rotating IPs).
  const tierLimit = MCP_TIER_LIMITS[auth.tier]
  try {
    const { remaining } = await checkRateLimit(`mcp:user:${auth.userId}`, tierLimit.limit, tierLimit.windowMs)
    res.setHeader('X-RateLimit-Limit', String(tierLimit.limit))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)))
  } catch (err) {
    if (err instanceof RateLimitError) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds))
      res.status(429).json({ jsonrpc: '2.0', id: req.body?.id ?? null, error: { code: -32000, message: err.message } })
      return
    }
    throw err
  }

  // Audit trail: userId + IP hash only, never the raw IP or the secret in
  // any form — and the body is never logged, only the fact + shape of the
  // request.
  logger.info({ ipHash, userId: auth.userId, method: req.body?.method ?? 'unknown' }, 'mcp tool invocation')

  const body = req.body
  const response = await handleMcpRequest(body, context as unknown as McpContext)
  if (response === null) {
    // notification: acknowledge with 202 and no body
    return res.status(202).end()
  }
  res.json(response)
}
