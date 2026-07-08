import { type StreamScoringHandler } from 'wasp/server/api'
import { scoreCandidateImage, type BrandLike } from '../lib/scoring'
import { getClientIp, hashIp } from '../lib/security/ip'
import { enforceEndpointLimits, LIMITS, RateLimitError } from '../lib/security/rateLimit'
import { acquireSlot, ConcurrencyLimitError } from '../lib/security/concurrency'
import { brandIdSchema, imageUrlSchema } from '../lib/security/validation'

const MAX_EVENTS = 20 // SSE hard cap, independent of the connection timeout
const CONNECTION_LIFETIME_MS = 60_000

/**
 * SSE endpoint: GET /api/stream-scoring/:brandId?imageUrls[]=...
 * Scores each candidate in parallel (concurrency cap 3) and streams each result
 * as an `event: score` frame as it completes. Terminal frame: `event: done`.
 *
 * Rate-limited as a "batch" call (3/hr/IP, separate from single scoreCandidate),
 * hard-capped at 15 candidates per batch, and shares the same 3-concurrent-
 * in-flight-scoring-requests-per-IP slot as the single scoreCandidate action.
 */
export const streamScoringHandler: StreamScoringHandler = async (req, res, context) => {
  const brandIdParsed = brandIdSchema.safeParse(req.params.brandId)
  if (!brandIdParsed.success) {
    res.status(400).json({ message: 'invalid brandId' })
    return
  }
  const brandId = brandIdParsed.data

  const raw = (req.query['imageUrls'] ?? req.query['imageUrls[]']) as string | string[] | undefined
  const rawUrls = Array.isArray(raw) ? raw : raw ? [raw] : []
  const imageUrls: string[] = []
  for (const u of rawUrls) {
    const parsed = imageUrlSchema.safeParse(u)
    if (!parsed.success) {
      res.status(400).json({ message: `invalid imageUrl: ${parsed.error.issues[0]?.message ?? 'malformed'}` })
      return
    }
    imageUrls.push(parsed.data)
  }

  const ipHash = hashIp(getClientIp(req))
  try {
    const { limit, remaining } = await enforceEndpointLimits('stream-scoring-batch', ipHash, LIMITS.batchScorePerIp)
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)))
  } catch (err) {
    if (err instanceof RateLimitError) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds))
      res.status(429).json({ message: err.message })
      return
    }
    throw err
  }

  if (imageUrls.length > LIMITS.batchScoreMaxCandidates) {
    res.status(400).json({ message: `at most ${LIMITS.batchScoreMaxCandidates} candidates per batch` })
    return
  }

  let releaseConcurrency: (() => void) | null
  try {
    releaseConcurrency = acquireSlot(`scoring:${ipHash}`, 3)
  } catch (err) {
    if (err instanceof ConcurrencyLimitError) {
      res.status(429).json({ message: err.message })
      return
    }
    throw err
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  let eventCount = 0
  let ended = false
  const finish = () => {
    if (ended) return
    ended = true
    clearTimeout(lifetimeTimer)
    releaseConcurrency?.()
    res.end()
  }
  // Hard connection lifetime — SSE is a natural DoS target if left open.
  const lifetimeTimer = setTimeout(finish, CONNECTION_LIFETIME_MS)
  res.once('close', finish)

  const send = (event: string, data: unknown) => {
    if (ended) return
    if (++eventCount > MAX_EVENTS) {
      res.write(`event: done\ndata: ${JSON.stringify({ brandId, truncated: true })}\n\n`)
      finish()
      return
    }
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const brand = await context.entities.Brand.findUnique({ where: { id: brandId } })
  if (!brand) {
    send('error', { message: 'brand not found' })
    finish()
    return
  }
  send('start', { brandId, total: imageUrls.length })

  let i = 0
  const worker = async () => {
    while (i < imageUrls.length && !ended) {
      const imageUrl = imageUrls[i++]
      try {
        const candidate = await context.entities.Candidate.create({ data: { brandId, imageUrl } })
        const scoring = await scoreCandidateImage(brand as unknown as BrandLike, imageUrl)
        await context.entities.Scoring.upsert({
          where: { candidateId: candidate.id },
          update: scoring,
          create: { candidateId: candidate.id, ...scoring },
        })
        send('score', { type: 'score', candidateId: candidate.id, imageUrl, scoring })
      } catch (err) {
        console.error('[stream-scoring] failed for', imageUrl, err)
        send('score', { type: 'score', imageUrl, error: 'scoring failed' })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, imageUrls.length) }, worker))

  send('done', { brandId })
  finish()
}
