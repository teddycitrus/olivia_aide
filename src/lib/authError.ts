// Wasp's built-in auth validation (ensureValidPassword, ensureValidEmail, etc.)
// always throws HttpError(422, 'Validation failed', { message: '<specific reason>' }).
// The client's WaspHttpError puts that specific reason at err.data.data.message —
// err.message is always the generic wrapper text "Validation failed", which is
// useless to show a user on its own.
export function extractAuthErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { data?: { data?: { message?: unknown } } } | undefined)?.data?.data?.message
  if (typeof detail === 'string' && detail) return detail
  if (err instanceof Error && err.message && err.message !== 'Validation failed') return err.message
  return fallback
}
