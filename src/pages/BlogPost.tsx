import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { getPostBySlug } from '../data/blog'
import ShareButtons from '../components/ShareButtons'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const post = getPostBySlug(slug || '')
  if (!post) return <Navigate to="/blog" replace />

  return (
    <div style={{ padding: '2.5rem 0 6rem' }}>
      <Helmet>
        <title>{post.title} | Orizon Press</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={`${post.title} | Orizon Press`} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://orizonpress.com/blog/${post.slug}`} />
        <meta property="article:author" content={post.author} />
        <meta property="article:published_time" content={post.date} />
        <meta property="og:image" content="https://orizonpress.com/icons/icon-512.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${post.title} | Orizon Press`} />
        <meta name="twitter:description" content={post.excerpt} />
        <meta name="twitter:image" content="https://orizonpress.com/icons/icon-512.png" />
      </Helmet>

      <div className="container">
        <Link
          to="/blog"
          style={{
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--mist)',
            display: 'inline-block',
            marginBottom: '3rem',
            textDecoration: 'none',
            transition: 'color var(--duration)',
          }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--mist)')}
        >
          ← Back to Blog
        </Link>

        <div style={{ maxWidth: 720 }}>
          {/* Header */}
          <header style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
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
              <span style={{ fontSize: '0.72rem', color: 'var(--mist)' }}>{post.readTime}</span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 400,
              lineHeight: 1.2,
              color: 'var(--ink)',
              marginBottom: '1.5rem',
            }}>
              {post.title}
            </h1>

            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              lineHeight: 1.7,
              color: 'var(--mist)',
              fontStyle: 'italic',
              marginBottom: '2rem',
            }}>
              {post.excerpt}
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              paddingBottom: '2rem',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: '0.9rem',
                color: 'var(--parchment)',
                flexShrink: 0,
              }}>
                {post.author.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--ink)' }}>{post.author}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--mist)' }}>{formatDate(post.date)}</div>
              </div>
            </div>
          </header>

          {/* Article body */}
          <style>{`
            .blog-prose p { margin-bottom: 1.6rem; }
            .blog-prose h2 { font-family: var(--font-display); font-size: 1.35rem; font-weight: 500; color: var(--ink); margin: 2.5rem 0 1rem; line-height: 1.3; }
            .blog-prose h3 { font-family: var(--font-display); font-size: 1.1rem; font-weight: 500; color: var(--ink); margin: 2rem 0 0.75rem; }
            .blog-prose em { font-style: italic; }
            .blog-prose strong { font-weight: 600; }
          `}</style>
          <div
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: post.content }}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1rem, 1.8vw, 1.08rem)',
              lineHeight: 1.9,
              color: 'var(--ink)',
            }}
          />

          <div style={{ marginTop: '3rem' }}>
            <ShareButtons
              url={`https://orizonpress.com/blog/${post.slug}`}
              text={`${post.title} — Orizon Press`}
            />
          </div>

          {/* Footer */}
          <footer style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <Link
                to="/blog"
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--mist)',
                  textDecoration: 'none',
                  transition: 'color var(--duration)',
                }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--mist)')}
              >
                ← All Essays
              </Link>
              <Link to="/catalogue" className="btn btn--outline" style={{ fontSize: '0.72rem' }}>
                Explore the Catalogue
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
