import { type McpServerHandler } from 'wasp/server/api'
import { handleMcpRequest } from '../lib/mcp/server'
import type { McpContext } from '../lib/mcp/tools'
import { getClientIp, hashIp } from '../lib/security/ip'
import { enforceEndpointLimits, LIMITS, RateLimitError } from '../lib/security/rateLimit'
import { verifyMcpSecret, hashSecret } from '../lib/security/mcpAuth'
import { logger } from '../lib/security/logger'

/** POST /mcp — MCP Streamable HTTP endpoint. Accepts a single JSON-RPC request. */
export const mcpServerHandler: McpServerHandler = async (req, res, context) => {
  const ipHash = hashIp(getClientIp(req))

  // Rate-limited before auth is even checked — a secret-guessing flood
  // should trip the limiter same as any other abuse, not get a free pass
  // just because every attempt fails auth afterward.
  try {
    const { limit, remaining } = await enforceEndpointLimits('mcp', ipHash, LIMITS.mcpPerIp)
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)))
  } catch (err) {
    if (err instanceof RateLimitError) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds))
      res.status(429).json({ jsonrpc: '2.0', id: req.body?.id ?? null, error: { code: -32000, message: err.message } })
      return
    }
    throw err
  }

  const secretHeader = req.headers['x-mcp-secret']
  const authOk = await verifyMcpSecret(secretHeader)
  if (!authOk) {
    res.status(401).json({ jsonrpc: '2.0', id: req.body?.id ?? null, error: { code: -32001, message: 'unauthorized: missing or invalid X-MCP-Secret' } })
    return
  }

  // Audit trail: truncated hashes only, never the raw IP or raw secret —
  // and the body is never logged, only the fact + shape of the request.
  const secretUsedHash = hashSecret(typeof secretHeader === 'string' ? secretHeader : '')
  logger.info({ ipHash, secretUsedHash, method: req.body?.method ?? 'unknown' }, 'mcp tool invocation')

  const body = req.body
  const response = await handleMcpRequest(body, context as unknown as McpContext)
  if (response === null) {
    // notification: acknowledge with 202 and no body
    return res.status(202).end()
  }
  res.json(response)
}
