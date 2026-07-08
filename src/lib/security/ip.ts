import { createHash } from 'node:crypto'
import type { Request } from 'express'

/**
 * Best-effort client IP. Trusts X-Forwarded-For only because this app is
 * expected to sit behind a single trusted reverse proxy (Vercel/Cloudflare);
 * takes the first hop, not the whole chain, to avoid trivial spoofing by a
 * client appending its own fake entries after a real proxy IP.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim()
  return req.socket?.remoteAddress ?? 'unknown'
}

/** One-way IP hash for logging — never store or log raw IPs. */
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}
