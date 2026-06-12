import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAllGenres } from '../data/catalogue';
import BookCard from '../components/BookCard';
import ShareButtons from '../components/ShareButtons';
import { useBooks } from '../hooks/useBooks';

export default function Home() {
  const { books } = useBooks();
  const featured = books.filter(b => b.ebook.available).slice(0, 4);
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
      </Helmet>
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
      </section>

      <section style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', marginBottom: '2rem', color: 'var(--ink)' }}>Featured Titles</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
          {featured.map(book => <BookCard key={book.id} book={book} />)}
        </div>
        <div style={{ textAlign: 'right', marginTop: '2rem' }}>
          <Link to="/catalogue" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '0.9rem' }}>View All Titles →</Link>
        </div>
      </section>

      {/* ── Social proof banner ── */}
      <section style={{ background: 'var(--ink)', padding: '2rem' }}>
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
                color: 'rgba(244,239,230,0.55)',
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