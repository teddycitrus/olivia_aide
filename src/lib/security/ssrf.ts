import * as http from 'node:http'
import * as https from 'node:https'
import * as dns from 'node:dns/promises'
import type { LookupAddress } from 'node:dns'
import * as net from 'node:net'
import { HttpError } from 'wasp/server'
import { logSecurityEvent } from './events'

export class SsrfBlockedError extends HttpError {
  constructor(detail: string) {
    super(400, `URL rejected: ${detail}`)
  }
}

/** Reserved/private ranges per RFC1918, RFC5737, RFC3927, RFC6598, RFC4193, etc. */
function isPrivateOrReservedIp(ip: string): boolean {
  const type = net.isIP(ip)
  if (type === 4) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 10) return true // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 127) return true // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local (AWS/GCP metadata: 169.254.169.254)
    if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 carrier-grade NAT
    if (a === 0) return true // 0.0.0.0/8 "this network"
    if (a === 192 && b === 0) return true // 192.0.0.0/24 IETF protocol assignments
    if (a === 192 && b === 88) return true // 192.88.99.0/24 6to4 relay anycast
    if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15 benchmarking
    if (a >= 224) return true // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + 255.255.255.255
    return false
  }
  if (type === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::') return true // loopback / unspecified
    if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true // fc00::/7 unique-local
    if (/^fe[89ab][0-9a-f]:/.test(lower)) return true // fe80::/10 link-local
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/) // IPv4-mapped IPv6
    if (mapped) return isPrivateOrReservedIp(mapped[1])
    return false
  }
  return true // not a recognizable literal IP -> fail closed
}

/** Resolves a hostname (or validates a literal IP), rejecting any private/reserved result. */
async function resolveAndValidate(rawHostname: string): Promise<string> {
  // URL.hostname keeps brackets around an IPv6 literal (e.g. "[::1]"), but
  // net.isIP/dns.lookup expect the bracket-less form — strip them first so
  // IPv6 literals take the fast literal-IP path instead of falling through
  // to a DNS lookup that would (for the wrong reason) also happen to reject
  // loopback/link-local while incorrectly rejecting legitimate public IPv6
  // literal URLs too.
  const hostname = rawHostname.startsWith('[') && rawHostname.endsWith(']') ? rawHostname.slice(1, -1) : rawHostname
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      await logSecurityEvent('ssrf_blocked', `literal IP ${hostname} is in a reserved range`)
      throw new SsrfBlockedError(`IP ${hostname} is in a reserved/private range`)
    }
    return hostname
  }
  let records: LookupAddress[]
  try {
    records = await dns.lookup(hostname, { all: true })
  } catch {
    throw new SsrfBlockedError(`could not resolve hostname "${hostname}"`)
  }
  if (!records.length) throw new SsrfBlockedError(`no DNS records for "${hostname}"`)
  for (const r of records) {
    if (isPrivateOrReservedIp(r.address)) {
      await logSecurityEvent('ssrf_blocked', `hostname ${hostname} resolved to reserved IP ${r.address}`)
      throw new SsrfBlockedError(`"${hostname}" resolves to a reserved/private IP address`)
    }
  }
  return records[0].address
}

export type SafeFetchOptions = { timeoutMs?: number; maxBytes?: number; userAgent?: string }

const DEFAULT_TIMEOUT_MS = 5000
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 3
const DEFAULT_UA = 'Mozilla/5.0 (compatible; Nora/1.0)'

type Resolved = { statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }

/**
 * Performs exactly one HTTP request, connecting DIRECTLY to `pinnedIp`
 * (already validated by the caller) rather than letting Node re-resolve DNS
 * at connect time — that re-resolution is exactly what a DNS-rebinding
 * attack exploits. For HTTPS, `servername` is set explicitly to the real
 * hostname so TLS SNI negotiation and certificate hostname validation still
 * check against the name the site actually serves, not the IP; the Host
 * header is likewise set to the real hostname for virtual-hosted targets.
 */
function requestOnce(urlStr: string, pinnedIp: string, opts: Required<SafeFetchOptions>): Promise<Resolved> {
  const parsed = new URL(urlStr)
  const isHttps = parsed.protocol === 'https:'
  const mod = isHttps ? https : http

  return new Promise((resolve, reject) => {
    const req = mod.request(
      {
        hostname: pinnedIp,
        ...(isHttps ? { servername: parsed.hostname } : {}),
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: { 'user-agent': opts.userAgent, host: parsed.host },
        timeout: opts.timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = []
        let total = 0
        res.on('data', (chunk: Buffer) => {
          total += chunk.length
          if (total > opts.maxBytes) {
            req.destroy(new Error(`response exceeded ${opts.maxBytes} byte cap`))
            return
          }
          chunks.push(chunk)
        })
        res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }))
        res.on('error', reject)
      },
    )
    req.on('timeout', () => req.destroy(new Error(`timeout after ${opts.timeoutMs}ms`)))
    req.on('error', reject)
    req.end()
  })
}

async function safeRequest(rawUrl: string, opts: SafeFetchOptions = {}): Promise<Resolved & { finalUrl: string }> {
  const resolved: Required<SafeFetchOptions> = {
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBytes: opts.maxBytes ?? DEFAULT_MAX_BYTES,
    userAgent: opts.userAgent ?? DEFAULT_UA,
  }

  let currentUrl = rawUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(currentUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new SsrfBlockedError(`scheme "${parsed.protocol}" is not allowed (only http/https)`)
    }
    // Every hop — including redirect targets — goes through the same
    // resolve-and-validate pipeline. A redirect to a private IP is blocked
    // exactly like a direct request to one.
    const ip = await resolveAndValidate(parsed.hostname)
    const res = await requestOnce(currentUrl, ip, resolved)

    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      if (hop === MAX_REDIRECTS) throw new SsrfBlockedError('too many redirects')
      currentUrl = new URL(res.headers.location, currentUrl).toString()
      continue
    }
    return { ...res, finalUrl: currentUrl }
  }
  throw new SsrfBlockedError('too many redirects')
}

export async function safeFetchBuffer(url: string, opts: SafeFetchOptions = {}): Promise<Buffer> {
  const { statusCode, body } = await safeRequest(url, opts)
  if (statusCode < 200 || statusCode >= 300) throw new Error(`fetch ${url} -> ${statusCode}`)
  return body
}

export async function safeFetchText(url: string, opts: SafeFetchOptions = {}): Promise<string> {
  const { statusCode, body } = await safeRequest(url, opts)
  if (statusCode < 200 || statusCode >= 300) throw new Error(`fetch ${url} -> ${statusCode}`)
  return body.toString('utf-8')
}

export async function safeFetchJson<T>(url: string, opts: SafeFetchOptions = {}): Promise<T> {
  return JSON.parse(await safeFetchText(url, opts)) as T
}

export async function safeFetchOk(url: string, opts: SafeFetchOptions = {}): Promise<boolean> {
  try {
    const { statusCode } = await safeRequest(url, opts)
    return statusCode >= 200 && statusCode < 300
  } catch {
    return false
  }
}

/** Validate a URL is safe to fetch WITHOUT making a request — reject bad input up front. */
export async function assertSafeUrl(rawUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new SsrfBlockedError('not a well-formed URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedError(`scheme "${parsed.protocol}" is not allowed (only http/https)`)
  }
  await resolveAndValidate(parsed.hostname)
}
