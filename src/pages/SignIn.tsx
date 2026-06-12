import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase'

export default function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/my-library'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div style={{ padding: '4rem 0 6rem', minHeight: '60vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <Helmet>
        <title>Sign In | Orizon Press</title>
      </Helmet>

      <div style={{ width: '100%', maxWidth: 440, padding: '0 2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <span className="rule" />
          <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>Account</span>
          <h1 style={{ marginTop: '0.4rem', fontSize: '2rem' }}>Sign In</h1>
          <p style={{ marginTop: '0.75rem', color: 'var(--mist)', lineHeight: 1.7, fontSize: '0.9rem' }}>
            Access your library and re-download your purchased books.
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
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
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
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.82rem', color: 'var(--mist)', textAlign: 'center' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Create one</Link>
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
