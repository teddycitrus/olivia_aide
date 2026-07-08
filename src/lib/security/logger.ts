import pino from 'pino'

// Structured JSON logs with automatic redaction of anything that looks like
// a secret. Applied at the pino level (not per call site) so a field is
// scrubbed everywhere, not just where a developer remembered to redact it.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'apiKey',
      'api_key',
      'authorization',
      'headers.authorization',
      'headers["x-mcp-secret"]',
      'cookie',
      'headers.cookie',
      'sessionId',
      'DATABASE_URL',
      '*.apiKey',
      '*.authorization',
      '*.password',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
})

/** Truncates long text (LLM prompts/responses) before it ever reaches a log line. */
export function truncateForLog(text: string, max = 200): string {
  return text.length > max ? `${text.slice(0, max)}…[truncated ${text.length - max} chars]` : text
}
