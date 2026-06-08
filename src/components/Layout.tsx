import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef } from 'react'
import { books } from '../data/catalogue'
import { useNavigate } from 'react-router-dom'

export default function Layout() {
  const [scrolled, setScrolled] = useState(false)
  const [, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => { setMenuOpen(false); setQuery('') }, [location])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.genre.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q)
    ).slice(0, 6)
  }, [query])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 'var(--nav-height)',
        background: scrolled ? 'rgba(250,247,241,0.94)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'all var(--duration) var(--ease)',
      }}>
        <div className="container" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', textDecoration: 'none' }}>
            <span style={{ color: 'var(--gold)', fontSize: '1.3rem', lineHeight: 1 }}>◈</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 500, color: 'var(--ink)', letterSpacing: '0.01em' }}>Orizon Press</span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="desktop-nav">
            {['catalogue','authors','blog','about','contact'].map(path => (
              <NavLink key={path} to={`/${path}`} style={({ isActive }) => ({
                fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase',
                color: isActive ? 'var(--gold)' : 'var(--mist)', transition: 'color var(--duration)',
                textDecoration: 'none',
              })}>
                {path.charAt(0).toUpperCase() + path.slice(1)}
              </NavLink>
            ))}
          </nav>

          <div ref={searchRef} style={{ position: 'relative' }}>
            <input
              type="search"
              placeholder="Search titles…"
              value={query}
              onChange={e => { setQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              style={{
                fontFamily: 'var(--font-body)', fontSize: '0.8rem',
                padding: '0.45rem 0.9rem', width: '220px',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--ink)', outline: 'none',
                transition: 'border-color var(--duration)',
              }}
              onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
              onMouseOut={e => (e.currentTarget.style.borderColor = query ? 'var(--gold)' : 'var(--border)')}
            />
            {searchOpen && results.length > 0 && (
              <ul style={{
                position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 200, marginTop: '4px',
                background: 'var(--cream)', border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-mid)', listStyle: 'none', maxHeight: '320px', overflowY: 'auto',
              }}>
                {results.map(b => (
                  <li key={b.slug}>
                    <button onClick={() => { navigate(`/books/${b.slug}`); setQuery(''); setSearchOpen(false) }}
                      style={{
                        width: '100%', padding: '0.6rem 0.9rem', textAlign: 'left',
                        background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = 'var(--parchment-mid)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--ink)' }}>{b.title}</div>
                      <div style={{ fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginTop: '2px' }}>{b.genre}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      <main style={{ flex: 1, paddingTop: 'var(--nav-height)' }}>
        <Outlet />
      </main>

      <footer style={{ background: 'var(--ink)', color: 'var(--parchment)', marginTop: 'auto' }}>
        <div className="container" style={{ padding: '4rem 2rem 2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '3rem', paddingBottom: '2.5rem', borderBottom: '1px solid rgba(244,239,230,0.1)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ color: 'var(--gold)', fontSize: '1.6rem' }}>◈</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', letterSpacing: '0.02em' }}>Orizon Press</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(244,239,230,0.5)', lineHeight: 1.8, maxWidth: '28ch' }}>
                Publishing works that reach beyond the horizon. Independent. Global. Uncompromising.
              </p>
            </div>
            <div>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem' }}>Explore</div>
              {['catalogue','authors','blog','about','contact'].map(p => (
                <div key={p} style={{ marginBottom: '0.6rem' }}>
                  <Link to={`/${p}`} style={{ fontSize: '0.85rem', color: 'rgba(244,239,230,0.6)', transition: 'color var(--duration)' }}
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--parchment)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'rgba(244,239,230,0.6)')}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Link>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem' }}>Connect</div>
              <a href="mailto:hello@orizonpress.com" style={{ fontSize: '0.85rem', color: 'rgba(244,239,230,0.6)' }}>hello@orizonpress.com</a>
            </div>
          </div>
          <div style={{ paddingTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: 'rgba(244,239,230,0.28)' }}>
              © {new Date().getFullYear()} Orizon Press. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
