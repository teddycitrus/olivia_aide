import type { RequestHandler } from 'express'
import { getClientIp, hashIp } from '../lib/security/ip'
import { enforceEndpointLimits, LIMITS, RateLimitError } from '../lib/security/rateLimit'
import { acquireSlot, ConcurrencyLimitError } from '../lib/security/concurrency'

// Wasp actions (extractBrand, scoreCandidate) receive `(args, context)`, not
// the raw Express request, so they have no way to read the caller's IP.
// Rate limiting for them has to happen here, in global middleware, matched
// by request path, before the operation handler ever runs. Custom `api`
// handlers (streamScoring, mcpServer) get `req` directly and enforce their
// own limits inline instead — see those files.
type RouteRule = {
  endpoint: string
  perIp: { limit: number; windowMs: number }
  concurrencyKey?: string
  concurrencyMax?: number
}

// Keyed by path WITHOUT the mount prefix: this same global middleware is
// mounted at both `router.use("/operations", middleware, router$2)` and
// `router.use("/auth", middleware, auth)` by Wasp's generated server, so
// Express strips whichever prefix applies and `req.path` here is already
// relative (e.g. "/extract-brand" under /operations, "/email/login" under
// /auth — Wasp's email auth provider is mounted at /auth/email/*).
const RULES: Record<string, RouteRule> = {
  '/extract-brand': {
    endpoint: 'extract-brand',
    perIp: LIMITS.extractBrandPerIp,
  },
  '/discover-candidate-images': {
    endpoint: 'discover-candidate-images',
    perIp: LIMITS.discoverImagesPerIp,
  },
  '/score-candidate': {
    endpoint: 'score-candidate',
    perIp: LIMITS.scoreCandidatePerIp,
    concurrencyKey: 'scoring',
    concurrencyMax: 3,
  },
  '/email/login': { endpoint: 'auth-login', perIp: LIMITS.authLoginPerIp },
  '/email/signup': { endpoint: 'auth-signup', perIp: LIMITS.authSignupPerIp },
  '/email/request-password-reset': { endpoint: 'auth-request-password-reset', perIp: LIMITS.authRequestPasswordResetPerIp },
  '/email/reset-password': { endpoint: 'auth-reset-password', perIp: LIMITS.authResetPasswordPerIp },
  '/email/verify-email': { endpoint: 'auth-verify-email', perIp: LIMITS.authVerifyEmailPerIp },
}

export const rateLimitMiddleware: RequestHandler = (req, res, next) => {
  const rule = RULES[req.path]
  if (!rule) return next()

  const ipHash = hashIp(getClientIp(req))

  void (async () => {
    const { limit, remaining } = await enforceEndpointLimits(rule.endpoint, ipHash, rule.perIp)
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)))

    if (rule.concurrencyKey) {
      const release = acquireSlot(`${rule.concurrencyKey}:${ipHash}`, rule.concurrencyMax ?? 3)
      res.once('finish', release)
      res.once('close', release)
    }

    next()
  })().catch((err) => {
    if (err instanceof RateLimitError) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds))
      res.status(429).json({ message: err.message })
      return
    }
    if (err instanceof ConcurrencyLimitError) {
      res.status(429).json({ message: err.message })
      return
    }
    console.error('[rateLimitMiddleware] unexpected error enforcing limits:', err)
    res.status(503).json({ message: 'temporarily unavailable, try again shortly' })
  })
}
