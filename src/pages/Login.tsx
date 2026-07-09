import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { login } from 'wasp/client/auth'
import { AuthLayout } from '../components/AuthLayout'
import '../Main.css'

const INPUT_CLASS =
  'w-full border-2 border-black bg-white px-3 py-2 font-medium outline-none placeholder:text-foreground/40 focus:border-primary-blue'

// Always the same message regardless of whether the email exists, the
// password is wrong, or the account isn't verified yet — a distinguishable
// error on any one of those is an account-enumeration channel.
const GENERIC_ERROR = 'Invalid email or password.'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch {
      setError(GENERIC_ERROR)
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Log in">
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        {error && <p className="text-sm font-bold text-primary-red">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full border-2 border-black bg-primary-blue py-2 font-bold uppercase tracking-wider text-white shadow-hard transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-xs font-medium text-foreground/60">
        <Link to="/signup" className="font-bold text-primary-blue hover:underline">
          Sign up
        </Link>
        <Link to="/forgot-password" className="font-bold text-primary-blue hover:underline">
          Forgot password?
        </Link>
      </div>
    </AuthLayout>
  )
}
