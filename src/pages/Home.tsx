import { Link } from 'react-router-dom'
import { getFeaturedBooks, getAllGenres, books, penNames } from '../data/catalogue'
import BookCard from '../components/BookCard'

export default function Home() {
  const featured = getFeaturedBooks()
  const genres = getAllGenres()

  return (
    <div>
      {/* ---- HERO ---- */}
      <section style={{
        minHeight: '90vh', display: 'flex', alignItems: 'center',
        position: 'relative', overflow: 'hidden', background: 'var(--cream)',
      }}>
        {/* Background orbs */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <div style={{
            position:'absolute', top:'-15%', right:'-8%',
            width:'55vw', height:'55vw', maxWidth:680, maxHeight:680,
            borderRadius:'50%',
            background:'radial-gradient(circle, rgba(200,145,31,0.09) 0%, transparent 68%)',
          }} />
          <div style={{
            position:'absolute', bottom:'-20%', left:'-8%',
            width:'45vw', height:'45vw', maxWidth:520, maxHeight:520,
            borderRadius:'50%',
            background:'radial-gradient(circle, rgba(107,31,31,0.06) 0%, transparent 68%)',
          }} />
          {/* Subtle grid */}
          <div style={{
            position:'absolute', inset:0,
            backgroundImage:'linear-gradient(rgba(28,24,20,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(28,24,20,0.025) 1px, transparent 1px)',
            backgroundSize:'72px 72px',
          }} />
        </div>

        <div className="container" style={{ position:'relative', zIndex:1 }}>
          <div style={{ maxWidth: 820, padding: '5rem 0' }}>
            <span className="eyebrow fade-up" style={{ marginBottom: '1.5rem' }}>Orizon Press — Independent Publisher</span>
            <h1 className="fade-up fade-up-1" style={{ marginBottom: '1.5rem', lineHeight: 1.06 }}>
              Books that reach<br />
              <em style={{ fontStyle:'italic', color:'var(--gold)' }}>beyond the horizon</em>
            </h1>
            <p className="fade-up fade-up-2" style={{ fontSize:'1.05rem', color:'var(--mist)', maxWidth:'52ch', marginBottom:'2.5rem', lineHeight:1.82 }}>
              Independent publisher of transformative works in African history,
              consciousness, spirituality, and fiction — reaching readers across
              Europe, the Americas, and the world.
            </p>
            <div className="fade-up fade-up-3" style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
              <Link to="/catalogue" className="btn btn--primary">Browse Catalogue</Link>
              <Link to="/authors" className="btn btn--outline">Meet the Authors</Link>
            </div>
          </div>
        </div>

        {/* Scroll line */}
        <div style={{ position:'absolute', bottom:'2rem', left:'50%', transform:'translateX(-50%)' }}>
          <div style={{
            width:1, height:48,
            background:'linear-gradient(to bottom, var(--gold), transparent)',
            animation:'fadeIn 2s ease-in-out infinite alternate',
          }} />
        </div>
      </section>

      {/* ---- GENRE STRIP ---- */}
      <section style={{ padding:'1.5rem 0', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', background:'var(--parchment-mid)' }}>
        <div className="container">
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', alignItems:'center' }}>
            <span style={{ fontSize:'0.62rem', letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--mist)', marginRight:'0.5rem' }}>Genres:</span>
            {genres.map(g => (
              <Link key={g} to={`/catalogue?genre=${encodeURIComponent(g)}`} className="genre-tag">{g}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- FEATURED ---- */}
      <section style={{ padding:'5rem 0' }}>
        <div className="container">
          <div style={{ marginBottom:'3rem' }}>
            <span className="rule" />
            <span className="eyebrow" style={{ marginBottom:'0.5rem' }}>Featured Titles</span>
            <h2 style={{ marginTop:'0.4rem' }}>New & Notable</h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:'3rem 1.5rem' }}>
            {featured.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
          </div>
          <div style={{ marginTop:'3rem', textAlign:'center' }}>
            <Link to="/catalogue" className="btn btn--outline">View All Titles →</Link>
          </div>
        </div>
      </section>

      {/* ---- STATS BAND ---- */}
      <section style={{ background:'var(--ink)', padding:'3rem 0' }}>
        <div className="container">
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'3.5rem', flexWrap:'wrap' }}>
            {[
              { num: `${books.length}+`, label: 'Published Titles' },
              { num: `${penNames.length}`, label: 'Author Voices' },
              { num: '50+', label: 'Distribution Channels' },
              { num: 'Global', label: 'US · UK · EU · Canada' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'2.4rem', fontWeight:300, color:'var(--gold)', lineHeight:1 }}>{s.num}</div>
                <div style={{ fontSize:'0.62rem', letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(244,239,230,0.4)', marginTop:'0.4rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- AUTHORS ---- */}
      <section style={{ padding:'5rem 0', background:'var(--parchment-mid)' }}>
        <div className="container">
          <div style={{ marginBottom:'3rem' }}>
            <span className="rule" />
            <span className="eyebrow" style={{ marginBottom:'0.5rem' }}>The Voices Behind the Work</span>
            <h2 style={{ marginTop:'0.4rem' }}>Our Authors</h2>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {penNames.map((author, i) => (
              <Link key={author.id} to={`/authors/${author.slug}`}
                className="fade-up" style={{ animationDelay:`${i*0.1}s`,
                  display:'flex', alignItems:'center', gap:'1.5rem',
                  padding:'1.25rem 1.5rem', background:'var(--cream)',
                  border:'1px solid var(--border)', textDecoration:'none',
                  transition:'all var(--duration) var(--ease)',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--border-gold)'; (e.currentTarget as HTMLElement).style.transform='translateX(4px)' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; (e.currentTarget as HTMLElement).style.transform='translateX(0)' }}
              >
                <div style={{
                  width:56, height:56, borderRadius:'50%', flexShrink:0,
                  background:author.accentColor, display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-display)', fontSize:'1.5rem', color:'var(--parchment)',
                }}>
                  {author.name.charAt(0)}
                </div>
                <div style={{ flex:1 }}>
                  <h3 style={{ fontSize:'1.15rem', marginBottom:'0.2rem' }}>{author.name}</h3>
                  <p style={{ fontSize:'0.82rem', color:'var(--mist)', lineHeight:1.5 }}>{author.shortBio}</p>
                  <span style={{ fontSize:'0.62rem', letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--gold)', marginTop:'0.35rem', display:'block' }}>
                    {author.genres.slice(0,2).join(' · ')}
                  </span>
                </div>
                <span style={{ fontSize:'1.1rem', color:'var(--mist-light)', transition:'all var(--duration)' }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section style={{ background:'var(--ink-soft)', padding:'5rem 0' }}>
        <div className="container">
          <div style={{ maxWidth:580 }}>
            <span className="eyebrow" style={{ color:'var(--gold-light)', marginBottom:'1rem' }}>Direct from the Publisher</span>
            <h2 style={{ color:'var(--parchment)', margin:'0.75rem 0 1.25rem', fontWeight:300 }}>Read. Think. Transform.</h2>
            <p style={{ color:'rgba(244,239,230,0.58)', marginBottom:'2rem', lineHeight:1.8 }}>
              Every title purchased directly supports the authors and the continued publication of important, independent voices.
            </p>
            <Link to="/catalogue" className="btn btn--gold">Shop All Books</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
