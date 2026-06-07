import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { books, penNames, getAllGenres, type Genre } from '../data/catalogue'
import BookCard from '../components/BookCard'

export default function Catalogue() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const activeGenre = searchParams.get('genre') as Genre | null
  const activeAuthor = searchParams.get('author')
  const genres = getAllGenres()

  const filtered = useMemo(() => books.filter(b => {
    const mg = !activeGenre || b.genre === activeGenre
    const ma = !activeAuthor || b.penNameId === activeAuthor
    const ms = !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase())
    return mg && ma && ms
  }), [activeGenre, activeAuthor, search])

  const setGenre = (g: Genre | null) => {
    const p = new URLSearchParams(searchParams); g ? p.set('genre', g) : p.delete('genre'); setSearchParams(p)
  }
  const setAuthor = (id: string | null) => {
    const p = new URLSearchParams(searchParams); id ? p.set('author', id) : p.delete('author'); setSearchParams(p)
  }

  return (
    <div style={{ padding:'3rem 0 5rem' }}>
      <div className="container">
        <div style={{ padding:'2rem 0 2rem' }}>
          <span className="rule" />
          <span className="eyebrow" style={{ marginBottom:'0.5rem' }}>Complete Catalogue</span>
          <h1 style={{ marginTop:'0.4rem' }}>All Titles</h1>
        </div>

        {/* Filters */}
        <div style={{ borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', padding:'1.5rem 0', marginBottom:'2rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'1.5rem', flexWrap:'wrap' }}>
            <span style={{ fontSize:'0.62rem', letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--mist)', paddingTop:'0.3rem', minWidth:55 }}>Genre</span>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
              <button className={`genre-tag${!activeGenre?' active':''}`} onClick={() => setGenre(null)}>All</button>
              {genres.map(g => <button key={g} className={`genre-tag${activeGenre===g?' active':''}`} onClick={() => setGenre(g)}>{g}</button>)}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'1.5rem', flexWrap:'wrap' }}>
            <span style={{ fontSize:'0.62rem', letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--mist)', paddingTop:'0.3rem', minWidth:55 }}>Author</span>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
              <button className={`genre-tag${!activeAuthor?' active':''}`} onClick={() => setAuthor(null)}>All</button>
              {penNames.map(p => <button key={p.id} className={`genre-tag${activeAuthor===p.id?' active':''}`} onClick={() => setAuthor(p.id)}>{p.name}</button>)}
            </div>
          </div>
          <input type="text" placeholder="Search titles..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ fontFamily:'var(--font-body)', fontSize:'0.85rem', padding:'0.5rem 1rem', border:'1px solid var(--border)', background:'var(--parchment)', color:'var(--ink)', outline:'none', width:280, maxWidth:'100%' }} />
        </div>

        <div style={{ fontSize:'0.72rem', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mist)', marginBottom:'2rem' }}>
          {filtered.length} title{filtered.length !== 1 ? 's' : ''}
        </div>

        {filtered.length > 0 ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'3rem 1.5rem' }}>
            {filtered.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
          </div>
        ) : (
          <div style={{ padding:'5rem 0', textAlign:'center' }}>
            <span className="eyebrow">No results</span>
            <p style={{ marginTop:'0.5rem', color:'var(--mist)' }}>Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
