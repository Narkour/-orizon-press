import { useParams, Link, Navigate } from 'react-router-dom'
import { getBookBySlug, getPenNameById, getBooksByPenName } from '../data/catalogue'
import BookCard from '../components/BookCard'

export default function BookDetail() {
  const { slug } = useParams<{ slug: string }>()
  const book = getBookBySlug(slug || '')
  if (!book) return <Navigate to="/catalogue" replace />

  const author = getPenNameById(book.penNameId)
  const moreBooks = getBooksByPenName(book.penNameId).filter(b => b.id !== book.id).slice(0, 4)

  return (
    <div style={{ padding:'2rem 0 5rem' }}>
      <div className="container">
        <Link to="/catalogue" style={{ fontSize:'0.72rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mist)', display:'inline-block', marginBottom:'2.5rem', transition:'color var(--duration)' }}
          onMouseOver={e => (e.currentTarget.style.color='var(--gold)')} onMouseOut={e => (e.currentTarget.style.color='var(--mist)')}>
          ← Back to Catalogue
        </Link>

        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:'4rem', alignItems:'start' }}>
          {/* Cover + Buy */}
          <div style={{ position:'sticky', top:'calc(var(--nav-height) + 2rem)' }}>
            <div style={{ aspectRatio:'2/3', background:book.coverColor, position:'relative', overflow:'hidden', marginBottom:'1.5rem', boxShadow:'var(--shadow-mid)' }}>
              <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'1.5rem', textAlign:'center', position:'relative' }}>
                <span style={{ position:'absolute', top:16, left:16, width:22, height:22, borderTop:`1px solid ${book.coverAccent}`, borderLeft:`1px solid ${book.coverAccent}` }} />
                <span style={{ position:'absolute', bottom:16, right:16, width:22, height:22, borderBottom:`1px solid ${book.coverAccent}`, borderRight:`1px solid ${book.coverAccent}` }} />
                <span style={{ display:'block', width:32, height:1, background:book.coverAccent, marginBottom:14, opacity:0.9 }} />
                <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:400, color:'var(--parchment)', lineHeight:1.3 }}>{book.title}</h3>
                {book.subtitle && <p style={{ fontFamily:'var(--font-display)', fontSize:'0.85rem', color:'rgba(244,239,230,0.6)', marginTop:'0.5rem', fontStyle:'italic' }}>{book.subtitle}</p>}
                <span style={{ fontFamily:'var(--font-body)', fontSize:'0.6rem', letterSpacing:'0.18em', textTransform:'uppercase', color:book.coverAccent, marginTop:'1rem', display:'block' }}>{author?.name}</span>
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.07) 0, transparent 60%)', pointerEvents:'none' }} />
              </div>
            </div>

            {/* Buy section */}
            <div style={{ border:'1px solid var(--border)', padding:'1.25rem', background:'var(--parchment)' }}>
              <div style={{ fontSize:'0.62rem', letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--mist)', marginBottom:'1.25rem' }}>Get This Book</div>
              {book.ebook.available && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.8rem 0', borderTop:'1px solid var(--border)' }}>
                  <div>
                    <span style={{ display:'block', fontSize:'0.68rem', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mist)' }}>eBook</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem', color:'var(--gold)', lineHeight:1, marginTop:2, display:'block' }}>${book.ebook.price.toFixed(2)}</span>
                  </div>
                  <button className="btn btn--primary" style={{ fontSize:'0.68rem' }}>Buy eBook</button>
                </div>
              )}
              {book.print.available && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.8rem 0', borderTop:'1px solid var(--border)' }}>
                  <div>
                    <span style={{ display:'block', fontSize:'0.68rem', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mist)' }}>Paperback</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem', color:'var(--gold)', lineHeight:1, marginTop:2, display:'block' }}>${book.print.price.toFixed(2)}</span>
                  </div>
                  <button className="btn btn--outline" style={{ fontSize:'0.68rem' }}>Buy Print</button>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
              <span className="genre-tag active">{book.genre}</span>
              {author && (
                <Link to={`/authors/${author.slug}`} style={{ fontFamily:'var(--font-display)', fontSize:'1rem', fontStyle:'italic', color:'var(--mist)', transition:'color var(--duration)' }}
                  onMouseOver={e => (e.currentTarget.style.color='var(--gold)')} onMouseOut={e => (e.currentTarget.style.color='var(--mist)')}>
                  {author.name}
                </Link>
              )}
            </div>

            <h1 style={{ fontSize:'clamp(1.8rem, 4vw, 3rem)', marginBottom:'0.5rem' }}>{book.title}</h1>
            {book.subtitle && <p style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', fontStyle:'italic', color:'var(--mist)', marginBottom:'2rem' }}>{book.subtitle}</p>}

            <div style={{ marginBottom:'2rem' }}>
              <span className="rule" />
              <p style={{ lineHeight:1.88 }}>{book.description}</p>
            </div>

            {book.tags && book.tags.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginBottom:'2rem' }}>
                {book.tags.map(tag => (
                  <span key={tag} style={{ fontSize:'0.62rem', letterSpacing:'0.1em', textTransform:'uppercase', padding:'0.2rem 0.6rem', background:'var(--parchment-mid)', color:'var(--mist)', border:'1px solid var(--border)' }}>{tag}</span>
                ))}
              </div>
            )}

            {book.reviews && book.reviews.length > 0 && (
              <div style={{ marginTop:'2rem' }}>
                {book.reviews.map((r, i) => (
                  <blockquote key={i} style={{ borderLeft:`2px solid var(--gold)`, paddingLeft:'1.25rem', marginBottom:'1.25rem' }}>
                    <p style={{ fontFamily:'var(--font-display)', fontSize:'1.05rem', fontStyle:'italic', color:'var(--ink)', lineHeight:1.65 }}>"{r.quote}"</p>
                    <cite style={{ display:'block', fontSize:'0.68rem', letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mist)', marginTop:'0.5rem', fontStyle:'normal' }}>— {r.source}</cite>
                  </blockquote>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* More from author */}
        {moreBooks.length > 0 && (
          <div style={{ marginTop:'5rem', paddingTop:'3rem', borderTop:'1px solid var(--border)' }}>
            <div style={{ marginBottom:'2.5rem' }}>
              <span className="rule" />
              <span className="eyebrow" style={{ marginBottom:'0.5rem' }}>Same Author</span>
              <h2 style={{ marginTop:'0.4rem' }}>More from {author?.name}</h2>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'3rem 1.5rem' }}>
              {moreBooks.map((b, i) => <BookCard key={b.id} book={b} index={i} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
