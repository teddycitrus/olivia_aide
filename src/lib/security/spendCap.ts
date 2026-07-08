import { prisma } from 'wasp/server'
import { HttpError } from 'wasp/server'
import { logSecurityEvent } from './events'

export type Provider = 'anthropic' | 'openai' | 'google' | 'replicate'

const CAP_ENV: Record<Provider, string> = {
  anthropic: 'ANTHROPIC_DAILY_USD_CAP',
  openai: 'OPENAI_DAILY_USD_CAP',
  google: 'GOOGLE_DAILY_USD_CAP',
  replicate: 'REPLICATE_DAILY_USD_CAP',
}

// Applied when the env var is unset/invalid. Deliberately conservative —
// missing config should fail closed (small cap), never open (no cap).
const DEFAULT_CAP_USD = 5

function dailyCapFor(provider: Provider): number {
  const raw = process.env[CAP_ENV[provider]]
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CAP_USD
}

function startOfUtcDay(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * Thrown when a provider's daily spend cap is reached. Deliberately a
 * distinct class (not a generic HttpError) so every AI-client catch block
 * can check `instanceof BudgetExhaustedError` and re-throw instead of
 * silently falling back to a neutral score — a budget cap must surface as a
 * real 503, never be masked as "the API happened to fail".
 */
export class BudgetExhaustedError extends HttpError {
  constructor(public readonly provider: Provider) {
    super(503, `${provider} daily spend cap reached. Try again after midnight UTC. (No fallback to another provider is attempted.)`)
  }
}

/** Throws BudgetExhaustedError if the provider's daily spend cap has been reached. */
export async function assertBudget(provider: Provider): Promise<void> {
  const cap = dailyCapFor(provider)
  const agg = await prisma.apiUsage.aggregate({
    _sum: { usdCost: true },
    where: { provider, createdAt: { gte: startOfUtcDay() } },
  })
  const spent = agg._sum.usdCost ?? 0
  if (spent >= cap) {
    await logSecurityEvent('budget_exhausted', `provider=${provider} spent=$${spent.toFixed(4)} cap=$${cap}`)
    throw new BudgetExhaustedError(provider)
  }
}

/** Records an approximate USD cost for a completed call. Never throws. */
export async function recordSpend(provider: Provider, usdCost: number): Promise<void> {
  try {
    await prisma.apiUsage.create({ data: { provider, usdCost } })
  } catch (err) {
    console.error('[security] failed to record spend (non-fatal):', err)
  }
}

/**
 * Wraps a priced call: checks the budget first (throws BudgetExhaustedError,
 * uncaught, if exhausted), runs fn, records the cost estimate on success.
 * `estimatedUsd` is a fixed per-call-type approximation (documented at each
 * call site), not metered token accounting — good enough to stop a cost
 * bomb, not a billing reconciliation system.
 */
export async function withBudget<T>(provider: Provider, estimatedUsd: number, fn: () => Promise<T>): Promise<T> {
  await assertBudget(provider)
  const result = await fn()
  await recordSpend(provider, estimatedUsd)
  return result
}
