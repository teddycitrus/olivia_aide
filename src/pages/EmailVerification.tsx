import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { verifyEmail } from 'wasp/client/auth'
import { AuthLayout } from '../components/AuthLayout'
import '../Main.css'

export function EmailVerificationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!token) {
      setStatus('error')
      return
    }
    verifyEmail({ token })
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <AuthLayout title="Email verification">
      {status === 'checking' && <p className="text-sm font-medium text-foreground/60">Verifying…</p>}
      {status === 'ok' && (
        <div>
          <p className="text-sm font-medium leading-relaxed text-foreground/70">Your email is verified.</p>
          <Link
            to="/login"
            className="mt-4 inline-block w-full border-2 border-black bg-primary-blue py-2 text-center font-bold uppercase tracking-wider text-white shadow-hard"
          >
            Log in
          </Link>
        </div>
      )}
      {status === 'error' && (
        <p className="text-sm font-bold text-primary-red">
          That verification link is invalid or has expired. Try signing up again or request a new link.
        </p>
      )}
    </AuthLayout>
  )
}
