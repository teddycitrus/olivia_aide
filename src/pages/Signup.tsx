import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { signup, login } from 'wasp/client/auth'
import { AuthLayout } from '../components/AuthLayout'
import '../Main.css'

const INPUT_CLASS =
  'w-full border-2 border-black bg-white px-3 py-2 font-medium outline-none placeholder:text-foreground/40 focus:border-primary-blue'

export function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signup({ email, password })
    } catch (err) {
      // Confirmed via direct API testing that Wasp's signup endpoint itself
      // returns the same {"success":true} whether the email is new or
      // already registered (no enumeration at the wire level), so any error
      // reaching here is a real one (weak password, malformed input, etc.) —
      // no special-casing needed.
      setError(err instanceof Error ? err.message : 'Signup failed. Check your email and password and try again.')
      setLoading(false)
      return
    }
    // Signup succeeds but doesn't log the user in — email must be verified
    // first. Attempt a login anyway purely to surface the friendliest
    // possible message; an unverified account will fail this the same way
    // it fails everywhere else.
    try {
      await login({ email, password })
      navigate('/dashboard')
      return
    } catch {
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthLayout title="Check your email">
        <p className="text-sm font-medium leading-relaxed text-foreground/70">
          We sent a verification link to <span className="font-bold text-black">{email}</span>. Click it, then{' '}
          <Link to="/login" className="font-bold text-primary-blue hover:underline">
            log in
          </Link>{' '}
          to create your first MCP API key.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Sign up">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-foreground/50">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-foreground/50">Password</label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        {error && <p className="text-sm font-bold text-primary-red">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full border-2 border-black bg-primary-red py-2 font-bold uppercase tracking-wider text-white shadow-hard transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-4 text-xs font-medium text-foreground/60">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-primary-blue hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
