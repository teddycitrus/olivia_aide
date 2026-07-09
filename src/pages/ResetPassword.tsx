import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { resetPassword } from 'wasp/client/auth'
import { AuthLayout } from '../components/AuthLayout'
import '../Main.css'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await resetPassword({ token, password })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Reset password">
        <p className="text-sm font-bold text-primary-red">Missing reset token. Use the link from your email.</p>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout title="Password reset">
        <p className="text-sm font-medium leading-relaxed text-foreground/70">Your password has been reset.</p>
        <Link
          to="/login"
          className="mt-4 inline-block w-full border-2 border-black bg-primary-blue py-2 text-center font-bold uppercase tracking-wider text-white shadow-hard"
        >
          Log in
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset password">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-foreground/50">New password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border-2 border-black bg-white px-3 py-2 font-medium outline-none placeholder:text-foreground/40 focus:border-primary-blue"
          />
        </div>
        {error && <p className="text-sm font-bold text-primary-red">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full border-2 border-black bg-primary-red py-2 font-bold uppercase tracking-wider text-white shadow-hard transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  )
}
