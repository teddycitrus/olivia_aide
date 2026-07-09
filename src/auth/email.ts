import type { GetVerificationEmailContentFn, GetPasswordResetEmailContentFn } from 'wasp/server/auth'

export const getVerificationEmailContent: GetVerificationEmailContentFn = ({ verificationLink }) => ({
  subject: 'Verify your Nora account',
  text: `Verify your email to start creating MCP API keys: ${verificationLink}\n\nIf you didn't request this, ignore this email.`,
  html: `
    <p>Verify your email to start creating MCP API keys.</p>
    <p><a href="${verificationLink}">Verify email</a></p>
    <p>If you didn't request this, ignore this email.</p>
  `,
})

export const getPasswordResetEmailContent: GetPasswordResetEmailContentFn = ({ passwordResetLink }) => ({
  subject: 'Reset your Nora password',
  text: `Reset your password: ${passwordResetLink}\n\nIf you didn't request this, ignore this email — your password won't change.`,
  html: `
    <p>Reset your password.</p>
    <p><a href="${passwordResetLink}">Reset password</a></p>
    <p>If you didn't request this, ignore this email — your password won't change.</p>
  `,
})
