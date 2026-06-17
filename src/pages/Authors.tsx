import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { usePenNames } from '../hooks/usePenNames'
import { useBooks } from '../hooks/useBooks'

export default function Authors() {
  const { penNames } = usePenNames()
  const { books } = useBooks()

  return (
    <div style={{ padding:'3rem 0 5rem' }}>
      <Helmet>
        <title>Our Authors | Orizon Press</title>
        <meta name="description" content="Meet the authors behind Orizon Press — J.N. Nartey, JOJO Penwood, Ajona Penhart, and Ajora Kandasorey." />
        <meta property="og:title" content="Our Authors | Orizon Press" />
        <meta property="og:description" content="Meet the authors behind Orizon Press — J.N. Nartey, JOJO Penwood, Ajona Penhart, and Ajora Kandasorey." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://orizonpress.com/authors" />
        <meta property="og:image" content="https://orizonpress.com/icons/icon-512.png" />
      </Helmet>
      <div className="container">
        <div style={{ padding:'2rem 0 3rem', maxWidth:640 }}>
          <span className="rule" />
          <span className="eyebrow" style={{ marginBottom:'0.5rem' }}>The Voices</span>
          <h1 style={{ marginTop:'0.4rem', marginBottom:'1.25rem' }}>Our Authors</h1>
          <p style={{ color:'var(--mist)', lineHeight:1.8 }}>
            Orizon Press publishes across multiple pen names, each a distinct creative identity with its own voice, genre, and reader community.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'1rem' }}>
          {penNames.map((author, i) => {
            const authorBooks = books.filter(b => b.penNameId === author.id)
            return (
              <Link key={author.id} to={`/authors/${author.slug}`}
                className="fade-up" style={{ animationDelay:`${i*0.12}s`,
                  display:'flex', flexDirection:'column', gap:'1rem',
                  padding:'1.25rem', border:'1px solid var(--border)',
                  background:'var(--parchment)', textDecoration:'none',
                  transition:'all var(--duration) var(--ease)',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--border-gold)'; (e.currentTarget as HTMLElement).style.boxShadow='var(--shadow-mid)'; (e.currentTarget as HTMLElement).style.transform='translateY(-2px)' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow='none'; (e.currentTarget as HTMLElement).style.transform='translateY(0)' }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', flexShrink:0, background:author.accentColor, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:'1.5rem', color:'var(--parchment)' }}>
                    {author.name.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontSize:'1.1rem', marginBottom:'0.15rem' }}>{author.name}</h2>
                    <span style={{ fontSize:'0.62rem', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--gold)' }}>
                      {authorBooks.length} title{authorBooks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize:'0.88rem', color:'var(--mist)', lineHeight:1.7 }}>{author.shortBio}</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
                  {author.genres.map(g => <span key={g} className="genre-tag">{g}</span>)}
                </div>
                <div style={{ fontSize:'0.7rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--gold)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  View Author & Books <span>→</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
