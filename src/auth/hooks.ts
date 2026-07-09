import type { OnAfterEmailVerifiedHook, OnBeforeSignupHook } from 'wasp/server/auth'
import { HttpError } from 'wasp/server'

/**
 * Wasp's own email-format validation ("email must be a valid email") does
 * not reject embedded control characters — confirmed empirically: an email
 * like "attacker@example.test\r\nBcc:victim@example.test" passes signup and
 * the injected "Bcc:" line appears verbatim in the composed verification
 * email. Signup is the only place an email address enters this app (there's
 * no change-email flow), so rejecting control characters here closes the
 * gap for every downstream mail send (verification, password reset).
 */
export const onBeforeSignup: OnBeforeSignupHook = async ({ providerId }) => {
  if (providerId.providerName === 'email' && /[\r\n\0]/.test(providerId.providerUserId)) {
    throw new HttpError(400, 'invalid email')
  }
}

/**
 * Mirrors email-verification state onto our own User row (see schema.prisma
 * comment on User.emailVerified) so verifyMcpSecret can check it without a
 * live Wasp session.
 */
export const onAfterEmailVerified: OnAfterEmailVerifiedHook = async ({ user, prisma }) => {
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } })
}
