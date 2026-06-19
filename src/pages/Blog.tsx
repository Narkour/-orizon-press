import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { getAllPosts } from '../data/blog'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Blog() {
  const posts = getAllPosts()

  return (
    <div style={{ padding: '3rem 0 6rem' }}>
      <Helmet>
        <title>Blog | Orizon Press</title>
        <meta name="description" content="Essays and insights on African history, spirituality, consciousness, and fiction from the authors and editors of Orizon Press." />
        <meta property="og:title" content="Blog | Orizon Press" />
        <meta property="og:description" content="Essays and insights on African history, spirituality, consciousness, and fiction." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://orizonpress.com/blog" />
        <meta property="og:image" content="https://orizonpress.com/icons/icon-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Blog | Orizon Press" />
        <meta name="twitter:description" content="Essays and insights on African history, spirituality, consciousness, and fiction." />
        <meta name="twitter:image" content="https://orizonpress.com/icons/icon-512.png" />
      </Helmet>

      <div className="container">
        <div style={{ padding: '2rem 0 3rem', maxWidth: 600 }}>
          <span className="rule" />
          <span className="eyebrow" style={{ marginBottom: '0.5rem' }}>Orizon Press</span>
          <h1 style={{ marginTop: '0.4rem' }}>The Blog</h1>
          <p style={{ marginTop: '1rem', fontSize: '1.05rem', lineHeight: 1.75, color: 'var(--mist)', maxWidth: '52ch' }}>
            Essays on African history, spirituality, consciousness, and the literature that is reshaping our world.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxWidth: 800 }}>
          {posts.map((post, i) => (
            <article
              key={post.id}
              style={{
                padding: '2.5rem 0',
                borderTop: '1px solid var(--border)',
                borderBottom: i === posts.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-block',
                  fontSize: '0.6rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--gold)',
                  border: '1px solid rgba(196,134,42,0.35)',
                  padding: '0.2rem 0.6rem',
                }}>
                  {post.category}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--mist)', letterSpacing: '0.04em' }}>
                  {post.readTime}
                </span>
              </div>

              <Link
                to={`/blog/${post.slug}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.15rem, 2.5vw, 1.5rem)',
                    fontWeight: 500,
                    lineHeight: 1.3,
                    color: 'var(--ink)',
                    marginBottom: '0.75rem',
                    transition: 'color var(--duration)',
                  }}
                  onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
                  onMouseOut={e => (e.currentTarget.style.color = 'var(--ink)')}
                >
                  {post.title}
                </h2>
              </Link>

              <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--mist)', marginBottom: '1.25rem', maxWidth: '68ch' }}>
                {post.excerpt}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.72rem', letterSpacing: '0.08em', color: 'var(--ink)', fontWeight: 500 }}>
                    {post.author}
                  </span>
                  <span style={{ color: 'var(--border)', fontSize: '0.8rem' }}>·</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--mist)' }}>
                    {formatDate(post.date)}
                  </span>
                </div>
                <Link
                  to={`/blog/${post.slug}`}
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    textDecoration: 'none',
                    transition: 'color var(--duration)',
                  }}
                  onMouseOver={e => (e.currentTarget.style.color = 'var(--ink)')}
                  onMouseOut={e => (e.currentTarget.style.color = 'var(--gold)')}
                >
                  Read essay →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
