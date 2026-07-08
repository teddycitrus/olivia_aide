import express from 'express'
import helmet from 'helmet'
import { type MiddlewareConfigFn } from 'wasp/server'
import { rateLimitMiddleware } from './rateLimitMiddleware'

// Body-size cap (cost/abuse control): reject any request body over 512KB.
// Candidate/brand requests only ever carry URLs and short strings, never
// image bytes, so this is generous headroom, not a tight fit.
const MAX_BODY_BYTES = '512kb'

// Wasp's default global middleware already includes `helmet()` (with
// helmet's own defaults) and a CORS allowlist scoped to WASP_WEB_CLIENT_URL
// (never a wildcard — see .wasp/out/server/bundle/server.js's
// `allowedCORSOriginsPerEnv`). This replaces the helmet entry with an
// explicit config for the specific knobs the security pass calls for:
// - script-src 'self' only (no unsafe-inline/unsafe-eval)
// - img-src allows https:/blob:/data: (candidate images + Three.js textures
//   are loaded directly from arbitrary external URLs by the browser)
// - connect-src 'self' only — the client only ever talks to this server;
//   every LLM call happens server-side, so the client has no reason to
//   reach anthropic.com/openai.com/etc directly
// - HSTS max-age >= 1 year, includeSubDomains
// - X-Frame-Options DENY (helmet default is SAMEORIGIN)
// - Referrer-Policy strict-origin-when-cross-origin
// Permissions-Policy isn't part of helmet's default header set, so it's
// added as a small explicit middleware.
const configuredHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind's runtime injects <style> tags; no nonce plumbing available through Wasp's static SPA serving
      imgSrc: ["'self'", 'https:', 'blob:', 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31_536_000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
})

const permissionsPolicy: express.RequestHandler = (_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  next()
}

export const configureGlobalMiddleware: MiddlewareConfigFn = (middlewareConfig) => {
  middlewareConfig.set('helmet', configuredHelmet)
  middlewareConfig.set('permissionsPolicy', permissionsPolicy)
  middlewareConfig.set('express.json', express.json({ limit: MAX_BODY_BYTES }))
  middlewareConfig.set('express.urlencoded', express.urlencoded({ limit: MAX_BODY_BYTES, extended: false }))
  // Runs for every request (operations + custom APIs alike). Path-matches
  // the two Wasp actions that have no other way to see the caller's IP.
  middlewareConfig.set('rateLimit', rateLimitMiddleware)
  return middlewareConfig
}
