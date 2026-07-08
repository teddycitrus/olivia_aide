import { HttpError } from 'wasp/server'

export class ConcurrencyLimitError extends HttpError {
  constructor() {
    super(429, 'Too many concurrent scoring requests from this client. Wait for one to finish and try again.')
  }
}

// In-flight request counts are inherently process-local — there is no
// external store that would make this "more durable"; even a Redis-backed
// version needs the exact same increment/decrement tied to this process's
// request lifecycle. Fine for a single long-lived Wasp dev/prod server.
const inFlight = new Map<string, number>()

/** Throws ConcurrencyLimitError if `key` already has >= maxConcurrent in-flight slots held. */
export function acquireSlot(key: string, maxConcurrent: number): () => void {
  const current = inFlight.get(key) ?? 0
  if (current >= maxConcurrent) throw new ConcurrencyLimitError()
  inFlight.set(key, current + 1)

  let released = false
  return () => {
    if (released) return
    released = true
    const n = (inFlight.get(key) ?? 1) - 1
    if (n <= 0) inFlight.delete(key)
    else inFlight.set(key, n)
  }
}
