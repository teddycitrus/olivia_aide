import { useEffect, useState } from 'react'

/**
 * Flips true only if `active` stays true past `delayMs` — used to show a
 * "this is taking a while" hint exclusively when a request is genuinely
 * slow (e.g. the server waking from Fly's scale-to-zero, ~15-20s), never on
 * a normal sub-second round-trip against an already-warm server.
 */
export function useSlowRequestHint(active: boolean, delayMs = 1500): boolean {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!active) {
      setSlow(false)
      return
    }
    const timer = setTimeout(() => setSlow(true), delayMs)
    return () => clearTimeout(timer)
  }, [active, delayMs])

  return slow
}
