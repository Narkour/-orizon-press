import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { penNames, genreGroups, type Genre } from '../data/catalogue'
import BookCard from '../components/BookCard'
import { useBooks } from '../hooks/useBooks'

export default function Catalogue() {
  const { books, loading } = useBooks()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const activeGenre = searchParams.get('genre') as Genre | null
  const activeAuthor = searchParams.get('author')

  const filtered = useMemo(() => books.filter(b => {
    const mg = !activeGenre || b.genre === activeGenre
    const ma = !activeAuthor || b.penNameId === activeAuthor
    const ms = !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase())
    return mg && ma && ms
  }), [books, activeGenre, activeAuthor, search])

  const setGenre = (g: Genre | null) => {
    const p = new URLSearchParams(searchParams)
    g ? p.set('genre', g) : p.delete('genre')
    setSearchParams(p)
  }
  const setAuthor = (id: string | null) => {
    const p = new URLSearchParams(searchParams)
    id ? p.set('author', id) : p.delete('author')
    setSearchParams(p)
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.6rem',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--mist)',
    paddingTop: '0.25rem',
    minWidth: 80,
    flexShrink: 0,
  }

  const groupLabelStyle: React.CSSProperties = {
    fontSize: '0.58rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--mist)',
    paddingTop: '0.2rem',
    minWidth: 120,
    flexShrink: 0,
    opacity: 0.7,
  }

  return (
    <div style={{ padding: '3rem 0 5rem' }}>
      <Helmet>
        <title>Book Catalogue | Orizon Press</title>
        <meta name="description" content="Browse all books published by Orizon Press across African history, spirituality, fiction and more." />
        <meta property="og:title" content="Book Catalogue | Orizon Press" />
        <meta property="og:description" content="Browse all books published by Orizon Press across African history, spirituality, fiction and more." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://orizonpress.com/catalogue" />
        <meta property="og:image" content="https://orizonpress.com/icons/icon-512.png" />
      </Helmet>

      <div className="container">
        <div style={{ padding: '2rem 0 2rem' }}>
          <span className="rule" />
          <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>Complete Catalogue</span>
          <h1 style={{ marginTop: '0.4rem' }}>All Titles</h1>
        </div>

        {/* Filters */}
        <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1.5rem 0', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Genre — grouped */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span style={labelStyle}>Genre</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1 }}>
              {/* All button */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  className={`genre-tag${!activeGenre ? ' active' : ''}`}
                  onClick={() => setGenre(null)}
                  style={{ fontWeight: !activeGenre ? 600 : undefined }}
                >
                  All
                </button>
              </div>

              {/* Grouped genre rows */}
              {genreGroups.map(group => (
                <div key={group.label} className="genre-filter-group">
                  <span className="genre-filter-group-label">{group.label}</span>
                  <div className="genre-filter-group-pills">
                    {group.genres.map(g => (
                      <button
                        key={g}
                        className={`genre-tag${activeGenre === g ? ' active' : ''}`}
                        onClick={() => setGenre(g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Author filter */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span style={labelStyle}>Author</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button className={`genre-tag${!activeAuthor ? ' active' : ''}`} onClick={() => setAuthor(null)}>All</button>
              {penNames.map(p => (
                <button key={p.id} className={`genre-tag${activeAuthor === p.id ? ' active' : ''}`} onClick={() => setAuthor(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span style={labelStyle}>Search</span>
            <input
              type="text"
              placeholder="Search titles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                padding: '0.5rem 1rem',
                border: '1px solid var(--border)',
                background: 'var(--parchment)',
                color: 'var(--ink)',
                outline: 'none',
                width: 280,
                maxWidth: '100%',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mist)', marginBottom: '2rem' }}>
          {filtered.length} title{filtered.length !== 1 ? 's' : ''}
          {activeGenre && <span style={{ color: 'var(--gold)', marginLeft: '0.5rem' }}>· {activeGenre}</span>}
        </div>

        {loading ? (
          <div style={{ padding: '5rem 0', textAlign: 'center', color: 'var(--mist)', fontSize: '0.82rem', letterSpacing: '0.1em' }}>
            Loading catalogue…
          </div>
        ) : filtered.length > 0 ? (
          <div className="catalogue-grid">
            {filtered.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
          </div>
        ) : (
          <div style={{ padding: '5rem 0', textAlign: 'center' }}>
            <span className="eyebrow">No results</span>
            <p style={{ marginTop: '0.5rem', color: 'var(--mist)' }}>
              {activeGenre ? `No titles published yet in ${activeGenre}.` : 'Try adjusting your filters.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
