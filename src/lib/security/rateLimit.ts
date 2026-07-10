import { prisma } from 'wasp/server'
import { HttpError } from 'wasp/server'
import { logSecurityEvent } from './events'

export class RateLimitError extends HttpError {
  constructor(public readonly retryAfterSeconds: number) {
    super(429, `Rate limit exceeded. Try again in ${retryAfterSeconds}s.`)
  }
}

const HOUR_MS = 3_600_000
const MINUTE_MS = 60_000

// Non-negotiable limits from the security pass. Per-IP limits protect a
// single abusive client; the global backstop protects against a botnet
// spreading requests across many IPs.
export const LIMITS = {
  extractBrandPerIp: { limit: 3, windowMs: HOUR_MS },
  scoreCandidatePerIp: { limit: 30, windowMs: HOUR_MS },
  batchScorePerIp: { limit: 3, windowMs: HOUR_MS },
  discoverImagesPerIp: { limit: 10, windowMs: HOUR_MS },
  batchScoreMaxCandidates: 15,
  // Coarse, pre-auth guard: bounds how many argon2id verify attempts (~120ms
  // of CPU each) any single IP can force regardless of whether the secret
  // turns out to be valid. The REAL per-caller quota is MCP_TIER_LIMITS
  // below, applied only after a request authenticates.
  mcpPerIp: { limit: 100, windowMs: HOUR_MS },
  globalPerEndpoint: { limit: 20, windowMs: MINUTE_MS },
  // Wasp's built-in email-auth endpoints (login/signup/request-password-reset/
  // reset-password/verify-email) — a public signup surface needs its own
  // abuse controls: login guards against credential stuffing, signup against
  // mass account creation, request-password-reset against email-bombing an
  // arbitrary victim address (it sends mail regardless of who's asking).
  authLoginPerIp: { limit: 10, windowMs: HOUR_MS },
  authSignupPerIp: { limit: 5, windowMs: HOUR_MS },
  authRequestPasswordResetPerIp: { limit: 5, windowMs: HOUR_MS },
  authResetPasswordPerIp: { limit: 10, windowMs: HOUR_MS },
  authVerifyEmailPerIp: { limit: 10, windowMs: HOUR_MS },
} as const

// Per-account MCP quota, keyed by (userId, hour) rather than IP once a
// request has authenticated. Every new signup starts at DEFAULT; ADMIN is
// reserved for the grandfathered shared-secret migration (see
// scripts/migrate-mcp-shared-secret.ts) and any account an operator bumps by
// hand. There is no self-service upgrade path.
export const MCP_TIER_LIMITS: Record<'DEFAULT' | 'PRO' | 'ADMIN', { limit: number; windowMs: number }> = {
  DEFAULT: { limit: 100, windowMs: HOUR_MS },
  PRO: { limit: 1000, windowMs: HOUR_MS },
  ADMIN: { limit: 10000, windowMs: HOUR_MS },
}

/**
 * Sliding-window rate limit backed by Postgres — deliberately never
 * in-memory, so limits survive process restarts and hold even if this ever
 * runs as more than one instance. Throws RateLimitError if `bucket` has
 * already recorded >= limit hits within the last windowMs; otherwise records
 * this hit and returns how many requests remain in the window.
 */
export async function checkRateLimit(bucket: string, limit: number, windowMs: number): Promise<{ remaining: number }> {
  const since = new Date(Date.now() - windowMs)
  const count = await prisma.rateLimitHit.count({ where: { bucket, createdAt: { gte: since } } })
  if (count >= limit) {
    await logSecurityEvent('rate_limited', `bucket=${bucket} count=${count} limit=${limit} windowMs=${windowMs}`)
    throw new RateLimitError(Math.ceil(windowMs / 1000))
  }
  await prisma.rateLimitHit.create({ data: { bucket } })
  return { remaining: limit - count - 1 }
}

/**
 * Enforces both the per-IP limit for `endpoint` and the uniform 20-req/min
 * global backstop for that same endpoint (across all IPs). Call this at the
 * very top of every public handler before any business logic runs. Returns
 * the per-IP remaining count for use in response headers.
 */
export async function enforceEndpointLimits(
  endpoint: string,
  ipHash: string,
  perIp: { limit: number; windowMs: number },
): Promise<{ limit: number; remaining: number }> {
  const perIpResult = await checkRateLimit(`${endpoint}:ip:${ipHash}`, perIp.limit, perIp.windowMs)
  await checkRateLimit(`global:${endpoint}`, LIMITS.globalPerEndpoint.limit, LIMITS.globalPerEndpoint.windowMs)
  return { limit: perIp.limit, remaining: perIpResult.remaining }
}
