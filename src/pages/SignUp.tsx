import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'

export default function SignUp() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div style={{ padding: '4rem 0 6rem', minHeight: '60vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 440, padding: '0 2rem', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(196, 134, 42, 0.1)', border: '1px solid var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', fontSize: '1.5rem', color: 'var(--gold)',
          }}>✓</div>
          <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>Almost there</span>
          <h1 style={{ marginTop: '0.4rem', fontSize: '1.8rem' }}>Check your email</h1>
          <p style={{ marginTop: '1rem', color: 'var(--mist)', lineHeight: 1.8, fontSize: '0.9rem' }}>
            We've sent a confirmation link to <strong style={{ color: 'var(--ink)' }}>{email}</strong>.
            Click the link to activate your account, then sign in.
          </p>
          <Link to="/signin" className="btn btn--primary" style={{ marginTop: '2rem', display: 'inline-block' }}>
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '4rem 0 6rem', minHeight: '60vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <Helmet>
        <title>Create Account | Orizon Press</title>
      </Helmet>

      <div style={{ width: '100%', maxWidth: 440, padding: '0 2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <span className="rule" />
          <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>Account</span>
          <h1 style={{ marginTop: '0.4rem', fontSize: '2rem' }}>Create Account</h1>
          <p style={{ marginTop: '0.75rem', color: 'var(--mist)', lineHeight: 1.7, fontSize: '0.9rem' }}>
            Create an account to access your purchased books any time.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '0.4rem' }}>
              Email address
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '0.4rem' }}>
              Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--mist)', marginTop: '0.3rem' }}>
              Minimum 8 characters
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '0.4rem' }}>
              Confirm password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {error && (
            <p style={{ fontSize: '0.8rem', color: '#c0392b', lineHeight: 1.5 }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn btn--primary"
            style={{ width: '100%', opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.82rem', color: 'var(--mist)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/signin" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Sign In</Link>
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  padding: '0.7rem 1rem',
  background: 'white',
  color: 'var(--ink)',
  border: '1px solid var(--border)',
  outline: 'none',
  transition: 'border-color var(--duration)',
}
