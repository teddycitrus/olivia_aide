import { useState } from 'react'
import { Link } from 'react-router'
import { requestPasswordReset } from 'wasp/client/auth'
import { AuthLayout } from '../components/AuthLayout'
import '../Main.css'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Always land on the same "check your email" screen regardless of
    // whether requestPasswordReset succeeds, fails, or the email isn't
    // registered at all — a distinguishable response here is an
    // account-enumeration channel.
    try {
      await requestPasswordReset({ email })
    } catch {
      // intentionally ignored — see above
    } finally {
      setLoading(false)
      setDone(true)
    }
  }

  if (done) {
    return (
      <AuthLayout title="Check your email">
        <p className="text-sm font-medium leading-relaxed text-foreground/70">
          If an account exists for <span className="font-bold text-black">{email}</span>, we've sent a password
          reset link.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Forgot password">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-foreground/50">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-2 border-black bg-white px-3 py-2 font-medium outline-none placeholder:text-foreground/40 focus:border-primary-blue"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full border-2 border-black bg-primary-blue py-2 font-bold uppercase tracking-wider text-white shadow-hard transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-4 text-xs font-medium text-foreground/60">
        <Link to="/login" className="font-bold text-primary-blue hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthLayout>
  )
}
