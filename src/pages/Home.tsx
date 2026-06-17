import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAllGenres } from '../data/catalogue';
import BookCard from '../components/BookCard';
import ShareButtons from '../components/ShareButtons';
import { useBooks } from '../hooks/useBooks';

// ─── Newsletter signup ────────────────────────────────────────────────────────
function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'subscribe', email }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'newsletter_not_configured') {
          setStatus('done') // show success — we'll handle setup separately
          return
        }
        throw new Error(data.error ?? 'Subscription failed')
      }
      setStatus('done')
      setEmail('')
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <section style={{ background: 'var(--ink)', padding: '3.5rem 2rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem' }}>
          Newsletter
        </p>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.35rem, 3vw, 1.75rem)', color: 'var(--parchment)', marginBottom: '0.75rem', fontWeight: 400 }}>
          Stay in the story
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'rgba(244,239,230,0.55)', marginBottom: '2rem', lineHeight: 1.65, maxWidth: '420px', margin: '0 auto 2rem' }}>
          New releases, reading recommendations, and stories from Orizon Press — directly to your inbox.
        </p>
        {status === 'done' ? (
          <p style={{ color: 'var(--gold)', fontFamily: 'Georgia, serif', fontSize: '1.05rem', fontStyle: 'italic' }}>
            You're subscribed. Thank you.
          </p>
        ) : (
          <form onSubmit={submit} className="newsletter-form">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="newsletter-input"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="newsletter-submit"
            >
              {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        )}
        {status === 'error' && (
          <p style={{ color: '#e07070', fontSize: '0.82rem', marginTop: '0.75rem' }}>{errMsg}</p>
        )}
      </div>
    </section>
  )
}

// ─── Home page ────────────────────────────────────────────────────────────────
export default function Home() {
  const { books } = useBooks();
  const available = books.filter(b => b.ebook.available);

  const featuredBook = available.find(b => b.featured) ?? null;
  const newReleases = available.slice(-3).reverse();
  const catalogueSample = available.slice(0, 4);

  const genres = getAllGenres();

  return (
    <div>
      <Helmet>
        <title>Orizon Press | African Stories, History &amp; Spirituality</title>
        <meta name="description" content="Independent publisher of African history, consciousness, spirituality and fiction. Buy direct from Orizon Press." />
        <meta property="og:title" content="Orizon Press | African Stories, History & Spirituality" />
        <meta property="og:description" content="Independent publisher of African history, consciousness, spirituality and fiction. Buy direct from Orizon Press." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://orizonpress.com/" />
        <meta property="og:image" content="https://orizonpress.com/icons/icon-512.png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
      </Helmet>

      {/* ── Hero ── */}
      <section style={{
        padding: '6rem 2rem 4rem',
        background: 'var(--cream)',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1.5rem' }}>
          Orizon Press — Independent Publisher
        </p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, color: 'var(--ink)', marginBottom: '1.5rem' }}>
          Books that reach<br />
          <em style={{ color: 'var(--gold)' }}>beyond the horizon</em>
        </h1>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.7, color: 'var(--mist)', maxWidth: '520px', marginBottom: '2.5rem' }}>
          Independent publisher of transformative works in African history, consciousness, spirituality, and fiction — reaching readers across Europe, the Americas, and the world.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/catalogue" style={{
            padding: '0.85rem 2rem',
            background: 'var(--ink)',
            color: 'var(--parchment)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>Browse Catalogue</Link>
          <Link to="/authors" style={{
            padding: '0.85rem 2rem',
            background: 'transparent',
            color: 'var(--ink)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
            border: '1px solid var(--ink)',
          }}>Meet the Authors</Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
          <div className="scroll-indicator" aria-hidden="true">
            <div className="scroll-indicator__chevron">&#8595;</div>
            <span className="scroll-indicator__label">Scroll</span>
          </div>
        </div>
      </section>

      {/* ── Featured Book Spotlight ── */}
      {featuredBook && (
        <section style={{ background: 'var(--ink)', padding: 'clamp(2rem, 5vw, 4rem) 2rem' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '2rem' }}>
              Featured Book
            </p>
            <div className="spotlight-grid">
              {/* Cover */}
              <Link to={`/books/${featuredBook.slug}`} className="spotlight-cover" style={{ display: 'block' }}>
                {featuredBook.coverImage ? (
                  <img
                    src={featuredBook.coverImage}
                    alt={featuredBook.title}
                    style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', aspectRatio: '2/3',
                    background: featuredBook.coverColor || '#2a1a08',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1.5rem', boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--parchment)', textAlign: 'center', lineHeight: 1.3 }}>
                      {featuredBook.title}
                    </span>
                  </div>
                )}
              </Link>

              {/* Content */}
              <div>
                <span style={{ display: 'inline-block', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', border: '1px solid rgba(196,134,42,0.4)', padding: '0.2rem 0.6rem', marginBottom: '1rem' }}>
                  {featuredBook.genre}
                </span>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.3rem, 2.5vw, 2rem)', color: 'var(--parchment)', lineHeight: 1.2, marginBottom: '0.5rem' }}>
                  {featuredBook.title}
                </h2>
                {featuredBook.author && (
                  <p style={{ fontSize: '0.82rem', color: 'rgba(244,239,230,0.5)', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
                    {featuredBook.author}
                  </p>
                )}
                <p style={{ fontSize: '0.88rem', lineHeight: 1.75, color: 'rgba(244,239,230,0.75)', marginBottom: '1.75rem' }}>
                  {featuredBook.description}
                </p>
                <div className="spotlight-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <Link
                    to={`/books/${featuredBook.slug}`}
                    className="spotlight-buy-btn"
                    style={{
                      padding: '0.85rem 2rem',
                      background: 'var(--gold)',
                      color: 'var(--ink)',
                      textDecoration: 'none',
                      fontSize: '0.78rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    Buy Now — ${featuredBook.ebook.price.toFixed(2)}
                  </Link>
                  <Link
                    to={`/books/${featuredBook.slug}`}
                    style={{ fontSize: '0.82rem', color: 'rgba(244,239,230,0.45)', textDecoration: 'none' }}
                  >
                    Read sample →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── New Releases ── */}
      {newReleases.length > 0 && (
        <section style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: 'var(--ink)' }}>New Releases</h2>
            <Link to="/catalogue" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '0.85rem' }}>View all →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
            {newReleases.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
          </div>
        </section>
      )}

      {/* ── Catalogue sample ── */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', borderTop: newReleases.length > 0 ? '1px solid var(--border)' : 'none' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', marginBottom: '2rem', color: 'var(--ink)' }}>Featured Titles</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
          {catalogueSample.map(book => <BookCard key={book.id} book={book} />)}
        </div>
        <div style={{ textAlign: 'right', marginTop: '2rem' }}>
          <Link to="/catalogue" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '0.9rem' }}>View All Titles →</Link>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <NewsletterSection />

      {/* ── Social proof banner ── */}
      <section style={{ background: 'var(--parchment-mid)', padding: '2rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '3rem', flexWrap: 'wrap',
        }}>
          {[
            { stat: '316', label: 'readers worldwide' },
            { stat: '12',  label: 'countries' },
            { stat: '20',  label: 'titles in print' },
          ].map(({ stat, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <span style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                color: 'var(--gold)',
                lineHeight: 1,
              }}>{stat}</span>
              <span style={{
                display: 'block',
                fontSize: '0.65rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--mist)',
                marginTop: '0.4rem',
              }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '2rem', borderTop: '1px solid var(--border)', background: 'var(--parchment)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--mist)' }}>Genres</span>
          {genres.map(g => (
            <Link key={g} to={`/catalogue?genre=${g}`} style={{ fontSize: '0.85rem', color: 'var(--ink)', textDecoration: 'none' }}>{g}</Link>
          ))}
        </div>
      </section>

      <section style={{ padding: '3rem 2rem', background: 'var(--cream)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <ShareButtons
            url="https://orizonpress.com"
            text="Orizon Press — Independent publisher of African history, consciousness, spirituality, and literary fiction"
          />
        </div>
      </section>
    </div>
  );
}
