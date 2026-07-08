import { randomUUID } from 'node:crypto'
import { type ServerSetupFn } from 'wasp/server'
import { HttpError } from 'wasp/server'
import { logger } from '../lib/security/logger'

/**
 * Wasp's own built-in error middleware only special-cases HttpError and
 * calls next(err) for anything else — which falls through to Express's
 * default error handler and, outside production, renders a full stack trace
 * (file paths, line numbers, sometimes query values) straight to the client.
 * This registers a final catch-all AFTER all routes/middleware (setupFn runs
 * just before the server starts listening), so any error nothing else
 * handled gets an opaque response with a correlation ID, and the real detail
 * only goes to the server log.
 */
export const setupServer: ServerSetupFn = async ({ app }) => {
  app.use((err: unknown, _req: unknown, res: import('express').Response, next: import('express').NextFunction) => {
    if (res.headersSent) return next(err)
    if (err instanceof HttpError) {
      // Wasp's own handler (registered earlier) already handles this case;
      // reachable only if something re-throws after headers were prepared.
      return res.status(err.statusCode).json({ message: err.message })
    }
    const errorId = randomUUID()
    logger.error({ errorId, err }, 'unhandled error')
    res.status(500).json({ message: 'internal server error', errorId })
  })
}
