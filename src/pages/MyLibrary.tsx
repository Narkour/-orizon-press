import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../contexts/AuthContext'

interface Order {
  id: string
  book_slug: string
  book_title: string
  amount: number
  created_at: string
}

export default function MyLibrary() {
  const { user, session, loading: authLoading, signOut } = useAuth()
  const navigate = useNavigate()

  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState('')
  const [downloadState, setDownloadState] = useState<Record<string, 'idle' | 'loading' | 'error'>>({})

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/signin', { state: { from: '/my-library' }, replace: true })
      return
    }
    fetchOrders()
  }, [user, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrders = async () => {
    setOrdersLoading(true)
    setOrdersError('')
    try {
      const res = await fetch('/api/my-library', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load library')
      setOrders(data.orders ?? [])
    } catch (err) {
      setOrdersError(err instanceof Error ? err.message : 'Failed to load library')
    } finally {
      setOrdersLoading(false)
    }
  }

  const handleDownload = async (bookSlug: string) => {
    setDownloadState(prev => ({ ...prev, [bookSlug]: 'loading' }))
    try {
      const tokenRes = await fetch('/api/request-redownload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ bookSlug }),
      })
      const tokenData = await tokenRes.json()
      if (!tokenRes.ok) throw new Error(tokenData.error ?? 'Could not prepare download')

      const dlRes = await fetch(`/api/download-ebook?token=${tokenData.downloadToken}`)
      const dlData = await dlRes.json()
      if (!dlRes.ok) throw new Error(dlData.error ?? 'Download failed')

      const a = document.createElement('a')
      a.href = dlData.url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setDownloadState(prev => ({ ...prev, [bookSlug]: 'idle' }))
    } catch {
      setDownloadState(prev => ({ ...prev, [bookSlug]: 'error' }))
      setTimeout(() => setDownloadState(prev => ({ ...prev, [bookSlug]: 'idle' })), 3000)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (authLoading) {
    return (
      <div style={{ padding: '8rem 0', textAlign: 'center', color: 'var(--mist)', fontSize: '0.82rem', letterSpacing: '0.1em' }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ padding: '3rem 0 6rem' }}>
      <Helmet>
        <title>My Library | Orizon Press</title>
      </Helmet>

      <div className="container">
        <div style={{ padding: '2rem 0 2.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="rule" />
            <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>Account</span>
            <h1 style={{ marginTop: '0.4rem' }}>My Library</h1>
            <p style={{ marginTop: '0.5rem', color: 'var(--mist)', fontSize: '0.85rem' }}>
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
              fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--mist)', padding: '0.5rem 1rem', marginTop: '2rem',
              transition: 'color var(--duration), border-color var(--duration)',
            }}
            onMouseOver={e => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.borderColor = 'var(--ink)' }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--mist)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            Sign Out
          </button>
        </div>

        {ordersLoading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--mist)', fontSize: '0.82rem', letterSpacing: '0.1em' }}>
            Loading your library…
          </div>
        ) : ordersError ? (
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: '1rem' }}>{ordersError}</p>
            <button className="btn btn--outline" onClick={fetchOrders} style={{ fontSize: '0.72rem' }}>
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '5rem 0', textAlign: 'center' }}>
            <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>Empty</span>
            <p style={{ marginTop: '0.5rem', color: 'var(--mist)', lineHeight: 1.8 }}>
              No purchases yet. When you buy a book, it will appear here for re-download any time.
            </p>
            <Link to="/catalogue" className="btn btn--primary" style={{ marginTop: '2rem', display: 'inline-block' }}>
              Browse the Catalogue
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', borderTop: '1px solid var(--border)' }}>
            {orders.map(order => {
              const dlState = downloadState[order.book_slug] ?? 'idle'
              return (
                <div
                  key={order.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.25rem 0', borderBottom: '1px solid var(--border)', gap: '1rem', flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      to={`/books/${order.book_slug}`}
                      style={{
                        fontFamily: 'var(--font-display)', fontSize: '1.05rem',
                        color: 'var(--ink)', textDecoration: 'none',
                        transition: 'color var(--duration)',
                        display: 'block', marginBottom: '0.25rem',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                      onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
                      onMouseOut={e => (e.currentTarget.style.color = 'var(--ink)')}
                    >
                      {order.book_title}
                    </Link>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mist)' }}>
                        eBook · ${order.amount.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--mist)' }}>
                        Purchased {new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(order.book_slug)}
                    disabled={dlState === 'loading'}
                    className="btn btn--outline"
                    style={{
                      fontSize: '0.68rem', flexShrink: 0,
                      opacity: dlState === 'loading' ? 0.6 : 1,
                      borderColor: dlState === 'error' ? '#c0392b' : undefined,
                      color: dlState === 'error' ? '#c0392b' : undefined,
                    }}
                  >
                    {dlState === 'loading' ? 'Preparing…' : dlState === 'error' ? 'Failed — retry' : '↓ Download PDF'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
