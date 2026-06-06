import { useParams, Link, Navigate } from 'react-router-dom'
import { getPenNameBySlug, getBooksByPenName } from '../data/catalogue'
import BookCard from '../components/BookCard'

export default function AuthorDetail() {
  const { slug } = useParams<{ slug: string }>()
  const author = getPenNameBySlug(slug || '')
  if (!author) return <Navigate to="/authors" replace />
  const authorBooks = getBooksByPenName(author.id)

  return (
    <div style={{ paddingBottom:'5rem' }}>
      <div style={{ background:'var(--parchment-mid)', padding:'3rem 0', borderBottom:'1px solid var(--border)' }}>
        <div className="container">
          <Link to="/authors" style={{ fontSize:'0.72rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mist)', display:'inline-block', marginBottom:'2rem', transition:'color var(--duration)' }}
            onMouseOver={e => (e.currentTarget.style.color='var(--gold)')} onMouseOut={e => (e.currentTarget.style.color='var(--mist)')}>
            ← All Authors
          </Link>
          <div style={{ display:'flex', alignItems:'center', gap:'1.5rem', marginBottom:'2rem' }}>
            <div style={{ width:80, height:80, borderRadius:'50%', flexShrink:0, background:author.accentColor, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:'2.2rem', color:'var(--parchment)' }}>
              {author.name.charAt(0)}
            </div>
            <div>
              <span className="eyebrow" style={{ marginBottom:'0.4rem' }}>{authorBooks.length} Published Title{authorBooks.length!==1?'s':''}</span>
              <h1 style={{ fontSize:'clamp(2rem, 4vw, 3rem)' }}>{author.name}</h1>
            </div>
          </div>
          <p style={{ color:'var(--ink-soft)', lineHeight:1.82, maxWidth:'62ch', marginBottom:'1.5rem' }}>{author.bio}</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
            {author.genres.map(g => <span key={g} className="genre-tag">{g}</span>)}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop:'3rem' }}>
        <div style={{ marginBottom:'2.5rem' }}>
          <span className="rule" />
          <span className="eyebrow" style={{ marginBottom:'0.5rem' }}>Bibliography</span>
          <h2 style={{ marginTop:'0.4rem' }}>All Titles by {author.name}</h2>
        </div>
        {authorBooks.length > 0 ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'3rem 1.5rem' }}>
            {authorBooks.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
          </div>
        ) : (
          <p style={{ color:'var(--mist)' }}>No titles published yet.</p>
        )}
      </div>
    </div>
  )
}
